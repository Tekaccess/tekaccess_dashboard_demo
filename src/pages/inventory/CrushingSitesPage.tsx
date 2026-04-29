import React, { useEffect, useState, useCallback } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import { Hammer, Buildings, ArrowRight, Spinner, Plus, Info } from '@phosphor-icons/react';
import { useNavigate } from '@tanstack/react-router';
import { apiListWarehouses, Warehouse, warehouseUsedPct } from '../../lib/api';

export default function CrushingSitesPage() {
  const navigate = useNavigate();
  const [sites, setSites] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiListWarehouses({ siteType: 'crushing_site' });
    if (res.success) setSites(res.data.warehouses);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
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
          onClick={() => navigate({ to: '/inventory/warehouses' })}
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
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Spinner size={28} className="animate-spin text-accent" />
          </div>
        ) : sites.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-56 text-t3 px-4 text-center">
            <Hammer size={40} weight="duotone" className="mb-2 opacity-40" />
            <p className="text-sm font-medium text-t2">No Crushing Sites yet</p>
            <p className="text-xs mt-1 max-w-sm">
              Create one from the Warehouses page — choose <span className="font-semibold">Site Role: Crushing Site</span>.
            </p>
            <button
              onClick={() => navigate({ to: '/inventory/warehouses' })}
              className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-medium hover:bg-accent-h transition-colors"
            >
              Go to Warehouses
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
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sites.map(s => {
                  const used = warehouseUsedPct(s);
                  return (
                    <tr
                      key={s._id}
                      className="hover:bg-surface transition-colors cursor-pointer"
                      onClick={() => navigate({ to: '/inventory/warehouses' })}
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </OverlayScrollbarsComponent>
        )}
      </div>
    </div>
  );
}
