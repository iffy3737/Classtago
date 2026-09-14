import React, { useState, useEffect } from 'react';
import { 
  CircleDollarSign, 
  Landmark, 
  FileText, 
  Calendar, 
  Printer, 
  ShieldAlert, 
  Plus, 
  Trash2, 
  Check, 
  Search, 
  Download, 
  Sparkles,
  Award,
  TrendingUp,
  User,
  Settings,
  AlertCircle,
  CheckCircle,
  FileSpreadsheet,
  Signature
} from 'lucide-react';
import { LocalERPDatabase } from '../lib/supabase';
import { UserRole } from '../types';
import SmartHRMSModule, { ServiceBookEntry, LoanRecord, IncrementRecord } from './SmartHRMSModule';
import UrduWrapper from './UrduWrapper';
import { printSectionById } from '../utils/printSection';
import { requestActionConfirm } from '../lib/actionConfirm';

interface SmartPayrollManagerProps {
  lang: 'en' | 'hi' | 'ur';
  user: { id: string; name: string; role: string; username: string };
  onRefreshData?: () => void;
  activeFeatureId?: string | null;
}

export interface SalaryHead {
  id: string;
  name: string;
  type: 'income' | 'deduction';
  isSystem: boolean;
  defaultValue: number;
}

export interface EmployeeSalaryProfile {
  employeeId: string;
  employeeName: string;
  designation: string;
  joiningDate: string;
  heads: Record<string, number>; // headId -> amount
}

export interface ProcessedSalaryMonth {
  id: string; // e.g. "2026-06"
  monthYear: string; // e.g. "June 2026"
  academicYear: string;
  status: 'Draft' | 'Approved' | 'Paid';
  processedBy: string;
  processedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  records: ProcessedEmployeeSalary[];
}

export interface ProcessedEmployeeSalary {
  employeeId: string;
  employeeName: string;
  designation: string;
  shalarthId: string;
  pan: string;
  aadhaar: string;
  joiningDate: string;
  workingDays: number;
  lwpDays: number;
  incomes: Record<string, number>;
  deductions: Record<string, number>;
  grossIncome: number;
  totalDeductions: number;
  netPay: number;
  adjustments: number;
  adjustmentRemark: string;
  loanDeductions: Record<string, number>; // loanId -> amount
}

type PayrollWorkspaceTab = 'payroll' | 'setup' | 'hrms' | 'increments' | 'loans' | 'certificates' | 'reports';

const PAYROLL_FEATURE_TAB: Record<string, PayrollWorkspaceTab> = {
  'payroll-processing': 'payroll',
  'salary-structure-setup': 'setup',
  'digital-service-book': 'hrms',
  'increment-desk': 'increments',
  'loans-advances': 'loans',
  'payroll-certificates': 'certificates',
  'payroll-reports': 'reports'
};

export interface CertificateIssued {
  id: string;
  certificateNo: string;
  outwardNo: string;
  employeeId: string;
  employeeName: string;
  type: 'salary' | 'experience';
  monthsSelected: string[];
  issuedDate: string;
  purpose: string;
  hash: string;
}

export default function SmartPayrollManager({ lang, user, onRefreshData, activeFeatureId }: SmartPayrollManagerProps) {
  const isHM = user.role === 'headmaster';
  const isClerk = user.role === 'clerk';
  const canManage = isHM || isClerk;
  const academicSetup = LocalERPDatabase.getAcademicSetup();
  const schoolProfile = academicSetup?.schoolProfile;
  const schoolName = String(schoolProfile?.schoolName || 'School');
  const schoolCode = String(schoolProfile?.schoolCode || '—');
  const schoolUdise = String(schoolProfile?.udiseCode || '—');
  const schoolLocation = [schoolProfile?.villageCity, schoolProfile?.taluka, schoolProfile?.district, schoolProfile?.state, schoolProfile?.pinCode].filter(Boolean).join(', ');
  const headmasterName = String(schoolProfile?.principalName || (isHM ? user.name : '') || '');
  const schoolInitials = schoolName.split(/\s+/).filter(Boolean).slice(0, 3).map(part => part[0]?.toUpperCase()).join('') || 'SCH';

  // Active tabs
  const [activeTab, setActiveTab] = useState<PayrollWorkspaceTab>('payroll');
  
  useEffect(() => {
    if (!activeFeatureId) return;
    const nextTab = PAYROLL_FEATURE_TAB[activeFeatureId];
    if (!nextTab) return;
    setActiveTab(nextTab);
    window.setTimeout(() => {
      document.getElementById(`payroll-workspace-${nextTab}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }, [activeFeatureId]);

  // Salary Certificate States
  const [certType, setCertType] = useState<'salary_cert' | 'experience_cert'>('salary_cert');
  const [certEmployeeId, setCertEmployeeId] = useState<string>('');
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [certPurpose, setCertPurpose] = useState<string>('');
  const [outwardNo, setOutwardNo] = useState<string>('');
  const [viewingCertificate, setViewingCertificate] = useState<any | null>(null);
  const [experienceCert, setExperienceCert] = useState<any | null>(null);

  // Printing configurations
  const [printColorMode, setPrintColorMode] = useState<'color' | 'bw'>('color');
  const [printPageSize, setPrintPageSize] = useState<'A4' | 'A3'>('A4');
  const [printLayout, setPrintLayout] = useState<'portrait' | 'landscape'>('portrait');

  // Core state loaded from localStorage
  const [salaryHeads, setSalaryHeads] = useState<SalaryHead[]>([]);
  const [salaryProfiles, setSalaryProfiles] = useState<Record<string, Record<string, number>>>({});
  const [payrollHistory, setPayrollHistory] = useState<ProcessedSalaryMonth[]>([]);
  const [issuedCertificates, setIssuedCertificates] = useState<CertificateIssued[]>([]);

  // Local helper states
  const [activeAcademicYear, setActiveAcademicYear] = useState('');
  const [selectedProcessMonth, setSelectedProcessMonth] = useState(() => new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [manualAdjustmentId, setManualAdjustmentId] = useState<string>('');
  const [adjAmt, setAdjAmt] = useState<number>(0);
  const [adjRemark, setAdjRemark] = useState<string>('');

  // Setup heads form
  const [newHeadName, setNewHeadName] = useState('');
  const [newHeadType, setNewHeadType] = useState<'income' | 'deduction'>('income');
  const [newHeadVal, setNewHeadVal] = useState(0);

  // Editing individual profile basic salary
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editingProfileHeads, setEditingProfileHeads] = useState<Record<string, number>>({});

  useEffect(() => {
    // Sync academic year
    const setup = LocalERPDatabase.getAcademicSetup();
    const activeY = setup.academicYears?.find(y => y.isActive)?.year || '';
    setActiveAcademicYear(activeY);

    // 1. Load Salary Heads
    const storedHeads = localStorage.getItem('nhs_erp_salary_heads');
    let headsList: SalaryHead[] = [];
    if (storedHeads) {
      headsList = JSON.parse(storedHeads);
      setSalaryHeads(headsList);
    }  else {
      setSalaryHeads([]);
      headsList = [];
    }

    // 2. Load Employee Salary Profiles (Default mappings)
    const storedProfiles = localStorage.getItem('nhs_erp_employee_salary_profiles');
    if (storedProfiles) {
      setSalaryProfiles(JSON.parse(storedProfiles));
    }  else {
      setSalaryProfiles({});
    }

    // 3. Load Processed Payrolls History
    const storedPayroll = localStorage.getItem('nhs_erp_processed_payroll_months');
    if (storedPayroll) {
      setPayrollHistory(JSON.parse(storedPayroll));
    }  else {
      setPayrollHistory([]);
    }

    // 4. Load Issued Certificates registry
    const storedCerts = localStorage.getItem('nhs_erp_issued_salary_certificates');
    if (storedCerts) {
      setIssuedCertificates(JSON.parse(storedCerts));
    }
  }, []);

  const saveSalaryHeads = (updated: SalaryHead[]) => {
    setSalaryHeads(updated);
    localStorage.setItem('nhs_erp_salary_heads', JSON.stringify(updated));
  };

  const saveSalaryProfiles = (updated: Record<string, Record<string, number>>) => {
    setSalaryProfiles(updated);
    localStorage.setItem('nhs_erp_employee_salary_profiles', JSON.stringify(updated));
  };

  const savePayrollHistory = (updated: ProcessedSalaryMonth[]) => {
    setPayrollHistory(updated);
    localStorage.setItem('nhs_erp_processed_payroll_months', JSON.stringify(updated));
  };

  const saveIssuedCerts = (updated: CertificateIssued[]) => {
    setIssuedCertificates(updated);
    localStorage.setItem('nhs_erp_issued_salary_certificates', JSON.stringify(updated));
  };

  // Add / Remove Salary Head (Dynamic Salary structures)
  const handleAddHead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHeadName.trim()) return;

    const id = `h_custom_${Date.now()}`;
    const newHead: SalaryHead = {
      id,
      name: newHeadName.trim(),
      type: newHeadType,
      isSystem: false,
      defaultValue: newHeadVal
    };

    const updatedHeads = [...salaryHeads, newHead];
    saveSalaryHeads(updatedHeads);

    // Update all existing salary profiles to include this head with its default value
    const updatedProfiles = { ...salaryProfiles };
    Object.keys(updatedProfiles).forEach(empId => {
      updatedProfiles[empId][id] = newHeadVal;
    });
    saveSalaryProfiles(updatedProfiles);

    setNewHeadName('');
    setNewHeadVal(0);

    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role as any,
      'CREATE_SALARY_HEAD',
      'Payroll Master',
      `Created custom salary head: ${newHeadName} (${newHeadType})`
    );

    alert(`Salary Head "${newHeadName}" successfully integrated school-wide!`);
  };

  const handleDeleteHead = async (id: string) => {
    const target = salaryHeads.find(h => h.id === id);
    if (!target || target.isSystem) return alert('System-defined core salary heads cannot be removed');

    if (!(await requestActionConfirm({ title: 'Delete salary head?', message: `Are you sure you want to permanently delete "${target.name}"? This removes it from all structures and historic drafts.`, confirmLabel: 'Delete Salary Head', tone: 'danger' }))) return;

    const updatedHeads = salaryHeads.filter(h => h.id !== id);
    saveSalaryHeads(updatedHeads);

    // Delete from profiles
    const updatedProfiles = { ...salaryProfiles };
    Object.keys(updatedProfiles).forEach(empId => {
      delete updatedProfiles[empId][id];
    });
    saveSalaryProfiles(updatedProfiles);

    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role as any,
      'DELETE_SALARY_HEAD',
      'Payroll Master',
      `Deleted custom salary head: ${target.name}`
    );
  };

  // Process / Generate Payroll
  const handleProcessPayroll = () => {
    const [year, monthNum] = selectedProcessMonth.split('-');
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthLabel = `${monthNames[parseInt(monthNum) - 1]} ${year}`;

    // Get all employees
    const staffList = LocalERPDatabase.getUsers().filter(u => (u.role === 'teacher' || u.role === 'clerk') && u.isActive && u.status === 'Active');
    const profiles = LocalERPDatabase.getAcademicSetup().teacherProfiles || [];

    // Load active approved leave applications to calculate Leave Without Pay (LWP)
    const storedLeaves = localStorage.getItem('nhs_erp_student_leaves');
    const leaves: any[] = storedLeaves ? JSON.parse(storedLeaves) : [];
    
    // Load active loans with repayment starting on or before selected month
    const storedLoans = localStorage.getItem('nhs_erp_loans');
    const loansList: LoanRecord[] = storedLoans ? JSON.parse(storedLoans) : [];

    const processedRecords: ProcessedEmployeeSalary[] = staffList.map(emp => {
      const p = profiles.find(prof => prof.id === emp.id || prof.shalarthId === emp.shalarthId);
      const paySetup = salaryProfiles[emp.id] || {};

      // 1. Calculate Leaves & LWP
      // Find approved leaves of type 'Leave Without Pay' or 'LWP' for this employee during this selected month
      const empLeaves = leaves.filter(l => 
        l.applicantId === emp.id && 
        l.status === 'Approved' && 
        l.leaveType.toLowerCase().includes('without pay') || l.leaveType.toUpperCase() === 'LWP'
      );

      let lwpDays = 0;
      empLeaves.forEach(l => {
        // Basic date overlap calculation within the processed month
        const start = new Date(l.startDate);
        const end = new Date(l.endDate);
        const monthStart = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
        const monthEnd = new Date(parseInt(year), parseInt(monthNum), 0);

        const overlapStart = start > monthStart ? start : monthStart;
        const overlapEnd = end < monthEnd ? end : monthEnd;

        if (overlapStart <= overlapEnd) {
          const diffTime = Math.abs(overlapEnd.getTime() - overlapStart.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          lwpDays += diffDays;
        }
      });

      const totalDaysInMonth = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
      const workingDays = totalDaysInMonth; // School operates on academic registers

      // Proportionately reduce incomes based on LWP
      const rawIncomes: Record<string, number> = {};
      const rawDeductions: Record<string, number> = {};
      
      let grossIncome = 0;
      let totalDeductions = 0;

      // Apply proportional calculation
      const lwpFactor = (workingDays - lwpDays) / workingDays;

      salaryHeads.forEach(head => {
        const standardAmt = paySetup[head.id] || 0;
        if (head.type === 'income') {
          // Proportionate deduction for LWP on core allowances, except basic structure elements if desired, but as per guidelines let's scale proportionately
          const actualAmt = Math.round(standardAmt * lwpFactor);
          rawIncomes[head.id] = actualAmt;
          grossIncome += actualAmt;
        } else {
          // Deduction heads (tax/professional/PF is standard or zero if they earned nothing, but let's keep it standard)
          rawDeductions[head.id] = standardAmt;
          totalDeductions += standardAmt;
        }
      });

      // 2. Fetch Loans Repayments
      const empLoans = loansList.filter(l => 
        l.employeeId === emp.id && 
        l.status === 'Active' && 
        l.balance > 0 &&
        l.repaymentStartMonth <= selectedProcessMonth
      );

      const loanDeductions: Record<string, number> = {};
      empLoans.forEach(l => {
        const deduction = Math.min(l.monthlyRecovery, l.balance);
        loanDeductions[l.id] = deduction;
        totalDeductions += deduction;
      });

      // Base net pay
      const netPay = grossIncome - totalDeductions;

      return {
        employeeId: emp.id,
        employeeName: emp.name,
        designation: emp.designation || p?.designation || 'Staff',
        shalarthId: emp.shalarthId || p?.shalarthId || 'N/A',
        pan: (p as any)?.pan || 'N/A',
        aadhaar: (p as any)?.aadhaar || 'N/A',
        joiningDate: p?.joiningDate || emp.joiningDate || '',
        workingDays,
        lwpDays,
        incomes: rawIncomes,
        deductions: rawDeductions,
        grossIncome,
        totalDeductions,
        netPay,
        adjustments: 0,
        adjustmentRemark: '',
        loanDeductions
      };
    });

    // Check if payroll already exists for this month. If so, replace/overwrite draft or block if approved
    const existing = payrollHistory.find(h => h.id === selectedProcessMonth);
    if (existing && existing.status === 'Approved') {
      return alert('This payroll month is already APPROVED and locked by the Headmaster. Records cannot be modified unless unlocked.');
    }

    const newProcessedMonth: ProcessedSalaryMonth = {
      id: selectedProcessMonth,
      monthYear: monthLabel,
      academicYear: activeAcademicYear,
      status: 'Draft',
      processedBy: user.name,
      processedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      records: processedRecords
    };

    const updatedHistory = payrollHistory.filter(h => h.id !== selectedProcessMonth);
    savePayrollHistory([newProcessedMonth, ...updatedHistory]);

    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role as any,
      'GENERATE_PAYROLL_DRAFT',
      'Payroll Module',
      `Generated monthly payroll draft for ${monthLabel} (${activeAcademicYear})`
    );

    alert(`Draft Payroll for ${monthLabel} processed successfully! Please review, add manual adjustments if authorized, and submit to Headmaster for sign-off.`);
  };

  // Authorized adjustments
  const handleSaveAdjustment = () => {
    if (!manualAdjustmentId) return;
    const currentMonthPayroll = payrollHistory.find(h => h.id === selectedProcessMonth);
    if (!currentMonthPayroll) return;
    if (currentMonthPayroll.status === 'Approved') return alert('Cannot adjust approved payroll.');

    const updatedRecords = currentMonthPayroll.records.map(r => {
      if (r.employeeId === manualAdjustmentId) {
        const netPay = r.grossIncome - r.totalDeductions + adjAmt;
        return {
          ...r,
          adjustments: adjAmt,
          adjustmentRemark: adjRemark,
          netPay
        };
      }
      return r;
    });

    const updatedMonth = {
      ...currentMonthPayroll,
      records: updatedRecords
    };

    const updatedHistory = payrollHistory.map(h => h.id === selectedProcessMonth ? updatedMonth : h);
    savePayrollHistory(updatedHistory);

    setManualAdjustmentId('');
    setAdjAmt(0);
    setAdjRemark('');

    alert('Adjustment saved successfully!');
  };

  // Sign off & post to Accounting Ledger (Headmaster only)
  const handleApprovePayroll = async (monthId: string) => {
    if (!isHM) return alert('Only the Headmaster holds authority to approve & sign-off school payroll registries.');
    
    const targetMonth = payrollHistory.find(h => h.id === monthId);
    if (!targetMonth) return;
    if (targetMonth.status === 'Approved') return;

    if (!(await requestActionConfirm({ title: 'Official payroll sign-off?', message: 'Proceed with Official Payroll Sign-off? This will lock salary metrics and automatically post a unified expense voucher to the central financial accounts.', confirmLabel: 'Sign Off Payroll', tone: 'warning' }))) return;

    // 1. Update status
    const updatedHistory = payrollHistory.map(h => {
      if (h.id === monthId) {
        return {
          ...h,
          status: 'Approved' as const,
          approvedBy: user.name,
          approvedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
        };
      }
      return h;
    });
    savePayrollHistory(updatedHistory);

    // 2. Automatically Deduct/Amortize Active Loans
    const storedLoans = localStorage.getItem('nhs_erp_loans');
    if (storedLoans) {
      let loansList: LoanRecord[] = JSON.parse(storedLoans);
      targetMonth.records.forEach(rec => {
        Object.entries(rec.loanDeductions).forEach(([loanId, val]) => {
          const dedAmt = val as number;
          loansList = loansList.map(loan => {
            if (loan.id === loanId) {
              const newBal = Math.max(0, loan.balance - dedAmt);
              const payments = [...loan.paymentsMade, {
                month: monthId,
                amount: dedAmt,
                date: new Date().toISOString().split('T')[0]
              }];
              return {
                ...loan,
                balance: newBal,
                paymentsMade: payments,
                status: newBal <= 0 ? 'Paid' as const : 'Active' as const
              };
            }
            return loan;
          });
        });
      });
      localStorage.setItem('nhs_erp_loans', JSON.stringify(loansList));
    }

    // 3. Post Voucher to central financial accounting system (localStorage key 'nhs_erp_vouchers')
    const totalGrossExp = targetMonth.records.reduce((sum, r) => sum + r.grossIncome, 0);
    const totalNetPay = targetMonth.records.reduce((sum, r) => sum + r.netPay, 0);
    const totalDeductions = totalGrossExp - totalNetPay;

    const storedVouchers = localStorage.getItem('nhs_erp_vouchers');
    const vouchersList = storedVouchers ? JSON.parse(storedVouchers) : [];

    const voucherNo = `VOU-PAYROLL-${monthId}-${Date.now().toString().substring(8)}`;
    const newVoucher = {
      id: `v_payroll_${monthId}_${Date.now()}`,
      voucherNo,
      type: 'Payment',
      date: new Date().toISOString().split('T')[0],
      financialYear: activeAcademicYear,
      debitAccountId: 'a_exp_salary', // Maps to standard salary expenses
      creditAccountId: 'a_bank_main', // Maps to general bank / treasury accounts
      amount: totalNetPay,
      narration: `Automated net salary disbursement for the period of ${targetMonth.monthYear}. Processed and certified by Headmaster.`,
      paymentMode: 'Internal Transfer',
      reconciliationStatus: 'Reconciled',
      approvalStatus: 'Approved',
      approvedBy: user.name,
      approvedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      createdBy: user.name,
      createdAt: new Date().toISOString(),
      isCancelled: false
    };

    localStorage.setItem('nhs_erp_vouchers', JSON.stringify([newVoucher, ...vouchersList]));

    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role as any,
      'APPROVE_PAYROLL_OFFICIAL',
      'Payroll Module',
      `Headmaster signed off payroll for ${targetMonth.monthYear}. Voucher ${voucherNo} posted to ledger.`
    );

    if (onRefreshData) onRefreshData();
    alert(`Success! central school accounting register updated with Voucher: ${voucherNo}. Salary slips are now verified and printable.`);
  };

  // Generate multi-month salary certificate (Up to 12 months)
  const handleGenerateSalaryCertificate = () => {
    if (!certEmployeeId) return alert('Select an employee first');
    if (selectedMonths.length === 0) return alert('Choose at least one salary month');

    const teacher = LocalERPDatabase.getUsers().find(u => u.id === certEmployeeId);
    if (!teacher) return;

    // Retrieve approved records for selected months
    const matchingMonthlyRecords: { monthLabel: string; record: ProcessedEmployeeSalary }[] = [];
    
    // Sort selected months chronologically
    const sortedMonths = [...selectedMonths].sort((a,b) => a.localeCompare(b));

    sortedMonths.forEach(mId => {
      const pMonth = payrollHistory.find(h => h.id === mId);
      if (pMonth && pMonth.status === 'Approved') {
        const rec = pMonth.records.find(r => r.employeeId === certEmployeeId);
        if (rec) {
          matchingMonthlyRecords.push({
            monthLabel: pMonth.monthYear,
            record: rec
          });
        }
      }
    });

    if (matchingMonthlyRecords.length === 0) {
      return alert('No APPROVED payroll records exist for the chosen months. Please ensure the payroll for those months has been processed and officially approved by the Headmaster.');
    }

    const uniqueNo = `CERT-SAL-${Date.now().toString().substring(6)}`;
    const hash = (globalThis.crypto?.randomUUID?.() || `REC-${Date.now()}`).replace(/-/g, '').slice(0, 12).toUpperCase(); // internal record reference

    const newCert: CertificateIssued = {
      id: `cert_${Date.now()}`,
      certificateNo: uniqueNo,
      outwardNo,
      employeeId: certEmployeeId,
      employeeName: teacher.name,
      type: 'salary',
      monthsSelected: sortedMonths,
      issuedDate: new Date().toISOString().split('T')[0],
      purpose: certPurpose,
      hash
    };

    saveIssuedCerts([newCert, ...issuedCertificates]);

    setViewingCertificate({
      cert: newCert,
      teacher,
      history: matchingMonthlyRecords
    });

    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role as any,
      'GENERATE_SALARY_CERTIFICATE',
      'HRMS Certificates',
      `Issued Official Salary Certificate ${uniqueNo} to ${teacher.name} for ${matchingMonthlyRecords.length} month(s)`
    );
  };

  // Experience Certificate generator
  const handleGenerateExperienceCertificate = () => {
    if (!certEmployeeId) return alert('Select an employee first');
    const teacher = LocalERPDatabase.getUsers().find(u => u.id === certEmployeeId);
    if (!teacher) return;

    const profiles = LocalERPDatabase.getAcademicSetup().teacherProfiles || [];
    const p = profiles.find(prof => prof.id === certEmployeeId || prof.shalarthId === teacher.shalarthId);
    const jDate = p?.joiningDate || teacher.joiningDate || '';
    if (!jDate) return alert('Joining date is not recorded for this employee. Update Staff Master before issuing an Experience Certificate.');

    // Calculate experience in years/months/days
    const start = new Date(jDate);
    const today = new Date();
    let years = today.getFullYear() - start.getFullYear();
    let months = today.getMonth() - start.getMonth();
    let days = today.getDate() - start.getDate();

    if (days < 0) {
      months -= 1;
      days += new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }

    const uniqueNo = `CERT-EXP-${Date.now().toString().substring(6)}`;
    const hash = (globalThis.crypto?.randomUUID?.() || `REC-${Date.now()}`).replace(/-/g, '').slice(0, 12).toUpperCase();

    const newCert: CertificateIssued = {
      id: `cert_exp_${Date.now()}`,
      certificateNo: uniqueNo,
      outwardNo,
      employeeId: certEmployeeId,
      employeeName: teacher.name,
      type: 'experience',
      monthsSelected: [],
      issuedDate: new Date().toISOString().split('T')[0],
      purpose: certPurpose,
      hash
    };

    saveIssuedCerts([newCert, ...issuedCertificates]);

    setExperienceCert({
      cert: newCert,
      teacher,
      joiningDate: jDate,
      experienceText: `${years} Years, ${months} Months, and ${days} Days`,
      designation: teacher.designation || p?.designation || 'Assistant Teacher'
    });

    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role as any,
      'GENERATE_EXPERIENCE_CERTIFICATE',
      'HRMS Certificates',
      `Issued Experience Certificate ${uniqueNo} to ${teacher.name}`
    );
  };


  const handlePrint = (targetId: string, title: string) => {
    printSectionById(targetId, title);
    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role as any,
      'PRINT_CERTIFICATE',
      'HRMS Certificates',
      `Opened official print/PDF desk: ${title}`
    );
  };

  const currentMonthPayroll = payrollHistory.find(h => h.id === selectedProcessMonth);

  return (
    <div id={`payroll-workspace-${activeTab}`} className="space-y-6 scroll-mt-24">
      
      {/* HEADER BAR AND BRANDING */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 transform translate-x-12 -translate-y-12 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl"></div>
        <div className="space-y-1 relative">
          <div className="flex items-center gap-2">
            <span className="bg-blue-500 text-white text-[10px] uppercase tracking-widest px-2 py-0.5 rounded font-bold font-mono">HRMS Core v2.0</span>
            <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">Active Academic Session: {activeAcademicYear}</span>
          </div>
          <h2 className="text-xl font-bold font-sans tracking-tight">
            {lang === 'ur' ? 'پے رول، ایچ آر ایم ایس اور سروس بک مینجمنٹ' : lang === 'hi' ? 'पेरोल, मानव संसाधन और सेवा पुस्तिका' : 'Payroll, HRMS & Service Book Register'}
          </h2>
          <p className="text-xs text-slate-400">
            {lang === 'ur' ? 'استاد اور عملے کی تنخواہ اور سروس ریکارڈ کا مربوط نظام' : 'Integrated digital payroll computation, leave integration, and statutory certificates management.'}
          </p>
        </div>

        {!activeFeatureId && (
        <div className="flex gap-2 flex-wrap relative">
          <button 
            onClick={() => setActiveTab('payroll')} 
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${activeTab === 'payroll' ? 'bg-blue-600 text-white shadow' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            Payroll Processing
          </button>
          <button 
            onClick={() => setActiveTab('setup')} 
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${activeTab === 'setup' ? 'bg-blue-600 text-white shadow' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            Structure Setup
          </button>
          <button 
            onClick={() => setActiveTab('hrms')} 
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${activeTab === 'hrms' ? 'bg-blue-600 text-white shadow' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            Digital Service Book
          </button>
          <button 
            onClick={() => setActiveTab('increments')} 
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${activeTab === 'increments' ? 'bg-blue-600 text-white shadow' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            Increment Desk
          </button>
          <button 
            onClick={() => setActiveTab('loans')} 
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${activeTab === 'loans' ? 'bg-blue-600 text-white shadow' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            Loans & Advances
          </button>
          <button 
            onClick={() => setActiveTab('certificates')} 
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${activeTab === 'certificates' ? 'bg-blue-600 text-white shadow' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            Certificates Desk
          </button>
          <button 
            onClick={() => setActiveTab('reports')} 
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${activeTab === 'reports' ? 'bg-blue-600 text-white shadow' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            Payroll Reports
          </button>
        </div>
        )}
      </div>

      {/* ======================================= */}
      {/* TAB 1: PAYROLL PROCESSING & DISBURSEMENT */}
      {/* ======================================= */}
      {activeTab === 'payroll' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Run payroll parameters */}
            <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Calendar className="w-4.5 h-4.5 text-blue-600" />
                Select Processing Month
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase font-mono mb-1">Target Period</label>
                  <input
                    type="month"
                    value={selectedProcessMonth}
                    onChange={(e) => setSelectedProcessMonth(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none"
                  />
                </div>

                <button
                  onClick={handleProcessPayroll}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" /> Run Payroll Processor
                </button>

                <p className="text-[10px] text-slate-400 leading-relaxed font-sans mt-2">
                  * System will automatically integrate daily staff attendance records, approved LWP days, active statutory deduction brackets, and recover scheduled loan installments dynamically.
                </p>
              </div>

              {/* Adjustments Sub-form */}
              {currentMonthPayroll && currentMonthPayroll.status !== 'Approved' && (
                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <h4 className="font-bold text-xs text-slate-700 flex items-center gap-1">
                    <Settings className="w-3.5 h-3.5 text-slate-500" /> Adjust Staff Net Pay
                  </h4>
                  
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Select Employee</label>
                    <select
                      value={manualAdjustmentId}
                      onChange={(e) => setManualAdjustmentId(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 outline-none"
                    >
                      <option value="">-- Choose Employee --</option>
                      {currentMonthPayroll.records.map(r => (
                        <option key={r.employeeId} value={r.employeeId}>{r.employeeName}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Adj Amount (₹, +/-)</label>
                    <input
                      type="number"
                      value={adjAmt}
                      onChange={(e) => setAdjAmt(parseInt(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 outline-none font-mono"
                      placeholder="e.g. 1500 or -1500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Authorization Remark</label>
                    <input
                      type="text"
                      value={adjRemark}
                      onChange={(e) => setAdjRemark(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 outline-none"
                      placeholder="e.g. Arrears, festival bonus..."
                    />
                  </div>

                  <button
                    onClick={handleSaveAdjustment}
                    className="w-full py-1.5 bg-slate-800 text-white text-[11px] font-bold rounded hover:bg-slate-900 transition cursor-pointer"
                  >
                    Save Authorized Adjustment
                  </button>
                </div>
              )}
            </div>

            {/* Processed Registry Grid */}
            <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-200 space-y-6">
              {!currentMonthPayroll ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                    <CircleDollarSign className="w-8 h-8 animate-pulse" />
                  </div>
                  <h4 className="font-bold text-slate-700">No active payroll loaded</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Choose a month year from the left side parameters and hit the "Run Payroll Processor" button to generate a new active draft.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 text-left">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-800 text-sm">Monthly Payroll Register: {currentMonthPayroll.monthYear}</h4>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono uppercase ${
                          currentMonthPayroll.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {currentMonthPayroll.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 font-mono">
                        Processed By: {currentMonthPayroll.processedBy} on {currentMonthPayroll.processedAt}
                        {currentMonthPayroll.approvedBy && ` | Signed-off By: ${currentMonthPayroll.approvedBy} on ${currentMonthPayroll.approvedAt}`}
                      </p>
                    </div>

                    {currentMonthPayroll.status === 'Draft' && isHM && (
                      <button
                        onClick={() => handleApprovePayroll(currentMonthPayroll.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 shadow cursor-pointer"
                      >
                        <CheckCircle className="w-4 h-4" /> Approve & Sign-off (HM)
                      </button>
                    )}
                  </div>

                  {/* Salaries Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-600 font-mono text-[10px] uppercase border-b border-slate-200">
                          <th className="p-3">Employee Name</th>
                          <th className="p-3">Designation</th>
                          <th className="p-3">LWP Days</th>
                          <th className="p-3 text-right">Gross Salary (₹)</th>
                          <th className="p-3 text-right">Deductions (₹)</th>
                          <th className="p-3 text-right">Adjustment</th>
                          <th className="p-3 text-right">Net Payable (₹)</th>
                          <th className="p-3 text-center">Receipt / Slip</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {currentMonthPayroll.records.map(rec => (
                          <tr key={rec.employeeId} className="hover:bg-slate-50/50">
                            <td className="p-3">
                              <div>
                                <p className="font-bold text-slate-800">{rec.employeeName}</p>
                                <p className="text-[10px] text-slate-400 font-mono font-bold">SHALARTH: {rec.shalarthId}</p>
                              </div>
                            </td>
                            <td className="p-3 text-slate-500 font-semibold">{rec.designation}</td>
                            <td className="p-3">
                              {rec.lwpDays > 0 ? (
                                <span className="bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded font-mono font-bold">
                                  {rec.lwpDays} LWP Days
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="p-3 text-right font-bold font-mono text-slate-600">₹{rec.grossIncome.toLocaleString()}</td>
                            <td className="p-3 text-right font-bold font-mono text-rose-600">₹{rec.totalDeductions.toLocaleString()}</td>
                            <td className="p-3 text-right font-bold font-mono text-blue-600">
                              {rec.adjustments !== 0 ? (
                                <span title={rec.adjustmentRemark}>
                                  {rec.adjustments > 0 ? '+' : ''}{rec.adjustments}
                                </span>
                              ) : (
                                <span className="text-slate-300">0</span>
                              )}
                            </td>
                            <td className="p-3 text-right font-mono font-extrabold text-slate-900 bg-slate-50/50">
                              ₹{rec.netPay.toLocaleString()}
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => {
                                  // Open Salary slip view modal/print
                                  setViewingCertificate({
                                    cert: { certificateNo: `SLIP-${selectedProcessMonth}-${rec.employeeId}`, outwardNo: 'SLIP-DISB', issuedDate: new Date().toISOString().split('T')[0] },
                                    teacher: { name: rec.employeeName, designation: rec.designation, employeeCode: rec.employeeId, shalarthId: rec.shalarthId, pan: rec.pan, aadhaar: rec.aadhaar },
                                    history: [{ monthLabel: currentMonthPayroll.monthYear, record: rec }]
                                  });
                                  setCertType('salary_cert');
                                }}
                                className="bg-blue-50 text-blue-600 px-2 py-1 rounded font-bold hover:bg-blue-100 flex items-center gap-1 mx-auto text-[11px] cursor-pointer"
                              >
                                <Printer className="w-3 h-3" /> View Slip
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Bottom total aggregates */}
                  <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-4 text-xs">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="text-slate-400 font-mono uppercase block mb-1">Aggregated Gross Budget</span>
                      <span className="text-base font-bold font-mono text-slate-700">
                        ₹{currentMonthPayroll.records.reduce((sum, r) => sum + r.grossIncome, 0).toLocaleString()}
                      </span>
                    </div>

                    <div className="bg-rose-50/30 p-3 rounded-lg border border-rose-100/50">
                      <span className="text-rose-500 font-mono uppercase block mb-1">Aggregated Deductions</span>
                      <span className="text-base font-bold font-mono text-rose-700">
                        ₹{currentMonthPayroll.records.reduce((sum, r) => sum + r.totalDeductions, 0).toLocaleString()}
                      </span>
                    </div>

                    <div className="bg-emerald-50/30 p-3 rounded-lg border border-emerald-100/50">
                      <span className="text-emerald-500 font-mono uppercase block mb-1">Actual Net Disbursed</span>
                      <span className="text-base font-bold font-mono text-emerald-700">
                        ₹{currentMonthPayroll.records.reduce((sum, r) => sum + r.netPay, 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ======================================= */}
      {/* TAB 2: SALARY HEADS AND PROFILE SETUP */}
      {/* ======================================= */}
      {activeTab === 'setup' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
          
          {/* Configure heads list */}
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 space-y-6">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              1. Salary Head Masters
            </h3>

            {canManage && (
              <form onSubmit={handleAddHead} className="space-y-4 p-3.5 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-[10px] font-bold uppercase text-slate-400 font-mono">Create Custom Head</p>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Head Name *</label>
                  <input
                    type="text"
                    value={newHeadName}
                    onChange={(e) => setNewHeadName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs outline-none"
                    placeholder="e.g. Medical Allowance"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Type</label>
                    <select
                      value={newHeadType}
                      onChange={(e) => setNewHeadType(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs outline-none"
                    >
                      <option value="income">Income Head</option>
                      <option value="deduction">Deduction Head</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Default (₹)</label>
                    <input
                      type="number"
                      value={newHeadVal}
                      onChange={(e) => setNewHeadVal(parseInt(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs outline-none font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-1.5 bg-blue-600 text-white text-[11px] font-bold rounded shadow cursor-pointer"
                >
                  Save Salary Head
                </button>
              </form>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-slate-400 font-mono block mb-2">School Salary Heads</label>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {salaryHeads.map(h => (
                  <div key={h.id} className="p-3 bg-white rounded-lg border border-slate-100 flex items-center justify-between text-xs hover:bg-slate-50">
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-700">{h.name}</p>
                      <p className="text-[9px] text-slate-400 font-mono uppercase font-bold">
                        {h.type} | default: ₹{h.defaultValue}
                      </p>
                    </div>
                    {canManage && !h.isSystem && (
                      <button type="button" onClick={() => handleDeleteHead(h.id)} className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Employee Base profiles mapping */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-600" />
              2. Individual Employee Base Pay Structures
            </h3>

            {editingProfileId ? (
              <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-xs text-slate-700 font-mono">
                    EDIT SALARY MAPPINGS FOR EMPLOYEE
                  </h4>
                  <button onClick={() => setEditingProfileId(null)} className="text-xs text-slate-400 font-bold hover:underline cursor-pointer">
                    Close Editor
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {salaryHeads.map(h => (
                    <div key={h.id} className="flex items-center justify-between bg-white p-2.5 rounded border border-slate-200 text-xs">
                      <span className="font-semibold text-slate-600">{h.name} ({h.type})</span>
                      <input
                        type="number"
                        value={editingProfileHeads[h.id] || 0}
                        onChange={(e) => {
                          setEditingProfileHeads({
                            ...editingProfileHeads,
                            [h.id]: parseInt(e.target.value) || 0
                          });
                        }}
                        className="w-24 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-right font-mono text-xs outline-none"
                      />
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => {
                    const updated = { ...salaryProfiles };
                    updated[editingProfileId] = editingProfileHeads;
                    saveSalaryProfiles(updated);
                    setEditingProfileId(null);
                    alert('Base Salary Profile Updated Successfully!');
                  }}
                  className="bg-indigo-600 text-white font-bold text-xs px-4 py-2 rounded shadow hover:bg-indigo-700 cursor-pointer"
                >
                  Save Profile Configuration
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-mono text-[10px] uppercase border-b border-slate-200">
                      <th className="p-3">Employee Name</th>
                      <th className="p-3">Core Basic Pay</th>
                      <th className="p-3">DA Amount</th>
                      <th className="p-3">HRA Amount</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Object.entries(salaryProfiles).map(([empId, heads]) => {
                      const emp = LocalERPDatabase.getUsers().find(u => u.id === empId);
                      if (!emp) return null;
                      return (
                        <tr key={empId} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-800">{emp.name}</td>
                          <td className="p-3 font-mono font-bold text-indigo-900">₹{heads['h_basic']?.toLocaleString() || '0'}</td>
                          <td className="p-3 font-mono text-slate-500">₹{heads['h_da']?.toLocaleString() || '0'}</td>
                          <td className="p-3 font-mono text-slate-500">₹{heads['h_hra']?.toLocaleString() || '0'}</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => {
                                setEditingProfileId(empId);
                                setEditingProfileHeads(heads);
                              }}
                              className="bg-indigo-50 text-indigo-600 font-bold px-2 py-1 rounded text-[11px] hover:bg-indigo-100 cursor-pointer"
                            >
                              Configure Pay Structures
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ======================================= */}
      {/* TAB 3, 4, 5: HRMS & SERVICE BOOK CORES */}
      {/* ======================================= */}
      {activeTab === 'hrms' && (
        <SmartHRMSModule lang={lang} user={user} onRefreshData={onRefreshData} activeSection="service_book" />
      )}
      {activeTab === 'increments' && (
        <SmartHRMSModule lang={lang} user={user} onRefreshData={onRefreshData} activeSection="increments" />
      )}
      {activeTab === 'loans' && (
        <SmartHRMSModule lang={lang} user={user} onRefreshData={onRefreshData} activeSection="loans" />
      )}

      {/* ======================================= */}
      {/* TAB 6: CERTIFICATE ISSUING & PRINT DESK */}
      {/* ======================================= */}
      {activeTab === 'certificates' && !viewingCertificate && !experienceCert && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
          
          {/* Certificate Request inputs */}
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 space-y-6">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              Generate Official Documents
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1 font-mono">1. DOCUMENT TYPE</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setCertType('salary_cert')}
                    className={`p-2 rounded border font-bold text-xs cursor-pointer text-center transition ${certType === 'salary_cert' ? 'bg-indigo-50 border-indigo-600 text-indigo-600' : 'bg-slate-50 text-slate-600'}`}
                  >
                    Salary Certificate
                  </button>
                  <button
                    onClick={() => setCertType('experience_cert')}
                    className={`p-2 rounded border font-bold text-xs cursor-pointer text-center transition ${certType === 'experience_cert' ? 'bg-indigo-50 border-indigo-600 text-indigo-600' : 'bg-slate-50 text-slate-600'}`}
                  >
                    Experience Cert
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Select Employee *</label>
                <select
                  value={certEmployeeId}
                  onChange={(e) => setCertEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none"
                >
                  <option value="">-- Select Employee --</option>
                  {LocalERPDatabase.getUsers()
                    .filter(u => u.role === 'teacher' || u.role === 'clerk')
                    .map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))
                  }
                </select>
              </div>

              {certType === 'salary_cert' && (
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Select Salary Months * (Select multiple for Multi-Month Cert)</label>
                  <p className="text-[10px] text-slate-400 mb-2">Each selected month will be dynamically added as a column in the official salary grid.</p>
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto p-2 border border-slate-100 rounded bg-slate-50">
                    {payrollHistory
                      .filter(h => h.status === 'Approved')
                      .map(m => (
                        <label key={m.id} className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedMonths.includes(m.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMonths([...selectedMonths, m.id]);
                              } else {
                                setSelectedMonths(selectedMonths.filter(x => x !== m.id));
                              }
                            }}
                          />
                          {m.monthYear} (Approved)
                        </label>
                      ))
                    }
                    {payrollHistory.filter(h => h.status === 'Approved').length === 0 && (
                      <p className="text-[10px] text-slate-400 italic">No approved salary months in central ledger.</p>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Outward No.</label>
                <input
                  type="text"
                  value={outwardNo}
                  onChange={(e) => setOutwardNo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none font-mono"
                  placeholder="NHS/EST/SAL-CERT/..."
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Purpose / Recipient</label>
                <input
                  type="text"
                  value={certPurpose}
                  onChange={(e) => setCertPurpose(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none"
                  placeholder="e.g. Bank Loan, Income Proof..."
                />
              </div>

              {certType === 'salary_cert' ? (
                <button
                  onClick={handleGenerateSalaryCertificate}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-md transition cursor-pointer text-center block"
                >
                  Generate Official Salary Certificate
                </button>
              ) : (
                <button
                  onClick={handleGenerateExperienceCertificate}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-md transition cursor-pointer text-center block"
                >
                  Generate Employment Experience Certificate
                </button>
              )}
            </div>
          </div>

          {/* Certificate log registry */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Signature className="w-5 h-5 text-indigo-600" />
              Document Issuance Registry
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-mono text-[10px] uppercase border-b border-slate-200">
                    <th className="p-3">Certificate No.</th>
                    <th className="p-3">Employee Name</th>
                    <th className="p-3">Doc Type</th>
                    <th className="p-3">Outward No</th>
                    <th className="p-3">Issue Date</th>
                    <th className="p-3">Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {issuedCertificates.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-slate-400 italic">No formal certificates issued in this session registry yet.</td>
                    </tr>
                  ) : (
                    issuedCertificates.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900 font-mono">{c.certificateNo}</td>
                        <td className="p-3 font-bold text-slate-700">{c.employeeName}</td>
                        <td className="p-3 uppercase">
                          <span className={`px-2 py-0.5 rounded font-mono font-bold text-[9px] ${c.type === 'salary' ? 'bg-indigo-100 text-indigo-800' : 'bg-purple-100 text-purple-800'}`}>
                            {c.type}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-500">{c.outwardNo}</td>
                        <td className="p-3 font-mono text-slate-500">{c.issuedDate}</td>
                        <td className="p-3 text-slate-400 truncate max-w-[150px]" title={c.purpose}>{c.purpose}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ======================================= */}
      {/* 7. HIGH-FIDELITY SALARY CERTIFICATE PRINT PREVIEW */}
      {/* ======================================= */}
      {viewingCertificate && (
        <div className="space-y-4">
          <div className="bg-slate-800 text-white p-4 rounded-xl flex flex-wrap justify-between items-center gap-4 text-left print:hidden">
            <div>
              <h4 className="font-bold text-sm">Official Letterhead Document Print Desk</h4>
              <p className="text-xs text-slate-400">Preserves original institutional layout. Close preview to go back.</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => handlePrint('payroll-salary-certificate-print', 'Official Salary Certificate')}
                className="bg-emerald-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print Document
              </button>
              <button 
                onClick={() => setViewingCertificate(null)}
                className="bg-slate-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>

          {/* Actual Letterhead Certificate Paper Rendering (A4 styling conforms with media query print) */}
          <div className="bg-slate-100 py-8 px-2 overflow-x-auto print:bg-white print:p-0">
            <div id="payroll-salary-certificate-print" className="bg-white mx-auto p-12 w-[210mm] min-h-[297mm] shadow-2xl text-slate-900 text-sm leading-relaxed relative print:shadow-none print:p-0">
              
              {/* Institutional Header (Urdu, Hindi, English multi-lingual conforming) */}
              <div className="border-b-4 border-slate-900 pb-4 text-center space-y-2">
                <div className="flex justify-between items-center">
                  <div className="text-left font-mono text-[9px] text-slate-500 space-y-0.5">
                    <p>UDISE CODE: {schoolUdise}</p>
                    <p>SCHOOL CODE: {schoolCode}</p>
                    <p>REG NO: {schoolProfile?.regNumber || '—'}</p>
                  </div>
                  
                  {/* Real-time Base64 school logo or dynamic fallback */}
                  <div className="w-16 h-16 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-xl select-none">
                    {schoolInitials}
                  </div>

                  <div className="text-right font-mono text-[9px] text-slate-500 space-y-0.5">
                    <p>TALUKA: {schoolProfile?.taluka || '—'}</p>
                    <p>DISTRICT: {schoolProfile?.district || '—'}</p>
                    <p>STATE: {schoolProfile?.state || '—'}</p>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <h1 className="text-base font-bold font-serif text-slate-800 tracking-wider uppercase">{schoolName}</h1>
                  <p className="text-xs font-bold text-slate-600">{schoolLocation || 'School location not configured'}</p>
                </div>
              </div>

              {/* Reference outward & Cert parameters */}
              <div className="flex justify-between font-mono text-xs mt-6 font-semibold">
                <p>OUTWARD NO: {viewingCertificate.cert.outwardNo}</p>
                <p>DATE OF ISSUE: {viewingCertificate.cert.issuedDate}</p>
              </div>

              {/* Document Title */}
              <div className="text-center my-8">
                <h2 className="text-lg font-bold border-b-2 border-slate-800 inline-block px-4 pb-1 uppercase tracking-wider font-serif">
                  {lang === 'ur' ? 'سرکاری تنخواہ سرٹیفکیٹ' : lang === 'hi' ? 'आधिकारिक वेतन प्रमाण पत्र' : 'OFFICIAL SALARY CERTIFICATE'}
                </h2>
              </div>

              {/* Certificate content body */}
              <div className="space-y-4 text-justify font-serif text-slate-800 leading-relaxed">
                <p className="indent-12">
                  This is to officially certify that <span className="font-bold underline">Shri / Smt / Kum. {viewingCertificate.teacher.name}</span> is 
                  recorded in the staff/payroll records of <span className="font-bold">{schoolName}</span> as 
                  <span className="font-bold">{viewingCertificate.teacher.designation || 'Designation not recorded'}</span>. The recorded joining date is 
                  <span className="font-bold">{viewingCertificate.joiningDate || viewingCertificate.teacher.joiningDate || 'Not recorded'}</span>.
                </p>
                <p>
                  The EDUNIXO payroll entries available for the selected period <span className="font-bold">{viewingCertificate.history.map((h: any) => h.monthLabel).join(', ')}</span> are documented below. Before official issue, reconcile this document with the school's signed payroll/service records.
                </p>
              </div>

              {/* DYNAMIC SALARY CERTIFICATE TABLE GRID */}
              {/* Supporting single-month or multi-month dynamically */}
              <div className="my-8 border-2 border-slate-900 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b-2 border-slate-900 font-serif">
                      <th className="p-3 border-r border-slate-400">SALARY PARMETERS (₹)</th>
                      {viewingCertificate.history.map((h: any) => (
                        <th key={h.monthLabel} className="p-3 text-right border-r border-slate-400 font-mono">{h.monthLabel.toUpperCase()}</th>
                      ))}
                      {viewingCertificate.history.length > 1 && (
                        <th className="p-3 text-right font-serif">AGGREGATE TOTAL</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-slate-50 font-bold border-b border-slate-300 font-serif">
                      <td colSpan={viewingCertificate.history.length + (viewingCertificate.history.length > 1 ? 2 : 1)} className="p-2 pl-3">
                        PART A: ITEMIZED EARNINGS / INCOMES
                      </td>
                    </tr>

                    {/* Dynamic Income heads rows */}
                    {salaryHeads.filter(h => h.type === 'income').map(h => {
                      // Only show if at least one month has some value in it
                      const hasVal = viewingCertificate.history.some((m: any) => m.record.incomes[h.id] > 0);
                      if (!hasVal) return null;

                      return (
                        <tr key={h.id} className="border-b border-slate-200">
                          <td className="p-2.5 pl-5 border-r border-slate-300 font-medium text-slate-700">{h.name}</td>
                          {viewingCertificate.history.map((m: any) => {
                            const val = m.record.incomes[h.id] || 0;
                            return (
                              <td key={m.monthLabel} className="p-2.5 text-right border-r border-slate-300 font-mono">₹{val.toLocaleString()}</td>
                            );
                          })}
                          {viewingCertificate.history.length > 1 && (
                            <td className="p-2.5 text-right font-bold font-mono">
                              ₹{viewingCertificate.history.reduce((sum: number, m: any) => sum + (m.record.incomes[h.id] || 0), 0).toLocaleString()}
                            </td>
                          )}
                        </tr>
                      );
                    })}

                    {/* Total Gross Income */}
                    <tr className="bg-emerald-50 font-bold border-b-2 border-slate-900 font-serif text-emerald-950">
                      <td className="p-2.5 pl-3 border-r border-slate-400 uppercase tracking-wider">TOTAL GROSS INCOME (A)</td>
                      {viewingCertificate.history.map((m: any) => (
                        <td key={m.monthLabel} className="p-2.5 text-right border-r border-slate-400 font-mono">₹{m.record.grossIncome.toLocaleString()}</td>
                      ))}
                      {viewingCertificate.history.length > 1 && (
                        <td className="p-2.5 text-right font-mono">
                          ₹{viewingCertificate.history.reduce((sum: number, m: any) => sum + m.record.grossIncome, 0).toLocaleString()}
                        </td>
                      )}
                    </tr>

                    <tr className="bg-slate-50 font-bold border-b border-slate-300 font-serif">
                      <td colSpan={viewingCertificate.history.length + (viewingCertificate.history.length > 1 ? 2 : 1)} className="p-2 pl-3">
                        PART B: STATUTORY LEGAL DEDUCTIONS & RECOVERIES
                      </td>
                    </tr>

                    {/* Dynamic Deduction heads rows */}
                    {salaryHeads.filter(h => h.type === 'deduction').map(h => {
                      const hasVal = viewingCertificate.history.some((m: any) => m.record.deductions[h.id] > 0);
                      if (!hasVal) return null;

                      return (
                        <tr key={h.id} className="border-b border-slate-200">
                          <td className="p-2.5 pl-5 border-r border-slate-300 font-medium text-slate-700">{h.name}</td>
                          {viewingCertificate.history.map((m: any) => {
                            const val = m.record.deductions[h.id] || 0;
                            return (
                              <td key={m.monthLabel} className="p-2.5 text-right border-r border-slate-300 font-mono">₹{val.toLocaleString()}</td>
                            );
                          })}
                          {viewingCertificate.history.length > 1 && (
                            <td className="p-2.5 text-right font-bold font-mono">
                              ₹{viewingCertificate.history.reduce((sum: number, m: any) => sum + (m.record.deductions[h.id] || 0), 0).toLocaleString()}
                            </td>
                          )}
                        </tr>
                      );
                    })}

                    {/* Loan deductions */}
                    {viewingCertificate.history.some((m: any) => Object.keys(m.record.loanDeductions).length > 0) && (
                      <tr className="border-b border-slate-200">
                        <td className="p-2.5 pl-5 border-r border-slate-300 font-medium text-slate-700">Deduction of Loan / Advances Recovery</td>
                        {viewingCertificate.history.map((m: any) => {
                          const val = Object.values(m.record.loanDeductions as Record<string, number>).reduce((a,b) => a+b, 0);
                          return (
                            <td key={m.monthLabel} className="p-2.5 text-right border-r border-slate-300 font-mono">₹{val.toLocaleString()}</td>
                          );
                        })}
                        {viewingCertificate.history.length > 1 && (
                          <td className="p-2.5 text-right font-bold font-mono">
                            ₹{viewingCertificate.history.reduce((sum: number, m: any) => sum + Object.values(m.record.loanDeductions as Record<string, number>).reduce((a,b) => a+b, 0), 0).toLocaleString()}
                          </td>
                        )}
                      </tr>
                    )}

                    {/* Total Deductions */}
                    <tr className="bg-rose-50 font-bold border-b-2 border-slate-900 font-serif text-rose-950">
                      <td className="p-2.5 pl-3 border-r border-slate-400 uppercase tracking-wider">TOTAL DEDUCTIONS (B)</td>
                      {viewingCertificate.history.map((m: any) => (
                        <td key={m.monthLabel} className="p-2.5 text-right border-r border-slate-400 font-mono">₹{m.record.totalDeductions.toLocaleString()}</td>
                      ))}
                      {viewingCertificate.history.length > 1 && (
                        <td className="p-2.5 text-right font-mono">
                          ₹{viewingCertificate.history.reduce((sum: number, m: any) => sum + m.record.totalDeductions, 0).toLocaleString()}
                        </td>
                      )}
                    </tr>

                    {/* NET PAY IN HAND */}
                    <tr className="bg-slate-900 text-white font-extrabold text-sm border-b-2 border-slate-900 font-mono">
                      <td className="p-3 border-r border-slate-800 font-serif tracking-wider">CASH IN HAND / NET SALARY (A - B)</td>
                      {viewingCertificate.history.map((m: any) => (
                        <td key={m.monthLabel} className="p-3 text-right border-r border-slate-800">₹{m.record.netPay.toLocaleString()}</td>
                      ))}
                      {viewingCertificate.history.length > 1 && (
                        <td className="p-3 text-right">
                          ₹{viewingCertificate.history.reduce((sum: number, m: any) => sum + m.record.netPay, 0).toLocaleString()}
                        </td>
                      )}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Certificate declarations and Purpose verification */}
              <div className="space-y-4 text-justify text-xs font-serif mt-6">
                <p>
                  This salary certificate is issued upon the explicit personal request of the employee for the purpose of: <span className="font-bold underline">{viewingCertificate.cert.purpose}</span>.
                </p>
                <p>
                  This certificate is generated from the records currently available in EDUNIXO and becomes an official school document only after the authorised signatory verifies the particulars and issues it.
                </p>
              </div>

              {/* Signature, QR, Seal and Digital Stamp Area */}
              <div className="mt-16 flex justify-between items-end">
                
                {/* Internal record reference — no external verification claim */}
                <div className="flex items-center gap-3 border p-3 bg-slate-50/50 rounded-lg">
                  <Shield className="w-7 h-7 text-slate-500" />
                  <div className="text-[9px] font-mono leading-tight text-slate-500">
                    <p className="font-bold text-slate-700">EDUNIXO RECORD REFERENCE</p>
                    <p>Serial: {viewingCertificate.cert.certificateNo}</p>
                    <p>Ref: {viewingCertificate.cert.hash}</p>
                    <p>Verify against signed school payroll records before issue.</p>
                  </div>
                </div>

                {/* Clerical & School Seal Stamp */}
                <div className="text-center font-serif text-xs min-w-[120px]">
                  <p className="italic text-slate-300 h-10 flex items-center justify-center">[School Seal Stamp]</p>
                  <div className="border-t border-slate-400 mt-2 pt-1 font-bold text-slate-700">
                    Prepared By Clerk
                  </div>
                </div>

                {/* Headmaster / Principal Sign */}
                <div className="text-center font-serif text-xs min-w-[150px]">
                  <p className="italic text-slate-400 h-10 flex items-center justify-center font-mono">{headmasterName || 'Authorised Signatory'}</p>
                  <div className="border-t border-slate-400 mt-2 pt-1 font-bold text-slate-800 uppercase tracking-wide">
                    Principal & Headmaster
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}

      {/* ======================================= */}
      {/* 8. EXPERIENCE/EMPLOYMENT CERTIFICATE PRINT PREVIEW */}
      {/* ======================================= */}
      {experienceCert && (
        <div className="space-y-4">
          <div className="bg-slate-800 text-white p-4 rounded-xl flex flex-wrap justify-between items-center gap-4 text-left print:hidden">
            <div>
              <h4 className="font-bold text-sm">Official Experience Certificate Print Desk</h4>
              <p className="text-xs text-slate-400">Preserves original institutional layout.</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => handlePrint('payroll-experience-certificate-print', 'Official Experience Certificate')}
                className="bg-emerald-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print Document
              </button>
              <button 
                onClick={() => setExperienceCert(null)}
                className="bg-slate-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>

          {/* Experience Cert Rendering */}
          <div className="bg-slate-100 py-8 px-2 overflow-x-auto print:bg-white print:p-0">
            <div id="payroll-experience-certificate-print" className="bg-white mx-auto p-12 w-[210mm] min-h-[297mm] shadow-2xl text-slate-900 text-sm leading-relaxed relative print:shadow-none print:p-0">
              
              {/* Institutional Header */}
              <div className="border-b-4 border-slate-900 pb-4 text-center space-y-2">
                <div className="flex justify-between items-center">
                  <div className="text-left font-mono text-[9px] text-slate-500 space-y-0.5">
                    <p>UDISE: {schoolUdise}</p>
                    <p>SCHOOL CODE: {schoolCode}</p>
                  </div>
                  <div className="w-16 h-16 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-xl">
                    {schoolInitials}
                  </div>
                  <div className="text-right font-mono text-[9px] text-slate-500 space-y-0.5">
                    <p>TALUKA: {schoolProfile?.taluka || '—'}</p>
                    <p>DIST: {schoolProfile?.district || '—'}</p>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <h1 className="text-base font-bold font-serif text-slate-800 tracking-wider uppercase">{schoolName}</h1>
                  <p className="text-xs font-bold text-slate-600">{schoolLocation || 'School location not configured'}</p>
                </div>
              </div>

              {/* Reference outward & Cert parameters */}
              <div className="flex justify-between font-mono text-xs mt-6 font-semibold">
                <p>OUTWARD NO: {experienceCert.cert.outwardNo}</p>
                <p>DATE OF ISSUE: {experienceCert.cert.issuedDate}</p>
              </div>

              {/* Document Title */}
              <div className="text-center my-12">
                <h2 className="text-lg font-bold border-b-2 border-slate-800 inline-block px-4 pb-1 uppercase tracking-wider font-serif">
                  EMPLOYMENT EXPERIENCE CERTIFICATE
                </h2>
              </div>

              {/* Certificate content body */}
              <div className="space-y-6 text-justify font-serif text-slate-800 text-sm leading-loose">
                <p className="indent-12">
                  This is to certify that <span className="font-bold underline text-base">Shri / Smt / Kum. {experienceCert.teacher.name}</span> has been 
                  recorded in the service records of <span className="font-bold">{schoolName}</span> as 
                  <span className="font-bold underline">{experienceCert.designation || 'Designation not recorded'}</span>.
                </p>
                <p>
                  He/She commenced active academic services in our high school on <span className="font-bold">{experienceCert.joiningDate}</span>. 
                  Based on the joining date currently recorded in EDUNIXO, the calculated service duration as of the issue date is <span className="font-bold underline text-indigo-950">{experienceCert.experienceText}</span>.
                </p>
                <p>
                  This certificate records service tenure and designation only. Conduct, performance or other qualitative remarks are not inferred automatically and should be added only through an authorised, evidence-based school process.
                </p>
              </div>

              {/* Signature, QR, Seal and Digital Stamp Area */}
              <div className="mt-28 flex justify-between items-end">
                
                {/* Internal record reference — no external verification claim */}
                <div className="flex items-center gap-3 border p-3 bg-slate-50/50 rounded-lg">
                  <Shield className="w-7 h-7 text-slate-500" />
                  <div className="text-[9px] font-mono leading-tight text-slate-500">
                    <p className="font-bold text-slate-700">EDUNIXO RECORD REFERENCE</p>
                    <p>Serial: {experienceCert.cert.certificateNo}</p>
                    <p>Ref: {experienceCert.cert.hash}</p>
                    <p>Verify against the signed service record before issue.</p>
                  </div>
                </div>

                {/* Clerical & School Seal Stamp */}
                <div className="text-center font-serif text-xs min-w-[120px]">
                  <p className="italic text-slate-300 h-10 flex items-center justify-center">[School Seal Stamp]</p>
                  <div className="border-t border-slate-400 mt-2 pt-1 font-bold text-slate-700">
                    Administrative Clerk
                  </div>
                </div>

                {/* Headmaster / Principal Sign */}
                <div className="text-center font-serif text-xs min-w-[150px]">
                  <p className="italic text-slate-400 h-10 flex items-center justify-center font-mono">{headmasterName || 'Authorised Signatory'}</p>
                  <div className="border-t border-slate-400 mt-2 pt-1 font-bold text-slate-800 uppercase tracking-wide">
                    Principal & Headmaster
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}

      {/* ======================================= */}
      {/* TAB 7: REPORTS SECTION */}
      {/* ======================================= */}
      {activeTab === 'reports' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 text-left space-y-6">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            Statutory Payroll & Deduction Reports
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Report 1: Provident Fund (PF) Report */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
              <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider font-mono">Provident Fund (PF) Register</h4>
              <p className="text-xs text-slate-400">Generates employee-wise statutory monthly PF deduction summaries ready for treasury upload.</p>
              <div className="pt-2">
                <button
                  onClick={() => {
                    const month = prompt('Enter Month (e.g. 2026-06):', '2026-06');
                    const payroll = payrollHistory.find(h => h.id === month);
                    if (!payroll) return alert('No payroll found for this month.');
                    let report = `NHS TALODA - STATUTORY PF REGISTER FOR ${payroll.monthYear}\n\n`;
                    report += `Employee Name,PF Amount (₹)\n`;
                    payroll.records.forEach(r => {
                      report += `"${r.employeeName}",₹${r.deductions['h_pf'] || 0}\n`;
                    });
                    alert(report);
                  }}
                  className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded font-bold text-xs cursor-pointer hover:bg-indigo-100"
                >
                  Generate PF Register
                </button>
              </div>
            </div>

            {/* Report 2: Professional Tax (PT) Report */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
              <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider font-mono">Professional Tax (PT) Report</h4>
              <p className="text-xs text-slate-400">Consolidated PT calculations mapped against employee salary slabs conforming to Maharashtra ZP rules.</p>
              <div className="pt-2">
                <button
                  onClick={() => {
                    const month = prompt('Enter Month (e.g. 2026-06):', '2026-06');
                    const payroll = payrollHistory.find(h => h.id === month);
                    if (!payroll) return alert('No payroll found for this month.');
                    let report = `NHS TALODA - PT SLAB DEDUCTION REPORT FOR ${payroll.monthYear}\n\n`;
                    report += `Employee Name,Gross Salary,PT Deducted (₹)\n`;
                    payroll.records.forEach(r => {
                      report += `"${r.employeeName}",₹${r.grossIncome},₹${r.deductions['h_pt'] || 0}\n`;
                    });
                    alert(report);
                  }}
                  className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded font-bold text-xs cursor-pointer hover:bg-indigo-100"
                >
                  Generate PT Report
                </button>
              </div>
            </div>

            {/* Report 3: Income Tax Report */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
              <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider font-mono">Income Tax (TDS) Report</h4>
              <p className="text-xs text-slate-400">Monthly TDS deduction report for Form 24Q preparation and quarterly tax reporting.</p>
              <div className="pt-2">
                <button
                  onClick={() => {
                    const month = prompt('Enter Month (e.g. 2026-06):', '2026-06');
                    const payroll = payrollHistory.find(h => h.id === month);
                    if (!payroll) return alert('No payroll found for this month.');
                    let report = `NHS TALODA - TDS (INCOME TAX) REPORT FOR ${payroll.monthYear}\n\n`;
                    report += `Employee Name,TDS (₹)\n`;
                    payroll.records.forEach(r => {
                      report += `"${r.employeeName}",₹${r.deductions['h_it'] || 0}\n`;
                    });
                    alert(report);
                  }}
                  className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded font-bold text-xs cursor-pointer hover:bg-indigo-100"
                >
                  Generate TDS Report
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
