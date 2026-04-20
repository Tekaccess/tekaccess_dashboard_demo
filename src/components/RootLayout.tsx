import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from '@tanstack/react-router';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../contexts/AuthContext';

export default function RootLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isInitialising } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isPublicRoute = ['/login', '/forgot-password', '/reset-password'].includes(location.pathname);

  const DEPT_IDS = ['executive', 'finance', 'transport', 'operations', 'procurement'];
  const pathParts = location.pathname.split('/').filter(Boolean);
  const firstSegment = pathParts[0] || 'finance';
  const currentDepartmentId = DEPT_IDS.includes(firstSegment) ? firstSegment : 'finance';

  useEffect(() => {
    if (!isInitialising && !isAuthenticated && !isPublicRoute) {
      navigate({ to: '/login' });
    }
  }, [isAuthenticated, isInitialising, isPublicRoute, navigate]);

  if (isPublicRoute) return <Outlet />;
  if (isInitialising) return null;
  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-app font-sans text-t1 overflow-hidden">
      <Sidebar
        currentDepartmentId={currentDepartmentId}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        <Header onMenuClick={() => setIsMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
