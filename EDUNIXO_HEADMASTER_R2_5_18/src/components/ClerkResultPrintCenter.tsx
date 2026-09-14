import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FileText, Loader2, Printer, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import type { User } from '../types';
import { supabase } from '../lib/supabase';
import { openSmartPrint } from '../lib/smartPrint';

type QueueItem = {
  id: string;
  academic_year_id: string;
  class_id: string;
  division_id?: string | null;
  term: string;
  item_type: 'subject_mark_list' | 'result_book' | 'progress_card';
  source_id: string;
  subject_name?: string | null;
  status: 'ready' | 'printed' | 'archived';
  created_at?: string | null;
  printed_at?: string | null;
};

type SubjectList = {
  id: string; subject_name: string; term: string; status: string; template_snapshot?: any; section_key?: string;
  class_id: string; division_id?: string | null; academic_year_id: string; teacher_user_id?: string;
};

type ResultBook = {
  id: string; term: string; status: string; class_id: string; division_id?: string | null; academic_year_id: string;
  consolidated?: Record<string, Record<string, any>>; column_schema?: Array<any>; sent_at?: string | null;
};

type Preview = { type: 'subject_mark_list' | 'result_book'; title: string; rows: any[]; columns: Array<{ key: string; label: string; maxMarks?: number | null }> } | null;

const missingTable = (error: any) => /does not exist|schema cache|could not find|relation .* does not exist/i.test(String(error?.message || ''));
const termLabel = (term: string) => term === 'first_term' ? 'First Term' : term === 'second_term' ? 'Second Term' : term;
const itemLabel = (type: string) => type === 'subject_mark_list' ? 'Subject Mark List' : type === 'result_book' ? 'Result Book' : 'Progress Card';

export default function ClerkResultPrintCenter({ user, activeFeatureId }: { user: User; activeFeatureId?: string | null }) {
  const [schoolId, setSchoolId] = useState('');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [classNames, setClassNames] = useState<Record<string, string>>({});
  const [divisionNames, setDivisionNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState('');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [preview, setPreview] = useState<Preview>(null);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const membership = await supabase.from('user_school_memberships').select('school_id').eq('user_id', user.id).eq('is_active', true).maybeSingle();
      if (membership.error || !membership.data?.school_id) throw membership.error || new Error('Active school membership was not found.');
      const sid = String(membership.data.school_id); setSchoolId(sid);
      const [q, cls, div] = await Promise.all([
        supabase.from('edunixo_result_print_queue').select('*').eq('school_id', sid).neq('status', 'archived').order('created_at', { ascending: false }).limit(1000),
        supabase.from('school_classes').select('id,class_name').eq('school_id', sid),
        supabase.from('school_divisions').select('id,division_name').eq('school_id', sid),
      ]);
      if (q.error) {
        if (missingTable(q.error)) throw new Error('Cloud Result Print Queue is not installed yet. Run the approved Result Management cloud setup before using Clerk Result Printing.');
        throw q.error;
      }
      setQueue((q.data || []) as QueueItem[]);
      if (!cls.error) setClassNames(Object.fromEntries((cls.data || []).map((row: any) => [String(row.id), String(row.class_name || 'Class')])));
      if (!div.error) setDivisionNames(Object.fromEntries((div.data || []).map((row: any) => [String(row.id), String(row.division_name || 'Division')])));
    } catch (e: any) {
      setError(e?.message || 'Clerk Result Print Queue could not be loaded.');
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [user.id]);

  const visibleQueue = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = queue;
    if (!needle) return rows;
    return rows.filter(item => [itemLabel(item.item_type), item.subject_name, classNames[item.class_id], divisionNames[item.division_id || ''], termLabel(item.term), item.status]
      .some(value => String(value || '').toLowerCase().includes(needle)));
  }, [queue, query, classNames, divisionNames]);

  const openPreview = async (item: QueueItem) => {
    setWorkingId(item.id); setError('');
    try {
      if (item.item_type === 'subject_mark_list') {
        const listRes = await supabase.from('edunixo_result_subject_lists').select('*').eq('id', item.source_id).eq('school_id', schoolId).maybeSingle();
        if (listRes.error) throw listRes.error;
        if (!listRes.data || listRes.data.status !== 'accepted') throw new Error('Only Class Teacher accepted Subject Mark Lists are available for Clerk printing.');
        const list = listRes.data as SubjectList;
        const marksRes = await supabase.from('edunixo_result_subject_marks').select('student_id,marks,computed').eq('list_id', list.id);
        if (marksRes.error) throw marksRes.error;
        const studentIds = (marksRes.data || []).map((row: any) => String(row.student_id)).filter(Boolean);
        const studentsRes = studentIds.length ? await supabase.from('students').select('id,full_name,first_name,middle_name,last_name,gr_number,roll_number,roll_no').eq('school_id', schoolId).in('id', studentIds) : { data: [], error: null } as any;
        if (studentsRes.error) throw studentsRes.error;
        const studentMap = new Map((studentsRes.data || []).map((row: any) => {
          const name = row.full_name || [row.first_name, row.middle_name, row.last_name].filter(Boolean).join(' ') || 'Student';
          return [String(row.id), { name, gr: row.gr_number || '', roll: row.roll_number ?? row.roll_no ?? '' }];
        }));
        const template: any = list.template_snapshot || {};
        const heads: any[] = Array.isArray(template.heads) ? template.heads.filter((head: any) => {
          if (list.section_key === 'hindi') return head.ownerSection === 'hindi';
          if (list.section_key === 'marathi') return head.ownerSection === 'marathi';
          return true;
        }) : [];
        const columns = heads.map((head: any) => ({ key: String(head.key), label: String(head.label || head.key), maxMarks: Number.isFinite(Number(head.maxMarks)) ? Number(head.maxMarks) : null }));
        const rows = (marksRes.data || []).map((row: any) => {
          const student = studentMap.get(String(row.student_id)) as any || {};
          const values = { ...(row.marks || {}), ...(row.computed || {}) };
          return { studentName: student.name || row.student_id, grNumber: student.gr || '', rollNumber: student.roll || '', ...values };
        });
        setPreview({ type: 'subject_mark_list', title: `${list.subject_name} · ${termLabel(list.term)}`, rows, columns });
      } else if (item.item_type === 'result_book') {
        const bookRes = await supabase.from('edunixo_result_books').select('*').eq('id', item.source_id).eq('school_id', schoolId).maybeSingle();
        if (bookRes.error) throw bookRes.error;
        const book: any = bookRes.data;
        if (!book || book.status !== 'sent_to_progress_card') throw new Error('Only Result Books sent by the Class Teacher to Progress Card / Clerk are printable here.');
        const columns = (Array.isArray(book.column_schema) ? book.column_schema : []).map((column: any) => ({ key: String(column.key), label: `${column.subjectName || ''}${column.label ? ` · ${column.label}` : ''}`, maxMarks: column.maxMarks ?? null }));
        const rows = Object.entries(book.consolidated || {}).map(([studentId, values]: [string, any]) => ({ studentId, ...(values || {}) }));
        setPreview({ type: 'result_book', title: `Result Book · ${termLabel(book.term)}`, rows, columns });
      } else {
        throw new Error('Progress Card printing remains in the Progress Card owner workflow.');
      }
      window.setTimeout(() => document.getElementById('clerk-cloud-result-preview')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    } catch (e: any) { setError(e?.message || 'Result item could not be opened.'); }
    finally { setWorkingId(''); }
  };

  const markPrinted = async (item: QueueItem) => {
    setWorkingId(item.id); setError('');
    try {
      const result = await supabase.from('edunixo_result_print_queue').update({ status: 'printed', printed_at: new Date().toISOString() }).eq('id', item.id).eq('school_id', schoolId).eq('status', 'ready').select('id').maybeSingle();
      if (result.error) throw result.error;
      await load();
    } catch (e: any) { setError(e?.message || 'Print status could not be updated.'); }
    finally { setWorkingId(''); }
  };

  if (loading) return <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-600"/><p className="mt-3 text-sm font-bold text-slate-600">Loading canonical cloud Result queue…</p></div>;

  return <div className="space-y-6">
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="bg-slate-950 p-6 text-white sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-300"><ShieldCheck className="h-4 w-4"/>Canonical Result Output</div><h2 className="mt-2 text-2xl font-black">Result Print Center</h2><p className="mt-2 max-w-3xl text-xs leading-6 text-slate-300">Reads the same cloud Result workflow used by Subject Teachers and Class Teachers. Clerk can print accepted/finalized-for-clerk records, but cannot alter marks or publish the final result.</p></div><button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-black"><RefreshCw className="h-4 w-4"/>Refresh</button></div>
      </div>
      <div className="p-5 sm:p-6">
        {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</div>}
        <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search class, subject, term or status…" className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm"/></div>
        <div className="mt-5 space-y-3">
          {visibleQueue.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">No cloud Result item is currently ready for this Clerk queue.</div> : visibleQueue.map(item => <div key={item.id} className="rounded-2xl border border-slate-200 p-4 sm:p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap gap-2"><span className="rounded-full bg-cyan-50 px-2 py-1 text-[10px] font-black text-cyan-700">{itemLabel(item.item_type)}</span><span className={`rounded-full px-2 py-1 text-[10px] font-black ${item.status === 'printed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{item.status}</span></div><h3 className="mt-2 font-black text-slate-900">{item.subject_name || itemLabel(item.item_type)}</h3><p className="mt-1 text-xs text-slate-500">{classNames[item.class_id] || `Class ${item.class_id}`} {item.division_id ? `· ${divisionNames[item.division_id] || item.division_id}` : ''} · {termLabel(item.term)}</p></div><div className="flex flex-wrap gap-2"><button type="button" disabled={workingId === item.id || item.item_type === 'progress_card'} onClick={() => void openPreview(item)} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white disabled:opacity-40"><FileText className="h-4 w-4"/>Open</button>{item.status === 'ready' && item.item_type !== 'progress_card' && <button type="button" disabled={workingId === item.id} onClick={() => void markPrinted(item)} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-black text-emerald-700 disabled:opacity-40"><CheckCircle2 className="h-4 w-4"/>Mark Printed</button>}</div></div></div>)}
        </div>
      </div>
    </div>

    {preview && <div id="clerk-cloud-result-preview" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="clerk-print-actions mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-black text-slate-950">{preview.title}</h2><p className="mt-1 text-xs text-slate-500">Read-only cloud copy · source marks cannot be edited by Clerk.</p></div><button type="button" onClick={() => openSmartPrint({ elementId: 'clerk-cloud-result-preview', title: preview.title, moduleName: 'Result Printing' })} className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-xs font-black text-white"><Printer className="h-4 w-4"/>Smart Print / PDF</button></div><div className="overflow-x-auto"><table className="min-w-full border-collapse text-[10px]"><thead><tr><th className="border border-slate-300 bg-slate-100 p-2 text-left">Roll</th><th className="border border-slate-300 bg-slate-100 p-2 text-left">GR</th><th className="border border-slate-300 bg-slate-100 p-2 text-left">Student</th>{preview.columns.map(column => <th key={column.key} className="border border-slate-300 bg-slate-100 p-2 text-center">{column.label}{column.maxMarks != null ? <div className="text-[8px] font-normal text-slate-500">/{column.maxMarks}</div> : null}</th>)}</tr></thead><tbody>{preview.rows.map((row: any, index) => <tr key={row.studentId || `${row.grNumber || ''}-${index}`}><td className="border border-slate-300 p-2">{row.rollNumber ?? ''}</td><td className="border border-slate-300 p-2">{row.grNumber ?? ''}</td><td className="border border-slate-300 p-2 font-semibold">{row.studentName ?? row.studentId ?? ''}</td>{preview.columns.map(column => <td key={column.key} className="border border-slate-300 p-2 text-center">{row[column.key] ?? ''}</td>)}</tr>)}</tbody></table></div></div>}
  </div>;
}
