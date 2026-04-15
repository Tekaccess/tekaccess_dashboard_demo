import {
  LayoutDashboard,
  Bell,
  FileText,
  Calendar,
  Briefcase,
  Users,
  Settings,
  BarChart3,
  Truck,
  Box,
  ShoppingCart,
  Database,
  FileCheck,
  CreditCard,
  Building,
  Receipt,
  FileSpreadsheet,
  Activity,
  MapPin,
  Package,
  RefreshCw,
  ClipboardList,
  AlertTriangle,
  Server
} from 'lucide-react';

export const sharedMenu = {
  title: 'Main menu',
  items: [
    { name: 'Dashboard', icon: LayoutDashboard, active: true },
    { name: 'Reports', icon: FileText },
    { name: 'Calendar', icon: Calendar },
    { name: 'Task management', icon: Briefcase },
  ]
};

export const departmentsData = [
  {
    id: 'executive',
    name: 'Executive Department',
    role: 'Executive',
    sections: [
      {
        title: 'User Management',
        items: [
          { name: 'All Users', icon: Users },
          { name: 'Add User', icon: Users },
          { name: 'Roles & Permissions', icon: Settings },
        ]
      },
      {
        title: 'Departments',
        items: [
          { name: 'Finance Overview', icon: BarChart3 },
          { name: 'Transport Overview', icon: Truck },
          { name: 'Operations Overview', icon: Activity },
          { name: 'Inventory Overview', icon: Box },
          { name: 'Procurement Overview', icon: ShoppingCart },
        ]
      },
      {
        title: 'Company',
        items: [
          { name: 'Company Settings', icon: Building },
        ]
      }
    ]
  },
  {
    id: 'finance',
    name: 'Finance Department',
    role: 'Finance Manager',
    sections: [
      {
        title: 'Finance Department',
        items: [
          { 
            name: 'Receivables', 
            icon: Receipt,
            subItems: ['Invoices', 'Client Payments', 'Aging Report']
          },
          { 
            name: 'Payables', 
            icon: CreditCard,
            subItems: ['Supplier Bills', 'Payment Schedule', 'Overdue Payables']
          },
          { 
            name: 'Banking', 
            icon: Building,
            subItems: ['Bank Accounts', 'Cash Flow Forecast', 'Bank Facility Usage']
          },
          { 
            name: 'Expenses', 
            icon: FileSpreadsheet,
            subItems: ['All Expenses', 'Pending Approval', 'By Category']
          },
          { 
            name: 'Tax & Compliance', 
            icon: FileCheck,
            subItems: ['Tax Periods', 'Filing Status']
          },
        ]
      }
    ]
  },
  {
    id: 'transport',
    name: 'Transport Department',
    role: 'Transport Manager',
    sections: [
      {
        title: 'Transport Department',
        items: [
          {
            name: 'Fleet',
            icon: Truck,
            subItems: ['All Trucks', 'Operating', 'Idle', 'In Maintenance']
          },
          {
            name: 'Trips',
            icon: MapPin,
            subItems: ['Active Trips', 'Trip History', 'Schedule']
          },
          {
            name: 'Fuel',
            icon: Activity,
            subItems: ['Fuel Logs', 'Fuel Stock', 'Anomaly Flags']
          },
          {
            name: 'Maintenance',
            icon: Settings,
            subItems: ['Open Records', 'Scheduled Services', 'Maintenance History']
          }
        ]
      }
    ]
  },
  {
    id: 'operations',
    name: 'Operations Department',
    role: 'Operations Manager',
    sections: [
      {
        title: 'Operations Department',
        items: [
          {
            name: 'Contracts',
            icon: FileText,
            subItems: ['Active Contracts', 'Contract Progress', 'Draft / Closed']
          },
          {
            name: 'Deliveries',
            icon: Package,
            subItems: ['Pending Confirmation', 'Confirmed', 'Disputed', 'Delivery History']
          },
          {
            name: 'Sites',
            icon: MapPin,
            subItems: ['Loading Sites', 'Offloading Sites', 'Site Activity']
          },
          {
            name: 'Clients',
            icon: Users,
            subItems: ['Client List', 'Satisfaction Ratings']
          }
        ]
      }
    ]
  },
  {
    id: 'inventory',
    name: 'Inventory Department',
    role: 'Inventory Manager',
    sections: [
      {
        title: 'Inventory Department',
        items: [
          {
            name: 'Stock',
            icon: Box,
            subItems: ['All Stock Items', 'By Warehouse', 'By Category', 'Reserved Stock']
          },
          {
            name: 'Movements',
            icon: RefreshCw,
            subItems: ['Inbound', 'Outbound', 'Transfers', 'Adjustments']
          },
          {
            name: 'Warehouses',
            icon: Building,
            subItems: ['Warehouse List', 'Capacity Usage']
          },
          {
            name: 'Stock Counts',
            icon: ClipboardList,
            subItems: ['Reconciliation', 'Discrepancy Log']
          }
        ]
      }
    ]
  },
  {
    id: 'procurement',
    name: 'Procurement Department',
    role: 'Procurement Manager',
    sections: [
      {
        title: 'Procurement Department',
        items: [
          {
            name: 'Purchase Orders',
            icon: ShoppingCart,
            subItems: ['Active Orders', 'Pending / Draft', 'Overdue', 'Order History']
          },
          {
            name: 'Suppliers',
            icon: Users,
            subItems: ['Supplier List', 'Performance & Ranking', 'Payment Status']
          },
          {
            name: 'Shipments',
            icon: Truck,
            subItems: ['Incoming Shipments', 'In Transit', 'Delayed']
          },
          {
            name: 'Spare Parts',
            icon: Settings,
            subItems: ['Parts Inventory', 'Low Stock / Reorder Alerts']
          },
          {
            name: 'Reports',
            icon: FileText,
            subItems: ['Cost per Ton', 'Savings', 'Price Trends', 'Cycle Time']
          }
        ]
      }
    ]
  },
  {
    id: 'data_team',
    name: 'Data Team Dashboard',
    role: 'Data Engineer',
    sections: [
      {
        title: 'Data Team',
        items: [
          {
            name: 'Pipelines & Jobs',
            icon: Database,
            subItems: ['All Integrations', 'Snapshot Jobs', 'Data Feeds', 'Backups']
          },
          {
            name: 'Data Quality',
            icon: AlertTriangle,
            subItems: ['Open Issues', 'By Department', 'Validation Errors', 'Consistency Errors']
          },
          {
            name: 'Data Requests',
            icon: FileText,
            subItems: ['Pending Requests', 'Resolved']
          },
          {
            name: 'System',
            icon: Server,
            subItems: ['Platform Uptime', 'Alert History']
          }
        ]
      }
    ]
  }
];
