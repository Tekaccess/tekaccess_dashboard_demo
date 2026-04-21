import React, { useState, useEffect, useCallback } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import {
  Plus, MagnifyingGlass, FileText, CheckCircle, Warning,
  PencilSimple, Eye, Spinner, Trash,
} from '@phosphor-icons/react';
import {
  apiGetContractsSummary, apiListContracts, apiCreateContract, apiUpdateContract,
  apiListClients,
  OperationsContract, ContractLine, Client,
} from '../../lib/api';
import ModernModal from '../../components/ui/ModernModal';
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
const STATUS_DOT: Record<string, string> = {
  draft: 'bg-t3', active: 'bg-emerald-400', partially_delivered: 'bg-blue-400',
  completed: 'bg-purple-400', closed: 'bg-t3', disputed: 'bg-rose-400', cancelled: 'bg-rose-400',
};

const CONTRACT_STATUSES = ['draft', 'active', 'partially_delivered', 'completed', 'closed', 'disputed', 'cancelled'];
const CURRENCIES = ['USD', 'RWF', 'EUR', 'KES', 'UGX', 'TZS'];
const LINE_UNITS = ['tons', 'kg', 'litres', 'units'];

type ModalMode = 'new' | 'edit' | 'view' | null;

interface DraftLine {
  lineRef: string; materialDescription: string; unit: string; committedQty: number; unitPrice: number;
}
interface DraftContract {
  contractRef: string; title: string; contractType: 'employee' | 'driver' | 'client';
  isTemplate: boolean;
  perks: string; clientId: string; clientName: string; currency: string;
  pricePerTon: number; startDate: string; endDate: string; accountManagerName: string; notes: string;
  lines: DraftLine[];
}

function emptyLine(idx: number): DraftLine {
  return { lineRef: `L${String(idx + 1).padStart(2, '0')}`, materialDescription: '', unit: 'tons', committedQty: 0, unitPrice: 0 };
}
function emptyDraft(): DraftContract {
  const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const rand = Math.random().toString(16).slice(2, 6).toUpperCase();
  return { 
    contractRef: `CON-${dateStr}-${rand}`, 
    title: '', 
    contractType: 'client', 
    isTemplate: false,
    perks: '', 
    clientId: '', 
    clientName: '', 
    currency: 'USD', 
    pricePerTon: 0, 
    startDate: new Date().toISOString().split('T')[0], 
    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0], 
    accountManagerName: '', 
    notes: '', 
    lines: [emptyLine(0)] 
  };
}
function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const inp = 'w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent transition-colors';
const label = 'block text-[10px] text-t3 mb-1';

export default function ContractsPage() {
  const [contracts, setContracts] = useState<OperationsContract[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [summary, setSummary] = useState({ active: 0, draft: 0, completed: 0, disputed: 0 });
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
      apiListContracts({ ...params, isTemplate: 'false' }),
      apiGetContractsSummary(),
      apiListClients(),
    ]);
    if (cRes.success) { setContracts(cRes.data.contracts); setTotal(cRes.data.pagination.total); }
    if (sRes.success) setSummary(sRes.data.summary);
    if (clRes.success) setClients(clRes.data.clients);
    setLoading(false);
  }, [search, statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  const clientOptions: SearchSelectOption[] = clients.map(c => ({ value: c._id, label: c.name, sublabel: c.clientCode, meta: c.country }));

  function updateLine(idx: number, patch: Partial<DraftLine>) {
    setDraft(d => { const lines = [...d.lines]; lines[idx] = { ...lines[idx], ...patch }; return { ...d, lines }; });
  }
  function addLine() { setDraft(d => ({ ...d, lines: [...d.lines, emptyLine(d.lines.length)] })); }
  function removeLine(idx: number) { setDraft(d => ({ ...d, lines: d.lines.filter((_, i) => i !== idx) })); }
  function openNew() { setDraft(emptyDraft()); setSelected(null); setError(null); setModalMode('new'); }
  function openEdit(c: OperationsContract) {
    setDraft({
      contractRef: c.contractRef, title: c.title,
      contractType: c.contractType || 'client',
      isTemplate: !!c.isTemplate,
      perks: c.perks?.join(', ') || '',
      clientId: typeof c.clientId === 'string' ? c.clientId : '',
      clientName: c.clientName, currency: c.currency, pricePerTon: c.pricePerTon || 0,
      startDate: c.startDate?.slice(0, 10) || '', endDate: c.endDate?.slice(0, 10) || '',
      accountManagerName: c.accountManagerName || '', notes: c.notes || '',
      lines: c.contractLines.map(l => ({ lineRef: l.lineRef, materialDescription: l.materialDescription, unit: l.unit, committedQty: l.committedQty, unitPrice: l.unitPrice })),
    });
    setSelected(c); setError(null); setModalMode('edit');
  }

  async function handleSave() {
    if (!draft.contractRef || !draft.title || !draft.clientName) { setError('Contract ref, title and client are required.'); return; }
    if (draft.lines.some(l => !l.materialDescription || l.committedQty <= 0)) { setError('All lines need a description and committed quantity.'); return; }
    setSaving(true); setError(null);
    const payload = {
      contractRef: draft.contractRef.toUpperCase(), title: draft.title,
      contractType: draft.contractType,
      isTemplate: draft.isTemplate,
      perks: draft.perks.split(',').map(p => p.trim()).filter(p => p),
      clientId: (!draft.isTemplate && draft.clientId) ? draft.clientId : undefined, 
      clientName: draft.isTemplate ? 'Template' : draft.clientName,
      currency: draft.currency, pricePerTon: draft.pricePerTon || undefined,
      startDate: draft.isTemplate ? undefined : draft.startDate, 
      endDate: draft.isTemplate ? undefined : draft.endDate,
      accountManagerName: draft.accountManagerName || undefined,
      notes: draft.notes || undefined, contractLines: draft.lines,
    };
    const res = modalMode === 'new' ? await apiCreateContract(payload as any) : await apiUpdateContract(selected!._id, payload as any);
    setSaving(false);
    if (!res.success) { setError((res as any).message || 'Save failed.'); return; }
    setModalMode(null); load();
  }

  const totalPages = Math.ceil(total / 50);
  const lineTotal = (l: DraftLine) => l.committedQty * l.unitPrice;
  const grandTotal = draft.lines.reduce((s, l) => s + lineTotal(l), 0);

  const formContent = modalMode !== 'view' ? (
    <div className="space-y-5 pb-10">
      {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-500">{error}</div>}

      <section className="space-y-4">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Contract Info</p>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={label}>Contract Ref *</label><input className={inp} value={draft.contractRef} onChange={e => setDraft(d => ({ ...d, contractRef: e.target.value.toUpperCase() }))} placeholder="CON-2025-001" disabled={modalMode === 'edit'} /></div>
          <div>
            <label className={label}>Configuration</label>
            <div className="flex items-center h-[38px] px-3 bg-surface border border-border rounded-lg">
              <input 
                type="checkbox" 
                id="isTemplate" 
                className="w-4 h-4 accent-accent rounded" 
                checked={draft.isTemplate} 
                onChange={e => setDraft(d => ({ ...d, isTemplate: e.target.checked }))} 
              />
              <label htmlFor="isTemplate" className="ml-2 text-xs text-t2 cursor-pointer font-medium">Save as reusable Template</label>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={label}>Contract Type</label>
            <select className={inp} value={draft.contractType} onChange={e => setDraft(d => ({ ...d, contractType: e.target.value as any }))}>
              <option value="client">Client</option>
              <option value="employee">Employee</option>
              <option value="driver">Driver</option>
            </select>
          </div>
          <div><label className={label}>Currency</label>
            <select className={inp} value={draft.currency} onChange={e => setDraft(d => ({ ...d, currency: e.target.value }))}>
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div><label className={label}>Title *</label><input className={inp} value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} placeholder="e.g. Employee Agreement — John Doe" /></div>
        <div><label className={label}>Perks (comma separated)</label><input className={inp} value={draft.perks} onChange={e => setDraft(d => ({ ...d, perks: e.target.value }))} placeholder="Health Insurance, Transport Allowance..." /></div>
        {!draft.isTemplate && draft.contractType === 'client' && (
          <div>
            <label className={label}>Client *</label>
            <SearchSelect options={clientOptions} value={draft.clientId || null} onChange={v => { const c = clients.find(cl => cl._id === v); setDraft(d => ({ ...d, clientId: v ?? '', clientName: c?.name ?? d.clientName })); }} placeholder="Select client..." />
            {!draft.clientId && draft.clientName && <input className={`${inp} mt-1`} value={draft.clientName} onChange={e => setDraft(d => ({ ...d, clientName: e.target.value }))} placeholder="Or type client name manually" />}
          </div>
        )}
        {!draft.isTemplate && (
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Start Date *</label><input type="date" className={inp} value={draft.startDate} onChange={e => setDraft(d => ({ ...d, startDate: e.target.value }))} /></div>
            <div><label className={label}>End Date *</label><input type="date" className={inp} value={draft.endDate} onChange={e => setDraft(d => ({ ...d, endDate: e.target.value }))} /></div>
          </div>
        )}
        <div className="grid grid-cols-1 gap-3">
          <div><label className={label}>Account Manager</label><input className={inp} value={draft.accountManagerName} onChange={e => setDraft(d => ({ ...d, accountManagerName: e.target.value }))} /></div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Contract Lines</p>
          <button onClick={addLine} className="text-[11px] font-bold text-accent hover:underline flex items-center gap-1"><Plus size={11} weight="bold" /> Add Line</button>
        </div>
        {draft.lines.map((line, idx) => (
          <div key={idx} className="bg-surface rounded-xl border border-border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-t3 uppercase">{line.lineRef}</span>
              {draft.lines.length > 1 && <button onClick={() => removeLine(idx)} className="text-red-500 hover:text-red-400"><Trash size={13} weight="bold" /></button>}
            </div>
            <input className={inp} placeholder="Material description *" value={line.materialDescription} onChange={e => updateLine(idx, { materialDescription: e.target.value })} />
            <div className="grid grid-cols-3 gap-2">
              <div><label className="block text-[10px] text-t3 mb-0.5">Unit</label><select className={inp} value={line.unit} onChange={e => updateLine(idx, { unit: e.target.value })}>{LINE_UNITS.map(u => <option key={u}>{u}</option>)}</select></div>
              <div><label className="block text-[10px] text-t3 mb-0.5">Qty *</label><input type="number" min={0} className={inp} value={line.committedQty} onChange={e => updateLine(idx, { committedQty: Number(e.target.value) })} /></div>
              <div><label className="block text-[10px] text-t3 mb-0.5">Unit Price</label><input type="number" min={0} className={inp} value={line.unitPrice} onChange={e => updateLine(idx, { unitPrice: Number(e.target.value) })} /></div>
            </div>
            <div className="text-xs text-right text-t2 font-medium">{lineTotal(line).toLocaleString()} {draft.currency}</div>
          </div>
        ))}
        <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 flex justify-between">
          <span className="font-bold text-t1">Total Contract Value</span>
          <span className="font-black text-accent">{grandTotal.toLocaleString()} {draft.currency}</span>
        </div>
      </section>

      <section>
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest mb-2">Notes</p>
        <textarea rows={2} className={`${inp} resize-none`} value={draft.notes} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} />
      </section>
    </div>
  ) : null;

  const modalSummary = (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-[10px] font-black text-t3 uppercase tracking-widest">Financial Summary</p>
        <div className="bg-card/50 border border-border rounded-xl p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-t3">Total Value</span>
            <span className="font-bold text-t1">{grandTotal.toLocaleString()} {draft.currency}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-t3">Total Tonnage</span>
            <span className="font-bold text-t1">{draft.lines.reduce((s, l) => s + l.committedQty, 0).toLocaleString()} tons</span>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-[10px] font-black text-t3 uppercase tracking-widest">Perks & Benefits</p>
        <div className="bg-card/50 border border-border rounded-xl p-4">
          {draft.perks.trim() ? (
            <ul className="space-y-2">
              {draft.perks.split(',').map((p, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-t2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                  {p.trim()}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-t3 italic text-center py-2">No perks added yet</p>
          )}
        </div>
      </div>

      {modalMode === 'edit' && selected && (
        <div className="space-y-1">
          <p className="text-[10px] font-black text-t3 uppercase tracking-widest">Current Status</p>
          <div className="bg-card/50 border border-border rounded-xl p-4">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_STYLES[selected.status] ?? STATUS_STYLES.draft}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[selected.status] ?? STATUS_DOT.draft}`} />
              {selected.status.replace('_', ' ')}
            </span>
          </div>
        </div>
      )}
    </div>
  );

  const viewModalSummary = selected ? (
    <div className="space-y-6 text-sm">
      <div className="bg-card/50 border border-border rounded-xl p-4 space-y-4">
        <div>
          <p className="text-[10px] text-t3 uppercase font-black tracking-widest mb-1">Contract Total</p>
          <p className="text-2xl font-black text-accent">{selected.totalContractValue.toLocaleString()} {selected.currency}</p>
        </div>
        <div>
          <p className="text-[10px] text-t3 uppercase font-black tracking-widest mb-1">Total Tonnage</p>
          <p className="text-lg font-bold text-t1">{selected.totalCommittedTons.toLocaleString()} tons</p>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-[10px] font-black text-t3 uppercase tracking-widest font-mono">Quick Actions</p>
        <select className={inp} value={selected.status}
          onChange={async e => { await apiUpdateContract(selected._id, { status: e.target.value }); load(); }}>
          {CONTRACT_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>

      <div className="pt-4 border-t border-border">
        <button onClick={() => openEdit(selected)} className="w-full py-2.5 bg-surface border border-border text-t1 rounded-xl text-sm font-bold hover:bg-card transition-all">
          Edit Original
        </button>
      </div>
    </div>
  ) : null;

  const viewContent = modalMode === 'view' && selected ? (
    <div className="space-y-5 pb-10">
      <section className="space-y-3">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Contract Details</p>
        <div className="flex items-center gap-2 mb-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[selected.status] ?? STATUS_STYLES.draft}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[selected.status] ?? STATUS_DOT.draft}`} />
            {selected.status.replace('_', ' ')}
          </span>
        </div>
        {[
          ['Ref', selected.contractRef], ['Title', selected.title], ['Type', selected.contractType],
          ['Client', selected.clientName],
          ['Perks', selected.perks?.join(', ') || '—'],
          ['Start', fmtDate(selected.startDate)], ['End', fmtDate(selected.endDate)],
          ['Manager', selected.accountManagerName || '—'],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between text-sm"><span className="text-t3">{k}</span><span className="font-medium text-t1 text-right max-w-[60%] truncate">{v}</span></div>
        ))}
      </section>


      <section className="space-y-2">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Contract Lines</p>
        {selected.contractLines.map((l, i) => (
          <div key={i} className="p-3 bg-surface rounded-xl border border-border text-sm space-y-1">
            <div className="font-medium text-t1">{l.materialDescription}</div>
            <div className="text-xs text-t3">{l.committedQty.toLocaleString()} {l.unit} × {l.unitPrice.toLocaleString()} = {l.lineValue.toLocaleString()} {selected.currency}</div>
            <div className="h-1 bg-border rounded-full overflow-hidden mt-1">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${l.committedQty > 0 ? Math.min((l.deliveredQty / l.committedQty) * 100, 100) : 0}%` }} />
            </div>
          </div>
        ))}
      </section>

      <div className="flex gap-2">
        <button onClick={() => openEdit(selected)} className="flex-1 py-2.5 border border-accent text-accent rounded-xl text-sm font-bold hover:bg-accent/5 transition-all">Edit Contract</button>
        <div className="flex-1">
          <select className={`${inp} h-full`} value={selected.status}
            onChange={async e => { await apiUpdateContract(selected._id, { status: e.target.value }); load(); }}>
            {CONTRACT_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </div>
      </div>
    </div>
  ) : null;

  const previewContent = selected ? (
    <div className="font-sans text-[#1a1a1a] w-full">
      <div className="flex justify-between items-start mb-6">
        <div className="w-40"><img src="/logo.jpg" alt="TEKACCESS" className="w-full h-auto" /></div>
        <div className="text-right text-[11px] leading-tight text-gray-600">
          <p className="font-bold text-gray-800 uppercase tracking-wider">TEKACCESS</p>
          <p>13 KG 599 St, Gishushu</p><p>Kigali, Rwanda</p>
        </div>
      </div>
      <p className="text-[11px] font-bold text-[#4285f4] mb-8 italic">Built on trust. Delivered with Excellence</p>
      <h1 className="text-2xl font-medium text-[#4285f4] mb-6">Contract <span className="font-bold text-gray-800">#{selected.contractRef}</span></h1>
      <div className="grid grid-cols-2 gap-4 border-y border-gray-100 py-6 mb-6 text-sm">
        {[
          ['Client', selected.clientName], ['Type', selected.contractType],
          ['Start Date', fmtDate(selected.startDate)], ['End Date', fmtDate(selected.endDate)],
          ['Perks', selected.perks?.join(', ') || '—'],
          ['Manager', selected.accountManagerName || '—'], ['Status', selected.status.replace('_', ' ')],
        ].map(([l, v]) => (
          <div key={l}><p className="text-[10px] font-black text-gray-400 uppercase mb-0.5">{l}</p><p className="font-semibold text-gray-800">{v}</p></div>
        ))}
      </div>
      <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Contract Items/Lines</p>
      <table className="w-full border-collapse border border-gray-800 text-[11px] mb-6">
        <thead><tr className="border-b border-gray-800 bg-gray-50">
          <th className="py-2 px-3 text-left font-black uppercase">Line</th>
          <th className="py-2 px-3 text-left font-black uppercase">Description</th>
          <th className="py-2 px-3 text-center font-black uppercase">Qty</th>
        </tr></thead>
        <tbody>{selected.contractLines.map((l, i) => (
          <tr key={i} className="border-b border-gray-200">
            <td className="py-2 px-3">{l.lineRef}</td>
            <td className="py-2 px-3 font-semibold">{l.materialDescription}</td>
            <td className="py-2 px-3 text-center">{l.committedQty.toLocaleString()} {l.unit}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center h-full text-gray-300">
      <FileText size={60} weight="duotone" />
      <p className="text-sm mt-3">Select a contract to preview</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-t1">Contracts</h1>
          <p className="text-sm text-t3 mt-0.5">{total} contracts total</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-h transition-colors">
          <Plus size={15} weight="bold" /> New Contract
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active', value: summary.active, Icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Draft', value: summary.draft, Icon: FileText, color: 'text-t3', bg: 'bg-surface' },
          { label: 'Completed', value: summary.completed, Icon: CheckCircle, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { label: 'Disputed', value: summary.disputed, Icon: Warning, color: 'text-rose-400', bg: 'bg-rose-500/10' },
        ].map(card => (
          <div key={card.label} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
            <div className={`p-2.5 rounded-xl ${card.bg}`}><card.Icon size={18} weight="duotone" className={card.color} /></div>
            <div>
              <p className="text-xs text-t3 font-medium uppercase tracking-wide">{card.label}</p>
              <p className="text-xl font-bold text-t1 mt-0.5">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
          <div className="relative flex-1 min-w-[200px]">
            <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
            <input type="text" placeholder="Search ref, title, client..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-surface text-t1 placeholder-t3 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors" />
          </div>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-border rounded-lg text-sm bg-surface text-t2 outline-none focus:border-accent transition-colors">
            <option value="">All Statuses</option>
            {CONTRACT_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </div>

        <OverlayScrollbarsComponent options={{ scrollbars: { autoHide: 'scroll' } }} defer>
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-surface">
              <tr>
                {['Ref', 'Title', 'Type', 'Target/Client', 'Status', 'End Date', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border-s">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-16 text-center"><Spinner size={24} className="animate-spin text-t3 mx-auto" /></td></tr>
              ) : contracts.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-16 text-center text-t3 text-sm">
                  <div className="flex flex-col items-center gap-3"><FileText size={40} weight="duotone" className="text-t3/40" /><p>No contracts found.</p><button onClick={openNew} className="text-accent font-semibold hover:underline">Create first contract</button></div>
                </td></tr>
              ) : contracts.map(c => (
                <tr key={c._id} className="hover:bg-surface transition-colors cursor-pointer" onClick={() => { setSelected(c); setModalMode('view'); }}>
                  <td className="px-4 py-3.5 text-sm font-semibold text-accent">
                    {c.contractRef}
                    {c.isTemplate && <span className="ml-2 px-1.5 py-0.5 bg-accent/10 text-[9px] font-black text-accent border border-accent/20 rounded uppercase">Template</span>}
                  </td>
                  <td className="px-4 py-3.5 text-sm font-medium text-t1 max-w-[180px] truncate">{c.title}</td>
                  <td className="px-4 py-3.5 text-sm text-t2 capitalize">{c.contractType}</td>
                  <td className="px-4 py-3.5 text-sm text-t2">{c.isTemplate ? '—' : (c.clientName || '—')}</td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[c.status] ?? STATUS_STYLES.draft}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[c.status] ?? STATUS_DOT.draft}`} />
                      {c.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-t2 whitespace-nowrap">{c.isTemplate ? '—' : fmtDate(c.endDate)}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={e => { e.stopPropagation(); setSelected(c); setModalMode('view'); }} className="p-1.5 text-t3 hover:text-accent hover:bg-accent-glow rounded-lg transition-colors"><Eye size={14} weight="duotone" /></button>
                      <button onClick={e => { e.stopPropagation(); openEdit(c); }} className="p-1.5 text-t3 hover:text-t1 hover:bg-surface rounded-lg transition-colors"><PencilSimple size={14} weight="duotone" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </OverlayScrollbarsComponent>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-t3">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-xs border border-border rounded-lg hover:bg-surface disabled:opacity-40">Prev</button>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-xs border border-border rounded-lg hover:bg-surface disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      <ModernModal
        isOpen={modalMode !== null}
        onClose={() => { setModalMode(null); setSelected(null); setError(null); }}
        title={modalMode === 'new' ? 'Create Shipping Contract' : modalMode === 'edit' ? 'Edit Contract' : selected?.title ?? ''}
        summaryContent={modalMode === 'view' ? viewModalSummary : modalSummary}
        actions={modalMode !== 'view' ? (
          <button 
            onClick={handleSave} 
            disabled={saving} 
            className="px-6 py-2.5 bg-accent text-white rounded-xl text-sm font-bold shadow-lg shadow-accent/20 hover:bg-accent-h transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving && <Spinner size={14} className="animate-spin" />}
            {modalMode === 'new' ? 'Post Contract' : 'Update Details'}
          </button>
        ) : undefined}
      >
        {modalMode === 'view' ? viewContent : formContent}
      </ModernModal>
    </div>
  );
}
