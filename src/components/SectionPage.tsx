import React, { useState, useEffect } from 'react';
import { departmentsData } from '../data/navigation';

export default function SectionPage({ departmentId, sectionId }: { departmentId: string, sectionId: string }) {
  const department = departmentsData.find(d => d.id === departmentId);
  
  // Find the specific item (e.g., "Receivables")
  let sectionItem: any = null;
  department?.sections.forEach(sec => {
    const found = sec.items.find(item => item.name.toLowerCase().replace(/\s+/g, '-') === sectionId);
    if (found) sectionItem = found;
  });

  const [activeTab, setActiveTab] = useState('');

  useEffect(() => {
    if (sectionItem?.subItems?.length > 0) {
      setActiveTab(sectionItem.subItems[0]);
    }
  }, [sectionItem]);

  if (!sectionItem) {
    return <div className="p-6">Section not found</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">{sectionItem.name}</h2>
      </div>

      {/* Tabs */}
      {sectionItem.subItems && sectionItem.subItems.length > 0 && (
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {sectionItem.subItems.map((subItem: string) => (
              <button
                key={subItem}
                onClick={() => setActiveTab(subItem)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === subItem
                    ? 'border-blue-900 text-blue-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {subItem}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Content Area */}
      <div className="bg-white rounded-lg border border-gray-200 p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 mb-4 border border-gray-100">
            <sectionItem.icon className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">{activeTab}</h3>
          <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
            This is the {activeTab} component view. Data tables and charts for this specific section will be rendered here.
          </p>
        </div>
      </div>
    </div>
  );
}
