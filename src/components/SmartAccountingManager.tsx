import React, { useState, useEffect } from 'react';
import { 
  Building2, Landmark, Wallet, ArrowDownRight, ArrowUpRight, 
  ArrowRightLeft, FileCheck, CheckCircle, AlertTriangle, Plus, 
  Trash2, Search, Filter, Printer, Download, Eye, Shield, 
  CheckCircle2, XCircle, Clock, Calendar, HelpCircle, FileText,
  RotateCcw, RefreshCw, BarChart2, DollarSign
} from 'lucide-react';
import { Language, User } from '../types';
import { LocalERPDatabase } from '../lib/supabase';
import UrduWrapper from './UrduWrapper';
import { printSectionById } from '../utils/printSection';
import { requestActionConfirm } from '../lib/actionConfirm';

// --- DATABASE SCHEMA TYPES FOR ACCOUNTING ---

export interface FinancialYear {
  id: string;
  name: string; // e.g., "2025-26", "2026-27", "2027-28"
  openingBalance: number; // Cash opening
  isLocked: boolean;
  isClosed: boolean;
  closedAt?: string;
  closedBy?: string;
}

export type AccountGroup = 'Assets' | 'Liabilities' | 'Income' | 'Expenses' | 'Bank' | 'Cash';

export interface ChartOfAccount {
  id: string;
  name: string;
  group: AccountGroup;
  description: string;
  isSystem: boolean; // Cannot delete
  openingBalance: number;
}

export type VoucherType = 'Receipt' | 'Payment' | 'Contra' | 'Journal' | 'Debit Note' | 'Credit Note';

export interface Voucher {
  id: string;
  voucherNo: string; // VOU-REC-2026-0001, etc.
  type: VoucherType;
  date: string; // YYYY-MM-DD
  financialYear: string; // e.g. "2026-27"
  debitAccountId: string;
  creditAccountId: string;
  amount: number;
  narration: string;
  reference?: string; // Student GR, bill invoice, receiptNo
  paymentMode: 'Cash' | 'Cheque' | 'NEFT' | 'RTGS' | 'UPI' | 'Internal Transfer';
  paymentDetails?: string; // Cheque No, UPI Transaction ID
  reconciliationStatus: 'Pending' | 'Reconciled';
  reconciledDate?: string;
  approvalStatus: 'Approved' | 'Pending' | 'Rejected';
  approvedBy?: string;
  approvedAt?: string;
  rejectedReason?: string;
  createdBy: string;
  createdAt: string;
  isCancelled: boolean;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNo: string;
  branch: string;
  ifscCode: string;
  openingBalance: number;
}

interface SmartAccountingManagerProps {
  lang: Language;
  user: User;
  onRefreshData?: () => void;
  activeFeatureId?: string | null;
}

type AccountingWorkspaceTab = 'dashboard' | 'vouchers' | 'coa' | 'ledgers' | 'cashbook' | 'reconciliation' | 'reports' | 'audit_trail';

const ACCOUNTING_FEATURE_TAB: Record<string, AccountingWorkspaceTab> = {
  'accounting-overview': 'dashboard',
  'voucher-review': 'vouchers',
  'chart-of-accounts': 'coa',
  'account-ledger-books': 'ledgers',
  'cash-bank-registers': 'cashbook',
  'bank-reconciliation-review': 'reconciliation',
  'financial-statements': 'reports',
  'finance-year-close': 'reports',
  'audit-safety-logs': 'audit_trail',
  'cl-accounting-overview': 'dashboard',
  'cl-accounting-vouchers': 'vouchers',
  'cl-accounting-chart-of-accounts': 'coa',
  'cl-accounting-ledger-books': 'ledgers',
  'cl-accounting-cash-bank-registers': 'cashbook',
  'cl-accounting-bank-reconciliation': 'reconciliation',
  'cl-accounting-financial-statements': 'reports',
  'cl-accounting-audit-safety-logs': 'audit_trail'
};



export default function SmartAccountingManager({ lang, user, onRefreshData, activeFeatureId }: SmartAccountingManagerProps) {
  const isHM = user.role === 'headmaster';
  const isClerk = user.role === 'clerk';
  const isAllowedToEdit = isHM || isClerk;

  // --- PERSISTENT STATE MANAGEMENT ---
  const [financialYears, setFinancialYears] = useState<FinancialYear[]>(() => {
    const raw = localStorage.getItem('nhs_erp_financial_years');
    return raw ? JSON.parse(raw) : [];
  });

  const [activeFYName, setActiveFYName] = useState<string>(() => {
    const raw = localStorage.getItem('nhs_erp_active_financial_year');
    return raw || (LocalERPDatabase.getAcademicSetup()?.academicYears?.find((year: any) => year.isActive)?.year || 'Not configured');
  });

  const [accounts, setAccounts] = useState<ChartOfAccount[]>(() => {
    const raw = localStorage.getItem('nhs_erp_chart_of_accounts');
    return raw ? JSON.parse(raw) : [];
  });

  const [vouchers, setVouchers] = useState<Voucher[]>(() => {
    const raw = localStorage.getItem('nhs_erp_vouchers');
    return raw ? JSON.parse(raw) : [];
  });

  // UI Navigation states
  const [activeTab, setActiveTab] = useState<AccountingWorkspaceTab>('dashboard');

  useEffect(() => {
    if (!activeFeatureId) return;
    const nextTab = ACCOUNTING_FEATURE_TAB[activeFeatureId];
    if (!nextTab) return;

    setActiveTab(nextTab);
    if (activeFeatureId === 'finance-year-close') {
      window.setTimeout(() => {
        document.getElementById('accounting-finance-year-close')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    }
  }, [activeFeatureId]);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [voucherFilterType, setVoucherFilterType] = useState<string>('all');
  const [accountFilterGroup, setAccountFilterGroup] = useState<string>('all');
  const [selectedLedgerId, setSelectedLedgerId] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Voucher Creation State
  const [showAddVoucher, setShowAddVoucher] = useState(false);
  const [voucherType, setVoucherType] = useState<VoucherType>('Receipt');
  const [vDebitAccount, setVDebitAccount] = useState('');
  const [vCreditAccount, setVCreditAccount] = useState('');
  const [vAmount, setVAmount] = useState<number>(0);
  const [vNarration, setVNarration] = useState('');
  const [vReference, setVReference] = useState('');
  const [vPaymentMode, setVPaymentMode] = useState<Voucher['paymentMode']>('Cash');
  const [vPaymentDetails, setVPaymentDetails] = useState('');
  const [vDate, setVDate] = useState(() => new Date().toISOString().substring(0, 10));

  // Chart of Account addition state
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [newAccGroup, setNewAccGroup] = useState<AccountGroup>('Expenses');
  const [newAccDesc, setNewAccDesc] = useState('');
  const [newAccOpening, setNewAccOpening] = useState<number>(0);

  // Reconcilation Selection
  const [reconcileDate, setReconcileDate] = useState(() => new Date().toISOString().substring(0, 10));

  // Print Setup & Preview Ref
  const [printPaperSize, setPrintPaperSize] = useState<'A4' | 'A3'>('A4');
  const [printOrientation, setPrintOrientation] = useState<'Portrait' | 'Landscape'>('Portrait');
  const [printMode, setPrintMode] = useState<'Colour' | 'BW'>('Colour');
  const [selectedVoucherPrint, setSelectedVoucherPrint] = useState<Voucher | null>(null);

  // Approval Limits configuration
  const APPROVAL_LIMIT_THRESHOLD = 5000; // Over this requires Headmaster approval

  // --- SYNC HELPER TO LOCAL STORAGE ---
  const saveVouchers = (list: Voucher[]) => {
    localStorage.setItem('nhs_erp_vouchers', JSON.stringify(list));
    setVouchers(list);
  };

  const saveAccounts = (list: ChartOfAccount[]) => {
    localStorage.setItem('nhs_erp_chart_of_accounts', JSON.stringify(list));
    setAccounts(list);
  };

  const saveFinancialYears = (list: FinancialYear[]) => {
    localStorage.setItem('nhs_erp_financial_years', JSON.stringify(list));
    setFinancialYears(list);
  };

  const logAudit = (action: string, module: string, details: string) => {
    LocalERPDatabase.addAuditLog(user.id, user.name, user.role, action, module, details);
  };

  // --- AUTOMATED FEE RECEIPT INTEGRATION ENGINE ---
  // Every fee receipt generated from fee module must automatically create ledger vouchers.
  // This engine runs on mount or tab change to synchronize them!
  useEffect(() => {
    const rawFeeTxs = localStorage.getItem('nhs_erp_fee_transactions');
    if (!rawFeeTxs) return;
    
    const feeTxs: any[] = JSON.parse(rawFeeTxs);
    let updatedVouchers = [...vouchers];
    let hasChanges = false;

    feeTxs.forEach((tx) => {
      // Look if we already synchronized this receipt
      const matchingVoucher = updatedVouchers.find(v => v.reference === tx.receiptNo);

      if (!matchingVoucher) {
        // Generate new Receipt Voucher
        const voucherNo = generateVoucherNo('Receipt', tx.paymentDate || new Date().toISOString().substring(0, 10), updatedVouchers);
        
        // If cash, debit acc_cash. Else, debit acc_bank_sbi
        const debAcc = tx.paymentMode === 'Cash' ? 'acc_cash' : 'acc_bank_sbi';
        const creAcc = 'acc_inc_tuition';

        const newVoucher: Voucher = {
          id: `v_auto_${tx.id}`,
          voucherNo,
          type: 'Receipt',
          date: tx.paymentDate || new Date().toISOString().substring(0, 10),
          financialYear: tx.academicYear || activeFYName,
          debitAccountId: debAcc,
          creditAccountId: creAcc,
          amount: tx.amountPaid,
          narration: `Automated Ledger Entry: Student fee receipt ${tx.receiptNo} of ${tx.studentName} (${tx.className || 'NHS Student'}) collected via ${tx.paymentMode}`,
          reference: tx.receiptNo,
          paymentMode: tx.paymentMode === 'Cash' ? 'Cash' : 
                       tx.paymentMode === 'Cheque' ? 'Cheque' :
                       tx.paymentMode === 'UPI' ? 'UPI' : 'NEFT',
          paymentDetails: tx.paymentModeDetails || 'Auto-Sync Integration',
          reconciliationStatus: 'Pending',
          approvalStatus: 'Approved', // Auto-approved
          createdBy: 'System Fee Sync',
          createdAt: new Date().toISOString(),
          isCancelled: tx.status === 'Cancelled'
        };

        if (tx.status === 'Cancelled') {
          newVoucher.cancelledAt = new Date().toISOString();
          newVoucher.cancelledBy = 'System Sync';
          newVoucher.cancellationReason = tx.cancellationReason || 'Fee Receipt Cancelled';
        }

        updatedVouchers.push(newVoucher);
        hasChanges = true;
        logAudit('AUTO_FEE_SYNC_ADD', 'Accounts', `Generated automated receipt voucher ${voucherNo} for receipt ${tx.receiptNo} (INR ${tx.amountPaid})`);
      } else {
        // If matching voucher exists, but the fee receipt status is now CANCELLED and our voucher is NOT cancelled, we reverse / cancel it!
        if (tx.status === 'Cancelled' && !matchingVoucher.isCancelled) {
          matchingVoucher.isCancelled = true;
          matchingVoucher.cancelledAt = new Date().toISOString();
          matchingVoucher.cancelledBy = 'System Sync Reversal';
          matchingVoucher.cancellationReason = tx.cancellationReason || 'Fee receipt cancelled in ledger';
          hasChanges = true;
          logAudit('AUTO_FEE_SYNC_CANCEL', 'Accounts', `Automatically cancelled ledger voucher ${matchingVoucher.voucherNo} due to fee receipt cancellation of ${tx.receiptNo}`);
        }
      }
    });

    if (hasChanges) {
      saveVouchers(updatedVouchers);
    }
  }, [activeFYName]);

  // Helper: auto-generate Voucher Numbers
  const generateVoucherNo = (type: VoucherType, dateStr: string, currentList: Voucher[]) => {
    const yearPrefix = dateStr.substring(0, 4);
    const shortType = type === 'Receipt' ? 'REC' :
                      type === 'Payment' ? 'PAY' :
                      type === 'Contra' ? 'CON' :
                      type === 'Journal' ? 'JOU' :
                      type === 'Debit Note' ? 'DBN' : 'CRN';
    
    // Count matching type in the list
    const count = currentList.filter(v => v.type === type).length + 1;
    const padded = String(count).padStart(4, '0');
    return `VOU-${shortType}-${yearPrefix}-${padded}`;
  };

  // Check if current financial year is locked/closed
  const isCurrentFYLocked = () => {
    const activeObj = financialYears.find(f => f.name === activeFYName);
    return activeObj ? activeObj.isLocked || activeObj.isClosed : false;
  };

  // --- CRUD HANDLERS ---

  // 1. Chart of Account Add
  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) {
      alert('Please define a valid account name');
      return;
    }

    const nextId = `acc_custom_${Date.now()}`;
    const newAccount: ChartOfAccount = {
      id: nextId,
      name: newAccName.trim(),
      group: newAccGroup,
      description: newAccDesc.trim() || 'Custom financial ledger account',
      isSystem: false,
      openingBalance: Number(newAccOpening) || 0
    };

    const updated = [...accounts, newAccount];
    saveAccounts(updated);
    logAudit('CREATE_ACCOUNT', 'Accounts', `Added new ledger account: ${newAccount.name} (${newAccount.group})`);
    setShowAddAccount(false);
    setNewAccName('');
    setNewAccDesc('');
    setNewAccOpening(0);
    alert('Account successfully added to the Chart of Accounts');
  };

  // Delete Custom Account (if no transactions exist)
  const handleDeleteAccount = async (id: string) => {
    const target = accounts.find(a => a.id === id);
    if (!target) return;
    if (target.isSystem) {
      alert('System accounts cannot be removed from school chart structure.');
      return;
    }

    // Check transactions
    const used = vouchers.some(v => v.debitAccountId === id || v.creditAccountId === id);
    if (used) {
      alert('Cannot delete this account as active financial ledger transactions exist. Clear transactions first.');
      return;
    }

    if (!(await requestActionConfirm({ title: 'Delete ledger account?', message: `Are you sure you want to permanently delete account: ${target.name}?`, confirmLabel: 'Delete Account', tone: 'danger' }))) return;

    const updated = accounts.filter(a => a.id !== id);
    saveAccounts(updated);
    logAudit('DELETE_ACCOUNT', 'Accounts', `Deleted ledger account: ${target.name}`);
    alert('Account deleted successfully.');
  };

  // 2. Voucher Entry Form Submit
  const handleCreateVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCurrentFYLocked()) {
      alert('Current active Financial Year is locked or closed. No modifications permitted.');
      return;
    }

    if (vDebitAccount === vCreditAccount) {
      alert('Debit and Credit accounts must be distinct to preserve double-entry balance.');
      return;
    }

    if (vAmount <= 0) {
      alert('Voucher amount must be positive.');
      return;
    }

    // Determine approval status
    // If Clerk makes a Payment Voucher over Limit (5000), it requires approval
    let approval: Voucher['approvalStatus'] = 'Approved';
    if (isClerk && voucherType === 'Payment' && vAmount > APPROVAL_LIMIT_THRESHOLD) {
      approval = 'Pending';
    }

    const nextVoucherNo = generateVoucherNo(voucherType, vDate, vouchers);
    const newV: Voucher = {
      id: `v_man_${Date.now()}`,
      voucherNo: nextVoucherNo,
      type: voucherType,
      date: vDate,
      financialYear: activeFYName,
      debitAccountId: vDebitAccount,
      creditAccountId: vCreditAccount,
      amount: vAmount,
      narration: vNarration.trim() || `Manual ${voucherType} Voucher entry`,
      reference: vReference.trim() || undefined,
      paymentMode: vPaymentMode,
      paymentDetails: vPaymentDetails.trim() || undefined,
      reconciliationStatus: 'Pending',
      approvalStatus: approval,
      createdBy: user.name,
      createdAt: new Date().toISOString(),
      isCancelled: false
    };

    const updated = [newV, ...vouchers];
    saveVouchers(updated);
    logAudit('CREATE_VOUCHER', 'Accounts', `Generated ${voucherType} Voucher ${nextVoucherNo} (Amount: INR ${vAmount}). Approval: ${approval}`);
    
    setShowAddVoucher(false);
    setVAmount(0);
    setVNarration('');
    setVReference('');
    setVPaymentDetails('');
    
    if (approval === 'Pending') {
      alert(`Voucher ${nextVoucherNo} logged. Forwarded to Headmaster for approval due to limits policy.`);
    } else {
      alert(`Voucher ${nextVoucherNo} posted successfully to ledger.`);
    }
  };

  // 3. Voucher Approval Decisions (HM ONLY)
  const handleApproveVoucher = (v: Voucher) => {
    if (!isHM) {
      alert('Only the Headmaster holds administrative credentials to approve high-value transactions.');
      return;
    }

    const updated = vouchers.map(item => {
      if (item.id === v.id) {
        return {
          ...item,
          approvalStatus: 'Approved' as const,
          approvedBy: user.name,
          approvedAt: new Date().toISOString()
        };
      }
      return item;
    });

    saveVouchers(updated);
    logAudit('APPROVE_VOUCHER', 'Accounts', `Approved voucher ${v.voucherNo} for INR ${v.amount}`);
    alert(`Approved Voucher ${v.voucherNo} successfully.`);
  };

  const handleRejectVoucher = (v: Voucher, reason: string) => {
    if (!isHM) {
      alert('Only the Headmaster holds credentials to reject transactions.');
      return;
    }

    if (!reason.trim()) {
      alert('Please specify a valid reason for rejection.');
      return;
    }

    const updated = vouchers.map(item => {
      if (item.id === v.id) {
        return {
          ...item,
          approvalStatus: 'Rejected' as const,
          rejectedReason: reason
        };
      }
      return item;
    });

    saveVouchers(updated);
    logAudit('REJECT_VOUCHER', 'Accounts', `Rejected voucher ${v.voucherNo} for INR ${v.amount}. Reason: ${reason}`);
    alert(`Voucher ${v.voucherNo} rejected.`);
  };

  // 4. Voucher Cancellation (Clerks request, HM cancels instantly)
  const handleCancelVoucher = (v: Voucher, reason: string) => {
    if (isCurrentFYLocked()) {
      alert('Current Financial Year is locked. No edits permitted.');
      return;
    }

    if (!reason.trim()) {
      alert('Please write a cancellation reason.');
      return;
    }

    if (!isHM) {
      alert('Security policy requires Headmaster authorization for voucher cancellations.');
      return;
    }

    const updated = vouchers.map(item => {
      if (item.id === v.id) {
        return {
          ...item,
          isCancelled: true,
          cancelledAt: new Date().toISOString(),
          cancelledBy: user.name,
          cancellationReason: reason
        };
      }
      return item;
    });

    saveVouchers(updated);
    logAudit('CANCEL_VOUCHER', 'Accounts', `Cancelled voucher ${v.voucherNo}. Reason: ${reason}`);
    alert(`Voucher ${v.voucherNo} cancelled in ledger.`);
  };

  // 5. Bank Reconciliation Tool
  const handleReconcileVoucher = (v: Voucher) => {
    const updated = vouchers.map(item => {
      if (item.id === v.id) {
        return {
          ...item,
          reconciliationStatus: 'Reconciled' as const,
          reconciledDate: reconcileDate
        };
      }
      return item;
    });

    saveVouchers(updated);
    logAudit('RECONCILE_BANK_TX', 'Accounts', `Reconciled bank voucher ${v.voucherNo} on date ${reconcileDate}`);
    alert(`Voucher ${v.voucherNo} marked as Reconciled.`);
  };

  // 6. Financial Year closing and Carry Forward (HM ONLY)
  const handleCloseFinancialYear = async (fyId: string) => {
    if (!isHM) {
      alert('Only the Headmaster can finalize academic balances and close financial years.');
      return;
    }

    const targetFY = financialYears.find(f => f.id === fyId);
    if (!targetFY) return;

    if (targetFY.isClosed) {
      alert('Financial Year is already closed.');
      return;
    }

    if (!(await requestActionConfirm({ title: 'Close financial year?', message: `Warning: Finalizing and closing financial year ${targetFY.name} is a permanent action. All existing records will become read-only and balances will automatically carry forward to the next year. Proceed?`, confirmLabel: 'Close Financial Year', tone: 'danger' }))) {
      return;
    }

    // Calculate closing cash balance
    // opening balance + total active debits to cash - total active credits to cash
    // For Cash Account: 'acc_cash'
    const accountCashId = accounts.find(a => a.group === 'Cash')?.id || '';
    if (!accountCashId) { alert('Configure a Cash account before closing a financial year.'); return; }
    let cashBalance = targetFY.openingBalance;

    vouchers.forEach(v => {
      if (v.financialYear === targetFY.name && !v.isCancelled && v.approvalStatus === 'Approved') {
        if (v.debitAccountId === accountCashId) {
          cashBalance += v.amount;
        }
        if (v.creditAccountId === accountCashId) {
          cashBalance -= v.amount;
        }
      }
    });

    // Close this year
    const updatedFYs = financialYears.map(f => {
      if (f.id === fyId) {
        return { ...f, isClosed: true, isLocked: true, closedAt: new Date().toISOString().substring(0, 10), closedBy: user.name };
      }
      // Set opening balance of next year (e.g. 2027-28 if current is 2026-27)
      if (f.name !== targetFY.name) {
        const currentIndex = financialYears.findIndex(year => year.id === targetFY.id);
        const nextIndex = financialYears.findIndex(year => year.id === f.id);
        if (nextIndex === currentIndex + 1 && !f.isClosed) return { ...f, openingBalance: cashBalance };
      }
      return f;
    });

    saveFinancialYears(updatedFYs);
    logAudit('CLOSE_FINANCIAL_YEAR', 'Accounts', `Closed financial year ${targetFY.name}. Computed carry forward cash balance: INR ${cashBalance}`);
    alert(`Financial Year ${targetFY.name} has been closed and sealed. Final Cash balance INR ${cashBalance} carried forward to next session.`);
  };

  // Toggle Lock
  const handleToggleLockYear = (fyId: string) => {
    if (!isHM) {
      alert('Only the Headmaster can toggle financial year locks.');
      return;
    }

    const updated = financialYears.map(f => {
      if (f.id === fyId) {
        return { ...f, isLocked: !f.isLocked };
      }
      return f;
    });

    saveFinancialYears(updated);
    logAudit('TOGGLE_FY_LOCK', 'Accounts', `Toggled ledger lock status for Financial Year.`);
    alert('Financial year security lock updated.');
  };

  // --- MATHEMATICAL RECONCILIATION & LEDGER BALANCES ---
  
  // Calculate specific Account balance
  const calculateAccountBalance = (accountId: string) => {
    const acc = accounts.find(a => a.id === accountId);
    if (!acc) return 0;

    let balance = acc.openingBalance;
    vouchers.forEach(v => {
      if (v.financialYear === activeFYName && !v.isCancelled && v.approvalStatus === 'Approved') {
        if (v.debitAccountId === accountId) {
          balance += v.amount;
        }
        if (v.creditAccountId === accountId) {
          balance -= v.amount;
        }
      }
    });

    return balance;
  };

  // Total cash ledger
  const cashBalance = calculateAccountBalance('acc_cash');
  // Total bank ledgers
  const bankBalance = calculateAccountBalance('acc_bank_sbi') + calculateAccountBalance('acc_bank_hdfc');

  // Statistics for Dashboard
  const todayDate = new Date().toISOString().substring(0, 10);
  
  const todayCollection = vouchers
    .filter(v => v.date === todayDate && v.type === 'Receipt' && !v.isCancelled && v.approvalStatus === 'Approved')
    .reduce((acc, v) => acc + v.amount, 0);

  const todayExpenses = vouchers
    .filter(v => v.date === todayDate && v.type === 'Payment' && !v.isCancelled && v.approvalStatus === 'Approved')
    .reduce((acc, v) => acc + v.amount, 0);

  // Monthly breakdown
  const monthlyStats = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map((m, idx) => {
      const activeYearNum = activeFYName.split('-')[0]; // e.g. "2026"
      const paddedMonth = String(idx + 1).padStart(2, '0');
      const yearMonth = `${activeYearNum}-${paddedMonth}`;

      const income = vouchers
        .filter(v => v.date.startsWith(yearMonth) && v.type === 'Receipt' && !v.isCancelled && v.approvalStatus === 'Approved')
        .reduce((sum, v) => sum + v.amount, 0);

      const expenses = vouchers
        .filter(v => v.date.startsWith(yearMonth) && v.type === 'Payment' && !v.isCancelled && v.approvalStatus === 'Approved')
        .reduce((sum, v) => sum + v.amount, 0);

      return { month: m, income, expenses };
    });
  };

  const netBalance = cashBalance + bankBalance;

  // Chronological transaction filtering (for ledgers, books, search)
  const getLedgerHistory = (accountId: string) => {
    const acc = accounts.find(a => a.id === accountId);
    if (!acc) return [];

    let running = acc.openingBalance;
    const history: { date: string; voucherNo: string; type: string; narration: string; debit: number; credit: number; balance: number; item: Voucher }[] = [];

    // Sort chronologically
    const sortedVouchers = [...vouchers]
      .filter(v => v.financialYear === activeFYName && !v.isCancelled && v.approvalStatus === 'Approved' && (v.debitAccountId === accountId || v.creditAccountId === accountId))
      .sort((a, b) => a.date.localeCompare(b.date));

    sortedVouchers.forEach(v => {
      const isDebit = v.debitAccountId === accountId;
      const deb = isDebit ? v.amount : 0;
      const cre = !isDebit ? v.amount : 0;
      running = isDebit ? running + v.amount : running - v.amount;

      history.push({
        date: v.date,
        voucherNo: v.voucherNo,
        type: v.type,
        narration: v.narration,
        debit: deb,
        credit: cre,
        balance: running,
        item: v
      });
    });

    return history.reverse(); // Newest first for quick rendering
  };

  // Filter vouchers list for search
  const filteredVouchers = vouchers.filter(v => {
    const matchesSearch = v.voucherNo?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (v.reference && v.reference?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          v.narration?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          v.amount.toString().includes(searchQuery);
    const matchesType = voucherFilterType === 'all' || v.type === voucherFilterType;
    const matchesDate = (!dateFrom || v.date >= dateFrom) && (!dateTo || v.date <= dateTo);
    return matchesSearch && matchesType && matchesDate;
  });

  return (
    <div className="space-y-6">
      
      {/* PROFESSIONAL TITLE BAR */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md flex justify-between items-center flex-wrap gap-4 no-print">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600 rounded-xl">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold font-mono">
              {LocalERPDatabase.getAcademicSetup()?.schoolProfile?.schoolName || 'School'}
            </span>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span>Financial Management & Double-Entry Accounting System</span>
              {isCurrentFYLocked() && (
                <span className="bg-amber-600 text-[9px] font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Locked FY
                </span>
              )}
            </h2>
          </div>
        </div>

        {/* ACTIVE FINANCIAL YEAR PICKER */}
        <div className="flex items-center gap-2 bg-slate-800 p-1.5 rounded-xl text-xs">
          <span className="text-slate-400 font-bold ml-2">Session FY:</span>
          <select
            value={activeFYName}
            onChange={(e) => {
              setActiveFYName(e.target.value);
              localStorage.setItem('nhs_erp_active_financial_year', e.target.value);
            }}
            className="bg-slate-700 text-white border-0 rounded-lg px-3 py-1 font-bold focus:ring-0 cursor-pointer"
          >
            {financialYears.map(fy => (
              <option key={fy.id} value={fy.name}>
                {fy.name} {fy.isClosed ? '(Closed)' : fy.isLocked ? '(Locked)' : '(Active)'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* NAVIGATION TABS SECTION */}
      {!activeFeatureId && (
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1.5 no-print text-left">
        {[
          { id: 'dashboard', label: 'Financial Overview', icon: BarChart2 },
          { id: 'vouchers', label: 'Vouchers Journal', icon: FileCheck },
          { id: 'coa', label: 'Chart of Accounts', icon: Landmark },
          { id: 'ledgers', label: 'Account Ledger Books', icon: FileText },
          { id: 'cashbook', label: 'Cash / Bank Registers', icon: Wallet },
          { id: 'reconciliation', label: 'Bank Reconciliation', icon: RotateCcw },
          { id: 'reports', label: 'Financial Statements', icon: DollarSign },
          { id: 'audit_trail', label: 'Audit & Safety Logs', icon: Shield }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === tab.id 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
      )}

      {/* ========================================================= */}
      {/* TAB 1: FINANCIAL OVERVIEW DASHBOARD */}
      {/* ========================================================= */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Key Cash & Bank Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
            
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
              <span className="text-[10px] uppercase text-slate-400 font-bold font-mono tracking-wider">Net Cash in Vault</span>
              <p className="text-2xl font-black text-slate-900">INR {cashBalance.toLocaleString()}</p>
              <p className="text-[10px] text-slate-500">Physical safe balance for small expenses</p>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 shadow-sm space-y-1">
              <span className="text-[10px] uppercase text-blue-700 font-bold font-mono tracking-wider">Gross Bank Reserves</span>
              <p className="text-2xl font-black text-blue-800 font-mono">INR {bankBalance.toLocaleString()}</p>
              <p className="text-[10px] text-blue-600">Combined balance in SBI & HDFC accounts</p>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 shadow-sm space-y-1">
              <span className="text-[10px] uppercase text-emerald-700 font-bold font-mono tracking-wider">Today's Collections</span>
              <p className="text-2xl font-black text-emerald-800 font-mono">INR {todayCollection.toLocaleString()}</p>
              <p className="text-[10px] text-emerald-600">Total automated & manual receipts posted</p>
            </div>

            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 shadow-sm space-y-1">
              <span className="text-[10px] uppercase text-rose-700 font-bold font-mono tracking-wider">Today's Expenses</span>
              <p className="text-2xl font-black text-rose-800 font-mono">INR {todayExpenses.toLocaleString()}</p>
              <p className="text-[10px] text-rose-600">Small and large payments authorized today</p>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
            
            {/* Left: Pending HM Approvals List */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm lg:col-span-1">
              <div className="border-b border-slate-100 pb-2.5 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-amber-500" />
                  <span>Administrative Clearance</span>
                </h3>
                <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded font-mono">
                  {vouchers.filter(v => v.approvalStatus === 'Pending').length} Pending
                </span>
              </div>

              <div className="space-y-3.5 max-h-[350px] overflow-y-auto">
                {vouchers.filter(v => v.approvalStatus === 'Pending').length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-8 text-center">No outstanding transactions awaiting clearance.</p>
                ) : (
                  vouchers.filter(v => v.approvalStatus === 'Pending').map(v => (
                    <div key={v.id} className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl space-y-2.5 text-xs">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-slate-800">{v.voucherNo}</p>
                          <p className="text-[10px] text-slate-400">{v.date} | Entry by {v.createdBy}</p>
                        </div>
                        <span className="text-slate-900 font-black font-mono">INR {v.amount}</span>
                      </div>
                      
                      <p className="text-slate-600 text-[11px] bg-white p-2 rounded border border-slate-100">
                        {v.narration}
                      </p>

                      {isHM ? (
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => handleApproveVoucher(v)}
                            className="flex-1 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[10px] cursor-pointer text-center"
                          >
                            Approve Voucher
                          </button>
                          <button type="button"
                            onClick={() => {
                              const r = prompt('Reason for rejecting:');
                              if (r) handleRejectVoucher(v, r);
                            }}
                            className="flex-1 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded text-[10px] cursor-pointer text-center"
                          >
                            Decline
                          </button>
                        </div>
                      ) : (
                        <p className="text-[9px] text-amber-700 font-mono italic">
                          Awaiting authorization by Headmaster.
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right: Income vs Expenses Summary and Month Breakdown */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm lg:col-span-2">
              <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2 flex justify-between items-center">
                <span>Month-Wise Financial Trend</span>
                <span className="text-[10px] text-slate-400 font-mono font-bold uppercase">FY {activeFYName}</span>
              </h3>

              {/* Graphical Custom Chart of Monthly Trends */}
              <div className="space-y-3 pt-2">
                {monthlyStats().map((stat, i) => {
                  const maxVal = Math.max(1, ...monthlyStats().map(s => Math.max(s.income, s.expenses)));
                  const incPercent = (stat.income / maxVal) * 100;
                  const expPercent = (stat.expenses / maxVal) * 100;

                  if (stat.income === 0 && stat.expenses === 0) return null;

                  return (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center text-xs">
                      <span className="col-span-2 font-bold text-slate-600 font-mono">{stat.month}</span>
                      <div className="col-span-8 space-y-1">
                        {/* Income Bar */}
                        <div className="flex items-center gap-1.5">
                          <div className="h-2 bg-emerald-500 rounded-full transition-all" style={{ width: `${incPercent}%` }} />
                          <span className="text-[9px] text-emerald-700 font-mono font-bold">₹{stat.income.toLocaleString()}</span>
                        </div>
                        {/* Expense Bar */}
                        <div className="flex items-center gap-1.5">
                          <div className="h-2 bg-rose-500 rounded-full transition-all" style={{ width: `${expPercent}%` }} />
                          <span className="text-[9px] text-rose-700 font-mono font-bold">₹{stat.expenses.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {monthlyStats().every(s => s.income === 0 && s.expenses === 0) && (
                  <p className="text-xs text-slate-400 italic text-center py-12">No transaction trend data logged for the active Financial Year yet.</p>
                )}
              </div>
            </div>

          </div>

          {/* Quick Access Policy guidelines */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-xs text-slate-600 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div>
              <h4 className="font-bold text-slate-800 text-xs mb-1">Double-Entry Compliance</h4>
              <p className="leading-relaxed">Every cash or digital transaction balance requires matching debit and credit assignments. Deletes are prohibited; cancellations leave full audit logs in system registers.</p>
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-xs mb-1">Fee Modules Auto-Integration</h4>
              <p className="leading-relaxed">All fee collection desks and cashier receipt portals post dynamic double-entries instantly. Receipt reversals auto-void vouchers chronologically.</p>
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-xs mb-1">Limit Threshold Clearances</h4>
              <p className="leading-relaxed">Any payment voucher registered by the clerical desk with values exceeding INR {APPROVAL_LIMIT_THRESHOLD} triggers an automated security lock until Approved by the Headmaster.</p>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: VOUCHERS JOURNAL */}
      {/* ========================================================= */}
      {activeTab === 'vouchers' && (
        <div className="space-y-6 animate-fade-in text-left">
          
          <div className="flex justify-between items-center flex-wrap gap-4 no-print">
            
            {/* Search/Filters */}
            <div className="flex gap-2 flex-wrap items-center">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Voucher No, narration, reference..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white w-64"
                />
              </div>

              <select
                value={voucherFilterType}
                onChange={(e) => setVoucherFilterType(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-bold cursor-pointer"
              >
                <option value="all">All Types</option>
                <option value="Receipt">Receipt Voucher</option>
                <option value="Payment">Payment Voucher</option>
                <option value="Contra">Contra Voucher</option>
                <option value="Journal">Journal Voucher</option>
                <option value="Debit Note">Debit Note</option>
                <option value="Credit Note">Credit Note</option>
              </select>

              <div className="flex items-center gap-1">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white"
                />
                <span className="text-[10px] text-slate-400">to</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white"
                />
              </div>
            </div>

            {/* Quick Create Button */}
            {isAllowedToEdit && (
              <button
                onClick={() => {
                  if (isCurrentFYLocked()) {
                    alert('Financial year is closed or locked.');
                    return;
                  }
                  setShowAddVoucher(true);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Issue New Voucher</span>
              </button>
            )}

          </div>

          {/* TABLE OF VOUCHERS */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 font-mono uppercase tracking-wider text-[10px] border-b border-slate-150">
                    <th className="py-3 px-4">Date & Voucher No</th>
                    <th className="py-3 px-4">Voucher Type</th>
                    <th className="py-3 px-4">Debit Account</th>
                    <th className="py-3 px-4">Credit Account</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4">Narration</th>
                    <th className="py-3 px-4">Status / Auth</th>
                    <th className="py-3 px-4 text-center no-print">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVouchers.map(v => {
                    const dAcc = accounts.find(a => a.id === v.debitAccountId)?.name || v.debitAccountId;
                    const cAcc = accounts.find(a => a.id === v.creditAccountId)?.name || v.creditAccountId;

                    return (
                      <tr key={v.id} className={`hover:bg-slate-50/50 ${v.isCancelled ? 'bg-rose-50/40 text-slate-400 line-through' : ''}`}>
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-800">{v.voucherNo}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{v.date}</p>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-[10px]">{v.type}</td>
                        <td className="py-3 px-4 font-semibold text-emerald-800">{dAcc}</td>
                        <td className="py-3 px-4 font-semibold text-rose-800">{cAcc}</td>
                        <td className="py-3 px-4 text-right font-black text-slate-900 font-mono">INR {v.amount.toLocaleString()}</td>
                        <td className="py-3 px-4 max-w-xs truncate" title={v.narration}>
                          <p className="truncate text-slate-600">{v.narration}</p>
                          {v.reference && <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1 py-0.5 rounded">Ref: {v.reference}</span>}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1">
                            <span className={`px-2 py-0.5 text-[9px] font-black rounded-full w-fit uppercase font-mono ${
                              v.isCancelled ? 'bg-red-100 text-red-800' :
                              v.approvalStatus === 'Approved' ? 'bg-emerald-150 text-emerald-800' :
                              v.approvalStatus === 'Pending' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {v.isCancelled ? 'Cancelled' : v.approvalStatus}
                            </span>
                            {v.reconciliationStatus === 'Reconciled' && (
                              <span className="text-[9px] text-indigo-700 font-semibold">✓ Reconciled</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center space-x-1 whitespace-nowrap no-print">
                          <button
                            onClick={() => setSelectedVoucherPrint(v)}
                            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-150 rounded cursor-pointer"
                            title="View / Print Voucher Slip"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {isHM && !v.isCancelled && (
                            <button
                              onClick={() => {
                                const r = prompt('Reason for cancellation of voucher:');
                                if (r) handleCancelVoucher(v, r);
                              }}
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer"
                              title="Cancel Voucher"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredVouchers.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 italic">No vouchers found matching search parameters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* VOUCHER CREATION MODAL/DRAWER */}
          {showAddVoucher && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 no-print">
              <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h4 className="font-bold text-slate-950 text-sm">Create New Accounting Journal Entry</h4>
                  <button onClick={() => setShowAddVoucher(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateVoucher} className="space-y-4">
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Voucher Type *</label>
                      <select
                        value={voucherType}
                        onChange={(e) => setVoucherType(e.target.value as any)}
                        className="w-full text-xs border border-slate-200 px-3 py-1.5 rounded-lg bg-white"
                      >
                        <option value="Receipt">Receipt Voucher (Income/Deposits)</option>
                        <option value="Payment">Payment Voucher (Expense/Payouts)</option>
                        <option value="Contra">Contra Voucher (Cash/Bank Transfer)</option>
                        <option value="Journal">Journal Voucher (Adjustments)</option>
                        <option value="Debit Note">Debit Note (Sales Return)</option>
                        <option value="Credit Note">Credit Note (Purchase Return)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Posting Date *</label>
                      <input
                        type="date"
                        required
                        value={vDate}
                        onChange={(e) => setVDate(e.target.value)}
                        className="w-full text-xs border border-slate-200 px-3 py-1.5 rounded-lg bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 font-medium">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1 text-emerald-800">Debit Account (Dr.) *</label>
                      <select
                        value={vDebitAccount}
                        onChange={(e) => setVDebitAccount(e.target.value)}
                        className="w-full text-xs border border-slate-200 px-3 py-1.5 rounded-lg bg-white"
                      >
                        {accounts.map(acc => (
                          <option key={acc.id} value={acc.id}>{acc.name} ({acc.group})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1 text-rose-800">Credit Account (Cr.) *</label>
                      <select
                        value={vCreditAccount}
                        onChange={(e) => setVCreditAccount(e.target.value)}
                        className="w-full text-xs border border-slate-200 px-3 py-1.5 rounded-lg bg-white"
                      >
                        {accounts.map(acc => (
                          <option key={acc.id} value={acc.id}>{acc.name} ({acc.group})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Transaction Amount (INR) *</label>
                      <input
                        type="number"
                        placeholder="INR 3,500"
                        required
                        value={vAmount || ''}
                        onChange={(e) => setVAmount(Number(e.target.value))}
                        className="w-full text-xs border border-slate-200 px-3 py-1.5 rounded-lg bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Payment Mode *</label>
                      <select
                        value={vPaymentMode}
                        onChange={(e) => setVPaymentMode(e.target.value as any)}
                        className="w-full text-xs border border-slate-200 px-3 py-1.5 rounded-lg bg-white"
                      >
                        <option value="Cash">Cash</option>
                        <option value="Cheque">Cheque</option>
                        <option value="NEFT">NEFT Transfer</option>
                        <option value="RTGS">RTGS Transfer</option>
                        <option value="UPI">UPI Digital Payment</option>
                        <option value="Internal Transfer">Internal Adjustment</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Reference Number / Bill No (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. BILL-982 or STUDENT-GR-823"
                        value={vReference}
                        onChange={(e) => setVReference(e.target.value)}
                        className="w-full text-xs border border-slate-200 px-3 py-1.5 rounded-lg bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Cheque / Tx Details (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Chq No: 028271, SBI"
                        value={vPaymentDetails}
                        onChange={(e) => setVPaymentDetails(e.target.value)}
                        className="w-full text-xs border border-slate-200 px-3 py-1.5 rounded-lg bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Narration (Detailed Description) *</label>
                    <textarea
                      placeholder="Write chronological specifics of why this voucher was issued..."
                      required
                      value={vNarration}
                      onChange={(e) => setVNarration(e.target.value)}
                      className="w-full text-xs border border-slate-200 px-3 py-1.5 rounded-lg bg-white h-20"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm cursor-pointer"
                  >
                    Post Voucher Ledger Record
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* SINGLE VOUCHER DETAILED PRINT SLIP VIEW MODAL */}
          {selectedVoucherPrint && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-6">
                
                <div className="flex justify-between items-center border-b border-slate-100 pb-2 no-print">
                  <span className="text-xs font-bold text-slate-400 font-mono">PRINT DESK</span>
                  <button type="button" onClick={() => setSelectedVoucherPrint(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                {/* Voucher Layout fit for A4 print */}
                <div id="accounting-voucher-print" className="border border-slate-300 p-6 rounded-xl bg-slate-50/50 space-y-6 text-left">
                  <div className="text-center space-y-1 border-b-2 border-slate-300 pb-3">
                    <h3 className="font-extrabold text-sm uppercase text-slate-950">NATIONAL HIGH SCHOOL, TALODA</h3>
                    <p className="text-[10px] text-slate-400">Gandhi Chowk, Taloda | Academic Session: {activeFYName}</p>
                    <p className="text-xs font-black bg-slate-200 py-1 uppercase tracking-widest">{selectedVoucherPrint.type} VOUCHER</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-[11px] leading-relaxed font-semibold">
                    <div>
                      <p className="text-slate-400 font-normal">Voucher No:</p>
                      <p className="font-mono text-slate-900 text-xs font-bold">{selectedVoucherPrint.voucherNo}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 font-normal">Date:</p>
                      <p className="font-mono text-slate-900 text-xs font-bold">{selectedVoucherPrint.date}</p>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-b border-dashed border-slate-300 py-4 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-normal">Debit Ledger (Dr.):</span>
                      <span className="font-black text-slate-850">
                        {accounts.find(a => a.id === selectedVoucherPrint.debitAccountId)?.name || selectedVoucherPrint.debitAccountId}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-normal">Credit Ledger (Cr.):</span>
                      <span className="font-black text-slate-850">
                        {accounts.find(a => a.id === selectedVoucherPrint.creditAccountId)?.name || selectedVoucherPrint.creditAccountId}
                      </span>
                    </div>
                    {selectedVoucherPrint.reference && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Ref / Invoice:</span>
                        <span className="font-mono font-bold text-slate-600">{selectedVoucherPrint.reference}</span>
                      </div>
                    )}
                    {selectedVoucherPrint.paymentDetails && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Payment Specifics:</span>
                        <span className="font-mono font-bold text-slate-600">{selectedVoucherPrint.paymentDetails}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800">Total Cleared Value:</span>
                    <span className="text-base font-black font-mono text-blue-900">INR {selectedVoucherPrint.amount.toLocaleString()}</span>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">Narration / Justification:</p>
                    <p className="text-xs text-slate-700 italic leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
                      {selectedVoucherPrint.narration}
                    </p>
                  </div>

                  {/* Signatures */}
                  <div className="grid grid-cols-3 gap-4 pt-10 text-center text-[10px] uppercase font-bold text-slate-500">
                    <div className="border-t border-slate-300 pt-1">Prepared By</div>
                    <div className="border-t border-slate-300 pt-1">Checked By</div>
                    <div className="border-t border-slate-300 pt-1">Headmaster Approved</div>
                  </div>
                </div>

                <div className="flex gap-2 justify-end no-print">
                  <button
                    type="button"
                    onClick={() => printSectionById('accounting-voucher-print', 'Official Accounting Voucher')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Slips</span>
                  </button>
                  <button
                    onClick={() => setSelectedVoucherPrint(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Close
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: CHART OF ACCOUNTS (COA) */}
      {/* ========================================================= */}
      {activeTab === 'coa' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
          
          {/* Add Account Form */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm lg:col-span-1 h-fit">
            <div className="border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-800 text-sm">Create Customizable Ledger Account</h3>
              <p className="text-[11px] text-slate-400">Configure custom double-entry accounts with opening balances without any coding</p>
            </div>

            <form onSubmit={handleAddAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Account Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Al-Khair Charity Fund Account"
                  required
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Account Category / Group *</label>
                <select
                  value={newAccGroup}
                  onChange={(e) => setNewAccGroup(e.target.value as any)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  <option value="Assets">Assets (Buildings, Land, Investments)</option>
                  <option value="Liabilities">Liabilities (Debts, Unpaid Grants)</option>
                  <option value="Income">Income (Fees, Grants, Charity)</option>
                  <option value="Expenses">Expenses (Repairs, Utilities, Bills)</option>
                  <option value="Bank">Bank (Savings/Current Bank Reserves)</option>
                  <option value="Cash">Cash (Physical Cash Handbooks)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Opening Balance (INR)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={newAccOpening || ''}
                  onChange={(e) => setNewAccOpening(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Detailed Description</label>
                <textarea
                  placeholder="Define ledger account audit purpose..."
                  value={newAccDesc}
                  onChange={(e) => setNewAccDesc(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white h-16"
                />
              </div>

              <button
                type="submit"
                disabled={!isAllowedToEdit}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-sm cursor-pointer"
              >
                {isAllowedToEdit ? 'Save & Register Account' : 'Not Authorized'}
              </button>
            </form>
          </div>

          {/* Accounts Directory List */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm lg:col-span-2">
            
            <div className="border-b border-slate-150 pb-2.5 flex justify-between items-center flex-wrap gap-2">
              <h3 className="font-bold text-slate-800 text-sm">School Chart of Accounts Directory</h3>
              
              {/* Group Filter */}
              <select
                value={accountFilterGroup}
                onChange={(e) => setAccountFilterGroup(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-white"
              >
                <option value="all">All Groups</option>
                <option value="Assets">Assets</option>
                <option value="Liabilities">Liabilities</option>
                <option value="Income">Income</option>
                <option value="Expenses">Expenses</option>
                <option value="Bank">Bank</option>
                <option value="Cash">Cash</option>
              </select>
            </div>

            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {accounts
                .filter(a => accountFilterGroup === 'all' || a.group === accountFilterGroup)
                .map(a => {
                  const bal = calculateAccountBalance(a.id);
                  return (
                    <div key={a.id} className="py-3 flex justify-between items-start text-xs gap-4 hover:bg-slate-50/50 px-2 rounded-xl transition-all">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-800">{a.name}</p>
                          <span className={`px-1.5 py-0.5 text-[9px] font-mono font-bold rounded ${
                            a.group === 'Income' ? 'bg-emerald-50 text-emerald-800' :
                            a.group === 'Expenses' ? 'bg-rose-50 text-rose-800' :
                            a.group === 'Assets' ? 'bg-indigo-50 text-indigo-800' : 'bg-slate-100 text-slate-800'
                          }`}>
                            {a.group}
                          </span>
                        </div>
                        <p className="text-slate-400 text-[10px] italic">{a.description}</p>
                      </div>

                      <div className="text-right space-y-1.5">
                        <p className="font-black text-slate-900 font-mono text-sm">₹{bal.toLocaleString()}</p>
                        <div className="flex gap-2 items-center justify-end">
                          <span className="text-[10px] text-slate-400">Opening: ₹{a.openingBalance}</span>
                          {!a.isSystem && isHM && (
                            <button type="button"
                              onClick={() => handleDeleteAccount(a.id)}
                              className="text-red-500 hover:text-red-700 p-0.5 rounded cursor-pointer"
                              title="Delete custom account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: DETAILED LEDGER BOOKS */}
      {/* ========================================================= */}
      {activeTab === 'ledgers' && (
        <div className="space-y-6 animate-fade-in text-left">
          
          {/* Selector header */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex justify-between items-center flex-wrap gap-4 no-print">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-400">Select Ledger Account:</span>
              <select
                value={selectedLedgerId}
                onChange={(e) => setSelectedLedgerId(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-bold text-slate-800"
              >
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.group})</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => printSectionById('accounting-ledger-print', 'Official Ledger Book')}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Ledger Book</span>
              </button>
            </div>
          </div>

          {/* Ledger book table */}
          <div id="accounting-ledger-print" className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm p-6 space-y-4">
            
            {/* Professional School Ledger Header */}
            <div className="text-center space-y-1 pb-4 border-b border-slate-200">
              <h2 className="font-extrabold text-base uppercase text-slate-950">NATIONAL HIGH SCHOOL, TALODA</h2>
              <p className="text-xs text-slate-400 font-mono">Gandhi Chowk, Taloda | Official Financial Account Book</p>
              <h3 className="text-sm font-black bg-blue-50 text-blue-900 py-1.5 rounded-lg max-w-lg mx-auto uppercase">
                Ledger Book: {accounts.find(a => a.id === selectedLedgerId)?.name} ({accounts.find(a => a.id === selectedLedgerId)?.group})
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-mono uppercase text-[10px] border-b border-slate-150">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Voucher No</th>
                    <th className="py-2.5 px-3">Transaction Description / Narration</th>
                    <th className="py-2.5 px-3 text-right">Debit (Dr.)</th>
                    <th className="py-2.5 px-3 text-right">Credit (Cr.)</th>
                    <th className="py-2.5 px-3 text-right">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Opening balance row */}
                  <tr className="bg-slate-50/50 font-bold">
                    <td className="py-3 px-3 italic text-slate-400">Start Session</td>
                    <td className="py-3 px-3 font-mono text-slate-400">-</td>
                    <td className="py-3 px-3 text-slate-500 italic">Opening Balance Carried Forward</td>
                    <td className="py-3 px-3 text-right">-</td>
                    <td className="py-3 px-3 text-right">-</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-900">
                      INR {accounts.find(a => a.id === selectedLedgerId)?.openingBalance.toLocaleString() || 0}
                    </td>
                  </tr>

                  {getLedgerHistory(selectedLedgerId).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/20">
                      <td className="py-3 px-3 text-slate-500 font-mono">{row.date}</td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">{row.voucherNo}</td>
                      <td className="py-3 px-3">
                        <p className="text-slate-700 font-medium">{row.narration}</p>
                        {row.item.reference && <span className="text-[9px] text-blue-600 bg-blue-50 px-1 rounded">Ref: {row.item.reference}</span>}
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-700 font-bold font-mono">
                        {row.debit > 0 ? `INR ${row.debit.toLocaleString()}` : '-'}
                      </td>
                      <td className="py-3 px-3 text-right text-rose-700 font-bold font-mono">
                        {row.credit > 0 ? `INR ${row.credit.toLocaleString()}` : '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-slate-900 font-mono">
                        INR {row.balance.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total balance summary */}
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-150 font-bold mt-4">
              <span className="text-slate-600">Final Ledger Balances:</span>
              <span className="text-sm font-black text-slate-900 font-mono">
                Closing: INR {calculateAccountBalance(selectedLedgerId).toLocaleString()}
              </span>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: CASH / BANK BOOK */}
      {/* ========================================================= */}
      {activeTab === 'cashbook' && (
        <div className="space-y-6 animate-fade-in text-left">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* CASH BOOK BOX */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="border-b border-slate-150 pb-2 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  <span>Main Physical Cash Book</span>
                </h3>
                <span className="font-black text-emerald-700 font-mono text-sm">₹{cashBalance.toLocaleString()}</span>
              </div>

              {/* Transactions list in Cash safe */}
              <div className="space-y-3.5 max-h-[350px] overflow-y-auto">
                {getLedgerHistory('acc_cash').map((row, idx) => (
                  <div key={idx} className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 flex justify-between items-center text-xs">
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-800">{row.narration}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{row.date} | {row.voucherNo}</p>
                    </div>
                    
                    <div className="text-right">
                      <p className={`font-black font-mono ${row.debit > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {row.debit > 0 ? `+ ₹${row.debit}` : `- ₹${row.credit}`}
                      </p>
                      <p className="text-[9px] text-slate-400">Balance: ₹{row.balance}</p>
                    </div>
                  </div>
                ))}
                {getLedgerHistory('acc_cash').length === 0 && (
                  <p className="text-xs text-slate-400 italic py-12 text-center">No cash register entries logged.</p>
                )}
              </div>
            </div>

            {/* BANK BOOK BOX */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="border-b border-slate-150 pb-2 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <Landmark className="w-4 h-4 text-blue-600" />
                  <span>Treasury Bank Registers</span>
                </h3>
                <span className="font-black text-blue-700 font-mono text-sm">₹{bankBalance.toLocaleString()}</span>
              </div>

              {/* Combined SBI & HDFC balances */}
              <div className="grid grid-cols-2 gap-3 pb-2 text-xs">
                <div className="bg-blue-50/50 p-2.5 rounded-xl border border-blue-100">
                  <p className="text-slate-500 text-[10px]">SBI Main Treasury:</p>
                  <p className="font-black text-blue-900 font-mono text-sm">₹{calculateAccountBalance('acc_bank_sbi').toLocaleString()}</p>
                </div>
                <div className="bg-blue-50/50 p-2.5 rounded-xl border border-blue-100">
                  <p className="text-slate-500 text-[10px]">HDFC Scholarship:</p>
                  <p className="font-black text-blue-900 font-mono text-sm">₹{calculateAccountBalance('acc_bank_hdfc').toLocaleString()}</p>
                </div>
              </div>

              {/* Bank transaction lists */}
              <div className="space-y-3.5 max-h-[250px] overflow-y-auto">
                {[...getLedgerHistory('acc_bank_sbi'), ...getLedgerHistory('acc_bank_hdfc')]
                  .sort((a,b) => b.date.localeCompare(a.date))
                  .map((row, idx) => (
                    <div key={idx} className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 flex justify-between items-center text-xs">
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-800">{row.narration}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {row.date} | {row.voucherNo} | Mode: {row.item.paymentMode}
                        </p>
                      </div>
                      
                      <div className="text-right font-medium">
                        <p className={`font-black font-mono ${row.debit > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {row.debit > 0 ? `+ ₹${row.debit}` : `- ₹${row.credit}`}
                        </p>
                        <span className={`px-1 text-[8px] font-black rounded ${
                          row.item.reconciliationStatus === 'Reconciled' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
                        }`}>
                          {row.item.reconciliationStatus}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 6: BANK RECONCILIATION */}
      {/* ========================================================= */}
      {activeTab === 'reconciliation' && (
        <div className="space-y-6 animate-fade-in text-left">
          
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="border-b border-slate-150 pb-2">
              <h3 className="font-bold text-slate-800 text-sm">School Bank Reconciliation Desk</h3>
              <p className="text-[11px] text-slate-400">Match generated vouchers with passbook clearances and record cleared timestamps</p>
            </div>

            <div className="flex gap-4 items-center no-print">
              <span className="text-xs font-bold text-slate-500">Reconciliation Value Date:</span>
              <input
                type="date"
                value={reconcileDate}
                onChange={(e) => setReconcileDate(e.target.value)}
                className="px-3 py-1 text-xs border border-slate-200 rounded-lg bg-white"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-mono uppercase text-[10px] border-b border-slate-150">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Voucher No</th>
                    <th className="py-2.5 px-3">Account Details</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3">Payment Details</th>
                    <th className="py-2.5 px-3">Cleared Status</th>
                    <th className="py-2.5 px-3 text-center no-print">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vouchers
                    .filter(v => (v.debitAccountId.startsWith('acc_bank_') || v.creditAccountId.startsWith('acc_bank_')) && !v.isCancelled)
                    .map(v => (
                      <tr key={v.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 font-mono text-slate-500">{v.date}</td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-850">{v.voucherNo}</td>
                        <td className="py-3 px-3 font-semibold text-slate-600">
                          {accounts.find(a => a.id === v.debitAccountId)?.name || v.debitAccountId} /{' '}
                          {accounts.find(a => a.id === v.creditAccountId)?.name || v.creditAccountId}
                        </td>
                        <td className="py-3 px-3 font-bold font-mono">{v.type}</td>
                        <td className="py-3 px-3 text-right font-black text-slate-900">INR {v.amount.toLocaleString()}</td>
                        <td className="py-3 px-3 italic text-slate-400 font-mono text-[10px]">{v.paymentMode} {v.paymentDetails && `(${v.paymentDetails})`}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase font-mono ${
                            v.reconciliationStatus === 'Reconciled' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
                          }`}>
                            {v.reconciliationStatus}
                          </span>
                          {v.reconciledDate && (
                            <p className="text-[9px] text-slate-400 font-mono mt-0.5">Date: {v.reconciledDate}</p>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center no-print">
                          {v.reconciliationStatus !== 'Reconciled' ? (
                            <button
                              onClick={() => handleReconcileVoucher(v)}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded shadow-sm cursor-pointer"
                            >
                              Clear
                            </button>
                          ) : (
                            <span className="text-emerald-700 font-bold text-[11px]">✓</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  {vouchers.filter(v => (v.debitAccountId.startsWith('acc_bank_') || v.creditAccountId.startsWith('acc_bank_')) && !v.isCancelled).length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 italic">No bank transactions logged currently.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 7: FINANCIAL STATEMENTS / REPORTS */}
      {/* ========================================================= */}
      {activeTab === 'reports' && (
        <div className="space-y-6 animate-fade-in text-left">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Trial Balance Overview */}
            {activeFeatureId !== 'finance-year-close' && (
            <div id="accounting-trial-balance-print" className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm md:col-span-2">
              <div className="border-b border-slate-150 pb-2 flex justify-between items-center flex-wrap gap-2">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">School Trial Balance & Category Summary</h3>
                  <p className="text-[10px] text-slate-400 italic">Cumulative balances across chart families</p>
                </div>
                <button
                  type="button"
                  onClick={() => printSectionById('accounting-trial-balance-print', 'School Trial Balance')}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer no-print"
                >
                  <Printer className="w-3 h-3" /> Print Trial Balance
                </button>
              </div>

              <div className="overflow-x-auto font-medium text-xs">
                <table className="w-full text-left text-xs divide-y divide-slate-100">
                  <thead>
                    <tr className="bg-slate-50 uppercase text-[9px] font-mono tracking-wider text-slate-400 border-b border-slate-150">
                      <th className="py-2.5 px-3">Ledger Name</th>
                      <th className="py-2.5 px-3">Group Classification</th>
                      <th className="py-2.5 px-3 text-right">Debit (Dr)</th>
                      <th className="py-2.5 px-3 text-right">Credit (Cr)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {accounts.map(a => {
                      const bal = calculateAccountBalance(a.id);
                      const isDrGroup = a.group === 'Expenses' || a.group === 'Assets' || a.group === 'Cash' || a.group === 'Bank';

                      return (
                        <tr key={a.id} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 font-bold text-slate-700">{a.name}</td>
                          <td className="py-2 px-3 font-mono uppercase text-[10px] text-slate-400">{a.group}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                            {isDrGroup && bal > 0 ? `INR ${bal.toLocaleString()}` : '-'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                            {!isDrGroup && bal > 0 ? `INR ${bal.toLocaleString()}` : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            )}

            {/* Financial Year Lock & Year Closing desk (HM ONLY) */}
            {activeFeatureId !== 'financial-statements' && (
            <div id="accounting-finance-year-close" className="scroll-mt-28 bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm md:col-span-1 h-fit">
              <div className="border-b border-slate-150 pb-2">
                <h3 className="font-bold text-slate-800 text-sm">FY Closing & Carry Forward Desk</h3>
                <p className="text-[11px] text-slate-400">Lock, seal, or carry forward ledger accounts</p>
              </div>

              <div className="space-y-4">
                {financialYears.map(fy => (
                  <div key={fy.id} className="p-3 bg-slate-50 rounded-xl border border-slate-150 text-xs space-y-2">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-slate-800">FY {fy.name}</span>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                        fy.isClosed ? 'bg-red-50 text-red-800 border border-red-100' : 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                      }`}>
                        {fy.isClosed ? 'Closed' : 'Active'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 font-mono leading-relaxed">
                      <p>Opening Bal: ₹{fy.openingBalance}</p>
                      {fy.closedAt && <p>Closed: {fy.closedAt}</p>}
                    </div>

                    {isHM && !fy.isClosed && (
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => handleCloseFinancialYear(fy.id)}
                          className="flex-1 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded text-[10px] cursor-pointer"
                        >
                          Close Session
                        </button>
                        <button
                          onClick={() => handleToggleLockYear(fy.id)}
                          className="flex-1 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded text-[10px] cursor-pointer"
                        >
                          {fy.isLocked ? 'Unlock' : 'Lock Ledger'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            )}

          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 8: AUDIT & SAFETY TRAIL LOGS */}
      {/* ========================================================= */}
      {activeTab === 'audit_trail' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 text-left animate-fade-in">
          <div className="border-b border-slate-150 pb-2">
            <h3 className="font-bold text-slate-800 text-sm">Accounting Safety & Security Audit Register</h3>
            <p className="text-[11px] text-slate-400">Traceable historical audit log tracking create, edit, cancellation, and authorization events</p>
          </div>

          <div className="divide-y divide-slate-100 max-h-[450px] overflow-y-auto">
            {LocalERPDatabase.getAuditLogs()
              .filter(log => log.module === 'Fees' || log.module === 'Accounts')
              .reverse() // Newest first
              .map(log => (
                <div key={log.id} className="py-2.5 flex justify-between items-center text-xs gap-4 hover:bg-slate-50/50 px-1 rounded-lg">
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-800">{log.details}</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      User: {log.userName} ({log.role}) | Action ID: {log.action} | Timestamp: {log.timestamp}
                    </p>
                  </div>
                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[9px] uppercase font-mono font-bold">
                    {log.module}
                  </span>
                </div>
              ))}
            {LocalERPDatabase.getAuditLogs().filter(log => log.module === 'Fees' || log.module === 'Accounts').length === 0 && (
              <p className="text-xs text-slate-400 italic text-center py-12">No audit log entries found for accounting ledger operations.</p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
