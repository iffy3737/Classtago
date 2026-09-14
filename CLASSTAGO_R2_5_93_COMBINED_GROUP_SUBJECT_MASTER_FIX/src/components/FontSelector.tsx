import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Loader2, Type } from 'lucide-react';
import { FontOption, FontUsage, ensureWebFontLoaded, fontCssStack } from '../lib/fontCatalog';

interface FontSelectorProps {
  value: string;
  options: FontOption[];
  onChange: (fontCode: string) => void;
  usage: FontUsage;
  loading?: boolean;
  compactIconOnly?: boolean;
  id?: string;
  label?: string;
}

export default function FontSelector({
  value,
  options,
  onChange,
  usage,
  loading = false,
  compactIconOnly = false,
  id = 'edunixo-font-selector',
  label = 'Font'
}: FontSelectorProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selected = useMemo(() => options.find(item => item.code === value) || options[0], [options, value]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    if (selected) ensureWebFontLoaded(selected);
  }, [selected?.code]);

  if (!compactIconOnly) {
    return (
      <label className="block" htmlFor={id}>
        <span className="mb-2 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">{label}</span>
        <div className="relative">
          {loading ? <Loader2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" /> : <Type className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />}
          <select
            id={id}
            value={selected?.code || ''}
            onChange={event => onChange(event.target.value)}
            disabled={loading || options.length === 0}
            className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-wait disabled:opacity-60"
            aria-label={`${label} for ${usage}`}
            style={selected ? { fontFamily: fontCssStack(selected) } : undefined}
          >
            {options.map(option => (
              <option key={option.code} value={option.code} style={{ fontFamily: fontCssStack(option) }}>
                {option.displayName}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
      </label>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        disabled={loading || options.length === 0}
        className="flex h-[34px] w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-wait disabled:opacity-60"
        title={selected ? `Interface font: ${selected.displayName}` : 'Choose interface font'}
        aria-label={selected ? `Choose interface font. Current font: ${selected.displayName}` : 'Choose interface font'}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl" role="listbox" aria-label="Interface fonts">
          <div className="border-b border-slate-100 px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Available fonts</div>
          <div className="max-h-72 overflow-y-auto p-1.5">
            {options.map(option => {
              const active = option.code === selected?.code;
              return (
                <button
                  type="button"
                  key={option.code}
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    ensureWebFontLoaded(option);
                    onChange(option.code);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition ${active ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'}`}
                >
                  <span className="text-sm" style={{ fontFamily: fontCssStack(option) }}>{option.displayName}</span>
                  {active && <Check className="h-4 w-4" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
