import React from 'react';
import { MagnifyingGlass, Bell, List, Sun, Moon, CalendarBlank, UserCircle, Plus } from '@phosphor-icons/react';
import { useTheme } from '../contexts/ThemeContext';

interface HeaderProps {
  onMenuClick?: () => void;
  pageTitle?: string;
}

export default function Header({ onMenuClick, pageTitle = 'Dashboard' }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="h-14 bg-card border-b border-[var(--border)] flex items-center justify-between px-4 sm:px-6 shrink-0 gap-4">
      {/* Left: hamburger + page title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="p-1.5 text-t3 hover:text-t1 lg:hidden transition-colors shrink-0"
        >
          <List size={20} weight="bold" />
        </button>
        <h1 className="text-sm font-semibold text-t1 truncate">{pageTitle}</h1>
      </div>

      {/* Right: controls */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Search — desktop */}
        <div className="relative hidden md:block">
          <MagnifyingGlass size={14} weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 text-t3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search..."
            className="w-44 pl-8 pr-3 py-[8px] border border-[var(--border)] rounded-lg bg-surface placeholder-[var(--text-3)] text-t1 text-xs focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
          />
        </div>
        
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 text-t3 hover:text-t1 border border-[var(--border)] rounded-lg bg-card transition-colors"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark'
            ? <Sun size={18} weight="duotone" />
            : <Moon size={18} weight="duotone" />
          }
        </button>

        {/* Notifications */}
        <button className="relative p-1.5 text-t3 hover:text-t1 border border-[var(--border)] rounded-lg bg-card transition-colors">
          <Bell size={18} weight="duotone" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-accent rounded-full ring-1 ring-card" />
        </button>

        {/* User avatar */}
        <button className="p-1.5 text-t3 hover:text-t1 border border-[var(--border)] rounded-lg bg-card transition-colors hidden sm:block">
          <UserCircle size={18} weight="duotone" />
        </button>

      </div>
    </header>
  );
}
