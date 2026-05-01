import React, { useEffect } from "react";
import {
  createRouter,
  createRoute,
  createRootRoute,
  useNavigate,
} from "@tanstack/react-router";
import RootLayout from "./components/RootLayout";
import Dashboard from "./pages/Dashboard";
import { useAuth } from "./contexts/AuthContext";
import SectionPage from "./pages/SectionPage";
import Reports from "./pages/Reports";
import Calendar from "./pages/Calendar";
import TaskManagement from "./pages/TaskManagement";

import LoginPage from "./pages/auth/LoginPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import AdminPage from "./pages/AdminPage";
import PurchaseOrdersPage from "./pages/PurchaseOrdersPage";
import ProjectsPage from "./pages/ProjectsPage";
import SuppliersPage from "./pages/SuppliersPage";
import ShipmentsPage from "./pages/ShipmentsPage";
import SparePartsPage from "./pages/SparePartsPage";
import ContractsPage from "./pages/operations/ContractsPage";
import DeliveriesPage from "./pages/operations/DeliveriesPage";
import SitesPage from "./pages/operations/SitesPage";
import ClientsPage from "./pages/operations/ClientsPage";
import ProductsPage from "./pages/inventory/ProductsPage";
import StockRecordsPage from "./pages/inventory/StockRecordsPage";
import WarehousesPage from "./pages/inventory/WarehousesPage";
import CrushingSitesPage from "./pages/inventory/CrushingSitesPage";
import LoadingSitePage from "./pages/inventory/LoadingSitePage";
import MovementsPage from "./pages/inventory/MovementsPage";
import StockHistoryPage from "./pages/inventory/StockHistoryPage";
import DocumentsPage from "./pages/inventory/DocumentsPage";
import ApprovalsPage from "./pages/finance/ApprovalsPage";
import ProcurementReportsPage from "./pages/ProcurementReportsPage";
import TransportersPage from "./pages/TransportersPage";
import FleetPage from "./pages/transport/FleetPage";
import TripsPage from "./pages/transport/TripsPage";
import FuelPage from "./pages/transport/FuelPage";
import MaintenancePage from "./pages/transport/MaintenancePage";
import ProcurementInvoicesPage from "./pages/procurement/InvoicesPage";
import ProcurementContractsPage from "./pages/procurement/ContractsPage";
import HrPerformancePage from "./pages/hr/PerformancePage";
import HrOrgChartPage from "./pages/hr/OrgChartPage";
import HrDocumentsPage from "./pages/hr/DocumentsPage";
import HrAnnouncementsPage from "./pages/hr/AnnouncementsPage";
import HrTimeOffPage from "./pages/hr/TimeOffPage";
import HrAttendancePage from "./pages/hr/AttendancePage";
import HrPayrollPage from "./pages/hr/PayrollPage";
import HrTaskTrackingPage from "./pages/hr/TaskTrackingPage";
import EmployeesPage from "./pages/EmployeesPage";

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

function getFirstDept(user: ReturnType<typeof useAuth>['user']): string {
  if (!user) return ALL_DEPT_IDS[0];
  const slugToDeptId: Record<string, string> = {};
  for (const [id, slugs] of Object.entries(DEPT_ACCESS_SLUGS)) {
    for (const s of slugs) slugToDeptId[s] = id;
  }
  const access = user.role === 'super_admin' ? ALL_DEPT_IDS : ALL_DEPT_IDS.filter(id =>
    DEPT_ACCESS_SLUGS[id]?.some(s => user.dashboardAccess?.includes(s))
  );
  const order = user.preferences?.dashboardOrder ?? [];
  const ordered = [
    ...order.map(s => slugToDeptId[s]).filter(id => id && access.includes(id)),
    ...access.filter(id => !order.map(s => slugToDeptId[s]).includes(id)),
  ];
  return ordered[0] ?? ALL_DEPT_IDS[0];
}

function IndexRedirect() {
  const { user, isInitialising } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isInitialising || !user) return;
    navigate({ to: `/${getFirstDept(user)}`, replace: true });
  }, [user, isInitialising, navigate]);

  return null;
}

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: IndexRedirect,
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

const projectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/procurement/projects",
  component: ProjectsPage,
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

const transportersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/procurement/transporters",
  component: TransportersPage,
});

const procurementReportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/procurement/reports",
  component: ProcurementReportsPage,
});

const procurementInvoicesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/procurement/settlements",
  component: ProcurementInvoicesPage,
});

const procurementContractsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/procurement/contracts",
  component: ProcurementContractsPage,
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

// ── Finance Routes ─────────────────────────────────────────────────────────
const financeApprovalsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/finance/approvals",
  component: ApprovalsPage,
});

// ── Explicit Inventory Routes ───────────────────────────────────────────────
const productsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/inventory/products",
  component: ProductsPage,
});

const stockRecordsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/inventory/stock",
  component: StockRecordsPage,
});

const warehousesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/inventory/warehouses",
  component: WarehousesPage,
});

const crushingSitesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/inventory/crushing-sites",
  component: CrushingSitesPage,
});

const loadingSiteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/inventory/loading-sites",
  component: LoadingSitePage,
});

const movementsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/inventory/movements",
  component: MovementsPage,
});

const stockHistoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/inventory/stock-history",
  component: StockHistoryPage,
});

const documentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/inventory/documents",
  component: DocumentsPage,
});

// ── Admin & HR explicit routes ──────────────────────────────────────────────
const employeesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/employees",
  component: EmployeesPage,
});
const taskManagementRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/task-management",
  component: TaskManagement,
});
const hrPerformanceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/hr/performance",
  component: HrPerformancePage,
});
const hrOrgChartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/hr/org-chart",
  component: HrOrgChartPage,
});
const hrDocumentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/hr/documents",
  component: HrDocumentsPage,
});
const hrAnnouncementsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/hr/announcements",
  component: HrAnnouncementsPage,
});
const hrTimeOffRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/hr/time-off",
  component: HrTimeOffPage,
});
const hrAttendanceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/hr/attendance",
  component: HrAttendancePage,
});
const hrPayrollRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/hr/payroll",
  component: HrPayrollPage,
});
const hrTaskTrackingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/hr/task-tracking",
  component: HrTaskTrackingPage,
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
  projectsRoute,
  suppliersRoute,
  shipmentsRoute,
  sparePartsRoute,
  transportersRoute,
  procurementReportsRoute,
  procurementInvoicesRoute,
  procurementContractsRoute,
  // Operations explicit pages
  contractsRoute,
  deliveriesRoute,
  sitesRoute,
  opClientsRoute,
  // Finance explicit pages
  financeApprovalsRoute,
  // Inventory explicit pages
  productsRoute,
  stockRecordsRoute,
  warehousesRoute,
  crushingSitesRoute,
  loadingSiteRoute,
  movementsRoute,
  stockHistoryRoute,
  documentsRoute,
  // Admin & HR explicit pages
  employeesRoute,
  taskManagementRoute,
  hrPerformanceRoute,
  hrOrgChartRoute,
  hrDocumentsRoute,
  hrAnnouncementsRoute,
  hrTimeOffRoute,
  hrAttendanceRoute,
  hrPayrollRoute,
  hrTaskTrackingRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
