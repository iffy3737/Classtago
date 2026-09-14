import React, { useEffect, useState } from 'react';
import { BadgeCheck, Cloud, GraduationCap, Loader2, RefreshCw, UserRoundCheck, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Snapshot = {
  generatedAt: string;
  sources: Record<string, boolean>;
  kpis: {
    totalStudents: number | null;
    activeStaff: number | null;
    activeClasses: number | null;
    admissionsAwaitingReview: number | null;
    approvedAwaitingConfirmation: number | null;
  };
};

export default function HeadmasterLiveOverviewMetrics() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) throw sessionError || new Error('Secure session unavailable. Please sign in again.');
      const response = await fetch('/api/headmaster/command-center', { headers: { Authorization: `Bearer ${session.access_token}` } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Live school metrics could not be loaded.');
      setData(payload as Snapshot);
    } catch (err: any) {
      setData(null);
      setError(err?.message || 'Live school metrics could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const metrics = [
    { label: 'Active Students', value: data?.kpis.totalStudents, hint: 'Student Master', icon: Users },
    { label: 'Active Staff', value: data?.kpis.activeStaff, hint: 'Staff Master', icon: UserRoundCheck },
    { label: 'Applications to Review', value: data?.kpis.admissionsAwaitingReview, hint: 'Admission queue', icon: GraduationCap },
    { label: 'Awaiting Confirmation', value: data?.kpis.approvedAwaitingConfirmation, hint: 'Headmaster action', icon: BadgeCheck }
  ];

  return <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-950 text-white shadow-xl">
    <div className="relative p-5 sm:p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,.20),transparent_38%),radial-gradient(circle_at_top_right,rgba(139,92,246,.24),transparent_36%)]" />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-cyan-300"><Cloud className="h-4 w-4"/>Live Supabase Snapshot</div>
          <h2 className="mt-2 text-xl font-black tracking-tight">School at a glance</h2>
          <p className="mt-1 text-xs text-slate-300">Only verified cloud data is shown. Unavailable sources display “—” rather than invented values.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-black hover:bg-white/15 disabled:opacity-50">
          {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : <RefreshCw className="h-4 w-4"/>}Refresh
        </button>
      </div>
      {error && <div className="relative mt-4 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-xs font-semibold text-rose-100">{error}</div>}
      <div className="relative mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map(({ label, value, hint, icon: Icon }) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[.07] p-4 backdrop-blur">
          <Icon className="h-5 w-5 text-cyan-200"/>
          <div className="mt-3 text-2xl font-black">{loading && !data ? '…' : value == null ? '—' : value}</div>
          <div className="mt-1 text-[10px] font-black uppercase tracking-wider text-slate-300">{label}</div>
          <div className="mt-1 text-[9px] font-semibold text-cyan-200/70">{hint}</div>
        </div>)}
      </div>
    </div>
  </section>;
}
