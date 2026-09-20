import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ImagePlus, Loader2, Save, ShieldCheck, UserRound } from 'lucide-react';
import type { User } from '../types';
import { supabase, LocalERPDatabase } from '../lib/supabase';
import { FALLBACK_LANGUAGE_CATALOGUE, languageDisplayName } from '../lib/languageCatalog';
import { teacherProfileMissingFields } from '../lib/profileCompletion';

type ProfileDetails = {
  fatherName: string;
  motherName: string;
  gender: string;
  dob: string;
  bloodGroup: string;
  qualification: string;
  designation: string;
  appointmentDate: string;
  joiningDate: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  motherTongue: string;
  preferredLanguage: string;
  aboutMe: string;
};

const EMPTY_DETAILS: ProfileDetails = {
  fatherName: '', motherName: '', gender: '', dob: '', bloodGroup: '', qualification: '', designation: '',
  appointmentDate: '', joiningDate: '', address: '', emergencyContactName: '', emergencyContactPhone: '',
  motherTongue: '', preferredLanguage: '', aboutMe: ''
};

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const STAFF_ROLES = new Set(['headmaster', 'clerk', 'teacher', 'class_teacher', 'peon', 'super_admin']);

function safe(value: unknown): string { return String(value ?? '').trim(); }

export default function CompleteProfileWorkspace({ user, onProfileSaved, forcedTeacherCompletion = false }: { user: User; onProfileSaved?: () => void; forcedTeacherCompletion?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [fullName, setFullName] = useState(user.name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [photoUrl, setPhotoUrl] = useState(user.photoUrl || '');
  const [photoDataUrl, setPhotoDataUrl] = useState('');
  const [photoFileName, setPhotoFileName] = useState('');
  const [details, setDetails] = useState<ProfileDetails>(EMPTY_DETAILS);

  const isStaff = STAFF_ROLES.has(user.role);
  const fullNameEditable = user.role !== 'student';
  const isTeacherAccount = user.role === 'teacher' || user.role === 'class_teacher';
  const isStudentAccount = user.role === 'student';
  const isParentAccount = user.role === 'parent';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setMessage(null);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) throw new Error('Cloud session was not found. Please log in again.');
        const response = await fetch('/api/me/profile-details', { headers: { Authorization: `Bearer ${token}` } });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'Complete profile could not be loaded.');
        if (cancelled) return;
        const p = payload?.profile || {};
        setFullName(safe(p.fullName || user.name));
        setPhone(safe(p.phone || user.phone));
        setPhotoUrl(safe(p.photoUrl || user.photoUrl));
        setDetails({
          fatherName: safe(p.fatherName), motherName: safe(p.motherName), gender: safe(p.gender), dob: safe(p.dob),
          bloodGroup: safe(p.bloodGroup), qualification: safe(p.qualification), designation: safe(p.designation || user.designation),
          appointmentDate: safe(p.appointmentDate), joiningDate: safe(p.joiningDate || user.joiningDate), address: safe(p.address || user.address),
          emergencyContactName: safe(p.emergencyContactName), emergencyContactPhone: safe(p.emergencyContactPhone),
          motherTongue: safe(p.motherTongue), preferredLanguage: safe(p.preferredLanguage), aboutMe: safe(p.aboutMe)
        });
      } catch (error: any) {
        if (!cancelled) setMessage({ type: 'error', text: error?.message || 'Complete profile could not be loaded.' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user.id]);

  const completion = useMemo(() => {
    const required: Array<string | undefined> = [fullName, phone, photoDataUrl || photoUrl, details.motherTongue];
    if (!isStudentAccount) required.push(details.gender, details.dob, details.address);
    if (isStaff) required.push(details.designation, details.qualification, details.joiningDate);
    if (isParentAccount) required.push(details.emergencyContactPhone);
    const complete = required.filter(value => safe(value)).length;
    return Math.round((complete / Math.max(1, required.length)) * 100);
  }, [fullName, phone, photoDataUrl, photoUrl, details, isStaff, isStudentAccount, isParentAccount]);

  const patch = (field: keyof ProfileDetails, value: string) => setDetails(current => ({ ...current, [field]: value }));

  const handlePhoto = (file: File | null) => {
    setMessage(null);
    if (!file) { setPhotoDataUrl(''); setPhotoFileName(''); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setMessage({ type: 'error', text: 'Please choose a JPG, PNG or WEBP image.' }); return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Profile photo must be 2 MB or smaller.' }); return;
    }
    const reader = new FileReader();
    reader.onload = () => { setPhotoDataUrl(typeof reader.result === 'string' ? reader.result : ''); setPhotoFileName(file.name); };
    reader.onerror = () => setMessage({ type: 'error', text: 'The selected photo could not be read.' });
    reader.readAsDataURL(file);
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!safe(fullName)) { setMessage({ type: 'error', text: 'Full name is required.' }); return; }
    if (isTeacherAccount) {
      const missing = teacherProfileMissingFields({
        fullName, phone, photoUrl: photoDataUrl || photoUrl, gender: details.gender, dob: details.dob, address: details.address,
        motherTongue: details.motherTongue, designation: details.designation, qualification: details.qualification, joiningDate: details.joiningDate,
      });
      if (missing.length) {
        setMessage({ type: 'error', text: `Complete these required Teacher profile fields before continuing: ${missing.join(', ')}.` });
        return;
      }
    }
    setSaving(true); setMessage(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Cloud session was not found. Please log in again.');

      const basicResponse = await fetch('/api/me/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fullName: fullName.trim(), phone: phone.trim(), photoUrl: photoUrl.trim(), profilePhotoDataUrl: photoDataUrl || null })
      });
      const basicPayload = await basicResponse.json().catch(() => ({}));
      if (!basicResponse.ok) throw new Error(basicPayload.error || 'Basic profile update failed.');

      const detailsResponse = await fetch('/api/me/profile-details', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...details, fullName: fullName.trim(), phone: phone.trim() })
      });
      const detailsPayload = await detailsResponse.json().catch(() => ({}));
      if (!detailsResponse.ok) throw new Error(detailsPayload.error || 'Complete profile details could not be saved.');

      const savedPhotoUrl = safe(basicPayload?.profile?.photoUrl || photoUrl);
      const savedUser: User = {
        ...user,
        name: fullName.trim(),
        phone: phone.trim() || undefined,
        photoUrl: savedPhotoUrl || undefined,
        designation: details.designation || user.designation,
        gender: (details.gender || user.gender) as User['gender'],
        dob: details.dob || user.dob,
        qualification: details.qualification || user.qualification,
        joiningDate: details.joiningDate || user.joiningDate,
        address: details.address || user.address
      };
      LocalERPDatabase.saveUser(savedUser);
      setPhotoUrl(savedPhotoUrl);
      setPhotoDataUrl(''); setPhotoFileName('');
      window.dispatchEvent(new CustomEvent('edunixo_profile_updated', { detail: { user: savedUser, changedAt: Date.now() } }));
      setMessage({ type: 'success', text: 'Complete profile saved successfully. Changes are now active across your account.' });
      onProfileSaved?.();
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'Complete profile could not be saved.' });
    } finally { setSaving(false); }
  };

  if (loading) return <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm"><Loader2 className="mx-auto h-7 w-7 animate-spin text-cyan-600" /><p className="mt-3 text-sm font-bold text-slate-600">Loading complete profile…</p></div>;

  const identityId = user.role === 'teacher' || user.role === 'class_teacher' ? (user.shalarthId || user.username)
    : user.role === 'clerk' || user.role === 'peon' ? (user.employeeCode || user.username)
    : user.role === 'student' ? (user.grNumber || user.username)
    : user.username;

  return (
    <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl">
      <div className="edx-dark-contrast-surface bg-[radial-gradient(circle_at_10%_10%,rgba(34,211,238,.17),transparent_32%),linear-gradient(135deg,#071426,#0b1026_55%,#17112e)] p-6 text-white sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4"><div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/15 bg-white/10"><UserRound className="h-6 w-6 text-cyan-300" /></div><div><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-300">Personal account</div><h2 className="mt-1 text-2xl font-black">{isParentAccount ? 'Complete Parent Profile' : isStudentAccount ? 'Complete Student Profile' : 'My Complete Profile'}</h2><p className="mt-1 text-xs text-slate-300">{isStudentAccount ? 'Update only permitted personal/contact details. GR, class, roll number and official Student Master identity stay protected.' : isParentAccount ? 'Update your Parent account profile. Child academic identity and Parent-child links remain protected.' : 'Complete your permitted personal and professional details. Login identity and role remain protected.'}</p>{forcedTeacherCompletion && <p className="mt-3 rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-[11px] font-black text-amber-100">Teacher profile completion is required before Dashboard, Attendance, Academic Work, Result, Timetable or Communication can open.</p>}</div></div>
          <div className="min-w-44 rounded-2xl border border-white/10 bg-white/5 p-4"><div className="flex items-center justify-between text-xs font-black"><span>Profile completeness</span><span className="text-cyan-300">{completion}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-400 transition-all" style={{ width: `${completion}%` }} /></div></div>
        </div>
      </div>

      <form onSubmit={saveProfile} className="space-y-7 bg-slate-50 p-5 sm:p-7">
        {message && <div className={`rounded-2xl border p-4 text-xs font-bold ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>{message.text}</div>}

        <div className="grid gap-4 sm:grid-cols-3">
          <Readonly label="Role" value={user.role.replaceAll('_', ' ')} />
          <Readonly label="Login / Identity ID" value={identityId || '—'} />
          <Readonly label="Login Email" value={user.email || '—'} />
        </div>

        <ProfileSection title="Profile Photo & Contact" subtitle="Your photo and permitted contact details are shared across the ERP header and dashboard.">
          <div className="grid gap-5 lg:grid-cols-[180px_1fr]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center"><img src={photoDataUrl || photoUrl || user.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80'} className="mx-auto h-28 w-28 rounded-2xl border-4 border-white object-cover shadow" alt="Profile" /><label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white"><ImagePlus className="h-4 w-4" />Choose Photo *<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={event => handlePhoto(event.target.files?.[0] || null)} /></label>{photoFileName && <p className="mt-2 truncate text-[10px] font-bold text-emerald-700">{photoFileName}</p>}</div>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Full Name *"><input value={fullName} onChange={e => setFullName(e.target.value)} disabled={!fullNameEditable} required className="edx-complete-profile-input" /></Field><Field label={isParentAccount ? 'Verified Parent Mobile *' : 'Mobile Number *'}><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} disabled={isParentAccount} className="edx-complete-profile-input" />{isParentAccount && <span className="mt-1.5 block text-[10px] font-bold leading-4 text-amber-700">This number verified the Parent-child link and cannot be changed from self-service. Request a verified contact correction through the school.</span>}</Field>{!isStudentAccount && <div className="sm:col-span-2"><Field label="Residential Address *"><textarea rows={3} value={details.address} onChange={e => patch('address', e.target.value)} className="edx-complete-profile-input" /></Field></div>}</div>
          </div>
        </ProfileSection>

        <ProfileSection title="Personal Details" subtitle={isStudentAccount ? 'Permitted Student profile details only. Official Student Master identity corrections must use Request Center.' : isParentAccount ? 'Your Parent account details only. Linked-child school records cannot be edited here.' : 'These details are your personal profile. Official school identifiers stay read-only.'}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {isStaff && <Field label="Father's Name"><input value={details.fatherName} onChange={e => patch('fatherName', e.target.value)} className="edx-complete-profile-input" /></Field>}
            {isStaff && <Field label="Mother's Name"><input value={details.motherName} onChange={e => patch('motherName', e.target.value)} className="edx-complete-profile-input" /></Field>}
            {!isStudentAccount && <Field label="Gender *"><select value={details.gender} onChange={e => patch('gender', e.target.value)} className="edx-complete-profile-input"><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></select></Field>}
            {!isStudentAccount && <Field label="Date of Birth *"><input type="date" value={details.dob} onChange={e => patch('dob', e.target.value)} className="edx-complete-profile-input" /></Field>}
            {!isStudentAccount && <Field label="Blood Group"><select value={details.bloodGroup} onChange={e => patch('bloodGroup', e.target.value)} className="edx-complete-profile-input"><option value="">Select</option>{BLOOD_GROUPS.map(item => <option key={item}>{item}</option>)}</select></Field>}
            <Field label="Mother Tongue *"><select value={details.motherTongue} onChange={e => patch('motherTongue', e.target.value)} className="edx-complete-profile-input"><option value="">Select language</option>{FALLBACK_LANGUAGE_CATALOGUE.map(option => <option key={option.code} value={option.code}>{languageDisplayName(option)}</option>)}<option value="other">Other / Custom</option></select></Field>
            <Field label="Preferred Communication Language"><select value={details.preferredLanguage} onChange={e => patch('preferredLanguage', e.target.value)} className="edx-complete-profile-input"><option value="">School default</option>{FALLBACK_LANGUAGE_CATALOGUE.map(option => <option key={option.code} value={option.code}>{languageDisplayName(option)}</option>)}<option value="other">Other / Custom</option></select></Field>
            <Field label="Emergency Contact Name"><input value={details.emergencyContactName} onChange={e => patch('emergencyContactName', e.target.value)} className="edx-complete-profile-input" /></Field>
            <Field label="Emergency Contact Number"><input type="tel" value={details.emergencyContactPhone} onChange={e => patch('emergencyContactPhone', e.target.value)} className="edx-complete-profile-input" /></Field>
          </div>
          {isStudentAccount && <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[11px] font-bold leading-5 text-amber-900">Official Student Master fields such as date of birth, gender, residential address, GR, class/division and roll number are protected here. Use Student Request Center → Profile Correction for any official change.</div>}
        </ProfileSection>

        {isStaff && <ProfileSection title="Professional Details" subtitle="Professional details are attached to your account; login ID and assigned duties cannot be changed here.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Designation *"><input value={details.designation} onChange={e => patch('designation', e.target.value)} className="edx-complete-profile-input" /></Field>
            <Field label="Qualification *"><input value={details.qualification} onChange={e => patch('qualification', e.target.value)} placeholder="e.g. M.A., B.Ed." className="edx-complete-profile-input" /></Field>
            <Field label="Appointment Date"><input type="date" value={details.appointmentDate} onChange={e => patch('appointmentDate', e.target.value)} className="edx-complete-profile-input" /></Field>
            <Field label="Joining Date *"><input type="date" value={details.joiningDate} onChange={e => patch('joiningDate', e.target.value)} className="edx-complete-profile-input" /></Field>
          </div>
        </ProfileSection>}

        <ProfileSection title="About Me" subtitle="Optional short profile note. Do not enter passwords or sensitive authentication information here."><textarea rows={3} value={details.aboutMe} onChange={e => patch('aboutMe', e.target.value)} maxLength={1000} className="edx-complete-profile-input" /></ProfileSection>

        <div className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3 text-xs text-emerald-900"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" /><span><strong>Protected identity:</strong> Role, login ID, GR/SHALARTH/Employee ID, class assignment and permissions cannot be changed from this profile.</span></div><button type="submit" disabled={saving} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-xs font-black text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? 'Saving…' : 'Save Complete Profile'}</button></div>
        {message?.type === 'success' && <div className="flex items-center gap-2 text-xs font-bold text-emerald-700"><CheckCircle2 className="h-4 w-4" />Saved to cloud.</div>}
      </form>
      <style>{`.edx-complete-profile-input{width:100%;border:1px solid rgb(226 232 240);border-radius:.75rem;background:white;padding:.75rem .9rem;font-size:.8rem;font-weight:600;color:rgb(15 23 42);outline:none}.edx-complete-profile-input:focus{border-color:rgb(6 182 212);box-shadow:0 0 0 3px rgba(6,182,212,.10)}.edx-complete-profile-input:disabled{background:rgb(241 245 249);color:rgb(100 116 139)}`}</style>
    </section>
  );
}

function ProfileSection({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h3 className="text-base font-black text-slate-950">{title}</h3><p className="mt-1 text-[11px] leading-5 text-slate-500">{subtitle}</p><div className="mt-5">{children}</div></section>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-[11px] font-black text-slate-600"><span className="mb-1.5 block">{label}</span>{children}</label>; }
function Readonly({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</div><div className="mt-1 truncate text-xs font-black text-slate-800">{value}</div></div>; }
