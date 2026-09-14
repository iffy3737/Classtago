import { supabase } from '../../lib/supabase';
import { normalizeMappedTemplateKey } from './resultTemplateConfig';
import type { ResultTemplateKey } from './types';

const missing=(e:any)=>/does not exist|schema cache|could not find|relation .* does not exist/i.test(String(e?.message||''));

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

export async function publishLegacyClerkMasterTemplate(raw:any):Promise<{ok:boolean;message:string}> {
  const key=canonicalTemplateKeyFromLegacy(raw);if(!key)return {ok:false,message:'This Clerk template is not one of the canonical Result Master categories.'};
  const auth=await supabase.auth.getUser();const userId=auth.data.user?.id;if(!userId)return {ok:false,message:'Authenticated Clerk session not found.'};
  const membership=await supabase.from('user_school_memberships').select('school_id,role_in_school').eq('user_id',userId).eq('is_active',true).maybeSingle();
  if(membership.error)return {ok:false,message:membership.error.message};
  const schoolId=String((membership.data as any)?.school_id||'');if(!schoolId)return {ok:false,message:'Active school membership not found.'};
  const definition={headOverrides:legacyMasterHeadOverrides(raw,key),legacyMaster:{id:raw.id,name:raw.name,description:raw.description,academicYear:raw.academicYear,templateCategory:raw.templateCategory,templateType:raw.templateType,rowsPerStudent:raw.rowsPerStudent,rowLabels:raw.rowLabels,hasVerticalTotals:raw.hasVerticalTotals,pageSetup:raw.pageSetup,sections:raw.sections,headers:raw.headers,rowHeights:raw.rowHeights,rows:raw.rows},publishedFrom:'clerk_master_editor',publishedAt:new Date().toISOString()};
  const r=await supabase.from('edunixo_result_templates').update({name:raw.name||undefined,category:raw.templateCategory||undefined,description:raw.description||undefined,definition,updated_at:new Date().toISOString()}).eq('school_id',schoolId).eq('template_key',key).select('id').maybeSingle();
  if(r.error){if(missing(r.error))return {ok:false,message:'R4 Result cloud tables are not installed yet.'};return {ok:false,message:r.error.message};}
  if(!r.data){const i=await supabase.from('edunixo_result_templates').insert({school_id:schoolId,template_key:key,name:raw.name||key,category:raw.templateCategory||key,description:raw.description||'',definition,active:true}).select('id').single();if(i.error)return {ok:false,message:i.error.message};}
  return {ok:true,message:'Clerk Master published to Teacher Result cloud.'};
}
