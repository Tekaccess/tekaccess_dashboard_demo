import React, { useState, useEffect, useCallback } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import {
  Plus, MagnifyingGlass, Truck, PencilSimple, Eye,
  Spinner, Phone, Envelope, Trash, Invoice, CheckCircle,
  Warning, X, CaretLeft, CaretRight,
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';
import {
  apiGetTransportersSummary, apiListTransporters, apiCreateTransporter,
  apiUpdateTransporter, apiDeleteTransporter, apiIssueTransporterInvoice,
  type Transporter,
} from '../lib/api';
import ColumnSelector, { useColumnVisibility, ColDef } from '../components/ui/ColumnSelector';

type ModalMode = 'new' | 'edit' | 'view' | null;

interface DraftTransporter {
  name: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  country: string;
  currency: string;
  trucksCommitted: number;
  trucksDelivered: number;
  ratePerTruck: number;
  notes: string;
  status: 'active' | 'inactive' | 'blacklisted';
}

function emptyDraft(): DraftTransporter {
  return {
    name: '',
    contactName: '', contactEmail: '', contactPhone: '',
    address: '', country: 'Rwanda', currency: 'USD',
    trucksCommitted: 1, trucksDelivered: 0, ratePerTruck: 0,
    notes: '', status: 'active',
  };
}

const STATUS_STYLES: Record<string, string> = {
  active:      'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  inactive:    'bg-surface text-t3 border-border',
  blacklisted: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
};

const INV_STYLES: Record<string, string> = {
  not_invoiced: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  invoiced:     'bg-blue-500/10 text-blue-600 border-blue-500/20',
  paid:         'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
};

const INV_LABELS: Record<string, string> = {
  not_invoiced: 'Not Invoiced',
  invoiced:     'Invoiced',
  paid:         'Paid',
};

const TABS = [
  { id: '', label: 'All' },
  { id: 'not_invoiced', label: 'Pending' },
  { id: 'invoiced', label: 'Invoiced' },
  { id: 'paid', label: 'Paid' },
];

const COLS: ColDef[] = [
  { key: 'code',    label: 'Code',        defaultVisible: true },
  { key: 'name',    label: 'Name',        defaultVisible: true },
  { key: 'contact', label: 'Contact',     defaultVisible: true },
  { key: 'trucks',  label: 'Trucks',      defaultVisible: true },
  { key: 'rate',    label: 'Rate/Truck',  defaultVisible: true },
  { key: 'amount',  label: 'Inv. Amount', defaultVisible: true },
  { key: 'status',  label: 'Status',      defaultVisible: true },
  { key: 'invoice', label: 'Invoice',     defaultVisible: true },
  { key: 'actions', label: 'Actions',     defaultVisible: true },
];

const inp = 'w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent transition-colors';

function fmtCurrency(v: number | null, currency = 'USD') {
  if (v == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(v);
}

export default function TransportersPage() {
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [summary, setSummary] = useState({ totalTransporters: 0, totalTrucksCommitted: 0, totalTrucksDelivered: 0, readyToInvoice: 0, totalInvoiced: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('');
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<Transporter | null>(null);
  const [draft, setDraft] = useState<DraftTransporter>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<Transporter | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [confirmInvoice, setConfirmInvoice] = useState<Transporter | null>(null);
  const [invoicing, setInvoicing] = useState(false);
  const [invoiceError, setInvoiceError] = useState('');

  const { visible: colVis, toggle: colToggle } = useColumnVisibility('transporters-cols', COLS);

  const load = useCallback(async () => {
    setLoading(true);
    const [tRes, sRes] = await Promise.all([
      apiListTransporters(tab ? { invoiceStatus: tab } : {}),
      apiGetTransportersSummary(),
    ]);
    if (tRes.success) setTransporters(tRes.data.transporters);
    if (sRes.success) setSummary(sRes.data.summary);
    setLoading(false);
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const filtered = transporters.filter(t => {
    if (!search) return true;
    const q = search.toLowerCase();
    return t.name.toLowerCase().includes(q) ||
      t.transporterCode.toLowerCase().includes(q) ||
      (t.contactName ?? '').toLowerCase().includes(q);
  });
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  function openNew() {
    setDraft(emptyDraft());
    setError(null);
    setModalMode('new');
  }

  function openEdit(t: Transporter) {
    setSelected(t);
    setDraft({
      name: t.name,
      contactName: t.contactName ?? '',
      contactEmail: t.contactEmail ?? '',
      contactPhone: t.contactPhone ?? '',
      address: t.address ?? '',
      country: t.country,
      currency: t.currency,
      trucksCommitted: t.trucksCommitted,
      trucksDelivered: t.trucksDelivered,
      ratePerTruck: t.ratePerTruck,
      notes: t.notes ?? '',
      status: t.status,
    });
    setError(null);
    setModalMode('edit');
  }

  function openView(t: Transporter) {
    setSelected(t);
    setModalMode('view');
  }

  function set(key: keyof DraftTransporter, value: unknown) {
    setDraft(d => ({ ...d, [key]: value }));
  }

  async function handleSave() {
    if (!draft.name.trim()) { setError('Name is required.'); return; }
    if (draft.trucksCommitted < 1) { setError('Trucks committed must be at least 1.'); return; }
    setSaving(true);
    setError(null);

    const contactFields = {
      name: draft.name,
      contactName: draft.contactName,
      contactEmail: draft.contactEmail,
      contactPhone: draft.contactPhone,
      address: draft.address,
      country: draft.country,
      currency: draft.currency,
      notes: draft.notes,
      status: draft.status,
    };

    const payload = {
      ...contactFields,
      trucksCommitted: Number(draft.trucksCommitted),
      trucksDelivered: Number(draft.trucksDelivered),
      ratePerTruck: Number(draft.ratePerTruck),
    };

    const res = modalMode === 'new'
      ? await apiCreateTransporter(payload as any)
      : await apiUpdateTransporter(selected!._id, payload as any);
    setSaving(false);
    if (!res.success) { setError((res as any).message ?? 'Save failed.'); return; }
    setModalMode(null);
    load();
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    await apiDeleteTransporter(confirmDelete._id);
    setDeleting(false);
    setConfirmDelete(null);
    load();
  }

  async function handleIssueInvoice() {
    if (!confirmInvoice) return;
    setInvoicing(true);
    setInvoiceError('');
    const res = await apiIssueTransporterInvoice(confirmInvoice._id);
    setInvoicing(false);
    if (!res.success) { setInvoiceError((res as any).message ?? 'Failed to issue invoice.'); return; }
    setConfirmInvoice(null);
    load();
  }

  const kpi = [
    { label: 'Transporters',     value: summary.totalTransporters },
    { label: 'Trucks Committed', value: summary.totalTrucksCommitted },
    { label: 'Trucks Delivered', value: summary.totalTrucksDelivered },
    { label: 'Ready to Invoice', value: summary.readyToInvoice, accent: true },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-5">

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpi.map(k => (
          <div key={k.label} className="bg-card border border-border rounded-xl px-4 py-3 shadow-card">
            <p className="text-xs text-t3 font-medium mb-1">{k.label}</p>
            <p className={`text-2xl font-bold ${k.accent ? 'text-accent' : 'text-t1'}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Tabs */}
        <div className="flex gap-1 bg-surface rounded-lg p-1 border border-border">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setPage(1); }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                tab === t.id ? 'bg-card text-t1 shadow-sm' : 'text-t3 hover:text-t2'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-36 max-w-64">
          <MagnifyingGlass size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-t3 pointer-events-none" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search transporters…"
            className="w-full pl-8 pr-3 py-2 bg-surface border border-border rounded-lg text-xs text-t1 placeholder-t3 outline-none focus:border-accent transition-colors"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <ColumnSelector cols={COLS} visible={colVis} onToggle={colToggle} />
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 px-3 py-2 bg-accent hover:bg-accent-h text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <Plus size={13} weight="bold" /> Add Transporter
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
        <OverlayScrollbarsComponent options={{ scrollbars: { autoHide: 'scroll' } }} defer>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-surface">
                {colVis.has('code')    && <th className="px-4 py-3 text-left font-semibold text-t3 uppercase tracking-wider">Code</th>}
                {colVis.has('name')    && <th className="px-4 py-3 text-left font-semibold text-t3 uppercase tracking-wider">Name</th>}
                {colVis.has('contact') && <th className="px-4 py-3 text-left font-semibold text-t3 uppercase tracking-wider">Contact</th>}
                {colVis.has('trucks')  && <th className="px-4 py-3 text-left font-semibold text-t3 uppercase tracking-wider">Trucks</th>}
                {colVis.has('rate')    && <th className="px-4 py-3 text-left font-semibold text-t3 uppercase tracking-wider">Rate/Truck</th>}
                {colVis.has('amount')  && <th className="px-4 py-3 text-left font-semibold text-t3 uppercase tracking-wider">Inv. Amount</th>}
                {colVis.has('status')  && <th className="px-4 py-3 text-left font-semibold text-t3 uppercase tracking-wider">Status</th>}
                {colVis.has('invoice') && <th className="px-4 py-3 text-left font-semibold text-t3 uppercase tracking-wider">Invoice</th>}
                {colVis.has('actions') && <th className="px-4 py-3 text-right font-semibold text-t3 uppercase tracking-wider">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={9} className="py-12 text-center">
                  <Spinner size={20} weight="bold" className="animate-spin text-accent mx-auto" />
                </td></tr>
              )}
              {!loading && paginated.length === 0 && (
                <tr><td colSpan={9} className="py-12 text-center text-t3 italic">No transporters found.</td></tr>
              )}
              {!loading && paginated.map(t => {
                const pct = Math.min(100, t.trucksCommitted > 0 ? (t.trucksDelivered / t.trucksCommitted) * 100 : 0);
                const fulfilled = t.trucksDelivered >= t.trucksCommitted;
                const canInvoice = t.invoiceStatus === 'not_invoiced';
                const invoiceAmt = t.invoiceAmount ?? (t.ratePerTruck * t.trucksCommitted);
                return (
                  <tr key={t._id} className="border-b border-border hover:bg-surface/50 transition-colors">
                    {colVis.has('code') && (
                      <td className="px-4 py-3 font-mono font-semibold text-t2">{t.transporterCode}</td>
                    )}
                    {colVis.has('name') && (
                      <td className="px-4 py-3 font-semibold text-t1 max-w-[160px] truncate">{t.name}</td>
                    )}
                    {colVis.has('contact') && (
                      <td className="px-4 py-3 text-t2">
                        {t.contactName && <p className="font-medium">{t.contactName}</p>}
                        {t.contactPhone && (
                          <p className="flex items-center gap-1 text-t3">
                            <Phone size={11} /> {t.contactPhone}
                          </p>
                        )}
                        {t.contactEmail && (
                          <p className="flex items-center gap-1 text-t3 truncate max-w-[140px]">
                            <Envelope size={11} /> {t.contactEmail}
                          </p>
                        )}
                      </td>
                    )}
                    {colVis.has('trucks') && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-surface-hover rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${fulfilled ? 'bg-emerald-500' : 'bg-accent'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className={`font-semibold ${fulfilled ? 'text-emerald-600' : 'text-t1'}`}>
                            {t.trucksDelivered}/{t.trucksCommitted}
                          </span>
                          {fulfilled && <CheckCircle size={13} weight="fill" className="text-emerald-500 shrink-0" />}
                        </div>
                      </td>
                    )}
                    {colVis.has('rate') && (
                      <td className="px-4 py-3 text-t2">{fmtCurrency(t.ratePerTruck, t.currency)}</td>
                    )}
                    {colVis.has('amount') && (
                      <td className="px-4 py-3 font-semibold text-t1">{fmtCurrency(invoiceAmt, t.currency)}</td>
                    )}
                    {colVis.has('status') && (
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLES[t.status]}`}>
                          {t.status}
                        </span>
                      </td>
                    )}
                    {colVis.has('invoice') && (
                      <td className="px-4 py-3">
                        {canInvoice ? (
                          <button
                            onClick={() => { setInvoiceError(''); setConfirmInvoice(t); }}
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-accent hover:bg-accent-h text-white text-[10px] font-bold rounded-lg transition-colors"
                          >
                            <Invoice size={12} weight="bold" /> Issue Invoice
                          </button>
                        ) : (
                          <span className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wide ${INV_STYLES[t.invoiceStatus]}`}>
                            {INV_LABELS[t.invoiceStatus]}
                            {t.invoiceRef && <span className="ml-1 opacity-70">· {t.invoiceRef}</span>}
                          </span>
                        )}
                      </td>
                    )}
                    {colVis.has('actions') && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openView(t)} className="p-1.5 rounded-lg hover:bg-surface text-t3 hover:text-t1 transition-colors">
                            <Eye size={14} />
                          </button>
                          <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg hover:bg-surface text-t3 hover:text-t1 transition-colors">
                            <PencilSimple size={14} />
                          </button>
                          <button onClick={() => setConfirmDelete(t)} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-t3 hover:text-rose-500 transition-colors">
                            <Trash size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </OverlayScrollbarsComponent>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-t3">{total} transporters</span>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="p-1.5 rounded-lg border border-border text-t2 disabled:opacity-40 hover:bg-surface transition-colors">
                <CaretLeft size={13} />
              </button>
              <span className="text-xs text-t2 font-medium">{page} / {pages}</span>
              <button disabled={page >= pages} onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded-lg border border-border text-t2 disabled:opacity-40 hover:bg-surface transition-colors">
                <CaretRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      <AnimatePresence>
        {(modalMode === 'new' || modalMode === 'edit') && (
          <>
            <motion.div key="tp-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={() => setModalMode(null)} />
            <motion.div key="tp-dialog" initial={{ opacity: 0, scale: 0.97, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 12 }} transition={{ duration: 0.2 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-1.5rem)] max-w-lg"
              onClick={e => e.stopPropagation()}>
              <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
                  <div className="flex items-center gap-2">
                    <Truck size={16} weight="duotone" className="text-accent" />
                    <h2 className="text-sm font-bold text-t1">{modalMode === 'new' ? 'New Transporter' : 'Edit Transporter'}</h2>
                  </div>
                  <button onClick={() => setModalMode(null)} className="p-1.5 rounded-lg text-t3 hover:text-t1 hover:bg-surface transition-colors">
                    <X size={16} weight="bold" />
                  </button>
                </div>

                <OverlayScrollbarsComponent className="px-6 py-6 space-y-6 flex-1" options={{ scrollbars: { autoHide: 'scroll' } }} defer>

                  <div className='mb-4'>
                    <label className="block text-xs font-semibold text-t3 mb-2">Status</label>
                    <select value={draft.status} onChange={e => set('status', e.target.value)} className={inp}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="blacklisted">Blacklisted</option>
                    </select>
                  </div>

                  <div className='mb-4'>
                    <label className="block text-xs font-semibold text-t3 mb-2">Company Name <span className="text-rose-500">*</span></label>
                    <input value={draft.name} onChange={e => set('name', e.target.value)} placeholder="Transporter Ltd." className={inp} />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-semibold text-t3 mb-2">Contact Person</label>
                      <input value={draft.contactName} onChange={e => set('contactName', e.target.value)} placeholder="Full name" className={inp} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-t3 mb-2">Phone</label>
                      <input value={draft.contactPhone} onChange={e => set('contactPhone', e.target.value)} placeholder="+250 7xx xxx xxx" className={inp} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-t3 mb-2">Email</label>
                      <input value={draft.contactEmail} onChange={e => set('contactEmail', e.target.value)} placeholder="contact@company.com" className={inp} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-t3 mb-2">Country</label>
                      <input value={draft.country} onChange={e => set('country', e.target.value)} className={inp} />
                    </div>
                  </div>

                  <div className='mt-2'>
                    <label className="block text-xs font-semibold text-t3 mb-2">Notes</label>
                    <textarea value={draft.notes} onChange={e => set('notes', e.target.value)}
                      rows={2} placeholder="Optional remarks…" className={inp} />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                      <Warning size={14} className="text-rose-500 shrink-0" />
                      <p className="text-xs text-rose-600">{error}</p>
                    </div>
                  )}
                </OverlayScrollbarsComponent>

                <div className="flex gap-2 px-5 py-4 border-t border-border shrink-0">
                  <button onClick={() => setModalMode(null)}
                    className="flex-1 py-2 border border-border text-t2 hover:bg-surface rounded-xl text-sm font-medium transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    className="flex-1 py-2 bg-accent hover:bg-accent-h disabled:opacity-60 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
                    {saving ? <><Spinner size={15} weight="bold" className="animate-spin" /> Saving…</> : 'Save'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* View modal */}
      <AnimatePresence>
        {modalMode === 'view' && selected && (
          <>
            <motion.div key="tv-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={() => setModalMode(null)} />
            <motion.div key="tv-dialog" initial={{ opacity: 0, scale: 0.97, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 12 }} transition={{ duration: 0.2 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-1.5rem)] max-w-md"
              onClick={e => e.stopPropagation()}>
              <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-t1">{selected.name}</h2>
                    <p className="text-xs font-mono text-t3">{selected.transporterCode}</p>
                  </div>
                  <button onClick={() => setModalMode(null)} className="p-1.5 rounded-lg text-t3 hover:text-t1 hover:bg-surface transition-colors">
                    <X size={16} weight="bold" />
                  </button>
                </div>


                {/* Commitment progress */}
                <div className="p-4 bg-surface rounded-xl border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-t3">Truck Commitment</span>
                    <span className={`text-sm font-bold ${selected.trucksDelivered >= selected.trucksCommitted ? 'text-emerald-600' : 'text-t1'}`}>
                      {selected.trucksDelivered} / {selected.trucksCommitted}
                    </span>
                  </div>
                  <div className="h-2.5 bg-surface-hover rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${selected.trucksDelivered >= selected.trucksCommitted ? 'bg-emerald-500' : 'bg-accent'}`}
                      style={{ width: `${Math.min(100, selected.trucksCommitted > 0 ? (selected.trucksDelivered / selected.trucksCommitted) * 100 : 0)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-t3">Rate / truck: <span className="font-semibold text-t1">{fmtCurrency(selected.ratePerTruck, selected.currency)}</span></span>
                    <span className="text-t3">Invoice total: <span className="font-semibold text-t1">{fmtCurrency(selected.ratePerTruck * selected.trucksCommitted, selected.currency)}</span></span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  {[
                    { label: 'Contact', value: selected.contactName },
                    { label: 'Phone', value: selected.contactPhone },
                    { label: 'Email', value: selected.contactEmail },
                    { label: 'Country', value: selected.country },
                    { label: 'Currency', value: selected.currency },
                    { label: 'Invoice', value: selected.invoiceRef ?? INV_LABELS[selected.invoiceStatus] },
                  ].map(({ label, value }) => value ? (
                    <div key={label}>
                      <p className="text-t3 font-medium">{label}</p>
                      <p className="text-t1 font-semibold">{value}</p>
                    </div>
                  ) : null)}
                </div>

                {selected.notes && (
                  <p className="text-xs text-t2 bg-surface rounded-lg p-3 border border-border">{selected.notes}</p>
                )}

                <button onClick={() => { setModalMode(null); openEdit(selected); }}
                  className="w-full py-2 bg-accent hover:bg-accent-h text-white rounded-xl text-sm font-medium transition-colors">
                  Edit
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Issue Invoice confirm */}
      <AnimatePresence>
        {confirmInvoice && (
          <>
            <motion.div key="ci-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50" onClick={() => !invoicing && setConfirmInvoice(null)} />
            <motion.div key="ci-dialog" initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }} transition={{ duration: 0.18 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm px-4"
              onClick={e => e.stopPropagation()}>
              <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 text-center">
                <div className="w-12 h-12 bg-accent-glow rounded-full flex items-center justify-center mx-auto mb-4">
                  <Invoice size={22} weight="duotone" className="text-accent" />
                </div>
                <h2 className="text-base font-bold text-t1 mb-1">Issue Invoice?</h2>
                <p className="text-xs text-t3 mb-1">
                  {confirmInvoice.name} has delivered all {confirmInvoice.trucksCommitted} committed trucks.
                </p>
                <p className="text-sm font-bold text-t1 mb-4">
                  Invoice amount: {fmtCurrency(confirmInvoice.ratePerTruck * confirmInvoice.trucksCommitted, confirmInvoice.currency)}
                </p>
                {invoiceError && <p className="text-xs text-rose-500 mb-3">{invoiceError}</p>}
                <div className="flex gap-2">
                  <button disabled={invoicing} onClick={() => setConfirmInvoice(null)}
                    className="flex-1 py-2.5 border border-border text-t1 hover:bg-surface rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
                    Cancel
                  </button>
                  <button disabled={invoicing} onClick={handleIssueInvoice}
                    className="flex-1 py-2.5 bg-accent hover:bg-accent-h disabled:opacity-75 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
                    {invoicing ? <><Spinner size={15} weight="bold" className="animate-spin" /> Issuing…</> : 'Issue Invoice'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {confirmDelete && (
          <>
            <motion.div key="cd-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50" onClick={() => !deleting && setConfirmDelete(null)} />
            <motion.div key="cd-dialog" initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }} transition={{ duration: 0.18 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-xs px-4"
              onClick={e => e.stopPropagation()}>
              <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 text-center">
                <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash size={20} weight="duotone" className="text-rose-500" />
                </div>
                <h2 className="text-base font-bold text-t1 mb-1">Delete Transporter?</h2>
                <p className="text-xs text-t3 mb-5">
                  <span className="font-semibold text-t2">{confirmDelete.name}</span> will be permanently removed.
                </p>
                <div className="flex gap-2">
                  <button disabled={deleting} onClick={() => setConfirmDelete(null)}
                    className="flex-1 py-2.5 border border-border text-t1 hover:bg-surface rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
                    Cancel
                  </button>
                  <button disabled={deleting} onClick={handleDelete}
                    className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-75 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
                    {deleting ? <><Spinner size={15} weight="bold" className="animate-spin" /> Deleting…</> : 'Delete'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
