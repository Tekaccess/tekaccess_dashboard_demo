import React, { useState, useEffect, useCallback } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import {
  Plus, MagnifyingGlass, MapPin, Eye, PencilSimple,
  Spinner, Truck,
} from '@phosphor-icons/react';
import { apiListSites, apiCreateSite, apiUpdateSite, Site } from '../../lib/api';
import DocumentSidePanel from '../../components/DocumentSidePanel';

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
    <div className="space-y-4 p-4">
      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-t3 mb-1">Site Code *</label>
          <input className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-t1"
            value={draft.siteCode} onChange={e => setDraft(d => ({ ...d, siteCode: e.target.value.toUpperCase() }))}
            placeholder="SITE-KGL-001" disabled={modalMode === 'edit'} />
        </div>
        <div>
          <label className="block text-xs text-t3 mb-1">Country</label>
          <input className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-t1"
            value={draft.country} onChange={e => setDraft(d => ({ ...d, country: e.target.value }))} />
        </div>
      </div>

      <div>
        <label className="block text-xs text-t3 mb-1">Name *</label>
        <input className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-t1"
          value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
          placeholder="e.g. Kigali Loading Depot" />
      </div>

      <div>
        <label className="block text-xs text-t3 mb-2">Site Type * (select all that apply)</label>
        <div className="flex flex-wrap gap-2">
          {SITE_TYPES.map(t => (
            <button key={t} type="button" onClick={() => toggleType(t)}
              className={`px-3 py-1.5 text-sm border rounded transition-colors ${draft.siteType.includes(t) ? 'border-accent bg-accent/10 text-accent' : 'border-border text-t3 hover:text-t1'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs text-t3 mb-1">Address</label>
        <input className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-t1"
          value={draft.address} onChange={e => setDraft(d => ({ ...d, address: e.target.value }))} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-t3 mb-1">Region / City</label>
          <input className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-t1"
            value={draft.region} onChange={e => setDraft(d => ({ ...d, region: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs text-t3 mb-1">Truck Capacity</label>
          <input type="number" min={0} className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-t1"
            value={draft.truckCapacity} onChange={e => setDraft(d => ({ ...d, truckCapacity: Number(e.target.value) }))}
            placeholder="Max trucks at once" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-t3 mb-1">Contact Name</label>
          <input className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-t1"
            value={draft.contactName} onChange={e => setDraft(d => ({ ...d, contactName: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs text-t3 mb-1">Contact Phone</label>
          <input className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-t1"
            value={draft.contactPhone} onChange={e => setDraft(d => ({ ...d, contactPhone: e.target.value }))} />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <button onClick={() => setModalMode(null)}
          className="px-4 py-2 text-sm text-t2 hover:text-t1 border border-border rounded">Cancel</button>
        <button onClick={handleSave} disabled={saving}
          className="px-4 py-2 text-sm bg-accent text-white rounded hover:bg-accent/80 flex items-center gap-2">
          {saving && <Spinner className="animate-spin" size={14} />}
          {modalMode === 'new' ? 'Create Site' : 'Save Changes'}
        </button>
      </div>
    </div>
  ) : null;

  const viewContent = modalMode === 'view' && selected ? (
    <div className="space-y-5 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-t3 font-mono">{selected.siteCode}</p>
          <h3 className="text-base font-semibold text-t1 mt-0.5">{selected.name}</h3>
          <div className="flex flex-wrap gap-1 mt-1">
            {selected.siteType.map(t => (
              <span key={t} className={`text-xs border rounded px-2 py-0.5 ${TYPE_STYLES[t] ?? ''}`}>{t}</span>
            ))}
          </div>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded border ${selected.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-surface text-t3 border-border'}`}>
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
            <div key={label as string} className="bg-surface border border-border rounded p-3 text-center">
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
          className="flex-1 flex items-center justify-center gap-2 py-2 text-sm border border-border rounded hover:bg-surface text-t2">
          <PencilSimple size={14} /> Edit
        </button>
        <button onClick={async () => { await apiUpdateSite(selected._id, { isActive: !selected.isActive } as any); load(); setModalMode(null); }}
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
          <h1 className="text-xl font-semibold text-t1">Sites</h1>
          <p className="text-sm text-t3 mt-0.5">{loading_sites.length} loading · {offloading_sites.length} offloading</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm rounded hover:bg-accent/80">
          <Plus size={16} /> New Site
        </button>
      </div>

      <div className="flex items-center gap-3 px-6 py-3 shrink-0">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
          <input className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded text-sm text-t1 placeholder:text-t3"
            placeholder="Search sites..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="bg-surface border border-border rounded px-3 py-2 text-sm text-t1">
          <option value="">All Types</option>
          {SITE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="flex flex-1 min-h-0 px-6 pb-6 gap-4">
        <div className="flex-1 min-w-0">
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
            <OverlayScrollbarsComponent options={{ scrollbars: { autoHide: 'scroll' } }} className="h-full">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {sites.map(s => (
                  <div key={s._id}
                    className="bg-surface border border-border rounded-lg p-4 flex flex-col gap-3 hover:border-accent/40 cursor-pointer transition-colors"
                    onClick={() => { setSelected(s); setModalMode('view'); }}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-t3 font-mono">{s.siteCode}</p>
                        <p className="font-medium text-t1 mt-0.5">{s.name}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {s.siteType.map(t => (
                          <span key={t} className={`text-xs border rounded px-1.5 py-0.5 ${TYPE_STYLES[t] ?? ''}`}>{t}</span>
                        ))}
                      </div>
                    </div>

                    {s.liveStatus && (
                      <div className="flex gap-3 text-xs">
                        <span className="flex items-center gap-1 text-t3">
                          <Truck size={11} className="text-amber-500" />{s.liveStatus.trucksWaiting} waiting
                        </span>
                        <span className="flex items-center gap-1 text-t3">
                          <Truck size={11} className="text-blue-400" />{s.liveStatus.trucksLoading} loading
                        </span>
                        <span className="flex items-center gap-1 text-t3">
                          <Truck size={11} className="text-emerald-400" />{s.liveStatus.trucksOffloading} offloading
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-t3">
                      <span className="flex items-center gap-1">
                        <MapPin size={11} />{[s.region, s.country].filter(Boolean).join(', ')}
                      </span>
                      <div className="flex gap-1">
                        <button onClick={e => { e.stopPropagation(); openEdit(s); }}
                          className="p-1 hover:text-t1 rounded"><PencilSimple size={13} /></button>
                        <button onClick={e => { e.stopPropagation(); setSelected(s); setModalMode('view'); }}
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
            title={modalMode === 'new' ? 'New Site' : modalMode === 'edit' ? 'Edit Site' : selected?.name ?? ''}
            formContent={formContent}
            previewContent={viewContent}
          />
        )}
      </div>
    </div>
  );
}
