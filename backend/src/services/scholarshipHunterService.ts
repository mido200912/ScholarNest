import axios from 'axios';
import google from 'googlethis';
import { Scholarship } from '../models/Scholarship';
import { BotSettings } from '../models/BotSettings';
import { sendTelegramMessage } from './telegramService';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const getHunterChatId = (settingsChatId?: string): string => settingsChatId || process.env.HUNTER_CHAT_ID || '';
export const pendingHuntScholarships: Map<string, any> = new Map();
let huntScholarshipIndex = 0;

function getKeys(): string[] {
  return [
    process.env.OPENROUTER_API_KEY_1,
    process.env.OPENROUTER_API_KEY_2,
    process.env.OPENROUTER_API_KEY_3,
    process.env.OPENROUTER_API_KEY_4,
    process.env.OPENROUTER_API_KEY_5,
  ].filter((k): k is string => !!k);
}

// Active models with verified support for Tool Calling on OpenRouter
const AGENT_MODELS = [
  'nvidia/nemotron-3.5-lightning:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'minimax/minimax-m3:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'poolside/laguna-s-2.1:free',
];

// ── Agent Client ─────────────────────────────────────────────────────────────
async function callAgentWithTools(messages: any[], tools: any[]): Promise<any> {
  const keys = getKeys();
  if (keys.length === 0) throw new Error('No OpenRouter API keys configured');

  const errors: string[] = [];

  for (const model of AGENT_MODELS) {
    for (let ki = 0; ki < keys.length; ki++) {
      const key = keys[ki];
      try {
        const response = await axios.post(
          OPENROUTER_API_URL,
          {
            model,
            messages,
            tools,
            tool_choice: 'auto',
            temperature: 0.2,
            max_tokens: 4000,
          },
          {
            headers: {
              Authorization: `Bearer ${key}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://scholarnest.up.railway.app',
              'X-Title': 'ScholarNest Hunter Agent',
            },
            timeout: 60000,
          }
        );
        const msg = response.data?.choices?.[0]?.message;
        if (msg) {
          console.log(`[Hunter Agent] ✅ Success with model ${model} (Key ${ki + 1})`);
          return msg;
        }
        errors.push(`${model} (Key ${ki + 1}): Empty response`);
      } catch (e: any) {
        const errMsg = e.response?.data?.error?.message || e.message;
        errors.push(`${model} (Key ${ki + 1}): ${errMsg}`);
        // If the model slug is invalid or deprecated, skip to next model immediately
        if (
          errMsg.includes('not a valid model ID') ||
          errMsg.includes('unavailable for free') ||
          errMsg.includes('slug instead')
        ) {
          break;
        }
      }
    }
  }

  throw new Error(`Agent API failed. Errors: ${errors.join(' | ')}`);
}

// ── Web Search Tool ──────────────────────────────────────────────────────────
async function searchWeb(query: string): Promise<string> {
  try {
    const response = await google.search(query, { page: 0, safe: false, parse_ads: false });
    const results = (response.results || [])
      .slice(0, 8)
      .map((r: any) => `Title: ${r.title}\nURL: ${r.url}\nSnippet: ${r.description}`)
      .join('\n\n');
    if (results && results.length > 0) return results;
  } catch (e: any) {
    console.warn(`[Hunter Search] Google search error: ${e.message}`);
  }

  return `Search for "${query}" completed. You may use your verified knowledge of official international scholarship programs for 2026/2027 with valid official links.`;
}

// ── Main Agentic Loop ────────────────────────────────────────────────────────
export async function runScholarshipHunt(): Promise<void> {
  const debugLines: string[] = [];
  const log = (msg: string) => { debugLines.push(msg); console.log(`[Hunter Agent] ${msg}`); };
  const startTime = Date.now();

  try {
    const settings = await BotSettings.getSettings();
    if (!settings.huntEnabled) return;
    const chatId = getHunterChatId(settings.hunterChatId);

    log('--- STEP 1: Booting Agent ---');
    const existingDocs = await Scholarship.find({}, 'title.en').lean();
    const existing = existingDocs.map((s: any) => s.title?.en).filter(Boolean).slice(0, 40).join(', ');

    const tools = [{
      type: "function",
      function: {
        name: "search_web",
        description: "Search Google for live scholarships. Returns a list of titles, URLs, and snippets.",
        parameters: { type: "object", properties: { query: { type: "string", description: "The search query." } }, required: ["query"] }
      }
    }];

    const systemPrompt = `You are an autonomous Scholarship Hunter Agent. Your goal is to find 5 NEW, fully funded or prestigious scholarships for international students open for 2026/2027.
Avoid these existing ones: ${existing}

Use the 'search_web' tool to find real, currently open scholarships. If web search returns limited snippets, draw from verified, genuine international scholarship programs (e.g. DAAD, Chevening, Fulbright, Turkiye Burslari, Eiffel, Swedish Institute, MEXT, Stipendium Hungaricum, KAUST, Swiss Government Excellence, etc.) with real official application URLs.
Do NOT invent fake scholarship names or fake domains.

Once you have gathered enough scholarships, return ONLY a valid JSON array matching this exact schema:
[{
  "titleEn": "English Title", "titleAr": "Arabic Title",
  "descriptionEn": "Detailed english description", "descriptionAr": "Arabic description",
  "countryEn": "Country", "countryAr": "Country Arabic",
  "universityEn": "University", "universityAr": "University Arabic",
  "degree": "Bachelor" | "Master" | "PhD" | "Other",
  "fundingType": "Fully Funded" | "Partially Funded",
  "majors": ["major1", "major2"],
  "deadline": "YYYY-MM-DD",
  "link": "Application URL",
  "keywords": ["tag1", "tag2"]
}]

Return ONLY the JSON array when you are completely finished gathering data.`;

    const messages: any[] = [
      { role: 'system', content: systemPrompt }, 
      { role: 'user', content: 'Begin your search and return the final JSON array of scholarships.' }
    ];

    log('--- STEP 2: Agent Execution ---');
    let finalJson = '';
    
    // Agent Loop (Max 5 iterations)
    for (let loop = 1; loop <= 5; loop++) {
      log(`[Agent] Iteration ${loop}...`);
      const aiResponse = await callAgentWithTools(messages, tools);
      messages.push(aiResponse);

      if (aiResponse.tool_calls && aiResponse.tool_calls.length > 0) {
        for (const call of aiResponse.tool_calls) {
          if (call.function.name === 'search_web') {
            const args = JSON.parse(call.function.arguments || '{}');
            log(`[Agent Tool] 🔍 Searching Google: "${args.query}"`);
            const results = await searchWeb(args.query || 'fully funded scholarships 2026');
            log(`[Agent Tool] ✅ Received search results.`);
            messages.push({ role: "tool", tool_call_id: call.id, name: call.function.name, content: results });
          }
        }
      } else {
        // The model decided it's done and returned content
        finalJson = aiResponse.content || aiResponse.reasoning || '';
        log(`[Agent Raw Response]: ${finalJson.substring(0, 300)}...`);
        log(`[Agent] Finished and returned data.`);
        break;
      }
    }

    if (!finalJson) throw new Error('Agent failed to return final JSON content.');

    log('--- STEP 3: Evaluation ---');
    const parsed = extractJsonArray(finalJson) || [];
    const valid = parsed.filter((s: any) => (s.titleEn || s.title || s.name) && (s.link || s.url));
    log(`[Evaluation] Extracted ${valid.length} valid scholarships`);

    log('--- STEP 4: Telegram Notification ---');
    await sendDiscoveredScholarshipsToTelegram(valid, chatId);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    if (valid.length === 0 && chatId) {
      await sendTelegramMessage(chatId, `[SEARCH RESULTS]\n\n[SUMMARY]:\n${debugLines.join('\n')}\n\n[TIME]: ${elapsed}s`);
    }
  } catch (err: any) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const chatId = getHunterChatId();
    if (chatId) {
      await sendTelegramMessage(chatId, `[SYSTEM ERROR IN HUNTER]\n\n[MESSAGE]: ${err.message}\n\n[LOGS]:\n${debugLines.join('\n')}\n\n[TIME]: ${elapsed}s`);
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
export async function saveHuntedScholarshipAsPending(data: any): Promise<any> {
  const adminUserId = '000000000000000000000001';
  const existing = await Scholarship.findOne({ 'title.en': data.titleEn });
  if (existing) return existing;

  const validDegree = ['Bachelor', 'Master', 'PhD', 'Other'].includes(data.degree) ? data.degree : 'Other';
  const validFunding = ['Fully Funded', 'Partially Funded'].includes(data.fundingType) ? data.fundingType : 'Fully Funded';

  const scholarship = new Scholarship({
    title: { en: data.titleEn, ar: data.titleAr || data.titleEn },
    description: { en: data.descriptionEn || data.titleEn, ar: data.descriptionAr || data.titleAr || data.titleEn },
    country: { en: data.countryEn || 'International', ar: data.countryAr || 'دولي' },
    university: { en: data.universityEn || 'Various Universities', ar: data.universityAr || 'جامعات متعددة' },
    degree: validDegree,
    fundingType: validFunding,
    majors: Array.isArray(data.majors) ? data.majors : [],
    deadline: data.deadline ? new Date(data.deadline) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    link: data.link,
    keywords: Array.isArray(data.keywords) ? data.keywords : [],
    status: 'pending',
    submittedBy: adminUserId,
  });
  await scholarship.save();
  console.log(`[Hunter Agent] Saved pending scholarship to DB: ${data.titleEn} (${scholarship._id})`);
  return scholarship;
}

export async function sendDiscoveredScholarshipsToTelegram(scholarships: any[], chatIdOverride?: string): Promise<void> {
  const chatId = chatIdOverride || getHunterChatId();
  if (!chatId || scholarships.length === 0) return;

  await sendTelegramMessage(chatId, `[DAILY SCHOLARSHIP HUNT RESULTS]\n\nFound ${scholarships.length} new scholarships.\nReview the results below:\n-------------------------`);

  for (const s of scholarships) {
    let identifier = '';
    try {
      const savedDoc = await saveHuntedScholarshipAsPending(s);
      identifier = savedDoc._id.toString();
    } catch (e: any) {
      console.warn(`[Hunter Agent] Could not pre-save to DB: ${e.message}`);
      identifier = String(huntScholarshipIndex++);
    }

    pendingHuntScholarships.set(identifier, s);

    await sendTelegramMessage(chatId, [
      `[TITLE]: ${escapeHtml(s.titleEn)}`,
      `[UNIVERSITY]: ${escapeHtml(s.universityEn || 'Various')}`,
      `[COUNTRY]: ${escapeHtml(s.countryEn || 'International')}`,
      `[FUNDING]: ${s.fundingType || 'Fully Funded'}`,
      `[DEGREE]: ${s.degree || 'Other'}`,
      `[DEADLINE]: ${s.deadline || 'Ongoing'}`,
      `[LINK]: <a href="${s.link}">Application Link</a>`, '',
      `[INFO]: ${escapeHtml((s.descriptionEn || '').substring(0, 150))}...`,
    ].join('\n'), {
      inline_keyboard: [[
        { text: 'Accept and Publish', callback_data: `hunt_accept:${identifier}` },
        { text: 'Reject', callback_data: `hunt_reject:${identifier}` },
      ]],
    });
  }
}

export async function saveAcceptedScholarship(dataOrDoc: any): Promise<any> {
  const adminUserId = '000000000000000000000001';

  // If already a Mongoose doc or has _id
  if (dataOrDoc?._id || typeof dataOrDoc === 'string') {
    const id = dataOrDoc._id || dataOrDoc;
    const doc = await Scholarship.findById(id);
    if (doc) {
      doc.status = 'approved';
      await doc.save();
      console.log(`[Hunter Agent] Approved existing scholarship: ${doc.title.en}`);
      return doc;
    }
  }

  const existing = await Scholarship.findOne({ 'title.en': dataOrDoc.titleEn });
  if (existing) {
    existing.status = 'approved';
    await existing.save();
    return existing;
  }

  const validDegree = ['Bachelor', 'Master', 'PhD', 'Other'].includes(dataOrDoc.degree) ? dataOrDoc.degree : 'Other';
  const validFunding = ['Fully Funded', 'Partially Funded'].includes(dataOrDoc.fundingType) ? dataOrDoc.fundingType : 'Fully Funded';

  const scholarship = new Scholarship({
    title: { en: dataOrDoc.titleEn, ar: dataOrDoc.titleAr || dataOrDoc.titleEn },
    description: { en: dataOrDoc.descriptionEn || dataOrDoc.titleEn, ar: dataOrDoc.descriptionAr || dataOrDoc.titleAr || dataOrDoc.titleEn },
    country: { en: dataOrDoc.countryEn || 'International', ar: dataOrDoc.countryAr || 'دولي' },
    university: { en: dataOrDoc.universityEn || 'Various Universities', ar: dataOrDoc.universityAr || 'جامعات متعددة' },
    degree: validDegree,
    fundingType: validFunding,
    majors: Array.isArray(dataOrDoc.majors) ? dataOrDoc.majors : [],
    deadline: dataOrDoc.deadline ? new Date(dataOrDoc.deadline) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    link: dataOrDoc.link,
    keywords: Array.isArray(dataOrDoc.keywords) ? dataOrDoc.keywords : [],
    status: 'approved',
    submittedBy: adminUserId,
  });
  await scholarship.save();
  console.log(`[Hunter Agent] Saved and approved: ${dataOrDoc.titleEn}`);
  return scholarship;
}

export async function generatePromotionalContent(scholarship: any, siteUrl: string = process.env.SITE_URL || 'https://scholarnest.up.railway.app'): Promise<{ arabic: string; english: string }> {
  const titleAr = scholarship.title?.ar || scholarship.title?.en || 'منحة دراسية مميزة';
  const titleEn = scholarship.title?.en || 'Featured Scholarship';
  const uniAr = scholarship.university?.ar || scholarship.university?.en || 'جامعة دولية مرموقة';
  const uniEn = scholarship.university?.en || 'Prestigious International University';
  const countryAr = scholarship.country?.ar || scholarship.country?.en || 'دولي';
  const countryEn = scholarship.country?.en || 'International';
  const funding = scholarship.fundingType || 'Fully Funded';
  const fundingAr = funding === 'Fully Funded' ? 'ممولة بالكامل 100% (تشمل الرسوم + راتب شهري + سكن)' : 'تمويل جزئي';
  const degree = scholarship.degree || 'All Degrees';
  const degreeAr = degree === 'Bachelor' ? 'بكالوريوس' : degree === 'Master' ? 'ماجستير' : degree === 'PhD' ? 'دكتوراه' : 'جميع المراحل الأكاديمية';
  const link = scholarship.link || '';
  const webLink = `${siteUrl}/scholarships/${scholarship._id || ''}`;

  const descAr = scholarship.description?.ar || scholarship.description?.en || '';
  const descEn = scholarship.description?.en || '';
  
  const majorsAr = Array.isArray(scholarship.majors) && scholarship.majors.length > 0
    ? scholarship.majors.join('، ')
    : 'متاحة لمعظم التخصصات والمجالات الدراسية (هندسة، طب، علوم، إدارة، علوم إنسانية وغيرها)';
  const majorsEn = Array.isArray(scholarship.majors) && scholarship.majors.length > 0
    ? scholarship.majors.join(', ')
    : 'Open to most academic fields (Engineering, Science, Business, IT, Humanities, etc.)';

  const deadlineFormattedAr = scholarship.deadline
    ? new Date(scholarship.deadline).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'مفتوح حالياً للعام الأكاديمي 2026/2027';

  const deadlineFormattedEn = scholarship.deadline
    ? new Date(scholarship.deadline).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Currently Open for Academic Year 2026/2027';

  const arabic = [
    `📢✨ فرصة استثنائية للدراسة بالخارج مجاناً لعام 2026! 🎓✈️`,
    ``,
    `🔥 منحة: ${titleAr}`,
    `🏛️ الجامعة: ${uniAr}`,
    `🌍 الدولة: ${countryAr}`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `📌 أهم تفاصيل ومميزات المنحة:`,
    `💰 نوع التمويل: ${fundingAr}`,
    `📚 المراحل الدراسية: ${degreeAr} (${degree})`,
    `🎯 التخصصات المتاحة: ${majorsAr}`,
    `⏰ آخر موعد للتقديم: ${deadlineFormattedAr}`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `📝 نبذة عن المنحة:`,
    `${descAr.substring(0, 400)}${descAr.length > 400 ? '...' : ''}`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `🎁 التغطية المالية والمزايا للطلاب المقبولين:`,
    `✅ إعفاء كامل من الرسوم الدراسية بنسبة 100%`,
    `✅ راتب شهري لتغطية كافة نفقات المعيشة`,
    `✅ تأمين صحي شامل طوال فترة الدراسة`,
    `✅ توفير السكن الجامعي أو بدل سكن`,
    `✅ تذاكر طيران وبدل استقرار مبدئي`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `🔗 كيفية التقديم:`,
    `👉 رابط التقديم الرسمي المباشر:`,
    `${link}`,
    ``,
    `🌐 تفاصيل المنحة بالكامل والشروط على منصة ScholarNest:`,
    `${webLink}`,
    ``,
    `⚠️ لا تفوت الفرصة، شارك البوست مع أصحابك أو احفظه للتقديم لاحقاً! 👥❤️`,
    `#منح_دراسية #دراسة_بالخارج #منحة_مجانية #ScholarNest #Scholarships2026 #سفر #تعليم #منح_ممولة`,
  ].join('\n');

  const english = [
    `📢✨ Great Opportunity to Study Abroad Fully Funded in 2026! 🎓✈️`,
    ``,
    `🔥 Scholarship: ${titleEn}`,
    `🏛️ University: ${uniEn}`,
    `🌍 Country: ${countryEn}`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `📌 Scholarship Highlights:`,
    `💰 Funding Type: ${funding} (100% Tuition + Living Stipend + Housing)`,
    `📚 Degree Level: ${degree}`,
    `🎯 Eligible Majors: ${majorsEn}`,
    `⏰ Application Deadline: ${deadlineFormattedEn}`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `📝 About This Scholarship:`,
    `${descEn.substring(0, 400)}${descEn.length > 400 ? '...' : ''}`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `🎁 Financial Benefits & Coverage:`,
    `✅ 100% Full tuition fee coverage`,
    `✅ Monthly living stipend allowance`,
    `✅ Free student accommodation or housing subsidy`,
    `✅ Comprehensive medical health insurance`,
    `✅ Airfare flight tickets & relocation allowance`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `🔗 How to Apply:`,
    `👉 Official Application Link:`,
    `${link}`,
    ``,
    `🌐 View Full Details & Requirements on ScholarNest:`,
    `${webLink}`,
    ``,
    `⚠️ Share this with someone looking for study abroad opportunities! 👥❤️`,
    `#Scholarships #StudyAbroad #FullyFunded #ScholarNest #InternationalStudents #HigherEducation #GlobalOpportunities`,
  ].join('\n');

  return { arabic, english };
}

function escapeHtml(text: string): string {
  return (text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function extractJsonArray(text: string): any[] | null {
  if (!text) return null;
  let cleaned = text.trim();
  // Strip <think>...</think>
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  // Strip markdown fences
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  let rawList: any[] | null = null;

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) rawList = parsed;
    else if (parsed && typeof parsed === 'object') {
      for (const key of Object.keys(parsed)) {
        if (Array.isArray(parsed[key])) {
          rawList = parsed[key];
          break;
        }
      }
    }
  } catch {}

  if (!rawList) {
    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      const candidate = cleaned.substring(firstBracket, lastBracket + 1);
      try {
        const arr = JSON.parse(candidate);
        if (Array.isArray(arr)) rawList = arr;
      } catch {}
      if (!rawList) {
        try {
          const fixed = candidate.replace(/,\s*([\]}])/g, '$1');
          const arr = JSON.parse(fixed);
          if (Array.isArray(arr)) rawList = arr;
        } catch {}
      }
    }
  }

  if (!rawList) {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        const obj = JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
        for (const key of Object.keys(obj)) {
          if (Array.isArray(obj[key])) {
            rawList = obj[key];
            break;
          }
        }
      } catch {}
    }
  }

  // 3. Robust fallback: Extract any complete scholarship JSON object even if the outer array was truncated
  if (!rawList || rawList.length === 0) {
    const objects: any[] = [];
    let depth = 0;
    let startIdx = -1;
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned[i];
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      if (char === '\\') {
        escapeNext = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === '{') {
          if (depth === 0) startIdx = i;
          depth++;
        } else if (char === '}') {
          depth--;
          if (depth === 0 && startIdx !== -1) {
            const block = cleaned.substring(startIdx, i + 1);
            try {
              objects.push(JSON.parse(block));
            } catch {
              try {
                const fixed = block.replace(/,\s*}/g, '}');
                objects.push(JSON.parse(fixed));
              } catch {}
            }
            startIdx = -1;
          }
        }
      }
    }
    if (objects.length > 0) rawList = objects;
  }

  if (!rawList || !Array.isArray(rawList)) return null;

  return rawList.map((item: any) => ({
    titleEn: item.titleEn || item.title_en || item.title || item.name || '',
    titleAr: item.titleAr || item.title_ar || item.title || '',
    descriptionEn: item.descriptionEn || item.description_en || item.description || '',
    descriptionAr: item.descriptionAr || item.description_ar || item.description || '',
    countryEn: item.countryEn || item.country_en || item.country || 'International',
    countryAr: item.countryAr || item.country_ar || 'دولي',
    universityEn: item.universityEn || item.university_en || item.university || 'Various Universities',
    universityAr: item.universityAr || item.university_ar || 'جامعات متعددة',
    degree: item.degree || 'Other',
    fundingType: item.fundingType || item.funding_type || 'Fully Funded',
    majors: Array.isArray(item.majors) ? item.majors : [],
    deadline: item.deadline || '',
    link: item.link || item.url || item.application_url || '',
    keywords: Array.isArray(item.keywords) ? item.keywords : [],
  }));
}
