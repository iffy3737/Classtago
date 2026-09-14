import { supabase } from './supabase';

export type CollaborationPresence = {
  connected:number;
  ownConnected:boolean;
  status:string;
  editingByRecord?:Record<string,number>;
};
export type Phase6PresenceSnapshot = CollaborationPresence;

type EditState = { recordKey:string; mode:'editing'|'idle'; at:string };
let activeChannel:any = null;
let activeSessionKey='';
let currentEditKey='';
let currentSchoolId='';

function emit(detail:CollaborationPresence){
  if(typeof window!=='undefined'){
    window.dispatchEvent(new CustomEvent('edunixo_phase6_collaboration',{detail}));
    window.dispatchEvent(new CustomEvent('edunixo_phase5_presence',{detail:{connected:detail.connected,ownConnected:detail.ownConnected,status:detail.status}}));
  }
}

function summarize(channel:any,status='connected'){
  const state:any=channel?.presenceState?.()||{};
  let connected=0; const editingByRecord:Record<string,number>={};
  for(const presences of Object.values(state)){
    if(!Array.isArray(presences))continue;
    connected+=presences.length;
    for(const p of presences as any[]){
      const key=String(p?.record_key||'');
      if(key&&p?.edit_mode==='editing'&&String(p?.session_key||'')!==activeSessionKey) editingByRecord[key]=(editingByRecord[key]||0)+1;
    }
  }
  emit({connected,ownConnected:Boolean(state?.[activeSessionKey]?.length),status,editingByRecord});
}

async function trackCurrent(){
  if(!activeChannel)return;
  await activeChannel.track({
    session_key:activeSessionKey,
    surface:'edunixo',
    record_key:currentEditKey,
    edit_mode:currentEditKey?'editing':'idle',
    online_at:new Date().toISOString()
  });
}

export function installPhase6Collaboration(schoolId:string):()=>void{
  if(!schoolId||typeof window==='undefined')return()=>undefined;
  currentSchoolId=schoolId;
  activeSessionKey=crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const topic=`edunixo:school:${schoolId}`;
  const channel=supabase.channel(topic,{config:{private:true,presence:{key:activeSessionKey},broadcast:{ack:true}}});
  activeChannel=channel;
  const refresh=(status:string)=>summarize(channel,status);
  channel.on('presence',{event:'sync'},()=>refresh('synced'));
  channel.on('presence',{event:'join'},()=>refresh('joined'));
  channel.on('presence',{event:'leave'},()=>refresh('left'));
  channel.on('broadcast',{event:'record-edit'},()=>refresh('edit-signal'));
  channel.subscribe(async(status:string)=>{
    if(status==='SUBSCRIBED'){
      await trackCurrent().catch(()=>undefined);
      refresh('subscribed');
    }else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED') refresh(status.toLowerCase());
  });
  return()=>{
    if(activeChannel===channel){activeChannel=null;currentEditKey='';currentSchoolId='';}
    void channel.untrack().catch(()=>undefined);
    void supabase.removeChannel(channel);
  };
}

export async function setCollaborationEditRecord(recordKey:string){
  currentEditKey=String(recordKey||'').slice(0,180);
  if(!activeChannel||!currentSchoolId)return;
  await trackCurrent().catch(()=>undefined);
  await activeChannel.send({type:'broadcast',event:'record-edit',payload:{record_key:currentEditKey,at:new Date().toISOString()}}).catch(()=>undefined);
}

export async function clearCollaborationEditRecord(recordKey?:string){
  if(recordKey&&currentEditKey&&recordKey!==currentEditKey)return;
  currentEditKey='';
  if(!activeChannel)return;
  await trackCurrent().catch(()=>undefined);
  await activeChannel.send({type:'broadcast',event:'record-edit',payload:{record_key:'',at:new Date().toISOString()}}).catch(()=>undefined);
}

export function collaborationRecordKey(kind:'attendance'|'marks',recordKey:string){
  return `${kind}:${String(recordKey||'').replace(/[^a-zA-Z0-9:_-]/g,'').slice(0,150)}`;
}
