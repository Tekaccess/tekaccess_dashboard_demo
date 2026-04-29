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
  SpeedometerIcon,
  CheckFatIcon,
  ClipboardTextIcon,
  CalendarDotsIcon,
  GitBranchIcon,
  ShieldWarningIcon,
  ChatTextIcon,
  HardDrivesIcon,
} from "@phosphor-icons/react";


export const sharedMenu = {
  title: "Main menu",
  items: [
    { name: "Dashboard", icon: SpeedometerIcon, active: true },
    { name: "Reports", icon: ClipboardTextIcon },
    { name: "Calendar", icon: CalendarDotsIcon },
    { name: "Task management", icon: CheckFatIcon },
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
          { name: "Finance Overview", icon: CurrencyCircleDollar },
          { name: "Transport Overview", icon: Truck },
          { name: "Operations Overview", icon: Pulse },
          { name: "Inventory Overview", icon: Cube },
          { name: "Procurement Overview", icon: ShoppingCart },
        ],
      },
      {
        title: "Company",
        items: [
          { name: "Company Settings", icon: Buildings },
          {
            name: "Employees",
            icon: Users,
            subItems: ["All Employees", "Add Employee", "Departments"],
          },
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
            subItems: ["Invoices", "Client Payments", "Aging Report"],
          },
          {
            name: "Payables",
            icon: CreditCard,
            subItems: [
              "Supplier Bills",
              "Payment Schedule",
              "Overdue Payables",
            ],
          },
          {
            name: "Banking",
            icon: Buildings,
            subItems: [
              "Bank Accounts",
              "Cash Flow Forecast",
              "Bank Facility Usage",
            ],
          },
          {
            name: "Expenses",
            icon: Receipt,
            subItems: ["All Expenses", "Pending Approval", "By Category"],
          },
          {
            name: "Tax & Compliance",
            icon: CheckSquare,
            subItems: ["Tax Periods", "Filing Status"],
          },
          {
            name: "Approvals",
            icon: CheckFatIcon,
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
            name: "Fleet",
            icon: Truck,
            subItems: ["All Trucks", "Operating", "Idle", "In Maintenance"],
          },
          {
            name: "Trips",
            icon: MapPin,
            subItems: ["Active Trips", "Trip History", "Schedule"],
          },
          {
            name: "Fuel",
            icon: Pulse,
            subItems: ["Fuel Logs", "Fuel Stock", "Anomaly Flags"],
          },
          {
            name: "Maintenance",
            icon: Wrench,
            subItems: [
              "Open Records",
              "Scheduled Services",
              "Maintenance History",
            ],
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
            subItems: [
              "Active Contracts",
              "Contract Progress",
              "Draft / Closed",
            ],
          },
          {
            name: "Deliveries",
            icon: Package,
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
            subItems: ["Loading Sites", "Offloading Sites", "Site Activity"],
          },
          {
            name: "Clients",
            icon: Users,
            subItems: ["Client List", "Satisfaction Ratings"],
          },
        ],
      },
    ],
  },
  {
    id: "inventory",
    name: "Inventory Department",
    role: "Inventory Manager",
    sections: [
      {
        title: "Inventory Department",
        items: [
          { name: "Products", icon: Package },
          { name: "Stock", icon: Cube },
          { name: "Movements", icon: ArrowsCounterClockwise },
          { name: "Documents", icon: ClipboardText },
          { name: "Warehouses", icon: Buildings },
          { name: "Crushing Sites", icon: Buildings },
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
            subItems: [],
          },
          {
            name: "Projects",
            icon: BriefcaseMetal,
            subItems: [],
          },
          {
            name: "Suppliers",
            icon: Handshake,
            subItems: [],
          },
          {
            name: "Shipments",
            icon: Boat,
            subItems: [],
          },
          {
            name: "Spare Parts",
            icon: Gear,
            subItems: [],
          },
          {
            name: "Reports",
            icon: ChartPie,
            subItems: [],
          },
        ],
      },
    ],
  },
  {
    id: "data_team",
    name: "Data Entry",
    role: "Data Engineer",
    sections: [
      {
        title: "Data Team",
        items: [
          {
            name: "Pipelines & Jobs",
            icon: GitBranchIcon,
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
            subItems: ["Pending Requests", "Resolved"],
          },
          {
            name: "System",
            icon: HardDrivesIcon,
            subItems: ["Platform Uptime", "Alert History"],
          },
        ],
      },
    ],
  },
];
