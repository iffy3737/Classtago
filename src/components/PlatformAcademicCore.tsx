/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpenCheck,
  CheckCircle2,
  FileStack,
  Globe2,
  Languages,
  Loader2,
  MapPinned,
  RefreshCcw,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabase';

type CoreSection = 'overview' | 'boards' | 'rules' | 'templates' | 'languages';

type BoardFamily = {
  id: string;
  familyCode: string;
  familyName: string;
  requiresJurisdiction: boolean;
  description?: string | null;
  isActive: boolean;
  sortOrder: number;
};

type Jurisdiction = {
  id: string;
  code: string;
  name: string;
  type: 'state' | 'union_territory' | 'national';
  isActive: boolean;
  sortOrder: number;
};

type PlatformBoard = {
  id: string;
  familyId: string;
  jurisdictionId?: string | null;
  boardCode: string;
  boardName: string;
  authorityName?: string | null;
  isActive: boolean;
  sortOrder: number;
  rulesVerified: boolean;
  familyName: string;
  familyCode: string;
  jurisdictionName?: string | null;
  jurisdictionCode?: string | null;
};

type Ruleset = {
  id: string;
  boardId: string;
  versionCode: string;
  status: string;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  publishedAt?: string | null;
  sourceNotes?: string | null;
  updatedAt?: string | null;
  boardName: string;
  boardCode: string;
};

type TemplateRow = {
  id: string;
  boardId: string;
  rulesetId?: string | null;
  reportType: string;
  templateCode: string;
  templateName: string;
  classBand?: string | null;
  mediumCodes: string[];
  languageCodes: string[];
  status: string;
  isActive: boolean;
  boardName: string;
};

type LanguageRow = {
  id: string;
  languageCode: string;
  englishName: string;
  nativeName: string;
  scriptCode: string;
  textDirection: 'ltr' | 'rtl';
  isActive: boolean;
  sortOrder: number;
};

type FeatureLanguagePolicy = {
  id: string;
  featureKey: string;
  featureName: string;
  supportsInputLanguage: boolean;
  supportsOutputLanguage: boolean;
  supportsMultilingual: boolean;
  maxLanguagesPerDocument: number;
  defaultLanguageCode: string;
  isActive: boolean;
};

type CoreResponse = {
  summary: {
    families: number;
    jurisdictions: number;
    boards: number;
    verifiedBoards: number;
    publishedRulesets: number;
    templates: number;
    languages: number;
    featurePolicies: number;
    schoolProfiles: number;
  };
  families: BoardFamily[];
  jurisdictions: Jurisdiction[];
  boards: PlatformBoard[];
  rulesets: Ruleset[];
  templates: TemplateRow[];
  languages: LanguageRow[];
  featureLanguagePolicies: FeatureLanguagePolicy[];
};

type RulesetForm = {
  boardId: string;
  versionCode: string;
  status: 'draft' | 'review';
  effectiveFrom: string;
  sourceNotes: string;
  definition: string;
};

type TemplateForm = {
  boardId: string;
  rulesetId: string;
  reportType: string;
  templateCode: string;
  templateName: string;
  classBand: string;
  mediumCodes: string;
  languageCodes: string;
  definition: string;
};

const EMPTY_RULESET: RulesetForm = {
  boardId: '',
  versionCode: 'v1',
  status: 'draft',
  effectiveFrom: '',
  sourceNotes: '',
  definition: '{\n  "assessment": {},\n  "grading": {},\n  "promotion": {},\n  "attendance": {},\n  "documents": {}\n}'
};

const EMPTY_TEMPLATE: TemplateForm = {
  boardId: '',
  rulesetId: '',
  reportType: 'progress_card',
  templateCode: '',
  templateName: '',
  classBand: '',
  mediumCodes: '',
  languageCodes: '',
  definition: '{\n  "layout": {},\n  "fields": [],\n  "print": {}\n}'
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) throw new Error('Secure Platform Admin session unavailable. Please sign in again.');
  const response = await fetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers || {})
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Academic Core request failed (${response.status}).`);
  return body as T;
}

export default function PlatformAcademicCore() {
  const [section, setSection] = useState<CoreSection>('overview');
  const [data, setData] = useState<CoreResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [query, setQuery] = useState('');
  const [familyFilter, setFamilyFilter] = useState('all');
  const [jurisdictionFilter, setJurisdictionFilter] = useState('all');
  const [rulesetOpen, setRulesetOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [rulesetForm, setRulesetForm] = useState<RulesetForm>(EMPTY_RULESET);
  const [templateForm, setTemplateForm] = useState<TemplateForm>(EMPTY_TEMPLATE);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setData(await request<CoreResponse>('/api/platform/academic-core'));
    } catch (e: any) {
      setError(e?.message || 'Academic Core could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const boards = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.boards || []).filter(board => {
      if (familyFilter !== 'all' && board.familyId !== familyFilter) return false;
      if (jurisdictionFilter !== 'all' && board.jurisdictionId !== jurisdictionFilter) return false;
      if (!q) return true;
      return `${board.boardName} ${board.boardCode} ${board.familyName} ${board.jurisdictionName || ''}`.toLowerCase().includes(q);
    });
  }, [data, query, familyFilter, jurisdictionFilter]);

  const rulesets = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.rulesets || []).filter(row => !q || `${row.boardName} ${row.boardCode} ${row.versionCode} ${row.status}`.toLowerCase().includes(q));
  }, [data, query]);

  const templates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.templates || []).filter(row => !q || `${row.boardName} ${row.templateName} ${row.templateCode} ${row.reportType}`.toLowerCase().includes(q));
  }, [data, query]);

  const policies = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.featureLanguagePolicies || []).filter(row => !q || `${row.featureName} ${row.featureKey}`.toLowerCase().includes(q));
  }, [data, query]);

  const openRuleset = (boardId = '') => {
    setError(''); setSuccess('');
    setRulesetForm({ ...EMPTY_RULESET, boardId });
    setRulesetOpen(true);
  };

  const saveRuleset = async () => {
    if (!rulesetForm.boardId) return setError('Select a board.');
    if (!rulesetForm.versionCode.trim()) return setError('Enter a ruleset version.');
    let definition: any;
    try { definition = JSON.parse(rulesetForm.definition); } catch { return setError('Ruleset definition must be valid JSON.'); }
    setSaving(true); setError(''); setSuccess('');
    try {
      await request('/api/platform/academic-core/rulesets', {
        method: 'POST',
        body: JSON.stringify({ ...rulesetForm, definition })
      });
      setRulesetOpen(false);
      setSuccess('Ruleset saved safely as Draft/Review. Publishing remains a controlled verification step.');
      await load();
    } catch (e: any) { setError(e?.message || 'Ruleset could not be saved.'); }
    finally { setSaving(false); }
  };

  const publishRuleset = async (row: Ruleset) => {
    if (row.status !== 'review') return;
    if (!window.confirm(`Publish ${row.boardName} ruleset ${row.versionCode} as officially verified? This will become the active Platform Rules Pack for new school activation.`)) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      await request(`/api/platform/academic-core/rulesets/${row.id}/publish`, {
        method: 'POST',
        body: JSON.stringify({ confirmOfficialVerification: true })
      });
      setSuccess(`${row.boardName} ${row.versionCode} published as the verified active ruleset.`);
      await load();
    } catch (e: any) { setError(e?.message || 'Verified ruleset could not be published.'); }
    finally { setSaving(false); }
  };

  const openTemplate = (boardId = '') => {
    setError(''); setSuccess('');
    setTemplateForm({ ...EMPTY_TEMPLATE, boardId });
    setTemplateOpen(true);
  };

  const saveTemplate = async () => {
    if (!templateForm.boardId) return setError('Select a board.');
    if (!templateForm.templateName.trim() || !templateForm.templateCode.trim()) return setError('Enter template name and code.');
    let definition: any;
    try { definition = JSON.parse(templateForm.definition); } catch { return setError('Template definition must be valid JSON.'); }
    setSaving(true); setError(''); setSuccess('');
    try {
      await request('/api/platform/academic-core/templates', {
        method: 'POST',
        body: JSON.stringify({
          ...templateForm,
          rulesetId: templateForm.rulesetId || null,
          mediumCodes: splitCodes(templateForm.mediumCodes),
          languageCodes: splitCodes(templateForm.languageCodes),
          definition
        })
      });
      setTemplateOpen(false);
      setSuccess('Template added to the global Academic Template Library as Draft.');
      await load();
    } catch (e: any) { setError(e?.message || 'Template could not be saved.'); }
    finally { setSaving(false); }
  };

  const savePolicy = async (policy: FeatureLanguagePolicy) => {
    setSaving(true); setError(''); setSuccess('');
    try {
      await request('/api/platform/academic-core/language-policy', {
        method: 'POST',
        body: JSON.stringify(policy)
      });
      setSuccess(`${policy.featureName} language policy saved.`);
      await load();
    } catch (e: any) { setError(e?.message || 'Language policy could not be saved.'); }
    finally { setSaving(false); }
  };

  const updatePolicyLocal = (id: string, patch: Partial<FeatureLanguagePolicy>) => {
    setData(current => current ? ({
      ...current,
      featureLanguagePolicies: current.featureLanguagePolicies.map(row => row.id === id ? { ...row, ...patch } : row)
    }) : current);
  };

  const sections: Array<{ key: CoreSection; label: string; icon: React.ElementType }> = [
    { key: 'overview', label: 'Overview', icon: Sparkles },
    { key: 'boards', label: 'Boards & States', icon: MapPinned },
    { key: 'rules', label: 'Rules & Versions', icon: ShieldCheck },
    { key: 'templates', label: 'Template Library', icon: FileStack },
    { key: 'languages', label: 'Feature Languages', icon: Languages }
  ];

  if (loading && !data) return <div className="flex min-h-80 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;

  return <div className="space-y-5 p-4 sm:p-6">
    <div className="rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-indigo-600 p-3 text-white shadow-lg"><BookOpenCheck className="h-6 w-6" /></div>
          <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Platform Academic Core</p><h3 className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">India Board, Rules, Templates & Language Control</h3><p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">Global registry lives in Super Admin. School data remains isolated; a school only consumes its selected board/state rules and compatible templates.</p></div>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 text-xs font-black text-indigo-700 shadow-sm"><RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh Core</button>
      </div>
    </div>

    {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div>}
    {success && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{success}</div>}

    <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-2">
      {sections.map(item => { const Icon = item.icon; return <button key={item.key} type="button" onClick={() => { setSection(item.key); setQuery(''); }} className={`flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-black ${section === item.key ? 'bg-slate-950 text-white' : 'bg-white text-slate-600 hover:text-slate-950'}`}><Icon className="h-4 w-4" />{item.label}</button>; })}
    </div>

    {section === 'overview' && data && <Overview data={data} onBoards={() => setSection('boards')} onRules={() => setSection('rules')} onTemplates={() => setSection('templates')} onLanguages={() => setSection('languages')} />}

    {section !== 'overview' && <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div><h4 className="font-black text-slate-950">{sections.find(item => item.key === section)?.label}</h4><p className="mt-1 text-xs text-slate-500">Super Admin controlled Platform Academic Core data.</p></div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {section === 'rules' && <button type="button" onClick={() => openRuleset()} className={primaryButton}>+ Add Ruleset</button>}
          {section === 'templates' && <button type="button" onClick={() => openTemplate()} className={primaryButton}>+ Add Template</button>}
          <label className="relative block sm:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search…" className={`${inputClass} pl-9`} /></label>
        </div>
      </div>

      {section === 'boards' && data && <div>
        <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2">
          <select value={familyFilter} onChange={e => { setFamilyFilter(e.target.value); setJurisdictionFilter('all'); }} className={inputClass}><option value="all">All curriculum families</option>{data.families.map(row => <option key={row.id} value={row.id}>{row.familyName}</option>)}</select>
          <select value={jurisdictionFilter} onChange={e => setJurisdictionFilter(e.target.value)} className={inputClass}><option value="all">All States / UTs</option>{data.jurisdictions.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select>
        </div>
        <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><Head columns={['Board / Curriculum', 'Family', 'State / UT', 'Rules', 'Status', 'Action']} /><tbody className="divide-y divide-slate-100">{boards.map(row => <tr key={row.id}><td className="px-5 py-4"><p className="font-black text-slate-900">{row.boardName}</p><p className="font-mono text-[10px] text-slate-400">{row.boardCode}</p></td><td className="px-5 py-4 font-bold text-slate-600">{row.familyName}</td><td className="px-5 py-4 font-semibold text-slate-600">{row.jurisdictionName || 'National / International'}</td><td className="px-5 py-4">{row.rulesVerified ? <Badge value="Verified" good /> : <Badge value="Rules pending verification" />}</td><td className="px-5 py-4"><Badge value={row.isActive ? 'Active' : 'Inactive'} good={row.isActive} /></td><td className="px-5 py-4"><div className="flex gap-2"><button type="button" onClick={() => { setSection('rules'); openRuleset(row.id); }} className={smallButton}>Add rules</button><button type="button" onClick={() => { setSection('templates'); openTemplate(row.id); }} className={smallButton}>Add template</button></div></td></tr>)}{boards.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-sm font-bold text-slate-400">No board records match the filter.</td></tr>}</tbody></table></div>
      </div>}

      {section === 'rules' && <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><Head columns={['Board', 'Version', 'Status', 'Effective', 'Source / Verification', 'Updated', 'Action']} /><tbody className="divide-y divide-slate-100">{rulesets.map(row => <tr key={row.id}><td className="px-5 py-4"><p className="font-black">{row.boardName}</p><p className="font-mono text-[10px] text-slate-400">{row.boardCode}</p></td><td className="px-5 py-4 font-black">{row.versionCode}</td><td className="px-5 py-4"><Badge value={row.status} good={row.status === 'published'} /></td><td className="px-5 py-4 text-xs font-semibold">{row.effectiveFrom || 'Not set'}{row.effectiveTo ? ` → ${row.effectiveTo}` : ''}</td><td className="px-5 py-4 max-w-sm text-xs text-slate-600">{row.sourceNotes || 'No source notes yet.'}</td><td className="px-5 py-4 text-xs text-slate-500">{formatDate(row.updatedAt)}</td><td className="px-5 py-4">{row.status==='review'?<button type="button" disabled={saving} onClick={()=>void publishRuleset(row)} className={smallButton}>Publish verified</button>:<span className="text-[10px] font-bold text-slate-400">{row.status==='published'?'Active rules':'—'}</span>}</td></tr>)}{rulesets.length === 0 && <tr><td colSpan={7} className="px-5 py-12 text-center text-sm font-bold text-slate-400">No rulesets created yet. Add verified rules board-by-board.</td></tr>}</tbody></table></div>}

      {section === 'templates' && <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><Head columns={['Template', 'Board', 'Type', 'Class Band', 'Languages / Mediums', 'Status']} /><tbody className="divide-y divide-slate-100">{templates.map(row => <tr key={row.id}><td className="px-5 py-4"><p className="font-black">{row.templateName}</p><p className="font-mono text-[10px] text-slate-400">{row.templateCode}</p></td><td className="px-5 py-4 font-bold text-slate-600">{row.boardName}</td><td className="px-5 py-4 font-semibold capitalize">{row.reportType.replaceAll('_', ' ')}</td><td className="px-5 py-4 text-xs font-bold">{row.classBand || 'Any compatible class'}</td><td className="px-5 py-4 text-xs"><p><b>Lang:</b> {row.languageCodes.join(', ') || 'Any'}</p><p className="mt-1"><b>Medium:</b> {row.mediumCodes.join(', ') || 'Any'}</p></td><td className="px-5 py-4"><Badge value={row.status} good={row.status === 'published'} /></td></tr>)}{templates.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-sm font-bold text-slate-400">No global academic templates created yet.</td></tr>}</tbody></table></div>}

      {section === 'languages' && data && <div className="p-4 sm:p-5">
        <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-950"><b>{data.languages.length} active Indian language records</b> are available in the shared language catalogue. UI language, feature output language and user-entered text remain separate concerns.</div>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">{policies.map(policy => <div key={policy.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-slate-950">{policy.featureName}</p><p className="font-mono text-[10px] text-slate-400">{policy.featureKey}</p></div><Badge value={policy.isActive ? 'Active' : 'Inactive'} good={policy.isActive} /></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className={toggleClass}><input type="checkbox" checked={policy.supportsInputLanguage} onChange={e => updatePolicyLocal(policy.id, { supportsInputLanguage: e.target.checked })} />Input language</label><label className={toggleClass}><input type="checkbox" checked={policy.supportsOutputLanguage} onChange={e => updatePolicyLocal(policy.id, { supportsOutputLanguage: e.target.checked })} />Output language</label><label className={toggleClass}><input type="checkbox" checked={policy.supportsMultilingual} onChange={e => updatePolicyLocal(policy.id, { supportsMultilingual: e.target.checked })} />Mixed-language output</label><label className={toggleClass}><input type="checkbox" checked={policy.isActive} onChange={e => updatePolicyLocal(policy.id, { isActive: e.target.checked })} />Policy active</label><label><span className={labelClass}>Default language</span><select value={policy.defaultLanguageCode} onChange={e => updatePolicyLocal(policy.id, { defaultLanguageCode: e.target.value })} className={inputClass}>{data.languages.filter(l => l.isActive).map(lang => <option key={lang.languageCode} value={lang.languageCode}>{lang.englishName} — {lang.nativeName}</option>)}</select></label><label><span className={labelClass}>Max languages / document</span><input type="number" min={1} max={10} value={policy.maxLanguagesPerDocument} onChange={e => updatePolicyLocal(policy.id, { maxLanguagesPerDocument: Number(e.target.value) })} className={inputClass} /></label></div><button type="button" onClick={() => void savePolicy(policy)} disabled={saving} className={`${primaryButton} mt-4`}><Save className="h-4 w-4" />Save policy</button></div>)}</div>
      </div>}
    </div>}

    {rulesetOpen && data && <Modal title="Add Board Ruleset" subtitle="Create only Draft/Review rules here. Production publication should happen after official-rule verification." onClose={() => !saving && setRulesetOpen(false)}>
      <div className="grid gap-4 md:grid-cols-2"><Field label="Board"><select value={rulesetForm.boardId} onChange={e => setRulesetForm(v => ({ ...v, boardId: e.target.value }))} className={inputClass}><option value="">Select board</option>{data.boards.filter(b => b.isActive).map(b => <option key={b.id} value={b.id}>{b.boardName}</option>)}</select></Field><Field label="Version"><input value={rulesetForm.versionCode} onChange={e => setRulesetForm(v => ({ ...v, versionCode: e.target.value }))} className={inputClass} placeholder="2026-27-v1" /></Field><Field label="Workflow status"><select value={rulesetForm.status} onChange={e => setRulesetForm(v => ({ ...v, status: e.target.value as RulesetForm['status'] }))} className={inputClass}><option value="draft">Draft</option><option value="review">Review</option></select></Field><Field label="Effective from"><input type="date" value={rulesetForm.effectiveFrom} onChange={e => setRulesetForm(v => ({ ...v, effectiveFrom: e.target.value }))} className={inputClass} /></Field></div><Field label="Official source / verification notes"><textarea value={rulesetForm.sourceNotes} onChange={e => setRulesetForm(v => ({ ...v, sourceNotes: e.target.value }))} className={`${inputClass} mt-3 min-h-20`} /></Field><Field label="Rules definition (JSON)"><textarea spellCheck={false} value={rulesetForm.definition} onChange={e => setRulesetForm(v => ({ ...v, definition: e.target.value }))} className={`${inputClass} mt-3 min-h-72 font-mono text-xs`} /></Field><div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setRulesetOpen(false)} className={secondaryButton}>Cancel</button><button type="button" onClick={() => void saveRuleset()} disabled={saving} className={primaryButton}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save Ruleset</button></div>
    </Modal>}

    {templateOpen && data && <Modal title="Add Academic Template" subtitle="Templates remain board-compatible presentation layers; statutory calculations stay governed by the board ruleset." onClose={() => !saving && setTemplateOpen(false)}>
      <div className="grid gap-4 md:grid-cols-2"><Field label="Board"><select value={templateForm.boardId} onChange={e => setTemplateForm(v => ({ ...v, boardId: e.target.value, rulesetId: '' }))} className={inputClass}><option value="">Select board</option>{data.boards.filter(b => b.isActive).map(b => <option key={b.id} value={b.id}>{b.boardName}</option>)}</select></Field><Field label="Ruleset (optional)"><select value={templateForm.rulesetId} onChange={e => setTemplateForm(v => ({ ...v, rulesetId: e.target.value }))} className={inputClass}><option value="">Any compatible ruleset</option>{data.rulesets.filter(r => r.boardId === templateForm.boardId).map(r => <option key={r.id} value={r.id}>{r.versionCode} — {r.status}</option>)}</select></Field><Field label="Report type"><select value={templateForm.reportType} onChange={e => setTemplateForm(v => ({ ...v, reportType: e.target.value }))} className={inputClass}><option value="mark_list">Mark List</option><option value="result_book">Result Book</option><option value="progress_card">Progress Card</option><option value="catalogue">Catalogue</option><option value="certificate">Certificate</option><option value="question_paper">Question Paper</option><option value="other">Other</option></select></Field><Field label="Class band"><input value={templateForm.classBand} onChange={e => setTemplateForm(v => ({ ...v, classBand: e.target.value }))} className={inputClass} placeholder="1-4 / 5-8 / 9-10" /></Field><Field label="Template name"><input value={templateForm.templateName} onChange={e => setTemplateForm(v => ({ ...v, templateName: e.target.value }))} className={inputClass} /></Field><Field label="Template code"><input value={templateForm.templateCode} onChange={e => setTemplateForm(v => ({ ...v, templateCode: slugCode(e.target.value) }))} className={inputClass} placeholder="MH_UR_PROGRESS_1_4_V1" /></Field><Field label="Language codes"><input value={templateForm.languageCodes} onChange={e => setTemplateForm(v => ({ ...v, languageCodes: e.target.value }))} className={inputClass} placeholder="ur, mr, en" /></Field><Field label="Medium codes"><input value={templateForm.mediumCodes} onChange={e => setTemplateForm(v => ({ ...v, mediumCodes: e.target.value }))} className={inputClass} placeholder="ur, mr" /></Field></div><Field label="Template definition (JSON)"><textarea spellCheck={false} value={templateForm.definition} onChange={e => setTemplateForm(v => ({ ...v, definition: e.target.value }))} className={`${inputClass} mt-3 min-h-72 font-mono text-xs`} /></Field><div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setTemplateOpen(false)} className={secondaryButton}>Cancel</button><button type="button" onClick={() => void saveTemplate()} disabled={saving} className={primaryButton}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save Template</button></div>
    </Modal>}
  </div>;
}

function Overview({ data, onBoards, onRules, onTemplates, onLanguages }: { data: CoreResponse; onBoards: () => void; onRules: () => void; onTemplates: () => void; onLanguages: () => void }) {
  const cards = [
    { label: 'Curriculum families', value: data.summary.families, icon: Globe2, action: onBoards },
    { label: 'States / UTs', value: data.summary.jurisdictions, icon: MapPinned, action: onBoards },
    { label: 'Board routing entries', value: data.summary.boards, icon: BookOpenCheck, action: onBoards },
    { label: 'Verified board packs', value: data.summary.verifiedBoards, icon: CheckCircle2, action: onRules },
    { label: 'Published rulesets', value: data.summary.publishedRulesets, icon: ShieldCheck, action: onRules },
    { label: 'Global templates', value: data.summary.templates, icon: FileStack, action: onTemplates },
    { label: 'Language catalogue', value: data.summary.languages, icon: Languages, action: onLanguages },
    { label: 'Feature language policies', value: data.summary.featurePolicies, icon: SlidersHorizontal, action: onLanguages }
  ];
  return <div className="space-y-5"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{cards.map(card => { const Icon = card.icon; return <button key={card.label} type="button" onClick={card.action} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300"><div className="flex items-center justify-between"><span className="rounded-xl bg-slate-100 p-2 text-slate-700"><Icon className="h-4 w-4" /></span><span className="text-2xl font-black text-slate-950">{card.value}</span></div><p className="mt-3 text-xs font-black text-slate-600">{card.label}</p></button>; })}</div><div className="grid gap-4 lg:grid-cols-2"><div className="rounded-3xl border border-amber-200 bg-amber-50 p-5"><p className="font-black text-amber-950">Safe activation rule</p><p className="mt-2 text-sm leading-relaxed text-amber-900">State/Board routing entries are not academic truth by themselves. A board becomes enforceable only after a verified, versioned ruleset is reviewed and published.</p></div><div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5"><p className="font-black text-emerald-950">School isolation rule</p><p className="mt-2 text-sm leading-relaxed text-emerald-900">Each school and every future tenant keep separate school configuration. Global Academic Core data does not overwrite existing school operational records.</p></div></div></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className={labelClass}>{label}</span>{children}</label>; }
function Head({ columns }: { columns: string[] }) { return <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500"><tr>{columns.map(c => <th key={c} className="px-5 py-3">{c}</th>)}</tr></thead>; }
function Badge({ value, good = false }: { value: string; good?: boolean }) { return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ${good ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{value}</span>; }
function Modal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) { return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm"><div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl"><div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white/95 p-5 backdrop-blur"><div><h3 className="text-xl font-black text-slate-950">{title}</h3><p className="mt-1 text-xs leading-relaxed text-slate-500">{subtitle}</p></div><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 p-2 text-slate-500"><X className="h-5 w-5" /></button></div><div className="p-5 sm:p-6">{children}</div></div></div>; }
function splitCodes(value: string): string[] { return Array.from(new Set(value.split(',').map(item => item.trim().toLowerCase()).filter(Boolean))); }
function slugCode(value: string): string { return value.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, ''); }
function formatDate(value?: string | null): string { if (!value) return '—'; const d = new Date(value); return Number.isNaN(d.getTime()) ? value : d.toLocaleString('en-IN'); }

const inputClass = 'min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100';
const labelClass = 'mb-1.5 block text-xs font-black text-slate-700';
const primaryButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50';
const secondaryButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700';
const smallButton = 'inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-black text-slate-700 hover:border-indigo-300 hover:text-indigo-700';
const toggleClass = 'flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-700';
