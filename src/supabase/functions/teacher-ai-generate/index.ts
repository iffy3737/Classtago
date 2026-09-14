import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const allowedTasks = new Set(['year-plan','daily-teaching-plan','lesson-plan','homework','teaching-diary-assist','classwork-assignment','question-paper']);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Unauthorized.' }, 401);

  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
  const { data: userData } = await userClient.auth.getUser();
  const user = userData.user;
  if (!user) return json({ error: 'Unauthorized.' }, 401);

  const body = await req.json();
  if (!allowedTasks.has(body.taskType)) return json({ error: 'Unsupported generation task.' }, 400);
  if (!body.assignmentId || !Array.isArray(body.materialIds) || body.materialIds.length === 0) return json({ error: 'Assigned scope and selected Study Material are required.' }, 400);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: assignment } = await admin.from('edunixo_teacher_assignments').select('*').eq('id', body.assignmentId).eq('teacher_id', user.id).eq('active', true).single();
  if (!assignment) return json({ error: 'Assigned Class/Division/Subject access denied.' }, 403);

  const uniqueMaterialIds: string[] = [...new Set<string>(body.materialIds.map((value: unknown) => String(value)))];
  const { data: materials } = await admin.from('edunixo_study_materials').select('id,title,chapter,unit,extraction_status,assignment_id').in('id', uniqueMaterialIds).eq('owner_teacher_id', user.id).eq('archived', false);
  if (!materials || materials.length !== uniqueMaterialIds.length) return json({ error: 'One or more selected Study Material items are missing or not owned by this teacher.' }, 403);
  if (materials.some((m) => m.assignment_id !== assignment.id)) return json({ error: 'Cross-scope Study Material selection is not allowed.' }, 403);
  if (materials.some((m) => m.extraction_status !== 'ready')) return json({ error: 'All selected Study Material must be AI Ready before generation.' }, 409);

  const chapterScope: string[] = Array.isArray(body.chapterScope) ? body.chapterScope.map((value: unknown) => String(value)).filter(Boolean) : [];
  let segmentsQuery = admin.from('edunixo_study_material_segments').select('material_id,segment_no,chapter,page_no,content').in('material_id', uniqueMaterialIds).order('material_id').order('segment_no').limit(220);
  if (chapterScope.length) segmentsQuery = segmentsQuery.in('chapter', chapterScope);
  let { data: segments } = await segmentsQuery;

  // When chapter tags are incomplete, fall back to all selected-material segments rather than unrelated data.
  if ((!segments || !segments.length) && chapterScope.length) {
    const fallback = await admin.from('edunixo_study_material_segments').select('material_id,segment_no,chapter,page_no,content').in('material_id', uniqueMaterialIds).order('material_id').order('segment_no').limit(220);
    segments = fallback.data;
  }
  if (!segments?.length) return json({ error: 'Selected Study Material has no indexed text to generate from.' }, 409);

  const structuredInputs = { ...(body.structuredInputs ?? {}) } as Record<string, unknown>;
  let effectivePattern: any[] = Array.isArray(structuredInputs.manualPattern) ? structuredInputs.manualPattern as any[] : [];
  if (body.taskType === 'question-paper' && structuredInputs.useSchoolPattern === true) {
    const { data: schoolPatterns } = await admin.from('edunixo_question_paper_patterns')
      .select('*')
      .eq('school_id', assignment.school_id)
      .eq('active', true)
      .eq('academic_year', assignment.academic_year);
    const exam = String(structuredInputs.exam ?? '');
    const candidates = (schoolPatterns ?? []).filter((p: any) =>
      (!p.exam || p.exam === exam) && (!p.class_name || p.class_name === assignment.class_name) && (!p.subject_id || p.subject_id === assignment.subject_id)
    );
    candidates.sort((a: any, b: any) => patternSpecificity(b) - patternSpecificity(a));
    const selected = candidates[0];
    if (!selected) return json({ error: 'No saved school Question Paper Pattern is configured for this scope. Choose a manual pattern or configure a school pattern.' }, 409);
    effectivePattern = Array.isArray(selected.pattern) ? selected.pattern : [];
    structuredInputs.savedSchoolPatternTitle = selected.title;
    structuredInputs.savedSchoolPattern = effectivePattern;
  }

  const job = await admin.from('edunixo_ai_generation_jobs').insert({
    teacher_id: user.id,
    assignment_id: assignment.id,
    task_type: body.taskType,
    selected_material_ids: uniqueMaterialIds,
    chapter_scope: chapterScope,
    teacher_prompt: String(body.prompt ?? ''),
    status: 'created',
  }).select('id').single();
  const jobId = job.data?.id ?? crypto.randomUUID();

  try {
    const sourcePack = buildSourcePack(materials, segments);
    const systemPrompt = buildSystemPrompt(body.taskType, assignment, uniqueMaterialIds, chapterScope, body.mode);
    const userPrompt = `${String(body.prompt ?? '')}\n\nSTRUCTURED INPUTS:\n${JSON.stringify(structuredInputs)}\n\nSELECTED SOURCE PACK:\n${sourcePack}`;
    const ai = await callAi(systemPrompt, userPrompt);
    const parsed = parseJson(ai);

    if (body.taskType === 'question-paper') {
      if (body.mode === 'replace-question') {
        validateQuestion(parsed.question, uniqueMaterialIds, chapterScope);
        await completeJob(admin, jobId, true, []);
        return json({ jobId, question: parsed.question });
      }
      validatePaper(parsed.paper, Number(structuredInputs.totalMarks ?? 0), uniqueMaterialIds, chapterScope, assignment, structuredInputs, effectivePattern);
      await completeJob(admin, jobId, true, []);
      return json({ jobId, paper: parsed.paper });
    }

    const citations = Array.isArray(parsed.citations) ? parsed.citations : [];
    validateCitationIds(citations, uniqueMaterialIds);
    const result = {
      jobId,
      content: String(parsed.content ?? ''),
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings.map(String) : [],
      citations,
      scopeValidated: true,
    };
    if (!result.content.trim()) throw new Error('AI returned empty content.');
    await completeJob(admin, jobId, true, result.warnings);
    return json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Generation failed.';
    await admin.from('edunixo_ai_generation_jobs').update({ status: 'failed', warnings: [message], completed_at: new Date().toISOString() }).eq('id', jobId);
    return json({ error: message, jobId }, 422);
  }
});

function buildSourcePack(materials: any[], segments: any[]) {
  const names = new Map(materials.map((m) => [m.id, m.title]));
  let used = 0;
  const limit = 90000;
  const lines: string[] = [];
  for (const s of segments) {
    const line = `\n[SOURCE materialId=${s.material_id} title=${JSON.stringify(names.get(s.material_id) ?? '')} chapter=${JSON.stringify(s.chapter ?? '')} page=${s.page_no ?? ''} segment=${s.segment_no}]\n${String(s.content)}`;
    if (used + line.length > limit) break;
    lines.push(line); used += line.length;
  }
  return lines.join('\n');
}

function buildSystemPrompt(taskType: string, assignment: any, materialIds: string[], chapters: string[], mode?: string) {
  const base = `You are Classtago's school academic generation engine.\nSTRICT SOURCE RULES:\n1. Use ONLY facts/content supported by the SELECTED SOURCE PACK supplied in the user message.\n2. Do not browse, retrieve from the internet, or intentionally add out-of-syllabus knowledge.\n3. Allowed material IDs: ${materialIds.join(', ')}.\n4. Requested chapters: ${chapters.length ? chapters.join(', ') : 'selected materials as a whole'}.\n5. Scope: Class ${assignment.class_name}-${assignment.division}, Subject ${assignment.subject_name}, Medium ${assignment.medium}.\n6. If source content is insufficient, say so in warnings rather than inventing content.\n7. Return STRICT JSON only; no markdown fences.`;

  if (taskType === 'question-paper' && mode === 'replace-question') {
    return `${base}\nReturn {"question":{"id":"uuid","text":"...","marks":number,"type":"...","orderNo":1,"internalSources":[{"materialId":"allowed-id","chapter":"..."}]}}. Every question must carry at least one allowed internal source.`;
  }
  if (taskType === 'question-paper') {
    return `${base}\nCreate a complete school question paper. Honor the effective saved/manual paper pattern supplied in STRUCTURED INPUTS. Return {"paper":{"exam":"first_unit_test|first_term_examination|second_unit_test|second_term_examination","assignmentId":"${assignment.id}","materialIds":${JSON.stringify(materialIds)},"chapters":${JSON.stringify(chapters)},"totalMarks":number,"durationMinutes":number,"medium":"...","title":"...","instructions":["..."],"pattern":[{"type":"...","count":number,"marksEach":number}],"questions":[{"id":"uuid","text":"...","marks":number,"type":"...","orderNo":number,"internalSources":[{"materialId":"allowed-id","chapter":"..."}]}],"reviewStatus":"ai_draft"}}. The sum of question marks MUST exactly equal totalMarks. Do not expose internalSources in question text. Do not add generic boilerplate instructions; leave instructions empty unless explicitly supplied.`;
  }
  const taskRules: Record<string, string> = {
    'year-plan': 'Content must include annual chapter distribution, month-wise plan, expected periods, revision slots, and examination preparation.',
    'daily-teaching-plan': 'Content must include today objectives, teaching sequence, explanation points, activity, examples, questions, homework suggestion, and required teaching resources.',
    'lesson-plan': 'Content must include class/subject/chapter/topic context, learning objectives, teaching method/activity, resources, expected periods, planned date, and status-aware plan.',
    'homework': 'Content must be student-ready homework from the selected chapter/material only. Read STRUCTURED INPUTS.homeworkSections and follow every selected section type and requested quantity exactly. Respect date, due date, difficulty, targetMinutes and outputLanguage. Do not include an answer key unless the Teacher explicitly asks. If selected source material cannot support a requested item, warn instead of inventing.',
    'teaching-diary-assist': 'Content must reflect the actual daily teaching record: date, period, topic taught, homework given, class remarks, completion status, and substitute/free-period reason when applicable.',
    'classwork-assignment': 'Content must be ready classwork/assignment material respecting work type, selected chapter, deadline, optional marks/grade, and teacher remarks.',
  };
  return `${base}\nTask type: ${taskType}. ${taskRules[taskType] ?? ''} Return {"content":"complete editable teacher draft","warnings":[],"citations":[{"materialId":"allowed-id","materialTitle":"...","chapter":"...","excerpt":"short supporting excerpt"}]}.`;
}

async function callAi(systemPrompt: string, userPrompt: string): Promise<string> {
  // Preferred Google AI Studio / Gemini path. Secrets stay in the Edge Function environment.
  const geminiKey = Deno.env.get('GEMINI_API_KEY');
  const geminiModel = Deno.env.get('GEMINI_MODEL');
  if (geminiKey || geminiModel) {
    if (!geminiKey || !geminiModel) throw new Error('Gemini is partially configured. Set both GEMINI_API_KEY and GEMINI_MODEL as server-side Edge Function secrets.');
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': geminiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
      }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Gemini API failed (${response.status})${detail ? `: ${detail.slice(0, 500)}` : '.'}`);
    }
    const data = await response.json();
    const text = Array.isArray(data?.candidates?.[0]?.content?.parts)
      ? data.candidates[0].content.parts.map((part: any) => String(part?.text ?? '')).join('')
      : '';
    if (!text.trim()) throw new Error('Gemini returned an empty response.');
    return text;
  }

  // Optional OpenAI-compatible provider fallback for deployments that choose another server provider.
  const url = Deno.env.get('AI_PROVIDER_URL');
  const key = Deno.env.get('AI_PROVIDER_KEY');
  const model = Deno.env.get('AI_MODEL');
  if (!url || !key || !model) throw new Error('Server AI provider is not configured. Set GEMINI_API_KEY + GEMINI_MODEL, or AI_PROVIDER_URL + AI_PROVIDER_KEY + AI_MODEL, as Edge Function secrets.');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, temperature: 0.2, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }] }),
  });
  if (!response.ok) throw new Error(`AI provider failed (${response.status}).`);
  const data = await response.json();
  return String(data?.choices?.[0]?.message?.content ?? '');
}

function parseJson(text: string): any {
  try { return JSON.parse(text); } catch { throw new Error('AI returned invalid structured JSON.'); }
}

function validateCitationIds(citations: any[], allowedIds: string[]) {
  const allowed = new Set(allowedIds);
  for (const c of citations) if (!allowed.has(String(c.materialId))) throw new Error('Scope validation failed: AI cited material outside the selected scope.');
}

function validateQuestion(q: any, allowedIds: string[], chapters: string[]) {
  if (!q || !String(q.text ?? '').trim() || Number(q.marks) <= 0) throw new Error('Invalid replacement question returned by AI.');
  const sources = Array.isArray(q.internalSources) ? q.internalSources : [];
  if (!sources.length) throw new Error('Scope validation failed: question has no internal source reference.');
  const allowed = new Set(allowedIds);
  const allowedChapters = new Set(chapters);
  for (const s of sources) {
    if (!allowed.has(String(s.materialId))) throw new Error('Scope validation failed: question referenced unselected material.');
    if (chapters.length && s.chapter && !allowedChapters.has(String(s.chapter))) throw new Error('Scope validation failed: question referenced a chapter outside the selected chapter scope.');
  }
}

function validatePaper(p: any, expectedMarks: number, allowedIds: string[], chapters: string[], assignment: any, structuredInputs: Record<string, unknown>, effectivePattern: any[]) {
  if (!p || !Array.isArray(p.questions) || !p.questions.length) throw new Error('AI returned an empty or invalid question paper.');
  const marks = p.questions.reduce((sum: number, q: any) => sum + Number(q.marks || 0), 0);
  if (!expectedMarks || marks !== expectedMarks || Number(p.totalMarks) !== expectedMarks) throw new Error(`Paper validation failed: generated marks total ${marks}, expected ${expectedMarks}.`);
  for (const q of p.questions) validateQuestion(q, allowedIds, chapters);
  p.assignmentId = assignment.id;
  p.materialIds = allowedIds;
  p.chapters = chapters;
  p.totalMarks = expectedMarks;
  validatePatternCompliance(p.questions, effectivePattern);
  p.durationMinutes = Number(structuredInputs.durationMinutes ?? p.durationMinutes);
  p.medium = String(structuredInputs.medium || assignment.medium);
  p.exam = String(structuredInputs.exam ?? p.exam);
  p.reviewStatus = 'ai_draft';
}

function patternSpecificity(p: any) {
  return (p.exam ? 4 : 0) + (p.class_name ? 2 : 0) + (p.subject_id ? 1 : 0);
}

function validatePatternCompliance(questions: any[], pattern: any[]) {
  if (!Array.isArray(pattern) || pattern.length === 0) return;
  for (const row of pattern) {
    const type = String(row.type ?? '').trim().toLowerCase();
    const count = Number(row.count ?? 0);
    const marksEach = Number(row.marksEach ?? row.marks_each ?? 0);
    if (!type || count <= 0 || marksEach <= 0) continue;
    const matches = questions.filter((q: any) => String(q.type ?? '').trim().toLowerCase() === type && Number(q.marks) === marksEach);
    if (matches.length !== count) throw new Error(`Paper pattern validation failed for ${row.type}: expected ${count} question(s) × ${marksEach} marks, got ${matches.length}.`);
  }
}

async function completeJob(admin: any, id: string, validated: boolean, warnings: string[]) {
  await admin.from('edunixo_ai_generation_jobs').update({ status: 'completed', scope_validated: validated, warnings, completed_at: new Date().toISOString() }).eq('id', id);
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, 'content-type': 'application/json' } });
}
