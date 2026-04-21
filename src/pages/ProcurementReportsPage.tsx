import React, { useState, useEffect } from 'react';
import { Spinner, ShoppingCart, Handshake, Boat, Gear, Warning } from '@phosphor-icons/react';
import { apiGetProcurementSummary } from '../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const chartTooltipStyle = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 };

export default function ProcurementReportsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGetProcurementSummary().then(res => {
      if (res.success) setSummary(res.data);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <Spinner size={28} className="animate-spin text-accent" />
    </div>
  );

  const s = summary?.summary ?? {};
  const chartData = (summary?.poByStatus ?? []).map((d: any) => ({
    status: d._id.replace(/_/g, ' '),
    count: d.count,
    value: Math.round(d.value / 1000),
  }));

  const kpiCards = [
    { label: 'Active POs', value: s.activePOs ?? 0, Icon: ShoppingCart, bg: 'bg-accent-glow', color: 'text-accent' },
    { label: 'Draft POs', value: s.draftPOs ?? 0, Icon: ShoppingCart, bg: 'bg-surface', color: 'text-t3' },
    { label: 'Active Suppliers', value: s.activeSuppliers ?? 0, Icon: Handshake, bg: 'bg-emerald-500/10', color: 'text-emerald-400' },
    { label: 'Spare Part Alerts', value: s.sparePartAlerts ?? 0, Icon: Warning, bg: 'bg-rose-500/10', color: 'text-rose-400' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-t1">Procurement Reports</h1>
        <p className="text-sm text-t3 mt-1">Overview of procurement activity</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpiCards.map(({ label, value, Icon, bg, color }) => (
          <div key={label} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
            <div className={`p-2.5 rounded-xl ${bg} shrink-0`}>
              <Icon size={18} weight="duotone" className={color} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-t3">{label}</p>
              <p className="text-xl font-bold text-t1">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Shipments Status */}
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-sm font-semibold text-t1 mb-4">Shipments Status</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'In Transit', value: s.shipmentsInTransit ?? 0, Icon: Boat, bg: 'bg-blue-500/10', color: 'text-blue-400' },
              { label: 'At Customs', value: s.shipmentsAtCustoms ?? 0, Icon: Gear, bg: 'bg-amber-500/10', color: 'text-amber-500' },
            ].map(({ label, value, Icon, bg, color }) => (
              <div key={label} className="bg-surface rounded-xl border border-border p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${bg} shrink-0`}>
                  <Icon size={16} weight="duotone" className={color} />
                </div>
                <div>
                  <p className="text-xs text-t3">{label}</p>
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active PO Value */}
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-sm font-semibold text-t1 mb-1">Active PO Value</p>
          <p className="text-4xl font-bold text-accent mt-3">
            {(s.activePoValue ?? 0) >= 1_000_000
              ? `${((s.activePoValue ?? 0) / 1_000_000).toFixed(2)}M`
              : `${((s.activePoValue ?? 0) / 1_000).toFixed(0)}K`}
          </p>
          <p className="text-xs text-t3 mt-2">Across approved, sent &amp; partially received POs</p>
        </div>
      </div>

      {/* PO by Status Chart */}
      {chartData.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-sm font-semibold text-t1 mb-4">Purchase Orders by Status</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="status" tick={{ fill: 'var(--color-t3)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--color-t3)', fontSize: 11 }} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="count" fill="var(--color-accent)" radius={[4, 4, 0, 0]} name="PO Count" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
