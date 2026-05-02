import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface ProgressProps {
  value: number;
  className?: string;
  // tone is auto-derived from value unless explicitly forced.
  tone?: 'auto' | 'success' | 'warning' | 'danger' | 'accent';
  // smaller heights for inline use; default = 1.5
  size?: 'sm' | 'md';
}

function autoTone(v: number) {
  if (v >= 80) return 'bg-emerald-500';
  if (v >= 50) return 'bg-amber-500';
  return 'bg-rose-500';
}

const TONE_CLASS = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger:  'bg-rose-500',
  accent:  'bg-accent',
} as const;

export function Progress({ value, className, tone = 'auto', size = 'sm' }: ProgressProps) {
  const safe = Math.max(0, Math.min(100, value));
  const fill = tone === 'auto' ? autoTone(safe) : TONE_CLASS[tone];
  const h = size === 'sm' ? 'h-1.5' : 'h-2.5';
  return (
    <div className={cn('w-full bg-surface rounded-full overflow-hidden', h, className)}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${safe}%` }}
        transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
        className={cn('h-full', fill)}
      />
    </div>
  );
}
