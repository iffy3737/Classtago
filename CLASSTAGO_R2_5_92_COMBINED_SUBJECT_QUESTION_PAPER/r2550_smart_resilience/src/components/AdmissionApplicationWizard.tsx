import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ClipboardCheck, FileText, Loader2, ScanLine, Search, ShieldCheck, Trash2, UploadCloud, X } from 'lucide-react';
import { Language } from '../types';
import { getPublicPortalCopy } from '../lib/publicPortalTranslations';
import { admissionStatusLabel, getAdmissionWorkflowCopy } from '../lib/admissionWorkflowTranslations';
import { getPhase2MlCapabilities, recognizeAdmissionDocument } from '../lib/phase2NativeMl';
import { parseAdmissionOcrText } from '../lib/admissionOcr';

export type PublicAdmissionCampaign = {
  id: string;
  campaignCode?: string;
  sessionName: string;
  title?: Record<string,string> | string;
  description?: Record<string,string> | string;
  eligibleClasses?: string[];
  requiredDocuments?: Array<{ key: string; label: string | Record<string,string>; required?: boolean }>;
  formSettings?: Record<string,any>;
  startsAt?: string | null;
  endsAt?: string | null;
  prospectusUrl?: string | null;
  bannerUrl?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  schoolSlug: string;
  schoolName: string;
  admissionTitle?: string | null;
  admissionDescription?: string | null;
  campaign?: PublicAdmissionCampaign | null;
  language: Language;
};

type FormState = {
  studentName:string; dateOfBirth:string; gender:string; birthPlace:string;
  guardianName:string; guardianRelation:string; mobile:string; alternateMobile:string; email:string; occupation:string;
  addressLine:string; city:string; district:string; state:string; pinCode:string;
  classApplying:string; previousSchool:string; previousClass:string; medium:string; message:string;
  consent:boolean; website:string;
};

const emptyForm: FormState = {
  studentName:'',dateOfBirth:'',gender:'',birthPlace:'',guardianName:'',guardianRelation:'',mobile:'',alternateMobile:'',email:'',occupation:'',
  addressLine:'',city:'',district:'',state:'',pinCode:'',classApplying:'',previousSchool:'',previousClass:'',medium:'',message:'',consent:false,website:''
};

const localized = (value: unknown, language: Language): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const record = value as Record<string,unknown>;
    const code = String(language || 'en').toLowerCase().split('-')[0];
    return String(record[code] || record.en || Object.values(record).find(Boolean) || '');
  }
  return String(value);
};

const readFile = (file: File) => new Promise<string>((resolve,reject) => {
  const reader = new FileReader();
  reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('File could not be read.'));
  reader.onerror = () => reject(new Error('File could not be read.'));
  reader.readAsDataURL(file);
});

export default function AdmissionApplicationWizard({ open, onClose, schoolSlug, schoolName, admissionTitle, admissionDescription, campaign, language }: Props) {
  const ui = getPublicPortalCopy(language);
  const copy = getAdmissionWorkflowCopy(language);
  const [mode,setMode] = useState<'apply'|'track'>('apply');
  const [step,setStep] = useState(0);
  const [form,setForm] = useState<FormState>(emptyForm);
  const [files,setFiles] = useState<Record<string,File>>({});
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const [submitting,setSubmitting] = useState(false);
  const [reference,setReference] = useState('');
  const [uploadWarning,setUploadWarning] = useState(false);
  const [trackReference,setTrackReference] = useState('');
  const [trackMobile,setTrackMobile] = useState('');
  const [tracking,setTracking] = useState(false);
  const [trackResult,setTrackResult] = useState<any>(null);
  const [ocrAvailable,setOcrAvailable] = useState(false);
  const [ocrBusy,setOcrBusy] = useState(false);
  const [ocrText,setOcrText] = useState('');

  const storageKey = useMemo(() => `edunixo-admission-draft:${schoolSlug}:${campaign?.id || 'default'}`, [schoolSlug,campaign?.id]);
  const requiredDocuments = Array.isArray(campaign?.requiredDocuments) ? campaign!.requiredDocuments! : [];
  const eligibleClasses = Array.isArray(campaign?.eligibleClasses) ? campaign!.eligibleClasses! : [];
  const steps = [copy.studentStep,copy.guardianStep,copy.addressStep,copy.documentsStep,copy.reviewStep];

  useEffect(() => {
    if (!open) return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        const savedAt = Number(parsed?.savedAt || 0);
        const draftForm = parsed?.form && typeof parsed.form === 'object' ? parsed.form : parsed;
        if (savedAt && Date.now() - savedAt > 24 * 60 * 60 * 1000) {
          localStorage.removeItem(storageKey);
        } else if (draftForm && typeof draftForm === 'object') {
          setForm(current => ({ ...current, ...draftForm }));
          setNotice(copy.draftRestored);
        }
      }
    } catch { /* local draft is optional */ }
  }, [open,storageKey]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void getPhase2MlCapabilities().then(cap => { if (!cancelled) setOcrAvailable(Boolean(cap.native && cap.textRecognition)); }).catch(() => { if (!cancelled) setOcrAvailable(false); });
    return () => { cancelled = true; };
  }, [open]);

  useEffect(() => {
    if (!open || reference) return;
    const timer = window.setTimeout(() => {
      try { localStorage.setItem(storageKey, JSON.stringify({ savedAt:Date.now(), form })); } catch { /* private browser mode */ }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [form,open,reference,storageKey]);

  const runAdmissionOcr = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('On-device OCR currently reads image documents. Capture or choose a JPG/PNG/WEBP image.'); return; }
    setOcrBusy(true); setError(''); setOcrText('');
    try {
      const dataUrl = await readFile(file);
      const rawText = await recognizeAdmissionDocument(dataUrl, language);
      if (!rawText.trim()) throw new Error('No readable text was detected. Try a clearer, straight photo with good light.');
      const suggestion = parseAdmissionOcrText(rawText);
      setOcrText(rawText);
      setForm(current => ({
        ...current,
        studentName: current.studentName || suggestion.studentName || '',
        dateOfBirth: current.dateOfBirth || suggestion.dateOfBirth || '',
        gender: current.gender || suggestion.gender || '',
        birthPlace: current.birthPlace || suggestion.birthPlace || '',
        guardianName: current.guardianName || suggestion.guardianName || '',
        addressLine: current.addressLine || suggestion.addressLine || '',
      }));
      const urduWarning = String(language || '').toLowerCase().startsWith('ur') ? ' Urdu-script OCR is not supported by this ML Kit recognizer, so English/Latin text on the document was read only.' : '';
      setNotice(`On-device OCR filled only empty suggested fields. Please verify every field before continuing.${urduWarning}`);
    } catch (failure:any) {
      setError(failure?.message || 'On-device OCR could not read this document.');
    } finally { setOcrBusy(false); }
  };

  const update = (key:keyof FormState,value:any) => { setForm(current => ({...current,[key]:value})); setError(''); };
  const fieldClass = 'w-full rounded-xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[var(--school-accent)] focus:ring-4 focus:ring-[var(--school-accent)]/10';
  const labelClass = 'mb-2 block text-xs font-bold text-slate-300';

  const validateStep = () => {
    if (step === 0 && (!form.studentName.trim() || !form.dateOfBirth || !form.gender)) return ui.requiredFields;
    if (step === 1 && (!form.guardianName.trim() || !form.guardianRelation || !/^\+?[0-9\s-]{7,18}$/.test(form.mobile.trim()))) return ui.requiredFields;
    if (step === 2 && (!form.addressLine.trim() || !form.classApplying.trim())) return ui.requiredFields;
    if (step === 3) {
      const missing = requiredDocuments.filter(item => item.required !== false && !files[item.key]);
      if (missing.length) return `${copy.requiredDocuments}: ${missing.map(item => localized(item.label,language)).join(', ')}`;
    }
    return '';
  };

  const next = () => {
    const validation = validateStep();
    if (validation) { setError(validation); return; }
    setStep(current => Math.min(4,current+1));
  };

  const submit = async () => {
    setError('');
    if (!form.consent) { setError(ui.confirmInformation); return; }
    const validation = validateStep();
    if (validation) { setError(validation); return; }
    setSubmitting(true);
    setUploadWarning(false);
    try {
      const response = await fetch(`/api/public/schools/${encodeURIComponent(schoolSlug)}/admission-applications`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          campaignId: campaign?.id || null,
          language,
          student:{ fullName:form.studentName,dateOfBirth:form.dateOfBirth,gender:form.gender,birthPlace:form.birthPlace },
          guardian:{ fullName:form.guardianName,relation:form.guardianRelation,mobile:form.mobile,alternateMobile:form.alternateMobile,email:form.email,occupation:form.occupation },
          address:{ line1:form.addressLine,city:form.city,district:form.district,state:form.state,pinCode:form.pinCode },
          academic:{ classApplying:form.classApplying,previousSchool:form.previousSchool,previousClass:form.previousClass,medium:form.medium },
          message:form.message, consent:true, website:form.website
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok && response.status !== 409) throw new Error(payload.error || ui.submissionFailed);
      const ref = String(payload.referenceCode || '');
      if (!ref) throw new Error(ui.submissionFailed);
      setReference(ref);
      if (payload.duplicate) {
        setNotice(copy.duplicateApplication);
      } else if (payload.uploadToken) {
        for (const [documentType,file] of Object.entries(files) as Array<[string,File]>) {
          try {
            const dataUrl = await readFile(file);
            const uploadResponse = await fetch(`/api/public/admission-applications/${encodeURIComponent(ref)}/documents`, {
              method:'POST',headers:{'Content-Type':'application/json'},
              body:JSON.stringify({ uploadToken:payload.uploadToken, documentType, fileName:file.name, mimeType:file.type, dataUrl })
            });
            if (!uploadResponse.ok) throw new Error('upload failed');
          } catch { setUploadWarning(true); }
        }
      }
      try { localStorage.removeItem(storageKey); } catch { /* optional */ }
    } catch (failure:any) {
      setError(failure?.message || ui.submissionFailed);
    } finally { setSubmitting(false); }
  };

  const track = async () => {
    setTracking(true); setError(''); setTrackResult(null);
    try {
      const response = await fetch(`/api/public/schools/${encodeURIComponent(schoolSlug)}/admission-status`, {
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ referenceCode:trackReference,mobile:trackMobile })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || copy.noRecord);
      setTrackResult(payload.application);
    } catch (failure:any) { setError(failure?.message || copy.noRecord); }
    finally { setTracking(false); }
  };

  if (!open) return null;
  const campaignTitle = localized(campaign?.title,language) || admissionTitle || ui.applyForAdmission;
  const campaignDescription = localized(campaign?.description,language) || admissionDescription || ui.submitPreliminary;

  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#02040b]/88 p-2 backdrop-blur-xl sm:p-5" role="dialog" aria-modal="true" aria-label={campaignTitle}>
    <div className="max-h-[96vh] w-full max-w-5xl overflow-y-auto rounded-[2rem] border border-white/12 bg-[#0a0f21] shadow-[0_35px_120px_rgba(0,0,0,.72)]">
      <div className="sticky top-0 z-20 border-b border-white/10 bg-[#0a0f21]/95 p-4 backdrop-blur-xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--school-accent)]">{campaign?.sessionName || ui.onlineAdmissionEnquiry}</p><h2 className="mt-2 text-2xl font-black sm:text-3xl">{campaignTitle}</h2><p className="mt-2 max-w-2xl text-xs leading-6 text-slate-400">{campaignDescription}</p>{campaign?.prospectusUrl && <a href={campaign.prospectusUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-black text-white"><FileText className="h-3.5 w-3.5" />{copy.prospectus}</a>}</div>
          <button onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        {!reference && <div className="mt-5 flex gap-2 rounded-xl border border-white/10 bg-white/[0.035] p-1.5">
          <button onClick={() => {setMode('apply');setError('');}} className={`flex-1 rounded-lg px-3 py-2 text-xs font-black ${mode==='apply'?'bg-white text-slate-950':'text-slate-400'}`}>{ui.applyForAdmission}</button>
          <button onClick={() => {setMode('track');setError('');}} className={`flex-1 rounded-lg px-3 py-2 text-xs font-black ${mode==='track'?'bg-white text-slate-950':'text-slate-400'}`}>{copy.trackApplication}</button>
        </div>}
      </div>
      {campaign?.bannerUrl && mode === 'apply' && !reference && <div className="relative aspect-[16/5] overflow-hidden border-b border-white/10"><img src={campaign.bannerUrl} alt={campaignTitle} className="h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-[#0a0f21] via-transparent to-transparent" /></div>}

      {reference ? <div className="p-8 text-center sm:p-14">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-[1.5rem] bg-emerald-300/10 text-emerald-300"><CheckCircle2 className="h-10 w-10" /></div>
        <h3 className="mt-6 text-3xl font-black">{ui.applicationReceived}</h3><p className="mt-3 text-sm text-slate-400">{ui.keepReference}</p>
        <div className="mx-auto mt-6 max-w-md rounded-2xl border border-[var(--school-accent)]/25 bg-[var(--school-accent)]/10 px-5 py-4 font-mono text-lg font-black tracking-wider text-[var(--school-accent)]">{reference}</div>
        {notice && <p className="mx-auto mt-5 max-w-xl text-xs leading-6 text-amber-200">{notice}</p>}
        {uploadWarning && <p className="mx-auto mt-5 max-w-xl rounded-xl border border-amber-300/20 bg-amber-300/10 p-4 text-xs leading-6 text-amber-100">{copy.documentUploadFailed}</p>}
        <p className="mx-auto mt-6 max-w-xl text-xs leading-6 text-slate-500">{copy.applicationNotAdmission}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3"><button onClick={() => {setMode('track');setTrackReference(reference);setReference('');}} className="rounded-xl border border-white/10 px-6 py-3 text-sm font-black text-white">{copy.trackApplication}</button><button onClick={onClose} className="rounded-xl bg-white px-6 py-3 text-sm font-black text-slate-950">{ui.close}</button></div>
      </div> : mode === 'track' ? <div className="p-5 sm:p-8">
        <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-white/[0.035] p-5 sm:p-7"><div className="flex items-center gap-3"><Search className="h-6 w-6 text-[var(--school-accent)]" /><div><h3 className="font-black">{copy.trackApplication}</h3><p className="mt-1 text-xs text-slate-400">{copy.trackHelp}</p></div></div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2"><label><span className={labelClass}>{copy.referenceCode}</span><input className={fieldClass} value={trackReference} onChange={e=>setTrackReference(e.target.value.toUpperCase())} /></label><label><span className={labelClass}>{ui.mobileNumber}</span><input className={fieldClass} value={trackMobile} onChange={e=>setTrackMobile(e.target.value)} /></label></div>
          {error && <div className="mt-4 rounded-xl border border-rose-300/20 bg-rose-300/10 p-3 text-xs text-rose-200">{error}</div>}
          <button onClick={track} disabled={tracking||!trackReference||!trackMobile} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--school-accent)] to-[var(--school-accent-2)] px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-50">{tracking?<Loader2 className="h-4 w-4 animate-spin"/>:<Search className="h-4 w-4"/>}{copy.checkStatus}</button>
          {trackResult && <div className="mt-6 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-5"><div className="text-[10px] font-black uppercase tracking-wider text-emerald-300">{copy.currentStatus}</div><div className="mt-2 text-2xl font-black text-white">{admissionStatusLabel(trackResult.status,copy)}</div><div className="mt-3 text-xs leading-6 text-slate-300">{trackResult.publicMessage || copy.applicationNotAdmission}</div><div className="mt-4 font-mono text-xs font-bold text-emerald-200">{trackResult.referenceCode}</div></div>}
        </div>
      </div> : <div className="p-4 sm:p-7">
        <div className="mb-6 grid grid-cols-5 gap-1 sm:gap-2">{steps.map((label,index)=><div key={label} className="min-w-0 text-center"><div className={`mx-auto grid h-8 w-8 place-items-center rounded-full text-xs font-black ${index<step?'bg-emerald-400 text-slate-950':index===step?'bg-[var(--school-accent)] text-slate-950':'bg-white/5 text-slate-500'}`}>{index<step?<Check className="h-4 w-4"/>:index+1}</div><div className={`mt-2 truncate text-[9px] font-bold ${index===step?'text-white':'text-slate-500'}`}>{label}</div></div>)}</div>
        {notice && <div className="mb-4 rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-xs text-cyan-100">{notice}</div>}
        <input value={form.website} onChange={e=>update('website',e.target.value)} className="hidden" tabIndex={-1} autoComplete="off" />
        {step===0 && <><div className="mb-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2 text-sm font-black text-white"><ScanLine className="h-4 w-4 text-cyan-300"/>Scan document to suggest fields</div><p className="mt-1 text-[10px] leading-5 text-slate-400">Android app: on-device ML Kit OCR. Images and recognized text are not uploaded for OCR. Suggestions never overwrite fields you already entered.</p></div><label className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black ${ocrAvailable?'cursor-pointer bg-white text-slate-950':'cursor-not-allowed border border-white/10 text-slate-500'}`}><ScanLine className="h-4 w-4"/>{ocrBusy?'Reading…':ocrAvailable?'Capture / Choose Image':'Android app OCR'}<input disabled={!ocrAvailable||ocrBusy} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={e=>{const chosen=e.target.files?.[0];void runAdmissionOcr(chosen);e.currentTarget.value='';}}/></label></div>{ocrText&&<details className="mt-3 rounded-xl border border-white/10 bg-black/10 p-3"><summary className="cursor-pointer text-[10px] font-black text-cyan-200">Review detected text</summary><pre className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap text-[10px] leading-5 text-slate-400">{ocrText}</pre></details>}</div><div className="grid gap-4 md:grid-cols-2"><Field label={ui.studentFullName}><input className={fieldClass} value={form.studentName} onChange={e=>update('studentName',e.target.value)} /></Field><Field label={ui.dateOfBirth}><input type="date" className={fieldClass} value={form.dateOfBirth} onChange={e=>update('dateOfBirth',e.target.value)} /></Field><Field label={ui.gender}><select className={`${fieldClass} bg-[#11162a]`} value={form.gender} onChange={e=>update('gender',e.target.value)}><option value="">{ui.select}</option><option value="Female">{ui.female}</option><option value="Male">{ui.male}</option><option value="Other">{ui.other}</option></select></Field><Field label={copy.birthPlace}><input className={fieldClass} value={form.birthPlace} onChange={e=>update('birthPlace',e.target.value)} /></Field></div></>}
        {step===1 && <div className="grid gap-4 md:grid-cols-2"><Field label={ui.guardianFullName}><input className={fieldClass} value={form.guardianName} onChange={e=>update('guardianName',e.target.value)} /></Field><Field label={copy.guardianRelation}><select className={`${fieldClass} bg-[#11162a]`} value={form.guardianRelation} onChange={e=>update('guardianRelation',e.target.value)}><option value="">{ui.select}</option><option value="Father">{copy.father}</option><option value="Mother">{copy.mother}</option><option value="Guardian">{copy.guardian}</option></select></Field><Field label={ui.mobileNumber}><input className={fieldClass} value={form.mobile} onChange={e=>update('mobile',e.target.value)} /></Field><Field label={copy.alternateMobile}><input className={fieldClass} value={form.alternateMobile} onChange={e=>update('alternateMobile',e.target.value)} /></Field><Field label={ui.emailAddress}><input type="email" className={fieldClass} value={form.email} onChange={e=>update('email',e.target.value)} /></Field><Field label={copy.occupation}><input className={fieldClass} value={form.occupation} onChange={e=>update('occupation',e.target.value)} /></Field></div>}
        {step===2 && <div className="grid gap-4 md:grid-cols-2"><Field label={copy.addressLine} wide><textarea rows={3} className={fieldClass} value={form.addressLine} onChange={e=>update('addressLine',e.target.value)} /></Field><Field label={copy.city}><input className={fieldClass} value={form.city} onChange={e=>update('city',e.target.value)} /></Field><Field label={copy.district}><input className={fieldClass} value={form.district} onChange={e=>update('district',e.target.value)} /></Field><Field label={copy.state}><input className={fieldClass} value={form.state} onChange={e=>update('state',e.target.value)} /></Field><Field label={copy.pinCode}><input className={fieldClass} value={form.pinCode} onChange={e=>update('pinCode',e.target.value)} /></Field><Field label={ui.classApplyingFor}><select className={`${fieldClass} bg-[#11162a]`} value={form.classApplying} onChange={e=>update('classApplying',e.target.value)}><option value="">{ui.select}</option>{eligibleClasses.length?eligibleClasses.map(item=><option key={item} value={item}>{item}</option>):['Nursery','Class I','Class II','Class III','Class IV','Class V','Class VI','Class VII','Class VIII','Class IX','Class X','Class XI','Class XII'].map(item=><option key={item} value={item}>{item}</option>)}</select></Field><Field label={copy.previousSchool}><input className={fieldClass} value={form.previousSchool} onChange={e=>update('previousSchool',e.target.value)} /></Field><Field label={copy.previousClass}><input className={fieldClass} value={form.previousClass} onChange={e=>update('previousClass',e.target.value)} /></Field><Field label={copy.medium}><input className={fieldClass} value={form.medium} onChange={e=>update('medium',e.target.value)} /></Field></div>}
        {step===3 && <div className="space-y-4"><div className="rounded-xl border border-white/10 bg-white/[0.035] p-4 text-xs leading-6 text-slate-400"><ShieldCheck className="mr-2 inline h-4 w-4 text-[var(--school-accent)]" />{copy.requiredDocuments}. JPG, PNG, WEBP or PDF; maximum 4 MB each.</div>{requiredDocuments.length===0?<div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-xs text-slate-500">{copy.optional}</div>:requiredDocuments.map(item=>{const file=files[item.key];return <div key={item.key} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:flex-row sm:items-center"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/5 text-[var(--school-accent)]"><FileText className="h-5 w-5"/></div><div className="min-w-0 flex-1"><div className="text-sm font-black">{localized(item.label,language)} {item.required===false&&<span className="text-[10px] font-normal text-slate-500">({copy.optional})</span>}</div><div className="mt-1 truncate text-[10px] text-slate-500">{file?.name||copy.chooseFile}</div></div>{file?<button type="button" onClick={()=>setFiles(current=>{const next={...current};delete next[item.key];return next;})} className="inline-flex items-center gap-2 rounded-xl border border-rose-300/20 px-3 py-2 text-xs font-bold text-rose-200"><Trash2 className="h-4 w-4"/>{copy.remove}</button>:<label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-black text-slate-950"><UploadCloud className="h-4 w-4"/>{copy.chooseFile}<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={e=>{const chosen=e.target.files?.[0];if(chosen){if(chosen.size>4*1024*1024){setError('Maximum file size is 4 MB.');return;}setFiles(current=>({...current,[item.key]:chosen}));}}}/></label>}</div>})}</div>}
        {step===4 && <div className="space-y-5"><div className="rounded-2xl border border-[var(--school-accent)]/20 bg-[var(--school-accent)]/10 p-5"><ClipboardCheck className="h-7 w-7 text-[var(--school-accent)]"/><h3 className="mt-4 text-xl font-black">{copy.reviewBeforeSubmit}</h3><p className="mt-2 text-xs leading-6 text-slate-400">{copy.applicationNotAdmission}</p></div><div className="grid gap-3 sm:grid-cols-2">{[[ui.studentFullName,form.studentName],[ui.dateOfBirth,form.dateOfBirth],[ui.guardianFullName,form.guardianName],[ui.mobileNumber,form.mobile],[ui.classApplyingFor,form.classApplying],[ui.address,form.addressLine],[copy.previousSchool,form.previousSchool||'—'],[copy.requiredDocuments,Object.keys(files).length]].map(([label,value])=><div key={String(label)} className="rounded-xl border border-white/10 bg-white/[0.035] p-4"><div className="text-[9px] font-black uppercase tracking-wider text-slate-500">{label}</div><div className="mt-2 text-sm font-bold text-white">{value}</div></div>)}</div><label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-4"><input type="checkbox" checked={form.consent} onChange={e=>update('consent',e.target.checked)} className="mt-0.5 h-4 w-4 accent-cyan-400"/><span className="text-xs leading-6 text-slate-400">{ui.consent}</span></label></div>}
        <div className="mt-5 text-[10px] text-slate-500">{copy.saveDraftNote}</div>
        {error&&<div role="alert" className="mt-4 rounded-xl border border-rose-300/20 bg-rose-300/10 p-3 text-xs font-semibold text-rose-200">{error}</div>}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between"><button onClick={()=>step===0?onClose():setStep(current=>current-1)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-slate-300"><ArrowLeft className="h-4 w-4"/>{step===0?ui.cancel:copy.back}</button>{step<4?<button onClick={next} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--school-accent)] to-[var(--school-accent-2)] px-6 py-3 text-sm font-black text-slate-950">{copy.continue}<ArrowRight className="h-4 w-4"/></button>:<button onClick={submit} disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--school-accent)] to-[var(--school-accent-2)] px-6 py-3 text-sm font-black text-slate-950 disabled:opacity-60">{submitting?<Loader2 className="h-4 w-4 animate-spin"/>:<CheckCircle2 className="h-4 w-4"/>}{submitting?(Object.keys(files).length?copy.uploadingDocuments:ui.submittingApplication):ui.submitApplication}</button>}</div>
      </div>}
    </div>
  </div>;
}

function Field({label,wide,children}:{label:string;wide?:boolean;children:React.ReactNode}) {
  return <label className={wide?'block md:col-span-2':'block'}><span className="mb-2 block text-xs font-bold text-slate-300">{label}</span>{children}</label>;
}
