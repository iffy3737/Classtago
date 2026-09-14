import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Link2, Loader2, RefreshCw, ShieldCheck, UserRound, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

type RequestRow = {
  id: string; requestKind: string; parentUserId: string; parentName: string; parentLoginId: string;
  parentMobile: string; studentId: string; studentName: string; grNumber: string; requestCode: string;
  requestedAt?: string | null; status: string; decisionRemarks?: string | null; decidedAt?: string | null;
};

async function token() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error('Headmaster session expired. Sign in again.');
  return data.session.access_token;
}
async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const auth = await token();
  const response = await fetch(url, { ...init, cache: 'no-store', headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...(init?.headers || {}), Authorization: `Bearer ${auth}` } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || 'Parent approval request failed.');
  return payload as T;
}

export default function ParentAccountApprovalDesk() {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [view, setView] = useState<'pending'|'active'|'history'>('pending');

  const load = async () => {
    setLoading(true); setMessage('');
    try { const payload = await api<{ requests: RequestRow[] }>('/api/admin/parent-account-requests'); setRows(Array.isArray(payload.requests) ? payload.requests : []); }
    catch (e: any) { setMessage(e?.message || 'Parent approval queue could not load.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const filtered = useMemo(() => rows.filter(row => view === 'pending' ? row.status === 'Pending' : view === 'active' ? row.status === 'Approved' : ['Rejected','Revoked'].includes(row.status)), [rows, view]);

  const decide = async (row: RequestRow, decision: 'approve'|'reject') => {
    const note = String(remarks[row.id] || '').trim();
    if (decision === 'reject' && note.length < 3) { setMessage('Rejection reason is required.'); return; }
    setBusy(row.id); setMessage('');
    try {
      await api(`/api/admin/parent-account-requests/${encodeURIComponent(row.id)}/decision`, { method: 'POST', body: JSON.stringify({ decision, remarks: note }) });
      setMessage(decision === 'approve' ? 'Parent-child link approved. Parent Portal access is now active.' : 'Parent request rejected.');
      await load();
    } catch (e: any) { setMessage(e?.message || 'Decision could not be saved.'); }
    finally { setBusy(''); }
  };

  const revoke = async (row: RequestRow) => {
    const note = String(remarks[row.id] || '').trim();
    if (note.length < 3) { setMessage('Revocation reason is required before removing Parent access to a child.'); return; }
    setBusy(row.id); setMessage('');
    try {
      await api(`/api/admin/parent-child-links/${encodeURIComponent(row.id)}/revoke`, { method: 'POST', body: JSON.stringify({ remarks: note }) });
      setMessage('Parent-child access revoked. Historical approval records remain preserved for audit.');
      await load();
    } catch (e: any) { setMessage(e?.message || 'Parent-child link could not be revoked.'); }
    finally { setBusy(''); }
  };

  return <section className="space-y-6">
    <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl">
      <div className="bg-slate-950 p-6 text-white sm:p-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-4"><div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/5 text-violet-300"><Link2 className="h-6 w-6"/></div><div><div className="text-[9px] font-black uppercase tracking-[.2em] text-violet-300">Verified Family Access</div><h2 className="mt-1 text-2xl font-black">Parent Accounts & Child Links</h2><p className="mt-2 max-w-2xl text-xs leading-5 text-slate-400">Final Headmaster approval for new Parent Portal accounts and additional child links. Student Master identity and parent contact evidence are verified before a request reaches this desk.</p></div></div><button onClick={()=>void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-xs font-black"><RefreshCw className={`h-4 w-4 ${loading?'animate-spin':''}`}/>Refresh</button></div></div>
      <div className="p-5 sm:p-7">
        {message && <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs font-bold text-slate-700">{message}</div>}
        <div className="mb-5 flex flex-wrap gap-2"><button onClick={()=>setView('pending')} className={`rounded-xl px-4 py-2.5 text-xs font-black ${view==='pending'?'bg-slate-950 text-white':'border bg-white text-slate-700'}`}>Pending ({rows.filter(r=>r.status==='Pending').length})</button><button onClick={()=>setView('active')} className={`rounded-xl px-4 py-2.5 text-xs font-black ${view==='active'?'bg-slate-950 text-white':'border bg-white text-slate-700'}`}>Active Links ({rows.filter(r=>r.status==='Approved').length})</button><button onClick={()=>setView('history')} className={`rounded-xl px-4 py-2.5 text-xs font-black ${view==='history'?'bg-slate-950 text-white':'border bg-white text-slate-700'}`}>Inactive History</button></div>
        {loading ? <div className="flex min-h-56 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-violet-600"/></div> : filtered.length ? <div className="space-y-4">{filtered.map(row => <article key={row.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-violet-50 px-3 py-1 text-[9px] font-black uppercase text-violet-700">{row.requestKind==='initial_parent_signup'?'New Parent Account':'Additional Child Link'}</span><span className={`rounded-full border px-3 py-1 text-[9px] font-black ${row.status==='Approved'?'border-emerald-200 bg-emerald-50 text-emerald-700':row.status==='Rejected'?'border-rose-200 bg-rose-50 text-rose-700':row.status==='Revoked'?'border-slate-300 bg-slate-100 text-slate-700':'border-amber-200 bg-amber-50 text-amber-700'}`}>{row.status}</span></div><h3 className="mt-3 text-base font-black text-slate-950">{row.parentName}</h3><div className="mt-1 text-xs text-slate-500">Parent Login: <b>{row.parentLoginId || 'Pending'}</b> · Mobile: {row.parentMobile || '—'}</div><div className="mt-3 rounded-2xl bg-slate-50 p-4"><div className="flex items-center gap-2 font-black text-slate-900"><UserRound className="h-4 w-4"/>{row.studentName}</div><div className="mt-1 text-xs text-slate-500">GR {row.grNumber || '—'} · Request {row.requestCode || row.id}</div></div></div>{row.status==='Pending' && <div className="w-full lg:max-w-sm"><textarea value={remarks[row.id]||''} onChange={e=>setRemarks(v=>({...v,[row.id]:e.target.value}))} rows={3} className="w-full rounded-xl border border-slate-200 p-3 text-xs" placeholder="Optional approval note / required rejection reason"/><div className="mt-2 grid grid-cols-2 gap-2"><button onClick={()=>void decide(row,'reject')} disabled={busy===row.id} className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-black text-rose-700 disabled:opacity-50"><XCircle className="h-4 w-4"/>Reject</button><button onClick={()=>void decide(row,'approve')} disabled={busy===row.id} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-black text-white disabled:opacity-50">{busy===row.id?<Loader2 className="h-4 w-4 animate-spin"/>:<CheckCircle2 className="h-4 w-4"/>}Approve</button></div></div>}{row.status==='Approved' && view==='active' && <div className="w-full lg:max-w-sm"><textarea value={remarks[row.id]||''} onChange={e=>setRemarks(v=>({...v,[row.id]:e.target.value}))} rows={3} className="w-full rounded-xl border border-slate-200 p-3 text-xs" placeholder="Required reason to revoke this child link"/><button onClick={()=>void revoke(row)} disabled={busy===row.id} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-black text-rose-700 disabled:opacity-50">{busy===row.id?<Loader2 className="h-4 w-4 animate-spin"/>:<XCircle className="h-4 w-4"/>}Revoke Child Access</button></div>}</div>{row.status!=='Pending'&&row.decisionRemarks&&<p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">{row.decisionRemarks}</p>}</article>)}</div> : <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center"><ShieldCheck className="mx-auto h-8 w-8 text-emerald-600"/><h3 className="mt-3 text-sm font-black">{view==='pending'?'No Parent approval pending':view==='active'?'No active Parent-child links':'No inactive Parent-link history yet'}</h3><p className="mt-2 text-xs text-slate-500">Only verified, school-scoped Parent-child requests appear here.</p></div>}
      </div>
    </div>
  </section>;
}
