import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { CircleNotch, Trash, Warning, SignOut } from '@phosphor-icons/react';
import { cn } from '../../lib/utils';

/**
 * Centered confirmation popup. Matches the logout dialog in Header.tsx —
 * use it for every destructive action (delete, sign out, irreversible
 * status changes) so the app feels uniform.
 *
 * Open behaviour:
 *   <ConfirmDialog
 *     open={confirmOpen}
 *     onOpenChange={setConfirmOpen}
 *     onConfirm={handleDelete}
 *     tone="danger"
 *     icon="trash"
 *     title="Delete contract?"
 *     message="This will permanently remove the contract and any attached file."
 *     confirmLabel="Delete"
 *     busy={deleting}
 *   />
 *
 * - Backdrop click cancels (unless `busy`).
 * - Escape cancels (unless `busy`).
 * - Confirm button shows a spinner while `busy` is true.
 */

type Tone = 'danger' | 'warning' | 'default';
type IconKey = 'trash' | 'warning' | 'sign-out' | 'none';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: Tone;
  icon?: IconKey;
  busy?: boolean;
}

const TONE_BUTTON: Record<Tone, string> = {
  danger:  'bg-red-500 hover:bg-red-600 text-white',
  warning: 'bg-amber-500 hover:bg-amber-600 text-white',
  default: 'bg-accent hover:bg-accent-h text-white',
};

const TONE_ICON_BG: Record<Tone, string> = {
  danger:  'bg-red-100 dark:bg-red-500/15 text-red-500',
  warning: 'bg-amber-100 dark:bg-amber-500/15 text-amber-500',
  default: 'bg-accent-glow text-accent',
};

function IconFor({ kind, tone }: { kind: IconKey; tone: Tone }) {
  if (kind === 'none') return null;
  const Cmp =
    kind === 'trash'    ? Trash :
    kind === 'sign-out' ? SignOut :
                          Warning;
  return (
    <div className={cn('w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4', TONE_ICON_BG[tone])}>
      <Cmp size={22} weight="duotone" />
    </div>
  );
}

export function ConfirmDialog({
  open, onOpenChange, onConfirm,
  title, message,
  confirmLabel = 'Confirm',
  cancelLabel  = 'Cancel',
  tone = 'default',
  icon = 'warning',
  busy = false,
}: ConfirmDialogProps) {
  // Escape cancels unless we're mid-operation.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onOpenChange]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="confirm-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50"
            onClick={() => !busy && onOpenChange(false)}
          />
          <motion.div
            key="confirm-dialog"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.18 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-xs px-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 text-center">
              <IconFor kind={icon} tone={tone} />
              <h2 className="text-base font-bold text-t1 mb-1">{title}</h2>
              {message && (
                <div className="text-xs text-t3 mb-5">{message}</div>
              )}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => onConfirm()}
                  disabled={busy}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-75',
                    TONE_BUTTON[tone],
                  )}
                >
                  {busy ? (
                    <><CircleNotch size={18} weight="bold" className="animate-spin" /> Working…</>
                  ) : (
                    confirmLabel
                  )}
                </button>
                <button
                  onClick={() => onOpenChange(false)}
                  disabled={busy}
                  className="flex-1 py-2.5 border border-border text-t1 hover:bg-surface rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {cancelLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
