import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MagnifyingGlass, CaretDown, X, Check } from '@phosphor-icons/react';

export interface SearchSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  meta?: string;
}

interface SearchSelectProps {
  options: SearchSelectOption[];
  value?: string | null;
  onChange: (value: string | null, option: SearchSelectOption | null) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  loading?: boolean;
  clearable?: boolean;
  className?: string;
}

export default function SearchSelect({
  options,
  value,
  onChange,
  placeholder = 'Search and select...',
  label,
  disabled = false,
  loading = false,
  clearable = true,
  className = '',
}: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => (value ? options.find(o => o.value === value) || null : null),
    [value, options]
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter(
      o => o.label.toLowerCase().includes(q) || (o.sublabel || '').toLowerCase().includes(q)
    );
  }, [query, options]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleOpen() {
    if (disabled) return;
    setOpen(true);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleSelect(opt: SearchSelectOption) {
    onChange(opt.value, opt);
    setOpen(false);
    setQuery('');
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(null, null);
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-[10px] text-t3 mb-1">{label}</label>
      )}

      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className="w-full flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-lg text-sm text-left transition-colors hover:border-accent focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed outline-none"
      >
        <span className={`flex-1 truncate ${selected ? 'text-t1' : 'text-t3'}`}>
          {selected ? selected.label : placeholder}
        </span>
        {loading && (
          <span className="w-3.5 h-3.5 border-2 border-t-transparent border-accent rounded-full animate-spin shrink-0" />
        )}
        {selected && clearable && !disabled && (
          <X size={13} weight="bold" className="text-t3 hover:text-t1 shrink-0" onClick={handleClear} />
        )}
        {!selected && (
          <CaretDown size={13} weight="bold" className="text-t3 shrink-0" />
        )}
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 w-full bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <MagnifyingGlass size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-t3" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Type to search..."
                className="w-full pl-7 pr-3 py-1.5 bg-surface border border-border rounded-lg text-xs text-t1 placeholder-t3 outline-none focus:border-accent transition-colors"
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-t3">
                {loading ? 'Loading...' : 'No results found'}
              </div>
            ) : (
              filtered.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-surface transition-colors"
                >
                  <Check
                    size={13}
                    weight="bold"
                    className={`shrink-0 ${opt.value === value ? 'text-accent' : 'text-transparent'}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-t1 truncate">{opt.label}</div>
                    {opt.sublabel && (
                      <div className="text-xs text-t3 truncate">{opt.sublabel}</div>
                    )}
                  </div>
                  {opt.meta && (
                    <span className="text-xs text-t3 shrink-0">{opt.meta}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
