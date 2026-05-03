import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { generateTasks, type ChatHistoryEntry } from '../lib/gemini';
import { apiCreateTask } from '../lib/api';

export interface DraftTask {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  selected: boolean;
  inserted: boolean;
  insertError?: string;
}

export type ChatEntry =
  | { id: string; role: 'user'; content: string }
  | { id: string; role: 'model'; note: string; tasks: DraftTask[] };

interface AiChatContextValue {
  entries: ChatEntry[];
  loading: boolean;
  inserting: boolean;
  sendMessage: (text: string) => Promise<void>;
  clear: () => void;
  toggleTask: (entryId: string, taskId: string) => void;
  updateTask: (entryId: string, taskId: string, patch: Partial<Pick<DraftTask, 'title' | 'description' | 'dueDate'>>) => void;
  insertSelected: (entryId: string) => Promise<void>;
}

const AiChatContext = createContext<AiChatContextValue | null>(null);

let idCounter = 0;
const newId = () => `${Date.now().toString(36)}-${++idCounter}`;

function serializeForHistory(entry: ChatEntry): ChatHistoryEntry {
  if (entry.role === 'user') {
    return { role: 'user', text: entry.content };
  }
  // Compact representation of what we already produced, so the model can
  // refine in multi-turn ("make titles shorter", "add one more").
  const lines = entry.tasks.map(
    (t, i) => `${i + 1}. ${t.title}${t.description ? ` — ${t.description}` : ''} (due ${t.dueDate})`,
  );
  return {
    role: 'model',
    text: JSON.stringify({ note: entry.note, tasks: lines }),
  };
}

export function AiChatProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [inserting, setInserting] = useState(false);

  // Mirror of `entries` accessible synchronously inside callbacks — needed so
  // `insertSelected` can read the latest task list on the same click that
  // toggled it (React batches state updates and useState's `prev => ...`
  // updater runs asynchronously, which made the button only act on the
  // second click).
  const entriesRef = useRef(entries);
  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    let snapshot: ChatEntry[] = [];
    setEntries((prev) => {
      snapshot = [...prev, { id: newId(), role: 'user', content: trimmed }];
      return snapshot;
    });
    setLoading(true);
    try {
      const history = snapshot.map(serializeForHistory);
      const batch = await generateTasks(history);
      const drafts: DraftTask[] = batch.tasks.map((t) => ({
        id: newId(),
        title: t.title,
        description: t.description,
        dueDate: t.dueDate,
        selected: true,
        inserted: false,
      }));
      setEntries([
        ...snapshot,
        { id: newId(), role: 'model', note: batch.note, tasks: drafts },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      setEntries([
        ...snapshot,
        { id: newId(), role: 'model', note: `⚠️ ${msg}`, tasks: [] },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => setEntries([]), []);

  const toggleTask = useCallback((entryId: string, taskId: string) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entryId && e.role === 'model'
          ? { ...e, tasks: e.tasks.map((t) => (t.id === taskId ? { ...t, selected: !t.selected } : t)) }
          : e,
      ),
    );
  }, []);

  const updateTask = useCallback(
    (entryId: string, taskId: string, patch: Partial<Pick<DraftTask, 'title' | 'description' | 'dueDate'>>) => {
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entryId && e.role === 'model'
            ? { ...e, tasks: e.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)) }
            : e,
        ),
      );
    },
    [],
  );

  const insertSelected = useCallback(async (entryId: string) => {
    const entry = entriesRef.current.find((e) => e.id === entryId);
    if (!entry || entry.role !== 'model') return;
    const toInsert = entry.tasks.filter((t) => t.selected && !t.inserted);
    if (toInsert.length === 0) return;
    setInserting(true);
    let anySucceeded = false;
    for (const task of toInsert) {
      try {
        const res = await apiCreateTask({
          title: task.title,
          description: task.description,
          status: 'not-started',
          dueDate: task.dueDate || null,
          assignee: null,
          weeklyTargetId: null,
        });
        const ok = res.success;
        if (ok) anySucceeded = true;
        setEntries((prev) =>
          prev.map((e) =>
            e.id === entryId && e.role === 'model'
              ? {
                  ...e,
                  tasks: e.tasks.map((t) =>
                    t.id === task.id
                      ? ok
                        ? { ...t, inserted: true, insertError: undefined }
                        : { ...t, insertError: res.message || 'Insert failed.' }
                      : t,
                  ),
                }
              : e,
          ),
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Insert failed.';
        setEntries((prev) =>
          prev.map((e) =>
            e.id === entryId && e.role === 'model'
              ? {
                  ...e,
                  tasks: e.tasks.map((t) =>
                    t.id === task.id ? { ...t, insertError: msg } : t,
                  ),
                }
              : e,
          ),
        );
      }
    }
    setInserting(false);
    if (anySucceeded) {
      // Tell any open task list to refetch.
      window.dispatchEvent(new CustomEvent('tekaccess:tasks-refresh'));
    }
  }, []);

  return (
    <AiChatContext.Provider
      value={{ entries, loading, inserting, sendMessage, clear, toggleTask, updateTask, insertSelected }}
    >
      {children}
    </AiChatContext.Provider>
  );
}

export function useAiChat(): AiChatContextValue {
  const ctx = useContext(AiChatContext);
  if (!ctx) throw new Error('useAiChat must be used within AiChatProvider');
  return ctx;
}
