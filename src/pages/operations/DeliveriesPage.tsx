import React, { useState, useEffect, useCallback } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import {
  Plus, MagnifyingGlass, Package, CheckCircle, Warning,
  Eye, Spinner, CaretLeft, CaretRight, Truck,
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
    <div className="space-y-5 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-xs text-t3">{selected.deliveryRef}</p>
          <p className="font-semibold text-t1 mt-0.5">{selected.clientName}</p>
          <p className="text-sm text-t2">{selected.contractRef} · {selected.offloadingSiteName}</p>
        </div>
        <span className={`text-xs border rounded px-2 py-0.5 whitespace-nowrap ${STATUS_STYLES[selected.status] ?? ''}`}>
          {selected.status.replace('_', ' ')}
        </span>
      </div>

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
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded text-sm text-rose-400">
          Dispute: {selected.disputeReason}
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {panelMode === 'confirm' && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-t1">Confirm Delivery</p>
          <div>
            <label className="block text-xs text-t3 mb-1">Confirmed Tons *</label>
            <input type="number" min={0} step={0.01}
              className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-t1"
              value={confirmTons} onChange={e => setConfirmTons(e.target.value)}
              placeholder={String(selected.plannedTons)} />
          </div>
          <div>
            <label className="block text-xs text-t3 mb-1">Notes</label>
            <textarea rows={2} className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-t1 resize-none"
              value={confirmNotes} onChange={e => setConfirmNotes(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setPanelMode('view')}
              className="flex-1 py-2 text-sm border border-border rounded text-t2 hover:text-t1">Cancel</button>
            <button onClick={handleConfirm} disabled={saving}
              className="flex-1 py-2 text-sm bg-emerald-500 text-white rounded hover:bg-emerald-600 flex items-center justify-center gap-2">
              {saving && <Spinner size={14} className="animate-spin" />} Confirm
            </button>
          </div>
        </div>
      )}

      {panelMode === 'dispute' && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-t1">Raise Dispute</p>
          <div>
            <label className="block text-xs text-t3 mb-1">Reason *</label>
            <textarea rows={3} className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-t1 resize-none"
              value={disputeReason} onChange={e => setDisputeReason(e.target.value)}
              placeholder="Describe the discrepancy or issue..." />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setPanelMode('view')}
              className="flex-1 py-2 text-sm border border-border rounded text-t2 hover:text-t1">Cancel</button>
            <button onClick={handleDispute} disabled={saving}
              className="flex-1 py-2 text-sm bg-rose-500 text-white rounded hover:bg-rose-600 flex items-center justify-center gap-2">
              {saving && <Spinner size={14} className="animate-spin" />} Submit
            </button>
          </div>
        </div>
      )}

      {panelMode === 'view' && selected.status === 'pending_confirmation' && (
        <div className="flex gap-2 pt-2 border-t border-border">
          <button onClick={() => { setConfirmTons(String(selected.plannedTons)); setConfirmNotes(''); setError(null); setPanelMode('confirm'); }}
            className="flex-1 py-2 text-sm bg-emerald-500 text-white rounded hover:bg-emerald-600 flex items-center justify-center gap-2">
            <CheckCircle size={14} /> Confirm
          </button>
          <button onClick={() => { setDisputeReason(''); setError(null); setPanelMode('dispute'); }}
            className="flex-1 py-2 text-sm border border-rose-500/40 text-rose-400 rounded hover:bg-rose-500/10 flex items-center justify-center gap-2">
            <Warning size={14} /> Dispute
          </button>
        </div>
      )}
    </div>
  ) : null;

  return (
    <div className="flex flex-col h-full bg-bg">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-t1">Deliveries</h1>
          <p className="text-sm text-t3 mt-0.5">{total.toLocaleString()} delivery records</p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 px-6 py-4 shrink-0 sm:grid-cols-4">
        {[
          { label: 'Pending', value: summary.pendingConfirmation, color: 'text-amber-500' },
          { label: 'Confirmed', value: summary.confirmed, color: 'text-emerald-400' },
          { label: 'Disputed', value: summary.disputed, color: 'text-rose-400' },
          { label: 'Tons This Month', value: `${summary.tonsThisMonth.toLocaleString()} t`, color: 'text-accent' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-surface border border-border rounded-lg p-4">
            <p className="text-xs text-t3">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-6 border-b border-border shrink-0">
        {DELIVERY_TABS.map(tab => (
          <button key={tab.id}
            onClick={() => { setActiveTab(tab.id); setPage(1); }}
            className={`px-4 py-2 text-sm border-b-2 transition-colors ${activeTab === tab.id ? 'border-accent text-accent' : 'border-transparent text-t3 hover:text-t1'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 px-6 py-3 shrink-0">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
          <input className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded text-sm text-t1 placeholder:text-t3"
            placeholder="Ref, contract, client, truck..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      <div className="flex flex-1 min-h-0 px-6 pb-6 gap-4">
        <div className="flex flex-col flex-1 min-w-0">
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
            <OverlayScrollbarsComponent options={{ scrollbars: { autoHide: 'scroll' } }} className="flex-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-t3">
                    <th className="text-left py-2 pr-3 font-medium">Ref</th>
                    <th className="text-left py-2 pr-3 font-medium">Client</th>
                    <th className="text-left py-2 pr-3 font-medium">Contract</th>
                    <th className="text-left py-2 pr-3 font-medium">Truck</th>
                    <th className="text-right py-2 pr-3 font-medium">Planned</th>
                    <th className="text-right py-2 pr-3 font-medium">Confirmed</th>
                    <th className="text-right py-2 pr-3 font-medium">Variance</th>
                    <th className="text-left py-2 pr-3 font-medium">Status</th>
                    <th className="text-left py-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {deliveries.map(d => (
                    <tr key={d._id} className="hover:bg-surface/50 cursor-pointer" onClick={() => openView(d)}>
                      <td className="py-3 pr-3 font-mono text-xs text-accent">{d.deliveryRef}</td>
                      <td className="py-3 pr-3 text-t1 font-medium">{d.clientName}</td>
                      <td className="py-3 pr-3 text-t2 text-xs">{d.contractRef}</td>
                      <td className="py-3 pr-3 text-t2">{d.truckPlate}</td>
                      <td className="py-3 pr-3 text-right text-t1">{d.plannedTons.toLocaleString()} t</td>
                      <td className="py-3 pr-3 text-right text-t1">{d.confirmedTons != null ? `${d.confirmedTons.toLocaleString()} t` : '—'}</td>
                      <td className="py-3 pr-3 text-right">
                        {d.tonVariance != null ? (
                          <span className={d.tonVariance < 0 ? 'text-rose-400' : 'text-emerald-400'}>
                            {d.tonVariance > 0 ? '+' : ''}{d.tonVariance.toLocaleString()} t
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-3 pr-3">
                        <span className={`text-xs border rounded px-2 py-0.5 ${STATUS_STYLES[d.status] ?? ''}`}>
                          {d.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 text-xs text-t3 whitespace-nowrap">{fmtDate(d.deliveryDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </OverlayScrollbarsComponent>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 border-t border-border shrink-0">
              <span className="text-xs text-t3">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="p-1.5 border border-border rounded hover:bg-surface disabled:opacity-40">
                  <CaretLeft size={14} />
                </button>
                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                  className="p-1.5 border border-border rounded hover:bg-surface disabled:opacity-40">
                  <CaretRight size={14} />
                </button>
              </div>
            </div>
          )}
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
      </div>
    </div>
  );
}
