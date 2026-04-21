import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from '@phosphor-icons/react';

interface ModernModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  summaryContent?: React.ReactNode;
  actions?: React.ReactNode;
  maxWidth?: string;
}

export default function ModernModal({
  isOpen,
  onClose,
  title,
  children,
  summaryContent,
  actions,
  maxWidth = 'max-w-5xl'
}: ModernModalProps) {
  // Prevent scroll when modal is open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5, bounce: 0.3 }}
            className={`relative w-full ${maxWidth} bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface/50">
              <h3 className="text-lg font-bold text-t1 uppercase tracking-tight">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-t3 hover:text-t1 hover:bg-surface transition-colors focus:outline-none"
              >
                <X size={20} weight="bold" />
              </button>
            </div>

            {/* Body */}
            <div className="flex flex-col lg:flex-row overflow-hidden flex-1">
              {/* Left Column: Form Content */}
              <div className={`flex-1 p-6 overflow-y-auto custom-scrollbar ${summaryContent ? 'lg:border-r lg:border-border' : ''}`}>
                {children}
              </div>

              {/* Right Column: Summary/Context */}
              {summaryContent && (
                <div className="w-full lg:w-80 bg-surface/30 p-6 overflow-y-auto custom-scrollbar">
                  {summaryContent}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border bg-surface/50 flex items-center justify-end gap-3">
              <button
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-bold text-t2 hover:text-t1 transition-colors"
              >
                Cancel
              </button>
              {actions}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
