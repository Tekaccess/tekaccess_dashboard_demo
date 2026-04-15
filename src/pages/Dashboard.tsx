import React from "react";
import { Calendar, Download } from "lucide-react";
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

export default function Dashboard({ currentDepartmentId }: DashboardProps) {
  const currentDepartment =
    departmentsData.find((d) => d.id === currentDepartmentId) ||
    departmentsData[0];

  const statItems = currentDepartment.sections[0]?.items || [];

  const defaultStats = [
    {
      title: "TOTAL REVENUE",
      value: "20,320 RWF",
      change: "0,94",
      isPositive: true,
    },
    {
      title: "TOTAL EXPENSES",
      value: "15,400 RWF",
      change: "1,20",
      isPositive: false,
    },
    {
      title: "NET PROFIT",
      value: "4,920 RWF",
      change: "0,50",
      isPositive: true,
    },
    { title: "GROWTH", value: "12%", change: "2,10", isPositive: true },
  ];

  const displayStats = Array.from({ length: 4 }).map((_, idx) => {
    if (statItems[idx]) {
      return {
        title: statItems[idx].name,
        value: "20,320 RWF",
        change: "0,94",
        isPositive: true,
      };
    }
    return defaultStats[idx];
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Welcome & Actions */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
          Welcome back , Thierry
        </h2>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button className="flex items-center px-3 sm:px-4 py-2 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
            Daily
            <svg
              className="ml-2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 9l-7 7-7-7"
              ></path>
            </svg>
          </button>
          <button className="flex items-center px-3 sm:px-4 py-2 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Calendar className="w-4 h-4 mr-2 text-gray-400" />6 Nov 2025
          </button>
          <button className="flex items-center px-3 sm:px-4 py-2 bg-[#1e3a8a] text-white rounded-md text-sm font-medium hover:bg-[#1e40af]">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* HR Dashboard Components */}
      {/* Top Row: KPI Score, Recent Payroll, Attendance Rate */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="h-full">
          <KPIScoreCard />
        </div>
        <div className="h-full">
          <RecentPayroll />
        </div>
        <div className="h-full">
          <AttendanceRate />
        </div>
      </div>

      {/* Middle Row: Total Employee, Attendance Detail, Dayoff Request */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="h-full">
          <TotalEmployee />
        </div>
        <div className="lg:col-span-2 h-full">
          <AttendanceDetail />
        </div>
      </div>

      {/* Dayoff Request - standalone */}
      <div className="max-w-md">
        <DayoffRequest />
      </div>

      {/* Existing Finance Dashboard Components (shown below) */}
      <div className="border-t border-gray-200 pt-6 mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Finance Overview
        </h3>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
          {displayStats.map((stat, idx) => (
            <StatCard
              key={idx}
              title={stat.title}
              value={stat.value}
              change={stat.change}
              isPositive={stat.isPositive}
            />
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:h-[400px]">
          <div className="lg:col-span-2 h-[300px] lg:h-full">
            <SalesTrend />
          </div>
          <div className="h-[300px] lg:h-full">
            <RevenueBreakdown />
          </div>
        </div>

        {/* Table */}
        <div className="mt-6">
          <RecentTransactions />
        </div>
      </div>
    </div>
  );
}
