/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Award, Printer, FileText, Eye, Settings, Shield, RefreshCw, 
  Sparkles, CheckCircle2, AlertTriangle, ChevronRight, HelpCircle, User, 
  MapPin, Phone, Mail, Globe, Calendar, Search, Trash2, FileUp, Download, 
  X, Check, Info, FileDown, Lock, Unlock, Sliders, CheckCircle, AlertCircle, Edit2, Share2, Link2
} from 'lucide-react';
import { Language, User as UserType, ClassStructure } from '../types';
import UrduWrapper from './UrduWrapper';
import PrintPDFButton from './PrintPDFButton';
import { printSectionById } from '../utils/printSection';
import { LocalERPDatabase, supabase } from '../lib/supabase';
import { SchoolBrandMark, SchoolSealMark } from './SchoolBrandMarks';
import { QRCodeSVG } from 'qrcode.react';
import { CertificateTemplateDecorations, CertificateTemplateThumbnail } from './CertificateTemplateVisual';
import { CERTIFICATE_LANGUAGE_OPTIONS, CERTIFICATE_LANGUAGE_STORAGE_KEY, CERTIFICATE_STUDENT_GR_STORAGE_KEY, CERTIFICATE_TEMPLATE_PRESETS, CERTIFICATE_TEMPLATE_STORAGE_KEY, DEFAULT_CERTIFICATE_TEMPLATE_ID, getCertificateTemplatePreset } from '../lib/certificateCatalog';
import { requestActionConfirm } from '../lib/actionConfirm';
import DocumentLanguageStudio from './DocumentLanguageStudio';
import { createDocumentLanguageProfile, documentLanguageDirection, documentLanguageFont, normalizeDocumentLanguageProfile, primaryDocumentLanguage, sectionSelection } from '../lib/documentLanguage';

// Local interfaces for certificate record
interface CertificateRecord {
  id: string;
  cloudRequestId?: string;
  grNumber: string;
  studentName: string;
  certificateType: string;
  certificateNumber: string;
  issueDate: string;
  purpose: string;
  status: 'Pending Approval' | 'Issued' | 'Cancelled' | 'Duplicate';
  language: string;
  remarks: string;
  preparedBy: string;
  approvedBy: string;
  customTitle?: string;
  customBody?: string;
  isDuplicate?: boolean;
  duplicateCount?: number;
  qrCodeData: string;
  officialMode: boolean;
  styleSettings?: any;
  lcFields?: Record<string, string>;
  signatures: {
    classTeacher: boolean;
    clerk: boolean;
    headmaster: boolean;
    classTeacherSignType: 'digital' | 'manual';
    clerkSignType: 'digital' | 'manual';
    headmasterSignType: 'digital' | 'manual';
  };
}

// Local interface for Document Vault
interface StudentDocument {
  id: string;
  documentName: string;
  status: 'Missing' | 'Uploaded' | 'Verified' | 'Rejected';
  fileName?: string;
  fileSize?: string;
  uploadDate?: string;
  uploadedBy?: string;
  versionHistory: {
    version: number;
    date: string;
    fileName: string;
    uploadedBy: string;
    action: string;
  }[];
}

interface CertificateDocumentSystemProps {
  lang: Language;
  user: UserType;
  onRefreshData?: () => void;
  activeFeatureId?: string | null;
  focusedMode?: boolean;
  focusedTitle?: string;
}

const CERTIFICATE_DOCUMENT_LANGUAGE_SECTIONS = [
  { key: 'header', label: 'School Header', description: 'Management name, school name, address and institutional identifiers.' },
  { key: 'title', label: 'Certificate Title', description: 'Certificate heading/title area.' },
  { key: 'studentDetails', label: 'Student Details', description: 'Student identity labels and official record references.' },
  { key: 'body', label: 'Certificate Body', description: 'Main certificate wording/content.' },
  { key: 'remarks', label: 'Remarks / Purpose', description: 'Purpose, remarks and special notes.' },
  { key: 'signatures', label: 'Signature Labels', description: 'Class teacher, clerk and headmaster signature captions.' },
] as const;

type CertificateWorkspaceTab = 'generate' | 'vault' | 'history' | 'audit';
const CERTIFICATE_FEATURE_TAB: Record<string, CertificateWorkspaceTab> = {
  'certificate-approval': 'history',
  'leaving-certificate-issue': 'generate',
  'official-document-vault': 'vault',
  'document-issue-history': 'history',
  'multilingual-document-print': 'generate',
  'cl-certificate-bonafide': 'generate',
  'cl-certificate-study': 'generate',
  'cl-certificate-character': 'generate',
  'cl-certificate-leaving': 'generate',
  'cl-certificate-custom': 'generate',
  'cl-document-vault': 'vault',
  'cl-document-issue-history': 'history'
};

async function certificateWorkflowApi(url: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Secure session unavailable. Please sign in again.');
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
      Authorization: `Bearer ${session.access_token}`
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Certificate workflow request failed.');
  return payload;
}

export default function CertificateDocumentSystem({ lang, user, onRefreshData, activeFeatureId = null, focusedMode = false, focusedTitle = 'Certificates & Documents' }: CertificateDocumentSystemProps) {
  const academicSetup = useMemo(() => LocalERPDatabase.getAcademicSetup(), []);
  const certificateSchoolName = String(academicSetup?.schoolProfile?.schoolName || 'School');
  const certificateSchoolCode = String(academicSetup?.schoolProfile?.schoolCode || 'SCH').replace(/[^A-Za-z0-9]/g, '').toUpperCase() || 'SCH';
  // Master Student List from local storage
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [classes, setClasses] = useState<ClassStructure[]>([]);
  const [certificateAcademicYears, setCertificateAcademicYears] = useState<any[]>([]);
  const [certificateClassMasters, setCertificateClassMasters] = useState<any[]>([]);
  const [certificateDivisionMasters, setCertificateDivisionMasters] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  // Search/Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [certificateYear, setCertificateYear] = useState('');
  const [certificateClass, setCertificateClass] = useState('');
  const [certificateDivision, setCertificateDivision] = useState('');
  const [studentScopeError, setStudentScopeError] = useState('');
  
  // Tab control: certificates / documents / history / audit_logs
  const [activeSubTab, setActiveSubTab] = useState<CertificateWorkspaceTab>('generate');

  // Certificate Generator States
  const [certType, setCertType] = useState<string>('bonafide');
  useEffect(() => {
    if (!activeFeatureId) return;
    const nextTab = CERTIFICATE_FEATURE_TAB[activeFeatureId];
    if (nextTab) setActiveSubTab(nextTab);
    const typeMap: Record<string, string> = {
      'leaving-certificate-issue': 'leaving',
      'cl-certificate-bonafide': 'bonafide',
      'cl-certificate-study': 'study',
      'cl-certificate-character': 'character',
      'cl-certificate-leaving': 'leaving',
      'cl-certificate-custom': 'custom'
    };
    if (typeMap[activeFeatureId]) setCertType(typeMap[activeFeatureId]);
  }, [activeFeatureId]);
  const [certLanguage, setCertLanguage] = useState<string>(() => localStorage.getItem(CERTIFICATE_LANGUAGE_STORAGE_KEY) || 'en');
  const [documentLanguageProfile, setDocumentLanguageProfile] = useState(() => createDocumentLanguageProfile('certificate-document', [...CERTIFICATE_DOCUMENT_LANGUAGE_SECTIONS], localStorage.getItem(CERTIFICATE_LANGUAGE_STORAGE_KEY) || 'en'));
  const [bonafidePurpose, setBonafidePurpose] = useState('');
  const [customPurposes, setCustomPurposes] = useState<string[]>(['Employment', 'Passport Application', 'Bank Account Opening']);
  const [newPurposeInput, setNewPurposeInput] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customBody, setCustomBody] = useState('');
  
  // Format Lock state (Official Maharashtra vs Custom Style Mode)
  const [isOfficialMode, setIsOfficialMode] = useState<boolean>(true);
  
  // Styling settings (for Custom Mode)
  const [borderStyle, setBorderStyle] = useState<'solid' | 'double' | 'ornate'>('double');
  const [themeColor, setThemeColor] = useState<string>('#1e293b'); // default Slate
  const [showWatermark, setShowWatermark] = useState<boolean>(true);
  const [watermarkText, setWatermarkText] = useState(() => String(academicSetup?.schoolProfile?.schoolName || 'SCHOOL').toUpperCase());
  const [signaturePosition, setSignaturePosition] = useState<'bottom' | 'split'>('split');
  const [showLogo, setShowLogo] = useState<boolean>(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() => localStorage.getItem(CERTIFICATE_TEMPLATE_STORAGE_KEY) || DEFAULT_CERTIFICATE_TEMPLATE_ID);
  const [templateOrientation, setTemplateOrientation] = useState<'portrait' | 'landscape'>(() => getCertificateTemplatePreset(localStorage.getItem(CERTIFICATE_TEMPLATE_STORAGE_KEY) || DEFAULT_CERTIFICATE_TEMPLATE_ID).orientation);

  const applyTemplatePreset = (templateId: string) => {
    const preset = getCertificateTemplatePreset(templateId);
    setSelectedTemplateId(preset.id);
    localStorage.setItem(CERTIFICATE_TEMPLATE_STORAGE_KEY, preset.id);
    setBorderStyle(preset.borderStyle);
    setThemeColor(preset.accent);
    setShowWatermark(preset.showWatermark);
    setShowLogo(preset.showLogo);
    setSignaturePosition(preset.signaturePosition);
    if (!preset.officialLc) setTemplateOrientation(preset.orientation);
  };

  useEffect(() => {
    applyTemplatePreset(selectedTemplateId);
    // Apply the saved preset once when the Certificate Studio opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem(CERTIFICATE_LANGUAGE_STORAGE_KEY, certLanguage);
  }, [certLanguage]);

  // Digital Signatures Toggle
  const [includeClassTeacherSign, setIncludeClassTeacherSign] = useState(true);
  const [includeClerkSign, setIncludeClerkSign] = useState(true);
  const [includeHeadmasterSign, setIncludeHeadmasterSign] = useState(true);
  const [classTeacherSignType, setClassTeacherSignType] = useState<'digital' | 'manual'>('digital');
  const [clerkSignType, setClerkSignType] = useState<'digital' | 'manual'>('digital');
  const [headmasterSignType, setHeadmasterSignType] = useState<'digital' | 'manual'>('digital');

  // LC/TC fields begin from School Profile + the selected Student Master only.
  // Personal/service facts are never prefilled with demo assumptions in production.
  const [lcFields, setLcFields] = useState<Record<string, string>>({
    udiseNumber: academicSetup?.schoolProfile?.udiseCode || '',
    board: academicSetup?.boards?.find((item: any) => item.isActive)?.boardName || academicSetup?.boards?.[0]?.boardName || '',
    medium: academicSetup?.schoolProfile?.primaryMedium || academicSetup?.mediums?.find((item: any) => item.isEnabled)?.mediumName || '',
    indexNumber: '',
    lcNumber: '',
    pupilId: '',
    aadhaarNumber: '',
    placeOfBirth: '',
    taluka: '',
    district: '',
    state: '',
    country: '',
    lastSchool: '',
    standardAtAdmission: '',
    progress: '',
    conduct: '',
    dateOfLeaving: new Date().toISOString().substring(0, 10),
    standardStudiedSince: '',
    reasonForLeaving: '',
    remarks: '',
    issuePlace: academicSetup?.schoolProfile?.villageCity || academicSetup?.schoolProfile?.taluka || '',
    issueDate: new Date().toISOString().substring(0, 10),
  });

  // Certificate Issuance Registry & Logs
  const [certRegistry, setCertRegistry] = useState<CertificateRecord[]>([]);
  const [activePrintCertificateNumber, setActivePrintCertificateNumber] = useState<string>('');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Document Vault State
  const [selectedDocStudent, setSelectedDocStudent] = useState<any | null>(null);
  const [docCategory, setDocCategory] = useState<string>('Aadhaar Card');
  const [vaultDocs, setVaultDocs] = useState<Record<string, StudentDocument[]>>({});
  const [uploadProgress, setUploadProgress] = useState<boolean>(false);
  
  // Custom document type input
  const [customDocType, setCustomDocType] = useState('');

  // Target printer variables
  const [printPaperSize, setPrintPaperSize] = useState<'A4' | 'A3'>('A4');
  const [printColorMode, setPrintColorMode] = useState<'color' | 'bw'>('color');

  // Quick statistical summary
  const stats = useMemo(() => {
    return {
      totalIssued: certRegistry.filter(c => c.status === 'Issued').length,
      bonafideCount: certRegistry.filter(c => c.certificateType === 'bonafide').length,
      lcCount: certRegistry.filter(c => c.certificateType === 'leaving').length,
      customCount: certRegistry.filter(c => c.certificateType === 'custom').length,
      cancelledCount: certRegistry.filter(c => c.status === 'Cancelled').length,
      vaultCount: Object.values(vaultDocs).flat().length
    };
  }, [certRegistry, vaultDocs]);

  // Load admissions data and certificate registries
  useEffect(() => {
    const rawAdmissions = localStorage.getItem('nhs_erp_clerk_admissions');
    if (rawAdmissions) {
      const parsed = JSON.parse(rawAdmissions);
      setAdmissions(parsed);
      if (parsed.length > 0 && !selectedStudent) {
        setSelectedStudent(parsed[0]);
        setSelectedDocStudent(parsed[0]);
      }
    }

    const classesData = localStorage.getItem('nhs_erp_classes');
    if (classesData) {
      setClasses(JSON.parse(classesData));
    }

    // Load issued certificates log
    const rawCerts = localStorage.getItem('nhs_erp_certificates_log');
    if (rawCerts) {
      setCertRegistry(JSON.parse(rawCerts));
    }  else {
      setCertRegistry([]);
    }

    // Load Document Vault database
    const rawVault = localStorage.getItem('nhs_erp_document_vault');
    if (rawVault) {
      setVaultDocs(JSON.parse(rawVault));
    }  else {
      setVaultDocs({});
    }

    // Load Audit Logs
    const rawAudit = localStorage.getItem('nhs_erp_audit_logs');
    if (rawAudit) {
      setAuditLogs(JSON.parse(rawAudit));
    }
  }, []);

  // Production Student Master hydration for authorized school administration.
  // Certificates must use the same cloud Student Master created by Admission Confirmation,
  // never a second Clerk-only student registry.
  useEffect(() => {
    if (!['headmaster', 'clerk'].includes(user.role)) return;
    let cancelled = false;
    const loadCloudStudents = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const response = await fetch('/api/admin/certificate-student-scope', { headers: { Authorization: `Bearer ${session.access_token}` } });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'Certificate student scope could not be loaded.');
        if (cancelled || !Array.isArray(payload.students)) return;
        setStudentScopeError('');
        const normalized = payload.students.map((student: any) => ({
          id: student.id,
          grNumber: student.grNumber || '',
          name: student.fullName || 'Student',
          fullName: student.fullName || 'Student',
          gender: student.gender || '',
          dob: student.dob || '',
          address: student.address || '',
          fatherName: student.fatherName || '',
          motherName: student.motherName || '',
          mobileNumber: student.mobileNumber || '',
          classId: student.classId || student.currentClassId || student.className || '',
          className: student.className || student.currentClassName || student.classId || 'Class not assigned',
          admissionClassId: student.admissionClassId || student.classId || student.className || '',
          admissionClassName: student.admissionClassName || student.className || student.classId || '',
          divisionId: student.divisionId || student.currentDivisionId || '',
          division: student.divisionName || student.division || '',
          divisionName: student.divisionName || student.division || '',
          academicYear: student.academicYear || student.academicYearName || '',
          academicYearId: student.academicYearId || student.currentAcademicYearId || '',
          status: student.status || 'Active'
        }));
        setCertificateAcademicYears(Array.isArray(payload.academicYears) ? payload.academicYears : []);
        setCertificateClassMasters(Array.isArray(payload.classes) ? payload.classes : []);
        setCertificateDivisionMasters(Array.isArray(payload.divisions) ? payload.divisions : []);
        setAdmissions(normalized);
        const preferredGr = localStorage.getItem(CERTIFICATE_STUDENT_GR_STORAGE_KEY) || '';
        setSelectedStudent(current => normalized.find((row: any) => row.id === current?.id || row.grNumber === current?.grNumber) || normalized.find((row: any) => row.grNumber === preferredGr) || normalized[0] || null);
        setSelectedDocStudent(current => normalized.find((row: any) => row.id === current?.id || row.grNumber === current?.grNumber) || normalized.find((row: any) => row.grNumber === preferredGr) || normalized[0] || null);
      } catch (error: any) {
        if (!cancelled) setStudentScopeError(error?.message || 'Cloud Student Master could not be loaded for Certificate Studio.');
        console.warn('Cloud Student Master could not hydrate Certificates; legacy compatibility data remains available.', error);
      }
    };
    void loadCloudStudents();
    return () => { cancelled = true; };
  }, [user.role]);

  // Cross-role certificate approval queue. Clerk drafts and Headmaster decisions
  // are stored in the school-scoped cloud audit workflow so separate devices
  // observe the same pending/issued state. Local registry remains compatibility
  // storage for legacy/direct Headmaster certificates until the owner module gets
  // its dedicated certificate ledger schema.
  useEffect(() => {
    if (!['headmaster', 'clerk'].includes(user.role)) return;
    let cancelled = false;
    const loadCloudCertificateRequests = async () => {
      try {
        const payload = await certificateWorkflowApi('/api/admin/certificate-requests');
        if (cancelled || !Array.isArray(payload.requests)) return;
        const cloudRecords: CertificateRecord[] = payload.requests.map((request: any) => {
          const cert = request.certificate || {};
          const decision = String(request.status || 'pending');
          return {
            id: `cloud-cert-${request.id}`,
            cloudRequestId: String(request.id || ''),
            grNumber: String(cert.grNumber || ''),
            studentName: String(cert.studentName || 'Student'),
            certificateType: String(cert.certificateType || 'custom'),
            certificateNumber: String(cert.certificateNumber || ''),
            issueDate: String(cert.issueDate || request.createdAt || '').slice(0, 10),
            purpose: String(cert.purpose || ''),
            status: decision === 'approve' ? 'Issued' : decision === 'reject' ? 'Cancelled' : 'Pending Approval',
            language: String(cert.language || 'en'),
            remarks: decision === 'reject' && request.decisionNote ? `Rejected: ${request.decisionNote}` : String(cert.remarks || ''),
            preparedBy: String(cert.preparedBy || 'Clerk'),
            approvedBy: decision === 'approve' ? String(request.decidedByName || 'Headmaster') : decision === 'reject' ? 'Rejected by Headmaster' : 'Pending HM Approval',
            customTitle: String(cert.customTitle || ''),
            customBody: String(cert.customBody || ''),
            qrCodeData: '',
            officialMode: decision === 'approve',
            styleSettings: cert.styleSettings || {},
            lcFields: cert.lcFields || undefined,
            signatures: {
              classTeacher: cert.signatures?.classTeacher !== false,
              clerk: cert.signatures?.clerk !== false,
              headmaster: cert.signatures?.headmaster !== false,
              classTeacherSignType: cert.signatures?.classTeacherSignType === 'manual' ? 'manual' : 'digital',
              clerkSignType: cert.signatures?.clerkSignType === 'manual' ? 'manual' : 'digital',
              headmasterSignType: cert.signatures?.headmasterSignType === 'manual' ? 'manual' : 'digital'
            }
          };
        });
        setCertRegistry(current => {
          const cloudNumbers = new Set(cloudRecords.map(row => row.certificateNumber).filter(Boolean));
          const legacyOnly = current.filter(row => !row.cloudRequestId && !cloudNumbers.has(row.certificateNumber));
          const merged = [...cloudRecords, ...legacyOnly];
          localStorage.setItem('nhs_erp_certificates_log', JSON.stringify(merged));
          return merged;
        });
      } catch (error) {
        console.warn('Cloud certificate approval queue could not be loaded; legacy compatibility history remains available.', error);
      }
    };
    void loadCloudCertificateRequests();
    return () => { cancelled = true; };
  }, [user.role]);

  // Update selected student fields in LC Fields state
  useEffect(() => {
    if (selectedStudent?.grNumber) localStorage.setItem(CERTIFICATE_STUDENT_GR_STORAGE_KEY, String(selectedStudent.grNumber));
    if (selectedStudent) {
      setLcFields(prev => ({
        ...prev,
        aadhaarNumber: selectedStudent.aadhaarNumber || '',
        lcNumber: prev.lcNumber || '',
        placeOfBirth: selectedStudent.birthPlace || '',
        taluka: selectedStudent.taluka || '',
        district: selectedStudent.district || '',
        state: selectedStudent.state || '',
        country: selectedStudent.nationality || '',
        lastSchool: selectedStudent.lastSchool || '',
        standardAtAdmission: 'Class ' + (selectedStudent.admissionClassId || '5'),
        standardStudiedSince: `${selectedStudent.admissionClassId || 'Class 10'} (${selectedStudent.academicYear})`,
        progress: '',
        conduct: '',
        remarks: '',
        reasonForLeaving: ''
      }));
    }
  }, [selectedStudent]);

  // Helper notice notification counts
  const writeAuditLog = (action: string, module: string, description: string) => {
    const timestamp = new Date().toISOString();
    const newLog = {
      id: `audit_${Date.now()}`,
      timestamp,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action,
      module,
      description
    };
    const updated = [newLog, ...auditLogs];
    setAuditLogs(updated);
    localStorage.setItem('nhs_erp_audit_logs', JSON.stringify(updated));
  };

  // Generate Auto-Incrementing LC/Bonafide Certificate Numbers safely
  const handleIssueCertificate = async () => {
    if (!selectedStudent) {
      alert('Please select a student from the Master Database first.');
      return;
    }

    const isLeaving = certType === 'leaving';
    const isBonafide = certType === 'bonafide';
    const numPrefix = isLeaving ? 'LC' : isBonafide ? 'BON' : 'CERT';
    
    // Auto incremental counter based on existing registry
    const yearCode = String(selectedStudent.academicYear || new Date().getFullYear()).replace('-', '');
    const currentYearCerts = certRegistry.filter(c => c.certificateType === certType && c.grNumber.startsWith(selectedStudent.grNumber.substring(0, 1)));
    const sequenceNum = String(currentYearCerts.length + 1).padStart(4, '0');
    const autoCertNum = `${certificateSchoolCode}/${numPrefix}/${yearCode}/${sequenceNum}`;

    const newCert: CertificateRecord = {
      id: `cert_${Date.now()}`,
      grNumber: selectedStudent.grNumber,
      studentName: selectedStudent.name,
      certificateType: certType,
      certificateNumber: isLeaving ? lcFields.lcNumber || autoCertNum : autoCertNum,
      issueDate: new Date().toISOString().substring(0, 10),
      purpose: certType === 'bonafide' ? bonafidePurpose : (certType === 'leaving' ? lcFields.reasonForLeaving : ''),
      status: user.role === 'headmaster' ? 'Issued' : 'Pending Approval',
      language: certLanguage,
      remarks: certType === 'custom' ? customBody : '',
      preparedBy: `${user.name} (${user.role.toUpperCase()})`,
      approvedBy: user.role === 'headmaster' ? `${user.name} (HM)` : 'Pending HM Approval',
      customTitle: certType === 'custom' ? customTitle : '',
      customBody: certType === 'custom' ? customBody : '',
      qrCodeData: '',
      officialMode: user.role === 'headmaster' ? isOfficialMode : false,
      styleSettings: {
        borderStyle,
        themeColor,
        showWatermark,
        watermarkText,
        signaturePosition,
        showLogo,
        templateId: certType === 'leaving' ? 'official-lc-reference' : selectedTemplateId,
        documentLanguageProfile
      },
      lcFields: isLeaving ? lcFields : undefined,
      signatures: {
        classTeacher: includeClassTeacherSign,
        clerk: includeClerkSign,
        headmaster: includeHeadmasterSign,
        classTeacherSignType,
        clerkSignType,
        headmasterSignType
      }
    };

    if (user.role === 'clerk') {
      try {
        const cloud = await certificateWorkflowApi('/api/clerk/certificate-requests', { method: 'POST', body: JSON.stringify({ certificate: newCert }) });
        newCert.id = `cloud-cert-${cloud.requestId}`;
        newCert.cloudRequestId = String(cloud.requestId || '');
      } catch (error: any) {
        alert(error?.message || 'Certificate draft could not be sent to the Headmaster. No official certificate was issued.');
        return;
      }
    }

    const updatedRegistry = [newCert, ...certRegistry.filter(row => row.certificateNumber !== newCert.certificateNumber)];
    setCertRegistry(updatedRegistry);
    if (newCert.status === 'Issued') setActivePrintCertificateNumber(newCert.certificateNumber);
    localStorage.setItem('nhs_erp_certificates_log', JSON.stringify(updatedRegistry));

    writeAuditLog(
      user.role === 'headmaster' ? 'CERTIFICATE_ISSUED' : 'CERTIFICATE_PREPARED_FOR_APPROVAL',
      'Certificates Panel',
      `${user.role === 'headmaster' ? 'Issued' : 'Prepared'} ${certType.toUpperCase()} Certificate ${newCert.certificateNumber} for GR: ${selectedStudent.grNumber} (${selectedStudent.name})`
    );

    alert(user.role === 'headmaster' ? `Certificate generated and issued successfully!\n\nCertificate No: ${newCert.certificateNumber}` : `Certificate draft prepared.\n\nCertificate No: ${newCert.certificateNumber}\nHeadmaster approval is required before official issue.`);
    setActiveSubTab('history');
  };

  // Student Master selectors for Certificate Studio: Academic Year → Class → Division → Student.
  // Master dropdowns come from canonical Academic Setup cloud masters; students are then scoped by those IDs.
  const academicYearOptions = useMemo(() => {
    const byId = new Map<string, { value: string; label: string; isActive: boolean; sortOrder: number }>();
    certificateAcademicYears.forEach((row: any) => {
      const value = String(row.id || '').trim();
      if (!value) return;
      byId.set(value, { value, label: String(row.name || value), isActive: row.isActive === true, sortOrder: Number(row.sortOrder || 0) });
    });
    admissions.forEach((row: any) => {
      const value = String(row.academicYearId || row.academicYear || '').trim();
      if (!value || byId.has(value)) return;
      byId.set(value, { value, label: String(row.academicYear || value), isActive: false, sortOrder: 0 });
    });
    return Array.from(byId.values()).sort((a, b) => Number(b.isActive) - Number(a.isActive) || b.sortOrder - a.sortOrder || b.label.localeCompare(a.label, undefined, { numeric: true }));
  }, [certificateAcademicYears, admissions]);

  const classOptions = useMemo(() => {
    const masterRows = certificateClassMasters
      .filter((row: any) => !certificateYear || !row.academicYearId || String(row.academicYearId) === certificateYear)
      .map((row: any) => ({ value: String(row.id), label: String(row.name || row.id), sortOrder: Number(row.sortOrder || 0) }));
    const map = new Map(masterRows.map((row: any) => [row.value, row]));
    admissions.filter((row: any) => !certificateYear || String(row.academicYearId || row.academicYear || '') === certificateYear).forEach((row: any) => {
      const value = String(row.classId || row.className || '').trim();
      if (!value || map.has(value)) return;
      map.set(value, { value, label: String(row.className || value), sortOrder: 9999 });
    });
    return Array.from(map.values()).sort((a: any, b: any) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, undefined, { numeric: true }));
  }, [certificateClassMasters, admissions, certificateYear]);

  const divisionOptions = useMemo(() => {
    const map = new Map<string, { value: string; label: string; sortOrder: number }>();
    certificateDivisionMasters
      .filter((row: any) => !certificateClass || !row.classId || String(row.classId) === certificateClass)
      .forEach((row: any) => {
        const value = row.isNoDivision ? '__NO_DIVISION__' : String(row.id || '').trim();
        if (!value) return;
        map.set(value, { value, label: row.isNoDivision ? 'No Division' : String(row.name || value), sortOrder: Number(row.sortOrder || 0) });
      });
    admissions.filter((row: any) => {
      const yearMatch = !certificateYear || String(row.academicYearId || row.academicYear || '') === certificateYear;
      const classMatch = !certificateClass || String(row.classId || row.className || '') === certificateClass;
      return yearMatch && classMatch;
    }).forEach((row: any) => {
      const rawId = String(row.divisionId || '').trim();
      const value = rawId || '__NO_DIVISION__';
      if (!map.has(value)) map.set(value, { value, label: rawId ? String(row.divisionName || row.division || rawId) : 'No Division', sortOrder: 9999 });
    });
    if (!map.size) map.set('__NO_DIVISION__', { value: '__NO_DIVISION__', label: 'No Division', sortOrder: 0 });
    return Array.from(map.values()).sort((a, b) => (a.value === '__NO_DIVISION__' ? -1 : b.value === '__NO_DIVISION__' ? 1 : a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, undefined, { numeric: true })));
  }, [certificateDivisionMasters, admissions, certificateYear, certificateClass]);

  const certificateStudentOptions = useMemo(() => admissions.filter((row: any) => {
    const yearValue = String(row.academicYearId || row.academicYear || '').trim();
    const classValue = String(row.classId || row.className || '').trim();
    const divisionValue = String(row.divisionId || '').trim() || '__NO_DIVISION__';
    return (!certificateYear || yearValue === certificateYear)
      && (!certificateClass || classValue === certificateClass)
      && (!certificateDivision || divisionValue === certificateDivision);
  }).sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))), [admissions, certificateYear, certificateClass, certificateDivision]);

  useEffect(() => {
    if (!academicYearOptions.length && !admissions.length) return;
    const preferred = admissions.find((row: any) => row.grNumber && row.grNumber === localStorage.getItem(CERTIFICATE_STUDENT_GR_STORAGE_KEY)) || admissions[0] || null;
    const defaultYear = certificateYear || String(preferred?.academicYearId || academicYearOptions.find((row: any) => row.isActive)?.value || academicYearOptions[0]?.value || '');
    const defaultClass = certificateClass || String(preferred?.classId || classOptions[0]?.value || '');
    const preferredDivisionId = String(preferred?.divisionId || '').trim() || '__NO_DIVISION__';
    const defaultDivision = certificateDivision || preferredDivisionId || divisionOptions[0]?.value || '__NO_DIVISION__';
    if (!certificateYear && defaultYear) setCertificateYear(defaultYear);
    if (!certificateClass && defaultClass) setCertificateClass(defaultClass);
    if (!certificateDivision && defaultDivision) setCertificateDivision(defaultDivision);
  }, [academicYearOptions, classOptions, divisionOptions, admissions, certificateYear, certificateClass, certificateDivision]);

  // Document Vault keeps quick search; it reads the same cloud Student Master.
  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return admissions;
    return admissions.filter((adm) => [adm?.name, adm?.grNumber, adm?.className, adm?.divisionName, adm?.mobileNumber]
      .some((value) => String(value || '').toLowerCase().includes(query)));
  }, [admissions, searchQuery]);

  // Handle Purpose additions by HM
  const handleAddPurpose = () => {
    if (newPurposeInput.trim() && !customPurposes.includes(newPurposeInput.trim())) {
      setCustomPurposes([...customPurposes, newPurposeInput.trim()]);
      setBonafidePurpose(newPurposeInput.trim());
      setNewPurposeInput('');
      writeAuditLog('BONAFIDE_PURPOSE_ADDED', 'Certificates config', `Added new purpose: ${newPurposeInput.trim()}`);
    }
  };

  // File Upload emulation inside document vault (Supports Drag & Drop)
  const handleUploadDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocStudent) {
      alert('Please select a student from the panel.');
      return;
    }

    setUploadProgress(true);
    setTimeout(() => {
      const studentGr = selectedDocStudent.grNumber;
      const targetDocName = docCategory === 'Custom' ? customDocType || 'Custom Document' : docCategory;
      const studentDocs = vaultDocs[studentGr] || [];

      // Check if document of this category already exists
      const existingDocIdx = studentDocs.findIndex(d => d.documentName === targetDocName);
      
      const updatedDocs = [...studentDocs];
      const newVersion = existingDocIdx >= 0 ? studentDocs[existingDocIdx].versionHistory.length + 1 : 1;
      const mockFileName = `${targetDocName.toLowerCase().replace(/ /g, '_')}_gr_${studentGr}_v${newVersion}.pdf`;
      const mockFileSize = `${Math.floor(100 + Math.random() * 900)} KB`;

      const versionRecord = {
        version: newVersion,
        date: new Date().toISOString().substring(0, 10),
        fileName: mockFileName,
        uploadedBy: user.name,
        action: existingDocIdx >= 0 ? 'Document Replaced' : 'Original Upload'
      };

      if (existingDocIdx >= 0) {
        // Replace existing
        const oldDoc = studentDocs[existingDocIdx];
        updatedDocs[existingDocIdx] = {
          ...oldDoc,
          status: 'Uploaded',
          fileName: mockFileName,
          fileSize: mockFileSize,
          uploadDate: new Date().toISOString().substring(0, 10),
          uploadedBy: user.name,
          versionHistory: [versionRecord, ...oldDoc.versionHistory]
        };
      } else {
        // Create new
        updatedDocs.push({
          id: `doc_${Date.now()}`,
          documentName: targetDocName,
          status: 'Uploaded',
          fileName: mockFileName,
          fileSize: mockFileSize,
          uploadDate: new Date().toISOString().substring(0, 10),
          uploadedBy: user.name,
          versionHistory: [versionRecord]
        });
      }

      const updatedVault = {
        ...vaultDocs,
        [studentGr]: updatedDocs
      };

      setVaultDocs(updatedVault);
      localStorage.setItem('nhs_erp_document_vault', JSON.stringify(updatedVault));
      setUploadProgress(false);
      setCustomDocType('');

      // Also auto update student admissions file checklists
      const updatedAdmissions = admissions.map(adm => {
        if (adm.grNumber === studentGr) {
          const documents = { ...adm.documents };
          documents[targetDocName] = { uploaded: true, date: new Date().toISOString().substring(0, 10) };
          return { ...adm, documents };
        }
        return adm;
      });
      setAdmissions(updatedAdmissions);
      localStorage.setItem('nhs_erp_clerk_admissions', JSON.stringify(updatedAdmissions));

      writeAuditLog(
        'DOCUMENT_UPLOADED',
        'Document Vault',
        `Uploaded version ${newVersion} of "${targetDocName}" for student GR: ${studentGr}`
      );

      alert(`"${targetDocName}" uploaded successfully! Added to version control history.`);
    }, 1200);
  };

  // Verify Document compliance status (HM or Clerk authority)
  const handleVerifyDocument = (studentGr: string, docId: string, action: 'Verified' | 'Rejected') => {
    const studentDocs = vaultDocs[studentGr] || [];
    const updatedDocs = studentDocs.map(d => {
      if (d.id === docId) {
        return { ...d, status: action };
      }
      return d;
    });

    const updatedVault = {
      ...vaultDocs,
      [studentGr]: updatedDocs
    };

    setVaultDocs(updatedVault);
    localStorage.setItem('nhs_erp_document_vault', JSON.stringify(updatedVault));

    writeAuditLog(
      `DOCUMENT_${action.toUpperCase()}`,
      'Document Vault',
      `Document ID ${docId} of student GR: ${studentGr} set to status ${action}`
    );

    alert(`Document marked as ${action}!`);
  };

  // Delete document record
  const handleDeleteDocument = async (studentGr: string, docId: string) => {
    if (!(await requestActionConfirm({ title: 'Delete document permanently?', message: 'Are you sure you want to permanently delete this document and all its version history? This action is irreversible.', confirmLabel: 'Delete Document', tone: 'danger' }))) {
      return;
    }

    const studentDocs = vaultDocs[studentGr] || [];
    const targetDoc = studentDocs.find(d => d.id === docId);
    const updatedDocs = studentDocs.filter(d => d.id !== docId);

    const updatedVault = {
      ...vaultDocs,
      [studentGr]: updatedDocs
    };

    setVaultDocs(updatedVault);
    localStorage.setItem('nhs_erp_document_vault', JSON.stringify(updatedVault));

    writeAuditLog(
      'DOCUMENT_DELETED',
      'Document Vault',
      `Permanently removed document "${targetDoc?.documentName}" for student GR: ${studentGr}`
    );

    alert('Document deleted successfully.');
  };

  // Handle Cancel / Reissue Certificate (Headmaster only)
  const handleUpdateCertStatus = (certId: string, newStatus: 'Cancelled' | 'Duplicate') => {
    const targetCert = certRegistry.find(c => c.id === certId);
    if (!targetCert) return;

    if (user.role !== 'headmaster') {
      alert('Unauthorized. Duplicate reissue and cancellation are Headmaster-only official actions.');
      return;
    }

    const updatedCerts = certRegistry.map(c => {
      if (c.id === certId) {
        const dupCount = (c.duplicateCount || 0) + (newStatus === 'Duplicate' ? 1 : 0);
        return {
          ...c,
          status: (newStatus === 'Duplicate' ? 'Issued' : newStatus) as CertificateRecord['status'], // stay issued but mark duplicate
          isDuplicate: newStatus === 'Duplicate' ? true : c.isDuplicate,
          duplicateCount: dupCount,
          remarks: newStatus === 'Duplicate' 
            ? `${c.remarks} | Duplicate printed on ${new Date().toISOString().substring(0,10)}` 
            : `Cancelled by HM on ${new Date().toISOString().substring(0,10)}`
        };
      }
      return c;
    });

    setCertRegistry(updatedCerts);
    localStorage.setItem('nhs_erp_certificates_log', JSON.stringify(updatedCerts));

    writeAuditLog(
      `CERTIFICATE_${newStatus.toUpperCase()}`,
      'Certificates Registry',
      `${newStatus} status updated for Certificate No: ${targetCert.certificateNumber} (GR: ${targetCert.grNumber})`
    );

    alert(`Certificate status set to ${newStatus === 'Duplicate' ? 'Duplicate Reissued' : 'Cancelled'} successfully!`);
  };

  const handleRevokeCertificate = async (certId: string) => {
    if (user.role !== 'headmaster') return;
    const target = certRegistry.find(c => c.id === certId && c.status === 'Issued');
    if (!target) return;
    const reason = window.prompt('Reason for revoking this certificate?')?.trim();
    if (!reason) return;
    try {
      await certificateWorkflowApi(`/api/headmaster/certificates/${encodeURIComponent(target.certificateNumber)}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: 'revoked', reason })
      });
      const updated = certRegistry.map(c => c.id === certId ? { ...c, status: 'Cancelled' as const, remarks: `${c.remarks ? `${c.remarks} | ` : ''}Revoked by Headmaster: ${reason}` } : c);
      setCertRegistry(updated);
      localStorage.setItem('nhs_erp_certificates_log', JSON.stringify(updated));
      writeAuditLog('CERTIFICATE_REVOKED', 'Certificates Registry', `Revoked Certificate No: ${target.certificateNumber}. Reason: ${reason}`);
      alert('Certificate revoked. Online verification will show REVOKED.');
    } catch (error: any) {
      alert(error?.message || 'Certificate could not be revoked.');
    }
  };

  const handleSetCertificateExpiry = async (certId: string) => {
    if (user.role !== 'headmaster') return;
    const target = certRegistry.find(c => c.id === certId && c.status === 'Issued');
    if (!target) return;
    const expiryDate = window.prompt('Expiry date (YYYY-MM-DD). Leave blank to remove expiry:')?.trim();
    if (expiryDate === undefined) return;
    if (expiryDate && !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) {
      alert('Use YYYY-MM-DD format.');
      return;
    }
    try {
      await certificateWorkflowApi(`/api/headmaster/certificates/${encodeURIComponent(target.certificateNumber)}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: 'valid', expiryDate: expiryDate || '' })
      });
      const updated = certRegistry.map(c => c.id === certId ? { ...c, remarks: `${c.remarks ? `${c.remarks} | ` : ''}${expiryDate ? `Expiry set: ${expiryDate}` : 'Expiry removed'}` } : c);
      setCertRegistry(updated);
      localStorage.setItem('nhs_erp_certificates_log', JSON.stringify(updated));
      writeAuditLog('CERTIFICATE_EXPIRY_UPDATED', 'Certificates Registry', `${target.certificateNumber}: ${expiryDate ? `expiry ${expiryDate}` : 'expiry removed'}`);
      alert(expiryDate ? `Expiry set to ${expiryDate}.` : 'Expiry removed.');
    } catch (error: any) {
      alert(error?.message || 'Certificate expiry could not be updated.');
    }
  };

  const shareCertificate = async (cert: CertificateRecord, mode: 'copy' | 'email' | 'whatsapp' | 'share') => {
    if (cert.status !== 'Issued') return;
    const url = `${window.location.origin}/verify-certificate/${encodeURIComponent(cert.certificateNumber)}`;
    const text = `${cert.certificateType.toUpperCase()} certificate ${cert.certificateNumber} — verify online: ${url}`;
    if (mode === 'copy') {
      await navigator.clipboard?.writeText(url);
      alert('Verification link copied.');
      return;
    }
    if (mode === 'email') {
      window.location.href = `mailto:?subject=${encodeURIComponent(`Certificate ${cert.certificateNumber}`)}&body=${encodeURIComponent(text)}`;
      return;
    }
    if (mode === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
      return;
    }
    if (navigator.share) await navigator.share({ title: `Certificate ${cert.certificateNumber}`, text, url });
    else {
      await navigator.clipboard?.writeText(url);
      alert('Sharing is not supported on this device. Verification link copied instead.');
    }
  };

  const approvePreparedCertificate = async (certId: string) => {
    if (user.role !== 'headmaster') return;
    const target = certRegistry.find(c => c.id === certId && c.status === 'Pending Approval');
    if (!target) return;
    try {
      if (target.cloudRequestId) {
        await certificateWorkflowApi(`/api/headmaster/certificate-requests/${encodeURIComponent(target.cloudRequestId)}/decision`, { method: 'POST', body: JSON.stringify({ decision: 'approve' }) });
      }
      const updated = certRegistry.map(c => c.id === certId ? { ...c, status: 'Issued' as const, approvedBy: `${user.name} (HM)`, officialMode: true } : c);
      setCertRegistry(updated);
      localStorage.setItem('nhs_erp_certificates_log', JSON.stringify(updated));
      writeAuditLog('CERTIFICATE_APPROVED_AND_ISSUED', 'Certificates Registry', `Headmaster approved and issued Certificate No: ${target.certificateNumber} (GR: ${target.grNumber})`);
      alert('Certificate approved and marked officially issued.');
    } catch (error: any) {
      alert(error?.message || 'Certificate approval could not be saved to the cloud.');
    }
  };

  const rejectPreparedCertificate = async (certId: string) => {
    if (user.role !== 'headmaster') return;
    const target = certRegistry.find(c => c.id === certId && c.status === 'Pending Approval');
    if (!target) return;
    const reason = window.prompt('Reason for rejecting this certificate draft?')?.trim();
    if (!reason) return;
    try {
      if (target.cloudRequestId) {
        await certificateWorkflowApi(`/api/headmaster/certificate-requests/${encodeURIComponent(target.cloudRequestId)}/decision`, { method: 'POST', body: JSON.stringify({ decision: 'reject', note: reason }) });
      }
      const updated = certRegistry.map(c => c.id === certId ? { ...c, status: 'Cancelled' as const, approvedBy: 'Rejected by Headmaster', officialMode: false, remarks: `${c.remarks ? `${c.remarks} | ` : ''}Rejected: ${reason}` } : c);
      setCertRegistry(updated);
      localStorage.setItem('nhs_erp_certificates_log', JSON.stringify(updated));
      writeAuditLog('CERTIFICATE_REQUEST_REJECTED', 'Certificates Registry', `Headmaster rejected Certificate No: ${target.certificateNumber} (GR: ${target.grNumber}). Reason: ${reason}`);
      alert('Certificate draft rejected. No official certificate was issued.');
    } catch (error: any) {
      alert(error?.message || 'Certificate rejection could not be saved to the cloud.');
    }
  };

  const schoolName = certificateSchoolName;
  const managementName = String(academicSetup?.schoolProfile?.managementName || '');
  const schoolAddress = [academicSetup?.schoolProfile?.address, academicSetup?.schoolProfile?.villageCity, academicSetup?.schoolProfile?.district, academicSetup?.schoolProfile?.state, academicSetup?.schoolProfile?.pinCode].filter(Boolean).join(', ');
  const schoolUdise = String(academicSetup?.schoolProfile?.udiseCode || '');

  // Double Check Translation lists for multilang rendering
  const translations = {
    en: {
      schoolName: schoolName.toUpperCase(),
      societyName: managementName,
      address: schoolAddress,
      udise: schoolUdise ? `UDISE NO: ${schoolUdise}` : 'UDISE NO: —',
      board: 'BOARD: MAHARASHTRA STATE BOARD',
      medium: 'MEDIUM: English / Urdu Medium',
      lcTitle: 'SCHOOL LEAVING CERTIFICATE',
      bonafideTitle: 'BONAFIDE CERTIFICATE',
      certNum: 'Certificate No',
      grNum: 'G.R. Number',
      pupilId: 'Pupil ID / Student ID',
      aadhaar: 'Aadhaar Card No',
      fullName: 'Name of the Pupil (In Full)',
      fatherName: "Father's Name",
      motherName: "Mother's Name",
      nationality: 'Nationality',
      motherTongue: 'Mother Tongue',
      religion: 'Religion',
      caste: 'Caste & Sub-Caste',
      birthPlace: 'Place of Birth',
      dob: 'Date of Birth (in figures)',
      dobWords: 'Date of Birth (in words)',
      lastSchool: 'Last School Attended',
      admDate: 'Date of Admission',
      admStandard: 'Standard at Admission',
      progress: 'Progress in Studies',
      conduct: 'General Conduct',
      dateLeaving: 'Date of Leaving School',
      stdStudied: 'Standard in which studying & since when',
      reasonLeaving: 'Reason for Leaving School',
      remarks: 'Remarks',
      signCT: 'Class Teacher Signature',
      signClerk: 'Clerk Signature',
      signHM: 'Headmaster Signature',
      seal: 'School Seal'
    },
    mr: {
      schoolName,
      societyName: managementName,
      address: schoolAddress,
      udise: schoolUdise ? `युडायस क्रमांक: ${schoolUdise}` : 'युडायस क्रमांक: —',
      board: 'बोर्ड: महाराष्ट्र राज्य बोर्ड',
      medium: 'माध्यम: इंग्रजी / उर्दू माध्यम',
      lcTitle: 'शाळा सोडल्याचे प्रमाणपत्र',
      bonafideTitle: 'बोनाफाईड प्रमाणपत्र',
      certNum: 'प्रमाणपत्र क्र',
      grNum: 'जी.आर. नंबर',
      pupilId: 'विद्यार्थी आयडी',
      aadhaar: 'आधार कार्ड क्रमांक',
      fullName: 'विद्यार्थ्याचे नाव (पूर्ण)',
      fatherName: 'वडिलांचे नाव',
      motherName: 'आईचे नाव',
      nationality: 'राष्ट्रीयत्व',
      motherTongue: 'मातृभाषा',
      religion: 'धर्म',
      caste: 'जात व पोटजात',
      birthPlace: 'जन्मस्थान',
      dob: 'जन्मदिनांक (अंकात)',
      dobWords: 'जन्मदिनांक (अक्षरी)',
      lastSchool: 'यापूर्वीची शाळा',
      admDate: 'प्रवेश तारीख',
      admStandard: 'प्रवेश घेतानाची इयत्ता',
      progress: 'अभ्यासातील प्रगती',
      conduct: 'वर्तणूक',
      dateLeaving: 'शाळा सोडल्याची तारीख',
      stdStudied: 'कोणत्या इयत्तेत शिकत होता व केव्हापासून',
      reasonLeaving: 'शाळा सोडण्याचे कारण',
      remarks: 'अभिप्राय',
      signCT: 'वर्गशिक्षक स्वाक्षरी',
      signClerk: 'लिपिक स्वाक्षरी',
      signHM: 'मुख्याध्यापक स्वाक्षरी',
      seal: 'शाळेचा शिक्का'
    },
    ur: {
      schoolName,
      societyName: managementName,
      address: schoolAddress,
      udise: schoolUdise ? `یوڈائس نمبر: ${schoolUdise}` : 'یوڈائس نمبر: —',
      board: 'بورڈ: مہاراشٹر اسٹیٹ بورڈ',
      medium: 'ذریعہ تعلیم: انگریزی / اردو',
      lcTitle: 'اسکول چھوڑنے کا سرٹیفکیٹ (ایل سی)',
      bonafideTitle: 'بونافائیڈ سرٹیفکیٹ',
      certNum: 'سرٹیفکیٹ نمبر',
      grNum: 'جی آر نمبر',
      pupilId: 'طالب علم کی شناختی آئی ڈی',
      aadhaar: 'آدھار کارڈ نمبر',
      fullName: 'طالب علم کا پورا نام',
      fatherName: 'والد کا نام',
      motherName: 'والدہ کا نام',
      nationality: 'قومیت',
      motherTongue: 'مادری زبان',
      religion: 'مذہب',
      caste: 'ذات اور ذیلی ذات',
      birthPlace: 'جائے پیدائش',
      dob: 'تاریخ پیدائش (ہندسوں میں)',
      dobWords: 'تاریخ پیدائش (لفظوں میں)',
      lastSchool: 'سابقہ اسکول',
      admDate: 'داخلے کی تاریخ',
      admStandard: 'داخلے کے وقت جماعت',
      progress: 'تعلیمی ترقی',
      conduct: 'چال چلن',
      dateLeaving: 'اسکول چھوڑنے کی تاریخ',
      stdStudied: 'کس جماعت میں تعلیم حاصل کر رہے تھے اور کب سے',
      reasonLeaving: 'اسکول چھوڑنے کی وجہ',
      remarks: 'کیفیت / ریمارکس',
      signCT: 'دستخط کلاس ٹیچر',
      signClerk: 'دستخط کلرک',
      signHM: 'دستخط ہیڈ ماسٹر',
      seal: 'اسکول کی مہر'
    }
  };

  const headerLanguage = primaryDocumentLanguage(sectionSelection(documentLanguageProfile, 'header'), certLanguage);
  const titleLanguage = primaryDocumentLanguage(sectionSelection(documentLanguageProfile, 'title'), certLanguage);
  const bodyLanguage = primaryDocumentLanguage(sectionSelection(documentLanguageProfile, 'body'), certLanguage);
  const remarksLanguage = primaryDocumentLanguage(sectionSelection(documentLanguageProfile, 'remarks'), certLanguage);
  const signatureLanguage = primaryDocumentLanguage(sectionSelection(documentLanguageProfile, 'signatures'), certLanguage);
  const activeTrans = translations[bodyLanguage as keyof typeof translations] || translations.en;
  const headerTrans = translations[headerLanguage as keyof typeof translations] || translations.en;
  const titleTrans = translations[titleLanguage as keyof typeof translations] || translations.en;
  const signatureTrans = translations[signatureLanguage as keyof typeof translations] || translations.en;
  const activeTemplatePreset = getCertificateTemplatePreset(certType === 'leaving' ? 'official-lc-reference' : selectedTemplateId);
  const templateIsLandscape = certType !== 'leaving' && activeTemplatePreset.orientation === 'landscape';
  const visibleTemplatePresets = useMemo(() => CERTIFICATE_TEMPLATE_PRESETS.filter((preset) => !preset.officialLc && preset.orientation === templateOrientation), [templateOrientation]);
  const selectedLanguageOption = useMemo(() => CERTIFICATE_LANGUAGE_OPTIONS.find((item) => item.code === certLanguage) || CERTIFICATE_LANGUAGE_OPTIONS[0], [certLanguage]);

  // Helper conversion for figures DOB to words
  const getDobInWords = (dobStr: string): string => {
    if (!dobStr) return '';
    try {
      const d = new Date(dobStr);
      if (isNaN(d.getTime())) return dobStr;
      
      const numWords = (num: number): string => {
        const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
                       'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
        if (num < 20) return ones[num];
        const digit = num % 10;
        return tens[Math.floor(num / 10)] + (digit !== 0 ? ' ' + ones[digit] : '');
      };

      const day = d.getDate();
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const year = d.getFullYear();
      
      let yearWord = '';
      if (year >= 2000) {
        yearWord = 'Two Thousand ' + numWords(year - 2000);
      } else {
        const first = Math.floor(year / 100);
        const second = year % 100;
        yearWord = numWords(first) + ' Hundred ' + numWords(second);
      }
      return `${numWords(day)} ${months[d.getMonth()]} ${yearWord}`;
    } catch {
      return dobStr;
    }
  };

  // Convert English standard text into Marathi or Urdu for print format
  const activeIssuedCertificate = useMemo(() => certRegistry.find(row => row.certificateNumber === activePrintCertificateNumber && row.status === 'Issued') || null, [certRegistry, activePrintCertificateNumber]);
  const certificateVerificationUrl = activeIssuedCertificate && typeof window !== 'undefined'
    ? `${window.location.origin}/verify-certificate/${encodeURIComponent(activeIssuedCertificate.certificateNumber)}`
    : '';

  const translateStandardText = (std: string, cl: 'mr' | 'ur') => {
    if (!std) return '';
    if (cl === 'mr') {
      return std.replace('Class ', 'इयत्ता ');
    }
    if (cl === 'ur') {
      return std.replace('Class ', 'جماعت ');
    }
    return std;
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* ----------------- HEADLINES SECTION ----------------- */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden no-print">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Award className="w-40 h-40" />
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 relative text-left">
          <div className="space-y-1">
            <span className="text-[10px] bg-indigo-600 text-indigo-100 font-bold tracking-widest uppercase px-3 py-1 rounded-full font-mono">
              Classtago • CERTIFICATE STUDIO
            </span>
            <h1 className="text-xl md:text-2xl font-black tracking-tight font-sans">
              {focusedMode ? focusedTitle : 'Certificate Studio & Templates'}
            </h1>
            <p className="text-xs text-slate-300">
              Select a student, choose the certificate language and premium design, preview it instantly, then print or send the draft through the approval workflow.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 text-center min-w-[70px]">
              <span className="block text-xl font-bold font-mono text-emerald-400">{stats.totalIssued}</span>
              <span className="text-[10px] text-slate-400 uppercase font-mono font-bold">Issued Log</span>
            </div>
            <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 text-center min-w-[70px]">
              <span className="block text-xl font-bold font-mono text-blue-400">{stats.vaultCount}</span>
              <span className="text-[10px] text-slate-400 uppercase font-mono font-bold">Vault Files</span>
            </div>
          </div>
        </div>
      </div>

      {/* ----------------- SUB TAB SELECTOR ----------------- */}
      {!focusedMode && <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1.5 no-print text-xs font-bold font-sans">
        <button
          onClick={() => setActiveSubTab('generate')}
          className={`px-4 py-2 rounded-lg cursor-pointer transition-all border-b-2 ${activeSubTab === 'generate' ? 'bg-slate-100 border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Certificate Creator
        </button>
        <button
          onClick={() => setActiveSubTab('vault')}
          className={`px-4 py-2 rounded-lg cursor-pointer transition-all border-b-2 ${activeSubTab === 'vault' ? 'bg-slate-100 border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Compliance Document Vault
        </button>
        <button
          onClick={() => setActiveSubTab('history')}
          className={`px-4 py-2 rounded-lg cursor-pointer transition-all border-b-2 ${activeSubTab === 'history' ? 'bg-slate-100 border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Historical Ledger Registry ({certRegistry.length})
        </button>
        <button
          onClick={() => setActiveSubTab('audit')}
          className={`px-4 py-2 rounded-lg cursor-pointer transition-all border-b-2 ${activeSubTab === 'audit' ? 'bg-slate-100 border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Secured Security Audit trail
        </button>
      </div>}

      {/* =================================================================================== */}
      {/* SECTION 1: CERTIFICATE CREATOR */}
      {/* =================================================================================== */}
      {activeSubTab === 'generate' && (
        <div className="grid grid-cols-1 gap-6 text-left xl:grid-cols-[minmax(410px,0.9fr)_minmax(0,1.6fr)]">
          
          {/* Column A: Control settings */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-6 no-print shadow-sm">
            <div className="border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-slate-500" />
                <span>Create Certificate</span>
              </h3>
              <p className="text-[11px] text-slate-400">Student → Certificate → Language → Design → Preview</p>
            </div>

            {/* Hierarchical Student Master selector */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600">1. Select Student *</label>
                <p className="mt-0.5 text-[10px] text-slate-400">Academic Year → Class → Division → Student</p>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="space-y-1 text-[10px] font-bold text-slate-500"><span>Academic Year</span><select value={certificateYear} onChange={(e) => { setCertificateYear(e.target.value); setCertificateClass(''); setCertificateDivision(''); setSelectedStudent(null); }} className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700"><option value="">Select Year</option>{academicYearOptions.map((year) => <option key={year.value} value={year.value}>{year.label}{year.isActive ? ' (Current)' : ''}</option>)}</select></label>
                <label className="space-y-1 text-[10px] font-bold text-slate-500"><span>Class</span><select value={certificateClass} disabled={!certificateYear} onChange={(e) => { setCertificateClass(e.target.value); setCertificateDivision(''); setSelectedStudent(null); }} className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 disabled:bg-slate-100"><option value="">Select Class</option>{classOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
                <label className="space-y-1 text-[10px] font-bold text-slate-500"><span>Division</span><select value={certificateDivision} disabled={!certificateClass} onChange={(e) => { setCertificateDivision(e.target.value); setSelectedStudent(null); }} className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 disabled:bg-slate-100"><option value="">Select Division</option>{divisionOptions.map((division) => <option key={division.value} value={division.value}>{division.label}</option>)}</select></label>
                <label className="space-y-1 text-[10px] font-bold text-slate-500"><span>Student</span><select value={selectedStudent?.id || selectedStudent?.grNumber || ''} disabled={!certificateDivision} onChange={(e) => { const value = e.target.value; setSelectedStudent(certificateStudentOptions.find((row) => String(row.id || row.grNumber) === value) || null); }} className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 disabled:bg-slate-100"><option value="">Select Student</option>{certificateStudentOptions.map((student) => <option key={student.id || student.grNumber} value={student.id || student.grNumber}>{student.name} — GR {student.grNumber}</option>)}</select></label>
              </div>
              {certificateDivision && certificateStudentOptions.length === 0 && <p className="rounded-lg bg-amber-50 px-3 py-2 text-[10px] font-bold text-amber-700">No active students found for this Year / Class / Division.</p>}
              {studentScopeError && <p className="rounded-lg bg-rose-50 px-3 py-2 text-[10px] font-bold text-rose-700">Student list could not load from cloud: {studentScopeError}</p>}
            </div>

            {/* Selected summary indicator */}
            {selectedStudent && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-[11px] text-slate-700">
                <div className="flex justify-between items-center border-b border-slate-150 pb-1">
                  <span className="font-bold text-slate-900">Student Profile Master</span>
                  <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded font-mono uppercase">ACTIVE</span>
                </div>
                <p><strong>Full Name:</strong> {selectedStudent.name}</p>
                <p><strong>GR / Register No:</strong> <span className="font-mono text-indigo-600 font-bold">{selectedStudent.grNumber}</span></p>
                <p><strong>Standard / Division:</strong> {selectedStudent.className || selectedStudent.classId || '—'} / {selectedStudent.divisionName || selectedStudent.division || 'No Division'}</p>
                <p><strong>Father:</strong> {selectedStudent.fatherName}</p>
                <p><strong>DOB (Figures):</strong> <span className="font-mono">{selectedStudent.dob}</span></p>
              </div>
            )}

            {/* Certificate type picker */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-600">2. Select Certificate Wording *</label>
              <select
                value={certType}
                onChange={(e) => setCertType(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-bold"
              >
                <option value="bonafide">Bonafide Certificate</option>
                <option value="leaving">School Leaving Certificate (LC / TC)</option>
                <option value="character">Character Certificate</option>
                <option value="study">Study Certificate</option>
                <option value="promotion">Promotion Certificate</option>
                <option value="passing">Passing Certificate</option>
                <option value="birth_date">Birth Date Certificate</option>
                <option value="medium">Medium of Instruction Certificate</option>
                <option value="conduct">Conduct Certificate</option>
                <option value="duplicate">Duplicate Certificate Stamp</option>
                <option value="custom">Custom specified Certificate</option>
              </select>
            </div>

            <div className="space-y-3 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-800">3. Certificate Language *</label>
                  <p className="mt-0.5 text-[10px] text-slate-400">Language and template are applied to the same live preview.</p>
                </div>
                <span className="rounded-full bg-indigo-50 px-2 py-1 text-[9px] font-black text-indigo-700">{selectedLanguageOption.name}</span>
              </div>
              <select value={certLanguage} onChange={(e) => { const next=e.target.value; setCertLanguage(next); setDocumentLanguageProfile(prev=>({ ...prev, defaultSelection:{...prev.defaultSelection,languages:[next]}, sections:{...prev.sections, body:{...(prev.sections.body||prev.defaultSelection),languages:[next]}} })); }} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-indigo-700">
                {CERTIFICATE_LANGUAGE_OPTIONS.map((language) => <option key={language.code} value={language.code}>{language.name} — {language.nativeName}</option>)}
              </select>
              {!['en', 'mr', 'ur'].includes(certLanguage) && <p className="rounded-lg bg-amber-50 px-3 py-2 text-[10px] leading-4 text-amber-700">Selected script/font is supported. Where the school has not approved a statutory translation pack, official English wording remains visible rather than generating an unverified translation.</p>}
              <div className="pt-1"><DocumentLanguageStudio profile={documentLanguageProfile} onChange={setDocumentLanguageProfile} sections={[...CERTIFICATE_DOCUMENT_LANGUAGE_SECTIONS]} title="Certificate Section Languages" description="Keep the header in English, use Urdu or Marathi for the body, and choose a different language for remarks or signatures. This setting is saved with the issued certificate." compact /></div>
            </div>

            <div className="space-y-3 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-800">4. Premium Template *</label>
                  <p className="mt-0.5 text-[10px] text-slate-400">Choose a finished design. Preview and Print/PDF update immediately.</p>
                </div>
                {certType !== 'leaving' && <span className="rounded-full bg-slate-900 px-2 py-1 text-[9px] font-black text-white">{visibleTemplatePresets.length} designs</span>}
              </div>

              {certType === 'leaving' ? (
                <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-3">
                  <div className="text-xs font-black text-rose-800">Official School Leaving Certificate</div>
                  <p className="mt-1 text-[10px] leading-4 text-rose-600">Locked portrait statutory layout based on the school reference format. Decorative award templates cannot override LC fields.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
                    <button type="button" onClick={() => setTemplateOrientation('portrait')} className={`rounded-lg px-3 py-2 text-[11px] font-black transition ${templateOrientation === 'portrait' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>Portrait</button>
                    <button type="button" onClick={() => setTemplateOrientation('landscape')} className={`rounded-lg px-3 py-2 text-[11px] font-black transition ${templateOrientation === 'landscape' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>Landscape</button>
                  </div>
                  <div className="grid max-h-[620px] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                    {visibleTemplatePresets.map((preset) => {
                      const selected = preset.id === selectedTemplateId;
                      return (
                        <button key={preset.id} type="button" onClick={() => applyTemplatePreset(preset.id)} className={`group rounded-2xl border p-2 text-left transition ${selected ? 'border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-100' : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lg'}`}>
                          <div className="rounded-xl bg-slate-100/90 p-2">
                            <CertificateTemplateThumbnail preset={preset} schoolName={schoolName} managementName={managementName || 'School Management'} logoUrl={academicSetup?.schoolProfile?.schoolLogo || undefined} studentName={selectedStudent?.name || 'Student Name'} languageLabel={selectedLanguageOption.name} selected={selected} />
                          </div>
                          <div className="px-1 pb-1 pt-2">
                            <div className="flex items-start justify-between gap-2"><div><div className="text-[11px] font-black text-slate-900">{preset.name}</div><div className="mt-0.5 text-[9px] font-bold text-slate-400">{preset.category}</div></div>{selected && <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[8px] font-black text-white">SELECTED</span>}</div>
                            <p className="mt-1 line-clamp-2 text-[9px] leading-4 text-slate-500">{preset.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Bonafide Purpose dropdown with custom insert additions */}
            {certType === 'bonafide' && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-600">Bonafide Certified Purpose</label>
                <select
                  value={bonafidePurpose}
                  onChange={(e) => setBonafidePurpose(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  <option value="Scholarship">Scholarship Application</option>
                  <option value="Bank">Bank Account Opening</option>
                  <option value="Passport">Passport Issuance</option>
                  <option value="Aadhaar">Aadhaar Card Correction</option>
                  <option value="Railway Pass">Railway Concession Pass</option>
                  <option value="Bus Pass">State Transport Bus Pass</option>
                  <option value="Income Certificate">Income Certificate application</option>
                  <option value="Hostel">Hostel Accommodation</option>
                  {customPurposes.map(pur => (
                    <option key={pur} value={pur}>{pur}</option>
                  ))}
                </select>

                {/* Unlimited purpose editor (HM only) */}
                {user.role === 'headmaster' && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newPurposeInput}
                      onChange={(e) => setNewPurposeInput(e.target.value)}
                      placeholder="Add customized purpose..."
                      className="flex-1 px-3 py-1 text-xs border border-slate-200 rounded-lg"
                    />
                    <button
                      onClick={handleAddPurpose}
                      className="px-3 py-1 bg-slate-800 text-white font-bold text-xs rounded-lg hover:bg-slate-900 cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Custom Certificate wording configuration */}
            {certType === 'custom' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600">Customized Certificate Title</label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600">Customized Certification Body Text</label>
                  <textarea
                    rows={4}
                    value={customBody}
                    onChange={(e) => setCustomBody(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>
            )}

            {/* Leaving Certificate Specific original official Maharashtra fields */}
            {certType === 'leaving' && (
              <div className="space-y-3 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 max-h-[300px] overflow-y-auto">
                <div className="flex justify-between items-center border-b border-indigo-100 pb-1">
                  <span className="text-[10px] font-extrabold uppercase text-indigo-900">Legal LC Data Fields</span>
                  <span className="text-[9px] text-indigo-700 bg-white border border-indigo-200 px-1.5 py-0.5 rounded font-mono">35+ Fields Loaded</span>
                </div>
                
                <div className="space-y-2 text-xs">
                  <div>
                    <label className="block text-[9px] text-slate-500 font-semibold">LC General Register Number</label>
                    <input
                      type="text"
                      value={lcFields.lcNumber}
                      onChange={(e) => setLcFields({ ...lcFields, lcNumber: e.target.value })}
                      className="w-full px-2 py-1 text-[11px] border border-slate-200 rounded bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 font-semibold">Pupil / Student ID</label>
                    <input
                      type="text"
                      value={lcFields.pupilId}
                      onChange={(e) => setLcFields({ ...lcFields, pupilId: e.target.value })}
                      className="w-full px-2 py-1 text-[11px] border border-slate-200 rounded bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 font-semibold">Birth Place</label>
                    <input
                      type="text"
                      value={lcFields.placeOfBirth}
                      onChange={(e) => setLcFields({ ...lcFields, placeOfBirth: e.target.value })}
                      className="w-full px-2 py-1 text-[11px] border border-slate-200 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 font-semibold">Taluka / Tehsil</label>
                    <input
                      type="text"
                      value={lcFields.taluka}
                      onChange={(e) => setLcFields({ ...lcFields, taluka: e.target.value })}
                      className="w-full px-2 py-1 text-[11px] border border-slate-200 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 font-semibold">District</label>
                    <input
                      type="text"
                      value={lcFields.district}
                      onChange={(e) => setLcFields({ ...lcFields, district: e.target.value })}
                      className="w-full px-2 py-1 text-[11px] border border-slate-200 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 font-semibold">Conduct</label>
                    <input
                      type="text"
                      value={lcFields.conduct}
                      onChange={(e) => setLcFields({ ...lcFields, conduct: e.target.value })}
                      className="w-full px-2 py-1 text-[11px] border border-slate-200 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 font-semibold">Reason for Leaving</label>
                    <input
                      type="text"
                      value={lcFields.reasonForLeaving}
                      onChange={(e) => setLcFields({ ...lcFields, reasonForLeaving: e.target.value })}
                      className="w-full px-2 py-1 text-[11px] border border-slate-200 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 font-semibold">LC Official Remarks</label>
                    <input
                      type="text"
                      value={lcFields.remarks}
                      onChange={(e) => setLcFields({ ...lcFields, remarks: e.target.value })}
                      className="w-full px-2 py-1 text-[11px] border border-slate-200 rounded bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* DUAL MODE SELECTOR: Official Format Lock vs Custom Mode */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1">
                  {isOfficialMode ? <Lock className="w-3.5 h-3.5 text-indigo-600" /> : <Unlock className="w-3.5 h-3.5 text-amber-500" />}
                  <span>School LC Format Lock</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsOfficialMode(!isOfficialMode)}
                  className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase cursor-pointer ${isOfficialMode ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                >
                  {isOfficialMode ? 'LOCK' : 'CUSTOMIZE'}
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                {isOfficialMode 
                  ? 'Locked mode preserves the school-configured LC layout, header fields and grid spacing. Use Custom mode only when an authorised template variation is required.' 
                  : 'Custom Mode unlocked. Alter borders, theme colors, watermarks, and header designs.'}
              </p>
            </div>

            {/* Styling sliders for Custom Mode (disabled if official mode active) */}
            {!isOfficialMode && (
              <div className="space-y-3 bg-amber-50/50 p-3 rounded-xl border border-amber-100 animate-fade-in text-xs">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wide flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Custom Style Options</span>
                </span>
                
                <div className="space-y-2">
                  <div>
                    <label className="block text-[10px] text-slate-500">Border Style</label>
                    <select
                      value={borderStyle}
                      onChange={(e: any) => setBorderStyle(e.target.value)}
                      className="w-full px-2 py-1 text-[11px] border border-slate-200 bg-white rounded"
                    >
                      <option value="solid">Single Solid Line</option>
                      <option value="double">Double Border Line</option>
                      <option value="ornate">Ornate Victorian Frame</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500">Theme Color</label>
                    <div className="flex gap-1.5 mt-1">
                      {['#1e293b', '#1e3a8a', '#064e3b', '#4c1d95', '#7f1d1d'].map(col => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => setThemeColor(col)}
                          className={`w-6 h-6 rounded-full border cursor-pointer ${themeColor === col ? 'ring-2 ring-indigo-500 border-white' : 'border-slate-300'}`}
                          style={{ backgroundColor: col }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      id="showWatermarkOpt"
                      type="checkbox"
                      checked={showWatermark}
                      onChange={(e) => setShowWatermark(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="showWatermarkOpt" className="text-[11px] text-slate-600">Include Watermark Background</label>
                  </div>

                  {showWatermark && (
                    <input
                      type="text"
                      value={watermarkText}
                      onChange={(e) => setWatermarkText(e.target.value.toUpperCase())}
                      className="w-full px-2 py-1 text-[11px] border border-slate-200 bg-white rounded font-mono font-bold"
                    />
                  )}

                  <div className="flex items-center gap-2">
                    <input
                      id="showLogoOpt"
                      type="checkbox"
                      checked={showLogo}
                      onChange={(e) => setShowLogo(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="showLogoOpt" className="text-[11px] text-slate-600">Render School Logo Header</label>
                  </div>
                </div>
              </div>
            )}

            {/* Signature customizers */}
            <div className="space-y-2 border-t border-slate-100 pt-3 text-xs">
              <span className="font-bold text-slate-800 block">Signatures & Verifications</span>
              
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Class Teacher:</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setClassTeacherSignType('digital')}
                      className={`px-1.5 py-0.5 text-[9px] rounded font-bold ${classTeacherSignType === 'digital' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}
                    >
                      Digital
                    </button>
                    <button
                      type="button"
                      onClick={() => setClassTeacherSignType('manual')}
                      className={`px-1.5 py-0.5 text-[9px] rounded font-bold ${classTeacherSignType === 'manual' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}
                    >
                      Manual
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Administrative Clerk:</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setClerkSignType('digital')}
                      className={`px-1.5 py-0.5 text-[9px] rounded font-bold ${clerkSignType === 'digital' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}
                    >
                      Digital
                    </button>
                    <button
                      type="button"
                      onClick={() => setClerkSignType('manual')}
                      className={`px-1.5 py-0.5 text-[9px] rounded font-bold ${clerkSignType === 'manual' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}
                    >
                      Manual
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Headmaster Approval:</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setHeadmasterSignType('digital')}
                      className={`px-1.5 py-0.5 text-[9px] rounded font-bold ${headmasterSignType === 'digital' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}
                    >
                      Digital
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeadmasterSignType('manual')}
                      className={`px-1.5 py-0.5 text-[9px] rounded font-bold ${headmasterSignType === 'manual' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}
                    >
                      Manual
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleIssueCertificate}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
              >
                <Award className="w-4 h-4" />
                <span>{user.role === 'clerk' ? 'Save Draft & Send to Headmaster' : 'Issue Certificate'}</span>
              </button>
            </div>
          </div>

          {/* Column B: Realtime Print A4 Engine preview */}
          <div className="bg-gradient-to-br from-slate-200 to-slate-100 border border-slate-300 rounded-2xl p-4 md:p-6 overflow-x-auto text-center relative shadow-inner">
            <div className="flex flex-wrap items-center justify-between gap-2 no-print mb-4">
              <span className="bg-slate-800 text-white font-mono text-[9px] px-2.5 py-1 rounded-md uppercase font-bold">
                LIVE PRINT PREVIEW
              </span>
              
              <div className="flex items-center gap-2">
                <select
                  value={printPaperSize}
                  onChange={(e) => setPrintPaperSize(e.target.value as any)}
                  className="px-2 py-1 text-[11px] font-bold border border-slate-300 bg-white rounded"
                >
                  <option value="A4">Standard A4 Paper</option>
                  <option value="A3">Large A3 Ledger</option>
                </select>
                
                <select
                  value={printColorMode}
                  onChange={(e) => setPrintColorMode(e.target.value as any)}
                  className="px-2 py-1 text-[11px] font-bold border border-slate-300 bg-white rounded"
                >
                  <option value="color">Full Color Print</option>
                  <option value="bw">Grayscale (B&W)</option>
                </select>

                <button
                  onClick={() => printSectionById('print-area', 'School Certificate')}
                  className="px-3 py-1 bg-indigo-600 text-white text-[11px] font-bold rounded flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Execute Print</span>
                </button>
                <PrintPDFButton title="School Certificate" lang={lang} elementId="print-area" orientation={certType === 'leaving' ? 'portrait' : activeTemplatePreset.orientation} allowLanguageSelection={false} />
              </div>
            </div>

            {/* Simulated Paper Frame */}
            {selectedStudent ? (
              <div 
                id="print-area" 
                className={`shadow-2xl mx-auto text-left text-slate-900 relative p-8 md:p-12 transition-all ${templateIsLandscape ? (printPaperSize === 'A3' ? 'max-w-[420mm] min-h-[297mm]' : 'max-w-[297mm] min-h-[210mm]') : (printPaperSize === 'A3' ? 'max-w-[297mm] min-h-[420mm]' : 'max-w-[210mm] min-h-[297mm]')} ${printColorMode === 'bw' ? 'filter grayscale' : ''}`}
                style={{
                  fontFamily: documentLanguageFont(bodyLanguage),
                  background: certType === 'leaving' ? '#fffdfa' : activeTemplatePreset.background,
                  borderStyle: certType === 'leaving' ? 'double' : (borderStyle === 'ornate' ? 'double' : (borderStyle === 'double' ? 'double' : 'solid')),
                  borderWidth: certType === 'leaving' ? '4px' : (borderStyle === 'ornate' ? '12px' : (borderStyle === 'double' ? '8px' : '2px')),
                  borderColor: certType === 'leaving' ? '#b94d63' : themeColor
                }}
              >
                {certType !== 'leaving' && <div className="absolute inset-0 z-0"><CertificateTemplateDecorations preset={activeTemplatePreset} /></div>}
                
                {/* Custom Watermark overlay */}
                {showWatermark && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] select-none pointer-events-none transform -rotate-12 z-0">
                    <span className="text-5xl font-black font-sans uppercase tracking-widest text-center">
                      {watermarkText}
                    </span>
                  </div>
                )}

                {/* Main Content Area above watermark */}
                <div className="relative z-10 space-y-6">
                  
                  {/* Institutional Header Block */}
                  {showLogo && certType !== 'leaving' && (
                    <div className="text-center space-y-1 border-b-2 border-slate-900 pb-4" dir={documentLanguageDirection(headerLanguage)} style={{fontFamily:documentLanguageFont(headerLanguage)}}>
                      <div className="flex items-center justify-between">
                        <div className="flex h-16 w-16 items-center justify-center">
                          <SchoolBrandMark
                            schoolName={schoolName}
                            managementName={managementName || "Bharat Vividh Vidhayak Karya Samiti's"}
                            imageUrl={academicSetup?.schoolProfile?.schoolLogo || undefined}
                            className="h-16 w-16"
                          />
                        </div>
                        
                        <div className="text-center flex-1">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-sans">
                            {headerTrans.societyName}
                          </span>
                          <h1 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">
                            {headerTrans.schoolName}
                          </h1>
                          <p className="text-[9px] text-slate-600 font-sans">
                            {headerTrans.address}
                          </p>
                          <p className="text-[9px] font-bold font-mono text-indigo-950 uppercase mt-1">
                            {headerTrans.udise} | INDEX NO: {lcFields.indexNumber}
                          </p>
                        </div>

                        {/* Student Photo support */}
                        <div className="w-14 h-16 border-2 border-slate-800 p-0.5 bg-slate-100 flex items-center justify-center text-[8px] overflow-hidden">
                          {selectedStudent.photo ? (
                            <img src={selectedStudent.photo} alt="Student" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="text-center text-slate-400">
                              <User className="w-6 h-6 mx-auto text-slate-300" />
                              <span>PHOTO</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* -------------------- BONAFIDE CERTIFICATE PREVIEW -------------------- */}
                  {certType === 'bonafide' && (
                    <div className="space-y-6 pt-4">
                      <div className="text-center">
                        <h2 className="inline-block border-y-2 border-slate-800 px-6 py-1.5 text-base font-black uppercase bg-slate-50 tracking-wider" dir={documentLanguageDirection(titleLanguage)} style={{fontFamily:documentLanguageFont(titleLanguage)}}>
                          {titleTrans.bonafideTitle}
                        </h2>
                      </div>

                      <div className="flex justify-between items-center text-[11px] font-bold border-b border-dashed border-slate-300 pb-2">
                        <span>{activeTrans.certNum}: NHS/BON/202627/{selectedStudent.grNumber}</span>
                        <span>Date: {new Date().toISOString().substring(0, 10)}</span>
                      </div>

                      <UrduWrapper lang={bodyLanguage === 'mr' ? 'hi' : bodyLanguage} className="leading-loose text-justify text-sm space-y-6 pt-4 px-4 text-slate-800">
                        {bodyLanguage === 'ur' ? (
                          <p className="font-urdu">
                            مصدقہ کیا جاتا ہے کہ طالب علم <strong className="text-indigo-950 text-base underline">{selectedStudent.name}</strong>، ولد <strong className="text-slate-900">{selectedStudent.fatherName}</strong> <strong>{schoolName}</strong> کے باضابطہ اور باقاعدہ طالب علم ہیں۔
                          </p>
                        ) : bodyLanguage === 'mr' ? (
                          <p>
                            असे प्रमाणित करण्यात येते की, विद्यार्थी <strong className="text-indigo-950 text-base underline">{selectedStudent.name}</strong>, वडील <strong className="text-slate-900">{selectedStudent.fatherName}</strong> हे <strong>{schoolName}</strong> चे नियमित बोनाफाईड विद्यार्थी आहेत.
                          </p>
                        ) : (
                          <p>
                            This is to certify that Master/Miss <strong className="text-indigo-950 text-base underline">{selectedStudent.name}</strong>, Son/Daughter of <strong className="text-slate-900">{selectedStudent.fatherName}</strong> and Mother <strong className="text-slate-900">{selectedStudent.motherName || '—'}</strong> is a bonafide student of {schoolName}.
                          </p>
                        )}

                        {bodyLanguage === 'ur' ? (
                          <p className="font-urdu">
                            وہ اس وقت تعلیمی سال <strong className="text-slate-900 font-mono">{selectedStudent.academicYear}</strong> کے دوران جماعت <strong className="text-slate-900 text-base underline">{translateStandardText('Class ' + (selectedStudent.className || selectedStudent.classId || selectedStudent.admissionClassId), 'ur')} ({selectedStudent.division})</strong> میں زیر تعلیم ہیں۔
                          </p>
                        ) : bodyLanguage === 'mr' ? (
                          <p>
                            ते सध्या शैक्षणिक वर्ष <strong className="text-slate-900 font-mono">{selectedStudent.academicYear}</strong> दरम्यान इयत्ता <strong className="text-slate-900 text-base underline">{translateStandardText('Class ' + (selectedStudent.className || selectedStudent.classId || selectedStudent.admissionClassId), 'mr')} ({selectedStudent.division})</strong> मध्ये शिकत आहेत.
                          </p>
                        ) : (
                          <p>
                            He/She is currently studying in class <strong className="text-slate-900 text-base underline">{selectedStudent.className || selectedStudent.classId || selectedStudent.admissionClassId || 'Class —'} ({selectedStudent.divisionName || selectedStudent.division || 'No Division'})</strong> during the active academic session of <strong className="text-slate-900">{selectedStudent.academicYear}</strong>.
                          </p>
                        )}

                        {bodyLanguage === 'ur' ? (
                          <p className="font-urdu">
                            سرکاری جنرل رجسٹر کے مطابق ان کا جی آر نمبر <strong className="font-mono text-indigo-900">{selectedStudent.grNumber}</strong> ہے۔ ان کی تاریخ پیدائش <strong className="font-mono underline">{selectedStudent.dob}</strong> درج ہے۔ یہ سرٹیفکیٹ <strong className="font-bold underline">{bonafidePurpose}</strong> کی غرض سے جاری کیا گیا ہے۔
                          </p>
                        ) : bodyLanguage === 'mr' ? (
                          <p>
                            शाळेच्या जनरल रजिस्टर नोंदीनुसार त्यांचा जी.आर. क्रमांक <strong className="font-mono text-indigo-900">{selectedStudent.grNumber}</strong> आहे. त्यांची जन्म तारीख <strong className="font-mono underline">{selectedStudent.dob}</strong> अशी आहे. हे प्रमाणपत्र <strong className="font-bold underline">{bonafidePurpose}</strong> या कारणासाठी दिले गेले आहे.
                          </p>
                        ) : (
                          <p>
                            As per official registry records, his/her General Register (G.R.) Number is <strong className="font-mono text-indigo-900">{selectedStudent.grNumber}</strong>. His/Her registered Date of Birth is <strong className="font-mono underline">{selectedStudent.dob}</strong> ({getDobInWords(selectedStudent.dob)}). This certificate is issued specifically for the purpose of <strong className="font-bold underline">{bonafidePurpose}</strong>.
                          </p>
                        )}

                        <p className="text-xs text-slate-500 italic mt-6 text-center">
                          {bodyLanguage === 'ur' ? '* ہمارے بہترین علم اور اسکول رجسٹر کے مطابق ان کا اخلاق اور کردار بہترین رہا ہے۔ *' : '* To the best of our knowledge and school registers, he/she bears an exemplary moral character. *'}
                        </p>
                      </UrduWrapper>
                    </div>
                  )}

                  {/* -------------------- NATIONAL HIGH SCHOOL OFFICIAL LEAVING CERTIFICATE -------------------- */}
                  {certType === 'leaving' && (
                    <div className="official-lc-sheet text-[#4b3d43] space-y-2" style={{ fontFamily: 'Georgia, Times New Roman, serif' }}>
                      <div className="grid grid-cols-[78px_1fr_78px] items-center gap-2 text-center">
                        <div className="h-[76px] flex items-center justify-center">
                          <SchoolBrandMark
                            schoolName={schoolName}
                            managementName={managementName || "Bharat Vividh Vidhayak Karya Samiti's"}
                            imageUrl={academicSetup?.schoolProfile?.schoolLogo || undefined}
                            className="h-[74px] w-[64px]"
                          />
                        </div>
                        <div className="leading-tight">
                          <p className="text-[10px] font-bold">Bharat Vividh Vidhayak Kanya Sameeti's</p>
                          <h1 className="text-[28px] md:text-[34px] font-black tracking-wide text-[#b94d63] uppercase">NATIONAL HIGH SCHOOL</h1>
                          <p className="text-[12px] md:text-sm font-bold">{schoolAddress || 'School address not configured'}</p>
                          <p className="text-[12px] font-bold">E-mail: nhstaloda86@gmail.com</p>
                        </div>
                        <div />
                      </div>

                      <div className="border border-[#b94d63] text-[10px]">
                        <div className="grid grid-cols-[1fr_2.7fr_1fr] border-b border-[#b94d63]">
                          <div className="p-1.5 border-r border-[#b94d63] font-bold">G.R. No. <span className="font-mono">{selectedStudent.grNumber}</span></div>
                          <div className="p-1.5 border-r border-[#b94d63] text-center font-bold">जा. क्र. शिक्षण / माध्यमिक-2 / प्रमा / 95144 / 50 दि. 27 जून 1996</div>
                          <div className="p-1.5 font-bold">L.C. No. <span className="font-mono">{lcFields.lcNumber}</span></div>
                        </div>
                        <div className="grid grid-cols-[1.15fr_1fr_1fr_1fr]">
                          <div className="p-1.5 border-r border-[#b94d63] font-bold">U-DISE NO. <span className="font-mono">{lcFields.udiseNumber}</span></div>
                          <div className="p-1.5 border-r border-[#b94d63] font-bold">Board <span className="ml-2">{lcFields.board}</span></div>
                          <div className="p-1.5 border-r border-[#b94d63] font-bold">Medium <span className="ml-2">{lcFields.medium}</span></div>
                          <div className="p-1.5 font-bold">Index No. <span className="font-mono">{lcFields.indexNumber}</span></div>
                        </div>
                      </div>

                      <h2 className="text-center text-[22px] md:text-[26px] font-black tracking-widest text-[#b94d63] border-y border-[#b94d63] py-1">LEAVING CERTIFICATE</h2>

                      <div className="space-y-2.5 text-[11px] md:text-[12px] px-1">
                        <div className="grid grid-cols-[135px_1fr] items-center gap-2">
                          <span className="font-bold">Pupil's I.D.</span>
                          <div className="flex flex-wrap">
                            {String(lcFields.pupilId || '').replace(/\s/g, '').padEnd(18, ' ').slice(0, 18).split('').map((char, idx) => (
                              <span key={idx} className="w-[22px] h-[22px] border border-slate-400 flex items-center justify-center font-mono font-bold">{char.trim()}</span>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-[135px_1fr] items-center gap-2">
                          <span className="font-bold">Aadhaar Card No.</span>
                          <div className="flex flex-wrap gap-x-2">
                            {[0, 4, 8].map(group => (
                              <div key={group} className="flex">
                                {String(lcFields.aadhaarNumber || '').replace(/\D/g, '').padEnd(12, ' ').slice(group, group + 4).split('').map((char, idx) => (
                                  <span key={idx} className="w-[22px] h-[22px] border border-slate-400 flex items-center justify-center font-mono font-bold">{char.trim()}</span>
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="border-b border-slate-400 pb-1"><strong>Pupil's Full Name: (Name)</strong> <span className="ml-2 uppercase font-bold">{selectedStudent.name}</span></div>
                        <div className="grid grid-cols-2 gap-6 border-b border-slate-400 pb-1"><span><strong>(Father's Name)</strong> {selectedStudent.fatherName}</span><span className="text-right"><strong>(Surname)</strong></span></div>
                        <div className="border-b border-slate-400 pb-1"><strong>Mother's Name:</strong> <span className="ml-2 font-bold">{selectedStudent.motherName || ''}</span></div>

                        <div className="grid grid-cols-2 gap-5">
                          <div className="border-b border-slate-400 pb-1"><strong>Nationality:</strong> <span className="ml-2 font-bold italic">{selectedStudent.nationality || 'Indian'}</span></div>
                          <div className="border-b border-slate-400 pb-1"><strong>Mother Tongue:</strong> <span className="ml-2 font-bold italic">{selectedStudent.motherTongue || 'Urdu'}</span></div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="border-b border-slate-400 pb-1"><strong>Religion:</strong> {selectedStudent.religion || ''}</div>
                          <div className="border-b border-slate-400 pb-1"><strong>Caste:</strong> {selectedStudent.caste || ''}</div>
                          <div className="border-b border-slate-400 pb-1"><strong>Sub Caste:</strong> {(selectedStudent as any).subCaste || ''}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-5">
                          <div className="border-b border-slate-400 pb-1"><strong>Place of Birth:</strong> {lcFields.placeOfBirth}</div>
                          <div className="border-b border-slate-400 pb-1"><strong>Taluka:</strong> {lcFields.taluka}</div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="border-b border-slate-400 pb-1"><strong>Dist.:</strong> {lcFields.district}</div>
                          <div className="border-b border-slate-400 pb-1"><strong>State:</strong> {lcFields.state}</div>
                          <div className="border-b border-slate-400 pb-1"><strong>Country:</strong> <span className="font-bold italic">{lcFields.country}</span></div>
                        </div>

                        <div className="grid grid-cols-[180px_1fr] items-center gap-2">
                          <strong>Date of Birth (in figures):</strong>
                          <div className="flex gap-x-2">
                            {String(selectedStudent.dob || '').split('-').reverse().map((part: string, group: number) => (
                              <div key={group} className="flex">
                                {part.split('').map((char: string, idx: number) => (
                                  <span key={idx} className="w-[22px] h-[22px] border border-slate-400 flex items-center justify-center font-mono font-bold">{char}</span>
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="border-b border-slate-400 min-h-[42px] pb-1"><strong>(in words)</strong> <span className="ml-2">{getDobInWords(selectedStudent.dob)}</span></div>

                        <div className="border-b border-slate-400 pb-1"><strong>Last School Attended:</strong> <span className="ml-2">{lcFields.lastSchool}</span></div>
                        <div className="grid grid-cols-[1fr_160px] gap-5">
                          <div className="border-b border-slate-400 pb-1"><strong>Date of Admission:</strong> <span className="ml-2 font-mono">{selectedStudent.admissionDate || ''}</span></div>
                          <div className="border-b border-slate-400 pb-1"><strong>Std.:</strong> {lcFields.standardAtAdmission}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-5">
                          <div className="border-b border-slate-400 pb-1"><strong>Progress:</strong> {lcFields.progress}</div>
                          <div className="border-b border-slate-400 pb-1"><strong>Conduct:</strong> {lcFields.conduct}</div>
                        </div>
                        <div className="border-b border-slate-400 pb-1"><strong>Date of Leaving:</strong> <span className="ml-2 font-mono">{lcFields.dateOfLeaving}</span></div>
                        <div className="border-b border-slate-400 pb-1"><strong>Std in which studied and since when:</strong> <span className="ml-2">{lcFields.standardStudiedSince}</span></div>
                        <div className="border-b border-slate-400 pb-1"><strong>Reason of Leaving School:</strong> <span className="ml-2">{lcFields.reasonForLeaving}</span></div>
                        <div className="border-b border-slate-400 pb-1" dir={documentLanguageDirection(remarksLanguage)} style={{fontFamily:documentLanguageFont(remarksLanguage),textAlign:documentLanguageDirection(remarksLanguage)==='rtl'?'right':'left'}}><strong>Remarks:</strong> <span className="ml-2">{lcFields.remarks}</span></div>
                      </div>

                      <p className="text-center text-[10px] font-bold border-y border-[#b94d63] py-1">Certified that the above information is in accordance with the School General Register.</p>
                      <div className="grid grid-cols-[1fr_1fr_1fr_92px] gap-5 items-end pt-4 text-[11px]">
                        <div className="space-y-2 font-bold"><p>Place: {lcFields.issuePlace || academicSetup?.schoolProfile?.villageCity || '—'}</p><p>Date: {lcFields.issueDate}</p></div>
                        <div className="text-center pt-10 border-b border-slate-400 pb-1">Class Teacher</div>
                        <div className="text-center pt-10 border-b border-slate-400 pb-1">Clerk</div>
                        <div className="flex justify-center text-[#55409a]">
                          <SchoolSealMark schoolName={schoolName} location={academicSetup?.schoolProfile?.district ? `${academicSetup?.schoolProfile?.villageCity || 'Taloda'}, ${academicSetup.schoolProfile.district}` : 'Location not configured'} className="h-[82px] w-[82px] opacity-80" />
                        </div>
                      </div>
                      <p className="text-[7px] text-center pt-2">Note: No change in any entry in this certificate shall be made except by the authority issuing it.</p>
                    </div>
                  )}

                  {/* -------------------- CHARACTER & CONDUCT CERTIFICATE PREVIEW -------------------- */}
                  {certType === 'character' && (
                    <div className="space-y-8 pt-6">
                      <div className="text-center">
                        <h2 className="inline-block border-y-2 border-slate-800 px-6 py-1.5 text-base font-black uppercase bg-slate-50 tracking-wider">
                          CHARACTER & CONDUCT CERTIFICATE
                        </h2>
                      </div>

                      <div className="leading-loose text-justify text-sm space-y-6 pt-4 px-4 text-slate-800">
                        <p>
                          This is to formally certify that Master/Miss <strong className="text-indigo-950 text-base underline">{selectedStudent.name}</strong>, Son/Daughter of <strong className="text-slate-900">{selectedStudent.fatherName}</strong> is/was a bonafide student of {schoolName}.
                        </p>
                        <p>
                          He/She was enrolled in standard <strong className="underline font-bold">{selectedStudent.className || selectedStudent.classId || selectedStudent.admissionClassId || 'Class —'} ({selectedStudent.divisionName || selectedStudent.division || 'No Division'})</strong> with General Register (G.R.) Number <strong className="font-mono text-indigo-950 font-bold">{selectedStudent.grNumber}</strong>.
                        </p>
                        <p>
                          As recorded in the authorised school record, the student's general conduct is <strong className="underline text-emerald-800 font-extrabold">{lcFields.conduct || 'Not recorded'}</strong>.
                        </p>
                        <p>
                          We bear absolute satisfaction in recommending him/her for any higher educational pursuits or institutional roles. We wish him/her consistent success in all future careers.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* -------------------- OTHER GENERIC CERTIFICATES (STUDY, CONDUCT, PROMOTION ETC) -------------------- */}
                  {certType !== 'bonafide' && certType !== 'leaving' && certType !== 'character' && (
                    <div className="space-y-6 pt-6">
                      <div className="text-center">
                        <h2 className="inline-block border-y-2 border-slate-800 px-6 py-1.5 text-base font-black uppercase bg-slate-50 tracking-wider text-indigo-950">
                          {certType === 'custom' ? customTitle.toUpperCase() : `${certType.replace('_', ' ').toUpperCase()} CERTIFICATE`}
                        </h2>
                      </div>

                      <div className="leading-loose text-justify text-sm space-y-6 pt-4 px-4 text-slate-800">
                        <p>
                          To Whomsoever It May Concern,
                        </p>
                        
                        {certType === 'custom' ? (
                          <p className="leading-relaxed whitespace-pre-wrap">{customBody}</p>
                        ) : (
                          <div className="space-y-4">
                            <p>
                              This is to verify that <strong className="text-indigo-950 underline">{selectedStudent.name}</strong> (G.R. Number <strong className="font-mono text-indigo-900 font-bold">{selectedStudent.grNumber}</strong>) is enrolled under our institutional curriculum.
                            </p>
                            {certType === 'promotion' && (
                              <p>
                                Based on the approved promotion decision recorded by the school, the student is promoted from <strong className="underline">{selectedStudent.className || selectedStudent.classId || selectedStudent.admissionClassId || 'Class —'}</strong> to the recorded next standard for the subsequent academic session.
                              </p>
                            )}
                            {certType === 'birth_date' && (
                              <p>
                                As per page entries of the General Register book, his/her official birth date is <strong className="underline font-mono">{selectedStudent.dob}</strong> which is certified in words as <strong className="italic">{getDobInWords(selectedStudent.dob)}</strong>.
                              </p>
                            )}
                            {certType === 'medium' && (
                              <p>
                                This is further certified that the primary medium of instruction and examinations in {schoolName} is <strong className="underline">{academicSetup?.schoolProfile?.primaryMedium || 'the configured school medium'}</strong>.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* -------------------- SIGNATURE & SEAL AREA -------------------- */}
                  {certType !== 'leaving' && <div className="pt-24 grid grid-cols-3 gap-4 text-center text-[10px] text-slate-800 font-bold font-sans">
                    
                    {/* Class Teacher */}
                    {includeClassTeacherSign && (
                      <div className="space-y-1">
                        <div className="h-10 flex items-center justify-center border-b border-dashed border-slate-400 w-4/5 mx-auto">
                          {classTeacherSignType === 'digital' ? (
                            <span className="font-mono text-[9px] text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded italic">
                              ✓ Assigned Class Teacher
                            </span>
                          ) : (
                            <span className="text-slate-300 italic text-[9px]">Manual Sign</span>
                          )}
                        </div>
                        <p className="font-black text-slate-700">{signatureTrans.signCT}</p>
                      </div>
                    )}

                    {/* Clerk */}
                    {includeClerkSign && (
                      <div className="space-y-1">
                        <div className="h-10 flex items-center justify-center border-b border-dashed border-slate-400 w-4/5 mx-auto">
                          {clerkSignType === 'digital' ? (
                            <span className="font-mono text-[9px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded italic">
                              ✓ S. Deshmukh (Clerk)
                            </span>
                          ) : (
                            <span className="text-slate-300 italic text-[9px]">Manual Sign</span>
                          )}
                        </div>
                        <p className="font-black text-slate-700">{signatureTrans.signClerk}</p>
                      </div>
                    )}

                    {/* Headmaster / Principal */}
                    {includeHeadmasterSign && (
                      <div className="space-y-1">
                        <div className="h-10 flex items-center justify-center border-b border-dashed border-slate-400 w-4/5 mx-auto">
                          {headmasterSignType === 'digital' ? (
                            <span className="font-mono text-[9px] text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded italic">
                              Authorised Headmaster
                            </span>
                          ) : (
                            <span className="text-slate-300 italic text-[9px]">Manual Sign</span>
                          )}
                        </div>
                        <p className="font-black text-slate-700">{signatureTrans.signHM}</p>
                      </div>
                    )}
                  </div>}

                  {/* Verification mark is rendered only for an officially issued record. */}
                  {certificateVerificationUrl && (
                    <div className="mt-6 flex items-end justify-between gap-4 border-t border-slate-100 pt-4">
                      <div className="text-[8px] text-slate-500">
                        <p className="font-black uppercase tracking-wide text-slate-700">Online Verification</p>
                        <p className="font-mono">ID: {activeIssuedCertificate?.certificateNumber}</p>
                        <p>Scan QR to verify current Valid / Revoked / Expired status.</p>
                      </div>
                      <QRCodeSVG value={certificateVerificationUrl} size={72} level="M" marginSize={1} title="Certificate verification QR" />
                    </div>
                  )}

                  {/* Institutional Seal placeholder */}
                  <div className="flex justify-between items-center text-[8px] font-mono text-slate-400 uppercase pt-6 border-t border-slate-100 mt-auto">
                    <span>{activeTrans.seal}</span>
                    <span>* Generated via National high school ERP portal *</span>
                  </div>

                </div>
              </div>
            ) : (
              <div className="bg-white p-20 rounded-xl shadow border border-slate-300 flex flex-col items-center justify-center text-slate-400">
                <AlertCircle className="w-12 h-12 text-slate-300 mb-2" />
                <p>No student selected for live rendering.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================================== */}
      {/* SECTION 2: STUDENT DOCUMENT COMPLIANCE VAULT */}
      {/* =================================================================================== */}
      {activeSubTab === 'vault' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 text-left animate-fade-in no-print">
          
          {/* Student picker */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 xl:col-span-1">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider font-mono">Student Profiles Directory</h3>
              <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-mono font-bold">
                {admissions.length} Registered
              </span>
            </div>

            {/* Quick search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name or GR number..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg"
              />
            </div>

            <div className="space-y-1 max-h-[450px] overflow-y-auto divide-y divide-slate-100">
              {filteredStudents.map(adm => {
                const studentDocs = vaultDocs[adm.grNumber] || [];
                const verifiedCount = studentDocs.filter(d => d.status === 'Verified').length;
                return (
                  <button
                    key={adm.grNumber}
                    onClick={() => setSelectedDocStudent(adm)}
                    className={`w-full p-2.5 rounded-lg text-left transition-all flex justify-between items-center cursor-pointer ${selectedDocStudent?.grNumber === adm.grNumber ? 'bg-indigo-50 text-indigo-950 font-bold border-l-4 border-indigo-600' : 'hover:bg-slate-50 text-slate-600'}`}
                  >
                    <div>
                      <p className="text-xs">{adm.name}</p>
                      <span className="text-[9px] font-mono text-slate-400 uppercase">GR: {adm.grNumber} | {adm.className || adm.classId || 'Class —'}</span>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono font-bold ${verifiedCount === 3 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                      {verifiedCount} Verified
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Verification compliance vault console */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-6 xl:col-span-2">
            {selectedDocStudent ? (
              <div className="space-y-6">
                
                {/* Profile header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-150 pb-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">Security Document Vault Checklist</h3>
                    <p className="text-xs text-indigo-600 font-bold font-mono">
                      GR NO: {selectedDocStudent.grNumber} | {selectedDocStudent.name} ({selectedDocStudent.className || selectedDocStudent.classId || 'Class —'} - {selectedDocStudent.divisionName || selectedDocStudent.division || 'No Division'})
                    </p>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                    <span className="block text-xs font-bold text-slate-500 font-mono">COMPLIANCE STATUS</span>
                    <span className="text-sm font-black text-emerald-600">
                      {((vaultDocs[selectedDocStudent.grNumber] || []).filter(d => d.status === 'Verified').length / 3 * 100).toFixed(0)}% Clear
                    </span>
                  </div>
                </div>

                {/* Upload Section with Drag & Drop styling */}
                <form onSubmit={handleUploadDocument} className="p-5 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl space-y-4">
                  <span className="text-[10px] font-bold text-indigo-900 uppercase font-mono tracking-wider block">
                    Upload & Update Verification Document
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase">Document Category</label>
                      <select
                        value={docCategory}
                        onChange={(e) => setDocCategory(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                      >
                        <option value="Aadhaar Card">Aadhaar Card</option>
                        <option value="Birth Certificate">Birth Certificate</option>
                        <option value="TC">Previous School Leaving Certificate (TC / LC)</option>
                        <option value="Caste Certificate">Caste/Category Certificate</option>
                        <option value="Income Certificate">Income Certificate</option>
                        <option value="Disability Certificate">Disability Certificate</option>
                        <option value="Passport">Passport Document</option>
                        <option value="Custom">Custom Specified Document</option>
                      </select>
                    </div>

                    {docCategory === 'Custom' && (
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase">Specify Document Title *</label>
                        <input
                          type="text"
                          value={customDocType}
                          onChange={(e) => setCustomDocType(e.target.value)}
                          placeholder="e.g. Medical Report, Bonafide Duplicate"
                          className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                          required
                        />
                      </div>
                    )}
                  </div>

                  {/* Drag and Drop Zone */}
                  <div className="border border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-100/50 cursor-pointer transition">
                    <FileUp className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-600">Drag & Drop file here, or click to browse</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Supports PDF, JPG, PNG (Max 5MB)</p>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={uploadProgress}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {uploadProgress ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Processing Upload...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Submit & Apply Version Control</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* List of current Documents with status and version histories */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Current Document Compliance Checklist</h4>
                  
                  {(vaultDocs[selectedDocStudent.grNumber] || []).length > 0 ? (
                    <div className="space-y-3">
                      {(vaultDocs[selectedDocStudent.grNumber] || []).map(doc => (
                        <div key={doc.id} className="p-4 border border-slate-200 rounded-xl space-y-3 hover:shadow-sm transition">
                          
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                <FileText className="w-4 h-4 text-indigo-500" />
                                <span>{doc.documentName}</span>
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                File: <span className="font-mono text-indigo-600 font-bold">{doc.fileName}</span> ({doc.fileSize}) | Uploaded {doc.uploadDate} by {doc.uploadedBy}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                doc.status === 'Verified' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                doc.status === 'Rejected' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                {doc.status.toUpperCase()}
                              </span>

                              {/* HM or Clerk verified controls */}
                              {(user.role === 'headmaster' || user.role === 'clerk') && doc.status === 'Uploaded' && (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleVerifyDocument(selectedDocStudent.grNumber, doc.id, 'Verified')}
                                    className="p-1 hover:bg-emerald-50 text-emerald-600 rounded"
                                    title="Verify Document"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button type="button"
                                    onClick={() => handleVerifyDocument(selectedDocStudent.grNumber, doc.id, 'Rejected')}
                                    className="p-1 hover:bg-red-50 text-red-600 rounded"
                                    title="Reject Document"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}

                              <button type="button"
                                onClick={() => handleDeleteDocument(selectedDocStudent.grNumber, doc.id)}
                                className="p-1 hover:bg-red-50 text-red-500 hover:text-red-700 rounded"
                                title="Delete Document Permanently"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Version History fold */}
                          <div className="bg-slate-50 rounded-lg p-2.5 text-[10px] border border-slate-150 space-y-1">
                            <span className="font-bold text-slate-500 uppercase tracking-wide block">File Version History Ledger</span>
                            <div className="divide-y divide-slate-100 max-h-20 overflow-y-auto font-mono text-[9px]">
                              {doc.versionHistory.map(ver => (
                                <div key={ver.version} className="py-1 flex justify-between">
                                  <span>v{ver.version}: {ver.fileName}</span>
                                  <span className="text-slate-400">{ver.date} ({ver.uploadedBy})</span>
                                </div>
                              ))}
                            </div>
                          </div>

                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 border border-slate-150 rounded-xl text-center text-slate-400">
                      <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                      <p className="text-xs">No verification documents have been uploaded for this student yet.</p>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="p-20 text-center text-slate-400">
                <AlertCircle className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                <p>Select a student to view their compliance document vault.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================================== */}
      {/* SECTION 3: HISTORICAL REGISTRY */}
      {/* =================================================================================== */}
      {activeSubTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 text-left animate-fade-in no-print">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Certificate Approval & Issuance Ledger</h3>
              <p className="text-xs text-slate-400">Clerk drafts requiring Headmaster action are synchronized through the school cloud workflow; legacy direct-issue records remain visible for compatibility.</p>
            </div>
            
            <button
              onClick={() => {
                const logs = localStorage.getItem('nhs_erp_certificates_log');
                if (logs) setCertRegistry(JSON.parse(logs));
              }}
              className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded transition"
              title="Refresh ledger records"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider font-mono text-[10px]">
                  <th className="p-2.5 border-r border-slate-200">Certificate No</th>
                  <th className="p-2.5 border-r border-slate-200">Student GR</th>
                  <th className="p-2.5 border-r border-slate-200">Student Name</th>
                  <th className="p-2.5 border-r border-slate-200">Type</th>
                  <th className="p-2.5 border-r border-slate-200">Issue Date</th>
                  <th className="p-2.5 border-r border-slate-200">Purpose / Reason</th>
                  <th className="p-2.5 border-r border-slate-200">Status</th>
                  <th className="p-2.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {certRegistry.length > 0 ? (
                  certRegistry.map(cert => (
                    <tr key={cert.id} className="hover:bg-slate-50/50">
                      <td className="p-2.5 border-r border-slate-200 font-mono font-bold text-indigo-950">{cert.certificateNumber}</td>
                      <td className="p-2.5 border-r border-slate-200 font-mono font-bold text-slate-600">{cert.grNumber}</td>
                      <td className="p-2.5 border-r border-slate-200 font-semibold">{cert.studentName}</td>
                      <td className="p-2.5 border-r border-slate-200 uppercase font-mono text-[10px] text-indigo-700 bg-indigo-50/20 font-bold">{cert.certificateType}</td>
                      <td className="p-2.5 border-r border-slate-200 font-mono text-slate-500">{cert.issueDate}</td>
                      <td className="p-2.5 border-r border-slate-200 text-slate-600 text-[11px] truncate max-w-[150px]">{cert.purpose}</td>
                      <td className="p-2.5 border-r border-slate-200">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          cert.status === 'Cancelled' ? 'bg-red-50 text-red-700 border border-red-200' :
                          cert.status === 'Pending Approval' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                          cert.isDuplicate ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {cert.status === 'Cancelled' ? 'CANCELLED' : cert.status === 'Pending Approval' ? 'PENDING HEADMASTER APPROVAL' : (cert.isDuplicate ? `DUPLICATE (${cert.duplicateCount || 1}x)` : 'ORIGINAL')}
                        </span>
                      </td>
                      <td className="p-2.5 text-center flex items-center justify-center gap-1.5">
                        
                        {/* Reprint / Reissue Duplicates controls */}
                        <button
                          onClick={() => {
                            // Load selected student and cert configuration for printing
                            const targetStu = admissions.find(a => a.grNumber === cert.grNumber);
                            if (targetStu) {
                              setSelectedStudent(targetStu);
                              setActivePrintCertificateNumber(cert.status === 'Issued' ? cert.certificateNumber : '');
                              setCertType(cert.certificateType);
                              setCertLanguage(cert.language);
                              if (cert.lcFields) setLcFields(cert.lcFields);
                              setIsOfficialMode(cert.officialMode);
                              if (cert.styleSettings) {
                                setBorderStyle(cert.styleSettings.borderStyle);
                                setThemeColor(cert.styleSettings.themeColor);
                                setShowWatermark(cert.styleSettings.showWatermark);
                                setWatermarkText(cert.styleSettings.watermarkText);
                                setSignaturePosition(cert.styleSettings.signaturePosition);
                                setShowLogo(cert.styleSettings.showLogo);
                                if (cert.styleSettings.templateId) setSelectedTemplateId(cert.styleSettings.templateId);
                                if (cert.styleSettings.documentLanguageProfile) setDocumentLanguageProfile(normalizeDocumentLanguageProfile(cert.styleSettings.documentLanguageProfile, 'certificate-document', [...CERTIFICATE_DOCUMENT_LANGUAGE_SECTIONS], cert.language || 'en'));
                              }
                              setActiveSubTab('generate');
                              writeAuditLog('CERTIFICATE_REPRINT_REQUEST', 'Certificates Panel', `Reprinted/loaded ${cert.certificateNumber} from history`);
                            } else {
                              alert('Original student record no longer exists in admissions registry.');
                            }
                          }}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-900 text-white font-bold text-[10px] rounded"
                        >
                          Print View
                        </button>

                        {cert.status === 'Issued' && (
                          <>
                            <button type="button" onClick={() => void shareCertificate(cert, 'copy')} className="p-1.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100" title="Copy verification link"><Link2 className="w-3.5 h-3.5" /></button>
                            <button type="button" onClick={() => void shareCertificate(cert, 'email')} className="p-1.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200" title="Email verification link"><Mail className="w-3.5 h-3.5" /></button>
                            <button type="button" onClick={() => void shareCertificate(cert, 'whatsapp')} className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[9px] font-bold" title="Share on WhatsApp">WhatsApp</button>
                            <button type="button" onClick={() => void shareCertificate(cert, 'share')} className="p-1.5 rounded bg-violet-50 text-violet-700 hover:bg-violet-100" title="Share certificate verification"><Share2 className="w-3.5 h-3.5" /></button>
                          </>
                        )}

                        {cert.status === 'Pending Approval' && user.role === 'headmaster' && (
                          <>
                            <button type="button" onClick={() => void approvePreparedCertificate(cert.id)} className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold rounded-lg hover:bg-emerald-100">Approve & Issue</button>
                            <button type="button" onClick={() => void rejectPreparedCertificate(cert.id)} className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold rounded-lg hover:bg-rose-100">Reject</button>
                          </>
                        )}

                        {/* Duplicate issuance stamp (Headmaster only) */}
                        {cert.status !== 'Cancelled' && cert.status !== 'Pending Approval' && user.role === 'headmaster' && (
                          <button
                            onClick={() => handleUpdateCertStatus(cert.id, 'Duplicate')}
                            className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] rounded"
                            title="Issue official Duplicate Copy stamp"
                          >
                            Reissue Duplicate
                          </button>
                        )}

                        {/* Revoke / Expiry are Headmaster-only official status actions. */}
                        {cert.status === 'Issued' && user.role === 'headmaster' && (
                          <>
                            <button type="button" onClick={() => void handleSetCertificateExpiry(cert.id)} className="px-2 py-1 bg-violet-600 hover:bg-violet-700 text-white font-bold text-[10px] rounded" title="Set or remove certificate expiry">Expiry</button>
                            <button type="button" onClick={() => void handleRevokeCertificate(cert.id)} className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] rounded" title="Revoke official certificate">Revoke</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      No certificate records have been issued yet. Use Creator tab to generate one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =================================================================================== */}
      {/* SECTION 4: AUDIT TRAIL LOG */}
      {/* =================================================================================== */}
      {activeSubTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 text-left animate-fade-in no-print">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-slate-500" />
                <span>Secured Academic Audit Trail Logging Desk</span>
              </h3>
              <p className="text-xs text-slate-400">Verifiably logs compliance modifications, certificate prints, and administrative overrides.</p>
            </div>
            
            <button
              onClick={() => {
                const logs = localStorage.getItem('nhs_erp_audit_logs');
                if (logs) setAuditLogs(JSON.parse(logs));
              }}
              className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded transition"
              title="Refresh audits"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-[500px] overflow-y-auto border border-slate-150 rounded-xl divide-y divide-slate-100">
            {auditLogs.length > 0 ? (
              auditLogs.map(log => (
                <div key={log.id} className="p-3 hover:bg-slate-50 flex justify-between items-start text-xs">
                  <div className="space-y-1">
                    <p className="font-bold text-slate-800">{log.description}</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Timestamp: {log.timestamp} | Action Code: <span className="text-indigo-600 font-bold">{log.action}</span> | Module: {log.module}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono uppercase">
                    By: {log.userName} ({(log.role || log.userRole || 'user').toUpperCase()})
                  </span>
                </div>
              ))
            ) : (
              <p className="text-center text-slate-400 py-10 text-xs">No audit logs have been recorded in this session.</p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
