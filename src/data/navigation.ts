import {
  SquaresFour,
  ChartBar,
  CalendarDots,
  BriefcaseMetal,
  Users,
  Gear,
  Truck,
  Cube,
  ShoppingCart,
  Database,
  CheckSquare,
  CreditCard,
  Buildings,
  Receipt,
  Pulse,
  MapPin,
  Package,
  ArrowsCounterClockwise,
  ClipboardText,
  Warning,
  HardDrives,
  Handshake,
  Boat,
  Wrench,
  ChartPie,
  FileText,
  GitBranch,
  ShieldWarning,
  ChatText,
  Desktop,
  CurrencyCircleDollar,
  Invoice,
  Storefront,
  SpeedometerIcon,
  CheckFatIcon,
  ClipboardTextIcon,
  CalendarDotsIcon,
  GitBranchIcon,
  ShieldWarningIcon,
  ChatTextIcon,
  HardDrivesIcon,
  ReceiptIcon,
  ChartPieIcon,
} from "@phosphor-icons/react";


export const sharedMenu = {
  title: "Main menu",
  items: [
    { name: "Dashboard", icon: SpeedometerIcon, iconName: "dashboard", active: true },
    { name: "Reports", icon: ClipboardTextIcon, iconName: "reports" },
    { name: "Calendar", icon: CalendarDotsIcon, iconName: "calendar" },
    { name: "Task management", icon: CheckFatIcon, iconName: "tasks" },
    { name: "Projects", icon: BriefcaseMetal, iconName: "projects" },
  ],
};

export const departmentsData = [
  {
    id: "executive",
    name: "Executive Department",
    role: "Executive",
    sections: [
      {
        title: "Departments",
        items: [
          { name: "Finance Overview", icon: CurrencyCircleDollar, iconName: "money" },
          { name: "Transport Overview", icon: Truck, iconName: "truck" },
          { name: "Operations Overview", icon: Pulse, iconName: "pulse" },
          { name: "Procurement Overview", icon: ShoppingCart, iconName: "cart" },
        ],
      },
      {
        title: "Company",
        items: [
          { name: "Company Settings", icon: Buildings, iconName: "buildings" },
          { name: "Employees", icon: Users, iconName: "users" },
        ],
      },
    ],
  },
  {
    id: "finance",
    name: "Finance Department",
    role: "Finance Manager",
    sections: [
      {
        title: "Finance Department",
        items: [
          {
            name: "Receivables",
            icon: Invoice,
            iconName: "invoice",
            subItems: ["Invoices", "Client Payments", "Aging Report"],
          },
          {
            name: "Payables",
            icon: CreditCard,
            iconName: "credit-card",
            subItems: [
              "Supplier Bills",
              "Payment Schedule",
              "Overdue Payables",
            ],
          },
          {
            name: "Banking",
            icon: Buildings,
            iconName: "buildings",
            subItems: [
              "Bank Accounts",
              "Cash Flow Forecast",
              "Bank Facility Usage",
            ],
          },
          {
            name: "Expenses",
            icon: Receipt,
            iconName: "receipt",
            subItems: ["All Expenses", "Pending Approval", "By Category"],
          },
          {
            name: "Tax & Compliance",
            icon: CheckSquare,
            iconName: "shield-check",
            subItems: ["Tax Periods", "Filing Status"],
          },
          {
            name: "Invoices",
            icon: Invoice,
            iconName: "invoice",
            path: "/finance/invoices",
          },
          {
            name: "Approvals",
            icon: CheckFatIcon,
            iconName: "approval",
            path: "/finance/approvals",
          },
        ],
      },
    ],
  },
  {
    id: "transport",
    name: "Transport Department",
    role: "Transport Manager",
    sections: [
      {
        title: "Transport Department",
        items: [
          {
            name: "Allocations",
            icon: ClipboardText,
            iconName: "clipboard",
            path: "/transport/allocations",
          },
          {
            name: "Fleet",
            icon: Truck,
            iconName: "truck",
            subItems: ["All Trucks", "Operating", "Idle", "In Maintenance"],
          },
          {
            name: "Trips",
            icon: MapPin,
            iconName: "map-pin",
            subItems: ["Active Trips", "Trip History", "Schedule"],
          },
          {
            name: "Fuel",
            icon: Pulse,
            iconName: "fuel",
            subItems: ["Fuel Logs", "Fuel Stock", "Anomaly Flags"],
          },
          {
            name: "Maintenance",
            icon: Wrench,
            iconName: "wrench",
            subItems: [
              "Open Records",
              "Scheduled Services",
              "Maintenance History",
            ],
          },
          {
            name: "Spare Parts",
            icon: Gear,
            iconName: "gear",
            subItems: [],
          },
        ],
      },
    ],
  },
  {
    id: "operations",
    name: "Operations Department",
    role: "Operations Manager",
    sections: [
      {
        title: "Operations Department",
        items: [
          {
            name: "Contracts",
            icon: FileText,
            iconName: "file-text",
            subItems: [
              "Active Contracts",
              "Contract Progress",
              "Draft / Closed",
            ],
          },
          {
            name: "Deliveries",
            icon: Package,
            iconName: "package",
            subItems: [
              "Pending Confirmation",
              "Confirmed",
              "Disputed",
              "Delivery History",
            ],
          },
          {
            name: "Sites",
            icon: MapPin,
            iconName: "map-pin",
            subItems: ["Loading Sites", "Offloading Sites", "Site Activity"],
          },
          {
            name: "Clients",
            icon: Users,
            iconName: "users",
            subItems: ["Client List", "Satisfaction Ratings"],
          },
          // { name: "Products", icon: Package },
          { name: "Stock", icon: Cube, iconName: "cube" },
          { name: "Movements", icon: ArrowsCounterClockwise, iconName: "refresh" },
          { name: "Documents", icon: ClipboardText, iconName: "clipboard" },
          { name: "Warehouses", icon: Buildings, iconName: "warehouse" },
        ],
      },
    ],
  },
  {
    id: "procurement",
    name: "Procurement Department",
    role: "Procurement Manager",
    sections: [
      {
        title: "Procurement Department",
        items: [
          {
            name: "Purchase Orders",
            icon: ShoppingCart,
            iconName: "cart",
            subItems: [],
          },
          {
            name: "Contracts",
            icon: FileText,
            iconName: "file-text",
            subItems: [],
          },
          {
            name: "Suppliers",
            icon: Handshake,
            iconName: "handshake",
            subItems: [],
          },
          {
            name: "Shipments",
            icon: Boat,
            iconName: "boat",
            subItems: [],
          },
          {
            name: "Transporters",
            icon: Truck,
            iconName: "truck",
            subItems: [],
          },
          {
            name: "Settlements",
            icon: ReceiptIcon,
            iconName: "receipt",
            subItems: [],
          },
          {
            name: "Reports",
            icon: ChartPieIcon,
            iconName: "chart-pie",
            subItems: [],
          },
        ],
      },
    ],
  },
  {
    id: "sales",
    name: "Sales Department",
    role: "Sales Manager",
    sections: [
      {
        title: "Sales Department",
        items: [
          // Sales owns the customer relationship. Both Clients and Contracts
          // are shared with Operations — same component, same data,
          // mounted under /sales/* so the active department stays Sales.
          {
            name: "Clients",
            icon: Users,
            iconName: "users",
            subItems: [],
          },
          {
            name: "Contracts",
            icon: FileText,
            iconName: "file-text",
            subItems: [],
          },
          {
            name: "Invoices",
            icon: Invoice,
            subItems: [],
          },
        ],
      },
    ],
  },
  {
    id: "admin_hr",
    name: "Admin & HR",
    role: "HR Manager",
    sections: [
      {
        title: "People",
        items: [
          { name: "Employees", icon: Users, iconName: "users", path: "/employees" },
          { name: "Org Chart", icon: BriefcaseMetal, iconName: "projects", path: "/hr/org-chart" },
          { name: "Performance", icon: ChartPie, iconName: "chart-pie", path: "/hr/performance" },
          { name: "Attendance", icon: CheckFatIcon, iconName: "approval", path: "/hr/attendance" },
          { name: "Time Off", icon: CalendarDotsIcon, iconName: "calendar", path: "/hr/time-off" },
          { name: "Payroll", icon: CurrencyCircleDollar, iconName: "money", path: "/hr/payroll" },
        ],
      },
      {
        title: "Workspace",
        items: [
          { name: "Task Tracking", icon: CheckFatIcon, iconName: "tasks", path: "/hr/task-tracking" },
          { name: "Announcements", icon: ChatTextIcon, iconName: "chat", path: "/hr/announcements" },
          { name: "HR Documents", icon: FileText, iconName: "file-text", path: "/hr/documents" },
        ],
      },
    ],
  },
  {
    id: "data_team",
    name: "IT & Development",
    role: "IT Developer",
    sections: [
      {
        title: "IT & Development",
        items: [
          {
            name: "Pipelines & Jobs",
            icon: GitBranchIcon,
            iconName: "git-branch",
            subItems: [
              "All Integrations",
              "Snapshot Jobs",
              "Data Feeds",
              "Backups",
            ],
          },
          {
            name: "Data Quality",
            icon: ShieldWarningIcon,
            iconName: "shield-warning",
            subItems: [
              "Open Issues",
              "By Department",
              "Validation Errors",
              "Consistency Errors",
            ],
          },
          {
            name: "Data Requests",
            icon: ChatTextIcon,
            iconName: "chat",
            subItems: ["Pending Requests", "Resolved"],
          },
          {
            name: "System",
            icon: HardDrivesIcon,
            iconName: "server",
            subItems: ["Platform Uptime", "Alert History"],
          },
        ],
      },
    ],
  },
];
