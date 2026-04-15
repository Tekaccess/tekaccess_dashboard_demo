export interface Employee {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
  role: string;
  status: "active" | "inactive" | "on-leave";
  avatar?: string;
  personalInfo: {
    dateOfBirth: string;
    address: string;
    emergencyContact: string;
    emergencyPhone: string;
  };
  contract: {
    type: "full-time" | "part-time" | "contract";
    startDate: string;
    endDate: string | null;
    salary: string;
  };
  kpis: {
    metric: string;
    target: string;
    actual: string;
    status: "on-track" | "at-risk" | "behind";
  }[];
}

export interface DepartmentOverview {
  id: string;
  name: string;
  manager: string;
  employeeCount: number;
  budget: string;
  status: "active" | "restructuring";
  description: string;
}

export const employeesData: Employee[] = [
  {
    id: "EMP001",
    fullName: "Gusenga Thierry",
    email: "thierry.gusenga@tekaccess.com",
    phone: "+250 788 123 456",
    department: "Data Team",
    role: "Data Engineer",
    status: "active",
    personalInfo: {
      dateOfBirth: "1995-03-15",
      address: "Kigali, Rwanda",
      emergencyContact: "Marie Uwineza",
      emergencyPhone: "+250 789 654 321",
    },
    contract: {
      type: "full-time",
      startDate: "2024-01-15",
      endDate: null,
      salary: "450,000 RWF",
    },
    kpis: [
      {
        metric: "Data Pipeline Uptime",
        target: "99.9%",
        actual: "99.8%",
        status: "on-track",
      },
      {
        metric: "Data Quality Score",
        target: "95%",
        actual: "92%",
        status: "on-track",
      },
      {
        metric: "Report Delivery Time",
        target: "< 24 hours",
        actual: "18 hours",
        status: "on-track",
      },
      {
        metric: "Issue Resolution",
        target: "< 4 hours",
        actual: "5.2 hours",
        status: "at-risk",
      },
    ],
  },
];

export const departmentsOverview: DepartmentOverview[] = [
  {
    id: "executive",
    name: "Executive",
    manager: "Gusenga Thierry",
    employeeCount: 3,
    budget: "2,500,000 RWF",
    status: "active",
    description: "Overall company management and strategic planning",
  },
  {
    id: "finance",
    name: "Finance",
    manager: "TBD",
    employeeCount: 5,
    budget: "3,200,000 RWF",
    status: "active",
    description: "Financial operations, accounting, and reporting",
  },
  {
    id: "transport",
    name: "Transport",
    manager: "TBD",
    employeeCount: 12,
    budget: "8,500,000 RWF",
    status: "active",
    description: "Fleet management and logistics operations",
  },
  {
    id: "operations",
    name: "Operations",
    manager: "TBD",
    employeeCount: 8,
    budget: "5,000,000 RWF",
    status: "active",
    description: "Contract management and delivery operations",
  },
  {
    id: "inventory",
    name: "Inventory",
    manager: "TBD",
    employeeCount: 6,
    budget: "4,000,000 RWF",
    status: "active",
    description: "Stock management and warehouse operations",
  },
  {
    id: "procurement",
    name: "Procurement",
    manager: "TBD",
    employeeCount: 4,
    budget: "2,800,000 RWF",
    status: "active",
    description: "Supplier management and purchasing",
  },
  {
    id: "data_team",
    name: "Data Team",
    manager: "Gusenga Thierry",
    employeeCount: 2,
    budget: "1,500,000 RWF",
    status: "active",
    description: "Data engineering, analytics, and reporting",
  },
];
