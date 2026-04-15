import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export default function SidePanel({ isOpen, onClose, children, title }: SidePanelProps) {
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
      <div className="relative w-full max-w-5xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 shrink-0 bg-white">
          <div className="text-sm text-gray-500 font-medium">{title}</div>
          <button 
            onClick={onClose}
            className="text-green-600 hover:text-green-700 text-sm font-medium flex items-center px-2 py-1 rounded hover:bg-green-50 transition-colors"
          >
            Close
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-white">
          {children}
        </div>
      </div>
    </div>
  );
}
