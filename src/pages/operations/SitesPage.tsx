import React, { useState, useEffect, useCallback } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import {
  Plus, MagnifyingGlass, MapPin, Eye, PencilSimple,
  Spinner, Truck,
} from '@phosphor-icons/react';
import { apiListSites, apiCreateSite, apiUpdateSite, Site } from '../../lib/api';
import ModernModal from '../../components/ui/ModernModal';

const SITE_TYPES = ['loading', 'offloading', 'depot', 'workshop'];

const TYPE_STYLES: Record<string, string> = {
  loading:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
  offloading: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  depot:      'bg-amber-500/10 text-amber-500 border-amber-500/20',
  workshop:   'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

type ModalMode = 'new' | 'edit' | 'view' | null;

interface DraftSite {
  siteCode: string; name: string; siteType: string[];
  address: string; region: string; country: string;
  contactName: string; contactPhone: string; truckCapacity: number; notes: string;
}

function emptyDraft(): DraftSite {
  return { siteCode: '', name: '', siteType: ['loading'], address: '', region: '', country: 'Rwanda', contactName: '', contactPhone: '', truckCapacity: 0, notes: '' };
}

const inp = 'w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent transition-colors';

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selected, setSelected] = useState<Site | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [draft, setDraft] = useState<DraftSite>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (typeFilter) params.siteType = typeFilter;
    const res = await apiListSites(params);
    if (res.success) setSites(res.data.sites);
    setLoading(false);
  }, [search, typeFilter]);

  useEffect(() => { load(); }, [load]);

  function toggleType(t: string) {
    setDraft(d => {
      const types = d.siteType.includes(t)
        ? d.siteType.filter(x => x !== t)
        : [...d.siteType, t];
      return { ...d, siteType: types.length === 0 ? [t] : types };
    });
  }

  function openNew() { setDraft(emptyDraft()); setSelected(null); setError(null); setModalMode('new'); }

  function openEdit(s: Site) {
    setDraft({
      siteCode: s.siteCode, name: s.name, siteType: [...s.siteType],
      address: s.address || '', region: s.region || '', country: s.country,
      contactName: s.contactName || '', contactPhone: s.contactPhone || '',
      truckCapacity: s.truckCapacity || 0, notes: '',
    });
    setSelected(s); setError(null); setModalMode('edit');
  }

  async function handleSave() {
    if (!draft.siteCode || !draft.name || draft.siteType.length === 0) {
      setError('Site code, name and at least one type are required.'); return;
    }
    setSaving(true); setError(null);
    const payload = { ...draft, siteType: draft.siteType, truckCapacity: Number(draft.truckCapacity) || undefined } as any;
    const res = modalMode === 'new'
      ? await apiCreateSite(payload)
      : await apiUpdateSite(selected!._id, payload);
    setSaving(false);
    if (!res.success) { setError((res as any).message || 'Save failed.'); return; }
    setModalMode(null); load();
  }

  const loading_sites = sites.filter(s => s.siteType.includes('loading'));
  const offloading_sites = sites.filter(s => s.siteType.includes('offloading'));

  const formContent = modalMode !== 'view' ? (
    <div className="space-y-5">
      {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-2">{error}</p>}

      <div>
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest mb-3">Site Details</p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-t3 mb-1.5">Site Code *</label>
              <input className={inp}
                value={draft.siteCode} onChange={e => setDraft(d => ({ ...d, siteCode: e.target.value.toUpperCase() }))}
                placeholder="SITE-KGL-001" disabled={modalMode === 'edit'} />
            </div>
            <div>
              <label className="block text-xs text-t3 mb-1.5">Country</label>
              <input className={inp}
                value={draft.country} onChange={e => setDraft(d => ({ ...d, country: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="block text-xs text-t3 mb-1.5">Name *</label>
            <input className={inp}
              value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
              placeholder="e.g. Kigali Loading Depot" />
          </div>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest mb-3">Site Type *</p>
        <div className="flex flex-wrap gap-2">
          {SITE_TYPES.map(t => (
            <button key={t} type="button" onClick={() => toggleType(t)}
              className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${draft.siteType.includes(t) ? 'border-accent bg-accent/10 text-accent' : 'border-border text-t3 hover:text-t1'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest mb-3">Location</p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-t3 mb-1.5">Address</label>
            <input className={inp}
              value={draft.address} onChange={e => setDraft(d => ({ ...d, address: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs text-t3 mb-1.5">Region / City</label>
            <input className={inp}
              value={draft.region} onChange={e => setDraft(d => ({ ...d, region: e.target.value }))} />
          </div>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest mb-3">Contact &amp; Capacity</p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-t3 mb-1.5">Contact Name</label>
              <input className={inp}
                value={draft.contactName} onChange={e => setDraft(d => ({ ...d, contactName: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-t3 mb-1.5">Contact Phone</label>
              <input className={inp}
                value={draft.contactPhone} onChange={e => setDraft(d => ({ ...d, contactPhone: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-t3 mb-1.5">Truck Capacity</label>
            <input type="number" min={0} className={inp}
              value={draft.truckCapacity} onChange={e => setDraft(d => ({ ...d, truckCapacity: Number(e.target.value) }))}
              placeholder="Max trucks at once" />
          </div>
        </div>
      </div>
    </div>
  ) : null;

  const modalSummary = (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-[10px] font-black text-t3 uppercase tracking-widest">Site Identity</p>
        <div className="bg-card/50 border border-border rounded-xl p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-t3">Code</span>
            <span className="font-mono font-bold text-accent">{draft.siteCode || '—'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-t3">Capacity</span>
            <span className="text-t1 font-medium">{draft.truckCapacity || '0'} Trucks</span>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-[10px] font-black text-t3 uppercase tracking-widest">Type Configuration</p>
        <div className="flex flex-wrap gap-1.5 px-1">
          {draft.siteType.map(t => (
            <span key={t} className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${TYPE_STYLES[t] ?? ''}`}>
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  const viewModalSummary = selected ? (
    <div className="space-y-6">
      <div className="bg-card/50 border border-border rounded-xl p-4 space-y-4">
        <div>
          <p className="text-[10px] text-t3 uppercase font-black tracking-widest mb-1">Current Status</p>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${selected.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-surface text-t3 border-border'}`}>
            {selected.isActive ? 'Site Operational' : 'Offline'}
          </span>
        </div>
        
        {selected.liveStatus && (
          <div className="space-y-3 pt-3 border-t border-border">
            <p className="text-[10px] text-t3 uppercase font-black tracking-widest">Live Trucks</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-surface rounded-lg text-center">
                <p className="text-sm font-bold text-amber-500">{selected.liveStatus.trucksWaiting}</p>
                <p className="text-[9px] text-t3 uppercase">Waiting</p>
              </div>
              <div className="p-2 bg-surface rounded-lg text-center">
                <p className="text-sm font-bold text-blue-400">{selected.liveStatus.trucksLoading}</p>
                <p className="text-[9px] text-t3 uppercase">Loading</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-border">
        <button onClick={() => openEdit(selected)} className="w-full py-2.5 bg-surface border border-border text-t1 rounded-xl text-sm font-bold hover:bg-card transition-all">
          Edit Site Details
        </button>
      </div>
    </div>
  ) : null;

  const viewContent = modalMode === 'view' && selected ? (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-t3 font-mono">{selected.siteCode}</p>
          <h3 className="text-base font-semibold text-t1 mt-0.5">{selected.name}</h3>
          <div className="flex flex-wrap gap-1 mt-1">
            {selected.siteType.map(t => (
              <span key={t} className={`inline-flex items-center gap-1.5 text-xs border rounded-full px-2.5 py-0.5 font-medium ${TYPE_STYLES[t] ?? ''}`}>{t}</span>
            ))}
          </div>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full border ${selected.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-surface text-t3 border-border'}`}>
          {selected.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {selected.liveStatus && (
        <div className="grid grid-cols-3 gap-2">
          {[
            ['Waiting', selected.liveStatus.trucksWaiting, 'text-amber-500'],
            ['Loading', selected.liveStatus.trucksLoading, 'text-blue-400'],
            ['Offloading', selected.liveStatus.trucksOffloading, 'text-emerald-400'],
          ].map(([label, val, color]) => (
            <div key={label as string} className="bg-surface border border-border rounded-lg p-3 text-center">
              <p className={`text-xl font-bold ${color}`}>{val}</p>
              <p className="text-xs text-t3">{label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 text-sm">
        {[
          ['Country', selected.country],
          ['Region', selected.region || '—'],
          ['Truck Cap.', selected.truckCapacity ? String(selected.truckCapacity) : '—'],
          ['Contact', selected.contactName || '—'],
          ['Phone', selected.contactPhone || '—'],
        ].map(([k, v]) => (
          <div key={k}>
            <p className="text-xs text-t3">{k}</p>
            <p className="font-medium text-t1">{v}</p>
          </div>
        ))}
      </div>

      {selected.address && (
        <div className="flex items-start gap-2 text-sm text-t2">
          <MapPin size={14} className="text-t3 mt-0.5 shrink-0" />
          <span>{selected.address}</span>
        </div>
      )}

      <div className="flex gap-2 pt-2 border-t border-border">
        <button onClick={() => openEdit(selected)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm border border-border rounded-xl hover:bg-surface text-t2 transition-colors">
          <PencilSimple size={14} /> Edit
        </button>
        <button onClick={async () => { await apiUpdateSite(selected._id, { isActive: !selected.isActive } as any); load(); setModalMode(null); }}
          className={`flex-1 py-2.5 text-sm border rounded-xl transition-colors ${selected.isActive ? 'border-rose-500/30 text-rose-400 hover:bg-rose-500/10' : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'}`}>
          {selected.isActive ? 'Deactivate' : 'Activate'}
        </button>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-t1">Sites</h1>
            <p className="text-sm text-t3 mt-1">{loading_sites.length} loading · {offloading_sites.length} offloading</p>
          </div>
          <button onClick={openNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-h transition-colors">
            <Plus size={16} /> New Site
          </button>
        </div>

        {/* Search + Filter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
            <input className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent transition-colors"
              placeholder="Search sites..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-t1 outline-none focus:border-accent transition-colors">
            <option value="">All Types</option>
            {SITE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Sites Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Spinner size={28} className="animate-spin text-accent" />
            </div>
          ) : sites.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-t3">
              <MapPin size={40} className="mb-2 opacity-40" />
              <p>No sites found.</p>
            </div>
          ) : (
            <OverlayScrollbarsComponent options={{ scrollbars: { autoHide: 'never' } }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface/30">
                    <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider">Ref</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider">Wait/Load</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-t3 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sites.map(s => (
                    <tr key={s._id} className="hover:bg-surface/50 cursor-pointer transition-colors" onClick={() => { setSelected(s); setModalMode('view'); }}>
                      <td className="px-4 py-3.5 font-mono text-xs text-accent">{s.siteCode}</td>
                      <td className="px-4 py-3.5 font-medium text-t1">{s.name}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex gap-1">
                          {s.siteType.map(t => (
                            <span key={t} className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${TYPE_STYLES[t] ?? ''}`}>{t}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-t2 text-xs">
                        {[s.region, s.country].filter(Boolean).join(', ')}
                      </td>
                      <td className="px-4 py-3.5">
                        {s.liveStatus && (
                          <div className="flex gap-3 text-[11px]">
                            <span className="flex items-center gap-1 text-amber-500 font-bold">{s.liveStatus.trucksWaiting} W</span>
                            <span className="flex items-center gap-1 text-blue-400 font-bold">{s.liveStatus.trucksLoading} L</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex justify-end gap-2 text-t3">
                          <button onClick={e => { e.stopPropagation(); openEdit(s); }} className="hover:text-t1 p-1"><PencilSimple size={14} /></button>
                          <button onClick={e => { e.stopPropagation(); setSelected(s); setModalMode('view'); }} className="hover:text-t1 p-1"><Eye size={14} /></button>
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
        onClose={() => setModalMode(null)}
        title={modalMode === 'new' ? 'Initialize New Site' : modalMode === 'edit' ? 'Update Site' : selected?.name ?? ''}
        summaryContent={modalMode === 'view' ? viewModalSummary : modalSummary}
        actions={modalMode !== 'view' ? (
          <button 
            onClick={handleSave} 
            disabled={saving} 
            className="px-6 py-2.5 bg-accent text-white rounded-xl text-sm font-bold shadow-lg shadow-accent/20 hover:bg-accent-h transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving && <Spinner size={14} className="animate-spin" />}
            {modalMode === 'new' ? 'Create Site' : 'Save Changes'}
          </button>
        ) : undefined}
      >
        {modalMode === 'view' ? viewContent : formContent}
      </ModernModal>
    </>
  );
}
