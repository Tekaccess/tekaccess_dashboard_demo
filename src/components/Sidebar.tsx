import React, { useState } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { CaretDown, CaretUp, XIcon, UserPlus, Buildings, UserPlusIcon, CaretUpIcon, CaretDownIcon, BuildingsIcon } from "@phosphor-icons/react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { sharedMenu, departmentsData } from "../data/navigation";
import Logo from "./Logo";
import { useAuth } from "../contexts/AuthContext";

const EXPLICIT_ROUTES: Record<string, string> = {
  "transport/fleet": "/transport/fleet",
  "transport/trips": "/transport/trips",
  "transport/fuel": "/transport/fuel",
  "transport/maintenance": "/transport/maintenance",
  "procurement/purchase-orders": "/procurement/purchase-orders",
  "procurement/projects": "/procurement/projects",
  "procurement/suppliers": "/procurement/suppliers",
  "procurement/shipments": "/procurement/shipments",
  "transport/spare-parts": "/procurement/spare-parts",
  "procurement/transporters": "/procurement/transporters",
  "procurement/reports": "/procurement/reports",
  "procurement/invoices": "/procurement/invoices",
  "operations/contracts": "/operations/contracts",
  "operations/deliveries": "/operations/deliveries",
  "operations/sites": "/operations/sites",
  "operations/clients": "/operations/clients",
  "operations/products": "/inventory/products",
  "operations/stock": "/inventory/stock",
  "operations/movements": "/inventory/movements",
  "operations/documents": "/inventory/documents",
  "operations/warehouses": "/inventory/warehouses",
  "operations/crushing-sites": "/inventory/crushing-sites",
  "operations/loading-sites": "/inventory/loading-sites",
  "finance/approvals": "/finance/approvals",
  "executive/employees": "/admin",
};

// Maps each frontend department id to the backend dashboardAccess slugs that grant access.
const DEPT_ACCESS_SLUGS: Record<string, string[]> = {
  executive:   ["executive"],
  finance:     ["finance"],
  transport:   ["transport"],
  operations:  ["operations", "inventory"],
  procurement: ["procurement"],
  sales:       ["sales"],
  data_team:   ["data_entry"],
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

  const dashboardOrder = user?.preferences?.dashboardOrder ?? [];

  const sortByOrder = (depts: typeof departmentsData) => {
    if (dashboardOrder.length === 0) return depts;
    // Build a slug→deptId map from DEPT_ACCESS_SLUGS
    const slugToDeptId: Record<string, string> = {};
    for (const [deptId, slugs] of Object.entries(DEPT_ACCESS_SLUGS)) {
      for (const slug of slugs) slugToDeptId[slug] = deptId;
    }
    // Order: first those present in dashboardOrder, then any remainder
    const ordered = dashboardOrder
      .map(slug => depts.find(d => d.id === slugToDeptId[slug]))
      .filter(Boolean) as typeof departmentsData;
    const rest = depts.filter(d => !ordered.includes(d));
    return [...ordered, ...rest];
  };

  const accessibleDepts = sortByOrder(
    user?.role === 'super_admin'
      ? departmentsData
      : departmentsData.filter((d) =>
          DEPT_ACCESS_SLUGS[d.id]?.some((slug) => user?.dashboardAccess?.includes(slug))
        )
  );

  const hasNoDeptAccess = accessibleDepts.length === 0;
  const currentDepartment = departmentsData.find((d) => d.id === currentDepartmentId) || accessibleDepts[0];

  const visibleSharedItems = hasNoDeptAccess
    ? sharedMenu.items.filter((i) => i.name === "Calendar" || i.name === "Task management")
    : sharedMenu.items;

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
        ? "bg-accent-glow text-accent font-semibold"
        : "text-t2 hover:bg-surface hover:text-t1 font-medium"
    }`;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-40 lg:z-0 w-60 bg-card border-r border-border flex flex-col h-full overflow-hidden shrink-0
          transform transition-transform duration-300 ease-in-out
          lg:relative lg:translate-x-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo */}
        <div className="px-4 h-14 flex items-center justify-between shrink-0 border-b border-border">
          <Logo className="h-8 w-auto object-contain" />
          <button onClick={onClose} className="lg:hidden text-t3 hover:text-t1 transition-colors p-1">
            <XIcon size={16} weight="bold" />
          </button>
        </div>

        {/* Navigation — scrollable */}
        <OverlayScrollbarsComponent
          className="flex-1 px-3 py-4"
          options={{ scrollbars: { autoHide: 'never' } }}
          defer
        >
        <div className="space-y-5">
          {/* Shared Menu */}
          <div>
            <p className="text-[10px] font-bold text-t3 uppercase tracking-widest mb-2 px-2">
              {sharedMenu.title}
            </p>
            <ul className="space-y-0.5">
              {visibleSharedItems.map((item, idx) => {
                const isActive =
                  item.name === "Dashboard"
                    ? location.pathname === "/" || location.pathname === `/${currentDepartmentId}`
                    : item.name === "Reports"
                      ? location.pathname === "/reports"
                      : item.name === "Calendar"
                        ? location.pathname === "/calendar"
                        : item.name === "Task management"
                          ? location.pathname === "/tasks"
                          : item.name === "Projects"
                            ? location.pathname === "/procurement/projects"
                            : false;

                return (
                  <li key={idx}>
                    <button
                      onClick={() => {
                        if (item.name === "Dashboard") navigate({ to: `/${currentDepartmentId}` });
                        else if (item.name === "Reports") navigate({ to: "/reports" });
                        else if (item.name === "Calendar") navigate({ to: "/calendar" });
                        else if (item.name === "Task management") navigate({ to: "/tasks" });
                        else if (item.name === "Projects") navigate({ to: "/procurement/projects" });
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
          {!hasNoDeptAccess && currentDepartment?.sections.map((section, idx) => (
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
        </OverlayScrollbarsComponent>

        {/* Bottom — department switcher only */}
        <div className="shrink-0 border-t border-border p-3 relative">
          <p className="text-[10px] font-bold text-t3 uppercase tracking-widest mb-2 px-1">
            Department
          </p>
          <button
            onClick={() => { if (!hasNoDeptAccess) setIsDeptDropdownOpen(!isDeptDropdownOpen); }}
            disabled={hasNoDeptAccess}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all ${
              hasNoDeptAccess
                ? "border-border bg-surface text-t3 cursor-not-allowed"
                : isDeptDropdownOpen
                  ? "border-accent bg-accent-glow text-accent"
                  : "border-border bg-surface hover:border-accent/40 hover:bg-accent-glow text-t1"
            }`}
          >
            <div className={`h-6 w-6 rounded-md flex items-center justify-center shrink-0 ${
              hasNoDeptAccess ? "bg-surface" : isDeptDropdownOpen ? "bg-accent/20" : "bg-accent-glow"
            }`}>
              <BuildingsIcon size={20} weight="duotone" className={hasNoDeptAccess ? "text-t3" : "text-accent"} />
            </div>
            <span className={`flex-1 text-left text-xs font-semibold truncate ${hasNoDeptAccess ? "italic" : ""}`}>
              {hasNoDeptAccess
                ? "No department assigned"
                : currentDepartment?.name.replace(' Department', '')}
            </span>
            {!hasNoDeptAccess && (isDeptDropdownOpen
              ? <CaretUpIcon size={15} weight="bold" className="text-accent shrink-0" />
              : <CaretDownIcon size={15} weight="bold" className="text-t3 shrink-0" />
            )}
          </button>

          {isDeptDropdownOpen && !hasNoDeptAccess && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsDeptDropdownOpen(false)} />
              <div className="absolute bottom-[60%] left-3 right-3 mb-2 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-[10px] font-bold text-t3 uppercase tracking-widest">Switch Department</p>
              </div>
              <OverlayScrollbarsComponent
                className="max-h-52"
                options={{ scrollbars: { autoHide: 'never' } }}
                defer
              >
              <div className="py-1.5 space-y-0.5 px-1.5">
                {accessibleDepts.map((dept) => {
                  const isSelected = currentDepartmentId === dept.id;
                  return (
                    <button
                      key={dept.id}
                      onClick={() => handleDepartmentChange(dept.id)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-all ${
                        isSelected
                          ? "bg-accent-glow text-accent font-semibold"
                          : "text-t2 hover:bg-surface hover:text-t1 font-medium"
                      }`}
                    >
                      {dept.name.replace(' Department', '')}
                    </button>
                  );
                })}
              </div>
              </OverlayScrollbarsComponent>
            </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
