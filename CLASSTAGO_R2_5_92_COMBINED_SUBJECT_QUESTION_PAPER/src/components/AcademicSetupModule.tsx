import React, { useState, useEffect } from 'react';
import { 
  School, Calendar, BookOpen, Layers, Award, Clock, FileText, 
  Settings, Printer, Plus, Trash2, Edit2, Check, X, Shield, Lock, Unlock, 
  AlertCircle, ArrowRight, Save, Info, CheckSquare, RefreshCw, Cloud, CloudOff, UploadCloud, Database
} from 'lucide-react';
import { LocalERPDatabase, supabase } from '../lib/supabase';
import { 
  MasterAcademicSetup, SchoolProfile, AcademicYear, ClassMasterItem, 
  DivisionMasterItem, MediumMasterItem, SubjectMasterItem, SubjectGroup, 
  BoardConfig, ExamTerm, GradeScaleItem, SchoolTiming, PeriodConfig, 
  HolidayItem, DocumentConfig, PrintConfig, GlobalERPSettings, Language
} from '../types';

export type AcademicSetupCategory =
  | 'profile'
  | 'academic_year'
  | 'school_info'
  | 'classes_divisions'
  | 'subjects'
  | 'grading'
  | 'timing'
  | 'docs'
  | 'print'
  | 'erp_settings';

interface AcademicSetupModuleProps {
  lang: Language;
  userRole: string;
  userName: string;
  userId: string;
  initialCategory?: AcademicSetupCategory;
  focusedMode?: boolean;
  focusedTitle?: string;
  focusedFeatureId?: string | null;
}

export default function AcademicSetupModule({
  lang,
  userRole,
  userName,
  userId,
  initialCategory = 'profile',
  focusedMode = false,
  focusedTitle,
  focusedFeatureId = null
}: AcademicSetupModuleProps) {
  const isHeadmaster = userRole === 'headmaster' || userRole === 'clerk'; // authorized academic administration
  const isFinalAuthority = userRole === 'headmaster'; // destructive/import/final actions stay Headmaster-only
  const showSubjectGroups = !focusedMode || !focusedFeatureId || focusedFeatureId === 'subject-groups';
  const showSubjectRegistry = !focusedMode || !focusedFeatureId || focusedFeatureId === 'subject-master';
  const showSubjectClassMapping = !focusedMode || !focusedFeatureId || focusedFeatureId === 'subject-class-mapping';
  
  // Master state loaded from database
  const [setup, setSetup] = useState<MasterAcademicSetup | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [cloudInitialized, setCloudInitialized] = useState<boolean | null>(null);
  const [cloudLoading, setCloudLoading] = useState(true);
  const [cloudSaving, setCloudSaving] = useState(false);
  const [cloudImporting, setCloudImporting] = useState(false);
  const [cloudSummary, setCloudSummary] = useState<Record<string, any>>({});
  const [cloudLoadError, setCloudLoadError] = useState<string | null>(null);
  const [confirmationDialog, setConfirmationDialog] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    tone: 'amber' | 'rose';
    resolve: (confirmed: boolean) => void;
  } | null>(null);
  
  // Category Navigation
  const [activeCategory, setActiveCategory] = useState<AcademicSetupCategory>(initialCategory);

  useEffect(() => {
    setActiveCategory(initialCategory);
  }, [initialCategory]);

  // Local forms states
  const [editingProfile, setEditingProfile] = useState<SchoolProfile | null>(null);
  const [newYear, setNewYear] = useState('');
  const [newDivision, setNewDivision] = useState('');
  const [newMedium, setNewMedium] = useState('');
  const [newBoard, setNewBoard] = useState('');
  const [newTerm, setNewTerm] = useState('');
  
  // Subject Master Form state
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [subjectForm, setSubjectForm] = useState<Omit<SubjectMasterItem, 'id'>>({
    subjectCode: '',
    subjectName: '',
    subjectType: 'Core',
    language: 'None',
    isScholastic: true,
    boardMapping: [],
    classMapping: [],
    maxMarks: 100,
    passingMarks: 35,
    printOrder: 1,
    isActive: true
  });
  const [showSubjectForm, setShowSubjectForm] = useState(false);

  // Subject Group Form state
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedGroupSubjects, setSelectedGroupSubjects] = useState<string[]>([]);
  const [newGroupCombinedPaper, setNewGroupCombinedPaper] = useState(true);

  // Class-Subject Mapping Grid States
  const [selectedMappingClass, setSelectedMappingClass] = useState<string>('Class 9');

  // Selected Grading System Group
  const [selectedGradingGroup, setSelectedGradingGroup] = useState<'primary' | 'secondary' | 'future_ready'>('secondary');

  // Grade Scale Form state
  const [gradeForm, setGradeForm] = useState<Omit<GradeScaleItem, 'id'>>({
    gradeName: '',
    minPercentage: 0,
    maxPercentage: 100,
    gradePoints: 0,
    remarks: ''
  });

  // Day-wise school timing configurations state
  const [selectedTimingDay, setSelectedTimingDay] = useState<string>('Monday');
  const [dayOverrides, setDayOverrides] = useState<Record<string, {
    classification: string;
    isWorkingDay?: boolean;
    openingTime: string;
    closingTime: string;
    prayerTime: string;
    lunchBreakStart: string;
    lunchBreakEnd: string;
    shortBreakStart?: string;
    shortBreakEnd?: string;
    notes?: string;
  }>>({
    Monday: { classification: 'Assembly Day', openingTime: '08:00 AM', closingTime: '01:30 PM', prayerTime: '08:15 AM', lunchBreakStart: '11:00 AM', lunchBreakEnd: '11:30 AM' },
    Tuesday: { classification: 'Standard', openingTime: '08:15 AM', closingTime: '01:30 PM', prayerTime: '08:15 AM', lunchBreakStart: '11:00 AM', lunchBreakEnd: '11:30 AM' },
    Wednesday: { classification: 'Standard', openingTime: '08:15 AM', closingTime: '01:30 PM', prayerTime: '08:15 AM', lunchBreakStart: '11:00 AM', lunchBreakEnd: '11:30 AM' },
    Thursday: { classification: 'Standard', openingTime: '08:15 AM', closingTime: '01:30 PM', prayerTime: '08:15 AM', lunchBreakStart: '11:00 AM', lunchBreakEnd: '11:30 AM' },
    Friday: { classification: 'Prayer Day', openingTime: '08:15 AM', closingTime: '12:30 PM', prayerTime: '11:30 AM', lunchBreakStart: '11:00 AM', lunchBreakEnd: '11:30 AM' },
    Saturday: { classification: 'Half Day', openingTime: '08:00 AM', closingTime: '11:30 AM', prayerTime: '08:15 AM', lunchBreakStart: '10:00 AM', lunchBreakEnd: '10:15 AM' },
  });

  // Period Form state
  const [periodForm, setPeriodForm] = useState<Omit<PeriodConfig, 'id'>>({
    periodName: '',
    periodNumber: 1,
    startTime: '08:15 AM',
    endTime: '09:00 AM',
    durationMinutes: 45,
    type: 'Lecture'
  });

  // Holiday Form state
  const [holidayForm, setHolidayForm] = useState<Omit<HolidayItem, 'id'>>({
    holidayName: '',
    startDate: '',
    endDate: '',
    holidayType: 'School',
    description: ''
  });

  // Document Form state
  const [newDocumentName, setNewDocumentName] = useState('');
  const [newDocumentRequired, setNewDocumentRequired] = useState(true);

  const mergeCloudSetup = (localSetup: MasterAcademicSetup, cloudSetup: Partial<MasterAcademicSetup>): MasterAcademicSetup => ({
    ...localSetup,
    ...cloudSetup,
    schoolProfile: { ...localSetup.schoolProfile, ...(cloudSetup.schoolProfile || {}) },
    globalSettings: { ...localSetup.globalSettings, ...(cloudSetup.globalSettings || {}) },
    schoolTiming: { ...localSetup.schoolTiming, ...(cloudSetup.schoolTiming || {}) }
  });

  const applyCloudPayload = (payload: any, localFallback?: MasterAcademicSetup) => {
    const localSetup = localFallback || LocalERPDatabase.getAcademicSetup();
    const cloudSetup = payload?.setup as Partial<MasterAcademicSetup> | undefined;
    if (!cloudSetup) return localSetup;
    const merged = mergeCloudSetup(localSetup, cloudSetup);
    setSetup(merged);
    setEditingProfile({ ...merged.schoolProfile });
    if (merged.schoolTiming.dayOverrides && Object.keys(merged.schoolTiming.dayOverrides).length) {
      setDayOverrides(merged.schoolTiming.dayOverrides as any);
    }
    LocalERPDatabase.saveAcademicSetup(merged);
    setCloudSummary(payload?.summary || {});
    setCloudInitialized(payload?.initialized === true);
    setCloudLoadError(null);
    return merged;
  };

  const getCloudToken = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error('Cloud session was not found. Please log in again.');
    return token;
  };

  const refreshCloudSetup = async (showSuccess = false) => {
    const localSetup = LocalERPDatabase.getAcademicSetup();
    if (!setup) {
      setSetup(localSetup);
      setEditingProfile({ ...localSetup.schoolProfile });
      if (localSetup.schoolTiming.dayOverrides) setDayOverrides(localSetup.schoolTiming.dayOverrides as any);
    }
    setCloudLoading(true);
    try {
      const token = await getCloudToken();
      const response = await fetch('/api/admin/academic-setup', { headers: { Authorization: `Bearer ${token}` } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Academic Setup cloud state could not be loaded.');
      setCloudSummary(payload.summary || {});
      setCloudInitialized(payload.initialized === true);
      setCloudLoadError(null);
      if (payload.initialized && payload.setup) applyCloudPayload(payload, localSetup);
      else {
        setSetup(localSetup);
        setEditingProfile({ ...localSetup.schoolProfile });
      }
      if (showSuccess) triggerToast('Academic Setup refreshed from the permanent school cloud.');
    } catch (error: any) {
      setCloudInitialized(null);
      setCloudLoadError(error?.message || 'Academic Setup cloud state could not be loaded.');
      setSetup(localSetup);
      setEditingProfile({ ...localSetup.schoolProfile });
    } finally {
      setCloudLoading(false);
    }
  };

  // Load the permanent cloud setup first; keep the browser copy only as a compatibility cache.
  useEffect(() => {
    void refreshCloudSetup(false);
  }, []);

  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    if (type === 'success') {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 4000);
    } else {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  const requestConfirmation = (options: {
    title: string;
    message: string;
    confirmLabel: string;
    tone?: 'amber' | 'rose';
  }): Promise<boolean> => new Promise(resolve => {
    setConfirmationDialog({
      title: options.title,
      message: options.message,
      confirmLabel: options.confirmLabel,
      tone: options.tone || 'amber',
      resolve
    });
  });

  const answerConfirmation = (confirmed: boolean) => {
    const dialog = confirmationDialog;
    if (!dialog) return;
    setConfirmationDialog(null);
    dialog.resolve(confirmed);
  };

  const importExistingSetup = async () => {
    if (!isFinalAuthority || cloudImporting || cloudInitialized === true || !setup) return;
    const confirmed = await requestConfirmation({
      title: 'Connect Academic Setup to cloud',
      message: 'Copy this school’s existing Academic Setup from this browser into the permanent cloud database? Existing users, passwords, students, staff, subscription and entitlement data will not be changed.',
      confirmLabel: 'Copy setup to cloud',
      tone: 'amber'
    });
    if (!confirmed) return;
    setCloudImporting(true);
    try {
      const token = await getCloudToken();
      const response = await fetch('/api/admin/academic-setup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ setup })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Existing Academic Setup could not be copied to the cloud.');
      applyCloudPayload(payload, setup);
      LocalERPDatabase.addAuditLog(userId, userName, userRole as any, 'IMPORT_LEGACY_ACADEMIC_SETUP', 'Academic Config', 'Copied existing browser Academic Setup to the permanent school cloud foundation.');
      triggerToast('Academic Setup is now permanently connected to the school cloud.');
    } catch (error: any) {
      triggerToast(error?.message || 'Existing Academic Setup could not be copied safely.', 'error');
    } finally {
      setCloudImporting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: keyof SchoolProfile) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setEditingProfile(prev => {
        if (!prev) return prev;
        return { ...prev, [field]: reader.result as string };
      });
      triggerToast(`Uploaded image file for ${String(field).replace(/([A-Z])/g, ' $1')}`);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSetup = async (updatedSetup: MasterAcademicSetup, auditAction: string, auditDetail: string): Promise<boolean> => {
    if (cloudLoading) {
      triggerToast('Please wait while the permanent cloud setup finishes loading.', 'error');
      return false;
    }
    if (cloudInitialized !== true) {
      triggerToast('Import the existing Academic Setup to the cloud before making changes.', 'error');
      return false;
    }
    if (cloudSaving) {
      triggerToast('A cloud save is already in progress. Please wait a moment.', 'error');
      return false;
    }

    const previousSetup = setup;
    setCloudSaving(true);
    setSetup(updatedSetup);
    LocalERPDatabase.saveAcademicSetup(updatedSetup);
    try {
      const token = await getCloudToken();
      const response = await fetch('/api/admin/academic-setup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ setup: updatedSetup, auditAction, auditDetail })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Academic Setup could not be saved to the cloud.');
      applyCloudPayload(payload, updatedSetup);
      LocalERPDatabase.addAuditLog(userId, userName, userRole as any, auditAction, 'Academic Config', auditDetail);
      triggerToast('Saved permanently to the school cloud and synchronized across ERP modules.');
      return true;
    } catch (error: any) {
      if (previousSetup) {
        setSetup(previousSetup);
        setEditingProfile({ ...previousSetup.schoolProfile });
        LocalERPDatabase.saveAcademicSetup(previousSetup);
      }
      triggerToast(error?.message || 'Cloud save failed. No confirmed change was kept.', 'error');
      return false;
    } finally {
      setCloudSaving(false);
    }
  };

  const commitDelete = async (
    updatedSetup: MasterAcademicSetup,
    auditAction: string,
    auditDetail: string,
    confirmation: string,
    verifyDeleted: (persisted: MasterAcademicSetup) => boolean,
    additionalCommit?: () => void,
    verifyAdditionalCommit?: () => boolean,
    rollbackAdditionalCommit?: () => void
  ): Promise<boolean> => {
    if (!isHeadmaster) return false;
    const confirmed = await requestConfirmation({
      title: 'Confirm permanent deletion',
      message: confirmation,
      confirmLabel: 'Delete permanently',
      tone: 'rose'
    });
    if (!confirmed) return false;
    const previousSetup = setup;
    const saved = await handleSaveSetup(updatedSetup, auditAction, auditDetail);
    if (!saved) return false;
    try {
      additionalCommit?.();
      const persisted = LocalERPDatabase.getAcademicSetup();
      if (!verifyDeleted(persisted)) throw new Error('The cloud response still contains the selected record.');
      if (verifyAdditionalCommit && !verifyAdditionalCommit()) throw new Error('A linked local compatibility record could not be removed.');
      triggerToast('Deleted permanently from the school cloud.');
      return true;
    } catch (error: any) {
      rollbackAdditionalCommit?.();
      if (previousSetup) LocalERPDatabase.saveAcademicSetup(previousSetup);
      triggerToast(error?.message || 'The linked compatibility cleanup failed.', 'error');
      return false;
    }
  };

  if (!setup || !editingProfile) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-600">Loading master ERP configuration...</p>
      </div>
    );
  }

  // ==========================================
  // 1. SCHOOL PROFILE & PRINT MASTER ACTIONS
  // ==========================================
  const saveSchoolProfile = async () => {
    if (!isHeadmaster || profileSaving || !setup || !editingProfile) return;
    if (!editingProfile.schoolName.trim() || !editingProfile.schoolCode.trim()) {
      triggerToast('School Name and School Code are required.', 'error');
      return;
    }

    setProfileSaving(true);
    try {
      const updated: MasterAcademicSetup = {
        ...setup,
        schoolProfile: { ...editingProfile }
      };
      const saved = await handleSaveSetup(
        updated,
        'UPDATE_SCHOOL_PROFILE',
        `Updated School Profile information for ${editingProfile.schoolName}`
      );
      if (saved) {
        setEditingProfile({ ...updated.schoolProfile });
        window.dispatchEvent(new Event('school_profile_updated'));
      }
    } finally {
      setProfileSaving(false);
    }
  };

  const updatePrintSettings = (field: keyof PrintConfig, value: any) => {
    if (!isHeadmaster) return;
    setSetup({
      ...setup,
      printSettings: {
        ...setup.printSettings,
        [field]: value
      }
    });
  };

  const savePrintSettings = () => {
    if (!isHeadmaster) return;
    handleSaveSetup(setup, 'UPDATE_PRINT_SETTINGS', 'Updated official print, margin, letterhead and QR-code settings.');
  };

  // ==========================================
  // 2. ACADEMIC YEAR ACTIONS
  // ==========================================
  const addAcademicYear = () => {
    if (!isHeadmaster) return;
    const cleaned = newYear.trim();
    if (!cleaned) return;
    
    // Rule 18: Prevent duplicates
    const duplicate = setup.academicYears.some(ay => ay.year.toLowerCase() === cleaned.toLowerCase());
    if (duplicate) {
      triggerToast(`Academic Year "${cleaned}" already exists.`, 'error');
      return;
    }

    const newAY: AcademicYear = {
      id: `ay_${Date.now()}`,
      year: cleaned,
      isActive: false,
      isLocked: false
    };

    const updated = {
      ...setup,
      academicYears: [...setup.academicYears, newAY]
    };
    setNewYear('');
    handleSaveSetup(updated, 'ADD_ACADEMIC_YEAR', `Added new academic year: ${cleaned}`);
  };

  const setActiveAcademicYear = (id: string) => {
    if (!isHeadmaster) return;
    const updatedYears = setup.academicYears.map(ay => ({
      ...ay,
      isActive: ay.id === id
    }));
    const activeYearObj = updatedYears.find(ay => ay.id === id);
    const updated = {
      ...setup,
      academicYears: updatedYears,
      globalSettings: {
        ...setup.globalSettings,
        defaultAcademicYearId: id
      }
    };
    handleSaveSetup(updated, 'SET_ACTIVE_YEAR', `Set Academic Year ${activeYearObj?.year} as Active`);
  };

  const toggleYearLock = (id: string) => {
    if (!isHeadmaster) return;
    const updatedYears = setup.academicYears.map(ay => {
      if (ay.id === id) {
        return { ...ay, isLocked: !ay.isLocked };
      }
      return ay;
    });
    const targetYearObj = updatedYears.find(ay => ay.id === id);
    const updated = {
      ...setup,
      academicYears: updatedYears
    };
    handleSaveSetup(updated, 'TOGGLE_YEAR_LOCK', `Toggled database lock state for ${targetYearObj?.year}`);
  };

  // ==========================================
  // 3. CLASS MASTER ACTIONS
  // ==========================================
  const toggleClassStatus = (id: string) => {
    if (!isHeadmaster) return;
    const updatedClasses = setup.classes.map(c => {
      if (c.id === id) {
        return { ...c, isEnabled: !c.isEnabled };
      }
      return c;
    });
    const updated = {
      ...setup,
      classes: updatedClasses
    };
    handleSaveSetup(updated, 'TOGGLE_CLASS_STATUS', `Enabled/Disabled class in academic registry`);
  };

  // ==========================================
  // 4. DIVISION MASTER ACTIONS
  // ==========================================
  const addDivision = () => {
    if (!isHeadmaster) return;
    const name = newDivision.trim();
    if (!name) return;

    // Rule 18: Prevent duplicates
    if (setup.divisions.some(d => d.divisionName.toLowerCase() === name.toLowerCase())) {
      triggerToast(`Division "${name}" already exists.`, 'error');
      return;
    }

    const newItem: DivisionMasterItem = {
      id: `div_${Date.now()}`,
      divisionName: name,
      isEnabled: true
    };
    const updated = {
      ...setup,
      divisions: [...setup.divisions, newItem]
    };
    setNewDivision('');
    handleSaveSetup(updated, 'ADD_DIVISION', `Added division ${name} to master register`);
  };

  const toggleDivision = (id: string) => {
    if (!isHeadmaster) return;
    const updated = {
      ...setup,
      divisions: setup.divisions.map(d => d.id === id ? { ...d, isEnabled: !d.isEnabled } : d)
    };
    handleSaveSetup(updated, 'TOGGLE_DIVISION', `Toggled division active state`);
  };

  // ==========================================
  // 5. MEDIUM MASTER ACTIONS
  // ==========================================
  const addMedium = () => {
    if (!isHeadmaster) return;
    const name = newMedium.trim();
    if (!name) return;

    if (setup.mediums.some(m => m.mediumName.toLowerCase() === name.toLowerCase())) {
      triggerToast(`Medium "${name}" already exists.`, 'error');
      return;
    }

    const newItem: MediumMasterItem = {
      id: `med_${Date.now()}`,
      mediumName: name,
      isEnabled: true
    };
    const updated = {
      ...setup,
      mediums: [...setup.mediums, newItem]
    };
    setNewMedium('');
    handleSaveSetup(updated, 'ADD_MEDIUM', `Added instruction medium: ${name}`);
  };

  const toggleMedium = (id: string) => {
    if (!isHeadmaster) return;
    const updated = {
      ...setup,
      mediums: setup.mediums.map(m => m.id === id ? { ...m, isEnabled: !m.isEnabled } : m)
    };
    handleSaveSetup(updated, 'TOGGLE_MEDIUM', `Toggled instruction medium status`);
  };

  // ==========================================
  // 6. SUBJECT MASTER & CLASS SUBJECT MAPPING ACTIONS
  // ==========================================
  const saveSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isHeadmaster) return;

    const code = subjectForm.subjectCode.trim().toUpperCase();
    const name = subjectForm.subjectName.trim();
    if (!code || !name) {
      triggerToast("Subject Code and Name are required.", 'error');
      return;
    }

    // Rule 18: Prevent duplicate codes
    const duplicate = setup.subjects.some(s => s.id !== editingSubjectId && s.subjectCode.toUpperCase() === code);
    if (duplicate) {
      triggerToast(`Subject Code "${code}" is already assigned to another subject.`, 'error');
      return;
    }

    let updatedSubjects = [...setup.subjects];
    if (editingSubjectId) {
      updatedSubjects = updatedSubjects.map(s => s.id === editingSubjectId ? { ...s, ...subjectForm, subjectCode: code, subjectName: name } : s);
    } else {
      const newSub: SubjectMasterItem = {
        id: `sub_${Date.now()}`,
        ...subjectForm,
        subjectCode: code,
        subjectName: name
      };
      updatedSubjects.push(newSub);
    }

    const updated = {
      ...setup,
      subjects: updatedSubjects
    };

    // Reset Form
    setEditingSubjectId(null);
    setShowSubjectForm(false);
    setSubjectForm({
      subjectCode: '',
      subjectName: '',
      subjectType: 'Core',
      language: 'None',
      isScholastic: true,
      boardMapping: [],
      classMapping: [],
      maxMarks: 100,
      passingMarks: 35,
      printOrder: 1,
      isActive: true
    });

    handleSaveSetup(updated, 'SAVE_SUBJECT', `Configured subject: ${name} (${code})`);
  };

  const editSubjectTrigger = (sub: SubjectMasterItem) => {
    setEditingSubjectId(sub.id);
    setSubjectForm({
      subjectCode: sub.subjectCode,
      subjectName: sub.subjectName,
      subjectType: sub.subjectType,
      language: sub.language,
      isScholastic: sub.isScholastic,
      boardMapping: sub.boardMapping || [],
      classMapping: sub.classMapping || [],
      maxMarks: sub.maxMarks,
      passingMarks: sub.passingMarks,
      printOrder: sub.printOrder,
      isActive: sub.isActive
    });
    setShowSubjectForm(true);
  };

  const deleteSubject = async (id: string) => {
    if (!isFinalAuthority) { triggerToast('Permanent subject deletion is Headmaster-only. Clerk may edit or deactivate the subject.', 'error'); return; }
    const target = setup.subjects.find(s => s.id === id);
    if (!target) {
      triggerToast('Subject was not found.', 'error');
      return;
    }
    if (cloudInitialized !== true) {
      triggerToast('Import the Academic Setup to the cloud before deleting a subject.', 'error');
      return;
    }

    const timetableMatches = LocalERPDatabase.getTimetable().filter(entry =>
      entry.subject.trim().toLowerCase() === target.subjectName.trim().toLowerCase()
    );
    const allocationCount = (setup.subjectAllocations || []).filter(allocation =>
      allocation.subjectName.trim().toLowerCase() === target.subjectName.trim().toLowerCase()
    ).length;
    const requirementCount = (setup.subjectWeeklyRequirements || []).filter(requirement =>
      requirement.subjectName.trim().toLowerCase() === target.subjectName.trim().toLowerCase()
    ).length;
    const confirmed = await requestConfirmation({
      title: 'Delete subject permanently',
      message: `Delete subject "${target.subjectName}" permanently? This is allowed only when no cloud class mapping, teacher assignment, subject-group or result dependency exists. If the subject is in use, deactivate it instead. Historical result records are never cascade-deleted.`,
      confirmLabel: 'Delete subject',
      tone: 'rose'
    });
    if (!confirmed) return;

    try {
      const token = await getCloudToken();
      const response = await fetch(`/api/admin/academic-setup/subjects/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Subject could not be deleted safely.');

      const updated: MasterAcademicSetup = {
        ...setup,
        subjects: setup.subjects.filter(subject => subject.id !== id),
        subjectGroups: setup.subjectGroups.map(group => ({
          ...group,
          subjectIds: group.subjectIds.filter(subjectId => subjectId !== id)
        })),
        subjectAllocations: (setup.subjectAllocations || []).filter(allocation =>
          allocation.subjectName.trim().toLowerCase() !== target.subjectName.trim().toLowerCase()
        ),
        subjectWeeklyRequirements: (setup.subjectWeeklyRequirements || []).filter(requirement =>
          requirement.subjectName.trim().toLowerCase() !== target.subjectName.trim().toLowerCase()
        )
      };
      const updatedTimetable = LocalERPDatabase.getTimetable().filter(entry =>
        entry.subject.trim().toLowerCase() !== target.subjectName.trim().toLowerCase()
      );
      LocalERPDatabase.saveTimetable(updatedTimetable);
      LocalERPDatabase.saveAcademicSetup(updated);
      setSetup(updated);
      await refreshCloudSetup(false);
      LocalERPDatabase.addAuditLog(
        userId,
        userName,
        userRole as any,
        'DELETE_SUBJECT',
        'Academic Config',
        `Deleted subject ${target.subjectName}; removed ${allocationCount} allocation(s), ${requirementCount} timetable requirement(s), and ${timetableMatches.length} timetable row(s).`
      );
      triggerToast('Subject deleted permanently from the school cloud. Historical result records were retained; no referenced cloud record was cascade-deleted.');
    } catch (error: any) {
      triggerToast(error?.message || 'Subject could not be deleted safely.', 'error');
    }
  };

  // Toggle subject mapping for a specific class
  const toggleSubjectClassMapping = (subjectId: string, className: string) => {
    if (!isHeadmaster) return;
    const updatedSubjects = setup.subjects.map(s => {
      if (s.id === subjectId) {
        const hasClass = s.classMapping.includes(className);
        const newMapping = hasClass 
          ? s.classMapping.filter(c => c !== className)
          : [...s.classMapping, className];
        return { ...s, classMapping: newMapping };
      }
      return s;
    });
    const updated = {
      ...setup,
      subjects: updatedSubjects
    };
    handleSaveSetup(updated, 'UPDATE_CLASS_SUBJECT_MAPPING', `Toggled class subject mapping for ${className}`);
  };

  // ==========================================
  // 7. SUBJECT GROUP ACTIONS
  // ==========================================
  const addSubjectGroup = () => {
    // R2.5.92: Combined Subject Group authority belongs to Headmaster only.
    // Teaching assignments continue to be created subject-by-subject elsewhere.
    if (!isFinalAuthority) return;
    const name = newGroupName.trim();
    if (!name) { triggerToast('Enter a Subject Group name.', 'error'); return; }

    if (setup.subjectGroups.some(g => g.groupName.toLowerCase() === name.toLowerCase())) {
      triggerToast(`Group "${name}" already exists.`, 'error');
      return;
    }
    if (newGroupCombinedPaper && selectedGroupSubjects.length < 2) {
      triggerToast('A Combined Question Paper Group needs at least two Subjects.', 'error');
      return;
    }
    if (!newGroupCombinedPaper && selectedGroupSubjects.length < 1) {
      triggerToast('Select at least one Subject for this group.', 'error');
      return;
    }

    const codeBase = name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 24) || 'GROUP';
    const newGroup: SubjectGroup = {
      id: `grp_${Date.now()}`,
      groupName: name,
      subjectIds: [...selectedGroupSubjects],
      groupCode: newGroupCombinedPaper ? `CQP_${codeBase}`.slice(0, 30) : codeBase.slice(0, 30),
      combinedPaperEnabled: newGroupCombinedPaper
    };

    const updated = {
      ...setup,
      subjectGroups: [...setup.subjectGroups, newGroup]
    };
    setNewGroupName('');
    setSelectedGroupSubjects([]);
    setNewGroupCombinedPaper(true);
    handleSaveSetup(updated, 'ADD_SUBJECT_GROUP', `Created ${newGroupCombinedPaper ? 'Combined Question Paper ' : ''}Subject Group: ${name}`);
  };

  const toggleGroupSubject = (subjectId: string) => {
    setSelectedGroupSubjects(current => current.includes(subjectId)
      ? current.filter(id => id !== subjectId)
      : [...current, subjectId]);
  };

  const deleteSubjectGroup = (id: string) => {
    if (!isFinalAuthority) { triggerToast('Permanent subject-group deletion is Headmaster-only.', 'error'); return; }
    const target = setup.subjectGroups.find(group => group.id === id);
    const updated = { ...setup, subjectGroups: setup.subjectGroups.filter(group => group.id !== id) };
    commitDelete(
      updated,
      'DELETE_SUBJECT_GROUP',
      `Deleted Subject Group: ${target?.groupName || id}`,
      `Delete subject group "${target?.groupName || 'selected group'}"? The subjects themselves will be retained.`,
      persisted => !persisted.subjectGroups.some(group => group.id === id)
    );
  };

  // ==========================================
  // 9. BOARD ACTIONS
  // ==========================================
  const addBoard = () => {
    if (!isHeadmaster) return;
    const name = newBoard.trim();
    if (!name) return;

    if (setup.boards.some(b => b.boardName.toLowerCase() === name.toLowerCase())) {
      triggerToast(`Board "${name}" already exists.`, 'error');
      return;
    }

    const newItem: BoardConfig = {
      id: `board_${Date.now()}`,
      boardName: name,
      isDefault: false,
      isEnabled: true
    };
    const updated = {
      ...setup,
      boards: [...setup.boards, newItem]
    };
    setNewBoard('');
    handleSaveSetup(updated, 'ADD_BOARD', `Added school affiliated board: ${name}`);
  };

  const setDefaultBoard = (id: string) => {
    if (!isHeadmaster) return;
    const updatedBoards = setup.boards.map(b => ({
      ...b,
      isDefault: b.id === id
    }));
    const targetBoard = updatedBoards.find(b => b.id === id);
    const updated = {
      ...setup,
      boards: updatedBoards,
      globalSettings: {
        ...setup.globalSettings,
        defaultBoardId: id
      }
    };
    handleSaveSetup(updated, 'SET_DEFAULT_BOARD', `Set board: ${targetBoard?.boardName} as primary school default`);
  };

  const toggleBoard = (id: string) => {
    if (!isHeadmaster) return;
    const updated = {
      ...setup,
      boards: setup.boards.map(b => b.id === id ? { ...b, isEnabled: !b.isEnabled } : b)
    };
    handleSaveSetup(updated, 'TOGGLE_BOARD', `Toggled board active status`);
  };

  // ==========================================
  // 10. EXAM TERM ACTIONS
  // ==========================================
  const addExamTerm = () => {
    if (!isHeadmaster) return;
    const name = newTerm.trim();
    if (!name) return;

    if (setup.examTerms.some(t => t.termName.toLowerCase() === name.toLowerCase())) {
      triggerToast(`Exam term "${name}" already exists.`, 'error');
      return;
    }

    const newItem: ExamTerm = {
      id: `term_${Date.now()}`,
      termName: name,
      maxMarksWeightage: 10,
      isActive: true
    };
    const updated = {
      ...setup,
      examTerms: [...setup.examTerms, newItem]
    };
    setNewTerm('');
    handleSaveSetup(updated, 'ADD_EXAM_TERM', `Added exam term schedule parameter: ${name}`);
  };

  const toggleExamTerm = async (id: string) => {
    if (!isHeadmaster || cloudSaving) return;
    const term = setup.examTerms.find(t => t.id === id);
    if (!term) return;
    if (cloudInitialized !== true) {
      triggerToast('Import/refresh the permanent Academic Setup before changing a term.', 'error');
      return;
    }
    const desired = !term.isActive;
    setCloudSaving(true);
    try {
      const token = await getCloudToken();
      const response = await fetch(`/api/admin/academic-setup/exam-terms/${encodeURIComponent(id)}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isActive: desired, termName: term.termName })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Academic Term status could not be changed.');
      const updated = {
        ...setup,
        examTerms: setup.examTerms.map(item => item.id === id ? { ...item, isActive: desired } : item)
      };
      setSetup(updated);
      LocalERPDatabase.saveAcademicSetup(updated);
      LocalERPDatabase.addAuditLog(userId, userName, userRole as any, desired ? 'ACTIVATE_EXAM_TERM' : 'DISABLE_EXAM_TERM', 'Academic Config', `${desired ? 'Activated' : 'Disabled'} exam term: ${term.termName}`);
      await refreshCloudSetup(false);
      triggerToast(`${term.termName} ${desired ? 'activated' : 'disabled'} successfully.`);
    } catch (error: any) {
      triggerToast(error?.message || 'Academic Term status could not be changed.', 'error');
    } finally {
      setCloudSaving(false);
    }
  };

  // ==========================================
  // 11. GRADE SCALE ACTIONS
  // ==========================================
  const addGradeScale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isHeadmaster) return;

    if (!gradeForm.gradeName.trim()) {
      triggerToast("Grade name is required.", 'error');
      return;
    }

    const newItem: GradeScaleItem = {
      id: `grade_${Date.now()}`,
      ...gradeForm,
      gradeName: gradeForm.gradeName.trim().toUpperCase(),
      systemGroup: selectedGradingGroup
    };

    const updated = {
      ...setup,
      gradeScales: [...setup.gradeScales, newItem].sort((a, b) => b.minPercentage - a.minPercentage)
    };

    // Reset Form
    setGradeForm({
      gradeName: '',
      minPercentage: 0,
      maxPercentage: 100,
      gradePoints: 0,
      remarks: ''
    });

    handleSaveSetup(updated, 'ADD_GRADE_SCALE', `Added Grade level: ${newItem.gradeName}`);
  };

  const deleteGradeScale = (id: string) => {
    if (!isFinalAuthority) { triggerToast('Permanent grading-rule deletion is Headmaster-only.', 'error'); return; }
    const target = setup.gradeScales.find(grade => grade.id === id);
    const updated = { ...setup, gradeScales: setup.gradeScales.filter(grade => grade.id !== id) };
    commitDelete(
      updated,
      'DELETE_GRADE_SCALE',
      `Removed Grade configuration: ${target?.gradeName || id}`,
      `Delete grade configuration "${target?.gradeName || 'selected grade'}"?`,
      persisted => !persisted.gradeScales.some(grade => grade.id === id)
    );
  };

  // ==========================================
  // 12 & 13. SCHOOL TIMING & PERIOD MASTER ACTIONS
  // ==========================================
  const saveSchoolTiming = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isHeadmaster) return;
    const updated = {
      ...setup,
      schoolTiming: { ...setup.schoolTiming, dayOverrides }
    };
    handleSaveSetup(updated, 'SAVE_SCHOOL_TIMING', "Updated daily school sessions timings and prayer break rules");
  };

  const updateTimingField = (field: keyof SchoolTiming, value: any) => {
    if (!isHeadmaster) return;
    setSetup({
      ...setup,
      schoolTiming: {
        ...setup.schoolTiming,
        [field]: value
      }
    });
  };

  const toggleWorkingDay = (day: string) => {
    if (!isHeadmaster) return;
    const currentDays = setup.schoolTiming.workingDays;
    const updatedDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];
    updateTimingField('workingDays', updatedDays);
  };

  const addPeriod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isHeadmaster) return;

    if (!periodForm.periodName.trim()) {
      triggerToast("Period Name is required", 'error');
      return;
    }

    const newItem: PeriodConfig = {
      id: `p_${Date.now()}`,
      ...periodForm,
      periodName: periodForm.periodName.trim()
    };

    const updated = {
      ...setup,
      periods: [...setup.periods, newItem].sort((a, b) => {
        // Simple sort by period number, break periods sort last or first
        if (a.periodNumber === 0 && b.periodNumber !== 0) return -1;
        if (b.periodNumber === 0 && a.periodNumber !== 0) return 1;
        return a.periodNumber - b.periodNumber;
      })
    };

    // Reset Form
    setPeriodForm({
      periodName: '',
      periodNumber: setup.periods.length + 1,
      startTime: '08:15 AM',
      endTime: '09:00 AM',
      durationMinutes: 45,
      type: 'Lecture'
    });

    handleSaveSetup(updated, 'ADD_PERIOD_SLOT', `Added period slot: ${newItem.periodName}`);
  };

  const deletePeriod = (id: string) => {
    if (!isFinalAuthority) { triggerToast('Permanent period deletion is Headmaster-only.', 'error'); return; }
    const target = setup.periods.find(period => period.id === id);
    const updated = { ...setup, periods: setup.periods.filter(period => period.id !== id) };
    commitDelete(
      updated,
      'DELETE_PERIOD',
      `Removed period session slot: ${target?.periodName || id}`,
      `Delete period "${target?.periodName || 'selected period'}"?`,
      persisted => !persisted.periods.some(period => period.id === id)
    );
  };

  // ==========================================
  // 14. HOLIDAY MASTER ACTIONS
  // ==========================================
  const addHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isHeadmaster) return;

    if (!holidayForm.holidayName.trim() || !holidayForm.startDate) {
      triggerToast("Holiday name and start date are required", 'error');
      return;
    }

    const newItem: HolidayItem = {
      id: `h_${Date.now()}`,
      ...holidayForm,
      holidayName: holidayForm.holidayName.trim()
    };

    const updated = {
      ...setup,
      holidays: [...setup.holidays, newItem].sort((a, b) => a.startDate.localeCompare(b.startDate))
    };

    setHolidayForm({
      holidayName: '',
      startDate: '',
      endDate: '',
      holidayType: 'School',
      description: ''
    });

    handleSaveSetup(updated, 'ADD_HOLIDAY_SCHEDULE', `Declared holiday: ${newItem.holidayName}`);
  };

  const deleteHoliday = (id: string) => {
    if (!isFinalAuthority) { triggerToast('Permanent holiday deletion is Headmaster-only.', 'error'); return; }
    const target = setup.holidays.find(holiday => holiday.id === id);
    const updated = { ...setup, holidays: setup.holidays.filter(holiday => holiday.id !== id) };
    commitDelete(
      updated,
      'DELETE_HOLIDAY',
      `Deleted declared holiday: ${target?.holidayName || id}`,
      `Delete holiday "${target?.holidayName || 'selected holiday'}"?`,
      persisted => !persisted.holidays.some(holiday => holiday.id === id)
    );
  };

  // ==========================================
  // 15. DOCUMENT CONFIG ACTIONS
  // ==========================================
  const addDocument = () => {
    if (!isHeadmaster) return;
    const name = newDocumentName.trim();
    if (!name) return;

    if (setup.documents.some(d => d.documentName.toLowerCase() === name.toLowerCase())) {
      triggerToast(`Document checklist item "${name}" already exists.`, 'error');
      return;
    }

    const newItem: DocumentConfig = {
      id: `doc_${Date.now()}`,
      documentName: name,
      isRequired: newDocumentRequired
    };

    const updated = {
      ...setup,
      documents: [...setup.documents, newItem]
    };
    setNewDocumentName('');
    handleSaveSetup(updated, 'ADD_DOCUMENT_MASTER', `Added required admission document: ${name}`);
  };

  const toggleDocumentRequired = (id: string) => {
    if (!isHeadmaster) return;
    const updated = {
      ...setup,
      documents: setup.documents.map(d => d.id === id ? { ...d, isRequired: !d.isRequired } : d)
    };
    handleSaveSetup(updated, 'TOGGLE_DOCUMENT_REQ', `Toggled document requirement status`);
  };

  const deleteDocument = (id: string) => {
    if (!isFinalAuthority) { triggerToast('Permanent document-checklist deletion is Headmaster-only.', 'error'); return; }
    const target = setup.documents.find(document => document.id === id);
    const updated = { ...setup, documents: setup.documents.filter(document => document.id !== id) };
    commitDelete(
      updated,
      'DELETE_DOCUMENT_CONFIG',
      `Deleted admission checklist requirement: ${target?.documentName || id}`,
      `Delete document requirement "${target?.documentName || 'selected item'}"? Existing uploaded student documents will not be deleted.`,
      persisted => !persisted.documents.some(document => document.id === id)
    );
  };

  // ==========================================
  // 17. GLOBAL SETTINGS ACTIONS
  // ==========================================
  const updateGlobalSetting = (field: keyof GlobalERPSettings, value: any) => {
    if (!isHeadmaster) return;
    setSetup({
      ...setup,
      globalSettings: {
        ...setup.globalSettings,
        [field]: value
      }
    });
  };

  const saveGlobalSettings = () => {
    if (!isHeadmaster) return;
    handleSaveSetup(setup, 'UPDATE_GLOBAL_SETTINGS', 'Updated school-wide ERP defaults and registration rules.');
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md overflow-hidden max-w-full font-sans" data-academic-category={activeCategory} data-focused-mode={focusedMode ? 'true' : 'false'}>
      {confirmationDialog && (
        <div
          className="fixed inset-0 z-[250] bg-slate-950/55 backdrop-blur-[1px] flex items-center justify-center p-4 no-print"
          role="dialog"
          aria-modal="true"
          aria-labelledby="academic-confirm-title"
          onClick={() => answerConfirmation(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl p-5 sm:p-6"
            onClick={event => event.stopPropagation()}
          >
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-4 ${confirmationDialog.tone === 'rose' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
              {confirmationDialog.tone === 'rose' ? <Trash2 className="w-5 h-5" /> : <UploadCloud className="w-5 h-5" />}
            </div>
            <h3 id="academic-confirm-title" className="text-lg font-black text-slate-900">{confirmationDialog.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{confirmationDialog.message}</p>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => answerConfirmation(false)}
                className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => answerConfirmation(true)}
                className={`px-4 py-3 rounded-xl text-white text-sm font-black shadow-sm cursor-pointer ${confirmationDialog.tone === 'rose' ? 'bg-rose-600' : 'bg-amber-600'}`}
              >
                {confirmationDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Module Title Section */}
      <div className="bg-slate-900 text-white p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-400" />
            <span className="text-[10px] font-extrabold text-blue-400 uppercase tracking-widest">Master Module Setup</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold font-sans tracking-tight">{focusedTitle || 'School Configuration & Academic Setup'}</h2>
          <p className="text-xs text-slate-400 font-sans max-w-xl">
            {focusedMode ? 'Only the selected Academic Setup feature is open. Other setup pages remain hidden until selected from the main menu.' : 'Configure school metadata, terms, custom divisions, instruction mediums, subject mappings, grading algorithms, school hours, and calendar holidays.'}
          </p>
        </div>
        
        {/* Status Indicators */}
        <div className="flex items-center gap-3 bg-slate-800/80 border border-slate-700/60 px-4 py-2.5 rounded-xl text-xs no-print">
          <Shield className="w-4 h-4 text-emerald-400" />
          <div>
            <div className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Security Clearance</div>
            <div className="font-bold text-slate-200">
              {userRole === 'clerk' ? `${userName} (Clerk Delegated Setup Access)` : (isHeadmaster ? 'Headmaster (Write Access)' : `${userName} (Read Only)`) }
            </div>
          </div>
        </div>
      </div>

      {/* Permanent cloud state */}
      <div className="mx-6 md:mx-8 mt-5 no-print">
        {cloudLoading ? (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 flex items-center gap-3 text-blue-900">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
            <div>
              <div className="text-xs font-black">Checking permanent Academic Setup cloud</div>
              <div className="text-[11px] text-blue-700">The browser copy is not treated as authoritative while this check is running.</div>
            </div>
          </div>
        ) : cloudLoadError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-900">
            <div className="flex items-start gap-3">
              <CloudOff className="w-5 h-5 mt-0.5 text-rose-600" />
              <div>
                <div className="text-xs font-black">Cloud connection needs attention</div>
                <div className="text-[11px] text-rose-700">{cloudLoadError}</div>
              </div>
            </div>
            <button type="button" onClick={() => void refreshCloudSetup(true)} className="px-3 py-2 rounded-xl bg-white border border-rose-200 text-xs font-black text-rose-700 cursor-pointer">
              Retry
            </button>
          </div>
        ) : cloudInitialized === true ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-emerald-950">
            <div className="flex items-start gap-3">
              <Cloud className="w-5 h-5 mt-0.5 text-emerald-600" />
              <div>
                <div className="text-xs font-black">Permanent cloud setup active {cloudSaving ? '— saving…' : ''}</div>
                <div className="text-[11px] text-emerald-700">
                  {cloudSummary.academicYears || 0} year(s) · {cloudSummary.classes || 0} class(es) · {cloudSummary.subjects || 0} subject(s) · {cloudSummary.terms || 0} term(s)
                </div>
              </div>
            </div>
            <button type="button" onClick={() => void refreshCloudSetup(true)} disabled={cloudSaving} className="px-3 py-2 rounded-xl bg-white border border-emerald-200 text-xs font-black text-emerald-700 cursor-pointer disabled:opacity-50">
              Refresh cloud
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-amber-950">
            <div className="flex items-start gap-3">
              <Database className="w-5 h-5 mt-0.5 text-amber-600" />
              <div>
                <div className="text-sm font-black">One-time cloud connection required</div>
                <div className="text-[11px] leading-5 text-amber-800 max-w-2xl">
                  Your current Academic Setup is still available in this browser. Copy it once to Supabase so every authorized device uses the same school setup. Existing users, passwords, students, staff, plans and subscriptions are not changed.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void importExistingSetup()}
              disabled={!isFinalAuthority || cloudImporting}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-black shadow-sm cursor-pointer disabled:opacity-50"
            >
              {cloudImporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
              {cloudImporting ? 'Copying safely…' : 'Copy existing setup to cloud'}
            </button>
          </div>
        )}
      </div>

      {/* Toast Notification Boxes */}
      {successMsg && (
        <div className="mx-6 md:mx-8 mt-4 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-2 animate-fade-in no-print text-xs font-semibold">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="mx-6 md:mx-8 mt-4 bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-center gap-2 animate-fade-in no-print text-xs font-semibold">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Category Tabs (No-Print) */}
      {!focusedMode && (
      <div className="flex border-b border-slate-200 overflow-x-auto no-print bg-slate-50 scrollbar-none">
        <button
          onClick={() => setActiveCategory('profile')}
          className={`flex items-center gap-1.5 px-4 py-3 text-xs font-extrabold border-b-2 transition-all shrink-0 cursor-pointer ${
            activeCategory === 'profile' 
              ? 'border-blue-600 text-blue-700 bg-white' 
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
          }`}
        >
          <School className="w-3.5 h-3.5" />
          <span>🏫 School Profile</span>
        </button>
        <button
          onClick={() => setActiveCategory('academic_year')}
          className={`flex items-center gap-1.5 px-4 py-3 text-xs font-extrabold border-b-2 transition-all shrink-0 cursor-pointer ${
            activeCategory === 'academic_year' 
              ? 'border-blue-600 text-blue-700 bg-white' 
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>📚 Academic Year</span>
        </button>
        <button
          onClick={() => setActiveCategory('school_info')}
          className={`flex items-center gap-1.5 px-4 py-3 text-xs font-extrabold border-b-2 transition-all shrink-0 cursor-pointer ${
            activeCategory === 'school_info' 
              ? 'border-blue-600 text-blue-700 bg-white' 
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
          }`}
        >
          <Info className="w-3.5 h-3.5" />
          <span>🏛 School Info</span>
        </button>
        <button
          onClick={() => setActiveCategory('classes_divisions')}
          className={`flex items-center gap-1.5 px-4 py-3 text-xs font-extrabold border-b-2 transition-all shrink-0 cursor-pointer ${
            activeCategory === 'classes_divisions' 
              ? 'border-blue-600 text-blue-700 bg-white' 
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>🏫 Classes & Divisions</span>
        </button>
        <button
          onClick={() => setActiveCategory('subjects')}
          className={`flex items-center gap-1.5 px-4 py-3 text-xs font-extrabold border-b-2 transition-all shrink-0 cursor-pointer ${
            activeCategory === 'subjects' 
              ? 'border-blue-600 text-blue-700 bg-white' 
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>📖 Subject Management</span>
        </button>
        <button
          onClick={() => setActiveCategory('grading')}
          className={`flex items-center gap-1.5 px-4 py-3 text-xs font-extrabold border-b-2 transition-all shrink-0 cursor-pointer ${
            activeCategory === 'grading' 
              ? 'border-blue-600 text-blue-700 bg-white' 
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>🎓 Grading System</span>
        </button>
        <button
          onClick={() => setActiveCategory('timing')}
          className={`flex items-center gap-1.5 px-4 py-3 text-xs font-extrabold border-b-2 transition-all shrink-0 cursor-pointer ${
            activeCategory === 'timing' 
              ? 'border-blue-600 text-blue-700 bg-white' 
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>⏰ School Timing</span>
        </button>
        <button
          onClick={() => setActiveCategory('docs')}
          className={`flex items-center gap-1.5 px-4 py-3 text-xs font-extrabold border-b-2 transition-all shrink-0 cursor-pointer ${
            activeCategory === 'docs' 
              ? 'border-blue-600 text-blue-700 bg-white' 
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>📄 Document Settings</span>
        </button>
        <button
          onClick={() => setActiveCategory('print')}
          className={`flex items-center gap-1.5 px-4 py-3 text-xs font-extrabold border-b-2 transition-all shrink-0 cursor-pointer ${
            activeCategory === 'print' 
              ? 'border-blue-600 text-blue-700 bg-white' 
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
          }`}
        >
          <Printer className="w-3.5 h-3.5" />
          <span>🖨 Print Settings</span>
        </button>
        <button
          onClick={() => setActiveCategory('erp_settings')}
          className={`flex items-center gap-1.5 px-4 py-3 text-xs font-extrabold border-b-2 transition-all shrink-0 cursor-pointer ${
            activeCategory === 'erp_settings' 
              ? 'border-blue-600 text-blue-700 bg-white' 
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>⚙ ERP Settings</span>
        </button>

      </div>
      )}

      {/* Active Tab Workspace Container */}
      <div className="p-6 md:p-8 space-y-8">

        {/* =================================================================================== */}
        {/* CATEGORY 1: SCHOOL PROFILE & PRINTING SETTINGS                                      */}
        {/* =================================================================================== */}
        {activeCategory === 'profile' && (
          <div className="space-y-8">
            {/* School Profile Section */}
            <div className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-6 space-y-6">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                <School className="w-4 text-blue-600 h-4" />
                <h3 className="text-sm font-bold text-slate-800">🏫 School Profile Master</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">School Name</label>
                  <input
                    type="text"
                    disabled={!isHeadmaster}
                    value={editingProfile.schoolName}
                    onChange={(e) => setEditingProfile({ ...editingProfile, schoolName: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white disabled:bg-slate-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Management Society Name</label>
                  <input
                    type="text"
                    disabled={!isHeadmaster}
                    value={editingProfile.managementName}
                    onChange={(e) => setEditingProfile({ ...editingProfile, managementName: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">UDISE Code</label>
                  <input
                    type="text"
                    disabled={!isHeadmaster}
                    value={editingProfile.udiseCode}
                    onChange={(e) => setEditingProfile({ ...editingProfile, udiseCode: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">School Code</label>
                  <input
                    type="text"
                    disabled={!isHeadmaster}
                    value={editingProfile.schoolCode}
                    onChange={(e) => setEditingProfile({ ...editingProfile, schoolCode: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Street Address</label>
                  <input
                    type="text"
                    disabled={!isHeadmaster}
                    value={editingProfile.address}
                    onChange={(e) => setEditingProfile({ ...editingProfile, address: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Village / City</label>
                  <input
                    type="text"
                    disabled={!isHeadmaster}
                    value={editingProfile.villageCity}
                    onChange={(e) => setEditingProfile({ ...editingProfile, villageCity: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Taluka / Sub-District</label>
                  <input
                    type="text"
                    disabled={!isHeadmaster}
                    value={editingProfile.taluka}
                    onChange={(e) => setEditingProfile({ ...editingProfile, taluka: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">District</label>
                  <input
                    type="text"
                    disabled={!isHeadmaster}
                    value={editingProfile.district}
                    onChange={(e) => setEditingProfile({ ...editingProfile, district: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">State</label>
                  <input
                    type="text"
                    disabled={!isHeadmaster}
                    value={editingProfile.state}
                    onChange={(e) => setEditingProfile({ ...editingProfile, state: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">PIN Code</label>
                  <input
                    type="text"
                    disabled={!isHeadmaster}
                    value={editingProfile.pinCode}
                    onChange={(e) => setEditingProfile({ ...editingProfile, pinCode: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Contact Numbers</label>
                  <input
                    type="text"
                    disabled={!isHeadmaster}
                    value={editingProfile.phoneNumbers}
                    onChange={(e) => setEditingProfile({ ...editingProfile, phoneNumbers: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">WhatsApp Number</label>
                  <input
                    type="text"
                    disabled={!isHeadmaster}
                    value={editingProfile.whatsAppNumber}
                    onChange={(e) => setEditingProfile({ ...editingProfile, whatsAppNumber: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Email</label>
                  <input
                    type="email"
                    disabled={!isHeadmaster}
                    value={editingProfile.email}
                    onChange={(e) => setEditingProfile({ ...editingProfile, email: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Website</label>
                  <input
                    type="text"
                    disabled={!isHeadmaster}
                    value={editingProfile.website}
                    onChange={(e) => setEditingProfile({ ...editingProfile, website: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Principal / HM Name</label>
                  <input
                    type="text"
                    disabled={!isHeadmaster}
                    value={editingProfile.principalName}
                    onChange={(e) => setEditingProfile({ ...editingProfile, principalName: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                  />
                </div>
              </div>

              {/* Graphic Assets Upload Manager */}
              <div className="border-t border-slate-200/80 pt-6">
                <h4 className="text-xs font-bold text-slate-700 mb-4 uppercase tracking-wider">Official School Graphic Assets & Verification Stamps</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  
                  {/* Logo */}
                  <div className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-between text-center space-y-3 relative group hover:border-blue-400 transition-all">
                    <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wide">School Logo</span>
                    <div className="w-16 h-16 rounded-xl border border-slate-100 p-2 bg-slate-50 flex items-center justify-center overflow-hidden">
                      {editingProfile.schoolLogo ? (
                        <img src={editingProfile.schoolLogo} alt="Logo" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                      ) : (
                        <School className="w-8 h-8 text-slate-300" />
                      )}
                    </div>
                    {isHeadmaster && (
                      <label className="w-full">
                        <span className="block w-full text-center py-1 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 hover:border-blue-200 text-[10px] font-bold rounded-lg cursor-pointer transition-all">
                          Upload File
                        </span>
                        <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'schoolLogo')} className="hidden" />
                      </label>
                    )}
                  </div>

                  {/* School Building Photo */}
                  <div className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-between text-center space-y-3 relative group hover:border-blue-400 transition-all">
                    <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wide">School Building</span>
                    <div className="w-16 h-16 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-center overflow-hidden">
                      {editingProfile.schoolBuildingPhoto ? (
                        <img src={editingProfile.schoolBuildingPhoto} alt="Building" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full bg-slate-150 flex items-center justify-center text-slate-400 text-[9px] font-semibold">No Image</div>
                      )}
                    </div>
                    {isHeadmaster && (
                      <label className="w-full">
                        <span className="block w-full text-center py-1 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 hover:border-blue-200 text-[10px] font-bold rounded-lg cursor-pointer transition-all">
                          Upload File
                        </span>
                        <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'schoolBuildingPhoto')} className="hidden" />
                      </label>
                    )}
                  </div>

                  {/* Official School Seal */}
                  <div className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-between text-center space-y-3 relative group hover:border-blue-400 transition-all">
                    <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wide">Official School Seal</span>
                    <div className="w-16 h-16 rounded-xl border border-slate-100 p-2 bg-slate-50 flex items-center justify-center overflow-hidden">
                      {editingProfile.schoolSeal ? (
                        <img src={editingProfile.schoolSeal} alt="Seal" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="text-slate-300 text-xs font-bold font-mono">SEAL</div>
                      )}
                    </div>
                    {isHeadmaster && (
                      <label className="w-full">
                        <span className="block w-full text-center py-1 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 hover:border-blue-200 text-[10px] font-bold rounded-lg cursor-pointer transition-all">
                          Upload File
                        </span>
                        <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'schoolSeal')} className="hidden" />
                      </label>
                    )}
                  </div>

                  {/* Headmaster Signature */}
                  <div className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-between text-center space-y-3 relative group hover:border-blue-400 transition-all">
                    <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wide">Headmaster Signature</span>
                    <div className="w-16 h-16 rounded-xl border border-slate-100 p-1 bg-slate-50 flex items-center justify-center overflow-hidden">
                      {editingProfile.headmasterSignature ? (
                        <img src={editingProfile.headmasterSignature} alt="HM Sig" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="text-slate-300 text-[10px] font-bold italic font-serif">Sign</div>
                      )}
                    </div>
                    {isHeadmaster && (
                      <label className="w-full">
                        <span className="block w-full text-center py-1 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 hover:border-blue-200 text-[10px] font-bold rounded-lg cursor-pointer transition-all">
                          Upload File
                        </span>
                        <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'headmasterSignature')} className="hidden" />
                      </label>
                    )}
                  </div>

                </div>
              </div>

              {isHeadmaster && (
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => void saveSchoolProfile()}
                    disabled={profileSaving}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 shadow-sm cursor-pointer transition-all hover:shadow"
                  >
                    <Save className="w-4 h-4" />
                    <span>{profileSaving ? 'Saving to Live Database…' : 'Save School Profile'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =================================================================================== */}
        {/* CATEGORY 9: PRINT CONFIGURATIONS                                                    */}
        {/* =================================================================================== */}
        {activeCategory === 'print' && (
          <div className="space-y-8 animate-fade-in">
            <div className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-6 space-y-6">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                <Printer className="w-4 text-purple-600 h-4" />
                <h3 className="text-sm font-bold text-slate-800">🖨 Official Print & Report Card Layout Settings</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Paper Size</label>
                  <select
                    disabled={!isHeadmaster}
                    value={setup.printSettings.paperSize}
                    onChange={(e) => updatePrintSettings('paperSize', e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none"
                  >
                    <option value="A4">Standard A4 Sheet</option>
                    <option value="A3">Large A3 Ledger</option>
                    <option value="Letter">US Letter</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Default Layout Orientation</label>
                  <select
                    disabled={!isHeadmaster}
                    value={setup.printSettings.orientation}
                    onChange={(e) => updatePrintSettings('orientation', e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none"
                  >
                    <option value="Portrait">Portrait (Standard Reports)</option>
                    <option value="Landscape">Landscape (Timetable/Certificates)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Watermark Draft Text</label>
                  <input
                    type="text"
                    disabled={!isHeadmaster}
                    value={setup.printSettings.watermarkText}
                    onChange={(e) => updatePrintSettings('watermarkText', e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">School Logo Position</label>
                  <select
                    disabled={!isHeadmaster}
                    value={setup.printSettings.logoPosition}
                    onChange={(e) => updatePrintSettings('logoPosition', e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none"
                  >
                    <option value="Left">Left Aligned</option>
                    <option value="Center">Center Centered</option>
                    <option value="Right">Right Aligned</option>
                    <option value="None">Hide Logo on Prints</option>
                  </select>
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Top Margin (mm)</label>
                  <input
                    type="number"
                    disabled={!isHeadmaster}
                    value={setup.printSettings.marginTop}
                    onChange={(e) => updatePrintSettings('marginTop', parseInt(e.target.value))}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Bottom Margin (mm)</label>
                  <input
                    type="number"
                    disabled={!isHeadmaster}
                    value={setup.printSettings.marginBottom}
                    onChange={(e) => updatePrintSettings('marginBottom', parseInt(e.target.value))}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Left Margin (mm)</label>
                  <input
                    type="number"
                    disabled={!isHeadmaster}
                    value={setup.printSettings.marginLeft}
                    onChange={(e) => updatePrintSettings('marginLeft', parseInt(e.target.value))}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Right Margin (mm)</label>
                  <input
                    type="number"
                    disabled={!isHeadmaster}
                    value={setup.printSettings.marginRight}
                    onChange={(e) => updatePrintSettings('marginRight', parseInt(e.target.value))}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-6 pt-2 border-t border-slate-200/80 pt-4">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600">
                  <input
                    type="checkbox"
                    disabled={!isHeadmaster}
                    checked={setup.printSettings.showHeader}
                    onChange={(e) => updatePrintSettings('showHeader', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300"
                  />
                  <span>Show Official School Letterhead</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600">
                  <input
                    type="checkbox"
                    disabled={!isHeadmaster}
                    checked={setup.printSettings.showFooter}
                    onChange={(e) => updatePrintSettings('showFooter', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300"
                  />
                  <span>Show Signature Line & Verification Footer</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600">
                  <input
                    type="checkbox"
                    disabled={!isHeadmaster}
                    checked={setup.printSettings.enableQRCode}
                    onChange={(e) => updatePrintSettings('enableQRCode', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300"
                  />
                  <span>Generate Verification QR-Code on Certificates</span>
                </label>
              </div>

              {isHeadmaster && (
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={savePrintSettings}
                    disabled={cloudSaving || cloudInitialized !== true}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    Save Print Settings
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =================================================================================== */}
        {/* CATEGORY 2: ACADEMIC CORE MASTER (YEARS, CLASSES, DIVISIONS, MEDIUMS, BOARDS, GLOBAL) */}
        {/* =================================================================================== */}
        {activeCategory === 'academic_year' && (
          <div className="space-y-8 animate-fade-in">
            {/* Academic Year master list */}
            <div className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 text-emerald-600 h-4" />
                  <h3 className="text-sm font-bold text-slate-800">📚 Academic Year Registry</h3>
                </div>
                {isHeadmaster && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. 2027-28"
                      value={newYear}
                      onChange={(e) => setNewYear(e.target.value)}
                      className="text-xs px-2.5 py-1 border border-slate-300 rounded-lg bg-white"
                    />
                    <button
                      onClick={addAcademicYear}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Year</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold">
                      <th className="py-2">Academic Year</th>
                      <th className="py-2">Active Status</th>
                      <th className="py-2">Registry Database State</th>
                      <th className="py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {setup.academicYears.map((ay) => (
                      <tr key={ay.id} className="hover:bg-slate-100/50">
                        <td className="py-3 font-bold text-slate-800">{ay.year}</td>
                        <td className="py-3">
                          {ay.isActive ? (
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[10px]">
                              ● ACTIVE MASTER YEAR
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full font-bold text-[10px]">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-3">
                          {ay.isLocked ? (
                            <span className="text-rose-600 flex items-center gap-1 font-semibold text-[11px]">
                              <Lock className="w-3 h-3" /> Read-Only Record (Locked)
                            </span>
                          ) : (
                            <span className="text-emerald-600 flex items-center gap-1 font-semibold text-[11px]">
                              <Unlock className="w-3 h-3" /> Editable Session (Unlocked)
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-right space-x-1.5">
                          {isHeadmaster && (
                            <>
                              {!ay.isActive && (
                                <button
                                  onClick={() => setActiveAcademicYear(ay.id)}
                                  className="text-[10px] bg-white border border-slate-300 hover:bg-slate-50 text-blue-600 font-bold px-2 py-1 rounded cursor-pointer"
                                >
                                  Activate
                                </button>
                              )}
                              <button
                                onClick={() => toggleYearLock(ay.id)}
                                className={`text-[10px] font-bold px-2 py-1 rounded cursor-pointer ${
                                  ay.isLocked 
                                    ? 'bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700' 
                                    : 'bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700'
                                }`}
                              >
                                {ay.isLocked ? 'Unlock' : 'Lock Database'}
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeCategory === 'school_info' && (
          <div className="space-y-8 animate-fade-in">
            {/* School Registration Details */}
            {(!focusedMode || focusedFeatureId !== 'medium-language-settings') && (<>
            <div className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <Info className="w-4 text-blue-600 h-4" />
                  <h3 className="text-sm font-bold text-slate-800">🏛 Affiliations, Board & Medium Masters</h3>
                </div>
                {isHeadmaster && (
                  <button
                    onClick={() => void saveSchoolProfile()}
                    disabled={profileSaving}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer transition-all hover:shadow"
                  >
                    <Save className="w-3 h-3" />
                    <span>Save School Information</span>
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Primary Education Medium</label>
                  <input
                    type="text"
                    disabled={!isHeadmaster}
                    value={editingProfile.primaryMedium ?? "Marathi / Semi-English Medium"}
                    onChange={(e) => setEditingProfile({ ...editingProfile, primaryMedium: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white disabled:bg-slate-100"
                    placeholder="e.g. Marathi / Semi-English Medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Secondary Education Medium</label>
                  <input
                    type="text"
                    disabled={!isHeadmaster}
                    value={editingProfile.secondaryMedium ?? "Urdu Medium / English Medium"}
                    onChange={(e) => setEditingProfile({ ...editingProfile, secondaryMedium: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white disabled:bg-slate-100"
                    placeholder="e.g. Urdu Medium / English Medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Recognized Registration Number</label>
                  <input
                    type="text"
                    disabled={!isHeadmaster}
                    value={editingProfile.regNumber ?? "NS/TLD-9034/1984"}
                    onChange={(e) => setEditingProfile({ ...editingProfile, regNumber: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white disabled:bg-slate-100"
                    placeholder="e.g. NS/TLD-9034/1984"
                  />
                </div>
              </div>
            </div>

            </>)}
            {/* Mediums & Education Boards configuration side-by-side */}
            <div className={focusedMode && focusedFeatureId === 'medium-language-settings' ? "grid grid-cols-1 gap-6" : "grid grid-cols-1 md:grid-cols-2 gap-6"}>
              {/* Mediums config */}
              <div className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h4 className="text-xs font-bold text-slate-800">Mediums of Instruction</h4>
                  {isHeadmaster && (
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Medium Name"
                        value={newMedium}
                        onChange={(e) => setNewMedium(e.target.value)}
                        className="text-[10px] w-28 px-2 py-1 border border-slate-300 rounded bg-white"
                      />
                      <button onClick={addMedium} className="bg-blue-600 hover:bg-blue-700 text-white p-1 rounded cursor-pointer">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {setup.mediums.map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-2 bg-white border border-slate-100 rounded-lg text-xs font-sans">
                      <span className="font-bold text-slate-700">{m.mediumName} Medium</span>
                      <button
                        disabled={!isHeadmaster}
                        onClick={() => toggleMedium(m.id)}
                        className={`text-[9px] font-bold px-2 py-0.5 rounded cursor-pointer ${
                          m.isEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {m.isEnabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Boards Affiliation Config */}
              {(!focusedMode || focusedFeatureId !== 'medium-language-settings') && (<>
              <div className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h4 className="text-xs font-bold text-slate-800">Education Board Configurations</h4>
                  {isHeadmaster && (
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Board name"
                        value={newBoard}
                        onChange={(e) => setNewBoard(e.target.value)}
                        className="text-[10px] w-28 px-2 py-1 border border-slate-300 rounded bg-white"
                      />
                      <button onClick={addBoard} className="bg-blue-600 hover:bg-blue-700 text-white p-1 rounded cursor-pointer">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {setup.boards.map((b) => (
                    <div key={b.id} className="p-2.5 bg-white border border-slate-100 rounded-lg text-xs font-sans space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700">{b.boardName}</span>
                        <div className="flex items-center gap-1">
                          <button
                            disabled={!isHeadmaster}
                            onClick={() => toggleBoard(b.id)}
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded cursor-pointer ${
                              b.isEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {b.isEnabled ? 'Active' : 'Disabled'}
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-[10px]">
                        {b.isDefault ? (
                          <span className="font-extrabold text-blue-600 uppercase tracking-wide">★ Default Board</span>
                        ) : (
                          b.isEnabled && isHeadmaster && (
                            <button
                              onClick={() => setDefaultBoard(b.id)}
                              className="text-slate-500 hover:text-blue-600 font-semibold cursor-pointer"
                            >
                              Set default
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>              </>)}
            </div>
          </div>
        )}

        {activeCategory === 'classes_divisions' && (
          <div className="space-y-8 animate-fade-in">
            {/* Class master grid */}
            <div className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                <Layers className="w-4 text-blue-600 h-4" />
                <h3 className="text-sm font-bold text-slate-800">🏫 School Class Structures (Class 1 to Class 12)</h3>
              </div>
              <p className="text-xs text-slate-500 font-sans">
                Enable or disable specific standard grade files. Active classes populate the admission intake and class-teacher register assignments.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {setup.classes.map((c) => (
                  <button
                    key={c.id}
                    disabled={!isHeadmaster}
                    onClick={() => toggleClassStatus(c.id)}
                    className={`p-3 border rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      c.isEnabled 
                        ? 'bg-blue-50/50 border-blue-200 text-blue-900 shadow-sm' 
                        : 'bg-slate-100/50 border-slate-200 text-slate-400'
                    }`}
                  >
                    <span className="text-sm font-bold">{c.className}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${c.isEnabled ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'}`}>
                      {c.isEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Division Config */}
            <div className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-6 space-y-4 max-w-xl">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-600" />
                  <h4 className="text-xs font-bold text-slate-800">Division Registry Configurator</h4>
                </div>
                {isHeadmaster && (
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Div name"
                      value={newDivision}
                      onChange={(e) => setNewDivision(e.target.value)}
                      className="text-[10px] w-24 px-2.5 py-1 border border-slate-300 rounded bg-white"
                    />
                    <button onClick={addDivision} className="bg-blue-600 hover:bg-blue-700 text-white p-1 rounded cursor-pointer">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {setup.divisions.map((d) => (
                  <div key={d.id} className="flex items-center justify-between p-2.5 bg-white border border-slate-100 rounded-lg text-xs font-sans">
                    <span className="font-bold text-slate-700">Division {d.divisionName}</span>
                    <button
                      disabled={!isHeadmaster}
                      onClick={() => toggleDivision(d.id)}
                      className={`text-[9px] font-bold px-2 py-0.5 rounded cursor-pointer ${
                        d.isEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {d.isEnabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeCategory === 'erp_settings' && (
          <div className="space-y-8 animate-fade-in">
            {/* Global General ERP Default configs */}
            <div className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                <Settings className="w-4 text-indigo-600 h-4" />
                <h3 className="text-sm font-bold text-slate-800">⚙ Global ERP General Settings & Automation Rules</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Default UI Language</label>
                  <select
                    disabled={!isHeadmaster}
                    value={setup.globalSettings.defaultLanguage}
                    onChange={(e) => updateGlobalSetting('defaultLanguage', e.target.value as Language)}
                    className="w-full text-xs font-semibold px-2 py-2 border border-slate-300 rounded bg-white"
                  >
                    <option value="en">English</option>
                    <option value="hi">हिन्दी (Hindi)</option>
                    <option value="ur">اردو (Urdu)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Default Time Zone</label>
                  <input
                    type="text"
                    disabled={!isHeadmaster}
                    value={setup.globalSettings.defaultTimeZone}
                    onChange={(e) => updateGlobalSetting('defaultTimeZone', e.target.value)}
                    className="w-full text-xs font-semibold px-2 py-2 border border-slate-300 rounded bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">System Date Format</label>
                  <select
                    disabled={!isHeadmaster}
                    value={setup.globalSettings.dateFormat}
                    onChange={(e) => updateGlobalSetting('dateFormat', e.target.value)}
                    className="w-full text-xs font-semibold px-2 py-2 border border-slate-300 rounded bg-white"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY (Standard)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (System)</option>
                    <option value="MM-DD-YYYY">MM-DD-YYYY</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Currency Unit</label>
                  <input
                    type="text"
                    disabled={!isHeadmaster}
                    value={setup.globalSettings.currency}
                    onChange={(e) => updateGlobalSetting('currency', e.target.value)}
                    className="w-full text-xs font-semibold px-2 py-2 border border-slate-300 rounded bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Registration Mode</label>
                  <select
                    disabled={!isHeadmaster}
                    value={setup.globalSettings.registrationMode || 'self_approval'}
                    onChange={(e) => updateGlobalSetting('registrationMode', e.target.value)}
                    className="w-full text-xs font-semibold px-2 py-2 border border-slate-300 rounded bg-white font-sans"
                  >
                    <option value="self_approval">Self Registration + Approval</option>
                    <option value="admin_only">Admin Creates Accounts Only</option>
                    <option value="both_allowed">Both Methods Allowed</option>
                  </select>
                </div>
                <div className="space-y-1 flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600 pb-2.5">
                    <input
                      type="checkbox"
                      disabled={!isHeadmaster}
                      checked={setup.globalSettings.parentApprovalRequired !== false}
                      onChange={(e) => updateGlobalSetting('parentApprovalRequired', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300"
                    />
                    <span>HM Approval for Parents Required</span>
                  </label>
                </div>
              </div>

              {isHeadmaster && (
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={saveGlobalSettings}
                    disabled={cloudSaving || cloudInitialized !== true}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    Save ERP Defaults
                  </button>
                </div>
              )}
            </div>

            {/* Auto-generation configs */}
            <div className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-6 space-y-4">
              <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">🤖 ERP Sequential ID & Automation Engines</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                  <span className="text-xs font-bold text-slate-800">Auto G.R. Number Generator</span>
                  <p className="text-[11px] text-slate-500">Allocates General Register Numbers sequentially for new admissions instantly to prevent duplicates.</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-400">Current Next Value:</span>
                    <span className="text-xs font-mono font-bold text-blue-600">GR-2026-0842</span>
                  </div>
                </div>

                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                  <span className="text-xs font-bold text-slate-800">Auto Roll Number Sequence</span>
                  <p className="text-[11px] text-slate-500">Generates roll numbers alphabetically by student surname within the specific active divisions automatically.</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-400">Sequence Type:</span>
                    <span className="text-xs font-bold text-blue-600">Alphabetical (A-Z)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================================== */}
        {/* CATEGORY 3: SUBJECTS & CURRICULUM SETUP                                              */}
        {/* =================================================================================== */}
        {activeCategory === 'subjects' && (
          <div className="space-y-8">
            
            {/* Subject Groups */}
            {showSubjectGroups && (<>
            <div className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 text-purple-600 h-4" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">3.1 Subject Group Master</h3>
                    <p className="mt-0.5 text-[10px] font-medium text-slate-500">Headmaster creates the group only. Teacher assignments remain individual Subject assignments.</p>
                  </div>
                </div>
              </div>

              {isFinalAuthority && (
                <div className="rounded-2xl border border-purple-200 bg-white p-4 shadow-sm">
                  <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                    <label className="text-xs font-bold text-slate-700">Group Name
                      <input
                        type="text"
                        placeholder="e.g. History + Civics"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                      />
                    </label>
                    <label className="flex min-w-[220px] items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-bold text-purple-900">
                      <input type="checkbox" checked={newGroupCombinedPaper} onChange={(e) => setNewGroupCombinedPaper(e.target.checked)} />
                      Combined Question Paper Group
                    </label>
                  </div>
                  <div className="mt-3">
                    <div className="mb-2 flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Select Subjects</span><span className="text-[10px] font-bold text-slate-400">{selectedGroupSubjects.length} selected</span></div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {setup.subjects.filter(subject => subject.isActive !== false).map(subject => (
                        <label key={subject.id} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${selectedGroupSubjects.includes(subject.id) ? 'border-purple-400 bg-purple-50 text-purple-900' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                          <input type="checkbox" checked={selectedGroupSubjects.includes(subject.id)} onChange={() => toggleGroupSubject(subject.id)} />
                          <span>{subject.subjectName}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[10px] text-slate-500">For a Combined Question Paper Group select at least two Subjects. Marks and chapters are selected later by the assigned Subject Teacher(s).</p>
                    <button
                      type="button"
                      onClick={addSubjectGroup}
                      className="flex cursor-pointer items-center gap-1 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Group</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {setup.subjectGroups.map((grp) => (
                  <div key={grp.id} className="p-4 bg-white border border-slate-200 rounded-xl space-y-2 shadow-sm">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                      <div className="min-w-0">
                        <span className="font-bold text-slate-800 text-xs">{grp.groupName}</span>
                        <div className="mt-1"><span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${grp.combinedPaperEnabled ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'}`}>{grp.combinedPaperEnabled ? 'Combined Paper' : 'General Group'}</span></div>
                      </div>
                      {isFinalAuthority && (
                        <button type="button" onClick={() => deleteSubjectGroup(grp.id)} className="text-slate-400 hover:text-rose-600 cursor-pointer">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {grp.subjectIds.map(subId => {
                        const sObj = setup.subjects.find(s => s.id === subId);
                        return sObj ? (
                          <span key={subId} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded font-semibold">
                            {sObj.subjectName}
                          </span>
                        ) : null;
                      })}
                      {grp.subjectIds.length === 0 && (
                        <span className="text-[10px] text-slate-400 italic">No subjects mapped</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            </>)}
            {/* Subject Master Form Trigger */}
            {showSubjectRegistry && (<>
            <div className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 text-blue-600 h-4" />
                  <h3 className="text-sm font-bold text-slate-800">3.2 Master Subject Registry</h3>
                </div>
                {isHeadmaster && !showSubjectForm && (
                  <button
                    onClick={() => setShowSubjectForm(true)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Subject</span>
                  </button>
                )}
              </div>

              {/* Create/Edit Form */}
              {showSubjectForm && (
                <form onSubmit={saveSubject} className="bg-white border border-slate-200 p-5 rounded-xl space-y-4 animate-fade-in">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-700 uppercase">
                      {editingSubjectId ? 'Modify Subject Parameters' : 'Register New Curriculum Subject'}
                    </span>
                    <button type="button" onClick={() => setShowSubjectForm(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Subject Code</label>
                      <input
                        type="text"
                        placeholder="e.g. ENG-01"
                        value={subjectForm.subjectCode}
                        onChange={(e) => setSubjectForm({ ...subjectForm, subjectCode: e.target.value })}
                        className="w-full text-xs font-semibold px-2.5 py-1.5 border border-slate-300 rounded"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Subject Name</label>
                      <input
                        type="text"
                        placeholder="e.g. English Literature"
                        value={subjectForm.subjectName}
                        onChange={(e) => setSubjectForm({ ...subjectForm, subjectName: e.target.value })}
                        className="w-full text-xs font-semibold px-2.5 py-1.5 border border-slate-300 rounded"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Subject Classification</label>
                      <select
                        value={subjectForm.subjectType}
                        onChange={(e) => setSubjectForm({ ...subjectForm, subjectType: e.target.value })}
                        className="w-full text-xs font-semibold px-2 py-1.5 border border-slate-300 rounded bg-white"
                      >
                        <option value="Language">Language Instruction</option>
                        <option value="Core">Core Academic</option>
                        <option value="Elective">Elective / Optional</option>
                        <option value="Vocational">Vocational Track</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Medium / Language Mapping</label>
                      <select
                        value={subjectForm.language}
                        onChange={(e) => setSubjectForm({ ...subjectForm, language: e.target.value })}
                        className="w-full text-xs font-semibold px-2 py-1.5 border border-slate-300 rounded bg-white"
                      >
                        <option value="None">None (English / Multi)</option>
                        <option value="Urdu">Urdu</option>
                        <option value="Marathi">Marathi</option>
                        <option value="Hindi">Hindi</option>
                        <option value="English">English</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Scholastic Area</label>
                      <select
                        value={subjectForm.isScholastic ? 'true' : 'false'}
                        onChange={(e) => setSubjectForm({ ...subjectForm, isScholastic: e.target.value === 'true' })}
                        className="w-full text-xs font-semibold px-2 py-1.5 border border-slate-300 rounded bg-white"
                      >
                        <option value="true">Scholastic (Standard Grades)</option>
                        <option value="false">Co-Scholastic (Non-Cognitive)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Max Exam Marks</label>
                      <input
                        type="number"
                        value={subjectForm.maxMarks}
                        onChange={(e) => setSubjectForm({ ...subjectForm, maxMarks: parseInt(e.target.value) })}
                        className="w-full text-xs font-semibold px-2.5 py-1.5 border border-slate-300 rounded"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Minimum Passing Marks</label>
                      <input
                        type="number"
                        value={subjectForm.passingMarks}
                        onChange={(e) => setSubjectForm({ ...subjectForm, passingMarks: parseInt(e.target.value) })}
                        className="w-full text-xs font-semibold px-2.5 py-1.5 border border-slate-300 rounded"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Progress Card Print Order</label>
                      <input
                        type="number"
                        value={subjectForm.printOrder}
                        onChange={(e) => setSubjectForm({ ...subjectForm, printOrder: parseInt(e.target.value) })}
                        className="w-full text-xs font-semibold px-2.5 py-1.5 border border-slate-300 rounded"
                      />
                    </div>
                  </div>

                  {/* Associated classes mapping checkbox selection */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Applicable Standard Classes (Mapping)</label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {setup.classes.filter(c => c.isEnabled).map(c => {
                        const isMapped = subjectForm.classMapping.includes(c.className);
                        return (
                          <button
                            type="button"
                            key={c.id}
                            onClick={() => {
                              const newClasses = isMapped
                                ? subjectForm.classMapping.filter(x => x !== c.className)
                                : [...subjectForm.classMapping, c.className];
                              setSubjectForm({ ...subjectForm, classMapping: newClasses });
                            }}
                            className={`px-2 py-1 border rounded text-[10px] font-bold text-center cursor-pointer transition-all ${
                              isMapped 
                                ? 'bg-blue-50 border-blue-400 text-blue-700' 
                                : 'bg-slate-50 border-slate-200 text-slate-500'
                            }`}
                          >
                            {c.className}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowSubjectForm(false)}
                      className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg cursor-pointer"
                    >
                      Save Subject Specs
                    </button>
                  </div>
                </form>
              )}

              {/* Subject master list */}
              <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
                <table className="w-full text-left text-xs font-sans">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold bg-slate-50/50">
                      <th className="p-3">Order</th>
                      <th className="p-3">Code</th>
                      <th className="p-3">Subject Name</th>
                      <th className="p-3">Class Scope</th>
                      <th className="p-3">Max/Pass Marks</th>
                      <th className="p-3">Area Classification</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {setup.subjects.sort((a, b) => a.printOrder - b.printOrder).map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-100/50">
                        <td className="p-3 font-mono text-slate-400">#{sub.printOrder}</td>
                        <td className="p-3 font-mono font-bold text-slate-800">{sub.subjectCode}</td>
                        <td className="p-3">
                          <div>
                            <div className="font-bold text-slate-800">{sub.subjectName}</div>
                            {sub.language !== 'None' && (
                              <span className="text-[9px] font-semibold text-slate-400">Medium Language: {sub.language}</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {sub.classMapping.map(c => (
                              <span key={c} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-bold">
                                {c.replace('Class ', '')}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 font-medium">
                          <span className="text-slate-700 font-bold">{sub.maxMarks}</span>
                          <span className="text-slate-400"> / {sub.passingMarks}</span>
                        </td>
                        <td className="p-3">
                          <div className="space-y-1">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              sub.subjectType === 'Core' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                              sub.subjectType === 'Language' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                              'bg-amber-50 text-amber-700 border border-amber-100'
                            }`}>
                              {sub.subjectType}
                            </span>
                            <div>
                              <span className="text-[9px] font-semibold text-slate-400">
                                {sub.isScholastic ? 'Scholastic' : 'Co-Scholastic'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-right space-x-1">
                          {isHeadmaster && (
                            <button
                              onClick={() => editSubjectTrigger(sub)}
                              className="text-blue-600 hover:text-blue-800 p-1 cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {isFinalAuthority && (
                            <button
                              type="button"
                              onClick={() => deleteSubject(sub.id)}
                              className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            </>)}
            {/* Class Subject Mapping Grid Panel (Item 8) */}
            {showSubjectClassMapping && (<>
            <div className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 text-emerald-600 h-4" />
                  <h3 className="text-sm font-bold text-slate-800">3.3 Dynamic Class-Subject Mapping Grid</h3>
                </div>
                <div>
                  <select
                    value={selectedMappingClass}
                    onChange={(e) => setSelectedMappingClass(e.target.value)}
                    className="text-xs font-bold px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    {setup.classes.filter(c => c.isEnabled).map(c => (
                      <option key={c.id} value={c.className}>{c.className} Mapping Grid</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-xs text-slate-500 font-sans">
                Quickly toggle which subjects are active for <strong>{selectedMappingClass}</strong>. 
                This maps the report card columns and daily lecture timetable slots dynamically for this class level.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {setup.subjects.map((sub) => {
                  const isMapped = sub.classMapping.includes(selectedMappingClass);
                  return (
                    <button
                      key={sub.id}
                      disabled={!isHeadmaster}
                      onClick={() => toggleSubjectClassMapping(sub.id, selectedMappingClass)}
                      className={`p-3 border rounded-xl flex items-center justify-between text-left transition-all cursor-pointer ${
                        isMapped 
                          ? 'bg-emerald-50/40 border-emerald-200 text-emerald-900' 
                          : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-extrabold">{sub.subjectName}</div>
                        <div className="text-[10px] font-mono font-medium text-slate-400">{sub.subjectCode}</div>
                      </div>
                      <div className={`p-1 rounded-full ${isMapped ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-300'}`}>
                        <CheckSquare className="w-4 h-4" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            </>)}
          </div>
        )}

        {/* =================================================================================== */}
        {/* CATEGORY 4: EXAMS & GRADING SCALES                                                 */}
        {/* =================================================================================== */}
        {activeCategory === 'grading' && (
          <div className="space-y-8 animate-fade-in">
            
            {/* Exam terms list */}
            {(!focusedMode || focusedFeatureId !== 'grading-passing-rules') && (<>
            <div className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <Award className="w-4 text-blue-600 h-4" />
                  <h3 className="text-sm font-bold text-slate-800">4.1 Academic Exam Terms</h3>
                </div>
                {isHeadmaster && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. SA-1"
                      value={newTerm}
                      onChange={(e) => setNewTerm(e.target.value)}
                      className="text-xs px-2 py-1 border border-slate-300 rounded bg-white"
                    />
                    <button
                      onClick={addExamTerm}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Exam</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {setup.examTerms.map((term) => (
                  <div
                    key={term.id}
                    className={`p-3 border rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                      term.isActive 
                        ? 'bg-blue-50/50 border-blue-200 text-blue-900 shadow-sm' 
                        : 'bg-slate-100/50 border-slate-200 text-slate-400'
                    }`}
                  >
                    <span className="text-xs font-bold text-slate-700">{term.termName}</span>
                    <button
                      disabled={!isHeadmaster || cloudSaving}
                      onClick={() => void toggleExamTerm(term.id)}
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded cursor-pointer ${
                        term.isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {term.isActive ? 'Active Term' : 'Disabled'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            </>)}
            {/* Grading Scale configs */}
            {(!focusedMode || focusedFeatureId !== 'academic-term-calendar') && (<>
            <div className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-6 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-3 gap-3">
                <div className="flex items-center gap-2">
                  <Award className="w-4 text-emerald-600 h-4" />
                  <h3 className="text-sm font-bold text-slate-800">4.2 Configurable Grading Scale</h3>
                </div>

                {/* Sub-tabs for separate grading systems */}
                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 self-start md:self-auto shrink-0">
                  <button
                    onClick={() => setSelectedGradingGroup('primary')}
                    className={`px-3 py-1 text-[11px] font-extrabold rounded-md cursor-pointer transition-all ${
                      selectedGradingGroup === 'primary' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Primary (Classes 1–8)
                  </button>
                  <button
                    onClick={() => setSelectedGradingGroup('secondary')}
                    className={`px-3 py-1 text-[11px] font-extrabold rounded-md cursor-pointer transition-all ${
                      selectedGradingGroup === 'secondary' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Secondary (Classes 9–10)
                  </button>
                  <button
                    onClick={() => setSelectedGradingGroup('future_ready')}
                    className={`px-3 py-1 text-[11px] font-extrabold rounded-md cursor-pointer transition-all ${
                      selectedGradingGroup === 'future_ready' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Future Ready (Classes 11–12)
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-500 font-sans">
                Set up minimum percentage boundaries, grade names, and matching credit points for the selected grading system. Each system is editable independently.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Add grade scale form */}
                {isHeadmaster && (
                  <form onSubmit={addGradeScale} className="bg-white p-4 border border-slate-200 rounded-xl space-y-3 shadow-sm">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                      Add Grade to {selectedGradingGroup === 'primary' ? 'Primary' : selectedGradingGroup === 'secondary' ? 'Secondary' : 'Future Ready'}
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400">Grade Name</label>
                        <input
                          type="text"
                          placeholder="A1"
                          value={gradeForm.gradeName}
                          onChange={(e) => setGradeForm({ ...gradeForm, gradeName: e.target.value })}
                          className="w-full text-xs px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400">Grade Points</label>
                        <input
                          type="number"
                          value={gradeForm.gradePoints}
                          onChange={(e) => setGradeForm({ ...gradeForm, gradePoints: parseInt(e.target.value) || 0 })}
                          className="w-full text-xs px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400">Min %</label>
                        <input
                          type="number"
                          value={gradeForm.minPercentage}
                          onChange={(e) => setGradeForm({ ...gradeForm, minPercentage: parseInt(e.target.value) || 0 })}
                          className="w-full text-xs px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400">Max %</label>
                        <input
                          type="number"
                          value={gradeForm.maxPercentage}
                          onChange={(e) => setGradeForm({ ...gradeForm, maxPercentage: parseInt(e.target.value) || 0 })}
                          className="w-full text-xs px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400">Teacher Observation Remarks</label>
                      <input
                        type="text"
                        placeholder="Excellent"
                        value={gradeForm.remarks}
                        onChange={(e) => setGradeForm({ ...gradeForm, remarks: e.target.value })}
                        className="w-full text-xs px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <button type="submit" className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded cursor-pointer shadow-sm">
                      Save Grade Parameter
                    </button>
                  </form>
                )}

                {/* Grade scales table */}
                <div className="md:col-span-2 overflow-x-auto border border-slate-200 rounded-xl bg-white">
                  <table className="w-full text-left text-xs font-sans">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 bg-slate-50 font-bold">
                        <th className="p-2.5">Grade</th>
                        <th className="p-2.5">Range %</th>
                        <th className="p-2.5">Grade Points</th>
                        <th className="p-2.5">Consolidated Remarks</th>
                        <th className="p-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {setup.gradeScales
                        .filter((g) => {
                          const itemGroup = g.systemGroup || 'secondary';
                          return itemGroup === selectedGradingGroup;
                        })
                        .map((g) => (
                          <tr key={g.id} className="hover:bg-slate-50">
                            <td className="p-2.5 font-bold text-slate-800">{g.gradeName}</td>
                            <td className="p-2.5 font-semibold text-slate-600">{g.minPercentage}% - {g.maxPercentage}%</td>
                            <td className="p-2.5 font-mono text-blue-600 font-bold">{g.gradePoints}</td>
                            <td className="p-2.5 text-slate-500">{g.remarks}</td>
                            <td className="p-2.5 text-right">
                              {isFinalAuthority && (
                                <button type="button" onClick={() => deleteGradeScale(g.id)} className="text-rose-600 hover:text-rose-800 cursor-pointer p-1">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      {setup.gradeScales.filter((g) => (g.systemGroup || 'secondary') === selectedGradingGroup).length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-400 font-medium">
                            No grade parameters configured for this grading system level. Add parameters using the form.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            </div>
            </>)}
          </div>
        )}

        {/* =================================================================================== */}
        {/* CATEGORY 5: SCHOOL TIMINGS, PERIODS & HOLIDAYS                                      */}
        {/* =================================================================================== */}
        {activeCategory === 'timing' && (
          <div className="space-y-8 animate-fade-in">
            
            {/* School hours timing */}
            <div className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-6 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-3 gap-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 text-blue-600 h-4" />
                  <h3 className="text-sm font-bold text-slate-800">5.1 Day-by-Day School Timing Master</h3>
                </div>

                {/* Day selector */}
                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 overflow-x-auto scrollbar-none shrink-0 max-w-full">
                  {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setSelectedTimingDay(day)}
                      className={`px-2.5 py-1 text-[11px] font-extrabold rounded-md cursor-pointer transition-all shrink-0 ${
                        selectedTimingDay === day ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {day.substring(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!isHeadmaster) return;
                  const updated = {
                    ...setup,
                    schoolTiming: {
                      ...setup.schoolTiming,
                      openingTime: dayOverrides[selectedTimingDay].openingTime,
                      closingTime: dayOverrides[selectedTimingDay].closingTime,
                      prayerTime: dayOverrides[selectedTimingDay].prayerTime,
                      lunchBreakStart: dayOverrides[selectedTimingDay].lunchBreakStart,
                      lunchBreakEnd: dayOverrides[selectedTimingDay].lunchBreakEnd,
                      dayOverrides
                    }
                  };
                  handleSaveSetup(updated, 'SAVE_SCHOOL_TIMING', `Saved day-specific school timing for ${selectedTimingDay}`);
                }} 
                className="space-y-4"
              >
                {/* Active Day Configuration Card */}
                <div className="bg-white p-4 border border-slate-200 rounded-xl space-y-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wider bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg">
                        {selectedTimingDay} Configuration
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Day Classification</label>
                      <select
                        disabled={!isHeadmaster}
                        value={dayOverrides[selectedTimingDay]?.classification || 'Standard'}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDayOverrides(prev => ({
                            ...prev,
                            [selectedTimingDay]: {
                              ...prev[selectedTimingDay],
                              classification: val
                            }
                          }));
                        }}
                        className="text-xs font-semibold px-2 py-1 border border-slate-300 rounded bg-slate-50 text-slate-700 focus:outline-none"
                      >
                        <option value="Standard">Standard Class Day</option>
                        <option value="Assembly Day">Assembly Day Schedule</option>
                        <option value="Lunch Break">Lunch Break / Sports day</option>
                        <option value="Prayer">Prayer / Friday Timings</option>
                        <option value="Half Day">Half Day Schedule</option>
                        <option value="Special Working Day">Special Working Day</option>
                        <option value="Exam Timing">Exam Timing Schedule</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Opening Time</label>
                      <input
                        type="text"
                        disabled={!isHeadmaster}
                        value={dayOverrides[selectedTimingDay]?.openingTime || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDayOverrides(prev => ({
                            ...prev,
                            [selectedTimingDay]: { ...prev[selectedTimingDay], openingTime: val }
                          }));
                        }}
                        className="w-full text-xs font-semibold px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Closing Time</label>
                      <input
                        type="text"
                        disabled={!isHeadmaster}
                        value={dayOverrides[selectedTimingDay]?.closingTime || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDayOverrides(prev => ({
                            ...prev,
                            [selectedTimingDay]: { ...prev[selectedTimingDay], closingTime: val }
                          }));
                        }}
                        className="w-full text-xs font-semibold px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Prayer/Assembly Time</label>
                      <input
                        type="text"
                        disabled={!isHeadmaster}
                        value={dayOverrides[selectedTimingDay]?.prayerTime || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDayOverrides(prev => ({
                            ...prev,
                            [selectedTimingDay]: { ...prev[selectedTimingDay], prayerTime: val }
                          }));
                        }}
                        className="w-full text-xs font-semibold px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Lunch/Recess Start</label>
                      <input
                        type="text"
                        disabled={!isHeadmaster}
                        value={dayOverrides[selectedTimingDay]?.lunchBreakStart || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDayOverrides(prev => ({
                            ...prev,
                            [selectedTimingDay]: { ...prev[selectedTimingDay], lunchBreakStart: val }
                          }));
                        }}
                        className="w-full text-xs font-semibold px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Lunch/Recess End</label>
                      <input
                        type="text"
                        disabled={!isHeadmaster}
                        value={dayOverrides[selectedTimingDay]?.lunchBreakEnd || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDayOverrides(prev => ({
                            ...prev,
                            [selectedTimingDay]: { ...prev[selectedTimingDay], lunchBreakEnd: val }
                          }));
                        }}
                        className="w-full text-xs font-semibold px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Working Days */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Configured Working Days</label>
                  <div className="flex flex-wrap gap-2">
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => {
                      const isActive = setup.schoolTiming.workingDays.includes(day);
                      return (
                        <button
                          type="button"
                          key={day}
                          disabled={!isHeadmaster}
                          onClick={() => toggleWorkingDay(day)}
                          className={`px-3 py-1.5 border rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                            isActive 
                              ? 'bg-blue-600 text-white border-blue-600 font-bold' 
                              : 'bg-white border-slate-200 text-slate-400 hover:text-slate-700'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1 pt-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Holiday Observation Rules Description</label>
                  <textarea
                    disabled={!isHeadmaster}
                    rows={2}
                    value={setup.schoolTiming.holidayRules}
                    onChange={(e) => updateTimingField('holidayRules', e.target.value)}
                    className="w-full text-xs p-2 border border-slate-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {isHeadmaster && (
                  <div className="flex justify-end pt-2">
                    <button type="submit" className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm">
                      <Save className="w-4 h-4" />
                      <span>Save Day Timings</span>
                    </button>
                  </div>
                )}
              </form>
            </div>

            {/* Daily Lecture Period slots (Item 13) */}
            <div className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                <Clock className="w-4 text-emerald-600 h-4" />
                <h3 className="text-sm font-bold text-slate-800">5.2 Daily Period Master Schedule</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Form to add period */}
                {isHeadmaster && (
                  <form onSubmit={addPeriod} className="bg-white p-4 border border-slate-200 rounded-xl space-y-3 shadow-sm">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Register Period Slot</span>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400">Period Label</label>
                        <input
                          type="text"
                          placeholder="e.g. Period 1"
                          value={periodForm.periodName}
                          onChange={(e) => setPeriodForm({ ...periodForm, periodName: e.target.value })}
                          className="w-full text-xs px-2 py-1 border border-slate-300 rounded"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400">Slot Number</label>
                        <input
                          type="number"
                          value={periodForm.periodNumber}
                          onChange={(e) => setPeriodForm({ ...periodForm, periodNumber: parseInt(e.target.value) || 0 })}
                          className="w-full text-xs px-2 py-1 border border-slate-300 rounded"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400">Start Time</label>
                        <input
                          type="text"
                          placeholder="08:15 AM"
                          value={periodForm.startTime}
                          onChange={(e) => setPeriodForm({ ...periodForm, startTime: e.target.value })}
                          className="w-full text-xs px-2 py-1 border border-slate-300 rounded"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400">End Time</label>
                        <input
                          type="text"
                          placeholder="09:00 AM"
                          value={periodForm.endTime}
                          onChange={(e) => setPeriodForm({ ...periodForm, endTime: e.target.value })}
                          className="w-full text-xs px-2 py-1 border border-slate-300 rounded"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400">Duration (mins)</label>
                        <input
                          type="number"
                          value={periodForm.durationMinutes}
                          onChange={(e) => setPeriodForm({ ...periodForm, durationMinutes: parseInt(e.target.value) || 0 })}
                          className="w-full text-xs px-2 py-1 border border-slate-300 rounded"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400">Period Slot Type</label>
                        <select
                          value={periodForm.type}
                          onChange={(e) => setPeriodForm({ ...periodForm, type: e.target.value as any })}
                          className="w-full text-xs px-2 py-1 border border-slate-300 rounded bg-white"
                        >
                          <option value="Lecture">Lecture Class</option>
                          <option value="Break">Break / Recess</option>
                          <option value="Assembly">Morning Assembly</option>
                          <option value="Sports">Sports / PT</option>
                          <option value="Library">Library Session</option>
                          <option value="Lab">Science Laboratory</option>
                        </select>
                      </div>
                    </div>

                    <button type="submit" className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded cursor-pointer">
                      Save Slot Parameters
                    </button>
                  </form>
                )}

                {/* Period slots timeline */}
                <div className="md:col-span-2 space-y-2 max-h-80 overflow-y-auto pr-1">
                  {setup.periods.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg text-xs font-bold ${
                          p.type === 'Lecture' ? 'bg-blue-50 text-blue-700' :
                          p.type === 'Break' ? 'bg-amber-50 text-amber-700' :
                          'bg-indigo-50 text-indigo-700'
                        }`}>
                          {p.periodNumber > 0 ? `L${p.periodNumber}` : p.type.substring(0, 3).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 text-xs block">{p.periodName}</span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {p.startTime} - {p.endTime} ({p.durationMinutes} minutes)
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-bold">
                          {p.type}
                        </span>
                        {isFinalAuthority && (
                          <button type="button" onClick={() => deletePeriod(p.id)} className="text-slate-400 hover:text-rose-600 cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Holiday Master Registry */}
            <div className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                <Calendar className="w-4 text-purple-600 h-4" />
                <h3 className="text-sm font-bold text-slate-800">5.3 Official Holidays and Vacation Master</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Add holiday form */}
                {isHeadmaster && (
                  <form onSubmit={addHoliday} className="bg-white p-4 border border-slate-200 rounded-xl space-y-3 shadow-sm">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Declare Holiday / Recess</span>
                    
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400">Holiday Occasion Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Ramzan Eid"
                        value={holidayForm.holidayName}
                        onChange={(e) => setHolidayForm({ ...holidayForm, holidayName: e.target.value })}
                        className="w-full text-xs px-2 py-1 border border-slate-300 rounded"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400">Start Date</label>
                        <input
                          type="date"
                          value={holidayForm.startDate}
                          onChange={(e) => setHolidayForm({ ...holidayForm, startDate: e.target.value })}
                          className="w-full text-xs px-2 py-1 border border-slate-300 rounded"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400">End Date</label>
                        <input
                          type="date"
                          value={holidayForm.endDate}
                          onChange={(e) => setHolidayForm({ ...holidayForm, endDate: e.target.value })}
                          className="w-full text-xs px-2 py-1 border border-slate-300 rounded"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400">Holiday Classification</label>
                      <select
                        value={holidayForm.holidayType}
                        onChange={(e) => setHolidayForm({ ...holidayForm, holidayType: e.target.value as any })}
                        className="w-full text-xs px-2 py-1 border border-slate-300 rounded bg-white"
                      >
                        <option value="National">National Holiday (Mandatory)</option>
                        <option value="State">State Gazetted Holiday</option>
                        <option value="School">School Specific Recess</option>
                        <option value="Religious">Religious Festival Holiday</option>
                        <option value="Other">Other Vacation / Break</option>
                      </select>
                    </div>

                    <button type="submit" className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded cursor-pointer">
                      Publish Holiday Announcement
                    </button>
                  </form>
                )}

                {/* Holidays list */}
                <div className="md:col-span-2 overflow-x-auto border border-slate-200 rounded-xl bg-white max-h-80 overflow-y-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 bg-slate-50 font-bold">
                        <th className="p-2.5">Occasion Title</th>
                        <th className="p-2.5">Calendar Dates</th>
                        <th className="p-2.5">Classification</th>
                        <th className="p-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {setup.holidays.map((h) => (
                        <tr key={h.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-slate-800">{h.holidayName}</td>
                          <td className="p-2.5 font-semibold text-slate-600">
                            {h.startDate} {h.endDate && h.endDate !== h.startDate ? `to ${h.endDate}` : ''}
                          </td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              h.holidayType === 'National' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                              h.holidayType === 'Religious' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                              'bg-slate-50 text-slate-500'
                            }`}>
                              {h.holidayType}
                            </span>
                          </td>
                          <td className="p-2.5 text-right">
                            {isFinalAuthority && (
                              <button type="button" onClick={() => deleteHoliday(h.id)} className="text-rose-600 hover:text-rose-800 cursor-pointer">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* =================================================================================== */}
        {/* CATEGORY 6: ADMISSION REQUIRED DOCUMENTS CHECKLIST                                 */}
        {/* =================================================================================== */}
        {activeCategory === 'docs' && (
          <div className="space-y-8">
            <div className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 text-blue-600 h-4" />
                  <h3 className="text-sm font-bold text-slate-800">6.1 Required Admission Documents Master Checklist</h3>
                </div>
                {isHeadmaster && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Birth Certificate"
                      value={newDocumentName}
                      onChange={(e) => setNewDocumentName(e.target.value)}
                      className="text-xs px-2.5 py-1 border border-slate-300 rounded bg-white"
                    />
                    <label className="flex items-center gap-1 text-[10px] font-semibold text-slate-600">
                      <input
                        type="checkbox"
                        checked={newDocumentRequired}
                        onChange={(e) => setNewDocumentRequired(e.target.checked)}
                        className="w-3 h-3 text-blue-600 rounded border-slate-300"
                      />
                      <span>Compulsory</span>
                    </label>
                    <button
                      onClick={addDocument}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Required Spec</span>
                    </button>
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-500 font-sans">
                These documents are required from parents/students during registration. The admissions panel and clerk workflow verifies compliance against this master list.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {setup.documents.map((doc) => (
                  <div key={doc.id} className="p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-sm">
                    <div className="space-y-1">
                      <span className="font-bold text-slate-800 text-xs block">{doc.documentName}</span>
                      {doc.description && (
                        <span className="text-[10px] text-slate-400 block leading-tight">{doc.description}</span>
                      )}
                      <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        doc.isRequired ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {doc.isRequired ? 'Compulsory Document' : 'Optional document'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isHeadmaster && (
                        <button
                          onClick={() => toggleDocumentRequired(doc.id)}
                          className="text-[10px] bg-slate-50 border border-slate-200 hover:bg-slate-100 font-semibold px-2 py-1 rounded cursor-pointer"
                        >
                          Toggle Compulsory
                        </button>
                      )}
                      {isFinalAuthority && (
                        <button type="button" onClick={() => deleteDocument(doc.id)} className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer">
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

      </div>

      {/* Acceptable Audit Log Footer (No-Print) */}
      <div className="bg-slate-50 p-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 no-print">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-500" />
          <span>Every configuration change automatically binds and configures all other live ERP screens.</span>
        </div>
        <div className="text-[11px] font-mono font-medium text-slate-400">
          Last Config Sync: {new Date().toLocaleDateString()}
        </div>
      </div>

    </div>
  );
}
