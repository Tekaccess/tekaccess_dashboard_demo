import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import {
  Receipt, Clock, CheckCircle, Warning, CurrencyCircleDollar,
  Spinner, MagnifyingGlass, CaretLeft, CaretRight, Plus, XCircle,
  Bank, FileText,
} from '@phosphor-icons/react';
import {
  apiListInvoices, apiGetInvoicesSummary, apiGetInvoicesAging,
  apiListInvoiceableDeliveries, apiCreateInvoice, apiPostInvoicePayment,
  apiUpdateInvoiceStatus, apiVoidInvoice, apiListBankAccounts,
  Invoice, InvoicesSummary, InvoiceAging, InvoiceableDelivery, BankAccount,
} from '../../lib/api';
import DocumentSidePanel from '../../components/DocumentSidePanel';
import ModernModal from '../../components/ui/ModernModal';

const STATUS_TABS = [
  { id: '', label: 'All' },
  { id: 'issued', label: 'Issued' },
  { id: 'partially_paid', label: 'Partial' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'paid', label: 'Paid' },
  { id: 'disputed', label: 'Disputed' },
];

const STATUS_STYLES: Record<string, string> = {
  draft:           'bg-slate-500/10 text-slate-400 border-slate-500/20',
  issued:          'bg-blue-500/10 text-blue-400 border-blue-500/20',
  partially_paid:  'bg-amber-500/10 text-amber-400 border-amber-500/20',
  paid:            'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  overdue:         'bg-rose-500/10 text-rose-400 border-rose-500/20',
  disputed:        'bg-orange-500/10 text-orange-400 border-orange-500/20',
  written_off:     'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

const BUCKET_LABELS: Record<string, string> = {
  current: 'Not Yet Due', '1_30': '1-30 Days', '31_60': '31-60 Days',
  '61_90': '61-90 Days', '90_plus': '90+ Days',
};
const BUCKET_COLORS: Record<string, string> = {
  current: 'bg-emerald-500', '1_30': 'bg-amber-500',
  '31_60': 'bg-orange-500', '61_90': 'bg-rose-500', '90_plus': 'bg-red-700',
};

function formatMoney(n: number, currency = 'USD') {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M ${currency}`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K ${currency}`;
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`;
}

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString();
}

const inp =
  'w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<InvoicesSummary | null>(null);
  const [aging, setAging] = useState<InvoiceAging | null>(null);
  const [agingByClient, setAgingByClient] = useState<{ clientName: string; total: number; overdue: number; count: number }[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_LIMIT = 50;

  const [selected, setSelected] = useState<Invoice | null>(null);
  const [panelMode, setPanelMode] = useState<'view' | 'create' | 'pay' | null>(null);

  // Create-from-delivery state
  const [invoiceableDeliveries, setInvoiceableDeliveries] = useState<InvoiceableDelivery[]>([]);
  const [pickedDeliveryId, setPickedDeliveryId] = useState('');
  const [createTaxRate, setCreateTaxRate] = useState('0');

  // Payment state
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [payAmount, setPayAmount] = useState('');
  const [payBankId, setPayBankId] = useState('');
  const [payMethod, setPayMethod] = useState<'bank_transfer' | 'cheque' | 'mobile_money' | 'cash' | 'other'>('bank_transfer');
  const [payReference, setPayReference] = useState('');
  const [payNotes, setPayNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: String(PAGE_LIMIT) };
    if (activeTab) params.status = activeTab;
    if (search) params.search = search;
    const [listRes, sumRes, agingRes] = await Promise.all([
      apiListInvoices(params),
      apiGetInvoicesSummary(),
      apiGetInvoicesAging(),
    ]);
    if (listRes.success) {
      setInvoices(listRes.data.invoices);
      setTotal(listRes.data.pagination.total);
    }
    if (sumRes.success) setSummary(sumRes.data.summary);
    if (agingRes.success) {
      setAging(agingRes.data.aging);
      setAgingByClient(agingRes.data.byClient || []);
    }
    setLoading(false);
  }, [activeTab, page, search]);

  useEffect(() => { load(); }, [load]);

  async function openCreate() {
    setPickedDeliveryId('');
    setCreateTaxRate('0');
    setActionError(null);
    const res = await apiListInvoiceableDeliveries();
    if (res.success) setInvoiceableDeliveries(res.data.deliveries);
    setPanelMode('create');
    setSelected(null);
  }

  function openView(inv: Invoice) {
    setSelected(inv);
    setActionError(null);
    setPanelMode('view');
  }

  async function openPay(inv: Invoice) {
    setSelected(inv);
    setPayAmount(String(inv.outstandingAmount));
    setPayMethod('bank_transfer');
    setPayReference('');
    setPayNotes('');
    setActionError(null);
    if (bankAccounts.length === 0) {
      const res = await apiListBankAccounts();
      if (res.success) {
        setBankAccounts(res.data.accounts);
        const primary = res.data.accounts.find(a => a.isPrimary) || res.data.accounts[0];
        if (primary) setPayBankId(primary._id);
      }
    } else {
      const primary = bankAccounts.find(a => a.isPrimary) || bankAccounts[0];
      if (primary && !payBankId) setPayBankId(primary._id);
    }
    setPanelMode('pay');
  }

  async function handleCreate() {
    if (!pickedDeliveryId) {
      setActionError('Pick a confirmed delivery to invoice.');
      return;
    }
    setSubmitting(true); setActionError(null);
    const res = await apiCreateInvoice({
      deliveryId: pickedDeliveryId,
      taxRate: Number(createTaxRate) / 100,
    });
    setSubmitting(false);
    if (!res.success) {
      setActionError((res as any).message || 'Failed to create invoice');
      return;
    }
    setPanelMode(null);
    load();
  }

  async function handlePay() {
    if (!selected) return;
    const amt = Number(payAmount);
    if (!amt || amt <= 0) { setActionError('Amount must be positive'); return; }
    if (!payBankId) { setActionError('Pick a bank account'); return; }
    setSubmitting(true); setActionError(null);
    const res = await apiPostInvoicePayment(selected._id, {
      amount: amt,
      bankAccountId: payBankId,
      paymentMethod: payMethod,
      reference: payReference || undefined,
      notes: payNotes || undefined,
    });
    setSubmitting(false);
    if (!res.success) {
      setActionError((res as any).message || 'Failed to post payment');
      return;
    }
    setPanelMode(null);
    setSelected(null);
    load();
  }

  async function handleVoid() {
    if (!selected) return;
    if (!confirm(`Void invoice ${selected.invoiceRef}? This cannot be undone.`)) return;
    setSubmitting(true);
    const res = await apiVoidInvoice(selected._id, 'Voided from UI');
    setSubmitting(false);
    if (res.success) {
      setPanelMode(null);
      setSelected(null);
      load();
    }
  }

  async function handleDispute() {
    if (!selected) return;
    const reason = prompt('Dispute reason?');
    if (!reason) return;
    setSubmitting(true);
    const res = await apiUpdateInvoiceStatus(selected._id, { status: 'disputed', disputeReason: reason });
    setSubmitting(false);
    if (res.success) { setPanelMode(null); setSelected(null); load(); }
  }

  const totalPages = Math.ceil(total / PAGE_LIMIT);

  // ── Side panel content ──────────────────────────────────────────────────
  // The create flow uses a centered ModernModal (mounted at the bottom of
  // this component); the side panel only handles view/pay.
  const formContent = useMemo(() => {
    if (panelMode === 'pay' && selected) {
      return (
        <div className="space-y-5 pb-10">
          <section className="space-y-2">
            <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Post Payment</p>
            <div className="flex justify-between text-sm">
              <span className="text-t3">Invoice</span>
              <span className="font-mono text-xs text-accent">{selected.invoiceRef}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-t3">Outstanding</span>
              <span className="font-bold text-amber-400">{formatMoney(selected.outstandingAmount, selected.currency)}</span>
            </div>
          </section>
          <div>
            <label className="block text-[10px] text-t3 mb-1">Amount Received *</label>
            <input className={inp} type="number" min="0" step="0.01"
              value={payAmount} onChange={e => setPayAmount(e.target.value)} />
          </div>
          <div>
            <label className="block text-[10px] text-t3 mb-1">Bank Account *</label>
            <select className={inp} value={payBankId} onChange={e => setPayBankId(e.target.value)}>
              <option value="">— select —</option>
              {bankAccounts.map(b => (
                <option key={b._id} value={b._id}>{b.accountCode} · {b.bankName} ({b.currency})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-t3 mb-1">Payment Method *</label>
            <select className={inp} value={payMethod} onChange={e => setPayMethod(e.target.value as any)}>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="cash">Cash</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-t3 mb-1">Reference (cheque #, txn ID)</label>
            <input className={inp} value={payReference} onChange={e => setPayReference(e.target.value)} />
          </div>
          <div>
            <label className="block text-[10px] text-t3 mb-1">Notes</label>
            <textarea rows={2} className={`${inp} resize-none`}
              value={payNotes} onChange={e => setPayNotes(e.target.value)} />
          </div>
          {actionError && (
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-sm text-rose-400">{actionError}</div>
          )}
          <button onClick={handlePay} disabled={submitting}
            className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all disabled:opacity-60 flex items-center justify-center gap-1.5">
            {submitting ? <Spinner size={13} className="animate-spin" /> : <CheckCircle size={14} weight="bold" />}
            Post Payment
          </button>
        </div>
      );
    }

    if (panelMode === 'view' && selected) {
      return (
        <div className="space-y-5 pb-10">
          <section className="space-y-2">
            <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Invoice Details</p>
            {([
              ['Ref', selected.invoiceRef],
              ['Delivery', selected.deliveryRef],
              ['Contract', selected.contractRef],
              ['Client', selected.clientName],
              ['Issued', formatDate(selected.issuedAt)],
              ['Due', formatDate(selected.dueDate)],
              ['Aging', BUCKET_LABELS[selected.agingBucket] || selected.agingBucket],
            ] as [string, string][]).map(([l, v]) => (
              <div key={l} className="flex justify-between text-sm">
                <span className="text-t3">{l}</span>
                <span className="font-medium text-t1">{v}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm">
              <span className="text-t3">Status</span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[selected.status] || ''}`}>
                {selected.status}
              </span>
            </div>
          </section>
          <section className="space-y-2">
            <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Financials</p>
            <div className="flex justify-between text-sm"><span className="text-t3">Tons</span><span className="font-medium text-t1">{selected.invoicedTons}</span></div>
            <div className="flex justify-between text-sm"><span className="text-t3">Unit Price</span><span className="font-medium text-t1">{formatMoney(selected.unitPrice, selected.currency)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-t3">Net</span><span className="font-medium text-t1">{formatMoney(selected.netAmount, selected.currency)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-t3">Tax ({(selected.taxRate * 100).toFixed(1)}%)</span><span className="font-medium text-t1">{formatMoney(selected.taxAmount, selected.currency)}</span></div>
            <div className="flex justify-between text-sm pt-1 border-t border-border"><span className="text-t3">Total</span><span className="font-bold text-t1">{formatMoney(selected.totalAmount, selected.currency)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-t3">Received</span><span className="font-bold text-emerald-400">{formatMoney(selected.totalReceived, selected.currency)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-t3">Outstanding</span><span className="font-bold text-amber-400">{formatMoney(selected.outstandingAmount, selected.currency)}</span></div>
          </section>
          {selected.receipts.length > 0 && (
            <section className="space-y-2">
              <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Receipts</p>
              <div className="space-y-1.5">
                {selected.receipts.map((r, i) => (
                  <div key={i} className="flex justify-between items-start text-xs p-2 bg-surface rounded-lg border border-border">
                    <div>
                      <div className="font-mono text-t2">{r.receiptRef}</div>
                      <div className="text-t3 text-[10px]">{formatDate(r.receivedAt)} · {r.paymentMethod} · {r.bankAccountCode}</div>
                      {r.reference && <div className="text-t3 text-[10px]">Ref: {r.reference}</div>}
                    </div>
                    <span className="font-bold text-emerald-400">{formatMoney(r.amount, selected.currency)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
          {selected.disputeReason && (
            <section className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <p className="text-[10px] uppercase font-bold text-orange-400 mb-1">Dispute</p>
              <p className="text-sm text-t1">{selected.disputeReason}</p>
            </section>
          )}
          <section className="flex flex-wrap gap-2 pt-2 border-t border-border">
            {!['paid', 'written_off'].includes(selected.status) && (
              <button onClick={() => openPay(selected)}
                className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-1">
                <CurrencyCircleDollar size={12} weight="bold" /> Post Payment
              </button>
            )}
            {!['paid', 'disputed', 'written_off'].includes(selected.status) && (
              <button onClick={handleDispute} disabled={submitting}
                className="flex-1 py-2 border border-orange-500/30 text-orange-400 rounded-lg text-xs font-bold hover:bg-orange-500/10 transition-all flex items-center justify-center gap-1">
                <Warning size={12} weight="bold" /> Dispute
              </button>
            )}
            {selected.totalReceived === 0 && selected.status !== 'written_off' && (
              <button onClick={handleVoid} disabled={submitting}
                className="flex-1 py-2 border border-rose-500/30 text-rose-400 rounded-lg text-xs font-bold hover:bg-rose-500/10 transition-all flex items-center justify-center gap-1">
                <XCircle size={12} weight="bold" /> Void
              </button>
            )}
          </section>
        </div>
      );
    }
    return null;
  }, [panelMode, selected, invoiceableDeliveries, pickedDeliveryId, createTaxRate,
      bankAccounts, payAmount, payBankId, payMethod, payReference, payNotes,
      submitting, actionError]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-t1">Customer Invoices</h1>
          <p className="text-sm text-t3 mt-0.5">Issue invoices, post payments, and watch the receivables aging.</p>
        </div>
        <button onClick={openCreate}
          className="px-4 py-2 bg-accent text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all flex items-center gap-2">
          <Plus size={14} weight="bold" /> New Invoice
        </button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Outstanding', value: formatMoney(summary.totalOutstanding), Icon: CurrencyCircleDollar, color: 'text-amber-500', bg: 'bg-amber-500/10' },
            { label: 'Overdue Invoices', value: summary.overdue, Icon: Warning, color: 'text-rose-500', bg: 'bg-rose-500/10' },
            { label: 'Revenue This Month', value: formatMoney(summary.revenueThisMonth), Icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
            { label: 'Receipts Today', value: formatMoney(summary.receiptsToday), Icon: Bank, color: 'text-blue-500', bg: 'bg-blue-500/10' },
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

      {/* Aging panel */}
      {aging && (
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-t1 uppercase tracking-wide">Receivables Aging</h3>
            <span className="text-xs text-t3">Total open: <span className="text-t1 font-bold">{formatMoney(aging.totalOutstanding)}</span></span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            {(['current', '1_30', '31_60', '61_90', '90_plus'] as const).map(b => {
              const pct = aging.totalOutstanding > 0 ? (aging.buckets[b] / aging.totalOutstanding) * 100 : 0;
              return (
                <div key={b} className="bg-surface rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${BUCKET_COLORS[b]}`} />
                    <span className="text-[10px] uppercase font-bold text-t3">{BUCKET_LABELS[b]}</span>
                  </div>
                  <p className="text-lg font-bold text-t1">{formatMoney(aging.buckets[b])}</p>
                  <p className="text-[10px] text-t3">{aging.counts[b]} invoice{aging.counts[b] === 1 ? '' : 's'} · {pct.toFixed(0)}%</p>
                </div>
              );
            })}
          </div>
          {agingByClient.length > 0 && (
            <div>
              <p className="text-[10px] uppercase font-bold text-t3 mb-2">Top clients by overdue</p>
              <div className="space-y-1.5">
                {agingByClient.slice(0, 5).map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-t1">{c.clientName}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-t3">{c.count} inv</span>
                      <span className="text-xs text-rose-400 font-bold w-32 text-right">overdue {formatMoney(c.overdue)}</span>
                      <span className="text-sm text-t1 font-bold w-32 text-right">{formatMoney(c.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs + table */}
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
            <input
              className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent transition-colors"
              placeholder="Search invoice ref, client, contract…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48"><Spinner size={28} className="animate-spin text-accent" /></div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-t3 gap-3">
            <Receipt size={40} weight="duotone" className="opacity-40" />
            <p>No invoices found.</p>
          </div>
        ) : (
          <OverlayScrollbarsComponent options={{ scrollbars: { autoHide: 'never' } }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Ref</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Contract</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Total</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Outstanding</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Aging</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.map(inv => (
                  <tr key={inv._id} className="hover:bg-surface cursor-pointer transition-colors" onClick={() => openView(inv)}>
                    <td className="px-4 py-3.5 font-mono text-xs text-accent font-semibold whitespace-nowrap">{inv.invoiceRef}</td>
                    <td className="px-4 py-3.5 text-t1 font-medium">{inv.clientName}</td>
                    <td className="px-4 py-3.5 text-xs text-t3 whitespace-nowrap">{inv.contractRef}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-t1 whitespace-nowrap">{formatMoney(inv.totalAmount, inv.currency)}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-amber-400 whitespace-nowrap">{formatMoney(inv.outstandingAmount, inv.currency)}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[inv.status] || ''}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-xs text-t2">
                        <span className={`w-2 h-2 rounded-full ${BUCKET_COLORS[inv.agingBucket] || 'bg-slate-500'}`} />
                        {BUCKET_LABELS[inv.agingBucket] || inv.agingBucket}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-t3 whitespace-nowrap">{formatDate(inv.dueDate)}</td>
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
        isOpen={panelMode === 'view' || panelMode === 'pay'}
        onClose={() => { setPanelMode(null); setSelected(null); setActionError(null); }}
        title={
          panelMode === 'pay' ? `Payment · ${selected?.invoiceRef}` :
          selected?.invoiceRef || 'Invoice'
        }
        footerInfo={selected ? `${selected.clientName} · ${selected.contractRef}` : ''}
        formContent={formContent}
        previewContent={null}
      />

      <ModernModal
        isOpen={panelMode === 'create'}
        onClose={() => { if (!submitting) { setPanelMode(null); setActionError(null); } }}
        title="New Invoice"
        summaryContent={
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-black text-t3 uppercase tracking-widest mb-2">How invoicing works</p>
              <p className="text-xs text-t3 leading-relaxed">
                A sales invoice is raised against a confirmed delivery. The invoice
                amount is computed from the delivery's confirmed tons and the
                contract's unit price. Tax rate is entered as a percentage
                (e.g. <span className="font-mono">18</span> for 18% VAT).
              </p>
            </div>
          </div>
        }
        actions={
          <button onClick={handleCreate} disabled={submitting || !pickedDeliveryId}
            className="px-6 py-2.5 bg-accent text-white rounded-xl text-sm font-bold shadow-lg shadow-accent/20 hover:bg-accent-h disabled:opacity-60 flex items-center gap-2">
            {submitting && <Spinner size={14} className="animate-spin" />} Create Invoice
          </button>
        }
      >
        <div className="space-y-5">
          {actionError && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-2 rounded-lg">{actionError}</p>
          )}

          <div>
            <label className="block text-xs text-t3 mb-1.5 font-bold uppercase tracking-wider">Confirmed Delivery *</label>
            {invoiceableDeliveries.length === 0 ? (
              <p className="text-xs text-t3 italic px-3 py-2 bg-surface border border-border rounded-lg">
                No invoiceable deliveries — confirm a delivery first.
              </p>
            ) : (
              <select className={inp} value={pickedDeliveryId}
                onChange={e => setPickedDeliveryId(e.target.value)}>
                <option value="">— Select a delivery —</option>
                {invoiceableDeliveries.map(d => (
                  <option key={d._id} value={d._id}>
                    {d.deliveryRef} · {d.clientName} · {d.confirmedTons.toLocaleString()} t · {d.contractRef}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs text-t3 mb-1.5 font-bold uppercase tracking-wider">Tax Rate (%)</label>
            <input type="number" min={0} max={100} step={0.5} className={inp}
              value={createTaxRate} onChange={e => setCreateTaxRate(e.target.value)}
              placeholder="e.g. 18 for 18%" />
            <p className="text-[10px] text-t3 mt-1">Leave at 0 if no VAT applies.</p>
          </div>
        </div>
      </ModernModal>
    </div>
  );
}
