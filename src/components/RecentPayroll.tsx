import React from 'react';
import { ArrowUpRight } from '@phosphor-icons/react';

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
    <div className="bg-card rounded-xl border border-[var(--border)] p-6 flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-sm font-medium text-t2">Recent Payroll</h3>
        <button className="p-2 bg-accent text-white rounded-lg hover:bg-accent-h transition-colors">
          <ArrowUpRight size={16} weight="bold" />
        </button>
      </div>

      <div className="space-y-4">
        {entries.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--accent-glow)] border border-[var(--accent-border)] flex items-center justify-center text-sm font-semibold text-accent">
                {entry.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium text-t1">{entry.name}</p>
                <p className="text-xs text-t3">{entry.date}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-t1">${entry.amount.toLocaleString()}</p>
              <p className={`text-xs font-medium ${entry.status === 'Success' ? 'text-emerald-500' : 'text-amber-500'}`}>
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
