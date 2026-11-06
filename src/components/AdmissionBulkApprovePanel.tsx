import React, { useMemo, useRef, useState } from 'react';
import { BadgeCheck, CheckCircle2, CircleAlert, Loader2, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { requestActionConfirm } from '../lib/actionConfirm';

type Application = { id: string; referenceCode: string; studentName: string; guardianName: string; mobile: string; classApplying: string; status: string; payload?: Record<string, any>; confirmation?: Record<string, any> | null };
type ClassOption = { id: string; name: string };
type DivisionOption = { id: string; classId?: string | null; name: string };
type Mode = 'approve' | 'full';
type RowState = { state: 'queued' | 'running' | 'done' | 'failed'; error?: string };
type Plan = { gr: string; classId: string; className: string; divisionId: string; divisionName: string; roll: string; date: string; problems: string[] };
type Props = { applications: Application[]; classes: ClassOption[]; divisions: DivisionOption[]; onRowUpdate: (id: string, patch: Record<string, any>) => void; onFinished?: () => void };

const CONCURRENCY = 3;
const norm = (v: any) => String(v ?? '').trim().toLowerCase();
const tokens = (v: any) => norm(v).split(/[\s,;:()\[\]\-_\/.]+/).filter(Boolean);
const hasRun = (hay: string[], needle: string[]) => needle.length > 0 && hay.some((_, i) => needle.every((t, j) => hay[i + j] === t));
const toDate = (v: any) => { const s = String(v || '').slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : new Date().toISOString().slice(0, 10); };

async function api(url: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Secure session unavailable. Please sign in again.');
  const response = await fetch(url, { ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}), Authorization: 'Bearer ' + session.access_token } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Request failed.');
  return payload;
}

function findClass(a: Application, classes: ClassOption[]) {
  const academic = (a.payload && a.payload.academic) || {};
  const asked = String(academic.classApplying || a.classApplying || '');
  const hit = classes.find(c => String(c.id) === String(academic.classId || '')) || classes.find(c => norm(c.name) === norm(asked));
  if (hit) return hit;
  const near = classes.filter(c => hasRun(tokens(asked), tokens(c.name)));
  return near.length === 1 ? near[0] : undefined;
}

function planFor(a: Application, classes: ClassOption[], divisions: DivisionOption[], grOverride?: string): Plan {
  const office = (a.payload && a.payload.office) || {};
  const cls = findClass(a, classes);
  const wantDiv = norm(a.payload && a.payload.academic && a.payload.academic.division);
  const div = cls && wantDiv ? divisions.find(d => (!d.classId || String(d.classId) === String(cls.id)) && norm(d.name) === wantDiv) : undefined;
  const gr = String(grOverride ?? office.proposedGrNumber ?? '').trim().toUpperCase();
  const rollNo = Number(office.proposedRollNumber);
  const problems: string[] = [];
  if (!gr) problems.push('GR missing');
  else if (!/^[A-Z0-9._/-]+$/.test(gr)) problems.push('GR format invalid');
  if (!cls) problems.push('Class not matched');
  return { gr, classId: cls ? String(cls.id) : '', className: cls ? cls.name : '', divisionId: div ? String(div.id) : '', divisionName: div ? div.name : '', roll: Number.isFinite(rollNo) && rollNo > 0 ? String(rollNo) : '', date: toDate(office.admissionDate), problems };
}

export default function AdmissionBulkApprovePanel({ applications, classes, divisions, onRowUpdate, onFinished }: Props) {
  const [rowState, setRowState] = useState<Record<string, RowState>>({});
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [grEdits, setGrEdits] = useState<Record<string, string>>({});
  const [q, setQ] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [notice, setNotice] = useState('');
  const [summary, setSummary] = useState<{ ok: number; failed: { name: string; error: string }[]; stopped: boolean; mode: Mode } | null>(null);
  const cancelRef = useRef(false);

  const pending = useMemo(() => {
    const bad = (a: Application) => (planFor(a, classes, divisions).problems.length ? 1 : 0);
    return applications
      .filter(a => { const s = rowState[a.id]?.state; return !a.confirmation || s === 'done' || s === 'running'; })
      .map((a, i) => ({ a, i, b: bad(a) }))
      .sort((x, y) => y.b - x.b || x.i - y.i)
      .map(x => x.a);
  }, [applications, classes, divisions, rowState]);

  const rows = useMemo(() => {
    const base = pending.map(a => ({ a, p: planFor(a, classes, divisions, grEdits[a.id]) }));
    const seen: Record<string, number> = {};
    base.forEach(r => { if (r.p.gr) seen[r.p.gr] = (seen[r.p.gr] || 0) + 1; });
    return base.map(r => ({ ...r, issues: r.p.problems.concat(r.p.gr && seen[r.p.gr] > 1 ? ['Duplicate GR in list'] : []) }));
  }, [pending, classes, divisions, grEdits]);

  const classOptions = useMemo(() => {
    const m: Record<string, string> = {};
    rows.forEach(r => { if (r.p.classId) m[r.p.classId] = r.p.className; });
    return Object.entries(m);
  }, [rows]);

  const shown = useMemo(() => {
    const needle = norm(q);
    return rows.filter(r => (!classFilter || r.p.classId === classFilter) && (!needle || (norm(r.a.studentName) + ' ' + norm(r.a.referenceCode) + ' ' + norm(r.p.gr)).includes(needle)));
  }, [rows, q, classFilter]);

  const openRows = rows.filter(r => !r.a.confirmation);
  const readyAll = openRows.filter(r => !r.issues.length).length;
  const readyShown = shown.filter(r => !r.a.confirmation && !r.issues.length);
  const chosen = shown.filter(r => !r.a.confirmation && sel[r.a.id]);
  const readyChosen = chosen.filter(r => !r.issues.length);

  const run = async (mode: Mode) => {
    if (running) return;
    const pool = mode === 'full' ? readyChosen : chosen.filter(r => norm(r.a.status) !== 'approved');
    setNotice('');
    setSummary(null);
    if (!pool.length) {
      setNotice(mode === 'full' ? 'Tick at least one ready student first.' : 'The selected applications are already approved.');
      return;
    }
    const skipped = chosen.length - pool.length;
    const go = await requestActionConfirm({
      title: mode === 'full' ? 'Approve and confirm ' + pool.length + ' admissions?' : 'Approve ' + pool.length + ' applications?',
      message: mode === 'full'
        ? pool.length + ' students will be approved and their permanent Student Master records created with the GR numbers shown.' + (skipped ? ' ' + skipped + ' selected row(s) with problems are skipped.' : '')
        : pool.length + ' applications will be approved. GR and confirmation can be done afterwards.',
      confirmLabel: mode === 'full' ? 'Approve + Confirm ' + pool.length : 'Approve ' + pool.length,
      tone: 'warning'
    });
    if (!go) return;
    cancelRef.current = false;
    setRunning(true);
    setProgress({ done: 0, total: pool.length });
    setRowState(prev => { const n = { ...prev }; pool.forEach(r => { n[r.a.id] = { state: 'queued' }; }); return n; });
    let cursor = 0;
    let okCount = 0;
    const failed: { id: string; name: string; error: string }[] = [];
    const worker = async () => {
      while (!cancelRef.current) {
        const idx = cursor++;
        if (idx >= pool.length) return;
        const { a, p } = pool[idx];
        setRowState(prev => ({ ...prev, [a.id]: { state: 'running' } }));
        try {
          if (norm(a.status) !== 'approved') {
            await api('/api/school-website/admission-applications/' + a.id + '/status', { method: 'PATCH', body: JSON.stringify({ status: 'approved', publicMessage: 'Application approved by the Headmaster.', internalNote: null }) });
            onRowUpdate(a.id, { status: 'approved' });
          }
          if (mode === 'full') {
            const res = await api('/api/school-website/admission-applications/' + a.id + '/confirm', { method: 'POST', body: JSON.stringify({ grNumber: p.gr, classId: p.classId, divisionId: p.divisionId || null, rollNumber: p.roll || null, admissionDate: p.date }) });
            onRowUpdate(a.id, { status: 'Admission Confirmed', confirmation: res.confirmation || { grNumber: p.gr, classId: p.classId, admissionDate: p.date } });
            setRowState(prev => ({ ...prev, [a.id]: { state: 'done' } }));
          } else {
            setRowState(prev => { const n = { ...prev }; delete n[a.id]; return n; });
          }
          okCount++;
        } catch (e: any) {
          const error = String(e?.message || 'Request failed.');
          failed.push({ id: a.id, name: a.studentName, error });
          setRowState(prev => ({ ...prev, [a.id]: { state: 'failed', error } }));
        }
        setProgress(prev => ({ ...prev, done: prev.done + 1 }));
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, pool.length) }, () => worker()));
    setRowState(prev => { const n: Record<string, RowState> = {}; Object.keys(prev).forEach(k => { if (prev[k].state !== 'queued') n[k] = prev[k]; }); return n; });
    const keep: Record<string, boolean> = {};
    failed.forEach(f => { keep[f.id] = true; });
    setSel(keep);
    setSummary({ ok: okCount, failed: failed.map(f => ({ name: f.name, error: f.error })), stopped: cancelRef.current, mode });
    setRunning(false);
    if (onFinished) onFinished();
  };

  if (!rows.length) return <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" /><h2 className="mt-4 font-black text-slate-950">Nothing pending</h2><p className="mt-2 text-xs text-slate-500">Every verified application is already confirmed.</p></div>;

  return <div className="space-y-4">
    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-xl sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-cyan-700"><BadgeCheck className="h-4 w-4" />Bulk approve</div>
          <h2 className="mt-2 text-xl font-black text-slate-950">{openRows.length} waiting for the Headmaster</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">{readyAll} ready · {openRows.length - readyAll} need attention (listed first). A missing GR number can be typed right in the row. GR and class are needed only for Approve + Confirm; Approve only works without them.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={running || !shown.some(r => !r.a.confirmation)} onClick={() => { const n: Record<string, boolean> = {}; shown.forEach(r => { if (!r.a.confirmation) n[r.a.id] = true; }); setSel(n); }} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-black text-slate-800 disabled:opacity-40">Select all ({shown.filter(r => !r.a.confirmation).length})</button>
          <button type="button" disabled={running || !readyShown.length} onClick={() => { const n: Record<string, boolean> = {}; readyShown.forEach(r => { n[r.a.id] = true; }); setSel(n); }} className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white disabled:opacity-40">Select all ready ({readyShown.length})</button>
          <button type="button" disabled={running || !chosen.length} onClick={() => setSel({})} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 disabled:opacity-40">Clear</button>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_220px]">
        <label className="relative block"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, reference or GR" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-cyan-500" /></label>
        <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-900"><option value="">All classes</option>{classOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
      </div>
    </section>

    {notice && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-900">{notice}</div>}
    {summary && <div className={'rounded-2xl border p-4 text-sm ' + (summary.failed.length ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900')}>
      <div className="font-black">{summary.ok} {summary.mode === 'full' ? 'admissions confirmed' : 'applications approved'}{summary.failed.length ? ' · ' + summary.failed.length + ' failed' : ''}{summary.stopped ? ' · stopped early' : ''}</div>
      {summary.failed.slice(0, 5).map((f, i) => <div key={i} className="mt-1 text-xs">{f.name}: {f.error}</div>)}
      {summary.failed.length > 5 && <div className="mt-1 text-xs">+{summary.failed.length - 5} more, see the red rows below.</div>}
      {summary.failed.length > 0 && <div className="mt-2 text-xs font-bold">Failed rows are selected again. Fix the GR number if needed, then press the button to retry.</div>}
    </div>}

    <div className="space-y-2">
      {shown.map(({ a, p, issues }) => {
        const st = rowState[a.id];
        const locked = running || Boolean(a.confirmation) || st?.state === 'done';
        const tone = st?.state === 'failed' ? 'border-rose-300 bg-rose-50' : st?.state === 'done' ? 'border-emerald-200 bg-emerald-50' : issues.length ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white';
        const chip: [string, string] = st?.state === 'done' ? ['Confirmed', 'bg-emerald-100 text-emerald-800'] : st?.state === 'running' ? ['Working', 'bg-cyan-100 text-cyan-800'] : st?.state === 'queued' ? ['Queued', 'bg-slate-100 text-slate-600'] : norm(a.status) === 'approved' ? ['Approved', 'bg-emerald-100 text-emerald-800'] : [String(a.status || 'verified').replace(/_/g, ' '), 'bg-slate-100 text-slate-600'];
        return <div key={a.id} className={'rounded-2xl border p-3 sm:p-4 ' + tone}>
          <div className="flex items-start gap-3">
            <input type="checkbox" aria-label={'Select ' + a.studentName} checked={Boolean(sel[a.id])} disabled={locked} onChange={e => setSel(prev => ({ ...prev, [a.id]: e.target.checked }))} className="mt-1 h-5 w-5 shrink-0 accent-cyan-600" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0"><span className="text-sm font-black text-slate-950">{a.studentName}</span> <span className="font-mono text-[10px] font-black text-cyan-700">{a.referenceCode}</span></div>
                <span className={'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black capitalize ' + chip[1]}>{st?.state === 'running' && <Loader2 className="h-3 w-3 animate-spin" />}{chip[0]}</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-500">{a.guardianName} · {p.className || a.classApplying}{p.divisionName ? ' · Div ' + p.divisionName : ''}{p.roll ? ' · Roll ' + p.roll : ''}</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input value={p.gr} disabled={locked} onChange={e => setGrEdits(prev => ({ ...prev, [a.id]: e.target.value.toUpperCase() }))} placeholder="GR number" className="w-40 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs font-bold text-slate-900 outline-none focus:border-cyan-500 disabled:bg-slate-100" />
                {st?.state !== 'done' && issues.map(x => <span key={x} className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black text-amber-800"><CircleAlert className="h-3 w-3" />{x}</span>)}
              </div>
              {st?.state === 'failed' && <div className="mt-2 text-xs font-bold text-rose-700">{st.error}</div>}
            </div>
          </div>
        </div>;
      })}
      {!shown.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-xs text-slate-500">No application matches this filter.</div>}
    </div>

    <div className="sticky bottom-3 z-10 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-2xl backdrop-blur">
      {running ? <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-black text-slate-700"><span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Processing {progress.done} / {progress.total}</span><button type="button" onClick={() => { cancelRef.current = true; }} className="rounded-lg border border-rose-200 px-3 py-1.5 text-rose-700">Stop</button></div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: (progress.total ? Math.round((progress.done / progress.total) * 100) : 0) + '%' }} /></div>
      </div> : <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-black text-slate-700">{chosen.length} selected{chosen.length > readyChosen.length ? ' · ' + (chosen.length - readyChosen.length) + ' need attention, skipped for confirm' : ''}</div>
        <div className="flex gap-2">
          <button type="button" disabled={!chosen.length} onClick={() => void run('approve')} className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-xs font-black text-slate-800 disabled:opacity-40">Approve only</button>
          <button type="button" disabled={!readyChosen.length} onClick={() => void run('full')} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-black text-white disabled:opacity-40"><BadgeCheck className="h-4 w-4" />Approve + Confirm {readyChosen.length}</button>
        </div>
      </div>}
    </div>
  </div>;
}
