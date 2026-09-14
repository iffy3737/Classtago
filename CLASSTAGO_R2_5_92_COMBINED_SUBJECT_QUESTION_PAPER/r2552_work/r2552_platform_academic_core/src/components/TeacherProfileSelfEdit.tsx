import React, { useState, useEffect } from 'react';
import { User, TeacherProfile } from '../types';
import { LocalERPDatabase } from '../lib/supabase';
import { Save, AlertCircle, CheckCircle2, User as UserIcon } from 'lucide-react';

interface Props {
  user: User;
  onSave?: () => void;
}

export default function TeacherProfileSelfEdit({ user, onSave }: Props) {
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [message, setMessage] = useState('');
  
  useEffect(() => {
    const setup = LocalERPDatabase.getAcademicSetup();
    const existing = setup?.teacherProfiles?.find(
      (t: any) => (user.shalarthId && t.shalarthId === user.shalarthId) || 
                  (user.employeeCode && t.employeeId === user.employeeCode) || 
                  (t.fullName || '').toLowerCase() === (user.name || '').toLowerCase()
    );
    
    if (existing) {
      setProfile({ ...existing });
    } else {
      setProfile({
        id: `t_${Date.now()}`,
        employeeId: user.employeeCode || '',
        shalarthId: user.shalarthId || '',
        fullName: user.name || '',
        fatherName: user.fatherName || '',
        motherName: '',
        gender: 'Male',
        dob: '',
        dobInWords: '',
        qualification: '',
        designation: user.designation || 'Teacher',
        joiningDate: '',
        appointmentDate: '',
        mobileNumber: user.phone || '',
        email: user.email || '',
        address: '',
        bloodGroup: '',
        photoUrl: user.photoUrl || '',
        documents: [],
        status: 'Active',
        isActive: true
      });
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    // 1. Save Teacher Profile in setup
    const setup = LocalERPDatabase.getAcademicSetup();
    const profiles = setup.teacherProfiles || [];
    const index = profiles.findIndex(p => p.id === profile.id);
    
    if (index >= 0) {
      profiles[index] = profile;
    } else {
      profiles.push(profile);
    }
    
    setup.teacherProfiles = profiles;
    LocalERPDatabase.saveAcademicSetup(setup);

    // 2. Save User Account Record in nhs_erp_users
    const allUsers = LocalERPDatabase.getUsers();
    const userIndex = allUsers.findIndex(u => u.id === user.id);
    if (userIndex >= 0) {
      allUsers[userIndex].name = profile.fullName;
      allUsers[userIndex].email = profile.email;
      allUsers[userIndex].phone = profile.mobileNumber;
      allUsers[userIndex].designation = profile.designation;
      // update role-specific fields
      if (user.role === 'teacher') {
        allUsers[userIndex].shalarthId = profile.shalarthId;
      } else if (user.role === 'clerk') {
        allUsers[userIndex].employeeCode = profile.employeeId;
      }
      LocalERPDatabase.saveUsers(allUsers);
    }

    // 3. Save to Staff Master records if applicable
    const staffMaster = LocalERPDatabase.getStaffMasterRecords();
    const matchId = user.role === 'teacher' ? profile.shalarthId : profile.employeeId;
    if (matchId && typeof matchId === 'string') {
      const smIndex = staffMaster.findIndex(r => (r.shalarthId || '').toUpperCase() === matchId.toUpperCase());
      if (smIndex >= 0) {
        staffMaster[smIndex].designation = profile.designation;
        LocalERPDatabase.saveStaffMasterRecords(staffMaster);
      } else {
        staffMaster.push({
          id: `sm_${Date.now()}`,
          shalarthId: matchId,
          designation: profile.designation
        });
        LocalERPDatabase.saveStaffMasterRecords(staffMaster);
      }
    }
    
    setMessage('Profile updated successfully.');
    if (onSave) {
      setTimeout(() => {
        onSave();
      }, 1000);
    } else {
      setTimeout(() => window.location.reload(), 1500);
    }
    setTimeout(() => setMessage(''), 3000);
  };

  if (!profile) return <div className="p-4">Loading...</div>;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm text-left max-w-3xl space-y-6 animate-fade-in">
      <div className="border-b border-slate-100 pb-2">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <UserIcon className="w-5 h-5 text-blue-600" />
          My Complete Teacher Profile
        </h2>
        <p className="text-xs text-slate-500">Update your official staff records. This acts as the single source of truth for all dropdowns and modules.</p>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 text-xs font-sans">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="block font-semibold text-slate-500 mb-1">
                {user.role === 'clerk' ? 'Employee ID *' : 'SHALARTH ID *'}
              </label>
              <input 
                type="text" 
                required 
                value={user.role === 'clerk' ? profile.employeeId : profile.shalarthId} 
                onChange={e => {
                  if (user.role === 'clerk') {
                    setProfile({...profile, employeeId: e.target.value});
                  } else {
                    setProfile({...profile, shalarthId: e.target.value});
                  }
                }} 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-500 mb-1">Full Name *</label>
              <input type="text" required value={profile.fullName} onChange={e => setProfile({...profile, fullName: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block font-semibold text-slate-500 mb-1">Father's Name</label>
              <input type="text" value={profile.fatherName} required onChange={e => setProfile({...profile, fatherName: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
            </div>
            <div>
              <label className="block font-semibold text-slate-500 mb-1">Mother's Name</label>
              <input type="text" value={profile.motherName} onChange={e => setProfile({...profile, motherName: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-500 mb-1">Gender</label>
                <select value={profile.gender} onChange={e => setProfile({...profile, gender: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white">
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-500 mb-1">Blood Group</label>
                <input type="text" placeholder="O+" value={profile.bloodGroup} onChange={e => setProfile({...profile, bloodGroup: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
              </div>
            </div>
            <div>
              <label className="block font-semibold text-slate-500 mb-1">Date of Birth</label>
              <input type="date" value={profile.dob} required onChange={e => setProfile({...profile, dob: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block font-semibold text-slate-500 mb-1">Designation</label>
              <input 
                type="text" 
                value={profile.designation} 
                onChange={e => setProfile({...profile, designation: e.target.value})} 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-500 mb-1">Qualification (Degrees)</label>
              <input type="text" placeholder="M.A., B.Ed." value={profile.qualification} onChange={e => setProfile({...profile, qualification: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-500 mb-1">Appointment Date</label>
                <input type="date" value={profile.appointmentDate} onChange={e => setProfile({...profile, appointmentDate: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
              </div>
              <div>
                <label className="block font-semibold text-slate-500 mb-1">Joining Date</label>
                <input type="date" value={profile.joiningDate} onChange={e => setProfile({...profile, joiningDate: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
              </div>
            </div>
            <div>
              <label className="block font-semibold text-slate-500 mb-1">Mobile Number</label>
              <input type="tel" value={profile.mobileNumber} required onChange={e => setProfile({...profile, mobileNumber: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
            </div>
            <div>
              <label className="block font-semibold text-slate-500 mb-1">Email Address</label>
              <input type="email" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
            </div>
            <div>
              <label className="block font-semibold text-slate-500 mb-1">Residential Address</label>
              <textarea rows={2} value={profile.address} onChange={e => setProfile({...profile, address: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg"></textarea>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 cursor-pointer">
            <Save className="w-4 h-4" />
            Save Profile
          </button>
        </div>
      </form>
    </div>
  );
}
