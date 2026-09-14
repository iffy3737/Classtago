import React, { useMemo } from 'react';
import { 
  FileText, Users, GraduationCap, BarChart3, HelpCircle, 
  CheckCircle2, Lock, AlertCircle, UserMinus, ShieldAlert,
  Printer, FileSpreadsheet, FileDown, X, Info
} from 'lucide-react';
import { StudentMarkEntry, SubjectLockState } from '../types';
import { LocalERPDatabase } from '../lib/supabase';
import { printSectionById } from '../utils/printSection';

interface ReportsAndPrintProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedAcademicYear: string;
  selectedExam: string;
  selectedClass: string;
  selectedDivision: string;
  selectedSubject: string;
  gridEntries: StudentMarkEntry[];
  subjects: any[];
  examinations: any[];
  classes: any[];
  user: { id: string; name: string; role: string };
  
  // Print Settings
  pageSize: string;
  setPageSize: (size: string) => void;
  printOrientation: string;
  setPrintOrientation: (ori: string) => void;
  printTheme: string;
  setPrintTheme: (theme: string) => void;
  excludeStudentId: boolean;
  setExcludeStudentId: (exc: boolean) => void;
  excludeGrNumber: boolean;
  setExcludeGrNumber: (exc: boolean) => void;
  excludeRemarks: boolean;
  setExcludeRemarks: (exc: boolean) => void;

  exportToWord: () => void;
  exportToCsv: () => void;
}

const MarkListReportsAndPrintComponent: React.FC<ReportsAndPrintProps> = ({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  selectedAcademicYear,
  selectedExam,
  selectedClass,
  selectedDivision,
  selectedSubject,
  gridEntries,
  subjects,
  examinations,
  classes,
  user,
  pageSize,
  setPageSize,
  printOrientation,
  setPrintOrientation,
  printTheme,
  setPrintTheme,
  excludeStudentId,
  setExcludeStudentId,
  excludeGrNumber,
  setExcludeGrNumber,
  excludeRemarks,
  setExcludeRemarks,
  exportToWord,
  exportToCsv
}) => {
  if (!isOpen) return null;

  // Fetch all saved student mark entries for calculations
  const allStoredEntries: StudentMarkEntry[] = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('nhs_student_marks') || '[]');
    } catch {
      return [];
    }
  }, [isOpen]);

  // Fetch all subject lock states
  const allLockStates: SubjectLockState[] = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('nhs_subject_locks') || '[]');
    } catch {
      return [];
    }
  }, [isOpen]);

  // Fetch academic setup
  const academicSetup: any = useMemo(() => {
    return LocalERPDatabase.getAcademicSetup() || {
      academicYear: '2026-27',
      classes: [],
      subjects: [],
      examinations: [],
      teachers: [],
      subjectAllocations: [],
      classTeacherAssignments: []
    };
  }, [isOpen]);

  const examName = examinations.find(e => e.id === selectedExam)?.name || selectedExam;
  const currentSubjectName = subjects.find(s => s.id === selectedSubject)?.subjectName || selectedSubject;

  // --- REPORT 1: SUBJECT-WISE REGISTER ---
  const subjectWiseData = useMemo(() => {
    return gridEntries;
  }, [gridEntries]);

  // --- REPORT 2: TEACHER-WISE STATUS ---
  const teacherWiseData = useMemo(() => {
    const allocations = academicSetup.subjectAllocations || [];
    return allocations.map((alloc: any) => {
      const lockId = `lock_${selectedAcademicYear}_${selectedExam}_${alloc.classId}_${alloc.division || 'All'}_${alloc.subjectId}`;
      const state = allLockStates.find(l => l.id === lockId);
      const teacherName = academicSetup.teachers?.find(t => t.id === alloc.teacherId)?.name || alloc.teacherId;
      const subjName = subjects.find(s => s.id === alloc.subjectId)?.subjectName || alloc.subjectId;
      return {
        className: alloc.classId,
        division: alloc.division || 'All',
        subjectName: subjName,
        teacherName,
        status: state?.status || 'Draft',
        isLocked: !!state?.isLocked,
        lastUpdated: state?.lockedAt || state?.unlockedAt || 'N/A'
      };
    });
  }, [academicSetup, allLockStates, selectedAcademicYear, selectedExam, subjects]);

  // --- REPORT 3: CLASS-WISE BROAD SHEET LEDGER ---
  const classWiseLedger = useMemo(() => {
    // Find all students in this class and division
    const classStudents = allStoredEntries.filter(
      e => e.classId === selectedClass && 
      (selectedDivision ? e.division === selectedDivision : true) &&
      e.examId === selectedExam &&
      e.academicYear === selectedAcademicYear
    );

    // Group unique student IDs
    const studentMap: Record<string, { name: string; roll: string; gr: string; subjects: Record<string, number>; grandTotal: number }> = {};
    const classAllocatedSubjects = subjects; // list of all subjects

    classStudents.forEach(entry => {
      if (!studentMap[entry.studentId]) {
        studentMap[entry.studentId] = {
          name: entry.studentName,
          roll: entry.rollNumber || 'N/A',
          gr: entry.grNumber || 'N/A',
          subjects: {},
          grandTotal: 0
        };
      }
      studentMap[entry.studentId].subjects[entry.subjectId] = entry.subjectTotal;
    });

    const rows = Object.values(studentMap);
    // Calculate totals
    rows.forEach(r => {
      let sum = 0;
      Object.values(r.subjects).forEach(m => {
        if (typeof m === 'number') sum += m;
      });
      r.grandTotal = sum;
    });

    return {
      subjectsList: classAllocatedSubjects,
      rows: rows.sort((a,b) => String(a.roll).localeCompare(String(b.roll), undefined, { numeric: true }))
    };
  }, [allStoredEntries, selectedClass, selectedDivision, selectedExam, selectedAcademicYear, subjects]);

  // --- REPORT 4: EXAM-WISE STATISTICAL SUMMARY ---
  const examWiseStats = useMemo(() => {
    const stats: Record<string, { total: number; appeared: number; passed: number; failed: number; highest: number; lowest: number; sum: number }> = {};
    
    allStoredEntries
      .filter(e => e.examId === selectedExam && e.academicYear === selectedAcademicYear)
      .forEach(e => {
        if (!stats[e.subjectId]) {
          stats[e.subjectId] = { total: 0, appeared: 0, passed: 0, failed: 0, highest: -1, lowest: 9999, sum: 0 };
        }
        const s = stats[e.subjectId];
        s.total += 1;
        
        const isAb = String(e.subjectTotal).toUpperCase() === 'AB';
        if (!isAb && typeof e.subjectTotal === 'number') {
          s.appeared += 1;
          s.sum += e.subjectTotal;
          if (e.subjectTotal > s.highest) s.highest = e.subjectTotal;
          if (e.subjectTotal < s.lowest) s.lowest = e.subjectTotal;
          if (e.subjectTotal >= 35) {
            s.passed += 1;
          } else {
            s.failed += 1;
          }
        }
      });

    return Object.entries(stats).map(([subjId, s]) => {
      const subjName = subjects.find(sub => sub.id === subjId)?.subjectName || subjId;
      return {
        subjectName: subjName,
        ...s,
        avg: s.appeared ? (s.sum / s.appeared).toFixed(1) : '0.0',
        passPct: s.appeared ? ((s.passed / s.appeared) * 100).toFixed(1) + '%' : '0%'
      };
    });
  }, [allStoredEntries, selectedExam, selectedAcademicYear, subjects]);

  // --- REPORT 5: INCOMPLETE registers ---
  const incompleteRegisters = useMemo(() => {
    return teacherWiseData.filter(d => d.status !== 'Approved');
  }, [teacherWiseData]);

  // --- REPORT 6: COMPLETED registers ---
  const completedRegisters = useMemo(() => {
    return teacherWiseData.filter(d => d.status === 'Approved');
  }, [teacherWiseData]);

  // --- REPORT 7: LOCKED registers ---
  const lockedRegisters = useMemo(() => {
    return teacherWiseData.filter(d => d.isLocked);
  }, [teacherWiseData]);

  // --- REPORT 8: PENDING SUBMISSION registers ---
  const pendingSubmissionRegisters = useMemo(() => {
    return teacherWiseData.filter(d => d.status === 'Draft' || d.status === 'Returned');
  }, [teacherWiseData]);

  // --- REPORT 9: ABSENT STUDENTS ---
  const absentStudentsReport = useMemo(() => {
    return allStoredEntries.filter(
      e => e.examId === selectedExam && 
      e.academicYear === selectedAcademicYear &&
      (
        Object.values(e.formativeMarks).some(val => String(val).toUpperCase() === 'AB') ||
        Object.values(e.summativeMarks).some(val => String(val).toUpperCase() === 'AB')
      )
    ).map(e => ({
      ...e,
      subjectName: subjects.find(s => s.id === e.subjectId)?.subjectName || e.subjectId
    }));
  }, [allStoredEntries, selectedExam, selectedAcademicYear, subjects]);

  // --- REPORT 10: SPECIAL EXEMPTION CODES ---
  const specialStatusReport = useMemo(() => {
    const codes = ['ML', 'EX', 'WH', 'NA'];
    return allStoredEntries.filter(
      e => e.examId === selectedExam && 
      e.academicYear === selectedAcademicYear &&
      (
        Object.values(e.formativeMarks).some(val => codes.includes(String(val).toUpperCase())) ||
        Object.values(e.summativeMarks).some(val => codes.includes(String(val).toUpperCase()))
      )
    ).map(e => ({
      ...e,
      subjectName: subjects.find(s => s.id === e.subjectId)?.subjectName || e.subjectId
    }));
  }, [allStoredEntries, selectedExam, selectedAcademicYear, subjects]);

  const reportTabs = [
    { id: 'subj', label: 'Subject Mark List', icon: FileText },
    { id: 'teacher', label: 'Teacher Completion Status', icon: Users },
    { id: 'class', label: 'Class Ledger (Broad Sheet)', icon: GraduationCap },
    { id: 'stats', label: 'Exam Stats Summary', icon: BarChart3 },
    { id: 'incomplete', label: 'Incomplete Entries', icon: HelpCircle },
    { id: 'completed', label: 'Approved & Done', icon: CheckCircle2 },
    { id: 'locked', label: 'Locked Registers', icon: Lock },
    { id: 'pending', label: 'Pending Submission', icon: AlertCircle },
    { id: 'absent', label: 'Absent Students (AB)', icon: UserMinus },
    { id: 'special', label: 'Special Exemptions (ML/EX)', icon: ShieldAlert },
  ];

  return (
    <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-2 sm:p-4 animate-fade-in no-print text-xs">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-7xl w-full h-[90vh] flex flex-col overflow-hidden">
        
        {/* HEADER AREA */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-tight">Reports & Administrative Analytics Center</h2>
              <p className="text-[10px] text-slate-400">Academic Year {selectedAcademicYear} &nbsp;|&nbsp; Exam: {examName}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY AREA */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* TAB SIDEBAR NAVIGATION */}
          <div className="w-64 bg-slate-50 border-r border-slate-200 p-3 overflow-y-auto space-y-1 select-none">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block px-2.5 mb-2">Available Register Reports</span>
            {reportTabs.map(tab => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left font-semibold transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <TabIcon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}

            <div className="pt-4 border-t border-slate-200 mt-4 px-2.5 space-y-2">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Print Settings</span>
              
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 block">Page Layout Size</label>
                <select 
                  value={pageSize} 
                  onChange={(e) => setPageSize(e.target.value)}
                  className="w-full p-1.5 border rounded-lg bg-white text-xs font-bold"
                >
                  <option value="A4">A4 (Standard Office)</option>
                  <option value="A3">A3 (Wide Ledger)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 block">Orientation</label>
                <select 
                  value={printOrientation} 
                  onChange={(e) => setPrintOrientation(e.target.value)}
                  className="w-full p-1.5 border rounded-lg bg-white text-xs font-bold"
                >
                  <option value="Landscape">Landscape (Recommended)</option>
                  <option value="Portrait">Portrait</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 block">Visual Tone Theme</label>
                <select 
                  value={printTheme} 
                  onChange={(e) => setPrintTheme(e.target.value)}
                  className="w-full p-1.5 border rounded-lg bg-white text-xs font-bold"
                >
                  <option value="color">Full Color Accents</option>
                  <option value="monochrome">Pure Monochrome (Ink-Saver)</option>
                </select>
              </div>

              <div className="pt-2 space-y-1 border-t">
                <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Column Toggles</span>
                <label className="flex items-center gap-2 text-[11px] text-slate-600 font-medium cursor-pointer">
                  <input type="checkbox" checked={excludeStudentId} onChange={(e) => setExcludeStudentId(e.target.checked)} className="rounded" />
                  <span>Hide Roll Number</span>
                </label>
                <label className="flex items-center gap-2 text-[11px] text-slate-600 font-medium cursor-pointer">
                  <input type="checkbox" checked={excludeGrNumber} onChange={(e) => setExcludeGrNumber(e.target.checked)} className="rounded" />
                  <span>Hide G.R. Number</span>
                </label>
                <label className="flex items-center gap-2 text-[11px] text-slate-600 font-medium cursor-pointer">
                  <input type="checkbox" checked={excludeRemarks} onChange={(e) => setExcludeRemarks(e.target.checked)} className="rounded" />
                  <span>Hide Remarks</span>
                </label>
              </div>
            </div>
          </div>

          {/* ACTIVE REPORT OUTPUT PREVIEW */}
          <div className="flex-1 bg-slate-100 p-6 overflow-y-auto flex flex-col justify-between">
            <div id="mark-list-reports-print" className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              
              {/* Report Header Title */}
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-800 tracking-tight flex items-center gap-1">
                    <Printer className="w-4 h-4 text-indigo-600" />
                    <span>{reportTabs.find(t => t.id === activeTab)?.label}</span>
                  </h3>
                  <p className="text-[10px] text-slate-400">Class {selectedClass} | Division {selectedDivision || 'All'} | Official Audit Report</p>
                </div>
                
                <div className="flex items-center gap-1.5">
                  <button 
                    type="button"
                    onClick={() => printSectionById('mark-list-reports-print', 'Mark List Official Report')}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print System</span>
                  </button>
                  <button 
                    onClick={exportToWord}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Word Export</span>
                  </button>
                  <button 
                    onClick={exportToCsv}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Excel CSV</span>
                  </button>
                </div>
              </div>

              {/* REPORT DATA RENDERING SWITCH */}
              <div className="overflow-x-auto">
                {activeTab === 'subj' && (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b">
                        <th className="p-2.5 font-bold">Roll No</th>
                        <th className="p-2.5 font-bold">G.R. No</th>
                        <th className="p-2.5 font-bold">Student Name</th>
                        <th className="p-2.5 text-center font-bold">FA Total</th>
                        <th className="p-2.5 text-center font-bold">SA Total</th>
                        <th className="p-2.5 text-center font-bold">Grand Total</th>
                        <th className="p-2.5 font-bold">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {subjectWiseData.map(row => (
                        <tr key={row.id} className="hover:bg-slate-50">
                          <td className="p-2">{row.rollNumber}</td>
                          <td className="p-2 font-mono">{row.grNumber}</td>
                          <td className="p-2 font-black">{row.studentName}</td>
                          <td className="p-2 text-center font-mono">{row.formativeTotal}</td>
                          <td className="p-2 text-center font-mono">{row.summativeTotal}</td>
                          <td className="p-2 text-center font-black text-indigo-700 font-mono">{row.subjectTotal}</td>
                          <td className="p-2 text-slate-500">{row.remarks || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeTab === 'teacher' && (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b">
                        <th className="p-2.5 font-bold">Class Level</th>
                        <th className="p-2.5 font-bold">Division</th>
                        <th className="p-2.5 font-bold">Subject Name</th>
                        <th className="p-2.5 font-bold">Subject Teacher</th>
                        <th className="p-2.5 text-center font-bold">Workflow Status</th>
                        <th className="p-2.5 text-center font-bold">Lock State</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {teacherWiseData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2 font-bold">Class {row.className}</td>
                          <td className="p-2">{row.division}</td>
                          <td className="p-2 font-semibold text-slate-800">{row.subjectName}</td>
                          <td className="p-2 font-black">{row.teacherName}</td>
                          <td className="p-2 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              row.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                              row.status === 'Submitted' ? 'bg-amber-100 text-amber-800' :
                              row.status === 'Returned' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="p-2 text-center font-mono">
                            {row.isLocked ? '🔒 LOCKED' : '✏️ OPEN'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeTab === 'class' && (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b">
                        <th className="p-2.5 font-bold">Roll</th>
                        <th className="p-2.5 font-bold">G.R. No</th>
                        <th className="p-2.5 font-bold">Student Name</th>
                        {classWiseLedger.subjectsList.map(sub => (
                          <th key={sub.id} className="p-2.5 text-center font-bold">{sub.subjectName}</th>
                        ))}
                        <th className="p-2.5 text-center font-black text-indigo-700">AGGREGATE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {classWiseLedger.rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2 font-mono font-bold">{row.roll}</td>
                          <td className="p-2 font-mono text-slate-500">{row.gr}</td>
                          <td className="p-2 font-black">{row.name}</td>
                          {classWiseLedger.subjectsList.map(sub => (
                            <td key={sub.id} className="p-2 text-center font-mono font-bold text-slate-600">
                              {row.subjects[sub.id] !== undefined ? row.subjects[sub.id] : '-'}
                            </td>
                          ))}
                          <td className="p-2 text-center font-black text-indigo-700 font-mono bg-indigo-50">{row.grandTotal}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeTab === 'stats' && (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b">
                        <th className="p-2.5 font-bold">Evaluation Subject</th>
                        <th className="p-2.5 text-center font-bold">Total Students</th>
                        <th className="p-2.5 text-center font-bold">Appeared</th>
                        <th className="p-2.5 text-center font-bold">Passed (≥35)</th>
                        <th className="p-2.5 text-center font-bold">Failed (&lt;35)</th>
                        <th className="p-2.5 text-center font-bold">Highest Score</th>
                        <th className="p-2.5 text-center font-bold">Lowest Score</th>
                        <th className="p-2.5 text-center font-bold text-indigo-700">Class Avg</th>
                        <th className="p-2.5 text-center font-black text-emerald-700">Pass %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {examWiseStats.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2 font-black">{row.subjectName}</td>
                          <td className="p-2 text-center">{row.total}</td>
                          <td className="p-2 text-center">{row.appeared}</td>
                          <td className="p-2 text-center text-emerald-600 font-bold">{row.passed}</td>
                          <td className="p-2 text-center text-rose-600 font-bold">{row.failed}</td>
                          <td className="p-2 text-center font-mono">{row.highest}</td>
                          <td className="p-2 text-center font-mono">{row.lowest}</td>
                          <td className="p-2 text-center font-mono text-indigo-700 font-bold">{row.avg}</td>
                          <td className="p-2 text-center font-mono text-emerald-700 font-black">{row.passPct}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {['incomplete', 'completed', 'locked', 'pending'].includes(activeTab) && (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b">
                        <th className="p-2.5 font-bold">Class / Division</th>
                        <th className="p-2.5 font-bold">Evaluated Subject</th>
                        <th className="p-2.5 font-bold">Responsible Teacher</th>
                        <th className="p-2.5 text-center font-bold">Workflow State</th>
                        <th className="p-2.5 font-bold">Audit Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(activeTab === 'incomplete' ? incompleteRegisters :
                        activeTab === 'completed' ? completedRegisters :
                        activeTab === 'locked' ? lockedRegisters : pendingSubmissionRegisters
                       ).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2 font-bold">Class {row.className} ({row.division})</td>
                          <td className="p-2 font-semibold text-indigo-900">{row.subjectName}</td>
                          <td className="p-2 font-black">{row.teacherName}</td>
                          <td className="p-2 text-center">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 border border-indigo-200 text-indigo-700">
                              {row.status}
                            </span>
                          </td>
                          <td className="p-2 text-slate-400 font-mono">{row.lastUpdated}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeTab === 'absent' && (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b">
                        <th className="p-2.5 font-bold">Roll</th>
                        <th className="p-2.5 font-bold">G.R. No</th>
                        <th className="p-2.5 font-bold">Student Name</th>
                        <th className="p-2.5 font-bold">Subject</th>
                        <th className="p-2.5 text-center font-bold">Total Marks</th>
                        <th className="p-2.5 text-center font-bold text-rose-600">ABSENT FLAG</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {absentStudentsReport.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2 font-mono">{row.rollNumber}</td>
                          <td className="p-2 font-mono text-slate-400">{row.grNumber}</td>
                          <td className="p-2 font-black">{row.studentName}</td>
                          <td className="p-2 font-semibold">{row.subjectName}</td>
                          <td className="p-2 text-center font-mono">{row.subjectTotal}</td>
                          <td className="p-2 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-800 font-extrabold font-mono uppercase">
                              AB - ABSENT
                            </span>
                          </td>
                        </tr>
                      ))}
                      {absentStudentsReport.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center italic text-slate-400">No student is flagged as absent in this current examination scope.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}

                {activeTab === 'special' && (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b">
                        <th className="p-2.5 font-bold">Roll</th>
                        <th className="p-2.5 font-bold">G.R. No</th>
                        <th className="p-2.5 font-bold">Student Name</th>
                        <th className="p-2.5 font-bold">Subject</th>
                        <th className="p-2.5 text-center font-bold">Exemption Code</th>
                        <th className="p-2.5 font-bold">System Interpretation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {specialStatusReport.map((row, idx) => {
                        const codeVal = Object.values(row.formativeMarks).find(v => ['ML', 'EX', 'WH', 'NA'].includes(String(v).toUpperCase())) || 
                                      Object.values(row.summativeMarks).find(v => ['ML', 'EX', 'WH', 'NA'].includes(String(v).toUpperCase())) || 'ML';
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2 font-mono">{row.rollNumber}</td>
                            <td className="p-2 font-mono text-slate-400">{row.grNumber}</td>
                            <td className="p-2 font-black">{row.studentName}</td>
                            <td className="p-2 font-semibold">{row.subjectName}</td>
                            <td className="p-2 text-center font-mono">
                              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-black">
                                {String(codeVal).toUpperCase()}
                              </span>
                            </td>
                            <td className="p-2 text-slate-500 font-medium">
                              {String(codeVal).toUpperCase() === 'ML' ? 'Medical Leave exemption (Passing rules adjusted)' :
                               String(codeVal).toUpperCase() === 'EX' ? 'Exempted from assessment paper' :
                               String(codeVal).toUpperCase() === 'WH' ? 'Result withheld due to office review' : 'Not Available / Term skipped'}
                            </td>
                          </tr>
                        );
                      })}
                      {specialStatusReport.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center italic text-slate-400">No student with special status codes (ML, EX, WH, NA) found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>

            </div>

            <div className="mt-4 text-center text-slate-400 text-[10px] font-mono">
              Classtago - System Generated Academic Certificate Registry
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export const MarkListReportsAndPrint = React.memo(MarkListReportsAndPrintComponent);
