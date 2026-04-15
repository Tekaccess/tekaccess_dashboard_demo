import React from 'react';
import { createRouter, createRoute, createRootRoute } from '@tanstack/react-router';
import RootLayout from './components/RootLayout';
import Dashboard from './components/Dashboard';
import SectionPage from './components/SectionPage';

export const rootRoute = createRootRoute({
  component: RootLayout,
});

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <Dashboard currentDepartmentId="finance" />,
});

export const departmentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/$departmentId',
  component: function DepartmentDashboard() {
    const { departmentId } = departmentRoute.useParams();
    return <Dashboard currentDepartmentId={departmentId} />;
  },
});

export const sectionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/$departmentId/$sectionId',
  component: function Section() {
    const { departmentId, sectionId } = sectionRoute.useParams();
    return <SectionPage departmentId={departmentId} sectionId={sectionId} />;
  },
});

const routeTree = rootRoute.addChildren([indexRoute, departmentRoute, sectionRoute]);
export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
