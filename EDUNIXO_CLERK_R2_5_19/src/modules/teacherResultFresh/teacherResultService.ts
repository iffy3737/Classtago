import { supabase } from '../../lib/supabase';
import { loadAttendanceRoster } from '../teacherFresh/teacherFreshService';
import type { TeacherCloudContext, TeacherScopeAssignment } from '../teacherFresh/types';
import { builtInTemplate, calculateComputed, fallbackTemplateKey, normalizeMappedTemplateKey } from './resultTemplateConfig';
import type {
  ClassSubjectStatus,
  ResultBookColumn,
  ResultBookRecord,
  ResultMarkRow,
  ResultScope,
  ResultStudent,
  ResultSubjectList,
  ResultTemplateDefinition,
  ResultTemplateKey,
  ResultTerm,
} from './types';

const missingTable = (e: any) => /does not exist|schema cache|could not find|relation .* does not exist/i.test(String(e?.message || ''));
const asText = (v: any, fallback = '') => v == null || v === '' ? fallback : String(v);
const normalizeSubject = (name: string) => String(name || '').toLowerCase().replace(/[^a-z\u0900-\u097f\u0600-\u06ff]+/g,' ').trim();
const isHindi = (name:string) => /hindi|हिंदी|ہندی/.test(normalizeSubject(name));
const isMarathi = (name:string) => /marathi|मराठी|مراٹھی/.test(normalizeSubject(name));

export function buildResultScopes(context: TeacherCloudContext, term: ResultTerm): ResultScope[] {
  const subjectAssignments = context.assignments.filter(a => a.scopeType === 'subject' && a.subjectId);
  const consumed = new Set<string>();
  const result: ResultScope[] = [];
  for (const a of subjectAssignments) {
    if (consumed.has(a.id)) continue;
    const key = fallbackTemplateKey(a.className, a.subjectName);
    if (key === 'class_1_8_hindi_marathi' && isHindi(a.subjectName) && isMarathi(a.subjectName)) {
      // Explicit combined Hindi/Marathi subject in Classes 1–8: one assignment,
      // one combined template, both language rows owned by the assigned Teacher.
      result.push({
        ...a, term, pairedSubjectIds:[a.subjectId], pairedSubjectNames:[a.subjectName],
        ownedSections:['hindi','marathi'],
      });
      consumed.add(a.id);
      continue;
    }
    if (key === 'class_1_8_hindi_marathi' || key === 'class_9_10_dual_language') {
      const sameScope = subjectAssignments.filter(x => x.classId === a.classId && (x.divisionId || '') === (a.divisionId || ''));
      const hindi = sameScope.find(x => isHindi(x.subjectName));
      const marathi = sameScope.find(x => isMarathi(x.subjectName));
      if (hindi && marathi) {
        consumed.add(hindi.id); consumed.add(marathi.id);
        result.push({
          ...hindi,
          id: `langbundle:${hindi.id}:${marathi.id}`,
          subjectId: hindi.subjectId,
          subjectName: 'Hindi / Marathi',
          subjectCode: [hindi.subjectCode, marathi.subjectCode].filter(Boolean).join(' / ') || undefined,
          term,
          pairedSubjectIds: [hindi.subjectId, marathi.subjectId],
          pairedSubjectNames: [hindi.subjectName, marathi.subjectName],
          ownedSections: ['hindi','marathi'],
        });
        continue;
      }
      result.push({
        ...a,
        term,
        pairedSubjectIds: [a.subjectId],
        pairedSubjectNames: [a.subjectName],
        ownedSections: isHindi(a.subjectName) ? ['hindi'] : isMarathi(a.subjectName) ? ['marathi'] : ['subject'],
      });
      consumed.add(a.id);
      continue;
    }
    result.push({ ...a, term, ownedSections:['subject'] });
    consumed.add(a.id);
  }
  return result;
}

export async function loadResultRoster(scope: ResultScope): Promise<ResultStudent[]> {
  const roster = await loadAttendanceRoster(scope);
  return roster.map(s => ({ id:s.id, name:s.fullName, rollNumber:s.rollNumber, grNumber:s.grNumber, examSeatNo:s.examSeatNo }));
}

export async function resolveResultTemplate(scope: ResultScope): Promise<{ template: ResultTemplateDefinition; mappingSource: string; backendReady: boolean }> {
  // Template routing is deterministic and assignment-driven. Clerk and Teacher do
  // not manually select a template. The Class + assigned Subject decide the key.
  const key = fallbackTemplateKey(scope.className, scope.subjectName);

  // A school may keep a customized definition for the automatically-resolved key.
  // This changes layout/content only; it never changes which key the assignment gets.
  const templateRow = await supabase.from('edunixo_result_templates')
    .select('template_key, name, category, description, definition')
    .eq('school_id', scope.schoolId)
    .eq('template_key', key)
    .eq('active', true)
    .maybeSingle();

  if (!templateRow.error && templateRow.data) {
    const definition: any = templateRow.data.definition || {};
    const fallback = builtInTemplate(key, scope.subjectName);
    const baseHeads=Array.isArray(definition.heads) && definition.heads.length ? definition.heads : fallback.heads;
    const overrides=definition.headOverrides&&typeof definition.headOverrides==='object'?definition.headOverrides:{};
    const heads=baseHeads.map((head:any)=>({...head,...(overrides[head.key]||{})}));
    return {
      template: {
        ...fallback,
        ...definition,
        key,
        name: templateRow.data.name || definition.name || fallback.name,
        category: templateRow.data.category || definition.category || fallback.category,
        description: templateRow.data.description || definition.description || fallback.description,
        heads,
        source:'clerk_cloud_master',
      },
      mappingSource:'Automatic · Academic Assignment → Class + Subject → System Master Template',
      backendReady:true,
    };
  }
  if (templateRow.error && !missingTable(templateRow.error)) throw templateRow.error;

  return {
    template: builtInTemplate(key, scope.subjectName),
    mappingSource:'Automatic · Academic Assignment → Class + Subject → Built-in System Master Template',
    backendReady: !(templateRow.error && missingTable(templateRow.error)),
  };
}

function listFromRow(row:any): ResultSubjectList {
  return {
    id: row.id, schoolId: asText(row.school_id), academicYearId: asText(row.academic_year_id),
    classId: asText(row.class_id), divisionId: row.division_id || undefined,
    subjectId: asText(row.subject_id), subjectName: asText(row.subject_name),
    teacherUserId: asText(row.teacher_user_id), teacherRecordId: row.teacher_record_id || undefined,
    term: row.term, templateKey: row.template_key, sectionKey: row.section_key || 'subject',
    status: row.status, returnReason: row.return_reason || undefined, submittedAt: row.submitted_at || undefined,
    acceptedAt: row.accepted_at || undefined, reviewedByUserId: row.reviewed_by_user_id || undefined,
    revision: Number(row.revision || 1), templateSnapshot: row.template_snapshot || undefined,
  };
}

async function findSubjectList(input: { scope: ResultScope; subjectId: string; sectionKey: string; teacherUserId?: string }) {
  let q:any = supabase.from('edunixo_result_subject_lists').select('*')
    .eq('school_id', input.scope.schoolId).eq('academic_year_id', input.scope.academicYearId)
    .eq('class_id', input.scope.classId).eq('subject_id', input.subjectId).eq('term', input.scope.term)
    .eq('section_key', input.sectionKey);
  if (input.scope.divisionId) q = q.eq('division_id', input.scope.divisionId); else q = q.is('division_id', null);
  if (input.teacherUserId) q = q.eq('teacher_user_id', input.teacherUserId);
  return await q.maybeSingle();
}

export async function loadOwnedSubjectLists(scope: ResultScope, context: TeacherCloudContext): Promise<{ lists: ResultSubjectList[]; backendReady:boolean }> {
  const targets: Array<{subjectId:string;subjectName:string;sectionKey:string}> = [];
  if (scope.ownedSections?.includes('hindi')) {
    const idx = (scope.pairedSubjectNames || []).findIndex(isHindi); targets.push({subjectId:(scope.pairedSubjectIds || [scope.subjectId])[idx >= 0 ? idx : 0], subjectName:(scope.pairedSubjectNames || [scope.subjectName])[idx >= 0 ? idx : 0], sectionKey: scope.ownedSections.length > 1 ? 'hindi_marathi' : 'hindi'});
  }
  if (scope.ownedSections?.includes('marathi') && !scope.ownedSections?.includes('hindi')) {
    const idx = (scope.pairedSubjectNames || []).findIndex(isMarathi); targets.push({subjectId:(scope.pairedSubjectIds || [scope.subjectId])[idx >= 0 ? idx : 0], subjectName:(scope.pairedSubjectNames || [scope.subjectName])[idx >= 0 ? idx : 0], sectionKey:'marathi'});
  }
  if (scope.ownedSections?.includes('hindi') && scope.ownedSections?.includes('marathi')) {
    targets.splice(0, targets.length, { subjectId:(scope.pairedSubjectIds || [scope.subjectId])[0], subjectName:'Hindi / Marathi', sectionKey:'hindi_marathi' });
  }
  if (!targets.length) targets.push({subjectId:scope.subjectId,subjectName:scope.subjectName,sectionKey:'subject'});
  const lists: ResultSubjectList[] = [];
  for (const target of targets) {
    const r = await findSubjectList({ scope, subjectId:target.subjectId, sectionKey:target.sectionKey, teacherUserId:context.userId });
    if (r.error) {
      if (missingTable(r.error)) return { lists:[], backendReady:false };
      throw r.error;
    }
    if (r.data) lists.push(listFromRow(r.data));
  }
  return { lists, backendReady:true };
}

export async function loadMarks(listId:string): Promise<ResultMarkRow[]> {
  const r = await supabase.from('edunixo_result_subject_marks').select('student_id, marks, computed').eq('list_id', listId);
  if (r.error) { if (missingTable(r.error)) return []; throw r.error; }
  return (r.data || []).map((x:any) => ({ studentId:x.student_id, marks:x.marks || {}, computed:x.computed || {} }));
}

export async function saveSubjectDraft(input:{ context:TeacherCloudContext; scope:ResultScope; template:ResultTemplateDefinition; rows:ResultMarkRow[] }): Promise<ResultSubjectList> {
  const ownedSections = input.scope.ownedSections || ['subject'];
  const sectionKey = ownedSections.includes('hindi') && ownedSections.includes('marathi') ? 'hindi_marathi' : ownedSections[0] || 'subject';
  const subjectId = (input.scope.pairedSubjectIds || [input.scope.subjectId])[0];
  const subjectName = sectionKey === 'hindi_marathi' ? 'Hindi / Marathi' : input.scope.subjectName;
  const existing = await findSubjectList({scope:input.scope,subjectId,sectionKey,teacherUserId:input.context.userId});
  if (existing.error && missingTable(existing.error)) throw new Error('Result cloud workflow is not installed yet. Run the R4 Result Management Supabase setup before Save/Send.');
  if (existing.error) throw existing.error;
  const current = existing.data as any;
  if (current && ['submitted','accepted'].includes(current.status)) throw new Error('This mark list is locked after submission/acceptance. It can be edited only if the Class Teacher returns it for correction.');
  const payload:any = {
    school_id:input.scope.schoolId, academic_year_id:input.scope.academicYearId, class_id:input.scope.classId,
    division_id:input.scope.divisionId || null, subject_id:subjectId, subject_name:subjectName,
    teacher_user_id:input.context.userId, teacher_record_id:input.context.teacherRecordId,
    term:input.scope.term, template_key:input.template.key, section_key:sectionKey, status:'draft',
    template_snapshot:input.template, updated_at:new Date().toISOString(),
  };
  let listRow:any;
  if (current?.id) {
    const r = await supabase.from('edunixo_result_subject_lists').update({ ...payload, revision:Number(current.revision || 1) + (current.status === 'returned' ? 1 : 0), return_reason:null }).eq('id',current.id).select('*').single();
    if (r.error) throw r.error; listRow=r.data;
  } else {
    const r = await supabase.from('edunixo_result_subject_lists').insert(payload).select('*').single();
    if (r.error) throw r.error; listRow=r.data;
  }
  const markPayload = input.rows.map(row => ({ list_id:listRow.id, student_id:row.studentId, marks:row.marks, computed:calculateComputed(input.template,row.marks), updated_by_user_id:input.context.userId, updated_at:new Date().toISOString() }));
  if (markPayload.length) {
    const m = await supabase.from('edunixo_result_subject_marks').upsert(markPayload,{onConflict:'list_id,student_id'});
    if (m.error) throw m.error;
  }
  await addEvent(listRow.id,input.context.userId,'draft_saved','Subject Teacher saved mark list draft.');
  return listFromRow(listRow);
}

export async function submitSubjectList(listId:string, userId:string) {
  const r = await supabase.from('edunixo_result_subject_lists').update({status:'submitted',submitted_at:new Date().toISOString(),return_reason:null}).eq('id',listId).eq('teacher_user_id',userId).in('status',['draft','returned']).select('*').single();
  if (r.error) throw r.error;
  await addEvent(listId,userId,'submitted','Sent to Class Teacher for review.');
  return listFromRow(r.data);
}

async function addEvent(listId:string | null,userId:string,eventType:string,message:string, metadata:any={}) {
  const r = await supabase.from('edunixo_result_workflow_events').insert({subject_list_id:listId, actor_user_id:userId,event_type:eventType,message,metadata});
  if (r.error && !missingTable(r.error)) throw r.error;
}

export async function loadClassSubjectStatuses(context:TeacherCloudContext, classScope:TeacherScopeAssignment, term:ResultTerm): Promise<ClassSubjectStatus[]> {
  const readAssignments = async () => {
    // Production source-of-truth: canonical Academic Assignment table. An empty
    // canonical result is intentional and must not be filled from legacy rows.
    let canonical:any=supabase.from('school_subject_teacher_assignments').select('*').eq('school_id',context.schoolId).eq('academic_year_id',classScope.academicYearId).eq('class_id',classScope.classId);
    if (classScope.divisionId) canonical=canonical.eq('division_id',classScope.divisionId); else canonical=canonical.is('division_id',null);
    const current=await canonical;
    if (!current.error) return current.data||[];
    if (!missingTable(current.error)) throw current.error;

    // Migration compatibility only: use the old cloud table when the canonical
    // table itself is not installed. Never let legacy rows override a valid
    // canonical empty assignment set.
    let legacy:any = supabase.from('subject_teachers').select('*').eq('school_id',context.schoolId).eq('academic_year_id',classScope.academicYearId).eq('class_id',classScope.classId);
    if (classScope.divisionId) legacy=legacy.eq('division_id',classScope.divisionId); else legacy=legacy.is('division_id',null);
    const fallback=await legacy;
    if (!fallback.error) return fallback.data||[];
    if (!missingTable(fallback.error)) throw fallback.error;
    return [];
  };
  const assignments:any[] = await readAssignments();
  const subjectIds=[...new Set(assignments.map(x=>x.subject_id).filter(Boolean))];
  const teacherIds=[...new Set(assignments.map(x=>x.teacher_id).filter(Boolean))];
  const [subjects,teachers] = await Promise.all([
    subjectIds.length ? supabase.from('subjects').select('id,subject_name').in('id',subjectIds) : Promise.resolve({data:[],error:null} as any),
    teacherIds.length ? supabase.from('teachers').select('id,full_name').in('id',teacherIds) : Promise.resolve({data:[],error:null} as any),
  ]);
  const subjectMap=new Map((subjects.data||[]).map((x:any)=>[x.id,x.subject_name]));
  const teacherMap=new Map((teachers.data||[]).map((x:any)=>[x.id,x.full_name]));
  let listsQuery:any=supabase.from('edunixo_result_subject_lists').select('*').eq('school_id',context.schoolId).eq('academic_year_id',classScope.academicYearId).eq('class_id',classScope.classId).eq('term',term);
  if (classScope.divisionId) listsQuery=listsQuery.eq('division_id',classScope.divisionId); else listsQuery=listsQuery.is('division_id',null);
  const lists=await listsQuery;
  if (lists.error && !missingTable(lists.error)) throw lists.error;
  const listRows=(lists.data||[]).map(listFromRow);
  const statuses:ClassSubjectStatus[]=[];
  const groupedLang = new Set<string>();
  for (const a of assignments) {
    const name=asText(subjectMap.get(a.subject_id),asText(a.subject_name,'Assigned Subject'));
    const tmpl=fallbackTemplateKey(classScope.className,name);
    if (tmpl === 'class_1_8_hindi_marathi' || tmpl === 'class_9_10_dual_language') {
      const key='lang'; if (groupedLang.has(key)) continue; groupedLang.add(key);
      const langIds=assignments.filter(x=>{const n=asText(subjectMap.get(x.subject_id),asText(x.subject_name));return isHindi(n)||isMarathi(n)}).map(x=>x.subject_id);
      const combined=listRows.find(l=>l.sectionKey==='hindi_marathi') || undefined;
      if (combined) statuses.push({subjectId:langIds.join('|'),subjectName:'Hindi / Marathi',teacherName:'Combined language assignment',list:combined});
      else {
        const hindiA=assignments.find(x=>isHindi(asText(subjectMap.get(x.subject_id),asText(x.subject_name))));
        const marathiA=assignments.find(x=>isMarathi(asText(subjectMap.get(x.subject_id),asText(x.subject_name))));
        for (const x of [hindiA,marathiA].filter(Boolean) as any[]) {
          const n=asText(subjectMap.get(x.subject_id),asText(x.subject_name));
          statuses.push({subjectId:x.subject_id,subjectName:n,teacherName:asText(teacherMap.get(x.teacher_id)),list:listRows.find(l=>l.subjectId===x.subject_id)});
        }
      }
      continue;
    }
    statuses.push({subjectId:a.subject_id,subjectName:name,teacherName:asText(teacherMap.get(a.teacher_id)),list:listRows.find(l=>l.subjectId===a.subject_id)});
  }
  if (!statuses.length && listRows.length) return listRows.map(l=>({subjectId:l.subjectId,subjectName:l.subjectName,list:l}));
  return statuses;
}

export async function reviewReturn(list:ResultSubjectList, context:TeacherCloudContext, reason:string) {
  if (!reason.trim()) throw new Error('Correction reason is required.');
  const r=await supabase.from('edunixo_result_subject_lists').update({status:'returned',return_reason:reason.trim(),reviewed_by_user_id:context.userId,reviewed_at:new Date().toISOString()}).eq('id',list.id).eq('status','submitted').select('*').single();
  if (r.error) throw r.error;
  await addEvent(list.id,context.userId,'returned_for_correction',reason.trim(),{recipient_user_id:list.teacherUserId});
  return listFromRow(r.data);
}

export async function acceptToResultBook(list:ResultSubjectList, context:TeacherCloudContext) {
  const r=await supabase.from('edunixo_result_subject_lists').update({status:'accepted',reviewed_by_user_id:context.userId,accepted_at:new Date().toISOString()}).eq('id',list.id).eq('status','submitted').select('*').single();
  if (r.error) throw r.error;
  const accepted=listFromRow(r.data);
  await addEvent(list.id,context.userId,'accepted_to_result_book','Class Teacher accepted the subject mark list and sent it to Result Book.');
  const q=await supabase.from('edunixo_result_print_queue').insert({school_id:list.schoolId,academic_year_id:list.academicYearId,class_id:list.classId,division_id:list.divisionId||null,term:list.term,item_type:'subject_mark_list',source_id:list.id,subject_name:list.subjectName,status:'ready',created_by_user_id:context.userId,payload:{subjectListId:list.id,teacherUserId:list.teacherUserId}});
  if (q.error && !missingTable(q.error)) throw q.error;
  return accepted;
}

export async function loadSubjectListById(listId:string):Promise<ResultSubjectList|null> {
  const r=await supabase.from('edunixo_result_subject_lists').select('*').eq('id',listId).maybeSingle();
  if(r.error){if(missingTable(r.error))return null;throw r.error;}
  return r.data?listFromRow(r.data):null;
}

export async function loadReadOnlyList(list:ResultSubjectList) {
  const rows=await loadMarks(list.id);
  const rosterScope:any={schoolId:list.schoolId,academicYearId:list.academicYearId,classId:list.classId,divisionId:list.divisionId,subjectId:list.subjectId,subjectName:list.subjectName,className:'',division:'',teacherRecordId:list.teacherRecordId||'',academicYear:'',scopeType:'subject',id:list.id,isClassTeacher:true,medium:''};
  const roster=await loadResultRoster(rosterScope);
  const baseTemplate=list.templateSnapshot || builtInTemplate(list.templateKey,list.subjectName);
  const template=(list.sectionKey==='hindi'||list.sectionKey==='marathi')
    ? {...baseTemplate,heads:baseTemplate.heads.filter(head=>head.ownerSection===list.sectionKey)}
    : baseTemplate;
  return { rows, roster, template };
}

export async function buildOrLoadResultBook(context:TeacherCloudContext,classScope:TeacherScopeAssignment,term:ResultTerm):Promise<{book:ResultBookRecord;statuses:ClassSubjectStatus[];complete:boolean}> {
  const statuses=await loadClassSubjectStatuses(context,classScope,term);
  const accepted=statuses.filter(s=>s.list?.status==='accepted' && s.list);
  const complete=statuses.length>0 && accepted.length===statuses.length;
  const roster=await loadResultRoster({...classScope,term} as ResultScope);
  const consolidated:Record<string,Record<string,number|string>>={};
  const columns:ResultBookColumn[]=[];
  const columnKeys=new Set<string>();
  for (const st of roster) consolidated[st.id]={studentName:st.name,rollNumber:st.rollNumber||'',grNumber:st.grNumber||'',examSeatNo:st.examSeatNo||''};

  const clean=(v:string)=>String(v||'').trim().toLowerCase().replace(/[^a-z0-9\u0900-\u097f\u0600-\u06ff]+/g,'_').replace(/^_+|_+$/g,'');
  for (const status of accepted) {
    const list=status.list!;
    const marks=await loadMarks(list.id);
    const tmpl=list.templateSnapshot || builtInTemplate(list.templateKey,list.subjectName);
    const visibleHeads=tmpl.heads.filter(head=>{
      if (list.sectionKey==='hindi') return head.ownerSection==='hindi';
      if (list.sectionKey==='marathi') return head.ownerSection==='marathi';
      return true;
    });
    for (const head of visibleHeads) {
      const subjectLabel=head.ownerSection==='hindi' ? 'Hindi' : head.ownerSection==='marathi' ? 'Marathi' : status.subjectName;
      const key=`${clean(subjectLabel)||clean(status.subjectId)}__${head.key}`;
      if (!columnKeys.has(key)) {
        columnKeys.add(key);
        columns.push({
          key,
          subjectName:subjectLabel,
          headKey:head.key,
          label:head.label,
          group:head.group,
          maxMarks:head.maxMarks,
          kind:head.kind,
          templateKey:tmpl.key,
          sectionKey:list.sectionKey,
          scholastic:tmpl.key!=='grade_subject',
        });
      }
    }
    for (const row of marks) {
      if (!consolidated[row.studentId]) consolidated[row.studentId]={};
      const computed={...row.computed,...calculateComputed(tmpl,row.marks)};
      for (const head of visibleHeads) {
        const subjectLabel=head.ownerSection==='hindi' ? 'Hindi' : head.ownerSection==='marathi' ? 'Marathi' : status.subjectName;
        const key=`${clean(subjectLabel)||clean(status.subjectId)}__${head.key}`;
        const value=head.kind==='calculated' ? (computed[head.key] ?? '') : (row.marks[head.key] ?? '');
        consolidated[row.studentId][key]=value;
      }
    }
  }

  // The official 9–10 Result Book keeps Hindi + Marathi under one Second Language
  // block with a combined term total. Keep each teacher-owned head separate for
  // auditability, then derive the shared total only after both accepted sections exist.
  const hindiTotal=columns.find(c=>c.subjectName==='Hindi' && c.headKey==='hindi_total');
  const marathiTotal=columns.find(c=>c.subjectName==='Marathi' && c.headKey==='marathi_total');
  if (hindiTotal && marathiTotal) {
    const combinedKey='second_language__total';
    columns.push({key:combinedKey,subjectName:'Second Language',headKey:'second_language_total',label:'Total',maxMarks:(hindiTotal.maxMarks||0)+(marathiTotal.maxMarks||0),kind:'calculated',templateKey:hindiTotal.templateKey,sectionKey:'hindi_marathi',scholastic:true});
    for (const row of Object.values(consolidated)) {
      const h=Number(row[hindiTotal.key]); const m=Number(row[marathiTotal.key]);
      row[combinedKey]=Number.isFinite(h)&&Number.isFinite(m)?h+m:'';
    }
  }

  // Result Book identity normalizes an unassigned division as an empty key. Older
  // rows may store that value as '' while current writes store NULL. The unique
  // index intentionally treats both as the same identity via coalesce(division_id,'').
  // Load the class/term candidates first, then compare the normalized division key
  // in JavaScript so an existing legacy blank-division row is reused instead of
  // attempting a duplicate insert.
  const candidateRes=await supabase.from('edunixo_result_books').select('*')
    .eq('school_id',context.schoolId)
    .eq('academic_year_id',classScope.academicYearId)
    .eq('class_id',classScope.classId)
    .eq('term',term);
  if (candidateRes.error && missingTable(candidateRes.error)) throw new Error('Result Book cloud setup is incomplete. Run EDUNIXO_R13_RESULT_BOOK_SAFE_SETUP.sql once in Supabase SQL Editor, then refresh Preview.');
  if (candidateRes.error) throw candidateRes.error;
  const targetDivisionKey=clean(classScope.divisionId);
  const existingRow=(candidateRes.data||[]).find((x:any)=>clean(x.division_id)===targetDivisionKey) || null;
  const nextStatus=existingRow?.status==='sent_to_progress_card'&&complete?'sent_to_progress_card':complete?'complete':'building';
  const payload={school_id:context.schoolId,academic_year_id:classScope.academicYearId,class_id:classScope.classId,division_id:targetDivisionKey||null,term,status:nextStatus,class_teacher_user_id:context.userId,subject_list_ids:accepted.map(x=>x.list!.id),consolidated,column_schema:columns,updated_at:new Date().toISOString()};
  let row:any;
  if (existingRow?.id) {
    const r=await supabase.from('edunixo_result_books').update(payload).eq('id',existingRow.id).select('*').single();
    if(r.error) throw r.error;
    row=r.data;
  } else {
    const inserted=await supabase.from('edunixo_result_books').insert(payload).select('*').single();
    if (!inserted.error) row=inserted.data;
    else if ((inserted.error as any)?.code==='23505') {
      // Concurrent rebuild or a legacy NULL/blank division identity may win the
      // insert. Re-read the normalized identity and update that canonical row.
      const retry=await supabase.from('edunixo_result_books').select('*')
        .eq('school_id',context.schoolId)
        .eq('academic_year_id',classScope.academicYearId)
        .eq('class_id',classScope.classId)
        .eq('term',term);
      if (retry.error) throw retry.error;
      const canonical=(retry.data||[]).find((x:any)=>clean(x.division_id)===targetDivisionKey);
      if (!canonical?.id) throw inserted.error;
      const updated=await supabase.from('edunixo_result_books').update(payload).eq('id',canonical.id).select('*').single();
      if (updated.error) throw updated.error;
      row=updated.data;
    } else throw inserted.error;
  }
  return {book:{id:row.id,schoolId:row.school_id,academicYearId:row.academic_year_id,classId:row.class_id,divisionId:row.division_id||undefined,term:row.term,status:row.status,consolidated:row.consolidated||{},columns:Array.isArray(row.column_schema)?row.column_schema:columns,subjectListIds:row.subject_list_ids||[],createdAt:row.created_at,sentAt:row.sent_at},statuses,complete};
}

export async function sendResultBookToProgressAndClerk(book:ResultBookRecord,context:TeacherCloudContext) {
  if (book.status !== 'complete') throw new Error('Result Book is not complete. Every required subject mark list must be accepted first.');
  const updated=await supabase.from('edunixo_result_books').update({status:'sent_to_progress_card',sent_at:new Date().toISOString()}).eq('id',book.id).eq('status','complete').select('*').single();
  if (updated.error) throw updated.error;
  const [pc,queue]=await Promise.all([
    supabase.from('edunixo_progress_card_batches').upsert({school_id:book.schoolId,academic_year_id:book.academicYearId,class_id:book.classId,division_id:book.divisionId||null,term:book.term,result_book_id:book.id,status:'prepared',payload:{rows:book.consolidated,columns:book.columns},created_by_user_id:context.userId},{onConflict:'result_book_id'}),
    supabase.from('edunixo_result_print_queue').upsert({school_id:book.schoolId,academic_year_id:book.academicYearId,class_id:book.classId,division_id:book.divisionId||null,term:book.term,item_type:'result_book',source_id:book.id,status:'ready',created_by_user_id:context.userId,payload:{resultBookId:book.id}},{onConflict:'item_type,source_id'}),
  ]);
  if (pc.error) throw pc.error; if (queue.error) throw queue.error;
}

export async function loadProgressBatch(context:TeacherCloudContext,classScope:TeacherScopeAssignment,term:ResultTerm) {
  let q:any=supabase.from('edunixo_progress_card_batches').select('*').eq('school_id',context.schoolId).eq('academic_year_id',classScope.academicYearId).eq('class_id',classScope.classId).eq('term',term);
  if (classScope.divisionId) q=q.eq('division_id',classScope.divisionId); else q=q.is('division_id',null);
  const r=await q.maybeSingle();
  if (r.error) { if(missingTable(r.error)) return null; throw r.error; }
  return r.data || null;
}

export async function loadReturnedResultCount(context:TeacherCloudContext):Promise<number|null> {
  const r=await supabase.from('edunixo_result_subject_lists').select('id',{count:'exact',head:true}).eq('school_id',context.schoolId).eq('teacher_user_id',context.userId).eq('status','returned');
  if (r.error) { if(missingTable(r.error)) return null; throw r.error; }
  return r.count || 0;
}
