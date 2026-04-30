import React, { useState, useEffect, useCallback } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import {
  Plus, MagnifyingGlass, Receipt, PencilSimple, Eye,
  Spinner, Trash, CheckCircle, Warning, X, Handshake, Truck,
  CurrencyCircleDollar, CalendarBlank, ArrowRight,
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';
import {
  apiGetProcurementInvoicesSummary, apiListProcurementInvoices,
  apiCreateProcurementInvoice, apiUpdateProcurementInvoice, apiDeleteProcurementInvoice,
  apiListSuppliers, apiListTransporters,
  type ProcurementInvoice, type ProcurementInvoiceSummary,
  type Supplier, type Transporter,
} from '../../lib/api';
import ModernModal from '../../components/ui/ModernModal';
import ColumnSelector, { useColumnVisibility, ColDef } from '../../components/ui/ColumnSelector';

const CURRENCIES = ['USD', 'RWF', 'EUR', 'KES', 'UGX', 'TZS'];
const ALL_STATUSES = ['draft', 'sent', 'received', 'approved', 'paid', 'rejected', 'overdue'] as const;

const STATUS_STYLES: Record<string, string> = {
  draft:    'bg-surface text-t3 border-border',
  sent:     'bg-blue-500/10 text-blue-400 border-blue-500/20',
  received: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  approved: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  paid:     'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  rejected: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  overdue:  'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

const STATUS_DOT: Record<string, string> = {
  draft:    'bg-t3',
  sent:     'bg-blue-400',
  received: 'bg-violet-400',
  approved: 'bg-amber-500',
  paid:     'bg-emerald-400',
  rejected: 'bg-rose-400',
  overdue:  'bg-orange-400',
};

const COLS: ColDef[] = [
  { key: 'ref',          label: 'Settlement Ref', defaultVisible: true  },
  { key: 'party',        label: 'Counterparty',   defaultVisible: true  },
  { key: 'type',         label: 'Type',           defaultVisible: true  },
  { key: 'po',           label: 'Linked PO',      defaultVisible: true  },
  { key: 'amount',       label: 'Amount',         defaultVisible: true  },
  { key: 'invoiceDate',  label: 'Issue Date',     defaultVisible: true  },
  { key: 'dueDate',      label: 'Due Date',       defaultVisible: true  },
  { key: 'status',       label: 'Status',         defaultVisible: true  },
  { key: 'actions',      label: 'Actions',        defaultVisible: true  },
];

type ModalMode = 'new' | 'edit' | 'view' | null;

interface DraftInvoice {
  counterpartyType: 'supplier' | 'transporter';
  counterpartyId: string;
  counterpartyName: string;
  counterpartyCode: string;
  linkedPoRef: string;
  amount: string;
  currency: string;
  taxAmount: string;
  invoiceDate: string;
  dueDate: string;
  status: ProcurementInvoice['status'];
  description: string;
  notes: string;
  paymentMethod: string;
  paymentRef: string;
}

function emptyDraft(): DraftInvoice {
  return {
    counterpartyType: 'supplier',
    counterpartyId: '', counterpartyName: '', counterpartyCode: '',
    linkedPoRef: '',
    amount: '', currency: 'USD', taxAmount: '',
    invoiceDate: new Date().toISOString().slice(0, 10),
    dueDate: '', status: 'draft',
    description: '', notes: '', paymentMethod: '', paymentRef: '',
  };
}

const inp = 'w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent transition-colors';

function fmt(n: number | undefined | null, cur = 'USD') {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<ProcurementInvoice[]>([]);
  const [summary, setSummary] = useState<ProcurementInvoiceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [selected, setSelected] = useState<ProcurementInvoice | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [draft, setDraft] = useState<DraftInvoice>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProcurementInvoice | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { visible: colVis, toggle: colToggle } = useColumnVisibility('procurement-invoices', COLS);

  const load = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    if (typeFilter) params.counterpartyType = typeFilter;
    const [invRes, sumRes] = await Promise.all([
      apiListProcurementInvoices(params),
      apiGetProcurementInvoicesSummary(),
    ]);
    if (invRes.success) setInvoices(invRes.data.invoices);
    if (sumRes.success) setSummary(sumRes.data.summary);
    setLoading(false);
  }, [search, statusFilter, typeFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    apiListSuppliers(undefined, 'active').then(r => r.success && setSuppliers(r.data.suppliers));
    apiListTransporters({}).then(r => r.success && setTransporters(r.data.transporters));
  }, []);

  function openNew() {
    setDraft(emptyDraft()); setSelected(null); setError(null); setModalMode('new');
  }

  function openEdit(inv: ProcurementInvoice) {
    setDraft({
      counterpartyType: inv.counterpartyType,
      counterpartyId: inv.counterpartyId,
      counterpartyName: inv.counterpartyName,
      counterpartyCode: inv.counterpartyCode || '',
      linkedPoRef: inv.linkedPoRef || '',
      amount: String(inv.amount),
      currency: inv.currency,
      taxAmount: String(inv.taxAmount || ''),
      invoiceDate: inv.invoiceDate?.slice(0, 10) || '',
      dueDate: inv.dueDate?.slice(0, 10) || '',
      status: inv.status,
      description: inv.description || '',
      notes: inv.notes || '',
      paymentMethod: inv.paymentMethod || '',
      paymentRef: inv.paymentRef || '',
    });
    setSelected(inv); setError(null); setModalMode('edit');
  }

  async function handleSave() {
    if (!draft.counterpartyId || !draft.counterpartyName) {
      setError('Counterparty is required.'); return;
    }
    if (!draft.amount || isNaN(Number(draft.amount))) {
      setError('A valid amount is required.'); return;
    }
    if (!draft.invoiceDate) { setError('Invoice date is required.'); return; }

    setSaving(true); setError(null);
    const payload = {
      counterpartyType: draft.counterpartyType,
      counterpartyId: draft.counterpartyId,
      counterpartyName: draft.counterpartyName,
      counterpartyCode: draft.counterpartyCode || null,
      linkedPoRef: draft.linkedPoRef || null,
      amount: Number(draft.amount),
      currency: draft.currency,
      taxAmount: Number(draft.taxAmount || 0),
      invoiceDate: draft.invoiceDate,
      dueDate: draft.dueDate || null,
      status: draft.status,
      description: draft.description || null,
      notes: draft.notes || null,
      paymentMethod: draft.paymentMethod || null,
      paymentRef: draft.paymentRef || null,
    };
    const res = modalMode === 'new'
      ? await apiCreateProcurementInvoice(payload as any)
      : await apiUpdateProcurementInvoice(selected!._id, payload as any);
    setSaving(false);
    if (!res.success) { setError((res as any).message || 'Save failed.'); return; }
    setModalMode(null); load();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await apiDeleteProcurementInvoice(deleteTarget._id);
      setDeleteTarget(null);
      await load();
    } finally {
      setIsDeleting(false);
    }
  }

  function onCounterpartyTypeChange(type: 'supplier' | 'transporter') {
    setDraft(d => ({ ...d, counterpartyType: type, counterpartyId: '', counterpartyName: '', counterpartyCode: '' }));
  }

  function onCounterpartySelect(id: string) {
    if (draft.counterpartyType === 'supplier') {
      const s = suppliers.find(s => s._id === id);
      setDraft(d => ({ ...d, counterpartyId: id, counterpartyName: s?.name || '', counterpartyCode: s?.supplierCode || '' }));
    } else {
      const t = transporters.find(t => t._id === id);
      setDraft(d => ({ ...d, counterpartyId: id, counterpartyName: t?.name || '', counterpartyCode: t?.transporterCode || '' }));
    }
  }

  const modalSummary = (
    <div className="space-y-4">
      <div className="aspect-video bg-gradient-to-br from-accent/20 to-surface rounded-xl flex items-center justify-center p-6 border border-border">
        {draft.counterpartyName ? (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-3 text-accent border border-accent/20 shadow-lg shadow-accent/10">
              {draft.counterpartyType === 'supplier'
                ? <Handshake size={32} weight="duotone" />
                : <Truck size={32} weight="duotone" />}
            </div>
            <p className="font-semibold text-t1 text-sm truncate max-w-[200px]">{draft.counterpartyName}</p>
            {draft.counterpartyCode && <p className="text-xs text-t3 font-mono mt-0.5">{draft.counterpartyCode}</p>}
          </div>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center mx-auto mb-3 text-t3 border border-border border-dashed">
              <Receipt size={32} />
            </div>
            <p className="text-sm text-t3 font-medium">New Settlement</p>
            <p className="text-xs text-t4 mt-1">Fill in details</p>
          </div>
        )}
      </div>

      <div className="bg-card rounded-xl border border-border p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <span className="text-xs text-t3">Type</span>
          <span className="text-xs font-medium text-t1 capitalize">{draft.counterpartyType}</span>
        </div>
        <div className="flex items-center justify-between border-b border-border pb-2">
          <span className="text-xs text-t3">Currency</span>
          <span className="text-xs font-medium text-t1">{draft.currency}</span>
        </div>
        {draft.amount && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-t3">Total</span>
            <span className="text-sm font-bold text-t1">
              {fmt(Number(draft.amount) + Number(draft.taxAmount || 0), draft.currency)}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  const formContent = modalMode !== 'view' ? (
    <div className="space-y-5">
      {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-2 rounded-lg">{error}</p>}

      <div>
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest mb-3">Counterparty</p>
        <div className="space-y-3">
          <div className="flex gap-2">
            {(['supplier', 'transporter'] as const).map(t => (
              <button key={t}
                type="button"
                onClick={() => onCounterpartyTypeChange(t)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  draft.counterpartyType === t
                    ? 'bg-accent-glow text-accent border-accent/30'
                    : 'text-t2 border-border hover:bg-surface'
                }`}>
                {t === 'supplier' ? <Handshake size={14} weight="duotone" /> : <Truck size={14} weight="duotone" />}
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-xs text-t3 mb-1.5">
              {draft.counterpartyType === 'supplier' ? 'Supplier' : 'Transporter'} *
            </label>
            <select className={inp} value={draft.counterpartyId} onChange={e => onCounterpartySelect(e.target.value)}>
              <option value="">— Select {draft.counterpartyType} —</option>
              {draft.counterpartyType === 'supplier'
                ? suppliers.map(s => <option key={s._id} value={s._id}>{s.name} ({s.supplierCode})</option>)
                : transporters.map(t => <option key={t._id} value={t._id}>{t.name} ({t.transporterCode})</option>)
              }
            </select>
          </div>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest mb-3">Settlement Details</p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-t3 mb-1.5">Linked PO Reference</label>
            <input className={inp} value={draft.linkedPoRef}
              onChange={e => setDraft(d => ({ ...d, linkedPoRef: e.target.value }))}
              placeholder="e.g. PO-2025-0012" />
          </div>
          <div>
            <label className="block text-xs text-t3 mb-1.5">Description</label>
            <input className={inp} value={draft.description}
              onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
              placeholder="What is this settlement for?" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-t3 mb-1.5">Issue Date *</label>
              <input type="date" className={inp} value={draft.invoiceDate}
                onChange={e => setDraft(d => ({ ...d, invoiceDate: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-t3 mb-1.5">Due Date</label>
              <input type="date" className={inp} value={draft.dueDate}
                onChange={e => setDraft(d => ({ ...d, dueDate: e.target.value }))} />
            </div>
          </div>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest mb-3">Financials</p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-t3 mb-1.5">Amount *</label>
              <input type="number" min={0} step="0.01" className={inp} value={draft.amount}
                onChange={e => setDraft(d => ({ ...d, amount: e.target.value }))}
                placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs text-t3 mb-1.5">Tax Amount</label>
              <input type="number" min={0} step="0.01" className={inp} value={draft.taxAmount}
                onChange={e => setDraft(d => ({ ...d, taxAmount: e.target.value }))}
                placeholder="0.00" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-t3 mb-1.5">Currency</label>
            <select className={inp} value={draft.currency}
              onChange={e => setDraft(d => ({ ...d, currency: e.target.value }))}>
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {modalMode === 'edit' && (
        <div>
          <p className="text-[11px] font-black text-t3 uppercase tracking-widest mb-3">Status</p>
          <select className={inp} value={draft.status}
            onChange={e => setDraft(d => ({ ...d, status: e.target.value as DraftInvoice['status'] }))}>
            {ALL_STATUSES.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
      )}

      {(draft.status === 'paid' || modalMode === 'edit') && (
        <div>
          <p className="text-[11px] font-black text-t3 uppercase tracking-widest mb-3">Payment</p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-t3 mb-1.5">Payment Method</label>
              <input className={inp} value={draft.paymentMethod}
                onChange={e => setDraft(d => ({ ...d, paymentMethod: e.target.value }))}
                placeholder="e.g. Bank Transfer, Cash" />
            </div>
            <div>
              <label className="block text-xs text-t3 mb-1.5">Payment Reference</label>
              <input className={inp} value={draft.paymentRef}
                onChange={e => setDraft(d => ({ ...d, paymentRef: e.target.value }))}
                placeholder="Transaction ID or cheque number" />
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs text-t3 mb-1.5">Notes</label>
        <textarea rows={2} className={`${inp} resize-none`} value={draft.notes}
          onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} />
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full py-3 bg-accent text-white rounded-xl text-sm font-bold shadow-lg shadow-accent/20 hover:bg-accent-h transition-all disabled:opacity-60 flex items-center justify-center gap-2">
        {saving && <Spinner className="animate-spin" size={14} />}
        {modalMode === 'new' ? 'Create Settlement' : 'Save Changes'}
      </button>
    </div>
  ) : null;

  const viewContent = modalMode === 'view' && selected ? (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-t3 font-mono">{selected.invoiceRef}</p>
          <h3 className="text-base font-semibold text-t1 mt-0.5">{selected.counterpartyName}</h3>
          {selected.counterpartyCode && (
            <p className="text-xs text-t3 font-mono">{selected.counterpartyCode}</p>
          )}
        </div>
        <span className={`inline-flex items-center gap-1.5 text-xs border rounded-full px-2.5 py-0.5 font-medium ${STATUS_STYLES[selected.status]}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[selected.status]}`} />
          {selected.status.charAt(0).toUpperCase() + selected.status.slice(1)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><p className="text-xs text-t3">Type</p><p className="font-medium text-t1 capitalize">{selected.counterpartyType}</p></div>
        <div><p className="text-xs text-t3">Currency</p><p className="font-medium text-t1">{selected.currency}</p></div>
        <div><p className="text-xs text-t3">Amount</p><p className="font-medium text-t1">{fmt(selected.amount, selected.currency)}</p></div>
        <div><p className="text-xs text-t3">Tax</p><p className="font-medium text-t1">{fmt(selected.taxAmount, selected.currency)}</p></div>
      </div>

      <div className="bg-accent-glow border border-accent/20 rounded-xl p-4">
        <p className="text-xs text-t3 mb-1">Total Amount</p>
        <p className="text-xl font-bold text-accent">{fmt(selected.totalAmount, selected.currency)}</p>
      </div>

      <div className="space-y-2 text-sm">
        {selected.linkedPoRef && (
          <div className="flex items-center gap-2 text-t2">
            <ArrowRight size={13} className="text-t3 shrink-0" />
            <span>Linked PO: <span className="font-mono text-accent">{selected.linkedPoRef}</span></span>
          </div>
        )}
        {selected.description && <p className="text-t2 text-xs">{selected.description}</p>}
        <div className="flex items-center gap-2 text-t2">
          <CalendarBlank size={13} className="text-t3 shrink-0" />
          <span>Issued: {fmtDate(selected.invoiceDate)}</span>
        </div>
        {selected.dueDate && (
          <div className="flex items-center gap-2 text-t2">
            <CalendarBlank size={13} className="text-t3 shrink-0" />
            <span>Due: {fmtDate(selected.dueDate)}</span>
          </div>
        )}
        {selected.paidAt && (
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle size={13} className="shrink-0" weight="fill" />
            <span>Paid: {fmtDate(selected.paidAt)}</span>
          </div>
        )}
        {selected.paymentRef && (
          <p className="text-xs text-t3">Ref: <span className="font-mono">{selected.paymentRef}</span></p>
        )}
      </div>

      <div className="pt-2 border-t border-border space-y-2">
        <button onClick={() => openEdit(selected)}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm border border-border rounded-xl hover:bg-surface text-t2 transition-colors">
          <PencilSimple size={14} /> Edit Settlement
        </button>
        <div>
          <label className="block text-xs text-t3 mb-1.5">Update Status</label>
          <select className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-t2 outline-none focus:border-accent transition-colors"
            value={selected.status}
            onChange={async e => {
              await apiUpdateProcurementInvoice(selected._id, { status: e.target.value as any });
              load();
            }}>
            {ALL_STATUSES.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  ) : null;

  const viewSummaryPanel = selected ? (
    <div className="space-y-4">
      <div className="aspect-video bg-gradient-to-br from-accent/20 to-surface rounded-xl flex flex-col items-center justify-center p-6 border border-border text-center">
        <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-3 text-accent border border-accent/20 shadow-lg shadow-accent/10">
          {selected.counterpartyType === 'supplier'
            ? <Handshake size={32} weight="duotone" />
            : <Truck size={32} weight="duotone" />}
        </div>
        <p className="font-semibold text-t1 text-sm truncate max-w-[200px] mb-1">{selected.counterpartyName}</p>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${STATUS_STYLES[selected.status]}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[selected.status]}`} />
          {selected.status.charAt(0).toUpperCase() + selected.status.slice(1)}
        </span>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
        <p className="text-xs text-t3 mb-2">Total Settlement Value</p>
        <p className="text-2xl font-bold text-t1">{fmt(selected.totalAmount, selected.currency)}</p>
        <p className="text-xs text-t3 mt-1">{selected.currency} · Tax: {fmt(selected.taxAmount, selected.currency)}</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <span className="text-xs text-t3">Ref</span>
          <span className="text-xs font-mono text-accent bg-accent/10 px-2 py-0.5 rounded-md">{selected.invoiceRef}</span>
        </div>
        <div className="flex items-center justify-between border-b border-border pb-2">
          <span className="text-xs text-t3">Issue Date</span>
          <span className="text-xs text-t1 font-medium">{fmtDate(selected.invoiceDate)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-t3">Due Date</span>
          <span className="text-xs text-t1 font-medium">{fmtDate(selected.dueDate)}</span>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-t1">Settlements</h1>
            <p className="text-sm text-t3 mt-1">Manage settlements for suppliers &amp; transporters</p>
          </div>
          <button onClick={openNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-h transition-colors">
            <Plus size={16} /> New Settlement
          </button>
        </div>

        {/* KPI Cards */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {([
              { label: 'Draft',    value: summary.draft,    bg: 'bg-surface',            color: 'text-t3'         },
              { label: 'Sent',     value: summary.sent,     bg: 'bg-blue-500/10',        color: 'text-blue-400'   },
              { label: 'Received', value: summary.received, bg: 'bg-violet-500/10',      color: 'text-violet-400' },
              { label: 'Approved', value: summary.approved, bg: 'bg-amber-500/10',       color: 'text-amber-500'  },
              { label: 'Paid',     value: summary.paid,     bg: 'bg-emerald-500/10',     color: 'text-emerald-400'},
              { label: 'Rejected', value: summary.rejected, bg: 'bg-rose-500/10',        color: 'text-rose-400'   },
              { label: 'Overdue',  value: summary.overdue,  bg: 'bg-orange-500/10',      color: 'text-orange-400' },
            ]).map(({ label, value, bg, color }) => (
              <div key={label} className="bg-card rounded-xl border border-border p-3 flex flex-col gap-1">
                <p className="text-xs text-t3">{label}</p>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Totals row */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-amber-500/10 shrink-0">
                <CurrencyCircleDollar size={20} weight="duotone" className="text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-t3">Total Approved (pending payment)</p>
                <p className="text-lg font-bold text-t1">{fmt(summary.totalApproved, 'USD')}</p>
              </div>
            </div>
            <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 shrink-0">
                <CheckCircle size={20} weight="duotone" className="text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-t3">Total Paid</p>
                <p className="text-lg font-bold text-t1">{fmt(summary.totalPaid, 'USD')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-card rounded-xl border border-border">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-wrap">
            <div className="relative flex-1 min-w-[180px] max-w-sm">
              <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
              <input className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent transition-colors"
                placeholder="Search invoices…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-t1 outline-none focus:border-accent transition-colors">
              <option value="">All Statuses</option>
              {ALL_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-t1 outline-none focus:border-accent transition-colors">
              <option value="">All Types</option>
              <option value="supplier">Supplier</option>
              <option value="transporter">Transporter</option>
            </select>
            <ColumnSelector cols={COLS} visible={colVis} onToggle={colToggle} />
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Spinner size={28} className="animate-spin text-accent" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-t3">
              <Receipt size={40} className="mb-2 opacity-40" />
              <p>No settlements found.</p>
            </div>
          ) : (
            <OverlayScrollbarsComponent options={{ scrollbars: { autoHide: 'never' } }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {colVis.has('ref')         && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Invoice Ref</th>}
                    {colVis.has('party')       && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Counterparty</th>}
                    {colVis.has('type')        && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Type</th>}
                    {colVis.has('po')          && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Linked PO</th>}
                    {colVis.has('amount')      && <th className="px-4 py-3 text-right text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Amount</th>}
                    {colVis.has('invoiceDate') && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Invoice Date</th>}
                    {colVis.has('dueDate')     && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Due Date</th>}
                    {colVis.has('status')      && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Status</th>}
                    {colVis.has('actions')     && <th className="px-4 py-3" />}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv, i) => (
                    <tr key={inv._id}
                      className={`hover:bg-surface transition-colors cursor-pointer ${i < invoices.length - 1 ? 'border-b border-border' : ''}`}
                      onClick={() => { setSelected(inv); setModalMode('view'); }}>
                      {colVis.has('ref') && (
                        <td className="px-4 py-3.5 font-mono text-xs text-accent">{inv.invoiceRef}</td>
                      )}
                      {colVis.has('party') && (
                        <td className="px-4 py-3.5">
                          <p className="font-medium text-t1">{inv.counterpartyName}</p>
                          {inv.counterpartyCode && <p className="text-xs text-t3 font-mono">{inv.counterpartyCode}</p>}
                        </td>
                      )}
                      {colVis.has('type') && (
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 text-[10px] border rounded-full px-2 py-0.5 font-bold uppercase tracking-wider ${
                            inv.counterpartyType === 'supplier'
                              ? 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          }`}>
                            {inv.counterpartyType === 'supplier'
                              ? <Handshake size={10} weight="duotone" />
                              : <Truck size={10} weight="duotone" />}
                            {inv.counterpartyType}
                          </span>
                        </td>
                      )}
                      {colVis.has('po') && (
                        <td className="px-4 py-3.5 font-mono text-xs text-t2">
                          {inv.linkedPoRef || <span className="text-t3">—</span>}
                        </td>
                      )}
                      {colVis.has('amount') && (
                        <td className="px-4 py-3.5 text-right font-medium text-t1">
                          {fmt(inv.totalAmount, inv.currency)}
                        </td>
                      )}
                      {colVis.has('invoiceDate') && (
                        <td className="px-4 py-3.5 text-t2 text-xs">{fmtDate(inv.invoiceDate)}</td>
                      )}
                      {colVis.has('dueDate') && (
                        <td className="px-4 py-3.5 text-t2 text-xs">{fmtDate(inv.dueDate)}</td>
                      )}
                      {colVis.has('status') && (
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[inv.status]}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[inv.status]}`} />
                            {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                          </span>
                        </td>
                      )}
                      {colVis.has('actions') && (
                        <td className="px-4 py-3.5">
                          <div className="flex gap-1">
                            <button onClick={e => { e.stopPropagation(); setSelected(inv); setModalMode('view'); }}
                              className="p-1 hover:text-t1 text-t3"><Eye size={14} /></button>
                            <button onClick={e => { e.stopPropagation(); openEdit(inv); }}
                              className="p-1 hover:text-t1 text-t3"><PencilSimple size={14} /></button>
                            <button onClick={e => { e.stopPropagation(); setDeleteTarget(inv); }}
                              className="p-1 hover:text-red-500 text-t3"><Trash size={14} /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </OverlayScrollbarsComponent>
          )}
        </div>
      </div>

      <ModernModal
        isOpen={modalMode !== null}
        onClose={() => setModalMode(null)}
        title={
          modalMode === 'new' ? 'New Settlement'
          : modalMode === 'edit' ? `Edit ${selected?.invoiceRef ?? 'Settlement'}`
          : selected?.invoiceRef ?? ''
        }
        summaryContent={modalMode === 'view' ? viewSummaryPanel : modalSummary}
        actions={modalMode !== 'view' ? (
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2.5 bg-accent text-white rounded-xl text-sm font-bold shadow-lg shadow-accent/20 hover:bg-accent-h transition-all disabled:opacity-60 flex items-center justify-center gap-2">
            {saving && <Spinner size={14} className="animate-spin" />}
            {modalMode === 'new' ? 'Create Settlement' : 'Save Changes'}
          </button>
        ) : undefined}
      >
        {modalMode === 'view' ? viewContent : formContent}
      </ModernModal>

      <AnimatePresence>
        {deleteTarget && (
          <>
            <motion.div key="del-bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50" onClick={() => !isDeleting && setDeleteTarget(null)} />
            <motion.div key="del-dlg"
              initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }} transition={{ duration: 0.18 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-xs px-4"
              onClick={e => e.stopPropagation()}>
              <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 text-center">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash size={22} weight="duotone" className="text-red-500" />
                </div>
                <h2 className="text-base font-bold text-t1 mb-1">Delete settlement?</h2>
                <p className="text-xs text-t3 mb-5">
                  <span className="font-semibold text-t2">{deleteTarget.invoiceRef}</span> will be permanently removed.
                  Only draft or rejected invoices can be deleted.
                </p>
                <div className="flex flex-col gap-2">
                  <button onClick={handleDelete} disabled={isDeleting}
                    className="w-full py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-75 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
                    {isDeleting ? <><Spinner size={16} className="animate-spin" /> Deleting…</> : 'Delete'}
                  </button>
                  <button onClick={() => setDeleteTarget(null)} disabled={isDeleting}
                    className="w-full py-2.5 border border-border text-t1 hover:bg-surface rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
