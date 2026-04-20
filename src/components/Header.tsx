import React, { useState } from 'react';
import { MagnifyingGlass, Bell, List, Sun, Moon, SignOut, Key, Gear, KeyIcon, GearFineIcon, GearIcon, PencilSimpleIcon, X, CheckIcon, Buildings, ShieldCheck } from '@phosphor-icons/react';
import { Eye, EyeSlash, CircleNotch, CheckCircle } from '@phosphor-icons/react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '@tanstack/react-router';
import { motion, AnimatePresence } from 'motion/react';
import { apiChangePassword } from '../lib/api';

const SLUG_LABELS: Record<string, string> = {
  executive: 'Executive',
  finance: 'Finance',
  transport: 'Transport',
  operations: 'Operations',
  inventory: 'Inventory',
  procurement_trading: 'Procurement — Trading',
  procurement_fleet: 'Procurement — Fleet',
  data_entry: 'Data Entry',
};

interface HeaderProps {
  onMenuClick?: () => void;
  pageTitle?: string;
}

type ModalState = 'idle' | 'open' | 'success';

export default function Header({ onMenuClick, pageTitle = 'Dashboard' }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout, updateName } = useAuth();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Change-password modal state
  const [modalState, setModalState] = useState<ModalState>('idle');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Settings modal state
  const [showSettings, setShowSettings] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [nameEditing, setNameEditing] = useState(false);
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState('');
  const [nameSaved, setNameSaved] = useState(false);

  const openSettings = () => {
    setIsProfileOpen(false);
    setNameValue(user?.fullName ?? '');
    setNameEditing(false);
    setNameError('');
    setNameSaved(false);
    setShowSettings(true);
  };

  const handleSaveName = async () => {
    if (!nameValue.trim() || nameValue.trim() === user?.fullName) {
      setNameEditing(false);
      return;
    }
    setNameSaving(true);
    setNameError('');
    const err = await updateName(nameValue.trim());
    setNameSaving(false);
    if (err) {
      setNameError(err);
    } else {
      setNameEditing(false);
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 3000);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    navigate({ to: '/login' });
  };

  const openChangePassword = () => {
    setIsProfileOpen(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setModalState('open');
  };

  const closeModal = () => {
    setModalState('idle');
    setError('');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiChangePassword(currentPassword, newPassword);
      if (!res.success) {
        setError(
          res.errors?.[0]?.message || res.message || 'Failed to change password.'
        );
      } else {
        setModalState('success');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <header className="h-14 bg-card border-b border-[var(--border)] flex items-center justify-between px-4 sm:px-6 shrink-0 gap-4">
        {/* Left */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onMenuClick}
            className="p-1.5 text-t3 hover:text-t1 lg:hidden transition-colors shrink-0"
          >
            <List size={20} weight="bold" />
          </button>
          <h1 className="text-sm font-semibold text-t1 truncate">{pageTitle}</h1>
        </div>

        {/* Right */}
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

          {/* Profile dropdown */}
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
                  <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-60 bg-card border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden z-50"
                  >
                    {/* User identity */}
                    <div className="p-3 flex items-start gap-3 border-b border-[var(--border)]">
                      <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {user?.fullName?.[0].toUpperCase() || 'U'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-t1 truncate">{user?.fullName}</p>
                        <p className="text-xs text-t3 truncate">{user?.email}</p>
                        <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded-md bg-[var(--accent-glow)] text-accent text-[9px] font-bold uppercase tracking-wide">
                          {user?.role?.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="p-1.5 space-y-0.5">
                      <button
                        onClick={openChangePassword}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-t2 hover:bg-surface hover:text-t1 rounded-lg transition-colors"
                      >
                        <KeyIcon size={18} weight="regular" className="text-t3" />
                        Change Password
                      </button>
                      <button
                        onClick={openSettings}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-t2 hover:bg-surface hover:text-t1 rounded-lg transition-colors"
                      >
                        <GearIcon size={18} weight="regular" className="text-t3" />
                        Settings
                      </button>
                    </div>

                    {/* Sign out */}
                    <div className="p-1.5 border-t border-[var(--border)]">
                      <button
                        onClick={() => { setIsProfileOpen(false); setShowLogoutConfirm(true); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <SignOut size={18} weight="regular" />
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

      {/* Change Password Modal */}
      <AnimatePresence>
        {modalState !== 'idle' && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50"
              onClick={closeModal}
            />

            {/* Dialog */}
            <motion.div
              key="dialog"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.18 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm px-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-card border border-[var(--border)] rounded-2xl shadow-2xl p-6">

                {modalState === 'success' ? (
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle size={24} weight="duotone" className="text-green-500" />
                    </div>
                    <h2 className="text-base font-bold text-[var(--text-1)] mb-1">Password Updated</h2>
                    <p className="text-sm text-[var(--text-3)] mb-10">
                      Your password has been changed. Other active sessions have been signed out.
                    </p>
                    <button
                      onClick={closeModal}
                      className="w-full py-2.5 bg-indigo-400 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="text-base font-bold text-[var(--text-1)]">Change Password</h2>
                      <button
                        onClick={closeModal}
                        className="text-[var(--text-3)] hover:text-[var(--text-1)] text-lg leading-none transition-colors"
                      >
                        ×
                      </button>
                    </div>

                    <form onSubmit={handleChangePassword} className="space-y-3">
                      {/* Current password */}
                      <div className="relative">
                        <input
                          type={showCurrent ? 'text' : 'password'}
                          required
                          autoFocus
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Current password"
                          className="w-full px-4 py-2.5 pr-10 rounded-xl border border-gray-200 dark:border-white/10 bg-[var(--card-bg)] text-[var(--text-1)] placeholder-[var(--text-3)] focus:outline-none focus:ring-2 focus:ring-indigo-300/50 dark:focus:ring-indigo-500/30 transition-all text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrent(!showCurrent)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors"
                        >
                          {showCurrent ? <EyeSlash size={20} weight="duotone" /> : <Eye size={20} weight="duotone" />}
                        </button>
                      </div>

                      {/* New password */}
                      <div className="relative">
                        <input
                          type={showNew ? 'text' : 'password'}
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="New password"
                          className="w-full px-4 py-2.5 pr-10 rounded-xl border border-gray-200 dark:border-white/10 bg-[var(--card-bg)] text-[var(--text-1)] placeholder-[var(--text-3)] focus:outline-none focus:ring-2 focus:ring-indigo-300/50 dark:focus:ring-indigo-500/30 transition-all text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNew(!showNew)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors"
                        >
                          {showNew ? <EyeSlash size={20} weight="duotone" /> : <Eye size={20} weight="duotone" />}
                        </button>
                      </div>

                      {/* Confirm new password */}
                      <input
                        type={showNew ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-[var(--card-bg)] text-[var(--text-1)] placeholder-[var(--text-3)] focus:outline-none focus:ring-2 focus:ring-indigo-300/50 dark:focus:ring-indigo-500/30 transition-all text-sm"
                      />

                      <p className="text-xs text-[var(--text-3)] mb-3">
                        Min. 8 characters · one uppercase · one number
                      </p>

                      {error && <p className="text-xs text-red-500">{error}</p>}

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-2.5 bg-indigo-400 hover:bg-indigo-500 disabled:opacity-75 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? (
                          <><CircleNotch size={18} weight="bold" className="animate-spin" /> Saving…</>
                        ) : (
                          'Update Password'
                        )}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div
              key="settings-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              onClick={() => setShowSettings(false)}
            />
            <motion.div
              key="settings-dialog"
              initial={{ opacity: 0, scale: 0.97, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 12 }}
              transition={{ duration: 0.2 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-xl px-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-card border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
                  <h2 className="text-base font-bold text-t1">Account Settings</h2>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="p-1.5 rounded-lg text-t3 hover:text-t1 hover:bg-surface transition-colors"
                  >
                    <X size={18} weight="bold" />
                  </button>
                </div>

                <div className="p-6 space-y-6">

                  {/* Avatar + identity */}
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center text-white text-2xl font-bold shrink-0">
                      {(nameEditing ? nameValue : user?.fullName)?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <p className="text-base font-bold text-t1">{user?.fullName}</p>
                      <p className="text-xs text-t3">{user?.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-[var(--accent-glow)] text-accent text-[10px] font-bold uppercase tracking-wide">
                        {user?.role?.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-[var(--border)]" />

                  {/* Name field */}
                  <div>
                    <label className="text-xs font-semibold text-t3 uppercase tracking-widest block mb-2">
                      Display Name
                    </label>
                    <div className="flex items-center gap-2">
                      {nameEditing ? (
                        <>
                          <input
                            autoFocus
                            value={nameValue}
                            onChange={(e) => setNameValue(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setNameEditing(false); }}
                            className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-surface text-sm text-t1 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                          />
                          <button
                            onClick={handleSaveName}
                            disabled={nameSaving}
                            className="px-3 py-2 bg-accent hover:bg-[var(--accent-h)] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-60"
                          >
                            {nameSaving
                              ? <CircleNotch size={14} weight="bold" className="animate-spin" />
                              : <CheckIcon size={14} weight="bold" />}
                            Save
                          </button>
                          <button
                            onClick={() => { setNameEditing(false); setNameError(''); }}
                            className="px-3 py-2 border border-[var(--border)] text-t2 hover:bg-surface text-xs font-medium rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 px-3 py-2 rounded-lg bg-surface text-sm text-t1 border border-transparent">
                            {user?.fullName}
                          </span>
                          <button
                            onClick={() => { setNameValue(user?.fullName ?? ''); setNameEditing(true); setNameSaved(false); }}
                            className="px-3 py-2 border border-[var(--border)] text-t2 hover:bg-surface hover:text-t1 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
                          >
                            <PencilSimpleIcon size={13} weight="bold" />
                            Edit
                          </button>
                        </>
                      )}
                    </div>
                    {nameError && <p className="text-xs text-red-500 mt-1.5">{nameError}</p>}
                    {nameSaved && (
                      <p className="text-xs text-green-500 mt-1.5 flex items-center gap-1">
                        <CheckCircle size={12} weight="fill" /> Name updated successfully
                      </p>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="border-t border-[var(--border)]" />

                  {/* Dashboard access */}
                  <div>
                    <label className="text-xs font-semibold text-t3 uppercase tracking-widest block mb-3">
                      Dashboard Access
                    </label>
                    {user?.role === 'super_admin' ? (
                      <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[var(--accent-glow)] border border-[var(--accent-border)]">
                        <ShieldCheck size={18} weight="duotone" className="text-accent shrink-0" />
                        <p className="text-xs font-medium text-accent">Full access to all dashboards</p>
                      </div>
                    ) : user?.dashboardAccess && user.dashboardAccess.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {user.dashboardAccess.map((slug) => (
                          <div
                            key={slug}
                            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-surface border border-[var(--border)]"
                          >
                            <Buildings size={15} weight="duotone" className="text-accent shrink-0" />
                            <span className="text-xs font-medium text-t1 truncate">
                              {SLUG_LABELS[slug] ?? slug}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-t3 italic">No dashboard access assigned.</p>
                    )}
                  </div>

                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <>
            <motion.div
              key="logout-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50"
              onClick={() => !isLoggingOut && setShowLogoutConfirm(false)}
            />
            <motion.div
              key="logout-dialog"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.18 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-xs px-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-card border border-[var(--border)] rounded-2xl shadow-2xl p-6 text-center">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                  <SignOut size={22} weight="duotone" className="text-red-500" />
                </div>
                <h2 className="text-base font-bold text-[var(--text-1)] mb-1">Sign out?</h2>
                <p className="text-xs text-[var(--text-3)] mb-5">
                  You'll need to log in again to access your account.
                </p>
                <div className="flex flex-col gap-2">

                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-75 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {isLoggingOut ? (
                      <><CircleNotch size={18} weight="bold" className="animate-spin" /> Signing out…</>
                    ) : (
                      'Sign Out'
                    )}
                  </button>
                  <button
                    onClick={() => setShowLogoutConfirm(false)}
                    disabled={isLoggingOut}
                    className="flex-1 py-2.5 border border-[var(--border)] text-[var(--text-1)] hover:bg-[var(--surface)] rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
