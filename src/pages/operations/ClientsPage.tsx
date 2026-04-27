import React, { useState, useEffect, useCallback } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import {
  Plus, MagnifyingGlass, Users, Eye, PencilSimple,
  Spinner, Phone, Envelope, Trash,
} from '@phosphor-icons/react';
import { apiListClients, apiCreateClient, apiUpdateClient, apiDeleteClient, apiListContracts, apiInstantiateContract, Client, OperationsContract } from '../../lib/api';
import ModernModal from '../../components/ui/ModernModal';
import ColumnSelector, { useColumnVisibility, ColDef } from '../../components/ui/ColumnSelector';

const CLIENT_COLS: ColDef[] = [
  { key: 'ref',      label: 'Ref' },
  { key: 'name',     label: 'Name' },
  { key: 'type',     label: 'Type' },
  { key: 'contact',  label: 'Contact' },
  { key: 'location', label: 'Location' },
];

const CLIENT_TYPES = ['mining', 'construction', 'government', 'logistics', 'agriculture', 'retail', 'other'];
const CURRENCIES = ['USD', 'RWF', 'EUR', 'KES', 'UGX', 'TZS', 'BIF'];

const TYPE_STYLES: Record<string, string> = {
  mining:       'bg-amber-500/10 text-amber-500 border-amber-500/20',
  construction: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  government:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
  logistics:    'bg-teal-500/10 text-teal-400 border-teal-500/20',
  agriculture:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  retail:       'bg-purple-500/10 text-purple-400 border-purple-500/20',
  other:        'bg-surface text-t3 border-border',
};

type ModalMode = 'new' | 'edit' | 'view' | null;

interface DraftClient {
  clientCode: string; name: string; legalName: string; clientType: string;
  contactName: string; contactEmail: string; contactPhone: string;
  address: string; region: string; country: string;
  currency: string; paymentTermsDays: number; creditLimit: number;
  contractId: string;
  startDate: string; endDate: string;
}

function emptyDraft(): DraftClient {
  return {
    clientCode: '', name: '', legalName: '', clientType: 'construction',
    contactName: '', contactEmail: '', contactPhone: '',
    address: '', region: '', country: 'Rwanda',
    currency: 'USD', paymentTermsDays: 30, creditLimit: 0,
    contractId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
  };
}

const inp = 'w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent transition-colors';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selected, setSelected] = useState<Client | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [draft, setDraft] = useState<DraftClient>(emptyDraft());
  const [contracts, setContracts] = useState<OperationsContract[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const loadClients = useCallback(async () => {
    setLoading(true);
    const [cRes, conRes, tempRes] = await Promise.all([
      apiListClients(search || undefined),
      apiListContracts({ contractType: 'client', status: 'active', isTemplate: 'false', limit: '200' }),
      apiListContracts({ contractType: 'client', isTemplate: 'true', limit: '200' }),
    ]);
    if (cRes.success) {
      setClients(typeFilter ? cRes.data.clients.filter(c => c.clientType === typeFilter) : cRes.data.clients);
    }
    if (conRes.success && tempRes.success) {
      setContracts([...tempRes.data.contracts, ...conRes.data.contracts]);
    }
    setLoading(false);
  }, [search, typeFilter]);

  useEffect(() => { loadClients(); }, [loadClients]);

  function openNew() { setDraft(emptyDraft()); setSelected(null); setError(null); setModalMode('new'); }

  function openEdit(c: Client) {
    setDraft({
      clientCode: c.clientCode, name: c.name, legalName: c.legalName || '',
      clientType: c.clientType, contactName: c.contactName || '',
      contactEmail: c.contactEmail || '', contactPhone: c.contactPhone || '',
      address: c.address || '', region: c.region || '', country: c.country,
      currency: c.currency, paymentTermsDays: c.paymentTermsDays,
      creditLimit: c.creditLimit || 0,
      contractId: c.contractId || '',
      startDate: '', endDate: '',
    });
    setSelected(c); setError(null); setModalMode('edit');
  }

  async function handleSave() {
    if (!draft.clientCode || !draft.name) { setError('Client code and name are required.'); return; }
    setSaving(true); setError(null);

    let finalContractId = draft.contractId;
    const selectedContract = contracts.find(c => c._id === draft.contractId);

    // If a template is selected, instantiate it first
    if (selectedContract?.isTemplate) {
      const instRes = await apiInstantiateContract({
        templateId: selectedContract._id,
        targetName: draft.name,
        startDate: draft.startDate,
        endDate: draft.endDate,
      });
      if (!instRes.success) {
        setError(`Failed to instantiate contract: ${instRes.message}`);
        setSaving(false);
        return;
      }
      finalContractId = instRes.data.contract._id;
    }

    const payload = { ...draft, contractId: finalContractId, creditLimit: draft.creditLimit || undefined };
    const res = modalMode === 'new'
      ? await apiCreateClient(payload as any)
      : await apiUpdateClient(selected!._id, payload as any);
    setSaving(false);
    if (!res.success) { setError((res as any).message || 'Save failed.'); return; }
    setModalMode(null); loadClients();
  }

  async function handleDelete() {
    if (!selected) return;
    setSaving(true); setError(null);
    const res = await apiDeleteClient(selected._id);
    setSaving(false);
    if (!res.success) { setError((res as any).message || 'Delete failed.'); setConfirmDelete(false); return; }
    setModalMode(null); setConfirmDelete(false); loadClients();
  }

  const formContent = modalMode !== 'view' ? (
    <div className="space-y-5">
      {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-2 rounded-lg">{error}</p>}

      <div>
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest mb-3">Client Details</p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-t3 mb-1.5">Client Code *</label>
              <input className={inp} value={draft.clientCode}
                onChange={e => setDraft(d => ({ ...d, clientCode: e.target.value.toUpperCase() }))}
                placeholder="CLT-001" disabled={modalMode === 'edit'} />
            </div>
            <div>
              <label className="block text-xs text-t3 mb-1.5">Type</label>
              <select className={inp} value={draft.clientType}
                onChange={e => setDraft(d => ({ ...d, clientType: e.target.value }))}>
                {CLIENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-t3 mb-1.5">Name *</label>
            <input className={inp} value={draft.name}
              onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="Company name" />
          </div>

          <div>
            <label className="block text-xs text-t3 mb-1.5">Legal Name</label>
            <input className={inp} value={draft.legalName}
              onChange={e => setDraft(d => ({ ...d, legalName: e.target.value }))} placeholder="Registered legal name (if different)" />
          </div>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest mb-3">Contact</p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-t3 mb-1.5">Contact Name</label>
              <input className={inp} value={draft.contactName}
                onChange={e => setDraft(d => ({ ...d, contactName: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-t3 mb-1.5">Contact Phone</label>
              <input className={inp} value={draft.contactPhone}
                onChange={e => setDraft(d => ({ ...d, contactPhone: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-t3 mb-1.5">Contact Email</label>
            <input type="email" className={inp} value={draft.contactEmail}
              onChange={e => setDraft(d => ({ ...d, contactEmail: e.target.value }))} />
          </div>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest mb-3">Location</p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-t3 mb-1.5">Address</label>
            <input className={inp} value={draft.address}
              onChange={e => setDraft(d => ({ ...d, address: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-t3 mb-1.5">Region</label>
              <input className={inp} value={draft.region}
                onChange={e => setDraft(d => ({ ...d, region: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-t3 mb-1.5">Country</label>
              <input className={inp} value={draft.country}
                onChange={e => setDraft(d => ({ ...d, country: e.target.value }))} />
            </div>
          </div>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest mb-3">Commercial & Contracts</p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-t3 mb-1.5">Currency</label>
              <select className={inp} value={draft.currency}
                onChange={e => setDraft(d => ({ ...d, currency: e.target.value }))}>
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-t3 mb-1.5">Payment Terms (days)</label>
              <input type="number" min={0} className={inp} value={draft.paymentTermsDays}
                onChange={e => setDraft(d => ({ ...d, paymentTermsDays: Number(e.target.value) }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-t3 mb-1.5">Credit Limit</label>
              <input type="number" min={0} className={inp} value={draft.creditLimit}
                onChange={e => setDraft(d => ({ ...d, creditLimit: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="block text-xs text-t3 mb-1.5">Primary Contract / Template</label>
              <select className={inp} value={draft.contractId}
                onChange={e => setDraft(d => ({ ...d, contractId: e.target.value }))}>
                <option value="">No contract selected</option>
                {contracts.map(con => (
                  <option key={con._id} value={con._id}>
                    {con.isTemplate ? '[TEMPLATE] ' : ''}{con.contractRef} — {con.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {contracts.find(c => c._id === draft.contractId)?.isTemplate && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-accent/5 border border-accent/20 rounded-lg">
              <div>
                <label className="block text-[10px] font-bold text-accent uppercase mb-1">Effective Date</label>
                <input type="date" className={inp} value={draft.startDate} onChange={e => setDraft(d => ({ ...d, startDate: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-accent uppercase mb-1">Expiry Date</label>
                <input type="date" className={inp} value={draft.endDate} onChange={e => setDraft(d => ({ ...d, endDate: e.target.value }))} />
              </div>
              <p className="col-span-2 text-[10px] text-accent/70 italic mt-1">
                A new contract will be automatically generated based on the selected template.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  ) : null;

  const modalSummary = (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-[10px] font-black text-t3 uppercase tracking-widest">Client Identity</p>
        <div className="bg-card/50 border border-border rounded-xl p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-t3">Code</span>
            <span className="font-mono font-bold text-accent">{draft.clientCode || '—'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-t3">Type</span>
            <span className="capitalize text-t1 font-medium">{draft.clientType}</span>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-[10px] font-black text-t3 uppercase tracking-widest">Contract Context</p>
        <div className="bg-card/50 border border-border rounded-xl p-4 space-y-4">
          <div>
            <p className="text-xs text-t3 mb-1">Assigned Contract</p>
            <p className="font-bold text-t1 truncate">
              {contracts.find(c => c._id === draft.contractId)?.title || 'No contract assigned'}
            </p>
          </div>
          {contracts.find(c => c._id === draft.contractId)?.isTemplate && (
            <div className="pt-3 border-t border-border">
              <p className="text-[10px] text-accent font-bold uppercase mb-2">Templated Duration</p>
              <div className="flex justify-between items-center text-xs">
                <span className="text-t3">From</span>
                <span className="text-t1 font-medium">{draft.startDate}</span>
              </div>
              <div className="flex justify-between items-center text-xs mt-1">
                <span className="text-t3">Until</span>
                <span className="text-t1 font-medium">{draft.endDate}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const viewModalSummary = selected ? (
    <div className="space-y-6">
      <div className="bg-card/50 border border-border rounded-xl p-4 space-y-4">
        <div>
          <p className="text-[10px] text-t3 uppercase font-black tracking-widest mb-1">Status</p>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${selected.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-surface text-t3 border-border'}`}>
            {selected.isActive ? 'Active Client' : 'Inactive'}
          </span>
        </div>
        {selected.liveStats && (
          <div className="space-y-2 pt-2 border-t border-border">
             <div className="flex justify-between text-sm">
              <span className="text-t3">Deliveries</span>
              <span className="font-bold text-t1">{selected.liveStats.totalDeliveries}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-t3">Contracts</span>
              <span className="font-bold text-t1">{selected.liveStats.activeContracts}</span>
            </div>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-border">
        <button onClick={() => openEdit(selected)} className="w-full py-2.5 bg-surface border border-border text-t1 rounded-xl text-sm font-bold hover:bg-card transition-all">
          Edit Client Details
        </button>
      </div>
    </div>
  ) : null;


  const viewContent = modalMode === 'view' && selected ? (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-t3 font-mono">{selected.clientCode}</p>
          <h3 className="text-base font-semibold text-t1 mt-0.5">{selected.name}</h3>
          {selected.legalName && <p className="text-xs text-t3 mt-0.5">{selected.legalName}</p>}
          <span className={`inline-flex items-center gap-1.5 text-xs border rounded-full px-2.5 py-0.5 font-medium mt-1 ${TYPE_STYLES[selected.clientType] ?? ''}`}>
            {selected.clientType}
          </span>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full border ${selected.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-surface text-t3 border-border'}`}>
          {selected.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {selected.liveStats && (
        <div className="grid grid-cols-3 gap-2">
          {[
            ['Contracts', selected.liveStats.activeContracts],
            ['Deliveries', selected.liveStats.totalDeliveries],
            ['Avg Rating', selected.liveStats.avgSatisfactionRating?.toFixed(1) ?? '—'],
          ].map(([k, v]) => (
            <div key={k as string} className="bg-surface border border-border rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-t1">{v}</p>
              <p className="text-xs text-t3">{k}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2 text-sm">
        {selected.contactName && (
          <div className="flex items-center gap-2 text-t2">
            <Users size={13} className="text-t3 shrink-0" />
            <span>{selected.contactName}</span>
          </div>
        )}
        {selected.contactPhone && (
          <div className="flex items-center gap-2 text-t2">
            <Phone size={13} className="text-t3 shrink-0" />
            <span>{selected.contactPhone}</span>
          </div>
        )}
        {selected.contactEmail && (
          <div className="flex items-center gap-2 text-t2">
            <Envelope size={13} className="text-t3 shrink-0" />
            <span>{selected.contactEmail}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        {[
          ['Country', selected.country],
          ['Region', selected.region || '—'],
          ['Currency', selected.currency],
          ['Payment Terms', `${selected.paymentTermsDays} days`],
          ['Credit Limit', selected.creditLimit ? selected.creditLimit.toLocaleString() : 'None'],
          ['Primary Contract', selected.contractRef || 'None'],
        ].map(([k, v]) => (
          <div key={k}>
            <p className="text-xs text-t3">{k}</p>
            <p className="font-medium text-t1">{v}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-2 border-t border-border">
        <button onClick={() => openEdit(selected)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm border border-border rounded-xl hover:bg-surface text-t2 transition-colors">
          <PencilSimple size={14} /> Edit
        </button>
        <button
          onClick={async () => { await apiUpdateClient(selected._id, { isActive: !selected.isActive } as any); loadClients(); setModalMode(null); }}
          className={`flex-1 py-2.5 text-sm border rounded-xl transition-colors ${selected.isActive ? 'border-rose-500/30 text-rose-400 hover:bg-rose-500/10' : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'}`}>
          {selected.isActive ? 'Deactivate' : 'Activate'}
        </button>
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)}
            className="px-3 py-2.5 text-sm border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors">
            <Trash size={14} />
          </button>
        ) : (
          <button onClick={handleDelete} disabled={saving}
            className="px-3 py-2.5 text-sm border border-rose-500 text-rose-400 bg-rose-500/10 rounded-xl transition-colors flex items-center gap-1">
            {saving ? <Spinner size={13} className="animate-spin" /> : <Trash size={13} />} Confirm
          </button>
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-t1">Clients</h1>
            <p className="text-sm text-t3 mt-1">{clients.length} clients</p>
          </div>
          <button onClick={openNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-h transition-colors">
            <Plus size={16} /> New Client
          </button>
        </div>

        {/* Search + Filter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
            <input className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent transition-colors"
              placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-t1 outline-none focus:border-accent transition-colors">
            <option value="">All Types</option>
            {CLIENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Clients Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Spinner size={28} className="animate-spin text-accent" />
            </div>
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-t3">
              <Users size={40} className="mb-2 opacity-40" />
              <p>No clients found.</p>
            </div>
          ) : (
            <OverlayScrollbarsComponent options={{ scrollbars: { autoHide: 'never' } }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface/30">
                    <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider">Ref</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider">Contact</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider">Location</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-t3 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {clients.map(c => (
                    <tr key={c._id} className="hover:bg-surface/50 cursor-pointer transition-colors" onClick={() => { setSelected(c); setModalMode('view'); }}>
                      <td className="px-4 py-3.5 font-mono text-xs text-accent">{c.clientCode}</td>
                      <td className="px-4 py-3.5 font-medium text-t1">{c.name}</td>
                      <td className="px-4 py-3.5">
                         <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold border rounded-full px-2 py-0.5 uppercase tracking-wider ${TYPE_STYLES[c.clientType] ?? ''}`}>
                          {c.clientType}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-t2 text-xs">
                        {c.contactName || '—'}
                        {c.contactPhone && <p className="text-t3">{c.contactPhone}</p>}
                      </td>
                      <td className="px-4 py-3.5 text-t2 text-xs">
                        {[c.region, c.country].filter(Boolean).join(', ')}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex justify-end gap-2 text-t3">
                          <button onClick={e => { e.stopPropagation(); openEdit(c); }} className="hover:text-t1 p-1"><PencilSimple size={14} /></button>
                          <button onClick={e => { e.stopPropagation(); setSelected(c); setModalMode('view'); }} className="hover:text-t1 p-1"><Eye size={14} /></button>
                        </div>
                      </td>
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
        onClose={() => { setModalMode(null); setConfirmDelete(false); }}
        title={modalMode === 'new' ? 'Onboard New Client' : modalMode === 'edit' ? 'Update Client' : selected?.name ?? ''}
        summaryContent={modalMode === 'view' ? viewModalSummary : modalSummary}
        actions={modalMode !== 'view' ? (
          <button 
            onClick={handleSave} 
            disabled={saving} 
            className="px-6 py-2.5 bg-accent text-white rounded-xl text-sm font-bold shadow-lg shadow-accent/20 hover:bg-accent-h transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving && <Spinner size={14} className="animate-spin" />}
            {modalMode === 'new' ? 'Create Client' : 'Save Changes'}
          </button>
        ) : undefined}
      >
        {modalMode === 'view' ? viewContent : formContent}
      </ModernModal>
    </>
  );
}
