import { Request, Response } from 'express';
import axios from 'axios';
import { Scholarship } from '../models/Scholarship';
import { AuthRequest } from '../middleware/auth';
import Groq from 'groq-sdk';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const getGroqClient = () => new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── Model Config ──────────────────────────────────────────────────────────────
const GROQ_MODELS = {
  chat: 'llama-3.3-70b-versatile',
  interview: 'llama-3.1-8b-instant',
  coverLetter: 'llama-3.1-8b-instant',
};

const OPENROUTER_MODELS = {
  chat: 'meta-llama/llama-3.1-8b-instruct:free',
  interview: 'meta-llama/llama-3.1-8b-instruct:free',
  coverLetter: 'meta-llama/llama-3.1-8b-instruct:free',
};

// ── Helper: Call OpenRouter ───────────────────────────────────────────────────
async function callOpenRouter(messages: any[], model: string, maxTokens = 1000): Promise<string> {
  const response = await axios.post(
    OPENROUTER_API_URL,
    {
      model,
      messages,
      temperature: 0.7,
      max_tokens: maxTokens,
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://scholarnest.up.railway.app',
        'X-Title': 'ScholarNest AI',
      },
      timeout: 60000,
    }
  );
  const content = response.data.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenRouter returned empty response');
  return content;
}

// ── Helper: Call Groq ────────────────────────────────────────────────────────
async function callGroq(messages: any[], model: string, maxTokens = 1000): Promise<string> {
  const groq = getGroqClient();
  const response = await groq.chat.completions.create({
    messages,
    model,
    temperature: 0.7,
    max_tokens: maxTokens,
  });
  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('Groq returned empty response');
  return content;
}

// ── Helper: OpenRouter first, fallback to Groq ───────────────────────────────
async function callAI(messages: any[], purpose: 'chat' | 'interview' | 'coverLetter', maxTokens = 1000): Promise<string> {
  // Try OpenRouter first
  try {
    const result = await callOpenRouter(messages, OPENROUTER_MODELS[purpose], maxTokens);
    if (result) return result;
  } catch (err: any) {
    const detail = err.response?.data ? JSON.stringify(err.response.data).substring(0, 200) : err.message;
    console.warn(`[AI] OpenRouter FAIL (${purpose}): ${detail}`);
  }

  // Fallback to Groq
  try {
    const result = await callGroq(messages, GROQ_MODELS[purpose], maxTokens);
    if (result) return result;
  } catch (err: any) {
    const detail = err.response?.data ? JSON.stringify(err.response.data).substring(0, 200) : err.message;
    console.warn(`[AI] Groq FAIL (${purpose}): ${detail}`);
  }

  throw new Error('Both AI providers (OpenRouter + Groq) are currently unavailable.');
}

// ── Local DB search helper ────────────────────────────────────────────────────
async function searchLocalScholarships(query: string) {
  try {
    const regex = new RegExp(query, 'i');
    const results = await Scholarship.find({
      status: 'approved',
      $or: [
        { 'title.en': regex },
        { 'title.ar': regex },
        { 'country.en': regex },
        { 'university.en': regex },
        { keywords: regex },
        { degree: regex },
        { fundingType: regex },
      ]
    }).limit(5).select('title university country degree fundingType deadline link');

    if (results.length === 0) return 'No scholarships found in local database for that query.';
    return JSON.stringify(results.map(s => ({
      title: s.title?.en,
      university: s.university?.en,
      country: s.country?.en,
      degree: s.degree,
      fundingType: s.fundingType,
      deadline: s.deadline,
      link: s.link
    })));
  } catch (err: any) {
    console.error('[AI] DB search error:', err.message);
    return 'Database search failed.';
  }
}

// Define available tools
const tools = [
  {
    type: "function",
    function: {
      name: "search_local_scholarships",
      description: "Search the ScholarNest database for scholarships by keyword, country, degree, university, or funding type.",
      parameters: {
        type: "object",
        properties: {
          searchQuery: {
            type: "string",
            description: "Search term like 'Computer Science UK', 'Fully Funded PhD', 'Germany Masters'"
          }
        },
        required: ["searchQuery"]
      }
    }
  }
];

// ── Main Chat Handler ─────────────────────────────────────────────────────────
// @desc    Chat with AI
// @route   POST /api/ai/chat
// @access  Public
export const chatWithAI = async (req: Request, res: Response): Promise<void> => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ success: false, message: 'messages array is required' });
      return;
    }

    const systemPrompt = {
      role: 'system',
      content: `You are an expert scholarship advisor for ScholarNest. 
      You help students find scholarships, write motivation letters, and answer questions.
      Always be professional, concise, and encouraging.
      You can understand and reply in both Arabic and English.
      If the user is asking for scholarships, use the search_local_scholarships tool to find them.`
    };

    let currentMessages: any[] = [systemPrompt, ...messages];
    let aiMessage: any = null;

    // ── Try Groq with tool support ──────────────────────────────────────────
    try {
      const payload = {
        model: GROQ_MODELS.chat,
        messages: currentMessages,
        temperature: 0.7,
        tools,
        tool_choice: "auto",
        max_tokens: 1000,
      };

      let response = await axios.post(GROQ_API_URL, payload, {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      aiMessage = response.data.choices?.[0]?.message;

      // Handle tool calls
      if (aiMessage?.tool_calls && aiMessage.tool_calls.length > 0) {
        currentMessages.push(aiMessage);

        for (const toolCall of aiMessage.tool_calls) {
          const args = JSON.parse(toolCall.function.arguments || '{}');
          const toolResult = await searchLocalScholarships(args.searchQuery || '');
          currentMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
            content: toolResult
          });
        }

        response = await axios.post(GROQ_API_URL, {
          model: GROQ_MODELS.chat,
          messages: currentMessages,
          temperature: 0.7,
          max_tokens: 1000,
        }, {
          headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
          timeout: 30000
        });

        aiMessage = response.data.choices?.[0]?.message;
      }

      if (!aiMessage?.content) throw new Error('Empty response from Groq');
    } catch (err: any) {
      const detail = err.response?.data ? JSON.stringify(err.response.data).substring(0, 300) : err.message;
      console.warn('[AI] Groq tool-chat failed, trying OpenRouter simple chat:', detail);
      aiMessage = null;
    }

    // ── Fallback: OpenRouter simple chat (no tools) ──────────────────────────
    if (!aiMessage?.content) {
      try {
        const content = await callOpenRouter(currentMessages.filter(m => m.role !== 'tool'), OPENROUTER_MODELS.chat, 1000);
        aiMessage = { role: 'assistant', content };
      } catch (err: any) {
        const detail = err.response?.data ? JSON.stringify(err.response.data).substring(0, 300) : err.message;
        console.error('[AI] OpenRouter simple chat also failed:', detail);
        throw new Error(`All AI providers failed. Last error: ${detail}`);
      }
    }

    res.json({ success: true, message: aiMessage });

  } catch (error: any) {
    const detail = error.response?.data ? JSON.stringify(error.response.data).substring(0, 300) : error.message;
    console.error('[AI] chatWithAI fatal error:', detail);
    res.status(500).json({ success: false, message: `AI Assistant error: ${detail || 'Unknown error'}` });
  }
};

// @desc    Generate AI Cover Letter
// @route   POST /api/ai/cover-letter
// @access  Private
export const generateCoverLetter = async (req: AuthRequest, res: Response) => {
  try {
    const { scholarshipId } = req.body;

    const scholarship = await Scholarship.findById(scholarshipId);
    if (!scholarship) return res.status(404).json({ success: false, message: 'Scholarship not found' });

    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Not authorized' });

    const prompt = `You are an expert scholarship advisor. Write a persuasive Cover Letter for this student applying to this scholarship.
      
      Student: ${user.name} | Major: ${user.major || 'Not specified'} | GPA: ${user.gpa || 'Not specified'} | English: ${user.englishLevel || 'Not specified'}
      
      Scholarship: ${scholarship.title?.en} at ${scholarship.university?.en}, ${scholarship.country?.en} (${scholarship.degree})
      Description: ${scholarship.description?.en}

      Write a final, professional 300-400 word cover letter. No placeholders.`;

    const coverLetter = await callAI([{ role: 'user', content: prompt }], 'coverLetter', 1500);

    res.json({ success: true, data: coverLetter });
  } catch (error: any) {
    const detail = error.response?.data ? JSON.stringify(error.response.data).substring(0, 200) : error.message;
    console.error('[AI] Cover Letter Error:', detail);
    res.status(500).json({ success: false, error: `Failed to generate cover letter: ${detail}` });
  }
};

// @desc    Mock interview chat
// @route   POST /api/ai/interview
// @access  Private
export const chatInterview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { scholarship, history } = req.body;
    const user = (req as any).user;

    const messages = [
      {
        role: 'system',
        content: `You are a professional scholarship interviewer for: "${scholarship?.title?.en}" at ${scholarship?.university?.en}.
        Candidate: ${user?.name || 'Student'}, Major: ${user?.major || 'Not specified'}.
        Ask ONE question at a time. Give brief constructive feedback on each answer, then ask the next question.`
      },
      ...history
    ];

    const reply = await callAI(messages, 'interview', 500);

    res.json({ success: true, data: reply });
  } catch (error: any) {
    const detail = error.response?.data ? JSON.stringify(error.response.data).substring(0, 200) : error.message;
    console.error('[AI] Interview Error:', detail);
    res.status(500).json({ success: false, error: `Interview AI error: ${detail}` });
  }
};
