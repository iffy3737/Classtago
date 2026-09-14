import React from 'react';
import { AlertCircle, CheckCircle2, Cloud, Loader2, RefreshCw, WifiOff } from 'lucide-react';
import type { ErpAutosaveState } from '../hooks/useErpAutosaveQueue';

interface AutosaveStatusProps {
  state: ErpAutosaveState;
  onRetry?: () => void;
  compact?: boolean;
}

export default function AutosaveStatus({ state, onRetry, compact = false }: AutosaveStatusProps) {
  const time = state.lastSavedAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const config = {
    idle: { icon: Cloud, label: 'Auto-save ready', tone: 'text-slate-500 bg-slate-100 border-slate-200' },
    dirty: { icon: Cloud, label: 'Changes queued', tone: 'text-amber-700 bg-amber-50 border-amber-200' },
    saving: { icon: Loader2, label: 'Saving automatically…', tone: 'text-blue-700 bg-blue-50 border-blue-200' },
    saved: { icon: CheckCircle2, label: time ? `Saved at ${time}` : 'Saved automatically', tone: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    offline: { icon: WifiOff, label: 'Offline — waiting to sync', tone: 'text-amber-700 bg-amber-50 border-amber-200' },
    error: { icon: AlertCircle, label: state.error || 'Auto-save needs attention', tone: 'text-rose-700 bg-rose-50 border-rose-200' }
  }[state.phase];

  const Icon = config.icon;
  return (
    <div className={`inline-flex items-center gap-2 rounded-xl border ${compact ? 'px-2.5 py-1.5 text-[10px]' : 'px-3 py-2 text-xs'} font-black ${config.tone}`} role="status" aria-live="polite">
      <Icon className={`w-4 h-4 ${state.phase === 'saving' ? 'animate-spin' : ''}`} />
      <span>{config.label}</span>
      {(state.phase === 'error' || state.phase === 'offline') && onRetry && (
        <button type="button" onClick={onRetry} className="inline-flex items-center gap-1 underline underline-offset-2 cursor-pointer">
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      )}
    </div>
  );
}
