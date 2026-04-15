import React from 'react';

interface AgeGroup {
  label: string;
  percentage: number;
  color: string;
}

interface TotalEmployeeProps {
  total?: number;
  ageGroups?: AgeGroup[];
}

const defaultAgeGroups: AgeGroup[] = [
  { label: '20 - 30 years', percentage: 35, color: '#f59e0b' },
  { label: '30 - 40 years', percentage: 40, color: '#1e3a8a' },
  { label: '40+ years', percentage: 25, color: '#10b981' },
];

const TotalEmployee: React.FC<TotalEmployeeProps> = ({
  total = 1241,
  ageGroups = defaultAgeGroups,
}) => {
  const size = 200;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedOffset = 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 flex flex-col h-full">
      {/* Header */}
      <h3 className="text-sm font-medium text-gray-700 mb-6">Total Employee</h3>

      {/* Donut Chart */}
      <div className="flex justify-center mb-6">
        <div className="relative">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {ageGroups.map((group, idx) => {
              const segmentLength = (group.percentage / 100) * circumference;
              const offset = accumulatedOffset;
              accumulatedOffset += segmentLength;

              return (
                <circle
                  key={idx}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={group.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  className="transition-all duration-300"
                />
              );
            })}
          </svg>
          {/* Center Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-gray-900">
              {total.toLocaleString()}
            </span>
            <span className="text-xs text-gray-500">Employees</span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-3 mt-auto">
        {ageGroups.map((group, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: group.color }}
              />
              <span className="text-sm text-gray-600">{group.label}</span>
            </div>
            <span className="text-sm font-medium text-gray-900">{group.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TotalEmployee;
