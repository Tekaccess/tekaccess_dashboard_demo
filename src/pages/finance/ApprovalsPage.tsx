import React, { useState, useEffect, useCallback } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import {
  CheckCircle, XCircle, Clock, CurrencyCircleDollar, Spinner,
  Receipt, Warehouse, MagnifyingGlass, CaretLeft, CaretRight,
  Warning, CheckSquare,
} from '@phosphor-icons/react';
import {
  apiListFinanceApprovals, apiGetFinanceApprovalsSummary,
  apiApproveFinanceApproval, apiRejectFinanceApproval,
  FinanceApproval, ApprovalsSummary,
} from '../../lib/api';
import DocumentSidePanel from '../../components/DocumentSidePanel';

const STATUS_TABS = [
  { id: '', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'partial', label: 'Partial' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
];

const STATUS_STYLES: Record<string, string> = {
  pending:  'bg-amber-500/10 text-amber-400 border-amber-500/20',
  partial:  'bg-blue-500/10 text-blue-400 border-blue-500/20',
  approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  rejected: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending:  <Clock size={10} weight="fill" />,
  partial:  <CheckCircle size={10} weight="fill" />,
  approved: <CheckCircle size={10} weight="fill" />,
  rejected: <XCircle size={10} weight="fill" />,
};

function formatMoney(n: number, currency = 'RWF') {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M ${currency}`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K ${currency}`;
  return `${n.toLocaleString()} ${currency}`;
}

const inp = 'w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors';

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<FinanceApproval[]>([]);
  const [summary, setSummary] = useState<ApprovalsSummary | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_LIMIT = 50;

  const [selected, setSelected] = useState<FinanceApproval | null>(null);
  const [panelMode, setPanelMode] = useState<'view' | 'approve' | null>(null);
  const [approvedAmount, setApprovedAmount] = useState('');
  const [actionNotes, setActionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: String(PAGE_LIMIT) };
    if (activeTab) params.status = activeTab;
    const [listRes, sumRes] = await Promise.all([
      apiListFinanceApprovals(params),
      apiGetFinanceApprovalsSummary(),
    ]);
    if (listRes.success) { setApprovals(listRes.data.approvals); setTotal(listRes.data.pagination.total); }
    if (sumRes.success) setSummary(sumRes.data.summary);
    setLoading(false);
  }, [activeTab, page]);

  useEffect(() => { load(); }, [load]);

  function openView(a: FinanceApproval) {
    setSelected(a);
    setApprovedAmount(String(a.requestedAmount));
    setActionNotes('');
    setActionError(null);
    setPanelMode('view');
  }

  async function handleApprove() {
    if (!selected) return;
    const amount = Number(approvedAmount);
    if (isNaN(amount) || amount < 0) { setActionError('Enter a valid amount.'); return; }
    setSubmitting(true); setActionError(null);
    const res = await apiApproveFinanceApproval(selected._id, { approvedAmount: amount, notes: actionNotes || undefined });
    setSubmitting(false);
    if (!res.success) { setActionError((res as any).message || 'Failed.'); return; }
    setPanelMode(null); setSelected(null); load();
  }

  async function handleReject() {
    if (!selected) return;
    setSubmitting(true); setActionError(null);
    const res = await apiRejectFinanceApproval(selected._id, { notes: actionNotes || undefined });
    setSubmitting(false);
    if (!res.success) { setActionError((res as any).message || 'Failed.'); return; }
    setPanelMode(null); setSelected(null); load();
  }

  const totalPages = Math.ceil(total / PAGE_LIMIT);

  const canAct = selected && ['pending', 'partial'].includes(selected.status);

  const formContent = selected ? (
    <div className="space-y-5 pb-10">
      <section className="space-y-2">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Approval Details</p>
        {([
          ['Ref', selected.approvalRef],
          ['Product', selected.productName],
          ['Warehouse', selected.warehouseName],
          ['Source PO', selected.linkedPoRef || '—'],
          ['Status', selected.status],
        ] as [string, string][]).map(([l, v]) => (
          <div key={l} className="flex justify-between text-sm">
            <span className="text-t3">{l}</span>
            {l === 'Status' ? (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[v] || ''}`}>
                {STATUS_ICONS[v]} {v}
              </span>
            ) : (
              <span className="font-medium text-t1">{v}</span>
            )}
          </div>
        ))}
        <div className="flex justify-between text-sm">
          <span className="text-t3">Created</span>
          <span className="font-medium text-t1">{new Date(selected.createdAt).toLocaleDateString()}</span>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Financials</p>
        <div className="flex justify-between text-sm">
          <span className="text-t3">Requested</span>
          <span className="font-bold text-amber-400">{formatMoney(selected.requestedAmount, selected.currency)}</span>
        </div>
        {selected.approvedAmount != null && (
          <div className="flex justify-between text-sm">
            <span className="text-t3">Approved</span>
            <span className="font-bold text-emerald-400">{formatMoney(selected.approvedAmount, selected.currency)}</span>
          </div>
        )}
      </section>

      {selected.reviewedBy && (
        <section className="space-y-2">
          <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Review</p>
          <div className="flex justify-between text-sm">
            <span className="text-t3">Reviewed By</span>
            <span className="font-medium text-t1">{selected.reviewedBy.fullName}</span>
          </div>
          {selected.reviewedAt && (
            <div className="flex justify-between text-sm">
              <span className="text-t3">Reviewed At</span>
              <span className="font-medium text-t1">{new Date(selected.reviewedAt).toLocaleDateString()}</span>
            </div>
          )}
          {selected.notes && (
            <div className="text-sm">
              <span className="text-t3 block mb-0.5">Notes</span>
              <p className="text-t2">{selected.notes}</p>
            </div>
          )}
        </section>
      )}

      {canAct && (
        <section className="space-y-3 pt-2 border-t border-border">
          <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Take Action</p>
          <div>
            <label className="block text-[10px] text-t3 mb-1">Approved Amount *</label>
            <input type="number" min="0" className={inp}
              value={approvedAmount}
              onChange={e => setApprovedAmount(e.target.value)} />
          </div>
          <div>
            <label className="block text-[10px] text-t3 mb-1">Notes (optional)</label>
            <textarea rows={2} className={`${inp} resize-none`}
              value={actionNotes}
              onChange={e => setActionNotes(e.target.value)}
              placeholder="e.g. Partial approval — budget constraints" />
          </div>
          {actionError && (
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-sm text-rose-400">{actionError}</div>
          )}
          <div className="flex gap-2">
            <button onClick={handleApprove} disabled={submitting}
              className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all disabled:opacity-60 flex items-center justify-center gap-1.5">
              {submitting ? <Spinner size={13} className="animate-spin" /> : <CheckSquare size={14} weight="bold" />}
              Approve
            </button>
            <button onClick={handleReject} disabled={submitting}
              className="flex-1 py-2.5 border border-rose-500/30 text-rose-400 rounded-xl text-sm font-bold hover:bg-rose-500/10 transition-all disabled:opacity-60 flex items-center justify-center gap-1.5">
              {submitting ? <Spinner size={13} className="animate-spin" /> : <XCircle size={14} weight="bold" />}
              Reject
            </button>
          </div>
        </section>
      )}
    </div>
  ) : null;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-t1">Finance Approvals</h1>
        <p className="text-sm text-t3 mt-0.5">Review and approve funding requests generated from Purchase Orders</p>
      </div>

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Pending Requests', value: summary.totalPending, Icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
            { label: 'Pending Amount', value: formatMoney(summary.pendingAmount), Icon: CurrencyCircleDollar, color: 'text-amber-500', bg: 'bg-amber-500/10' },
            { label: 'Approved Today', value: summary.approvedTodayCount, Icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
            { label: 'Approved Today Amount', value: formatMoney(summary.approvedTodayAmount), Icon: CurrencyCircleDollar, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          ].map(c => (
            <div key={c.label} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
              <div className={`p-2.5 rounded-xl ${c.bg}`}><c.Icon size={18} weight="duotone" className={c.color} /></div>
              <div>
                <p className="text-xs text-t3 font-medium uppercase tracking-wide">{c.label}</p>
                <p className="text-xl font-bold text-t1 mt-0.5">{c.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-card rounded-xl border border-border">
        <div className="flex gap-1 px-4 border-b border-border overflow-x-auto">
          {STATUS_TABS.map(tab => (
            <button key={tab.id}
              onClick={() => { setActiveTab(tab.id); setPage(1); }}
              className={`px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id ? 'border-accent text-accent font-semibold' : 'border-transparent text-t3 hover:text-t1'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
            <input className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent transition-colors"
              placeholder="Search ref, product, warehouse..."
              value={search}
              onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Spinner size={28} className="animate-spin text-accent" />
          </div>
        ) : approvals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-t3 gap-3">
            <CheckCircle size={40} weight="duotone" className="opacity-40" />
            <p>No approvals found.</p>
          </div>
        ) : (
          <OverlayScrollbarsComponent options={{ scrollbars: { autoHide: 'never' } }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Ref</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Warehouse</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Source PO</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Requested</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Approved</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {approvals.filter(a => !search || [a.approvalRef, a.productName, a.warehouseName, a.linkedPoRef || ''].some(v => v.toLowerCase().includes(search.toLowerCase()))).map(a => (
                  <tr key={a._id} className="hover:bg-surface cursor-pointer transition-colors" onClick={() => openView(a)}>
                    <td className="px-4 py-3.5 font-mono text-xs text-accent font-semibold whitespace-nowrap">{a.approvalRef}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <Warning size={13} className={a.status === 'pending' ? 'text-amber-400' : 'text-t3/30'} weight="duotone" />
                        <span className="text-t1 font-medium">{a.productName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-t2 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Warehouse size={12} className="text-t3" weight="duotone" />
                        {a.warehouseName}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-t3 whitespace-nowrap">
                      {a.linkedPoRef ? (
                        <div className="flex items-center gap-1">
                          <Receipt size={11} weight="duotone" className="text-accent" />
                          <span className="text-accent">{a.linkedPoRef}</span>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-amber-400 whitespace-nowrap">
                      {formatMoney(a.requestedAmount, a.currency)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold whitespace-nowrap">
                      {a.approvedAmount != null
                        ? <span className="text-emerald-400">{formatMoney(a.approvedAmount, a.currency)}</span>
                        : <span className="text-t3">—</span>}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[a.status] || ''}`}>
                        {STATUS_ICONS[a.status]} {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-t3 whitespace-nowrap">
                      {new Date(a.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </OverlayScrollbarsComponent>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-t3">Page {page} of {totalPages} · {total.toLocaleString()} total</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 border border-border rounded-lg hover:bg-surface disabled:opacity-40 transition-colors">
                <CaretLeft size={14} />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 border border-border rounded-lg hover:bg-surface disabled:opacity-40 transition-colors">
                <CaretRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <DocumentSidePanel
        isOpen={panelMode !== null}
        onClose={() => { setPanelMode(null); setSelected(null); }}
        title={selected?.approvalRef || 'Approval'}
        footerInfo={selected ? `${selected.productName} · ${selected.warehouseName}` : ''}
        formContent={formContent}
        previewContent={null}
      />
    </div>
  );
}
