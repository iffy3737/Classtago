import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BellRing,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  History,
  Loader2,
  MailCheck,
  MessageSquareText,
  RefreshCw,
  Send,
  ShieldCheck,
  Smartphone,
  Users,
  XCircle,
} from 'lucide-react';
import type { User as UserType } from '../types';
import { supabase } from '../lib/supabase';
import { requestActionConfirm } from '../lib/actionConfirm';

type Props = { user: UserType; activeFeatureId?: string | null };

type DraftRow = {
  id: string;
  createdAt?: string | null;
  draft: { title?: string; content?: string; category?: string; targetRoles?: string[]; preparedBy?: string };
  status: string;
  decisionAt?: string | null;
  decisionNote?: string | null;
};

type MessageRow = {
  id: string;
  title: string;
  body: string;
  createdByName?: string;
  createdAt?: string;
  scheduledFor?: string | null;
  status: string;
  scheduleState?: string;
  audienceRoles: string[];
  channels: string[];
  recipientCount: number;
  websiteSent: number;
  websiteRead: number;
  queued: number;
  delivered: number;
  failed: number;
  skipped: number;
  priority?: string;
};

type TemplateRow = {
  id: string;
  name: string;
  channel: string;
  category: string;
  subject?: string;
  body: string;
  targetRoles: string[];
  isActive: boolean;
};

type Snapshot = {
  academicYear?: { id?: string; year?: string } | null;
  messages: MessageRow[];
  templates: TemplateRow[];
  drafts: DraftRow[];
  channelReadiness: Record<string, boolean>;
  audienceCounts: Record<string, number>;
};

const featureTitle: Record<string, string> = {
  'school-notices': 'School Notices & Clerk Approval',
  'audience-messages': 'Audience-targeted Messages',
  'scheduled-communications': 'Scheduled Communications',
  'communication-templates': 'Communication Templates',
  'delivery-history': 'Delivery & Read History',
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
  if (!response.ok) throw new Error(payload.error || 'Communication request failed.');
  return payload;
}

const toLocalInput = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const badge = (value: string) => {
  const key = String(value || '').toLowerCase();
  if (['completed', 'delivered', 'approve', 'valid'].includes(key)) return 'bg-emerald-100 text-emerald-700';
  if (['failed', 'reject', 'cancelled'].includes(key)) return 'bg-rose-100 text-rose-700';
  if (['scheduled', 'pending', 'queued', 'processing'].includes(key)) return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-600';
};

const roleOptions = [
  ['student', 'Students'],
  ['parent', 'Parents / Guardians'],
  ['teacher', 'Teachers'],
  ['clerk', 'Clerk / Office'],
] as const;

const channelOptions = [
  ['website', 'Website / In-App'],
  ['whatsapp', 'WhatsApp'],
  ['sms', 'SMS'],
  ['email', 'Email'],
] as const;

export default function HeadmasterCommunicationCloudWorkspace({ user, activeFeatureId = 'school-notices' }: Props) {
  const feature = activeFeatureId || 'school-notices';
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [roles, setRoles] = useState<string[]>(['student', 'parent', 'teacher']);
  const [channels, setChannels] = useState<string[]>(['website']);
  const [priority, setPriority] = useState('normal');
  const [scheduledFor, setScheduledFor] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  const [templateRoles, setTemplateRoles] = useState<string[]>(['student', 'parent']);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = await api('/api/headmaster/communication/snapshot');
      setData(payload);
    } catch (e: any) {
      setData(null);
      setError(e?.message || 'Communication Hub could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const pendingDrafts = useMemo(() => (data?.drafts || []).filter(row => row.status === 'pending'), [data]);
  const scheduled = useMemo(() => (data?.messages || []).filter(row => row.scheduleState === 'pending'), [data]);
  const failed = useMemo(() => (data?.messages || []).reduce((sum, row) => sum + Number(row.failed || 0), 0), [data]);
  const websiteSent = useMemo(() => (data?.messages || []).reduce((sum, row) => sum + Number(row.websiteSent || 0), 0), [data]);
  const websiteRead = useMemo(() => (data?.messages || []).reduce((sum, row) => sum + Number(row.websiteRead || 0), 0), [data]);

  const toggle = (value: string, list: string[], setter: (value: string[]) => void) => {
    setter(list.includes(value) ? list.filter(item => item !== value) : [...list, value]);
  };

  const useTemplate = (id: string) => {
    setTemplateId(id);
    const row = data?.templates.find(item => item.id === id);
    if (!row) return;
    setTitle(row.subject || row.name);
    setBody(row.body);
    if (row.targetRoles?.length) setRoles(row.targetRoles.filter(role => roleOptions.some(option => option[0] === role)));
    const mapped = String(row.channel || '').toLowerCase();
    if (['sms', 'whatsapp', 'email'].includes(mapped)) setChannels([mapped]);
    if (mapped === 'notice' || mapped === 'in-app') setChannels(['website']);
  };

  const sendMessage = async () => {
    if (!title.trim() || !body.trim() || !roles.length || !channels.length) {
      setError('Title, message, audience and at least one delivery channel are required.');
      return;
    }
    const scheduleIso = scheduledFor ? new Date(scheduledFor).toISOString() : null;
    const confirmed = await requestActionConfirm({
      title: scheduleIso ? 'Schedule this school communication?' : 'Send this school communication?',
      message: `${title.trim()} will target ${roles.join(', ')} through ${channels.join(', ')}${scheduleIso ? ` at ${new Date(scheduleIso).toLocaleString()}` : ' now'}.`,
      confirmLabel: scheduleIso ? 'Schedule Message' : 'Send Message',
      tone: 'primary',
    });
    if (!confirmed) return;
    setBusy('send');
    setError('');
    try {
      await api('/api/headmaster/communication/messages', {
        method: 'POST',
        body: JSON.stringify({ title, body, audienceRoles: roles, channels, priority, scheduledFor: scheduleIso }),
      });
      setTitle('');
      setBody('');
      setScheduledFor('');
      setTemplateId('');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Communication could not be sent.');
    } finally {
      setBusy('');
    }
  };

  const decideDraft = async (row: DraftRow, decision: 'approve' | 'reject') => {
    let note = '';
    if (decision === 'reject') {
      note = window.prompt('Rejection reason for the permanent audit trail:', '')?.trim() || '';
      if (!note) return;
    }
    const confirmed = await requestActionConfirm({
      title: decision === 'approve' ? 'Approve and publish Clerk notice?' : 'Reject Clerk notice?',
      message: decision === 'approve'
        ? `This will publish “${row.draft.title || 'School Notice'}” to the selected school audience and preserve it in Communication history.`
        : 'The Clerk draft will remain in permanent history with the Headmaster rejection reason.',
      confirmLabel: decision === 'approve' ? 'Approve & Publish' : 'Reject Draft',
      tone: decision === 'approve' ? 'primary' : 'danger',
    });
    if (!confirmed) return;
    setBusy(row.id);
    setError('');
    try {
      await api(`/api/headmaster/communication-drafts/${encodeURIComponent(row.id)}/decision`, {
        method: 'POST', body: JSON.stringify({ decision, note }),
      });
      await load();
    } catch (e: any) {
      setError(e?.message || 'Draft decision could not be saved.');
    } finally {
      setBusy('');
    }
  };

  const scheduleAction = async (row: MessageRow, action: 'send_now' | 'cancel') => {
    const confirmed = await requestActionConfirm({
      title: action === 'send_now' ? 'Send scheduled message now?' : 'Cancel scheduled message?',
      message: action === 'send_now' ? row.title : `${row.title} will remain in history as a cancelled schedule and will not be delivered.`,
      confirmLabel: action === 'send_now' ? 'Send Now' : 'Cancel Schedule',
      tone: action === 'send_now' ? 'primary' : 'danger',
    });
    if (!confirmed) return;
    setBusy(row.id);
    setError('');
    try {
      await api(`/api/headmaster/communication/messages/${encodeURIComponent(row.id)}/schedule-action`, {
        method: 'POST', body: JSON.stringify({ action }),
      });
      await load();
    } catch (e: any) {
      setError(e?.message || 'Scheduled communication could not be updated.');
    } finally {
      setBusy('');
    }
  };

  const createTemplate = async () => {
    if (!templateName.trim() || !templateBody.trim() || !templateRoles.length) {
      setError('Template name, message and audience are required.');
      return;
    }
    setBusy('template');
    setError('');
    try {
      await api('/api/headmaster/communication/templates', {
        method: 'POST',
        body: JSON.stringify({ name: templateName, channel: 'Notice', category: 'General', body: templateBody, targetRoles: templateRoles }),
      });
      setTemplateName('');
      setTemplateBody('');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Template could not be saved.');
    } finally {
      setBusy('');
    }
  };

  const toggleTemplateStatus = async (row: TemplateRow) => {
    setBusy(row.id);
    setError('');
    try {
      await api(`/api/headmaster/communication/templates/${encodeURIComponent(row.id)}`, {
        method: 'PATCH', body: JSON.stringify({ isActive: !row.isActive }),
      });
      await load();
    } catch (e: any) {
      setError(e?.message || 'Template status could not be changed.');
    } finally {
      setBusy('');
    }
  };

  if (user.role !== 'headmaster') return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-bold text-rose-800">Headmaster authority is required for this workspace.</div>;
  if (loading && !data) return <div className="grid min-h-[360px] place-items-center rounded-3xl border border-slate-200 bg-white"><Loader2 className="h-9 w-9 animate-spin text-cyan-600" /></div>;
  if (!data) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-bold text-rose-800"><AlertTriangle className="mr-2 inline h-5 w-5" />{error || 'Canonical Communication Runtime is unavailable.'}<div className="mt-2 text-xs font-medium">This workspace uses the existing EDUNIXO cloud communication tables and never falls back to browser-local messages.</div></div>;

  const Composer = ({ allowSchedule = true }: { allowSchedule?: boolean }) => <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex items-center justify-between gap-3"><div><h2 className="font-black text-slate-950">Headmaster Publisher</h2><p className="mt-1 text-xs text-slate-500">School-wide authority. Every send is persisted with recipient and delivery evidence.</p></div><Send className="h-5 w-5 text-cyan-700" /></div>
    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <label className="text-xs font-black text-slate-700">Template<select value={templateId} onChange={e => useTemplate(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold"><option value="">Start without template</option>{data.templates.filter(row => row.isActive).map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
      <label className="text-xs font-black text-slate-700">Priority<select value={priority} onChange={e => setPriority(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold"><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></label>
      <label className="lg:col-span-2 text-xs font-black text-slate-700">Title<input value={title} onChange={e => setTitle(e.target.value)} maxLength={300} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold" placeholder="School notice / important message title" /></label>
      <label className="lg:col-span-2 text-xs font-black text-slate-700">Message<textarea value={body} onChange={e => setBody(e.target.value)} rows={5} maxLength={12000} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm leading-6" placeholder="Write the official school communication…" /></label>
    </div>
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <div><div className="text-[10px] font-black uppercase tracking-wide text-slate-500">Audience</div><div className="mt-2 flex flex-wrap gap-2">{roleOptions.map(([key, label]) => <button type="button" key={key} onClick={() => toggle(key, roles, setRoles)} className={`rounded-xl border px-3 py-2 text-xs font-black ${roles.includes(key) ? 'border-cyan-300 bg-cyan-50 text-cyan-800' : 'border-slate-200 text-slate-500'}`}>{label} · {data.audienceCounts?.[key] ?? 0}</button>)}</div></div>
      <div><div className="text-[10px] font-black uppercase tracking-wide text-slate-500">Channels</div><div className="mt-2 flex flex-wrap gap-2">{channelOptions.map(([key, label]) => { const ready = data.channelReadiness?.[key] !== false; return <button type="button" key={key} disabled={!ready} onClick={() => toggle(key, channels, setChannels)} className={`rounded-xl border px-3 py-2 text-xs font-black disabled:cursor-not-allowed disabled:opacity-40 ${channels.includes(key) ? 'border-violet-300 bg-violet-50 text-violet-800' : 'border-slate-200 text-slate-500'}`}>{label}{!ready ? ' · Not configured' : ''}</button>; })}</div></div>
    </div>
    {allowSchedule && <label className="mt-4 block text-xs font-black text-slate-700">Schedule for later (optional)<input type="datetime-local" value={scheduledFor} min={toLocalInput(new Date().toISOString())} onChange={e => setScheduledFor(e.target.value)} className="mt-2 w-full max-w-md rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold" /></label>}
    <button type="button" disabled={busy === 'send'} onClick={() => void sendMessage()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-xs font-black text-white disabled:opacity-50">{busy === 'send' ? <Loader2 className="h-4 w-4 animate-spin" /> : scheduledFor ? <CalendarClock className="h-4 w-4" /> : <Send className="h-4 w-4" />}{scheduledFor ? 'Schedule Communication' : 'Publish / Send'}</button>
  </section>;

  const MessageTable = ({ rows }: { rows: MessageRow[] }) => <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-slate-50 text-[9px] uppercase tracking-wide text-slate-500"><tr><th className="p-3">Message</th><th className="p-3">Audience</th><th className="p-3">Channels</th><th className="p-3">Recipients</th><th className="p-3">Delivery</th><th className="p-3">Read</th><th className="p-3">State</th></tr></thead><tbody>{rows.length ? rows.map(row => <tr key={row.id} className="border-t align-top"><td className="p-3"><div className="font-black text-slate-950">{row.title}</div><div className="mt-1 max-w-sm truncate text-slate-500">{row.body}</div><div className="mt-1 text-[9px] text-slate-400">{row.scheduledFor ? `Scheduled ${new Date(row.scheduledFor).toLocaleString()}` : row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}</div></td><td className="p-3">{row.audienceRoles.join(', ') || '—'}</td><td className="p-3">{row.channels.join(', ')}</td><td className="p-3 font-black">{row.recipientCount}</td><td className="p-3"><div className="font-bold text-emerald-700">{row.delivered} delivered</div><div className="text-amber-700">{row.queued} queued</div>{row.failed > 0 && <div className="text-rose-700">{row.failed} failed</div>}{row.skipped > 0 && <div className="text-slate-500">{row.skipped} skipped</div>}</td><td className="p-3">{row.websiteRead}/{row.websiteSent}</td><td className="p-3"><span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${badge(row.scheduleState === 'pending' ? 'scheduled' : row.scheduleState === 'cancelled' ? 'cancelled' : row.status)}`}>{row.scheduleState === 'pending' ? 'Scheduled' : row.scheduleState === 'cancelled' ? 'Cancelled' : row.status}</span></td></tr>) : <tr><td colSpan={7} className="p-8 text-center font-bold text-slate-400">No cloud communication records yet.</td></tr>}</tbody></table></div>;

  return <div className="space-y-5 text-left">
    <header className="rounded-[1.75rem] bg-slate-950 p-6 text-white shadow-xl sm:p-8"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-cyan-300"><ShieldCheck className="h-4 w-4" />Headmaster · Canonical Communication</div><h1 className="mt-3 text-2xl font-black">{featureTitle[feature] || 'Communication Hub'}</h1><p className="mt-2 max-w-3xl text-xs leading-6 text-slate-400">One permanent school communication ledger for notices, scheduled delivery, templates and delivery/read evidence. Browser-local demo messages are not an operational source.</p></div><button type="button" onClick={() => void load()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-xs font-black"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button></div></header>

    {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">{error}</div>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{[
      ['Cloud messages', data.messages.length, MessageSquareText],
      ['Clerk drafts pending', pendingDrafts.length, BellRing],
      ['Scheduled', scheduled.length, CalendarClock],
      ['Failed deliveries', failed, AlertTriangle],
      ['Website read', websiteSent ? `${Math.round((websiteRead / websiteSent) * 100)}%` : '—', MailCheck],
    ].map(([label, value, Icon]: any) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><Icon className="h-5 w-5 text-cyan-700" /><div className="mt-3 text-2xl font-black text-slate-950">{value}</div><div className="text-[9px] font-black uppercase tracking-wide text-slate-400">{label}</div></div>)}</div>

    {feature === 'school-notices' && <>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center justify-between"><div><h2 className="font-black">Clerk Notice Approval Queue</h2><p className="mt-1 text-xs text-slate-500">Clerk prepares; Headmaster publishes or rejects. Decisions remain permanently audited.</p></div><span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black text-amber-700">{pendingDrafts.length} pending</span></div><div className="mt-4 space-y-3">{pendingDrafts.length ? pendingDrafts.map(row => <div key={row.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="font-black text-slate-950">{row.draft.title || 'School Notice'}</div><div className="mt-1 text-xs leading-5 text-slate-600">{row.draft.content}</div><div className="mt-2 text-[10px] font-bold text-slate-400">Audience: {(row.draft.targetRoles || []).join(', ') || '—'} · Prepared by {row.draft.preparedBy || 'Clerk'}</div></div><div className="flex shrink-0 gap-2"><button disabled={busy === row.id} onClick={() => void decideDraft(row, 'approve')} className="rounded-xl bg-emerald-600 px-3 py-2 text-[10px] font-black text-white"><CheckCircle2 className="mr-1 inline h-4 w-4" />Publish</button><button disabled={busy === row.id} onClick={() => void decideDraft(row, 'reject')} className="rounded-xl bg-rose-600 px-3 py-2 text-[10px] font-black text-white"><XCircle className="mr-1 inline h-4 w-4" />Reject</button></div></div></div>) : <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-xs font-bold text-emerald-800"><CheckCircle2 className="mr-2 inline h-4 w-4" />No Clerk notice is waiting for Headmaster approval.</div>}</div></section>
      <Composer allowSchedule={false} />
      <MessageTable rows={data.messages.filter(row => row.channels.includes('website')).slice(0, 50)} />
    </>}

    {feature === 'audience-messages' && <><Composer /><MessageTable rows={data.messages.slice(0, 80)} /></>}

    {feature === 'scheduled-communications' && <section className="space-y-4"><Composer /><div className="space-y-3">{scheduled.length ? scheduled.map(row => <div key={row.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-amber-600" /><div className="font-black">{row.title}</div></div><div className="mt-1 text-xs text-slate-500">{row.scheduledFor ? new Date(row.scheduledFor).toLocaleString() : 'Schedule time unavailable'} · {row.audienceRoles.join(', ')} · {row.channels.join(', ')}</div></div><div className="flex gap-2"><button disabled={busy === row.id} onClick={() => void scheduleAction(row, 'send_now')} className="rounded-xl bg-slate-950 px-3 py-2 text-[10px] font-black text-white">Send now</button><button disabled={busy === row.id} onClick={() => void scheduleAction(row, 'cancel')} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-black text-rose-700">Cancel</button></div></div></div>) : <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs font-bold text-slate-400">No scheduled communications.</div>}</div></section>}

    {feature === 'communication-templates' && <div className="grid gap-5 xl:grid-cols-[420px_1fr]"><section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><FileText className="h-5 w-5 text-cyan-700" /><h2 className="font-black">Create Template</h2></div><label className="mt-4 block text-xs font-black">Template name<input value={templateName} onChange={e => setTemplateName(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label><label className="mt-4 block text-xs font-black">Message<textarea rows={6} value={templateBody} onChange={e => setTemplateBody(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label><div className="mt-4 text-[10px] font-black uppercase text-slate-500">Default audience</div><div className="mt-2 flex flex-wrap gap-2">{roleOptions.map(([key, label]) => <button type="button" key={key} onClick={() => toggle(key, templateRoles, setTemplateRoles)} className={`rounded-xl border px-3 py-2 text-[10px] font-black ${templateRoles.includes(key) ? 'border-cyan-300 bg-cyan-50 text-cyan-800' : 'border-slate-200 text-slate-500'}`}>{label}</button>)}</div><button disabled={busy === 'template'} onClick={() => void createTemplate()} className="mt-5 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white">Save Cloud Template</button></section><section className="space-y-3">{data.templates.map(row => <div key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><div className="font-black">{row.name}</div><div className="mt-1 text-xs text-slate-600">{row.body}</div><div className="mt-2 text-[10px] font-bold text-slate-400">{row.channel} · {row.category} · {row.targetRoles.join(', ') || 'No default audience'}</div></div><button disabled={busy === row.id} onClick={() => void toggleTemplateStatus(row)} className={`rounded-xl px-3 py-2 text-[10px] font-black ${row.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{row.isActive ? 'ACTIVE' : 'INACTIVE'}</button></div></div>)}{!data.templates.length && <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs font-bold text-slate-400">No communication templates yet.</div>}</section></div>}

    {feature === 'delivery-history' && <><div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-xs leading-6 text-cyan-900"><History className="mr-2 inline h-4 w-4" />Website read evidence is counted from native EDUNIXO notifications. WhatsApp/SMS/Email status is counted from the permanent provider delivery queue; failed/skipped rows are never hidden.</div><MessageTable rows={data.messages} /></>}

    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-600"><Users className="mr-2 inline h-4 w-4" />Audience counts are resolved from the current school Student Master, Teacher Master and active school memberships. External channels remain disabled until their server provider is configured.</div>
  </div>;
}
