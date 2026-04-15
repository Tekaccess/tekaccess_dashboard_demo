import React from 'react';
import { MoreHorizontal, Sparkles, ArrowRight } from 'lucide-react';

const generateData = () => {
  const cols = 12;
  const rows = 12;
  const data = [];
  for (let i = 0; i < cols; i++) {
    const height = Math.floor(Math.random() * 5) + 2;
    data.push(height);
  }
  return { data, rows, cols };
};

const { data, rows, cols } = generateData();

export default function RevenueBreakdown() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Revenue Breakdown</h2>
        <button className="p-1.5 bg-gray-100 rounded-md text-gray-500 hover:bg-gray-200">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      <div className="mb-4">
        <div className="text-xs text-gray-400 mb-1">Revenue by category</div>
        <div className="flex justify-between items-end">
          <div className="text-2xl font-bold text-gray-900">20,320 RWF</div>
          <select className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white text-gray-700 outline-none">
            <option>Jan 1-Aug 30</option>
          </select>
        </div>
      </div>

      <button className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg mb-8 transition-colors">
        <div className="flex items-center text-sm font-medium text-gray-900">
          <Sparkles className="w-4 h-4 mr-2 text-gray-700" />
          Get AI insight for better analysis
        </div>
        <ArrowRight className="w-4 h-4 text-gray-500" />
      </button>

      <div className="flex-1 flex flex-col justify-end">
        {/* Blocks */}
        <div className="flex items-end justify-between pb-4">
          {data.map((height, colIdx) => (
            <div key={colIdx} className="flex flex-col-reverse space-y-reverse space-y-[4px] w-[6%]">
              {Array.from({ length: rows }).map((_, rowIdx) => (
                <div
                  key={rowIdx}
                  className={`w-full aspect-square rounded-sm ${
                    rowIdx < height ? 'bg-gray-900' : 'bg-gray-200'
                  }`}
                ></div>
              ))}
            </div>
          ))}
        </div>

        {/* X-axis */}
        <div className="flex items-center justify-between text-xs text-gray-400 pt-4 border-t border-dashed border-gray-200">
          <span>1 jan</span>
          <span>30 jan 2026</span>
        </div>
      </div>
    </div>
  );
}
