import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle, PaintBrush, CircleNotch } from '@phosphor-icons/react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { THEMES, deriveCustomTheme, applyThemeColors, type ThemeColors } from '../lib/themes';

interface ThemePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CUSTOM_FIELDS: { label: string; key: keyof typeof defaultCustom }[] = [
  { label: 'Background', key: 'bg' },
  { label: 'Surface',    key: 'surface' },
  { label: 'Text',       key: 'text' },
  { label: 'Accent',     key: 'accent' },
];

const defaultCustom = { bg: '#f6f6f6', surface: '#f0f0f0', text: '#0f0f0f', accent: '#1e3a8a' };

export default function ThemePickerModal({ isOpen, onClose }: ThemePickerModalProps) {
  const { currentThemeId, setTheme } = useTheme();
  const { user } = useAuth();

  const [activeId, setActiveId] = useState(currentThemeId);
  const [saving, setSaving] = useState<string | null>(null);
  const [custom, setCustom] = useState(defaultCustom);

  // Sync when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setActiveId(currentThemeId);
    if (currentThemeId === 'custom' && user?.preferences?.customTheme) {
      const ct = user.preferences.customTheme;
      setCustom({
        bg:      ct.appBg      ?? defaultCustom.bg,
        surface: ct.surface    ?? defaultCustom.surface,
        text:    ct.text1      ?? defaultCustom.text,
        accent:  ct.accent     ?? defaultCustom.accent,
      });
    }
  }, [isOpen]);

  // Live-preview custom theme while color pickers change
  useEffect(() => {
    if (!isOpen || activeId !== 'custom') return;
    const preview = deriveCustomTheme(custom.bg, custom.surface, custom.text, custom.accent);
    applyThemeColors(preview);
  }, [custom, activeId, isOpen]);

  const handleSelectPreset = async (id: string) => {
    if (saving) return;
    setActiveId(id);
    setSaving(id);
    await setTheme(id, null);
    setSaving(null);
  };

  const handleSelectCustom = () => {
    setActiveId('custom');
    const preview = deriveCustomTheme(custom.bg, custom.surface, custom.text, custom.accent);
    applyThemeColors(preview);
  };

  const handleApplyCustom = async () => {
    if (saving) return;
    setSaving('custom');
    const colors = deriveCustomTheme(custom.bg, custom.surface, custom.text, custom.accent);
    await setTheme('custom', colors);
    setSaving(null);
  };

  const setField = (key: keyof typeof defaultCustom, value: string) => {
    setCustom(prev => ({ ...prev, [key]: value }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="theme-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            key="theme-dialog"
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-1.5rem)] max-w-lg"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
                <div className="flex items-center gap-2">
                  <PaintBrush size={16} weight="duotone" className="text-accent" />
                  <h2 className="text-sm font-bold text-t1">Appearance</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-t3 hover:text-t1 hover:bg-surface transition-colors"
                >
                  <X size={16} weight="bold" />
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto p-5 space-y-4">

                {/* Theme label */}
                <p className="text-xs font-semibold text-t3 uppercase tracking-widest">Preset Themes</p>

                {/* Preset grid */}
                <div className="grid grid-cols-5 gap-2">
                  {THEMES.map(theme => {
                    const isActive = activeId === theme.id;
                    return (
                      <button
                        key={theme.id}
                        onClick={() => handleSelectPreset(theme.id)}
                        disabled={saving !== null}
                        className={`relative flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all disabled:cursor-wait ${
                          isActive
                            ? 'border-accent bg-accent-glow'
                            : 'border-transparent hover:border-border bg-surface hover:bg-surface-hover'
                        }`}
                      >
                        {/* Swatch preview */}
                        <div
                          className="w-full h-12 rounded-lg overflow-hidden relative"
                          style={{ background: theme.colors.appBg }}
                        >
                          <div
                            className="absolute bottom-0 left-0 right-0 h-5"
                            style={{ background: theme.colors.surface }}
                          />
                          <div
                            className="absolute top-2 left-2 w-7 h-4 rounded-md border"
                            style={{
                              background: theme.colors.cardBg,
                              borderColor: theme.colors.border,
                            }}
                          />
                          <div
                            className="absolute bottom-1.5 right-1.5 w-2.5 h-2.5 rounded-full"
                            style={{ background: theme.colors.accent }}
                          />
                        </div>

                        <span className="text-[10px] font-semibold text-t2 text-center leading-tight">
                          {theme.name}
                        </span>

                        {/* Active indicator */}
                        {isActive && (
                          <span className="absolute top-1 right-1">
                            {saving === theme.id
                              ? <CircleNotch size={12} weight="bold" className="text-accent animate-spin" />
                              : <CheckCircle size={12} weight="fill" className="text-accent" />
                            }
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {/* Custom card */}
                  <button
                    onClick={handleSelectCustom}
                    disabled={saving !== null}
                    className={`relative flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all disabled:cursor-wait ${
                      activeId === 'custom'
                        ? 'border-accent bg-accent-glow'
                        : 'border-dashed border-border hover:border-accent/50 bg-surface hover:bg-surface-hover'
                    }`}
                  >
                    <div className="w-full h-12 rounded-lg bg-surface-hover flex items-center justify-center">
                      <PaintBrush size={18} weight="duotone" className="text-t3" />
                    </div>
                    <span className="text-[10px] font-semibold text-t2 text-center leading-tight">Custom</span>
                    {activeId === 'custom' && (
                      <span className="absolute top-1 right-1">
                        <CheckCircle size={12} weight="fill" className="text-accent" />
                      </span>
                    )}
                  </button>
                </div>

                {/* Custom builder */}
                <AnimatePresence>
                  {activeId === 'custom' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-surface border border-border rounded-xl p-4 space-y-4">
                        <p className="text-xs font-semibold text-t3 uppercase tracking-widest">Build Your Theme</p>

                        <div className="grid grid-cols-2 gap-3">
                          {CUSTOM_FIELDS.map(({ label, key }) => (
                            <div key={key} className="flex items-center gap-3">
                              <label className="relative w-9 h-9 rounded-lg border-2 border-border overflow-hidden cursor-pointer shrink-0 hover:border-accent transition-colors"
                                style={{ background: custom[key] }}
                              >
                                <input
                                  type="color"
                                  value={custom[key]}
                                  onChange={e => setField(key, e.target.value)}
                                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                />
                              </label>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-t1">{label}</p>
                                <p className="text-[10px] text-t3 font-mono uppercase">{custom[key]}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Live preview strip */}
                        <div
                          className="h-8 rounded-lg flex items-center px-3 gap-2 border"
                          style={{
                            background: deriveCustomTheme(custom.bg, custom.surface, custom.text, custom.accent).appBg,
                            borderColor: deriveCustomTheme(custom.bg, custom.surface, custom.text, custom.accent).border,
                          }}
                        >
                          {(['cardBg', 'surface', 'surfaceHover', 'text1', 'text2', 'text3', 'accent'] as (keyof ThemeColors)[]).map(k => {
                            const c = deriveCustomTheme(custom.bg, custom.surface, custom.text, custom.accent);
                            return (
                              <span
                                key={k}
                                className="w-4 h-4 rounded-full border border-white/30 shrink-0"
                                style={{ background: c[k] }}
                                title={k}
                              />
                            );
                          })}
                          <span className="text-[10px] ml-1" style={{ color: deriveCustomTheme(custom.bg, custom.surface, custom.text, custom.accent).text2 }}>
                            Preview
                          </span>
                        </div>

                        <button
                          onClick={handleApplyCustom}
                          disabled={saving !== null}
                          className="w-full py-2 bg-accent hover:bg-accent-h text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                          {saving === 'custom'
                            ? <><CircleNotch size={13} weight="bold" className="animate-spin" /> Saving…</>
                            : 'Apply Custom Theme'
                          }
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
