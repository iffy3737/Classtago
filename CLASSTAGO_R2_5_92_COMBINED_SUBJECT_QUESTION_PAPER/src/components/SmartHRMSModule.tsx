import React, { useState, useEffect } from 'react';
import { 
  User, 
  FileText, 
  Award, 
  TrendingUp, 
  Calendar, 
  ShieldAlert, 
  Plus, 
  Trash2, 
  Search, 
  Bookmark, 
  Percent, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  FilePlus,
  ArrowRight,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { LocalERPDatabase } from '../lib/supabase';
import { UserRole } from '../types';
import { requestActionConfirm } from '../lib/actionConfirm';

export interface ServiceBookEntry {
  id: string; // Teacher or Employee User ID
  employeeId: string;
  shalarthId: string;
  fullName: string;
  aadhaar: string;
  pan: string;
  qualification: string;
  appointmentOrder: string;
  designation: string;
  department: string;
  joiningDate: string;
  confirmationDate: string;
  promotionHistory: { id: string; date: string; from: string; to: string; orderNo: string; remarks: string }[];
  transferHistory: { id: string; date: string; from: string; to: string; orderNo: string; remarks: string }[];
  trainingHistory: { id: string; title: string; duration: string; institution: string; date: string }[];
  awards: { id: string; title: string; authority: string; date: string; desc: string }[];
  punishments: { id: string; title: string; authority: string; date: string; desc: string }[];
  retirementDetails: string;
  documents: { id: string; name: string; url: string; date: string }[];
}

export interface LoanRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'Festival Advance' | 'Salary Advance' | 'Employee Loan' | 'Emergency Loan';
  amount: number;
  repaymentMonths: number;
  monthlyRecovery: number;
  balance: number;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Active' | 'Paid';
  appliedDate: string;
  approvedDate?: string;
  repaymentStartMonth: string; // YYYY-MM
  paymentsMade: { month: string; amount: number; date: string }[];
}

export interface IncrementRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'Annual Increment' | 'Promotion Increment' | 'Special Increment' | 'DA Revision' | 'Pay Revision';
  amount: number;
  previousBasic: number;
  newBasic: number;
  orderNo: string;
  appliedDate: string;
  remarks: string;
}

interface SmartHRMSModuleProps {
  lang: 'en' | 'hi' | 'ur';
  user: { id: string; name: string; role: string };
  onRefreshData?: () => void;
  activeSection: 'service_book' | 'increments' | 'loans';
}

export default function SmartHRMSModule({ lang, user, onRefreshData, activeSection }: SmartHRMSModuleProps) {
  const isHM = user.role === 'headmaster';
  const isClerk = user.role === 'clerk';
  const canManage = isHM || isClerk;

  // Load staff/teachers from local setup
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  
  // Service book states
  const [serviceBooks, setServiceBooks] = useState<Record<string, ServiceBookEntry>>({});
  const [editingField, setEditingField] = useState<string | null>(null);
  
  // History append states
  const [promoForm, setPromoForm] = useState({ date: '', from: '', to: '', orderNo: '', remarks: '' });
  const [transferForm, setTransferForm] = useState({ date: '', from: '', to: '', orderNo: '', remarks: '' });
  const [trainingForm, setTrainingForm] = useState({ title: '', duration: '', institution: '', date: '' });
  const [awardForm, setAwardForm] = useState({ title: '', authority: '', date: '', desc: '' });
  const [punishForm, setPunishForm] = useState({ title: '', authority: '', date: '', desc: '' });
  
  // Loan states
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [newLoanForm, setNewLoanForm] = useState({
    employeeId: '',
    type: 'Festival Advance' as any,
    amount: 10000,
    repaymentMonths: 10,
    repaymentStartMonth: '2026-07'
  });

  // Increment states
  const [increments, setIncrements] = useState<IncrementRecord[]>([]);
  const [newIncForm, setNewIncForm] = useState({
    employeeId: '',
    type: 'Annual Increment' as any,
    amount: 2500,
    orderNo: 'NHS/INC/2026/012',
    remarks: 'Annual appraisal cycle increment'
  });

  useEffect(() => {
    // Load employees
    const users = LocalERPDatabase.getUsers().filter(u => (u.role === 'teacher' || u.role === 'clerk') && u.isActive && u.status === 'Active');
    const profiles = LocalERPDatabase.getAcademicSetup().teacherProfiles || [];
    
    // Merge user with profiles
    const merged = users.map(u => {
      const p = profiles.find(prof => prof.id === u.id || prof.shalarthId === u.shalarthId);
      return {
        id: u.id,
        fullName: u.name,
        employeeId: u.employeeCode || p?.employeeId || '',
        shalarthId: u.shalarthId || p?.shalarthId || '',
        designation: u.designation || p?.designation || 'Staff',
        joiningDate: p?.joiningDate || '',
        qualification: u.qualification || p?.qualification || '',
        email: u.email,
        phone: u.phone,
        pan: '',
        aadhaar: ''
      };
    });
    setEmployees(merged);
    
    if (merged.length > 0 && !selectedEmpId) {
      setSelectedEmpId(merged[0].id);
    }

    // Load Service Books. If none exist, create identity-only blank shells from real staff records.
    const storedBooks = localStorage.getItem('nhs_erp_service_books');
    if (storedBooks) {
      setServiceBooks(JSON.parse(storedBooks));
    } else {
      const blankBooks: Record<string, ServiceBookEntry> = {};
      merged.forEach(m => {
        blankBooks[m.id] = {
          id: m.id, employeeId: m.employeeId, shalarthId: m.shalarthId, fullName: m.fullName,
          aadhaar: '', pan: '', qualification: m.qualification, appointmentOrder: '',
          designation: m.designation, department: '', joiningDate: m.joiningDate, confirmationDate: '',
          promotionHistory: [], transferHistory: [], trainingHistory: [], awards: [], punishments: [],
          retirementDetails: '', documents: []
        };
      });
      setServiceBooks(blankBooks);
    }

    const storedLoans = localStorage.getItem('nhs_erp_loans');
    setLoans(storedLoans ? JSON.parse(storedLoans) : []);

    const storedIncrements = localStorage.getItem('nhs_erp_increments');
    setIncrements(storedIncrements ? JSON.parse(storedIncrements) : []);
  }, []);

  const saveServiceBooks = (updated: Record<string, ServiceBookEntry>) => {
    setServiceBooks(updated);
    localStorage.setItem('nhs_erp_service_books', JSON.stringify(updated));
  };

  const saveLoans = (updated: LoanRecord[]) => {
    setLoans(updated);
    localStorage.setItem('nhs_erp_loans', JSON.stringify(updated));
  };

  const saveIncrements = (updated: IncrementRecord[]) => {
    setIncrements(updated);
    localStorage.setItem('nhs_erp_increments', JSON.stringify(updated));
  };

  // Service Book Operations
  const handleUpdateCoreField = (field: keyof ServiceBookEntry, val: string) => {
    if (!selectedEmpId || !serviceBooks[selectedEmpId]) return;
    const updated = { ...serviceBooks };
    updated[selectedEmpId] = {
      ...updated[selectedEmpId],
      [field]: val
    };
    saveServiceBooks(updated);
    setEditingField(null);
    
    // Add audit log
    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role as any,
      'UPDATE_SERVICE_BOOK',
      'HRMS',
      `Updated ${String(field)} for employee ${updated[selectedEmpId].fullName}`
    );
  };

  const handleAddHistory = (type: 'promotion' | 'transfer' | 'training' | 'award' | 'punish') => {
    if (!selectedEmpId || !serviceBooks[selectedEmpId]) return;
    const updated = { ...serviceBooks };
    const empBook = updated[selectedEmpId];
    const id = `hist_${Date.now()}`;

    if (type === 'promotion') {
      empBook.promotionHistory.push({ id, ...promoForm });
      setPromoForm({ date: '', from: '', to: '', orderNo: '', remarks: '' });
    } else if (type === 'transfer') {
      empBook.transferHistory.push({ id, ...transferForm });
      setTransferForm({ date: '', from: '', to: '', orderNo: '', remarks: '' });
    } else if (type === 'training') {
      empBook.trainingHistory.push({ id, ...trainingForm });
      setTrainingForm({ title: '', duration: '', institution: '', date: '' });
    } else if (type === 'award') {
      empBook.awards.push({ id, ...awardForm });
      setAwardForm({ title: '', authority: '', date: '', desc: '' });
    } else if (type === 'punish') {
      empBook.punishments.push({ id, ...punishForm });
      setPunishForm({ title: '', authority: '', date: '', desc: '' });
    }

    saveServiceBooks(updated);
    
    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role as any,
      'ADD_HRMS_HISTORY',
      'HRMS',
      `Added ${type} record to service book of ${empBook.fullName}`
    );
  };

  const handleDeleteHistory = async (type: string, itemId: string) => {
    if (!selectedEmpId || !serviceBooks[selectedEmpId] || !canManage) return;
    if (!(await requestActionConfirm({ title: 'Delete service-book record?', message: `Delete this ${type} record from the selected employee service book?`, confirmLabel: 'Delete Record', tone: 'danger' }))) return;
    const updated = { ...serviceBooks };
    const empBook = updated[selectedEmpId];

    if (type === 'promotion') empBook.promotionHistory = empBook.promotionHistory.filter(h => h.id !== itemId);
    if (type === 'transfer') empBook.transferHistory = empBook.transferHistory.filter(h => h.id !== itemId);
    if (type === 'training') empBook.trainingHistory = empBook.trainingHistory.filter(h => h.id !== itemId);
    if (type === 'award') empBook.awards = empBook.awards.filter(h => h.id !== itemId);
    if (type === 'punish') empBook.punishments = empBook.punishments.filter(h => h.id !== itemId);

    saveServiceBooks(updated);
  };

  // Loans & Advances operations
  const handleApplyLoan = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find(e => e.id === newLoanForm.employeeId);
    if (!emp) return alert('Select an employee first');

    const monthlyRecovery = Math.round(newLoanForm.amount / newLoanForm.repaymentMonths);
    const newRecord: LoanRecord = {
      id: `loan_${Date.now()}`,
      employeeId: newLoanForm.employeeId,
      employeeName: emp.fullName,
      type: newLoanForm.type,
      amount: newLoanForm.amount,
      repaymentMonths: newLoanForm.repaymentMonths,
      monthlyRecovery,
      balance: newLoanForm.amount,
      status: isHM ? 'Active' : 'Pending',
      appliedDate: new Date().toISOString().split('T')[0],
      approvedDate: isHM ? new Date().toISOString().split('T')[0] : undefined,
      repaymentStartMonth: newLoanForm.repaymentStartMonth,
      paymentsMade: []
    };

    saveLoans([newRecord, ...loans]);
    
    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role as any,
      isHM ? 'APPROVE_LOAN' : 'APPLY_LOAN',
      'HRMS',
      `Applied for ${newLoanForm.type} of amount ₹${newLoanForm.amount} for ${emp.fullName}`
    );
    
    alert(isHM ? 'Loan created and active immediately!' : 'Loan application submitted for Headmaster approval!');
  };

  const handleUpdateLoanStatus = (id: string, status: 'Active' | 'Rejected') => {
    if (!isHM) return;
    const updated = loans.map(l => {
      if (l.id === id) {
        return {
          ...l,
          status,
          approvedDate: status === 'Active' ? new Date().toISOString().split('T')[0] : undefined
        };
      }
      return l;
    });
    saveLoans(updated);

    const affectedLoan = loans.find(l => l.id === id);
    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role as any,
      `LOAN_STATUS_${status.toUpperCase()}`,
      'HRMS',
      `Headmaster ${status === 'Active' ? 'Approved' : 'Rejected'} Loan Application for ${affectedLoan?.employeeName}`
    );
  };

  // Increments management
  const handleApplyIncrement = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find(e => e.id === newIncForm.employeeId);
    if (!emp) return alert('Select an employee first');

    // Get current salary basic pay from payroll configurations (standard fallback is ₹30,000)
    let currentBasic = 30000;
    const storedPaySetup = localStorage.getItem('nhs_erp_employee_salary_profiles');
    let payProfiles = storedPaySetup ? JSON.parse(storedPaySetup) : {};
    if (payProfiles[newIncForm.employeeId]?.['Basic Pay']) {
      currentBasic = payProfiles[newIncForm.employeeId]['Basic Pay'];
    }

    const newBasic = currentBasic + newIncForm.amount;
    const newRecord: IncrementRecord = {
      id: `inc_${Date.now()}`,
      employeeId: newIncForm.employeeId,
      employeeName: emp.fullName,
      type: newIncForm.type,
      amount: newIncForm.amount,
      previousBasic: currentBasic,
      newBasic,
      orderNo: newIncForm.orderNo,
      appliedDate: new Date().toISOString().split('T')[0],
      remarks: newIncForm.remarks
    };

    saveIncrements([newRecord, ...increments]);

    // Update the employee pay profile basic salary immediately!
    payProfiles[newIncForm.employeeId] = {
      ...(payProfiles[newIncForm.employeeId] || {
        'Basic Pay': currentBasic,
        'Grade Pay': 1800,
        'DA': Math.round(currentBasic * 0.42),
        'HRA': Math.round(currentBasic * 0.09),
        'TA': 1600,
        'PF': 1800,
        'PT': 200,
        'Income Tax': 0
      }),
      'Basic Pay': newBasic
    };
    localStorage.setItem('nhs_erp_employee_salary_profiles', JSON.stringify(payProfiles));

    // Also update Service book history
    if (serviceBooks[newIncForm.employeeId]) {
      const updatedBooks = { ...serviceBooks };
      updatedBooks[newIncForm.employeeId].incrementHistory = updatedBooks[newIncForm.employeeId].incrementHistory || [];
      updatedBooks[newIncForm.employeeId].incrementHistory.push({
        id: `inc_hist_${Date.now()}`,
        date: newRecord.appliedDate,
        type: newRecord.type,
        amount: newRecord.amount,
        previousBasic: newRecord.previousBasic,
        newBasic: newRecord.newBasic,
        orderNo: newRecord.orderNo,
        remarks: newRecord.remarks
      } as any);
      saveServiceBooks(updatedBooks);
    }

    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role as any,
      'APPLY_INCREMENT',
      'HRMS',
      `Applied ${newIncForm.type} of ₹${newIncForm.amount} to ${emp.fullName}. Basic salary revised from ₹${currentBasic} to ₹${newBasic}.`
    );

    if (onRefreshData) onRefreshData();
    alert(`Success! revised basic salary is updated in Employee Pay Profiles as ₹${newBasic}`);
  };

  const activeBook = selectedEmpId ? serviceBooks[selectedEmpId] : null;

  return (
    <div className="space-y-6">
      {/* Employee Selector for Service Book */}
      {activeSection === 'service_book' && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">
                {lang === 'ur' ? 'ڈیجیٹل سروس بک اور تاریخ' : lang === 'hi' ? 'डिजिटल सर्विस बुक और इतिहास' : 'Digital Service Book & History'}
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'ur' ? 'ملازم کا انتخاب کریں اور سروس بک کی تفصیلات دیکھیں' : 'Select an employee to manage or inspect service records'}
              </p>
            </div>
          </div>
          
          <div className="min-w-[250px]">
            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName} ({emp.designation})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* 1. SERVICE BOOK VIEW */}
      {activeSection === 'service_book' && activeBook && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Employment Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-xl space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-32 h-32 bg-white/5 rounded-full blur-xl"></div>
              
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-950 border-4 border-white/20 text-2xl font-bold font-mono">
                  {activeBook.fullName.split(' ').pop()?.substring(0,2).toUpperCase() || 'SB'}
                </div>
                <div>
                  <h4 className="font-bold text-lg">{activeBook.fullName}</h4>
                  <p className="text-xs text-indigo-200">{activeBook.designation}</p>
                  <span className="inline-block mt-2 bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold uppercase">
                    Permanent Record
                  </span>
                </div>
              </div>

              <div className="border-t border-white/10 pt-4 space-y-3 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-indigo-300">Employee ID:</span>
                  <span className="font-bold">{activeBook.employeeId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-indigo-300">SHALARTH ID:</span>
                  <span className="font-bold">{activeBook.shalarthId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-indigo-300">Aadhaar (UIDAI):</span>
                  <span className="font-bold">{activeBook.aadhaar}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-indigo-300">PAN Account:</span>
                  <span className="font-bold">{activeBook.pan}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-indigo-300">Appointment Order:</span>
                  <span className="font-bold">{activeBook.appointmentOrder}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-indigo-300">Joining Date:</span>
                  <span className="font-bold">{activeBook.joiningDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-indigo-300">Confirmation Date:</span>
                  <span className="font-bold">{activeBook.confirmationDate || 'Pending'}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions / Editable core parameters */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Bookmark className="w-4 h-4 text-indigo-600" />
                Service Book Core Parameters
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 font-mono">Qualification & Degrees</label>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm font-semibold text-slate-700">{activeBook.qualification}</span>
                    {canManage && (
                      <button 
                        onClick={() => {
                          const val = prompt('Enter revised qualification:', activeBook.qualification);
                          if (val) handleUpdateCoreField('qualification', val);
                        }}
                        className="text-xs text-indigo-600 font-semibold hover:underline cursor-pointer"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 font-mono">Department Section</label>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm font-semibold text-slate-700">{activeBook.department}</span>
                    {canManage && (
                      <button 
                        onClick={() => {
                          const val = prompt('Enter revised department:', activeBook.department);
                          if (val) handleUpdateCoreField('department', val);
                        }}
                        className="text-xs text-indigo-600 font-semibold hover:underline cursor-pointer"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 font-mono">Retirement details</label>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-semibold text-slate-700">{activeBook.retirementDetails}</span>
                    {canManage && (
                      <button 
                        onClick={() => {
                          const val = prompt('Enter retirement / superannuation details:', activeBook.retirementDetails);
                          if (val) handleUpdateCoreField('retirementDetails', val);
                        }}
                        className="text-xs text-indigo-600 font-semibold hover:underline cursor-pointer"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Chronological Service History */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-6">
              
              {/* Promotion History */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    Promotion & Progression History
                  </h4>
                  {canManage && (
                    <button 
                      onClick={() => {
                        const from = prompt('From Designation:', activeBook.designation);
                        const to = prompt('To Designation:');
                        const date = prompt('Promotion Date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
                        const orderNo = prompt('Order Reference Number:');
                        const remarks = prompt('Remarks:');
                        if (from && to && date && orderNo) {
                          setPromoForm({ date, from, to, orderNo, remarks: remarks || '' });
                          setTimeout(() => handleAddHistory('promotion'), 100);
                        }
                      }}
                      className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-bold hover:bg-indigo-100 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Add Promotion
                    </button>
                  )}
                </div>

                {activeBook.promotionHistory.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No historical promotion events registered.</p>
                ) : (
                  <div className="space-y-3">
                    {activeBook.promotionHistory.map(item => (
                      <div key={item.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-start justify-between text-xs">
                        <div className="space-y-1">
                          <p className="font-bold text-slate-700 flex items-center gap-1">
                            {item.from} <ArrowRight className="w-3 h-3 text-slate-400" /> {item.to}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            Date: {item.date} | Order No: {item.orderNo}
                          </p>
                          {item.remarks && <p className="text-slate-500 italic mt-1">"{item.remarks}"</p>}
                        </div>
                        {canManage && (
                          <button type="button" onClick={() => handleDeleteHistory('promotion', item.id)} className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Transfer History */}
              <div className="border-t border-slate-100 pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-blue-600" />
                    Deputation & Transfer Records
                  </h4>
                  {canManage && (
                    <button 
                      onClick={() => {
                        const from = prompt('From Institution/HQ:', 'National High School, Taloda');
                        const to = prompt('To Institution/HQ:');
                        const date = prompt('Date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
                        const orderNo = prompt('Government Order Number:');
                        const remarks = prompt('Remarks:');
                        if (from && to && date && orderNo) {
                          setTransferForm({ date, from, to, orderNo, remarks: remarks || '' });
                          setTimeout(() => handleAddHistory('transfer'), 100);
                        }
                      }}
                      className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-bold hover:bg-indigo-100 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Record Transfer
                    </button>
                  )}
                </div>

                {activeBook.transferHistory.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No historical transfer or deputation events registered.</p>
                ) : (
                  <div className="space-y-3">
                    {activeBook.transferHistory.map(item => (
                      <div key={item.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-start justify-between text-xs">
                        <div className="space-y-1">
                          <p className="font-bold text-slate-700 flex items-center gap-1">
                            {item.from} <ArrowRight className="w-3 h-3 text-slate-400" /> {item.to}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            Date: {item.date} | Order No: {item.orderNo}
                          </p>
                          {item.remarks && <p className="text-slate-500 italic mt-1">"{item.remarks}"</p>}
                        </div>
                        {canManage && (
                          <button type="button" onClick={() => handleDeleteHistory('transfer', item.id)} className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Training History */}
              <div className="border-t border-slate-100 pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-600" />
                    In-Service Training & Academic Seminars
                  </h4>
                  {canManage && (
                    <button 
                      onClick={() => {
                        const title = prompt('Training Course Title:');
                        const duration = prompt('Duration (e.g. 5 Days, 1 Month):');
                        const institution = prompt('Organizing Institution:', 'SCERT Maharashtra');
                        const date = prompt('Date:', new Date().toISOString().split('T')[0]);
                        if (title && duration && institution) {
                          setTrainingForm({ title, duration, institution, date: date || '' });
                          setTimeout(() => handleAddHistory('training'), 100);
                        }
                      }}
                      className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-bold hover:bg-indigo-100 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Record Training
                    </button>
                  )}
                </div>

                {activeBook.trainingHistory.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No custom academic trainings recorded yet.</p>
                ) : (
                  <div className="space-y-3">
                    {activeBook.trainingHistory.map(item => (
                      <div key={item.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-start justify-between text-xs">
                        <div>
                          <p className="font-bold text-slate-700">{item.title}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Duration: {item.duration} | Organized By: {item.institution} | Date: {item.date}
                          </p>
                        </div>
                        {canManage && (
                          <button type="button" onClick={() => handleDeleteHistory('training', item.id)} className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Awards and Punishments (Clean Side-by-side) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 pt-6">
                
                {/* Awards */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-emerald-800 text-xs flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-emerald-600" />
                      Recognition & Awards
                    </h5>
                    {canManage && (
                      <button 
                        onClick={() => {
                          const title = prompt('Award Title:');
                          const auth = prompt('Issuing Authority:');
                          const date = prompt('Date:', new Date().toISOString().split('T')[0]);
                          const desc = prompt('Brief description:');
                          if (title && auth) {
                            setAwardForm({ title, authority: auth, date: date || '', desc: desc || '' });
                            setTimeout(() => handleAddHistory('award'), 100);
                          }
                        }}
                        className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold hover:bg-emerald-100 cursor-pointer"
                      >
                        + Record
                      </button>
                    )}
                  </div>

                  {activeBook.awards.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic">No awards documented.</p>
                  ) : (
                    <div className="space-y-2">
                      {activeBook.awards.map(item => (
                        <div key={item.id} className="p-2.5 bg-emerald-50/50 rounded border border-emerald-100 text-xs">
                          <div className="flex justify-between">
                            <span className="font-bold text-slate-700">{item.title}</span>
                            {canManage && (
                              <button type="button" onClick={() => handleDeleteHistory('award', item.id)} className="text-rose-500 hover:text-rose-700 cursor-pointer">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono">By: {item.authority} ({item.date})</p>
                          {item.desc && <p className="text-slate-500 italic mt-1 text-[11px]">"{item.desc}"</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Punishments */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-rose-800 text-xs flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-rose-600" />
                      Disciplinary Actions
                    </h5>
                    {canManage && (
                      <button 
                        onClick={() => {
                          const title = prompt('Disciplinary Matter:');
                          const auth = prompt('Authority Code/Memo Ref:');
                          const date = prompt('Memo Date:');
                          const desc = prompt('Action Taken / Warning issued:');
                          if (title && auth) {
                            setPunishForm({ title, authority: auth, date: date || '', desc: desc || '' });
                            setTimeout(() => handleAddHistory('punish'), 100);
                          }
                        }}
                        className="text-[10px] bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded font-bold hover:bg-rose-100 cursor-pointer"
                      >
                        + Record
                      </button>
                    )}
                  </div>

                  {activeBook.punishments.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic text-center py-2 bg-slate-50 rounded">
                      ✔ Nil - Outstanding service record.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {activeBook.punishments.map(item => (
                        <div key={item.id} className="p-2.5 bg-rose-50/50 rounded border border-rose-100 text-xs">
                          <div className="flex justify-between">
                            <span className="font-bold text-rose-700">{item.title}</span>
                            {canManage && (
                              <button type="button" onClick={() => handleDeleteHistory('punish', item.id)} className="text-rose-500 hover:text-rose-700 cursor-pointer">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono">By: {item.authority} ({item.date})</p>
                          {item.desc && <p className="text-rose-500 mt-1 text-[11px] font-semibold">{item.desc}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 2. INCREMENTS MANAGEMENT PANEL */}
      {activeSection === 'increments' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Apply Increment Form */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-6">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                Register New Salary Revision
              </h3>

              <form onSubmit={handleApplyIncrement} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Select Employee *</label>
                  <select
                    value={newIncForm.employeeId}
                    onChange={(e) => setNewIncForm({...newIncForm, employeeId: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">-- Choose Employee --</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.fullName} ({e.designation})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Revision Type *</label>
                  <select
                    value={newIncForm.type}
                    onChange={(e) => setNewIncForm({...newIncForm, type: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Annual Increment">Annual Increment</option>
                    <option value="Promotion Increment">Promotion Increment</option>
                    <option value="Special Increment">Special Increment</option>
                    <option value="DA Revision">DA Revision</option>
                    <option value="Pay Revision">Pay Revision</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Increment Amount (₹) *</label>
                  <input
                    type="number"
                    value={newIncForm.amount}
                    onChange={(e) => setNewIncForm({...newIncForm, amount: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    min="1"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">This amount will be directly added to the Basic Pay of the selected employee's structure.</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Appraisal / Increment Order No. *</label>
                  <input
                    type="text"
                    value={newIncForm.orderNo}
                    onChange={(e) => setNewIncForm({...newIncForm, orderNo: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. NHS/INC/2026/02"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Justification Remarks</label>
                  <textarea
                    value={newIncForm.remarks}
                    onChange={(e) => setNewIncForm({...newIncForm, remarks: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 h-20"
                    placeholder="Record reason, ZP recommendations etc..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={!canManage}
                  className="w-full py-2 bg-indigo-600 text-white font-bold text-sm rounded-lg hover:bg-indigo-700 transition disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer"
                >
                  Apply & Revise Basic Salary
                </button>
              </form>
            </div>
          </div>

          {/* Increment Ledger History */}
          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                Revision & Increment Ledger Registry
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-mono uppercase text-[10px] border-b border-slate-200">
                      <th className="p-3">Employee Name</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Amt (₹)</th>
                      <th className="p-3">Previous Base</th>
                      <th className="p-3">Revised Base</th>
                      <th className="p-3">Order Code</th>
                      <th className="p-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {increments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-4 text-center text-slate-400 italic">No salary increment events registered in this academic session.</td>
                      </tr>
                    ) : (
                      increments.map(inc => (
                        <tr key={inc.id} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-800">{inc.employeeName}</td>
                          <td className="p-3">
                            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold font-mono text-[10px]">
                              {inc.type}
                            </span>
                          </td>
                          <td className="p-3 text-emerald-600 font-bold font-mono">+{inc.amount}</td>
                          <td className="p-3 text-slate-400 font-mono">₹{inc.previousBasic}</td>
                          <td className="p-3 text-indigo-900 font-bold font-mono">₹{inc.newBasic}</td>
                          <td className="p-3 font-mono font-bold text-slate-500">{inc.orderNo}</td>
                          <td className="p-3 font-mono text-slate-500">{inc.appliedDate}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. LOANS & ADVANCES MANAGEMENT PANEL */}
      {activeSection === 'loans' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Apply Loan Form */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-6">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                Issue Loan / Festival Advance
              </h3>

              <form onSubmit={handleApplyLoan} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Select Employee *</label>
                  <select
                    value={newLoanForm.employeeId}
                    onChange={(e) => setNewLoanForm({...newLoanForm, employeeId: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">-- Choose Employee --</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.fullName} ({e.designation})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Advance Type *</label>
                  <select
                    value={newLoanForm.type}
                    onChange={(e) => setNewLoanForm({...newLoanForm, type: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Festival Advance">Festival Advance</option>
                    <option value="Salary Advance">Salary Advance</option>
                    <option value="Employee Loan">Employee Loan</option>
                    <option value="Emergency Loan">Emergency Loan</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Loan Principal Amount (₹) *</label>
                  <input
                    type="number"
                    value={newLoanForm.amount}
                    onChange={(e) => setNewLoanForm({...newLoanForm, amount: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    min="1000"
                    step="1000"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Repayment Period (Months) *</label>
                  <input
                    type="number"
                    value={newLoanForm.repaymentMonths}
                    onChange={(e) => setNewLoanForm({...newLoanForm, repaymentMonths: parseInt(e.target.value) || 1})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    min="1"
                    max="60"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Monthly Recovery will be <span className="font-bold text-slate-700">₹{Math.round(newLoanForm.amount / newLoanForm.repaymentMonths)}</span> automatically deducted from the monthly payroll.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Deduction Commencing Month *</label>
                  <input
                    type="month"
                    value={newLoanForm.repaymentStartMonth}
                    onChange={(e) => setNewLoanForm({...newLoanForm, repaymentStartMonth: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={!canManage}
                  className="w-full py-2 bg-emerald-600 text-white font-bold text-sm rounded-lg hover:bg-emerald-700 transition disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer"
                >
                  Create Loan Agreement
                </button>
              </form>
            </div>
          </div>

          {/* Active Loans Ledger */}
          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-indigo-600" />
                Active Loans & Recovery Ledgers
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-mono uppercase text-[10px] border-b border-slate-200">
                      <th className="p-3">Employee Name</th>
                      <th className="p-3">Advance Type</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Monthly Recovery</th>
                      <th className="p-3">O/S Balance</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loans.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-4 text-center text-slate-400 italic">No loan or advance records registered yet.</td>
                      </tr>
                    ) : (
                      loans.map(loan => (
                        <tr key={loan.id} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-800">{loan.employeeName}</td>
                          <td className="p-3 font-semibold">{loan.type}</td>
                          <td className="p-3 font-mono font-bold text-slate-600">₹{loan.amount}</td>
                          <td className="p-3 font-mono text-emerald-600 font-bold">₹{loan.monthlyRecovery}</td>
                          <td className="p-3 font-mono font-bold text-rose-600">₹{loan.balance}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase font-mono ${
                              loan.status === 'Active' ? 'bg-emerald-100 text-emerald-800' :
                              loan.status === 'Paid' ? 'bg-blue-100 text-blue-800' :
                              loan.status === 'Pending' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {loan.status}
                            </span>
                          </td>
                          <td className="p-3">
                            {loan.status === 'Pending' && isHM && (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleUpdateLoanStatus(loan.id, 'Active')}
                                  className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-bold hover:bg-emerald-100 text-[10px] cursor-pointer"
                                >
                                  Approve
                                </button>
                                <button type="button"
                                  onClick={() => handleUpdateLoanStatus(loan.id, 'Rejected')}
                                  className="bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded font-bold hover:bg-rose-100 text-[10px] cursor-pointer"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                            {loan.status === 'Active' && (
                              <span className="text-[10px] text-slate-400 italic">Deducting from salary...</span>
                            )}
                            {loan.status === 'Paid' && (
                              <span className="text-[10px] text-emerald-600 font-bold">Paid Off</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
