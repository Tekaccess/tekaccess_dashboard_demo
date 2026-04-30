import React, { useState, useEffect } from 'react';
import {
  Truck, Lightning, Wrench, MapPin, GasPump,
  ShoppingCart, Handshake, Boat, Gear, Warning,
  FileText, Checks, Package, Buildings, ArrowUp, ArrowDown,
  Spinner, ChartBar, ArrowsClockwise, Hourglass,
  BriefcaseMetal, Clock, Receipt, ArrowRight,
} from '@phosphor-icons/react';
import { useNavigate } from '@tanstack/react-router';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts';
import {
  apiGetTransportSummary, apiListTrips, apiListFuelLogs, apiListMaintenanceRecords,
  apiGetProcurementSummary, apiGetTransportersSummary,
  apiGetContractsSummary, apiGetDeliveriesSummary,
  apiGetInventorySummary, apiListSites, apiListProjects,
  Trip, FuelLog, MaintenanceRecord, Site, Project,
} from '../lib/api';

interface DashboardProps {
  currentDepartmentId: string;
}

// ─── Shared Styles ────────────────────────────────────────────────────────────

const tooltipStyle = {
  background: 'var(--color-card)',
  border: '1px solid var(--color-border)',
  borderRadius: 12,
  fontSize: 12,
  color: 'var(--color-t1)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
};

function SectionSpinner() {
  return (
    <div className="flex items-center justify-center h-48">
      <Spinner size={28} className="animate-spin text-accent" />
    </div>
  );
}

function KpiCard({
  label, value, Icon, bg, color, sub,
}: {
  label: string; value: string | number; Icon: any; bg: string; color: string; sub?: string;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
      <div className={`p-2.5 rounded-xl ${bg} shrink-0`}>
        <Icon size={18} weight="duotone" className={color} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-t3">{label}</p>
        <p className="text-xl font-bold text-t1 leading-tight">{value}</p>
        {sub && <p className="text-xs text-t3 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function ChartCard({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card rounded-xl border border-border p-5 ${className}`}>
      <p className="text-sm font-semibold text-t1 mb-4">{title}</p>
      {children}
    </div>
  );
}

const ROUNDING = [4, 4, 0, 0] as [number, number, number, number];

// ─── Transport Dashboard ───────────────────────────────────────────────────────

function groupFuelByMonth(logs: FuelLog[]) {
  const map: Record<string, number> = {};
  logs.forEach(l => {
    const d = new Date(l.logDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    map[key] = (map[key] ?? 0) + l.totalCost;
  });
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([month, cost]) => ({ month: month.slice(5), cost: Math.round(cost) }));
}

function countByField<T>(arr: T[], key: keyof T): Record<string, number> {
  const map: Record<string, number> = {};
  arr.forEach(item => {
    const v = String(item[key]);
    map[v] = (map[v] ?? 0) + 1;
  });
  return map;
}

const FLEET_COLORS: Record<string, string> = {
  operating: '#10b981',
  idle: '#f59e0b',
  maintenance: '#f43f5e',
  decommissioned: '#9ca3af',
};

const TRIP_COLORS: Record<string, string> = {
  completed: '#10b981',
  in_progress: '#3b82f6',
  scheduled: '#f59e0b',
  cancelled: '#f43f5e',
};

function TransportDashboard() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);

  useEffect(() => {
    Promise.all([
      apiGetTransportSummary(),
      apiListTrips({ limit: '200' }),
      apiListFuelLogs({ limit: '200' }),
      apiListMaintenanceRecords({ limit: '200' }),
    ]).then(([sumRes, tripRes, fuelRes, maintRes]) => {
      if (sumRes.success) setSummary(sumRes.data.summary);
      if (tripRes.success) setTrips(tripRes.data.trips);
      if (fuelRes.success) setFuelLogs(fuelRes.data.logs);
      if (maintRes.success) setMaintenanceRecords(maintRes.data.records);
      setLoading(false);
    });
  }, []);

  if (loading) return <SectionSpinner />;

  const s = summary ?? {};
  const maintPct = s.totalTrucks > 0 ? Math.round((s.inMaintenance / s.totalTrucks) * 100) : 0;

  const fleetDonut = [
    { name: 'Operating', value: s.operating ?? 0 },
    { name: 'Idle', value: s.idle ?? 0 },
    { name: 'Maintenance', value: s.inMaintenance ?? 0 },
    { name: 'Decommissioned', value: s.totalTrucks - (s.operating + s.idle + s.inMaintenance) > 0
        ? s.totalTrucks - (s.operating + s.idle + s.inMaintenance) : 0 },
  ].filter(d => d.value > 0);

  const tripStatusMap = countByField(trips, 'status');
  const tripBars = Object.entries(tripStatusMap).map(([status, count]) => ({
    status: status.replace(/_/g, ' '),
    count,
    fill: TRIP_COLORS[status] ?? '#6366f1',
  }));

  const fuelTrend = groupFuelByMonth(fuelLogs);

  const maintTypeMap = countByField(maintenanceRecords, 'maintenanceType');
  const maintBars = Object.entries(maintTypeMap).map(([type, count]) => ({
    type: type.charAt(0).toUpperCase() + type.slice(1),
    count,
    fill: type === 'emergency' ? '#f43f5e' : type === 'corrective' ? '#f59e0b' : '#10b981',
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard label="Total Fleet" value={s.totalTrucks ?? 0} Icon={Truck} bg="bg-accent-glow" color="text-accent" />
        <KpiCard label="Operating" value={s.operating ?? 0} Icon={Lightning} bg="bg-emerald-500/10" color="text-emerald-400" />
        <KpiCard label="In Maintenance" value={s.inMaintenance ?? 0} Icon={Wrench}
          bg={maintPct > 20 ? 'bg-rose-500/10' : 'bg-amber-500/10'}
          color={maintPct > 20 ? 'text-rose-400' : 'text-amber-500'}
          sub={maintPct > 20 ? `${maintPct}% — high!` : `${maintPct}%`}
        />
        <KpiCard label="Active Trips" value={s.activeTrips ?? 0} Icon={MapPin} bg="bg-blue-500/10" color="text-blue-400" />
        <KpiCard label="Shunting" value={s.shuntingTrips ?? 0} Icon={ArrowsClockwise}
          bg={(s.shuntingTrips ?? 0) > 0 ? 'bg-orange-500/10' : 'bg-surface'}
          color={(s.shuntingTrips ?? 0) > 0 ? 'text-orange-400' : 'text-t3'}
          sub="on-site moves"
        />
        <KpiCard label="Total Fuel Cost" value={
          (s.totalFuelCost ?? 0) >= 1_000_000
            ? `${((s.totalFuelCost ?? 0) / 1_000_000).toFixed(1)}M`
            : (s.totalFuelCost ?? 0) >= 1_000
            ? `${Math.round((s.totalFuelCost ?? 0) / 1000)}K`
            : (s.totalFuelCost ?? 0).toLocaleString()
        } Icon={GasPump} bg="bg-purple-500/10" color="text-purple-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Fleet Status">
          {fleetDonut.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={fleetDonut} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                  {fleetDonut.map((entry, i) => (
                    <Cell key={i} fill={FLEET_COLORS[entry.name.toLowerCase()] ?? '#6366f1'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: 'var(--color-t2)' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-t3 text-center py-12">No fleet data available</p>
          )}
        </ChartCard>

        <ChartCard title="Trip Status Distribution">
          {tripBars.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={tripBars} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="status" tick={{ fill: 'var(--color-t3)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--color-t3)', fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" radius={ROUNDING} name="Trips">
                  {tripBars.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-t3 text-center py-12">No trips data available</p>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Monthly Fuel Cost Trend">
          {fuelTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={fuelTrend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="fuelGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--color-t3)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--color-t3)', fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v.toLocaleString()}`, 'Fuel Cost']} />
                <Area type="monotone" dataKey="cost" stroke="var(--color-accent)" strokeWidth={2} fill="url(#fuelGrad)" name="Cost" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-t3 text-center py-12">No fuel log data available</p>
          )}
        </ChartCard>

        <ChartCard title="Maintenance by Type">
          {maintBars.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={maintBars} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="type" tick={{ fill: 'var(--color-t3)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--color-t3)', fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" radius={ROUNDING} name="Records">
                  {maintBars.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-t3 text-center py-12">No maintenance data available</p>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

// ─── Procurement Dashboard ─────────────────────────────────────────────────────

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return value.toLocaleString();
}

function ActionCard({
  label, count, sub, Icon, tone, onClick,
}: {
  label: string;
  count: number;
  sub?: string;
  Icon: any;
  tone: 'amber' | 'rose' | 'emerald' | 'blue';
  onClick: () => void;
}) {
  const TONES: Record<typeof tone, { bg: string; ring: string; text: string; dot: string }> = {
    amber:   { bg: 'bg-amber-500/10',   ring: 'hover:ring-amber-500/30',   text: 'text-amber-500',   dot: 'bg-amber-500' },
    rose:    { bg: 'bg-rose-500/10',    ring: 'hover:ring-rose-500/30',    text: 'text-rose-400',    dot: 'bg-rose-500' },
    emerald: { bg: 'bg-emerald-500/10', ring: 'hover:ring-emerald-500/30', text: 'text-emerald-400', dot: 'bg-emerald-500' },
    blue:    { bg: 'bg-blue-500/10',    ring: 'hover:ring-blue-500/30',    text: 'text-blue-400',    dot: 'bg-blue-500' },
  };
  const t = TONES[tone];
  const muted = count === 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group bg-card rounded-xl border border-border p-4 text-left transition-all hover:ring-2 ${t.ring} ${muted ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-xl ${t.bg} shrink-0`}>
          <Icon size={18} weight="duotone" className={t.text} />
        </div>
        {!muted && <span className={`w-2 h-2 rounded-full ${t.dot} mt-1`} />}
      </div>
      <p className="text-xs text-t3 mt-3">{label}</p>
      <p className="text-2xl font-bold text-t1 leading-tight mt-0.5">{count}</p>
      {sub && <p className="text-xs text-t3 mt-1">{sub}</p>}
      <p className="text-xs font-semibold text-accent mt-3 inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        Review <ArrowRight size={12} weight="bold" />
      </p>
    </button>
  );
}

function ProcurementDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [procSummary, setProcSummary] = useState<any>(null);
  const [transporterSummary, setTransporterSummary] = useState<any>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    Promise.all([
      apiGetProcurementSummary(),
      apiGetTransportersSummary(),
      apiListProjects(undefined, 'active'),
    ]).then(([pRes, tRes, projRes]) => {
      if (pRes.success) setProcSummary(pRes.data);
      if (tRes.success) setTransporterSummary(tRes.data.summary);
      if (projRes.success) setProjects(projRes.data.projects);
      setLoading(false);
    });
  }, []);

  if (loading) return <SectionSpinner />;

  const ps = procSummary?.summary ?? {};
  const ts = transporterSummary ?? {};
  const activeProjects = projects.filter(p => p.status === 'active');

  return (
    <div className="space-y-6">
      {/* Active Projects */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent-glow shrink-0">
              <BriefcaseMetal size={18} weight="duotone" className="text-accent" />
            </div>
            <div>
              <p className="text-xs text-t3">Active Projects</p>
              <p className="text-2xl font-bold text-t1 leading-tight">{activeProjects.length}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate({ to: '/procurement/projects' })}
            className="text-xs font-semibold text-accent hover:underline inline-flex items-center gap-1"
          >
            View all <ArrowRight size={12} weight="bold" />
          </button>
        </div>
      </div>

      {/* Action Required */}
      <div>
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest mb-3">Action Required</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <ActionCard
            label="Draft POs"
            count={ps.draftPOs ?? 0}
            sub={ps.draftPoValue ? `${formatCompact(ps.draftPoValue)} value` : 'Awaiting approval'}
            Icon={ShoppingCart}
            tone="amber"
            onClick={() => navigate({ to: '/procurement/purchase-orders' })}
          />
          <ActionCard
            label="POs Past Deadline"
            count={ps.pastDeadlinePOs ?? 0}
            sub={ps.pastDeadlinePoValue ? `${formatCompact(ps.pastDeadlinePoValue)} at risk` : 'Chase suppliers'}
            Icon={Clock}
            tone="rose"
            onClick={() => navigate({ to: '/procurement/purchase-orders' })}
          />
          <ActionCard
            label="Transporters Ready to Invoice"
            count={ts.readyToInvoice ?? 0}
            sub="Generate invoice"
            Icon={Receipt}
            tone="emerald"
            onClick={() => navigate({ to: '/procurement/transporters' })}
          />
          <ActionCard
            label="Spare Parts Below Reorder"
            count={ps.sparePartAlerts ?? 0}
            sub="Trigger restock"
            Icon={Warning}
            tone="blue"
            onClick={() => navigate({ to: '/procurement/spare-parts' })}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Operations Dashboard ──────────────────────────────────────────────────────

const CONTRACT_COLORS: Record<string, string> = {
  Active: '#10b981',
  Draft: '#f59e0b',
  Completed: '#6366f1',
  Disputed: '#f43f5e',
};

function OperationsDashboard() {
  const [loading, setLoading] = useState(true);
  const [contractSum, setContractSum] = useState<any>(null);
  const [delivSum, setDelivSum] = useState<any>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [activeTrips, setActiveTrips] = useState<Trip[]>([]);

  useEffect(() => {
    Promise.all([
      apiGetContractsSummary(),
      apiGetDeliveriesSummary(),
      apiListSites({ limit: '200' }),
      apiListTrips({ limit: '200' }),
    ]).then(([cRes, dRes, sRes, tRes]) => {
      if (cRes.success) setContractSum(cRes.data);
      if (dRes.success) setDelivSum(dRes.data.summary);
      if (sRes.success) setSites(sRes.data.sites);
      if (tRes.success) setActiveTrips(
        tRes.data.trips.filter(t => t.status === 'shunting' || t.status === 'in_progress')
      );
      setLoading(false);
    });
  }, []);

  if (loading) return <SectionSpinner />;

  const cs = contractSum?.summary ?? {};
  const ds = delivSum ?? {};

  const activeSites = sites.filter(s => s.isActive && s.liveStatus);
  const siteTotals = activeSites.reduce(
    (acc, s) => {
      acc.waiting += s.liveStatus.trucksWaiting ?? 0;
      acc.loading += s.liveStatus.trucksLoading ?? 0;
      acc.offloading += s.liveStatus.trucksOffloading ?? 0;
      acc.processedToday += s.liveStatus.loadsProcessedToday ?? 0;
      return acc;
    },
    { waiting: 0, loading: 0, offloading: 0, processedToday: 0 }
  );
  const shuntingTrips = activeTrips.filter(t => t.status === 'shunting');
  const inProgressTrips = activeTrips.filter(t => t.status === 'in_progress');
  const sitesByLoad = [...activeSites].sort((a, b) =>
    ((b.liveStatus.trucksWaiting ?? 0) + (b.liveStatus.trucksLoading ?? 0) + (b.liveStatus.trucksOffloading ?? 0)) -
    ((a.liveStatus.trucksWaiting ?? 0) + (a.liveStatus.trucksLoading ?? 0) + (a.liveStatus.trucksOffloading ?? 0))
  );

  const contractDonut = [
    { name: 'Active', value: cs.active ?? 0 },
    { name: 'Draft', value: cs.draft ?? 0 },
    { name: 'Completed', value: cs.completed ?? 0 },
    { name: 'Disputed', value: cs.disputed ?? 0 },
  ].filter(d => d.value > 0);

  const delivBars = [
    { status: 'Pending', count: ds.pendingConfirmation ?? 0, fill: '#f59e0b' },
    { status: 'Confirmed', count: ds.confirmed ?? 0, fill: '#10b981' },
    { status: 'Disputed', count: ds.disputed ?? 0, fill: '#f43f5e' },
  ];

  const nearingDeadline = contractSum?.nearingDeadline ?? [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest mb-3">Live Site Activity</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard label="Trucks Waiting" value={siteTotals.waiting} Icon={Hourglass}
            bg={siteTotals.waiting > 0 ? 'bg-amber-500/10' : 'bg-surface'}
            color={siteTotals.waiting > 0 ? 'text-amber-500' : 'text-t3'}
            sub="across sites"
          />
          <KpiCard label="Loading" value={siteTotals.loading} Icon={Truck}
            bg={siteTotals.loading > 0 ? 'bg-blue-500/10' : 'bg-surface'}
            color={siteTotals.loading > 0 ? 'text-blue-400' : 'text-t3'}
          />
          <KpiCard label="Offloading" value={siteTotals.offloading} Icon={Truck}
            bg={siteTotals.offloading > 0 ? 'bg-emerald-500/10' : 'bg-surface'}
            color={siteTotals.offloading > 0 ? 'text-emerald-400' : 'text-t3'}
          />
          <KpiCard label="Shunting" value={shuntingTrips.length} Icon={ArrowsClockwise}
            bg={shuntingTrips.length > 0 ? 'bg-orange-500/10' : 'bg-surface'}
            color={shuntingTrips.length > 0 ? 'text-orange-400' : 'text-t3'}
            sub="on-site moves"
          />
          <KpiCard label="In Transit" value={inProgressTrips.length} Icon={MapPin} bg="bg-purple-500/10" color="text-purple-400" />
          <KpiCard label="Loads Today" value={siteTotals.processedToday} Icon={Checks} bg="bg-emerald-500/10" color="text-emerald-400" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Active Contracts" value={cs.active ?? 0} Icon={FileText} bg="bg-emerald-500/10" color="text-emerald-400" />
        <KpiCard label="Disputed" value={cs.disputed ?? 0} Icon={Warning}
          bg={(cs.disputed ?? 0) > 0 ? 'bg-rose-500/10' : 'bg-surface'}
          color={(cs.disputed ?? 0) > 0 ? 'text-rose-400' : 'text-t3'}
        />
        <KpiCard label="Tons Today" value={(ds.tonsToday ?? 0).toLocaleString()} Icon={Package} bg="bg-blue-500/10" color="text-blue-400" />
        <KpiCard label="Tons This Month" value={(ds.tonsThisMonth ?? 0).toLocaleString()} Icon={ChartBar} bg="bg-purple-500/10" color="text-purple-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Contract Status">
          {contractDonut.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={contractDonut} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                  {contractDonut.map((entry, i) => (
                    <Cell key={i} fill={CONTRACT_COLORS[entry.name] ?? '#6366f1'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: 'var(--color-t2)' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-t3 text-center py-12">No contract data available</p>
          )}
        </ChartCard>

        <ChartCard title="Deliveries Status">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={delivBars} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="status" tick={{ fill: 'var(--color-t3)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--color-t3)', fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" radius={ROUNDING} name="Deliveries">
                {delivBars.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm font-semibold text-t1 mb-4">Active Contract Value</p>
          <p className="text-4xl font-bold text-accent">
            {(cs.totalActiveValue ?? 0) >= 1_000_000
              ? `${((cs.totalActiveValue ?? 0) / 1_000_000).toFixed(2)}M`
              : `${Math.round((cs.totalActiveValue ?? 0) / 1000)}K`}
          </p>
          <p className="text-xs text-t3 mt-2">Active contract revenue</p>
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-t3 mb-1">Total Active Tons</p>
            <p className="text-2xl font-bold text-t1">{(cs.totalActiveTons ?? 0).toLocaleString()}</p>
            <p className="text-xs text-t3 mt-1">Contracted tonnage across active contracts</p>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm font-semibold text-t1 mb-4">Site Activity Now</p>
          {sitesByLoad.length === 0 ? (
            <div className="flex items-center gap-2 text-t3 py-6">
              <Buildings size={16} className="opacity-40" />
              <p className="text-sm">No active sites</p>
            </div>
          ) : (
            <div className="space-y-2 mb-4">
              {sitesByLoad.slice(0, 5).map(site => {
                const total = (site.liveStatus.trucksWaiting ?? 0) + (site.liveStatus.trucksLoading ?? 0) + (site.liveStatus.trucksOffloading ?? 0);
                return (
                  <div key={site._id} className="flex items-center justify-between py-2 border-b border-border last:border-0 gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-t1 truncate">{site.name}</p>
                      <p className="text-xs text-t3 truncate">{site.siteCode} · {site.region || site.country}</p>
                    </div>
                    <div className="flex gap-3 text-xs shrink-0">
                      <div className="text-center">
                        <p className="font-bold text-amber-500">{site.liveStatus.trucksWaiting ?? 0}</p>
                        <p className="text-t3 text-[10px]">wait</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-blue-400">{site.liveStatus.trucksLoading ?? 0}</p>
                        <p className="text-t3 text-[10px]">load</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-emerald-400">{site.liveStatus.trucksOffloading ?? 0}</p>
                        <p className="text-t3 text-[10px]">off</p>
                      </div>
                      <div className={`text-center min-w-[28px] ${total > 0 ? 'text-t1' : 'text-t3'}`}>
                        <p className="font-bold">{total}</p>
                        <p className="text-t3 text-[10px]">total</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {shuntingTrips.length > 0 && (
            <div className="pt-3 border-t border-border">
              <p className="text-xs font-semibold text-orange-400 mb-2 flex items-center gap-1.5">
                <ArrowsClockwise size={12} weight="bold" />
                Currently Shunting ({shuntingTrips.length})
              </p>
              <div className="space-y-1">
                {shuntingTrips.slice(0, 4).map(t => (
                  <div key={t._id} className="flex items-center justify-between text-xs py-1">
                    <span className="font-mono text-orange-400">{t.plateNumber}</span>
                    <span className="text-t3 truncate ml-2">{t.originSite} → {t.destinationSite}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm font-semibold text-t1 mb-4">Contracts Nearing Deadline</p>
          {nearingDeadline.length === 0 ? (
            <div className="flex items-center gap-2 text-t3 py-6">
              <Checks size={16} className="opacity-40" />
              <p className="text-sm">No contracts nearing deadline</p>
            </div>
          ) : (
            <div className="space-y-2">
              {nearingDeadline.slice(0, 5).map((c: any) => (
                <div key={c._id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-t1 truncate">{c.contractRef}</p>
                    <p className="text-xs text-t3 truncate">{c.clientName}</p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-xs font-medium text-amber-500">{new Date(c.endDate).toLocaleDateString()}</p>
                    <p className="text-xs text-t3">{c.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Inventory Dashboard ───────────────────────────────────────────────────────

function InventoryDashboard() {
  const [loading, setLoading] = useState(true);
  const [invSummary, setInvSummary] = useState<any>(null);

  useEffect(() => {
    apiGetInventorySummary().then(res => {
      if (res.success) setInvSummary(res.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <SectionSpinner />;

  const s = invSummary?.summary ?? {};
  const categories = (invSummary?.categories ?? []).map((c: any) => ({
    category: c._id || 'Unknown',
    count: c.count,
    value: Math.round(c.totalValue / 1000),
    qty: Math.round(c.totalQty),
  }));

  const recentMovements = invSummary?.recentMovements ?? [];
  const movTypeCounts: Record<string, number> = {};
  recentMovements.forEach((m: any) => {
    movTypeCounts[m.movementType] = (movTypeCounts[m.movementType] ?? 0) + 1;
  });
  const movBars = Object.entries(movTypeCounts).map(([type, count]) => ({
    type: type.replace(/_/g, ' '),
    count,
    fill: type === 'RECEIPT' ? '#10b981' : type === 'ISSUE' ? '#f43f5e' : type === 'STOCK_COUNT' ? '#6366f1' : '#f59e0b',
  }));

  const okCount = (s.totalItems ?? 0) - (s.lowStockRecords ?? 0);
  const healthDonut = [
    { name: 'OK', value: okCount > 0 ? okCount : 0 },
    { name: 'Low Stock', value: s.lowStockRecords ?? 0 },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Total Items" value={(s.totalItems ?? 0).toLocaleString()} Icon={Package} bg="bg-accent-glow" color="text-accent" />
        <KpiCard label="Total Stock Value" value={
          (s.totalValue ?? 0) >= 1_000_000
            ? `${((s.totalValue ?? 0) / 1_000_000).toFixed(2)}M`
            : `${Math.round((s.totalValue ?? 0) / 1000)}K`
        } Icon={ChartBar} bg="bg-blue-500/10" color="text-blue-400" />
        <KpiCard label="Low Stock Alerts" value={s.lowStockRecords ?? 0} Icon={Warning}
          bg={(s.lowStockRecords ?? 0) > 0 ? 'bg-rose-500/10' : 'bg-emerald-500/10'}
          color={(s.lowStockRecords ?? 0) > 0 ? 'text-rose-400' : 'text-emerald-400'}
        />
        <KpiCard label="Warehouses" value={s.warehouseCount ?? 0} Icon={Buildings} bg="bg-purple-500/10" color="text-purple-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Stock by Category (Value × 1K)">
          {categories.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={categories} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'var(--color-t3)', fontSize: 11 }} />
                <YAxis dataKey="category" type="category" tick={{ fill: 'var(--color-t3)', fontSize: 11 }} width={90} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v}K`, 'Value']} />
                <Bar dataKey="value" fill="var(--color-accent)" radius={[0, 4, 4, 0]} name="Value (K)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-t3 text-center py-12">No inventory data available</p>
          )}
        </ChartCard>

        <ChartCard title="Stock Health">
          {healthDonut.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={healthDonut} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                  <Cell fill="#10b981" />
                  <Cell fill="#f43f5e" />
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: 'var(--color-t2)' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-t3 text-center py-12">No stock data available</p>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Recent Movement Types">
          {movBars.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={movBars} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="type" tick={{ fill: 'var(--color-t3)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--color-t3)', fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" radius={ROUNDING} name="Count">
                  {movBars.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-t3 text-center py-12">No movement data available</p>
          )}
        </ChartCard>

        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm font-semibold text-t1 mb-4">Recent Stock Movements</p>
          {recentMovements.length === 0 ? (
            <div className="flex items-center gap-2 text-t3 py-6">
              <Package size={16} className="opacity-40" />
              <p className="text-sm">No recent movements</p>
            </div>
          ) : (
            <div className="space-y-0">
              {recentMovements.slice(0, 6).map((m: any) => (
                <div key={m._id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-t1 truncate">{m.itemName}</p>
                    <p className="text-xs text-t3">{m.movementType.replace(/_/g, ' ')} · {m.movementRef}</p>
                  </div>
                  <span className={`flex items-center gap-0.5 text-sm font-bold shrink-0 ml-3 ${m.qty >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {m.qty >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                    {Math.abs(m.qty).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────

const DEPT_LABELS: Record<string, string> = {
  transport: 'Transport',
  procurement: 'Procurement',
  operations: 'Operations',
  inventory: 'Inventory',
};

export default function Dashboard({ currentDepartmentId }: DashboardProps) {
  const label = DEPT_LABELS[currentDepartmentId] ?? currentDepartmentId;

  const renderContent = () => {
    switch (currentDepartmentId) {
      case 'transport':    return <TransportDashboard />;
      case 'procurement':  return <ProcurementDashboard />;
      case 'operations':   return <OperationsDashboard />;
      case 'inventory':    return <InventoryDashboard />;
      default:
        return (
          <div className="bg-card rounded-xl border border-border p-10 flex flex-col items-center justify-center gap-3 text-center">
            <ChartBar size={32} weight="duotone" className="text-t3 opacity-40" />
            <p className="text-sm text-t3">No dashboard configured for this department yet.</p>
          </div>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-t1">{label} Overview</h1>
        <p className="text-sm text-t3 mt-1">Real-time summary and key metrics</p>
      </div>

      {renderContent()}
    </div>
  );
}
