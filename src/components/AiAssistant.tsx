import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUp, CircleNotch, Trash, Check, CheckCircle, WarningCircle } from '@phosphor-icons/react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import { getAvatar } from '../lib/avatars';
import { useAiChat, type ChatEntry, type DraftTask } from '../contexts/AiChatContext';
import {
  MEMORY_LIMIT_TOKENS,
  estimateConversationTokens,
  type ChatHistoryEntry,
} from '../lib/gemini';

interface AiAssistantProps {
  avatarId?: string;
}

function MemoryRing({ percent }: { percent: number }) {
  const size = 18;
  const stroke = 2.5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, percent));
  const offset = circumference * (1 - clamped / 100);
  return (
    <svg width={size} height={size} className="shrink-0" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-border" />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="currentColor" strokeWidth={stroke}
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="text-accent transition-[stroke-dashoffset] duration-300"
      />
    </svg>
  );
}

function AutoTextarea({
  value,
  onChange,
  disabled,
  className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      rows={1}
      className={`block w-full resize-none overflow-hidden ${className}`}
    />
  );
}

function DraftTaskRow({
  entryId,
  task,
  onToggle,
  onUpdate,
  disabled,
}: {
  entryId: string;
  task: DraftTask;
  onToggle: (entryId: string, taskId: string) => void;
  onUpdate: (entryId: string, taskId: string, patch: Partial<Pick<DraftTask, 'title' | 'description' | 'dueDate'>>) => void;
  disabled: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-2.5 py-2 transition-colors ${
        task.inserted
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : task.insertError
            ? 'border-red-500/30 bg-red-500/5'
            : task.selected
              ? 'border-accent-border bg-accent-glow/40'
              : 'border-border bg-card'
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => onToggle(entryId, task.id)}
          disabled={task.inserted || disabled}
          aria-label={task.selected ? 'Deselect' : 'Select'}
          className={`mt-0.5 w-4 h-4 shrink-0 rounded border flex items-center justify-center transition-colors ${
            task.inserted
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : task.selected
                ? 'border-accent bg-accent text-white'
                : 'border-border bg-card hover:border-accent'
          } disabled:cursor-not-allowed`}
        >
          {(task.selected || task.inserted) && <Check size={11} weight="bold" />}
        </button>
        <div className="flex-1 min-w-0">
          <AutoTextarea
            value={task.title}
            disabled={task.inserted || disabled}
            onChange={(v) => onUpdate(entryId, task.id, { title: v })}
            className="bg-transparent text-sm font-medium text-t1 leading-snug focus:outline-none focus:ring-1 focus:ring-accent/40 rounded px-1 -mx-1 disabled:opacity-70"
          />
          {task.description && (
            <AutoTextarea
              value={task.description}
              disabled={task.inserted || disabled}
              onChange={(v) => onUpdate(entryId, task.id, { description: v })}
              className="bg-transparent text-xs text-t3 leading-snug focus:outline-none focus:ring-1 focus:ring-accent/40 rounded px-1 -mx-1 mt-0.5 disabled:opacity-70"
            />
          )}
          {(task.inserted || task.insertError) && (
            <div className="flex items-center gap-2 mt-1">
              {task.inserted && (
                <span className="text-[10px] text-emerald-500 font-medium flex items-center gap-1">
                  <CheckCircle size={11} weight="fill" /> Added
                </span>
              )}
              {task.insertError && (
                <span className="text-[10px] text-red-500 font-medium flex items-center gap-1" title={task.insertError}>
                  <WarningCircle size={11} weight="fill" /> Failed
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ModelEntryView({
  entry,
}: {
  entry: Extract<ChatEntry, { role: 'model' }>;
}) {
  const { toggleTask, updateTask, insertSelected, inserting } = useAiChat();
  const selectedCount = entry.tasks.filter((t) => t.selected && !t.inserted).length;
  const insertedCount = entry.tasks.filter((t) => t.inserted).length;
  const allInserted = entry.tasks.length > 0 && insertedCount === entry.tasks.length;

  return (
    <div className="flex flex-col gap-2">
      {entry.note && (
        <div className="bg-surface text-t1 px-3 py-2 rounded-2xl rounded-bl-md text-sm break-words">
          {entry.note}
        </div>
      )}
      {entry.tasks.length > 0 && (
        <>
          <div className="space-y-1.5">
            {entry.tasks.map((t) => (
              <DraftTaskRow
                key={t.id}
                entryId={entry.id}
                task={t}
                onToggle={toggleTask}
                onUpdate={updateTask}
                disabled={inserting}
              />
            ))}
          </div>
          {!allInserted && (
            <button
              type="button"
              onClick={() => insertSelected(entry.id)}
              disabled={selectedCount === 0 || inserting}
              className="self-start mt-1 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent-h transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {inserting
                ? <CircleNotch size={12} weight="bold" className="animate-spin" />
                : <Check size={12} weight="bold" />}
              Add {selectedCount} {selectedCount === 1 ? 'task' : 'tasks'}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default function AiAssistant({ avatarId = 'default' }: AiAssistantProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const { entries, loading, sendMessage, clear } = useAiChat();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Re-measure the textarea after every prompt change so it grows / shrinks
  // with content, capped at MAX_INPUT_HEIGHT.
  const MAX_INPUT_HEIGHT = 140;
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_HEIGHT)}px`;
  }, [prompt]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const avatar = getAvatar(avatarId);

  const tokensUsed = useMemo(() => {
    return estimateConversationTokens(
      entries.map((e): ChatHistoryEntry =>
        e.role === 'user'
          ? { role: 'user', text: e.content }
          : {
              role: 'model',
              text: e.note + ' ' + e.tasks.map((t) => t.title + ' ' + t.description).join(' '),
            },
      ),
    );
  }, [entries]);
  const memoryPercent = (tokensUsed / MEMORY_LIMIT_TOKENS) * 100;

  // Close on Escape, focus the input when the popup opens.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    const t = window.setTimeout(() => inputRef.current?.focus(), 200);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(t);
    };
  }, [open]);

  // Auto-scroll to the latest entry / loader.
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [entries, loading]);

  const send = () => {
    const text = prompt.trim();
    if (!text || loading) return;
    setPrompt('');
    void sendMessage(text);
  };

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return createPortal(
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close TekAccess AI' : 'Open TekAccess AI'}
        className="fixed bottom-6 right-6 z-50 group flex items-center justify-center w-14 h-14 transition-transform hover:scale-105 active:scale-95"
      >
        <img
          src={avatar.src}
          alt={avatar.name}
          className="relative w-14 h-14 rounded-full object-cover shadow-lg"
          draggable={false}
        />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

            <motion.div
              key="ai-popup"
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="fixed bottom-24 right-6 z-40 w-[340px] sm:w-[380px] bg-card border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]"
            >
              {entries.length > 0 && (
                <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                  <div
                    className="flex items-center gap-2"
                    title={`Session memory: ${tokensUsed.toLocaleString()} / ${MEMORY_LIMIT_TOKENS.toLocaleString()} tokens (${Math.round(memoryPercent)}%)`}
                  >
                    <span className="text-sm font-semibold text-t1">{avatar.name}</span>
                    <MemoryRing percent={memoryPercent} />
                  </div>
                  <button
                    type="button"
                    onClick={clear}
                    disabled={loading}
                    aria-label="Clear chat"
                    className="flex items-center gap-1 text-sm font-medium cursor-pointer text-t3 hover:text-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Trash size={16} weight="bold" />
                    Clear
                  </button>
                </div>
              )}

              {entries.length === 0 ? (
                <div className="px-6 pt-6 pb-10 shrink-0">
                  <p className="text-sm font-semibold text-t1 mb-1">{avatar.name}</p>
                  <p className="text-sm text-t2 leading-relaxed">
                    I will help you create tasks faster, Tell me what you'll work on and a date.
                  </p>
                </div>
              ) : (
                <OverlayScrollbarsComponent
                  className="flex-1 min-h-0"
                  options={{ scrollbars: { autoHide: 'leave' } }}
                  defer
                >
                  <div ref={scrollRef} className="px-4 py-4 space-y-3">
                    {entries.map((entry) =>
                      entry.role === 'user' ? (
                        <div key={entry.id} className="flex justify-end">
                          <div className="bg-accent text-white px-3 py-2 rounded-2xl rounded-br-md max-w-[85%] text-sm break-words whitespace-pre-wrap">
                            {entry.content}
                          </div>
                        </div>
                      ) : (
                        <div key={entry.id} className="max-w-[92%]">
                          <ModelEntryView entry={entry} />
                        </div>
                      ),
                    )}
                    {loading && (
                      <div className="flex justify-start">
                        <div className="bg-surface text-t3 px-3 py-2 rounded-2xl rounded-bl-md text-sm flex items-center gap-2">
                          <CircleNotch size={14} weight="bold" className="animate-spin" />
                          Generating…
                        </div>
                      </div>
                    )}
                  </div>
                </OverlayScrollbarsComponent>
              )}

              <div className="px-3 pb-1.5 shrink-0">
                <div className="bg-surface/60 border border-border rounded-2xl px-3 pt-2.5 pb-2">
                  <textarea
                    ref={inputRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={onInputKeyDown}
                    placeholder="Tell me what to plan…"
                    disabled={loading}
                    rows={1}
                    style={{ maxHeight: MAX_INPUT_HEIGHT }}
                    className="w-full bg-transparent text-sm text-t1 placeholder-t3 focus:outline-none disabled:opacity-60 resize-none overflow-y-auto leading-snug"
                  />
                  <div className="flex items-center justify-end mt-2">
                    <button
                      type="button"
                      aria-label="Send"
                      onClick={send}
                      disabled={!prompt.trim() || loading}
                      className="w-8 h-8 rounded-full bg-accent text-white hover:bg-accent-h transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading
                        ? <CircleNotch size={14} weight="bold" className="animate-spin" />
                        : <ArrowUp size={14} weight="bold" />}
                    </button>
                  </div>
                </div>
              </div>
              <p className='px-4 pb-1.5 text-t3 text-xs text-center'>Be very cautious of what you text here.</p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>,
    document.body,
  );
}
