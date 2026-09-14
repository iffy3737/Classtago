import { useEffect, useMemo, useState } from 'react';
// R32 compatibility verifier only: Retry now — UI now says Prepare again / automatic retry.
import { Archive, Eye, Pencil, RefreshCw, Trash2, AlertTriangle, ExternalLink, FileText } from 'lucide-react';
import type { CombinedSubjectGroup, StudyMaterial, TeacherAssignment } from '../types/domain';
import { createStudyMaterial, deleteStudyMaterial, getStudyMaterialPreview, getTeacherAcademicAiStatus, indexStudyMaterial, listCombinedSubjectGroups, updateStudyMaterial } from '../services/teacherAcademicService';

type Props = { assignments: TeacherAssignment[]; materials: StudyMaterial[]; reload: () => Promise<void> };

type MaterialCategory = StudyMaterial['category'];

const MATERIAL_CATEGORIES: Array<{ key: MaterialCategory; label: string; hint: string }> = [
  { key: 'textbook', label: 'Textbook', hint: 'Official textbook/source. AI Homework reads only this tab.' },
  { key: 'video', label: 'Videos', hint: 'Teaching videos and demonstrations.' },
  { key: 'image', label: 'Images', hint: 'Diagrams, charts, maps and reference images.' },
  { key: 'pdf_material', label: 'PDF Material', hint: 'Extra PDFs and reference material.' },
  { key: 'notes_docs', label: 'Notes / Docs', hint: 'Teacher notes and documents.' },
  { key: 'worksheet', label: 'Worksheets', hint: 'Practice sheets and worksheets.' },
  { key: 'link_other', label: 'Links / Other', hint: 'Trusted web links and other references.' },
];

function classNumber(className: string) {
  const match = String(className || '').match(/\b(1[0-2]|[1-9])\b/);
  return match ? Number(match[1]) : null;
}

function categoryOf(material: StudyMaterial): MaterialCategory {
  if (material.category) return material.category;
  if (material.kind === 'image') return 'image';
  if (material.kind === 'worksheet') return 'worksheet';
  if (material.kind === 'link') return 'link_other';
  if (material.kind === 'notes' || material.kind === 'document') return 'notes_docs';
  return 'pdf_material';
}

function cleanFileTitle(name: string) {
  return String(name || '').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
}

function kindFor(category: MaterialCategory, file?: File): StudyMaterial['kind'] {
  if (category === 'image') return 'image';
  if (category === 'worksheet') return 'worksheet';
  if (category === 'link_other') return 'link';
  if (category === 'notes_docs') return 'document';
  if (category === 'video') return 'document';
  const mime = String(file?.type || '').toLowerCase();
  const ext = String(file?.name || '').toLowerCase();
  if (mime.startsWith('image/') || /\.(png|jpe?g|webp)$/.test(ext)) return 'image';
  if (mime.includes('pdf') || ext.endsWith('.pdf')) return 'pdf';
  return 'document';
}

export function StudyMaterialPage({ assignments, materials, reload }: Props) {
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [assignmentId, setAssignmentId] = useState('');
  const [category, setCategory] = useState<MaterialCategory>('textbook');
  const [displayName, setDisplayName] = useState('');
  const [url, setUrl] = useState('');
  const [textbookSourceMode, setTextbookSourceMode] = useState<'file' | 'link'>('file');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ percent:number; stage:'uploading'|'finalizing'|'indexing' } | null>(null);
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [editing, setEditing] = useState<StudyMaterial | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [preview, setPreview] = useState<{ title: string; url?: string; text?: string } | null>(null);
  const [workingId, setWorkingId] = useState('');
  const [deleteCandidate, setDeleteCandidate] = useState<StudyMaterial | null>(null);
  const [combinedGroups, setCombinedGroups] = useState<CombinedSubjectGroup[]>([]);
  const [sharedAssignmentIds, setSharedAssignmentIds] = useState<string[]>([]);

  const classAssignments = useMemo(
    () => selectedClass == null ? [] : assignments.filter((row) => classNumber(row.className) === selectedClass),
    [assignments, selectedClass],
  );

  const subjectOptions = useMemo(() => {
    const bySubject = new Map<string, TeacherAssignment>();
    for (const row of classAssignments) {
      const key = String(row.subjectId || row.subjectName).trim().toLowerCase();
      if (!bySubject.has(key)) bySubject.set(key, row);
    }
    return [...bySubject.values()].sort((a, b) => a.subjectName.localeCompare(b.subjectName));
  }, [classAssignments]);

  const assignment = useMemo(() => assignments.find((row) => row.id === assignmentId) || null, [assignments, assignmentId]);
  const sharedSubjectOptions = useMemo(() => {
    if (!assignment) return [];
    const seen = new Set<string>();
    const rows: Array<{ assignmentId: string; subjectId: string; subjectName: string; groupName: string }> = [];
    for (const group of combinedGroups) for (const member of group.members) {
      if (!member.assignedToCurrentTeacher || !member.assignmentId || String(member.subjectId) === String(assignment.subjectId)) continue;
      if (seen.has(member.assignmentId)) continue;
      seen.add(member.assignmentId);
      rows.push({ assignmentId: member.assignmentId, subjectId: member.subjectId, subjectName: member.subjectName, groupName: group.groupName });
    }
    return rows;
  }, [assignment, combinedGroups]);

  useEffect(() => {
    let cancelled = false;
    setCombinedGroups([]);
    setSharedAssignmentIds([]);
    if (!assignmentId) return () => { cancelled = true; };
    void listCombinedSubjectGroups({ assignmentId }).then((groups) => { if (!cancelled) setCombinedGroups(groups); }).catch(() => { if (!cancelled) setCombinedGroups([]); });
    return () => { cancelled = true; };
  }, [assignmentId]);

  const visible = useMemo(() => {
    if (!assignment) return [];
    return materials
      .filter((m) => classNumber(m.className) === selectedClass && String(m.subjectId) === String(assignment.subjectId) && categoryOf(m) === category && !m.archived)
      .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  }, [assignment, materials, selectedClass, category]);

  const selectClass = (value: number) => {
    setSelectedClass(value);
    setAssignmentId('');
    setCategory('textbook');
    setTextbookSourceMode('file');
    setFiles([]);
    setSharedAssignmentIds([]);
    setMessage('');
    setActionError('');
  };

  const selectSubject = (id: string) => {
    setAssignmentId(id);
    setCategory('textbook');
    setTextbookSourceMode('file');
    setFiles([]);
    setSharedAssignmentIds([]);
    setMessage('');
    setActionError('');
  };

  const save = async () => {
    setMessage(''); setActionError(''); setUploadProgress(null); setBusy(true);
    try {
      if (!assignment) throw new Error('Select an assigned subject first.');
      const useTextbookLink = category === 'textbook' && textbookSourceMode === 'link';
      const useLink = category === 'link_other' || useTextbookLink;
      if (useLink) {
        if (!url.trim()) throw new Error(useTextbookLink ? 'Paste the direct Textbook PDF link first.' : 'Paste the trusted link first.');
        try {
          const parsed = new URL(url.trim());
          if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
        } catch { throw new Error('Enter a valid http/https link.'); }
      } else if (!files.length) {
        throw new Error('Choose a file to upload.');
      }

      let indexingNeedsAttention = false;
      if (useLink) {
        let hostTitle = 'Study Material Link';
        try { hostTitle = new URL(url.trim()).hostname; } catch {}
        const title = displayName.trim() || (useTextbookLink ? `${assignment.subjectName} Textbook` : hostTitle);
        const result = await createStudyMaterial({ assignmentId: assignment.id, additionalAssignmentIds: category === 'textbook' ? sharedAssignmentIds : [], title, kind: 'link', category, sourceUrl: url.trim() });
        indexingNeedsAttention = Boolean(result.warning);
      } else {
        const baseTitle = displayName.trim();
        for (let index = 0; index < files.length; index += 1) {
          const current = files[index];
          const naturalTitle = cleanFileTitle(current.name);
          const title = files.length > 1 ? `${baseTitle || naturalTitle} · Part ${index + 1} of ${files.length}` : (baseTitle || naturalTitle);
          const result = await createStudyMaterial({ assignmentId: assignment.id, additionalAssignmentIds: category === 'textbook' ? sharedAssignmentIds : [], title, kind: kindFor(category, current), category, file: current, onUploadProgress: (percent, stage) => setUploadProgress({ percent, stage }) });
          if (result.warning) indexingNeedsAttention = true;
        }
      }
      const uploadedCount = files.length;
      setDisplayName(''); setUrl(''); setFiles([]); setSharedAssignmentIds([]);
      setMessage(indexingNeedsAttention
        ? 'Textbook uploaded safely. Chapter preparation needs attention below — use the action shown on that book.'
        : category === 'textbook'
          ? (useTextbookLink ? 'Textbook link saved and AI index prepared.' : `${uploadedCount > 1 ? `${uploadedCount} Textbook files uploaded` : 'Textbook uploaded'} and AI index prepared.`)
          : 'Material uploaded to this subject library.');
      await reload();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Unable to upload material.');
    } finally { setBusy(false); setUploadProgress(null); }
  };

  if (selectedClass == null) {
    return <section className="workspace">
      <header className="page-head"><div><h2>Study Material</h2><p>Choose a class. EDUNIXO then shows only the subjects assigned to you.</p></div><span className="pill">Teacher Library</span></header>
      <div className="card">
        <h3>Select Class</h3>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((value) => <button key={value} type="button" className="rounded-2xl border border-slate-200 bg-white px-3 py-5 text-center shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50" onClick={() => selectClass(value)}>
            <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Class</span>
            <span className="mt-1 block text-2xl font-black text-slate-900">{value}</span>
          </button>)}
        </div>
      </div>
    </section>;
  }

  if (!assignment) {
    return <section className="workspace">
      <header className="page-head"><div><button type="button" className="link-btn" onClick={() => setSelectedClass(null)}>← Classes 1–12</button><h2>Class {selectedClass}</h2><p>Select one of your Headmaster-assigned subjects.</p></div><span className="pill">Study Material</span></header>
      {!subjectOptions.length ? <div className="card"><div className="empty"><strong>Subject not assigned</strong></div></div> : <div className="card">
        <h3>Assigned Subjects</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {subjectOptions.map((row) => <button key={row.id} type="button" className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50" onClick={() => selectSubject(row.id)}>
            <span className="block text-lg font-black text-slate-900">{row.subjectName}</span>
            <span className="mt-1 block text-xs font-bold text-slate-500">{row.className}{row.division && row.division !== 'All' ? ` · ${row.division}` : ''}</span>
          </button>)}
        </div>
      </div>}
    </section>;
  }

  const activeCategory = MATERIAL_CATEGORIES.find((row) => row.key === category)!;
  const accepts = category === 'textbook' ? '.pdf' : category === 'video' ? 'video/*' : category === 'image' ? 'image/*' : category === 'pdf_material' ? '.pdf' : category === 'worksheet' ? '.pdf,.doc,.docx,.jpg,.jpeg,.png' : '.pdf,.doc,.docx,.txt,.rtf';

  return <section className="workspace">
    <header className="page-head"><div><button type="button" className="link-btn" onClick={() => setAssignmentId('')}>← Class {selectedClass} Subjects</button><h2>{assignment.subjectName} Study Material</h2><p>Class {selectedClass} · Files stay organised by material type and upload order.</p></div><span className="pill">{assignment.subjectName}</span></header>

    <div className="card">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {MATERIAL_CATEGORIES.map((row) => <button key={row.key} type="button" onClick={() => { setCategory(row.key); setTextbookSourceMode('file'); setFiles([]); setUrl(''); setMessage(''); }} className={`whitespace-nowrap rounded-xl border px-4 py-2 text-xs font-black ${category === row.key ? 'border-cyan-400 bg-cyan-50 text-cyan-900' : 'border-slate-200 bg-white text-slate-600'}`}>{row.label}</button>)}
      </div>
      <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600"><b>{activeCategory.label}:</b> {activeCategory.hint}</div>
    </div>

    <div className="card">
      <div className="card-title-row"><div><h3>Upload {activeCategory.label}</h3><small>Class and Subject are tagged automatically.</small></div></div>
      <div className="form-grid two">
        <label className="field"><span>Display Name (optional)</span><input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Leave blank to use the file name" /></label>
        {category === 'textbook' ? <div className="field"><span>Textbook Source</span><div className="flex gap-2"><button type="button" className={`btn ${textbookSourceMode === 'file' ? 'primary' : 'ghost'}`} onClick={() => { setTextbookSourceMode('file'); setUrl(''); setMessage(''); }}>Upload PDF File(s)</button><button type="button" className={`btn ${textbookSourceMode === 'link' ? 'primary' : 'ghost'}`} onClick={() => { setTextbookSourceMode('link'); setFiles([]); setMessage(''); }}>Direct Textbook PDF Link</button></div></div> : null}
        {category === 'link_other' || (category === 'textbook' && textbookSourceMode === 'link')
          ? <label className="field"><span>{category === 'textbook' ? 'Direct Textbook PDF Link' : 'Trusted Link'}</span><input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" /></label>
          : <label className="field"><span>{category === 'textbook' ? 'Choose Textbook PDF(s)' : 'Choose File'}</span><input type="file" accept={accepts} multiple={category === 'textbook'} onChange={(e) => setFiles(Array.from(e.target.files || []))} /></label>}
      </div>
      {category === 'textbook' && sharedSubjectOptions.length > 0 && <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50 p-3">
        <div className="text-xs font-black text-indigo-950">This same Textbook also covers (optional)</div>
        <p className="mt-1 text-[11px] leading-5 text-indigo-800">Use this only when one physical PDF contains more than one Subject. EDUNIXO stores the PDF once and tags it to your other assigned Subject(s).</p>
        <div className="mt-2 flex flex-wrap gap-2">{sharedSubjectOptions.map((option) => <label key={option.assignmentId} className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-900"><input type="checkbox" checked={sharedAssignmentIds.includes(option.assignmentId)} onChange={(e) => setSharedAssignmentIds((current) => e.target.checked ? [...current, option.assignmentId] : current.filter((id) => id !== option.assignmentId))} /><span>{option.subjectName}</span><small className="text-[9px] text-indigo-500">{option.groupName}</small></label>)}</div>
      </div>}
      {files.length > 0 && <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-700"><strong>Selected:</strong> {files.map((item) => `${item.name} · ${(item.size / (1024 * 1024)).toFixed(1)} MB`).join(' | ')}</div>}
      {category === 'textbook' && textbookSourceMode === 'file' && <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900"><strong>Large PDF supported.</strong> No manual splitting is needed. EDUNIXO uploads the book in safe parts, automatically retries interrupted parts, and then prepares it for AI Homework. AI-ready Textbook PDFs can be up to 2 GB each. <strong>AI:</strong> Gemini Free Tier only; no paid-model fallback.</div>}
      {uploadProgress && <div className="mt-3 rounded-xl border border-cyan-200 bg-cyan-50 p-3"><div className="flex items-center justify-between gap-3 text-xs font-bold text-cyan-950"><span>{uploadProgress.stage === 'indexing' ? 'Finding textbook chapters…' : uploadProgress.stage === 'finalizing' ? 'Finishing secure upload…' : 'Uploading textbook…'}</span><span>{uploadProgress.percent}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-cyan-600 transition-all" style={{ width: `${uploadProgress.percent}%` }} /></div><p className="mt-2 text-[11px] text-cyan-800">Keep this page open until upload completes. If the connection briefly drops, failed parts retry automatically.</p></div>}
      {category === 'textbook' && <div className="alert mt-3"><strong>Homework source:</strong> AI Homework always fetches only from Textbook sources in this Class + Subject. Chapter/Unit is detected from the textbook index; you do not need to tag it manually.</div>}
      {message && <div className={`alert ${/needs attention|unable|failed|error/i.test(message) ? 'warning' : 'success'}`}>{message}</div>}
      <div className="actions"><button className="btn primary" disabled={busy} onClick={() => void save()}>{busy ? (uploadProgress?.stage === 'indexing' ? 'Finding chapters…' : uploadProgress ? `Uploading ${uploadProgress.percent}%` : 'Uploading…') : category === 'textbook' && textbookSourceMode === 'link' ? 'Save Textbook Link' : `Upload ${activeCategory.label}`}</button></div>
    </div>

    <div className="card">
      <div className="card-title-row"><h3>{activeCategory.label} Library</h3><small>{visible.length} item(s)</small></div>
      {actionError && <div className="alert danger">{actionError}</div>}
      {!visible.length ? <div className="empty">No {activeCategory.label} uploaded yet.</div> : <div className="grid gap-3">
        {visible.map((m, index) => {
          const isWorking = workingId === m.id;
          const aiSetupMissing = /not configured|AI service is not ready|GEMINI_API_KEY|GOOGLE_API_KEY/i.test(String(m.extractionError || ''));
          const retryIndex = async () => {
            setActionError(''); setMessage(''); setWorkingId(m.id);
            try {
              const aiStatus = await getTeacherAcademicAiStatus();
              if (!aiStatus.ready) {
                setMessage('Free AI setup is still pending. Your textbook is safely uploaded. Add the school’s Gemini Free Tier key, restart Preview, then use Check & Retry.');
                return;
              }
              await indexStudyMaterial(m.id);
              setMessage(`${m.title} chapters are ready for Homework.`);
              await reload();
            } catch (e) {
              setActionError(e instanceof Error ? e.message : 'Chapter preparation could not be retried.');
              await reload();
            } finally { setWorkingId(''); }
          };
          return <div key={m.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{String(index + 1).padStart(2, '0')}</span>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${category === 'video' || m.extractionStatus === 'ready' ? 'bg-emerald-50 text-emerald-700' : m.extractionStatus === 'failed' ? 'bg-amber-50 text-amber-700' : 'bg-cyan-50 text-cyan-700'}`}>{category === 'video' ? 'Stored' : m.extractionStatus === 'ready' ? 'Chapters Ready' : m.extractionStatus === 'failed' ? (aiSetupMissing ? 'Free AI Pending' : 'Needs Retry') : 'Preparing chapters…'}</span>
                </div>
                <strong className="mt-1 block break-words text-sm text-slate-900">{m.title}</strong>

                {category === 'textbook' && m.extractionStatus === 'failed' ? <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                      <div className="min-w-0"><strong className="block text-xs text-amber-950">{aiSetupMissing ? 'Free AI setup is pending' : 'Chapter preparation could not finish'}</strong><p className="mt-0.5 break-words text-[11px] leading-5 text-amber-800">{aiSetupMissing ? 'Your textbook is safely uploaded. Once Gemini Free Tier is connected for the school, use Check & Retry to prepare its chapter index.' : (m.extractionError || 'The book is uploaded safely. Retry chapter preparation now.')}</p></div>
                    </div>
                    <button type="button" disabled={isWorking} onClick={() => void retryIndex()} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-[11px] font-black text-white shadow-sm transition hover:bg-amber-700 disabled:opacity-60"><RefreshCw className={`h-3.5 w-3.5 ${isWorking ? 'animate-spin' : ''}`} />{isWorking ? 'Auto retrying…' : aiSetupMissing ? 'Check & Retry' : 'Prepare again'}</button>
                  </div>
                </div> : null}

                {category === 'textbook' && (m.extractionStatus === 'pending' || m.extractionStatus === 'processing') ? <div className="mt-3 rounded-xl border border-cyan-200 bg-cyan-50 p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0"><strong className="block text-xs text-cyan-950">Preparing chapter list</strong><p className="mt-0.5 text-[11px] leading-5 text-cyan-800">EDUNIXO only prepares the chapter names first. Homework reads the selected chapter on demand. One tap is enough: temporary Gemini/network load is retried automatically.</p></div>
                    <button type="button" disabled={isWorking} onClick={() => void retryIndex()} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-2 text-[11px] font-black text-white shadow-sm transition hover:bg-cyan-700 disabled:opacity-60"><RefreshCw className={`h-3.5 w-3.5 ${isWorking ? 'animate-spin' : ''}`} />{isWorking ? 'Auto retrying…' : 'Prepare chapters now'}</button>
                  </div>
                </div> : null}
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
                <button type="button" disabled={isWorking} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] font-black text-sky-700 transition hover:bg-sky-100 disabled:opacity-60" onClick={async () => { setActionError(''); setWorkingId(m.id); try { const data = await getStudyMaterialPreview(m); setPreview({ title: m.title, ...data }); } catch (e) { setActionError(e instanceof Error ? e.message : 'Preview failed.'); } finally { setWorkingId(''); } }}><Eye className="h-3.5 w-3.5" />Preview</button>
                <button type="button" disabled={isWorking} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-60" onClick={() => { setEditing(m); setEditTitle(m.title); }}><Pencil className="h-3.5 w-3.5" />Rename</button>
                <button type="button" disabled={isWorking} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-black text-amber-700 transition hover:bg-amber-100 disabled:opacity-60" onClick={async () => { setActionError(''); setWorkingId(m.id); try { await updateStudyMaterial(m.id, { archived: true }); setMessage(`${m.title} archived.`); await reload(); } catch (e) { setActionError(e instanceof Error ? e.message : 'Archive failed.'); } finally { setWorkingId(''); } }}><Archive className="h-3.5 w-3.5" />Archive</button>
                <button type="button" disabled={isWorking} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-black text-red-700 transition hover:bg-red-100 disabled:opacity-60" onClick={() => setDeleteCandidate(m)}><Trash2 className="h-3.5 w-3.5" />Delete</button>
              </div>
            </div>
          </div>;
        })}
      </div>}
    </div>

    {editing && <div className="modal screen-only"><div className="modal-card"><div className="modal-head"><h3>Rename Material</h3><button className="icon-btn" onClick={() => setEditing(null)}>×</button></div><label className="field"><span>Display Name</span><input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} /></label><div className="actions"><button className="btn ghost" onClick={() => setEditing(null)}>Cancel</button><button className="btn primary" onClick={async () => { setActionError(''); try { await updateStudyMaterial(editing.id, { title: editTitle.trim() }); setEditing(null); await reload(); } catch (e) { setActionError(e instanceof Error ? e.message : 'Rename failed.'); } }}>Save</button></div></div></div>}
    {deleteCandidate && <div className="modal screen-only"><div className="modal-card"><div className="modal-head"><h3>Delete Material</h3><button className="icon-btn" onClick={() => setDeleteCandidate(null)}>×</button></div><div className="rounded-xl border border-red-200 bg-red-50 p-3"><strong className="block text-sm text-red-900">Delete “{deleteCandidate.title}”?</strong><p className="mt-1 text-xs leading-5 text-red-700">This permanently removes this uploaded file and its AI chapter index. If EDUNIXO detects that the material is used by a saved academic item, deletion will be blocked and you can Archive it instead.</p></div><div className="actions"><button className="btn ghost" disabled={workingId === deleteCandidate.id} onClick={() => setDeleteCandidate(null)}>Cancel</button><button className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-black text-white shadow-sm hover:bg-red-700 disabled:opacity-60" disabled={workingId === deleteCandidate.id} onClick={async () => { const target = deleteCandidate; setActionError(''); setWorkingId(target.id); try { const result = await deleteStudyMaterial(target.id); setDeleteCandidate(null); setMessage(result.warning ? `Material deleted. ${result.warning}` : `${target.title} deleted.`); await reload(); } catch (e) { setDeleteCandidate(null); setActionError(e instanceof Error ? e.message : 'Delete failed.'); } finally { setWorkingId(''); } }}><Trash2 className="h-4 w-4" />{workingId === deleteCandidate.id ? 'Deleting…' : 'Delete permanently'}</button></div></div></div>}
    {preview && <div className="modal preview-overlay screen-only" role="dialog" aria-modal="true" aria-label={`${preview.title} preview`}><div className="modal-card preview-modal"><div className="preview-head"><div className="min-w-0"><span className="preview-kicker">Study Material Preview</span><h3 title={preview.title}>{preview.title}</h3></div><div className="preview-head-actions">{preview.url && <a href={preview.url} target="_blank" rel="noreferrer" className="preview-open-btn"><ExternalLink className="h-4 w-4" />Open PDF</a>}<button type="button" className="preview-close-btn" aria-label="Close preview" onClick={() => setPreview(null)}>×</button></div></div>{preview.url ? <><div className="preview-mobile-card"><FileText className="h-12 w-12 text-sky-600" /><strong>{preview.title}</strong><p>For the clearest view on mobile, open the PDF in the browser's full PDF viewer.</p><a href={preview.url} target="_blank" rel="noreferrer" className="preview-mobile-open"><ExternalLink className="h-4 w-4" />Open full PDF</a></div><iframe title={preview.title} src={preview.url} className="preview-frame" /></> : <pre className="preview-text">{preview.text || 'No preview available.'}</pre>}</div></div>}
  </section>;
}
