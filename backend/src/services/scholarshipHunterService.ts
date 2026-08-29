import axios from 'axios';
import * as cheerio from 'cheerio';
import Groq from 'groq-sdk';
import { Scholarship } from '../models/Scholarship';
import { BotSettings } from '../models/BotSettings';
import { sendTelegramMessage } from './telegramService';
import google from 'googlethis';

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
    model: 'llama-3.1-8b-instant',
    temperature: 0.7,
    max_tokens: maxTokens,
  });
  return response.choices[0]?.message?.content || '';
}

async function callOpenRouter(messages: any[], maxTokens = 2000): Promise<string> {
  const response = await axios.post(
    OPENROUTER_API_URL,
    { model: 'nvidia/nemotron-3-ultra-550b-a55b:free', messages, temperature: 0.7, max_tokens: maxTokens },
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

// ── Agent Tools ────────────────────────────────────────────────────────────────
const tools = [
  {
    type: "function",
    function: {
      name: "search_database",
      description: "Search the local database to check if we already have scholarships matching a keyword, title, or university.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_internet",
      description: "Search Google to find new scholarship opportunities.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "scrape_page",
      description: "Fetch the text content of a webpage to read scholarship details.",
      parameters: {
        type: "object",
        properties: { url: { type: "string" } },
        required: ["url"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "submit_new_scholarships",
      description: "Submit the final list of new, fully funded scholarships that are NOT in the database.",
      parameters: {
        type: "object",
        properties: {
          scholarships: {
            type: "array",
            items: {
              type: "object",
              properties: {
                titleEn: { type: "string" },
                titleAr: { type: "string" },
                descriptionEn: { type: "string" },
                descriptionAr: { type: "string" },
                countryEn: { type: "string" },
                countryAr: { type: "string" },
                universityEn: { type: "string" },
                universityAr: { type: "string" },
                degree: { type: "string", enum: ["Bachelor", "Master", "PhD", "Other"] },
                fundingType: { type: "string", enum: ["Fully Funded", "Partially Funded"] },
                majors: { type: "array", items: { type: "string" } },
                deadline: { type: "string", description: "YYYY-MM-DD or empty if unknown" },
                link: { type: "string", description: "Official application URL" },
                keywords: { type: "array", items: { type: "string" } }
              },
              required: ["titleEn", "countryEn", "universityEn", "degree", "fundingType", "link"]
            }
          }
        },
        required: ["scholarships"]
      }
    }
  }
];

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

// ── Main Hunt (Agentic Loop) ───────────────────────────────────────────────────
export async function runScholarshipHunt(): Promise<void> {
  console.log('[Hunter Agent] Starting...');
  const debugLines: string[] = [];
  const startTime = Date.now();
  const log = (msg: string) => { debugLines.push(msg); console.log(`[Hunter Agent] ${msg}`); };

  try {
    const settings = await BotSettings.getSettings();
    if (!settings.huntEnabled) { log('⚠️ Disabled'); return; }

    const chatId = getHunterChatId(settings.hunterChatId);

    log('━━━ Initiating AI Agent ━━━');
    
    // Pick one search query from settings to guide the AI
    const randomQuery = settings.searchQueries && settings.searchQueries.length > 0
      ? settings.searchQueries[Math.floor(Math.random() * settings.searchQueries.length)]
      : '"fully funded" scholarship 2026';

    const systemPrompt = `You are an elite automated scholarship hunter for ScholarNest.
Your task is to find 2-4 NEW, high-quality (preferably Fully Funded) scholarships.

GUIDELINES:
1. You MUST check the local database FIRST using search_database to avoid duplicating existing scholarships.
2. Use search_internet to look for new opportunities based on this topic: "${randomQuery}".
3. Use scrape_page to read the details of promising URLs.
4. DO NOT include scholarships that are already in the database.
5. Once you have found the new scholarships and confirmed they are not duplicates, call submit_new_scholarships with the structured JSON data.

Work methodically. You have a maximum of 15 tool calls.`;

    let messages: any[] = [{ role: 'system', content: systemPrompt }];
    const groq = getGroqClient();
    let finalScholarships: any[] = [];
    let loopCount = 0;
    
    while (loopCount < 15) {
      loopCount++;
      log(`🔄 Agent Step ${loopCount}...`);
      
      let aiMessage: any;
      try {
        const orResponse = await axios.post(
          OPENROUTER_API_URL,
          {
            model: 'meta-llama/llama-3.3-70b-instruct:free',
            messages: messages,
            temperature: 0.2,
            tools: tools,
            tool_choice: 'auto',
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
        aiMessage = orResponse.data.choices[0]?.message;
      } catch (err: any) {
        log(`⚠️ OpenRouter failed: ${err.message}. Trying Groq...`);
        const groqResponse = await groq.chat.completions.create({
          model: 'llama-3.1-8b-instant',
          messages: messages,
          temperature: 0.2,
          tools: tools as any,
          tool_choice: "auto",
          max_tokens: 4000
        });
        aiMessage = groqResponse.choices[0]?.message;
      }
      if (!aiMessage) throw new Error("No response from AI");
      
      messages.push(aiMessage);

      if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
        let submissionReceived = false;

        for (const toolCall of aiMessage.tool_calls) {
          const fnName = toolCall.function.name;
          let args: any = {};
          try { args = JSON.parse(toolCall.function.arguments); } catch(e) {}
          
          let toolResult = "";
          log(`🛠️ Tool: ${fnName}(${JSON.stringify(args).substring(0, 50)})`);

          try {
            if (fnName === 'search_database') {
              const q = args.query || '';
              const results = await Scholarship.find(
                { $or: [{ 'title.en': { $regex: q, $options: 'i' } }, { 'university.en': { $regex: q, $options: 'i' } }] }
              ).limit(5).select('title university country link');
              toolResult = results.length > 0 ? JSON.stringify(results) : "No matching scholarships found in database.";
            } 
            else if (fnName === 'search_internet') {
              const res = await google.search(args.query, { page: 0, safe: false, parse_ads: false });
              toolResult = JSON.stringify(res.results.slice(0, 5).map(r => ({ title: r.title, url: r.url, snippet: r.description })));
            }
            else if (fnName === 'scrape_page') {
              const r = await axios.get(args.url, { headers: HEADERS, timeout: 10000 });
              const $ = cheerio.load(r.data);
              toolResult = $('body').text().replace(/\s+/g, ' ').substring(0, 3000); // Truncate to save tokens
            }
            else if (fnName === 'submit_new_scholarships') {
              finalScholarships = args.scholarships || [];
              toolResult = "Successfully submitted. Terminating.";
              submissionReceived = true;
            }
            else {
              toolResult = "Unknown tool.";
            }
          } catch (e: any) {
             toolResult = `Error executing tool: ${e.message}`;
             log(`⚠️ Tool Error: ${e.message}`);
          }

          messages.push({ role: "tool", tool_call_id: toolCall.id, name: fnName, content: toolResult });
        }

        if (submissionReceived) {
          log('✅ Agent submitted scholarships. Exiting loop.');
          break; 
        }
      } else {
        log(`💬 AI: ${aiMessage.content?.substring(0, 100)}`);
        messages.push({ role: 'user', content: 'Please use the submit_new_scholarships tool to output the final results, or use other tools to continue searching.' });
      }
    }

    log('━━━ STEP 3: Verification & Telegram ━━━');
    
    // Filter out any that slipped through
    const uniqueScholarships = [];
    for(const s of finalScholarships) {
      const exists = await Scholarship.exists({ 'title.en': s.titleEn });
      if(!exists) { uniqueScholarships.push(s); }
      else { log(`🗑️ Filtered duplicate: ${s.titleEn}`); }
    }

    log(`✅ Final Valid: ${uniqueScholarships.length}`);
    await sendDiscoveredScholarshipsToTelegram(uniqueScholarships, chatId);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    if (uniqueScholarships.length > 0) {
      log(`🎉 Found ${uniqueScholarships.length} scholarships!`);
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
        '⚠️ <b>خطأ في الوكيل الذكي (Agent)</b>', '', `💥 ${escapeHtml(errMsg)}`, '',
        ...debugLines.slice(-10).map(l => `  ${l}`), '',
        `⏱️ ${((Date.now() - startTime) / 1000).toFixed(1)}s`,
      ].join('\n'));
    }
  }
}

function escapeHtml(text: string): string {
  return (text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
