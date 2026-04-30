import React, { useEffect, useMemo, useState } from 'react';
import { Spinner, SignIn, SignOut, Clock, CheckCircle, XCircle, Warning } from '@phosphor-icons/react';
import { apiListEmployees, Employee } from '../../lib/api';

type AttendanceStatus = 'present' | 'late' | 'absent' | 'half-day';

interface AttendanceRecord {
  date: string; // YYYY-MM-DD
  employeeId: string;
  status: AttendanceStatus;
  clockIn: string | null;  // ISO
  clockOut: string | null; // ISO
}

const STATUS_STYLES: Record<AttendanceStatus, { chip: string; dot: string; label: string }> = {
  present:    { chip: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-500', label: 'Present' },
  late:       { chip: 'bg-amber-500/10 text-amber-500 border-amber-500/20',       dot: 'bg-amber-500',   label: 'Late' },
  absent:     { chip: 'bg-rose-500/10 text-rose-400 border-rose-500/20',           dot: 'bg-rose-500',    label: 'Absent' },
  'half-day': { chip: 'bg-blue-500/10 text-blue-400 border-blue-500/20',           dot: 'bg-blue-500',    label: 'Half Day' },
};

const STORAGE_KEY = 'tekaccess.demo.attendance';
const WORK_START_HOUR = 8;
const LATE_THRESHOLD_HOUR = 8.5; // 08:30

function loadAttendance(): AttendanceRecord[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}
function saveAttendance(rs: AttendanceRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rs));
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function classifyClockIn(date: Date): AttendanceStatus {
  const fractionalHour = date.getHours() + date.getMinutes() / 60;
  if (fractionalHour > LATE_THRESHOLD_HOUR) return 'late';
  return 'present';
}

export default function AttendancePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    apiListEmployees().then(r => {
      if (r.success) {
        setEmployees(r.data.employees);
        setSelectedEmployee(r.data.employees[0]?._id || '');
      }
      setRecords(loadAttendance());
      setLoading(false);
    });
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const todayRecord = useMemo(() => {
    return records.find(r => r.date === todayKey() && r.employeeId === selectedEmployee) || null;
  }, [records, selectedEmployee]);

  const monthRecords = useMemo(() => {
    if (!selectedEmployee) return [];
    const monthPrefix = todayKey().slice(0, 7);
    return records.filter(r => r.employeeId === selectedEmployee && r.date.startsWith(monthPrefix));
  }, [records, selectedEmployee]);

  const monthStats = useMemo(() => {
    const t = { present: 0, late: 0, absent: 0, halfDay: 0, totalHours: 0 };
    for (const r of monthRecords) {
      if (r.status === 'present') t.present++;
      else if (r.status === 'late') t.late++;
      else if (r.status === 'absent') t.absent++;
      else if (r.status === 'half-day') t.halfDay++;
      if (r.clockIn && r.clockOut) {
        const ms = new Date(r.clockOut).getTime() - new Date(r.clockIn).getTime();
        t.totalHours += ms / 3_600_000;
      }
    }
    return t;
  }, [monthRecords]);

  function clockIn() {
    if (!selectedEmployee) return;
    const status = classifyClockIn(new Date());
    const next: AttendanceRecord = {
      date: todayKey(),
      employeeId: selectedEmployee,
      status,
      clockIn: new Date().toISOString(),
      clockOut: null,
    };
    setRecords(prev => {
      const filtered = prev.filter(r => !(r.date === next.date && r.employeeId === next.employeeId));
      const updated = [next, ...filtered];
      saveAttendance(updated);
      return updated;
    });
  }

  function clockOut() {
    if (!todayRecord) return;
    setRecords(prev => {
      const updated = prev.map(r =>
        r.date === todayRecord.date && r.employeeId === todayRecord.employeeId
          ? { ...r, clockOut: new Date().toISOString() }
          : r
      );
      saveAttendance(updated);
      return updated;
    });
  }

  function markAbsent(date: string) {
    if (!selectedEmployee) return;
    setRecords(prev => {
      const filtered = prev.filter(r => !(r.date === date && r.employeeId === selectedEmployee));
      const updated = [{ date, employeeId: selectedEmployee, status: 'absent' as AttendanceStatus, clockIn: null, clockOut: null }, ...filtered];
      saveAttendance(updated);
      return updated;
    });
  }

  // Build a calendar grid for the current month.
  const calendar = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (AttendanceRecord | { date: string; placeholder: true } | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const rec = monthRecords.find(r => r.date === date);
      cells.push(rec || { date, placeholder: true });
    }
    return cells;
  }, [monthRecords]);

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size={28} className="animate-spin text-accent" /></div>;

  const selectedEmployeeName = employees.find(e => e._id === selectedEmployee)?.fullName || '';
  const isClockedIn = !!(todayRecord?.clockIn && !todayRecord.clockOut);
  const todayHours = todayRecord?.clockIn
    ? ((todayRecord.clockOut ? new Date(todayRecord.clockOut).getTime() : now.getTime()) - new Date(todayRecord.clockIn).getTime()) / 3_600_000
    : 0;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-t1">Attendance</h1>
        <p className="text-sm text-t3 mt-1">Clock in/out, daily status, monthly summary</p>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-500">
        Demo mode — attendance is saved in your browser only. Backend persistence is the next step.
      </div>

      {/* Employee selector */}
      <div>
        <label className="block text-xs text-t3 mb-1">Viewing attendance for</label>
        <select
          className="w-full max-w-sm px-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 outline-none focus:border-accent"
          value={selectedEmployee}
          onChange={e => setSelectedEmployee(e.target.value)}
        >
          {employees.map(e => <option key={e._id} value={e._id}>{e.fullName}</option>)}
        </select>
      </div>

      {/* Today */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Today</p>
            <p className="text-3xl font-bold text-t1 mt-1">
              {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-xs text-t3">{now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            {todayRecord && (
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${STATUS_STYLES[todayRecord.status].chip}`}>
                  {STATUS_STYLES[todayRecord.status].label}
                </span>
                {todayRecord.clockIn && (
                  <span className="text-xs text-t2">
                    In: <span className="font-semibold">{new Date(todayRecord.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </span>
                )}
                {todayRecord.clockOut && (
                  <span className="text-xs text-t2">
                    Out: <span className="font-semibold">{new Date(todayRecord.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </span>
                )}
                {todayRecord.clockIn && (
                  <span className="text-xs text-t2">
                    Hours: <span className="font-semibold">{todayHours.toFixed(2)}h</span>
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            {!isClockedIn ? (
              <button
                type="button"
                onClick={clockIn}
                disabled={!!todayRecord?.clockOut}
                className="px-5 py-3 bg-accent text-white rounded-xl text-sm font-bold hover:bg-accent-h transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                <SignIn size={16} weight="bold" /> Clock In
              </button>
            ) : (
              <button
                type="button"
                onClick={clockOut}
                className="px-5 py-3 bg-rose-500 text-white rounded-xl text-sm font-bold hover:bg-rose-600 transition-colors inline-flex items-center gap-2"
              >
                <SignOut size={16} weight="bold" /> Clock Out
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Monthly KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle size={14} weight="duotone" className="text-emerald-400" />
            <p className="text-xs text-t3">Present</p>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{monthStats.present}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-1">
            <Warning size={14} weight="duotone" className="text-amber-500" />
            <p className="text-xs text-t3">Late</p>
          </div>
          <p className="text-2xl font-bold text-amber-500">{monthStats.late}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle size={14} weight="duotone" className="text-rose-400" />
            <p className="text-xs text-t3">Absent</p>
          </div>
          <p className="text-2xl font-bold text-rose-400">{monthStats.absent}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={14} weight="duotone" className="text-blue-400" />
            <p className="text-xs text-t3">Half Day</p>
          </div>
          <p className="text-2xl font-bold text-blue-400">{monthStats.halfDay}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={14} weight="duotone" className="text-accent" />
            <p className="text-xs text-t3">Hours This Month</p>
          </div>
          <p className="text-2xl font-bold text-accent">{monthStats.totalHours.toFixed(0)}h</p>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-t1">{now.toLocaleDateString([], { month: 'long', year: 'numeric' })} · {selectedEmployeeName}</p>
          <p className="text-[11px] text-t3">Work day starts at {WORK_START_HOUR}:00 · Late after {Math.floor(LATE_THRESHOLD_HOUR)}:{String((LATE_THRESHOLD_HOUR % 1) * 60).padStart(2, '0')}</p>
        </div>
        <div className="grid grid-cols-7 gap-2 text-center">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-[10px] font-black text-t3 uppercase tracking-widest pb-2">{d}</div>
          ))}
          {calendar.map((cell, i) => {
            if (cell === null) return <div key={i} className="aspect-square" />;
            const isPlaceholder = 'placeholder' in cell;
            const date = cell.date;
            const day = parseInt(date.slice(-2), 10);
            const isFuture = new Date(date) > new Date();
            const isToday = date === todayKey();
            if (isPlaceholder) {
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => !isFuture && markAbsent(date)}
                  disabled={isFuture}
                  className={`aspect-square rounded-lg border text-xs font-medium flex flex-col items-center justify-center gap-0.5 transition-colors ${
                    isToday ? 'border-accent bg-accent/5' : 'border-border bg-surface/50'
                  } ${isFuture ? 'opacity-40 cursor-not-allowed' : 'hover:border-rose-500/40 cursor-pointer text-t3'}`}
                  title={isFuture ? '' : 'Click to mark absent'}
                >
                  <span>{day}</span>
                </button>
              );
            }
            const s = STATUS_STYLES[cell.status];
            return (
              <div
                key={i}
                className={`aspect-square rounded-lg border text-xs font-bold flex flex-col items-center justify-center gap-0.5 ${s.chip} ${isToday ? 'ring-2 ring-accent ring-offset-1 ring-offset-card' : ''}`}
                title={`${s.label}${cell.clockIn ? ` · in ${new Date(cell.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}`}
              >
                <span>{day}</span>
                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
