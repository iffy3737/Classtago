import type {
  GenerationRequest,
  GenerationResult,
  HomeworkAttachment,
  QuestionPaperDraft,
  QuestionPaperQuestion,
  QuestionPaperExam,
  QuestionPatternRow,
  CombinedSubjectGroup,
  SavedAcademicRecord,
  StudyMaterial,
  TeacherAssignment,
  YearPlanSubjectDraft,
} from '../types/domain';
import { requireSupabase } from './supabase';

async function academicAuthToken() {
  const db = requireSupabase();
  const { data, error } = await db.auth.getSession();
  if (error || !data.session?.access_token) throw new Error('Your Teacher session expired. Sign in again.');
  return data.session.access_token;
}

async function academicApiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const token = await academicAuthToken();
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  if (!contentType.includes('application/json')) {
    await response.text().catch(() => '');
    if (response.ok) {
      throw new Error('The updated Classtago upload service is not active in this Preview yet. Restart Preview once, then try Upload Textbook again.');
    }
    throw new Error(`Teacher Academic request failed (${response.status}).`);
  }
  const payload = await response.json().catch(() => null);
  if (!payload || typeof payload !== 'object') {
    throw new Error('The Classtago upload service returned an invalid response. Restart Preview once and try again.');
  }
  if (!response.ok) throw new Error((payload as any)?.error || `Teacher Academic request failed (${response.status}).`);
  return payload as T;
}

const academicClientWait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const isAcademicTransientClientError = (error: unknown) => /failed to fetch|fetch failed|network|temporar|busy|high demand|unavailable|429|502|503|504|timeout|timed out/i.test(String((error as any)?.message || error || ''));

async function academicApiJsonWithRetry<T>(url: string, init?: RequestInit, maxAttempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try { return await academicApiJson<T>(url, init); }
    catch (error) {
      lastError = error;
      if (!isAcademicTransientClientError(error) || attempt >= maxAttempts) throw error;
      await academicClientWait(Math.min(3000, 650 * (2 ** (attempt - 1))) + Math.floor(Math.random() * 250));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Teacher Academic request could not be completed.');
}


type AcademicUploadProgress = (percent: number, stage: 'uploading' | 'finalizing' | 'indexing') => void;
function putPresignedPart(url:string,blob:Blob,onProgress:(loaded:number)=>void):Promise<string>{return new Promise((resolve,reject)=>{const xhr=new XMLHttpRequest();xhr.open('PUT',url,true);xhr.upload.onprogress=e=>onProgress(e.lengthComputable?e.loaded:0);xhr.onerror=()=>reject(new Error('Network interrupted while uploading this Textbook part.'));xhr.onabort=()=>reject(new Error('Textbook upload was cancelled.'));xhr.onload=()=>{if(xhr.status<200||xhr.status>=300)return reject(new Error(`Textbook part upload failed (${xhr.status}).`));const etag=String(xhr.getResponseHeader('ETag')||xhr.getResponseHeader('etag')||'').trim();if(!etag)return reject(new Error('School large-file storage did not expose the upload ETag. Check the bucket CORS setup once.'));resolve(etag);};xhr.send(blob);});}
async function putPartWithRetry(url:string,blob:Blob,onProgress:(loaded:number)=>void){let last:unknown;for(let attempt=0;attempt<4;attempt+=1){try{return await putPresignedPart(url,blob,onProgress);}catch(e){last=e;onProgress(0);if(attempt<3)await new Promise(r=>setTimeout(r,700*(attempt+1)));}}throw last instanceof Error?last:new Error('Textbook upload failed after automatic retries.');}
async function uploadTextbookToLargeStorage(file:File,assignmentId:string,onProgress?:AcademicUploadProgress):Promise<string>{const status=await academicApiJson<any>('/api/teacher/academic/r2/status');if(String(status?.buildId||'')!=='R32.6')throw new Error('The updated Classtago upload service is not active in this Preview yet. Restart Preview once, then try Upload Textbook again.');if(!status?.ready)throw new Error('School large-file storage is not configured yet. Complete the one-time Cloudflare R2 setup in Classtago server settings.');const maxBytes=Number(status?.maxTextbookBytes||0);if(maxBytes>0&&file.size>maxBytes)throw new Error(`This Textbook is too large for AI processing. Maximum supported PDF size is ${(maxBytes/(1024*1024*1024)).toFixed(0)} GB.`);const init=await academicApiJson<any>('/api/teacher/academic/r2/multipart/init',{method:'POST',body:JSON.stringify({assignmentId,fileName:file.name,fileSize:file.size,contentType:file.type||'application/pdf'})});const uploadId=String(init?.uploadId||''),key=String(init?.key||''),partSize=Number(init?.partSize||0),parts=Array.isArray(init?.parts)?init.parts:[];if(String(init?.buildId||'')!=='R32.6')throw new Error('The Classtago upload service version does not match this Preview. Restart Preview once and try again.');if(!uploadId||!key||!partSize||!parts.length)throw new Error('The secure upload session could not be prepared completely. Retry once; if it repeats, check the R2 setup status.');for(const part of parts){if(!Number(part?.partNumber)||!String(part?.url||'').startsWith('https://'))throw new Error('The secure upload session returned an invalid part URL. Check the R2 setup once.');}const loaded=new Map<number,number>();const update=(n:number,v:number)=>{loaded.set(n,v);const total=[...loaded.values()].reduce((a,b)=>a+b,0);onProgress?.(Math.max(1,Math.min(99,Math.floor(total/file.size*100))),'uploading');};try{const completed:Array<{partNumber:number;etag:string}>=[];let next=0;const worker=async()=>{while(true){const i=next++;if(i>=parts.length)return;const part=parts[i],n=Number(part.partNumber||i+1),start=(n-1)*partSize,end=Math.min(file.size,start+partSize),blob=file.slice(start,end);const etag=await putPartWithRetry(String(part.url),blob,v=>update(n,v));update(n,blob.size);completed.push({partNumber:n,etag});}};await Promise.all(Array.from({length:Math.min(3,parts.length)},()=>worker()));onProgress?.(99,'finalizing');const done=await academicApiJson<any>('/api/teacher/academic/r2/multipart/complete',{method:'POST',body:JSON.stringify({key,uploadId,parts:completed})});if(!done?.storagePath)throw new Error('Large-file upload completed without a storage reference.');onProgress?.(100,'finalizing');return String(done.storagePath);}catch(e){try{await academicApiJson('/api/teacher/academic/r2/multipart/abort',{method:'POST',body:JSON.stringify({key,uploadId})});}catch{}throw e;}}

export async function listCanonicalAcademicAssignments(): Promise<TeacherAssignment[]> {
  const payload = await academicApiJson<any>('/api/teacher/academic/scopes');
  const rows = Array.isArray(payload.assignments) ? payload.assignments : [];
  return rows as TeacherAssignment[];
}

export async function listMyAssignments(): Promise<TeacherAssignment[]> {
  const db = requireSupabase();
  const { data, error } = await db
    .from('edunixo_teacher_assignments')
    .select('*')
    .eq('active', true)
    .order('class_name')
    .order('division');
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    teacherId: row.teacher_id,
    schoolId: row.school_id,
    schoolName: row.school_name,
    schoolCode: row.school_code ?? undefined,
    academicYear: row.academic_year,
    className: row.class_name,
    division: row.division,
    subjectId: row.subject_id,
    subjectName: row.subject_name,
    subjectCode: row.subject_code ?? undefined,
    medium: row.medium,
    isClassTeacher: row.is_class_teacher,
  }));
}

export async function listStudyMaterials(_assignmentId?: string): Promise<StudyMaterial[]> {
  const payload = await academicApiJson<any>('/api/teacher/academic/materials');
  if (payload.backendReady === false) throw new Error(payload.error || 'Teacher Academic Core is not installed yet. Run the R27 Academic Core setup once.');
  return (Array.isArray(payload.materials) ? payload.materials : []) as StudyMaterial[];
}

export async function createStudyMaterial(input: { assignmentId:string; additionalAssignmentIds?:string[]; title:string; kind:StudyMaterial['kind']; category:StudyMaterial['category']; chapter?:string; unit?:string; sourceUrl?:string; file?:File; notesContent?:string; onUploadProgress?:AcademicUploadProgress; }): Promise<{ id:string; ids?:string[]; indexingStatus:'ready'|'stored'|'failed'; warning?:string }> {
  const db=requireSupabase();const {data:userData,error:userError}=await db.auth.getUser();if(userError||!userData.user)throw userError??new Error('Authentication required.');
  const scopes=await academicApiJson<any>('/api/teacher/academic/scopes');const assignment=(Array.isArray(scopes.assignments)?scopes.assignments:[]).find((row:any)=>String(row.id)===input.assignmentId);if(!assignment)throw new Error('Selected Class / Division / Subject is not assigned to this Teacher.');
  let storagePath:string|undefined;let r2Stored=false;
  if(input.file){const isTextbookPdf=input.category==='textbook'&&(input.file.type==='application/pdf'||input.file.name.toLowerCase().endsWith('.pdf'));if(input.category==='textbook'&&!isTextbookPdf)throw new Error('Textbook upload accepts PDF files only.');
    if(isTextbookPdf){try{storagePath=await uploadTextbookToLargeStorage(input.file,input.assignmentId,input.onUploadProgress);r2Stored=true;}catch(e){const message=e instanceof Error?e.message:String(e||'');if(input.file.size>49*1024*1024||!/not configured|unavailable/i.test(message))throw e;}}
    if(!storagePath){const safeName=input.file.name.replace(/[^a-zA-Z0-9._-]+/g,'_').slice(-120)||'material';storagePath=`${assignment.schoolId}/${userData.user.id}/${crypto.randomUUID()}-${safeName}`;const {error:uploadError}=await db.storage.from('teacher-study-materials').upload(storagePath,input.file,{upsert:false});if(uploadError){const raw=String((uploadError as any)?.message||uploadError||'');if(/maximum allowed size|entity too large|entitytoolarge|too large/i.test(raw))throw new Error('This file is too large for legacy school storage. The Classtago large-file storage must be configured by the administrator.');throw uploadError;}input.onUploadProgress?.(100,'finalizing');}}
  try{const created=await academicApiJson<any>('/api/teacher/academic/materials',{method:'POST',body:JSON.stringify({assignmentId:input.assignmentId,additionalAssignmentIds:input.additionalAssignmentIds||[],title:input.title,kind:input.kind,category: input.category,chapter:input.chapter||null,unit:input.unit||null,sourceUrl:input.sourceUrl||null,storagePath:storagePath||null})});if(!created?.id)throw new Error('Study Material save did not return an ID.');if(input.category==='video')return{id:String(created.id),ids:Array.isArray(created.ids)?created.ids.map(String):undefined,indexingStatus:'stored'};// R31 safety retained: temporary indexing failure never deletes an already-uploaded Textbook.
    try{
      input.onUploadProgress?.(100,'indexing');
      const createdIds=[...new Set([String(created.id),...(Array.isArray(created.ids)?created.ids.map(String):[])].filter(Boolean))];
      let allReady=true;
      for(const materialId of createdIds){const indexed=await indexStudyMaterial(materialId);if(indexed?.status!=='ready')allReady=false;}
      return{id:String(created.id),ids:createdIds,indexingStatus:allReady?'ready':'stored'};
    }catch(e){return{id:String(created.id),ids:Array.isArray(created.ids)?created.ids.map(String):undefined,indexingStatus:'failed',warning:e instanceof Error?e.message:'Textbook chapter preparation needs attention.'};}}
  catch(e){if(storagePath&&!r2Stored&&!storagePath.startsWith('r2:')){try{await db.storage.from('teacher-study-materials').remove([storagePath]);}catch{}}throw e;}
}

export async function getTeacherAcademicAiStatus(): Promise<{ buildId: string; featureBuild?: string; ready: boolean; provider?: string; plan?: string; freeTierOnly?: boolean; indexModel?: string; generationModel?: string; chapterMode?: string; fastExternalPdfMaxBytes?: number }> {
  return academicApiJson('/api/teacher/academic/ai/status', { cache: 'no-store' });
}

export async function indexStudyMaterial(materialId: string): Promise<{ status: string; chapters?: string[] }> {
  // R32.9: chapter preparation is idempotent for one material, so browser/Preview
  // transport hiccups can be retried automatically without asking the Teacher
  // to tap Retry several times. Server-side Gemini backoff remains authoritative.
  return academicApiJsonWithRetry(`/api/teacher/academic/materials/${encodeURIComponent(materialId)}/index`, { method: 'POST' }, 2);
}


export async function getStudyMaterialPreview(material: StudyMaterial): Promise<{ url?: string; text?: string }> {
  const db = requireSupabase();
  if (material.kind === 'link' && material.sourceUrl) return { url: material.sourceUrl };
  if (material.storagePath) {
    if (material.storagePath.startsWith('r2:')) { const payload=await academicApiJson<any>(`/api/teacher/academic/materials/${encodeURIComponent(material.id)}/preview-url`); return { url:String(payload?.url||'')||undefined }; }
    const { data, error } = await db.storage.from('teacher-study-materials').createSignedUrl(material.storagePath, 300);
    if (error) throw error;
    return { url: data.signedUrl };
  }
  const { data, error } = await db.from('edunixo_study_material_segments').select('content').eq('material_id', material.id).order('segment_no').limit(5);
  if (error) throw error;
  return { text: (data ?? []).map((x) => x.content).join('\n\n') };
}


export async function updateStudyMaterial(materialId: string, changes: Partial<Pick<StudyMaterial, 'title' | 'chapter' | 'unit' | 'publishedToStudents' | 'archived'>>): Promise<void> {
  await academicApiJson(`/api/teacher/academic/materials/${encodeURIComponent(materialId)}`, {
    method: 'PATCH',
    body: JSON.stringify(changes),
  });
}

export async function deleteStudyMaterial(materialId: string): Promise<{ success: boolean; warning?: string }> {
  return academicApiJson(`/api/teacher/academic/materials/${encodeURIComponent(materialId)}`, { method: 'DELETE' });
}


export async function listStudyMaterialChapters(materialIds: string[]): Promise<string[]> {
  if (!materialIds.length) return [];
  const payload = await academicApiJson<any>(`/api/teacher/academic/material-chapters?ids=${encodeURIComponent(materialIds.join(','))}`);
  return Array.isArray(payload.chapters) ? payload.chapters.map(String) : [];
}

export async function prepareHomeworkTextbookSource(materialIds: string[]): Promise<void> {
  if (!materialIds.length) return;
  await academicApiJson('/api/teacher/academic/homework/prepare-source', {
    method: 'POST',
    body: JSON.stringify({ materialIds }),
    cache: 'no-store',
  });
}

async function getHomeworkTextbookSourceStatus(materialIds: string[]): Promise<any> {
  if (!materialIds.length) return { ready: true, status: 'ready' };
  return academicApiJson(`/api/teacher/academic/homework/source-status?ids=${encodeURIComponent(materialIds.join(','))}`, { cache: 'no-store' });
}

async function waitForHomeworkTextbookSource(materialIds: string[], maxWaitMs = 210000): Promise<void> {
  if (!materialIds.length) return;
  await prepareHomeworkTextbookSource(materialIds);
  const started = Date.now();
  while (Date.now() - started < maxWaitMs) {
    const status = await getHomeworkTextbookSourceStatus(materialIds);
    if (String(status?.featureBuild || '') !== 'R33.6') throw new Error('Classtago Preview server and Homework page are on different builds. Restart Preview once after importing R33.6.');
    if (status?.ready) return;
    if (status?.status === 'failed' || status?.error) throw new Error(String(status?.error || 'Textbook AI preparation failed.'));
    await academicClientWait(900);
  }
  throw new Error('This Textbook is still being prepared for AI Homework. Keep Preview open and press Generate once more in a moment; the original Textbook remains safely stored.');
}

export async function generateYearPlanSubject(input: { assignmentId: string; materialIds: string[] }): Promise<YearPlanSubjectDraft> {
  if (!input.assignmentId) throw new Error('Select an assigned Class / Subject.');
  if (!input.materialIds.length) throw new Error('Textbook is not AI-ready for this Subject.');
  const aiStatus = await getTeacherAcademicAiStatus();
  if (!aiStatus?.ready) throw new Error('School Gemini Free Tier service is not ready in this Preview.');
  await waitForHomeworkTextbookSource(input.materialIds);
  const token = await academicAuthToken();
  let lastPayload: any = {};
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const response = await fetch('/api/teacher/academic/generate-year-plan-r33-8', { method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`}, body:JSON.stringify(input), cache:'no-store' });
    const contentType=String(response.headers.get('content-type')||'').toLowerCase();
    if(!contentType.includes('application/json')){await response.text().catch(()=> '');throw new Error('The R33.8 Year Plan server is not active in this Preview. Restart Preview once after importing the cumulative ZIP.');}
    const payload:any=await response.json().catch(()=>({})); lastPayload=payload;
    const build=String(response.headers.get('x-edunixo-year-plan-build')||payload?.engineBuild||'').trim();
    if(build!=='R33.8')throw new Error('The Year Plan page and Preview server are on different builds. Restart Preview once.');
    if(response.ok)return payload as YearPlanSubjectDraft;
    if(response.status===425&&attempt<2){await waitForHomeworkTextbookSource(input.materialIds);continue;}
    throw new Error(payload?.error||`Year Plan generation failed (${response.status}).`);
  }
  throw new Error(lastPayload?.error||'Year Plan generation could not be completed.');
}

export async function generateAcademicContent(request: GenerationRequest): Promise<GenerationResult> {
  if (!['homework','teaching-diary-assist'].includes(request.taskType) && !request.materialIds.length) throw new Error('Textbook source is required for this academic AI task.');
  const db = requireSupabase();

  // R26: Homework uses the application server first. This keeps Google AI Studio
  // deployments simple because the same server-side Gemini secret used by Classtago
  // can generate Homework without requiring a separately deployed Edge Function.
  // Other academic generators retain the existing Edge Function path.
  if (request.taskType === 'homework') {
    const { data: sessionData, error: sessionError } = await db.auth.getSession();
    if (sessionError || !sessionData.session?.access_token) throw sessionError ?? new Error('Your Teacher session expired. Sign in again.');

    // R33.6 transport + source readiness contract. AI Studio can hot-reload
    // the browser independently of the Node server, so every Homework call verifies
    // both the status body and the build-specific response header. Non-JSON SPA/proxy
    // responses are never misreported as an empty Gemini answer.
    const aiStatus = await getTeacherAcademicAiStatus();
    if (String(aiStatus?.featureBuild || '') !== 'R33.6') {
      throw new Error('Classtago Preview server and Homework page are on different builds. Restart Preview once after importing R33.6, then Generate Homework again.');
    }
    if (!aiStatus?.ready) throw new Error('School Gemini Free Tier service is not ready in this Preview. Check the existing GEMINI_API_KEY secret, restart Preview, then retry.');

    // R33.40: source preparation stays proactive, but Generate no longer waits
    // for the full provider-file cache before calling the server. The server can
    // immediately use persistent chapter-level File Search when it is ready.
    if (request.materialIds.length) void prepareHomeworkTextbookSource(request.materialIds).catch(() => undefined);

    let response: Response | null = null;
    let payload: any = {};
    let lastTransportError: unknown = null;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        response = await fetch('/api/teacher/academic/generate-homework-r33-6', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData.session.access_token}` },
          body: JSON.stringify(request),
          cache: 'no-store',
        });
        const contentType = String(response.headers.get('content-type') || '').toLowerCase();
        const buildHeader = String(response.headers.get('x-edunixo-ai-build') || '').trim();
        if (!contentType.includes('application/json')) {
          await response.text().catch(() => '');
          throw new Error('The Homework request reached an old Preview/proxy response instead of the R33.6 AI server. Restart Preview once, then Generate again.');
        }
        payload = await response.json().catch(() => null);
        if (!payload || typeof payload !== 'object') throw new Error('The R33.6 Homework server returned an invalid transport response. Restart Preview once, then Generate again.');
        const engineBuild = String(payload?.engineBuild || payload?.featureBuild || '').trim();
        // Some Preview proxies may omit custom response headers. Accept the build
        // only when either the header OR the JSON body proves it is R33.6.
        if ((buildHeader && buildHeader !== 'R33.6') || (engineBuild && engineBuild !== 'R33.6') || (!buildHeader && !engineBuild)) {
          throw new Error('The Homework response did not come from the R33.6 AI server. Restart Preview once after importing the cumulative ZIP.');
        }
        if (response.ok) {
          const content = String(payload?.content ?? payload?.text ?? payload?.result?.content ?? payload?.data?.content ?? '').trim();
          if (!content) throw new Error('The R33.6 server completed without Homework text. Classtago did not save a blank result; this response was rejected safely.');
          return { ...payload, content } as GenerationResult;
        }

        if (response.status === 425 && payload?.sourcePreparing && attempt < 2) {
          await waitForHomeworkTextbookSource(request.materialIds);
          continue;
        }

        // Provider retry/fallback belongs to the server. Browser retry is only for
        // gateway failures where the request may not have reached Node at all.
        if (attempt < 2 && [502, 504].includes(response.status)) {
          await academicClientWait(350 + Math.floor(Math.random() * 120));
          continue;
        }
        break;
      } catch (error) {
        lastTransportError = error;
        if (attempt >= 2 || !isAcademicTransientClientError(error)) throw error;
        await academicClientWait(450 + Math.floor(Math.random() * 180));
      }
    }
    if (!response && lastTransportError) throw lastTransportError;
    if (response?.status === 404) throw new Error('The R33.6 Homework server is not active yet. Restart Preview once after importing the cumulative R33.6 ZIP, then Generate Homework again.');
    if (response) throw new Error(payload?.error || `Homework generation failed (${response.status}).`);
  }

  if (['daily-teaching-plan','lesson-plan','teaching-diary-assist','classwork-assignment'].includes(request.taskType)) {
    const { data: sessionData, error: sessionError } = await db.auth.getSession();
    if (sessionError || !sessionData.session?.access_token) throw sessionError ?? new Error('Your Teacher session expired. Sign in again.');
    if (request.taskType !== 'teaching-diary-assist' && request.materialIds.length) await waitForHomeworkTextbookSource(request.materialIds);
    let response: Response | null = null;
    let payload: any = {};
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      response = await fetch('/api/teacher/academic/generate-planning-r33-8', {
        method:'POST',
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${sessionData.session.access_token}`},
        body:JSON.stringify(request),
        cache:'no-store',
      });
      const contentType=String(response.headers.get('content-type')||'').toLowerCase();
      const build=String(response.headers.get('x-edunixo-academic-build')||'').trim();
      if(!contentType.includes('application/json')){await response.text().catch(()=> '');throw new Error('The academic request reached an old Preview/proxy response. Restart Preview once after importing R33.8.');}
      payload=await response.json().catch(()=>null);
      if(!payload||typeof payload!=='object')throw new Error('The R33.8 academic server returned an invalid response.');
      const engineBuild=String(payload?.engineBuild||'').trim();
      if((build&&build!=='R33.8')||(engineBuild&&engineBuild!=='R33.8')||(!build&&!engineBuild))throw new Error('The academic response did not come from the R33.8 server. Restart Preview once.');
      if(response.ok){const content=String(payload?.content||'').trim();if(!content)throw new Error('R33.8 completed without academic draft text; blank output was rejected safely.');return {...payload,content} as GenerationResult;}
      if(response.status===425&&payload?.sourcePreparing&&attempt<2){if(request.materialIds.length)await waitForHomeworkTextbookSource(request.materialIds);continue;}
      break;
    }
    if(response)throw new Error(payload?.error||`Academic generation failed (${response.status}).`);
  }

  const { data, error } = await db.functions.invoke('teacher-ai-generate', { body: request });
  if (error) throw error;
  return data as GenerationResult;
}

export async function saveHomeworkAcademicRecord(input: {
  assignmentId: string;
  id?: string;
  title: string;
  status: 'draft' | 'published';
  content: string;
  metadata: Record<string, unknown>;
  copyTargetAssignmentId?: string;
}): Promise<{ id: string; copyId?: string }> {
  const db = requireSupabase();
  const { data: sessionData, error: sessionError } = await db.auth.getSession();
  if (sessionError || !sessionData.session?.access_token) throw sessionError ?? new Error('Your Teacher session expired. Sign in again.');
  const response = await fetch('/api/teacher/academic/save-homework', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData.session.access_token}` },
    body: JSON.stringify(input),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || `Homework save failed (${response.status}).`);
  return { id: String(payload.id), copyId: payload.copyId ? String(payload.copyId) : undefined };
}

export async function saveAcademicRecord(record: Omit<SavedAcademicRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<string> {
  if (record.kind === 'homework') throw new Error('Homework must use the dedicated Homework save flow.');
  const payload = await academicApiJson<any>('/api/teacher/academic/records/save', {
    method: 'POST',
    body: JSON.stringify(record),
    cache: 'no-store',
  });
  if (!payload?.id) throw new Error('Academic save did not return a record ID.');
  return String(payload.id);
}

export async function saveQuestionPaper(paper: QuestionPaperDraft): Promise<string> {
  if (paper.reviewStatus === 'ai_draft') throw new Error('Teacher review is required before Save/Print.');
  // R33.19: Combined Subject papers are generated from canonical school_*
  // assignments, while the historical Question Paper tables still reference the
  // legacy Classtago projection. The server resolves that bridge safely so Clerk
  // collaboration works without asking the school to run another SQL migration.
  if (paper.combinedMeta) {
    const payload = await academicApiJson<any>('/api/teacher/academic/save-combined-question-paper-r33-19', {
      method: 'POST',
      body: JSON.stringify({ paper }),
      cache: 'no-store',
    });
    if (!payload?.id) throw new Error('Combined Question Paper save did not return a document ID.');
    return String(payload.id);
  }
  const db = requireSupabase();
  const { data, error } = await db.rpc('edunixo_save_question_paper', {
    p_supersedes_paper_id: paper.id ?? null,
    p_assignment_id: paper.assignmentId,
    p_exam: paper.exam,
    p_material_ids: paper.materialIds,
    p_chapters: paper.chapters,
    p_total_marks: paper.totalMarks,
    p_duration_minutes: paper.durationMinutes,
    p_medium: paper.medium,
    p_title: paper.title,
    p_instructions: paper.instructions,
    p_pattern: paper.pattern,
    p_questions: paper.questions.map((q) => ({
      text: q.text,
      marks: q.marks,
      type: q.type,
      sectionIndex: q.sectionIndex,
      orderNo: q.orderNo,
      sourceKind: q.sourceKind,
      answerLayout: q.answerLayout,
      answerLines: q.answerLines,
      options: q.options ?? [],
      matchLeft: q.matchLeft ?? [],
      matchRight: q.matchRight ?? [],
      modelAnswer: q.modelAnswer ?? '',
      internalSources: (q.internalSources || []).map((source, index) => index === 0 ? {
        ...source,
        __edunixoQuestion: {
          sectionIndex: q.sectionIndex, sourceKind: q.sourceKind, answerLayout: q.answerLayout, answerLines: q.answerLines,
          options: q.options ?? [], matchLeft: q.matchLeft ?? [], matchRight: q.matchRight ?? [], modelAnswer: q.modelAnswer ?? '',
        },
        ...(q.modelAnswer ? { modelAnswer: q.modelAnswer } : {}),
      } : source),
    })),
  });
  if (error) throw error;
  if (!data) throw new Error('Question Paper save did not return a document ID.');
  return String(data);
}

export async function listCombinedSubjectGroups(input: { assignmentId: string; exam?: QuestionPaperExam }): Promise<CombinedSubjectGroup[]> {
  if (!input.assignmentId) return [];
  const query = new URLSearchParams({ assignmentId: input.assignmentId });
  if (input.exam) query.set('exam', input.exam);
  const payload = await academicApiJson<any>(`/api/teacher/academic/combined-subject-groups-r33-19?${query.toString()}`, { cache: 'no-store' });
  return Array.isArray(payload?.groups) ? payload.groups as CombinedSubjectGroup[] : [];
}

export async function getQuestionPaperPatternPreview(input: { assignmentId: string; exam: QuestionPaperExam }): Promise<{ available: boolean; title?: string; pattern: QuestionPatternRow[]; totalMarks: number }> {
  if (!input.assignmentId || !input.exam) return { available:false, pattern:[], totalMarks:0 };
  const token=await academicAuthToken();
  const patternPath=`/api/teacher/academic/question-paper-pattern-r33-10?assignmentId=${encodeURIComponent(input.assignmentId)}&exam=${encodeURIComponent(input.exam)}`;
  let response=await fetch(patternPath,{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});
  let contentType=String(response.headers.get('content-type')||'').toLowerCase();
  if(!contentType.includes('application/json')){
    await response.text().catch(()=> '');
    response=await fetch(`${patternPath}&edunixo_preview_retry=${Date.now()}`,{headers:{Authorization:`Bearer ${token}`,'X-EDUNIXO-Preview-Retry':'R33.22.1'},cache:'no-store'});
    contentType=String(response.headers.get('content-type')||'').toLowerCase();
  }
  const build=String(response.headers.get('x-edunixo-question-paper-build')||'').trim();
  if(!contentType.includes('application/json')){await response.text().catch(()=> '');throw new Error('The R33.10 Question Paper Pattern service is still not active after a fresh Preview retry. Restart Preview once.');}
  const payload:any=await response.json().catch(()=>null);if(!payload||typeof payload!=='object')throw new Error('The R33.10 Question Paper Pattern service returned an invalid response.');
  const engineBuild=String(payload?.engineBuild||'').trim();if((build&&build!=='R33.10')||(engineBuild&&engineBuild!=='R33.10')||(!build&&!engineBuild))throw new Error('The Question Paper page and Preview server are on different builds. Restart Preview once.');
  if(!response.ok)throw new Error(payload?.error||`Question Paper Pattern request failed (${response.status}).`);
  return {
    available: Boolean(payload?.available),
    title: payload?.title ? String(payload.title) : undefined,
    pattern: Array.isArray(payload?.pattern) ? payload.pattern.map((row:any)=>({ type:String(row?.type||'Other'), count:Number(row?.count||0), marksEach:Number(row?.marksEach||0) })) : [],
    totalMarks: Math.max(0, Number(payload?.totalMarks||0)),
  };
}


async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function generateQuestionPaperDraft(request: GenerationRequest & { taskType: 'question-paper' }): Promise<QuestionPaperDraft> {
  if (!request.assignmentId) throw new Error('Select an assigned Class / Division / Subject.');
  const aiStatus = await getTeacherAcademicAiStatus();
  if (!aiStatus?.ready) throw new Error('School Gemini Free Tier service is not ready in this Preview.');
  if (request.materialIds.length) void prepareHomeworkTextbookSource(request.materialIds).catch(() => undefined);
  const token = await academicAuthToken();
  let response:Response|null=null, payload:any={};
  for(let attempt=1;attempt<=3;attempt+=1){
    response=await fetchWithTimeout('/api/teacher/academic/generate-question-paper-r33-10',{
      method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(request),cache:'no-store'
    }, 180000);
    let contentType=String(response.headers.get('content-type')||'').toLowerCase();
    if(!contentType.includes('application/json')){
      await response.text().catch(()=> '');
      response=await fetchWithTimeout(`/api/teacher/academic/generate-question-paper-r33-10?edunixo_preview_retry=${Date.now()}`,{
        method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`,'X-EDUNIXO-Preview-Retry':'R33.22.1'},body:JSON.stringify(request),cache:'no-store'
      }, 180000);
      contentType=String(response.headers.get('content-type')||'').toLowerCase();
    }
    const build=String(response.headers.get('x-edunixo-question-paper-build')||'').trim();
    if(!contentType.includes('application/json')){await response.text().catch(()=> '');throw new Error('The Question Paper server is still not reachable after a fresh Preview retry. Restart Preview once.');}
    payload=await response.json().catch(()=>null);
    if(!payload||typeof payload!=='object')throw new Error('The R33.10 Question Paper server returned an invalid response.');
    const engineBuild=String(payload?.engineBuild||'').trim();
    if((build&&build!=='R33.10')||(engineBuild&&engineBuild!=='R33.10')||(!build&&!engineBuild))throw new Error('The Question Paper response did not come from the R33.10 server. Restart Preview once.');
    if(response.ok){if(!payload?.paper||!Array.isArray(payload.paper.questions)||!payload.paper.questions.length)throw new Error('R33.10 completed without a usable Question Paper; the blank result was rejected safely.');return payload.paper as QuestionPaperDraft;}
    if(response.status===425&&payload?.sourcePreparing&&attempt<3){if(request.materialIds.length)await waitForHomeworkTextbookSource(request.materialIds);continue;}
    if([408,429,502,503,504].includes(response.status)&&attempt<3){await academicClientWait(Math.min(3500,700*attempt)+Math.floor(Math.random()*250));continue;}
    break;
  }
  throw new Error(payload?.error||`Question Paper generation failed (${response?.status||'network'}).`);
}

export async function regenerateQuestion(input: {
  paper: QuestionPaperDraft;
  questionId: string;
  instruction?: string;
}): Promise<QuestionPaperQuestion> {
  if (input.paper.materialIds.length) void prepareHomeworkTextbookSource(input.paper.materialIds).catch(() => undefined);
  const token=await academicAuthToken();
  let response:Response|null=null,payload:any={};
  for(let attempt=1;attempt<=2;attempt+=1){
    const replaceBody=JSON.stringify({paper:input.paper,questionId:input.questionId,instruction:input.instruction||''});
    response=await fetch('/api/teacher/academic/replace-question-r33-10',{
      method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},cache:'no-store',body:replaceBody
    });
    let contentType=String(response.headers.get('content-type')||'').toLowerCase();
    if(!contentType.includes('application/json')){
      await response.text().catch(()=> '');
      response=await fetch(`/api/teacher/academic/replace-question-r33-10?edunixo_preview_retry=${Date.now()}`,{
        method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`,'X-EDUNIXO-Preview-Retry':'R33.22.1'},cache:'no-store',body:replaceBody
      });
      contentType=String(response.headers.get('content-type')||'').toLowerCase();
    }
    const build=String(response.headers.get('x-edunixo-question-paper-build')||'').trim();
    if(!contentType.includes('application/json')){await response.text().catch(()=> '');throw new Error('The question replacement server is still not reachable after a fresh Preview retry. Restart Preview once.');}
    payload=await response.json().catch(()=>null);
    if(!payload||typeof payload!=='object')throw new Error('The R33.10 replacement service returned an invalid response.');
    const engineBuild=String(payload?.engineBuild||'').trim();
    if((build&&build!=='R33.10')||(engineBuild&&engineBuild!=='R33.10')||(!build&&!engineBuild))throw new Error('The replacement response did not come from the R33.10 server. Restart Preview once.');
    if(response.ok){if(!payload?.question?.text)throw new Error('R33.10 returned an empty replacement question.');return payload.question as QuestionPaperQuestion;}
    if(response.status===425&&payload?.sourcePreparing&&attempt<2){if(input.paper.materialIds.length)await waitForHomeworkTextbookSource(input.paper.materialIds);continue;}
    break;
  }
  throw new Error(payload?.error||`Question replacement failed (${response?.status||'network'}).`);
}

export async function listAcademicRecords(kind: SavedAcademicRecord['kind']): Promise<import('../types/domain').AcademicRecordListItem[]> {
  const payload = await academicApiJson<any>(`/api/teacher/academic/records?kind=${encodeURIComponent(kind)}`, { cache: 'no-store' });
  const data = Array.isArray(payload.records) ? payload.records : [];
  return data.map((row: any) => ({
    id: row.id,
    kind: row.kind,
    assignmentId: row.assignment_id,
    title: row.title,
    status: row.status,
    content: row.content,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    className: row.class_name || row.metadata?.scopeSnapshot?.className,
    division: row.division_name || row.metadata?.scopeSnapshot?.division,
    subjectName: row.subject_name || row.metadata?.scopeSnapshot?.subjectName,
  }));
}

export async function listHomeworkAttachments(recordId: string): Promise<HomeworkAttachment[]> {
  const payload = await academicApiJson<any>(`/api/teacher/academic/homework/${encodeURIComponent(recordId)}/attachments`);
  return (Array.isArray(payload.attachments) ? payload.attachments : []) as HomeworkAttachment[];
}

export async function deleteHomeworkAttachment(recordId: string, attachmentId: string): Promise<void> {
  await academicApiJson(`/api/teacher/academic/homework/${encodeURIComponent(recordId)}/attachments/${encodeURIComponent(attachmentId)}`, { method: 'DELETE' });
}

export async function deleteHomeworkAcademicRecord(recordId: string): Promise<{ warning?: string }> {
  return academicApiJson(`/api/teacher/academic/homework/${encodeURIComponent(recordId)}`, { method: 'DELETE' });
}

export async function resendHomeworkAcademicRecord(recordId: string): Promise<void> {
  await academicApiJson(`/api/teacher/academic/homework/${encodeURIComponent(recordId)}/resend`, { method: 'POST' });
}

export async function uploadAcademicAttachment(recordId: string, file: File): Promise<void> {
  if (!file || file.size <= 0 || file.size > 45 * 1024 * 1024) throw new Error('Choose an attachment up to 45 MB.');
  const db = requireSupabase();
  const ticket = await academicApiJson<any>(`/api/teacher/academic/homework/${encodeURIComponent(recordId)}/attachments/upload-ticket`, {
    method: 'POST',
    body: JSON.stringify({ fileName: file.name, mimeType: file.type || null, sizeBytes: file.size }),
  });
  const storagePath = String(ticket?.storagePath || '');
  const token = String(ticket?.token || '');
  if (!storagePath || !token) throw new Error('Secure Homework attachment upload ticket was not returned.');
  const { error: uploadError } = await db.storage.from('teacher-academic-attachments').uploadToSignedUrl(storagePath, token, file, {
    contentType: file.type || 'application/octet-stream',
  });
  if (uploadError) throw uploadError;
  await academicApiJson(`/api/teacher/academic/homework/${encodeURIComponent(recordId)}/attachments/register`, {
    method: 'POST',
    body: JSON.stringify({ fileName: file.name, storagePath, mimeType: file.type || null, sizeBytes: file.size }),
  });
}

export async function copyAcademicRecordToAssignment(recordId: string, targetAssignmentId: string): Promise<string> {
  const payload = await academicApiJson<any>(`/api/teacher/academic/records/${encodeURIComponent(recordId)}/copy`, {
    method: 'POST',
    body: JSON.stringify({ targetAssignmentId }),
    cache: 'no-store',
  });
  if (!payload?.id) throw new Error('Academic copy did not return a record ID.');
  return String(payload.id);
}

export async function listAssignmentSubmissions(recordId: string): Promise<import('../types/domain').AssignmentSubmission[]> {
  const payload = await academicApiJson<any>(`/api/teacher/academic/classwork/${encodeURIComponent(recordId)}/submissions`, { cache: 'no-store' });
  const data = Array.isArray(payload.submissions) ? payload.submissions : [];
  return data.map((row: any) => ({
    id: row.id,
    academicRecordId: row.academic_record_id,
    studentId: row.student_id,
    studentName: row.student_name,
    status: row.status,
    submittedAt: row.submitted_at ?? undefined,
    remarks: row.remarks ?? undefined,
    marks: row.marks == null ? undefined : Number(row.marks),
    grade: row.grade ?? undefined,
  }));
}

export async function reviewAssignmentSubmission(submissionId: string, review: { remarks?: string; marks?: number; grade?: string; checked: boolean }): Promise<void> {
  await academicApiJson(`/api/teacher/academic/submissions/${encodeURIComponent(submissionId)}/review`, {
    method: 'PATCH',
    body: JSON.stringify(review),
  });
}
