import React from 'react';
import { X, Check } from 'lucide-react';

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
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <h3 className="text-sm font-medium text-gray-700 mb-6">Dayoff Request</h3>

      {/* Request List */}
      <div className="space-y-4">
        {requests.map((request) => (
          <div key={request.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1e3a8a]/20 flex items-center justify-center text-sm font-medium text-[#1e3a8a]">
                {request.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{request.name}</p>
                <p className="text-xs text-gray-500">{request.role}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
              <button className="p-2 bg-green-50 text-green-600 rounded-md hover:bg-green-100 transition-colors">
                <Check className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DayoffRequest;
