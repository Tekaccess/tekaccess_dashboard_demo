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
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import AdminPage from "./pages/AdminPage";
import PurchaseOrdersPage from "./pages/PurchaseOrdersPage";
import SuppliersPage from "./pages/SuppliersPage";
import ShipmentsPage from "./pages/ShipmentsPage";
import SparePartsPage from "./pages/SparePartsPage";
import ContractsPage from "./pages/operations/ContractsPage";
import DeliveriesPage from "./pages/operations/DeliveriesPage";
import SitesPage from "./pages/operations/SitesPage";
import ClientsPage from "./pages/operations/ClientsPage";
import StockItemsPage from "./pages/inventory/StockItemsPage";
import WarehousesPage from "./pages/inventory/WarehousesPage";
import MovementsPage from "./pages/inventory/MovementsPage";
import StockCountsPage from "./pages/inventory/StockCountsPage";
import ProcurementReportsPage from "./pages/ProcurementReportsPage";
import FleetPage from "./pages/transport/FleetPage";
import TripsPage from "./pages/transport/TripsPage";
import FuelPage from "./pages/transport/FuelPage";
import MaintenancePage from "./pages/transport/MaintenancePage";

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

export const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reset-password",
  component: ResetPasswordPage,
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

const procurementReportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/procurement/reports",
  component: ProcurementReportsPage,
});

// ── Explicit Transport Routes ───────────────────────────────────────────────
const fleetRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/transport/fleet",
  component: FleetPage,
});

const tripsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/transport/trips",
  component: TripsPage,
});

const fuelRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/transport/fuel",
  component: FuelPage,
});

const maintenanceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/transport/maintenance",
  component: MaintenancePage,
});

// ── Explicit Operations Routes ──────────────────────────────────────────────
const contractsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/operations/contracts",
  component: ContractsPage,
});

const deliveriesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/operations/deliveries",
  component: DeliveriesPage,
});

const sitesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/operations/sites",
  component: SitesPage,
});

const opClientsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/operations/clients",
  component: ClientsPage,
});

// ── Explicit Inventory Routes ───────────────────────────────────────────────
const stockItemsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/inventory/stock",
  component: StockItemsPage,
});

const warehousesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/inventory/warehouses",
  component: WarehousesPage,
});

const movementsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/inventory/movements",
  component: MovementsPage,
});

const stockCountsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/inventory/stock-counts",
  component: StockCountsPage,
});

// ── Route Tree ──────────────────────────────────────────────────────────────
const routeTree = rootRoute.addChildren([
  indexRoute,
  departmentRoute,
  sectionRoute,
  loginRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
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
  // Transport explicit pages
  fleetRoute,
  tripsRoute,
  fuelRoute,
  maintenanceRoute,
  // Procurement explicit pages
  purchaseOrdersRoute,
  suppliersRoute,
  shipmentsRoute,
  sparePartsRoute,
  procurementReportsRoute,
  // Operations explicit pages
  contractsRoute,
  deliveriesRoute,
  sitesRoute,
  opClientsRoute,
  // Inventory explicit pages
  stockItemsRoute,
  warehousesRoute,
  movementsRoute,
  stockCountsRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
