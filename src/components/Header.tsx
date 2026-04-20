import React from 'react';
import { MagnifyingGlass, Bell, List, Sun, Moon, UserCircle, SignOut, Key } from '@phosphor-icons/react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '@tanstack/react-router';
import { motion, AnimatePresence } from 'motion/react';

interface HeaderProps {
  onMenuClick?: () => void;
  pageTitle?: string;
}

export default function Header({ onMenuClick, pageTitle = 'Dashboard' }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate({ to: '/login' });
  };

  const handleResetPassword = () => {
    navigate({ to: '/forgot-password' });
    setIsProfileOpen(false);
  };

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
        <div className="relative hidden md:block">
          <MagnifyingGlass size={14} weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 text-t3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search..."
            className="w-44 pl-8 pr-3 py-[8px] border border-[var(--border)] rounded-lg bg-surface placeholder-[var(--text-3)] text-t1 text-xs focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
          />
        </div>

        <button
          onClick={toggleTheme}
          className="p-1.5 text-t3 hover:text-t1 border border-[var(--border)] rounded-lg bg-card transition-colors"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={18} weight="duotone" /> : <Moon size={18} weight="duotone" />}
        </button>

        <button className="relative p-1.5 text-t3 hover:text-t1 border border-[var(--border)] rounded-lg bg-card transition-colors">
          <Bell size={18} weight="duotone" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-accent rounded-full ring-1 ring-card" />
        </button>

        {/* User Profile Dropdown */}
        <div className="relative ml-2">
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 p-1 border border-[var(--border)] rounded-full bg-surface hover:bg-[var(--accent-glow)] transition-all overflow-hidden"
          >
            <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-white text-[10px] font-bold">
              {user?.fullName?.[0].toUpperCase() || 'U'}
            </div>
            <span className="text-xs font-medium text-t1 pr-2 hidden lg:block">{user?.fullName}</span>
          </button>

          <AnimatePresence>
            {isProfileOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsProfileOpen(false)} 
                />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-48 bg-card border border-[var(--border)] rounded-xl shadow-xl overflow-hidden z-50 py-1"
                >
                  <div className="px-4 py-2 border-b border-[var(--border)]">
                    <p className="text-[10px] text-t3 uppercase tracking-widest font-bold">Signed in as</p>
                    <p className="text-xs font-semibold text-t1 truncate">{user?.email}</p>
                  </div>
                  
                  <button 
                    onClick={handleResetPassword}
                    className="w-full flex items-center gap-3 px-4 py-2 text-xs text-t2 hover:bg-surface hover:text-t1 transition-colors"
                  >
                    <Key size={16} weight="regular" />
                    Reset Password
                  </button>
                  
                  <div className="border-t border-[var(--border)] mt-1 pt-1">
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2 text-xs text-red-500 hover:bg-red-500/10 transition-colors"
                    >
                      <SignOut size={16} weight="regular" />
                      Sign Out
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
