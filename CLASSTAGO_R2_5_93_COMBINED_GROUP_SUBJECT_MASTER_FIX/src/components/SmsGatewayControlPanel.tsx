import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Loader2, MessageSquareText, Phone, RefreshCw, Send, ShieldCheck, Smartphone, XCircle } from 'lucide-react';
import { Language, User } from '../types';
import {
  enqueueSmsMessages,
  loadSmsGatewaySnapshot,
  processSmsGatewayQueue,
  registerSmsGatewayDevice,
  setSmsGatewayAssignment,
  setSmsGatewayEnabled,
  SmsGatewayDeviceRow,
  SmsGatewaySnapshot,
} from '../lib/smsGateway';
import { IS_EDUNIXO_NATIVE_APP } from '../lib/mobileRuntime';

export default function SmsGatewayControlPanel({ lang, user }: { lang?: Language; user: User }) {
  void lang;
  const [snapshot, setSnapshot] = useState<SmsGatewaySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [testPhone, setTestPhone] = useState(user.phone || '');
  const [testMessage, setTestMessage] = useState('Classtago SMS Gateway test message.');

  const refresh = async () => {
    setLoading(true);
    setError('');
    try { setSnapshot(await loadSmsGatewaySnapshot()); }
    catch (e: any) { setError(e?.message || 'SMS Gateway status could not be loaded. Apply the latest gateway migration and retry.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void refresh(); }, []);

  const runAction = async (action: () => Promise<unknown>) => {
    setWorking(true); setError('');
    try { await action(); await refresh(); }
    catch (e: any) { setError(e?.message || 'SMS Gateway action failed.'); }
    finally { setWorking(false); }
  };

  const enable = () => runAction(async () => {
    await registerSmsGatewayDevice(true);
    await setSmsGatewayEnabled(true);
    await processSmsGatewayQueue(5);
  });

  const disable = () => runAction(async () => { await setSmsGatewayEnabled(false); });

  const sendTest = () => runAction(async () => {
    if (!testPhone.trim()) throw new Error('Enter a real mobile number for the gateway test.');
    if (!testMessage.trim()) throw new Error('Enter a test SMS message.');
    await enqueueSmsMessages([testPhone], testMessage, { priority: 'normal', sourceKind: 'gateway-test' });
    await processSmsGatewayQueue(1);
  });

  const gatewayOn = Boolean(snapshot?.device?.is_enabled && snapshot.permissionGranted && snapshot.telephonyAvailable);

  return (
    <div className="space-y-5 animate-fade-in text-left">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-700"><Smartphone className="h-5 w-5" /></div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-black text-slate-900">Classtago Inbuilt SMS Gateway</h3>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-700">Critical SMS only</span>
              </div>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">OTP, account security and genuine emergency SMS are routed to registered Android devices automatically. Classtago selects the Primary gateway first and the Backup gateway when Primary is offline/stale or reaches its daily safety limit.</p>
            </div>
          </div>
          <button type="button" onClick={() => void refresh()} disabled={loading || working} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-black text-slate-600 hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh</button>
        </div>

        {!IS_EDUNIXO_NATIVE_APP && (
          <div className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><div><strong>Gateway activation requires the installed Android app.</strong><div className="mt-1 text-[10px] leading-5 text-amber-800">Open Classtago on the Headmaster/Clerk office phone whose SIM should send school OTP/security SMS. The web panel can manage registered gateways, but the SIM sender must be an authorized Android device.</div></div></div>
        )}

        {error && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] font-semibold text-rose-700">{error}</div>}

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatusCard label="This Device" value={loading ? 'Checking' : gatewayOn ? 'Online' : 'Offline'} ok={gatewayOn} icon={Activity} />
          <StatusCard label="SMS Permission" value={snapshot?.permissionGranted ? 'Granted' : 'Required'} ok={Boolean(snapshot?.permissionGranted)} icon={ShieldCheck} />
          <MetricCard label="Queued" value={snapshot?.queued || 0} />
          <MetricCard label="Sent (recent)" value={snapshot?.sent || 0} />
          <MetricCard label="Failed (recent)" value={snapshot?.failed || 0} />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {!gatewayOn ? <button type="button" onClick={enable} disabled={!IS_EDUNIXO_NATIVE_APP || working} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"><ShieldCheck className="h-4 w-4" />{working ? 'Activating…' : 'Register / Start This Device'}</button>
            : <button type="button" onClick={disable} disabled={working} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-black text-rose-700 hover:bg-rose-100 disabled:opacity-40"><XCircle className="h-4 w-4" />Stop This Gateway</button>}
          <button type="button" onClick={() => runAction(() => processSmsGatewayQueue(5))} disabled={!gatewayOn || working} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-40"><Send className="h-4 w-4" />Send Queue Now</button>
        </div>

        {snapshot?.device && <div className="mt-4 grid gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-[10px] text-slate-500 sm:grid-cols-4"><div><span className="font-black text-slate-700">Device:</span> {snapshot.device.device_name}</div><div><span className="font-black text-slate-700">Owner role:</span> {roleLabel(snapshot.device.owner_role)}</div><div><span className="font-black text-slate-700">Assignment:</span> {snapshot.device.gateway_assignment || 'Backup'}</div><div><span className="font-black text-slate-700">Last seen:</span> {snapshot.device.last_seen_at ? new Date(snapshot.device.last_seen_at).toLocaleString() : 'Not yet'}</div></div>}
      </div>

      <section className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-blue-100 p-2 text-blue-700"><ShieldCheck className="h-5 w-5" /></div>
          <div><h4 className="text-sm font-black text-slate-900">Automatic Gateway Assignment & Fallback</h4><p className="mt-1 text-[10px] leading-5 text-slate-600">No sender mobile number is selected at OTP time. Each phone registers as a device under its logged-in role. Mark one device Primary and one/more Backup. If Primary stops heartbeating for about 75 seconds or reaches its daily soft limit, Backup becomes eligible automatically.</p></div>
        </div>
        <div className="mt-4 space-y-3">
          {!snapshot?.devices?.length ? <div className="rounded-xl border border-dashed border-blue-200 bg-white p-5 text-center text-xs text-slate-500">No school gateway device registered yet. Open Classtago Android on the Headmaster/Clerk phone and press “Register / Start This Device”.</div> : snapshot.devices.map(row => (
            <GatewayAssignmentRow key={row.id} row={row} current={snapshot.device?.id === row.id} disabled={working} onSave={(assignment, limit) => runAction(() => setSmsGatewayAssignment(row.device_key, assignment, limit))} />
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-blue-100 bg-white p-3 text-[10px] leading-5 text-slate-600"><b className="text-slate-800">SIM rule:</b> Classtago routes to the registered Android device, not to a typed sender number. On dual-SIM phones this release uses the phone's Android default SMS SIM, so set the intended school/role SIM as the default SMS SIM on that device.</div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-blue-600" /><h4 className="text-sm font-black text-slate-900">Real SIM Test</h4></div>
          <p className="mt-1 text-[10px] leading-5 text-slate-500">Use your own number first. The test is queued in Classtago and sent only if this device is currently the eligible Primary/Backup route.</p>
          <label className="mt-4 block text-[10px] font-black uppercase tracking-wider text-slate-500">Mobile number</label>
          <input value={testPhone} onChange={e => setTestPhone(e.target.value)} placeholder="10-digit Indian mobile" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-blue-400" />
          <label className="mt-3 block text-[10px] font-black uppercase tracking-wider text-slate-500">Message</label>
          <textarea value={testMessage} onChange={e => setTestMessage(e.target.value)} rows={4} className="mt-1 w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-blue-400" />
          <button type="button" onClick={sendTest} disabled={!gatewayOn || working} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-xs font-black text-white disabled:opacity-40"><MessageSquareText className="h-4 w-4" />Queue & Send Test SMS</button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4"><h4 className="text-sm font-black text-slate-900">Gateway Queue & Recent Delivery</h4><p className="mt-1 text-[10px] text-slate-500">Latest school critical SMS jobs visible to authorized gateway managers.</p></div>
          <div className="max-h-[390px] overflow-auto">
            {!snapshot?.recent?.length ? <div className="p-8 text-center text-xs text-slate-400">No SMS jobs yet.</div> : snapshot.recent.map(row => (
              <div key={row.id} className="border-b border-slate-100 px-5 py-3 last:border-0">
                <div className="flex items-start justify-between gap-3"><div><div className="font-mono text-[11px] font-black text-slate-800">{row.destination}</div><div className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-500">{row.message_body}</div></div><QueueStatus status={row.status} /></div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[9px] text-slate-400"><span>Priority: {row.priority}</span><span>Attempts: {row.attempts}</span><span>SMS units: {row.sms_parts || 1}</span><span>{new Date(row.created_at).toLocaleString()}</span>{row.last_error && <span className="font-semibold text-rose-600">{row.last_error}</span>}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-[10px] leading-5 text-slate-600"><strong className="text-slate-800">Operational note:</strong> Classtago does not impose a software-plan message cap, but this gateway remains policy-locked to OTP, security and critical/emergency use. The configurable daily soft limit prevents Classtago from consuming the entire SIM plan; carrier/recharge restrictions still apply.</div>
    </div>
  );
}

function GatewayAssignmentRow({ row, current, disabled, onSave }: { key?: string; row: SmsGatewayDeviceRow; current: boolean; disabled: boolean; onSave: (assignment: 'primary'|'backup', limit: number) => Promise<unknown> }) {
  const [assignment, setAssignment] = useState<'primary'|'backup'>(row.gateway_assignment || 'backup');
  const [limit, setLimit] = useState(String(row.daily_sms_soft_limit || 80));
  useEffect(() => { setAssignment(row.gateway_assignment || 'backup'); setLimit(String(row.daily_sms_soft_limit || 80)); }, [row.gateway_assignment, row.daily_sms_soft_limit]);
  const online = Boolean(row.is_enabled && row.permission_granted && row.last_seen_at && Date.now() - new Date(row.last_seen_at).getTime() < 75_000);
  return <div className="rounded-xl border border-blue-100 bg-white p-4">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="truncate text-xs font-black text-slate-900">{row.device_name}</span>{current && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[8px] font-black uppercase text-blue-700">This device</span>}<span className={`rounded-full px-2 py-0.5 text-[8px] font-black uppercase ${online ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{online ? 'Healthy' : 'Offline/Stale'}</span></div><div className="mt-1 text-[9px] text-slate-500">Role: <b>{roleLabel(row.owner_role)}</b> · Today: <b>{row.sent_today || 0}/{row.daily_sms_soft_limit || 80}</b> estimated SMS units · App {row.app_version || '—'}</div></div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-[9px] font-black uppercase text-slate-500">Route<select value={assignment} onChange={e => setAssignment(e.target.value as 'primary'|'backup')} className="mt-1 block rounded-lg border border-slate-200 bg-white px-2 py-2 text-[10px] font-bold normal-case"><option value="primary">Primary</option><option value="backup">Backup</option></select></label>
        <label className="text-[9px] font-black uppercase text-slate-500">Daily safety limit<input inputMode="numeric" value={limit} onChange={e => setLimit(e.target.value.replace(/\D/g,'').slice(0,4))} className="mt-1 block w-24 rounded-lg border border-slate-200 px-2 py-2 text-[10px] font-bold normal-case" /></label>
        <button type="button" disabled={disabled} onClick={() => void onSave(assignment, Math.max(10, Number(limit || 80)))} className="rounded-lg bg-blue-600 px-3 py-2 text-[10px] font-black text-white disabled:opacity-40">Save</button>
      </div>
    </div>
  </div>;
}

function roleLabel(value?: string | null) {
  const raw = String(value || 'unknown').replaceAll('_', ' ').trim();
  return raw.split(/\s+/).map(part => part ? part[0].toUpperCase() + part.slice(1) : '').join(' ');
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</div><div className="mt-1 text-xl font-black text-slate-900">{value}</div></div>;
}

function StatusCard({ label, value, ok, icon: Icon }: { label: string; value: string; ok: boolean; icon: React.ComponentType<{className?: string}> }) {
  return <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="flex items-center justify-between"><div className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</div><Icon className={`h-3.5 w-3.5 ${ok ? 'text-emerald-600' : 'text-slate-400'}`} /></div><div className={`mt-1 text-sm font-black ${ok ? 'text-emerald-700' : 'text-slate-700'}`}>{value}</div></div>;
}

function QueueStatus({ status }: { status: string }) {
  const sent = status === 'sent'; const failed = status === 'failed';
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-black uppercase ${sent ? 'bg-emerald-50 text-emerald-700' : failed ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{sent ? <CheckCircle2 className="h-3 w-3" /> : failed ? <XCircle className="h-3 w-3" /> : <Loader2 className="h-3 w-3" />}{status}</span>;
}
