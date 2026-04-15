import React, { useState } from 'react';
import { TrendingUp } from 'lucide-react';

interface AttendanceData {
  month: string;
  present: number;
  late: number;
  absent: number;
}

interface AttendanceRateProps {
  rate?: number;
  data?: AttendanceData[];
}

const defaultData: AttendanceData[] = [
  { month: 'April', present: 75, late: 15, absent: 10 },
  { month: 'May', present: 60, late: 20, absent: 20 },
  { month: 'June', present: 85, late: 10, absent: 5 },
  { month: 'July', present: 70, late: 20, absent: 10 },
  { month: 'August', present: 65, late: 25, absent: 10 },
  { month: 'September', present: 90, late: 5, absent: 5 },
];

const AttendanceRate: React.FC<AttendanceRateProps> = ({ rate = 98, data = defaultData }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('Monthly');
  const maxVal = 100;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 flex flex-col h-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-sm font-medium text-gray-700">Attendance Rate</h3>
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white text-gray-700 outline-none cursor-pointer hover:bg-gray-50"
        >
          <option>Monthly</option>
          <option>Weekly</option>
          <option>Yearly</option>
        </select>
      </div>

      {/* Rate Display */}
      <div className="mb-2">
        <span className="text-4xl font-bold text-gray-900">{rate}%</span>
        <div className="flex items-center mt-2">
          <span className="flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
            <TrendingUp className="w-3 h-3 mr-1" />
            12% better than last month
          </span>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="flex items-end justify-between gap-2 flex-1 mt-6">
        {data.map((item, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex flex-col items-center gap-1" style={{ height: '140px' }}>
              {/* Present */}
              <div
                className="w-full bg-[#1e3a8a] rounded-t-sm transition-all"
                style={{ height: `${(item.present / maxVal) * 100}%` }}
              />
              {/* Late */}
              <div
                className="w-full bg-[#f59e0b]/60 transition-all"
                style={{ height: `${(item.late / maxVal) * 100}%` }}
              />
              {/* Absent */}
              <div
                className="w-full bg-[#10b981]/60 rounded-b-sm transition-all"
                style={{ height: `${(item.absent / maxVal) * 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 mt-2">{item.month}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AttendanceRate;
