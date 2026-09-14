import React from 'react';
import { ArrowRight, ChevronRight, Link2, ShieldCheck, Sparkles } from 'lucide-react';
import type { RoleModuleFeature, RoleVisibleModule } from '../lib/roleModuleBlueprint';

interface RoleModuleLandingProps {
  module: RoleVisibleModule;
  categoryLabel?: string;
  role: string;
  onOpenFeature: (feature: RoleModuleFeature) => void;
}

export default function RoleModuleLanding({ module, categoryLabel, role, onOpenFeature }: RoleModuleLandingProps) {
  return (
    <section className="edx-module-landing animate-fade-in overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 text-left text-white shadow-[0_28px_90px_rgba(2,6,23,.38)]">
      <div className="relative overflow-hidden border-b border-white/10 px-5 py-7 sm:px-8 sm:py-9">
        <div className="absolute -right-20 -top-28 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
              <Sparkles className="h-4 w-4" />
              <span>{categoryLabel || 'Role workspace'}</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[8px] text-slate-300">{role.replaceAll('_', ' ')}</span>
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">{module.label}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
              {module.description || 'Choose the exact feature you want to open. Other modules remain hidden so the workspace stays focused.'}
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.06] px-4 py-3 text-xs text-emerald-100">
            <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-300" />
            <span><strong>{module.features.length}</strong> focused features · role and plan checked</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 p-4 text-slate-900 sm:p-7">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {module.features.map((feature, index) => (
            <button
              key={feature.id}
              type="button"
              onClick={() => onOpenFeature(feature)}
              className="group flex min-h-28 items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-cyan-500/15"
            >
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${feature.shortcut ? 'bg-violet-100 text-violet-700' : 'bg-cyan-50 text-cyan-700'}`}>
                {feature.shortcut ? <Link2 className="h-5 w-5" /> : <span className="text-xs font-black">{String(index + 1).padStart(2, '0')}</span>}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-black leading-5 text-slate-900">{feature.label}</span>
                <span className="mt-2 block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  {feature.shortcut ? 'Opens canonical owner module' : 'Open focused workspace'}
                </span>
              </span>
              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-cyan-600" />
            </button>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-xs leading-6 text-cyan-950">
          <ArrowRight className="h-5 w-5 shrink-0 text-cyan-700" />
          <span>Selected module ke features yahan isolated hain. Feature kholne par uska canonical workflow focus me aayega aur unrelated ERP module navigation hidden rahegi.</span>
        </div>
      </div>
    </section>
  );
}
