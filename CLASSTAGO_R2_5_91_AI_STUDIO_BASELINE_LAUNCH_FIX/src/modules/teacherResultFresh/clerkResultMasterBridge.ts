import { supabase } from '../../lib/supabase';
import { normalizeMappedTemplateKey } from './resultTemplateConfig';
import type { ResultTemplateKey } from './types';

export function canonicalTemplateKeyFromLegacy(raw:any):ResultTemplateKey|null{
  return normalizeMappedTemplateKey(raw?.template_key||raw?.templateKey||raw?.id||raw?.templateCategory||raw?.name);
}

const clean=(v:any)=>String(v||'').toLowerCase().replace(/\[max:[^\]]+\]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const max=(h:any)=>Number.isFinite(Number(h?.maxMarks))?Number(h.maxMarks):undefined;

export function legacyMasterHeadOverrides(raw:any,key:ResultTemplateKey){
  const headers=Array.isArray(raw?.headers)?raw.headers:[];
  const find=(tests:string[])=>headers.find((h:any)=>{const t=clean(h.baseName||h.text);return tests.every(x=>t.includes(x))});
  const out:Record<string,any>={};
  const put=(headKey:string,h:any,withLabel=true)=>{if(!h)return;out[headKey]={...(max(h)!=null?{maxMarks:max(h)}:{}),...(withLabel&&String(h.baseName||h.text||'').trim()?{label:String(h.baseName||h.text).replace(/\s*\[Max:[^\]]+\]/i,'').trim()}: {})}};
  if(key==='class_1_8_regular'){
    put('oral',find(['oral']));put('practical',find(['practical']));put('formative_total',find(['formative','total']));put('written',find(['written']));put('summative_total',find(['summative','total']));put('grand_total',find(['grand','total']));
  }else if(key==='class_1_8_hindi_marathi'){
    for(const section of ['hindi','marathi']){put(`${section}_listening`,find(['listening']));put(`${section}_speaking`,find(['speaking']));put(`${section}_reading`,find(['reading']));put(`${section}_writing`,find(['writing']));put(`${section}_dictation`,find(['dictation']));put(`${section}_written`,find(['written']));}
  }else if(key==='class_9_10_single'){
    put('written',headers.find((h:any)=>clean(h.baseName||h.text).includes('written')&&!h.formula));put('internal',headers.find((h:any)=>clean(h.baseName||h.text).includes('internal')&&!h.formula));put('total',headers.find((h:any)=>clean(h.baseName||h.text)==='total'&&h.formula));
  }else if(key==='class_9_10_dual_paper'){
    const termHeaders=headers.filter((h:any)=>String(h.term||'').toLowerCase().includes('first')&&!h.formula);
    if(termHeaders[0])put('paper_1',termHeaders[0],false);if(termHeaders[1])put('paper_2',termHeaders[1],false);put('internal',termHeaders.find((h:any)=>clean(h.baseName||h.text).includes('internal')),false);put('total',headers.find((h:any)=>clean(h.baseName||h.text)==='total'&&String(h.group||'').toLowerCase().includes('first')),false);
  }else if(key==='class_9_10_dual_language'){
    const hindiWritten=headers.find((h:any)=>String(h.group||'').toLowerCase().includes('hindi')&&String(h.term||'').toLowerCase().includes('first')&&clean(h.baseName||h.text).includes('written'));
    const hindiInternal=headers.find((h:any)=>String(h.group||'').toLowerCase().includes('hindi')&&String(h.term||'').toLowerCase().includes('first')&&clean(h.baseName||h.text).includes('internal'));
    const marathiWritten=headers.find((h:any)=>String(h.group||'').toLowerCase().includes('marathi')&&String(h.term||'').toLowerCase().includes('first')&&clean(h.baseName||h.text).includes('written'));
    const marathiInternal=headers.find((h:any)=>String(h.group||'').toLowerCase().includes('marathi')&&String(h.term||'').toLowerCase().includes('first')&&clean(h.baseName||h.text).includes('internal'));
    put('hindi_written',hindiWritten,false);put('hindi_internal',hindiInternal,false);put('marathi_written',marathiWritten,false);put('marathi_internal',marathiInternal,false);
  }
  return out;
}

async function clerkResultApi<T=any>(path:string,init:RequestInit={}):Promise<T>{
  const session=await supabase.auth.getSession();
  const token=session.data.session?.access_token;
  if(session.error||!token)throw session.error||new Error('Authenticated Clerk session not found.');
  const response=await fetch(path,{...init,headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`,...(init.headers||{})},cache:'no-store'});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(payload?.error||`Result Master request failed (${response.status}).`);
  return payload as T;
}

export async function loadLegacyClerkMasterTemplates():Promise<{ok:boolean;templates:any[];message:string}>{
  try{
    const payload=await clerkResultApi<any>('/api/clerk/result-master-templates');
    const rows=Array.isArray(payload?.templates)?payload.templates:[];
    const templates=rows.map((row:any)=>row?.definition?.legacyMaster).filter((row:any)=>row&&typeof row==='object');
    return {ok:true,templates,message:'Clerk Result Master loaded from cloud.'};
  }catch(error:any){
    return {ok:false,templates:[],message:error?.message||'Clerk Result Master could not be loaded from cloud.'};
  }
}

export async function publishLegacyClerkMasterTemplate(raw:any):Promise<{ok:boolean;message:string}> {
  const key=canonicalTemplateKeyFromLegacy(raw);if(!key)return {ok:false,message:'This Clerk template is not one of the canonical Result Master categories.'};
  const definition={headOverrides:legacyMasterHeadOverrides(raw,key),legacyMaster:{id:raw.id,name:raw.name,description:raw.description,academicYear:raw.academicYear,templateCategory:raw.templateCategory,templateType:raw.templateType,rowsPerStudent:raw.rowsPerStudent,rowLabels:raw.rowLabels,hasVerticalTotals:raw.hasVerticalTotals,pageSetup:raw.pageSetup,sections:raw.sections,headers:raw.headers,rowHeights:raw.rowHeights,rows:raw.rows},publishedFrom:'clerk_master_editor',publishedAt:new Date().toISOString()};
  try{
    await clerkResultApi(`/api/clerk/result-master-templates/${encodeURIComponent(key)}`,{method:'PUT',body:JSON.stringify({name:raw.name||key,category:raw.templateCategory||key,description:raw.description||'',definition,active:true})});
    return {ok:true,message:'Clerk Master saved as the canonical Teacher Result cloud source.'};
  }catch(error:any){
    return {ok:false,message:error?.message||'Result Master could not be saved to cloud.'};
  }
}
