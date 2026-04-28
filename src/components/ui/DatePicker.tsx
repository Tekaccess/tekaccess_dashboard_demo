import React, { useState, useEffect } from 'react';
import { format, isValid, parse } from 'date-fns';
import { CalendarBlank, X } from '@phosphor-icons/react';
import * as Popover from '@radix-ui/react-popover';
import { Calendar } from './calendar';

interface DatePickerProps {
  value?: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  fromDate?: Date;
  toDate?: Date;
  className?: string;
  compact?: boolean;
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
  compact = false,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value ? format(value, 'dd/MM/yyyy') : '');

  useEffect(() => {
    setInputValue(value ? format(value, 'dd/MM/yyyy') : '');
  }, [value]);

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
    <Popover.Root open={open} onOpenChange={setOpen}>
      <div
        className={`relative ${className}`}
        onClick={compact ? (e) => e.stopPropagation() : undefined}
      >
        {label && (
          <label className="block text-[10px] text-t3 mb-1">{label}</label>
        )}
        <div className="relative group/datepicker">
          <Popover.Anchor asChild>
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onFocus={() => !disabled && setOpen(true)}
              onClick={() => !disabled && setOpen(true)}
              placeholder={placeholder}
              disabled={disabled}
              size={compact ? 10 : undefined}
              className={
                compact
                  ? 'py-1.5 px-2 -mx-1 bg-transparent border border-transparent rounded-md text-sm text-t1 placeholder-t3 outline-none hover:bg-surface focus:bg-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                  : 'w-full pl-9 pr-8 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
              }
            />
          </Popover.Anchor>
          {!compact && (
            <CalendarBlank
              size={15}
              weight="duotone"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-t3 pointer-events-none"
            />
          )}
          {value && !disabled && !compact && (
            <button
              type="button"
              onClick={() => { onChange(null); setInputValue(''); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-t3 hover:text-t1 transition-colors"
            >
              <X size={13} weight="bold" />
            </button>
          )}
        </div>
      </div>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="z-[100] bg-card border border-border rounded-xl shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <Calendar
            mode="single"
            selected={value || undefined}
            onSelect={handleDaySelect}
            startMonth={fromDate}
            endMonth={toDate}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
