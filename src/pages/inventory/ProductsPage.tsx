import React, { useState, useEffect, useCallback } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import {
  Plus, MagnifyingGlass, Package, PencilSimple, Eye, Trash, Spinner,
  CurrencyCircleDollar,
} from '@phosphor-icons/react';
import {
  apiListProducts, apiCreateProduct, apiUpdateProduct, apiDeleteProduct,
  Product,
} from '../../lib/api';
import DocumentSidePanel from '../../components/DocumentSidePanel';
import ColumnSelector, { useColumnVisibility, ColDef } from '../../components/ui/ColumnSelector';

const TYPE_STYLES: Record<string, string> = {};

const CURRENCIES = ['RWF', 'USD', 'EUR', 'KES', 'UGX', 'TZS', 'BIF'];

type ModalMode = 'new' | 'edit' | 'view' | null;

interface DraftProduct {
  name: string;
  cost_per_unit: number;
  currency: string;
}

function emptyDraft(): DraftProduct {
  return { name: '', cost_per_unit: 0, currency: 'RWF' };
}

const inp = 'w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors';

const PROD_COLS: ColDef[] = [
  { key: 'name',     label: 'Name',      defaultVisible: true },
  { key: 'cost',     label: 'Unit Cost', defaultVisible: true },
  { key: 'currency', label: 'Currency',  defaultVisible: true },
  { key: 'actions',  label: 'Actions',   defaultVisible: true },
];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selected, setSelected] = useState<Product | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [draft, setDraft] = useState<DraftProduct>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const { visible: colVis, toggle: colToggle } = useColumnVisibility('products', PROD_COLS);

  const load = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (typeFilter) params.type = typeFilter;
    const res = await apiListProducts(params);
    if (res.success) setProducts(res.data.products);
    setLoading(false);
  }, [search, typeFilter]);

  useEffect(() => { load(); }, [load]);

  function openNew() { setDraft(emptyDraft()); setSelected(null); setError(null); setModalMode('new'); }
  function openEdit(p: Product) {
    setDraft({ name: p.name, cost_per_unit: p.cost_per_unit, currency: p.currency });
    setSelected(p); setError(null); setModalMode('edit');
  }
  function openView(p: Product) { setSelected(p); setModalMode('view'); }

  async function handleDelete(id: string) {
    await apiDeleteProduct(id);
    setDeleteConfirm(null);
    setModalMode(null);
    load();
  }

  async function handleSave() {
    if (!draft.name.trim()) { setError('Product name is required.'); return; }
    if (draft.cost_per_unit <= 0) { setError('Unit cost must be greater than 0.'); return; }
    setSaving(true); setError(null);
    const res = modalMode === 'edit' && selected
      ? await apiUpdateProduct(selected._id, draft)
      : await apiCreateProduct(draft);
    setSaving(false);
    if (!res.success) { setError((res as any).message || 'Failed to save.'); return; }
    await load(); setModalMode(null);
  }

  const formContent = modalMode === 'view' && selected ? (
    <div className="space-y-5 pb-10">
      <section className="space-y-2">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Product Details</p>
        {([
          ['Name', selected.name],
          ['Unit Cost', `${selected.cost_per_unit.toLocaleString()} ${selected.currency}`],
          ['Currency', selected.currency],
        ] as [string, string][]).map(([l, v]) => (
          <div key={l} className="flex justify-between text-sm">
            <span className="text-t3">{l}</span>
            <span className="font-medium text-t1">{v}</span>
          </div>
        ))}
      </section>
      <div className="flex gap-2 pt-2">
        <button onClick={() => openEdit(selected)} className="flex-1 py-2.5 border border-accent text-accent rounded-xl text-sm font-bold hover:bg-accent/5 transition-all">Edit</button>
      </div>
      {deleteConfirm === selected._id ? (
        <div className="flex gap-2">
          <button onClick={() => handleDelete(selected._id)} className="flex-1 py-2.5 bg-rose-500 text-white rounded-xl text-sm font-bold hover:bg-rose-600 transition-all">Confirm Delete</button>
          <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 border border-border text-t2 rounded-xl text-sm font-bold hover:bg-surface transition-all">Cancel</button>
        </div>
      ) : (
        <button onClick={() => setDeleteConfirm(selected._id)} className="w-full py-2.5 border border-rose-500/30 text-rose-400 rounded-xl text-sm font-bold hover:bg-rose-500/10 transition-all flex items-center justify-center gap-2">
          <Trash size={14} /> Delete Product
        </button>
      )}
    </div>
  ) : (
    <div className="space-y-5 pb-10">
      <section className="space-y-3">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Product Details</p>
        <div>
          <label className="block text-[10px] text-t3 mb-1">Name *</label>
          <input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="e.g. Portland Cement" className={inp} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] text-t3 mb-1">Unit Cost *</label>
            <input type="number" min="0" step="0.01" value={draft.cost_per_unit} onChange={e => setDraft(d => ({ ...d, cost_per_unit: Number(e.target.value) }))} className={inp} />
          </div>
          <div>
            <label className="block text-[10px] text-t3 mb-1">Currency</label>
            <select value={draft.currency} onChange={e => setDraft(d => ({ ...d, currency: e.target.value }))} className={inp}>
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </section>
      {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-500">{error}</div>}
      <button onClick={handleSave} disabled={saving} className="w-full py-3 bg-accent text-white rounded-xl text-sm font-bold hover:bg-accent-h transition-all disabled:opacity-60 flex items-center justify-center gap-2">
        {saving && <Spinner size={14} className="animate-spin" />}
        {saving ? 'Saving...' : modalMode === 'edit' ? 'Update Product' : 'Add Product'}
      </button>
    </div>
  );

  const previewContent = selected ? (
    <div className="font-sans text-[#1a1a1a] space-y-6">
      <div className="flex justify-between items-start">
        <img src="/logo.jpg" alt="TEKACCESS" className="w-36 h-auto" />
        <div className="text-right text-[11px] text-gray-500">
          <p className="font-bold text-gray-800">PRODUCT RECORD</p>
          <p>{new Date().toLocaleDateString()}</p>
        </div>
      </div>
      <div>
        <h2 className="text-xl font-bold text-[#4285f4]">{selected.name}</h2>
      </div>
      <div className="grid grid-cols-2 gap-4 border-y border-gray-100 py-5 text-[12px]">
        {([['Unit Cost', `${selected.cost_per_unit.toLocaleString()} ${selected.currency}`], ['Currency', selected.currency]] as [string, string][]).map(([l, v]) => (
          <div key={l}>
            <p className="text-[10px] font-black text-gray-400 uppercase mb-0.5">{l}</p>
            <p className="font-bold text-gray-800">{v}</p>
          </div>
        ))}
      </div>
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center py-20 text-gray-300">
      <Package size={60} weight="duotone" />
      <p className="text-sm mt-3">Select or create a product</p>
    </div>
  );

  const totalProducts = products.length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-t1">Products</h1>
          <p className="text-sm text-t3 mt-0.5">Product catalog — define types and unit pricing</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-h transition-colors">
          <Plus size={15} weight="bold" /> Add Product
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Total Products', value: totalProducts, Icon: Package, color: 'text-accent', bg: 'bg-accent-glow' },
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

      <div className="bg-card rounded-xl border border-border">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
          <div className="relative flex-1 min-w-[200px]">
            <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
            <input type="text" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-surface text-t1 placeholder-t3 outline-none focus:border-accent transition-colors" />
          </div>
          <ColumnSelector cols={PROD_COLS} visible={colVis} onToggle={colToggle} />
        </div>

        <OverlayScrollbarsComponent options={{ scrollbars: { autoHide: 'never' } }} defer>
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-surface">
              <tr>
                {colVis.has('name') && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Name</th>}
                {colVis.has('cost') && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Unit Cost</th>}
                {colVis.has('currency') && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Currency</th>}
                {colVis.has('actions') && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap"></th>}
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border-s">
              {loading ? (
                <tr><td colSpan={colVis.size} className="px-4 py-16 text-center"><Spinner size={24} className="animate-spin text-t3 mx-auto" /></td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={colVis.size} className="px-4 py-16 text-center text-sm text-t3">
                  <div className="flex flex-col items-center gap-3">
                    <Package size={40} weight="duotone" className="text-t3/40" />
                    <p>No products found.</p>
                    <button onClick={openNew} className="text-accent font-semibold hover:underline">Add first product</button>
                  </div>
                </td></tr>
              ) : products.map(p => (
                <tr key={p._id} className="hover:bg-surface cursor-pointer transition-colors" onClick={() => openView(p)}>
                  {colVis.has('name') && <td className="px-4 py-3 text-sm font-medium text-t1">{p.name}</td>}
                  {colVis.has('cost') && <td className="px-4 py-3 text-sm font-bold text-t1">{p.cost_per_unit.toLocaleString()}</td>}
                  {colVis.has('currency') && <td className="px-4 py-3 text-sm text-t3">{p.currency}</td>}
                  {colVis.has('actions') && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={e => { e.stopPropagation(); openView(p); }} className="p-1.5 text-t3 hover:text-accent hover:bg-accent-glow rounded-lg transition-colors"><Eye size={14} weight="duotone" /></button>
                        <button onClick={e => { e.stopPropagation(); openEdit(p); }} className="p-1.5 text-t3 hover:text-t1 hover:bg-surface rounded-lg transition-colors"><PencilSimple size={14} weight="duotone" /></button>
                        {deleteConfirm === p._id ? (
                          <>
                            <button onClick={e => { e.stopPropagation(); handleDelete(p._id); }} className="text-[10px] font-bold px-2 py-1 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors">Yes</button>
                            <button onClick={e => { e.stopPropagation(); setDeleteConfirm(null); }} className="text-[10px] px-2 py-1 border border-border rounded-lg text-t3 hover:bg-surface transition-colors">No</button>
                          </>
                        ) : (
                          <button onClick={e => { e.stopPropagation(); setDeleteConfirm(p._id); }} className="p-1.5 text-t3 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"><Trash size={14} weight="duotone" /></button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {products.length > 0 && <div className="px-4 py-3 border-t border-border text-xs text-t3">{products.length} products</div>}
        </OverlayScrollbarsComponent>
      </div>

      <DocumentSidePanel
        isOpen={modalMode !== null}
        onClose={() => { setModalMode(null); setSelected(null); setError(null); }}
        title={modalMode === 'new' ? 'Add Product' : modalMode === 'edit' ? `Edit — ${selected?.name}` : selected?.name || ''}
        footerInfo={selected ? `${selected.type} · ${selected.currency}` : 'New product'}
        formContent={formContent}
        previewContent={previewContent}
      />
    </div>
  );
}
