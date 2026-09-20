/**
 * ModulesPreviewCard — clean Android-style list of top modules.
 * Reusable across all roles. Shows 4-5 modules with colored gradient icons,
 * chevron, "View all" link that opens the full RoleModuleMenu.
 */
import React from 'react';
import { ChevronRight, ArrowRight } from 'lucide-react';

export type ModulesPreviewItem = {
  id: string;
  label: string;
  subtitle: string;
  icon: React.ElementType;
  gradient: string;
  route: string;
  featureId?: string;
};

type Props = {
  items: ModulesPreviewItem[];
  onNavigate: (route: string, featureId?: string) => void;
  onViewAll?: () => void;
  title?: string;
};

export default function ModulesPreviewCard({ items, onNavigate, onViewAll, title = 'Modules' }: Props) {
  if (!items.length) return null;
  return (
    <section className="mt-5">
      <div className="mb-3 flex items-center justify-between px-1">
        <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
          {title}
        </h3>
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="inline-flex items-center gap-1 text-[11px] font-black text-[#E91E63] active:opacity-70"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {items.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.route, item.featureId)}
              className={`cs-module-row flex w-full items-center gap-4 p-4 text-left transition ${
                idx > 0 ? 'border-t border-slate-100' : ''
              }`}
            >
              <span
                className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white shadow-md"
                style={{ backgroundImage: item.gradient }}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-black text-slate-900 leading-tight">
                  {item.label}
                </span>
                <span className="mt-1 block text-[12.5px] font-medium text-slate-500 leading-tight">
                  {item.subtitle}
                </span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
            </button>
          );
        })}
      </div>
    </section>
  );
}
