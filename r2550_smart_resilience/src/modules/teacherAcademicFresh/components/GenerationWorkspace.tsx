import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { AcademicTaskType, GenerationResult, StudyMaterial, TeacherAssignment } from '../types/domain';
import { copyAcademicRecordToAssignment, generateAcademicContent, listStudyMaterialChapters, prepareHomeworkTextbookSource, saveAcademicRecord, uploadAcademicAttachment } from '../services/teacherAcademicService';
import { MaterialPicker } from './MaterialPicker';
import { ScopeSelector } from './ScopeSelector';
import { SmartPrintDialog } from './SmartPrintDialog';
import { resolveAcademicTextPresentation } from '../utils/languagePresentation';
import { divisionScreenLabel } from '../../../lib/divisionPresentation';

type Props = {
  title: string;
  description: string;
  taskType: Exclude<AcademicTaskType, 'question-paper'>;
  assignments: TeacherAssignment[];
  materials: StudyMaterial[];
  onSaved?: () => void;
  children?: (state: { assignmentId: string }) => ReactNode;
  fields?: Array<{ key: string; label: string; type?: 'text' | 'number' | 'date' | 'textarea' | 'select'; placeholder?: string; options?: readonly string[]; defaultValue?: string | number }>;
  allowPublish?: boolean;
  allowAttachment?: boolean;
  allowDivisionCopy?: boolean;
};

export function GenerationWorkspace({ title, description, taskType, assignments, materials, onSaved, children, fields = [], allowPublish = false, allowAttachment = false, allowDivisionCopy = false }: Props) {
  const [assignmentId, setAssignmentId] = useState('');
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [chapters, setChapters] = useState('');
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [editableContent, setEditableContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldValues, setFieldValues] = useState<Record<string, string | number>>(() => Object.fromEntries(fields.map((f) => [f.key, f.defaultValue ?? ''])));
  const [attachment, setAttachment] = useState<File | undefined>(undefined);
  const [copyTargetAssignmentId, setCopyTargetAssignmentId] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [availableChapters, setAvailableChapters] = useState<string[]>([]);
  const usesTextbookCore = ['daily-teaching-plan','lesson-plan','classwork-assignment'].includes(taskType);
  const isTeachingDiary = taskType === 'teaching-diary-assist';

  const currentAssignment = useMemo(() => assignments.find((a) => a.id === assignmentId) || null, [assignments, assignmentId]);
  const outputPresentation = useMemo(() => resolveAcademicTextPresentation({ languageHint: currentAssignment?.medium || '', text: editableContent }), [currentAssignment?.medium, editableContent]);

  const scopedMaterials = useMemo(() => materials.filter((m) => {
    const assignment = assignments.find((a) => a.id === assignmentId);
    if (!assignment || m.className !== assignment.className || m.subjectId !== assignment.subjectId || (m.division && m.division !== assignment.division)) return false;
    if (usesTextbookCore) return m.category === 'textbook' && m.extractionStatus === 'ready';
    return true;
  }), [assignmentId, assignments, materials, usesTextbookCore]);

  useEffect(() => {
    let cancelled = false;
    if (!assignmentId) { setSelectedMaterials([]); setAvailableChapters([]); setChapters(''); return; }
    if (isTeachingDiary) { setSelectedMaterials([]); setAvailableChapters([]); setChapters(''); return; }
    if (!usesTextbookCore) return;
    const ids = scopedMaterials.map((m) => m.id);
    setSelectedMaterials(ids);
    setChapters('');
    setAvailableChapters([]);
    if (!ids.length) return;
    void prepareHomeworkTextbookSource(ids).catch(() => undefined);
    void listStudyMaterialChapters(ids).then((rows) => { if (!cancelled) setAvailableChapters(rows); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [assignmentId, isTeachingDiary, usesTextbookCore, scopedMaterials.map((m) => m.id).join('|')]);

  const copyTargets = useMemo(() => {
    if (!allowDivisionCopy || !assignmentId) return [];
    const current = assignments.find((a) => a.id === assignmentId);
    if (!current) return [];
    return assignments.filter((a) => a.id !== current.id && a.className === current.className && a.subjectId === current.subjectId && a.academicYear === current.academicYear);
  }, [allowDivisionCopy, assignmentId, assignments]);

  const generate = async () => {
    setError('');
    setSaveMessage('');
    setBusy(true);
    try {
      if (!assignmentId) throw new Error('Select an assigned class/subject scope.');
      if (!isTeachingDiary && !selectedMaterials.length) throw new Error(usesTextbookCore ? 'Textbook is not AI-ready for this assigned Subject.' : 'Select Study Material. AI cannot generate from an empty or unrelated source scope.');
      const response = await generateAcademicContent({
        taskType,
        assignmentId,
        materialIds: selectedMaterials,
        chapterScope: chapters.split(',').map((v) => v.trim()).filter(Boolean),
        prompt,
        structuredInputs: fieldValues,
      });
      setResult(response);
      setEditableContent(response.content);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed.');
    } finally {
      setBusy(false);
    }
  };

  const resolveRecordStatus = (publish: boolean): 'draft' | 'planned' | 'in_progress' | 'completed' | 'published' => {
    if (publish) return 'published';
    if (taskType === 'daily-teaching-plan') return 'planned';
    if (taskType === 'lesson-plan') {
      const value = String(fieldValues.status ?? 'Planned').toLowerCase();
      if (value === 'completed') return 'completed';
      if (value.includes('progress')) return 'in_progress';
      return 'planned';
    }
    if (taskType === 'teaching-diary-assist') {
      const value = String(fieldValues.status ?? '').toLowerCase();
      if (value === 'completed') return 'completed';
      if (value.includes('partially')) return 'in_progress';
      return 'draft';
    }
    return 'draft';
  };

  const save = async (publish = false) => {
    setError('');
    setSaveMessage('');
    setBusy(true);
    try {
      if (!assignmentId || !editableContent.trim()) throw new Error('Generate or enter content before saving.');
      const id = await saveAcademicRecord({
        kind: taskType,
        assignmentId,
        title,
        status: resolveRecordStatus(publish),
        content: editableContent,
        metadata: { materialIds: selectedMaterials, chapters: chapters.split(',').map((x) => x.trim()).filter(Boolean), structuredInputs: fieldValues, generationJobId: result?.jobId ?? null },
      });
      if (attachment) await uploadAcademicAttachment(id, attachment);
      if (copyTargetAssignmentId) {
        const copyId = await copyAcademicRecordToAssignment(id, copyTargetAssignmentId);
        if (attachment) await uploadAcademicAttachment(copyId, attachment);
      }
      setSaveMessage(publish ? 'Saved and published successfully.' : 'Saved successfully.');
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setBusy(false);
    }
  };


  return (
    <section className="workspace">
      <header className="page-head"><div><h2>{title}</h2><p>{description}</p></div><span className="pill">{isTeachingDiary ? 'Factual AI Assist' : usesTextbookCore ? 'Textbook AI' : 'Selected-material AI'}</span></header>
      {!assignments.length && <div className="alert warning"><strong>No assigned subject scope is available.</strong> Headmaster/Academic Setup must assign Class/Division/Subject before this AI feature can generate or save content.</div>}
      <div className="card">
        <div className="form-grid two">
          <ScopeSelector assignments={assignments} value={assignmentId} onChange={(id) => { setAssignmentId(id); setSelectedMaterials([]); setAvailableChapters([]); setChapters(''); setResult(null); setEditableContent(''); }} />
          {!isTeachingDiary && <label className="field"><span>Chapter / Unit Scope</span>{usesTextbookCore ? <select value={chapters} onChange={(e) => setChapters(e.target.value)}><option value="">Whole textbook / current scope</option>{availableChapters.map((chapter) => { const value=chapter.replace(/^\d+\s*[—-]\s*/, ''); return <option key={chapter} value={value}>{chapter}</option>; })}</select> : <input value={chapters} onChange={(e) => setChapters(e.target.value)} placeholder="e.g. Chapter 3, Chapter 4" />}</label>}
          {isTeachingDiary && <div className="field"><span>Diary Rule</span><div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs font-bold leading-5 text-amber-900">Teaching Diary records what was actually taught. AI only formats the factual details you enter; it does not invent a lesson or completion.</div></div>}
        </div>
        {fields.length > 0 && <div className="form-grid two">{fields.map((field) => <label className="field" key={field.key}><span>{field.label}</span>{field.type === 'textarea' ? <textarea rows={3} value={String(fieldValues[field.key] ?? '')} onChange={(e) => setFieldValues({ ...fieldValues, [field.key]: e.target.value })} placeholder={field.placeholder} /> : field.type === 'select' ? <select value={String(fieldValues[field.key] ?? '')} onChange={(e) => setFieldValues({ ...fieldValues, [field.key]: e.target.value })}><option value="">Select</option>{field.options?.map((o) => <option key={o} value={o}>{o}</option>)}</select> : <input type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'} value={fieldValues[field.key] ?? ''} onChange={(e) => setFieldValues({ ...fieldValues, [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value })} placeholder={field.placeholder} />}</label>)}</div>}
        {children?.({ assignmentId })}
        {(allowAttachment || allowDivisionCopy) && <div className="form-grid two">{allowAttachment && <label className="field"><span>Optional Attachment</span><input type="file" onChange={(e) => setAttachment(e.target.files?.[0])} /></label>}{allowDivisionCopy && <label className="field"><span>Optional Copy to Another Assigned Division</span><select value={copyTargetAssignmentId} onChange={(e) => setCopyTargetAssignmentId(e.target.value)}><option value="">Do not copy</option>{copyTargets.map((a) => <option key={a.id} value={a.id}>{a.className}-{divisionScreenLabel(a.division)} • {a.subjectName}</option>)}</select></label>}</div>}
        <label className="field"><span>Teacher instruction (optional)</span><textarea rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={isTeachingDiary ? 'Add only a factual note that should appear in the diary.' : 'Add a special instruction only if needed. Textbook remains the academic source.'} /></label>
        {usesTextbookCore && <div className="field"><span>AI Source</span><div className={`rounded-xl border px-3 py-3 text-xs font-bold leading-5 ${scopedMaterials.length?'border-emerald-200 bg-emerald-50 text-emerald-900':'border-rose-200 bg-rose-50 text-rose-900'}`}>{scopedMaterials.length ? <>Textbook ready: {scopedMaterials.map(m=>m.title).join(' · ')}<br/><span className="font-medium">The prepared Textbook cache is reused; the full PDF is not re-processed on every Generate.</span></> : 'Textbook is not AI-ready for this Class + Subject.'}</div></div>}
        {!usesTextbookCore && !isTeachingDiary && <div className="field"><span>Study Material scope</span><MaterialPicker materials={scopedMaterials} selected={selectedMaterials} onChange={setSelectedMaterials} /></div>}
        {error && <div className="alert danger">{error}</div>}
        <div className="actions"><button className="btn primary" onClick={generate} disabled={busy}>{busy ? 'Working…' : 'Generate with AI'}</button></div>
      </div>

      {result && (
        <div id={`academic-output-${taskType}`} className="card output-card print-root">
          <div className="card-title-row"><div><h3>Teacher Review Draft</h3><small>{result.scopeValidated ? 'Scope validation passed' : 'Review scope warning'}</small></div><div className="actions screen-only"><SmartPrintDialog targetId={`academic-output-${taskType}`} /><button className="btn ghost" onClick={() => save(false)} disabled={busy}>Save</button>{allowPublish && <button className="btn primary" onClick={() => save(true)} disabled={busy}>Save & Publish</button>}</div></div>
          {saveMessage && <div className="alert success">{saveMessage}</div>}
          {result.warnings.length > 0 && <div className="alert warning">{result.warnings.join(' • ')}</div>}
          <textarea className={`editor screen-only ${outputPresentation.className}`} dir={outputPresentation.dir} lang={outputPresentation.languageCode === 'auto' ? undefined : outputPresentation.languageCode} value={editableContent} onChange={(e) => setEditableContent(e.target.value)} /><div className={`print-only generated-print-content ${outputPresentation.className}`} dir={outputPresentation.dir} lang={outputPresentation.languageCode === 'auto' ? undefined : outputPresentation.languageCode}>{editableContent}</div>
          <details className="screen-only"><summary>Internal source references</summary><ul>{result.citations.map((c, i) => <li key={`${c.materialId}-${i}`}>{c.materialTitle}{c.chapter ? ` — ${c.chapter}` : ''}</li>)}</ul></details>
        </div>
      )}
    </section>
  );
}
