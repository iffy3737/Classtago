import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FileCheck2, Loader2, LockKeyhole, RefreshCw, ShieldCheck, UsersRound } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { requestActionConfirm } from '../lib/actionConfirm';

async function authToken() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) throw new Error('Secure Headmaster session unavailable.');
  return session.access_token;
}

const statusClass = (value: unknown) => {
  const key=String(value || '').toLowerCase();
  if (key==='final') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (key==='reviewed') return 'border-cyan-200 bg-cyan-50 text-cyan-700';
  return 'border-amber-200 bg-amber-50 text-amber-700';
};

export default function HeadmasterResultPublicationDesk() {
  const [rows,setRows]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState('');
  const [note,setNote]=useState<Record<string,string>>({});

  const load=async()=>{
    setLoading(true); setError('');
    try {
      const response=await fetch('/api/headmaster/result-publication',{headers:{Authorization:`Bearer ${await authToken()}`},cache:'no-store'});
      const payload=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(payload.error || 'Result Publication queue could not be loaded.');
      setRows(Array.isArray(payload.batches)?payload.batches:[]);
    } catch(e:any){setError(e?.message || 'Result Publication queue could not be loaded.');}
    finally{setLoading(false);}
  };
  useEffect(()=>{void load();},[]);
  const pending=useMemo(()=>rows.filter(row=>['prepared','reviewed'].includes(String(row.status).toLowerCase())),[rows]);
  const finalCount=rows.filter(row=>String(row.status).toLowerCase()==='final').length;

  const act=async(row:any,action:'review'|'publish')=>{
    if(action==='publish') {
      const ok=await requestActionConfirm({
        title:'Publish & lock Progress Card?',
        message:`This will make the ${String(row.term||'result').replaceAll('_',' ')} Progress Card visible to ${row.studentCount || 0} Student account(s). Final publication is an auditable Headmaster action.`,
        confirmLabel:'Publish & Lock', cancelLabel:'Cancel', tone:'warning'
      });
      if(!ok) return;
    }
    setBusy(`${row.id}:${action}`); setError('');
    try {
      const response=await fetch(`/api/headmaster/result-publication/${encodeURIComponent(row.id)}/action`,{
        method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${await authToken()}`},
        body:JSON.stringify({action,note:String(note[row.id]||'').trim() || null})
      });
      const payload=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(payload.error || 'Result Publication action could not be saved.');
      setRows(prev=>prev.map(item=>item.id===row.id?{...item,status:payload.status,updatedAt:new Date().toISOString()}:item));
    } catch(e:any){setError(e?.message || 'Result Publication action could not be saved.');}
    finally{setBusy('');}
  };

  if(loading) return <div className="grid min-h-[380px] place-items-center rounded-3xl border border-slate-200 bg-white"><Loader2 className="h-9 w-9 animate-spin text-violet-600"/></div>;
  return <div className="space-y-5 text-left">
    <header className="overflow-hidden rounded-[1.8rem] bg-slate-950 p-6 text-white shadow-2xl sm:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-violet-300"><ShieldCheck className="h-4 w-4"/>Headmaster Final Authority</div><h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Result Publication & Lock</h1><p className="mt-2 max-w-3xl text-xs leading-6 text-slate-400">Class Teachers prepare Progress Cards. Students can see a Progress Card only after this final Headmaster publication. Published batches are locked and every action is written to the audit trail.</p></div>
        <button onClick={()=>void load()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-xs font-black"><RefreshCw className="h-4 w-4"/>Refresh Queue</button>
      </div>
    </header>
    {error&&<div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">{error}</div>}
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><div className="text-[9px] font-black uppercase tracking-wider text-amber-700">Awaiting Final Action</div><div className="mt-2 text-3xl font-black text-amber-950">{pending.length}</div></div>
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><div className="text-[9px] font-black uppercase tracking-wider text-emerald-700">Published & Locked</div><div className="mt-2 text-3xl font-black text-emerald-950">{finalCount}</div></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="text-[9px] font-black uppercase tracking-wider text-slate-400">All Progress Batches</div><div className="mt-2 text-3xl font-black text-slate-950">{rows.length}</div></div>
    </div>
    {!rows.length?<div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center"><CheckCircle2 className="mx-auto h-9 w-9 text-emerald-600"/><h3 className="mt-3 font-black text-slate-950">No Progress Card batch yet</h3><p className="mt-2 text-xs text-slate-500">A batch will appear after the Class Teacher completes the Result Book and sends it to Progress Card & Clerk.</p></div>:
      <div className="space-y-4">{rows.map(row=>{
        const final=String(row.status).toLowerCase()==='final';
        return <article key={row.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase ${statusClass(row.status)}`}>{row.status}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-[9px] font-black uppercase text-slate-600">{String(row.term||'').replaceAll('_',' ')}</span></div><h3 className="mt-3 text-lg font-black text-slate-950">{row.className} · {row.divisionName}</h3><p className="mt-1 text-xs text-slate-500">{row.academicYear}</p><div className="mt-4 flex flex-wrap gap-4 text-[10px] font-bold text-slate-500"><span className="inline-flex items-center gap-1.5"><UsersRound className="h-4 w-4"/>{row.studentCount} Students</span><span className="inline-flex items-center gap-1.5"><FileCheck2 className="h-4 w-4"/>Result Book linked</span>{final&&<span className="inline-flex items-center gap-1.5 text-emerald-700"><LockKeyhole className="h-4 w-4"/>Student-visible final copy</span>}</div></div>
            {!final&&<div className="w-full xl:max-w-md"><textarea rows={2} value={note[row.id]||''} onChange={e=>setNote(prev=>({...prev,[row.id]:e.target.value}))} placeholder="Optional Headmaster review note" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs"/><div className="mt-3 flex flex-wrap gap-2"><button disabled={Boolean(busy)} onClick={()=>void act(row,'review')} className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2.5 text-xs font-black text-cyan-800 disabled:opacity-50"><CheckCircle2 className="h-4 w-4"/>Mark Reviewed</button><button disabled={Boolean(busy)} onClick={()=>void act(row,'publish')} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50"><LockKeyhole className="h-4 w-4"/>Publish & Lock</button>{busy.startsWith(`${row.id}:`)&&<Loader2 className="h-5 w-5 animate-spin text-violet-600"/>}</div></div>}
          </div>
        </article>;
      })}</div>}
  </div>;
}
