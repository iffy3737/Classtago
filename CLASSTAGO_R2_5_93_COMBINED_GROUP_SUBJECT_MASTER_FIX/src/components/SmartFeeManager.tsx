import React, { useState, useEffect, useMemo } from 'react';
import { 
  CircleDollarSign, Printer, Search, Filter, Plus, Trash2, Edit2, 
  Check, X, FileText, Calendar, CheckCircle2, Clock, Award, Shield, 
  Users, BookOpen, Settings, Send, Download, AlertCircle, Info
} from 'lucide-react';
import { LocalERPDatabase, supabase } from '../lib/supabase';
import { Language, User } from '../types';
import UrduWrapper from './UrduWrapper';
import { printSectionById } from '../utils/printSection';
import { requestActionConfirm } from '../lib/actionConfirm';

// --- DATA STRUCTURE TYPES ---
export interface FeeHead {
  id: string;
  name: string;
  amount: number;
  frequency: 'One Time' | 'Monthly' | 'Quarterly' | 'Half-Yearly' | 'Yearly';
  applicableClasses: string[]; // Class IDs
  academicYear: string; // e.g. "2026-27"
  isOptional: boolean;
  isActive: boolean;
}

export interface StudentFeeProfile {
  grNumber: string;
  studentName: string;
  admissionNo: string;
  classId: string;
  className: string;
  division: string;
  parentName: string;
  parentMobile: string;
  parentEmail?: string;
  academicYear: string;
  
  totalFee: number;
  paidAmount: number;
  concessionAmount: number;
  fineAmount: number;
  concessionType?: string;
  concessionDetails?: string;
  concessionStatus: 'None' | 'PendingApproval' | 'Approved';
  balance: number;
  status: 'Paid' | 'Partial' | 'Unpaid';
}

export interface FeeTransaction {
  id: string;
  receiptNo: string;
  grNumber: string;
  studentName: string;
  className: string;
  division: string;
  academicYear: string;
  amountPaid: number;
  paymentDate: string;
  paymentMode: 'Cash' | 'UPI' | 'QR Code' | 'Bank Transfer' | 'Cheque' | 'Demand Draft';
  paymentModeDetails?: string;
  collectedBy: string;
  status: 'Active' | 'CancellationPending' | 'Cancelled';
  cancellationReason?: string;
  cancelledBy?: string;
  isRefunded?: boolean;
}

export interface FineRule {
  id: string;
  ruleName: string;
  lateFeePerDay: number;
  graceDays: number;
  academicYear: string;
  isActive: boolean;
}

export interface ConcessionRequest {
  id: string;
  grNumber: string;
  studentName: string;
  className: string;
  concessionType: 'Fixed' | 'Percentage' | 'Scholarship' | 'Staff Discount' | 'Sibling' | 'Custom';
  value: number; // raw amount or percentage
  requestedBy: string;
  requestedDate: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approvedBy?: string;
  remarks?: string;
  cloudRequestId?: string;
  decisionNote?: string;
}

interface CloudReceiptCancellationRequest {
  id: string;
  receiptNo: string;
  grNumber: string;
  studentName: string;
  className: string;
  division: string;
  academicYear: string;
  amountPaid: number;
  paymentDate: string;
  paymentMode: string;
  reason: string;
  requestedBy: string;
  createdAt: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  decisionNote?: string;
  decidedByName?: string;
}

interface SmartFeeManagerProps {
  lang: Language;
  user: User;
  onRefreshData?: () => void;
  activeFeatureId?: string | null;
}

type FeeWorkspaceTab = 'dashboard' | 'fee_heads' | 'profiles' | 'receipts' | 'reports' | 'concessions';

const FEE_FEATURE_TAB: Record<string, FeeWorkspaceTab> = {
  'fees-dashboard': 'dashboard',
  'fees-collection-desk': 'profiles',
  'fees-master-config': 'fee_heads',
  'fees-concessions': 'concessions',
  'fees-receipt-ledger': 'receipts',
  'fees-reports-desk': 'reports',
  'cl-fees-collection': 'profiles',
  'cl-fees-receipts': 'receipts',
  'cl-fees-concessions': 'concessions',
  'cl-fees-reports': 'reports'
};

// Initial seed values for fees
const DEFAULT_FEE_HEADS: FeeHead[] = [
  { id: 'fh_adm', name: 'Admission Fee', amount: 3000, frequency: 'One Time', applicableClasses: ['c1', 'c2', 'c3', 'c4', 'c5'], academicYear: '2026-27', isOptional: false, isActive: true },
  { id: 'fh_tui', name: 'Tuition Fee', amount: 8000, frequency: 'Yearly', applicableClasses: ['c1', 'c2', 'c3', 'c4', 'c5'], academicYear: '2026-27', isOptional: false, isActive: true },
  { id: 'fh_comp', name: 'Computer Fee', amount: 1500, frequency: 'Yearly', applicableClasses: ['c3', 'c4', 'c5'], academicYear: '2026-27', isOptional: true, isActive: true },
  { id: 'fh_exam', name: 'Examination Fee', amount: 600, frequency: 'Half-Yearly', applicableClasses: ['c1', 'c2', 'c3', 'c4', 'c5'], academicYear: '2026-27', isOptional: false, isActive: true },
  { id: 'fh_lib', name: 'Library Fee', amount: 400, frequency: 'Yearly', applicableClasses: ['c1', 'c2', 'c3', 'c4', 'c5'], academicYear: '2026-27', isOptional: false, isActive: true },
  { id: 'fh_sports', name: 'Sports & Gymkhana Fee', amount: 500, frequency: 'Yearly', applicableClasses: ['c1', 'c2', 'c3', 'c4', 'c5'], academicYear: '2026-27', isOptional: false, isActive: true }
];

async function feeWorkflowApi(url: string, options: RequestInit = {}) {
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
  if (!response.ok) throw new Error(payload.error || 'Fee workflow request failed.');
  return payload;
}

const DEFAULT_FINE_RULE: FineRule = {
  id: 'fr_1',
  ruleName: 'Standard Late Submission Fine',
  lateFeePerDay: 5,
  graceDays: 10,
  academicYear: '2026-27',
  isActive: true
};

export default function SmartFeeManager({ lang, user, onRefreshData, activeFeatureId }: SmartFeeManagerProps) {
  const isHM = user.role === 'headmaster';
  const isClerk = user.role === 'clerk';
  const isStaff = isHM || isClerk;
  const isParent = user.role === 'parent' || user.role === 'student';

  const academicSetup = LocalERPDatabase.getAcademicSetup();
  const schoolProfile = academicSetup?.schoolProfile;
  const schoolName = String(schoolProfile?.schoolName || 'School');
  const managementName = String(schoolProfile?.managementName || '');
  const schoolAddress = [
    schoolProfile?.address,
    schoolProfile?.villageCity,
    schoolProfile?.taluka,
    schoolProfile?.district,
    schoolProfile?.state,
    schoolProfile?.pinCode
  ].filter(Boolean).join(', ');
  const schoolCode = String(schoolProfile?.schoolCode || schoolProfile?.udiseCode || '—');
  const schoolUdise = String(schoolProfile?.udiseCode || '—');
  const activeYear = academicSetup?.academicYears?.find((year: any) => year.isActive)?.year || 'Not configured';

  // --- GENERAL STATE DECLARATIONS ---
  const [feeHeads, setFeeHeads] = useState<FeeHead[]>(() => {
    const raw = localStorage.getItem('nhs_erp_fee_heads');
    return raw ? JSON.parse(raw) : [];
  });

  const [fineRule, setFineRule] = useState<FineRule>(() => {
    const raw = localStorage.getItem('nhs_erp_fine_rule');
    return raw ? JSON.parse(raw) : { ...DEFAULT_FINE_RULE, lateFeePerDay: 0, graceDays: 0, academicYear: activeYear, isActive: false };
  });

  const [concessionRequests, setConcessionRequests] = useState<ConcessionRequest[]>(() => {
    const raw = localStorage.getItem('nhs_erp_concession_requests');
    return raw ? JSON.parse(raw) : [];
  });
  const [cloudCancellationRequests, setCloudCancellationRequests] = useState<CloudReceiptCancellationRequest[]>([]);
  const [feeWorkflowBusy, setFeeWorkflowBusy] = useState(false);

  const [transactions, setTransactions] = useState<FeeTransaction[]>(() => {
    const raw = localStorage.getItem('nhs_erp_fee_transactions');
    return raw ? JSON.parse(raw) : [];
  });

  const [studentProfiles, setStudentProfiles] = useState<StudentFeeProfile[]>([]);

  // UI state
  const [activeTab, setActiveTab] = useState<FeeWorkspaceTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedProfile, setSelectedProfile] = useState<StudentFeeProfile | null>(null);
  
  // Forms states
  const [showAddHead, setShowAddHead] = useState(false);
  const [newHead, setNewHead] = useState<Partial<FeeHead>>({
    name: '',
    amount: 1000,
    frequency: 'Yearly',
    applicableClasses: [],
    isOptional: false,
    isActive: true
  });

  const [payAmount, setPayAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<FeeTransaction['paymentMode']>('Cash');
  const [paymentDetails, setPaymentDetails] = useState('');
  const [adjPreviousDue, setAdjPreviousDue] = useState(0);

  // Concession Form
  const [concessionType, setConcessionType] = useState<ConcessionRequest['concessionType']>('Fixed');
  const [concessionValue, setConcessionValue] = useState(0);
  const [concessionRemarks, setConcessionRemarks] = useState('');

  // Manual Fine form
  const [manualFineAmt, setManualFineAmt] = useState(0);
  const [manualFineReason, setManualFineReason] = useState('');

  // Selected receipt for PDF print preview
  const [selectedReceipt, setSelectedReceipt] = useState<FeeTransaction | null>(null);
  const [receiptPrintSize, setReceiptPrintSize] = useState<'A4' | 'HalfPage'>('A4');

  // Notifications Log
  const [remindersLog, setRemindersLog] = useState<{ id: string; grNumber: string; name: string; date: string; type: string; status: string }[]>(() => {
    const raw = localStorage.getItem('nhs_erp_fee_reminders');
    return raw ? JSON.parse(raw) : [];
  });

  // Load class/division combinations from Academic Setup, then expose one option per standard.
  // Fee structures apply to a standard, not to a duplicated checkbox for every division.
  const classes = LocalERPDatabase.getClasses();
  const feeClassOptions = useMemo(() => {
    const grouped = new Map<string, { key: string; label: string; ids: string[] }>();
    classes.forEach(classItem => {
      const label = String(classItem.className || '').trim().replace(/\s+/g, ' ');
      if (!label) return;
      const key = label.toLocaleLowerCase('en-IN');
      const current = grouped.get(key) || { key, label, ids: [] };
      if (!current.ids.includes(classItem.id)) current.ids.push(classItem.id);
      grouped.set(key, current);
    });
    return Array.from(grouped.values()).sort((a, b) =>
      a.label.localeCompare(b.label, 'en-IN', { numeric: true, sensitivity: 'base' })
    );
  }, [classes]);

  const formatApplicableClasses = (classIds: string[]) => {
    const labels = new Set<string>();
    classIds.forEach(classId => {
      const classItem = classes.find(item => item.id === classId);
      labels.add(classItem?.className || classId);
    });
    return Array.from(labels).join(', ');
  };

  useEffect(() => {
    if (!activeFeatureId) return;
    const nextTab = FEE_FEATURE_TAB[activeFeatureId];
    if (nextTab) setActiveTab(nextTab);
  }, [activeFeatureId]);

  useEffect(() => {
    if (!['headmaster', 'clerk'].includes(user.role)) return;
    let cancelled = false;
    const loadCloudFeeApprovals = async () => {
      try {
        const payload = await feeWorkflowApi('/api/admin/fee-approval-requests');
        if (cancelled) return;
        const cloudConcessions: ConcessionRequest[] = (Array.isArray(payload.concessions) ? payload.concessions : []).map((row: any) => {
          const request = row.request || {};
          const decision = String(row.status || 'pending');
          return {
            id: `cloud-con-${String(row.id || '')}`,
            cloudRequestId: String(row.id || ''),
            grNumber: String(request.grNumber || ''),
            studentName: String(request.studentName || 'Student'),
            className: String(request.className || request.classId || '—'),
            concessionType: (['Fixed','Percentage','Scholarship','Staff Discount','Sibling','Custom'].includes(String(request.concessionType || '')) ? request.concessionType : 'Custom') as ConcessionRequest['concessionType'],
            value: Number(request.value || 0),
            requestedBy: String(request.requestedBy || 'Clerk'),
            requestedDate: String(row.createdAt || '').slice(0, 10),
            status: decision === 'approve' ? 'Approved' : decision === 'reject' ? 'Rejected' : 'Pending',
            approvedBy: decision === 'approve' ? String(row.decidedByName || 'Headmaster') : undefined,
            remarks: String(request.remarks || ''),
            decisionNote: row.decisionNote ? String(row.decisionNote) : undefined
          };
        });
        setConcessionRequests(current => {
          const cloudIds = new Set(cloudConcessions.map(row => row.cloudRequestId).filter(Boolean));
          const cloudGRs = new Set(cloudConcessions.map(row => row.grNumber).filter(Boolean));
          const legacyOnly = current.filter(row => !row.cloudRequestId && !(row.status === 'Pending' && cloudGRs.has(row.grNumber)));
          const merged = [...cloudConcessions, ...legacyOnly.filter(row => !row.cloudRequestId || !cloudIds.has(row.cloudRequestId))];
          localStorage.setItem('nhs_erp_concession_requests', JSON.stringify(merged));
          return merged;
        });
        const cancellations: CloudReceiptCancellationRequest[] = (Array.isArray(payload.cancellations) ? payload.cancellations : []).map((row: any) => {
          const request = row.request || {}; const decision = String(row.status || 'pending');
          return {
            id: String(row.id || ''), receiptNo: String(request.receiptNo || ''), grNumber: String(request.grNumber || ''),
            studentName: String(request.studentName || 'Student'), className: String(request.className || '—'), division: String(request.division || ''),
            academicYear: String(request.academicYear || ''), amountPaid: Number(request.amountPaid || 0), paymentDate: String(request.paymentDate || ''),
            paymentMode: String(request.paymentMode || ''), reason: String(request.reason || ''), requestedBy: String(request.requestedBy || 'Clerk'),
            createdAt: String(row.createdAt || ''), status: decision === 'approve' ? 'Approved' : decision === 'reject' ? 'Rejected' : 'Pending',
            decisionNote: row.decisionNote ? String(row.decisionNote) : undefined, decidedByName: row.decidedByName ? String(row.decidedByName) : undefined
          };
        });
        setCloudCancellationRequests(cancellations);
        setTransactions(current => current.map(tx => {
          const cloud = cancellations.find(request => request.receiptNo === tx.receiptNo);
          if (!cloud || tx.status === 'Cancelled') return tx;
          if (cloud.status === 'Pending') return { ...tx, status: 'CancellationPending' as const, cancellationReason: cloud.reason };
          if (cloud.status === 'Rejected' && tx.status === 'CancellationPending') return { ...tx, status: 'Active' as const, cancellationReason: undefined };
          return tx;
        }));
      } catch (error) {
        console.warn('Cloud fee approval queue could not be loaded; legacy compatibility data remains available.', error);
      }
    };
    void loadCloudFeeApprovals();
    return () => { cancelled = true; };
  }, [user.role]);

  // --- COMPONENT LEVEL SYNC ENGINE (ON LOAD) ---
  useEffect(() => {
    // We synchronize the admissions roster to our local StudentFeeProfile registry.
    const rawAdmissions = localStorage.getItem('nhs_erp_clerk_admissions');
    const admissions = rawAdmissions ? JSON.parse(rawAdmissions) : [];

    // Load saved fee profiles
    const rawProfiles = localStorage.getItem('nhs_erp_student_fee_profiles');
    let loadedProfiles: StudentFeeProfile[] = rawProfiles ? JSON.parse(rawProfiles) : [];

    // Synchronize dues map
    const synchronized: StudentFeeProfile[] = admissions.map((adm: any) => {
      // Find or calculate total fee for this class
      const classId = adm.admissionClassId;
      const classObj = classes.find(c => c.id === classId);
      const className = classObj ? classObj.className : 'Class 9';

      // Find applicable fee heads
      const activeHeads = feeHeads.filter(h => h.isActive && h.applicableClasses.includes(classId));
      const calculatedTotal = activeHeads.reduce((acc, h) => acc + h.amount, 0);

      // Look up if this student already has a fee profile
      const existing = loadedProfiles.find(p => p.grNumber === adm.grNumber);

      let paid = existing ? existing.paidAmount : 0;
      let concession = existing ? existing.concessionAmount : 0;
      let fine = existing ? existing.fineAmount : 0;
      let concStatus = existing ? existing.concessionStatus : 'None';
      let concType = existing ? existing.concessionType : undefined;
      let concDetails = existing ? existing.concessionDetails : undefined;
      const latestConcession = concessionRequests.find(request => request.grNumber === adm.grNumber);
      if (latestConcession?.status === 'Approved') {
        concession = latestConcession.concessionType === 'Percentage'
          ? Math.round(calculatedTotal * (latestConcession.value / 100))
          : latestConcession.value;
        concStatus = 'Approved'; concType = latestConcession.concessionType;
        concDetails = `Headmaster-approved ${latestConcession.concessionType} concession: ${latestConcession.value}`;
      } else if (latestConcession?.status === 'Pending') {
        concStatus = 'PendingApproval';
      } else if (latestConcession?.status === 'Rejected' && concStatus === 'PendingApproval') {
        concStatus = 'None';
      }

      // Recalculate balance
      const balance = calculatedTotal + fine - concession - paid;
      const status = balance <= 0 ? 'Paid' : (paid > 0 ? 'Partial' : 'Unpaid');

      return {
        grNumber: adm.grNumber,
        studentName: adm.name,
        admissionNo: adm.admissionNumber || adm.grNumber,
        classId,
        className,
        division: adm.division || 'A',
        parentName: adm.fatherName,
        parentMobile: adm.parentMobile || 'Not Supplied',
        parentEmail: adm.email,
        academicYear: adm.academicYear || activeYear,
        totalFee: calculatedTotal,
        paidAmount: paid,
        concessionAmount: concession,
        fineAmount: fine,
        concessionType: concType,
        concessionDetails: concDetails,
        concessionStatus: concStatus,
        balance: Math.max(0, balance),
        status
      };
    });

    localStorage.setItem('nhs_erp_student_fee_profiles', JSON.stringify(synchronized));
    setStudentProfiles(synchronized);

    // If logged in as student or parent, automatically pre-select their profile
    if (isParent) {
      const match = synchronized.find(p => p.grNumber === user.username || p.parentMobile.includes(user.username));
      if (match) {
        setSelectedProfile(match);
      } else {
        // Fallback: select first student
        if (synchronized.length > 0) setSelectedProfile(synchronized[0]);
      }
    }
  }, [feeHeads, concessionRequests, transactions]);

  // Save states helper
  const saveFeeHeads = (list: FeeHead[]) => {
    localStorage.setItem('nhs_erp_fee_heads', JSON.stringify(list));
    setFeeHeads(list);
  };

  const saveTransactions = (list: FeeTransaction[]) => {
    localStorage.setItem('nhs_erp_fee_transactions', JSON.stringify(list));
    setTransactions(list);
  };

  const logAudit = (action: string, details: string) => {
    LocalERPDatabase.addAuditLog(user.id, user.name, user.role, action, 'Fees', details);
  };

  // --- ACTION HANDLERS ---

  // 1. Fee Head CRUD
  const handleAddFeeHead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHead.name || !newHead.amount) {
      alert('Please fill out all mandatory fee head fields.');
      return;
    }
    const created: FeeHead = {
      id: `fh_${Date.now()}`,
      name: newHead.name,
      amount: Number(newHead.amount),
      frequency: newHead.frequency as any,
      applicableClasses: newHead.applicableClasses || [],
      academicYear: activeYear,
      isOptional: !!newHead.isOptional,
      isActive: true
    };
    const updated = [...feeHeads, created];
    saveFeeHeads(updated);
    logAudit('CREATE_FEE_HEAD', `Added new fee head: ${created.name} (INR ${created.amount})`);
    setShowAddHead(false);
    setNewHead({ name: '', amount: 1000, frequency: 'Yearly', applicableClasses: [], isOptional: false, isActive: true });
  };

  const handleDeleteFeeHead = async (id: string) => {
    if (!(await requestActionConfirm({ title: 'Remove fee head?', message: 'Are you sure you want to remove this fee head? It will recalculate class-wise total structures.', confirmLabel: 'Remove Fee Head', tone: 'danger' }))) return;
    const target = feeHeads.find(f => f.id === id);
    const updated = feeHeads.filter(f => f.id !== id);
    saveFeeHeads(updated);
    logAudit('DELETE_FEE_HEAD', `Removed fee head: ${target?.name}`);
  };

  // 2. Clear Outstanding Payment (Full, Partial, Installment, Advance)
  const handleProcessPayment = async () => {
    if (!selectedProfile) return;
    if (payAmount <= 0) {
      alert('Please enter a valid pay amount greater than zero.');
      return;
    }

    if (payAmount > selectedProfile.balance) {
      if (!(await requestActionConfirm({ title: 'Record advance payment?', message: `The amount (INR ${payAmount}) exceeds outstanding balance (INR ${selectedProfile.balance}). Add remaining amount as Advance Payment?`, confirmLabel: 'Continue Payment', tone: 'warning' }))) {
        return;
      }
    }

    // Receipt number generation
    const receiptNo = `NHS-REC-${activeYear.replace('-', '')}-${String(transactions.length + 1001)}`;

    const newTx: FeeTransaction = {
      id: `tx_${Date.now()}`,
      receiptNo,
      grNumber: selectedProfile.grNumber,
      studentName: selectedProfile.studentName,
      className: selectedProfile.className,
      division: selectedProfile.division,
      academicYear: selectedProfile.academicYear,
      amountPaid: payAmount,
      paymentDate: new Date().toISOString().substring(0, 10),
      paymentMode,
      paymentModeDetails: paymentDetails,
      collectedBy: user.name,
      status: 'Active'
    };

    const updatedTxs = [newTx, ...transactions];
    saveTransactions(updatedTxs);

    // Update profile local state
    const updatedProfiles = studentProfiles.map(p => {
      if (p.grNumber === selectedProfile.grNumber) {
        const paid = p.paidAmount + payAmount;
        const bal = Math.max(0, p.totalFee + p.fineAmount - p.concessionAmount - paid);
        const status = bal <= 0 ? 'Paid' : (paid > 0 ? 'Partial' : 'Unpaid');
        return { ...p, paidAmount: paid, balance: bal, status };
      }
      return p;
    });

    localStorage.setItem('nhs_erp_student_fee_profiles', JSON.stringify(updatedProfiles));
    setStudentProfiles(updatedProfiles);
    setSelectedProfile(updatedProfiles.find(p => p.grNumber === selectedProfile.grNumber) || null);

    logAudit('COLLECT_FEE', `Collected INR ${payAmount} for student ${selectedProfile.studentName} (GR: ${selectedProfile.grNumber}). Receipt: ${receiptNo}`);
    setSelectedReceipt(newTx);
    setPayAmount(0);
    setPaymentDetails('');
    alert(`Success! Receipt ${receiptNo} issued successfully.`);
  };

  // 3. Request Concession
  const handleApplyConcession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfile) return;
    if (concessionValue <= 0) {
      alert('Concession value must be greater than zero.');
      return;
    }

    const reqId = `con_${Date.now()}`;
    const newReq: ConcessionRequest = {
      id: reqId,
      grNumber: selectedProfile.grNumber,
      studentName: selectedProfile.studentName,
      className: selectedProfile.className,
      concessionType,
      value: concessionValue,
      requestedBy: user.name,
      requestedDate: new Date().toISOString().substring(0, 10),
      status: isHM ? 'Approved' : 'Pending'
    };

    if (!isHM) {
      try {
        setFeeWorkflowBusy(true);
        const cloud = await feeWorkflowApi('/api/clerk/fee-concession-requests', {
          method: 'POST',
          body: JSON.stringify({ grNumber: selectedProfile.grNumber, concessionType, value: concessionValue, remarks: concessionRemarks })
        });
        newReq.id = `cloud-con-${String(cloud.requestId || reqId)}`;
        newReq.cloudRequestId = String(cloud.requestId || '');
      } catch (error: any) {
        alert(error?.message || 'Concession request could not be sent to Headmaster.');
        return;
      } finally {
        setFeeWorkflowBusy(false);
      }
    }

    const updatedReqs = [newReq, ...concessionRequests.filter(request => request.id !== newReq.id && !(newReq.cloudRequestId && request.cloudRequestId === newReq.cloudRequestId))];
    localStorage.setItem('nhs_erp_concession_requests', JSON.stringify(updatedReqs));
    setConcessionRequests(updatedReqs);

    if (isHM) {
      // If headmaster applies, immediately apply to profile
      applyConcessionToProfile(selectedProfile.grNumber, concessionType, concessionValue);
      alert('Concession approved and applied immediately.');
    } else {
      // Update student profile concessionStatus
      const updatedP = studentProfiles.map(p => {
        if (p.grNumber === selectedProfile.grNumber) {
          return { ...p, concessionStatus: 'PendingApproval' as const };
        }
        return p;
      });
      localStorage.setItem('nhs_erp_student_fee_profiles', JSON.stringify(updatedP));
      setStudentProfiles(updatedP);
      setSelectedProfile(updatedP.find(p => p.grNumber === selectedProfile.grNumber) || null);
      alert('Concession request submitted to Headmaster for final authorization.');
    }

    logAudit('REQUEST_CONCESSION', `Requested ${concessionType} Concession of ${concessionValue} for student ${selectedProfile.studentName}`);
    setConcessionValue(0);
    setConcessionRemarks('');
  };

  // Approval Helper
  const applyConcessionToProfile = (gr: string, type: string, val: number) => {
    const updatedProfiles = studentProfiles.map(p => {
      if (p.grNumber === gr) {
        let concAmt = 0;
        if (type === 'Percentage') {
          concAmt = Math.round(p.totalFee * (val / 100));
        } else {
          concAmt = val;
        }

        const bal = Math.max(0, p.totalFee + p.fineAmount - concAmt - p.paidAmount);
        const status = bal <= 0 ? 'Paid' : (p.paidAmount > 0 ? 'Partial' : 'Unpaid');

        return {
          ...p,
          concessionAmount: concAmt,
          concessionType: type,
          concessionDetails: `Approved discount value: ${val}`,
          concessionStatus: 'Approved' as const,
          balance: bal,
          status
        };
      }
      return p;
    });

    localStorage.setItem('nhs_erp_student_fee_profiles', JSON.stringify(updatedProfiles));
    setStudentProfiles(updatedProfiles);
    if (selectedProfile && selectedProfile.grNumber === gr) {
      setSelectedProfile(updatedProfiles.find(p => p.grNumber === gr) || null);
    }
  };

  const handleApproveConcession = async (req: ConcessionRequest) => {
    if (!isHM) {
      alert('Only the Headmaster holds structural clearance rights to approve financial concessions.');
      return;
    }

    if (req.cloudRequestId) {
      try {
        setFeeWorkflowBusy(true);
        await feeWorkflowApi(`/api/headmaster/fee-concession-requests/${encodeURIComponent(req.cloudRequestId)}/decision`, { method: 'POST', body: JSON.stringify({ decision: 'approve' }) });
      } catch (error: any) {
        alert(error?.message || 'Concession approval could not be saved.');
        return;
      } finally { setFeeWorkflowBusy(false); }
    }
    const updatedReqs = concessionRequests.map(r => r.id === req.id ? { ...r, status: 'Approved' as const, approvedBy: user.name } : r);
    localStorage.setItem('nhs_erp_concession_requests', JSON.stringify(updatedReqs));
    setConcessionRequests(updatedReqs);

    applyConcessionToProfile(req.grNumber, req.concessionType, req.value);
    logAudit('APPROVE_CONCESSION', `Authorized concession for GR ${req.grNumber} (${req.concessionType}: ${req.value})`);
    alert('Concession authorized successfully.');
  };

  const handleRejectConcession = async (req: ConcessionRequest) => {
    if (!isHM) {
      alert('Only the Headmaster holds structural clearance rights to reject requests.');
      return;
    }

    if (req.cloudRequestId) {
      const note = window.prompt('Optional rejection note for the Clerk:', '') || '';
      try {
        setFeeWorkflowBusy(true);
        await feeWorkflowApi(`/api/headmaster/fee-concession-requests/${encodeURIComponent(req.cloudRequestId)}/decision`, { method: 'POST', body: JSON.stringify({ decision: 'reject', note }) });
      } catch (error: any) {
        alert(error?.message || 'Concession rejection could not be saved.');
        return;
      } finally { setFeeWorkflowBusy(false); }
    }
    const updatedReqs = concessionRequests.map(r => r.id === req.id ? { ...r, status: 'Rejected' as const } : r);
    localStorage.setItem('nhs_erp_concession_requests', JSON.stringify(updatedReqs));
    setConcessionRequests(updatedReqs);

    // Reset student concession status
    const updatedP = studentProfiles.map(p => {
      if (p.grNumber === req.grNumber) {
        return { ...p, concessionStatus: 'None' as const };
      }
      return p;
    });
    localStorage.setItem('nhs_erp_student_fee_profiles', JSON.stringify(updatedP));
    setStudentProfiles(updatedP);
    if (selectedProfile && selectedProfile.grNumber === req.grNumber) {
      setSelectedProfile(updatedP.find(p => p.grNumber === req.grNumber) || null);
    }

    logAudit('REJECT_CONCESSION', `Rejected concession request for GR ${req.grNumber}`);
    alert('Concession request declined.');
  };

  // 4. Manual Fine additions & Fine waivers
  const handleApplyManualFine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfile) return;
    if (manualFineAmt <= 0) {
      alert('Please input a valid fine amount.');
      return;
    }

    const updatedProfiles = studentProfiles.map(p => {
      if (p.grNumber === selectedProfile.grNumber) {
        const fines = p.fineAmount + manualFineAmt;
        const bal = Math.max(0, p.totalFee + fines - p.concessionAmount - p.paidAmount);
        const status = bal <= 0 ? 'Paid' : (p.paidAmount > 0 ? 'Partial' : 'Unpaid');
        return { ...p, fineAmount: fines, balance: bal, status };
      }
      return p;
    });

    localStorage.setItem('nhs_erp_student_fee_profiles', JSON.stringify(updatedProfiles));
    setStudentProfiles(updatedProfiles);
    setSelectedProfile(updatedProfiles.find(p => p.grNumber === selectedProfile.grNumber) || null);

    logAudit('ADD_FINE', `Levied INR ${manualFineAmt} fine on student ${selectedProfile.studentName} for: ${manualFineReason || 'late compliance'}`);
    setManualFineAmt(0);
    setManualFineReason('');
    alert('Fine charged to student ledger successfully.');
  };

  const handleWaiveFines = async () => {
    if (!selectedProfile) return;
    if (selectedProfile.fineAmount === 0) return;

    if (!(await requestActionConfirm({ title: 'Waive complete fine?', message: `Are you sure you want to waive off the complete fine of INR ${selectedProfile.fineAmount} for this student?`, confirmLabel: 'Waive Fine', tone: 'danger' }))) {
      return;
    }

    const waived = selectedProfile.fineAmount;
    const updatedProfiles = studentProfiles.map(p => {
      if (p.grNumber === selectedProfile.grNumber) {
        const bal = Math.max(0, p.totalFee - p.concessionAmount - p.paidAmount);
        const status = bal <= 0 ? 'Paid' : (p.paidAmount > 0 ? 'Partial' : 'Unpaid');
        return { ...p, fineAmount: 0, balance: bal, status };
      }
      return p;
    });

    localStorage.setItem('nhs_erp_student_fee_profiles', JSON.stringify(updatedProfiles));
    setStudentProfiles(updatedProfiles);
    setSelectedProfile(updatedProfiles.find(p => p.grNumber === selectedProfile.grNumber) || null);

    logAudit('WAIVE_FINE', `Waived off outstanding fine of INR ${waived} for student ${selectedProfile.studentName}`);
    alert('All active fines waived off.');
  };

  // 5. Receipt Cancellations (HM approves instantly, Clerks request)
  const handleRequestCancellation = async (tx: FeeTransaction, reason: string) => {
    if (!reason.trim()) {
      alert('Please specify a valid cancellation reason.');
      return;
    }

    if (isHM) {
      executeCancelReceipt(tx.id, reason);
      alert('Receipt cancelled and student ledger ledger balances updated instantly.');
    } else {
      try {
        setFeeWorkflowBusy(true);
        const cloud = await feeWorkflowApi('/api/clerk/fee-receipt-cancellation-requests', {
          method: 'POST', body: JSON.stringify({ receipt: tx, reason })
        });
        const updated = transactions.map(t => t.id === tx.id ? { ...t, status: 'CancellationPending' as const, cancellationReason: reason } : t);
        saveTransactions(updated);
        setCloudCancellationRequests(current => [{
          id: String(cloud.requestId || ''), receiptNo: tx.receiptNo, grNumber: tx.grNumber, studentName: tx.studentName, className: tx.className, division: tx.division,
          academicYear: tx.academicYear, amountPaid: tx.amountPaid, paymentDate: tx.paymentDate, paymentMode: tx.paymentMode, reason, requestedBy: user.name, createdAt: new Date().toISOString(), status: 'Pending'
        }, ...current.filter(request => request.receiptNo !== tx.receiptNo)]);
        logAudit('REQUEST_CANCEL_RECEIPT', `Clerk requested cancellation for receipt ${tx.receiptNo}. Reason: ${reason}`);
        alert('Cancellation authorization request forwarded to Headmaster cloud queue.');
      } catch (error: any) {
        alert(error?.message || 'Cancellation request could not be sent to Headmaster.');
      } finally { setFeeWorkflowBusy(false); }
    }
  };

  const handleApproveCancellation = (tx: FeeTransaction) => {
    if (!isHM) {
      alert('Only the Headmaster holds structural credentials to authorize receipt cancellations.');
      return;
    }
    executeCancelReceipt(tx.id, tx.cancellationReason || 'Authorized cancellation');
    alert('Cancellation approved.');
  };

  const handleApproveCloudCancellation = async (request: CloudReceiptCancellationRequest) => {
    if (!isHM) return alert('Only the Headmaster can authorize receipt cancellation.');
    try {
      setFeeWorkflowBusy(true);
      await feeWorkflowApi(`/api/headmaster/fee-receipt-cancellation-requests/${encodeURIComponent(request.id)}/decision`, { method: 'POST', body: JSON.stringify({ decision: 'approve' }) });
      setCloudCancellationRequests(current => current.map(row => row.id === request.id ? { ...row, status: 'Approved', decidedByName: user.name } : row));
      const localTx = transactions.find(tx => tx.receiptNo === request.receiptNo);
      if (localTx && localTx.status !== 'Cancelled') executeCancelReceipt(localTx.id, request.reason);
      alert('Receipt cancellation approved. The Clerk device will synchronize this decision from the cloud queue.');
    } catch (error: any) {
      alert(error?.message || 'Receipt cancellation approval could not be saved.');
    } finally { setFeeWorkflowBusy(false); }
  };

  const handleRejectCloudCancellation = async (request: CloudReceiptCancellationRequest) => {
    if (!isHM) return alert('Only the Headmaster can reject receipt cancellation.');
    const note = window.prompt('Optional rejection note for the Clerk:', '') || '';
    try {
      setFeeWorkflowBusy(true);
      await feeWorkflowApi(`/api/headmaster/fee-receipt-cancellation-requests/${encodeURIComponent(request.id)}/decision`, { method: 'POST', body: JSON.stringify({ decision: 'reject', note }) });
      setCloudCancellationRequests(current => current.map(row => row.id === request.id ? { ...row, status: 'Rejected', decisionNote: note, decidedByName: user.name } : row));
      const updated = transactions.map(tx => tx.receiptNo === request.receiptNo && tx.status === 'CancellationPending' ? { ...tx, status: 'Active' as const, cancellationReason: undefined } : tx);
      saveTransactions(updated);
      alert('Receipt cancellation request rejected.');
    } catch (error: any) {
      alert(error?.message || 'Receipt cancellation rejection could not be saved.');
    } finally { setFeeWorkflowBusy(false); }
  };

  const executeCancelReceipt = (txId: string, reason: string) => {
    const tx = transactions.find(t => t.id === txId);
    if (!tx) return;

    // Reverse paid amount on student profile
    const updatedProfiles = studentProfiles.map(p => {
      if (p.grNumber === tx.grNumber) {
        const paid = Math.max(0, p.paidAmount - tx.amountPaid);
        const bal = Math.max(0, p.totalFee + p.fineAmount - p.concessionAmount - paid);
        const status = bal <= 0 ? 'Paid' : (paid > 0 ? 'Partial' : 'Unpaid');
        return { ...p, paidAmount: paid, balance: bal, status };
      }
      return p;
    });

    localStorage.setItem('nhs_erp_student_fee_profiles', JSON.stringify(updatedProfiles));
    setStudentProfiles(updatedProfiles);

    const updatedTxs = transactions.map(t => t.id === txId ? { ...t, status: 'Cancelled' as const, cancelledBy: user.name, isRefunded: true } : t);
    saveTransactions(updatedTxs);

    if (selectedProfile && selectedProfile.grNumber === tx.grNumber) {
      setSelectedProfile(updatedProfiles.find(p => p.grNumber === tx.grNumber) || null);
    }

    logAudit('CANCEL_RECEIPT', `Cancelled Receipt ${tx.receiptNo} and refunded INR ${tx.amountPaid} for GR ${tx.grNumber}. Reason: ${reason}`);
  };

  useEffect(() => {
    if (!cloudCancellationRequests.length) return;
    const approved = cloudCancellationRequests.filter(request => request.status === 'Approved');
    approved.forEach(request => {
      const localTx = transactions.find(tx => tx.receiptNo === request.receiptNo);
      if (localTx && localTx.status !== 'Cancelled') executeCancelReceipt(localTx.id, request.reason || 'Headmaster-approved cancellation');
    });
    const rejectedReceiptNos = new Set(cloudCancellationRequests.filter(request => request.status === 'Rejected').map(request => request.receiptNo));
    if (rejectedReceiptNos.size) {
      const updated = transactions.map(tx => rejectedReceiptNos.has(tx.receiptNo) && tx.status === 'CancellationPending' ? { ...tx, status: 'Active' as const, cancellationReason: undefined } : tx);
      if (updated.some((tx, index) => tx !== transactions[index])) saveTransactions(updated);
    }
  }, [cloudCancellationRequests]);

  // Communication delivery is owned by the central Communication Hub. Fees prepares the
  // audience/message only; it must never claim that SMS/WhatsApp was sent without the dispatcher.
  const handlePrepareReminder = async (p: StudentFeeProfile) => {
    const message = `Fee reminder: ${p.studentName} (GR ${p.grNumber}) has INR ${p.balance.toLocaleString()} outstanding for ${p.academicYear}. Please contact the school office for payment details.`;
    try {
      await navigator.clipboard?.writeText(message);
      alert('Fee reminder text prepared and copied. Send it through Communication Hub so delivery status, retries and audit history come from the canonical communication engine.');
    } catch {
      alert(`Fee reminder prepared. Open Communication Hub to send it through an audited channel.\n\n${message}`);
    }
  };

  // --- COMPONENT SEARCH & FILTER MATRIX ---
  const filteredProfiles = studentProfiles.filter(p => {
    const matchesSearch = p.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.grNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.parentMobile.includes(searchQuery);
    const selectedClass = feeClassOptions.find(option => option.key === classFilter);
    const matchesClass = classFilter === 'all' || Boolean(selectedClass?.ids.includes(p.classId));
    const matchesStatus = statusFilter === 'all' || p.status?.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesClass && matchesStatus;
  });

  // --- STATISTICAL REPORT GENERATOR ---
  const totalExpected = studentProfiles.reduce((acc, p) => acc + p.totalFee + p.fineAmount, 0);
  const totalConcessions = studentProfiles.reduce((acc, p) => acc + p.concessionAmount, 0);
  const totalCollected = transactions.filter(t => t.status === 'Active').reduce((acc, t) => acc + t.amountPaid, 0);
  const totalOutstanding = Math.max(0, totalExpected - totalConcessions - totalCollected);

  // Class-wise collections stats: one row per standard, even when multiple divisions exist.
  const classStats = feeClassOptions.map(classOption => {
    const classProfs = studentProfiles.filter(profile => classOption.ids.includes(profile.classId));
    const expected = classProfs.reduce((acc, profile) => acc + profile.totalFee, 0);
    const conc = classProfs.reduce((acc, profile) => acc + profile.concessionAmount, 0);
    const paid = classProfs.reduce((acc, profile) => acc + profile.paidAmount, 0);
    const target = expected - conc;
    const outstanding = Math.max(0, target - paid);

    return {
      className: classOption.label,
      expected,
      concessions: conc,
      target,
      paid,
      outstanding
    };
  });

  // Headmaster dashboard stats helper
  const dailyCollection = transactions
    .filter(t => t.status === 'Active' && t.paymentDate === new Date().toISOString().substring(0, 10))
    .reduce((acc, t) => acc + t.amountPaid, 0);

  return (
    <div className="space-y-6">
      
      {/* Title block */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md flex justify-between items-center flex-wrap gap-4 no-print">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-xl">
            <CircleDollarSign className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold font-mono">
              {schoolName}
            </span>
            <h2 className="text-xl font-bold">Smart Fees Desk</h2>
            <p className="mt-0.5 text-xs font-semibold text-slate-400">Fee Ledger, Collection & Due Tracking System</p>
          </div>
        </div>
        
        {/* Module Nav Tabs */}
        {!activeFeatureId && (
        <div className="flex gap-2 bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Dashboard
          </button>
          {isStaff && (
            <>
              <button
                onClick={() => setActiveTab('profiles')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'profiles' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Collection Desk
              </button>
              <button
                onClick={() => setActiveTab('fee_heads')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'fee_heads' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Fee Master Config
              </button>
              <button
                onClick={() => setActiveTab('concessions')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all relative ${activeTab === 'concessions' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Concessions
                {concessionRequests.filter(r => r.status === 'Pending').length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                    {concessionRequests.filter(r => r.status === 'Pending').length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('receipts')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'receipts' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Receipt Ledger
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'reports' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Reports Desk
              </button>
            </>
          )}
        </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* TAB 1: DASHBOARD OVERVIEW */}
      {/* ======================================================== */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          
          {/* Main stats boxes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
              <span className="text-[10px] uppercase text-slate-400 font-bold font-mono tracking-wider">Total Projected Target</span>
              <p className="text-2xl font-black text-slate-900">INR {totalExpected.toLocaleString()}</p>
              <p className="text-[10px] text-slate-500">Gross fee structure binding + fines</p>
            </div>
            
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 shadow-sm space-y-1">
              <span className="text-[10px] uppercase text-emerald-700 font-bold font-mono tracking-wider">Gross Fee Collected</span>
              <p className="text-2xl font-black text-emerald-800">INR {totalCollected.toLocaleString()}</p>
              <p className="text-[10px] text-emerald-600">Total liquid cash and digital receipts</p>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 shadow-sm space-y-1">
              <span className="text-[10px] uppercase text-amber-700 font-bold font-mono tracking-wider">Authorized Concessions</span>
              <p className="text-2xl font-black text-amber-800">INR {totalConcessions.toLocaleString()}</p>
              <p className="text-[10px] text-amber-600">Total sibling/staff discounts & scholarships</p>
            </div>

            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 shadow-sm space-y-1">
              <span className="text-[10px] uppercase text-rose-700 font-bold font-mono tracking-wider">Pending Outstanding Balance</span>
              <p className="text-2xl font-black text-rose-800">INR {totalOutstanding.toLocaleString()}</p>
              <p className="text-[10px] text-rose-600">Total fees currently overdue</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
            
            {/* Quick action checklist / rules */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm lg:col-span-1">
              <div className="border-b border-slate-100 pb-2 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 text-sm">System Policies</h3>
                <span className="text-[10px] font-bold text-indigo-600 uppercase font-mono">Active</span>
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                  <p className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Late Submission Fine Rule</span>
                  </p>
                  <p className="text-slate-500">
                    Levy <strong>INR {fineRule.lateFeePerDay}</strong> per day after a grace period of <strong>{fineRule.graceDays} days</strong> of due date.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                  <p className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Clerk Ingress Authorization</span>
                  </p>
                  <p className="text-slate-500">
                    Administrative Clerks hold clearance to log collections and register receipts. Receipt cancellations and concessions require Headmaster override.
                  </p>
                </div>

                {isParent && selectedProfile && (
                  <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-3">
                    <p className="font-bold text-indigo-900 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-indigo-600" />
                      <span>My Ward Outstanding Dues</span>
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                      <div>Total Fee: <strong>INR {selectedProfile.totalFee}</strong></div>
                      <div>Paid Amount: <strong>INR {selectedProfile.paidAmount}</strong></div>
                      <div className="text-rose-600">Balance Due: <strong>INR {selectedProfile.balance}</strong></div>
                      <div className="text-amber-600">Concession: <strong>INR {selectedProfile.concessionAmount}</strong></div>
                    </div>
                    {selectedProfile.balance > 0 ? (
                      <div className="pt-2">
                        <button
                          onClick={() => {
                            setPayAmount(selectedProfile.balance);
                            setActiveTab('profiles');
                          }}
                          className="w-full py-1.5 bg-indigo-600 text-white font-bold text-[10px] rounded-lg shadow cursor-pointer hover:bg-indigo-700 text-center block"
                        >
                          Access Pay Portal
                        </button>
                      </div>
                    ) : (
                      <p className="text-[10px] text-emerald-700 font-bold bg-emerald-50 p-2 rounded border border-emerald-150 text-center">
                        ✓ All Ward Fees Cleared For Current Academic Session
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Class-wise fee status tracker */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm lg:col-span-2">
              <div className="border-b border-slate-100 pb-2 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 text-sm">Class-Wise Collection Ledger</h3>
                <span className="text-[10px] font-mono text-slate-400">SESSION {activeYear}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 font-mono uppercase tracking-wider text-[10px] border-b border-slate-100">
                      <th className="py-2.5 px-3">Class Standard</th>
                      <th className="py-2.5 px-3 text-right">Target Base</th>
                      <th className="py-2.5 px-3 text-right">Concessions</th>
                      <th className="py-2.5 px-3 text-right">Collected Amount</th>
                      <th className="py-2.5 px-3 text-right">Defaulter Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {classStats.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 font-bold text-slate-700">{s.className}</td>
                        <td className="py-3 px-3 text-right text-slate-500">INR {s.expected.toLocaleString()}</td>
                        <td className="py-3 px-3 text-right text-amber-600">- INR {s.concessions.toLocaleString()}</td>
                        <td className="py-3 px-3 text-right text-emerald-700 font-bold">INR {s.paid.toLocaleString()}</td>
                        <td className="py-3 px-3 text-right text-rose-600 font-bold">INR {s.outstanding.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Quick reminders & SMS logs */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-left">
            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-150 pb-2 mb-4">
              Fee Reminder Activity (device history)
            </h3>
            {remindersLog.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4">No reminder broadcasts dispatched yet.</p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[180px] overflow-y-auto">
                {remindersLog.map((log) => (
                  <div key={log.id} className="py-2.5 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-700">{log.type}</p>
                      <p className="text-[10px] text-slate-400">Student: {log.name} (GR: {log.grNumber}) | Date: {log.date}</p>
                    </div>
                    <span className="bg-emerald-50 text-emerald-700 font-bold px-2.5 py-0.5 rounded text-[10px] uppercase font-mono">
                      {log.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: FEE MASTER HEADS CONFIGURATION */}
      {/* ======================================================== */}
      {activeTab === 'fee_heads' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
          
          {/* Fee Head Creation Form */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm lg:col-span-1">
            <div className="border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-800 text-sm">Add New Fee Head</h3>
              <p className="text-[11px] text-slate-400">Define customizable fee items and apply standard structures</p>
            </div>

            <form onSubmit={handleAddFeeHead} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Fee Head Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Computer Science Laboratory Fee"
                  value={newHead.name}
                  onChange={(e) => setNewHead({ ...newHead, name: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Amount (INR) *</label>
                <input
                  type="number"
                  placeholder="1500"
                  value={newHead.amount}
                  onChange={(e) => setNewHead({ ...newHead, amount: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Frequency *</label>
                <select
                  value={newHead.frequency}
                  onChange={(e) => setNewHead({ ...newHead, frequency: e.target.value as any })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  <option value="One Time">One Time</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Half-Yearly">Half-Yearly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Applicable Classes *</label>
                <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto p-2 bg-slate-50 border border-slate-150 rounded-lg">
                  {feeClassOptions.map(classOption => {
                    const selectedIds = newHead.applicableClasses || [];
                    const checked = classOption.ids.some(classId => selectedIds.includes(classId));
                    return (
                      <label key={classOption.key} className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => {
                            const currentIds = newHead.applicableClasses || [];
                            const nextIds = event.target.checked
                              ? Array.from(new Set([...currentIds, ...classOption.ids]))
                              : currentIds.filter(classId => !classOption.ids.includes(classId));
                            setNewHead({ ...newHead, applicableClasses: nextIds });
                          }}
                          className="rounded text-indigo-600"
                        />
                        <span>{classOption.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-2">
                <span className="font-semibold text-slate-500">Optional Fee Head?</span>
                <input
                  type="checkbox"
                  checked={newHead.isOptional || false}
                  onChange={(e) => setNewHead({ ...newHead, isOptional: e.target.checked })}
                  className="rounded text-indigo-600"
                />
              </div>

              <button
                type="submit"
                disabled={!isHM}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-sm cursor-pointer"
              >
                {!isHM ? 'Read-only: Headmaster Clearance Required' : 'Save & Publish Fee Head'}
              </button>
            </form>
          </div>

          {/* Fee Heads List */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm lg:col-span-2">
            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-150 pb-2">
              Existing Fee Heads & Scheduled Ledger
            </h3>

            <div className="divide-y divide-slate-100">
              {feeHeads.map(fh => (
                <div key={fh.id} className="py-3.5 flex justify-between items-start text-xs gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-800 text-sm">{fh.name}</p>
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${
                        fh.isOptional ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-blue-50 text-blue-700 border border-blue-100'
                      }`}>
                        {fh.isOptional ? 'Optional' : 'Mandatory'}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[10px]">
                      Frequency: <strong>{fh.frequency}</strong> | Applicable Standards:{' '}
                      <strong>
                        {formatApplicableClasses(fh.applicableClasses)}
                      </strong>
                    </p>
                  </div>

                  <div className="text-right space-y-2">
                    <p className="font-black text-indigo-950 font-mono text-sm">INR {fh.amount}</p>
                    {isHM && (
                      <button type="button"
                        onClick={() => handleDeleteFeeHead(fh.id)}
                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: STUDENT FEE PROFILES & COLLECTION DESK */}
      {/* ======================================================== */}
      {activeTab === 'profiles' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
          
          {/* Side Roster list with Search */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm lg:col-span-1">
            <div className="space-y-2">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider font-mono">Student Ledger Directory</h3>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by student, GR or mobile..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                />
              </div>

              {/* Quick Filter Controls */}
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="px-2 py-1 text-[11px] border border-slate-200 rounded-lg bg-white"
                >
                  <option value="all">All Classes</option>
                  {feeClassOptions.map(classOption => (
                    <option key={classOption.key} value={classOption.key}>{classOption.label}</option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2 py-1 text-[11px] border border-slate-200 rounded-lg bg-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                  <option value="unpaid">Unpaid</option>
                </select>
              </div>
            </div>

            {/* List */}
            <div className="space-y-1.5 max-h-[400px] overflow-y-auto divide-y divide-slate-100 pr-1">
              {filteredProfiles.map(p => (
                <button
                  key={p.grNumber}
                  onClick={() => setSelectedProfile(p)}
                  className={`w-full text-left p-2.5 rounded-xl transition-all flex justify-between items-center ${
                    selectedProfile?.grNumber === p.grNumber ? 'bg-indigo-50 border border-indigo-100 font-bold text-indigo-900' : 'hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <div className="space-y-0.5">
                    <p className="text-xs">{p.studentName}</p>
                    <p className="text-[10px] text-slate-400 font-mono">GR No: {p.grNumber} | {p.className}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                      p.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : p.status === 'Partial' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      {p.status}
                    </span>
                    <p className="text-[10px] font-mono text-slate-500 mt-1">Due: INR {p.balance}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Student Profile Detail, Collection Desk, Concession console */}
          <div className="lg:col-span-2 space-y-6">
            {selectedProfile ? (
              <>
                {/* Profile detail card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="border-b border-slate-150 pb-3 flex justify-between items-start flex-wrap gap-2">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{selectedProfile.studentName}</h3>
                      <p className="text-xs text-slate-500 font-mono">
                        GR Number: <strong className="text-indigo-950 font-bold">{selectedProfile.grNumber}</strong> | 
                        Admission Number: <strong>{selectedProfile.admissionNo}</strong> | 
                        Class Standard: <strong>{selectedProfile.className} - {selectedProfile.division}</strong>
                      </p>
                      <p className="text-[11px] text-slate-400 font-medium">
                        Parent Guardian: {selectedProfile.parentName} ({selectedProfile.parentMobile})
                      </p>
                    </div>

                    <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase border ${
                      selectedProfile.status === 'Paid' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : selectedProfile.status === 'Partial' 
                        ? 'bg-amber-50 text-amber-700 border-amber-200' 
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {selectedProfile.status}
                    </span>
                  </div>

                  {/* Summary of charges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-center">
                    <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl">
                      <span className="text-[9px] uppercase font-sans text-slate-400 font-bold">Total Annual base</span>
                      <p className="text-sm font-bold text-slate-800">INR {selectedProfile.totalFee}</p>
                    </div>

                    <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl">
                      <span className="text-[9px] uppercase font-sans text-rose-700 font-bold">Outstanding Fine</span>
                      <p className="text-sm font-bold text-rose-800">INR {selectedProfile.fineAmount}</p>
                    </div>

                    <div className="p-3 bg-amber-50 border border-amber-150 rounded-xl">
                      <span className="text-[9px] uppercase font-sans text-amber-700 font-bold">Concession Cleared</span>
                      <p className="text-sm font-bold text-amber-800">INR {selectedProfile.concessionAmount}</p>
                    </div>

                    <div className="p-3 bg-emerald-50 border border-emerald-150 rounded-xl">
                      <span className="text-[9px] uppercase font-sans text-emerald-700 font-bold font-mono">Outstanding Balance</span>
                      <p className="text-sm font-bold text-emerald-800">INR {selectedProfile.balance}</p>
                    </div>
                  </div>

                  {/* Fee Heads break down for this specific class */}
                  <div className="space-y-2 p-3 bg-slate-50 border border-slate-150 rounded-xl text-[11px]">
                    <p className="font-bold text-slate-600">Applicable Fee Structure Breakdown:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-500 font-mono">
                      {feeHeads.filter(h => h.applicableClasses.includes(selectedProfile.classId)).map(h => (
                        <div key={h.id} className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                          <span>{h.name} ({h.frequency}):</span>
                          <span className="font-bold text-slate-700">INR {h.amount}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* COLLECTION FORM PANEL */}
                {selectedProfile.balance > 0 && isStaff && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">
                      Record New Receipt Collection (INR)
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Receipt Pay Amount *</label>
                        <input
                          type="number"
                          placeholder="e.g. 5000"
                          value={payAmount}
                          onChange={(e) => setPayAmount(Number(e.target.value))}
                          className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                        />
                        <div className="flex gap-2 mt-1.5">
                          <button
                            onClick={() => setPayAmount(selectedProfile.balance)}
                            className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                          >
                            Set Full Balance (INR {selectedProfile.balance})
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Payment Mode *</label>
                        <select
                          value={paymentMode}
                          onChange={(e) => setPaymentMode(e.target.value as any)}
                          className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                        >
                          <option value="Cash">Cash</option>
                          <option value="UPI">UPI Digital Payment</option>
                          <option value="QR Code">Live QR Code</option>
                          <option value="Bank Transfer">Direct Bank Transfer (NEFT/IMPS)</option>
                          <option value="Cheque">Bank Cheque</option>
                          <option value="Demand Draft">Demand Draft (DD)</option>
                        </select>
                      </div>
                    </div>

                    {paymentMode === 'QR Code' && (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                        <Shield className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
                        <div className="text-xs text-amber-900 space-y-1">
                          <p className="font-bold">Verified payment QR is not configured for this school.</p>
                          <p>Classtago will not generate a placeholder UPI address. Accept payment only through the school's verified banking/UPI setup and record the real transaction reference below.</p>
                          <p className="font-semibold">Amount to record: INR {payAmount || '0'}</p>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Transaction Ref No / Details (e.g. Cheque No / UPI Transaction ID)</label>
                      <input
                        type="text"
                        placeholder="Cheque No 456712, SBI Bank / UPI ID 1234..."
                        value={paymentDetails}
                        onChange={(e) => setPaymentDetails(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                      />
                    </div>

                    <button
                      onClick={() => handleProcessPayment()}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm cursor-pointer"
                    >
                      Process Transaction & Issue Official Receipt
                    </button>
                  </div>
                )}



                {/* ADVANCED ADMIN DESK: Fines & Concessions request console */}
                {isStaff && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* Concessions console */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                      <div className="border-b border-slate-100 pb-1.5">
                        <h4 className="font-bold text-slate-800 text-xs">Concessions Desk</h4>
                      </div>

                      {selectedProfile.concessionStatus === 'PendingApproval' ? (
                        <div className="p-3 bg-amber-50 text-amber-800 rounded-xl text-xs space-y-1">
                          <p className="font-bold">Pending Headmaster Override</p>
                          <p className="text-[10px]">A concession proposal has been logged and is awaiting administrative sign-off.</p>
                        </div>
                      ) : selectedProfile.concessionStatus === 'Approved' ? (
                        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs space-y-1">
                          <p className="font-bold">✓ Concession Active</p>
                          <p className="text-[10px] font-mono">Amount Waived: INR {selectedProfile.concessionAmount}</p>
                        </div>
                      ) : (
                        <form onSubmit={handleApplyConcession} className="space-y-3 text-xs">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-400 uppercase">Discount Type</label>
                              <select
                                value={concessionType}
                                onChange={(e) => setConcessionType(e.target.value as any)}
                                className="w-full px-2 py-1 text-[11px] border border-slate-200 rounded-lg bg-white"
                              >
                                <option value="Fixed">Fixed Amount</option>
                                <option value="Percentage">Percentage %</option>
                                <option value="Scholarship">EBC / Scholarship</option>
                                <option value="Staff Discount">Staff Child Discount</option>
                                <option value="Sibling">Sibling Discount</option>
                                <option value="Custom">Custom specified</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-semibold text-slate-400 uppercase">Val (Amt / %)</label>
                              <input
                                type="number"
                                placeholder="500"
                                value={concessionValue}
                                onChange={(e) => setConcessionValue(Number(e.target.value))}
                                className="w-full px-2 py-1 text-[11px] border border-slate-200 rounded-lg bg-white"
                              />
                            </div>
                          </div>

                          <button
                            type="submit"
                            className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] rounded"
                          >
                            {isHM ? 'Apply Concession Instantly' : 'Submit Concession Request'}
                          </button>
                        </form>
                      )}
                    </div>

                    {/* Fine Levies console */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 text-xs text-left">
                      <div className="border-b border-slate-100 pb-1.5 flex justify-between items-center">
                        <h4 className="font-bold text-slate-800 text-xs">Fines & late compliance</h4>
                        {selectedProfile.fineAmount > 0 && (
                          <button
                            onClick={handleWaiveFines}
                            className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                          >
                            Waive All
                          </button>
                        )}
                      </div>

                      <form onSubmit={handleApplyManualFine} className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-400 uppercase">Levy Fine Amount</label>
                            <input
                              type="number"
                              placeholder="100"
                              value={manualFineAmt}
                              onChange={(e) => setManualFineAmt(Number(e.target.value))}
                              className="w-full px-2 py-1 text-[11px] border border-slate-200 rounded-lg bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold text-slate-400 uppercase">Fine Reason</label>
                            <input
                              type="text"
                              placeholder="Late exam fee..."
                              value={manualFineReason}
                              onChange={(e) => setManualFineReason(e.target.value)}
                              className="w-full px-2 py-1 text-[11px] border border-slate-200 rounded-lg bg-white"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] rounded"
                        >
                          Levy Manual Fine Charge
                        </button>
                      </form>
                    </div>

                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl text-slate-400 space-y-2">
                <CircleDollarSign className="w-12 h-12 mx-auto text-slate-300" />
                <p className="text-xs italic">Select a student from the ledger roster to load active profiles.</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: CONCESSION APPROVAL BOARD (HM ONLY) */}
      {/* ======================================================== */}
      {activeTab === 'concessions' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm text-left animate-fade-in">
          <div className="border-b border-slate-150 pb-2">
            <h3 className="font-bold text-slate-800 text-sm">Concession & Scholarship Authorizations Desk</h3>
            <p className="text-[11px] text-slate-400">Manage, authorize, and reject tuition discounts or sibling relief programs</p>
          </div>

          {concessionRequests.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-6 text-center">No concession requests logged in system records.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 font-mono uppercase tracking-wider text-[10px] border-b border-slate-100">
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Class Standard</th>
                    <th className="py-2.5 px-3">Discount Program</th>
                    <th className="py-2.5 px-3 text-right">Value Rate</th>
                    <th className="py-2.5 px-3">Requested By</th>
                    <th className="py-2.5 px-3">Submission Date</th>
                    <th className="py-2.5 px-3 text-center">Authorization Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {concessionRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-bold text-slate-700">{req.studentName}</td>
                      <td className="py-3 px-3 font-mono text-slate-500">{req.className}</td>
                      <td className="py-3 px-3">
                        <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded text-[10px] border border-indigo-100">
                          {req.concessionType}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-800">
                        {req.concessionType === 'Percentage' ? `${req.value}%` : `INR ${req.value}`}
                      </td>
                      <td className="py-3 px-3 text-slate-500">{req.requestedBy}</td>
                      <td className="py-3 px-3 font-mono text-slate-400">{req.requestedDate}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono ${
                          req.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' : req.status === 'Rejected' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700 animate-pulse'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {req.status === 'Pending' && (
                          <div className="flex gap-1.5 justify-end">
                            <button
                              onClick={() => handleApproveConcession(req)}
                              className="px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold cursor-pointer"
                              disabled={!isHM || feeWorkflowBusy}
                            >
                              Approve
                            </button>
                            <button type="button"
                              onClick={() => handleRejectConcession(req)}
                              className="px-2 py-1 bg-red-600 text-white rounded text-[10px] font-bold cursor-pointer"
                              disabled={!isHM || feeWorkflowBusy}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {req.status !== 'Pending' && (
                          <span className="text-[10px] text-slate-400">Processed by: {req.approvedBy || 'HM'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: RECEIPT LEDGER */}
      {/* ======================================================== */}
      {activeTab === 'receipts' && (
        <div className="space-y-6">
          
          {cloudCancellationRequests.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-black text-amber-950">Cloud Receipt Cancellation Queue</h3><p className="mt-1 text-[11px] text-amber-800">Clerk requests and Headmaster decisions stay synchronized across devices.</p></div><span className="rounded-full bg-white px-3 py-1 text-[10px] font-black text-amber-800">{cloudCancellationRequests.filter(request => request.status === 'Pending').length} pending</span></div>
              <div className="mt-4 space-y-2">{cloudCancellationRequests.map(request => (
                <div key={request.id} className="rounded-xl border border-amber-200 bg-white p-3 text-xs"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-black text-slate-800">{request.receiptNo} · {request.studentName}</div><div className="mt-1 text-[10px] text-slate-500">GR {request.grNumber} · INR {request.amountPaid.toLocaleString()} · {request.reason}</div></div><span className={`rounded-full px-2 py-1 text-[9px] font-black ${request.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' : request.status === 'Rejected' ? 'bg-rose-50 text-rose-700' : 'bg-amber-100 text-amber-800'}`}>{request.status}</span></div>{isHM && request.status === 'Pending' && <div className="mt-3 flex gap-2"><button type="button" disabled={feeWorkflowBusy} onClick={() => void handleApproveCloudCancellation(request)} className="rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-black text-white disabled:opacity-50">Approve Cancellation</button><button type="button" disabled={feeWorkflowBusy} onClick={() => void handleRejectCloudCancellation(request)} className="rounded-lg bg-rose-600 px-3 py-2 text-[10px] font-black text-white disabled:opacity-50">Reject</button></div>}{request.decisionNote && <div className="mt-2 text-[10px] text-rose-600">{request.decisionNote}</div>}</div>
              ))}</div>
            </div>
          )}

          {/* Receipts register table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm text-left">
            <div className="border-b border-slate-150 pb-2">
              <h3 className="font-bold text-slate-800 text-sm">Receipt Ledger Register</h3>
              <p className="text-[11px] text-slate-400">Audit, download, or review past student collections</p>
            </div>

            {transactions.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">No active collections logged in digital registry.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 font-mono uppercase tracking-wider text-[10px] border-b border-slate-100">
                      <th className="py-2.5 px-3">Receipt Number</th>
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3">Class</th>
                      <th className="py-2.5 px-3">Payment Mode</th>
                      <th className="py-2.5 px-3 text-right">Cleared Amount</th>
                      <th className="py-2.5 px-3">Cleared Date</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 font-bold font-mono text-indigo-900">{tx.receiptNo}</td>
                        <td className="py-3 px-3 text-slate-700">{tx.studentName}</td>
                        <td className="py-3 px-3 font-mono text-slate-400">{tx.className} - {tx.division}</td>
                        <td className="py-3 px-3 text-slate-500">{tx.paymentMode}</td>
                        <td className="py-3 px-3 text-right font-black text-slate-900">INR {tx.amountPaid}</td>
                        <td className="py-3 px-3 font-mono text-slate-400">{tx.paymentDate}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono uppercase ${
                            tx.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : tx.status === 'Cancelled' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700 animate-pulse'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right space-x-2">
                          <button
                            onClick={() => setSelectedReceipt(tx)}
                            className="text-indigo-600 hover:underline font-bold text-[11px] cursor-pointer"
                          >
                            View Slip
                          </button>
                          
                          {tx.status === 'Active' && (
                            <button
                              onClick={() => {
                                const reason = prompt('Specify Cancellation Reason:');
                                if (reason) handleRequestCancellation(tx, reason);
                              }}
                              className="text-rose-600 hover:underline font-bold text-[11px] cursor-pointer"
                            >
                              Cancel Receipt
                            </button>
                          )}

                          {tx.status === 'CancellationPending' && isHM && (
                            <button
                              onClick={() => handleApproveCancellation(tx)}
                              className="px-2 py-0.5 bg-rose-600 text-white rounded font-bold text-[10px] cursor-pointer"
                            >
                              Approve Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Interactive Print Preview Area */}
          {selectedReceipt && (
            <div className="bg-slate-100 border border-slate-300 rounded-2xl p-6 overflow-x-auto relative text-left">
              <div className="flex justify-between items-center no-print mb-4">
                <span className="bg-slate-700 text-white font-mono text-[9px] px-2.5 py-0.5 rounded-md uppercase font-bold">
                  A4 HIGH-FIDELITY PRINT PREVIEW
                </span>
                <div className="flex gap-2">
                  <select
                    value={receiptPrintSize}
                    onChange={(e) => setReceiptPrintSize(e.target.value as any)}
                    className="px-2 py-1 text-xs border border-slate-200 rounded bg-white font-bold"
                  >
                    <option value="A4">A4 Standard Sheet</option>
                    <option value="HalfPage">Half Page Slip</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => printSectionById('print-area', 'Official Fee Payment Receipt')}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Bill Layout</span>
                  </button>
                  <button
                    onClick={() => setSelectedReceipt(null)}
                    className="p-1.5 hover:bg-slate-200 text-slate-500 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Print Sheet Container */}
              <div id="print-area" className={`bg-white p-10 shadow-lg mx-auto text-slate-900 text-xs font-sans relative border border-slate-300 ${
                receiptPrintSize === 'A4' ? 'max-w-[210mm] min-h-[297mm]' : 'max-w-[210mm] min-h-[148mm]'
              }`}>
                
                {/* Header Letterhead */}
                <div className="text-center space-y-1 relative pb-4 border-b border-slate-800">
                  <div className="absolute left-0 top-0 w-16 h-16 border border-slate-200 bg-slate-50 rounded-md flex flex-col items-center justify-center text-[8px] text-slate-500 font-mono">
                    <Shield className="w-4 h-4 mb-1" />
                    <span>RECEIPT</span>
                    <span className="font-bold">{selectedReceipt.receiptNo}</span>
                  </div>
                  
                  {managementName && (
                    <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase block">
                      {managementName}
                    </span>
                  )}
                  <h1 className="text-xl font-black uppercase text-indigo-950 tracking-tight">
                    {schoolName}
                  </h1>
                  {schoolAddress && (
                    <p className="text-[9px] text-slate-600">{schoolAddress}</p>
                  )}
                  <p className="text-[9px] font-mono uppercase tracking-wider text-slate-500">
                    UDISE: {schoolUdise} | School Code: {schoolCode}
                  </p>
                  <p className="text-[11px] font-extrabold bg-slate-900 text-white py-1 inline-block px-4 mt-2 uppercase tracking-widest rounded-md">
                    Official Fee Payment Receipt
                  </p>
                </div>

                {/* Receipt metadata */}
                <div className="grid grid-cols-2 gap-4 border border-slate-200 p-4 rounded text-xs mt-6 leading-relaxed">
                  <div>
                    <p><strong>Receipt No:</strong> <span className="font-mono font-bold text-indigo-950">{selectedReceipt.receiptNo}</span></p>
                    <p><strong>Date of Payment:</strong> <span className="font-mono">{selectedReceipt.paymentDate}</span></p>
                    <p><strong>Collected By:</strong> {selectedReceipt.collectedBy}</p>
                    <p><strong>Academic Session:</strong> {selectedReceipt.academicYear}</p>
                  </div>
                  <div>
                    <p><strong>Student Name:</strong> <strong className="text-indigo-900">{selectedReceipt.studentName}</strong></p>
                    <p><strong>GR Number:</strong> <span className="font-mono font-bold">{selectedReceipt.grNumber}</span></p>
                    <p><strong>Standard Room:</strong> {selectedReceipt.className} - {selectedReceipt.division}</p>
                    <p><strong>Payment Mode:</strong> {selectedReceipt.paymentMode} ({selectedReceipt.paymentModeDetails || 'N/A'})</p>
                  </div>
                </div>

                {/* Charges matrix */}
                <table className="w-full text-xs text-left border border-slate-200 mt-6">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-2 px-3">Standard Fee Account Head</th>
                      <th className="py-2 px-3">Frequency</th>
                      <th className="py-2 px-3 text-right">Base Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="py-2.5 px-3">Integrated Annual Term Fees (Tuition, Laboratory, Sports & Gymkhana, Library)</td>
                      <td className="py-2.5 px-3">Yearly Scheduled</td>
                      <td className="py-2.5 px-3 text-right font-mono">INR {selectedReceipt.amountPaid}</td>
                    </tr>
                    <tr className="bg-slate-50 font-black text-indigo-950 text-sm border-t border-slate-300">
                      <td colSpan={2} className="py-3 px-3 text-right uppercase">Net Liquid Amount Cleared:</td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-800">INR {selectedReceipt.amountPaid}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Verified markings */}
                <p className="text-center text-[10px] text-slate-500 italic mt-6">
                  * Receipt recorded in Classtago. Bank/UPI/Cash reconciliation remains subject to the school's official accounting records. *
                </p>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-8 pt-24 text-center text-xs mt-auto">
                  <div>
                    <div className="h-8 border-b border-dashed border-slate-400 w-2/3 mx-auto"></div>
                    <p className="mt-2 font-bold text-slate-700">Accounting Clerk Signature</p>
                  </div>
                  <div>
                    <div className="h-8 border-b border-dashed border-slate-400 w-2/3 mx-auto"></div>
                    <p className="mt-2 font-bold text-slate-700">Principal Headmaster</p>
                  </div>
                </div>

                {/* Footnotes */}
                <div className="absolute bottom-6 left-10 right-10 flex justify-between text-[8px] text-slate-400 font-mono">
                  <span>* {schoolName} Fee Ledger *</span>
                  <span>Extracted On: {new Date().toISOString().substring(0, 10)}</span>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 6: REPORTS & ANALYTICAL DESK */}
      {/* ======================================================== */}
      {activeTab === 'reports' && (
        <div id="fee-report-bundle-print" className="space-y-6 animate-fade-in text-left">
          
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="border-b border-slate-150 pb-2 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Analytical Report Engine</h3>
                <p className="text-[11px] text-slate-400">Generate, print, or review audit books and cash registers</p>
              </div>
              <button
                type="button"
                onClick={() => printSectionById('fee-report-bundle-print', 'Fees Reports & Analytical Bundle')}
                className="px-3.5 py-1.5 bg-indigo-600 text-white font-bold text-xs rounded-lg shadow cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Complete Report Bundle</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Daily Cash Book summary */}
              <div className="p-4 bg-slate-50 rounded-xl space-y-3">
                <h4 className="font-bold text-slate-800 text-xs border-b border-slate-200 pb-1.5">
                  Daily Cash Book Summary ({new Date().toISOString().substring(0, 10)})
                </h4>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Fee collections recorded today:</span>
                    <span>INR {dailyCollection.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-dashed border-slate-300 pt-2 text-[10px] leading-5 text-slate-500">
                    Opening/closing cash balances belong to the Accounting Cash Book and are not fabricated inside Fees.
                  </div>
                </div>
              </div>

              {/* Fee Defaulters summary list */}
              <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-xl space-y-3">
                <h4 className="font-bold text-rose-900 text-xs border-b border-rose-200 pb-1.5">
                  Fee Defaulters Directory (Top Outstanding Dues)
                </h4>
                <div className="divide-y divide-rose-100 max-h-[140px] overflow-y-auto">
                  {studentProfiles.filter(p => p.balance > 0).slice(0, 5).map(p => (
                    <div key={p.grNumber} className="py-2 flex justify-between items-center text-[11px]">
                      <div>
                        <p className="font-bold text-slate-800">{p.studentName}</p>
                        <p className="text-[9px] text-slate-400">GR No: {p.grNumber} | {p.className}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-rose-700">INR {p.balance}</span>
                        <button
                          onClick={() => handlePrepareReminder(p)}
                          className="px-2 py-0.5 bg-rose-600 text-white rounded text-[9px] font-bold cursor-pointer"
                        >
                          Prepare reminder
                        </button>
                      </div>
                    </div>
                  ))}
                  {studentProfiles.filter(p => p.balance > 0).length === 0 && (
                    <p className="text-xs text-emerald-700 italic py-2">✓ Zero active fee outstanding defaulters!</p>
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

    </div>
  );
}
