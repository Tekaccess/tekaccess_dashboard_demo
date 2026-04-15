import React from 'react';
import { MoreHorizontal } from 'lucide-react';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'sep', 'Oct', 'Nov', 'Dec'];
const yAxis = ['60k', '50k', '40k', '30k', '20k', '10k', '0k'];

// Generate dummy data for the blocks
const generateData = () => {
  const cols = 52; // roughly weeks in a year
  const rows = 12; // 0k to 60k, each block is 5k
  const data = [];
  for (let i = 0; i < cols; i++) {
    // Random height between 1 and 8 blocks, occasionally higher
    const height = Math.floor(Math.random() * 6) + 1 + (Math.random() > 0.8 ? 4 : 0);
    data.push(height);
  }
  return { data, rows, cols };
};

const { data, rows, cols } = generateData();

export default function SalesTrend() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Sales Trend</h2>
          <div className="w-4 h-4 rounded-full bg-gray-200"></div>
        </div>
        <button className="p-1.5 bg-gray-100 rounded-md text-gray-500 hover:bg-gray-200">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      <div className="flex justify-between items-end mb-6">
        <div>
          <div className="text-sm text-gray-500 mb-1">Total revenue <span className="text-2xl font-bold text-gray-900 ml-2">20,320 RWF</span></div>
        </div>
        <div className="flex bg-gray-50 rounded-md p-1 border border-gray-200">
          <button className="px-3 py-1 text-xs font-medium text-gray-600 hover:text-gray-900 rounded">Weekly</button>
          <button className="px-3 py-1 text-xs font-medium bg-white text-gray-900 shadow-sm rounded">Monthly</button>
          <button className="px-3 py-1 text-xs font-medium text-gray-600 hover:text-gray-900 rounded">Yearly</button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Y-axis */}
        <div className="flex flex-col justify-between text-xs text-gray-400 pr-4 pb-6">
          {yAxis.map((label, i) => (
            <div key={i} className="flex items-center h-4">
              {label}
              <div className="w-1 h-1 rounded-full bg-gray-300 ml-2"></div>
            </div>
          ))}
        </div>

        {/* Chart Area */}
        <div className="flex-1 flex flex-col relative">
          {/* Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between pb-6 pointer-events-none">
            {yAxis.map((_, i) => (
              <div key={i} className="w-full border-t border-gray-100 h-4"></div>
            ))}
          </div>

          {/* Blocks */}
          <div className="flex-1 flex items-end justify-between pb-2 z-10">
            {data.map((height, colIdx) => (
              <div key={colIdx} className="flex flex-col-reverse space-y-reverse space-y-[2px] w-[1.5%]">
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
          <div className="flex justify-between text-xs text-gray-400 pt-2 border-t border-gray-100">
            {months.map((month, i) => (
              <div key={i}>{month}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
