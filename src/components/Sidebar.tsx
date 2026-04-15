import React, { useState } from 'react';
import {
  LifeBuoy,
  ChevronDown,
  ChevronUp,
  X,
  Monitor
} from 'lucide-react';
import { sharedMenu, departmentsData } from '../data/navigation';

interface SidebarProps {
  currentDepartmentId: string;
  onDepartmentChange: (id: string) => void;
}

export default function Sidebar({ currentDepartmentId, onDepartmentChange }: SidebarProps) {
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const [showSupport, setShowSupport] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const currentDepartment = departmentsData.find(d => d.id === currentDepartmentId) || departmentsData[0];

  const toggleExpand = (itemName: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemName]: !prev[itemName]
    }));
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full overflow-hidden shrink-0">
      {/* Logo */}
      <div className="p-6 flex items-center shrink-0">
        <div className="text-2xl font-bold text-[#1e1b4b] tracking-tighter flex items-center">
          <span className="text-red-600 italic mr-1">TEK</span>ACCESS
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-4 space-y-6 pb-6 scrollbar-hide">
        {/* Shared Menu */}
        <div>
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 px-3">
            {sharedMenu.title}
          </h3>
          <ul className="space-y-1">
            {sharedMenu.items.map((item, itemIdx) => (
              <li key={itemIdx}>
                <a
                  href="#"
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    item.active
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon
                    className={`mr-3 h-4 w-4 ${
                      item.active ? 'text-gray-900' : 'text-gray-400'
                    }`}
                  />
                  {item.name}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Department Menu */}
        {currentDepartment.sections.map((section, idx) => (
          <div key={idx}>
            <h3 className="text-xs font-bold text-gray-900 mb-2 px-3">
              {section.title}
            </h3>
            <ul className="space-y-1">
              {section.items.map((item, itemIdx) => {
                const isExpanded = expandedItems[item.name];
                const hasSubItems = item.subItems && item.subItems.length > 0;
                
                return (
                  <li key={itemIdx}>
                    <button
                      onClick={() => hasSubItems ? toggleExpand(item.name) : null}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    >
                      <div className="flex items-center">
                        <item.icon className="mr-3 h-4 w-4 text-gray-400" />
                        {item.name}
                      </div>
                      {hasSubItems && (
                        isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                    
                    {hasSubItems && isExpanded && (
                      <ul className="mt-1 space-y-1 pl-10 pr-3">
                        {item.subItems!.map((subItem, subIdx) => (
                          <li key={subIdx}>
                            <a
                              href="#"
                              className="block py-1.5 text-sm text-gray-500 hover:text-gray-900"
                            >
                              {subItem}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom Section */}
      <div className="p-4 border-t border-gray-200 shrink-0 space-y-4 bg-white">
        {showSupport && (
          <div className="relative border border-gray-200 rounded-lg p-4 bg-white">
            <button 
              onClick={() => setShowSupport(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
            <button className="flex items-center px-3 py-1.5 bg-[#1e1b4b] text-white text-xs font-medium rounded-md hover:bg-[#2d296b] transition-colors mb-3">
              <Monitor className="mr-2 h-3.5 w-3.5" />
              Technical support
            </button>
            <p className="text-xs text-gray-600 mb-3 pr-4">
              Request a feature or help with other it maters
            </p>
            <button className="w-full py-2 bg-gray-50 border border-gray-200 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-100 transition-colors">
              Check out options
            </button>
          </div>
        )}
        
        <div className="relative">
          <button 
            onClick={() => setIsDeptDropdownOpen(!isDeptDropdownOpen)}
            className="w-full flex items-center p-2 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
          >
            <div className="h-8 w-8 rounded bg-gray-200 flex-shrink-0 mr-3"></div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-gray-900 truncate">Gusenga thierry</p>
              <p className="text-xs text-gray-500 truncate">{currentDepartment.role}</p>
            </div>
            {isDeptDropdownOpen ? (
              <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
            )}
          </button>

          {isDeptDropdownOpen && (
            <div className="absolute bottom-full left-0 w-full mb-2 bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden z-50">
              <div className="max-h-60 overflow-y-auto py-1">
                {departmentsData.map((dept) => (
                  <button
                    key={dept.id}
                    onClick={() => {
                      onDepartmentChange(dept.id);
                      setIsDeptDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm ${
                      currentDepartmentId === dept.id 
                        ? 'bg-blue-50 text-blue-700 font-medium' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {dept.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
