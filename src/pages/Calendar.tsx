import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { format, isSameDay, parseISO, startOfMonth, endOfMonth, isValid as isValidDate } from 'date-fns';
import {
  Plus,
  Clock,
  MapPin,
  UsersThree,
  CalendarDots as CalendarIcon,
  X,
  Trash,
  PencilSimple,
  CheckCircle,
  ListChecks,
  Target,
  Check,
  CircleNotch,
  CaretDown,
  TextAlignLeft,
  Users,
  PlusIcon,
} from '@phosphor-icons/react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import type { DayButton } from 'react-day-picker';
import { Calendar as ShadcnCalendar } from '../components/ui/calendar';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../components/ui/select';
import DatePicker from '../components/ui/DatePicker';
import {
  apiListCalendarEvents,
  apiCreateCalendarEvent,
  apiUpdateCalendarEvent,
  apiDeleteCalendarEvent,
  apiListTasks,
  apiListWeeklyTargets,
  apiListMonthlyTargets,
  apiListAssignableUsers,
  type CalendarEventRecord,
  type CalendarEventType,
  type CalendarEventInput,
  type AssignableUser,
  type TaskRecord,
  type WeeklyTargetRecord,
  type MonthlyTargetRecord,
} from '../lib/api';

// ─── Layer config ─────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<CalendarEventType, { chip: string; dot: string; ring: string; card: string; bar: string }> = {
  meeting:  { chip: 'bg-accent text-white',         dot: 'bg-accent',        ring: 'ring-accent/30',      card: 'bg-accent/10 hover:bg-accent/15',         bar: 'bg-accent' },
  deadline: { chip: 'bg-red-500 text-white',        dot: 'bg-red-500',       ring: 'ring-red-500/30',     card: 'bg-red-500/10 hover:bg-red-500/15',       bar: 'bg-red-500' },
  reminder: { chip: 'bg-amber-500 text-white',      dot: 'bg-amber-500',     ring: 'ring-amber-500/30',   card: 'bg-amber-500/10 hover:bg-amber-500/15',   bar: 'bg-amber-500' },
  holiday:  { chip: 'bg-emerald-500 text-white',    dot: 'bg-emerald-500',   ring: 'ring-emerald-500/30', card: 'bg-emerald-500/10 hover:bg-emerald-500/15', bar: 'bg-emerald-500' },
  other:    { chip: 'bg-slate-500 text-white',      dot: 'bg-slate-500',     ring: 'ring-slate-500/30',   card: 'bg-slate-500/10 hover:bg-slate-500/15',   bar: 'bg-slate-500' },
};

const TASK_STATUS_COLORS: Record<string, string> = {
  'not-started': 'bg-t3/30 text-t1',
  'in-progress': 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
  'completed':   'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
  'postponed':   'bg-amber-500/20 text-amber-700 dark:text-amber-300',
};

const EVENT_TYPES: CalendarEventType[] = ['meeting', 'deadline', 'reminder', 'holiday', 'other'];

// Unified item shape used by the day-cell and sidebar renderers so events,
// tasks, and targets can share rendering paths.
type CalendarItem =
  | { kind: 'event';   id: string; date: Date; title: string; record: CalendarEventRecord }
  | { kind: 'task';    id: string; date: Date; title: string; record: TaskRecord }
  | { kind: 'weekly';  id: string; date: Date; title: string; record: WeeklyTargetRecord }
  | { kind: 'monthly'; id: string; date: Date; title: string; record: MonthlyTargetRecord };

type Layers = {
  events: boolean;
  tasks: boolean;
  weekly: boolean;
  monthly: boolean;
};

const DEFAULT_LAYERS: Layers = { events: true, tasks: true, weekly: false, monthly: false };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [month, setMonth] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [layers, setLayers] = useState<Layers>(DEFAULT_LAYERS);

  const [events, setEvents] = useState<CalendarEventRecord[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [weeklies, setWeeklies] = useState<WeeklyTargetRecord[]>([]);
  const [monthlies, setMonthlies] = useState<MonthlyTargetRecord[]>([]);

  const [users, setUsers] = useState<AssignableUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Modal: create or edit event
  const [editingEvent, setEditingEvent] = useState<CalendarEventRecord | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [modalSeedDate, setModalSeedDate] = useState<Date | null>(null);

  // Side panel: viewing an existing event
  const [viewingEventId, setViewingEventId] = useState<string | null>(null);

  // Reload everything for the visible month range plus a small buffer.
  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const dateFrom = startOfMonth(month).toISOString();
      const dateTo = endOfMonth(month).toISOString();
      const [evRes, taskRes, wRes, mRes] = await Promise.all([
        apiListCalendarEvents({ dateFrom, dateTo }),
        apiListTasks(),
        apiListWeeklyTargets(),
        apiListMonthlyTargets(),
      ]);
      if (evRes.success) setEvents(evRes.data.events);
      if (taskRes.success) setTasks(taskRes.data.tasks);
      if (wRes.success) setWeeklies(wRes.data.weeklyTargets);
      if (mRes.success) setMonthlies(mRes.data.monthlyTargets);
    } catch {
      setError('Failed to load calendar data.');
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    apiListAssignableUsers().then((r) => { if (r.success) setUsers(r.data.users); });
  }, []);

  // Bucket items by yyyy-MM-dd so the day-cell renderer is O(1) per cell.
  const itemsByDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    const push = (i: CalendarItem) => {
      const key = format(i.date, 'yyyy-MM-dd');
      const arr = map.get(key) ?? [];
      arr.push(i);
      map.set(key, arr);
    };

    if (layers.events) {
      for (const e of events) {
        const d = parseISO(e.startAt);
        if (isValidDate(d)) push({ kind: 'event', id: e._id, date: d, title: e.title, record: e });
      }
    }
    if (layers.tasks) {
      for (const t of tasks) {
        if (!t.dueDate) continue;
        const d = parseISO(t.dueDate);
        if (isValidDate(d)) push({ kind: 'task', id: t._id, date: d, title: t.title || 'Untitled task', record: t });
      }
    }
    if (layers.weekly) {
      for (const w of weeklies) {
        const d = parseISO(w.createdAt);
        if (isValidDate(d)) push({ kind: 'weekly', id: w._id, date: d, title: w.title || 'Weekly target', record: w });
      }
    }
    if (layers.monthly) {
      for (const m of monthlies) {
        const d = parseISO(m.createdAt);
        if (isValidDate(d)) push({ kind: 'monthly', id: m._id, date: d, title: m.title || 'Monthly target', record: m });
      }
    }
    return map;
  }, [events, tasks, weeklies, monthlies, layers]);

  const selectedItems = useMemo(() => {
    return itemsByDay.get(format(selectedDate, 'yyyy-MM-dd')) ?? [];
  }, [itemsByDay, selectedDate]);

  const viewingEvent = useMemo(
    () => events.find((e) => e._id === viewingEventId) ?? null,
    [events, viewingEventId],
  );

  const handleEventCreated = (e: CalendarEventRecord) => {
    setEvents((prev) => [...prev, e]);
  };
  const handleEventUpdated = (e: CalendarEventRecord) => {
    setEvents((prev) => prev.map((x) => (x._id === e._id ? e : x)));
  };
  const handleEventDeleted = (id: string) => {
    setEvents((prev) => prev.filter((x) => x._id !== id));
    if (viewingEventId === id) setViewingEventId(null);
  };

  const openNewEvent = (forDate?: Date | null) => {
    setEditingEvent(null);
    setModalSeedDate(forDate ?? selectedDate);
    setShowEventModal(true);
  };
  const openEditEvent = (ev: CalendarEventRecord) => {
    setEditingEvent(ev);
    setModalSeedDate(null);
    setShowEventModal(true);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-t1">Calendar</h2>
          <p className="text-sm text-t2 mt-1">
            Schedule events, see your tasks and targets, and invite teammates.
          </p>
        </div>
        <button
          onClick={() => openNewEvent(selectedDate)}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent-h transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Event
        </button>
      </div>

      {/* Layer toggles */}
      <LayerToggles layers={layers} onChange={setLayers} />

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Big calendar */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-4">
          <BigCalendar
            month={month}
            onMonthChange={setMonth}
            selectedDate={selectedDate}
            onSelectDate={(d) => {
              setSelectedDate(d);
              openNewEvent(d);
            }}
            onOpenEvent={(id) => setViewingEventId(id)}
            itemsByDay={itemsByDay}
            loading={loading}
          />
        </div>

        {/* Day sidebar */}
        <div className="bg-card rounded-xl border border-border p-6">
          <DayPanel
            date={selectedDate}
            items={selectedItems}
            onCreate={() => openNewEvent(selectedDate)}
            onOpenEvent={(id) => setViewingEventId(id)}
          />
        </div>
      </div>

      {/* Event modal */}
      <AnimatePresence>
        {showEventModal && (
          <EventModal
            existing={editingEvent}
            seedDate={modalSeedDate}
            users={users}
            onClose={() => setShowEventModal(false)}
            onCreated={(e) => { handleEventCreated(e); setShowEventModal(false); }}
            onUpdated={(e) => { handleEventUpdated(e); setShowEventModal(false); }}
          />
        )}
      </AnimatePresence>

      {/* Event detail panel */}
      <AnimatePresence>
        {viewingEvent && (
          <EventDetailPanel
            event={viewingEvent}
            onClose={() => setViewingEventId(null)}
            onEdit={(ev) => { setViewingEventId(null); openEditEvent(ev); }}
            onDelete={async (id) => {
              const r = await apiDeleteCalendarEvent(id);
              if (r.success) handleEventDeleted(id);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Layer toggles ────────────────────────────────────────────────────────────

function LayerToggles({ layers, onChange }: { layers: Layers; onChange: (l: Layers) => void }) {
  const toggle = (key: keyof Layers) => onChange({ ...layers, [key]: !layers[key] });
  const Chip = ({
    active, onClick, color, label, icon,
  }: { active: boolean; onClick: () => void; color: string; label: string; icon: React.ReactNode }) => (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
        active
          ? 'border-transparent text-white'
          : 'border-border text-t2 bg-card hover:border-accent/40'
      }`}
      style={active ? undefined : undefined}
    >
      <span className={`w-2 h-2 rounded-full ${color}`} />
      {icon}
      {label}
      {active && <Check size={12} weight="bold" />}
    </button>
  );

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => toggle('events')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
          layers.events
            ? 'bg-accent text-white border-transparent'
            : 'border-border text-t2 bg-card hover:border-accent/40'
        }`}
      >
        <CalendarIcon size={13} weight="duotone" />
        Events
      </button>
      <button
        type="button"
        onClick={() => toggle('tasks')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
          layers.tasks
            ? 'bg-blue-500 text-white border-transparent'
            : 'border-border text-t2 bg-card hover:border-accent/40'
        }`}
      >
        <ListChecks size={13} weight="duotone" />
        Tasks
      </button>
      <button
        type="button"
        onClick={() => toggle('weekly')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
          layers.weekly
            ? 'bg-amber-500 text-white border-transparent'
            : 'border-border text-t2 bg-card hover:border-accent/40'
        }`}
      >
        <Target size={13} weight="duotone" />
        Weekly targets
      </button>
      <button
        type="button"
        onClick={() => toggle('monthly')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
          layers.monthly
            ? 'bg-purple-500 text-white border-transparent'
            : 'border-border text-t2 bg-card hover:border-accent/40'
        }`}
      >
        <Target size={13} weight="duotone" />
        Monthly targets
      </button>
    </div>
  );
}

// ─── Big calendar (shadcn Calendar with custom DayButton) ─────────────────────

function BigCalendar({
  month,
  onMonthChange,
  selectedDate,
  onSelectDate,
  onOpenEvent,
  itemsByDay,
  loading,
}: {
  month: Date;
  onMonthChange: (d: Date) => void;
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  onOpenEvent: (eventId: string) => void;
  itemsByDay: Map<string, CalendarItem[]>;
  loading: boolean;
}) {
  // Day cells need a much bigger footprint than the default DatePicker.
  // We drive it via the `--cell-size` CSS variable that the shadcn Calendar
  // exposes, then plug a custom DayButton that lays out vertically.
  const renderDayButton = useCallback(
    (props: React.ComponentProps<typeof DayButton>) => (
      <BigDayButton {...props} itemsByDay={itemsByDay} onOpenEvent={onOpenEvent} />
    ),
    [itemsByDay, onOpenEvent],
  );

  return (
    <div className="relative">
      {loading && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 text-[10px] text-t3">
          <CircleNotch size={12} weight="bold" className="animate-spin" />
          loading
        </div>
      )}
      <ShadcnCalendar
        mode="single"
        required
        month={month}
        onMonthChange={onMonthChange}
        selected={selectedDate}
        onSelect={(d) => d && onSelectDate(d)}
        onDayClick={(d) => onSelectDate(d)}
        showOutsideDays
        captionLayout="dropdown"
        startMonth={new Date(2000, 0)}
        endMonth={new Date(2050, 11)}
        className="w-full p-0 [--cell-size:5.5rem] sm:[--cell-size:6.5rem]"
        classNames={{
          month_caption: 'flex items-center justify-center h-10 w-full px-(--cell-size)',
          weekdays: 'flex',
          weekday: 'text-t3 flex-1 font-semibold text-[11px] uppercase tracking-wider py-2',
          week: 'flex w-full mt-1',
          day: 'relative w-full p-0 text-center border border-border-s/40 first:rounded-tl-md last:rounded-tr-md min-h-[80px]',
          today: '',
          outside: 'opacity-50',
        }}
        components={{ DayButton: renderDayButton }}
      />
    </div>
  );
}

function BigDayButton({
  day,
  modifiers,
  itemsByDay,
  onOpenEvent,
  className,
  ...props
}: React.ComponentProps<typeof DayButton> & {
  itemsByDay: Map<string, CalendarItem[]>;
  onOpenEvent: (eventId: string) => void;
}) {
  const key = format(day.date, 'yyyy-MM-dd');
  const items = itemsByDay.get(key) ?? [];
  const isSelected = modifiers.selected;
  const isToday = modifiers.today;

  const visible = items.slice(0, 3);
  const overflow = Math.max(0, items.length - visible.length);

  return (
    <button
      type="button"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={isSelected}
      className={`
        group/day h-full w-full p-1.5 text-left flex flex-col gap-1
        transition-colors outline-none
        hover:bg-surface
        data-[selected-single=true]:bg-accent/5 data-[selected-single=true]:ring-1 data-[selected-single=true]:ring-accent/40 data-[selected-single=true]:ring-inset
        focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-inset
        ${className ?? ''}
      `}
      {...props}
    >
      <span
        className={`
          text-[11px] font-semibold leading-none
          ${isToday ? 'inline-flex items-center justify-center w-5 h-5 rounded-full bg-accent text-white' : 'text-t1'}
          ${modifiers.outside ? 'text-t3' : ''}
        `}
      >
        {day.date.getDate()}
      </span>
      <div className="flex-1 min-h-0 flex flex-col gap-0.5 overflow-hidden">
        {visible.map((it) => (
          <DayChip
            key={`${it.kind}-${it.id}`}
            item={it}
            onOpenEvent={onOpenEvent}
          />
        ))}
        {overflow > 0 && (
          <span className="text-[9px] text-t3 leading-tight">+{overflow} more</span>
        )}
      </div>
    </button>
  );
}

function DayChip({
  item,
  onOpenEvent,
}: {
  item: CalendarItem;
  onOpenEvent: (eventId: string) => void;
}) {
  if (item.kind === 'event') {
    const c = TYPE_COLORS[item.record.type] ?? TYPE_COLORS.other;
    return (
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => { e.stopPropagation(); onOpenEvent(item.id); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            onOpenEvent(item.id);
          }
        }}
        className={`block truncate max-w-[80px] text-[10px] leading-tight rounded px-1 py-0.5 cursor-pointer hover:brightness-110 transition-all ${c.chip}`}
      >
        {item.title}
      </span>
    );
  }
  if (item.kind === 'task') {
    return (
      <span className="block truncate max-w-[80px] text-[10px] leading-tight rounded px-1 py-0.5 bg-blue-500/15 text-blue-700 dark:text-blue-300">
        ▸ {item.title}
      </span>
    );
  }
  if (item.kind === 'weekly') {
    return (
      <span className="block truncate max-w-[80px] text-[10px] leading-tight rounded px-1 py-0.5 bg-amber-500/15 text-amber-700 dark:text-amber-300">
        ◆ {item.title}
      </span>
    );
  }
  return (
    <span className="block truncate max-w-[80px] text-[10px] leading-tight rounded px-1 py-0.5 bg-purple-500/15 text-purple-700 dark:text-purple-300">
      ◆ {item.title}
    </span>
  );
}

// ─── Day sidebar ──────────────────────────────────────────────────────────────

function DayPanel({
  date,
  items,
  onCreate,
  onOpenEvent,
}: {
  date: Date;
  items: CalendarItem[];
  onCreate: () => void;
  onOpenEvent: (eventId: string) => void;
}) {
  const events = items.filter((i) => i.kind === 'event');
  const tasks = items.filter((i) => i.kind === 'task');
  const targets = items.filter((i) => i.kind === 'weekly' || i.kind === 'monthly');
  const empty = items.length === 0;

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-accent-glow text-accent">
            <span className="text-[10px] font-bold uppercase leading-none">{format(date, 'MMM')}</span>
            <span className="text-lg font-bold leading-none mt-0.5">{format(date, 'd')}</span>
          </div>
          <div>
            <h3 className="text-base font-bold text-t1 leading-tight">{format(date, 'EEEE')}</h3>
            <p className="text-xs text-t3 mt-0.5">{format(date, 'yyyy')}</p>
          </div>
        </div>
        <button
          onClick={onCreate}
          className="flex items-center gap-1 size-8 justify-center rounded-full text-xs font-semibold text-accent bg-accent-glow hover:bg-accent hover:text-white transition-colors"
          aria-label="New event on this day"
        >
          <PlusIcon size={13} weight="bold" />
        </button>
      </div>

      {empty ? (
        <div className="text-center py-10 rounded-2xl border border-dashed border-border bg-surface/40">
          <CalendarIcon size={32} weight="duotone" className="text-t3 mx-auto mb-3" />
          <p className="text-sm text-t2">Nothing on this day</p>
          <button onClick={onCreate} className="mt-3 bg-accent hover:brightness-110 text-white py-2 px-4 rounded-full text-xs font-semibold">
            Create an event
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {events.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-t3 uppercase tracking-widest mb-2">Events</p>
              <ul className="space-y-2">
                {events.map((it) => it.kind === 'event' && (
                  <li key={it.id}>
                    <EventRow event={it.record} onClick={() => onOpenEvent(it.id)} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          {tasks.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-t3 uppercase tracking-widest mb-2">Tasks due</p>
              <ul className="space-y-2">
                {tasks.map((it) => it.kind === 'task' && (
                  <li key={it.id}>
                    <TaskRow task={it.record} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          {targets.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-t3 uppercase tracking-widest mb-2">Targets</p>
              <ul className="space-y-2">
                {targets.map((it) => (
                  <li key={`${it.kind}-${it.id}`}>
                    <TargetRow item={it} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EventRow({ event, onClick }: { event: CalendarEventRecord; onClick: () => void }) {
  const c = TYPE_COLORS[event.type] ?? TYPE_COLORS.other;
  const start = parseISO(event.startAt);
  const end = parseISO(event.endAt);
  const sameDay = isValidDate(start) && isValidDate(end) && isSameDay(start, end);
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl p-3 pl-4 relative overflow-hidden transition-all hover:shadow-sm ${c.card}`}
    >
      <span className={`absolute left-0 top-0 bottom-0 w-1 ${c.bar}`} />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-t1 break-words">{event.title}</p>
        <div className="flex items-center gap-1.5 text-xs text-t2">
          <Clock size={12} className="text-t3" />
          <span>
            {event.allDay
              ? 'All day'
              : sameDay
                ? `${format(start, 'HH:mm')} – ${format(end, 'HH:mm')}`
                : `${format(start, 'd MMM HH:mm')} → ${format(end, 'd MMM HH:mm')}`}
          </span>
        </div>
        {event.attendees.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-t3">
            <Users size={12} />
            <span className="truncate">
              {event.attendees.slice(0, 3).map((a) => (a.fullName ?? '').split(' ')[0]).join(', ')}
              {event.attendees.length > 3 && ` +${event.attendees.length - 3}`}
            </span>
          </div>
        )}
      </div>
    </button>
  );
}

function TaskRow({ task }: { task: TaskRecord }) {
  const colorClass = TASK_STATUS_COLORS[task.status] ?? 'bg-t3/30 text-t1';
  return (
    <div className="rounded-xl p-3 pl-4 relative overflow-hidden bg-blue-500/10 hover:bg-blue-500/15 transition-colors">
      <span className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
      <div className="flex items-start gap-2">
        <ListChecks size={14} weight="duotone" className="text-blue-500 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-t1 break-words">{task.title || 'Untitled task'}</p>
          <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${colorClass}`}>
            {task.status.replace('-', ' ')}
          </span>
        </div>
      </div>
    </div>
  );
}

function TargetRow({ item }: { item: CalendarItem }) {
  if (item.kind !== 'weekly' && item.kind !== 'monthly') return null;
  const isWeekly = item.kind === 'weekly';
  const progress = item.record.progress ?? 0;
  return (
    <div
      className={`rounded-xl p-3 pl-4 relative overflow-hidden transition-colors ${
        isWeekly ? 'bg-amber-500/10 hover:bg-amber-500/15' : 'bg-purple-500/10 hover:bg-purple-500/15'
      }`}
    >
      <span className={`absolute left-0 top-0 bottom-0 w-1 ${isWeekly ? 'bg-amber-500' : 'bg-purple-500'}`} />
      <div className="flex items-start gap-2">
        <Target
          size={14}
          weight="duotone"
          className={`mt-0.5 shrink-0 ${isWeekly ? 'text-amber-500' : 'text-purple-500'}`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-t1 break-words">{item.title}</p>
            <span className="text-[10px] font-bold text-t3 shrink-0">{progress}%</span>
          </div>
          <p className="text-[10px] text-t3 mt-0.5">{isWeekly ? 'Weekly target' : 'Monthly target'}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Event modal (create / edit) ──────────────────────────────────────────────

// Generate 15-minute time slots across the day for the time-picker selects.
const TIME_SLOTS = (() => {
  const slots: { value: string; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hh = h.toString().padStart(2, '0');
      const mm = m.toString().padStart(2, '0');
      const value = `${hh}:${mm}`;
      const period = h < 12 ? 'am' : 'pm';
      const h12 = h % 12 === 0 ? 12 : h % 12;
      const label = m === 0 ? `${h12}:00${period}` : `${h12}:${mm}${period}`;
      slots.push({ value, label });
    }
  }
  return slots;
})();

function snapToSlot(d: Date): string {
  const h = d.getHours();
  const m = Math.round(d.getMinutes() / 15) * 15;
  if (m === 60) return `${(h + 1).toString().padStart(2, '0')}:00`;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function combineDateAndTime(date: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const out = new Date(date);
  out.setHours(h, m, 0, 0);
  return out;
}

function EventModal({
  existing,
  seedDate,
  users,
  onClose,
  onCreated,
  onUpdated,
}: {
  existing: CalendarEventRecord | null;
  seedDate: Date | null;
  users: AssignableUser[];
  onClose: () => void;
  onCreated: (e: CalendarEventRecord) => void;
  onUpdated: (e: CalendarEventRecord) => void;
}) {
  const isEdit = !!existing;

  // Seed defaults: rounded to next hour for new events, otherwise from existing.
  const baseStart = useMemo(() => {
    if (existing) return parseISO(existing.startAt);
    const seed = seedDate ?? new Date();
    const next = new Date(seed);
    const now = new Date();
    next.setHours(now.getHours() + 1, 0, 0, 0);
    return next;
  }, [existing, seedDate]);
  const baseEnd = useMemo(() => {
    if (existing) return parseISO(existing.endAt);
    const e = new Date(baseStart);
    e.setHours(e.getHours() + 1);
    return e;
  }, [existing, baseStart]);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const [startDate, setStartDate] = useState<Date>(baseStart);
  const [endDate, setEndDate] = useState<Date>(baseEnd);
  const [startTime, setStartTime] = useState<string>(snapToSlot(baseStart));
  const [endTime, setEndTime] = useState<string>(snapToSlot(baseEnd));
  const [allDay, setAllDay] = useState(existing?.allDay ?? false);
  const [type, setType] = useState<CalendarEventType>(existing?.type ?? 'meeting');
  const [attendeeIds, setAttendeeIds] = useState<string[]>(
    existing?.attendees.map((a) => a._id) ?? [],
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (!title.trim()) { setErr('Title is required'); return; }

    setSubmitting(true);
    try {
      const start = allDay
        ? new Date(new Date(startDate).setHours(0, 0, 0, 0))
        : combineDateAndTime(startDate, startTime);
      const end = allDay
        ? new Date(new Date(endDate).setHours(23, 59, 59, 999))
        : combineDateAndTime(allDay ? endDate : startDate, endTime);
      if (end < start) { setErr('End must be after start'); setSubmitting(false); return; }

      const payload: CalendarEventInput = {
        title: title.trim(),
        description: description.trim(),
        type,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        allDay,
        location: '',
        attendees: attendeeIds,
      };
      const res = isEdit
        ? await apiUpdateCalendarEvent(existing!._id, payload)
        : await apiCreateCalendarEvent(payload);
      if (res.success) {
        if (isEdit) onUpdated(res.data.event);
        else onCreated(res.data.event);
      } else {
        setErr(res.message || 'Failed to save');
      }
    } catch {
      setErr('Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 z-50"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.18 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-xl px-4"
        onClick={(e) => e.stopPropagation()}
      >
        <form
          onSubmit={submit}
          className="bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        >
          {/* Title row */}
          <div className="px-5 pt-5 pb-3 flex items-start gap-3">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add title"
              className="flex-1 bg-transparent border-0 border-b border-border-s/60 focus:border-accent text-xl font-medium text-t1 placeholder-t3 outline-none pb-2 transition-colors"
            />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 -mt-1 rounded-lg text-t3 hover:text-t1 hover:bg-surface transition-colors"
            >
              <X size={16} weight="bold" />
            </button>
          </div>

          <OverlayScrollbarsComponent
            className="flex-1"
            options={{ scrollbars: { autoHide: 'leave' } }}
            defer
          >
            <div className="px-5 py-3 space-y-1">
              {/* Time row */}
              <Row icon={<Clock size={18} weight="duotone" className="text-t3" />}>
                <div className="flex flex-wrap items-center gap-2">
                  <DatePicker
                    value={startDate}
                    onChange={(d) => {
                      if (!d) return;
                      setStartDate(d);
                      if (!allDay && endDate < d) setEndDate(d);
                    }}
                    compact
                  />
                  {!allDay && (
                    <>
                      <TimeSelect value={startTime} onChange={setStartTime} />
                      <span className="text-t3 text-sm">–</span>
                      <TimeSelect value={endTime} onChange={setEndTime} />
                    </>
                  )}
                  {allDay && (
                    <>
                      <span className="text-t3 text-sm">–</span>
                      <DatePicker
                        value={endDate}
                        onChange={(d) => d && setEndDate(d)}
                        compact
                      />
                    </>
                  )}
                </div>
              </Row>

              {/* All-day checkbox */}
              <Row icon={<span className="w-[18px]" />}>
                <label className="inline-flex items-center gap-2 cursor-pointer select-none py-1">
                  <Checkbox checked={allDay} onCheckedChange={setAllDay} />
                  <span className="text-sm text-t1">All day</span>
                </label>
              </Row>

              {/* Type select (kept since the calendar colors events by type) */}
              <Row icon={<CalendarIcon size={18} weight="duotone" className="text-t3" />}>
                <Select value={type} onValueChange={(v) => setType(v as CalendarEventType)}>
                  <SelectTrigger className="w-44 capitalize">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Row>

              {/* Attendees */}
              <Row icon={<UsersThree size={18} weight="duotone" className="text-t3" />}>
                <AttendeesPicker users={users} value={attendeeIds} onChange={setAttendeeIds} />
              </Row>

              {/* Description */}
              <Row icon={<TextAlignLeft size={18} weight="duotone" className="text-t3" />}>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add description"
                  className="w-full bg-transparent border-0 text-sm text-t1 placeholder-t3 outline-none py-2 px-2 -mx-2 hover:bg-surface focus:bg-surface rounded-md resize-none transition-colors"
                />
              </Row>

              {err && <p className="text-xs text-red-500 px-2 pt-2">{err}</p>}
            </div>
          </OverlayScrollbarsComponent>

          <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-t2 hover:text-t1 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-accent hover:bg-accent-h text-white rounded-full text-xs font-semibold transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              {submitting && <CircleNotch size={13} weight="bold" className="animate-spin" />}
              Save
            </button>
          </div>
        </form>
      </motion.div>
    </>
  );
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-2 py-1.5 -mx-2">
      <div className="w-5 flex items-center justify-center pt-2 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

// Compact shadcn-style time picker built on the existing Select primitives.
function TimeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-24">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {TIME_SLOTS.map((s) => (
          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Lightweight checkbox styled to match shadcn defaults (no extra dep).
function Checkbox({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={`shrink-0 size-4 rounded border flex items-center justify-center transition-colors ${
        checked
          ? 'bg-accent border-accent text-white'
          : 'bg-card border-t3/40 hover:border-accent/60'
      }`}
    >
      {checked && <Check size={10} weight="bold" />}
    </button>
  );
}

// ─── Attendees multiselect ────────────────────────────────────────────────────

function AttendeesPicker({
  users,
  value,
  onChange,
}: {
  users: AssignableUser[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverPos, setPopoverPos] = useState<{ left: number; top: number; width: number } | null>(null);

  // Position the portal-rendered popover relative to the input wrapper. Recompute
  // on open, scroll, and resize so it tracks the input even inside scrolling parents.
  useEffect(() => {
    if (!open) return;
    const update = () => {
      const r = wrapRef.current?.getBoundingClientRect();
      if (!r) return;
      setPopoverPos({ left: r.left, top: r.bottom + 4, width: r.width });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t)) return;
      if (popoverRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const selected = value
    .map((id) => users.find((u) => u._id === id))
    .filter(Boolean) as AssignableUser[];
  const filtered = users.filter((u) => {
    if (value.includes(u._id)) return false;
    if (!query.trim()) return true;
    return u.fullName.toLowerCase().includes(query.toLowerCase());
  });

  const add = (id: string) => {
    onChange([...value, id]);
    setQuery('');
  };
  const remove = (id: string) => onChange(value.filter((x) => x !== id));

  return (
    <div ref={wrapRef} className="relative">
      <div
        className="w-full py-1 px-2 -mx-2 bg-transparent rounded-md flex flex-wrap gap-1.5 cursor-text hover:bg-surface focus-within:bg-surface transition-colors"
        onClick={() => setOpen(true)}
      >
        {selected.map((u) => (
          <span
            key={u._id}
            className="flex items-center gap-1.5 pl-1 pr-1.5 py-0.5 bg-accent-glow text-accent text-xs rounded-md"
          >
            <span className="w-4 h-4 rounded-full bg-accent/20 text-[9px] font-bold flex items-center justify-center text-accent">
              {u.fullName[0]?.toUpperCase()}
            </span>
            {u.fullName}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); remove(u._id); }}
              className="ml-0.5 hover:text-red-500 transition-colors"
            >
              <X size={10} weight="bold" />
            </button>
          </span>
        ))}
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={selected.length === 0 ? 'Add guests' : ''}
          className="flex-1 min-w-[6rem] bg-transparent text-sm text-t1 placeholder-t3 outline-none px-1 py-1"
        />
      </div>

      {open && filtered.length > 0 && popoverPos && createPortal(
        <div
          ref={popoverRef}
          style={{ position: 'fixed', left: popoverPos.left, top: popoverPos.top, width: popoverPos.width }}
          className="bg-card border border-border rounded-xl shadow-2xl max-h-56 overflow-auto z-[60]"
        >
          {filtered.slice(0, 30).map((u) => (
            <button
              key={u._id}
              type="button"
              onClick={() => add(u._id)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-t1 hover:bg-surface text-left transition-colors"
            >
              <span className="w-6 h-6 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center">
                {u.fullName[0]?.toUpperCase()}
              </span>
              <span className="truncate">{u.fullName}</span>
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}

// ─── Event detail panel ───────────────────────────────────────────────────────

function EventDetailPanel({
  event,
  onClose,
  onEdit,
  onDelete,
}: {
  event: CalendarEventRecord;
  onClose: () => void;
  onEdit: (e: CalendarEventRecord) => void;
  onDelete: (id: string) => Promise<void>;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const c = TYPE_COLORS[event.type] ?? TYPE_COLORS.other;
  const start = parseISO(event.startAt);
  const end = parseISO(event.endAt);
  const sameDay = isValidDate(start) && isValidDate(end) && isSameDay(start, end);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />
      <motion.aside
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'tween', duration: 0.22 }}
        className="fixed top-0 right-0 bottom-0 w-full sm:w-[26rem] bg-card border-l border-border shadow-2xl z-50 flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-t3">{event.type}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-t3 hover:text-t1 hover:bg-surface transition-colors"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        <OverlayScrollbarsComponent className="flex-1" options={{ scrollbars: { autoHide: 'leave' } }} defer>
          <div className="px-5 py-4 space-y-4">
            <h3 className="text-lg font-bold text-t1 leading-tight break-all">{event.title}</h3>

            <div className="text-sm text-t2 flex items-start gap-2">
              <Clock size={14} className="mt-0.5 text-t3" />
              <span>
                {event.allDay
                  ? `All day · ${format(start, 'EEEE, d MMMM yyyy')}`
                  : sameDay
                    ? `${format(start, 'EEEE, d MMMM yyyy')}\n${format(start, 'HH:mm')} – ${format(end, 'HH:mm')}`
                    : `${format(start, 'd MMM yyyy HH:mm')} → ${format(end, 'd MMM yyyy HH:mm')}`}
              </span>
            </div>

            {event.location && (
              <div className="text-sm text-t2 flex items-start gap-2">
                <MapPin size={14} className="mt-0.5 text-t3" />
                <span>{event.location}</span>
              </div>
            )}

            {event.attendees.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-t3 mb-2">
                  <Users size={12} /> Attendees ({event.attendees.length})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {event.attendees.map((a) => (
                    <span
                      key={a._id}
                      className="flex items-center gap-1.5 pl-1 pr-2 py-0.5 bg-surface text-t1 text-xs rounded-md border border-border"
                    >
                      <span className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center">
                        {(a.fullName ?? '')[0]?.toUpperCase()}
                      </span>
                      {a.fullName ?? ''}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {event.description && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-t3 mb-1">Description</div>
                <p className="text-sm text-t2 whitespace-pre-wrap">{event.description}</p>
              </div>
            )}

          </div>
        </OverlayScrollbarsComponent>

        <div className="px-5 py-3 border-t border-border space-y-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onEdit(event)}
              className="flex-1 px-4 py-2 border border-border text-t2 hover:text-t1 hover:bg-surface rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-2"
            >
              <PencilSimple size={13} weight="bold" />
              Edit
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex-1 px-4 py-2 border border-red-500/40 text-red-500 hover:bg-red-500/10 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Trash size={13} weight="bold" />
              Delete
            </button>
          </div>
        </div>

        <AnimatePresence>
          {confirmDelete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setConfirmDelete(false)}
            >
              <div
                className="bg-card border border-border rounded-2xl p-5 max-w-xs w-full text-center"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-sm font-semibold text-t1 mb-1">Delete this event?</p>
                <p className="text-xs text-t3 mb-4">This action cannot be undone.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 px-3 py-2 border border-border text-t2 hover:text-t1 rounded-xl text-xs font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      await onDelete(event._id);
                      setConfirmDelete(false);
                    }}
                    className="flex-1 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.aside>
    </>
  );
}
