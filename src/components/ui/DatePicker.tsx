import React, { useState, useRef, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, isValid, parse } from 'date-fns';
import { CalendarBlank, X } from '@phosphor-icons/react';
import 'react-day-picker/dist/style.css';

interface DatePickerProps {
  value?: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  fromDate?: Date;
  toDate?: Date;
  className?: string;
}

export default function DatePicker({
  value,
  onChange,
  placeholder = 'Select date...',
  label,
  disabled = false,
  fromDate,
  toDate,
  className = '',
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value ? format(value, 'dd/MM/yyyy') : '');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value ? format(value, 'dd/MM/yyyy') : '');
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setInputValue(val);
    const parsed = parse(val, 'dd/MM/yyyy', new Date());
    if (isValid(parsed)) {
      onChange(parsed);
    }
  }

  function handleDaySelect(day: Date | undefined) {
    if (day) {
      onChange(day);
      setInputValue(format(day, 'dd/MM/yyyy'));
      setOpen(false);
    }
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-[10px] text-t3 mb-1">{label}</label>
      )}
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => !disabled && setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full pl-9 pr-8 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <CalendarBlank
          size={15}
          weight="duotone"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-t3 pointer-events-none"
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={() => { onChange(null); setInputValue(''); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-t3 hover:text-t1 transition-colors"
          >
            <X size={13} weight="bold" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 top-full mt-1 bg-card border border-border rounded-xl shadow-2xl p-2">
          <style>{`
            .rdp { --rdp-accent-color: var(--accent); --rdp-background-color: var(--accent-glow); color: var(--text-1); }
            .rdp-day_selected { background-color: var(--accent) !important; color: white !important; }
            .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background-color: var(--surface); }
            .rdp-head_cell { color: var(--text-3); font-size: 11px; font-weight: 700; }
            .rdp-caption_label { color: var(--text-1); font-weight: 700; font-size: 13px; }
            .rdp-nav_button { color: var(--text-2); }
            .rdp-day { color: var(--text-1); font-size: 12px; }
            .rdp-day_outside { color: var(--text-3); }
          `}</style>
          <DayPicker
            mode="single"
            selected={value || undefined}
            onSelect={handleDaySelect}
            fromDate={fromDate}
            toDate={toDate}
            showOutsideDays
          />
        </div>
      )}
    </div>
  );
}
