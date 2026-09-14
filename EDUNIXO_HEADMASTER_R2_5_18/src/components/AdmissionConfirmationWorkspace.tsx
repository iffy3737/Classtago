import React, { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, CheckCircle2, ChevronRight, CircleAlert, GraduationCap, KeyRound, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { requestActionConfirm } from '../lib/actionConfirm';

type Application = {
  id:string; referenceCode:string; studentName:string; guardianName:string; mobile:string; classApplying:string;
  status:string; admissionSession?:string|null; payload?:Record<string,any>; confirmation?:Record<string,any>|null;
};
type ClassOption = { id:string; name:string };
type DivisionOption = { id:string; classId?:string|null; name:string };
type Props = { activeFeatureId?:string|null };
type SectionKey = 'verification'|'approval'|'gr'|'confirm'|'student'|'link';

const featureToSection: Record<string,SectionKey> = {
  'final-admission-verification':'verification',
  'confirm-admission':'confirm',
  'create-student-record':'student',
  'assign-admission-gr':'gr',
  'initiate-student-link':'link'
};

async function api(url:string, options:RequestInit={}) {
  const { data:{session} } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Secure session unavailable. Please sign in again.');
  const response = await fetch(url,{
    ...options,
    headers:{...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{}),Authorization:`Bearer ${session.access_token}`}
  });
  const payload=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(payload.error||'Request failed.');
  return payload;
}

export default function AdmissionConfirmationWorkspace({activeFeatureId}:Props){
  const [applications,setApplications]=useState<Application[]>([]);
  const [classes,setClasses]=useState<ClassOption[]>([]);
  const [divisions,setDivisions]=useState<DivisionOption[]>([]);
  const [selectedId,setSelectedId]=useState('');
  const [section,setSection]=useState<SectionKey>(featureToSection[activeFeatureId||'']||'verification');
  const [gr,setGr]=useState('');
  const [classId,setClassId]=useState('');
  const [divisionId,setDivisionId]=useState('');
  const [roll,setRoll]=useState('');
  const [admissionDate,setAdmissionDate]=useState(new Date().toISOString().slice(0,10));
  const [decisionNote,setDecisionNote]=useState('');
  const [loading,setLoading]=useState(true);
  const [working,setWorking]=useState(false);
  const [message,setMessage]=useState<{type:'success'|'error';text:string}|null>(null);

  const selected=useMemo(()=>applications.find(x=>x.id===selectedId)||applications[0]||null,[applications,selectedId]);
  const availableDivisions=useMemo(()=>divisions.filter(x=>!x.classId||!classId||String(x.classId)===String(classId)),[divisions,classId]);
  const statusKey=String(selected?.status||'').trim().toLowerCase();
  const isApproved=statusKey==='approved';
  const canConfirm=Boolean(selected&&!selected.confirmation&&isApproved);
  const allocationReady=Boolean(gr.trim()&&classId&&admissionDate);

  const load=async()=>{
    setLoading(true);setMessage(null);
    try{
      const [queue,setup]=await Promise.all([
        api('/api/school-website/admission-confirmation'),
        api('/api/school-website/admission-confirmation/setup')
      ]);
      const rows=Array.isArray(queue.applications)?queue.applications:[];
      setApplications(rows);
      setSelectedId(current=>rows.some((x:Application)=>x.id===current)?current:(rows[0]?.id||''));
      setClasses(Array.isArray(setup.classes)?setup.classes:[]);
      setDivisions(Array.isArray(setup.divisions)?setup.divisions:[]);
    }catch(e:any){setMessage({type:'error',text:e.message});}
    finally{setLoading(false);}
  };

  useEffect(()=>{void load();},[]);
  useEffect(()=>{if(activeFeatureId&&featureToSection[activeFeatureId])setSection(featureToSection[activeFeatureId]);},[activeFeatureId]);
  useEffect(()=>{
    if(!selected){
      setGr('');setClassId('');setDivisionId('');setRoll('');setDecisionNote('');
      setAdmissionDate(new Date().toISOString().slice(0,10));
      return;
    }
    const confirmation=selected.confirmation||{};
    const payload=selected.payload&&typeof selected.payload==='object'?selected.payload:{};
    const office=payload.office&&typeof payload.office==='object'?payload.office:{};
    const academic=payload.academic&&typeof payload.academic==='object'?payload.academic:{};
    const requestedClass=String(academic.classApplying||selected.classApplying||'').trim().toLowerCase();
    const requestedDivision=String(academic.division||'').trim().toLowerCase();
    const matchedClass=classes.find(item=>String(item.id)===String(academic.classId||''))
      || classes.find(item=>requestedClass && requestedClass.includes(String(item.name||'').trim().toLowerCase()));
    const resolvedClassId=String(confirmation?.classId||matchedClass?.id||'');
    const matchedDivision=divisions.find(item=>String(item.id)===String(confirmation?.divisionId||''))
      || divisions.find(item=>(!resolvedClassId||!item.classId||String(item.classId)===resolvedClassId) && requestedDivision && String(item.name||'').trim().toLowerCase()===requestedDivision);
    setGr(String(confirmation?.grNumber||office.proposedGrNumber||''));
    setClassId(resolvedClassId);
    setDivisionId(String(confirmation?.divisionId||matchedDivision?.id||''));
    setRoll(String(confirmation?.rollNumber||office.proposedRollNumber||''));
    setAdmissionDate(String(confirmation?.admissionDate||office.admissionDate||new Date().toISOString().slice(0,10)));
    setDecisionNote('');
    setMessage(null);
  },[selected?.id,selected?.confirmation,classes,divisions]);

  const decideApplication=async(nextStatus:'approved'|'rejected')=>{
    if(!selected||selected.confirmation)return;
    if(nextStatus==='rejected'&&!decisionNote.trim()){
      setMessage({type:'error',text:'Enter a rejection reason before rejecting this application.'});
      setSection('approval');
      return;
    }
    const approved=nextStatus==='approved';
    const confirmed=await requestActionConfirm({
      title:approved?'Approve admission application?':'Reject admission application?',
      message:approved
        ? `Approve ${selected.studentName}'s application and unlock GR allocation and final admission confirmation?`
        : `Reject ${selected.studentName}'s application? The reason will be recorded in the admission audit trail.`,
      confirmLabel:approved?'Approve Application':'Reject Application',
      tone:'warning'
    });
    if(!confirmed)return;
    setWorking(true);setMessage(null);
    try{
      const note=decisionNote.trim();
      const payload=await api(`/api/school-website/admission-applications/${selected.id}/status`,{
        method:'PATCH',
        body:JSON.stringify({
          status:nextStatus,
          publicMessage:approved?'Application approved by the Headmaster.':`Application rejected by the Headmaster.${note?` Reason: ${note}`:''}`,
          internalNote:note||null
        })
      });
      if(approved){
        setApplications(current=>current.map(item=>item.id===selected.id?{...item,...payload.application,status:'approved'}:item));
        setMessage({type:'success',text:'Application approved. GR and admission allocation are now unlocked.'});
        setSection('gr');
      }else{
        setApplications(current=>current.filter(item=>item.id!==selected.id));
        setMessage({type:'success',text:'Application rejected. The decision and reason were recorded in the cloud audit trail.'});
        setSection('verification');
      }
      window.dispatchEvent(new Event('refresh_notifications'));
    }catch(e:any){setMessage({type:'error',text:e.message});}
    finally{setWorking(false);}
  };

  const confirm=async()=>{
    if(!selected||selected.confirmation)return;
    if(!canConfirm){
      setMessage({type:'error',text:'Headmaster approval is required before final admission confirmation.'});
      setSection('approval');
      return;
    }
    if(!gr.trim()||!classId||!admissionDate){
      setMessage({type:'error',text:'Complete GR number, class and admission date before confirming admission.'});
      setSection('gr');
      return;
    }
    if(!(await requestActionConfirm({
      title:'Confirm admission?',
      message:`Confirm admission for ${selected.studentName} and create the permanent Student Master record with GR ${gr.toUpperCase()}?`,
      confirmLabel:'Confirm Admission',
      tone:'warning'
    })))return;
    setWorking(true);setMessage(null);
    try{
      const payload=await api(`/api/school-website/admission-applications/${selected.id}/confirm`,{
        method:'POST',
        body:JSON.stringify({grNumber:gr,classId,divisionId:divisionId||null,rollNumber:roll||null,admissionDate})
      });
      setApplications(current=>current.map(item=>item.id===selected.id?{...item,status:'Admission Confirmed',confirmation:payload.confirmation}:item));
      setMessage({type:'success',text:'Admission confirmed. The permanent Student Master record was created successfully.'});
      setSection('student');
    }catch(e:any){setMessage({type:'error',text:e.message});}
    finally{setWorking(false);}
  };

  if(loading)return <div className="grid min-h-[420px] place-items-center rounded-3xl border border-slate-200 bg-white"><Loader2 className="h-9 w-9 animate-spin text-cyan-600"/></div>;

  const steps:[SectionKey,string,React.ComponentType<any>][]=[
    ['verification','1. Final Verification',ShieldCheck],
    ['approval','2. Headmaster Decision',BadgeCheck],
    ['gr','3. GR & Allocation',GraduationCap],
    ['confirm','4. Confirm Admission',BadgeCheck],
    ['student','5. Student Record',GraduationCap],
    ['link','6. Account Linking',KeyRound]
  ];

  return <div className="space-y-5">
    <header className="rounded-[1.75rem] bg-[radial-gradient(circle_at_8%_0%,rgba(34,211,238,.2),transparent_35%),radial-gradient(circle_at_92%_0%,rgba(139,92,246,.2),transparent_38%),linear-gradient(135deg,#07172d,#080b1c_56%,#17112e)] p-6 text-white shadow-2xl sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-cyan-300"><BadgeCheck className="h-4 w-4"/>Admission Confirmation</div><h1 className="mt-3 text-2xl font-black sm:text-3xl">Review → approve → allocate → confirm.</h1><p className="mt-2 max-w-3xl text-xs leading-6 text-slate-300">The Headmaster makes the final admission decision. The permanent Student Master record is created only after approval and GR allocation.</p></div>
        <button onClick={()=>void load()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-xs font-black"><RefreshCw className="h-4 w-4"/>Refresh queue</button>
      </div>
    </header>

    {message&&<div className={`rounded-xl border p-4 text-sm font-bold ${message.type==='success'?'border-emerald-200 bg-emerald-50 text-emerald-800':'border-rose-200 bg-rose-50 text-rose-800'}`}>{message.text}</div>}

    {applications.length===0?<div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500"/><h2 className="mt-4 font-black text-slate-950">No verified or approved applications</h2><p className="mt-2 text-xs text-slate-500">Clerk-verified applications will appear here for the Headmaster decision.</p></div>:<div className="grid gap-5 xl:grid-cols-[320px_1fr]">
      <aside className="space-y-3">
        <label className="block xl:hidden"><span className="mb-2 block text-[10px] font-black uppercase tracking-wide text-slate-500">Choose application</span><select value={selected?.id||''} onChange={e=>setSelectedId(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold">{applications.map(x=><option key={x.id} value={x.id}>{x.referenceCode} · {x.studentName}</option>)}</select></label>
        <div className="hidden space-y-3 xl:block">{applications.map(x=><button key={x.id} onClick={()=>setSelectedId(x.id)} className={`w-full rounded-2xl border p-4 text-left ${selected?.id===x.id?'border-cyan-400 bg-cyan-50 shadow-lg':'border-slate-200 bg-white'}`}><div className="flex items-start justify-between gap-3"><div><div className="font-mono text-[10px] font-black text-cyan-700">{x.referenceCode}</div><div className="mt-2 text-sm font-black text-slate-950">{x.studentName}</div><div className="mt-1 text-xs text-slate-500">{x.classApplying} · {x.status}</div></div>{x.confirmation?<CheckCircle2 className="h-5 w-5 text-emerald-600"/>:<ChevronRight className="h-5 w-5 text-slate-300"/>}</div></button>)}</div>
      </aside>

      {selected&&<section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-xl">
        <div className="border-b border-slate-100 bg-slate-50 p-5 sm:p-7"><div className="font-mono text-xs font-black text-cyan-700">{selected.referenceCode}</div><h2 className="mt-2 text-2xl font-black text-slate-950">{selected.studentName}</h2><div className="mt-2 text-xs text-slate-500">{selected.guardianName} · {selected.mobile} · {selected.classApplying} · {selected.status}</div></div>
        <nav className="grid gap-2 border-b border-slate-100 p-3 sm:grid-cols-2 xl:grid-cols-6">{steps.map(([key,label,Icon])=><button key={key} onClick={()=>setSection(key)} className={`flex items-center gap-2 rounded-xl px-3 py-3 text-left text-[10px] font-black ${section===key?'bg-slate-950 text-white':'bg-slate-50 text-slate-600'}`}><Icon className="h-4 w-4"/>{label}</button>)}</nav>

        <div className="p-5 sm:p-7">
          {section==='verification'&&<Verification application={selected} onNext={()=>setSection('approval')}/>} 
          {section==='approval'&&<ApprovalDecision application={selected} working={working} note={decisionNote} setNote={setDecisionNote} onApprove={()=>void decideApplication('approved')} onReject={()=>void decideApplication('rejected')} onNext={()=>setSection('gr')}/>} 
          {section==='gr'&&<AllocationForm application={selected} classes={classes} availableDivisions={availableDivisions} gr={gr} setGr={setGr} classId={classId} setClassId={value=>{setClassId(value);setDivisionId('');}} divisionId={divisionId} setDivisionId={setDivisionId} roll={roll} setRoll={setRoll} admissionDate={admissionDate} setAdmissionDate={setAdmissionDate} approved={isApproved} onNeedApproval={()=>setSection('approval')} onNext={()=>setSection('confirm')}/>} 
          {section==='confirm'&&<ConfirmationStep application={selected} approved={isApproved} allocationReady={allocationReady} gr={gr} classId={classId} admissionDate={admissionDate} working={working} onConfirm={()=>void confirm()} onApproval={()=>setSection('approval')} onAllocation={()=>setSection('gr')}/>} 
          {section==='student'&&<StudentRecordStep application={selected} onConfirm={()=>setSection('confirm')}/>} 
          {section==='link'&&<AccountLink application={selected}/>} 
        </div>
      </section>}
    </div>}
  </div>;
}

function Verification({application,onNext}:{application:Application;onNext:()=>void}){
  const p=application.payload||{};const office=p.office||{};
  return <div className="space-y-4">
    <Info title="Application status" value={application.status}/>
    <Info title="Student" value={p.student?.fullName||application.studentName}/>
    <Info title="Date of birth" value={p.student?.dateOfBirth||'Not supplied'}/>
    <Info title="Guardian" value={`${p.guardian?.fullName||application.guardianName} · ${p.guardian?.relation||'guardian'}`}/>
    <Info title="Class requested" value={p.academic?.classApplying||application.classApplying}/>
    {office.proposedGrNumber&&<Info title="Clerk proposed GR" value={String(office.proposedGrNumber)}/>}
    <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-xs leading-6 text-cyan-900"><CircleAlert className="mr-2 inline h-4 w-4"/>A <strong>verified</strong> status means the Clerk completed the intake/verification handoff. It is not the final admission decision. The Headmaster must approve or reject the application in Step 2.</div>
    {!application.confirmation&&<button type="button" onClick={onNext} className="w-full rounded-xl bg-slate-950 px-5 py-4 text-sm font-black text-white">Continue to Headmaster Decision →</button>}
  </div>;
}

function ApprovalDecision({application,working,note,setNote,onApprove,onReject,onNext}:{application:Application;working:boolean;note:string;setNote:(value:string)=>void;onApprove:()=>void;onReject:()=>void;onNext:()=>void}){
  const status=String(application.status||'').toLowerCase();
  if(application.confirmation)return <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6"><CheckCircle2 className="h-7 w-7 text-emerald-700"/><h3 className="mt-3 font-black text-emerald-950">Admission already confirmed</h3><p className="mt-2 text-xs leading-6 text-emerald-900">The Headmaster decision is complete and the permanent Student Master record already exists.</p></div>;
  if(status==='approved')return <div className="space-y-4"><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6"><BadgeCheck className="h-7 w-7 text-emerald-700"/><h3 className="mt-3 font-black text-emerald-950">Application approved</h3><p className="mt-2 text-xs leading-6 text-emerald-900">GR and academic allocation are unlocked. Continue to Step 3.</p></div><button type="button" onClick={onNext} className="w-full rounded-xl bg-slate-950 px-5 py-4 text-sm font-black text-white">Continue to GR & Allocation →</button></div>;
  return <div className="space-y-4">
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><div className="text-[10px] font-black uppercase tracking-wide text-slate-400">Current review status</div><div className="mt-2 text-lg font-black capitalize text-slate-950">{String(application.status||'verified').replaceAll('_',' ')}</div><p className="mt-2 text-xs leading-6 text-slate-600">Review the application and make the final Headmaster decision. Approval does not yet create the Student Master record.</p></div>
    <label className="block"><span className="mb-2 block text-xs font-black text-slate-700">Decision note / rejection reason</span><textarea rows={4} value={note} onChange={e=>setNote(e.target.value)} placeholder="Optional for approval; required for rejection." className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"/></label>
    <div className="grid gap-3 sm:grid-cols-2"><button type="button" onClick={onApprove} disabled={working} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-4 text-sm font-black text-white disabled:opacity-50">{working?<Loader2 className="h-5 w-5 animate-spin"/>:<BadgeCheck className="h-5 w-5"/>}Approve Application</button><button type="button" onClick={onReject} disabled={working} className="rounded-xl bg-rose-600 px-5 py-4 text-sm font-black text-white disabled:opacity-50">Reject Application</button></div>
  </div>;
}

function AllocationForm({application,classes,availableDivisions,gr,setGr,classId,setClassId,divisionId,setDivisionId,roll,setRoll,admissionDate,setAdmissionDate,approved,onNeedApproval,onNext}:{application:Application;classes:ClassOption[];availableDivisions:DivisionOption[];gr:string;setGr:(v:string)=>void;classId:string;setClassId:(v:string)=>void;divisionId:string;setDivisionId:(v:string)=>void;roll:string;setRoll:(v:string)=>void;admissionDate:string;setAdmissionDate:(v:string)=>void;approved:boolean;onNeedApproval:()=>void;onNext:()=>void}){
  if(application.confirmation)return <Confirmed confirmation={application.confirmation}/>;
  if(!approved)return <div className="space-y-4"><div className="rounded-2xl border border-amber-200 bg-amber-50 p-6"><ShieldCheck className="h-7 w-7 text-amber-700"/><h3 className="mt-3 font-black text-amber-950">Headmaster approval required</h3><p className="mt-2 text-xs leading-6 text-amber-900">Approve the application before assigning the final GR and academic allocation.</p></div><button type="button" onClick={onNeedApproval} className="w-full rounded-xl bg-slate-950 px-5 py-4 text-sm font-black text-white">Go to Headmaster Decision</button></div>;
  return <div className="grid gap-4 md:grid-cols-2">
    <Field label="GR number"><input value={gr} onChange={e=>setGr(e.target.value.toUpperCase())} placeholder="Example: GR-2026-001"/></Field>
    <Field label="Admission date"><input type="date" value={admissionDate} onChange={e=>setAdmissionDate(e.target.value)}/></Field>
    <Field label="Class"><select value={classId} onChange={e=>setClassId(e.target.value)}><option value="">Select class</option>{classes.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
    <Field label="Division"><select value={divisionId} onChange={e=>setDivisionId(e.target.value)}><option value="">No division / assign later</option>{availableDivisions.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
    <Field label="Roll number"><input type="number" min="1" value={roll} onChange={e=>setRoll(e.target.value)} placeholder="Optional"/></Field>
    <div className="md:col-span-2 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-xs leading-6 text-cyan-900"><CircleAlert className="mr-2 inline h-4 w-4"/>GR number, class and admission date are required for final confirmation. Division and roll number may be assigned later when the school structure permits it.</div>
    <button type="button" onClick={onNext} className="md:col-span-2 w-full rounded-xl bg-slate-950 px-5 py-4 text-sm font-black text-white">Continue to Confirm Admission →</button>
  </div>;
}

function ConfirmationStep({application,approved,allocationReady,gr,classId,admissionDate,working,onConfirm,onApproval,onAllocation}:{application:Application;approved:boolean;allocationReady:boolean;gr:string;classId:string;admissionDate:string;working:boolean;onConfirm:()=>void;onApproval:()=>void;onAllocation:()=>void}){
  if(application.confirmation)return <Confirmed confirmation={application.confirmation}/>;
  return <div className="space-y-4">
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><div className="text-sm font-black text-slate-950">Confirmation readiness</div><ul className="mt-4 space-y-3 text-xs text-slate-600"><li>{approved?'✓':'•'} Headmaster approval {approved?'complete.':'pending.'}</li><li>{gr.trim()?'✓':'•'} GR number {gr.trim()?gr:'not assigned.'}</li><li>{classId?'✓':'•'} Class {classId?'selected.':'not selected.'}</li><li>{admissionDate?'✓':'•'} Admission date {admissionDate||'not selected.'}</li><li>• Final confirmation creates exactly one permanent Student Master record.</li></ul></div>
    {!approved?<button type="button" onClick={onApproval} className="w-full rounded-xl bg-amber-500 px-5 py-4 text-sm font-black text-white">Complete Headmaster Approval First</button>:!allocationReady?<button type="button" onClick={onAllocation} className="w-full rounded-xl bg-amber-500 px-5 py-4 text-sm font-black text-white">Complete GR & Allocation First</button>:<button type="button" onClick={onConfirm} disabled={working} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-4 text-sm font-black text-white disabled:opacity-50">{working?<Loader2 className="h-5 w-5 animate-spin"/>:<BadgeCheck className="h-5 w-5"/>}Confirm Admission & Create Student Record</button>}
  </div>;
}

function StudentRecordStep({application,onConfirm}:{application:Application;onConfirm:()=>void}){
  return application.confirmation?<Confirmed confirmation={application.confirmation}/>:<div className="space-y-4"><div className="rounded-2xl border border-amber-200 bg-amber-50 p-6"><GraduationCap className="h-7 w-7 text-amber-700"/><h3 className="mt-3 font-black text-amber-950">Student Master record not created yet</h3><p className="mt-2 text-xs leading-6 text-amber-900">The permanent Student Master record is created only by Step 4 — Confirm Admission.</p></div><button type="button" onClick={onConfirm} className="w-full rounded-xl bg-slate-950 px-5 py-4 text-sm font-black text-white">Go to Confirm Admission</button></div>;
}

function AccountLink({application}:{application:Application}){
  return application.confirmation?<div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6"><KeyRound className="h-7 w-7 text-emerald-700"/><h3 className="mt-4 text-lg font-black text-emerald-950">Student registration is now enabled</h3><p className="mt-2 text-xs leading-6 text-emerald-900">Assigned GR: <strong>{application.confirmation.grNumber}</strong>. The student may register using this GR number. The authorised Class Teacher must approve the pending account. No password is visible to the Headmaster.</p></div>:<div className="rounded-2xl border border-amber-200 bg-amber-50 p-6"><KeyRound className="h-7 w-7 text-amber-700"/><h3 className="mt-4 font-black text-amber-950">Confirm admission first</h3><p className="mt-2 text-xs leading-6 text-amber-900">Account linking becomes available only after the permanent Student Master record and GR number are created.</p></div>;
}

function Confirmed({confirmation}:{confirmation:Record<string,any>}){
  return <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><CheckCircle2 className="h-6 w-6 text-emerald-700"/><div className="mt-3 font-black text-emerald-950">Permanent Student Master record created</div><div className="mt-2 text-xs leading-6 text-emerald-900">GR <strong>{confirmation.grNumber}</strong> · Student ID {confirmation.studentId}<br/>Admission date: {confirmation.admissionDate||'—'} · Account linking is now eligible.</div></div>;
}
function Info({title,value}:{title:string;value:string}){return <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-[10px] font-black uppercase tracking-wide text-slate-400">{title}</div><div className="mt-1 text-sm font-bold text-slate-900">{value||'—'}</div></div>}
function Field({label,children}:{label:string;children:React.ReactElement<any>}){return <label className="block"><span className="mb-2 block text-xs font-black text-slate-700">{label}</span>{React.cloneElement(children,{className:`${children.props.className||''} w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none disabled:bg-slate-100 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10`})}</label>}
