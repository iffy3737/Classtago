/**
 * Classtago R2.5.86 — Maria realtime assistant.
 *
 * Production path: authenticated browser/native app -> Classtago WebSocket gateway
 * -> Gemini 3.1 Flash Live. The permanent Gemini key stays server-side.
 * R2.5.86 preserves secure pre-warm so the first user-visible conversation starts
 * much faster without opening the microphone before the user taps Talk to Maria.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle, Bot, Mic, MicOff, PhoneCall, PhoneOff, Radio,
  ShieldCheck, Sparkles, Volume2, Zap
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { resolveEdunixoWebSocketUrl } from '../lib/mobileRuntime';
import { Language } from '../types';
import { publishMariaDynamicCommand, type MariaDynamicClientCommand } from '../lib/mariaClientBridge';

type LiveState = 'idle' | 'connecting' | 'live' | 'speaking' | 'reconnecting' | 'error';
type WarmState = 'idle' | 'warming' | 'ready';
type ClientAction =
  | { type: 'dial'; label: string; uri: string; contactName?: string }
  | { type: 'navigate'; label: string; moduleId: string; featureId?: string; feature?: string }
  | { type: 'public_navigate'; label: string; section: string }
  | { type: 'confirm'; label: string; actionId: string; title?: string; summary?: string };

const isMariaDynamicAction = (action:any): action is MariaDynamicClientCommand =>
  action?.type === 'maria_mark_entry' || action?.type === 'maria_homework' || action?.type === 'maria_question_paper' || action?.type === 'maria_academic_generate' || action?.type === 'maria_attendance' || action?.type === 'maria_parent_portal';

type VoiceOption = { id: string; label: string; tone: string };
type PersonaOption = { id: string; label: string; description: string };

const VOICES: VoiceOption[] = [
  { id: 'Sulafat', label: 'Sulafat', tone: 'Warm' },
  { id: 'Achird', label: 'Achird', tone: 'Friendly' },
  { id: 'Aoede', label: 'Aoede', tone: 'Breezy' },
  { id: 'Kore', label: 'Kore', tone: 'Clear' },
  { id: 'Puck', label: 'Puck', tone: 'Upbeat' },
  { id: 'Zephyr', label: 'Zephyr', tone: 'Calm' },
];

const PERSONAS: PersonaOption[] = [
  { id: 'school_assistant', label: 'Maria · General', description: 'Warm all-purpose school colleague' },
  { id: 'teacher', label: 'Maria · Teacher', description: 'Patient classroom-style conversation' },
  { id: 'office', label: 'Maria · Office', description: 'Professional administration support' },
  { id: 'parent_support', label: 'Maria · Parent Support', description: 'Calm, respectful parent conversation' },
];

interface RealtimeVoiceAssistantProps { lang: Language; publicSchoolSlug?: string; publicSchoolName?: string; }

function stateLabel(state: LiveState, warmState: WarmState) {
  if (state === 'connecting') return 'Connecting…';
  if (state === 'speaking') return 'Maria is speaking — interrupt anytime';
  if (state === 'reconnecting') return 'Reconnecting without losing the session…';
  if (state === 'live') return 'Live — speak naturally';
  if (state === 'error') return 'Realtime voice unavailable';
  if (warmState === 'ready') return 'Maria is ready for an instant start';
  if (warmState === 'warming') return 'Preparing Maria in the background…';
  return 'Ready for natural conversation';
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}

function base64ToInt16(encoded: string) {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Int16Array(bytes.buffer);
}

function downsample(input: Float32Array, fromRate: number, toRate = 16000) {
  if (fromRate === toRate) return input;
  const ratio = fromRate / toRate;
  const output = new Float32Array(Math.max(1, Math.round(input.length / ratio)));
  let pos = 0;
  for (let i = 0; i < output.length; i += 1) {
    const next = Math.round((i + 1) * ratio);
    let sum = 0;
    let count = 0;
    for (; pos < next && pos < input.length; pos += 1) { sum += input[pos]; count += 1; }
    output[i] = count ? sum / count : 0;
  }
  return output;
}

function toInt16(input: Float32Array) {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, input[i]));
    output[i] = sample < 0 ? sample * 32768 : sample * 32767;
  }
  return output;
}

function resampleLinear(input: Float32Array, fromRate: number, toRate: number) {
  if (fromRate === toRate) return input;
  const output = new Float32Array(Math.max(1, Math.round(input.length * toRate / fromRate)));
  const ratio = fromRate / toRate;
  for (let i = 0; i < output.length; i += 1) {
    const x = i * ratio;
    const lo = Math.floor(x);
    const hi = Math.min(input.length - 1, lo + 1);
    const fraction = x - lo;
    output[i] = input[lo] * (1 - fraction) + input[hi] * fraction;
  }
  return output;
}

export default function RealtimeVoiceAssistant({ lang, publicSchoolSlug, publicSchoolName }: RealtimeVoiceAssistantProps) {
  const publicReceptionist = Boolean(publicSchoolSlug);
  const wsRef = useRef<WebSocket | null>(null);
  const wsReadyRef = useRef(false);
  const activatedRef = useRef(false);
  const configKeyRef = useRef('');
  const warmExpiryRef = useRef<number | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playerNodeRef = useRef<AudioWorkletNode | null>(null);

  const [state, setState] = useState<LiveState>('idle');
  const [warmState, setWarmState] = useState<WarmState>('idle');
  const [error, setError] = useState('');
  const [micEnabled, setMicEnabled] = useState(true);
  const micEnabledRef = useRef(true);
  const [voice, setVoice] = useState('Sulafat');
  const [persona, setPersona] = useState('school_assistant');
  const [userTranscript, setUserTranscript] = useState('');
  const [botTranscript, setBotTranscript] = useState('');
  const [clientAction, setClientAction] = useState<ClientAction | null>(null);
  const [actionStatus, setActionStatus] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [interruptions, setInterruptions] = useState(0);

  const isLive = state === 'live' || state === 'speaking' || state === 'reconnecting';
  const isActive = isLive || state === 'connecting';
  const currentConfigKey = `${voice}|${persona}|${String(lang || 'en')}`;

  const clearWarmExpiry = () => {
    if (warmExpiryRef.current) window.clearTimeout(warmExpiryRef.current);
    warmExpiryRef.current = null;
  };

  const ensureAudio = async () => {
    let context = audioContextRef.current;
    if (!context || context.state === 'closed') {
      context = new AudioContext({ latencyHint: 'interactive' });
      audioContextRef.current = context;
      await context.audioWorklet.addModule('/edunixo-pcm-player.worklet.js');
      const player = new AudioWorkletNode(context, 'edunixo-pcm-player');
      player.connect(context.destination);
      playerNodeRef.current = player;
    }
    await context.resume();
    return context;
  };

  const flushPlayback = () => {
    try { playerNodeRef.current?.port.postMessage({ type: 'flush' }); } catch {}
  };

  const playPcm = async (encoded: string) => {
    const context = await ensureAudio();
    const pcm = base64ToInt16(encoded);
    const float = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i += 1) float[i] = pcm[i] / 32768;
    const output = resampleLinear(float, 24000, context.sampleRate);
    playerNodeRef.current?.port.postMessage({ type: 'push', samples: output.buffer }, [output.buffer]);
  };

  const sendRealtime = (payload: unknown) => {
    const ws = wsRef.current;
    if (ws?.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'toGemini', payload }));
  };

  const stopMic = (signalEnd = true) => {
    if (signalEnd) sendRealtime({ realtimeInput: { audioStreamEnd: true } });
    try { processorRef.current?.disconnect(); } catch {}
    try { sourceNodeRef.current?.disconnect(); } catch {}
    micStreamRef.current?.getTracks().forEach(track => track.stop());
    processorRef.current = null;
    sourceNodeRef.current = null;
    micStreamRef.current = null;
  };

  const startMic = async () => {
    if (micStreamRef.current) return;
    const context = await ensureAudio();
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 }
    });
    micStreamRef.current = stream;
    const source = context.createMediaStreamSource(stream);
    sourceNodeRef.current = source;
    const processor = context.createScriptProcessor(1024, 1, 1);
    processorRef.current = processor;
    const silent = context.createGain();
    silent.gain.value = 0;
    source.connect(processor);
    processor.connect(silent);
    silent.connect(context.destination);
    processor.onaudioprocess = event => {
      const ws = wsRef.current;
      if (!activatedRef.current || !micEnabledRef.current || ws?.readyState !== WebSocket.OPEN || !wsReadyRef.current) return;
      const input = event.inputBuffer.getChannelData(0);
      const pcm = toInt16(downsample(input, context.sampleRate, 16000));
      sendRealtime({ realtimeInput: { audio: { data: bytesToBase64(new Uint8Array(pcm.buffer)), mimeType: 'audio/pcm;rate=16000' } } });
    };
  };

  const closeSession = (resetState = true) => {
    clearWarmExpiry();
    stopMic(false);
    flushPlayback();
    activatedRef.current = false;
    wsReadyRef.current = false;
    configKeyRef.current = '';
    const ws = wsRef.current;
    wsRef.current = null;
    if (ws?.readyState === WebSocket.OPEN) {
      try { ws.send(JSON.stringify({ type: 'stop' })); } catch {}
      try { ws.close(1000, 'Classtago user ended Maria session'); } catch {}
    } else {
      try { ws?.close(); } catch {}
    }
    setWarmState('idle');
    if (resetState) {
      setState('idle');
      micEnabledRef.current = true;
      setMicEnabled(true);
    }
  };

  const handleClientAction = (action: any) => {
    if (isMariaDynamicAction(action)) {
      publishMariaDynamicCommand(action);
      setClientAction(null);
      setActionStatus(String(action?.statusMessage || 'Maria handed the request to the existing Classtago module.'));
      return;
    }
    if (action?.type === 'dial' && action?.uri) {
      setClientAction({ type:'dial', label:String(action.label || 'Call'), uri:String(action.uri), contactName:String(action.contactName || '') });
      return;
    }
    if (action?.type === 'navigate' && action?.moduleId) {
      setClientAction({ type:'navigate', label:String(action.label || 'Open in Classtago'), moduleId:String(action.moduleId), featureId:action.featureId ? String(action.featureId) : undefined, feature:action.feature ? String(action.feature) : undefined });
      return;
    }
    if (action?.type === 'public_navigate' && action?.section) {
      setClientAction({ type:'public_navigate', label:String(action.label || 'Open'), section:String(action.section) });
      return;
    }
    if (action?.type === 'confirm' && action?.actionId) {
      setClientAction({ type:'confirm', label:String(action.label || 'Confirm action'), actionId:String(action.actionId), title:String(action.title || 'Confirm Maria action'), summary:String(action.summary || '') });
    }
  };

  const connectSession = async (prewarm: boolean) => {
    let startCredential: Record<string,string> = {};
    let socketPath = '/api/assistant/live';
    if (publicReceptionist) {
      const response = await fetch(`/api/public/schools/${encodeURIComponent(String(publicSchoolSlug))}/maria/session`, { method:'POST', headers:{'Content-Type':'application/json'}, body:'{}' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.token) throw new Error(payload?.error || 'Maria Receptionist is temporarily unavailable.');
      startCredential = { publicToken:String(payload.token) };
      socketPath = '/api/public/assistant/live';
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Your secure login session is unavailable. Please sign in again.');
      startCredential = { accessToken:session.access_token };
    }

    const ws = new WebSocket(resolveEdunixoWebSocketUrl(socketPath));
    wsRef.current = ws;
    wsReadyRef.current = false;
    configKeyRef.current = currentConfigKey;
    if (prewarm) setWarmState('warming'); else setState('connecting');

    const connectTimeout = window.setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN || !wsReadyRef.current) {
        try { ws.close(); } catch {}
        if (activatedRef.current) {
          setError('Maria could not start the realtime session in time. Please try again.');
          setState('error');
        } else {
          setWarmState('idle');
        }
      }
    }, 12_000);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'start', ...startCredential, voice, persona:publicReceptionist?'receptionist':persona,
        uiLanguage: String(lang || 'en'), prewarm
      }));
    };

    ws.onmessage = async event => {
      let message: any;
      try { message = JSON.parse(String(event.data || '{}')); } catch { return; }

      if (message.type === 'ready') {
        window.clearTimeout(connectTimeout);
        wsReadyRef.current = true;
        setError('');
        if (activatedRef.current) {
          setWarmState('idle');
          try { ws.send(JSON.stringify({ type:'activate' })); } catch {}
          setState('live');
          micEnabledRef.current = true;
          setMicEnabled(true);
          if (!micStreamRef.current) {
            try { await startMic(); }
            catch (micError: any) {
              setError(micError?.message || 'Microphone permission is required to talk to Maria.');
              setState('error');
            }
          }
        } else {
          setWarmState('ready');
          clearWarmExpiry();
          warmExpiryRef.current = window.setTimeout(() => {
            if (!activatedRef.current && wsRef.current === ws) closeSession(false);
          }, 90_000);
        }
        return;
      }

      if (message.type === 'event') {
        if (!activatedRef.current) {
          if (message.event === 'fatal') { setWarmState('idle'); try { ws.close(); } catch {} }
          return;
        }
        if (message.event === 'reconnecting' || message.event === 'go_away') setState('reconnecting');
        if (message.event === 'resumed' || message.event === 'activated') setState('live');
        if (message.event === 'fatal') {
          setError(String(message.message || 'Maria realtime session ended unexpectedly.'));
          setState('error');
        }
        return;
      }

      if (message.type === 'clientAction') { handleClientAction(message.action); return; }
      if (!activatedRef.current || message.type !== 'gemini') return;

      const content = message.payload?.serverContent;
      if (content?.interrupted) {
        flushPlayback();
        setInterruptions(value => value + 1);
        setState('live');
      }
      if (content?.inputTranscription?.text) setUserTranscript(previous => `${previous}${String(content.inputTranscription.text)}`.slice(-2200));
      if (content?.outputTranscription?.text) setBotTranscript(previous => `${previous}${String(content.outputTranscription.text)}`.slice(-2200));
      if (Array.isArray(content?.modelTurn?.parts)) {
        let receivedAudio = false;
        for (const part of content.modelTurn.parts) {
          const encoded = String(part?.inlineData?.data || '');
          if (encoded) { receivedAudio = true; await playPcm(encoded); }
        }
        if (receivedAudio) setState('speaking');
      }
      if (content?.turnComplete || content?.generationComplete) setState('live');
    };

    ws.onerror = () => {
      if (activatedRef.current) { setError('Maria realtime voice connection failed.'); setState('error'); }
      else setWarmState('idle');
    };

    ws.onclose = event => {
      window.clearTimeout(connectTimeout);
      if (wsRef.current !== ws) return;
      wsRef.current = null;
      wsReadyRef.current = false;
      clearWarmExpiry();
      stopMic(false);
      flushPlayback();
      if (!activatedRef.current) { setWarmState('idle'); return; }
      if (event.code !== 1000) {
        setError(event.reason || 'Maria realtime voice session disconnected.');
        setState('error');
      } else setState('idle');
    };
  };

  const schedulePrewarm = (delay = 650) => {
    window.setTimeout(() => {
      if (activatedRef.current) return;
      const ws = wsRef.current;
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) && configKeyRef.current === currentConfigKey) return;
      try { closeSession(false); } catch {}
      void connectSession(true).catch(() => setWarmState('idle'));
    }, delay);
  };

  useEffect(() => {
    schedulePrewarm(700);
    return () => {
      closeSession(false);
      try { audioContextRef.current?.close(); } catch {}
    };
    // Voice/persona changes deliberately rebuild the short-lived prewarm.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice, persona, lang]);

  const startLive = async () => {
    if (isActive) return;
    setError('');
    setUserTranscript('');
    setBotTranscript('');
    setClientAction(null);
    setActionStatus('');
    setInterruptions(0);
    activatedRef.current = true;
    setState('connecting');
    clearWarmExpiry();

    try {
      await ensureAudio();
      const ws = wsRef.current;
      if (ws && configKeyRef.current === currentConfigKey && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        if (wsReadyRef.current && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type:'activate' }));
          setWarmState('idle');
          setState('live');
          micEnabledRef.current = true;
          setMicEnabled(true);
          try { await startMic(); }
          catch (micError: any) {
            setError(micError?.message || 'Microphone permission is required to talk to Maria.');
            setState('error');
          }
        }
        // If the prewarm is still connecting, the shared ready handler will activate it.
        return;
      }
      closeSession(false);
      activatedRef.current = true;
      await connectSession(false);
    } catch (err: any) {
      console.error('Classtago Maria Live start failed:', err);
      closeSession(false);
      setError(err?.message || 'Maria realtime voice could not start.');
      setState('error');
    }
  };

  const endLive = () => {
    closeSession(true);
    schedulePrewarm(900);
  };

  const toggleMic = async () => {
    if (!isLive) return;
    const next = !micEnabled;
    micEnabledRef.current = next;
    setMicEnabled(next);
    if (!next) { stopMic(true); return; }
    try { await startMic(); }
    catch (err: any) {
      micEnabledRef.current = false;
      setMicEnabled(false);
      setError(err?.message || 'Microphone could not be restarted.');
    }
  };

  const runClientAction = async (confirmationMode: 'confirm' | 'cancel' = 'confirm') => {
    const action = clientAction;
    if (!action || actionBusy) return;
    if (publicReceptionist && action.type === 'confirm') { setActionStatus('Public Maria cannot execute private school actions.'); return; }
    if (action.type === 'dial') { window.location.href = action.uri; return; }
    if (action.type === 'navigate') {
      window.dispatchEvent(new CustomEvent('edunixo_smart_navigate', { detail: { moduleId:action.moduleId, featureId:action.featureId } }));
      return;
    }
    if (action.type === 'public_navigate') {
      window.dispatchEvent(new CustomEvent('edunixo_public_school_action', { detail: { section:action.section } }));
      setActionStatus(action.section === 'admissions' ? 'Maria opened the school admission form.' : `Maria opened the ${action.section} section.`);
      setClientAction(null);
      return;
    }
    setActionBusy(true);
    setActionStatus('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Your secure login session is unavailable. Please sign in again.');
      const response = await fetch(`/api/assistant/actions/${encodeURIComponent(action.actionId)}/${confirmationMode}`, {
        method:'POST', headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'}, body:'{}'
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || data?.result?.message || `Maria action could not be ${confirmationMode === 'cancel' ? 'cancelled' : 'confirmed'}.`);
      const message = String(data?.text || data?.result?.message || (confirmationMode === 'cancel' ? 'Prepared action cancelled.' : 'Confirmed action completed.'));
      setActionStatus(message);
      setClientAction(null);
      if (data?.clientAction) handleClientAction(data.clientAction);
    } catch (err:any) {
      setActionStatus(err?.message || `Maria action could not be ${confirmationMode === 'cancel' ? 'cancelled' : 'confirmed'}.`);
    } finally { setActionBusy(false); }
  };


  return (
    <section className="mx-3 mt-3 rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-blue-50 shadow-sm overflow-hidden">
      <div className="p-3.5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`relative flex h-9 w-9 items-center justify-center rounded-full ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                <Radio className={`h-4 w-4 ${isActive ? 'animate-pulse' : ''}`} />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  {publicReceptionist ? 'Maria Receptionist' : 'Maria'} <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                </p>
                <p className="text-[10px] text-slate-500">{stateLabel(state, warmState)}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/80 border border-emerald-200 px-2 py-1 text-[9px] font-bold text-emerald-700">
              <ShieldCheck className="h-3 w-3" /> {publicReceptionist ? 'Public info only' : 'School scoped'}
            </span>
            {warmState === 'ready' && !isActive && (
              <span className="inline-flex items-center gap-1 text-[8px] font-bold text-amber-700"><Zap className="h-3 w-3" /> Pre-warmed</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="text-[9px] font-bold text-slate-500">Agent
            {publicReceptionist ? <div className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-semibold text-slate-700">Maria · Receptionist</div> : <select value={persona} onChange={e => setPersona(e.target.value)} disabled={isActive}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-semibold text-slate-700 disabled:opacity-60">
              {PERSONAS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>}
          </label>
          <label className="text-[9px] font-bold text-slate-500">Voice
            <select value={voice} onChange={e => setVoice(e.target.value)} disabled={isActive}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-semibold text-slate-700 disabled:opacity-60">
              {VOICES.map(item => <option key={item.id} value={item.id}>{item.label} · {item.tone}</option>)}
            </select>
          </label>
        </div>

        <div className="flex gap-2">
          {!isActive ? (
            <button type="button" onClick={startLive}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-bold text-white hover:bg-slate-800 active:scale-[.99]">
              <PhoneCall className="h-4 w-4" /> Talk to Maria
            </button>
          ) : (
            <button type="button" onClick={endLive}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-rose-700 active:scale-[.99]">
              <PhoneOff className="h-4 w-4" /> End
            </button>
          )}
          <button type="button" onClick={toggleMic} disabled={!isLive}
            className={`inline-flex h-9 w-10 items-center justify-center rounded-xl border ${micEnabled ? 'border-cyan-200 bg-white text-cyan-700' : 'border-rose-200 bg-rose-50 text-rose-700'} disabled:opacity-40`}>
            {micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          </button>
        </div>

        {isLive && (
          <div className="flex items-center gap-2 text-[9px] text-slate-500">
            <Volume2 className="h-3 w-3 text-emerald-600" />
            <span>Gapless audio · interruption enabled · {interruptions} interruption{interruptions === 1 ? '' : 's'}</span>
          </div>
        )}

        {(userTranscript || botTranscript) && (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-200 bg-white/80 p-2 min-w-0">
              <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">You</p>
              <p className="mt-1 max-h-16 overflow-y-auto whitespace-pre-wrap text-[10px] leading-relaxed text-slate-700">{userTranscript || '…'}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white/80 p-2 min-w-0">
              <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">Maria</p>
              <p className="mt-1 max-h-16 overflow-y-auto whitespace-pre-wrap text-[10px] leading-relaxed text-slate-700">{botTranscript || '…'}</p>
            </div>
          </div>
        )}

        {clientAction && (
          <div className={clientAction.type === 'confirm' ? 'rounded-xl border border-amber-200 bg-amber-50 p-2.5 space-y-2' : ''}>
            {clientAction.type === 'confirm' && clientAction.summary && <p className="text-[9px] leading-relaxed text-amber-900">{clientAction.summary}</p>}
            <button type="button" onClick={() => void runClientAction('confirm')} disabled={actionBusy}
              className={`w-full inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-[10px] font-bold text-white disabled:opacity-50 ${clientAction.type === 'dial' ? 'bg-emerald-600 hover:bg-emerald-700' : clientAction.type === 'confirm' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
              {clientAction.type === 'dial' ? <PhoneCall className="h-3.5 w-3.5" /> : clientAction.type === 'confirm' ? <ShieldCheck className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />} {actionBusy ? 'Processing…' : clientAction.label}
            </button>
            {clientAction.type === 'confirm' && (
              <button type="button" onClick={() => void runClientAction('cancel')} disabled={actionBusy}
                className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-[10px] font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-50">
                Cancel
              </button>
            )}
          </div>
        )}

        {actionStatus && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-[10px] text-emerald-900">{actionStatus}</div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-[10px] text-red-800 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /><span>{error}</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-[8px] text-slate-400">
          <Bot className="h-3 w-3" />
          <span>{publicReceptionist ? `Maria uses only published information for ${publicSchoolName || 'this school'}; no Student/Parent/private ERP records are exposed.` : 'Maria uses Gemini Live through Classtago. Role, school and tool permissions are always re-checked server-side.'}</span>
        </div>
      </div>
    </section>
  );
}
