import React from 'react';
import { DotsThree, Sparkle, ArrowRight } from '@phosphor-icons/react';

const generateData = () => {
  const cols = 12;
  const rows = 12;
  const data: number[] = [];
  for (let i = 0; i < cols; i++) {
    const height = Math.floor(Math.random() * 5) + 2;
    data.push(height);
  }
  return { data, rows };
};

const { data, rows } = generateData();

export default function RevenueBreakdown() {
  return (
    <div className="bg-card rounded-xl border border-border p-6 flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xs font-bold text-t3 uppercase tracking-wider">Revenue Breakdown</h2>
        <button className="p-1.5 bg-surface rounded-lg text-t3 hover:bg-surface-hover transition-colors">
          <DotsThree size={16} weight="bold" />
        </button>
      </div>

      <div className="mb-4">
        <div className="text-xs text-t3 mb-1">Revenue by category</div>
        <div className="flex justify-between items-end">
          <div className="text-2xl font-bold text-t1">20,320 RWF</div>
          <select className="text-xs border border-border rounded-lg px-2 py-1 bg-surface text-t2 outline-none">
            <option>Jan 1-Aug 30</option>
          </select>
        </div>
      </div>

      <button className="w-full flex items-center justify-between px-4 py-3 bg-surface hover:bg-surface-hover border border-border rounded-xl mb-8 transition-colors">
        <div className="flex items-center text-sm font-medium text-t1">
          <Sparkle size={15} weight="duotone" className="mr-2 text-accent" />
          Get AI insight for better analysis
        </div>
        <ArrowRight size={15} weight="bold" className="text-t3" />
      </button>

      <div className="flex-1 flex flex-col justify-end">
        <div className="flex items-end justify-between pb-4">
          {data.map((height, colIdx) => (
            <div key={colIdx} className="flex flex-col-reverse space-y-reverse space-y-[4px] w-[6%]">
              {Array.from({ length: rows }).map((_, rowIdx) => (
                <div
                  key={rowIdx}
                  className={`w-full aspect-square rounded-sm ${rowIdx < height ? 'bg-t1' : 'bg-surface'}`}
                />
              ))}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs text-t3 pt-4 border-t border-dashed border-border">
          <span>1 jan</span>
          <span>30 jan 2026</span>
        </div>
      </div>
    </div>
  );
}
