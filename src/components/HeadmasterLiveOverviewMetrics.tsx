import React, { useEffect, useState } from 'react';
import RoleHeroCard from './RoleHeroCard';
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

  return (
    <div className="space-y-4">
      <RoleHeroCard
        role="headmaster"
        workspaceLabel="Headmaster Workspace"
        subtitle="Live school metrics from your cloud snapshot."
        stats={[
          { value: loading && !data ? '\u2026' : data?.kpis.totalStudents == null ? '\u2014' : data.kpis.totalStudents, label: 'Students' },
          { value: loading && !data ? '\u2026' : data?.kpis.activeStaff == null ? '\u2014' : data.kpis.activeStaff, label: 'Staff' },
          { value: loading && !data ? '\u2026' : data?.kpis.admissionsAwaitingReview == null ? '\u2014' : data.kpis.admissionsAwaitingReview, label: 'Admissions' },
          { value: loading && !data ? '\u2026' : data?.kpis.approvedAwaitingConfirmation == null ? '\u2014' : data.kpis.approvedAwaitingConfirmation, label: 'Awaiting' },
        ]}
        ctaLabel={loading ? 'Loading\u2026' : 'Refresh Live Data'}
        onCtaClick={() => void load()}
      />
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">{error}</div>}
    </div>
  );
}
