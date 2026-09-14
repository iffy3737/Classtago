import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, BadgeCheck, CalendarCheck, ChevronRight, CircleAlert,
  ClipboardCheck, Cloud, GraduationCap, Loader2, RefreshCw, ShieldAlert, Users
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { User } from '../types';

type CommandSnapshot = {
  generatedAt: string;
  sources: Record<string, boolean>;
  kpis: Record<string, number | null>;
  daily: Record<string, number | string | boolean | null>;
  alerts: Array<{ id: string; severity: string; title: string; detail: string; ownerModuleId?: string; ownerFeatureId?: string }>;
  pending: Record<string, number>;
};

type Props = {
  user: User;
  activeFeatureId?: string | null;
  onOpenModule: (moduleId: string, featureId?: string) => void;
};

const featureSection: Record<string, string> = {
  'daily-operations-summary': 'command-daily',
  'school-alerts': 'command-alerts',
  'school-kpis': 'command-kpis',
  'pending-decisions': 'command-pending',
  'quick-module-shortcuts': 'command-links'
};

const featureTitle: Record<string, string> = {
  'daily-operations-summary': 'Daily Operations Summary',
  'school-alerts': 'School Alerts & Exceptions',
  'school-kpis': 'Current School KPIs',
  'pending-decisions': 'Pending Decisions & Approvals',
  'quick-module-shortcuts': 'Quick Links to Owner Modules'
};

const formatValue = (value: unknown) => value === null || value === undefined ? 'Not connected' : String(value);

export default function SchoolCommandCenter({ user, activeFeatureId, onOpenModule }: Props) {
  const [data, setData] = useState<CommandSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Secure session unavailable. Please sign in again.');
      const response = await fetch('/api/headmaster/command-center', { headers: { Authorization: `Bearer ${session.access_token}` } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'School Command Center could not be loaded.');
      setData(payload);
    } catch (err: any) {
      setError(err?.message || 'School Command Center could not be loaded.');
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (!activeFeatureId) return;
    const id = featureSection[activeFeatureId];
    window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  }, [activeFeatureId, data]);

  const sourceCount = useMemo(() => data ? Object.values(data.sources).filter(Boolean).length : 0, [data]);
  const focusedSection = activeFeatureId ? featureSection[activeFeatureId] || null : null;
  const focusedTitle = activeFeatureId ? featureTitle[activeFeatureId] || null : null;
  const showSection = (sectionId: string) => !focusedSection || focusedSection === sectionId;

  if (loading) return <LoadingCard text="Loading current school operations from the cloud…" />;
  if (error || !data) return <ErrorCard message={error || 'School Command Center is unavailable.'} onRetry={load} />;

  const kpis = [
    ['Total Students', data.kpis.totalStudents, GraduationCap],
    ['Active Staff', data.kpis.activeStaff, Users],
    ['Active Classes', data.kpis.activeClasses, CalendarCheck],
    ['Applications to Review', data.kpis.admissionsAwaitingReview, ClipboardCheck],
    ['Admissions to Confirm', data.kpis.approvedAwaitingConfirmation, BadgeCheck]
  ] as const;

  return <div className="mx-auto w-full max-w-[1500px] space-y-6">
    <header className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-[radial-gradient(circle_at_8%_0%,rgba(34,211,238,.2),transparent_32%),radial-gradient(circle_at_92%_0%,rgba(139,92,246,.2),transparent_35%),linear-gradient(135deg,#07172d,#080b1b_55%,#17112e)] p-6 text-white shadow-2xl sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-cyan-300"><Activity className="h-4 w-4" />School Command Center</div><h1 className="mt-3 text-2xl font-black sm:text-3xl">{focusedTitle || 'Today’s school operations in one clear view.'}</h1><p className="mt-3 max-w-3xl text-xs leading-6 text-slate-300">Live summaries only. Detailed work remains in its official owner module, so the dashboard never duplicates business forms.</p></div>
        <button onClick={() => void load()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-xs font-black hover:bg-white/15"><RefreshCw className="h-4 w-4" />Refresh</button>
      </div>
      <div className="mt-5 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wide text-slate-300"><span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-emerald-300"><Cloud className="mr-1.5 inline h-3.5 w-3.5" />{sourceCount}/{Object.keys(data.sources).length} cloud sources connected</span><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Headmaster: {user.name}</span></div>
    </header>

    {showSection('command-kpis') && (
    <section id="command-kpis" className="scroll-mt-24">
      <SectionTitle icon={GraduationCap} title="Current School KPIs" text="Counts are read from school-scoped cloud records. Missing sources are shown honestly instead of estimated." />
      <div className="edx-balanced-grid mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">{kpis.map(([label, value, Icon]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><Icon className="h-5 w-5 text-cyan-700" /><div className="mt-4 break-words text-lg font-black text-slate-950 sm:text-2xl">{formatValue(value)}</div><div className="mt-1 text-xs font-bold text-slate-500">{label}</div></div>)}</div>
    </section>
    )}

    {showSection('command-daily') && (
    <section id="command-daily" className="scroll-mt-24">
      <SectionTitle icon={CalendarCheck} title="Daily Operations Summary" text="Today’s intake, approvals, campaigns and public website position." />
      <div className="edx-balanced-grid mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Summary label="Applications submitted today" value={data.daily.applicationsSubmittedToday} />
        <Summary label="Pending account approvals" value={data.daily.pendingAccountApprovals} />
        <Summary label="Active admission campaigns" value={data.daily.activeAdmissionCampaigns} />
        <Summary label="Website status" value={String(data.daily.websiteStatus || 'Not configured').replaceAll('_', ' ')} alert={data.daily.websiteChangesPending === true} />
      </div>
    </section>
    )}

    {showSection('command-alerts') && (
    <section id="command-alerts" className="scroll-mt-24">
      <SectionTitle icon={ShieldAlert} title="School Alerts & Exceptions" text="Only actionable cloud-derived exceptions appear here." />
      <div className="mt-4 space-y-3">{data.alerts.length === 0 ? <Empty text="No current cloud-derived exceptions require Headmaster attention." /> : data.alerts.map(alert => <div key={alert.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center"><div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${alert.severity === 'high' || alert.severity === 'critical' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}><AlertTriangle className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="font-black text-slate-950">{alert.title}</div><div className="mt-1 text-xs leading-5 text-slate-500">{alert.detail}</div></div>{alert.ownerModuleId && <button onClick={() => onOpenModule(alert.ownerModuleId!, alert.ownerFeatureId)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-xs font-black text-white">Open owner module<ChevronRight className="h-4 w-4" /></button>}</div>)}</div>
    </section>
    )}

    {showSection('command-pending') && (
    <section id="command-pending" className="scroll-mt-24">
      <SectionTitle icon={ClipboardCheck} title="Pending Decisions & Approvals" text="A compact queue summary. Decisions are completed inside the relevant owner module." />
      <div className="edx-balanced-grid mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Summary label="Application review" value={data.pending.admissionReview} />
        <Summary label="Admission confirmation" value={data.pending.admissionConfirmation} alert={data.pending.admissionConfirmation > 0} />
        <Summary label="Account approval" value={data.pending.accountApproval} />
        <Summary label="Website changes pending" value={data.pending.websitePublish} />
        <Summary label="Campaign drafts awaiting action" value={data.pending.campaignPublish} />
      </div>
    </section>
    )}

    {showSection('command-links') && (
    <section id="command-links" className="scroll-mt-24">
      <SectionTitle icon={ChevronRight} title="Quick Links to Owner Modules" text="Each shortcut opens the exact canonical module rather than a duplicate form." />
      <div className="edx-balanced-grid mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Quick label="Website Design" onClick={() => onOpenModule('hm-website-studio')} />
        <Quick label="Admission Campaigns" onClick={() => onOpenModule('hm-admission-campaigns')} />
        <Quick label="Unified Approval Inbox" onClick={() => onOpenModule('hm-approval-inbox')} />
        <Quick label="Executive Dashboard" onClick={() => onOpenModule('hm-executive-analytics')} />
        <Quick label="Communication Hub" onClick={() => onOpenModule('hm-communication')} />
        <Quick label="System Administration" onClick={() => onOpenModule('hm-system-admin')} />
      </div>
    </section>
    )}
  </div>;
}

function SectionTitle({ icon: Icon, title, text }: { icon: any; title: string; text: string }) { return <div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-cyan-700"><Icon className="h-4 w-4" />{title}</div><p className="mt-2 text-xs leading-5 text-slate-500">{text}</p></div>; }
function Summary({ label, value, alert = false }: { label: string; value: unknown; alert?: boolean }) { return <div className={`rounded-2xl border p-4 ${alert ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'}`}><div className={`break-words text-lg font-black sm:text-xl ${alert ? 'text-amber-900' : 'text-slate-950'}`}>{formatValue(value)}</div><div className="mt-1 text-xs font-bold text-slate-500">{label}</div></div>; }
function Quick({ label, onClick }: { label: string; onClick: () => void }) { return <button onClick={onClick} className="relative min-h-[88px] rounded-2xl border border-slate-200 bg-white p-4 pr-9 text-left text-xs font-black leading-5 text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-lg"><span>{label}</span><ChevronRight className="absolute right-3 top-3 h-4 w-4 text-cyan-700" /></button>; }
function Empty({ text }: { text: string }) { return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-xs text-slate-500"><CircleAlert className="mx-auto mb-3 h-7 w-7 text-slate-300" />{text}</div>; }
function LoadingCard({ text }: { text: string }) { return <div className="grid min-h-[360px] place-items-center rounded-3xl border border-slate-200 bg-white"><div className="text-center"><Loader2 className="mx-auto h-9 w-9 animate-spin text-cyan-600" /><p className="mt-4 text-sm font-bold text-slate-600">{text}</p></div></div>; }
function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) { return <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center"><AlertTriangle className="mx-auto h-9 w-9 text-rose-600" /><div className="mt-4 text-sm font-black text-rose-900">{message}</div><button onClick={onRetry} className="mt-5 rounded-xl bg-rose-700 px-4 py-3 text-xs font-black text-white">Retry</button></div>; }
