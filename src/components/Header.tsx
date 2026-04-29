import React, { useState, useCallback, useRef } from 'react';
import { MagnifyingGlass, List, SignOut, KeyIcon, GearIcon, PencilSimpleIcon, X, CheckIcon, ShieldCheck, ClockCounterClockwise, ClockCounterClockwiseIcon, CircleNotchIcon, DotsSixVerticalIcon, CheckCircleIcon, CameraIcon } from '@phosphor-icons/react';
import { Eye, EyeSlash, CircleNotch, CheckCircle } from '@phosphor-icons/react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '@tanstack/react-router';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { apiChangePassword, apiGetMyActivity, type ActivityLog } from '../lib/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import NotificationBell from './NotificationBell';

const SLUG_LABELS: Record<string, string> = {
  executive: 'Executive',
  finance: 'Finance',
  transport: 'Transport',
  operations: 'Operations',
  inventory: 'Inventory',
  procurement: 'Procurement',
  data_entry: 'Data Entry',
};

interface HeaderProps {
  onMenuClick?: () => void;
  pageTitle?: string;
}

type ModalState = 'idle' | 'open' | 'success';

export default function Header({ onMenuClick, pageTitle = 'Dashboard' }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout, updateName, updateDashboardOrder, uploadAvatar } = useAuth();
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
  const [dashOrder, setDashOrder] = useState<string[]>([]);
  const dashOrderRef = useRef<string[]>([]);
  const [orderSaved, setOrderSaved] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Activity modal state
  const [showActivity, setShowActivity] = useState(false);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState('');
  const [activitySort, setActivitySort] = useState<'newest' | 'oldest' | 'failed'>('newest');

  const openSettings = () => {
    setIsProfileOpen(false);
    setNameValue(user?.fullName ?? '');
    setNameEditing(false);
    setNameError('');
    setNameSaved(false);
    // Build initial order: saved order first, then any slugs not yet in it
    const saved = user?.preferences?.dashboardOrder ?? [];
    const access = user?.dashboardAccess ?? [];
    const merged = [...saved.filter(s => access.includes(s)), ...access.filter(s => !saved.includes(s))];
    setDashOrder(merged);
    dashOrderRef.current = merged;
    setOrderSaved(false);
    setAvatarPreview(null);
    setAvatarError('');
    setShowSettings(true);
  };

  const openActivity = useCallback(async () => {
    setIsProfileOpen(false);
    setActivityLogs([]);
    setActivityError('');
    setActivitySort('newest');
    setActivityLoading(true);
    setShowActivity(true);
    try {
      const res = await apiGetMyActivity();
      if (res.success) {
        setActivityLogs(res.data.logs);
      } else {
        setActivityError('Failed to load activity.');
      }
    } catch {
      setActivityError('Something went wrong.');
    } finally {
      setActivityLoading(false);
    }
  }, []);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setAvatarError('Image must be under 4 MB.');
      return;
    }
    setAvatarError('');
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarUploading(true);
    const err = await uploadAvatar(file);
    setAvatarUploading(false);
    if (err) {
      setAvatarError(err);
      setAvatarPreview(null);
    }
  };

  const handleReorderEnd = async () => {
    await updateDashboardOrder(dashOrderRef.current);
    setOrderSaved(true);
    setTimeout(() => setOrderSaved(false), 2000);
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
      <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4 sm:px-6 shrink-0 gap-4">
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
              className="w-44 pl-8 pr-3 py-[8px] border border-border rounded-lg bg-surface placeholder-t3 text-t1 text-xs focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
            />
          </div>

          <NotificationBell />

          {/* Profile dropdown */}
          <div className="relative ml-2">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 p-1 border border-border rounded-full bg-surface hover:bg-accent-glow transition-all overflow-hidden"
            >
              <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-white text-[10px] font-bold overflow-hidden">
                {user?.avatarUrl
                  ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                  : user?.fullName?.[0].toUpperCase() || 'U'}
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
                    className="absolute right-0 mt-2 w-60 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-50"
                  >
                    {/* User identity */}
                    <div className="p-3 flex items-start gap-3 border-b border-border">
                      <div className="size-12 rounded-full bg-accent flex items-center justify-center text-white text-sm font-bold shrink-0 overflow-hidden">
                        {user?.avatarUrl
                          ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                          : user?.fullName?.[0].toUpperCase() || 'U'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-t1 truncate">{user?.fullName}</p>
                        <p className="text-xs text-t3 truncate">{user?.email}</p>
                        <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded-md bg-accent-glow text-accent text-[9px] font-bold uppercase tracking-wide">
                          {user?.role?.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="p-1.5 space-y-0.5">
                      <button
                        onClick={openActivity}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-t2 hover:bg-surface hover:text-t1 rounded-lg transition-colors"
                      >
                        <ClockCounterClockwise size={18} weight="regular" className="text-t3" />
                        Activity
                      </button>
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
                    <div className="p-1.5 border-t border-border">
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
              <div className="bg-card border border-border rounded-2xl shadow-2xl p-6">

                {modalState === 'success' ? (
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle size={24} weight="duotone" className="text-green-500" />
                    </div>
                    <h2 className="text-base font-bold text-t1 mb-1">Password Updated</h2>
                    <p className="text-sm text-t3 mb-10">
                      Your password has been changed. Other active sessions have been signed out.
                    </p>
                    <button
                      onClick={closeModal}
                      className="w-full py-2.5 bg-accent hover:bg-accent-h text-white rounded-xl text-sm font-medium transition-colors"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="text-base font-bold text-t1">Change Password</h2>
                      <button
                        onClick={closeModal}
                        className="text-t3 hover:text-t1 text-lg leading-none transition-colors"
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
                          className="w-full px-4 py-2.5 pr-10 rounded-xl border border-border bg-surface text-t1 placeholder-t3 focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrent(!showCurrent)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-t3 hover:text-t2 transition-colors"
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
                          className="w-full px-4 py-2.5 pr-10 rounded-xl border border-border bg-surface text-t1 placeholder-t3 focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNew(!showNew)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-t3 hover:text-t2 transition-colors"
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
                        className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-t1 placeholder-t3 focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all text-sm"
                      />

                      <p className="text-xs text-t3 mb-3">
                        Min. 8 characters · one uppercase · one number
                      </p>

                      {error && <p className="text-xs text-red-500">{error}</p>}

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-2.5 bg-accent hover:bg-accent-h disabled:opacity-75 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
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
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 flex w-[calc(100%-1.5rem)] max-w-xs sm:max-w-md md:max-w-lg lg:max-w-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col w-full max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border shrink-0">
                  <h2 className="text-base font-bold text-t1">Account Settings</h2>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="p-1.5 rounded-lg text-t3 hover:text-t1 hover:bg-surface transition-colors"
                  >
                    <X size={18} weight="bold" />
                  </button>
                </div>

                <OverlayScrollbarsComponent className="p-4 sm:p-6 space-y-6 flex-1" options={{ scrollbars: { autoHide: 'never' } }} defer>

                  {/* Avatar + identity */}
                  <div className="flex items-center gap-4">
                    {/* Clickable avatar */}
                    <div className="relative shrink-0 group">
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        className="size-20 rounded-full overflow-hidden transition-all duration-200 focus:outline-none"
                      >
                        <AnimatePresence mode="wait">
                          {avatarUploading ? (
                            <motion.div
                              key="uploading"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="w-full h-full bg-black/40 rounded-full flex items-center justify-center"
                            >
                              <CircleNotchIcon size={22} weight="bold" className="text-white animate-spin" />
                            </motion.div>
                          ) : (avatarPreview || user?.avatarUrl) ? (
                            <motion.img
                              key={avatarPreview || user?.avatarUrl || 'img'}
                              initial={{ opacity: 0, scale: 1.08 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.25 }}
                              src={avatarPreview || user?.avatarUrl!}
                              alt="Avatar"
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            <motion.div
                              key="initials"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="w-full h-full bg-accent flex rounded-full items-center justify-center text-white text-2xl font-bold"
                            >
                              {(nameEditing ? nameValue : user?.fullName)?.[0]?.toUpperCase() || 'U'}
                            </motion.div>
                          )}
                        </AnimatePresence>
                        {/* Hover overlay */}
                        {!avatarUploading && (
                          <div className="absolute aspect-square size-20 top-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                            <CameraIcon size={24} className="text-white" />
                          </div>
                        )}
                      </button>
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />
                    </div>
                    <div>
                      <p className="text-base font-bold text-t1">{user?.fullName}</p>
                      <p className="text-xs text-t3">{user?.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-accent-glow text-accent text-[10px] font-bold uppercase tracking-wide">
                        {user?.role?.replace(/_/g, ' ')}
                      </span>
                      {avatarError && (
                        <p className="text-[10px] text-red-500 mt-1">{avatarError}</p>
                      )}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-border mt-6 mb-4" />

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
                            className="flex-1 px-3 py-2 rounded-lg border border-border bg-surface text-sm text-t1 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                          />
                          <button
                            onClick={handleSaveName}
                            disabled={nameSaving}
                            className="px-3 py-2 bg-accent hover:bg-accent-h text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-60"
                          >
                            {nameSaving
                              ? <CircleNotch size={14} weight="bold" className="animate-spin" />
                              : <CheckIcon size={14} weight="bold" />}
                            Save
                          </button>
                          <button
                            onClick={() => { setNameEditing(false); setNameError(''); }}
                            className="px-3 py-2 border border-border text-t2 hover:bg-surface text-xs font-medium rounded-lg transition-colors"
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
                            className="px-3 py-2 border border-border text-t2 hover:bg-surface hover:text-t1 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
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
                  <div className="border-t border-border my-4" />

                  {/* Dashboard access & order */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs font-semibold text-t3 py-1 uppercase tracking-widest">
                        Dashboard(s) You can Access
                      </label>
                      <AnimatePresence>
                        {orderSaved && (
                          <motion.span
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-1 text-[13px] text-green-700"
                          >
                            <CheckCircleIcon size={15} weight="fill" /> Saved
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                    {user?.role === 'super_admin' ? (
                      <div className="flex items-center gap-2.5 p-3 rounded-xl bg-accent-glow border border-accent-border">
                        <ShieldCheck size={18} weight="duotone" className="text-accent shrink-0" />
                        <p className="text-xs font-medium text-accent">Full access to all dashboards</p>
                      </div>
                    ) : dashOrder.length > 0 ? (
                      <div>
                        <Reorder.Group
                          axis="y"
                          values={dashOrder}
                          onReorder={(v) => { setDashOrder(v); dashOrderRef.current = v; }}
                          as="ul"
                          className="space-y-1.5"
                        >
                          {dashOrder.map((slug, idx) => (
                            <Reorder.Item
                              key={slug}
                              value={slug}
                              as="li"
                              onDragEnd={() => handleReorderEnd()}
                              style={{ listStyle: 'none' }}
                              whileDrag={{ zIndex: 50 }}
                              className="flex items-center justify-start gap-3 w-full cursor-grab active:cursor-grabbing"
                            >
                              <DotsSixVerticalIcon size={14} weight="bold" className="text-t3 shrink-0" />
                              <div
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-border bg-surface text-t1 select-none hover:border-accent/40"
                              >
                                <span className="text-[10px] font-bold text-t3 w-4 text-center shrink-0">{idx + 1}</span>
                                <span className="flex-1 text-xs font-semibold">{SLUG_LABELS[slug] ?? slug}</span>
                              </div>
                            </Reorder.Item>
                          ))}
                        </Reorder.Group>
                        <p className="text-xs text-t3 mt-3 px-1">Drag to reorder.</p>
                      </div>
                    ) : (
                      <p className="text-xs text-t3 italic">No dashboard access assigned.</p>
                    )}
                  </div>

                </OverlayScrollbarsComponent>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Activity Modal */}
      <AnimatePresence>
        {showActivity && (
          <>
            <motion.div
              key="activity-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              onClick={() => setShowActivity(false)}
            />
            <motion.div
              key="activity-dialog"
              initial={{ opacity: 0, scale: 0.97, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 12 }}
              transition={{ duration: 0.2 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg px-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                  <div className="flex items-center gap-2">
                    <ClockCounterClockwiseIcon size={18} weight="regular" className="text-accent" />
                    <h2 className="text-base font-bold text-t1">Activity</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={activitySort} onValueChange={(v) => setActivitySort(v as typeof activitySort)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Newest first</SelectItem>
                        <SelectItem value="oldest">Oldest first</SelectItem>
                        <SelectItem value="failed">Failed only</SelectItem>
                      </SelectContent>
                    </Select>
                    <button
                      onClick={() => setShowActivity(false)}
                      className="p-1.5 rounded-lg text-t3 hover:text-t1 hover:bg-surface transition-colors"
                    >
                      <X size={18} weight="bold" />
                    </button>
                  </div>
                </div>

                {/* Body */}
                <OverlayScrollbarsComponent className="flex-1" options={{ scrollbars: { autoHide: 'never' } }} defer>
                  {activityLoading && (
                    <div className="flex items-center justify-center py-12">
                      <CircleNotchIcon size={24} weight="bold" className="animate-spin text-accent" />
                    </div>
                  )}
                  {activityError && (
                    <p className="text-sm text-red-500 text-center py-8">{activityError}</p>
                  )}
                  {!activityLoading && !activityError && activityLogs.length === 0 && (
                    <p className="text-sm text-t3 text-center py-8 italic">No activity recorded yet.</p>
                  )}
                  {!activityLoading && activityLogs.length > 0 && (() => {
                    const sorted = [...activityLogs]
                      .filter((l) => activitySort === 'failed' ? l.status === 'failed' : true)
                      .sort((a, b) => {
                        if (activitySort === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                      });
                    return sorted.length === 0
                      ? <p className="text-sm text-t3 text-center py-8 italic">No failed activity recorded.</p>
                      : (
                        <div className="space-y-0">
                          {sorted.map((log) => <ActivityEntry key={log._id} log={log} />)}
                        </div>
                      );
                  })()}
                </OverlayScrollbarsComponent>
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
              <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 text-center">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                  <SignOut size={22} weight="duotone" className="text-red-500" />
                </div>
                <h2 className="text-base font-bold text-t1 mb-1">Sign out?</h2>
                <p className="text-xs text-t3 mb-5">
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
                    className="flex-1 py-2.5 border border-border text-t1 hover:bg-surface rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
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

const ACTION_STYLES: Record<string, string> = {
  create: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
  update: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
  delete: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
  read: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400',
};

const DASHBOARD_LABELS: Record<string, string> = {
  executive: 'Executive', finance: 'Finance', transport: 'Transport',
  operations: 'Operations', inventory: 'Inventory',
  procurement: 'Procurement',
  data_entry: 'Data Entry', system: 'Account',
};

function ActivityEntry({ log }: { log: import('../lib/api').ActivityLog }) {
  const date = new Date(log.createdAt);
  const formatted = date.toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const description = log.note
    ? log.note
    : [
        log.collection.replace(/_/g, ' '),
        log.documentRef ? `· ${log.documentRef}` : null,
      ].filter(Boolean).join(' ');

  return (
    <div className="flex items-start gap-3 px-5 py-4 bg-card border-b border-border transition-colors">
      <div className="shrink-0">
        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${ACTION_STYLES[log.action] ?? ACTION_STYLES.read}`}>
          {log.action}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-t1 truncate">{description}</p>
        {log.changedFields.length > 0 && (
          <p className="text-xs text-t3 truncate mt-0.5">
            Changed: {log.changedFields.join(', ')}
          </p>
        )}
        {log.status === 'failed' && log.errorMessage && (
          <p className="text-xs text-red-500 truncate mt-0.5">{log.errorMessage}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-accent font-medium">{formatted}</span>
          <span className="text-sm">·</span>
          <span className="text-xs italic text-t3">{DASHBOARD_LABELS[log.dashboard] ?? log.dashboard}</span>
          <span className="ml-auto text-xs text-t3 font-mono capitalize font-normal">
            {log.status}
          </span>
        </div>
      </div>
    </div>
  );
}
