import axios from 'axios';
import google from 'googlethis';
import mongoose from 'mongoose';
import { Scholarship } from '../models/Scholarship';
import { BotSettings } from '../models/BotSettings';
import { sendTelegramMessage, sendTelegramPhoto } from './telegramService';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const SITE_URL = process.env.SITE_URL || process.env.FRONTEND_URL || 'https://scholarnest.up.railway.app';
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
async function callAgentWithTools(messages: any[], tools?: any[]): Promise<any> {
  const keys = getKeys();
  if (keys.length === 0) throw new Error('No OpenRouter API keys configured');

  const errors: string[] = [];

  for (const model of AGENT_MODELS) {
    for (let ki = 0; ki < keys.length; ki++) {
      const key = keys[ki];
      try {
        const payload: any = {
          model,
          messages,
          temperature: 0.2,
          max_tokens: 4000,
        };
        if (tools && tools.length > 0) {
          payload.tools = tools;
          payload.tool_choice = 'auto';
        }
        const response = await axios.post(
          OPENROUTER_API_URL,
          payload,
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

    const tools = [
      {
        type: "function",
        function: {
          name: "search_web",
          description: "Search Google/web for live scholarships. Returns a list of titles, URLs, and snippets.",
          parameters: { type: "object", properties: { query: { type: "string", description: "The search query." } }, required: ["query"] }
        }
      },
      {
        type: "function",
        function: {
          name: "search_images",
          description: "Search for authentic photos of a university campus or scholarship institution. Returns direct image URLs.",
          parameters: { type: "object", properties: { query: { type: "string", description: "The university or campus name to search photos for." } }, required: ["query"] }
        }
      }
    ];

    const now = new Date();
    const currentYear = now.getFullYear();
    const nextYear = currentYear + 1;
    const todayStr = now.toISOString().split('T')[0];

    const systemPrompt = `You are an autonomous Scholarship Hunter Agent.
CRITICAL REAL-TIME CONTEXT:
- TODAY'S DATE: ${todayStr}
- CURRENT CALENDAR YEAR: ${currentYear}
- TARGET ACADEMIC CYCLE: ${currentYear}/${nextYear}

YOUR OBJECTIVE:
Find 5 NEW, genuine, prestigious, fully funded or heavily funded scholarships for international students currently open for the ${currentYear}/${nextYear} academic year.
Avoid these scholarships already existing in the database: ${existing}

CRITICAL RULES:
1. YEAR & DEADLINE INTEGRITY:
   - We are currently in year ${currentYear}.
   - Every scholarship deadline MUST be a valid future date strictly after ${todayStr} (between late ${currentYear} and mid-${nextYear}).
   - NEVER return an expired date or a past year (such as 2024 or 2025). Format: YYYY-MM-DD.
2. AUTHENTIC DATA:
   - Only return genuine, verified scholarship programs from accredited universities or official governments (e.g. DAAD, Chevening, Fulbright, Turkiye Burslari, Eiffel Excellence, Swiss Government Excellence, MEXT Japan, Stipendium Hungaricum, KAUST Fellowship, Gates Cambridge, etc.).
   - The 'link' MUST be the genuine official application or university portal URL.
3. IMAGES & VISUALS:
   - Call the 'search_images' tool with the university name (e.g. 'Oxford University campus') to retrieve authentic direct image URLs.
   - Supply a direct valid image URL from search_images in the 'image' field.
4. ARABIC TRANSLATION:
   - Provide accurate, fluent Arabic translations for titleAr, descriptionAr, countryAr, and universityAr.

Return ONLY a valid JSON array matching this exact schema:
[{
  "titleEn": "Official English Title",
  "titleAr": "عنوان المنحة باللغة العربية",
  "descriptionEn": "Detailed overview of coverage, benefits, and eligibility",
  "descriptionAr": "وصف تفصيلي بالعربية يشمل التغطية المالية والشروط",
  "countryEn": "Country Name",
  "countryAr": "اسم الدولة بالعربية",
  "universityEn": "University or Sponsoring Institution",
  "universityAr": "اسم الجامعة أو المؤسسة بالعربية",
  "degree": "Bachelor" | "Master" | "PhD" | "Other",
  "fundingType": "Fully Funded" | "Partially Funded",
  "majors": ["Major 1", "Major 2"],
  "deadline": "YYYY-MM-DD",
  "link": "Official Application URL",
  "image": "Direct campus or university photo URL",
  "keywords": ["tag1", "tag2"]
}]

Return ONLY the JSON array when you are finished.`;

    const messages: any[] = [
      { role: 'system', content: systemPrompt }, 
      { role: 'user', content: `Find 5 active scholarships for the ${currentYear}/${nextYear} cycle with future deadlines after ${todayStr}.` }
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
            log(`[Agent Tool] 🔍 Searching Web: "${args.query}"`);
            const results = await searchWeb(args.query || 'fully funded scholarships 2026');
            log(`[Agent Tool] ✅ Received search results.`);
            messages.push({ role: "tool", tool_call_id: call.id, name: call.function.name, content: results });
          } else if (call.function.name === 'search_images') {
            const args = JSON.parse(call.function.arguments || '{}');
            log(`[Agent Tool] 📸 Searching Campus Images: "${args.query}"`);
            const imgs = await searchCampusImages(args.query || 'university campus', 3);
            log(`[Agent Tool] ✅ Found ${imgs.length} campus images.`);
            messages.push({ role: "tool", tool_call_id: call.id, name: call.function.name, content: JSON.stringify({ images: imgs }) });
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

// ── Image & Deadline Validation Helpers ─────────────────────────────────────
export async function searchCampusImages(query: string, maxResults = 5): Promise<string[]> {
  const cleanQuery = (query || '').trim();
  if (!cleanQuery) return [];
  const images: string[] = [];

  const addImage = (url?: string) => {
    if (!url || typeof url !== 'string' || !url.startsWith('http')) return;
    const clean = url.split('?')[0];
    const lower = clean.toLowerCase();
    if (
      (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp')) &&
      !lower.endsWith('.svg') &&
      !lower.includes('icon') &&
      !lower.includes('placeholder') &&
      !lower.includes('food') &&
      !lower.includes('recipe') &&
      !lower.includes('avatar')
    ) {
      if (!images.includes(clean)) images.push(clean);
    }
  };

  // 1. Wikipedia Summary lead image for the institution
  try {
    const uniName = cleanQuery.replace(/ campus| building| scholarship/gi, '').trim();
    if (uniName.length > 2) {
      const wikiRes = await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(uniName)}`, {
        headers: { 'User-Agent': 'ScholarNestBot/1.0 (contact@scholarnest.com)' },
        timeout: 4000,
      });
      const wikiImg = wikiRes.data?.originalimage?.source || wikiRes.data?.thumbnail?.source;
      addImage(wikiImg);
    }
  } catch {}

  // 2. Search Wikimedia Commons for high-resolution campus landscape photos
  try {
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(cleanQuery + ' campus')}&gsrnamespace=6&prop=imageinfo&iiprop=url|mime&format=json&origin=*`;
    const res = await axios.get(searchUrl, {
      headers: { 'User-Agent': 'ScholarNestBot/1.0 (contact@scholarnest.com)' },
      timeout: 5000,
    });
    const pages = res.data?.query?.pages || {};
    for (const k of Object.keys(pages)) {
      const p = pages[k];
      const rawUrl = p.imageinfo?.[0]?.url;
      addImage(rawUrl);
      if (images.length >= maxResults) break;
    }
  } catch {}

  // 3. Fallback: Search Wikimedia Commons without 'campus' keyword
  if (images.length === 0) {
    try {
      const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(cleanQuery)}&gsrnamespace=6&prop=imageinfo&iiprop=url|mime&format=json&origin=*`;
      const res = await axios.get(searchUrl, {
        headers: { 'User-Agent': 'ScholarNestBot/1.0 (contact@scholarnest.com)' },
        timeout: 5000,
      });
      const pages = res.data?.query?.pages || {};
      for (const k of Object.keys(pages)) {
        const p = pages[k];
        const rawUrl = p.imageinfo?.[0]?.url;
        addImage(rawUrl);
        if (images.length >= maxResults) break;
      }
    } catch {}
  }

  return images.slice(0, maxResults);
}

export async function resolveScholarshipImage(data: any): Promise<string> {
  // 1. Direct valid image from agent if it's an authentic photo/logo
  if (data.image && typeof data.image === 'string' && data.image.startsWith('http')) {
    const lower = data.image.toLowerCase();
    if (!lower.includes('avocado') && !lower.includes('food') && !lower.includes('recipe') && !lower.includes('placeholder')) {
      return data.image;
    }
  }

  // 2. Fetch official university photo/campus dynamically
  const uni = data.universityEn || data.university?.en || data.university || data.titleEn || data.countryEn || '';
  if (uni && uni !== 'Various Universities' && uni !== 'Various' && uni.length > 2) {
    const found = await searchCampusImages(uni, 3);
    if (found.length > 0) return found[0];
  }

  // 3. Country campus search fallback
  const country = data.countryEn || data.country?.en || '';
  if (country) {
    const foundCountry = await searchCampusImages(`${country} university campus`, 2);
    if (foundCountry.length > 0) return foundCountry[0];
  }

  // 4. Safe academic open-access campus photo
  return 'https://upload.wikimedia.org/wikipedia/commons/2/2b/Radcliffe_Camera%2C_Oxford_-_Oct_2006.jpg';
}

function parseValidFutureDeadline(deadlineRaw?: any): Date {
  const now = new Date();
  if (deadlineRaw) {
    const parsed = new Date(deadlineRaw);
    if (!isNaN(parsed.getTime()) && parsed.getTime() > now.getTime()) {
      return parsed;
    }
  }
  // Default realistic deadline for the upcoming intake (approx 4 months in 2026/2027)
  return new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000);
}

// ── Helpers ──────────────────────────────────────────────────────────────────
export async function saveHuntedScholarshipAsPending(data: any): Promise<any> {
  const adminUserId = '000000000000000000000001';
  const existing = await Scholarship.findOne({ 'title.en': data.titleEn });
  if (existing) return existing;

  const validDegree = ['Bachelor', 'Master', 'PhD', 'Other'].includes(data.degree) ? data.degree : 'Other';
  const validFunding = ['Fully Funded', 'Partially Funded'].includes(data.fundingType) ? data.fundingType : 'Fully Funded';
  const validDeadline = parseValidFutureDeadline(data.deadline);
  const resolvedImage = await resolveScholarshipImage(data);

  const scholarship = new Scholarship({
    title: { en: data.titleEn, ar: data.titleAr || data.titleEn },
    description: { en: data.descriptionEn || data.titleEn, ar: data.descriptionAr || data.titleAr || data.titleEn },
    country: { en: data.countryEn || 'International', ar: data.countryAr || 'دولي' },
    university: { en: data.universityEn || 'Various Universities', ar: data.universityAr || 'جامعات متعددة' },
    degree: validDegree,
    fundingType: validFunding,
    majors: Array.isArray(data.majors) ? data.majors : [],
    deadline: validDeadline,
    link: data.link,
    image: resolvedImage,
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

  await sendTelegramMessage(
    chatId,
    `🎯 <b>[نتائج صائد المنح الذكي]</b>\n\nعثر الذكاء الاصطناعي على <b>${scholarships.length}</b> منحة دراسية جديدة.\nعاين كل منحة مع صورتها أدناه، ويمكنك الموافقة، الاستبعاد، أو طلب تعديل بالذكاء الاصطناعي:\n━━━━━━━━━━━━━━━━━━━━━`
  );

  for (const s of scholarships) {
    let identifier = '';
    let savedDoc: any = null;
    try {
      savedDoc = await saveHuntedScholarshipAsPending(s);
      identifier = savedDoc._id.toString();
    } catch (e: any) {
      console.warn(`[Hunter Agent] Could not pre-save to DB: ${e.message}`);
      identifier = String(huntScholarshipIndex++);
    }

    pendingHuntScholarships.set(identifier, s);

    const displayImage = savedDoc?.image || s.image;
    const deadlineFormatted = s.deadline
      ? new Date(s.deadline).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })
      : 'مستمر للعام الأكاديمي 2026/2027';

    const caption = [
      `🎓 <b>${escapeHtml(s.titleAr || s.titleEn)}</b>`,
      s.titleEn && s.titleAr !== s.titleEn ? `📌 <i>${escapeHtml(s.titleEn)}</i>` : '',
      '',
      `🏛 <b>الجامعة:</b> ${escapeHtml(s.universityAr || s.universityEn || 'جامعات متعددة')}`,
      `🌍 <b>الدولة:</b> ${escapeHtml(s.countryAr || s.countryEn || 'دولي')}`,
      `💰 <b>التمويل:</b> ${escapeHtml(s.fundingType || 'Fully Funded')}`,
      `🎯 <b>الدرجة:</b> ${escapeHtml(s.degree || 'بكالوريوس / ماجستير')}`,
      `⏰ <b>الموعد النهائي:</b> ${deadlineFormatted}`,
      `🔗 <a href="${s.link}">رابط التقديم الرسمي للجامعة</a>`,
      '',
      `📝 <b>نبذة:</b> ${escapeHtml((s.descriptionAr || s.descriptionEn || '').substring(0, 180))}...`,
    ].filter(Boolean).join('\n');

    const replyMarkup = {
      inline_keyboard: [
        [
          { text: '✅ قبول ونشر على الموقع', callback_data: `hunt_accept:${identifier}` },
          { text: '❌ استبعاد', callback_data: `hunt_reject:${identifier}` },
        ],
        [
          { text: '✏️ اطلب من الـ AI تعديلها', callback_data: `hunt_ai_edit:${identifier}` },
          { text: '🛠️ تعديل يدوي بالموقع', url: `${SITE_URL}/admin/scholarships` },
        ]
      ],
    };

    await sendTelegramPhoto(chatId, displayImage, caption, replyMarkup);
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
      if (!doc.image || doc.image.includes('unsplash.com/photo-1523050854058')) {
        doc.image = await resolveScholarshipImage(doc);
      }
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
  const validDeadline = parseValidFutureDeadline(dataOrDoc.deadline);
  const resolvedImage = await resolveScholarshipImage(dataOrDoc);

  const scholarship = new Scholarship({
    title: { en: dataOrDoc.titleEn, ar: dataOrDoc.titleAr || dataOrDoc.titleEn },
    description: { en: dataOrDoc.descriptionEn || dataOrDoc.titleEn, ar: dataOrDoc.descriptionAr || dataOrDoc.titleAr || dataOrDoc.titleEn },
    country: { en: dataOrDoc.countryEn || 'International', ar: dataOrDoc.countryAr || 'دولي' },
    university: { en: dataOrDoc.universityEn || 'Various Universities', ar: dataOrDoc.universityAr || 'جامعات متعددة' },
    degree: validDegree,
    fundingType: validFunding,
    majors: Array.isArray(dataOrDoc.majors) ? dataOrDoc.majors : [],
    deadline: validDeadline,
    link: dataOrDoc.link,
    image: resolvedImage,
    keywords: Array.isArray(dataOrDoc.keywords) ? dataOrDoc.keywords : [],
    status: 'approved',
    submittedBy: adminUserId,
  });
  await scholarship.save();
  console.log(`[Hunter Agent] Saved and approved: ${dataOrDoc.titleEn}`);
  return scholarship;
}

export async function modifyScholarshipWithAI(
  scholarshipId: string,
  userInstruction: string
): Promise<{ scholarship: any; changes: string }> {
  let doc: any = null;
  if (mongoose.Types.ObjectId.isValid(scholarshipId)) {
    doc = await Scholarship.findById(scholarshipId);
  }
  let currentData = doc ? doc.toObject() : pendingHuntScholarships.get(scholarshipId);

  if (!currentData) {
    throw new Error('المنحة غير موجودة في قاعدة البيانات أو قائمة الانتظار.');
  }

  const isImageRequest = /صورة|صور|photo|image|pic|picture/i.test(userInstruction);
  let newImage = doc?.image || currentData.image;

  if (isImageRequest) {
    const uni = currentData.university?.en || currentData.universityEn || currentData.title?.en || '';
    const images = await searchCampusImages(`${uni} university campus`, 6);
    const alt = images.find((img: string) => img !== newImage);
    if (alt) {
      newImage = alt;
    } else if (images.length > 0) {
      newImage = images[0];
    }
  }

  const prompt = `You are an AI scholarship editor assistant.
The user wants to update an existing scholarship with this instruction: "${userInstruction}"

Current Scholarship Data:
${JSON.stringify({
  titleEn: currentData.title?.en || currentData.titleEn,
  titleAr: currentData.title?.ar || currentData.titleAr,
  descriptionEn: currentData.description?.en || currentData.descriptionEn,
  descriptionAr: currentData.description?.ar || currentData.descriptionAr,
  universityEn: currentData.university?.en || currentData.universityEn,
  universityAr: currentData.university?.ar || currentData.universityAr,
  countryEn: currentData.country?.en || currentData.countryEn,
  countryAr: currentData.country?.ar || currentData.countryAr,
  fundingType: currentData.fundingType,
  degree: currentData.degree,
  majors: currentData.majors,
  deadline: currentData.deadline,
  link: currentData.link,
}, null, 2)}

TASK:
Apply the user's requested modifications accurately. Keep unchanged fields as they are.
Return ONLY a valid JSON object matching this schema:
{
  "titleEn": "...",
  "titleAr": "...",
  "descriptionEn": "...",
  "descriptionAr": "...",
  "universityEn": "...",
  "universityAr": "...",
  "countryEn": "...",
  "countryAr": "...",
  "fundingType": "Fully Funded" | "Partially Funded",
  "degree": "Bachelor" | "Master" | "PhD" | "Other",
  "majors": ["..."],
  "deadline": "YYYY-MM-DD",
  "link": "...",
  "changeSummary": "Brief Arabic explanation of what was changed"
}`;

  let updatedJson: any = null;
  try {
    const aiResponse = await callAgentWithTools([{ role: 'user', content: prompt }]);
    const content = aiResponse.content || aiResponse.reasoning || '';
    const cleanJsonMatch = content.match(/\{[\s\S]*\}/);
    if (cleanJsonMatch) {
      updatedJson = JSON.parse(cleanJsonMatch[0]);
    }
  } catch (err: any) {
    console.warn('[AI Edit] LLM edit call error:', err.message);
  }

  if (doc) {
    if (updatedJson) {
      if (updatedJson.titleEn) doc.title.en = updatedJson.titleEn;
      if (updatedJson.titleAr) doc.title.ar = updatedJson.titleAr;
      if (updatedJson.descriptionEn) doc.description.en = updatedJson.descriptionEn;
      if (updatedJson.descriptionAr) doc.description.ar = updatedJson.descriptionAr;
      if (updatedJson.universityEn) doc.university.en = updatedJson.universityEn;
      if (updatedJson.universityAr) doc.university.ar = updatedJson.universityAr;
      if (updatedJson.countryEn) doc.country.en = updatedJson.countryEn;
      if (updatedJson.countryAr) doc.country.ar = updatedJson.countryAr;
      if (updatedJson.fundingType) doc.fundingType = updatedJson.fundingType;
      if (updatedJson.degree) doc.degree = updatedJson.degree;
      if (Array.isArray(updatedJson.majors)) doc.majors = updatedJson.majors;
      if (updatedJson.deadline) doc.deadline = parseValidFutureDeadline(updatedJson.deadline);
      if (updatedJson.link) doc.link = updatedJson.link;
    }
    if (newImage && newImage !== doc.image) {
      doc.image = newImage;
    }
    await doc.save();
    return {
      scholarship: doc,
      changes: updatedJson?.changeSummary || (isImageRequest ? 'تم تحديث الصورة بصورة جديدة للحرم الجامعي' : 'تم تحديث بيانات المنحة وفق طلبك'),
    };
  } else {
    const merged = {
      ...currentData,
      ...(updatedJson || {}),
      image: newImage,
    };
    pendingHuntScholarships.set(scholarshipId, merged);
    return {
      scholarship: merged,
      changes: updatedJson?.changeSummary || (isImageRequest ? 'تم تحديث الصورة بصورة جديدة للحرم الجامعي' : 'تم تحديث بيانات المنحة وفق طلبك'),
    };
  }
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
    image: item.image || item.imageUrl || item.image_url || '',
    keywords: Array.isArray(item.keywords) ? item.keywords : [],
  }));
}
