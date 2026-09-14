/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, ArrowRight, KeyRound, AlertTriangle, 
  CheckSquare, RefreshCcw, UserPlus, GraduationCap, FileText, ArrowLeft, Eye, EyeOff
} from 'lucide-react';
import { Language, User, UserRole } from '../types';
import { translations } from '../lib/translations';
import { LocalERPDatabase } from '../lib/supabase';
import { AuthService } from '../lib/authService';

interface LoginSectionProps {
  lang: Language;
  onLoginSuccess: (user: User) => void;
  schoolId?: string;
  schoolCode?: string;
  schoolName?: string;
}

export default function LoginSection({ lang, onLoginSuccess, schoolId, schoolCode, schoolName }: LoginSectionProps) {
  // Mode switcher: 'login' | 'staff_signup' | 'student_signup' | 'parent_signup' | 'forgot'
  const [mode, setMode] = useState<'login' | 'staff_signup' | 'student_signup' | 'parent_signup' | 'forgot'>('login');
  
  // Registration control settings
  const setup = useMemo(() => LocalERPDatabase.getAcademicSetup(), []);
  const registrationMode = setup.globalSettings?.registrationMode || 'self_approval';
  const parentApprovalRequired = setup.globalSettings?.parentApprovalRequired !== false;

  // Login input states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [registrationNotice, setRegistrationNotice] = useState<{ title: string; message: string; requestCode?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Parent registration states
  const [parentMobile, setParentMobile] = useState('');
  const [parentGrNumber, setParentGrNumber] = useState('');
  const [parentStudentDob, setParentStudentDob] = useState('');
  const [parentPassword, setParentPassword] = useState('');
  const [parentConfirmPassword, setParentConfirmPassword] = useState('');

  // Security mandatory first-time password change states
  const [pendingChangeUser, setPendingChangeUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changeError, setChangeError] = useState('');

  // --------------------------------------------------------
  // STAFF SIGNUP FORM STATES
  // --------------------------------------------------------
  const [staffDob, setStaffDob] = useState("");
  const [staffName, setStaffName] = useState('');
  const [staffFather, setStaffFather] = useState('');
  const [staffMobile, setStaffMobile] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffShalarthId, setStaffShalarthId] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [isStaffNameReadOnly, setIsStaffNameReadOnly] = useState(false);

  // Auto-fill logic for Shalarth ID
  const handleStaffShalarthIdChange = (val: string) => {
    setStaffShalarthId(val);
    const upperVal = val.trim().toUpperCase();
    if (upperVal.length >= 7) {
      const staffMaster = LocalERPDatabase.getStaffMasterRecords();
      const matched = staffMaster.find(r => (r.shalarthId || '').toUpperCase() === upperVal);
      if (matched) {
        setIsStaffNameReadOnly(true);
      } else {
        setIsStaffNameReadOnly(false);
      }
    } else {
      setIsStaffNameReadOnly(false);
    }
  };

  const [staffConfirmPassword, setStaffConfirmPassword] = useState('');

  // --------------------------------------------------------
  // STUDENT SIGNUP FORM STATES
  // --------------------------------------------------------
  const [studGrNumber, setStudGrNumber] = useState('');
  const [studName, setStudName] = useState('');
  const [studDob, setStudDob] = useState('');
  const [studClassId, setStudClassId] = useState('');
  const [studDivision, setStudDivision] = useState('A');
  const [studParentMobile, setStudParentMobile] = useState('');
  const [studPassword, setStudPassword] = useState('');
  const [studConfirmPassword, setStudConfirmPassword] = useState('');

  const t = translations[lang];

  // Helper: Retrieve all classes
  const classes = useMemo(() => LocalERPDatabase.getClasses(), []);

  // Helper: retrieve only real admission records already present in the workspace.
  const getAdmissionsPool = () => {
    const raw = localStorage.getItem('nhs_erp_clerk_admissions');
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  };

  // --------------------------------------------------------
  // LOGIN SUBMIT
  // --------------------------------------------------------
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) {
      setErrorMsg(lang === 'ur' ? 'براہ کرم صارف نام یا آئی ڈی درج کریں۔' : lang === 'hi' ? 'कृपया उपयोगकर्ता आईडी दर्ज करें।' : 'Please enter User ID.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await AuthService.login(username, password, schoolId);
      setIsLoading(false);

      if (res.user) {
        if (res.user.mustChangePassword) {
          setPendingChangeUser(res.user);
          setNewPassword('');
          setConfirmPassword('');
          setChangeError('');
          return;
        }
        onLoginSuccess(res.user);
        return;
      }

      if (res.error) {
        setErrorMsg(res.error.message || 'Login failed. Please check your credentials.');
        return;
      }

      setErrorMsg('Login failed. Please check your credentials.');
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Authentication error occurred.');
    }
  };

  // --------------------------------------------------------
  // FIRST LOGIN PASSWORD UPDATE
  // --------------------------------------------------------
  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeError('');

    if (!newPassword || !confirmPassword) {
      setChangeError('All fields are required.');
      return;
    }
    if (newPassword.length < 6 || newPassword.length > 72) {
      setChangeError('Password must contain 6 to 72 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangeError('Passwords do not match.');
      return;
    }
    if (!pendingChangeUser) return;

    const result = await AuthService.changePasswordSelf(newPassword);
    if (!result.success) {
      setChangeError(result.error?.message || 'Supabase password update failed.');
      return;
    }

    const updatedUser: User = {
      ...pendingChangeUser,
      mustChangePassword: false
    };
    delete updatedUser.password;
    LocalERPDatabase.saveUser(updatedUser);
    LocalERPDatabase.addAuditLog(
      updatedUser.id,
      updatedUser.name,
      updatedUser.role,
      'PASSWORD_CHANGED_FIRST_LOGIN',
      'Security',
      `Supabase Auth password updated for ${updatedUser.username}`
    );

    onLoginSuccess(updatedUser);
    setPendingChangeUser(null);
  };

  // --------------------------------------------------------
  // STAFF SIGNUP SUBMIT
  // --------------------------------------------------------
  const handleStaffSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!staffShalarthId || !staffPassword || !staffConfirmPassword) {
      setErrorMsg('SHALARTH / Employee ID and both password fields are required.');
      return;
    }
    if (staffPassword.length < 6 || staffPassword.length > 72) {
      setErrorMsg('Password must contain 6 to 72 characters.');
      return;
    }
    if (staffPassword !== staffConfirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/public/register-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountType: 'staff',
          identifier: staffShalarthId.trim().toUpperCase(),
          password: staffPassword,
          phone: staffMobile,
          schoolCode: schoolCode || undefined
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Staff registration failed.');

      alert(payload.message || 'Registration submitted for Headmaster approval.');
      setMode('login');
      setUsername(payload.username || staffShalarthId.trim().toUpperCase());
      setPassword('');
      setStaffPassword('');
      setStaffConfirmPassword('');
    } catch (error: any) {
      setErrorMsg(error?.message || 'Staff registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // --------------------------------------------------------
  // STUDENT SIGNUP SUBMIT
  // --------------------------------------------------------
  const handleStudentSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!studGrNumber || !studPassword || !studConfirmPassword) {
      setErrorMsg('GR Number and both password fields are required.');
      return;
    }
    if (studPassword.length < 6 || studPassword.length > 72) {
      setErrorMsg('Password must contain 6 to 72 characters.');
      return;
    }
    if (studPassword !== studConfirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/public/register-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountType: 'student',
          identifier: studGrNumber.trim().toUpperCase(),
          password: studPassword,
          phone: studParentMobile,
          schoolCode: schoolCode || undefined
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Student registration failed.');

      setRegistrationNotice({
        title: 'Student signup request created',
        message: payload.message || 'Registration submitted for Class Teacher approval.',
        requestCode: payload.requestCode || payload.requestId || undefined
      });
      setMode('login');
      setUsername(payload.username || studGrNumber.trim().toUpperCase());
      setPassword('');
      setStudPassword('');
      setStudConfirmPassword('');
    } catch (error: any) {
      setErrorMsg(error?.message || 'Student registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // --------------------------------------------------------
  // PARENT SIGNUP SUBMIT
  // --------------------------------------------------------
  const handleParentSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!parentMobile || !parentGrNumber || !parentPassword || !parentConfirmPassword) {
      setErrorMsg('Please fill all mandatory fields.');
      return;
    }

    // Lookup Student GR Number or PEN Number in admissions register
    const admissionsPool = getAdmissionsPool();
    const admittedStudent = admissionsPool.find(
      (a: any) => 
        a.grNumber.trim().toUpperCase() === parentGrNumber.trim().toUpperCase() ||
        a.penNumber?.trim().toUpperCase() === parentGrNumber.trim().toUpperCase()
    );

    if (!admittedStudent) {
      setErrorMsg('Verification failed: Associated student GR Number or PEN Number not found in admissions register.');
      return;
    }

    // Normalize and verify mobile matches
    const cleanMasterPhone = admittedStudent.parentMobile.replace(/[\s+-]/g, '');
    const cleanInputPhone = parentMobile.replace(/[\s+-]/g, '');
    if (!cleanMasterPhone.endsWith(cleanInputPhone) && !cleanInputPhone.endsWith(cleanMasterPhone)) {
      setErrorMsg('Verification failed: Mobile number does not match parent mobile recorded in Student Master.');
      return;
    }

    // Verify student DOB matches entered DOB if DOB provided
    if (parentStudentDob && admittedStudent.dob !== parentStudentDob) {
      setErrorMsg('Verification failed: Student date of birth does not match school records.');
      return;
    }

    // Password validation
    if (parentPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    if (parentPassword !== parentConfirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    // Check if parent already registered
    const users = LocalERPDatabase.getUsers();
    if (users.some(u => u.role === 'parent' && u.phone === parentMobile)) {
      setErrorMsg('An account has already been registered with this Parent Mobile Number.');
      return;
    }

    const finalStatus = parentApprovalRequired ? 'Pending' : 'Active';

    // Create parent user
    const parentUser: User = {
      id: `user_${Date.now()}`,
      name: `Parent of ${admittedStudent.name}`,
      email: `${admittedStudent.grNumber.toLowerCase()}_parent@nhs.edu`,
      role: 'parent',
      phone: parentMobile,
      username: parentMobile,
      password: parentPassword,
      mustChangePassword: false,
      isActive: true,
      status: finalStatus,
      grNumber: admittedStudent.grNumber,
      fatherName: admittedStudent.fatherName
    };

    LocalERPDatabase.saveUser(parentUser);

    // Save System Notification
    if (parentApprovalRequired) {
      LocalERPDatabase.addSystemNotification(
        'headmaster',
        'New Parent Registration',
        `Parent of ${admittedStudent.name} (${admittedStudent.grNumber}) registered and is awaiting approval.`
      );
    } else {
      LocalERPDatabase.addSystemNotification(
        'headmaster',
        'Parent Account Active',
        `Parent of ${admittedStudent.name} (${admittedStudent.grNumber}) registered and account is instantly ACTIVE.`
      );
    }

    LocalERPDatabase.addAuditLog(
      parentUser.id,
      parentUser.name,
      parentUser.role,
      'PARENT_REGISTRATION_SUBMIT',
      'Parent Intake',
      `Registered parent portal for student GR: ${admittedStudent.grNumber}. Status: ${finalStatus}`
    );

    if (parentApprovalRequired) {
      alert('Parent account registered successfully! Your account is now pending Headmaster approval.');
    } else {
      alert('Parent account registered successfully! Your account is instantly active. You can now log in.');
    }

    setMode('login');
    setUsername(parentMobile);
    setPassword('');
  };


  // RENDER STATE 1: Forgot Password Info
  if (mode === 'forgot') {
    return (
      <div className="max-w-md mx-auto space-y-6 py-6 font-sans text-left">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center">
              <KeyRound className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Credential Assistance</h2>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-mono">ERP Secure Recovery Protocol</p>
          </div>

          <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-3">
              <h4 className="font-bold text-slate-800">Password Reset Channels:</h4>
              <p>
                🔒 <strong className="text-slate-900">Teachers & Clerk:</strong> Please contact the Headmaster/Principal's desk to request a secure password reset.
              </p>
              <p>
                📖 <strong className="text-slate-900">Students:</strong> Please contact your designated Division Class Teacher who holds system credentials to reset student passwords.
              </p>
            </div>
            <p className="text-[10px] text-slate-400 italic text-center">
              Automatic self-service recovery is restricted to prevent academic fraud and ensure proper administrative audits.
            </p>
          </div>

          <button
            onClick={() => setMode('login')}
            className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Go Back to Login
          </button>
        </div>
      </div>
    );
  }

  // RENDER STATE 2: Mandatory Password Change on First Login
  if (pendingChangeUser) {
    return (
      <div className="max-w-md mx-auto space-y-6 py-6 font-sans text-left">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
              <RefreshCcw className="w-5 h-5 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Security Requirement</h2>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-mono">Change Temporary Password</p>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed text-center">
            Hello, <strong className="text-slate-800">{pendingChangeUser.name}</strong>. In compliance with Taloda ERP security guidelines, you must update your temporary credential keys on first-time access.
          </p>

          <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">New Password (Min 6 chars)</label>
              <input
                type="password"
                required
                placeholder="••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                placeholder="••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-mono"
              />
            </div>

            {changeError && (
              <p className="text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100 text-center">
                {changeError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <CheckSquare className="w-4 h-4" />
              <span>Save & Secure Account</span>
            </button>
          </form>

          <button
            onClick={() => setPendingChangeUser(null)}
            className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Cancel Login
          </button>
        </div>
      </div>
    );
  }

  // RENDER STATE 3: STAFF REGISTRATION VIEW
  if (mode === 'staff_signup') {
    return (
      <div className="max-w-xl mx-auto space-y-6 py-4 font-sans text-left">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                <span>Staff Account Registration</span>
              </h2>
              <p className="text-[11px] text-slate-400">Apply for a staff/teacher account with official SHALARTH ID</p>
            </div>
            <button
              onClick={() => setMode('login')}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          </div>

          <form onSubmit={handleStaffSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">SHALARTH ID / Employee ID *</label>
              <input
                type="text"
                required
                autoComplete="username"
                placeholder="Enter the ID recorded in Staff Master"
                value={staffShalarthId}
                onChange={(e) => handleStaffShalarthIdChange(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono font-bold text-indigo-700 uppercase"
              />
              <span className="text-[9px] text-slate-400 block mt-1">
                Name, designation and role are taken automatically from the active Staff Master record.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Mobile Number (Optional)</label>
              <input
                type="tel"
                autoComplete="tel"
                placeholder="Used only if the Staff Master has no mobile number"
                value={staffMobile}
                onChange={(e) => setStaffMobile(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Create Password *</label>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="6 to 72 characters"
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Confirm Password *</label>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="Re-enter password"
                  value={staffConfirmPassword}
                  onChange={(e) => setStaffConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100 text-center">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-60"
            >
              {isLoading ? 'Verifying Staff Master…' : 'Sign Up and Await Headmaster Approval'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // RENDER STATE 4: STUDENT REGISTRATION VIEW
  if (mode === 'student_signup') {
    return (
      <div className="max-w-md mx-auto space-y-6 py-4 font-sans text-left">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-600" />
                <span>Student Portal Signup</span>
              </h2>
              <p className="text-[11px] text-slate-400">Sign up with your G.R. Number — the same G.R. Number is your Student Login ID</p>
            </div>
            <button
              onClick={() => setMode('login')}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          </div>

          <form onSubmit={handleStudentSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Admission G.R. Number *</label>
              <input
                type="text"
                required
                autoComplete="username"
                placeholder="Enter exact GR Number (this becomes your Login ID)"
                value={studGrNumber}
                onChange={(e) => setStudGrNumber(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono font-bold text-indigo-700 uppercase"
              />
              <span className="text-[9px] text-slate-400 block mt-1">
                Student name, class, division and profile details are loaded automatically from Student Master.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Parent Mobile Number (Optional)</label>
              <input
                type="tel"
                autoComplete="tel"
                placeholder="Used only if the Student Master has no contact number"
                value={studParentMobile}
                onChange={(e) => setStudParentMobile(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Set Password *</label>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="6 to 72 characters"
                  value={studPassword}
                  onChange={(e) => setStudPassword(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Confirm Password *</label>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="Re-enter password"
                  value={studConfirmPassword}
                  onChange={(e) => setStudConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-lg font-mono"
                />
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100 text-center">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-60"
            >
              {isLoading ? 'Verifying Student Master…' : 'Sign Up and Await Class Teacher Approval'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // RENDER STATE 5: PARENT REGISTRATION VIEW
  if (mode === 'parent_signup') {
    return (
      <div className="max-w-md mx-auto space-y-6 py-4 font-sans text-left">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-600" />
                <span>Parent Portal Signup</span>
              </h2>
              <p className="text-[11px] text-slate-400">Link with your ward using GR or PEN Number</p>
            </div>
            <button
              onClick={() => setMode('login')}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          </div>

          <form onSubmit={handleParentSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Ward's G.R. Number or PEN Number *</label>
              <input
                type="text"
                required
                placeholder="e.g. GR2024049 or PEN2024049"
                value={parentGrNumber}
                onChange={(e) => setParentGrNumber(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg font-mono font-bold text-amber-700 uppercase"
              />
              <span className="text-[9px] text-slate-400 block mt-1">Must match your child's official General Register (G.R.) or Permanent Education Number (PEN).</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Registered Parent Mobile Number *</label>
              <input
                type="text"
                required
                placeholder="e.g. +91 98765 43214"
                value={parentMobile}
                onChange={(e) => setParentMobile(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg font-mono"
              />
              <span className="text-[9px] text-slate-400 block mt-1">Must match the exact parent contact number logged in the Student Master database.</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Ward's Date of Birth (Optional Verification)</label>
              <input
                type="date"
                value={parentStudentDob}
                onChange={(e) => setParentStudentDob(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg font-mono bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Set Password *</label>
                <input
                  type="password"
                  required
                  placeholder="••••••"
                  value={parentPassword}
                  onChange={(e) => setParentPassword(e.target.value)}
                  className="w-full px-3.5 py-1.5 text-xs border border-slate-200 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Confirm Password *</label>
                <input
                  type="password"
                  required
                  placeholder="••••••"
                  value={parentConfirmPassword}
                  onChange={(e) => setParentConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-1.5 text-xs border border-slate-200 rounded-lg font-mono"
                />
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100 text-center">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-sm transition-colors cursor-pointer text-center block"
            >
              Sign Up and Verify Profile
            </button>
          </form>
        </div>
      </div>
    );
  }

  // STANDARD LOGIN VIEW
  return (
    <div className="edx-auth-premium" data-edx-surface="premium-school-login-r257">
      <div className="edx-auth-premium-card">
        <div className="edx-auth-premium-glow edx-auth-premium-glow-a" />
        <div className="edx-auth-premium-glow edx-auth-premium-glow-b" />

        <div className="edx-auth-premium-head">
          <div className="edx-auth-premium-mark"><GraduationCap className="w-7 h-7" /></div>
          <div className="edx-auth-premium-eyebrow"><ShieldCheck className="w-3.5 h-3.5" /> EDUNIXO SECURE SCHOOL ACCESS</div>
          <h2>{t.erpPortal}</h2>
          <p>{schoolName || 'EDUNIXO School'}</p>
          {schoolCode ? <span className="edx-auth-premium-school-code">School Code · {schoolCode}</span> : null}
        </div>

        {registrationNotice && (
          <div className="edx-auth-premium-notice edx-auth-premium-notice-success">
            <div className="font-black">{registrationNotice.title}</div>
            <div className="mt-1">{registrationNotice.message}</div>
            {registrationNotice.requestCode ? <div className="edx-auth-premium-request">Request ID: {registrationNotice.requestCode}</div> : null}
          </div>
        )}

        <form onSubmit={handleLoginSubmit} className="edx-auth-premium-form">
          <label className="edx-auth-premium-field">
            <span>User ID / Username</span>
            <small>SHALARTH ID · G.R. Number · Employee Code</small>
            <div className="edx-auth-premium-input-wrap">
              <GraduationCap className="w-4 h-4" />
              <input
                type="text"
                required
                placeholder="Enter your school account ID"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
          </label>

          <label className="edx-auth-premium-field">
            <span className="edx-auth-premium-field-row">
              <b>Security Password</b>
              <button type="button" onClick={() => setMode('forgot')}>Forgot Password?</button>
            </span>
            <div className="edx-auth-premium-input-wrap">
              <KeyRound className="w-4 h-4" />
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button type="button" className="edx-auth-premium-eye" onClick={() => setShowPass(!showPass)} aria-label={showPass ? 'Hide password' : 'Show password'}>
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </label>

          {errorMsg && <div className="edx-auth-premium-notice edx-auth-premium-notice-error">{errorMsg}</div>}

          <button type="submit" disabled={isLoading} className="edx-auth-premium-submit">
            <span>{isLoading ? 'Verifying secure access…' : t.login}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="edx-auth-premium-signup">
          <div className="edx-auth-premium-divider"><span>New to this school workspace?</span></div>
          <p>Accounts are verified against existing school records and stay pending until authorised.</p>
          <div className="edx-auth-premium-signup-grid">
            <button type="button" onClick={() => { setErrorMsg(''); setMode('staff_signup'); }}>
              <span className="edx-auth-premium-mini-icon edx-auth-premium-mini-violet"><UserPlus className="w-4 h-4" /></span>
              <span><b>Staff Sign Up</b><small>Employee / SHALARTH access</small></span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => { setErrorMsg(''); setMode('student_signup'); }}>
              <span className="edx-auth-premium-mini-icon edx-auth-premium-mini-cyan"><GraduationCap className="w-4 h-4" /></span>
              <span><b>Student Sign Up</b><small>G.R. verified access</small></span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="edx-auth-premium-trust">
          <span><ShieldCheck className="w-3.5 h-3.5" /> Secure sign-in</span>
          <span><CheckSquare className="w-3.5 h-3.5" /> Role verified</span>
          <span><RefreshCcw className="w-3.5 h-3.5" /> Cloud synced</span>
        </div>
      </div>
    </div>
  );
}
