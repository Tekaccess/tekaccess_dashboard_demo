import React from 'react';
import { DotsThree } from '@phosphor-icons/react';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const yAxis = ['60k', '50k', '40k', '30k', '20k', '10k', '0k'];

const generateData = () => {
  const cols = 52;
  const rows = 12;
  const data: number[] = [];
  for (let i = 0; i < cols; i++) {
    const height = Math.floor(Math.random() * 6) + 1 + (Math.random() > 0.8 ? 4 : 0);
    data.push(height);
  }
  return { data, rows, cols };
};

const { data, rows } = generateData();

export default function SalesTrend() {
  return (
    <div className="bg-card rounded-xl border border-border p-6 flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
          <h2 className="text-xs font-bold text-t3 uppercase tracking-wider">Sales Trend</h2>
          <div className="w-4 h-4 rounded-full bg-surface"></div>
        </div>
        <button className="p-1.5 bg-surface rounded-lg text-t3 hover:bg-surface-hover transition-colors">
          <DotsThree size={16} weight="bold" />
        </button>
      </div>

      <div className="flex justify-between items-end mb-6">
        <div>
          <div className="text-sm text-t3 mb-1">
            Total revenue <span className="text-2xl font-bold text-t1 ml-2">20,320 RWF</span>
          </div>
        </div>
        <div className="flex bg-surface rounded-lg p-1 border border-border">
          <button className="px-3 py-1 text-xs font-medium text-t3 hover:text-t1 rounded transition-colors">Weekly</button>
          <button className="px-3 py-1 text-xs font-medium bg-card text-t1 shadow-sm rounded transition-colors">Monthly</button>
          <button className="px-3 py-1 text-xs font-medium text-t3 hover:text-t1 rounded transition-colors">Yearly</button>
        </div>
      </div>

      <div className="flex-1 flex">
        <div className="flex flex-col justify-between text-xs text-t3 pr-4 pb-6">
          {yAxis.map((label, i) => (
            <div key={i} className="flex items-center h-4">
              {label}
              <div className="w-1 h-1 rounded-full bg-border ml-2"></div>
            </div>
          ))}
        </div>

        <div className="flex-1 flex flex-col relative">
          <div className="absolute inset-0 flex flex-col justify-between pb-6 pointer-events-none">
            {yAxis.map((_, i) => (
              <div key={i} className="w-full border-t border-border-s h-4"></div>
            ))}
          </div>

          <div className="flex-1 flex items-end justify-between pb-2 z-10">
            {data.map((height, colIdx) => (
              <div key={colIdx} className="flex flex-col-reverse space-y-reverse space-y-[2px] w-[1.5%]">
                {Array.from({ length: rows }).map((_, rowIdx) => (
                  <div
                    key={rowIdx}
                    className={`w-full aspect-square rounded-sm ${rowIdx < height ? 'bg-t1' : 'bg-surface'}`}
                  />
                ))}
              </div>
            ))}
          </div>

          <div className="flex justify-between text-xs text-t3 pt-2 border-t border-border-s">
            {months.map((month, i) => (
              <div key={i}>{month}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
