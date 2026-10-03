import React from 'react';
import { ArrowLeft, Layers3, ShieldCheck } from 'lucide-react';
import type { RoleModuleFeature, RoleVisibleModule } from '../lib/roleModuleBlueprint';

interface RoleFeatureContextHeaderProps {
  module: RoleVisibleModule;
  feature?: RoleModuleFeature | null;
  onBack: () => void;
  backLabel?: string;
}

export default function RoleFeatureContextHeader({ module, feature, onBack, backLabel = 'Module home' }: RoleFeatureContextHeaderProps) {
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
          <span
            style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.35)', color: '#a7f3d0' }}
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[10px] font-bold"
          >
            <ShieldCheck className="h-4 w-4" style={{ color: '#6ee7b7' }} /> Role and plan scoped
          </span>
          <button
            type="button"
            onClick={onBack}
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', borderColor: 'rgba(255, 255, 255, 0.18)', color: '#ffffff' }}
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[10px] font-black transition hover:opacity-90"
          >
            <ArrowLeft className="h-4 w-4" /> {backLabel}
          </button>
        </div>
      </div>
    </section>
  );
}
