import React, { useEffect, useMemo, useState } from 'react';
import { Spinner, ChartLine, CheckCircle, Warning, XCircle } from '@phosphor-icons/react';
import { apiListEmployees, Employee } from '../../lib/api';

const KPI_STATUS_STYLES: Record<string, { chip: string; Icon: any; iconColor: string }> = {
  'on-track':  { chip: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', Icon: CheckCircle, iconColor: 'text-emerald-400' },
  'at-risk':   { chip: 'bg-amber-500/10 text-amber-500 border-amber-500/20',       Icon: Warning,     iconColor: 'text-amber-500' },
  'behind':    { chip: 'bg-rose-500/10 text-rose-400 border-rose-500/20',           Icon: XCircle,     iconColor: 'text-rose-400' },
};

export default function PerformancePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'on-track' | 'at-risk' | 'behind'>('all');

  useEffect(() => {
    apiListEmployees().then(r => {
      if (r.success) setEmployees(r.data.employees);
      setLoading(false);
    });
  }, []);

  const enriched = useMemo(() => {
    return employees.map(e => {
      const kpis = e.kpis || [];
      const statuses = kpis.map(k => k.status);
      const overall: 'on-track' | 'at-risk' | 'behind' | 'no-data' =
        kpis.length === 0 ? 'no-data' :
        statuses.includes('behind') ? 'behind' :
        statuses.includes('at-risk') ? 'at-risk' :
        'on-track';
      return { employee: e, kpis, overall };
    });
  }, [employees]);

  const totals = useMemo(() => {
    const t = { onTrack: 0, atRisk: 0, behind: 0, noData: 0 };
    enriched.forEach(e => {
      if (e.overall === 'on-track') t.onTrack++;
      else if (e.overall === 'at-risk') t.atRisk++;
      else if (e.overall === 'behind') t.behind++;
      else t.noData++;
    });
    return t;
  }, [enriched]);

  const filtered = enriched.filter(e => {
    if (filter !== 'all' && e.overall !== filter) return false;
    if (search && !e.employee.fullName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size={28} className="animate-spin text-accent" /></div>;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-t1">Performance Reviews</h1>
        <p className="text-sm text-t3 mt-1">KPI tracking across the organisation</p>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-t3">On Track</p>
          <p className="text-2xl font-bold text-emerald-400">{totals.onTrack}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-t3">At Risk</p>
          <p className="text-2xl font-bold text-amber-500">{totals.atRisk}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-t3">Behind</p>
          <p className="text-2xl font-bold text-rose-400">{totals.behind}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-t3">No KPIs Set</p>
          <p className="text-2xl font-bold text-t2">{totals.noData}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          className="flex-1 min-w-[200px] px-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent"
          placeholder="Search employees..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="flex gap-1.5">
          {(['all', 'on-track', 'at-risk', 'behind'] as const).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                filter === f ? 'bg-accent text-white' : 'bg-surface text-t2 hover:bg-surface/70'
              }`}
            >
              {f === 'all' ? 'All' : f.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Employee list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-10 text-center text-sm text-t3">
            No employees match this filter.
          </div>
        ) : filtered.map(({ employee, kpis, overall }) => {
          const overallStyle = overall === 'no-data'
            ? { chip: 'bg-surface text-t3 border-border', Icon: ChartLine, iconColor: 'text-t3' }
            : KPI_STATUS_STYLES[overall];
          return (
            <div key={employee._id} className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-sm font-bold text-t1">{employee.fullName}</p>
                  <p className="text-xs text-t3 mt-0.5">{employee.role} · {employee.department}</p>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${overallStyle.chip}`}>
                  <overallStyle.Icon size={12} weight="duotone" />
                  {overall === 'no-data' ? 'No KPIs set' : overall.replace('-', ' ')}
                </span>
              </div>
              {kpis.length === 0 ? (
                <p className="text-xs text-t3 italic">No KPIs configured for this employee yet.</p>
              ) : (
                <div className="space-y-2">
                  {kpis.map((k, i) => {
                    const s = KPI_STATUS_STYLES[k.status];
                    return (
                      <div key={i} className="flex items-center justify-between gap-3 px-3 py-2 bg-surface rounded-lg">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-t1 truncate">{k.metric}</p>
                          <p className="text-[11px] text-t3">Target: {k.target} · Actual: {k.actual}</p>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${s.chip}`}>
                          {k.status.replace('-', ' ')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
