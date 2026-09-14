import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BookOpenCheck,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  Loader2,
  RefreshCw,
  Save,
  Search,
  Star,
  Trophy,
  UsersRound,
} from 'lucide-react';
import type { AttendanceStudent, TeacherCloudContext, TeacherScopeAssignment } from '../teacherFresh/types';
import type { RecognitionPeriodType, RecognitionScores, StudentSubjectPerformance } from './types';
import {
  EMPTY_RECOGNITION_SCORES,
  loadAssignedStudents,
  loadRecognitionRatings,
  loadStudentSubjectPerformance,
  saveRecognitionRating,
} from './teacherStudentsService';
import { scoreTotal } from './recognitionMath';
import { divisionScreenLabel } from '../../lib/divisionPresentation';

export type TeacherStudentsView = 'student_list' | 'performance';

type Props = {
  context: TeacherCloudContext | null;
  loading: boolean;
  error?: string;
  view: TeacherStudentsView;
};

const assignmentKey = (a: TeacherScopeAssignment) => [a.classId, a.divisionId || '', a.subjectId].join('|');
const localMonthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const ScoreSelect = ({ value, onChange, label }: { value: number; onChange: (value: number) => void; label: string }) => (
  <label className="block min-w-[82px]">
    <span className="sr-only">{label}</span>
    <select
      value={value}
      onChange={event => onChange(Number(event.target.value))}
      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-extrabold text-slate-800 outline-none focus:border-cyan-400"
    >
      {[0, 1, 2, 3, 4, 5].map(star => <option key={star} value={star}>{star} ★</option>)}
    </select>
  </label>
);

function AssignmentPicker({ assignments, selectedId, onSelect }: { assignments: TeacherScopeAssignment[]; selectedId: string; onSelect: (id: string) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {assignments.map(assignment => {
        const selected = assignment.id === selectedId;
        return (
          <button
            key={assignment.id}
            type="button"
            onClick={() => onSelect(assignment.id)}
            className={`rounded-2xl border p-4 text-left transition ${selected ? 'border-cyan-400 bg-cyan-50 shadow-sm' : 'border-slate-200 bg-white hover:border-cyan-200'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-[.14em] text-cyan-700">{assignment.className} · {divisionScreenLabel(assignment.division)}</div>
                <div className="mt-1 truncate text-sm font-black text-slate-950">{assignment.subjectName}</div>
                <div className="mt-2 text-[10px] font-semibold text-slate-500">{assignment.studentCount ?? '—'} students · {assignment.academicYear}</div>
              </div>
              <ChevronRight className={`mt-1 h-4 w-4 shrink-0 ${selected ? 'text-cyan-700' : 'text-slate-300'}`} />
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default function TeacherMyStudents({ context, loading, error, view }: Props) {
  const assignments = useMemo(() => {
    const subjectSeen = new Set<string>();
    const subjectAssignments = (context?.assignments || [])
      .filter(item => item.scopeType === 'subject' && item.subjectId)
      .filter(item => {
        const key = assignmentKey(item);
        if (subjectSeen.has(key)) return false;
        subjectSeen.add(key);
        return true;
      });

    // Performance/recognition is subject-owned. Student List, however, must also
    // expose the full Class Teacher roster even when that teacher has no subject
    // allocation for the class. A Class Teacher duty is an independent scope.
    if (view === 'performance') return subjectAssignments;

    const classSeen = new Set<string>();
    const classTeacherRosters = (context?.assignments || [])
      .filter(item => item.isClassTeacher)
      .filter(item => {
        const key = `${item.classId}|${item.divisionId || ''}`;
        if (classSeen.has(key)) return false;
        classSeen.add(key);
        return true;
      })
      .map(item => ({
        ...item,
        id: `class-roster:${item.classId}:${item.divisionId || 'all'}`,
        scopeType: 'class_teacher' as const,
        subjectId: '',
        subjectName: 'Full Class Roster',
        isClassTeacher: true,
      }));

    return [...classTeacherRosters, ...subjectAssignments];
  }, [context, view]);
  const [selectedId, setSelectedId] = useState('');
  const selected = assignments.find(item => item.id === selectedId) || assignments[0] || null;
  const [students, setStudents] = useState<AttendanceStudent[]>([]);
  const [performance, setPerformance] = useState<StudentSubjectPerformance[]>([]);
  const [recognitionBackendReady, setRecognitionBackendReady] = useState(true);
  const [resultBackendReady, setResultBackendReady] = useState(true);
  const [ratings, setRatings] = useState<Record<string, RecognitionScores>>({});
  const [existingRatingIds, setExistingRatingIds] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [savingId, setSavingId] = useState('');
  const [query, setQuery] = useState('');
  const [notificationFocusStudentId, setNotificationFocusStudentId] = useState('');
  const [notificationFocusReason, setNotificationFocusReason] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [periodType, setPeriodType] = useState<RecognitionPeriodType>('month');
  const [periodKey, setPeriodKey] = useState(localMonthKey());

  useEffect(() => {
    if (!selectedId && assignments[0]) setSelectedId(assignments[0].id);
    if (selectedId && !assignments.some(item => item.id === selectedId)) setSelectedId(assignments[0]?.id || '');
  }, [assignments, selectedId]);

  useEffect(() => {
    if (view !== 'student_list') return;
    try {
      const raw = sessionStorage.getItem('edunixo.teacher.roster.focus');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.studentId) {
        setNotificationFocusStudentId(String(parsed.studentId));
        setNotificationFocusReason(String(parsed.reason || ''));
      }
      sessionStorage.removeItem('edunixo.teacher.roster.focus');
    } catch {
      sessionStorage.removeItem('edunixo.teacher.roster.focus');
    }
  }, [view]);

  useEffect(() => {
    if (periodType === 'year' && context?.academicYear) setPeriodKey(context.academicYear);
    if (periodType === 'month' && !/^\d{4}-\d{2}$/.test(periodKey)) setPeriodKey(localMonthKey());
  }, [periodType, context?.academicYear]);

  const load = async () => {
    if (!context || !selected) return;
    setBusy(true);
    setMessage(null);
    try {
      const roster = await loadAssignedStudents(selected);
      setStudents(roster);
      if (view === 'performance') {
        const [result, recognition] = await Promise.all([
          loadStudentSubjectPerformance(context, selected, roster),
          loadRecognitionRatings(context, selected, periodType, periodKey),
        ]);
        setPerformance(result.rows);
        setResultBackendReady(result.backendReady);
        setRecognitionBackendReady(recognition.backendReady);
        const nextRatings: Record<string, RecognitionScores> = {};
        const ids = new Set<string>();
        for (const row of recognition.ratings) {
          nextRatings[row.studentId] = {
            academicPerformance: row.academicPerformance,
            improvement: row.improvement,
            consistency: row.consistency,
            participation: row.participation,
            homework: row.homework,
          };
          ids.add(row.studentId);
        }
        setRatings(nextRatings);
        setExistingRatingIds(ids);
        setDirty(new Set());
      }
    } catch (cause: any) {
      setStudents([]);
      setPerformance([]);
      setMessage({ type: 'error', text: cause?.message || 'Unable to load assigned students.' });
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { void load(); }, [context?.userId, selected?.id, view, periodType, periodKey]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return students;
    return students.filter(student => [student.fullName, student.grNumber, student.rollNumber]
      .some(value => String(value || '').toLowerCase().includes(needle)));
  }, [students, query]);

  const performanceByStudent = useMemo(() => new Map(performance.map(item => [item.studentId, item])), [performance]);
  const getScores = (studentId: string) => ratings[studentId] || EMPTY_RECOGNITION_SCORES;
  const updateScore = (studentId: string, field: keyof RecognitionScores, value: number) => {
    setRatings(current => ({ ...current, [studentId]: { ...(current[studentId] || EMPTY_RECOGNITION_SCORES), [field]: value } }));
    setDirty(current => new Set(current).add(studentId));
  };

  const saveOne = async (student: AttendanceStudent, quiet = false) => {
    if (!context || !selected) return;
    setSavingId(student.id);
    if (!quiet) setMessage(null);
    try {
      const saved = await saveRecognitionRating({ context, assignment: selected, student, periodType, periodKey, scores: getScores(student.id) });
      setRatings(current => ({ ...current, [student.id]: {
        academicPerformance: saved.academicPerformance,
        improvement: saved.improvement,
        consistency: saved.consistency,
        participation: saved.participation,
        homework: saved.homework,
      } }));
      setExistingRatingIds(current => new Set(current).add(student.id));
      setDirty(current => { const next = new Set(current); next.delete(student.id); return next; });
      setRecognitionBackendReady(true);
      if (!quiet) setMessage({ type: 'success', text: `${student.fullName}: performance stars saved.` });
    } catch (cause: any) {
      setMessage({ type: 'error', text: cause?.message || 'Unable to save performance stars.' });
      throw cause;
    } finally {
      setSavingId('');
    }
  };

  const saveAll = async () => {
    const pending = students.filter(student => dirty.has(student.id));
    if (!pending.length) return;
    setBusy(true);
    setMessage(null);
    try {
      for (const student of pending) await saveOne(student, true);
      setMessage({ type: 'success', text: `${pending.length} student rating${pending.length === 1 ? '' : 's'} saved for ${periodType === 'month' ? periodKey : context?.academicYear}.` });
    } catch {
      // saveOne already exposes the exact backend error.
    } finally {
      setBusy(false);
    }
  };

  const localTop = useMemo(() => students
    .map(student => ({ student, points: scoreTotal(getScores(student.id)), saved: existingRatingIds.has(student.id) || dirty.has(student.id) }))
    .filter(item => item.saved && item.points > 0)
    .sort((a, b) => b.points - a.points || a.student.fullName.localeCompare(b.student.fullName))
    .slice(0, 5), [students, ratings, existingRatingIds, dirty]);

  if (loading) return <div className="grid min-h-64 place-items-center"><Loader2 className="h-8 w-8 animate-spin text-cyan-600" /></div>;
  if (error && !context) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-800">{error}</div>;
  if (!context) return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Teacher scope is unavailable.</div>;

  return (
    <div className="space-y-5 text-left">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-950 to-slate-800 px-5 py-5 text-white sm:px-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-cyan-300"><UsersRound className="h-4 w-4" /> My Students</div>
              <h1 className="mt-2 text-2xl font-black">{view === 'student_list' ? (selected?.scopeType === 'class_teacher' ? 'Full Class Roster' : 'Class / Subject Student List') : 'Performance Summary & Recognition'}</h1>
              <p className="mt-2 max-w-3xl text-xs leading-6 text-slate-300">Only Headmaster-assigned Class / Division / Subject scopes are available. Other school students cannot be browsed from this workspace.</p>
            </div>
            <button type="button" onClick={() => void load()} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-black hover:bg-white/15 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} /> Refresh</button>
          </div>
        </div>
        <div className="p-5 sm:p-7">
          {!assignments.length ? (
            <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-6 text-sm font-semibold text-amber-900">{view === 'student_list' ? 'No Class Teacher or Subject Teacher allocation is linked to this Teacher account. My Students never opens an unassigned class.' : 'No Subject Allocation is linked to this Teacher account. Subject performance is available only for Headmaster-assigned subjects.'}</div>
          ) : <AssignmentPicker assignments={assignments} selectedId={selected?.id || ''} onSelect={setSelectedId} />}
        </div>
      </section>

      {message && <div className={`rounded-2xl border px-4 py-3 text-xs font-bold ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>{message.text}</div>}

      {selected && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[.14em] text-slate-400">{selected.scopeType === 'class_teacher' ? 'Current Class Teacher Scope' : 'Current Subject Scope'}</div>
              <h2 className="mt-1 text-xl font-black text-slate-950">{selected.className} · {divisionScreenLabel(selected.division)} · {selected.subjectName}</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">{students.length} assigned students</p>
            </div>
            <label className="relative block w-full lg:w-80"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search student / GR / roll no." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-xs font-semibold outline-none focus:border-cyan-400 focus:bg-white" /></label>
          </div>

          {busy && !students.length ? <div className="grid min-h-56 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-cyan-600" /></div> : null}

          {view === 'student_list' && notificationFocusStudentId && (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-900">
              {notificationFocusReason === 'new_admission' ? 'Opened from New Admission notification. The newly admitted Student is highlighted below.' : 'Opened from a Student notification.'}
            </div>
          )}

          {view === 'student_list' && (
            <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-slate-950 text-white"><tr><th className="px-4 py-3">Roll No.</th><th className="px-4 py-3">GR No.</th><th className="px-4 py-3">Student Name</th><th className="px-4 py-3">Class / Division</th><th className="px-4 py-3">Status</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{filtered.map(student => <tr key={student.id} className={student.id === notificationFocusStudentId ? 'bg-emerald-50 ring-1 ring-inset ring-emerald-200' : 'bg-white hover:bg-slate-50'}><td className="px-4 py-3 font-black text-slate-700">{student.rollNumber || '—'}</td><td className="px-4 py-3 font-mono text-[11px] font-bold text-slate-600">{student.grNumber || '—'}</td><td className="px-4 py-3 font-black text-slate-950">{student.fullName}</td><td className="px-4 py-3 font-semibold text-slate-600">{selected.className} · {divisionScreenLabel(selected.division)}</td><td className="px-4 py-3"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700">{student.status || 'Active'}</span></td></tr>)}</tbody>
              </table>
              {!filtered.length && <div className="p-8 text-center text-xs font-semibold text-slate-500">No assigned student matches this search.</div>}
            </div>
          )}

          {view === 'performance' && (
            <div className="mt-5 space-y-5">
              <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[1fr_auto] lg:items-end">
                <div className="grid gap-3 sm:grid-cols-2 lg:max-w-xl">
                  <label><span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">Recognition Period</span><select value={periodType} onChange={event => setPeriodType(event.target.value as RecognitionPeriodType)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-black"><option value="month">Student of the Month</option><option value="year">Student of the Year</option></select></label>
                  {periodType === 'month' ? <label><span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">Month</span><input type="month" value={periodKey} onChange={event => setPeriodKey(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-black" /></label> : <label><span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">Academic Year</span><div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-black text-slate-700">{context.academicYear}</div></label>}
                </div>
                <button type="button" disabled={!dirty.size || busy || !recognitionBackendReady} onClick={() => void saveAll()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40"><Save className="h-4 w-4" /> Save All Changed Ratings ({dirty.size})</button>
              </div>

              {!recognitionBackendReady && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold leading-5 text-amber-900"><strong>Recognition setup pending:</strong> Student list and Result performance work, but Stars cannot be saved until the R5 My Students Supabase table is installed.</div>}
              {!resultBackendReady && <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs font-semibold leading-5 text-slate-600">Result marks are not available from the Result cloud workflow yet. Recognition Stars remain separate and can still be used after the R5 recognition table is installed.</div>}

              {localTop.length > 0 && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><div className="flex items-center gap-2 text-xs font-black text-amber-900"><Trophy className="h-4 w-4" /> Current {selected.subjectName} Top Performers</div><div className="mt-3 flex flex-wrap gap-2">{localTop.map((item, index) => <span key={item.student.id} className="rounded-full border border-amber-200 bg-white px-3 py-1.5 text-[10px] font-black text-amber-900">#{index + 1} {item.student.fullName} · {item.points}/25</span>)}</div></div>}

              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-[1180px] w-full text-left text-xs">
                  <thead className="bg-slate-950 text-white"><tr><th className="px-3 py-3">Student</th><th className="px-3 py-3 text-center">First Term</th><th className="px-3 py-3 text-center">Second Term</th><th className="px-3 py-3">Academic ★</th><th className="px-3 py-3">Improvement ★</th><th className="px-3 py-3">Consistency ★</th><th className="px-3 py-3">Participation ★</th><th className="px-3 py-3">Homework ★</th><th className="px-3 py-3 text-center">Total</th><th className="px-3 py-3 text-center">Save</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">{filtered.map(student => {
                    const perf = performanceByStudent.get(student.id);
                    const scores = getScores(student.id);
                    const total = scoreTotal(scores);
                    const changed = dirty.has(student.id);
                    const saved = existingRatingIds.has(student.id);
                    return <tr key={student.id} className={changed ? 'bg-cyan-50/50' : 'bg-white'}><td className="px-3 py-3"><div className="font-black text-slate-950">{student.fullName}</div><div className="mt-1 text-[10px] font-semibold text-slate-400">Roll {student.rollNumber || '—'} · GR {student.grNumber || '—'}</div></td><td className="px-3 py-3 text-center"><span className="font-black text-slate-800">{perf?.firstTermPercent != null ? `${perf.firstTermPercent}%` : perf?.firstTermGrade || '—'}</span></td><td className="px-3 py-3 text-center"><span className="font-black text-slate-800">{perf?.secondTermPercent != null ? `${perf.secondTermPercent}%` : perf?.secondTermGrade || '—'}</span></td><td className="px-3 py-3"><ScoreSelect label="Academic Performance" value={scores.academicPerformance} onChange={value => updateScore(student.id, 'academicPerformance', value)} /></td><td className="px-3 py-3"><ScoreSelect label="Improvement" value={scores.improvement} onChange={value => updateScore(student.id, 'improvement', value)} /></td><td className="px-3 py-3"><ScoreSelect label="Consistency" value={scores.consistency} onChange={value => updateScore(student.id, 'consistency', value)} /></td><td className="px-3 py-3"><ScoreSelect label="Class Participation" value={scores.participation} onChange={value => updateScore(student.id, 'participation', value)} /></td><td className="px-3 py-3"><ScoreSelect label="Homework / Assignment" value={scores.homework} onChange={value => updateScore(student.id, 'homework', value)} /></td><td className="px-3 py-3 text-center"><div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 font-black text-amber-800"><Star className="h-3.5 w-3.5 fill-current" /> {total}/25</div>{saved && !changed && <div className="mt-1 text-[9px] font-black uppercase tracking-wider text-emerald-600">Saved</div>}</td><td className="px-3 py-3 text-center"><button type="button" disabled={savingId === student.id || !recognitionBackendReady || (!changed && saved)} onClick={() => void saveOne(student)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-slate-800 disabled:opacity-35">{savingId === student.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Save</button></td></tr>;
                  })}</tbody>
                </table>
                {!filtered.length && <div className="p-8 text-center text-xs font-semibold text-slate-500">No assigned student matches this search.</div>}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4 text-xs leading-5 text-cyan-950"><div className="flex items-center gap-2 font-black"><Award className="h-4 w-4" /> Fair recognition rule</div><p className="mt-2 font-semibold">Every subject contributes a maximum of 25 points. Headmaster ranking uses the average across submitted subjects, so one Teacher cannot receive extra weight simply by entering a larger raw score.</p></div>
                <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4 text-xs leading-5 text-violet-950"><div className="flex items-center gap-2 font-black"><BookOpenCheck className="h-4 w-4" /> Result marks stay separate</div><p className="mt-2 font-semibold">First/Second Term marks are evidence for the Subject Teacher. They are not silently mixed into Recognition Stars; Headmaster can compare both without a hidden weighting formula.</p></div>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
