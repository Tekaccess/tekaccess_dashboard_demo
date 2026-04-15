import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
}

export default function StatCard({ title, value, change, isPositive }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <div className="w-8 h-8 bg-gray-200 rounded"></div>
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-4">{value}</div>
      <div className="flex items-center justify-between mt-auto">
        <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
        </div>
        <div className="text-xs">
          <span className={isPositive ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
            {isPositive ? '+' : ''}{change}
          </span>
          <span className="text-gray-400 ml-1">last year</span>
        </div>
      </div>
    </div>
  );
}
