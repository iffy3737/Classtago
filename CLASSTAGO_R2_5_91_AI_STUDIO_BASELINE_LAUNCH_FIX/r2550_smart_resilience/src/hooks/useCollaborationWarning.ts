import { useEffect, useState } from 'react';
import { clearCollaborationEditRecord, setCollaborationEditRecord, type CollaborationPresence } from '../lib/phase6Collaboration';

export function useCollaborationWarning(recordKey:string,active=true){
  const[count,setCount]=useState(0);
  useEffect(()=>{
    if(!active||!recordKey){setCount(0);return;}
    void setCollaborationEditRecord(recordKey);
    const handler=(event:any)=>{
      const detail=event?.detail as CollaborationPresence|undefined;
      setCount(Number(detail?.editingByRecord?.[recordKey]||0));
    };
    window.addEventListener('edunixo_phase6_collaboration',handler as EventListener);
    return()=>{
      window.removeEventListener('edunixo_phase6_collaboration',handler as EventListener);
      void clearCollaborationEditRecord(recordKey);
    };
  },[recordKey,active]);
  return count;
}
