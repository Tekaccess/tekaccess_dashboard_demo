import React, { useState, useEffect, useCallback } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import {
  MagnifyingGlass, Package, CheckCircle, Warning, X,
  Spinner, CaretLeft, CaretRight, Truck,
} from '@phosphor-icons/react';
import {
  apiGetDeliveriesSummary, apiListDeliveries, apiConfirmDelivery, apiDisputeDelivery,
  Delivery,
} from '../../lib/api';
import DocumentSidePanel from '../../components/DocumentSidePanel';

const STATUS_STYLES: Record<string, string> = {
  pending_confirmation: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  confirmed:            'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  disputed:             'bg-rose-500/10 text-rose-400 border-rose-500/20',
  rejected:             'bg-surface text-t3 border-border',
};
const STATUS_DOT: Record<string, string> = {
  pending_confirmation: 'bg-amber-500',
  confirmed:            'bg-emerald-400',
  disputed:             'bg-rose-400',
  rejected:             'bg-t3',
};
const STATUS_LABEL: Record<string, string> = {
  pending_confirmation: 'Pending',
  confirmed:            'Confirmed',
  disputed:             'Disputed',
  rejected:             'Rejected',
};

const DELIVERY_TABS = [
  { id: '', label: 'All' },
  { id: 'pending_confirmation', label: 'Pending' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'disputed', label: 'Disputed' },
];

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const inp = 'w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent transition-colors';

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [summary, setSummary] = useState({ pendingConfirmation: 0, confirmed: 0, disputed: 0, tonsToday: 0, tonsThisMonth: 0 });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Delivery | null>(null);
  const [panelMode, setPanelMode] = useState<'view' | 'confirm' | 'dispute' | null>(null);
  const [confirmTons, setConfirmTons] = useState('');
  const [confirmNotes, setConfirmNotes] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const PAGE_LIMIT = 50;

  const load = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: String(PAGE_LIMIT) };
    if (search) params.search = search;
    if (activeTab) params.status = activeTab;
    const [dRes, sRes] = await Promise.all([
      apiListDeliveries(params),
      apiGetDeliveriesSummary(),
    ]);
    if (dRes.success) { setDeliveries(dRes.data.deliveries); setTotal(dRes.data.pagination.total); }
    if (sRes.success) setSummary(sRes.data.summary);
    setLoading(false);
  }, [search, activeTab, page]);

  useEffect(() => { load(); }, [load]);

  function openView(d: Delivery) { setSelected(d); setPanelMode('view'); setError(null); }

  async function handleConfirm() {
    if (!selected || !confirmTons) { setError('Confirmed tonnage is required.'); return; }
    setSaving(true); setError(null);
    const res = await apiConfirmDelivery(selected._id, Number(confirmTons), confirmNotes || undefined);
    setSaving(false);
    if (!res.success) { setError((res as any).message || 'Failed.'); return; }
    setPanelMode(null); load();
  }

  async function handleDispute() {
    if (!selected || !disputeReason) { setError('Dispute reason is required.'); return; }
    setSaving(true); setError(null);
    const res = await apiDisputeDelivery(selected._id, disputeReason);
    setSaving(false);
    if (!res.success) { setError((res as any).message || 'Failed.'); return; }
    setPanelMode(null); load();
  }

  const totalPages = Math.ceil(total / PAGE_LIMIT);

  const panelContent = selected && panelMode ? (
    <div className="space-y-5">
      {/* Delivery header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-xs text-t3">{selected.deliveryRef}</p>
          <p className="font-semibold text-t1 mt-0.5">{selected.clientName}</p>
          <p className="text-sm text-t2">{selected.contractRef} · {selected.offloadingSiteName}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[selected.status] ?? ''}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[selected.status] ?? 'bg-t3'}`} />
          {STATUS_LABEL[selected.status] ?? selected.status}
        </span>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        {[
          ['Delivery Date', fmtDate(selected.deliveryDate)],
          ['Truck', selected.truckPlate],
          ['Driver', selected.driverName],
          ['Site', selected.offloadingSiteName],
          ['Planned Tons', `${selected.plannedTons.toLocaleString()} t`],
          ['Confirmed Tons', selected.confirmedTons != null ? `${selected.confirmedTons.toLocaleString()} t` : '—'],
          ['Variance', selected.tonVariance != null ? `${selected.tonVariance > 0 ? '+' : ''}${selected.tonVariance.toLocaleString()} t` : '—'],
          ['Confirmed At', fmtDate(selected.confirmedAt)],
        ].map(([k, v]) => (
          <div key={k}>
            <p className="text-xs text-t3">{k}</p>
            <p className={`font-medium ${k === 'Variance' && selected.tonVariance != null && selected.tonVariance < 0 ? 'text-rose-400' : 'text-t1'}`}>{v}</p>
          </div>
        ))}
      </div>

      {selected.disputeReason && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-sm text-rose-400">
          Dispute: {selected.disputeReason}
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {panelMode === 'confirm' && (
        <div className="space-y-4 pt-2 border-t border-border">
          <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Confirm Delivery</p>
          <div>
            <label className="block text-xs text-t3 mb-1">Confirmed Tons *</label>
            <input type="number" min={0} step={0.01} className={inp}
              value={confirmTons} onChange={e => setConfirmTons(e.target.value)}
              placeholder={String(selected.plannedTons)} />
          </div>
          <div>
            <label className="block text-xs text-t3 mb-1">Notes</label>
            <textarea rows={2} className={`${inp} resize-none`}
              value={confirmNotes} onChange={e => setConfirmNotes(e.target.value)} />
          </div>
          <button onClick={() => setPanelMode('view')}
            className="w-full py-2.5 border border-border text-t2 rounded-xl text-sm font-medium hover:bg-surface transition-colors">
            Back
          </button>
          <button onClick={handleConfirm} disabled={saving}
            className="w-full py-3 bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
            {saving && <Spinner size={14} className="animate-spin" />} Confirm Delivery
          </button>
        </div>
      )}

      {panelMode === 'dispute' && (
        <div className="space-y-4 pt-2 border-t border-border">
          <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Raise Dispute</p>
          <div>
            <label className="block text-xs text-t3 mb-1">Reason *</label>
            <textarea rows={3} className={`${inp} resize-none`}
              value={disputeReason} onChange={e => setDisputeReason(e.target.value)}
              placeholder="Describe the discrepancy or issue..." />
          </div>
          <button onClick={() => setPanelMode('view')}
            className="w-full py-2.5 border border-border text-t2 rounded-xl text-sm font-medium hover:bg-surface transition-colors">
            Back
          </button>
          <button onClick={handleDispute} disabled={saving}
            className="w-full py-3 bg-rose-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-rose-500/20 hover:bg-rose-600 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
            {saving && <Spinner size={14} className="animate-spin" />} Submit Dispute
          </button>
        </div>
      )}

      {panelMode === 'view' && selected.status === 'pending_confirmation' && (
        <div className="flex gap-2 pt-2 border-t border-border">
          <button onClick={() => { setConfirmTons(String(selected.plannedTons)); setConfirmNotes(''); setError(null); setPanelMode('confirm'); }}
            className="flex-1 py-2.5 text-sm bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 flex items-center justify-center gap-2">
            <CheckCircle size={14} /> Confirm
          </button>
          <button onClick={() => { setDisputeReason(''); setError(null); setPanelMode('dispute'); }}
            className="flex-1 py-2.5 text-sm border border-rose-500/40 text-rose-400 rounded-xl font-semibold hover:bg-rose-500/10 flex items-center justify-center gap-2">
            <Warning size={14} /> Dispute
          </button>
        </div>
      )}
    </div>
  ) : null;

  const kpiCards = [
    { label: 'Pending', value: summary.pendingConfirmation, Icon: Warning, bg: 'bg-amber-500/10', color: 'text-amber-500' },
    { label: 'Confirmed', value: summary.confirmed, Icon: CheckCircle, bg: 'bg-emerald-500/10', color: 'text-emerald-400' },
    { label: 'Disputed', value: summary.disputed, Icon: X, bg: 'bg-rose-500/10', color: 'text-rose-400' },
    { label: 'Tons This Month', value: `${summary.tonsThisMonth.toLocaleString()} t`, Icon: Package, bg: 'bg-accent-glow', color: 'text-accent' },
  ];

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-t1">Deliveries</h1>
            <p className="text-sm text-t3 mt-1">{total.toLocaleString()} delivery records</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {kpiCards.map(({ label, value, Icon, bg, color }) => (
            <div key={label} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
              <div className={`p-2.5 rounded-xl ${bg} shrink-0`}>
                <Icon size={18} weight="duotone" className={color} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-t3">{label}</p>
                <p className="text-xl font-bold text-t1 truncate">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table Card */}
        <div className="bg-card rounded-xl border border-border">
          {/* Tabs */}
          <div className="flex gap-1 px-4 border-b border-border">
            {DELIVERY_TABS.map(tab => (
              <button key={tab.id}
                onClick={() => { setActiveTab(tab.id); setPage(1); }}
                className={`px-4 py-3 text-sm border-b-2 transition-colors ${activeTab === tab.id ? 'border-accent text-accent font-semibold' : 'border-transparent text-t3 hover:text-t1'}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <div className="relative flex-1 max-w-sm">
              <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
              <input className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent transition-colors"
                placeholder="Ref, contract, client, truck..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Spinner size={28} className="animate-spin text-accent" />
            </div>
          ) : deliveries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-t3">
              <Truck size={40} className="mb-2 opacity-40" />
              <p>No deliveries found.</p>
            </div>
          ) : (
            <OverlayScrollbarsComponent options={{ scrollbars: { autoHide: 'scroll' } }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Ref</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Contract</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Truck</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Planned</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Confirmed</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Variance</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.map((d, i) => (
                    <tr key={d._id}
                      className={`hover:bg-surface transition-colors cursor-pointer ${i < deliveries.length - 1 ? 'border-b border-border' : ''}`}
                      onClick={() => openView(d)}>
                      <td className="px-4 py-3.5 font-mono text-xs text-accent">{d.deliveryRef}</td>
                      <td className="px-4 py-3.5 text-t1 font-medium">{d.clientName}</td>
                      <td className="px-4 py-3.5 text-t2 text-xs">{d.contractRef}</td>
                      <td className="px-4 py-3.5 text-t2">{d.truckPlate}</td>
                      <td className="px-4 py-3.5 text-right text-t1">{d.plannedTons.toLocaleString()} t</td>
                      <td className="px-4 py-3.5 text-right text-t1">{d.confirmedTons != null ? `${d.confirmedTons.toLocaleString()} t` : '—'}</td>
                      <td className="px-4 py-3.5 text-right">
                        {d.tonVariance != null ? (
                          <span className={d.tonVariance < 0 ? 'text-rose-400' : 'text-emerald-400'}>
                            {d.tonVariance > 0 ? '+' : ''}{d.tonVariance.toLocaleString()} t
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[d.status] ?? ''}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[d.status] ?? 'bg-t3'}`} />
                          {STATUS_LABEL[d.status] ?? d.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-t3 whitespace-nowrap">{fmtDate(d.deliveryDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </OverlayScrollbarsComponent>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-xs text-t3">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="p-1.5 border border-border rounded-lg hover:bg-surface disabled:opacity-40 transition-colors">
                  <CaretLeft size={14} />
                </button>
                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                  className="p-1.5 border border-border rounded-lg hover:bg-surface disabled:opacity-40 transition-colors">
                  <CaretRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {panelMode && selected && (
        <DocumentSidePanel
          isOpen={true}
          onClose={() => setPanelMode(null)}
          title={selected.deliveryRef}
          formContent={panelContent}
          previewContent={null}
        />
      )}
    </>
  );
}
