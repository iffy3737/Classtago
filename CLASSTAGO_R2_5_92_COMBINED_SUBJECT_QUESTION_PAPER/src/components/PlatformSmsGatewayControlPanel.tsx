import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  MessageSquareText,
  Phone,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  Smartphone,
  XCircle,
} from 'lucide-react';
import { IS_EDUNIXO_NATIVE_APP } from '../lib/mobileRuntime';
import {
  loadPlatformSmsGatewaySnapshot,
  processPlatformSmsGatewayQueue,
  registerPlatformSmsGatewayDevice,
  setPlatformSmsGatewayAssignment,
  setPlatformSmsGatewayEnabled,
  PlatformSmsGatewayDeviceRow,
  PlatformSmsGatewaySnapshot,
} from '../lib/platformSmsGateway';
import { supabase } from '../lib/supabase';
import { verifyPublicOtp } from '../lib/otpClient';

type PlatformContact = {
  fullName: string;
  mobile: string;
  email: string;
  loginEmail: string;
  mobileConfigured: boolean;
  emailConfigured: boolean;
};

export default function PlatformSmsGatewayControlPanel() {
  const [snapshot, setSnapshot] = useState<PlatformSmsGatewaySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  const [contact, setContact] = useState<PlatformContact | null>(null);
  const [contactMobile, setContactMobile] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactBusy, setContactBusy] = useState(false);
  const [contactMessage, setContactMessage] = useState('');

  const [securityToken, setSecurityToken] = useState('');
  const [securityOtp, setSecurityOtp] = useState('');
  const [securityMasked, setSecurityMasked] = useState('');
  const [securityVerified, setSecurityVerified] = useState(false);
  const [securityBusy, setSecurityBusy] = useState(false);
  const [securityMessage, setSecurityMessage] = useState('');

  const authenticatedRequest = async (path: string, options: RequestInit = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Platform Super Admin session is required.');
    const response = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        ...(options.headers || {}),
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error || `Platform request failed (${response.status}).`);
    return payload;
  };

  const loadContact = async () => {
    try {
      const result = await authenticatedRequest('/api/platform/security/contact');
      const next = result.contact as PlatformContact;
      setContact(next);
      setContactMobile(next?.mobile || '');
      setContactEmail(next?.email || '');
    } catch (e: any) {
      setContact(null);
      throw e;
    }
  };

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const [nextSnapshot] = await Promise.all([
        loadPlatformSmsGatewaySnapshot(),
        loadContact(),
      ]);
      setSnapshot(nextSnapshot);
    } catch (e: any) {
      setSnapshot(null);
      setError(e?.message || 'Platform SMS/OTP Gateway could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, []);

  const gatewayOn = Boolean(snapshot?.device?.is_enabled && snapshot.permissionGranted && snapshot.telephonyAvailable);
  const otpCount = useMemo(() => snapshot?.recent.filter(row => row.message_kind === 'otp').length || 0, [snapshot]);
  const contactConfigured = Boolean(contact?.mobileConfigured && contact?.mobile);
  const registeredDeviceCount = snapshot?.devices?.length || 0;

  const run = async (action: () => Promise<any>) => {
    setWorking(true);
    setError('');
    try {
      await action();
      await refresh();
    } catch (e: any) {
      setError(e?.message || 'Platform gateway action failed.');
    } finally {
      setWorking(false);
    }
  };

  const enable = () => run(async () => {
    await registerPlatformSmsGatewayDevice(true);
    await setPlatformSmsGatewayEnabled(true);
  });
  const disable = () => run(async () => { await setPlatformSmsGatewayEnabled(false); });

  const saveContact = async () => {
    setContactBusy(true);
    setError('');
    setContactMessage('');
    try {
      const result = await authenticatedRequest('/api/platform/security/contact', {
        method: 'PUT',
        body: JSON.stringify({ mobile: contactMobile, email: contactEmail }),
      });
      const next = result.contact as PlatformContact;
      setContact(next);
      setContactMobile(next.mobile || '');
      setContactEmail(next.email || '');
      setContactMessage('Security contact saved. Mobile is the Super Admin security/WhatsApp-base contact. The optional email is only an OTP fallback and does not change the login email. Sender SIM is selected from the Android gateway device.');
    } catch (e: any) {
      setError(e?.message || 'Platform Super Admin mobile could not be saved.');
    } finally {
      setContactBusy(false);
    }
  };

  const platformSecurityPost = async (path: string, body: Record<string, any> = {}) => authenticatedRequest(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const requestSecurityOtp = async () => {
    setSecurityBusy(true);
    setSecurityMessage('');
    setError('');
    try {
      const result = await platformSecurityPost('/api/platform/security/otp/request', { action: 'platform-gateway-security-check' });
      setSecurityToken(result.challengeToken || '');
      setSecurityMasked(result.maskedMobile || 'registered mobile');
      setSecurityOtp('');
      setSecurityVerified(false);
      setSecurityMessage(`Security OTP sent/queued via ${result.deliveryLabel || 'available channel'} to ${result.maskedMobile || 'your registered mobile'}${result.maskedEmail ? ` / ${result.maskedEmail}` : ''}.`);
    } catch (e: any) {
      setError(e?.message || 'Platform security OTP could not be sent.');
    } finally {
      setSecurityBusy(false);
    }
  };

  const verifySecurityOtp = async () => {
    if (!securityToken || securityOtp.length !== 6) {
      setError('Enter the 6-digit security OTP.');
      return;
    }
    setSecurityBusy(true);
    setSecurityMessage('');
    setError('');
    try {
      await verifyPublicOtp(securityToken, securityOtp);
      await platformSecurityPost('/api/platform/security/otp/consume', { challengeToken: securityToken });
      setSecurityVerified(true);
      setSecurityMessage('Platform Super Admin security OTP verified and consumed successfully.');
    } catch (e: any) {
      setSecurityVerified(false);
      setError(e?.message || 'Platform security OTP verification failed.');
    } finally {
      setSecurityBusy(false);
    }
  };

  return <div className="space-y-5">
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-violet-50 p-3 text-violet-700"><KeyRound className="h-6 w-6" /></div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-black text-slate-950">Platform SMS / OTP Gateway Setup</h3>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase text-emerald-700">Critical-only policy</span>
            </div>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">Platform OTP delivery is split into two separate things: the recipient/security mobile saved below, and the Android gateway phone whose default SIM actually sends SMS. Live Demo and School Registration OTP use the Platform gateway automatically; no sender number is typed at OTP time.</p>
          </div>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={loading || working || contactBusy} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button>
      </div>

      {error && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</div>}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SetupStatus step="1" label="Admin Mobile" value={contactConfigured ? 'Configured' : 'Required'} ok={contactConfigured} />
        <SetupStatus step="2" label="Android Gateway" value={registeredDeviceCount ? `${registeredDeviceCount} registered` : 'Not registered'} ok={registeredDeviceCount > 0} />
        <SetupStatus step="3" label="This Device" value={gatewayOn ? 'Online' : 'Offline'} ok={gatewayOn} />
        <SetupStatus step="4" label="OTP Test" value={securityVerified ? 'Verified' : 'Pending'} ok={securityVerified} />
      </div>
    </section>

    <section className="rounded-3xl border border-violet-200 bg-violet-50/40 p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-violet-100 p-2 text-violet-700"><Phone className="h-5 w-5" /></div>
        <div>
          <div className="text-[9px] font-black uppercase tracking-[.2em] text-violet-600">Step 1</div>
          <h4 className="mt-1 text-sm font-black text-slate-950">Super Admin Security / WhatsApp Mobile</h4>
          <p className="mt-1 text-[10px] leading-5 text-slate-600">This is the authenticated Super Admin's own security contact. It is used when the Super Admin receives a security OTP and as the WhatsApp-base contact. It is <b>not</b> the sender SIM number.</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-[9px] font-black uppercase tracking-wider text-slate-500">
          Mobile number <span className="text-rose-500">*</span>
          <input
            inputMode="tel"
            value={contactMobile}
            onChange={e => setContactMobile(e.target.value.slice(0, 24))}
            placeholder="10-digit mobile or +91..."
            className="mt-1 block min-h-11 w-full rounded-xl border border-violet-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-violet-500"
          />
        </label>
        <label className="text-[9px] font-black uppercase tracking-wider text-slate-500">
          OTP fallback email — optional
          <input
            inputMode="email"
            type="email"
            value={contactEmail}
            onChange={e => setContactEmail(e.target.value.slice(0, 254))}
            placeholder="security@example.com (optional)"
            className="mt-1 block min-h-11 w-full rounded-xl border border-violet-200 bg-white px-3 text-sm font-bold normal-case text-slate-900 outline-none focus:border-violet-500"
          />
        </label>
      </div>

      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-[10px] leading-5 text-slate-600">
        <div className="flex items-start gap-2"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><div><b className="text-slate-800">Login email:</b> {contact?.loginEmail || 'No login email available'}<br /><span className="text-slate-500">Changing the optional OTP fallback email above does not change the Super Admin login email.</span></div></div>
      </div>

      <button
        type="button"
        onClick={() => void saveContact()}
        disabled={contactBusy || !contactMobile.trim()}
        className="edx-platform-contact-save-btn mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-black transition-colors sm:w-auto"
        aria-label="Save Super Admin mobile number and optional OTP fallback email"
      >
        <Save className="h-4 w-4" />
        <span>{contactBusy ? 'Saving contact…' : 'Save Mobile & OTP Email'}</span>
      </button>

      {contactMessage && <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-semibold leading-5 text-emerald-800">{contactMessage}</div>}
      <div className="mt-3 rounded-xl border border-violet-100 bg-white p-3 text-[10px] leading-5 text-slate-600"><b className="text-slate-800">After entering the mobile:</b> tap <b>Save Mobile & OTP Email</b>. Live Demo/School Registration OTP goes to the visitor's own number; the mobile above is only the Super Admin's security contact. Platform SMS are sent by whichever registered Android gateway is Primary/healthy.</div>
    </section>

    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-sky-50 p-2 text-sky-700"><Smartphone className="h-5 w-5" /></div>
        <div>
          <div className="text-[9px] font-black uppercase tracking-[.2em] text-sky-600">Step 2 — Android app installation stage</div>
          <h4 className="mt-1 text-sm font-black text-slate-950">Register the Super Admin Android Phone as Sender Gateway</h4>
          <p className="mt-1 text-[10px] leading-5 text-slate-600">Open this same Platform Admin page inside the installed Classtago Android app on the phone whose SIM should send Platform OTP. The app asks for SEND_SMS permission and registers that device. On dual-SIM phones, Android's default SMS SIM is used.</p>
        </div>
      </div>

      {!IS_EDUNIXO_NATIVE_APP && <div className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900"><AlertTriangle className="h-4 w-4 shrink-0" /><div><b>Browser/AI Studio preview cannot activate a SIM gateway.</b><div className="mt-1 text-[10px]">You can finish Step 1 now. Step 2 will be completed after the Classtago Android app is installed on the Super Admin phone.</div></div></div>}

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Status label="This Device" value={loading ? 'Checking' : gatewayOn ? 'Online' : 'Offline'} ok={gatewayOn} icon={Activity} />
        <Status label="SMS Permission" value={snapshot?.permissionGranted ? 'Granted' : 'Required'} ok={Boolean(snapshot?.permissionGranted)} icon={ShieldCheck} />
        <Metric label="OTP jobs (recent)" value={otpCount} />
        <Metric label="Queued" value={snapshot?.queued || 0} />
        <Metric label="Failed" value={snapshot?.failed || 0} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {!gatewayOn
          ? <button onClick={() => void enable()} disabled={!IS_EDUNIXO_NATIVE_APP || working} className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-xs font-black text-white disabled:opacity-40"><ShieldCheck className="h-4 w-4" />{working ? 'Activating…' : 'Register / Start This Phone'}</button>
          : <button onClick={() => void disable()} disabled={working} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-black text-rose-700 disabled:opacity-40"><XCircle className="h-4 w-4" />Stop This Gateway</button>}
        <button onClick={() => void run(() => processPlatformSmsGatewayQueue(8))} disabled={!gatewayOn || working} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 disabled:opacity-40"><Send className="h-4 w-4" />Send Critical Queue Now</button>
      </div>

      {snapshot?.device && <div className="mt-4 grid gap-2 rounded-xl bg-slate-50 p-3 text-[10px] text-slate-500 sm:grid-cols-4"><div><b className="text-slate-700">Device:</b> {snapshot.device.device_name}</div><div><b className="text-slate-700">Assignment:</b> {snapshot.device.gateway_assignment || 'Backup'}</div><div><b className="text-slate-700">Today:</b> {snapshot.device.sent_today || 0}/{snapshot.device.daily_sms_soft_limit || 80} SMS units</div><div><b className="text-slate-700">Last seen:</b> {snapshot.device.last_seen_at ? new Date(snapshot.device.last_seen_at).toLocaleString() : 'Not yet'}</div></div>}

      <div className="mt-4 rounded-xl border border-sky-100 bg-sky-50 p-3 text-[10px] leading-5 text-sky-900"><b>Sender number process:</b> no SIM number is manually entered in Classtago. The registered Android phone sends through its default SMS SIM. If you want a different SIM, change the phone's Android SMS default before starting the gateway.</div>
    </section>

    <section className="rounded-3xl border border-violet-200 bg-violet-50/40 p-5 shadow-sm">
      <div className="flex items-start gap-3"><div className="rounded-xl bg-violet-100 p-2 text-violet-700"><ShieldCheck className="h-5 w-5" /></div><div><div className="text-[9px] font-black uppercase tracking-[.2em] text-violet-600">Step 3</div><h4 className="mt-1 text-sm font-black text-slate-950">Primary / Backup Platform Gateway Assignment</h4><p className="mt-1 text-[10px] leading-5 text-slate-600">One Super Admin device should be Primary. Additional registered phones can be Backup. If Primary becomes stale/offline or reaches its daily safety limit, Backup becomes eligible automatically.</p></div></div>
      <div className="mt-4 space-y-3">
        {!snapshot?.devices?.length
          ? <div className="rounded-xl border border-dashed border-violet-200 bg-white p-5 text-center text-xs text-slate-500">No Platform gateway registered yet. This list will populate after Step 2 is completed from the Android app.</div>
          : snapshot.devices.map(row => <PlatformAssignmentRow key={row.id} row={row} current={snapshot.device?.id === row.id} disabled={working} onSave={(assignment, limit) => run(() => setPlatformSmsGatewayAssignment(row.device_key, assignment, limit))} />)}
      </div>
    </section>

    <section className="rounded-3xl border border-violet-200 bg-violet-50/50 p-5 shadow-sm">
      <div className="flex items-start gap-3"><div className="rounded-xl bg-violet-100 p-2 text-violet-700"><ShieldCheck className="h-5 w-5" /></div><div><div className="text-[9px] font-black uppercase tracking-[.2em] text-violet-600">Step 4 — test after app installation</div><h4 className="mt-1 text-sm font-black text-slate-950">Super Admin Security OTP Check</h4><p className="mt-1 text-[10px] leading-5 text-slate-600">Uses the mobile saved in Step 1. SMS and WhatsApp are attempted independently when configured; Email is optional. This test does not allow an arbitrary destination number.</p></div></div>
      {!contactConfigured && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[10px] font-semibold text-amber-900">Save the Super Admin mobile in Step 1 before testing security OTP.</div>}
      {!securityToken
        ? <button type="button" onClick={() => void requestSecurityOtp()} disabled={securityBusy || !contactConfigured} className="mt-4 rounded-xl bg-violet-700 px-4 py-2.5 text-xs font-black text-white disabled:opacity-40">{securityBusy ? 'Sending…' : 'Send My Security OTP'}</button>
        : securityVerified
          ? <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-black text-emerald-700"><CheckCircle2 className="h-4 w-4" />Security OTP verified</div>
          : <div className="mt-4"><div className="text-[10px] font-bold text-slate-500">Sent to {securityMasked || 'registered mobile'}</div><div className="mt-2 flex flex-col gap-2 sm:flex-row"><input inputMode="numeric" maxLength={6} value={securityOtp} onChange={e => setSecurityOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit OTP" className="min-h-10 flex-1 rounded-xl border border-violet-200 bg-white px-3 font-mono text-xs font-black tracking-[.22em] outline-none" /><button type="button" onClick={() => void verifySecurityOtp()} disabled={securityBusy || securityOtp.length !== 6} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white disabled:opacity-40">{securityBusy ? 'Verifying…' : 'Verify & Consume'}</button><button type="button" onClick={() => void requestSecurityOtp()} disabled={securityBusy} className="rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-[10px] font-black text-violet-700 disabled:opacity-40">Resend</button></div></div>}
      {securityMessage && <div className="mt-3 text-[10px] font-semibold text-violet-800">{securityMessage}</div>}
    </section>

    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4"><div className="flex items-center gap-2"><MessageSquareText className="h-4 w-4 text-violet-700" /><h4 className="text-sm font-black text-slate-900">Platform Critical Delivery Queue</h4></div><p className="mt-1 text-[10px] text-slate-500">OTP is urgent and processed before lower-priority critical messages.</p></div>
      <div className="max-h-[430px] overflow-auto">{!snapshot?.recent?.length
        ? <div className="p-10 text-center text-xs text-slate-400">No platform SMS/OTP jobs yet.</div>
        : snapshot.recent.map(row => <div key={row.id} className="border-b border-slate-100 px-5 py-3 last:border-0"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[11px] font-black text-slate-800">{row.destination}</span><span className="rounded-full bg-violet-50 px-2 py-0.5 text-[8px] font-black uppercase text-violet-700">{row.message_kind.replaceAll('_', ' ')}</span></div><div className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-500">{row.message_body}</div></div><QueueStatus status={row.status} /></div><div className="mt-2 flex flex-wrap gap-x-4 text-[9px] text-slate-400"><span>Priority: {row.priority}</span><span>Attempts: {row.attempts}</span><span>SMS units: {row.sms_parts || 1}</span><span>{new Date(row.created_at).toLocaleString()}</span>{row.last_error && <span className="font-semibold text-rose-600">{row.last_error}</span>}</div></div>)}</div>
    </section>

    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-[10px] leading-5 text-blue-900"><Phone className="mr-2 inline h-4 w-4" /><b>Critical channel policy:</b> SIM SMS is reserved for OTP/account security/critical emergency. WhatsApp is an independent route when configured and Email is optional, so an unavailable SMS route does not have to stop verification.</div>
  </div>;
}

function SetupStatus({ step, label, value, ok }: { step: string; label: string; value: string; ok: boolean }) {
  return <div className={`rounded-xl border p-3 ${ok ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}><div className="flex items-center justify-between"><span className={`grid h-6 w-6 place-items-center rounded-full text-[9px] font-black ${ok ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>{step}</span>{ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Loader2 className="h-4 w-4 text-slate-400" />}</div><div className="mt-2 text-[9px] font-black uppercase tracking-wider text-slate-500">{label}</div><div className={`mt-1 text-xs font-black ${ok ? 'text-emerald-700' : 'text-slate-700'}`}>{value}</div></div>;
}

function PlatformAssignmentRow({ row, current, disabled, onSave }: { key?: string; row: PlatformSmsGatewayDeviceRow; current: boolean; disabled: boolean; onSave: (assignment: 'primary' | 'backup', limit: number) => Promise<any> }) {
  const [assignment, setAssignment] = useState<'primary' | 'backup'>(row.gateway_assignment || 'backup');
  const [limit, setLimit] = useState(String(row.daily_sms_soft_limit || 80));
  useEffect(() => { setAssignment(row.gateway_assignment || 'backup'); setLimit(String(row.daily_sms_soft_limit || 80)); }, [row.gateway_assignment, row.daily_sms_soft_limit]);
  const online = Boolean(row.is_enabled && row.permission_granted && row.last_seen_at && Date.now() - new Date(row.last_seen_at).getTime() < 75_000);
  return <div className="rounded-xl border border-violet-100 bg-white p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-black text-slate-900">{row.device_name}</span>{current && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[8px] font-black uppercase text-violet-700">This device</span>}<span className={`rounded-full px-2 py-0.5 text-[8px] font-black uppercase ${online ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{online ? 'Healthy' : 'Offline/Stale'}</span></div><div className="mt-1 text-[9px] text-slate-500">Today: <b>{row.sent_today || 0}/{row.daily_sms_soft_limit || 80}</b> estimated SMS units · App {row.app_version || '—'}</div></div><div className="flex flex-wrap items-end gap-2"><label className="text-[9px] font-black uppercase text-slate-500">Route<select value={assignment} onChange={e => setAssignment(e.target.value as 'primary' | 'backup')} className="mt-1 block rounded-lg border border-slate-200 bg-white px-2 py-2 text-[10px] font-bold normal-case"><option value="primary">Primary</option><option value="backup">Backup</option></select></label><label className="text-[9px] font-black uppercase text-slate-500">Daily safety limit<input inputMode="numeric" value={limit} onChange={e => setLimit(e.target.value.replace(/\D/g, '').slice(0, 4))} className="mt-1 block w-24 rounded-lg border border-slate-200 px-2 py-2 text-[10px] font-bold normal-case" /></label><button disabled={disabled} onClick={() => void onSave(assignment, Math.max(10, Number(limit || 80)))} className="rounded-lg bg-violet-700 px-3 py-2 text-[10px] font-black text-white disabled:opacity-40">Save</button></div></div></div>;
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</div><div className="mt-1 text-xl font-black text-slate-900">{value}</div></div>; }
function Status({ label, value, ok, icon: Icon }: { label: string; value: string; ok: boolean; icon: React.ComponentType<{ className?: string }> }) { return <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="flex items-center justify-between"><div className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</div><Icon className={`h-3.5 w-3.5 ${ok ? 'text-emerald-600' : 'text-slate-400'}`} /></div><div className={`mt-1 text-sm font-black ${ok ? 'text-emerald-700' : 'text-slate-700'}`}>{value}</div></div>; }
function QueueStatus({ status }: { status: string }) { const sent = status === 'sent', failed = status === 'failed'; return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-black uppercase ${sent ? 'bg-emerald-50 text-emerald-700' : failed ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{sent ? <CheckCircle2 className="h-3 w-3" /> : failed ? <XCircle className="h-3 w-3" /> : <Loader2 className="h-3 w-3" />}{status}</span>; }
