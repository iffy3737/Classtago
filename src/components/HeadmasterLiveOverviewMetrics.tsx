import React, { useEffect, useState } from 'react';
import RoleHeroCard from './RoleHeroCard';
import ModulesPreviewCard from './ModulesPreviewCard';
import { BadgeCheck, Cloud, GraduationCap, Loader2, RefreshCw, UserRoundCheck, Users } from 'lucide-react';
import { Calendar as MI_Cal, BarChart3 as MI_Bar, FileText as MI_File, Users as MI_Users, MessageSquare as MI_Msg, CircleDollarSign as MI_Fee, Award as MI_Award, FileUp as MI_Up, UsersRound as MI_Gate, PackageCheck as MI_Pkg, BellRing as MI_Bell, Clock3 as MI_Clock, BookOpen as MI_Book, ClipboardList as MI_List, GraduationCap as MI_Grad, Bell as MI_BellSimple } from 'lucide-react';
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

      <ModulesPreviewCard
        title="Modules"
        items={[
          { id: 'attendance', label: 'Attendance', subtitle: 'Daily registers · Student & Staff', icon: MI_Cal, gradient: 'linear-gradient(135deg, #FF3473, #D91B5C)', route: 'hm-student-attendance' },
          { id: 'results', label: 'Result Management', subtitle: 'Marks · Result books · Progress cards', icon: MI_Bar, gradient: 'linear-gradient(135deg, #FFA202, #E08800)', route: 'hm-result-management' },
          { id: 'communication', label: 'Communication', subtitle: 'Notices · Messages · SMS', icon: MI_Msg, gradient: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', route: 'hm-communication' },
          { id: 'fees', label: 'Fees', subtitle: 'Ledger · Collection · Reports', icon: MI_Fee, gradient: 'linear-gradient(135deg, #14B8A6, #0F766E)', route: 'hm-smart-fees-desk' }
        ]}
        onNavigate={(route, featureId) => {
          const opener = (window as any).__classtago_maria_open_role_module;
          if (typeof opener === 'function') opener(route, featureId);
        }}
        onViewAll={() => window.dispatchEvent(new CustomEvent('edunixo:open-menu'))}
      />

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">{error}</div>}
    </div>
  );
}
