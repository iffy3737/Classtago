import React, { useEffect, useState } from 'react';

interface Props { user:any; lang?:string; }

export default function CloudNotificationCenter({ user }: Props) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/notifications/me', { credentials: 'include' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Notifications could not be loaded.');
      setItems(Array.isArray(data?.notifications) ? data.notifications : []);
    } catch (e:any) { setError(e?.message || 'Notifications could not be loaded.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [user?.id]);

  const markRead = async (item:any) => {
    if (item.isRead) return;
    const path = user?.role === 'student' ? `/api/student/portal/notifications/${encodeURIComponent(item.id)}/read`
      : user?.role === 'parent' ? `/api/parent/portal/notifications/${encodeURIComponent(item.id)}/read`
      : `/api/peon/notifications/${encodeURIComponent(item.id)}/read`;
    try {
      const response = await fetch(path, { method:'POST', credentials:'include' });
      if (!response.ok) return;
      setItems(prev => prev.map(x => x.id === item.id ? { ...x, isRead:true, readAt:new Date().toISOString() } : x));
    } catch { /* keep notification unread when cloud update fails */ }
  };

  return <div className="space-y-4 text-left">
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div><h2 className="text-lg font-black text-slate-900">Notifications</h2><p className="mt-1 text-xs text-slate-500">Official school notifications from the cloud record.</p></div>
        <button type="button" onClick={() => void load()} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Refresh</button>
      </div>
    </div>
    {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700">{error}</div>}
    {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading notifications…</div>
      : items.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No notifications yet.</div>
      : <div className="space-y-3">{items.map(item => <button key={item.id} type="button" onClick={() => void markRead(item)} className={`w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:border-slate-300 ${item.isRead ? 'border-slate-200' : 'border-blue-200 ring-1 ring-blue-50'}`}>
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="font-black text-slate-900">{item.title || 'School Notification'}</div><div className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">{item.body || ''}</div></div><span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase ${item.isRead ? 'bg-slate-100 text-slate-500' : 'bg-blue-100 text-blue-700'}`}>{item.isRead ? 'Read' : 'New'}</span></div>
        <div className="mt-2 text-[10px] font-medium text-slate-400">{item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}</div>
      </button>)}</div>}
  </div>;
}
