import { supabaseAdmin } from './supabaseAdmin';

export type TeacherCommunicationActiveUser = { userId: string; schoolId: string; role: string };
export type TeacherCommunicationScope = {
  id: string; assignmentId: string; scopeType: 'class_teacher'|'subject'; academicYearId?: string; academicYear?: string;
  classId: string; className: string; divisionId?: string; division: string; subjectId?: string; subjectName?: string;
  label: string; isClassTeacherScope: boolean;
};

const norm = (v: unknown) => String(v ?? '').trim().toLowerCase().replace(/^class\s+/, '').replace(/\s+/g,' ');
const missingTable = (e:any) => ['42P01','PGRST205'].includes(String(e?.code||'')) || /does not exist|schema cache|could not find|relation .* does not exist/i.test(String(e?.message||''));


export async function ensureHeadmasterTeachingProfile(activeUser: TeacherCommunicationActiveUser) {
  if (!supabaseAdmin) throw new Error('Teaching profile service is unavailable.');
  if (activeUser.role !== 'headmaster') return null;

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('id,username,full_name,employee_code,shalarth_id,email,phone_number,is_active,status')
    .eq('id', activeUser.userId)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile) throw new Error('Headmaster user profile could not be resolved.');

  const direct = await supabaseAdmin
    .from('teachers')
    .select('id,user_id,school_id,full_name,employee_id,shalarth_id,designation,mobile_number,email,is_active')
    .eq('school_id', activeUser.schoolId)
    .eq('user_id', activeUser.userId)
    .maybeSingle();
  if (direct.error) throw direct.error;
  if (direct.data) {
    if (direct.data.is_active === false) {
      const restored = await supabaseAdmin.from('teachers').update({ is_active:true, updated_at:new Date().toISOString() })
        .eq('id', direct.data.id).eq('school_id', activeUser.schoolId)
        .select('id,user_id,school_id,full_name,employee_id,shalarth_id,designation,mobile_number,email,is_active').single();
      if (restored.error) throw restored.error;
      return restored.data;
    }
    return direct.data;
  }

  const all = await supabaseAdmin
    .from('teachers')
    .select('id,user_id,school_id,full_name,employee_id,shalarth_id,designation,mobile_number,email,is_active')
    .eq('school_id', activeUser.schoolId);
  if (all.error) throw all.error;
  const rows:any[] = all.data || [];
  const ids = [profile.employee_code, profile.shalarth_id, profile.username]
    .filter(Boolean).map(v => norm(v));
  let candidate:any = null;
  if (ids.length) {
    const matches = rows.filter(row => !row.user_id && [row.employee_id,row.shalarth_id].filter(Boolean).map(norm).some(x => ids.includes(x)));
    if (matches.length === 1) candidate = matches[0];
  }
  if (!candidate) {
    const name = norm(profile.full_name);
    const matches = rows.filter(row => !row.user_id && norm(row.full_name) === name && /headmaster|principal/i.test(String(row.designation || '')));
    if (matches.length === 1) candidate = matches[0];
  }

  if (candidate) {
    const linked = await supabaseAdmin.from('teachers').update({
      user_id: activeUser.userId,
      full_name: profile.full_name || candidate.full_name,
      designation: candidate.designation || 'Headmaster',
      mobile_number: candidate.mobile_number || profile.phone_number || null,
      email: candidate.email || profile.email || null,
      is_active: true,
      updated_at: new Date().toISOString(),
    }).eq('id', candidate.id).eq('school_id', activeUser.schoolId)
      .select('id,user_id,school_id,full_name,employee_id,shalarth_id,designation,mobile_number,email,is_active').single();
    if (linked.error) throw linked.error;
    return linked.data;
  }

  // Some established schools have a legacy teachers_check constraint requiring a
  // staff identifier (and older variants may restrict designation values). Headmaster
  // teaching access must reuse the same canonical teachers table without changing the
  // Headmaster login role, so provide a deterministic Employee ID when the user profile
  // does not already carry SHALARTH/Employee metadata.
  const generatedEmployeeId = String(
    profile.employee_code ||
    `HM-${activeUser.userId.replace(/[^a-z0-9]/gi, '').slice(0, 12).toUpperCase()}`
  ).trim().slice(0, 100);
  const baseInsert = {
    school_id: activeUser.schoolId,
    user_id: activeUser.userId,
    shalarth_id: profile.shalarth_id || null,
    employee_id: profile.employee_code || (!profile.shalarth_id ? generatedEmployeeId : null),
    full_name: profile.full_name || 'Headmaster',
    designation: 'Headmaster',
    mobile_number: profile.phone_number || null,
    email: profile.email || null,
    is_active: true,
  };
  let created = await supabaseAdmin.from('teachers').insert(baseInsert)
    .select('id,user_id,school_id,full_name,employee_id,shalarth_id,designation,mobile_number,email,is_active').single();

  // Backward-compatible retry for older school schemas whose teachers_check accepts
  // teaching designations but not the administrative label “Headmaster”. This changes
  // only the teaching-profile designation; the authenticated user remains Headmaster.
  if (created.error && (String(created.error.code || '') === '23514' || /teachers_check|check constraint/i.test(String(created.error.message || '')))) {
    created = await supabaseAdmin.from('teachers').insert({
      ...baseInsert,
      employee_id: baseInsert.employee_id || generatedEmployeeId,
      designation: 'Assistant Teacher',
    }).select('id,user_id,school_id,full_name,employee_id,shalarth_id,designation,mobile_number,email,is_active').single();
  }
  if (created.error) throw created.error;
  return created.data;
}

async function resolveTeacher(activeUser: TeacherCommunicationActiveUser) {
  if (!supabaseAdmin) throw new Error('Communication service is unavailable.');
  if (activeUser.role === 'headmaster') await ensureHeadmasterTeachingProfile(activeUser);
  const [{data: profile,error:pe},{data: rows,error:te}] = await Promise.all([
    supabaseAdmin.from('users').select('id,username,full_name,employee_code,shalarth_id,email,phone_number').eq('id',activeUser.userId).maybeSingle(),
    supabaseAdmin.from('teachers').select('id,user_id,full_name,employee_id,shalarth_id,mobile_number,is_active').eq('school_id',activeUser.schoolId).eq('is_active',true)
  ]);
  if(pe) throw pe; if(te) throw te;
  const teachers:any[] = rows||[];
  const bind=(teacher:any)=>({ ...teacher, __userProfile: profile || null });
  const direct = teachers.find(r=>String(r.user_id||'')===activeUser.userId); if(direct) return bind(direct);
  const ids=[profile?.employee_code,profile?.shalarth_id,profile?.username].filter(Boolean).map(norm);
  const byId=teachers.filter(r=>[r.employee_id,r.shalarth_id].filter(Boolean).map(norm).some(x=>ids.includes(x))); if(byId.length===1) return bind(byId[0]);
  const name=norm(profile?.full_name); const byName=name?teachers.filter(r=>norm(r.full_name)===name):[]; if(byName.length===1) return bind(byName[0]);
  throw new Error('Teacher Master identity could not be resolved for Communication.');
}

export async function loadTeacherCommunicationScopes(activeUser: TeacherCommunicationActiveUser) {
  if (!supabaseAdmin) throw new Error('Communication service is unavailable.');
  if (!['teacher','class_teacher','headmaster'].includes(activeUser.role)) throw new Error('Assigned teaching account required.');
  const teacher=await resolveTeacher(activeUser);
  const {data: year}=await supabaseAdmin.from('school_academic_years').select('*').eq('school_id',activeUser.schoolId).eq('is_active',true).limit(1).maybeSingle();
  let sq:any=supabaseAdmin.from('school_subject_teacher_assignments').select('*').eq('school_id',activeUser.schoolId).eq('teacher_id',teacher.id).eq('is_active',true);
  let cq:any=supabaseAdmin.from('school_class_teacher_assignments').select('*').eq('school_id',activeUser.schoolId).eq('teacher_id',teacher.id).eq('is_active',true);
  if(year?.id){sq=sq.eq('academic_year_id',year.id);cq=cq.eq('academic_year_id',year.id);}
  const [sr,cr]=await Promise.all([sq,cq]); if(sr.error) throw sr.error; if(cr.error) throw cr.error;
  const srows:any[]=sr.data||[], crows:any[]=cr.data||[];
  const classIds=[...new Set([...srows,...crows].map(r=>String(r.class_id||'')).filter(Boolean))];
  const divisionIds=[...new Set([...srows,...crows].map(r=>String(r.division_id||'')).filter(Boolean))];
  const subjectIds=[...new Set(srows.map(r=>String(r.subject_id||'')).filter(Boolean))];
  const [classes,divisions,subjects]=await Promise.all([
    classIds.length?supabaseAdmin.from('school_classes').select('*').in('id',classIds):Promise.resolve({data:[],error:null} as any),
    divisionIds.length?supabaseAdmin.from('school_divisions').select('*').in('id',divisionIds):Promise.resolve({data:[],error:null} as any),
    subjectIds.length?supabaseAdmin.from('subjects').select('*').in('id',subjectIds):Promise.resolve({data:[],error:null} as any)
  ]); if(classes.error) throw classes.error; if(divisions.error) throw divisions.error; if(subjects.error) throw subjects.error;
  const cm=new Map((classes.data||[]).map((r:any)=>[String(r.id),r])); const dm=new Map((divisions.data||[]).map((r:any)=>[String(r.id),r])); const sm=new Map((subjects.data||[]).map((r:any)=>[String(r.id),r]));
  const yearName=String(year?.year_name||year?.year_code||'Current Academic Year');
  let channelSettings:any=null;
  try { const settings=await supabaseAdmin.from('edunixo_communication_channel_settings').select('*').eq('school_id',activeUser.schoolId).maybeSingle(); if(!settings.error) channelSettings=settings.data; } catch {}
  let providerHealth:any=null;
  try {
    const health=await supabaseAdmin.functions.invoke('communication-dispatch',{body:{action:'health'}});
    if(!health.error&&health.data) providerHealth=health.data;
  } catch {}
  const channelReadiness={
    website:true,
    whatsapp:providerHealth ? Boolean(providerHealth.whatsapp) : Boolean(channelSettings?.whatsapp_enabled),
    sms:providerHealth ? Boolean(providerHealth.sms) : Boolean(channelSettings?.sms_enabled),
    email:providerHealth ? Boolean(providerHealth.email) : Boolean(channelSettings?.email_enabled)
  };
  const profile:any=teacher.__userProfile||{};
  const senderMobile=String(teacher.mobile_number||profile.phone_number||'').trim();
  const rawSenderEmail=String(profile.email||'').trim();
  const senderEmail=/@school\.local$/i.test(rawSenderEmail)?'':rawSenderEmail;
  const senderIdentity={
    teacherName:String(teacher.full_name||profile.full_name||'Teacher'),
    mobile:senderMobile||undefined,
    email:senderEmail||undefined,
    mobileLinked:Boolean(senderMobile),
    emailLinked:Boolean(senderEmail)
  };
  const result:TeacherCommunicationScope[]=[];
  for(const r of crows){ const c:any=cm.get(String(r.class_id))||{}; const d:any=dm.get(String(r.division_id||''))||{}; const className=String(c.class_name||c.name||'Assigned Class'); const division=String(d.division_name||d.name||(r.division_id?'Assigned Division':'All'));
    result.push({id:`class:${r.id}`,assignmentId:String(r.id),scopeType:'class_teacher',academicYearId:String(r.academic_year_id||year?.id||''),academicYear:yearName,classId:String(r.class_id),className,divisionId:r.division_id?String(r.division_id):undefined,division,label:`Class Teacher · ${className}${division&&division!=='All'?` · ${division}`:' · No Division'}`,isClassTeacherScope:true}); }
  for(const r of srows){ const c:any=cm.get(String(r.class_id))||{}; const d:any=dm.get(String(r.division_id||''))||{}; const s:any=sm.get(String(r.subject_id||''))||{}; const className=String(c.class_name||c.name||'Assigned Class'); const division=String(d.division_name||d.name||(r.division_id?'Assigned Division':'All')); const subjectName=String(s.subject_name||s.name||'Assigned Subject');
    result.push({id:`subject:${r.id}`,assignmentId:String(r.id),scopeType:'subject',academicYearId:String(r.academic_year_id||year?.id||''),academicYear:yearName,classId:String(r.class_id),className,divisionId:r.division_id?String(r.division_id):undefined,division,subjectId:String(r.subject_id),subjectName,label:`Subject · ${className}${division&&division!=='All'?` · ${division}`:' · No Division'} — ${subjectName}`,isClassTeacherScope:crows.some(x=>String(x.class_id)===String(r.class_id)&&(String(x.division_id||'')===String(r.division_id||'')||!x.division_id))}); }
  result.sort((a,b)=>a.className.localeCompare(b.className)||a.scopeType.localeCompare(b.scopeType)||(a.subjectName||'').localeCompare(b.subjectName||''));
  return { teacherId:String(teacher.id), academicYearId:String(year?.id||''), academicYear:yearName, scopes:result, channelReadiness, senderIdentity };
}

async function getScope(activeUser:TeacherCommunicationActiveUser, scopeId:string){ const data=await loadTeacherCommunicationScopes(activeUser); const scope=data.scopes.find(s=>s.id===scopeId); if(!scope) throw new Error('Selected Communication scope is not assigned to this Teacher.'); return {scope,data}; }

async function loadStudents(activeUser:TeacherCommunicationActiveUser, scope:TeacherCommunicationScope){
  if(!supabaseAdmin) throw new Error('Communication service is unavailable.');
  const [studentsRes, canonClasses, canonDivisions, legacyClasses, legacyDivisions]=await Promise.all([
    supabaseAdmin.from('students').select('*').eq('school_id',activeUser.schoolId).limit(10000),
    supabaseAdmin.from('school_classes').select('*').eq('school_id',activeUser.schoolId),
    supabaseAdmin.from('school_divisions').select('*').eq('school_id',activeUser.schoolId),
    supabaseAdmin.from('classes').select('*').eq('school_id',activeUser.schoolId),
    supabaseAdmin.from('divisions').select('*').eq('school_id',activeUser.schoolId)
  ]);
  if(studentsRes.error) throw studentsRes.error;
  const legacyClassMap=new Map((legacyClasses.error?[]:legacyClasses.data||[]).map((r:any)=>[String(r.id),r])); const legacyDivMap=new Map((legacyDivisions.error?[]:legacyDivisions.data||[]).map((r:any)=>[String(r.id),r]));
  const canonicalClass:any=(canonClasses.data||[]).find((r:any)=>String(r.id)===scope.classId)||{}; const canonicalDivision:any=scope.divisionId?(canonDivisions.data||[]).find((r:any)=>String(r.id)===scope.divisionId)||{}:{};
  const classLabel=norm(canonicalClass.class_name||canonicalClass.name||scope.className); const divLabel=norm(canonicalDivision.division_name||canonicalDivision.name||scope.division);
  const scoped=(studentsRes.data||[]).filter((st:any)=>{
    if(st.is_active===false||['inactive','left','deleted','archived','passed out','passout'].includes(norm(st.status))) return false;
    const rawClass=String(st.current_class_id||st.class_id||''); const legacyClass:any=legacyClassMap.get(rawClass)||{}; const stClass=norm(st.current_class_name||st.class_name||st.current_class||st.standard||legacyClass.class_name||legacyClass.name);
    if(rawClass!==scope.classId && (!stClass||stClass!==classLabel)) return false;
    if(!scope.divisionId) return true;
    const rawDiv=String(st.current_division_id||st.division_id||''); const legacyDiv:any=legacyDivMap.get(rawDiv)||{}; const stDiv=norm(st.current_division_name||st.division_name||st.division||st.section||legacyDiv.division_name||legacyDiv.name);
    return rawDiv===scope.divisionId || (!!stDiv && stDiv===divLabel);
  });
  const scopedStudentIds=scoped.map((r:any)=>String(r.id)).filter(Boolean);
  const parentByStudent=new Map<string,string>();
  if(scopedStudentIds.length){
    try{
      const [linkRequests,linkDecisions]=await Promise.all([
        supabaseAdmin.from('audit_logs').select('id,actor_user_id,entity_id').eq('school_id',activeUser.schoolId).in('action',['parent.account.signup.pending','parent.child.link.requested']).in('entity_id',scopedStudentIds).limit(5000),
        supabaseAdmin.from('audit_logs').select('action,metadata,created_at').eq('school_id',activeUser.schoolId).in('action',['parent.child.link.decided','parent.child.link.revoked']).order('created_at',{ascending:false}).limit(6000)
      ]);
      if(!linkRequests.error&&!linkDecisions.error){
        const latest=new Map<string,any>(); for(const d of linkDecisions.data||[]){const id=String(d.metadata?.request_id||'');if(id&&!latest.has(id))latest.set(id,d);}
        for(const r of linkRequests.data||[]){const d=latest.get(String(r.id));if(String(d?.action||'')==='parent.child.link.decided'&&String(d?.metadata?.decision||'').toLowerCase()==='approve'&&!parentByStudent.has(String(r.entity_id)))parentByStudent.set(String(r.entity_id),String(r.actor_user_id||''));}
      }
    }catch{/* parent website recipient remains optional; mobile/email guardian delivery still works */}
  }
  const studentUserIds=scoped.map((r:any)=>String(r.user_id||r.auth_user_id||'')).filter(Boolean);
  const parentUserIds=[...parentByStudent.values()].filter(Boolean);
  const userIds=[...new Set([...studentUserIds,...parentUserIds])];
  const [users,profiles]=await Promise.all([
    userIds.length?supabaseAdmin.from('users').select('id,email,phone_number,status,is_active,full_name').in('id',userIds):Promise.resolve({data:[],error:null} as any),
    studentUserIds.length?supabaseAdmin.from('user_profile_extensions').select('user_id,preferred_language').in('user_id',studentUserIds):Promise.resolve({data:[],error:null} as any)
  ]);
  const um=new Map((users.error?[]:users.data||[]).map((r:any)=>[String(r.id),r])); const pm=new Map((profiles.error?[]:profiles.data||[]).map((r:any)=>[String(r.user_id),r]));
  return scoped.map((st:any)=>{ const userId=String(st.user_id||st.auth_user_id||'')||undefined; const u:any=userId?um.get(userId):null; const p:any=userId?pm.get(userId):null; const parentUserId=parentByStudent.get(String(st.id))||undefined; const pu:any=parentUserId?um.get(parentUserId):null; return {
    studentId:String(st.id), studentUserId:userId, studentName:String(st.full_name||st.name_en||st.name||[st.first_name,st.middle_name,st.last_name].filter(Boolean).join(' ')||'Student'), grNumber:String(st.gr_number||'')||undefined,
    studentMobile:String(st.student_mobile||st.mobile_number||st.contact_number||u?.phone_number||'')||undefined, studentEmail:String(st.student_email||st.email||u?.email||'')||undefined,
    parentUserId, parentName:String(pu?.full_name||st.father_name||st.mother_name||st.guardian_name||st.parent_name||'')||undefined, parentMobile:String(st.parent_mobile||st.guardian_mobile||st.primary_contact_number||pu?.phone_number||'')||undefined, parentEmail:String(st.parent_email||st.guardian_email||pu?.email||'')||undefined,
    preferredLanguage:String(p?.preferred_language||'')||undefined, portalStatus:u?.is_active===true?'active':u?'inactive':'not_signed_up'
  }; }).sort((a:any,b:any)=>a.studentName.localeCompare(b.studentName));
}

export async function loadTeacherCommunicationRecipients(activeUser:TeacherCommunicationActiveUser, scopeId:string){ const {scope}=await getScope(activeUser,scopeId); return {scope,recipients:await loadStudents(activeUser,scope)}; }

export async function loadTeacherCommunicationHomework(activeUser:TeacherCommunicationActiveUser, scopeId:string){
  if(!supabaseAdmin) throw new Error('Communication service is unavailable.');
  const {scope,data}=await getScope(activeUser,scopeId);
  const records=await supabaseAdmin.from('edunixo_published_homework')
    .select('*')
    .eq('school_id',activeUser.schoolId)
    .eq('status','published')
    .order('updated_at',{ascending:false})
    .limit(500);
  if(records.error){ if(missingTable(records.error)) return {scope,items:[],backendReady:false,source:'canonical_homework_publications'}; throw records.error; }
  let publicationRows:any[] = records.data||[];
  if(!publicationRows.length){
    const legacy=await supabaseAdmin.from('edunixo_academic_records').select('id,assignment_id,owner_teacher_id,title,status,content,metadata,created_at,updated_at').eq('kind','homework').eq('status','published').order('updated_at',{ascending:false}).limit(500);
    if(!legacy.error){
      const ids=[...new Set((legacy.data||[]).map((r:any)=>String(r.assignment_id||'')).filter(Boolean))];
      const projections=ids.length?await supabaseAdmin.from('edunixo_teacher_assignments').select('*').in('id',ids):({data:[],error:null} as any);
      if(!projections.error){
        const am=new Map((projections.data||[]).map((r:any)=>[String(r.id),r]));
        const snapshots=(legacy.data||[]).map((r:any)=>({r,a:am.get(String(r.assignment_id)) as any})).filter(({a}:any)=>a&&String(a.school_id||'')===activeUser.schoolId).map(({r,a}:any)=>({
          source_record_id:String(r.id),school_id:activeUser.schoolId,academic_year_id:a.academic_year_id?String(a.academic_year_id):null,academic_year:String(a.academic_year||'')||null,
          teacher_record_id:a.teacher_record_id?String(a.teacher_record_id):null,teacher_user_id:r.owner_teacher_id||a.teacher_id||null,assignment_id:String(r.assignment_id||''),
          class_id:a.class_id?String(a.class_id):null,class_name:String(a.class_name||''),division_id:a.division_id?String(a.division_id):null,division_name:String(a.division||''),
          subject_id:a.subject_id?String(a.subject_id):null,subject_name:String(a.subject_name||''),title:String(r.title||'Homework'),content:String(r.content||''),
          homework_date:r.metadata?.structuredInputs?.date||null,due_date:r.metadata?.structuredInputs?.dueDate||null,status:'published',metadata:r.metadata||{},published_at:r.updated_at||r.created_at||new Date().toISOString(),created_at:r.created_at||new Date().toISOString(),updated_at:r.updated_at||new Date().toISOString()
        }));
        if(snapshots.length){
          const upsert=await supabaseAdmin.from('edunixo_published_homework').upsert(snapshots,{onConflict:'source_record_id'}).select('*');
          if(!upsert.error) publicationRows=upsert.data||snapshots;
        }
      }
    }
  }
  const filtered=publicationRows.filter((r:any)=>{
    const yearOk=!scope.academicYearId||!r.academic_year_id||String(r.academic_year_id)===String(scope.academicYearId)||norm(r.academic_year)===norm(scope.academicYear);
    if(!yearOk) return false;
    const classOk=String(r.class_id||'')===scope.classId||norm(r.class_name)===norm(scope.className);
    if(!classOk) return false;
    const divOk=!scope.divisionId||String(r.division_id||'')===scope.divisionId||norm(r.division_name)===norm(scope.division);
    if(!divOk) return false;
    if(scope.scopeType==='class_teacher') return true;
    const subjectOk=String(r.subject_id||'')===String(scope.subjectId||'')||norm(r.subject_name)===norm(scope.subjectName);
    const ownerOk=!r.teacher_record_id||String(r.teacher_record_id)===String(data.teacherId||'');
    return subjectOk&&ownerOk;
  });
  const sourceIds=[...new Set(filtered.map((r:any)=>String(r.source_record_id||'')).filter(Boolean))];
  const attachmentMap=new Map<string,any[]>();
  if(sourceIds.length){
    const ar=await supabaseAdmin.from('edunixo_academic_record_attachments').select('id,academic_record_id,file_name,storage_path,mime_type,size_bytes').in('academic_record_id',sourceIds);
    if(!ar.error){
      for(const row of ar.data||[]){
        let url:string|undefined;
        if(row.storage_path){const signed=await supabaseAdmin.storage.from('teacher-academic-attachments').createSignedUrl(String(row.storage_path),60*60*24*30);if(!signed.error)url=signed.data?.signedUrl||undefined;}
        const key=String(row.academic_record_id);const list=attachmentMap.get(key)||[];list.push({id:String(row.id),fileName:String(row.file_name||'Attachment'),mimeType:String(row.mime_type||'')||undefined,sizeBytes:row.size_bytes==null?undefined:Number(row.size_bytes),url});attachmentMap.set(key,list);
      }
    }
  }
  const items=filtered.map((r:any)=>({
    id:String(r.source_record_id||r.id),
    publicationId:String(r.id),
    assignmentId:String(r.assignment_id||scope.assignmentId),
    title:String(r.title||'Homework'),
    content:String(r.content||''),
    dueDate:String(r.due_date||r.metadata?.structuredInputs?.dueDate||'')||undefined,
    className:String(r.class_name||scope.className),
    division:String(r.division_name||scope.division||''),
    subjectName:String(r.subject_name||scope.subjectName||'Subject'),
    updatedAt:String(r.updated_at||'')||undefined,
    attachments:attachmentMap.get(String(r.source_record_id||''))||[]
  }));
  return {scope,items,backendReady:true,source:'canonical_homework_publications'};
}

export async function loadTeacherCommunicationHistory(activeUser:TeacherCommunicationActiveUser){
  if(!supabaseAdmin) throw new Error('Communication service is unavailable.'); const messages=await supabaseAdmin.from('edunixo_communication_messages').select('*').eq('school_id',activeUser.schoolId).eq('created_by',activeUser.userId).order('created_at',{ascending:false}).limit(100);
  if(messages.error){ if(missingTable(messages.error)) return {rows:[],backendReady:false}; throw messages.error; }
  const ids=(messages.data||[]).map((r:any)=>r.id); const deliveries=ids.length?await supabaseAdmin.from('edunixo_communication_deliveries').select('message_id,status').in('message_id',ids):({data:[],error:null} as any); const notifications=ids.length?await supabaseAdmin.from('edunixo_user_notifications').select('source_message_id,is_read').in('source_message_id',ids):({data:[],error:null} as any);
  const d=new Map<string,any>(); for(const r of deliveries.data||[]){const k=String(r.message_id);const v=d.get(k)||{queued:0,delivered:0,failed:0,skipped:0};const s=norm(r.status);if(['delivered','sent'].includes(s))v.delivered++;else if(s==='failed')v.failed++;else if(s==='skipped')v.skipped++;else v.queued++;d.set(k,v);} const n=new Map<string,any>(); for(const r of notifications.data||[]){const k=String(r.source_message_id||'');const v=n.get(k)||{sent:0,read:0};v.sent++;if(r.is_read)v.read++;n.set(k,v);}
  return {backendReady:true,rows:(messages.data||[]).map((r:any)=>{const dv=d.get(String(r.id))||{queued:0,delivered:0,failed:0,skipped:0};const nv=n.get(String(r.id))||{sent:0,read:0};return {id:String(r.id),title:String(r.title||''),body:String(r.body||''),messageType:String(r.message_type||''),className:String(r.class_name||'')||undefined,division:String(r.division_name||'')||undefined,subjectName:String(r.subject_name||'')||undefined,channels:Array.isArray(r.channels)?r.channels:[],recipientCount:Number(r.recipient_count||0),createdAt:String(r.created_at||''),queued:dv.queued,delivered:dv.delivered+nv.sent,read:nv.read,failed:dv.failed,skipped:dv.skipped,languageName:String(r.language_name||r.metadata?.languageName||'')||undefined,audience:String(r.audience_type||r.metadata?.audience||'')||undefined};})};
}

export async function sendTeacherCommunicationServer(activeUser:TeacherCommunicationActiveUser,input:any){
  if(!supabaseAdmin) throw new Error('Communication service is unavailable.'); const {scope,data}=await getScope(activeUser,String(input.scopeId||'')); const all=await loadStudents(activeUser,scope); const requested=Array.isArray(input.recipientStudentIds)?new Set(input.recipientStudentIds.map(String)):null; const recipients=requested?all.filter((r:any)=>requested.has(r.studentId)):all; if(!recipients.length) throw new Error('No assigned recipient is available for this Communication scope.');
  const title=String(input.title||'').trim().slice(0,300), body=String(input.body||'').trim().slice(0,12000); if(!title||!body) throw new Error('Title and message are required.'); const type=String(input.messageType||'announcement'); if(!['announcement','homework','direct'].includes(type)) throw new Error('Unsupported Communication type.');
  const audience=['students','parents','students_and_parents'].includes(String(input.audience))?String(input.audience):'students_and_parents'; const channels:string[]=[...new Set<string>((Array.isArray(input.channels)?input.channels:[]).map((v:any)=>String(v)))].filter((c:string)=>['website','whatsapp','sms','email'].includes(c)); if(!channels.length) throw new Error('Select at least one delivery channel.');
  if(type==='direct' && recipients.length!==1) throw new Error('Direct Parent / Student Communication must target exactly one assigned Student record.');
  if(type==='homework') { const homework=await loadTeacherCommunicationHomework(activeUser, scope.id); if(!String(input.sourceRecordId||'') || !homework.items.some((row:any)=>String(row.id)===String(input.sourceRecordId))) throw new Error('This published Homework is not available inside the selected Communication scope.'); }
  const readiness:any=data.channelReadiness; const unavailable=channels.filter(c=>!readiness[c]); if(unavailable.length) throw new Error(`${unavailable.join(', ')} is not configured for this school/server yet.`);
  const payload:any={school_id:activeUser.schoolId,academic_year_id:scope.academicYearId||null,academic_year:scope.academicYear||null,created_by:activeUser.userId,created_by_teacher_record_id:data.teacherId,created_by_name:String(input.teacherName||'Teacher'),system_generated:false,message_type:type,class_id:scope.classId,class_name:scope.className,division_id:scope.divisionId||null,division_name:scope.division||'',subject_id:scope.subjectId||null,subject_name:scope.subjectName||'',title,body,channels,recipient_count:recipients.length,audience_type:audience,language_code:String(input.languageCode||'en'),language_name:String(input.languageName||'English'),priority:['low','normal','high','urgent'].includes(String(input.priority))?String(input.priority):'normal',source_record_id:input.sourceRecordId||null,status:'queued',metadata:{scopeId:scope.id,scopeType:scope.scopeType,audience,languageCode:String(input.languageCode||'en'),senderIdentity:data.senderIdentity||null}};
  const created=await supabaseAdmin.from('edunixo_communication_messages').insert(payload).select('id').single(); if(created.error){if(missingTable(created.error)) throw new Error('Communication cloud schema is not installed yet. Run EDUNIXO_R23_TEACHER_COMMUNICATION_SETUP.sql once.');throw created.error;} const messageId=String(created.data.id);
  const recipientRows:any[]=[]; for(const r of recipients as any[]){if(audience!=='parents')recipientRows.push({message_id:messageId,school_id:activeUser.schoolId,recipient_student_id:r.studentId,recipient_user_id:r.studentUserId||null,recipient_name:r.studentName,recipient_mobile:r.studentMobile||null,recipient_email:r.studentEmail||null,audience_kind:'student',preferred_language:r.preferredLanguage||null}); if(audience!=='students')recipientRows.push({message_id:messageId,school_id:activeUser.schoolId,recipient_student_id:r.studentId,recipient_user_id:r.parentUserId||null,recipient_name:r.parentName||`Parent/Guardian of ${r.studentName}`,recipient_mobile:r.parentMobile||null,recipient_email:r.parentEmail||null,audience_kind:'parent_guardian',preferred_language:r.preferredLanguage||null});}
  if(recipientRows.length){const rr=await supabaseAdmin.from('edunixo_communication_recipients').insert(recipientRows);if(rr.error)throw rr.error;}
  let websiteCreated=0; if(channels.includes('website')){const rows=recipientRows.filter(r=>r.recipient_user_id&&(r.audience_kind==='student'||r.audience_kind==='parent_guardian')).map(r=>({school_id:activeUser.schoolId,recipient_user_id:r.recipient_user_id,recipient_student_id:r.recipient_student_id,title,body,notification_type:type,source_message_id:messageId,source_key:`teacher-communication:${messageId}:${r.recipient_user_id}`,is_read:false,created_at:new Date().toISOString()}));if(rows.length){const nr=await supabaseAdmin.from('edunixo_user_notifications').insert(rows);if(nr.error)throw nr.error;websiteCreated=rows.length;}}
  const external:any[]=[]; const seenDestination=new Set<string>(); for(const r of recipientRows){for(const c of channels.filter(x=>x!=='website')){const dest=c==='email'?r.recipient_email:r.recipient_mobile; const dedupeKey=dest?`${c}:${String(dest).trim().toLowerCase()}`:''; if(dedupeKey&&seenDestination.has(dedupeKey)) continue; if(dedupeKey) seenDestination.add(dedupeKey); external.push({message_id:messageId,school_id:activeUser.schoolId,recipient_student_id:r.recipient_student_id,recipient_user_id:r.recipient_user_id,recipient_name:r.recipient_name,channel:c,destination:dest||'',status:dest?'queued':'skipped',last_error:dest?null:`No ${c==='email'?'email':'mobile number'} is stored for this ${r.audience_kind==='student'?'Student':'Parent/Guardian'}.`,audience_kind:r.audience_kind});}}
  if(external.length){const er=await supabaseAdmin.from('edunixo_communication_deliveries').insert(external);if(er.error)throw er.error;}
  const queued=external.filter(r=>r.status==='queued').length; let dispatchWarning:string|undefined; if(queued){try{const invoke=await supabaseAdmin.functions.invoke('communication-dispatch',{body:{messageId}});if(invoke.error)dispatchWarning='External delivery is queued but the Communication Dispatcher could not be invoked.';}catch{dispatchWarning='External delivery is queued but the Communication Dispatcher could not be invoked.';}}
  await supabaseAdmin.from('edunixo_communication_messages').update({status:queued?'queued':'completed',updated_at:new Date().toISOString()}).eq('id',messageId);
  return {messageId,recipientCount:recipientRows.length,studentCount:recipients.length,websiteCreated,externalQueued:queued,externalSkipped:external.filter(r=>r.status==='skipped').length,dispatchWarning};
}
