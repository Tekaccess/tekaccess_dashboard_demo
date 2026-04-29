import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Spinner } from '@phosphor-icons/react';
import { apiCreateSupplier, Supplier, Warehouse } from '../lib/api';
import SearchSelect, { SearchSelectOption } from './ui/SearchSelect';

interface QuickAddSupplierProps {
  onClose: () => void;
  onCreated: (supplier: Supplier) => void;
  warehouses: Warehouse[];
}

export default function QuickAddSupplier({ onClose, onCreated, warehouses }: QuickAddSupplierProps) {
  const [form, setForm] = useState({
    name: '',
    mineWarehouseId: '',
    mineWarehouseName: '',
    crushingWarehouseId: '',
    crushingWarehouseName: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    country: 'Rwanda',
    currency: 'USD',
    creditTermsDays: 30,
    taxId: '',
    isCritical: false,
  });

  const warehouseOptions = useMemo<SearchSelectOption[]>(
    () => warehouses.map(w => ({ value: w._id, label: w.name, sublabel: w.warehouseCode })),
    [warehouses],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: string, value: any) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Supplier name is required.'); return; }

    setSaving(true);
    setError(null);
    const res = await apiCreateSupplier(form as any);
    setSaving(false);

    if (!res.success) { setError((res as any).message || 'Failed to create supplier.'); return; }
    onCreated(res.data.supplier);
  }

  const inputClass = "w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors";

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-lg border border-border overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-sm font-bold text-t1">Add New Supplier</h2>
          <button onClick={onClose} className="text-t3 hover:text-t1 transition-colors">
            <X size={18} weight="bold" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-[10px] text-t3 mb-1">Supplier Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Company name" className={inputClass} />
          </div>

          <div>
            <label className="block text-[10px] text-t3 mb-1">Tax ID</label>
            <input
              value={form.taxId}
              onChange={e => set('taxId', e.target.value)}
              placeholder="TIN / VAT registration"
              className={inputClass}
            />
          </div>

          <SearchSelect
            label="Warehouse / Mine"
            options={warehouseOptions}
            value={form.mineWarehouseId || null}
            onChange={(val, opt) => {
              setForm(prev => ({
                ...prev,
                mineWarehouseId: val || '',
                mineWarehouseName: opt?.label || '',
              }));
            }}
            placeholder="Extraction site — auto-fills PO destination..."
          />

          <SearchSelect
            label="Warehouse / Crushing Point"
            options={warehouseOptions}
            value={form.crushingWarehouseId || null}
            onChange={(val, opt) => {
              setForm(prev => ({
                ...prev,
                crushingWarehouseId: val || '',
                crushingWarehouseName: opt?.label || '',
              }));
            }}
            placeholder="Processing / crushing site..."
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-t3 mb-1">Contact Name</label>
              <input value={form.contactName} onChange={e => set('contactName', e.target.value)} placeholder="Full name" className={inputClass} />
            </div>
            <div>
              <label className="block text-[10px] text-t3 mb-1">Phone</label>
              <input value={form.contactPhone} onChange={e => set('contactPhone', e.target.value)} placeholder="+250..." className={inputClass} />
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-t3 mb-1">Email</label>
            <input type="email" value={form.contactEmail} onChange={e => set('contactEmail', e.target.value)} placeholder="contact@company.com" className={inputClass} />
          </div>

          <div>
            <label className="block text-[10px] text-t3 mb-1">Address</label>
            <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Street address" className={inputClass} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] text-t3 mb-1">Country</label>
              <input value={form.country} onChange={e => set('country', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-[10px] text-t3 mb-1">Currency</label>
              <select value={form.currency} onChange={e => set('currency', e.target.value)} className={inputClass}>
                <option value="USD">USD</option>
                <option value="RWF">RWF</option>
                <option value="KES">KES</option>
                <option value="UGX">UGX</option>
                <option value="TZS">TZS</option>
                <option value="BIF">BIF</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-t3 mb-1">Credit Days</label>
              <input type="number" value={form.creditTermsDays} onChange={e => set('creditTermsDays', Number(e.target.value))} className={inputClass} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-t2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isCritical}
              onChange={e => set('isCritical', e.target.checked)}
              className="rounded border-border"
            />
            Mark as critical (can halt operations if unpaid)
          </label>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-500">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium text-t2 hover:bg-surface transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-accent text-white rounded-xl text-sm font-bold hover:bg-accent-h transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving && <Spinner size={14} className="animate-spin" />}
              {saving ? 'Saving...' : 'Add Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
