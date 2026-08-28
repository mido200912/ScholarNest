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

// ── Search Queries for finding new scholarships ────────────────────────────────
const SEARCH_QUERIES = [
  'fully funded scholarships 2026 2027 international students',
  'new scholarships for international students deadline 2026',
  'master PhD scholarship 2026 2027 fully funded',
  'scholarships for arab students abroad 2026',
  'latest government scholarships international students',
  'university scholarships 2026 2027 application open',
  'Erasmus Fulbright DAAD new scholarships 2026',
  'scholarship opportunities developing countries 2026',
];

// ── Helper: Call Groq ──────────────────────────────────────────────────────────
async function callGroq(messages: any[], maxTokens = 2000): Promise<string> {
  const groq = getGroqClient();
  const response = await groq.chat.completions.create({
    messages,
    model: 'llama-3.1-8b-instant',
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
      model: 'openai/gpt-oss-20b:free',
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
      timeout: 60000,
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
    console.log(`[Hunter Groq FAIL]: ${err.message?.substring(0, 100)}`);
  }
  try {
    const result = await callOpenRouter(messages, maxTokens);
    if (result) return result;
  } catch (err: any) {
    console.log(`[Hunter OpenRouter FAIL]: ${err.message?.substring(0, 100)}`);
  }
  throw new Error('Both AI providers are unavailable for scholarship hunting');
}

// ── Step 1: Search the internet for new scholarships ───────────────────────────
async function searchInternetForScholarships(queries: string[], maxResults: number): Promise<any[]> {
  const allResults: any[] = [];
  const selectedQueries = queries.sort(() => Math.random() - 0.5).slice(0, queries.length);

  for (const query of selectedQueries) {
    try {
      const results = await google.search(query, {
        page: 0,
        safe: false,
        parse_ads: false,
      });

      const scholarships = results.results
        .filter((r: any) => {
          const url = r.url?.toLowerCase() || '';
          const title = r.title?.toLowerCase() || '';
          return (
            (url.includes('scholarship') || title.includes('scholarship') || title.includes('grant') || title.includes('fellowship')) &&
            !url.includes('reddit.com') &&
            !url.includes('youtube.com') &&
            !url.includes('quora.com') &&
            !url.includes('facebook.com') &&
            !url.includes('twitter.com')
          );
        })
        .slice(0, maxResults)
        .map((r: any) => ({
          title: r.title,
          description: r.description,
          url: r.url,
          searchQuery: query,
        }));

      allResults.push(...scholarships);
    } catch (err: any) {
      console.log(`[Hunter] Search failed for "${query}": ${err.message?.substring(0, 80)}`);
    }
  }

  return allResults;
}

// ── Step 2: AI evaluates and extracts structured scholarship data ──────────────
async function evaluateScholarshipsWithAI(rawResults: any[]): Promise<any[]> {
  if (rawResults.length === 0) return [];

  const existingTitles = await Scholarship.find({}, 'title.en').lean();
  const existingTitlesSet = new Set(existingTitles.map((s: any) => s.title.en?.toLowerCase()));

  const prompt = `You are an expert scholarship researcher. Analyze the following search results and extract real, valid scholarships.

For each scholarship, extract:
- titleEn: English title
- titleAr: Arabic title (translate professionally)
- descriptionEn: English description (2-3 sentences about what the scholarship covers)
- descriptionAr: Arabic description (translate professionally)
- countryEn: Country name in English
- countryAr: Country name in Arabic
- universityEn: University/organization name in English
- universityAr: University/organization name in Arabic
- degree: One of "Bachelor", "Master", "PhD", "Other"
- fundingType: One of "Fully Funded", "Partially Funded"
- majors: Array of relevant majors/fields
- deadline: ISO date string (if found, otherwise estimate a reasonable deadline)
- link: The application URL
- keywords: Array of 3-5 relevant keywords for search
- isValid: true if this is a real, currently open scholarship; false if uncertain or expired

IMPORTANT RULES:
- Only include scholarships you are CONFIDENT are real and currently available
- If a URL looks like a general page (not a specific scholarship), set isValid to false
- If deadline has likely passed, set isValid to false
- Return a JSON array of objects

Search Results:
${JSON.stringify(rawResults.slice(0, 15), null, 2)}

Existing scholarships in our database (do NOT duplicate):
${JSON.stringify([...existingTitlesSet].slice(0, 20))}

Return ONLY a valid JSON array. No markdown, no explanation.`;

  try {
    const response = await callAI([{ role: 'user', content: prompt }], 3000);

    let cleaned = response.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) return [];

    return parsed.filter((s: any) => {
      if (!s.isValid) return false;
      if (!s.titleEn || !s.link) return false;
      if (existingTitlesSet.has(s.titleEn.toLowerCase())) return false;
      return true;
    });
  } catch (err: any) {
    console.error('[Hunter] AI evaluation failed:', err.message?.substring(0, 150));
    return [];
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
   - Use Arabic numerals or English numbers - whichever looks better
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

  try {
    // Load settings from DB
    const settings = await BotSettings.getSettings();

    if (!settings.huntEnabled) {
      console.log('[Hunter] Scholarship hunting is disabled in settings');
      return;
    }

    const chatId = getHunterChatId(settings.hunterChatId);
    const queries = settings.searchQueries?.length ? settings.searchQueries : SEARCH_QUERIES;
    const queriesPerDay = settings.queriesPerDay || 3;
    const maxResults = settings.maxResultsPerQuery || 5;

    // Limit queries to the configured amount
    const selectedQueries = [...queries].sort(() => Math.random() - 0.5).slice(0, queriesPerDay);

    // Step 1: Search internet
    console.log(`[Hunter] Searching internet with ${queriesPerDay} queries...`);
    const rawResults = await searchInternetForScholarships(selectedQueries, maxResults);
    console.log(`[Hunter] Found ${rawResults.length} raw results`);

    if (rawResults.length === 0) {
      if (chatId) {
        await sendTelegramMessage(chatId, '🔍 <b>نتيجة البحث اليومية</b>\n\nلم يتم العثور على نتائج جديدة اليوم.');
      }
      return;
    }

    // Step 2: AI evaluation
    console.log('[Hunter] Evaluating with AI...');
    const evaluated = await evaluateScholarshipsWithAI(rawResults);
    console.log(`[Hunter] ${evaluated.length} scholarships passed evaluation`);

    // Step 3: Send to Telegram
    await sendDiscoveredScholarshipsToTelegram(evaluated, chatId);

    console.log('[Hunter] Daily hunt completed successfully');
  } catch (error: any) {
    console.error('[Hunter] Error in daily hunt:', error.message);
    const settings = await BotSettings.getSettings().catch(() => null);
    const chatId = getHunterChatId(settings?.hunterChatId);
    if (chatId) {
      await sendTelegramMessage(
        chatId,
        `⚠️ <b>خطأ في البحث اليومي</b>\n\nحدث خطأ أثناء البحث عن المنح: ${error.message?.substring(0, 100)}`
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
