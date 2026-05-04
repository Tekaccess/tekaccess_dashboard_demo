const API_KEY = import.meta.env.VITE_GROQ_API_KEY as string | undefined;

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

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

// Session budget. Each turn re-sends the whole transcript, so cost grows
// quadratically — a tight cap keeps requests cheap and nudges the user to
// clear once the chat has served its purpose.
export const MEMORY_LIMIT_TOKENS = 2_000;

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
- No emojis, no preamble, no closing pleasantries.

Respond ONLY with a JSON object of the shape:
{
  "note": string,
  "tasks": [ { "title": string, "description": string, "dueDate": "YYYY-MM-DD" } ]
}`;

export async function generateTasks(history: ChatHistoryEntry[]): Promise<GeneratedTaskBatch> {
  if (!API_KEY) {
    throw new Error('Groq is not configured. Set VITE_GROQ_API_KEY in .env.local and restart the dev server.');
  }

  const today = new Date().toISOString().slice(0, 10);

  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: `${SYSTEM_INSTRUCTION}\n\nToday's date is ${today}.` },
    ...history.map((e) => ({
      role: e.role === 'model' ? ('assistant' as const) : ('user' as const),
      content: e.text,
    })),
  ];

  const response = await fetch(GROQ_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.4,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Groq request failed (${response.status}): ${errText || response.statusText}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = data.choices?.[0]?.message?.content ?? '';

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
