import { Request, Response } from 'express';
import axios from 'axios';
import { Scholarship } from '../models/Scholarship';
import { AuthRequest } from '../middleware/auth';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// ── 5 OpenRouter Keys ─────────────────────────────────────────────────────────
function getKeys(): string[] {
  return [
    process.env.OPENROUTER_API_KEY_1,
    process.env.OPENROUTER_API_KEY_2,
    process.env.OPENROUTER_API_KEY_3,
    process.env.OPENROUTER_API_KEY_4,
    process.env.OPENROUTER_API_KEY_5,
  ].filter(Boolean);
}

const OPENROUTER_MODELS = [
  'nvidia/nemotron-3-super-120b-a12b:free',
  'nvidia/nemotron-3.5-lightning:free',
  'minimax/minimax-m3:free',
  'poolside/laguna-s-2.1:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
];

// ── Helper: Call OpenRouter with 5 keys × 5 models fallback ────────────────────
async function callAI(messages: any[], maxTokens = 1000): Promise<string> {
  const OPENROUTER_KEYS = getKeys();
  const errors: string[] = [];

  for (let ki = 0; ki < OPENROUTER_KEYS.length; ki++) {
    const apiKey = OPENROUTER_KEYS[ki];
    for (let mi = 0; mi < OPENROUTER_MODELS.length; mi++) {
      const model = OPENROUTER_MODELS[mi];
      try {
        const response = await axios.post(
          OPENROUTER_API_URL,
          { model, messages, temperature: 0.7, max_tokens: maxTokens },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://scholarnest.up.railway.app',
              'X-Title': 'ScholarNest AI',
            },
            timeout: 60000,
          }
        );
        const content = response.data?.choices?.[0]?.message?.content;
        if (content) {
          console.log(`[AI] ✅ key:${ki + 1} model:${model}`);
          return content;
        }
        errors.push(`key${ki + 1}/${model}: empty`);
      } catch (err: any) {
        const msg = err.response?.data?.error?.message || err.message || 'unknown';
        errors.push(`key${ki + 1}/${model}: ${msg.substring(0, 80)}`);
      }
    }
  }

  console.error(`[AI] ❌ All OpenRouter combinations failed`);
  errors.slice(-3).forEach(e => console.error(`  - ${e}`));
  throw new Error('All AI providers are currently unavailable.');
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
      If the user is asking for scholarships, tell them to use the search feature on ScholarNest.`
    };

    const fullMessages = [systemPrompt, ...messages];
    const content = await callAI(fullMessages, 1000);

    res.json({ success: true, message: { role: 'assistant', content } });

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

    const coverLetter = await callAI([{ role: 'user', content: prompt }], 1500);

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

    const reply = await callAI(messages, 500);

    res.json({ success: true, data: reply });
  } catch (error: any) {
    const detail = error.response?.data ? JSON.stringify(error.response.data).substring(0, 200) : error.message;
    console.error('[AI] Interview Error:', detail);
    res.status(500).json({ success: false, error: `Interview AI error: ${detail}` });
  }
};
