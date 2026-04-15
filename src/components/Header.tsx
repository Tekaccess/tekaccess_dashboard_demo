import React from 'react';
import { Search, Bell, Inbox, Command, Menu } from 'lucide-react';

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 shrink-0">
      <div className="flex items-center">
        <button 
          onClick={onMenuClick}
          className="mr-4 p-2 text-gray-500 hover:text-gray-700 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
          Dashboard <span className="text-gray-400 font-normal hidden sm:inline">/ Overview</span>
        </h1>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-4">
        <div className="relative hidden md:block">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search..."
            className="block w-48 lg:w-64 pl-10 pr-12 py-2 border border-gray-200 rounded-md leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
            <div className="flex items-center space-x-1">
              <kbd className="inline-flex items-center border border-gray-200 rounded px-1.5 text-xs font-sans font-medium text-gray-400">
                <Command className="h-3 w-3 mr-0.5" />
              </kbd>
              <kbd className="inline-flex items-center border border-gray-200 rounded px-1.5 text-xs font-sans font-medium text-gray-400">
                K
              </kbd>
            </div>
          </div>
        </div>

        <button className="p-2 text-gray-400 hover:text-gray-500 border border-gray-200 rounded-md bg-white md:hidden">
          <Search className="h-4 w-4" />
        </button>
        <button className="p-2 text-gray-400 hover:text-gray-500 border border-gray-200 rounded-md bg-white">
          <Bell className="h-4 w-4" />
        </button>
        <button className="p-2 text-gray-400 hover:text-gray-500 border border-gray-200 rounded-md bg-white hidden sm:block">
          <Inbox className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
