import React, { useEffect, useMemo, useState } from 'react';
import { Blocks, FileSpreadsheet, ShieldCheck, Upload, Download, Link2, Search, CheckCircle2, AlertTriangle, FileText, QrCode, Mail, Share2, Check, Sparkles, Eye } from 'lucide-react';
import * as XLSX from 'xlsx';
import CertificateDocumentSystem from './CertificateDocumentSystem';
import { Language, User as UserType } from '../types';
import { LocalERPDatabase, supabase } from '../lib/supabase';
import { SchoolBrandMark, SchoolSealMark } from './SchoolBrandMarks';
import { CERTIFICATE_LANGUAGE_OPTIONS, CERTIFICATE_LANGUAGE_STORAGE_KEY, CERTIFICATE_STUDENT_GR_STORAGE_KEY, CERTIFICATE_TEMPLATE_PRESETS, CERTIFICATE_TEMPLATE_STORAGE_KEY, DEFAULT_CERTIFICATE_TEMPLATE_ID, type CertificateTemplatePreset } from '../lib/certificateCatalog';

interface Props {
  lang: Language;
  user: UserType;
  onRefreshData?: () => void;
  activeFeatureId?: string | null;
  focusedTitle?: string;
}

type StudioPanel = 'studio' | 'templates' | 'bulk' | 'verify' | 'distribution' | 'vault';

const FEATURE_PANEL: Record<string, StudioPanel> = {
  'cl-certificate-studio': 'studio',
  'cl-certificate-template-builder': 'studio',
  'cl-certificate-bulk-generation': 'bulk',
  'cl-certificate-verification': 'verify',
  'cl-certificate-distribution': 'distribution',
  'cl-certificate-register': 'distribution',
  'cl-document-vault': 'vault',
};

const PLACEHOLDERS = [
  '{{student_name}}', '{{gr_number}}', '{{class}}', '{{division}}', '{{dob}}', '{{father_name}}', '{{mother_name}}', '{{academic_year}}', '{{issue_date}}', '{{certificate_id}}'
];

interface BulkRow {
  grNumber: string;
  certificateType: string;
  purpose: string;
  expiryDate?: string;
  status?: 'ready' | 'missing-student' | 'invalid-type' | 'sent' | 'error';
  message?: string;
}

const VALID_CERT_TYPES = new Set(['bonafide', 'study', 'character', 'leaving', 'custom']);

const yearToken = (student: any) => String(student?.academicYearId || student?.academicYear || '').trim();
const classToken = (student: any) => String(student?.classId || student?.className || '').trim();
const divisionToken = (student: any) => String(student?.divisionId || student?.divisionName || student?.division || '').trim() || '__NO_DIVISION__';

function TemplatePreview({ preset, schoolName, managementName, officialLogo, studentName, languageLabel, large = false }: {
  preset: CertificateTemplatePreset;
  schoolName: string;
  managementName: string;
  officialLogo?: string;
  studentName: string;
  languageLabel: string;
  large?: boolean;
}) {
  const isPortrait = preset.orientation === 'portrait';
  const frameClass = `${large ? (isPortrait ? 'h-[520px] max-w-[370px]' : 'h-[360px] max-w-[640px]') : 'h-52 w-full'} relative mx-auto overflow-hidden rounded-xl shadow-inner`;
  const common = { background: preset.background, color: preset.foreground } as React.CSSProperties;
  const title = preset.officialLc ? 'LEAVING CERTIFICATE' : preset.layout === 'school-geometric' ? 'CERTIFICATE OF ACHIEVEMENT' : preset.layout === 'midnight-gold' ? 'CERTIFICATE OF DISTINCTION' : 'CERTIFICATE OF EXCELLENCE';

  return (
    <div className={frameClass} style={common} dir={['Urdu', 'Kashmiri', 'Sindhi'].includes(languageLabel) ? 'rtl' : 'ltr'}>
      {preset.layout === 'official-lc' && <>
        <div className="absolute inset-3 rounded-md border-[5px] border-double" style={{ borderColor: preset.accent }} />
        <div className="absolute left-6 right-6 top-7 flex items-center gap-3">
          <SchoolBrandMark className="h-12 w-12 shrink-0" imageUrl={officialLogo} schoolName={schoolName} managementName={managementName} />
          <div className="min-w-0 flex-1 text-center"><p className="text-[7px] font-bold">{managementName}</p><p className="truncate text-sm font-black tracking-wide" style={{ color: preset.accent }}>{schoolName.toUpperCase()}</p><p className="text-[6px]">Official school record</p></div>
        </div>
        <div className="absolute left-7 right-7 top-[88px] border-y py-1 text-center text-[10px] font-black tracking-[.15em]" style={{ borderColor: preset.accent, color: preset.accent }}>{title}</div>
        <div className="absolute left-8 right-8 top-[120px] space-y-2 text-[6px] opacity-80">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-px" style={{ background: i % 2 ? '#d7c5c9' : '#cab6bc' }} />)}</div>
        <div className="absolute bottom-7 left-8 right-8 flex justify-between text-[6px] font-bold"><span>Class Teacher</span><span>Clerk</span><span>Headmaster</span></div>
      </>}

      {preset.layout === 'midnight-gold' && <>
        <div className="absolute -left-14 -top-14 h-40 w-40 rounded-[44%] border-[7px]" style={{ borderColor: preset.accent }} />
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-[45%] border-[7px]" style={{ borderColor: preset.accent }} />
        <div className="absolute -bottom-20 -left-16 h-48 w-48 rounded-[45%] border-[7px]" style={{ borderColor: preset.accent }} />
        <div className="absolute -bottom-20 -right-16 h-48 w-48 rounded-[45%] border-[7px]" style={{ borderColor: preset.accent }} />
      </>}

      {preset.layout === 'school-geometric' && <>
        <div className="absolute -left-12 -top-10 h-32 w-40 rotate-12 bg-[#214e91]" />
        <div className="absolute -left-3 top-0 h-24 w-6 -rotate-[35deg]" style={{ background: preset.secondary }} />
        <div className="absolute -right-12 -bottom-10 h-32 w-40 rotate-12 bg-[#214e91]" />
        <div className="absolute right-4 top-3 h-12 w-9 bg-[#243d82]" /><div className="absolute right-2 top-5 h-10 w-10 rounded-full border-4" style={{ background: preset.secondary, borderColor: '#f7df95' }} />
      </>}

      {preset.layout === 'institutional-crest' && <>
        <div className="absolute left-5 right-5 top-0 h-24 bg-[#14365a]" style={{ clipPath: 'polygon(0 0,100% 0,100% 66%,70% 90%,50% 100%,30% 90%,0 66%)' }} />
        <div className="absolute left-3 right-3 top-3 bottom-3 border-[5px]" style={{ borderColor: preset.secondary }} />
        <div className="absolute left-1/2 top-16 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full border-[5px] text-xl font-black" style={{ borderColor: preset.secondary, background: '#14365a', color: preset.secondary }}>★</div>
      </>}

      {preset.layout === 'ornate-heritage' && <>
        <div className="absolute inset-3 border" style={{ borderColor: preset.accent }} />
        {['left-3 top-0','right-3 top-0','left-3 bottom-0','right-3 bottom-0'].map((pos, i) => <div key={pos} className={`absolute ${pos} text-5xl leading-none ${i % 2 ? '-scale-x-100' : ''}`} style={{ color: preset.accent, transform: `${i > 1 ? 'scaleY(-1)' : ''} ${i % 2 ? 'scaleX(-1)' : ''}` }}>❦</div>)}
        <div className="absolute left-1/2 top-3 -translate-x-1/2 text-xl" style={{ color: preset.accent }}>◆</div>
      </>}

      {preset.layout === 'emerald-modern' && <>
        <div className="absolute -left-14 top-0 h-full w-32 -skew-x-12" style={{ background: preset.accent }} />
        <div className="absolute left-7 top-0 h-full w-2 -skew-x-12" style={{ background: preset.secondary }} />
        <div className="absolute right-4 top-4 bottom-4 w-px" style={{ background: preset.accent }} />
      </>}

      {preset.layout === 'maroon-classic' && <>
        <div className="absolute inset-3 border-[5px] border-double" style={{ borderColor: preset.accent }} />
        <div className="absolute left-7 top-7 h-8 w-8 border-l-4 border-t-4" style={{ borderColor: preset.secondary }} /><div className="absolute right-7 top-7 h-8 w-8 border-r-4 border-t-4" style={{ borderColor: preset.secondary }} /><div className="absolute bottom-7 left-7 h-8 w-8 border-b-4 border-l-4" style={{ borderColor: preset.secondary }} /><div className="absolute bottom-7 right-7 h-8 w-8 border-b-4 border-r-4" style={{ borderColor: preset.secondary }} />
      </>}

      {preset.layout === 'minimal-clean' && <>
        <div className="absolute inset-4 border border-slate-400" /><div className="absolute left-7 right-7 top-7 h-1 bg-slate-700" />
      </>}

      {preset.layout === 'urdu-heritage' && <>
        <div className="absolute inset-3 border-[5px] border-double" style={{ borderColor: preset.accent }} />
        <div className="absolute left-3 right-3 top-3 h-7" style={{ background: preset.secondary }} /><div className="absolute bottom-3 left-3 right-3 h-5" style={{ background: preset.accent }} />
      </>}

      {!preset.officialLc && <div className={`relative z-10 flex h-full flex-col items-center justify-center px-12 text-center ${preset.layout === 'institutional-crest' ? 'pt-20' : ''}`}>
        {preset.showLogo && preset.layout !== 'institutional-crest' && <SchoolBrandMark className={`${large ? 'h-16 w-16' : 'h-10 w-10'} mb-2`} imageUrl={officialLogo} schoolName={schoolName} managementName={managementName} />}
        <p className={`${large ? 'text-[10px]' : 'text-[7px]'} font-bold uppercase tracking-[.18em] opacity-80`}>{managementName}</p>
        <p className={`${large ? 'text-base' : 'text-[10px]'} mt-1 font-black uppercase tracking-[.08em]`}>{schoolName}</p>
        <h3 className={`${large ? 'mt-6 text-3xl' : 'mt-3 text-sm'} font-black tracking-wide`} style={{ color: preset.layout === 'midnight-gold' || preset.layout === 'ornate-heritage' ? preset.accent : preset.foreground }}>{title}</h3>
        <p className={`${large ? 'mt-5 text-xs' : 'mt-2 text-[7px]'} opacity-75`}>Presented to</p>
        <p className={`${large ? 'mt-2 text-3xl' : 'mt-1 text-lg'} font-semibold`} style={{ fontFamily: 'Georgia, Times New Roman, serif' }}>{studentName || 'Student Name'}</p>
        <div className={`${large ? 'mt-5 max-w-md text-xs leading-5' : 'mt-2 max-w-[80%] text-[7px] leading-3'} opacity-80`}>For outstanding achievement, sincere effort and excellence in the school community.</div>
        <div className={`${large ? 'mt-7 w-52' : 'mt-3 w-24'} border-t pt-1 text-[7px] font-bold`} style={{ borderColor: preset.secondary }}>Authorized Signature</div>
        <span className="absolute bottom-3 right-4 rounded-full bg-black/10 px-2 py-1 text-[6px] font-bold uppercase tracking-wider">{languageLabel}</span>
      </div>}
    </div>
  );
}

async function secureFetch(url: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Secure session unavailable. Please sign in again.');
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
      Authorization: `Bearer ${session.access_token}`,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Request failed.');
  return payload;
}

export default function CertificateStudioHub({ lang, user, onRefreshData, activeFeatureId = null, focusedTitle = 'Certificate Studio & Management' }: Props) {
  const panel = FEATURE_PANEL[activeFeatureId || ''] || 'studio';
  const academicSetup = useMemo(() => LocalERPDatabase.getAcademicSetup(), []);
  const officialLogo = academicSetup?.schoolProfile?.schoolLogo || undefined;
  const schoolName = academicSetup?.schoolProfile?.schoolName || 'National High School Taloda';
  const managementName = academicSetup?.schoolProfile?.managementName || "Bharat Vividh Vidhayak Karya Samiti's";
  const [selectedTemplateId, setSelectedTemplateId] = useState(() => localStorage.getItem(CERTIFICATE_TEMPLATE_STORAGE_KEY) || DEFAULT_CERTIFICATE_TEMPLATE_ID);
  const [templateSaved, setTemplateSaved] = useState(false);
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [studentScopeError, setStudentScopeError] = useState('');
  const [templateYear, setTemplateYear] = useState('');
  const [templateClass, setTemplateClass] = useState('');
  const [templateDivision, setTemplateDivision] = useState('');
  const [templateStudentGr, setTemplateStudentGr] = useState(() => localStorage.getItem(CERTIFICATE_STUDENT_GR_STORAGE_KEY) || '');
  const [templateLanguage, setTemplateLanguage] = useState(() => localStorage.getItem(CERTIFICATE_LANGUAGE_STORAGE_KEY) || 'en');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [verifyId, setVerifyId] = useState('');
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [verification, setVerification] = useState<any | null>(null);
  const [verifyError, setVerifyError] = useState('');

  useEffect(() => {
    if (!CERTIFICATE_TEMPLATE_PRESETS.some((preset) => preset.id === selectedTemplateId)) {
      setSelectedTemplateId(DEFAULT_CERTIFICATE_TEMPLATE_ID);
    }
  }, [selectedTemplateId]);

  // R4 legacy loaded bulk scope from /api/headmaster/student-directory.
  // R4.3 uses a certificate-entitlement-scoped endpoint so Template Studio and Bulk share one cloud source.
  useEffect(() => {
    if (!['templates', 'bulk'].includes(panel)) return;
    let cancelled = false;
    void (async () => {
      try {
        const payload = await secureFetch('/api/admin/certificate-student-scope');
        if (cancelled) return;
        const normalized = Array.isArray(payload.students) ? payload.students.map((student: any) => ({
          ...student,
          name: student.fullName || student.name || 'Student',
          fullName: student.fullName || student.name || 'Student',
          grNumber: String(student.grNumber || '').trim(),
          academicYear: student.academicYear || '',
          academicYearId: student.academicYearId || '',
          className: student.className || '',
          classId: student.classId || '',
          divisionName: student.divisionName || student.division || '',
          divisionId: student.divisionId || '',
        })) : [];
        setStudents(normalized);
        setStudentScopeError('');
      } catch (error: any) {
        if (!cancelled) {
          setStudents([]);
          setStudentScopeError(error?.message || 'Student scope could not be loaded.');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [panel]);

  const studentByGr = useMemo(() => new Map(students.map((s: any) => [String(s.grNumber || '').trim(), s])), [students]);
  const templateYearOptions = useMemo(() => {
    const map = new Map<string, string>();
    students.forEach((student: any) => {
      const token = yearToken(student);
      if (token) map.set(token, String(student.academicYear || student.academicYearId || token));
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label })).sort((a, b) => b.label.localeCompare(a.label, undefined, { numeric: true }));
  }, [students]);
  const templateClassOptions = useMemo(() => {
    const map = new Map<string, string>();
    students.filter((student: any) => !templateYear || yearToken(student) === templateYear).forEach((student: any) => {
      const token = classToken(student);
      if (token) map.set(token, String(student.className || student.classId || token));
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  }, [students, templateYear]);
  const templateDivisionOptions = useMemo(() => {
    const values = new Set<string>();
    students.filter((student: any) => (!templateYear || yearToken(student) === templateYear) && (!templateClass || classToken(student) === templateClass)).forEach((student: any) => values.add(divisionToken(student)));
    return Array.from(values).sort((a, b) => a === '__NO_DIVISION__' ? -1 : b === '__NO_DIVISION__' ? 1 : a.localeCompare(b, undefined, { numeric: true }));
  }, [students, templateYear, templateClass]);
  const templateStudentOptions = useMemo(() => students.filter((student: any) =>
    (!templateYear || yearToken(student) === templateYear) &&
    (!templateClass || classToken(student) === templateClass) &&
    (!templateDivision || divisionToken(student) === templateDivision)
  ).sort((a: any, b: any) => String(a.fullName || a.name || '').localeCompare(String(b.fullName || b.name || ''))), [students, templateYear, templateClass, templateDivision]);
  const selectedTemplateStudent = useMemo(() => templateStudentOptions.find((student: any) => String(student.grNumber) === templateStudentGr) || students.find((student: any) => String(student.grNumber) === templateStudentGr) || null, [templateStudentOptions, students, templateStudentGr]);
  const selectedTemplate = useMemo(() => CERTIFICATE_TEMPLATE_PRESETS.find((preset) => preset.id === selectedTemplateId) || CERTIFICATE_TEMPLATE_PRESETS[0], [selectedTemplateId]);
  const templateLanguageOption = useMemo(() => CERTIFICATE_LANGUAGE_OPTIONS.find((item) => item.code === templateLanguage) || CERTIFICATE_LANGUAGE_OPTIONS[0], [templateLanguage]);

  useEffect(() => {
    if (!students.length) return;
    const preferred = students.find((student: any) => String(student.grNumber) === templateStudentGr) || students[0];
    const y = templateYear || yearToken(preferred);
    const c = templateClass || classToken(preferred);
    const d = templateDivision || divisionToken(preferred);
    setTemplateYear(y);
    setTemplateClass(c);
    setTemplateDivision(d);
    if (!templateStudentGr) setTemplateStudentGr(String(preferred.grNumber || ''));
  }, [students]);

  const chooseTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    localStorage.setItem(CERTIFICATE_TEMPLATE_STORAGE_KEY, templateId);
    setTemplateSaved(true);
  };

  const chooseTemplateLanguage = (code: string) => {
    setTemplateLanguage(code);
    localStorage.setItem(CERTIFICATE_LANGUAGE_STORAGE_KEY, code);
    setTemplateSaved(true);
  };

  const chooseTemplateStudent = (grNumber: string) => {
    setTemplateStudentGr(grNumber);
    if (grNumber) localStorage.setItem(CERTIFICATE_STUDENT_GR_STORAGE_KEY, grNumber);
  };

  const downloadBulkTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { gr_number: '1001', certificate_type: 'bonafide', purpose: 'Scholarship', expiry_date: '' },
      { gr_number: '1002', certificate_type: 'leaving', purpose: 'School Transfer', expiry_date: '' },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Certificate Bulk');
    XLSX.writeFile(wb, 'Classtago_Certificate_Bulk_Template.xlsx');
  };

  const handleBulkFile = async (file?: File) => {
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const parsed = XLSX.utils.sheet_to_json<any>(sheet, { defval: '' });
      const rows: BulkRow[] = parsed.map((row: any) => {
        const grNumber = String(row.gr_number ?? row.GR ?? row.grNumber ?? '').trim();
        const certificateType = String(row.certificate_type ?? row.type ?? 'bonafide').trim().toLowerCase();
        const purpose = String(row.purpose ?? '').trim();
        const expiryDate = String(row.expiry_date ?? '').trim();
        return { grNumber, certificateType, purpose, expiryDate, status: VALID_CERT_TYPES.has(certificateType) ? 'ready' : 'invalid-type' };
      });
      setBulkRows(rows);
    } catch (error: any) {
      alert(error?.message || 'Excel/CSV file could not be read.');
    }
  };

  const validateBulkRows = () => {
    setBulkRows(rows => rows.map(row => {
      if (!VALID_CERT_TYPES.has(row.certificateType)) return { ...row, status: 'invalid-type', message: 'Unsupported certificate type' };
      if (!studentByGr.has(row.grNumber)) return { ...row, status: 'missing-student', message: 'GR not found in cloud Student Master' };
      return { ...row, status: 'ready', message: 'Ready for Headmaster approval queue' };
    }));
  };

  const sendBulkForApproval = async () => {
    if (user.role !== 'clerk') {
      alert('Bulk preparation in this Clerk workspace is Clerk-only. Headmaster final issuance remains in the approval workflow.');
      return;
    }
    validateBulkRows();
    const readyRows = bulkRows.filter(row => VALID_CERT_TYPES.has(row.certificateType) && studentByGr.has(row.grNumber));
    if (!readyRows.length) {
      alert('No validated rows are ready. Validate the file first.');
      return;
    }
    setBulkBusy(true);
    const next = [...bulkRows];
    for (const row of readyRows) {
      const idx = next.findIndex(item => item === row || (item.grNumber === row.grNumber && item.certificateType === row.certificateType));
      const student = studentByGr.get(row.grNumber);
      const certNumber = `BULK-DRAFT/${row.certificateType.toUpperCase()}/${row.grNumber}/${Date.now().toString().slice(-6)}`;
      try {
        await secureFetch('/api/clerk/certificate-requests', {
          method: 'POST',
          body: JSON.stringify({ certificate: {
            grNumber: row.grNumber,
            studentName: student?.fullName || student?.name || 'Student',
            certificateType: row.certificateType,
            certificateNumber: certNumber,
            issueDate: new Date().toISOString().slice(0, 10),
            purpose: row.purpose,
            expiryDate: row.expiryDate || '',
            preparedBy: `${user.name} (CLERK)`,
            language: 'en',
            officialMode: false,
          } }),
        });
        if (idx >= 0) next[idx] = { ...next[idx], status: 'sent', message: 'Sent to Headmaster approval queue' };
      } catch (error: any) {
        if (idx >= 0) next[idx] = { ...next[idx], status: 'error', message: error?.message || 'Request failed' };
      }
      setBulkRows([...next]);
    }
    setBulkBusy(false);
  };

  const verifyCertificate = async () => {
    const value = verifyId.trim();
    if (!value) return;
    setVerifyBusy(true);
    setVerification(null);
    setVerifyError('');
    try {
      const response = await fetch(`/api/public/certificates/verify/${encodeURIComponent(value)}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Certificate not found.');
      setVerification(payload.certificate || payload);
    } catch (error: any) {
      setVerifyError(error?.message || 'Certificate could not be verified.');
    } finally {
      setVerifyBusy(false);
    }
  };

  if (panel === 'studio') {
    return <CertificateDocumentSystem lang={lang} user={user} onRefreshData={onRefreshData} activeFeatureId="cl-certificate-bonafide" focusedMode focusedTitle="Certificate Studio & Management" />;
  }
  if (panel === 'vault') {
    return <CertificateDocumentSystem lang={lang} user={user} onRefreshData={onRefreshData} activeFeatureId="cl-document-vault" focusedMode focusedTitle="Certificate Document Vault" />;
  }
  if (panel === 'distribution') {
    return <CertificateDocumentSystem lang={lang} user={user} onRefreshData={onRefreshData} activeFeatureId="cl-document-issue-history" focusedMode focusedTitle="Distribution, Reissue & Certificate Register" />;
  }

  return (
    <div className="space-y-5 text-left">
      <div className="rounded-2xl bg-slate-950 p-5 text-white shadow-lg">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">Certificate Studio & Management</div>
            <h1 className="mt-1 text-xl font-black">{focusedTitle}</h1>
            <p className="mt-1 max-w-3xl text-xs text-slate-300">One canonical certificate workspace. Clerk prepares and validates; Headmaster remains the final official authority.</p>
          </div>
          <div className="flex items-center gap-3">
            <SchoolBrandMark className="h-20 w-20" imageUrl={officialLogo} schoolName={schoolName} managementName={managementName} />
            <SchoolSealMark className="h-16 w-16 text-violet-300 opacity-80" />
          </div>
        </div>
      </div>

      {panel === 'templates' && (
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2"><Blocks className="h-5 w-5 text-indigo-600"/><h2 className="font-black text-slate-900">Ready-made Certificate Templates — Premium Gallery</h2></div>
                <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">Choose a professional finished layout, preview it with a real student, choose the certificate language, then use the same selections in Certificate Studio.</p>
              </div>
              <div className="rounded-xl bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-700">Student → Language → Template → Generate</div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2"><Search className="h-4 w-4 text-indigo-600"/><h3 className="text-sm font-black text-slate-900">Preview Student & Language</h3></div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <label className="space-y-1 text-[10px] font-bold text-slate-500"><span>Academic Year</span><select value={templateYear} onChange={e => { setTemplateYear(e.target.value); setTemplateClass(''); setTemplateDivision(''); chooseTemplateStudent(''); }} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"><option value="">Select Year</option>{templateYearOptions.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <label className="space-y-1 text-[10px] font-bold text-slate-500"><span>Class</span><select value={templateClass} disabled={!templateYear} onChange={e => { setTemplateClass(e.target.value); setTemplateDivision(''); chooseTemplateStudent(''); }} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 disabled:bg-slate-100"><option value="">Select Class</option>{templateClassOptions.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <label className="space-y-1 text-[10px] font-bold text-slate-500"><span>Division</span><select value={templateDivision} disabled={!templateClass} onChange={e => { setTemplateDivision(e.target.value); chooseTemplateStudent(''); }} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 disabled:bg-slate-100"><option value="">Select Division</option>{templateDivisionOptions.map(item => <option key={item} value={item}>{item === '__NO_DIVISION__' ? 'No Division' : item}</option>)}</select></label>
              <label className="space-y-1 text-[10px] font-bold text-slate-500"><span>Student</span><select value={templateStudentGr} disabled={!templateDivision} onChange={e => chooseTemplateStudent(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 disabled:bg-slate-100"><option value="">Select Student</option>{templateStudentOptions.map((student: any) => <option key={student.id || student.grNumber} value={student.grNumber}>{student.fullName || student.name} — GR {student.grNumber}</option>)}</select></label>
              <label className="space-y-1 text-[10px] font-bold text-slate-500"><span>Certificate Language</span><select value={templateLanguage} onChange={e => chooseTemplateLanguage(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">{CERTIFICATE_LANGUAGE_OPTIONS.map(option => <option key={option.code} value={option.code}>{option.name} — {option.nativeName}</option>)}</select></label>
            </div>
            {studentScopeError && <div className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">Student list could not load: {studentScopeError}</div>}
            {!studentScopeError && students.length === 0 && <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">No active students are available in the cloud Student Master.</div>}
            {templateDivision && templateStudentOptions.length === 0 && <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">No active students found for this Year / Class / Division.</div>}
          </section>

          <section className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,.65fr)]">
            <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3"><div><div className="flex items-center gap-2"><Eye className="h-4 w-4 text-indigo-600"/><h3 className="text-sm font-black text-slate-900">Large Live Preview</h3></div><p className="mt-1 text-[11px] text-slate-500">Preview uses the selected student and language before you choose the template.</p></div><span className="rounded-full bg-white px-3 py-1 text-[10px] font-black text-slate-600 shadow-sm">{selectedTemplate.orientation}</span></div>
              <TemplatePreview preset={selectedTemplate} schoolName={schoolName} managementName={managementName} officialLogo={officialLogo} studentName={selectedTemplateStudent?.fullName || selectedTemplateStudent?.name || 'Student Name'} languageLabel={templateLanguageOption.name} large />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="rounded-full bg-indigo-50 px-2 py-1 text-[9px] font-black uppercase text-indigo-700">Selected</span>
              <h3 className="mt-3 text-lg font-black text-slate-900">{selectedTemplate.name}</h3>
              <p className="mt-2 text-xs leading-5 text-slate-500">{selectedTemplate.description}</p>
              <dl className="mt-4 space-y-2 text-xs"><div className="flex justify-between gap-3"><dt className="text-slate-400">Best for</dt><dd className="text-right font-bold text-slate-700">{selectedTemplate.recommendedFor}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-400">Language</dt><dd className="text-right font-bold text-slate-700">{templateLanguageOption.name}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-400">Student</dt><dd className="text-right font-bold text-slate-700">{selectedTemplateStudent?.fullName || selectedTemplateStudent?.name || 'Not selected'}</dd></div></dl>
              <button type="button" onClick={() => chooseTemplate(selectedTemplate.id)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-xs font-black text-white"><Check className="h-4 w-4"/>Use this Template</button>
              <p className="mt-3 text-[10px] leading-4 text-slate-400">The selected student, language and template are carried into Certificate Studio. Leaving Certificate always keeps the protected official LC structure.</p>
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {CERTIFICATE_TEMPLATE_PRESETS.map((preset) => {
              const selected = preset.id === selectedTemplateId;
              return (
                <article key={preset.id} className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${selected ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-slate-200 hover:-translate-y-0.5 hover:shadow-md'}`}>
                  <div className="bg-slate-100 p-3"><TemplatePreview preset={preset} schoolName={schoolName} managementName={managementName} officialLogo={officialLogo} studentName={selectedTemplateStudent?.fullName || selectedTemplateStudent?.name || 'Student Name'} languageLabel={templateLanguageOption.name} /></div>
                  <div className="space-y-3 border-t border-slate-100 p-4">
                    <div><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-black text-slate-900">{preset.name}</h3><span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black uppercase text-slate-500">{preset.category}</span></div><p className="mt-1 text-[11px] leading-5 text-slate-500">{preset.description}</p></div>
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500"><span>{preset.orientation}</span><span>{preset.recommendedFor}</span></div>
                    <button type="button" onClick={() => chooseTemplate(preset.id)} className={`flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-black ${selected ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white hover:bg-indigo-700'}`}>{selected ? <><Check className="h-4 w-4"/>Selected Template</> : <><Sparkles className="h-4 w-4"/>Choose Template</>}</button>
                  </div>
                </article>
              );
            })}
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-black text-slate-900">Dynamic Auto-fill Fields</h2>
            <p className="mt-1 text-xs text-slate-500">These values come from the cloud Student Master automatically after Academic Year → Class → Division → Student selection.</p>
            <div className="mt-4 flex flex-wrap gap-2">{PLACEHOLDERS.map(field => <code key={field} className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-indigo-700">{field}</code>)}</div>
            {templateSaved && <p className="mt-4 text-xs font-bold text-emerald-700">Student / language / template selection saved for Certificate Studio. Leaving Certificate remains locked to the official LC layout.</p>}
          </section>
        </div>
      )}

      {panel === 'bulk' && (
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><div className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-emerald-600"/><h2 className="font-black">Bulk Certificate Generation</h2></div><p className="mt-1 text-xs text-slate-500">Excel/CSV rows are validated against the cloud Student Master. Bulk mode never bypasses Headmaster approval.</p></div><button onClick={downloadBulkTemplate} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black"><Download className="h-4 w-4"/>Download Excel Template</button></div>
            <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-7 text-sm font-bold text-slate-600"><Upload className="h-5 w-5"/>Upload Excel / CSV<input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => void handleBulkFile(e.target.files?.[0])}/></label>
          </section>
          {bulkRows.length > 0 && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-3 flex flex-wrap gap-2"><button onClick={validateBulkRows} className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-black text-white">Validate against Student Master</button><button disabled={bulkBusy} onClick={() => void sendBulkForApproval()} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50">{bulkBusy ? 'Sending…' : 'Send Valid Rows to Headmaster'}</button></div><div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="bg-slate-50 text-left"><th className="p-2">GR</th><th className="p-2">Type</th><th className="p-2">Purpose</th><th className="p-2">Status</th></tr></thead><tbody>{bulkRows.map((row, i) => <tr key={`${row.grNumber}-${i}`} className="border-t"><td className="p-2 font-mono font-bold">{row.grNumber}</td><td className="p-2 uppercase">{row.certificateType}</td><td className="p-2">{row.purpose}</td><td className="p-2"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${row.status === 'sent' ? 'bg-emerald-50 text-emerald-700' : row.status === 'ready' ? 'bg-blue-50 text-blue-700' : row.status === 'error' || row.status === 'missing-student' || row.status === 'invalid-type' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>{row.message || row.status}</span></td></tr>)}</tbody></table></div></section>}
        </div>
      )}

      {panel === 'verify' && (
        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-600"/><h2 className="font-black">QR / Certificate ID Verification</h2></div><p className="mt-1 text-xs text-slate-500">Enter the exact Certificate ID printed on an officially issued certificate.</p><div className="mt-4 flex gap-2"><input value={verifyId} onChange={e => setVerifyId(e.target.value)} placeholder="e.g. NHS/LC/202627/0001" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono"/><button disabled={verifyBusy} onClick={() => void verifyCertificate()} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white disabled:opacity-50"><Search className="mr-1 inline h-4 w-4"/>{verifyBusy ? 'Checking…' : 'Verify'}</button></div>{verifyError && <div className="mt-4 flex gap-2 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700"><AlertTriangle className="h-4 w-4"/>{verifyError}</div>}</section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">{verification ? <div className="space-y-3"><div className="flex items-center gap-2 text-emerald-700"><CheckCircle2 className="h-6 w-6"/><span className="text-lg font-black">{verification.status || 'VALID'}</span></div><div className="grid grid-cols-2 gap-3 text-xs"><div><span className="text-slate-400">Certificate ID</span><p className="font-mono font-bold">{verification.certificateId || verification.certificateNumber}</p></div><div><span className="text-slate-400">Type</span><p className="font-bold uppercase">{verification.certificateType}</p></div><div><span className="text-slate-400">Issue Date</span><p className="font-bold">{verification.issueDate}</p></div><div><span className="text-slate-400">School</span><p className="font-bold">{verification.schoolName || 'National High School'}</p></div></div></div> : <div className="flex h-full min-h-40 flex-col items-center justify-center text-center text-slate-400"><QrCode className="h-10 w-10"/><p className="mt-2 text-xs">Verification result will appear here.</p></div>}</section>
        </div>
      )}
    </div>
  );
}
