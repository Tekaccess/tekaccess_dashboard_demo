import React from 'react';
import { ArrowUpRight } from 'lucide-react';

interface PayrollEntry {
  name: string;
  role?: string;
  date: string;
  amount: number;
  status: 'Success' | 'Delay';
}

interface RecentPayrollProps {
  entries?: PayrollEntry[];
}

const defaultEntries: PayrollEntry[] = [
  { name: 'Michelle Martin', date: 'September 23, 2024', amount: 3200, status: 'Success' },
  { name: 'Jorge Pérez', date: 'September 23, 2024', amount: 5000, status: 'Success' },
  { name: 'Priyanka Kumar', date: 'September 23, 2024', amount: 2900, status: 'Delay' },
  { name: 'Arushi Choudhary', date: 'September 23, 2024', amount: 3200, status: 'Delay' },
  { name: 'Ruth Anderson', date: 'September 23, 2024', amount: 2300, status: 'Success' },
];

const RecentPayroll: React.FC<RecentPayrollProps> = ({ entries = defaultEntries }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 flex flex-col h-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-sm font-medium text-gray-700">Recent Payroll</h3>
        <button className="p-2 bg-[#1e3a8a] text-white rounded-md hover:bg-[#1e40af] transition-colors">
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      {/* Payroll List */}
      <div className="space-y-4">
        {entries.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1e3a8a]/20 flex items-center justify-center text-sm font-medium text-[#1e3a8a]">
                {entry.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{entry.name}</p>
                <p className="text-xs text-gray-500">{entry.date}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">${entry.amount.toLocaleString()}</p>
              <p
                className={`text-xs font-medium ${
                  entry.status === 'Success' ? 'text-green-600' : 'text-orange-500'
                }`}
              >
                {entry.status}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentPayroll;
