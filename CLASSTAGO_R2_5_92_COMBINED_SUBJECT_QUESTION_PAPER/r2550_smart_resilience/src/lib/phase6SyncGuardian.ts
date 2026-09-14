import {Capacitor,registerPlugin} from '@capacitor/core';
import {listPhase1Queue,type Phase1Scope} from './phase1Offline';

interface Contract{
  getState():Promise<{native:boolean;enabled:boolean;pendingCount:number;workScheduled:boolean}>;
  setEnabled(options:{enabled:boolean}):Promise<{enabled:boolean}>;
  updatePending(options:{pendingCount:number}):Promise<{pendingCount:number;workScheduled:boolean}>;
}
const Guardian=registerPlugin<Contract>('EdunixoSyncGuardian');
const KEY='edunixo.phase6.syncGuardian';
export function syncGuardianSupported(){return Capacitor.isNativePlatform();}
export function syncGuardianEnabled(){return syncGuardianSupported()&&localStorage.getItem(KEY)!=='false';}
export async function setSyncGuardianEnabled(enabled:boolean){
  if(!syncGuardianSupported())return {enabled:false};
  localStorage.setItem(KEY,enabled?'true':'false');
  return Guardian.setEnabled({enabled});
}
export async function getSyncGuardianState(){
  if(!syncGuardianSupported())return {native:false,enabled:false,pendingCount:0,workScheduled:false,guardianScheduled:false};
  const state=await Guardian.getState();
  return {...state,guardianScheduled:Boolean(state.workScheduled)};
}
export async function refreshSyncGuardian(scope:Phase1Scope){
  if(!syncGuardianSupported())return;
  const items=await listPhase1Queue(scope);
  await Guardian.updatePending({pendingCount:items.length}).catch(()=>undefined);
}
export function installSyncGuardian(scope:Phase1Scope){
  if(!syncGuardianSupported()||typeof window==='undefined')return()=>undefined;
  const refresh=()=>void refreshSyncGuardian(scope);
  refresh();
  window.addEventListener('edunixo_phase1_queue_changed',refresh);
  window.addEventListener('edunixo_phase1_sync',refresh);
  window.addEventListener('online',refresh);
  return()=>{window.removeEventListener('edunixo_phase1_queue_changed',refresh);window.removeEventListener('edunixo_phase1_sync',refresh);window.removeEventListener('online',refresh)};
}
export const installPhase6SyncGuardian=installSyncGuardian;
export const getPhase6SyncGuardianState=getSyncGuardianState;
