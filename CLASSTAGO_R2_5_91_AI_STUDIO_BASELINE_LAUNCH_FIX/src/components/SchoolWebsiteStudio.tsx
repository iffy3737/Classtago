/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, BadgeCheck, Check, ChevronRight, CircleAlert,
  ClipboardList, Cloud, Eye, Globe2, Image as ImageIcon, LayoutTemplate,
  Loader2, Megaphone, Monitor, Palette, RefreshCw, Save, Send,
  ShieldCheck, Smartphone, Sparkles, WandSparkles, UploadCloud, Trash2, Images, ImagePlus, ArrowUp, ArrowDown,
  Archive, RotateCcw, Search, Pencil, HardDrive, X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import PremiumSchoolPortal, { PremiumResolvedSchool, PublicSiteSection } from './PremiumSchoolPortal';
import AdmissionCampaignWorkspace from './AdmissionCampaignWorkspace';
import AdmissionConfirmationWorkspace from './AdmissionConfirmationWorkspace';

interface SchoolWebsiteStudioProps {
  userRole: string;
  userName: string;
  initialTab?: StudioTab;
  allowedTabs?: StudioTab[];
  focusedMode?: boolean;
  focusedTitle?: string;
  activeFeatureId?: string | null;
}

export type StudioTab = 'identity' | 'media' | 'content' | 'admissions' | 'contact' | 'design' | 'preview' | 'applications' | 'confirmation';

type SiteDraft = {
  slug: string;
  publicStatus: string;
  schoolDisplayName: string;
  shortName: string;
  tagline: string;
  heroTitle: string;
  heroSubtitle: string;
  logoUrl: string;
  faviconUrl: string;
  theme: Record<string, any>;
  publicLanguages: string[];
  sections: PublicSiteSection[];
  admissionsEnabled: boolean;
  admissionsOpen: boolean;
  admissionSession: string;
  admissionTitle: string;
  admissionDescription: string;
  prospectusUrl: string;
  contactDetails: Record<string, any>;
  socialLinks: Record<string, any>;
  seoSettings: Record<string, any>;
};


type SchoolMediaAsset = {
  id: string;
  reference: string;
  kind: 'hero' | 'gallery' | 'logo' | 'admission_campaign' | 'document';
  category: string;
  status: 'draft' | 'published' | 'archived' | 'deleted';
  previewUrl: string | null;
  publicUrl: string | null;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  caption: string;
  altText: string;
  displayOrder: number;
  createdAt: string | null;
  updatedAt: string | null;
  publishedAt: string | null;
  archivedAt: string | null;
  usedInDraft: boolean;
  usedInPublished: boolean;
};

type PreparedSchoolImage = {
  dataUrl: string;
  width: number;
  height: number;
  originalMimeType: string;
};

const defaultDraft: SiteDraft = {
  slug: '', publicStatus: 'draft', schoolDisplayName: '', shortName: '', tagline: '',
  heroTitle: '', heroSubtitle: '', logoUrl: '', faviconUrl: '',
  theme: { preset: 'midnight_sapphire', accent: '#38bdf8', accent2: '#8b5cf6', heroImageUrl: '' },
  publicLanguages: ['en'], sections: [], admissionsEnabled: true, admissionsOpen: false,
  admissionSession: '', admissionTitle: 'Admissions Open', admissionDescription: '', prospectusUrl: '',
  contactDetails: {}, socialLinks: {}, seoSettings: {}
};

const sectionDefaults: Record<string, PublicSiteSection> = {
  about: { key: 'about', enabled: true, sortOrder: 10, eyebrow: 'A school with purpose', title: 'Learning that shapes knowledge, character and confidence.', body: 'Describe your school, its values and what makes the student experience special.' },
  academics: { key: 'academics', enabled: true, sortOrder: 20, eyebrow: 'Academic journey', title: 'Strong foundations. Thoughtful teaching. Measurable progress.', items: ['Student-centred classroom learning', 'Continuous academic guidance', 'Language-inclusive learning support'] },
  principal: { key: 'principal', enabled: true, sortOrder: 30, eyebrow: 'From the Headmaster', title: 'Every child deserves to be seen, supported and inspired.', body: 'Write a warm message from the Headmaster or Principal.' },
  facilities: { key: 'facilities', enabled: true, sortOrder: 40, eyebrow: 'Campus experience', title: 'Spaces designed for learning and belonging.', items: ['Safe and disciplined campus', 'Digital academic workflows', 'Co-curricular development', 'Student support and guidance'] },
  achievements: { key: 'achievements', enabled: true, sortOrder: 50, eyebrow: 'School highlights', title: 'Progress worth celebrating.', items: ['Academic achievement', 'Student participation', 'Community trust'] },
  notices: { key: 'notices', enabled: true, sortOrder: 60, eyebrow: 'Latest information', title: 'Notices and announcements', items: ['Welcome to the official school digital portal.'] },
  gallery: { key: 'gallery', enabled: true, sortOrder: 65, eyebrow: 'School gallery', title: 'Life at our school', items: [] },
  rules: { key: 'rules', enabled: true, sortOrder: 70, eyebrow: 'Student responsibility', title: 'School rules and essential information', items: ['Attend school regularly and on time.', 'Respect every member of the school community.', 'Follow the prescribed uniform and conduct standards.'] },
  contact: { key: 'contact', enabled: true, sortOrder: 80, eyebrow: 'Connect with us', title: 'Visit, call or write to the school office.' }
};

const studioFeatureLabels: Record<string,string> = {
  'school-identity-hero': 'Identity & Hero',
  'media-gallery': 'Media & Gallery',
  'public-page-content': 'Page Content',
  'contact-social-seo': 'Contact & SEO',
  'website-design-system': 'Design & Theme',
  'private-website-preview': 'Preview Website',
  'campaign-workspace': 'Campaign Setup',
  'application-review-queue': 'Admission Applications',
  'final-admission-verification': 'Admission Confirmation'
};

const themePresets = [
  { key: 'midnight_sapphire', name: 'Midnight Sapphire', accent: '#38bdf8', accent2: '#8b5cf6', description: 'Deep, cinematic and technology-forward.' },
  { key: 'royal_emerald', name: 'Royal Emerald', accent: '#34d399', accent2: '#22d3ee', description: 'Confident, academic and fresh.' },
  { key: 'crimson_gold', name: 'Crimson & Gold', accent: '#fbbf24', accent2: '#fb7185', description: 'Prestigious and ceremonial.' },
  { key: 'indigo_orchid', name: 'Indigo Orchid', accent: '#a78bfa', accent2: '#f472b6', description: 'Creative, elegant and modern.' }
];

function normalizeDraft(raw: any): SiteDraft {
  const source = raw || {};
  const sections = Array.isArray(source.sections) ? source.sections : [];
  const mergedSections = Object.keys(sectionDefaults).map(key => ({ ...sectionDefaults[key], ...(sections.find((item: any) => item?.key === key) || {}) }));
  return {
    ...defaultDraft,
    ...source,
    slug: String(source.slug || ''),
    schoolDisplayName: String(source.schoolDisplayName || source.school_display_name || ''),
    shortName: String(source.shortName || source.short_name || ''),
    heroTitle: String(source.heroTitle || source.hero_title || ''),
    heroSubtitle: String(source.heroSubtitle || source.hero_subtitle || ''),
    logoUrl: String(source.logoUrl || source.logo_url || ''),
    faviconUrl: String(source.faviconUrl || source.favicon_url || ''),
    publicLanguages: Array.isArray(source.publicLanguages || source.public_languages) ? (source.publicLanguages || source.public_languages) : ['en'],
    admissionsEnabled: source.admissionsEnabled ?? source.admissions_enabled ?? true,
    admissionsOpen: source.admissionsOpen ?? source.admissions_open ?? false,
    admissionSession: String(source.admissionSession || source.admission_session || ''),
    admissionTitle: String(source.admissionTitle || source.admission_title || 'Admissions Open'),
    admissionDescription: String(source.admissionDescription || source.admission_description || ''),
    prospectusUrl: String(source.prospectusUrl || source.prospectus_url || ''),
    contactDetails: source.contactDetails || source.contact_details || {},
    socialLinks: source.socialLinks || source.social_links || {},
    seoSettings: source.seoSettings || source.seo_settings || {},
    theme: { ...defaultDraft.theme, ...(source.theme || {}) },
    sections: mergedSections
  };
}

function stableValue(value: any): any {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((result: Record<string, any>, key) => {
      result[key] = stableValue(value[key]);
      return result;
    }, {});
  }
  return value;
}

function draftFingerprint(value: SiteDraft | null): string {
  if (!value) return '';
  const normalized = normalizeDraft(value);
  const { publicStatus: _publicStatus, ...publishableContent } = normalized;
  return JSON.stringify(stableValue(publishableContent));
}

function lines(value: string[]) { return (value || []).join('\n'); }
function toLines(value: string) { return value.split('\n').map(item => item.trim()).filter(Boolean).slice(0, 20); }

async function prepareSchoolImage(file: File, kind: 'hero' | 'gallery' | 'logo'): Promise<PreparedSchoolImage> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPG, PNG or WEBP image.');
  if (file.size > 10 * 1024 * 1024) throw new Error('Choose an image smaller than 10 MB. Classtago will optimize it before upload.');
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Image could not be read.'));
    reader.onerror = () => reject(new Error('Image could not be read.'));
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const candidate = new Image();
    candidate.onload = () => resolve(candidate);
    candidate.onerror = () => reject(new Error('Image could not be decoded.'));
    candidate.src = source;
  });
  const limit = kind === 'hero' ? { width: 2200, height: 1250 } : kind === 'logo' ? { width: 900, height: 900 } : { width: 1700, height: 1250 };
  const scale = Math.min(1, limit.width / image.naturalWidth, limit.height / image.naturalHeight);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image optimization is unavailable in this browser.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return {
    dataUrl: canvas.toDataURL('image/webp', kind === 'logo' ? 0.9 : 0.84),
    width: canvas.width,
    height: canvas.height,
    originalMimeType: file.type
  };
}

function resolveSchoolMediaPreview(value: unknown, assets: SchoolMediaAsset[]): string {
  const raw = String(value || '');
  if (!raw.startsWith('media:')) return raw;
  return assets.find(asset => asset.reference === raw)?.previewUrl || '';
}

export default function SchoolWebsiteStudio({ userRole, userName, initialTab = 'identity', allowedTabs, focusedMode = false, focusedTitle, activeFeatureId }: SchoolWebsiteStudioProps) {
  const [activeTab, setActiveTab] = useState<StudioTab>(initialTab);
  const [draft, setDraft] = useState<SiteDraft>(defaultDraft);
  const [published, setPublished] = useState<SiteDraft | null>(null);
  const [schoolId, setSchoolId] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [mediaUploading, setMediaUploading] = useState<'hero' | 'gallery' | 'logo' | null>(null);
  const [mediaAssets, setMediaAssets] = useState<SchoolMediaAsset[]>([]);
  const normalizedAllowedTabs = useMemo<StudioTab[]>(() => {
    const clerkTabs: StudioTab[] = ['identity', 'media', 'content', 'contact', 'design', 'preview', 'admissions'];
    const headmasterTabs: StudioTab[] = ['applications', 'confirmation'];
    const roleTabs = userRole === 'headmaster' ? headmasterTabs : clerkTabs;
    const source: StudioTab[] = allowedTabs?.length ? allowedTabs : roleTabs;
    return Array.from(new Set<StudioTab>(source.filter(tab => roleTabs.includes(tab))));
  }, [allowedTabs, userRole]);

  useEffect(() => {
    const next = normalizedAllowedTabs.includes(initialTab) ? initialTab : normalizedAllowedTabs[0] || 'identity';
    setActiveTab(next);
  }, [initialTab, normalizedAllowedTabs]);

  useEffect(() => {
    if (!activeFeatureId) return;
    window.setTimeout(() => {
      document.getElementById(`edx-studio-${activeFeatureId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, [activeFeatureId, activeTab]);

  const openStudioTab = (next: StudioTab) => {
    if (normalizedAllowedTabs.includes(next)) setActiveTab(next);
  };

  const canPublish = userRole === 'clerk';
  const hasUnpublishedChanges = useMemo(() => {
    if (!published) return true;
    return dirty || draftFingerprint(draft) !== draftFingerprint(published);
  }, [draft, published, dirty]);

  const token = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Secure session unavailable. Please sign in again.');
    return session.access_token;
  };

  const loadStudio = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const accessToken = await token();
      const response = await fetch('/api/school-website/manage', { headers: { Authorization: `Bearer ${accessToken}` } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'School website studio could not be loaded.');
      setDraft(normalizeDraft(payload.draft || payload.published));
      setPublished(payload.published ? normalizeDraft(payload.published) : null);
      setSchoolId(String(payload.school?.id || ''));
      setSchoolCode(String(payload.school?.schoolCode || ''));
      setMediaAssets(Array.isArray(payload.mediaAssets) ? payload.mediaAssets : []);
      setLastSavedAt(payload.draftUpdatedAt || null);
      setDirty(false);
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'School website studio could not be loaded.' });
    } finally {
      setLoading(false);
    }
  };

  const needsWebsiteStudioData = normalizedAllowedTabs.some(tab => !['applications', 'confirmation'].includes(tab));

  useEffect(() => {
    if (needsWebsiteStudioData) {
      void loadStudio();
      return;
    }
    setLoading(false);
    setMessage(null);
  }, [needsWebsiteStudioData]);

  const updateDraft = <K extends keyof SiteDraft>(key: K, value: SiteDraft[K]) => {
    setDraft(current => ({ ...current, [key]: value, publicStatus: key === 'publicStatus' ? String(value) : 'draft' }));
    setDirty(true);
    setMessage(null);
  };

  const updateTheme = (key: string, value: any) => updateDraft('theme', { ...draft.theme, [key]: value });
  const updateContact = (key: string, value: any) => updateDraft('contactDetails', { ...draft.contactDetails, [key]: value });
  const updateSection = (key: string, patch: Partial<PublicSiteSection>) => {
    updateDraft('sections', draft.sections.map(section => section.key === key ? { ...section, ...patch } : section));
  };

  const persistDraftToCloud = async (draftToSave: SiteDraft) => {
    const accessToken = await token();
    const response = await fetch('/api/school-website/draft', {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ draft: draftToSave })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Draft could not be saved.');
    return {
      draft: normalizeDraft(payload.draft),
      updatedAt: payload.updatedAt || new Date().toISOString()
    };
  };

  const saveDraft = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const saved = await persistDraftToCloud(draft);
      setDraft(saved.draft);
      setLastSavedAt(saved.updatedAt);
      setDirty(false);
      setMessage({ type: 'success', text: 'Website draft saved permanently to the school cloud.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'Draft could not be saved.' });
    } finally {
      setSaving(false);
    }
  };

  const requestPublishWebsite = () => {
    if (!canPublish || publishing || saving) return;
    if (!hasUnpublishedChanges) {
      setMessage({ type: 'success', text: 'The public school website is already using the latest saved version.' });
      return;
    }
    setMessage(null);
    setPublishConfirmOpen(true);
  };

  const publishWebsite = async () => {
    if (!canPublish || !hasUnpublishedChanges || publishing || saving) return;
    setPublishConfirmOpen(false);
    setPublishing(true);
    setMessage(null);
    try {
      let draftBeingPublished = draft;
      if (dirty) {
        const saved = await persistDraftToCloud(draftBeingPublished);
        draftBeingPublished = saved.draft;
        setDraft(saved.draft);
        setLastSavedAt(saved.updatedAt);
        setDirty(false);
      }

      const accessToken = await token();
      const response = await fetch('/api/school-website/publish', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ changeSummary: `Published from Website Studio by ${userName}` })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Website could not be published.');
      if (!payload.published) throw new Error('The server completed the request but did not return the published website version.');
      const next = normalizeDraft(payload.published);
      setPublished(next);
      setDraft(next);
      setDirty(false);
      setLastSavedAt(payload.publishedAt || new Date().toISOString());
      await refreshMediaLibrary(false);
      setMessage({ type: 'success', text: 'School website published successfully. Selected private media was promoted to the public website safely.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'Website could not be published.' });
    } finally {
      setPublishing(false);
    }
  };

  const refreshMediaLibrary = async (showError = true) => {
    try {
      const accessToken = await token();
      const response = await fetch('/api/school-website/media', { headers: { Authorization: `Bearer ${accessToken}` } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Media library could not be refreshed.');
      setMediaAssets(Array.isArray(payload.assets) ? payload.assets : []);
    } catch (error: any) {
      if (showError) setMessage({ type: 'error', text: error?.message || 'Media library could not be refreshed.' });
    }
  };

  const uploadSchoolMedia = async (kind: 'hero' | 'gallery' | 'logo', file: File | null) => {
    if (!file) return;
    setMediaUploading(kind);
    setMessage(null);
    try {
      const prepared = await prepareSchoolImage(file, kind);
      const accessToken = await token();
      const response = await fetch('/api/school-website/media/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ kind, ...prepared, fileName: file.name })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'School image could not be uploaded.');
      const asset = payload.asset as SchoolMediaAsset | undefined;
      const reference = String(payload.reference || asset?.reference || '');
      if (!asset || !reference) throw new Error('The media service did not return a permanent library record.');
      setMediaAssets(current => [asset, ...current.filter(item => item.id !== asset.id)]);
      if (kind === 'hero') updateTheme('heroImageUrl', reference);
      if (kind === 'logo') updateDraft('logoUrl', reference);
      if (kind === 'gallery') {
        const gallery = draft.sections.find(section => section.key === 'gallery') || sectionDefaults.gallery;
        const nextItems = [...(gallery.items || []).filter(item => item !== reference), reference].slice(0, 18);
        updateSection('gallery', { enabled: true, items: nextItems });
      }
      setMessage({
        type: 'success',
        text: payload.duplicate
          ? 'This image already existed in the school media library and has been selected safely.'
          : kind === 'gallery'
            ? 'Gallery photo stored privately in the school cloud. Save Draft, preview and publish when ready.'
            : `${kind === 'hero' ? 'Banner' : 'Logo'} stored privately in the school cloud. It is not public until Headmaster Publish.`
      });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'School image could not be uploaded.' });
    } finally {
      setMediaUploading(null);
    }
  };

  const updateMediaAsset = async (assetId: string, patch: Pick<SchoolMediaAsset, 'caption' | 'altText' | 'category' | 'displayOrder'>) => {
    try {
      const accessToken = await token();
      const response = await fetch(`/api/school-website/media/${encodeURIComponent(assetId)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(patch)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Media details could not be updated.');
      setMediaAssets(current => current.map(item => item.id === assetId ? { ...item, ...payload.asset } : item));
      setMessage({ type: 'success', text: 'Media caption, accessibility text and category saved to the school cloud.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'Media details could not be updated.' });
      throw error;
    }
  };

  const archiveMediaAsset = async (assetId: string) => {
    try {
      const accessToken = await token();
      const response = await fetch(`/api/school-website/media/${encodeURIComponent(assetId)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Media asset could not be archived.');
      setMediaAssets(current => current.map(item => item.id === assetId ? { ...item, ...payload.asset } : item));
      setMessage({ type: 'success', text: 'Media archived safely. Its cloud original remains recoverable.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'Media asset could not be archived.' });
      throw error;
    }
  };

  const restoreMediaAsset = async (assetId: string) => {
    try {
      const accessToken = await token();
      const response = await fetch(`/api/school-website/media/${encodeURIComponent(assetId)}/restore`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Media asset could not be restored.');
      setMediaAssets(current => current.map(item => item.id === assetId ? { ...item, ...payload.asset } : item));
      setMessage({ type: 'success', text: 'Media restored to the school library.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'Media asset could not be restored.' });
      throw error;
    }
  };

  const useMediaAsset = (asset: SchoolMediaAsset, target: 'hero' | 'logo' | 'gallery') => {
    if (asset.status === 'archived') {
      setMessage({ type: 'error', text: 'Restore this media asset before selecting it.' });
      return;
    }
    if (target === 'hero') updateTheme('heroImageUrl', asset.reference);
    if (target === 'logo') updateDraft('logoUrl', asset.reference);
    if (target === 'gallery') {
      const gallery = draft.sections.find(section => section.key === 'gallery') || sectionDefaults.gallery;
      const nextItems = [...(gallery.items || []).filter(item => item !== asset.reference), asset.reference].slice(0, 18);
      updateSection('gallery', { enabled: true, items: nextItems });
    }
    setMessage({ type: 'success', text: `Selected ${asset.originalFilename} for the website draft. Save Draft to preserve the selection.` });
  };

  const removeGalleryImage = (index: number) => {
    const gallery = draft.sections.find(section => section.key === 'gallery') || sectionDefaults.gallery;
    updateSection('gallery', { items: (gallery.items || []).filter((_, itemIndex) => itemIndex !== index) });
  };

  const moveGalleryImage = (index: number, direction: -1 | 1) => {
    const gallery = draft.sections.find(section => section.key === 'gallery') || sectionDefaults.gallery;
    const items = [...(gallery.items || [])];
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]];
    updateSection('gallery', { items });
  };

  const completeness = useMemo(() => {
    const checks = [draft.schoolDisplayName, draft.tagline, draft.heroTitle, draft.heroSubtitle, draft.contactDetails?.phone, draft.contactDetails?.address, draft.sections.find(section => section.key === 'about')?.body];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [draft]);

  const previewSections = useMemo(() => draft.sections.map(section => ({
    ...section,
    imageUrl: section.imageUrl ? resolveSchoolMediaPreview(section.imageUrl, mediaAssets) : section.imageUrl,
    items: section.key === 'gallery'
      ? (section.items || []).map(item => resolveSchoolMediaPreview(item, mediaAssets) || item)
      : section.items
  })), [draft.sections, mediaAssets]);

  const previewSchool: PremiumResolvedSchool = {
    id: schoolId || 'preview', schoolCode: schoolCode || 'PREVIEW', schoolName: draft.schoolDisplayName || 'Your School',
    slug: draft.slug || 'preview', portalAvailable: true, shortName: draft.shortName, tagline: draft.tagline,
    heroTitle: draft.heroTitle, heroSubtitle: draft.heroSubtitle, logoUrl: resolveSchoolMediaPreview(draft.logoUrl, mediaAssets),
    theme: { ...draft.theme, heroImageUrl: resolveSchoolMediaPreview(draft.theme.heroImageUrl, mediaAssets) },
    publicLanguages: draft.publicLanguages, sections: previewSections,
    admissionsEnabled: draft.admissionsEnabled, admissionsOpen: draft.admissionsOpen,
    admissionSession: draft.admissionSession, admissionTitle: draft.admissionTitle,
    admissionDescription: draft.admissionDescription, prospectusUrl: draft.prospectusUrl,
    contactDetails: draft.contactDetails, socialLinks: draft.socialLinks
  };

  const allTabs: Array<[StudioTab, string, any]> = [
    ['identity', 'Identity & Hero', Sparkles],
    ['media', 'Media & Gallery', Images],
    ['content', 'Page Content', LayoutTemplate],
    ['contact', 'Contact & SEO', Globe2],
    ['design', 'Design & Theme', Palette],
    ['preview', 'Preview Website', Eye],
    ['admissions', 'Campaign Setup', Megaphone],
    ['applications', 'Admission Applications', ClipboardList],
    ['confirmation', 'Admission Confirmation', ShieldCheck]
  ];
  const tabs = allTabs.filter(([key]) => normalizedAllowedTabs.includes(key));
  const showStudioNavigation = tabs.length > 1;
  const websiteDesignPage = !['admissions', 'applications', 'confirmation'].includes(activeTab);
  const workspaceTitle = focusedTitle || (userRole === 'headmaster' ? 'Admissions Review & Confirmation' : websiteDesignPage ? 'Website Design' : 'Admission Campaign Setup');
  const workspaceDescription = userRole === 'headmaster'
    ? 'Review submitted admission applications and complete final admission confirmation. Website Design and Campaign Setup are Clerk-owned.'
    : websiteDesignPage
      ? 'Edit the public website page-by-page. Save and publish controls remain at the bottom of every page.'
      : 'Create, schedule and manage public admission campaigns from the Clerk workspace.';

  if (loading) return <div className="flex min-h-[520px] flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm"><Loader2 className="h-9 w-9 animate-spin text-cyan-600" /><h2 className="mt-4 text-xl font-black text-slate-950">Opening {workspaceTitle}…</h2><p className="mt-2 text-sm text-slate-500">Loading the school draft, media and secure permissions.</p></div>;

  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 shadow-2xl">
      <div className="relative overflow-hidden border-b border-white/10 px-5 py-6 text-white sm:px-7">
        <div className="absolute -right-20 -top-28 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="absolute -left-20 top-10 h-60 w-60 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4"><div className="grid h-13 w-13 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/5 text-cyan-300"><WandSparkles className="h-7 w-7" /></div><div><div className="flex flex-wrap items-center gap-2"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">Classtago Signature Experience</p><span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-300">Cloud connected</span></div><h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{workspaceTitle}</h1><p className="mt-2 max-w-3xl text-xs leading-6 text-slate-400">{userRole === 'headmaster' || focusedMode ? workspaceDescription : 'Shape the school identity and public information page-by-page. Clerk-owned Website Design changes remain in the school cloud until published.'}</p></div></div>
          <div className="flex flex-wrap items-center gap-2"><div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs"><span className="text-slate-500">Completeness</span><span className="ml-2 font-black text-white">{completeness}%</span></div><div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs"><span className="text-slate-500">Page</span><span className="ml-2 font-black text-white">{tabs.find(([key]) => key === activeTab)?.[1] || 'Website'}</span></div></div>
        </div>
        <div className="relative mt-5 flex flex-wrap items-center gap-3 text-[10px] font-bold text-slate-500"><span className="flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" />{dirty ? 'Unsaved changes — use the page actions at the bottom' : hasUnpublishedChanges ? 'Saved draft ready to publish' : 'Live website is up to date'}</span><span>•</span><span>Live status: <strong className="text-slate-300">{published?.publicStatus || 'Not published'}</strong></span>{lastSavedAt && <><span>•</span><span>Last saved: {new Date(lastSavedAt).toLocaleString()}</span></>}</div>
      </div>

      {message && <div className={`mx-5 mt-5 flex items-start gap-3 rounded-xl border px-4 py-3 text-xs font-semibold sm:mx-7 ${message.type === 'success' ? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-200' : 'border-rose-300/20 bg-rose-300/10 text-rose-200'}`}>{message.type === 'success' ? <BadgeCheck className="h-5 w-5 shrink-0" /> : <CircleAlert className="h-5 w-5 shrink-0" />}<span className="leading-5">{message.text}</span></div>}

      {publishConfirmOpen && <div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/75 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="publish-confirm-title">
        <div className="w-full max-w-lg overflow-hidden rounded-[1.75rem] border border-white/10 text-white shadow-[0_32px_100px_rgba(2,6,23,.7)]" style={{background:'radial-gradient(circle at 0% 0%, rgba(34,211,238,.16), transparent 36%), radial-gradient(circle at 100% 0%, rgba(139,92,246,.16), transparent 38%), linear-gradient(145deg,#07172d,#090d1f 60%,#181235)',color:'#ffffff'}}>
          <div className="relative overflow-hidden border-b border-white/10 p-6 sm:p-7">
            <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-cyan-400/15 blur-3xl" />
            <div className="absolute -left-16 bottom-0 h-44 w-44 rounded-full bg-violet-500/15 blur-3xl" />
            <div className="relative flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-cyan-300 to-violet-400 text-slate-950 shadow-lg"><Send className="h-5 w-5" /></div>
              <div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">Clerk publishing control</p><h2 id="publish-confirm-title" className="mt-2 text-xl font-black tracking-tight">{dirty ? 'Save changes and publish website?' : 'Publish the saved draft?'}</h2><p className="mt-3 text-xs leading-6 text-slate-400">{dirty ? 'The latest edits will first be saved permanently to the school cloud and then published. The current live version will remain available in revision history.' : 'The saved private draft will become the live public school website. The current live version will remain available in revision history.'}</p></div>
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 p-5 sm:flex-row sm:justify-end sm:p-6">
            <button type="button" onClick={() => setPublishConfirmOpen(false)} disabled={publishing} className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-xs font-black text-white transition hover:bg-white/10 disabled:opacity-50">Cancel</button>
            <button type="button" onClick={() => void publishWebsite()} disabled={publishing || saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-violet-400 px-5 py-3 text-xs font-black text-slate-950 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50">{publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{publishing ? 'Publishing…' : dirty ? 'Save & Publish Now' : 'Publish Website Now'}</button>
          </div>
        </div>
      </div>}

      <div className="min-h-[680px] bg-slate-50">
        {showStudioNavigation && <div className="border-b border-white/10 bg-slate-950 px-3 py-3 sm:px-5">
          <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Workspace pages">{tabs.map(([key, label, Icon]) => <button key={key} type="button" onClick={() => openStudioTab(key)} aria-current={activeTab === key ? 'page' : undefined} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-xs font-black transition ${activeTab === key ? 'bg-white text-slate-950 shadow-lg ring-1 ring-white/70' : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'}`}><Icon className="h-4 w-4 shrink-0" /><span>{label}</span></button>)}</nav>
        </div>}

        <section className="mx-auto w-full max-w-[1500px] bg-slate-50 p-5 sm:p-7 lg:p-8">
          {activeFeatureId && studioFeatureLabels[activeFeatureId] && <div className="mb-5 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-xs font-bold text-cyan-950"><span className="font-black">Selected feature:</span> {studioFeatureLabels[activeFeatureId]}</div>}
          {activeTab === 'identity' && <div id="edx-studio-school-identity-hero" className="scroll-mt-24 space-y-6"><SectionHeader icon={Sparkles} eyebrow="School identity" title="Create an opening that feels unmistakably yours." text="The public portal begins with the school name, promise and visual identity." /><FieldGrid><Field label="School display name"><input value={draft.schoolDisplayName} onChange={e => updateDraft('schoolDisplayName', e.target.value)} /></Field><Field label="Short name"><input value={draft.shortName} onChange={e => updateDraft('shortName', e.target.value)} /></Field><Field label="Public URL slug" hint="Lowercase letters, numbers and hyphens only."><input value={draft.slug} onChange={e => updateDraft('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} /></Field><Field label="School tagline"><input value={draft.tagline} onChange={e => updateDraft('tagline', e.target.value)} /></Field><Field label="Hero headline" wide><textarea rows={2} value={draft.heroTitle} onChange={e => updateDraft('heroTitle', e.target.value)} /></Field><Field label="Hero supporting text" wide><textarea rows={3} value={draft.heroSubtitle} onChange={e => updateDraft('heroSubtitle', e.target.value)} /></Field><Field label="Advanced logo URL (optional)"><input value={draft.logoUrl} onChange={e => updateDraft('logoUrl', e.target.value)} placeholder="https://…" /></Field><Field label="Advanced banner URL (optional)"><input value={String(draft.theme.heroImageUrl || '')} onChange={e => updateTheme('heroImageUrl', e.target.value)} placeholder="https://…" /></Field></FieldGrid><div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-xs leading-6 text-cyan-900"><strong>Media note:</strong> Use the Media & Gallery section for direct, optimized school uploads. Secure image URLs remain available here as an advanced option.</div></div>}

          {activeTab === 'media' && <div id="edx-studio-media-gallery" className="scroll-mt-24"><SchoolMediaStudio focusFeatureId={activeFeatureId} draft={draft} mediaAssets={mediaAssets} mediaUploading={mediaUploading} onUpload={uploadSchoolMedia} onRefresh={() => refreshMediaLibrary()} onUpdateAsset={updateMediaAsset} onArchiveAsset={archiveMediaAsset} onRestoreAsset={restoreMediaAsset} onUseAsset={useMediaAsset} onUpdateTheme={updateTheme} onUpdateDraft={updateDraft} onUpdateSection={updateSection} onRemoveGallery={removeGalleryImage} onMoveGallery={moveGalleryImage} /></div>}

          {activeTab === 'content' && <div id="edx-studio-public-page-content" className="scroll-mt-24 space-y-6"><SectionHeader icon={LayoutTemplate} eyebrow="Homepage storytelling" title="Every section should earn the visitor’s attention." text="Write concise, authentic school information. Sections can be hidden without deleting their content." /><div className="space-y-4">{['about','academics','principal','facilities','achievements','notices','gallery','rules','contact'].map(key => { const section = draft.sections.find(item => item.key === key) || sectionDefaults[key]; return <ContentSectionEditor key={key} section={section} onChange={patch => updateSection(key, patch)} />; })}</div></div>}

          {activeTab === 'admissions' && <AdmissionCampaignWorkspace mode="campaigns" userRole={userRole} focusFeatureId={activeFeatureId} onModeChange={next=>openStudioTab(next==='campaigns'?'admissions':'applications')} />}

          {activeTab === 'contact' && <div id="edx-studio-contact-social-seo" className="scroll-mt-24 space-y-6"><SectionHeader icon={Globe2} eyebrow="Contact & discovery" title="Make the school easy to find and easy to trust." text="Only public office details should be entered here." /><FieldGrid><Field label="Address" wide><textarea rows={3} value={String(draft.contactDetails.address || '')} onChange={e => updateContact('address', e.target.value)} /></Field><Field label="City"><input value={String(draft.contactDetails.city || '')} onChange={e => updateContact('city', e.target.value)} /></Field><Field label="District"><input value={String(draft.contactDetails.district || '')} onChange={e => updateContact('district', e.target.value)} /></Field><Field label="State"><input value={String(draft.contactDetails.state || '')} onChange={e => updateContact('state', e.target.value)} /></Field><Field label="PIN code"><input value={String(draft.contactDetails.pinCode || '')} onChange={e => updateContact('pinCode', e.target.value)} /></Field><Field label="Public phone"><input value={String(draft.contactDetails.phone || '')} onChange={e => updateContact('phone', e.target.value)} /></Field><Field label="Public email"><input value={String(draft.contactDetails.email || '')} onChange={e => updateContact('email', e.target.value)} /></Field><Field label="Office hours"><input value={String(draft.contactDetails.officeHours || '')} onChange={e => updateContact('officeHours', e.target.value)} /></Field><Field label="Map URL" wide><input value={String(draft.contactDetails.mapUrl || '')} onChange={e => updateContact('mapUrl', e.target.value)} placeholder="Google Maps share URL" /></Field></FieldGrid></div>}

          {activeTab === 'design' && <div id="edx-studio-website-design-system" className="scroll-mt-24 space-y-6"><SectionHeader icon={Palette} eyebrow="Classtago signature design" title="Curated freedom without broken layouts." text="Choose a professional visual direction. The system keeps contrast, spacing and responsive behaviour consistent." /><div className="grid gap-4 md:grid-cols-2">{themePresets.map(preset => <button key={preset.key} onClick={() => updateDraft('theme', { ...draft.theme, preset: preset.key, accent: preset.accent, accent2: preset.accent2 })} className={`rounded-2xl border p-5 text-left transition ${draft.theme.preset === preset.key ? 'border-slate-950 bg-slate-950 text-white shadow-xl' : 'border-slate-200 bg-white hover:border-slate-300'}`}><div className="flex items-center justify-between"><div className="flex gap-2"><span className="h-7 w-7 rounded-full" style={{ background: preset.accent }} /><span className="h-7 w-7 rounded-full" style={{ background: preset.accent2 }} /></div>{draft.theme.preset === preset.key && <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-slate-950"><Check className="h-4 w-4" /></span>}</div><div className="mt-5 text-base font-black">{preset.name}</div><div className={`mt-2 text-xs leading-5 ${draft.theme.preset === preset.key ? 'text-slate-400' : 'text-slate-500'}`}>{preset.description}</div></button>)}</div><FieldGrid><Field label="Primary accent"><input type="color" value={String(draft.theme.accent || '#38bdf8')} onChange={e => updateTheme('accent', e.target.value)} className="h-12" /></Field><Field label="Secondary accent"><input type="color" value={String(draft.theme.accent2 || '#8b5cf6')} onChange={e => updateTheme('accent2', e.target.value)} className="h-12" /></Field></FieldGrid><div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-3"><Smartphone className="h-5 w-5 text-cyan-600" /><Monitor className="h-5 w-5 text-violet-600" /><div className="font-black text-slate-950">Responsive by design</div></div><p className="mt-3 text-xs leading-6 text-slate-500">The same content is composed separately for mobile and larger screens. It is not a desktop page squeezed into a phone.</p></div></div>}

          {activeTab === 'preview' && <div id="edx-studio-private-website-preview" className="scroll-mt-24 space-y-5"><SectionHeader icon={Eye} eyebrow="Private draft preview" title="Review the experience before the public sees it." text="This preview uses the current unsaved draft. Publishing remains inside the Clerk-owned Website Design workflow." /><div className="overflow-hidden rounded-[1.75rem] border border-slate-300 bg-slate-950 shadow-2xl"><div className="flex items-center gap-2 border-b border-white/10 bg-slate-900 px-4 py-3"><span className="h-2.5 w-2.5 rounded-full bg-rose-400" /><span className="h-2.5 w-2.5 rounded-full bg-amber-300" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /><span className="ml-3 truncate rounded-lg bg-white/5 px-3 py-1 text-[10px] text-slate-500">/school/{draft.slug || 'your-school'} · private draft</span></div><div className="max-h-[850px] overflow-y-auto"><PremiumSchoolPortal school={previewSchool} onOpenERP={() => alert('Login opens from the live school portal.')} onBackToPlatform={() => undefined} /></div></div></div>}

          {activeTab === 'applications' && <AdmissionCampaignWorkspace mode="applications" userRole={userRole} focusFeatureId={activeFeatureId} onModeChange={next=>openStudioTab(next==='campaigns'?'admissions':'applications')} />}

          {activeTab === 'confirmation' && <AdmissionConfirmationWorkspace activeFeatureId={activeFeatureId} />}

          {websiteDesignPage && <div className="mt-8 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-700">Website page actions</div>
                <div className="mt-2 text-lg font-black text-slate-950">Save this page, then publish when the complete website is ready.</div>
                <p className="mt-2 text-xs leading-5 text-slate-500">Save Draft stores all Website Design pages privately. Publish Website is part of the Clerk-owned Website Design workflow and creates revision history.</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={saveDraft} disabled={saving || publishing || !dirty} className="inline-flex min-w-[150px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs font-black text-slate-800 shadow-sm transition hover:border-cyan-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-45">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? 'Saving…' : dirty ? 'Save Draft' : 'Draft Saved'}</button>
                {canPublish && <button type="button" onClick={requestPublishWebsite} disabled={publishing || saving || !hasUnpublishedChanges} className="inline-flex min-w-[170px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-5 py-3 text-xs font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0">{publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : hasUnpublishedChanges ? <Send className="h-4 w-4" /> : <Check className="h-4 w-4" />}{publishing ? 'Publishing…' : !hasUnpublishedChanges ? 'Website is Live' : dirty ? 'Save & Publish' : 'Publish Website'}</button>}
              </div>
            </div>
          </div>}
        </section>
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, eyebrow, title, text }: { icon: any; eyebrow: string; title: string; text: string }) {
  return <div className="max-w-3xl"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-700"><Icon className="h-4 w-4" />{eyebrow}</div><h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{title}</h2><p className="mt-3 text-sm leading-7 text-slate-500">{text}</p></div>;
}

function FieldGrid({ children }: { children: React.ReactNode }) { return <div className="grid gap-4 md:grid-cols-2">{children}</div>; }
function Field({ label, hint, wide, children }: { label: string; hint?: string; wide?: boolean; children: React.ReactElement<any> }) {
  return <label className={wide ? 'block md:col-span-2' : 'block'}><span className="mb-2 block text-xs font-black text-slate-700">{label}</span>{React.cloneElement(children, { className: `${children.props.className || ''} w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10` })}{hint && <span className="mt-1.5 block text-[10px] leading-5 text-slate-400">{hint}</span>}</label>;
}

function ToggleCard({ title, text, active, onChange }: { title: string; text: string; active: boolean; onChange: (value: boolean) => void }) {
  return <button type="button" onClick={() => onChange(!active)} className={`flex items-center gap-4 rounded-2xl border p-5 text-left transition ${active ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'}`}><span className={`relative h-7 w-12 shrink-0 rounded-full transition ${active ? 'bg-emerald-500' : 'bg-slate-300'}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${active ? 'left-6' : 'left-1'}`} /></span><span><span className="block text-sm font-black text-slate-900">{title}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{text}</span></span></button>;
}

function ContentSectionEditor({ section, onChange }: { section: PublicSiteSection; onChange: (patch: Partial<PublicSiteSection>) => void }) {
  const [open, setOpen] = useState(section.key === 'about');
  const hasItems = ['academics','facilities','achievements','notices','rules'].includes(section.key);
  return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><button type="button" onClick={() => setOpen(value => !value)} className="flex w-full items-center gap-4 p-5 text-left"><span className={`grid h-10 w-10 place-items-center rounded-xl ${section.enabled !== false ? 'bg-cyan-50 text-cyan-700' : 'bg-slate-100 text-slate-400'}`}><LayoutTemplate className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-black capitalize text-slate-900">{section.key.replaceAll('_',' ')}</span><span className="mt-1 block truncate text-xs text-slate-400">{section.title || 'Add section title'}</span></span><span onClick={event => { event.stopPropagation(); onChange({ enabled: section.enabled === false }); }} className={`relative h-7 w-12 shrink-0 rounded-full transition ${section.enabled !== false ? 'bg-emerald-500' : 'bg-slate-300'}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${section.enabled !== false ? 'left-6' : 'left-1'}`} /></span><ChevronRight className={`h-4 w-4 text-slate-400 transition ${open ? 'rotate-90' : ''}`} /></button>{open && <div className="border-t border-slate-100 p-5"><FieldGrid><Field label="Eyebrow / small heading"><input value={section.eyebrow || ''} onChange={e => onChange({ eyebrow: e.target.value })} /></Field><Field label="Main title"><input value={section.title || ''} onChange={e => onChange({ title: e.target.value })} /></Field><Field label="Description" wide><textarea rows={3} value={section.body || ''} onChange={e => onChange({ body: e.target.value })} /></Field>{hasItems && <Field label="Items — one per line" wide><textarea rows={5} value={lines(section.items || [])} onChange={e => onChange({ items: toLines(e.target.value) })} /></Field>}</FieldGrid></div>}</div>;
}

function SchoolMediaStudio({
  focusFeatureId,
  draft,
  mediaAssets,
  mediaUploading,
  onUpload,
  onRefresh,
  onUpdateAsset,
  onArchiveAsset,
  onRestoreAsset,
  onUseAsset,
  onUpdateTheme,
  onUpdateDraft,
  onUpdateSection,
  onRemoveGallery,
  onMoveGallery
}: {
  focusFeatureId?: string | null;
  draft: SiteDraft;
  mediaAssets: SchoolMediaAsset[];
  mediaUploading: 'hero' | 'gallery' | 'logo' | null;
  onUpload: (kind: 'hero' | 'gallery' | 'logo', file: File | null) => Promise<void>;
  onRefresh: () => Promise<void>;
  onUpdateAsset: (assetId: string, patch: Pick<SchoolMediaAsset, 'caption' | 'altText' | 'category' | 'displayOrder'>) => Promise<void>;
  onArchiveAsset: (assetId: string) => Promise<void>;
  onRestoreAsset: (assetId: string) => Promise<void>;
  onUseAsset: (asset: SchoolMediaAsset, target: 'hero' | 'logo' | 'gallery') => void;
  onUpdateTheme: (key: string, value: any) => void;
  onUpdateDraft: <K extends keyof SiteDraft>(key: K, value: SiteDraft[K]) => void;
  onUpdateSection: (key: string, patch: Partial<PublicSiteSection>) => void;
  onRemoveGallery: (index: number) => void;
  onMoveGallery: (index: number, direction: -1 | 1) => void;
}) {
  const gallery = draft.sections.find(section => section.key === 'gallery') || sectionDefaults.gallery;
  const galleryItems = gallery.items || [];
  const heroPreview = resolveSchoolMediaPreview(draft.theme.heroImageUrl, mediaAssets);
  const logoPreview = resolveSchoolMediaPreview(draft.logoUrl, mediaAssets);
  const abbreviation = (draft.shortName || draft.schoolDisplayName || 'ED')
    .split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  const choose = (kind: 'hero' | 'gallery' | 'logo') => (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    void onUpload(kind, file);
    event.currentTarget.value = '';
  };

  return <div className="space-y-7">
    <SectionHeader
      icon={Images}
      eyebrow="Media & visual storytelling"
      title="Give the school a real campus presence, not a template appearance."
      text="Upload the official logo, a cinematic homepage banner and authentic school gallery photographs. Images are optimized before upload and stored first in the school’s isolated private cloud library."
    />

    <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <div id="edx-studio-banner-media" className="scroll-mt-24 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-950 shadow-xl">
        <div className="relative min-h-[300px] overflow-hidden sm:aspect-[16/8]">
          {heroPreview
            ? <img src={heroPreview} alt="Current school banner" className="absolute inset-0 h-full w-full object-cover" />
            : <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(56,189,248,.35),transparent_34%),radial-gradient(circle_at_82%_70%,rgba(139,92,246,.38),transparent_38%),linear-gradient(135deg,#061427,#090b22_55%,#171236)]" />}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/15 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-300">Homepage banner</div>
            <div className="mt-2 text-2xl font-black tracking-tight">{draft.schoolDisplayName || 'Your School'}</div>
            <p className="mt-2 max-w-xl text-xs leading-6 text-slate-300">Use a wide campus, learning or institutional photograph with a clear focal point.</p>
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t border-white/10 bg-white/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-[10px] leading-5 text-slate-400">Optimized to WEBP. Maximum source size: 10 MB.</div>
          <div className="flex flex-wrap gap-2">
            {draft.theme.heroImageUrl && <button type="button" onClick={() => onUpdateTheme('heroImageUrl', '')} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-black text-rose-200 hover:bg-rose-500/10"><Trash2 className="mr-1.5 inline h-3.5 w-3.5" />Remove</button>}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[10px] font-black text-slate-950 shadow-lg transition hover:-translate-y-0.5">
              <UploadCloud className={`h-4 w-4 ${mediaUploading === 'hero' ? 'animate-pulse' : ''}`} />
              {mediaUploading === 'hero' ? 'Uploading…' : draft.theme.heroImageUrl ? 'Replace Banner' : 'Upload Banner'}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={mediaUploading !== null} onChange={choose('hero')} />
            </label>
          </div>
        </div>
      </div>

      <div id="edx-studio-logo-media" className="scroll-mt-24 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-cyan-100 to-violet-100 text-cyan-700"><ImagePlus className="h-6 w-6" /></div>
          <div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-700">Institution identity</div><h3 className="mt-2 text-xl font-black tracking-tight text-slate-950">Official school logo</h3><p className="mt-2 text-xs leading-6 text-slate-500">A transparent PNG or clean square image gives the header, login and portal a finished institutional identity.</p></div>
        </div>
        <div className="mt-6 flex items-center gap-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          {logoPreview
            ? <img src={logoPreview} alt="School logo" className="h-24 w-24 rounded-3xl border border-white bg-white object-contain p-3 shadow-lg" />
            : <div className="grid h-24 w-24 place-items-center rounded-3xl bg-gradient-to-br from-cyan-400 to-violet-500 text-2xl font-black text-slate-950 shadow-lg">{abbreviation}</div>}
          <div className="min-w-0 flex-1 space-y-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-[10px] font-black text-white shadow-lg">
              <UploadCloud className={`h-4 w-4 ${mediaUploading === 'logo' ? 'animate-pulse' : ''}`} />
              {mediaUploading === 'logo' ? 'Uploading…' : draft.logoUrl ? 'Replace Logo' : 'Upload Logo'}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={mediaUploading !== null} onChange={choose('logo')} />
            </label>
            {draft.logoUrl && <button type="button" onClick={() => onUpdateDraft('logoUrl', '')} className="block text-[10px] font-black text-rose-600">Remove logo</button>}
          </div>
        </div>
      </div>
    </div>

    <div id="edx-studio-gallery-media" className="scroll-mt-24 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-700">School photo gallery</div><h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Show authentic campus life.</h3><p className="mt-2 max-w-2xl text-xs leading-6 text-slate-500">Upload classrooms, activities, celebrations, facilities and achievements. The first six images create the homepage gallery; up to 18 can be stored in the draft.</p></div>
        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-5 py-3 text-xs font-black text-white shadow-lg transition hover:-translate-y-0.5">
          <ImagePlus className={`h-4 w-4 ${mediaUploading === 'gallery' ? 'animate-pulse' : ''}`} />
          {mediaUploading === 'gallery' ? 'Uploading photo…' : 'Add Gallery Photo'}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={mediaUploading !== null} onChange={choose('gallery')} />
        </label>
      </div>

      {galleryItems.length === 0
        ? <div className="mt-6 grid min-h-[260px] place-items-center rounded-[1.5rem] border border-dashed border-slate-300 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,.12),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,.12),transparent_38%),#f8fafc] p-10 text-center"><div><Images className="mx-auto h-12 w-12 text-slate-300" /><h4 className="mt-4 text-lg font-black text-slate-900">No school photographs added yet</h4><p className="mx-auto mt-2 max-w-md text-xs leading-6 text-slate-500">Add real school photographs here. Classtago will never pretend that stock images are your campus.</p></div></div>
        : <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {galleryItems.map((url, index) => <div key={`${url}-${index}`} className="group overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-sm">
              <div className="relative aspect-[4/3] overflow-hidden"><img src={resolveSchoolMediaPreview(url, mediaAssets) || url} alt={`Gallery draft ${index + 1}`} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /><div className="absolute left-3 top-3 rounded-full bg-slate-950/70 px-2.5 py-1 text-[9px] font-black text-white backdrop-blur">#{index + 1}</div></div>
              <div className="flex items-center justify-between gap-2 p-3"><div className="text-[10px] font-bold text-slate-400">Homepage order</div><div className="flex gap-1"><button type="button" disabled={index === 0} onClick={() => onMoveGallery(index, -1)} className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-white disabled:opacity-25"><ArrowUp className="h-3.5 w-3.5" /></button><button type="button" disabled={index === galleryItems.length - 1} onClick={() => onMoveGallery(index, 1)} className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-white disabled:opacity-25"><ArrowDown className="h-3.5 w-3.5" /></button><button type="button" onClick={() => onRemoveGallery(index)} className="grid h-8 w-8 place-items-center rounded-lg bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"><Trash2 className="h-3.5 w-3.5" /></button></div></div>
            </div>)}
          </div>}
      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900"><strong>Publishing rule:</strong> new uploads remain in private school storage. Public copies are created only when the Headmaster publishes the website.</div>
    </div>

    <MediaLibraryPanel
      focusFeatureId={focusFeatureId}
      assets={mediaAssets}
      onRefresh={onRefresh}
      onUpdateAsset={onUpdateAsset}
      onArchiveAsset={onArchiveAsset}
      onRestoreAsset={onRestoreAsset}
      onUseAsset={onUseAsset}
    />
  </div>;
}

function MediaLibraryPanel({
  focusFeatureId,
  assets,
  onRefresh,
  onUpdateAsset,
  onArchiveAsset,
  onRestoreAsset,
  onUseAsset
}: {
  focusFeatureId?: string | null;
  assets: SchoolMediaAsset[];
  onRefresh: () => Promise<void>;
  onUpdateAsset: (assetId: string, patch: Pick<SchoolMediaAsset, 'caption' | 'altText' | 'category' | 'displayOrder'>) => Promise<void>;
  onArchiveAsset: (assetId: string) => Promise<void>;
  onRestoreAsset: (assetId: string) => Promise<void>;
  onUseAsset: (asset: SchoolMediaAsset, target: 'hero' | 'logo' | 'gallery') => void;
}) {
  const [filter, setFilter] = useState<'all' | 'draft' | 'published' | 'archived'>('all');
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [archiveCandidate, setArchiveCandidate] = useState<SchoolMediaAsset | null>(null);
  const [edit, setEdit] = useState({ caption: '', altText: '', category: '', displayOrder: 100 });

  useEffect(() => { if (focusFeatureId === 'media-archive-restore') setFilter('archived'); else if (focusFeatureId === 'media-usage-audit') setFilter('all'); }, [focusFeatureId]);

  const visible = assets.filter(asset => {
    const matchesFilter = filter === 'all' || asset.status === filter;
    const haystack = `${asset.originalFilename} ${asset.caption} ${asset.altText} ${asset.category}`.toLowerCase();
    return matchesFilter && haystack.includes(query.trim().toLowerCase());
  });
  const counts = {
    all: assets.length,
    draft: assets.filter(asset => asset.status === 'draft').length,
    published: assets.filter(asset => asset.status === 'published').length,
    archived: assets.filter(asset => asset.status === 'archived').length
  };

  const beginEdit = (asset: SchoolMediaAsset) => {
    setEditingId(asset.id);
    setEdit({ caption: asset.caption, altText: asset.altText, category: asset.category, displayOrder: asset.displayOrder });
  };
  const saveEdit = async (assetId: string) => {
    setWorking(assetId);
    try { await onUpdateAsset(assetId, edit); setEditingId(null); } catch { /* parent displays the exact server error */ } finally { setWorking(null); }
  };
  const archive = async (assetId: string) => {
    setWorking(assetId);
    try { await onArchiveAsset(assetId); setArchiveCandidate(null); } catch { /* parent displays the exact server error */ } finally { setWorking(null); }
  };
  const restore = async (assetId: string) => {
    setWorking(assetId);
    try { await onRestoreAsset(assetId); } catch { /* parent displays the exact server error */ } finally { setWorking(null); }
  };

  return <div id={focusFeatureId === 'media-archive-restore' ? 'edx-studio-media-archive-restore' : focusFeatureId === 'media-usage-audit' ? 'edx-studio-media-usage-audit' : 'edx-studio-media-library'} className="scroll-mt-24 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
    <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,.13),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,.12),transparent_36%),#f8fafc] p-5 sm:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-700"><HardDrive className="h-4 w-4" />Permanent cloud media library</div><h3 className="mt-3 text-2xl font-black tracking-tight text-slate-950">Every original, publication state and recovery action in one place.</h3><p className="mt-2 max-w-3xl text-xs leading-6 text-slate-500">Draft images stay private. Headmaster publication creates stable public copies. Used media cannot be archived accidentally, and archived originals can be restored.</p></div>
        <button type="button" onClick={() => void onRefresh()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700 shadow-sm"><RefreshCw className="h-4 w-4" />Refresh Library</button>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-4">{(['all','draft','published','archived'] as const).map(key => <button type="button" key={key} onClick={() => setFilter(key)} className={`rounded-2xl border p-4 text-left transition ${filter === key ? 'border-slate-950 bg-slate-950 text-white shadow-lg' : 'border-slate-200 bg-white text-slate-700'}`}><div className="text-2xl font-black">{counts[key]}</div><div className={`mt-1 text-[10px] font-black uppercase tracking-[0.15em] ${filter === key ? 'text-cyan-300' : 'text-slate-400'}`}>{key}</div></button>)}</div>
      <label className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"><Search className="h-4 w-4 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search file name, caption, alt text or category" className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-900 outline-none" />{query && <button type="button" onClick={() => setQuery('')}><X className="h-4 w-4 text-slate-400" /></button>}</label>
    </div>

    {visible.length === 0 ? <div className="grid min-h-[240px] place-items-center p-10 text-center"><div><Images className="mx-auto h-10 w-10 text-slate-300" /><h4 className="mt-4 font-black text-slate-900">No media matches this view</h4><p className="mt-2 text-xs text-slate-500">Upload an official school image or change the filter.</p></div></div>
      : <div className="grid gap-4 p-4 sm:p-6 md:grid-cols-2 xl:grid-cols-3">{visible.map(asset => {
          const statusClass = asset.status === 'published' ? 'bg-emerald-500/90 text-white' : asset.status === 'archived' ? 'bg-slate-700/90 text-white' : 'bg-amber-400/95 text-slate-950';
          return <article key={asset.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="relative aspect-[4/3] overflow-hidden bg-slate-950">{asset.previewUrl ? <img src={asset.previewUrl} alt={asset.altText || asset.caption || asset.originalFilename} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><ImageIcon className="h-9 w-9 text-white/20" /></div>}<span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide backdrop-blur ${statusClass}`}>{asset.status}</span>{(asset.usedInDraft || asset.usedInPublished) && <span className="absolute right-3 top-3 rounded-full bg-cyan-500/90 px-2.5 py-1 text-[9px] font-black text-slate-950 backdrop-blur">IN USE</span>}</div>
            <div className="p-4"><div className="truncate text-sm font-black text-slate-900" title={asset.originalFilename}>{asset.originalFilename}</div><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-400"><span>{asset.kind}</span><span>{asset.width && asset.height ? `${asset.width}×${asset.height}` : 'Dimensions unavailable'}</span><span>{Math.max(1, Math.round(asset.sizeBytes / 1024))} KB</span></div>
              {editingId === asset.id ? <div className="mt-4 space-y-2"><input value={edit.category} onChange={e => setEdit(value => ({ ...value, category: e.target.value }))} placeholder="Category" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-cyan-500" /><input value={edit.caption} onChange={e => setEdit(value => ({ ...value, caption: e.target.value }))} placeholder="Public caption" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-cyan-500" /><textarea rows={2} value={edit.altText} onChange={e => setEdit(value => ({ ...value, altText: e.target.value }))} placeholder="Accessibility alt text" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-cyan-500" /><div className="flex gap-2"><button type="button" disabled={working === asset.id} onClick={() => void saveEdit(asset.id)} className="flex-1 rounded-xl bg-slate-950 px-3 py-2 text-[10px] font-black text-white">{working === asset.id ? 'Saving…' : 'Save Details'}</button><button type="button" onClick={() => setEditingId(null)} className="rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-black text-slate-600">Cancel</button></div></div>
                : <><p className="mt-3 min-h-[38px] text-xs leading-5 text-slate-500">{asset.caption || 'No caption yet.'}</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => onUseAsset(asset, 'hero')} className="rounded-lg bg-cyan-50 px-2.5 py-2 text-[9px] font-black text-cyan-800">Use as Banner</button><button type="button" onClick={() => onUseAsset(asset, 'logo')} className="rounded-lg bg-violet-50 px-2.5 py-2 text-[9px] font-black text-violet-800">Use as Logo</button><button type="button" onClick={() => onUseAsset(asset, 'gallery')} className="rounded-lg bg-slate-100 px-2.5 py-2 text-[9px] font-black text-slate-700">Add to Gallery</button></div><div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3"><button type="button" onClick={() => beginEdit(asset)} className="inline-flex items-center gap-1.5 text-[10px] font-black text-slate-600"><Pencil className="h-3.5 w-3.5" />Edit details</button>{asset.status === 'archived' ? <button type="button" disabled={working === asset.id} onClick={() => void restore(asset.id)} className="inline-flex items-center gap-1.5 text-[10px] font-black text-emerald-700"><RotateCcw className="h-3.5 w-3.5" />Restore</button> : <button type="button" disabled={working === asset.id || asset.usedInDraft || asset.usedInPublished} onClick={() => setArchiveCandidate(asset)} className="inline-flex items-center gap-1.5 text-[10px] font-black text-rose-600 disabled:cursor-not-allowed disabled:opacity-35" title={asset.usedInDraft || asset.usedInPublished ? 'Remove this media, Save Draft, and publish the replacement before archiving.' : 'Archive safely'}><Archive className="h-3.5 w-3.5" />Archive</button>}</div></>}
            </div>
          </article>;
        })}</div>}

    {archiveCandidate && <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Archive school media">
      <div className="w-full max-w-md overflow-hidden rounded-[1.75rem] border border-white/10 bg-white shadow-2xl">
        <div className="edx-dark-contrast-surface bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,.18),transparent_38%),#0f172a] p-6 text-white"><div className="flex items-start gap-4"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-rose-500/15 text-rose-300"><Archive className="h-6 w-6" /></div><div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-300">Recoverable archive</div><h4 className="mt-2 text-xl font-black">Archive this media asset?</h4><p className="mt-2 text-xs leading-6 text-slate-300">The cloud original will be preserved and can be restored. Classtago will block the action if the image is still used by a saved draft or the live website.</p></div></div></div>
        <div className="p-6"><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="truncate text-sm font-black text-slate-900">{archiveCandidate.originalFilename}</div><div className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">{archiveCandidate.kind} · {archiveCandidate.category}</div></div><div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setArchiveCandidate(null)} disabled={working === archiveCandidate.id} className="rounded-xl border border-slate-200 px-4 py-3 text-xs font-black text-slate-600">Keep Media</button><button type="button" onClick={() => void archive(archiveCandidate.id)} disabled={working === archiveCandidate.id} className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-xs font-black text-white shadow-lg disabled:opacity-50">{working === archiveCandidate.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}{working === archiveCandidate.id ? 'Archiving…' : 'Archive Safely'}</button></div></div>
      </div>
    </div>}
  </div>;
}

