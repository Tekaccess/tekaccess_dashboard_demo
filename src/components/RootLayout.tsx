import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from '@tanstack/react-router';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../contexts/AuthContext';

const ALL_DEPT_IDS = ['executive', 'finance', 'transport', 'operations', 'procurement', 'sales', 'admin_hr', 'data_team'];

const DEPT_ACCESS_SLUGS: Record<string, string[]> = {
  executive:   ['executive'],
  finance:     ['finance'],
  transport:   ['transport'],
  operations:  ['operations', 'inventory'],
  procurement: ['procurement'],
  sales:       ['sales'],
  admin_hr:    ['admin', 'hr', 'admin_hr'],
  data_team:   ['data_entry'],
};

function getOrderedDepts(role: string, dashboardAccess: string[], dashboardOrder: string[]): string[] {
  const slugToDeptId: Record<string, string> = {};
  for (const [id, slugs] of Object.entries(DEPT_ACCESS_SLUGS)) {
    for (const s of slugs) slugToDeptId[s] = id;
  }
  const access = role === 'super_admin'
    ? ALL_DEPT_IDS
    : ALL_DEPT_IDS.filter((id) => DEPT_ACCESS_SLUGS[id]?.some((slug) => dashboardAccess?.includes(slug)));
  if (!dashboardOrder?.length) return access;
  const ordered = dashboardOrder.map(s => slugToDeptId[s]).filter(id => id && access.includes(id));
  const rest = access.filter(id => !ordered.includes(id));
  return [...ordered, ...rest];
}

export default function RootLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isInitialising, user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isPublicRoute = ['/login', '/reset-password'].includes(location.pathname);

  const pathParts = location.pathname.split('/').filter(Boolean);
  const firstSegment = pathParts[0] || '';
  const urlDepartmentId = ALL_DEPT_IDS.includes(firstSegment) ? firstSegment : '';

  const accessibleDepts = user ? getOrderedDepts(user.role, user.dashboardAccess, user.preferences?.dashboardOrder ?? []) : [];
  const defaultDept = accessibleDepts[0] ?? 'finance';

  // Remember the last department the user was viewing so navigating to
  // department-agnostic pages (/tasks, /calendar, /reports) doesn't reset it.
  const [lastDepartmentId, setLastDepartmentId] = useState<string>(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('lastDepartmentId') : null;
    return stored && ALL_DEPT_IDS.includes(stored) ? stored : '';
  });

  useEffect(() => {
    if (urlDepartmentId && urlDepartmentId !== lastDepartmentId) {
      setLastDepartmentId(urlDepartmentId);
      window.localStorage.setItem('lastDepartmentId', urlDepartmentId);
    }
  }, [urlDepartmentId, lastDepartmentId]);

  const rememberedDept = lastDepartmentId && accessibleDepts.includes(lastDepartmentId) ? lastDepartmentId : '';
  const currentDepartmentId = urlDepartmentId || rememberedDept;

  useEffect(() => {
    if (!isInitialising && !isAuthenticated && !isPublicRoute) {
      navigate({ to: '/login' });
    }
  }, [isAuthenticated, isInitialising, isPublicRoute, navigate]);

  // Redirect to first accessible dept (or /tasks if none) when the current route is a dept the user can't access.
  useEffect(() => {
    if (isInitialising || !isAuthenticated || isPublicRoute || !user) return;
    if (urlDepartmentId && !accessibleDepts.includes(urlDepartmentId)) {
      navigate({ to: accessibleDepts.length > 0 ? `/${defaultDept}` : '/tasks' });
    }
  }, [isInitialising, isAuthenticated, isPublicRoute, urlDepartmentId, accessibleDepts, defaultDept, navigate, user]);

  if (isPublicRoute) return <Outlet />;
  if (isInitialising) return null;
  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-app font-sans text-t1 overflow-hidden">
      <Sidebar
        currentDepartmentId={currentDepartmentId || defaultDept}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        <Header onMenuClick={() => setIsMobileMenuOpen(true)} />
        <OverlayScrollbarsComponent
          element="main"
          className="flex-1 p-4 sm:p-6"
          options={{ scrollbars: { autoHide: 'never' } }}
          defer
        >
          <Outlet />
        </OverlayScrollbarsComponent>
      </div>
    </div>
  );
}
