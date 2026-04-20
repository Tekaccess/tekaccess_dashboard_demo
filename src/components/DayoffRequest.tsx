import React from 'react';
import { X, Check } from '@phosphor-icons/react';

interface DayoffRequest {
  id: string;
  name: string;
  role: string;
}

interface DayoffRequestProps {
  requests?: DayoffRequest[];
}

const defaultRequests: DayoffRequest[] = [
  { id: '1', name: 'Rebecca Simmons', role: 'UI Designer' },
  { id: '2', name: 'Carol Anderson', role: 'Marketing Officer' },
  { id: '3', name: 'Yash Devi', role: 'Graphic Designer' },
  { id: '4', name: 'Ximena Rodriguez', role: 'Lead Designer' },
  { id: '5', name: 'Amit Mehta', role: 'Project Manager' },
];

const DayoffRequest: React.FC<DayoffRequestProps> = ({ requests = defaultRequests }) => {
  return (
    <div className="bg-card rounded-xl border border-[var(--border)] p-6">
      <h3 className="text-sm font-medium text-t2 mb-6">Dayoff Request</h3>
      <div className="space-y-4">
        {requests.map((request) => (
          <div key={request.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--accent-glow)] border border-[var(--accent-border)] flex items-center justify-center text-sm font-semibold text-accent">
                {request.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium text-t1">{request.name}</p>
                <p className="text-xs text-t3">{request.role}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors">
                <X size={14} weight="bold" />
              </button>
              <button className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500/20 transition-colors">
                <Check size={14} weight="bold" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DayoffRequest;
