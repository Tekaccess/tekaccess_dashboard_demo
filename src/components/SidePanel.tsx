import React, { useEffect } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';

interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export default function SidePanel({ isOpen, onClose, children, title }: SidePanelProps) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="relative w-full max-w-5xl bg-card h-full shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--border)] shrink-0">
          <div className="text-sm text-t2 font-medium">{title}</div>
          <button
            onClick={onClose}
            className="text-emerald-500 hover:text-emerald-400 text-sm font-medium flex items-center px-2 py-1 rounded hover:bg-emerald-500/10 transition-colors"
          >
            Close
          </button>
        </div>
        <OverlayScrollbarsComponent
          className="flex-1 bg-card"
          options={{ scrollbars: { autoHide: 'scroll' } }}
          defer
        >
          {children}
        </OverlayScrollbarsComponent>
      </div>
    </div>
  );
}
