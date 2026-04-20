import React, { useState } from 'react';
import { MagnifyingGlass, Funnel, ArrowsDownUp, ArrowSquareOut } from '@phosphor-icons/react';

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

const statusStyle = (status: string) => {
  switch (status) {
    case 'Late': return 'bg-amber-500/10 text-amber-500';
    case 'Attend': return 'bg-emerald-500/10 text-emerald-500';
    case 'Absent': return 'bg-red-500/10 text-red-500';
    default: return 'bg-surface text-t3';
  }
};

const AttendanceDetail: React.FC<AttendanceDetailProps> = ({ records = defaultRecords }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRecords = records.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-card rounded-xl border border-[var(--border)] p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h3 className="text-sm font-medium text-t2">Attendance Detail</h3>
        <button className="p-2 hover:bg-surface rounded-lg transition-colors self-end sm:self-auto">
          <ArrowSquareOut size={16} weight="duotone" className="text-t3" />
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <MagnifyingGlass size={15} weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-[var(--border)] rounded-lg text-sm bg-surface text-t1 placeholder-[var(--text-3)] outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-[var(--border)] rounded-lg text-sm text-t2 hover:bg-surface transition-colors">
          <Funnel size={14} weight="duotone" /> Filter
        </button>
        <button className="flex items-center gap-2 px-4 py-2 border border-[var(--border)] rounded-lg text-sm text-t2 hover:bg-surface transition-colors">
          <ArrowsDownUp size={14} weight="duotone" /> Sort By
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {['Employee', 'Check In', 'Check Out', 'Status'].map(h => (
                <th key={h} className="text-left py-3 px-4 text-xs font-medium text-t3 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRecords.map((record) => (
              <tr key={record.id} className="border-b border-[var(--border-s)] hover:bg-surface transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--accent-glow)] border border-[var(--accent-border)] flex items-center justify-center text-xs font-semibold text-accent">
                      {record.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-t1">{record.name}</p>
                      <p className="text-xs text-t3">{record.employeeId}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-t1">{record.checkIn}</td>
                <td className="py-3 px-4 text-sm text-t1">{record.checkOut}</td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusStyle(record.status)}`}>
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
