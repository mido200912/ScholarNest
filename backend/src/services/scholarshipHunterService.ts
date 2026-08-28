import axios from 'axios';
import google from 'googlethis';
import Groq from 'groq-sdk';
import { Scholarship } from '../models/Scholarship';
import { BotSettings } from '../models/BotSettings';
import { sendTelegramMessage } from './telegramService';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const getGroqClient = () => new Groq({ apiKey: process.env.GROQ_API_KEY });

const getHunterChatId = (settingsChatId?: string): string => settingsChatId || process.env.HUNTER_CHAT_ID || '';
const SITE_URL = process.env.SITE_URL || 'http://localhost:5173';

// In-memory store for pending hunt scholarships (keyed by index)
export const pendingHuntScholarships: Map<number, any> = new Map();
let huntScholarshipIndex = 0;

// ── Strong Search Queries (targeted to specific scholarship sites) ──────────────
const SEARCH_QUERIES = [
  'site:scholarships.com fully funded 2026',
  'site:opportunitiescorners.com scholarship 2026',
  'site:scholarshipalert.org new scholarship',
  'site:mastersportal.com scholarship master 2026',
  'site:phdportal.com PhD scholarship 2026',
  'site:erasmusmundus.eu Erasmus+ scholarship 2026',
  'site:daad.de scholarship 2026 international',
  'site:chevening.org scholarship 2026 2027',
  'site:fulbright.org Fulbright scholarship 2026',
  'site:scholarshiproar.com fully funded scholarship',
  'site:geteducationscholarships.com 2026',
  'site:scholarships360.info new scholarship 2026',
  '"fully funded" scholarship 2026 2027 application open deadline',
  '"scholarship" "2026" "apply now" "international students"',
  '"fully funded" "master" OR "PhD" scholarship 2026 deadline',
  'new scholarship announcement 2026 2027 apply now',
  'government scholarship 2026 international students deadline',
  'university scholarship 2026 2027 fully funded application',
];

// ── Helper: Call Groq (strong model) ────────────────────────────────────────────
async function callGroq(messages: any[], maxTokens = 2000): Promise<string> {
  const groq = getGroqClient();
  const response = await groq.chat.completions.create({
    messages,
    model: 'llama-3.3-70b-versatile',
    temperature: 0.7,
    max_tokens: maxTokens,
  });
  return response.choices[0]?.message?.content || '';
}

// ── Helper: Call OpenRouter Fallback ────────────────────────────────────────────
async function callOpenRouter(messages: any[], maxTokens = 2000): Promise<string> {
  const response = await axios.post(
    OPENROUTER_API_URL,
    {
      model: 'meta-llama/llama-4-scout:free',
      messages,
      temperature: 0.7,
      max_tokens: maxTokens,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://scholarnest.com',
        'X-Title': 'ScholarNest Hunter',
      },
      timeout: 90000,
    }
  );
  return response.data.choices[0]?.message?.content || '';
}

// ── Helper: Call AI with fallback ──────────────────────────────────────────────
async function callAI(messages: any[], maxTokens = 2000): Promise<string> {
  try {
    const result = await callGroq(messages, maxTokens);
    if (result) return result;
  } catch (err: any) {
    const errMsg = err.response?.data?.error?.message || err.message || 'Unknown';
    console.log(`[Hunter Groq FAIL]: ${errMsg.substring(0, 150)}`);
    throw err;
  }
  try {
    const result = await callOpenRouter(messages, maxTokens);
    if (result) return result;
  } catch (err: any) {
    const errMsg = err.response?.data?.error?.message || err.message || 'Unknown';
    console.log(`[Hunter OpenRouter FAIL]: ${errMsg.substring(0, 150)}`);
    throw err;
  }
  throw new Error('Both AI providers are unavailable');
}

// ── Step 1: Search the internet for new scholarships ───────────────────────────
async function searchInternetForScholarships(
  queries: string[],
  maxResults: number
): Promise<{ results: any[]; debug: string[] }> {
  const allResults: any[] = [];
  const debug: string[] = [];

  for (const query of queries) {
    try {
      debug.push(`🔍 Searching: "${query}"`);
      const results = await google.search(query, {
        page: 0,
        safe: false,
        parse_ads: false,
      });

      if (!results.results || results.results.length === 0) {
        debug.push(`   ⚠️ No results for "${query}"`);
        continue;
      }

      debug.push(`   ✅ Found ${results.results.length} raw results`);

      const scholarships = results.results
        .filter((r: any) => {
          const url = r.url?.toLowerCase() || '';
          const title = r.title?.toLowerCase() || '';
          return (
            (url.includes('scholarship') || url.includes('grant') || url.includes('fellowship') ||
             title.includes('scholarship') || title.includes('grant') || title.includes('fellowship') ||
             title.includes('fully funded') || title.includes('masters') || title.includes('phd')) &&
            !url.includes('reddit.com') &&
            !url.includes('youtube.com') &&
            !url.includes('quora.com') &&
            !url.includes('facebook.com') &&
            !url.includes('twitter.com') &&
            !url.includes('linkedin.com') &&
            !url.includes('instagram.com') &&
            !url.includes('wikipedia.org') &&
            !url.includes('pinterest.com')
          );
        })
        .slice(0, maxResults)
        .map((r: any) => ({
          title: r.title,
          description: r.description,
          url: r.url,
          searchQuery: query,
        }));

      debug.push(`   📋 After filter: ${scholarships.length} valid results`);
      allResults.push(...scholarships);
    } catch (err: any) {
      const errMsg = err.message?.substring(0, 100) || 'Unknown error';
      debug.push(`   ❌ Search failed: ${errMsg}`);
      console.log(`[Hunter] Search failed for "${query}": ${errMsg}`);
    }

    // Small delay between searches to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  return { results: allResults, debug };
}

// ── Step 2: AI evaluates and extracts structured scholarship data ──────────────
async function evaluateScholarshipsWithAI(
  rawResults: any[],
  existingTitlesSet: Set<string>
): Promise<{ scholarships: any[]; debug: string }> {
  if (rawResults.length === 0) {
    return { scholarships: [], debug: 'No raw results to evaluate' };
  }

  const prompt = `You are an expert scholarship researcher with 10 years of experience. Your job is to analyze Google search results and extract REAL, CURRENTLY OPEN scholarships.

TASK: Analyze the following search results and extract structured scholarship data.

FOR EACH SCHOLARSHIP FOUND, EXTRACT:
{
  "titleEn": "Full English title of the scholarship",
  "titleAr": "Professional Arabic translation of the title",
  "descriptionEn": "2-3 sentences about what the scholarship covers, who it's for, and benefits",
  "descriptionAr": "Professional Arabic translation of the description",
  "countryEn": "Country name in English",
  "countryAr": "Country name in Arabic",
  "universityEn": "University or organization name in English",
  "universityAr": "University or organization name in Arabic",
  "degree": "Bachelor" or "Master" or "PhD" or "Other",
  "fundingType": "Fully Funded" or "Partially Funded",
  "majors": ["list", "of", "relevant", "majors"],
  "deadline": "2026-12-31 or actual deadline if found",
  "link": "https://actual-application-url.com",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "isValid": true
}

CRITICAL RULES:
1. ONLY include scholarships you are 100% CONFIDENT are REAL and CURRENTLY OPEN
2. The link MUST be a real, working URL to the actual scholarship page
3. If you cannot determine the deadline, use a date 6 months from now
4. If a result looks like a blog post, article, or general page (NOT a specific scholarship), SKIP IT
5. If the scholarship deadline has likely passed, SKIP IT
6. If the result is a list page or directory, SKIP IT - we want individual scholarships
7. Translate ALL fields to both English AND Arabic professionally
8. Set isValid: false for any result you're not 100% sure about

SEARCH RESULTS TO ANALYZE:
${JSON.stringify(rawResults.slice(0, 20), null, 2)}

EXISTING SCHOLARSHIPS IN DATABASE (do NOT duplicate these):
${JSON.stringify([...existingTitlesSet].slice(0, 30))}

Return a JSON array of valid scholarships. If no valid scholarships are found, return an empty array [].
Return ONLY valid JSON. No markdown, no explanation, no code blocks.`;

  try {
    const response = await callAI([{ role: 'user', content: prompt }], 4000);

    let cleaned = response.trim();
    // Remove markdown code blocks if present
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    // Try to extract JSON array from response
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }

    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) {
      return { scholarships: [], debug: 'AI response was not an array' };
    }

    const valid = parsed.filter((s: any) => {
      if (!s.isValid) return false;
      if (!s.titleEn || !s.link) return false;
      if (existingTitlesSet.has(s.titleEn.toLowerCase())) return false;
      try {
        new URL(s.link);
      } catch {
        return false;
      }
      return true;
    });

    return {
      scholarships: valid,
      debug: `AI analyzed ${rawResults.length} results → ${parsed.length} extracted → ${valid.length} valid`,
    };
  } catch (err: any) {
    const errMsg = err.response?.data?.error?.message || err.message || 'Unknown';
    console.error('[Hunter] AI evaluation failed:', errMsg);
    return { scholarships: [], debug: `AI Error: ${errMsg.substring(0, 200)}` };
  }
}

// ── Step 3: Generate promotional content for accepted scholarship ──────────────
export async function generatePromotionalContent(scholarship: any): Promise<{
  arabic: string;
  english: string;
}> {
  const prompt = `You are a professional social media content creator for ScholarNest - the leading scholarship platform in the Arab world.

Generate TWO promotional posts for the following scholarship. These posts will be shared on WhatsApp channels, Telegram communities, and Facebook pages.

SCHOLARSHIP DETAILS:
- Title: ${scholarship.title.en} / ${scholarship.title.ar}
- University: ${scholarship.university.en} / ${scholarship.university.ar}
- Country: ${scholarship.country.en} / ${scholarship.country.ar}
- Degree: ${scholarship.degree}
- Funding Type: ${scholarship.fundingType}
- Deadline: ${scholarship.deadline ? new Date(scholarship.deadline).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Check website'}
- Link: ${scholarship.link}
- Description: ${scholarship.description?.en || 'N/A'}

INSTRUCTIONS:
1. Arabic Post (for WhatsApp channel + Facebook + Community):
   - Start with a catchy hook emoji line
   - Include all key details in Arabic
   - End with a strong call to action
   - Use hashtags in Arabic
   - Keep it professional but exciting
   - Add line breaks for readability

2. English Post (for WhatsApp channel + Facebook + Community):
   - Same structure as Arabic but in English
   - English hashtags
   - Professional and engaging tone

Return as JSON:
{
  "arabic": "the full Arabic post",
  "english": "the full English post"
}

Return ONLY valid JSON. No markdown blocks, no explanation.`;

  try {
    const response = await callAI([{ role: 'user', content: prompt }], 2000);

    let cleaned = response.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(cleaned);

    return {
      arabic: parsed.arabic || 'المحتوى غير متوفر',
      english: parsed.english || 'Content not available',
    };
  } catch (err: any) {
    console.error('[Hunter] Promo content generation failed:', err.message?.substring(0, 150));
    return {
      arabic: `🎓 منحة: ${scholarship.title.ar}\n🏛 الجامعة: ${scholarship.university.ar}\n🌍 البلد: ${scholarship.country.ar}\n💰 النوع: ${scholarship.fundingType}\n📅 الموعد النهائي: ${scholarship.deadline ? new Date(scholarship.deadline).toLocaleDateString('ar-EG') : 'تحقق من الموقع'}\n🔗 التقديم: ${scholarship.link}`,
      english: `🎓 Scholarship: ${scholarship.title.en}\n🏛 University: ${scholarship.university.en}\n🌍 Country: ${scholarship.country.en}\n💰 Type: ${scholarship.fundingType}\n📅 Deadline: ${scholarship.deadline ? new Date(scholarship.deadline).toLocaleDateString('en-US') : 'Check website'}\n🔗 Apply: ${scholarship.link}`,
    };
  }
}

// ── Step 4: Send discovered scholarships to Telegram ───────────────────────────
export async function sendDiscoveredScholarshipsToTelegram(scholarships: any[], chatIdOverride?: string): Promise<void> {
  const chatId = chatIdOverride || getHunterChatId();
  if (!chatId) {
    console.log('[Hunter] No HUNTER_CHAT_ID configured, skipping Telegram notification');
    return;
  }

  if (scholarships.length === 0) {
    await sendTelegramMessage(chatId, '🔍 <b>نتيجة البحث اليومية</b>\n\nلم يتم العثور على منح جديدة اليوم.');
    return;
  }

  await sendTelegramMessage(
    chatId,
    [
      '🎯 <b>نتائج البحث اليومي عن المنح</b>',
      '',
      `تم العثور على <b>${scholarships.length}</b> منحة جديدة.`,
      'اختر القبول أو الرفض لكل منحة:',
      '─────────────────',
    ].join('\n')
  );

  for (const s of scholarships) {
    const idx = huntScholarshipIndex++;
    pendingHuntScholarships.set(idx, s);

    const message = [
      `🎓 <b>${escapeHtml(s.titleEn)}</b>`,
      `🏛 <b>الجامعة:</b> ${escapeHtml(s.universityEn)}`,
      `🌍 <b>البلد:</b> ${escapeHtml(s.countryEn)}`,
      `💰 <b>النوع:</b> ${s.fundingType}`,
      `📚 <b>المستوى:</b> ${s.degree}`,
      `📅 <b>الموعد النهائي:</b> ${s.deadline ? new Date(s.deadline).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'غير محدد'}`,
      `🔗 <a href="${s.link}">رابط التقديم</a>`,
      '',
      `📝 ${escapeHtml((s.descriptionEn || '').substring(0, 150))}...`,
    ].join('\n');

    const replyMarkup = {
      inline_keyboard: [
        [
          { text: '✅ قبول ونشر', callback_data: `hunt_accept:${idx}` },
          { text: '❌ رفض', callback_data: `hunt_reject:${idx}` },
        ],
      ],
    };

    await sendTelegramMessage(chatId, message, replyMarkup);
  }
}

// ── Step 5: Save accepted scholarship to DB ────────────────────────────────────
export async function saveAcceptedScholarship(data: any): Promise<any> {
  const adminUserId = '000000000000000000000001';

  const existing = await Scholarship.findOne({ 'title.en': data.titleEn });
  if (existing) return existing;

  const scholarship = new Scholarship({
    title: { en: data.titleEn, ar: data.titleAr || data.titleEn },
    description: {
      en: data.descriptionEn || 'Discovered by AI Hunter',
      ar: data.descriptionAr || 'تم اكتشافها بواسطة الصياد الذكي',
    },
    country: { en: data.countryEn, ar: data.countryAr || data.countryEn },
    university: { en: data.universityEn, ar: data.universityAr || data.universityEn },
    degree: data.degree || 'Other',
    fundingType: data.fundingType || 'Partially Funded',
    majors: data.majors || [],
    deadline: data.deadline ? new Date(data.deadline) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    link: data.link,
    keywords: data.keywords || [],
    status: 'approved',
    submittedBy: adminUserId,
  });

  await scholarship.save();
  console.log(`[Hunter] Saved scholarship: ${data.titleEn}`);
  return scholarship;
}

// ── Main: Run the daily scholarship hunt ───────────────────────────────────────
export async function runScholarshipHunt(): Promise<void> {
  console.log('[Hunter] Starting daily scholarship hunt...');

  const debugLines: string[] = [];
  const startTime = Date.now();

  const log = (msg: string) => {
    debugLines.push(msg);
    console.log(`[Hunter] ${msg}`);
  };

  try {
    // Load settings from DB
    const settings = await BotSettings.getSettings();

    if (!settings.huntEnabled) {
      log('⚠️ Scholarship hunting is disabled in settings');
      return;
    }

    const chatId = getHunterChatId(settings.hunterChatId);
    const queries = settings.searchQueries?.length ? settings.searchQueries : SEARCH_QUERIES;
    const queriesPerDay = settings.queriesPerDay || 3;
    const maxResults = settings.maxResultsPerQuery || 5;

    // Limit queries to the configured amount
    const selectedQueries = [...queries].sort(() => Math.random() - 0.5).slice(0, queriesPerDay);

    log(`🚀 Starting hunt with ${queriesPerDay} queries`);

    // Step 1: Search internet
    log('━━━ STEP 1: Internet Search ━━━');
    const { results: rawResults, debug: searchDebug } = await searchInternetForScholarships(selectedQueries, maxResults);
    debugLines.push(...searchDebug);
    log(`📊 Total raw results: ${rawResults.length}`);

    if (rawResults.length === 0) {
      log('❌ No results found from any search query');
      if (chatId) {
        await sendTelegramMessage(
          chatId,
          [
            '🔍 <b>نتيجة البحث اليومية</b>',
            '',
            '❌ <b>لم يتم العثور على نتائج جديدة اليوم</b>',
            '',
            `📝 <b>تفاصيل التشغيل:</b>`,
            ...debugLines.map(l => `  ${l}`),
            '',
            `⏱️ ${((Date.now() - startTime) / 1000).toFixed(1)}s`,
          ].join('\n')
        );
      }
      return;
    }

    // Step 2: AI evaluation
    log('━━━ STEP 2: AI Evaluation ━━━');
    const existingTitles = await Scholarship.find({}, 'title.en').lean();
    const existingTitlesSet = new Set(existingTitles.map((s: any) => s.title.en?.toLowerCase()));
    log(`📚 Existing scholarships in DB: ${existingTitlesSet.size}`);

    const { scholarships: evaluated, debug: aiDebug } = await evaluateScholarshipsWithAI(rawResults, existingTitlesSet);
    log(aiDebug);
    log(`✅ Valid scholarships: ${evaluated.length}`);

    // Step 3: Send to Telegram
    log('━━━ STEP 3: Send to Telegram ━━━');
    await sendDiscoveredScholarshipsToTelegram(evaluated, chatId);

    if (evaluated.length > 0) {
      log(`🎉 Hunt completed! Found ${evaluated.length} new scholarships`);
    } else {
      log('ℹ️ No new unique scholarships found (all may already be in DB or not valid)');
      if (chatId) {
        await sendTelegramMessage(
          chatId,
          [
            '🔍 <b>نتيجة البحث اليومية</b>',
            '',
            `📊 <b>ملخص التشغيل:</b>`,
            ...debugLines.map(l => `  ${l}`),
            '',
            'ℹ️ لم يتم العثور على منح جديدة فريدة اليوم.',
            '',
            `⏱️ ${((Date.now() - startTime) / 1000).toFixed(1)}s`,
          ].join('\n')
        );
      }
    }

    log(`⏱️ Total time: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
  } catch (error: any) {
    const errMsg = error.response?.data?.error?.message || error.message || 'Unknown error';
    log(`💥 FATAL ERROR: ${errMsg}`);
    console.error('[Hunter] Error in daily hunt:', errMsg);

    const settings = await BotSettings.getSettings().catch(() => null);
    const chatId = getHunterChatId(settings?.hunterChatId);
    if (chatId) {
      await sendTelegramMessage(
        chatId,
        [
          '⚠️ <b>خطأ في البحث اليومي</b>',
          '',
          `💥 <b>الخطأ:</b> ${escapeHtml(errMsg)}`,
          '',
          '📝 <b>تفاصيل التشغيل:</b>',
          ...debugLines.map(l => `  ${l}`),
          '',
          `⏱️ ${((Date.now() - startTime) / 1000).toFixed(1)}s`,
        ].join('\n')
      );
    }
  }
}

// ── Helper: Escape HTML for Telegram ───────────────────────────────────────────
function escapeHtml(text: string): string {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
