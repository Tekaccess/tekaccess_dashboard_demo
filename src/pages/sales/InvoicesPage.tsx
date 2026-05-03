import React, { useState, useEffect, useCallback } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import {
  Plus, MagnifyingGlass, Receipt, Eye, Spinner, X,
  CurrencyCircleDollar, Warning, CheckCircle, CaretLeft, CaretRight,
} from '@phosphor-icons/react';
import {
  apiGetSalesInvoicesSummary, apiListSalesInvoices, apiCreateSalesInvoice,
  apiListInvoiceableDeliveries, apiVoidSalesInvoice,
  SalesInvoice, SalesInvoicesSummary, InvoiceableDelivery,
} from '../../lib/api';
import ModernModal from '../../components/ui/ModernModal';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';

const STATUS_STYLES: Record<string, string> = {
  draft:           'bg-surface text-t3 border-border',
  issued:          'bg-blue-500/10 text-blue-400 border-blue-500/20',
  partially_paid:  'bg-amber-500/10 text-amber-500 border-amber-500/20',
  paid:            'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  overdue:         'bg-orange-500/10 text-orange-400 border-orange-500/20',
  disputed:        'bg-rose-500/10 text-rose-400 border-rose-500/20',
  written_off:     'bg-surface text-t3 border-border',
};
const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', issued: 'Issued', partially_paid: 'Partially Paid',
  paid: 'Paid', overdue: 'Overdue', disputed: 'Disputed', written_off: 'Voided',
};

const TABS: { id: string; label: string }[] = [
  { id: '',                label: 'All' },
  { id: 'issued',          label: 'Issued' },
  { id: 'partially_paid',  label: 'Partial' },
  { id: 'overdue',         label: 'Overdue' },
  { id: 'paid',            label: 'Paid' },
  { id: 'disputed',        label: 'Disputed' },
];

function fmtMoney(n: number | null | undefined, cur = 'USD') {
  if (n == null) return '—';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n);
  } catch {
    return `${cur} ${Math.round(n).toLocaleString()}`;
  }
}
function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const inp = 'w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent transition-colors';

export default function SalesInvoicesPage() {
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [summary, setSummary] = useState<SalesInvoicesSummary | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<SalesInvoice | null>(null);
  const [viewOpen, setViewOpen] = useState(false);

  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [invoiceable, setInvoiceable] = useState<InvoiceableDelivery[]>([]);
  const [pickedDeliveryId, setPickedDeliveryId] = useState('');
  const [taxRate, setTaxRate] = useState('0');
  const [createError, setCreateError] = useState<string | null>(null);

  const [voidTarget, setVoidTarget] = useState<SalesInvoice | null>(null);
  const [voiding, setVoiding] = useState(false);

  const PAGE_LIMIT = 50;

  const load = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: String(PAGE_LIMIT) };
    if (search) params.search = search;
    if (activeTab) params.status = activeTab;
    const [iRes, sRes] = await Promise.all([
      apiListSalesInvoices(params),
      apiGetSalesInvoicesSummary(),
    ]);
    if (iRes.success) { setInvoices(iRes.data.invoices); setTotal(iRes.data.pagination.total); }
    if (sRes.success) setSummary(sRes.data.summary);
    setLoading(false);
  }, [search, activeTab, page]);

  useEffect(() => { load(); }, [load]);

  async function openCreate() {
    setCreateError(null);
    setPickedDeliveryId('');
    setTaxRate('0');
    setCreateOpen(true);
    const res = await apiListInvoiceableDeliveries();
    if (res.success) setInvoiceable(res.data.deliveries);
  }

  async function handleCreate() {
    if (!pickedDeliveryId) { setCreateError('Pick a confirmed delivery to invoice.'); return; }
    setCreating(true); setCreateError(null);
    const rate = Number(taxRate);
    const res = await apiCreateSalesInvoice({
      deliveryId: pickedDeliveryId,
      taxRate: Number.isFinite(rate) ? rate : 0,
    });
    setCreating(false);
    if (!res.success) { setCreateError((res as any).message || 'Failed to create invoice.'); return; }
    setCreateOpen(false);
    load();
  }

  async function handleVoid() {
    if (!voidTarget) return;
    setVoiding(true);
    const res = await apiVoidSalesInvoice(voidTarget._id);
    setVoiding(false);
    if (!res.success) { window.alert((res as any).message || 'Failed to void invoice.'); return; }
    setVoidTarget(null);
    setViewOpen(false);
    load();
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  const kpis = [
    {
      label: 'Outstanding',
      value: fmtMoney(summary?.totalOutstanding ?? 0),
      Icon: CurrencyCircleDollar, bg: 'bg-amber-500/10', color: 'text-amber-500',
    },
    {
      label: 'Revenue This Month',
      value: fmtMoney(summary?.revenueThisMonth ?? 0),
      Icon: CheckCircle, bg: 'bg-emerald-500/10', color: 'text-emerald-400',
    },
    {
      label: 'Overdue',
      value: summary?.overdue ?? 0,
      Icon: Warning, bg: 'bg-rose-500/10', color: 'text-rose-400',
    },
    {
      label: 'Receipts Today',
      value: fmtMoney(summary?.receiptsToday ?? 0),
      Icon: Receipt, bg: 'bg-accent-glow', color: 'text-accent',
    },
  ];

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-t1">Invoices</h1>
            <p className="text-sm text-t3 mt-1">{total.toLocaleString()} customer invoices</p>
          </div>
          <button onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-h transition-colors">
            <Plus size={16} /> New Invoice
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {kpis.map(({ label, value, Icon, bg, color }) => (
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

        {/* Table card */}
        <div className="bg-card rounded-xl border border-border">
          {/* Tabs */}
          <div className="flex gap-1 px-4 border-b border-border overflow-x-auto">
            {TABS.map(tab => (
              <button key={tab.id}
                onClick={() => { setActiveTab(tab.id); setPage(1); }}
                className={`px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id ? 'border-accent text-accent font-semibold' : 'border-transparent text-t3 hover:text-t1'}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <div className="relative flex-1 max-w-sm">
              <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
              <input className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent transition-colors"
                placeholder="Invoice ref, delivery, contract, client..."
                value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Spinner size={28} className="animate-spin text-accent" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-t3">
              <Receipt size={40} className="mb-2 opacity-40" />
              <p>No invoices found.</p>
            </div>
          ) : (
            <OverlayScrollbarsComponent options={{ scrollbars: { autoHide: 'never' } }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Ref</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Delivery</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Contract</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Total</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Outstanding</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Due</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv, i) => (
                    <tr key={inv._id}
                      className={`hover:bg-surface transition-colors cursor-pointer ${i < invoices.length - 1 ? 'border-b border-border' : ''}`}
                      onClick={() => { setSelected(inv); setViewOpen(true); }}>
                      <td className="px-4 py-3.5 font-mono text-xs text-accent">{inv.invoiceRef}</td>
                      <td className="px-4 py-3.5 text-t1 font-medium">{inv.clientName}</td>
                      <td className="px-4 py-3.5 text-t2 text-xs">{inv.deliveryRef}</td>
                      <td className="px-4 py-3.5 text-t2 text-xs">{inv.contractRef}</td>
                      <td className="px-4 py-3.5 text-right text-t1">{fmtMoney(inv.totalAmount, inv.currency)}</td>
                      <td className="px-4 py-3.5 text-right text-t1">{fmtMoney(inv.outstandingAmount, inv.currency)}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[inv.status] ?? ''}`}>
                          {STATUS_LABEL[inv.status] ?? inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-t3 whitespace-nowrap">{fmtDate(inv.dueDate)}</td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex justify-end gap-2 text-t3">
                          <button onClick={e => { e.stopPropagation(); setSelected(inv); setViewOpen(true); }} className="hover:text-t1 p-1"><Eye size={14} /></button>
                        </div>
                      </td>
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

      {/* Create modal — pick a confirmed delivery and invoice it */}
      <ModernModal
        isOpen={createOpen}
        onClose={() => { if (!creating) setCreateOpen(false); }}
        title="New Invoice"
        summaryContent={
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-black text-t3 uppercase tracking-widest mb-2">How invoicing works</p>
              <p className="text-xs text-t3 leading-relaxed">
                A sales invoice is raised against a confirmed delivery. The invoice
                amount is computed from the delivery's confirmed tons and the
                contract's unit price. Add VAT/tax as a rate (e.g. <span className="font-mono">0.18</span> for 18%).
              </p>
            </div>
          </div>
        }
        actions={
          <button onClick={handleCreate} disabled={creating || !pickedDeliveryId}
            className="px-6 py-2.5 bg-accent text-white rounded-xl text-sm font-bold shadow-lg shadow-accent/20 hover:bg-accent-h disabled:opacity-60 flex items-center gap-2">
            {creating && <Spinner size={14} className="animate-spin" />} Create Invoice
          </button>
        }
      >
        <div className="space-y-5">
          {createError && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-2 rounded-lg">{createError}</p>}

          <div>
            <label className="block text-xs text-t3 mb-1.5 font-bold uppercase tracking-wider">Confirmed Delivery *</label>
            {invoiceable.length === 0 ? (
              <p className="text-xs text-t3 italic px-3 py-2 bg-surface border border-border rounded-lg">
                No invoiceable deliveries — confirm a delivery first.
              </p>
            ) : (
              <select className={inp} value={pickedDeliveryId}
                onChange={e => setPickedDeliveryId(e.target.value)}>
                <option value="">— Select a delivery —</option>
                {invoiceable.map(d => (
                  <option key={d._id} value={d._id}>
                    {d.deliveryRef} · {d.clientName} · {d.confirmedTons.toLocaleString()} t · {d.contractRef}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs text-t3 mb-1.5 font-bold uppercase tracking-wider">Tax Rate</label>
            <input type="number" min={0} max={1} step={0.01} className={inp}
              value={taxRate} onChange={e => setTaxRate(e.target.value)}
              placeholder="e.g. 0.18 for 18%" />
            <p className="text-[10px] text-t3 mt-1">Leave at 0 if no VAT applies.</p>
          </div>
        </div>
      </ModernModal>

      {/* View modal */}
      <ModernModal
        isOpen={viewOpen && selected !== null}
        onClose={() => setViewOpen(false)}
        title={selected?.invoiceRef ?? ''}
        summaryContent={selected ? (
          <div className="space-y-6">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-t3 uppercase tracking-widest">Status</p>
              <div className="bg-card/50 border border-border rounded-xl p-4 space-y-3">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[selected.status] ?? ''}`}>
                  {STATUS_LABEL[selected.status] ?? selected.status}
                </span>
                <div className="flex justify-between text-sm">
                  <span className="text-t3">Total</span>
                  <span className="font-bold text-t1">{fmtMoney(selected.totalAmount, selected.currency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-t3">Outstanding</span>
                  <span className="font-bold text-amber-400">{fmtMoney(selected.outstandingAmount, selected.currency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-t3">Received</span>
                  <span className="font-bold text-emerald-400">{fmtMoney(selected.totalReceived, selected.currency)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        actions={selected && selected.totalReceived === 0 && selected.status !== 'written_off' ? (
          <button onClick={() => setVoidTarget(selected)}
            className="px-4 py-2 text-sm border border-rose-500/40 text-rose-400 rounded-lg hover:bg-rose-500/10">
            Void Invoice
          </button>
        ) : undefined}
      >
        {selected && (
          <div className="space-y-5">
            <div>
              <p className="text-xs text-t3 font-mono">{selected.invoiceRef}</p>
              <h3 className="text-base font-semibold text-t1 mt-0.5">{selected.clientName}</h3>
              <p className="text-xs text-t3 mt-0.5">{selected.contractRef} · {selected.deliveryRef}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Issued',         fmtDate(selected.issuedAt)],
                ['Due',            fmtDate(selected.dueDate)],
                ['Paid',           selected.paidAt ? fmtDate(selected.paidAt) : '—'],
                ['Days Overdue',   selected.daysOverdue > 0 ? String(selected.daysOverdue) : '—'],
                ['Tons Invoiced',  `${selected.invoicedTons.toLocaleString()} t`],
                ['Unit Price',     fmtMoney(selected.unitPrice, selected.currency)],
                ['Net',            fmtMoney(selected.netAmount, selected.currency)],
                ['Tax',            `${fmtMoney(selected.taxAmount, selected.currency)} (${(selected.taxRate * 100).toFixed(0)}%)`],
              ].map(([k, v]) => (
                <div key={k} className="p-3 bg-surface/50 border border-border rounded-xl">
                  <p className="text-[10px] text-t3 uppercase font-black mb-1">{k}</p>
                  <p className="text-sm font-bold text-t1">{v}</p>
                </div>
              ))}
            </div>

            {selected.receipts.length > 0 && (
              <div>
                <p className="text-[11px] font-black text-t3 uppercase tracking-widest mb-2">Receipts</p>
                <div className="space-y-2">
                  {selected.receipts.map((r) => (
                    <div key={r.receiptRef} className="flex items-center justify-between p-3 bg-surface/50 border border-border rounded-xl text-sm">
                      <div className="min-w-0">
                        <p className="font-mono text-xs text-accent">{r.receiptRef}</p>
                        <p className="text-xs text-t3">{fmtDate(r.receivedAt)} · {r.paymentMethod.replace('_', ' ')}</p>
                      </div>
                      <span className="font-bold text-emerald-400">{fmtMoney(r.amount, selected.currency)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selected.disputeReason && (
              <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl text-sm">
                <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Dispute Reason</p>
                <p className="text-rose-300">{selected.disputeReason}</p>
              </div>
            )}
          </div>
        )}
      </ModernModal>

      <ConfirmDialog
        open={voidTarget !== null}
        onOpenChange={(v) => { if (!v) setVoidTarget(null); }}
        onConfirm={handleVoid}
        tone="danger"
        icon="warning"
        title={`Void ${voidTarget?.invoiceRef ?? ''}?`}
        message="This marks the invoice as written off and releases its delivery so it can be re-invoiced."
        confirmLabel="Void Invoice"
        busy={voiding}
      />
    </>
  );
}
