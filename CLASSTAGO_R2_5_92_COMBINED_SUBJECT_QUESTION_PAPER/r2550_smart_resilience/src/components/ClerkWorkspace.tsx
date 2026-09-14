/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  Users, BookOpen, Edit, FileText, Calendar, Plus, Trash2, Landmark, 
  CheckCircle, Clock, CircleDollarSign, Search, Filter, 
  Printer, Download, Eye, FileUp, Award, Shield, User, HelpCircle, ArrowRight
} from 'lucide-react';
import { Language, User as UserType, ClassStructure, FeeRecord } from '../types';
import UrduWrapper from './UrduWrapper';
import { LocalERPDatabase, supabase } from '../lib/supabase';
import PrintPDFButton, { PrintLetterhead, PrintSignatureArea } from './PrintPDFButton';
import SmartAttendanceManager from './SmartAttendanceManager';
import SmartLeaveManager from './SmartLeaveManager';
import CertificateDocumentSystem from './CertificateDocumentSystem';
import SmartFeeManager from './SmartFeeManager';
import SmartAccountingManager from './SmartAccountingManager';
import { openSmartPrint } from '../lib/smartPrint';
import { BULK_ADMISSION_TEMPLATE_BASE64 } from '../data/bulkAdmissionTemplateBase64';
import { requestActionConfirm } from '../lib/actionConfirm';

type ClerkDashboardSnapshot = {
  generatedAt: string;
  sources: Record<string, boolean>;
  kpis: {
    admittedStudents: number | null;
    activeStudentLogins: number | null;
    documentCompliance: number | null;
    feeClearanceRatio: number | null;
    admissionQueue: number | null;
    readyForHeadmaster: number | null;
    pendingStaffAccounts: number | null;
  };
  byClass: Array<{ label: string; count: number }>;
};

interface ClerkWorkspaceProps {
  lang: Language;
  user: UserType;
  classes: ClassStructure[];
  onRefreshData?: () => void;
  initialTab?: 'dashboard' | 'admissions' | 'student_records' | 'certificates' | 'documents' | 'reports' | 'fees' | 'accounting' | 'registers' | 'attendance' | 'leaves' | 'profile';
  hideAdmissionNavigation?: boolean;
  focusedMode?: boolean;
  focusedTitle?: string;
  activeFeatureId?: string | null;
  onOpenAdmissionDesk?: () => void;
  onBackToOverview?: () => void;
}

// Interface for Clerk Admission Records (Admitted Students Pool)
interface AdmittedStudent {
  admissionNumber?: string;
  penNumber?: string;
  grNumber: string;
  name: string;
  fatherName: string;
  motherName?: string;
  gender: string;
  dob: string;
  dobInWords?: string;
  admissionDate: string;
  religion?: string;
  category?: string;
  caste?: string;
  nationality?: string;
  motherTongue?: string;
  bloodGroup?: string;
  medium?: string;
  photo?: string;
  address?: string;
  birthPlace?: string;
  lastSchool?: string;
  
  // parent
  fatherOccupation?: string;
  fatherOccupationCustom?: string;
  motherOccupation?: string;
  motherOccupationCustom?: string;
  annualIncome?: string;
  parentMobile: string;
  alternateMobile?: string;
  email?: string;
  emergencyContact?: string;
  
  // address
  presentAddress?: string;
  permanentAddress?: string;
  sameAsPresent?: boolean;
  village?: string;
  taluka?: string;
  district?: string;
  state?: string;
  pinCode?: string;
  
  // previous school
  prevSchoolName?: string;
  prevBoard?: string;
  prevClass?: string;
  tcNumber?: string;
  prevSchoolUdise?: string;
  
  // medical
  medicalCondition?: string;
  disability?: string;
  allergy?: string;
  medicalRemarks?: string;
  height?: string;
  weight?: string;
  
  // office
  academicYear: string;
  admissionClassId: string;
  division: string;
  rollNo?: number;
  admissionType?: string;
  house?: string;
  remarks?: string;
  
  documents: Record<string, any>;
}

export default function ClerkWorkspace({ lang, user, classes, onRefreshData, initialTab = 'dashboard', hideAdmissionNavigation = false, focusedMode = false, focusedTitle, activeFeatureId = null, onOpenAdmissionDesk, onBackToOverview }: ClerkWorkspaceProps) {
  const activeYear = LocalERPDatabase.getAcademicSetup().academicYears.find(y => y.isActive)?.year || '2026-27';
  const [clerkTab, setClerkTab] = useState<'dashboard' | 'admissions' | 'student_records' | 'certificates' | 'documents' | 'reports' | 'fees' | 'accounting' | 'registers' | 'attendance' | 'leaves' | 'profile'>(initialTab);
  const [setup, setSetup] = useState(() => LocalERPDatabase.getAcademicSetup());

  useEffect(() => {
    setSetup(LocalERPDatabase.getAcademicSetup());
  }, [clerkTab]);

  useEffect(() => {
    setClerkTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (initialTab !== 'admissions' || !activeFeatureId) return;
    const stepMap: Record<string, number> = {
      'cl-open-admission-form': 1,
      'cl-student-parent-details': 2,
      'cl-address-previous-school': 3,
      'cl-medical-office-details': 4,
      'cl-documents-final-review': 4
    };
    const step = stepMap[activeFeatureId];
    if (step) setWizardStep(step);
  }, [activeFeatureId, initialTab]);


  const activeClassMasters = useMemo(() => {
    const setupClasses = (setup.classes || [])
      .filter((item: any) => item.isEnabled !== false)
      .map((item: any) => String(item.className || '').trim())
      .filter(Boolean);
    const source = setupClasses.length > 0 ? setupClasses : classes.map(item => String(item.className || '').trim());
    return Array.from(new Set(source));
  }, [setup.classes, classes]);

  const activeDivisions = useMemo(() => {
    const configured = (setup.divisions || [])
      .filter((item: any) => item.isEnabled !== false)
      .map((item: any) => String(item.divisionName || '').trim())
      .filter((name: string) => name && name.toLowerCase() !== 'no division');
    const fallback = classes.map(item => String(item.division || '').trim()).filter(Boolean);
    return ['No Division', ...Array.from(new Set((configured.length > 0 ? configured : fallback).filter(Boolean)))];
  }, [setup.divisions, classes]);

  const activeMediums = useMemo(() => {
    const configured = (setup.mediumList || [])
      .filter((item: any) => item.isActive !== false)
      .map((item: any) => String(item.name || '').replace(/\s+Medium$/i, '').trim())
      .filter(Boolean);
    const indianSchoolMediums = [
      'Assamese', 'Bengali', 'Bodo', 'Dogri', 'Gujarati', 'Hindi', 'Kannada', 'Kashmiri', 'Konkani',
      'Maithili', 'Malayalam', 'Manipuri (Meitei)', 'Marathi', 'Nepali', 'Odia', 'Punjabi', 'Sanskrit',
      'Santali', 'Sindhi', 'Tamil', 'Telugu', 'Urdu', 'English', 'Other Indian Language'
    ];
    return Array.from(new Set([...configured, ...indianSchoolMediums]));
  }, [setup.mediumList]);

  const previousClassOptions = useMemo(() => {
    const standard = [
      'No Previous Class / First Admission', 'Nursery', 'Jr KG', 'Sr KG',
      ...Array.from({ length: 12 }, (_, index) => `Class ${index + 1}`)
    ];
    return Array.from(new Set([...standard, ...activeClassMasters]));
  }, [activeClassMasters]);

  const normalizeAdmissionDocumentName = (value: unknown) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const admissionDocumentAlias = (name: string) => {
    const normalized = normalizeAdmissionDocumentName(name);
    if (/(leaving certificate|school leaving|transfer certificate|\btc\b)/.test(normalized)) return 'lc';
    if (/aadhaar|aadhar/.test(normalized)) return 'aadhaar';
    if (/passport.*photo|student.*photo|photograph|photo/.test(normalized)) return 'photo';
    return normalized;
  };

  const admissionDocumentDefinitions = useMemo(() => {
    const requiredCore = [
      { name: 'Leaving Certificate (LC)', required: true, description: 'Previous-school Leaving Certificate / Transfer Certificate.' },
      { name: 'Aadhaar Card', required: true, description: 'Student Aadhaar card copy.' },
      { name: 'Passport Size Photograph', required: true, description: 'Recent student photograph.' }
    ];
    const coreAliases = new Set(requiredCore.map(item => admissionDocumentAlias(item.name)));
    const configuredOptional = (setup.documents || [])
      .filter((item: any) => item.isActive !== false && item.appliesTo !== 'staff')
      .map((item: any) => ({
        name: String(item.documentName || '').trim(),
        required: false,
        description: String(item.description || '').trim()
      }))
      .filter((item: any) => Boolean(item.name) && !coreAliases.has(admissionDocumentAlias(item.name)));
    return [...requiredCore, ...configuredOptional];
  }, [setup.documents]);

  const resolveClassId = (className: string, division: string): string => {
    const normalizedDivision = division === 'No Division' ? '' : division;
    return classes.find(item =>
      item.className === className && String(item.division || '') === normalizedDivision
    )?.id || classes.find(item => item.className === className)?.id || '';
  };

  // 1. Clerk Local Storage Keys or Database
  const [admissions, setAdmissions] = useState<AdmittedStudent[]>([]);
  const [registeredStudents, setRegisteredStudents] = useState<UserType[]>([]);
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [cloudDashboard, setCloudDashboard] = useState<ClerkDashboardSnapshot | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState('');

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterDivision, setFilterDivision] = useState('');
  const [filterYear, setFilterYear] = useState(activeYear);

  // Helper notice notification counts
  const pendingStaffCount = cloudDashboard?.kpis.pendingStaffAccounts ?? 0;

  // DOB in Words converter helper
  const convertDateToWords = (dateStr: string): string => {
    if (!dateStr) return '';
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return '';
    
    const days = [
      'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth',
      'Eleventh', 'Twelfth', 'Thirteenth', 'Fourteenth', 'Fifteenth', 'Sixteenth', 'Seventeenth',
      'Eighteenth', 'Nineteenth', 'Twentieth', 'Twenty-First', 'Twenty-Second', 'Twenty-Third',
      'Twenty-Fourth', 'Twenty-Fifth', 'Twenty-Sixth', 'Twenty-Seventh', 'Twenty-Eighth', 'Twenty-Ninth',
      'Thirtieth', 'Thirty-First'
    ];
    
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const day = dateObj.getDate();
    const month = dateObj.getMonth();
    const year = dateObj.getFullYear();
    
    const numberToWords = (num: number): string => {
      const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
                     'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
      const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
      
      if (num < 20) return ones[num];
      const tenVal = Math.floor(num / 10);
      const oneVal = num % 10;
      return `${tens[tenVal]}${oneVal ? ' ' + ones[oneVal] : ''}`;
    };

    const yearToWords = (yr: number): string => {
      if (yr < 2000) {
        const firstPart = Math.floor(yr / 100);
        const secondPart = yr % 100;
        return `${numberToWords(firstPart)} Hundred and ${numberToWords(secondPart)}`;
      } else {
        const secondPart = yr % 2000;
        if (secondPart === 0) return 'Two Thousand';
        return `Two Thousand and ${numberToWords(secondPart)}`;
      }
    };

    try {
      const dayWord = days[day - 1] || `${day}`;
      const monthWord = months[month] || '';
      const yearWord = yearToWords(year);
      return `${dayWord} ${monthWord} ${yearWord}`.toUpperCase();
    } catch (e) {
      return dateStr;
    }
  };

  // Fallback generators only. Production proposals are loaded from the cloud
  // numbering service so another device / Clerk session cannot silently reuse a stale number.
  const officeSequence = (value: unknown, prefix: 'GR' | 'ADM') => {
    const year = String(new Date().getFullYear());
    let raw = String(value ?? '').trim().toUpperCase().replace(new RegExp(`^${prefix}`, 'i'), '');
    let digits = raw.replace(/\D/g, '');
    while (digits.startsWith(year) && digits.length > year.length) digits = digits.slice(year.length);
    const parsed = Number.parseInt(digits, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  };
  const getNextGrNumber = (currentList: AdmittedStudent[]) => {
    const year = String(new Date().getFullYear());
    const maxNum = Math.max(100, ...currentList.map(a => officeSequence(a.grNumber, 'GR')));
    return `GR${year}${maxNum + 1}`;
  };

  const getNextAdmNumber = (currentList: AdmittedStudent[]) => {
    const year = String(new Date().getFullYear());
    const maxNum = Math.max(500, ...currentList.map(a => officeSequence(a.admissionNumber, 'ADM')));
    return `ADM${year}${maxNum + 1}`;
  };

  const fetchCloudAdmissionIdentifiers = async (): Promise<{ grNumber: string; admissionNumber: string } | null> => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (session.error || !token) return null;
      const response = await fetch('/api/clerk/admissions/next-identifiers', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.grNumber || !payload?.admissionNumber) return null;
      return { grNumber: String(payload.grNumber), admissionNumber: String(payload.admissionNumber) };
    } catch { return null; }
  };

  // 4-step Admission Wizard States
  const [wizardStep, setWizardStep] = useState(1);
  const [grMode, setGrMode] = useState<'Auto' | 'Manual'>('Auto');
  const [wizardData, setWizardData] = useState(() => {
    const saved = localStorage.getItem('nhs_erp_admission_draft');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback to defaults
      }
    }
    return {
      admissionNumber: '',
      grNumber: '',
      penNumber: '',
      name: '',
      gender: '',
      dob: '',
      dobInWords: '',
      admissionDate: new Date().toISOString().substring(0, 10),
      religion: '',
      category: '',
      caste: '',
      nationality: '',
      motherTongue: '',
      bloodGroup: '',
      medium: '',
      photo: '',
      
      fatherName: '',
      motherName: '',
      fatherOccupation: '',
      fatherOccupationCustom: '',
      motherOccupation: '',
      motherOccupationCustom: '',
      annualIncome: '',
      parentMobile: '',
      alternateMobile: '',
      parentEmail: '',
      emergencyContact: '',
      
      presentAddress: '',
      permanentAddress: '',
      sameAsPresent: true,
      village: '',
      taluka: '',
      district: '',
      state: '',
      pinCode: '',
      
      prevSchoolName: '',
      prevBoard: '',
      prevClass: '',
      tcNumber: '',
      prevSchoolUdise: '',
      
      medicalCondition: '',
      disability: '',
      allergy: '',
      medicalRemarks: '',
      height: '',
      weight: '',
      
      academicYear: activeYear,
      admissionClassId: classes[0]?.id || '',
      division: classes[0]?.division || '',
      rollNo: '',
      admissionType: 'Regular',
      house: '',
      remarks: '',
      
      documents: Object.fromEntries(admissionDocumentDefinitions.map((document: any) => [document.name, {
        name: document.name,
        required: document.required,
        uploaded: false,
        fileName: '',
        date: ''
      }]))
    };
  });

  const [admissionDocumentFiles, setAdmissionDocumentFiles] = useState<Record<string, { fileName: string; mimeType: string; size: number; dataUrl: string }>>({});
  const [admissionSubmitting, setAdmissionSubmitting] = useState(false);
  const [admissionActionMessage, setAdmissionActionMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [bulkAdmissionUploading, setBulkAdmissionUploading] = useState(false);
  const [bulkAdmissionMessage, setBulkAdmissionMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [bulkAdmissionErrors, setBulkAdmissionErrors] = useState<string[]>([]);

  // Normalize legacy/null no-division class records into the explicit UI value used by the
  // required Division selector. This keeps the visible form state and submit validation aligned.
  useEffect(() => {
    if (!wizardData.admissionClassId || String(wizardData.division || '').trim()) return;
    const selectedClass = classes.find(item => item.id === wizardData.admissionClassId);
    if (selectedClass && !String(selectedClass.division || '').trim()) {
      setWizardData((prev: any) => ({ ...prev, division: 'No Division' }));
    }
  }, [classes, wizardData.admissionClassId, wizardData.division]);

  const normalizeBulkAdmissionDate = (value: any): string => {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value === 'number') {
      const parsed = XLSX.SSF.parse_date_code(value);
      if (!parsed) return '';
      return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
    }
    const text = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const slash = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    if (slash) return `${slash[3]}-${slash[2].padStart(2, '0')}-${slash[1].padStart(2, '0')}`;
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
  };

  const downloadBulkAdmissionTemplate = () => {
    try {
      const binary = window.atob(BULK_ADMISSION_TEMPLATE_BASE64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'EDUNIXO_Bulk_Admission_Template_R4_9_6.xlsx';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setBulkAdmissionMessage({ type: 'success', text: 'R4.9.6 Excel template downloaded — 22 dropdown fields + 2 validated date fields, active from Row 5.' });
    } catch (error: any) {
      console.error('Bulk admission template download failed', error);
      setBulkAdmissionMessage({ type: 'error', text: error?.message || 'Excel template could not be downloaded.' });
    }
  };

  const handleBulkAdmissionWorkbook = async (file: File | null) => {
    if (!file) return;
    setBulkAdmissionErrors([]);
    setBulkAdmissionMessage({ type: 'info', text: 'Reading and validating the Excel admission forms…' });
    setBulkAdmissionUploading(true);
    try {
      if (!/\.(xlsx|xls)$/i.test(file.name)) throw new Error('Choose the EDUNIXO .xlsx admission template.');
      if (file.size > 8 * 1024 * 1024) throw new Error('Bulk admission workbook must be 8 MB or smaller.');
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
      const sheetName = workbook.SheetNames[0];
      const sheet = sheetName ? workbook.Sheets[sheetName] : null;
      if (!sheet) throw new Error('The workbook does not contain an admission entry sheet.');
      const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { range: 3, defval: '', raw: true });
      const rows = rawRows.filter(row => String(row['Student Name *'] || '').trim() && String(row['Student Name *'] || '').trim().toLowerCase() !== 'sample student');
      if (!rows.length) throw new Error('No student rows were found. Fill the workbook below the blue header row and upload it again.');
      if (rows.length > 500) throw new Error('A maximum of 500 students can be uploaded in one workbook.');

      const yearOptions = (setup.academicYears || []).filter((item: any) => item.isActive !== false).map((item: any) => String(item.year || '').trim()).filter(Boolean);
      const validYears = new Set(yearOptions.length ? yearOptions : [activeYear]);
      const validClasses = new Set(activeClassMasters.map(value => value.toLowerCase()));
      const validDivisions = new Set(activeDivisions.map(value => value.toLowerCase()));
      const validMediums = new Set(activeMediums.map(value => value.toLowerCase()));
      const validationErrors: string[] = [];
      const payloadRows = rows.map((row, index) => {
        const excelRow = index + 5;
        const value = (header: string) => String(row[header] ?? '').trim();
        const studentName = value('Student Name *');
        const dateOfBirth = normalizeBulkAdmissionDate(row['Date of Birth *']);
        const gender = value('Gender *');
        const fatherName = value('Father Name *');
        const parentMobile = value('Parent Mobile *').replace(/\.0$/, '');
        const academicYear = value('Academic Year *');
        const className = value('Class *');
        const division = value('Division *') || 'No Division';
        const medium = value('Medium *');
        const admissionDate = normalizeBulkAdmissionDate(row['Admission Date *']);
        const classId = resolveClassId(className, division);
        const missing = [
          ['Student Name', studentName], ['Date of Birth', dateOfBirth], ['Gender', gender], ['Father Name', fatherName],
          ['Parent Mobile', parentMobile], ['Academic Year', academicYear], ['Class', className], ['Division', division], ['Medium', medium], ['Admission Date', admissionDate]
        ].filter(([, fieldValue]) => !fieldValue).map(([label]) => label);
        if (missing.length) validationErrors.push(`Row ${excelRow}: missing ${missing.join(', ')}.`);
        if (academicYear && !validYears.has(academicYear)) validationErrors.push(`Row ${excelRow}: Academic Year "${academicYear}" is not active in Academic Setup.`);
        if (className && !validClasses.has(className.toLowerCase())) validationErrors.push(`Row ${excelRow}: Class "${className}" was not found in Academic Setup.`);
        if (division && !validDivisions.has(division.toLowerCase())) validationErrors.push(`Row ${excelRow}: Division "${division}" was not found. Use "No Division" when applicable.`);
        if (medium && !validMediums.has(medium.toLowerCase())) validationErrors.push(`Row ${excelRow}: Medium "${medium}" is not available in the admission form.`);
        if (className && !classId) validationErrors.push(`Row ${excelRow}: Class/Division combination could not be resolved.`);
        if (parentMobile && !/^\+?[0-9 ()-]{7,20}$/.test(parentMobile)) validationErrors.push(`Row ${excelRow}: Parent Mobile is invalid.`);

        return {
          excelRow,
          student: {
            fullName: studentName, dateOfBirth, gender, religion: value('Religion'), category: value('Category'), caste: value('Caste'),
            nationality: value('Nationality'), birthPlace: value('Birth Place'), motherTongue: value('Mother Tongue'), aadhaarNumber: value('Aadhaar Number'), bloodGroup: value('Blood Group')
          },
          guardian: {
            fullName: fatherName || value('Mother Name'), fatherName, motherName: value('Mother Name'), mobile: parentMobile,
            alternateMobile: value('Alternate Mobile'), email: value('Email'), emergencyContact: value('Emergency Contact'),
            fatherOccupation: value('Father Occupation'), motherOccupation: value('Mother Occupation'), annualIncome: value('Annual Income')
          },
          address: {
            line1: value('Present Address'), permanentAddress: /^yes$/i.test(value('Same As Present')) ? value('Present Address') : value('Permanent Address'),
            city: value('Village / City'), taluka: value('Taluka'), district: value('District'), state: value('State'), pinCode: value('PIN Code')
          },
          academic: {
            academicYear, classId, classApplying: `${className}${division && division !== 'No Division' ? ` / ${division}` : ''}`,
            division: division === 'No Division' ? '' : division, medium, previousSchool: value('Previous School'), previousBoard: value('Previous Board'),
            previousClass: value('Previous Class'), transferCertificateNumber: value('LC / TC Number'), previousSchoolUdise: value('Previous School UDISE')
          },
          medical: {
            medicalCondition: value('Medical Condition'), disability: value('Disability'), allergy: value('Allergy'), remarks: value('Medical Remarks'),
            height: value('Height (cm)'), weight: value('Weight (kg)')
          },
          office: {
            academicYear, admissionDate, proposedGrNumber: value('Proposed GR Number').toUpperCase(), proposedAdmissionNumber: value('Admission Number').toUpperCase(),
            penNumber: value('PEN ID'), proposedRollNumber: value('Roll No'), admissionType: value('Admission Type') || 'Regular', house: value('House'), remarks: value('Remarks')
          }
        };
      });
      if (validationErrors.length) {
        setBulkAdmissionErrors(validationErrors.slice(0, 50));
        throw new Error(`${validationErrors.length} validation issue${validationErrors.length === 1 ? '' : 's'} found. No admission form was submitted.`);
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) throw sessionError || new Error('Secure session unavailable. Please sign in again.');
      const response = await fetch('/api/school-website/clerk-admission-bulk-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ rows: payloadRows })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (Array.isArray(payload.errors)) setBulkAdmissionErrors(payload.errors.map((item: any) => String(item)));
        throw new Error(payload.error || 'Bulk admission upload could not be completed.');
      }
      setBulkAdmissionMessage({ type: 'success', text: `${payload.createdCount || payloadRows.length} admission forms submitted successfully. They are now in Admission Applications; LC, Aadhaar and Photo remain compulsory before Headmaster confirmation.` });
      setBulkAdmissionErrors([]);
      await loadClerkDashboard();
      onRefreshData?.();
    } catch (error: any) {
      setBulkAdmissionMessage({ type: 'error', text: error?.message || 'Bulk admission upload failed. No partial Student Master/account/fee record was created.' });
    } finally {
      setBulkAdmissionUploading(false);
    }
  };

  const readAdmissionDocument = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Document could not be read.'));
    reader.onerror = () => reject(new Error('Document could not be read.'));
    reader.readAsDataURL(file);
  });

  const handleAdmissionDocumentFile = async (document: any, file: File | null) => {
    if (!file) return;
    const allowedMime = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
    const isPhoto = admissionDocumentAlias(document.name) === 'photo';
    if (!allowedMime.has(file.type) || (isPhoto && !file.type.startsWith('image/'))) {
      alert(isPhoto ? 'Student photo must be JPG, PNG or WEBP.' : 'Admission documents must be JPG, PNG, WEBP or PDF.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      alert('Each admission document must be 3 MB or smaller. Please compress the file and try again.');
      return;
    }
    const currentTotal = Object.entries(admissionDocumentFiles)
      .filter(([name]) => name !== document.name)
      .reduce((sum, [, item]) => sum + Number(item.size || 0), 0);
    if (currentTotal + file.size > 8 * 1024 * 1024) {
      alert('Total admission document size must stay within 8 MB for a secure one-step Headmaster handoff.');
      return;
    }
    try {
      const dataUrl = await readAdmissionDocument(file);
      setAdmissionDocumentFiles(previous => ({
        ...previous,
        [document.name]: { fileName: file.name, mimeType: file.type, size: file.size, dataUrl }
      }));
      setWizardData((previous: any) => ({
        ...previous,
        documents: {
          ...(previous.documents || {}),
          [document.name]: {
            ...(previous.documents?.[document.name] || {}),
            name: document.name,
            required: document.required,
            uploaded: true,
            fileName: file.name,
            date: new Date().toISOString().slice(0, 10)
          }
        }
      }));
    } catch (error: any) {
      alert(error?.message || 'Document could not be prepared for upload.');
    }
  };

  const removeAdmissionDocumentFile = (document: any) => {
    setAdmissionDocumentFiles(previous => {
      const next = { ...previous };
      delete next[document.name];
      return next;
    });
    setWizardData((previous: any) => ({
      ...previous,
      documents: {
        ...(previous.documents || {}),
        [document.name]: {
          ...(previous.documents?.[document.name] || {}),
          name: document.name,
          required: document.required,
          uploaded: false,
          fileName: '',
          date: ''
        }
      }
    }));
  };

  useEffect(() => {
    setWizardData((previous: any) => {
      const currentDocuments = previous?.documents && typeof previous.documents === 'object' ? previous.documents : {};
      const existingValues = Object.values(currentDocuments) as any[];
      const normalizedDocuments = Object.fromEntries(admissionDocumentDefinitions.map((document: any) => {
        const existing = currentDocuments[document.name] || existingValues.find((item: any) =>
          String(item?.name || '').trim().toLowerCase() === document.name.toLowerCase()
        );
        return [document.name, {
          name: document.name,
          required: document.required,
          uploaded: false,
          fileName: String(existing?.fileName || ''),
          date: /^\d{4}-\d{2}-\d{2}$/.test(String(existing?.date || '')) ? String(existing.date) : ''
        }];
      }));
      if (JSON.stringify(currentDocuments) === JSON.stringify(normalizedDocuments)) return previous;
      return { ...previous, documents: normalizedDocuments };
    });
  }, [admissionDocumentDefinitions]);

  const admissionDocumentProgress = useMemo(() => {
    const values = admissionDocumentDefinitions.map((document: any) => ({
      ...document,
      uploaded: Boolean(admissionDocumentFiles[document.name])
    }));
    const required = values.filter((item: any) => item.required);
    const missingRequired = required.filter((item: any) => !item.uploaded);
    return {
      total: values.length,
      received: values.filter((item: any) => item.uploaded).length,
      requiredTotal: required.length,
      requiredReceived: required.length - missingRequired.length,
      missingRequired
    };
  }, [admissionDocumentDefinitions, admissionDocumentFiles]);

  // Auto-save draft on every modification
  useEffect(() => {
    localStorage.setItem('nhs_erp_admission_draft', JSON.stringify(wizardData));
  }, [wizardData]);

  // Certificate generation states
  const [selectedCertStudent, setSelectedCertStudent] = useState<AdmittedStudent | null>(null);
  const [certType, setCertType] = useState<'bonafide' | 'leaving' | 'study' | 'character' | 'custom'>('bonafide');
  const [customCertTitle, setCustomCertTitle] = useState('SPECIAL MERIT CERTIFICATE');
  const [customCertBody, setCustomCertBody] = useState('This is to certify that the student has shown exceptional performance in state-level activities.');

  // Document Management States
  const [selectedDocStudent, setSelectedDocStudent] = useState<AdmittedStudent | null>(null);
  const [uploadDocType, setUploadDocType] = useState('Birth Certificate');

  // Fee receipt printing states
  const [selectedReceiptFee, setSelectedReceiptFee] = useState<FeeRecord | null>(null);

  useEffect(() => {
    if (!selectedReceiptFee) return;
    const timer = window.setTimeout(() => {
      openSmartPrint({ elementId: 'clerk-fee-receipt-print', title: `Fee Receipt - ${selectedReceiptFee.studentName}`, paperSize: 'A5', orientation: 'portrait' });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [selectedReceiptFee]);

  const loadClerkDashboard = async () => {
    setDashboardLoading(true);
    setDashboardError('');
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) throw sessionError || new Error('Secure session unavailable. Please sign in again.');
      const response = await fetch('/api/clerk/dashboard', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Clerk dashboard could not be loaded from the cloud.');
      setCloudDashboard(payload as ClerkDashboardSnapshot);
    } catch (error: any) {
      setDashboardError(error?.message || 'Clerk dashboard could not be loaded from the cloud.');
      setCloudDashboard(null);
    } finally {
      setDashboardLoading(false);
    }
  };

  // Load legacy office records only for unfinished downstream screens.
  // New admissions are never written here; canonical intake is Supabase Cloud.
  useEffect(() => {
    const savedAdm = localStorage.getItem('nhs_erp_clerk_admissions');
    let loadedAdmissions: AdmittedStudent[] = [];
    if (savedAdm) {
      try {
        const parsed = JSON.parse(savedAdm);
        loadedAdmissions = Array.isArray(parsed) ? parsed : [];
      } catch {
        loadedAdmissions = [];
      }
    }
    setAdmissions(loadedAdmissions);

    // Cloud is authoritative for new proposals. Preserve an unfinished saved draft;
    // otherwise use the canonical next values, with legacy cache only as fallback.
    void fetchCloudAdmissionIdentifiers().then((cloudIds) => {
      setWizardData((prev: any) => ({
        ...prev,
        admissionNumber: prev.admissionNumber || cloudIds?.admissionNumber || getNextAdmNumber(loadedAdmissions),
        grNumber: prev.grNumber || cloudIds?.grNumber || getNextGrNumber(loadedAdmissions)
      }));
    });

    // Compatibility only for modules not yet migrated to cloud.
    setRegisteredStudents(LocalERPDatabase.getUsers().filter(u => u.role === 'student'));
    setFees(LocalERPDatabase.getFees());
    void loadClerkDashboard();
  }, []);

  // Sync admissions
  const saveAdmissionsToDb = (updatedList: AdmittedStudent[]) => {
    localStorage.setItem('nhs_erp_clerk_admissions', JSON.stringify(updatedList));
    setAdmissions(updatedList);
  };

  // Prepare a verified admission intake for Headmaster confirmation.
  // This workflow deliberately does not create a login, password, Student Master row or fee ledger.
  const handleExecuteAdmission = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setAdmissionActionMessage(null);

    const selectedClassRecord = classes.find(item => item.id === wizardData.admissionClassId);
    const selectedDivisionValue = String(wizardData.division || '').trim();
    const selectedClassHasNoDivision = Boolean(selectedClassRecord) && !String(selectedClassRecord?.division || '').trim();
    // In EDUNIXO, a class that has no division is a valid academic scope. The UI label is
    // "No Division", while older class records may store the same scope as an empty/null value.
    // Do not infer a named division (A/B/etc.) when the user has not selected one.
    const effectiveDivision = selectedDivisionValue || (selectedClassHasNoDivision ? 'No Division' : '');
    const effectiveMedium = String(wizardData.medium || '').trim();
    const gr = String(wizardData.grNumber || getNextGrNumber(admissions)).trim().toUpperCase();
    const admNum = String(wizardData.admissionNumber || getNextAdmNumber(admissions)).trim().toUpperCase();

    const mandatoryFields: Array<[string, unknown]> = [
      ['G.R. Number', gr],
      ['Admission Number', admNum],
      ['Student Name', String(wizardData.name || '').trim()],
      ['Father Name', String(wizardData.fatherName || '').trim()],
      ['Date of Birth', wizardData.dob],
      ['Target Class', selectedClassRecord?.id],
      ['Parent Mobile', String(wizardData.parentMobile || '').trim()],
      ['Division', effectiveDivision],
      ['Medium', effectiveMedium]
    ];
    const missingMandatory = mandatoryFields.filter(([, value]) => !value).map(([label]) => label);
    if (missingMandatory.length > 0) {
      setAdmissionActionMessage({
        type: 'error',
        text: `Please complete the following mandatory field${missingMandatory.length === 1 ? '' : 's'}: ${missingMandatory.join(', ')}.`
      });
      return;
    }
    if (admissionDocumentProgress.missingRequired.length > 0) {
      setAdmissionActionMessage({ type: 'error', text: `Required documents are still pending: ${admissionDocumentProgress.missingRequired.map((item: any) => item.name).join(', ')}. Upload them before sending the intake to the Headmaster.` });
      return;
    }

    // Legacy-cache duplicate checks are an early warning only. The server performs the authoritative cloud checks.
    if (admissions.some(a => (a.grNumber || '').trim().toLowerCase() === gr.toLowerCase())) {
      setAdmissionActionMessage({ type: 'error', text: `Duplicate proposed G.R. Number "${gr}" detected in the office cache. Please verify the record before proceeding.` });
      return;
    }
    if (admissions.some(a => (a.admissionNumber || '').trim().toLowerCase() === admNum.toLowerCase())) {
      setAdmissionActionMessage({ type: 'error', text: `Duplicate proposed Admission Number "${admNum}" detected in the office cache. Please verify the record before proceeding.` });
      return;
    }

    const newAdm: AdmittedStudent = {
      admissionNumber: admNum,
      grNumber: gr,
      penNumber: wizardData.penNumber,
      name: wizardData.name,
      fatherName: wizardData.fatherName,
      motherName: wizardData.motherName,
      gender: wizardData.gender,
      dob: wizardData.dob,
      dobInWords: wizardData.dobInWords || convertDateToWords(wizardData.dob),
      birthPlace: wizardData.village,
      lastSchool: wizardData.prevSchoolName,
      admissionClassId: wizardData.admissionClassId,
      division: effectiveDivision,
      parentMobile: wizardData.parentMobile,
      email: wizardData.parentEmail,
      photo: wizardData.photo || '',
      address: wizardData.presentAddress || wizardData.village || '',
      admissionDate: wizardData.admissionDate,
      academicYear: wizardData.academicYear || activeYear,
      religion: wizardData.religion,
      category: wizardData.category,
      caste: wizardData.caste,
      nationality: wizardData.nationality,
      motherTongue: wizardData.motherTongue,
      bloodGroup: wizardData.bloodGroup,
      medium: effectiveMedium,
      fatherOccupation: wizardData.fatherOccupation === 'Other' ? wizardData.fatherOccupationCustom : wizardData.fatherOccupation,
      motherOccupation: wizardData.motherOccupation === 'Other' ? wizardData.motherOccupationCustom : wizardData.motherOccupation,
      annualIncome: wizardData.annualIncome,
      alternateMobile: wizardData.alternateMobile,
      emergencyContact: wizardData.emergencyContact,
      presentAddress: wizardData.presentAddress,
      permanentAddress: wizardData.sameAsPresent ? wizardData.presentAddress : wizardData.permanentAddress,
      sameAsPresent: wizardData.sameAsPresent,
      village: wizardData.village,
      taluka: wizardData.taluka,
      district: wizardData.district,
      state: wizardData.state,
      pinCode: wizardData.pinCode,
      prevSchoolName: wizardData.prevSchoolName,
      prevBoard: wizardData.prevBoard,
      prevClass: wizardData.prevClass,
      tcNumber: wizardData.tcNumber,
      prevSchoolUdise: wizardData.prevSchoolUdise,
      medicalCondition: wizardData.medicalCondition,
      disability: wizardData.disability,
      allergy: wizardData.allergy,
      medicalRemarks: wizardData.medicalRemarks,
      height: wizardData.height,
      weight: wizardData.weight,
      rollNo: wizardData.rollNo ? parseInt(wizardData.rollNo, 10) : undefined,
      admissionType: wizardData.admissionType,
      house: wizardData.house,
      remarks: wizardData.remarks,
      documents: wizardData.documents
    };

    let cloudReferenceCode = admNum;
    setAdmissionSubmitting(true);
    setAdmissionActionMessage({ type: 'info', text: 'Validating documents and saving the intake securely…' });
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) throw sessionError || new Error('Secure session unavailable. Please sign in again.');
      const targetClass = classes.find(c => c.id === wizardData.admissionClassId);
      const response = await fetch('/api/school-website/clerk-admission-intake', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          student: {
            fullName: wizardData.name, gender: wizardData.gender, dateOfBirth: wizardData.dob,
            dateOfBirthInWords: wizardData.dobInWords || convertDateToWords(wizardData.dob),
            religion: wizardData.religion, category: wizardData.category, caste: wizardData.caste,
            nationality: wizardData.nationality, motherTongue: wizardData.motherTongue, bloodGroup: wizardData.bloodGroup,
            photoUrl: wizardData.photo || '', birthPlace: wizardData.village
          },
          guardian: {
            fullName: wizardData.fatherName || wizardData.motherName, fatherName: wizardData.fatherName, motherName: wizardData.motherName, mobile: wizardData.parentMobile,
            alternateMobile: wizardData.alternateMobile, email: wizardData.parentEmail, emergencyContact: wizardData.emergencyContact,
            fatherOccupation: newAdm.fatherOccupation, motherOccupation: newAdm.motherOccupation, annualIncome: wizardData.annualIncome
          },
          address: {
            line1: wizardData.presentAddress, permanentAddress: wizardData.sameAsPresent ? wizardData.presentAddress : wizardData.permanentAddress,
            city: wizardData.village, taluka: wizardData.taluka, district: wizardData.district, state: wizardData.state, pinCode: wizardData.pinCode
          },
          academic: {
            academicYear: wizardData.academicYear || activeYear, classId: wizardData.admissionClassId,
            classApplying: targetClass ? `${targetClass.className}${effectiveDivision && effectiveDivision !== 'No Division' ? ` / ${effectiveDivision}` : ''}` : wizardData.admissionClassId,
            division: effectiveDivision === 'No Division' ? '' : effectiveDivision, medium: effectiveMedium, previousSchool: wizardData.prevSchoolName,
            previousBoard: wizardData.prevBoard, previousClass: wizardData.prevClass, transferCertificateNumber: wizardData.tcNumber, previousSchoolUdise: wizardData.prevSchoolUdise
          },
          medical: {
            medicalCondition: wizardData.medicalCondition, disability: wizardData.disability, allergy: wizardData.allergy,
            remarks: wizardData.medicalRemarks, height: wizardData.height, weight: wizardData.weight
          },
          office: {
            proposedGrNumber: gr, proposedAdmissionNumber: admNum, academicYear: wizardData.academicYear || activeYear, penNumber: wizardData.penNumber, admissionDate: wizardData.admissionDate,
            proposedRollNumber: wizardData.rollNo || null, admissionType: wizardData.admissionType, house: wizardData.house, remarks: wizardData.remarks
          },
          documentChecklist: Object.fromEntries(admissionDocumentDefinitions.map((document: any) => [document.name, {
            name: document.name,
            required: document.required,
            uploaded: Boolean(admissionDocumentFiles[document.name]),
            fileName: admissionDocumentFiles[document.name]?.fileName || '',
            date: admissionDocumentFiles[document.name] ? new Date().toISOString().slice(0, 10) : ''
          }])),
          documentUploads: admissionDocumentDefinitions
            .filter((document: any) => Boolean(admissionDocumentFiles[document.name]))
            .map((document: any) => ({
              documentName: document.name,
              fileName: admissionDocumentFiles[document.name].fileName,
              mimeType: admissionDocumentFiles[document.name].mimeType,
              size: admissionDocumentFiles[document.name].size,
              dataUrl: admissionDocumentFiles[document.name].dataUrl
            }))
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Admission intake could not be saved to the cloud.');
      cloudReferenceCode = String(payload.referenceCode || admNum);
      const notifiedCount = Number(payload.headmasterNotifiedCount || 0);
      setAdmissionActionMessage({ type: 'success', text: `Admission intake ${cloudReferenceCode} saved and sent to Headmaster${notifiedCount > 0 ? ` (${notifiedCount} native notification${notifiedCount === 1 ? '' : 's'} sent)` : '. Headmaster bell will also surface this verified intake directly from the canonical approval queue'}.` });

      LocalERPDatabase.addAuditLog(
        user.id, user.name, user.role, 'PREPARE_ADMISSION_INTAKE', 'Clerk Admissions',
        `Prepared verified admission intake for ${wizardData.name}; proposed GR ${gr}. Final confirmation remains with Headmaster.`
      );
      await loadClerkDashboard();
    } catch (error: any) {
      setAdmissionSubmitting(false);
      setAdmissionActionMessage({ type: 'error', text: error?.message || 'Admission intake could not be saved. No student account or fee record was created.' });
      return;
    }
    setAdmissionSubmitting(false);

    // Clear only the draft. Canonical application now lives in Supabase Cloud.
    localStorage.removeItem('nhs_erp_admission_draft');
    const proposalHistory = [...admissions, newAdm];
    const cloudNextIds = await fetchCloudAdmissionIdentifiers();
    const nextAdm = cloudNextIds?.admissionNumber || getNextAdmNumber(proposalHistory);
    const nextGr = cloudNextIds?.grNumber || getNextGrNumber(proposalHistory);

    setWizardData({
      admissionNumber: nextAdm, grNumber: nextGr, penNumber: '', name: '', gender: '', dob: '', dobInWords: '',
      admissionDate: new Date().toISOString().substring(0, 10), religion: '', category: '', caste: '', nationality: '',
      motherTongue: '', bloodGroup: '', medium: '', photo: '', fatherName: '', motherName: '',
      fatherOccupation: '', fatherOccupationCustom: '', motherOccupation: '', motherOccupationCustom: '', annualIncome: '',
      parentMobile: '', alternateMobile: '', parentEmail: '', emergencyContact: '', presentAddress: '', permanentAddress: '', sameAsPresent: true,
      village: '', taluka: '', district: '', state: '', pinCode: '', prevSchoolName: '', prevBoard: '',
      prevClass: '', tcNumber: '', prevSchoolUdise: '', medicalCondition: '', disability: '', allergy: '', medicalRemarks: '',
      height: '', weight: '', academicYear: activeYear, admissionClassId: wizardData.admissionClassId, division: wizardData.division, rollNo: '',
      admissionType: 'Regular', house: '', remarks: '', documents: Object.fromEntries(admissionDocumentDefinitions.map((document: any) => [document.name, {
        name: document.name, required: document.required, uploaded: false, fileName: '', date: ''
      }]))
    });
    setAdmissionDocumentFiles({});
    setWizardStep(1);

    if (onRefreshData) onRefreshData();
  };

  // Record Fee payment
  const handleFeePayment = (feeId: string, amount: number) => {
    const feeList = LocalERPDatabase.getFees();
    const target = feeList.find(f => f.id === feeId);
    if (target) {
      const updatedPaid = target.paidAmount + amount;
      target.paidAmount = Math.min(updatedPaid, target.amount);
      target.status = target.paidAmount === target.amount ? 'Paid' : target.paidAmount > 0 ? 'Partial' : 'Unpaid';
      
      LocalERPDatabase.saveFeeRecord(target);
      setFees(LocalERPDatabase.getFees());

      LocalERPDatabase.addAuditLog(
        user.id,
        user.name,
        user.role,
        'COLLECT_FEE',
        'Clerk Workspace',
        `Collected fee payment of INR ${amount} for student ${target.studentName}`
      );

      setSelectedReceiptFee(target);
      alert(`Payment of INR ${amount} successfully recorded for ${target.studentName}. Receipt is ready for Print / PDF.`);
    }
  };

  const handleDocDelete = (studentGr: string, docName: string) => {
    const updated = admissions.map(student => {
      if (student.grNumber === studentGr) {
        return {
          ...student,
          documents: {
            ...student.documents,
            [docName]: {
              name: docName,
              uploaded: false
            }
          }
        };
      }
      return student;
    });

    saveAdmissionsToDb(updated);

    if (selectedDocStudent && selectedDocStudent.grNumber === studentGr) {
      const match = updated.find(u => u.grNumber === studentGr);
      if (match) setSelectedDocStudent(match);
    }

    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role,
      'REMOVE_DOCUMENT',
      'Clerk Workspace',
      `Removed document compliance for "${docName}" of GR: ${studentGr}`
    );

    alert(`Verified status for "${docName}" cleared.`);
  };

  // Filter Admitted Student list based on filters
  const filteredAdmissions = admissions.filter(adm => {
    const nameStr = adm.name || '';
    const grStr = adm.grNumber || '';
    const fatherStr = adm.fatherName || '';
    const parentMobStr = adm.parentMobile || '';
    const query = searchQuery.toLowerCase();

    const matchesSearch = 
      nameStr.toLowerCase().includes(query) ||
      grStr.toLowerCase().includes(query) ||
      fatherStr.toLowerCase().includes(query) ||
      parentMobStr.includes(searchQuery);

    const matchesClass = filterClass ? adm.admissionClassId === filterClass : true;
    const matchesDiv = filterDivision ? adm.division === filterDivision : true;
    const matchesYear = filterYear ? adm.academicYear === filterYear : true;

    return matchesSearch && matchesClass && matchesDiv && matchesYear;
  });

  return (
    <div className="space-y-6">
      
      {focusedMode ? (
        <div className="edx-focused-context overflow-hidden rounded-2xl border border-white/10 bg-slate-950 p-5 text-white shadow-xl no-print">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-300">Focused Clerk Workspace</p>
          <h2 className="mt-1 text-lg font-black">{focusedTitle || 'Office Module'}</h2>
          <p className="mt-2 text-xs text-slate-400">Only this selected module is open. The old Clerk inner-module navigation is hidden.</p>
        </div>
      ) : clerkTab === 'admissions' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-3 justify-between items-center no-print">
          <div>
            <h2 className="font-extrabold text-slate-900 text-sm">Admission Desk</h2>
            <p className="text-xs text-slate-500">Independent student intake and registration workspace</p>
          </div>
          <button
            type="button"
            onClick={() => onBackToOverview ? onBackToOverview() : setClerkTab('dashboard')}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
          >
            ← Back to Clerk Portal Overview
          </button>
        </div>
      ) : (
        <>
          {/* Clerk Workspace Menu Header Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-2 justify-between items-center no-print">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-slate-900 text-sm font-sans flex items-center gap-2">
                  <span>National Academic Clerk Workspace</span>
                  <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-mono uppercase tracking-wide">
                    Active Session: {activeYear}
                  </span>
                </h2>
                <p className="text-xs text-slate-500">{user.name} | {user.designation || 'Clerk Superintendent'}</p>
              </div>
            </div>

            {pendingStaffCount > 0 && (
              <div className="bg-amber-50 text-amber-800 border border-amber-100 rounded-lg px-3 py-1 text-xs font-bold animate-pulse flex items-center gap-2">
                <span>Pending Staff Registrations waiting Headmaster: {pendingStaffCount}</span>
              </div>
            )}
          </div>

          {/* Clerk Inner Tab Navigation Menu */}
          <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-px no-print">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Shield },
              ...(hideAdmissionNavigation ? [] : [{ id: 'admissions', label: 'Admission Desk', icon: Plus }]),
              { id: 'student_records', label: 'Student Records', icon: Users },
              { id: 'certificates', label: 'Certificates Center', icon: Award },
              { id: 'documents', label: 'Documents Vault', icon: FileText },
              { id: 'reports', label: 'Analytical Reports', icon: FileText },
              { id: 'fees', label: 'Fees Counter', icon: CircleDollarSign },
              { id: 'accounting', label: 'Accounting Desk', icon: Landmark },
              { id: 'attendance', label: 'Attendance Desk', icon: Calendar },
              { id: 'leaves', label: 'Leave Management', icon: Calendar },
              { id: 'registers', label: 'General Register', icon: BookOpen },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setClerkTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl border-t border-x transition-all cursor-pointer ${
                    clerkTab === tab.id 
                      ? 'bg-white border-slate-200 border-b-white text-indigo-600 -mb-px' 
                      : 'bg-slate-50/50 border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* ======================================================== */}
      {/* CLERK TAB 1: DASHBOARD */}
      {/* ======================================================== */}
      {clerkTab === 'dashboard' && (
        <div className="space-y-6 text-left">
          <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-950 text-white shadow-xl">
            <div className="relative p-5 sm:p-6">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,.28),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(6,182,212,.2),transparent_35%)]" />
              <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-cyan-300"><Shield className="h-4 w-4"/>Live School Operations</div>
                  <h3 className="mt-2 text-xl font-black tracking-tight sm:text-2xl">Clerk Command Snapshot</h3>
                  <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-300">Production metrics come from the school cloud. Demo admissions are never seeded into this dashboard.</p>
                </div>
                <button type="button" onClick={() => void loadClerkDashboard()} disabled={dashboardLoading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-black hover:bg-white/15 disabled:opacity-50">
                  <Clock className={`h-4 w-4 ${dashboardLoading ? 'animate-spin' : ''}`} /> {dashboardLoading ? 'Refreshing…' : 'Refresh Cloud'}
                </button>
              </div>
              {dashboardError && <div className="relative mt-4 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-xs font-semibold text-rose-100">{dashboardError}</div>}
              <div className="relative mt-5 grid grid-cols-2 gap-3 lg:grid-cols-6">
                {[
                  ['Admitted Students', cloudDashboard?.kpis.admittedStudents, 'Student Master'],
                  ['Active Logins', cloudDashboard?.kpis.activeStudentLogins, 'Approved accounts'],
                  ['Documents', cloudDashboard?.kpis.documentCompliance, 'Compliance', true],
                  ['Fee Clearance', cloudDashboard?.kpis.feeClearanceRatio, 'Ledger', true],
                  ['Admission Queue', cloudDashboard?.kpis.admissionQueue, 'Applications'],
                  ['Ready for HM', cloudDashboard?.kpis.readyForHeadmaster, 'Verified / approved']
                ].map(([label, value, hint, percent]: any) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/[.07] p-4 backdrop-blur">
                    <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</div>
                    <div className="mt-2 text-2xl font-black">{dashboardLoading && !cloudDashboard ? '…' : value == null ? '—' : `${value}${percent ? '%' : ''}`}</div>
                    <div className="mt-1 text-[9px] font-semibold text-cyan-200/80">{hint}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between gap-3"><h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider font-mono">Class-wise Student Master</h3><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black text-emerald-700">Cloud</span></div>
              <div className="divide-y divide-slate-100">
                {(cloudDashboard?.byClass || []).length ? (cloudDashboard?.byClass || []).map(item => (
                  <div key={item.label} className="py-2.5 flex justify-between items-center text-xs"><span className="font-semibold text-slate-600">{item.label}</span><span className="bg-slate-100 px-2.5 py-0.5 rounded-full font-bold text-slate-800 font-mono">{item.count} Students</span></div>
                )) : <div className="py-8 text-center text-xs font-semibold text-slate-400">{dashboardLoading ? 'Loading class distribution…' : 'No cloud class distribution available.'}</div>}
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 via-white to-cyan-50 border border-indigo-100 rounded-2xl p-6 space-y-4 shadow-sm">
              <div className="flex items-center gap-2"><Shield className="w-5 h-5 text-indigo-600"/><h4 className="font-bold text-indigo-950 text-sm">Controlled Admission Chain</h4></div>
              <p className="text-xs text-slate-600 leading-relaxed">Clerk preparation and Headmaster confirmation are deliberately separated so no account or financial record is created prematurely.</p>
              <div className="grid gap-2 text-xs">
                {[['01','Clerk Intake','Prepare student, guardian and document data; propose GR / admission number.'],['02','Headmaster Confirmation','Final review creates the canonical Student Master record.'],['03','Student Registration','Student uses the confirmed GR to create a Pending account; no default password is issued.'],['04','Authorized Approval','Account approval links the existing student identity without creating a duplicate profile.']].map(([n,title,text]) => <div key={n} className="flex gap-3 rounded-xl border border-white bg-white/80 p-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-indigo-600 text-[9px] font-black text-white">{n}</span><div><div className="font-black text-slate-800">{title}</div><div className="mt-0.5 text-[10px] leading-4 text-slate-500">{text}</div></div></div>)}
              </div>
              <button type="button" onClick={() => onOpenAdmissionDesk ? onOpenAdmissionDesk() : setClerkTab('admissions')} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white hover:bg-indigo-700">Open Admission Desk <ArrowRight className="h-3.5 w-3.5"/></button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* CLERK TAB 2: ADMISSIONS */}
      {/* ======================================================== */}
      {clerkTab === 'admissions' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">

          <div className="lg:col-span-12 overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-cyan-50 shadow-sm">
            <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-indigo-600"><FileUp className="h-4 w-4"/>Bulk Admission <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[9px] tracking-normal text-white">R4.9.6 · 24 controlled fields</span></div>
                <h3 className="mt-1 text-lg font-black text-slate-900">Excel Admission Form — Download, Fill & Upload</h3>
                <p className="mt-1 text-xs leading-5 text-slate-600">The workbook mirrors the admission form. Every valid Excel row becomes a separate cloud Admission Application. Bulk upload never creates Student Master, login/password or fees directly.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={downloadBulkAdmissionTemplate} className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-xs font-black text-indigo-700 shadow-sm hover:bg-indigo-50"><Download className="h-4 w-4"/>Download Excel Template</button>
                <label className={`inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white shadow-sm ${bulkAdmissionUploading ? 'cursor-wait opacity-60' : 'cursor-pointer hover:bg-indigo-700'}`}>
                  <FileUp className={`h-4 w-4 ${bulkAdmissionUploading ? 'animate-pulse' : ''}`}/>{bulkAdmissionUploading ? 'Validating & Submitting…' : 'Upload Completed Excel'}
                  <input type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" className="hidden" disabled={bulkAdmissionUploading} onChange={event => { const file = event.target.files?.[0] || null; void handleBulkAdmissionWorkbook(file); event.currentTarget.value = ''; }}/>
                </label>
              </div>
            </div>
            {bulkAdmissionMessage && <div className={`border-t px-5 py-3 text-xs font-bold ${bulkAdmissionMessage.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : bulkAdmissionMessage.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-blue-200 bg-blue-50 text-blue-800'}`}>{bulkAdmissionMessage.text}</div>}
            {bulkAdmissionErrors.length > 0 && <div className="border-t border-rose-200 bg-white px-5 py-4"><div className="text-[10px] font-black uppercase tracking-wider text-rose-600">Rows to correct</div><div className="mt-2 max-h-36 overflow-y-auto rounded-xl bg-rose-50 p-3 text-[11px] leading-5 text-rose-800">{bulkAdmissionErrors.map((error, index) => <div key={`${error}-${index}`}>• {error}</div>)}</div></div>}
          </div>
          
          {/* Admission Form: Steps Wizard (7 columns) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5 lg:col-span-7 shadow-sm">
            
            {/* Step Wizard Header */}
            <div className="border-b border-slate-100 pb-3 flex justify-between items-center flex-wrap gap-2">
              <div>
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 text-xs font-black">W</span>
                  National Admission Desk
                </h3>
                <p className="text-xs text-slate-400">Step {wizardStep} of 4: {
                  wizardStep === 1 ? "Student Demographics" :
                  wizardStep === 2 ? "Parents & Contacts" :
                  wizardStep === 3 ? "Address & School History" :
                  "Medical, Documents & Office Setup"
                }</p>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={async () => {
                    if (await requestActionConfirm({ title: 'Discard admission draft?', message: 'Are you sure you want to discard your draft and clear all fields?', confirmLabel: 'Discard Draft', tone: 'danger' })) {
                      localStorage.removeItem('nhs_erp_admission_draft');
                      window.location.reload();
                    }
                  }}
                  className="px-2.5 py-1 text-[11px] border border-red-200 hover:bg-red-50 text-red-600 rounded-lg transition-all"
                >
                  Clear Draft
                </button>
                <span className="inline-flex items-center px-2 py-1 text-[10px] font-medium bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 animate-pulse">
                  Draft Saved
                </span>
              </div>
            </div>

            {/* Steps Progress Tracker Bar */}
            <div className="flex items-center justify-between gap-1 border border-slate-100 p-1 rounded-xl bg-slate-50/50">
              {[1, 2, 3, 4].map(step => (
                <button
                  key={step}
                  type="button"
                  onClick={() => setWizardStep(step)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    wizardStep === step
                      ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {step === 1 ? '1. Student' : step === 2 ? '2. Parents' : step === 3 ? '3. History' : '4. Verify'}
                </button>
              ))}
            </div>

            {/* Form Steps */}
            <form onSubmit={handleExecuteAdmission} className="space-y-4">
              
              {/* STEP 1: DEMOGRAPHICS */}
              {wizardStep === 1 && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-semibold text-slate-500">G.R. Number *</label>
                        <div className="flex gap-2 text-[10px] font-semibold">
                          <button
                            type="button"
                            onClick={() => {
                              setGrMode('Auto');
                              setWizardData(prev => ({ ...prev, grNumber: getNextGrNumber(admissions) }));
                            }}
                            className={`px-1 rounded ${grMode === 'Auto' ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}
                          >
                            Auto
                          </button>
                          <button
                            type="button"
                            onClick={() => setGrMode('Manual')}
                            className={`px-1 rounded ${grMode === 'Manual' ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}
                          >
                            Manual
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        required
                        placeholder={grMode === 'Auto' ? 'Auto-suggested; editable before save' : 'Enter G.R. Number'}
                        value={wizardData.grNumber}
                        onChange={(e) => setWizardData({ ...wizardData, grNumber: e.target.value.trim().toUpperCase() })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Admission Number *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. ADM2026102"
                        value={wizardData.admissionNumber}
                        onChange={(e) => setWizardData({ ...wizardData, admissionNumber: e.target.value.trim().toUpperCase() })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg font-mono font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">PEN ID <span className="text-[10px] text-slate-400 font-normal">(Optional)</span></label>
                      <input
                        type="text"
                        placeholder="e.g. 1234567890"
                        value={wizardData.penNumber || ''}
                        onChange={(e) => setWizardData({ ...wizardData, penNumber: e.target.value.trim().toUpperCase() })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg font-mono font-semibold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Full Student Name * <span className="text-[10px] text-slate-400 font-normal">(As per Aadhaar Card/Birth Certificate)</span></label>
                    <input
                      type="text"
                      required
                      placeholder="Student full name"
                      value={wizardData.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setWizardData({ ...wizardData, name: val });
                        
                        // Check for duplicate Name + DOB combination
                        if (val && wizardData.dob) {
                          const dup = admissions.find(
                            a => a.name.trim().toLowerCase() === val.trim().toLowerCase() && a.dob === wizardData.dob
                          );
                          if (dup) {
                            alert(`🚨 Warning: A student named "${val}" with Date of Birth "${wizardData.dob}" is already registered (GR: ${dup.grNumber}). Please verify if this is a duplicate entry!`);
                          }
                        }
                      }}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Date of Birth *</label>
                      <input
                        type="date"
                        required
                        value={wizardData.dob}
                        onChange={(e) => {
                          const dateVal = e.target.value;
                          const words = convertDateToWords(dateVal);
                          setWizardData({ 
                            ...wizardData, 
                            dob: dateVal,
                            dobInWords: words
                          });

                          // Name + DOB duplication warning
                          if (wizardData.name && dateVal) {
                            const dup = admissions.find(
                              a => a.name.trim().toLowerCase() === wizardData.name.trim().toLowerCase() && a.dob === dateVal
                            );
                            if (dup) {
                              alert(`🚨 Warning: A student named "${wizardData.name}" with DOB "${dateVal}" is already registered (GR: ${dup.grNumber}).`);
                            }
                          }
                        }}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Gender *</label>
                      <div className="flex gap-4 mt-2">
                        {(setup.genders?.filter(gen => gen.isActive !== false).map(gen => gen.name) || ['Male', 'Female', 'Other']).map(g => (
                          <label key={g} className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold cursor-pointer">
                            <input
                              type="radio"
                              name="gender"
                              value={g}
                              checked={wizardData.gender === g}
                              onChange={() => setWizardData({ ...wizardData, gender: g })}
                              className="accent-indigo-600 h-4 w-4"
                            />
                            {g}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* DOB in Words - Automatically populated */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Date of Birth in Words <span className="text-[10px] text-indigo-500">(Auto-generated for official certificates)</span></label>
                    <input
                      type="text"
                      readOnly
                      placeholder="e.g. FOURTEENTH MAY TWO THOUSAND TWELVE"
                      value={wizardData.dobInWords}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50/50 text-slate-500 font-mono font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Religion</label>
                      <select
                        value={wizardData.religion}
                        onChange={(e) => setWizardData({ ...wizardData, religion: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                      >
                        <option value="">Select Religion...</option>
                        {(setup.religions?.filter(r => r.isActive !== false) || []).map(r => (
                          <option key={r.id} value={r.name}>{r.name}</option>
                        ))}
                        {(!setup.religions || setup.religions.length === 0) && (
                          <>
                            <option value="Islam">Islam</option>
                            <option value="Hinduism">Hinduism</option>
                            <option value="Buddhism">Buddhism</option>
                            <option value="Sikhism">Sikhism</option>
                            <option value="Christianity">Christianity</option>
                            <option value="Jainism">Jainism</option>
                            <option value="Other">Other</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Category</label>
                      <select
                        value={wizardData.category}
                        onChange={(e) => setWizardData({ ...wizardData, category: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                      >
                        <option value="">Select Category...</option>
                        {(setup.categories?.filter(c => c.isActive !== false) || []).map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                        {(!setup.categories || setup.categories.length === 0) && (
                          <>
                            <option value="General">General</option>
                            <option value="OBC">OBC</option>
                            <option value="SC">SC</option>
                            <option value="ST">ST</option>
                            <option value="NT">NT</option>
                            <option value="SBC">SBC</option>
                            <option value="Minority">Minority</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Caste</label>
                      <select
                        value={wizardData.caste}
                        onChange={(e) => setWizardData({ ...wizardData, caste: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                      >
                        <option value="">Select Caste...</option>
                        {(setup.castes?.filter(c => c.isActive !== false) || []).map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                        {(!setup.castes || setup.castes.length === 0) && (
                          <>
                            <option value="Muslim-Sheikh">Muslim-Sheikh</option>
                            <option value="Muslim-Pathan">Muslim-Pathan</option>
                            <option value="Muslim-Ansari">Muslim-Ansari</option>
                            <option value="Maratha">Maratha</option>
                            <option value="Other">Other</option>
                          </>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Mother Tongue</label>
                      <select
                        value={wizardData.motherTongue}
                        onChange={(e) => setWizardData({ ...wizardData, motherTongue: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                      >
                        <option value="">Select Mother Tongue...</option>
                        {(setup.motherTongues?.filter(m => m.isActive !== false) || []).map(m => (
                          <option key={m.id} value={m.name}>{m.name}</option>
                        ))}
                        {(!setup.motherTongues || setup.motherTongues.length === 0) && (
                          <>
                            <option value="Urdu">Urdu</option>
                            <option value="Marathi">Marathi</option>
                            <option value="Hindi">Hindi</option>
                            <option value="English">English</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setWizardStep(2)}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Next: Parents & Contact Info
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: PARENTS & CONTACT */}
              {wizardStep === 2 && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Father's Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="Father / Guardian name"
                        value={wizardData.fatherName}
                        onChange={(e) => setWizardData({ ...wizardData, fatherName: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Mother's Name</label>
                      <input
                        type="text"
                        placeholder="Mother name"
                        value={wizardData.motherName}
                        onChange={(e) => setWizardData({ ...wizardData, motherName: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Father's Occupation</label>
                      <select
                        value={wizardData.fatherOccupation}
                        onChange={(e) => setWizardData({ ...wizardData, fatherOccupation: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                      >
                        <option value="Business">Business</option>
                        <option value="Farming">Farming</option>
                        <option value="Service">Government / Private Service</option>
                        <option value="Labour">Labour Work</option>
                        <option value="Teacher">Teacher</option>
                        <option value="Other">Other (Type below)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Mother's Occupation</label>
                      <select
                        value={wizardData.motherOccupation}
                        onChange={(e) => setWizardData({ ...wizardData, motherOccupation: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                      >
                        <option value="Housewife">Housewife</option>
                        <option value="Teacher">Teacher</option>
                        <option value="Service">Service</option>
                        <option value="Self-Employed">Self-Employed</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  {wizardData.fatherOccupation === 'Other' && (
                    <div className="animate-slideIn">
                      <label className="block text-xs font-semibold text-indigo-500 mb-1">Specify Custom Father's Occupation</label>
                      <input
                        type="text"
                        placeholder="e.g. Advocate"
                        value={wizardData.fatherOccupationCustom}
                        onChange={(e) => setWizardData({ ...wizardData, fatherOccupationCustom: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-indigo-200 rounded-lg bg-indigo-50/20"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Annual Income Bracket</label>
                      <select
                        value={wizardData.annualIncome}
                        onChange={(e) => setWizardData({ ...wizardData, annualIncome: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                      >
                        <option value="Below 1 Lakh">Below 1 Lakh</option>
                        <option value="1-3 Lakhs">1-3 Lakhs</option>
                        <option value="3-5 Lakhs">3-5 Lakhs</option>
                        <option value="Above 5 Lakhs">Above 5 Lakhs</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Primary Mobile *</label>
                      <input
                        type="text"
                        required
                        placeholder="+91 98765 43210"
                        value={wizardData.parentMobile}
                        onChange={(e) => {
                          const val = e.target.value;
                          setWizardData({ ...wizardData, parentMobile: val });
                          
                          // Parent Mobile duplicate warning trigger
                          if (val && val.length >= 10) {
                            const dMob = admissions.find(a => a.parentMobile.includes(val) || val.includes(a.parentMobile));
                            if (dMob) {
                              alert(`🚨 Warning: Parent mobile "${val}" is already associated with admitted student "${dMob.name}" (GR: ${dMob.grNumber}). Verify if they are siblings.`);
                            }
                          }
                        }}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1">
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Alternate Contact</label>
                      <input
                        type="text"
                        placeholder="Mobile No."
                        value={wizardData.alternateMobile}
                        onChange={(e) => setWizardData({ ...wizardData, alternateMobile: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg font-mono"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Emergency Contact *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Maternal Uncle"
                        value={wizardData.emergencyContact}
                        onChange={(e) => setWizardData({ ...wizardData, emergencyContact: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Parent Email</label>
                      <input
                        type="email"
                        placeholder="parent@gmail.com"
                        value={wizardData.parentEmail}
                        onChange={(e) => setWizardData({ ...wizardData, parentEmail: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setWizardStep(1)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-all"
                    >
                      Back: Demographics
                    </button>
                    <button
                      type="button"
                      onClick={() => setWizardStep(3)}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Next: Address & School History
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: ADDRESS & HISTORY */}
              {wizardStep === 3 && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Present Address *</label>
                    <textarea
                      required
                      rows={2}
                      placeholder="Street name, landmark, Taloda"
                      value={wizardData.presentAddress}
                      onChange={(e) => setWizardData({ ...wizardData, presentAddress: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      id="sameAddress"
                      checked={wizardData.sameAsPresent}
                      onChange={(e) => setWizardData({ ...wizardData, sameAsPresent: e.target.checked })}
                      className="accent-indigo-600 h-4 w-4"
                    />
                    <label htmlFor="sameAddress" className="text-xs text-slate-600 font-semibold cursor-pointer">
                      Permanent Address is the same as Present Address
                    </label>
                  </div>

                  {!wizardData.sameAsPresent && (
                    <div className="animate-slideIn">
                      <label className="block text-xs font-semibold text-indigo-500 mb-1">Permanent Address *</label>
                      <textarea
                        required
                        rows={2}
                        placeholder="Native Village details..."
                        value={wizardData.permanentAddress}
                        onChange={(e) => setWizardData({ ...wizardData, permanentAddress: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-indigo-200 bg-indigo-50/10 rounded-lg"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Village/Town</label>
                      <input
                        type="text"
                        list="villages-list"
                        value={wizardData.village}
                        onChange={(e) => setWizardData({ ...wizardData, village: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                      />
                      <datalist id="villages-list">
                        {Array.from(new Set((setup.locations || []).filter(l => l.isActive !== false).map(l => l.village))).map((vil, i) => (
                          <option key={i} value={vil} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Taluka</label>
                      <input
                        type="text"
                        list="talukas-list"
                        value={wizardData.taluka}
                        onChange={(e) => setWizardData({ ...wizardData, taluka: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg font-bold text-slate-700"
                      />
                      <datalist id="talukas-list">
                        {Array.from(new Set((setup.locations || []).filter(l => l.isActive !== false).map(l => l.taluka))).map((tal, i) => (
                          <option key={i} value={tal} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">District</label>
                      <input
                        type="text"
                        list="districts-list"
                        value={wizardData.district}
                        onChange={(e) => setWizardData({ ...wizardData, district: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg font-bold text-slate-700"
                      />
                      <datalist id="districts-list">
                        {Array.from(new Set((setup.locations || []).filter(l => l.isActive !== false).map(l => l.district))).map((dist, i) => (
                          <option key={i} value={dist} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Pin Code</label>
                      <input
                        type="text"
                        value={wizardData.pinCode}
                        onChange={(e) => setWizardData({ ...wizardData, pinCode: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg font-mono"
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3">
                    <h4 className="text-xs font-bold text-slate-800 mb-2">Previous Academic & TC Records</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Last School Name</label>
                        <input
                          type="text"
                          placeholder="Z.P. Urdu Primary School, Taloda"
                          value={wizardData.prevSchoolName}
                          onChange={(e) => setWizardData({ ...wizardData, prevSchoolName: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Transfer Certificate (T.C.) No.</label>
                        <input
                          type="text"
                          placeholder="e.g. TC-90082"
                          value={wizardData.tcNumber}
                          onChange={(e) => setWizardData({ ...wizardData, tcNumber: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Previous Class</label>
                        <select
                          value={wizardData.prevClass}
                          onChange={(e) => setWizardData({ ...wizardData, prevClass: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                        >
                          <option value="">Select Previous Class...</option>
                          {previousClassOptions.map(className => (
                            <option key={className} value={className}>{className}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Previous Board</label>
                        <input
                          type="text"
                          value={wizardData.prevBoard}
                          onChange={(e) => setWizardData({ ...wizardData, prevBoard: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">School UDISE Code</label>
                        <input
                          type="text"
                          placeholder="27210100201"
                          value={wizardData.prevSchoolUdise}
                          onChange={(e) => setWizardData({ ...wizardData, prevSchoolUdise: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setWizardStep(2)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-all"
                    >
                      Back: Parents
                    </button>
                    <button
                      type="button"
                      onClick={() => setWizardStep(4)}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Next: Verification & Setup
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: MEDICAL & ERP SETUP */}
              {wizardStep === 4 && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Physical Disability</label>
                      <select
                        value={wizardData.disability}
                        onChange={(e) => setWizardData({ ...wizardData, disability: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                      >
                        <option value="">Not specified</option>
                        <option value="None">None reported</option>
                        <option value="Visually Challenged">Visually Challenged</option>
                        <option value="Hearing Impaired">Hearing Impaired</option>
                        <option value="Orthopedic">Orthopedic</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Allergies / Special Conditions</label>
                      <input
                        type="text"
                        placeholder="e.g. Asthma, Penicillin allergy"
                        value={wizardData.allergy}
                        onChange={(e) => setWizardData({ ...wizardData, allergy: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Height (cm)</label>
                      <input
                        type="number"
                        placeholder="142"
                        value={wizardData.height}
                        onChange={(e) => setWizardData({ ...wizardData, height: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg font-mono text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Weight (kg)</label>
                      <input
                        type="number"
                        placeholder="38"
                        value={wizardData.weight}
                        onChange={(e) => setWizardData({ ...wizardData, weight: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg font-mono text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Blood Group</label>
                      <select
                        value={wizardData.bloodGroup}
                        onChange={(e) => setWizardData({ ...wizardData, bloodGroup: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-mono font-bold"
                      >
                        <option value="">Not specified</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                    </div>
                  </div>

                  {/* ERP OFFICE ALLOCATION SECTION */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-3">
                    <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Office Allocation Settings</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">Target Class *</label>
                        <select
                          required
                          value={classes.find(item => item.id === wizardData.admissionClassId)?.className || ''}
                          onChange={(e) => {
                            const className = e.target.value;
                            setWizardData({ ...wizardData, admissionClassId: resolveClassId(className, wizardData.division) });
                          }}
                          className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-bold"
                        >
                          <option value="">Select Class...</option>
                          {activeClassMasters.map(className => (
                            <option key={className} value={className}>{className}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">Division *</label>
                        <select
                          required
                          value={wizardData.division}
                          onChange={(e) => {
                            const division = e.target.value;
                            const className = classes.find(item => item.id === wizardData.admissionClassId)?.className || activeClassMasters[0] || '';
                            setWizardData({ ...wizardData, division, admissionClassId: resolveClassId(className, division) });
                          }}
                          className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-bold"
                        >
                          <option value="">Select Division...</option>
                          {activeDivisions.map(division => (
                            <option key={division} value={division}>{division}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">Medium *</label>
                        <select
                          required
                          value={wizardData.medium}
                          onChange={(e) => setWizardData({ ...wizardData, medium: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-bold"
                        >
                          <option value="">Select Medium...</option>
                          {activeMediums.map(medium => (
                            <option key={medium} value={medium}>{medium}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">Roll Number</label>
                        <input
                          type="number"
                          placeholder="Auto (e.g. 21)"
                          value={wizardData.rollNo}
                          onChange={(e) => setWizardData({ ...wizardData, rollNo: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg font-mono text-center font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">Admission Type</label>
                        <select
                          value={wizardData.admissionType}
                          onChange={(e) => setWizardData({ ...wizardData, admissionType: e.target.value })}
                          className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                        >
                          {(setup.admissionTypes?.filter(t => t.isActive !== false) || []).map(t => (
                            <option key={t.id} value={t.name}>{t.name}</option>
                          ))}
                          {(!setup.admissionTypes || setup.admissionTypes.length === 0) && (
                            <>
                              <option value="Regular">Regular</option>
                              <option value="RTE Block">RTE Block 25%</option>
                              <option value="Transfer In">Transfer In</option>
                              <option value="Re-admission">Re-admission</option>
                            </>
                          )}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">Sports House</label>
                        <select
                          value={wizardData.house}
                          onChange={(e) => setWizardData({ ...wizardData, house: e.target.value })}
                          className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                        >
                          {(setup.houses?.filter(h => h.isActive !== false) || []).map(h => (
                            <option key={h.id} value={h.name}>{h.name}</option>
                          ))}
                          {(!setup.houses || setup.houses.length === 0) && (
                            <>
                              <option value="Green House">Green House (Zaitoon)</option>
                              <option value="Blue House">Blue House (Sana)</option>
                              <option value="Red House">Red House (Marjaan)</option>
                              <option value="Yellow House">Yellow House (Rehan)</option>
                            </>
                          )}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-800">Documents & Final Verification</h4>
                        <p className="mt-1 text-[10px] leading-4 text-slate-500">Upload the admission documents here. Only Leaving Certificate (LC), Aadhaar Card and Passport Size Photograph are compulsory; any other configured documents remain optional. Files are securely stored only when the intake is sent to the Headmaster.</p>
                      </div>
                      <div className={`rounded-full px-2.5 py-1 text-[10px] font-black ${admissionDocumentProgress.missingRequired.length === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        Required {admissionDocumentProgress.requiredReceived}/{admissionDocumentProgress.requiredTotal}
                      </div>
                    </div>
                    <div className="space-y-2">
                      {admissionDocumentDefinitions.map((document: any) => {
                        const selectedFile = admissionDocumentFiles[document.name];
                        const isPhoto = admissionDocumentAlias(document.name) === 'photo';
                        return (
                          <div key={document.name} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex min-w-0 items-center gap-2 text-xs font-bold text-slate-800">
                                <span className={`grid h-5 w-5 place-items-center rounded-full ${selectedFile ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                                  {selectedFile ? '✓' : '↑'}
                                </span>
                                <span className="truncate">{document.name}</span>
                              </div>
                              <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${document.required ? 'bg-rose-50 text-rose-700' : 'bg-slate-200 text-slate-600'}`}>{document.required ? 'Required' : 'Optional'}</span>
                            </div>
                            {document.description && <p className="mt-1 pl-7 text-[9px] leading-4 text-slate-500">{document.description}</p>}
                            <div className="mt-2 flex flex-wrap items-center gap-2 pl-7">
                              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-[10px] font-black text-indigo-700 hover:bg-indigo-50">
                                <FileUp className="h-3.5 w-3.5" />
                                <span>{selectedFile ? 'Replace File' : 'Upload File'}</span>
                                <input
                                  type="file"
                                  accept={isPhoto ? 'image/jpeg,image/png,image/webp' : 'image/jpeg,image/png,image/webp,application/pdf'}
                                  className="hidden"
                                  onChange={(event) => {
                                    const file = event.target.files?.[0] || null;
                                    void handleAdmissionDocumentFile(document, file);
                                    event.currentTarget.value = '';
                                  }}
                                />
                              </label>
                              {selectedFile && (
                                <>
                                  <span className="max-w-[220px] truncate text-[10px] font-semibold text-emerald-700" title={selectedFile.fileName}>{selectedFile.fileName}</span>
                                  <span className="text-[9px] text-slate-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                                  <button
                                    type="button"
                                    onClick={() => removeAdmissionDocumentFile(document)}
                                    className="rounded-lg border border-rose-100 bg-white px-2 py-1 text-[9px] font-black text-rose-600 hover:bg-rose-50"
                                  >
                                    Remove
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="rounded-lg bg-slate-950 px-3 py-2 text-[10px] text-white">
                      Files: <strong>{admissionDocumentProgress.received}/{admissionDocumentProgress.total}</strong> selected · Headmaster handoff {admissionDocumentProgress.missingRequired.length === 0 ? 'ready' : 'blocked until LC, Aadhaar and Photo are uploaded'}.
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Admission Desk Clerical Remarks</label>
                    <textarea
                      rows={1.5}
                      placeholder="Document verification notes / Headmaster handoff remarks."
                      value={wizardData.remarks}
                      onChange={(e) => setWizardData({ ...wizardData, remarks: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                    />
                  </div>

                  {/* FINAL SUMMIT CONTROLS */}
                  <div className="flex justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setWizardStep(3)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-all"
                    >
                      Back: Address
                    </button>
                    
                    <div className="flex max-w-xl flex-col items-end gap-2">
                      {admissionActionMessage && (
                        <div className={`w-full rounded-lg border px-3 py-2 text-[10px] font-bold ${admissionActionMessage.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : admissionActionMessage.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-blue-200 bg-blue-50 text-blue-800'}`}>
                          {admissionActionMessage.text}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleExecuteAdmission()}
                        disabled={admissionSubmitting}
                        className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-bold text-xs rounded-lg transition-all cursor-pointer shadow-sm flex items-center gap-2"
                      >
                        <span>{admissionSubmitting ? 'Saving & Sending…' : 'Save Intake & Send to Headmaster'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </form>
          </div>

          {/* Master Admitted Pool (5 columns) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 lg:col-span-5 shadow-sm">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2 flex-wrap gap-2">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Admission Preparation Ledger</h3>
                <p className="text-[11px] text-slate-400">Local compatibility view only. Canonical admission applications and final Student Master creation remain in the cloud approval workflow.</p>
              </div>

              {/* Filtering Controls */}
              <div className="w-full">
                <input
                  type="text"
                  placeholder="Search GR, Name, Father..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>
            </div>

            <div className="overflow-y-auto max-h-[460px] space-y-2 pr-1">
              {filteredAdmissions.length === 0 ? (
                <div className="p-8 text-center text-slate-400 italic text-xs">
                  No admissions found in ledger.
                </div>
              ) : (
                filteredAdmissions.map((adm) => {
                  const isSelected = selectedCertStudent?.grNumber === adm.grNumber;
                  const associatedUser = registeredStudents.find(u => u.grNumber === adm.grNumber);
                  
                  return (
                    <div
                      key={adm.grNumber}
                      onClick={() => setSelectedCertStudent(adm)}
                      className={`p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                        isSelected 
                          ? 'border-indigo-500 bg-indigo-50/20 shadow-sm'
                          : 'border-slate-100 bg-white hover:border-slate-200'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <span className="font-mono font-black text-slate-800 text-[11px] bg-slate-100 px-1.5 py-0.5 rounded mr-1.5">
                            {adm.grNumber}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {adm.admissionNumber || "N/A"}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full uppercase ${
                          associatedUser ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {associatedUser ? 'Login Ready' : 'Unregistered'}
                        </span>
                      </div>
                      
                      <div className="font-bold text-slate-800">{adm.name}</div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        F: {adm.fatherName}
                      </div>
                      
                      <div className="mt-1.5 flex justify-between items-center text-[10px] text-slate-400">
                        <span>Class {classes.find(c => c.id === adm.admissionClassId)?.className || 'X'} ({adm.division})</span>
                        <span className="font-mono">{adm.parentMobile}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* EXPANDED DOSSIER PREVIEW & A4 PROFESSIONAL PRINTING */}
            {selectedCertStudent && (
              <div className="border-t border-slate-200 pt-4 mt-2 space-y-3 animate-slideIn">
                <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div>
                    <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Official Student GR Dossier</h4>
                    <p className="text-[10px] text-slate-500">{selectedCertStudent.name}</p>
                  </div>
                  <button
                    onClick={() => openSmartPrint({
                      elementId: `print-gr-card-${selectedCertStudent.grNumber}`,
                      title: `Official Student GR Dossier - ${selectedCertStudent.name}`,
                      paperSize: 'A4',
                      orientation: 'portrait',
                      moduleName: 'Clerk Student Records'
                    })}
                    className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition-all flex items-center gap-1.5"
                  >
                    🖨️ Print Form / GR Card
                  </button>
                </div>

                {/* Print Template Container (Hidden on UI, formatted cleanly for display preview in card) */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-[11px] space-y-2 max-h-[350px] overflow-y-auto">
                  <div id={`print-gr-card-${selectedCertStudent.grNumber}`} className="bg-white p-4 shadow-sm border border-slate-200/50 rounded">
                    
                    {/* Letterhead */}
                    <div className="text-center border-b border-slate-300 pb-2 mb-3">
                      <h2 className="font-extrabold text-slate-800 text-xs tracking-tight uppercase">National High School, Taloda</h2>
                      <p className="text-[9px] text-slate-500">Taluka Taloda, Dist. Nandurbar, Maharashtra - 425413</p>
                      <p className="text-[8px] text-slate-400">Recognised by Gov of Maharashtra | Index No: S-27.21.010</p>
                    </div>

                    <div className="text-center font-bold underline uppercase text-[10px] text-slate-700 mb-3">
                      Student General Register (G.R.) Record
                    </div>

                    <table className="w-full border-collapse border border-slate-300 text-[10px]">
                      <tbody>
                        <tr>
                          <td className="border border-slate-300 bg-slate-50 p-1.5 font-bold w-1/4">G.R. Number</td>
                          <td className="border border-slate-300 p-1.5 font-mono font-bold text-slate-800">{selectedCertStudent.grNumber}</td>
                          <td className="border border-slate-300 bg-slate-50 p-1.5 font-bold w-1/4">Admission No</td>
                          <td className="border border-slate-300 p-1.5 font-mono">{selectedCertStudent.admissionNumber || '—'}</td>
                        </tr>
                        <tr>
                          <td className="border border-slate-300 bg-slate-50 p-1.5 font-bold">Student Name</td>
                          <td colSpan={3} className="border border-slate-300 p-1.5 font-bold text-slate-800 uppercase">{selectedCertStudent.name}</td>
                        </tr>
                        <tr>
                          <td className="border border-slate-300 bg-slate-50 p-1.5 font-bold">Father Name</td>
                          <td className="border border-slate-300 p-1.5">{selectedCertStudent.fatherName}</td>
                          <td className="border border-slate-300 bg-slate-50 p-1.5 font-bold">Mother Name</td>
                          <td className="border border-slate-300 p-1.5">{selectedCertStudent.motherName || '—'}</td>
                        </tr>
                        <tr>
                          <td className="border border-slate-300 bg-slate-50 p-1.5 font-bold">Date of Birth</td>
                          <td className="border border-slate-300 p-1.5 font-mono">{selectedCertStudent.dob}</td>
                          <td className="border border-slate-300 bg-slate-50 p-1.5 font-bold">Gender</td>
                          <td className="border border-slate-300 p-1.5">{selectedCertStudent.gender}</td>
                        </tr>
                        <tr>
                          <td className="border border-slate-300 bg-slate-50 p-1.5 font-bold">DOB in Words</td>
                          <td colSpan={3} className="border border-slate-300 p-1.5 font-mono text-[9px] font-semibold text-indigo-700 uppercase">
                            {selectedCertStudent.dobInWords || convertDateToWords(selectedCertStudent.dob)}
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-slate-300 bg-slate-50 p-1.5 font-bold">Religion & Category</td>
                          <td className="border border-slate-300 p-1.5">{selectedCertStudent.religion || '—'} / {selectedCertStudent.category || '—'} ({selectedCertStudent.caste || '—'})</td>
                          <td className="border border-slate-300 bg-slate-50 p-1.5 font-bold">Mother Tongue</td>
                          <td className="border border-slate-300 p-1.5">{selectedCertStudent.motherTongue || '—'}</td>
                        </tr>
                        <tr>
                          <td className="border border-slate-300 bg-slate-50 p-1.5 font-bold">Class Assigned</td>
                          <td className="border border-slate-300 p-1.5 font-bold text-slate-700">
                            Class {classes.find(c => c.id === selectedCertStudent.admissionClassId)?.className || 'Unknown'} ({selectedCertStudent.division})
                          </td>
                          <td className="border border-slate-300 bg-slate-50 p-1.5 font-bold">Academic Session</td>
                          <td className="border border-slate-300 p-1.5">{selectedCertStudent.academicYear}</td>
                        </tr>
                        <tr>
                          <td className="border border-slate-300 bg-slate-50 p-1.5 font-bold">Parent Phone</td>
                          <td className="border border-slate-300 p-1.5 font-mono">{selectedCertStudent.parentMobile}</td>
                          <td className="border border-slate-300 bg-slate-50 p-1.5 font-bold">Occupation</td>
                          <td className="border border-slate-300 p-1.5">{selectedCertStudent.fatherOccupation || 'Business'}</td>
                        </tr>
                        <tr>
                          <td className="border border-slate-300 bg-slate-50 p-1.5 font-bold">Address</td>
                          <td colSpan={3} className="border border-slate-300 p-1.5 text-slate-600">{selectedCertStudent.address}</td>
                        </tr>
                        <tr>
                          <td className="border border-slate-300 bg-slate-50 p-1.5 font-bold">Previous School</td>
                          <td colSpan={3} className="border border-slate-300 p-1.5 italic text-slate-500">
                            {selectedCertStudent.lastSchool || 'N/A'} (TC No: {selectedCertStudent.tcNumber || 'TC-Preset'})
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-slate-300 bg-slate-50 p-1.5 font-bold">Medical Status</td>
                          <td className="border border-slate-300 p-1.5">Disability: {selectedCertStudent.disability || 'None'} / Allergy: {selectedCertStudent.allergy || 'None'}</td>
                          <td className="border border-slate-300 bg-slate-50 p-1.5 font-bold">Ht / Wt</td>
                          <td className="border border-slate-300 p-1.5">{selectedCertStudent.height || '142'}cm / {selectedCertStudent.weight || '38'}kg (BG: {selectedCertStudent.bloodGroup || 'O+'})</td>
                        </tr>
                      </tbody>
                    </table>

                    <div className="mt-8 flex justify-between items-center text-[9px] font-bold text-slate-600">
                      <div className="border-t border-slate-400 w-24 text-center pt-1 mt-4">Office Clerk</div>
                      <div className="border-t border-slate-400 w-24 text-center pt-1 mt-4">Class Teacher</div>
                      <div className="border-t border-slate-400 w-24 text-center pt-1 mt-4">Headmaster Seal</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* CLERK TAB 3: STUDENT RECORDS */}
      {/* ======================================================== */}
      {clerkTab === 'student_records' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 text-left">
          <div className="flex flex-wrap justify-between items-center gap-4 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">ERP Student Database & Profiles</h3>
              <p className="text-[11px] text-slate-400">Search student profiles, edit details, and maintain compliance</p>
            </div>

            {/* Comprehensive search panel */}
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                placeholder="Search GR, Name, Father, Mobile..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 w-60"
              />
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
              >
                <option value="">All Classes</option>
                {classes.map(cl => (
                  <option key={cl.id} value={cl.id}>{cl.className}</option>
                ))}
              </select>
              <select
                value={filterDivision}
                onChange={(e) => setFilterDivision(e.target.value)}
                className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
              >
                <option value="">All Divisions</option>
                <option value="A">Division A</option>
                <option value="B">Division B</option>
                <option value="C">Division C</option>
                <option value="Urdu Medium">Urdu Medium</option>
                <option value="Science">Science</option>
                <option value="Commerce">Commerce</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="p-3">G.R. Number</th>
                  <th className="p-3">Full Name</th>
                  <th className="p-3">Father Name</th>
                  <th className="p-3">DOB</th>
                  <th className="p-3">Class</th>
                  <th className="p-3">Contact No.</th>
                  <th className="p-3">Verification Documents</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAdmissions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                      No matching student profiles found.
                    </td>
                  </tr>
                ) : (
                  filteredAdmissions.map((adm) => {
                    const docCount = (Object.values(adm.documents) as any[]).filter((d: any) => d.uploaded).length;
                    return (
                      <tr key={adm.grNumber} className="hover:bg-slate-50/50">
                        <td className="p-3 font-bold font-mono text-indigo-700">{adm.grNumber}</td>
                        <td className="p-3 font-bold text-slate-800">{adm.name}</td>
                        <td className="p-3 text-slate-600">{adm.fatherName}</td>
                        <td className="p-3 font-mono text-slate-500">{adm.dob}</td>
                        <td className="p-3">
                          {classes.find(c => c.id === adm.admissionClassId)?.className || 'Class Unknown'} - {adm.division}
                        </td>
                        <td className="p-3 font-mono text-slate-600">{adm.parentMobile}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                            docCount === 3 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {docCount} / 3 Uploaded
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex justify-center gap-1.5">
                            <button
                              onClick={() => {
                                const newPen = prompt('Update PEN ID for ' + adm.name, adm.penNumber || '');
                                if (newPen !== null) {
                                  const updated = registeredStudents.map(s => s.grNumber === adm.grNumber ? { ...s, penNumber: newPen.trim().toUpperCase() } : s);
                                  // Update student records
                                  const rawAdmissions = JSON.parse(localStorage.getItem('nhs_erp_clerk_admissions') || '[]');
                                  const updatedAdmissions = rawAdmissions.map(a => a.grNumber === adm.grNumber ? { ...a, penNumber: newPen.trim().toUpperCase() } : a);
                                  localStorage.setItem('nhs_erp_clerk_admissions', JSON.stringify(updatedAdmissions));
                                  
                                  // Update users table
                                  const users = LocalERPDatabase.getUsers();
                                  const updatedUsers = users.map(u => u.grNumber === adm.grNumber ? { ...u, penNumber: newPen.trim().toUpperCase() } : u);
                                  LocalERPDatabase.saveUsers(updatedUsers);
                                  
                                  // Sync back
                                  setRegisteredStudents(updatedUsers.filter(u => u.role === 'student'));
                                }
                              }}
                              className="p-1 hover:bg-slate-100 rounded text-blue-600"
                              title="Edit PEN ID"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { setSelectedCertStudent(adm); setClerkTab('certificates'); }}
                              className="p-1 hover:bg-slate-100 rounded text-indigo-600"
                              title="Generate Certificate"
                            >
                              <Award className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { setSelectedDocStudent(adm); setClerkTab('documents'); }}
                              className="p-1 hover:bg-slate-100 rounded text-emerald-600"
                              title="Manage Documents"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* CLERK TAB 4 & 5: CERTIFICATES & DOCUMENTS VAULT */}
      {/* ======================================================== */}
      {(clerkTab === 'certificates' || clerkTab === 'documents') && (
        <CertificateDocumentSystem lang={lang} user={user} onRefreshData={onRefreshData} />
      )}

      {/* ======================================================== */}
      {/* CLERK TAB 6: REPORTS */}
      {/* ======================================================== */}
      {clerkTab === 'reports' && (
        <div className="space-y-6 text-left">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <h3 className="font-bold text-slate-800 text-sm">Clerk Analytical Office Reports</h3>
            <p className="text-xs text-slate-500">Select report view below to extract from National database records</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Report 1: Fee Arrears list */}
            <div id="clerk-arrears-report-print" className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <div className="border-b border-slate-100 pb-2 flex justify-between items-center">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider font-mono">Arrears / Pending Dues Report</h4>
                <button
                  type="button"
                  onClick={() => openSmartPrint({ elementId: 'clerk-arrears-report-print', title: 'Arrears / Pending Dues Report' })}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[10px] rounded flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3 h-3" />
                  <span>Print Report</span>
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {fees.filter(f => f.status !== 'Paid').map(fee => (
                  <div key={fee.id} className="py-2.5 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-700">{fee.studentName}</p>
                      <span className="text-[10px] text-slate-400 font-mono">{fee.className}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-600 font-mono">Due: INR {fee.amount - fee.paidAmount}</p>
                      <p className="text-[10px] text-slate-400">Total: INR {fee.amount}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Report 2: Document Compliance checklist */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <div className="border-b border-slate-100 pb-2">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider font-mono">Admission Document Compliance Review</h4>
              </div>

              <div className="divide-y divide-slate-100">
                {admissions.map(adm => {
                  const verifiedDocs = (Object.values(adm.documents) as any[]).filter((d: any) => d.uploaded).length;
                  return (
                    <div key={adm.grNumber} className="py-2.5 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-slate-700">{adm.name}</p>
                        <span className="text-[10px] text-slate-400 font-mono">GR Number: {adm.grNumber}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded font-bold text-[9px] font-mono ${
                        verifiedDocs === 3 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {verifiedDocs === 3 ? 'FULLY COMPLIANT' : `${3 - verifiedDocs} MISSING`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* CLERK TAB 7: FEES COUNTER */}
      {/* ======================================================== */}
      {clerkTab === 'fees' && (
        <SmartFeeManager
          lang={lang}
          user={{
            id: user.id,
            name: user.name,
            email: user.email,
            role: 'clerk',
            username: user.username
          }}
          onRefreshData={onRefreshData}
        />
      )}

      {clerkTab === 'accounting' && (
        <SmartAccountingManager
          lang={lang}
          user={{
            id: user.id,
            name: user.name,
            email: user.email,
            role: 'clerk',
            username: user.username
          }}
          onRefreshData={onRefreshData}
        />
      )}

      {/* ======================================================== */}
      {/* CLERK TAB 8: GENERAL REGISTER (OFFICE REGISTERS) */}
      {/* ======================================================== */}
      {clerkTab === 'registers' && (
        <div id="clerk-gr-register-print" className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 text-left">
          <div className="border-b border-slate-100 pb-2 flex justify-between items-center flex-wrap gap-2">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">General Register (G.R. Book)</h3>
              <p className="text-[11px] text-slate-400">Master office register representing the permanent legal intake archives</p>
            </div>

            <button
              type="button"
              onClick={() => openSmartPrint({ elementId: 'clerk-gr-register-print', title: 'General Register (G.R. Book)', orientation: 'landscape' })}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print GR Register</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[11px] text-left border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold">
                  <th className="p-2 border border-slate-300">GR No.</th>
                  <th className="p-2 border border-slate-300">Admission Date</th>
                  <th className="p-2 border border-slate-300">Student Name</th>
                  <th className="p-2 border border-slate-300">Father's Name</th>
                  <th className="p-2 border border-slate-300">Mother's Name</th>
                  <th className="p-2 border border-slate-300">Gender</th>
                  <th className="p-2 border border-slate-300">Date of Birth</th>
                  <th className="p-2 border border-slate-300">Birth Place</th>
                  <th className="p-2 border border-slate-300">Previous School</th>
                  <th className="p-2 border border-slate-300">Class Admitted</th>
                  <th className="p-2 border border-slate-300">Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {admissions.map(adm => (
                  <tr key={adm.grNumber} className="hover:bg-slate-50/50">
                    <td className="p-2 border border-slate-300 font-bold font-mono">{adm.grNumber}</td>
                    <td className="p-2 border border-slate-300 font-mono">{adm.admissionDate}</td>
                    <td className="p-2 border border-slate-300 font-bold">{adm.name}</td>
                    <td className="p-2 border border-slate-300">{adm.fatherName}</td>
                    <td className="p-2 border border-slate-300">{adm.motherName || '—'}</td>
                    <td className="p-2 border border-slate-300">{adm.gender}</td>
                    <td className="p-2 border border-slate-300 font-mono">{adm.dob}</td>
                    <td className="p-2 border border-slate-300">{adm.birthPlace || '—'}</td>
                    <td className="p-2 border border-slate-300 text-[10px]">{adm.lastSchool || 'N/A'}</td>
                    <td className="p-2 border border-slate-300">
                      {classes.find(c => c.id === adm.admissionClassId)?.className || 'Unknown'} - {adm.division}
                    </td>
                    <td className="p-2 border border-slate-300 max-w-[150px] truncate">{adm.address || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* CLERK TAB 9.5: ATTENDANCE LEDGERS */}
      {/* ======================================================== */}
      {clerkTab === 'attendance' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <SmartAttendanceManager lang={lang} user={user} onRefreshData={onRefreshData} />
        </div>
      )}

      {/* ======================================================== */}
      {/* CLERK TAB 9.75: LEAVE REGISTER */}
      {/* ======================================================== */}
      {clerkTab === 'leaves' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <SmartLeaveManager lang={lang} user={user} onRefreshData={onRefreshData} activeFeatureId={activeFeatureId} focusedMode={focusedMode} focusedTitle={focusedTitle || 'Leave Management'} />
        </div>
      )}

      {/* ======================================================== */}
      {/* CLERK TAB 10: CLERK PROFILE */}
      {/* ======================================================== */}
      {clerkTab === 'profile' && (
        <div className="max-w-md mx-auto bg-white rounded-2xl border border-slate-200 p-6 space-y-6 text-left">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
            <img
              src={user.photoUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'}
              alt={user.name}
              referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-full object-cover border-2 border-indigo-500"
            />
            <div>
              <h3 className="font-bold text-slate-900 text-sm">{user.name}</h3>
              <p className="text-xs text-indigo-600 font-bold">{user.designation || 'Senior Clerk'}</p>
              <p className="text-[10px] font-mono text-slate-400">Employee Code: {user.employeeCode || 'CLERK101'}</p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <p><strong>Official Email:</strong> {user.email}</p>
            <p><strong>Mobile Number:</strong> {user.phone || '+91 98765 43211'}</p>
            <p><strong>Assigned Office:</strong> Main Administrative Block, Room 12</p>
            <p><strong>System Role Authority:</strong> Clerk Office Registry Management</p>
          </div>
        </div>
      )}


      {selectedReceiptFee && (
        <div style={{ position: 'fixed', left: '-12000px', top: 0 }} aria-hidden="true">
          <section id="clerk-fee-receipt-print" className="w-[520px] bg-white p-8 text-slate-900">
            <PrintLetterhead lang={lang} subtitle="OFFICIAL FEE RECEIPT" />
            <div className="rounded-xl border-2 border-slate-800 p-5 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><strong>Student:</strong> {selectedReceiptFee.studentName}</div>
                <div><strong>Class:</strong> {selectedReceiptFee.className}</div>
                <div><strong>Academic Year:</strong> {selectedReceiptFee.academicYear}</div>
                <div><strong>Date:</strong> {new Date().toLocaleDateString('en-IN')}</div>
                <div><strong>Total Fee:</strong> INR {selectedReceiptFee.amount}</div>
                <div><strong>Total Paid:</strong> INR {selectedReceiptFee.paidAmount}</div>
                <div><strong>Balance:</strong> INR {Math.max(0, selectedReceiptFee.amount - selectedReceiptFee.paidAmount)}</div>
                <div><strong>Status:</strong> {selectedReceiptFee.status}</div>
              </div>
            </div>
            <PrintSignatureArea lang={lang} />
          </section>
        </div>
      )}
    </div>
  );
}

// Minimal icons helper
function ChevronRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
