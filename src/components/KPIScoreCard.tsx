import React, { useState } from 'react';
import { TrendingUp } from 'lucide-react';

interface KPIScoreCardProps {
  score?: number;
  totalEmployees?: number;
}

const KPIScoreCard: React.FC<KPIScoreCardProps> = ({
  score = 4.76,
  totalEmployees = 28,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState('Last 90 Days');

  const monthlyData = [
    { month: 'July', value: 87 },
    { month: 'August', value: 85.6 },
    { month: 'September', value: 90.4 },
  ];

  const maxVal = Math.max(...monthlyData.map((d) => d.value));

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 flex flex-col h-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium text-gray-700">Average KPI Score</h3>
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white text-gray-700 outline-none cursor-pointer hover:bg-gray-50"
        >
          <option>Last 90 Days</option>
          <option>Last 30 Days</option>
          <option>Last 7 Days</option>
        </select>
      </div>

      {/* Score Display */}
      <div className="flex items-end gap-2 mb-4">
        <span className="text-3xl font-bold text-gray-900">{score}</span>
        <span className="text-sm text-gray-500 mb-1">/5</span>
        <span className="flex items-center text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full mb-1">
          <TrendingUp className="w-3 h-3 mr-1" />
          4.8%
        </span>
      </div>

      {/* Bar Chart */}
      <div className="flex items-end justify-between gap-3 flex-1 mb-4">
        {monthlyData.map((data, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center gap-2">
            <div className="w-full relative flex justify-center">
              <div
                className={`w-full rounded-t-md transition-all ${
                  data.value === maxVal
                    ? 'bg-[#1e3a8a]'
                    : 'bg-[#1e3a8a]/20'
                }`}
                style={{
                  height: `${(data.value / 100) * 120}px`,
                  minHeight: '20px',
                }}
              >
                <span
                  className={`absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-medium ${
                    data.value === maxVal ? 'text-[#1e3a8a]' : 'text-gray-500'
                  }`}
                >
                  {data.value}%
                </span>
              </div>
            </div>
            <span className="text-xs text-gray-500">{data.month}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Below Average Employee</p>
            <p className="text-xs text-gray-500">{totalEmployees} Employees</p>
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-md transition-colors">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
        </div>
        {/* Avatar Group */}
        <div className="flex -space-x-2 mt-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="w-8 h-8 rounded-full bg-[#1e3a8a]/20 border-2 border-white flex items-center justify-center text-xs font-medium text-[#1e3a8a]"
            >
              {String.fromCharCode(64 + i)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KPIScoreCard;
