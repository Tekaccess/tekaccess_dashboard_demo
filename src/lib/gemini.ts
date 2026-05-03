import { GoogleGenAI, Type } from '@google/genai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

const client = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

export interface ChatHistoryEntry {
  role: 'user' | 'model';
  text: string;
}

export interface GeneratedTaskDraft {
  title: string;
  description: string;
  dueDate: string; // YYYY-MM-DD
}

export interface GeneratedTaskBatch {
  note: string;
  tasks: GeneratedTaskDraft[];
}

// Soft cap for the visual "memory" indicator. Gemini 2.5 Flash supports
// ~1M tokens, but a session budget of 32k tokens makes the progress ring
// give meaningful feedback as a chat grows.
export const MEMORY_LIMIT_TOKENS = 32_000;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function estimateConversationTokens(entries: ChatHistoryEntry[]): number {
  return entries.reduce((sum, e) => sum + estimateTokens(e.text), 0);
}

const SYSTEM_INSTRUCTION = `You are TekAccess AI, a focused task generator inside the TekAccess application.

Your only job: given a user's context (what they did or plan to do), produce a list of concrete, well-scoped tasks for TODAY that they can review and add to their task tracker.

Rules:
- Only generate tasks for today. If the user asks for tasks for a future date or past date, refuse politely and say you only plan today's tasks.
- If the user asks for anything other than task generation, return an empty tasks array and a one-line note explaining your scope, e.g. "I only generate tasks for today. Try: 'Tasks: I will work on...'"
- Each task: short imperative title (1-8 words) and a one-sentence description (or empty string). Always set dueDate to today's date.
- Generate 1-10 tasks based on context. Don't pad. Don't merge unrelated items.
- Never link tasks to weekly/monthly/yearly targets unless the user explicitly asks (and even then, you cannot read their target list — just say so).
- The "note" field is a single short sentence summarizing what you produced.
- No emojis, no preamble, no closing pleasantries.`;

export async function generateTasks(history: ChatHistoryEntry[]): Promise<GeneratedTaskBatch> {
  if (!client) {
    throw new Error('Gemini is not configured. Set VITE_GEMINI_API_KEY in .env.local and restart the dev server.');
  }

  const today = new Date().toISOString().slice(0, 10);

  const contents = history.map((e) => ({
    role: e.role,
    parts: [{ text: e.text }],
  }));

  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents,
    config: {
      systemInstruction: `${SYSTEM_INSTRUCTION}\n\nToday's date is ${today}.`,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          note: { type: Type.STRING },
          tasks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title:       { type: Type.STRING },
                description: { type: Type.STRING },
                dueDate:     { type: Type.STRING },
              },
              required: ['title', 'description', 'dueDate'],
            },
          },
        },
        required: ['note', 'tasks'],
      },
    },
  });

  const raw = response.text ?? '';
  let parsed: GeneratedTaskBatch;
  try {
    parsed = JSON.parse(raw) as GeneratedTaskBatch;
  } catch {
    throw new Error('Could not parse AI response as JSON.');
  }
  if (!Array.isArray(parsed.tasks)) parsed.tasks = [];
  if (typeof parsed.note !== 'string') parsed.note = '';
  // Hard-pin every dueDate to today, regardless of what the model returned.
  parsed.tasks = parsed.tasks.map((t) => ({
    title: (t.title ?? '').trim(),
    description: (t.description ?? '').trim(),
    dueDate: today,
  }));
  return parsed;
}
