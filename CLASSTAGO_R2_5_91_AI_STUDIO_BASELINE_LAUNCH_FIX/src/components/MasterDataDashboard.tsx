import React, { useState, useEffect } from 'react';
import { 
  Database, Search, Filter, ArrowUpDown, Plus, Edit2, Trash2, 
  Check, X, FileSpreadsheet, Download, Upload, AlertCircle, Info, 
  CheckSquare, Square, ToggleLeft, ToggleRight, Settings, Users, 
  BookOpen, MapPin, Landmark, Award, Calendar, FileText, CheckCircle2, ShieldAlert,
  Clock, ChevronDown, ChevronRight
} from 'lucide-react';
import { LocalERPDatabase, supabase } from '../lib/supabase';
import { MasterAcademicSetup, MasterDataItem, MasterLocationItem, Language, User } from '../types';
import UrduWrapper from './UrduWrapper';
import { SubjectService, SubjectRecord } from '../services/subjectService';
import { AcademicAssignmentCloudService } from '../services/academicAssignmentCloudService';
import { CloudStaffMasterRecord, StaffMasterService } from '../services/staffMasterService';
import * as XLSX from 'xlsx';
import { requestActionConfirm } from '../lib/actionConfirm';

interface MasterDataDashboardProps {
  lang: Language;
  userRole: string;
  userName: string;
  userId: string;
  initialCategory?: MasterCategory | null;
  initialSubList?: string | null;
  focusedMode?: boolean;
  focusedTitle?: string;
}

export type MasterCategory = 
  | 'location' 
  | 'student' 
  | 'teacher' 
  | 'subject' 
  | 'document' 
  | 'certificate' 
  | 'result' 
  | 'timetable'
  | 'academic';

interface MasterSubListDefinition {
  id: string;
  label: string;
}

const MASTER_SUBLISTS: Record<MasterCategory, MasterSubListDefinition[]> = {
  location: [{ id: 'locations', label: 'Locations (State/Dist/Taluka/Village)' }],
  student: [
    { id: 'religions', label: 'Religions' },
    { id: 'categories', label: 'Categories (Social Status)' },
    { id: 'castes', label: 'Castes' },
    { id: 'nationalities', label: 'Nationalities' },
    { id: 'motherTongues', label: 'Mother Tongues' },
    { id: 'bloodGroups', label: 'Blood Groups' },
    { id: 'admissionTypes', label: 'Admission Types' },
    { id: 'houses', label: 'School Houses' },
    { id: 'genders', label: 'Genders' },
    { id: 'mediumList', label: 'Mediums' }
  ],
  teacher: [
    { id: 'teacherProfiles', label: 'Teacher Profiles & Service Status' },
    { id: 'subjectAllocations', label: 'Teaching Assignments (Teacher ↔ Class/Division ↔ Subject)' },
    { id: 'classTeacherAssignments', label: 'Class Teacher Assignments (Teacher ↔ Class/Division)' },
    { id: 'designations', label: 'Staff Designations' },
    { id: 'qualifications', label: 'Qualifications' },
    { id: 'departments', label: 'Departments' },
    { id: 'employmentTypes', label: 'Employment Types' },
    { id: 'staffCategories', label: 'Staff Categories' }
  ],
  subject: [{ id: 'subjects', label: 'Subject Master (Class/Marks Mapping)' }],
  document: [{ id: 'documents', label: 'Required Admission Documents' }],
  certificate: [{ id: 'certificates', label: 'Certificate Layout Templates' }],
  result: [
    { id: 'examTerms', label: 'Exam Terms & Weightages' },
    { id: 'gradeScales', label: 'Grade Scales & Points' },
    { id: 'observationCategories', label: 'Report Card Behavior Criteria' },
    { id: 'urduRemarks', label: 'Nastaleeq-friendly Urdu Remarks' },
    { id: 'progressCardTemplates', label: 'Progress Card Templates' },
    { id: 'markListTemplates', label: 'Subject Mark-List A Templates' }
  ],
  timetable: [
    { id: 'periods', label: 'Period Timings' },
    { id: 'specialPeriods', label: 'Special Lectures & Practical Slots' }
  ],
  academic: [
    { id: 'academicYears', label: 'Academic Years' },
    { id: 'classes', label: 'Grades (Class 1 to 12)' },
    { id: 'divisions', label: 'Divisions & Medium Tracks' },
    { id: 'boards', label: 'Education Boards' }
  ]
};

const getMasterSubLists = (category: MasterCategory): MasterSubListDefinition[] =>
  MASTER_SUBLISTS[category] || [];

export default function MasterDataDashboard({
  lang,
  userRole,
  userName,
  userId,
  initialCategory = null,
  initialSubList = null,
  focusedMode = false,
  focusedTitle
}: MasterDataDashboardProps) {
  const isHeadmaster = userRole === 'headmaster';
  const isClerk = userRole === 'clerk';

  // Loaded master setup state
  const [setup, setSetup] = useState<MasterAcademicSetup | null>(null);
  const [activeTeachers, setActiveTeachers] = useState<User[]>([]);
  const [canonicalStaffProfiles, setCanonicalStaffProfiles] = useState<CloudStaffMasterRecord[]>([]);
  const [liveSubjects, setLiveSubjects] = useState<SubjectRecord[]>([]);
  const [subjectLoadError, setSubjectLoadError] = useState('');
  const [activeCategory, setActiveCategory] = useState<MasterCategory | null>(initialCategory);
  
  // Grid/List Management states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Selected sub-master list selection
  const [activeSubList, setActiveSubList] = useState<string>(() => {
    if (initialSubList) return initialSubList;
    if (initialCategory) return getMasterSubLists(initialCategory)[0]?.id || '';
    return '';
  });
  const hasEditPermission = isHeadmaster || isClerk;
  const canonicalStaffDirectory = activeSubList === 'teacherProfiles';
  const clerkReadOnlyCloudList = isClerk && ['subjects', 'subjectAllocations', 'classTeacherAssignments'].includes(activeSubList);
  const canEditActiveList = hasEditPermission && !canonicalStaffDirectory && !clerkReadOnlyCloudList;

  // Bulk actions selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals / Form states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [formName, setFormName] = useState('');
  
  // Location Form State
  const [locState, setLocState] = useState('Maharashtra');
  const [locDistrict, setLocDistrict] = useState('Nandurbar');
  const [locTaluka, setLocTaluka] = useState('Taloda');
  const [locVillage, setLocVillage] = useState('');

  // CSV Import State
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvInput, setCsvInput] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [subjectMigrationNeeded, setSubjectMigrationNeeded] = useState(false);
  const [subjectMigrationRunning, setSubjectMigrationRunning] = useState(false);
  const [assignmentCloudError, setAssignmentCloudError] = useState('');
  const [assignmentCloudStatus, setAssignmentCloudStatus] = useState('');
  const [teacherRepairSelections, setTeacherRepairSelections] = useState<Record<string, string>>({});
  const [teacherRepairRunning, setTeacherRepairRunning] = useState(false);
  const [teacherRepairMessage, setTeacherRepairMessage] = useState('');
  const [subjectRepairSelections, setSubjectRepairSelections] = useState<Record<string, string>>({});
  const [subjectRepairRunning, setSubjectRepairRunning] = useState(false);
  const [subjectRepairMessage, setSubjectRepairMessage] = useState('');

  // --- NEW TEACHER MANAGEMENT STATES ---
  const [teacherForm, setTeacherForm] = useState({
    employeeId: '',
    shalarthId: '',
    fullName: '',
    fatherName: '',
    motherName: '',
    gender: 'Male',
    dob: '',
    dobInWords: '',
    qualification: 'M.A., B.Ed.',
    designation: 'Assistant Teacher',
    joiningDate: '2026-06-01',
    appointmentDate: '2026-06-01',
    mobileNumber: '',
    email: '',
    address: '',
    bloodGroup: 'B+',
    photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    documents: [] as { id: string; name: string; url: string; category?: string }[],
    status: 'Active' as 'Pending' | 'Active' | 'Transferred' | 'Retired' | 'Resigned' | 'Inactive',
    isActive: true
  });

  const [allocationForm, setAllocationForm] = useState({
    academicYear: '2026-27',
    teacherId: '',
    teacherName: '',
    className: 'Class 9',
    divisionName: 'A',
    subjectName: 'Urdu',
    weeklyPeriods: 5,
    isActive: true
  });

  const [bulkAllocations, setBulkAllocations] = useState<{ subjectName: string; periods: number }[]>([
    { subjectName: 'Urdu', periods: 6 }
  ]);
  const [isBulkAllocation, setIsBulkAllocation] = useState(false);

  const [assignmentForm, setAssignmentForm] = useState({
    academicYear: '2026-27',
    className: 'Class 9',
    divisionName: 'A',
    teacherId: '',
    teacherName: '',
    isActive: true
  });

  const [selectedTeacherWorkload, setSelectedTeacherWorkload] = useState<any | null>(null);
  const [expandedAssignmentTeachers, setExpandedAssignmentTeachers] = useState<string[]>([]);
  const [showWorkloadModal, setShowWorkloadModal] = useState(false);
  const [docUploadCategory, setDocUploadCategory] = useState('Qualification Certificates');
  const [docUploadName, setDocUploadName] = useState('');
  const [docUploadUrl, setDocUploadUrl] = useState('');


  const calculateTeacherPeriods = (teacherId: string) => {
    const allocations = setup?.subjectAllocations || [];
    const selectedTeacher: any = activeTeachers.find((teacher: any) => String(teacher.id) === String(teacherId));
    const selectedCanonical = canonicalStaffProfiles.find((row) => String(row.id) === String(teacherId) || String(row.userId || '') === String(teacherId));
    const identities = new Set(
      [
        teacherId,
        selectedTeacher?.id,
        selectedTeacher?.authUserId,
        selectedTeacher?.shalarthId,
        selectedTeacher?.employeeCode,
        selectedCanonical?.id,
        selectedCanonical?.userId,
        selectedCanonical?.shalarthId,
        selectedCanonical?.employeeId,
      ]
        .filter(Boolean)
        .map((value) => String(value))
    );
    const selectedName = normalizeTeacherRepairName(selectedTeacher?.name || selectedCanonical?.fullName);
    return allocations
      .filter((allocation: any) => {
        if (allocation?.isActive === false) return false;
        const ids = [allocation?.teacherRecordId, allocation?.teacherId].filter(Boolean).map((value) => String(value));
        if (ids.some((value) => identities.has(value))) return true;
        return Boolean(selectedName) && normalizeTeacherRepairName(allocation?.teacherName) === selectedName;
      })
      .reduce((sum: number, allocation: any) => sum + (Number(allocation.weeklyPeriods) || 0), 0);
  };

  const getUnitsWords = (n: number): string => {
    const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    return units[n];
  };

  const getTensWords = (n: number): string => {
    const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    if (n < 10) return units[n];
    if (n >= 10 && n < 20) return teens[n - 10];
    const unitDigit = n % 10;
    const tenDigit = Math.floor(n / 10);
    return `${tens[tenDigit]}${unitDigit ? '-' + units[unitDigit] : ''}`;
  };

  const convertDateToWords = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';

    const daysInWords = [
      '', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth',
      'Eleventh', 'Twelfth', 'Thirteenth', 'Fourteenth', 'Fifteenth', 'Sixteenth', 'Seventeenth', 'Eighteenth', 'Nineteenth', 'Twentieth',
      'Twenty-First', 'Twenty-Second', 'Twenty-Third', 'Twenty-Fourth', 'Twenty-Fifth', 'Twenty-Sixth', 'Twenty-Seventh', 'Twenty-Eighth', 'Twenty-Ninth', 'Thirtieth',
      'Thirty-First'
    ];

    const monthsInWords = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const d = date.getDate();
    const m = date.getMonth();
    const y = date.getFullYear();

    const dayWords = daysInWords[d] || '';
    const monthWords = monthsInWords[m] || '';

    let yearWords = '';
    if (y >= 1900 && y < 2000) {
      const tens = y - 1900;
      const firstPart = "Nineteen";
      const secondPart = getTensWords(tens);
      yearWords = `${firstPart} ${secondPart}`;
    } else if (y >= 2000 && y < 2100) {
      const tens = y - 2000;
      if (tens === 0) {
        yearWords = "Two Thousand";
      } else if (tens < 10) {
        yearWords = `Two Thousand ${getUnitsWords(tens)}`;
      } else {
        yearWords = `Two Thousand ${getTensWords(tens)}`;
      }
    } else {
      yearWords = y.toString();
    }

    return `${dayWords} of ${monthWords} ${yearWords}`;
  };


  const normalizeTeacherRepairName = (value: unknown) => String(value ?? '')
    .toLowerCase()
    .replace(/[\.,'’`]/g, ' ')
    .replace(/\b(mr|mrs|miss|ms|dr|prof|shri|smt|sir|madam)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const legacyTeacherIdentityKey = (row: any) => {
    const rawId = String(row?.teacherId || '').trim();
    const rawName = normalizeTeacherRepairName(row?.teacherName);
    return `${rawId || 'no-id'}::${rawName || 'no-name'}`;
  };

  const getTeacherRepairRows = () => {
    if (!setup) return [] as Array<{ key: string; teacherId: string; teacherName: string; uses: number; suggestedId?: string }>;
    const allAssignments = [
      ...(setup.subjectAllocations || []),
      ...(setup.classTeacherAssignments || []),
    ];
    const grouped = new Map<string, { key: string; teacherId: string; teacherName: string; uses: number; suggestedId?: string }>();
    for (const row of allAssignments) {
      if (row?.isActive === false) continue;
      const key = legacyTeacherIdentityKey(row);
      const teacherId = String(row?.teacherId || '').trim();
      const teacherName = String(row?.teacherName || '').trim();
      const existing = grouped.get(key) || { key, teacherId, teacherName, uses: 0 };
      existing.uses += 1;
      grouped.set(key, existing);
    }

    const result = Array.from(grouped.values());
    for (const item of result) {
      const strongMatches = activeTeachers.filter((teacher: any) => {
        const candidates = [teacher?.id, teacher?.authUserId, teacher?.shalarthId, teacher?.employeeCode]
          .filter(Boolean)
          .map((value) => String(value));
        return item.teacherId && candidates.includes(item.teacherId);
      });
      if (strongMatches.length === 1) {
        item.suggestedId = String(strongMatches[0].id);
        continue;
      }
      const normalized = normalizeTeacherRepairName(item.teacherName);
      const nameMatches = activeTeachers.filter((teacher: any) => normalized && normalizeTeacherRepairName(teacher?.name) === normalized);
      if (nameMatches.length === 1) item.suggestedId = String(nameMatches[0].id);
    }
    return result;
  };

  const repairTeacherMappingsAndSync = async () => {
    if (!setup || !isHeadmaster || teacherRepairRunning) return;
    const repairRows = getTeacherRepairRows();
    const selectedByKey = new Map<string, User>();
    const missing: string[] = [];

    for (const row of repairRows) {
      const selectedId = teacherRepairSelections[row.key] || row.suggestedId || '';
      const selected = activeTeachers.find((teacher) => String(teacher.id) === String(selectedId));
      if (!selected) {
        missing.push(row.teacherName || row.teacherId || 'Unknown Teacher');
      } else {
        selectedByKey.set(row.key, selected);
      }
    }

    if (missing.length) {
      setTeacherRepairMessage(`Select the correct cloud Teacher for: ${missing.join(', ')}`);
      return;
    }

    setTeacherRepairRunning(true);
    setTeacherRepairMessage('');
    try {
      const patchRow = (row: any) => {
        const selected = selectedByKey.get(legacyTeacherIdentityKey(row));
        if (!selected) return row;
        return {
          ...row,
          teacherId: selected.authUserId || selected.id,
          teacherName: selected.name,
        };
      };
      const repaired: MasterAcademicSetup = {
        ...setup,
        subjectAllocations: (setup.subjectAllocations || []).map(patchRow),
        classTeacherAssignments: (setup.classTeacherAssignments || []).map(patchRow),
      };
      LocalERPDatabase.saveAcademicSetup(repaired);
      const cloud = await AcademicAssignmentCloudService.sync(repaired);
      const merged: MasterAcademicSetup = {
        ...repaired,
        subjectAllocations: cloud.subjectAllocations,
        classTeacherAssignments: cloud.classTeacherAssignments,
      };
      LocalERPDatabase.saveAcademicSetup(merged);
      setSetup(merged);
      setAssignmentCloudError('');
      setAssignmentCloudStatus(`Cloud Academic Mapping repaired · ${cloud.subjectAllocations.length} Subject Allocation(s) · ${cloud.classTeacherAssignments.length} Class Teacher assignment(s)`);
      setTeacherRepairMessage('All legacy Teacher identities were repaired and synchronized to the cloud.');
      window.dispatchEvent(new CustomEvent('academic_setup_updated'));
      window.dispatchEvent(new CustomEvent('class_teacher_assignments_updated'));
    } catch (error: any) {
      setTeacherRepairMessage(error?.message || 'Academic Teacher mapping repair could not be synchronized.');
    } finally {
      setTeacherRepairRunning(false);
    }
  };


  const normalizeSubjectRepairName = (value: unknown) => String(value ?? '')
    .toLowerCase()
    .replace(/[&]/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const getSubjectRepairRows = () => {
    if (!setup) return [] as Array<{ key: string; subjectName: string; uses: number; suggestedId?: string }>;
    const grouped = new Map<string, { key: string; subjectName: string; uses: number; suggestedId?: string }>();
    for (const row of setup.subjectAllocations || []) {
      if (row?.isActive === false) continue;
      const subjectName = String(row?.subjectName || '').trim();
      const key = normalizeSubjectRepairName(subjectName);
      if (!key) continue;
      const exact = liveSubjects.filter(subject => subject.isActive && normalizeSubjectRepairName(subject.subjectName) === key);
      if (exact.length === 1) continue;
      const existing = grouped.get(key) || { key, subjectName, uses: 0 };
      existing.uses += 1;
      grouped.set(key, existing);
    }
    return Array.from(grouped.values());
  };

  const createLegacySubjectInCloud = async (subjectName: string): Promise<SubjectRecord> => {
    const { data, error } = await supabase.rpc('edunixo_create_subject_from_legacy_r85', {
      p_subject_name: subjectName,
    });
    if (error) throw new Error(error.message || `${subjectName} could not be created in the Cloud Subject Master.`);
    const value: any = data && typeof data === 'object' ? data : {};
    if (!value.id) throw new Error(`${subjectName} was not returned by the Cloud Subject Master.`);
    return {
      id: String(value.id),
      schoolId: String(value.schoolId || ''),
      subjectCode: String(value.subjectCode || ''),
      subjectName: String(value.subjectName || subjectName),
      subjectType: String(value.subjectType || 'Core'),
      isActive: value.isActive !== false,
    };
  };

  const repairSubjectMappingsAndSync = async () => {
    if (!setup || !isHeadmaster || subjectRepairRunning) return;
    const repairRows = getSubjectRepairRows();
    if (!repairRows.length) {
      setSubjectRepairMessage('No unresolved legacy Subject identity remains. Reopen the page to retry cloud synchronization.');
      return;
    }

    const choices = new Map<string, string>();
    const missing: string[] = [];
    for (const row of repairRows) {
      const selected = subjectRepairSelections[row.key] || '';
      if (!selected) missing.push(row.subjectName || 'Unnamed Subject');
      else choices.set(row.key, selected);
    }
    if (missing.length) {
      setSubjectRepairMessage(`Choose an existing Cloud Subject or “Create as new Cloud Subject” for: ${missing.join(', ')}`);
      return;
    }

    setSubjectRepairRunning(true);
    setSubjectRepairMessage('');
    try {
      const resolved = new Map<string, SubjectRecord>();
      for (const row of repairRows) {
        const selected = choices.get(row.key)!;
        if (selected === '__create__') {
          const created = await createLegacySubjectInCloud(row.subjectName);
          resolved.set(row.key, created);
        } else {
          const existing = liveSubjects.find(subject => String(subject.id) === String(selected) && subject.isActive);
          if (!existing) throw new Error(`Selected Cloud Subject for ${row.subjectName} is no longer available.`);
          resolved.set(row.key, existing);
        }
      }

      const repaired: MasterAcademicSetup = {
        ...setup,
        subjectAllocations: (setup.subjectAllocations || []).map((row: any) => {
          const key = normalizeSubjectRepairName(row?.subjectName);
          const subject = resolved.get(key);
          return subject ? { ...row, subjectName: subject.subjectName, subjectRecordId: subject.id } : row;
        }),
      };

      // A genuinely new canonical Subject also needs the current Academic Year Class↔Subject
      // master mapping. Ensure it for every repaired allocation before publishing the
      // Subject-Teacher snapshot; existing mappings are reused and never deleted here.
      for (const row of repaired.subjectAllocations || []) {
        const key = normalizeSubjectRepairName(row?.subjectName);
        const subject = Array.from(resolved.values()).find(item => normalizeSubjectRepairName(item.subjectName) === key);
        if (!subject) continue;
        const { error: mappingError } = await supabase.rpc('edunixo_ensure_subject_class_mapping_r85', {
          p_subject_id: subject.id,
          p_class_name: String(row?.className || ''),
          p_weekly_periods: Number(row?.weeklyPeriods || 0) || null,
        });
        if (mappingError) throw new Error(mappingError.message || `${subject.subjectName} could not be linked to ${row?.className || 'the assigned Class'}.`);
      }

      LocalERPDatabase.saveAcademicSetup(repaired);
      const cloud = await AcademicAssignmentCloudService.sync(repaired);
      const merged: MasterAcademicSetup = {
        ...repaired,
        subjectAllocations: cloud.subjectAllocations,
        classTeacherAssignments: cloud.classTeacherAssignments,
      };
      LocalERPDatabase.saveAcademicSetup(merged);
      setSetup(merged);
      await loadLiveSubjects();
      setAssignmentCloudError('');
      setAssignmentCloudStatus(`Cloud Academic Mapping repaired · ${cloud.subjectAllocations.length} Subject Allocation(s) · ${cloud.classTeacherAssignments.length} Class Teacher assignment(s)`);
      setSubjectRepairMessage('All unresolved legacy Subject identities were repaired and synchronized to the cloud.');
      window.dispatchEvent(new CustomEvent('academic_setup_updated'));
      window.dispatchEvent(new CustomEvent('class_teacher_assignments_updated'));
    } catch (error: any) {
      setSubjectRepairMessage(error?.message || 'Academic Subject mapping repair could not be synchronized.');
    } finally {
      setSubjectRepairRunning(false);
    }
  };


  // Load Setup from database
  const loadLiveSubjects = async () => {
    const result = await SubjectService.getSubjects(false);
    if (result.error) {
      setLiveSubjects([]);
      setSubjectLoadError(result.error.message || 'Live Subject Master could not be loaded.');
      return;
    }
    setLiveSubjects(result.data);
    setSubjectLoadError('');
    const localSubjects = LocalERPDatabase.getAcademicSetup().subjects || [];
    setSubjectMigrationNeeded(userRole === 'headmaster' && result.data.length === 0 && localSubjects.length > 0);
  };

  const loadSetupData = async () => {
    const local = LocalERPDatabase.getAcademicSetup();
    setSetup(local);

    // Compatibility fallback only. Canonical Staff Master is loaded below through the
    // authorized server API so RLS/browser visibility cannot truncate assignment pickers.
    const localUsers = LocalERPDatabase.getUsers().filter(u => u.role === 'teacher' && u.isActive && u.status === 'Active');
    setActiveTeachers(localUsers);
    setCanonicalStaffProfiles([]);

    // Headmaster can also hold a teaching identity without changing the administrative
    // login role. Preparation is isolated so a profile-repair warning never hides the
    // rest of the canonical Staff Master directory.
    if (isHeadmaster) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (token) {
          const teachingProfileResponse = await fetch('/api/admin/headmaster-teaching-profile', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!teachingProfileResponse.ok) {
            const payload = await teachingProfileResponse.json().catch(() => ({}));
            console.warn(payload.error || 'Headmaster teaching profile could not be prepared yet.');
          }
        }
      } catch (error) {
        console.warn('Headmaster teaching identity preparation is temporarily unavailable.', error);
      }
    }

    try {
      const staffRecords = await StaffMasterService.list();
      setCanonicalStaffProfiles(staffRecords);
      const activeStaff = staffRecords.filter((row) => row.isActive !== false);
      if (activeStaff.length) {
        setActiveTeachers(activeStaff.map((row) => ({
          // Preserve the existing assignment identity convention for linked staff
          // (auth user id) while unlinked Staff Master rows use the canonical teacher id.
          // The cloud resolver understands both forms.
          id: row.userId || row.id,
          authUserId: row.userId || undefined,
          name: row.fullName || 'Staff Member',
          email: '',
          role: row.userId === userId && isHeadmaster ? 'headmaster' : 'teacher',
          username: row.shalarthId || row.employeeId || row.userId || row.id,
          mustChangePassword: false,
          shalarthId: row.shalarthId || undefined,
          employeeCode: row.employeeId || undefined,
          phone: row.mobileNumber || undefined,
          designation: row.userId === userId && isHeadmaster ? 'Headmaster' : (row.designation || undefined),
          qualification: row.qualification || undefined,
          joiningDate: row.joiningDate || undefined,
          status: 'Active',
          isActive: true,
          cloudProvisioned: Boolean(row.userId),
        } as User)));
      }
    } catch (error) {
      console.warn('Canonical Staff Master directory is unavailable; using the current compatibility cache.', error);
    }

    // R8: Academic Subject/Class Teacher mapping is canonical in Supabase. The existing
    // browser snapshot is imported only once when the cloud tables are still empty; after
    // that, cloud always wins so AI Studio Preview and the live site cannot diverge.
    if (isHeadmaster || isClerk) {
      try {
        // Only the Headmaster may initialize/change canonical Academic Assignments.
        // Clerk can read the canonical mapping but can never seed it from browser state.
        const cloud = isHeadmaster
          ? await AcademicAssignmentCloudService.bootstrap(local)
          : await AcademicAssignmentCloudService.load();
        const merged: MasterAcademicSetup = {
          ...local,
          subjectAllocations: cloud.subjectAllocations,
          classTeacherAssignments: cloud.classTeacherAssignments,
        };
        LocalERPDatabase.saveAcademicSetup(merged); // compatibility display cache only
        setSetup(merged);
        setAssignmentCloudError('');
        setAssignmentCloudStatus(cloud.initialized
          ? `Cloud Academic Mapping ready · ${cloud.subjectAllocations.length} Subject Allocation(s) · ${cloud.classTeacherAssignments.length} Class Teacher assignment(s)`
          : 'Cloud Academic Mapping is empty. Add or recover Headmaster assignments before Teacher access can be granted.');
        window.dispatchEvent(new CustomEvent('academic_setup_updated'));
        window.dispatchEvent(new CustomEvent('class_teacher_assignments_updated'));
      } catch (error: any) {
        const message = error?.message || 'Academic Assignment cloud bootstrap failed.';
        setAssignmentCloudError(message);
        setAssignmentCloudStatus('');
        console.warn('Academic Assignment cloud bootstrap failed.', error);
      }
    }
  };

  const migrateCurrentSubjectsToLive = async () => {
    if (subjectMigrationRunning || userRole !== 'headmaster') return;
    const currentSubjects: any[] = LocalERPDatabase.getAcademicSetup().subjects || [];
    const uniqueSubjects = Array.from(new Map(
      currentSubjects
        .map((item: any) => ({
          subjectName: String(item.subjectName || item.name || '').trim(),
          subjectCode: String(item.subjectCode || '').trim(),
          subjectType: String(item.subjectType || 'Core').trim() || 'Core'
        }))
        .filter((item: any) => item.subjectName)
        .map((item: any) => [item.subjectName.toLowerCase(), item])
    ).values()) as Array<{ subjectName: string; subjectCode: string; subjectType: string }>;

    if (!uniqueSubjects.length) {
      setSubjectMigrationNeeded(false);
      return;
    }
    if (!(await requestActionConfirm({ title: 'Move subjects to live master?', message: `Move ${uniqueSubjects.length} current subject(s) to the live Subject Master? Existing duplicates will be skipped.`, confirmLabel: 'Move Subjects', tone: 'warning' }))) return;

    setSubjectMigrationRunning(true);
    let created = 0;
    let skipped = 0;
    const failures: string[] = [];
    try {
      const existingResult = await SubjectService.getSubjects(false);
      if (existingResult.error) throw new Error(existingResult.error.message);
      const existingNames = new Set(existingResult.data.map(subject => subject.subjectName.trim().toLowerCase()));

      for (const subject of uniqueSubjects) {
        if (existingNames.has(subject.subjectName.toLowerCase())) {
          skipped += 1;
          continue;
        }
        const result = await SubjectService.createSubject(subject);
        if (result.error) failures.push(`${subject.subjectName}: ${result.error.message}`);
        else {
          created += 1;
          existingNames.add(subject.subjectName.toLowerCase());
        }
      }
      await loadLiveSubjects();
      if (failures.length) {
        alert(`Subject migration completed with ${failures.length} failure(s). ${created} created, ${skipped} skipped.\n${failures.join('\n')}`);
      } else {
        alert(`Subject migration completed. ${created} created and ${skipped} duplicate(s) skipped.`);
      }
    } catch (error: any) {
      alert(error?.message || 'Current subjects could not be moved to the live Subject Master.');
    } finally {
      setSubjectMigrationRunning(false);
    }
  };

  useEffect(() => {
    void loadSetupData();
    void loadLiveSubjects();
  }, []);

  useEffect(() => {
    if (!initialCategory) {
      if (focusedMode) {
        setActiveCategory(null);
        setActiveSubList('');
      }
      return;
    }

    const availableLists = getMasterSubLists(initialCategory);
    const requestedList = initialSubList && availableLists.some(item => item.id === initialSubList)
      ? initialSubList
      : availableLists[0]?.id || '';

    setActiveCategory(initialCategory);
    setActiveSubList(requestedList);
    setSelectedIds([]);
    setSearchQuery('');
    setStatusFilter('active');
  }, [initialCategory, initialSubList, focusedMode]);

  useEffect(() => {
    const firstActive = liveSubjects.find(subject => subject.isActive)?.subjectName;
    if (!firstActive) return;
    setAllocationForm(previous =>
      liveSubjects.some(subject => subject.isActive && subject.subjectName === previous.subjectName)
        ? previous
        : { ...previous, subjectName: firstActive }
    );
    setBulkAllocations(previous => previous.map(item =>
      liveSubjects.some(subject => subject.isActive && subject.subjectName === item.subjectName)
        ? item
        : { ...item, subjectName: firstActive }
    ));
  }, [liveSubjects]);

  if (!setup) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <Database className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
        <p className="text-sm font-semibold text-slate-600">Loading Master Databases...</p>
      </div>
    );
  }

  // Audited Save Setup wrapper. Assignment changes are cloud-first in R8; localStorage
  // is retained only as a same-browser compatibility cache after the server confirms save.
  const handleSaveSetup = async (updated: MasterAcademicSetup, action: string, detail: string): Promise<boolean> => {
    const assignmentChanged = JSON.stringify(updated.subjectAllocations || []) !== JSON.stringify(setup?.subjectAllocations || [])
      || JSON.stringify(updated.classTeacherAssignments || []) !== JSON.stringify(setup?.classTeacherAssignments || []);

    const commitLocalCache = (confirmed: MasterAcademicSetup) => {
      LocalERPDatabase.saveAcademicSetup(confirmed);
      LocalERPDatabase.addAuditLog(userId, userName, userRole as any, action, 'Master Data', detail);
      setSetup(confirmed);
      setSelectedIds([]);
      window.dispatchEvent(new CustomEvent('academic_setup_updated'));
      if (assignmentChanged || action.includes('CLASS_TEACHER')) {
        window.dispatchEvent(new CustomEvent('class_teacher_assignments_updated'));
      }
    };

    if (!assignmentChanged) {
      commitLocalCache(updated);
      return true;
    }

    if (!isHeadmaster) {
      alert('Only the Headmaster can change Subject/Class Teacher academic assignments.');
      return false;
    }

    try {
      const cloud = await AcademicAssignmentCloudService.sync(updated);
      setAssignmentCloudError('');
      setAssignmentCloudStatus(`Cloud Academic Mapping saved · ${cloud.subjectAllocations.length} Subject Allocation(s) · ${cloud.classTeacherAssignments.length} Class Teacher assignment(s)`);
      commitLocalCache({
        ...updated,
        subjectAllocations: cloud.subjectAllocations,
        classTeacherAssignments: cloud.classTeacherAssignments,
      });
      return true;
    } catch (error: any) {
      const message = error?.message || 'Academic Assignment cloud save failed. No assignment change was confirmed.';
      setAssignmentCloudError(message);
      alert(message);
      return false;
    }
  };

  // Sub-lists configurations mapper
  const getSubListsForCategory = (cat: MasterCategory) => getMasterSubLists(cat);


  // Helper to resolve lists
  const resolveList = (listId: string): any[] => {
    if (!setup) return [];
    if (listId === 'subjects') {
      return liveSubjects.map(subject => ({
        id: subject.id,
        name: subject.subjectName,
        subjectName: subject.subjectName,
        subjectCode: subject.subjectCode,
        subjectType: subject.subjectType,
        isActive: subject.isActive
      }));
    }
    if (listId === 'teacherProfiles') {
      return canonicalStaffProfiles.map((row) => ({
        id: row.id,
        userId: row.userId,
        authUserId: row.userId || undefined,
        fullName: row.fullName,
        name: row.fullName,
        employeeId: row.employeeId,
        shalarthId: row.shalarthId,
        designation: row.designation,
        qualification: row.qualification,
        joiningDate: row.joiningDate,
        mobileNumber: row.mobileNumber,
        email: '',
        status: row.isActive ? 'Active' : 'Inactive',
        isActive: row.isActive,
        source: 'canonical_staff_master',
      }));
    }
    return (setup as any)[listId] || [];
  };

  const resolveListFromSetup = (source: MasterAcademicSetup, listId: string): any[] =>
    ((source as any)[listId] || []) as any[];

  // Calculate statistics for the main dashboard cards
  const getCategoryStats = (cat: MasterCategory) => {
    const subLists = getSubListsForCategory(cat);
    let total = 0;
    let active = 0;
    let inactive = 0;

    subLists.forEach(sub => {
      const list = resolveList(sub.id);
      list.forEach((item: any) => {
        total++;
        if (item.isActive !== false && item.isEnabled !== false) {
          active++;
        } else {
          inactive++;
        }
      });
    });

    return { total, active, inactive };
  };

  // Trigger auto select first list on choosing category
  const handleSelectCategory = (cat: MasterCategory) => {
    setActiveCategory(cat);
    const lists = getSubListsForCategory(cat);
    if (lists && lists.length > 0) {
      setActiveSubList(lists[0].id);
    }
    setSearchQuery('');
    setStatusFilter('active');
    setSelectedIds([]);
  };

  // CRUD Actions
  const handleAddOrEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setup || !activeSubList || !canEditActiveList) return;

    const list = [...resolveList(activeSubList)];
    let auditAction = '';
    let auditDetail = '';

    if (activeSubList === 'subjects') {
      const cleanName = formName.trim();
      if (!cleanName) {
        alert('Subject name cannot be empty.');
        return;
      }
      const duplicate = liveSubjects.some(subject =>
        subject.subjectName.trim().toLowerCase() === cleanName.toLowerCase() &&
        (!editingItem || subject.id !== editingItem.id)
      );
      if (duplicate) {
        alert('A subject with this name already exists in the live Subject Master.');
        return;
      }
      const result = editingItem
        ? await SubjectService.updateSubject(editingItem.id, { subjectName: cleanName })
        : await SubjectService.createSubject({ subjectName: cleanName });
      if (result.error) {
        alert(result.error.message || 'Subject could not be saved.');
        return;
      }
      LocalERPDatabase.addAuditLog(userId, userName, userRole as any, editingItem ? 'EDIT_LIVE_SUBJECT' : 'ADD_LIVE_SUBJECT', 'Master Data', `${editingItem ? 'Updated' : 'Added'} live subject ${cleanName}`);
      await loadLiveSubjects();
      setShowAddModal(false);
      setEditingItem(null);
      setFormName('');
      return;
    }

    if (activeSubList === 'locations') {
      if (!locVillage.trim()) {
        alert('Village / City name is required.');
        return;
      }
      if (editingItem) {
        const idx = list.findIndex(item => item.id === editingItem.id);
        if (idx >= 0) {
          list[idx] = {
            ...list[idx],
            state: locState,
            district: locDistrict,
            taluka: locTaluka,
            village: locVillage.trim()
          };
          auditAction = 'EDIT_LOCATION_MASTER';
          auditDetail = `Updated location: ${locVillage}, ${locTaluka}`;
        }
      } else {
        const isDuplicate = list.some(item => 
          item.village.toLowerCase() === locVillage.trim().toLowerCase() && 
          item.taluka.toLowerCase() === locTaluka.toLowerCase()
        );
        if (isDuplicate) {
          alert('🚨 Warning: This Village/Taluka location entry already exists!');
          return;
        }
        list.push({
          id: `loc_${Date.now()}`,
          state: locState,
          district: locDistrict,
          taluka: locTaluka,
          village: locVillage.trim(),
          isActive: true
        });
        auditAction = 'ADD_LOCATION_MASTER';
        auditDetail = `Added location entry: ${locVillage.trim()}, ${locTaluka}`;
      }
    } else if (activeSubList === 'teacherProfiles') {
      if (!teacherForm.shalarthId.trim()) {
        alert('SHALARTH ID is mandatory!');
        return;
      }
      if (!teacherForm.fullName.trim()) {
        alert('Teacher Full Name is mandatory!');
        return;
      }
      const shalarthDup = list.some(item => item.shalarthId.toLowerCase() === teacherForm.shalarthId.trim().toLowerCase() && (!editingItem || item.id !== editingItem.id));
      if (shalarthDup) {
        alert('🚨 Validation Error: A teacher with this SHALARTH ID already exists!');
        return;
      }
      if (teacherForm.employeeId.trim()) {
        const empDup = list.some(item => item.employeeId.toLowerCase() === teacherForm.employeeId.trim().toLowerCase() && (!editingItem || item.id !== editingItem.id));
        if (empDup) {
          alert('🚨 Validation Error: A teacher with this Employee ID already exists!');
          return;
        }
      }

      const generatedDobInWords = convertDateToWords(teacherForm.dob);
      let teacherId = editingItem ? editingItem.id : `tch_${Date.now()}`;
      let generatedEmployeeId = teacherForm.employeeId.trim() || `EMP${String(list.length + 1).padStart(3, '0')}`;

      const savedProfile = {
        ...teacherForm,
        id: teacherId,
        employeeId: generatedEmployeeId,
        dobInWords: generatedDobInWords,
        shalarthId: teacherForm.shalarthId.trim()
      };

      if (editingItem) {
        const idx = list.findIndex(item => item.id === editingItem.id);
        if (idx >= 0) {
          list[idx] = savedProfile;
          auditAction = 'EDIT_TEACHER_PROFILE';
          auditDetail = `Updated profile of ${teacherForm.fullName}`;
        }
      } else {
        list.push(savedProfile);
        auditAction = 'ADD_TEACHER_PROFILE';
        auditDetail = `Created profile of ${teacherForm.fullName}`;
      }

      const users = [...LocalERPDatabase.getUsers()];
      const existingUserIdx = users.findIndex(u => (u.shalarthId && u.shalarthId === savedProfile.shalarthId) || (u.username && u.username === savedProfile.shalarthId));
      if (existingUserIdx >= 0) {
        users[existingUserIdx] = {
          ...users[existingUserIdx],
          name: savedProfile.fullName,
          email: savedProfile.email || users[existingUserIdx].email,
          phone: savedProfile.mobileNumber,
          gender: savedProfile.gender as any,
          dob: savedProfile.dob,
          qualification: savedProfile.qualification,
          designation: savedProfile.designation,
          address: savedProfile.address,
          status: savedProfile.status === 'Active' ? 'Active' : 'Inactive'
        };
        localStorage.setItem('nhs_erp_users', JSON.stringify(users));
      } else {
        // Creating a staff master record must not silently create a local-only
        // password. Add a pending login request without credentials; the
        // Headmaster completes it from Permanent Staff Login Management.
        const newUser: User = {
          id: teacherId,
          name: savedProfile.fullName,
          email: `${savedProfile.shalarthId.toLowerCase()}@school.local`,
          role: 'teacher',
          username: savedProfile.shalarthId,
          mustChangePassword: false,
          shalarthId: savedProfile.shalarthId,
          phone: savedProfile.mobileNumber,
          designation: savedProfile.designation,
          gender: savedProfile.gender as any,
          dob: savedProfile.dob,
          status: 'Pending',
          isActive: false
        };
        users.push(newUser);
        localStorage.setItem('nhs_erp_users', JSON.stringify(users));
      }
    } else if (activeSubList === 'subjectAllocations') {
      if (isBulkAllocation) {
        if (!allocationForm.teacherId) {
          alert('Please select a teacher!');
          return;
        }
        if (bulkAllocations.length === 0) {
          alert('Please enter at least one subject-period mapping!');
          return;
        }

        let addedCount = 0;
        let skippedCount = 0;
        const teacher = activeTeachers.find(t => t.id === allocationForm.teacherId);
        const teacherName = teacher ? teacher.name : 'Unknown Teacher';

        bulkAllocations.forEach(ba => {
          const isDup = list.some(item => 
            item.academicYear === allocationForm.academicYear &&
            item.teacherId === allocationForm.teacherId &&
            item.className === allocationForm.className &&
            item.divisionName === allocationForm.divisionName &&
            item.subjectName === ba.subjectName
          );

          if (!isDup && ba.subjectName) {
            list.push({
              id: `alloc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              academicYear: allocationForm.academicYear,
              teacherId: allocationForm.teacherId,
              teacherName: teacherName,
              className: allocationForm.className,
              divisionName: allocationForm.divisionName,
              subjectName: ba.subjectName,
              weeklyPeriods: ba.periods || 5,
              isActive: true
            });
            addedCount++;
          } else {
            skippedCount++;
          }
        });

        auditAction = 'BULK_SUBJECT_ALLOCATION';
        auditDetail = `Bulk allocated ${addedCount} subjects for ${teacherName}`;
      } else {
        if (!allocationForm.teacherId) {
          alert('Please select a teacher!');
          return;
        }
        const teacher = activeTeachers.find(t => t.id === allocationForm.teacherId);
        const teacherName = teacher ? teacher.name : 'Unknown Teacher';

        const isDup = list.some(item => 
          item.academicYear === allocationForm.academicYear &&
          item.teacherId === allocationForm.teacherId &&
          item.className === allocationForm.className &&
          item.divisionName === allocationForm.divisionName &&
          item.subjectName === allocationForm.subjectName &&
          (!editingItem || item.id !== editingItem.id)
        );

        if (isDup) {
          alert('🚨 Duplicate Entry: This teacher is already allocated to teach this subject in the selected Class/Division!');
          return;
        }

        const allocationData = {
          ...allocationForm,
          id: editingItem ? editingItem.id : `alloc_${Date.now()}`,
          teacherName: teacherName
        };

        if (editingItem) {
          const idx = list.findIndex(item => item.id === editingItem.id);
          if (idx >= 0) {
            list[idx] = allocationData;
            auditAction = 'EDIT_SUBJECT_ALLOCATION';
            auditDetail = `Updated allocation: ${teacherName} for ${allocationForm.subjectName}`;
          }
        } else {
          list.push(allocationData);
          auditAction = 'ADD_SUBJECT_ALLOCATION';
          auditDetail = `Created allocation: ${teacherName} for ${allocationForm.subjectName}`;
        }
      }
    } else if (activeSubList === 'classTeacherAssignments') {
      if (!assignmentForm.teacherId) {
        alert('Please select a teacher!');
        return;
      }

      const teacher = activeTeachers.find(t => t.id === assignmentForm.teacherId);
      const teacherName = teacher ? teacher.name : 'Unknown Teacher';

      const existingCTIdx = list.findIndex(item => 
        item.academicYear === assignmentForm.academicYear &&
        item.className === assignmentForm.className &&
        item.divisionName === assignmentForm.divisionName &&
        (!editingItem || item.id !== editingItem.id)
      );

      if (existingCTIdx >= 0) {
        // R8: Class Teacher status is never written into a browser-local user profile.
        // Replacing a scope only changes the canonical cloud Academic Assignment.
        list.splice(existingCTIdx, 1);
      }

      const assignmentData = {
        ...assignmentForm,
        id: editingItem ? editingItem.id : `cta_${Date.now()}`,
        teacherName: teacherName
      };

      if (editingItem) {
        const idx = list.findIndex(item => item.id === editingItem.id);
        if (idx >= 0) {
          list[idx] = assignmentData;
          auditAction = 'EDIT_CLASS_TEACHER';
          auditDetail = `Assigned ${teacherName} as CT for ${assignmentForm.className} ${assignmentForm.divisionName}`;
        }
      } else {
        list.push(assignmentData);
        auditAction = 'ADD_CLASS_TEACHER';
        auditDetail = `Assigned ${teacherName} as CT for ${assignmentForm.className} ${assignmentForm.divisionName}`;
      }
    } else {
      if (!formName.trim()) {
        alert('Name field cannot be empty.');
        return;
      }
      if (editingItem) {
        const idx = list.findIndex(item => item.id === editingItem.id);
        if (idx >= 0) {
          list[idx] = {
            ...list[idx],
            name: formName.trim(),
            // Map legacy fields
            year: activeSubList === 'academicYears' ? formName.trim() : undefined,
            className: activeSubList === 'classes' ? formName.trim() : undefined,
            divisionName: activeSubList === 'divisions' ? formName.trim() : undefined,
            boardName: activeSubList === 'boards' ? formName.trim() : undefined,
            documentName: activeSubList === 'documents' ? formName.trim() : undefined,
            termName: activeSubList === 'examTerms' ? formName.trim() : undefined,
            subjectName: activeSubList === 'subjects' ? formName.trim() : undefined
          };
          auditAction = `EDIT_MASTER_${activeSubList.toUpperCase()}`;
          auditDetail = `Updated entry in ${activeSubList} to: ${formName.trim()}`;
        }
      } else {
        const isDuplicate = list.some(item => {
          const checkName = item.name || item.subjectName || item.year || item.className || item.divisionName || item.boardName || item.documentName || item.termName || '';
          return checkName.toLowerCase() === formName.trim().toLowerCase();
        });
        if (isDuplicate) {
          alert('🚨 Entry with this name already exists in master list!');
          return;
        }

        const newItem: any = {
          id: `mst_${Date.now()}`,
          name: formName.trim(),
          isActive: true
        };

        // Legacy mapping fields
        if (activeSubList === 'academicYears') {
          newItem.year = formName.trim();
          newItem.isLocked = false;
        } else if (activeSubList === 'classes') {
          newItem.className = formName.trim();
          newItem.isEnabled = true;
        } else if (activeSubList === 'divisions') {
          newItem.divisionName = formName.trim();
          newItem.isEnabled = true;
        } else if (activeSubList === 'boards') {
          newItem.boardName = formName.trim();
          newItem.isDefault = false;
          newItem.isEnabled = true;
        } else if (activeSubList === 'documents') {
          newItem.documentName = formName.trim();
          newItem.isRequired = true;
        } else if (activeSubList === 'examTerms') {
          newItem.termName = formName.trim();
          newItem.maxMarksWeightage = 20;
        } else if (activeSubList === 'subjects') {
          newItem.subjectName = formName.trim();
          newItem.subjectCode = `SUB-${String(list.length + 1).padStart(2, '0')}`;
          newItem.subjectType = 'Core';
          newItem.language = 'None';
          newItem.isScholastic = true;
          newItem.boardMapping = [];
          newItem.classMapping = [];
          newItem.maxMarks = 100;
          newItem.passingMarks = 35;
          newItem.printOrder = list.length + 1;
        }

        list.push(newItem);
        auditAction = `ADD_MASTER_${activeSubList.toUpperCase()}`;
        auditDetail = `Added new entry to ${activeSubList}: ${formName.trim()}`;
      }
    }

    const updatedSetup = {
      ...setup,
      [activeSubList]: list
    };

    const saved = await handleSaveSetup(updatedSetup, auditAction, auditDetail);
    if (!saved) return;
    setShowAddModal(false);
    setEditingItem(null);
    setFormName('');
    setLocVillage('');
  };

  const handleToggleStatus = async (item: any) => {
    if (!canEditActiveList) return;
    if (activeSubList === 'subjects') {
      const nextActive = !(item.isActive !== false);
      const result = await SubjectService.updateSubject(item.id, { isActive: nextActive });
      if (result.error) {
        alert(result.error.message || 'Subject status could not be updated.');
        return;
      }
      LocalERPDatabase.addAuditLog(userId, userName, userRole as any, 'TOGGLE_LIVE_SUBJECT', 'Master Data', `Set ${item.subjectName || item.name} to ${nextActive ? 'Active' : 'Inactive'}`);
      await loadLiveSubjects();
      return;
    }
    const list = [...resolveList(activeSubList)];
    const idx = list.findIndex(i => i.id === item.id);
    if (idx >= 0) {
      const currentActive = list[idx].isActive !== false && list[idx].isEnabled !== false;
      const nextVal = !currentActive;

      // Soft Toggle Status
      list[idx].isActive = nextVal;
      if (list[idx].isEnabled !== undefined) list[idx].isEnabled = nextVal;

      const updatedSetup = {
        ...setup,
        [activeSubList]: list
      };

      const name = item.name || item.year || item.className || item.divisionName || item.village || '';
      await handleSaveSetup(
        updatedSetup,
        `TOGGLE_MASTER_${activeSubList.toUpperCase()}`,
        `Set status of ${name} to ${nextVal ? 'Active' : 'Inactive'}`
      );
    }
  };

  const handleDeleteItem = async (item: any) => {
    if (!canEditActiveList || !setup) return;

    if (activeSubList === 'teacherProfiles') {
      const teacherName = item.fullName || item.name || 'selected teacher';
      const confirmed = await requestActionConfirm({
        title: 'Archive teacher?',
        message: `Archive teacher "${teacherName}"?\n\nThe teacher profile and historical records will be retained, but the teacher will be deactivated and all current subject/class-teacher allocations will be disabled. The Supabase login is managed separately in Manage Staff Accounts.`,
        confirmLabel: 'Archive Teacher',
        tone: 'danger'
      });
      if (!confirmed) return;

      const updatedSetup: MasterAcademicSetup = {
        ...setup,
        teacherProfiles: (setup.teacherProfiles || []).map(profile =>
          profile.id === item.id ? { ...profile, status: 'Inactive', isActive: false } : profile
        ),
        subjectAllocations: (setup.subjectAllocations || []).map(allocation =>
          allocation.teacherId === item.id || allocation.teacherName === teacherName
            ? { ...allocation, isActive: false }
            : allocation
        ),
        classTeacherAssignments: (setup.classTeacherAssignments || []).map(assignment =>
          assignment.teacherId === item.id || assignment.teacherName === teacherName
            ? { ...assignment, isActive: false }
            : assignment
        )
      };

      const users = LocalERPDatabase.getUsers().map(userRecord => {
        const matches = [userRecord.shalarthId, userRecord.employeeCode, userRecord.username]
          .some(identifier => identifier && [item.shalarthId, item.employeeId].includes(identifier))
          || userRecord.name?.trim().toLowerCase() === teacherName.trim().toLowerCase();
        if (!matches || userRecord.cloudProvisioned) return userRecord;
        return { ...userRecord, status: 'Inactive' as const, isActive: false };
      });
      LocalERPDatabase.saveUsers(users);
      const saved = await handleSaveSetup(updatedSetup, 'ARCHIVE_TEACHER_PROFILE', `Archived teacher profile ${teacherName} and disabled current allocations.`);
      if (!saved) return;
      await loadSetupData();
      setStatusFilter('active');
      alert(`${teacherName} was archived successfully and removed from the active list. Select the Inactive filter to view the retained historical profile. Use Manage Staff Accounts separately if the Supabase login must also be deactivated or deleted.`);
      return;
    }

    if (activeSubList === 'subjects') {
      const subjectName = item.subjectName || item.name || 'selected subject';
      if (isClerk) {
        if (!(await requestActionConfirm({ title: 'Archive subject?', message: `Archive subject "${subjectName}"? Existing academic history will remain available.`, confirmLabel: 'Archive Subject', tone: 'danger' }))) return;
        const result = await SubjectService.updateSubject(item.id, { isActive: false });
        if (result.error) {
          alert(result.error.message || 'Subject archive failed.');
          return;
        }
        LocalERPDatabase.addAuditLog(userId, userName, userRole as any, 'ARCHIVE_LIVE_SUBJECT', 'Master Data', `Archived live subject ${subjectName}`);
        await loadLiveSubjects();
        setSelectedIds(ids => ids.filter(id => id !== item.id));
        alert(`Subject "${subjectName}" was archived. Headmaster retains permanent-delete authority.`);
        return;
      }
      const normalizedName = subjectName.trim().toLowerCase();
      const localAllocations = setup.subjectAllocations || [];
      const localRequirements = setup.subjectWeeklyRequirements || [];
      const timetableRows = LocalERPDatabase.getTimetable();
      const inUse = localAllocations.some(a => String(a.subjectName || '').trim().toLowerCase() === normalizedName)
        || localRequirements.some(r => String(r.subjectName || '').trim().toLowerCase() === normalizedName)
        || timetableRows.some(row => String(row.subject || '').trim().toLowerCase() === normalizedName);

      if (inUse) {
        alert('This subject is already in use and cannot be permanently deleted. Deactivate it instead.');
        return;
      }
      if (!(await requestActionConfirm({ title: 'Delete unused subject?', message: `Permanently delete unused subject "${subjectName}" from the live Subject Master?`, confirmLabel: 'Delete Subject', tone: 'danger' }))) return;
      const result = await SubjectService.deleteSubject(item.id);
      if (result.error) {
        alert(result.error.message || 'Subject delete failed.');
        return;
      }
      LocalERPDatabase.addAuditLog(userId, userName, userRole as any, 'DELETE_LIVE_SUBJECT', 'Master Data', `Deleted unused live subject ${subjectName}`);
      await loadLiveSubjects();
      setSelectedIds(ids => ids.filter(id => id !== item.id));
      alert(`Subject "${subjectName}" was deleted successfully.`);
      return;
    }

    if (activeSubList === 'subjectAllocations' || activeSubList === 'classTeacherAssignments') {
      const recordName = activeSubList === 'subjectAllocations'
        ? `${item.teacherName || 'Teacher'} — ${item.subjectName || 'Subject'} (${item.className || ''} ${item.divisionName || ''})`
        : `${item.className || ''} ${item.divisionName || ''} — ${item.teacherName || 'Teacher'}`;
      if (isClerk) {
        if (!(await requestActionConfirm({ title: 'Archive assignment?', message: `Archive current ${activeSubList === 'subjectAllocations' ? 'subject allocation' : 'class-teacher assignment'} "${recordName}"?`, confirmLabel: 'Archive', tone: 'danger' }))) return;
        const updatedList = resolveList(activeSubList).map(entry => entry.id === item.id ? { ...entry, isActive: false } : entry);
        const updatedSetup = { ...setup, [activeSubList]: updatedList } as MasterAcademicSetup;
        const saved = await handleSaveSetup(updatedSetup, `ARCHIVE_${activeSubList.toUpperCase()}`, `Archived current configuration: ${recordName}`);
        if (saved) alert(`"${recordName}" was archived. Headmaster retains permanent-delete authority.`);
        return;
      }
      if (!(await requestActionConfirm({ title: 'Delete assignment?', message: `Delete current ${activeSubList === 'subjectAllocations' ? 'subject allocation' : 'class-teacher assignment'} "${recordName}"?`, confirmLabel: 'Delete Assignment', tone: 'danger' }))) return;

      try {
        const cloud = await AcademicAssignmentCloudService.deleteAssignment(
          activeSubList === 'subjectAllocations' ? 'subject' : 'class_teacher',
          item
        );
        const updatedSetup: MasterAcademicSetup = {
          ...setup,
          subjectAllocations: cloud.subjectAllocations,
          classTeacherAssignments: cloud.classTeacherAssignments,
        };
        LocalERPDatabase.saveAcademicSetup(updatedSetup);
        LocalERPDatabase.addAuditLog(
          userId,
          userName,
          userRole as any,
          `DELETE_${activeSubList.toUpperCase()}`,
          'Master Data',
          `Permanently removed current cloud configuration: ${recordName}`
        );
        setSetup(updatedSetup);
        setStatusFilter('active');
        setSelectedIds(ids => ids.filter(id => id !== item.id));
        setAssignmentCloudError('');
        setAssignmentCloudStatus(`${activeSubList === 'subjectAllocations' ? 'Subject assignment' : 'Class Teacher assignment'} permanently deleted from the canonical school cloud.`);
        window.dispatchEvent(new CustomEvent('academic_setup_updated'));
        window.dispatchEvent(new CustomEvent('class_teacher_assignments_updated'));
      } catch (error: any) {
        const message = error?.message || 'Academic Assignment could not be permanently deleted.';
        setAssignmentCloudError(message);
        alert(message);
      }
      return;
    }

    if (item.isSystem) {
      alert('🚨 Access Denied: This is a protected school system-level master entry. Deletion is strictly locked.');
      return;
    }

    const itemName = item.name || item.year || item.className || item.village || '';
    const confirmMsg = `To maintain historical logs, this record will be deactivated rather than physically erased.\n\nDeactivate "${itemName}"?`;
    if (!(await requestActionConfirm({ title: 'Deactivate master record?', message: confirmMsg, confirmLabel: 'Deactivate', tone: 'danger' }))) return;

    const list = [...resolveList(activeSubList)];
    const idx = list.findIndex(entry => entry.id === item.id);
    if (idx < 0) {
      alert('The selected record was not found. Reload the list and try again.');
      return;
    }

    list[idx] = {
      ...list[idx],
      isActive: false,
      ...(list[idx].isEnabled !== undefined ? { isEnabled: false } : {})
    };

    const updatedSetup = { ...setup, [activeSubList]: list } as MasterAcademicSetup;
    const saved = await handleSaveSetup(
      updatedSetup,
      `SOFT_DELETE_${activeSubList.toUpperCase()}`,
      `Soft-deleted / deactivated master item: ${itemName}`
    );
    if (!saved) return;
    setStatusFilter('active');
    alert(`"${itemName}" was deactivated and removed from the active list. Select the Inactive filter to restore or review it.`);
  };

  // Bulk Actions
  const handleBulkStatusChange = async (status: boolean) => {
    if (!canEditActiveList || selectedIds.length === 0) return;

    if (activeSubList === 'subjects') {
      if (!(await requestActionConfirm({ title: `${status ? 'Activate' : 'Deactivate'} selected subjects?`, message: `${status ? 'Activate' : 'Deactivate'} ${selectedIds.length} selected subject(s)?`, confirmLabel: status ? 'Activate' : 'Deactivate', tone: status ? 'warning' : 'danger' }))) return;
      const failures: string[] = [];
      for (const id of selectedIds) {
        const result = await SubjectService.updateSubject(id, { isActive: status });
        if (result.error) failures.push(id);
      }
      await loadLiveSubjects();
      setSelectedIds([]);
      if (failures.length) alert(`${failures.length} subject(s) could not be updated. Please retry.`);
      return;
    }

    const list = [...resolveList(activeSubList)];
    let count = 0;
    const updatedList = list.map(item => {
      if (selectedIds.includes(item.id)) {
        if (item.isSystem && !status) {
          // Cannot deactivate system entries in bulk deactivation
          return item;
        }
        count++;
        return {
          ...item,
          isActive: status,
          isEnabled: status
        };
      }
      return item;
    });

    const updatedSetup = {
      ...setup,
      [activeSubList]: updatedList
    };

    await handleSaveSetup(
      updatedSetup,
      `BULK_STATUS_${activeSubList.toUpperCase()}`,
      `Bulk updated status of ${count} records to ${status ? 'Active' : 'Inactive'}`
    );
  };

  // Excel export
  const handleExportCSV = () => {
    const list = resolveList(activeSubList);
    if (list.length === 0) return;

    let headers = ['ID', 'Name', 'Status'];
    if (activeSubList === 'locations') {
      headers = ['ID', 'State', 'District', 'Taluka', 'Village/City', 'Status'];
    }

    const rows = list.map((item: any) => {
      const status = (item.isActive !== false && item.isEnabled !== false) ? 'Active' : 'Inactive';
      if (activeSubList === 'locations') {
        return [item.id, item.state, item.district, item.taluka, item.village, status];
      }
      const name = item.name || item.subjectName || item.year || item.className || item.divisionName || item.boardName || item.documentName || item.termName || '';
      return [item.id, name, status];
    });

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Master Data');
    XLSX.writeFile(workbook, `Classtago_Master_${activeSubList}_${Date.now()}.xlsx`);

    LocalERPDatabase.addAuditLog(userId, userName, userRole as any, 'EXPORT_MASTER_EXCEL', 'Master Data', `Exported ${list.length} rows from ${activeSubList}`);
  };

  // Excel / CSV Import Parser
  const handleImportCSV = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditActiveList || !csvInput.trim() || !setup || !activeSubList) return;

    try {
      const lines = csvInput.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        setImportError('Invalid CSV content. Header and at least one data row is required.');
        return;
      }

      const list = [...resolveList(activeSubList)];
      let count = 0;

      // Parse Location Master CSV
      if (activeSubList === 'locations') {
        // Expected columns: State, District, Taluka, Village/City
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.replace(/^["']|["']$/g, '').trim());
          if (cols.length >= 4) {
            const state = cols[0] || 'Maharashtra';
            const district = cols[1] || 'Nandurbar';
            const taluka = cols[2] || 'Taloda';
            const village = cols[3];

            if (village) {
              const duplicate = list.some(item => 
                item.village.toLowerCase() === village.toLowerCase() && 
                item.taluka.toLowerCase() === taluka.toLowerCase()
              );
              if (!duplicate) {
                list.push({
                  id: `loc_imp_${Date.now()}_${i}`,
                  state,
                  district,
                  taluka,
                  village,
                  isActive: true
                });
                count++;
              }
            }
          }
        }
      } else {
        // Expected columns: Name
        for (let i = 1; i < lines.length; i++) {
          const name = lines[i].replace(/^["']|["']$/g, '').trim();
          if (name) {
            const duplicate = list.some(item => {
              const checkName = item.name || item.subjectName || item.year || item.className || item.divisionName || item.boardName || item.documentName || item.termName || '';
              return checkName.toLowerCase() === name.toLowerCase();
            });
            if (!duplicate) {
              const newItem: any = {
                id: `mst_imp_${Date.now()}_${i}`,
                name,
                isActive: true
              };

              // Map legacy fields
              if (activeSubList === 'academicYears') {
                newItem.year = name;
                newItem.isLocked = false;
              } else if (activeSubList === 'classes') {
                newItem.className = name;
                newItem.isEnabled = true;
              } else if (activeSubList === 'divisions') {
                newItem.divisionName = name;
                newItem.isEnabled = true;
              } else if (activeSubList === 'boards') {
                newItem.boardName = name;
                newItem.isDefault = false;
                newItem.isEnabled = true;
              } else if (activeSubList === 'documents') {
                newItem.documentName = name;
                newItem.isRequired = true;
              } else if (activeSubList === 'examTerms') {
                newItem.termName = name;
                newItem.maxMarksWeightage = 20;
              }

              list.push(newItem);
              count++;
            }
          }
        }
      }

      if (count === 0) {
        alert("No new records were added. All records in CSV are already present (duplicates filtered out).");
      } else {
        const updatedSetup = {
          ...setup,
          [activeSubList]: list
        };
        const saved = await handleSaveSetup(updatedSetup, `IMPORT_MASTER_CSV_${activeSubList.toUpperCase()}`, `Imported ${count} new records via copy-paste Excel sheet`);
        if (!saved) return;
        alert(`Successfully imported ${count} new records!`);
      }

      setShowImportModal(false);
      setCsvInput('');
      setImportError(null);
    } catch (err: any) {
      setImportError(`Failed to parse: ${err.message || err}`);
    }
  };

  const getCategoryIcon = (cat: MasterCategory) => {
    switch (cat) {
      case 'location': return MapPin;
      case 'student': return Users;
      case 'teacher': return BookOpen;
      case 'subject': return Award;
      case 'document': return FileText;
      case 'certificate': return Award;
      case 'result': return CheckCircle2;
      case 'timetable': return Calendar;
      case 'academic': return Landmark;
    }
  };

  const getCategoryTitle = (cat: MasterCategory) => {
    switch (cat) {
      case 'location': return 'Location Masters';
      case 'student': return 'Student Master Data';
      case 'teacher': return 'Teacher Masters';
      case 'subject': return 'Subject Masters';
      case 'document': return 'Document Checklists';
      case 'certificate': return 'Certificate Templates';
      case 'result': return 'Academic Result Masters';
      case 'timetable': return 'Timetable Configs';
      case 'academic': return 'Academic Config Masters';
    }
  };

  // Filter & Sort list
  const getFilteredList = () => {
    const list = resolveList(activeSubList);
    return list
      .filter((item: any) => {
        let name = item.name || item.subjectName || item.gradeName || item.periodName || item.holidayName || item.year || item.className || item.divisionName || item.boardName || item.documentName || item.termName || item.village || '';
        
        let matchesQuery = false;
        if (activeSubList === 'teacherProfiles') {
          name = item.fullName || '';
          matchesQuery = name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (item.shalarthId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (item.employeeId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (item.designation || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (item.qualification || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (item.mobileNumber || '').toLowerCase().includes(searchQuery.toLowerCase());
        } else if (activeSubList === 'subjectAllocations') {
          name = `${item.teacherName} - ${item.className} ${item.divisionName}`;
          matchesQuery = (item.teacherName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (item.className || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (item.divisionName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (item.subjectName || '').toLowerCase().includes(searchQuery.toLowerCase());
        } else if (activeSubList === 'classTeacherAssignments') {
          name = `${item.className} ${item.divisionName} - ${item.teacherName}`;
          matchesQuery = (item.teacherName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (item.className || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (item.divisionName || '').toLowerCase().includes(searchQuery.toLowerCase());
        } else {
          matchesQuery = name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        (item.taluka || '').toLowerCase().includes(searchQuery.toLowerCase());
        }
        
        const active = item.isActive !== false && item.isEnabled !== false;
        const matchesFilter = 
          statusFilter === 'all' ? true :
          statusFilter === 'active' ? active : !active;

        return matchesQuery && matchesFilter;
      })
      .sort((a, b) => {
        let aVal = a.name || a.subjectName || a.gradeName || a.periodName || a.holidayName || a.year || a.className || a.divisionName || a.boardName || a.documentName || a.termName || a.village || '';
        let bVal = b.name || b.subjectName || b.gradeName || b.periodName || b.holidayName || b.year || b.className || b.divisionName || b.boardName || b.documentName || b.termName || b.village || '';
        
        if (activeSubList === 'teacherProfiles') {
          aVal = a.fullName || '';
          bVal = b.fullName || '';
        } else if (activeSubList === 'subjectAllocations') {
          aVal = a.teacherName || '';
          bVal = b.teacherName || '';
        } else if (activeSubList === 'classTeacherAssignments') {
          aVal = a.className || '';
          bVal = b.className || '';
        }

        if (sortDirection === 'asc') {
          return aVal.localeCompare(bVal);
        } else {
          return bVal.localeCompare(aVal);
        }
      });
  };

  const getSubjectAllocationGroups = () => {
    const rows = activeSubList === 'subjectAllocations' ? getFilteredList() : [];
    const grouped = new Map<string, { key: string; teacherId: string; teacherName: string; rows: any[] }>();

    rows.forEach((row: any) => {
      const teacherId = String(row.teacherId || '').trim();
      const teacherName = String(row.teacherName || 'Teacher').trim() || 'Teacher';
      const key = teacherId || `name:${teacherName.toLowerCase()}`;
      const existing = grouped.get(key);
      if (existing) {
        existing.rows.push(row);
      } else {
        grouped.set(key, { key, teacherId, teacherName, rows: [row] });
      }
    });

    return Array.from(grouped.values()).sort((a, b) => {
      const cmp = a.teacherName.localeCompare(b.teacherName);
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  };

  const openNewSubjectAllocationForTeacher = (teacherId: string, teacherName: string) => {
    setEditingItem(null);
    setIsBulkAllocation(false);
    setAllocationForm({
      academicYear: '2026-27',
      teacherId,
      teacherName,
      className: setup?.classes?.[0]?.className || 'Class 9',
      divisionName: setup?.divisions?.[0]?.divisionName || 'A',
      subjectName: liveSubjects.find(subject => subject.isActive)?.subjectName || '',
      weeklyPeriods: 5,
      isActive: true
    });
    setBulkAllocations([{ subjectName: liveSubjects.find(subject => subject.isActive)?.subjectName || '', periods: 6 }]);
    setShowAddModal(true);
  };

  const openEditSubjectAllocation = (item: any) => {
    setEditingItem(item);
    setIsBulkAllocation(false);
    setAllocationForm({
      academicYear: item.academicYear || '2026-27',
      teacherId: item.teacherId || '',
      teacherName: item.teacherName || '',
      className: item.className || 'Class 9',
      divisionName: item.divisionName || 'A',
      subjectName: item.subjectName || 'Urdu',
      weeklyPeriods: item.weeklyPeriods || 5,
      isActive: item.isActive !== false
    });
    setShowAddModal(true);
  };

  const handleSelectAll = (filteredList: any[]) => {
    if (selectedIds.length === filteredList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredList.map(item => item.id));
    }
  };

  return (
    <div className="space-y-8 text-left">
      
      {/* Upper Navigation Header bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-50 border border-slate-200 p-5 rounded-2xl no-print">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2 font-sans">
            <Database className="w-5 h-5 text-blue-600" />
            <span>{focusedMode ? (focusedTitle || (activeCategory ? getCategoryTitle(activeCategory) : 'Master Data Management')) : 'National High School Central ERP Masters'}</span>
          </h2>
          <p className="text-xs text-slate-500 font-sans mt-1">
            {focusedMode && activeCategory
              ? `Manage ${getSubListsForCategory(activeCategory).length} related master list${getSubListsForCategory(activeCategory).length === 1 ? '' : 's'} from one consistent workspace.`
              : 'Centralized dictionary of Location, Student, Teacher, and Timetable dropdown structures.'}
          </p>
        </div>

        {activeCategory && !focusedMode && (
          <button
            onClick={() => setActiveCategory(null)}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            &larr; Back to Categories
          </button>
        )}
      </div>

      {(assignmentCloudError || assignmentCloudStatus) && (isHeadmaster || isClerk) && (
        <div className={`no-print rounded-2xl border px-5 py-4 text-xs font-semibold ${assignmentCloudError ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          <div className="flex items-start gap-3">
            {assignmentCloudError ? <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
            <div>
              <div className="font-extrabold">{assignmentCloudError ? 'Academic Mapping cloud sync needs attention' : 'Academic Mapping cloud status'}</div>
              <div className="mt-1 font-medium">{assignmentCloudError || assignmentCloudStatus}</div>
              {assignmentCloudError && isHeadmaster && <div className="mt-1 text-[10px] font-bold">No browser-only assignment is being treated as production access. Fix the shown mapping issue and reopen this page to retry safely.</div>}
            </div>
          </div>
        </div>
      )}

      {assignmentCloudError && isHeadmaster && /could not resolve Teacher/i.test(assignmentCloudError) && (
        <div className="no-print rounded-2xl border border-amber-200 bg-amber-50 p-5 text-slate-800">
          <div className="flex items-start gap-3">
            <Users className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-extrabold text-amber-900">One-time Teacher identity repair</div>
              <p className="mt-1 text-xs font-medium text-amber-800">
                The old Academic Mapping contains legacy Teacher identities. Resolve all of them here once; the corrected mapping will then be stored in Supabase and used by Preview and Live.
              </p>
              <div className="mt-4 space-y-3">
                {getTeacherRepairRows().map((row) => {
                  const selectedValue = teacherRepairSelections[row.key] || row.suggestedId || '';
                  return (
                    <div key={row.key} className="grid gap-2 rounded-xl border border-amber-200 bg-white p-3 md:grid-cols-[minmax(0,1fr)_minmax(220px,1fr)] md:items-center">
                      <div>
                        <div className="text-xs font-extrabold text-slate-900">{row.teacherName || 'Unnamed legacy Teacher'}</div>
                        <div className="mt-0.5 break-all text-[10px] font-medium text-slate-500">Legacy ID: {row.teacherId || 'none'} · Used in {row.uses} assignment(s)</div>
                      </div>
                      <select
                        value={selectedValue}
                        onChange={(event) => setTeacherRepairSelections((current) => ({ ...current, [row.key]: event.target.value }))}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-amber-500"
                      >
                        <option value="">Select correct cloud Teacher</option>
                        {activeTeachers.map((teacher: any) => (
                          <option key={teacher.id} value={teacher.id}>
                            {teacher.name}{teacher.shalarthId ? ` · ${teacher.shalarthId}` : teacher.employeeCode ? ` · ${teacher.employeeCode}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
              {teacherRepairMessage && <div className="mt-3 text-xs font-bold text-amber-900">{teacherRepairMessage}</div>}
              <button
                type="button"
                onClick={repairTeacherMappingsAndSync}
                disabled={teacherRepairRunning}
                className="mt-4 rounded-lg bg-amber-700 px-4 py-2 text-xs font-extrabold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {teacherRepairRunning ? 'Repairing & syncing…' : 'Repair all Teacher mappings & sync'}
              </button>
            </div>
          </div>
        </div>
      )}


      {assignmentCloudError && isHeadmaster && /could not resolve Subject/i.test(assignmentCloudError) && (
        <div className="no-print rounded-2xl border border-sky-200 bg-sky-50 p-5 text-slate-800">
          <div className="flex items-start gap-3">
            <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-extrabold text-sky-900">One-time Subject identity repair</div>
              <p className="mt-1 text-xs font-medium text-sky-800">
                The old Academic Mapping contains Subject names that are not present in the canonical Cloud Subject Master. Resolve every missing Subject here once. No existing Subject or other Teacher assignment is deleted.
              </p>
              <div className="mt-4 space-y-3">
                {getSubjectRepairRows().map((row) => {
                  const selectedValue = subjectRepairSelections[row.key] || '';
                  return (
                    <div key={row.key} className="grid gap-2 rounded-xl border border-sky-200 bg-white p-3 md:grid-cols-[minmax(0,1fr)_minmax(240px,1fr)] md:items-center">
                      <div>
                        <div className="text-xs font-extrabold text-slate-900">{row.subjectName || 'Unnamed legacy Subject'}</div>
                        <div className="mt-0.5 text-[10px] font-medium text-slate-500">Used in {row.uses} active Subject Allocation(s)</div>
                      </div>
                      <select
                        value={selectedValue}
                        onChange={(event) => setSubjectRepairSelections((current) => ({ ...current, [row.key]: event.target.value }))}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-sky-500"
                      >
                        <option value="">Select correct Cloud Subject</option>
                        {liveSubjects.filter(subject => subject.isActive).map((subject) => (
                          <option key={subject.id} value={subject.id}>
                            {subject.subjectName}{subject.subjectCode ? ` · ${subject.subjectCode}` : ''}
                          </option>
                        ))}
                        <option value="__create__">＋ Create as new Cloud Subject: {row.subjectName}</option>
                      </select>
                    </div>
                  );
                })}
              </div>
              {subjectRepairMessage && <div className="mt-3 text-xs font-bold text-sky-900">{subjectRepairMessage}</div>}
              <button
                type="button"
                onClick={repairSubjectMappingsAndSync}
                disabled={subjectRepairRunning}
                className="mt-4 rounded-lg bg-sky-700 px-4 py-2 text-xs font-extrabold text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {subjectRepairRunning ? 'Repairing & syncing…' : 'Repair all Subject mappings & sync'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 1: CATEGORIES BENTO GRID DASHBOARD */}
      {!activeCategory && !focusedMode && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in no-print">
          {(['academic', 'location', 'student', 'teacher', 'subject', 'document', 'certificate', 'result', 'timetable'] as MasterCategory[]).map(cat => {
            const Icon = getCategoryIcon(cat);
            const stats = getCategoryStats(cat);
            
            return (
              <div 
                key={cat}
                onClick={() => handleSelectCategory(cat)}
                className="group relative bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md rounded-2xl p-6 transition-all cursor-pointer flex flex-col justify-between hover:-translate-y-0.5"
              >
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-blue-50 text-slate-600 group-hover:text-blue-600 flex items-center justify-center transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-sm tracking-tight">{getCategoryTitle(cat)}</h3>
                    <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                      Contains {getSubListsForCategory(cat).length} sub-master config tables.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-slate-100 text-center font-mono text-[10px]">
                  <div>
                    <span className="text-slate-400 block text-[9px] font-sans">Total</span>
                    <strong className="text-slate-800 font-bold">{stats.total}</strong>
                  </div>
                  <div>
                    <span className="text-emerald-500 block text-[9px] font-sans">Active</span>
                    <strong className="text-emerald-600 font-bold">{stats.active}</strong>
                  </div>
                  <div>
                    <span className="text-rose-400 block text-[9px] font-sans">Inactive</span>
                    <strong className="text-rose-500 font-bold">{stats.inactive}</strong>
                  </div>
                </div>

                <div className="absolute top-4 right-4 text-slate-300 group-hover:text-blue-500 transition-colors">
                  <ArrowUpDown className="w-4 h-4 rotate-90" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: INDIVIDUAL MASTER MANAGER TABLE VIEW */}
      {activeCategory && (
        <div className={`${focusedMode ? 'space-y-5' : 'grid grid-cols-1 xl:grid-cols-4 gap-8'} animate-fade-in no-print`}>
          
          {/* Sub-Lists Selection Column / Focused tabs */}
          <div className={`${focusedMode ? 'bg-white border border-slate-200 shadow-sm rounded-2xl p-4' : 'xl:col-span-1 bg-white border border-slate-200 shadow-sm rounded-2xl p-4 h-fit'} space-y-3`}>
            <div className="border-b border-slate-150 pb-2 text-xs font-bold uppercase tracking-wider text-slate-400 font-sans">
              Configurable Lists
            </div>
            
            <div className={focusedMode ? 'flex flex-wrap gap-2' : 'space-y-1'}>
              {getSubListsForCategory(activeCategory).map(sub => (
                <button
                  key={sub.id}
                  onClick={() => {
                    setActiveSubList(sub.id);
                    setSelectedIds([]);
                    setSearchQuery('');
                  }}
                  className={`${focusedMode ? 'min-h-11 w-auto' : 'w-full'} flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all text-left cursor-pointer ${
                    activeSubList === sub.id 
                      ? 'bg-blue-600 text-white' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Database className="w-3.5 h-3.5 opacity-70" />
                  <span>{sub.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Core Table Grid Column */}
          <div className={`${focusedMode ? '' : 'xl:col-span-3'} bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden flex flex-col`}>
            
            {/* Action Bar Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50/50 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm font-sans flex items-center gap-1.5">
                    <span>{getSubListsForCategory(activeCategory).find(s => s.id === activeSubList)?.label || 'Master List'}</span>
                    <span className="px-2 py-0.5 bg-blue-100 border border-blue-200 rounded-md text-blue-800 text-[10px] font-mono">
                      {activeSubList === 'subjectAllocations' ? `${getSubjectAllocationGroups().length} teachers · ${getFilteredList().length} assignments` : `${resolveList(activeSubList).length} items`}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-sans mt-0.5">
                    {canonicalStaffDirectory
                      ? 'Canonical staff identity is managed only in Staff Master. This legacy teacher directory remains read-only to prevent duplicate staff sources.'
                      : clerkReadOnlyCloudList
                        ? 'Cloud-controlled academic master: Clerk has review/export access; Headmaster owns subject and academic-assignment changes.'
                        : canEditActiveList
                          ? 'Add, edit and safely deactivate operational master entries. Permanent actions remain dependency-aware.'
                          : 'Read-only access for this master list.'}
                  </p>
                  {activeSubList === 'subjects' && subjectLoadError && (
                    <p className="text-[10px] font-bold text-rose-600 mt-1">{subjectLoadError}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleExportCSV}
                    className="px-3 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 text-[11px] font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                    title="Export list to Excel"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                    <span>Export Excel</span>
                  </button>

                  {canEditActiveList && (
                    <>
                      <button
                        onClick={() => setShowImportModal(true)}
                        className="px-3 py-1.5 border border-blue-200 text-blue-700 hover:bg-blue-50 text-[11px] font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                        title="Import list from Excel sheet copy-paste"
                      >
                        <Upload className="w-3.5 h-3.5 text-blue-400" />
                        <span>Import Excel</span>
                      </button>

                      <button
                        onClick={() => {
                          setEditingItem(null);
                          setFormName('');
                          setLocVillage('');
                          if (activeSubList === 'teacherProfiles') {
                            setTeacherForm({
                              employeeId: '',
                              shalarthId: '',
                              fullName: '',
                              fatherName: '',
                              motherName: '',
                              gender: 'Male',
                              dob: '',
                              dobInWords: '',
                              qualification: 'M.A., B.Ed.',
                              designation: 'Assistant Teacher',
                              joiningDate: '2026-06-01',
                              appointmentDate: '2026-06-01',
                              mobileNumber: '',
                              email: '',
                              address: '',
                              bloodGroup: 'B+',
                              photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
                              documents: [],
                              status: 'Active',
                              isActive: true
                            });
                          } else if (activeSubList === 'subjectAllocations') {
                            setIsBulkAllocation(false);
                            setAllocationForm({
                              academicYear: '2026-27',
                              teacherId: '',
                              teacherName: '',
                              className: setup?.classes?.[0]?.className || 'Class 9',
                              divisionName: setup?.divisions?.[0]?.divisionName || 'A',
                              subjectName: liveSubjects.find(subject => subject.isActive)?.subjectName || '',
                              weeklyPeriods: 5,
                              isActive: true
                            });
                            setBulkAllocations([{ subjectName: liveSubjects.find(subject => subject.isActive)?.subjectName || '', periods: 6 }]);
                          } else if (activeSubList === 'classTeacherAssignments') {
                            setAssignmentForm({
                              academicYear: '2026-27',
                              className: setup?.classes?.[0]?.className || 'Class 9',
                              divisionName: setup?.divisions?.[0]?.divisionName || 'A',
                              teacherId: '',
                              teacherName: '',
                              isActive: true
                            });
                          }
                          setShowAddModal(true);
                        }}
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-extrabold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{activeSubList === 'subjectAllocations' ? 'Add Assignment' : 'Add New Entry'}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {activeSubList === 'subjects' && subjectMigrationNeeded && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-left">
                  <div>
                    <div className="text-xs font-extrabold text-amber-900">One-time live Subject Master setup required</div>
                    <p className="text-[11px] text-amber-800 mt-1">The live Subject Master is empty, but this browser has the current subject list. Move it once so Teacher Master, Timetable, Edit, Delete and Status use the same live list.</p>
                  </div>
                  <button
                    type="button"
                    onClick={migrateCurrentSubjectsToLive}
                    disabled={subjectMigrationRunning}
                    className="shrink-0 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-extrabold disabled:opacity-60"
                  >
                    {subjectMigrationRunning ? 'Moving Subjects…' : 'Move Current Subjects to Live DB'}
                  </button>
                </div>
              )}

              {/* Filtering / Search controls */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
                <div className="relative md:col-span-2">
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder={activeSubList === 'subjectAllocations' ? 'Search teacher, class, division, subject...' : 'Search name, Code, parameters...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-sans"
                  />
                </div>

                <div>
                  <select
                    value={statusFilter}
                    onChange={(e: any) => setStatusFilter(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white font-sans"
                  >
                    <option value="all">Status: All Records</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
                  </select>
                </div>

                <div className="flex items-center justify-end">
                  <button
                    onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5" />
                    <span>Alphabetical ({sortDirection.toUpperCase()})</span>
                  </button>
                </div>
              </div>

              {/* Bulk operations row */}
              {canEditActiveList && activeSubList !== 'subjectAllocations' && selectedIds.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl flex items-center justify-between animate-fadeIn text-xs text-blue-800">
                  <div className="font-semibold">
                    ⚡ {selectedIds.length} records selected
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleBulkStatusChange(true)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded"
                    >
                      Bulk Activate
                    </button>
                    <button
                      onClick={() => handleBulkStatusChange(false)}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] rounded"
                    >
                      Bulk Deactivate
                    </button>
                    <button
                      onClick={() => setSelectedIds([])}
                      className="text-slate-500 hover:text-slate-800 font-semibold px-2"
                    >
                      Clear Selection
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* List Table Data */}
            {activeSubList === 'subjectAllocations' ? (
              <div className="p-4 sm:p-5 space-y-3 bg-slate-50/40">
                {getSubjectAllocationGroups().length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-400 space-y-2">
                    <AlertCircle className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-xs font-semibold">No active or matching Teaching Assignments found.</p>
                    <p className="text-[10px] text-slate-400">Try another teacher/class/subject search or change the status filter.</p>
                  </div>
                ) : (
                  getSubjectAllocationGroups().map(group => {
                    const expanded = expandedAssignmentTeachers.includes(group.key);
                    const teacherRecord: any = activeTeachers.find((teacher: any) => teacher.id === group.teacherId)
                      || activeTeachers.find((teacher: any) => (teacher.fullName || teacher.name || '').trim().toLowerCase() === group.teacherName.toLowerCase());
                    const totalPeriods = group.rows.reduce((sum, row) => sum + (Number(row.weeklyPeriods) || 0), 0);
                    const uniqueClasses = new Set(group.rows.map(row => `${row.className || ''}::${row.divisionName || ''}`)).size;
                    const uniqueSubjects = new Set(group.rows.map(row => row.subjectName || '')).size;
                    const classTeacherRows = (setup?.classTeacherAssignments || []).filter((row: any) => {
                      const sameTeacher = group.teacherId
                        ? row.teacherId === group.teacherId
                        : String(row.teacherName || '').trim().toLowerCase() === group.teacherName.toLowerCase();
                      return sameTeacher && row.isActive !== false;
                    });

                    return (
                      <section key={group.key} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                        <button
                          type="button"
                          onClick={() => setExpandedAssignmentTeachers(prev => prev.includes(group.key) ? prev.filter(key => key !== group.key) : [...prev, group.key])}
                          className="w-full p-4 sm:p-5 text-left flex items-center gap-3 sm:gap-4 hover:bg-slate-50 transition-colors"
                        >
                          <div className="h-11 w-11 shrink-0 rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-600 text-white flex items-center justify-center font-black text-sm shadow-sm">
                            {group.teacherName.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'T'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-black text-slate-900 text-sm sm:text-base">{group.teacherName}</span>
                              {classTeacherRows.map((row: any) => (
                                <span key={row.id || `${row.className}-${row.divisionName}`} className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-extrabold text-emerald-700">
                                  Class Teacher · {row.className}{row.divisionName && row.divisionName !== 'No Division' ? ` ${row.divisionName}` : ''}
                                </span>
                              ))}
                            </div>
                            <div className="mt-1 text-[10px] sm:text-[11px] text-slate-500">
                              {teacherRecord?.designation || 'Teacher'}{teacherRecord?.qualification ? ` · ${teacherRecord.qualification}` : ''}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <span className="rounded-lg bg-blue-50 px-2 py-1 text-[9px] font-bold text-blue-700">{group.rows.length} assignment{group.rows.length === 1 ? '' : 's'}</span>
                              <span className="rounded-lg bg-violet-50 px-2 py-1 text-[9px] font-bold text-violet-700">{uniqueClasses} class{uniqueClasses === 1 ? '' : 'es'}</span>
                              <span className="rounded-lg bg-cyan-50 px-2 py-1 text-[9px] font-bold text-cyan-700">{uniqueSubjects} subject{uniqueSubjects === 1 ? '' : 's'}</span>
                              <span className="rounded-lg bg-slate-100 px-2 py-1 text-[9px] font-black text-slate-700">{totalPeriods} periods/week</span>
                            </div>
                          </div>
                          <div className="shrink-0 rounded-xl border border-slate-200 bg-white p-2 text-slate-500 shadow-sm">
                            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </div>
                        </button>

                        {expanded && (
                          <div className="border-t border-slate-200 bg-slate-50/70 p-3 sm:p-4">
                            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <div className="text-[11px] font-black text-slate-800">Assigned Classes & Subjects</div>
                                <div className="text-[10px] text-slate-500">Edit only this teacher's canonical Teaching Assignments. Smart AI Timetable reads the same records automatically.</div>
                              </div>
                              {canEditActiveList && (
                                <button
                                  type="button"
                                  onClick={() => openNewSubjectAllocationForTeacher(group.teacherId, group.teacherName)}
                                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-[10px] font-extrabold text-white shadow-sm transition-colors hover:bg-blue-700"
                                >
                                  <Plus className="h-3.5 w-3.5" /> Add Assignment
                                </button>
                              )}
                            </div>

                            <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-200 bg-white">
                              <table className="w-full min-w-[720px] text-left text-[11px]">
                                <thead className="bg-slate-50 text-[9px] font-extrabold uppercase tracking-wider text-slate-500">
                                  <tr>
                                    <th className="px-3 py-3">Class</th>
                                    <th className="px-3 py-3">Division</th>
                                    <th className="px-3 py-3">Subject</th>
                                    <th className="px-3 py-3 text-center">Periods/Week</th>
                                    <th className="px-3 py-3 text-center">Status</th>
                                    <th className="px-3 py-3 text-right">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {group.rows.map((item: any) => {
                                    const active = item.isActive !== false && item.isEnabled !== false;
                                    return (
                                      <tr key={item.id} className={active ? 'text-slate-700' : 'bg-slate-50 text-slate-400'}>
                                        <td className="px-3 py-3 font-bold text-slate-800">{item.className}</td>
                                        <td className="px-3 py-3 font-semibold">{item.divisionName || 'No Division'}</td>
                                        <td className="px-3 py-3 font-extrabold text-violet-700">{item.subjectName}</td>
                                        <td className="px-3 py-3 text-center"><span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono font-black text-slate-700">{item.weeklyPeriods}</span></td>
                                        <td className="px-3 py-3 text-center">
                                          <button type="button" disabled={!canEditActiveList} onClick={() => handleToggleStatus(item)} className="disabled:cursor-default">
                                            <span className={`rounded-full border px-2 py-1 text-[9px] font-bold ${active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-500'}`}>{active ? '● Active' : '○ Inactive'}</span>
                                          </button>
                                        </td>
                                        <td className="px-3 py-3">
                                          <div className="flex items-center justify-end gap-2">
                                            {canEditActiveList ? (
                                              <>
                                                <button type="button" onClick={() => openEditSubjectAllocation(item)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-600 hover:bg-blue-100" title="Edit Assignment"><Edit2 className="h-3.5 w-3.5" /></button>
                                                <button type="button" onClick={() => handleDeleteItem(item)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100" title="Delete Assignment"><Trash2 className="h-3.5 w-3.5" /></button>
                                              </>
                                            ) : <span className="text-[9px] italic text-slate-400">View Only</span>}
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>

                            <div className="space-y-2 sm:hidden">
                              {group.rows.map((item: any) => {
                                const active = item.isActive !== false && item.isEnabled !== false;
                                return (
                                  <div key={item.id} className={`rounded-xl border p-3 ${active ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-100/70'}`}>
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <div className="font-black text-slate-900">{item.subjectName}</div>
                                        <div className="mt-1 text-[10px] font-semibold text-slate-600">{item.className} · {item.divisionName || 'No Division'}</div>
                                        <div className="mt-2 flex items-center gap-2">
                                          <span className="rounded-md bg-slate-100 px-2 py-1 text-[9px] font-black text-slate-700">{item.weeklyPeriods} periods/week</span>
                                          <button type="button" disabled={!canEditActiveList} onClick={() => handleToggleStatus(item)}>
                                            <span className={`rounded-full border px-2 py-1 text-[9px] font-bold ${active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-500'}`}>{active ? '● Active' : '○ Inactive'}</span>
                                          </button>
                                        </div>
                                      </div>
                                      {canEditActiveList && (
                                        <div className="flex shrink-0 gap-2">
                                          <button type="button" onClick={() => openEditSubjectAllocation(item)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600" title="Edit Assignment"><Edit2 className="h-4 w-4" /></button>
                                          <button type="button" onClick={() => handleDeleteItem(item)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-600" title="Delete Assignment"><Trash2 className="h-4 w-4" /></button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </section>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-150 overflow-x-auto">
                {getFilteredList().length === 0 ? (
                  <div className="p-12 text-center text-slate-400 space-y-2">
                    <AlertCircle className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-xs font-semibold">No active or matching entries found.</p>
                    <p className="text-[10px] text-slate-400">Try modifying your query or filters, or add a new master record above.</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs text-slate-600 font-sans border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                        {canEditActiveList && (
                          <th className="p-4 w-12 text-center">
                            <button onClick={() => handleSelectAll(getFilteredList())} className="cursor-pointer text-slate-400 hover:text-slate-600">
                              {selectedIds.length === getFilteredList().length ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
                            </button>
                          </th>
                        )}
                        <th className="p-4">ID</th>
                        {activeSubList === 'teacherProfiles' ? (
                          <>
                            <th className="p-4 w-12">Photo</th><th className="p-4">Full Name</th><th className="p-4 font-mono">SHALARTH ID</th><th className="p-4">Designation & Degree</th><th className="p-4">Contact Info</th><th className="p-4 text-center">Workload (Periods)</th>
                          </>
                        ) : activeSubList === 'classTeacherAssignments' ? (
                          <><th className="p-4">Class Standard</th><th className="p-4">Division</th><th className="p-4">Class Teacher Assigned</th><th className="p-4">Academic Year</th></>
                        ) : (
                          <><th className="p-4">Entry Parameter Value</th>{activeSubList === 'locations' && <><th className="p-4">Taluka</th><th className="p-4">District / State</th></>}</>
                        )}
                        <th className="p-4 w-32 text-center">Status</th><th className="p-4 text-right w-40">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {getFilteredList().map((item: any) => {
                        const isItemActive = item.isActive !== false && item.isEnabled !== false;
                        const isSel = selectedIds.includes(item.id);
                        const name = item.name || item.subjectName || item.gradeName || item.periodName || item.holidayName || item.year || item.className || item.divisionName || item.boardName || item.documentName || item.termName || item.village || '';
                        return (
                          <tr key={item.id} className={`hover:bg-slate-50/50 transition-colors ${!isItemActive ? 'bg-slate-50/40 text-slate-400' : ''} ${isSel ? 'bg-blue-50/20' : ''}`}>
                            {canEditActiveList && <td className="p-4 text-center"><button onClick={() => setSelectedIds(prev => prev.includes(item.id) ? prev.filter(x => x !== item.id) : [...prev, item.id])} className="cursor-pointer text-slate-400 hover:text-slate-600">{isSel ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}</button></td>}
                            <td className="p-4 font-mono font-bold text-slate-500 text-[10px]">{item.id}</td>
                            {activeSubList === 'teacherProfiles' ? (
                              <>
                                <td className="p-4"><img src={item.photoUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80'} alt={item.fullName} className="w-8 h-8 rounded-full object-cover border border-slate-200" referrerPolicy="no-referrer" /></td>
                                <td className="p-4 font-bold text-slate-800">{item.fullName}{item.employeeId && <span className="block text-[9px] text-slate-400 font-normal">Emp: {item.employeeId}</span>}</td>
                                <td className="p-4 font-mono font-bold text-indigo-700 text-[11px]">{item.shalarthId}</td>
                                <td className="p-4"><div className="font-semibold text-slate-700">{item.designation}</div><div className="text-[10px] text-slate-400">{item.qualification}</div></td>
                                <td className="p-4"><div className="text-slate-700 font-semibold">{item.mobileNumber}</div><div className="text-[10px] text-slate-400">{item.email}</div></td>
                                <td className="p-4 text-center"><button onClick={() => { setSelectedTeacherWorkload(item); setShowWorkloadModal(true); }} className="px-2 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-100 font-bold">{calculateTeacherPeriods(item.id)} periods</button></td>
                              </>
                            ) : activeSubList === 'classTeacherAssignments' ? (
                              <><td className="p-4 font-bold text-slate-800">{item.className}</td><td className="p-4 font-semibold text-slate-700">{item.divisionName}</td><td className="p-4 text-emerald-700 font-extrabold">{item.teacherName}</td><td className="p-4 text-slate-500 font-mono text-[10px]">{item.academicYear}</td></>
                            ) : (
                              <><td className="p-4 font-bold text-slate-800">{name}{item.isSystem && <span className="ml-2 px-1.5 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[9px] font-extrabold uppercase rounded">System Rule</span>}</td>{activeSubList === 'locations' && <><td className="p-4 font-semibold text-slate-700">{item.taluka}</td><td className="p-4 text-slate-400">{item.district}, {item.state}</td></>}</>
                            )}
                            <td className="p-4 text-center"><button type="button" disabled={!canEditActiveList} onClick={() => handleToggleStatus(item)} className={`mx-auto flex items-center justify-center gap-1 w-fit cursor-pointer ${canEditActiveList ? 'hover:scale-105 transition-all' : ''}`}>{isItemActive ? <span className="text-[9px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full">● Active</span> : <span className="text-[9px] font-bold px-2 py-0.5 bg-slate-100 text-slate-500 border border-slate-200 rounded-full">○ Inactive</span>}</button></td>
                            <td className="p-4 text-right"><div className="flex items-center justify-end gap-1.5">{canEditActiveList ? <><button type="button" onClick={() => { setEditingItem(item); if (activeSubList === 'locations') { setLocState(item.state); setLocDistrict(item.district); setLocTaluka(item.taluka); setLocVillage(item.village); } else if (activeSubList === 'teacherProfiles') { setTeacherForm({ employeeId: item.employeeId || '', shalarthId: item.shalarthId || '', fullName: item.fullName || '', fatherName: item.fatherName || '', motherName: item.motherName || '', gender: item.gender || 'Male', dob: item.dob || '', dobInWords: item.dobInWords || '', qualification: item.qualification || 'M.A., B.Ed.', designation: item.designation || 'Assistant Teacher', joiningDate: item.joiningDate || '', appointmentDate: item.appointmentDate || '', mobileNumber: item.mobileNumber || '', email: item.email || '', address: item.address || '', bloodGroup: item.bloodGroup || 'B+', photoUrl: item.photoUrl || '', documents: item.documents || [], status: item.status || 'Active', isActive: item.isActive !== false }); setShowAddModal(true); } else if (activeSubList === 'classTeacherAssignments') { setAssignmentForm({ academicYear: item.academicYear || '2026-27', className: item.className || 'Class 9', divisionName: item.divisionName || 'A', teacherId: item.teacherId || '', teacherName: item.teacherName || '', isActive: item.isActive !== false }); setShowAddModal(true); } else { setFormName(name); setShowAddModal(true); } }} className="p-1 text-slate-400 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 rounded transition-colors cursor-pointer" title="Edit Entry"><Edit2 className="w-3.5 h-3.5" /></button><button type="button" onClick={() => handleDeleteItem(item)} className="p-1 text-slate-400 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 rounded transition-colors cursor-pointer" title="Soft Delete / Soft Deactivate"><Trash2 className="w-3.5 h-3.5" /></button></> : <span className="text-[10px] text-slate-400 italic">View Only</span>}</div></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT DIALOG ENTRY */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn no-print">
          <div className={`relative w-full bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden text-left ${activeSubList === 'teacherProfiles' ? 'max-w-3xl' : 'max-w-md'}`}>
            <div className="border-b border-slate-150 bg-slate-50 px-5 py-4 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-sm font-sans flex items-center gap-1.5">
                <Database className="w-4 h-4 text-blue-600" />
                <span>
                  {editingItem ? 'Modify Record' : 'Create Record'} - {getSubListsForCategory(activeCategory).find(s => s.id === activeSubList)?.label}
                </span>
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddOrEditItem} className="p-5 space-y-4 font-sans text-xs">
              {activeSubList === 'teacherProfiles' ? (
                <div className="space-y-4">
                  {/* TWO-COLUMN LAYOUT FOR TEACHER PROFILES */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Column 1 */}
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">SHALARTH ID * (Unique school database reference)</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. SHALARTH9921"
                          value={teacherForm.shalarthId}
                          onChange={(e) => setTeacherForm(prev => ({ ...prev, shalarthId: e.target.value.toUpperCase() }))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Employee ID (Optional, auto-generated if left blank)</label>
                        <input
                          type="text"
                          placeholder="e.g. EMP045"
                          value={teacherForm.employeeId}
                          onChange={(e) => setTeacherForm(prev => ({ ...prev, employeeId: e.target.value.toUpperCase() }))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Teacher Full Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Teacher Full Name"
                          value={teacherForm.fullName}
                          onChange={(e) => setTeacherForm(prev => ({ ...prev, fullName: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Father Name</label>
                          <input
                            type="text"
                            placeholder="Father Name"
                            value={teacherForm.fatherName}
                            onChange={(e) => setTeacherForm(prev => ({ ...prev, fatherName: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Mother Name</label>
                          <input
                            type="text"
                            placeholder="Mother Name"
                            value={teacherForm.motherName}
                            onChange={(e) => setTeacherForm(prev => ({ ...prev, motherName: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Gender *</label>
                          <select
                            value={teacherForm.gender}
                            onChange={(e) => setTeacherForm(prev => ({ ...prev, gender: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                          >
                            {(setup?.genders || []).map((g: any) => (
                              <option key={g.id} value={g.name}>{g.name}</option>
                            ))}
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Blood Group</label>
                          <select
                            value={teacherForm.bloodGroup}
                            onChange={(e) => setTeacherForm(prev => ({ ...prev, bloodGroup: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                          >
                            {(setup?.bloodGroups || []).map((b: any) => (
                              <option key={b.id} value={b.name}>{b.name}</option>
                            ))}
                            {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(b => (
                              <option key={b} value={b}>{b}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Mobile Number *</label>
                        <input
                          type="tel"
                          required
                          placeholder="+91 XXXXX XXXXX"
                          value={teacherForm.mobileNumber}
                          onChange={(e) => setTeacherForm(prev => ({ ...prev, mobileNumber: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Email Address</label>
                        <input
                          type="email"
                          placeholder="teacher@nhs.edu"
                          value={teacherForm.email}
                          onChange={(e) => setTeacherForm(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Column 2 */}
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Designation Master *</label>
                        <select
                          value={teacherForm.designation}
                          onChange={(e) => setTeacherForm(prev => ({ ...prev, designation: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                        >
                          {(setup?.designations || []).map((d: any) => (
                            <option key={d.id} value={d.name}>{d.name}</option>
                          ))}
                          
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Qualification Master *</label>
                        <select
                          value={teacherForm.qualification}
                          onChange={(e) => setTeacherForm(prev => ({ ...prev, qualification: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                        >
                          {(setup?.qualifications || []).map((q: any) => (
                            <option key={q.id} value={q.name}>{q.name}</option>
                          ))}
                          <option value="M.A., B.Ed.">M.A., B.Ed.</option>
                          <option value="M.Sc., B.Ed.">M.Sc., B.Ed.</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-1">
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Date of Birth *</label>
                          <input
                            type="date"
                            required
                            value={teacherForm.dob}
                            onChange={(e) => setTeacherForm(prev => ({ ...prev, dob: e.target.value }))}
                            className="w-full px-2 py-2 border border-slate-200 rounded-lg focus:outline-none"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-semibold text-slate-400 mb-1">DOB in Words (Auto-calculated)</label>
                          <div className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-600 font-medium text-[10px] min-h-[38px] flex items-center">
                            {teacherForm.dob ? convertDateToWords(teacherForm.dob) : 'Select date above...'}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Date of Joining</label>
                          <input
                            type="date"
                            value={teacherForm.joiningDate}
                            onChange={(e) => setTeacherForm(prev => ({ ...prev, joiningDate: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Date of Appointment</label>
                          <input
                            type="date"
                            value={teacherForm.appointmentDate}
                            onChange={(e) => setTeacherForm(prev => ({ ...prev, appointmentDate: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Profile Photo URL</label>
                        <input
                          type="text"
                          placeholder="https://images.unsplash.com/..."
                          value={teacherForm.photoUrl}
                          onChange={(e) => setTeacherForm(prev => ({ ...prev, photoUrl: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Residential Address</label>
                        <input
                          type="text"
                          placeholder="Street, City, Pin Code"
                          value={teacherForm.address}
                          onChange={(e) => setTeacherForm(prev => ({ ...prev, address: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Employee Status *</label>
                        <select
                          value={teacherForm.status}
                          onChange={(e: any) => setTeacherForm(prev => ({ ...prev, status: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                        >
                          <option value="Active">Active Duty</option>
                          <option value="Pending">Pending Approval</option>
                          <option value="Transferred">Transferred out</option>
                          <option value="Retired">Retired</option>
                          <option value="Resigned">Resigned</option>
                          <option value="Inactive">Suspended/Inactive</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* DOCUMENT LIST ATTACHMENT SECTION */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 mt-2">
                    <h4 className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wide flex items-center gap-1">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-blue-500" />
                      <span>Attached Digital Credentials / SHALARTH Documents</span>
                    </h4>
                    
                    {teacherForm.documents.length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic">No credentials attached to this profile yet.</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {teacherForm.documents.map((doc, idx) => (
                          <div key={doc.id} className="flex items-center justify-between p-2 bg-white border border-slate-150 rounded-lg font-mono text-[10px]">
                            <div className="truncate pr-2">
                              <span className="font-bold text-slate-700 block truncate">{doc.name}</span>
                              <span className="text-[8px] text-slate-400 block truncate">{doc.category || 'General'}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setTeacherForm(prev => ({
                                  ...prev,
                                  documents: prev.documents.filter((_, i) => i !== idx)
                                }));
                              }}
                              className="text-rose-500 hover:text-rose-700 font-bold px-1.5 py-0.5 rounded hover:bg-rose-50 transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/60 items-end">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-0.5">Category</label>
                        <select
                          value={docUploadCategory}
                          onChange={(e) => setDocUploadCategory(e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg bg-white text-[10px]"
                        >
                          <option value="Qualification Certificates">Degree / Qualification</option>
                          <option value="Appointment Letter">Appointment Letter</option>
                          <option value="SHALARTH PDF Proof">SHALARTH PDF Proof</option>
                          <option value="Identity & ID">Aadhaar / ID Card</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-0.5">Document Label Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Bed Degree"
                          value={docUploadName}
                          onChange={(e) => setDocUploadName(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-[10px]"
                        />
                      </div>
                      <div className="flex gap-1 items-center">
                        <input
                          type="text"
                          placeholder="url link..."
                          value={docUploadUrl}
                          onChange={(e) => setDocUploadUrl(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-[10px] flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!docUploadName.trim()) {
                              alert('Please enter document label name');
                              return;
                            }
                            const newDoc = {
                              id: `doc_${Date.now()}`,
                              name: docUploadName.trim(),
                              category: docUploadCategory,
                              url: docUploadUrl.trim() || '#'
                            };
                            setTeacherForm(prev => ({
                              ...prev,
                              documents: [...prev.documents, newDoc]
                            }));
                            setDocUploadName('');
                            setDocUploadUrl('');
                          }}
                          className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[10px]"
                        >
                          Attach
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : activeSubList === 'subjectAllocations' ? (
                <div className="space-y-4">
                  {/* BULK TOGGLE SWITCH */}
                  {!editingItem && (
                    <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl mb-2">
                      <div>
                        <span className="font-bold text-slate-800 text-xs block">Bulk Allocations Mode</span>
                        <span className="text-[10px] text-slate-400 font-normal">Allocate multiple subjects to the selected teacher at once</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsBulkAllocation(!isBulkAllocation)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isBulkAllocation ? 'bg-blue-600' : 'bg-slate-300'}`}
                      >
                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${isBulkAllocation ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Select Academic Year *</label>
                    <select
                      value={allocationForm.academicYear}
                      onChange={(e) => setAllocationForm(prev => ({ ...prev, academicYear: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                    >
                      {(setup?.academicYears || []).map((ay: any) => (
                        <option key={ay.id} value={ay.year}>{ay.year}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Select Staff / Headmaster Teaching Profile *</label>
                    <select
                      value={allocationForm.teacherId}
                      onChange={(e) => setAllocationForm(prev => ({ ...prev, teacherId: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="">-- Choose Assigned Staff / Headmaster --</option>
                      {activeTeachers.map((t: any) => (
                        <option key={t.id} value={t.id}>{t.name} ({t.username || t.shalarthId} - {t.designation || 'Teacher'})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Select Class *</label>
                      <select
                        value={allocationForm.className}
                        onChange={(e) => setAllocationForm(prev => ({ ...prev, className: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                      >
                        {(setup?.classes || []).map((c: any) => (
                          <option key={c.id} value={c.className}>{c.className}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Select Division *</label>
                      <select
                        value={allocationForm.divisionName}
                        onChange={(e) => setAllocationForm(prev => ({ ...prev, divisionName: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                      >
                        {(setup?.divisions || []).map((d: any) => (
                          <option key={d.id} value={d.divisionName}>{d.divisionName}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {!isBulkAllocation ? (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Select Subject *</label>
                        <select
                          value={allocationForm.subjectName}
                          onChange={(e) => setAllocationForm(prev => ({ ...prev, subjectName: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                        >
                          {liveSubjects.filter(subject => subject.isActive).map(subject => (
                            <option key={subject.id} value={subject.subjectName}>{subject.subjectName}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Weekly Periods</label>
                        <input
                          type="number"
                          min={1}
                          max={36}
                          value={allocationForm.weeklyPeriods}
                          onChange={(e) => setAllocationForm(prev => ({ ...prev, weeklyPeriods: parseInt(e.target.value) || 5 }))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                        />
                      </div>
                    </div>
                  ) : (
                    /* BULK ALLOCATIONS MULTI-ROW GRID */
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Bulk Subjects List</h4>
                      {bulkAllocations.map((ba, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <select
                            value={ba.subjectName}
                            onChange={(e) => {
                              const updated = [...bulkAllocations];
                              updated[idx].subjectName = e.target.value;
                              setBulkAllocations(updated);
                            }}
                            className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded bg-white text-[11px]"
                          >
                            {liveSubjects.filter(subject => subject.isActive).map(subject => (
                              <option key={subject.id} value={subject.subjectName}>{subject.subjectName}</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min={1}
                            placeholder="Periods"
                            value={ba.periods}
                            onChange={(e) => {
                              const updated = [...bulkAllocations];
                              updated[idx].periods = parseInt(e.target.value) || 5;
                              setBulkAllocations(updated);
                            }}
                            className="w-16 px-2.5 py-1.5 border border-slate-200 rounded text-center text-[11px]"
                          />
                          <button
                            type="button"
                            onClick={() => setBulkAllocations(prev => prev.filter((_, i) => i !== idx))}
                            className="text-rose-500 hover:bg-rose-50 p-1.5 rounded transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setBulkAllocations(prev => [...prev, { subjectName: liveSubjects.find(subject => subject.isActive)?.subjectName || '', periods: 6 }])}
                        className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add another subject row
                      </button>
                    </div>
                  )}
                </div>
              ) : activeSubList === 'classTeacherAssignments' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Academic Year *</label>
                    <select
                      value={assignmentForm.academicYear}
                      onChange={(e) => setAssignmentForm(prev => ({ ...prev, academicYear: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                    >
                      {(setup?.academicYears || []).map((ay: any) => (
                        <option key={ay.id} value={ay.year}>{ay.year}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Select Class standard *</label>
                    <select
                      value={assignmentForm.className}
                      onChange={(e) => setAssignmentForm(prev => ({ ...prev, className: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                    >
                      {(setup?.classes || []).map((c: any) => (
                        <option key={c.id} value={c.className}>{c.className}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Select Division *</label>
                    <select
                      value={assignmentForm.divisionName}
                      onChange={(e) => setAssignmentForm(prev => ({ ...prev, divisionName: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                    >
                      {(setup?.divisions || []).map((d: any) => (
                        <option key={d.id} value={d.divisionName}>{d.divisionName}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Select Class Teacher * (One class/division supports one active teacher)</label>
                    <select
                      value={assignmentForm.teacherId}
                      onChange={(e) => setAssignmentForm(prev => ({ ...prev, teacherId: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="">-- Choose Staff / Headmaster --</option>
                      {activeTeachers.map((t: any) => (
                        <option key={t.id} value={t.id}>{t.name} ({t.username || t.shalarthId} - {t.designation || 'Teacher'})</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : activeSubList === 'locations' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">State *</label>
                      <input
                        type="text"
                        required
                        value={locState}
                        onChange={(e) => setLocState(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">District *</label>
                      <input
                        type="text"
                        required
                        value={locDistrict}
                        onChange={(e) => setLocDistrict(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Taluka / Tehsil *</label>
                    <select
                      value={locTaluka}
                      onChange={(e) => setLocTaluka(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="Taloda">Taloda</option>
                      <option value="Shahada">Shahada</option>
                      <option value="Akrani">Akrani (Dhadgaon)</option>
                      <option value="Nandurbar">Nandurbar</option>
                      <option value="Navapur">Navapur</option>
                      <option value="Akkalkuwa">Akkalkuwa</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Village / City Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Borad / Pratappur / Taloda city"
                      value={locVillage}
                      onChange={(e) => setLocVillage(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Value Description *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Marathi Medium / O- / Special Reservation"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none text-xs"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                    Provide a distinct name. To maintain system reference integration, spelling must be accurate.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-150">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EXCEL / CSV COPY PASTE IMPORT DIALOG */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn no-print">
          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden text-left font-sans">
            <div className="border-b border-slate-150 bg-slate-50 px-5 py-4 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Import Excel Copy-Paste Sheet</span>
              </h3>
              <button 
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleImportCSV} className="p-5 space-y-4 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-[11px] text-slate-600 leading-normal space-y-2">
                <p className="font-bold flex items-center gap-1 text-slate-800">
                  <Info className="w-3.5 h-3.5 text-blue-500" />
                  <span>How to Import:</span>
                </p>
                <p>
                  Copy the columns from your Excel sheet or type them below. The system automatically ignores duplicates!
                </p>
                <div className="p-2 bg-white border border-slate-150 rounded font-mono text-[9px] text-slate-500">
                  {activeSubList === 'locations' ? (
                    <>
                      <strong>Expected Columns:</strong> State,District,Taluka,Village/City<br />
                      <strong>Example Line:</strong> Maharashtra,Nandurbar,Taloda,Sarang Kheda
                    </>
                  ) : (
                    <>
                      <strong>Expected Column:</strong> Name<br />
                      <strong>Example Line:</strong> Urdu Medium
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Paste CSV / Excel Text *</label>
                <textarea
                  required
                  rows={8}
                  placeholder={activeSubList === 'locations' ? "State,District,Taluka,Village/City\nMaharashtra,Nandurbar,Taloda,Koregaon" : "Name\nOBC\nMinority\nScheduled Tribe"}
                  value={csvInput}
                  onChange={(e) => setCsvInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-mono text-[10px]"
                />
              </div>

              {importError && (
                <div className="p-2.5 bg-rose-50 border border-rose-100 text-rose-700 rounded-lg font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-150">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer"
                >
                  Validate & Import Records
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: WORKLOAD ANALYSIS DIALOG */}
      {showWorkloadModal && selectedTeacherWorkload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn no-print">
          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden text-left font-sans">
            <div className="border-b border-slate-150 bg-slate-50 px-5 py-4 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Workload Analysis & Staff Auditing</span>
              </h3>
              <button 
                onClick={() => {
                  setShowWorkloadModal(false);
                  setSelectedTeacherWorkload(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs text-slate-600">
              {/* Teacher Info Card */}
              <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <img 
                  src={selectedTeacherWorkload.photoUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80'} 
                  alt={selectedTeacherWorkload.fullName} 
                  className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">{selectedTeacherWorkload.fullName}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">{selectedTeacherWorkload.designation} • {selectedTeacherWorkload.qualification}</p>
                  <p className="text-[9px] text-slate-400 font-mono mt-0.5">SHALARTH: {selectedTeacherWorkload.shalarthId} | Emp ID: {selectedTeacherWorkload.employeeId || 'N/A'}</p>
                </div>
              </div>

              {/* Workload Indicator Meter */}
              {(() => {
                const totalPeriods = calculateTeacherPeriods(selectedTeacherWorkload.id);
                let workloadStatus = 'Balanced';
                let statusColor = 'text-emerald-700 bg-emerald-100 border-emerald-200';
                let description = 'Workload is within optimal limits (10 to 22 periods per week).';

                if (totalPeriods < 10) {
                  workloadStatus = 'Underloaded';
                  statusColor = 'text-amber-700 bg-amber-100 border-amber-200';
                  description = 'Teacher has potential to accept more lectures (minimum standard is 10 periods/week).';
                } else if (totalPeriods > 22) {
                  workloadStatus = 'Overloaded';
                  statusColor = 'text-rose-700 bg-rose-100 border-rose-200';
                  description = 'Workload is too high. Recommended standard is max 22 periods per week to prevent burnout.';
                }

                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-700 text-[11px] uppercase tracking-wider">Weekly Workload Summary</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 border rounded-full ${statusColor}`}>
                        {workloadStatus}
                      </span>
                    </div>

                    <div className="relative pt-1">
                      <div className="flex mb-2 items-center justify-between">
                        <div>
                          <span className="text-[10px] font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-100">
                            {isNaN(totalPeriods) ? 0 : totalPeriods} / 36 Max Periods
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold inline-block text-blue-600">
                            {isNaN(totalPeriods) ? 0 : Math.round((totalPeriods / 36) * 100)}%
                          </span>
                        </div>
                      </div>
                      <div className="overflow-hidden h-2.5 text-xs flex rounded bg-slate-100 border border-slate-200">
                        <div 
                          style={{ width: `${isNaN(totalPeriods) ? 0 : Math.min((totalPeriods / 36) * 100, 100)}%` }} 
                          className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500 ${
                            (totalPeriods || 0) < 10 ? 'bg-amber-500' : (totalPeriods || 0) > 22 ? 'bg-rose-500' : 'bg-emerald-500'
                          }`}
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-normal mt-1">{description}</p>
                  </div>
                );
              })()}

              {/* List of active allocations */}
              <div className="space-y-2">
                <span className="font-extrabold text-slate-700 text-[11px] uppercase tracking-wider block">Assigned Academic Classes & subjects</span>
                {(() => {
                  const allocations = (setup?.subjectAllocations || []).filter(
                    (sa: any) => sa.teacherId === selectedTeacherWorkload.id && sa.isActive !== false
                  );

                  if (allocations.length === 0) {
                    return (
                      <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center text-slate-400">
                        No subject allocations found for this teacher in the active Academic Year.
                      </div>
                    );
                  }

                  return (
                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-150">
                      {allocations.map((a: any) => (
                        <div key={a.id} className="flex items-center justify-between p-3 hover:bg-slate-50/50 bg-white">
                          <div>
                            <span className="font-bold text-slate-800 text-[11px]">{a.className} - {a.divisionName}</span>
                            <span className="block text-[10px] text-indigo-600 font-extrabold mt-0.5">{a.subjectName}</span>
                          </div>
                          <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 font-mono font-extrabold rounded border border-slate-200">
                            {a.weeklyPeriods} periods/week
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Class Teacher assignment if any */}
              {(() => {
                const isCT = (setup?.classTeacherAssignments || []).find(
                  (cta: any) => cta.teacherId === selectedTeacherWorkload.id && cta.isActive !== false
                );
                if (isCT) {
                  return (
                    <div className="p-3 bg-emerald-50 border border-emerald-150 text-emerald-800 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="font-bold block text-[11px]">Primary Class Teacher Duty</span>
                        <span className="text-[10px] text-emerald-600 font-semibold">{isCT.className} - {isCT.divisionName}</span>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-200 text-emerald-800 border border-emerald-300 rounded text-[9px] font-extrabold uppercase tracking-wider">
                        Active Assignment
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            <div className="flex items-center justify-end p-5 border-t border-slate-150 bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  setShowWorkloadModal(false);
                  setSelectedTeacherWorkload(null);
                }}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg cursor-pointer"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
