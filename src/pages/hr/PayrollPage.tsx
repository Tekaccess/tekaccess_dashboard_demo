import React, { useEffect, useMemo, useState } from 'react';
import { Spinner, Plus, CurrencyCircleDollar, CheckCircle, Clock, X, Download } from '@phosphor-icons/react';
import { apiListEmployees, Employee } from '../../lib/api';

type PayslipStatus = 'pending' | 'paid' | 'failed';

interface Payslip {
  employeeId: string;
  employeeName: string;
  baseSalary: number;
  bonuses: number;
  deductions: number;
  net: number;
  status: PayslipStatus;
}

interface PayrollRun {
  id: string;
  period: string; // YYYY-MM
  generatedAt: string;
  payslips: Payslip[];
  status: 'draft' | 'finalized' | 'paid';
}

const STORAGE_KEY = 'tekaccess.demo.payroll';
const CURRENCY = 'RWF';

function loadRuns(): PayrollRun[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}
function saveRuns(rs: PayrollRun[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rs));
}

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M ${CURRENCY}`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K ${CURRENCY}`;
  return `${n.toLocaleString()} ${CURRENCY}`;
}

function parseSalary(raw: string | null): number {
  if (!raw) return 0;
  const num = parseFloat(String(raw).replace(/[^0-9.]/g, ''));
  return isNaN(num) ? 0 : num;
}

function periodLabel(period: string): string {
  const [y, m] = period.split('-');
  return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString([], { month: 'long', year: 'numeric' });
}

const STATUS_STYLES: Record<PayrollRun['status'], string> = {
  draft:     'bg-surface text-t3 border-border',
  finalized: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  paid:      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

const PAYSLIP_STATUS_STYLES: Record<PayslipStatus, string> = {
  pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  paid:    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  failed:  'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

export default function PayrollPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [openRun, setOpenRun] = useState<PayrollRun | null>(null);

  useEffect(() => {
    apiListEmployees().then(r => {
      if (r.success) setEmployees(r.data.employees);
      setRuns(loadRuns());
      setLoading(false);
    });
  }, []);

  const sortedRuns = useMemo(() =>
    [...runs].sort((a, b) => b.period.localeCompare(a.period)), [runs]);

  const totalPaidYTD = useMemo(() => {
    const yearPrefix = new Date().getFullYear().toString();
    return runs
      .filter(r => r.period.startsWith(yearPrefix) && r.status === 'paid')
      .reduce((s, r) => s + r.payslips.reduce((s2, p) => s2 + p.net, 0), 0);
  }, [runs]);

  function generateRun(period: string) {
    const active = employees.filter(e => e.status === 'active');
    const payslips: Payslip[] = active.map(e => {
      const base = parseSalary(e.contract.salary);
      return {
        employeeId: e._id,
        employeeName: e.fullName,
        baseSalary: base,
        bonuses: 0,
        deductions: 0,
        net: base,
        status: 'pending',
      };
    });
    const run: PayrollRun = {
      id: crypto.randomUUID(),
      period,
      generatedAt: new Date().toISOString(),
      payslips,
      status: 'draft',
    };
    setRuns(prev => {
      const next = [run, ...prev];
      saveRuns(next);
      return next;
    });
    setShowNew(false);
    setOpenRun(run);
  }

  function updateRun(updated: PayrollRun) {
    setRuns(prev => {
      const next = prev.map(r => r.id === updated.id ? updated : r);
      saveRuns(next);
      return next;
    });
    setOpenRun(updated);
  }

  function deleteRun(id: string) {
    setRuns(prev => {
      const next = prev.filter(r => r.id !== id);
      saveRuns(next);
      return next;
    });
    setOpenRun(null);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size={28} className="animate-spin text-accent" /></div>;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-t1">Payroll</h1>
          <p className="text-sm text-t3 mt-1">Monthly payroll runs and payslips</p>
        </div>
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-bold inline-flex items-center gap-2 hover:bg-accent-h transition-colors"
        >
          <Plus size={14} weight="bold" /> New Payroll Run
        </button>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-500">
        Demo mode — payroll data is saved in your browser only. Backend persistence is the next step.
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-accent-glow"><CurrencyCircleDollar size={18} weight="duotone" className="text-accent" /></div>
          <div>
            <p className="text-xs text-t3">Paid YTD</p>
            <p className="text-2xl font-bold text-t1">{formatMoney(totalPaidYTD)}</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10"><CheckCircle size={18} weight="duotone" className="text-emerald-400" /></div>
          <div>
            <p className="text-xs text-t3">Runs Completed</p>
            <p className="text-2xl font-bold text-emerald-400">{runs.filter(r => r.status === 'paid').length}</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10"><Clock size={18} weight="duotone" className="text-amber-500" /></div>
          <div>
            <p className="text-xs text-t3">Pending Runs</p>
            <p className="text-2xl font-bold text-amber-500">{runs.filter(r => r.status !== 'paid').length}</p>
          </div>
        </div>
      </div>

      {/* Run list */}
      {sortedRuns.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-10 flex flex-col items-center gap-3 text-center">
          <CurrencyCircleDollar size={32} weight="duotone" className="text-t3 opacity-40" />
          <p className="text-sm text-t3">No payroll runs yet.</p>
          <button type="button" onClick={() => setShowNew(true)} className="text-accent text-sm font-semibold hover:underline">
            Generate your first run
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedRuns.map(run => {
            const total = run.payslips.reduce((s, p) => s + p.net, 0);
            return (
              <button
                key={run.id}
                type="button"
                onClick={() => setOpenRun(run)}
                className="w-full bg-card rounded-xl border border-border p-4 text-left hover:ring-2 hover:ring-accent/30 transition-all flex items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-sm font-bold text-t1">{periodLabel(run.period)}</p>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${STATUS_STYLES[run.status]}`}>
                      {run.status}
                    </span>
                  </div>
                  <p className="text-xs text-t3">
                    {run.payslips.length} {run.payslips.length === 1 ? 'employee' : 'employees'} · Generated {new Date(run.generatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-black text-t1">{formatMoney(total)}</p>
                  <p className="text-[10px] text-t3 uppercase tracking-wider">Total</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {showNew && (
        <NewRunModal
          existingPeriods={runs.map(r => r.period)}
          onClose={() => setShowNew(false)}
          onCreate={generateRun}
        />
      )}

      {openRun && (
        <RunDetailsModal
          run={openRun}
          onClose={() => setOpenRun(null)}
          onUpdate={updateRun}
          onDelete={() => deleteRun(openRun.id)}
        />
      )}
    </div>
  );
}

function NewRunModal({ existingPeriods, onClose, onCreate }: {
  existingPeriods: string[];
  onClose: () => void;
  onCreate: (period: string) => void;
}) {
  const now = new Date();
  const defaultPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [period, setPeriod] = useState(defaultPeriod);
  const exists = existingPeriods.includes(period);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl border border-border p-5 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-t1">New Payroll Run</p>
          <button type="button" onClick={onClose} className="p-1 text-t3 hover:text-t1"><X size={16} weight="bold" /></button>
        </div>
        <div>
          <label className="block text-xs text-t3 mb-1">Pay Period</label>
          <input
            type="month"
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 outline-none focus:border-accent"
            value={period}
            onChange={e => setPeriod(e.target.value)}
          />
          {exists && <p className="text-[11px] text-rose-400 mt-1">A run already exists for this period.</p>}
        </div>
        <p className="text-[11px] text-t3">A payslip will be created for every active employee, pre-filled with their contract base salary. You can adjust bonuses/deductions in the run details.</p>
        <button
          type="button"
          onClick={() => onCreate(period)}
          disabled={exists}
          className="w-full py-2.5 bg-accent text-white rounded-lg text-sm font-bold hover:bg-accent-h transition-colors disabled:opacity-60"
        >
          Generate Payslips
        </button>
      </div>
    </div>
  );
}

function RunDetailsModal({ run, onClose, onUpdate, onDelete }: {
  run: PayrollRun;
  onClose: () => void;
  onUpdate: (run: PayrollRun) => void;
  onDelete: () => void;
}) {
  const total = run.payslips.reduce((s, p) => s + p.net, 0);

  function recompute(p: Payslip): Payslip {
    return { ...p, net: Math.max(0, p.baseSalary + p.bonuses - p.deductions) };
  }

  function patch(employeeId: string, patch: Partial<Payslip>) {
    const next = {
      ...run,
      payslips: run.payslips.map(p => p.employeeId === employeeId ? recompute({ ...p, ...patch }) : p),
    };
    onUpdate(next);
  }

  function setRunStatus(status: PayrollRun['status']) {
    const next: PayrollRun = {
      ...run,
      status,
      // When marking the run as paid, mark all pending payslips as paid too.
      payslips: status === 'paid'
        ? run.payslips.map(p => p.status === 'pending' ? { ...p, status: 'paid' as PayslipStatus } : p)
        : run.payslips,
    };
    onUpdate(next);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl border border-border max-w-3xl w-full max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-border flex items-start justify-between gap-4 shrink-0">
          <div>
            <p className="text-sm font-bold text-t1">{periodLabel(run.period)}</p>
            <p className="text-xs text-t3 mt-0.5">{run.payslips.length} payslips · Total: <span className="font-bold text-t1">{formatMoney(total)}</span></p>
            <span className={`inline-block mt-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${STATUS_STYLES[run.status]}`}>
              {run.status}
            </span>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-t3 hover:text-t1"><X size={16} weight="bold" /></button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-2">
          {run.payslips.length === 0 ? (
            <p className="text-sm text-t3 text-center py-8">No payslips in this run.</p>
          ) : run.payslips.map(p => (
            <div key={p.employeeId} className="bg-surface rounded-lg p-3">
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className="text-sm font-semibold text-t1">{p.employeeName}</p>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${PAYSLIP_STATUS_STYLES[p.status]}`}>
                    {p.status}
                  </span>
                  <p className="text-sm font-black text-accent">{formatMoney(p.net)}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-t3 mb-0.5">Base</label>
                  <input
                    type="number"
                    className="w-full px-2 py-1 bg-card border border-border rounded text-xs text-t1 outline-none focus:border-accent"
                    value={p.baseSalary}
                    onChange={e => patch(p.employeeId, { baseSalary: Number(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-t3 mb-0.5">Bonuses</label>
                  <input
                    type="number"
                    className="w-full px-2 py-1 bg-card border border-border rounded text-xs text-emerald-400 outline-none focus:border-accent"
                    value={p.bonuses}
                    onChange={e => patch(p.employeeId, { bonuses: Number(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-t3 mb-0.5">Deductions</label>
                  <input
                    type="number"
                    className="w-full px-2 py-1 bg-card border border-border rounded text-xs text-rose-400 outline-none focus:border-accent"
                    value={p.deductions}
                    onChange={e => patch(p.employeeId, { deductions: Number(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-5 border-t border-border flex items-center justify-between gap-2 shrink-0">
          <button type="button" onClick={onDelete} className="px-3 py-2 text-xs font-bold text-rose-400 bg-rose-500/10 rounded-lg hover:bg-rose-500/20">
            Delete Run
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => alert('Export to CSV/PDF — wire to backend later.')}
              className="px-3 py-2 text-xs font-bold text-t2 bg-surface rounded-lg hover:bg-surface/70 inline-flex items-center gap-1"
            >
              <Download size={11} weight="bold" /> Export
            </button>
            {run.status === 'draft' && (
              <button type="button" onClick={() => setRunStatus('finalized')} className="px-3 py-2 text-xs font-bold text-amber-500 bg-amber-500/10 rounded-lg hover:bg-amber-500/20">
                Finalize
              </button>
            )}
            {run.status !== 'paid' && (
              <button type="button" onClick={() => setRunStatus('paid')} className="px-4 py-2 text-xs font-bold text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 inline-flex items-center gap-1">
                <CheckCircle size={11} weight="bold" /> Mark as Paid
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
