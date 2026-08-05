import { Request, Response } from 'express';
import axios from 'axios';
import google from 'googlethis';
import { Scholarship } from '../models/Scholarship';
import { AuthRequest } from '../middleware/auth';
import Groq from 'groq-sdk';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const getGroqClient = () => new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── Model Config ──────────────────────────────────────────────────────────────
const GROQ_MODELS = {
  chat: 'llama-3.1-8b-instant',  // 14,400 RPD, fast, most permissive
  interview: 'llama-3.1-8b-instant',
  coverLetter: 'llama-3.1-8b-instant',
};

const OPENROUTER_MODELS = {
  chat: 'openai/gpt-oss-20b:free',  // Free, reliable
  interview: 'openai/gpt-oss-20b:free',
  coverLetter: 'openai/gpt-oss-20b:free',
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
        'HTTP-Referer': 'https://scholarnest.com',
        'X-Title': 'ScholarNest AI',
      },
      timeout: 60000,
    }
  );
  return response.data.choices[0]?.message?.content || '';
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
  return response.choices[0]?.message?.content || '';
}

// ── Helper: Try Groq first, fallback to OpenRouter ───────────────────────────
async function callAI(messages: any[], purpose: 'chat' | 'interview' | 'coverLetter', maxTokens = 1000): Promise<string> {
  // Try Groq first (faster)
  try {
    const result = await callGroq(messages, GROQ_MODELS[purpose], maxTokens);
    if (result) return result;
  } catch (err: any) {
    const groqError = err.response?.data?.error?.message || err.message || 'Unknown error';
    console.log(`[Groq FAIL] ${purpose}: ${groqError}`);
  }

  // Fallback to OpenRouter (more powerful)
  try {
    const result = await callOpenRouter(messages, OPENROUTER_MODELS[purpose], maxTokens);
    if (result) return result;
  } catch (err: any) {
    const orError = err.response?.data?.error?.message || err.message || 'Unknown error';
    console.log(`[OpenRouter FAIL] ${purpose}: ${orError}`);
  }

  throw new Error('Both AI providers are unavailable. Please try again later.');
}

// Define available tools (functions the AI can call)
const tools = [
  {
    type: "function",
    function: {
      name: "search_local_scholarships",
      description: "Search the ScholarNest database for scholarships. Use this to find scholarships hosted on our platform.",
      parameters: {
        type: "object",
        properties: {
          searchQuery: { 
            type: "string", 
            description: "The search query, like 'Computer Science UK' or 'Fully Funded'" 
          }
        },
        required: ["searchQuery"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_internet",
      description: "Search the real internet for external scholarships. ONLY use this if deepSearch is enabled AND you cannot find what the user needs in the local database.",
      parameters: {
        type: "object",
        properties: {
          query: { 
            type: "string", 
            description: "The Google search query" 
          }
        },
        required: ["query"]
      }
    }
  }
];

export const chatWithAI = async (req: Request, res: Response): Promise<void> => {
  try {
    const { messages, deepSearch } = req.body;
    
    const systemPrompt = {
      role: 'system',
      content: `You are an expert scholarship advisor for ScholarNest. 
      You help students find scholarships, write motivation letters, and answer questions.
      Always be professional, concise, and encouraging.
      You can understand and reply in both Arabic and English.
      If the user is asking for scholarships, use the available tools to search for them.`
    };

    const availableTools = deepSearch ? tools : [tools[0]];
    let currentMessages = [systemPrompt, ...messages];

    // Try Groq with tool support first
    let aiMessage: any = null;
    try {
      const payload = {
        model: GROQ_MODELS.chat,
        messages: currentMessages,
        temperature: 0.7,
        tools: availableTools,
        tool_choice: "auto"
      };

      let response = await axios.post(GROQ_API_URL, payload, {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      aiMessage = response.data.choices[0].message;

      if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
        currentMessages.push(aiMessage);

        for (const toolCall of aiMessage.tool_calls) {
          const functionName = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments);
          let toolResult = "";

          if (functionName === 'search_local_scholarships') {
            const queryObj = args.searchQuery ? { $text: { $search: args.searchQuery } } : {};
            const results = await Scholarship.find(queryObj).limit(3);
            toolResult = results.length > 0
              ? JSON.stringify(results.map(s => ({ title: s.title, university: s.university, country: s.country, degree: s.degree, link: s.link })))
              : "No local scholarships found.";
          } else if (functionName === 'search_internet') {
            try {
              const searchResults = await google.search(args.query, { page: 0, safe: false, parse_ads: false });
              toolResult = JSON.stringify(searchResults.results.slice(0, 3).map(r => ({ title: r.title, description: r.description, url: r.url })));
            } catch {
              toolResult = "Failed to search the internet.";
            }
          }

          currentMessages.push({ role: "tool", tool_call_id: toolCall.id, name: functionName, content: toolResult });
        }

        response = await axios.post(GROQ_API_URL, {
          model: GROQ_MODELS.chat,
          messages: currentMessages,
          temperature: 0.7
        }, {
          headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
          timeout: 30000
        });

        aiMessage = response.data.choices[0].message;
      }
    } catch (err: any) {
      console.log('Groq chat failed, trying OpenRouter:', err.message?.substring(0, 100));
      aiMessage = null;
    }

    // Fallback to OpenRouter (no tool calling, just chat)
    if (!aiMessage || !aiMessage.content) {
      try {
        const result = await callOpenRouter(currentMessages, OPENROUTER_MODELS.chat, 1000);
        aiMessage = { role: 'assistant', content: result };
      } catch (err: any) {
        console.log('OpenRouter chat also failed:', err.message?.substring(0, 100));
        throw new Error('Both AI providers are unavailable');
      }
    }

    res.json({ success: true, message: aiMessage });

  } catch (error: any) {
    console.error('AI Error:', error.message);
    res.status(500).json({ success: false, message: 'AI Assistant is currently unavailable. Please try again later.' });
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

    const prompt = `
      You are an expert scholarship advisor. Write a highly persuasive and professional Cover Letter / Statement of Purpose for the following student applying to this scholarship.
      
      Student Profile:
      - Name: ${user.name}
      - Major: ${user.major || 'Not specified'}
      - GPA: ${user.gpa || 'Not specified'}
      - English Level: ${user.englishLevel || 'Not specified'}
      
      Scholarship Details:
      - Title: ${scholarship.title}
      - University: ${scholarship.university}
      - Country: ${scholarship.country}
      - Degree: ${scholarship.degree}
      - Description: ${scholarship.description}

      Instructions:
      - Write in English.
      - Keep it professional, structured, and impactful (around 300-400 words).
      - Do not use placeholders like [Insert Date] - make it read like a final draft ready to send.
      - Highlight how the student's background aligns with the scholarship's goals.
    `;

    const coverLetter = await callAI([{ role: 'user', content: prompt }], 'coverLetter', 1500);

    res.json({ success: true, data: coverLetter });
  } catch (error: any) {
    console.error('AI Cover Letter Error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to generate cover letter.' });
  }
};

export const chatInterview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { scholarship, history } = req.body;
    const user = (req as any).user;

    const messages = [
      {
        role: 'system',
        content: `You are a professional scholarship interviewer for the following scholarship: 
        Title: ${scholarship.title.en}
        University: ${scholarship.university.en}
        
        The candidate's profile:
        Name: ${user.name}
        Major: ${user.major || 'Not specified'}
        Target Degree: ${scholarship.degree}

        Your job is to conduct a mock interview. 
        - Ask ONE question at a time.
        - After the user answers, give brief constructive feedback on their answer (what was good, how to improve).
        - Then, seamlessly ask the next question.
        - Keep your feedback encouraging but professional.
        - Do not overwhelm the user with long text. Keep it conversational.`
      },
      ...history
    ];

    const reply = await callAI(messages, 'interview', 500);

    res.json({ success: true, data: reply });
  } catch (error: any) {
    console.error('AI Interview Error:', error.message);
    res.status(500).json({ success: false, error: error.message || 'AI model is currently unavailable. Please try again later.' });
  }
};
