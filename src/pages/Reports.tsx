import React, { useState } from 'react';
import {
  DownloadSimple,
  CalendarDots,
  TrendUp,
  Users,
  CurrencyDollar,
  Truck,
  Package,
  Pulse,
  FileText,
  Funnel,
  MagnifyingGlass
} from '@phosphor-icons/react';

interface ReportItem {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: React.ElementType;
  lastGenerated: string;
  format: string[];
}

const reportCategories = [
  'All Reports',
  'Finance',
  'Transport',
  'Operations',
  'Inventory',
  'HR',
  'Procurement'
];

const defaultReports: ReportItem[] = [
  {
    id: '1',
    title: 'Revenue Report',
    description: 'Monthly revenue breakdown by department',
    category: 'Finance',
    icon: CurrencyDollar,
    lastGenerated: '2 hours ago',
    format: ['PDF', 'Excel', 'CSV']
  },
  {
    id: '2',
    title: 'Employee Attendance',
    description: 'Daily attendance tracking and summary',
    category: 'HR',
    icon: Users,
    lastGenerated: '1 day ago',
    format: ['PDF', 'Excel']
  },
  {
    id: '3',
    title: 'Fleet Performance',
    description: 'Vehicle utilization and efficiency metrics',
    category: 'Transport',
    icon: Truck,
    lastGenerated: '3 days ago',
    format: ['PDF', 'Excel', 'CSV']
  },
  {
    id: '4',
    title: 'Inventory Status',
    description: 'Current stock levels and movement analysis',
    category: 'Inventory',
    icon: Package,
    lastGenerated: '5 hours ago',
    format: ['PDF', 'Excel']
  },
  {
    id: '5',
    title: 'Profit & Loss',
    description: 'Comprehensive P&L statement for the period',
    category: 'Finance',
    icon: TrendUp,
    lastGenerated: '1 week ago',
    format: ['PDF', 'Excel', 'CSV']
  },
  {
    id: '6',
    title: 'Operational Efficiency',
    description: 'Key performance indicators and metrics',
    category: 'Operations',
    icon: Pulse,
    lastGenerated: '2 days ago',
    format: ['PDF', 'Excel']
  },
  {
    id: '7',
    title: 'Procurement Summary',
    description: 'Purchase orders and supplier performance',
    category: 'Procurement',
    icon: FileText,
    lastGenerated: '4 days ago',
    format: ['PDF', 'Excel', 'CSV']
  },
  {
    id: '8',
    title: 'Payroll Report',
    description: 'Employee compensation and deductions',
    category: 'HR',
    icon: Users,
    lastGenerated: '1 month ago',
    format: ['PDF', 'Excel']
  },
];

export default function Reports() {
  const [selectedCategory, setSelectedCategory] = useState('All Reports');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDateRange, setSelectedDateRange] = useState('Last 30 Days');

  const filteredReports = defaultReports.filter((report) => {
    const matchesCategory = selectedCategory === 'All Reports' || report.category === selectedCategory;
    const matchesMagnifyingGlass = report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesMagnifyingGlass;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-t1">Reports</h2>
          <p className="text-sm text-t2 mt-1">Generate and download comprehensive reports</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent-h transition-colors">
          <DownloadSimple className="w-4 h-4" />
          Export All
        </button>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* MagnifyingGlass */}
          <div className="flex-1 relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-t3" />
            <input
              type="text"
              placeholder="MagnifyingGlass reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-xl text-sm outline-none focus:border-accent focus:ring-1 focus:ring-[#1e3a8a]"
            />
          </div>

          {/* Date Range */}
          <select
            value={selectedDateRange}
            onChange={(e) => setSelectedDateRange(e.target.value)}
            className="px-4 py-2 border border-border rounded-xl text-sm text-t2 outline-none cursor-pointer hover:bg-surface"
          >
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
            <option>Last 90 Days</option>
            <option>This Year</option>
            <option>Custom Range</option>
          </select>

          {/* Funnel Button */}
          <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-sm text-t2 hover:bg-surface">
            <Funnel className="w-4 h-4" />
            More Filters
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {reportCategories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === category
                ? 'bg-accent text-white'
                : 'bg-card text-t2 border border-border hover:bg-surface'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReports.map((report) => (
          <div
            key={report.id}
            className="bg-card rounded-xl border border-border p-6 hover:shadow-lg transition-shadow cursor-pointer group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-accent/10 rounded-xl">
                <report.icon className="w-6 h-6 text-accent" />
              </div>
              <span className="text-xs text-t2">{report.lastGenerated}</span>
            </div>

            <h3 className="text-base font-semibold text-t1 mb-1 group-hover:text-accent transition-colors">
              {report.title}
            </h3>
            <p className="text-sm text-t2 mb-4">{report.description}</p>

            <div className="flex items-center justify-between">
              <span className="text-xs px-2 py-1 bg-surface text-t2 rounded">
                {report.category}
              </span>
              <div className="flex gap-2">
                {report.format.map((fmt) => (
                  <button
                    key={fmt}
                    className="text-xs px-2 py-1 bg-accent/10 text-accent rounded hover:bg-accent/20 transition-colors"
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredReports.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-t3 mx-auto mb-4" />
          <p className="text-t2">No reports found matching your criteria</p>
        </div>
      )}
    </div>
  );
}
