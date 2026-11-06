import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AdmissionBulkApprovePanel from './AdmissionBulkApprovePanel';

type ClassOption = { id: string; name: string };
type DivisionOption = { id: string; classId?: string | null; name: string };

async function getJson(url: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Secure session unavailable. Please sign in again.');
  const response = await fetch(url, { headers: { Authorization: 'Bearer ' + session.access_token } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Request failed.');
  return payload;
}

export default function AdmissionApplicationsBulkHub({ children }: { children?: React.ReactNode }) {
  const [view, setView] = useState<'bulk' | 'single'>('bulk');
  const [apps, setApps] = useState<any[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [divisions, setDivisions] = useState<DivisionOption[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [queue, fresh, setup] = await Promise.all([
        getJson('/api/school-website/admission-confirmation'),
        getJson('/api/school-website/admission-applications?status=under_review'),
        getJson('/api/school-website/admission-confirmation/setup').catch(() => ({ classes: [], divisions: [] }))
      ]);
      const merged = new Map<string, any>();
      (Array.isArray(fresh.applications) ? fresh.applications : []).forEach((a: any) => merged.set(String(a.id), a));
      (Array.isArray(queue.applications) ? queue.applications : []).forEach((a: any) => merged.set(String(a.id), a));
      setApps(Array.from(merged.values()));
      setClasses(Array.isArray(setup.classes) ? setup.classes : []);
      setDivisions(Array.isArray(setup.divisions) ? setup.divisions : []);
      setLoaded(true);
    } catch (e: any) {
      setError(String(e?.message || 'Applications could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (view === 'bulk') void load(); }, [view, load]);

  const waiting = apps.filter(a => !a.confirmation).length;
  const tab = (on: boolean) => 'flex-1 rounded-xl px-4 py-3 text-xs font-black ' + (on ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-600');
  const patchRow = (id: string, patch: Record<string, any>) => setApps(cur => cur.map(a => (String(a.id) === String(id) ? { ...a, ...patch } : a)));
  const spinner = <div className="grid min-h-[320px] place-items-center rounded-3xl border border-slate-200 bg-white"><Loader2 className="h-9 w-9 animate-spin text-cyan-600" /></div>;
  const failure = <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">{error}</div>;

  return <div className="space-y-4">
    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
      <button type="button" onClick={() => setView('bulk')} className={tab(view === 'bulk')}>Bulk approve{loaded ? ' (' + waiting + ')' : ''}</button>
      <button type="button" onClick={() => setView('single')} className={tab(view === 'single')}>One by one</button>
      {view === 'bulk' && <button type="button" onClick={() => void load()} disabled={loading} aria-label="Refresh list" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-50"><RefreshCw className={'h-4 w-4 ' + (loading ? 'animate-spin' : '')} /></button>}
    </div>
    {view === 'single' ? children : !loaded ? (error ? failure : spinner) : <>
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800">{error}</div>}
      <AdmissionBulkApprovePanel applications={apps} classes={classes} divisions={divisions} onRowUpdate={patchRow} onFinished={() => window.dispatchEvent(new Event('refresh_notifications'))} />
    </>}
  </div>;
}
