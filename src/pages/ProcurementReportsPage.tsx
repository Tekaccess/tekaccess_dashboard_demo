import React, { useState, useEffect } from 'react';
import { Spinner, ShoppingCart, Handshake, Boat, Gear, Warning } from '@phosphor-icons/react';
import { apiGetProcurementSummary } from '../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const chartTooltipStyle = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 12 };

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
    status: d._id.replace('_', ' '),
    count: d.count,
    value: Math.round(d.value / 1000),
  }));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-t1">Procurement Reports</h1>
        <p className="text-sm text-t3 mt-0.5">Overview of procurement activity</p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Active POs', value: s.activePOs, Icon: ShoppingCart, color: 'text-accent' },
          { label: 'Draft POs', value: s.draftPOs, Icon: ShoppingCart, color: 'text-t3' },
          { label: 'Active Suppliers', value: s.activeSuppliers, Icon: Handshake, color: 'text-emerald-400' },
          { label: 'Spare Part Alerts', value: s.sparePartAlerts, Icon: Gear, color: 'text-rose-400' },
        ].map(({ label, value, Icon, color }) => (
          <div key={label} className="bg-surface border border-border rounded-lg p-4 flex items-center gap-3">
            <Icon size={24} className={color} />
            <div>
              <p className="text-xs text-t3">{label}</p>
              <p className="text-2xl font-bold text-t1">{value ?? 0}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Shipments strip */}
        <div className="bg-surface border border-border rounded-lg p-4">
          <p className="text-sm font-semibold text-t1 mb-4">Shipments Status</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'In Transit', value: s.shipmentsInTransit, color: 'text-blue-400' },
              { label: 'At Customs', value: s.shipmentsAtCustoms, color: 'text-amber-500' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-bg rounded p-3 border border-border/50">
                <p className="text-xs text-t3">{label}</p>
                <p className={`text-xl font-bold ${color}`}>{value ?? 0}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Active PO value */}
        <div className="bg-surface border border-border rounded-lg p-4">
          <p className="text-sm font-semibold text-t1 mb-1">Active PO Value</p>
          <p className="text-3xl font-bold text-accent">
            {s.activePoValue >= 1_000_000
              ? `${(s.activePoValue / 1_000_000).toFixed(2)}M`
              : `${(s.activePoValue / 1_000).toFixed(0)}K`}
          </p>
          <p className="text-xs text-t3 mt-1">Across approved, sent & partially received POs</p>
        </div>
      </div>

      {/* PO by status chart */}
      {chartData.length > 0 && (
        <div className="bg-surface border border-border rounded-lg p-4">
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
