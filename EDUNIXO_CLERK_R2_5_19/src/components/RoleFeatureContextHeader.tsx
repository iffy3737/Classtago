import React from 'react';
import { ArrowLeft, Layers3, ShieldCheck } from 'lucide-react';
import type { RoleModuleFeature, RoleVisibleModule } from '../lib/roleModuleBlueprint';

interface RoleFeatureContextHeaderProps {
  module: RoleVisibleModule;
  feature?: RoleModuleFeature | null;
  onBack: () => void;
}

export default function RoleFeatureContextHeader({ module, feature, onBack }: RoleFeatureContextHeaderProps) {
  return (
    <section className="edx-role-feature-context no-print overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950 text-left text-white shadow-[0_22px_70px_rgba(2,6,23,.3)]">
      <div className="relative flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative flex min-w-0 items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-cyan-300/15 bg-cyan-300/10 text-cyan-300">
            <Layers3 className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-300">Focused module shortcut</p>
            <h2 className="mt-1 truncate text-lg font-black sm:text-xl">{module.label}</h2>
            <p className="mt-1 text-xs leading-5 text-slate-400">{feature?.label || module.description || 'Selected module workflow'}</p>
          </div>
        </div>
        <div className="relative flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.06] px-3 py-2 text-[10px] font-bold text-emerald-100">
            <ShieldCheck className="h-4 w-4 text-emerald-300" /> Role and plan scoped
          </span>
          <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-black text-white transition hover:border-cyan-300/30 hover:bg-white/10">
            <ArrowLeft className="h-4 w-4" /> Module home
          </button>
        </div>
      </div>
    </section>
  );
}
