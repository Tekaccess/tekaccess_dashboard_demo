import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'motion/react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import {
  SparkleIcon,
  XIcon,
  PaperPlaneRightIcon,
  ArrowClockwiseIcon,
} from '@phosphor-icons/react';
import { apiAiChat, type AiChatMessage } from '../lib/api';

const EASE = [0.32, 0.72, 0, 1] as const;

const SUGGESTIONS = [
  'Help me organize this week\'s tasks',
  'Suggest monthly goals for my team',
  'Turn this dump into structured tasks',
];

type DisplayMessage = AiChatMessage & { id: string; error?: boolean };

function makeId() {
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function pageContextLabel(pathname: string): string {
  if (pathname === '/' || pathname.startsWith('/admin_hr')) return 'Admin & HR Dashboard';
  if (pathname === '/tasks' || pathname.startsWith('/task-management')) return 'Task Management page';
  if (pathname.startsWith('/calendar')) return 'Calendar page';
  if (pathname.startsWith('/reports')) return 'Reports page';
  if (pathname.startsWith('/hr/')) return `HR section (${pathname})`;
  if (pathname.startsWith('/admin')) return 'Admin section';
  return `page: ${pathname}`;
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-accent"
          animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

export default function AIAssistant() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Autofocus input when opening.
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Auto-scroll on new messages or while streaming.
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  // Close on Escape.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: DisplayMessage = { id: makeId(), role: 'user', content: trimmed };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setLoading(true);

    try {
      const ctx = `User is currently on the ${pageContextLabel(location.pathname)}.`;
      const apiMessages: AiChatMessage[] = nextHistory.map(({ role, content }) => ({ role, content }));
      const res = await apiAiChat(apiMessages, ctx);
      if (!res.success) {
        setMessages((prev) => [...prev, {
          id: makeId(),
          role: 'assistant',
          content: res.message || 'Something went wrong.',
          error: true,
        }]);
      } else {
        setMessages((prev) => [...prev, {
          id: makeId(),
          role: 'assistant',
          content: res.data?.reply || '(no reply)',
        }]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setMessages((prev) => [...prev, { id: makeId(), role: 'assistant', content: msg, error: true }]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, location.pathname]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const reset = () => {
    if (loading) return;
    setMessages([]);
    setInput('');
    inputRef.current?.focus();
  };

  return (
    <>
      {/* Floating launcher */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            key="launcher"
            initial={{ opacity: 0, scale: 0.85, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 10 }}
            transition={{ duration: 0.2, ease: EASE }}
            onClick={() => setIsOpen(true)}
            aria-label="Open AI assistant"
            className="fixed bottom-5 right-5 z-50 h-12 w-12 rounded-full bg-accent text-white shadow-lg shadow-accent/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
          >
            <motion.span
              animate={{ rotate: [0, 8, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="inline-flex"
            >
              <SparkleIcon size={22} weight="fill" />
            </motion.span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="fixed bottom-5 right-5 z-50 w-[min(380px,calc(100vw-2.5rem))] h-[min(560px,calc(100vh-2.5rem))] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 h-12 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-accent-glow flex items-center justify-center">
                  <SparkleIcon size={16} weight="fill" className="text-accent" />
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-semibold text-t1">TekAccess Assistant</span>
                  <span className="text-[10px] text-t3">Beta · OpenRouter</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={reset}
                    disabled={loading}
                    title="New conversation"
                    className="h-7 w-7 rounded-md hover:bg-surface text-t3 hover:text-t1 transition-colors flex items-center justify-center disabled:opacity-50"
                  >
                    <ArrowClockwiseIcon size={14} weight="bold" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="h-7 w-7 rounded-md hover:bg-surface text-t3 hover:text-t1 transition-colors flex items-center justify-center"
                  aria-label="Close"
                >
                  <XIcon size={14} weight="bold" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <OverlayScrollbarsComponent
              className="flex-1 px-3 py-3"
              options={{ scrollbars: { autoHide: 'leave' } }}
              defer
            >
              <div ref={scrollRef} className="flex flex-col gap-2.5">
                {messages.length === 0 && !loading && (
                  <div className="flex flex-col items-center text-center gap-3 py-6 px-2">
                    <div className="h-10 w-10 rounded-xl bg-accent-glow flex items-center justify-center">
                      <SparkleIcon size={20} weight="fill" className="text-accent" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-t1">How can I help?</p>
                      <p className="text-xs text-t3 mt-0.5">Ask anything, or dump a list of tasks to organize.</p>
                    </div>
                    <div className="flex flex-col gap-1.5 w-full mt-1">
                      {SUGGESTIONS.map((s) => (
                        <button
                          key={s}
                          onClick={() => send(s)}
                          className="text-left text-xs text-t2 hover:text-t1 bg-surface hover:bg-accent-glow border border-border rounded-lg px-3 py-2 transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, ease: EASE }}
                    className={m.role === 'user' ? 'self-end max-w-[85%]' : 'self-start max-w-[90%]'}
                  >
                    <div
                      className={
                        m.role === 'user'
                          ? 'bg-accent text-white text-sm rounded-2xl rounded-br-md px-3 py-2 whitespace-pre-wrap break-words'
                          : m.error
                            ? 'bg-surface border border-border text-sm text-red-400 rounded-2xl rounded-bl-md px-3 py-2 whitespace-pre-wrap break-words'
                            : 'bg-surface text-t1 text-sm rounded-2xl rounded-bl-md px-3 py-2 whitespace-pre-wrap break-words'
                      }
                    >
                      {m.content}
                    </div>
                  </motion.div>
                ))}

                {loading && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, ease: EASE }}
                    className="self-start max-w-[80%]"
                  >
                    <div className="bg-surface rounded-2xl rounded-bl-md px-3 py-2">
                      <TypingDots />
                    </div>
                  </motion.div>
                )}
              </div>
            </OverlayScrollbarsComponent>

            {/* Composer */}
            <form
              onSubmit={handleSubmit}
              className="border-t border-border p-2.5 shrink-0 bg-card"
            >
              <div className="flex items-end gap-2 bg-surface rounded-xl border border-border focus-within:border-accent transition-colors p-1.5">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything…"
                  rows={1}
                  className="flex-1 bg-transparent resize-none text-sm text-t1 placeholder:text-t3 px-2 py-1.5 max-h-32 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="h-8 w-8 rounded-lg bg-accent text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent/90 active:scale-95 transition-all shrink-0"
                  aria-label="Send"
                >
                  <PaperPlaneRightIcon size={14} weight="fill" />
                </button>
              </div>
              <p className="text-[10px] text-t3 mt-1 px-1">Enter to send · Shift+Enter for newline</p>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
