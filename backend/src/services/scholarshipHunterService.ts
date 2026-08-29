import axios from 'axios';
import * as cheerio from 'cheerio';
import { Scholarship } from '../models/Scholarship';
import { BotSettings } from '../models/BotSettings';
import { sendTelegramMessage } from './telegramService';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const getHunterChatId = (settingsChatId?: string): string => settingsChatId || process.env.HUNTER_CHAT_ID || '';
const SITE_URL = process.env.SITE_URL || 'http://localhost:5173';

export const pendingHuntScholarships: Map<number, any> = new Map();
let huntScholarshipIndex = 0;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

// ── OpenRouter: 5 rotating keys ───────────────────────────────────────────────
function getKeys(): string[] {
  return [
    process.env.OPENROUTER_API_KEY_1,
    process.env.OPENROUTER_API_KEY_2,
    process.env.OPENROUTER_API_KEY_3,
    process.env.OPENROUTER_API_KEY_4,
    process.env.OPENROUTER_API_KEY_5,
    process.env.OPENROUTER_API_KEY, // fallback to single key if set
  ].filter((k): k is string => !!k);
}

// Confirmed free models on OpenRouter (2025)
const FREE_MODELS = [
  'google/gemma-3-12b-it:free',
  'qwen/qwen3-8b:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'google/gemma-2-9b-it:free',
  'microsoft/phi-3-mini-128k-instruct:free',
];

// Key rotation state
let keyIndex = 0;
let modelIndex = 0;

async function callAI(messages: any[], maxTokens = 2000): Promise<string> {
  const keys = getKeys();
  if (keys.length === 0) throw new Error('No OpenRouter API keys configured');

  const errors: string[] = [];
  // Try each key+model combination with rotation
  for (let attempt = 0; attempt < keys.length * FREE_MODELS.length; attempt++) {
    const key = keys[keyIndex % keys.length];
    const model = FREE_MODELS[modelIndex % FREE_MODELS.length];
    keyIndex++;
    modelIndex++;

    try {
      const response = await axios.post(
        OPENROUTER_API_URL,
        { model, messages, temperature: 0.1, max_tokens: maxTokens },
        {
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://scholarnest.up.railway.app',
            'X-Title': 'ScholarNest Hunter',
          },
          timeout: 60000,
        }
      );
      const content = response.data?.choices?.[0]?.message?.content;
      if (content) {
        console.log(`[Hunter AI] ✅ key:${keyIndex} model:${model}`);
        return content;
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'unknown';
      errors.push(`${model}: ${msg.substring(0, 80)}`);
      console.warn(`[Hunter AI] ⚠️ ${model}: ${msg.substring(0, 80)}`);
    }
  }

  throw new Error(`All OpenRouter keys/models failed. Last: ${errors.slice(-3).join(' | ')}`);
}


// ── AI Generates Search Queries ───────────────────────────────────────────────
async function generateSearchQueries(existingTitlesSet: Set<string>): Promise<string[]> {
  const prompt = `You are an expert scholarship hunter. We want to find NEW, fully funded scholarships for international students.
Here are some scholarships we ALREADY HAVE (Do NOT search for these):
${[...existingTitlesSet].slice(0, 40).join(', ')}

Provide exactly 3 specific, highly effective search queries to find NEW scholarships. Focus on deep searches (e.g., "fully funded government scholarships 2026 site:gov.*" or "fully funded phd scholarship international site:edu").
Return ONLY a JSON array of 3 strings. No markdown, no explanation, no emojis.
Example: ["fully funded DAAD scholarship 2026", "Eiffel Excellence Scholarship 2026 apply"]`;

  try {
    const res = await callAI([{ role: 'user', content: prompt }], 1000);
    const parsed = extractJsonArray(res);
    if (parsed && parsed.length > 0) return parsed.map(String).slice(0, 3);
  } catch (err: any) {
    console.warn('[Hunter] Query generation failed:', err.message?.substring(0, 80));
  }
  return [
    '"fully funded" "scholarship" "2026" OR "2027" "apply now" international students',
    'fully funded government scholarships for international students 2026',
  ];
}

// ── Scrape Scholarship Sites & Bing ───────────────────────────────────────────
async function scrapeScholarshipSites(queries: string[]): Promise<{ results: any[]; debug: string[] }> {
  const allResults: any[] = [];
  const debug: string[] = [];

  // 1. Static ScholarshipRoar (still a great source)
  const PAGES = ['https://scholarshiproar.com/masters-scholarships/'];
  for (const pageUrl of PAGES) {
    try {
      debug.push(`[Scraping] ScholarshipRoar...`);
      const r = await axios.get(pageUrl, { headers: HEADERS, timeout: 20000 });
      const $ = cheerio.load(r.data);
      let found = 0;
      $('h3').each((_, el) => {
        let h3Text = $(el).text().trim().replace(/^\d+\.\s*/, '');
        if (h3Text.length < 5 || h3Text.includes('POPULAR')) return;
        let finalUrl = '';
        const parentA = $(el).parent('a').attr('href');
        if (parentA) finalUrl = parentA;
        else finalUrl = $(el).find('a').attr('href') || '';
        if (finalUrl && h3Text) {
          allResults.push({ title: h3Text, description: h3Text, url: finalUrl, source: 'ScholarshipRoar' });
          found++;
        }
      });
      debug.push(`  - Found ${found} scholarships`);
    } catch (e: any) {
      debug.push(`  - Error: ${(e.message || '').substring(0, 80)}`);
    }
  }

  // 2. Dynamic Bing Searches based on AI queries
  for (const query of queries) {
    try {
      debug.push(`[Bing Search] Query: "${query}"`);
      const r = await axios.get('https://www.bing.com/search', {
        params: { q: query, count: 10 },
        headers: HEADERS, timeout: 15000,
      });
      const $ = cheerio.load(r.data);
      let bingCount = 0;
      $('li.b_algo').each((_, el) => {
        const title = $(el).find('h2 a').text().trim();
        const url = $(el).find('h2 a').attr('href');
        const snippet = $(el).find('.b_caption p, .b_algoSlug').text().trim();
        if (title && url && !url.startsWith('https://www.bing.com') && !url.includes('bing.com/ck')) {
          allResults.push({ title, description: snippet, url, source: 'Bing' });
          bingCount++;
        }
      });
      debug.push(`  - Found ${bingCount} results`);
    } catch (e: any) {
      debug.push(`  - Error: ${(e.message || '').substring(0, 80)}`);
    }
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  const seen = new Set<string>();
  const unique = allResults.filter(r => { if (seen.has(r.url)) return false; seen.add(r.url); return true; });
  debug.push(`[Summary] Total Unique: ${unique.length}`);
  return { results: unique, debug };
}

// ── AI evaluates results ───────────────────────────────────────────────────────
async function evaluateScholarshipsWithAI(rawResults: any[], existingTitlesSet: Set<string>): Promise<{ scholarships: any[]; debug: string }> {
  if (rawResults.length === 0) return { scholarships: [], debug: 'No raw results' };

  const allValid: any[] = [];
  const BATCH = 5; // Small batches for reliable JSON output

  for (let i = 0; i < Math.min(rawResults.length, 30); i += BATCH) {
    const batch = rawResults.slice(i, i + BATCH);
    const deadline = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const prompt = `Extract scholarship data as a JSON array. Return ONLY the JSON array, no emojis, no explanations, no markdown formatting.

Input scholarships:
${batch.map((r, idx) => `${idx + 1}. Title: "${r.title}" | URL: "${r.url}" | Info: "${(r.description || '').substring(0, 150)}"`).join('\n')}

Skip these (already in DB):
${[...existingTitlesSet].slice(0, 20).join(', ')}

You MUST match this exact schema (with both English and Arabic translations):
[{
  "titleEn": "string",
  "titleAr": "string (Arabic translation)",
  "descriptionEn": "string (Detailed description)",
  "descriptionAr": "string (Arabic detailed description)",
  "countryEn": "string",
  "countryAr": "string (Arabic translation)",
  "universityEn": "string",
  "universityAr": "string (Arabic translation)",
  "degree": "Bachelor" | "Master" | "PhD" | "Other",
  "fundingType": "Fully Funded" | "Partially Funded",
  "majors": ["string"],
  "deadline": "${deadline}",
  "link": "string (Application URL)",
  "keywords": ["string"]
}]

If no valid scholarships, return: []`;

    try {
      const raw = await callAI([{ role: 'user', content: prompt }], 2000);
      let cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
      const start = cleaned.indexOf('[');
      const end = cleaned.lastIndexOf(']');
      if (start === -1 || end === -1) {
        console.warn(`[Hunter] Batch ${i}-${i+BATCH}: No JSON array found`);
        continue;
      }
      const parsed = JSON.parse(cleaned.substring(start, end + 1));
      if (!Array.isArray(parsed)) continue;

      for (const s of parsed) {
        if (!s.titleEn || !s.link) continue;
        if (existingTitlesSet.has(s.titleEn.toLowerCase())) continue;
        try { new URL(s.link); } catch { continue; }
        allValid.push(s);
      }
      console.log(`[Hunter] Batch ${i}-${i+BATCH}: ${parsed.length} extracted, ${allValid.length} total valid`);
    } catch (err: any) {
      console.warn(`[Hunter] Batch ${i}-${i+BATCH} failed: ${err.message?.substring(0, 80)}`);
    }

    if (i + BATCH < rawResults.length) await new Promise(r => setTimeout(r, 1000));
  }

  return {
    scholarships: allValid,
    debug: `[AI Evaluation] ${rawResults.length} raw -> ${allValid.length} valid (batches of ${BATCH})`
  };
}


// ── Generate promo content ─────────────────────────────────────────────────────
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

1. Arabic Post: catchy hook, all details, hashtags, call to action. NO EMOJIS.
2. English Post: same structure, English hashtags. NO EMOJIS.

Return JSON: { "arabic": "...", "english": "..." }
Return ONLY valid JSON.`;

  try {
    const response = await callAI([{ role: 'user', content: prompt }], 2000);
    let cleaned = response.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
    const objStart = cleaned.indexOf('{');
    const objEnd = cleaned.lastIndexOf('}');
    if (objStart !== -1 && objEnd !== -1) {
      const parsed = JSON.parse(cleaned.substring(objStart, objEnd + 1));
      return { arabic: parsed.arabic || 'N/A', english: parsed.english || 'N/A' };
    }
  } catch {
    return {
      arabic: `Scholarship: ${scholarship.title.ar}\nUniversity: ${scholarship.university.ar}\nCountry: ${scholarship.country.ar}\nType: ${scholarship.fundingType}\nDeadline: ${scholarship.deadline ? new Date(scholarship.deadline).toLocaleDateString('ar-EG') : 'Check website'}\nApply: ${scholarship.link}`,
      english: `Scholarship: ${scholarship.title.en}\nUniversity: ${scholarship.university.en}\nCountry: ${scholarship.country.en}\nType: ${scholarship.fundingType}\nDeadline: ${scholarship.deadline ? new Date(scholarship.deadline).toLocaleDateString('en-US') : 'Check website'}\nApply: ${scholarship.link}`,
    };
  }
}

// ── Send to Telegram ───────────────────────────────────────────────────────────
export async function sendDiscoveredScholarshipsToTelegram(scholarships: any[], chatIdOverride?: string): Promise<void> {
  const chatId = chatIdOverride || getHunterChatId();
  if (!chatId) return;
  if (scholarships.length === 0) return;

  await sendTelegramMessage(chatId, [
    '[DAILY SCHOLARSHIP HUNT RESULTS]', '',
    `Found ${scholarships.length} new scholarships.`, 'Review the results below:', '-------------------------',
  ].join('\n'));

  for (const s of scholarships) {
    const idx = huntScholarshipIndex++;
    pendingHuntScholarships.set(idx, s);
    await sendTelegramMessage(chatId, [
      `[TITLE]: ${escapeHtml(s.titleEn)}`,
      `[UNIVERSITY]: ${escapeHtml(s.universityEn)}`,
      `[COUNTRY]: ${escapeHtml(s.countryEn)}`,
      `[FUNDING]: ${s.fundingType}`,
      `[DEGREE]: ${s.degree}`,
      `[DEADLINE]: ${s.deadline ? new Date(s.deadline).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown'}`,
      `[LINK]: <a href="${s.link}">Application Link</a>`, '',
      `[INFO]: ${escapeHtml((s.descriptionEn || '').substring(0, 150))}...`,
    ].join('\n'), {
      inline_keyboard: [[
        { text: 'Accept and Publish', callback_data: `hunt_accept:${idx}` },
        { text: 'Reject', callback_data: `hunt_reject:${idx}` },
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
    degree: data.degree || 'Other', fundingType: data.fundingType || 'Partially Funded',
    majors: data.majors || [],
    deadline: data.deadline ? new Date(data.deadline) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    link: data.link, keywords: data.keywords || [], status: 'approved', submittedBy: adminUserId,
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
    if (!settings.huntEnabled) { log('[Status] Disabled'); return; }
    const chatId = getHunterChatId(settings.hunterChatId);

    log('--- STEP 1: DB Context & Query Gen ---');
    const existingTitles = await Scholarship.find({}, 'title.en').lean();
    const existingTitlesSet = new Set(existingTitles.map((s: any) => s.title.en?.toLowerCase()));
    log(`[DB] Contains ${existingTitlesSet.size} scholarships`);
    
    const queries = await generateSearchQueries(existingTitlesSet);
    log(`[AI] Generated ${queries.length} queries`);

    log('--- STEP 2: Scraping ---');
    const { results: rawResults, debug: scrapeDebug } = await scrapeScholarshipSites(queries);
    debugLines.push(...scrapeDebug);
    log(`[Results] Raw count: ${rawResults.length}`);

    if (rawResults.length === 0) {
      if (chatId) {
        await sendTelegramMessage(chatId, [
          '[SEARCH RESULTS]', '', 'No results found.', '',
          '[DETAILS]:', ...debugLines.map(l => `  ${l}`), '',
          `[TIME]: ${((Date.now() - startTime) / 1000).toFixed(1)}s`,
        ].join('\n'));
      }
      return;
    }

    log('--- STEP 3: AI Evaluation ---');
    const { scholarships: evaluated, debug: aiDebug } = await evaluateScholarshipsWithAI(rawResults, existingTitlesSet);
    log(aiDebug);
    log(`[Evaluation] Valid count: ${evaluated.length}`);

    log('--- STEP 4: Telegram Notification ---');
    await sendDiscoveredScholarshipsToTelegram(evaluated, chatId);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    if (evaluated.length > 0) {
      log(`[Success] Found ${evaluated.length} scholarships`);
    } else {
      if (chatId) {
        await sendTelegramMessage(chatId, [
          '[SEARCH RESULTS]', '', `[SUMMARY]:`, ...debugLines.map(l => `  ${l}`), '',
          `[TIME]: ${elapsed}s`,
        ].join('\n'));
      }
    }
    log(`[Duration] Total: ${elapsed}s`);
  } catch (error: any) {
    const errMsg = error.response?.data?.error?.message || error.message || 'Unknown Error';
    const errStack = error.stack || 'No stack trace available';
    log(`[ERROR] ${errMsg}`);
    const settings = await BotSettings.getSettings().catch(() => null);
    const chatId = getHunterChatId(settings?.hunterChatId);
    if (chatId) {
      await sendTelegramMessage(chatId, [
        '[SYSTEM ERROR IN HUNTER]', '', 
        `[MESSAGE]: ${escapeHtml(errMsg)}`, '',
        `[STACK TRACE]:\n<pre>${escapeHtml(errStack.substring(0, 1000))}</pre>`, '',
        `[LOGS]:`, ...debugLines.map(l => `  ${l}`), '',
        `[TIME]: ${((Date.now() - startTime) / 1000).toFixed(1)}s`,
      ].join('\n'));
    }
  }
}

function escapeHtml(text: string): string {
  return (text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Robust JSON array extractor (handles think tags, markdown, extra text) ──────
function extractJsonArray(text: string): any[] | null {
  let cleaned = text.trim();
  // Strip <think>...</think> blocks
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  // Strip markdown code fences
  cleaned = cleaned.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
  // Try direct parse first
  try {
    const arr = JSON.parse(cleaned);
    if (Array.isArray(arr)) return arr;
  } catch {}
  // Find first [ and last ] for greedy match
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    const candidate = cleaned.substring(firstBracket, lastBracket + 1);
    try {
      const arr = JSON.parse(candidate);
      if (Array.isArray(arr)) return arr;
    } catch {}
    // Try fixing common issues: trailing commas, single quotes
    try {
      const fixed = candidate.replace(/,\s*([\]}])/g, '$1').replace(/'/g, '"');
      const arr = JSON.parse(fixed);
      if (Array.isArray(arr)) return arr;
    } catch {}
  }
  return null;
}

function extractJsonObject(text: string): any | null {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  cleaned = cleaned.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try { return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1)); } catch {}
  }
  return null;
}
