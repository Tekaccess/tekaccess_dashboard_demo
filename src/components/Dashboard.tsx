import React from 'react';
import { Calendar, Download } from 'lucide-react';
import StatCard from './StatCard';
import SalesTrend from './SalesTrend';
import RevenueBreakdown from './RevenueBreakdown';
import RecentTransactions from './RecentTransactions';
import { departmentsData } from '../data/navigation';

interface DashboardProps {
  currentDepartmentId: string;
}

export default function Dashboard({ currentDepartmentId }: DashboardProps) {
  const currentDepartment = departmentsData.find(d => d.id === currentDepartmentId) || departmentsData[0];
  
  const statItems = currentDepartment.sections[0]?.items || [];
  
  const defaultStats = [
    { title: "TOTAL REVENUE", value: "20,320 RWF", change: "0,94", isPositive: true },
    { title: "TOTAL EXPENSES", value: "15,400 RWF", change: "1,20", isPositive: false },
    { title: "NET PROFIT", value: "4,920 RWF", change: "0,50", isPositive: true },
    { title: "GROWTH", value: "12%", change: "2,10", isPositive: true }
  ];

  const displayStats = Array.from({ length: 4 }).map((_, idx) => {
    if (statItems[idx]) {
      return {
        title: statItems[idx].name,
        value: "20,320 RWF",
        change: "0,94",
        isPositive: true
      };
    }
    return defaultStats[idx];
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Welcome & Actions */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Welcome back , Thierry</h2>
        <div className="flex items-center space-x-3">
          <button className="flex items-center px-4 py-2 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
            Daily
            <svg className="ml-2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </button>
          <button className="flex items-center px-4 py-2 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
            6 Nov 2025
          </button>
          <button className="flex items-center px-4 py-2 bg-[#4A4B4D] text-white rounded-md text-sm font-medium hover:bg-[#3a3b3d]">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">
        <div className="lg:col-span-2 h-full">
          <SalesTrend />
        </div>
        <div className="h-full">
          <RevenueBreakdown />
        </div>
      </div>

      {/* Table */}
      <RecentTransactions />
    </div>
  );
}
