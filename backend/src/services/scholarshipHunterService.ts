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

export const pendingHuntScholarships: Map<number, any> = new Map();
let huntScholarshipIndex = 0;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

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

async function callOpenRouter(messages: any[], maxTokens = 2000): Promise<string> {
  const response = await axios.post(
    OPENROUTER_API_URL,
    { model: 'meta-llama/llama-4-scout:free', messages, temperature: 0.7, max_tokens: maxTokens },
    { headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://scholarnest.com', 'X-Title': 'ScholarNest Hunter' }, timeout: 90000 }
  );
  return response.data.choices[0]?.message?.content || '';
}

async function callAI(messages: any[], maxTokens = 2000): Promise<string> {
  try {
    const result = await callGroq(messages, maxTokens);
    if (result) return result;
  } catch (err: any) {
    console.log(`[Hunter Groq FAIL]: ${(err.response?.data?.error?.message || err.message || '').substring(0, 150)}`);
  }
  try {
    const result = await callOpenRouter(messages, maxTokens);
    if (result) return result;
  } catch (err: any) {
    console.log(`[Hunter OpenRouter FAIL]: ${(err.response?.data?.error?.message || err.message || '').substring(0, 150)}`);
    throw err;
  }
  throw new Error('Both AI providers are unavailable');
}

// ── Scrape individual scholarship detail pages ─────────────────────────────────
async function scrapeDetailPage(url: string): Promise<{ title: string; description: string; applyUrl: string } | null> {
  try {
    const r = await axios.get(url, { headers: HEADERS, timeout: 15000 });
    const $ = cheerio.load(r.data);

    const title = $('h1, .entry-title').first().text().trim();
    const content = $('.entry-content, .post-content, article').first().text().trim().substring(0, 1000);

    let applyUrl = '';
    $('.entry-content a, .post-content a, article a').each((_, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().trim().toLowerCase();
      if (!applyUrl && href.startsWith('http') && !href.includes('scholarshiproar.com') &&
          (text.includes('apply') || text.includes('official') || text.includes('website') || text.includes('visit') || text.includes('apply now'))) {
        applyUrl = href;
      }
    });

    return { title, description: content, applyUrl };
  } catch {
    return null;
  }
}

// ── Step 1: Scrape scholarship aggregator sites ────────────────────────────────
async function scrapeScholarshipSites(): Promise<{ results: any[]; debug: string[] }> {
  const allResults: any[] = [];
  const debug: string[] = [];

  // Scrape multiple pages from ScholarshipROAR
  const PAGES = [
    'https://scholarshiproar.com/masters-scholarships/',
    'https://scholarshiproar.com/phd-scholarships/',
    'https://scholarshiproar.com/fully-funded-scholarships/',
  ];

  for (const pageUrl of PAGES) {
    try {
      const section = pageUrl.split('/').slice(-2, -1)[0];
      debug.push(`🔍 Scraping ${section}...`);
      const r = await axios.get(pageUrl, { headers: HEADERS, timeout: 20000 });
      const $ = cheerio.load(r.data);

      // Extract scholarships from H3 headings
      const h3s = $('h3');
      let found = 0;
      h3s.each((_, el) => {
        let h3Text = $(el).text().trim().replace(/^\d+\.\s*/, '');
        if (h3Text.length < 5 || h3Text.includes('POPULAR') || h3Text.includes('Follow') || h3Text.includes('CATEGORY')) return;

        // Find links near this H3 - look for external links (official sites)
        let officialUrl = '';
        let roarUrl = '';

        // Check if H3 itself is wrapped in a link
        const parentA = $(el).parent('a').attr('href');
        if (parentA) {
          if (parentA.includes('scholarshiproar.com')) roarUrl = parentA;
          else officialUrl = parentA;
        }

        // Check links inside H3
        $(el).find('a').each((_, a) => {
          const href = $(a).attr('href') || '';
          if (href.startsWith('http')) {
            if (href.includes('scholarshiproar.com')) roarUrl = href;
            else officialUrl = href;
          }
        });

        // Check next siblings for links
        if (!officialUrl) {
          $(el).nextAll().slice(0, 3).each((_, sib) => {
            if (officialUrl) return;
            $(sib).find('a').each((_, a) => {
              if (officialUrl) return;
              const href = $(a).attr('href') || '';
              if (href.startsWith('http') && !href.includes('scholarshiproar.com')) {
                officialUrl = href;
              }
            });
          });
        }

        const finalUrl = officialUrl || roarUrl;
        if (finalUrl && h3Text) {
          allResults.push({
            title: h3Text,
            description: `Scholarship: ${h3Text}`,
            url: finalUrl,
            source: section,
          });
          found++;
        }
      });

      // Also extract from list items
      $('li').each((_, el) => {
        const text = $(el).text().trim().split('\n')[0].trim();
        if (text.length < 15 || text.length > 200) return;
        if (!text.toLowerCase().includes('scholarship') && !text.toLowerCase().includes('funded') && !text.toLowerCase().includes('fellowship')) return;

        const link = $(el).find('a').first().attr('href') || '';
        if (link.startsWith('http') && !link.includes('scholarshiproar.com')) {
          allResults.push({ title: text, description: text, url: link, source: section + '-list' });
          found++;
        }
      });

      debug.push(`   ✅ Found ${found} scholarships`);
    } catch (e: any) {
      debug.push(`   ❌ Failed: ${(e.message || '').substring(0, 80)}`);
    }
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  // Source 2: Bing search
  try {
    debug.push('🔍 Searching Bing...');
    const r = await axios.get('https://www.bing.com/search', {
      params: { q: '"fully funded" "scholarship" "2026" OR "2027" "apply now" international students', count: 15 },
      headers: HEADERS,
      timeout: 15000,
    });
    const $ = cheerio.load(r.data);
    let bingCount = 0;
    $('li.b_algo').each((_, el) => {
      const title = $(el).find('h2 a').text().trim();
      const url = $(el).find('h2 a').attr('href');
      const snippet = $(el).find('.b_caption p, .b_algoSlug').text().trim();
      if (title && url && !url.startsWith('https://www.bing.com') && !url.includes('bing.com/ck')) {
        allResults.push({ title: title.substring(0, 150), description: snippet.substring(0, 300), url, source: 'Bing' });
        bingCount++;
      }
    });
    debug.push(`   ✅ Found ${bingCount} Bing results`);
  } catch (e: any) {
    debug.push(`   ❌ Bing failed: ${(e.message || '').substring(0, 80)}`);
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  const unique = allResults.filter(r => { if (seen.has(r.url)) return false; seen.add(r.url); return true; });
  debug.push(`📊 Total unique results: ${unique.length}`);
  return { results: unique, debug };
}

// ── Step 2: AI evaluates and extracts structured scholarship data ──────────────
async function evaluateScholarshipsWithAI(
  rawResults: any[],
  existingTitlesSet: Set<string>
): Promise<{ scholarships: any[]; debug: string }> {
  if (rawResults.length === 0) return { scholarships: [], debug: 'No raw results to evaluate' };

  const prompt = `You are an expert scholarship researcher. Analyze these scholarship results and extract structured data.

FOR EACH SCHOLARSHIP, EXTRACT JSON:
{
  "titleEn": "English title",
  "titleAr": "Arabic translation",
  "descriptionEn": "2-3 sentences",
  "descriptionAr": "Arabic translation",
  "countryEn": "Country",
  "countryAr": "Arabic country",
  "universityEn": "University/org",
  "universityAr": "Arabic translation",
  "degree": "Bachelor"|"Master"|"PhD"|"Other",
  "fundingType": "Fully Funded"|"Partially Funded",
  "majors": ["fields"],
  "deadline": "2026-12-31",
  "link": "application URL",
  "keywords": ["k1","k2","k3"],
  "isValid": true
}

RULES:
- ONLY real, currently open scholarships
- Valid URL required for link
- If deadline unknown, use 6 months from now
- Skip duplicates (check EXISTING IN DB list)
- If a title in the data already exists in our DB, set isValid: false
- Return JSON array. If none valid, return []

RESULTS:
${JSON.stringify(rawResults.slice(0, 20), null, 2)}

EXISTING IN DB (do NOT duplicate):
${JSON.stringify([...existingTitlesSet].slice(0, 30))}

Return ONLY valid JSON array.`;

  try {
    const response = await callAI([{ role: 'user', content: prompt }], 4000);
    let cleaned = response.trim();
    if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
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

    return { scholarships: valid, debug: `AI: ${rawResults.length} raw → ${parsed.length} extracted → ${valid.length} valid` };
  } catch (err: any) {
    const errMsg = err.response?.data?.error?.message || err.message || 'Unknown';
    console.error('[Hunter] AI failed:', errMsg);
    return { scholarships: [], debug: `AI Error: ${errMsg.substring(0, 200)}` };
  }
}

// ── Generate promotional content ───────────────────────────────────────────────
export async function generatePromotionalContent(scholarship: any): Promise<{ arabic: string; english: string }> {
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

// ── Send to Telegram ───────────────────────────────────────────────────────────
export async function sendDiscoveredScholarshipsToTelegram(scholarships: any[], chatIdOverride?: string): Promise<void> {
  const chatId = chatIdOverride || getHunterChatId();
  if (!chatId) return;

  if (scholarships.length === 0) {
    await sendTelegramMessage(chatId, '🔍 <b>نتيجة البحث اليومية</b>\n\nلم يتم العثور على منح جديدة اليوم.');
    return;
  }

  await sendTelegramMessage(chatId, [
    '🎯 <b>نتائج البحث اليومي عن المنح</b>', '',
    `تم العثور على <b>${scholarships.length}</b> منحة جديدة.`, 'اختر القبول أو الرفض:', '─────────────────',
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
      `🔗 <a href="${s.link}">رابط التقديم</a>`, '',
      `📝 ${escapeHtml((s.descriptionEn || '').substring(0, 150))}...`,
    ].join('\n');

    await sendTelegramMessage(chatId, message, {
      inline_keyboard: [[
        { text: '✅ قبول ونشر', callback_data: `hunt_accept:${idx}` },
        { text: '❌ رفض', callback_data: `hunt_reject:${idx}` },
      ]],
    });
  }
}

// ── Save to DB ─────────────────────────────────────────────────────────────────
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

// ── Main Hunt ──────────────────────────────────────────────────────────────────
export async function runScholarshipHunt(): Promise<void> {
  console.log('[Hunter] Starting...');
  const debugLines: string[] = [];
  const startTime = Date.now();
  const log = (msg: string) => { debugLines.push(msg); console.log(`[Hunter] ${msg}`); };

  try {
    const settings = await BotSettings.getSettings();
    if (!settings.huntEnabled) { log('⚠️ Disabled'); return; }

    const chatId = getHunterChatId(settings.hunterChatId);

    log('━━━ STEP 1: Scraping ━━━');
    const { results: rawResults, debug: scrapeDebug } = await scrapeScholarshipSites();
    debugLines.push(...scrapeDebug);
    log(`📊 Raw: ${rawResults.length}`);

    if (rawResults.length === 0) {
      log('❌ No results');
      if (chatId) {
        await sendTelegramMessage(chatId, [
          '🔍 <b>نتيجة البحث اليومية</b>', '', '❌ <b>لم يتم العثور على نتائج</b>', '',
          '📝 <b>تفاصيل:</b>', ...debugLines.map(l => `  ${l}`), '',
          `⏱️ ${((Date.now() - startTime) / 1000).toFixed(1)}s`,
        ].join('\n'));
      }
      return;
    }

    log('━━━ STEP 2: AI Evaluation ━━━');
    const existingTitles = await Scholarship.find({}, 'title.en').lean();
    const existingTitlesSet = new Set(existingTitles.map((s: any) => s.title.en?.toLowerCase()));
    log(`📚 DB: ${existingTitlesSet.size}`);

    const { scholarships: evaluated, debug: aiDebug } = await evaluateScholarshipsWithAI(rawResults, existingTitlesSet);
    log(aiDebug);
    log(`✅ Valid: ${evaluated.length}`);

    log('━━━ STEP 3: Telegram ━━━');
    await sendDiscoveredScholarshipsToTelegram(evaluated, chatId);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    if (evaluated.length > 0) {
      log(`🎉 Found ${evaluated.length} scholarships!`);
    } else {
      if (chatId) {
        await sendTelegramMessage(chatId, [
          '🔍 <b>نتيجة البحث</b>', '', `📊 <b>ملخص:</b>`, ...debugLines.map(l => `  ${l}`), '',
          `⏱️ ${elapsed}s`,
        ].join('\n'));
      }
    }
    log(`⏱️ Total: ${elapsed}s`);
  } catch (error: any) {
    const errMsg = error.response?.data?.error?.message || error.message || 'Unknown';
    log(`💥 ERROR: ${errMsg}`);
    const settings = await BotSettings.getSettings().catch(() => null);
    const chatId = getHunterChatId(settings?.hunterChatId);
    if (chatId) {
      await sendTelegramMessage(chatId, [
        '⚠️ <b>خطأ</b>', '', `💥 ${escapeHtml(errMsg)}`, '',
        ...debugLines.map(l => `  ${l}`), '',
        `⏱️ ${((Date.now() - startTime) / 1000).toFixed(1)}s`,
      ].join('\n'));
    }
  }
}

function escapeHtml(text: string): string {
  return (text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
