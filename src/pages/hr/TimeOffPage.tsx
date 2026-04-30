import React, { useEffect, useMemo, useState } from 'react';
import { Spinner, Plus, Check, X, Calendar, ClockCounterClockwise, Umbrella } from '@phosphor-icons/react';
import { apiListEmployees, Employee } from '../../lib/api';

type LeaveType = 'vacation' | 'sick' | 'personal' | 'unpaid';
type LeaveStatus = 'pending' | 'approved' | 'rejected';

interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  submittedAt: string;
  decisionNote?: string;
}

const TYPE_STYLES: Record<LeaveType, string> = {
  vacation: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  sick:     'bg-rose-500/10 text-rose-400 border-rose-500/20',
  personal: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  unpaid:   'bg-surface text-t3 border-border',
};

const STATUS_STYLES: Record<LeaveStatus, string> = {
  pending:  'bg-amber-500/10 text-amber-500 border-amber-500/20',
  approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  rejected: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

const STORAGE_KEY = 'tekaccess.demo.leaveRequests';
const ANNUAL_BALANCE = 21;

// Frontend-only persistence — swap for real API when backend is ready.
function loadRequests(): LeaveRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveRequests(reqs: LeaveRequest[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reqs));
}

function daysBetween(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.round(ms / 86400000) + 1);
}

export default function TimeOffPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    apiListEmployees().then(r => {
      if (r.success) setEmployees(r.data.employees);
      setRequests(loadRequests());
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    return requests
      .filter(r => tab === 'all' || r.status === tab)
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }, [requests, tab]);

  const totals = useMemo(() => {
    const used = requests.filter(r => r.status === 'approved' && r.type === 'vacation')
      .reduce((s, r) => s + r.days, 0);
    return {
      pending: requests.filter(r => r.status === 'pending').length,
      approved: requests.filter(r => r.status === 'approved').length,
      vacationUsed: used,
      vacationRemaining: ANNUAL_BALANCE - used,
    };
  }, [requests]);

  function decide(id: string, status: 'approved' | 'rejected', note?: string) {
    setRequests(prev => {
      const next = prev.map(r => r.id === id ? { ...r, status, decisionNote: note } : r);
      saveRequests(next);
      return next;
    });
  }

  function submitNew(req: Omit<LeaveRequest, 'id' | 'submittedAt' | 'status' | 'days'>) {
    const days = daysBetween(req.startDate, req.endDate);
    const full: LeaveRequest = {
      ...req,
      id: crypto.randomUUID(),
      submittedAt: new Date().toISOString(),
      status: 'pending',
      days,
    };
    setRequests(prev => {
      const next = [full, ...prev];
      saveRequests(next);
      return next;
    });
    setShowForm(false);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size={28} className="animate-spin text-accent" /></div>;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-t1">Time Off & Leave</h1>
          <p className="text-sm text-t3 mt-1">Request leave, approve requests, track balances</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-bold inline-flex items-center gap-2 hover:bg-accent-h transition-colors"
        >
          <Plus size={14} weight="bold" /> New Request
        </button>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-500">
        Demo mode — leave requests are saved in your browser only. Backend persistence is the next step.
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-accent-glow"><Umbrella size={18} weight="duotone" className="text-accent" /></div>
          <div>
            <p className="text-xs text-t3">Vacation Remaining</p>
            <p className="text-2xl font-bold text-t1">{totals.vacationRemaining} <span className="text-sm font-normal text-t3">/ {ANNUAL_BALANCE} d</span></p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10"><ClockCounterClockwise size={18} weight="duotone" className="text-amber-500" /></div>
          <div>
            <p className="text-xs text-t3">Pending Approval</p>
            <p className="text-2xl font-bold text-amber-500">{totals.pending}</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10"><Check size={18} weight="duotone" className="text-emerald-400" /></div>
          <div>
            <p className="text-xs text-t3">Approved (YTD)</p>
            <p className="text-2xl font-bold text-emerald-400">{totals.approved}</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10"><Calendar size={18} weight="duotone" className="text-blue-400" /></div>
          <div>
            <p className="text-xs text-t3">Vacation Used</p>
            <p className="text-2xl font-bold text-blue-400">{totals.vacationUsed} d</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 border-b border-border">
        {(['all', 'pending', 'approved', 'rejected'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors capitalize ${
              tab === t ? 'border-accent text-accent' : 'border-transparent text-t3 hover:text-t1'
            }`}
          >
            {t}{t !== 'all' && requests.filter(r => r.status === t).length > 0 && (
              <span className="ml-1.5 text-[10px] bg-surface px-1.5 py-0.5 rounded-full">
                {requests.filter(r => r.status === t).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-10 text-center">
          <Umbrella size={32} weight="duotone" className="text-t3 opacity-40 mx-auto mb-2" />
          <p className="text-sm text-t3">No leave requests {tab !== 'all' && `with status "${tab}"`} yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <div key={r.id} className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-sm font-bold text-t1">{r.employeeName}</p>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${TYPE_STYLES[r.type]}`}>
                      {r.type}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${STATUS_STYLES[r.status]}`}>
                      {r.status}
                    </span>
                  </div>
                  <p className="text-xs text-t3">
                    {new Date(r.startDate).toLocaleDateString()} → {new Date(r.endDate).toLocaleDateString()} · <span className="font-semibold text-t2">{r.days} {r.days === 1 ? 'day' : 'days'}</span>
                  </p>
                  {r.reason && <p className="text-xs text-t2 mt-1.5">{r.reason}</p>}
                  {r.decisionNote && <p className="text-[11px] text-t3 mt-1 italic">HR note: {r.decisionNote}</p>}
                </div>
                {r.status === 'pending' && (
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => decide(r.id, 'approved')}
                      className="px-3 py-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 rounded-lg hover:bg-emerald-500/20 inline-flex items-center gap-1"
                    >
                      <Check size={11} weight="bold" /> Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => decide(r.id, 'rejected')}
                      className="px-3 py-1.5 text-xs font-bold text-rose-400 bg-rose-500/10 rounded-lg hover:bg-rose-500/20 inline-flex items-center gap-1"
                    >
                      <X size={11} weight="bold" /> Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <RequestForm employees={employees} onClose={() => setShowForm(false)} onSubmit={submitNew} />
      )}
    </div>
  );
}

function RequestForm({ employees, onClose, onSubmit }: {
  employees: Employee[];
  onClose: () => void;
  onSubmit: (req: Omit<LeaveRequest, 'id' | 'submittedAt' | 'status' | 'days'>) => void;
}) {
  const [employeeId, setEmployeeId] = useState(employees[0]?._id || '');
  const [type, setType] = useState<LeaveType>('vacation');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const inp = 'w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent';

  function submit() {
    setError(null);
    const emp = employees.find(e => e._id === employeeId);
    if (!emp) return setError('Pick an employee.');
    if (!startDate || !endDate) return setError('Start and end dates are required.');
    if (new Date(endDate) < new Date(startDate)) return setError('End date must be after start date.');
    onSubmit({
      employeeId,
      employeeName: emp.fullName,
      type,
      startDate,
      endDate,
      reason: reason.trim(),
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl border border-border p-5 max-w-md w-full space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-t1">New Leave Request</p>
          <button type="button" onClick={onClose} className="p-1 text-t3 hover:text-t1"><X size={16} weight="bold" /></button>
        </div>
        {error && <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2">{error}</p>}

        <div>
          <label className="block text-xs text-t3 mb-1">Employee *</label>
          <select className={inp} value={employeeId} onChange={e => setEmployeeId(e.target.value)}>
            {employees.map(e => <option key={e._id} value={e._id}>{e.fullName}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-t3 mb-1">Leave Type *</label>
          <select className={inp} value={type} onChange={e => setType(e.target.value as LeaveType)}>
            <option value="vacation">Vacation</option>
            <option value="sick">Sick Leave</option>
            <option value="personal">Personal</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-t3 mb-1">Start Date *</label>
            <input type="date" className={inp} value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-t3 mb-1">End Date *</label>
            <input type="date" className={inp} value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-xs text-t3 mb-1">Reason</label>
          <textarea className={inp} rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Optional context for the approver" />
        </div>

        <button type="button" onClick={submit} className="w-full py-2.5 bg-accent text-white rounded-lg text-sm font-bold hover:bg-accent-h transition-colors">
          Submit Request
        </button>
      </div>
    </div>
  );
}
