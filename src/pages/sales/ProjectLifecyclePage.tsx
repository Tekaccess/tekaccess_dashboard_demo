import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import {
  Spinner, ArrowLeft, Receipt, Boat, Truck, Package, FileText,
  CurrencyCircleDollar, CheckCircle, Warning, ChartLineUp,
} from '@phosphor-icons/react';
import {
  apiGetContractLifecycle, apiListContracts, apiDraftPOFromContract,
  apiListSuppliers, ContractLifecycle,
} from '../../lib/api';

function fmtMoney(n: number, ccy = 'USD') {
  if (n == null) return '—';
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M ${ccy}`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K ${ccy}`;
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${ccy}`;
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString();
}

const STATUS_TONE: Record<string, string> = {
  draft: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  active: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  partially_delivered: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  completed: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  closed: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
  paid: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  issued: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  partially_paid: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  overdue: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  in_transit: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  received: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  pending_confirmation: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  confirmed: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  fully_received: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  approved: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  scheduled: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
};

function Badge({ status }: { status: string }) {
  const tone = STATUS_TONE[status] || 'text-t3 bg-surface border-border';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${tone}`}>
      {status}
    </span>
  );
}

function DraftPoButton({
  contractId, contractRef, onCreated,
}: { contractId: string; contractRef: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<{ _id: string; name: string }[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleOpen() {
    setOpen(true);
    if (suppliers.length === 0) {
      const res = await apiListSuppliers();
      if (res.success) setSuppliers(res.data.suppliers.map((s: any) => ({ _id: s._id, name: s.name })));
    }
  }

  async function handleCreate() {
    const supplier = suppliers.find(s => s._id === supplierId);
    if (!supplier) { setError('Pick a supplier'); return; }
    setSubmitting(true); setError(null);
    const res = await apiDraftPOFromContract(contractId, {
      supplierId: supplier._id,
      supplierName: supplier.name,
    });
    setSubmitting(false);
    if (!res.success) {
      setError((res as any).message || 'Failed');
      return;
    }
    setOpen(false);
    onCreated();
  }

  if (!open) {
    return (
      <button onClick={handleOpen}
        className="w-full mt-2 px-3 py-2 border border-dashed border-border rounded-lg text-xs text-t3 hover:text-t1 hover:border-accent transition-all">
        + Draft a PO from this contract (handoff to Procurement)
      </button>
    );
  }
  return (
    <div className="mt-2 p-3 bg-surface border border-border rounded-lg space-y-2">
      <p className="text-xs font-bold text-t1">Draft PO from {contractRef}</p>
      <p className="text-[10px] text-t3">Pick a supplier. Procurement will fill in unit prices.</p>
      <select className="w-full px-2 py-1.5 bg-card border border-border rounded text-sm text-t1"
        value={supplierId} onChange={e => setSupplierId(e.target.value)}>
        <option value="">— select supplier —</option>
        {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
      </select>
      {error && <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded text-xs text-rose-400">{error}</div>}
      <div className="flex gap-2">
        <button onClick={handleCreate} disabled={submitting || !supplierId}
          className="flex-1 py-1.5 bg-accent text-white rounded text-xs font-bold disabled:opacity-60">
          {submitting ? 'Creating…' : 'Create draft PO'}
        </button>
        <button onClick={() => setOpen(false)} className="px-3 py-1.5 border border-border rounded text-xs text-t2">
          Cancel
        </button>
      </div>
    </div>
  );
}

function Stage({
  title, count, icon: Icon, color, children,
}: {
  title: string; count: number;
  icon: React.ComponentType<any>; color: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card rounded-xl border border-border overflow-hidden">
      <header className={`flex items-center justify-between px-4 py-3 border-b border-border ${color}`}>
        <div className="flex items-center gap-2">
          <Icon size={18} weight="duotone" />
          <h3 className="text-sm font-bold uppercase tracking-wide">{title}</h3>
        </div>
        <span className="text-xs font-bold text-t3">{count} record{count === 1 ? '' : 's'}</span>
      </header>
      <div className="p-4">
        {count === 0 ? (
          <p className="text-sm text-t3 text-center py-3">No {title.toLowerCase()} yet for this contract.</p>
        ) : children}
      </div>
    </section>
  );
}

export default function ProjectLifecyclePage() {
  const params = useParams({ strict: false }) as { contractId?: string };
  const navigate = useNavigate();
  const [data, setData] = useState<ContractLifecycle | null>(null);
  const [loading, setLoading] = useState(true);
  const [picker, setPicker] = useState<{ contractRef: string; _id: string; clientName: string }[]>([]);

  useEffect(() => {
    (async () => {
      if (!params.contractId) {
        // No contract picked: load list of contracts so the user can choose
        const res = await apiListContracts({ contractType: 'client', limit: '100' });
        if (res.success) setPicker(res.data.contracts.map((c: any) => ({ _id: c._id, contractRef: c.contractRef, clientName: c.clientName })));
        setLoading(false);
        return;
      }
      setLoading(true);
      const res = await apiGetContractLifecycle(params.contractId);
      if (res.success) setData(res.data);
      setLoading(false);
    })();
  }, [params.contractId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size={32} className="animate-spin text-accent" />
      </div>
    );
  }

  if (!params.contractId) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-t1">Project Lifecycle</h1>
        <p className="text-sm text-t3">Pick a contract to see its full lifecycle: POs, shipments, trips, deliveries, invoices, and live margin.</p>
        <div className="bg-card rounded-xl border border-border divide-y divide-border">
          {picker.length === 0 && <p className="p-4 text-sm text-t3">No client contracts found.</p>}
          {picker.map(c => (
            <button key={c._id} onClick={() => navigate({ to: `/sales/projects/${c._id}` })}
              className="w-full text-left px-4 py-3 hover:bg-surface flex items-center justify-between transition-colors">
              <div>
                <div className="text-sm font-bold text-t1">{c.contractRef}</div>
                <div className="text-xs text-t3">{c.clientName}</div>
              </div>
              <span className="text-xs text-accent">View →</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="text-center text-t3 py-12">Contract not found.</div>;
  }

  const { contract, lifecycle, margin, counts } = data;
  const dp = contract.deliveryProgress || {};

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <button onClick={() => navigate({ to: '/sales/projects' })}
        className="inline-flex items-center gap-1 text-sm text-t3 hover:text-t1 transition-colors">
        <ArrowLeft size={14} /> All projects
      </button>

      {/* Header */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-t1">{contract.title}</h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-t3">
              <span className="font-mono text-accent">{contract.contractRef}</span>
              <span>·</span>
              <span>{contract.clientName}</span>
              <Badge status={contract.status} />
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-t3 uppercase font-bold">Contract value</div>
            <div className="text-2xl font-bold text-t1">{fmtMoney(contract.totalContractValue, contract.currency)}</div>
            <div className="text-xs text-t3">{contract.totalCommittedTons} tons committed</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-t3 mb-1">
            <span>Delivery progress</span>
            <span className="font-bold text-t1">{(dp.pctComplete || 0).toFixed(1)}%</span>
          </div>
          <div className="w-full h-2 bg-surface rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, dp.pctComplete || 0)}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-t3 mt-1">
            <span>{dp.deliveredTons || 0} t delivered</span>
            <span>{dp.remainingTons ?? '—'} t remaining</span>
          </div>
        </div>
      </div>

      {/* Live margin card */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 mb-3">
          <ChartLineUp size={18} weight="duotone" className="text-accent" />
          <h3 className="text-sm font-bold uppercase tracking-wide text-t1">Live Margin</h3>
          <span className="text-[10px] text-t3 ml-auto">recomputed on every load</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-surface rounded-lg p-3 border border-border">
            <p className="text-[10px] uppercase font-bold text-t3">Revenue (invoiced)</p>
            <p className="text-lg font-bold text-emerald-400">{fmtMoney(margin.totalRevenue, contract.currency)}</p>
          </div>
          <div className="bg-surface rounded-lg p-3 border border-border">
            <p className="text-[10px] uppercase font-bold text-t3">Procurement cost</p>
            <p className="text-lg font-bold text-rose-400">{fmtMoney(margin.totalProcurementCost, contract.currency)}</p>
          </div>
          <div className="bg-surface rounded-lg p-3 border border-border">
            <p className="text-[10px] uppercase font-bold text-t3">Transport cost</p>
            <p className="text-lg font-bold text-rose-400">{fmtMoney(margin.totalTransportCost, contract.currency)}</p>
          </div>
          <div className="bg-surface rounded-lg p-3 border border-border">
            <p className="text-[10px] uppercase font-bold text-t3">Gross profit</p>
            <p className={`text-lg font-bold ${margin.grossProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {fmtMoney(margin.grossProfit, contract.currency)}
            </p>
          </div>
          <div className="bg-surface rounded-lg p-3 border border-border">
            <p className="text-[10px] uppercase font-bold text-t3">Margin %</p>
            <p className={`text-lg font-bold ${(margin.marginPct ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {margin.marginPct == null ? '—' : `${margin.marginPct}%`}
            </p>
          </div>
        </div>
      </div>

      {/* Pipeline stages */}
      <Stage title="Purchase Orders" count={counts.purchaseOrders} icon={Receipt} color="bg-amber-500/5">
        <div className="space-y-2">
          {lifecycle.purchaseOrders.map(p => (
            <div key={p._id} className="flex items-center justify-between p-3 bg-surface border border-border rounded-lg">
              <div>
                <div className="font-mono text-xs text-accent font-bold">{p.poRef}</div>
                <div className="text-xs text-t3">{p.supplierName} · {p.recipientType}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-t1">{fmtMoney(p.totalValueWithTax, p.currency)}</div>
                <div className="text-[10px] text-t3">{p.totalReceivedQty}/{p.totalOrderedQty}</div>
              </div>
              <Badge status={p.status} />
            </div>
          ))}
          <DraftPoButton contractId={contract._id} contractRef={contract.contractRef}
            onCreated={() => window.location.reload()} />
        </div>
      </Stage>

      <Stage title="Shipments" count={counts.shipments} icon={Boat} color="bg-blue-500/5">
        <div className="space-y-2">
          {lifecycle.shipments.map(s => (
            <div key={s._id} className="flex items-center justify-between p-3 bg-surface border border-border rounded-lg">
              <div>
                <div className="font-mono text-xs text-accent font-bold">{s.shipmentRef}</div>
                <div className="text-xs text-t3">{s.supplierName} · PO {s.poRef}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-t1">{s.quantity} {s.unit}</div>
                <div className="text-[10px] text-t3">ETA {fmtDate(s.estimatedArrivalDate)}</div>
              </div>
              <Badge status={s.status} />
            </div>
          ))}
        </div>
      </Stage>

      <Stage title="Trips" count={counts.trips} icon={Truck} color="bg-orange-500/5">
        <div className="space-y-2">
          {lifecycle.trips.map(t => (
            <div key={t._id} className="flex items-center justify-between p-3 bg-surface border border-border rounded-lg">
              <div>
                <div className="font-mono text-xs text-accent font-bold">{t.tripRef}</div>
                <div className="text-xs text-t3">{t.truckPlate} · {t.driverName}</div>
                <div className="text-[10px] text-t3">{t.loadingSiteName} → {t.offloadingSiteName}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-t1">{t.actualTons ?? t.plannedTons} t</div>
                {t.costs?.totalCost != null && (
                  <div className="text-[10px] text-t3">{fmtMoney(t.costs.totalCost)} cost</div>
                )}
              </div>
              <Badge status={t.status} />
            </div>
          ))}
        </div>
      </Stage>

      <Stage title="Deliveries" count={counts.deliveries} icon={Package} color="bg-emerald-500/5">
        <div className="space-y-2">
          {lifecycle.deliveries.map(d => (
            <div key={d._id} className="flex items-center justify-between p-3 bg-surface border border-border rounded-lg">
              <div>
                <div className="font-mono text-xs text-accent font-bold">{d.deliveryRef}</div>
                <div className="text-xs text-t3">Trip {d.tripRef} · {d.truckPlate}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-t1">{d.confirmedTons ?? d.plannedTons} t</div>
                <div className="text-[10px] text-t3">{fmtDate(d.deliveryDate)}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge status={d.status} />
                {d.invoiceRaised && (
                  <span className="text-[10px] text-emerald-400 inline-flex items-center gap-1">
                    <CheckCircle size={9} weight="fill" /> invoiced
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Stage>

      <Stage title="Invoices" count={counts.invoices} icon={FileText} color="bg-purple-500/5">
        <div className="space-y-2">
          {lifecycle.invoices.map(i => (
            <div key={i._id} className="flex items-center justify-between p-3 bg-surface border border-border rounded-lg">
              <div>
                <div className="font-mono text-xs text-accent font-bold">{i.invoiceRef}</div>
                <div className="text-xs text-t3">Delivery {i.deliveryRef}</div>
                <div className="text-[10px] text-t3">Due {fmtDate(i.dueDate)}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-t1">{fmtMoney(i.totalAmount)}</div>
                <div className="text-[10px] text-emerald-400">received {fmtMoney(i.totalReceived)}</div>
                <div className="text-[10px] text-amber-400">outstanding {fmtMoney(i.outstandingAmount)}</div>
              </div>
              <Badge status={i.status} />
            </div>
          ))}
        </div>
      </Stage>

      <Stage title="Payables (supplier bills)" count={counts.payables} icon={CurrencyCircleDollar} color="bg-rose-500/5">
        <div className="space-y-2">
          {lifecycle.payables.map(p => (
            <div key={p._id} className="flex items-center justify-between p-3 bg-surface border border-border rounded-lg">
              <div>
                <div className="font-mono text-xs text-accent font-bold">{p.payableRef}</div>
                <div className="text-xs text-t3">{p.supplierName} · PO {p.purchaseOrderRef}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-t1">{fmtMoney(p.totalAmount)}</div>
                <div className="text-[10px] text-amber-400">outstanding {fmtMoney(p.outstandingAmount)}</div>
              </div>
              <Badge status={p.status} />
            </div>
          ))}
        </div>
      </Stage>
    </div>
  );
}
