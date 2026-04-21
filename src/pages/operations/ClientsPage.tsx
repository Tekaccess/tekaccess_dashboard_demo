import React, { useState, useEffect, useCallback } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import {
  Plus, MagnifyingGlass, Users, Eye, PencilSimple,
  Spinner, Star, Phone, Envelope,
} from '@phosphor-icons/react';
import { apiListClients, apiCreateClient, apiUpdateClient, Client } from '../../lib/api';
import DocumentSidePanel from '../../components/DocumentSidePanel';

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
}

function emptyDraft(): DraftClient {
  return {
    clientCode: '', name: '', legalName: '', clientType: 'construction',
    contactName: '', contactEmail: '', contactPhone: '',
    address: '', region: '', country: 'Rwanda',
    currency: 'USD', paymentTermsDays: 30, creditLimit: 0,
  };
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selected, setSelected] = useState<Client | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [draft, setDraft] = useState<DraftClient>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadClients(); }, [search, typeFilter]);

  async function loadClients() {
    setLoading(true);
    const res = await apiListClients(search || undefined);
    if (res.success) {
      setClients(typeFilter ? res.data.clients.filter(c => c.clientType === typeFilter) : res.data.clients);
    }
    setLoading(false);
  }

  function openNew() { setDraft(emptyDraft()); setSelected(null); setError(null); setModalMode('new'); }

  function openEdit(c: Client) {
    setDraft({
      clientCode: c.clientCode, name: c.name, legalName: c.legalName || '',
      clientType: c.clientType, contactName: c.contactName || '',
      contactEmail: c.contactEmail || '', contactPhone: c.contactPhone || '',
      address: c.address || '', region: c.region || '', country: c.country,
      currency: c.currency, paymentTermsDays: c.paymentTermsDays,
      creditLimit: c.creditLimit || 0,
    });
    setSelected(c); setError(null); setModalMode('edit');
  }

  async function handleSave() {
    if (!draft.clientCode || !draft.name) { setError('Client code and name are required.'); return; }
    setSaving(true); setError(null);
    const payload = { ...draft, creditLimit: draft.creditLimit || undefined };
    const res = modalMode === 'new'
      ? await apiCreateClient(payload as any)
      : await apiUpdateClient(selected!._id, payload as any);
    setSaving(false);
    if (!res.success) { setError((res as any).message || 'Save failed.'); return; }
    setModalMode(null); loadClients();
  }

  const inp = 'w-full bg-surface border border-border rounded px-3 py-2 text-sm text-t1';

  const formContent = modalMode !== 'view' ? (
    <div className="space-y-4 p-4 pb-10">
      {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-2 rounded">{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-t3 mb-1">Client Code *</label>
          <input className={inp} value={draft.clientCode}
            onChange={e => setDraft(d => ({ ...d, clientCode: e.target.value.toUpperCase() }))}
            placeholder="CLT-001" disabled={modalMode === 'edit'} />
        </div>
        <div>
          <label className="block text-xs text-t3 mb-1">Type</label>
          <select className={inp} value={draft.clientType}
            onChange={e => setDraft(d => ({ ...d, clientType: e.target.value }))}>
            {CLIENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs text-t3 mb-1">Name *</label>
        <input className={inp} value={draft.name}
          onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="Company name" />
      </div>

      <div>
        <label className="block text-xs text-t3 mb-1">Legal Name</label>
        <input className={inp} value={draft.legalName}
          onChange={e => setDraft(d => ({ ...d, legalName: e.target.value }))} placeholder="Registered legal name (if different)" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-t3 mb-1">Contact Name</label>
          <input className={inp} value={draft.contactName}
            onChange={e => setDraft(d => ({ ...d, contactName: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs text-t3 mb-1">Contact Phone</label>
          <input className={inp} value={draft.contactPhone}
            onChange={e => setDraft(d => ({ ...d, contactPhone: e.target.value }))} />
        </div>
      </div>

      <div>
        <label className="block text-xs text-t3 mb-1">Contact Email</label>
        <input type="email" className={inp} value={draft.contactEmail}
          onChange={e => setDraft(d => ({ ...d, contactEmail: e.target.value }))} />
      </div>

      <div>
        <label className="block text-xs text-t3 mb-1">Address</label>
        <input className={inp} value={draft.address}
          onChange={e => setDraft(d => ({ ...d, address: e.target.value }))} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-t3 mb-1">Region</label>
          <input className={inp} value={draft.region}
            onChange={e => setDraft(d => ({ ...d, region: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs text-t3 mb-1">Country</label>
          <input className={inp} value={draft.country}
            onChange={e => setDraft(d => ({ ...d, country: e.target.value }))} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-t3 mb-1">Currency</label>
          <select className={inp} value={draft.currency}
            onChange={e => setDraft(d => ({ ...d, currency: e.target.value }))}>
            {CURRENCIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-t3 mb-1">Payment Terms (days)</label>
          <input type="number" min={0} className={inp} value={draft.paymentTermsDays}
            onChange={e => setDraft(d => ({ ...d, paymentTermsDays: Number(e.target.value) }))} />
        </div>
        <div>
          <label className="block text-xs text-t3 mb-1">Credit Limit</label>
          <input type="number" min={0} className={inp} value={draft.creditLimit}
            onChange={e => setDraft(d => ({ ...d, creditLimit: Number(e.target.value) }))} />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <button onClick={() => setModalMode(null)}
          className="px-4 py-2 text-sm text-t2 hover:text-t1 border border-border rounded">Cancel</button>
        <button onClick={handleSave} disabled={saving}
          className="px-4 py-2 text-sm bg-accent text-white rounded hover:bg-accent/80 flex items-center gap-2">
          {saving && <Spinner className="animate-spin" size={14} />}
          {modalMode === 'new' ? 'Create Client' : 'Save Changes'}
        </button>
      </div>
    </div>
  ) : null;

  const viewContent = modalMode === 'view' && selected ? (
    <div className="space-y-5 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-t3 font-mono">{selected.clientCode}</p>
          <h3 className="text-base font-semibold text-t1 mt-0.5">{selected.name}</h3>
          {selected.legalName && <p className="text-xs text-t3 mt-0.5">{selected.legalName}</p>}
          <span className={`inline-block text-xs border rounded px-2 py-0.5 mt-1 ${TYPE_STYLES[selected.clientType] ?? ''}`}>
            {selected.clientType}
          </span>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded border ${selected.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-surface text-t3 border-border'}`}>
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
            <div key={k as string} className="bg-surface border border-border rounded p-3 text-center">
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
        ].map(([k, v]) => (
          <div key={k}>
            <p className="text-xs text-t3">{k}</p>
            <p className="font-medium text-t1">{v}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-2 border-t border-border">
        <button onClick={() => openEdit(selected)}
          className="flex-1 flex items-center justify-center gap-2 py-2 text-sm border border-border rounded hover:bg-surface text-t2">
          <PencilSimple size={14} /> Edit
        </button>
        <button
          onClick={async () => { await apiUpdateClient(selected._id, { isActive: !selected.isActive } as any); loadClients(); setModalMode(null); }}
          className={`flex-1 py-2 text-sm border rounded ${selected.isActive ? 'border-rose-500/30 text-rose-400 hover:bg-rose-500/10' : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'}`}>
          {selected.isActive ? 'Deactivate' : 'Activate'}
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div className="flex flex-col h-full bg-bg">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-t1">Clients</h1>
          <p className="text-sm text-t3 mt-0.5">{clients.length} clients</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm rounded hover:bg-accent/80">
          <Plus size={16} /> New Client
        </button>
      </div>

      <div className="flex items-center gap-3 px-6 py-3 shrink-0">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
          <input className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded text-sm text-t1 placeholder:text-t3"
            placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="bg-surface border border-border rounded px-3 py-2 text-sm text-t1">
          <option value="">All Types</option>
          {CLIENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="flex flex-1 min-h-0 px-6 pb-6 gap-4">
        <div className="flex-1 min-w-0">
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
            <OverlayScrollbarsComponent options={{ scrollbars: { autoHide: 'scroll' } }} className="h-full">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {clients.map(c => (
                  <div key={c._id}
                    className="bg-surface border border-border rounded-lg p-4 flex flex-col gap-3 hover:border-accent/40 cursor-pointer transition-colors"
                    onClick={() => { setSelected(c); setModalMode('view'); }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-t3 font-mono">{c.clientCode}</p>
                        <p className="font-medium text-t1 truncate">{c.name}</p>
                      </div>
                      <span className={`text-xs border rounded px-2 py-0.5 shrink-0 ${TYPE_STYLES[c.clientType] ?? ''}`}>
                        {c.clientType}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-t3">
                      {c.contactName && <p className="flex items-center gap-1"><Users size={10} />{c.contactName}</p>}
                      {c.contactPhone && <p className="flex items-center gap-1"><Phone size={10} />{c.contactPhone}</p>}
                    </div>

                    <div className="flex items-center justify-between text-xs text-t3">
                      <span>{[c.region, c.country].filter(Boolean).join(', ')}</span>
                      <div className="flex gap-1">
                        <button onClick={e => { e.stopPropagation(); openEdit(c); }}
                          className="p-1 hover:text-t1 rounded"><PencilSimple size={13} /></button>
                        <button onClick={e => { e.stopPropagation(); setSelected(c); setModalMode('view'); }}
                          className="p-1 hover:text-t1 rounded"><Eye size={13} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </OverlayScrollbarsComponent>
          )}
        </div>

        {modalMode && (
          <DocumentSidePanel
            isOpen={true}
            onClose={() => setModalMode(null)}
            title={modalMode === 'new' ? 'New Client' : modalMode === 'edit' ? 'Edit Client' : selected?.name ?? ''}
            formContent={formContent}
            previewContent={viewContent}
          />
        )}
      </div>
    </div>
  );
}
