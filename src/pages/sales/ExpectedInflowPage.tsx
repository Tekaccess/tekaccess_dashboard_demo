import React, { useEffect, useState } from 'react';
import {
  CurrencyCircleDollar, Clock, Calendar, Warning, Spinner, ChartLineUp,
} from '@phosphor-icons/react';
import { apiGetExpectedInflow, ExpectedInflow } from '../../lib/api';

function fmtMoney(n: number, ccy = 'USD') {
  if (n == null) return '—';
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M ${ccy}`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K ${ccy}`;
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${ccy}`;
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString();
}

export default function ExpectedInflowPage() {
  const [data, setData] = useState<ExpectedInflow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await apiGetExpectedInflow();
      if (res.success) setData(res.data);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Spinner size={32} className="animate-spin text-accent" /></div>;
  }
  if (!data) {
    return <div className="text-center text-t3 py-12">Could not load expected inflow.</div>;
  }
  const { inflow, activeContracts } = data;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-t1">Expected Cash Inflow</h1>
        <p className="text-sm text-t3 mt-0.5">When the cash is expected — open invoices by due band, plus pipeline value from active contracts.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Overdue', value: inflow.overdue, Icon: Warning, color: 'text-rose-500', bg: 'bg-rose-500/10' },
          { label: 'Due in 7 days', value: inflow.dueIn7Days, Icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'Due in 30 days', value: inflow.dueIn30Days, Icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Due in 60 days', value: inflow.dueIn60Days, Icon: Calendar, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
        ].map(c => (
          <div key={c.label} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
            <div className={`p-2.5 rounded-xl ${c.bg}`}><c.Icon size={18} weight="duotone" className={c.color} /></div>
            <div>
              <p className="text-xs text-t3 font-medium uppercase tracking-wide">{c.label}</p>
              <p className="text-xl font-bold text-t1 mt-0.5">{fmtMoney(c.value)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-3">
            <CurrencyCircleDollar size={18} weight="duotone" className="text-amber-500" />
            <h3 className="text-sm font-bold uppercase tracking-wide text-t1">Total open invoices</h3>
          </div>
          <p className="text-3xl font-bold text-t1">{fmtMoney(inflow.totalOpenInvoices)}</p>
          <p className="text-xs text-t3 mt-1">
            Money already invoiced and waiting for receipt.
            Of that, <span className="text-rose-400 font-bold">{fmtMoney(inflow.overdue)}</span> is past due.
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-3">
            <ChartLineUp size={18} weight="duotone" className="text-emerald-500" />
            <h3 className="text-sm font-bold uppercase tracking-wide text-t1">Expected from active contracts</h3>
          </div>
          <p className="text-3xl font-bold text-t1">{fmtMoney(inflow.expectedFromActiveContracts)}</p>
          <p className="text-xs text-t3 mt-1">
            Estimated remaining value across {activeContracts.length} active contract{activeContracts.length === 1 ? '' : 's'}.
            Computed as contract value × (100 - delivery progress %).
          </p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-sm font-bold uppercase tracking-wide text-t1">Active contracts</h3>
        </div>
        {activeContracts.length === 0 ? (
          <p className="p-6 text-sm text-t3 text-center">No active contracts.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface">
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider">Ref</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider">Client</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-t3 uppercase tracking-wider">Total Value</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider">Progress</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider">End Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {activeContracts.map((c, i) => (
                <tr key={i} className="hover:bg-surface transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-accent font-bold">{c.contractRef}</td>
                  <td className="px-4 py-3 text-t1">{c.clientName}</td>
                  <td className="px-4 py-3 text-right font-bold text-t1">{fmtMoney(c.totalValue, c.currency)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-surface rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, c.pctComplete)}%` }} />
                      </div>
                      <span className="text-xs text-t2 font-bold w-10 text-right">{c.pctComplete.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-t3">{fmtDate(c.endDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
