import React, { useEffect } from 'react';
import { X, ChevronUp, ChevronDown } from 'lucide-react';

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
  onPrev
}: DocumentSidePanelProps) {
  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="relative w-full max-w-[1200px] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Navigation Floating Control (Optional) */}
        {(onNext || onPrev) && (
          <div className="absolute top-4 left-[-48px] flex flex-col gap-1 bg-white rounded-lg shadow-lg border border-gray-200 p-1">
            <button 
              onClick={onPrev}
              disabled={currentIndex === 1}
              className="p-1.5 hover:bg-gray-100 rounded text-gray-600 disabled:opacity-30"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
            <button 
              onClick={onNext}
              disabled={currentIndex === totalItems}
              className="p-1.5 hover:bg-gray-100 rounded text-gray-600 disabled:opacity-30"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0 bg-white">
          <div className="text-sm font-medium text-gray-600">
            {currentIndex && totalItems ? (
              <span>{currentIndex} of {totalItems} in <span className="text-gray-900">{title}</span></span>
            ) : (
              title
            )}
          </div>
          <button 
            onClick={onClose}
            className="text-green-600 hover:text-green-700 text-sm font-semibold transition-colors"
          >
            Close
          </button>
        </div>
        
        {/* Content Split Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Form Section */}
          <div className="w-[400px] border-r border-gray-100 flex flex-col bg-white">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {formContent}
            </div>
            {footerInfo && (
              <div className="p-4 border-t border-gray-50 text-[11px] text-gray-400 italic">
                {footerInfo}
              </div>
            )}
          </div>

          {/* Right: Preview Section */}
          <div className="flex-1 bg-gray-50/50 overflow-y-auto p-12 flex justify-center">
            <div className="w-full max-w-[800px] bg-white shadow-sm border border-gray-100 min-h-[1000px] p-12">
              {previewContent}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
