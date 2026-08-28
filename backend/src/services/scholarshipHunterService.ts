import axios from 'axios';
import * as cheerio from 'cheerio';
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

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

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

// ── Step 1: Scrape scholarship pages from aggregator sites ──────────────────────
async function scrapeScholarshipSites(): Promise<{ results: any[]; debug: string[] }> {
  const allResults: any[] = [];
  const debug: string[] = [];

  // Source 1: ScholarshipROAR - Fully Funded Scholarships
  try {
    debug.push('🔍 Scraping ScholarshipROAR...');
    const r = await axios.get('https://scholarshiproar.com/fully-funded-scholarships/', {
      headers: HEADERS,
      timeout: 20000,
    });
    const $ = cheerio.load(r.data);

    const links: { title: string; url: string }[] = [];
    $('a').each((_, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().trim();
      if (
        href.includes('scholarshiproar.com/') &&
        text.length > 15 &&
        !href.endsWith('/fully-funded-scholarships/') &&
        !href.endsWith('/scholarships-by-countries/') &&
        !href.endsWith('/undergraduate-scholarships/') &&
        !href.endsWith('/postdoctoral-fellowships/') &&
        !href.includes('/tag/') &&
        !href.includes('/category/') &&
        !href.includes('#') &&
        (text.toLowerCase().includes('2026') || text.toLowerCase().includes('2027') ||
         text.toLowerCase().includes('fully funded') || text.toLowerCase().includes('scholarship'))
      ) {
        links.push({ title: text.substring(0, 200), url: href });
      }
    });

    // Deduplicate
    const seen = new Set<string>();
    const uniqueLinks = links.filter(l => {
      if (seen.has(l.url)) return false;
      seen.add(l.url);
      return true;
    });

    debug.push(`   Found ${uniqueLinks.length} scholarship pages`);

    // Scrape details from top 5 pages
    for (const link of uniqueLinks.slice(0, 5)) {
      try {
        const page = await axios.get(link.url, { headers: HEADERS, timeout: 15000 });
        const page$ = cheerio.load(page.data);

        const title = page$('h1, .entry-title').first().text().trim();
        const content = page$('.entry-content, .post-content, article').first().text().trim().substring(0, 800);

        // Find apply links
        const applyLinks: string[] = [];
        page$('.entry-content a, .post-content a').each((_, el) => {
          const href = page$(el).attr('href');
          const text = page$(el).text().trim().toLowerCase();
          if (href && (text.includes('apply') || text.includes('official') || text.includes('website') || href.includes('apply'))) {
            applyLinks.push(href);
          }
        });

        if (title && content) {
          allResults.push({
            title,
            description: content,
            url: applyLinks[0] || link.url,
            source: 'ScholarshipROAR',
          });
          debug.push(`   ✅ ${title.substring(0, 60)}...`);
        }
      } catch (e: any) {
        debug.push(`   ⚠️ Failed to scrape ${link.url.substring(0, 50)}: ${e.message?.substring(0, 50)}`);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch (e: any) {
    debug.push(`   ❌ ScholarshipROAR failed: ${e.message?.substring(0, 80)}`);
  }

  // Source 2: Try Bing search for recent scholarship announcements
  try {
    debug.push('🔍 Searching Bing for recent scholarships...');
    const r = await axios.get('https://www.bing.com/search', {
      params: {
        q: '"fully funded" "scholarship" "2026" OR "2027" "apply now" international students',
        count: 15,
      },
      headers: HEADERS,
      timeout: 15000,
    });
    const $ = cheerio.load(r.data);

    const bingResults: { title: string; url: string; snippet: string }[] = [];
    $('li.b_algo').each((_, el) => {
      const title = $(el).find('h2 a').text().trim();
      const url = $(el).find('h2 a').attr('href');
      const snippet = $(el).find('.b_caption p, .b_algoSlug').text().trim();
      if (title && url && !url.startsWith('https://www.bing.com') && !url.includes('bing.com/ck')) {
        bingResults.push({ title: title.substring(0, 150), url, snippet: snippet.substring(0, 200) });
      }
    });

    debug.push(`   Found ${bingResults.length} Bing results`);

    for (const result of bingResults.slice(0, 5)) {
      allResults.push({
        title: result.title,
        description: result.snippet,
        url: result.url,
        source: 'Bing',
      });
      debug.push(`   ✅ ${result.title.substring(0, 60)}...`);
    }
  } catch (e: any) {
    debug.push(`   ❌ Bing search failed: ${e.message?.substring(0, 80)}`);
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

  const prompt = `You are an expert scholarship researcher. Analyze the following scholarship information and extract structured data.

FOR EACH SCHOLARSHIP, EXTRACT:
{
  "titleEn": "English title",
  "titleAr": "Arabic translation",
  "descriptionEn": "2-3 sentences about the scholarship",
  "descriptionAr": "Arabic translation",
  "countryEn": "Country",
  "countryAr": "Arabic country name",
  "universityEn": "University or organization",
  "universityAr": "Arabic translation",
  "degree": "Bachelor" or "Master" or "PhD" or "Other",
  "fundingType": "Fully Funded" or "Partially Funded",
  "majors": ["list", "of", "fields"],
  "deadline": "2026-12-31 or best estimate",
  "link": "actual application URL",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "isValid": true
}

RULES:
1. ONLY include scholarships you are CONFIDENT are real
2. Link must be a valid URL
3. If deadline unknown, use date 6 months from now
4. Skip if it's just a blog post or list page
5. Return JSON array. If none valid, return []

RESULTS:
${JSON.stringify(rawResults.slice(0, 15), null, 2)}

EXISTING IN DB (do NOT duplicate):
${JSON.stringify([...existingTitlesSet].slice(0, 20))}

Return ONLY valid JSON array.`;

  try {
    const response = await callAI([{ role: 'user', content: prompt }], 4000);

    let cleaned = response.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (jsonMatch) cleaned = jsonMatch[0];

    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return { scholarships: [], debug: 'AI response was not an array' };

    const valid = parsed.filter((s: any) => {
      if (!s.isValid) return false;
      if (!s.titleEn || !s.link) return false;
      if (existingTitlesSet.has(s.titleEn.toLowerCase())) return false;
      try { new URL(s.link); } catch { return false; }
      return true;
    });

    return {
      scholarships: valid,
      debug: `AI: ${rawResults.length} raw → ${parsed.length} extracted → ${valid.length} valid`,
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
  const prompt = `You are a professional social media content creator for ScholarNest.

Generate TWO promotional posts for this scholarship:

Title: ${scholarship.title.en} / ${scholarship.title.ar}
University: ${scholarship.university.en} / ${scholarship.university.ar}
Country: ${scholarship.country.en} / ${scholarship.country.ar}
Degree: ${scholarship.degree}
Funding: ${scholarship.fundingType}
Deadline: ${scholarship.deadline ? new Date(scholarship.deadline).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Check website'}
Link: ${scholarship.link}
Description: ${scholarship.description?.en || 'N/A'}

1. Arabic Post: catchy hook, all details, hashtags, call to action
2. English Post: same structure, English hashtags

Return JSON: { "arabic": "...", "english": "..." }
Return ONLY valid JSON.`;

  try {
    const response = await callAI([{ role: 'user', content: prompt }], 2000);
    let cleaned = response.trim();
    if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    const parsed = JSON.parse(cleaned);
    return { arabic: parsed.arabic || 'N/A', english: parsed.english || 'N/A' };
  } catch {
    return {
      arabic: `🎓 منحة: ${scholarship.title.ar}\n🏛 الجامعة: ${scholarship.university.ar}\n🌍 البلد: ${scholarship.country.ar}\n💰 النوع: ${scholarship.fundingType}\n📅 الموعد النهائي: ${scholarship.deadline ? new Date(scholarship.deadline).toLocaleDateString('ar-EG') : 'تحقق من الموقع'}\n🔗 التقديم: ${scholarship.link}`,
      english: `🎓 Scholarship: ${scholarship.title.en}\n🏛 University: ${scholarship.university.en}\n🌍 Country: ${scholarship.country.en}\n💰 Type: ${scholarship.fundingType}\n📅 Deadline: ${scholarship.deadline ? new Date(scholarship.deadline).toLocaleDateString('en-US') : 'Check website'}\n🔗 Apply: ${scholarship.link}`,
    };
  }
}

// ── Step 4: Send discovered scholarships to Telegram ───────────────────────────
export async function sendDiscoveredScholarshipsToTelegram(scholarships: any[], chatIdOverride?: string): Promise<void> {
  const chatId = chatIdOverride || getHunterChatId();
  if (!chatId) return;

  if (scholarships.length === 0) {
    await sendTelegramMessage(chatId, '🔍 <b>نتيجة البحث اليومية</b>\n\nلم يتم العثور على منح جديدة اليوم.');
    return;
  }

  await sendTelegramMessage(chatId, [
    '🎯 <b>نتائج البحث اليومي عن المنح</b>',
    '',
    `تم العثور على <b>${scholarships.length}</b> منحة جديدة.`,
    'اختر القبول أو الرفض:',
    '─────────────────',
  ].join('\n'));

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

    await sendTelegramMessage(chatId, message, {
      inline_keyboard: [
        [
          { text: '✅ قبول ونشر', callback_data: `hunt_accept:${idx}` },
          { text: '❌ رفض', callback_data: `hunt_reject:${idx}` },
        ],
      ],
    });
  }
}

// ── Step 5: Save accepted scholarship to DB ────────────────────────────────────
export async function saveAcceptedScholarship(data: any): Promise<any> {
  const adminUserId = '000000000000000000000001';
  const existing = await Scholarship.findOne({ 'title.en': data.titleEn });
  if (existing) return existing;

  const scholarship = new Scholarship({
    title: { en: data.titleEn, ar: data.titleAr || data.titleEn },
    description: { en: data.descriptionEn || 'Discovered by AI Hunter', ar: data.descriptionAr || 'تم اكتشافها بواسطة الصياد الذكي' },
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
  console.log(`[Hunter] Saved: ${data.titleEn}`);
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
    const settings = await BotSettings.getSettings();
    if (!settings.huntEnabled) {
      log('⚠️ Scholarship hunting is disabled');
      return;
    }

    const chatId = getHunterChatId(settings.hunterChatId);

    // Step 1: Scrape sites
    log('━━━ STEP 1: Scraping Scholarship Sites ━━━');
    const { results: rawResults, debug: scrapeDebug } = await scrapeScholarshipSites();
    debugLines.push(...scrapeDebug);
    log(`📊 Total raw results: ${rawResults.length}`);

    if (rawResults.length === 0) {
      log('❌ No results from any source');
      if (chatId) {
        await sendTelegramMessage(chatId, [
          '🔍 <b>نتيجة البحث اليومية</b>',
          '',
          '❌ <b>لم يتم العثور على نتائج</b>',
          '',
          '📝 <b>تفاصيل:</b>',
          ...debugLines.map(l => `  ${l}`),
          '',
          `⏱️ ${((Date.now() - startTime) / 1000).toFixed(1)}s`,
        ].join('\n'));
      }
      return;
    }

    // Step 2: AI evaluation
    log('━━━ STEP 2: AI Evaluation ━━━');
    const existingTitles = await Scholarship.find({}, 'title.en').lean();
    const existingTitlesSet = new Set(existingTitles.map((s: any) => s.title.en?.toLowerCase()));
    log(`📚 Existing in DB: ${existingTitlesSet.size}`);

    const { scholarships: evaluated, debug: aiDebug } = await evaluateScholarshipsWithAI(rawResults, existingTitlesSet);
    log(aiDebug);
    log(`✅ Valid scholarships: ${evaluated.length}`);

    // Step 3: Send to Telegram
    log('━━━ STEP 3: Send to Telegram ━━━');
    await sendDiscoveredScholarshipsToTelegram(evaluated, chatId);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    if (evaluated.length > 0) {
      log(`🎉 Found ${evaluated.length} new scholarships!`);
    } else {
      // Send debug report even when no results
      if (chatId) {
        await sendTelegramMessage(chatId, [
          '🔍 <b>نتيجة البحث اليومية</b>',
          '',
          `📊 <b>ملخص التشغيل:</b>`,
          ...debugLines.map(l => `  ${l}`),
          '',
          `⏱️ ${elapsed}s`,
        ].join('\n'));
      }
    }

    log(`⏱️ Total: ${elapsed}s`);
  } catch (error: any) {
    const errMsg = error.response?.data?.error?.message || error.message || 'Unknown';
    log(`💥 ERROR: ${errMsg}`);
    console.error('[Hunter] Error:', errMsg);

    const settings = await BotSettings.getSettings().catch(() => null);
    const chatId = getHunterChatId(settings?.hunterChatId);
    if (chatId) {
      await sendTelegramMessage(chatId, [
        '⚠️ <b>خطأ في البحث</b>',
        '',
        `💥 ${escapeHtml(errMsg)}`,
        '',
        ...debugLines.map(l => `  ${l}`),
        '',
        `⏱️ ${((Date.now() - startTime) / 1000).toFixed(1)}s`,
      ].join('\n'));
    }
  }
}

function escapeHtml(text: string): string {
  return (text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
