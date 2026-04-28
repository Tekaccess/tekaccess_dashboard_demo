import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from '@tanstack/react-router';
import {
  Bell,
  BellSlash,
  CheckCircle,
  CircleNotch,
  ListChecks,
  Target,
  Gear,
  Trash,
  Check,
  X,
  Funnel,
} from '@phosphor-icons/react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import {
  apiListNotifications,
  apiMarkNotificationRead,
  apiMarkAllNotificationsRead,
  apiDeleteNotification,
  apiClearNotifications,
  type NotificationRecord,
  type NotificationCategory,
} from '../lib/api';

const POLL_INTERVAL_MS = 30_000;

type ReadFilter = 'all' | 'unread' | 'read';
type CategoryFilter = 'all' | NotificationCategory;

const CATEGORY_LABEL: Record<CategoryFilter, string> = {
  all: 'All',
  task: 'Tasks',
  target: 'Targets',
  system: 'System',
};

const READ_LABEL: Record<ReadFilter, string> = {
  all: 'All',
  unread: 'Unread',
  read: 'Read',
};

function categoryIcon(category: NotificationCategory) {
  if (category === 'task') return <ListChecks size={16} weight="duotone" className="text-accent" />;
  if (category === 'target') return <Target size={16} weight="duotone" className="text-amber-500" />;
  return <Gear size={16} weight="duotone" className="text-t3" />;
}

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = (Date.now() - t) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [readFilter, setReadFilter] = useState<ReadFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [showFilters, setShowFilters] = useState(false);

  const fetchSeq = useRef(0);

  const fetchNotifications = useCallback(async () => {
    const seq = ++fetchSeq.current;
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = {};
      if (readFilter !== 'all') params.read = readFilter === 'unread' ? 'false' : 'true';
      if (categoryFilter !== 'all') params.category = categoryFilter;
      const res = await apiListNotifications(params);
      if (seq !== fetchSeq.current) return;
      if (res.success && res.data) {
        setItems(res.data.notifications);
        setUnreadCount(res.data.unreadCount);
      } else {
        setError(res.message || 'Failed to load notifications');
      }
    } catch {
      if (seq !== fetchSeq.current) return;
      setError('Something went wrong');
    } finally {
      if (seq === fetchSeq.current) setLoading(false);
    }
  }, [readFilter, categoryFilter]);

  // Poll the unread count in the background so the badge stays fresh while
  // the panel is closed.
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await apiListNotifications({ limit: '1' });
        if (cancelled) return;
        if (res.success && res.data) setUnreadCount(res.data.unreadCount);
      } catch { /* ignore polling errors */ }
    };
    tick();
    const id = window.setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  // Refetch the full list when the panel opens or filters change.
  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  const handleNotificationClick = async (n: NotificationRecord) => {
    if (!n.read) {
      // Optimistic update.
      setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
      apiMarkNotificationRead(n._id).catch(() => {
        // Revert on failure.
        setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, read: false } : x)));
        setUnreadCount((c) => c + 1);
      });
    }
    if (n.link) {
      setOpen(false);
      navigate({ to: n.link });
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    const prevItems = items;
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    setUnreadCount(0);
    const res = await apiMarkAllNotificationsRead();
    if (!res.success) {
      setItems(prevItems);
      fetchNotifications();
    }
  };

  const handleDelete = async (id: string) => {
    const removed = items.find((x) => x._id === id);
    setItems((prev) => prev.filter((x) => x._id !== id));
    if (removed && !removed.read) setUnreadCount((c) => Math.max(0, c - 1));
    const res = await apiDeleteNotification(id);
    if (!res.success) fetchNotifications();
  };

  const handleClearAll = async () => {
    const prev = items;
    const prevCount = unreadCount;
    setItems([]);
    setUnreadCount(0);
    const res = await apiClearNotifications();
    if (!res.success) {
      setItems(prev);
      setUnreadCount(prevCount);
    }
  };

  const filteredItems = useMemo(() => items, [items]);
  const badgeText = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className="relative p-1.5 text-t3 hover:text-t1 border border-border rounded-lg bg-card transition-colors"
      >
        <Bell size={18} weight="duotone" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full ring-2 ring-card flex items-center justify-center leading-none">
            {badgeText}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-[22rem] sm:w-96 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col max-h-[32rem]"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-t1">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-md bg-accent-glow text-accent text-[9px] font-bold">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowFilters((s) => !s)}
                    aria-label="Toggle filters"
                    className={`p-1.5 rounded-lg transition-colors ${
                      showFilters ? 'bg-accent-glow text-accent' : 'text-t3 hover:text-t1 hover:bg-surface'
                    }`}
                  >
                    <Funnel size={16} weight="duotone" />
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                    className="p-1.5 rounded-lg text-t3 hover:text-t1 hover:bg-surface transition-colors"
                  >
                    <X size={16} weight="bold" />
                  </button>
                </div>
              </div>

              {/* Filters */}
              <AnimatePresence initial={false}>
                {showFilters && (
                  <motion.div
                    key="filters"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="border-b border-border overflow-hidden shrink-0"
                  >
                    <div className="px-4 py-3 space-y-2">
                      <div>
                        <p className="text-[10px] font-semibold text-t3 uppercase tracking-wider mb-1.5">
                          Status
                        </p>
                        <div className="flex gap-1">
                          {(['all', 'unread', 'read'] as ReadFilter[]).map((v) => (
                            <button
                              key={v}
                              onClick={() => setReadFilter(v)}
                              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                                readFilter === v
                                  ? 'bg-accent text-white'
                                  : 'bg-surface text-t2 hover:bg-accent-glow hover:text-accent'
                              }`}
                            >
                              {READ_LABEL[v]}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-t3 uppercase tracking-wider mb-1.5">
                          Category
                        </p>
                        <div className="flex gap-1 flex-wrap">
                          {(['all', 'task', 'target', 'system'] as CategoryFilter[]).map((v) => (
                            <button
                              key={v}
                              onClick={() => setCategoryFilter(v)}
                              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                                categoryFilter === v
                                  ? 'bg-accent text-white'
                                  : 'bg-surface text-t2 hover:bg-accent-glow hover:text-accent'
                              }`}
                            >
                              {CATEGORY_LABEL[v]}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action bar */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0 bg-surface/40">
                <button
                  onClick={handleMarkAllRead}
                  disabled={unreadCount === 0}
                  className="flex items-center gap-1 text-[11px] font-medium text-t2 hover:text-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Check size={13} weight="bold" />
                  Mark all read
                </button>
                <button
                  onClick={handleClearAll}
                  disabled={items.length === 0}
                  className="flex items-center gap-1 text-[11px] font-medium text-t2 hover:text-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Trash size={13} weight="bold" />
                  Clear all
                </button>
              </div>

              {/* List */}
              <OverlayScrollbarsComponent
                className="flex-1"
                options={{ scrollbars: { autoHide: 'leave' } }}
                defer
              >
                {loading && items.length === 0 ? (
                  <div className="flex items-center justify-center py-10">
                    <CircleNotch size={20} weight="bold" className="animate-spin text-accent" />
                  </div>
                ) : error ? (
                  <p className="text-xs text-red-500 text-center py-8 px-4">{error}</p>
                ) : filteredItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <BellSlash size={28} weight="duotone" className="text-t3 mb-2" />
                    <p className="text-xs text-t3">
                      {readFilter === 'unread'
                        ? 'No unread notifications.'
                        : 'No notifications yet.'}
                    </p>
                  </div>
                ) : (
                  <ul>
                    {filteredItems.map((n) => (
                      <li
                        key={n._id}
                        className={`group flex items-start gap-3 px-4 py-3 border-b border-border transition-colors cursor-pointer ${
                          n.read ? 'bg-card hover:bg-surface' : 'bg-accent-glow/40 hover:bg-accent-glow/60'
                        }`}
                        onClick={() => handleNotificationClick(n)}
                      >
                        <div className="shrink-0 mt-0.5">{categoryIcon(n.category)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-xs leading-tight ${n.read ? 'text-t2 font-medium' : 'text-t1 font-bold'}`}>
                              {n.title}
                            </p>
                            {!n.read && (
                              <span className="shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full bg-accent" />
                            )}
                          </div>
                          {n.message && (
                            <p className="text-[11px] text-t3 mt-0.5 line-clamp-2">{n.message}</p>
                          )}
                          <p className="text-[10px] text-t3 mt-1">{relativeTime(n.createdAt)}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(n._id);
                          }}
                          aria-label="Delete notification"
                          className="shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded-md text-t3 hover:text-red-500 hover:bg-red-500/10 transition-all"
                        >
                          <Trash size={13} weight="bold" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </OverlayScrollbarsComponent>

              {/* Footer */}
              {filteredItems.length > 0 && (
                <div className="px-4 py-2 border-t border-border text-center shrink-0">
                  <p className="text-[10px] text-t3">
                    Showing {filteredItems.length} {filteredItems.length === 1 ? 'notification' : 'notifications'}
                  </p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Re-export so consumers can render an inline "all-read" badge if they want it.
export { CheckCircle };
