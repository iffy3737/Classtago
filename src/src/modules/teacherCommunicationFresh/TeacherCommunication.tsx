import React, { useEffect, useMemo, useState } from 'react';
import { Bell, BookOpenCheck, CheckCircle2, Copy, Languages, Mail, MessageCircleMore, MessageSquareText, RefreshCw, Send, Share2, Sparkles, UsersRound } from 'lucide-react';
import { FALLBACK_LANGUAGE_CATALOGUE, getLanguageOption, languageDisplayName } from '../../lib/languageCatalog';
import type { TeacherCloudContext } from '../teacherFresh/types';
import {
  loadCommunicationRecipients,
  loadPublishedHomework,
  loadTeacherCommunicationHistory,
  loadTeacherCommunicationScopes,
  loadTeacherSchoolNotices,
  sendTeacherCommunication,
} from './teacherCommunicationService';
import type {
  CommunicationAudience,
  CommunicationChannel,
  CommunicationChannelReadiness,
  CommunicationHistoryItem,
  CommunicationNotice,
  CommunicationPriority,
  CommunicationRecipient,
  HomeworkNotificationItem,
  TeacherCommunicationScope,
  TeacherCommunicationSenderIdentity,
  TeacherCommunicationView,
} from './types';

type Props = { context: TeacherCloudContext | null; loading: boolean; error?: string; view: TeacherCommunicationView; onNavigate?: (moduleId: string, featureId?: string) => void };

const CHANNELS: Array<{ key: CommunicationChannel; label: string; icon: any }> = [
  { key: 'website', label: 'Website / App', icon: Bell },
  { key: 'whatsapp', label: 'WhatsApp Auto', icon: MessageCircleMore },
  { key: 'email', label: 'Email', icon: Mail },
];
const DEFAULT_READINESS: CommunicationChannelReadiness = { website: true, whatsapp: false, sms: false, email: false };

function ScopeSelect({ scopes, value, onChange, loading }: { scopes: TeacherCommunicationScope[]; value: string; onChange: (id: string) => void; loading?: boolean }) {
  return <label className="block text-xs font-bold text-slate-700">Assigned Class / Subject
    <select value={value} disabled={loading} onChange={e => onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm disabled:opacity-60">
      <option value="">{loading ? 'Loading assigned scopes…' : 'Select assigned scope'}</option>
      {scopes.map(scope => <option key={scope.id} value={scope.id}>{scope.label}</option>)}
    </select>
  </label>;
}

function AudiencePicker({ value, onChange, direct = false }: { value: CommunicationAudience; onChange: (value: CommunicationAudience) => void; direct?: boolean }) {
  return <label className="block text-xs font-bold text-slate-700">Recipient Type
    <select value={value} onChange={e => onChange(e.target.value as CommunicationAudience)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
      <option value="students">{direct ? 'Student' : 'Students'}</option>
      <option value="parents">{direct ? 'Parent / Guardian' : 'Parents / Guardians'}</option>
      <option value="students_and_parents">{direct ? 'Student + Parent / Guardian' : 'Students + Parents / Guardians'}</option>
    </select>
  </label>;
}

function LanguagePicker({ code, customName, onCode, onCustom }: { code: string; customName: string; onCode: (value: string) => void; onCustom: (value: string) => void }) {
  return <div className="grid gap-3 sm:grid-cols-2">
    <label className="block text-xs font-bold text-slate-700">Message Language
      <select value={code} onChange={e => onCode(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
        {FALLBACK_LANGUAGE_CATALOGUE.map(option => <option key={String(option.code)} value={String(option.code)}>{languageDisplayName(option)}</option>)}
        <option value="other">Other / Custom</option>
      </select>
    </label>
    {code === 'other' ? <label className="block text-xs font-bold text-slate-700">Custom Language Name<input value={customName} onChange={e => onCustom(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="Language name" /></label> : <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600"><Languages className="mr-2 inline h-4 w-4"/>English + all 22 Scheduled Indian languages are available.</div>}
  </div>;
}

function ChannelPicker({ value, onChange, readiness }: { value: CommunicationChannel[]; onChange: (channels: CommunicationChannel[]) => void; readiness: CommunicationChannelReadiness }) {
  return <div><p className="mb-2 text-xs font-bold text-slate-700">Automatic Delivery Channels</p><div className="grid gap-2 sm:grid-cols-4">{CHANNELS.map(({ key, label, icon: Icon }) => {
    const active = value.includes(key); const ready = readiness[key];
    return <button key={key} type="button" disabled={!ready} onClick={() => onChange(active ? value.filter(x => x !== key) : [...value, key])} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-black ${active ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-700'} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:opacity-70`}>
      <Icon className="h-4 w-4" /> {label}{!ready && key !== 'website' ? ' · Not configured' : ''}
    </button>;
  })}</div></div>;
}


const normalizeWhatsAppNumber = (value?: string) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  return digits;
};

function audienceMobiles(recipients: CommunicationRecipient[], audience: CommunicationAudience) {
  const numbers: string[] = [];
  for (const row of recipients) {
    if (audience !== 'parents') {
      const mobile = normalizeWhatsAppNumber(row.studentMobile);
      if (mobile) numbers.push(mobile);
    }
    if (audience !== 'students') {
      const mobile = normalizeWhatsAppNumber(row.parentMobile);
      if (mobile) numbers.push(mobile);
    }
  }
  return [...new Set(numbers)];
}

async function copyText(text: string) {
  if (!text) return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  try {
    const input = document.createElement('textarea');
    input.value = text;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.focus();
    input.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(input);
    return ok;
  } catch {
    return false;
  }
}

function buildWhatsAppMessage(input: {
  schoolName: string;
  teacherName: string;
  scope?: TeacherCommunicationScope | null;
  title: string;
  body: string;
}) {
  const lines = [
    `*${input.schoolName || 'School'}*`,
    input.title.trim() ? `*${input.title.trim()}*` : '',
    input.scope ? `${input.scope.className}${input.scope.division && input.scope.division !== 'All' ? ` · ${input.scope.division}` : ''}${input.scope.subjectName ? ` · ${input.scope.subjectName}` : ''}` : '',
    '',
    input.body.trim(),
    '',
    `— ${input.teacherName || 'Teacher'}`,
    'Sent via Classtago',
  ];
  return lines.filter((line, index) => line !== '' || (index > 0 && index < lines.length - 1)).join('\n').replace(/\n{3,}/g, '\n\n');
}

function FreeWhatsAppPanel({
  identity, recipients, audience, title, body, scope, schoolName, teacherName, compact = false,
}: {
  identity?: TeacherCommunicationSenderIdentity;
  recipients: CommunicationRecipient[];
  audience: CommunicationAudience;
  title: string;
  body: string;
  scope?: TeacherCommunicationScope | null;
  schoolName: string;
  teacherName: string;
  compact?: boolean;
}) {
  const [status, setStatus] = useState('');
  const mobileReady = Boolean(identity?.mobileLinked);
  const numbers = useMemo(() => audienceMobiles(recipients, audience), [recipients, audience]);
  const message = useMemo(() => buildWhatsAppMessage({ schoolName, teacherName, scope, title, body }), [schoolName, teacherName, scope, title, body]);
  const canShare = mobileReady && Boolean(body.trim());

  const openWhatsApp = () => {
    if (!canShare) {
      setStatus(!mobileReady ? 'Add your mobile number in Complete Profile first.' : 'Write/select a message first.');
      return;
    }
    const direct = recipients.length === 1 && numbers.length === 1 ? numbers[0] : '';
    const url = direct
      ? `https://wa.me/${direct}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    const opened = window.open(url, '_blank');
    if (opened) {
      try { opened.opener = null; } catch {}
    } else {
      window.location.assign(url);
    }
    setStatus(direct
      ? 'WhatsApp opened for this recipient. Review and tap Send in WhatsApp.'
      : 'WhatsApp opened. Select your class Broadcast List / contacts, then tap Send.');
  };

  const copyMessage = async () => setStatus(await copyText(message) ? 'Message copied.' : 'Copy was blocked by this browser.');
  const copyNumbers = async () => setStatus(numbers.length && await copyText(numbers.join('\n')) ? `${numbers.length} unique mobile number(s) copied.` : 'No stored mobile numbers are available for this audience.');

  return <div className={`rounded-xl border border-emerald-200 bg-emerald-50 ${compact ? 'p-3' : 'p-4'}`}>
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-black text-emerald-950">My WhatsApp · Free</p>
          <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${mobileReady ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{mobileReady ? 'Ready' : 'Add mobile'}</span>
        </div>
        <p className="mt-1 text-[11px] leading-5 text-emerald-900/80">
          Opens WhatsApp installed on this device with the message pre-filled. For a class, select your WhatsApp Broadcast List / contacts and tap Send. No API/provider charge.
        </p>
        <p className="mt-1 text-[10px] font-semibold text-emerald-800">
          Teacher profile mobile: {identity?.mobile || 'not added'} · stored audience mobiles: {numbers.length}
        </p>
      </div>
      <button type="button" onClick={openWhatsApp} disabled={!canShare} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40">
        <MessageCircleMore className="h-4 w-4" /> Open My WhatsApp
      </button>
    </div>
    {!compact && <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" onClick={() => void copyMessage()} disabled={!body.trim()} className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-[10px] font-black text-emerald-800 disabled:opacity-40"><Copy className="h-3.5 w-3.5"/>Copy Message</button>
      <button type="button" onClick={() => void copyNumbers()} disabled={!numbers.length} className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-[10px] font-black text-emerald-800 disabled:opacity-40"><Share2 className="h-3.5 w-3.5"/>Copy Recipient Numbers</button>
    </div>}
    {status && <p className="mt-2 text-[10px] font-bold text-emerald-900">{status}</p>}
    <p className="mt-2 text-[9px] font-semibold leading-4 text-emerald-800/80">Free mode does not mark WhatsApp as Delivered inside Classtago because the final Send happens in WhatsApp. True automatic bulk WhatsApp remains an optional school-provider mode.</p>
  </div>;
}


function SenderIdentityCard({ identity, readiness }: { identity?: TeacherCommunicationSenderIdentity; readiness: CommunicationChannelReadiness }) {
  const mobile = identity?.mobile || 'Not added in Teacher profile';
  const email = identity?.email || 'Not added in Teacher/login profile';
  return <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
    <div className="flex items-start gap-2">
      <UsersRound className="mt-0.5 h-4 w-4 shrink-0 text-cyan-700" />
      <div className="min-w-0">
        <p className="text-xs font-black text-slate-800">Teacher sender identity · Auto-linked from profile</p>
        <p className="mt-1 break-all text-[11px] leading-5 text-slate-600"><b>Mobile:</b> {mobile} · enables My WhatsApp Free and is also used as Teacher contact identity when a school WhatsApp/SMS provider is enabled.</p>
        <p className="break-all text-[11px] leading-5 text-slate-600"><b>Email:</b> {email} · used as Teacher reply/contact identity when the school email provider is enabled.</p>
        <p className="mt-1 text-[10px] font-semibold leading-4 text-slate-500">No API key or provider password is stored in the Teacher browser. Provider connection is one-time at school/server level.</p>
        <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] font-black uppercase">
          <span className={`rounded-full px-2 py-1 ${identity?.mobileLinked ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>Mobile {identity?.mobileLinked ? 'linked' : 'missing'}</span><span className={`rounded-full px-2 py-1 ${identity?.mobileLinked ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>My WhatsApp Free {identity?.mobileLinked ? 'ready' : 'needs mobile'}</span>
          <span className={`rounded-full px-2 py-1 ${identity?.emailLinked ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>Email {identity?.emailLinked ? 'linked' : 'missing'}</span>
          <span className={`rounded-full px-2 py-1 ${readiness.whatsapp ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>WhatsApp provider {readiness.whatsapp ? 'ready' : 'not connected'}</span>
          <span className={`rounded-full px-2 py-1 ${readiness.sms ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>SMS provider {readiness.sms ? 'ready' : 'not connected'}</span>
          <span className={`rounded-full px-2 py-1 ${readiness.email ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>Email provider {readiness.email ? 'ready' : 'not connected'}</span>
        </div>
      </div>
    </div>
  </div>;
}

function History({ rows, backendReady }: { rows: CommunicationHistoryItem[]; backendReady: boolean }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4"><h3 className="font-black text-slate-950">Communication History</h3><p className="text-xs text-slate-500">Cloud audit of messages created from this Teacher account.</p></div>
    {!backendReady ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold text-amber-800">Communication cloud core is not installed yet. Run the R24 Communication + Homework setup SQL once.</div> : !rows.length ? <div className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">No communication has been sent yet.</div> : <div className="space-y-2">{rows.map(row => <article key={row.id} className="rounded-xl border border-slate-200 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-black text-slate-900">{row.title}</p><p className="mt-1 text-[11px] text-slate-500">{row.className}{row.division ? ` · ${row.division}` : ''}{row.subjectName ? ` · ${row.subjectName}` : ''} · {row.recipientCount} audience recipient(s)</p></div><span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black uppercase text-slate-600">{row.messageType}</span></div>
      <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold"><span className="rounded-full bg-cyan-50 px-2 py-1 text-cyan-700">{row.languageName || 'School language'} · {row.audience || 'audience'}</span><span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">Sent/Delivered {row.delivered}</span><span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">Read {row.read}</span><span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">Queued {row.queued}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">Skipped {row.skipped}</span><span className="rounded-full bg-rose-50 px-2 py-1 text-rose-700">Failed {row.failed}</span></div>
    </article>)}</div>}
  </section>;
}

export default function TeacherCommunication({ context, loading, error, view, onNavigate }: Props) {
  const [scopes, setScopes] = useState<TeacherCommunicationScope[]>([]);
  const [scopeLoading, setScopeLoading] = useState(false);
  const [scopeId, setScopeId] = useState('');
  const scope = useMemo(() => scopes.find(row => row.id === scopeId) || null, [scopes, scopeId]);
  const [readiness, setReadiness] = useState<CommunicationChannelReadiness>(DEFAULT_READINESS);
  const [senderIdentity, setSenderIdentity] = useState<TeacherCommunicationSenderIdentity | undefined>(undefined);
  const [recipients, setRecipients] = useState<CommunicationRecipient[]>([]);
  const [recipientId, setRecipientId] = useState('');
  const [channels, setChannels] = useState<CommunicationChannel[]>(['website']);
  const [audience, setAudience] = useState<CommunicationAudience>('students_and_parents');
  const [languageCode, setLanguageCode] = useState('en');
  const [customLanguage, setCustomLanguage] = useState('');
  const [priority, setPriority] = useState<CommunicationPriority>('normal');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [sendError, setSendError] = useState('');
  const [notices, setNotices] = useState<CommunicationNotice[]>([]);
  const [noticesReady, setNoticesReady] = useState(true);
  const [homework, setHomework] = useState<HomeworkNotificationItem[]>([]);
  const [homeworkReady, setHomeworkReady] = useState(true);
  const [homeworkLoading, setHomeworkLoading] = useState(false);
  const [history, setHistory] = useState<CommunicationHistoryItem[]>([]);
  const [historyReady, setHistoryReady] = useState(true);

  const languageName = languageCode === 'other' ? customLanguage.trim() : getLanguageOption(languageCode).englishName;
  const availableExternal = Object.entries(readiness).filter(([key, ready]) => key !== 'website' && ready).map(([key]) => key);
  const parentReady = recipients.filter(r => r.parentMobile || r.parentEmail).length;
  const studentPortalReady = recipients.filter(r => r.studentUserId).length;

  const refreshHistory = async () => { if (!context) return; try { const result = await loadTeacherCommunicationHistory(context); setHistory(result.rows); setHistoryReady(result.backendReady); } catch { setHistory([]); setHistoryReady(false); } };

  useEffect(() => {
    if (!context) return;
    let cancelled = false; setScopeLoading(true); setSendError('');
    void loadTeacherCommunicationScopes(context).then(result => {
      if (cancelled) return; setScopes(result.scopes); setReadiness(result.channelReadiness || DEFAULT_READINESS); setSenderIdentity(result.senderIdentity);
      setScopeId(current => result.scopes.some(s => s.id === current) ? current : (result.scopes.length === 1 ? result.scopes[0].id : ''));
    }).catch((e:any) => { if (!cancelled) { setScopes([]); setSendError(e?.message || 'Assigned Communication scopes could not be loaded.'); } }).finally(() => { if (!cancelled) setScopeLoading(false); });
    return () => { cancelled = true; };
  }, [context?.userId, context?.schoolId, context?.academicYearId]);

  useEffect(() => {
    if (!context) return;
    if (view === 'school_notices') void loadTeacherSchoolNotices(context).then(r => { setNotices(r.notices); setNoticesReady(r.sourceAvailable); }).catch(() => { setNotices([]); setNoticesReady(false); });
    if (view !== 'school_notices') void refreshHistory();
  }, [context, view]);

  useEffect(() => {
    setRecipients([]); setRecipientId(''); setMessage(''); setSendError(''); setHomework([]);
    if (!scope) return;
    let cancelled = false;
    void loadCommunicationRecipients(scope).then(rows => { if (!cancelled) setRecipients(rows); }).catch((e:any) => { if (!cancelled) setSendError(e?.message || 'Student/Parent recipients could not be loaded.'); });
    if (view === 'homework_notifications') {
      setHomeworkLoading(true);
      void loadPublishedHomework(context!, scope).then(r => { if (!cancelled) { setHomework(r.items); setHomeworkReady(r.backendReady); } }).catch((e:any) => { if (!cancelled) { setHomework([]); setHomeworkReady(false); setSendError(e?.message || 'Published Homework could not be loaded.'); } }).finally(() => { if (!cancelled) setHomeworkLoading(false); });
    }
    return () => { cancelled = true; };
  }, [scopeId, view]);

  if (loading) return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm font-semibold text-slate-500">Loading Communication scope…</div>;
  if (!context) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-semibold text-rose-800">{error || 'Teacher cloud scope is unavailable.'}</div>;

  const send = async (messageType: 'announcement'|'direct', chosenRecipients: CommunicationRecipient[]) => {
    if (!scope) { setSendError('Select an assigned Class / Subject.'); return; }
    if (languageCode === 'other' && !customLanguage.trim()) { setSendError('Enter the custom message language name.'); return; }
    setBusy(true); setSendError(''); setMessage('');
    try {
      const result = await sendTeacherCommunication({ context, scope, recipients: chosenRecipients, title, body, messageType, channels, audience, languageCode, languageName, priority });
      setMessage(`Communication saved for ${result.studentCount} student record(s). Website/App: ${result.websiteCreated}; external queued: ${result.externalQueued}; skipped: ${result.externalSkipped}.${result.dispatchWarning ? ` ${result.dispatchWarning}` : ''}`);
      setTitle(''); setBody(''); await refreshHistory();
    } catch (e: any) { setSendError(e?.message || 'Communication could not be sent.'); } finally { setBusy(false); }
  };

  const notifyHomework = async (item: HomeworkNotificationItem) => {
    if (!scope) { setSendError('Select the Homework Class / Subject scope first.'); return; }
    if (languageCode === 'other' && !customLanguage.trim()) { setSendError('Enter the custom message language name.'); return; }
    setBusy(true); setSendError(''); setMessage('');
    try {
      const attachmentLines=(item.attachments||[]).filter(a=>a.url).map(a=>`${a.fileName}: ${a.url}`).join('\n');
      const homeworkBody = `${item.subjectName} homework${item.dueDate ? ` · Due: ${item.dueDate}` : ''}\n\n${item.content}${attachmentLines?`\n\nAttachments\n${attachmentLines}`:''}`;
      const result = await sendTeacherCommunication({ context, scope, recipients, title: item.title || 'Homework Notification', body: homeworkBody, messageType: 'homework', channels, audience, languageCode, languageName, priority, sourceRecordId: item.id });
      setMessage(`Homework reminder saved for ${result.studentCount} student record(s). Website/App: ${result.websiteCreated}; external queued: ${result.externalQueued}; skipped: ${result.externalSkipped}.${result.dispatchWarning ? ` ${result.dispatchWarning}` : ''}`);
      await refreshHistory();
    } catch (e: any) { setSendError(e?.message || 'Homework notification failed.'); } finally { setBusy(false); }
  };

  const header = view === 'school_notices' ? ['School Notices', 'Read official school notices intended for Teachers.']
    : view === 'announcements' ? ['Class / Subject Announcements', 'Class Teacher and Subject Teacher scopes are resolved from Headmaster-approved cloud assignments.']
    : view === 'homework_notifications' ? ['Homework Notifications', 'Choose a Class/Subject, reuse published Homework and notify the correct Students/Parents.']
    : ['Parent / Student Communication', 'Direct communication is restricted to your current Headmaster-assigned teaching scope.'];

  const commonControls = <>
    <div className="grid gap-4 lg:grid-cols-2"><AudiencePicker value={audience} onChange={setAudience}/><label className="block text-xs font-bold text-slate-700">Priority<select value={priority} onChange={e=>setPriority(e.target.value as CommunicationPriority)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option><option value="low">Low</option></select></label></div>
    <LanguagePicker code={languageCode} customName={customLanguage} onCode={setLanguageCode} onCustom={setCustomLanguage}/>
    <SenderIdentityCard identity={senderIdentity} readiness={readiness}/>
    <ChannelPicker value={channels} onChange={setChannels} readiness={readiness}/>
    <FreeWhatsAppPanel identity={senderIdentity} recipients={recipients} audience={audience} title={title} body={body} scope={scope} schoolName={context.schoolName} teacherName={context.teacherName}/>
    <div className="rounded-xl bg-slate-50 p-3 text-[11px] leading-5 text-slate-600"><b>Channel readiness:</b> Website/App ready · My WhatsApp Free {senderIdentity?.mobileLinked ? 'ready' : 'needs Teacher mobile'} · {availableExternal.length ? `${availableExternal.join(', ')} Auto configured` : 'WhatsApp Auto / Email provider not configured'}.</div>
  </>;

  return <div className="space-y-5">
    <header className="rounded-2xl bg-slate-950 p-5 text-white shadow-sm"><div className="flex items-start gap-3"><div className="rounded-xl bg-white/10 p-2"><MessageSquareText className="h-5 w-5" /></div><div><h1 className="text-xl font-black">{header[0]}</h1><p className="mt-1 text-xs text-slate-300">{header[1]}</p></div></div></header>

    {view === 'school_notices' && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">{!noticesReady ? <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">No readable School Notice cloud source is configured yet.</div> : !notices.length ? <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">No current Teacher notices.</div> : <div className="space-y-3">{notices.map(n => <article key={n.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-center gap-2"><b className="text-sm text-slate-900">{n.title}</b>{n.isPinned && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-black uppercase text-amber-700">Pinned</span>}</div>{n.body && <p className="mt-2 text-xs leading-5 text-slate-600">{n.body}</p>}<div className="mt-2 flex gap-3 text-[10px] font-bold text-slate-400"><span>{n.category || 'School Notice'}</span>{n.publishedAt && <span>{n.publishedAt.slice(0,10)}</span>}{n.attachmentUrl && <a className="text-cyan-700 underline" href={n.attachmentUrl} target="_blank" rel="noreferrer">Attachment</a>}</div></article>)}</div>}</section>}

    {view === 'announcements' && <><section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><ScopeSelect scopes={scopes} value={scopeId} onChange={setScopeId} loading={scopeLoading}/>{!scopeLoading && !scopes.length && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold text-amber-800">No active Class Teacher or Subject Teacher assignment is available for this account.</div>}{scope && <div className="grid gap-2 sm:grid-cols-3"><div className="rounded-xl bg-cyan-50 p-3 text-xs"><b>{recipients.length}</b><br/>Students in scope</div><div className="rounded-xl bg-emerald-50 p-3 text-xs"><b>{studentPortalReady}</b><br/>Student portal-ready</div><div className="rounded-xl bg-violet-50 p-3 text-xs"><b>{parentReady}</b><br/>Parent contact-ready</div></div>}<label className="block text-xs font-bold text-slate-700">Announcement Title<input value={title} onChange={e=>setTitle(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="e.g. Project submission / class meeting"/></label><label className="block text-xs font-bold text-slate-700">Message<textarea dir={['ur','ks','sd'].includes(languageCode)?'rtl':'ltr'} value={body} onChange={e=>setBody(e.target.value)} rows={5} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="Write the class/subject announcement…"/></label>{commonControls}{sendError&&<div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">{sendError}</div>}{message&&<div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">{message}</div>}<button type="button" disabled={busy||!scope||!recipients.length||!title.trim()||!body.trim()} onClick={()=>void send('announcement',recipients)} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white disabled:opacity-40"><Send className="h-4 w-4"/>{busy?'Sending…':'Send Announcement'}</button></section><History rows={history} backendReady={historyReady}/></>}

    {view === 'homework_notifications' && <><section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><ScopeSelect scopes={scopes} value={scopeId} onChange={setScopeId} loading={scopeLoading}/>{scope && <div className="grid gap-2 sm:grid-cols-3"><div className="rounded-xl bg-cyan-50 p-3 text-xs"><b>{homework.length}</b><br/>Published Homework</div><div className="rounded-xl bg-emerald-50 p-3 text-xs"><b>{recipients.length}</b><br/>Students in scope</div><div className="rounded-xl bg-violet-50 p-3 text-xs"><b>{parentReady}</b><br/>Parent contacts ready</div></div>}<AudiencePicker value={audience} onChange={setAudience}/><LanguagePicker code={languageCode} customName={customLanguage} onCode={setLanguageCode} onCustom={setCustomLanguage}/><SenderIdentityCard identity={senderIdentity} readiness={readiness}/><ChannelPicker value={channels} onChange={setChannels} readiness={readiness}/><div className="rounded-xl bg-slate-50 p-3 text-[11px] leading-5 text-slate-600"><b>Free WhatsApp:</b> each published Homework card also has a My WhatsApp Free action. Automatic channels above are only for Classtago/provider dispatch.</div>{!scope ? <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">Select an assigned Class / Subject to load its published Homework.</div> : homeworkLoading ? <div className="rounded-xl bg-slate-50 p-5 text-sm font-semibold text-slate-500"><RefreshCw className="mr-2 inline h-4 w-4 animate-spin"/>Loading published Homework…</div> : !homeworkReady ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold text-amber-800">Published Homework bridge is not ready. Run the R24 Communication + Homework setup SQL once.</div> : !homework.length ? <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500"><b>No published Homework found for this scope.</b><br/><span className="mt-1 inline-block text-xs">Generate and publish Homework from the AI Homework Builder. Draft Homework is intentionally not sent.</span>{onNavigate&&<div className="mt-3"><button type="button" onClick={()=>onNavigate('tr-ai-homework')} className="inline-flex items-center gap-2 rounded-xl bg-cyan-700 px-3 py-2 text-xs font-black text-white"><Sparkles className="h-4 w-4"/>Create AI Homework</button></div>}</div> : <div className="space-y-3">{homework.map(item=><article key={item.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex items-center gap-2"><BookOpenCheck className="h-4 w-4 text-cyan-700"/><b className="text-sm text-slate-900">{item.title}</b></div><p className="mt-1 text-[11px] font-semibold text-slate-500">{item.className}{item.division?` · ${item.division}`:''} · {item.subjectName}{item.dueDate?` · Due ${item.dueDate}`:''}</p><p className="mt-2 line-clamp-4 whitespace-pre-line text-xs leading-5 text-slate-600">{item.content}</p>{Boolean(item.attachments?.length)&&<div className="mt-2 flex flex-wrap gap-2">{item.attachments!.map(a=>a.url?<a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="rounded-lg border border-cyan-200 bg-cyan-50 px-2 py-1 text-[10px] font-bold text-cyan-800">{a.fileName}</a>:<span key={a.id} className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">{a.fileName}</span>)}</div>}</div><div className="flex shrink-0 flex-col gap-2"><button type="button" disabled={busy||!recipients.length} onClick={()=>void notifyHomework(item)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white disabled:opacity-40"><Send className="h-4 w-4"/>Notify via Auto Channels</button><FreeWhatsAppPanel compact identity={senderIdentity} recipients={recipients} audience={audience} title={item.title || 'Homework Notification'} body={`${item.subjectName} homework${item.dueDate ? ` · Due: ${item.dueDate}` : ''}\n\n${item.content}${(item.attachments||[]).some(a=>a.url)?`\n\nAttachments\n${(item.attachments||[]).filter(a=>a.url).map(a=>`${a.fileName}: ${a.url}`).join('\n')}`:''}`} scope={scope} schoolName={context.schoolName} teacherName={context.teacherName}/></div></div></article>)}</div>}{sendError&&<div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">{sendError}</div>}{message&&<div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">{message}</div>}</section><History rows={history} backendReady={historyReady}/></>}

    {view === 'parent_student' && <><section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="grid gap-4 lg:grid-cols-2"><ScopeSelect scopes={scopes} value={scopeId} onChange={setScopeId} loading={scopeLoading}/><label className="block text-xs font-bold text-slate-700">Student<select value={recipientId} disabled={!scope} onChange={e=>setRecipientId(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm disabled:opacity-60"><option value="">Select assigned student</option>{recipients.map(r=><option key={r.studentId} value={r.studentId}>{r.studentName}{r.grNumber?` · GR ${r.grNumber}`:''}</option>)}</select></label></div>{recipientId&&(()=>{const r=recipients.find(x=>x.studentId===recipientId);return r?<div className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600"><UsersRound className="mr-2 inline h-4 w-4"/><b>{r.studentName}</b> · Student portal {r.studentUserId?'linked':'not linked'}<br/>Parent/Guardian: {r.parentName||'Name not stored'} · Mobile {r.parentMobile||'not stored'} · Email {r.parentEmail||'not stored'}</div>:null;})()}<AudiencePicker value={audience} onChange={setAudience} direct/><label className="block text-xs font-bold text-slate-700">Subject<input value={title} onChange={e=>setTitle(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="Message subject"/></label><label className="block text-xs font-bold text-slate-700">Message<textarea dir={['ur','ks','sd'].includes(languageCode)?'rtl':'ltr'} value={body} onChange={e=>setBody(e.target.value)} rows={5} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/></label><LanguagePicker code={languageCode} customName={customLanguage} onCode={setLanguageCode} onCustom={setCustomLanguage}/><SenderIdentityCard identity={senderIdentity} readiness={readiness}/><ChannelPicker value={channels} onChange={setChannels} readiness={readiness}/><FreeWhatsAppPanel identity={senderIdentity} recipients={recipientId ? recipients.filter(r=>r.studentId===recipientId) : []} audience={audience} title={title} body={body} scope={scope} schoolName={context.schoolName} teacherName={context.teacherName}/>{sendError&&<div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">{sendError}</div>}{message&&<div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">{message}</div>}<button type="button" disabled={busy||!recipientId||!title.trim()||!body.trim()} onClick={()=>{const r=recipients.find(x=>x.studentId===recipientId);if(r)void send('direct',[r]);}} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white disabled:opacity-40"><Send className="h-4 w-4"/>{busy?'Sending…':'Send Message'}</button></section><History rows={history} backendReady={historyReady}/></>}

    {view !== 'school_notices' && <div className="flex items-start gap-2 text-[11px] font-semibold leading-5 text-slate-500"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"/><span>Communication scope and recipients are revalidated on the server before sending. Teacher mobile/email are auto-linked from profile. Website/App is native Classtago; My WhatsApp Free opens the Teacher's device WhatsApp without a provider; WhatsApp Auto/SMS/Email become selectable only when the school provider is configured server-side.</span></div>}
  </div>;
}
