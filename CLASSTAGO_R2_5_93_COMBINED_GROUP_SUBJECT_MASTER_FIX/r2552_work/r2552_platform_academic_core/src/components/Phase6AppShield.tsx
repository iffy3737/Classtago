import React,{useEffect,useMemo,useState} from 'react';
import { Capacitor } from '@capacitor/core';
import { Fingerprint, Loader2, ShieldCheck } from 'lucide-react';
import { verifyNativeDeviceOwner } from '../lib/phase5NativeSmart';

const TIMEOUT_MS=60_000;
export function phase6ShieldKey(userId:string){return `edunixo.phase6.appShield.${userId}`;}
export function setPhase6AppShieldEnabled(userId:string,enabled:boolean){
  if(typeof localStorage==='undefined')return;
  localStorage.setItem(phase6ShieldKey(userId),enabled?'true':'false');
  window.dispatchEvent(new CustomEvent('edunixo_phase6_shield_setting',{detail:{userId,enabled}}));
}
export function getPhase6AppShieldEnabled(userId:string){return typeof localStorage!=='undefined'&&localStorage.getItem(phase6ShieldKey(userId))==='true';}

export default function Phase6AppShield({userId}:{userId:string}){
  const native=useMemo(()=>Capacitor.isNativePlatform(),[]);
  const[enabled,setEnabled]=useState(()=>native&&getPhase6AppShieldEnabled(userId));
  const[locked,setLocked]=useState(()=>native&&getPhase6AppShieldEnabled(userId));
  const[busy,setBusy]=useState(false);const[error,setError]=useState('');
  useEffect(()=>{
    if(!native)return;
    let hiddenAt=0;
    const setting=(e:any)=>{if(e?.detail?.userId!==userId)return;const next=Boolean(e.detail.enabled);setEnabled(next);if(next)setLocked(true);else setLocked(false)};
    const vis=()=>{
      if(document.visibilityState==='hidden'){hiddenAt=Date.now();return;}
      if(enabled&&hiddenAt&&Date.now()-hiddenAt>=TIMEOUT_MS)setLocked(true);
      hiddenAt=0;
    };
    window.addEventListener('edunixo_phase6_shield_setting',setting as EventListener);
    document.addEventListener('visibilitychange',vis);
    return()=>{window.removeEventListener('edunixo_phase6_shield_setting',setting as EventListener);document.removeEventListener('visibilitychange',vis)};
  },[native,enabled,userId]);
  if(!native||!enabled||!locked)return null;
  const unlock=async()=>{setBusy(true);setError('');try{const r=await verifyNativeDeviceOwner();if(r.verified)setLocked(false);else setError('Device owner verification was not completed.')}catch(e:any){setError(e?.message||'Device verification failed.')}finally{setBusy(false)}};
  return <div className="fixed inset-0 z-[10000] grid place-items-center bg-slate-950/95 p-5 backdrop-blur-xl" role="dialog" aria-modal="true"><div className="w-full max-w-sm rounded-[2rem] border border-white/10 bg-white p-6 text-center shadow-2xl"><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><Fingerprint className="h-8 w-8"/></div><p className="mt-5 text-[10px] font-black uppercase tracking-[.18em] text-emerald-700">EDUNIXO App Shield</p><h2 className="mt-1 text-2xl font-black text-slate-950">Device verification required</h2><p className="mt-2 text-xs leading-5 text-slate-500">The app was locked after being away. Verify with fingerprint, face or your device credential to continue.</p>{error&&<div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800">{error}</div>}<button disabled={busy} onClick={()=>void unlock()} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-xs font-black text-white disabled:opacity-50">{busy?<Loader2 className="h-4 w-4 animate-spin"/>:<ShieldCheck className="h-4 w-4"/>}Unlock EDUNIXO</button></div></div>;
}
