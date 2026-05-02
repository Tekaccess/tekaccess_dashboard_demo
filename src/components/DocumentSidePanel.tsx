import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CaretUp, CaretDown } from '@phosphor-icons/react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';

interface DocumentSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  formContent: React.ReactNode;
  /** When omitted, the panel renders form-only (narrower, no right pane). */
  previewContent?: React.ReactNode;
  footerInfo?: string;
  currentIndex?: number;
  totalItems?: number;
  onNext?: () => void;
  onPrev?: () => void;
  /** Render preview without the default white padded paper wrapper (e.g. for PDF). */
  previewBare?: boolean;
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
  previewBare = false,
}: DocumentSidePanelProps) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  // Form-only (no preview) renders as a centered popup; split-pane stays as a
  // right-edge side panel.
  const isFormOnly = !previewContent;

  return createPortal(
    <div className={`fixed inset-0 z-[60] flex ${isFormOnly ? 'items-center justify-center p-4' : 'justify-end'}`}>
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className={`relative w-full bg-card shadow-2xl flex flex-col ${
        isFormOnly
          ? 'max-w-[640px] max-h-[90vh] rounded-2xl overflow-hidden'
          : 'max-w-[1200px] h-full'
      }`}>
        {/* Floating nav control — only meaningful for the side panel layout */}
        {!isFormOnly && (onNext || onPrev) && (
          <div className="absolute top-4 left-[-48px] flex flex-col gap-1 bg-card rounded-xl shadow-2xl border border-border p-1">
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
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
          <div className={`${previewContent ? 'w-[400px] border-r border-border' : 'flex-1'} flex flex-col bg-card`}>
            <OverlayScrollbarsComponent
              className="flex-1 p-6"
              options={{ scrollbars: { autoHide: 'never' } }}
              defer
            >
              <div className="space-y-6">{formContent}</div>
            </OverlayScrollbarsComponent>
            {footerInfo && (
              <div className="p-4 border-t border-border-s text-[11px] text-t3 italic">
                {footerInfo}
              </div>
            )}
          </div>

          {/* Preview pane */}
          {previewContent && (
            <OverlayScrollbarsComponent
              className="flex-1 bg-app p-12 flex justify-center"
              options={{ scrollbars: { autoHide: 'never' } }}
              defer
            >
              <div className="flex justify-center w-full">
                {previewBare ? (
                  <div className="flex justify-center">{previewContent}</div>
                ) : (
                  <div className="w-full max-w-[800px] bg-white shadow-sm border border-gray-100 min-h-[1000px] p-12 print-region">
                    {previewContent}
                  </div>
                )}
              </div>
            </OverlayScrollbarsComponent>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
