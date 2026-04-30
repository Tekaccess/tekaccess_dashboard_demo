import React, { useState } from 'react';
import { Spinner, Megaphone, Check, ChatText } from '@phosphor-icons/react';
import { apiCreateAnnouncement } from '../../lib/api';

export default function AnnouncementsPage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ recipients: number; title: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!title.trim()) return setError('Title is required.');
    setBusy(true);
    const res = await apiCreateAnnouncement({
      title: title.trim(),
      message: message.trim() || undefined,
      link: link.trim() || undefined,
    });
    setBusy(false);
    if (!res.success) {
      setError(res.message || 'Failed to send announcement.');
      return;
    }
    setResult(res.data);
    setTitle(''); setMessage(''); setLink('');
  }

  const inp = 'w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent';

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-t1">Announcements</h1>
        <p className="text-sm text-t3 mt-1">Broadcast a message to every user's notification bell</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2.5 rounded-xl bg-accent-glow">
            <Megaphone size={18} weight="duotone" className="text-accent" />
          </div>
          <div>
            <p className="text-sm font-bold text-t1">Compose Announcement</p>
            <p className="text-xs text-t3">All active users will see this in their notification list</p>
          </div>
        </div>

        {result && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 flex items-start gap-2">
            <Check size={14} weight="bold" className="text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-bold text-emerald-400">"{result.title}" sent to {result.recipients} {result.recipients === 1 ? 'user' : 'users'}.</p>
              <p className="text-[11px] text-t3 mt-0.5">They'll see it the next time they open the app or refresh their notifications.</p>
            </div>
          </div>
        )}

        {error && <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2">{error}</p>}

        <div>
          <label className="block text-xs text-t3 mb-1">Title *</label>
          <input className={inp} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Office closed Friday for maintenance" maxLength={200} />
          <p className="text-[10px] text-t3 mt-0.5 text-right">{title.length}/200</p>
        </div>
        <div>
          <label className="block text-xs text-t3 mb-1">Message</label>
          <textarea className={inp} rows={5} value={message} onChange={e => setMessage(e.target.value)} placeholder="Add details, dates, contact info…" maxLength={1000} />
          <p className="text-[10px] text-t3 mt-0.5 text-right">{message.length}/1000</p>
        </div>
        <div>
          <label className="block text-xs text-t3 mb-1">Link (optional)</label>
          <input className={inp} value={link} onChange={e => setLink(e.target.value)} placeholder="/calendar or https://…" />
          <p className="text-[10px] text-t3 mt-1">If set, clicking the notification opens this URL.</p>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <p className="text-[11px] text-t3 inline-flex items-center gap-1">
            <ChatText size={11} weight="duotone" /> Once sent, an announcement cannot be recalled.
          </p>
          <button
            type="button"
            onClick={submit}
            disabled={busy || !title.trim()}
            className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-bold hover:bg-accent-h transition-colors disabled:opacity-60 inline-flex items-center gap-2"
          >
            {busy && <Spinner size={12} className="animate-spin" />}
            {busy ? 'Sending…' : 'Send to everyone'}
          </button>
        </div>
      </div>
    </div>
  );
}
