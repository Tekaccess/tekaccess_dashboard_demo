import React, { useState, useEffect, useRef } from 'react';
import { Columns, Check } from '@phosphor-icons/react';

export interface ColDef {
  key: string;
  label: string;
  defaultVisible?: boolean;
}

export function useColumnVisibility(storageKey: string, cols: ColDef[]) {
  const [visible, setVisible] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(`col_vis_${storageKey}`);
      if (saved) return new Set(JSON.parse(saved) as string[]);
    } catch {}
    return new Set(cols.filter(c => c.defaultVisible !== false).map(c => c.key));
  });

  function toggle(key: string) {
    setVisible(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      try { localStorage.setItem(`col_vis_${storageKey}`, JSON.stringify([...next])); } catch {}
      return next;
    });
  }

  return { visible, toggle };
}

/**
 * Per-user column width persistence. Stored as { [colKey]: pixels } in localStorage
 * under `col_widths_<storageKey>`. Unknown keys fall back to `defaults`.
 */
export function useColumnWidths(
  storageKey: string,
  defaults: Record<string, number>,
) {
  const [widths, setWidths] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(`col_widths_${storageKey}`);
      if (saved) return { ...defaults, ...JSON.parse(saved) };
    } catch {}
    return defaults;
  });

  const setWidth = React.useCallback(
    (key: string, width: number) => {
      setWidths((prev) => {
        const next = { ...prev, [key]: width };
        try {
          localStorage.setItem(`col_widths_${storageKey}`, JSON.stringify(next));
        } catch {}
        return next;
      });
    },
    [storageKey],
  );

  return { widths, setWidth };
}

interface ColumnSelectorProps {
  cols: ColDef[];
  visible: Set<string>;
  onToggle: (key: string) => void;
}

export default function ColumnSelector({ cols, visible, onToggle }: ColumnSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className={`inline-flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm transition-colors ${
          open ? 'border-accent text-accent bg-accent/5' : 'border-border text-t2 hover:bg-surface'
        }`}
      >
        <Columns size={14} weight="duotone" />
        <span className="hidden sm:inline">Columns</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-xl w-52 py-1.5">
          <p className="px-3 pb-1 text-[10px] font-black text-t3 uppercase tracking-widest">Toggle Columns</p>
          {cols.map(col => (
            <button
              key={col.key}
              onClick={() => onToggle(col.key)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-t2 hover:bg-surface transition-colors"
            >
              <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                visible.has(col.key) ? 'bg-accent border-accent' : 'border-border bg-surface'
              }`}>
                {visible.has(col.key) && <Check size={10} weight="bold" className="text-white" />}
              </span>
              {col.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
