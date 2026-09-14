import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardCheck, FileCheck2, LockKeyhole, RefreshCw, RotateCcw, Send, ShieldCheck, Users } from 'lucide-react';
import type { TeacherCloudContext, TeacherScopeAssignment } from '../teacherFresh/types';
import {
  acceptToResultBook,
  buildOrLoadResultBook,
  buildResultScopes,
  loadClassSubjectStatuses,
  loadMarks,
  loadOwnedSubjectLists,
  loadProgressBatch,
  loadReadOnlyList,
  loadResultRoster,
  resolveResultTemplate,
  reviewReturn,
  saveSubjectDraft,
  sendResultBookToProgressAndClerk,
  submitSubjectList,
} from './teacherResultService';
import type { ClassSubjectStatus, ResultBookRecord, ResultMarkRow, ResultScope, ResultStudent, ResultSubjectList, ResultTemplateDefinition, ResultTerm } from './types';
import { calculateComputed } from './resultTemplateConfig';
import ClerkMasterMarkListSheet from './ClerkMasterMarkListSheet';
import { divisionScreenLabel } from '../../lib/divisionPresentation';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { getPhase1Cache, putPhase1Cache, queuePhase1Action } from '../../lib/phase1Offline';
import { useCollaborationWarning } from '../../hooks/useCollaborationWarning';
import { collaborationRecordKey } from '../../lib/phase6Collaboration';

export type TeacherResultView = 'subject_marks' | 'class_mark_list' | 'result_book' | 'progress_card';

type Props = { context: TeacherCloudContext | null; loading: boolean; error?: string; view: TeacherResultView; onNavigate?: (moduleId:string) => void };

const termLabel:Record<ResultTerm,string>={first_term:'First Term',second_term:'Second Term'};
const statusClass:Record<string,string>={draft:'bg-slate-100 text-slate-700',submitted:'bg-blue-50 text-blue-700',returned:'bg-rose-50 text-rose-700',accepted:'bg-emerald-50 text-emerald-700'};
const specialCodes=['A','AB','ML','EX','WH','NA'];

function Banner({children,tone='slate'}:{children:any;tone?:'slate'|'amber'|'rose'|'emerald'|'blue'}) {
  const c={slate:'border-slate-200 bg-slate-50 text-slate-700',amber:'border-amber-200 bg-amber-50 text-amber-800',rose:'border-rose-200 bg-rose-50 text-rose-800',emerald:'border-emerald-200 bg-emerald-50 text-emerald-800',blue:'border-blue-200 bg-blue-50 text-blue-800'}[tone];
  return <div className={`rounded-xl border p-3 text-xs font-semibold leading-5 ${c}`}>{children}</div>;
}

function Header({title,subtitle,badge,onBack}:{title:string;subtitle:string;badge:string;onBack?:()=>void}) {
  return <header className="rounded-[1.6rem] border border-slate-800 bg-slate-950 p-5 text-white shadow-lg">
    <div className="flex flex-wrap items-start justify-between gap-4"><div>{onBack&&<button onClick={onBack} className="mb-3 inline-flex items-center gap-1 text-xs font-bold text-cyan-300"><ArrowLeft className="h-3.5 w-3.5"/>Back</button>}<p className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-300">EDUNIXO Result Management</p><h1 className="mt-1 text-2xl font-black">{title}</h1><p className="mt-1 max-w-3xl text-xs leading-5 text-slate-300">{subtitle}</p></div><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-200">{badge}</span></div>
  </header>;
}

function SubjectMarksPage({context,onNavigate}:{context:TeacherCloudContext;onNavigate?:Props['onNavigate']}) {
  const [term,setTerm]=useState<ResultTerm|null>(null);
  const scopes=useMemo(()=>term?buildResultScopes(context,term):[],[context,term]);
  const [scopeId,setScopeId]=useState('');
  const scope=scopes.find(x=>x.id===scopeId);
  const [template,setTemplate]=useState<ResultTemplateDefinition|null>(null);
  const [mappingSource,setMappingSource]=useState('');
  const [roster,setRoster]=useState<ResultStudent[]>([]);
  const [rows,setRows]=useState<Record<string,ResultMarkRow>>({});
  const [list,setList]=useState<ResultSubjectList|null>(null);
  const [backendReady,setBackendReady]=useState(true);
  const [busy,setBusy]=useState(false); const [message,setMessage]=useState(''); const [err,setErr]=useState('');
  const online=useOnlineStatus();
  const localScope={schoolId:context.schoolId,userId:context.userId};
  const cacheKey=scope&&term?`${scope.id}:${term}`:'';
  const collaborationKey=cacheKey?collaborationRecordKey('marks',cacheKey):'';
  const otherEditors=useCollaborationWarning(collaborationKey,Boolean(scope&&term));

  const resetSheet=()=>{setScopeId('');setTemplate(null);setRoster([]);setRows({});setList(null);setMessage('');setErr('')};
  const chooseTerm=(next:ResultTerm)=>{resetSheet();setTerm(next)};
  const backToTerms=()=>{resetSheet();setTerm(null)};

  const reload=async()=>{
    if(!scope||!term)return; setBusy(true);setErr('');setMessage('');
    try{
      const [{template:t,mappingSource:m,backendReady:mapReady},students,owned]=await Promise.all([resolveResultTemplate(scope),loadResultRoster(scope),loadOwnedSubjectLists(scope,context)]);
      setTemplate(t);setMappingSource(m);setRoster(students);setBackendReady(mapReady&&owned.backendReady);const active=owned.lists[0]||null;setList(active);
      const saved=active?await loadMarks(active.id):[];const map:Record<string,ResultMarkRow>={};for(const st of students){const x=saved.find(r=>r.studentId===st.id);map[st.id]=x||{studentId:st.id,marks:{},computed:{}};}setRows(map);
      await putPhase1Cache(localScope,'subject_marks',`${scope.id}:${term}`,{template:t,mappingSource:m,roster:students,rows:map,list:active,backendReady:mapReady&&owned.backendReady,cachedAt:new Date().toISOString()});
    }catch(e:any){
      const cached=await getPhase1Cache<any>(localScope,'subject_marks',`${scope.id}:${term}`);
      if(cached){setTemplate(cached.template);setMappingSource(cached.mappingSource||'Offline cached System Mark List');setRoster(cached.roster||[]);setRows(cached.rows||{});setList(cached.list||null);setBackendReady(cached.backendReady!==false);setMessage('Offline cached Mark List loaded. Save Draft is available; Send to Class Teacher remains online-only.');}
      else setErr(e?.message||'Unable to load Subject Marks List. Open this Mark List once online before using it offline.');
    }
    finally{setBusy(false)}
  };
  useEffect(()=>{if(scope&&term)void reload()},[scope?.id,term]);
  useEffect(()=>{const onSync=(event:any)=>{if(event?.detail?.kind==='result_subject_draft'&&event?.detail?.recordKey===cacheKey&&event?.detail?.ok){setMessage('Offline Mark List draft synced safely to EDUNIXO cloud.');if(navigator.onLine)void reload();}};const onRealtime=(event:any)=>{if(event?.detail?.table==='edunixo_result_subject_lists'&&navigator.onLine&&scope)void reload();};window.addEventListener('edunixo_phase1_sync',onSync as EventListener);window.addEventListener('edunixo_realtime_change',onRealtime as EventListener);return()=>{window.removeEventListener('edunixo_phase1_sync',onSync as EventListener);window.removeEventListener('edunixo_realtime_change',onRealtime as EventListener);};},[cacheKey,scope?.id,term]);

  // Required opening structure: only two term buttons. No search/dropdown form.
  if(!term) return <div className="space-y-5">
    <Header title="Subject Marks List" subtitle="Choose the term. The next screen will show every Class / Division / Subject Mark List assigned to you by the Headmaster." badge="Subject Teacher" onBack={()=>onNavigate?.('tr-dashboard')}/>
    <div className="grid gap-4 sm:grid-cols-2">
      <button onClick={()=>chooseTerm('first_term')} className="group min-h-[150px] rounded-[1.6rem] border border-cyan-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-400 hover:shadow-lg"><p className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-600">Term-wise Mark Lists</p><h2 className="mt-3 text-2xl font-black text-slate-950">FIRST TERM</h2><p className="mt-2 text-xs leading-5 text-slate-500">Open all assigned First Term subject mark sheets.</p><span className="mt-5 inline-flex rounded-full bg-cyan-50 px-3 py-1 text-[10px] font-black text-cyan-700">OPEN TERM →</span></button>
      <button onClick={()=>chooseTerm('second_term')} className="group min-h-[150px] rounded-[1.6rem] border border-violet-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-violet-400 hover:shadow-lg"><p className="text-[10px] font-black uppercase tracking-[.18em] text-violet-600">Term-wise Mark Lists</p><h2 className="mt-3 text-2xl font-black text-slate-950">SECOND TERM</h2><p className="mt-2 text-xs leading-5 text-slate-500">Open all assigned Second Term subject mark sheets.</p><span className="mt-5 inline-flex rounded-full bg-violet-50 px-3 py-1 text-[10px] font-black text-violet-700">OPEN TERM →</span></button>
    </div>
  </div>;

  // Term screen: show every allowed Class / Division / Subject Mark List directly.
  if(!scope) return <div className="space-y-5">
    <Header title={`${termLabel[term]} · Subject Marks List`} subtitle="These are the active subject allocations from Headmaster Academic Setup / cloud assignment. No manual subject search is required." badge={`${scopes.length} assigned list${scopes.length===1?'':'s'}`} onBack={backToTerms}/>
    {!scopes.length?<Banner tone="amber"><b>No subject allocation found for this Teacher.</b> Headmaster → Academics → Teacher & Academic Assignments → Teaching Assignment must contain an active assignment for this account and academic year.<div className="mt-2 text-[10px] font-bold opacity-80">Diagnostic: cloud assignments {context.assignmentDiagnostics?.cloudSubjectRows ?? 0} · Academic Setup matched {context.assignmentDiagnostics?.matchedAcademicSetupSubjectRows ?? 0}/{context.assignmentDiagnostics?.academicSetupSubjectRows ?? 0} · matched Teacher Profiles {context.assignmentDiagnostics?.matchedTeacherProfiles ?? 0}</div></Banner>:
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{scopes.map(item=><button key={item.id} onClick={()=>setScopeId(item.id)} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-cyan-300 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-cyan-700">{item.className} · {divisionScreenLabel(item.division)}</p><h3 className="mt-1 text-base font-black text-slate-950">{item.subjectName}</h3>{item.subjectCode&&<p className="mt-1 text-[10px] font-mono text-slate-400">{item.subjectCode}</p>}</div><span className="rounded-full bg-slate-950 px-2.5 py-1 text-[9px] font-black text-white">OPEN</span></div><div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] text-slate-500"><span>{termLabel[term]}</span><span>{item.studentCount!=null?`${item.studentCount} students`:'Assigned roster'}</span></div></button>)}</div>}
  </div>;

  const locked=list?.status==='submitted'||list?.status==='accepted';
  const owned=new Set(scope.ownedSections||['subject']);
  const canEditHead=(head:any)=>head.kind!=='calculated'&&(head.ownerSection==='subject'||owned.has(head.ownerSection));
  const setCell=(studentId:string,key:string,value:string,max?:number,kind?:string)=>{
    const clean=value.toUpperCase(); if(kind!=='grade'&&value!==''&&!specialCodes.includes(clean)&&Number.isNaN(Number(value)))return;if(max!=null&&!Number.isNaN(Number(value))&&Number(value)>max)return;
    setRows(p=>({...p,[studentId]:{...(p[studentId]||{studentId,marks:{},computed:{}}),marks:{...(p[studentId]?.marks||{}),[key]:value}}}));
  };
  const save=async(send=false)=>{
    if(!template)return;
    setBusy(true);setErr('');setMessage('');
    try{
      if(send){
        const required=template.heads.filter(h=>h.kind!=='calculated'&&canEditHead(h));
        for(const student of roster){
          const row=rows[student.id]||{studentId:student.id,marks:{},computed:{}};
          const missingHead=required.find(h=>String(row.marks[h.key]??'').trim()==='');
          if(missingHead) throw new Error(`${student.name}: ${missingHead.label} is blank. Complete every editable mark/grade cell before sending to the Class Teacher.`);
        }
      }
      if(send&&!online) throw new Error('Send to Class Teacher is online-only. Save this as an Offline Draft and send after internet returns.');
      if(!online){
        const capturedAt=new Date().toISOString();
        await queuePhase1Action({kind:'result_subject_draft',scope:localScope,recordKey:cacheKey,capturedAt,payload:{context,scope,template,rows:Object.values(rows),baseRevision:list?.revision??null,baseUpdatedAt:list?.updatedAt??null}});
        await putPhase1Cache(localScope,'subject_marks',cacheKey,{template,mappingSource,roster,rows,list,backendReady,cachedAt:capturedAt});
        setMessage('Mark List draft saved securely on this device. It will sync automatically when internet returns.');
      }else{
        const saved=await saveSubjectDraft({context,scope,template,rows:Object.values(rows)});
        setList(saved);
        await putPhase1Cache(localScope,'subject_marks',cacheKey,{template,mappingSource,roster,rows,list:saved,backendReady,cachedAt:new Date().toISOString()});
        if(send){const submitted=await submitSubjectList(saved.id,context.userId);setList(submitted);setMessage('Mark List sent to the assigned Class Teacher. It is now read-only until accepted or returned for correction.');}
        else setMessage('Draft saved to cloud.');
      }
    }catch(e:any){setErr(e?.message||'Save failed.')}finally{setBusy(false)}
  };

  return <div className="space-y-5">
    <Header title={`${scope.subjectName} · ${termLabel[term]}`} subtitle={`${scope.className} · ${divisionScreenLabel(scope.division)} · Automatic System Mark List`} badge={list?.status||'draft'} onBack={resetSheet}/>
    {list?.status==='returned'&&<Banner tone="rose"><b>Returned for correction:</b> {list.returnReason||'Class Teacher requested correction.'} Edit only your assigned cells and resubmit.</Banner>}
    {!backendReady&&<Banner tone="amber"><b>Preview is available; cloud Save/Send is not installed yet.</b> The sheet below still uses the automatic system template. Run the Result backend setup only after the UI/template is approved.</Banner>}
    {!online&&<Banner tone="amber"><b>Offline mode.</b> Save Draft is stored encrypted on this device and auto-syncs after reconnection. Send to Class Teacher is intentionally disabled offline.</Banner>}
    {otherEditors>0&&<Banner tone="amber"><b>Concurrent edit warning.</b> {otherEditors} other EDUNIXO session{otherEditors===1?' is':'s are'} on this same Subject Mark List. Save normally; revision/conflict checks remain authoritative.</Banner>}
    {template&&<>
      <div className="rounded-xl border border-slate-200 bg-white p-3 text-[10px] text-slate-600"><b className="text-slate-900">Template:</b> {template.name} <span className="mx-2">•</span><b className="text-slate-900">Source:</b> {mappingSource}{locked&&<span className="ml-2 inline-flex items-center gap-1 rounded-full bg-slate-950 px-2 py-1 font-black text-white"><LockKeyhole className="h-3 w-3"/>Locked</span>}</div>
      {(template.key==='class_1_8_hindi_marathi'||template.key==='class_9_10_dual_language')&&<Banner tone="blue"><b>Hindi/Marathi ownership:</b> {owned.has('hindi')&&owned.has('marathi')?'Both Hindi and Marathi are assigned to you. Both sections are editable.':owned.has('hindi')?'Hindi is editable. Marathi remains locked for the Marathi Subject Teacher.':'Marathi is editable. Hindi remains locked for the Hindi Subject Teacher.'}</Banner>}
      <ClerkMasterMarkListSheet schoolName={context.schoolName} teacherName={context.teacherName} scope={scope} term={term} template={template} roster={roster} rows={rows} locked={locked} onChange={setCell}/>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4"><p className="text-[10px] text-slate-500">Allowed special codes: A, AB, ML, EX, WH, NA. Calculated / other-term / other-teacher cells stay locked.</p><div className="flex gap-2"><button onClick={()=>void reload()} className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"><RefreshCw className="h-3.5 w-3.5"/>{online?'Refresh':'Reload Cache'}</button><button disabled={busy||locked||!backendReady} onClick={()=>void save(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-black disabled:opacity-40">{online?'Save Draft':'Save Offline Draft'}</button><button disabled={busy||locked||!backendReady||!roster.length||!online} onClick={()=>void save(true)} className="inline-flex items-center gap-1 rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white disabled:opacity-40"><Send className="h-3.5 w-3.5"/>{list?.status==='returned'?'Resubmit to Class Teacher':'Send to Class Teacher'}</button></div></div>
    </>}
    {busy&&!template&&<div className="rounded-2xl border bg-white p-8 text-center text-sm font-semibold text-slate-500">Loading automatic assigned Mark List…</div>}
    {message&&<Banner tone="emerald">{message}</Banner>}{err&&<Banner tone="rose">{err}</Banner>}
  </div>;
}

function requireComputed(template:ResultTemplateDefinition,row:ResultMarkRow){ return {...row.marks,...row.computed,...calculateComputed(template,row.marks)}; }

function classTeacherScopes(context:TeacherCloudContext){const map=new Map<string,TeacherScopeAssignment>();for(const a of context.assignments.filter(x=>x.scopeType==='class_teacher'||x.isClassTeacher)){const k=`${a.classId}:${a.divisionId||''}`;if(!map.has(k))map.set(k,a)}return [...map.values()]}

function ClassMarkListPage({context,onNavigate}:{context:TeacherCloudContext;onNavigate?:Props['onNavigate']}){
  const scopes=useMemo(()=>classTeacherScopes(context),[context]);const [scopeId,setScopeId]=useState(scopes[0]?.id||'');const scope=scopes.find(x=>x.id===scopeId)||scopes[0];const [term,setTerm]=useState<ResultTerm>('first_term');const [statuses,setStatuses]=useState<ClassSubjectStatus[]>([]);const [open,setOpen]=useState<ClassSubjectStatus|null>(null);const [preview,setPreview]=useState<any>(null);const [reason,setReason]=useState('');const [err,setErr]=useState('');const [msg,setMsg]=useState('');const [busy,setBusy]=useState(false);const online=useOnlineStatus();
  const reload=async()=>{if(!scope)return;setBusy(true);try{setStatuses(await loadClassSubjectStatuses(context,scope,term));setErr('')}catch(e:any){setErr(e?.message||'Class Mark List could not be loaded.')}finally{setBusy(false)}};useEffect(()=>{void reload()},[scope?.id,term]);
  const openList=async(s:ClassSubjectStatus)=>{if(!s.list)return;setOpen(s);setReason('');setPreview(null);try{setPreview(await loadReadOnlyList(s.list))}catch(e:any){setErr(e?.message||'Unable to open submitted mark list.')}};
  const returnIt=async()=>{if(!open?.list)return;setBusy(true);try{await reviewReturn(open.list,context,reason);setMsg(`${open.subjectName} returned to Subject Teacher for correction.`);setOpen(null);setPreview(null);await reload()}catch(e:any){setErr(e?.message||'Return failed.')}finally{setBusy(false)}};
  const accept=async()=>{if(!open?.list)return;setBusy(true);try{await acceptToResultBook(open.list,context);setMsg(`${open.subjectName} accepted and sent to Result Book. Clerk print queue copy created.`);setOpen(null);setPreview(null);await reload()}catch(e:any){setErr(e?.message||'Accept failed.')}finally{setBusy(false)}};
  if(!scope)return <><Header title="Class Mark List" subtitle="Only Headmaster-assigned Class Teachers can review submitted Subject Mark Lists." badge="Class Teacher only"/><Banner tone="amber">No Class Teacher duty is assigned to this account.</Banner></>;
  return <div className="space-y-5"><Header title="Class Mark List" subtitle="Incoming Subject Mark Lists are read-only. Return for correction or accept and send to Result Book." badge="Read-only review" onBack={()=>onNavigate?.('tr-dashboard')}/>{!online&&<Banner tone="amber"><b>Offline review safety.</b> Class Teacher Return/Accept actions are online-only so workflow state cannot diverge.</Banner>}<div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-3"><label className="text-xs font-bold">Class / Division<select value={scope.id} onChange={e=>setScopeId(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5">{scopes.map(x=><option key={x.id} value={x.id}>{x.className} · {x.division}</option>)}</select></label><label className="text-xs font-bold">Term<select value={term} onChange={e=>setTerm(e.target.value as ResultTerm)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5"><option value="first_term">First Term</option><option value="second_term">Second Term</option></select></label><div className="flex items-end"><button disabled={!online||busy} onClick={()=>void reload()} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-xs font-black disabled:opacity-40">Refresh submitted lists</button></div></div>
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><table className="w-full text-xs"><thead className="bg-slate-950 text-white"><tr><th className="p-3 text-left">Subject</th><th className="p-3 text-left">Subject Teacher</th><th className="p-3">Term</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead><tbody>{statuses.map(s=><tr key={s.subjectId} className="border-t"><td className="p-3 font-black">{s.subjectName}</td><td className="p-3">{s.teacherName||'Assigned Teacher'}</td><td className="p-3 text-center">{termLabel[term]}</td><td className="p-3 text-center"><span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${statusClass[s.list?.status||'draft']}`}>{s.list?.status||'pending'}</span></td><td className="p-3 text-center"><button disabled={!online||!s.list||s.list.status!=='submitted'} onClick={()=>void openList(s)} className="rounded-lg border border-slate-300 px-3 py-1.5 font-bold disabled:opacity-35">Review</button></td></tr>)}{!statuses.length&&<tr><td colSpan={5} className="p-8 text-center text-slate-500">No subject assignment rows are available for this class/division.</td></tr>}</tbody></table></div>
    {open?.list&&preview&&<section className="rounded-2xl border border-blue-200 bg-white shadow-lg"><div className="flex flex-wrap items-center justify-between gap-2 border-b p-4"><div><h2 className="font-black">{open.subjectName} · Read-only Mark List</h2><p className="text-xs text-slate-500">{scope.className} · {scope.division} · {termLabel[term]}</p></div><span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black text-blue-700"><ShieldCheck className="h-3.5 w-3.5"/>Class Teacher review</span></div><div className="overflow-x-auto"><table className="min-w-full text-xs"><thead className="bg-slate-100"><tr><th className="p-2">Roll</th><th className="p-2 text-left">Student</th>{preview.template.heads.map((h:any)=><th key={h.key} className="p-2">{h.label}</th>)}</tr></thead><tbody>{preview.roster.map((s:any,i:number)=>{const r=preview.rows.find((x:any)=>x.studentId===s.id)||{marks:{},computed:{}};const vals=requireComputed(preview.template,r);return <tr key={s.id} className="border-t"><td className="p-2 text-center">{s.rollNumber||i+1}</td><td className="p-2 font-semibold">{s.name}</td>{preview.template.heads.map((h:any)=><td key={h.key} className="p-2 text-center">{h.kind==='calculated'?(vals[h.key]??'—'):(r.marks[h.key]??'—')}</td>)}</tr>})}</tbody></table></div><div className="grid gap-3 border-t p-4 lg:grid-cols-[1fr_auto]"><textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder="Correction reason (mandatory only when returning)…" className="min-h-[80px] rounded-xl border border-slate-300 p-3 text-xs"/><div className="flex flex-wrap items-end gap-2"><button onClick={()=>{setOpen(null);setPreview(null)}} className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-black">Close</button><button disabled={!online||busy||!reason.trim()} onClick={()=>void returnIt()} className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-4 py-2 text-xs font-black text-white disabled:opacity-40"><RotateCcw className="h-3.5 w-3.5"/>Return to Correction</button><button disabled={!online||busy} onClick={()=>void accept()} className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white"><CheckCircle2 className="h-3.5 w-3.5"/>Send to Result Book</button></div></div></section>}
    {msg&&<Banner tone="emerald">{msg}</Banner>}{err&&<Banner tone="rose">{err}</Banner>}
  </div>
}

function ResultBookPage({context,onNavigate}:{context:TeacherCloudContext;onNavigate?:Props['onNavigate']}){
  const scopes=useMemo(()=>classTeacherScopes(context),[context]);
  const[scopeId,setScopeId]=useState(scopes[0]?.id||'');
  const scope=scopes.find(x=>x.id===scopeId)||scopes[0];
  const[term,setTerm]=useState<ResultTerm>('first_term');
  const[book,setBook]=useState<ResultBookRecord|null>(null);
  const[statuses,setStatuses]=useState<ClassSubjectStatus[]>([]);
  const[complete,setComplete]=useState(false);
  const[busy,setBusy]=useState(false);
  const[err,setErr]=useState('');
  const[msg,setMsg]=useState('');
  const online=useOnlineStatus();
  const localScope={schoolId:context.schoolId,userId:context.userId};
  const bookCacheKey=scope?`${scope.id}:${term}`:'';
  const reload=async()=>{if(!scope)return;setBusy(true);try{const r=await buildOrLoadResultBook(context,scope,term);setBook(r.book);setStatuses(r.statuses);setComplete(r.complete);setErr('');await putPhase1Cache(localScope,'result_book',`${scope.id}:${term}`,{...r,cachedAt:new Date().toISOString()})}catch(e:any){const cached=await getPhase1Cache<any>(localScope,'result_book',`${scope.id}:${term}`);if(cached){setBook(cached.book||null);setStatuses(cached.statuses||[]);setComplete(Boolean(cached.complete));setErr('');setMsg('Offline cached Result Book loaded. Rebuild and final forwarding remain online-only.')}else setErr(e?.message||'Result Book unavailable offline until it has been opened once online.')}finally{setBusy(false)}};
  useEffect(()=>{void reload()},[scope?.id,term]);
  useEffect(()=>{const handler=(e:any)=>{if(navigator.onLine&&['edunixo_result_subject_lists','edunixo_result_books'].includes(String(e?.detail?.table||'')))void reload();};window.addEventListener('edunixo_realtime_change',handler as EventListener);return()=>window.removeEventListener('edunixo_realtime_change',handler as EventListener);},[bookCacheKey]);
  if(!scope)return <><Header title="Result Book" subtitle="Available only to the assigned Class Teacher." badge="Class Teacher only"/><Banner tone="amber">No Class Teacher duty is assigned.</Banner></>;
  const studentRows=Object.entries(book?.consolidated||{});
  const columns=book?.columns||[];
  const subjectGroups=columns.reduce((acc:any[],column:any)=>{let group=acc.find(x=>x.subjectName===column.subjectName);if(!group){group={subjectName:column.subjectName,columns:[],scholastic:column.scholastic};acc.push(group)}group.columns.push(column);return acc},[]);
  const send=async()=>{if(!book)return;setBusy(true);try{await sendResultBookToProgressAndClerk(book,context);setMsg('Completed Result Book sent to Progress Card and Clerk print queue.');await reload()}catch(e:any){setErr(e?.message||'Send failed.')}finally{setBusy(false)}};
  return <div className="space-y-5">
    <Header title="Result Book" subtitle="Every accepted Subject Mark List is transferred head-by-head into its correct subject columns. Imported marks are read-only here; corrections must return through the source Subject Mark List." badge="Consolidated read-only" onBack={()=>onNavigate?.('tr-dashboard')}/>
    {!online&&<Banner tone="amber"><b>Offline Result Book.</b> Latest encrypted cached copy is available for viewing. Rebuild and Send to Progress Card & Clerk are online-only.</Banner>}
    <div className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-3"><label className="text-xs font-bold">Class / Division<select value={scope.id} onChange={e=>setScopeId(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2.5">{scopes.map(x=><option key={x.id} value={x.id}>{x.className} · {x.division}</option>)}</select></label><label className="text-xs font-bold">Term<select value={term} onChange={e=>setTerm(e.target.value as ResultTerm)} className="mt-1 w-full rounded-xl border px-3 py-2.5"><option value="first_term">First Term</option><option value="second_term">Second Term</option></select></label><div className="flex items-end"><button disabled={!online||busy} onClick={()=>void reload()} className="w-full rounded-xl border px-3 py-2.5 text-xs font-black disabled:opacity-40">Rebuild from accepted lists</button></div></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{statuses.map(s=><div key={s.subjectId} className="rounded-xl border bg-white p-3"><b className="text-xs">{s.subjectName}</b><p className="mt-1 text-[10px] text-slate-500">{s.list?.status==='accepted'?'Accepted into Result Book':s.list?.status||'Pending from Subject Teacher'}</p></div>)}</div>
    {!complete&&<Banner tone="amber"><b>Result Book incomplete.</b> It can move forward only after every required Subject Mark List for this class/division/term is accepted.</Banner>}
    {book?.status==='sent_to_progress_card'&&<Banner tone="emerald"><b>Forwarded.</b> This completed Result Book has already been sent to Progress Card and the Clerk print queue.</Banner>}
    {subjectGroups.some((x:any)=>!x.scholastic)&&<Banner tone="blue">Grade Subjects remain in their own result columns and are not treated as normal scholastic marks for Grand Total/Percentage unless the approved Result rule explicitly configures that rule.</Banner>}
    <div className="overflow-x-auto rounded-2xl border bg-white"><table className="min-w-max text-xs"><thead className="bg-slate-950 text-white"><tr><th rowSpan={2} className="sticky left-0 z-20 min-w-[190px] bg-slate-950 p-3 text-left">Student</th><th rowSpan={2} className="p-3">Roll</th><th rowSpan={2} className="p-3">GR</th><th rowSpan={2} className="p-3">Seat No.</th>{subjectGroups.map((g:any)=><th key={g.subjectName} colSpan={g.columns.length} className={`border-l border-white/20 p-3 text-center ${g.scholastic?'':'bg-amber-700'}`}>{g.subjectName}{!g.scholastic&&<span className="ml-1 text-[8px] uppercase">Grade Subject</span>}</th>)}</tr><tr>{subjectGroups.flatMap((g:any)=>g.columns.map((c:any)=><th key={c.key} className={`min-w-[92px] border-l border-white/10 px-2 py-2 text-center text-[9px] ${g.scholastic?'bg-slate-900':'bg-amber-800'}`}>{c.label}{c.maxMarks!=null&&<span className="block text-[8px] font-normal opacity-70">Max {c.maxMarks}</span>}</th>))}</tr></thead><tbody>{studentRows.map(([id,row]:any)=><tr key={id} className="border-t"><td className="sticky left-0 z-10 bg-white p-3 font-bold">{row.studentName||id}</td><td className="p-3 text-center">{row.rollNumber||'—'}</td><td className="p-3 text-center">{row.grNumber||'—'}</td><td className="p-3 text-center">{row.examSeatNo||'—'}</td>{columns.map((c:any)=><td key={c.key} className={`border-l p-3 text-center font-black ${c.scholastic?'':'bg-amber-50/50'}`}>{row[c.key]!==''&&row[c.key]!=null?String(row[c.key]):'—'}</td>)}</tr>)}{!studentRows.length&&<tr><td colSpan={4+columns.length} className="p-8 text-center text-slate-500">No consolidated result rows yet.</td></tr>}</tbody></table></div>
    <div className="flex justify-end"><button disabled={busy||!online||!complete||book?.status==='sent_to_progress_card'} onClick={()=>void send()} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white disabled:opacity-40"><FileCheck2 className="h-4 w-4"/>Send to Progress Card & Clerk</button></div>{msg&&<Banner tone="emerald">{msg}</Banner>}{err&&<Banner tone="rose">{err}</Banner>}
  </div>
}

function ProgressCardPage({context,onNavigate}:{context:TeacherCloudContext;onNavigate?:Props['onNavigate']}){
  const scopes=useMemo(()=>classTeacherScopes(context),[context]);
  const[scopeId,setScopeId]=useState(scopes[0]?.id||'');
  const scope=scopes.find(x=>x.id===scopeId)||scopes[0];
  const[term,setTerm]=useState<ResultTerm>('first_term');
  const[batch,setBatch]=useState<any>(null);
  const[err,setErr]=useState('');
  const[msg,setMsg]=useState('');
  const online=useOnlineStatus();
  const localScope={schoolId:context.schoolId,userId:context.userId};
  const loadBatch=async()=>{if(!scope)return;try{const next=await loadProgressBatch(context,scope,term);setBatch(next);setErr('');await putPhase1Cache(localScope,'progress_card',`${scope.id}:${term}`,{batch:next,cachedAt:new Date().toISOString()})}catch(e:any){const cached=await getPhase1Cache<any>(localScope,'progress_card',`${scope.id}:${term}`);if(cached){setBatch(cached.batch||null);setErr('');setMsg('Offline cached Progress Card data loaded.')}else setErr(e?.message||'Progress Card batch unavailable offline until opened once online.')}};
  useEffect(()=>{void loadBatch()},[scope?.id,term]);
  useEffect(()=>{const handler=(e:any)=>{if(navigator.onLine&&e?.detail?.table==='edunixo_progress_card_batches')void loadBatch();};window.addEventListener('edunixo_realtime_change',handler as EventListener);return()=>window.removeEventListener('edunixo_realtime_change',handler as EventListener);},[scope?.id,term]);
  if(!scope)return <><Header title="Progress Card" subtitle="Available only to assigned Class Teachers." badge="Class Teacher only"/><Banner tone="amber">No Class Teacher duty is assigned.</Banner></>;
  const payload=batch?.payload||{};
  const resultRows=payload.rows&&typeof payload.rows==='object'?payload.rows:payload;
  const columns=Array.isArray(payload.columns)?payload.columns:[];
  const summaryColumns=columns.filter((c:any)=>c.kind==='grade'||/(^|\s)(grand\s+)?total$/i.test(String(c.label||''))||/language total|hindi total|marathi total/i.test(String(c.label||''))).filter((c:any,i:number,a:any[])=>a.findIndex(x=>x.subjectName===c.subjectName&&x.key===c.key)===i);
  const fallbackColumns=summaryColumns.length?summaryColumns:columns;
  const rows=Object.entries(resultRows||{}).filter(([id])=>id!=='columns'&&id!=='rows');
  return <div className="space-y-5"><Header title="Progress Card" subtitle="Prepared only from the completed Result Book. This stage is review-only; source subject marks remain locked to their approved Subject Mark Lists." badge="Class Teacher review" onBack={()=>onNavigate?.('tr-dashboard')}/><div className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-2"><label className="text-xs font-bold">Class / Division<select value={scope.id} onChange={e=>setScopeId(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2.5">{scopes.map(x=><option key={x.id} value={x.id}>{x.className} · {x.division}</option>)}</select></label><label className="text-xs font-bold">Term<select value={term} onChange={e=>setTerm(e.target.value as ResultTerm)} className="mt-1 w-full rounded-xl border px-3 py-2.5"><option value="first_term">First Term</option><option value="second_term">Second Term</option></select></label></div>{!online&&<Banner tone="amber"><b>Offline Progress Card.</b> Latest encrypted cached batch is viewable; official generation/publish actions remain online.</Banner>}{msg&&<Banner tone="blue">{msg}</Banner>}{!batch?<Banner tone="amber">No Progress Card batch is ready. Complete the Result Book and use “Send to Progress Card & Clerk” first.</Banner>:<><Banner tone="emerald"><b>Progress Card batch prepared.</b> Status: {batch.status}. The completed Result Book is also available in the Clerk print queue.</Banner><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{rows.map(([id,row]:any)=><article key={id} className="rounded-2xl border bg-white p-4"><div className="flex items-start justify-between"><div><b>{row.studentName||id}</b><p className="text-[10px] text-slate-500">Roll {row.rollNumber||'—'} · GR {row.grNumber||'—'}</p></div><ClipboardCheck className="h-4 w-4 text-emerald-600"/></div><div className="mt-3 space-y-1">{fallbackColumns.map((c:any)=><div key={c.key} className="flex justify-between gap-3 border-t pt-1 text-xs"><span>{c.subjectName} · {c.label}</span><b>{row[c.key]!==''&&row[c.key]!=null?String(row[c.key]):'—'}</b></div>)}</div></article>)}</div></>}{err&&<Banner tone="rose">{err}</Banner>}</div>
}

export default function TeacherResultManagement({context,loading,error,view,onNavigate}:Props){
 if(loading)return <div className="rounded-2xl border bg-white p-8 text-sm font-semibold text-slate-500">Loading Result Management scope…</div>;
 if(error||!context)return <div className="space-y-3"><Header title="Result Management" subtitle="Teacher cloud profile is required before result access can be resolved." badge="Access locked"/><Banner tone="amber">{error||'Teacher cloud context unavailable.'}</Banner></div>;
 const hasCt=classTeacherScopes(context).length>0;
 if(view!=='subject_marks'&&!hasCt)return <div className="space-y-3"><Header title="Class Teacher Result Feature" subtitle="This feature activates only when Headmaster assigns Class Teacher duty." badge="Class Teacher only"/><Banner tone="rose"><AlertTriangle className="mr-1 inline h-4 w-4"/>Normal Subject Teachers cannot access Class Mark List, Result Book or Progress Card.</Banner></div>;
 if(view==='class_mark_list')return <ClassMarkListPage context={context} onNavigate={onNavigate}/>;
 if(view==='result_book')return <ResultBookPage context={context} onNavigate={onNavigate}/>;
 if(view==='progress_card')return <ProgressCardPage context={context} onNavigate={onNavigate}/>;
 return <SubjectMarksPage context={context} onNavigate={onNavigate}/>;
}
