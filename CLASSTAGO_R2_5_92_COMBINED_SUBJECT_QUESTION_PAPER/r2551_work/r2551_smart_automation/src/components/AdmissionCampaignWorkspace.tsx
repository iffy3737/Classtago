import React, { useEffect, useMemo, useState } from 'react';
import {
  Check, ChevronRight, ClipboardList, FileText, Image as ImageIcon, Loader2,
  Megaphone, Pencil, RefreshCw, Search, Send, ShieldCheck, UploadCloud, X
} from 'lucide-react';
import { supabase } from '../lib/supabase';

type Localized = Record<string,string>;
type RequiredDocument = { key:string; label:Localized; required:boolean };
type Campaign = {
  id:string; campaignCode:string; sessionName:string; title:Localized; description:Localized; status:string;
  startsAt?:string|null; endsAt?:string|null; eligibleClasses:string[]; requiredDocuments:RequiredDocument[];
  formSettings:Record<string,any>; campaignMediaAssetId?:string|null; prospectusMediaAssetId?:string|null;
  bannerUrl?:string|null; prospectusUrl?:string|null; maxApplications?:number|null; applicationCount:number;
  publishedAt?:string|null; updatedAt?:string|null;
};
type Application = {
  id:string; referenceCode:string; studentName:string; guardianName:string; guardianRelation?:string|null;
  mobile:string; email?:string|null; classApplying:string; status:string; createdAt:string; admissionSession?:string|null;
  payload?:Record<string,any>; publicMessage?:string|null; internalNotes?:string|null;
};

type WorkspaceMode = 'campaigns'|'applications';
type Props = { mode:WorkspaceMode; userRole:string; onModeChange?:(mode:WorkspaceMode)=>void; focusFeatureId?:string|null };
const languages = [
  {code:'en',label:'English'}, {code:'hi',label:'हिन्दी'}, {code:'ur',label:'اردو'},
  {code:'as',label:'অসমীয়া'}, {code:'bn',label:'বাংলা'}, {code:'brx',label:'बड़ो'},
  {code:'doi',label:'डोगरी'}, {code:'gu',label:'ગુજરાતી'}, {code:'kn',label:'ಕನ್ನಡ'},
  {code:'ks',label:'کٲشُر'}, {code:'kok',label:'कोंकणी'}, {code:'mai',label:'मैथिली'},
  {code:'ml',label:'മലയാളം'}, {code:'mni',label:'মৈতৈলোন্'}, {code:'mr',label:'मराठी'},
  {code:'ne',label:'नेपाली'}, {code:'or',label:'ଓଡ଼ିଆ'}, {code:'pa',label:'ਪੰਜਾਬੀ'},
  {code:'sa',label:'संस्कृतम्'}, {code:'sat',label:'ᱥᱟᱱᱛᱟᱲᱤ'}, {code:'sd',label:'سنڌي'},
  {code:'ta',label:'தமிழ்'}, {code:'te',label:'తెలుగు'}
];
const documentOptions = [
  ['birth_certificate','Birth certificate'],['student_photo','Student photograph'],['address_proof','Address proof'],
  ['previous_marksheet','Previous marksheet'],['transfer_certificate','Transfer certificate'],['identity_document','Identity document']
];
const emptyCampaign = (): Campaign => ({
  id:'',campaignCode:'',sessionName:'',title:{en:'Admissions Open'},description:{en:''},status:'draft',startsAt:null,endsAt:null,
  eligibleClasses:[],requiredDocuments:documentOptions.map(([key,label])=>({key,label:{en:label},required:key==='birth_certificate'||key==='student_photo'})),
  formSettings:{allowDraftRecovery:true,showStatusTracking:true},campaignMediaAssetId:null,prospectusMediaAssetId:null,bannerUrl:null,prospectusUrl:null,maxApplications:null,applicationCount:0
});

const token = async () => {
  const { data:{session} } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Secure session unavailable. Please sign in again.');
  return session.access_token;
};
const api = async (url:string, options:RequestInit={}) => {
  const accessToken = await token();
  const response = await fetch(url,{...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{}),Authorization:`Bearer ${accessToken}`}});
  const payload = await response.json().catch(()=>({}));
  if (!response.ok) throw new Error(payload.error || 'Request failed.');
  return payload;
};
const readFile = (file:File) => new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>typeof r.result==='string'?resolve(r.result):reject(new Error('File could not be read.'));r.onerror=()=>reject(new Error('File could not be read.'));r.readAsDataURL(file);});
const prepareUpload = async (file:File, kind:'admission_campaign'|'document') => {
  if (kind==='document') {
    if (!['application/pdf','image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Choose a PDF, JPG, PNG or WEBP prospectus.');
    if (file.size>8*1024*1024) throw new Error('Prospectus must be 8 MB or smaller.');
    return {dataUrl:await readFile(file),width:null,height:null,originalMimeType:file.type};
  }
  if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Choose a JPG, PNG or WEBP campaign image.');
  if (file.size>10*1024*1024) throw new Error('Campaign image must be smaller than 10 MB.');
  const source=await readFile(file);
  const image=await new Promise<HTMLImageElement>((resolve,reject)=>{const x=new Image();x.onload=()=>resolve(x);x.onerror=()=>reject(new Error('Image could not be decoded.'));x.src=source;});
  const scale=Math.min(1,2200/image.naturalWidth,1250/image.naturalHeight); const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Image optimization is unavailable.');ctx.drawImage(image,0,0,canvas.width,canvas.height);
  return {dataUrl:canvas.toDataURL('image/webp',.84),width:canvas.width,height:canvas.height,originalMimeType:file.type};
};
const statusClass=(status:string)=>status==='active'?'bg-emerald-50 text-emerald-700 border-emerald-200':status==='scheduled'?'bg-violet-50 text-violet-700 border-violet-200':status==='closed'?'bg-slate-100 text-slate-600 border-slate-200':'bg-amber-50 text-amber-700 border-amber-200';
const appStatusClass=(status:string)=>status==='approved'||status==='verified'?'bg-emerald-50 text-emerald-700':status==='rejected'?'bg-rose-50 text-rose-700':status==='waitlisted'?'bg-violet-50 text-violet-700':'bg-amber-50 text-amber-700';

const admissionFeatureLabels: Record<string,string> = {
  'campaign-workspace':'Campaign Setup',
  'campaign-draft':'Create and edit campaign draft',
  'campaign-classes-dates':'Eligible classes and campaign dates',
  'campaign-prospectus':'Prospectus and campaign documents',
  'campaign-language-content':'Multilingual campaign content',
  'campaign-publish-close':'Publish, schedule or close campaign',
  'application-review-queue':'Submitted application queue',
  'complete-application-viewer':'Complete submitted application viewer',
  'applicant-document-review':'Applicant document review',
  'application-status-workflow':'Review, waitlist and rejection workflow',
  'application-audit-history':'Application audit history'
};
const detailFeatureIds = new Set(['complete-application-viewer','applicant-document-review','application-status-workflow','application-audit-history']);

export default function AdmissionCampaignWorkspace({mode,userRole,focusFeatureId}:Props) {
  if (mode === 'applications' && userRole !== 'headmaster') {
    return <div className="rounded-3xl border border-amber-200 bg-amber-50 p-7 text-center">
      <ShieldCheck className="mx-auto h-8 w-8 text-amber-700" />
      <h2 className="mt-4 text-xl font-black text-amber-950">Headmaster-only admission review</h2>
      <p className="mt-2 text-xs leading-6 text-amber-900">Admission Applications and Admission Confirmation are restricted to the Headmaster. Clerk access is limited to Website Design and Admission Campaign Setup.</p>
    </div>;
  }
  return <div className="space-y-5">
    {focusFeatureId && admissionFeatureLabels[focusFeatureId] && <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-xs font-bold text-cyan-950"><span className="font-black">Selected feature:</span> {admissionFeatureLabels[focusFeatureId]}{detailFeatureIds.has(focusFeatureId)?' — choose an application; its complete viewer will open at this exact section.':''}</div>}
    {mode==='campaigns'?<CampaignManager userRole={userRole} focusFeatureId={focusFeatureId}/>:<ApplicationQueue userRole={userRole} focusFeatureId={focusFeatureId}/>}
  </div>;
}

function CampaignManager({userRole,focusFeatureId}:{userRole:string;focusFeatureId?:string|null}) {
  const [campaigns,setCampaigns]=useState<Campaign[]>([]);const [selected,setSelected]=useState<Campaign>(emptyCampaign());
  const [language,setLanguage]=useState('en');const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);const [publishing,setPublishing]=useState(false);
  const [uploading,setUploading]=useState<'banner'|'prospectus'|null>(null);const [message,setMessage]=useState<{type:'success'|'error';text:string}|null>(null);const [confirm,setConfirm]=useState(false);
  const canPublish=userRole==='headmaster';
  const load=async()=>{setLoading(true);try{const payload=await api('/api/school-website/admission-campaigns');const rows=Array.isArray(payload.campaigns)?payload.campaigns:[];setCampaigns(rows);setSelected(current=>current.id?rows.find((x:Campaign)=>x.id===current.id)||current:rows[0]||emptyCampaign());}catch(e:any){setMessage({type:'error',text:e.message});}finally{setLoading(false);}};
  useEffect(()=>{void load();},[]);
  useEffect(()=>{if(!focusFeatureId)return;window.setTimeout(()=>document.getElementById(`edx-admission-${focusFeatureId}`)?.scrollIntoView({behavior:'smooth',block:'start'}),120);},[focusFeatureId,selected.id]);
  const patch=<K extends keyof Campaign>(key:K,value:Campaign[K])=>{setSelected(current=>({...current,[key]:value,status:current.status==='active'?'active':'draft'}));setMessage(null);};
  const save=async()=>{setSaving(true);setMessage(null);try{const payload=await api('/api/school-website/admission-campaigns',{method:'POST',body:JSON.stringify(selected)});setSelected(payload.campaign);setCampaigns(current=>[payload.campaign,...current.filter(x=>x.id!==payload.campaign.id)]);setMessage({type:'success',text:'Admission campaign saved permanently to the school cloud.'});}catch(e:any){setMessage({type:'error',text:e.message});}finally{setSaving(false);}};
  const publish=async()=>{if(!selected.id)return setMessage({type:'error',text:'Save the campaign before publishing.'});setPublishing(true);setConfirm(false);try{const payload=await api(`/api/school-website/admission-campaigns/${selected.id}/publish`,{method:'POST',body:'{}'});setSelected(payload.campaign);setCampaigns(current=>current.map(x=>x.id===payload.campaign.id?payload.campaign:x));setMessage({type:'success',text:payload.campaign.status==='scheduled'?'Campaign scheduled successfully.':'Admissions are now live on the public school website.'});}catch(e:any){setMessage({type:'error',text:e.message});}finally{setPublishing(false);}};
  const close=async()=>{if(!selected.id)return;setPublishing(true);try{const payload=await api(`/api/school-website/admission-campaigns/${selected.id}/close`,{method:'POST',body:'{}'});setSelected(payload.campaign);setCampaigns(current=>current.map(x=>x.id===payload.campaign.id?payload.campaign:x));setMessage({type:'success',text:'Admission campaign closed. New public applications are blocked.'});}catch(e:any){setMessage({type:'error',text:e.message});}finally{setPublishing(false);}};
  const upload=async(kind:'admission_campaign'|'document',file:File|null)=>{if(!file)return;setUploading(kind==='document'?'prospectus':'banner');setMessage(null);try{const prepared=await prepareUpload(file,kind);const payload=await api('/api/school-website/media/upload',{method:'POST',body:JSON.stringify({kind,fileName:file.name,...prepared})});const asset=payload.asset;if(!asset?.id)throw new Error('Cloud media record was not returned.');if(kind==='admission_campaign'){patch('campaignMediaAssetId',asset.id);setSelected(current=>({...current,bannerUrl:asset.previewUrl||asset.publicUrl||null}));}else{patch('prospectusMediaAssetId',asset.id);setSelected(current=>({...current,prospectusUrl:asset.previewUrl||asset.publicUrl||null}));}setMessage({type:'success',text:'File stored privately. Save and publish the campaign to make it public.'});}catch(e:any){setMessage({type:'error',text:e.message});}finally{setUploading(null);}};
  const classText=selected.eligibleClasses.join('\n');
  if(loading)return <div className="grid min-h-[380px] place-items-center rounded-3xl border border-slate-200 bg-white"><Loader2 className="h-8 w-8 animate-spin text-cyan-600"/></div>;
  if(userRole==='headmaster') return <div id="edx-admission-campaign-publish-close" className="scroll-mt-24 space-y-6">
    <div className="edx-dark-contrast-surface overflow-hidden rounded-[1.75rem] border border-white/10 p-6 shadow-xl sm:p-8" style={{background:'radial-gradient(circle at 0% 0%, rgba(34,211,238,.22), transparent 36%), radial-gradient(circle at 100% 0%, rgba(139,92,246,.22), transparent 38%), linear-gradient(135deg,#07172d,#090d1f 58%,#181235)',color:'#ffffff'}}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="text-[10px] font-black uppercase tracking-[.2em]" style={{color:'#67e8f9'}}>Headmaster final approval</div><h2 className="mt-3 text-3xl font-black" style={{color:'#ffffff'}}>Publish or close the Clerk-prepared Admission Campaign.</h2><p className="mt-3 max-w-3xl text-sm leading-7" style={{color:'#cbd5e1'}}>Campaign content remains Clerk-owned. This Headmaster view is read-only except for the final public Publish / Close decision.</p></div><button type="button" onClick={load} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-xs font-black text-white"><RefreshCw className="h-4 w-4"/>Refresh</button></div>
    </div>
    {message&&<div className={`rounded-xl border p-4 text-sm font-semibold ${message.type==='success'?'border-emerald-200 bg-emerald-50 text-emerald-800':'border-rose-200 bg-rose-50 text-rose-800'}`}>{message.text}</div>}
    {campaigns.length===0?<div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-semibold text-slate-500">No Clerk-prepared Admission Campaign is waiting for review.</div>:<>
      <label className="block rounded-2xl border border-slate-200 bg-white p-4"><span className="mb-2 block text-[10px] font-black uppercase tracking-[.16em] text-slate-500">Choose saved campaign</span><select value={selected.id||''} onChange={event=>setSelected(campaigns.find(item=>item.id===event.target.value)||campaigns[0])} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900">{campaigns.map(item=><option key={item.id} value={item.id}>{item.title?.en||'Admission Campaign'} · {item.sessionName||'No session'} · {item.status}</option>)}</select></label>
      <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-xl"><div className="border-b border-slate-100 bg-slate-50 p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-700">Saved campaign review</div><h3 className="mt-2 text-2xl font-black text-slate-950">{selected.title?.en||'Admissions Open'}</h3><p className="mt-1 text-xs text-slate-500">{selected.sessionName||'Session not set'} · {selected.applicationCount} submitted application(s)</p></div><span className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase ${statusClass(selected.status)}`}>{selected.status}</span></div></div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-7 lg:grid-cols-3"><ApplicationValue label="Starts" value={selected.startsAt?new Date(selected.startsAt).toLocaleString():'Not scheduled'}/><ApplicationValue label="Ends" value={selected.endsAt?new Date(selected.endsAt).toLocaleString():'Not scheduled'}/><ApplicationValue label="Maximum applications" value={selected.maxApplications||'No limit'}/><ApplicationValue label="Eligible classes" value={selected.eligibleClasses.join(', ')||'None'}/><ApplicationValue label="Required documents" value={selected.requiredDocuments.filter(d=>d.required).map(d=>d.label?.en||d.key).join(', ')||'None'}/><ApplicationValue label="English description" value={selected.description?.en||'—'} wide/></div>
        {(selected.bannerUrl||selected.prospectusUrl)&&<div className="flex flex-wrap gap-3 border-t border-slate-100 px-5 py-4 sm:px-7">{selected.bannerUrl&&<a href={selected.bannerUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-cyan-800">Open Campaign Banner</a>}{selected.prospectusUrl&&<a href={selected.prospectusUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-cyan-800">Open Prospectus</a>}</div>}
        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 p-5 sm:flex-row sm:justify-end sm:p-7">{selected.status==='active'&&<button type="button" onClick={close} disabled={publishing} className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-3 text-xs font-black text-rose-700 disabled:opacity-45">Close Admissions</button>}<button type="button" onClick={()=>setConfirm(true)} disabled={publishing||!selected.id} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-5 py-3 text-xs font-black text-white shadow-lg disabled:opacity-40"><Send className="h-4 w-4"/>{selected.status==='active'?'Republish Campaign':'Publish Campaign'}</button></div>
      </section>
    </>}
    {confirm&&<div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/75 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="admission-publish-title-hm"><div className="w-full max-w-lg overflow-hidden rounded-[1.75rem] border border-white/10 shadow-2xl" style={{background:'linear-gradient(145deg,#07172d,#090d1f 60%,#181235)',color:'#ffffff'}}><div className="p-6 sm:p-7"><Megaphone className="h-8 w-8 text-cyan-300"/><h3 id="admission-publish-title-hm" className="mt-4 text-2xl font-black">Confirm final publication?</h3><p className="mt-3 text-xs leading-6 text-slate-300">This publishes the saved Clerk campaign to the public Admission page. It does not create Student records or logins.</p></div><div className="flex gap-3 border-t border-white/10 p-5"><button type="button" onClick={()=>setConfirm(false)} className="flex-1 rounded-xl border border-white/15 px-4 py-3 text-sm font-black text-white">Cancel</button><button type="button" onClick={publish} disabled={publishing} className="flex-1 rounded-xl bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-50">{publishing?'Publishing…':'Publish Now'}</button></div></div></div>}
  </div>;
  return <div id="edx-admission-campaign-workspace" className="scroll-mt-24 space-y-6">
    <div className="edx-dark-contrast-surface overflow-hidden rounded-[1.75rem] border border-white/10 p-6 shadow-xl sm:p-8" style={{background:'radial-gradient(circle at 0% 0%, rgba(34,211,238,.22), transparent 36%), radial-gradient(circle at 100% 0%, rgba(139,92,246,.22), transparent 38%), linear-gradient(135deg,#07172d,#090d1f 58%,#181235)',color:'#ffffff'}}><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><div className="text-[10px] font-black uppercase tracking-[.2em]" style={{color:'#67e8f9'}}>Admission command center</div><h2 className="mt-3 text-3xl font-black tracking-tight" style={{color:'#ffffff'}}>Campaigns that look premium and remain operationally safe.</h2><p className="mt-3 max-w-3xl text-sm leading-7" style={{color:'#cbd5e1'}}>Schedule admissions, select eligible classes, define documents, publish prospectus and control public applications without creating student accounts automatically.</p></div><button onClick={()=>setSelected(emptyCampaign())} className="rounded-xl border border-white/20 px-5 py-3 text-xs font-black shadow-lg" style={{background:'#ffffff',color:'#020617'}}>New Campaign</button></div></div>
    {message&&<div className={`rounded-xl border p-4 text-sm font-semibold ${message.type==='success'?'border-emerald-200 bg-emerald-50 text-emerald-800':'border-rose-200 bg-rose-50 text-rose-800'}`}>{message.text}</div>}
    <div className="grid gap-6 xl:grid-cols-[300px_1fr]">
      <aside className="space-y-3">
        {campaigns.length===0?<div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-xs text-slate-500">No campaign yet.</div>:<>
          <label className="block xl:hidden"><span className="mb-2 block text-[10px] font-black uppercase tracking-[.16em] text-slate-500">Choose campaign</span><select value={selected.id||''} onChange={event=>setSelected(campaigns.find(item=>item.id===event.target.value)||emptyCampaign())} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"><option value="">New campaign</option>{campaigns.map(item=><option key={item.id} value={item.id}>{item.title?.en||'Admission Campaign'} · {item.sessionName||'No session'} · {item.status}</option>)}</select></label>
          <div className="hidden space-y-3 xl:block">{campaigns.map(item=><button key={item.id} onClick={()=>setSelected(item)} className={`w-full rounded-2xl border p-4 text-left transition ${selected.id===item.id?'border-cyan-400 bg-cyan-50 shadow-lg':'border-slate-200 bg-white hover:border-slate-300'}`}><div className="flex items-start justify-between gap-3"><div><div className="text-sm font-black text-slate-950">{item.title?.en||'Admission Campaign'}</div><div className="mt-1 text-xs text-slate-500">{item.sessionName}</div></div><span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase ${statusClass(item.status)}`}>{item.status}</span></div><div className="mt-4 flex items-center justify-between text-[10px] text-slate-400"><span>{item.applicationCount} applications</span><ChevronRight className="h-4 w-4"/></div></button>)}</div>
        </>}
      </aside>
      <section id="edx-admission-campaign-draft" className="scroll-mt-24 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-xl">
        <div id="edx-admission-campaign-publish-close" className="scroll-mt-24 border-b border-slate-100 bg-slate-50/70 p-5 sm:p-7"><div><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-700">{selected.id?'Edit campaign':'Create campaign'}</div><h3 className="mt-2 text-2xl font-black text-slate-950">{selected.title?.en||'Admissions Open'}</h3><p className="mt-2 text-xs leading-5 text-slate-500">Complete the campaign details below. Save, publish and close controls are available at the bottom of this page.</p></div></div>
        <div className="space-y-7 p-5 sm:p-7">
          <div id="edx-admission-campaign-language-content" className="scroll-mt-24 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[minmax(0,320px)_1fr] sm:items-end"><label className="block"><span className="mb-2 block text-[10px] font-black uppercase tracking-[.16em] text-slate-500">Content language</span><select value={language} onChange={event=>setLanguage(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10">{languages.map(item=><option key={item.code} value={item.code}>{item.label}</option>)}</select></label><p className="text-[10px] leading-5 text-slate-500">Choose a language from the dropdown, then enter the public campaign title, description and document labels for that language.</p></div>
          <div className="space-y-5">
              <div id="edx-admission-campaign-classes-dates" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                <div className="mb-4"><div className="text-sm font-black text-slate-950">Eligible classes and campaign dates</div><div className="mt-1 text-[10px] leading-5 text-slate-500">These values control when the public form is available and which classes appear.</div></div>
                <div className="grid gap-4 md:grid-cols-2"><Field label="Admission session"><input value={selected.sessionName} onChange={e=>patch('sessionName',e.target.value)} placeholder="2027–28"/></Field><Field label="Maximum applications" hint="Leave blank for no limit"><input type="number" min="1" value={selected.maxApplications||''} onChange={e=>patch('maxApplications',e.target.value?Number(e.target.value):null)}/></Field><Field label="Start date & time"><input type="datetime-local" value={selected.startsAt?selected.startsAt.slice(0,16):''} onChange={e=>patch('startsAt',e.target.value?new Date(e.target.value).toISOString():null)}/></Field><Field label="End date & time"><input type="datetime-local" value={selected.endsAt?selected.endsAt.slice(0,16):''} onChange={e=>patch('endsAt',e.target.value?new Date(e.target.value).toISOString():null)}/></Field><Field label="Eligible classes — one per line" wide><textarea rows={7} value={classText} onChange={e=>patch('eligibleClasses',e.target.value.split(/\n|,/).map(x=>x.trim()).filter(Boolean))} placeholder={'Nursery\nClass I\nClass II'}/></Field></div>
              </div>
              <div className="grid gap-4 md:grid-cols-2"><Field label={`Campaign title · ${language}`} wide><input value={selected.title?.[language]||''} onChange={e=>patch('title',{...selected.title,[language]:e.target.value})}/></Field><Field label={`Campaign description · ${language}`} wide><textarea rows={4} value={selected.description?.[language]||''} onChange={e=>patch('description',{...selected.description,[language]:e.target.value})}/></Field></div>
            </div>
          <div><div className="text-sm font-black text-slate-950">Required documents</div><div className="mt-1 text-[10px] leading-5 text-slate-400">Select required items and enter the public label for the currently selected language.</div><div className="mt-3 grid gap-3 sm:grid-cols-2">{selected.requiredDocuments.map((doc,index)=><div key={doc.key} className={`flex items-center gap-3 rounded-xl border p-4 ${doc.required?'border-cyan-300 bg-cyan-50':'border-slate-200 bg-white'}`}><button type="button" onClick={()=>patch('requiredDocuments',selected.requiredDocuments.map((item,i)=>i===index?{...item,required:!item.required}:item))} className={`grid h-7 w-7 shrink-0 place-items-center rounded-md ${doc.required?'bg-cyan-600 text-white':'bg-slate-100 text-slate-400'}`} aria-label={doc.required?'Make document optional':'Make document required'}>{doc.required&&<Check className="h-4 w-4"/>}</button><div className="min-w-0 flex-1"><div className="truncate text-[10px] font-black uppercase tracking-wider text-slate-400">{doc.label?.en||doc.key}</div><input value={doc.label?.[language]||''} placeholder={language==='en'?'Public document label':`Translation · ${language}`} onChange={e=>patch('requiredDocuments',selected.requiredDocuments.map((item,i)=>i===index?{...item,label:{...item.label,[language]:e.target.value}}:item))} className="mt-1 w-full border-0 bg-transparent p-0 text-xs font-bold text-slate-800 outline-none placeholder:text-slate-300"/></div></div>)}</div></div>
          <div id="edx-admission-campaign-prospectus" className="scroll-mt-24 grid gap-4 md:grid-cols-2"><MediaUpload title="Campaign banner" text="Wide admission advertisement image" preview={selected.bannerUrl} loading={uploading==='banner'} accept="image/jpeg,image/png,image/webp" onFile={file=>upload('admission_campaign',file)} icon={ImageIcon}/><MediaUpload title="Prospectus" text="PDF or image, maximum 8 MB" preview={selected.prospectusUrl} loading={uploading==='prospectus'} accept="application/pdf,image/jpeg,image/png,image/webp" onFile={file=>upload('document',file)} icon={FileText}/></div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-xs leading-6 text-amber-900"><ShieldCheck className="mr-2 inline h-4 w-4"/><strong>Controlled workflow:</strong> publishing opens or schedules the public form. Submitted applications enter the review queue only; no student record or login is created in this release.</div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-700">Campaign page actions</div><div className="mt-2 text-lg font-black text-slate-950">Save the campaign for Headmaster final publication.</div><p className="mt-2 text-xs leading-5 text-slate-500">The public admission form changes only after the Headmaster publishes this saved campaign.</p></div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <button type="button" onClick={save} disabled={saving||publishing} className="inline-flex min-w-[150px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs font-black text-slate-800 shadow-sm disabled:opacity-45">{saving?<Loader2 className="h-4 w-4 animate-spin"/>:<Pencil className="h-4 w-4"/>}{saving?'Saving…':'Save Campaign'}</button>
                {canPublish&&<button type="button" onClick={()=>setConfirm(true)} disabled={publishing||saving||!selected.id} className="inline-flex min-w-[170px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-5 py-3 text-xs font-black text-white shadow-lg disabled:opacity-40"><Send className="h-4 w-4"/>{selected.status==='active'?'Republish Campaign':'Publish Campaign'}</button>}
                {canPublish&&selected.status==='active'&&<button type="button" onClick={close} disabled={publishing||saving} className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-3 text-xs font-black text-rose-700 disabled:opacity-45">Close Admissions</button>}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
    {confirm&&<div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/75 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="admission-publish-title"><div className="w-full max-w-lg overflow-hidden rounded-[1.75rem] border border-white/10 shadow-2xl" style={{background:'radial-gradient(circle at 0% 0%, rgba(34,211,238,.2), transparent 38%), radial-gradient(circle at 100% 0%, rgba(139,92,246,.18), transparent 42%), linear-gradient(145deg,#07172d,#090d1f 60%,#181235)',color:'#ffffff'}}><div className="p-6 sm:p-7"><Megaphone className="h-8 w-8" style={{color:'#67e8f9'}}/><h3 id="admission-publish-title" className="mt-4 text-2xl font-black" style={{color:'#ffffff'}}>Publish admission campaign?</h3><p className="mt-3 text-xs leading-6" style={{color:'#cbd5e1'}}>Eligible classes, dates, required documents, banner and prospectus will become the official public admission journey.</p></div><div className="flex flex-col gap-3 border-t border-white/10 p-5 sm:flex-row"><button onClick={()=>setConfirm(false)} className="flex-1 rounded-xl border border-white/15 px-4 py-3 text-sm font-black" style={{background:'rgba(255,255,255,.06)',color:'#ffffff'}}>Cancel</button><button onClick={publish} disabled={publishing} className="flex-1 rounded-xl px-4 py-3 text-sm font-black shadow-lg disabled:opacity-50" style={{background:'linear-gradient(135deg,#22d3ee,#8b5cf6)',color:'#020617'}}>{publishing?'Publishing…':'Publish Now'}</button></div></div></div>}
  </div>;
}

function applicationDisplayValue(value:any): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.length ? value.map(applicationDisplayValue).join(', ') : '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function applicationDateTime(value:any): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? applicationDisplayValue(value) : date.toLocaleString();
}

function ApplicationValue({label,value,wide=false}:{label:string;value:any;wide?:boolean}) {
  return <div className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${wide?'sm:col-span-2':''}`}>
    <div className="text-[9px] font-black uppercase tracking-[.14em] text-slate-400">{label}</div>
    <div className="mt-2 whitespace-pre-wrap break-words text-sm font-bold leading-6 text-slate-900">{applicationDisplayValue(value)}</div>
  </div>;
}

function ApplicationSection({id,eyebrow,title,children}:{id?:string;eyebrow:string;title:string;children:React.ReactNode}) {
  return <section id={id} className="scroll-mt-24 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-100/70">
    <div className="border-b border-slate-200 bg-white px-5 py-4">
      <div className="text-[9px] font-black uppercase tracking-[.18em] text-cyan-700">{eyebrow}</div>
      <h4 className="mt-1 text-lg font-black text-slate-950">{title}</h4>
    </div>
    <div className="p-4 sm:p-5">{children}</div>
  </section>;
}

function ApplicationQueue({userRole,focusFeatureId}:{userRole:string;focusFeatureId?:string|null}) {
  const [rows,setRows]=useState<Application[]>([]);
  const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState('');
  const [status,setStatus]=useState('');
  const [detail,setDetail]=useState<any>(null);
  const [detailLoading,setDetailLoading]=useState(false);
  const [working,setWorking]=useState(false);
  const [uploadingDoc,setUploadingDoc]=useState<string|null>(null);
  const [publicMessage,setPublicMessage]=useState('');
  const [internalNote,setInternalNote]=useState('');
  const [message,setMessage]=useState<{type:'success'|'error';text:string}|null>(null);

  const load=async()=>{
    setLoading(true);
    try{
      const params=new URLSearchParams();
      if(status)params.set('status',status);
      if(search)params.set('search',search);
      const payload=await api(`/api/school-website/admission-applications?${params}`);
      setRows(payload.applications||[]);
    }catch(e:any){setMessage({type:'error',text:e.message});}
    finally{setLoading(false);}
  };

  useEffect(()=>{void load();},[status]);
  useEffect(()=>{if(!focusFeatureId)return;window.setTimeout(()=>document.getElementById(`edx-admission-${focusFeatureId}`)?.scrollIntoView({behavior:'smooth',block:'start'}),120);},[focusFeatureId,rows.length]);
  useEffect(()=>{if(!detail||!focusFeatureId||!detailFeatureIds.has(focusFeatureId))return;window.setTimeout(()=>document.getElementById(`edx-admission-${focusFeatureId}`)?.scrollIntoView({behavior:'smooth',block:'start'}),160);},[detail,focusFeatureId]);

  const open=async(id:string)=>{
    setDetail(null);
    setDetailLoading(true);
    try{
      const payload=await api(`/api/school-website/admission-applications/${id}`);
      setDetail(payload);
      setPublicMessage(payload.application?.publicMessage||'');
      setInternalNote(payload.application?.internalNotes||'');
    }catch(e:any){setMessage({type:'error',text:e.message});}
    finally{setDetailLoading(false);}
  };

  const changeStatus=async(nextStatus:string)=>{
    if(!detail?.application)return;
    setWorking(true);
    try{
      const payload=await api(`/api/school-website/admission-applications/${detail.application.id}/status`,{method:'PATCH',body:JSON.stringify({status:nextStatus,publicMessage,internalNote})});
      setDetail((current:any)=>({...current,application:{...current.application,...payload.application}}));
      setRows(current=>current.map(x=>x.id===payload.application.id?{...x,...payload.application}:x));
      setMessage({type:'success',text:'Application review status saved with audit history.'});
      window.dispatchEvent(new Event('refresh_notifications'));
    }catch(e:any){setMessage({type:'error',text:e.message});}
    finally{setWorking(false);}
  };

  const verifyDoc=async(documentId:string,nextStatus:string)=>{
    setWorking(true);
    try{
      const payload=await api(`/api/school-website/admission-documents/${documentId}/verify`,{method:'PATCH',body:JSON.stringify({status:nextStatus})});
      setDetail((current:any)=>({...current,documents:(current.documents||[]).map((doc:any)=>doc.id===documentId?{...doc,status:payload.document.status}:doc)}));
    }catch(e:any){setMessage({type:'error',text:e.message});}
    finally{setWorking(false);}
  };

  const uploadOfficeDocument=async(documentType:'lc'|'aadhaar'|'photo',file:File|null)=>{
    if(!file||!detail?.application)return;
    setUploadingDoc(documentType);
    setMessage(null);
    try{
      if(!['application/pdf','image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Choose a JPG, PNG, WEBP or PDF file.');
      if(documentType==='photo'&&!file.type.startsWith('image/'))throw new Error('Passport Size Photograph must be an image file.');
      if(file.size>3*1024*1024)throw new Error('Each admission document must be 3 MB or smaller.');
      const dataUrl=await readFile(file);
      const payload=await api(`/api/school-website/admission-applications/${detail.application.id}/documents`,{method:'POST',body:JSON.stringify({documentType,fileName:file.name,dataUrl})});
      setDetail((current:any)=>({...current,documents:[...(current.documents||[]),payload.document]}));
      setMessage({type:'success',text:`${file.name} uploaded. Verify the document before marking the application Verified / Recommended.`});
    }catch(e:any){setMessage({type:'error',text:e.message});}
    finally{setUploadingDoc(null);}
  };

  const reviewActions = userRole === 'headmaster'
    ? [['under_review','Start Review'],['documents_requested','Request Documents'],['verified','Mark Verified'],['waitlisted','Waitlist'],['approved','Approve'],['rejected','Reject']]
    : [['under_review','Start Review'],['documents_requested','Request Documents'],['verified','Verify & Recommend'],['waitlisted','Waitlist'],['rejected','Reject']];

  const application=detail?.application||{};
  const payload=application.payload&&typeof application.payload==='object'?application.payload:{};
  const student=payload.student&&typeof payload.student==='object'?payload.student:{};
  const guardian=payload.guardian&&typeof payload.guardian==='object'?payload.guardian:{};
  const address=payload.address&&typeof payload.address==='object'?payload.address:{};
  const academic=payload.academic&&typeof payload.academic==='object'?payload.academic:{};
  const documents=Array.isArray(detail?.documents)?detail.documents:[];
  const events=Array.isArray(detail?.events)?detail.events:[];

  return <div id="edx-admission-application-review-queue" className="scroll-mt-24 space-y-6">
    <div className="edx-dark-contrast-surface overflow-hidden rounded-[1.75rem] border border-white/10 p-6 shadow-xl sm:p-8" style={{background:'radial-gradient(circle at 0% 0%, rgba(139,92,246,.22), transparent 36%), radial-gradient(circle at 100% 0%, rgba(34,211,238,.20), transparent 38%), linear-gradient(135deg,#07172d,#090d1f 58%,#181235)',color:'#ffffff'}}>
      <div className="flex items-end justify-between gap-4">
        <div><div className="text-[10px] font-black uppercase tracking-[.2em]" style={{color:'#c4b5fd'}}>Admission review queue</div><h2 className="mt-3 text-3xl font-black" style={{color:'#ffffff'}}>Every submitted form opens as one complete application.</h2><p className="mt-3 text-sm leading-7" style={{color:'#cbd5e1'}}>Student, guardian, address, academic details, applicant message, documents and audit history remain together exactly as submitted.</p></div>
        <button onClick={load} className="rounded-xl border border-white/10 p-3" style={{background:'rgba(255,255,255,.08)',color:'#ffffff'}}><RefreshCw className={`h-5 w-5 ${loading?'animate-spin':''}`}/></button>
      </div>
    </div>

    {message&&<div className={`rounded-xl border p-4 text-sm font-semibold ${message.type==='success'?'border-emerald-200 bg-emerald-50 text-emerald-800':'border-rose-200 bg-rose-50 text-rose-800'}`}>{message.text}</div>}

    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row">
      <div className="relative flex-1"><Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&load()} placeholder="Search reference, student, guardian or mobile" className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-cyan-500"/></div>
      <select value={status} onChange={e=>setStatus(e.target.value)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm"><option value="">All statuses</option>{['new','under_review','documents_requested','verified','waitlisted','approved','rejected','withdrawn'].map(x=><option key={x} value={x}>{x.replaceAll('_',' ')}</option>)}</select>
      <button onClick={load} className="rounded-xl bg-slate-950 px-5 py-3 text-xs font-black text-white">Search</button>
    </div>

    {loading?<div className="grid min-h-[260px] place-items-center rounded-2xl border border-slate-200 bg-white"><Loader2 className="h-8 w-8 animate-spin text-cyan-600"/></div>:rows.length===0?<div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><ClipboardList className="mx-auto h-10 w-10 text-slate-300"/><h3 className="mt-4 font-black text-slate-900">No matching applications</h3></div>:<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rows.map(item=><button key={item.id} onClick={()=>open(item.id)} className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl"><div className="flex items-start justify-between gap-3"><div className="font-mono text-xs font-black text-cyan-700">{item.referenceCode}</div><span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${appStatusClass(item.status)}`}>{item.status.replaceAll('_',' ')}</span></div><h3 className="mt-4 text-lg font-black text-slate-950">{item.studentName}</h3><div className="mt-2 text-xs text-slate-500">{item.classApplying} · {item.admissionSession||'Session not set'}</div><div className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-600"><strong>{item.guardianName}</strong><div className="mt-1">{item.mobile}</div><div className="mt-3 font-black text-cyan-700">Open complete application →</div></div></button>)}</div>}

    {(detail||detailLoading)&&<div className="fixed inset-0 z-[120] flex justify-end bg-slate-950/75 backdrop-blur-sm">
      <div className="h-full w-full max-w-5xl overflow-y-auto bg-slate-50 shadow-2xl">
        {detailLoading?<div className="grid h-full place-items-center"><Loader2 className="h-9 w-9 animate-spin text-cyan-600"/></div>:<>
          <div className="sticky top-0 z-20 border-b border-white/10 bg-[#07111f] p-5 text-white shadow-xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0"><div className="font-mono text-xs font-black text-cyan-300">{application.referenceCode}</div><h3 className="mt-2 break-words text-2xl font-black sm:text-3xl">{application.studentName}</h3><div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-300"><span>{application.classApplying}</span><span>•</span><span>{application.admissionSession||'Session not set'}</span><span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${appStatusClass(application.status||'new')}`}>{String(application.status||'new').replaceAll('_',' ')}</span></div></div>
              <button onClick={()=>setDetail(null)} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10 transition hover:bg-white/20" aria-label="Close complete application"><X className="h-5 w-5"/></button>
            </div>
          </div>

          <div className="space-y-6 p-4 sm:p-7">
            <ApplicationSection id="edx-admission-complete-application-viewer" eyebrow="Application record" title="Submission overview">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <ApplicationValue label="Reference number" value={application.referenceCode}/>
                <ApplicationValue label="Admission session" value={application.admissionSession}/>
                <ApplicationValue label="Class applied for" value={academic.classApplying||application.classApplying}/>
                <ApplicationValue label="Current status" value={String(application.status||'new').replaceAll('_',' ')}/>
                <ApplicationValue label="Submitted language" value={application.submittedLanguage||'en'}/>
                <ApplicationValue label="Submitted at" value={applicationDateTime(application.createdAt)}/>
                <ApplicationValue label="Guardian consent" value={application.consentConfirmed===false?'Not confirmed':'Confirmed'}/>
                <ApplicationValue label="Last updated" value={applicationDateTime(application.updatedAt)}/>
                <ApplicationValue label="Campaign ID" value={application.campaignId}/>
              </div>
            </ApplicationSection>

            <ApplicationSection eyebrow="Step 1" title="Student details">
              <div className="grid gap-3 sm:grid-cols-2">
                <ApplicationValue label="Student full name" value={student.fullName||application.studentName}/>
                <ApplicationValue label="Date of birth" value={student.dateOfBirth||application.dateOfBirth}/>
                <ApplicationValue label="Gender" value={student.gender||application.gender}/>
                <ApplicationValue label="Place of birth" value={student.birthPlace}/>
              </div>
            </ApplicationSection>

            <ApplicationSection eyebrow="Step 2" title="Parent / guardian details">
              <div className="grid gap-3 sm:grid-cols-2">
                <ApplicationValue label="Guardian full name" value={guardian.fullName||application.guardianName}/>
                <ApplicationValue label="Relation" value={guardian.relation||application.guardianRelation}/>
                <ApplicationValue label="Mobile number" value={guardian.mobile||application.mobile}/>
                <ApplicationValue label="Alternate mobile" value={guardian.alternateMobile||application.alternateMobile}/>
                <ApplicationValue label="Email address" value={guardian.email||application.email}/>
                <ApplicationValue label="Occupation" value={guardian.occupation}/>
              </div>
            </ApplicationSection>

            <ApplicationSection eyebrow="Step 3" title="Address and previous-school details">
              <div className="grid gap-3 sm:grid-cols-2">
                <ApplicationValue label="Address line" value={address.line1||application.address} wide/>
                <ApplicationValue label="City" value={address.city}/>
                <ApplicationValue label="District" value={address.district}/>
                <ApplicationValue label="State" value={address.state}/>
                <ApplicationValue label="PIN code" value={address.pinCode}/>
                <ApplicationValue label="Class applying for" value={academic.classApplying||application.classApplying}/>
                <ApplicationValue label="Previous school" value={academic.previousSchool||application.previousSchool}/>
                <ApplicationValue label="Previous class" value={academic.previousClass||application.previousClass}/>
                <ApplicationValue label="Medium" value={academic.medium}/>
              </div>
            </ApplicationSection>

            <ApplicationSection eyebrow="Additional information" title="Message submitted by the applicant">
              <ApplicationValue label="Applicant message" value={payload.message||application.message} wide/>
            </ApplicationSection>

            <ApplicationSection id="edx-admission-applicant-document-review" eyebrow="Step 4" title="Uploaded documents">
              <div className="mb-4 rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
                <div className="text-xs font-black text-cyan-950">Office document upload</div>
                <div className="mt-1 text-[10px] leading-5 text-cyan-800">Bulk Excel applications arrive here with documents pending. LC, Aadhaar and Passport Photo remain compulsory before the application can be recommended to the Headmaster.</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {([['lc','Leaving Certificate (LC)'],['aadhaar','Aadhaar Card'],['photo','Passport Size Photograph']] as const).map(([type,label])=><label key={type} className={`inline-flex items-center gap-2 rounded-xl border border-cyan-200 bg-white px-3 py-2 text-[10px] font-black text-cyan-800 ${uploadingDoc?'cursor-wait opacity-60':'cursor-pointer hover:bg-cyan-100'}`}><UploadCloud className={`h-3.5 w-3.5 ${uploadingDoc===type?'animate-pulse':''}`}/>{uploadingDoc===type?'Uploading…':`Upload ${label}`}<input type="file" className="hidden" accept={type==='photo'?'image/jpeg,image/png,image/webp':'application/pdf,image/jpeg,image/png,image/webp'} disabled={Boolean(uploadingDoc)} onChange={e=>{const file=e.target.files?.[0]||null;void uploadOfficeDocument(type,file);e.currentTarget.value='';}}/></label>)}
                </div>
              </div>
              {documents.length===0?<div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-xs text-slate-500">No documents are attached yet. Upload LC, Aadhaar and Photo above.</div>:<div className="space-y-3">{documents.map((doc:any)=><div key={doc.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center"><FileText className="h-5 w-5 shrink-0 text-cyan-600"/><div className="min-w-0 flex-1"><div className="break-words text-xs font-black text-slate-900">{doc.fileName}</div><div className="mt-1 text-[10px] text-slate-500">{String(doc.type||'document').replaceAll('_',' ')} · {doc.status} · {doc.sizeBytes?`${Math.max(1,Math.round(Number(doc.sizeBytes)/1024))} KB`:'Size unavailable'}</div>{doc.notes&&<div className="mt-2 text-xs text-slate-600">{doc.notes}</div>}</div>{doc.previewUrl&&<a href={doc.previewUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 px-3 py-2 text-center text-[10px] font-black text-slate-900">View document</a>}<button onClick={()=>verifyDoc(doc.id,'verified')} disabled={working} className="rounded-lg bg-emerald-50 px-3 py-2 text-[10px] font-black text-emerald-700 disabled:opacity-50">Verify</button><button type="button" onClick={()=>verifyDoc(doc.id,'rejected')} disabled={working} className="rounded-lg bg-rose-50 px-3 py-2 text-[10px] font-black text-rose-700 disabled:opacity-50">Reject</button></div>)}</div>}
            </ApplicationSection>

            <ApplicationSection eyebrow="School review" title="Guardian communication and internal notes">
              <div className="grid gap-4">
                <Field label="Message visible to guardian"><textarea rows={3} value={publicMessage} onChange={e=>setPublicMessage(e.target.value)}/></Field>
                <Field label="Internal school note"><textarea rows={4} value={internalNote} onChange={e=>setInternalNote(e.target.value)}/></Field>
              </div>
            </ApplicationSection>

            <ApplicationSection id="edx-admission-application-status-workflow" eyebrow="Decision" title="Review action">
              <div className="flex flex-wrap gap-2">{reviewActions.map(([value,label])=><button type="button" key={value} onClick={()=>changeStatus(value)} disabled={working} className={`rounded-xl px-4 py-3 text-xs font-black disabled:opacity-50 ${value==='approved'?'bg-emerald-600 text-white':value==='rejected'?'bg-rose-600 text-white':'bg-slate-950 text-white'}`}>{label}</button>)}</div>
              <p className="mt-3 text-[10px] leading-5 text-slate-500">{userRole==='headmaster' ? 'Headmaster approval records the final review decision; Student Master creation still requires the separate Admission Confirmation action.' : 'Clerk can review documents, request corrections, waitlist, reject, or mark the application Verified / Recommended. Final approval is reserved for the Headmaster.'}</p>
            </ApplicationSection>

            <ApplicationSection id="edx-admission-application-audit-history" eyebrow="Audit trail" title="Application history">
              {events.length===0?<div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-xs text-slate-500">No audit events are available yet.</div>:<div className="space-y-3">{events.map((event:any,index:number)=><div key={event.id||`${event.event_type}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-xs font-black capitalize text-slate-950">{String(event.event_type||event.eventType||'event').replaceAll('_',' ')}</div><div className="mt-1 text-[10px] text-slate-500">{applicationDateTime(event.created_at||event.createdAt)}</div></div>{(event.from_status||event.to_status)&&<div className="rounded-full bg-slate-100 px-3 py-1 text-[9px] font-black uppercase text-slate-600">{event.from_status||'—'} → {event.to_status||'—'}</div>}</div>{event.public_message&&<div className="mt-3 text-xs leading-6 text-slate-700">{event.public_message}</div>}</div>)}</div>}
            </ApplicationSection>
          </div>
        </>}
      </div>
    </div>}
  </div>;
}

function Field({label,hint,wide,children}:{label:string;hint?:string;wide?:boolean;children:React.ReactElement<any>}) {return <label className={wide?'block md:col-span-2':'block'}><span className="mb-2 block text-xs font-black text-slate-700">{label}</span>{React.cloneElement(children,{className:`${children.props.className||''} w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10`})}{hint&&<span className="mt-1.5 block text-[10px] text-slate-400">{hint}</span>}</label>}
function MediaUpload({title,text,preview,loading,accept,onFile,icon:Icon}:{title:string;text:string;preview?:string|null;loading:boolean;accept:string;onFile:(file:File|null)=>void;icon:any}) {return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"><div className="aspect-[16/7] bg-slate-100">{preview?(preview.toLowerCase().includes('.pdf')?<div className="grid h-full place-items-center"><FileText className="h-12 w-12 text-violet-500"/></div>:<img src={preview} alt="" className="h-full w-full object-cover"/>):<div className="grid h-full place-items-center"><Icon className="h-11 w-11 text-slate-300"/></div>}</div><div className="p-4"><div className="text-sm font-black text-slate-950">{title}</div><div className="mt-1 text-xs text-slate-500">{text}</div><label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white"><UploadCloud className={`h-4 w-4 ${loading?'animate-pulse':''}`}/>{loading?'Uploading…':'Choose File'}<input type="file" accept={accept} className="hidden" disabled={loading} onChange={e=>onFile(e.target.files?.[0]||null)}/></label></div></div>}
