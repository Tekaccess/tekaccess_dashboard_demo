import React, { useState, useEffect } from "react";
import { X, Plus } from "lucide-react";
import { departmentsData } from "../data/navigation";

export default function SectionPage({
  departmentId,
  sectionId,
}: {
  departmentId: string;
  sectionId: string;
}) {
  const department = departmentsData.find((d) => d.id === departmentId);
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);

  // Find the specific item (e.g., "Receivables")
  let sectionItem: any = null;
  department?.sections.forEach((sec) => {
    const found = sec.items.find(
      (item) => item.name.toLowerCase().replace(/\s+/g, "-") === sectionId,
    );
    if (found) sectionItem = found;
  });

  const [activeTab, setActiveTab] = useState("");

  useEffect(() => {
    if (sectionItem?.subItems?.length > 0) {
      // Filter out "Add Employee" from tabs
      const filteredTabs = sectionItem.subItems.filter(
        (item: string) => item !== "Add Employee",
      );
      setActiveTab(filteredTabs[0] || "");
    }
  }, [sectionItem]);

  const handleAddEmployeeClick = () => {
    setShowAddEmployeeModal(true);
  };

  if (!sectionItem) {
    return <div className="p-6">Section not found</div>;
  }

  // Filter out "Add Employee" from the tabs list
  const displayTabs = (sectionItem.subItems || []).filter(
    (item: string) => item !== "Add Employee",
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">{sectionItem.name}</h2>
        {sectionItem.name === "Employees" && (
          <button
            onClick={handleAddEmployeeClick}
            className="flex items-center px-4 py-2 bg-[#4A4B4D] text-white rounded-md text-sm font-medium hover:bg-[#3a3b3d]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Employee
          </button>
        )}
      </div>

      {/* Tabs */}
      {displayTabs.length > 0 && (
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {displayTabs.map((subItem: string) => (
              <button
                key={subItem}
                onClick={() => setActiveTab(subItem)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${
                    activeTab === subItem
                      ? "border-blue-900 text-blue-900"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
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
          <h3 className="text-lg font-medium text-gray-900">
            {activeTab || sectionItem.name}
          </h3>
          <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
            This is the {activeTab || sectionItem.name} component view. Data
            tables and charts for this specific section will be rendered here.
          </p>
        </div>
      </div>

      {/* Add Employee Modal */}
      {showAddEmployeeModal && (
        <div
          className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddEmployeeModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Add New Employee
              </h3>
              <button
                onClick={() => setShowAddEmployeeModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="Enter full name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="Enter email address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option>Select department</option>
                  <option>Executive</option>
                  <option>Finance</option>
                  <option>Transport</option>
                  <option>Operations</option>
                  <option>Inventory</option>
                  <option>Procurement</option>
                  <option>Data Team</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <input
                  type="text"
                  placeholder="Enter role"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowAddEmployeeModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowAddEmployeeModal(false)}
                className="px-4 py-2 bg-[#4A4B4D] text-white rounded-md text-sm font-medium hover:bg-[#3a3b3d]"
              >
                Add Employee
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
