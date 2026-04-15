import React, { useState } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { LifeBuoy, ChevronDown, ChevronUp, X, Monitor } from "lucide-react";
import { sharedMenu, departmentsData } from "../data/navigation";

interface SidebarProps {
  currentDepartmentId: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({
  currentDepartmentId,
  isOpen = true,
  onClose,
}: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const [showSupport, setShowSupport] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(
    {},
  );

  const currentDepartment =
    departmentsData.find((d) => d.id === currentDepartmentId) ||
    departmentsData[0];

  const toggleExpand = (itemName: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [itemName]: !prev[itemName],
    }));
  };

  const handleDepartmentChange = (deptId: string) => {
    setIsDeptDropdownOpen(false);
    navigate({ to: `/${deptId}` });
    if (onClose) onClose();
  };

  const handleSectionClick = (itemName: string, hasSubItems: boolean) => {
    if (hasSubItems) {
      toggleExpand(itemName);
    }
    const sectionId = itemName.toLowerCase().replace(/\s+/g, "-");
    navigate({ to: `/${currentDepartmentId}/${sectionId}` });
    if (!hasSubItems && onClose) onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col h-full overflow-hidden shrink-0
        transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}
      >
        {/* Logo */}
        <div className="p-6 flex items-center justify-between shrink-0">
          <div className="flex items-center">
            <img
              src="/logo.jpg"
              alt="TEKACCESS"
              className="h-12 w-auto object-contain"
            />
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-4 space-y-6 pb-6 scrollbar-hide">
          {/* Shared Menu */}
          <div>
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 px-3">
              {sharedMenu.title}
            </h3>
            <ul className="space-y-1">
              {sharedMenu.items.map((item, itemIdx) => {
                const isActive =
                  item.name === "Dashboard"
                    ? location.pathname === "/" ||
                      location.pathname === `/${currentDepartmentId}`
                    : item.name === "Reports"
                      ? location.pathname === "/reports"
                      : item.name === "Calendar"
                        ? location.pathname === "/calendar"
                        : item.name === "Task management"
                          ? location.pathname === "/tasks"
                          : false;

                return (
                  <li key={itemIdx}>
                    <button
                      onClick={() => {
                        if (item.name === "Dashboard") {
                          navigate({ to: `/${currentDepartmentId}` });
                        } else if (item.name === "Reports") {
                          navigate({ to: "/reports" });
                        } else if (item.name === "Calendar") {
                          navigate({ to: "/calendar" });
                        } else if (item.name === "Task management") {
                          navigate({ to: "/tasks" });
                        }
                        if (onClose) onClose();
                      }}
                      className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                        isActive
                          ? "bg-gray-100 text-gray-900"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      <item.icon
                        className={`mr-3 h-4 w-4 ${
                          isActive ? "text-gray-900" : "text-gray-400"
                        }`}
                      />
                      {item.name}
                    </button>
                  </li>
                );
              })}
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
                  const sectionId = item.name
                    .toLowerCase()
                    .replace(/\s+/g, "-");
                  const isActive = location.pathname.includes(
                    `/${currentDepartmentId}/${sectionId}`,
                  );

                  return (
                    <li key={itemIdx}>
                      <button
                        onClick={() =>
                          handleSectionClick(item.name, !!hasSubItems)
                        }
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md ${
                          isActive
                            ? "bg-blue-50 text-blue-700"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        }`}
                      >
                        <div className="flex items-center">
                          <item.icon
                            className={`mr-3 h-4 w-4 ${isActive ? "text-blue-700" : "text-gray-400"}`}
                          />
                          {item.name}
                        </div>
                        {hasSubItems &&
                          (isExpanded ? (
                            <ChevronUp
                              className={`h-4 w-4 ${isActive ? "text-blue-700" : "text-gray-400"}`}
                            />
                          ) : (
                            <ChevronDown
                              className={`h-4 w-4 ${isActive ? "text-blue-700" : "text-gray-400"}`}
                            />
                          ))}
                      </button>

                      {hasSubItems && isExpanded && (
                        <ul className="mt-1 space-y-1 pl-10 pr-3">
                          {item.subItems!.map((subItem, subIdx) => (
                            <li key={subIdx}>
                              <button
                                onClick={() => {
                                  // In a real app, this might navigate to a specific tab
                                  if (onClose) onClose();
                                }}
                                className="w-full text-left block py-1.5 text-sm text-gray-500 hover:text-gray-900"
                              >
                                {subItem}
                              </button>
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
                <p className="text-sm font-medium text-gray-900 truncate">
                  Gusenga thierry
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {currentDepartment.role}
                </p>
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
                      onClick={() => handleDepartmentChange(dept.id)}
                      className={`w-full text-left px-4 py-2 text-sm ${
                        currentDepartmentId === dept.id
                          ? "bg-blue-50 text-blue-700 font-medium"
                          : "text-gray-700 hover:bg-gray-50"
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
    </>
  );
}
