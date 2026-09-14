import React, { useState, useEffect } from 'react';
import { 
  Shield, Users, Car, FileText, CheckCircle, Clock, Search, 
  UserPlus, Plus, Eye, Printer, LogOut, ArrowLeftRight, Check,
  UserCheck, ClipboardList, AlertTriangle
} from 'lucide-react';
import { LocalERPDatabase } from '../lib/supabase';
import { VisitorRecord, StudentGatePass, StaffGatePass, VehicleRecord, User } from '../types';
import { printSectionById } from '../utils/printSection';
import { PrintLetterhead, PrintSignatureArea } from './PrintPDFButton';

interface SmartSecurityManagerProps {
  lang: 'en' | 'hi' | 'ur';
  user: User;
  activeFeatureId?: string | null;
  focusedMode?: boolean;
  focusedTitle?: string;
}

type SecurityTab = 'visitors' | 'studentPasses' | 'staffPasses' | 'vehicles' | 'alerts';

const SECURITY_FEATURE_TAB: Record<string, SecurityTab> = {
  'cl-security-visitors': 'visitors',
  'cl-security-student-passes': 'studentPasses',
  'cl-security-staff-passes': 'staffPasses',
  'cl-security-vehicle-register': 'vehicles',
  'cl-security-alerts': 'alerts',
  'visitor-security': 'visitors',
  'student-gate-passes': 'studentPasses',
  'staff-gate-passes': 'staffPasses',
  'vehicle-register': 'vehicles',
  'security-alerts': 'alerts'
};

export default function SmartSecurityManager({
  lang,
  user,
  activeFeatureId = null,
  focusedMode = false,
  focusedTitle = 'Campus Security & Gate Pass'
}: SmartSecurityManagerProps) {
  // Tabs for Campus Security Manager
  const [activeTab, setActiveTab] = useState<SecurityTab>('visitors');

  // Loaders
  const [visitors, setVisitors] = useState<VisitorRecord[]>([]);
  const [studentPasses, setStudentPasses] = useState<StudentGatePass[]>([]);
  const [staffPasses, setStaffPasses] = useState<StaffGatePass[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);

  // Modals / forms
  const [showAddVisitor, setShowAddVisitor] = useState(false);
  const [showAddStudentPass, setShowAddStudentPass] = useState(false);
  const [showAddStaffPass, setShowAddStaffPass] = useState(false);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [studentPassToPrint, setStudentPassToPrint] = useState<StudentGatePass | null>(null);

  // Search parameters
  const [searchQuery, setSearchQuery] = useState('');

  // Toast notifications
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    loadAllSecurityData();
  }, []);

  useEffect(() => {
    if (!studentPassToPrint) return;
    const timer = window.setTimeout(() => {
      printSectionById('student-gate-pass-print', `Student Gate Pass ${studentPassToPrint.passNumber}`);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [studentPassToPrint]);

  useEffect(() => {
    if (!activeFeatureId) return;
    const targetTab = SECURITY_FEATURE_TAB[activeFeatureId];
    if (targetTab) {
      setActiveTab(targetTab);
      setSearchQuery('');
    }
  }, [activeFeatureId]);

  const loadAllSecurityData = () => {
    setVisitors(LocalERPDatabase.getVisitors() || []);
    setStudentPasses(LocalERPDatabase.getStudentGatePasses() || []);
    setStaffPasses(LocalERPDatabase.getStaffGatePasses() || []);
    setVehicles(LocalERPDatabase.getVehicles() || []);
  };

  // Form states
  const [newVisitor, setNewVisitor] = useState<Partial<VisitorRecord>>({
    name: '',
    mobile: '',
    purpose: 'Parent Meeting',
    meetPerson: 'Class Teacher',
    department: 'Secondary Section',
    isParentVisit: true,
    studentName: '',
    studentGr: '',
    idType: 'Aadhaar Card',
    idNumber: ''
  });

  const [newStudentPass, setNewStudentPass] = useState<Partial<StudentGatePass>>({
    studentName: '',
    grNumber: '',
    className: 'Class 5',
    division: 'A',
    parentName: '',
    parentMobile: '',
    reason: 'Early Leave',
    reasonDetails: '',
    expectedReturn: ''
  });

  const [newStaffPass, setNewStaffPass] = useState<Partial<StaffGatePass>>({
    staffName: '',
    employeeCode: '',
    reason: 'Official Duty',
    reasonDetails: '',
    expectedReturn: ''
  });

  const [newVehicle, setNewVehicle] = useState<Partial<VehicleRecord>>({
    vehicleNumber: '',
    ownerName: '',
    vehicleType: 'Two Wheeler',
    purpose: 'Delivery'
  });

  const handleAddVisitor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVisitor.name || !newVisitor.mobile) {
      showToast('Name and Contact Number are required.', 'error');
      return;
    }

    const record: VisitorRecord = {
      id: `vis_${Date.now()}`,
      visitorId: `VIS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      name: newVisitor.name!,
      mobile: newVisitor.mobile!,
      purpose: newVisitor.purpose || 'Official Work',
      meetPerson: newVisitor.meetPerson || 'Office Clerk',
      department: newVisitor.department || 'Administration',
      entryTime: new Date().toISOString().replace('T', ' ').substring(0, 16),
      isParentVisit: !!newVisitor.isParentVisit,
      studentName: newVisitor.studentName,
      studentGr: newVisitor.studentGr,
      idType: newVisitor.idType,
      idNumber: newVisitor.idNumber
    };

    const updated = LocalERPDatabase.saveVisitorRecord(record);
    setVisitors(updated);
    setShowAddVisitor(false);
    LocalERPDatabase.addAuditLog(user.id, user.name, user.role as any, 'ADD_VISITOR_ENTRY', 'Campus Security', `Signed in visitor ${record.name} - ${record.visitorId}`);
    showToast('Visitor entry signed in successfully.');
    setNewVisitor({ name: '', mobile: '', purpose: 'Parent Meeting', meetPerson: 'Class Teacher', department: 'Secondary Section', isParentVisit: true, studentName: '', studentGr: '', idType: 'Aadhaar Card', idNumber: '' });
  };

  const handleSignOutVisitor = (id: string) => {
    const list = LocalERPDatabase.getVisitors();
    const visitor = list.find(v => v.id === id);
    if (visitor) {
      const updatedVis: VisitorRecord = {
        ...visitor,
        exitTime: new Date().toISOString().replace('T', ' ').substring(0, 16)
      };
      const updatedList = LocalERPDatabase.saveVisitorRecord(updatedVis);
      setVisitors(updatedList);
      LocalERPDatabase.addAuditLog(user.id, user.name, user.role as any, 'VISITOR_SIGN_OUT', 'Campus Security', `Signed out visitor ${visitor.name}`);
      showToast('Visitor exit recorded.');
    }
  };

  const handleAddStudentPass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentPass.studentName || !newStudentPass.grNumber) {
      showToast('Student Name and G.R. Number are required.', 'error');
      return;
    }

    const pass: StudentGatePass = {
      id: `sgp_${Date.now()}`,
      passNumber: `SGP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      studentId: `std_${Date.now()}`,
      studentName: newStudentPass.studentName!,
      grNumber: newStudentPass.grNumber!,
      classId: 'c1',
      className: newStudentPass.className || 'Class 5',
      division: newStudentPass.division || 'A',
      parentName: newStudentPass.parentName || '',
      parentMobile: newStudentPass.parentMobile || '',
      reason: (newStudentPass.reason as any) || 'Early Leave',
      reasonDetails: newStudentPass.reasonDetails,
      timeOut: new Date().toISOString().replace('T', ' ').substring(0, 16),
      expectedReturn: newStudentPass.expectedReturn,
      approvedBy: user.name,
      status: 'Approved'
    };

    const updated = LocalERPDatabase.saveStudentGatePass(pass);
    setStudentPasses(updated);
    setStudentPassToPrint(pass);
    setShowAddStudentPass(false);
    LocalERPDatabase.addAuditLog(user.id, user.name, user.role as any, 'CREATE_STUDENT_OUT_PASS', 'Campus Security', `Created out pass for student: ${pass.studentName}`);
    showToast('Student out pass generated and approved.');
    setNewStudentPass({ studentName: '', grNumber: '', className: 'Class 5', division: 'A', parentName: '', parentMobile: '', reason: 'Early Leave', reasonDetails: '', expectedReturn: '' });
  };

  const handleStudentReturn = (id: string) => {
    const list = LocalERPDatabase.getStudentGatePasses();
    const pass = list.find(p => p.id === id);
    if (pass) {
      const updatedPass: StudentGatePass = {
        ...pass,
        status: 'Returned',
        actualReturn: new Date().toISOString().replace('T', ' ').substring(0, 16)
      };
      const updatedList = LocalERPDatabase.saveStudentGatePass(updatedPass);
      setStudentPasses(updatedList);
      showToast('Student return marked successfully.');
    }
  };

  const handleAddStaffPass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffPass.staffName) {
      showToast('Staff Name is required.', 'error');
      return;
    }

    const pass: StaffGatePass = {
      id: `stgp_${Date.now()}`,
      passNumber: `STGP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      staffId: `staff_${Date.now()}`,
      staffName: newStaffPass.staffName!,
      employeeCode: newStaffPass.employeeCode,
      reason: (newStaffPass.reason as any) || 'Official Duty',
      reasonDetails: newStaffPass.reasonDetails,
      timeOut: new Date().toISOString().replace('T', ' ').substring(0, 16),
      expectedReturn: newStaffPass.expectedReturn,
      status: 'Approved',
      approvedBy: user.name,
      approvedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    const updated = LocalERPDatabase.saveStaffGatePass(pass);
    setStaffPasses(updated);
    setShowAddStaffPass(false);
    LocalERPDatabase.addAuditLog(user.id, user.name, user.role as any, 'CREATE_STAFF_GATE_PASS', 'Campus Security', `Created staff gate pass: ${pass.staffName}`);
    showToast('Staff gate pass generated successfully.');
    setNewStaffPass({ staffName: '', employeeCode: '', reason: 'Official Duty', reasonDetails: '', expectedReturn: '' });
  };

  const handleStaffReturn = (id: string) => {
    const list = LocalERPDatabase.getStaffGatePasses();
    const pass = list.find(p => p.id === id);
    if (pass) {
      const updatedPass: StaffGatePass = {
        ...pass,
        status: 'Returned',
        actualReturn: new Date().toISOString().replace('T', ' ').substring(0, 16)
      };
      const updatedList = LocalERPDatabase.saveStaffGatePass(updatedPass);
      setStaffPasses(updatedList);
      showToast('Staff return registered.');
    }
  };

  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicle.vehicleNumber || !newVehicle.ownerName) {
      showToast('Vehicle Number and Owner Name are required.', 'error');
      return;
    }

    const record: VehicleRecord = {
      id: `veh_${Date.now()}`,
      vehicleNumber: newVehicle.vehicleNumber.toUpperCase(),
      ownerName: newVehicle.ownerName,
      vehicleType: (newVehicle.vehicleType as any) || 'Two Wheeler',
      purpose: newVehicle.purpose || 'Official',
      entryTime: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    const updated = LocalERPDatabase.saveVehicleRecord(record);
    setVehicles(updated);
    setShowAddVehicle(false);
    LocalERPDatabase.addAuditLog(user.id, user.name, user.role as any, 'VEHICLE_CHECK_IN', 'Campus Security', `Checked in vehicle ${record.vehicleNumber}`);
    showToast('Vehicle entry recorded.');
    setNewVehicle({ vehicleNumber: '', ownerName: '', vehicleType: 'Two Wheeler', purpose: 'Delivery' });
  };

  const handleVehicleExit = (id: string) => {
    const list = LocalERPDatabase.getVehicles();
    const record = list.find(v => v.id === id);
    if (record) {
      const updatedRec: VehicleRecord = {
        ...record,
        exitTime: new Date().toISOString().replace('T', ' ').substring(0, 16)
      };
      const updatedList = LocalERPDatabase.saveVehicleRecord(updatedRec);
      setVehicles(updatedList);
      showToast('Vehicle exit checked out.');
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen p-4 sm:p-6 rounded-2xl border border-slate-200">
      
      {/* Toast alert */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl transition-all duration-300 transform translate-y-0 ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span className="text-sm font-semibold">{toast.msg}</span>
        </div>
      )}

      {/* Title */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-left">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{focusedMode ? focusedTitle : 'Campus Gatekeeper & Security Manager'}</h1>
            <p className="text-xs text-slate-500 mt-1 font-mono">Verify visitors, manage student gate passes, track staff out-duty and log vehicles.</p>
          </div>
        </div>
      </div>

      {/* Tabs are hidden when a drawer submenu opens a focused page. */}
      {!focusedMode && !activeFeatureId && (
        <div className="flex gap-2 mb-6 overflow-x-auto bg-white p-1.5 rounded-xl border border-slate-200">
          {[
            { id: 'visitors', label: 'Visitors Log', icon: Users },
            { id: 'studentPasses', label: 'Student Gate Passes', icon: ClipboardList },
            { id: 'staffPasses', label: 'Staff Duty Passes', icon: UserCheck },
            { id: 'vehicles', label: 'Vehicles Ledger', icon: Car },
            { id: 'alerts', label: 'Security Alerts', icon: AlertTriangle },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as SecurityTab); setSearchQuery(''); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Dynamic Content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-left">
        
        {/* TAB 1: VISITORS */}
        {activeTab === 'visitors' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  placeholder="Search visitors by name or contact..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-9 pr-4 py-3 border border-slate-200 rounded-xl"
                />
              </div>
              <button
                onClick={() => setShowAddVisitor(!showAddVisitor)}
                className="flex items-center gap-1.5 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow cursor-pointer self-start sm:self-auto"
              >
                <UserPlus className="w-4 h-4" />
                <span>{showAddVisitor ? 'Close Form' : 'Check-In Visitor'}</span>
              </button>
            </div>

            {showAddVisitor && (
              <form onSubmit={handleAddVisitor} className="p-5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600">Visitor Full Name</label>
                  <input
                    type="text"
                    required
                    value={newVisitor.name}
                    onChange={e => setNewVisitor({ ...newVisitor, name: e.target.value })}
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600">Contact Number</label>
                  <input
                    type="text"
                    required
                    value={newVisitor.mobile}
                    onChange={e => setNewVisitor({ ...newVisitor, mobile: e.target.value })}
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600">Purpose of Visit</label>
                  <select
                    value={newVisitor.purpose}
                    onChange={e => setNewVisitor({ ...newVisitor, purpose: e.target.value })}
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
                  >
                    <option value="Parent Meeting">Parent Meeting</option>
                    <option value="Official Inquiry">Official Inquiry</option>
                    <option value="Fee Payment">Fee Payment</option>
                    <option value="Admissions Inquiry">Admissions Inquiry</option>
                    <option value="Maintenance / Service">Maintenance / Service</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600">ID Proof Type</label>
                  <input
                    type="text"
                    value={newVisitor.idType}
                    onChange={e => setNewVisitor({ ...newVisitor, idType: e.target.value })}
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
                    placeholder="Aadhaar, PAN etc."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600">ID proof Number</label>
                  <input
                    type="text"
                    value={newVisitor.idNumber}
                    onChange={e => setNewVisitor({ ...newVisitor, idNumber: e.target.value })}
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600">Meet Person Name</label>
                  <input
                    type="text"
                    value={newVisitor.meetPerson}
                    onChange={e => setNewVisitor({ ...newVisitor, meetPerson: e.target.value })}
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="flex items-end">
                  <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow cursor-pointer">
                    Submit Entry Check-In
                  </button>
                </div>
              </form>
            )}

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <th className="p-3">Visitor ID</th>
                    <th className="p-3">Visitor Details</th>
                    <th className="p-3">Purpose / Person</th>
                    <th className="p-3">Entry Time</th>
                    <th className="p-3 text-right">Exit Time / Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visitors
                    .filter(v => v?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || v.mobile.includes(searchQuery))
                    .map(v => (
                      <tr key={v.id} className="border-b border-slate-150 hover:bg-slate-50/50">
                        <td className="p-3 font-mono font-bold text-indigo-600">{v.visitorId}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-800">{v.name}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{v.mobile} | ID: {v.idNumber || 'None'}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-700">{v.purpose}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">Meet: {v.meetPerson} ({v.department})</div>
                        </td>
                        <td className="p-3 font-mono text-slate-500">{v.entryTime}</td>
                        <td className="p-3 text-right">
                          {v.exitTime ? (
                            <span className="font-mono text-slate-400 font-semibold">{v.exitTime}</span>
                          ) : (
                            <button
                              onClick={() => handleSignOutVisitor(v.id)}
                              className="px-2.5 py-1 bg-rose-50 text-rose-600 border border-rose-200 rounded text-[10px] font-bold hover:bg-rose-100 cursor-pointer"
                            >
                              Sign Out Exit
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: STUDENT GATE PASSES */}
        {activeTab === 'studentPasses' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  placeholder="Search out-passes by student name or G.R. number..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-9 pr-4 py-3 border border-slate-200 rounded-xl"
                />
              </div>
              <button
                onClick={() => setShowAddStudentPass(!showAddStudentPass)}
                className="flex items-center gap-1.5 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{showAddStudentPass ? 'Close Form' : 'Create Out-Pass'}</span>
              </button>
            </div>

            {showAddStudentPass && (
              <form onSubmit={handleAddStudentPass} className="p-5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600">Student Name</label>
                  <input
                    type="text"
                    required
                    value={newStudentPass.studentName}
                    onChange={e => setNewStudentPass({ ...newStudentPass, studentName: e.target.value })}
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600">G.R. Number</label>
                  <input
                    type="text"
                    required
                    value={newStudentPass.grNumber}
                    onChange={e => setNewStudentPass({ ...newStudentPass, grNumber: e.target.value })}
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600">Emergency Contact (Parent)</label>
                  <input
                    type="text"
                    value={newStudentPass.parentMobile}
                    onChange={e => setNewStudentPass({ ...newStudentPass, parentMobile: e.target.value })}
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600">Reason category</label>
                  <select
                    value={newStudentPass.reason}
                    onChange={e => setNewStudentPass({ ...newStudentPass, reason: e.target.value as any })}
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
                  >
                    <option value="Medical Emergency">Medical Emergency</option>
                    <option value="Family Emergency">Family Emergency</option>
                    <option value="Early Leave">Early Leave</option>
                    <option value="Official Work">Official Work</option>
                  </select>
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-bold text-slate-600">Reason Details</label>
                  <input
                    type="text"
                    value={newStudentPass.reasonDetails}
                    onChange={e => setNewStudentPass({ ...newStudentPass, reasonDetails: e.target.value })}
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="flex items-end">
                  <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow cursor-pointer">
                    Approve and Print Pass
                  </button>
                </div>
              </form>
            )}

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <th className="p-3">Pass No</th>
                    <th className="p-3">Student info</th>
                    <th className="p-3">Emergency Contact</th>
                    <th className="p-3">Time Out</th>
                    <th className="p-3">Status / Action</th>
                  </tr>
                </thead>
                <tbody>
                  {studentPasses
                    .filter(p => p.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) || p.grNumber.includes(searchQuery))
                    .map(p => (
                      <tr key={p.id} className="border-b border-slate-150 hover:bg-slate-50/50">
                        <td className="p-3 font-mono font-bold text-indigo-600">{p.passNumber}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-800">{p.studentName}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">GR: {p.grNumber} | Grade: {p.className}-{p.division}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-700">{p.reason}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">Contact: {p.parentMobile}</div>
                        </td>
                        <td className="p-3 font-mono text-slate-500">{p.timeOut}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setStudentPassToPrint(p)}
                              className="px-2 py-1 bg-slate-50 text-slate-700 border border-slate-200 rounded text-[10px] font-bold hover:bg-slate-100 cursor-pointer inline-flex items-center gap-1"
                            >
                              <Printer className="w-3 h-3" /> Print / PDF
                            </button>
                            {p.status === 'Returned' ? (
                              <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">Returned {p.actualReturn?.substring(11)}</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleStudentReturn(p.id)}
                                className="px-2 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded text-[10px] font-bold hover:bg-blue-100 cursor-pointer"
                              >
                                Confirm Return
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: STAFF GATE PASSES */}
        {activeTab === 'staffPasses' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  placeholder="Search staff passes..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-9 pr-4 py-3 border border-slate-200 rounded-xl"
                />
              </div>
              <button
                onClick={() => setShowAddStaffPass(!showAddStaffPass)}
                className="flex items-center gap-1.5 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{showAddStaffPass ? 'Close Form' : 'Register Staff Pass'}</span>
              </button>
            </div>

            {showAddStaffPass && (
              <form onSubmit={handleAddStaffPass} className="p-5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600">Staff Full Name</label>
                  <input
                    type="text"
                    required
                    value={newStaffPass.staffName}
                    onChange={e => setNewStaffPass({ ...newStaffPass, staffName: e.target.value })}
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600">Employee Code</label>
                  <input
                    type="text"
                    value={newStaffPass.employeeCode}
                    onChange={e => setNewStaffPass({ ...newStaffPass, employeeCode: e.target.value })}
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600">Duty Purpose</label>
                  <select
                    value={newStaffPass.reason}
                    onChange={e => setNewStaffPass({ ...newStaffPass, reason: e.target.value as any })}
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
                  >
                    <option value="Official Duty">Official Duty</option>
                    <option value="Personal Work">Personal Work</option>
                    <option value="Medical">Medical</option>
                    <option value="Government Office">Government Office</option>
                  </select>
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-bold text-slate-600">Duty Details</label>
                  <input
                    type="text"
                    value={newStaffPass.reasonDetails}
                    onChange={e => setNewStaffPass({ ...newStaffPass, reasonDetails: e.target.value })}
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="flex items-end">
                  <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow cursor-pointer">
                    Approve Pass
                  </button>
                </div>
              </form>
            )}

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <th className="p-3">Pass No</th>
                    <th className="p-3">Staff Name</th>
                    <th className="p-3">Duty Purpose</th>
                    <th className="p-3">Time Out</th>
                    <th className="p-3">Status / Action</th>
                  </tr>
                </thead>
                <tbody>
                  {staffPasses
                    .filter(p => p.staffName?.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(p => (
                      <tr key={p.id} className="border-b border-slate-150 hover:bg-slate-50/50">
                        <td className="p-3 font-mono font-bold text-indigo-600">{p.passNumber}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-800">{p.staffName}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">Code: {p.employeeCode || 'None'}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-700">{p.reason}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{p.reasonDetails}</div>
                        </td>
                        <td className="p-3 font-mono text-slate-500">{p.timeOut}</td>
                        <td className="p-3">
                          {p.status === 'Returned' ? (
                            <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">Returned {p.actualReturn?.substring(11)}</span>
                          ) : (
                            <button
                              onClick={() => handleStaffReturn(p.id)}
                              className="px-2 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded text-[10px] font-bold hover:bg-blue-100 cursor-pointer"
                            >
                              Register Return
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: VEHICLES LEDGER */}
        {activeTab === 'vehicles' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  placeholder="Search vehicle number or driver..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-9 pr-4 py-3 border border-slate-200 rounded-xl"
                />
              </div>
              <button
                onClick={() => setShowAddVehicle(!showAddVehicle)}
                className="flex items-center gap-1.5 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow cursor-pointer"
              >
                <Car className="w-4 h-4" />
                <span>{showAddVehicle ? 'Close Form' : 'Log Vehicle'}</span>
              </button>
            </div>

            {showAddVehicle && (
              <form onSubmit={handleAddVehicle} className="p-5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600">Vehicle Number</label>
                  <input
                    type="text"
                    required
                    placeholder="MH-39-A-1234"
                    value={newVehicle.vehicleNumber}
                    onChange={e => setNewVehicle({ ...newVehicle, vehicleNumber: e.target.value })}
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg uppercase"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600">Owner / Driver Name</label>
                  <input
                    type="text"
                    required
                    value={newVehicle.ownerName}
                    onChange={e => setNewVehicle({ ...newVehicle, ownerName: e.target.value })}
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600">Vehicle Type</label>
                  <select
                    value={newVehicle.vehicleType}
                    onChange={e => setNewVehicle({ ...newVehicle, vehicleType: e.target.value as any })}
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
                  >
                    <option value="Two Wheeler">Two Wheeler</option>
                    <option value="Four Wheeler">Four Wheeler</option>
                    <option value="School Bus">School Bus</option>
                    <option value="Commercial/Delivery">Commercial/Delivery</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow cursor-pointer">
                    Log Vehicle Entry
                  </button>
                </div>
              </form>
            )}

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <th className="p-3">Vehicle Number</th>
                    <th className="p-3">Owner / Driver Name</th>
                    <th className="p-3">Vehicle Type</th>
                    <th className="p-3">Entry Time</th>
                    <th className="p-3 text-right">Exit Time / Action</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles
                    .filter(v => v.vehicleNumber?.toLowerCase().includes(searchQuery.toLowerCase()) || v.ownerName?.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(v => (
                      <tr key={v.id} className="border-b border-slate-150 hover:bg-slate-50/50">
                        <td className="p-3 font-mono font-bold text-indigo-600 uppercase">{v.vehicleNumber}</td>
                        <td className="p-3 font-bold text-slate-800">{v.ownerName}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold rounded text-[10px]">
                            {v.vehicleType}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-500">{v.entryTime}</td>
                        <td className="p-3 text-right">
                          {v.exitTime ? (
                            <span className="font-mono text-slate-400 font-semibold">{v.exitTime}</span>
                          ) : (
                            <button
                              onClick={() => handleVehicleExit(v.id)}
                              className="px-2.5 py-1 bg-rose-50 text-rose-600 border border-rose-200 rounded text-[10px] font-bold hover:bg-rose-100 cursor-pointer"
                            >
                              Check-Out Exit
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: SECURITY ALERTS */}
        {activeTab === 'alerts' && (() => {
          const activeVisitors = visitors.filter(item => !item.exitTime);
          const activeStudentPasses = studentPasses.filter(item => item.status !== 'Returned');
          const activeStaffPasses = staffPasses.filter(item => item.status !== 'Returned');
          const activeVehicles = vehicles.filter(item => !item.exitTime);
          const totalOpen = activeVisitors.length + activeStudentPasses.length + activeStaffPasses.length + activeVehicles.length;
          const alertCards = [
            { label: 'Visitors still inside', value: activeVisitors.length, icon: Users },
            { label: 'Students outside campus', value: activeStudentPasses.length, icon: ClipboardList },
            { label: 'Staff outside campus', value: activeStaffPasses.length, icon: UserCheck },
            { label: 'Vehicles not checked out', value: activeVehicles.length, icon: Car }
          ];
          return (
            <div className="space-y-6">
              <div className={`rounded-2xl border p-5 ${totalOpen > 0 ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`mt-0.5 h-5 w-5 ${totalOpen > 0 ? 'text-amber-700' : 'text-emerald-700'}`} />
                  <div>
                    <h3 className={`text-sm font-black ${totalOpen > 0 ? 'text-amber-900' : 'text-emerald-900'}`}>
                      {totalOpen > 0 ? `${totalOpen} open campus-security movement record${totalOpen === 1 ? '' : 's'}` : 'No open security alerts'}
                    </h3>
                    <p className={`mt-1 text-xs ${totalOpen > 0 ? 'text-amber-800' : 'text-emerald-800'}`}>
                      This page is calculated from visitor, student-pass, staff-pass and vehicle records that have not yet been closed.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {alertCards.map(card => {
                  const Icon = card.icon;
                  return (
                    <article key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div className="rounded-xl bg-slate-100 p-2.5 text-slate-700"><Icon className="h-5 w-5" /></div>
                        <span className={`text-2xl font-black ${card.value > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{card.value}</span>
                      </div>
                      <p className="mt-3 text-[11px] font-extrabold uppercase tracking-wide text-slate-500">{card.label}</p>
                    </article>
                  );
                })}
              </div>

              {totalOpen > 0 && (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[720px] border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                        <th className="p-3 font-bold">Alert Type</th>
                        <th className="p-3 font-bold">Person / Vehicle</th>
                        <th className="p-3 font-bold">Reference</th>
                        <th className="p-3 font-bold">Open Since</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeVisitors.map(item => (
                        <tr key={`visitor-${item.id}`} className="border-b border-slate-100">
                          <td className="p-3 font-bold text-amber-700">Visitor inside campus</td>
                          <td className="p-3 text-slate-800">{item.name}</td>
                          <td className="p-3 font-mono text-slate-500">{item.visitorId}</td>
                          <td className="p-3 font-mono text-slate-500">{item.entryTime}</td>
                        </tr>
                      ))}
                      {activeStudentPasses.map(item => (
                        <tr key={`student-${item.id}`} className="border-b border-slate-100">
                          <td className="p-3 font-bold text-amber-700">Student gate pass open</td>
                          <td className="p-3 text-slate-800">{item.studentName}</td>
                          <td className="p-3 font-mono text-slate-500">{item.passNumber}</td>
                          <td className="p-3 font-mono text-slate-500">{item.timeOut}</td>
                        </tr>
                      ))}
                      {activeStaffPasses.map(item => (
                        <tr key={`staff-${item.id}`} className="border-b border-slate-100">
                          <td className="p-3 font-bold text-amber-700">Staff gate pass open</td>
                          <td className="p-3 text-slate-800">{item.staffName}</td>
                          <td className="p-3 font-mono text-slate-500">{item.passNumber}</td>
                          <td className="p-3 font-mono text-slate-500">{item.timeOut}</td>
                        </tr>
                      ))}
                      {activeVehicles.map(item => (
                        <tr key={`vehicle-${item.id}`} className="border-b border-slate-100">
                          <td className="p-3 font-bold text-amber-700">Vehicle inside campus</td>
                          <td className="p-3 text-slate-800">{item.ownerName}</td>
                          <td className="p-3 font-mono text-slate-500">{item.vehicleNumber}</td>
                          <td className="p-3 font-mono text-slate-500">{item.entryTime}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()}

      </div>

      {studentPassToPrint && (
        <div style={{ position: 'fixed', left: '-12000px', top: 0 }} aria-hidden="true">
          <section id="student-gate-pass-print" className="w-[760px] bg-white p-8 text-slate-900">
            <PrintLetterhead lang={lang} subtitle="STUDENT GATE PASS / OUT-PASS" />
            <div className="rounded-2xl border-2 border-slate-800 p-6">
              <div className="flex items-start justify-between border-b border-slate-300 pb-4">
                <div><div className="text-xs font-bold uppercase tracking-wider text-slate-500">Pass Number</div><div className="mt-1 text-xl font-black">{studentPassToPrint.passNumber}</div></div>
                <div className="text-right text-xs"><div className="font-bold">Status: {studentPassToPrint.status}</div><div>{studentPassToPrint.timeOut}</div></div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <div><span className="font-bold">Student:</span> {studentPassToPrint.studentName}</div>
                <div><span className="font-bold">G.R. No.:</span> {studentPassToPrint.grNumber}</div>
                <div><span className="font-bold">Class:</span> {studentPassToPrint.className} {studentPassToPrint.division}</div>
                <div><span className="font-bold">Parent Contact:</span> {studentPassToPrint.parentMobile || '—'}</div>
                <div className="col-span-2"><span className="font-bold">Reason:</span> {studentPassToPrint.reason}{studentPassToPrint.reasonDetails ? ` — ${studentPassToPrint.reasonDetails}` : ''}</div>
                <div><span className="font-bold">Expected Return:</span> {studentPassToPrint.expectedReturn || '—'}</div>
                <div><span className="font-bold">Approved By:</span> {studentPassToPrint.approvedBy}</div>
              </div>
            </div>
            <PrintSignatureArea lang={lang} />
          </section>
        </div>
      )}
    </div>
  );
}
