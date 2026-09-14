/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  BookUser,
  CheckCircle2,
  FileText,
  FolderOpen,
  GraduationCap,
  History,
  Loader2,
  RefreshCw,
  Save,
  Search,
  Send,
  ShieldCheck,
  UserRound,
  UsersRound
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { User } from '../types';
import { requestActionConfirm } from '../lib/actionConfirm';

type DirectorySection = 'master' | 'profile' | 'guardians' | 'placement' | 'history' | 'documents';

type StudentRow = {
  id: string;
  grNumber: string;
  fullName: string;
  gender?: string | null;
  dob?: string | null;
  address?: string | null;
  fatherName?: string | null;
  motherName?: string | null;
  mobileNumber?: string | null;
  classId?: string | null;
  divisionId?: string | null;
  academicYearId?: string | null;
  className?: string | null;
  divisionName?: string | null;
  academicYear?: string | null;
  rollNo?: string | number | null;
  status?: string | null;
  isActive?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type Option = { id: string; name: string; classId?: string | null };
type HistoryRow = { id: string; studentId: string; action: string; summary: string; createdAt: string; beforeStatus?: string | null; afterStatus?: string | null };
type RequiredDocument = { id: string; name: string; required: boolean; description?: string | null };
type UploadedDocument = { id: string; type: string; fileName: string; status: string; previewUrl?: string | null; createdAt?: string | null };
type LifecycleRequest = { id: string; studentId: string; requestedAction: string; note?: string | null; createdAt?: string | null; summary?: string | null; targetClassId?: string | null; targetDivisionId?: string | null; targetAcademicYearId?: string | null; student?: any };

type DirectoryPayload = {
  students: StudentRow[];
  classes: Option[];
  divisions: Option[];
  academicYears: Option[];
  statusHistory: HistoryRow[];
  requiredDocuments: RequiredDocument[];
};

type Props = {
  user: User;
  activeFeatureId?: string | null;
};

const featureToSection: Record<string, DirectorySection> = {
  'student-profile-master': 'profile',
  'guardian-linkage': 'guardians',
  'class-division-placement': 'placement',
  'student-status-history': 'history',
  'student-document-index': 'documents',
  'student-transfer': 'history',
  'student-passout': 'history',
  'student-leaving-status': 'history',
  'student-archive': 'history',
  'student-lifecycle-requests': 'history',
  'cl-student-profile': 'profile',
  'cl-guardian-details': 'guardians',
  'cl-class-placement': 'placement',
  'cl-student-document-index': 'documents',
  'cl-lifecycle-promotion': 'history',
  'cl-lifecycle-class-transfer': 'history',
  'cl-lifecycle-school-transfer': 'history',
  'cl-lifecycle-passout': 'history',
  'cl-lifecycle-leaving': 'history',
  'cl-lifecycle-archive': 'history',
  'cl-lifecycle-history': 'history'
};

const sections: Array<{ id: DirectorySection; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'master', label: 'Student Master', icon: BookUser },
  { id: 'profile', label: 'Student Profile Master', icon: UserRound },
  { id: 'guardians', label: 'Parent & Guardian Linkage', icon: UsersRound },
  { id: 'placement', label: 'Class & Division Placement', icon: GraduationCap },
  { id: 'history', label: 'Student Status & History', icon: History },
  { id: 'documents', label: 'Student Document Index', icon: FolderOpen }
];

async function api(url: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Secure session unavailable. Please sign in again.');
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
      Authorization: `Bearer ${session.access_token}`
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Request failed.');
  return payload;
}

function TextField({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[.12em] text-slate-500">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[10px] leading-4 text-slate-400">{hint}</span>}
    </label>
  );
}

function EmptySelection() {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <UserRound className="mx-auto h-9 w-9 text-slate-300" />
      <h3 className="mt-4 font-black text-slate-900">Choose a student first</h3>
      <p className="mt-2 text-xs leading-6 text-slate-500">Select a student from Student Master to open this dedicated page.</p>
    </div>
  );
}

export default function StudentDirectoryWorkspace({ user, activeFeatureId }: Props) {
  const [section, setSection] = useState<DirectorySection>(featureToSection[activeFeatureId || ''] || 'master');
  const focusedSectionLabel = activeFeatureId ? sections.find(item => item.id === section)?.label || null : null;
  const [payload, setPayload] = useState<DirectoryPayload>({ students: [], classes: [], divisions: [], academicYears: [], statusHistory: [], requiredDocuments: [] });
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [lifecycleNote, setLifecycleNote] = useState('');
  const [lifecycleTargetClassId, setLifecycleTargetClassId] = useState('');
  const [lifecycleTargetDivisionId, setLifecycleTargetDivisionId] = useState('');
  const [lifecycleTargetAcademicYearId, setLifecycleTargetAcademicYearId] = useState('');
  const [lifecycleRequests, setLifecycleRequests] = useState<LifecycleRequest[]>([]);
  const [lifecycleLoading, setLifecycleLoading] = useState(false);
  const isClerk = user.role === 'clerk';
  const isHeadmaster = user.role === 'headmaster';

  const selected = useMemo(
    () => payload.students.find(student => student.id === selectedId) || payload.students[0] || null,
    [payload.students, selectedId]
  );

  const [profileForm, setProfileForm] = useState({ fullName: '', gender: '', dob: '', address: '' });
  const [guardianForm, setGuardianForm] = useState({ fatherName: '', motherName: '', mobileNumber: '' });
  const [placementForm, setPlacementForm] = useState({ classId: '', divisionId: '', academicYearId: '', rollNo: '' });
  const [statusForm, setStatusForm] = useState({ status: 'Active' });

  const filteredStudents = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return payload.students;
    return payload.students.filter(student => [student.fullName, student.grNumber, student.className, student.divisionName, student.mobileNumber]
      .some(value => String(value || '').toLowerCase().includes(needle)));
  }, [payload.students, query]);

  const availableDivisions = useMemo(
    () => payload.divisions.filter(item => !item.classId || !placementForm.classId || String(item.classId) === String(placementForm.classId)),
    [payload.divisions, placementForm.classId]
  );

  const selectedHistory = useMemo(
    () => payload.statusHistory.filter(item => item.studentId === selected?.id),
    [payload.statusHistory, selected?.id]
  );

  const clerkLifecycleAction = useMemo(() => {
    const map: Record<string, string> = {
      'cl-lifecycle-promotion': 'promotion_preparation',
      'cl-lifecycle-class-transfer': 'class_transfer',
      'cl-lifecycle-school-transfer': 'school_transfer',
      'cl-lifecycle-passout': 'passout',
      'cl-lifecycle-leaving': 'leaving',
      'cl-lifecycle-archive': 'archive'
    };
    return activeFeatureId ? map[activeFeatureId] || null : null;
  }, [activeFeatureId]);

  const lifecycleDivisions = useMemo(() => payload.divisions.filter(item => !item.classId || !lifecycleTargetClassId || String(item.classId) === String(lifecycleTargetClassId)), [payload.divisions, lifecycleTargetClassId]);

  const load = async (keepSelection = true) => {
    setLoading(true);
    setMessage(null);
    try {
      const data = await api('/api/headmaster/student-directory');
      const next: DirectoryPayload = {
        students: Array.isArray(data.students) ? data.students : [],
        classes: Array.isArray(data.classes) ? data.classes : [],
        divisions: Array.isArray(data.divisions) ? data.divisions : [],
        academicYears: Array.isArray(data.academicYears) ? data.academicYears : [],
        statusHistory: Array.isArray(data.statusHistory) ? data.statusHistory : [],
        requiredDocuments: Array.isArray(data.requiredDocuments) ? data.requiredDocuments : []
      };
      setPayload(next);
      setSelectedId(current => keepSelection && next.students.some(item => item.id === current) ? current : (next.students[0]?.id || ''));
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'Student Directory could not be loaded.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(false); }, []);
  useEffect(() => {
    if (activeFeatureId && featureToSection[activeFeatureId]) setSection(featureToSection[activeFeatureId]);
    else if (!activeFeatureId) setSection('master');
  }, [activeFeatureId]);

  useEffect(() => {
    const statusByFeature: Record<string, string> = {
      'student-transfer': 'Transferred',
      'student-passout': 'Passout',
      'student-leaving-status': 'Leaving',
      'student-archive': 'Archived'
    };
    const nextStatus = activeFeatureId ? statusByFeature[activeFeatureId] : null;
    if (nextStatus) setStatusForm({ status: nextStatus });
  }, [activeFeatureId, selected?.id]);

  useEffect(() => {
    if (!selected) return;
    setProfileForm({
      fullName: selected.fullName || '',
      gender: selected.gender || '',
      dob: selected.dob ? String(selected.dob).slice(0, 10) : '',
      address: selected.address || ''
    });
    setGuardianForm({ fatherName: selected.fatherName || '', motherName: selected.motherName || '', mobileNumber: selected.mobileNumber || '' });
    setPlacementForm({
      classId: selected.classId || '',
      divisionId: selected.divisionId || '',
      academicYearId: selected.academicYearId || '',
      rollNo: selected.rollNo == null ? '' : String(selected.rollNo)
    });
    setStatusForm({ status: selected.status || (selected.isActive === false ? 'Inactive' : 'Active') });
    setLifecycleTargetClassId(selected.classId || '');
    setLifecycleTargetDivisionId(selected.divisionId || '');
    setLifecycleTargetAcademicYearId(selected.academicYearId || '');
    setUploadedDocuments([]);
    setMessage(null);
  }, [selected?.id]);

  useEffect(() => {
    if (section !== 'documents' || !selected?.id) return;
    let cancelled = false;
    const loadDocuments = async () => {
      setDocumentsLoading(true);
      try {
        const data = await api(`/api/headmaster/student-directory/${encodeURIComponent(selected.id)}/documents`);
        if (!cancelled) setUploadedDocuments(Array.isArray(data.documents) ? data.documents : []);
      } catch (error: any) {
        if (!cancelled) setMessage({ type: 'error', text: error?.message || 'Student documents could not be loaded.' });
      } finally {
        if (!cancelled) setDocumentsLoading(false);
      }
    };
    void loadDocuments();
    return () => { cancelled = true; };
  }, [section, selected?.id]);

  useEffect(() => {
    if (!isHeadmaster || section !== 'history') return;
    let cancelled = false;
    const loadRequests = async () => {
      setLifecycleLoading(true);
      try {
        const data = await api('/api/headmaster/student-lifecycle-requests');
        if (!cancelled) setLifecycleRequests(Array.isArray(data.requests) ? data.requests : []);
      } catch (error: any) {
        if (!cancelled) setMessage({ type: 'error', text: error?.message || 'Lifecycle requests could not be loaded.' });
      } finally {
        if (!cancelled) setLifecycleLoading(false);
      }
    };
    void loadRequests();
    return () => { cancelled = true; };
  }, [isHeadmaster, section]);

  const submitLifecycleRequest = async () => {
    if (!selected || !clerkLifecycleAction) return;
    if (clerkLifecycleAction === 'class_transfer' && !lifecycleTargetClassId) {
      setMessage({ type: 'error', text: 'Choose the target class in Class / Division Placement before sending this transfer request.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await api('/api/clerk/student-lifecycle-requests', {
        method: 'POST',
        body: JSON.stringify({
          studentId: selected.id,
          requestedAction: clerkLifecycleAction,
          note: lifecycleNote,
          targetClassId: clerkLifecycleAction === 'class_transfer' ? lifecycleTargetClassId : null,
          targetDivisionId: clerkLifecycleAction === 'class_transfer' ? lifecycleTargetDivisionId : null,
          targetAcademicYearId: clerkLifecycleAction === 'class_transfer' ? lifecycleTargetAcademicYearId : null
        })
      });
      setLifecycleNote('');
      setMessage({ type: 'success', text: 'Lifecycle request sent to the Headmaster. No final Student Master status was changed by the Clerk.' });
      await load(true);
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'Lifecycle request could not be sent.' });
    } finally {
      setSaving(false);
    }
  };

  const decideLifecycleRequest = async (requestId: string, decision: 'approve' | 'reject') => {
    if (!isHeadmaster) return;
    setSaving(true);
    setMessage(null);
    try {
      const result = await api(`/api/headmaster/student-lifecycle-requests/${encodeURIComponent(requestId)}/decision`, {
        method: 'POST', body: JSON.stringify({ decision })
      });
      setMessage({ type: 'success', text: result.promotionHandoff ? 'Request approved. Promotion execution remains in Result Analytics → Promotion Engine.' : `Lifecycle request ${decision === 'approve' ? 'approved' : 'rejected'} successfully.` });
      const data = await api('/api/headmaster/student-lifecycle-requests');
      setLifecycleRequests(Array.isArray(data.requests) ? data.requests : []);
      await load(true);
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'Lifecycle decision could not be saved.' });
    } finally {
      setSaving(false);
    }
  };

  const saveSection = async (targetSection: 'profile' | 'guardians' | 'placement' | 'history', body: Record<string, unknown>) => {
    if (!selected) return;
    if (isClerk && targetSection === 'history') { setMessage({ type: 'error', text: 'Final lifecycle status is Headmaster-controlled. Send a lifecycle request instead.' }); return; }
    setSaving(true);
    setMessage(null);
    try {
      await api(`/api/headmaster/student-directory/${encodeURIComponent(selected.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ section: targetSection, ...body })
      });
      setMessage({ type: 'success', text: 'Student Directory updated successfully.' });
      await load(true);
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'Student Directory could not be updated.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="grid min-h-[420px] place-items-center rounded-3xl border border-slate-200 bg-white"><Loader2 className="h-9 w-9 animate-spin text-cyan-600" /></div>;
  }

  return (
    <div className="space-y-5">
      <header className="rounded-[1.75rem] bg-[radial-gradient(circle_at_8%_0%,rgba(34,211,238,.2),transparent_35%),radial-gradient(circle_at_92%_0%,rgba(139,92,246,.2),transparent_38%),linear-gradient(135deg,#07172d,#080b1c_56%,#17112e)] p-6 text-white shadow-2xl sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-cyan-300"><ShieldCheck className="h-4 w-4" />Student Directory</div>
            <h1 className="mt-3 text-2xl font-black sm:text-3xl">{focusedSectionLabel || 'One student record, six dedicated operational pages.'}</h1>
            <p className="mt-2 max-w-3xl text-xs leading-6 text-slate-300">Profile, guardians, placement, lifecycle and admission documents remain separate, but always use the same permanent Student Master record. Clerk lifecycle work is routed to Headmaster approval.</p>
          </div>
          <button onClick={() => void load(true)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-xs font-black"><RefreshCw className="h-4 w-4" />Refresh</button>
        </div>
      </header>

      {message && <div className={`rounded-xl border p-4 text-sm font-bold ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>{message.text}</div>}

      {!activeFeatureId && (
        <nav className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 sm:grid-cols-2 xl:grid-cols-6">
          {sections.map(item => {
            const Icon = item.icon;
            return <button key={item.id} onClick={() => setSection(item.id)} className={`flex min-h-14 items-center gap-2 rounded-xl px-3 py-3 text-left text-[10px] font-black transition ${section === item.id ? 'bg-slate-950 text-white shadow-lg' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}><Icon className="h-4 w-4 shrink-0" />{item.label}</button>;
          })}
        </nav>
      )}

      <div className="grid gap-5 xl:grid-cols-[330px_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name, GR, class or mobile" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-xs font-semibold outline-none focus:border-cyan-500" />
          </div>
          <div className="mt-3 max-h-[650px] space-y-2 overflow-y-auto pr-1">
            {filteredStudents.map(student => <button key={student.id} onClick={() => setSelectedId(student.id)} className={`w-full rounded-xl border p-3 text-left transition ${selected?.id === student.id ? 'border-cyan-400 bg-cyan-50 shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
              <div className="text-xs font-black text-slate-950">{student.fullName}</div>
              <div className="mt-1 font-mono text-[10px] font-bold text-cyan-700">{student.grNumber || 'GR not assigned'}</div>
              <div className="mt-1 text-[10px] text-slate-500">{student.className || 'Unassigned'} {student.divisionName || ''} · {student.status || 'Active'}</div>
            </button>)}
            {filteredStudents.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">No matching student found.</div>}
          </div>
        </aside>

        <section className="min-w-0">
          {section === 'master' && <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ['Total students', payload.students.length],
                ['Active', payload.students.filter(item => item.isActive !== false && !['inactive', 'archived', 'passout'].includes(String(item.status || '').toLowerCase())).length],
                ['Unassigned class', payload.students.filter(item => !item.classId).length],
                ['Missing guardian mobile', payload.students.filter(item => !item.mobileNumber).length]
              ].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="text-3xl font-black text-slate-950">{value}</div><div className="mt-2 text-xs font-bold text-slate-500">{label}</div></div>)}
            </div>
            {selected ? <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="font-mono text-xs font-black text-cyan-700">{selected.grNumber}</div><h2 className="mt-2 text-2xl font-black text-slate-950">{selected.fullName}</h2><p className="mt-2 text-xs text-slate-500">{selected.className || 'Class not assigned'} {selected.divisionName || ''} · Roll {selected.rollNo || '—'} · {selected.status || 'Active'}</p></div><div className="rounded-xl bg-slate-950 px-4 py-3 text-xs font-black text-white">Permanent Student ID<br/><span className="font-mono text-[10px] text-cyan-300">{selected.id}</span></div></div><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{sections.slice(1).map(item => { const Icon = item.icon; return <button key={item.id} onClick={() => setSection(item.id)} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left hover:border-cyan-300 hover:bg-cyan-50"><Icon className="h-5 w-5 text-cyan-700"/><span className="text-xs font-black text-slate-900">{item.label}</span></button>; })}</div></div> : <EmptySelection />}
          </div>}

          {section === 'profile' && (selected ? <form onSubmit={event => { event.preventDefault(); void saveSection('profile', profileForm); }} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"><h2 className="text-xl font-black text-slate-950">Student Profile Master</h2><p className="mt-2 text-xs text-slate-500">Core identity fields for the selected permanent Student Master record.</p><div className="mt-6 grid gap-5 md:grid-cols-2"><TextField label="GR number"><input value={selected.grNumber || ''} disabled className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-bold text-slate-500" /></TextField><TextField label="Student full name"><input value={profileForm.fullName} onChange={e => setProfileForm(current => ({ ...current, fullName: e.target.value }))} required className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-cyan-500" /></TextField><TextField label="Gender"><select value={profileForm.gender} onChange={e => setProfileForm(current => ({ ...current, gender: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold"><option value="">Not specified</option><option>Male</option><option>Female</option><option>Other</option></select></TextField><TextField label="Date of birth"><input type="date" value={profileForm.dob} onChange={e => setProfileForm(current => ({ ...current, dob: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold" /></TextField><div className="md:col-span-2"><TextField label="Residential address"><textarea rows={4} value={profileForm.address} onChange={e => setProfileForm(current => ({ ...current, address: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-cyan-500" /></TextField></div></div><button disabled={saving} className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-4 text-sm font-black text-white disabled:opacity-50">{saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}Save Student Profile</button></form> : <EmptySelection />)}

          {section === 'guardians' && (selected ? <form onSubmit={event => { event.preventDefault(); void saveSection('guardians', guardianForm); }} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"><h2 className="text-xl font-black text-slate-950">Parent & Guardian Linkage</h2><p className="mt-2 text-xs text-slate-500">Guardian identity and primary contact linked to {selected.fullName}.</p><div className="mt-6 grid gap-5 md:grid-cols-2"><TextField label="Father name"><input value={guardianForm.fatherName} onChange={e => setGuardianForm(current => ({ ...current, fatherName: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold" /></TextField><TextField label="Mother name"><input value={guardianForm.motherName} onChange={e => setGuardianForm(current => ({ ...current, motherName: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold" /></TextField><div className="md:col-span-2"><TextField label="Primary guardian mobile"><input inputMode="tel" value={guardianForm.mobileNumber} onChange={e => setGuardianForm(current => ({ ...current, mobileNumber: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold" /></TextField></div></div><button disabled={saving} className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-4 text-sm font-black text-white disabled:opacity-50">{saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}Save Guardian Linkage</button></form> : <EmptySelection />)}

          {section === 'placement' && (selected ? <form onSubmit={event => { event.preventDefault(); void saveSection('placement', placementForm); }} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"><h2 className="text-xl font-black text-slate-950">Class & Division Placement</h2><p className="mt-2 text-xs text-slate-500">{isClerk ? 'Current placement is shown here. Clerk may correct the roll number; class/division/year movement must go through Student Lifecycle Support for Headmaster approval.' : 'Controlled current-year placement for the selected student.'}</p>{isClerk && <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-bold leading-5 text-amber-900">To change Class, Division or Academic Year, open <strong>Student Lifecycle Support → Class / Division Transfer Request</strong>. This prevents a clerical edit from bypassing Headmaster approval.</div>}<div className="mt-6 grid gap-5 md:grid-cols-2"><TextField label="Academic year"><select disabled={isClerk} value={placementForm.academicYearId} onChange={e => setPlacementForm(current => ({ ...current, academicYearId: e.target.value }))} className={`w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold ${isClerk ? 'bg-slate-100 text-slate-500' : 'bg-white'}`}><option value="">Not assigned</option>{payload.academicYears.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></TextField><TextField label="Class"><select disabled={isClerk} value={placementForm.classId} onChange={e => setPlacementForm(current => ({ ...current, classId: e.target.value, divisionId: '' }))} className={`w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold ${isClerk ? 'bg-slate-100 text-slate-500' : 'bg-white'}`}><option value="">Not assigned</option>{payload.classes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></TextField><TextField label="Division"><select disabled={isClerk} value={placementForm.divisionId} onChange={e => setPlacementForm(current => ({ ...current, divisionId: e.target.value }))} className={`w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold ${isClerk ? 'bg-slate-100 text-slate-500' : 'bg-white'}`}><option value="">No division</option>{availableDivisions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></TextField><TextField label="Roll number"><input inputMode="numeric" value={placementForm.rollNo} onChange={e => setPlacementForm(current => ({ ...current, rollNo: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold" /></TextField></div><button disabled={saving} className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-4 text-sm font-black text-white disabled:opacity-50">{saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}{isClerk ? 'Save Roll Number Correction' : 'Save Class Placement'}</button></form> : <EmptySelection />)}

          {section === 'history' && (selected ? <div className="space-y-5">
            {isClerk ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
                <h2 className="text-xl font-black text-slate-950">Student Lifecycle Support</h2>
                <p className="mt-2 text-xs leading-6 text-slate-500">Clerk prepares and sends an audited request. Transfer, pass-out, leaving and archive are never applied directly here. Promotion execution stays in the Result Promotion Engine.</p>
                <div className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-xs font-bold text-cyan-900">Current status: {selected.status || (selected.isActive === false ? 'Inactive' : 'Active')}</div>
                {clerkLifecycleAction ? <>
                  <div className="mt-5"><TextField label="Office note / reason"><textarea rows={4} value={lifecycleNote} onChange={e => setLifecycleNote(e.target.value)} placeholder="Add supporting office note for the Headmaster..." className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold" /></TextField></div>
                  {clerkLifecycleAction === 'class_transfer' && <div className="mt-5 grid gap-4 md:grid-cols-3"><TextField label="Target academic year"><select value={lifecycleTargetAcademicYearId} onChange={e => setLifecycleTargetAcademicYearId(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold"><option value="">Current / unchanged</option>{payload.academicYears.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></TextField><TextField label="Target class"><select value={lifecycleTargetClassId} onChange={e => { setLifecycleTargetClassId(e.target.value); setLifecycleTargetDivisionId(''); }} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold"><option value="">Choose class</option>{payload.classes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></TextField><TextField label="Target division"><select value={lifecycleTargetDivisionId} onChange={e => setLifecycleTargetDivisionId(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold"><option value="">No division</option>{lifecycleDivisions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></TextField></div>}
                  <button type="button" disabled={saving} onClick={() => void submitLifecycleRequest()} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-4 text-sm font-black text-white disabled:opacity-50">{saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}Send to Headmaster</button>
                </> : <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-5 text-xs text-slate-600">This page is request/status history only. Choose a specific lifecycle action from the Clerk menu to prepare a new request.</div>}
              </div>
            ) : (
              <form onSubmit={async event => { event.preventDefault(); if (await requestActionConfirm({ title: 'Change student status?', message: `Change ${selected.fullName}'s status to ${statusForm.status}?`, confirmLabel: 'Change Status', tone: 'warning' })) void saveSection('history', statusForm); }} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
                <h2 className="text-xl font-black text-slate-950">Student Status & History</h2><p className="mt-2 text-xs text-slate-500">Final status changes are Headmaster-only, audited and never silently delete the Student Master record.</p>
                <div className="mt-6"><TextField label="Current status"><select value={statusForm.status} onChange={e => setStatusForm({ status: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold"><option>Active</option><option>Inactive</option><option>Transferred</option><option>Passout</option><option>Leaving</option><option>Archived</option></select></TextField></div>
                <button disabled={saving} className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-4 text-sm font-black text-white disabled:opacity-50">{saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}Save Status Change</button>
              </form>
            )}
            {isHeadmaster && <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"><div className="flex items-center justify-between gap-3"><div><h3 className="font-black text-slate-950">Pending Clerk lifecycle requests</h3><p className="mt-1 text-xs text-slate-500">Approve/reject here. Promotion approvals hand off to the Promotion Engine rather than changing class directly.</p></div>{lifecycleLoading && <Loader2 className="h-5 w-5 animate-spin text-cyan-600" />}</div><div className="mt-4 space-y-3">{lifecycleRequests.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">No pending Clerk lifecycle request.</div> : lifecycleRequests.map(req => <div key={req.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="text-xs font-black text-slate-900">{req.student?.full_name || req.studentId} · {req.requestedAction.replaceAll('_',' ')}</div><div className="mt-1 text-[10px] text-slate-500">{req.note || req.summary || 'No office note'} · {req.createdAt ? new Date(req.createdAt).toLocaleString() : ''}</div><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" disabled={saving} onClick={() => void decideLifecycleRequest(req.id,'approve')} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white">Approve</button><button type="button" disabled={saving} onClick={() => void decideLifecycleRequest(req.id,'reject')} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-black text-white">Reject</button></div></div>)}</div></div>}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"><h3 className="font-black text-slate-950">Audit history</h3><div className="mt-4 space-y-3">{selectedHistory.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">No lifecycle/status audit event has been recorded yet.</div> : selectedHistory.map(item => <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div className="text-xs font-black text-slate-900">{item.summary || item.action}</div><div className="text-[10px] text-slate-400">{item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}</div></div>{(item.beforeStatus || item.afterStatus) && <div className="mt-2 text-[10px] font-bold text-slate-500">{item.beforeStatus || '—'} → {item.afterStatus || '—'}</div>}</div>)}</div></div>
          </div> : <EmptySelection />)}

          {section === 'documents' && (selected ? <div className="space-y-5"><div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-black text-slate-950">Student Document Index</h2><p className="mt-2 text-xs leading-6 text-slate-500">Required document master and documents received with the linked admission application.</p></div><FileText className="h-7 w-7 text-cyan-700" /></div><div className="mt-6 grid gap-3 md:grid-cols-2">{payload.requiredDocuments.map(doc => { const uploaded = uploadedDocuments.find(item => item.type === doc.id || item.type === doc.name || item.fileName.toLowerCase().includes(doc.name.toLowerCase())); return <div key={doc.id} className={`rounded-xl border p-4 ${uploaded ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}><div className="flex items-start gap-3">{uploaded ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /> : <FileText className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />}<div><div className="text-xs font-black text-slate-900">{doc.name}</div><div className="mt-1 text-[10px] text-slate-500">{doc.required ? 'Required' : 'Optional'} · {uploaded ? `Received (${uploaded.status})` : 'Not linked'}</div></div></div></div>; })}{payload.requiredDocuments.length === 0 && <div className="md:col-span-2 rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">No required-document master is configured.</div>}</div></div><div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"><h3 className="font-black text-slate-950">Uploaded admission documents</h3>{documentsLoading ? <div className="grid min-h-32 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-cyan-600" /></div> : <div className="mt-4 space-y-3">{uploadedDocuments.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">No linked admission documents were found for this Student Master record.</div> : uploadedDocuments.map(doc => <div key={doc.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center"><FileText className="h-5 w-5 shrink-0 text-cyan-700"/><div className="min-w-0 flex-1"><div className="break-words text-xs font-black text-slate-900">{doc.fileName}</div><div className="mt-1 text-[10px] text-slate-500">{doc.type.replaceAll('_', ' ')} · {doc.status}</div></div>{doc.previewUrl && <a href={doc.previewUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-[10px] font-black text-slate-900">View document</a>}</div>)}</div>}</div></div> : <EmptySelection />)}
        </section>
      </div>
    </div>
  );
}
