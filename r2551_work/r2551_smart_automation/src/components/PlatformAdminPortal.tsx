/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Building2,
  Boxes,
  CalendarClock,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Edit3,
  Layers3,
  Loader2,
  PackageCheck,
  Plus,
  RefreshCcw,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound,
  X,
  Eye,
  ShieldAlert,
  PauseCircle,
  PlayCircle,
  ArrowRight,
  Crown,
  Megaphone,
  Sparkles,
  WandSparkles
} from 'lucide-react';
import { Language, User } from '../types';
import { supabase } from '../lib/supabase';

type PlatformTab = 'dashboard' | 'schools' | 'modules' | 'plans' | 'subscriptions';

type OverviewResponse = {
  admin: { displayName: string; adminLevel: string; email: string };
  counts: {
    totalSchools: number;
    activeSchools: number;
    totalModules: number;
    productionModules: number;
    totalPlans: number;
    publishedPlans: number;
    activeSubscriptions: number;
    pendingAddonRequests: number;
  };
  generatedAt: string;
};

type SchoolRow = {
  id: string;
  schoolCode: string;
  schoolName: string;
  status: string;
  isActive: boolean;
  createdAt?: string | null;
  membershipCount: number;
  subscriptionCount: number;
  currentSubscriptionStatus?: string | null;
};

type ModuleRow = {
  id: string;
  moduleKey: string;
  moduleName: string;
  description?: string | null;
  category: string;
  status: string;
  version: string;
  isPlatformRequired: boolean;
  isActive: boolean;
  featureCount: number;
  dependencyCount: number;
};

type PlanRow = {
  id: string;
  planKey: string;
  planName: string;
  description?: string | null;
  status: string;
  billingCycle: string;
  currency: string;
  basePrice: number;
  trialDays: number;
  moduleCount: number;
  limitCount: number;
  isCustom: boolean;
  isActive: boolean;
};

type PlanDetail = PlanRow & {
  moduleIds: string[];
  limits: Array<{ limitKey: string; limitValue: number; unit: string; isSoftLimit: boolean }>;
};

type SubscriptionRow = {
  id: string;
  schoolId: string;
  schoolCode: string;
  schoolName: string;
  planId: string;
  planName: string;
  status: string;
  startsAt: string;
  endsAt?: string | null;
  trialEndsAt?: string | null;
  autoRenew: boolean;
  currency: string;
  agreedPrice?: number | null;
  billingNotes?: string | null;
  entitlementCount?: number;
};

type AccessSummary = {
  school: SchoolRow;
  subscriptionContext: {
    enforced: boolean;
    access_state: 'active' | 'grace' | 'restricted';
    restriction_reason?: string | null;
    subscription?: {
      id: string;
      plan_id: string;
      plan_name?: string | null;
      plan_key?: string | null;
      status: string;
      starts_at?: string | null;
      trial_ends_at?: string | null;
      ends_at?: string | null;
      auto_renew?: boolean;
    } | null;
  } | null;
  subscriptions: Array<{
    id: string;
    status: string;
    startsAt?: string | null;
    trialEndsAt?: string | null;
    endsAt?: string | null;
    planId: string;
    planName?: string | null;
    planKey?: string | null;
    isCurrent: boolean;
  }>;
  entitlements: Array<{
    moduleId: string;
    moduleKey: string;
    moduleName: string;
    category: string;
    moduleStatus: string;
    isActive: boolean;
    effective: boolean;
    blocked: boolean;
    sources: string[];
    entitlementRowCount: number;
  }>;
  effectiveEntitlementCount: number;
  rolePermissionSummary: Array<{ role: string; total: number; allowed: number; denied: number }>;
  recentDenials: Array<{
    id: string;
    userId?: string | null;
    severity: string;
    eventKey: string;
    summary: string;
    details?: Record<string, any>;
    source?: string | null;
    occurredAt: string;
    resolvedAt?: string | null;
  }>;
};

type PlanForm = {
  id: string | null;
  planKey: string;
  planName: string;
  description: string;
  status: 'draft' | 'published' | 'archived';
  billingCycle: 'monthly' | 'quarterly' | 'annual' | 'custom';
  currency: string;
  basePrice: string;
  trialDays: string;
  isCustom: boolean;
  isActive: boolean;
  moduleIds: string[];
  studentLimit: string;
  staffLimit: string;
  storageLimit: string;
};

type SubscriptionForm = {
  id: string | null;
  schoolId: string;
  planId: string;
  status: 'draft' | 'trialing' | 'active' | 'past_due' | 'suspended' | 'cancelled' | 'expired';
  startsAt: string;
  trialEndsAt: string;
  endsAt: string;
  autoRenew: boolean;
  currency: string;
  agreedPrice: string;
  billingNotes: string;
};

interface PlatformAdminPortalProps {
  lang: Language;
  user: User;
}

const COPY: Record<Language, Record<string, string>> = {
  en: {
    title: 'Platform Control Center',
    subtitle: 'Manage schools, plans, modules and subscriptions from one clean workspace.',
    dashboard: 'Dashboard', schools: 'Schools', modules: 'Modules', plans: 'Plans', subscriptions: 'Subscriptions',
    refresh: 'Refresh', search: 'Search', mode: 'Management mode',
    modeNote: 'Plan Builder and controlled school subscription assignment are active. Required modules and dependencies are added automatically.',
    noData: 'No records found.', totalSchools: 'Total Schools', activeSchools: 'Active Schools', totalModules: 'Main Modules',
    activeSubscriptions: 'Active Subscriptions', publishedPlans: 'Published Plans', pendingAddons: 'Pending Add-ons',
    platformHealth: 'Platform foundation status', platformReady: 'Super Admin identity, RLS, plans, subscriptions and entitlement controls are active.',
    currentAdmin: 'Current platform owner', generated: 'Last refreshed'
  },
  hi: {
    title: 'प्लेटफ़ॉर्म कंट्रोल सेंटर',
    subtitle: 'एक साफ़ कार्यक्षेत्र से स्कूल, प्लान, मॉड्यूल और सब्सक्रिप्शन संभालें।',
    dashboard: 'डैशबोर्ड', schools: 'स्कूल', modules: 'मॉड्यूल', plans: 'प्लान', subscriptions: 'सब्सक्रिप्शन',
    refresh: 'रिफ्रेश', search: 'खोजें', mode: 'मैनेजमेंट मोड',
    modeNote: 'Plan Builder और नियंत्रित school subscription assignment सक्रिय हैं। Required modules और dependencies अपने-आप जुड़ते हैं।',
    noData: 'कोई रिकॉर्ड नहीं मिला।', totalSchools: 'कुल स्कूल', activeSchools: 'सक्रिय स्कूल', totalModules: 'मुख्य मॉड्यूल',
    activeSubscriptions: 'सक्रिय सब्सक्रिप्शन', publishedPlans: 'प्रकाशित प्लान', pendingAddons: 'लंबित ऐड-ऑन',
    platformHealth: 'प्लेटफ़ॉर्म फाउंडेशन स्थिति', platformReady: 'Super Admin, RLS, plans, subscriptions और entitlement controls सक्रिय हैं।',
    currentAdmin: 'वर्तमान प्लेटफ़ॉर्म मालिक', generated: 'अंतिम रिफ्रेश'
  },
  ur: {
    title: 'پلیٹ فارم کنٹرول سینٹر',
    subtitle: 'ایک صاف ورک اسپیس سے اسکول، پلان، ماڈیول اور سبسکرپشن سنبھالیں۔',
    dashboard: 'ڈیش بورڈ', schools: 'اسکول', modules: 'ماڈیول', plans: 'پلان', subscriptions: 'سبسکرپشن',
    refresh: 'ریفریش', search: 'تلاش', mode: 'مینجمنٹ موڈ',
    modeNote: 'پلان بلڈر اور کنٹرولڈ اسکول سبسکرپشن فعال ہیں۔ ضروری ماڈیول اور dependencies خودکار شامل ہوتے ہیں۔',
    noData: 'کوئی ریکارڈ نہیں ملا۔', totalSchools: 'کل اسکول', activeSchools: 'فعال اسکول', totalModules: 'بنیادی ماڈیول',
    activeSubscriptions: 'فعال سبسکرپشن', publishedPlans: 'شائع شدہ پلان', pendingAddons: 'زیر التوا ایڈ آن',
    platformHealth: 'پلیٹ فارم فاؤنڈیشن کی حالت', platformReady: 'Super Admin، RLS، plans، subscriptions اور entitlement controls فعال ہیں۔',
    currentAdmin: 'موجودہ پلیٹ فارم مالک', generated: 'آخری ریفریش'
  }
};

const EMPTY_PLAN: PlanForm = {
  id: null, planKey: '', planName: '', description: '', status: 'draft', billingCycle: 'annual', currency: 'INR',
  basePrice: '0', trialDays: '0', isCustom: false, isActive: true, moduleIds: [], studentLimit: '', staffLimit: '', storageLimit: ''
};

const EMPTY_SUBSCRIPTION: SubscriptionForm = {
  id: null, schoolId: '', planId: '', status: 'active', startsAt: todayInput(), trialEndsAt: '', endsAt: oneYearFromTodayInput(),
  autoRenew: false, currency: 'INR', agreedPrice: '', billingNotes: ''
};

function todayInput(): string {
  return new Date().toISOString().slice(0, 10);
}

function oneYearFromTodayInput(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

function dateInput(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function dateToIso(value: string): string | null {
  return value ? `${value}T00:00:00.000Z` : null;
}

function slugPlanKey(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/^[^a-z]+/, '');
}

function statusClasses(status: string): string {
  const normalized = status.toLowerCase();
  if (['active', 'production', 'published', 'trialing'].includes(normalized)) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (['beta', 'past_due', 'draft'].includes(normalized)) return 'bg-amber-50 text-amber-700 border-amber-200';
  if (['suspended', 'disabled', 'expired', 'cancelled', 'archived', 'blocked', 'locked', 'none'].includes(normalized)) return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-slate-50 text-slate-600 border-slate-200';
}

function StatusBadge({ value }: { value: string }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${statusClasses(value)}`}>{value.replaceAll('_', ' ')}</span>;
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function formatMoney(value: number | null | undefined, currency = 'INR'): string {
  if (value === null || value === undefined) return '—';
  try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value); }
  catch { return `${currency} ${value}`; }
}

async function platformRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) throw new Error('Your secure session is unavailable. Please sign in again.');
  const response = await fetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers || {})
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Platform request failed (${response.status}).`);
  return body as T;
}

export default function PlatformAdminPortal({ lang, user }: PlatformAdminPortalProps) {
  const c = COPY[lang] || COPY.en;
  const [tab, setTab] = useState<PlatformTab>('dashboard');
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [query, setQuery] = useState('');
  const [planEditorOpen, setPlanEditorOpen] = useState(false);
  const [subscriptionEditorOpen, setSubscriptionEditorOpen] = useState(false);
  const [accessSummaryOpen, setAccessSummaryOpen] = useState(false);
  const [accessSummaryLoading, setAccessSummaryLoading] = useState(false);
  const [accessSummary, setAccessSummary] = useState<AccessSummary | null>(null);
  const [statusActionReason, setStatusActionReason] = useState('');
  const [planForm, setPlanForm] = useState<PlanForm>(EMPTY_PLAN);
  const [subscriptionForm, setSubscriptionForm] = useState<SubscriptionForm>(EMPTY_SUBSCRIPTION);
  const [saving, setSaving] = useState(false);

  const loadTab = useCallback(async (targetTab: PlatformTab, forceOverview = false) => {
    setLoading(true);
    setError('');
    try {
      if (targetTab === 'dashboard') {
        const [overviewResult, planResult, subscriptionResult, schoolResult] = await Promise.all([
          platformRequest<OverviewResponse>('/api/platform/overview'),
          platformRequest<{ plans: PlanRow[] }>('/api/platform/plans'),
          platformRequest<{ subscriptions: SubscriptionRow[] }>('/api/platform/subscriptions'),
          platformRequest<{ schools: SchoolRow[] }>('/api/platform/schools')
        ]);
        setOverview(overviewResult);
        setPlans(planResult.plans);
        setSubscriptions(subscriptionResult.subscriptions);
        setSchools(schoolResult.schools);
      } else if (forceOverview || !overview) {
        setOverview(await platformRequest<OverviewResponse>('/api/platform/overview'));
      }
      if (targetTab === 'schools') {
        const [schoolResult, planResult] = await Promise.all([
          platformRequest<{ schools: SchoolRow[] }>('/api/platform/schools'),
          platformRequest<{ plans: PlanRow[] }>('/api/platform/plans')
        ]);
        setSchools(schoolResult.schools);
        setPlans(planResult.plans);
      }
      if (targetTab === 'modules') setModules((await platformRequest<{ modules: ModuleRow[] }>('/api/platform/modules')).modules);
      if (targetTab === 'plans') {
        const [planResult, moduleResult] = await Promise.all([
          platformRequest<{ plans: PlanRow[] }>('/api/platform/plans'),
          platformRequest<{ modules: ModuleRow[] }>('/api/platform/modules')
        ]);
        setPlans(planResult.plans);
        setModules(moduleResult.modules);
      }
      if (targetTab === 'subscriptions') {
        const [subscriptionResult, planResult, schoolResult] = await Promise.all([
          platformRequest<{ subscriptions: SubscriptionRow[] }>('/api/platform/subscriptions'),
          platformRequest<{ plans: PlanRow[] }>('/api/platform/plans'),
          platformRequest<{ schools: SchoolRow[] }>('/api/platform/schools')
        ]);
        setSubscriptions(subscriptionResult.subscriptions);
        setPlans(planResult.plans);
        setSchools(schoolResult.schools);
      }
    } catch (requestError: any) {
      setError(requestError?.message || 'Platform data could not be loaded.');
    } finally { setLoading(false); }
  }, [overview]);

  const loadBuilderData = useCallback(async () => {
    const [schoolResult, moduleResult, planResult, subscriptionResult] = await Promise.all([
      platformRequest<{ schools: SchoolRow[] }>('/api/platform/schools'),
      platformRequest<{ modules: ModuleRow[] }>('/api/platform/modules'),
      platformRequest<{ plans: PlanRow[] }>('/api/platform/plans'),
      platformRequest<{ subscriptions: SubscriptionRow[] }>('/api/platform/subscriptions')
    ]);
    setSchools(schoolResult.schools);
    setModules(moduleResult.modules);
    setPlans(planResult.plans);
    setSubscriptions(subscriptionResult.subscriptions);
    return {
      schools: schoolResult.schools,
      modules: moduleResult.modules,
      plans: planResult.plans,
      subscriptions: subscriptionResult.subscriptions
    };
  }, []);

  useEffect(() => { void loadTab(tab); }, [tab]);

  const filteredSchools = useMemo(() => filterRows<SchoolRow>(schools, query, (row: SchoolRow) => `${row.schoolName} ${row.schoolCode} ${row.status}`), [schools, query]);
  const filteredModules = useMemo(() => filterRows<ModuleRow>(modules, query, (row: ModuleRow) => `${row.moduleName} ${row.moduleKey} ${row.category} ${row.status}`), [modules, query]);
  const filteredPlans = useMemo(() => filterRows<PlanRow>(plans, query, (row: PlanRow) => `${row.planName} ${row.planKey} ${row.status}`), [plans, query]);
  const filteredSubscriptions = useMemo(() => filterRows<SubscriptionRow>(subscriptions, query, (row: SubscriptionRow) => `${row.schoolName} ${row.schoolCode} ${row.planName} ${row.status}`), [subscriptions, query]);
  const publishedPlans = useMemo(() => plans.filter(plan => plan.status === 'published' && plan.isActive), [plans]);
  const moduleGroups = useMemo(() => {
    const grouped = new Map<string, ModuleRow[]>();
    modules.filter(module => module.isActive && !['disabled', 'deprecated'].includes(module.status)).forEach(module => {
      const rows = grouped.get(module.category) || [];
      rows.push(module);
      grouped.set(module.category, rows);
    });
    return Array.from(grouped.entries());
  }, [modules]);

  const tabs: Array<{ key: PlatformTab; label: string; icon: React.ElementType }> = [
    { key: 'dashboard', label: c.dashboard, icon: Activity },
    { key: 'schools', label: c.schools, icon: Building2 },
    { key: 'modules', label: c.modules, icon: Boxes },
    { key: 'plans', label: c.plans, icon: Layers3 },
    { key: 'subscriptions', label: c.subscriptions, icon: CalendarClock }
  ];

  const openNewPlan = async () => {
    setError(''); setSuccess('');
    try {
      const builderData = await loadBuilderData();
      const requiredIds = builderData.modules.filter(item => item.isPlatformRequired).map(item => item.id);
      setPlanForm({ ...EMPTY_PLAN, moduleIds: requiredIds });
      setPlanEditorOpen(true);
    } catch (requestError: any) {
      setError(requestError?.message || 'Plan Builder data could not be loaded.');
    }
  };

  const openEditPlan = async (planId: string) => {
    setError(''); setSuccess(''); setLoading(true);
    try {
      await loadBuilderData();
      const result = await platformRequest<{ plan: PlanDetail }>(`/api/platform/plans/${planId}`);
      const limits = new Map(result.plan.limits.map(item => [item.limitKey, String(item.limitValue)]));
      setPlanForm({
        id: result.plan.id,
        planKey: result.plan.planKey,
        planName: result.plan.planName,
        description: result.plan.description || '',
        status: result.plan.status as PlanForm['status'],
        billingCycle: result.plan.billingCycle as PlanForm['billingCycle'],
        currency: result.plan.currency,
        basePrice: String(result.plan.basePrice),
        trialDays: String(result.plan.trialDays),
        isCustom: result.plan.isCustom,
        isActive: result.plan.isActive,
        moduleIds: result.plan.moduleIds,
        studentLimit: limits.get('student_limit') || '',
        staffLimit: limits.get('staff_limit') || '',
        storageLimit: limits.get('storage_gb') || ''
      });
      setPlanEditorOpen(true);
    } catch (requestError: any) { setError(requestError?.message || 'Plan could not be opened.'); }
    finally { setLoading(false); }
  };

  const savePlan = async () => {
    if (!planForm.planName.trim()) return setError('Enter a plan name.');
    if (!/^[a-z][a-z0-9_]*$/.test(planForm.planKey)) return setError('Plan key must use lowercase letters, numbers and underscores.');
    setSaving(true); setError(''); setSuccess('');
    try {
      const limits = [
        { limitKey: 'student_limit', limitValue: planForm.studentLimit, unit: 'students' },
        { limitKey: 'staff_limit', limitValue: planForm.staffLimit, unit: 'staff' },
        { limitKey: 'storage_gb', limitValue: planForm.storageLimit, unit: 'GB' }
      ].filter(item => item.limitValue !== '').map(item => ({ ...item, limitValue: Number(item.limitValue), isSoftLimit: false }));
      await platformRequest('/api/platform/plans', {
        method: 'POST',
        body: JSON.stringify({ ...planForm, basePrice: Number(planForm.basePrice || 0), trialDays: Number(planForm.trialDays || 0), limits })
      });
      setPlanEditorOpen(false);
      setSuccess(planForm.id ? 'Plan updated successfully. Existing subscriptions were synchronised automatically.' : 'Plan created successfully.');
      await Promise.all([loadBuilderData(), loadTab('plans', true)]);
    } catch (requestError: any) { setError(requestError?.message || 'Plan could not be saved.'); }
    finally { setSaving(false); }
  };

  const openNewSubscription = async (schoolId = '') => {
    setError(''); setSuccess('');
    try {
      const builderData = await loadBuilderData();
      const availablePlans = builderData.plans.filter(item => item.status === 'published' && item.isActive);
      const plan = availablePlans[0];
      const selectedSchool = schoolId || builderData.schools[0]?.id || '';
      setSubscriptionForm({
        ...EMPTY_SUBSCRIPTION,
        schoolId: selectedSchool,
        planId: plan?.id || '',
        currency: plan?.currency || 'INR',
        agreedPrice: plan ? String(plan.basePrice) : ''
      });
      setSubscriptionEditorOpen(true);
    } catch (requestError: any) {
      setError(requestError?.message || 'Subscription data could not be loaded.');
    }
  };

  const openEditSubscription = async (row: SubscriptionRow) => {
    setError(''); setSuccess('');
    await loadBuilderData();
    setSubscriptionForm({
      id: row.id,
      schoolId: row.schoolId,
      planId: row.planId,
      status: row.status as SubscriptionForm['status'],
      startsAt: dateInput(row.startsAt),
      trialEndsAt: dateInput(row.trialEndsAt),
      endsAt: dateInput(row.endsAt),
      autoRenew: row.autoRenew,
      currency: row.currency,
      agreedPrice: row.agreedPrice === null || row.agreedPrice === undefined ? '' : String(row.agreedPrice),
      billingNotes: row.billingNotes || ''
    });
    setSubscriptionEditorOpen(true);
  };

  const selectSubscriptionPlan = (planId: string) => {
    const plan = plans.find(item => item.id === planId);
    const next = { ...subscriptionForm, planId };
    if (plan) {
      next.currency = plan.currency;
      next.agreedPrice = String(plan.basePrice);
      const start = new Date(`${next.startsAt || todayInput()}T00:00:00Z`);
      if (plan.billingCycle === 'monthly') start.setMonth(start.getMonth() + 1);
      else if (plan.billingCycle === 'quarterly') start.setMonth(start.getMonth() + 3);
      else if (plan.billingCycle === 'annual') start.setFullYear(start.getFullYear() + 1);
      else next.endsAt = '';
      if (plan.billingCycle !== 'custom') next.endsAt = start.toISOString().slice(0, 10);
      if (next.status === 'trialing' && plan.trialDays > 0) {
        const trial = new Date(`${next.startsAt || todayInput()}T00:00:00Z`);
        trial.setDate(trial.getDate() + plan.trialDays);
        next.trialEndsAt = trial.toISOString().slice(0, 10);
      }
    }
    setSubscriptionForm(next);
  };

  const saveSubscription = async () => {
    if (!subscriptionForm.schoolId) return setError('Select a school.');
    if (!subscriptionForm.planId) return setError('Select a published plan.');
    if (!subscriptionForm.startsAt) return setError('Select a start date.');
    setSaving(true); setError(''); setSuccess('');
    try {
      await platformRequest('/api/platform/subscriptions', {
        method: 'POST',
        body: JSON.stringify({
          ...subscriptionForm,
          startsAt: dateToIso(subscriptionForm.startsAt),
          trialEndsAt: dateToIso(subscriptionForm.trialEndsAt),
          endsAt: dateToIso(subscriptionForm.endsAt),
          agreedPrice: subscriptionForm.agreedPrice === '' ? null : Number(subscriptionForm.agreedPrice)
        })
      });
      setSubscriptionEditorOpen(false);
      setSuccess(subscriptionForm.id
        ? 'Subscription updated and module entitlements synchronised.'
        : 'Plan assigned successfully. The school module entitlements are now active.');
      await Promise.all([loadBuilderData(), loadTab('subscriptions', true)]);
    } catch (requestError: any) { setError(requestError?.message || 'Subscription could not be saved.'); }
    finally { setSaving(false); }
  };

  const openAccessSummary = async (schoolId: string) => {
    setError('');
    setSuccess('');
    setAccessSummaryOpen(true);
    setAccessSummaryLoading(true);
    setAccessSummary(null);
    setStatusActionReason('');
    try {
      const result = await platformRequest<AccessSummary>(`/api/platform/schools/${schoolId}/access-summary`);
      setAccessSummary(result);
    } catch (requestError: any) {
      setError(requestError?.message || 'School access summary could not be loaded.');
      setAccessSummaryOpen(false);
    } finally {
      setAccessSummaryLoading(false);
    }
  };

  const changeSubscriptionStatus = async (subscriptionId: string, nextStatus: 'active' | 'past_due' | 'suspended' | 'cancelled' | 'expired') => {
    const label = nextStatus.replaceAll('_', ' ');
    if (['suspended', 'cancelled', 'expired'].includes(nextStatus) && !statusActionReason.trim()) {
      const message = `Enter an internal reason before changing the subscription to ${label}.`;
      setError(message);
      window.alert(message);
      return;
    }
    const confirmed = window.confirm(`Change this subscription status to ${label.toUpperCase()}? School data will remain preserved.`);
    if (!confirmed) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await platformRequest(`/api/platform/subscriptions/${subscriptionId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: nextStatus, reason: statusActionReason.trim() })
      });
      setSuccess(`Subscription status changed to ${label}. Entitlements were synchronised and the action was audited.`);
      if (accessSummary?.school.id) {
        const refreshed = await platformRequest<AccessSummary>(`/api/platform/schools/${accessSummary.school.id}/access-summary`);
        setAccessSummary(refreshed);
      }
      await Promise.all([loadBuilderData(), loadTab(tab, true)]);
    } catch (requestError: any) {
      setError(requestError?.message || 'Subscription status could not be changed.');
    } finally {
      setSaving(false);
    }
  };

  const switchTab = (next: PlatformTab) => { setQuery(''); setError(''); setSuccess(''); setTab(next); };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 px-5 py-6 text-white sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-3"><ShieldCheck className="h-7 w-7 text-cyan-300" /></div>
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-cyan-200">Edunixo ERP</span>
                  <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-emerald-200">{c.mode}</span>
                </div>
                <h2 className="text-2xl font-black tracking-tight sm:text-3xl">{c.title}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">{c.subtitle}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{c.currentAdmin}</p>
              <p className="mt-1 font-extrabold text-white">{overview?.admin.displayName || user.name}</p>
              <p className="mt-0.5 text-xs text-slate-400">{overview?.admin.email || user.email}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-slate-50 p-3 sm:px-5">
          {tabs.map(item => {
            const Icon = item.icon;
            return <button key={item.key} type="button" onClick={() => switchTab(item.key)} className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-extrabold transition-all ${tab === item.key ? 'bg-slate-900 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600 hover:text-slate-900'}`}><Icon className="h-4 w-4" />{item.label}</button>;
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3"><PackageCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" /><p className="leading-relaxed">{c.modeNote}</p></div>
        <button type="button" onClick={() => void loadTab(tab, true)} disabled={loading} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2 text-xs font-extrabold text-blue-700 shadow-sm disabled:opacity-60"><RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />{c.refresh}</button>
      </section>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}
      {success && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{success}</div>}

      {loading && !overview ? <LoadingPanel /> : (
        <>
          {tab === 'dashboard' && overview && (
            <div className="space-y-6">
              <PlatformGrowthShowcase
                overview={overview}
                plans={plans}
                subscriptions={subscriptions}
                onOpenPlans={() => switchTab('plans')}
                onOpenSubscriptions={() => switchTab('subscriptions')}
                onOpenSchools={() => switchTab('schools')}
              />
              <DashboardCards overview={overview} c={c} />
            </div>
          )}
          {tab !== 'dashboard' && (
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
                <div>
                  <h3 className="text-lg font-black text-slate-900">{tabs.find(item => item.key === tab)?.label}</h3>
                  <p className="mt-1 text-xs text-slate-500">Live Platform Core data with controlled Super Admin actions.</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  {(tab === 'plans') && <ActionButton onClick={() => void openNewPlan()} icon={Plus} label="Create Plan" />}
                  {(tab === 'subscriptions') && <ActionButton onClick={() => void openNewSubscription()} icon={Plus} label="Assign Plan" disabled={publishedPlans.length === 0} />}
                  <label className="relative block w-full sm:w-72"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={c.search} className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100" /></label>
                </div>
              </div>

              {loading ? <div className="flex min-h-56 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-blue-600" /></div> : (
                <div className="overflow-x-auto">
                  {tab === 'schools' && <SchoolsTable rows={filteredSchools} noData={c.noData} onAssign={openNewSubscription} onAccess={openAccessSummary} canAssign={publishedPlans.length > 0} />}
                  {tab === 'modules' && <ModulesTable rows={filteredModules} noData={c.noData} />}
                  {tab === 'plans' && <PlansTable rows={filteredPlans} noData={c.noData} onEdit={openEditPlan} />}
                  {tab === 'subscriptions' && <SubscriptionsTable rows={filteredSubscriptions} noData={c.noData} onEdit={openEditSubscription} onAccess={openAccessSummary} />}
                </div>
              )}
            </section>
          )}
        </>
      )}

      {planEditorOpen && (
        <Modal title={planForm.id ? 'Edit Plan' : 'Create Plan'} subtitle="Main modules are bundled through plans. Platform Core modules and required dependencies are included automatically." onClose={() => !saving && setPlanEditorOpen(false)}>
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Plan name"><input value={planForm.planName} onChange={event => setPlanForm(current => ({ ...current, planName: event.target.value, planKey: current.id ? current.planKey : slugPlanKey(event.target.value) }))} className={inputClass} placeholder="Professional" /></Field>
              <Field label="Plan key"><input value={planForm.planKey} onChange={event => setPlanForm(current => ({ ...current, planKey: slugPlanKey(event.target.value) }))} className={inputClass} placeholder="professional" /></Field>
              <Field label="Status"><select value={planForm.status} onChange={event => setPlanForm(current => ({ ...current, status: event.target.value as PlanForm['status'] }))} className={inputClass}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></Field>
              <Field label="Billing cycle"><select value={planForm.billingCycle} onChange={event => setPlanForm(current => ({ ...current, billingCycle: event.target.value as PlanForm['billingCycle'] }))} className={inputClass}><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="annual">Annual</option><option value="custom">Custom</option></select></Field>
              <Field label="Base price"><input type="number" min="0" value={planForm.basePrice} onChange={event => setPlanForm(current => ({ ...current, basePrice: event.target.value }))} className={inputClass} /></Field>
              <Field label="Currency"><input maxLength={3} value={planForm.currency} onChange={event => setPlanForm(current => ({ ...current, currency: event.target.value.toUpperCase() }))} className={inputClass} /></Field>
              <Field label="Trial days"><input type="number" min="0" max="365" value={planForm.trialDays} onChange={event => setPlanForm(current => ({ ...current, trialDays: event.target.value }))} className={inputClass} /></Field>
              <div className="grid grid-cols-2 gap-3 pt-6"><Toggle checked={planForm.isActive} onChange={checked => setPlanForm(current => ({ ...current, isActive: checked }))} label="Active" /><Toggle checked={planForm.isCustom} onChange={checked => setPlanForm(current => ({ ...current, isCustom: checked }))} label="Custom plan" /></div>
            </div>
            <Field label="Description"><textarea value={planForm.description} onChange={event => setPlanForm(current => ({ ...current, description: event.target.value }))} className={`${inputClass} min-h-24`} placeholder="Explain who this plan is designed for." /></Field>

            <div>
              <div className="flex items-center justify-between gap-3"><div><h4 className="font-black text-slate-900">Included main modules</h4><p className="mt-1 text-xs text-slate-500">Core modules are locked. Required dependencies are added automatically when saved.</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700">{planForm.moduleIds.length} selected</span></div>
              <div className="mt-4 space-y-5">
                {moduleGroups.map(([category, rows]) => <div key={category}><p className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">{category}</p><div className="grid gap-2 md:grid-cols-2">{rows.map(module => {
                  const checked = planForm.moduleIds.includes(module.id) || module.isPlatformRequired;
                  return <label key={module.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 ${checked ? 'border-blue-300 bg-blue-50/60' : 'border-slate-200 bg-white'}`}><input type="checkbox" checked={checked} disabled={module.isPlatformRequired} onChange={event => setPlanForm(current => ({ ...current, moduleIds: event.target.checked ? Array.from(new Set([...current.moduleIds, module.id])) : current.moduleIds.filter(id => id !== module.id) }))} className="mt-1 h-4 w-4" /><span><span className="flex flex-wrap items-center gap-2 text-sm font-extrabold text-slate-900">{module.moduleName}{module.isPlatformRequired && <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[8px] uppercase text-white">Core</span>}</span><span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500">{module.description}</span></span></label>;
                })}</div></div>)}
              </div>
            </div>

            <div><h4 className="font-black text-slate-900">Plan limits</h4><p className="mt-1 text-xs text-slate-500">Leave a field empty for no configured limit.</p><div className="mt-3 grid gap-4 md:grid-cols-3"><Field label="Student limit"><input type="number" min="0" value={planForm.studentLimit} onChange={event => setPlanForm(current => ({ ...current, studentLimit: event.target.value }))} className={inputClass} placeholder="2000" /></Field><Field label="Staff limit"><input type="number" min="0" value={planForm.staffLimit} onChange={event => setPlanForm(current => ({ ...current, staffLimit: event.target.value }))} className={inputClass} placeholder="150" /></Field><Field label="Storage (GB)"><input type="number" min="0" value={planForm.storageLimit} onChange={event => setPlanForm(current => ({ ...current, storageLimit: event.target.value }))} className={inputClass} placeholder="20" /></Field></div></div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={() => setPlanEditorOpen(false)} disabled={saving} className={secondaryButton}>Cancel</button><button type="button" onClick={() => void savePlan()} disabled={saving} className={primaryButton}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save Plan</button></div>
          </div>
        </Modal>
      )}

      {subscriptionEditorOpen && (
        <Modal title={subscriptionForm.id ? 'Edit School Subscription' : 'Assign Plan to School'} subtitle="A current subscription activates its plan modules automatically. Assigning a new current plan safely cancels the older current subscription." onClose={() => !saving && setSubscriptionEditorOpen(false)}>
          <div className="space-y-6">
            {publishedPlans.length === 0 && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">Publish at least one active plan before assigning it to a school.</div>}
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="School"><select value={subscriptionForm.schoolId} disabled={Boolean(subscriptionForm.id)} onChange={event => setSubscriptionForm(current => ({ ...current, schoolId: event.target.value }))} className={inputClass}><option value="">Select school</option>{schools.filter(school => school.isActive).map(school => <option key={school.id} value={school.id}>{school.schoolName} ({school.schoolCode})</option>)}</select></Field>
              <Field label="Published plan"><select value={subscriptionForm.planId} onChange={event => selectSubscriptionPlan(event.target.value)} className={inputClass}><option value="">Select plan</option>{publishedPlans.map(plan => <option key={plan.id} value={plan.id}>{plan.planName} — {formatMoney(plan.basePrice, plan.currency)}</option>)}</select></Field>
              <Field label="Status"><select value={subscriptionForm.status} onChange={event => setSubscriptionForm(current => ({ ...current, status: event.target.value as SubscriptionForm['status'] }))} className={inputClass}><option value="draft">Draft</option><option value="trialing">Trialing</option><option value="active">Active</option><option value="past_due">Past due</option><option value="suspended">Suspended</option><option value="cancelled">Cancelled</option><option value="expired">Expired</option></select></Field>
              <Field label="Start date"><input type="date" value={subscriptionForm.startsAt} onChange={event => setSubscriptionForm(current => ({ ...current, startsAt: event.target.value }))} className={inputClass} /></Field>
              {subscriptionForm.status === 'trialing' && <Field label="Trial ends"><input type="date" value={subscriptionForm.trialEndsAt} onChange={event => setSubscriptionForm(current => ({ ...current, trialEndsAt: event.target.value }))} className={inputClass} /></Field>}
              <Field label="Subscription ends"><input type="date" value={subscriptionForm.endsAt} onChange={event => setSubscriptionForm(current => ({ ...current, endsAt: event.target.value }))} className={inputClass} /></Field>
              <Field label="Agreed price"><input type="number" min="0" value={subscriptionForm.agreedPrice} onChange={event => setSubscriptionForm(current => ({ ...current, agreedPrice: event.target.value }))} className={inputClass} /></Field>
              <Field label="Currency"><input maxLength={3} value={subscriptionForm.currency} onChange={event => setSubscriptionForm(current => ({ ...current, currency: event.target.value.toUpperCase() }))} className={inputClass} /></Field>
              <div className="pt-6"><Toggle checked={subscriptionForm.autoRenew} onChange={checked => setSubscriptionForm(current => ({ ...current, autoRenew: checked }))} label="Auto renew" /></div>
            </div>
            <Field label="Billing notes"><textarea value={subscriptionForm.billingNotes} onChange={event => setSubscriptionForm(current => ({ ...current, billingNotes: event.target.value }))} className={`${inputClass} min-h-24`} placeholder="Optional internal notes" /></Field>
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs leading-relaxed text-blue-900"><strong>Access effect:</strong> when status is Active, Trialing or Past due, plan modules become school entitlements. Suspended, Cancelled or Expired status removes plan-based operational access while preserving all school data.</div>
            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={() => setSubscriptionEditorOpen(false)} disabled={saving} className={secondaryButton}>Cancel</button><button type="button" onClick={() => void saveSubscription()} disabled={saving || publishedPlans.length === 0} className={primaryButton}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Save Subscription</button></div>
          </div>
        </Modal>
      )}

      {accessSummaryOpen && (
        <Modal title="School Access Control" subtitle="Inspect the live subscription boundary, effective module entitlements, role permissions and recent denied-access events." onClose={() => !saving && setAccessSummaryOpen(false)}>
          {accessSummaryLoading || !accessSummary ? <div className="flex min-h-72 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div> : (
            <div className="space-y-6">
              {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}
              {success && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{success}</div>}
              <div className="grid gap-3 md:grid-cols-4">
                <Metric label="School" value={accessSummary.school.schoolCode} />
                <Metric label="Access state" value={<StatusBadge value={accessSummary.subscriptionContext?.access_state || 'restricted'} />} />
                <Metric label="Subscription" value={<StatusBadge value={accessSummary.subscriptionContext?.subscription?.status || 'none'} />} />
                <Metric label="Effective modules" value={accessSummary.effectiveEntitlementCount} />
              </div>

              <div className={`rounded-2xl border p-4 ${accessSummary.subscriptionContext?.access_state === 'active' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : accessSummary.subscriptionContext?.access_state === 'grace' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-rose-200 bg-rose-50 text-rose-900'}`}>
                <div className="flex items-start gap-3"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-black">{accessSummary.school.schoolName}</p><p className="mt-1 text-xs leading-relaxed">Plan: <strong>{accessSummary.subscriptionContext?.subscription?.plan_name || 'No current plan'}</strong> · Valid until: <strong>{formatDate(accessSummary.subscriptionContext?.subscription?.ends_at)}</strong>{accessSummary.subscriptionContext?.restriction_reason ? ` · ${accessSummary.subscriptionContext.restriction_reason.replaceAll('_', ' ')}` : ''}</p></div></div>
              </div>

              {accessSummary.subscriptionContext?.subscription?.id && (
                <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <Field label="Internal reason for the audit log"><input value={statusActionReason} onChange={event => setStatusActionReason(event.target.value)} className={inputClass} placeholder="Example: Payment review completed" /></Field>
                    <div className="flex flex-wrap gap-2">
                      {accessSummary.subscriptionContext.subscription.status !== 'active' && <button type="button" disabled={saving} onClick={() => void changeSubscriptionStatus(accessSummary.subscriptionContext!.subscription!.id, 'active')} className={primaryButton}><PlayCircle className="h-4 w-4" />Reactivate</button>}
                      {accessSummary.subscriptionContext.subscription.status !== 'past_due' && <button type="button" disabled={saving} onClick={() => void changeSubscriptionStatus(accessSummary.subscriptionContext!.subscription!.id, 'past_due')} className={secondaryButton}>Past due</button>}
                      {accessSummary.subscriptionContext.subscription.status !== 'suspended' && <button type="button" disabled={saving} onClick={() => void changeSubscriptionStatus(accessSummary.subscriptionContext!.subscription!.id, 'suspended')} className={secondaryButton}><PauseCircle className="h-4 w-4" />Suspend</button>}
                      {accessSummary.subscriptionContext.subscription.status !== 'expired' && <button type="button" disabled={saving} onClick={() => void changeSubscriptionStatus(accessSummary.subscriptionContext!.subscription!.id, 'expired')} className={secondaryButton}>Mark expired</button>}
                      {accessSummary.subscriptionContext.subscription.status !== 'cancelled' && <button type="button" disabled={saving} onClick={() => void changeSubscriptionStatus(accessSummary.subscriptionContext!.subscription!.id, 'cancelled')} className={secondaryButton}>Cancel</button>}
                    </div>
                  </div>
                  <p className="mt-3 text-[11px] leading-relaxed text-slate-500">Status actions never delete school records. Reactivation is rejected when the saved end date has already passed; extend the date in Edit Subscription first.</p>
                </section>
              )}

              <section>
                <div className="flex items-center justify-between gap-3"><div><h4 className="font-black text-slate-900">Effective module entitlements</h4><p className="mt-1 text-xs text-slate-500">Only effective modules can pass the backend entitlement layer. Manual blocks override grants.</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700">{accessSummary.effectiveEntitlementCount}/{accessSummary.entitlements.length}</span></div>
                <div className="mt-3 max-h-80 overflow-auto rounded-2xl border border-slate-200">
                  <table className="min-w-full text-left text-xs"><TableHead columns={['Module', 'Category', 'Effective', 'Source']} /><tbody className="divide-y divide-slate-100">{accessSummary.entitlements.map(row => <tr key={row.moduleId}><td className="px-4 py-3"><p className="font-extrabold text-slate-900">{row.moduleName}</p><p className="font-mono text-[9px] text-slate-400">{row.moduleKey}</p></td><td className="px-4 py-3 font-semibold text-slate-600">{row.category}</td><td className="px-4 py-3"><StatusBadge value={row.blocked ? 'blocked' : row.effective ? 'active' : 'locked'} /></td><td className="px-4 py-3 text-[10px] font-bold text-slate-500">{row.sources.length ? row.sources.join(', ') : '—'}</td></tr>)}</tbody></table>
                </div>
              </section>

              <div className="grid gap-5 lg:grid-cols-2">
                <section><h4 className="font-black text-slate-900">Role-permission coverage</h4><div className="mt-3 space-y-2">{accessSummary.rolePermissionSummary.length ? accessSummary.rolePermissionSummary.map(row => <div key={row.role} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs"><span className="font-extrabold capitalize">{row.role.replaceAll('_', ' ')}</span><span className="font-bold text-slate-500">{row.allowed} allowed · {row.denied} denied</span></div>) : <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs font-semibold text-slate-500">No custom role-permission rows. Safe role defaults apply.</div>}</div></section>
                <section><h4 className="font-black text-slate-900">Recent denied access</h4><div className="mt-3 max-h-64 space-y-2 overflow-auto">{accessSummary.recentDenials.length ? accessSummary.recentDenials.map(row => <div key={row.id} className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs"><div className="flex items-center justify-between gap-3"><span className="font-extrabold text-rose-800">{row.details?.module_key || row.summary}</span><span className="shrink-0 text-[9px] font-bold text-rose-500">{formatDate(row.occurredAt)}</span></div><p className="mt-1 text-[10px] text-rose-700">{String(row.details?.reason || 'access_denied').replaceAll('_', ' ')} · {row.source || 'server guard'}</p></div>) : <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-700">No denied module-access events recorded.</div>}</div></section>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

function filterRows<T>(rows: T[], query: string, text: (row: T) => string): T[] {
  const needle = query.trim().toLowerCase();
  return needle ? rows.filter(row => text(row).toLowerCase().includes(needle)) : rows;
}

function PlatformGrowthShowcase({ overview, plans, subscriptions, onOpenPlans, onOpenSubscriptions, onOpenSchools }: {
  overview: OverviewResponse;
  plans: PlanRow[];
  subscriptions: SubscriptionRow[];
  onOpenPlans: () => void;
  onOpenSubscriptions: () => void;
  onOpenSchools: () => void;
}) {
  const livePlans = plans.filter(plan => plan.isActive && plan.status === 'published').slice(0, 4);
  const activeSubscriptions = subscriptions.filter(item => ['active', 'trialing'].includes(item.status)).length;

  return <section className="edx-platform-growth" data-edx-surface="platform-growth-r257">
    <div className="edx-platform-growth-hero">
      <div className="edx-platform-growth-copy">
        <div className="edx-platform-growth-chip"><Crown className="h-4 w-4" /> EDUNIXO PLATFORM BUSINESS CENTER</div>
        <h3>Brand, subscriptions and growth — arranged like a premium platform.</h3>
        <p>Manage the EDUNIXO school network, published plans, subscriptions and promotional surfaces from one command view. Operational numbers below are live Platform Core records.</p>
        <div className="edx-platform-growth-actions">
          <button type="button" onClick={onOpenPlans}><Layers3 className="h-4 w-4" /> Plans <ArrowRight className="h-4 w-4" /></button>
          <button type="button" onClick={onOpenSubscriptions}><CalendarClock className="h-4 w-4" /> Subscriptions</button>
          <button type="button" onClick={onOpenSchools}><Building2 className="h-4 w-4" /> Schools</button>
        </div>
      </div>
      <div className="edx-platform-growth-metrics">
        <article><span>Active schools</span><strong>{overview.counts.activeSchools}</strong><small>of {overview.counts.totalSchools} registered</small></article>
        <article><span>Published plans</span><strong>{overview.counts.publishedPlans}</strong><small>{overview.counts.totalPlans} total plans</small></article>
        <article><span>Live subscriptions</span><strong>{activeSubscriptions || overview.counts.activeSubscriptions}</strong><small>active / trialing</small></article>
        <article><span>Production modules</span><strong>{overview.counts.productionModules}</strong><small>of {overview.counts.totalModules} modules</small></article>
      </div>
    </div>

    <div className="edx-platform-campaign-head">
      <div><span>EDUNIXO ADS & BANNERS</span><h4>Premium platform campaign surfaces</h4></div>
      <p>Brand presentation only — no fake school or subscription data.</p>
    </div>
    <div className="edx-platform-campaign-grid">
      <article className="edx-platform-campaign edx-platform-campaign-violet"><div className="edx-platform-campaign-icon"><Megaphone className="h-5 w-5" /></div><span>Multi-school cloud</span><h5>One EDUNIXO. Every school.</h5><p>Independent school workspaces, one platform identity and centrally governed access.</p></article>
      <article className="edx-platform-campaign edx-platform-campaign-cyan"><div className="edx-platform-campaign-icon"><WandSparkles className="h-5 w-5" /></div><span>EDUNIXO AI</span><h5>Academic intelligence, built in.</h5><p>Teaching workflows, planning, homework and question-paper intelligence inside the school workspace.</p></article>
      <article className="edx-platform-campaign edx-platform-campaign-emerald"><div className="edx-platform-campaign-icon"><Sparkles className="h-5 w-5" /></div><span>Digital school OS</span><h5>Run the campus from one system.</h5><p>Admissions, attendance, results, communication and administration under one premium platform.</p></article>
    </div>

    <div className="edx-platform-plan-head"><div><span>LIVE PUBLISHED PLANS</span><h4>Plans currently available in EDUNIXO</h4></div><button type="button" onClick={onOpenPlans}>Manage all plans <ArrowRight className="h-4 w-4" /></button></div>
    <div className="edx-platform-plan-grid">
      {livePlans.length ? livePlans.map((plan, index) => <article key={plan.id} className={`edx-platform-plan-card ${index === 0 ? 'edx-platform-plan-featured' : ''}`}>
        <div className="edx-platform-plan-top"><span>{plan.status}</span>{index === 0 ? <b>Featured</b> : null}</div>
        <h5>{plan.planName}</h5>
        <p>{plan.description || 'EDUNIXO platform subscription plan.'}</p>
        <div className="edx-platform-plan-price"><strong>{formatMoney(plan.basePrice, plan.currency)}</strong><span>/ {plan.billingCycle}</span></div>
        <div className="edx-platform-plan-meta"><span>{plan.moduleCount} modules</span><span>{plan.limitCount} limits</span></div>
        <button type="button" onClick={onOpenPlans}>Open plan manager <ArrowRight className="h-4 w-4" /></button>
      </article>) : <div className="edx-platform-plan-empty"><Layers3 className="h-6 w-6" /><strong>No published plan yet</strong><span>Publish a real plan from Platform Core and it will appear here automatically.</span><button type="button" onClick={onOpenPlans}>Open Plans</button></div>}
    </div>
  </section>;
}

function DashboardCards({ overview, c }: { overview: OverviewResponse; c: Record<string, string> }) {
  const cards = [
    { label: c.totalSchools, value: overview.counts.totalSchools, icon: Building2 },
    { label: c.activeSchools, value: overview.counts.activeSchools, icon: CheckCircle2 },
    { label: c.totalModules, value: overview.counts.totalModules, icon: Boxes },
    { label: c.activeSubscriptions, value: overview.counts.activeSubscriptions, icon: CalendarClock },
    { label: c.publishedPlans, value: overview.counts.publishedPlans, icon: Layers3 },
    { label: c.pendingAddons, value: overview.counts.pendingAddonRequests, icon: SlidersHorizontal }
  ];
  return <div className="space-y-6"><div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">{cards.map(card => { const Icon = card.icon; return <article key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-2"><Icon className="h-5 w-5 text-blue-600" /><span className="text-2xl font-black text-slate-900">{card.value}</span></div><p className="mt-3 text-[11px] font-extrabold uppercase tracking-wide text-slate-500">{card.label}</p></article>; })}</div><div className="grid gap-5 lg:grid-cols-3"><article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2"><div className="flex items-start gap-3"><div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><ShieldCheck className="h-5 w-5" /></div><div><h3 className="font-black text-slate-900">{c.platformHealth}</h3><p className="mt-1 text-sm leading-relaxed text-slate-600">{c.platformReady}</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><Metric label="Production modules" value={overview.counts.productionModules} /><Metric label="All plans" value={overview.counts.totalPlans} /><Metric label="Security boundary" value="Platform Admin RLS" /></div></article><article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">{c.generated}</p><p className="mt-2 text-base font-black text-slate-900">{new Date(overview.generatedAt).toLocaleString('en-IN')}</p><div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">Admin level</p><p className="mt-1 text-sm font-black uppercase text-blue-700">{overview.admin.adminLevel.replaceAll('_', ' ')}</p></div></article></div></div>;
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) { return <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-lg font-black text-slate-900">{value}</p></div>; }
function LoadingPanel() { return <div className="flex min-h-72 items-center justify-center rounded-3xl border border-slate-200 bg-white"><div className="text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" /><p className="mt-3 text-sm font-semibold text-slate-500">Loading secure platform data…</p></div></div>; }

function SchoolsTable({ rows, noData, onAssign, onAccess, canAssign }: { rows: SchoolRow[]; noData: string; onAssign: (schoolId: string) => Promise<void>; onAccess: (schoolId: string) => Promise<void>; canAssign: boolean }) {
  return <table className="min-w-full text-left text-sm"><TableHead columns={['School', 'Code', 'Status', 'Memberships', 'Subscriptions', 'Action']} /><tbody className="divide-y divide-slate-100">{rows.map(row => <tr key={row.id} className="hover:bg-slate-50/70"><td className="px-5 py-4"><p className="font-extrabold text-slate-900">{row.schoolName}</p><p className="mt-0.5 text-xs text-slate-400">Created {formatDate(row.createdAt)}</p></td><td className="px-5 py-4 font-mono text-xs font-bold text-slate-600">{row.schoolCode}</td><td className="px-5 py-4"><StatusBadge value={row.status} /></td><td className="px-5 py-4 font-bold">{row.membershipCount}</td><td className="px-5 py-4"><div className="flex items-center gap-2"><span className="font-bold">{row.subscriptionCount}</span>{row.currentSubscriptionStatus && <StatusBadge value={row.currentSubscriptionStatus} />}</div></td><td className="px-5 py-4"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void onAccess(row.id)} className={smallButton}><Eye className="h-3.5 w-3.5" />Access</button><button type="button" disabled={!canAssign} onClick={() => void onAssign(row.id)} className={smallButton}><CalendarClock className="h-3.5 w-3.5" />{row.subscriptionCount > 0 ? 'Manage subscription' : 'Assign plan'}</button></div></td></tr>)}{rows.length === 0 && <EmptyRow columns={6} message={noData} />}</tbody></table>;
}
function ModulesTable({ rows, noData }: { rows: ModuleRow[]; noData: string }) { return <table className="min-w-full text-left text-sm"><TableHead columns={['Module', 'Category', 'Status', 'Version', 'Features', 'Dependencies']} /><tbody className="divide-y divide-slate-100">{rows.map(row => <tr key={row.id} className="hover:bg-slate-50/70"><td className="px-5 py-4"><div className="max-w-md"><div className="flex flex-wrap items-center gap-2"><p className="font-extrabold text-slate-900">{row.moduleName}</p>{row.isPlatformRequired && <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-white">Core</span>}</div><p className="mt-0.5 font-mono text-[10px] text-slate-400">{row.moduleKey}</p><p className="mt-1 text-xs text-slate-500">{row.description}</p></div></td><td className="px-5 py-4 font-semibold text-slate-600">{row.category}</td><td className="px-5 py-4"><StatusBadge value={row.status} /></td><td className="px-5 py-4 font-mono text-xs font-bold">{row.version}</td><td className="px-5 py-4 font-bold">{row.featureCount}</td><td className="px-5 py-4 font-bold">{row.dependencyCount}</td></tr>)}{rows.length === 0 && <EmptyRow columns={6} message={noData} />}</tbody></table>; }
function PlansTable({ rows, noData, onEdit }: { rows: PlanRow[]; noData: string; onEdit: (id: string) => Promise<void> }) { return <table className="min-w-full text-left text-sm"><TableHead columns={['Plan', 'Status', 'Billing', 'Price', 'Modules', 'Limits', 'Action']} /><tbody className="divide-y divide-slate-100">{rows.map(row => <tr key={row.id} className="hover:bg-slate-50/70"><td className="px-5 py-4"><p className="font-extrabold text-slate-900">{row.planName}</p><p className="font-mono text-[10px] text-slate-400">{row.planKey}</p><p className="mt-1 max-w-md text-xs text-slate-500">{row.description}</p></td><td className="px-5 py-4"><StatusBadge value={row.status} /></td><td className="px-5 py-4 font-semibold capitalize">{row.billingCycle}</td><td className="px-5 py-4 font-extrabold">{formatMoney(row.basePrice, row.currency)}</td><td className="px-5 py-4 font-bold">{row.moduleCount}</td><td className="px-5 py-4 font-bold">{row.limitCount}</td><td className="px-5 py-4"><button type="button" onClick={() => void onEdit(row.id)} className={smallButton}><Edit3 className="h-3.5 w-3.5" />Edit</button></td></tr>)}{rows.length === 0 && <EmptyRow columns={7} message={noData} />}</tbody></table>; }
function SubscriptionsTable({ rows, noData, onEdit, onAccess }: { rows: SubscriptionRow[]; noData: string; onEdit: (row: SubscriptionRow) => Promise<void>; onAccess: (schoolId: string) => Promise<void> }) { return <table className="min-w-full text-left text-sm"><TableHead columns={['School', 'Plan', 'Status', 'Validity', 'Price', 'Modules', 'Action']} /><tbody className="divide-y divide-slate-100">{rows.map(row => <tr key={row.id} className="hover:bg-slate-50/70"><td className="px-5 py-4"><p className="font-extrabold text-slate-900">{row.schoolName}</p><p className="font-mono text-[10px] text-slate-400">{row.schoolCode}</p></td><td className="px-5 py-4 font-bold">{row.planName}</td><td className="px-5 py-4"><StatusBadge value={row.status} /></td><td className="px-5 py-4 text-xs font-semibold">{formatDate(row.startsAt)} → {formatDate(row.endsAt)}</td><td className="px-5 py-4 font-extrabold">{formatMoney(row.agreedPrice, row.currency)}</td><td className="px-5 py-4 font-bold">{row.entitlementCount ?? 0}</td><td className="px-5 py-4"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void onAccess(row.schoolId)} className={smallButton}><Eye className="h-3.5 w-3.5" />Inspect</button><button type="button" onClick={() => void onEdit(row)} className={smallButton}><Edit3 className="h-3.5 w-3.5" />Edit</button></div></td></tr>)}{rows.length === 0 && <EmptyRow columns={7} message={noData} />}</tbody></table>; }

function TableHead({ columns }: { columns: string[] }) { return <thead className="bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500"><tr>{columns.map(column => <th key={column} className="px-5 py-3">{column}</th>)}</tr></thead>; }
function EmptyRow({ columns, message }: { columns: number; message: string }) { return <tr><td colSpan={columns} className="px-5 py-14 text-center"><div className="mx-auto flex max-w-xs flex-col items-center text-slate-400"><UsersRound className="h-7 w-7" /><p className="mt-3 text-sm font-bold">{message}</p></div></td></tr>; }
function ActionButton({ onClick, icon: Icon, label, disabled }: { onClick: () => void; icon: React.ElementType; label: string; disabled?: boolean }) { return <button type="button" onClick={onClick} disabled={disabled} className={`${primaryButton} min-h-11 whitespace-nowrap`}><Icon className="h-4 w-4" />{label}</button>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1.5 block text-xs font-extrabold text-slate-700">{label}</span>{children}</label>; }
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) { return <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-extrabold text-slate-700"><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} className="h-4 w-4" />{label}</label>; }
function Modal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) { return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm"><div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl"><div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur"><div><h3 className="text-xl font-black text-slate-900">{title}</h3><p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-500">{subtitle}</p></div><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"><X className="h-5 w-5" /></button></div><div className="p-5 sm:p-6">{children}</div></div></div>; }

const inputClass = 'min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100';
const primaryButton = 'inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50';
const secondaryButton = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-extrabold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50';
const smallButton = 'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-extrabold text-slate-700 hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40';
