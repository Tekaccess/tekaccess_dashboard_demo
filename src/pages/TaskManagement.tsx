import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import { motion, AnimatePresence } from 'motion/react';
import * as Popover from '@radix-ui/react-popover';

// Easing curves and timing tuned for "smooth but fast" feel.
const EASE_OUT_FAST = [0.32, 0.72, 0, 1] as const;
const PANEL_DURATION = 0.24;
const FADE_DURATION = 0.18;
import {
  Plus,
  MagnifyingGlass,
  Clock,
  X,
  List as ListIcon,
  Kanban,
  CalendarBlank,
  User as UserIcon,
  CircleNotch,
  ArrowSquareOut,
  Target,
  CalendarCheck,
  Trash,
  Check,
  Minus,
  UsersThree,
} from '@phosphor-icons/react';
import {
  format,
  parseISO,
  isValid as isValidDate,
  formatDistanceToNow,
  isWithinInterval,
  startOfDay, endOfDay,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  startOfYear, endOfYear,
  subDays, addDays,
  subWeeks, addWeeks,
  subMonths, addMonths,
  subYears, addYears,
} from 'date-fns';
import ColumnSelector, { useColumnVisibility, useColumnWidths, ColDef } from '../components/ui/ColumnSelector';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  ResizableTableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Input } from '../components/ui/input';
import { useAuth } from '../contexts/AuthContext';
import {
  apiListTasks, apiCreateTask, apiUpdateTask, apiDeleteTask,
  apiBulkDeleteTasks, apiBulkReassignTasks,
  apiListWeeklyTargets, apiCreateWeeklyTarget, apiUpdateWeeklyTarget, apiDeleteWeeklyTarget,
  apiBulkDeleteWeeklyTargets,
  apiListMonthlyTargets, apiCreateMonthlyTarget, apiUpdateMonthlyTarget, apiDeleteMonthlyTarget,
  apiBulkDeleteMonthlyTargets,
  apiListYearlyTargets, apiCreateYearlyTarget, apiUpdateYearlyTarget, apiDeleteYearlyTarget,
  apiBulkDeleteYearlyTargets,
  apiListAssignableUsers,
  type AssignableUser,
} from '../lib/api';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import DatePicker from '../components/ui/DatePicker';
import { AvatarGroup as MemberAvatarGroup } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import AiAssistant from '../components/AiAssistant';

type Status = 'not-started' | 'in-progress' | 'completed' | 'postponed';
type TabKey = 'tasks' | 'weekly' | 'monthly' | 'yearly';
// Read scope for the tasks list. Mirrors backend ?view= param.
//   mine    — assigned to me (or self-created with no assignee)
//   created — I created (regardless of who's assigned)
//   all     — either creator or assignee
type TaskView = 'mine' | 'created' | 'all';
const TASK_VIEW_LABELS: Record<TaskView, string> = {
  mine: 'My tasks',
  created: 'I created',
  all: 'All',
};
type DueRange =
  | 'all'
  | 'past-day'   | 'this-day'   | 'next-day'
  | 'past-week'  | 'this-week'  | 'next-week'
  | 'past-month' | 'this-month' | 'next-month'
  | 'past-year'  | 'this-year'  | 'next-year';

const DUE_RANGE_LABELS: Record<DueRange, string> = {
  'all':         'All due dates',
  'past-day':    'Yesterday',
  'this-day':    'Today',
  'next-day':    'Tomorrow',
  'past-week':   'Last week',
  'this-week':   'This week',
  'next-week':   'Next week',
  'past-month':  'Last month',
  'this-month':  'This month',
  'next-month':  'Next month',
  'past-year':   'Last year',
  'this-year':   'This year',
  'next-year':   'Next year',
};

// Sentinel for "no parent target" in shadcn Select (it disallows empty-string values).
const NONE = '__none__';

interface Task {
  id: string;
  title: string;
  description: string;
  status: Status;
  assignee: string | null; // user id, or null if unassigned
  dueDate: string;
  weeklyTargetId: string | null;
  createdBy: string;       // creator's user id — used to gate edit/delete
  updatedAt: string; // ISO timestamp
}

// User shape now mirrors the backend's `AssignableUser` exactly.
type User = AssignableUser;

// Lightweight member info used to render avatars on shared targets.
interface TargetMemberLite {
  _id: string;
  fullName: string;
  avatarUrl: string | null;
  isOwner: boolean;
}

interface WeeklyTarget {
  id: string;
  title: string;
  description: string;
  monthlyTargetId: string | null;
  createdBy: string;
  isOwner: boolean;             // calling user is the creator
  sharedWith: string[];
  members: TargetMemberLite[];
  progress: number;             // server-computed, per-caller
}

interface MonthlyTarget {
  id: string;
  title: string;
  description: string;
  yearlyTargetId: string | null;
  createdBy: string;
  isOwner: boolean;
  sharedWith: string[];
  members: TargetMemberLite[];
  progress: number;
}

interface YearlyTarget {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  isOwner: boolean;
  sharedWith: string[];
  members: TargetMemberLite[];
  progress: number;
}

const STATUSES: Status[] = ['not-started', 'in-progress', 'completed', 'postponed'];

const STATUS_LABELS: Record<Status, string> = {
  'not-started': 'Not Started',
  'in-progress': 'In Progress',
  completed:     'Done',
  postponed:     'Postponed',
};

const TASK_COLS: ColDef[] = [
  { key: 'task',     label: 'Task',           defaultVisible: true },
  { key: 'status',   label: 'Status',         defaultVisible: true },
  { key: 'assignee', label: 'Assignee',       defaultVisible: true },
  { key: 'due',      label: 'Due Date',       defaultVisible: true },
  { key: 'weekly',   label: 'Weekly Target',  defaultVisible: true },
];

const WEEKLY_COLS: ColDef[] = [
  { key: 'title',    label: 'Weekly Target',   defaultVisible: true },
  { key: 'monthly',  label: 'Monthly Target',  defaultVisible: true },
  { key: 'tasks',    label: 'Tasks',           defaultVisible: true },
  { key: 'progress', label: 'Progress',        defaultVisible: true },
];

const MONTHLY_COLS: ColDef[] = [
  { key: 'title',     label: 'Monthly Target',  defaultVisible: true },
  { key: 'yearly',    label: 'Yearly Target',   defaultVisible: true },
  { key: 'weeklies',  label: 'Weekly Targets',  defaultVisible: true },
  { key: 'progress',  label: 'Progress',        defaultVisible: true },
];

const YEARLY_COLS: ColDef[] = [
  { key: 'title',      label: 'Yearly Target',     defaultVisible: true },
  { key: 'monthlies',  label: 'Monthly Targets',   defaultVisible: true },
  { key: 'progress',   label: 'Progress',          defaultVisible: true },
];

// Default column widths (in pixels). Persisted per-user in localStorage.
const CHECKBOX_COL_WIDTH = 48;
const CHECKBOX_COL_STYLE: React.CSSProperties = { width: CHECKBOX_COL_WIDTH, minWidth: CHECKBOX_COL_WIDTH, maxWidth: CHECKBOX_COL_WIDTH };
const TASK_COL_WIDTHS: Record<string, number> = {
  task: 360, status: 140, assignee: 200, due: 130, weekly: 200,
};
const WEEKLY_COL_WIDTHS: Record<string, number> = {
  title: 320, monthly: 220, tasks: 110, progress: 180,
};
const MONTHLY_COL_WIDTHS: Record<string, number> = {
  title: 320, yearly: 220, weeklies: 200, progress: 180,
};
const YEARLY_COL_WIDTHS: Record<string, number> = {
  title: 360, monthlies: 200, progress: 180,
};

// Sample data removed — tasks, weekly targets, monthly targets and users
// are loaded from the backend on mount.

// Local-draft sentinel: rows that haven't been POSTed yet have an id with this
// prefix, so save handlers know to create rather than update.
const DRAFT_ID_PREFIX = 'draft-';
const isDraftId = (id: string) => id.startsWith(DRAFT_ID_PREFIX);

// Convert backend dueDate (ISO datetime or null) into the page's existing
// 'yyyy-MM-dd' (or '') representation, so existing render code doesn't change.
function dueFromApi(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = parseISO(iso);
  return isValidDate(d) ? format(d, 'yyyy-MM-dd') : '';
}

function mapTaskFromApi(t: {
  _id: string; title: string; description: string; status: Status;
  assignee: string | null; dueDate: string | null; weeklyTargetId: string | null;
  createdBy: string; updatedAt: string;
}): Task {
  return {
    id: t._id,
    title: t.title,
    description: t.description ?? '',
    status: t.status,
    assignee: t.assignee ?? null,
    dueDate: dueFromApi(t.dueDate),
    weeklyTargetId: t.weeklyTargetId ?? null,
    createdBy: t.createdBy,
    updatedAt: t.updatedAt,
  };
}

function mapWeeklyFromApi(w: {
  _id: string; title: string; description: string; monthlyTargetId: string | null;
  createdBy: string; isOwner?: boolean; sharedWith?: string[];
  members?: TargetMemberLite[]; progress?: number;
}): WeeklyTarget {
  return {
    id: w._id,
    title: w.title,
    description: w.description ?? '',
    monthlyTargetId: w.monthlyTargetId ?? null,
    createdBy: w.createdBy,
    isOwner: w.isOwner ?? true,
    sharedWith: w.sharedWith ?? [],
    members: w.members ?? [],
    progress: typeof w.progress === 'number' ? w.progress : 100,
  };
}

function mapMonthlyFromApi(m: {
  _id: string; title: string; description: string; createdBy: string;
  yearlyTargetId?: string | null;
  isOwner?: boolean; sharedWith?: string[]; members?: TargetMemberLite[]; progress?: number;
}): MonthlyTarget {
  return {
    id: m._id,
    title: m.title,
    description: m.description ?? '',
    yearlyTargetId: m.yearlyTargetId ?? null,
    createdBy: m.createdBy,
    isOwner: m.isOwner ?? true,
    sharedWith: m.sharedWith ?? [],
    members: m.members ?? [],
    progress: typeof m.progress === 'number' ? m.progress : 100,
  };
}

function mapYearlyFromApi(y: {
  _id: string; title: string; description: string; createdBy: string;
  isOwner?: boolean; sharedWith?: string[]; members?: TargetMemberLite[]; progress?: number;
}): YearlyTarget {
  return {
    id: y._id,
    title: y.title,
    description: y.description ?? '',
    createdBy: y.createdBy,
    isOwner: y.isOwner ?? true,
    sharedWith: y.sharedWith ?? [],
    members: y.members ?? [],
    progress: typeof y.progress === 'number' ? y.progress : 100,
  };
}

function formatDueDate(iso: string): string {
  if (!iso) return '';
  const d = parseISO(iso);
  return isValidDate(d) ? format(d, 'MMM d, yyyy') : '';
}

function getDueRangeBounds(range: DueRange, now: Date = new Date()): { start: Date; end: Date } | null {
  switch (range) {
    case 'all':         return null;
    case 'past-day':    { const d = subDays(now, 1);   return { start: startOfDay(d),   end: endOfDay(d)   }; }
    case 'this-day':    return { start: startOfDay(now),  end: endOfDay(now)   };
    case 'next-day':    { const d = addDays(now, 1);   return { start: startOfDay(d),   end: endOfDay(d)   }; }
    case 'past-week':   { const d = subWeeks(now, 1);  return { start: startOfWeek(d),  end: endOfWeek(d)  }; }
    case 'this-week':   return { start: startOfWeek(now), end: endOfWeek(now)  };
    case 'next-week':   { const d = addWeeks(now, 1);  return { start: startOfWeek(d),  end: endOfWeek(d)  }; }
    case 'past-month':  { const d = subMonths(now, 1); return { start: startOfMonth(d), end: endOfMonth(d) }; }
    case 'this-month':  return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'next-month':  { const d = addMonths(now, 1); return { start: startOfMonth(d), end: endOfMonth(d) }; }
    case 'past-year':   { const d = subYears(now, 1);  return { start: startOfYear(d),  end: endOfYear(d)  }; }
    case 'this-year':   return { start: startOfYear(now),  end: endOfYear(now)  };
    case 'next-year':   { const d = addYears(now, 1);  return { start: startOfYear(d),  end: endOfYear(d)  }; }
  }
}

// Weekly progress: a weekly target with no daily tasks is considered 100% (nothing to do).
// Adding a task drops it because completed/total shrinks; completing all tasks restores 100%.
function weeklyProgress(weeklyId: string, tasks: Task[]): number {
  const linked = tasks.filter((t) => t.weeklyTargetId === weeklyId);
  if (linked.length === 0) return 100;
  const completed = linked.filter((t) => t.status === 'completed').length;
  return Math.round((completed / linked.length) * 100);
}

// Monthly progress is the average of its linked weekly targets' progress.
function monthlyProgress(monthlyId: string, weeklies: WeeklyTarget[], tasks: Task[]): number {
  const linked = weeklies.filter((w) => w.monthlyTargetId === monthlyId);
  if (linked.length === 0) return 100;
  const sum = linked.reduce((acc, w) => acc + weeklyProgress(w.id, tasks), 0);
  return Math.round(sum / linked.length);
}

function StatusPill({ status, className = '' }: { status: Status; className?: string }) {
  return (
    <span
      className={`inline-flex items-center text-xs font-medium text-t1 bg-surface px-2 py-0.5 rounded ${className}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function StatusSelect({
  value,
  onChange,
  compact = false,
}: {
  value: Status;
  onChange: (s: Status) => void;
  compact?: boolean;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Status)}>
      <SelectTrigger
        onClick={(e) => e.stopPropagation()}
        className={
          compact
            ? 'h-8 w-full px-2 border-transparent shadow-none bg-transparent hover:bg-surface focus:ring-0 focus:border-transparent'
            : 'h-9 bg-surface focus:ring-0 focus:border-border'
        }
      >
        <SelectValue>
          <StatusPill status={value} />
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {STATUS_LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ParentSelect({
  value,
  onChange,
  options,
  placeholder = 'None',
  compact = false,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  options: { id: string; title: string }[];
  placeholder?: string;
  compact?: boolean;
}) {
  return (
    <Select
      value={value ?? NONE}
      onValueChange={(v) => onChange(v === NONE ? null : v)}
    >
      <SelectTrigger
        onClick={(e) => e.stopPropagation()}
        className={
          compact
            ? 'h-8 w-fit max-w-full px-2 border-transparent shadow-none bg-transparent hover:bg-surface focus:ring-0 focus:border-transparent'
            : 'h-9 bg-surface focus:ring-0 focus:border-border'
        }
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>
          <span className="text-t3 italic">None</span>
        </SelectItem>
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.title || <span className="text-t3 italic">Untitled</span>}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-surface-hover rounded-full h-1.5 max-w-32">
        <div
          className="bg-accent h-1.5 rounded-full transition-all"
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs text-t3 w-9 text-right">{value}%</span>
    </div>
  );
}

function Avatar({ name, size = 24 }: { name: string; size?: number }) {
  return (
    <div
      className="rounded-full bg-accent/20 flex items-center justify-center text-accent font-medium shrink-0"
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.42)) }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function AssigneeSelect({
  value,
  onChange,
  users,
  compact = false,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  users: User[];
  compact?: boolean;
}) {
  const user = users.find((u) => u._id === value) ?? null;
  return (
    <Select
      value={value ?? NONE}
      onValueChange={(v) => onChange(v === NONE ? null : v)}
    >
      <SelectTrigger
        onClick={(e) => e.stopPropagation()}
        className={
          compact
            ? 'h-8 w-full px-2 border-transparent shadow-none bg-transparent hover:bg-surface focus:ring-0 focus:border-transparent'
            : 'h-9 bg-surface focus:ring-0 focus:border-border'
        }
      >
        <SelectValue placeholder="Empty">
          {user ? (
            <div className="flex items-center gap-2">
              <Avatar name={user.fullName} size={20} />
              <span className="text-sm text-t1">{user.fullName}</span>
            </div>
          ) : (
            <span className="text-sm text-t3 italic">Unassigned</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="min-w-64">
        <SelectItem value={NONE} className="py-2 px-2">
          <span className="text-sm text-t3 italic">Unassigned</span>
        </SelectItem>
        {users.map((u) => (
          <SelectItem key={u._id} value={u._id} className="py-2 px-2">
            <div className="flex items-center gap-2">
              <Avatar name={u.fullName} size={24} />
              <span className="text-sm text-t1">{u.fullName}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Checkbox({
  checked,
  indeterminate = false,
  onCheckedChange,
  ariaLabel,
  className = '',
}: {
  checked: boolean;
  indeterminate?: boolean;
  onCheckedChange: (v: boolean) => void;
  ariaLabel?: string;
  className?: string;
}) {
  const active = checked || indeterminate;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation();
        onCheckedChange(!checked);
      }}
      className={`w-[18px] h-[18px] rounded-md border flex items-center justify-center shrink-0 transition-all
        ${active
          ? 'bg-accent border-accent text-white shadow-sm'
          : 'bg-card border-border hover:border-accent/60 hover:bg-surface'}
        ${className}`}
    >
      {indeterminate ? (
        <Minus size={12} weight="bold" />
      ) : checked ? (
        <Check size={12} weight="bold" />
      ) : null}
    </button>
  );
}

function EditableTitle({
  value,
  onChange,
  onBlur,
  className = '',
  placeholder = 'Untitled',
  autoFocus = false,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur?: (v: string) => void;
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [editing, setEditing] = useState(autoFocus);
  const [draft, setDraft] = useState(value);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Resize the textarea to fit content. Reset to 'auto' first so shrinking works,
  // then set to scrollHeight.
  const autoSize = useCallback(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    if (editing) {
      taRef.current?.focus();
      taRef.current?.select();
      autoSize();
    }
  }, [editing, autoSize]);

  useEffect(() => {
    if (editing) autoSize();
  }, [draft, editing, autoSize]);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed !== value) onChange(trimmed);
    onBlur?.(trimmed);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
    onBlur?.(value);
  };

  if (editing) {
    return (
      <textarea
        ref={taRef}
        rows={1}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          // Plain Enter commits — Shift+Enter inserts a newline.
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            commit();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            cancel();
          }
        }}
        placeholder={placeholder}
        className={`block w-full min-w-0 bg-surface outline-none rounded px-2 py-1 -mx-2 -my-1 resize-none overflow-hidden leading-snug whitespace-pre-wrap break-all ${className}`}
      />
    );
  }

  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      className={`cursor-text rounded px-2 py-1 -mx-2 -my-1 hover:bg-surface ${className} ${
        !value ? 'text-t3 italic' : ''
      }`}
    >
      {value || placeholder}
    </span>
  );
}

function PropertyRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string; weight?: 'duotone' | 'regular' | 'bold' | 'fill' }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[170px_1fr] items-center gap-3 py-1.5">
      <div className="flex items-center gap-2.5 text-sm text-t2">
        <Icon className="w-[18px] h-[18px] text-t3" weight="duotone" />
        <span>{label}</span>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <TableRow className="pointer-events-none">
      {Array.from({ length: cols }).map((_, i) => (
        <TableCell key={i}>
          <div className="h-4 bg-surface rounded animate-pulse" />
        </TableCell>
      ))}
    </TableRow>
  );
}

// Module-scope cache so navigating away from the page and back doesn't show
// an empty / loading state — we render last-known data instantly and refetch
// silently. Lives until full reload or logout.
type TaskMgmtCacheShape = {
  tasks: Task[];
  weeklies: WeeklyTarget[];
  monthlies: MonthlyTarget[];
  yearlies: YearlyTarget[];
  users: User[];
  taskView: TaskView;
};
let taskMgmtCache: TaskMgmtCacheShape | null = null;

export default function TaskManagement() {
  const [tab, setTab] = useState<TabKey>('tasks');
  // Default to "mine" so users land on their own queue, not their delegations.
  const [taskView, setTaskView] = useState<TaskView>(taskMgmtCache?.taskView ?? 'mine');

  const { user: currentUser } = useAuth();
  const currentUserId = (currentUser as { _id?: string } | null)?._id ?? null;
  const [tasks, setTasks] = useState<Task[]>(taskMgmtCache?.tasks ?? []);
  const [weeklies, setWeeklies] = useState<WeeklyTarget[]>(taskMgmtCache?.weeklies ?? []);
  const [monthlies, setMonthlies] = useState<MonthlyTarget[]>(taskMgmtCache?.monthlies ?? []);
  const [yearlies, setYearlies] = useState<YearlyTarget[]>(taskMgmtCache?.yearlies ?? []);
  const [users, setUsers] = useState<User[]>(taskMgmtCache?.users ?? []);
  // Skip the loading state when we have cached data — the silent background
  // refetch below will update everything if anything changed.
  const [loading, setLoading] = useState(!taskMgmtCache);

  // Keep the module cache in sync so the next mount has the latest data.
  useEffect(() => {
    taskMgmtCache = { tasks, weeklies, monthlies, yearlies, users, taskView };
  }, [tasks, weeklies, monthlies, yearlies, users, taskView]);

  const getUser = useCallback(
    (id: string | null): User | null => (id ? users.find((u) => u._id === id) ?? null : null),
    [users],
  );

  // Load everything from the backend on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [tasksRes, weeklyRes, monthlyRes, yearlyRes, usersRes] = await Promise.all([
          apiListTasks({ view: taskView }),
          apiListWeeklyTargets(),
          apiListMonthlyTargets(),
          apiListYearlyTargets(),
          apiListAssignableUsers(),
        ]);
        if (cancelled) return;
        if (tasksRes.success && tasksRes.data) setTasks(tasksRes.data.tasks.map(mapTaskFromApi));
        if (weeklyRes.success && weeklyRes.data) setWeeklies(weeklyRes.data.weeklyTargets.map(mapWeeklyFromApi));
        if (monthlyRes.success && monthlyRes.data) setMonthlies(monthlyRes.data.monthlyTargets.map(mapMonthlyFromApi));
        if (yearlyRes.success && yearlyRes.data) setYearlies(yearlyRes.data.yearlyTargets.map(mapYearlyFromApi));
        if (usersRes.success && usersRes.data) setUsers(usersRes.data.users);
      } catch (err) {
        console.error('Failed to load task management data', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch tasks when the read scope changes — switching from "My tasks" to
  // "I created" / "All" must hit the backend so we get the right rows. We
  // skip the very first run (handled by the mount effect above).
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; return; }
    let cancelled = false;
    apiListTasks({ view: taskView })
      .then((r) => { if (!cancelled && r.success && r.data) setTasks(r.data.tasks.map(mapTaskFromApi)); })
      .catch((e) => console.error('apiListTasks (view change) failed', e));
    return () => { cancelled = true; };
  }, [taskView]);

  // Refetch when the AI assistant inserts new tasks.
  useEffect(() => {
    const handler = () => {
      apiListTasks({ view: taskView })
        .then((r) => { if (r.success && r.data) setTasks(r.data.tasks.map(mapTaskFromApi)); })
        .catch((e) => console.error('apiListTasks (ai-insert refresh) failed', e));
    };
    window.addEventListener('tekaccess:tasks-refresh', handler);
    return () => window.removeEventListener('tekaccess:tasks-refresh', handler);
  }, [taskView]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFunnel, setStatusFunnel] = useState<string>('all');
  const [dueRange, setDueRange] = useState<DueRange>('this-day');
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedWeeklyId, setSelectedWeeklyId] = useState<string | null>(null);
  const [selectedMonthlyId, setSelectedMonthlyId] = useState<string | null>(null);
  const [selectedYearlyId, setSelectedYearlyId] = useState<string | null>(null);

  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [selectedWeeklyIds, setSelectedWeeklyIds] = useState<Set<string>>(new Set());
  const [selectedMonthlyIds, setSelectedMonthlyIds] = useState<Set<string>>(new Set());
  const [selectedYearlyIds, setSelectedYearlyIds] = useState<Set<string>>(new Set());

  // Inline-add: ID of the row currently in "fresh empty" mode. Auto-removed on blur if title is still empty.
  const [inlineDraftTaskId, setInlineDraftTaskId] = useState<string | null>(null);
  const [inlineDraftWeeklyId, setInlineDraftWeeklyId] = useState<string | null>(null);
  const [inlineDraftMonthlyId, setInlineDraftMonthlyId] = useState<string | null>(null);
  const [inlineDraftYearlyId, setInlineDraftYearlyId] = useState<string | null>(null);

  const activeSelected =
    tab === 'tasks'   ? selectedTaskIds   :
    tab === 'weekly'  ? selectedWeeklyIds :
    tab === 'monthly' ? selectedMonthlyIds :
                        selectedYearlyIds;

  const setActiveSelected =
    tab === 'tasks'   ? setSelectedTaskIds   :
    tab === 'weekly'  ? setSelectedWeeklyIds :
    tab === 'monthly' ? setSelectedMonthlyIds :
                        setSelectedYearlyIds;

  const activeNoun =
    tab === 'tasks'   ? (activeSelected.size === 1 ? 'task'           : 'tasks') :
    tab === 'weekly'  ? (activeSelected.size === 1 ? 'weekly target'  : 'weekly targets') :
    tab === 'monthly' ? (activeSelected.size === 1 ? 'monthly target' : 'monthly targets') :
                        (activeSelected.size === 1 ? 'yearly target'  : 'yearly targets');

  const isNewItemRef = useRef(false);

  const { visible: taskColVis, toggle: taskColToggle } = useColumnVisibility('task-management', TASK_COLS);
  const { visible: weeklyColVis, toggle: weeklyColToggle } = useColumnVisibility('weekly-targets', WEEKLY_COLS);
  const { visible: monthlyColVis, toggle: monthlyColToggle } = useColumnVisibility('monthly-targets', MONTHLY_COLS);
  const { visible: yearlyColVis, toggle: yearlyColToggle } = useColumnVisibility('yearly-targets', YEARLY_COLS);

  const { widths: taskColW, setWidth: setTaskColW } = useColumnWidths('task-management', TASK_COL_WIDTHS);
  const { widths: weeklyColW, setWidth: setWeeklyColW } = useColumnWidths('weekly-targets', WEEKLY_COL_WIDTHS);
  const { widths: monthlyColW, setWidth: setMonthlyColW } = useColumnWidths('monthly-targets', MONTHLY_COL_WIDTHS);
  const { widths: yearlyColW, setWidth: setYearlyColW } = useColumnWidths('yearly-targets', YEARLY_COL_WIDTHS);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;
  const selectedWeekly = weeklies.find((w) => w.id === selectedWeeklyId) ?? null;
  const selectedMonthly = monthlies.find((m) => m.id === selectedMonthlyId) ?? null;
  const selectedYearly = yearlies.find((y) => y.id === selectedYearlyId) ?? null;

  const weeklyOptions = useMemo(() => weeklies.map((w) => ({ id: w.id, title: w.title })), [weeklies]);
  const monthlyOptions = useMemo(() => monthlies.map((m) => ({ id: m.id, title: m.title })), [monthlies]);
  const yearlyOptions = useMemo(() => yearlies.map((y) => ({ id: y.id, title: y.title })), [yearlies]);

  const dueBounds = useMemo(() => getDueRangeBounds(dueRange), [dueRange]);

  const filteredTasks = tasks.filter((task) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      task.title.toLowerCase().includes(q) ||
      task.description.toLowerCase().includes(q);
    const matchesStatus = statusFunnel === 'all' || task.status === statusFunnel;
    let matchesDue = true;
    if (dueBounds) {
      if (!task.dueDate) {
        matchesDue = false;
      } else {
        const d = parseISO(task.dueDate);
        matchesDue = isValidDate(d) && isWithinInterval(d, dueBounds);
      }
    }
    return matchesSearch && matchesStatus && matchesDue;
  });

  const filteredWeeklies = weeklies.filter((w) => {
    const q = searchTerm.toLowerCase();
    return w.title.toLowerCase().includes(q) || w.description.toLowerCase().includes(q);
  });

  const filteredMonthlies = monthlies.filter((m) => {
    const q = searchTerm.toLowerCase();
    return m.title.toLowerCase().includes(q) || m.description.toLowerCase().includes(q);
  });

  const filteredYearlies = yearlies.filter((y) => {
    const q = searchTerm.toLowerCase();
    return y.title.toLowerCase().includes(q) || y.description.toLowerCase().includes(q);
  });

  // Optimistic local update + fire PATCH if the row is server-side. Drafts stay
  // local until they're committed (see commitDraftTask / closeTaskPanel).
  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t)),
    );
    if (isDraftId(id)) return;
    const payload: Record<string, unknown> = { ...patch };
    if ('dueDate' in patch) payload.dueDate = patch.dueDate ? patch.dueDate : null;
    apiUpdateTask(id, payload).catch((e) => console.error('apiUpdateTask failed', e));
  }, []);

  const updateWeekly = useCallback((id: string, patch: Partial<WeeklyTarget>) => {
    setWeeklies((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)));
    if (isDraftId(id)) return;
    apiUpdateWeeklyTarget(id, patch as Record<string, unknown>).catch((e) =>
      console.error('apiUpdateWeeklyTarget failed', e),
    );
  }, []);

  const updateMonthly = useCallback((id: string, patch: Partial<MonthlyTarget>) => {
    setMonthlies((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    if (isDraftId(id)) return;
    apiUpdateMonthlyTarget(id, patch as Record<string, unknown>).catch((e) =>
      console.error('apiUpdateMonthlyTarget failed', e),
    );
  }, []);

  const updateYearly = useCallback((id: string, patch: Partial<YearlyTarget>) => {
    setYearlies((prev) => prev.map((y) => (y.id === id ? { ...y, ...patch } : y)));
    if (isDraftId(id)) return;
    apiUpdateYearlyTarget(id, patch as Record<string, unknown>).catch((e) =>
      console.error('apiUpdateYearlyTarget failed', e),
    );
  }, []);

  const setToggle = (
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
    id: string,
    v: boolean,
  ) => setter((prev) => {
    const next = new Set(prev);
    if (v) next.add(id); else next.delete(id);
    return next;
  });

  const setToggleAll = (
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
    ids: string[],
    v: boolean,
  ) => setter((prev) => {
    const next = new Set(prev);
    ids.forEach((id) => (v ? next.add(id) : next.delete(id)));
    return next;
  });

  const handleBulkReassign = (userId: string | null) => {
    if (tab !== 'tasks' || selectedTaskIds.size === 0) return;
    const ids = [...selectedTaskIds];
    const nonDraft = ids.filter((id) => !isDraftId(id));
    const now = new Date().toISOString();
    setTasks((prev) =>
      prev.map((t) =>
        selectedTaskIds.has(t.id) ? { ...t, assignee: userId, updatedAt: now } : t,
      ),
    );
    setSelectedTaskIds(new Set());
    if (nonDraft.length > 0) {
      apiBulkReassignTasks(nonDraft, userId).catch((e) => console.error('apiBulkReassignTasks failed', e));
    }
  };

  const handleBulkDelete = () => {
    if (tab === 'tasks') {
      const ids = [...selectedTaskIds];
      const nonDraft = ids.filter((id) => !isDraftId(id));
      setTasks((prev) => prev.filter((t) => !selectedTaskIds.has(t.id)));
      setSelectedTaskIds(new Set());
      if (nonDraft.length > 0) apiBulkDeleteTasks(nonDraft).catch((e) => console.error('apiBulkDeleteTasks failed', e));
    } else if (tab === 'weekly') {
      const ids = selectedWeeklyIds;
      const nonDraft = [...ids].filter((id) => !isDraftId(id));
      setTasks((prev) =>
        prev.map((t) => (t.weeklyTargetId && ids.has(t.weeklyTargetId) ? { ...t, weeklyTargetId: null } : t)),
      );
      setWeeklies((prev) => prev.filter((w) => !ids.has(w.id)));
      setSelectedWeeklyIds(new Set());
      if (nonDraft.length > 0) apiBulkDeleteWeeklyTargets(nonDraft).catch((e) => console.error('apiBulkDeleteWeeklyTargets failed', e));
    } else {
      const ids = selectedMonthlyIds;
      const nonDraft = [...ids].filter((id) => !isDraftId(id));
      setWeeklies((prev) =>
        prev.map((w) => (w.monthlyTargetId && ids.has(w.monthlyTargetId) ? { ...w, monthlyTargetId: null } : w)),
      );
      setMonthlies((prev) => prev.filter((m) => !ids.has(m.id)));
      setSelectedMonthlyIds(new Set());
      if (nonDraft.length > 0) apiBulkDeleteMonthlyTargets(nonDraft).catch((e) => console.error('apiBulkDeleteMonthlyTargets failed', e));
    }
  };

  // Generate a draft id. Real ids come from the backend on commit, and rows
  // tagged with DRAFT_ID_PREFIX never trigger a PATCH (only a POST on commit).
  const newDraftId = (kind: string) => {
    const random =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return `${DRAFT_ID_PREFIX}${kind}-${random}`;
  };

  // Replace a draft row's local id with the real id from the backend, also
  // updating any state that referenced the draft id.
  const swapDraftTaskId = (draftId: string, real: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === draftId ? real : t)));
    setSelectedTaskId((cur) => (cur === draftId ? real.id : cur));
    setInlineDraftTaskId((cur) => (cur === draftId ? null : cur));
  };
  const swapDraftWeeklyId = (draftId: string, real: WeeklyTarget) => {
    setWeeklies((prev) => prev.map((w) => (w.id === draftId ? real : w)));
    setSelectedWeeklyId((cur) => (cur === draftId ? real.id : cur));
    setInlineDraftWeeklyId((cur) => (cur === draftId ? null : cur));
  };
  const swapDraftMonthlyId = (draftId: string, real: MonthlyTarget) => {
    setMonthlies((prev) => prev.map((m) => (m.id === draftId ? real : m)));
    setSelectedMonthlyId((cur) => (cur === draftId ? real.id : cur));
    setInlineDraftMonthlyId((cur) => (cur === draftId ? null : cur));
  };
  const swapDraftYearlyId = (draftId: string, real: YearlyTarget) => {
    setYearlies((prev) => prev.map((y) => (y.id === draftId ? real : y)));
    setSelectedYearlyId((cur) => (cur === draftId ? real.id : cur));
    setInlineDraftYearlyId((cur) => (cur === draftId ? null : cur));
  };

  const commitTaskDraft = async (draft: Task) => {
    try {
      const res = await apiCreateTask({
        title: draft.title.trim(),
        description: draft.description,
        status: draft.status,
        assignee: draft.assignee,
        dueDate: draft.dueDate || null,
        weeklyTargetId: draft.weeklyTargetId,
      } as Record<string, unknown>);
      if (res.success && res.data) swapDraftTaskId(draft.id, mapTaskFromApi(res.data.task));
      else {
        console.error('Create task failed:', res.message);
        setTasks((prev) => prev.filter((t) => t.id !== draft.id));
      }
    } catch (e) {
      console.error('apiCreateTask failed', e);
      setTasks((prev) => prev.filter((t) => t.id !== draft.id));
    }
  };

  const commitWeeklyDraft = async (draft: WeeklyTarget) => {
    try {
      const res = await apiCreateWeeklyTarget({
        title: draft.title.trim(),
        description: draft.description,
        monthlyTargetId: draft.monthlyTargetId,
      } as Record<string, unknown>);
      if (res.success && res.data) swapDraftWeeklyId(draft.id, mapWeeklyFromApi(res.data.weeklyTarget));
      else {
        console.error('Create weekly target failed:', res.message);
        setWeeklies((prev) => prev.filter((w) => w.id !== draft.id));
      }
    } catch (e) {
      console.error('apiCreateWeeklyTarget failed', e);
      setWeeklies((prev) => prev.filter((w) => w.id !== draft.id));
    }
  };

  const commitMonthlyDraft = async (draft: MonthlyTarget) => {
    try {
      const res = await apiCreateMonthlyTarget({
        title: draft.title.trim(),
        description: draft.description,
        yearlyTargetId: draft.yearlyTargetId,
      } as Record<string, unknown>);
      if (res.success && res.data) swapDraftMonthlyId(draft.id, mapMonthlyFromApi(res.data.monthlyTarget));
      else {
        console.error('Create monthly target failed:', res.message);
        setMonthlies((prev) => prev.filter((m) => m.id !== draft.id));
      }
    } catch (e) {
      console.error('apiCreateMonthlyTarget failed', e);
      setMonthlies((prev) => prev.filter((m) => m.id !== draft.id));
    }
  };

  const commitYearlyDraft = async (draft: YearlyTarget) => {
    try {
      const res = await apiCreateYearlyTarget({
        title: draft.title.trim(),
        description: draft.description,
      } as Record<string, unknown>);
      if (res.success && res.data) swapDraftYearlyId(draft.id, mapYearlyFromApi(res.data.yearlyTarget));
      else {
        console.error('Create yearly target failed:', res.message);
        setYearlies((prev) => prev.filter((y) => y.id !== draft.id));
      }
    } catch (e) {
      console.error('apiCreateYearlyTarget failed', e);
      setYearlies((prev) => prev.filter((y) => y.id !== draft.id));
    }
  };

  // Defaults for the new shared-target fields on locally-created drafts.
  // Drafts are always owned by the current user; sharing is added later via
  // the edit panel after the row is committed to the backend.
  const draftTaskDefaults = (): Pick<Task, 'createdBy'> => ({
    createdBy: currentUserId ?? '',
  });
  const draftWeeklyDefaults = (): Pick<WeeklyTarget, 'createdBy' | 'isOwner' | 'sharedWith' | 'members' | 'progress'> => ({
    createdBy: currentUserId ?? '',
    isOwner: true,
    sharedWith: [],
    members: [],
    progress: 100,
  });
  const draftMonthlyDefaults = (): Pick<MonthlyTarget, 'createdBy' | 'isOwner' | 'sharedWith' | 'members' | 'progress'> => ({
    createdBy: currentUserId ?? '',
    isOwner: true,
    sharedWith: [],
    members: [],
    progress: 100,
  });
  const draftYearlyDefaults = (): Pick<YearlyTarget, 'createdBy' | 'isOwner' | 'sharedWith' | 'members' | 'progress'> => ({
    createdBy: currentUserId ?? '',
    isOwner: true,
    sharedWith: [],
    members: [],
    progress: 100,
  });

  const handleNewTask = () => {
    const id = newDraftId('task');
    const newTask: Task = {
      id,
      title: '',
      description: '',
      status: 'not-started',
      assignee: currentUser?.id ?? null,
      dueDate: format(new Date(), 'yyyy-MM-dd'),
      weeklyTargetId: null,
      updatedAt: new Date().toISOString(),
      ...draftTaskDefaults(),
    };
    isNewItemRef.current = true;
    setTasks((prev) => [newTask, ...prev]);
    setSelectedTaskId(id);
  };

  const handleNewWeekly = () => {
    const id = newDraftId('weekly');
    const newWeekly: WeeklyTarget = {
      id,
      title: '',
      description: '',
      monthlyTargetId: null,
      ...draftWeeklyDefaults(),
    };
    isNewItemRef.current = true;
    setWeeklies((prev) => [newWeekly, ...prev]);
    setSelectedWeeklyId(id);
  };

  const handleNewMonthly = () => {
    const id = newDraftId('monthly');
    const newMonthly: MonthlyTarget = { id, title: '', description: '', yearlyTargetId: null, ...draftMonthlyDefaults() };
    isNewItemRef.current = true;
    setMonthlies((prev) => [newMonthly, ...prev]);
    setSelectedMonthlyId(id);
  };

  const handleNewYearly = () => {
    const id = newDraftId('yearly');
    const newYearly: YearlyTarget = { id, title: '', description: '', ...draftYearlyDefaults() };
    isNewItemRef.current = true;
    setYearlies((prev) => [newYearly, ...prev]);
    setSelectedYearlyId(id);
  };

  const addInlineTask = () => {
    const id = newDraftId('task');
    setTasks((prev) => [
      ...prev,
      {
        id, title: '', description: '', status: 'not-started',
        assignee: currentUser?.id ?? null,
        dueDate: format(new Date(), 'yyyy-MM-dd'),
        weeklyTargetId: null, updatedAt: new Date().toISOString(),
        ...draftTaskDefaults(),
      },
    ]);
    setInlineDraftTaskId(id);
  };

  const addInlineWeekly = () => {
    const id = newDraftId('weekly');
    setWeeklies((prev) => [...prev, { id, title: '', description: '', monthlyTargetId: null, ...draftWeeklyDefaults() }]);
    setInlineDraftWeeklyId(id);
  };

  const addInlineMonthly = () => {
    const id = newDraftId('monthly');
    setMonthlies((prev) => [...prev, { id, title: '', description: '', yearlyTargetId: null, ...draftMonthlyDefaults() }]);
    setInlineDraftMonthlyId(id);
  };

  const addInlineYearly = () => {
    const id = newDraftId('yearly');
    setYearlies((prev) => [...prev, { id, title: '', description: '', ...draftYearlyDefaults() }]);
    setInlineDraftYearlyId(id);
  };

  // Inline-add drafts always commit on blur — empty title is allowed and
  // persists as a placeholder row the user can fill in later.
  // Note: do the lookup OUTSIDE the setState updater so the API call fires
  // exactly once (StrictMode invokes updater functions twice in dev).
  const onTaskDraftBlur = (id: string, value: string) => {
    if (inlineDraftTaskId !== id) return;
    setInlineDraftTaskId(null);
    const draft = tasks.find((t) => t.id === id);
    if (!draft) return;
    commitTaskDraft({ ...draft, title: value });
  };

  const onWeeklyDraftBlur = (id: string, value: string) => {
    if (inlineDraftWeeklyId !== id) return;
    setInlineDraftWeeklyId(null);
    const draft = weeklies.find((w) => w.id === id);
    if (!draft) return;
    commitWeeklyDraft({ ...draft, title: value });
  };

  const onMonthlyDraftBlur = (id: string, value: string) => {
    if (inlineDraftMonthlyId !== id) return;
    setInlineDraftMonthlyId(null);
    const draft = monthlies.find((m) => m.id === id);
    if (!draft) return;
    commitMonthlyDraft({ ...draft, title: value });
  };

  const onYearlyDraftBlur = (id: string, value: string) => {
    if (inlineDraftYearlyId !== id) return;
    setInlineDraftYearlyId(null);
    const draft = yearlies.find((y) => y.id === id);
    if (!draft) return;
    commitYearlyDraft({ ...draft, title: value });
  };

  const closeTaskPanel = () => {
    const t = selectedTask;
    if (t && isDraftId(t.id)) {
      if (!t.title.trim()) setTasks((prev) => prev.filter((x) => x.id !== t.id));
      else commitTaskDraft(t);
    }
    isNewItemRef.current = false;
    setSelectedTaskId(null);
  };

  const deleteSelectedTask = () => {
    if (!selectedTask) return;
    const id = selectedTask.id;
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setSelectedTaskIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    isNewItemRef.current = false;
    setSelectedTaskId(null);
    if (!isDraftId(id)) apiDeleteTask(id).catch((e) => console.error('apiDeleteTask failed', e));
  };

  const closeWeeklyPanel = () => {
    const w = selectedWeekly;
    if (w && isDraftId(w.id)) {
      if (!w.title.trim()) setWeeklies((prev) => prev.filter((x) => x.id !== w.id));
      else commitWeeklyDraft(w);
    }
    isNewItemRef.current = false;
    setSelectedWeeklyId(null);
  };

  const closeMonthlyPanel = () => {
    const m = selectedMonthly;
    if (m && isDraftId(m.id)) {
      if (!m.title.trim()) setMonthlies((prev) => prev.filter((x) => x.id !== m.id));
      else commitMonthlyDraft(m);
    }
    isNewItemRef.current = false;
    setSelectedMonthlyId(null);
  };

  const closeYearlyPanel = () => {
    const y = selectedYearly;
    if (y && isDraftId(y.id)) {
      if (!y.title.trim()) setYearlies((prev) => prev.filter((x) => x.id !== y.id));
      else commitYearlyDraft(y);
    }
    isNewItemRef.current = false;
    setSelectedYearlyId(null);
  };

  const onPrimaryAdd = () => {
    if (tab === 'tasks') handleNewTask();
    else if (tab === 'weekly') handleNewWeekly();
    else if (tab === 'monthly') handleNewMonthly();
    else handleNewYearly();
  };

  const primaryAddLabel =
    tab === 'tasks'   ? 'New Task' :
    tab === 'weekly'  ? 'New Weekly Target' :
    tab === 'monthly' ? 'New Monthly Target' :
                        'New Yearly Target';

  const TABS: { k: TabKey; label: string }[] = [
    { k: 'tasks',   label: 'Daily Tasks' },
    { k: 'weekly',  label: 'Weekly Targets' },
    { k: 'monthly', label: 'Monthly Targets' },
    { k: 'yearly',  label: 'Yearly Targets' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-t1">Task Management</h2>
          <p className="text-sm text-t2 mt-1">
            Daily → weekly → monthly → yearly.
          </p>
        </div>
        <button
          onClick={onPrimaryAdd}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent-h transition-colors"
        >
          <Plus className="w-4 h-4" />
          {primaryAddLabel}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-card rounded-xl border border-border p-1 w-fit">
          {TABS.map(({ k, label }) => {
            const active = tab === k;
            return (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  active ? 'bg-accent-glow text-accent' : 'text-t2 hover:bg-surface'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

      </div>

      {/* Tasks: at-a-glance count tiles. Cheap, derived client-side. */}
      {tab === 'tasks' && (() => {
        const today = startOfDay(new Date());
        const tomorrow = endOfDay(today);
        let dueToday = 0, overdue = 0, openCount = 0;
        for (const t of tasks) {
          if (t.status === 'completed' || t.status === 'postponed') continue;
          openCount += 1;
          if (!t.dueDate) continue;
          const d = parseISO(t.dueDate);
          if (!isValidDate(d)) continue;
          if (d < today) overdue += 1;
          else if (d <= tomorrow) dueToday += 1;
        }
        const completed = tasks.filter((t) => t.status === 'completed').length;
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-card rounded-xl border border-border px-4 py-3">
              <p className="text-[11px] uppercase tracking-widest text-t3 font-bold">Open</p>
              <p className="text-2xl font-bold text-t1 mt-0.5">{openCount}</p>
            </div>
            <div className="bg-card rounded-xl border border-border px-4 py-3">
              <p className="text-[11px] uppercase tracking-widest text-t3 font-bold">Due today</p>
              <p className={`text-2xl font-bold mt-0.5 ${dueToday > 0 ? 'text-amber-500' : 'text-t1'}`}>{dueToday}</p>
            </div>
            <div className="bg-card rounded-xl border border-border px-4 py-3">
              <p className="text-[11px] uppercase tracking-widest text-t3 font-bold">Overdue</p>
              <p className={`text-2xl font-bold mt-0.5 ${overdue > 0 ? 'text-rose-400' : 'text-t1'}`}>{overdue}</p>
            </div>
            <div className="bg-card rounded-xl border border-border px-4 py-3">
              <p className="text-[11px] uppercase tracking-widest text-t3 font-bold">Done</p>
              <p className="text-2xl font-bold text-emerald-400 mt-0.5">{completed}</p>
            </div>
          </div>
        );
      })()}

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative w-full sm:w-64">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-t3 pointer-events-none" />
            <Input
              type="text"
              placeholder={
                tab === 'tasks'   ? 'Search tasks...'
              : tab === 'weekly'  ? 'Search weekly targets...'
              : tab === 'monthly' ? 'Search monthly targets...'
                                  : 'Search yearly targets...'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {tab === 'tasks' && (
            <>
              <Select value={statusFunnel} onValueChange={setStatusFunnel}>
                <SelectTrigger className="h-9 min-w-40 focus:ring-0 focus:border-border">
                  <SelectValue placeholder="All status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={dueRange} onValueChange={(v) => setDueRange(v as DueRange)}>
                <SelectTrigger className="h-9 min-w-44 focus:ring-0 focus:border-border">
                  <SelectValue placeholder="All due dates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{DUE_RANGE_LABELS['all']}</SelectItem>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel>Past</SelectLabel>
                    <SelectItem value="past-day">{DUE_RANGE_LABELS['past-day']}</SelectItem>
                    <SelectItem value="past-week">{DUE_RANGE_LABELS['past-week']}</SelectItem>
                    <SelectItem value="past-month">{DUE_RANGE_LABELS['past-month']}</SelectItem>
                    <SelectItem value="past-year">{DUE_RANGE_LABELS['past-year']}</SelectItem>
                  </SelectGroup>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel>Current</SelectLabel>
                    <SelectItem value="this-day">{DUE_RANGE_LABELS['this-day']}</SelectItem>
                    <SelectItem value="this-week">{DUE_RANGE_LABELS['this-week']}</SelectItem>
                    <SelectItem value="this-month">{DUE_RANGE_LABELS['this-month']}</SelectItem>
                    <SelectItem value="this-year">{DUE_RANGE_LABELS['this-year']}</SelectItem>
                  </SelectGroup>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel>Upcoming</SelectLabel>
                    <SelectItem value="next-day">{DUE_RANGE_LABELS['next-day']}</SelectItem>
                    <SelectItem value="next-week">{DUE_RANGE_LABELS['next-week']}</SelectItem>
                    <SelectItem value="next-month">{DUE_RANGE_LABELS['next-month']}</SelectItem>
                    <SelectItem value="next-year">{DUE_RANGE_LABELS['next-year']}</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>

              <div className="flex border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setViewMode('list')}
                  aria-label="List view"
                  title="List view"
                  className={`px-3 py-2 transition-colors ${
                    viewMode === 'list' ? 'bg-accent text-white' : 'bg-card text-t2 hover:bg-surface'
                  }`}
                >
                  <ListIcon className="w-4 h-4" weight="bold" />
                </button>
                <button
                  onClick={() => setViewMode('board')}
                  aria-label="Board view"
                  title="Board view"
                  className={`px-3 py-2 transition-colors ${
                    viewMode === 'board' ? 'bg-accent text-white' : 'bg-card text-t2 hover:bg-surface'
                  }`}
                >
                  <Kanban className="w-4 h-4" weight="bold" />
                </button>
              </div>
            </>
          )}

          {tab === 'tasks' && viewMode === 'list' && (
            <ColumnSelector cols={TASK_COLS} visible={taskColVis} onToggle={taskColToggle} />
          )}
          {tab === 'weekly' && (
            <ColumnSelector cols={WEEKLY_COLS} visible={weeklyColVis} onToggle={weeklyColToggle} />
          )}
          {tab === 'monthly' && (
            <ColumnSelector cols={MONTHLY_COLS} visible={monthlyColVis} onToggle={monthlyColToggle} />
          )}
          {tab === 'yearly' && (
            <ColumnSelector cols={YEARLY_COLS} visible={yearlyColVis} onToggle={yearlyColToggle} />
          )}
        </div>
      </div>

      {/* TASKS — List View */}
      {tab === 'tasks' && viewMode === 'list' && (() => {
        const visibleIds = filteredTasks.map((t) => t.id);
        const allChecked = visibleIds.length > 0 && visibleIds.every((id) => selectedTaskIds.has(id));
        const someChecked = visibleIds.some((id) => selectedTaskIds.has(id));
        const visibleCols =
          (taskColVis.has('task')     ? 1 : 0) +
          (taskColVis.has('status')   ? 1 : 0) +
          (taskColVis.has('assignee') ? 1 : 0) +
          (taskColVis.has('due')      ? 1 : 0) +
          (taskColVis.has('weekly')   ? 1 : 0) +
          1; // checkbox column
        return (
          <div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <Table style={{ tableLayout: 'fixed', minWidth: 0 }}>
              <colgroup>
                <col style={CHECKBOX_COL_STYLE} />
                {taskColVis.has('task')     && <col style={{ width: taskColW.task }} />}
                {taskColVis.has('status')   && <col style={{ width: taskColW.status }} />}
                {taskColVis.has('assignee') && <col style={{ width: taskColW.assignee }} />}
                {taskColVis.has('due')      && <col style={{ width: taskColW.due }} />}
                {taskColVis.has('weekly')   && <col style={{ width: taskColW.weekly }} />}
                <col />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead style={CHECKBOX_COL_STYLE}>
                    <Checkbox
                      checked={allChecked}
                      indeterminate={!allChecked && someChecked}
                      onCheckedChange={(v) => setToggleAll(setSelectedTaskIds, visibleIds, v)}
                      ariaLabel="Select all tasks"
                    />
                  </TableHead>
                  {taskColVis.has('task')     && (
                    <ResizableTableHead width={taskColW.task} onWidthChange={(w) => setTaskColW('task', w)}>Task</ResizableTableHead>
                  )}
                  {taskColVis.has('status')   && (
                    <ResizableTableHead width={taskColW.status} onWidthChange={(w) => setTaskColW('status', w)}>Status</ResizableTableHead>
                  )}
                  {taskColVis.has('assignee') && (
                    <ResizableTableHead width={taskColW.assignee} onWidthChange={(w) => setTaskColW('assignee', w)}>Assignee</ResizableTableHead>
                  )}
                  {taskColVis.has('due')      && (
                    <ResizableTableHead width={taskColW.due} onWidthChange={(w) => setTaskColW('due', w)}>Due</ResizableTableHead>
                  )}
                  {taskColVis.has('weekly')   && (
                    <ResizableTableHead width={taskColW.weekly} onWidthChange={(w) => setTaskColW('weekly', w)}>Weekly Target</ResizableTableHead>
                  )}
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.map((task) => {
                  const selected = selectedTaskIds.has(task.id);
                  return (
                    <TableRow
                      key={task.id}
                      data-state={selected ? 'selected' : undefined}
                      onClick={() => setSelectedTaskId(task.id)}
                      className="cursor-pointer"
                    >
                      <TableCell style={CHECKBOX_COL_STYLE} onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selected}
                          onCheckedChange={(v) => setToggle(setSelectedTaskIds, task.id, v)}
                          ariaLabel={`Select ${task.title || 'task'}`}
                        />
                      </TableCell>
                      {taskColVis.has('task') && (
                        <TableCell className="whitespace-normal break-all">
                          <EditableTitle
                            value={task.title}
                            onChange={(v) => updateTask(task.id, { title: v })}
                            className="text-sm font-medium text-t1"
                            placeholder="Task title"
                            autoFocus={inlineDraftTaskId === task.id}
                            onBlur={
                              inlineDraftTaskId === task.id
                                ? (v) => onTaskDraftBlur(task.id, v)
                                : undefined
                            }
                          />
                        </TableCell>
                      )}
                      {taskColVis.has('status') && (
                        <TableCell>
                          <StatusSelect
                            value={task.status}
                            onChange={(s) => updateTask(task.id, { status: s })}
                            compact
                          />
                        </TableCell>
                      )}
                      {taskColVis.has('assignee') && (
                        <TableCell>
                          {(() => {
                            const u = getUser(task.assignee);
                            return u ? (
                              <div className="flex items-center gap-2">
                                <Avatar name={u.fullName} size={24} />
                                <span className="text-sm text-t2">{u.fullName}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-t3 italic">Unassigned</span>
                            );
                          })()}
                        </TableCell>
                      )}
                      {taskColVis.has('due') && (
                        <TableCell className="px-2" onClick={(e) => e.stopPropagation()}>
                          <DatePicker
                            value={task.dueDate ? parseISO(task.dueDate) : null}
                            onChange={(d) =>
                              updateTask(task.id, { dueDate: d ? format(d, 'yyyy-MM-dd') : '' })
                            }
                            placeholder="—"
                            compact
                          />
                        </TableCell>
                      )}
                      {taskColVis.has('weekly') && (
                        <TableCell className="px-2">
                          <ParentSelect
                            value={task.weeklyTargetId}
                            onChange={(id) => updateTask(task.id, { weeklyTargetId: id })}
                            options={weeklyOptions}
                            placeholder="None"
                            compact
                          />
                        </TableCell>
                      )}
                      <TableCell />
                    </TableRow>
                  );
                })}
                {filteredTasks.length === 0 && loading && (
                  Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={`sk-${i}`} cols={visibleCols + 1} />)
                )}
                {filteredTasks.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={visibleCols + 1} className="py-12 text-center text-sm text-t3">
                      No tasks match your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <button
            onClick={addInlineTask}
            className="mt-2 flex items-center gap-2 px-3 py-2 text-sm text-t3 hover:text-t1 hover:bg-surface rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" weight="bold" />
            New task
          </button>
          </div>
        );
      })()}

      {/* TASKS — Board View */}
      {tab === 'tasks' && viewMode === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {STATUSES.map((status) => {
            const items = filteredTasks.filter((t) => t.status === status);
            return (
              <div key={status}>
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-sm font-semibold text-t1">{STATUS_LABELS[status]}</h3>
                  <span className="text-xs text-t3 bg-surface px-2 py-0.5 rounded-full">{items.length}</span>
                </div>

                <div className="space-y-3">
                  {items.map((task) => {
                    const weekly = weeklies.find((w) => w.id === task.weeklyTargetId) ?? null;
                    return (
                      <button
                        key={task.id}
                        onClick={() => setSelectedTaskId(task.id)}
                        className="w-full text-left bg-card rounded-xl border border-border p-4 hover:shadow-md hover:border-accent/40 transition-all"
                      >
                        <h4 className="text-sm font-medium text-t1 mb-1.5 break-all">
                          {task.title || <span className="text-t3 italic">Untitled</span>}
                        </h4>
                        {task.description && (
                          <p className="text-xs text-t2 mb-3 line-clamp-2 break-words">{task.description}</p>
                        )}

                        <div className="flex items-center justify-between">
                          {(() => {
                            const u = getUser(task.assignee);
                            return u ? (
                              <div className="flex items-center gap-2">
                                <Avatar name={u.fullName} size={24} />
                                <span className="text-xs text-t2">
                                  {task.dueDate ? formatDueDate(task.dueDate) : u.fullName}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-t3 italic">Unassigned</span>
                            );
                          })()}
                        </div>

                        {weekly && (
                          <div className="mt-3 flex items-center gap-1.5 text-xs text-t3">
                            <Target className="w-3.5 h-3.5" weight="duotone" />
                            <span className="truncate">{weekly.title || 'Untitled weekly target'}</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                  {items.length === 0 && (
                    <div className="text-xs text-t3 italic px-1 py-6 text-center">No tasks</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* WEEKLY TARGETS */}
      {tab === 'weekly' && (() => {
        const visibleIds = filteredWeeklies.map((w) => w.id);
        const allChecked = visibleIds.length > 0 && visibleIds.every((id) => selectedWeeklyIds.has(id));
        const someChecked = visibleIds.some((id) => selectedWeeklyIds.has(id));
        const visibleCols =
          (weeklyColVis.has('title')    ? 1 : 0) +
          (weeklyColVis.has('monthly')  ? 1 : 0) +
          (weeklyColVis.has('tasks')    ? 1 : 0) +
          (weeklyColVis.has('progress') ? 1 : 0) +
          1; // checkbox column
        return (
          <div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <Table style={{ tableLayout: 'fixed', minWidth: 0 }}>
              <colgroup>
                <col style={CHECKBOX_COL_STYLE} />
                {weeklyColVis.has('title')    && <col style={{ width: weeklyColW.title }} />}
                {weeklyColVis.has('monthly')  && <col style={{ width: weeklyColW.monthly }} />}
                {weeklyColVis.has('tasks')    && <col style={{ width: weeklyColW.tasks }} />}
                {weeklyColVis.has('progress') && <col style={{ width: weeklyColW.progress }} />}
                <col />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead style={CHECKBOX_COL_STYLE}>
                    <Checkbox
                      checked={allChecked}
                      indeterminate={!allChecked && someChecked}
                      onCheckedChange={(v) => setToggleAll(setSelectedWeeklyIds, visibleIds, v)}
                      ariaLabel="Select all weekly targets"
                    />
                  </TableHead>
                  {weeklyColVis.has('title')    && (
                    <ResizableTableHead width={weeklyColW.title} onWidthChange={(w) => setWeeklyColW('title', w)}>Weekly Target</ResizableTableHead>
                  )}
                  {weeklyColVis.has('monthly')  && (
                    <ResizableTableHead width={weeklyColW.monthly} onWidthChange={(w) => setWeeklyColW('monthly', w)}>Monthly Target</ResizableTableHead>
                  )}
                  {weeklyColVis.has('tasks')    && (
                    <ResizableTableHead width={weeklyColW.tasks} onWidthChange={(w) => setWeeklyColW('tasks', w)}>Tasks</ResizableTableHead>
                  )}
                  {weeklyColVis.has('progress') && (
                    <ResizableTableHead width={weeklyColW.progress} onWidthChange={(w) => setWeeklyColW('progress', w)}>Progress</ResizableTableHead>
                  )}
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWeeklies.map((w) => {
                  const linked = tasks.filter((t) => t.weeklyTargetId === w.id);
                  const completed = linked.filter((t) => t.status === 'completed').length;
                  const progress = weeklyProgress(w.id, tasks);
                  const selected = selectedWeeklyIds.has(w.id);
                  return (
                    <TableRow
                      key={w.id}
                      data-state={selected ? 'selected' : undefined}
                      onClick={() => setSelectedWeeklyId(w.id)}
                      className="cursor-pointer"
                    >
                      <TableCell style={CHECKBOX_COL_STYLE} onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selected}
                          onCheckedChange={(v) => setToggle(setSelectedWeeklyIds, w.id, v)}
                          ariaLabel={`Select ${w.title || 'weekly target'}`}
                        />
                      </TableCell>
                      {weeklyColVis.has('title') && (
                        <TableCell className="whitespace-normal break-all">
                          <div className="flex items-start justify-between gap-3">
                            <EditableTitle
                              value={w.title}
                              onChange={(v) => updateWeekly(w.id, { title: v })}
                              className="text-sm font-medium text-t1 flex-1"
                              placeholder="Weekly target name"
                              autoFocus={inlineDraftWeeklyId === w.id}
                              onBlur={
                                inlineDraftWeeklyId === w.id
                                  ? (v) => onWeeklyDraftBlur(w.id, v)
                                  : undefined
                              }
                            />
                            {w.members.length > 1 && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1.5 shrink-0"
                                title={`Shared with ${w.members.length - 1} other${w.members.length > 2 ? 's' : ''}`}
                              >
                                <MemberAvatarGroup members={w.members} size={6} max={3} />
                                {!w.isOwner && (
                                  <Badge variant="muted" className="ml-1">Shared</Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      )}
                      {weeklyColVis.has('monthly') && (
                        <TableCell className="px-2">
                          <ParentSelect
                            value={w.monthlyTargetId}
                            onChange={(id) => updateWeekly(w.id, { monthlyTargetId: id })}
                            options={monthlyOptions}
                            placeholder="None"
                            compact
                          />
                        </TableCell>
                      )}
                      {weeklyColVis.has('tasks') && (
                        <TableCell className="text-t2">
                          {linked.length === 0 ? (
                            <span className="text-xs text-t3 italic">No tasks</span>
                          ) : (
                            <span>
                              {completed}/{linked.length}
                            </span>
                          )}
                        </TableCell>
                      )}
                      {weeklyColVis.has('progress') && (
                        <TableCell>
                          <ProgressBar value={progress} />
                        </TableCell>
                      )}
                      <TableCell />
                    </TableRow>
                  );
                })}
                {filteredWeeklies.length === 0 && loading && (
                  Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={`sk-${i}`} cols={visibleCols + 1} />)
                )}
                {filteredWeeklies.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={visibleCols + 1} className="py-12 text-center text-sm text-t3">
                      No weekly targets yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <button
            onClick={addInlineWeekly}
            className="mt-2 flex items-center gap-2 px-3 py-2 text-sm text-t3 hover:text-t1 hover:bg-surface rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" weight="bold" />
            New weekly target
          </button>
          </div>
        );
      })()}

      {/* MONTHLY TARGETS */}
      {tab === 'monthly' && (() => {
        const visibleIds = filteredMonthlies.map((m) => m.id);
        const allChecked = visibleIds.length > 0 && visibleIds.every((id) => selectedMonthlyIds.has(id));
        const someChecked = visibleIds.some((id) => selectedMonthlyIds.has(id));
        const visibleCols =
          (monthlyColVis.has('title')    ? 1 : 0) +
          (monthlyColVis.has('yearly')   ? 1 : 0) +
          (monthlyColVis.has('weeklies') ? 1 : 0) +
          (monthlyColVis.has('progress') ? 1 : 0) +
          1; // checkbox column
        return (
          <div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <Table style={{ tableLayout: 'fixed', minWidth: 0 }}>
              <colgroup>
                <col style={CHECKBOX_COL_STYLE} />
                {monthlyColVis.has('title')    && <col style={{ width: monthlyColW.title }} />}
                {monthlyColVis.has('yearly')   && <col style={{ width: monthlyColW.yearly }} />}
                {monthlyColVis.has('weeklies') && <col style={{ width: monthlyColW.weeklies }} />}
                {monthlyColVis.has('progress') && <col style={{ width: monthlyColW.progress }} />}
                <col />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead style={CHECKBOX_COL_STYLE}>
                    <Checkbox
                      checked={allChecked}
                      indeterminate={!allChecked && someChecked}
                      onCheckedChange={(v) => setToggleAll(setSelectedMonthlyIds, visibleIds, v)}
                      ariaLabel="Select all monthly targets"
                    />
                  </TableHead>
                  {monthlyColVis.has('title')    && (
                    <ResizableTableHead width={monthlyColW.title} onWidthChange={(w) => setMonthlyColW('title', w)}>Monthly Target</ResizableTableHead>
                  )}
                  {monthlyColVis.has('yearly')   && (
                    <ResizableTableHead width={monthlyColW.yearly} onWidthChange={(w) => setMonthlyColW('yearly', w)}>Yearly Target</ResizableTableHead>
                  )}
                  {monthlyColVis.has('weeklies') && (
                    <ResizableTableHead width={monthlyColW.weeklies} onWidthChange={(w) => setMonthlyColW('weeklies', w)}>Weekly Targets</ResizableTableHead>
                  )}
                  {monthlyColVis.has('progress') && (
                    <ResizableTableHead width={monthlyColW.progress} onWidthChange={(w) => setMonthlyColW('progress', w)}>Progress</ResizableTableHead>
                  )}
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMonthlies.map((m) => {
                  const linked = weeklies.filter((w) => w.monthlyTargetId === m.id);
                  const progress = monthlyProgress(m.id, weeklies, tasks);
                  const selected = selectedMonthlyIds.has(m.id);
                  return (
                    <TableRow
                      key={m.id}
                      data-state={selected ? 'selected' : undefined}
                      onClick={() => setSelectedMonthlyId(m.id)}
                      className="cursor-pointer"
                    >
                      <TableCell style={CHECKBOX_COL_STYLE} onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selected}
                          onCheckedChange={(v) => setToggle(setSelectedMonthlyIds, m.id, v)}
                          ariaLabel={`Select ${m.title || 'monthly target'}`}
                        />
                      </TableCell>
                      {monthlyColVis.has('title') && (
                        <TableCell className="whitespace-normal break-all">
                          <div className="flex items-start justify-between gap-3">
                            <EditableTitle
                              value={m.title}
                              onChange={(v) => updateMonthly(m.id, { title: v })}
                              className="text-sm font-medium text-t1 flex-1"
                              placeholder="Monthly target name"
                              autoFocus={inlineDraftMonthlyId === m.id}
                              onBlur={
                                inlineDraftMonthlyId === m.id
                                  ? (v) => onMonthlyDraftBlur(m.id, v)
                                  : undefined
                              }
                            />
                            {m.members.length > 1 && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1.5 shrink-0"
                                title={`Shared with ${m.members.length - 1} other${m.members.length > 2 ? 's' : ''}`}
                              >
                                <MemberAvatarGroup members={m.members} size={6} max={3} />
                                {!m.isOwner && (
                                  <Badge variant="muted" className="ml-1">Shared</Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      )}
                      {monthlyColVis.has('yearly') && (
                        <TableCell className="px-2">
                          <ParentSelect
                            value={m.yearlyTargetId}
                            onChange={(id) => updateMonthly(m.id, { yearlyTargetId: id })}
                            options={yearlyOptions}
                            placeholder="None"
                            compact
                          />
                        </TableCell>
                      )}
                      {monthlyColVis.has('weeklies') && (
                        <TableCell className="text-t2">
                          {linked.length === 0 ? (
                            <span className="text-xs text-t3 italic">No weekly targets</span>
                          ) : (
                            <span>{linked.length}</span>
                          )}
                        </TableCell>
                      )}
                      {monthlyColVis.has('progress') && (
                        <TableCell>
                          <ProgressBar value={progress} />
                        </TableCell>
                      )}
                      <TableCell />
                    </TableRow>
                  );
                })}
                {filteredMonthlies.length === 0 && loading && (
                  Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={`sk-${i}`} cols={visibleCols + 1} />)
                )}
                {filteredMonthlies.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={visibleCols + 1} className="py-12 text-center text-sm text-t3">
                      No monthly targets yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <button
            onClick={addInlineMonthly}
            className="mt-2 flex items-center gap-2 px-3 py-2 text-sm text-t3 hover:text-t1 hover:bg-surface rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" weight="bold" />
            New monthly target
          </button>
          </div>
        );
      })()}

      {/* YEARLY TARGETS */}
      {tab === 'yearly' && (() => {
        const visibleIds = filteredYearlies.map((y) => y.id);
        const allChecked = visibleIds.length > 0 && visibleIds.every((id) => selectedYearlyIds.has(id));
        const someChecked = visibleIds.some((id) => selectedYearlyIds.has(id));
        const visibleCols =
          (yearlyColVis.has('title')     ? 1 : 0) +
          (yearlyColVis.has('monthlies') ? 1 : 0) +
          (yearlyColVis.has('progress')  ? 1 : 0) +
          1; // checkbox column
        return (
          <div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <Table style={{ tableLayout: 'fixed', minWidth: 0 }}>
              <colgroup>
                <col style={CHECKBOX_COL_STYLE} />
                {yearlyColVis.has('title')     && <col style={{ width: yearlyColW.title }} />}
                {yearlyColVis.has('monthlies') && <col style={{ width: yearlyColW.monthlies }} />}
                {yearlyColVis.has('progress')  && <col style={{ width: yearlyColW.progress }} />}
                <col />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead style={CHECKBOX_COL_STYLE}>
                    <Checkbox
                      checked={allChecked}
                      indeterminate={!allChecked && someChecked}
                      onCheckedChange={(v) => setToggleAll(setSelectedYearlyIds, visibleIds, v)}
                      ariaLabel="Select all yearly targets"
                    />
                  </TableHead>
                  {yearlyColVis.has('title')     && (
                    <ResizableTableHead width={yearlyColW.title} onWidthChange={(w) => setYearlyColW('title', w)}>Yearly Target</ResizableTableHead>
                  )}
                  {yearlyColVis.has('monthlies') && (
                    <ResizableTableHead width={yearlyColW.monthlies} onWidthChange={(w) => setYearlyColW('monthlies', w)}>Monthly Targets</ResizableTableHead>
                  )}
                  {yearlyColVis.has('progress')  && (
                    <ResizableTableHead width={yearlyColW.progress} onWidthChange={(w) => setYearlyColW('progress', w)}>Progress</ResizableTableHead>
                  )}
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredYearlies.map((y) => {
                  // Yearly progress comes from the backend (per-caller, scoped
                  // to monthlies the user is a member of). Linked count uses
                  // local monthlies for snappier UI feedback.
                  const linkedMonthlies = monthlies.filter((m) => m.yearlyTargetId === y.id);
                  const selected = selectedYearlyIds.has(y.id);
                  return (
                    <TableRow
                      key={y.id}
                      data-state={selected ? 'selected' : undefined}
                      onClick={() => setSelectedYearlyId(y.id)}
                      className="cursor-pointer"
                    >
                      <TableCell style={CHECKBOX_COL_STYLE} onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selected}
                          onCheckedChange={(v) => setToggle(setSelectedYearlyIds, y.id, v)}
                          ariaLabel={`Select ${y.title || 'yearly target'}`}
                        />
                      </TableCell>
                      {yearlyColVis.has('title') && (
                        <TableCell className="whitespace-normal break-all">
                          <div className="flex items-start justify-between gap-3">
                            <EditableTitle
                              value={y.title}
                              onChange={(v) => updateYearly(y.id, { title: v })}
                              className="text-sm font-medium text-t1 flex-1"
                              placeholder="Yearly target name"
                              autoFocus={inlineDraftYearlyId === y.id}
                              onBlur={
                                inlineDraftYearlyId === y.id
                                  ? (v) => onYearlyDraftBlur(y.id, v)
                                  : undefined
                              }
                            />
                            {y.members.length > 1 && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1.5 shrink-0"
                                title={`Shared with ${y.members.length - 1} other${y.members.length > 2 ? 's' : ''}`}
                              >
                                <MemberAvatarGroup members={y.members} size={6} max={3} />
                                {!y.isOwner && (
                                  <Badge variant="muted" className="ml-1">Shared</Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      )}
                      {yearlyColVis.has('monthlies') && (
                        <TableCell className="text-t2">
                          {linkedMonthlies.length === 0 ? (
                            <span className="text-xs text-t3 italic">No monthly targets</span>
                          ) : (
                            <span>{linkedMonthlies.length}</span>
                          )}
                        </TableCell>
                      )}
                      {yearlyColVis.has('progress') && (
                        <TableCell>
                          <ProgressBar value={y.progress} />
                        </TableCell>
                      )}
                      <TableCell />
                    </TableRow>
                  );
                })}
                {filteredYearlies.length === 0 && loading && (
                  Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={`sk-${i}`} cols={visibleCols + 1} />)
                )}
                {filteredYearlies.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={visibleCols + 1} className="py-12 text-center text-sm text-t3">
                      No yearly targets yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <button
            onClick={addInlineYearly}
            className="mt-2 flex items-center gap-2 px-3 py-2 text-sm text-t3 hover:text-t1 hover:bg-surface rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" weight="bold" />
            New yearly target
          </button>
          </div>
        );
      })()}

      {/* TASK PANEL */}
      <AnimatePresence>
      {selectedTask && (
        <motion.div key="task-panel-host" className="fixed inset-0 z-[60] flex justify-end">
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeTaskPanel}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: FADE_DURATION }}
          />
          <motion.div
            className="relative w-full max-w-xl bg-card h-full shadow-2xl flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: PANEL_DURATION, ease: EASE_OUT_FAST }}
          >
            <div className="flex items-center justify-between px-4 py-3 shrink-0">
              <button
                onClick={closeTaskPanel}
                aria-label="Close"
                className="p-1.5 rounded-md text-t3 hover:bg-surface hover:text-t1 transition-colors"
              >
                <X className="w-4 h-4" weight="bold" />
              </button>
              {/* Only the creator can delete a task. Assignees can view + change
                  status only — backend enforces this too, but hiding the
                  button avoids the confusing "permission denied" toast. */}
              {(currentUserId && selectedTask.createdBy === currentUserId) && (
                <button
                  onClick={deleteSelectedTask}
                  aria-label="Delete task"
                  title="Delete task"
                  className="p-1.5 rounded-md text-t3 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                >
                  <Trash className="w-4 h-4" weight="bold" />
                </button>
              )}
            </div>

            <OverlayScrollbarsComponent
              className="flex-1 px-12 pb-12"
              options={{ scrollbars: { autoHide: 'never' } }}
              defer
            >
              <div className="pt-4 pb-6">
                <EditableTitle
                  value={selectedTask.title}
                  onChange={(v) => updateTask(selectedTask.id, { title: v })}
                  className="text-3xl font-bold text-t1 leading-tight tracking-tight block w-full"
                  placeholder="Untitled"
                  autoFocus={isNewItemRef.current}
                />
              </div>

              <div className="space-y-1 mb-8">
                <PropertyRow icon={CircleNotch} label="Status">
                  <StatusSelect
                    value={selectedTask.status}
                    onChange={(s) => updateTask(selectedTask.id, { status: s })}
                    compact
                  />
                </PropertyRow>

                <PropertyRow icon={UserIcon} label="Assignee">
                  <AssigneeSelect
                    value={selectedTask.assignee}
                    onChange={(id) => updateTask(selectedTask.id, { assignee: id })}
                    users={users}
                    compact
                  />
                </PropertyRow>

                <PropertyRow icon={CalendarBlank} label="Due date">
                  <DatePicker
                    value={selectedTask.dueDate ? parseISO(selectedTask.dueDate) : null}
                    onChange={(d) =>
                      updateTask(selectedTask.id, {
                        dueDate: d ? format(d, 'yyyy-MM-dd') : '',
                      })
                    }
                    placeholder="Empty"
                    compact
                  />
                </PropertyRow>

                <PropertyRow icon={Target} label="Weekly target">
                  <ParentSelect
                    value={selectedTask.weeklyTargetId}
                    onChange={(id) => updateTask(selectedTask.id, { weeklyTargetId: id })}
                    options={weeklyOptions}
                    placeholder="None"
                    compact
                  />
                </PropertyRow>
              </div>

              <div className="border-t border-border-s mb-4" />

              <textarea
                value={selectedTask.description}
                onChange={(e) => updateTask(selectedTask.id, { description: e.target.value })}
                placeholder="Add a description…"
                rows={8}
                className="w-full bg-transparent text-sm text-t1 placeholder-t3 outline-none resize-none leading-relaxed"
              />

              {selectedTask.updatedAt && (() => {
                const d = parseISO(selectedTask.updatedAt);
                if (!isValidDate(d)) return null;
                return (
                  <div className="mt-8 pt-4 border-t border-border-s">
                    <p
                      className="text-xs text-t3"
                      title={format(d, 'PPpp')}
                    >
                      Last edited {formatDistanceToNow(d, { addSuffix: true })}
                    </p>
                  </div>
                );
              })()}
            </OverlayScrollbarsComponent>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* WEEKLY PANEL */}
      <AnimatePresence>
      {selectedWeekly && (
        <motion.div key="weekly-panel-host" className="fixed inset-0 z-[60] flex justify-end">
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeWeeklyPanel}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: FADE_DURATION }}
          />
          <motion.div
            className="relative w-full max-w-xl bg-card h-full shadow-2xl flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: PANEL_DURATION, ease: EASE_OUT_FAST }}
          >
            <div className="flex items-center px-4 py-3 shrink-0">
              <button
                onClick={closeWeeklyPanel}
                aria-label="Close"
                className="p-1.5 rounded-md text-t3 hover:bg-surface hover:text-t1 transition-colors"
              >
                <X className="w-4 h-4" weight="bold" />
              </button>
            </div>

            <OverlayScrollbarsComponent
              className="flex-1 px-12 pb-12"
              options={{ scrollbars: { autoHide: 'never' } }}
              defer
            >
              <div className="pt-4 pb-6">
                <EditableTitle
                  value={selectedWeekly.title}
                  onChange={(v) => updateWeekly(selectedWeekly.id, { title: v })}
                  className="text-3xl font-bold text-t1 leading-tight tracking-tight block w-full"
                  placeholder="Untitled weekly target"
                  autoFocus={isNewItemRef.current}
                />
              </div>

              <div className="space-y-1 mb-8">
                <PropertyRow icon={CalendarCheck} label="Monthly target">
                  <ParentSelect
                    value={selectedWeekly.monthlyTargetId}
                    onChange={(id) => updateWeekly(selectedWeekly.id, { monthlyTargetId: id })}
                    options={monthlyOptions}
                    placeholder="None"
                    compact
                  />
                </PropertyRow>

                <PropertyRow icon={Clock} label="Progress">
                  <ProgressBar value={weeklyProgress(selectedWeekly.id, tasks)} />
                </PropertyRow>
              </div>

              <div className="border-t border-border-s mb-4" />

              <textarea
                value={selectedWeekly.description}
                onChange={(e) => updateWeekly(selectedWeekly.id, { description: e.target.value })}
                placeholder="Add a description…"
                rows={5}
                className="w-full bg-transparent text-sm text-t1 placeholder-t3 outline-none resize-none leading-relaxed mb-6"
              />

              <div>
                <h4 className="text-xs font-medium text-t2 uppercase tracking-wider mb-3">
                  Linked tasks
                </h4>
                <div className="space-y-1">
                  {tasks.filter((t) => t.weeklyTargetId === selectedWeekly.id).length === 0 && (
                    <p className="text-xs text-t3 italic">No tasks linked yet — progress is 100% by default.</p>
                  )}
                  {tasks
                    .filter((t) => t.weeklyTargetId === selectedWeekly.id)
                    .map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setSelectedWeeklyId(null);
                          setSelectedTaskId(t.id);
                        }}
                        className="flex items-start justify-between gap-2 w-full px-2 py-2 rounded-md hover:bg-surface text-left"
                      >
                        <span className="text-sm text-t1 break-all min-w-0">
                          {t.title || <span className="text-t3 italic">Untitled</span>}
                        </span>
                        <StatusPill status={t.status} />
                      </button>
                    ))}
                </div>
              </div>
            </OverlayScrollbarsComponent>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* BULK ACTION BAR */}
      <AnimatePresence>
        {activeSelected.size > 0 && (
          <motion.div
            key="bulk-bar"
            initial={{ opacity: 0, y: 16, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 16, x: '-50%' }}
            transition={{ duration: 0.18, ease: EASE_OUT_FAST }}
            className="fixed bottom-6 left-1/2 z-50 flex items-center gap-1 bg-card/95 backdrop-blur-md border border-border shadow-2xl rounded-2xl pl-4 pr-2 py-2"
          >
            <span className="text-sm font-medium text-t1">
              {activeSelected.size} <span className="text-t3 font-normal">{activeNoun} selected</span>
            </span>
            <div className="h-5 w-px bg-border mx-2" />
            {tab === 'tasks' && (
              <Popover.Root>
                <Popover.Trigger asChild>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium text-t1 hover:bg-surface transition-colors">
                    <UsersThree size={14} weight="bold" />
                    Reassign
                  </button>
                </Popover.Trigger>
                <Popover.Portal>
                  <Popover.Content
                    side="top"
                    align="center"
                    sideOffset={10}
                    className="z-[100] w-64 bg-card border border-border rounded-xl shadow-2xl p-1 max-h-(--radix-popover-content-available-height) overflow-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
                  >
                    <p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-t3">
                      Reassign to
                    </p>
                    <button
                      onClick={() => handleBulkReassign(null)}
                      className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-surface text-left transition-colors"
                    >
                      <span className="text-sm text-t3 italic">Unassigned</span>
                    </button>
                    {users.map((u) => (
                      <button
                        key={u._id}
                        onClick={() => handleBulkReassign(u._id)}
                        className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-surface text-left transition-colors"
                      >
                        <Avatar name={u.fullName} size={24} />
                        <span className="text-sm text-t1 truncate">{u.fullName}</span>
                      </button>
                    ))}
                  </Popover.Content>
                </Popover.Portal>
              </Popover.Root>
            )}
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors"
            >
              <Trash size={14} weight="bold" />
              Delete
            </button>
            <button
              onClick={() => setActiveSelected(new Set())}
              aria-label="Clear selection"
              className="p-1.5 rounded-xl text-t3 hover:bg-surface hover:text-t1 transition-colors"
            >
              <X size={14} weight="bold" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* YEARLY PANEL — opens when a yearly target row is clicked. The
          description textarea acts as the spec/notes area: users can write
          what the yearly goal is, why it matters, or leave running notes. */}
      <AnimatePresence>
      {selectedYearly && (
        <motion.div key="yearly-panel-host" className="fixed inset-0 z-[60] flex justify-end">
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeYearlyPanel}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: FADE_DURATION }}
          />
          <motion.div
            className="relative w-full max-w-xl bg-card h-full shadow-2xl flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: PANEL_DURATION, ease: EASE_OUT_FAST }}
          >
            <div className="flex items-center px-4 py-3 shrink-0">
              <button
                onClick={closeYearlyPanel}
                aria-label="Close"
                className="p-1.5 rounded-md text-t3 hover:bg-surface hover:text-t1 transition-colors"
              >
                <X className="w-4 h-4" weight="bold" />
              </button>
            </div>

            <OverlayScrollbarsComponent
              className="flex-1 px-12 pb-12"
              options={{ scrollbars: { autoHide: 'never' } }}
              defer
            >
              <div className="pt-4 pb-6">
                <EditableTitle
                  value={selectedYearly.title}
                  onChange={(v) => updateYearly(selectedYearly.id, { title: v })}
                  className="text-3xl font-bold text-t1 leading-tight tracking-tight block w-full"
                  placeholder="Untitled yearly target"
                  autoFocus={isNewItemRef.current}
                />
              </div>

              <div className="space-y-1 mb-8">
                <PropertyRow icon={Clock} label="Progress">
                  <ProgressBar value={selectedYearly.progress} />
                </PropertyRow>
                {selectedYearly.members.length > 1 && (
                  <PropertyRow icon={UsersThree} label="Shared with">
                    <div className="flex items-center gap-2">
                      <MemberAvatarGroup members={selectedYearly.members} size={6} max={5} />
                      <span className="text-xs text-t3">
                        {selectedYearly.members.length} member{selectedYearly.members.length === 1 ? '' : 's'}
                      </span>
                    </div>
                  </PropertyRow>
                )}
              </div>

              <div className="border-t border-border-s mb-4" />

              <h4 className="text-xs font-medium text-t2 uppercase tracking-wider mb-2">
                Notes & specifications
              </h4>
              <textarea
                value={selectedYearly.description}
                onChange={(e) => updateYearly(selectedYearly.id, { description: e.target.value })}
                placeholder="What is this yearly goal? Why does it matter? Any context, constraints, or running notes…"
                rows={6}
                className="w-full bg-transparent text-sm text-t1 placeholder-t3 outline-none resize-none leading-relaxed mb-6"
              />

              <div>
                <h4 className="text-xs font-medium text-t2 uppercase tracking-wider mb-3">
                  Monthly targets
                </h4>
                <div className="space-y-1">
                  {monthlies.filter((m) => m.yearlyTargetId === selectedYearly.id).length === 0 && (
                    <p className="text-xs text-t3 italic">
                      No monthly targets linked yet — progress is 100% by default. Link a monthly to this yearly from the Monthly Targets tab.
                    </p>
                  )}
                  {monthlies
                    .filter((m) => m.yearlyTargetId === selectedYearly.id)
                    .map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setSelectedYearlyId(null);
                          setSelectedMonthlyId(m.id);
                        }}
                        className="flex items-start justify-between w-full px-2 py-2 rounded-md hover:bg-surface text-left gap-3"
                      >
                        <span className="text-sm text-t1 break-all min-w-0">
                          {m.title || <span className="text-t3 italic">Untitled</span>}
                        </span>
                        <span className="text-xs text-t3 shrink-0">
                          {monthlyProgress(m.id, weeklies, tasks)}%
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            </OverlayScrollbarsComponent>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* MONTHLY PANEL */}
      <AnimatePresence>
      {selectedMonthly && (
        <motion.div key="monthly-panel-host" className="fixed inset-0 z-[60] flex justify-end">
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeMonthlyPanel}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: FADE_DURATION }}
          />
          <motion.div
            className="relative w-full max-w-xl bg-card h-full shadow-2xl flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: PANEL_DURATION, ease: EASE_OUT_FAST }}
          >
            <div className="flex items-center px-4 py-3 shrink-0">
              <button
                onClick={closeMonthlyPanel}
                aria-label="Close"
                className="p-1.5 rounded-md text-t3 hover:bg-surface hover:text-t1 transition-colors"
              >
                <X className="w-4 h-4" weight="bold" />
              </button>
            </div>

            <OverlayScrollbarsComponent
              className="flex-1 px-12 pb-12"
              options={{ scrollbars: { autoHide: 'never' } }}
              defer
            >
              <div className="pt-4 pb-6">
                <EditableTitle
                  value={selectedMonthly.title}
                  onChange={(v) => updateMonthly(selectedMonthly.id, { title: v })}
                  className="text-3xl font-bold text-t1 leading-tight tracking-tight block w-full"
                  placeholder="Untitled monthly target"
                  autoFocus={isNewItemRef.current}
                />
              </div>

              <div className="space-y-1 mb-8">
                <PropertyRow icon={Clock} label="Progress">
                  <ProgressBar value={monthlyProgress(selectedMonthly.id, weeklies, tasks)} />
                </PropertyRow>
              </div>

              <div className="border-t border-border-s mb-4" />

              <textarea
                value={selectedMonthly.description}
                onChange={(e) => updateMonthly(selectedMonthly.id, { description: e.target.value })}
                placeholder="Add a description…"
                rows={5}
                className="w-full bg-transparent text-sm text-t1 placeholder-t3 outline-none resize-none leading-relaxed mb-6"
              />

              <div>
                <h4 className="text-xs font-medium text-t2 uppercase tracking-wider mb-3">
                  Weekly targets
                </h4>
                <div className="space-y-1">
                  {weeklies.filter((w) => w.monthlyTargetId === selectedMonthly.id).length === 0 && (
                    <p className="text-xs text-t3 italic">No weekly targets linked yet — progress is 100% by default.</p>
                  )}
                  {weeklies
                    .filter((w) => w.monthlyTargetId === selectedMonthly.id)
                    .map((w) => (
                      <button
                        key={w.id}
                        onClick={() => {
                          setSelectedMonthlyId(null);
                          setSelectedWeeklyId(w.id);
                        }}
                        className="flex items-start justify-between w-full px-2 py-2 rounded-md hover:bg-surface text-left gap-3"
                      >
                        <span className="text-sm text-t1 break-all min-w-0">
                          {w.title || <span className="text-t3 italic">Untitled</span>}
                        </span>
                        <span className="text-xs text-t3 shrink-0">{weeklyProgress(w.id, tasks)}%</span>
                      </button>
                    ))}
                </div>
              </div>
            </OverlayScrollbarsComponent>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      <AiAssistant />
    </div>
  );
}
