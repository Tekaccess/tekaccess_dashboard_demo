import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  CircleNotchIcon,
  CheckCircleIcon,
  WarningIcon,
  XCircleIcon,
  ChartLineIcon,
  CaretRightIcon,
  CalendarBlankIcon,
  TargetIcon,
  UsersThreeIcon,
  HandshakeIcon,
} from '@phosphor-icons/react';
import {
  apiHrPerformanceOverview,
  apiHrPerformanceDetail,
  type PerformanceRow,
  type PerformanceStatus,
  type PerformanceSignal,
  type PerformanceDetail,
  type PerformanceMode,
  type LetterGrade,
} from '../../lib/api';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Sheet, SheetHeader, SheetBody } from '../../components/ui/sheet';
import { Avatar as UserAvatar } from '../../components/ui/avatar';
import { Progress } from '../../components/ui/progress';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';

type RangeKey = 'this-week' | 'this-month' | 'last-month' | 'all';

const RANGE_LABELS: Record<RangeKey, string> = {
  'this-week': 'This week',
  'this-month': 'This month',
  'last-month': 'Last month',
  'all': 'All time',
};

function rangeBounds(range: RangeKey): { from?: string; to?: string } {
  const now = new Date();
  if (range === 'all') return {};
  if (range === 'this-week') {
    const day = now.getDay() || 7;
    const start = new Date(now); start.setDate(now.getDate() - day + 1); start.setHours(0,0,0,0);
    const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23,59,59,999);
    return { from: start.toISOString(), to: end.toISOString() };
  }
  if (range === 'this-month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { from: start.toISOString(), to: end.toISOString() };
  }
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
}

const STATUS_STYLES: Record<PerformanceStatus, { chip: string; Icon: React.ComponentType<{ size?: number; weight?: 'fill' | 'duotone' | 'regular'; className?: string }>; label: string }> = {
  'on-track': { chip: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', Icon: CheckCircleIcon, label: 'On track' },
  'at-risk':  { chip: 'bg-amber-500/10 text-amber-500 border-amber-500/20',       Icon: WarningIcon,     label: 'At risk' },
  'behind':   { chip: 'bg-rose-500/10 text-rose-400 border-rose-500/20',          Icon: XCircleIcon,     label: 'Behind' },
  'no-data':  { chip: 'bg-surface text-t3 border-border',                          Icon: ChartLineIcon,   label: 'No data' },
};

function StatusChip({ status }: { status: PerformanceStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${s.chip}`}>
      <s.Icon size={11} weight="fill" />
      {s.label}
    </span>
  );
}

// Avatar wrapper using the shared shadcn-style component.
function Avatar({ name, url, size = 8 }: { name: string; url: string | null; size?: number }) {
  return <UserAvatar name={name} url={url} size={size} />;
}

// Letter grade pill — color-coded so HR can see "what needs improvement"
// at a glance. F/D draw the eye in red; A/B reassure in green.
const GRADE_TONE: Record<LetterGrade, { bg: string; text: string; ring: string }> = {
  A: { bg: 'bg-emerald-500',     text: 'text-white',         ring: 'ring-emerald-500/30' },
  B: { bg: 'bg-emerald-500/20',  text: 'text-emerald-300',   ring: 'ring-emerald-500/30' },
  C: { bg: 'bg-amber-500/20',    text: 'text-amber-300',     ring: 'ring-amber-500/30' },
  D: { bg: 'bg-orange-500/20',   text: 'text-orange-300',    ring: 'ring-orange-500/30' },
  F: { bg: 'bg-rose-500',        text: 'text-white',         ring: 'ring-rose-500/40' },
  '—': { bg: 'bg-surface',       text: 'text-t3',            ring: 'ring-border' },
};

function GradeBadge({ grade, size = 'md' }: { grade: LetterGrade; size?: 'sm' | 'md' | 'lg' }) {
  const t = GRADE_TONE[grade];
  const dim = size === 'lg' ? 'h-12 w-12 text-2xl' : size === 'sm' ? 'h-6 w-6 text-[11px]' : 'h-8 w-8 text-sm';
  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg font-bold ring-1 ${t.bg} ${t.text} ${t.ring} ${dim}`}
      title={`Grade: ${grade}`}
    >
      {grade}
    </span>
  );
}

function SignalRow({ s }: { s: PerformanceSignal }) {
  const style = STATUS_STYLES[s.status];
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 bg-surface rounded-lg">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-t1 truncate">{s.metric}</p>
        <p className="text-[11px] text-t3">Target: {s.target} · Actual: {s.actual}</p>
      </div>
      <Badge
        variant={
          s.status === 'on-track' ? 'success' :
          s.status === 'at-risk'  ? 'warning' :
          s.status === 'behind'   ? 'danger'  : 'muted'
        }
        className="text-[10px] font-bold"
      >
        {style.label}
      </Badge>
    </div>
  );
}

function DailyChart({ daily }: { daily: PerformanceDetail['daily'] }) {
  if (daily.length === 0) return null;
  const max = Math.max(1, ...daily.map(d => Math.max(d.created, d.completed)));
  return (
    <div className="bg-surface rounded-lg p-3">
      <div className="flex items-end gap-1 h-20">
        {daily.map((d) => {
          const cH = (d.created / max) * 100;
          const dH = (d.completed / max) * 100;
          const day = new Date(d.date).getDate();
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5 group" title={`${d.date}: ${d.completed}/${d.created} done`}>
              <div className="w-full flex items-end gap-px h-16">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${cH}%` }}
                  transition={{ duration: 0.4, delay: 0.05 }}
                  className="flex-1 bg-t3/40 rounded-t-sm min-h-[2px]"
                />
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${dH}%` }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="flex-1 bg-emerald-500 rounded-t-sm min-h-[2px]"
                />
              </div>
              {(daily.length <= 31 ? day === 1 || day % 5 === 0 : false) && (
                <span className="text-[9px] text-t3 leading-none">{day}</span>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-end gap-3 mt-2 text-[10px] text-t3">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-t3/40" /> Created</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-500" /> Completed</span>
      </div>
    </div>
  );
}

function PerformanceDetailPanel({ userId, range, mode, onClose }: {
  userId: string; range: RangeKey; mode: PerformanceMode; onClose: () => void;
}) {
  const [data, setData] = useState<PerformanceDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiHrPerformanceDetail(userId, { ...rangeBounds(range), mode })
      .then((r) => { if (r.success) setData(r.data); })
      .finally(() => setLoading(false));
  }, [userId, range, mode]);

  return (
    <Sheet open={true} onOpenChange={(v) => { if (!v) onClose(); }} side="right" size="2xl">
      <SheetHeader
        title={data?.user.fullName ?? 'Loading…'}
        subtitle={data?.employee ? `${data.employee.role} · ${data.employee.department}` : data?.user.email}
        onClose={onClose}
        leading={data?.user && <Avatar name={data.user.fullName} url={data.user.avatarUrl} />}
      />
      <SheetBody>
        {loading || !data ? (
          <div className="flex items-center justify-center py-16">
            <CircleNotchIcon size={24} className="animate-spin text-accent" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Status & range */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <StatusChip status={data.status} />
                <Badge variant={mode === 'doing' ? 'info' : 'accent'}>
                  {mode === 'doing'
                    ? <><UsersThreeIcon size={11} weight="fill" /> Doing</>
                    : <><HandshakeIcon size={11} weight="fill" /> Delegating</>}
                </Badge>
              </div>
              <span className="text-[11px] text-t3 flex items-center gap-1">
                <CalendarBlankIcon size={11} />
                {new Date(data.range.from).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} —{' '}
                {new Date(data.range.to).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            </div>

            {/* Top-level yearly grade — the headline number HR cares about.
                Hidden when the user has no yearly targets in the period. */}
            {data.yearlyTargets.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
                <GradeBadge grade={data.yearlyGrade} size="lg" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] uppercase tracking-widest text-t3 font-bold">Yearly grade</p>
                  <p className="text-lg font-bold text-t1">
                    {data.yearlyAvg !== null ? `${data.yearlyAvg}% avg` : 'No data'}
                    <span className="text-xs font-normal text-t3 ml-2">
                      across {data.yearlyTargets.length} target{data.yearlyTargets.length === 1 ? '' : 's'}
                    </span>
                  </p>
                </div>
                {data.weakestYearly && data.weakestYearly.grade !== 'A' && (
                  <div className="hidden sm:flex flex-col items-end shrink-0 max-w-[55%]">
                    <p className="text-[10px] uppercase tracking-widest text-rose-400 font-bold flex items-center gap-1">
                      <WarningIcon size={10} weight="fill" /> Needs improvement
                    </p>
                    <p className="text-xs text-t1 font-medium truncate max-w-full" title={data.weakestYearly.title}>
                      {data.weakestYearly.title}
                    </p>
                    <p className="text-[10px] text-t3">{data.weakestYearly.progress}% · grade {data.weakestYearly.grade}</p>
                  </div>
                )}
              </div>
            )}

            {/* Daily activity */}
            <div>
              <p className="text-[11px] font-bold text-t3 uppercase tracking-widest mb-2">Daily activity</p>
              <DailyChart daily={data.daily} />
              <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                <div className="bg-surface rounded-lg p-2">
                  <p className="text-[10px] text-t3">Total</p>
                  <p className="text-sm font-bold text-t1">{data.counts.total}</p>
                </div>
                <div className="bg-surface rounded-lg p-2">
                  <p className="text-[10px] text-t3">Done</p>
                  <p className="text-sm font-bold text-emerald-400">{data.counts.completed}</p>
                </div>
                <div className="bg-surface rounded-lg p-2">
                  <p className="text-[10px] text-t3">In progress</p>
                  <p className="text-sm font-bold text-amber-500">{data.counts.inProgress}</p>
                </div>
                <div className="bg-surface rounded-lg p-2">
                  <p className="text-[10px] text-t3">Overdue</p>
                  <p className="text-sm font-bold text-rose-400">{data.counts.overdue}</p>
                </div>
              </div>
            </div>

            {/* Signals */}
            <div>
              <p className="text-[11px] font-bold text-t3 uppercase tracking-widest mb-2">Signals</p>
              <div className="space-y-2">
                {data.signals.map((s, i) => <SignalRow key={i} s={s} />)}
              </div>
            </div>

            {/* Weekly targets */}
            {data.weeklyTargets.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-t3 uppercase tracking-widest mb-2">Weekly targets</p>
                <div className="space-y-2">
                  {data.weeklyTargets.map((w) => (
                    <div key={w._id} className="bg-surface rounded-lg p-3">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <p className="text-sm font-medium text-t1 truncate flex-1">{w.title || '(untitled)'}</p>
                        <span className="text-xs text-t2">{w.tasksDone}/{w.tasksTotal}</span>
                      </div>
                      <Progress value={w.progress} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Yearly targets — top of hierarchy. Each row shows its grade
                so the user can see "where am I weakest?" in real time. */}
            {data.yearlyTargets.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-t3 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <TargetIcon size={11} weight="fill" /> Yearly targets
                </p>
                <div className="space-y-2">
                  {data.yearlyTargets.map((y) => (
                    <div key={y._id} className="bg-surface rounded-lg p-3 flex items-start gap-3">
                      <GradeBadge grade={y.grade} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <p className="text-sm font-medium text-t1 truncate flex-1">{y.title || '(untitled)'}</p>
                          <span className="text-xs text-t2 shrink-0">
                            {y.hasData ? `${y.progress}% · ${y.monthlies} monthly` : 'No monthlies linked'}
                          </span>
                        </div>
                        <Progress value={y.progress} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Monthly targets */}
            {data.monthlyTargets.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-t3 uppercase tracking-widest mb-2">Monthly targets</p>
                <div className="space-y-2">
                  {data.monthlyTargets.map((m) => (
                    <div key={m._id} className="bg-surface rounded-lg p-3 flex items-start gap-3">
                      <GradeBadge grade={m.grade} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <p className="text-sm font-medium text-t1 truncate flex-1">{m.title || '(untitled)'}</p>
                          <span className="text-xs text-t2">{m.weeklies} weekly</span>
                        </div>
                        <Progress value={m.progress} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Yearly KPIs (manual) — placeholder until structured yearly targets ship. */}
            {data.yearlyKpis.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-t3 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <TargetIcon size={11} weight="fill" /> Yearly KPIs
                </p>
                <div className="space-y-2">
                  {data.yearlyKpis.map((k, i) => <SignalRow key={i} s={k} />)}
                </div>
              </div>
            )}

            {/* Recent tasks */}
            {data.recentTasks.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-t3 uppercase tracking-widest mb-2">Recent tasks</p>
                <ul className="space-y-1.5">
                  {data.recentTasks.map((t) => (
                    <li key={t._id} className="bg-surface rounded-lg px-3 py-2 flex items-center justify-between gap-2">
                      <span className="text-sm text-t1 truncate flex-1">{t.title || '(untitled)'}</span>
                      <Badge
                        variant={
                          t.status === 'completed'  ? 'success' :
                          t.status === 'in-progress' ? 'warning' :
                          t.status === 'postponed'   ? 'danger'  : 'outline'
                        }
                        className="text-[10px]"
                      >
                        {t.status.replace('-', ' ')}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </SheetBody>
    </Sheet>
  );
}

export default function PerformancePage() {
  const [range, setRange] = useState<RangeKey>('this-month');
  // Default to "doing" — the question HR asks first is "who's getting work
  // done?" Switching to "delegating" exposes managers' delegation volume
  // separately so they don't show up as "no-data" ghosts.
  const [mode, setMode] = useState<PerformanceMode>('doing');
  const [rows, setRows] = useState<PerformanceRow[]>([]);
  const [totals, setTotals] = useState<Record<PerformanceStatus, number>>({ 'on-track': 0, 'at-risk': 0, 'behind': 0, 'no-data': 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | PerformanceStatus>('all');
  const [drillUserId, setDrillUserId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiHrPerformanceOverview({ ...rangeBounds(range), mode })
      .then((r) => {
        if (r.success) {
          setRows(r.data.rows);
          setTotals(r.data.totals);
        }
      })
      .finally(() => setLoading(false));
  }, [range, mode]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filter !== 'all' && r.status !== filter) return false;
      if (search && !r.user.fullName.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [rows, filter, search]);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-t1">Performance</h1>
          <p className="text-sm text-t3 mt-1">
            {mode === 'doing'
              ? "Who's actually getting work done — status from tasks each person is assigned (or self-assigned)."
              : 'Who is delegating work — tasks each person created for someone else.'}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
          {(Object.keys(RANGE_LABELS) as RangeKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setRange(k)}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                range === k ? 'bg-accent-glow text-accent font-medium' : 'text-t2 hover:text-t1 hover:bg-surface'
              }`}
            >
              {RANGE_LABELS[k]}
            </button>
          ))}
        </div>
      </div>

      {/* Doing / Delegating mode toggle. Default = Doing (what HR cares about
          first). Delegating surfaces managers' delegation volume so they
          aren't dismissed as "no-data" when they're actually orchestrating. */}
      <Tabs value={mode} onValueChange={(v) => setMode(v as PerformanceMode)}>
        <TabsList>
          <TabsTrigger value="doing">
            <UsersThreeIcon size={13} weight="fill" />
            Doing
          </TabsTrigger>
          <TabsTrigger value="delegating">
            <HandshakeIcon size={13} weight="fill" />
            Delegating
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-[11px] uppercase tracking-widest text-t3 font-bold">On Track</p>
          <p className="text-2xl font-bold text-emerald-400 mt-0.5">{totals['on-track']}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] uppercase tracking-widest text-t3 font-bold">At Risk</p>
          <p className="text-2xl font-bold text-amber-500 mt-0.5">{totals['at-risk']}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] uppercase tracking-widest text-t3 font-bold">Behind</p>
          <p className="text-2xl font-bold text-rose-400 mt-0.5">{totals['behind']}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] uppercase tracking-widest text-t3 font-bold">No Activity</p>
          <p className="text-2xl font-bold text-t2 mt-0.5">{totals['no-data']}</p>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          className="flex-1 min-w-[200px] px-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent"
          placeholder="Search employees..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex gap-1.5">
          {(['all', 'on-track', 'at-risk', 'behind', 'no-data'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                filter === f ? 'bg-accent text-white' : 'bg-surface text-t2 hover:bg-surface/70'
              }`}
            >
              {f === 'all' ? 'All' : f === 'no-data' ? 'No activity' : f.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <CircleNotchIcon size={28} className="animate-spin text-accent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-10 text-center text-sm text-t3">
          No employees match this filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const allSignals = [...r.signals, ...r.manualKpis];
            return (
              <button
                key={r.user._id}
                onClick={() => setDrillUserId(r.user._id)}
                className="w-full text-left bg-card rounded-xl border border-border p-5 hover:border-accent/50 hover:bg-card/80 transition-colors group"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={r.user.fullName} url={r.user.avatarUrl} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-t1 truncate">{r.user.fullName}</p>
                      <p className="text-xs text-t3 mt-0.5 truncate">
                        {r.employee ? `${r.employee.role} · ${r.employee.department}` : r.user.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusChip status={r.status} />
                    <CaretRightIcon size={14} className="text-t3 group-hover:text-accent transition-colors" />
                  </div>
                </div>

                {allSignals.length === 0 ? (
                  <p className="text-xs text-t3 italic">No activity in this range.</p>
                ) : (
                  <div className="space-y-2">
                    {allSignals.map((k, i) => (
                      <SignalRow key={i} s={k} />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {drillUserId && (
        <PerformanceDetailPanel
          userId={drillUserId}
          range={range}
          mode={mode}
          onClose={() => setDrillUserId(null)}
        />
      )}
    </div>
  );
}
