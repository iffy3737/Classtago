import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FileText, Loader2, RefreshCw, RotateCcw, ShieldCheck } from 'lucide-react';
import type { User } from '../types';
import { supabase } from '../lib/supabase';
import { divisionPrintSuffix } from '../lib/divisionPresentation';
import { SmartPrintDialog } from '../modules/teacherAcademicFresh/components/SmartPrintDialog';
import type { QuestionPaperDraft, QuestionPaperQuestion, QuestionPatternRow } from '../modules/teacherAcademicFresh/types/domain';
import { resolveAcademicTextPresentation } from '../modules/teacherAcademicFresh/utils/languagePresentation';
import '../modules/teacherAcademicFresh/styles.scoped.css';

type ComponentStatus = 'pending' | 'submitted' | 'returned' | 'approved';
type CombinedComponent = {
  componentIndex: number;
  subjectId: string;
  subjectName: string;
  teacherName?: string;
  assignmentId?: string;
  marks: number;
  paperId?: string;
  submittedAt?: string;
  status: ComponentStatus;
  returnReason?: string;
  paper?: QuestionPaperDraft;
};
type CombinedGroup = {
  collaborationKey: string;
  groupId: string;
  groupName: string;
  schoolName?: string;
  exam: string;
  academicYear: string;
  className: string;
  division: string;
  combinedTotalMarks: number;
  durationMinutes: number;
  status: 'pending' | 'ready' | 'returned' | 'approved';
  approvedAt?: string;
  components: CombinedComponent[];
};
type Detail = { group: CombinedGroup; paper: QuestionPaperDraft | null };

const examLabels: Record<string, string> = {
  first_unit_test: 'First Unit Test',
  first_term_examination: 'First Term Examination',
  second_unit_test: 'Second Unit Test',
  second_term_examination: 'Second Term Examination',
};
const expandedAcademicYear = (value?: string | null) => {
  const raw = String(value || '').trim();
  const match = raw.match(/(\d{4})\D+(\d{2,4})/);
  if (!match) return raw;
  const start = Number(match[1]);
  const end = match[2].length === 2 ? Math.floor(start / 100) * 100 + Number(match[2]) : Number(match[2]);
  return `${start}-${end}`;
};
const normalizedType = (value: string) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const answerLayout = (question: QuestionPaperQuestion) => {
  if (question.answerLayout) return question.answerLayout;
  const type = normalizedType(question.type);
  if (/\b(mcq|multiple choice|objective choice)\b/.test(type)) return 'mcq';
  if (/fill.*blank|blank.*fill/.test(type)) return 'fill_blanks';
  if (/true.*false|false.*true/.test(type)) return 'true_false';
  if (/match|matching/.test(type)) return 'match';
  if (/diagram|draw|sketch|colour|color|map|construction|craft/.test(type)) return 'diagram';
  if (/solve|sum|numerical|problem|working|calculate|geometry|practical|lab/.test(type)) return 'working';
  if (/very short|one word|one sentence/.test(type)) return 'very_short';
  if (/long|essay|descriptive/.test(type)) return 'long';
  if (/short/.test(type)) return 'short';
  return 'default';
};
const answerLines = (q: QuestionPaperQuestion) => {
  if (Number(q.answerLines || 0) > 0) return Math.min(20, Math.floor(Number(q.answerLines)));
  const marks = Math.max(1, Math.floor(Number(q.marks || 1)));
  const layout = answerLayout(q);
  if (layout === 'very_short') return Math.min(3, Math.max(2, marks));
  if (layout === 'short') return Math.min(8, Math.max(4, marks * 2));
  if (layout === 'long') return Math.min(18, Math.max(8, marks * 2));
  if (layout === 'default') return Math.min(12, Math.max(2, marks * 2));
  return 0;
};
const sectionPrefix = (presentation: ReturnType<typeof resolveAcademicTextPresentation>) => {
  if (presentation.scriptClass === 'nastaliq' || presentation.scriptClass === 'arabic') return 'سوال نمبر';
  if (presentation.scriptClass === 'devanagari') return 'प्रश्न क्र.';
  return 'Q.';
};
const answerLabel = (presentation: ReturnType<typeof resolveAcademicTextPresentation>) => presentation.scriptClass === 'nastaliq' || presentation.scriptClass === 'arabic' ? 'جواب' : presentation.scriptClass === 'devanagari' ? 'उत्तर' : 'Answer';
const correctLabel = (presentation: ReturnType<typeof resolveAcademicTextPresentation>) => presentation.scriptClass === 'nastaliq' || presentation.scriptClass === 'arabic' ? 'درست جواب' : presentation.scriptClass === 'devanagari' ? 'सही उत्तर' : 'Correct Answer';
const formatMarks = (value: number) => Number.isInteger(value) ? String(value).padStart(2, '0') : String(Number(value.toFixed(2)));

async function clerkApi<T>(url: string, init?: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Clerk session is not available. Please sign in again.');
  const response = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init?.headers || {}) },
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || `Combined Question Paper request failed (${response.status}).`);
  return payload as T;
}

function StudentAnswerArea({ question }: { question: QuestionPaperQuestion }) {
  const layout = answerLayout(question);
  if (layout === 'fill_blanks') return null;
  if (layout === 'mcq') return <div className="qp-answer-area qp-mcq-options">{(question.options || []).length ? (question.options || []).map((option, index) => <div className="qp-option" key={`${question.id}-option-${index}`}><span className="qp-choice-circle" /><span dir="auto">{option}</span></div>) : <div className="qp-inline-answer">○ ________ &nbsp; ○ ________ &nbsp; ○ ________ &nbsp; ○ ________</div>}</div>;
  if (layout === 'true_false') return <div className="qp-answer-area qp-inline-answer"><span className="qp-short-blank" /></div>;
  if (layout === 'working') return <div className={`qp-answer-area qp-working-box ${Number(question.marks) >= 5 ? 'large' : Number(question.marks) >= 3 ? 'medium' : 'small'}`} />;
  if (layout === 'diagram') return <div className={`qp-answer-area qp-diagram-box ${Number(question.marks) >= 5 ? 'large' : 'medium'}`} />;
  const lines = answerLines(question);
  return lines ? <div className="qp-answer-area qp-ruled-answer">{Array.from({ length: lines }, (_, index) => <span className="qp-answer-line" key={`${question.id}-line-${index}`} />)}</div> : null;
}

function MatchStudentTable({ questions, label }: { questions: QuestionPaperQuestion[]; label: string }) {
  const left = questions.flatMap((q) => q.matchLeft || []).filter(Boolean);
  const right = questions.flatMap((q) => q.matchRight || []).filter(Boolean);
  const displayRight = right.length > 1 ? [...right.slice(1), right[0]] : right;
  const rows = Math.max(left.length, displayRight.length, questions.length, 1);
  return <div className="qp-answer-area qp-section-match-wrap"><table className="qp-match-table qp-section-match-table"><thead><tr><th>#</th><th>A</th><th>B</th><th>{label}</th></tr></thead><tbody>{Array.from({ length: rows }, (_, index) => <tr key={index}><td>{index + 1}</td><td><span dir="auto">{left[index] || ''}</span></td><td><span dir="auto">{displayRight[index] ? `${String.fromCharCode(65 + index)}. ${displayRight[index]}` : ''}</span></td><td><span className="qp-match-answer-blank" /></td></tr>)}</tbody></table></div>;
}
function MatchModelTable({ questions, label }: { questions: QuestionPaperQuestion[]; label: string }) {
  const left = questions.flatMap((q) => q.matchLeft || []).filter(Boolean);
  const right = questions.flatMap((q) => q.matchRight || []).filter(Boolean);
  const rows = Math.max(left.length, right.length, questions.length, 1);
  return <div className="qp-model-answer-match-wrap"><table className="qp-match-table qp-model-answer-match-table"><thead><tr><th>#</th><th>A</th><th>{label}</th></tr></thead><tbody>{Array.from({ length: rows }, (_, index) => <tr key={index}><td>{index + 1}</td><td><span dir="auto">{left[index] || ''}</span></td><td><span dir="auto">{right[index] || ''}</span></td></tr>)}</tbody></table></div>;
}


function ModelResponse({ question, label, presentation }: { question: QuestionPaperQuestion; label: string; presentation: ReturnType<typeof resolveAcademicTextPresentation> }) {
  const answer = String(question.modelAnswer || '').trim();
  const layout = answerLayout(question);
  return <div className={`qp-model-answer-response ${presentation.className}`} dir={presentation.dir} lang={presentation.languageCode === 'auto' ? undefined : presentation.languageCode}>
    {layout === 'mcq' && (question.options || []).length > 0 && <div className="qp-model-mcq-options">{(question.options || []).map((option, index) => <div key={`${question.id}-model-option-${index}`} className={normalizedType(option) === normalizedType(answer) ? 'is-correct' : ''}><span>{normalizedType(option) === normalizedType(answer) ? '✓' : '○'}</span><span dir="auto">{option}</span></div>)}</div>}
    <div className="qp-model-answer-text"><strong>{label}:</strong><span>{answer || '—'}</span></div>
  </div>;
}

function buildSections(paper: QuestionPaperDraft) {
  const ordered = [...paper.questions].sort((a, b) => a.orderNo - b.orderNo);
  return paper.pattern.map((row, index) => ({
    row,
    sectionIndex: index,
    items: ordered.filter((q) => Number(q.sectionIndex || 0) === index + 1),
    totalMarks: Number(row.count || 0) * Number(row.marksEach || 0),
    isMatch: /match|matching/.test(normalizedType(row.type)),
  }));
}

function CombinedPaperDocument({ group, paper, model = false }: { group: CombinedGroup; paper: QuestionPaperDraft; model?: boolean }) {
  const sections = buildSections(paper);
  const parts = useMemo(() => {
    const map = new Map<number, { index: number; subjectName: string; marks: number; instructions: string[]; medium: string; sections: ReturnType<typeof buildSections> }>();
    for (const section of sections) {
      const index = Number(section.row.componentIndex || 1);
      const component = group.components.find((item) => Number(item.componentIndex) === index);
      const current = map.get(index);
      if (current) { current.sections.push(section); current.marks += section.totalMarks; }
      else map.set(index, { index, subjectName: String(section.row.componentSubjectName || component?.subjectName || `Subject ${index}`), marks: section.totalMarks, instructions: Array.isArray(section.row.componentInstructions) ? section.row.componentInstructions : [], medium: String(component?.paper?.medium || ''), sections: [section] });
    }
    return [...map.values()].sort((a, b) => a.index - b.index);
  }, [paper, group]);
  return <>
    <div className="school-header"><h1>{group.schoolName || 'School Name'}</h1><p>{examLabels[group.exam] || group.exam || 'Examination'} {expandedAcademicYear(group.academicYear)}</p></div>
    <div className="paper-meta qp-student-paper-meta"><div><strong>{group.className || '-'}{divisionPrintSuffix(group.division)} • {group.groupName}</strong></div><div><span>Marks: {paper.totalMarks}</span><span>Time: {paper.durationMinutes} minutes</span></div></div>
    {!model && <div className="qp-student-fields qp-student-fields-with-separator"><span><b>Name:</b><i /></span><span><b>Roll No.:</b><i /></span><span><b>Date:</b><i /></span></div>}
    {model && <div className="qp-model-answer-title">MODEL ANSWER / ANSWER KEY</div>}
    {parts.map((part) => {
      const text = part.sections.flatMap((section) => section.items.map((q) => q.text)).join('\n');
      const presentation = resolveAcademicTextPresentation({ languageHint: part.medium, text });
      const prefix = sectionPrefix(presentation);
      return <section className="qp-combined-part" key={`${model ? 'model' : 'student'}-${part.index}`}>
        <div className="qp-combined-part-head"><strong>PART {String.fromCharCode(64 + part.index)} — {part.subjectName}</strong><span>{formatMarks(part.marks)}</span></div>
        {!model && part.instructions.length > 0 && <div className={`instructions ${presentation.className}`} dir={presentation.dir} lang={presentation.languageCode === 'auto' ? undefined : presentation.languageCode}><ol>{part.instructions.map((item, index) => <li key={index}>{item}</li>)}</ol></div>}
        <div className={`questions qp-sections ${model ? 'qp-model-answer-sections' : ''}`}>{part.sections.map((section) => <section className={`qp-section ${presentation.dir === 'rtl' ? 'qp-section-rtl' : 'qp-section-ltr'}`} key={`${part.index}-${section.sectionIndex}`}>
          <div className="qp-section-head"><div className={`qp-section-title ${presentation.className}`} dir={presentation.dir} lang={presentation.languageCode === 'auto' ? undefined : presentation.languageCode}><span className="qp-section-number">{prefix}{prefix === 'Q.' ? section.sectionIndex + 1 : ` ${section.sectionIndex + 1}`}:</span><span>{section.row.displayTitle || section.row.type}</span></div><strong className="qp-section-marks">{formatMarks(section.totalMarks)}</strong></div>
          {section.isMatch ? (model ? <MatchModelTable questions={section.items} label={correctLabel(presentation)} /> : <MatchStudentTable questions={section.items} label={answerLabel(presentation)} />) : <div className="qp-section-items">{section.items.map((q, itemIndex) => <div className={`qp-subquestion-row ${presentation.dir === 'rtl' ? 'qp-subquestion-rtl' : 'qp-subquestion-ltr'} ${model ? 'qp-model-answer-item' : ''}`} key={q.id}><span className="qp-subno">{itemIndex + 1}.</span><div className={`qbody ${presentation.className}`} dir={presentation.dir} lang={presentation.languageCode === 'auto' ? undefined : presentation.languageCode}><div className="question-text">{q.text}</div>{model ? <ModelResponse question={q} label={answerLabel(presentation)} presentation={presentation} /> : <StudentAnswerArea question={q} />}</div></div>)}</div>}
        </section>)}</div>
      </section>;
    })}
  </>;
}

export default function ClerkCombinedQuestionPaperDesk({ user }: { user: User }) {
  const [groups, setGroups] = useState<CombinedGroup[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true); setError('');
    try { const payload = await clerkApi<{ groups: CombinedGroup[] }>('/api/clerk/combined-question-papers-r33-19'); setGroups(Array.isArray(payload.groups) ? payload.groups : []); }
    catch (e: any) { setError(e?.message || 'Combined Question Paper queue could not be loaded.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [user.id]);

  const openGroup = async (group: CombinedGroup) => {
    setBusy(group.collaborationKey); setError('');
    try { const payload = await clerkApi<Detail>(`/api/clerk/combined-question-papers-r33-19/detail?collaborationKey=${encodeURIComponent(group.collaborationKey)}`); setDetail(payload); }
    catch (e: any) { setError(e?.message || 'Combined Paper detail could not be loaded.'); }
    finally { setBusy(''); }
  };
  const refreshCurrent = async () => { await load(); if (detail) { const key = detail.group.collaborationKey; const payload = await clerkApi<Detail>(`/api/clerk/combined-question-papers-r33-19/detail?collaborationKey=${encodeURIComponent(key)}`); setDetail(payload); } };
  const returnSection = async (component: CombinedComponent) => {
    if (!component.paperId) return;
    const reason = String(reasons[component.paperId] || '').trim();
    if (!reason) { setError('Enter a correction reason before returning the Subject section.'); return; }
    setBusy(component.paperId); setError('');
    try { await clerkApi('/api/clerk/combined-question-papers-r33-19/return', { method: 'POST', body: JSON.stringify({ paperId: component.paperId, reason }) }); setReasons((current) => ({ ...current, [component.paperId!]: '' })); await refreshCurrent(); }
    catch (e: any) { setError(e?.message || 'Section could not be returned.'); }
    finally { setBusy(''); }
  };
  const approve = async () => {
    if (!detail) return;
    setBusy('approve'); setError('');
    try { await clerkApi('/api/clerk/combined-question-papers-r33-19/approve', { method: 'POST', body: JSON.stringify({ collaborationKey: detail.group.collaborationKey }) }); await refreshCurrent(); }
    catch (e: any) { setError(e?.message || 'Combined Paper could not be approved.'); }
    finally { setBusy(''); }
  };

  if (loading) return <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-600"/><p className="mt-3 text-sm font-bold text-slate-600">Loading Combined Question Papers…</p></div>;

  return <div className="edx-teacher-ai space-y-6">
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="bg-slate-950 p-6 text-white sm:p-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-300"><ShieldCheck className="h-4 w-4"/>Clerk Final Assembly</div><h2 className="mt-2 text-2xl font-black">Combined Question Papers</h2><p className="mt-2 max-w-3xl text-xs leading-6 text-slate-300">When Hindi/Marathi, History/Civics or another Subject Group has different teachers, each Teacher submits only their own section here. Clerk reviews, returns corrections when needed, then combines and approves one Student Paper and one Model Answer Paper.</p></div><button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-black"><RefreshCw className="h-4 w-4"/>Refresh</button></div></div>
      <div className="p-5 sm:p-6">{error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</div>}
        <div className="space-y-3">{groups.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">No collaborative Combined Question Paper has been submitted yet.</div> : groups.map((group) => <div className="rounded-2xl border border-slate-200 p-4 sm:p-5" key={group.collaborationKey}><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-cyan-50 px-2 py-1 text-[10px] font-black text-cyan-700">{group.groupName}</span><span className={`rounded-full px-2 py-1 text-[10px] font-black ${group.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : group.status === 'returned' ? 'bg-rose-50 text-rose-700' : group.status === 'ready' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>{group.status.toUpperCase()}</span></div><h3 className="mt-2 font-black text-slate-900">{group.className}{divisionPrintSuffix(group.division)} · {examLabels[group.exam] || group.exam}</h3><p className="mt-1 text-xs text-slate-500">{group.combinedTotalMarks} marks · {group.durationMinutes} minutes</p><div className="mt-2 flex flex-wrap gap-2">{group.components.map((component) => <span key={component.subjectId} className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">Part {String.fromCharCode(64 + component.componentIndex)} {component.subjectName}: {component.status}</span>)}</div></div><button type="button" disabled={busy === group.collaborationKey} onClick={() => void openGroup(group)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50"><FileText className="h-4 w-4"/>{busy === group.collaborationKey ? 'Opening…' : 'Open Combined Paper'}</button></div></div>)}</div>
      </div>
    </div>

    {detail && <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><h2 className="text-xl font-black text-slate-950">{detail.group.groupName} · Clerk Review</h2><p className="mt-1 text-xs text-slate-500">{detail.group.className}{divisionPrintSuffix(detail.group.division)} · {examLabels[detail.group.exam] || detail.group.exam} · {detail.group.combinedTotalMarks} marks</p></div><div className="flex flex-wrap gap-2">{detail.group.status === 'ready' && <button type="button" disabled={busy === 'approve'} onClick={() => void approve()} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50"><CheckCircle2 className="h-4 w-4"/>{busy === 'approve' ? 'Approving…' : 'Approve & Combine'}</button>}{detail.group.status === 'approved' && detail.paper && <><SmartPrintDialog targetId="clerk-combined-question-paper-print" title={`${detail.group.groupName} — Question Paper`} moduleName="question-paper" buttonLabel="Student Paper PDF"/><SmartPrintDialog targetId="clerk-combined-model-answer-print" title={`${detail.group.groupName} — Model Answer`} moduleName="question-paper" buttonLabel="Model Answer PDF"/></>}</div></div>
      <div className="grid gap-3 lg:grid-cols-2">{detail.group.components.map((component) => <div key={component.subjectId} className={`rounded-2xl border p-4 ${component.status === 'returned' ? 'border-rose-200 bg-rose-50/40' : 'border-slate-200'}`}><div className="flex items-start justify-between gap-3"><div><strong className="text-sm text-slate-900">Part {String.fromCharCode(64 + component.componentIndex)} · {component.subjectName}</strong><p className="mt-1 text-[11px] text-slate-500">{component.teacherName || 'Assigned Teacher'} · {component.marks} marks</p></div><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-600">{component.status}</span></div>{component.returnReason && <div className="mt-3 rounded-xl bg-rose-100 p-2 text-[11px] font-bold text-rose-700">Returned: {component.returnReason}</div>}{component.paperId && component.status !== 'approved' && <div className="mt-4 space-y-2"><textarea value={reasons[component.paperId] || ''} onChange={(e) => setReasons((current) => ({ ...current, [component.paperId!]: e.target.value }))} placeholder="Correction reason for this Subject Teacher…" className="min-h-20 w-full rounded-xl border border-slate-200 p-3 text-xs"/><button type="button" disabled={busy === component.paperId} onClick={() => void returnSection(component)} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2 text-[11px] font-black text-rose-700 disabled:opacity-50"><RotateCcw className="h-3.5 w-3.5"/>Return Section for Correction</button></div>}</div>)}</div>
      {!detail.paper && <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Submitted sections will appear here as Teachers complete them.</div>}
      {detail.paper && <>
        <div id="clerk-combined-question-paper-print" data-review-status="final" className="paper-sheet print-root print-page qp-question-paper-document"><CombinedPaperDocument group={detail.group} paper={detail.paper}/></div>
        <div id="clerk-combined-model-answer-print" data-review-status="final" className="paper-sheet print-root print-page qp-model-answer-offscreen qp-question-paper-document" aria-hidden="true"><CombinedPaperDocument group={detail.group} paper={detail.paper} model/></div>
      </>}
    </div>}
  </div>;
}
