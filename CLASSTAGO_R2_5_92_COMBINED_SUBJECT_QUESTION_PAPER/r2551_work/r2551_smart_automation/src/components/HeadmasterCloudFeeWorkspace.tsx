/** EDUNIXO R33.24 — Headmaster canonical Fee oversight + final approval desk. */
import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BadgeIndianRupee,
  CheckCircle2,
  CircleDollarSign,
  FileCheck2,
  FileText,
  IndianRupee,
  Printer,
  ReceiptIndianRupee,
  RefreshCw,
  Search,
  ShieldCheck,
  XCircle
} from 'lucide-react';
import { Language, User as UserType } from '../types';
import { supabase } from '../lib/supabase';
import { printSectionById } from '../utils/printSection';

type Props = { lang: Language; user: UserType; activeFeatureId?: string | null };
type Head = { id: string; name: string; amount: number; frequency: string; applicableClassIds: string[]; dueDate?: string | null; isOptional: boolean; isActive: boolean };
type Profile = { id: string; name: string; grNumber: string; classId: string; className: string; divisionName: string; academicYearId: string; academicYear: string; totalFee: number; concessionAmount: number; fineAmount: number; netFee: number; paidAmount: number; balance: number; advance: number; status: string };
type Tx = { id: string; receiptNo: string; studentId: string; studentName: string; grNumber: string; className: string; divisionName: string; amount: number; paymentDate: string; paymentMode: string; referenceNo?: string | null; notes?: string | null; status: string; cancellationReason?: string | null };
type Snapshot = { academicYear: { id: string; year: string }; classes: Array<{ id: string; className: string; isActive: boolean }>; heads: Head[]; profiles: Profile[]; transactions: Tx[]; adjustments: any[] };
type Approval = { id: string; createdAt?: string | null; summary?: string; request?: any; status: string; decisionAt?: string | null; decisionNote?: string | null; decidedByName?: string | null };
type Approvals = { concessions: Approval[]; cancellations: Approval[] };

async function token() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) throw error || new Error('Secure Headmaster session unavailable.');
  return session.access_token;
}

async function api(url: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    cache: 'no-store',
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {}),
      Authorization: `Bearer ${await token()}`
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Headmaster Fee request failed.');
  return payload;
}

const money = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function HeadmasterCloudFeeWorkspace({ lang, user, activeFeatureId = 'fees-dashboard' }: Props) {
  void lang;
  const [data, setData] = useState<Snapshot | null>(null);
  const [approvals, setApprovals] = useState<Approvals>({ concessions: [], cancellations: [] });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<Tx | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [snapshot, queue] = await Promise.all([
        api('/api/headmaster/fees/snapshot'),
        api('/api/admin/fee-approval-requests')
      ]);
      setData(snapshot as Snapshot);
      setApprovals({ concessions: Array.isArray(queue?.concessions) ? queue.concessions : [], cancellations: Array.isArray(queue?.cancellations) ? queue.cancellations : [] });
    } catch (e: any) {
      setError(e?.message || 'Headmaster Fee workspace could not be loaded.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const profiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.profiles || []).filter(row => !q || `${row.name} ${row.grNumber} ${row.className} ${row.divisionName}`.toLowerCase().includes(q));
  }, [data, search]);

  const transactions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.transactions || []).filter(row => !q || `${row.receiptNo} ${row.studentName} ${row.grNumber} ${row.className} ${row.paymentMode}`.toLowerCase().includes(q));
  }, [data, search]);

  const pendingConcessions = (approvals.concessions || []).filter(row => row.status === 'pending');
  const pendingCancellations = (approvals.cancellations || []).filter(row => row.status === 'pending');
  const activeTransactions = (data?.transactions || []).filter(row => ['active', 'cancellation_pending'].includes(String(row.status || '').toLowerCase()));
  const collected = activeTransactions.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const outstanding = (data?.profiles || []).reduce((sum, row) => sum + Number(row.balance || 0), 0);
  const concessions = (data?.profiles || []).reduce((sum, row) => sum + Number(row.concessionAmount || 0), 0);
  const fines = (data?.profiles || []).reduce((sum, row) => sum + Number(row.fineAmount || 0), 0);
  const gross = (data?.profiles || []).reduce((sum, row) => sum + Number(row.totalFee || 0), 0);

  const classSummary = useMemo(() => {
    const map = new Map<string, { className: string; students: number; net: number; paid: number; balance: number }>();
    for (const row of data?.profiles || []) {
      const key = row.classId || row.className || 'unassigned';
      const current = map.get(key) || { className: row.className || 'Unassigned', students: 0, net: 0, paid: 0, balance: 0 };
      current.students += 1;
      current.net += Number(row.netFee || 0);
      current.paid += Number(row.paidAmount || 0);
      current.balance += Number(row.balance || 0);
      map.set(key, current);
    }
    return Array.from(map.values()).sort((a, b) => a.className.localeCompare(b.className, undefined, { numeric: true }));
  }, [data]);

  const decide = async (kind: 'concession' | 'cancellation', row: Approval, decision: 'approve' | 'reject') => {
    const label = kind === 'concession' ? 'fee concession' : 'receipt cancellation';
    const note = decision === 'reject' ? (window.prompt(`Reason for rejecting this ${label}:`, '') || '').trim() : '';
    if (decision === 'reject' && !note) return;
    const confirmed = window.confirm(`${decision === 'approve' ? 'Approve' : 'Reject'} this ${label}? This Headmaster decision will be recorded in the permanent cloud audit trail.`);
    if (!confirmed) return;
    setBusyId(row.id);
    setError('');
    try {
      const endpoint = kind === 'concession'
        ? `/api/headmaster/fee-concession-requests/${encodeURIComponent(row.id)}/decision`
        : `/api/headmaster/fee-receipt-cancellation-requests/${encodeURIComponent(row.id)}/decision`;
      await api(endpoint, { method: 'POST', body: JSON.stringify({ decision, note }) });
      await load();
    } catch (e: any) {
      setError(e?.message || `${label} decision could not be saved.`);
    } finally {
      setBusyId('');
    }
  };

  const Header = ({ title, sub, icon }: { title: string; sub: string; icon: React.ReactNode }) => (
    <div className="rounded-[1.75rem] bg-slate-950 p-6 text-white shadow-xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-300">Headmaster · Canonical Fee Oversight</div>
          <h2 className="mt-2 text-2xl font-black">{title}</h2>
          <p className="mt-2 max-w-3xl text-xs leading-6 text-slate-300">{sub}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-2xl bg-white/10 p-3">{icon}</div>
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-black disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh
          </button>
        </div>
      </div>
    </div>
  );

  const ErrorBox = () => error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800"><AlertTriangle className="mr-2 inline h-4 w-4" />{error}</div> : null;
  const SearchBar = () => <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={search} onChange={event => setSearch(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm" placeholder="Search Student / GR / Receipt / Class" /></div>;

  const StudentTable = () => (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full min-w-[780px] text-left text-xs">
        <thead className="bg-slate-50 text-[9px] uppercase tracking-wide text-slate-500"><tr><th className="p-3">Student</th><th className="p-3">Class</th><th className="p-3">Gross</th><th className="p-3">Concession</th><th className="p-3">Fine</th><th className="p-3">Paid</th><th className="p-3">Balance</th><th className="p-3">Status</th></tr></thead>
        <tbody>{profiles.map(row => <tr key={row.id} className="border-t border-slate-100"><td className="p-3"><div className="font-black text-slate-900">{row.name}</div><div className="text-[10px] text-slate-400">GR {row.grNumber || '—'}</div></td><td className="p-3">{row.className || '—'}{row.divisionName ? ` · ${row.divisionName}` : ''}</td><td className="p-3 font-bold">{money(row.totalFee)}</td><td className="p-3 text-emerald-700">{money(row.concessionAmount)}</td><td className="p-3 text-amber-700">{money(row.fineAmount)}</td><td className="p-3 font-bold">{money(row.paidAmount)}</td><td className="p-3 font-black text-rose-700">{money(row.balance)}</td><td className="p-3"><span className={`rounded-full px-2 py-1 text-[9px] font-black ${row.balance <= 0 ? 'bg-emerald-100 text-emerald-700' : row.paidAmount ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>{row.status}</span></td></tr>)}</tbody>
      </table>
    </div>
  );

  const ReceiptTable = () => (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full min-w-[760px] text-left text-xs">
        <thead className="bg-slate-50 text-[9px] uppercase tracking-wide text-slate-500"><tr><th className="p-3">Receipt</th><th className="p-3">Date</th><th className="p-3">Student</th><th className="p-3">Amount</th><th className="p-3">Mode</th><th className="p-3">Status</th><th className="p-3">View</th></tr></thead>
        <tbody>{transactions.map(row => <tr key={row.id} className="border-t border-slate-100"><td className="p-3 font-mono font-bold">{row.receiptNo}</td><td className="p-3">{row.paymentDate || '—'}</td><td className="p-3"><div className="font-black">{row.studentName}</div><div className="text-[10px] text-slate-400">GR {row.grNumber || '—'}</div></td><td className="p-3 font-black">{money(row.amount)}</td><td className="p-3">{row.paymentMode || '—'}</td><td className="p-3"><span className={`rounded-full px-2 py-1 text-[9px] font-black ${String(row.status).toLowerCase() === 'cancelled' ? 'bg-slate-100 text-slate-500' : String(row.status).toLowerCase() === 'cancellation_pending' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{row.status}</span></td><td className="p-3"><button type="button" onClick={() => setSelectedReceipt(row)} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[9px] font-black">Receipt</button></td></tr>)}</tbody>
      </table>
    </div>
  );

  const ApprovalCard = ({ kind, row }: { kind: 'concession' | 'cancellation'; row: Approval }) => {
    const request = row.request || {};
    const isBusy = busyId === row.id;
    const title = kind === 'concession' ? `${request.studentName || 'Student'} · GR ${request.grNumber || '—'}` : `${request.receiptNo || 'Receipt'} · ${request.studentName || 'Student'}`;
    const detail = kind === 'concession'
      ? `${request.concessionType || 'Concession'} · ${request.concessionType === 'Percentage' ? `${Number(request.value || 0)}%` : money(Number(request.value || 0))}`
      : `${money(Number(request.amountPaid || 0))} · ${request.paymentMode || 'Payment'} · ${request.reason || 'Cancellation requested'}`;
    return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="font-black text-slate-950">{title}</div><div className="mt-1 text-xs font-bold text-slate-600">{detail}</div>{request.remarks && <div className="mt-2 text-[11px] text-slate-500">{request.remarks}</div>}<div className="mt-2 text-[9px] font-bold uppercase tracking-wide text-slate-400">Requested {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}</div></div><span className="w-fit rounded-full bg-amber-100 px-2.5 py-1 text-[9px] font-black uppercase text-amber-700">Pending Headmaster</span></div>
      <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={isBusy} onClick={() => void decide(kind, row, 'approve')} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-[10px] font-black text-white disabled:opacity-50"><CheckCircle2 className="h-4 w-4" />Approve</button><button type="button" disabled={isBusy} onClick={() => void decide(kind, row, 'reject')} className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-[10px] font-black text-white disabled:opacity-50"><XCircle className="h-4 w-4" />Reject</button></div>
    </div>;
  };

  if (loading && !data) return <div className="grid min-h-[360px] place-items-center rounded-3xl border border-slate-200 bg-white"><div className="text-center"><RefreshCw className="mx-auto h-7 w-7 animate-spin text-cyan-700" /><div className="mt-3 text-sm font-black">Loading permanent Fee ledger…</div></div></div>;
  if (!data) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-bold text-rose-800"><AlertTriangle className="mr-2 inline h-5 w-5" />{error || 'Canonical Fee Runtime is unavailable.'}<div className="mt-2 text-xs font-medium">This Headmaster workspace requires the already-approved R33.23 Clerk Office Runtime SQL. It does not fall back to browser-local fee records.</div></div>;

  if (activeFeatureId === 'fees-concessions') return <div className="space-y-5"><Header title="Fee Concessions & Receipt Cancellation Approvals" sub="Clerk prepares the financial request. Headmaster is the final decision authority. Approval changes are projected into the permanent canonical Fee ledger; rejection never deletes the original request or receipt." icon={<ShieldCheck className="h-5 w-5" />} /><ErrorBox /><div className="grid gap-4 xl:grid-cols-2"><section><div className="mb-3 flex items-center justify-between"><h3 className="font-black">Concession / Scholarship Requests</h3><span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black text-amber-700">{pendingConcessions.length} pending</span></div><div className="space-y-3">{pendingConcessions.length ? pendingConcessions.map(row => <ApprovalCard key={row.id} kind="concession" row={row} />) : <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-xs font-bold text-emerald-800"><CheckCircle2 className="mr-2 inline h-4 w-4" />No pending concession request.</div>}</div></section><section><div className="mb-3 flex items-center justify-between"><h3 className="font-black">Receipt Cancellation Requests</h3><span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black text-amber-700">{pendingCancellations.length} pending</span></div><div className="space-y-3">{pendingCancellations.length ? pendingCancellations.map(row => <ApprovalCard key={row.id} kind="cancellation" row={row} />) : <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-xs font-bold text-emerald-800"><CheckCircle2 className="mr-2 inline h-4 w-4" />No pending receipt cancellation.</div>}</div></section></div><div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-xs leading-6 text-cyan-900">Approval records remain in the school audit trail. Approved concessions create a canonical fee adjustment. Approved receipt cancellations mark the existing receipt cancelled instead of deleting it.</div></div>;

  if (activeFeatureId === 'fees-master-config') return <div className="space-y-5"><Header title="Fee Master Configuration" sub="Headmaster oversight of the current Academic Year Fee Heads. Clerk operates the fee structure; this Headmaster page reads the same permanent cloud configuration and does not maintain a second browser copy." icon={<BadgeIndianRupee className="h-5 w-5" />} /><ErrorBox /><div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full min-w-[680px] text-left text-xs"><thead className="bg-slate-50 text-[9px] uppercase text-slate-500"><tr><th className="p-3">Fee Head</th><th className="p-3">Amount</th><th className="p-3">Frequency</th><th className="p-3">Classes</th><th className="p-3">Due Date</th><th className="p-3">State</th></tr></thead><tbody>{(data.heads || []).map(row => <tr key={row.id} className="border-t"><td className="p-3 font-black">{row.name}{row.isOptional ? ' · Optional' : ''}</td><td className="p-3">{money(row.amount)}</td><td className="p-3">{row.frequency}</td><td className="p-3">{row.applicableClassIds.length ? row.applicableClassIds.map(id => data.classes.find(item => item.id === id)?.className || id).join(', ') : 'All Classes'}</td><td className="p-3">{row.dueDate || '—'}</td><td className="p-3"><span className={`rounded-full px-2 py-1 text-[9px] font-black ${row.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{row.isActive ? 'ACTIVE' : 'INACTIVE'}</span></td></tr>)}</tbody></table></div></div>;

  if (activeFeatureId === 'fees-receipt-ledger') return <div className="space-y-5"><Header title="Permanent Receipt Ledger" sub="Every canonical receipt remains visible, including cancellation-pending and cancelled receipts. Headmaster never deletes a receipt from the ledger." icon={<ReceiptIndianRupee className="h-5 w-5" />} /><ErrorBox /><SearchBar /><ReceiptTable />{selectedReceipt && <div className="space-y-3"><div id="headmaster-fee-receipt-print" className="rounded-2xl border bg-white p-6"><div className="text-center"><div className="text-lg font-black uppercase">EDUNIXO School Fee Receipt</div><div className="text-xs font-bold">Academic Year {data.academicYear.year}</div></div><div className="mt-5 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2"><div><b>Receipt No:</b> {selectedReceipt.receiptNo}</div><div><b>Date:</b> {selectedReceipt.paymentDate || '—'}</div><div><b>Student:</b> {selectedReceipt.studentName}</div><div><b>GR No:</b> {selectedReceipt.grNumber || '—'}</div><div><b>Class:</b> {selectedReceipt.className}{selectedReceipt.divisionName ? ` · ${selectedReceipt.divisionName}` : ''}</div><div><b>Mode:</b> {selectedReceipt.paymentMode || '—'}</div><div><b>Amount:</b> {money(selectedReceipt.amount)}</div><div><b>Status:</b> {selectedReceipt.status}</div>{selectedReceipt.referenceNo && <div className="sm:col-span-2"><b>Reference:</b> {selectedReceipt.referenceNo}</div>}{selectedReceipt.cancellationReason && <div className="sm:col-span-2"><b>Cancellation reason:</b> {selectedReceipt.cancellationReason}</div>}</div><div className="mt-8 flex justify-between text-xs font-bold"><span>Office / Clerk</span><span>Headmaster</span></div></div><button type="button" onClick={() => printSectionById('headmaster-fee-receipt-print', `Fee Receipt ${selectedReceipt.receiptNo}`)} className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white"><Printer className="mr-2 inline h-4 w-4" />Print / PDF Receipt</button></div>}</div>;

  if (activeFeatureId === 'fees-reports-desk') return <div className="space-y-5"><Header title="Fee Reports & Position" sub="Whole-school Academic Year collection and outstanding position from the same permanent ledger used by the Clerk." icon={<FileText className="h-5 w-5" />} /><ErrorBox /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{[['Gross Fee', money(gross)], ['Collected', money(collected)], ['Outstanding', money(outstanding)], ['Concessions', money(concessions)], ['Fines', money(fines)]].map(([label, value]) => <div key={label} className="rounded-2xl border bg-white p-4"><div className="text-[9px] font-black uppercase tracking-wide text-slate-400">{label}</div><div className="mt-1 text-xl font-black text-slate-950">{value}</div></div>)}</div><div id="headmaster-fee-report-print" className="rounded-2xl border bg-white p-5"><div className="text-center"><div className="text-lg font-black">Headmaster Fee Position Report</div><div className="text-xs">Academic Year {data.academicYear.year}</div></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-xs"><thead className="bg-slate-50"><tr><th className="p-3">Class</th><th className="p-3">Students</th><th className="p-3">Net Fee</th><th className="p-3">Paid</th><th className="p-3">Balance</th><th className="p-3">Clearance</th></tr></thead><tbody>{classSummary.map(row => <tr key={row.className} className="border-t"><td className="p-3 font-black">{row.className}</td><td className="p-3">{row.students}</td><td className="p-3">{money(row.net)}</td><td className="p-3">{money(row.paid)}</td><td className="p-3 font-black text-rose-700">{money(row.balance)}</td><td className="p-3">{row.net > 0 ? `${Math.min(100, Math.round((row.paid / row.net) * 100))}%` : '—'}</td></tr>)}</tbody></table></div></div><button type="button" onClick={() => printSectionById('headmaster-fee-report-print', 'Headmaster Fee Position Report')} className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white"><Printer className="mr-2 inline h-4 w-4" />Print / PDF Report</button></div>;

  if (activeFeatureId === 'fees-collection-desk') return <div className="space-y-5"><Header title="Collection Monitoring" sub="Headmaster oversight only. Payments are recorded by the Clerk against the canonical ledger; this page shows the live Student dues and collection position without creating a parallel Headmaster cashbook." icon={<IndianRupee className="h-5 w-5" />} /><ErrorBox /><SearchBar /><StudentTable /><ReceiptTable /></div>;

  return <div className="space-y-5"><Header title="Smart Fees Desk" sub="Whole-school fee position, permanent receipts and Headmaster-only financial approvals. No localStorage fee ledger is used on this Headmaster surface." icon={<CircleDollarSign className="h-5 w-5" />} /><ErrorBox /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><div className="rounded-2xl border bg-white p-4"><IndianRupee className="h-5 w-5 text-emerald-700" /><div className="mt-3 text-2xl font-black">{money(collected)}</div><div className="mt-1 text-[9px] font-black uppercase text-slate-400">Collected · {data.academicYear.year}</div></div><div className="rounded-2xl border bg-white p-4"><BadgeIndianRupee className="h-5 w-5 text-rose-700" /><div className="mt-3 text-2xl font-black">{money(outstanding)}</div><div className="mt-1 text-[9px] font-black uppercase text-slate-400">Outstanding</div></div><div className="rounded-2xl border bg-white p-4"><ShieldCheck className="h-5 w-5 text-amber-700" /><div className="mt-3 text-2xl font-black">{pendingConcessions.length + pendingCancellations.length}</div><div className="mt-1 text-[9px] font-black uppercase text-slate-400">Pending Headmaster Decisions</div></div><div className="rounded-2xl border bg-white p-4"><ReceiptIndianRupee className="h-5 w-5 text-cyan-700" /><div className="mt-3 text-2xl font-black">{data.transactions.length}</div><div className="mt-1 text-[9px] font-black uppercase text-slate-400">Permanent Receipts</div></div></div><div className="grid gap-4 xl:grid-cols-[1.4fr_.6fr]"><div><div className="mb-3 flex items-center justify-between"><h3 className="font-black">Class-wise Fee Position</h3><span className="text-[10px] font-bold text-slate-400">Canonical Student Master + Fee ledger</span></div><div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[600px] text-left text-xs"><thead className="bg-slate-50"><tr><th className="p-3">Class</th><th className="p-3">Students</th><th className="p-3">Net</th><th className="p-3">Paid</th><th className="p-3">Balance</th></tr></thead><tbody>{classSummary.map(row => <tr key={row.className} className="border-t"><td className="p-3 font-black">{row.className}</td><td className="p-3">{row.students}</td><td className="p-3">{money(row.net)}</td><td className="p-3 text-emerald-700">{money(row.paid)}</td><td className="p-3 font-black text-rose-700">{money(row.balance)}</td></tr>)}</tbody></table></div></div><div className="space-y-3"><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><FileCheck2 className="h-5 w-5 text-amber-700" /><div className="mt-2 text-sm font-black">Concession approvals</div><div className="mt-1 text-2xl font-black text-amber-800">{pendingConcessions.length}</div></div><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><ReceiptIndianRupee className="h-5 w-5 text-amber-700" /><div className="mt-2 text-sm font-black">Receipt cancellation approvals</div><div className="mt-1 text-2xl font-black text-amber-800">{pendingCancellations.length}</div></div><div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-xs leading-6 text-cyan-900"><ShieldCheck className="mr-2 inline h-4 w-4" />Clerk operates Fee collection. Headmaster approval actions are recorded separately and never delete the financial audit trail.</div></div></div><div className="text-[10px] font-bold text-slate-400">Signed in as {user.name || 'Headmaster'} · school-scoped live cloud data</div></div>;
}
