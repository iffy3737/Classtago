import React, { useState, useEffect } from 'react';
import { 
  BookOpen, UserCheck, Shield, FileText, Printer, Search, Filter, Plus, 
  Edit, CheckCircle2, Clock, Award, Users, DollarSign, Package, 
  BookMarked, Eye, AlertTriangle, Trash2, ShieldAlert, BadgeCheck, FileSpreadsheet,
  CheckCircle, HelpCircle, X, Check, ClipboardList, RefreshCw
} from 'lucide-react';
import { LocalERPDatabase } from '../lib/supabase';
import { printSectionById } from '../utils/printSection';
import { User, AuditLogEntry } from '../types';

interface StatutoryRegistersManagerProps {
  lang: 'en' | 'hi' | 'ur';
  user: User;
  activeFeatureId?: string | null;
  focusedMode?: boolean;
  focusedTitle?: string;
}

// Interfaces for our custom register schemas
interface ScholarshipRecord {
  id: string;
  name: string;
  studentName: string;
  grNumber: string;
  classAndDiv: string;
  amount: number;
  academicYear: string;
  status: 'Pending' | 'Approved' | 'Disbursed';
  paymentDetails: string;
}

interface ConcessionRecord {
  id: string;
  studentName: string;
  grNumber: string;
  classAndDiv: string;
  concessionType: string;
  percentage: number;
  amount: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  academicYear: string;
}

interface InspectionRecord {
  id: string;
  inspectionDate: string;
  inspectingAuthority: string;
  department: string;
  remarks: string;
  complianceRequired: string;
  complianceCompleted: boolean;
  documentsAttached: string;
}

interface GRCorrectionRecord {
  id: string;
  grNumber: string;
  studentName: string;
  fieldCorrected: string;
  oldValue: string;
  newValue: string;
  correctedBy: string;
  correctedAt: string;
  reason: string;
}

type StatutoryRegisterId =
  | 'admission' | 'gr' | 'leaving' | 'bonafide' | 'scholarship' | 'concession'
  | 'examination' | 'result' | 'staff' | 'inspection' | 'visitor' | 'inventory'
  | 'library' | 'fees' | 'attendance';

const STATUTORY_FEATURE_REGISTER: Record<string, StatutoryRegisterId> = {
  'cl-register-admission': 'admission',
  'cl-register-general': 'gr',
  'cl-register-leaving': 'leaving',
  'cl-register-bonafide': 'bonafide',
  'cl-register-scholarship': 'scholarship',
  'cl-register-concession': 'concession',
  'cl-register-examination': 'examination',
  'cl-register-result': 'result',
  'cl-register-staff': 'staff',
  'cl-register-inspection': 'inspection',
  'cl-register-visitor': 'visitor',
  'cl-register-inventory': 'inventory',
  'cl-register-library': 'library',
  'cl-register-fees': 'fees',
  'cl-register-attendance': 'attendance',
  'cl-register-maintenance': 'admission',
  'cl-register-periods': 'gr',
  'cl-register-print': 'fees',
  'cl-inspection-pack': 'inspection',
  'operational-registers': 'admission',
  'register-certification': 'gr',
  'register-locking': 'result',
  'inspection-exports': 'inspection',
  'register-history': 'inspection'
};

export default function StatutoryRegistersManager({
  lang,
  user,
  activeFeatureId = null,
  focusedMode = false,
  focusedTitle = 'Statutory Registers'
}: StatutoryRegistersManagerProps) {
  const isHeadmaster = user.role === 'headmaster';
  const isClerk = user.role === 'clerk';
  const isTeacher = user.role === 'teacher';

  // State for active register tab
  const [activeReg, setActiveReg] = useState<StatutoryRegisterId>('admission');

  useEffect(() => {
    if (!activeFeatureId) return;
    const targetRegister = STATUTORY_FEATURE_REGISTER[activeFeatureId];
    if (targetRegister) {
      setActiveReg(targetRegister);
      setSearchTerm('');
      setSelectedClass('All');
      setSelectedDiv('All');
      setDateFilter('');
    }
  }, [activeFeatureId]);

  // Unified Search and Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  const [selectedDiv, setSelectedDiv] = useState('All');
  const [selectedYear, setSelectedYear] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Print Settings Panel
  const [printFormat, setPrintFormat] = useState<'A4' | 'A3'>('A4');
  const [printStyle, setPrintStyle] = useState<'color' | 'mono'>('color');

  // Database States loaded from LocalStorage or generated
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [scholarships, setScholarships] = useState<ScholarshipRecord[]>([]);
  const [concessions, setConcessions] = useState<ConcessionRecord[]>([]);
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [grCorrections, setGrCorrections] = useState<GRCorrectionRecord[]>([]);
  const [visitors, setVisitors] = useState<any[]>([]);
  const [inventoryAssets, setInventoryAssets] = useState<any[]>([]);
  const [inventoryDead, setInventoryDead] = useState<any[]>([]);
  const [libraryBooks, setLibraryBooks] = useState<any[]>([]);
  const [feeTransactions, setFeeTransactions] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);

  // Sub-tabs for specific registers
  const [feeSubTab, setFeeSubTab] = useState<'daily' | 'monthly' | 'annual'>('daily');
  const [attendanceSubTab, setAttendanceSubTab] = useState<'student' | 'teacher'>('student');
  const [attendancePeriod, setAttendancePeriod] = useState<'monthly' | 'annual'>('monthly');

  // Modal / Form States
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [newInspection, setNewInspection] = useState({
    inspectingAuthority: '',
    department: '',
    remarks: '',
    complianceRequired: '',
    documentsAttached: ''
  });

  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [selectedStudentForCorrection, setSelectedStudentForCorrection] = useState<any>(null);
  const [correctionForm, setCorrectionForm] = useState({
    fieldCorrected: 'Name',
    oldValue: '',
    newValue: '',
    reason: ''
  });

  const [showScholarshipModal, setShowScholarshipModal] = useState(false);
  const [newScholarship, setNewScholarship] = useState({
    name: '',
    grNumber: '',
    amount: '',
    academicYear: '',
    status: 'Pending' as const,
    paymentDetails: ''
  });

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Helper to log operational audit trails
  const logRegisterAction = (action: string, details: string) => {
    // Add to supabase/localERPDB Audit Logs
    LocalERPDatabase.addAuditLog(user.id, user.name, user.role as any, action, 'Statutory Registers', details);
    
    // Also save specific registers audit trail in LocalStorage
    const storedAudit = JSON.parse(localStorage.getItem('nhs_erp_audit_logs') || '[]');
    const newEntry = {
      id: 'reg_audit_' + Date.now(),
      timestamp: new Date().toISOString(),
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action,
      module: 'Statutory Registers',
      description: details
    };
    localStorage.setItem('nhs_erp_audit_logs', JSON.stringify([newEntry, ...storedAudit]));
  };

  // HYDRATE & SEED ALL DATABASES
  useEffect(() => {
    const configuredYear = LocalERPDatabase.getAcademicSetup()?.academicYears?.find((year: any) => year.isActive)?.year || '';
    setSelectedYear(current => current || configuredYear);
    setNewScholarship(current => ({ ...current, academicYear: current.academicYear || configuredYear }));
    // 1. Admission / Students Data
    const rawAdm = localStorage.getItem('nhs_erp_clerk_admissions');
    let loadedAdmissions: any[] = [];
    if (rawAdm) {
      loadedAdmissions = JSON.parse(rawAdm);
    } 
    setAdmissions(loadedAdmissions);

    // 2. Certificates (Leaving & Bonafide)
    const rawCerts = localStorage.getItem('nhs_erp_certificates_log');
    if (rawCerts) {
      setCertificates(JSON.parse(rawCerts));
    }  else {
      setCertificates([]);
    }

    // 3. Scholarships Register
    const rawSch = localStorage.getItem('nhs_erp_scholarships');
    if (rawSch) {
      setScholarships(JSON.parse(rawSch));
    }  else {
      setScholarships([]);
    }

    // 4. Free Ships / Concession Register
    const rawConc = localStorage.getItem('nhs_erp_concession_requests');
    if (rawConc) {
      // Converted to local format
      const parsed = JSON.parse(rawConc);
      const mapped = parsed.map((c: any, i: number) => ({
        id: c.id || `con_${i}`,
        studentName: c.studentName || '',
        grNumber: c.grNumber || '',
        classAndDiv: c.className ? `${c.className}${c.division ? ` - ${c.division}` : ''}` : '',
        concessionType: c.concessionType || c.category || 'EBC Economic Fee Waiver',
        percentage: c.percentage ?? c.discountPercent ?? 0,
        amount: c.amount ?? c.discountAmount ?? 0,
        status: c.status === 'Approved' ? 'Approved' : c.status === 'Rejected' ? 'Rejected' : 'Pending',
        academicYear: c.academicYear || ''
      }));
      setConcessions(mapped);
    }  else {
      setConcessions([]);
    }

    // 5. Inspections Register
    const rawInsp = localStorage.getItem('nhs_erp_inspections');
    if (rawInsp) {
      setInspections(JSON.parse(rawInsp));
    }  else {
      setInspections([]);
    }

    // 6. GR Corrections Audit Trail
    const rawCorr = localStorage.getItem('nhs_erp_gr_corrections');
    if (rawCorr) {
      setGrCorrections(JSON.parse(rawCorr));
    }  else {
      setGrCorrections([]);
    }

    // 7. Visitors Register (from Central Database)
    setVisitors(LocalERPDatabase.getVisitors());

    // 8. Inventory & Dead Stock
    const rawAssets = localStorage.getItem('nhs_inventory_assets');
    if (rawAssets) {
      setInventoryAssets(JSON.parse(rawAssets));
    }  else {
      setInventoryAssets([]);
    }

    const rawDead = localStorage.getItem('nhs_inventory_dead');
    if (rawDead) {
      setInventoryDead(JSON.parse(rawDead));
    }  else {
      setInventoryDead([]);
    }

    // 9. Library Accession Register
    const rawBooks = localStorage.getItem('nhs_library_books');
    if (rawBooks) {
      setLibraryBooks(JSON.parse(rawBooks));
    }  else {
      setLibraryBooks([]);
    }

    // 10. Fee Register
    const rawFeeTxs = localStorage.getItem('nhs_erp_fee_transactions');
    if (rawFeeTxs) {
      setFeeTransactions(JSON.parse(rawFeeTxs));
    }  else {
      setFeeTransactions([]);
    }

    // 11. Attendance Records
    const rawAtt = localStorage.getItem('nhs_erp_attendance_v2');
    if (rawAtt) {
      setAttendanceRecords(JSON.parse(rawAtt));
    }  else {
      setAttendanceRecords([]);
    }

    // 12. Teachers / Staff
    const allUsers = LocalERPDatabase.getUsers();
    setTeachers(allUsers.filter(u => u.role === 'teacher'));

    // Track initial load in audit trail
    logRegisterAction('ACCESS_REGISTERS_DASHBOARD', 'Statutory registers audit panel accessed by ' + user.name);

  }, []);

  // FILTERS APPLICATION
  const getFilteredData = () => {
    let raw: any[] = [];
    switch (activeReg) {
      case 'admission':
        raw = admissions;
        break;
      case 'gr':
        raw = admissions;
        break;
      case 'leaving':
        raw = certificates.filter(c => c.certificateType === 'leaving');
        break;
      case 'bonafide':
        raw = certificates.filter(c => c.certificateType === 'bonafide');
        break;
      case 'scholarship':
        raw = scholarships;
        break;
      case 'concession':
        raw = concessions;
        break;
      case 'examination':
        raw = LocalERPDatabase.getExaminations().map(ex => ({
          id: ex.id,
          examName: ex.name,
          subject: 'General / Combined',
          totalMarks: 100,
          passingMarks: 35,
          termId: ex.term,
          academicYear: ex.academicYear
        }));
        break;
      case 'result':
        // Generate results dynamically from local storage data
        const marks = LocalERPDatabase.getStudentMarkEntries();
        const exams = LocalERPDatabase.getExaminations();
        raw = exams.map(ex => {
          const exMarks = marks.filter(m => m.examId === ex.id);
          const passed = exMarks.filter(m => (m.subjectTotal || 0) >= 35).length;
          const failed = exMarks.length - passed;
          return {
            id: ex.id,
            examName: ex.name,
            subject: 'General / Consolidated',
            totalAppeared: exMarks.length,
            passed,
            failed,
            passRate: exMarks.length ? Math.round((passed / exMarks.length) * 100) : 0,
            academicYear: ex.academicYear || ''
          };
        });
        break;
      case 'staff':
        // Integrated Service Book
        const storedBooks = localStorage.getItem('nhs_erp_service_books');
        if (storedBooks) {
          raw = Object.values(JSON.parse(storedBooks));
        } else {
          raw = teachers.map(t => ({
            id: t.id,
            fullName: t.name,
            shalarthId: t.shalarthId || 'SHALARTH-9872',
            designation: t.designation || 'Teacher',
            appointmentOrder: 'NHS/APT/2018/042',
            joiningDate: '2018-06-15',
            promotionHistory: [{ date: '2022-06-15', from: 'Primary Teacher', to: 'Secondary Assistant' }],
            trainingHistory: [{ title: 'NISHTHA Digital Pedagogy', date: '2023-11-04' }],
            retirementDetails: 'Superannuation in 2045'
          }));
        }
        break;
      case 'inspection':
        raw = inspections;
        break;
      case 'visitor':
        raw = visitors;
        break;
      case 'inventory':
        raw = [...inventoryAssets, ...inventoryDead.map(d => ({ ...d, isDeadStock: true }))];
        break;
      case 'library':
        raw = libraryBooks;
        break;
      case 'fees':
        raw = feeTransactions;
        break;
      case 'attendance':
        raw = attendanceRecords;
        break;
    }

    // Apply General text search
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      raw = raw.filter(item => {
        const studentName = (item.studentName || item.name || item.fullName || item.title || item.inspectingAuthority || '').toLowerCase();
        const gr = (item.grNumber || item.grNo || item.accessionNo || item.code || '').toLowerCase();
        const pen = (item.penNumber || '').toLowerCase();
        return studentName.includes(term) || gr.includes(term) || pen.includes(term);
      });
    }

    // Apply Academic Year filter
    raw = raw.filter(item => {
      const year = item.academicYear || item.date?.substring(0, 4) || '';
      if (selectedYear === 'All') return true;
      return year.includes(selectedYear.substring(0, 4));
    });

    return raw;
  };

  const filteredData = getFilteredData();

  // ACTIONS HANDLERS
  const handleAddInspection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInspection.inspectingAuthority || !newInspection.remarks) {
      triggerToast('Inspecting Authority and Remarks are mandatory.', 'error');
      return;
    }
    const record: InspectionRecord = {
      id: 'insp_' + Date.now(),
      inspectionDate: new Date().toISOString().split('T')[0],
      inspectingAuthority: newInspection.inspectingAuthority,
      department: newInspection.department,
      remarks: newInspection.remarks,
      complianceRequired: newInspection.complianceRequired,
      complianceCompleted: false,
      documentsAttached: newInspection.documentsAttached
    };

    const updated = [...inspections, record];
    localStorage.setItem('nhs_erp_inspections', JSON.stringify(updated));
    setInspections(updated);
    logRegisterAction('ADD_INSPECTION_ENTRY', `Added official inspection visit by ${record.inspectingAuthority}`);
    setShowInspectionModal(false);
    setNewInspection({ inspectingAuthority: '', department: 'Academic Audit', remarks: '', complianceRequired: '', documentsAttached: 'inspection_report.pdf' });
    triggerToast('Inspection entry saved successfully.');
  };

  const toggleCompliance = (id: string) => {
    const updated = inspections.map(i => {
      if (i.id === id) {
        const nextStatus = !i.complianceCompleted;
        logRegisterAction('TOGGLE_INSPECTION_COMPLIANCE', `Updated compliance status to ${nextStatus ? 'COMPLETED' : 'PENDING'} for audit ID: ${id}`);
        return { ...i, complianceCompleted: nextStatus };
      }
      return i;
    });
    localStorage.setItem('nhs_erp_inspections', JSON.stringify(updated));
    setInspections(updated);
    triggerToast('Compliance status updated.');
  };

  const handleApplyCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionForm.newValue || !correctionForm.reason) {
      triggerToast('Corrected value and official reason are mandatory.', 'error');
      return;
    }

    // Update Student admission list with audited changes
    const updatedAdmissions = admissions.map(student => {
      if (student.grNumber === selectedStudentForCorrection.grNumber) {
        const mapField: Record<string, string> = {
          'Name': 'name',
          'Date of Birth': 'dob',
          'Parent Details': 'fatherName',
          'PEN Number': 'penNumber'
        };
        const fieldKey = mapField[correctionForm.fieldCorrected];
        return { ...student, [fieldKey]: correctionForm.newValue };
      }
      return student;
    });

    localStorage.setItem('nhs_erp_clerk_admissions', JSON.stringify(updatedAdmissions));
    setAdmissions(updatedAdmissions);

    // Save correction audit log
    const correctionLog: GRCorrectionRecord = {
      id: 'corr_' + Date.now(),
      grNumber: selectedStudentForCorrection.grNumber,
      studentName: selectedStudentForCorrection.name,
      fieldCorrected: correctionForm.fieldCorrected,
      oldValue: correctionForm.oldValue,
      newValue: correctionForm.newValue,
      correctedBy: user.name + ` (${user.role.toUpperCase()})`,
      correctedAt: new Date().toISOString(),
      reason: correctionForm.reason
    };

    const updatedCorrections = [correctionLog, ...grCorrections];
    localStorage.setItem('nhs_erp_gr_corrections', JSON.stringify(updatedCorrections));
    setGrCorrections(updatedCorrections);

    logRegisterAction('GR_RECORD_CORRECTION', `Corrected ${correctionForm.fieldCorrected} for Student: ${selectedStudentForCorrection.name} (GR: ${selectedStudentForCorrection.grNumber})`);
    setShowCorrectionModal(false);
    setCorrectionForm({ fieldCorrected: 'Name', oldValue: '', newValue: '', reason: '' });
    triggerToast('GR entry corrected and signed in audit log.');
  };

  const handleAddScholarship = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScholarship.grNumber || !newScholarship.name) {
      triggerToast('Student G.R. Number and Scholarship Name are required.', 'error');
      return;
    }
    const student = admissions.find(a => a.grNumber === newScholarship.grNumber);
    if (!student) {
      triggerToast('Invalid Student G.R. Number! No matching student found in registers.', 'error');
      return;
    }

    const schol: ScholarshipRecord = {
      id: 'schol_' + Date.now(),
      name: newScholarship.name,
      studentName: student.name,
      grNumber: student.grNumber,
      classAndDiv: `Class ${student.admissionClassId === 'c3' ? '9' : '10'} - ${student.division}`,
      amount: Number(newScholarship.amount),
      academicYear: newScholarship.academicYear,
      status: newScholarship.status,
      paymentDetails: newScholarship.paymentDetails
    };

    const updated = [schol, ...scholarships];
    localStorage.setItem('nhs_erp_scholarships', JSON.stringify(updated));
    setScholarships(updated);
    logRegisterAction('ADD_SCHOLARSHIP_REGISTRY', `Logged scholarship eligibility for ${student.name} (GR: ${student.grNumber})`);
    setShowScholarshipModal(false);
    setNewScholarship({ name: 'Pre-Matric Minority Scholarship', grNumber: '', amount: '4000', academicYear: '', status: 'Pending', paymentDetails: 'Pending Direct Benefit Transfer' });
    triggerToast('Scholarship registered.');
  };

  const updateScholarshipStatus = (id: string, status: 'Approved' | 'Disbursed') => {
    const updated = scholarships.map(s => {
      if (s.id === id) {
        logRegisterAction('UPDATE_SCHOLARSHIP_STATUS', `Updated scholarship status of ${s.studentName} to ${status}`);
        return { ...s, status };
      }
      return s;
    });
    localStorage.setItem('nhs_erp_scholarships', JSON.stringify(updated));
    setScholarships(updated);
    triggerToast('Scholarship status updated.');
  };

  // PRINT CURRENT REGISTER TRIGGER
  const triggerPrintRegister = () => {
    logRegisterAction('PRINT_OFFICIAL_REGISTER', `Generated print layout for ${activeReg.toUpperCase()} Register [Format: ${printFormat}, Style: ${printStyle}]`);
    printSectionById('printable-register-area', `${activeReg.toUpperCase()} Register`);
  };

  // MULTILINGUAL STRINGS
  const translations = {
    en: {
      title: 'Statutory Registers & Govt. Compliance',
      subtitle: 'Official digital record room and verified regulatory logs for the active school.',
      searchPlace: 'Search student, G.R., PEN...',
      btnPrint: 'Print Verified Register',
      addInspection: 'Add Inspection Entry',
      correctGR: 'Correct G.R. Ledger',
      newScholarship: 'Add Scholarship Record',
      tabAdmission: 'Admission Register',
      tabGR: 'General Register (GR)',
      tabLC: 'Leaving Cert (LC) Register',
      tabBonafide: 'Bonafide Certificate Register',
      tabScholarship: 'Scholarship Register',
      tabConcession: 'Concession / Freeship',
      tabExam: 'Examination Register',
      tabResult: 'Result Register',
      tabStaff: 'Staff Service Book',
      tabInspection: 'Inspection Register',
      tabVisitor: 'Visitor Ledger',
      tabInventory: 'Stock & Dead Stock',
      tabLibrary: 'Library Accession',
      tabFees: 'Fee Ledger',
      tabAttendance: 'Attendance Master'
    },
    hi: {
      title: 'वैधानिक रजिस्टर और सरकारी अनुपालन',
      subtitle: 'राष्ट्रीय हाई स्कूल, तलोदा के आधिकारिक डिजिटल रिकॉर्ड रूम और सत्यापित नियामक लॉग।',
      searchPlace: 'छात्र, जी.आर., पेन खोजें...',
      btnPrint: 'सत्यापित रजिस्टर प्रिंट करें',
      addInspection: 'निरीक्षण प्रविष्टि जोड़ें',
      correctGR: 'जी.आर. बही दुरुस्त करें',
      newScholarship: 'छात्रवृत्ति रिकॉर्ड जोड़ें',
      tabAdmission: 'प्रवेश रजिस्टर',
      tabGR: 'सामान्य रजिस्टर (GR)',
      tabLC: 'स्थानांतरण प्रमाण पत्र (LC) रजिस्टर',
      tabBonafide: 'बोनाफाइड प्रमाणपत्र रजिस्टर',
      tabScholarship: 'छात्रवृत्ति रजिस्टर',
      tabConcession: 'शुल्क रियायत रजिस्टर',
      tabExam: 'परीक्षा रजिस्टर',
      tabResult: 'परिणाम रजिस्टर',
      tabStaff: 'कर्मचारी सेवा बही',
      tabInspection: 'निरीक्षण रजिस्टर',
      tabVisitor: 'आगंतुक रजिस्टर',
      tabInventory: 'स्टॉक एवं डेड स्टॉक',
      tabLibrary: 'पुस्तकालय अवाप्ति',
      tabFees: 'शुल्क बही',
      tabAttendance: 'मास्टर उपस्थिति'
    },
    ur: {
      title: 'سرکاری رجسٹرز اور قانونی تعمیل',
      subtitle: 'نیشنل ہائی اسکول، تلوڈا کا آفیشل ڈیجیٹل ریکارڈ روم اور تصدیق شدہ ریگولیٹری لاگز۔',
      searchPlace: 'طالب علم، G.R، یا PEN تلاش کریں...',
      btnPrint: 'رجسٹر پرنٹ کریں',
      addInspection: 'معائنہ لاگ شامل کریں',
      correctGR: 'جنرل رجسٹر درست کریں',
      newScholarship: 'اسکالرشپ ریکارڈ شامل کریں',
      tabAdmission: 'رجسٹر داخلہ',
      tabGR: 'جنرل رجسٹر (G.R)',
      tabLC: 'رجسٹر سرٹیفکیٹ اخراج (LC)',
      tabBonafide: 'رجسٹر بونافائیڈ سرٹیفکیٹ',
      tabScholarship: 'اسکالرشپ رجسٹر',
      tabConcession: 'رعایت فیس رجسٹر',
      tabExam: 'رجسٹر امتحانات',
      tabResult: 'رجسٹر نتائج',
      tabStaff: 'سروس رجسٹر اسٹاف',
      tabInspection: 'رجسٹر معائنہ',
      tabVisitor: 'آگنتک رجسٹر (ملاقات)',
      tabInventory: 'ڈیڈ اسٹاک اور انوینٹری',
      tabLibrary: 'رجسٹر لائبریری کتابیں',
      tabFees: 'رجسٹر فیس وصولی',
      tabAttendance: 'حاضری رجسٹر'
    }
  };

  const t = translations[lang] || translations.en;
  const isRTL = lang === 'ur';
  const activeRegisterLabel: Record<StatutoryRegisterId, string> = {
    admission: t.tabAdmission,
    gr: t.tabGR,
    leaving: t.tabLC,
    bonafide: t.tabBonafide,
    scholarship: t.tabScholarship,
    concession: t.tabConcession,
    examination: t.tabExam,
    result: t.tabResult,
    staff: t.tabStaff,
    inspection: t.tabInspection,
    visitor: t.tabVisitor,
    inventory: t.tabInventory,
    library: t.tabLibrary,
    fees: t.tabFees,
    attendance: t.tabAttendance
  };

  return (
    <div id="statutory_registers_root" className={`p-1 md:p-4 text-slate-800 ${isRTL ? 'rtl font-serif' : 'ltr font-sans'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      
      {/* SCOPED MEDIA PRINT STYLE DIRECTIVE */}
      <style>{`
        @media print {
          /* Hide whole site frame except the printable registry block */
          body * {
            visibility: hidden;
            background-color: white !important;
            color: black !important;
            box-shadow: none !important;
          }
          #printable-register-area, #printable-register-area * {
            visibility: visible;
          }
          #printable-register-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          /* Official stamp borders and styling forced for printing registers */
          table {
            border-collapse: collapse !important;
            width: 100% !important;
            margin-top: 15px !important;
          }
          th, td {
            border: 1px solid #111111 !important;
            padding: 8px 6px !important;
            font-size: 11px !important;
            text-align: ${isRTL ? 'right' : 'left'} !important;
          }
          th {
            background-color: #f1f1f1 !important;
            font-weight: bold !important;
          }
        }
      `}</style>

      {/* Global Toast Alert */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl transition-all duration-300 transform translate-y-0 ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
        }`}>
          <CheckCircle className="w-5 h-5" />
          <span className="text-sm font-semibold">{toast.msg}</span>
        </div>
      )}

      {/* 1. Header Hero Panel */}
      <div className="bg-gradient-to-l from-slate-900 via-slate-800 to-indigo-950 text-white p-6 rounded-2xl border border-indigo-900 shadow-md mb-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10">
          <Shield className="w-64 h-64" />
        </div>
        <div className="relative z-10 text-left">
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-amber-500 text-slate-950 font-bold text-xs uppercase tracking-widest rounded-full">
              Government Regulatory Room
            </span>
            <span className="px-3 py-1 bg-indigo-600 text-white font-mono text-xs rounded-full">
              Audit Status: Verified
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            {focusedMode ? focusedTitle : t.title}
          </h1>
          <p className="text-slate-300 text-xs md:text-sm mt-2 max-w-3xl">
            {t.subtitle}
          </p>
        </div>
      </div>

      {/* 2. Controls & Search Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between no-print">
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={t.searchPlace}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto items-center justify-end">
          
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 border border-slate-200 rounded-lg">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs font-semibold text-slate-500">Filters:</span>
          </div>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="text-xs p-2 border border-slate-200 rounded-lg focus:ring-1 bg-white"
          >
            <option value="All">All Years</option>
            {LocalERPDatabase.getAcademicSetup()?.academicYears?.map((year: any) => (
              <option key={year.year} value={year.year}>AY {year.year}</option>
            ))}
          </select>

          {/* Conditional Action Buttons based on active register */}
          {activeReg === 'inspection' && (isHeadmaster || isClerk) && (
            <button
              onClick={() => setShowInspectionModal(true)}
              className="flex items-center gap-1.5 bg-indigo-600 text-white text-xs px-3.5 py-2 rounded-lg font-bold shadow-sm hover:bg-indigo-700 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addInspection}</span>
            </button>
          )}

          {activeReg === 'scholarship' && (isHeadmaster || isClerk) && (
            <button
              onClick={() => setShowScholarshipModal(true)}
              className="flex items-center gap-1.5 bg-indigo-600 text-white text-xs px-3.5 py-2 rounded-lg font-bold shadow-sm hover:bg-indigo-700 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t.newScholarship}</span>
            </button>
          )}

          {/* Central Print Dispatcher */}
          <button
            onClick={triggerPrintRegister}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-2 rounded-lg font-bold shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{t.btnPrint}</span>
          </button>
        </div>
      </div>

      {/* 3. Main Workspace Grid */}
      <div className={`grid grid-cols-1 gap-6 ${focusedMode ? '' : 'lg:grid-cols-4'}`}>
        
        {/* Left Hand: Registers Selection Sidebar */}
        {!focusedMode && <div className="lg:col-span-1 bg-white p-4 rounded-xl border border-slate-200 shadow-sm h-fit no-print">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 text-left">
            Official Registers
          </h2>
          <div className="flex flex-col gap-1 text-left">
            {[
              { id: 'admission', label: t.tabAdmission, icon: BookOpen, color: 'text-blue-500' },
              { id: 'gr', label: t.tabGR, icon: Shield, color: 'text-amber-500' },
              { id: 'leaving', label: t.tabLC, icon: FileText, color: 'text-rose-500' },
              { id: 'bonafide', label: t.tabBonafide, icon: FileText, color: 'text-indigo-500' },
              { id: 'scholarship', label: t.tabScholarship, icon: Award, color: 'text-teal-500' },
              { id: 'concession', label: t.tabConcession, icon: DollarSign, color: 'text-emerald-500' },
              { id: 'examination', label: t.tabExam, icon: ClipboardList, color: 'text-purple-500' },
              { id: 'result', label: t.tabResult, icon: BadgeCheck, color: 'text-sky-500' },
              { id: 'staff', label: t.tabStaff, icon: Users, color: 'text-violet-500' },
              { id: 'inspection', label: t.tabInspection, icon: ShieldAlert, color: 'text-orange-500' },
              { id: 'visitor', label: t.tabVisitor, icon: Clock, color: 'text-gray-500' },
              { id: 'inventory', label: t.tabInventory, icon: Package, color: 'text-lime-600' },
              { id: 'library', label: t.tabLibrary, icon: BookMarked, color: 'text-pink-500' },
              { id: 'fees', label: t.tabFees, icon: FileSpreadsheet, color: 'text-green-600' },
              { id: 'attendance', label: t.tabAttendance, icon: UserCheck, color: 'text-cyan-600' }
            ].map((reg) => {
              const Icon = reg.icon;
              const isSelected = activeReg === reg.id;
              return (
                <button
                  key={reg.id}
                  onClick={() => {
                    setActiveReg(reg.id as any);
                    logRegisterAction('VIEW_REGISTER', `Opened ${reg.label} on-screen ledger`);
                  }}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-slate-900 text-white shadow-sm' 
                      : 'bg-transparent text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : reg.color}`} />
                  <span>{reg.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Print Config */}
          <div className="mt-5 pt-4 border-t border-slate-100 text-left">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
              Print Options (A4/A3)
            </h3>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                onClick={() => setPrintFormat('A4')}
                className={`py-1 text-[10px] font-bold border rounded-md ${
                  printFormat === 'A4' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white text-slate-500'
                }`}
              >
                A4 Portrait
              </button>
              <button
                onClick={() => setPrintFormat('A3')}
                className={`py-1 text-[10px] font-bold border rounded-md ${
                  printFormat === 'A3' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white text-slate-500'
                }`}
              >
                A3 Landscape
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPrintStyle('color')}
                className={`py-1 text-[10px] font-bold border rounded-md ${
                  printStyle === 'color' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white text-slate-500'
                }`}
              >
                Colour Ink
              </button>
              <button
                onClick={() => setPrintStyle('mono')}
                className={`py-1 text-[10px] font-bold border rounded-md ${
                  printStyle === 'mono' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white text-slate-500'
                }`}
              >
                B&W / Mono
              </button>
            </div>
          </div>
        </div>}

        {/* Right Hand: Central Government-Styled Registry Notebook */}
        <div className={focusedMode ? 'w-full' : 'lg:col-span-3'}>
          <div id="printable-register-area" className="bg-amber-50/20 p-6 md:p-8 rounded-2xl border border-amber-200/60 shadow-inner text-left relative min-h-[600px]">
            
            {/* Configured school identity */}
            <div className="border-b-4 border-double border-slate-800 pb-4 mb-6 flex flex-col items-center text-center">
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-wider">
                {LocalERPDatabase.getAcademicSetup()?.schoolProfile?.schoolName || 'School'}
              </h1>
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-1">
                {LocalERPDatabase.getAcademicSetup()?.schoolProfile?.address || 'School address not configured'} | School Code: {LocalERPDatabase.getAcademicSetup()?.schoolProfile?.udiseCode || 'Not configured'}
              </p>
              <div className="flex gap-4 mt-2 text-[9px] font-mono font-bold text-slate-500">
                <span>ESTD: 1965</span>
                <span>•</span>
                <span>GOVERNMENT STATUTORY LEDGER REGISTER</span>
                <span>•</span>
                <span>A.Y. {selectedYear}</span>
              </div>
              <div className="w-16 h-16 rounded-full border-4 border-indigo-900/40 flex items-center justify-center font-extrabold text-[8px] text-indigo-900 text-center uppercase p-1 my-3 bg-white/60">
                OFFICIAL SEAL
              </div>
              <h2 className="text-sm font-extrabold uppercase bg-slate-900 text-white px-4 py-1.5 rounded tracking-wide">
                {activeRegisterLabel[activeReg]}
              </h2>
            </div>

            {/* Sub-tab controls inside specific registers */}
            {activeReg === 'fees' && (
              <div className="flex gap-2 mb-4 bg-white p-1 rounded-lg border border-slate-200 w-fit no-print">
                {['daily', 'monthly', 'annual'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setFeeSubTab(tab as any)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md capitalize cursor-pointer ${
                      feeSubTab === tab ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {tab} Ledger View
                  </button>
                ))}
              </div>
            )}

            {activeReg === 'attendance' && (
              <div className="flex gap-2 mb-4 bg-white p-1 rounded-lg border border-slate-200 w-fit no-print">
                <button
                  onClick={() => setAttendanceSubTab('student')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md capitalize cursor-pointer ${
                    attendanceSubTab === 'student' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Student Attendance Matrix
                </button>
                <button
                  onClick={() => setAttendanceSubTab('teacher')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md capitalize cursor-pointer ${
                    attendanceSubTab === 'teacher' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Teacher Log Register
                </button>
              </div>
            )}

            {/* 4. Ledger Table Wrapper */}
            <div className="overflow-x-auto border border-slate-300 rounded-lg bg-white shadow-sm">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                    
                    {/* ADMISSION HEADERS */}
                    {activeReg === 'admission' && (
                      <>
                        <th className="p-3">Adm No.</th>
                        <th>G.R. No.</th>
                        <th>PEN Number</th>
                        <th>Student Name</th>
                        <th>D.O.B</th>
                        <th>Adm Date</th>
                        <th>Previous School</th>
                        <th>Class Admitted</th>
                        <th>Category</th>
                        <th>Status</th>
                      </>
                    )}

                    {/* GENERAL REGISTER HEADERS */}
                    {activeReg === 'gr' && (
                      <>
                        <th className="p-3">G.R. No.</th>
                        <th>Student Name</th>
                        <th>Parent Details</th>
                        <th>Date of Birth</th>
                        <th>Adm Date</th>
                        <th>Promotion Track</th>
                        <th>Leaving History</th>
                        <th className="no-print">Corrections Action</th>
                      </>
                    )}

                    {/* LEAVING CERTIFICATE REGISTER HEADERS */}
                    {activeReg === 'leaving' && (
                      <>
                        <th className="p-3">LC Number</th>
                        <th>G.R. No.</th>
                        <th>Student Name</th>
                        <th>Issue Date</th>
                        <th>Reason for Leaving</th>
                        <th>Official Signatures</th>
                      </>
                    )}

                    {/* BONAFIDE REGISTER HEADERS */}
                    {activeReg === 'bonafide' && (
                      <>
                        <th className="p-3">Cert. No</th>
                        <th>G.R. No.</th>
                        <th>Student Name</th>
                        <th>Issue Date</th>
                        <th>Purpose of Issuance</th>
                        <th>Approved By</th>
                      </>
                    )}

                    {/* SCHOLARSHIP HEADERS */}
                    {activeReg === 'scholarship' && (
                      <>
                        <th className="p-3">Scholarship Name</th>
                        <th>Student Name</th>
                        <th>G.R. No.</th>
                        <th>Amount (INR)</th>
                        <th>Academic Year</th>
                        <th>Disbursement Status</th>
                        <th>Payment Receipt Info</th>
                        <th className="no-print">Actions</th>
                      </>
                    )}

                    {/* FREE SHIP / CONCESSION HEADERS */}
                    {activeReg === 'concession' && (
                      <>
                        <th className="p-3">Student Name</th>
                        <th>G.R. No.</th>
                        <th>Concession Type</th>
                        <th>Percentage (%)</th>
                        <th>Concession Saved</th>
                        <th>Status</th>
                        <th>Academic Year</th>
                      </>
                    )}

                    {/* EXAMINATION HEADERS */}
                    {activeReg === 'examination' && (
                      <>
                        <th className="p-3">Exam Name</th>
                        <th>Subject Name</th>
                        <th>Total Marks</th>
                        <th>Passing Marks</th>
                        <th>Term</th>
                        <th>Academic Year</th>
                      </>
                    )}

                    {/* RESULT HEADERS */}
                    {activeReg === 'result' && (
                      <>
                        <th className="p-3">Exam Module</th>
                        <th>Subject Name</th>
                        <th>Total Appeared</th>
                        <th className="text-emerald-700">Total Passed</th>
                        <th className="text-rose-700">Total Failed</th>
                        <th>Pass Rate %</th>
                        <th>Academic Year</th>
                      </>
                    )}

                    {/* STAFF SERVICE REGISTER HEADERS */}
                    {activeReg === 'staff' && (
                      <>
                        <th className="p-3">Emp ID</th>
                        <th>Full Name</th>
                        <th>Designation</th>
                        <th>Joining Date</th>
                        <th>Qualification</th>
                        <th>Promotion Order No</th>
                        <th>Retirement Date</th>
                      </>
                    )}

                    {/* INSPECTION REGISTER HEADERS */}
                    {activeReg === 'inspection' && (
                      <>
                        <th className="p-3">Inspection Date</th>
                        <th>Authority</th>
                        <th>Department</th>
                        <th>Remarks / Findings</th>
                        <th>Compliance Needed</th>
                        <th>Completed Status</th>
                      </>
                    )}

                    {/* VISITOR HEADERS */}
                    {activeReg === 'visitor' && (
                      <>
                        <th className="p-3">Visitor Name</th>
                        <th>Mobile</th>
                        <th>Purpose of Visit</th>
                        <th>Meet Person</th>
                        <th>Department</th>
                        <th>Entry Time</th>
                        <th>Exit Time</th>
                      </>
                    )}

                    {/* STOCK / DEAD STOCK HEADERS */}
                    {activeReg === 'inventory' && (
                      <>
                        <th className="p-3">Item Code</th>
                        <th>Asset Name</th>
                        <th>Category</th>
                        <th>Qty / Price</th>
                        <th>Disposed Date</th>
                        <th>Register Classification</th>
                        <th>Reason for Write-off</th>
                      </>
                    )}

                    {/* LIBRARY ACCESSION REGISTER */}
                    {activeReg === 'library' && (
                      <>
                        <th className="p-3">Accession No</th>
                        <th>Book Title</th>
                        <th>Author</th>
                        <th>Category</th>
                        <th>Book Cost</th>
                        <th>Cabinet Shelf No.</th>
                      </>
                    )}

                    {/* FEE REGISTER HEADERS */}
                    {activeReg === 'fees' && (
                      <>
                        <th className="p-3">Receipt No</th>
                        <th>G.R. Number</th>
                        <th>Student Name</th>
                        <th>Payment Date</th>
                        <th>Fee Head</th>
                        <th>Payment Mode</th>
                        <th>Amount Paid (INR)</th>
                      </>
                    )}

                    {/* ATTENDANCE HEADERS */}
                    {activeReg === 'attendance' && (
                      <>
                        <th className="p-3">Date</th>
                        <th>Student Name</th>
                        <th>G.R. Number</th>
                        <th>Register Type</th>
                        <th>Roll Call Attendance</th>
                      </>
                    )}

                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400 font-mono">
                        --- NO REGISTER ENTRIES RECORDED FOR SELECTED AY ---
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((item, idx) => {
                      return (
                        <tr key={item.id || idx} className="hover:bg-amber-50/10 font-mono text-[11px] text-slate-700">
                          
                          {/* ADMISSION BODY */}
                          {activeReg === 'admission' && (
                            <>
                              <td className="p-3 font-bold text-indigo-700">{item.admissionNumber}</td>
                              <td className="font-bold">{item.grNumber}</td>
                              <td>{item.penNumber || 'PEN55210928'}</td>
                              <td className="font-sans font-bold text-slate-900">{item.name}</td>
                              <td>{item.dob}</td>
                              <td>{item.admissionDate}</td>
                              <td className="font-sans max-w-xs truncate">{item.lastSchool || '—'}</td>
                              <td className="font-sans">Class {item.admissionClassId === 'c3' ? '9' : '10'} ({item.division})</td>
                              <td>{item.category || 'OBC'} ({item.religion || 'Hindu'})</td>
                              <td>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  {item.status || 'Active'}
                                </span>
                              </td>
                            </>
                          )}

                          {/* GENERAL REGISTER (GR) BODY */}
                          {activeReg === 'gr' && (
                            <>
                              <td className="p-3 font-bold text-indigo-700">{item.grNumber}</td>
                              <td className="font-sans font-bold text-slate-900">{item.name}</td>
                              <td className="font-sans">
                                <div>Father: {item.fatherName}</div>
                                <div className="text-[10px] text-slate-500">Mother: {item.motherName}</div>
                              </td>
                              <td>
                                <div>{item.dob}</div>
                                <div className="text-[9px] text-slate-400 max-w-[150px] leading-tight">{item.dobInWords || '—'}</div>
                              </td>
                              <td>{item.admissionDate}</td>
                              <td className="font-sans">
                                <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-bold">
                                  Class {item.admissionClassId || '-'} ({item.academicYear || 'Academic year not configured'})
                                </span>
                              </td>
                              <td className="font-sans text-[10px] text-slate-500">
                                {item.grNumber === 'GR2026101' ? 'LC issued on graduation' : 'N/A'}
                              </td>
                              <td className="no-print">
                                <button
                                  onClick={() => {
                                    setSelectedStudentForCorrection(item);
                                    setCorrectionForm({ fieldCorrected: 'Name', oldValue: item.name, newValue: '', reason: '' });
                                    setShowCorrectionModal(true);
                                  }}
                                  className="flex items-center gap-1 text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2 py-1 rounded border border-indigo-200 cursor-pointer"
                                >
                                  <Edit className="w-3 h-3" />
                                  <span>Correct</span>
                                </button>
                              </td>
                            </>
                          )}

                          {/* LEAVING CERTIFICATE BODY */}
                          {activeReg === 'leaving' && (
                            <>
                              <td className="p-3 font-bold text-red-600">{item.certificateNumber}</td>
                              <td className="font-bold">{item.grNumber}</td>
                              <td className="font-sans font-bold text-slate-900">{item.studentName}</td>
                              <td>{item.issueDate}</td>
                              <td className="font-sans">{item.purpose}</td>
                              <td className="font-sans text-slate-500 text-[10px]">
                                <div>Prepared: {item.preparedBy}</div>
                                <div>Approved: {item.approvedBy}</div>
                              </td>
                            </>
                          )}

                          {/* BONAFIDE REGISTER BODY */}
                          {activeReg === 'bonafide' && (
                            <>
                              <td className="p-3 font-bold text-indigo-600">{item.certificateNumber}</td>
                              <td className="font-bold">{item.grNumber}</td>
                              <td className="font-sans font-bold text-slate-900">{item.studentName}</td>
                              <td>{item.issueDate}</td>
                              <td className="font-sans">{item.purpose}</td>
                              <td className="font-sans text-slate-500">{item.approvedBy}</td>
                            </>
                          )}

                          {/* SCHOLARSHIP REGISTER BODY */}
                          {activeReg === 'scholarship' && (
                            <>
                              <td className="p-3 font-sans font-bold text-indigo-900">{item.name}</td>
                              <td className="font-sans font-bold">{item.studentName}</td>
                              <td className="font-bold">{item.grNumber}</td>
                              <td className="font-bold text-slate-900">₹{item.amount}</td>
                              <td>{item.academicYear}</td>
                              <td>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  item.status === 'Disbursed' ? 'bg-emerald-100 text-emerald-800' :
                                  item.status === 'Approved' ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {item.status}
                                </span>
                              </td>
                              <td className="text-[10px] text-slate-500 font-sans">{item.paymentDetails}</td>
                              <td className="no-print">
                                {item.status === 'Pending' && (isHeadmaster || isClerk) && (
                                  <button
                                    onClick={() => updateScholarshipStatus(item.id, 'Approved')}
                                    className="px-2 py-0.5 text-[9px] font-bold bg-indigo-600 text-white rounded hover:bg-indigo-700 cursor-pointer"
                                  >
                                    Approve
                                  </button>
                                )}
                                {item.status === 'Approved' && (isHeadmaster || isClerk) && (
                                  <button
                                    onClick={() => updateScholarshipStatus(item.id, 'Disbursed')}
                                    className="px-2 py-0.5 text-[9px] font-bold bg-emerald-600 text-white rounded hover:bg-emerald-700 cursor-pointer"
                                  >
                                    Disburse
                                  </button>
                                )}
                              </td>
                            </>
                          )}

                          {/* CONCESSION REGISTER BODY */}
                          {activeReg === 'concession' && (
                            <>
                              <td className="p-3 font-sans font-bold text-slate-900">{item.studentName}</td>
                              <td className="font-bold">{item.grNumber}</td>
                              <td className="font-sans text-slate-600">{item.concessionType}</td>
                              <td className="font-bold">{item.percentage}%</td>
                              <td className="font-bold text-emerald-600">₹{item.amount}</td>
                              <td>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  {item.status}
                                </span>
                              </td>
                              <td>{item.academicYear}</td>
                            </>
                          )}

                          {/* EXAMINATION REGISTER BODY */}
                          {activeReg === 'examination' && (
                            <>
                              <td className="p-3 font-sans font-bold text-slate-900">{item.examName}</td>
                              <td className="font-sans">{item.subject}</td>
                              <td className="font-bold">{item.totalMarks || 100}</td>
                              <td className="font-bold text-red-600">{item.passingMarks || 35}</td>
                              <td className="font-sans capitalize">{item.termId || 'Term-1'}</td>
                              <td>{item.academicYear || 'Academic year not configured'}</td>
                            </>
                          )}

                          {/* RESULT REGISTER BODY */}
                          {activeReg === 'result' && (
                            <>
                              <td className="p-3 font-sans font-bold text-indigo-950">{item.examName}</td>
                              <td className="font-sans font-bold">{item.subject}</td>
                              <td className="font-bold text-slate-800">{item.totalAppeared}</td>
                              <td className="font-bold text-emerald-600">{item.passed}</td>
                              <td className="font-bold text-rose-600">{item.failed}</td>
                              <td className="font-bold text-blue-700">{item.passRate}%</td>
                              <td>{item.academicYear}</td>
                            </>
                          )}

                          {/* STAFF SERVICE REGISTER BODY */}
                          {activeReg === 'staff' && (
                            <>
                              <td className="p-3 font-bold text-slate-800">{item.shalarthId}</td>
                              <td className="font-sans font-bold text-slate-900">{item.fullName}</td>
                              <td className="font-sans text-indigo-900 font-bold">{item.designation}</td>
                              <td>{item.joiningDate}</td>
                              <td className="font-sans text-[10px]">{item.qualification || 'B.Ed, MA History'}</td>
                              <td className="font-mono text-[10px] text-slate-500">
                                {item.appointmentOrder || 'NHS/APT/2015/001'}
                              </td>
                              <td>{item.retirementDetails || 'Superannuation due 2040'}</td>
                            </>
                          )}

                          {/* INSPECTION REGISTER BODY */}
                          {activeReg === 'inspection' && (
                            <>
                              <td className="p-3 font-bold">{item.inspectionDate}</td>
                              <td className="font-sans font-bold text-slate-900 max-w-xs">{item.inspectingAuthority}</td>
                              <td className="font-sans text-indigo-800 font-bold">{item.department}</td>
                              <td className="font-sans text-[11px] leading-tight text-slate-600 max-w-xs">{item.remarks}</td>
                              <td className="font-sans text-[11px] leading-tight text-amber-800 max-w-xs">{item.complianceRequired}</td>
                              <td className="no-print">
                                <button
                                  onClick={() => toggleCompliance(item.id)}
                                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                                    item.complianceCompleted 
                                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                                      : 'bg-rose-100 text-rose-800 border-rose-300'
                                  }`}
                                >
                                  {item.complianceCompleted ? <Check className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                                  <span>{item.complianceCompleted ? 'Compliance Completed' : 'Compliance Pending'}</span>
                                </button>
                              </td>
                            </>
                          )}

                          {/* VISITOR REGISTER BODY */}
                          {activeReg === 'visitor' && (
                            <>
                              <td className="p-3 font-sans font-bold text-slate-900">{item.name}</td>
                              <td>{item.mobile}</td>
                              <td className="font-sans text-slate-600">{item.purpose}</td>
                              <td className="font-sans">{item.meetPerson}</td>
                              <td className="font-sans text-indigo-700">{item.department}</td>
                              <td>{item.entryTime}</td>
                              <td>{item.exitTime || 'Awaiting Checkout'}</td>
                            </>
                          )}

                          {/* STOCK / DEAD STOCK REGISTER BODY */}
                          {activeReg === 'inventory' && (
                            <>
                              <td className="p-3 font-bold text-amber-800">{item.code}</td>
                              <td className="font-sans font-bold text-slate-950">{item.name}</td>
                              <td className="font-sans text-slate-600">{item.category}</td>
                              <td className="font-bold">₹{item.price || item.value}</td>
                              <td>{item.disposedDate || 'Active Operational'}</td>
                              <td>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  item.isDeadStock ? 'bg-rose-100 text-rose-800' : 'bg-teal-100 text-teal-800'
                                }`}>
                                  {item.isDeadStock ? 'DEAD STOCK REGISTER' : 'ACTIVE LIVE ASSETS'}
                                </span>
                              </td>
                              <td className="font-sans text-[10px] text-slate-500 italic max-w-xs truncate">{item.reason || 'N/A'}</td>
                            </>
                          )}

                          {/* LIBRARY ACCESSION REGISTER BODY */}
                          {activeReg === 'library' && (
                            <>
                              <td className="p-3 font-bold text-indigo-800">{item.accessionNo}</td>
                              <td className="font-sans font-bold text-slate-950">{item.title}</td>
                              <td className="font-sans">{item.author}</td>
                              <td className="font-sans text-slate-500">{item.category}</td>
                              <td className="font-bold">₹{item.cost}</td>
                              <td>Shelf cabinet {item.rackNo}</td>
                            </>
                          )}

                          {/* FEE REGISTER BODY */}
                          {activeReg === 'fees' && (
                            <>
                              <td className="p-3 font-bold text-emerald-800">{item.invoiceNo || 'INV-2026-908'}</td>
                              <td className="font-bold">{item.grNumber}</td>
                              <td className="font-sans font-bold text-slate-900">{item.studentName}</td>
                              <td>{item.date}</td>
                              <td className="font-sans text-slate-600">{item.headName}</td>
                              <td>
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 font-bold border border-slate-200">
                                  {item.payMode}
                                </span>
                              </td>
                              <td className="font-bold text-emerald-600">₹{item.amount}</td>
                            </>
                          )}

                          {/* ATTENDANCE REGISTER BODY */}
                          {activeReg === 'attendance' && (
                            <>
                              <td className="p-3 font-bold">{item.date}</td>
                              <td className="font-sans font-bold text-slate-900">{item.studentName}</td>
                              <td className="font-bold">{item.grNumber}</td>
                              <td className="font-sans capitalize">{item.type} Register</td>
                              <td>
                                <span className={`px-2 py-0.5 rounded font-bold ${
                                  item.status === 'P' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {item.status === 'P' ? 'PRESENT' : 'ABSENT'}
                                </span>
                              </td>
                            </>
                          )}

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* A4/A3 Government Stamp Sign-off and Seals */}
            <div className="mt-12 pt-8 border-t-2 border-dashed border-slate-400 grid grid-cols-1 md:grid-cols-3 gap-6 text-center text-xs">
              <div>
                <div className="h-16 flex items-end justify-center">
                  <span className="font-bold font-serif italic text-slate-400">Authorised Clerk</span>
                </div>
                <div className="border-t border-slate-600 pt-2 font-bold uppercase tracking-wider text-slate-700">
                  Senior Clerk Sign & Seal
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Active School</div>
              </div>
              <div className="flex flex-col items-center justify-center">
                <div className="w-20 h-20 rounded-full border-4 border-dashed border-indigo-900/30 flex items-center justify-center font-extrabold text-[9px] text-slate-400 uppercase tracking-widest bg-white/40">
                  CENTRAL RECORD ROOM
                </div>
                <span className="text-[10px] text-slate-400 mt-2 font-mono">Ledger Lock: ENABLED</span>
              </div>
              <div>
                <div className="h-16 flex items-end justify-center">
                  <span className="font-bold font-serif italic text-slate-400">Authorised Headmaster</span>
                </div>
                <div className="border-t border-slate-600 pt-2 font-bold uppercase tracking-wider text-slate-700">
                  Headmaster Final Sign-off
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Active School</div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* 5. Government Audit Trail Section */}
      <div className="mt-8 bg-white rounded-xl border border-slate-200 p-6 shadow-sm text-left no-print">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
          <ShieldAlert className="w-5 h-5 text-indigo-600" />
          <div>
            <h2 className="text-sm font-bold text-slate-800">Sequential Government Auditor Track</h2>
            <p className="text-xs text-slate-500 mt-0.5">Every view, edit, print configuration, or certificate logged automatically.</p>
          </div>
        </div>
        
        {/* GR Corrections ledger display */}
        {grCorrections.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">
              Recent G.R. Corrections & Legal Audit Trail (Locked)
            </h3>
            <div className="space-y-2">
              {grCorrections.map((corr) => (
                <div key={corr.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs flex flex-col md:flex-row justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-indigo-700">{corr.grNumber}</span>
                      <span className="font-sans font-bold text-slate-900">{corr.studentName}</span>
                      <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
                        Corrected Field: {corr.fieldCorrected}
                      </span>
                    </div>
                    <div className="text-slate-600">
                      Changed from <strong className="text-slate-900 font-mono">"{corr.oldValue}"</strong> to <strong className="text-slate-900 font-mono">"{corr.newValue}"</strong>
                    </div>
                    <div className="text-[11px] text-slate-500 font-sans italic">Reason: {corr.reason}</div>
                  </div>
                  <div className="text-right text-[10px] text-slate-500 self-end md:self-auto font-mono">
                    <div>Officer: {corr.correctedBy}</div>
                    <div>Date: {new Date(corr.correctedAt).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* MODAL 1: ADD INSPECTION VISIT */}
      {showInspectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 animate-fade-in no-print">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden text-left">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider">Log Official School Inspection Visit</h3>
              <button onClick={() => setShowInspectionModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddInspection} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Inspecting Officer / Authority Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Block Education Officer, local education office"
                  value={newInspection.inspectingAuthority}
                  onChange={(e) => setNewInspection({...newInspection, inspectingAuthority: e.target.value})}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Auditing Department</label>
                  <select
                    value={newInspection.department}
                    onChange={(e) => setNewInspection({...newInspection, department: e.target.value})}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg outline-none"
                  >
                    <option value="Academic Audit">Academic Audit</option>
                    <option value="Financial & Fee Audit">Financial Audit</option>
                    <option value="Infrastructure Safety">Infrastructure Safety</option>
                    <option value="Mid-Day Meal Board">Mid-Day Meal Board</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Document Uploaded</label>
                  <input
                    type="text"
                    value={newInspection.documentsAttached}
                    onChange={(e) => setNewInspection({...newInspection, documentsAttached: e.target.value})}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-slate-50 cursor-not-allowed font-mono"
                    readOnly
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Inspection Remarks & Observation *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Summarize key remarks entered in physical inspection register..."
                  value={newInspection.remarks}
                  onChange={(e) => setNewInspection({...newInspection, remarks: e.target.value})}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Specific Compliance Required</label>
                <input
                  type="text"
                  placeholder="Action item details requested by inspector..."
                  value={newInspection.complianceRequired}
                  onChange={(e) => setNewInspection({...newInspection, complianceRequired: e.target.value})}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowInspectionModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer"
                >
                  Sign & File in Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: G.R. CORRECTOR TOOL */}
      {showCorrectionModal && selectedStudentForCorrection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 animate-fade-in no-print">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden text-left">
            <div className="bg-indigo-950 text-white p-4 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider">Official G.R. Correction Panel</h3>
                <p className="text-[10px] text-indigo-300 mt-0.5">Active School General Register Audit Control</p>
              </div>
              <button onClick={() => setShowCorrectionModal(false)} className="text-indigo-200 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleApplyCorrection} className="p-6 space-y-4">
              
              <div className="bg-indigo-50 p-3 rounded-lg text-xs space-y-1">
                <div>Student Name: <strong className="text-slate-900">{selectedStudentForCorrection.name}</strong></div>
                <div>G.R. Number: <strong className="text-indigo-900">{selectedStudentForCorrection.grNumber}</strong></div>
                <div>PEN Number: <strong className="text-indigo-900">{selectedStudentForCorrection.penNumber || 'N/A'}</strong></div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Target Field for Correction *</label>
                <select
                  value={correctionForm.fieldCorrected}
                  onChange={(e) => {
                    const field = e.target.value;
                    let oldVal = '';
                    if (field === 'Name') oldVal = selectedStudentForCorrection.name;
                    else if (field === 'Date of Birth') oldVal = selectedStudentForCorrection.dob;
                    else if (field === 'Parent Details') oldVal = selectedStudentForCorrection.fatherName;
                    else if (field === 'PEN Number') oldVal = selectedStudentForCorrection.penNumber || '';
                    setCorrectionForm({ ...correctionForm, fieldCorrected: field, oldValue: oldVal });
                  }}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg outline-none"
                >
                  <option value="Name">Student Full Name</option>
                  <option value="Date of Birth">Date of Birth</option>
                  <option value="Parent Details">Parent/Father Name</option>
                  <option value="PEN Number">PEN Number</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Existing Value (Read Only)</label>
                <input
                  type="text"
                  value={correctionForm.oldValue}
                  readOnly
                  className="w-full text-xs p-2.5 border border-slate-100 rounded-lg bg-slate-100 text-slate-500 font-mono cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Corrected Value *</label>
                <input
                  type="text"
                  required
                  placeholder="Enter original verified spelling / date..."
                  value={correctionForm.newValue}
                  onChange={(e) => setCorrectionForm({...correctionForm, newValue: e.target.value})}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Official Authority Reason & Reference Document *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Corrected as per supporting official document / certificate"
                  value={correctionForm.reason}
                  onChange={(e) => setCorrectionForm({...correctionForm, reason: e.target.value})}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCorrectionModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-indigo-900 hover:bg-indigo-950 text-white rounded-lg cursor-pointer"
                >
                  Apply & Log Correction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD SCHOLARSHIP RECORD */}
      {showScholarshipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 animate-fade-in no-print">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden text-left">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider">Add Scholarship Entry</h3>
              <button onClick={() => setShowScholarshipModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddScholarship} className="p-6 space-y-4">
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Student G.R. Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GR2024049"
                  value={newScholarship.grNumber}
                  onChange={(e) => setNewScholarship({...newScholarship, grNumber: e.target.value.toUpperCase()})}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Scholarship Name *</label>
                <select
                  value={newScholarship.name}
                  onChange={(e) => setNewScholarship({...newScholarship, name: e.target.value})}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg outline-none"
                >
                  <option value="Pre-Matric Minority Scholarship">Pre-Matric Minority Scholarship</option>
                  <option value="Post-Matric National Scholarship Scheme">Post-Matric National Scholarship Scheme</option>
                  <option value="State Government Open Merit Scholarship">State Government Open Merit Scholarship</option>
                  <option value="Dr. Ambedkar Freeship for EBC">Dr. Ambedkar Freeship for EBC</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Amount (INR) *</label>
                  <input
                    type="number"
                    required
                    value={newScholarship.amount}
                    onChange={(e) => setNewScholarship({...newScholarship, amount: e.target.value})}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Disbursement Status</label>
                  <select
                    value={newScholarship.status}
                    onChange={(e) => setNewScholarship({...newScholarship, status: e.target.value as any})}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg outline-none"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Disbursed">Disbursed</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Payment Receipt / DBT Txn Info</label>
                <input
                  type="text"
                  placeholder="SBI-DBT-xxxxxxxx or Awaiting Direct Transfer"
                  value={newScholarship.paymentDetails}
                  onChange={(e) => setNewScholarship({...newScholarship, paymentDetails: e.target.value})}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowScholarshipModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer"
                >
                  Add to Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
