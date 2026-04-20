import React from "react";
import {
  createRouter,
  createRoute,
  createRootRoute,
} from "@tanstack/react-router";
import RootLayout from "./components/RootLayout";
import Dashboard from "./pages/Dashboard";
import SectionPage from "./pages/SectionPage";
import Reports from "./pages/Reports";
import Calendar from "./pages/Calendar";
import TaskManagement from "./pages/TaskManagement";

import LoginPage from "./pages/auth/LoginPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import AdminPage from "./pages/AdminPage";
import PurchaseOrdersPage from "./pages/PurchaseOrdersPage";
import SuppliersPage from "./pages/SuppliersPage";
import ShipmentsPage from "./pages/ShipmentsPage";
import SparePartsPage from "./pages/SparePartsPage";

export const rootRoute = createRootRoute({
  component: RootLayout,
});

// ── Auth Routes ────────────────────────────────────────────────────────────
export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

export const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/forgot-password",
  component: ForgotPasswordPage,
});

export const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: AdminPage,
});

// ── Shared Routes ──────────────────────────────────────────────────────────
export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => <Dashboard currentDepartmentId="finance" />,
});

export const departmentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/$departmentId",
  component: function DepartmentDashboard() {
    const { departmentId } = departmentRoute.useParams();
    return <Dashboard currentDepartmentId={departmentId} />;
  },
});

export const sectionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/$departmentId/$sectionId",
  component: function Section() {
    const { departmentId, sectionId } = sectionRoute.useParams();
    return <SectionPage departmentId={departmentId} sectionId={sectionId} />;
  },
});

// ── Explicit Procurement Routes ─────────────────────────────────────────────
const purchaseOrdersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/procurement/purchase-orders",
  component: PurchaseOrdersPage,
});

const suppliersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/procurement/suppliers",
  component: SuppliersPage,
});

const shipmentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/procurement/shipments",
  component: ShipmentsPage,
});

const sparePartsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/procurement/spare-parts",
  component: SparePartsPage,
});

// ── Route Tree ──────────────────────────────────────────────────────────────
const routeTree = rootRoute.addChildren([
  indexRoute,
  departmentRoute,
  sectionRoute,
  loginRoute,
  forgotPasswordRoute,
  adminRoute,
  // Shared top-level pages
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/reports",
    component: Reports,
  }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/calendar",
    component: Calendar,
    }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/tasks",
    component: TaskManagement,
  }),
  // Procurement explicit pages
  purchaseOrdersRoute,
  suppliersRoute,
  shipmentsRoute,
  sparePartsRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
