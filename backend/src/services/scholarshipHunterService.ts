import axios from 'axios';
import google from 'googlethis';
import { Scholarship } from '../models/Scholarship';
import { BotSettings } from '../models/BotSettings';
import { sendTelegramMessage } from './telegramService';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const getHunterChatId = (settingsChatId?: string): string => settingsChatId || process.env.HUNTER_CHAT_ID || '';
export const pendingHuntScholarships: Map<number, any> = new Map();
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

// Models that are highly capable of Tool Calling
const AGENT_MODELS = [
  'meta-llama/llama-3.1-8b-instruct:free',
  'google/gemini-2.0-flash-lite-preview-02-05:free',
  'qwen/qwen-2.5-7b-instruct:free'
];

// ── Agent Client ─────────────────────────────────────────────────────────────
async function callAgentWithTools(messages: any[], tools: any[]): Promise<any> {
  const keys = getKeys();
  if (keys.length === 0) throw new Error('No OpenRouter API keys configured');

  const errors: string[] = [];
  for (let attempt = 0; attempt < 3; attempt++) {
    const key = keys[attempt % keys.length];
    const model = AGENT_MODELS[attempt % AGENT_MODELS.length];
    
    try {
      const response = await axios.post(
        OPENROUTER_API_URL,
        { model, messages, tools, tool_choice: 'auto', temperature: 0.1, max_tokens: 2000 },
        {
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://scholarnest.com',
            'X-Title': 'ScholarNest Hunter Agent',
          },
          timeout: 60000,
        }
      );
      const msg = response.data?.choices?.[0]?.message;
      if (msg) return msg;
      errors.push(`${model}: Empty response`);
    } catch (e: any) {
      errors.push(`${model}: ${e.response?.data?.error?.message || e.message}`);
    }
  }
  throw new Error(`Agent API failed. Errors: ${errors.join(' | ')}`);
}

// ── Web Search Tool ──────────────────────────────────────────────────────────
async function searchWeb(query: string): Promise<string> {
  try {
    const response = await google.search(query, { page: 0, safe: false, parse_ads: false });
    const results = response.results.slice(0, 10).map(r => `Title: ${r.title}\nURL: ${r.url}\nSnippet: ${r.description}`).join('\n\n');
    return results || 'No results found.';
  } catch (e: any) {
    return `Search failed: ${e.message}`;
  }
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

    const systemPrompt = `You are an autonomous Scholarship Hunter Agent. Your goal is to find 5 NEW, fully funded scholarships for international students currently open for 2026/2027.
Avoid these existing ones: ${existing}

You MUST use the 'search_web' tool to find real, currently open scholarships. Do NOT invent or hallucinate scholarships. 
You can search up to 3 times to find good ones.

Once you have gathered enough real scholarships, return ONLY a valid JSON array matching this exact schema:
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

If you haven't searched yet, USE THE TOOL FIRST. Return ONLY the JSON array when you are completely finished gathering data.`;

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
            const results = await searchWeb(args.query || 'fully funded scholarships');
            log(`[Agent Tool] ✅ Received search results.`);
            messages.push({ role: "tool", tool_call_id: call.id, name: call.function.name, content: results });
          }
        }
      } else {
        // The model decided it's done and returned content
        finalJson = aiResponse.content;
        log(`[Agent] Finished and returned data.`);
        break;
      }
    }

    if (!finalJson) throw new Error('Agent failed to return final JSON content.');

    log('--- STEP 3: Evaluation ---');
    const parsed = extractJsonArray(finalJson) || [];
    const valid = parsed.filter((s: any) => s.titleEn && s.link);
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
export async function sendDiscoveredScholarshipsToTelegram(scholarships: any[], chatIdOverride?: string): Promise<void> {
  const chatId = chatIdOverride || getHunterChatId();
  if (!chatId || scholarships.length === 0) return;

  await sendTelegramMessage(chatId, `[DAILY SCHOLARSHIP HUNT RESULTS]\n\nFound ${scholarships.length} new scholarships.\nReview the results below:\n-------------------------`);

  for (const s of scholarships) {
    const idx = huntScholarshipIndex++;
    pendingHuntScholarships.set(idx, s);
    await sendTelegramMessage(chatId, [
      `[TITLE]: ${escapeHtml(s.titleEn)}`,
      `[UNIVERSITY]: ${escapeHtml(s.universityEn)}`,
      `[COUNTRY]: ${escapeHtml(s.countryEn)}`,
      `[FUNDING]: ${s.fundingType}`,
      `[DEGREE]: ${s.degree}`,
      `[DEADLINE]: ${s.deadline}`,
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

export async function saveAcceptedScholarship(data: any): Promise<any> {
  const adminUserId = '000000000000000000000001';
  const existing = await Scholarship.findOne({ 'title.en': data.titleEn });
  if (existing) return existing;

  const scholarship = new Scholarship({
    title: { en: data.titleEn, ar: data.titleAr || data.titleEn },
    description: { en: data.descriptionEn, ar: data.descriptionAr || data.descriptionEn },
    country: { en: data.countryEn, ar: data.countryAr || data.countryEn },
    university: { en: data.universityEn, ar: data.universityAr || data.universityEn },
    degree: data.degree || 'Other', fundingType: data.fundingType || 'Partially Funded',
    majors: data.majors || [],
    deadline: data.deadline ? new Date(data.deadline) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    link: data.link, keywords: data.keywords || [], status: 'approved', submittedBy: adminUserId,
  });
  await scholarship.save();
  console.log(`[Hunter Agent] Saved: ${data.titleEn}`);
  return scholarship;
}

export async function generatePromotionalContent(scholarship: any): Promise<{ arabic: string; english: string }> {
  // Using simple logic as before, since this wasn't the main issue.
  return {
    arabic: `منحة: ${scholarship.title.ar}\nالجامعة: ${scholarship.university.ar}\nالبلد: ${scholarship.country.ar}\nالنوع: ${scholarship.fundingType}\nالتقديم: ${scholarship.link}`,
    english: `Scholarship: ${scholarship.title.en}\nUniversity: ${scholarship.university.en}\nCountry: ${scholarship.country.en}\nType: ${scholarship.fundingType}\nApply: ${scholarship.link}`,
  };
}

function escapeHtml(text: string): string {
  return (text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function extractJsonArray(text: string): any[] | null {
  let cleaned = text.trim().replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  cleaned = cleaned.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
  
  try {
    const arr = JSON.parse(cleaned);
    if (Array.isArray(arr)) return arr;
  } catch {}
  
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    try {
      const arr = JSON.parse(cleaned.substring(firstBracket, lastBracket + 1));
      if (Array.isArray(arr)) return arr;
    } catch {}
  }
  return null;
}
