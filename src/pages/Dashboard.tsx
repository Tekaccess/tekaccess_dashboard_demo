import React from "react";
import { CalendarDots, DownloadSimple, Money, ReceiptX, TrendUp, ChartBar, Truck, Timer, CheckCircle, Users, type Icon } from "@phosphor-icons/react";
import StatCard from "../components/StatCard";
import SalesTrend from "../components/SalesTrend";
import RevenueBreakdown from "../components/RevenueBreakdown";
import RecentTransactions from "../components/RecentTransactions";
import KPIScoreCard from "../components/KPIScoreCard";
import RecentPayroll from "../components/RecentPayroll";
import AttendanceRate from "../components/AttendanceRate";
import TotalEmployee from "../components/TotalEmployee";
import AttendanceDetail from "../components/AttendanceDetail";
import DayoffRequest from "../components/DayoffRequest";
import { departmentsData } from "../data/navigation";

interface DashboardProps {
  currentDepartmentId: string;
}

const departmentStats: Record<string, { title: string; value: string; change: string; isPositive: boolean; subtitle: string; icon: Icon }[]> = {
  finance: [
    { title: "Total Revenue", value: "20,320 RWF", change: "+12.5%", isPositive: true, subtitle: "All income sources", icon: Money },
    { title: "Total Expenses", value: "15,400 RWF", change: "-1.2%", isPositive: false, subtitle: "Operational costs", icon: ReceiptX },
    { title: "Net Profit", value: "4,920 RWF", change: "+8.3%", isPositive: true, subtitle: "After all deductions", icon: TrendUp },
    { title: "Growth Rate", value: "12%", change: "+2.1%", isPositive: true, subtitle: "Month over month", icon: ChartBar },
  ],
  procurement: [
    { title: "Purchase Orders", value: "1,284", change: "+12.5%", isPositive: true, subtitle: "From all shipments", icon: Truck },
    { title: "Active Suppliers", value: "482", change: "+4.1%", isPositive: true, subtitle: "Currently on route", icon: Users },
    { title: "Avg. Delivery Time", value: "4h 12m", change: "-18m", isPositive: true, subtitle: "Faster than avg", icon: Timer },
    { title: "On-time Rate", value: "98.2%", change: "-0.4%", isPositive: false, subtitle: "Target: 99.0%", icon: CheckCircle },
  ],
};

const defaultStats: { title: string; value: string; change: string; isPositive: boolean; subtitle: string; icon: Icon }[] = [
  { title: "Total Revenue", value: "20,320 RWF", change: "+12.5%", isPositive: true, subtitle: "All income sources", icon: Money },
  { title: "Total Expenses", value: "15,400 RWF", change: "-1.2%", isPositive: false, subtitle: "Operational costs", icon: ReceiptX },
  { title: "Net Profit", value: "4,920 RWF", change: "+8.3%", isPositive: true, subtitle: "After all deductions", icon: TrendUp },
  { title: "Growth Rate", value: "12%", change: "+2.1%", isPositive: true, subtitle: "Month over month", icon: ChartBar },
];

export default function Dashboard({ currentDepartmentId }: DashboardProps) {
  const currentDepartment = departmentsData.find((d) => d.id === currentDepartmentId) || departmentsData[0];
  const stats = departmentStats[currentDepartmentId] || defaultStats;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-t1">Operations overview</h2>
          <p className="text-xs text-t3 mt-0.5">
            Last updated: Today, 14:32 PM
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-lg text-xs font-medium text-t2 hover:bg-surface transition-colors">
            <CalendarDots size={13} weight="duotone" className="text-t3" />
            6 Nov 2025
            <svg className="w-3 h-3 text-t3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-h text-white text-xs font-semibold rounded-lg transition-colors shadow-sm shadow-accent/20">
            <DownloadSimple size={13} weight="bold" />
            Export
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <StatCard key={idx} {...stat} />
        ))}
      </div>

      {/* HR Dashboard widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <KPIScoreCard />
        <RecentPayroll />
        <AttendanceRate />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <TotalEmployee />
        <div className="lg:col-span-2"><AttendanceDetail /></div>
      </div>

      {/* Finance charts */}
      <div className="border-t border-border pt-6">
        <h3 className="text-sm font-semibold text-t1 mb-4">
          Finance Overview — <span className="text-t3 font-normal">{currentDepartment.name}</span>
        </h3>

        <div className="mt-4">
          <RecentTransactions />
        </div>
      </div>
    </div>
  );
}
