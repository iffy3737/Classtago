/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Award, Calendar, BookOpen, Layers, CheckSquare, Plus, Trash2, 
  Edit2, Check, X, Shield, Lock, Unlock, AlertCircle, Copy, 
  Printer, FileSpreadsheet, Search, Filter, Info, FileText, RefreshCw, LayoutGrid, ClipboardList
} from 'lucide-react';
import { 
  Language, User, ClassStructure, SubjectMasterItem,
  Examination, ExamTermItem, ExamTypeItem, ClassExamMapping, GradeSystemConfig, ExamScheduleEntry, MappedSubjectMarkStructure
} from '../types';
import { LocalERPDatabase } from '../lib/supabase';
import { PrintLetterhead, PrintSignatureArea } from './PrintPDFButton';
import { printSectionById } from '../utils/printSection';
import QuestionPaperManager from './QuestionPaperManager';
import SmartMarkListA from './SmartMarkListA';
import { requestActionConfirm } from '../lib/actionConfirm';

interface SmartExamManagerProps {
  lang: Language;
  user: User;
  onRefreshData?: () => void;
}

export default function SmartExamManager({ lang, user, onRefreshData }: SmartExamManagerProps) {
  const isHeadmaster = user.role === 'headmaster';
  const isClerk = user.role === 'clerk';
  const isTeacher = user.role === 'teacher';
  const isClassTeacher = LocalERPDatabase.getAcademicSetup()?.classTeacherAssignments?.some((a: any) => a.teacherId === user.id);
  const isStudent = user.role === 'student';

  const canEdit = isHeadmaster; // Only Headmaster can manage and write exam master settings
  const isUrdu = lang === 'ur';

  // --- LOCAL DATA STATES ---
  const [academicYears, setAcademicYears] = useState<string[]>(['2026-27', '2025-26', '2024-25']);
  const [activeAcademicYear, setActiveAcademicYear] = useState('2026-27');
  const [classes, setClasses] = useState<ClassStructure[]>([]);
  const [subjects, setSubjects] = useState<SubjectMasterItem[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);

  // Core Exam System Lists
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [examTerms, setExamTerms] = useState<ExamTermItem[]>([]);
  const [examTypes, setExamTypes] = useState<ExamTypeItem[]>([]);
  const [classExamMappings, setClassExamMappings] = useState<ClassExamMapping[]>([]);
  const [gradeConfigs, setGradeConfigs] = useState<GradeSystemConfig[]>([]);
  const [examSchedules, setExamSchedules] = useState<ExamScheduleEntry[]>([]);

  // Tab State
  const [activeTab, setActiveTab] = useState<'overview' | 'exams' | 'terms' | 'types' | 'mapping' | 'grading' | 'schedule' | 'reports' | 'question_papers' | 'mark_list_a'>('overview');

  // Search and Filter States (Universal)
  const [filterClass, setFilterClass] = useState<string>('All');
  const [filterTerm, setFilterTerm] = useState<string>('All');
  const [filterExam, setFilterExam] = useState<string>('All');
  const [filterSubject, setFilterSubject] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // --- FORM STATES ---
  // 1. Examination Form
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [examName, setExamName] = useState('');
  const [examShortName, setExamShortName] = useState('');
  const [examTerm, setExamTerm] = useState('');
  const [examOrder, setExamOrder] = useState<number>(1);
  const [examStatus, setExamStatus] = useState<'Active' | 'Inactive'>('Active');

  // 2. Term Form
  const [editingTermId, setEditingTermId] = useState<string | null>(null);
  const [termName, setTermName] = useState('');
  const [termStatus, setTermStatus] = useState(true);

  // 3. Exam Type Form
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [typeName, setTypeName] = useState('');
  const [typeStatus, setTypeStatus] = useState(true);

  // 4. Class Mapping Form
  const [editingMappingId, setEditingMappingId] = useState<string | null>(null);
  const [mappingExamId, setMappingExamId] = useState('');
  const [mappingClassId, setMappingClassId] = useState('');
  const [mappingDivision, setMappingDivision] = useState('All');
  const [mappingTerm, setMappingTerm] = useState('');
  const [mappingSubjects, setMappingSubjects] = useState<MappedSubjectMarkStructure[]>([]);

  // 5. Subject Mark Structure Modal/Sub-Form
  const [activeSubjectEditIndex, setActiveSubjectEditIndex] = useState<number | null>(null);
  const [theoryMarks, setTheoryMarks] = useState<number>(80);
  const [practicalMarks, setPracticalMarks] = useState<number>(0);
  const [internalMarks, setInternalMarks] = useState<number>(10);
  const [projectMarks, setProjectMarks] = useState<number>(0);
  const [oralMarks, setOralMarks] = useState<number>(10);
  const [minPassingMarks, setMinPassingMarks] = useState<number>(35);
  const [passingRule, setPassingRule] = useState<'Total Based' | 'Theory Based' | 'Component Based'>('Total Based');
  const [customComponentLabel, setCustomComponentLabel] = useState('');
  const [customComponentValue, setCustomComponentValue] = useState<number>(0);
  const [customComponents, setCustomComponents] = useState<{ name: string; marks: number }[]>([]);

  // 6. Grading System Config Form
  const [editingGradeConfigId, setEditingGradeConfigId] = useState<string | null>(null);
  const [gradeClassId, setGradeClassId] = useState('');
  const [gradingType, setGradingType] = useState<'Marks' | 'Grades' | 'Mixed'>('Mixed');
  const [gradeScaleId, setGradeScaleId] = useState('gr1');

  // 7. Exam Schedule Form
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [schExamId, setSchExamId] = useState('');
  const [schClassId, setSchClassId] = useState('');
  const [schDivision, setSchDivision] = useState('All');
  const [schDate, setSchDate] = useState('');
  const [schSubjectId, setSchSubjectId] = useState('');
  const [schStartTime, setSchStartTime] = useState('10:00 AM');
  const [schDuration, setSchDuration] = useState<number>(180);
  const [schRoom, setSchRoom] = useState('');
  const [schSupervisor, setSchSupervisor] = useState('');
  const [schRemarks, setSchRemarks] = useState('');

  // --- PRINT / REPORT CONFIGURATION ---
  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [printPaperSize, setPrintPaperSize] = useState<'A4' | 'A3'>('A4');
  const [printMode, setPrintMode] = useState<'colour' | 'monochrome'>('colour');

  // --- INITIAL DATA LOAD ---
  const loadDatabaseState = () => {
    const cls = LocalERPDatabase.getClasses();
    setClasses(cls);

    const setup = LocalERPDatabase.getAcademicSetup();
    if (setup && setup.subjects) {
      setSubjects(setup.subjects);
    }
    
    const usrs = LocalERPDatabase.getUsers();
    setTeachers(usrs.filter(u => u.role === 'teacher' && u.isActive && u.status === 'Active'));

    // Retrieve Exam master states
    setExaminations(LocalERPDatabase.getExaminations());
    setExamTerms(LocalERPDatabase.getExamTerms());
    setExamTypes(LocalERPDatabase.getExamTypes());
    setClassExamMappings(LocalERPDatabase.getClassExamMappings());
    setGradeConfigs(LocalERPDatabase.getGradeSystemConfigs());
    setExamSchedules(LocalERPDatabase.getExamSchedules());
  };

  useEffect(() => {
    loadDatabaseState();
  }, []);

  // Sync Class Exam Mapping Form Subjects
  useEffect(() => {
    if (mappingClassId) {
      const mappedClassSubjects = subjects.filter(sub => 
        sub.classMapping.includes(mappingClassId) && sub.isActive
      );
      const struct = mappedClassSubjects.map(sub => ({
        subjectId: sub.id,
        subjectName: sub.subjectName,
        maxMarks: sub.maxMarks || 100,
        minPassingMarks: sub.passingMarks || 35,
        theoryMarks: Math.round((sub.maxMarks || 100) * 0.8),
        practicalMarks: 0,
        internalMarks: Math.round((sub.maxMarks || 100) * 0.1),
        projectMarks: 0,
        oralMarks: Math.round((sub.maxMarks || 100) * 0.1),
        customComponents: [],
        totalMarks: sub.maxMarks || 100,
        passingRule: 'Total Based' as const
      }));
      setMappingSubjects(struct);
    } else {
      setMappingSubjects([]);
    }
  }, [mappingClassId, subjects]);

  // Handle Toast/Alerts
  const notifySuccess = (msg: string) => {
    alert(`Success: ${msg}`);
  };

  const notifyError = (msg: string) => {
    alert(`Error: ${msg}`);
  };

  // ==========================================
  // WRITE OPERATIONS (Only for authorized roles - Headmaster)
  // ==========================================

  // --- 1. EXAMINATION ACTIONS ---
  const handleSaveExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return notifyError("Unauthorized operation");
    if (!examName || !examShortName || !examTerm) {
      return notifyError("Please enter all required fields");
    }

    const item: Examination = {
      id: editingExamId || `ex_${Date.now()}`,
      academicYear: activeAcademicYear,
      name: examName.trim(),
      shortName: examShortName.toUpperCase().trim(),
      term: examTerm,
      displayOrder: Number(examOrder),
      status: examStatus
    };

    const updated = LocalERPDatabase.saveExamination(item);
    setExaminations(updated);
    LocalERPDatabase.addAuditLog(
      user.id, user.name, user.role, 
      editingExamId ? 'EDIT_EXAMINATION' : 'ADD_EXAMINATION', 
      'Examination Master', 
      `Saved examination scheme: ${item.name} (${item.shortName}) for ${item.academicYear}`
    );

    // Reset Form
    setEditingExamId(null);
    setExamName('');
    setExamShortName('');
    setExamTerm('');
    setExamOrder(1);
    setExamStatus('Active');
    notifySuccess("Examination saved successfully");
  };

  const handleEditExam = (item: Examination) => {
    setEditingExamId(item.id);
    setExamName(item.name);
    setExamShortName(item.shortName);
    setExamTerm(item.term);
    setExamOrder(item.displayOrder);
    setExamStatus(item.status);
  };

  const handleDeleteExam = async (id: string) => {
    if (!canEdit) return notifyError("Unauthorized operation");
    if (await requestActionConfirm({ title: 'Delete examination?', message: 'Are you sure you want to delete this examination? It will affect dependent marksheet mappings.', confirmLabel: 'Delete Examination', tone: 'danger' })) {
      const updated = LocalERPDatabase.deleteExamination(id);
      setExaminations(updated);
      LocalERPDatabase.addAuditLog(user.id, user.name, user.role, 'DELETE_EXAMINATION', 'Examination Master', `Deleted exam id: ${id}`);
      notifySuccess("Examination deleted successfully");
    }
  };

  const handleToggleExamStatus = (item: Examination) => {
    if (!canEdit) return;
    const updatedObj: Examination = {
      ...item,
      status: item.status === 'Active' ? 'Inactive' : 'Active'
    };
    const updatedList = LocalERPDatabase.saveExamination(updatedObj);
    setExaminations(updatedList);
  };

  const handleCopyPreviousYearExams = async () => {
    if (!canEdit) return notifyError("Unauthorized operation");
    const sourceYear = await requestActionConfirm({ title: 'Copy previous-year examinations?', message: "Copy examination structures from preceding academic year '2025-26' to current session?", confirmLabel: 'Copy Structure', tone: 'warning' });
    if (sourceYear) {
      const previousExams = examinations.filter(e => e.academicYear === '2025-26');
      if (previousExams.length === 0) {
        // Fallback: copy our mock default ones to current active year if none exist
        const duplicated = examinations.map(e => ({
          ...e,
          id: `ex_dup_${Math.random().toString(36).substr(2, 5)}`,
          academicYear: activeAcademicYear
        }));
        duplicated.forEach(d => LocalERPDatabase.saveExamination(d));
      } else {
        previousExams.forEach(e => {
          const duplicated: Examination = {
            ...e,
            id: `ex_dup_${Math.random().toString(36).substr(2, 5)}`,
            academicYear: activeAcademicYear
          };
          LocalERPDatabase.saveExamination(duplicated);
        });
      }
      setExaminations(LocalERPDatabase.getExaminations());
      LocalERPDatabase.addAuditLog(user.id, user.name, user.role, 'COPY_PREVIOUS_YEAR_EXAMS', 'Examination Master', `Copied examination parameters to active session ${activeAcademicYear}`);
      notifySuccess("Successfully duplicated active master settings from previous year logs.");
    }
  };

  // --- 2. TERM ACTIONS ---
  const handleSaveTerm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return notifyError("Unauthorized operation");
    if (!termName) return notifyError("Term name is required");

    const item: ExamTermItem = {
      id: editingTermId || `et_${Date.now()}`,
      name: termName.trim(),
      academicYear: activeAcademicYear,
      isActive: termStatus
    };

    const updated = LocalERPDatabase.saveExamTerm(item);
    setExamTerms(updated);
    LocalERPDatabase.addAuditLog(user.id, user.name, user.role, 'SAVE_TERM', 'Term Master', `Saved term structure: ${item.name}`);

    setEditingTermId(null);
    setTermName('');
    setTermStatus(true);
    notifySuccess("Academic Term saved successfully");
  };

  const handleDeleteTerm = async (id: string) => {
    if (!canEdit) return notifyError("Unauthorized operation");
    if (await requestActionConfirm({ title: 'Delete term?', message: 'Are you sure you want to delete this term?', confirmLabel: 'Delete Term', tone: 'danger' })) {
      const updated = LocalERPDatabase.deleteExamTerm(id);
      setExamTerms(updated);
      LocalERPDatabase.addAuditLog(user.id, user.name, user.role, 'DELETE_TERM', 'Term Master', `Deleted term id: ${id}`);
      notifySuccess("Term deleted");
    }
  };

  // --- 3. EXAM TYPE ACTIONS ---
  const handleSaveType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return notifyError("Unauthorized operation");
    if (!typeName) return notifyError("Exam Type name is required");

    const item: ExamTypeItem = {
      id: editingTypeId || `ext_${Date.now()}`,
      name: typeName.trim(),
      isActive: typeStatus
    };

    const updated = LocalERPDatabase.saveExamType(item);
    setExamTypes(updated);
    LocalERPDatabase.addAuditLog(user.id, user.name, user.role, 'SAVE_EXAM_TYPE', 'Exam Types', `Saved exam category: ${item.name}`);

    setEditingTypeId(null);
    setTypeName('');
    setTypeStatus(true);
    notifySuccess("Exam Type registered successfully");
  };

  const handleDeleteType = async (id: string) => {
    if (!canEdit) return notifyError("Unauthorized operation");
    if (await requestActionConfirm({ title: 'Delete examination type?', message: 'Delete this examination category/type?', confirmLabel: 'Delete Exam Type', tone: 'danger' })) {
      const updated = LocalERPDatabase.deleteExamType(id);
      setExamTypes(updated);
      LocalERPDatabase.addAuditLog(user.id, user.name, user.role, 'DELETE_EXAM_TYPE', 'Exam Types', `Deleted exam type id: ${id}`);
      notifySuccess("Exam Type deleted");
    }
  };

  // --- 4. CLASS EXAM MAPPING ACTIONS ---
  const handleSaveMapping = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return notifyError("Unauthorized operation");
    if (!mappingExamId || !mappingClassId) {
      return notifyError("Please select an Examination and a Class target");
    }

    const targetExam = examinations.find(ex => ex.id === mappingExamId);

    const item: ClassExamMapping = {
      id: editingMappingId || `cem_${Date.now()}`,
      academicYear: activeAcademicYear,
      examId: mappingExamId,
      classId: mappingClassId,
      division: mappingDivision,
      term: targetExam ? targetExam.term : (mappingTerm || 'Term 1'),
      subjects: mappingSubjects
    };

    const updated = LocalERPDatabase.saveClassExamMapping(item);
    setClassExamMappings(updated);
    LocalERPDatabase.addAuditLog(
      user.id, user.name, user.role, 
      editingMappingId ? 'EDIT_CLASS_MAPPING' : 'ADD_CLASS_MAPPING', 
      'Class Exam Mapping', 
      `Mapped ${item.classId} to Exam: ${targetExam?.name || item.examId} with ${item.subjects.length} subjects`
    );

    setEditingMappingId(null);
    setMappingExamId('');
    setMappingClassId('');
    setMappingDivision('All');
    setMappingTerm('');
    setMappingSubjects([]);
    notifySuccess("Class Exam Mapping configured and registered");
  };

  const handleEditMapping = (item: ClassExamMapping) => {
    setEditingMappingId(item.id);
    setMappingExamId(item.examId);
    setMappingClassId(item.classId);
    setMappingDivision(item.division);
    setMappingTerm(item.term);
    setMappingSubjects(item.subjects);
  };

  const handleDeleteMapping = async (id: string) => {
    if (!canEdit) return notifyError("Unauthorized operation");
    if (await requestActionConfirm({ title: 'Remove class mapping?', message: 'Remove this academic class mapping structure?', confirmLabel: 'Remove Mapping', tone: 'danger' })) {
      const updated = LocalERPDatabase.deleteClassExamMapping(id);
      setClassExamMappings(updated);
      LocalERPDatabase.addAuditLog(user.id, user.name, user.role, 'DELETE_CLASS_MAPPING', 'Class Exam Mapping', `Removed mapping id: ${id}`);
      notifySuccess("Mapping removed");
    }
  };

  // --- Subject Mark Structure Subform Updates ---
  const openSubjectStructureModal = (index: number) => {
    const sub = mappingSubjects[index];
    setActiveSubjectEditIndex(index);
    setTheoryMarks(sub.theoryMarks);
    setPracticalMarks(sub.practicalMarks);
    setInternalMarks(sub.internalMarks);
    setProjectMarks(sub.projectMarks);
    setOralMarks(sub.oralMarks);
    setMinPassingMarks(sub.minPassingMarks);
    setPassingRule(sub.passingRule);
    setCustomComponents(sub.customComponents || []);
  };

  const addCustomComponent = () => {
    if (!customComponentLabel || customComponentValue <= 0) {
      return notifyError("Enter valid component name and marks");
    }
    setCustomComponents([...customComponents, { name: customComponentLabel.trim(), marks: Number(customComponentValue) }]);
    setCustomComponentLabel('');
    setCustomComponentValue(0);
  };

  const removeCustomComponent = (idx: number) => {
    setCustomComponents(customComponents.filter((_, i) => i !== idx));
  };

  const saveSubjectStructure = () => {
    if (activeSubjectEditIndex === null) return;
    
    const theoryVal = Number(theoryMarks) || 0;
    const practicalVal = Number(practicalMarks) || 0;
    const internalVal = Number(internalMarks) || 0;
    const projectVal = Number(projectMarks) || 0;
    const oralVal = Number(oralMarks) || 0;
    const customSum = customComponents.reduce((acc, c) => acc + c.marks, 0);

    const netTotal = theoryVal + practicalVal + internalVal + projectVal + oralVal + customSum;

    const list = [...mappingSubjects];
    list[activeSubjectEditIndex] = {
      ...list[activeSubjectEditIndex],
      theoryMarks: theoryVal,
      practicalMarks: practicalVal,
      internalMarks: internalVal,
      projectMarks: projectVal,
      oralMarks: oralVal,
      customComponents: customComponents,
      minPassingMarks: Number(minPassingMarks) || 35,
      maxMarks: netTotal,
      totalMarks: netTotal,
      passingRule: passingRule
    };

    setMappingSubjects(list);
    setActiveSubjectEditIndex(null);
    notifySuccess("Subject grading weights updated.");
  };

  // --- 5. GRADING CONFIGURATION ACTIONS ---
  const handleSaveGradeConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return notifyError("Unauthorized operation");
    if (!gradeClassId) return notifyError("Select a Target Class");

    const item: GradeSystemConfig = {
      id: editingGradeConfigId || `gsc_${Date.now()}`,
      classId: gradeClassId,
      gradingType: gradingType,
      scaleId: gradeScaleId
    };

    const updated = LocalERPDatabase.saveGradeSystemConfig(item);
    setGradeConfigs(updated);
    LocalERPDatabase.addAuditLog(user.id, user.name, user.role, 'SAVE_GRADING_CONFIG', 'Grading Master', `Set ${item.classId} grading rule to ${item.gradingType}`);

    setEditingGradeConfigId(null);
    setGradeClassId('');
    setGradingType('Mixed');
    notifySuccess("Grading rules registered successfully");
  };

  const handleDeleteGradeConfig = async (id: string) => {
    if (!canEdit) return notifyError("Unauthorized operation");
    if (await requestActionConfirm({ title: 'Delete grading policy?', message: 'Delete this class grading policy configuration?', confirmLabel: 'Delete Policy', tone: 'danger' })) {
      const updated = LocalERPDatabase.deleteGradeSystemConfig(id);
      setGradeConfigs(updated);
      notifySuccess("Grading policy deleted");
    }
  };

  // --- 6. EXAMINATION TIMETABLE SCHEDULE ACTIONS ---
  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return notifyError("Unauthorized operation");
    if (!schExamId || !schClassId || !schSubjectId || !schDate) {
      return notifyError("Please enter Exam Name, Class, Subject and Date");
    }

    const matchedExam = examinations.find(ex => ex.id === schExamId);
    const matchedSub = subjects.find(s => s.id === schSubjectId);

    const item: ExamScheduleEntry = {
      id: editingScheduleId || `es_${Date.now()}`,
      examId: schExamId,
      examName: matchedExam ? matchedExam.name : 'Examination',
      academicYear: activeAcademicYear,
      date: schDate,
      subjectId: schSubjectId,
      subjectName: matchedSub ? matchedSub.subjectName : 'Subject',
      classId: schClassId,
      division: schDivision,
      durationMinutes: Number(schDuration),
      startTime: schStartTime,
      room: schRoom.trim() || 'Exam Hall',
      supervisor: schSupervisor || 'Unassigned Teacher',
      remarks: schRemarks.trim()
    };

    const updated = LocalERPDatabase.saveExamSchedule(item);
    setExamSchedules(updated);
    LocalERPDatabase.addAuditLog(
      user.id, user.name, user.role, 
      editingScheduleId ? 'EDIT_EXAM_SCHEDULE' : 'ADD_EXAM_SCHEDULE', 
      'Exam Timetable', 
      `Scheduled ${item.subjectName} for ${item.classId} on ${item.date}`
    );

    setEditingScheduleId(null);
    setSchExamId('');
    setSchClassId('');
    setSchDivision('All');
    setSchDate('');
    setSchSubjectId('');
    setSchStartTime('10:00 AM');
    setSchDuration(180);
    setSchRoom('');
    setSchSupervisor('');
    setSchRemarks('');
    notifySuccess("Examination Slot Scheduled successfully");
  };

  const handleEditSchedule = (item: ExamScheduleEntry) => {
    setEditingScheduleId(item.id);
    setSchExamId(item.examId);
    setSchClassId(item.classId);
    setSchDivision(item.division);
    setSchDate(item.date);
    setSchSubjectId(item.subjectId);
    setSchStartTime(item.startTime);
    setSchDuration(item.durationMinutes);
    setSchRoom(item.room);
    setSchSupervisor(item.supervisor);
    setSchRemarks(item.remarks);
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!canEdit) return notifyError("Unauthorized operation");
    if (await requestActionConfirm({ title: 'Remove exam timetable slot?', message: 'Remove this scheduled timetable slot?', confirmLabel: 'Remove Slot', tone: 'danger' })) {
      const updated = LocalERPDatabase.deleteExamSchedule(id);
      setExamSchedules(updated);
      LocalERPDatabase.addAuditLog(user.id, user.name, user.role, 'DELETE_EXAM_SCHEDULE', 'Exam Timetable', `Deleted slot id: ${id}`);
      notifySuccess("Slot removed from exam timetable");
    }
  };

  // ==========================================
  // FILTERS AND REPORTS COMPUTATIONS
  // ==========================================

  // For students and class teachers, restrict/filter their view:
  const studentFilteredSchedules = examSchedules.filter(entry => {
    // Academic Year
    if (entry.academicYear !== activeAcademicYear) return false;
    
    // Student sees only their class
    if (isStudent && user.classId && entry.classId !== user.classId) return false;
    
    // Class Teacher sees only their class
    if (isClassTeacher && user.classId && entry.classId !== user.classId) return false;

    // Optional Search queries
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = entry.examName.toLowerCase().includes(q) || 
                        entry.subjectName.toLowerCase().includes(q) || 
                        entry.room.toLowerCase().includes(q) || 
                        entry.supervisor.toLowerCase().includes(q);
      if (!matchName) return false;
    }

    // Grid filters
    if (filterClass !== 'All' && entry.classId !== filterClass) return false;
    if (filterExam !== 'All' && entry.examId !== filterExam) return false;
    if (filterSubject !== 'All' && entry.subjectId !== filterSubject) return false;

    return true;
  });

  const allFilteredSchedules = examSchedules.filter(entry => {
    if (entry.academicYear !== activeAcademicYear) return false;

    if (filterClass !== 'All' && entry.classId !== filterClass) return false;
    if (filterExam !== 'All' && entry.examId !== filterExam) return false;
    if (filterSubject !== 'All' && entry.subjectId !== filterSubject) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return entry.examName.toLowerCase().includes(q) || 
             entry.subjectName.toLowerCase().includes(q) || 
             entry.room.toLowerCase().includes(q) || 
             entry.supervisor.toLowerCase().includes(q);
    }
    return true;
  });

  const currentDisplaySchedules = (isStudent || isClassTeacher) ? studentFilteredSchedules : allFilteredSchedules;

  // --- CSV / EXPORT TO EXCEL GENERATION ---
  const handleExportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Academic Year,Exam,Date,Class,Division,Subject,Duration (Mins),Start Time,Room,Supervisor,Remarks\n";

    currentDisplaySchedules.forEach(es => {
      const row = `"${es.academicYear}","${es.examName}","${es.date}","${es.classId}","${es.division}","${es.subjectName}","${es.durationMinutes}","${es.startTime}","${es.room}","${es.supervisor}","${es.remarks || '-'}"`;
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `NHS_Exam_Schedule_${activeAcademicYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- TRIGGER BROWSER PRINT ---
  const triggerPrintLayout = () => {
    const style = document.createElement('style');
    style.id = 'print-page-layout-exam';
    style.innerHTML = `
      @media print {
        @page { size: A4 ${printOrientation}; margin: 12mm; }
        body { font-size: 10pt; background: white; color: black; }
        .no-print { display: none !important; }
        .print-only { display: block !important; }
        .border-print { border: 1px solid #cbd5e1 !important; }
      }
    `;
    document.head.appendChild(style);
    printSectionById('exam-manager-print-area', 'Examination Report / Schedule');
    setTimeout(() => {
      const addedStyle = document.getElementById('print-page-layout-exam');
      if (addedStyle) addedStyle.remove();
    }, 500);
  };

  return (
    <div id="exam-manager-print-area" className="space-y-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm relative print:p-0 print:border-none print:shadow-none">
      
      {/* 1. PRINT HEADERS */}
      <PrintLetterhead lang={lang} subtitle={`EXAMINATION SYSTEM MASTER SHEET - ${activeAcademicYear}`} />

      {/* 2. TAB CONTROLS (No Print) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4 no-print">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 font-sans">
              {lang === 'ur' ? 'امتحانی کنٹرول اور نظام نظامت' : lang === 'hi' ? 'परीक्षा एवं मूल्यांकन केंद्र' : 'Examination Desk & Evaluation'}
            </h2>
            <p className="text-xs text-slate-500 font-mono">Academic Session: {activeAcademicYear}</p>
          </div>
        </div>

        {/* Global Academic Year Toggle */}
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Session Year</label>
          <select
            value={activeAcademicYear}
            onChange={(e) => setActiveAcademicYear(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 font-bold text-slate-700"
          >
            {academicYears.map(yr => (
              <option key={yr} value={yr}>{yr}</option>
            ))}
          </select>

          {canEdit && activeTab === 'exams' && (
            <button
              onClick={handleCopyPreviousYearExams}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 text-xs font-bold transition-all cursor-pointer"
              title="Duplicate previous session active records into current year"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Previous</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tabs (No Print) */}
      <div className="flex overflow-x-auto gap-1 border-b border-slate-100 pb-1 scrollbar-thin no-print">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'overview' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('exams')}
          className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'exams' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Exam Master</span>
        </button>

        <button
          onClick={() => setActiveTab('terms')}
          className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'terms' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Terms</span>
        </button>

        <button
          onClick={() => setActiveTab('types')}
          className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'types' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>Exam Types</span>
        </button>

        <button
          onClick={() => setActiveTab('mapping')}
          className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'mapping' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Grading Matrix</span>
        </button>

        <button
          onClick={() => setActiveTab('grading')}
          className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'grading' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Grading System</span>
        </button>

        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'schedule' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Timetable</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'reports' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Reports & Print</span>
        </button>

        {!isStudent && (
          <button
            onClick={() => setActiveTab('question_papers')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'question_papers' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Question Papers</span>
          </button>
        )}

        {user.role !== 'student' && (
          <button
            onClick={() => setActiveTab('mark_list_a')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'mark_list_a' ? 'bg-blue-50 text-blue-700 font-extrabold border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5 text-indigo-500" />
            <span>Mark List A (FA/SA)</span>
          </button>
        )}
      </div>

      {/* ==========================================
          TAB 1: OVERVIEW DASHBOARD
          ========================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in no-print">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Exams Configured</span>
              <span className="text-2xl font-black text-slate-800">{examinations.filter(e => e.academicYear === activeAcademicYear).length} Schemes</span>
              <span className="text-[10px] text-emerald-600 font-semibold block mt-1">✔ Active & Auditable</span>
            </div>

            <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Academic Terms</span>
              <span className="text-2xl font-black text-slate-800">{examTerms.length} Terms</span>
              <span className="text-[10px] text-slate-500 block mt-1">unlimited structural partitions</span>
            </div>

            <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mapped Subjects Matrix</span>
              <span className="text-2xl font-black text-slate-800">{classExamMappings.length} Configured</span>
              <span className="text-[10px] text-blue-600 block mt-1">Cascaded to Mark List A</span>
            </div>

            <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Upcoming Slots Scheduled</span>
              <span className="text-2xl font-black text-slate-800">{examSchedules.filter(s => s.academicYear === activeAcademicYear).length} Exam Slots</span>
              <span className="text-[10px] text-orange-600 block mt-1">Supervisor roster live</span>
            </div>
          </div>

          {/* Visual Informational Alert */}
          <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex gap-3 text-xs text-blue-800 leading-relaxed">
            <Info className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <span className="font-bold block text-blue-900 mb-0.5">National High School ERP Rule: Examination Module Connectivity</span>
              This Examination Master acts as the baseline configuration sheet. All definitions created here (Exam name, subjects, component weighting structure, passing criteria, and timetable schedules) automatically cascade downstream into the core gradebook, enabling automated GPA calculation, print-perfect report cards, and leaving verification registers. Only Headmasters have edit permission; Clerks, Teachers, and Students receive secure read-only mirrors.
            </div>
          </div>

          {/* Core Master Summary Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="border border-slate-100 rounded-2xl p-4 space-y-4">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <CheckSquare className="w-4 h-4 text-emerald-600" />
                <span>Standard Roster of Schemes</span>
              </h3>
              <div className="divide-y divide-slate-100">
                {examinations.filter(e => e.academicYear === activeAcademicYear).map(ex => (
                  <div key={ex.id} className="py-2.5 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-slate-800 block">{ex.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">Short Code: {ex.shortName} | Term: {ex.term}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-bold ${
                      ex.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>{ex.status}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-slate-100 rounded-2xl p-4 space-y-4">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <Calendar className="w-4 h-4 text-orange-600" />
                <span>Next Scheduled Timetable Slots</span>
              </h3>
              <div className="divide-y divide-slate-100">
                {examSchedules.slice(0, 4).map(s => (
                  <div key={s.id} className="py-2.5 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-slate-800 block">{s.subjectName}</span>
                      <span className="text-[10px] text-slate-500">Class {s.classId} | Room {s.room} | Sup: {s.supervisor}</span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-500">{s.date} ({s.startTime})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 2: EXAMINATION MASTER
          ========================================== */}
      {activeTab === 'exams' && (
        <div className="space-y-6 animate-fade-in no-print">
          {canEdit && (
            <form onSubmit={handleSaveExam} className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl space-y-4">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                {editingExamId ? 'Edit Exam Master Parameters' : 'Create New Examination Scheme'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Academic Year</label>
                  <input
                    type="text"
                    disabled
                    value={activeAcademicYear}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-100 text-slate-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Examination Name*</label>
                  <input
                    type="text"
                    placeholder="e.g. First Semester Exam"
                    required
                    value={examName}
                    onChange={(e) => setExamName(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Short Name / Code*</label>
                  <input
                    type="text"
                    placeholder="e.g. SEM-1"
                    required
                    value={examShortName}
                    onChange={(e) => setExamShortName(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 uppercase focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Select Academic Term*</label>
                  <select
                    value={examTerm}
                    onChange={(e) => setExamTerm(e.target.value)}
                    required
                    className="w-full text-xs border border-slate-200 bg-white rounded-lg p-2 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">-- Choose Term --</option>
                    {examTerms.map(t => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Display/Print Order</label>
                  <input
                    type="number"
                    min="1"
                    value={examOrder}
                    onChange={(e) => setExamOrder(Number(e.target.value))}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:border-blue-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status Policy</label>
                  <select
                    value={examStatus}
                    onChange={(e: any) => setExamStatus(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white rounded-lg p-2 focus:border-blue-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/50">
                {editingExamId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingExamId(null);
                      setExamName('');
                      setExamShortName('');
                      setExamTerm('');
                      setExamOrder(1);
                    }}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold bg-white cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  {editingExamId ? 'Update Exam Parameter' : 'Register Examination'}
                </button>
              </div>
            </form>
          )}

          {/* List Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] font-mono">
                  <th className="p-3">Display Order</th>
                  <th className="p-3">Examination Name</th>
                  <th className="p-3">Code</th>
                  <th className="p-3">Term Group</th>
                  <th className="p-3 text-center">Status</th>
                  {canEdit && <th className="p-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {examinations.filter(e => e.academicYear === activeAcademicYear).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 italic">No examinations registered in this academic year.</td>
                  </tr>
                ) : (
                  examinations
                    .filter(e => e.academicYear === activeAcademicYear)
                    .sort((a, b) => a.displayOrder - b.displayOrder)
                    .map(ex => (
                      <tr key={ex.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono font-bold text-slate-400">#{ex.displayOrder}</td>
                        <td className="p-3 font-bold text-slate-800">{ex.name}</td>
                        <td className="p-3 font-mono text-blue-600 font-bold">{ex.shortName}</td>
                        <td className="p-3 font-medium text-slate-500">{ex.term}</td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            disabled={!canEdit}
                            onClick={() => handleToggleExamStatus(ex)}
                            className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-bold cursor-pointer ${
                              ex.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {ex.status}
                          </button>
                        </td>
                        {canEdit && (
                          <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              onClick={() => handleEditExam(ex)}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                              title="Edit exam master"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button type="button"
                              onClick={() => handleDeleteExam(ex.id)}
                              className="p-1 text-rose-400 hover:text-rose-700 rounded transition-colors"
                              title="Delete exam master"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 3: TERM MASTER
          ========================================== */}
      {activeTab === 'terms' && (
        <div className="space-y-6 animate-fade-in no-print">
          {canEdit && (
            <form onSubmit={handleSaveTerm} className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl space-y-4">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                {editingTermId ? 'Edit Term Structure' : 'Add Academic Term Setting'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Term Name*</label>
                  <input
                    type="text"
                    placeholder="e.g. Term 1, Semester 1, Annual"
                    required
                    value={termName}
                    onChange={(e) => setTermName(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status</label>
                  <select
                    value={termStatus ? 'true' : 'false'}
                    onChange={(e) => setTermStatus(e.target.value === 'true')}
                    className="w-full text-xs border border-slate-200 bg-white rounded-lg p-2 focus:border-blue-500"
                  >
                    <option value="true">Active & Visible</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/50">
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  Save Term
                </button>
              </div>
            </form>
          )}

          {/* Terms List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {examTerms.map(t => (
              <div key={t.id} className="border border-slate-100 rounded-2xl p-4 bg-white flex items-center justify-between shadow-sm">
                <div>
                  <span className="font-bold text-slate-800 text-xs block">{t.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">Academic Session: {t.academicYear || activeAcademicYear}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-bold ${
                    t.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>{t.isActive ? 'Active' : 'Inactive'}</span>
                  {canEdit && (
                    <button type="button"
                      onClick={() => handleDeleteTerm(t.id)}
                      className="p-1 text-rose-400 hover:text-rose-700 rounded hover:bg-rose-50"
                      title="Delete Term"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 4: EXAM TYPES MASTER
          ========================================== */}
      {activeTab === 'types' && (
        <div className="space-y-6 animate-fade-in no-print">
          {canEdit && (
            <form onSubmit={handleSaveType} className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl space-y-4">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Register Custom Examination Category / Type
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Type Name*</label>
                  <input
                    type="text"
                    placeholder="e.g. Slip Test, Oral, Written, Practical"
                    required
                    value={typeName}
                    onChange={(e) => setTypeName(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status policy</label>
                  <select
                    value={typeStatus ? 'true' : 'false'}
                    onChange={(e) => setTypeStatus(e.target.value === 'true')}
                    className="w-full text-xs border border-slate-200 bg-white rounded-lg p-2 focus:border-blue-500"
                  >
                    <option value="true">Active & Visible</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/50">
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  Register Exam Type
                </button>
              </div>
            </form>
          )}

          {/* Exam Types grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {examTypes.map(t => (
              <div key={t.id} className="border border-slate-100 rounded-2xl p-4 bg-white flex items-center justify-between shadow-sm">
                <span className="font-bold text-slate-800 text-xs">{t.name}</span>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  {canEdit && (
                    <button type="button"
                      onClick={() => handleDeleteType(t.id)}
                      className="p-1 text-rose-400 hover:text-rose-700 rounded hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 5: CLASS EXAM MAPPING & SUBJECT WEIGHTS
          ========================================== */}
      {activeTab === 'mapping' && (
        <div className="space-y-6 animate-fade-in no-print">
          {canEdit && (
            <form onSubmit={handleSaveMapping} className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl space-y-4">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                {editingMappingId ? 'Edit Mapping Grade Matrix' : 'Map Examination to Classes'}
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Examination Target*</label>
                  <select
                    value={mappingExamId}
                    onChange={(e) => setMappingExamId(e.target.value)}
                    required
                    className="w-full text-xs border border-slate-200 bg-white rounded-lg p-2 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">-- Choose Exam --</option>
                    {examinations.filter(e => e.academicYear === activeAcademicYear).map(ex => (
                      <option key={ex.id} value={ex.id}>{ex.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Class Target*</label>
                  <select
                    value={mappingClassId}
                    onChange={(e) => setMappingClassId(e.target.value)}
                    required
                    className="w-full text-xs border border-slate-200 bg-white rounded-lg p-2 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">-- Choose Class --</option>
                    {['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Division Target</label>
                  <select
                    value={mappingDivision}
                    onChange={(e) => setMappingDivision(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white rounded-lg p-2 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="All">All Divisions</option>
                    <option value="A">Division A</option>
                    <option value="B">Division B</option>
                    <option value="C">Division C</option>
                    <option value="Urdu Medium">Urdu Medium</option>
                    <option value="Science">Science Track</option>
                    <option value="Commerce">Commerce Track</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Associated Term</label>
                  <input
                    type="text"
                    disabled
                    value={mappingTerm || 'Semester 1'}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-100 text-slate-500 font-mono"
                  />
                </div>
              </div>

              {/* Mapped Subjects Structure editor */}
              {mappingSubjects.length > 0 && (
                <div className="space-y-3 pt-2">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subject-wise Grading & Marks Configuration</span>
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white max-h-80 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[10px] font-mono text-slate-500 uppercase font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">Subject</th>
                          <th className="p-2.5 text-center">Theory</th>
                          <th className="p-2.5 text-center">Practical</th>
                          <th className="p-2.5 text-center">Internal</th>
                          <th className="p-2.5 text-center">Project</th>
                          <th className="p-2.5 text-center">Oral</th>
                          <th className="p-2.5 text-center font-bold">Total Max</th>
                          <th className="p-2.5 text-center">Min Pass</th>
                          <th className="p-2.5 text-right">Configure</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {mappingSubjects.map((sub, idx) => (
                          <tr key={sub.subjectId} className="hover:bg-slate-50/50">
                            <td className="p-2.5 font-bold text-slate-700">{sub.subjectName}</td>
                            <td className="p-2.5 text-center font-mono">{sub.theoryMarks}</td>
                            <td className="p-2.5 text-center font-mono">{sub.practicalMarks}</td>
                            <td className="p-2.5 text-center font-mono">{sub.internalMarks}</td>
                            <td className="p-2.5 text-center font-mono">{sub.projectMarks}</td>
                            <td className="p-2.5 text-center font-mono">{sub.oralMarks}</td>
                            <td className="p-2.5 text-center font-mono font-black text-blue-600 bg-blue-50/20">{sub.totalMarks}</td>
                            <td className="p-2.5 text-center font-mono text-rose-600 font-bold">{sub.minPassingMarks}</td>
                            <td className="p-2.5 text-right">
                              <button
                                type="button"
                                onClick={() => openSubjectStructureModal(idx)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded"
                              >
                                Edit Weights
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/50">
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  Save Map Configuration
                </button>
              </div>
            </form>
          )}

          {/* ACTIVE SUBJECT STRUCTURE POPUP/DRAWER (Contiguous configuration block) */}
          {activeSubjectEditIndex !== null && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in no-print">
              <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-100 shadow-2xl p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h4 className="font-bold text-slate-900 text-sm">
                    Grading Structure: {mappingSubjects[activeSubjectEditIndex].subjectName}
                  </h4>
                  <button onClick={() => setActiveSubjectEditIndex(null)} className="p-1 hover:bg-slate-100 rounded">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Theory Marks</label>
                    <input
                      type="number"
                      value={theoryMarks}
                      onChange={(e) => setTheoryMarks(Number(e.target.value))}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Practical Marks</label>
                    <input
                      type="number"
                      value={practicalMarks}
                      onChange={(e) => setPracticalMarks(Number(e.target.value))}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Internal Assessment</label>
                    <input
                      type="number"
                      value={internalMarks}
                      onChange={(e) => setInternalMarks(Number(e.target.value))}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Project Marks</label>
                    <input
                      type="number"
                      value={projectMarks}
                      onChange={(e) => setProjectMarks(Number(e.target.value))}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Oral Marks</label>
                    <input
                      type="number"
                      value={oralMarks}
                      onChange={(e) => setOralMarks(Number(e.target.value))}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Min Passing Marks</label>
                    <input
                      type="number"
                      value={minPassingMarks}
                      onChange={(e) => setMinPassingMarks(Number(e.target.value))}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2 font-mono text-rose-600 font-bold"
                    />
                  </div>
                </div>

                {/* Custom Components section */}
                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Custom Scoring Components (Slip test, homework, etc.)</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Component Label"
                      value={customComponentLabel}
                      onChange={(e) => setCustomComponentLabel(e.target.value)}
                      className="flex-1 text-xs border border-slate-200 rounded-lg p-2"
                    />
                    <input
                      type="number"
                      placeholder="Max Marks"
                      value={customComponentValue || ''}
                      onChange={(e) => setCustomComponentValue(Number(e.target.value))}
                      className="w-24 text-xs border border-slate-200 rounded-lg p-2 font-mono"
                    />
                    <button
                      type="button"
                      onClick={addCustomComponent}
                      className="px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold"
                    >
                      Add
                    </button>
                  </div>

                  {customComponents.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {customComponents.map((c, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 text-[10px] font-mono px-2 py-0.5 rounded-full">
                          <span>{c.name}: {c.marks}</span>
                          <button type="button" onClick={() => removeCustomComponent(idx)} className="text-rose-600 hover:text-rose-800 font-bold font-sans">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Passing Rule Policy</label>
                  <select
                    value={passingRule}
                    onChange={(e: any) => setPassingRule(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white rounded-lg p-2"
                  >
                    <option value="Total Based">Total Based (Passing calculated on consolidated sum)</option>
                    <option value="Theory Based">Theory Based (Theory and practical both require passing separately)</option>
                    <option value="Component Based">Component Based (Each constituent weight requires minimum check)</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={saveSubjectStructure}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Save Subject Criteria
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Configuration Grid summary list */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Registered Mappings</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {classExamMappings.map(map => {
                const ex = examinations.find(e => e.id === map.examId);
                return (
                  <div key={map.id} className="border border-slate-150 rounded-2xl p-4 bg-white space-y-3 shadow-sm">
                    <div className="flex justify-between items-start border-b border-slate-50 pb-2">
                      <div>
                        <span className="font-extrabold text-slate-900 text-xs block">{ex ? ex.name : 'Unknown Exam'}</span>
                        <span className="text-[10px] text-slate-500 font-mono">Class: {map.classId} ({map.division}) | Term: {map.term}</span>
                      </div>
                      {canEdit && (
                        <div className="flex gap-1">
                          <button onClick={() => handleEditMapping(map)} className="p-1 text-slate-400 hover:text-slate-700"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => handleDeleteMapping(map.id)} className="p-1 text-rose-400 hover:text-rose-700"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      {map.subjects.slice(0, 3).map(sub => (
                        <div key={sub.subjectId} className="flex justify-between text-[11px] text-slate-600">
                          <span>{sub.subjectName}</span>
                          <span className="font-mono font-bold text-slate-500">{sub.maxMarks} Max Marks (Pass: {sub.minPassingMarks})</span>
                        </div>
                      ))}
                      {map.subjects.length > 3 && (
                        <span className="text-[10px] text-slate-400 italic font-mono block pt-1">+ {map.subjects.length - 3} more subjects configured</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 6: GRADING SYSTEM SETTINGS
          ========================================== */}
      {activeTab === 'grading' && (
        <div className="space-y-6 animate-fade-in no-print">
          {canEdit && (
            <form onSubmit={handleSaveGradeConfig} className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl space-y-4">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Configure Class Grading Policies</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Target Class*</label>
                  <select
                    value={gradeClassId}
                    onChange={(e) => setGradeClassId(e.target.value)}
                    required
                    className="w-full text-xs border border-slate-200 bg-white rounded-lg p-2"
                  >
                    <option value="">-- Select Class --</option>
                    <option value="All">All Classes (Default)</option>
                    {['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Grading System Scheme*</label>
                  <select
                    value={gradingType}
                    onChange={(e: any) => setGradingType(e.target.value)}
                    required
                    className="w-full text-xs border border-slate-200 bg-white rounded-lg p-2"
                  >
                    <option value="Marks">Marks Based System (Percentage / Absolute Score)</option>
                    <option value="Grades">Grade Based System (Direct letter scale mapping)</option>
                    <option value="Mixed">Mixed System (Both marks and letters printed)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Grade Scale Roster</label>
                  <select
                    value={gradeScaleId}
                    onChange={(e) => setGradeScaleId(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white rounded-lg p-2"
                  >
                    <option value="gr1">Maharashtra Board Scale (A1 to E)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/50">
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  Save Grading Policy
                </button>
              </div>
            </form>
          )}

          {/* Active Policies Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono uppercase font-bold text-[10px]">
                  <th className="p-3">Class/Grade</th>
                  <th className="p-3">Policy Type</th>
                  <th className="p-3">Grade Scale Reference</th>
                  {canEdit && <th className="p-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {gradeConfigs.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-bold text-slate-800">{c.classId === 'All' ? 'Global Default (All Classes)' : c.classId}</td>
                    <td className="p-3 font-medium text-slate-600">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-bold uppercase text-[9px] font-mono">{c.gradingType}</span>
                    </td>
                    <td className="p-3 text-slate-400 font-mono">Standard Scale gr1</td>
                    {canEdit && (
                      <td className="p-3 text-right">
                        <button type="button" onClick={() => handleDeleteGradeConfig(c.id)} className="text-rose-500 hover:text-rose-700 p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 7: EXAMINATION SCHEDULE / TIMETABLE
          ========================================== */}
      {activeTab === 'schedule' && (
        <div className="space-y-6 animate-fade-in no-print">
          {canEdit && (
            <form onSubmit={handleSaveSchedule} className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl space-y-4">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                {editingScheduleId ? 'Edit Exam Timetable Slot' : 'Create Exam Timetable Slot'}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Select Exam Scheme*</label>
                  <select
                    value={schExamId}
                    onChange={(e) => setSchExamId(e.target.value)}
                    required
                    className="w-full text-xs border border-slate-200 bg-white rounded-lg p-2 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Choose Exam --</option>
                    {examinations.filter(e => e.academicYear === activeAcademicYear).map(ex => (
                      <option key={ex.id} value={ex.id}>{ex.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Target Class*</label>
                  <select
                    value={schClassId}
                    onChange={(e) => setSchClassId(e.target.value)}
                    required
                    className="w-full text-xs border border-slate-200 bg-white rounded-lg p-2 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Choose Class --</option>
                    {['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Division Policy</label>
                  <select
                    value={schDivision}
                    onChange={(e) => setSchDivision(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white rounded-lg p-2 focus:outline-none"
                  >
                    <option value="All">All Divisions</option>
                    <option value="A">Division A</option>
                    <option value="B">Division B</option>
                    <option value="C">Division C</option>
                    <option value="Urdu Medium">Urdu Medium</option>
                    <option value="Science">Science Track</option>
                    <option value="Commerce">Commerce Track</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Select Subject*</label>
                  <select
                    value={schSubjectId}
                    onChange={(e) => setSchSubjectId(e.target.value)}
                    required
                    className="w-full text-xs border border-slate-200 bg-white rounded-lg p-2 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Select Subject --</option>
                    {subjects.map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.subjectName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Date of Exam*</label>
                  <input
                    type="date"
                    required
                    value={schDate}
                    onChange={(e) => setSchDate(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Start Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 10:00 AM"
                    value={schStartTime}
                    onChange={(e) => setSchStartTime(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    min="30"
                    step="15"
                    value={schDuration}
                    onChange={(e) => setSchDuration(Number(e.target.value))}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Assigned Exam Room</label>
                  <input
                    type="text"
                    placeholder="e.g. Hall A, Room 104"
                    value={schRoom}
                    onChange={(e) => setSchRoom(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Invigilator / Supervisor</label>
                  <select
                    value={schSupervisor}
                    onChange={(e) => setSchSupervisor(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white rounded-lg p-2"
                  >
                    <option value="">-- Choose Supervisor --</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.name}>{t.name} ({t.username || t.shalarthId} - {t.designation || 'Teacher'})</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Instructions / Remarks</label>
                  <input
                    type="text"
                    placeholder="Instructions for students regarding items allowed etc."
                    value={schRemarks}
                    onChange={(e) => setSchRemarks(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/50">
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  Schedule Exam Slot
                </button>
              </div>
            </form>
          )}

          {/* Interactive Filters Panel */}
          <div className="flex flex-wrap gap-3 p-4 bg-slate-50/50 rounded-2xl items-center text-xs">
            <span className="font-bold text-slate-500 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Search Timetables:</span>
            </span>

            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 font-semibold"
            >
              <option value="All">All Classes</option>
              {['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={filterExam}
              onChange={(e) => setFilterExam(e.target.value)}
              className="border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 font-semibold"
            >
              <option value="All">All Exams</option>
              {examinations.filter(e => e.academicYear === activeAcademicYear).map(ex => (
                <option key={ex.id} value={ex.id}>{ex.name}</option>
              ))}
            </select>

            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search subject, room, supervisor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg bg-white"
              />
            </div>
          </div>

          {/* List Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono uppercase font-bold text-[10px]">
                  <th className="p-3">Exam Date</th>
                  <th className="p-3">Class/Div</th>
                  <th className="p-3">Examination Name</th>
                  <th className="p-3">Subject Name</th>
                  <th className="p-3">Time & Duration</th>
                  <th className="p-3">Room</th>
                  <th className="p-3">Supervisor</th>
                  {canEdit && <th className="p-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentDisplaySchedules.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 8 : 7} className="p-8 text-center text-slate-400 italic">No exams matching the search parameters have been scheduled.</td>
                  </tr>
                ) : (
                  currentDisplaySchedules.map(es => (
                    <tr key={es.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-mono font-bold text-slate-800">{es.date}</td>
                      <td className="p-3 font-semibold text-slate-600">Class {es.classId} ({es.division})</td>
                      <td className="p-3 font-medium text-slate-500">{es.examName}</td>
                      <td className="p-3 font-bold text-slate-700">{es.subjectName}</td>
                      <td className="p-3 text-slate-500 font-mono">
                        {es.startTime} ({es.durationMinutes} Mins)
                      </td>
                      <td className="p-3 font-medium text-slate-500">{es.room}</td>
                      <td className="p-3 font-semibold text-emerald-700">{es.supervisor}</td>
                      {canEdit && (
                        <td className="p-3 text-right space-x-1 whitespace-nowrap">
                          <button onClick={() => handleEditSchedule(es)} className="p-1 text-slate-400 hover:text-slate-700"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => handleDeleteSchedule(es.id)} className="p-1 text-rose-400 hover:text-rose-700"><Trash2 className="w-3.5 h-3.5" /></button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 8: REPORTS & PRINT DESK
          ========================================== */}
      {activeTab === 'reports' && (
        <div className="space-y-6 animate-fade-in print:space-y-0">
          
          {/* Controls toolbar (Hidden during print) */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-200/50 rounded-2xl no-print">
            <div className="flex flex-wrap gap-3 items-center text-xs">
              <span className="font-extrabold text-slate-700">Print Specifications:</span>
              
              <select
                value={printOrientation}
                onChange={(e: any) => setPrintOrientation(e.target.value)}
                className="border border-slate-200 rounded px-2 py-1.5 bg-white text-slate-700 font-semibold"
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>

              <select
                value={printPaperSize}
                onChange={(e: any) => setPrintPaperSize(e.target.value)}
                className="border border-slate-200 rounded px-2 py-1.5 bg-white text-slate-700 font-semibold"
              >
                <option value="A4">A4 Page</option>
                <option value="A3">A3 Page</option>
              </select>

              <select
                value={printMode}
                onChange={(e: any) => setPrintMode(e.target.value)}
                className="border border-slate-200 rounded px-2 py-1.5 bg-white text-slate-700 font-semibold"
              >
                <option value="colour">High Color</option>
                <option value="monochrome">Grayscale / Mono</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportToCSV}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Excel Report</span>
              </button>
              
              <button
                onClick={triggerPrintLayout}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Schedule Sheet</span>
              </button>
            </div>
          </div>

          {/* Dynamic Filters for report preview */}
          <div className="flex flex-wrap gap-3 p-4 bg-slate-50/20 border border-slate-100 rounded-2xl items-center text-xs no-print">
            <span className="font-bold text-slate-400">Class Scope:</span>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="border border-slate-200 rounded-lg px-2 py-1 bg-white font-semibold"
            >
              <option value="All">All Classes</option>
              {['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <span className="font-bold text-slate-400">Exam Scheme:</span>
            <select
              value={filterExam}
              onChange={(e) => setFilterExam(e.target.value)}
              className="border border-slate-200 rounded-lg px-2 py-1 bg-white font-semibold"
            >
              <option value="All">All Examinations</option>
              {examinations.filter(e => e.academicYear === activeAcademicYear).map(ex => (
                <option key={ex.id} value={ex.id}>{ex.name}</option>
              ))}
            </select>
          </div>

          {/* REPORT SHEET CANVAS (Visually identical print preview container) */}
          <div className={`p-8 border border-slate-200 rounded-2xl bg-white shadow-sm max-w-4xl mx-auto print:border-none print:shadow-none print:p-0 print:max-w-none ${
            printMode === 'monochrome' ? 'grayscale' : ''
          }`}>
            <PrintLetterhead lang={lang} subtitle={`Official Examination Timetable & Supervisor Allocation`} />
            
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono border-b border-slate-100 pb-2 mb-4">
              <span>National High School, Taloda</span>
              <span>Generated: {new Date().toLocaleString()}</span>
              <span>Academic Year: {activeAcademicYear}</span>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-bold text-slate-900 border-l-2 border-blue-600 pl-2 mb-3">
                  Scheduled Examination Roster List
                </h4>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-300 font-mono uppercase text-slate-600 font-extrabold text-[9px]">
                      <th className="p-2 border">Date</th>
                      <th className="p-2 border">Class & Div</th>
                      <th className="p-2 border">Exam Scheme</th>
                      <th className="p-2 border">Subject Name</th>
                      <th className="p-2 border">Start Time</th>
                      <th className="p-2 border">Duration</th>
                      <th className="p-2 border">Invigilator</th>
                      <th className="p-2 border">Room No.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700">
                    {currentDisplaySchedules.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-slate-400 italic">No exams configured in the current report parameters.</td>
                      </tr>
                    ) : (
                      currentDisplaySchedules.map(es => (
                        <tr key={es.id} className="hover:bg-slate-50/50">
                          <td className="p-2.5 border font-mono font-bold">{es.date}</td>
                          <td className="p-2.5 border font-semibold">Class {es.classId} ({es.division})</td>
                          <td className="p-2.5 border text-slate-500">{es.examName}</td>
                          <td className="p-2.5 border font-extrabold text-slate-900">{es.subjectName}</td>
                          <td className="p-2.5 border font-mono">{es.startTime}</td>
                          <td className="p-2.5 border font-mono">{es.durationMinutes} Mins</td>
                          <td className="p-2.5 border font-medium text-emerald-800">{es.supervisor}</td>
                          <td className="p-2.5 border font-mono font-bold text-slate-500">{es.room}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Class Grading Policies Breakdown as part of the overall report */}
              <div className="pt-4 page-break-before">
                <h4 className="text-sm font-bold text-slate-900 border-l-2 border-emerald-500 pl-2 mb-3">
                  Class-wise Academic Grading Protocol
                </h4>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-300 font-mono uppercase text-slate-600 font-extrabold text-[9px]">
                      <th className="p-2 border">Target Class</th>
                      <th className="p-2 border">Evaluation Standard</th>
                      <th className="p-2 border">Grade Reference scale</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {gradeConfigs.map(config => (
                      <tr key={config.id}>
                        <td className="p-2 border font-bold text-slate-700">{config.classId === 'All' ? 'Global Default (All Classes)' : config.classId}</td>
                        <td className="p-2 border text-slate-600 uppercase font-bold text-[10px] font-mono">{config.gradingType} BASED</td>
                        <td className="p-2 border text-slate-400 font-mono">Scale Code: gr1 (A1 to E Pass/Fail scale)</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Official seal and signature line area */}
            <PrintSignatureArea lang={lang} />
          </div>
        </div>
      )}
      {activeTab === 'question_papers' && (
        <div className="animate-fade-in text-left">
          <QuestionPaperManager lang={lang} user={user} onRefreshData={onRefreshData} />
        </div>
      )}
      {activeTab === 'mark_list_a' && (
        <div className="animate-fade-in text-left">
          <SmartMarkListA lang={lang} user={user} onRefreshData={onRefreshData} />
        </div>
      )}
    </div>
  );
}
