import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, FileText, Printer, RotateCcw, ShieldCheck } from 'lucide-react';
import type { Language, User } from '../types';
import { supabase } from '../lib/supabase';
import { openSmartPrint } from '../lib/smartPrint';

interface HeadmasterLeaveApplicationProps {
  lang: Language;
  user: User;
}

interface SchoolIdentity {
  name: string;
  code?: string;
  address?: string;
}

const COMMITTEE_NAME = 'Bharat Vividh Vidhayak Karya Samiti, Nandurbar';
const PRINT_ID = 'headmaster-leave-application-print';

function isoToday(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function formatDate(value: string): string {
  if (!value) return '________________';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}

function inclusiveDays(from: string, to: string): number {
  if (!from || !to) return 0;
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

export default function HeadmasterLeaveApplication({ user }: HeadmasterLeaveApplicationProps) {
  const today = isoToday();
  const [school, setSchool] = useState<SchoolIdentity>({ name: 'National High School, Taloda' });
  const [applicationDate, setApplicationDate] = useState(today);
  const [leaveType, setLeaveType] = useState('Casual Leave');
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [reason, setReason] = useState('');
  const [contactDuringLeave, setContactDuringLeave] = useState(user.phone || '');
  const [place, setPlace] = useState('Taloda');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    let cancelled = false;
    const loadSchool = async () => {
      try {
        const authUserId = user.authUserId || user.id;
        const { data: membership } = await supabase
          .from('user_school_memberships')
          .select('school_id')
          .eq('user_id', authUserId)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();
        if (!membership?.school_id) return;
        const { data: schoolRow } = await supabase
          .from('schools')
          .select('school_name, school_code, address')
          .eq('id', membership.school_id)
          .maybeSingle();
        if (!cancelled && schoolRow?.school_name) {
          setSchool({
            name: schoolRow.school_name,
            code: schoolRow.school_code || undefined,
            address: schoolRow.address || undefined
          });
        }
      } catch {
        // Keep the safe school fallback. This print-only feature must remain usable offline.
      }
    };
    void loadSchool();
    return () => { cancelled = true; };
  }, [user.authUserId, user.id]);

  const days = useMemo(() => inclusiveDays(fromDate, toDate), [fromDate, toDate]);
  const invalidRange = Boolean(fromDate && toDate && days === 0);

  const reset = () => {
    setApplicationDate(today);
    setLeaveType('Casual Leave');
    setFromDate(today);
    setToDate(today);
    setReason('');
    setContactDuringLeave(user.phone || '');
    setPlace('Taloda');
    setRemarks('');
  };

  const print = () => {
    if (invalidRange) return;
    openSmartPrint({
      elementId: PRINT_ID,
      title: `Headmaster Leave Application - ${user.name}`,
      moduleName: 'Headmaster Leave Application',
      paperSize: 'A4',
      orientation: 'portrait'
    });
  };

  return (
    <div className="space-y-5 text-left">
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-emerald-700 shadow-sm"><ShieldCheck className="h-5 w-5" /></span>
          <div>
            <h3 className="text-sm font-black text-emerald-950">Print-only external leave request</h3>
            <p className="mt-1 text-xs leading-5 text-emerald-800">This application is not sent to any Classtago approval queue. Prepare it here, print/save as PDF, and submit it personally to the Chairman of {COMMITTEE_NAME}.</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 no-print">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-50 text-indigo-700"><CalendarDays className="h-5 w-5" /></span>
          <div><h3 className="text-base font-black text-slate-950">My Leave Application</h3><p className="text-xs text-slate-500">Prepare Chairman request · no internal approval workflow</p></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Application date"><input type="date" value={applicationDate} onChange={e => setApplicationDate(e.target.value)} /></Field>
          <Field label="Leave type"><select value={leaveType} onChange={e => setLeaveType(e.target.value)}><option>Casual Leave</option><option>Earned Leave</option><option>Medical Leave</option><option>Special Leave</option><option>Duty Leave</option><option>Other Leave</option></select></Field>
          <Field label="From date"><input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} /></Field>
          <Field label="To date"><input type="date" value={toDate} min={fromDate || undefined} onChange={e => setToDate(e.target.value)} /></Field>
          <div className="sm:col-span-2 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-xs font-bold text-indigo-900">Requested leave: {days || '—'} day{days === 1 ? '' : 's'}{invalidRange ? <span className="ml-2 text-rose-700">To date must not be earlier than From date.</span> : null}</div>
          <Field label="Reason / purpose" span><textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for leave" /></Field>
          <Field label="Contact during leave"><input value={contactDuringLeave} onChange={e => setContactDuringLeave(e.target.value)} placeholder="Mobile number" /></Field>
          <Field label="Place"><input value={place} onChange={e => setPlace(e.target.value)} /></Field>
          <Field label="Additional remarks (optional)" span><textarea rows={2} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Any additional note for the Chairman" /></Field>
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700"><RotateCcw className="h-4 w-4" />Reset</button>
          <button type="button" onClick={print} disabled={invalidRange} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50"><Printer className="h-4 w-4" />Smart Print / PDF</button>
        </div>
      </section>

      <section id={PRINT_ID} className="mx-auto w-full max-w-[210mm] rounded-2xl border border-slate-200 bg-white p-6 text-[13px] leading-7 text-slate-950 shadow-sm sm:p-10 print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <div className="border-b-2 border-slate-900 pb-4 text-center">
          <div className="text-[11px] font-bold uppercase tracking-[.18em] text-slate-500">Leave Application</div>
          <h2 className="mt-1 text-xl font-black">{school.name}</h2>
          {school.code ? <p className="mt-1 text-xs font-semibold text-slate-600">School Code: {school.code}</p> : null}
          {school.address ? <p className="text-xs text-slate-600">{school.address}</p> : null}
        </div>

        <div className="mt-7 flex justify-end"><span><b>Date:</b> {formatDate(applicationDate)}</span></div>
        <div className="mt-5">
          <p>To,</p>
          <p className="font-bold">The Hon’ble Chairman,</p>
          <p className="font-bold">{COMMITTEE_NAME}</p>
        </div>

        <p className="mt-6"><b>Subject:</b> Request for sanction of {leaveType} from {formatDate(fromDate)} to {formatDate(toDate)}.</p>
        <p className="mt-5">Respected Sir,</p>
        <p className="mt-3 text-justify">I, <b>{user.name}</b>, Headmaster of <b>{school.name}</b>, respectfully request you to kindly grant me <b>{leaveType}</b> for <b>{days || '____'} day{days === 1 ? '' : 's'}</b>, from <b>{formatDate(fromDate)}</b> to <b>{formatDate(toDate)}</b>{reason.trim() ? <> due to <b>{reason.trim()}</b></> : <> for the reason stated below</>}.</p>
        {!reason.trim() ? <div className="mt-4 min-h-[56px] rounded border border-slate-300 p-3"><b>Reason:</b></div> : null}
        <p className="mt-4">I shall be grateful for your kind consideration and sanction of the above leave.</p>
        {contactDuringLeave.trim() ? <p className="mt-3"><b>Contact during leave:</b> {contactDuringLeave.trim()}</p> : null}
        {remarks.trim() ? <p className="mt-2"><b>Additional remarks:</b> {remarks.trim()}</p> : null}

        <div className="mt-10 grid grid-cols-2 gap-8">
          <div><p><b>Place:</b> {place || '____________'}</p><p><b>Date:</b> {formatDate(applicationDate)}</p></div>
          <div className="text-right"><div className="mb-10">Signature</div><p className="font-bold">{user.name}</p><p>Headmaster</p><p>{school.name}</p></div>
        </div>

        <div className="mt-10 border-t border-dashed border-slate-400 pt-6">
          <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wider"><FileText className="h-4 w-4" />Chairman’s Order / Sanction</div>
          <div className="min-h-[88px] rounded border border-slate-300 p-4">
            <div className="flex flex-wrap gap-x-8 gap-y-2"><span>☐ Approved</span><span>☐ Not Approved</span><span>☐ Approved with remarks</span></div>
            <p className="mt-4">Remarks: __________________________________________________________________</p>
          </div>
          <div className="mt-10 flex justify-between text-xs"><span>Date: __________________</span><span className="text-right">Chairman’s Signature & Seal<br/><b>{COMMITTEE_NAME}</b></span></div>
        </div>
      </section>
    </div>
  );
}

function Field({ label, children, span = false }: { label: string; children: React.ReactElement<any>; span?: boolean }) {
  return <label className={span ? 'sm:col-span-2' : ''}><span className="mb-1.5 block text-xs font-black text-slate-700">{label}</span>{React.cloneElement(children, { className: `${children.props.className || ''} w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10` })}</label>;
}
