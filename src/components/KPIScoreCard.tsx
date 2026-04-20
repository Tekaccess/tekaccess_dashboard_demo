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
    <div className="bg-card rounded-xl border border-[var(--border)] p-6 flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium text-t2">Average KPI Score</h3>
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="text-xs border border-[var(--border)] rounded-lg px-2 py-1 bg-surface text-t2 outline-none cursor-pointer hover:bg-surface-hover transition-colors"
        >
          <option>Last 90 Days</option>
          <option>Last 30 Days</option>
          <option>Last 7 Days</option>
        </select>
      </div>

      <div className="flex items-end gap-2 mb-4">
        <span className="text-3xl font-bold text-t1">{score}</span>
        <span className="text-sm text-t3 mb-1">/5</span>
        <span className="flex items-center text-xs text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full mb-1">
          <TrendingUp className="w-3 h-3 mr-1" />
          4.8%
        </span>
      </div>

      <div className="flex items-end justify-between gap-3 flex-1 mb-4">
        {monthlyData.map((data, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center gap-2">
            <div className="w-full relative flex justify-center">
              <div
                className={`w-full rounded-t-md transition-all ${
                  data.value === maxVal ? 'bg-accent' : 'bg-[var(--accent-glow)]'
                }`}
                style={{ height: `${(data.value / 100) * 120}px`, minHeight: '20px' }}
              >
                <span className={`absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-medium ${
                  data.value === maxVal ? 'text-accent' : 'text-t3'
                }`}>
                  {data.value}%
                </span>
              </div>
            </div>
            <span className="text-xs text-t3">{data.month}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-[var(--border)] pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-t1">Below Average Employee</p>
            <p className="text-xs text-t3">{totalEmployees} Employees</p>
          </div>
          <button className="p-2 hover:bg-surface rounded-lg transition-colors">
            <svg className="w-4 h-4 text-t3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
        </div>
        <div className="flex -space-x-2 mt-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="w-8 h-8 rounded-full bg-[var(--accent-glow)] border-2 border-card flex items-center justify-center text-xs font-medium text-accent"
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
