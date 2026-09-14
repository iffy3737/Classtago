import React, { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  Ban,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileClock,
  Languages,
  Loader2,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import type { User as UserType } from '../types';
import { supabase } from '../lib/supabase';
import { requestActionConfirm } from '../lib/actionConfirm';
import { printSectionById } from '../utils/printSection';

type Props = {
  user: UserType;
  activeFeatureId?: string | null;
};

type CertificateSnapshot = {
  grNumber?: string;
  studentName?: string;
  certificateType?: string;
  certificateNumber?: string;
  issueDate?: string;
  purpose?: string;
  expiryDate?: string;
  language?: string;
  remarks?: string;
  preparedBy?: string;
  approvedBy?: string;
  customTitle?: string;
  customBody?: string;
  lcFields?: Record<string, string> | null;
  officialMode?: boolean;
};

type CertificateRequest = {
  id: string;
  studentId?: string;
  createdAt?: string | null;
  certificate: CertificateSnapshot;
  status: 'pending' | 'approve' | 'reject' | string;
  decisionAt?: string | null;
  decisionNote?: string | null;
  decidedByName?: string | null;
  certificateStatus?: 'valid' | 'revoked' | 'expired' | null;
  statusChangedAt?: string | null;
  statusReason?: string | null;
  expiryDate?: string | null;
};

type PrintLanguage = 'en' | 'mr' | 'ur';

const LABELS: Record<PrintLanguage, Record<string, string>> = {
  en: {
    certificate: 'Official School Certificate',
    student: 'Student Name',
    gr: 'GR Number',
    type: 'Certificate Type',
    number: 'Certificate Number',
    date: 'Issue Date',
    purpose: 'Purpose / Reason',
    authority: 'Authorized by Headmaster',
    verification: 'Verification ID',
  },
  mr: {
    certificate: 'अधिकृत शाळा प्रमाणपत्र',
    student: 'विद्यार्थ्याचे नाव',
    gr: 'जनरल रजिस्टर क्रमांक',
    type: 'प्रमाणपत्र प्रकार',
    number: 'प्रमाणपत्र क्रमांक',
    date: 'जारी दिनांक',
    purpose: 'उद्देश / कारण',
    authority: 'मुख्याध्यापकांची अधिकृत मान्यता',
    verification: 'पडताळणी क्रमांक',
  },
  ur: {
    certificate: 'سرکاری اسکول سرٹیفکیٹ',
    student: 'طالب علم کا نام',
    gr: 'جنرل رجسٹر نمبر',
    type: 'سرٹیفکیٹ کی قسم',
    number: 'سرٹیفکیٹ نمبر',
    date: 'تاریخ اجرا',
    purpose: 'مقصد / وجہ',
    authority: 'صدر مدرس کی منظوری',
    verification: 'تصدیقی نمبر',
  },
};

const featureTitle: Record<string, string> = {
  'certificate-approval': 'Certificate Approval Queue',
  'leaving-certificate-issue': 'Leaving Certificate Final Issue',
  'official-document-vault': 'Official Issued Certificate Vault',
  'document-issue-history': 'Certificate Issue History',
  'multilingual-document-print': 'Multilingual Official Print',
};

async function api(url: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Secure session unavailable. Please sign in again.');
  const response = await fetch(url, {
    ...options,
    cache: 'no-store',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
      Authorization: `Bearer ${session.access_token}`,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Certificate workflow request failed.');
  return payload;
}

const shortDate = (value?: string | null) => value ? String(value).slice(0, 10) : '—';
const certTypeLabel = (value?: string) => String(value || 'certificate').replace(/[_-]+/g, ' ').replace(/\b\w/g, m => m.toUpperCase());

export default function HeadmasterCertificateCloudWorkspace({ user, activeFeatureId = 'certificate-approval' }: Props) {
  const feature = activeFeatureId || 'certificate-approval';
  const [rows, setRows] = useState<CertificateRequest[]>([]);
  const [school, setSchool] = useState<{ name?: string; code?: string }>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [printLanguage, setPrintLanguage] = useState<PrintLanguage>('en');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = await api('/api/admin/certificate-requests');
      const nextRows = Array.isArray(payload.requests) ? payload.requests : [];
      setRows(nextRows);
      setSchool(payload.school || {});
      setSelectedId(current => current && nextRows.some((row: CertificateRequest) => row.id === current)
        ? current
        : String(nextRows.find((row: CertificateRequest) => row.status === 'approve')?.id || nextRows[0]?.id || ''));
    } catch (e: any) {
      setRows([]);
      setError(e?.message || 'Certificate workflow could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const pending = useMemo(() => rows.filter(row => row.status === 'pending'), [rows]);
  const issued = useMemo(() => rows.filter(row => row.status === 'approve'), [rows]);
  const rejected = useMemo(() => rows.filter(row => row.status === 'reject'), [rows]);
  const revoked = useMemo(() => issued.filter(row => row.certificateStatus === 'revoked'), [issued]);

  const scoped = useMemo(() => {
    let next = rows;
    if (feature === 'certificate-approval') next = pending;
    if (feature === 'leaving-certificate-issue') next = rows.filter(row => String(row.certificate?.certificateType || '').toLowerCase() === 'leaving');
    if (feature === 'official-document-vault' || feature === 'multilingual-document-print') next = issued;
    const q = search.trim().toLowerCase();
    if (q) next = next.filter(row => [
      row.certificate?.studentName,
      row.certificate?.grNumber,
      row.certificate?.certificateNumber,
      row.certificate?.certificateType,
      row.status,
      row.certificateStatus,
    ].some(value => String(value || '').toLowerCase().includes(q)));
    return next;
  }, [feature, issued, pending, rows, search]);

  const selected = useMemo(() => rows.find(row => row.id === selectedId) || issued[0] || null, [issued, rows, selectedId]);

  const decide = async (row: CertificateRequest, decision: 'approve' | 'reject') => {
    let note = '';
    if (decision === 'reject') {
      note = window.prompt('Rejection reason (required for the official audit trail):', '')?.trim() || '';
      if (!note) return;
    }
    const approved = await requestActionConfirm({
      title: decision === 'approve' ? 'Approve and issue certificate?' : 'Reject certificate request?',
      message: decision === 'approve'
        ? `This will officially issue ${certTypeLabel(row.certificate?.certificateType)} for ${row.certificate?.studentName || 'this student'} and create a permanent audit decision.`
        : `This will reject the request for ${row.certificate?.studentName || 'this student'}. The request and rejection will remain in history.`,
      confirmLabel: decision === 'approve' ? 'Approve & Issue' : 'Reject Request',
      tone: decision === 'approve' ? 'primary' : 'danger',
    });
    if (!approved) return;
    setBusyId(row.id);
    setError('');
    try {
      await api(`/api/headmaster/certificate-requests/${encodeURIComponent(row.id)}/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision, note }),
      });
      await load();
    } catch (e: any) {
      setError(e?.message || 'Certificate decision could not be saved.');
    } finally {
      setBusyId('');
    }
  };

  const changeCertificateStatus = async (row: CertificateRequest, status: 'revoked' | 'valid') => {
    const certificateNumber = String(row.certificate?.certificateNumber || '').trim();
    if (!certificateNumber) return;
    let reason = '';
    if (status === 'revoked') {
      reason = window.prompt('Revocation reason (required and permanently audited):', '')?.trim() || '';
      if (!reason) return;
    }
    const confirmed = await requestActionConfirm({
      title: status === 'revoked' ? 'Revoke official certificate?' : 'Restore certificate validity?',
      message: status === 'revoked'
        ? `Certificate ${certificateNumber} will remain in the vault but public verification will show REVOKED.`
        : `Certificate ${certificateNumber} will be restored to valid status unless its expiry date has passed.`,
      confirmLabel: status === 'revoked' ? 'Revoke Certificate' : 'Restore Validity',
      tone: status === 'revoked' ? 'danger' : 'primary',
    });
    if (!confirmed) return;
    setBusyId(row.id);
    setError('');
    try {
      await api(`/api/headmaster/certificates/${encodeURIComponent(certificateNumber)}/status`, {
        method: 'POST',
        body: JSON.stringify({ status, reason, expiryDate: row.expiryDate || row.certificate?.expiryDate || '' }),
      });
      await load();
    } catch (e: any) {
      setError(e?.message || 'Certificate status could not be changed.');
    } finally {
      setBusyId('');
    }
  };

  if (user.role !== 'headmaster') {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-bold text-rose-800">Headmaster authority is required for this workspace.</div>;
  }

  if (loading) {
    return <div className="grid min-h-[360px] place-items-center rounded-3xl border border-slate-200 bg-white"><Loader2 className="h-9 w-9 animate-spin text-cyan-600" /></div>;
  }

  const labels = LABELS[printLanguage];

  return <div className="space-y-5 text-left">
    <header className="rounded-[1.75rem] bg-slate-950 p-6 text-white shadow-xl sm:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-cyan-300"><ShieldCheck className="h-4 w-4" />Headmaster final authority · cloud canonical</div>
          <h1 className="mt-3 text-2xl font-black">{featureTitle[feature] || 'Certificates & Documents'}</h1>
          <p className="mt-2 max-w-3xl text-xs leading-6 text-slate-300">Clerk prepares. Headmaster approves or rejects. Issued certificates remain permanently traceable through the school audit trail and public verification service.</p>
        </div>
        <button onClick={() => void load()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-xs font-black"><RefreshCw className="h-4 w-4" />Refresh cloud</button>
      </div>
    </header>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Pending decision" value={pending.length} icon={<Clock3 className="h-5 w-5" />} />
      <StatCard label="Officially issued" value={issued.length} icon={<BadgeCheck className="h-5 w-5" />} />
      <StatCard label="Rejected" value={rejected.length} icon={<XCircle className="h-5 w-5" />} />
      <StatCard label="Revoked" value={revoked.length} icon={<Ban className="h-5 w-5" />} />
    </div>

    {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">{error}</div>}

    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1 sm:max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student, GR, certificate number or type" className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-xs font-semibold outline-none focus:border-cyan-400" /></div>
        <div className="text-[11px] font-bold text-slate-500">{scoped.length} cloud record{scoped.length === 1 ? '' : 's'}</div>
      </div>
    </div>

    {scoped.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" /><div className="mt-3 text-sm font-black text-slate-900">No matching certificate records</div><div className="mt-1 text-xs text-slate-500">This view does not invent demo certificates when the cloud queue is empty.</div></div> : <div className="space-y-3">
      {scoped.map(row => <CertificateRow key={row.id} row={row} busy={busyId === row.id} onApprove={() => void decide(row, 'approve')} onReject={() => void decide(row, 'reject')} onRevoke={() => void changeCertificateStatus(row, 'revoked')} onRestore={() => void changeCertificateStatus(row, 'valid')} onSelectPrint={() => { setSelectedId(row.id); setPrintLanguage((['en','mr','ur'].includes(String(row.certificate?.language || '')) ? String(row.certificate?.language) : 'en') as PrintLanguage); setTimeout(() => printSectionById('headmaster-official-certificate-print', `Certificate ${row.certificate?.certificateNumber || ''}`), 40); }} />)}
    </div>}

    {feature === 'multilingual-document-print' && <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div><div className="flex items-center gap-2 text-sm font-black text-slate-950"><Languages className="h-5 w-5 text-cyan-700" />Official multilingual print</div><p className="mt-1 text-xs text-slate-500">Only Headmaster-approved certificates are printable here.</p></div>
        <div className="flex flex-wrap gap-2">
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"><option value="">Select issued certificate</option>{issued.map(row => <option key={row.id} value={row.id}>{row.certificate?.certificateNumber || row.id} · {row.certificate?.studentName || 'Student'}</option>)}</select>
          <select value={printLanguage} onChange={e => setPrintLanguage(e.target.value as PrintLanguage)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"><option value="en">English</option><option value="mr">मराठी</option><option value="ur">اردو</option></select>
          <button disabled={!selected} onClick={() => printSectionById('headmaster-official-certificate-print', `Certificate ${selected?.certificate?.certificateNumber || ''}`)} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white disabled:opacity-40"><Printer className="h-4 w-4" />Smart Print / PDF</button>
        </div>
      </div>
    </div>}

    <div id="headmaster-official-certificate-print" className="mx-auto max-w-4xl rounded-3xl border-4 border-double border-slate-800 bg-white p-8 text-slate-950 shadow-sm print:max-w-none print:shadow-none" dir={printLanguage === 'ur' ? 'rtl' : 'ltr'}>
      {selected ? <>
        <div className="text-center"><div className="text-xs font-black uppercase tracking-[.18em]">{school.name || 'School'}</div>{school.code && <div className="mt-1 text-[10px] font-bold text-slate-500">School Code: {school.code}</div>}<div className="mx-auto mt-5 h-px max-w-xl bg-slate-300" /><h2 className="mt-5 text-2xl font-black">{selected.certificate?.customTitle || labels.certificate}</h2></div>
        {selected.certificate?.customBody ? <div className="mx-auto mt-7 max-w-2xl whitespace-pre-wrap text-center text-sm leading-7">{selected.certificate.customBody}</div> : <div className="mx-auto mt-8 grid max-w-2xl gap-4 text-sm sm:grid-cols-2"><PrintField label={labels.student} value={selected.certificate?.studentName} /><PrintField label={labels.gr} value={selected.certificate?.grNumber} /><PrintField label={labels.type} value={certTypeLabel(selected.certificate?.certificateType)} /><PrintField label={labels.number} value={selected.certificate?.certificateNumber} /><PrintField label={labels.date} value={shortDate(selected.certificate?.issueDate || selected.decisionAt)} /><PrintField label={labels.purpose} value={selected.certificate?.purpose || '—'} /></div>}
        {selected.certificate?.lcFields && Object.keys(selected.certificate.lcFields).length > 0 && <div className="mx-auto mt-7 max-w-2xl rounded-2xl border border-slate-200 p-4"><div className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500">Leaving Certificate particulars</div><div className="grid gap-3 sm:grid-cols-2">{Object.entries(selected.certificate.lcFields).filter(([, value]) => String(value || '').trim()).map(([key, value]) => <PrintField key={key} label={key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())} value={value} />)}</div></div>}
        <div className="mx-auto mt-10 flex max-w-2xl items-end justify-between gap-8"><div className="text-[10px] text-slate-500"><div className="font-black text-slate-700">{labels.verification}</div><div className="mt-1 font-mono font-bold">{selected.certificate?.certificateNumber || '—'}</div></div><div className="min-w-48 border-t border-slate-900 pt-2 text-center text-xs font-black">{selected.certificate?.approvedBy || selected.decidedByName || user.name}<div className="mt-1 text-[9px] font-bold text-slate-500">{labels.authority}</div></div></div>
      </> : <div className="py-12 text-center text-sm font-bold text-slate-500">Select an officially issued certificate to prepare print/PDF.</div>}
    </div>

    <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-xs leading-6 text-cyan-900"><FileCheck2 className="mr-2 inline h-4 w-4" />Headmaster decisions do not delete requests. Approval, rejection, revocation and restoration remain in the permanent school audit trail. Public verification exposes only minimum certificate status information.</div>
  </div>;
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-50 text-cyan-700">{icon}</div><div className="text-2xl font-black text-slate-950">{value}</div></div><div className="mt-3 text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</div></div>;
}

function CertificateRow({ row, busy, onApprove, onReject, onRevoke, onRestore, onSelectPrint }: { row: CertificateRequest; busy: boolean; onApprove: () => void; onReject: () => void; onRevoke: () => void; onRestore: () => void; onSelectPrint: () => void }) {
  const cert = row.certificate || {};
  const isPending = row.status === 'pending';
  const isIssued = row.status === 'approve';
  const statusLabel = isPending ? 'Pending Headmaster' : row.status === 'reject' ? 'Rejected' : row.certificateStatus === 'revoked' ? 'Revoked' : row.certificateStatus === 'expired' ? 'Expired' : 'Issued / Valid';
  const statusClass = isPending ? 'bg-amber-50 text-amber-800 border-amber-200' : row.status === 'reject' || row.certificateStatus === 'revoked' ? 'bg-rose-50 text-rose-800 border-rose-200' : row.certificateStatus === 'expired' ? 'bg-orange-50 text-orange-800 border-orange-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200';
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-wide ${statusClass}`}>{statusLabel}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-slate-600">{certTypeLabel(cert.certificateType)}</span></div>
        <div className="mt-3 text-base font-black text-slate-950">{cert.studentName || 'Student'}</div>
        <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-[11px] font-semibold text-slate-500"><span>GR: <b className="text-slate-700">{cert.grNumber || '—'}</b></span><span>Certificate: <b className="font-mono text-slate-700">{cert.certificateNumber || 'Assigned on approval'}</b></span><span>Prepared: <b className="text-slate-700">{shortDate(row.createdAt)}</b></span>{row.decisionAt && <span>Decision: <b className="text-slate-700">{shortDate(row.decisionAt)}</b></span>}</div>
        {row.decisionNote && <div className="mt-2 text-[11px] font-semibold text-rose-700">Decision note: {row.decisionNote}</div>}{row.statusReason && <div className="mt-2 text-[11px] font-semibold text-rose-700">Status reason: {row.statusReason}</div>}
      </div>
      <div className="flex flex-wrap gap-2">
        {isPending && <><button disabled={busy} onClick={onApprove} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Approve & Issue</button><button disabled={busy} onClick={onReject} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-black text-rose-800 disabled:opacity-50"><XCircle className="h-4 w-4" />Reject</button></>}
        {isIssued && <button onClick={onSelectPrint} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-800"><Printer className="h-4 w-4" />Print / PDF</button>}
        {isIssued && row.certificateStatus !== 'revoked' && <button disabled={busy} onClick={onRevoke} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-black text-rose-800 disabled:opacity-50"><Ban className="h-4 w-4" />Revoke</button>}
        {isIssued && row.certificateStatus === 'revoked' && <button disabled={busy} onClick={onRestore} className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2.5 text-xs font-black text-cyan-800 disabled:opacity-50"><RotateCcw className="h-4 w-4" />Restore</button>}
        {isIssued && cert.certificateNumber && <button onClick={() => window.open(`/verify-certificate/${encodeURIComponent(String(cert.certificateNumber))}`, '_blank', 'noopener,noreferrer')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-black text-slate-700"><FileClock className="h-4 w-4" />Verify</button>}
      </div>
    </div>
  </div>;
}

function PrintField({ label, value }: { label: string; value?: unknown }) {
  return <div className="rounded-xl border border-slate-200 p-3"><div className="text-[9px] font-black uppercase tracking-wide text-slate-500">{label}</div><div className="mt-1 font-bold text-slate-950">{String(value || '—')}</div></div>;
}
