/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  FileText, Plus, Trash2, Edit2, Check, X, Shield, Lock, Unlock,
  AlertCircle, Copy, Printer, Search, Filter, Info, RefreshCw, LayoutGrid,
  ArrowUp, ArrowDown, ClipboardCopy, Send, FileCheck, Eye, Sparkles, BookOpenCheck,
  CheckCircle2, ChevronRight, FileCode, Award, BookOpen, AlertTriangle, Layers
} from 'lucide-react';
import {
  Language, User, ClassStructure, SubjectMasterItem,
  QuestionBankItem, QuestionPaperQuestion, QuestionPaper, QuestionType
} from '../types';
import { printSectionById } from '../utils/printSection';
import { LocalERPDatabase } from '../lib/supabase';
import { PrintLetterhead, PrintSignatureArea } from './PrintPDFButton';
import { requestActionConfirm } from '../lib/actionConfirm';
import DocumentLanguageStudio from './DocumentLanguageStudio';
import { createDocumentLanguageProfile, documentLanguageDirection, documentLanguageFont, normalizeDocumentLanguageProfile, primaryDocumentLanguage, sectionSelection } from '../lib/documentLanguage';

const QUESTION_PAPER_LANGUAGE_SECTIONS = [
  { key: 'header', label: 'School / Exam Header', description: 'School name, exam, year, class, subject and code area.' },
  { key: 'instructions', label: 'Instructions', description: 'General instructions to candidates.' },
  { key: 'questions', label: 'Questions', description: 'Question text and options; useful for Urdu or other script-based subjects.' },
  { key: 'answers', label: 'Answer Key', description: 'Optional answer/solution key language.' },
  { key: 'signatures', label: 'Signature Labels', description: 'Examiner and headmaster signature captions.' },
] as const;

interface QuestionPaperManagerProps {
  lang: Language;
  user: User;
  onRefreshData?: () => void;
}

export default function QuestionPaperManager({ lang, user, onRefreshData }: QuestionPaperManagerProps) {
  const isHeadmaster = user.role === 'headmaster';
  const isClerk = user.role === 'clerk';
  const isTeacher = user.role === 'teacher';
  const isClassTeacher = LocalERPDatabase.getAcademicSetup()?.classTeacherAssignments?.some((a: any) => a.teacherId === user.id);
  const isStudent = user.role === 'student';

  const isUrdu = lang === 'ur';
  const academicSetupSnapshot = LocalERPDatabase.getAcademicSetup();
  const configuredAcademicYears = Array.from(new Set((academicSetupSnapshot?.academicYears || [])
    .map((item: any) => String(item?.year || item?.yearCode || '').trim())
    .filter(Boolean)));
  const activeAcademicYear = configuredAcademicYears.find((year: string) =>
    (academicSetupSnapshot?.academicYears || []).some((item: any) => String(item?.year || item?.yearCode || '').trim() === year && item?.isActive)
  ) || configuredAcademicYears[0] || '';

  // --- STATE MANAGEMENT ---
  const [papers, setPapers] = useState<QuestionPaper[]>([]);
  const [questionBank, setQuestionBank] = useState<QuestionBankItem[]>([]);
  const [classes, setClasses] = useState<ClassStructure[]>([]);
  const [subjects, setSubjects] = useState<SubjectMasterItem[]>([]);
  const [subjectAllocations, setSubjectAllocations] = useState<any[]>([]);
  const [examinations, setExaminations] = useState<any[]>([]);

  // Sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<'papers' | 'bank' | 'reports'>('papers');

  // Search & Filter (Question Papers)
  const [filterYear, setFilterYear] = useState<string>('All');
  const [filterExam, setFilterExam] = useState<string>('All');
  const [filterClass, setFilterClass] = useState<string>('All');
  const [filterSubject, setFilterSubject] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Search & Filter (Question Bank)
  const [bankSearchQuery, setBankSearchQuery] = useState<string>('');
  const [bankFilterSubject, setBankFilterSubject] = useState<string>('All');
  const [bankFilterType, setBankFilterType] = useState<string>('All');
  const [bankFilterDifficulty, setBankFilterDifficulty] = useState<string>('All');

  // Question Paper Modal / Edit state
  const [isEditingPaper, setIsEditingPaper] = useState(false);
  const [editingPaper, setEditingPaper] = useState<Partial<QuestionPaper> | null>(null);

  // Question Bank Item Modal / Edit state
  const [isEditingBankItem, setIsEditingBankItem] = useState(false);
  const [editingBankItem, setEditingBankItem] = useState<Partial<QuestionBankItem> | null>(null);

  // Import from Bank state (Inside Question Paper Editor)
  const [isImportingQuestions, setIsImportingQuestions] = useState(false);

  // Print Preview state
  const [previewPaper, setPreviewPaper] = useState<QuestionPaper | null>(null);
  const [printSize, setPrintSize] = useState<'A4' | 'A3'>('A4');
  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [printColor, setPrintColor] = useState<'colour' | 'bw'>('colour');
  const [showAnswerKey, setShowAnswerKey] = useState<boolean>(false);
  const [paperLanguageProfile, setPaperLanguageProfile] = useState(() => createDocumentLanguageProfile('question-paper', [...QUESTION_PAPER_LANGUAGE_SECTIONS], 'en'));

  // Success / Error Alerts
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load all initial state
  useEffect(() => {
    loadDatabase();
  }, []);

  const loadDatabase = () => {
    const papersList = LocalERPDatabase.getQuestionPapers();
    const bankList = LocalERPDatabase.getQuestionBank();
    const classesList = LocalERPDatabase.getClasses();
    const academicSetup = LocalERPDatabase.getAcademicSetup();
    const examsList = LocalERPDatabase.getExaminations();

    setPapers(papersList);
    setQuestionBank(bankList);
    setClasses(classesList);
    setExaminations(examsList || []);

    if (academicSetup) {
      if (academicSetup.subjects) {
        setSubjects(academicSetup.subjects);
      }
      if (academicSetup.subjectAllocations) {
        setSubjectAllocations(academicSetup.subjectAllocations);
      }
    }
  };

  const showAlert = (type: 'success' | 'error', text: string) => {
    setAlertMsg({ type, text });
    setTimeout(() => {
      setAlertMsg(null);
    }, 4000);
  };

  // Log Audit Entry
  const logAction = (actionName: string, desc: string) => {
    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role,
      actionName,
      'Question Paper Management',
      desc
    );
    if (onRefreshData) onRefreshData();
  };

  // --- ACCESS CONTROL AND PRESETS ---
  // Get Teacher's assigned classes and subjects
  const teacherAllocations = subjectAllocations.filter(alloc => alloc.teacherId === user.id && alloc.isActive);
  const teacherClassNames = Array.from(new Set(teacherAllocations.map(a => a.className)));
  const teacherSubjectNames = Array.from(new Set(teacherAllocations.map(a => a.subjectName)));

  // Determine if a user can edit a specific paper
  const canEditPaper = (paper: QuestionPaper) => {
    // Final/approved papers are immutable from the operational editor.
    // Headmaster approval/finalization is a control action, not content editing.
    if (paper.status !== 'Draft') return false;
    if (isHeadmaster) return true;
    if (isTeacher) {
      // Teachers may edit only their own draft papers.
      return paper.teacherId === user.id;
    }
    return false;
  };

  const canDeletePaper = (paper: QuestionPaper) => {
    // Never allow deletion after approval/finalization.
    if (paper.status !== 'Draft') return false;
    return isHeadmaster || (isTeacher && paper.teacherId === user.id);
  };

  // Determine if a user can create papers
  const canCreatePapers = isHeadmaster || isTeacher;

  // Auto-generate paper code helper
  const generatePaperCode = (year: string, classId: string, subjectName: string): string => {
    const yr = year.replace('-', '');
    const cls = classId.replace(/\s+/g, '');
    const sub = subjectName ? subjectName.split(' ')[0].substring(0, 3).toUpperCase() : 'SUB';
    const existing = LocalERPDatabase.getQuestionPapers();
    const count = existing.filter(p => p.classId === classId && p.subjectName === subjectName).length + 1;
    return `QP-${yr}-${cls}-${sub}-${String(count).padStart(2, '0')}`;
  };

  // --- QUESTION PAPER PERSISTENCE & ACTIONS ---

  const handleSavePaper = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPaper) return;
    if (editingPaper.id && editingPaper.status && editingPaper.status !== 'Draft') {
      showAlert('error', 'Approved or finalized Question Papers are locked and cannot be edited.');
      return;
    }

    const {
      id, academicYear, examId, term, examType, classId, division,
      subjectId, maxMarks, passingMarks, durationMinutes, instructions, questions, status
    } = editingPaper;

    if (!academicYear || !examId || !classId || !subjectId) {
      showAlert('error', 'Please fill in all required fields.');
      return;
    }

    const selectedSubject = subjects.find(s => s.id === subjectId) || subjects[0];
    const subjectName = selectedSubject ? selectedSubject.name : 'Unknown Subject';

    // Automatic Marks Validation
    const totalQuestionsMarks = (questions || []).reduce((sum, q) => sum + Number(q.marks), 0);
    const maxMarksNum = Number(maxMarks || 0);

    if (totalQuestionsMarks !== maxMarksNum) {
      showAlert('error', `Marks validation failed: Total sum of question marks (${totalQuestionsMarks}) must equal Maximum Marks (${maxMarksNum}).`);
      return;
    }

    const examItem = examinations.find(ex => ex.id === examId);
    const examName = examItem ? examItem.name : 'Exam';

    const paperId = id || 'qp_' + Date.now();
    const autoCode = editingPaper.paperCode || generatePaperCode(academicYear, classId, subjectName);

    const paperToSave: QuestionPaper = {
      id: paperId,
      academicYear,
      examId,
      examName,
      term: term || 'Term 1',
      examType: examType || 'Written',
      classId,
      division: division || 'All',
      subjectId,
      subjectName,
      teacherId: id ? (editingPaper.teacherId || user.id) : user.id,
      teacherName: id ? (editingPaper.teacherName || user.name) : user.name,
      paperCode: autoCode,
      maxMarks: maxMarksNum,
      passingMarks: Number(passingMarks || 0),
      durationMinutes: Number(durationMinutes || 0),
      instructions: instructions || '',
      status: (status as any) || 'Draft',
      questions: questions || [],
      createdAt: editingPaper.createdAt || new Date().toISOString()
    };
    (paperToSave as any).documentLanguageProfile = paperLanguageProfile;

    const updated = LocalERPDatabase.saveQuestionPaper(paperToSave);
    setPapers(updated);
    setIsEditingPaper(false);
    setEditingPaper(null);

    logAction(
      id ? 'Update Question Paper' : 'Create Question Paper',
      `Question Paper ${autoCode} for ${classId} - ${subjectName} (${status || 'Draft'}) saved.`
    );
    showAlert('success', `Question Paper ${autoCode} saved successfully.`);
  };

  const handleDeletePaper = async (id: string, code: string) => {
    const paper = papers.find(item => item.id === id);
    if (paper && !canDeletePaper(paper)) {
      showAlert('error', 'Approved or finalized Question Papers are locked and cannot be deleted.');
      return;
    }
    if (await requestActionConfirm({ title: 'Delete Question Paper?', message: `Are you sure you want to delete Question Paper ${code}?`, confirmLabel: 'Delete Paper', tone: 'danger' })) {
      const updated = LocalERPDatabase.deleteQuestionPaper(id);
      setPapers(updated);
      logAction('Delete Question Paper', `Deleted Question Paper ${code}`);
      showAlert('success', `Question Paper deleted.`);
    }
  };

  const handleDuplicatePaper = (parentPaper: QuestionPaper) => {
    const newId = 'qp_' + Date.now();
    const autoCode = generatePaperCode(parentPaper.academicYear, parentPaper.classId, parentPaper.subjectName);

    const duplicated: QuestionPaper = {
      ...parentPaper,
      id: newId,
      paperCode: autoCode,
      status: 'Draft',
      teacherId: user.id,
      teacherName: user.name,
      createdAt: new Date().toISOString(),
      questions: parentPaper.questions.map((q, idx) => ({
        ...q,
        id: `q_dup_${idx}_${Date.now()}`
      }))
    };

    const updated = LocalERPDatabase.saveQuestionPaper(duplicated);
    setPapers(updated);
    logAction('Duplicate Question Paper', `Duplicated paper ${parentPaper.paperCode} to create draft ${autoCode}`);
    showAlert('success', `Duplicated successfully. New draft created: ${autoCode}`);
  };

  const handleCopyPreviousYearPaper = (parentPaper: QuestionPaper) => {
    const parts = parentPaper.academicYear.split('-');
    let nextYear = activeAcademicYear;
    if (parts.length === 2) {
      const start = parseInt(parts[0]);
      const end = parseInt(parts[1]);
      nextYear = `${start + 1}-${end + 1}`;
    }

    const newId = 'qp_py_' + Date.now();
    const autoCode = generatePaperCode(nextYear, parentPaper.classId, parentPaper.subjectName);

    const copied: QuestionPaper = {
      ...parentPaper,
      id: newId,
      academicYear: nextYear,
      paperCode: autoCode,
      status: 'Draft',
      teacherId: user.id,
      teacherName: user.name,
      createdAt: new Date().toISOString()
    };

    const updated = LocalERPDatabase.saveQuestionPaper(copied);
    setPapers(updated);
    logAction('Copy Previous Year Paper', `Copied ${parentPaper.paperCode} from ${parentPaper.academicYear} to ${nextYear}`);
    showAlert('success', `Copied from previous year successfully into draft ${autoCode} for ${nextYear}.`);
  };

  const handleWorkflowTransition = (paper: QuestionPaper, newStatus: 'Draft' | 'Approved' | 'Final' | 'Submitted') => {
    const updatedPaper = {
      ...paper,
      status: newStatus === 'Submitted' ? 'Draft' : newStatus, // Store in DB as 'Draft', 'Approved', or 'Final'
      // Note: We can model Submitted as Draft but maybe add a label, or simply transition to Approved/Final
    };

    // Let's support transitioning to 'Approved' (by headmaster) or 'Final' (by headmaster/teacher lock)
    const originalStatus = paper.status;
    let finalStatusToSave: 'Draft' | 'Approved' | 'Final' = 'Draft';

    if (newStatus === 'Approved') {
      if (!isHeadmaster) {
        showAlert('error', 'Only the Headmaster can approve question papers.');
        return;
      }
      finalStatusToSave = 'Approved';
    } else if (newStatus === 'Final') {
      if (!isHeadmaster && paper.teacherId !== user.id) {
        showAlert('error', 'Unauthorized action.');
        return;
      }
      finalStatusToSave = 'Final';
    } else if (newStatus === 'Draft') {
      finalStatusToSave = 'Draft';
    }

    const paperToSave: QuestionPaper = {
      ...paper,
      status: finalStatusToSave
    };

    const updated = LocalERPDatabase.saveQuestionPaper(paperToSave);
    setPapers(updated);
    logAction('Workflow Transition', `Question Paper ${paper.paperCode} status changed from ${originalStatus} to ${finalStatusToSave}`);
    showAlert('success', `Question Paper ${paper.paperCode} is now ${finalStatusToSave}.`);
  };

  // --- QUESTION BANK PERSISTENCE ---

  const handleSaveBankItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBankItem) return;

    const { id, subjectId, chapter, topic, questionType, difficultyLevel, marks, question, answerKey, tags } = editingBankItem;

    if (!subjectId || !questionType || !question || !marks) {
      showAlert('error', 'Please fill in all required fields.');
      return;
    }

    const selectedSub = subjects.find(s => s.id === subjectId);
    const subjectName = selectedSub ? selectedSub.name : 'Unknown Subject';

    const itemToSave: QuestionBankItem = {
      id: id || 'qb_' + Date.now(),
      subjectId,
      subjectName,
      chapter: chapter || 'General',
      topic: topic || 'General',
      questionType: questionType as QuestionType,
      difficultyLevel: difficultyLevel || 'Medium',
      marks: Number(marks),
      question,
      answerKey: answerKey || '',
      tags: tags || []
    };

    const updated = LocalERPDatabase.saveQuestionBankItem(itemToSave);
    setQuestionBank(updated);
    setIsEditingBankItem(false);
    setEditingBankItem(null);

    logAction(
      id ? 'Update Question Bank' : 'Create Question Bank Item',
      `Saved question in ${subjectName} - Marks: ${marks}`
    );
    showAlert('success', `Question saved in Bank successfully.`);
  };

  const handleDeleteBankItem = async (id: string) => {
    if (await requestActionConfirm({ title: 'Delete Question Bank item?', message: 'Are you sure you want to delete this question from the Question Bank?', confirmLabel: 'Delete Question', tone: 'danger' })) {
      const updated = LocalERPDatabase.deleteQuestionBankItem(id);
      setQuestionBank(updated);
      logAction('Delete Question Bank Item', `Deleted question ID ${id}`);
      showAlert('success', `Question removed from Bank.`);
    }
  };

  // --- QUESTION ARRANGEMENT INSIDE PAPER EDITOR ---

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    if (!editingPaper || !editingPaper.questions) return;
    const list = [...editingPaper.questions];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;

    if (targetIdx < 0 || targetIdx >= list.length) return;

    // Swap
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;

    // Re-index display order
    const updatedList = list.map((q, idx) => ({
      ...q,
      displayOrder: idx + 1
    }));

    setEditingPaper({
      ...editingPaper,
      questions: updatedList
    });
  };

  const handleRemoveQuestionFromPaper = (index: number) => {
    if (!editingPaper || !editingPaper.questions) return;
    const list = editingPaper.questions.filter((_, idx) => idx !== index);
    const updatedList = list.map((q, idx) => ({
      ...q,
      displayOrder: idx + 1
    }));

    setEditingPaper({
      ...editingPaper,
      questions: updatedList
    });
  };

  const handleAddCustomQuestionToPaper = () => {
    if (!editingPaper) return;
    const currentQuestions = editingPaper.questions || [];
    const newQ: QuestionPaperQuestion = {
      id: 'q_cust_' + Date.now() + '_' + currentQuestions.length,
      questionText: 'Write question text here...',
      questionType: 'Short Answer',
      marks: 1,
      displayOrder: currentQuestions.length + 1,
      answerKey: '',
      chapter: '',
      topic: ''
    };

    setEditingPaper({
      ...editingPaper,
      questions: [...currentQuestions, newQ]
    });
  };

  const handleUpdateQuestionInPaper = (index: number, field: keyof QuestionPaperQuestion, value: any) => {
    if (!editingPaper || !editingPaper.questions) return;
    const list = [...editingPaper.questions];
    list[index] = {
      ...list[index],
      [field]: value
    };

    setEditingPaper({
      ...editingPaper,
      questions: list
    });
  };

  // --- IMPORT FROM BANK COMPONENT LOGIC ---
  const handleAddFromBankToPaper = (bankItem: QuestionBankItem) => {
    if (!editingPaper) return;
    const currentQuestions = editingPaper.questions || [];

    // Check if already in paper
    if (currentQuestions.some(q => q.id === bankItem.id || q.questionText === bankItem.question)) {
      showAlert('error', 'This question is already added to the paper.');
      return;
    }

    const newQ: QuestionPaperQuestion = {
      id: 'q_bank_' + bankItem.id,
      questionText: bankItem.question,
      questionType: bankItem.questionType,
      marks: bankItem.marks,
      displayOrder: currentQuestions.length + 1,
      answerKey: bankItem.answerKey,
      chapter: bankItem.chapter,
      topic: bankItem.topic
    };

    setEditingPaper({
      ...editingPaper,
      questions: [...currentQuestions, newQ]
    });
    showAlert('success', 'Question added to paper.');
  };

  // --- FILTERS AND QUERY HANDLING ---

  const filteredPapers = papers.filter(p => {
    // Role filter
    if (isTeacher) {
      // Teachers can only view papers they created OR papers in subjects allocated to them
      const isCreator = p.teacherId === user.id;
      const isAllocated = teacherSubjectNames.includes(p.subjectName);
      if (!isCreator && !isAllocated) return false;
    } else if (isClassTeacher) {
      // Class teachers can view papers of their assigned class division
      // Find class teacher class
      const assignment = LocalERPDatabase.getAcademicSetup().classTeacherAssignments?.find(a => a.teacherId === user.id);
      if (assignment) {
        if (p.classId !== assignment.className) return false;
      }
    }

    // Dropdown filters
    if (filterYear !== 'All' && p.academicYear !== filterYear) return false;
    if (filterExam !== 'All' && p.examId !== filterExam) return false;
    if (filterClass !== 'All' && p.classId !== filterClass) return false;
    if (filterSubject !== 'All' && p.subjectId !== filterSubject) return false;
    if (filterStatus !== 'All' && p.status !== filterStatus) return false;

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        p.paperCode.toLowerCase().includes(query) ||
        p.subjectName.toLowerCase().includes(query) ||
        p.teacherName.toLowerCase().includes(query) ||
        p.classId.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const filteredBankItems = questionBank.filter(item => {
    if (bankFilterSubject !== 'All' && item.subjectId !== bankFilterSubject) return false;
    if (bankFilterType !== 'All' && item.questionType !== bankFilterType) return false;
    if (bankFilterDifficulty !== 'All' && item.difficultyLevel !== bankFilterDifficulty) return false;

    if (bankSearchQuery) {
      const q = bankSearchQuery.toLowerCase();
      return (
        item.question.toLowerCase().includes(q) ||
        (item.chapter && item.chapter.toLowerCase().includes(q)) ||
        (item.topic && item.topic.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // --- REPORT GENERATORS ---

  // Report 1: Subject-wise papers
  const subjectWiseReports = subjects.map(sub => {
    const subPapers = papers.filter(p => p.subjectId === sub.id);
    return {
      subjectName: sub.name,
      total: subPapers.length,
      drafts: subPapers.filter(p => p.status === 'Draft').length,
      approved: subPapers.filter(p => p.status === 'Approved').length,
      final: subPapers.filter(p => p.status === 'Final').length
    };
  });

  // Report 2: Teacher-wise papers
  const uniqueTeachers = Array.from(new Set(papers.map(p => p.teacherId))).map(tid => {
    const p = papers.find(paper => paper.teacherId === tid);
    return { id: tid, name: p ? p.teacherName : 'Unknown Teacher' };
  });

  const teacherWiseReports = uniqueTeachers.map(t => {
    const teachPapers = papers.filter(p => p.teacherId === t.id);
    return {
      teacherName: t.name,
      total: teachPapers.length,
      drafts: teachPapers.filter(p => p.status === 'Draft').length,
      approved: teachPapers.filter(p => p.status === 'Approved').length,
      final: teachPapers.filter(p => p.status === 'Final').length
    };
  });

  // Report 3: Approval Report (Status counters)
  const approvalStats = {
    drafts: papers.filter(p => p.status === 'Draft').length,
    approved: papers.filter(p => p.status === 'Approved').length,
    final: papers.filter(p => p.status === 'Final').length,
    total: papers.length
  };

  const executeSystemPrint = () => {
    printSectionById('printable-question-paper', 'Official Question Paper');
  };

  return (
    <div className="space-y-6">
      {/* Alert Notification */}
      {alertMsg && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 p-4 rounded-xl shadow-lg border animate-bounce ${
          alertMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {alertMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span className="text-xs font-bold font-sans">{alertMsg.text}</span>
        </div>
      )}

      {/* Main Title & Action Bar (Hidden during Print) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5 no-print">
        <div>
          <h2 className="text-xl font-sans font-extrabold text-slate-900 flex items-center gap-2 tracking-tight">
            <FileText className="w-6 h-6 text-blue-600" />
            <span>{isUrdu ? 'امتحانی پرچہ جات کا انتظام' : 'Question Paper Management System'}</span>
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            {isUrdu 
              ? 'امتحانی سوالات کے ذخیرے اور سوالیہ پرچوں کو مرتب کرنے کا خودکار نظام۔' 
              : 'Prepare, manage, store and print question papers with automated marks calculations and approval tracks.'}
          </p>
        </div>

        {canCreatePapers && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                // Initialize default question paper
                setPaperLanguageProfile(createDocumentLanguageProfile('question-paper', [...QUESTION_PAPER_LANGUAGE_SECTIONS], 'en'));
                setEditingPaper({
                  academicYear: activeAcademicYear,
                  term: 'Semester 1',
                  examType: 'Written',
                  classId: classes[0]?.className || 'Class 9',
                  division: 'All',
                  subjectId: subjects[0]?.id || 'sub3',
                  maxMarks: 50,
                  passingMarks: 18,
                  durationMinutes: 120,
                  instructions: '1. All questions are compulsory.\n2. Figures to the right indicate full marks.',
                  status: 'Draft',
                  questions: [],
                });
                setIsEditingPaper(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{isUrdu ? 'نیا سوالیہ پرچہ بنائیں' : 'Create Question Paper'}</span>
            </button>

            <button
              onClick={() => {
                setEditingBankItem({
                  difficultyLevel: 'Medium',
                  marks: 2,
                  questionType: 'Short Answer',
                  subjectId: subjects[0]?.id || 'sub3',
                  chapter: 'Chapter 1',
                  topic: 'General',
                  question: '',
                  answerKey: '',
                  tags: []
                });
                setIsEditingBankItem(true);
              }}
              className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{isUrdu ? 'بینک میں سوال شامل کریں' : 'Add to Question Bank'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Security Info Banner */}
      {isTeacher && (
        <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl flex items-start gap-3 text-left no-print">
          <Shield className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-extrabold text-blue-900">Teacher Workspace Boundaries Active</h4>
            <p className="text-[11px] text-blue-700 mt-1">
              You can only create and edit papers for your allocated subjects: <strong className="text-blue-900">{teacherSubjectNames.join(', ') || 'None Assigned'}</strong>.
              Editing is strictly locked once a paper is submitted for approval or finalized.
            </p>
          </div>
        </div>
      )}

      {/* Module Navigation Subtabs */}
      <div className="flex border-b border-slate-100 pb-1 scrollbar-thin no-print">
        <button
          onClick={() => setActiveSubTab('papers')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'papers'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Question Papers</span>
          <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full text-[10px]">{filteredPapers.length}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('bank')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'bank'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Reusable Question Bank</span>
          <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full text-[10px]">{questionBank.length}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('reports')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'reports'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Analytics & Registers</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* SECTION 1: QUESTION PAPERS LIST & FILTERS */}
      {/* ========================================================= */}
      {activeSubTab === 'papers' && !isEditingPaper && !previewPaper && (
        <div className="space-y-4 animate-fade-in text-left no-print">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase text-slate-400">Academic Year</label>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-slate-50/50 text-slate-700 font-semibold focus:outline-none"
              >
                <option value="All">All Years</option>
                {configuredAcademicYears.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase text-slate-400">Examination</label>
              <select
                value={filterExam}
                onChange={(e) => setFilterExam(e.target.value)}
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-slate-50/50 text-slate-700 font-semibold focus:outline-none"
              >
                <option value="All">All Exams</option>
                {examinations.map(ex => (
                  <option key={ex.id} value={ex.id}>{ex.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase text-slate-400">Class</label>
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-slate-50/50 text-slate-700 font-semibold focus:outline-none"
              >
                <option value="All">All Classes</option>
                {classes.map(c => (
                  <option key={c.id} value={c.className}>{c.className}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase text-slate-400">Subject</label>
              <select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-slate-50/50 text-slate-700 font-semibold focus:outline-none"
              >
                <option value="All">All Subjects</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase text-slate-400">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-slate-50/50 text-slate-700 font-semibold focus:outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="Draft">Draft</option>
                <option value="Approved">Approved</option>
                <option value="Final">Final</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase text-slate-400">Search Paper</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Code, Subject, Teacher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border border-slate-200 rounded-lg pl-8 pr-2.5 py-1.5 text-xs bg-slate-50/50 text-slate-700 font-semibold w-full focus:outline-none"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>
          </div>

          {/* Papers Grid */}
          {filteredPapers.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-2xl border border-slate-200/50">
              <FileCode className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-bold">No question papers found matching search specifications.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPapers.map(paper => {
                const totalQuestionsMarks = paper.questions.reduce((sum, q) => sum + Number(q.marks), 0);
                const isApproved = paper.status === 'Approved' || paper.status === 'Final';

                return (
                  <div key={paper.id} className="bg-white rounded-2xl border border-slate-150 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                      {/* Top badging */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="font-mono text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                          {paper.paperCode}
                        </span>

                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          paper.status === 'Approved' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : paper.status === 'Final'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {paper.status}
                        </span>
                      </div>

                      {/* Header details */}
                      <h3 className="font-extrabold text-slate-900 text-sm tracking-tight line-clamp-1">{paper.subjectName}</h3>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        {paper.classId} (Div: {paper.division && paper.division !== 'All' ? paper.division : 'No Division'}) • {paper.examName}
                      </p>

                      <div className="grid grid-cols-2 gap-3 mt-4 p-3 bg-slate-50/50 rounded-xl text-[11px] text-slate-600">
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-bold">Marks Criteria</span>
                          <span className="font-bold text-slate-800">
                            {totalQuestionsMarks}/{paper.maxMarks} <span className="text-slate-400 font-normal">(Pass: {paper.passingMarks})</span>
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-bold">Duration</span>
                          <span className="font-bold text-slate-800">{paper.durationMinutes} minutes</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-400 block text-[9px] uppercase font-bold">Prepared By</span>
                          <span className="font-semibold text-slate-700">{paper.teacherName}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Section */}
                    <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex gap-1">
                        {canEditPaper(paper) ? (
                          <button
                            onClick={() => {
                              setPaperLanguageProfile(normalizeDocumentLanguageProfile((paper as any).documentLanguageProfile, 'question-paper', [...QUESTION_PAPER_LANGUAGE_SECTIONS], 'en'));
                              setEditingPaper({ ...paper });
                              setIsEditingPaper(true);
                            }}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-all"
                            title="Edit Draft"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setPaperLanguageProfile(normalizeDocumentLanguageProfile((paper as any).documentLanguageProfile, 'question-paper', [...QUESTION_PAPER_LANGUAGE_SECTIONS], 'en'));
                              setPreviewPaper({ ...paper });
                            }}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-all"
                            title="View / Print Preview"
                          >
                            <Eye className="w-4 h-4 text-blue-600" />
                          </button>
                        )}

                        <button
                          onClick={() => handleDuplicatePaper(paper)}
                          className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-all"
                          title="Duplicate/Clone Draft"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleCopyPreviousYearPaper(paper)}
                          className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-all text-indigo-600"
                          title="Copy to Next Academic Year"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>

                        {canEditPaper(paper) && (
                          <button type="button"
                            onClick={() => handleDeletePaper(paper.id, paper.paperCode)}
                            className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-all"
                            title="Delete Draft"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Approval workflows for Headmaster */}
                      {isHeadmaster && paper.status === 'Draft' && (
                        <button
                          onClick={() => handleWorkflowTransition(paper, 'Approved')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1"
                        >
                          <FileCheck className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                      )}

                      {isHeadmaster && paper.status === 'Approved' && (
                        <button
                          onClick={() => handleWorkflowTransition(paper, 'Final')}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Finalize / Lock</span>
                        </button>
                      )}

                      {/* Printable check */}
                      {isApproved && (
                        <button
                          onClick={() => {
                            setPaperLanguageProfile(normalizeDocumentLanguageProfile((paper as any).documentLanguageProfile, 'question-paper', [...QUESTION_PAPER_LANGUAGE_SECTIONS], 'en'));
                            setPreviewPaper({ ...paper });
                          }}
                          className="bg-slate-800 hover:bg-slate-900 text-white px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 2: CREATE / EDIT QUESTION PAPER FORM */}
      {/* ========================================================= */}
      {isEditingPaper && editingPaper && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in text-left no-print">
          <div className="border-b border-slate-150 bg-slate-50/50 px-6 py-4 flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-sm font-sans flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>{editingPaper.id ? 'Edit Question Paper Draft' : 'Create New Question Paper Master'}</span>
            </h3>
            <button
              onClick={() => {
                setIsEditingPaper(false);
                setEditingPaper(null);
              }}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSavePaper} className="p-6 space-y-6">
            {/* Meta Configuration fields */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Academic Year *</label>
                <select
                  value={editingPaper.academicYear || activeAcademicYear}
                  onChange={(e) => setEditingPaper({ ...editingPaper, academicYear: e.target.value })}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-xs bg-slate-50 focus:outline-none font-semibold text-slate-800"
                  required
                >
                  {configuredAcademicYears.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Select Examination *</label>
                <select
                  value={editingPaper.examId || ''}
                  onChange={(e) => setEditingPaper({ ...editingPaper, examId: e.target.value })}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-xs bg-slate-50 focus:outline-none font-semibold text-slate-800"
                  required
                >
                  <option value="">-- Choose Exam --</option>
                  {examinations.map(ex => (
                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Term / Semester *</label>
                <select
                  value={editingPaper.term || 'Semester 1'}
                  onChange={(e) => setEditingPaper({ ...editingPaper, term: e.target.value })}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-xs bg-slate-50 focus:outline-none font-semibold text-slate-800"
                  required
                >
                  <option value="Term 1">Term 1</option>
                  <option value="Term 2">Term 2</option>
                  <option value="Semester 1">Semester 1</option>
                  <option value="Semester 2">Semester 2</option>
                  <option value="Annual">Annual</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Exam Type *</label>
                <select
                  value={editingPaper.examType || 'Written'}
                  onChange={(e) => setEditingPaper({ ...editingPaper, examType: e.target.value })}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-xs bg-slate-50 focus:outline-none font-semibold text-slate-800"
                  required
                >
                  <option value="Written">Written</option>
                  <option value="Practical">Practical</option>
                  <option value="Oral">Oral</option>
                  <option value="Assignment">Assignment</option>
                  <option value="Project">Project</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Class *</label>
                <select
                  value={editingPaper.classId || ''}
                  onChange={(e) => setEditingPaper({ ...editingPaper, classId: e.target.value })}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-xs bg-slate-50 focus:outline-none font-semibold text-slate-800"
                  required
                >
                  <option value="">-- Select Class --</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.className}>{c.className}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Division (Optional)</label>
                <select
                  value={editingPaper.division || 'All'}
                  onChange={(e) => setEditingPaper({ ...editingPaper, division: e.target.value })}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-xs bg-slate-50 focus:outline-none font-semibold text-slate-800"
                >
                  <option value="All">All Divisions</option>
                  <option value="A">Division A</option>
                  <option value="B">Division B</option>
                  <option value="C">Division C</option>
                  <option value="Urdu Medium">Urdu Medium</option>
                  <option value="Science">Science</option>
                  <option value="Commerce">Commerce</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Subject *</label>
                <select
                  value={editingPaper.subjectId || ''}
                  onChange={(e) => setEditingPaper({ ...editingPaper, subjectId: e.target.value })}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-xs bg-slate-50 focus:outline-none font-semibold text-slate-800"
                  required
                >
                  <option value="">-- Select Subject --</option>
                  {subjects.map(s => {
                    // If teacher role, visually highlight or filter their assigned subjects
                    const isAllocated = teacherSubjectNames.includes(s.name);
                    return (
                      <option key={s.id} value={s.id}>
                        {s.name} {isTeacher && isAllocated ? '★' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Paper Code (Auto-generated)</label>
                <input
                  type="text"
                  value={editingPaper.paperCode || '(Will auto-generate on save)'}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-xs bg-slate-100 text-slate-500 font-mono focus:outline-none"
                  readOnly
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Maximum Marks *</label>
                <input
                  type="number"
                  value={editingPaper.maxMarks || ''}
                  onChange={(e) => setEditingPaper({ ...editingPaper, maxMarks: Number(e.target.value) })}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-xs bg-slate-50 focus:outline-none font-semibold text-slate-800"
                  placeholder="e.g. 50"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Passing Marks *</label>
                <input
                  type="number"
                  value={editingPaper.passingMarks || ''}
                  onChange={(e) => setEditingPaper({ ...editingPaper, passingMarks: Number(e.target.value) })}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-xs bg-slate-50 focus:outline-none font-semibold text-slate-800"
                  placeholder="e.g. 18"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Duration (Minutes) *</label>
                <input
                  type="number"
                  value={editingPaper.durationMinutes || ''}
                  onChange={(e) => setEditingPaper({ ...editingPaper, durationMinutes: Number(e.target.value) })}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-xs bg-slate-50 focus:outline-none font-semibold text-slate-800"
                  placeholder="e.g. 120"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5 col-span-1">
                <label className="text-xs font-bold text-slate-700">Draft Status</label>
                <select
                  value={editingPaper.status || 'Draft'}
                  onChange={(e) => setEditingPaper({ ...editingPaper, status: e.target.value as any })}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-xs bg-slate-50 focus:outline-none font-semibold text-slate-800"
                >
                  <option value="Draft">Draft</option>
                  {isHeadmaster && <option value="Approved">Approved</option>}
                  {isHeadmaster && <option value="Final">Final</option>}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">Special Instructions to Candidates</label>
              <textarea
                rows={2}
                value={editingPaper.instructions || ''}
                onChange={(e) => setEditingPaper({ ...editingPaper, instructions: e.target.value })}
                placeholder="Enter instructions, one per line..."
                className="border border-slate-200 rounded-lg px-3 py-2 text-xs bg-slate-50 focus:outline-none font-semibold text-slate-800"
                dir={documentLanguageDirection(primaryDocumentLanguage(sectionSelection(paperLanguageProfile, 'instructions')))}
                style={{fontFamily:documentLanguageFont(primaryDocumentLanguage(sectionSelection(paperLanguageProfile, 'instructions')))}}
              />
            </div>

            <DocumentLanguageStudio profile={paperLanguageProfile} onChange={setPaperLanguageProfile} sections={[...QUESTION_PAPER_LANGUAGE_SECTIONS]} title="Question Paper Language Studio" description="Keep exam metadata in English while writing instructions or questions in Urdu, Marathi, Hindi or any other enabled Indian language. The setting is saved with this paper." compact />

            {/* Questions Layout Section */}
            <div className="border-t border-slate-100 pt-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">Questions Arrangement & Layout</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Total Question Marks allocated so far: <strong className="text-blue-600 font-extrabold">{(editingPaper.questions || []).reduce((sum, q) => sum + Number(q.marks), 0)}</strong> / Maximum Marks: <strong className="text-slate-800">{editingPaper.maxMarks || 0}</strong>
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsImportingQuestions(true);
                    }}
                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                  >
                    <BookOpenCheck className="w-3.5 h-3.5" />
                    <span>Import from Question Bank</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAddCustomQuestionToPaper}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Custom Question</span>
                  </button>
                </div>
              </div>

              {/* Questions List inside Paper Editor */}
              {(editingPaper.questions || []).length === 0 ? (
                <div className="p-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Sparkles className="w-8 h-8 text-indigo-500 mx-auto mb-2 animate-pulse" />
                  <p className="text-xs text-slate-500 font-bold">No questions added to this paper draft yet.</p>
                  <p className="text-[10px] text-slate-400 mt-1">Import some from the Question Bank or write custom ones above.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(editingPaper.questions || []).map((q, idx) => (
                    <div key={q.id} className="bg-slate-50/50 rounded-xl p-4 border border-slate-150 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                      <div className="flex items-start gap-2.5 w-full md:w-3/4">
                        <span className="bg-slate-200 text-slate-700 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0">
                          {idx + 1}
                        </span>

                        <div className="space-y-2 w-full">
                          <input
                            type="text"
                            value={q.questionText}
                            onChange={(e) => handleUpdateQuestionInPaper(idx, 'questionText', e.target.value)}
                            className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white text-slate-800 font-semibold w-full focus:outline-none"
                            placeholder="Question Text"
                          />

                          <div className="flex flex-wrap gap-2">
                            <select
                              value={q.questionType}
                              onChange={(e) => handleUpdateQuestionInPaper(idx, 'questionType', e.target.value)}
                              className="border border-slate-200 rounded-md px-2 py-1 text-[10px] bg-white text-slate-700 font-bold"
                            >
                              <option value="MCQ">MCQ</option>
                              <option value="Fill in the Blanks">Fill in the Blanks</option>
                              <option value="True / False">True / False</option>
                              <option value="One Word Answer">One Word Answer</option>
                              <option value="Short Answer">Short Answer</option>
                              <option value="Long Answer">Long Answer</option>
                              <option value="Match the Following">Match the Following</option>
                              <option value="Practical Question">Practical Question</option>
                              <option value="Diagram Based">Diagram Based</option>
                              <option value="Essay">Essay</option>
                              <option value="Custom Question Type">Custom Question Type</option>
                            </select>

                            <input
                              type="text"
                              placeholder="Answer Key (Optional)"
                              value={q.answerKey || ''}
                              onChange={(e) => handleUpdateQuestionInPaper(idx, 'answerKey', e.target.value)}
                              className="border border-slate-200 rounded-md px-2.5 py-1 text-[10px] bg-white text-slate-700 font-semibold"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Marks and Arrangement Controls */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-extrabold text-slate-400">MARKS</span>
                          <input
                            type="number"
                            min="1"
                            value={q.marks}
                            onChange={(e) => handleUpdateQuestionInPaper(idx, 'marks', Number(e.target.value))}
                            className="w-12 border border-slate-200 rounded-md p-1 text-xs text-center font-bold text-slate-800"
                          />
                        </div>

                        <div className="flex items-center gap-1 bg-white border border-slate-150 rounded-lg p-0.5">
                          <button
                            type="button"
                            onClick={() => handleMoveQuestion(idx, 'up')}
                            disabled={idx === 0}
                            className={`p-1 rounded text-slate-500 hover:bg-slate-100 ${idx === 0 ? 'opacity-30' : ''}`}
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveQuestion(idx, 'down')}
                            disabled={idx === (editingPaper.questions || []).length - 1}
                            className={`p-1 rounded text-slate-500 hover:bg-slate-100 ${idx === (editingPaper.questions || []).length - 1 ? 'opacity-30' : ''}`}
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveQuestionFromPaper(idx)}
                          className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="border-t border-slate-100 pt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsEditingPaper(false);
                  setEditingPaper(null);
                }}
                className="border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 transition-all"
              >
                Cancel Draft
              </button>

              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1"
              >
                <Check className="w-4 h-4" />
                <span>Save Paper Master</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 3: REUSABLE QUESTION BANK TAB */}
      {/* ========================================================= */}
      {activeSubTab === 'bank' && !isEditingBankItem && (
        <div className="space-y-4 animate-fade-in text-left no-print">
          {/* Question Bank Filter Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase text-slate-400">Subject</label>
              <select
                value={bankFilterSubject}
                onChange={(e) => setBankFilterSubject(e.target.value)}
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-slate-50/50 text-slate-700 font-semibold focus:outline-none"
              >
                <option value="All">All Subjects</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase text-slate-400">Question Type</label>
              <select
                value={bankFilterType}
                onChange={(e) => setBankFilterType(e.target.value)}
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-slate-50/50 text-slate-700 font-semibold focus:outline-none"
              >
                <option value="All">All Types</option>
                <option value="MCQ">MCQ</option>
                <option value="Fill in the Blanks">Fill in the Blanks</option>
                <option value="True / False">True / False</option>
                <option value="One Word Answer">One Word Answer</option>
                <option value="Short Answer">Short Answer</option>
                <option value="Long Answer">Long Answer</option>
                <option value="Match the Following">Match the Following</option>
                <option value="Practical Question">Practical Question</option>
                <option value="Diagram Based">Diagram Based</option>
                <option value="Essay">Essay</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase text-slate-400">Difficulty Level</label>
              <select
                value={bankFilterDifficulty}
                onChange={(e) => setBankFilterDifficulty(e.target.value)}
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-slate-50/50 text-slate-700 font-semibold focus:outline-none"
              >
                <option value="All">All Difficulties</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase text-slate-400">Search Content</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Chapter, Topic, keywords..."
                  value={bankSearchQuery}
                  onChange={(e) => setBankSearchQuery(e.target.value)}
                  className="border border-slate-200 rounded-lg pl-8 pr-2.5 py-1.5 text-xs bg-slate-50/50 text-slate-700 font-semibold w-full focus:outline-none"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>
          </div>

          {/* Question Bank List */}
          <div className="bg-white rounded-2xl border border-slate-150 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold text-[10px] uppercase font-mono">
                    <th className="px-5 py-3">Subject & Tags</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Difficulty</th>
                    <th className="px-5 py-3">Marks</th>
                    <th className="px-5 py-3">Question</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 text-xs">
                  {filteredBankItems.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="px-5 py-4 shrink-0">
                        <span className="font-bold text-slate-800 block">{item.subjectName}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{item.chapter} • {item.topic}</span>
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {item.tags.map((t, idx) => (
                              <span key={idx} className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[9px] font-semibold">#{t}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-600">{item.questionType}</td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          item.difficultyLevel === 'Easy' 
                            ? 'bg-green-50 text-green-700' 
                            : item.difficultyLevel === 'Hard'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {item.difficultyLevel}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-extrabold text-slate-900 font-mono">{item.marks}</td>
                      <td className="px-5 py-4 max-w-sm">
                        <p className="font-semibold text-slate-800 line-clamp-2">{item.question}</p>
                        {item.answerKey && (
                          <p className="text-[10px] text-emerald-600 font-medium mt-1">Ans: {item.answerKey}</p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex gap-1 justify-end">
                          {canCreatePapers && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingBankItem({ ...item });
                                  setIsEditingBankItem(true);
                                }}
                                className="p-1 hover:bg-slate-100 text-slate-500 rounded-lg"
                                title="Edit Question"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button type="button"
                                onClick={() => handleDeleteBankItem(item.id)}
                                className="p-1 hover:bg-rose-50 text-rose-600 rounded-lg"
                                title="Remove Question"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 4: EDIT/CREATE QUESTION BANK ITEM MODAL */}
      {/* ========================================================= */}
      {isEditingBankItem && editingBankItem && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in text-left no-print">
          <div className="border-b border-slate-150 bg-slate-50/50 px-6 py-4 flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-sm font-sans flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>{editingBankItem.id ? 'Modify Question Bank Element' : 'Add Question into Reusable Bank'}</span>
            </h3>
            <button
              onClick={() => {
                setIsEditingBankItem(false);
                setEditingBankItem(null);
              }}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSaveBankItem} className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-700">Subject Name *</label>
                <select
                  value={editingBankItem.subjectId || ''}
                  onChange={(e) => setEditingBankItem({ ...editingBankItem, subjectId: e.target.value })}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-xs bg-slate-50 focus:outline-none font-semibold text-slate-800"
                  required
                >
                  <option value="">-- Choose Subject --</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-700">Chapter Title / Chapter Number</label>
                <input
                  type="text"
                  value={editingBankItem.chapter || ''}
                  onChange={(e) => setEditingBankItem({ ...editingBankItem, chapter: e.target.value })}
                  placeholder="e.g. Chapter 1: Laws of Motion"
                  className="border border-slate-200 rounded-lg px-3 py-2 text-xs bg-slate-50 focus:outline-none font-semibold text-slate-800"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-700">Topic Title</label>
                <input
                  type="text"
                  value={editingBankItem.topic || ''}
                  onChange={(e) => setEditingBankItem({ ...editingBankItem, topic: e.target.value })}
                  placeholder="e.g. Rationalization"
                  className="border border-slate-200 rounded-lg px-3 py-2 text-xs bg-slate-50 focus:outline-none font-semibold text-slate-800"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-700">Question Type *</label>
                <select
                  value={editingBankItem.questionType || 'Short Answer'}
                  onChange={(e) => setEditingBankItem({ ...editingBankItem, questionType: e.target.value as any })}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-xs bg-slate-50 focus:outline-none font-semibold text-slate-800"
                  required
                >
                  <option value="MCQ">MCQ</option>
                  <option value="Fill in the Blanks">Fill in the Blanks</option>
                  <option value="True / False">True / False</option>
                  <option value="One Word Answer">One Word Answer</option>
                  <option value="Short Answer">Short Answer</option>
                  <option value="Long Answer">Long Answer</option>
                  <option value="Match the Following">Match the Following</option>
                  <option value="Practical Question">Practical Question</option>
                  <option value="Diagram Based">Diagram Based</option>
                  <option value="Essay">Essay</option>
                  <option value="Custom Question Type">Custom Question Type</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-700">Difficulty Level *</label>
                <select
                  value={editingBankItem.difficultyLevel || 'Medium'}
                  onChange={(e) => setEditingBankItem({ ...editingBankItem, difficultyLevel: e.target.value as any })}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-xs bg-slate-50 focus:outline-none font-semibold text-slate-800"
                  required
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-700">Marks Allocated *</label>
                <input
                  type="number"
                  min="1"
                  value={editingBankItem.marks || ''}
                  onChange={(e) => setEditingBankItem({ ...editingBankItem, marks: Number(e.target.value) })}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-xs bg-slate-50 focus:outline-none font-semibold text-slate-800"
                  placeholder="e.g. 5"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700">Question Content *</label>
              <textarea
                rows={3}
                value={editingBankItem.question || ''}
                onChange={(e) => setEditingBankItem({ ...editingBankItem, question: e.target.value })}
                placeholder="Type the full question here..."
                className="border border-slate-200 rounded-lg px-3 py-2 text-xs bg-slate-50 focus:outline-none font-semibold text-slate-800"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700">Answer Key / Hints / References (Optional)</label>
              <input
                type="text"
                value={editingBankItem.answerKey || ''}
                onChange={(e) => setEditingBankItem({ ...editingBankItem, answerKey: e.target.value })}
                placeholder="Enter answer or hints to help teachers"
                className="border border-slate-200 rounded-lg px-3 py-2 text-xs bg-slate-50 focus:outline-none font-semibold text-slate-800"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700">Tags (Comma-separated list)</label>
              <input
                type="text"
                value={(editingBankItem.tags || []).join(', ')}
                onChange={(e) => {
                  const arr = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                  setEditingBankItem({ ...editingBankItem, tags: arr });
                }}
                placeholder="e.g. Algebra, Factorization, Important"
                className="border border-slate-200 rounded-lg px-3 py-2 text-xs bg-slate-50 focus:outline-none font-semibold text-slate-800"
              />
            </div>

            <div className="border-t border-slate-100 pt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsEditingBankItem(false);
                  setEditingBankItem(null);
                }}
                className="border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 transition-all"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1"
              >
                <Check className="w-4 h-4" />
                <span>Save Question to Bank</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 5: MODAL: IMPORT FROM QUESTION BANK */}
      {/* ========================================================= */}
      {isImportingQuestions && editingPaper && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full overflow-hidden text-left flex flex-col max-h-[85vh]">
            <div className="border-b border-slate-150 bg-slate-50 px-6 py-4 flex items-center justify-between shrink-0">
              <h3 className="font-extrabold text-slate-900 text-sm font-sans flex items-center gap-2">
                <BookOpenCheck className="w-5 h-5 text-indigo-600" />
                <span>Import reusable questions into {editingPaper.subjectName || 'Subject'}</span>
              </h3>
              <button
                onClick={() => setIsImportingQuestions(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick mini filter inside modal */}
            <div className="p-4 bg-slate-50 border-b border-slate-150 grid grid-cols-1 md:grid-cols-3 gap-3 shrink-0">
              <select
                value={bankFilterType}
                onChange={(e) => setBankFilterType(e.target.value)}
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-700 font-semibold focus:outline-none"
              >
                <option value="All">All Types</option>
                <option value="MCQ">MCQ</option>
                <option value="Fill in the Blanks">Fill in the Blanks</option>
                <option value="True / False">True / False</option>
                <option value="One Word Answer">One Word Answer</option>
                <option value="Short Answer">Short Answer</option>
                <option value="Long Answer">Long Answer</option>
                <option value="Match the Following">Match the Following</option>
                <option value="Practical Question">Practical Question</option>
                <option value="Diagram Based">Diagram Based</option>
                <option value="Essay">Essay</option>
              </select>

              <select
                value={bankFilterDifficulty}
                onChange={(e) => setBankFilterDifficulty(e.target.value)}
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-700 font-semibold focus:outline-none"
              >
                <option value="All">All Difficulties</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>

              <input
                type="text"
                placeholder="Search question keyword..."
                value={bankSearchQuery}
                onChange={(e) => setBankSearchQuery(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white text-slate-700 font-semibold focus:outline-none"
              />
            </div>

            {/* Questions to add */}
            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              {questionBank
                .filter(q => q.subjectId === editingPaper.subjectId) // Auto lock to current paper's subject
                .filter(q => {
                  if (bankFilterType !== 'All' && q.questionType !== bankFilterType) return false;
                  if (bankFilterDifficulty !== 'All' && q.difficultyLevel !== bankFilterDifficulty) return false;
                  if (bankSearchQuery) {
                    return q.question.toLowerCase().includes(bankSearchQuery.toLowerCase());
                  }
                  return true;
                })
                .map(item => {
                  const alreadyAdded = (editingPaper.questions || []).some(qpq => qpq.id === 'q_bank_' + item.id);
                  return (
                    <div key={item.id} className="p-4 bg-slate-50 rounded-xl border border-slate-150 flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-mono">
                            {item.questionType}
                          </span>
                          <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded font-mono ${
                            item.difficultyLevel === 'Easy' ? 'bg-green-50 text-green-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {item.difficultyLevel}
                          </span>
                          <span className="text-xs text-slate-500 font-bold">{item.chapter}</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-800 mt-2">{item.question}</p>
                        <p className="text-[10px] font-extrabold text-slate-400 mt-1 uppercase">MARKS: {item.marks}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddFromBankToPaper(item)}
                        disabled={alreadyAdded}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                          alreadyAdded 
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                      >
                        {alreadyAdded ? 'Added' : 'Add to Paper'}
                      </button>
                    </div>
                  );
                })}

              {questionBank.filter(q => q.subjectId === editingPaper.subjectId).length === 0 && (
                <div className="p-8 text-center bg-slate-50 rounded-xl border">
                  <p className="text-xs text-slate-500 font-bold">No questions found in Bank for subject: {editingPaper.subjectName}.</p>
                  <p className="text-[10px] text-slate-400 mt-1">Please insert some questions in the Reusable Bank first.</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-150 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsImportingQuestions(false)}
                className="bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold"
              >
                Done / Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 6: ANALYTICS & REGISTERS (REPORTS) */}
      {/* ========================================================= */}
      {activeSubTab === 'reports' && (
        <div className="space-y-6 animate-fade-in text-left no-print">
          {/* Top summary blocks */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm">
              <span className="text-[10px] uppercase font-mono font-extrabold text-slate-400 block">Total Papers Masters</span>
              <span className="text-2xl font-bold font-sans text-slate-900 mt-1 block">{approvalStats.total}</span>
            </div>
            <div className="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm">
              <span className="text-[10px] uppercase font-mono font-extrabold text-amber-500 block">Draft Status</span>
              <span className="text-2xl font-bold font-sans text-amber-600 mt-1 block">{approvalStats.drafts}</span>
            </div>
            <div className="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm">
              <span className="text-[10px] uppercase font-mono font-extrabold text-emerald-500 block">Approved Papers</span>
              <span className="text-2xl font-bold font-sans text-emerald-600 mt-1 block">{approvalStats.approved}</span>
            </div>
            <div className="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm">
              <span className="text-[10px] uppercase font-mono font-extrabold text-indigo-500 block">Final / Locked</span>
              <span className="text-2xl font-bold font-sans text-indigo-600 mt-1 block">{approvalStats.final}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Subject-wise report cards */}
            <div className="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm">
              <h3 className="font-extrabold text-sm text-slate-900 font-sans border-b border-slate-100 pb-3 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>Subject-wise Question Papers</span>
              </h3>
              <div className="divide-y divide-slate-100 mt-3 max-h-[300px] overflow-y-auto pr-1">
                {subjectWiseReports.map((r, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">{r.subjectName}</span>
                    <div className="flex gap-2">
                      <span className="bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded font-mono text-[10px]" title="Total Papers">{r.total} total</span>
                      <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded font-mono text-[10px]" title="Approved">{r.approved} app</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Teacher-wise reports */}
            <div className="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm">
              <h3 className="font-extrabold text-sm text-slate-900 font-sans border-b border-slate-100 pb-3 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-indigo-600" />
                <span>Teacher Question Paper Generation Stats</span>
              </h3>
              <div className="divide-y divide-slate-100 mt-3 max-h-[300px] overflow-y-auto pr-1">
                {teacherWiseReports.map((r, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">{r.teacherName}</span>
                    <div className="flex gap-2">
                      <span className="bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded font-mono text-[10px]">{r.total} drafted</span>
                      <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded font-mono text-[10px]">{r.final} locked</span>
                    </div>
                  </div>
                ))}

                {teacherWiseReports.length === 0 && (
                  <p className="text-xs text-slate-400 py-6 text-center">No reports compiled yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 7: HIGH-FIDELITY PRINT PREVIEW / PDF STAGE */}
      {/* ========================================================= */}
      {previewPaper && (
        <div className="space-y-6">
          {/* Interactive Print Spec Toolbar (No print) */}
          <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 text-left no-print">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPreviewPaper(null)}
                className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg border border-slate-250"
              >
                <X className="w-4 h-4" />
              </button>
              <div>
                <h4 className="text-xs font-extrabold text-slate-900">Global High-Fidelity Printing Bench</h4>
                <p className="text-[10px] text-slate-500">Preview paper layout, select dimensions, and export cleanly as A4/A3 layout.</p>
              </div>
            </div>

            {/* Spec Options */}
            <div className="flex flex-wrap gap-2.5 items-center text-xs">
              <select
                value={printSize}
                onChange={(e: any) => setPrintSize(e.target.value)}
                className="border border-slate-250 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 font-bold"
              >
                <option value="A4">A4 Page Size</option>
                <option value="A3">A3 Page Size</option>
              </select>

              <select
                value={printOrientation}
                onChange={(e: any) => setPrintOrientation(e.target.value)}
                className="border border-slate-250 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 font-bold"
              >
                <option value="portrait">Portrait Orientation</option>
                <option value="landscape">Landscape Orientation</option>
              </select>

              <select
                value={printColor}
                onChange={(e: any) => setPrintColor(e.target.value)}
                className="border border-slate-250 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 font-bold"
              >
                <option value="colour">Color Layout</option>
                <option value="bw">Monochrome (B&W)</option>
              </select>

              <label className="flex items-center gap-1.5 font-bold text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg border cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showAnswerKey}
                  onChange={(e) => setShowAnswerKey(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span>Include Answer Key</span>
              </label>

              <button
                onClick={executeSystemPrint}
                className="bg-slate-900 hover:bg-black text-white px-4 py-1.5 rounded-lg font-bold flex items-center gap-1 shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Paper</span>
              </button>
            </div>
          </div>

          <div className="no-print"><DocumentLanguageStudio profile={paperLanguageProfile} onChange={setPaperLanguageProfile} sections={[...QUESTION_PAPER_LANGUAGE_SECTIONS]} title="Print Section Languages" description="Change section languages without changing student/exam source data. Question text remains exactly as authored; the selected language controls script direction and font." compact /></div>

          {/* Actual Print Card - formatted perfectly to A4 specifications */}
          <div className="bg-slate-100 p-8 flex justify-center no-print">
            <div
              id="printable-question-paper"
              className={`bg-white shadow-lg p-10 font-sans border border-slate-250 ${
                printSize === 'A4' ? 'w-[794px]' : 'w-[1123px]'
              } ${printOrientation === 'landscape' ? 'rotate-0 w-full' : ''} ${
                printColor === 'bw' ? 'grayscale contrast-125' : ''
              }`}
            >
              {/* High School Letterhead banner */}
              <div className="border-b-4 border-double border-slate-800 pb-4 text-center" dir={documentLanguageDirection(primaryDocumentLanguage(sectionSelection(paperLanguageProfile,'header')))} style={{fontFamily:documentLanguageFont(primaryDocumentLanguage(sectionSelection(paperLanguageProfile,'header')))}}>
                <h1 className="text-xl font-extrabold uppercase tracking-wide text-slate-900 font-sans">
                  School
                </h1>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                  Nandurbar District, Maharashtra • Unified School ERP System
                </p>
                <div className="grid grid-cols-3 gap-2 mt-4 text-[11px] font-semibold text-slate-700 text-left border-t border-dashed border-slate-300 pt-3">
                  <div>
                    <span className="text-slate-400 font-bold">EXAMINATION:</span> {previewPaper.examName}
                  </div>
                  <div className="text-center">
                    <span className="text-slate-400 font-bold">ACADEMIC YEAR:</span> {previewPaper.academicYear}
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 font-bold">TERM:</span> {previewPaper.term}
                  </div>

                  <div>
                    <span className="text-slate-400 font-bold">CLASS:</span> {previewPaper.classId} {previewPaper.division !== 'All' ? `(${previewPaper.division})` : ''}
                  </div>
                  <div className="text-center">
                    <span className="text-slate-400 font-bold">SUBJECT:</span> {previewPaper.subjectName}
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 font-bold">CODE:</span> {previewPaper.paperCode}
                  </div>
                </div>
              </div>

              {/* Scoring & Duration indicators */}
              <div className="flex justify-between items-center py-2.5 border-b border-slate-300 text-[11px] font-bold font-mono text-slate-800">
                <div>TIME DURATION: {previewPaper.durationMinutes} MINUTES</div>
                <div>PASSING MARKS: {previewPaper.passingMarks}</div>
                <div>MAXIMUM MARKS: {previewPaper.maxMarks}</div>
              </div>

              {/* General instructions to candidate */}
              {previewPaper.instructions && (
                <div className="py-4 border-b border-slate-200" dir={documentLanguageDirection(primaryDocumentLanguage(sectionSelection(paperLanguageProfile,'instructions')))} style={{fontFamily:documentLanguageFont(primaryDocumentLanguage(sectionSelection(paperLanguageProfile,'instructions'))),textAlign:documentLanguageDirection(primaryDocumentLanguage(sectionSelection(paperLanguageProfile,'instructions')))==='rtl'?'right':'left'}}>
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">General Instructions to Candidates:</h5>
                  <div className="text-xs text-slate-700 font-semibold mt-1 whitespace-pre-wrap leading-relaxed">
                    {previewPaper.instructions}
                  </div>
                </div>
              )}

              {/* Questions Stream */}
              <div className="py-6 space-y-6" dir={documentLanguageDirection(primaryDocumentLanguage(sectionSelection(paperLanguageProfile,'questions')))} style={{fontFamily:documentLanguageFont(primaryDocumentLanguage(sectionSelection(paperLanguageProfile,'questions'))),textAlign:documentLanguageDirection(primaryDocumentLanguage(sectionSelection(paperLanguageProfile,'questions')))==='rtl'?'right':'left'}}>
                {previewPaper.questions.map((q, idx) => (
                  <div key={q.id} className="text-xs text-slate-900 flex justify-between gap-4 items-start">
                    <div className="space-y-1.5 flex-1">
                      <div className="font-bold flex items-start gap-1.5">
                        <span className="font-mono">Q.{idx + 1}</span>
                        <span>{q.questionText}</span>
                      </div>

                      {/* If MCQ option placeholders can be generated or listed */}
                      {q.questionType === 'MCQ' && (
                        <div className="grid grid-cols-2 gap-2 pl-7 text-[11px] font-semibold text-slate-600 mt-1">
                          <div>A) __________________</div>
                          <div>B) __________________</div>
                          <div>C) __________________</div>
                          <div>D) __________________</div>
                        </div>
                      )}

                      {/* If Match the following pattern */}
                      {q.questionType === 'Match the Following' && (
                        <div className="grid grid-cols-2 gap-4 pl-7 text-[11px] font-semibold text-slate-600 mt-2 max-w-md">
                          <div className="border-r pr-2">
                            <span className="font-bold text-[9px] uppercase text-slate-400 block mb-1">Column A</span>
                            <div>1. _________</div>
                            <div>2. _________</div>
                          </div>
                          <div>
                            <span className="font-bold text-[9px] uppercase text-slate-400 block mb-1">Column B</span>
                            <div>A) _________</div>
                            <div>B) _________</div>
                          </div>
                        </div>
                      )}

                      {/* Highlight Answer Key on Print Spec demand */}
                      {showAnswerKey && q.answerKey && (
                        <div className="bg-emerald-50 text-emerald-800 p-2 rounded-lg text-[10px] font-bold font-mono pl-7 mt-2">
                          ★ Answer / Solution key: {q.answerKey}
                        </div>
                      )}
                    </div>

                    <div className="font-bold font-mono text-[11px] text-slate-700 shrink-0">
                      [{q.marks} Marks]
                    </div>
                  </div>
                ))}

                {previewPaper.questions.length === 0 && (
                  <p className="text-slate-400 text-xs text-center py-10">No questions mapped to this exam paper template.</p>
                )}
              </div>

              {/* Signature section and seal */}
              <div className="mt-16 pt-8 border-t border-dashed border-slate-300 grid grid-cols-2 gap-8 text-[11px] font-bold text-slate-700" dir={documentLanguageDirection(primaryDocumentLanguage(sectionSelection(paperLanguageProfile,'signatures')))} style={{fontFamily:documentLanguageFont(primaryDocumentLanguage(sectionSelection(paperLanguageProfile,'signatures')))}}>
                <div className="text-left">
                  <p className="h-12"></p>
                  <p className="border-t border-slate-400 pt-1.5 w-48 text-center">{previewPaper.teacherName}</p>
                  <p className="text-slate-400 text-[10px] text-center w-48 uppercase">Subject Examiner</p>
                </div>
                <div className="text-right flex flex-col items-end">
                  <p className="h-12"></p>
                  <p className="border-t border-slate-400 pt-1.5 w-48 text-center">Headmaster Seal / Sign</p>
                  <p className="text-slate-400 text-[10px] text-center w-48 uppercase">School</p>
                </div>
              </div>

              <div className="mt-8 text-center text-[9px] text-slate-400 font-mono">
                System generated by NHST ERP Master Module. Page 1 of 1.
              </div>
            </div>
          </div>

          {/* Native Print Media CSS wrapper (Only triggered on Ctrl+P) */}
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              body * {
                visibility: hidden;
              }
              #printable-question-paper, #printable-question-paper * {
                visibility: visible;
              }
              #printable-question-paper {
                position: absolute;
                left: 0;
                top: 0;
                width: 100% !important;
                border: none !important;
                box-shadow: none !important;
                padding: 0 !important;
                margin: 0 !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}} />
        </div>
      )}
    </div>
  );
}
