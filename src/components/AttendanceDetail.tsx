import React, { useState } from 'react';
import { Search, Filter, ArrowUpDown, ExternalLink } from 'lucide-react';

interface AttendanceRecord {
  id: string;
  employeeId: string;
  name: string;
  checkIn: string;
  checkOut: string;
  status: 'Late' | 'Attend' | 'Absent';
}

interface AttendanceDetailProps {
  records?: AttendanceRecord[];
}

const defaultRecords: AttendanceRecord[] = [
  { id: '1', employeeId: '#EMP-12467', name: 'Ankit Mandal', checkIn: '07:02:01', checkOut: '00:00:00', status: 'Late' },
  { id: '2', employeeId: '#EMP-12467', name: 'Ben Hall', checkIn: '07:01:54', checkOut: '00:00:00', status: 'Late' },
  { id: '3', employeeId: '#EMP-12467', name: 'Karan Mehta', checkIn: '07:01:22', checkOut: '00:00:00', status: 'Late' },
  { id: '4', employeeId: '#EMP-12467', name: 'Yuni Nadia Sudiati', checkIn: '06:59:12', checkOut: '00:00:00', status: 'Attend' },
  { id: '5', employeeId: '#EMP-12467', name: 'Abdullah Baghdadi', checkIn: '06:56:43', checkOut: '00:00:00', status: 'Attend' },
  { id: '6', employeeId: '#EMP-12467', name: 'Aisyah Clara Riyanti', checkIn: '06:50:01', checkOut: '00:00:00', status: 'Attend' },
];

const AttendanceDetail: React.FC<AttendanceDetailProps> = ({ records = defaultRecords }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRecords = records.filter(
    (record) =>
      record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Late':
        return 'bg-orange-50 text-orange-600';
      case 'Attend':
        return 'bg-green-50 text-green-600';
      case 'Absent':
        return 'bg-red-50 text-red-600';
      default:
        return 'bg-gray-50 text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h3 className="text-sm font-medium text-gray-700">Attendance Detail</h3>
        <button className="p-2 hover:bg-gray-100 rounded-md transition-colors self-end sm:self-auto">
          <ExternalLink className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md text-sm outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-md text-sm text-gray-700 hover:bg-gray-50">
          <Filter className="w-4 h-4" />
          Filter
        </button>
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-md text-sm text-gray-700 hover:bg-gray-50">
          <ArrowUpDown className="w-4 h-4" />
          Sort By
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Check In</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Check Out</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.map((record) => (
              <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#1e3a8a]/20 flex items-center justify-center text-xs font-medium text-[#1e3a8a]">
                      {record.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{record.name}</p>
                      <p className="text-xs text-gray-500">{record.employeeId}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-gray-900">{record.checkIn}</td>
                <td className="py-3 px-4 text-sm text-gray-900">{record.checkOut}</td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusStyle(record.status)}`}>
                    {record.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AttendanceDetail;
