import React, { useEffect, useMemo, useState } from 'react';
import { Award, ChevronDown, ChevronRight, Loader2, RefreshCw, Star, Trophy } from 'lucide-react';
import type { User } from '../../types';
import type { HeadmasterRecognitionRow, RecognitionPeriodType } from './types';
import { loadHeadmasterRecognitionRankings, resolveHeadmasterRecognitionContext } from './teacherStudentsService';
import { divisionScreenLabel } from '../../lib/divisionPresentation';

const localMonthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

type Props = { user: User };

export default function HeadmasterStudentRecognition({ user }: Props) {
  const [schoolId, setSchoolId] = useState('');
  const [academicYearId, setAcademicYearId] = useState('');
  const [academicYear, setAcademicYear] = useState('Current Academic Year');
  const [periodType, setPeriodType] = useState<RecognitionPeriodType>('month');
  const [periodKey, setPeriodKey] = useState(localMonthKey());
  const [topN, setTopN] = useState<5 | 10>(5);
  const [rows, setRows] = useState<HeadmasterRecognitionRow[]>([]);
  const [backendReady, setBackendReady] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [expanded, setExpanded] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError('');
      try {
        const context = await resolveHeadmasterRecognitionContext();
        if (cancelled) return;
        setSchoolId(context.schoolId);
        setAcademicYearId(context.academicYearId);
        setAcademicYear(context.academicYear);
      } catch (cause: any) {
        if (!cancelled) setError(cause?.message || 'Unable to resolve Headmaster school context.');
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [user.id]);

  useEffect(() => {
    if (periodType === 'year') setPeriodKey(academicYear);
    else if (!/^\d{4}-\d{2}$/.test(periodKey)) setPeriodKey(localMonthKey());
  }, [periodType, academicYear]);

  const load = async () => {
    if (!schoolId) return;
    setLoading(true); setError('');
    try {
      const result = await loadHeadmasterRecognitionRankings({ schoolId, academicYearId, periodType, periodKey });
      setRows(result.rows);
      setBackendReady(result.backendReady);
    } catch (cause: any) {
      setRows([]);
      setError(cause?.message || 'Unable to load consolidated student recognition ranking.');
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [schoolId, academicYearId, periodType, periodKey]);

  const classOptions = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach(row => map.set(`${row.classId}|${row.divisionId || ''}`, `${row.className} · ${divisionScreenLabel(row.division)}`));
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const filtered = useMemo(() => {
    if (classFilter !== 'all') {
      return rows.filter(row => `${row.classId}|${row.divisionId || ''}` === classFilter).slice(0, topN).map((row, index) => ({ ...row, classRank: index + 1 }));
    }
    const grouped = new Map<string, HeadmasterRecognitionRow[]>();
    for (const row of rows) {
      const key = `${row.classId}|${row.divisionId || ''}`;
      const list = grouped.get(key) || [];
      list.push(row);
      grouped.set(key, list);
    }
    return [...grouped.values()]
      .sort((a, b) => `${a[0]?.className || ''} ${a[0]?.division || ''}`.localeCompare(`${b[0]?.className || ''} ${b[0]?.division || ''}`))
      .flatMap(list => list.slice(0, topN).map((row, index) => ({ ...row, classRank: index + 1 })));
  }, [rows, classFilter, topN]);

  return (
    <div className="space-y-5 text-left">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950 px-6 py-6 text-white sm:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-amber-300"><Trophy className="h-4 w-4" /> Student Recognition</div>
              <h1 className="mt-2 text-2xl font-black">Top 5 / Top 10 Multi-Subject Candidates</h1>
              <p className="mt-2 max-w-3xl text-xs leading-6 text-slate-300">Subject Teachers rate only their own assigned subject. This page merges those independent ratings into one transparent class ranking.</p>
            </div>
            <button type="button" onClick={() => void load()} disabled={loading || !schoolId} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-black hover:bg-white/15 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4 sm:p-7">
          <label><span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">Recognition Period</span><select value={periodType} onChange={event => setPeriodType(event.target.value as RecognitionPeriodType)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-black"><option value="month">Student of the Month</option><option value="year">Student of the Year</option></select></label>
          {periodType === 'month' ? <label><span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">Month</span><input type="month" value={periodKey} onChange={event => setPeriodKey(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-black" /></label> : <label><span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">Academic Year</span><div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-black text-slate-700">{academicYear}</div></label>}
          <label><span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">Class / Division</span><select value={classFilter} onChange={event => setClassFilter(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-black"><option value="all">All Classes</option>{classOptions.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <div><span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">Ranking Size</span><div className="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1"><button type="button" onClick={() => setTopN(5)} className={`rounded-lg px-3 py-2 text-xs font-black ${topN === 5 ? 'bg-slate-950 text-white' : 'text-slate-600'}`}>Top 5</button><button type="button" onClick={() => setTopN(10)} className={`rounded-lg px-3 py-2 text-xs font-black ${topN === 10 ? 'bg-slate-950 text-white' : 'text-slate-600'}`}>Top 10</button></div></div>
        </div>
      </section>

      {!backendReady && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold text-amber-900"><strong>Recognition cloud setup pending:</strong> Run the R5 My Students Supabase setup. Teacher Stars and Headmaster Top 5/10 are stored in that shared table.</div>}
      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800">{error}</div>}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-center justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[.14em] text-slate-400">Consolidated Ranking</div><h2 className="mt-1 text-xl font-black text-slate-950">{topN === 5 ? 'Top 5' : 'Top 10'} {classFilter === 'all' ? 'per Class' : 'Candidates'}</h2></div><div className="rounded-full bg-cyan-50 px-3 py-1.5 text-[10px] font-black text-cyan-800">{rows.length} rated students</div></div>
        {loading ? <div className="grid min-h-64 place-items-center"><Loader2 className="h-8 w-8 animate-spin text-cyan-600" /></div> : (
          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            <div className="overflow-x-auto"><table className="min-w-[850px] w-full text-left text-xs"><thead className="bg-slate-950 text-white"><tr><th className="px-4 py-3">Rank</th><th className="px-4 py-3">Student</th><th className="px-4 py-3">Class</th><th className="px-4 py-3 text-center">Recognition Avg.</th><th className="px-4 py-3 text-center">Rated Subjects</th><th className="px-4 py-3">Evidence</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((row, index) => {
              const key = `${row.classId}|${row.divisionId || ''}|${row.studentId}`;
              const open = expanded === key;
              return <React.Fragment key={key}><tr className="bg-white hover:bg-slate-50"><td className="px-4 py-3"><span className={`inline-grid h-8 w-8 place-items-center rounded-full font-black ${row.classRank <= 3 ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-700'}`}>#{row.classRank}</span></td><td className="px-4 py-3"><div className="font-black text-slate-950">{row.studentName}</div><div className="mt-1 text-[10px] font-semibold text-slate-400">GR {row.grNumber || '—'}</div></td><td className="px-4 py-3 font-bold text-slate-600">{row.className} · {divisionScreenLabel(row.division)}</td><td className="px-4 py-3 text-center"><div className="font-black text-cyan-800">{row.normalizedScore}%</div><div className="mt-1 text-[9px] font-bold text-slate-400">{row.averagePoints}/25 avg.</div></td><td className="px-4 py-3 text-center"><span className="rounded-full bg-violet-50 px-3 py-1.5 text-[10px] font-black text-violet-700">{row.ratedSubjects} subject{row.ratedSubjects === 1 ? '' : 's'}</span></td><td className="px-4 py-3"><button type="button" onClick={() => setExpanded(open ? '' : key)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-slate-800">{open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />} Subject breakdown</button></td></tr>{open && <tr><td colSpan={6} className="bg-slate-50 px-5 py-4"><div className="grid gap-3 lg:grid-cols-2">{row.ratings.map(rating => <div key={rating.id || `${rating.subjectId}:${rating.teacherUserId}`} className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between gap-3"><div><div className="font-black text-slate-950">{rating.subjectName}</div><div className="mt-1 text-[10px] font-semibold text-slate-400">{rating.teacherName}</div></div><div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 text-[10px] font-black text-amber-800"><Star className="h-3.5 w-3.5 fill-current" /> {rating.totalPoints}/25</div></div><div className="mt-3 grid grid-cols-5 gap-2 text-center"><div><div className="text-[9px] font-bold text-slate-400">Academic</div><div className="mt-1 font-black">{rating.academicPerformance}★</div></div><div><div className="text-[9px] font-bold text-slate-400">Improve</div><div className="mt-1 font-black">{rating.improvement}★</div></div><div><div className="text-[9px] font-bold text-slate-400">Consistent</div><div className="mt-1 font-black">{rating.consistency}★</div></div><div><div className="text-[9px] font-bold text-slate-400">Participate</div><div className="mt-1 font-black">{rating.participation}★</div></div><div><div className="text-[9px] font-bold text-slate-400">Homework</div><div className="mt-1 font-black">{rating.homework}★</div></div></div></div>)}</div></td></tr>}</React.Fragment>;
            })}</tbody></table></div>
            {!filtered.length && <div className="p-10 text-center"><Award className="mx-auto h-8 w-8 text-slate-300" /><div className="mt-3 text-sm font-black text-slate-700">No ratings submitted for this period yet.</div><p className="mt-1 text-xs text-slate-500">As Subject Teachers save Stars, the Top 5/10 list will appear here automatically.</p></div>}
          </div>
        )}
        <div className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50 p-4 text-xs font-semibold leading-5 text-cyan-950"><strong>Fairness rule:</strong> each Subject contributes a maximum of 25 points. Within a class, broader multi-subject coverage is ranked first, then the average score. The number of rated subjects is always visible, and every candidate has an auditable subject-wise breakdown. Result marks are not silently mixed into this score.</div>
      </section>
    </div>
  );
}
