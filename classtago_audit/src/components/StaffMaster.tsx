import React, { useEffect, useMemo, useState } from 'react';
import {
  Archive, BadgeCheck, Cloud, Download, Edit2, Loader2, Plus, RefreshCw,
  RotateCcw, Save, Search, ShieldCheck, Trash2, Upload, UserRoundCheck, Users, X, Lock
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Language } from '../types';
import { CloudStaffMasterRecord, StaffMasterInput, StaffMasterService } from '../services/staffMasterService';
import { requestActionConfirm } from '../lib/actionConfirm';
import { LocalERPDatabase } from '../lib/supabase';

const blankForm = (): StaffMasterInput => ({
  fullName: '', employeeId: '', shalarthId: '', designation: '', mobileNumber: '', qualification: '', joiningDate: ''
});

export default function StaffMaster({
  lang = 'en' as Language,
  userRole = 'headmaster',
  focusedMode = false,
  focusedTitle = 'Staff Master',
  focusedFeatureId = null
}: {
  lang?: Language;
  userRole?: string;
  userId?: string;
  userName?: string;
  focusedMode?: boolean;
  focusedTitle?: string;
  focusedFeatureId?: string | null;
}) {
  const canOperate = userRole === 'headmaster' || userRole === 'clerk';
  const canHardDelete = userRole === 'headmaster';
  const t = (en: string, hi: string, ur: string) => lang === 'ur' ? ur : lang === 'hi' ? hi : en;
  const [records, setRecords] = useState<CloudStaffMasterRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CloudStaffMasterRecord | null>(null);
  const [formData, setFormData] = useState<StaffMasterInput>(blankForm());
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [masterLookups, setMasterLookups] = useState(() => LocalERPDatabase.getAcademicSetup());

  const loadRecords = async () => {
    setLoading(true); setError('');
    try { setRecords(await StaffMasterService.list()); }
    catch (err: any) { setError(err?.message || 'Staff Master could not be loaded from the cloud.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void loadRecords(); }, []);
  useEffect(() => {
    const refreshLookups = () => setMasterLookups(LocalERPDatabase.getAcademicSetup());
    window.addEventListener('academic_setup_updated', refreshLookups);
    window.addEventListener('storage', refreshLookups);
    return () => {
      window.removeEventListener('academic_setup_updated', refreshLookups);
      window.removeEventListener('storage', refreshLookups);
    };
  }, []);

  const activeCount = useMemo(() => records.filter(item => item.isActive).length, [records]);
  const linkedCount = useMemo(() => records.filter(item => Boolean(item.userId)).length, [records]);
  const filteredRecords = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return records;
    return records.filter(r => [r.fullName, r.shalarthId, r.employeeId, r.designation, r.mobileNumber, r.qualification]
      .some(value => String(value || '').toLowerCase().includes(q)));
  }, [records, searchTerm]);


  const designationOptions = useMemo(() => Array.from(new Set([
    'Peon',
    ...(masterLookups.designations || []).filter((item: any) => item?.isActive !== false).map((item: any) => String(item?.name || '').trim()),
    ...records.map((record) => String(record.designation || '').trim()),
    String(formData.designation || '').trim(),
  ].filter(Boolean))).sort((a, b) => a.localeCompare(b)), [masterLookups.designations, records, formData.designation]);

  const qualificationOptions = useMemo(() => Array.from(new Set([
    ...(masterLookups.qualifications || []).filter((item: any) => item?.isActive !== false).map((item: any) => String(item?.name || '').trim()),
    ...records.map((record) => String(record.qualification || '').trim()),
    String(formData.qualification || '').trim(),
  ].filter(Boolean))).sort((a, b) => a.localeCompare(b)), [masterLookups.qualifications, records, formData.qualification]);

  const openAdd = () => { setEditingRecord(null); setFormData(blankForm()); setError(''); setIsModalOpen(true); };
  const openEdit = (record: CloudStaffMasterRecord) => {
    setEditingRecord(record);
    setFormData({
      fullName: record.fullName, employeeId: record.employeeId, shalarthId: record.shalarthId,
      designation: record.designation, mobileNumber: record.mobileNumber,
      qualification: record.qualification, joiningDate: record.joiningDate
    });
    setError(''); setIsModalOpen(true);
  };

  const save = async () => {
    if (!canOperate || saving) return;
    if (!formData.fullName.trim() || !formData.designation.trim() || (!formData.shalarthId?.trim() && !formData.employeeId?.trim())) {
      setError(t('Full name, designation and at least one Staff ID are required.', 'पूरा नाम, पद और कम से कम एक स्टाफ आईडी आवश्यक है।', 'پورا نام، عہدہ اور کم از کم ایک اسٹاف آئی ڈی ضروری ہے۔'));
      return;
    }
    setSaving(true); setError('');
    try {
      if (editingRecord) await StaffMasterService.update(editingRecord.id, formData);
      else await StaffMasterService.create(formData);
      await loadRecords();
      setIsModalOpen(false);
      setSuccess(editingRecord ? 'Staff Master record updated in Supabase Cloud.' : 'Staff Master record created in Supabase Cloud.');
      window.setTimeout(() => setSuccess(''), 3500);
    } catch (err: any) { setError(err?.message || 'Staff Master record could not be saved.'); }
    finally { setSaving(false); }
  };

  const toggleArchive = async (record: CloudStaffMasterRecord) => {
    if (!canOperate) return;
    const next = !record.isActive;
    const verb = next ? 'restore' : 'archive';
    if (!(await requestActionConfirm({ title: `${verb[0].toUpperCase()}${verb.slice(1)} staff record?`, message: `${verb[0].toUpperCase()}${verb.slice(1)} ${record.fullName}? Login activation is managed separately.`, confirmLabel: next ? 'Restore Staff' : 'Archive Staff', tone: next ? 'warning' : 'danger' }))) return;
    try {
      await StaffMasterService.setActive(record.id, next);
      await loadRecords();
      setSuccess(`Staff record ${next ? 'restored' : 'archived'} safely.`);
      window.setTimeout(() => setSuccess(''), 3500);
    } catch (err: any) { setError(err?.message || 'Staff status could not be changed.'); }
  };

  const remove = async (record: CloudStaffMasterRecord) => {
    if (!canHardDelete) return;
    if (record.userId) return setError('Permanent delete is blocked because this Staff Master record is linked to a login. Archive it instead.');
    if (!(await requestActionConfirm({ title: 'Delete unused staff record?', message: `Permanently delete unused staff record “${record.fullName}”? This is allowed only when no login or academic assignment references it.`, confirmLabel: 'Delete Staff Record', tone: 'danger' }))) return;
    try {
      await StaffMasterService.remove(record.id);
      await loadRecords();
      setSuccess('Record deleted successfully. Only the unused, unlinked Staff Master record was removed after server-side dependency checks.');
      window.setTimeout(() => setSuccess(''), 3500);
    } catch (err: any) { setError(err?.message || 'Permanent delete was blocked.'); }
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(records.map(r => ({
      FullName: r.fullName, EmployeeID: r.employeeId, ShalarthID: r.shalarthId, Designation: r.designation,
      Mobile: r.mobileNumber, Qualification: r.qualification, JoiningDate: r.joiningDate,
      Status: r.isActive ? 'Active' : 'Archived', LoginLinked: r.userId ? 'Yes' : 'No'
    })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'StaffMaster'); XLSX.writeFile(wb, 'Classtago_Staff_Master.xlsx');
  };

  const importExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file || !canOperate) return;
    const reader = new FileReader();
    reader.onload = async e => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'binary' });
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]) as any[];
        if (!rows.length) throw new Error('The selected sheet is empty.');
        const byIdentifier = new Map(records.flatMap(r => [r.shalarthId, r.employeeId].filter(Boolean).map(id => [String(id).toLowerCase(), r] as const)));
        let created = 0, updated = 0, skipped = 0;
        setSaving(true);
        for (const row of rows.slice(0, 500)) {
          const input: StaffMasterInput = {
            fullName: String(row.FullName || row.fullName || row.Name || '').trim(),
            employeeId: String(row.EmployeeID || row.employeeId || '').trim(),
            shalarthId: String(row.ShalarthID || row.shalarthId || '').trim(),
            designation: String(row.Designation || row.designation || '').trim(),
            mobileNumber: String(row.Mobile || row.mobileNumber || '').trim(),
            qualification: String(row.Qualification || row.qualification || '').trim(),
            joiningDate: String(row.JoiningDate || row.joiningDate || '').trim()
          };
          if (!input.fullName || !input.designation || (!input.shalarthId && !input.employeeId)) { skipped++; continue; }
          const existing = byIdentifier.get(String(input.shalarthId || input.employeeId).toLowerCase());
          if (existing) { await StaffMasterService.update(existing.id, input); updated++; }
          else { const added = await StaffMasterService.create(input); created++; if (added.shalarthId) byIdentifier.set(added.shalarthId.toLowerCase(), added); if (added.employeeId) byIdentifier.set(added.employeeId.toLowerCase(), added); }
        }
        await loadRecords();
        setSuccess(`Cloud import complete: ${created} created, ${updated} updated${skipped ? `, ${skipped} skipped` : ''}.`);
      } catch (err: any) { setError(err?.message || 'Excel import failed. No browser-only Staff Master was created.'); }
      finally { setSaving(false); }
    };
    reader.readAsBinaryString(file);
  };

  const focusMeta: Record<string, { eyebrow: string; description: string }> = {
    'staff-profile': {
      eyebrow: 'Identity & Contact',
      description: 'Focused staff identity view: name, designation, contact, identifiers and login linkage from the canonical cloud Staff Master.'
    },
    'staff-qualification': {
      eyebrow: 'Qualifications & Credentials',
      description: 'Focused qualification register. Edit updates the same canonical Staff Master record; no duplicate teacher profile is created.'
    },
    'staff-service-details': {
      eyebrow: 'Service Details',
      description: 'Focused service register showing SHALARTH/Employee identity and joining information from the canonical cloud Staff Master.'
    },
    'staff-employment-status': {
      eyebrow: 'Employment Status',
      description: 'Focused active/archive control for Staff Master employment records. Login activation remains a separate Headmaster action.'
    },
    'staff-documents': {
      eyebrow: 'Documents & Identity Readiness',
      description: 'Read-only readiness view for the canonical staff identifiers and profile facts that official staff documents depend on. No document is invented or marked verified without a real stored record.'
    }
  };
  const currentFocus = focusedFeatureId ? focusMeta[focusedFeatureId] : null;
  const allowRegistryCreation = !focusedMode || focusedFeatureId === 'staff-profile';

  const serviceLength = (joiningDate?: string) => {
    if (!joiningDate) return 'Not entered';
    const start = new Date(joiningDate);
    if (Number.isNaN(start.getTime())) return joiningDate;
    const months = Math.max(0, (new Date().getFullYear() - start.getFullYear()) * 12 + (new Date().getMonth() - start.getMonth()));
    const years = Math.floor(months / 12);
    const rem = months % 12;
    return `${years}y ${rem}m`;
  };

  const editButton = (record: CloudStaffMasterRecord) => canOperate ? <button type="button" onClick={()=>openEdit(record)} className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-700" title="Edit canonical staff record"><Edit2 className="h-4 w-4"/></button> : null;
  const statusButton = (record: CloudStaffMasterRecord) => canOperate ? <button type="button" onClick={()=>void toggleArchive(record)} className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-500 hover:bg-amber-50 hover:text-amber-700" title={record.isActive?'Archive':'Restore'}>{record.isActive?<Archive className="h-4 w-4"/>:<RotateCcw className="h-4 w-4"/>}</button> : null;
  const loginPill = (record: CloudStaffMasterRecord) => <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-black ${record.userId?'bg-cyan-50 text-cyan-700':'bg-slate-100 text-slate-500'}`}>{record.userId?<><Cloud className="h-3 w-3"/>Linked</>:'Not linked'}</span>;
  const statusPill = (record: CloudStaffMasterRecord) => <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase ${record.isActive?'border-emerald-200 bg-emerald-50 text-emerald-700':'border-slate-200 bg-slate-100 text-slate-500'}`}>{record.isActive?'Active':'Archived'}</span>;

  const renderStaffTable = () => {
    if (focusedFeatureId === 'staff-profile') return <div className="overflow-x-auto"><table className="min-w-full text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">Staff profile</th><th className="px-4 py-3">Designation</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Identifiers</th><th className="px-4 py-3 text-center">Login</th><th className="px-4 py-3 text-right">Edit</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredRecords.map(record=><tr key={record.id} className="hover:bg-cyan-50/30"><td className="px-4 py-4 font-black text-slate-900">{record.fullName}</td><td className="px-4 py-4 font-semibold text-slate-700">{record.designation}</td><td className="px-4 py-4 font-semibold text-slate-700">{record.mobileNumber||'—'}</td><td className="px-4 py-4"><div className="font-mono font-bold text-indigo-700">{record.shalarthId||'—'}</div><div className="mt-1 font-mono text-[10px] text-slate-500">Emp: {record.employeeId||'—'}</div></td><td className="px-4 py-4 text-center">{loginPill(record)}</td><td className="px-4 py-4"><div className="flex justify-end">{editButton(record)}</div></td></tr>)}{!filteredRecords.length&&<EmptyRow colSpan={6}/>}</tbody></table></div>;
    if (focusedFeatureId === 'staff-qualification') return <div className="overflow-x-auto"><table className="min-w-full text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">Staff</th><th className="px-4 py-3">Qualification / credential</th><th className="px-4 py-3">Designation</th><th className="px-4 py-3 text-center">Credential status</th><th className="px-4 py-3 text-right">Edit</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredRecords.map(record=><tr key={record.id} className="hover:bg-cyan-50/30"><td className="px-4 py-4"><div className="font-black text-slate-900">{record.fullName}</div><div className="mt-1 font-mono text-[10px] text-slate-500">{record.shalarthId||record.employeeId||'ID not entered'}</div></td><td className="px-4 py-4 font-semibold text-slate-700">{record.qualification||'Qualification not entered'}</td><td className="px-4 py-4 text-slate-600">{record.designation}</td><td className="px-4 py-4 text-center"><span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${record.qualification?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-700'}`}>{record.qualification?'Recorded':'Incomplete'}</span></td><td className="px-4 py-4"><div className="flex justify-end">{editButton(record)}</div></td></tr>)}{!filteredRecords.length&&<EmptyRow colSpan={5}/>}</tbody></table></div>;
    if (focusedFeatureId === 'staff-service-details') return <div className="overflow-x-auto"><table className="min-w-full text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">Staff</th><th className="px-4 py-3">SHALARTH ID</th><th className="px-4 py-3">Employee ID</th><th className="px-4 py-3">Joining date</th><th className="px-4 py-3">Service length</th><th className="px-4 py-3 text-right">Edit</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredRecords.map(record=><tr key={record.id} className="hover:bg-cyan-50/30"><td className="px-4 py-4"><div className="font-black text-slate-900">{record.fullName}</div><div className="mt-1 text-[10px] text-slate-500">{record.designation}</div></td><td className="px-4 py-4 font-mono font-bold text-indigo-700">{record.shalarthId||'—'}</td><td className="px-4 py-4 font-mono text-slate-700">{record.employeeId||'—'}</td><td className="px-4 py-4 font-semibold text-slate-700">{record.joiningDate||'Not entered'}</td><td className="px-4 py-4 text-slate-600">{serviceLength(record.joiningDate)}</td><td className="px-4 py-4"><div className="flex justify-end">{editButton(record)}</div></td></tr>)}{!filteredRecords.length&&<EmptyRow colSpan={6}/>}</tbody></table></div>;
    if (focusedFeatureId === 'staff-employment-status') return <div className="overflow-x-auto"><table className="min-w-full text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">Staff</th><th className="px-4 py-3">Designation</th><th className="px-4 py-3 text-center">Employment record</th><th className="px-4 py-3 text-center">Login linkage</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredRecords.map(record=><tr key={record.id} className={`${record.isActive?'':'bg-slate-50/60'} hover:bg-cyan-50/30`}><td className="px-4 py-4"><div className="font-black text-slate-900">{record.fullName}</div><div className="mt-1 font-mono text-[10px] text-slate-500">{record.shalarthId||record.employeeId||'—'}</div></td><td className="px-4 py-4 font-semibold text-slate-700">{record.designation}</td><td className="px-4 py-4 text-center">{statusPill(record)}</td><td className="px-4 py-4 text-center">{loginPill(record)}</td><td className="px-4 py-4"><div className="flex justify-end gap-1.5">{editButton(record)}{statusButton(record)}</div></td></tr>)}{!filteredRecords.length&&<EmptyRow colSpan={5}/>}</tbody></table></div>;
    if (focusedFeatureId === 'staff-documents') return <div className="overflow-x-auto"><table className="min-w-full text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">Staff</th><th className="px-4 py-3">Primary identity</th><th className="px-4 py-3">Qualification</th><th className="px-4 py-3">Joining record</th><th className="px-4 py-3 text-center">Profile readiness</th><th className="px-4 py-3 text-center">Login</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredRecords.map(record=>{const ready=Boolean(record.fullName&&record.designation&&(record.shalarthId||record.employeeId)&&record.qualification&&record.joiningDate);return <tr key={record.id} className="hover:bg-cyan-50/30"><td className="px-4 py-4"><div className="font-black text-slate-900">{record.fullName}</div><div className="mt-1 text-[10px] text-slate-500">{record.designation}</div></td><td className="px-4 py-4"><div className="font-mono font-bold text-indigo-700">{record.shalarthId||record.employeeId||'Identity missing'}</div><div className="mt-1 font-mono text-[10px] text-slate-500">{record.shalarthId&&record.employeeId?`Emp: ${record.employeeId}`:'At least one permanent staff identifier required'}</div></td><td className="px-4 py-4 font-semibold text-slate-700">{record.qualification||'Not entered'}</td><td className="px-4 py-4 font-semibold text-slate-700">{record.joiningDate||'Not entered'}</td><td className="px-4 py-4 text-center"><span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${ready?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-700'}`}>{ready?'Ready':'Incomplete'}</span></td><td className="px-4 py-4 text-center">{loginPill(record)}</td></tr>})}{!filteredRecords.length&&<EmptyRow colSpan={6}/>}</tbody></table></div>;
    return <div className="overflow-x-auto"><table className="min-w-full text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">Staff</th><th className="px-4 py-3">Identifiers</th><th className="px-4 py-3">Designation</th><th className="px-4 py-3">Contact / Qualification</th><th className="px-4 py-3 text-center">Status</th><th className="px-4 py-3 text-center">Login</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredRecords.map(record=><tr key={record.id} className={`${record.isActive?'':'bg-slate-50/60'} hover:bg-cyan-50/30`}><td className="px-4 py-4"><div className="font-black text-slate-900">{record.fullName}</div>{record.joiningDate&&<div className="mt-1 text-[10px] text-slate-400">Joined {record.joiningDate}</div>}</td><td className="px-4 py-4"><div className="font-mono font-bold text-indigo-700">{record.shalarthId||'—'}</div><div className="mt-1 font-mono text-[10px] text-slate-500">Emp: {record.employeeId||'—'}</div></td><td className="px-4 py-4 font-semibold text-slate-700">{record.designation}</td><td className="px-4 py-4"><div className="font-semibold text-slate-700">{record.mobileNumber||'—'}</div><div className="mt-1 text-[10px] text-slate-400">{record.qualification||'Qualification not entered'}</div></td><td className="px-4 py-4 text-center">{statusPill(record)}</td><td className="px-4 py-4 text-center">{loginPill(record)}</td><td className="px-4 py-4"><div className="flex justify-end gap-1.5">{editButton(record)}{statusButton(record)}{canHardDelete&&(record.userId?<span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-400" title="Linked login: permanent delete is blocked. Deactivate/archive the staff record or manage the login separately."><Lock className="h-4 w-4"/></span>:<button type="button" onClick={()=>void remove(record)} className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-700" title="Permanent delete unused record"><Trash2 className="h-4 w-4"/></button>)}</div></td></tr>)}{!filteredRecords.length&&<EmptyRow colSpan={7}/>}</tbody></table></div>;
  };

  return <div className="edx-staff-master-root space-y-5 text-left">
    <section className="edx-staff-master-hero relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[radial-gradient(circle_at_10%_15%,rgba(34,211,238,.19),transparent_32%),radial-gradient(circle_at_92%_4%,rgba(139,92,246,.24),transparent_34%),linear-gradient(135deg,#07182f,#080b1d_58%,#17122f)] p-5 text-white shadow-[0_28px_80px_rgba(2,6,23,.28)] sm:p-7 no-print">
      <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/15 bg-white/10"><Users className="h-6 w-6 text-cyan-200"/></div><div><p className="text-[10px] font-black uppercase tracking-[.26em] text-cyan-200">{currentFocus?.eyebrow || 'Cloud Staff Registry'}</p><h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{focusedMode ? focusedTitle : 'Staff Master'}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{currentFocus?.description || 'One canonical staff record powers signup eligibility, Staff Accounts and academic assignments. Browser LocalStorage is no longer a Staff Master source-of-truth.'}</p></div></div>
        <button type="button" onClick={() => void loadRecords()} disabled={loading} className="edx-staff-master-refresh inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-xs font-black disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading?'animate-spin':''}`}/>Refresh Cloud</button>
      </div>
      <div className="relative z-10 mt-6 grid gap-3 sm:grid-cols-3"><Metric icon={Users} label="Staff records" value={records.length}/><Metric icon={BadgeCheck} label="Active records" value={activeCount}/><Metric icon={UserRoundCheck} label="Login linked" value={linkedCount}/></div>
    </section>

    {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{success}</div>}
    {error && !isModalOpen && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{error}</div>}

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="relative min-w-0 flex-1 sm:max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Search name, SHALARTH, Employee ID, designation…" className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"/></div>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={exportExcel} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700 hover:bg-slate-50"><Download className="h-4 w-4"/>Export</button>{canOperate&&allowRegistryCreation&&<label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700 hover:bg-slate-50"><Upload className="h-4 w-4"/>Import<input type="file" accept=".xlsx,.xls" className="hidden" onChange={importExcel}/></label>}{canOperate&&allowRegistryCreation&&<button type="button" onClick={openAdd} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-violet-600 px-4 py-3 text-xs font-black text-white shadow-lg"><Plus className="h-4 w-4"/>Add Staff</button>}</div>
      </div>

      {loading ? <div className="grid min-h-[260px] place-items-center"><div className="text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-600"/><p className="mt-3 text-xs font-bold text-slate-500">Loading canonical Staff Master…</p></div></div> : renderStaffTable()}
    </section>

    {isModalOpen&&canOperate&&<div className="fixed inset-0 z-[130] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[1.5rem] border border-white/10 bg-white shadow-2xl"><header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 p-5 backdrop-blur"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-700">Canonical Staff Master</p><h3 className="mt-1 text-xl font-black text-slate-950">{editingRecord?'Edit staff record':'Add staff record'}</h3></div><button type="button" onClick={()=>setIsModalOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-500"><X className="h-5 w-5"/></button></header><div className="grid gap-4 p-5 sm:grid-cols-2">{error&&<div className="sm:col-span-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">{error}</div>}<Field label="Full name *"><input value={formData.fullName} onChange={e=>setFormData({...formData,fullName:e.target.value})}/></Field><Field label="Designation *"><select required value={formData.designation} onChange={e=>setFormData({...formData,designation:e.target.value})}><option value="">Select designation</option>{designationOptions.map(option=><option key={option} value={option}>{option}</option>)}</select></Field><Field label="SHALARTH ID"><input value={formData.shalarthId||''} onChange={e=>setFormData({...formData,shalarthId:e.target.value.toUpperCase()})}/></Field><Field label="Employee ID"><input value={formData.employeeId||''} onChange={e=>setFormData({...formData,employeeId:e.target.value.toUpperCase()})}/></Field><Field label="Mobile"><input value={formData.mobileNumber||''} onChange={e=>setFormData({...formData,mobileNumber:e.target.value})}/></Field><Field label="Qualification"><select value={formData.qualification||''} onChange={e=>setFormData({...formData,qualification:e.target.value})}><option value="">Not specified</option>{qualificationOptions.map(option=><option key={option} value={option}>{option}</option>)}</select></Field><Field label="Joining date"><input type="date" value={formData.joiningDate||''} onChange={e=>setFormData({...formData,joiningDate:e.target.value})}/></Field><div className="rounded-xl border border-cyan-100 bg-cyan-50 p-4 text-xs leading-5 text-cyan-900"><ShieldCheck className="mb-2 h-5 w-5 text-cyan-700"/><b>Identity rule:</b> this creates/updates the staff master record only. A separate login is never generated here.</div></div><footer className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 p-5"><button type="button" onClick={()=>setIsModalOpen(false)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700">Cancel</button><button type="button" onClick={()=>void save()} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-xs font-black text-white disabled:opacity-50">{saving?<Loader2 className="h-4 w-4 animate-spin"/>:<Save className="h-4 w-4"/>}Save to Cloud</button></footer></div></div>}
  </div>;
}

function EmptyRow({colSpan}:{colSpan:number}) { return <tr><td colSpan={colSpan} className="px-4 py-12 text-center text-slate-500">No matching Staff Master records.</td></tr>; }
function Metric({icon:Icon,label,value}:{icon:any;label:string;value:number}) { return <div className="edx-staff-master-metric rounded-2xl border border-white/10 p-4"><Icon className="h-4 w-4 text-cyan-200"/><div className="mt-3 text-2xl font-black">{value}</div><div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-300">{label}</div></div>; }
function Field({label,children}:{label:string;children:React.ReactElement<any>}) { return <label className="block"><span className="mb-1.5 block text-xs font-black text-slate-700">{label}</span>{React.cloneElement(children,{className:`${children.props.className||''} w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10`})}</label>; }
