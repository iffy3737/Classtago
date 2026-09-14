/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle2, XCircle, AlertTriangle, Calendar, Printer, Download, 
  Search, Filter, Lock, Unlock, Settings, User, Users, QrCode, Check, Plus, 
  Trash2, Edit, Edit2, Undo2, ArrowRight, ChevronRight, Info, Sliders, 
  Eye, BookOpen, Sparkles, Clock, ArrowUpDown, Share2, FileText, ChevronLeft
} from 'lucide-react';
import { Language, User as UserType, ClassStructure, TimetableEntry } from '../types';
import { translations } from '../lib/translations';
import UrduWrapper from './UrduWrapper';
import { LocalERPDatabase } from '../lib/supabase';
import PrintPDFButton from './PrintPDFButton';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { printSectionById } from '../utils/printSection';

// Extended types for Attendance system
export type AttendanceStatus = 'P' | 'A' | 'L' | 'HD' | 'ML' | 'LV' | 'H' | 'CUST';

export interface AttendanceRecord {
  id: string;
  academicYear: string;
  date: string; // YYYY-MM-DD
  type: 'daily' | 'subject';
  classId: string;
  period?: number;
  subject?: string;
  teacherId: string;
  teacherName: string;
  studentId: string;
  studentName: string;
  grNumber: string;
  rollNo: number;
  status: AttendanceStatus;
  isLocked: boolean;
  isDraft: boolean;
  submittedAt: string;
  notes?: string;
}

export interface StudentLeave {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  startDate: string;
  endDate: string;
  leaveType: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approvedBy?: string;
}

interface SmartAttendanceManagerProps {
  lang: Language;
  user: UserType;
  onRefreshData?: () => void;
  activeFeatureId?: string | null;
}

export default function SmartAttendanceManager({ lang, user, onRefreshData, activeFeatureId = null }: SmartAttendanceManagerProps) {
  const t = translations[lang];
  const isUrdu = lang === 'ur';

  // --- Core State ---
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<StudentLeave[]>([]);
  const [classes, setClasses] = useState<ClassStructure[]>([]);
  const [students, setStudents] = useState<UserType[]>([]);
  const [teachers, setTeachers] = useState<UserType[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [academicSetup, setAcademicSetup] = useState<any>(null);

  // --- Current Operations State ---
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedClassName, setSelectedClassName] = useState<string>('');
  const [selectedDivisionName, setSelectedDivisionName] = useState<string>('');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedType, setSelectedType] = useState<'daily' | 'subject'>('daily');
  
  // Grid/List filter states
  const [searchStudent, setSearchStudent] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'name' | 'rollNo' | 'grNumber'>('rollNo');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Multi-select bulk states
  const [bulkStatus, setBulkStatus] = useState<AttendanceStatus>('P');
  const [showAdvancedStatus, setShowAdvancedStatus] = useState(false);
  const [tempRecords, setTempRecords] = useState<Record<string, { status: AttendanceStatus, notes?: string }>>({});

  // Active Screen Navigation inside Attendance Module
  // 'dashboard' | 'take' | 'reports' | 'leaves' | 'clerk_view' | 'student_portal'
  const [activeScreen, setActiveScreen] = useState<string>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const rawAdmissions = React.useMemo(() => JSON.parse(localStorage.getItem('nhs_erp_clerk_admissions') || '[]'), []);
  const enrichedStudents = React.useMemo(() => {
    return students.map(st => {
      const cls = classes.find(c => c.id === st.classId);
      const adm = rawAdmissions.find((a: any) => a.grNumber === st.grNumber);
      return {
        ...st,
        className: cls?.className || '',
        divisionName: cls?.division || 'No Division',
        mediumName: adm?.medium || 'English'
      };
    });
  }, [students, classes, rawAdmissions]);

  // Leave Form State
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [leaveType, setLeaveType] = useState('Sick Leave');
  const [leaveReason, setLeaveReason] = useState('');

  // --- Report Filter States ---
  const [repClassId, setRepClassId] = useState('');
  const [repStudentId, setRepStudentId] = useState('');
  const [repDate, setRepDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [repMonth, setRepMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [repType, setRepType] = useState<'daily' | 'subject'>('daily');
  const [repStatusType, setRepStatusType] = useState<string>('All'); // All, Absent, Late
  const [selectedReportTab, setSelectedReportTab] = useState<'daily' | 'monthly' | 'student' | 'class_summary' | 'teacher_summary'>('daily');

  // --- Monthly Register Filter States ---
  const [monAcademicYear, setMonAcademicYear] = useState<string>('');
  const [monMonthValue, setMonMonthValue] = useState<string>(() => String(new Date().getMonth() + 1).padStart(2, '0'));
  const [monSelectedClass, setMonSelectedClass] = useState<string>('');
  const [monSelectedDivision, setMonSelectedDivision] = useState<string>('');
  const [monGeneratedData, setMonGeneratedData] = useState<any>(null);

  // Print & Export Layout Preview States
  const [printSize, setPrintSize] = useState<'A4' | 'A3'>('A4');
  const [printOrientation, setPrintOrientation] = useState<'Portrait' | 'Landscape'>('Portrait');
  const [printTheme, setPrintTheme] = useState<'Color' | 'BW'>('Color');

  // --- Initialize attendance workspace from current ERP data ---
  useEffect(() => {
    // Load Master Data
    const rawClassesList = LocalERPDatabase.getClasses();
    const classesList = Array.from(
      new Map(rawClassesList.map(item => [`${item.className.trim().toLowerCase()}|${String(item.division || 'No Division').trim().toLowerCase()}`, item])).values()
    );
    setClasses(classesList);
    if (classesList.length > 0) {
      setSelectedClassId(classesList[0].id);
      setRepClassId(classesList[0].id);
    }

    const allUsers = LocalERPDatabase.getUsers();
    const studentUsers = allUsers.filter(u => u.role === 'student');
    const teacherUsers = allUsers.filter(u => u.role === 'teacher' && u.isActive && u.status === 'Active');
    setStudents(studentUsers);
    setTeachers(teacherUsers);
    
    if (studentUsers.length > 0) {
      setRepStudentId(studentUsers[0].id);
    }

    const timetableList = LocalERPDatabase.getTimetable();
    setTimetable(timetableList);

    const setup = LocalERPDatabase.getAcademicSetup();
    setAcademicSetup(setup);
    const configuredAcademicYear = setup.academicYears.find((y: any) => y.isActive)?.year || '';
    setMonAcademicYear(current => current || configuredAcademicYear);

    // Load Attendance Records from local storage
    const storedRecords = localStorage.getItem('nhs_erp_attendance_v2');
    if (storedRecords) {
      setRecords(JSON.parse(storedRecords));
    }  else {
      setRecords([]);
    }

    // Load leaves from local storage
    const storedLeaves = localStorage.getItem('nhs_erp_student_leaves');
    if (storedLeaves) {
      setLeaves(JSON.parse(storedLeaves));
    }  else {
      setLeaves([]);
    }

    // Default portal route on mount based on role
    if (user.role === 'student') {
      setActiveScreen('student_portal');
    } else if (user.role === 'clerk') {
      setActiveScreen('clerk_view');
    } else {
      setActiveScreen('dashboard');
    }
  }, [user]);

  useEffect(() => {
    if (!activeFeatureId) return;

    if (user.role === 'clerk') {
      if (activeFeatureId === 'cl-attendance-overview' || activeFeatureId === 'cl-daily-attendance-register') {
        setActiveScreen('clerk_view');
      } else if (activeFeatureId === 'cl-monthly-attendance-register') {
        setActiveScreen('monthly_register');
      } else if (activeFeatureId === 'cl-attendance-correction-log' || activeFeatureId === 'cl-attendance-certified-print') {
        setSelectedReportTab('daily');
        setActiveScreen('reports');
      }
      return;
    }

    if (user.role !== 'headmaster') return;
    if (activeFeatureId === 'attendance-dashboard') {
      setActiveScreen('dashboard');
    } else if (activeFeatureId === 'daily-roll-call') {
      setSelectedType('daily');
      setActiveScreen('take');
    } else if (activeFeatureId === 'subject-attendance') {
      setSelectedType('subject');
      setActiveScreen('take');
    } else if (activeFeatureId === 'monthly-attendance-register') {
      setActiveScreen('monthly_register');
    } else if (activeFeatureId === 'attendance-reports') {
      setSelectedReportTab('daily');
      setActiveScreen('reports');
    } else if (activeFeatureId === 'attendance-student-leave-review') {
      setActiveScreen('leaves');
    }
  }, [activeFeatureId, user.role]);

  // Save utility helper
  const saveRecordsToDB = (updatedList: AttendanceRecord[]) => {
    setRecords(updatedList);
    localStorage.setItem('nhs_erp_attendance_v2', JSON.stringify(updatedList));
    
    // Also save in legacy format for backward compatibility
    const legacyRecords: Record<string, { present: boolean }> = {};
    updatedList.forEach(rec => {
      if (rec.type === 'subject') {
        const key = `${rec.classId}_${rec.subject}_${rec.date}_${rec.studentId}`;
        legacyRecords[key] = { present: rec.status === 'P' || rec.status === 'L' || rec.status === 'HD' };
      } else {
        const key = `daily_${rec.classId}_${rec.date}_${rec.studentId}`;
        legacyRecords[key] = { present: rec.status === 'P' || rec.status === 'L' || rec.status === 'HD' };
      }
    });
    localStorage.setItem('nhs_erp_attendance_subject', JSON.stringify(legacyRecords));

    if (onRefreshData) onRefreshData();
  };

  const saveLeavesToDB = (updatedLeaves: StudentLeave[]) => {
    setLeaves(updatedLeaves);
    localStorage.setItem('nhs_erp_student_leaves', JSON.stringify(updatedLeaves));
    if (onRefreshData) onRefreshData();
  };

  // --- Computed Timetable Values for Teacher Workspace ---
  const activeYear = useMemo(() => {
    return academicSetup?.academicYears.find((y: any) => y.isActive)?.year || '2026-27';
  }, [academicSetup]);

  // Get current weekday in English for timetable matching
  const todayDayName = useMemo(() => {
    const d = new Date(selectedDate);
    return d.toLocaleDateString('en-US', { weekday: 'long' }) as any;
  }, [selectedDate]);

  // Today's classes for the logged in teacher
  const myTimetableToday = useMemo(() => {
    if (user.role === 'headmaster' || user.role === 'clerk') {
      return timetable.filter(t => t.day === todayDayName);
    }
    return timetable.filter(t => t.day === todayDayName && t.teacherName === user.name);
  }, [timetable, todayDayName, user]);

  // All classes assigned to the teacher
  const myAllAllottedClasses = useMemo(() => {
    if (user.role === 'headmaster' || user.role === 'clerk') return classes;
    
    // Get unique class IDs that are assigned to the teacher in any day of the timetable
    const classIds = Array.from(new Set(timetable.filter(t => t.teacherName === user.name).map(t => t.classId)));
    return classes.filter(c => classIds.includes(c.id));
  }, [classes, timetable, user]);

  const isClassTeacher = useMemo(() => {
    return LocalERPDatabase.getAcademicSetup()?.classTeacherAssignments?.some((a: any) => a.teacherId === user.id) || false;
  }, [user.id]);

  // Master register class for Class Teacher
  const myClassTeacherClass = useMemo(() => {
    if (isClassTeacher && user.classId) {
      return classes.find(c => c.id === user.classId);
    }
    return null;
  }, [classes, user.classId, isClassTeacher]);

  // Helper to check if attendance already registered/submitted/drafted
  const getAttendanceStatusForSlot = (classId: string, type: 'daily' | 'subject', period?: number) => {
    const existing = records.filter(r => 
      r.date === selectedDate && 
      r.classId === classId && 
      r.type === type &&
      (type === 'daily' || r.period === period)
    );
    if (existing.length === 0) return { exists: false, isLocked: false, isDraft: false };
    const first = existing[0];
    return { exists: true, isLocked: first.isLocked, isDraft: first.isDraft };
  };

  // --- ACTIONS ---

  // Initialize Take Attendance screen
  const initiateTakeAttendance = (classId: string, type: 'daily' | 'subject', period?: number, subject?: string) => {
    // Validation: Future Date Check
    const today = new Date().toISOString().split('T')[0];
    if (selectedDate > today) {
      alert(isUrdu ? "مستقبل کی تاریخ کے لیے حاضری درج نہیں کی جا سکتی!" : "Attendance cannot be taken for future dates!");
      return;
    }

    // Save context
    setSelectedClassId(classId);
    setSelectedType(type);
    if (period) setSelectedPeriod(period);
    if (subject) setSelectedSubject(subject);
    else if (type === 'daily') setSelectedSubject('Daily Master Attendance');

    // Retrieve existing records to pre-fill
    const currentList = records.filter(r => 
      r.date === selectedDate && 
      r.classId === classId && 
      r.type === type &&
      (type === 'daily' || r.period === period)
    );

    const targetClass = classes.find(c => c.id === classId);
    const classStudents = students.filter(s => {
      const cls = classes.find(c => c.id === s.classId);
      if (!cls) return false;
      const classMatch = cls.className === targetClass?.className;
      let divMatch = false;
      if (!targetClass?.division || targetClass.division === 'No Division') {
        divMatch = !cls.division || cls.division === 'No Division';
      } else {
        divMatch = cls.division === targetClass.division;
      }
      return classMatch && divMatch;
    });
    const temp: Record<string, { status: AttendanceStatus, notes?: string }> = {};

    classStudents.forEach(st => {
      const match = currentList.find(c => c.studentId === st.id);
      temp[st.id] = {
        status: match ? match.status : 'P',
        notes: match?.notes || ''
      };
    });

    setTempRecords(temp);
    setActiveScreen('take');
  };

  // Save Draft Attendance
  const handleSaveDraft = () => {
    const list = [...records];
    const targetClass = classes.find(c => c.id === selectedClassId);
    const classSts = students.filter(s => {
      const cls = classes.find(c => c.id === s.classId);
      if (!cls) return false;
      const classMatch = cls.className === targetClass?.className;
      let divMatch = false;
      if (!targetClass?.division || targetClass.division === 'No Division') {
        divMatch = !cls.division || cls.division === 'No Division';
      } else {
        divMatch = cls.division === targetClass.division;
      }
      return classMatch && divMatch;
    });

    classSts.forEach(st => {
      const recordKey = `att_${selectedType}_${selectedClassId}_${selectedDate}_${st.id}_${selectedType === 'subject' ? selectedPeriod : 'daily'}`;
      
      // Remove any existing record for this student/slot/day
      const idx = list.findIndex(r => 
        r.date === selectedDate && 
        r.classId === selectedClassId && 
        r.studentId === st.id && 
        r.type === selectedType &&
        (selectedType === 'daily' || r.period === selectedPeriod)
      );

      const entry: AttendanceRecord = {
        id: recordKey,
        academicYear: activeYear,
        date: selectedDate,
        type: selectedType,
        classId: selectedClassId,
        period: selectedType === 'subject' ? selectedPeriod : undefined,
        subject: selectedType === 'subject' ? selectedSubject : undefined,
        teacherId: user.id,
        teacherName: user.name,
        studentId: st.id,
        studentName: st.name,
        grNumber: st.grNumber || '',
        rollNo: st.rollNo || 0,
        status: tempRecords[st.id]?.status || 'P',
        isDraft: true,
        isLocked: false,
        submittedAt: new Date().toISOString(),
        notes: tempRecords[st.id]?.notes || ''
      };

      if (idx >= 0) {
        list[idx] = entry;
      } else {
        list.push(entry);
      }
    });

    saveRecordsToDB(list);
    
    // Audit Log Entry
    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role,
      'SAVE_ATTENDANCE_DRAFT',
      'Attendance Management',
      `Saved draft attendance register for ${classes.find(c => c.id === selectedClassId)?.className} (${selectedType.toUpperCase()}) on ${selectedDate}`
    );

    alert(isUrdu ? "مسودہ کامیابی سے محفوظ ہو گیا!" : "Attendance Draft saved successfully!");
    setActiveScreen('dashboard');
  };

  // Lock and Submit Attendance Register
  
  const handleSubmitAttendance = () => {
    const targetClass = classes.find(c => c.id === selectedClassId);
    const classSts = students.filter(s => {
      const cls = classes.find(c => c.id === s.classId);
      if (!cls) return false;
      const classMatch = cls.className === targetClass?.className;
      let divMatch = false;
      if (!targetClass?.division || targetClass.division === 'No Division') {
        divMatch = !cls.division || cls.division === 'No Division';
      } else {
        divMatch = cls.division === targetClass.division;
      }
      return classMatch && divMatch;
    });
    if (classSts.length === 0) {
      alert('Cannot submit attendance. The student list is empty.');
      return;
    }

    const list = [...records];

    classSts.forEach(st => {
      const recordKey = `att_${selectedType}_${selectedClassId}_${selectedDate}_${st.id}_${selectedType === 'subject' ? selectedPeriod : 'daily'}`;
      
      const idx = list.findIndex(r => 
        r.date === selectedDate && 
        r.classId === selectedClassId && 
        r.studentId === st.id && 
        r.type === selectedType &&
        (selectedType === 'daily' || r.period === selectedPeriod)
      );

      const entry: AttendanceRecord = {
        id: recordKey,
        academicYear: activeYear,
        date: selectedDate,
        type: selectedType,
        classId: selectedClassId,
        period: selectedType === 'subject' ? selectedPeriod : undefined,
        subject: selectedType === 'subject' ? selectedSubject : undefined,
        teacherId: user.id,
        teacherName: user.name,
        studentId: st.id,
        studentName: st.name,
        grNumber: st.grNumber || '',
        rollNo: st.rollNo || 0,
        status: tempRecords[st.id]?.status || 'P',
        isDraft: false,
        isLocked: true, // Auto locked upon submission
        submittedAt: new Date().toISOString(),
        notes: tempRecords[st.id]?.notes || ''
      };

      if (idx >= 0) {
        list[idx] = entry;
      } else {
        list.push(entry);
      }
    });

    saveRecordsToDB(list);

    // Audit Log Entry
    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role,
      'SUBMIT_ATTENDANCE_LOCKED',
      'Attendance Management',
      `Submitted & locked attendance register for ${classes.find(c => c.id === selectedClassId)?.className} (${selectedType.toUpperCase()}) on ${selectedDate}`
    );

    alert(isUrdu ? "حاضری رجسٹر کامیابی سے جمع کر کے مقفل کر دیا گیا ہے!" : "Attendance submitted and locked successfully!");
    setActiveScreen('dashboard');
  };

  // Bulk operation helpers
  const applyBulkStatus = () => {
    const updated = { ...tempRecords };
    Object.keys(updated).forEach(k => {
      updated[k].status = bulkStatus;
    });
    setTempRecords(updated);
  };

  const invertSelection = () => {
    const updated = { ...tempRecords };
    Object.keys(updated).forEach(k => {
      updated[k].status = updated[k].status === 'P' ? 'A' : 'P';
    });
    setTempRecords(updated);
  };

  // Headmaster Unlock Operation
  const handleUnlockAttendance = (classId: string, type: 'daily' | 'subject', date: string, period?: number) => {
    if (user.role !== 'headmaster') return;

    const list = records.map(r => {
      if (r.date === date && r.classId === classId && r.type === type && (type === 'daily' || r.period === period)) {
        return { ...r, isLocked: false, isDraft: true };
      }
      return r;
    });

    saveRecordsToDB(list);

    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role,
      'UNLOCK_ATTENDANCE',
      'Attendance Management',
      `Headmaster unlocked attendance register for Class ID: ${classId} (${type.toUpperCase()}) on ${date}`
    );

    alert(isUrdu ? "حاضری کامیابی کے ساتھ دوبارہ ترمیم کے لیے کھول دی گئی ہے!" : "Attendance register successfully unlocked for editing!");
  };

  // Student Apply Leave
  const handleApplyStudentLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveStart || !leaveEnd || !leaveReason) {
      alert("Please fill all required fields!");
      return;
    }

    const newLeave: StudentLeave = {
      id: `lv_${Date.now()}`,
      studentId: user.id,
      studentName: user.name,
      classId: user.classId || 'c3',
      startDate: leaveStart,
      endDate: leaveEnd,
      leaveType,
      reason: leaveReason,
      status: 'Pending'
    };

    const updated = [newLeave, ...leaves];
    saveLeavesToDB(updated);

    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role,
      'APPLY_LEAVE',
      'Student Leaves Management',
      `Applied for leave from ${leaveStart} to ${leaveEnd} (${leaveType})`
    );

    setLeaveStart('');
    setLeaveEnd('');
    setLeaveReason('');
    alert(isUrdu ? "رخصت کی درخواست کامیابی کے ساتھ جمع کر دی گئی ہے!" : "Leave application successfully submitted!");
  };

  // Class Teacher Leave Review
  const handleReviewLeave = (leaveId: string, status: 'Approved' | 'Rejected') => {
    const updated = leaves.map(l => l.id === leaveId ? { ...l, status, approvedBy: user.name } : l);
    saveLeavesToDB(updated);

    const approvedL = leaves.find(l => l.id === leaveId);
    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role,
      'REVIEW_LEAVE',
      'Student Leaves Management',
      `Class Teacher review leave application for ${approvedL?.studentName || 'Student'} status: ${status}`
    );
  };

  // --- RENDERS ---

  // 1. SMART ATTENDANCE DASHBOARD VIEW
  const renderDashboardScreen = () => {
    // Current period and upcoming calculations based on real clock
    const currentHour = new Date().getHours();
    let currentPeriodNum = 1;
    if (currentHour >= 8 && currentHour < 9) currentPeriodNum = 1;
    else if (currentHour >= 9 && currentHour < 10) currentPeriodNum = 2;
    else if (currentHour >= 10 && currentHour < 11) currentPeriodNum = 3;
    else if (currentHour >= 11 && currentHour < 12) currentPeriodNum = 4;
    else if (currentHour >= 12 && currentHour < 13) currentPeriodNum = 5;
    else if (currentHour >= 13) currentPeriodNum = 6;

    return (
      <div className="space-y-6">
        {/* Dynamic Context Header */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight">
              {isUrdu ? "اسمارٹ حاضری کنٹرول ڈیش بورڈ" : "Smart Attendance Control Desk"}
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
              {isUrdu 
                ? "ٹائم ٹیبل انجن کے ساتھ مربوط۔ روزانہ کی حاضری اور پیریڈ کے مطابق حاضری کو براہ راست یہاں سے ریکارڈ کریں۔"
                : "Automatically synced with the National High School Timetable Engine. Select classes or periods below to take attendance."}
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-xl border border-white/10 font-mono text-xs">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <input 
              type="date" 
              value={selectedDate} 
              onChange={e => setSelectedDate(e.target.value)} 
              className="bg-transparent focus:outline-none text-white cursor-pointer"
            />
          </div>
        </div>

        {/* STATS HIGHLIGHTS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 font-sans tracking-wide">Target Weekday</p>
              <p className="text-sm font-extrabold text-slate-800">{todayDayName}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 font-sans tracking-wide">Timetable Slots Today</p>
              <p className="text-sm font-extrabold text-slate-800">{myTimetableToday.length} Periods</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 font-sans tracking-wide">Leaves Pending</p>
              <p className="text-sm font-extrabold text-slate-800">
                {isClassTeacher 
                  ? leaves.filter(l => l.classId === user.classId && l.status === 'Pending').length 
                  : leaves.filter(l => l.status === 'Pending').length} Pending
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 font-sans tracking-wide">Academic Year</p>
              <p className="text-sm font-extrabold text-slate-800">{activeYear}</p>
            </div>
          </div>
        </div>

        {/* CENTRAL SPLIT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT: TIMETABLE ACTION HUB */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Today's Smart Timetable Entry Points</h3>
                <p className="text-[10px] text-slate-400">Open attendance portals directly from your active slots.</p>
              </div>
              <span className="text-[9px] font-mono font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded uppercase">Auto-Linked</span>
            </div>

            {myTimetableToday.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl space-y-3">
                <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-400 italic">No assigned classes/periods in the timetable for you today ({todayDayName}).</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myTimetableToday.map((slot) => {
                  const cl = classes.find(c => c.id === slot.classId);
                  const { exists, isLocked, isDraft } = getAttendanceStatusForSlot(slot.classId, 'subject', slot.period);
                  const isCurrent = slot.period === currentPeriodNum;

                  return (
                    <div 
                      key={slot.id} 
                      className={`p-4 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all ${
                        isCurrent 
                          ? 'bg-blue-50/50 border-blue-200 ring-1 ring-blue-100' 
                          : 'bg-slate-50/40 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase font-mono ${
                            isCurrent ? 'bg-blue-600 text-white animate-pulse' : 'bg-slate-200 text-slate-600'
                          }`}>
                            Period {slot.period}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{slot.startTime} - {slot.endTime}</span>
                        </div>
                        
                        <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                          <UrduWrapper lang={lang}>
                            {lang === 'ur' && slot.subjectUr ? slot.subjectUr : lang === 'hi' && slot.subjectHi ? slot.subjectHi : slot.subject}
                          </UrduWrapper>
                          <span className="text-slate-400 font-normal">in</span>
                          <span className="text-slate-800">{cl ? `${cl.className}${cl.division && cl.division !== 'No Division' ? ` - ${cl.division}` : ''}` : 'Class'}</span>
                        </h4>

                        <div className="flex gap-1.5 mt-1">
                          {isLocked && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-800 text-white rounded text-[8px] font-bold uppercase font-mono">
                              <Lock className="w-2.5 h-2.5 text-emerald-400" />
                              Locked
                            </span>
                          )}
                          {isDraft && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[8px] font-bold uppercase font-mono">
                              <Edit className="w-2.5 h-2.5" />
                              Draft Saved
                            </span>
                          )}
                          {!exists && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded text-[8px] font-bold uppercase font-mono border border-rose-100">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Pending Roll-Call
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto justify-end">
                        {isLocked && user.role === 'headmaster' && (
                          <button
                            onClick={handleUnlockRegistry}
                            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl cursor-pointer transition-all flex items-center gap-1 shadow-sm"
                          >
                            <Unlock className="w-4 h-4" />
                            Force Unlock Register
                          </button>
                        )}
                        {!isLocked && exists && isDraft && (
                          <button
                            onClick={() => initiateTakeAttendance(slot.classId, 'subject', slot.period, slot.subject)}
                            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl cursor-pointer transition-all"
                          >
                            Resume Draft
                          </button>
                        )}
                        {!isLocked && (!exists || !isDraft) && (
                          <button
                            onClick={() => initiateTakeAttendance(slot.classId, 'subject', slot.period, slot.subject)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl cursor-pointer transition-all shadow-sm"
                          >
                            Start Roll-Call
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT: QUICK ACTIONS */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-6 shadow-md text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <QrCode className="w-32 h-32" />
              </div>
              
              <div className="relative z-10">
                <h3 className="font-extrabold text-lg mb-2 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-300" />
                  Quick Action
                </h3>
                <p className="text-xs text-indigo-100 mb-6">Open attendance for any class manually.</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-indigo-200 uppercase mb-1">Academic Year</label>
                    <select 
                      value={selectedAcademicYear} 
                      onChange={e => setSelectedAcademicYear(e.target.value)}
                      className="w-full bg-indigo-800/50 border border-indigo-500/30 text-white rounded-lg p-2 focus:outline-none text-xs font-bold"
                    >
                      <option value="">-- Select Academic Year --</option>
                      {academicSetup?.academicYears?.map((y: any) => (
                        <option key={y.id} value={y.year} className="bg-slate-800">{y.year}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-indigo-200 uppercase mb-1">Target Class</label>
                    <select 
                      value={selectedClassName} 
                      onChange={e => {
                         setSelectedClassName(e.target.value);
                         setSelectedDivisionName('');
                      }}
                      className="w-full bg-indigo-800/50 border border-indigo-500/30 text-white rounded-lg p-2 focus:outline-none text-xs font-bold"
                    >
                      <option value="" disabled>-- Select Class --</option>
                      {academicSetup?.classes?.filter((c: any) => c.isEnabled).map((c: any) => (
                        <option key={c.id} value={c.className} className="bg-slate-800">{c.className}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-indigo-200 uppercase mb-1">Division</label>
                    <select 
                      value={selectedDivisionName} 
                      onChange={e => {
                        setSelectedDivisionName(e.target.value);
                      }}
                      className="w-full bg-indigo-800/50 border border-indigo-500/30 text-white rounded-lg p-2 focus:outline-none text-xs font-bold"
                      disabled={!selectedClassName}
                    >
                      <option value="">-- Select Division --</option>
                      {academicSetup?.divisions?.filter((d: any) => d.isEnabled).map((d: any) => (
                        <option key={d.id} value={d.divisionName} className="bg-slate-800">{d.divisionName}</option>
                      ))}
                    </select>
                  </div>

                  <button 
                    onClick={() => {
                      const targetClass = classes.find(c => c.className === selectedClassName && (c.division === selectedDivisionName || (!c.division && selectedDivisionName === 'No Division') || (!c.division && !selectedDivisionName)));
                      if (targetClass) {
                        initiateTakeAttendance(targetClass.id, selectedType);
                      } else {
                        alert('Selected combination not found or has no active master record.');
                      }
                    }}
                    disabled={!selectedAcademicYear || !selectedClassName || !selectedDivisionName}
                    className="w-full py-2 bg-white text-indigo-700 hover:bg-indigo-50 font-extrabold text-xs rounded-lg transition-colors shadow-sm mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Open Registry
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 2. ATTENDANCE ENTRY REGISTER / ROLL-CALL BOARD
  const renderTakeAttendanceScreen = () => {
    const targetClass = classes.find(c => c.id === selectedClassId);
    const classStudents = students.filter(s => {
      const cls = classes.find(c => c.id === s.classId);
      if (!cls) return false;
      const classMatch = cls.className === targetClass?.className;
      let divMatch = false;
      if (!targetClass?.division || targetClass.division === 'No Division') {
        divMatch = !cls.division || cls.division === 'No Division';
      } else {
        divMatch = cls.division === targetClass.division;
      }
      return classMatch && divMatch;
    });
    
    // Sort & Filter
    const filteredClassStudents = classStudents.filter(st => {
      const nameMatch = st?.name?.toLowerCase().includes(searchStudent.toLowerCase()) || (st.grNumber && st.grNumber.includes(searchStudent));
      const statusMatch = !statusFilter || tempRecords[st.id]?.status === statusFilter;
      return nameMatch && statusMatch;
    }).sort((a,b) => {
      let comparison = 0;
      if (sortBy === 'rollNo') {
        comparison = (a.rollNo || 0) - (b.rollNo || 0);
      } else if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'grNumber') {
        comparison = (a.grNumber || '').localeCompare(b.grNumber || '');
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    const isLocked = records.some(r => r.date === selectedDate && r.classId === selectedClassId && r.type === selectedType && (selectedType === 'daily' || r.period === selectedPeriod) && r.isLocked);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          {!activeFeatureId && (
            <button 
              onClick={() => setActiveScreen('dashboard')}
              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-slate-50 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Control Desk</span>
            </button>
          )}
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-mono">Status:</span>
            {isLocked ? (
              <span className="px-2.5 py-1 bg-slate-800 text-white rounded-lg text-[10px] font-extrabold uppercase font-mono tracking-wider flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                LOCKED
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-extrabold uppercase font-mono tracking-wider flex items-center gap-1 border border-emerald-200">
                <Unlock className="w-3.5 h-3.5" />
                Unlocked
              </span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-wide">
                {targetClass ? `${targetClass.className}${targetClass.division && targetClass.division !== 'No Division' ? ` - ${targetClass.division}` : ''}` : 'Unknown Class'}
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-1">
                {selectedType === 'daily' ? 'Daily Master Roll-Call' : `Period ${selectedPeriod} (${selectedSubject})`} | {selectedDate}
              </p>
            </div>
            
            {!isLocked && (
              <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase px-2">Bulk Action</span>
                <select 
                  value={bulkStatus} 
                  onChange={e => setBulkStatus(e.target.value as AttendanceStatus)}
                  className="text-xs border border-slate-200 bg-white rounded-lg p-1.5 focus:outline-none font-bold"
                >
                  <option value="P">Present (P)</option>
                  <option value="A">Absent (A)</option>
                  <option value="L">Late (L)</option>
                  <option value="HD">Half Day (HD)</option>
                  <option value="ML">Medical (ML)</option>
                  <option value="LV">Leave (LV)</option>
                  <option value="H">Holiday (H)</option>
                </select>
                <button
                  onClick={() => {
                    const nextTemp = { ...tempRecords };
                    filteredClassStudents.forEach(st => {
                      nextTemp[st.id] = { ...nextTemp[st.id], status: bulkStatus };
                    });
                    setTempRecords(nextTemp);
                  }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-extrabold uppercase tracking-wide transition-colors"
                >
                  Apply All
                </button>
              </div>
            )}
          </div>
        </div>

        {/* LIST */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[9px] tracking-wider font-mono">
                <th className="p-4">Roll</th>
                <th className="p-4">Student</th>
                <th className="p-4">Status</th>
                <th className="p-4">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">
              {filteredClassStudents.map((st) => {
                const currentStatus = tempRecords[st.id]?.status || 'P';
                return (
                  <tr key={st.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-mono font-bold text-slate-600">{st.rollNo || '-'}</td>
                    <td className="p-4">
                      <p className="font-extrabold text-slate-800">{st.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{st.grNumber}</p>
                    </td>
                    <td className="p-4">
                      {isLocked ? (
                        <span className="font-extrabold text-[10px] uppercase">{currentStatus}</span>
                      ) : (
                        <div className="flex gap-1">
                          <button
                            onClick={() => setTempRecords(prev => ({ ...prev, [st.id]: { ...prev[st.id], status: 'P' } }))}
                            className={`px-3 py-1.5 rounded text-[10px] font-bold border ${currentStatus === 'P' ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-600'}`}
                          >P</button>
                          <button
                            onClick={() => setTempRecords(prev => ({ ...prev, [st.id]: { ...prev[st.id], status: 'A' } }))}
                            className={`px-3 py-1.5 rounded text-[10px] font-bold border ${currentStatus === 'A' ? 'bg-rose-600 text-white' : 'bg-white text-rose-600'}`}
                          >A</button>
                          {showAdvancedStatus && (
                            <>
                              <button onClick={() => setTempRecords(prev => ({ ...prev, [st.id]: { ...prev[st.id], status: 'L' } }))} className={`px-3 py-1.5 rounded text-[10px] font-bold border ${currentStatus === 'L' ? 'bg-amber-600 text-white' : 'bg-white text-amber-600'}`}>L</button>
                              <button onClick={() => setTempRecords(prev => ({ ...prev, [st.id]: { ...prev[st.id], status: 'HD' } }))} className={`px-3 py-1.5 rounded text-[10px] font-bold border ${currentStatus === 'HD' ? 'bg-blue-600 text-white' : 'bg-white text-blue-600'}`}>HD</button>
                              <button onClick={() => setTempRecords(prev => ({ ...prev, [st.id]: { ...prev[st.id], status: 'ML' } }))} className={`px-3 py-1.5 rounded text-[10px] font-bold border ${currentStatus === 'ML' ? 'bg-teal-600 text-white' : 'bg-white text-teal-600'}`}>ML</button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <input 
                        disabled={isLocked}
                        type="text"
                        value={tempRecords[st.id]?.notes || ''}
                        onChange={e => setTempRecords(prev => ({ ...prev, [st.id]: { ...prev[st.id], notes: e.target.value } }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs"
                        placeholder="Notes..."
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {!isLocked && (
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md flex justify-between items-center">
            <p className="text-xs">Save as draft or submit and lock to finalize.</p>
            <div className="flex gap-2">
              <button onClick={handleSaveDraft} className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold">Save Draft</button>
              <button onClick={handleSubmitAttendance} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold">Submit & Lock</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderStudentPortalScreen = () => {
    return <div className="p-8 text-center text-slate-500">Student Portal View</div>;
  };

  const renderLeavesReviewScreen = () => {
    return <div className="p-8 text-center text-slate-500">Leaves Review View</div>;
  };


        
  // 4. REPORTS AND EXPORT ENGINE

  const handleUnlockRegistry = () => {
    const nextRecs = records.filter(r => !(r.date === selectedDate && r.classId === selectedClassId && r.type === selectedType && (selectedType === 'daily' || r.period === selectedPeriod)));
    setRecords(nextRecs);
  };

  const monthsList = [
    { value: '06', labelEn: 'June', labelHi: 'जून', labelUr: 'جون' },
    { value: '07', labelEn: 'July', labelHi: 'जुलाई', labelUr: 'जولائی' },
    { value: '08', labelEn: 'August', labelHi: 'अगस्त', labelUr: 'اگست' },
    { value: '09', labelEn: 'September', labelHi: 'सितंबर', labelUr: 'ستمبر' },
    { value: '10', labelEn: 'October', labelHi: 'अक्टूबर', labelUr: 'اکتوبر' },
    { value: '11', labelEn: 'November', labelHi: 'नवंबर', labelUr: 'نومبر' },
    { value: '12', labelEn: 'December', labelHi: 'दिसंबर', labelUr: 'دسمبر' },
    { value: '01', labelEn: 'January', labelHi: 'जनवरी', labelUr: 'جنوری' },
    { value: '02', labelEn: 'February', labelHi: 'फरवरी', labelUr: 'فروری' },
    { value: '03', labelEn: 'March', labelHi: 'मार्च', labelUr: 'مارچ' },
    { width: '04', value: '04', labelEn: 'April', labelHi: 'अप्रैल', labelUr: 'اپریل' },
    { value: '05', labelEn: 'May', labelHi: 'मई', labelUr: 'مئی' }
  ];

  const getTeacherForClass = (className: string, divisionName: string) => {
    const assignments = LocalERPDatabase.getAcademicSetup()?.classTeacherAssignments || [];
    const found = assignments.find((a: any) => a.className === className && (a.divisionName === divisionName || (!a.divisionName && divisionName === 'No Division')));
    return found?.teacherName || 'Not Assigned';
  };

  const handleGenerateMonthlyRegister = () => {
    if (!monSelectedClass) {
      alert("Please select a Class!");
      return;
    }
    // Find target class
    const targetClass = classes.find(c => 
      c.className === monSelectedClass && 
      (c.division === monSelectedDivision || (!c.division && monSelectedDivision === 'No Division') || (!c.division && !monSelectedDivision))
    );
    if (!targetClass) {
      alert("Selected Class & Division combination was not found in Master Setup.");
      return;
    }

    // Determine calendar year based on month & active year
    const activeYearStr = monAcademicYear || activeYear; // e.g. "2026-27"
    const [yearStart, yearEndSuffix] = activeYearStr.split('-');
    const yearStartNum = parseInt(yearStart, 10);
    const yearEndNum = 2000 + parseInt(yearEndSuffix, 10);
    
    const monthNum = parseInt(monMonthValue, 10); // e.g. 6 for June
    const calendarYear = (monthNum >= 6 && monthNum <= 12) ? yearStartNum : yearEndNum;

    const totalDays = new Date(calendarYear, monthNum, 0).getDate();
    const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1);

    // Get matching students
    const classStudents = students.filter(s => s.classId === targetClass.id);

    // For each student, map attendance for each day
    const studentsData = classStudents.map(student => {
      const attendanceMap: Record<number, string> = {};
      let totalPresent = 0;
      let totalAbsent = 0;

      daysArray.forEach(day => {
        const dateStr = `${calendarYear}-${monMonthValue.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        // Find saved daily record
        const record = records.find(r => 
          r.studentId === student.id && 
          r.date === dateStr && 
          r.classId === targetClass.id && 
          r.type === 'daily'
        );

        if (record) {
          attendanceMap[day] = record.status;
          if (record.status === 'P' || record.status === 'L' || record.status === 'HD' || record.status === 'ML' || record.status === 'LV') {
            totalPresent += (record.status === 'HD' ? 0.5 : 1);
          } else if (record.status === 'A') {
            totalAbsent += 1;
          }
        } else {
          attendanceMap[day] = ''; // No record
        }
      });

      const totalDaysActive = totalPresent + totalAbsent;
      const percentage = totalDaysActive > 0 ? Math.round((totalPresent / totalDaysActive) * 100) : 0;

      const admission = rawAdmissions.find((item: any) => item.grNumber === student.grNumber) || {};
      return {
        id: student.id,
        name: student.name,
        rollNo: student.rollNo || 0,
        grNumber: student.grNumber || '',
        examSeatNo: admission.examSeatNo || admission.penNumber || '',
        mobileNumber: admission.parentMobile || admission.mobileNumber || student.phone || '',
        dob: admission.dob || '',
        aadhaarNumber: admission.aadhaarNumber || admission.aadhaar || admission.aadhaarCardNo || '',
        attendanceMap,
        totalPresent,
        totalAbsent,
        percentage
      };
    }).sort((a,b) => a.rollNo - b.rollNo);

    const monthObj = monthsList.find(m => m.value === monMonthValue);
    const monthLabel = monthObj ? (lang === 'ur' ? monthObj.labelUr : lang === 'hi' ? monthObj.labelHi : monthObj.labelEn) : '';
    const classLabel = `${targetClass.className}${targetClass.division && targetClass.division !== 'No Division' ? ` - ${targetClass.division}` : ''}`;
    const teacherLabel = getTeacherForClass(targetClass.className, targetClass.division || 'No Division');

    setMonGeneratedData({
      studentsData,
      days: daysArray,
      monthLabel,
      classLabel,
      teacherLabel,
      yearLabel: activeYearStr
    });
  };

  const handleExportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Attendance Registry');
      const repPeriod = 1; // Explicitly defined for type safety

      // Page Setup for A4 Portrait / Landscape
      worksheet.pageSetup = {
        paperSize: 9, // A4
        orientation: 'portrait',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: {
          left: 0.5, right: 0.5,
          top: 0.5, bottom: 0.5,
          header: 0.3, footer: 0.3
        }
      };

      // Define some style helpers
      const primaryFill: ExcelJS.Fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F172A' } // Slate 900
      };

      const lightFill: ExcelJS.Fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF1F5F9' } // Slate 100
      };

      const zebraFill: ExcelJS.Fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF8FAFC' } // Slate 50
      };

      const headerFill: ExcelJS.Fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE2E8F0' } // Slate 200
      };

      const thinBorder: any = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };

      // 1. Merged School Header
      worksheet.mergeCells('A1:E1');
      const schoolTitleRow = worksheet.getRow(1);
      schoolTitleRow.height = 40;
      const schoolTitleCell = worksheet.getCell('A1');
      schoolTitleCell.value = academicSetup?.schoolProfile.schoolName || "NATIONAL HIGH SCHOOL, TALODA";
      schoolTitleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
      schoolTitleCell.fill = primaryFill;
      schoolTitleCell.alignment = { vertical: 'middle', horizontal: 'center' };

      // 2. Govt. of Maharashtra Sub-header
      worksheet.mergeCells('A2:E2');
      const subHeaderRow = worksheet.getRow(2);
      subHeaderRow.height = 20;
      const subHeaderCell = worksheet.getCell('A2');
      subHeaderCell.value = `Govt. of Maharashtra Approved | UDISE Code: ${academicSetup?.schoolProfile.udiseCode || '27210900403'}`;
      subHeaderCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF334155' } };
      subHeaderCell.fill = lightFill;
      subHeaderCell.alignment = { vertical: 'middle', horizontal: 'center' };

      // 3. Document Name
      worksheet.mergeCells('A3:E3');
      const docNameRow = worksheet.getRow(3);
      docNameRow.height = 25;
      const docNameCell = worksheet.getCell('A3');
      docNameCell.value = `DAILY MASTER ATTENDANCE REGISTER`;
      docNameCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF0F172A' } };
      docNameCell.alignment = { vertical: 'middle', horizontal: 'center' };

      // 4. Registry details
      worksheet.mergeCells('A4:E4');
      const infoRow = worksheet.getRow(4);
      infoRow.height = 20;
      const infoCell = worksheet.getCell('A4');
      const targetClass = classes.find(c => c.id === repClassId);
      const classNameStr = targetClass ? `${targetClass.className}${targetClass.division && targetClass.division !== 'No Division' ? ` - ${targetClass.division}` : ''}` : 'All Classes';
      infoCell.value = `Academic Year: ${activeYear} | Date: ${repDate} | Class: ${classNameStr}`;
      infoCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF475569' } };
      infoCell.fill = zebraFill;
      infoCell.alignment = { vertical: 'middle', horizontal: 'center' };

      // Blank Row 5
      worksheet.getRow(5).height = 15;

      // 5. Header Row (Row 6)
      const headers = ['Roll No', 'GR Number', 'Student Name', 'Attendance Status', 'Remarks / Notes'];
      const headerRow = worksheet.getRow(6);
      headerRow.height = 28;
      
      headers.forEach((h, colIdx) => {
        const cell = headerRow.getCell(colIdx + 1);
        cell.value = h;
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E293B' } };
        cell.fill = headerFill;
        cell.border = thinBorder;
        cell.alignment = { vertical: 'middle', horizontal: colIdx === 2 || colIdx === 4 ? 'left' : 'center' };
      });

      // 6. Data Rows
      let currentRowIdx = 7;
      let filteredReportRecords = records.filter(r => r.classId === repClassId);
      if (selectedReportTab === 'daily') {
        filteredReportRecords = filteredReportRecords.filter(r => r.type === repType && r.date === repDate);
        if (repType === 'subject') {
          filteredReportRecords = filteredReportRecords.filter(r => r.period === repPeriod);
        }
      } else if (selectedReportTab === 'monthly') {
        filteredReportRecords = filteredReportRecords.filter(r => r.type === 'daily' && r.date.startsWith(repMonth));
      }
      if (repStatusType === 'Absent') {
        filteredReportRecords = filteredReportRecords.filter(r => r.status === 'A');
      } else if (repStatusType === 'Late') {
        filteredReportRecords = filteredReportRecords.filter(r => r.status === 'L');
      }

      filteredReportRecords.forEach((r, idx) => {
        const row = worksheet.getRow(currentRowIdx);
        row.height = 20;

        const cellRoll = row.getCell(1);
        cellRoll.value = r.rollNo || (idx + 1);
        cellRoll.alignment = { vertical: 'middle', horizontal: 'center' };
        
        const cellGR = row.getCell(2);
        cellGR.value = r.grNumber || 'NHS-ST';
        cellGR.alignment = { vertical: 'middle', horizontal: 'center' };

        const cellName = row.getCell(3);
        cellName.value = r.studentName;
        cellName.alignment = { vertical: 'middle', horizontal: 'left' };

        const cellStatus = row.getCell(4);
        cellStatus.value = r.status === 'P' ? 'PRESENT' : r.status === 'A' ? 'ABSENT' : r.status === 'L' ? 'LATE' : r.status === 'HD' ? 'HALF DAY' : r.status;
        cellStatus.font = { bold: true, color: { argb: r.status === 'P' ? 'FF16A34A' : r.status === 'A' ? 'FFDC2626' : 'FFD97706' } };
        cellStatus.alignment = { vertical: 'middle', horizontal: 'center' };

        const cellNotes = row.getCell(5);
        cellNotes.value = r.notes || '-';
        cellNotes.alignment = { vertical: 'middle', horizontal: 'left' };

        // Borders
        for (let c = 1; c <= 5; c++) {
          row.getCell(c).border = thinBorder;
          row.getCell(c).font = { ...row.getCell(c).font, name: 'Arial', size: 9 };
          if (idx % 2 === 1) {
            row.getCell(c).fill = zebraFill;
          }
        }

        currentRowIdx++;
      });

      // 7. Auto-fit Column Widths
      worksheet.columns = [
        { width: 10 }, // Roll No
        { width: 15 }, // GR
        { width: 30 }, // Student Name
        { width: 20 }, // Status
        { width: 30 }  // Remarks
      ];

      // Freeze Pane top 6 rows
      worksheet.views = [
        { state: 'frozen', xSplit: 0, ySplit: 6, activeCell: 'A7' }
      ];

      // Auto Filter on row 6
      worksheet.autoFilter = 'A6:E6';

      // 8. Signature Row at the bottom
      const signatureRowIdx = currentRowIdx + 3;
      const sigRow = worksheet.getRow(signatureRowIdx);
      sigRow.height = 30;

      sigRow.getCell(1).value = "__________________________";
      sigRow.getCell(1).alignment = { horizontal: 'center' };
      sigRow.getCell(3).value = "__________________________";
      sigRow.getCell(3).alignment = { horizontal: 'center' };
      sigRow.getCell(5).value = "__________________________";
      sigRow.getCell(5).alignment = { horizontal: 'center' };

      const labelRow = worksheet.getRow(signatureRowIdx + 1);
      labelRow.height = 20;
      labelRow.getCell(1).value = "Class Teacher / Clerk";
      labelRow.getCell(1).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF475569' } };
      labelRow.getCell(1).alignment = { horizontal: 'center' };
      
      labelRow.getCell(3).value = "Senior Auditor Clerk";
      labelRow.getCell(3).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF475569' } };
      labelRow.getCell(3).alignment = { horizontal: 'center' };

      labelRow.getCell(5).value = "Headmaster Seal & Signature";
      labelRow.getCell(5).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF475569' } };
      labelRow.getCell(5).alignment = { horizontal: 'center' };

      // Write and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Daily_Attendance_${repDate}_${classNameStr.replace(/\s+/g, '_')}.xlsx`);

    } catch (err) {
      console.error("Excel generation error", err);
      alert("Failed to export Excel. Please try again.");
    }
  };

  const handleExportMonthlyExcel = async (monData: any) => {
    if (!monData) return;
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Monthly Register');

      // Page Setup: Landscape A4, Fit to 1 Page Wide!
      worksheet.pageSetup = {
        paperSize: 9, // A4
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: {
          left: 0.4, right: 0.4,
          top: 0.4, bottom: 0.4,
          header: 0.2, footer: 0.2
        }
      };

      const primaryFill: ExcelJS.Fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F172A' } // Slate 900
      };

      const lightFill: ExcelJS.Fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF1F5F9' } // Slate 100
      };

      const zebraFill: ExcelJS.Fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF8FAFC' } // Slate 50
      };

      const headerFill: ExcelJS.Fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE2E8F0' } // Slate 200
      };

      const thinBorder: any = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };

      const presentFill: ExcelJS.Fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE8F5E9' } // Very light green
      };

      const absentFill: ExcelJS.Fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFEBEE' } // Very light red
      };

      // Determine total columns: Roll No (1) + GR No (2) + Name (3) + 31 Days (4-34) + Present (35) + Absent (36) + % (37)
      const lastColLetter = 'AK'; // Column 37 is AK
      
      // 1. Merged School Header
      worksheet.mergeCells(`A1:${lastColLetter}1`);
      const schoolTitleRow = worksheet.getRow(1);
      schoolTitleRow.height = 40;
      const schoolTitleCell = worksheet.getCell('A1');
      schoolTitleCell.value = academicSetup?.schoolProfile.schoolName || "NATIONAL HIGH SCHOOL, TALODA";
      schoolTitleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
      schoolTitleCell.fill = primaryFill;
      schoolTitleCell.alignment = { vertical: 'middle', horizontal: 'center' };

      // 2. Govt. of Maharashtra Approved
      worksheet.mergeCells(`A2:${lastColLetter}2`);
      const subHeaderRow = worksheet.getRow(2);
      subHeaderRow.height = 20;
      const subHeaderCell = worksheet.getCell('A2');
      subHeaderCell.value = `Govt. of Maharashtra Approved | UDISE Code: ${academicSetup?.schoolProfile.udiseCode || '27210900403'} | Taloda, Nandurbar`;
      subHeaderCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF334155' } };
      subHeaderCell.fill = lightFill;
      subHeaderCell.alignment = { vertical: 'middle', horizontal: 'center' };

      // 3. Document Name
      worksheet.mergeCells(`A3:${lastColLetter}3`);
      const docNameRow = worksheet.getRow(3);
      docNameRow.height = 25;
      const docNameCell = worksheet.getCell('A3');
      docNameCell.value = `MONTHLY ATTENDANCE REGISTER RECORD`;
      docNameCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF0F172A' } };
      docNameCell.alignment = { vertical: 'middle', horizontal: 'center' };

      // 4. Registry details
      worksheet.mergeCells(`A4:${lastColLetter}4`);
      const infoRow = worksheet.getRow(4);
      infoRow.height = 20;
      const infoCell = worksheet.getCell('A4');
      infoCell.value = `Academic Session: ${monData.yearLabel} | Month: ${monData.monthLabel} | Class: ${monData.classLabel} | Class Teacher: ${monData.teacherLabel}`;
      infoCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF475569' } };
      infoCell.fill = zebraFill;
      infoCell.alignment = { vertical: 'middle', horizontal: 'center' };

      // Blank Row 5
      worksheet.getRow(5).height = 15;

      // 5. Header Row (Row 6)
      const headerRow = worksheet.getRow(6);
      headerRow.height = 32;

      // Define columns schema for width and headers
      const colDefinitions: any[] = [
        { header: 'Roll No', width: 8 },
        { header: 'GR No', width: 12 },
        { header: 'Student Name', width: 25 }
      ];

      monData.days.forEach((dayNum: number) => {
        colDefinitions.push({ header: dayNum.toString(), width: 4 });
      });

      colDefinitions.push({ header: 'Total Present', width: 10 });
      colDefinitions.push({ header: 'Total Absent', width: 10 });
      colDefinitions.push({ header: 'Attendance %', width: 12 });

      colDefinitions.forEach((colDef, colIdx) => {
        const cell = headerRow.getCell(colIdx + 1);
        cell.value = colDef.header;
        cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF1E293B' } };
        cell.fill = headerFill;
        cell.border = thinBorder;
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      });

      // 6. Data Rows
      let currentRowIdx = 7;
      monData.studentsData.forEach((st: any, idx: number) => {
        const row = worksheet.getRow(currentRowIdx);
        row.height = 20;

        // Roll
        const cellRoll = row.getCell(1);
        cellRoll.value = st.rollNo;
        cellRoll.alignment = { vertical: 'middle', horizontal: 'center' };

        // GR
        const cellGR = row.getCell(2);
        cellGR.value = st.grNumber;
        cellGR.alignment = { vertical: 'middle', horizontal: 'center' };

        // Name
        const cellName = row.getCell(3);
        cellName.value = st.name;
        cellName.alignment = { vertical: 'middle', horizontal: 'left' };

        // 31 Days
        monData.days.forEach((dayNum: number, dayIdx: number) => {
          const colNum = 4 + dayIdx;
          const cellDay = row.getCell(colNum);
          const status = st.attendanceMap[dayNum] || '';
          cellDay.value = status;
          cellDay.alignment = { vertical: 'middle', horizontal: 'center' };
          
          if (status === 'P') {
            cellDay.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF15803D' } };
            cellDay.fill = presentFill;
          } else if (status === 'A') {
            cellDay.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFB91C1C' } };
            cellDay.fill = absentFill;
          } else if (status) {
            cellDay.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFB45309' } };
          }
        });

        // Stats columns
        const totalPColNum = 4 + monData.days.length;
        const totalAColNum = totalPColNum + 1;
        const pctColNum = totalPColNum + 2;

        const cellP = row.getCell(totalPColNum);
        cellP.value = st.totalPresent;
        cellP.font = { name: 'Arial', size: 9, bold: true };
        cellP.alignment = { vertical: 'middle', horizontal: 'center' };

        const cellA = row.getCell(totalAColNum);
        cellA.value = st.totalAbsent;
        cellA.font = { name: 'Arial', size: 9, bold: true };
        cellA.alignment = { vertical: 'middle', horizontal: 'center' };

        const cellPct = row.getCell(pctColNum);
        cellPct.value = `${st.percentage}%`;
        cellPct.font = { name: 'Arial', size: 9, bold: true, color: { argb: st.percentage >= 75 ? 'FF15803D' : 'FFB91C1C' } };
        cellPct.alignment = { vertical: 'middle', horizontal: 'center' };

        // Style borders and fonts for all row cells
        const lastColNum = 3 + monData.days.length + 3;
        for (let c = 1; c <= lastColNum; c++) {
          row.getCell(c).border = thinBorder;
          if (!row.getCell(c).font) {
            row.getCell(c).font = { name: 'Arial', size: 9 };
          }
          if (idx % 2 === 1 && !st.attendanceMap[c - 3]) {
            // Zebra striping for non-status cells on odd rows
            row.getCell(c).fill = zebraFill;
          }
        }

        currentRowIdx++;
      });

      // Set explicit Column Widths
      colDefinitions.forEach((colDef, colIdx) => {
        worksheet.getColumn(colIdx + 1).width = colDef.width;
      });

      // Freeze Panes: freeze top 6 rows, and first 3 columns (Roll No, GR No, Name)!
      worksheet.views = [
        { state: 'frozen', xSplit: 3, ySplit: 6, activeCell: 'D7' }
      ];

      // Auto Filter on header row (Row 6)
      worksheet.autoFilter = `A6:${lastColLetter}6`;

      // 8. Signatures at the bottom
      const signatureRowIdx = currentRowIdx + 3;
      const sigRow = worksheet.getRow(signatureRowIdx);
      sigRow.height = 30;

      // Class Teacher
      worksheet.mergeCells(`A${signatureRowIdx}:F${signatureRowIdx}`);
      const cellSig1 = sigRow.getCell(1);
      cellSig1.value = "____________________________________";
      cellSig1.alignment = { horizontal: 'center' };

      // Clerk / Auditor
      worksheet.mergeCells(`N${signatureRowIdx}:S${signatureRowIdx}`);
      const cellSig2 = sigRow.getCell(14);
      cellSig2.value = "____________________________________";
      cellSig2.alignment = { horizontal: 'center' };

      // Headmaster
      worksheet.mergeCells(`AC${signatureRowIdx}:AH${signatureRowIdx}`);
      const cellSig3 = sigRow.getCell(29);
      cellSig3.value = "____________________________________";
      cellSig3.alignment = { horizontal: 'center' };

      const labelRow = worksheet.getRow(signatureRowIdx + 1);
      labelRow.height = 20;

      worksheet.mergeCells(`A${signatureRowIdx + 1}:F${signatureRowIdx + 1}`);
      const cellLabel1 = labelRow.getCell(1);
      cellLabel1.value = "Class Teacher / Subject Teacher";
      cellLabel1.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF475569' } };
      cellLabel1.alignment = { horizontal: 'center' };

      worksheet.mergeCells(`N${signatureRowIdx + 1}:S${signatureRowIdx + 1}`);
      const cellLabel2 = labelRow.getCell(14);
      cellLabel2.value = "Senior Auditor Clerk Seal";
      cellLabel2.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF475569' } };
      cellLabel2.alignment = { horizontal: 'center' };

      worksheet.mergeCells(`AC${signatureRowIdx + 1}:AH${signatureRowIdx + 1}`);
      const cellLabel3 = labelRow.getCell(29);
      cellLabel3.value = "Headmaster Seal & Signature";
      cellLabel3.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF475569' } };
      cellLabel3.alignment = { horizontal: 'center' };

      // Write and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Monthly_Attendance_Register_${monData.classLabel.replace(/\s+/g, '_')}_${monData.monthLabel}.xlsx`);

    } catch (err) {
      console.error("Monthly Excel generation error", err);
      alert("Failed to export Monthly Excel. Please try again.");
    }
  };

  // 4. REPORTS AND EXPORT ENGINE
  const renderReportsScreen = () => {
    const targetClass = classes.find(c => c.id === repClassId);
    let filteredReportRecords = records.filter(r => r.classId === repClassId);
    
    // I am assuming repPeriod, targetSt, repStats exist here.
    const repPeriod = 1;
    const targetSt = students.find(s => s.id === searchStudent) || students[0];
    const presentCount = filteredReportRecords.filter(r => r.status === 'P').length;
    const repStats = {
      total: filteredReportRecords.length,
      presentCount: presentCount,
      absentCount: filteredReportRecords.filter(r => r.status === 'A').length,
      lateCount: filteredReportRecords.filter(r => r.status === 'L').length,
      percentage: filteredReportRecords.length ? Math.round((presentCount / filteredReportRecords.length) * 100) : 0
    };
    
    if (selectedReportTab === 'daily') {
      filteredReportRecords = filteredReportRecords.filter(r => r.type === repType && r.date === repDate);
      if (repType === 'subject') {
        filteredReportRecords = filteredReportRecords.filter(r => r.period === repPeriod);
      }
    } else if (selectedReportTab === 'monthly') {
      filteredReportRecords = filteredReportRecords.filter(r => r.type === 'daily' && r.date.startsWith(repMonth));
    } else if (selectedReportTab === 'student') {
      filteredReportRecords = filteredReportRecords.filter(r => r.type === 'daily' && r.studentId === targetSt?.id);
    }

    return (
      <div className="space-y-6 text-left">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200">
          <div>
            <h2 className="text-lg font-black text-slate-900 uppercase">Registry Reports & Exports</h2>
            <p className="text-xs text-slate-500">Filter, analyze, and print official attendance sheets.</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleExportExcel}
              className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 hover:bg-emerald-700 cursor-pointer shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Export Excel</span>
            </button>
            <button 
              onClick={() => printSectionById('attendance-print-area', 'Attendance Register')}
              className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 hover:bg-rose-700 cursor-pointer shadow-sm"
            >
              <FileText className="w-4 h-4" />
              <span>PDF / Print</span>
            </button>
          </div>
        </div>

        {/* SIDEBAR TABS AND REPORT FILTERING SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 no-print">
          
          {/* LEFT: REPORT FILTERS HUB */}
          <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-5 space-y-4 text-xs shadow-sm">
            <h3 className="font-extrabold text-slate-900 border-b border-slate-100 pb-2">Report Filters</h3>
            
            <div className="space-y-3">
              {/* Report Category */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Report Target</label>
                <div className="flex flex-col gap-1">
                  {[
                    { label: 'Daily Registers', val: 'daily' },
                    { label: 'Monthly Grid', val: 'monthly' },
                    { label: 'Student Cumulative', val: 'student' }
                  ].map(tab => (
                    <button
                      key={tab.val}
                      onClick={() => setSelectedReportTab(tab.val as any)}
                      className={`w-full text-left p-2 rounded-lg font-bold transition-colors ${
                        selectedReportTab === tab.val 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Class Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Select Class Room</label>
                <select 
                  value={repClassId} 
                  onChange={e => setRepClassId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none"
                >
                  <option value="">-- All Classes --</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.className}{c.division && c.division !== 'No Division' ? ` - ${c.division}` : ''}</option>
                  ))}
                </select>
              </div>

              {/* Student Filter */}
              {selectedReportTab === 'student' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Select Student</label>
                  <select 
                    value={repStudentId} 
                    onChange={e => setRepStudentId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none"
                  >
                    {students.filter(s => !repClassId || s.classId === repClassId).map(st => (
                      <option key={st.id} value={st.id}>{st.name} ({st.grNumber})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Attendance Type */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Register Type</label>
                <select 
                  value={repType} 
                  onChange={e => setRepType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none"
                >
                  <option value="daily">Daily Master Roll-Call</option>
                  <option value="subject">Subject-wise Period</option>
                </select>
              </div>

              {/* Date Filters */}
              {selectedReportTab === 'daily' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Specific Date</label>
                  <input 
                    type="date" 
                    value={repDate} 
                    onChange={e => setRepDate(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono"
                  />
                </div>
              )}

              {selectedReportTab === 'monthly' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Specific Month</label>
                  <input 
                    type="month" 
                    value={repMonth} 
                    onChange={e => setRepMonth(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono"
                  />
                </div>
              )}

              {/* Exception Status Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Exception Filter</label>
                <select 
                  value={repStatusType} 
                  onChange={e => setRepStatusType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none"
                >
                  <option value="All">Show All Records</option>
                  <option value="Absent">Only Absentees (A)</option>
                  <option value="Late">Only Late Entries (L)</option>
                </select>
              </div>

            </div>
          </div>

          {/* RIGHT: DYNAMIC REPORT SHEET PREVIEW */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* SUMMARY STATS PANELS */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-slate-900 text-white rounded-xl p-4">
                <span className="block text-[8px] uppercase font-bold text-slate-400 font-sans">Evaluation Count</span>
                <span className="text-xl font-black">{filteredReportRecords.length}</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <span className="block text-[8px] uppercase font-bold text-slate-400 font-sans">Present / Cleared</span>
                <span className="text-xl font-black text-emerald-600">{repStats.presentCount}</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <span className="block text-[8px] uppercase font-bold text-slate-400 font-sans">Absences</span>
                <span className="text-xl font-black text-rose-600">{repStats.absentCount}</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <span className="block text-[8px] uppercase font-bold text-slate-400 font-sans">Lates</span>
                <span className="text-xl font-black text-amber-600">{repStats.lateCount}</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 col-span-2 sm:col-span-1">
                <span className="block text-[8px] uppercase font-bold text-slate-400 font-sans">Avg Attendance</span>
                <span className="text-xl font-black text-indigo-600">{isNaN(repStats.percentage) ? '0' : repStats.percentage}%</span>
              </div>
            </div>

            {/* HIGH FIDELITY PRINT PREVIEW CANVAS */}
            <div id="attendance-print-area" className="bg-white rounded-2xl border border-slate-250 shadow-sm p-8 space-y-6 overflow-hidden relative">
              {/* Simulated School Letterhead */}
              <div className="border-b-2 border-slate-950 pb-4 text-center">
                <table style={{ width: '100%', border: 'none', marginBottom: '10px' }}>
                  <tbody>
                    <tr>
                      <td style={{ border: 'none', textAlign: 'center' }}>
                        <img src={academicSetup?.schoolProfile.schoolLogo || "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=100"} alt="" className="w-12 h-12 object-contain mx-auto inline-block mb-2" />
                        <h1 className="text-base font-black uppercase text-slate-950 tracking-wide m-0">{academicSetup?.schoolProfile.schoolName || "National High School, Taloda"}</h1>
                        <p className="text-[10px] text-slate-500 font-sans m-0">{academicSetup?.schoolProfile.address}, Maharashtra | UDISE Code: {academicSetup?.schoolProfile.udiseCode}</p>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <table style={{ width: '100%', border: 'none', borderTop: '1px solid #ccc', paddingTop: '10px', fontSize: '9px', fontWeight: 'bold' }}>
                  <tbody>
                    <tr>
                      <td style={{ border: 'none', textAlign: 'left', width: '33%' }}>Session: {activeYear}</td>
                      <td style={{ border: 'none', textAlign: 'center', width: '33%', fontSize: '11px', textTransform: 'uppercase' }}>OFFICIAL ATTENDANCE AUDIT SHEET</td>
                      <td style={{ border: 'none', textAlign: 'right', width: '33%' }}>Generated: {new Date().toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {/* Sheet contextual fields */}
              <table style={{ width: '100%', border: 'none', backgroundColor: '#f8fafc', marginBottom: '20px' }} className="text-xs pb-4 border-b border-slate-200 p-4 rounded-xl">
                <tbody>
                  <tr>
                    <td style={{ border: 'none', padding: '10px' }}>
                      <span className="text-slate-400 font-mono block uppercase text-[8px] font-bold">Class Section</span>
                      <span className="font-extrabold text-slate-800">{targetClass ? `${targetClass.className}${targetClass.division && targetClass.division !== 'No Division' ? ` - ${targetClass.division}` : ''}` : 'All Classes'}</span>
                    </td>
                    <td style={{ border: 'none', padding: '10px' }}>
                      <span className="text-slate-400 font-mono block uppercase text-[8px] font-bold">Register Scope</span>
                      <span className="font-extrabold text-slate-800 uppercase">{repType} Register</span>
                    </td>
                    <td style={{ border: 'none', padding: '10px' }}>
                      <span className="text-slate-400 font-mono block uppercase text-[8px] font-bold">Target Range</span>
                      <span className="font-extrabold text-slate-800 uppercase">
                        {selectedReportTab === 'daily' ? `Daily: ${repDate}` : selectedReportTab === 'monthly' ? `Month: ${repMonth}` : `Student: ${targetSt?.name || 'All'}`}
                      </span>
                    </td>
                    <td style={{ border: 'none', padding: '10px' }}>
                      <span className="text-slate-400 font-mono block uppercase text-[8px] font-bold">Audit Rating</span>
                      <span className={`font-extrabold ${repStats.percentage >= 75 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {repStats.percentage}% {repStats.percentage >= 75 ? 'Excellent' : 'Needs Alert'}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
              {/* Data Table */}
              <div className="overflow-hidden border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[9px] tracking-wider font-mono">
                      <th className="p-3">Roll</th>
                      <th className="p-3">GR No</th>
                      <th className="p-3">Student Name</th>
                      {repType === 'subject' && <th className="p-3">Subject / Period</th>}
                      <th className="p-3">Evaluation Date</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3">Remarks / Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {filteredReportRecords.map((r, idx) => (
                      <tr key={r.id || idx} className="hover:bg-slate-50/50 bg-white">
                        <td className="p-3 font-mono font-bold text-slate-700">{r.rollNo || '-'}</td>
                        <td className="p-3 font-mono text-slate-500">{r.grNumber || 'NHS-ST'}</td>
                        <td className="p-3 font-bold text-slate-800">{r.studentName}</td>
                        {repType === 'subject' && (
                          <td className="p-3 font-mono font-bold text-slate-600">
                            <span className="text-indigo-600">P{r.period}</span> - {r.subject}
                          </td>
                        )}
                        <td className="p-3 font-mono text-slate-500">{r.date}</td>
                        <td className="p-3 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase font-mono ${
                            r.status === 'P' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                            r.status === 'A' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                            r.status === 'L' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="p-3 font-medium text-slate-400 italic text-[11px] max-w-[150px] truncate" title={r.notes}>
                          {r.notes || 'No remarks recorded.'}
                        </td>
                      </tr>
                    ))}

                    {filteredReportRecords.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                          No attendance records matched the specific filtering parameters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Report Signatures */}
              <table style={{ width: '100%', marginTop: '50px', border: 'none' }} className="pt-12 border-t border-slate-100 text-center text-[10px] font-sans text-slate-500 font-semibold">
                <tbody>
                  <tr>
                    <td style={{ border: 'none', width: '33%', textAlign: 'center', padding: '20px' }}>
                      <div className="h-10 border-b border-slate-400 mx-6 mb-2"></div>
                      <p>Class Teacher Sign-off</p>
                    </td>
                    <td style={{ border: 'none', width: '33%', textAlign: 'center', padding: '20px' }}>
                      <div className="h-10 border-b border-slate-400 mx-6 mb-2"></div>
                      <p>Senior Auditor Clerk</p>
                    </td>
                    <td style={{ border: 'none', width: '33%', textAlign: 'center', padding: '20px' }}>
                      <div className="h-10 border-b border-slate-400 mx-6 mb-2"></div>
                      <p>Headmaster & Principal Seal</p>
                    </td>
                  </tr>
                </tbody>
              </table>

            </div>

          </div>

        </div>

        {/* PRINT ONLY RENDERING CANVAS */}
        <div className="print-only-container hidden print:block space-y-8 bg-white p-8">
          <div className="border-b-2 border-slate-950 pb-4 flex flex-col items-center text-center space-y-1">
            <h1 className="text-xl font-black uppercase text-slate-950 tracking-wide">{academicSetup?.schoolProfile.schoolName || "National High School, Taloda"}</h1>
            <p className="text-xs text-slate-600 font-sans">{academicSetup?.schoolProfile.address}, Maharashtra | UDISE Code: {academicSetup?.schoolProfile.udiseCode}</p>
            <div className="w-full flex justify-between text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-200 mt-2">
              <span>Academic Session: {activeYear}</span>
              <span className="font-bold text-slate-900 uppercase">OFFICIAL ATTENDANCE REGISTER RECORD</span>
              <span>Generated: {new Date().toLocaleString()}</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 text-xs pb-4 border-b border-slate-200 bg-slate-50 p-4 rounded-xl">
            <div>
              <span className="text-slate-500 block text-[9px] font-bold uppercase">Class Room</span>
              <span className="font-extrabold text-slate-800">{targetClass ? `${targetClass.className}${targetClass.division && targetClass.division !== 'No Division' ? ` - ${targetClass.division}` : ''}` : 'All Classes'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px] font-bold uppercase">Register Scope</span>
              <span className="font-extrabold text-slate-800 uppercase">{repType} Register</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px] font-bold uppercase">Range Limit</span>
              <span className="font-extrabold text-slate-800 uppercase">
                {selectedReportTab === 'daily' ? `Daily: ${repDate}` : selectedReportTab === 'monthly' ? `Month: ${repMonth}` : `Student: ${targetSt?.name || 'All'}`}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px] font-bold uppercase">Average Percentage</span>
              <span className="font-extrabold text-slate-800">{repStats.percentage}%</span>
            </div>
          </div>

          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase text-[9px] tracking-wider">
                <th className="p-3">Roll No</th>
                <th className="p-3">GR No</th>
                <th className="p-3">Student Name</th>
                {repType === 'subject' && <th className="p-3">Subject</th>}
                <th className="p-3">Evaluation Date</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3">Remarks / Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredReportRecords.map((r, idx) => (
                <tr key={idx} className="bg-white">
                  <td className="p-3 font-mono font-bold text-slate-800">{r.rollNo || '-'}</td>
                  <td className="p-3 font-mono text-slate-600">{r.grNumber || 'NHS-ST'}</td>
                  <td className="p-3 font-bold text-slate-800">{r.studentName}</td>
                  {repType === 'subject' && (
                    <td className="p-3 font-mono font-bold text-slate-600">
                      P{r.period} - {r.subject}
                    </td>
                  )}
                  <td className="p-3 font-mono text-slate-500">{r.date}</td>
                  <td className="p-3 text-center">
                    <span className="font-bold font-mono text-slate-900 border border-slate-300 px-2 py-0.5 rounded">
                      {r.status}
                    </span>
                  </td>
                  <td className="p-3 font-medium text-slate-500 italic">
                    {r.notes || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="grid grid-cols-3 gap-6 pt-16 text-center text-xs font-sans text-slate-500 font-semibold">
            <div className="space-y-12">
              <div className="border-b border-slate-300 mx-6"></div>
              <p>Class Teacher Sign-off</p>
            </div>
            <div className="space-y-12">
              <div className="border-b border-slate-300 mx-6"></div>
              <p>Senior Auditor Clerk</p>
            </div>
            <div className="space-y-12">
              <div className="border-b border-slate-300 mx-6"></div>
              <p>Headmaster Seal & Signature</p>
            </div>
          </div>
        </div>

      </div>
    );
  };

  // 6. CLERK READ & PRINT REGISTER LIST VIEW
  const renderClerkViewScreen = () => {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <span className="px-2 py-0.5 bg-slate-800 text-white text-[8px] font-extrabold rounded font-mono uppercase">CLERK DESK</span>
            <h2 className="text-lg font-extrabold text-slate-900 mt-1">School-Wide Attendance Registries</h2>
            <p className="text-xs text-slate-400">Read-Only, auditing and printing dashboard for clerk office registers.</p>
          </div>

          <button 
            onClick={() => {
              setSelectedReportTab('daily');
              setActiveScreen('reports');
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Generate & Print Reports</span>
          </button>
        </div>

        {/* Classes Table List for Clerk */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h4 className="font-extrabold text-xs text-slate-900">Academic Class Registers</h4>
            <span className="text-[10px] text-slate-400">Academic Year: {activeYear}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[9px] tracking-wider font-mono">
                  <th className="p-4">Class Standard</th>
                  <th className="p-4">Division / medium</th>
                  <th className="p-4">Enrolled Students</th>
                  <th className="p-4">Today's Daily Master Roll-Call Status</th>
                  <th className="p-4 text-right">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {Array.from(new Set(classes.map(item => item.className))).map(className => {
                  const classRooms = classes.filter(item => item.className === className);
                  const classIds = classRooms.map(item => item.id);
                  const classSts = students.filter(item => classIds.includes(item.classId || ''));
                  const divisions = Array.from(new Set(classRooms.map(item => item.division || 'No Division')));
                  const roomStates = classRooms.map(item => getAttendanceStatusForSlot(item.id, 'daily'));
                  const allLocked = roomStates.length > 0 && roomStates.every(item => item.isLocked);
                  const hasDraft = roomStates.some(item => item.isDraft);
                  return (
                    <tr key={className} className="hover:bg-slate-50/50 bg-white">
                      <td className="p-4 font-bold text-slate-800">{className}</td>
                      <td className="p-4 font-semibold text-slate-600">{divisions.join(', ')}</td>
                      <td className="p-4 font-bold font-mono text-slate-700">{classSts.length} Enrolled</td>
                      <td className="p-4">
                        {allLocked ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-800 text-white rounded text-[9px] font-bold uppercase font-mono"><Lock className="w-3 h-3 text-emerald-400" /> LOCKED & VERIFIED</span>
                        ) : hasDraft ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 rounded text-[9px] font-bold uppercase font-mono border border-amber-200"><Edit className="w-3 h-3" /> Drafts Available</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-600 rounded text-[9px] font-bold uppercase font-mono border border-rose-200"><AlertTriangle className="w-3 h-3" /> PENDING ROLL-CALL</span>
                        )}
                      </td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => {
                            setMonSelectedClass(className);
                            setMonSelectedDivision('');
                            setMonGeneratedData(null);
                            setActiveScreen('monthly_register');
                          }}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-[10px] font-extrabold rounded-lg flex items-center gap-1 transition-all cursor-pointer ml-auto"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Open Catalogue
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Top Sub-Navigation Menu for Attendance Desk
  const renderTopNavBar = () => {
    return (
      <div className="erp-feature-hero flex flex-wrap items-center justify-between rounded-2xl border border-slate-200 p-4 mb-6 gap-4 no-print">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-600" />
          <h3 className="font-extrabold text-sm text-slate-800 tracking-tight">Smart Attendance Desk</h3>
        </div>
        
        <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          {user.role !== 'student' && (
            <>
              <button
                onClick={() => setActiveScreen(user.role === 'clerk' ? 'clerk_view' : 'dashboard')}
                className={`px-3 py-1.5 rounded-lg font-extrabold transition-all cursor-pointer ${
                  activeScreen === 'dashboard' || activeScreen === 'clerk_view'
                    ? 'bg-white text-slate-950 shadow-sm border border-slate-200/50' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Daily Roll-Call Desk
              </button>
              <button
                onClick={() => {
                  setSelectedReportTab('daily');
                  setActiveScreen('reports');
                }}
                className={`px-3 py-1.5 rounded-lg font-extrabold transition-all cursor-pointer ${
                  activeScreen === 'reports'
                    ? 'bg-white text-slate-950 shadow-sm border border-slate-200/50' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Daily Audit Register
              </button>
              <button
                onClick={() => {
                  setActiveScreen('monthly_register');
                }}
                className={`px-3 py-1.5 rounded-lg font-extrabold transition-all cursor-pointer ${
                  activeScreen === 'monthly_register'
                    ? 'bg-white text-slate-950 shadow-sm border border-slate-200/50' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Monthly Register
              </button>
            </>
          )}
          {user.role === 'student' && (
            <button
              className="px-3 py-1.5 rounded-lg font-extrabold bg-white text-slate-950 shadow-sm"
            >
              My Attendance Portal
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderMonthlyRegisterScreen = () => {
    const distinctClassNames = Array.from(new Set(classes.map(c => c.className)));
    const distinctDivisions = Array.from(new Set(classes.map(c => c.division || 'No Division')));

    return (
      <div className="space-y-6">
        {/* Header Block */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print text-left">
          <div className="space-y-1">
            <span className="px-2 py-0.5 bg-indigo-600 text-white text-[8px] font-extrabold rounded font-mono uppercase">MONTHLY ATTENDANCE REGISTER</span>
            <h2 className="text-lg font-extrabold text-slate-900 mt-1">Official Monthly School Register</h2>
            <p className="text-xs text-slate-400">View, audit, and download beautiful matricized monthly registers with 1–31 grids.</p>
          </div>

          {monGeneratedData && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleExportMonthlyExcel(monGeneratedData)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Download Register Excel</span>
              </button>
              <button
                onClick={() => printSectionById('attendance-print-area', 'Attendance Register')}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>Print School Catalogue (A3 Landscape)</span>
              </button>
            </div>
          )}
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm no-print text-left">
          <h4 className="text-xs font-extrabold text-slate-900 mb-4 font-mono uppercase tracking-wider">Configure Register Filters</h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Academic Year</label>
              <select
                value={monAcademicYear}
                onChange={e => {
                  setMonAcademicYear(e.target.value);
                  setMonGeneratedData(null);
                }}
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-lg p-2 focus:outline-none text-xs font-bold"
              >
                {academicSetup?.academicYears?.map((y: any) => (
                  <option key={y.id} value={y.year}>{y.year}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Month</label>
              <select
                value={monMonthValue}
                onChange={e => {
                  setMonMonthValue(e.target.value);
                  setMonGeneratedData(null);
                }}
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-lg p-2 focus:outline-none text-xs font-bold"
              >
                {monthsList.map((m) => (
                  <option key={m.value} value={m.value}>
                    {lang === 'ur' ? m.labelUr : lang === 'hi' ? m.labelHi : m.labelEn}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Class Standard</label>
              <select
                value={monSelectedClass}
                onChange={e => {
                  setMonSelectedClass(e.target.value);
                  setMonGeneratedData(null);
                }}
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-lg p-2 focus:outline-none text-xs font-bold"
              >
                <option value="">-- Select Class --</option>
                {distinctClassNames.map((className) => (
                  <option key={className} value={className}>{className}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Division</label>
              <select
                value={monSelectedDivision}
                onChange={e => {
                  setMonSelectedDivision(e.target.value);
                  setMonGeneratedData(null);
                }}
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-lg p-2 focus:outline-none text-xs font-bold"
              >
                <option value="">-- Select Division --</option>
                {distinctDivisions.map((divName) => (
                  <option key={divName} value={divName}>{divName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              onClick={handleGenerateMonthlyRegister}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-indigo-300" />
              <span>Generate Register</span>
            </button>
          </div>
        </div>

        {/* Generated Grid View */}
        {monGeneratedData ? (
          <div className="space-y-6">
            
            {/* IN-APP PREVIEW CONTAINER */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm p-6 space-y-4 no-print text-left">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Register: {monGeneratedData.classLabel} | {monGeneratedData.monthLabel} {monGeneratedData.yearLabel}
                  </h3>
                  <p className="text-[10px] text-slate-400">Class Teacher: {monGeneratedData.teacherLabel}</p>
                </div>
                <div className="flex gap-4 text-xs font-mono">
                  <span className="flex items-center gap-1 text-emerald-600 font-bold">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
                    P: Present
                  </span>
                  <span className="flex items-center gap-1 text-rose-600 font-bold">
                    <span className="w-2.5 h-2.5 bg-rose-500 rounded-full"></span>
                    A: Absent
                  </span>
                </div>
              </div>

              {monGeneratedData.studentsData.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl space-y-3">
                  <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-400 italic">No students found assigned to this class and division.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[10px] border-collapse min-w-[900px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider font-mono">
                        <th className="p-2 border-r border-slate-200 text-center w-10">Roll</th>
                        <th className="p-2 border-r border-slate-200 text-center w-16">GR No</th>
                        <th className="p-2 border-r border-slate-200 w-48 min-w-[150px]">Student Name</th>
                        {monGeneratedData.days.map((dayNum: number) => {
                          const isSun = (() => {
                            const [yearStart, yearEndSuffix] = monGeneratedData.yearLabel.split('-');
                            const yearStartNum = parseInt(yearStart, 10);
                            const yearEndNum = 2000 + parseInt(yearEndSuffix, 10);
                            const monthNum = parseInt(monMonthValue, 10);
                            const calendarYear = (monthNum >= 6 && monthNum <= 12) ? yearStartNum : yearEndNum;
                            return new Date(calendarYear, monthNum - 1, dayNum).getDay() === 0;
                          })();
                          return (
                            <th 
                              key={dayNum} 
                              className={`p-1 border-r border-slate-200 text-center w-6 ${isSun ? 'bg-red-50 text-red-500' : ''}`}
                            >
                              {dayNum}
                            </th>
                          );
                        })}
                        <th className="p-2 border-r border-slate-200 text-center w-12">Pres</th>
                        <th className="p-2 border-r border-slate-200 text-center w-12">Abs</th>
                        <th className="p-2 text-center w-14">%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {monGeneratedData.studentsData.map((st: any) => (
                        <tr key={st.id} className="hover:bg-slate-50/50 bg-white">
                          <td className="p-2 border-r border-slate-150 font-bold font-mono text-center text-slate-800">{st.rollNo}</td>
                          <td className="p-2 border-r border-slate-150 font-mono text-center text-slate-500">{st.grNumber}</td>
                          <td className="p-2 border-r border-slate-150 font-bold text-slate-800 truncate max-w-[150px]">{st.name}</td>
                          {monGeneratedData.days.map((dayNum: number) => {
                            const status = st.attendanceMap[dayNum] || '';
                            const isSun = (() => {
                              const [yearStart, yearEndSuffix] = monGeneratedData.yearLabel.split('-');
                              const yearStartNum = parseInt(yearStart, 10);
                              const yearEndNum = 2000 + parseInt(yearEndSuffix, 10);
                              const monthNum = parseInt(monMonthValue, 10);
                              const calendarYear = (monthNum >= 6 && monthNum <= 12) ? yearStartNum : yearEndNum;
                              return new Date(calendarYear, monthNum - 1, dayNum).getDay() === 0;
                            })();
                            
                            return (
                              <td 
                                key={dayNum} 
                                className={`p-1 border-r border-slate-150 text-center font-bold font-mono text-[9px] ${
                                  isSun ? 'bg-red-50/40 text-red-400' : ''
                                }`}
                              >
                                {status === 'P' ? (
                                  <span className="text-emerald-600 bg-emerald-50 px-1 rounded-sm">P</span>
                                ) : status === 'A' ? (
                                  <span className="text-rose-600 bg-rose-50 px-1 rounded-sm">A</span>
                                ) : status === 'L' ? (
                                  <span className="text-amber-600">L</span>
                                ) : status === 'HD' ? (
                                  <span className="text-blue-600">HD</span>
                                ) : isSun ? (
                                  <span className="text-red-300 font-normal">S</span>
                                ) : (
                                  <span className="text-slate-200 font-normal">-</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="p-2 border-r border-slate-150 font-bold font-mono text-center text-slate-700 bg-emerald-50/20">{st.totalPresent}</td>
                          <td className="p-2 border-r border-slate-150 font-bold font-mono text-center text-slate-700 bg-rose-50/20">{st.totalAbsent}</td>
                          <td className={`p-2 font-black font-mono text-center text-[11px] ${st.percentage >= 75 ? 'text-emerald-600 bg-emerald-50/10' : 'text-rose-600 bg-rose-50/10'}`}>{st.percentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* PRINT ONLY SCHOOL CATALOGUE - MATCHES THE PHYSICAL REGISTER FORMAT */}
            <div className="print-only-container hidden print:block bg-white">
              <style>{`@media print { @page { size: A3 landscape; margin: 7mm; } .school-catalogue-page { page-break-after: always; break-after: page; } .school-catalogue-page:last-child { page-break-after: auto; break-after: auto; } }`}</style>
              {Array.from({ length: Math.max(1, Math.ceil(monGeneratedData.studentsData.length / 30)) }).map((_, pageIndex) => {
                const pageStudents = monGeneratedData.studentsData.slice(pageIndex * 30, pageIndex * 30 + 30);
                return (
                  <section key={pageIndex} className="school-catalogue-page bg-white p-1 text-slate-900">
                    <div className="text-center mb-2">
                      <h1 className="text-lg font-black uppercase">{academicSetup?.schoolProfile.schoolName || 'NATIONAL HIGH SCHOOL, TALODA'}</h1>
                      <p className="text-[9px] font-bold">MONTHLY ATTENDANCE CATALOGUE — {monGeneratedData.monthLabel.toUpperCase()} | ACADEMIC YEAR {monGeneratedData.yearLabel}</p>
                      <p className="text-[8px]">Class: {monGeneratedData.classLabel} | Class Teacher: {monGeneratedData.teacherLabel}</p>
                    </div>
                    <div className="overflow-hidden">
                      <table className="w-full border-collapse text-[6.5px] leading-tight table-fixed">
                        <thead>
                          <tr>
                            <th className="border border-slate-700 p-0.5 w-[18px]">Sr<br/>No</th>
                            <th className="border border-slate-700 p-0.5 w-[34px]">G.R.<br/>No.</th>
                            <th className="border border-slate-700 p-0.5 w-[42px]">Exam<br/>Seat No.</th>
                            <th className="border border-slate-700 p-0.5 w-[55px]">Mo. No.</th>
                            <th className="border border-slate-700 p-0.5 w-[48px]">Date of<br/>Birth</th>
                            <th className="border border-slate-700 p-0.5 w-[65px]">Aadhaar Card No.</th>
                            <th className="border border-slate-700 p-0.5 w-[120px] text-left">Name of the Students</th>
                            {monGeneratedData.days.map((dayNum: number) => <th key={dayNum} className="border border-slate-700 p-0 w-[13px] text-center">{dayNum}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {pageStudents.map((st: any, rowIndex: number) => (
                            <tr key={st.id} className="h-[17px]">
                              <td className="border border-slate-700 p-0.5 text-center">{pageIndex * 30 + rowIndex + 1}</td>
                              <td className="border border-slate-700 p-0.5 text-center font-mono">{st.grNumber}</td>
                              <td className="border border-slate-700 p-0.5 text-center font-mono">{st.examSeatNo}</td>
                              <td className="border border-slate-700 p-0.5 text-center font-mono">{st.mobileNumber}</td>
                              <td className="border border-slate-700 p-0.5 text-center font-mono">{st.dob}</td>
                              <td className="border border-slate-700 p-0.5 text-center font-mono">{st.aadhaarNumber}</td>
                              <td className="border border-slate-700 p-0.5 font-semibold truncate">{st.name}</td>
                              {monGeneratedData.days.map((dayNum: number) => {
                                const status = st.attendanceMap[dayNum] || '';
                                return <td key={dayNum} className="border border-slate-700 p-0 text-center font-bold">{status}</td>;
                              })}
                            </tr>
                          ))}
                          {Array.from({ length: Math.max(0, 30 - pageStudents.length) }).map((_, blankIndex) => (
                            <tr key={`blank-${blankIndex}`} className="h-[17px]">
                              <td className="border border-slate-700 p-0.5 text-center">{pageIndex * 30 + pageStudents.length + blankIndex + 1}</td>
                              {Array.from({ length: 6 + monGeneratedData.days.length }).map((__, cellIndex) => <td key={cellIndex} className="border border-slate-700" />)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="ml-auto mt-2 w-[280px] text-[8px] font-bold">
                      <div className="grid grid-cols-[1fr_60px] border border-slate-700"><span className="p-1 border-r border-slate-700 text-right">PRESENT STUDENTS</span><span className="p-1 text-center">{pageStudents.length}</span></div>
                      <div className="grid grid-cols-[1fr_60px] border-x border-b border-slate-700"><span className="p-1 border-r border-slate-700 text-right">ABSENT STUDENTS</span><span className="p-1 text-center">—</span></div>
                      <div className="grid grid-cols-[1fr_60px] border-x border-b border-slate-700"><span className="p-1 border-r border-slate-700 text-right">TOTAL STUDENTS</span><span className="p-1 text-center">{monGeneratedData.studentsData.length}</span></div>
                    </div>
                  </section>
                );
              })}
            </div>

          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 shadow-sm space-y-3 no-print">
            <Sliders className="w-12 h-12 text-slate-300 mx-auto animate-pulse" />
            <p className="text-sm font-semibold">Please select Academic Year, Month, Class and Division and click "Generate Register".</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {!activeFeatureId && renderTopNavBar()}
      
      {/* Dynamic Screen Routing Render */}
      {activeScreen === 'dashboard' && renderDashboardScreen()}
      {activeScreen === 'take' && renderTakeAttendanceScreen()}
      {activeScreen === 'reports' && renderReportsScreen()}
      {activeScreen === 'monthly_register' && renderMonthlyRegisterScreen()}
      {activeScreen === 'leaves' && renderLeavesReviewScreen()}
      {activeScreen === 'student_portal' && renderStudentPortalScreen()}
      {activeScreen === 'clerk_view' && renderClerkViewScreen()}
    </div>
  );
}
