import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, ChevronDown, ChevronUp, Clock, FileText, Filter, Loader2, RefreshCw, Search, ShieldCheck, UserRound } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Language, User } from '../types';
import { requestActionConfirm } from '../lib/actionConfirm';

interface HeadmasterQuestionPaperReviewProps {
  lang: Language;
  user: User;
}

type PaperQuestion = {
  id: string;
  text: string;
  marks: number;
  type: string;
  order_no: number;
};

type CombinedComponent = { subjectId:string; subjectName:string; teacherName?:string; marks:number; status:string; paperId?:string; };
type CombinedRow = { collaborationKey:string; groupName:string; className:string; division:string; exam:string; combinedTotalMarks:number; durationMinutes:number; status:string; headmasterStatus:string; components:CombinedComponent[]; };

type PaperRow = {
  id: string;
  title: string;
  exam: string;
  total_marks: number;
  duration_minutes: number;
  medium: string;
  review_status: 'teacher_reviewed' | 'final';
  updated_at: string;
  teacher_name: string;
  academic_year?: string | null;
  class_name?: string | null;
  division?: string | null;
  subject_name?: string | null;
  chapters?: string[];
  questions?: PaperQuestion[];
};

const examLabel = (value: string) => ({
  first_unit_test: 'First Unit Test',
  first_term_examination: 'First Term Examination',
  second_unit_test: 'Second Unit Test',
  second_term_examination: 'Second Term Examination'
}[value] || value.replaceAll('_', ' '));

export default function HeadmasterQuestionPaperReview({ lang, user }: HeadmasterQuestionPaperReviewProps) {
  const [papers, setPapers] = useState<PaperRow[]>([]);
  const [combinedGroups, setCombinedGroups] = useState<CombinedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'teacher_reviewed' | 'final'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState<string | null>(null);

  const secureFetch = async (url: string, init: RequestInit = {}) => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token) throw new Error('Secure Headmaster session is unavailable.');
    const response = await fetch(url, {
      ...init,
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init.headers || {}),
        Authorization: `Bearer ${session.access_token}`
      }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Question Paper service request failed.');
    return payload;
  };

  const load = async () => {
    setLoading(true); setError('');
    try {
      const payload = await secureFetch('/api/headmaster/question-papers');
      setPapers(Array.isArray(payload.papers) ? payload.papers : []);
      try {
        const combinedPayload = await secureFetch('/api/headmaster/combined-question-papers-r33-29');
        setCombinedGroups(Array.isArray(combinedPayload.groups) ? combinedPayload.groups : []);
      } catch {
        // Combined-paper access is additive; a school without that entitlement
        // must still retain the existing single-subject Question Paper desk.
        setCombinedGroups([]);
      }
    } catch (e: any) {
      setError(e?.message || 'Question Papers could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return papers.filter(paper => {
      if (status !== 'all' && paper.review_status !== status) return false;
      if (!needle) return true;
      return [paper.title, paper.teacher_name, paper.subject_name, paper.class_name, paper.division, examLabel(paper.exam)]
        .filter(Boolean).join(' ').toLowerCase().includes(needle);
    });
  }, [papers, query, status]);

  const finalizePaper = async (paper: PaperRow) => {
    if (paper.review_status === 'final' || finalizing) return;
    const confirmed = await requestActionConfirm({ title: 'Finalize question paper?', message: `Finalize “${paper.title}”?\n\nAfter finalization this paper is treated as the approved audit document. Teacher source data and questions will not be edited here.`, confirmLabel: 'Finalize Paper', tone: 'warning' });
    if (!confirmed) return;
    setFinalizing(paper.id); setError('');
    try {
      await secureFetch(`/api/headmaster/question-papers/${encodeURIComponent(paper.id)}/finalize`, { method: 'POST' });
      setPapers(current => current.map(item => item.id === paper.id ? { ...item, review_status: 'final' } : item));
    } catch (e: any) {
      setError(e?.message || 'Question Paper could not be finalized.');
    } finally {
      setFinalizing(null);
    }
  };

  const reviewedCount = papers.filter(p => p.review_status === 'teacher_reviewed').length;
  const finalCount = papers.filter(p => p.review_status === 'final').length;
  const combinedReadyCount = combinedGroups.filter(g => g.headmasterStatus === 'approved').length;
  const combinedFinalCount = combinedGroups.filter(g => g.headmasterStatus === 'final').length;
  const finalizeCombined = async (group: CombinedRow) => {
    if (group.headmasterStatus === 'final' || finalizing) return;
    const confirmed = await requestActionConfirm({ title: 'Finalize combined question paper?', message: `Finalize “${group.groupName}” for ${group.className}${group.division ? ` / ${group.division}` : ''}?\n\nThe Clerk-approved combined paper will become the final audit document.`, confirmLabel: 'Finalize Combined Paper', tone: 'warning' });
    if (!confirmed) return;
    setFinalizing(group.collaborationKey); setError('');
    try {
      await secureFetch('/api/headmaster/combined-question-papers-r33-29/finalize', { method: 'POST', body: JSON.stringify({ collaborationKey: group.collaborationKey }) });
      setCombinedGroups(current => current.map(item => item.collaborationKey === group.collaborationKey ? { ...item, headmasterStatus: 'final' } : item));
    } catch (e: any) { setError(e?.message || 'Combined Question Paper could not be finalized.'); }
    finally { setFinalizing(null); }
  };

  return (
    <div className="space-y-5 text-left">
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-6 text-white shadow-xl">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-200">
              <ShieldCheck className="h-4 w-4" /> Headmaster Academic Control
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Question Paper Review & Finalization</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Reviews the same cloud Question Papers saved by Teachers. Finalization changes only approval status; Teacher assignment, study-material scope and question content remain immutable from this desk.</p>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/15 disabled:opacity-60">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Cloud Queue
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Total Papers</div><div className="mt-1 text-2xl font-black text-slate-900">{papers.length}</div></div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm"><div className="text-[11px] font-bold uppercase tracking-wide text-amber-700">Ready for Headmaster</div><div className="mt-1 text-2xl font-black text-amber-900">{reviewedCount}</div></div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm"><div className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Final</div><div className="mt-1 text-2xl font-black text-emerald-900">{finalCount}</div></div>
      </div>

      {combinedGroups.length > 0 && <div className="space-y-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><div className="text-[11px] font-black uppercase tracking-wide text-cyan-700">Combined Subject Papers</div><div className="mt-1 text-sm font-bold text-cyan-950">Clerk-approved combined papers are finalized here.</div></div>
          <div className="text-xs font-bold text-cyan-800">{combinedReadyCount} ready · {combinedFinalCount} final</div>
        </div>
        {combinedGroups.map(group => <div key={group.collaborationKey} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-cyan-100 px-2.5 py-1 text-[10px] font-black uppercase text-cyan-700">{group.groupName}</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${group.headmasterStatus === 'final' ? 'bg-emerald-100 text-emerald-700' : group.headmasterStatus === 'approved' ? 'bg-amber-100 text-amber-700' : group.status === 'ready' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{group.headmasterStatus === 'final' ? 'Final' : group.headmasterStatus === 'approved' ? 'Ready for Finalization' : group.status}</span></div>
                <h3 className="mt-2 text-base font-bold text-slate-900">{group.className}{group.division ? ` / ${group.division}` : ''} · {examLabel(group.exam)}</h3>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600"><span>{group.combinedTotalMarks} marks</span><span>{group.durationMinutes} min</span><span>{group.components.map(c => `${c.subjectName}: ${c.marks}`).join(' · ')}</span></div>
              </div>
              <button type="button" disabled={group.headmasterStatus !== 'approved' || finalizing === group.collaborationKey} onClick={() => void finalizeCombined(group)} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50">{finalizing === group.collaborationKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{group.headmasterStatus === 'final' ? 'Finalized' : 'Finalize Combined Paper'}</button>
            </div>
          </div>
        </div>)}
      </div>}

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search teacher, class, subject or paper…" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-400" /></div>
        <div className="flex items-center gap-2"><Filter className="h-4 w-4 text-slate-400" /><select value={status} onChange={e => setStatus(e.target.value as any)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700"><option value="all">All statuses</option><option value="teacher_reviewed">Teacher reviewed</option><option value="final">Final</option></select></div>
      </div>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}
      {loading ? (
        <div className="flex min-h-56 items-center justify-center rounded-2xl border border-slate-200 bg-white"><Loader2 className="h-7 w-7 animate-spin text-indigo-600" /></div>
      ) : !filtered.length ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><BookOpen className="mx-auto h-10 w-10 text-slate-300" /><h3 className="mt-3 font-bold text-slate-700">No matching Question Papers</h3><p className="mt-1 text-xs text-slate-500">Teacher-reviewed papers will appear here from the shared cloud Question Paper workflow.</p></div>
      ) : (
        <div className="space-y-3">
          {filtered.map(paper => {
            const open = expanded === paper.id;
            return <div key={paper.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${paper.review_status === 'final' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{paper.review_status === 'final' ? 'Final' : 'Teacher Reviewed'}</span>
                      <span className="text-[11px] font-semibold text-slate-400">{paper.academic_year || 'Academic year —'}</span>
                    </div>
                    <h3 className="mt-2 truncate text-base font-bold text-slate-900">{paper.title}</h3>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5" />{paper.teacher_name}</span>
                      <span className="inline-flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" />{paper.class_name || 'Class —'}{paper.division ? ` / ${paper.division}` : ''} · {paper.subject_name || 'Subject —'}</span>
                      <span className="inline-flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" />{examLabel(paper.exam)} · {paper.total_marks} marks</span>
                      <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{paper.duration_minutes} min</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => setExpanded(open ? null : paper.id)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">{open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}{open ? 'Hide Paper' : 'Review Paper'}</button>
                    <button type="button" disabled={paper.review_status === 'final' || finalizing === paper.id} onClick={() => void finalizePaper(paper)} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
                      {finalizing === paper.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{paper.review_status === 'final' ? 'Finalized' : 'Finalize'}
                    </button>
                  </div>
                </div>
              </div>
              {open && <div className="border-t border-slate-100 bg-slate-50/70 p-4 sm:p-5">
                {!!paper.chapters?.length && <div className="mb-4 text-xs text-slate-600"><strong>Selected chapters:</strong> {paper.chapters.join(', ')}</div>}
                <div className="space-y-2">
                  {(paper.questions || []).length ? paper.questions!.map(question => <div key={question.id} className="grid grid-cols-[auto_1fr_auto] gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm"><div className="font-black text-slate-400">{question.order_no}.</div><div><div className="font-medium text-slate-800">{question.text}</div><div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{question.type}</div></div><div className="whitespace-nowrap rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{question.marks} mark{Number(question.marks) === 1 ? '' : 's'}</div></div>) : <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-xs text-slate-500">No question rows were returned for this paper.</div>}
                </div>
              </div>}
            </div>;
          })}
        </div>
      )}
    </div>
  );
}
