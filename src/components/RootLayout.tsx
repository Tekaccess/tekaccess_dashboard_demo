import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from '@tanstack/react-router';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../contexts/AuthContext';

const ALL_DEPT_IDS = ['executive', 'finance', 'transport', 'operations', 'inventory', 'procurement', 'data_team'];

const DEPT_ACCESS_SLUGS: Record<string, string[]> = {
  executive:   ['executive'],
  finance:     ['finance'],
  transport:   ['transport'],
  operations:  ['operations'],
  inventory:   ['inventory'],
  procurement: ['procurement_trading', 'procurement_fleet'],
  data_team:   ['data_entry'],
};

function getAccessibleDepts(role: string, dashboardAccess: string[]): string[] {
  if (role === 'super_admin') return ALL_DEPT_IDS;
  return ALL_DEPT_IDS.filter((id) =>
    DEPT_ACCESS_SLUGS[id]?.some((slug) => dashboardAccess?.includes(slug))
  );
}

export default function RootLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isInitialising, user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isPublicRoute = ['/login', '/forgot-password', '/reset-password'].includes(location.pathname);

  const pathParts = location.pathname.split('/').filter(Boolean);
  const firstSegment = pathParts[0] || '';
  const currentDepartmentId = ALL_DEPT_IDS.includes(firstSegment) ? firstSegment : '';

  const accessibleDepts = user ? getAccessibleDepts(user.role, user.dashboardAccess) : [];
  const defaultDept = accessibleDepts[0] ?? 'finance';

  useEffect(() => {
    if (!isInitialising && !isAuthenticated && !isPublicRoute) {
      navigate({ to: '/login' });
    }
  }, [isAuthenticated, isInitialising, isPublicRoute, navigate]);

  // Redirect to first accessible dept if current route is a dept the user can't access.
  useEffect(() => {
    if (isInitialising || !isAuthenticated || isPublicRoute || !user) return;
    if (currentDepartmentId && !accessibleDepts.includes(currentDepartmentId)) {
      navigate({ to: `/${defaultDept}` });
    }
  }, [isInitialising, isAuthenticated, isPublicRoute, currentDepartmentId, accessibleDepts, defaultDept, navigate, user]);

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
          options={{ scrollbars: { autoHide: 'scroll' } }}
          defer
        >
          <Outlet />
        </OverlayScrollbarsComponent>
      </div>
    </div>
  );
}
