/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Sparkles, AlertCircle, RefreshCw, User, Mic, MicOff, Volume2, VolumeX, ShieldCheck } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../lib/translations';
import UrduWrapper from './UrduWrapper';
import { supabase } from '../lib/supabase';
import RealtimeVoiceAssistant from './RealtimeVoiceAssistant';
import { publishMariaDynamicCommand, requestMariaNavigation } from '../lib/mariaClientBridge';

type MessageAction =
  | { type: 'dial'; label: string; uri: string; contactName?: string }
  | { type: 'navigate'; label: string; moduleId: string; featureId?: string; feature?: string }
  | { type: 'confirm'; label: string; actionId: string; title?: string; summary?: string };

interface Message {
  role: 'user' | 'assistant';
  content: string;
  action?: MessageAction;
}

interface AIAssistantProps {
  lang: Language;
}

export default function AIAssistant({ lang }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [listening, setListening] = useState(false);
  const [voiceReplies, setVoiceReplies] = useState(true);
  const [voiceEngine, setVoiceEngine] = useState<'idle' | 'gemini_tts' | 'fish_audio' | 'server' | 'device'>('idle');
  const [actionBusyId, setActionBusyId] = useState('');
  const recognitionRef = useRef<any>(null);
  const naturalAudioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const responseLanguageRef = useRef<string>(String(lang || 'en'));

  const t = translations[lang];
  const mariaWelcome = String(lang || '').toLowerCase() === 'ur' ? 'السلام علیکم، میں ماریا ہوں۔ آپ مجھ سے اپنے مجاز اسکول کام کے بارے میں لکھ کر یا لائیو آواز میں بات کر سکتے ہیں۔' : String(lang || '').toLowerCase() === 'mr' ? 'नमस्कार, मी Maria आहे. तुमच्या अधिकृत शाळेच्या कामाबद्दल तुम्ही माझ्याशी मजकूर किंवा लाईव्ह आवाजात बोलू शकता.' : String(lang || '').toLowerCase() === 'hi' ? 'नमस्ते, मैं Maria हूँ। आप अपने अधिकृत स्कूल काम के बारे में मुझसे लिखकर या लाइव आवाज़ में बात कर सकते हैं।' : 'Hi, I’m Maria. You can talk to me by text or live voice about the school work available to your signed-in role.';

  const localeFor = (languageCode: string) => {
    const normalized = String(languageCode || 'en').toLowerCase();
    if (normalized.startsWith('ur')) return 'ur-IN';
    if (normalized.startsWith('hi')) return 'hi-IN';
    if (normalized.startsWith('mr')) return 'mr-IN';
    if (normalized.startsWith('gu')) return 'gu-IN';
    if (normalized.startsWith('pa')) return 'pa-IN';
    if (normalized.startsWith('bn')) return 'bn-IN';
    if (normalized.startsWith('ta')) return 'ta-IN';
    if (normalized.startsWith('te')) return 'te-IN';
    if (normalized.startsWith('kn')) return 'kn-IN';
    if (normalized.startsWith('ml')) return 'ml-IN';
    return 'en-IN';
  };

  const speechRecognitionAvailable = typeof window !== 'undefined' && Boolean(
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  );
  const speechSynthesisAvailable = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Initialize with a concise multilingual welcome. The secure server resolves
  // the current school and role; the browser never sends a trusted school/role.
  useEffect(() => {
    setMessages([{ role: 'assistant', content: mariaWelcome }]);
  }, [lang, mariaWelcome]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const stopSpokenAudio = () => {
    try {
      if (naturalAudioRef.current) {
        naturalAudioRef.current.pause();
        naturalAudioRef.current.src = '';
        naturalAudioRef.current = null;
      }
    } catch {}
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  };

  useEffect(() => () => {
    try { recognitionRef.current?.abort?.(); } catch {}
    stopSpokenAudio();
  }, []);

  const mariaDeviceSpeechText = (text: string, responseLanguage?: string) => {
    const code = String(responseLanguage || responseLanguageRef.current || lang || 'en').toLowerCase();
    const spokenName = code.startsWith('ur') ? 'ماریا' : (code.startsWith('hi') || code.startsWith('mr')) ? 'मारिया' : 'Maariya';
    return String(text || '').replace(/\bMaria\b/gi, spokenName);
  };

  const parseClientAction = (raw: any): MessageAction | undefined => {
    if (raw?.type === 'dial' && typeof raw?.uri === 'string') {
      return { type:'dial', label:String(raw.label || 'Call'), uri:String(raw.uri), contactName:String(raw.contactName || '') };
    }
    if (raw?.type === 'navigate' && typeof raw?.moduleId === 'string') {
      return { type:'navigate', label:String(raw.label || 'Open in Classtago'), moduleId:String(raw.moduleId), featureId:raw.featureId ? String(raw.featureId) : undefined, feature:raw.feature ? String(raw.feature) : undefined };
    }
    if (raw?.type === 'confirm' && typeof raw?.actionId === 'string') {
      return { type:'confirm', label:String(raw.label || 'Confirm action'), actionId:String(raw.actionId), title:String(raw.title || 'Confirm Maria action'), summary:String(raw.summary || '') };
    }
    return undefined;
  };

  const fallbackSpeak = (text: string, responseLanguage?: string) => {
    setVoiceEngine('device');
    if (!voiceReplies || !speechSynthesisAvailable || !text.trim()) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(mariaDeviceSpeechText(text, responseLanguage));
      utterance.lang = localeFor(responseLanguage || responseLanguageRef.current || lang);
      utterance.rate = 0.94;
      utterance.pitch = 1;
      const voices = window.speechSynthesis.getVoices();
      const languageRoot = utterance.lang.toLowerCase().split('-')[0];
      const preferred = voices.find(v => String(v.lang || '').toLowerCase().startsWith(languageRoot));
      if (preferred) utterance.voice = preferred;
      window.speechSynthesis.speak(utterance);
    } catch (speechError) {
      console.warn('Classtago device voice fallback unavailable:', speechError);
    }
  };

  const speak = async (text: string, responseLanguage?: string, purpose = 'assistant') => {
    if (!voiceReplies || !text.trim()) return;
    stopSpokenAudio();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No authenticated voice session.');
      const response = await fetch('/api/assistant/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ text, language: responseLanguage || responseLanguageRef.current || lang, purpose })
      });
      if (!response.ok) throw new Error('Natural voice endpoint unavailable.');
      const providerHeader = String(response.headers.get('X-EDUNIXO-Voice-Provider') || 'server').toLowerCase();
      setVoiceEngine(providerHeader === 'fish_audio' ? 'fish_audio' : providerHeader === 'gemini_tts' ? 'gemini_tts' : 'server');
      const blob = await response.blob();
      if (!blob.size) throw new Error('Natural voice returned empty audio.');
      const objectUrl = URL.createObjectURL(blob);
      const audio = new Audio(objectUrl);
      naturalAudioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(objectUrl);
        if (naturalAudioRef.current === audio) naturalAudioRef.current = null;
      };
      audio.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        if (naturalAudioRef.current === audio) naturalAudioRef.current = null;
        fallbackSpeak(text, responseLanguage);
      };
      await audio.play();
    } catch (speechError) {
      console.warn('Classtago Natural Voice unavailable; using device fallback:', speechError);
      fallbackSpeak(text, responseLanguage);
    }
  };

  const runPreparedAction = async (action: Extract<MessageAction, { type: 'confirm' }>, messageIndex: number, mode: 'confirm' | 'cancel') => {
    if (actionBusyId) return;
    setError('');
    setActionBusyId(action.actionId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Your secure login session is unavailable. Please sign in again.');
      const response = await fetch(`/api/assistant/actions/${encodeURIComponent(action.actionId)}/${mode}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Maria could not ${mode} this action safely.`);
      const answer = String(data.text || data?.result?.message || (mode === 'cancel' ? 'The prepared action was cancelled.' : 'The prepared action was processed.')).trim();
      const nextAction = parseClientAction(data?.clientAction);
      setMessages(previous => {
        const cleared = previous.map((message, index) => index === messageIndex ? { ...message, action: undefined } : message);
        return [...cleared, { role:'assistant' as const, content:answer, action:nextAction }];
      });
      void speak(answer, responseLanguageRef.current || String(lang || 'en'), 'assistant');
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Maria could not process the prepared action safely.');
    } finally {
      setActionBusyId('');
    }
  };

  const handleSend = async (textToSend?: string) => {
    const text = String(textToSend ?? input).trim();
    if (!text || loading) return;

    setError('');
    setInput('');
    const historyForServer = messages.slice(1).slice(-12);
    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Your secure login session is unavailable. Please sign in again.');

      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          message: text,
          language: lang,
          history: historyForServer
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'AI assistant could not answer this request.');
      const answer = String(data.text || '').trim() || 'I could not prepare a reliable answer for that request.';
      const responseLanguage = String(data?.voice?.responseLanguage || data?.voice?.requestedLanguage || lang || 'en');
      responseLanguageRef.current = responseLanguage;
      const dynamicAction = ['maria_mark_entry','maria_homework','maria_question_paper','maria_academic_generate','maria_attendance','maria_parent_portal'].includes(String(data?.clientAction?.type || '')) ? data.clientAction : null;
      if (dynamicAction) publishMariaDynamicCommand(dynamicAction);
      const parsedAction = dynamicAction ? undefined : parseClientAction(data?.clientAction);
      // Text Maria must execute an authorised navigation handoff immediately.
      // A navigation action is not a suggestion that needs a second button tap.
      if (parsedAction?.type === 'navigate') {
        requestMariaNavigation(parsedAction.moduleId, parsedAction.featureId);
      }
      const action = parsedAction?.type === 'navigate' ? undefined : parsedAction;
      setMessages([...newMessages, { role: 'assistant', content: answer, action }]);
      void speak(answer, responseLanguage, 'assistant');
      // Calls and sensitive writes remain explicit. Maria's dynamic academic handoffs only
      // drive the already-authorised on-screen module and reuse its existing validation/save flow.
    } catch (err: any) {
      console.error(err);
      setError(err?.message || t.aiError || 'An error occurred. Check server logs.');
    } finally {
      setLoading(false);
    }
  };

  const startListening = () => {
    if (loading) return;
    if (!speechRecognitionAvailable) {
      setError('Voice input is not supported by this browser/device yet. You can still type your question.');
      return;
    }
    try {
      if (listening) {
        recognitionRef.current?.stop?.();
        setListening(false);
        return;
      }
      setError('');
      const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new Recognition();
      recognition.lang = localeFor(lang);
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onstart = () => setListening(true);
      recognition.onend = () => setListening(false);
      recognition.onerror = (event: any) => {
        setListening(false);
        const code = String(event?.error || 'voice_error');
        setError(code === 'not-allowed'
          ? 'Microphone permission is blocked. Allow microphone access for Classtago and try again.'
          : 'I could not hear that clearly. Please try the microphone again or type your question.');
      };
      recognition.onresult = (event: any) => {
        const transcript = String(event?.results?.[0]?.[0]?.transcript || '').trim();
        if (transcript) {
          setInput(transcript);
          void handleSend(transcript);
        }
      };
      recognitionRef.current = recognition;
      recognition.start();
    } catch (voiceError) {
      console.warn('Classtago speech recognition unavailable:', voiceError);
      setListening(false);
      setError('Voice input could not start on this device. You can still type your question.');
    }
  };

  const clearConversation = () => {
    try { recognitionRef.current?.abort?.(); } catch {}
    stopSpokenAudio();
    setListening(false);
    setError('');
    setActionBusyId('');
    setMessages([{ role: 'assistant', content: mariaWelcome }]);
  };

  const suggestions: Record<string, string[]> = {
    en: [
      'Maria, what can you do in my current role?',
      'Maria, summarize my latest school work.',
      'Maria, open the feature I need for today.'
    ],
    hi: [
      'Maria, मेरी वर्तमान स्कूल भूमिका में आप क्या कर सकती हैं?',
      'Maria, मेरे आज के स्कूल काम का सार बताइए।',
      'Maria, मुझे मेरे जरूरी फीचर पर ले चलो।'
    ],
    ur: [
      'میری موجودہ اسکول ذمہ داری میں آپ میری کیا مدد کر سکتے ہیں؟',
      'میری تازہ اسکول اطلاعات کا خلاصہ بتائیں۔',
      'میں آواز کے ذریعے کون سی اسکول معلومات محفوظ طریقے سے پوچھ سکتا ہوں؟'
    ],
    mr: [
      'माझ्या सध्याच्या शाळेतील भूमिकेत तुम्ही मला कशी मदत करू शकता?',
      'माझ्या नवीन शाळेच्या सूचनांचा सारांश सांगा.',
      'मी आवाजाने कोणती शाळेची माहिती सुरक्षितपणे विचारू शकतो?'
    ]
  };

  const activeSuggests = suggestions[String(lang || '').toLowerCase()] || suggestions.en;

  return (
    <div className="flex flex-col h-[590px] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-cyan-50/60 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span className="truncate">Maria AI Assistant</span>
              <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse shrink-0" />
            </h3>
            <p className="text-[10px] text-slate-500 font-sans flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-emerald-600" /> Maria · Gemini Live · role-scoped ERP tools
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              setVoiceReplies(value => !value);
              if (voiceReplies) stopSpokenAudio();
            }}
            className="p-1.5 hover:bg-slate-200/70 rounded-md text-slate-500 transition-colors"
            title={voiceReplies ? 'Mute spoken replies' : 'Enable spoken replies'}
          >
            {voiceReplies ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={clearConversation}
            className="p-1.5 hover:bg-slate-200/70 rounded-md text-slate-500 transition-colors"
            title="Clear Chat"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <RealtimeVoiceAssistant lang={lang} />

      <div className="px-4 pt-3 pb-1 border-t border-slate-100 bg-white">
        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Text chat with Maria</p>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/30">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          const contentLang: Language = /[\u0600-\u06ff]/.test(msg.content)
            ? 'ur'
            : /[\u0900-\u097f]/.test(msg.content)
              ? (lang === 'mr' ? 'mr' : 'hi')
              : 'en';
          return (
            <div key={index} className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
              <div className={`p-1.5 rounded-lg shrink-0 ${isUser ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>
              <div className={`max-w-[82%] rounded-xl px-3.5 py-2.5 text-xs shadow-sm leading-relaxed ${
                isUser ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
              }`}>
                <UrduWrapper lang={contentLang} className={isUser ? 'text-white' : ''}>
                  <p className="whitespace-pre-line">{msg.content}</p>
                </UrduWrapper>
                {!isUser && msg.action?.type === 'dial' && (
                  <button
                    type="button"
                    onClick={() => { window.location.href = msg.action!.uri; }}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-emerald-700 active:scale-95 transition-all"
                  >
                    <span aria-hidden="true">☎</span> {msg.action.label}
                  </button>
                )}
                {!isUser && msg.action?.type === 'navigate' && (
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent('edunixo_smart_navigate', { detail: { moduleId: msg.action!.moduleId, featureId: msg.action!.featureId } }))}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-blue-700 active:scale-95 transition-all"
                  >
                    <span aria-hidden="true">↗</span> {msg.action.label}
                  </button>
                )}
                {!isUser && msg.action?.type === 'confirm' && (
                  <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-amber-950">
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold">{msg.action.title || 'Confirm Maria action'}</p>
                        {msg.action.summary && <p className="mt-1 text-[9px] leading-relaxed text-amber-900">{msg.action.summary}</p>}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={Boolean(actionBusyId)}
                        onClick={() => void runPreparedAction(msg.action as Extract<MessageAction, { type: 'confirm' }>, index, 'confirm')}
                        className="rounded-lg bg-amber-700 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-amber-800 disabled:opacity-50"
                      >
                        {actionBusyId === msg.action.actionId ? 'Processing…' : msg.action.label}
                      </button>
                      <button
                        type="button"
                        disabled={Boolean(actionBusyId)}
                        onClick={() => void runPreparedAction(msg.action as Extract<MessageAction, { type: 'confirm' }>, index, 'cancel')}
                        className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-[10px] font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {listening && (
          <div className="mx-auto w-fit rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-[10px] font-bold text-rose-700 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" /> Listening… speak naturally
          </div>
        )}
        {loading && (
          <div className="flex items-center gap-2 text-slate-400 text-[10px] pl-2">
            <Bot className="w-3.5 h-3.5 animate-bounce text-blue-500" />
            <span>Maria is checking your authorised school data…</span>
          </div>
        )}
        {error && (
          <div className="p-3 bg-red-50 border border-red-100 text-red-800 rounded-lg text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Maria</p>
              <p className="text-[10px] text-slate-600 mt-0.5">{error}</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {messages.length === 1 && (
        <div className="px-4 py-2 border-t border-slate-200 bg-slate-50/50">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Try asking</p>
          <div className="flex flex-wrap gap-1.5">
            {activeSuggests.map((prompt, index) => (
              <button
                key={index}
                type="button"
                onClick={() => void handleSend(prompt)}
                className="text-[10px] text-slate-600 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 rounded-full px-2.5 py-1 text-left cursor-pointer transition-all"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-3 border-t border-slate-200 bg-white">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={startListening}
            disabled={loading}
            className={`p-2.5 rounded-lg border transition-all active:scale-95 disabled:opacity-40 ${
              listening
                ? 'bg-rose-600 border-rose-600 text-white shadow-md'
                : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600'
            }`}
            title={speechRecognitionAvailable ? (listening ? 'Stop listening' : 'Speak your question') : 'Voice input not supported on this browser'}
          >
            {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <input
            type="text"
            placeholder={listening ? 'Listening…' : t.aiPlaceholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleSend()}
            disabled={loading || listening}
            className="flex-1 min-w-0 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={loading || listening || !input.trim()}
            className="p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 active:scale-95 transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className={`mt-2 text-center text-[9px] ${voiceEngine === 'device' ? 'text-amber-600 font-semibold' : 'text-slate-400'}`}>
          {voiceEngine === 'device'
            ? 'Device fallback is active — this temporary voice can sound robotic.'
            : voiceEngine === 'fish_audio'
              ? 'Human voice engine: Fish Audio.'
              : voiceEngine === 'gemini_tts'
                ? 'Human voice engine: Gemini warm teacher voice.'
                : 'Human voice replies use the warm server voice; device speech is fallback only.'}
        </p>
      </div>
    </div>
  );
}
