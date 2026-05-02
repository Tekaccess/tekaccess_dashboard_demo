import React, { createContext, useContext, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { cn } from '../../lib/utils';

interface DDCtx {
  open: boolean;
  setOpen: (v: boolean) => void;
}
const DDContext = createContext<DDCtx | null>(null);

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <DDContext.Provider value={{ open, setOpen }}>
      <Popover.Root open={open} onOpenChange={setOpen}>
        {children}
      </Popover.Root>
    </DDContext.Provider>
  );
}

export function DropdownMenuTrigger({
  asChild,
  children,
}: { asChild?: boolean; children: React.ReactNode }) {
  return <Popover.Trigger asChild={asChild}>{children}</Popover.Trigger>;
}

interface ContentProps {
  className?: string;
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  children: React.ReactNode;
}

export function DropdownMenuContent({ className, align = 'end', sideOffset = 6, children }: ContentProps) {
  return (
    <Popover.Portal>
      <Popover.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-50 min-w-[10rem] rounded-lg border border-border bg-card p-1 shadow-xl',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          className,
        )}
      >
        {children}
      </Popover.Content>
    </Popover.Portal>
  );
}

interface ItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  destructive?: boolean;
  inset?: boolean;
}

export function DropdownMenuItem({ destructive, disabled, className, children, onClick, ...rest }: ItemProps) {
  const ctx = useContext(DDContext);
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={(e) => {
        if (disabled) return;
        onClick?.(e);
        ctx?.setOpen(false);
      }}
      {...rest}
      className={cn(
        'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-left outline-none transition-colors',
        'hover:bg-surface focus:bg-surface',
        destructive ? 'text-rose-400 hover:bg-rose-500/10 hover:text-rose-300' : 'text-t1',
        disabled && 'opacity-40 cursor-not-allowed hover:bg-transparent',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return <div className={cn('h-px bg-border my-1', className)} />;
}

export function DropdownMenuLabel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('px-2.5 py-1 text-[10px] font-bold text-t3 uppercase tracking-widest', className)}>
      {children}
    </div>
  );
}
