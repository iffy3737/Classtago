import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, GraduationCap, Loader2, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { TeacherCloudContext } from '../teacherFresh/types';
import { requestActionConfirm } from '../../lib/actionConfirm';
import { divisionScreenLabel } from '../../lib/divisionPresentation';

export type StudentSignupApprovalRequest = {
  requestId?: string | null;
  requestCode?: string;
  accountUserId: string;
  studentId: string;
  studentName: string;
  grNumber: string;
  classId: string;
  className: string;
  divisionId: string | null;
  divisionName: string;
  rollNumber: string | null;
  phone: string;
  requestedAt: string;
  status: string;
};

export type EligibleClassStudent = {
  studentId: string;
  studentName: string;
  grNumber: string;
  classId: string;
  className: string;
  divisionId: string | null;
  divisionName: string;
  rollNumber: string | null;
  admissionDate?: string;
  status: string;
  portalStatus: 'not_signed_up' | 'pending_approval' | 'active' | 'rejected' | 'inactive' | string;
  requestId?: string | null;
  requestCode?: string;
};

export type RecentClassAdmission = {
  studentId: string;
  studentName: string;
  grNumber: string;
  classId: string;
  className: string;
  divisionId: string | null;
  divisionName: string;
  admittedAt: string;
};

type QueuePayload = {
  isClassTeacher: boolean;
  academicYearId?: string | null;
  academicYear?: string | null;
  requests: StudentSignupApprovalRequest[];
  recentAdmissions: RecentClassAdmission[];
  eligibleStudents: EligibleClassStudent[];
  discovery?: {
    scopedStudentCount?: number;
    pendingProfileCount?: number;
    signupNotificationCount?: number;
    signupRequestCount?: number;
    legacySignupAuditCount?: number;
    orphanRequestCount?: number;
    staleRequestCount?: number;
    workflowInstalled?: boolean;
  };
};

type Props = {
  context: TeacherCloudContext | null;
  loading: boolean;
  error?: string;
  onNavigate?: (moduleId: string, featureId?: string) => void;
};

async function accessToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error('Your Teacher session expired. Sign in again.');
  return data.session.access_token;
}

export async function loadStudentSignupApprovalQueue(): Promise<QueuePayload> {
  const token = await accessToken();
  const response = await fetch('/api/teacher/student-signup-approvals', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Pending Student signup requests could not be loaded.');
  return {
    isClassTeacher: Boolean(payload.isClassTeacher),
    academicYearId: payload.academicYearId || null,
    academicYear: payload.academicYear || null,
    requests: Array.isArray(payload.requests) ? payload.requests : [],
    recentAdmissions: Array.isArray(payload.recentAdmissions) ? payload.recentAdmissions : [],
    eligibleStudents: Array.isArray(payload.eligibleStudents) ? payload.eligibleStudents : [],
    discovery: payload.discovery && typeof payload.discovery === 'object' ? payload.discovery : undefined
  };
}

export default function TeacherStudentSignupApprovals({ context, loading, error, onNavigate }: Props) {
  const [payload, setPayload] = useState<QueuePayload>({ isClassTeacher: false, requests: [], recentAdmissions: [], eligibleStudents: [] });
  const [busy, setBusy] = useState(false);
  const [actionKey, setActionKey] = useState('');
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [rejectingId, setRejectingId] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const classTeacherScopes = useMemo(
    () => (context?.assignments || []).filter(item => item.isClassTeacher),
    [context]
  );

  const load = async () => {
    if (!context) return;
    setBusy(true);
    setMessage(null);
    try {
      const next = await loadStudentSignupApprovalQueue();
      setPayload(next);
    } catch (e: any) {
      setPayload({ isClassTeacher: classTeacherScopes.length > 0, requests: [], recentAdmissions: [], eligibleStudents: [] });
      setMessage({ tone: 'error', text: e?.message || 'Student signup approval queue could not be loaded.' });
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { void load(); }, [context?.userId, classTeacherScopes.length]);

  const decide = async (request: StudentSignupApprovalRequest, decision: 'approve' | 'reject') => {
    if (decision === 'approve') {
      const ok = await requestActionConfirm({
        title: 'Approve Student account?',
        message: `Approve ${request.studentName} (${request.grNumber}) for Student Portal access? The account becomes active immediately.`,
        confirmLabel: 'Approve Account',
        tone: 'primary'
      });
      if (!ok) return;
    } else if (rejectReason.trim().length < 3) {
      setMessage({ tone: 'error', text: 'Enter a short rejection reason before rejecting the signup.' });
      return;
    }

    setActionKey(`${decision}:${request.accountUserId}`);
    setMessage(null);
    try {
      const token = await accessToken();
      const response = await fetch(`/api/teacher/student-signup-approvals/${encodeURIComponent(request.accountUserId)}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ decision, reason: decision === 'reject' ? rejectReason.trim() : '' })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.error || 'Student account decision could not be saved.');
      setPayload(current => ({ ...current, requests: current.requests.filter(item => item.accountUserId !== request.accountUserId) }));
      setRejectingId('');
      setRejectReason('');
      setMessage({
        tone: 'success',
        text: decision === 'approve'
          ? `${request.studentName}'s Student Portal account is active now.`
          : `${request.studentName}'s signup was rejected and the reason was recorded.`
      });
      window.dispatchEvent(new Event('refresh_notifications'));
    } catch (e: any) {
      setMessage({ tone: 'error', text: e?.message || 'Student account decision failed.' });
    } finally {
      setActionKey('');
    }
  };

  if (loading) return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm font-semibold text-slate-500">Loading Class Teacher signup approvals…</div>;
  if (error || !context) return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-900">{error || 'Teacher cloud context is unavailable.'}</div>;

  return (
    <div className="space-y-5" data-testid="teacher-student-signup-approvals">
      <section className="rounded-[1.6rem] border border-slate-800 bg-slate-950 p-5 text-white shadow-xl sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-cyan-300"><ShieldCheck className="h-5 w-5"/><span className="text-[10px] font-black uppercase tracking-[.2em]">Class Teacher Authority</span></div>
            <h1 className="mt-2 text-2xl font-black">Student Signup Approvals</h1>
            <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-300">Only Student Portal signups belonging to your current Headmaster-assigned Class Teacher class/division appear here. Passwords are never visible.</p>
          </div>
          <button type="button" onClick={() => void load()} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-black hover:bg-white/15 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin"/> : <RefreshCw className="h-4 w-4"/>} Refresh
          </button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4"><div className="text-[10px] font-black uppercase tracking-wider text-cyan-700">Pending Signup</div><div className="mt-2 text-3xl font-black text-slate-950">{payload.requests.length}</div></div>
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4"><div className="text-[10px] font-black uppercase tracking-wider text-violet-700">Class Teacher Scopes</div><div className="mt-2 text-3xl font-black text-slate-950">{classTeacherScopes.length}</div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Academic Year</div><div className="mt-2 text-sm font-black text-slate-950">{payload.academicYear || context.academicYear}</div></div>
      </section>

      {message && <div className={`rounded-2xl border p-4 text-xs font-bold ${message.tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900'}`}>{message.text}</div>}

      {!payload.isClassTeacher ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="font-black text-amber-950">Class Teacher duty required</h2>
          <p className="mt-2 text-xs leading-6 text-amber-900">This account currently has no active canonical Class Teacher assignment. Subject Teacher allocation alone cannot approve Student Portal accounts.</p>
          <button type="button" onClick={() => onNavigate?.('tr-my-assignments')} className="mt-4 rounded-xl bg-amber-900 px-4 py-2.5 text-xs font-black text-white">View My Academic Assignment</button>
        </section>
      ) : payload.requests.length === 0 ? (
        <section className={`rounded-2xl border p-8 text-center ${Number(payload.discovery?.orphanRequestCount || 0) > 0 || Number(payload.discovery?.staleRequestCount || 0) > 0 ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
          {Number(payload.discovery?.orphanRequestCount || 0) > 0 || Number(payload.discovery?.staleRequestCount || 0) > 0 ? <AlertCircle className="mx-auto h-9 w-9 text-amber-700"/> : <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-700"/>}
          <h2 className={`mt-3 font-black ${Number(payload.discovery?.orphanRequestCount || 0) > 0 || Number(payload.discovery?.staleRequestCount || 0) > 0 ? 'text-amber-950' : 'text-emerald-950'}`}>
            {Number(payload.discovery?.orphanRequestCount || 0) > 0
              ? 'Signup request exists, but its login profile is incomplete'
              : Number(payload.discovery?.staleRequestCount || 0) > 0
                ? 'Signup request exists, but the login is no longer Pending'
                : 'No pending Student signup'}
          </h2>
          <p className={`mt-2 text-xs ${Number(payload.discovery?.orphanRequestCount || 0) > 0 || Number(payload.discovery?.staleRequestCount || 0) > 0 ? 'text-amber-800' : 'text-emerald-800'}`}>
            {payload.discovery?.workflowInstalled === false
              ? 'R21 Student Signup Workflow setup is not installed. Install it before accepting new Student signups.'
              : Number(payload.discovery?.orphanRequestCount || 0) > 0
                ? 'The durable request was found, but the linked Pending login needs administrative repair before approval.'
                : 'New GR-based signup requests for your assigned class/division will appear here automatically.'}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-[10px] font-bold text-slate-500">
            <span className="rounded-full bg-white/80 px-2.5 py-1">Scoped students: {Number(payload.discovery?.scopedStudentCount || 0)}</span>
            <span className="rounded-full bg-white/80 px-2.5 py-1">Signup requests: {Number(payload.discovery?.signupRequestCount || 0)}</span>
            <span className="rounded-full bg-white/80 px-2.5 py-1">Pending logins: {Number(payload.discovery?.pendingProfileCount || 0)}</span>
            <span className="rounded-full bg-white/80 px-2.5 py-1">Legacy signup audits: {Number(payload.discovery?.legacySignupAuditCount || 0)}</span>
            <span className="rounded-full bg-white/80 px-2.5 py-1">Signup notifications: {Number(payload.discovery?.signupNotificationCount || 0)}</span>
          </div>
        </section>
      ) : (
        <section className="space-y-3">
          {payload.requests.map(request => {
            const approving = actionKey === `approve:${request.accountUserId}`;
            const rejecting = actionKey === `reject:${request.accountUserId}`;
            return (
              <article key={request.accountUserId} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><GraduationCap className="h-5 w-5 text-cyan-700"/><h3 className="text-base font-black text-slate-950">{request.studentName}</h3><span className="rounded-full bg-amber-100 px-2.5 py-1 text-[9px] font-black uppercase text-amber-800">Pending</span></div>
                    <div className="mt-3 grid gap-x-6 gap-y-2 text-xs text-slate-600 sm:grid-cols-2 xl:grid-cols-4">
                      <div><span className="font-bold text-slate-400">GR / Login ID</span><div className="font-mono font-black text-slate-900">{request.grNumber || '—'}</div>{request.requestCode ? <div className="mt-1 text-[9px] font-bold text-cyan-700">Request {request.requestCode}</div> : null}</div>
                      <div><span className="font-bold text-slate-400">Class / Division</span><div className="font-black text-slate-900">{request.className} · {divisionScreenLabel(request.divisionName)}</div></div>
                      <div><span className="font-bold text-slate-400">Roll</span><div className="font-black text-slate-900">{request.rollNumber || '—'}</div></div>
                      <div><span className="font-bold text-slate-400">Signup</span><div className="flex items-center gap-1 font-semibold text-slate-800"><Clock3 className="h-3.5 w-3.5"/>{request.requestedAt ? new Date(request.requestedAt).toLocaleString() : 'Pending'}</div></div>
                    </div>
                  </div>
                  <div className="grid shrink-0 gap-2 sm:grid-cols-2 lg:w-[270px]">
                    <button type="button" disabled={Boolean(actionKey)} onClick={() => void decide(request, 'approve')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-50">{approving ? <Loader2 className="h-4 w-4 animate-spin"/> : <CheckCircle2 className="h-4 w-4"/>}Approve</button>
                    <button type="button" disabled={Boolean(actionKey)} onClick={() => { setRejectingId(current => current === request.accountUserId ? '' : request.accountUserId); setRejectReason(''); }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-black text-rose-700 hover:bg-rose-100 disabled:opacity-50"><AlertCircle className="h-4 w-4"/>Reject</button>
                  </div>
                </div>
                {rejectingId === request.accountUserId && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4"><label className="text-[10px] font-black uppercase tracking-wider text-rose-700">Rejection reason</label><textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} placeholder="Example: GR/class details do not match the school record." className="mt-2 w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-rose-400"/><div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => { setRejectingId(''); setRejectReason(''); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">Cancel</button><button type="button" disabled={Boolean(actionKey)} onClick={() => void decide(request, 'reject')} className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50">{rejecting ? <Loader2 className="h-4 w-4 animate-spin"/> : <AlertCircle className="h-4 w-4"/>}Confirm Reject</button></div></div>}
              </article>
            );
          })}
        </section>
      )}

      {payload.isClassTeacher && payload.eligibleStudents.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[.14em] text-slate-400">Class roster / portal status</div>
              <h2 className="mt-1 text-base font-black text-slate-950">Students eligible to sign up with their GR Number</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">Admission alone does not create an approval request. A row becomes Pending Approval only after that Student submits the GR-based Student Portal signup form.</p>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-black text-slate-700">{payload.eligibleStudents.length} students</div>
          </div>
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-950 text-white"><tr><th className="px-3 py-2.5">GR / Login ID</th><th className="px-3 py-2.5">Student</th><th className="px-3 py-2.5">Class</th><th className="px-3 py-2.5">Portal Status</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {payload.eligibleStudents.map(student => {
                  const label = student.portalStatus === 'pending_approval' ? 'Pending Approval' : student.portalStatus === 'active' ? 'Active' : student.portalStatus === 'rejected' ? 'Rejected' : student.portalStatus === 'inactive' ? 'Inactive' : 'Not Signed Up';
                  const cls = student.portalStatus === 'pending_approval' ? 'bg-amber-100 text-amber-800' : student.portalStatus === 'active' ? 'bg-emerald-100 text-emerald-800' : student.portalStatus === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600';
                  return <tr key={student.studentId}><td className="px-3 py-3 font-mono font-black text-slate-900">{student.grNumber || '—'}</td><td className="px-3 py-3 font-black text-slate-950">{student.studentName}</td><td className="px-3 py-3 font-semibold text-slate-600">{student.className} · {divisionScreenLabel(student.divisionName)}</td><td className="px-3 py-3"><span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${cls}`}>{label}</span>{student.requestCode ? <div className="mt-1 text-[9px] font-bold text-cyan-700">{student.requestCode}</div> : null}</td></tr>;
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
