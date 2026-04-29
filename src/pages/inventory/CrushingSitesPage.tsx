import React, { useEffect, useState, useCallback } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import {
  Hammer, Buildings, ArrowRight, Spinner, Plus, Info,
  PencilSimple, Trash,
} from '@phosphor-icons/react';
import {
  apiListWarehouses, apiCreateWarehouse, apiUpdateWarehouse, apiDeleteWarehouse,
  Warehouse, warehouseUsedPct,
} from '../../lib/api';
import ModernModal from '../../components/ui/ModernModal';
import { TableSkeleton } from '../../components/ui/Skeleton';

const CAPACITY_UNITS = ['tons', 'cubic_metres', 'pallets', 'litres', 'units'];

type ModalMode = 'new' | 'edit' | null;

interface DraftSite {
  warehouseCode: string;
  name: string;
  address: string;
  region: string;
  country: string;
  capacityUnit: string;
  totalCapacity: number;
  managerName: string;
  managerContact: string;
}

function emptyDraft(): DraftSite {
  return {
    warehouseCode: '', name: '',
    address: '', region: '', country: 'Rwanda',
    capacityUnit: 'tons', totalCapacity: 0,
    managerName: '', managerContact: '',
  };
}

const inp = 'w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent transition-colors';

export default function CrushingSitesPage() {
  const [sites, setSites] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<Warehouse | null>(null);
  const [draft, setDraft] = useState<DraftSite>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiListWarehouses({ siteType: 'crushing_site' });
    if (res.success) setSites(res.data.warehouses);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function updateDraft(patch: Partial<DraftSite>) {
    setDraft(d => ({ ...d, ...patch }));
  }

  function openNew() {
    setDraft(emptyDraft());
    setSelected(null);
    setError(null);
    setModalMode('new');
  }

  function openEdit(w: Warehouse) {
    setDraft({
      warehouseCode: w.warehouseCode,
      name: w.name,
      address: w.address || '',
      region: w.region || '',
      country: w.country,
      capacityUnit: w.capacityUnit,
      totalCapacity: w.totalCapacity,
      managerName: w.managerName || '',
      managerContact: w.managerContact || '',
    });
    setSelected(w);
    setError(null);
    setModalMode('edit');
  }

  async function handleSave() {
    if (!draft.name) {
      setError('Site name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    // On create, drop warehouseCode so the backend auto-assigns CS-###.
    const { warehouseCode, ...rest } = draft;
    const payload = modalMode === 'new'
      ? { ...rest, totalCapacity: Number(draft.totalCapacity), siteType: 'crushing_site' as const }
      : { ...draft, totalCapacity: Number(draft.totalCapacity), siteType: 'crushing_site' as const };
    const res = modalMode === 'new'
      ? await apiCreateWarehouse(payload)
      : await apiUpdateWarehouse(selected!._id, payload);
    setSaving(false);
    if (!res.success) {
      setError((res as any).message || 'Save failed.');
      return;
    }
    setModalMode(null);
    load();
  }

  async function handleDelete(id: string) {
    await apiDeleteWarehouse(id);
    setDeleteConfirm(null);
    setModalMode(null);
    load();
  }

  const formContent = (
    <div className="space-y-5">
      {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-2">{error}</p>}

      <div>
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest mb-3">Site Details</p>
        <div className="space-y-3">
          {modalMode === 'edit' ? (
            <div>
              <label className="block text-xs text-t3 mb-1.5">Site Code</label>
              <input className={inp} value={draft.warehouseCode} disabled />
            </div>
          ) : (
            <p className="text-[11px] text-t3 italic px-1">
              Site code is auto-assigned on save (CS-001, CS-002, ...).
            </p>
          )}
          <div>
            <label className="block text-xs text-t3 mb-1.5">Name *</label>
            <input className={inp}
              value={draft.name}
              onChange={e => updateDraft({ name: e.target.value })}
              placeholder="e.g. Rusizi Crusher" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-t3 mb-1.5">Total Capacity</label>
              <input type="number" min={0} className={inp}
                value={draft.totalCapacity}
                onChange={e => updateDraft({ totalCapacity: Number(e.target.value) })} />
            </div>
            <div>
              <label className="block text-xs text-t3 mb-1.5">Capacity Unit</label>
              <select className={inp}
                value={draft.capacityUnit}
                onChange={e => updateDraft({ capacityUnit: e.target.value })}>
                {CAPACITY_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest mb-3">Location</p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-t3 mb-1.5">Address</label>
            <input className={inp}
              value={draft.address}
              onChange={e => updateDraft({ address: e.target.value })}
              placeholder="Street / area" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-t3 mb-1.5">Region / City</label>
              <input className={inp}
                value={draft.region}
                onChange={e => updateDraft({ region: e.target.value })}
                placeholder="Rusizi" />
            </div>
            <div>
              <label className="block text-xs text-t3 mb-1.5">Country</label>
              <input className={inp}
                value={draft.country}
                onChange={e => updateDraft({ country: e.target.value })}
                placeholder="Rwanda" />
            </div>
          </div>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest mb-3">Manager</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-t3 mb-1.5">Manager Name</label>
            <input className={inp}
              value={draft.managerName}
              onChange={e => updateDraft({ managerName: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs text-t3 mb-1.5">Manager Contact</label>
            <input className={inp}
              value={draft.managerContact}
              onChange={e => updateDraft({ managerContact: e.target.value })} />
          </div>
        </div>
      </div>
    </div>
  );

  const modalSummary = (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-[10px] font-black text-t3 uppercase tracking-widest">Site Identity</p>
        <div className="bg-card/50 border border-border rounded-xl p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-t3">Code</span>
            <span className="font-mono font-bold text-accent">{draft.warehouseCode || 'auto-assigned'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-t3">Role</span>
            <span className="inline-flex items-center gap-1.5 text-amber-500 font-medium">
              <Hammer size={12} weight="duotone" /> Crushing Site
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-[10px] font-black text-t3 uppercase tracking-widest">Capacity</p>
        <div className="bg-card/50 border border-border rounded-xl p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-t3">Total</span>
            <span className="text-t1 font-bold">{draft.totalCapacity || '0'} {draft.capacityUnit}</span>
          </div>
          <p className="text-[10px] text-t3 italic text-center">Holds raw / uncrushed material until processed.</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-t1 flex items-center gap-2">
              <Hammer size={26} weight="duotone" className="text-amber-500" />
              Crushing Sites
            </h1>
            <p className="text-sm text-t3 mt-1">
              Sites that hold raw / uncrushed material before it is processed and moved to a warehouse.
            </p>
          </div>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-h transition-colors"
          >
            <Plus size={16} /> New Crushing Site
          </button>
        </div>

        {/* How it works banner */}
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 shrink-0">
              <Info size={18} weight="duotone" className="text-amber-500" />
            </div>
            <div className="flex-1 space-y-3">
              <p className="text-sm font-bold text-t1">How Crushing Sites work</p>
              <p className="text-xs text-t2 leading-relaxed">
                Some suppliers deliver material that is <span className="font-semibold">already crushed</span>; others
                deliver <span className="font-semibold">raw / uncrushed</span> stock. Crushed material can go straight into a
                regular warehouse. Raw material lands at a Crushing Site first, gets processed on-site, and is then
                transferred into a warehouse for sale.
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card border border-border text-t1 font-medium">
                  <Buildings size={12} weight="duotone" /> Supplier
                </span>
                <ArrowRight size={12} className="text-t3" />
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 font-medium">
                  <Hammer size={12} weight="duotone" /> Crushing Site (uncrushed)
                </span>
                <ArrowRight size={12} className="text-t3" />
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium">
                  <Buildings size={12} weight="duotone" /> Warehouse (processed)
                </span>
              </div>
              <ul className="text-[11px] text-t3 leading-relaxed space-y-1 pl-4 list-disc">
                <li>Inbound from a supplier with <span className="font-semibold">no crusher</span> → post the movement against a Crushing Site.</li>
                <li>Inbound from a supplier <span className="font-semibold">with a crusher</span> → post directly to a regular warehouse.</li>
                <li>Once material is processed at the site → use <span className="font-semibold">Transfer</span> in Stock Movements to move it to a warehouse.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Sites grid */}
        <div className="bg-card rounded-xl border border-border">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <p className="text-sm font-semibold text-t1">{sites.length} Crushing Site{sites.length !== 1 ? 's' : ''}</p>
          </div>
          {!loading && sites.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-56 text-t3 px-4 text-center">
              <Hammer size={40} weight="duotone" className="mb-2 opacity-40" />
              <p className="text-sm font-medium text-t2">No Crushing Sites yet</p>
              <p className="text-xs mt-1 max-w-sm">
                Create your first site to start receiving uncrushed material from suppliers.
              </p>
              <button
                onClick={openNew}
                className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-medium hover:bg-accent-h transition-colors"
              >
                <Plus size={12} /> Create Crushing Site
              </button>
            </div>
          ) : (
            <OverlayScrollbarsComponent options={{ scrollbars: { autoHide: 'never' } }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface">
                    <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider">Code</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider">Region</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-t3 uppercase tracking-wider">Capacity</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-t3 uppercase tracking-wider">Used</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-t3 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading && <TableSkeleton rows={5} columns={6} />}
                  {!loading && sites.map(s => {
                    const used = warehouseUsedPct(s);
                    return (
                      <tr
                        key={s._id}
                        className="hover:bg-surface transition-colors cursor-pointer"
                        onClick={() => openEdit(s)}
                      >
                        <td className="px-4 py-3.5 font-mono text-accent font-semibold">{s.warehouseCode}</td>
                        <td className="px-4 py-3.5 text-t1 font-medium">{s.name}</td>
                        <td className="px-4 py-3.5 text-t2">{s.region || '—'}</td>
                        <td className="px-4 py-3.5 text-right text-t2">
                          {s.totalCapacity.toLocaleString()} {s.capacityUnit}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className={used >= 90 ? 'text-rose-400 font-bold' : used >= 70 ? 'text-amber-500 font-semibold' : 'text-t1'}>
                            {used}%
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                          <div className="inline-flex gap-2 text-t3">
                            <button onClick={() => openEdit(s)} className="hover:text-t1 p-1"><PencilSimple size={14} /></button>
                            {deleteConfirm === s._id ? (
                              <>
                                <button onClick={() => handleDelete(s._id)} className="text-rose-400 hover:text-rose-300 p-1 text-xs font-bold">Yes</button>
                                <button onClick={() => setDeleteConfirm(null)} className="hover:text-t1 p-1 text-xs">No</button>
                              </>
                            ) : (
                              <button onClick={() => setDeleteConfirm(s._id)} className="hover:text-rose-400 p-1"><Trash size={14} /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </OverlayScrollbarsComponent>
          )}
        </div>
      </div>

      <ModernModal
        isOpen={modalMode !== null}
        onClose={() => setModalMode(null)}
        title={modalMode === 'new' ? 'New Crushing Site' : `Edit · ${selected?.name ?? ''}`}
        summaryContent={modalSummary}
        actions={
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-accent text-white rounded-xl text-sm font-bold shadow-lg shadow-accent/20 hover:bg-accent-h transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving && <Spinner size={14} className="animate-spin" />}
            {modalMode === 'new' ? 'Create Crushing Site' : 'Save Changes'}
          </button>
        }
      >
        {formContent}
      </ModernModal>
    </>
  );
}
