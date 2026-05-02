import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { XIcon } from '@phosphor-icons/react';
import { cn } from '../../lib/utils';

type Side = 'right' | 'left' | 'top' | 'bottom';

interface SheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  side?: Side;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  children: React.ReactNode;
}

const SIZE_CLASS_X: Record<NonNullable<SheetProps['size']>, string> = {
  sm:  'w-full max-w-sm',
  md:  'w-full max-w-md',
  lg:  'w-full max-w-lg',
  xl:  'w-full max-w-xl',
  '2xl': 'w-full max-w-2xl',
};

const SIDE_CLASS: Record<Side, string> = {
  right:  'inset-y-0 right-0 border-l',
  left:   'inset-y-0 left-0 border-r',
  top:    'inset-x-0 top-0 border-b',
  bottom: 'inset-x-0 bottom-0 border-t',
};

const SLIDE_INIT: Record<Side, any> = {
  right:  { x: 40, opacity: 0 },
  left:   { x: -40, opacity: 0 },
  top:    { y: -40, opacity: 0 },
  bottom: { y: 40, opacity: 0 },
};
const SLIDE_REST = { x: 0, y: 0, opacity: 1 };

export function Sheet({ open, onOpenChange, side = 'right', size = '2xl', children }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            initial={SLIDE_INIT[side]}
            animate={SLIDE_REST}
            exit={SLIDE_INIT[side]}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'fixed bg-card border-border h-full flex flex-col shadow-2xl',
              SIDE_CLASS[side],
              side === 'right' || side === 'left' ? SIZE_CLASS_X[size] : 'w-full',
            )}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function SheetHeader({
  title, subtitle, onClose, leading, className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose?: () => void;
  leading?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between gap-3 px-5 h-14 border-b border-border shrink-0', className)}>
      <div className="flex items-center gap-3 min-w-0">
        {leading}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-t1 truncate">{title}</h2>
          {subtitle && <p className="text-[11px] text-t3 truncate">{subtitle}</p>}
        </div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="h-7 w-7 rounded-md hover:bg-surface text-t3 hover:text-t1 flex items-center justify-center"
          aria-label="Close"
        >
          <XIcon size={14} weight="bold" />
        </button>
      )}
    </div>
  );
}

export function SheetBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('flex-1 overflow-y-auto px-5 py-4', className)}>{children}</div>;
}

export function SheetFooter({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('px-5 py-3 border-t border-border shrink-0 flex items-center justify-end gap-2', className)}>{children}</div>;
}
