import React, { useState, useEffect, useCallback } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import {
  Plus, MagnifyingGlass, FileText, CheckCircle, Warning,
  PencilSimple, Eye, Spinner, X, Trash,
} from '@phosphor-icons/react';
import {
  apiGetContractsSummary, apiListContracts, apiCreateContract, apiUpdateContract,
  apiListClients,
  OperationsContract, ContractLine, Client,
} from '../../lib/api';
import DocumentSidePanel from '../../components/DocumentSidePanel';
import SearchSelect, { SearchSelectOption } from '../../components/ui/SearchSelect';

const STATUS_STYLES: Record<string, string> = {
  draft:                'bg-surface text-t3 border-border',
  active:               'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  partially_delivered:  'bg-blue-500/10 text-blue-400 border-blue-500/20',
  completed:            'bg-purple-500/10 text-purple-400 border-purple-500/20',
  closed:               'bg-surface text-t3 border-border',
  disputed:             'bg-rose-500/10 text-rose-400 border-rose-500/20',
  cancelled:            'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

const CONTRACT_STATUSES = ['draft', 'active', 'partially_delivered', 'completed', 'closed', 'disputed', 'cancelled'];
const CURRENCIES = ['USD', 'RWF', 'EUR', 'KES', 'UGX', 'TZS'];
const LINE_UNITS = ['tons', 'kg', 'litres', 'units'];

type ModalMode = 'new' | 'edit' | 'view' | null;

interface DraftLine {
  lineRef: string;
  materialDescription: string;
  unit: string;
  committedQty: number;
  unitPrice: number;
}

interface DraftContract {
  contractRef: string;
  title: string;
  clientId: string;
  clientName: string;
  currency: string;
  pricePerTon: number;
  startDate: string;
  endDate: string;
  accountManagerName: string;
  notes: string;
  lines: DraftLine[];
}

function emptyLine(idx: number): DraftLine {
  return { lineRef: `L${String(idx + 1).padStart(2, '0')}`, materialDescription: '', unit: 'tons', committedQty: 0, unitPrice: 0 };
}

function emptyDraft(): DraftContract {
  return {
    contractRef: '', title: '', clientId: '', clientName: '', currency: 'USD',
    pricePerTon: 0, startDate: '', endDate: '', accountManagerName: '', notes: '',
    lines: [emptyLine(0)],
  };
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<OperationsContract[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [summary, setSummary] = useState({ active: 0, draft: 0, completed: 0, disputed: 0, totalActiveValue: 0, totalActiveTons: 0 });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<OperationsContract | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [draft, setDraft] = useState<DraftContract>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: '50' };
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    const [cRes, sRes, clRes] = await Promise.all([
      apiListContracts(params),
      apiGetContractsSummary(),
      apiListClients(),
    ]);
    if (cRes.success) { setContracts(cRes.data.contracts); setTotal(cRes.data.pagination.total); }
    if (sRes.success) setSummary(sRes.data.summary);
    if (clRes.success) setClients(clRes.data.clients);
    setLoading(false);
  }, [search, statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  const clientOptions: SearchSelectOption[] = clients.map(c => ({
    value: c._id, label: c.name, sublabel: c.clientCode, meta: c.country,
  }));

  function updateLine(idx: number, patch: Partial<DraftLine>) {
    setDraft(d => { const lines = [...d.lines]; lines[idx] = { ...lines[idx], ...patch }; return { ...d, lines }; });
  }

  function addLine() {
    setDraft(d => ({ ...d, lines: [...d.lines, emptyLine(d.lines.length)] }));
  }

  function removeLine(idx: number) {
    setDraft(d => ({ ...d, lines: d.lines.filter((_, i) => i !== idx) }));
  }

  function openNew() {
    setDraft(emptyDraft()); setSelected(null); setError(null); setModalMode('new');
  }

  function openEdit(c: OperationsContract) {
    setDraft({
      contractRef: c.contractRef, title: c.title,
      clientId: typeof c.clientId === 'string' ? c.clientId : '',
      clientName: c.clientName, currency: c.currency,
      pricePerTon: c.pricePerTon || 0,
      startDate: c.startDate?.slice(0, 10) || '',
      endDate: c.endDate?.slice(0, 10) || '',
      accountManagerName: c.accountManagerName || '',
      notes: c.notes || '',
      lines: c.contractLines.map(l => ({
        lineRef: l.lineRef, materialDescription: l.materialDescription,
        unit: l.unit, committedQty: l.committedQty, unitPrice: l.unitPrice,
      })),
    });
    setSelected(c); setError(null); setModalMode('edit');
  }

  async function handleSave() {
    if (!draft.contractRef || !draft.title || !draft.clientName) {
      setError('Contract ref, title and client are required.'); return;
    }
    if (draft.lines.some(l => !l.materialDescription || l.committedQty <= 0)) {
      setError('All lines need a description and committed quantity.'); return;
    }
    setSaving(true); setError(null);
    const payload = {
      contractRef: draft.contractRef.toUpperCase(),
      title: draft.title, clientId: draft.clientId || undefined, clientName: draft.clientName,
      currency: draft.currency, pricePerTon: draft.pricePerTon || undefined,
      startDate: draft.startDate, endDate: draft.endDate,
      accountManagerName: draft.accountManagerName || undefined,
      notes: draft.notes || undefined,
      contractLines: draft.lines,
    };
    const res = modalMode === 'new'
      ? await apiCreateContract(payload as any)
      : await apiUpdateContract(selected!._id, payload as any);
    setSaving(false);
    if (!res.success) { setError((res as any).message || 'Save failed.'); return; }
    setModalMode(null); load();
  }

  const totalPages = Math.ceil(total / 50);
  const lineTotal = (l: DraftLine) => l.committedQty * l.unitPrice;
  const grandTotal = draft.lines.reduce((s, l) => s + lineTotal(l), 0);

  const formContent = modalMode !== 'view' ? (
    <div className="space-y-5 p-4 pb-10">
      {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-3 rounded">{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-t3 mb-1">Contract Ref *</label>
          <input className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-t1"
            value={draft.contractRef} onChange={e => setDraft(d => ({ ...d, contractRef: e.target.value.toUpperCase() }))}
            placeholder="CON-2025-001" disabled={modalMode === 'edit'} />
        </div>
        <div>
          <label className="block text-xs text-t3 mb-1">Currency</label>
          <select className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-t1"
            value={draft.currency} onChange={e => setDraft(d => ({ ...d, currency: e.target.value }))}>
            {CURRENCIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs text-t3 mb-1">Title *</label>
        <input className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-t1"
          value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
          placeholder="e.g. Limestone Supply — Q1 2025" />
      </div>

      <div>
        <label className="block text-xs text-t3 mb-1">Client *</label>
        <SearchSelect options={clientOptions} value={draft.clientId || null}
          onChange={v => {
            const c = clients.find(cl => cl._id === v);
            setDraft(d => ({ ...d, clientId: v ?? '', clientName: c?.name ?? d.clientName }));
          }}
          placeholder="Select client..."
        />
        {!draft.clientId && draft.clientName && (
          <input className="w-full bg-surface border border-border rounded px-3 py-1.5 text-sm text-t1 mt-1"
            value={draft.clientName} onChange={e => setDraft(d => ({ ...d, clientName: e.target.value }))}
            placeholder="Or type client name manually" />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-t3 mb-1">Start Date</label>
          <input type="date" className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-t1"
            value={draft.startDate} onChange={e => setDraft(d => ({ ...d, startDate: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs text-t3 mb-1">End Date</label>
          <input type="date" className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-t1"
            value={draft.endDate} onChange={e => setDraft(d => ({ ...d, endDate: e.target.value }))} />
        </div>
      </div>

      {/* Contract Lines */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-t3 uppercase tracking-wider">Contract Lines</p>
          <button onClick={addLine} className="text-xs text-accent hover:underline flex items-center gap-1">
            <Plus size={12} /> Add Line
          </button>
        </div>
        <div className="space-y-3">
          {draft.lines.map((line, idx) => (
            <div key={idx} className="border border-border rounded p-3 space-y-2 bg-surface/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-t3">{line.lineRef}</span>
                {draft.lines.length > 1 && (
                  <button onClick={() => removeLine(idx)} className="text-rose-400 hover:text-rose-300">
                    <Trash size={12} />
                  </button>
                )}
              </div>
              <input className="w-full bg-surface border border-border rounded px-2 py-1.5 text-sm text-t1"
                placeholder="Material description *"
                value={line.materialDescription}
                onChange={e => updateLine(idx, { materialDescription: e.target.value })} />
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-t3 mb-0.5">Unit</label>
                  <select className="w-full bg-surface border border-border rounded px-2 py-1.5 text-sm text-t1"
                    value={line.unit} onChange={e => updateLine(idx, { unit: e.target.value })}>
                    {LINE_UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-t3 mb-0.5">Qty *</label>
                  <input type="number" min={0} className="w-full bg-surface border border-border rounded px-2 py-1.5 text-sm text-t1"
                    value={line.committedQty} onChange={e => updateLine(idx, { committedQty: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="block text-[10px] text-t3 mb-0.5">Unit Price</label>
                  <input type="number" min={0} className="w-full bg-surface border border-border rounded px-2 py-1.5 text-sm text-t1"
                    value={line.unitPrice} onChange={e => updateLine(idx, { unitPrice: Number(e.target.value) })} />
                </div>
              </div>
              <p className="text-xs text-right text-t2 font-medium">
                {lineTotal(line).toLocaleString()} {draft.currency}
              </p>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center mt-2 pt-2 border-t border-border">
          <span className="text-sm font-semibold text-t1">Total Contract Value</span>
          <span className="text-base font-bold text-accent">{grandTotal.toLocaleString()} {draft.currency}</span>
        </div>
      </div>

      <div>
        <label className="block text-xs text-t3 mb-1">Notes</label>
        <textarea rows={2} className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-t1 resize-none"
          value={draft.notes} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} />
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <button onClick={() => setModalMode(null)}
          className="px-4 py-2 text-sm text-t2 hover:text-t1 border border-border rounded">Cancel</button>
        <button onClick={handleSave} disabled={saving}
          className="px-4 py-2 text-sm bg-accent text-white rounded hover:bg-accent/80 flex items-center gap-2">
          {saving && <Spinner className="animate-spin" size={14} />}
          {modalMode === 'new' ? 'Create Contract' : 'Save Changes'}
        </button>
      </div>
    </div>
  ) : null;

  const viewContent = modalMode === 'view' && selected ? (
    <div className="space-y-5 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-t3 font-mono">{selected.contractRef}</p>
          <h3 className="text-base font-semibold text-t1 mt-0.5">{selected.title}</h3>
          <p className="text-sm text-t2 mt-0.5">{selected.clientName}</p>
        </div>
        <span className={`text-xs border rounded px-2 py-0.5 whitespace-nowrap ${STATUS_STYLES[selected.status] ?? 'bg-surface text-t3 border-border'}`}>
          {selected.status.replace('_', ' ')}
        </span>
      </div>

      {/* Delivery progress */}
      {selected.deliveryProgress && (
        <div>
          <p className="text-xs text-t3 mb-1">Delivery Progress</p>
          <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full" style={{ width: `${Math.min(selected.deliveryProgress.pctComplete, 100)}%` }} />
          </div>
          <div className="flex justify-between text-xs text-t3 mt-1">
            <span>{selected.deliveryProgress.deliveredTons?.toLocaleString()} delivered</span>
            <span>{selected.deliveryProgress.pctComplete?.toFixed(1)}%</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 text-sm">
        {[
          ['Total Value', `${selected.totalContractValue.toLocaleString()} ${selected.currency}`],
          ['Total Tons', `${selected.totalCommittedTons.toLocaleString()}`],
          ['Start', fmtDate(selected.startDate)],
          ['End', fmtDate(selected.endDate)],
          ['Manager', selected.accountManagerName || '—'],
          ['Lines', String(selected.contractLines.length)],
        ].map(([k, v]) => (
          <div key={k}>
            <p className="text-xs text-t3">{k}</p>
            <p className="font-medium text-t1">{v}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="text-xs text-t3 mb-2">Contract Lines</p>
        {selected.contractLines.map((l, i) => (
          <div key={i} className="border-b border-border pb-2 mb-2 last:border-0 last:mb-0">
            <p className="text-sm font-medium text-t1">{l.materialDescription}</p>
            <p className="text-xs text-t3">{l.committedQty.toLocaleString()} {l.unit} × {l.unitPrice.toLocaleString()} = {l.lineValue.toLocaleString()} {selected.currency}</p>
            <div className="mt-1 h-1 bg-surface-2 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${l.committedQty > 0 ? Math.min((l.deliveredQty / l.committedQty) * 100, 100) : 0}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-2 border-t border-border">
        <button onClick={() => openEdit(selected)}
          className="flex-1 flex items-center justify-center gap-2 py-2 text-sm border border-border rounded hover:bg-surface text-t2">
          <PencilSimple size={14} /> Edit
        </button>
        <div className="flex-1">
          <label className="block text-[10px] text-t3 mb-1">Change Status</label>
          <select className="w-full bg-surface border border-border rounded px-2 py-1.5 text-sm text-t2"
            value={selected.status}
            onChange={async e => {
              await apiUpdateContract(selected._id, { status: e.target.value });
              load();
            }}>
            {CONTRACT_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="flex flex-col h-full bg-bg">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-t1">Contracts</h1>
          <p className="text-sm text-t3 mt-0.5">{total} contracts total</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm rounded hover:bg-accent/80">
          <Plus size={16} /> New Contract
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 px-6 py-4 shrink-0 sm:grid-cols-4">
        {[
          { label: 'Active', value: summary.active, color: 'text-emerald-400' },
          { label: 'Draft', value: summary.draft, color: 'text-t3' },
          { label: 'Completed', value: summary.completed, color: 'text-purple-400' },
          { label: 'Disputed', value: summary.disputed, color: 'text-rose-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-surface border border-border rounded-lg p-4">
            <p className="text-xs text-t3">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 px-6 pb-4 shrink-0">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
          <input className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded text-sm text-t1 placeholder:text-t3"
            placeholder="Search ref, title, client..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-surface border border-border rounded px-3 py-2 text-sm text-t1">
          <option value="">All Statuses</option>
          {CONTRACT_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>

      <div className="flex flex-1 min-h-0 px-6 pb-6 gap-4">
        <div className="flex flex-col flex-1 min-w-0">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Spinner size={28} className="animate-spin text-accent" />
            </div>
          ) : contracts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-t3">
              <FileText size={40} className="mb-2 opacity-40" />
              <p>No contracts found.</p>
            </div>
          ) : (
            <OverlayScrollbarsComponent options={{ scrollbars: { autoHide: 'scroll' } }} className="flex-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-t3">
                    <th className="text-left py-2 pr-3 font-medium">Ref</th>
                    <th className="text-left py-2 pr-3 font-medium">Title</th>
                    <th className="text-left py-2 pr-3 font-medium">Client</th>
                    <th className="text-left py-2 pr-3 font-medium">Status</th>
                    <th className="text-right py-2 pr-3 font-medium">Value</th>
                    <th className="text-center py-2 pr-3 font-medium">Progress</th>
                    <th className="text-left py-2 pr-3 font-medium">End Date</th>
                    <th className="py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {contracts.map(c => (
                    <tr key={c._id} className="hover:bg-surface/50 cursor-pointer" onClick={() => { setSelected(c); setModalMode('view'); }}>
                      <td className="py-3 pr-3 font-mono text-xs text-accent">{c.contractRef}</td>
                      <td className="py-3 pr-3 font-medium text-t1 max-w-[180px] truncate">{c.title}</td>
                      <td className="py-3 pr-3 text-t2">{c.clientName}</td>
                      <td className="py-3 pr-3">
                        <span className={`text-xs border rounded px-2 py-0.5 ${STATUS_STYLES[c.status] ?? 'bg-surface text-t3 border-border'}`}>
                          {c.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-right text-t1 font-medium whitespace-nowrap">
                        {c.totalContractValue.toLocaleString()} <span className="text-t3 text-xs">{c.currency}</span>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2 min-w-[80px]">
                          <div className="flex-1 h-1.5 bg-surface-2 rounded-full overflow-hidden">
                            <div className="h-full bg-accent rounded-full"
                              style={{ width: `${Math.min(c.deliveryProgress?.pctComplete ?? 0, 100)}%` }} />
                          </div>
                          <span className="text-xs text-t3 w-8 shrink-0">{(c.deliveryProgress?.pctComplete ?? 0).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-t2 text-xs whitespace-nowrap">{fmtDate(c.endDate)}</td>
                      <td className="py-3">
                        <div className="flex gap-1">
                          <button onClick={e => { e.stopPropagation(); setSelected(c); setModalMode('view'); }}
                            className="p-1 hover:text-t1 text-t3"><Eye size={14} /></button>
                          <button onClick={e => { e.stopPropagation(); openEdit(c); }}
                            className="p-1 hover:text-t1 text-t3"><PencilSimple size={14} /></button>
                        </div>
                      </td>
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
                  className="px-3 py-1 text-xs border border-border rounded hover:bg-surface disabled:opacity-40">Prev</button>
                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1 text-xs border border-border rounded hover:bg-surface disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>

        {modalMode && (
          <DocumentSidePanel
            isOpen={true}
            onClose={() => setModalMode(null)}
            title={modalMode === 'new' ? 'New Contract' : modalMode === 'edit' ? 'Edit Contract' : selected?.title ?? ''}
            formContent={formContent}
            previewContent={viewContent}
          />
        )}
      </div>
    </div>
  );
}
