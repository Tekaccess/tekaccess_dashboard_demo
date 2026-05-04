import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CircleNotchIcon,
  CheckCircleIcon,
  WarningIcon,
  TargetIcon,
  CalendarBlankIcon,
  ClockIcon,
  XIcon,
  CaretRightIcon,
} from '@phosphor-icons/react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import {
  apiHrTaskTrackingOverview,
  apiHrTaskTrackingUserTasks,
  type TaskTrackingRow,
  type TaskTrackingSummary,
  type TrackingUserTask,
} from '../../lib/api';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../../components/ui/table';
import DateRangeFilter, {
  DUE_RANGE_LABELS,
  getDueRangeBounds,
  type DueRange,
} from '../../components/ui/DateRangeFilter';

function rangeBounds(range: DueRange): { from?: string; to?: string } {
  const b = getDueRangeBounds(range);
  if (!b) return {};
  return { from: b.start.toISOString(), to: b.end.toISOString() };
}

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <p className="text-xs text-t3">{label}</p>
      <p className={`text-2xl font-bold ${accent || 'text-t1'}`}>{value}</p>
      {sub && <p className="text-[11px] text-t3 mt-0.5">{sub}</p>}
    </div>
  );
}

function ProgressBar({ pct, tone = 'accent' }: { pct: number; tone?: 'accent' | 'emerald' | 'amber' | 'rose' }) {
  const safe = Math.max(0, Math.min(100, pct));
  const bar = tone === 'emerald'
    ? 'bg-emerald-500'
    : tone === 'amber'
      ? 'bg-amber-500'
      : tone === 'rose'
        ? 'bg-rose-500'
        : 'bg-accent';
  return (
    <div className="w-full bg-surface rounded-full h-1.5 overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${safe}%` }}
        transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
        className={`h-full ${bar}`}
      />
    </div>
  );
}

function StatusPill({ status }: { status: TrackingUserTask['status'] }) {
  const map: Record<TrackingUserTask['status'], string> = {
    'not-started': 'bg-surface text-t2',
    'in-progress': 'bg-amber-500/10 text-amber-500',
    'completed':   'bg-emerald-500/10 text-emerald-400',
    'postponed':   'bg-rose-500/10 text-rose-400',
  };
  const label: Record<TrackingUserTask['status'], string> = {
    'not-started': 'Not Started',
    'in-progress': 'In Progress',
    'completed':   'Completed',
    'postponed':   'Postponed',
  };
  return <span className={`text-[11px] font-medium rounded px-2 py-0.5 ${map[status]}`}>{label[status]}</span>;
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  const initials = name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  if (url) return <img src={url} alt={name} className="h-8 w-8 rounded-full object-cover" />;
  return (
    <div className="h-8 w-8 rounded-full bg-accent-glow text-accent text-xs font-bold flex items-center justify-center">
      {initials || '?'}
    </div>
  );
}

function UserDrillDown({
  userId, userName, range, onClose,
}: {
  userId: string; userName: string; range: DueRange; onClose: () => void;
}) {
  const [tasks, setTasks] = useState<TrackingUserTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | TrackingUserTask['status']>('all');

  useEffect(() => {
    setLoading(true);
    const { from, to } = rangeBounds(range);
    apiHrTaskTrackingUserTasks(userId, {
      status: statusFilter === 'all' ? undefined : statusFilter,
      dueFrom: from,
      dueTo: to,
    })
      .then(r => { if (r.success) setTasks(r.data.tasks); })
      .finally(() => setLoading(false));
  }, [userId, statusFilter, range]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-stretch justify-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 40, opacity: 0 }}
        transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
        className="w-full max-w-2xl bg-card border-l border-border h-full flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 h-14 border-b border-border shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-t1">{userName}'s tasks</h2>
            <p className="text-[11px] text-t3">{tasks.length} task{tasks.length === 1 ? '' : 's'}</p>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-md hover:bg-surface text-t3 hover:text-t1 flex items-center justify-center">
            <XIcon size={14} weight="bold" />
          </button>
        </div>

        <div className="flex items-center gap-2 px-5 py-3 border-b border-border shrink-0">
          {(['all', 'not-started', 'in-progress', 'completed', 'postponed'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                statusFilter === s
                  ? 'border-accent bg-accent-glow text-accent'
                  : 'border-border text-t2 hover:text-t1 hover:bg-surface'
              }`}
            >
              {s === 'all' ? 'All' : s.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </button>
          ))}
        </div>

        <OverlayScrollbarsComponent className="flex-1 px-5 py-4" options={{ scrollbars: { autoHide: 'leave' } }} defer>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <CircleNotchIcon size={24} className="animate-spin text-accent" />
            </div>
          ) : tasks.length === 0 ? (
            <p className="text-center text-sm text-t3 py-12">No tasks for this filter.</p>
          ) : (
            <ul className="space-y-2">
              {tasks.map(t => (
                <li key={t._id} className="bg-surface border border-border rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-t1 truncate">{t.title || '(untitled)'}</p>
                      {t.description && (
                        <p className="text-xs text-t3 mt-0.5 line-clamp-2">{t.description}</p>
                      )}
                    </div>
                    <StatusPill status={t.status} />
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-t3">
                    {t.dueDate && (
                      <span className="flex items-center gap-1">
                        <CalendarBlankIcon size={11} />
                        {new Date(t.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <ClockIcon size={11} />
                      Updated {new Date(t.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </OverlayScrollbarsComponent>
      </motion.div>
    </motion.div>
  );
}

export default function TaskTrackingPage() {
  const [range, setRange] = useState<DueRange>('this-month');
  const [rows, setRows] = useState<TaskTrackingRow[]>([]);
  const [summary, setSummary] = useState<TaskTrackingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [drillUser, setDrillUser] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    setLoading(true);
    apiHrTaskTrackingOverview(rangeBounds(range))
      .then(r => {
        if (r.success) {
          setRows(r.data.rows);
          setSummary(r.data.summary);
        }
      })
      .finally(() => setLoading(false));
  }, [range]);

  const topPerformer = useMemo(() => {
    return [...rows]
      .filter(r => r.tasks.total >= 3)
      .sort((a, b) => b.tasks.completionRate - a.tasks.completionRate)[0];
  }, [rows]);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-t1">Task Tracking</h1>
          <p className="text-sm text-t3 mt-1">See who's working on what across the company.</p>
        </div>
        <DateRangeFilter value={range} onChange={setRange} label="Due" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total tasks"
          value={summary?.tasks.total ?? 0}
          sub={`${summary?.tasks.completed ?? 0} completed`}
        />
        <StatCard
          label="Completion rate"
          value={`${summary?.tasks.completionRate ?? 0}%`}
          accent="text-emerald-400"
          sub={`${summary?.tasks.inProgress ?? 0} in progress · ${summary?.tasks.overdue ?? 0} overdue`}
        />
        <StatCard
          label="Weekly targets"
          value={`${summary?.weekly.completed ?? 0} / ${summary?.weekly.total ?? 0}`}
          sub="hit this period"
        />
        <StatCard
          label="Monthly targets"
          value={`${summary?.monthly.completed ?? 0} / ${summary?.monthly.total ?? 0}`}
          sub="hit this period"
        />
      </div>

      {topPerformer && (
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <TargetIcon size={20} weight="fill" className="text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-t3">Top performer ({DUE_RANGE_LABELS[range].toLowerCase()})</p>
            <p className="text-sm font-medium text-t1 truncate">
              {topPerformer.user.fullName}{' '}
              <span className="text-t3 font-normal">— {topPerformer.tasks.completionRate}% on {topPerformer.tasks.total} tasks</span>
            </p>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <CircleNotchIcon size={28} className="animate-spin text-accent" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 px-6">
            <p className="text-sm text-t1 font-medium">No activity in this range</p>
            <p className="text-xs text-t3 mt-1">Try a wider date range.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[280px]">Person</TableHead>
                <TableHead>Tasks</TableHead>
                <TableHead>Completion</TableHead>
                <TableHead>Weekly</TableHead>
                <TableHead>Monthly</TableHead>
                <TableHead className="w-[40px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const tone: 'emerald' | 'amber' | 'rose' = r.tasks.completionRate >= 80
                  ? 'emerald'
                  : r.tasks.completionRate >= 50
                    ? 'amber'
                    : 'rose';
                return (
                  <TableRow
                    key={r.user._id}
                    className="cursor-pointer hover:bg-surface/50"
                    onClick={() => setDrillUser({ id: r.user._id, name: r.user.fullName })}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={r.user.fullName} url={r.user.avatarUrl} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-t1 truncate">{r.user.fullName}</p>
                          <p className="text-[11px] text-t3 truncate">{r.user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-t1 font-medium">{r.tasks.total}</span>
                        <span className="flex items-center gap-1 text-emerald-400">
                          <CheckCircleIcon size={12} weight="fill" />
                          {r.tasks.completed}
                        </span>
                        {r.tasks.overdue > 0 && (
                          <span className="flex items-center gap-1 text-rose-400">
                            <WarningIcon size={12} weight="fill" />
                            {r.tasks.overdue}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="w-32 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className={`font-medium ${tone === 'emerald' ? 'text-emerald-400' : tone === 'amber' ? 'text-amber-500' : 'text-rose-400'}`}>
                            {r.tasks.completionRate}%
                          </span>
                        </div>
                        <ProgressBar pct={r.tasks.completionRate} tone={tone} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-t1">
                        {r.weekly.completed}<span className="text-t3"> / {r.weekly.total}</span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-t1">
                        {r.monthly.completed}<span className="text-t3"> / {r.monthly.total}</span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <CaretRightIcon size={14} className="text-t3" />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <AnimatePresence>
        {drillUser && (
          <UserDrillDown
            userId={drillUser.id}
            userName={drillUser.name}
            range={range}
            onClose={() => setDrillUser(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
