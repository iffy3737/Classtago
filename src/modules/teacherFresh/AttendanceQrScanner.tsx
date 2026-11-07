import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { supabase } from '../../lib/supabase';
import type { TeacherCloudContext } from './types';

type Props = { context: TeacherCloudContext | null; loading: boolean; error?: string };
type Stu = { id: string; name: string; gr: string; roll: number | null; hasPhone: boolean; status: string | null; scannedAt: string | null; late: boolean };
type AlertRow = { id: string; studentId: string; name: string; kind: string; status: string; phone: string | null; message: string; error: string | null };
type QrState = { date: string; total: number; present: number; students: Stu[]; alerts: AlertRow[]; settings: { presentEnabled: boolean; absentEnabled: boolean; reviewMinutes: number; absentAt: string }; session: { started: boolean; processed: boolean }; provider: string };
type Shown = { key: number; kind: 'ok' | 'dup' | 'err'; name?: string; gr?: string; roll?: number | null; photoUrl?: string | null; late?: boolean; at?: string | null; text?: string };

const STATUS_TEXT: Record<string, string> = { queued: 'Line me', held: 'Ruka hua', sending: 'Bhej raha', sent: 'Bhej diya', failed: 'Fail', cancelled: 'Cancel', no_number: 'Number nahi', expired: 'Expire' };
const STATUS_CLS: Record<string, string> = { queued: 'bg-slate-100 text-slate-700', held: 'bg-amber-100 text-amber-800', sending: 'bg-sky-100 text-sky-800', sent: 'bg-emerald-100 text-emerald-800', failed: 'bg-rose-100 text-rose-800', cancelled: 'bg-slate-100 text-slate-500', no_number: 'bg-rose-100 text-rose-800', expired: 'bg-slate-100 text-slate-500' };

async function call(path: string, init?: { method?: string; body?: any }) {
  const s = await supabase.auth.getSession();
  const token = s.data.session ? s.data.session.access_token : '';
  if (!token) throw new Error('Session expire ho gayi. Dobara sign in karo.');
  const hasBody = !!(init && init.body);
  const r = await fetch(path, {
    method: (init && init.method) || 'GET',
    headers: Object.assign({ Authorization: 'Bearer ' + token }, hasBody ? { 'Content-Type': 'application/json' } : {}),
    body: hasBody ? JSON.stringify(init!.body) : undefined
  });
  const json: any = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, json };
}
const timeText = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
};
const hm12 = (hhmm?: string | null) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm || ''));
  if (!m) return String(hhmm || '');
  const h = Number(m[1]);
  return ((h + 11) % 12) + 1 + ':' + m[2] + ' ' + (h >= 12 ? 'PM' : 'AM');
};
const initials = (n: string) => {
  const w = (n || '').trim().split(/\s+/).filter(Boolean);
  return ((w[0] || '').charAt(0) + (w.length > 1 ? w[w.length - 1].charAt(0) : '')).toUpperCase() || '?';
};
let audioCtx: any = null;
const beep = (kind: 'ok' | 'dup' | 'err') => {
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (AC) {
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === 'suspended') void audioCtx.resume();
      const tones: number[][] = kind === 'ok' ? [[880, 0, 0.12]] : kind === 'dup' ? [[560, 0, 0.09], [560, 0.14, 0.09]] : [[180, 0, 0.35]];
      tones.forEach((t) => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.frequency.value = t[0];
        o.type = kind === 'err' ? 'square' : 'sine';
        g.gain.value = 0.15;
        o.connect(g);
        g.connect(audioCtx.destination);
        const at = audioCtx.currentTime + t[1];
        o.start(at);
        o.stop(at + t[2]);
      });
    }
  } catch (e) { /* sound is optional */ }
  try { if (navigator.vibrate) navigator.vibrate(kind === 'err' ? [80, 60, 80] : 50); } catch (e) { /* ignore */ }
};

function Avatar({ url, name, size }: { url?: string | null; name: string; size: number }) {
  const [bad, setBad] = useState(false);
  useEffect(() => { setBad(false); }, [url]);
  return (
    <div className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-indigo-100 font-black text-indigo-700" style={{ width: size, height: size, fontSize: size / 3 }}>
      {initials(name)}
      {url && !bad ? <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" onError={() => setBad(true)} /> : null}
    </div>
  );
}

export default function AttendanceQrScanner({ context, loading, error }: Props) {
  const scopes = useMemo(() => {
    const map = new Map<string, any>();
    ((context && (context as any).assignments) || []).filter((a: any) => a.isClassTeacher || a.scopeType === 'class_teacher').forEach((a: any) => {
      const key = a.classId + ':' + (a.divisionId || '');
      if (!map.has(key) || a.scopeType === 'class_teacher') map.set(key, a);
    });
    return Array.from(map.values());
  }, [context]);
  const [pick, setPick] = useState('');
  const scope: any = scopes.find((a: any) => a.classId + ':' + (a.divisionId || '') === pick) || scopes[0] || null;
  const sKey = scope ? scope.classId + ':' + (scope.divisionId || '') : '';
  const body = useMemo(() => (scope ? { classId: scope.classId, className: scope.className || '', divisionId: scope.divisionId || '', divisionName: scope.division || '', academicYearId: scope.academicYearId || '' } : null), [sKey]);
  const bodyRef = useRef<any>(null);
  bodyRef.current = body;

  const [tab, setTab] = useState<'scan' | 'list' | 'msgs'>('scan');
  const [st, setSt] = useState<QrState | null>(null);
  const [stErr, setStErr] = useState('');
  const [camOn, setCamOn] = useState(false);
  const [camErr, setCamErr] = useState('');
  const [torchOk, setTorchOk] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [shown, setShown] = useState<Shown | null>(null);
  const [recent, setRecent] = useState<Shown[]>([]);
  const [note, setNote] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [acting, setActing] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const busyRef = useRef(false);
  const lastRef = useRef({ code: '', at: 0 });
  const refreshRef = useRef<any>(null);
  const aliveRef = useRef(true);
  const seq = useRef(0);

  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; if (refreshRef.current) clearTimeout(refreshRef.current); };
  }, []);
  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 4500);
    return () => clearTimeout(t);
  }, [note]);

  const loadState = useCallback(async () => {
    const b = bodyRef.current;
    if (!b) return;
    try {
      const r = await call('/api/teacher/attendance/qr/state?' + new URLSearchParams(b).toString());
      if (!aliveRef.current) return;
      if (!r.ok) { setStErr(r.json.error || 'Class ki attendance load nahi hui.'); return; }
      setStErr('');
      setSt(r.json);
    } catch (e: any) {
      if (aliveRef.current) setStErr((e && e.message) || 'Network problem.');
    }
  }, []);
  const refreshSoon = useCallback(() => {
    if (refreshRef.current) clearTimeout(refreshRef.current);
    refreshRef.current = setTimeout(() => { void loadState(); }, 1200);
  }, [loadState]);

  useEffect(() => { setSt(null); setShown(null); setRecent([]); }, [sKey]);
  useEffect(() => {
    if (!sKey) return;
    void loadState();
    const id = setInterval(() => { if (!document.hidden) void loadState(); }, tab === 'msgs' ? 15000 : 30000);
    return () => clearInterval(id);
  }, [sKey, tab, loadState]);

  const stopCamera = useCallback(() => {
    const s = streamRef.current;
    if (s) s.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const v = videoRef.current;
    if (v) v.srcObject = null;
    setCamOn(false);
    setTorchOn(false);
  }, []);
  const startCamera = useCallback(async () => {
    stopCamera();
    setCamErr('');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCamErr('Is browser ya app me camera support nahi hai, ya page https par nahi khula.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      if (!aliveRef.current) { stream.getTracks().forEach((t) => t.stop()); return; }
      streamRef.current = stream;
      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        try { await v.play(); } catch (e) { /* playback can start later */ }
      }
      const track: any = stream.getVideoTracks()[0];
      try { await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }); } catch (e) { /* not supported */ }
      const caps: any = track.getCapabilities ? track.getCapabilities() : {};
      setTorchOk(!!caps.torch);
      setCamOn(true);
    } catch (e: any) {
      const n = e && e.name;
      setCamErr(n === 'NotAllowedError' || n === 'SecurityError' ? 'Camera ki permission band hai. Settings me Camera allow karo, phir "Camera dubara chalu karo" dabao.' : n === 'NotFoundError' ? 'Is device me camera nahi mila.' : 'Camera nahi khul paya: ' + ((e && e.message) || n || 'unknown'));
    }
  }, [stopCamera]);
  useEffect(() => {
    if (tab !== 'scan' || !sKey) return;
    void startCamera();
    return () => { stopCamera(); };
  }, [tab, sKey, startCamera, stopCamera]);
  useEffect(() => {
    const f = () => {
      if (document.hidden || tab !== 'scan' || !sKey) return;
      const t = streamRef.current ? streamRef.current.getVideoTracks()[0] : null;
      if (!t || t.readyState !== 'live') void startCamera();
    };
    document.addEventListener('visibilitychange', f);
    return () => document.removeEventListener('visibilitychange', f);
  }, [tab, sKey, startCamera]);

  const show = (s: Omit<Shown, 'key'>) => {
    const item: Shown = { ...s, key: ++seq.current };
    setShown(item);
    setRecent((prev) => [item, ...prev].slice(0, 6));
  };
  const onCode = async (text: string) => {
    const b = bodyRef.current;
    if (!b || busyRef.current) return;
    const now = Date.now();
    if (lastRef.current.code === text && now - lastRef.current.at < 4000) return;
    lastRef.current = { code: text, at: now };
    if (!/^CLASSTAGO:ST:/.test(text)) { show({ kind: 'err', text: 'Ye ClassTago student card ka QR nahi hai.' }); beep('err'); return; }
    busyRef.current = true;
    try {
      const r = await call('/api/teacher/attendance/qr/scan', { method: 'POST', body: { ...b, code: text } });
      if (!r.ok) { show({ kind: 'err', text: r.json.error || 'Scan save nahi hua.' }); beep('err'); return; }
      const s = r.json.student || {};
      const dup = !!r.json.duplicate;
      show({ kind: dup ? 'dup' : 'ok', name: s.name, gr: s.gr, roll: s.roll, photoUrl: s.photoUrl, late: !!r.json.late, at: r.json.at });
      beep(dup ? 'dup' : 'ok');
      setSt((prev) => (prev ? { ...prev, present: dup ? prev.present : prev.present + 1, students: prev.students.map((x) => (x.id === s.id ? { ...x, status: 'P', scannedAt: x.scannedAt || r.json.at, late: x.scannedAt ? x.late : !!r.json.late } : x)) } : prev));
      refreshSoon();
    } catch (e: any) {
      show({ kind: 'err', text: (e && e.message) || 'Network problem. Dobara scan karo.' });
      beep('err');
      lastRef.current = { code: '', at: 0 };
    } finally {
      setTimeout(() => { busyRef.current = false; }, 600);
    }
  };
  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode;

  useEffect(() => {
    if (!camOn || tab !== 'scan') return;
    let dead = false;
    let errs = 0;
    let det: any = null;
    const W: any = window;
    if (W.BarcodeDetector) { try { det = new W.BarcodeDetector({ formats: ['qr_code'] }); } catch (e) { det = null; } }
    const tick = async () => {
      if (dead || busyRef.current || document.hidden) return;
      const v = videoRef.current;
      if (!v || v.readyState < 2 || !v.videoWidth) return;
      let text = '';
      try {
        if (det) {
          const found = await det.detect(v);
          if (found && found.length) text = String(found[0].rawValue || '');
          errs = 0;
        } else {
          const sc = Math.min(1, 640 / Math.max(v.videoWidth, v.videoHeight));
          const cw = Math.max(1, Math.round(v.videoWidth * sc));
          const ch = Math.max(1, Math.round(v.videoHeight * sc));
          let cv = canvasRef.current;
          if (!cv) { cv = document.createElement('canvas'); canvasRef.current = cv; }
          cv.width = cw;
          cv.height = ch;
          const g = cv.getContext('2d', { willReadFrequently: true } as any);
          if (!g) return;
          g.drawImage(v, 0, 0, cw, ch);
          const img = g.getImageData(0, 0, cw, ch);
          const res = jsQR(img.data, cw, ch, { inversionAttempts: 'dontInvert' });
          if (res && res.data) text = res.data;
        }
      } catch (e) {
        errs += 1;
        if (det && errs > 3) det = null;
        return;
      }
      if (text && !dead) void onCodeRef.current(text);
    };
    const id = setInterval(() => { void tick(); }, 150);
    return () => { dead = true; clearInterval(id); };
  }, [camOn, tab, sKey]);

  const toggleTorch = async () => {
    const t: any = streamRef.current ? streamRef.current.getVideoTracks()[0] : null;
    if (!t) return;
    try { await t.applyConstraints({ advanced: [{ torch: !torchOn }] }); setTorchOn(!torchOn); } catch (e) { /* torch not supported */ }
  };
  const manual = async (s: Stu) => {
    const b = bodyRef.current;
    if (!b || acting) return;
    if (!window.confirm(s.name + ' ko Present mark karein?')) return;
    setActing(s.id);
    try {
      const r = await call('/api/teacher/attendance/qr/manual', { method: 'POST', body: { ...b, studentId: s.id } });
      if (!r.ok) setNote({ type: 'err', text: r.json.error || 'Present mark nahi hua.' });
      else await loadState();
    } catch (e: any) {
      setNote({ type: 'err', text: (e && e.message) || 'Network problem.' });
    }
    setActing('');
  };
  const act = async (action: string, alertId?: string) => {
    const b = bodyRef.current;
    if (!b || acting) return;
    setActing(alertId || action);
    try {
      const r = await call('/api/teacher/attendance/qr/alerts', { method: 'POST', body: { ...b, action, alertId } });
      if (!r.ok) setNote({ type: 'err', text: r.json.error || 'Action nahi hua.' });
      else await loadState();
    } catch (e: any) {
      setNote({ type: 'err', text: (e && e.message) || 'Network problem.' });
    }
    setActing('');
  };

  if (loading) return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading...</div>;
  if (!scopes.length) return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">{error || 'QR attendance sirf us teacher ke liye hai jo kisi class ka Class Teacher hai. Aapko abhi koi class assign nahi hai.'}</div>;

  const alerts: AlertRow[] = st ? st.alerts : [];
  const held = alerts.filter((a) => a.kind === 'absent' && a.status === 'held');
  const absentAlerts = alerts.filter((a) => a.kind !== 'present');
  const presentAlerts = alerts.filter((a) => a.kind === 'present');
  const manualMode = !!st && st.provider === 'manual';
  const waLink = (a: AlertRow) => 'https://wa.me/' + a.phone + '?text=' + encodeURIComponent(a.message);
  const classLabel = (a: any) => (a.className || 'Class') + (a.division ? '-' + a.division : '');
  const tabBtn = (k: 'scan' | 'list' | 'msgs', label: string) => (
    <button type="button" onClick={() => setTab(k)} className={'flex-1 rounded-xl px-3 py-2.5 text-xs font-black ' + (tab === k ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700')}>{label}</button>
  );
  const renderAlert = (a: AlertRow) => (
    <div key={a.id} className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-slate-900">{a.name}</div>
          <div className="text-[11px] text-slate-500">{a.kind === 'absent' ? 'Absent message' : a.kind === 'present' ? 'Present message' : 'Ab present message'}</div>
        </div>
        <span className={'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-black ' + (STATUS_CLS[a.status] || 'bg-slate-100 text-slate-700')}>{STATUS_TEXT[a.status] || a.status}</span>
      </div>
      <div className="mt-1 line-clamp-2 text-[11px] text-slate-500">{a.message}</div>
      {a.error ? <div className="mt-1 text-[11px] font-bold text-rose-700">{a.error}</div> : null}
      <div className="mt-2 flex flex-wrap gap-2">
        {manualMode && a.phone && (a.status === 'queued' || a.status === 'failed') ? <a href={waLink(a)} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-black text-white">WhatsApp me bhejo</a> : null}
        {manualMode && (a.status === 'queued' || a.status === 'failed') ? <button type="button" disabled={!!acting} onClick={() => void act('mark_sent', a.id)} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-black text-white disabled:opacity-40">Bhej diya</button> : null}
        {a.kind === 'absent' && a.phone ? <a href={'tel:+' + a.phone} className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-black text-white">Call karo</a> : null}
        {['queued', 'held', 'failed', 'no_number'].includes(a.status) ? <button type="button" disabled={!!acting} onClick={() => void act('cancel', a.id)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 disabled:opacity-40">Cancel</button> : null}
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-md space-y-3 pb-24">
      <div className="rounded-2xl border border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-black text-slate-900">QR Attendance</div>
            <div className="text-[11px] text-slate-500">{st ? st.date : ''}</div>
          </div>
          <div className="text-right">
            <div className="text-xl font-black text-emerald-700">{st ? st.present + ' / ' + st.total : '...'}</div>
            <div className="text-[11px] text-slate-500">present</div>
          </div>
        </div>
        {scopes.length > 1 ? (
          <select value={sKey} onChange={(e) => setPick(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            {scopes.map((a: any) => { const k = a.classId + ':' + (a.divisionId || ''); return <option key={k} value={k}>{classLabel(a)}</option>; })}
          </select>
        ) : <div className="mt-1 text-xs font-bold text-slate-700">{classLabel(scope)}</div>}
        {stErr ? <div className="mt-2 rounded-lg bg-rose-50 p-2 text-xs font-bold text-rose-700">{stErr}</div> : null}
        {note ? <div className={'mt-2 rounded-lg p-2 text-xs font-bold ' + (note.type === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700')}>{note.text}</div> : null}
      </div>
      <div className="flex gap-2">{tabBtn('scan', 'Scan')}{tabBtn('list', 'Students')}{tabBtn('msgs', 'Messages' + (held.length ? ' !' : ''))}</div>

      {tab === 'scan' ? (
        <div className="space-y-3">
          <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-2xl bg-black">
            <video ref={videoRef} playsInline muted autoPlay className="h-full w-full object-cover" />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><div className="h-3/5 w-3/5 rounded-2xl border-4 border-white/80" /></div>
            {!camOn && !camErr ? <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">Camera khul raha hai...</div> : null}
            {torchOk ? <button type="button" onClick={() => void toggleTorch()} className="absolute right-2 top-2 rounded-lg bg-black/60 px-3 py-2 text-xs font-black text-white">{torchOn ? 'Torch band' : 'Torch'}</button> : null}
          </div>
          {camErr ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800">
              {camErr}
              <button type="button" onClick={() => void startCamera()} className="mt-2 block w-full rounded-lg bg-rose-600 px-3 py-2 text-xs font-black text-white">Camera dubara chalu karo</button>
            </div>
          ) : null}
          {shown ? (
            <div className={'flex items-center gap-3 rounded-2xl border p-3 ' + (shown.kind === 'ok' ? 'border-emerald-300 bg-emerald-50' : shown.kind === 'dup' ? 'border-sky-300 bg-sky-50' : 'border-rose-300 bg-rose-50')}>
              {shown.kind === 'err' ? <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-2xl font-black text-rose-700">!</div> : <Avatar url={shown.photoUrl} name={shown.name || ''} size={64} />}
              <div className="min-w-0">
                {shown.kind === 'err' ? <div className="text-sm font-black text-rose-800">{shown.text}</div> : (
                  <>
                    <div className="truncate text-base font-black text-slate-900">{shown.name}</div>
                    <div className="text-xs text-slate-600">{'GR ' + (shown.gr || '-') + (shown.roll ? ' | Roll ' + shown.roll : '')}</div>
                    <div className={'mt-1 text-sm font-black ' + (shown.kind === 'ok' ? 'text-emerald-700' : 'text-sky-700')}>{(shown.kind === 'ok' ? 'Present ' : 'Pehle se present ') + timeText(shown.at) + (shown.late ? ' (Late)' : '')}</div>
                  </>
                )}
              </div>
            </div>
          ) : <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">Student card ka QR camera ke saamne laao.</div>}
          {recent.length > 1 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="mb-1 text-[11px] font-black text-slate-500">Abhi abhi</div>
              {recent.slice(1).map((r) => (
                <div key={r.key} className="flex justify-between gap-2 py-0.5 text-xs">
                  <span className="truncate text-slate-800">{r.kind === 'err' ? (r.text || 'Error') : r.name}</span>
                  <span className={'shrink-0 font-bold ' + (r.kind === 'ok' ? 'text-emerald-700' : r.kind === 'dup' ? 'text-sky-700' : 'text-rose-700')}>{r.kind === 'ok' ? 'Present ' + timeText(r.at) : r.kind === 'dup' ? 'Pehle se' : 'Error'}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === 'list' ? (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {!st ? <div className="p-4 text-center text-xs text-slate-500">Load ho raha hai...</div> : null}
          {(st ? st.students : []).map((s) => (
            <div key={s.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-slate-900">{s.name}</div>
                <div className="text-xs text-slate-500">{'GR ' + s.gr + (s.roll ? ' | Roll ' + s.roll : '') + (s.hasPhone ? '' : ' | number nahi')}</div>
              </div>
              {s.status === 'P' ? (
                <div className="text-right text-xs font-black text-emerald-700">{'Present ' + timeText(s.scannedAt)}{s.late ? <div className="text-amber-700">Late</div> : null}</div>
              ) : (
                <div className="flex shrink-0 items-center gap-2">
                  {s.status === 'A' ? <span className="text-xs font-black text-rose-700">Absent</span> : null}
                  <button type="button" disabled={!!acting} onClick={() => void manual(s)} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-black text-white disabled:opacity-40">Present karo</button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : null}

      {tab === 'msgs' ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
            {st ? (st.settings.absentEnabled ? 'Absent message ' + hm12(st.settings.absentAt) + ' ke baad banega' + (st.settings.reviewMinutes ? ' aur ' + st.settings.reviewMinutes + ' minute baad jayega (tab tak aap cancel kar sakte ho).' : '.') : 'Absent message band hai.') : ''}
            {st && st.session.processed ? ' Aaj ka absent check ho chuka hai.' : ''}
            <div className="mt-1">{manualMode ? 'Sender: manual. "WhatsApp me bhejo" dabao, WhatsApp me Send karo, phir wapas aakar "Bhej diya" dabao.' : 'Sender: ' + (st ? st.provider : '') + ' (apne aap bhejta hai).'}</div>
          </div>
          {held.length ? (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3">
              <div className="text-sm font-black text-amber-900">{held.length + ' absent messages roke gaye hain'}</div>
              <div className="mt-1 text-xs text-amber-900">Abhi bahut kam students scan hue hain. Pehle dekh lo ki sab present students scan ho gaye, phir confirm karo.</div>
              <div className="mt-2 flex gap-2">
                <button type="button" disabled={!!acting} onClick={() => { if (window.confirm(held.length + ' parents ko absent message bhejna hai?')) void act('confirm_held'); }} className="flex-1 rounded-lg bg-amber-600 px-3 py-2 text-xs font-black text-white disabled:opacity-40">Sab bhejo</button>
                <button type="button" disabled={!!acting} onClick={() => void act('cancel_held')} className="flex-1 rounded-lg bg-white px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-40">Sab cancel</button>
              </div>
            </div>
          ) : null}
          {absentAlerts.map(renderAlert)}
          {presentAlerts.length ? (
            <details className="rounded-2xl border border-slate-200 bg-white p-3">
              <summary className="cursor-pointer text-xs font-black text-slate-700">{'Present messages (' + presentAlerts.length + ')'}</summary>
              <div className="mt-2 space-y-2">{presentAlerts.map(renderAlert)}</div>
            </details>
          ) : null}
          {!alerts.length ? <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">Abhi koi message nahi hai.</div> : null}
        </div>
      ) : null}
    </div>
  );
}
