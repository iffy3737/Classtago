/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, ShieldAlert } from 'lucide-react';
import { Language, Notice } from '../types';
import PremiumSchoolPortal, { PremiumResolvedSchool } from './PremiumSchoolPortal';

interface SchoolPortalResolverProps {
  identifier: string;
  lang: Language;
  languages?: any[];
  languagesLoading?: boolean;
  onLangChange?: (selected: Language) => void;
  notices: Notice[];
  onOpenERP: () => void;
  onBackToPlatform: () => void;
  onResolvedSchool?: (school: PremiumResolvedSchool | null) => void;
}

export default function SchoolPortalResolver({
  identifier,
  onOpenERP,
  onBackToPlatform,
  onResolvedSchool
}: SchoolPortalResolverProps) {
  const [school, setSchool] = useState<PremiumResolvedSchool | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const resolveSchool = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/public/schools/${encodeURIComponent(identifier)}`);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'This school website could not be opened.');
        if (!cancelled) {
          const resolved = payload.school || null;
          setSchool(resolved);
          onResolvedSchool?.(resolved);
        }
      } catch (resolveError: any) {
        if (!cancelled) {
          setSchool(null);
          onResolvedSchool?.(null);
          setError(resolveError?.message || 'This school website could not be opened.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void resolveSchool();
    return () => { cancelled = true; };
  }, [identifier, onResolvedSchool]);

  if (loading) {
    return (
      <div className="flex min-h-[78vh] flex-col items-center justify-center bg-[#050816] p-8 text-center text-white">
        <div className="grid h-20 w-20 place-items-center rounded-[1.6rem] border border-white/10 bg-white/5 shadow-2xl">
          <Loader2 className="h-9 w-9 animate-spin text-cyan-300" />
        </div>
        <h2 className="mt-6 text-2xl font-black tracking-tight">Opening secure school experience…</h2>
        <p className="mt-3 max-w-lg text-sm leading-7 text-slate-400">Classtago is verifying the institution, active subscription and published website.</p>
      </div>
    );
  }

  if (error || !school) {
    return (
      <div className="flex min-h-[78vh] flex-col items-center justify-center bg-[#050816] p-8 text-center text-white">
        <div className="grid h-20 w-20 place-items-center rounded-[1.6rem] border border-rose-300/15 bg-rose-300/10 text-rose-300"><ShieldAlert className="h-9 w-9" /></div>
        <h2 className="mt-6 text-3xl font-black tracking-tight">School website unavailable</h2>
        <p className="mt-4 max-w-xl text-sm leading-7 text-slate-400">{error || 'This school does not have a published Classtago website.'}</p>
        <button onClick={onBackToPlatform} className="mt-8 flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-slate-950">
          <ArrowLeft className="h-4 w-4" /> Return to Classtago
        </button>
      </div>
    );
  }

  return <PremiumSchoolPortal school={school} onOpenERP={onOpenERP} onBackToPlatform={onBackToPlatform} />;
}
