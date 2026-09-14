import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CircleAlert, Clock3, FileCheck2, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const statusClass = (value: unknown) => {
  const key = String(value || '').toLowerCase();
  if (/(approved|resolved)/.test(key)) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (/reject/.test(key)) return 'border-rose-200 bg-rose-50 text-rose-700';
  return 'border-amber-200 bg-amber-50 text-amber-700';
};

async function token() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Secure Headmaster session unavailable.');
  return session.access_token;
}

export default function StudentServiceRequestDesk({ activeFeatureId }: { activeFeatureId?: string | null }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [resolution, setResolution] = useState<Record<string,string>>({});
  const load = async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/admin/student-service-requests', { headers:{ Authorization:`Bearer ${await token()}` }, cache:'no-store' });
      const payload = await response.json().catch(()=>({}));
      if (!response.ok) throw new Error(payload.error || 'Student Service Requests could not be loaded.');
      setRows(Array.isArray(payload.requests) ? payload.requests : []);
    } catch (e:any) { setError(e?.message || 'Student Service Requests could not be loaded.'); }
    finally { setLoading(false); }
  };
  useEffect(()=>{ void load(); },[]);
  const pending = useMemo(()=>rows.filter(r=>String(r.status).toLowerCase()==='pending'),[rows]);
  const visibleRows = useMemo(() => {
    if (activeFeatureId === 'student-service-request-queue') return rows.filter(r => String(r.status).toLowerCase() === 'pending');
    if (activeFeatureId === 'student-service-request-history') return rows.filter(r => String(r.status).toLowerCase() !== 'pending');
    return rows;
  }, [rows, activeFeatureId]);
  const decide = async (row:any, status:'approved'|'rejected'|'resolved') => {
    const note=String(resolution[row.id]||'').trim();
    if (note.length<2) { setError('Add a short resolution/remark before deciding.'); return; }
    setBusy(row.id); setError('');
    try {
      const response=await fetch(`/api/admin/student-service-requests/${encodeURIComponent(row.id)}/decision`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${await token()}`},body:JSON.stringify({status,resolution:note})});
      const payload=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(payload.error||'Decision could not be saved.');
      setRows(prev=>prev.map(item=>item.id===row.id?{...item,status,resolution:note,decidedAt:new Date().toISOString(),decidedBy:'Headmaster'}:item));
    } catch(e:any){setError(e?.message||'Decision could not be saved.');}
    finally{setBusy('');}
  };
  if(loading) return <div className="grid min-h-[360px] place-items-center rounded-3xl border border-slate-200 bg-white"><Loader2 className="h-9 w-9 animate-spin text-cyan-600"/></div>;
  return <div className="space-y-5 text-left">
    <header className="rounded-[1.75rem] bg-slate-950 p-6 text-white shadow-2xl sm:p-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-cyan-300"><FileCheck2 className="h-4 w-4"/>Student Service Requests</div><h1 className="mt-3 text-2xl font-black">Student requests, one auditable decision queue.</h1><p className="mt-2 text-xs leading-6 text-slate-400">Certificate, library, profile-correction and support requests submitted from Student Portal. Decisions automatically return to the same Student account.</p></div><button onClick={()=>void load()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-xs font-black"><RefreshCw className="h-4 w-4"/>Refresh</button></div></header>
    {error&&<div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">{error}</div>}
    <div className="grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Pending</div><div className="mt-2 text-3xl font-black">{pending.length}</div></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Total Requests</div><div className="mt-2 text-3xl font-black">{rows.length}</div></div><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><div className="text-[9px] font-black uppercase tracking-wider text-emerald-700">Resolved</div><div className="mt-2 text-3xl font-black text-emerald-900">{rows.length-pending.length}</div></div></div>
    {!visibleRows.length?<div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600"/><h3 className="mt-3 font-black text-slate-900">No Student Service Request</h3><p className="mt-2 text-xs text-slate-500">The queue is clear.</p></div>:<div className="space-y-4">{visibleRows.map(row=><article key={row.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-cyan-50 px-3 py-1 text-[9px] font-black uppercase text-cyan-700">{String(row.type).replaceAll('_',' ')}</span><span className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase ${statusClass(row.status)}`}>{row.status}</span></div><h3 className="mt-3 text-base font-black text-slate-950">{row.title}</h3><p className="mt-2 max-w-3xl whitespace-pre-wrap text-xs leading-6 text-slate-600">{row.details}</p><div className="mt-3 text-[10px] font-bold text-slate-400">{row.studentName} · GR {row.grNumber||'—'} · {row.className||'Class'} {row.divisionName||''} · {row.createdAt?new Date(row.createdAt).toLocaleString('en-IN'):'—'}</div></div></div>{String(row.status).toLowerCase()==='pending'?<div className="mt-5 border-t border-slate-100 pt-5"><textarea rows={3} value={resolution[row.id]||''} onChange={e=>setResolution(prev=>({...prev,[row.id]:e.target.value}))} placeholder="Headmaster resolution / remarks" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs"/><div className="mt-3 flex flex-wrap gap-2"><button disabled={busy===row.id} onClick={()=>void decide(row,'approved')} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50"><CheckCircle2 className="h-4 w-4"/>Approve</button><button disabled={busy===row.id} onClick={()=>void decide(row,'resolved')} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50"><Clock3 className="h-4 w-4"/>Resolve</button><button disabled={busy===row.id} onClick={()=>void decide(row,'rejected')} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50"><XCircle className="h-4 w-4"/>Reject</button>{busy===row.id&&<Loader2 className="h-5 w-5 animate-spin text-cyan-600"/>}</div></div>:<div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-600"><CircleAlert className="mr-2 inline h-4 w-4"/><b>{row.decidedBy||'Headmaster'}:</b> {row.resolution||'Decision recorded.'}</div>}</article>)}</div>}
  </div>;
}
