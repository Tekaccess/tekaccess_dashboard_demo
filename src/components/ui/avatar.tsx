import React from 'react';
import { cn } from '../../lib/utils';

interface AvatarProps {
  name?: string;
  url?: string | null;
  size?: number;
  className?: string;
  title?: string;
}

const SIZE_CLASS: Record<number, string> = {
  5: 'h-5 w-5 text-[9px]',
  6: 'h-6 w-6 text-[10px]',
  7: 'h-7 w-7 text-[11px]',
  8: 'h-8 w-8 text-xs',
  9: 'h-9 w-9 text-sm',
  10: 'h-10 w-10 text-sm',
  11: 'h-11 w-11 text-base',
  12: 'h-12 w-12 text-base',
};

export function Avatar({ name = '?', url, size = 8, className, title }: AvatarProps) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';
  const cls = SIZE_CLASS[size] || SIZE_CLASS[8];

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        title={title || name}
        className={cn(cls, 'rounded-full object-cover ring-1 ring-border', className)}
      />
    );
  }
  return (
    <div
      title={title || name}
      className={cn(
        cls,
        'rounded-full bg-accent-glow text-accent font-bold flex items-center justify-center ring-1 ring-border',
        className,
      )}
    >
      {initials}
    </div>
  );
}

interface AvatarGroupProps {
  members: { _id: string; fullName: string; avatarUrl: string | null }[];
  max?: number;
  size?: number;
  className?: string;
}

export function AvatarGroup({ members, max = 4, size = 6, className }: AvatarGroupProps) {
  const visible = members.slice(0, max);
  const overflow = members.length - visible.length;
  return (
    <div className={cn('flex -space-x-1.5', className)}>
      {visible.map((m) => (
        <Avatar key={m._id} name={m.fullName} url={m.avatarUrl} size={size} className="ring-2 ring-card" />
      ))}
      {overflow > 0 && (
        <div
          className={cn(
            SIZE_CLASS[size] || SIZE_CLASS[6],
            'rounded-full bg-surface text-t2 font-bold flex items-center justify-center ring-2 ring-card',
          )}
          title={`+${overflow} more`}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
