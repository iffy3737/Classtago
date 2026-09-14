import React, { useEffect, useState } from 'react';
import { AlertTriangle, ShieldAlert, X } from 'lucide-react';
import {
  ACTION_CONFIRM_EVENT,
  ActionConfirmRequest,
  resolveActionConfirm,
} from '../lib/actionConfirm';

export default function GlobalActionConfirm() {
  const [request, setRequest] = useState<ActionConfirmRequest | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<ActionConfirmRequest>).detail;
      if (!detail?.message) return;
      setRequest(detail);
    };
    window.addEventListener(ACTION_CONFIRM_EVENT, handler as EventListener);
    return () => {
      window.removeEventListener(ACTION_CONFIRM_EVENT, handler as EventListener);
      resolveActionConfirm(false);
    };
  }, []);

  if (!request) return null;

  const danger = request.tone === 'danger';
  const close = (value: boolean) => {
    setRequest(null);
    resolveActionConfirm(value);
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm no-print"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edunixo-action-confirm-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close(false);
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-[0_30px_100px_rgba(15,23,42,.45)]">
        <div className={`flex items-start gap-3 border-b p-5 ${danger ? 'border-rose-100 bg-rose-50' : 'border-amber-100 bg-amber-50'}`}>
          <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${danger ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
            {danger ? <ShieldAlert className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <h3 id="edunixo-action-confirm-title" className="text-base font-black text-slate-900">
              {request.title || 'Confirm action'}
            </h3>
            <p className="mt-1 whitespace-pre-line text-xs font-medium leading-5 text-slate-600">
              {request.message}
            </p>
          </div>
          <button type="button" onClick={() => close(false)} className="rounded-xl p-2 text-slate-400 transition hover:bg-white hover:text-slate-700" aria-label="Cancel action">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-col-reverse gap-2 p-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => close(false)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50">
            {request.cancelLabel || 'Cancel'}
          </button>
          <button type="button" autoFocus onClick={() => close(true)} className={`rounded-xl px-4 py-2.5 text-xs font-black text-white shadow-sm transition ${danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-600 hover:bg-amber-700'}`}>
            {request.confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
