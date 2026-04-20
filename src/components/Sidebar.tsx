import React, { useState } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { CaretDown, CaretUp, XIcon, UserPlus, Buildings, UserPlusIcon, CaretUpIcon, CaretDownIcon, BuildingsIcon } from "@phosphor-icons/react";
import { sharedMenu, departmentsData } from "../data/navigation";
import Logo from "./Logo";
import { useAuth } from "../contexts/AuthContext";

const EXPLICIT_ROUTES: Record<string, string> = {
  "procurement/purchase-orders": "/procurement/purchase-orders",
  "procurement/suppliers": "/procurement/suppliers",
  "procurement/shipments": "/procurement/shipments",
  "procurement/spare-parts": "/procurement/spare-parts",
};

interface SidebarProps {
  currentDepartmentId: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ currentDepartmentId, isOpen = true, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const currentDepartment = departmentsData.find((d) => d.id === currentDepartmentId) || departmentsData[0];

  const toggleExpand = (itemName: string) => {
    setExpandedItems((prev) => ({ ...prev, [itemName]: !prev[itemName] }));
  };

  const handleDepartmentChange = (deptId: string) => {
    setIsDeptDropdownOpen(false);
    navigate({ to: `/${deptId}` });
    if (onClose) onClose();
  };

  const handleSectionClick = (itemName: string, hasSubItems: boolean) => {
    if (hasSubItems) toggleExpand(itemName);
    const sectionId = itemName.toLowerCase().replace(/\s+/g, "-");
    const explicitKey = `${currentDepartmentId}/${sectionId}`;
    const explicitRoute = EXPLICIT_ROUTES[explicitKey];
    if (explicitRoute) {
      navigate({ to: explicitRoute });
    } else {
      navigate({ to: `/${currentDepartmentId}/${sectionId}` });
    }
    if (!hasSubItems && onClose) onClose();
  };

  const navItemClass = (isActive: boolean) =>
    `w-full flex items-center px-3 py-2 text-sm rounded-lg transition-all ${
      isActive
        ? "bg-[var(--accent-glow)] text-accent font-semibold"
        : "text-t2 hover:bg-surface hover:text-t1 font-medium"
    }`;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-60 bg-card border-r border-[var(--border)] flex flex-col h-full overflow-hidden shrink-0
          transform transition-transform duration-300 ease-in-out
          lg:relative lg:translate-x-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo */}
        <div className="px-4 h-[56px] flex items-center justify-between shrink-0 border-b border-[var(--border)]">
          <Logo className="h-8 w-auto object-contain" />
          <button onClick={onClose} className="lg:hidden text-t3 hover:text-t1 transition-colors p-1">
            <XIcon size={16} weight="bold" />
          </button>
        </div>

        {/* Navigation — scrollable */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-hide">
          {/* Admin Menu */}
          {user?.role === "super_admin" && (
            <div>
              <p className="text-[10px] font-bold text-t3 uppercase tracking-widest mb-2 px-2">
                Administration
              </p>
              <ul className="space-y-0.5">
                <li>
                  <button
                    onClick={() => { navigate({ to: "/admin" }); if (onClose) onClose(); }}
                    className={navItemClass(location.pathname === "/admin")}
                  >
                    <UserPlusIcon
                      size={20}
                      weight={location.pathname === "/admin" ? "fill" : "regular"}
                      className={`mr-2.5 shrink-0 ${location.pathname === "/admin" ? "text-accent" : "text-t3"}`}
                    />
                    Add Accounts
                  </button>
                </li>
              </ul>
            </div>
          )}

          {/* Shared Menu */}
          <div>
            <p className="text-[10px] font-bold text-t3 uppercase tracking-widest mb-2 px-2">
              {sharedMenu.title}
            </p>
            <ul className="space-y-0.5">
              {sharedMenu.items.map((item, idx) => {
                const isActive =
                  item.name === "Dashboard"
                    ? location.pathname === "/" || location.pathname === `/${currentDepartmentId}`
                    : item.name === "Reports"
                      ? location.pathname === "/reports"
                      : item.name === "Calendar"
                        ? location.pathname === "/calendar"
                        : item.name === "Task management"
                          ? location.pathname === "/tasks"
                          : false;

                return (
                  <li key={idx}>
                    <button
                      onClick={() => {
                        if (item.name === "Dashboard") navigate({ to: `/${currentDepartmentId}` });
                        else if (item.name === "Reports") navigate({ to: "/reports" });
                        else if (item.name === "Calendar") navigate({ to: "/calendar" });
                        else if (item.name === "Task management") navigate({ to: "/tasks" });
                        if (onClose) onClose();
                      }}
                      className={navItemClass(isActive)}
                    >
                      <item.icon
                        size={20}
                        weight={isActive ? "fill" : "regular"}
                        className={`mr-2.5 shrink-0 ${isActive ? "text-accent" : "text-t3"}`}
                      />
                      {item.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Department Sections */}
          {currentDepartment.sections.map((section, idx) => (
            <div key={idx}>
              <p className="text-[10px] font-bold text-t3 uppercase tracking-widest mb-2 px-2">
                {section.title}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item, itemIdx) => {
                  const isExpanded = expandedItems[item.name];
                  const hasSubItems = item.subItems && item.subItems.length > 0;
                  const sectionId = item.name.toLowerCase().replace(/\s+/g, "-");
                  const explicitKey = `${currentDepartmentId}/${sectionId}`;
                  const explicitRoute = EXPLICIT_ROUTES[explicitKey];
                  const isActive = explicitRoute
                    ? location.pathname === explicitRoute
                    : location.pathname.includes(`/${currentDepartmentId}/${sectionId}`);

                  return (
                    <li key={itemIdx}>
                      <button
                        onClick={() => handleSectionClick(item.name, !!hasSubItems)}
                        className={`${navItemClass(isActive)} justify-between`}
                      >
                        <div className="flex items-center">
                          <item.icon
                            size={20}
                            weight={isActive ? "fill" : "regular"}
                            className={`mr-2.5 shrink-0 ${isActive ? "text-accent" : "text-t3"}`}
                          />
                          {item.name}
                        </div>
                        {hasSubItems && (
                          isExpanded
                            ? <CaretUpIcon size={15} weight="bold" className={isActive ? "text-accent" : "text-t3"} />
                            : <CaretDownIcon size={15} weight="bold" className={isActive ? "text-accent" : "text-t3"} />
                        )}
                      </button>

                      {hasSubItems && isExpanded && (
                        <ul className="mt-0.5 space-y-0.5 pl-8 pr-1">
                          {item.subItems!.map((subItem, subIdx) => (
                            <li key={subIdx}>
                              <button
                                onClick={() => { if (onClose) onClose(); }}
                                className="w-full text-left py-1.5 px-2 text-xs text-t3 hover:text-t1 rounded-md hover:bg-surface transition-colors"
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

        {/* Bottom — department switcher only */}
        <div className="shrink-0 border-t border-[var(--border)] p-3 relative">
          <p className="text-[10px] font-bold text-t3 uppercase tracking-widest mb-2 px-1">
            Department
          </p>
          <button
            onClick={() => setIsDeptDropdownOpen(!isDeptDropdownOpen)}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all ${
              isDeptDropdownOpen
                ? "border-accent bg-[var(--accent-glow)] text-accent"
                : "border-[var(--border)] bg-surface hover:border-accent/40 hover:bg-[var(--accent-glow)] text-t1"
            }`}
          >
            <div className={`h-6 w-6 rounded-md flex items-center justify-center shrink-0 ${
              isDeptDropdownOpen ? "bg-accent/20" : "bg-[var(--accent-glow)]"
            }`}>
              <BuildingsIcon size={20} weight="duotone" className="text-accent" />
            </div>
            <span className="flex-1 text-left text-xs font-semibold truncate">
              {currentDepartment.name.replace(' Department', '')}
            </span>
            {isDeptDropdownOpen
              ? <CaretUpIcon size={15} weight="bold" className="text-accent shrink-0" />
              : <CaretDownIcon size={15} weight="bold" className="text-t3 shrink-0" />
            }
          </button>

          {isDeptDropdownOpen && (
            <div className="absolute bottom-[60%] left-3 right-3 mb-2 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
              <div className="px-3 py-2 border-b border-white/10">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Switch Department</p>
              </div>
              <div className="max-h-52 overflow-y-auto py-1.5 space-y-0.5 px-1.5">
                {departmentsData.map((dept) => {
                  const isSelected = currentDepartmentId === dept.id;
                  return (
                    <button
                      key={dept.id}
                      onClick={() => handleDepartmentChange(dept.id)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-all ${
                        isSelected
                          ? "bg-white/10 text-white font-semibold"
                          : "text-zinc-400 hover:bg-white/5 hover:text-white font-medium"
                      }`}
                    >
                      {dept.name.replace(' Department', '')}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
