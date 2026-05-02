import React from 'react';
import { cn } from '../../lib/utils';

type Variant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'muted'
  | 'outline'
  | 'accent';

const VARIANTS: Record<Variant, string> = {
  default: 'bg-surface text-t1 border-border',
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  danger:  'bg-rose-500/10 text-rose-400 border-rose-500/20',
  info:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
  muted:   'bg-surface text-t3 border-border',
  outline: 'bg-transparent text-t2 border-border',
  accent:  'bg-accent-glow text-accent border-accent/30',
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

export function Badge({ variant = 'default', className, children, ...rest }: BadgeProps) {
  return (
    <span
      {...rest}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border whitespace-nowrap',
        VARIANTS[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
