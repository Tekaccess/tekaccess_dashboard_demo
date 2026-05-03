import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUp } from '@phosphor-icons/react';
import { getAvatar } from '../lib/avatars';

interface AiAssistantProps {
  avatarId?: string;
}

export default function AiAssistant({ avatarId = 'default' }: AiAssistantProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const avatar = getAvatar(avatarId);

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

  return createPortal(
    <>
      {/* Floating avatar bubble — stays in place whether popup is open or not */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}
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
            {/* Click-outside catcher — sits below the bubble (z-40) so the bubble stays clickable */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

            <motion.div
              key="ai-popup"
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="fixed bottom-24 right-6 z-40 w-[340px] sm:w-[380px] bg-card border border-border rounded-3xl shadow-2xl overflow-hidden"
            >
              {/* Greeting */}
              <div className="px-6 pt-6 pb-4">
                <p className="text-sm text-t2 leading-relaxed">{avatar.greeting}</p>
              </div>

              {/* Input bar */}
              <div className="px-3 pb-3">
                <div className="bg-surface/60 border border-border rounded-2xl px-3 pt-2.5 pb-2">
                  <input
                    ref={inputRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ask anything about your tasks…"
                    className="w-full bg-transparent text-sm text-t1 placeholder-t3 focus:outline-none"
                  />
                  <div className="flex items-center justify-end mt-2">
                    <button
                      type="button"
                      aria-label="Send"
                      disabled={!prompt.trim()}
                      className="w-8 h-8 rounded-full bg-accent text-white hover:bg-accent-h transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ArrowUp size={14} weight="bold" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>,
    document.body,
  );
}
