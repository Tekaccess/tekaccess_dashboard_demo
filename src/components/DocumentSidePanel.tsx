import React, { useEffect } from 'react';
import { CaretUp, CaretDown } from '@phosphor-icons/react';

interface DocumentSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  formContent: React.ReactNode;
  previewContent: React.ReactNode;
  footerInfo?: string;
  currentIndex?: number;
  totalItems?: number;
  onNext?: () => void;
  onPrev?: () => void;
}

export default function DocumentSidePanel({
  isOpen,
  onClose,
  title,
  formContent,
  previewContent,
  footerInfo,
  currentIndex,
  totalItems,
  onNext,
  onPrev,
}: DocumentSidePanelProps) {
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

      <div className="relative w-full max-w-[1200px] bg-card h-full shadow-2xl flex flex-col">
        {/* Floating nav control */}
        {(onNext || onPrev) && (
          <div className="absolute top-4 left-[-48px] flex flex-col gap-1 bg-card rounded-xl shadow-2xl border border-[var(--border)] p-1">
            <button
              onClick={onPrev}
              disabled={currentIndex === 1}
              className="p-1.5 hover:bg-surface rounded-lg text-t2 disabled:opacity-30 transition-colors"
            >
              <CaretUp size={18} weight="bold" />
            </button>
            <button
              onClick={onNext}
              disabled={currentIndex === totalItems}
              className="p-1.5 hover:bg-surface rounded-lg text-t2 disabled:opacity-30 transition-colors"
            >
              <CaretDown size={18} weight="bold" />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] shrink-0">
          <div className="text-sm font-medium text-t2">
            {currentIndex && totalItems ? (
              <span>{currentIndex} of {totalItems} in <span className="text-t1">{title}</span></span>
            ) : (
              title
            )}
          </div>
          <button
            onClick={onClose}
            className="text-emerald-500 hover:text-emerald-400 text-sm font-semibold transition-colors"
          >
            Close
          </button>
        </div>

        {/* Split layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Form pane */}
          <div className="w-[400px] border-r border-[var(--border)] flex flex-col bg-card">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {formContent}
            </div>
            {footerInfo && (
              <div className="p-4 border-t border-[var(--border-s)] text-[11px] text-t3 italic">
                {footerInfo}
              </div>
            )}
          </div>

          {/* Preview pane */}
          <div className="flex-1 bg-app overflow-y-auto p-12 flex justify-center">
            <div className="w-full max-w-[800px] bg-white shadow-sm border border-gray-100 min-h-[1000px] p-12">
              {previewContent}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
