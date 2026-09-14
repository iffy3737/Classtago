/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Award, FileSpreadsheet, BookOpen, UserSquare, Clock, 
  AlertTriangle, CheckCircle2, History, Bell, ShieldCheck, 
  AlertCircle, ArrowRight, Printer, RefreshCw, X, ChevronRight, FileText, ArrowLeftRight,
  ChevronDown, ChevronUp, Download, Upload, ClipboardList, Check, Info, ArrowLeft, Archive, Search, Send, Trash2,
  PlusCircle
} from 'lucide-react';
import ClerkResultCloudPrintInbox from '../modules/teacherResultFresh/ClerkResultCloudPrintInbox';
import { publishLegacyClerkMasterTemplate } from '../modules/teacherResultFresh/clerkResultMasterBridge';
import { clerkDefaultMasterTemplates } from '../modules/teacherResultFresh/clerkMasterTemplates';
import { Language, User, SubjectLockState, StudentMarkEntry, SystemNotification } from '../types';
import { LocalERPDatabase } from '../lib/supabase';
import { getClassAssessmentWeightage, normalizeClassStandard, isClass9or10GeneralSubject, isClass9or10MathSubject, isClass9or10LangSubject, getDualPaperNames, isClass9or10SingleSubject, isClass9or10DualPaperSubject, isClass9or10DualLangSubject } from '../lib/assessmentRules';
import MasterResultBookEditor from './MasterResultBookEditor';
import MasterProgressCardTemplateEditor from './MasterProgressCardTemplateEditor';
import ContinuousResultBook from './ContinuousResultBook';
import SmartMarkListA from './SmartMarkListA';
import CommonPrintEngine, { generateMarkListSpreadsheet } from './CommonPrintEngine';
import * as XLSX from 'xlsx';
import { printSectionById } from '../utils/printSection';
import { runNativeBrowserPrint } from '../lib/smartPrint';

interface ResultManagementProps {
  lang: Language;
  user: User;
  activeFeatureId?: string | null;
  focusedMode?: boolean;
  focusedTitle?: string;
}


const parseLanguageVal = (val: any): { isBlank: boolean; isSpecial: boolean; num: number | null; specialCode: string | null } => {
  if (val === undefined || val === null || String(val).trim() === '') {
    return { isBlank: true, isSpecial: false, num: null, specialCode: null };
  }
  const clean = String(val).trim().toUpperCase();
  if (['AB', 'A', 'ML', 'EX', 'WH', 'NA'].includes(clean)) {
    return { isBlank: false, isSpecial: true, num: null, specialCode: clean };
  }
  const parsed = parseFloat(clean);
  if (isNaN(parsed)) {
    return { isBlank: false, isSpecial: false, num: 0, specialCode: null };
  }
  return { isBlank: false, isSpecial: false, num: parsed, specialCode: null };
};

const combineLanguageRawValues = (hVal: any, mVal: any): string | number => {
  const hInfo = parseLanguageVal(hVal);
  const mInfo = parseLanguageVal(mVal);

  if (hInfo.isBlank && mInfo.isBlank) {
    return '';
  }

  if (hInfo.isSpecial && mInfo.isSpecial) {
    if (hInfo.specialCode === mInfo.specialCode) {
      return hInfo.specialCode!;
    } else {
      return hInfo.specialCode!;
    }
  }

  if (hInfo.isBlank && mInfo.isSpecial) {
    return mInfo.specialCode!;
  }
  if (mInfo.isBlank && hInfo.isSpecial) {
    return hInfo.isSpecial ? hInfo.specialCode! : '';
  }

  if (hInfo.num !== null && mInfo.isBlank) {
    return hInfo.num;
  }
  if (mInfo.num !== null && hInfo.isBlank) {
    return mInfo.num;
  }

  if (hInfo.isSpecial && mInfo.num !== null) {
    return mInfo.num;
  }
  if (mInfo.isSpecial && hInfo.num !== null) {
    return hInfo.num;
;
  }

  if (hInfo.num !== null && mInfo.num !== null) {
    return hInfo.num + mInfo.num;
  }

  return '';
};

const getSpecialColumnIndices = (headers: any[]) => {
  let formativeTotalIdx = -1;
  let summativeTotalIdx = -1;
  let grandTotalIdx = -1;

  if (!headers) return { formativeTotalIdx, summativeTotalIdx, grandTotalIdx };

  headers.forEach((h: any, idx: number) => {
    const text = (h.text || '').toLowerCase();
    
    const isFormativeTotal = (text.includes('formative') && text.includes('total')) || h.formula === 'FORMATIVE_TOTAL' || (h.formula && h.formula.toUpperCase().includes('SUM') && text.includes('formative'));
    const isSummativeTotal = (text.includes('summative') && text.includes('total')) || h.formula === 'SUMMATIVE_TOTAL' || (h.formula && h.formula.toUpperCase().includes('SUM') && text.includes('summative'));
    const isGrandTotal = (text.includes('grand') && text.includes('total')) || text === 'total' || h.formula === 'GRAND_TOTAL' || (h.formula && h.formula.toUpperCase().includes('SUM') && !text.includes('formative') && !text.includes('summative'));

    if (isFormativeTotal) {
      if (formativeTotalIdx === -1) formativeTotalIdx = idx;
    } else if (isSummativeTotal) {
      if (summativeTotalIdx === -1) summativeTotalIdx = idx;
    } else if (isGrandTotal) {
      if (grandTotalIdx === -1) grandTotalIdx = idx;
    }
  });

  if (formativeTotalIdx === -1) {
    formativeTotalIdx = headers.findIndex((h: any) => h.formula === 'FORMATIVE_TOTAL');
  }
  if (summativeTotalIdx === -1) {
    summativeTotalIdx = headers.findIndex((h: any) => h.formula === 'SUMMATIVE_TOTAL');
  }
  if (grandTotalIdx === -1) {
    grandTotalIdx = headers.findIndex((h: any) => h.formula === 'GRAND_TOTAL');
  }

  return { formativeTotalIdx, summativeTotalIdx, grandTotalIdx };
};

export const evaluateCombinedLanguageRows = (
  studentId: string,
  rawHindiMarks: Record<string, any>,
  rawMarathiMarks: Record<string, any>,
  template: any,
  evaluateFormulaFn: (formula: string, studentId: string, scores: Record<string, string | number>, customTemplate?: any, isTotalRow?: boolean) => any
) => {
  const hindiScores: Record<string, string | number> = { ...rawHindiMarks };
  const marathiScores: Record<string, string | number> = { ...rawMarathiMarks };
  const totalScores: Record<string, string | number> = {};

  const { formativeTotalIdx, summativeTotalIdx, grandTotalIdx } = getSpecialColumnIndices(template?.headers || []);
  const fHeader = formativeTotalIdx !== -1 ? template.headers[formativeTotalIdx] : null;
  const sHeader = summativeTotalIdx !== -1 ? template.headers[summativeTotalIdx] : null;
  const gHeader = grandTotalIdx !== -1 ? template.headers[grandTotalIdx] : null;
  const gradeHeader = (template?.headers || []).find((h: any) => h.formula && h.formula.trim().toUpperCase().startsWith('GRADE('));

  const fId = fHeader?.id;
  const sId = sHeader?.id;
  const gId = gHeader?.id;
  const gradeId = gradeHeader?.id;

  if (template?.id === 'tmpl_class_1_8_language') {
    // Debug logging disabled in production
  }

  const runFormulas = (scores: Record<string, string | number>, isTotalRow: boolean, rowName: string) => {
    (template?.headers || []).forEach((h: any) => {
      if (h.formula) {
        const evaluatedVal = evaluateFormulaFn(h.formula, studentId, scores, template, isTotalRow);
        scores[h.id] = evaluatedVal;
      }
    });
  };

  runFormulas(hindiScores, false, 'Hindi');
  runFormulas(marathiScores, false, 'Marathi');

  (template?.headers || []).forEach((h: any) => {
    if (h.isIdentity || h.id === 'h1' || h.id === 'h2' || h.id === 'h3' || h.formula || h.columnType === 'rowLabel') {
      return;
    }
    const hVal = hindiScores[h.id] !== undefined ? hindiScores[h.id] : '';
    const mVal = marathiScores[h.id] !== undefined ? marathiScores[h.id] : '';
    const combinedVal = combineLanguageRawValues(hVal, mVal);
    totalScores[h.id] = combinedVal;
  });

  runFormulas(totalScores, true, 'TOTAL');

  const getVal = (scores: Record<string, string | number>, id?: string) => {
    if (!id) return '';
    const val = scores[id];
    return (val !== undefined && val !== null && val !== '') ? val : '';
  };

  return {
    hindi: {
      marks: hindiScores,
      formativeTotal: getVal(hindiScores, fId),
      summativeTotal: getVal(hindiScores, sId),
      grandTotal: getVal(hindiScores, gId),
      grade: String(getVal(hindiScores, gradeId))
    },
    marathi: {
      marks: marathiScores,
      formativeTotal: getVal(marathiScores, fId),
      summativeTotal: getVal(marathiScores, sId),
      grandTotal: getVal(marathiScores, gId),
      grade: String(getVal(marathiScores, gradeId))
    },
    total: {
      marks: totalScores,
      formativeTotal: getVal(totalScores, fId),
      summativeTotal: getVal(totalScores, sId),
      grandTotal: getVal(totalScores, gId),
      grade: String(getVal(totalScores, gradeId))
    }
  };
};


// --- SHARED LANGUAGE MARK LIST RENDERER ---
const LanguageMarkListRenderer = ({
  template,
  students,
  sheetScores,
  isMock = false,
  editable = false,
  isLocked = false,
  onUpdateLanguageMark,
  evaluateFormulaFn,
  selectedCell,
  selectedColumnId,
  selectedRowIndex,
  onCellClick,
  onRowClick,
  getHeaderMaxMarks
}: any) => {
  const dataList = students || Array.from({ length: template?.rows || 10 }).map((_, i) => ({ isMock: true, index: i }));


  return dataList.flatMap((student: any, sIdx: number) => {
    const rollNo = student.isMock ? '' : student.rollNo;
    const grNo = student.isMock ? '' : student.grNumber;
    const studentName = student.isMock ? '' : student.name;
    const studentId = student.isMock ? `blank-row-${sIdx}` : student.id;

    const row1Num = 5 + sIdx * 3;
    const row2Num = 5 + sIdx * 3 + 1;
    const row3Num = 5 + sIdx * 3 + 2;
    
    let hindiScores: Record<string, string | number> = {};
    let marathiScores: Record<string, string | number> = {};
    let totalScores: Record<string, string | number> = {};

    if (!student.isMock && sheetScores) {
      const studentVals = sheetScores[studentId] || {};
      const langRows = studentVals.languageRows || { hindi: { marks: {} }, marathi: { marks: {} }, total: { marks: {} } };
      const rawHindi = langRows.hindi?.marks || {};
      const rawMarathi = langRows.marathi?.marks || {};

      const evaluated = evaluateCombinedLanguageRows(studentId, rawHindi, rawMarathi, template, evaluateFormulaFn);
      hindiScores = evaluated.hindi.marks;
      marathiScores = evaluated.marathi.marks;
      totalScores = evaluated.total.marks;
    } else {
      const emptyRaw: Record<string, any> = {};
      (template?.headers || []).forEach((h: any) => {
        if (!h.isIdentity && h.id !== 'h1' && h.id !== 'h2' && h.id !== 'h3' && !h.formula && h.columnType !== 'rowLabel') {
          emptyRaw[h.id] = '';
        }
      });
      const evaluated = evaluateCombinedLanguageRows(studentId, emptyRaw, emptyRaw, template, evaluateFormulaFn);
      hindiScores = evaluated.hindi.marks;
      marathiScores = evaluated.marathi.marks;
      totalScores = evaluated.total.marks;
    }

const renderCell = (rowNum: number, h: any, scores: any, lang: 'hindi' | 'marathi' | 'total') => {
      const isCellSelected = selectedCell?.row === rowNum && selectedCell?.colId === h.id;
      const isColSelected = selectedColumnId === h.id;
      
      let isColIdentity = false;
      const lowerText = (h.text || '').toLowerCase();
      if (h.identityType === 'roll' || h.id === 'h1' || lowerText.includes('roll')) isColIdentity = true;
      if (h.identityType === 'gr' || h.id === 'h2' || lowerText.includes('g.r.')) isColIdentity = true;
      if (h.identityType === 'name' || h.id === 'h3' || lowerText.includes('name')) isColIdentity = true;
      if (h.columnType === 'rowLabel' || h.id === 'languageRow' || h.identityType === 'subject_label' || lowerText.includes('language')) isColIdentity = true;
      if (lowerText.includes('language') || h.id === 'languageRow' || h.identityType === 'subject_label') isColIdentity = true;

      const normalizedName = (h.baseName || h.text || h.name || '').trim().toLowerCase().replace(/\s+/g, '');
      const isGrandTotalColumn = h.fieldKey === 'grandTotal' || h.bindingKey === 'grandTotal' || h.calculationType === 'grandTotal' || h.formula === 'GRAND_TOTAL' || normalizedName === 'grandtotal';
      const isGradeColumn = h.fieldKey === 'grade' || h.bindingKey === 'grade' || h.calculationType === 'grade' || (h.formula && h.formula.includes('GRADE')) || normalizedName === 'grade';
      const isColMerged = h.mergeEachStudentBlock === true;

      let cellVal: any = '';
      let cellBg = 'bg-white';
      
      if (isColMerged && rowNum !== row1Num) {
        return null; // Merged cells are only rendered in row 1
      }

      if (isColMerged) {
        if (h.identityType === 'roll' || h.id === 'h1' || lowerText.includes('roll')) {
          cellVal = String(rollNo);
          cellBg = 'font-mono text-center font-bold text-slate-500';
        }
        else if (h.identityType === 'gr' || h.id === 'h2' || lowerText.includes('g.r.')) {
          cellVal = grNo;
          cellBg = 'font-mono text-center text-slate-400';
        }
        else if (h.identityType === 'name' || h.id === 'h3' || lowerText.includes('name')) {
          cellVal = studentName;
          cellBg = 'text-slate-800 font-extrabold text-left pl-3';
        }
        else if (h.identityType === 'subject_label' || h.id === 'languageRow' || lowerText.includes('language')) {
          cellVal = 'Hindi / Marathi';
          cellBg = 'bg-slate-100 font-bold uppercase text-[11px] text-center';
        }
        else if (isGrandTotalColumn) {
          cellVal = String(totalScores[h.id] !== undefined ? totalScores[h.id] : '');
          cellBg = 'bg-slate-100 text-slate-950 font-black border-r-2 border-slate-300 font-mono text-center';
        } else if (isGradeColumn) {
          const grade = String(totalScores[h.id] || '');
          cellBg = 'bg-slate-100 text-slate-950 text-center align-middle';
          cellVal = (
             <span className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold ${
                  grade === 'E'
                      ? 'bg-rose-100 text-rose-800'
                      : grade.startsWith('A')
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-indigo-100 text-indigo-800'
                }`}>
                  {grade || '-'}
             </span>
          );
        } else {
          cellVal = String(totalScores[h.id] !== undefined ? totalScores[h.id] : '');
        }
      } else {
        if (isColIdentity) {
          if (lang === 'hindi') {
             cellVal = 'Hindi';
             cellBg = 'bg-orange-50/40 text-orange-800 font-bold text-center text-[11px]';
          }
          else if (lang === 'marathi') {
             cellVal = 'Marathi';
             cellBg = 'bg-sky-50/40 text-sky-800 font-bold text-center text-[11px]';
          }
          else {
             cellVal = 'Total';
             cellBg = 'bg-emerald-50/50 text-emerald-900 font-black text-center text-[11px]';
          }
        } else {
          cellVal = String(scores[h.id] !== undefined ? scores[h.id] : '');
          
          if (h.formula) {
             if (lang === 'hindi') cellBg = 'bg-orange-50/10 text-orange-700 font-mono font-black text-center text-xs align-middle';
             else if (lang === 'marathi') cellBg = 'bg-sky-50/10 text-sky-700 font-mono font-black text-center text-xs align-middle';
             else cellBg = 'text-emerald-800 font-mono font-black bg-emerald-50/60 text-center text-xs align-middle';
          } else if (lang === 'total') {
             cellBg = 'text-slate-800 font-semibold bg-slate-50/60 font-mono text-center text-xs align-middle';
          } else {
             // Not formula, not identity, not total -> editable in Teacher mode
             if (editable && !isLocked) {
                const isOverMax = !isNaN(Number(cellVal)) && cellVal !== '' && Number(cellVal) > (getHeaderMaxMarks ? getHeaderMaxMarks(h) : 100);
                const inputClass = `w-full h-8 text-center font-mono font-extrabold bg-transparent focus:bg-amber-50 focus:ring-1 focus:ring-amber-400 focus:outline-none rounded-md transition-all border ${
                  isOverMax ? 'border-red-500 text-red-600 focus:border-red-500 focus:ring-red-500 bg-red-50/50' : 'border-transparent border-b-slate-100 focus:border-amber-300 text-slate-800'
                }`;
                cellVal = (
                  <input
                    type="text"
                    disabled={isLocked}
                    value={cellVal}
                    onChange={(e) => onUpdateLanguageMark && onUpdateLanguageMark(studentId, lang, h.id, e.target.value)}
                    placeholder="-"
                    className={inputClass}
                  />
                );
                cellBg = 'bg-white p-1 text-center align-middle';
             } else {
                cellBg = 'bg-white text-center font-mono align-middle text-xs p-1';
             }
          }
        }
      }

      return (
        <td
          key={h.id}
          rowSpan={isColMerged ? 3 : 1}
          onClick={(e) => {
            if (onCellClick) {
              e.stopPropagation();
              onCellClick(rowNum, h.id);
            }
          }}
          className={`border-r border-slate-200 text-xs truncate select-none transition-all align-middle ${cellBg} ${isCellSelected ? 'ring-2 ring-emerald-500 font-bold z-10' : isColSelected ? 'bg-slate-50/50' : ''}`}
          style={{
            textAlign: isColIdentity && !h.align ? 'center' : (h.align === 'center' ? 'center' : h.align === 'left' ? 'left' : 'right'),
            fontFamily: isColIdentity && !h.font ? 'inherit' : (h.font === 'font-mono' ? 'monospace' : h.font === 'font-serif' ? 'Outfit, sans-serif' : 'inherit'),
          }}
        >
          {cellVal}
        </td>
      );
    };

    const row1Selected = selectedRowIndex === row1Num;
    const row2Selected = selectedRowIndex === row2Num;
    const row3Selected = selectedRowIndex === row3Num;

    const row1Height = template?.rowHeights?.[String(row1Num)] || (editable ? 40 : 32);
    const row2Height = template?.rowHeights?.[String(row2Num)] || (editable ? 40 : 32);
    const row3Height = template?.rowHeights?.[String(row3Num)] || (editable ? 40 : 32);

    return [
      <tr key={`s-${studentId}-r1`} className={`hover:bg-slate-50/50 border-b border-slate-200 group/row ${row1Selected ? 'bg-emerald-50/30' : ''}`} style={{ height: `${row1Height}px` }}>
        <td rowSpan={3} onClick={() => onRowClick && onRowClick(row1Num)} className={`bg-slate-100 text-slate-400 font-mono text-[9px] text-center border-r border-slate-300 font-medium print:hidden select-none cursor-pointer hover:bg-slate-200 align-middle ${row1Selected ? 'bg-emerald-200 text-emerald-800 font-bold' : ''}`}>
          {isMock ? row1Num : (5 + sIdx)}
        </td>
        {(template?.headers || []).map((h: any) => renderCell(row1Num, h, hindiScores, 'hindi'))}
      </tr>,
      <tr key={`s-${studentId}-r2`} className={`hover:bg-slate-50/50 border-b border-slate-200 group/row ${row2Selected ? 'bg-emerald-50/30' : ''}`} style={{ height: `${row2Height}px` }}>
        {(template?.headers || []).map((h: any) => renderCell(row2Num, h, marathiScores, 'marathi'))}
      </tr>,
      <tr key={`s-${studentId}-r3`} className={`border-b-2 border-slate-300 h-10 bg-slate-50/80 font-bold hover:bg-slate-50/90 group/row ${row3Selected ? 'bg-emerald-50/50' : ''}`} style={{ height: `${row3Height}px` }}>
        {(template?.headers || []).map((h: any) => renderCell(row3Num, h, totalScores, 'total'))}
      </tr>
    ];
  });
};
// --- END SHARED RENDERER ---

export default function ResultManagement({
  lang,
  user,
  activeFeatureId = null,
  focusedMode = false,
  focusedTitle = 'Result Management'
}: ResultManagementProps) {
  const isUrdu = lang === 'ur';

  // Get active setup to check class teacher assignments
  const setup = LocalERPDatabase.getAcademicSetup();
  const teacherProfile = setup?.teacherProfiles?.find(
    (t: any) => (user.shalarthId && t.shalarthId === user.shalarthId) || 
                (user.employeeCode && t.employeeId === user.employeeCode) || 
                (t.fullName || '').toLowerCase() === (user.name || '').toLowerCase() ||
                t.id === user.id
  );
  const classTeacherAssignment = setup?.classTeacherAssignments?.find(
    (a: any) => ((a.teacherId === user.id || (teacherProfile && a.teacherId === teacherProfile.id)) && a.isActive !== false)
  );
  
  // ROLE DETECTION
  const isHeadmaster = user.role === 'headmaster';
  const isClerk = user.role === 'clerk';
  const isClassTeacher = user.role === 'teacher' && !!classTeacherAssignment;
  const isSubjectTeacher = user.role === 'teacher' && !isClassTeacher;

  // For Class Teacher, get their assigned class details
  const assignedClassName = classTeacherAssignment 
    ? `${classTeacherAssignment.className} - ${classTeacherAssignment.divisionName}`
    : 'Assigned Class';

  // State for Headmaster Clickable Cards (Side Panel or Expanded Detail Section)
  const [activeHMCard, setActiveHMCard] = useState<'completed' | 'draft' | 'pending' | 'returned' | 'progress' | null>(null);

  useEffect(() => {
    if (!isHeadmaster) return;
    const featureToCard: Record<string, 'completed' | 'draft' | 'pending' | 'returned' | 'progress' | null> = {
      'result-overview': null,
      'completed-result-records': 'completed',
      'draft-result-records': 'draft',
      'pending-result-work': 'pending',
      'returned-result-corrections': 'returned',
      'result-workflow-progress': 'progress'
    };
    if (!activeFeatureId || !(activeFeatureId in featureToCard)) return;
    setActiveHMCard(featureToCard[activeFeatureId]);
    window.requestAnimationFrame(() => {
      document.getElementById('headmaster-result-print-view')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [activeFeatureId, isHeadmaster]);

  // State for Class Teacher Clickable Cards (Side Panel or Expanded Detail Section)
  const [activeCTCard, setActiveCTCard] = useState<'submitted' | 'draft' | 'pending' | 'returned' | 'progress' | null>(null);

  // State for Subject Teacher's detailed list expansion
  const [showSubjectList, setShowSubjectList] = useState(false);
  const [showClassMarkList, setShowClassMarkList] = useState(false);
  const [showResultBook, setShowResultBook] = useState(false);
  const [expandedCTCards, setExpandedCTCards] = useState<Record<string, boolean>>({});
  const [workflowNotification, setWorkflowNotification] = useState<Record<string, string | null>>({});

  // NEW REACTION STATES & HELPERS FOR SUBJECT MARK LIST WORKFLOW
  const [refreshCounter, setRefreshCounter] = useState(0);
  
  const [activeEditingMarkList, setActiveEditingMarkList] = useState<any>(null);
  const [markListStudents, setMarkListStudents] = useState<any[]>([]);
  const [formativeScores, setFormativeScores] = useState<Record<string, Record<string, string | number>>>({});
  const [summativeScores, setSummativeScores] = useState<Record<string, Record<string, string | number>>>({});
  const [studentRemarks, setStudentRemarks] = useState<Record<string, string>>({});
  const [sheetScores, setSheetScores] = useState<Record<string, Record<string, string | number>>>({});
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    confirmClass?: string;
  } | null>(null);
  const [returnModal, setReturnModal] = useState<{
    isOpen: boolean;
    lockId: string;
    allocation: any;
    cardId: string;
  } | null>(null);
  const [returnRemarks, setReturnRemarks] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // States for Class Teacher and Clerk selectors
  const [selectedCTExam, setSelectedCTExam] = useState<string>('ex_1');
  const [selectedCTTerm, setSelectedCTTerm] = useState<'term_1' | 'term_2'>('term_1');

  const examinations = React.useMemo(() => {
    const list = LocalERPDatabase.getExaminations().filter(e => e.status === 'Active');
    if (list.length > 0) return list;
    return [
      { id: 'ex_1', name: 'Unit Test I', shortName: 'UT-1' },
      { id: 'ex_2', name: 'First Semester Exam', shortName: 'SEM-1' },
      { id: 'ex_3', name: 'Unit Test II', shortName: 'UT-2' },
      { id: 'ex_4', name: 'Annual Examination', shortName: 'ANNUAL' }
    ];
  }, [setup]);

  const getTeacherAllocations = () => {
    return setup?.subjectAllocations?.filter((a: any) => a.teacherId === user.id) || [];
  };

  const getStudentsForClass = (classId: string, division: string) => {
    // Production mobile build: derive roster only from real admission records already present in the client cache.
    // If no real roster has been loaded yet, return an empty list instead of fabricated students.
    try {
      const raw = JSON.parse(localStorage.getItem('nhs_erp_clerk_admissions') || '[]');
      if (!Array.isArray(raw)) return [];
      const norm = (value: unknown) => String(value ?? '').trim().toLowerCase();
      return raw
        .filter((row: any) => {
          const rowClass = row.className ?? row.currentClass ?? row.admissionClassName ?? row.admissionClassId ?? '';
          const rowDivision = row.divisionName ?? row.division ?? row.section ?? '';
          return norm(rowClass) === norm(classId) && norm(rowDivision) === norm(division);
        })
        .map((row: any, index: number) => ({
          id: String(row.id ?? row.studentId ?? row.grNumber ?? `student_${index + 1}`),
          name: String(row.name ?? row.fullName ?? row.studentName ?? '').trim(),
          rollNo: Number(row.rollNo ?? row.rollNumber ?? index + 1),
          grNumber: String(row.grNumber ?? row.grNo ?? row.generalRegisterNumber ?? ''),
        }))
        .filter((row: any) => row.name);
    } catch {
      return [];
    }
  };

  const getSubjectLockStates = () => {
    const _ = refreshCounter;
    let states = LocalERPDatabase.getSubjectLockStates();
    if (states.length === 0) {
      // Initialize states across all possible school allocations so Class Teacher has full visibility
      const allocations = setup?.subjectAllocations || [];
      const initialStates: any[] = [];
      
      allocations.forEach((alloc: any, sIdx: number) => {
        examinations.forEach((exam, eIdx) => {
          const id = `lock_2026-27_${exam.id}_${alloc.className.replace(/\s+/g, '_')}_${alloc.divisionName.replace(/\s+/g, '_')}_${alloc.subjectName.replace(/\s+/g, '_')}`;
          
          let status: 'Draft' | 'Submitted' | 'Approved' | 'Returned' | 'Pending Review' | 'Returned for Correction' | 'Resubmitted' | 'Not Generated' = 'Not Generated';
          
          if (sIdx === 0) {
            if (eIdx === 0) status = 'Not Generated';
            else if (eIdx === 1) status = 'Draft';
            else if (eIdx === 2) status = 'Pending Review';
            else if (eIdx === 3) status = 'Not Generated';
          } else if (sIdx === 1) {
            if (eIdx === 0) status = 'Approved'; // Start Urdu UT-1 as Approved to test Clerk printable queue
            else if (eIdx === 1) status = 'Pending Review';
            else if (eIdx === 2) status = 'Pending Review';
            else if (eIdx === 3) status = 'Not Generated';
          } else if (sIdx === 2) {
            if (eIdx === 0) status = 'Pending Review';
            else if (eIdx === 1) status = 'Pending Review';
            else if (eIdx === 2) status = 'Returned for Correction';
            else if (eIdx === 3) status = 'Pending Review';
          } else {
            status = 'Pending Review';
          }
          
          if (status !== 'Not Generated') {
            initialStates.push({
              id,
              academicYear: '2026-27',
              examId: exam.id,
              classId: alloc.className,
              division: alloc.divisionName,
              subjectId: alloc.subjectName,
              isLocked: (status as any) === 'Pending Review' || (status as any) === 'Submitted' || (status as any) === 'Approved',
              status: status,
              returnReason: status === 'Returned for Correction' ? 'Oral score discrepancies identified. Please verify the roll list.' : undefined
            });
          }
        });
      });
      
      initialStates.forEach(st => LocalERPDatabase.saveSubjectLockState(st));
      states = LocalERPDatabase.getSubjectLockStates();
    }
    return states;
  };



  const isMetadataColumn = (h: any) => {
    if (!h) return false;
    const text = (h.text || '').toLowerCase();
    if (h.columnType === 'rowLabel' || h.id === 'languageRow') return true;
    return text.includes('roll') || 
           text.includes('g.r.') || 
           text.includes('name') || 
           text.includes('sign') || 
           text.includes('remark') || 
           text.includes('signature') ||
           !!h.formula;
  };

  const getHeaderMaxMarks = (header: any) => {
    if (!header) return undefined;
    if (header.maxMarks !== undefined && header.maxMarks !== null && header.maxMarks !== '') {
      return Number(header.maxMarks);
    }
    const maxMarksMatch = header.text ? (header.text.match(/\[Max:\s*(\d+)\]/i) || header.text.match(/Max:\s*(\d+)/i)) : null;
    return maxMarksMatch ? parseInt(maxMarksMatch[1], 10) : undefined;
  };

  const getHeaderBaseName = (header: any) => {
    if (!header) return '';
    if (header.baseName !== undefined) return header.baseName;
    const text = header.text || '';
    const match = text.match(/(.*)\s*\[Max:\s*\d+\]/i) || text.match(/(.*)\s*Max:\s*\d+/i);
    return match ? match[1].trim() : text;
  };

  const getHeaderCategory = (h: any, template: any) => {
    if (!h || !template || !template.headers) return 'None';
    const { formativeTotalIdx, summativeTotalIdx } = getSpecialColumnIndices(template?.headers || []);
    const idx = template.headers.findIndex((x: any) => x.id === h.id);
    if (idx === -1) return 'None';

    if (isMetadataColumn(h)) return 'None';
    if (h.formula) return 'None';

    if (formativeTotalIdx !== -1 && idx < formativeTotalIdx) {
      return 'Formative';
    }
    if (formativeTotalIdx !== -1 && summativeTotalIdx !== -1 && idx > formativeTotalIdx && idx < summativeTotalIdx) {
      return 'Summative';
    }
    return 'None';
  };

  const isFormativeHeader = (h: any, template?: any) => {
    if (!h) return false;
    const activeTemplate = template || activeEditingMarkList?.template || editingTemplate;
    if (activeTemplate && activeTemplate.headers) {
      return getHeaderCategory(h, activeTemplate) === 'Formative';
    }
    const text = (h.text || '').toLowerCase();
    const isMetadata = text.includes('roll') || text.includes('g.r.') || text.includes('name') || text.includes('total') || text.includes('grade') || text.includes('sign') || text.includes('remark') || text.includes('signature');
    if (isMetadata) return false;
    return text.includes('formative') || text.includes('oral') || text.includes('practical') || text.includes('project') || text.includes('listening') || text.includes('speaking') || text.includes('reading') || text.includes('writing') || text.includes('dictation') || text.includes('activity') || text.includes('homework') || text.includes('assignment') || text.includes('notebook');
  };

  const isSummativeHeader = (h: any, template?: any) => {
    if (!h) return false;
    const activeTemplate = template || activeEditingMarkList?.template || editingTemplate;
    if (activeTemplate && activeTemplate.headers) {
      return getHeaderCategory(h, activeTemplate) === 'Summative';
    }
    const text = (h.text || '').toLowerCase();
    const isMetadata = text.includes('roll') || text.includes('g.r.') || text.includes('name') || text.includes('total') || text.includes('grade') || text.includes('sign') || text.includes('remark') || text.includes('signature');
    if (isMetadata) return false;
    return !isFormativeHeader(h, activeTemplate);
  };

  const rebuildTemplateFormulas = (template: any, className?: string) => {
    if (!template || !template.headers) return template;
    
    const templateCopy = JSON.parse(JSON.stringify(template));

    if (template.id === 'tmpl_class_9_10_general' || template.templateCategory === 'Class 9-10 General Subject' || template.templateCategory === 'Class 9-10 Single Subject' ||
        template.id === 'tmpl_class_9_10_math' || template.templateCategory === 'Class 9-10 Mathematics' || template.templateCategory === 'Class 9-10 Dual Paper Subject' ||
        template.id === 'tmpl_class_9_10_lang' || template.templateCategory === 'Class 9-10 Hindi/Marathi' || template.templateCategory === 'Class 9-10 Dual Language') {
      return templateCopy;
    }

    const headers = templateCopy.headers;

    const resolvedClass = className || template.classId || template.className;
    const classWeightage = getClassAssessmentWeightage(resolvedClass);

    const { formativeTotalIdx, summativeTotalIdx, grandTotalIdx } = getSpecialColumnIndices(headers);

    let summedFormativeMax = 0;
    let summedSummativeMax = 0;

    headers.forEach((h: any, idx: number) => {
      if (isMetadataColumn(h) || h.formula) return;
      
      const max = getHeaderMaxMarks(h);
      if (max !== undefined) {
        if (formativeTotalIdx !== -1 && idx < formativeTotalIdx) {
          summedFormativeMax += max;
        } else if (formativeTotalIdx !== -1 && summativeTotalIdx !== -1 && idx > formativeTotalIdx && idx < summativeTotalIdx) {
          summedSummativeMax += max;
        }
      }
    });

    const finalHeaders = headers.map((h: any, idx: number) => {
      if (idx === formativeTotalIdx) {
        const targetIds: string[] = [];
        for (let i = 0; i < idx; i++) {
          const col = headers[i];
          if (!isMetadataColumn(col) && !col.formula) {
            targetIds.push(col.id);
          }
        }
        const baseName = getHeaderBaseName(h) || 'Formative Total';
        const configuredMax = template.id === 'tmpl_class_1_8_language' ? 10 : classWeightage.formativeMax;
        return {
          ...h,
          baseName,
          text: template.id === 'tmpl_class_1_8_language' ? baseName : `${baseName} [Max: ${configuredMax}]`,
          maxMarks: configuredMax,
          formula: `SUM(${targetIds.join(',')})`
        };
      }

      if (idx === summativeTotalIdx) {
        const targetIds: string[] = [];
        const startIdx = formativeTotalIdx !== -1 ? formativeTotalIdx + 1 : 0;
        for (let i = startIdx; i < idx; i++) {
          const col = headers[i];
          if (!isMetadataColumn(col) && !col.formula) {
            targetIds.push(col.id);
          }
        }
        const baseName = getHeaderBaseName(h) || 'Summative Total';
        const configuredMax = template.id === 'tmpl_class_1_8_language' ? 40 : classWeightage.summativeMax;
        return {
          ...h,
          baseName,
          text: template.id === 'tmpl_class_1_8_language' ? baseName : `${baseName} [Max: ${configuredMax}]`,
          maxMarks: configuredMax,
          formula: `SUM(${targetIds.join(',')})`
        };
      }

      if (idx === grandTotalIdx) {
        const fCol = formativeTotalIdx !== -1 ? headers[formativeTotalIdx] : null;
        const sCol = summativeTotalIdx !== -1 ? headers[summativeTotalIdx] : null;
        const targetIds: string[] = [];
        
        if (fCol) {
          targetIds.push(fCol.id);
        }
        if (sCol) {
          targetIds.push(sCol.id);
        }

        const baseName = getHeaderBaseName(h) || 'Grand Total';
        const configuredMax = template.id === 'tmpl_class_1_8_language' ? 50 : classWeightage.totalMax;

        return {
          ...h,
          baseName,
          text: template.id === 'tmpl_class_1_8_language' ? baseName : `${baseName} [Max: ${configuredMax}]`,
          maxMarks: configuredMax,
          formula: `SUM(${targetIds.join(',')})`
        };
      }

      if (template.id === 'tmpl_class_1_8_regular' || (!isMetadataColumn(h) && !h.formula)) {
        const base = getHeaderBaseName(h) || h.baseName || h.text;
        const lowerBase = String(base).toLowerCase();
        
        if (lowerBase.includes('written exam')) {
          const max = classWeightage.summativeMax;
          return {
            ...h,
            baseName: base,
            maxMarks: max,
            text: `${base} [Max: ${max}]`
          };
        }
        if (lowerBase.includes('oral') || lowerBase.includes('viva')) {
          const max = Math.round(classWeightage.formativeMax / 2);
          return {
            ...h,
            baseName: base,
            maxMarks: max,
            text: `${base} [Max: ${max}]`
          };
        }
        if (lowerBase.includes('practical') || lowerBase.includes('project')) {
          const max = classWeightage.formativeMax - Math.round(classWeightage.formativeMax / 2);
          return {
            ...h,
            baseName: base,
            maxMarks: max,
            text: `${base} [Max: ${max}]`
          };
        }
      }

      if (h.formula && h.formula.trim().toUpperCase().startsWith('GRADE(')) {
        const gCol = grandTotalIdx !== -1 ? headers[grandTotalIdx] : null;
        if (gCol) {
          return {
            ...h,
            formula: `GRADE(${gCol.id})`
          };
        }
      }

      return h;
    });

    templateCopy.headers = finalHeaders;
    return templateCopy;
  };

  const ensureAcademicHeads = (template: any) => {
    if (!template) return template;

    const formativeHeads: any[] = [];
    const summativeHeads: any[] = [];

    if (template.headers) {
      (template?.headers || []).forEach((h: any) => {
        if (!isMetadataColumn(h)) {
          const maxMarks = getHeaderMaxMarks(h);
          
          if (isFormativeHeader(h, template)) {
            formativeHeads.push({
              displayName: h.text,
              maxMarks,
              weightage: maxMarks,
              displayOrder: formativeHeads.length + 1,
              isEnabled: true,
              isMandatory: true
            });
          } else if (isSummativeHeader(h, template)) {
            summativeHeads.push({
              displayName: h.text,
              maxMarks,
              weightage: maxMarks,
              displayOrder: summativeHeads.length + 1,
              isEnabled: true,
              isMandatory: true
            });
          }
        }
      });
    }

    // Ensure they are not empty
    if (formativeHeads.length === 0) {
      formativeHeads.push({ displayName: 'Formative Assessment', maxMarks: 40, weightage: 40, displayOrder: 1, isEnabled: true, isMandatory: true });
    }
    if (summativeHeads.length === 0) {
      summativeHeads.push({ displayName: 'Summative Assessment', maxMarks: 60, weightage: 60, displayOrder: 1, isEnabled: true, isMandatory: true });
    }

    return {
      ...template,
      defaultFormativeHeads: formativeHeads,
      defaultSummativeHeads: summativeHeads
    };
  };

  const getTemplateForAllocation = (alloc: any) => {
    const savedTemplates = localStorage.getItem('erp_master_templates');
    let templates: any[] = [];
    if (savedTemplates) {
      try {
        templates = JSON.parse(savedTemplates);
      } catch (e) {
        console.error("Error parsing saved master templates:", e);
      }
    }
    if (!templates || templates.length === 0) {
      templates = defaultTemplatesList;
    } else {
      defaultTemplatesList.forEach((defTmpl) => {
        if (!templates.some((t: any) => t.id === defTmpl.id)) {
          templates.push(defTmpl);
        }
      });
    }
    
    const isClass1to8 = (className: string): boolean => {
      if (!className) return false;
      const normalized = className.trim().toUpperCase();
      
      // Check Roman numerals first
      if (normalized.includes('CLASS I') || normalized.includes('CLASS II') || normalized.includes('CLASS III') || 
          normalized.includes('CLASS IV') || normalized.includes('CLASS V') || normalized.includes('CLASS VI') || 
          normalized.includes('CLASS VII') || normalized.includes('CLASS VIII')) {
        // Exclude Class IX, X, XI, XII
        if (normalized.includes('CLASS IX') || normalized.includes('CLASS X') || normalized.includes('CLASS XI') || normalized.includes('CLASS XII')) {
          return false;
        }
        return true;
      }
      if (normalized === 'I' || normalized === 'II' || normalized === 'III' || normalized === 'IV' || normalized === 'V' || normalized === 'VI' || normalized === 'VII' || normalized === 'VIII') {
        return true;
      }

      const numMatch = className.match(/\d+/);
      if (numMatch) {
        const num = parseInt(numMatch[0], 10);
        return num >= 1 && num <= 8;
      }
      return false;
    };

    const isCombinedLanguageSubject = (subjectName: string): boolean => {
      if (!subjectName) return false;
      const name = subjectName.trim().toLowerCase();
      // Any subject that is Hindi or Marathi (such as composite, second language, or combined Hindi/Marathi)
      // for Class 1-8 uses the official Language Template (tmpl_class_1_8_language)
      return name.includes('hindi') || name.includes('marathi');
    };

    // Check Class 9 & 10 Dual Language Template allocation
    if (alloc && (isClass9or10DualLangSubject(alloc) || isClass9or10LangSubject(alloc))) {
      const langTmpl = templates.find((t: any) => t.id === 'tmpl_class_9_10_lang' || t.templateCategory === 'Class 9-10 Dual Language') || 
                       defaultTemplatesList.find((t: any) => t.id === 'tmpl_class_9_10_lang');
      if (langTmpl) {
        return rebuildTemplateFormulas(ensureAcademicHeads(langTmpl), alloc?.className);
      }
    }

    // Check Class 9 & 10 Dual Paper Subject Template allocation
    if (alloc && (isClass9or10DualPaperSubject(alloc) || isClass9or10MathSubject(alloc))) {
      const mathTmpl = templates.find((t: any) => t.id === 'tmpl_class_9_10_math' || t.templateCategory === 'Class 9-10 Dual Paper Subject') || 
                       defaultTemplatesList.find((t: any) => t.id === 'tmpl_class_9_10_math');
      if (mathTmpl) {
        const tmplCopy = JSON.parse(JSON.stringify(mathTmpl));
        const subj = alloc?.subjectName || alloc?.subjectId || alloc?.subject || '';
        const { paper1, paper2 } = getDualPaperNames(subj);
        if (tmplCopy.headers) {
          tmplCopy.headers = (tmplCopy.headers || []).map((h: any) => {
            if (h.id === 'h4' || h.id === 'h9') {
              return { ...h, text: paper1, baseName: paper1 };
            }
            if (h.id === 'h5' || h.id === 'h10') {
              return { ...h, text: paper2, baseName: paper2 };
            }
            return h;
          });
        }
        return rebuildTemplateFormulas(ensureAcademicHeads(tmplCopy), alloc?.className);
      }
    }

    // Check Class 9 & 10 Single Subject Template allocation
    if (alloc && (isClass9or10SingleSubject(alloc) || isClass9or10GeneralSubject(alloc))) {
      const genTmpl = templates.find((t: any) => t.id === 'tmpl_class_9_10_general' || t.templateCategory === 'Class 9-10 Single Subject') || 
                      defaultTemplatesList.find((t: any) => t.id === 'tmpl_class_9_10_general');
      if (genTmpl) {
        return rebuildTemplateFormulas(ensureAcademicHeads(genTmpl), alloc?.className);
      }
    }

    // Determine if we should use the Language Template (tmpl_class_1_8_language)
    let useLanguageTemplate = false;
    if (alloc) {
      const clsName = alloc.className || alloc.classId || alloc.class_name || '';
      const subjName = alloc.subjectName || alloc.subjectId || alloc.subject || '';
      const isClassRangeMatch = isClass1to8(clsName);

      if (isClassRangeMatch) {
        // Preferred matching logic:
        // 1. Subject ID / Subject Code matches or includes 'hindi_marathi'
        // 2. Assigned template type
        // 3. Combined Language Subject Flag
        // 4. Exact normalized subject name
        if (alloc.templateId === 'tmpl_class_1_8_language' || alloc.assignedTemplate === 'tmpl_class_1_8_language') {
          useLanguageTemplate = true;
        } else if (alloc.subjectId && (alloc.subjectId.toLowerCase().includes('hindi_marathi') || alloc.subjectId.toLowerCase().includes('marathi_hindi') || isCombinedLanguageSubject(alloc.subjectId))) {
          useLanguageTemplate = true;
        } else if (alloc.isCombinedLanguage) {
          useLanguageTemplate = true;
        } else if (isCombinedLanguageSubject(subjName)) {
          useLanguageTemplate = true;
        }
      }
    }

    let baseTemplate;
    if (useLanguageTemplate) {
      baseTemplate = templates.find((t: any) => t.id === 'tmpl_class_1_8_language') || 
                     defaultTemplatesList.find((t: any) => t.id === 'tmpl_class_1_8_language') || 
                     templates[1] || 
                     defaultTemplatesList[1];
    } else {
      baseTemplate = templates.find((t: any) => t.id === 'tmpl_class_1_8_regular') || 
                     defaultTemplatesList.find((t: any) => t.id === 'tmpl_class_1_8_regular') || 
                     templates[0] || 
                     defaultTemplatesList[0];
    }

    return rebuildTemplateFormulas(ensureAcademicHeads(baseTemplate), alloc?.className);
  };

  const getCustomizedTemplateForTeacher = (baseTemplate: any, alloc: any, exam: any) => {
    const templateCopy = JSON.parse(JSON.stringify(baseTemplate));
    
    const setup = LocalERPDatabase.getAcademicSetup();
    const ctAssignments = setup?.classTeacherAssignments || [];
    const ctMatch = ctAssignments.find((a: any) => a.className === alloc?.className && a.divisionName === alloc?.divisionName);
    const ctName = ctMatch ? ctMatch.teacherName : 'Assigned Class Teacher';
    const stName = alloc?.teacherName || user?.name || 'Subject Teacher';
    const acadYear = alloc?.academicYear || '2026-27';

    // Apply subject-specific title only (to Row 2 and Row 3 sections)
    if (templateCopy.sections && templateCopy.sections.length >= 3) {
      if (templateCopy.id === 'tmpl_class_9_10_general' || templateCopy.templateCategory === 'Class 9-10 General Subject' || templateCopy.templateCategory === 'Class 9-10 Single Subject' ||
          templateCopy.id === 'tmpl_class_9_10_math' || templateCopy.templateCategory === 'Class 9-10 Mathematics' || templateCopy.templateCategory === 'Class 9-10 Dual Paper Subject' ||
          templateCopy.id === 'tmpl_class_9_10_lang' || templateCopy.templateCategory === 'Class 9-10 Hindi/Marathi' || templateCopy.templateCategory === 'Class 9-10 Dual Language') {
        templateCopy.sections[0].text = 'NATIONAL HIGH SCHOOL, TALODA';
        templateCopy.sections[1].text = `MASTER MARK LIST - ${alloc?.className?.toUpperCase() || ''} (${alloc?.subjectName?.toUpperCase() || ''})`;
        templateCopy.sections[2].text = `Annual Record: ${acadYear} | Class Teacher: ${ctName} | Subject Teacher: ${stName}`;
      } else {
        templateCopy.sections[1].text = `OFFICIAL SUBJECT GRADE SHEET - ${alloc?.subjectName?.toUpperCase() || ''} (${exam?.name?.toUpperCase() || ''})`;
        templateCopy.sections[2].text = `Class Division: ${alloc?.className} - ${alloc?.divisionName} | Academic Year: ${acadYear} | Teacher Signature Register`;
      }
    }

    // Apply dynamic paper headings for Dual Paper Subject Template
    if (templateCopy.id === 'tmpl_class_9_10_math' || templateCopy.templateCategory === 'Class 9-10 Dual Paper Subject' || templateCopy.templateCategory === 'Class 9-10 Mathematics') {
      const subj = alloc?.subjectName || alloc?.subjectId || alloc?.subject || '';
      const { paper1, paper2 } = getDualPaperNames(subj);
      if (templateCopy.headers) {
        templateCopy.headers = (templateCopy.headers || []).map((h: any) => {
          if (h.id === 'h4' || h.id === 'h9') {
            return { ...h, text: paper1, baseName: paper1 };
          }
          if (h.id === 'h5' || h.id === 'h10') {
            return { ...h, text: paper2, baseName: paper2 };
          }
          return h;
        });
      }
    }
    
    return templateCopy;
  };

  const evaluateFormula = (formula: string, studentId: string, scores: Record<string, string | number>, customTemplate?: any, isTotalRow: boolean = false) => {
    if (!formula) return '';
    const cleanFormula = formula.trim().toUpperCase();
    
    // Determine active headers from the passed template or fallback
    const activeTemplate = customTemplate || activeEditingMarkList?.template || editingTemplate;
    if (!activeTemplate || !activeTemplate.headers) return '';

    const headers = activeTemplate.headers;

    let res: any = '';

    if (cleanFormula.startsWith('SUM(')) {
      const match = formula.match(/SUM\((.*)\)/i);
      if (match) {
        const inner = match[1].trim();
        // If it lists specific column IDs, sum them directly!
        if (inner && inner.includes('h')) {
          const colIds = inner.split(',').map((s: string) => s.trim()).filter(Boolean);
          let sum = 0;
          let hasValue = false;
          colIds.forEach(id => {
            const valStr = scores[id];
            if (valStr !== undefined && valStr !== '') {
              if (['AB', 'A', 'ML', 'EX', 'WH', 'NA'].includes(String(valStr).toUpperCase())) {
                hasValue = true;
              } else {
                const val = parseFloat(valStr as string);
                if (!isNaN(val)) {
                  sum += val;
                  hasValue = true;
                }
              }
            }
          });
          res = hasValue ? sum : '';
        }
      }

      if (res === '') {
        // Fallback if no specific column IDs are listed:
        // Find which headers we should sum
        let targetHeaders = headers.filter((h: any) => !h.formula && !isMetadataColumn(h));

        // Check if this sum is specific to formative or summative
        const currentHeader = headers.find((h: any) => h.formula === formula);
        const headerText = currentHeader ? currentHeader.text.toLowerCase() : '';
        
        if (headerText.includes('formative')) {
          targetHeaders = targetHeaders.filter((h: any) => isFormativeHeader(h, activeTemplate));
        } else if (headerText.includes('summative')) {
          targetHeaders = targetHeaders.filter((h: any) => isSummativeHeader(h, activeTemplate));
        }

        let sum = 0;
        let hasValue = false;
        targetHeaders.forEach((h: any) => {
          const valStr = scores[h.id];
          if (valStr !== undefined && valStr !== '') {
            if (['AB', 'A', 'ML', 'EX', 'WH', 'NA'].includes(String(valStr).toUpperCase())) {
              hasValue = true;
            } else {
              const val = parseFloat(valStr as string);
              if (!isNaN(val)) {
                sum += val;
                hasValue = true;
              }
            }
          }
        });
        res = hasValue ? sum : '';
      }
    } else if (cleanFormula.startsWith('AVERAGE') || cleanFormula.startsWith('AVG')) {
      const match = formula.match(/(?:AVERAGE_ROUND|AVERAGE|AVG)\((.*)\)/i);
      if (match) {
        const inner = match[1].trim();
        if (inner) {
          const colIds = inner.split(',').map((s: string) => s.trim()).filter(Boolean);
          if (colIds.length === 1) {
            const refVal = scores[colIds[0]];
            if (refVal !== undefined && refVal !== '') {
              const val = parseFloat(refVal as string);
              if (!isNaN(val)) {
                res = Math.round(val / 2);
              }
            }
          } else if (colIds.length > 1) {
            let sum = 0;
            let count = 0;
            colIds.forEach(id => {
              const valStr = scores[id];
              if (valStr !== undefined && valStr !== '') {
                const val = parseFloat(valStr as string);
                if (!isNaN(val)) {
                  sum += val;
                  count++;
                }
              }
            });
            if (count > 0) {
              res = Math.round(sum / count);
            }
          }
        }
      }
    } else if (cleanFormula.startsWith('GRADE(')) {
      const match = formula.match(/GRADE\((.*)\)/i);
      if (match) {
        const refId = match[1].trim();
        const refVal = scores[refId];
        if (refVal !== undefined && refVal !== '') {
          const score = parseFloat(refVal as string);
          if (!isNaN(score)) {
            let maxVal = 100;
            const refHeader = headers.find((h: any) => h.id === refId);
            if (refHeader) {
              maxVal = getHeaderMaxMarks(refHeader);
            } else {
              // fallback
              let calculatedMax = 0;
              headers.forEach((h: any) => {
                if (!h.formula && !isMetadataColumn(h)) {
                  calculatedMax += getHeaderMaxMarks(h);
                }
              });
              maxVal = calculatedMax > 0 ? calculatedMax : 100;
            }
            if (isTotalRow) maxVal *= 2;
            res = calculateGrade(score, maxVal);
          }
        }
      }

      if (res === '') {
        // Fallback for generic GRADE() with no parameter
        const totalHeader = headers.find((h: any) => h.formula && h.formula.trim().toUpperCase().startsWith('SUM('));
        if (totalHeader) {
          const totalVal = scores[totalHeader.id];
          if (totalVal !== undefined && totalVal !== '') {
            const score = parseFloat(totalVal as string);
            if (!isNaN(score)) {
              // Get dynamic total max marks
              let maxVal = 0;
              headers.forEach((h: any) => {
                if (!h.formula && !isMetadataColumn(h)) {
                  maxVal += getHeaderMaxMarks(h);
                }
              });
              if (maxVal <= 0) maxVal = 100;
              if (isTotalRow) maxVal *= 2;

              res = calculateGrade(score, maxVal);
            }
          }
        }
      }
    }

    return res;
  };

  const handleGenerateMarkList = (alloc: any, exam: any) => {
    const isAssigned = getTeacherAllocations().some(
      (a: any) => a.className === alloc.className && 
                  a.divisionName === alloc.divisionName && 
                  a.subjectName === alloc.subjectName
    );
    if (!isAssigned) {
      alert("Error: You are not assigned to this class and subject.");
      return;
    }
    
    const lockId = `lock_2026-27_${exam.id}_${alloc.className.replace(/\s+/g, '_')}_${alloc.divisionName.replace(/\s+/g, '_')}_${alloc.subjectName.replace(/\s+/g, '_')}`;
    
    const existingStates = LocalERPDatabase.getSubjectLockStates();
    if (existingStates.some(s => s.id === lockId)) {
      alert("Error: Mark list already generated for this combination.");
      return;
    }
    
    const template = getTemplateForAllocation(alloc);
    
    const newLock: SubjectLockState = {
      id: lockId,
      academicYear: '2026-27',
      examId: exam.id,
      classId: alloc.className,
      division: alloc.divisionName,
      subjectId: alloc.subjectName,
      isLocked: false,
      status: 'Draft'
    };
    LocalERPDatabase.saveSubjectLockState(newLock);
    
    const students = getStudentsForClass(alloc.className, alloc.divisionName);
    const entries: StudentMarkEntry[] = students.map(student => {
      const formativeMarks: Record<string, number | string> = {};
      const summativeMarks: Record<string, number | string> = {};
      const marks: Record<string, number | string> = {};
      
      (template?.headers || []).forEach((h: any) => {
        marks[h.id] = '';
      });
      
      template.defaultFormativeHeads.forEach((h: any, idx: number) => {
        formativeMarks[`f_${idx}`] = '';
        formativeMarks[h.id || `f_${idx}`] = '';
      });
      template.defaultSummativeHeads.forEach((h: any, idx: number) => {
        summativeMarks[`s_${idx}`] = '';
        summativeMarks[h.id || `s_${idx}`] = '';
      });
      
      return {
        id: `mark_2026-27_${exam.id}_${alloc.className.replace(/\s+/g, '_')}_${alloc.divisionName.replace(/\s+/g, '_')}_${alloc.subjectName.replace(/\s+/g, '_')}_${student.id}`,
        academicYear: '2026-27',
        examId: exam.id,
        classId: alloc.className,
        division: alloc.divisionName,
        subjectId: alloc.subjectName,
        studentId: student.id,
        studentName: student.name,
        rollNumber: String(student.rollNo),
        grNumber: student.grNumber,
        marks,
        formativeMarks,
        summativeMarks,
        formativeTotal: 0,
        summativeTotal: 0,
        subjectTotal: 0,
        remarks: '',
        status: 'Draft',
        lastSavedAt: new Date().toISOString(),
        updatedBy: user.name
      };
    });
    
    LocalERPDatabase.saveStudentMarkEntries(entries);
    
    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role,
      "Generate Mark List",
      "Result Management",
      `Generated master mark list copy for Class: ${alloc.className} Div: ${alloc.divisionName} Subject: ${alloc.subjectName} Exam: ${exam.name}`
    );
    
    setRefreshCounter(prev => prev + 1);
  };

  const handleConfirmReturn = () => {
    if (!returnModal) return;
    const { lockId, allocation, cardId } = returnModal;
    
    // Fetch existing entries to save as snapshot
    const currentEntries = LocalERPDatabase.getStudentMarkEntries().filter(
      e => e.examId === (allocation.examId || selectedCTExam) && 
           e.classId === allocation.className && 
           e.division === allocation.divisionName && 
           e.subjectId === allocation.subjectName
    );

    let lockState = LocalERPDatabase.getSubjectLockStates().find(s => s.id === lockId);
    
    const history = lockState?.history || [];
    history.push({
      version: history.length + 1,
      status: 'Returned for Correction',
      by: user.name,
      at: new Date().toISOString(),
      remarks: returnRemarks || "Returned for Correction",
      marksSnapshot: JSON.parse(JSON.stringify(currentEntries))
    });

    const updatedState: SubjectLockState = {
      ...(lockState || {
        id: lockId,
        academicYear: '2026-27',
        examId: allocation.examId || selectedCTExam,
        classId: allocation.className,
        division: allocation.divisionName,
        subjectId: allocation.subjectName,
      }),
      isLocked: false,
      status: 'Returned for Correction',
      returnReason: returnRemarks || "Returned for Correction",
      returnedBy: user.name,
      returnedAt: new Date().toISOString(),
      history
    };

    LocalERPDatabase.saveSubjectLockState(updatedState);

    // Generate immediate system notification for respective Subject Teacher
    let subjectTeacherId = allocation.teacherId;
    if (!subjectTeacherId) {
      const allAllocs = LocalERPDatabase.getAcademicSetup()?.subjectAllocations || [];
      const matchAlloc = allAllocs.find((sa: any) => 
        sa.className === allocation.className && 
        sa.divisionName === allocation.divisionName && 
        sa.subjectName === allocation.subjectName
      );
      subjectTeacherId = matchAlloc?.teacherId;
    }

    if (subjectTeacherId) {
      const examName = examinations.find(e => e.id === (allocation.examId || selectedCTExam))?.name || (allocation.examId || selectedCTExam);
      const returnTime = new Date().toLocaleString();
      
      const notification: SystemNotification = {
        id: `return_notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        recipientId: subjectTeacherId,
        title: "🔴 Subject Mark List Returned for Correction",
        content: `Subject: ${allocation.subjectName}\nClass: ${allocation.className}-${allocation.divisionName}\nExam: ${examName}\nReturned By: ${user.name}\nReturn Date & Time: ${returnTime}\nReason: ${returnRemarks || "Returned for Correction"}`,
        date: new Date().toISOString().replace('T', ' ').substring(0, 16),
        isRead: false,
        type: 'returned_mark_list',
        metadata: {
          subjectName: allocation.subjectName,
          className: allocation.className,
          divisionName: allocation.divisionName,
          examName: examName,
          returnedBy: user.name,
          reason: returnRemarks || "Returned for Correction",
          lockId: lockId
        }
      };
      LocalERPDatabase.saveNotification(notification);
      // Dispatch a custom event so other components refresh their notifications state
      window.dispatchEvent(new Event('refresh_notifications'));
    }
    
    setWorkflowNotification(prev => ({
      ...prev,
      [cardId]: isUrdu 
        ? "نمبرات کی لسٹ کامیابی کے ساتھ واپس کر دی گئی ہے۔" 
        : "Subject mark list returned successfully."
    }));
    
    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role,
      "Return Mark List for Correction",
      "Result Management",
      `Returned Class: ${allocation.className} Div: ${allocation.divisionName} Subject: ${allocation.subjectName} for correction. Remarks: ${returnRemarks}`
    );
    
    setReturnModal(null);
    setRefreshCounter(prev => prev + 1);
    
    setTimeout(() => {
      setWorkflowNotification(prev => ({
        ...prev,
        [cardId]: null
      }));
    }, 4000);
  };

  const handleSendToResultBook = (lockId: string, allocation: any, cardId: string) => {
    const existingLock = LocalERPDatabase.getSubjectLockStates().find(s => s.id === lockId);
    const isAlreadyApproved = existingLock?.status === 'Approved';

    if (isAlreadyApproved) {
      setConfirmModal({
        isOpen: true,
        title: isUrdu ? "کیا آپ منظور شدہ نمبرات کو تبدیل کرنا چاہتے ہیں؟" : "Overwrite Approved Marks?",
        message: isUrdu 
          ? "اس مضمون کے منظور شدہ نمبرات پہلے ہی رزلٹ بک میں موجود ہیں۔ کیا آپ موجودہ نمبرات سے تبدیل کرنا چاہتے ہیں؟" 
          : "Approved marks for this subject already exist in the Class Result Book. Do you want to replace the existing marks with the current submission?",
        confirmText: isUrdu ? "تبدیل کریں" : "Confirm Replacement",
        confirmClass: "bg-emerald-600 hover:bg-emerald-500",
        onConfirm: () => performApproval(lockId, allocation, cardId, true)
      });
    } else {
      setConfirmModal({
        isOpen: true,
        title: isUrdu ? "مضمون کی مارک لسٹ منظور کریں؟" : "Approve Subject Mark List?",
        message: isUrdu 
          ? "اس مضمون کی مارک لسٹ کو مستقل طور پر لاک کر کے رزلٹ بک میں منتقل کر دیا جائے گا۔" 
          : "This subject mark list will be locked and transferred to the Class Result Book.",
        confirmText: isUrdu ? "منظور کریں اور بھیجیں" : "Approve & Send",
        confirmClass: "bg-emerald-600 hover:bg-emerald-500",
        onConfirm: () => performApproval(lockId, allocation, cardId, false)
      });
    }
  };

  const handleSoftDeleteClassMarkList = (lockId: string, allocation: any) => {
    const existingLock = LocalERPDatabase.getSubjectLockStates().find(s => s.id === lockId);
    if (existingLock?.status === 'Approved') {
      alert(isUrdu ? "یہ مارک لسٹ پہلے ہی منظور ہو چکی ہے اور اسے حذف نہیں کیا جا سکتا۔" : "This Mark List has already been approved and sent to the Result Book. It cannot be deleted.");
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: isUrdu ? "مارک لسٹ حذف کریں؟" : "Delete Mark List?",
      message: isUrdu 
        ? "کیا آپ واقعی اس مضمون کی مارک لسٹ حذف کرنا چاہتے ہیں؟ مضمون کے تمام نمبرات حذف ہو جائیں گے۔" 
        : "Are you sure you want to delete this subject mark list? All student marks for this list will be cleared.",
      confirmText: isUrdu ? "حذف کریں" : "Delete",
      confirmClass: "bg-rose-600 hover:bg-rose-500",
      onConfirm: () => {
        // Soft Delete: set status to Deleted, delete student marks, update states
        LocalERPDatabase.saveSubjectLockState({
          id: lockId,
          academicYear: '2026-27',
          examId: allocation.examId,
          classId: allocation.className,
          division: allocation.divisionName,
          subjectId: allocation.subjectName,
          isLocked: false,
          status: 'Deleted'
        });
        
        // Clear student mark entries for this specific class, division, exam, and subject
        const marks = LocalERPDatabase.getStudentMarkEntriesRaw();
        const updatedMarks = marks.filter(m => !(
          m.examId === allocation.examId &&
          m.classId === allocation.className &&
          m.division === allocation.divisionName &&
          m.subjectId === allocation.subjectName
        ));
        LocalERPDatabase.saveStudentMarkEntries(updatedMarks);

        // Audit Log entry
        LocalERPDatabase.addAuditLog(
          user.id || 'ct_01',
          user.name || 'School Clerk',
          user.role,
          'SOFT_DELETE_CLASS_MARK_LIST',
          'Class Mark List',
          `Soft deleted mark list for ${allocation.className} ${allocation.divisionName} - ${allocation.subjectName} (${allocation.examId})`
        );

        setConfirmModal({ isOpen: false, title: '', message: '', confirmText: '', confirmClass: '', onConfirm: () => {} });
        setRefreshCounter(prev => prev + 1);
      }
    });
  };

  const handleBulkSendToResultBook = () => {
    const lockStates = LocalERPDatabase.getSubjectLockStates();
    const ctActiveExams = (selectedCTTerm === 'term_1' ? ['ex_1', 'ex_2'] : ['ex_3', 'ex_4'])
      .filter(id => examinations.some(e => e.id === id));
    const itemsToApprove: any[] = [];
    
    ctClassAllocations.forEach((alloc: any) => {
      ctActiveExams.forEach((examId) => {
        const lockId = `lock_2026-27_${examId}_${alloc.className.replace(/\s+/g, '_')}_${alloc.divisionName.replace(/\s+/g, '_')}_${alloc.subjectName.replace(/\s+/g, '_')}`;
        const state = lockStates.find(s => s.id === lockId);
        const status = state ? state.status : 'Not Generated';
        if (status === 'Pending Review' || status === 'Submitted' || status === 'Resubmitted') {
          itemsToApprove.push({ lockId, allocation: { ...alloc, examId } });
        }
      });
    });

    if (itemsToApprove.length === 0) {
      alert(isUrdu ? "منظوری کے لیے کوئی بھی مارک لسٹ زیرِ التوا نہیں ہے۔" : "No pending mark lists to send to the Result Book for this term.");
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: isUrdu ? "مکمل ٹرم رزلٹ بک پر بھیجیں؟" : `Send Complete ${selectedCTTerm === 'term_1' ? 'First' : 'Second'} Term to Result Book?`,
      message: isUrdu 
        ? `کیا آپ اس ٹرم کے تمام ${itemsToApprove.length} مضامین کے نمبرات کو منظور کر کے رزلٹ بک میں بھیجنا چاہتے ہیں؟`
        : `This will approve and transfer all ${itemsToApprove.length} pending subject mark lists for this term directly into the Class Result Book.`,
      confirmText: isUrdu ? "تمام بھیجیں" : "Approve & Send All",
      confirmClass: "bg-indigo-600 hover:bg-indigo-500",
      onConfirm: () => {
        itemsToApprove.forEach((item) => {
          const cardId = item.lockId;
          performApproval(item.lockId, item.allocation, cardId, false);
        });
        alert(isUrdu ? "تمام مضامین کامیابی کے ساتھ رزلٹ بک میں بھیجے گئے۔" : `Successfully sent all ${itemsToApprove.length} subjects to the Result Book.`);
        setRefreshCounter(prev => prev + 1);
      }
    });
  };

  const performApproval = (lockId: string, allocation: any, cardId: string, isReplacing: boolean) => {
    let lockState = LocalERPDatabase.getSubjectLockStates().find(s => s.id === lockId);
    
    const now = new Date();
    const approvalDate = now.toLocaleDateString();
    const approvalTime = now.toLocaleTimeString();
    const sourceTeacher = allocation.teacherName || "Assigned Teacher";
    const history = lockState?.history || [];
    const newVersion = history.length + 1;
    
    history.push({
      version: newVersion,
      status: 'Approved',
      by: user.name,
      at: now.toISOString(),
      remarks: isReplacing ? "Approved and replaced in Class Result Book" : "Approved and sent to Class Result Book",
      approvedBy: user.name,
      approvalDate,
      approvalTime,
      sourceTeacher,
    });

    const updatedState: SubjectLockState = {
      ...(lockState || {
        id: lockId,
        academicYear: '2026-27',
        examId: allocation.examId || selectedCTExam,
        classId: allocation.className,
        division: allocation.divisionName,
        subjectId: allocation.subjectName,
      }),
      isLocked: true,
      status: 'Approved',
      approvedBy: user.name,
      approvalDate,
      approvalTime,
      sourceTeacher,
      versionNumber: newVersion,
      lockedAt: now.toLocaleString(),
      lockedBy: user.name,
      history
    };

    LocalERPDatabase.saveSubjectLockState(updatedState);

    const allEntries = LocalERPDatabase.getStudentMarkEntries();
    const submittedEntries = allEntries.filter(
      e => e.examId === (allocation.examId || selectedCTExam) && 
           e.classId === allocation.className && 
           e.division === allocation.divisionName && 
           e.subjectId === allocation.subjectName
    );

    const approvedEntries = submittedEntries.map(entry => {
      const student = getStudentsForClass(allocation.className, allocation.divisionName).find(s => s.id === entry.studentId);
      
      const subMax = allocation.maxMarks || 100;
      const tot = typeof entry.subjectTotal === 'number' ? entry.subjectTotal : 0;
      const pct = (tot / subMax) * 100;
      let calculatedGrade = 'F';
      if (pct >= 90) calculatedGrade = 'A1';
      else if (pct >= 80) calculatedGrade = 'A2';
      else if (pct >= 70) calculatedGrade = 'B1';
      else if (pct >= 60) calculatedGrade = 'B2';
      else if (pct >= 50) calculatedGrade = 'C1';
      else if (pct >= 45) calculatedGrade = 'C2';
      else if (pct >= 35) calculatedGrade = 'D';
      
      return {
        ...entry,
        grNumber: entry.grNumber || student?.grNumber || '',
        status: 'Submitted' as const,
        grade: entry.grade || calculatedGrade,
        lastSavedAt: now.toLocaleTimeString(),
        updatedBy: user.name
      };
    });

    LocalERPDatabase.saveStudentMarkEntries(approvedEntries);

    // Automatically create a Lightweight Reference Document Reference inside nhs_erp_mark_lists_ready_for_print
    try {
      const markListKey = 'nhs_erp_mark_lists_ready_for_print';
      let printableMarkLists: any[] = [];
      const storedPml = localStorage.getItem(markListKey);
      if (storedPml) {
        printableMarkLists = JSON.parse(storedPml);
      }

      const examId = selectedCTExam || allocation.examId;
      const examName = examinations.find(e => e.id === examId)?.name || examId;
      const sentTime = now.toISOString();

      const newPrintableMarkList = {
        id: `pml_2026-27_${examId}_${allocation.className.replace(/\s+/g, '_')}_${allocation.divisionName.replace(/\s+/g, '_')}_${allocation.subjectName.replace(/\s+/g, '_')}`,
        academicYear: '2026-27',
        className: allocation.className,
        divisionName: allocation.divisionName,
        subjectName: allocation.subjectName,
        examId: examId,
        examName: examName,
        teacherName: sourceTeacher,
        approvalDate: approvalDate,
        approvalTime: approvalTime,
        status: 'Approved',
        originalSubjectMarkListId: lockId,
        sentAt: sentTime,
        approvedBy: user.name,
        allocation: allocation,
        isArchived: false
      };

      const existingIndex = printableMarkLists.findIndex(ml => ml.id === newPrintableMarkList.id);
      if (existingIndex !== -1) {
        printableMarkLists[existingIndex] = newPrintableMarkList;
      } else {
        printableMarkLists.push(newPrintableMarkList);
      }
      localStorage.setItem(markListKey, JSON.stringify(printableMarkLists));
    } catch (e) {
      console.error("Error registering approved subject mark list reference:", e);
    }

    // SINGLE SUBJECT IMPORT - Send to Result Book logic (Bypassed for Print Center)
    try {
      if (true) {
        // Print Center registers references only - reports generation bypassed
      } else {
      const storageKey = 'nhs_erp_student_result_books';
      let studentResultBooks: any[] = [];
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        studentResultBooks = JSON.parse(stored);
      }

      // Determine Term based on examId (First Term or Second Term)
      const examId = selectedCTExam || allocation.examId;
      const term: 'Term I' | 'Term II' = (examId === 'ex_1' || examId === 'ex_2' || examId.toLowerCase().includes('term 1') || examId.toLowerCase().includes('term i') || examId.toLowerCase().includes('sem 1') || examId.toLowerCase().includes('semester 1') || examId.toLowerCase().includes('semester i') || examId.toLowerCase().includes('ut 1') || examId.toLowerCase().includes('ut-1'))
        ? 'Term I'
        : 'Term II';

      let importCount = 0;

      approvedEntries.forEach(entry => {
        // Match student's Result Book page using Academic Year, Class, Division, GR Number, Student Name
        const rbIndex = studentResultBooks.findIndex((rb: any) => 
          rb.academicYear === '2026-27' &&
          rb.className === allocation.className &&
          rb.divisionName === allocation.divisionName &&
          String(rb.grNumber) === String(entry.grNumber) &&
          rb.studentName.trim().toLowerCase() === entry.studentName.trim().toLowerCase()
        );

        if (rbIndex !== -1) {
          const rb = studentResultBooks[rbIndex];
          if (rb.sheetData) {
            const sheetData = { ...rb.sheetData };

            // Find header rows in sheetData to dynamically identify Row indices and Subject Row index
            const range = XLSX.utils.decode_range(sheetData['!ref'] || 'A1:K60');
            const maxRow = range.e.r;
            const maxCol = range.e.c;

            // Find header rows (where column 0 value is "SUBJECT / COURSE")
            const headerRows: number[] = [];
            for (let r = 0; r <= maxRow; r++) {
              const cellRef = XLSX.utils.encode_cell({ r, c: 0 });
              const cell = sheetData[cellRef];
              if (cell && String(cell.v).trim().toUpperCase() === "SUBJECT / COURSE") {
                headerRows.push(r);
              }
            }

            if (headerRows.length > 0) {
              const termHeaderRow = term === 'Term I' ? headerRows[0] : (headerRows[1] !== undefined ? headerRows[1] : headerRows[0]);

              // Find subject row in the designated Term table
              let subjectRow = -1;
              const searchStartRow = termHeaderRow + 1;
              for (let r = searchStartRow; r <= maxRow; r++) {
                const cellRef = XLSX.utils.encode_cell({ r, c: 0 });
                const cell = sheetData[cellRef];
                if (!cell || !cell.v) {
                  break;
                }
                const cellVal = String(cell.v).trim();
                if (cellVal.toLowerCase().includes('grand total') || cellVal.toLowerCase().includes('percentage') || cellVal.toLowerCase().includes('grade')) {
                  break;
                }
                if (cellVal.toLowerCase() === allocation.subjectName.trim().toLowerCase()) {
                  subjectRow = r;
                  break;
                }
              }

              if (subjectRow !== -1) {
                // Get the source template
                const template = getTemplateForAllocation(allocation);
                const formativeHeaders = (template?.headers || []).filter(isFormativeHeader);
                const summativeHeaders = (template?.headers || []).filter(isSummativeHeader);

                // Helper for normalizing names
                const normalizeName = (str: string) => {
                  return str
                    .toLowerCase()
                    .replace(/\[[^\]]*\]/g, '')
                    .replace(/[^a-z0-9]/g, '')
                    .trim();
                };

                const isHeaderMatch = (src: string, tgt: string) => {
                  const s = normalizeName(src);
                  const t = normalizeName(tgt);
                  if (!s || !t) return false;
                  return s === t || s.includes(t) || t.includes(s);
                };

                // Loop over source headers in template
                (template?.headers || []).forEach((h: any) => {
                  let val: string | number = '';
                  if (entry.marks && entry.marks[h.id] !== undefined) {
                    val = entry.marks[h.id];
                  } else {
                    const fIdx = formativeHeaders.findIndex((fh: any) => fh.id === h.id);
                    if (fIdx !== -1) {
                      val = entry.formativeMarks?.[h.id] !== undefined 
                        ? entry.formativeMarks[h.id] 
                        : (entry.formativeMarks?.[`f_${fIdx}`] !== undefined ? entry.formativeMarks[`f_${fIdx}`] : '');
                    } else {
                      const sIdx = summativeHeaders.findIndex((sh: any) => sh.id === h.id);
                      if (sIdx !== -1) {
                        val = entry.summativeMarks?.[h.id] !== undefined 
                          ? entry.summativeMarks[h.id] 
                          : (entry.summativeMarks?.[`s_${sIdx}`] !== undefined ? entry.summativeMarks[`s_${sIdx}`] : '');
                      }
                    }
                  }

                  if (h.id && !h.formula && val !== undefined && val !== '') {
                    const srcHeadName = h.baseName || h.text;

                    for (let c = 1; c <= maxCol; c++) {
                      const tgtHeaderCell = sheetData[XLSX.utils.encode_cell({ r: termHeaderRow, c })];
                      if (tgtHeaderCell && tgtHeaderCell.v) {
                        const tgtHeadName = String(tgtHeaderCell.v);
                        const lowerTgt = tgtHeadName.toLowerCase();
                        if (lowerTgt.includes('total') || lowerTgt.includes('percentage') || lowerTgt.includes('grade') || lowerTgt.includes('sign')) {
                          continue;
                        }

                        if (isHeaderMatch(srcHeadName, tgtHeadName)) {
                          const targetCellRef = XLSX.utils.encode_cell({ r: subjectRow, c });
                          const originalCell = sheetData[targetCellRef] || {};

                          const numericVal = Number(val);
                          const isNum = !isNaN(numericVal) && val !== '' && val !== null;

                          sheetData[targetCellRef] = {
                            ...originalCell,
                            t: isNum ? 'n' : 's',
                            v: isNum ? numericVal : val
                          };
                          break;
                        }
                      }
                    }
                  }
                });

                rb.sheetData = sheetData;
                if (rb.status === 'Blank') {
                  rb.status = 'In Progress';
                }

                // Track read-only subjects
                if (!rb.readOnlySubjects) {
                  rb.readOnlySubjects = [];
                }
                if (!rb.readOnlySubjects.includes(allocation.subjectName)) {
                  rb.readOnlySubjects.push(allocation.subjectName);
                }

                importCount++;
              }
            }
          }
        }
      });

      if (importCount > 0) {
        localStorage.setItem(storageKey, JSON.stringify(studentResultBooks));
        console.log(`Successfully auto-filled Result Book marks for ${importCount} students for subject ${allocation.subjectName} (${term})`);
      }
      }
    } catch (e) {
      console.error("Error auto-filling Result Book sheets:", e);
    }

    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role,
      "APPROVE_SUBJECT_MARKS",
      "Result Management",
      `Approved subject mark list for Class ${allocation.className} Div: ${allocation.divisionName} Subject: ${allocation.subjectName}. Locked permanently and synchronized with Class Result Book. Version: ${newVersion}`
    );

    setWorkflowNotification(prev => ({
      ...prev,
      [cardId]: isUrdu 
        ? "نمبرات کامیابی کے ساتھ رزلٹ بک میں بھیج دیے گئے ہیں۔" 
        : "Marks successfully sent to Result Book."
    }));

    setRefreshCounter(prev => prev + 1);

    setTimeout(() => {
      setWorkflowNotification(prev => ({
        ...prev,
        [cardId]: null
      }));
    }, 4000);
  };

  const handleOpenMarkList = (alloc: any, exam: any, isCTReviewing = false) => {
    const lockId = `lock_2026-27_${exam.id}_${alloc.className.replace(/\s+/g, '_')}_${alloc.divisionName.replace(/\s+/g, '_')}_${alloc.subjectName.replace(/\s+/g, '_')}`;
    
    // Auto mark matching returned mark list notification as read
    const allNotifs = LocalERPDatabase.getNotifications();
    const matchingNotif = allNotifs.find(n => 
      n.recipientId === user.id && 
      n.type === 'returned_mark_list' && 
      n.metadata?.lockId === lockId && 
      !n.isRead
    );
    if (matchingNotif) {
      LocalERPDatabase.markNotificationAsRead(matchingNotif.id);
      window.dispatchEvent(new Event('refresh_notifications'));
    }

    let lockState = LocalERPDatabase.getSubjectLockStates().find(s => s.id === lockId);
    if (!lockState) {
      lockState = {
        id: lockId,
        academicYear: '2026-27',
        examId: exam.id,
        classId: alloc.className,
        division: alloc.divisionName,
        subjectId: alloc.subjectName,
        isLocked: false,
        status: 'Draft'
      };
      LocalERPDatabase.saveSubjectLockState(lockState);
    }
    
    const students = getStudentsForClass(alloc.className, alloc.divisionName);
    const allEntries = LocalERPDatabase.getStudentMarkEntries();
    const currentEntries = allEntries.filter(
      e => e.examId === exam.id && 
           e.classId === alloc.className && 
           e.division === alloc.divisionName && 
           e.subjectId === alloc.subjectName
    );
    
    const checkIsClass1to8 = (className: string): boolean => {
      if (!className) return false;
      const normalized = className.trim().toUpperCase();
      
      // Check Roman numerals first
      if (normalized.includes('CLASS I') || normalized.includes('CLASS II') || normalized.includes('CLASS III') || 
          normalized.includes('CLASS IV') || normalized.includes('CLASS V') || normalized.includes('CLASS VI') || 
          normalized.includes('CLASS VII') || normalized.includes('CLASS VIII')) {
        // Exclude Class IX, X, XI, XII
        if (normalized.includes('CLASS IX') || normalized.includes('CLASS X') || normalized.includes('CLASS XI') || normalized.includes('CLASS XII')) {
          return false;
        }
        return true;
      }
      if (normalized === 'I' || normalized === 'II' || normalized === 'III' || normalized === 'IV' || normalized === 'V' || normalized === 'VI' || normalized === 'VII' || normalized === 'VIII') {
        return true;
      }

      const numMatch = className.match(/\d+/);
      if (numMatch) {
        const num = parseInt(numMatch[0], 10);
        return num >= 1 && num <= 8;
      }
      return false;
    };

    const checkIsCombinedLanguage = (subjectName: string): boolean => {
      if (!subjectName) return false;
      const name = subjectName.trim().toLowerCase();
      // Match Hindi or Marathi languages for Class 1-8
      return name.includes('hindi') || name.includes('marathi');
    };

    const assignedTemplate = getTemplateForAllocation(alloc);
    const assignedTemplateId = assignedTemplate.id;

    console.log("=== TEMPLATE RUNTIME RESOLUTION LOG ===");
    console.log("- Selected Subject ID:", alloc.subjectId || alloc.id || alloc.subjectName);
    console.log("- Selected Subject Name:", alloc.subjectName);
    console.log("- Selected Template ID:", assignedTemplateId);
    console.log("- Selected Template Type:", assignedTemplate.templateType || assignedTemplate.name || "Hindi/Marathi Language Template");
    console.log("- Source of Template:", localStorage.getItem('erp_master_templates') ? "Database Cache (localStorage)" : "Newly Generated System Default");
    console.log("========================================");

    const needsLanguageTemplate = assignedTemplateId === 'tmpl_class_1_8_language';
    const isSavedAsRegular = currentEntries.length > 0 && currentEntries.some(e => e.marks && e.marks['h9'] !== undefined && e.marks['h12'] === undefined);
    
    let isOldRegularHindiMarathi = false;
    let masterTemplate = assignedTemplate;

    const isLangSubject = checkIsCombinedLanguage(alloc.subjectName) && checkIsClass1to8(alloc.className);

    if (isLangSubject) {
      const alreadyHasLanguageRows = currentEntries.length > 0 && currentEntries.every(e => e.languageRows !== undefined);
      
      if (!alreadyHasLanguageRows) {
        const hasRealMarks = currentEntries.some(e => {
          if (!e.marks) return false;
          return Object.entries(e.marks).some(([key, val]) => {
            if (['h1', 'h2', 'h3'].includes(key)) return false;
            return val !== undefined && val !== null && val !== '' && val !== '0' && val !== 0;
          });
        });

        if (!hasRealMarks) {
          // CASE A — NO REAL MARKS EXIST (discard empty regular layout, regenerate using tmpl_class_1_8_language)
          const tempTemplate = getCustomizedTemplateForTeacher(assignedTemplate, alloc, exam);
          const regeneratedEntries = students.map(student => {
            return {
              id: `mark_2026-27_${exam.id}_${alloc.className.replace(/\s+/g, '_')}_${alloc.divisionName.replace(/\s+/g, '_')}_${alloc.subjectName.replace(/\s+/g, '_')}_${student.id}`,
              academicYear: '2026-27',
              examId: exam.id,
              classId: alloc.className,
              division: alloc.divisionName,
              subjectId: alloc.subjectName,
              studentId: student.id,
              studentName: student.name,
              rollNumber: String(student.rollNo),
              grNumber: student.grNumber,
              marks: { h4: '', h5: '', h6: '', h7: '', h8: '', h10: '' },
              formativeMarks: {},
              summativeMarks: {},
              formativeTotal: 0,
              summativeTotal: 0,
              subjectTotal: 0,
              remarks: '',
              languageRows: initLanguageRows() as any,
              status: (lockState.status === 'Pending Review' || lockState.status === 'Submitted' || lockState.status === 'Approved' ? 'Submitted' : 'Draft') as any,
              lastSavedAt: new Date().toISOString(),
              updatedBy: user.name
            };
          });
          LocalERPDatabase.saveStudentMarkEntries(regeneratedEntries as any);
          
          currentEntries.length = 0;
          currentEntries.push(...regeneratedEntries);
          masterTemplate = assignedTemplate;
          isOldRegularHindiMarathi = false;
        } else {
          // CASE B — REAL MARKS EXIST (preserve original and show migration banner)
          masterTemplate = defaultTemplatesList.find((t: any) => t.id === 'tmpl_class_1_8_regular') || defaultTemplatesList[0];
          isOldRegularHindiMarathi = true;
        }
      } else {
        masterTemplate = assignedTemplate;
        isOldRegularHindiMarathi = false;
      }
    } else {
      masterTemplate = assignedTemplate;
    }

    // Apply subject-specific titles dynamically
    const template = getCustomizedTemplateForTeacher(masterTemplate, alloc, exam);
    
    let finalEntries = currentEntries;
    if (currentEntries.length === 0) {
      finalEntries = students.map(student => {
        const formativeMarks: Record<string, number | string> = {};
        const summativeMarks: Record<string, number | string> = {};
        const marks: Record<string, number | string> = {};
        
        (template?.headers || []).forEach((h: any) => {
          marks[h.id] = '';
        });
        
        const isHindiMarathi = template.id === 'tmpl_class_1_8_language' || template.templateType === 'Hindi_Marathi';
        
        return {
          id: `mark_2026-27_${exam.id}_${alloc.className.replace(/\s+/g, '_')}_${alloc.divisionName.replace(/\s+/g, '_')}_${alloc.subjectName.replace(/\s+/g, '_')}_${student.id}`,
          academicYear: '2026-27',
          examId: exam.id,
          classId: alloc.className,
          division: alloc.divisionName,
          subjectId: alloc.subjectName,
          studentId: student.id,
          studentName: student.name,
          rollNumber: String(student.rollNo),
          grNumber: student.grNumber,
          marks,
          formativeMarks,
          summativeMarks,
          formativeTotal: 0,
          summativeTotal: 0,
          subjectTotal: 0,
          remarks: '',
          languageRows: isHindiMarathi ? (initLanguageRows() as any) : undefined,
          status: (lockState.status === 'Pending Review' || lockState.status === 'Submitted' || lockState.status === 'Approved' ? 'Submitted' : 'Draft') as any,
          lastSavedAt: new Date().toISOString(),
          updatedBy: user.name
        };
      });
      LocalERPDatabase.saveStudentMarkEntries(finalEntries as any);
    }
    
    const scores: Record<string, Record<string, any>> = {};
    const remarks: Record<string, string> = {};
    const legacyFScores: Record<string, Record<string, string | number>> = {};
    const legacySScores: Record<string, Record<string, string | number>> = {};
    
    finalEntries.forEach(entry => {
      scores[entry.studentId] = {
        ...(entry.marks || {}),
        languageRows: entry.languageRows
      };
      remarks[entry.studentId] = entry.remarks || '';
      legacyFScores[entry.studentId] = entry.formativeMarks || {};
      legacySScores[entry.studentId] = entry.summativeMarks || {};
    });

    setSheetScores(scores);
    setStudentRemarks(remarks);
    setFormativeScores(legacyFScores);
    setSummativeScores(legacySScores);
    setMarkListStudents(students);
    setActiveEditingMarkList({
      classId: alloc.className,
      division: alloc.divisionName,
      subjectId: alloc.subjectId || alloc.id || alloc.subjectName,
      subjectName: alloc.subjectName,
      examId: exam.id,
      examName: exam.name,
      template,
      lockState,
      isOldRegularHindiMarathi,
      readOnly: isCTReviewing,
      alloc,
      exam,
      templateSource: localStorage.getItem('erp_master_templates') ? "Database Cache (localStorage)" : "Newly Generated System Default"
    });
  };

  const handleSaveMarks = (submitAsFinal: boolean) => {
    if (!activeEditingMarkList) return;
    const { classId, division, subjectName, examName, template, lockState, alloc, exam } = activeEditingMarkList;
    const examId = activeEditingMarkList.examId;
    
    const isResubmit = lockState?.status === 'Returned' || lockState?.status === 'Returned for Correction';
    const newStatus = submitAsFinal ? 'Submitted' : 'Draft';
    
    const lockId = `lock_2026-27_${examId}_${classId.replace(/\s+/g, '_')}_${division.replace(/\s+/g, '_')}_${subjectName.replace(/\s+/g, '_')}`;
    const currentLock = LocalERPDatabase.getSubjectLockStates().find(s => s.id === lockId);
    
    const isHindiMarathi = template.id === 'tmpl_class_1_8_language';

    // Validate marks against raw head and total column maximums
    const validationErrors: string[] = [];

    const { formativeTotalIdx, summativeTotalIdx, grandTotalIdx } = getSpecialColumnIndices(template?.headers || []);
    const fHeader = formativeTotalIdx !== -1 ? template.headers[formativeTotalIdx] : null;
    const sHeader = summativeTotalIdx !== -1 ? template.headers[summativeTotalIdx] : null;
    const gHeader = grandTotalIdx !== -1 ? template.headers[grandTotalIdx] : null;

    const fMax = fHeader ? getHeaderMaxMarks(fHeader) : undefined;
    const sMax = sHeader ? getHeaderMaxMarks(sHeader) : undefined;
    const gMax = gHeader ? getHeaderMaxMarks(gHeader) : undefined;

    markListStudents.forEach(student => {
      const studentVals = sheetScores[student.id] || {};
      if (isHindiMarathi) {
        let langRows = studentVals.languageRows || initLanguageRows();
        const evaluated = evaluateCombinedLanguageRows(student.id, langRows.hindi?.marks || {}, langRows.marathi?.marks || {}, template, evaluateFormula);

        // Validate Hindi and Marathi rows
        ['hindi', 'marathi'].forEach((rowKey) => {
          const rowData = evaluated[rowKey];
          const rowName = rowKey === 'hindi' ? 'Hindi' : 'Marathi';
          
          (template?.headers || []).forEach((h: any) => {
            if (!isMetadataColumn(h) && !h.formula) {
              const headMax = h.maxMarks !== undefined && h.maxMarks !== null ? Number(h.maxMarks) : undefined;
              const valStr = rowData?.marks?.[h.id];
              if (valStr !== undefined && valStr !== '' && headMax !== undefined) {
                const num = Number(valStr);
                if (!isNaN(num) && num > headMax) {
                  validationErrors.push(`${student.name} (${rowName}): ${h.baseName || h.text} mark (${num}) exceeds maximum allowed (${headMax}).`);
                }
              }
            }
          });

          if (fMax !== undefined && rowData.formativeTotal !== '') {
            const fVal = Number(rowData.formativeTotal);
            if (!isNaN(fVal) && fVal > fMax) {
              validationErrors.push(`${student.name} (${rowName}): Formative Total (${fVal}) exceeds allowed maximum of ${fMax}.`);
            }
          }
          if (sMax !== undefined && rowData.summativeTotal !== '') {
            const sVal = Number(rowData.summativeTotal);
            if (!isNaN(sVal) && sVal > sMax) {
              validationErrors.push(`${student.name} (${rowName}): Summative Total (${sVal}) exceeds allowed maximum of ${sMax}.`);
            }
          }
          if (gMax !== undefined && rowData.grandTotal !== '') {
            const gVal = Number(rowData.grandTotal);
            if (!isNaN(gVal) && gVal > gMax) {
              validationErrors.push(`${student.name} (${rowName}): Grand Total (${gVal}) exceeds allowed maximum of ${gMax}.`);
            }
          }
        });

        // Validate Combined TOTAL row
        const totalRowData = evaluated.total;
        const totalFMax = fMax !== undefined ? fMax * 2 : 20;
        const totalSMax = sMax !== undefined ? sMax * 2 : 80;
        const totalGMax = gMax !== undefined ? gMax * 2 : 100;

        if (totalRowData.formativeTotal !== '' && Number(totalRowData.formativeTotal) > totalFMax) {
          validationErrors.push(`${student.name} (Combined Total): Formative Total (${totalRowData.formativeTotal}) exceeds allowed maximum of ${totalFMax}.`);
        }
        if (totalRowData.summativeTotal !== '' && Number(totalRowData.summativeTotal) > totalSMax) {
          validationErrors.push(`${student.name} (Combined Total): Summative Total (${totalRowData.summativeTotal}) exceeds allowed maximum of ${totalSMax}.`);
        }
        if (totalRowData.grandTotal !== '' && Number(totalRowData.grandTotal) > totalGMax) {
          validationErrors.push(`${student.name} (Combined Total): Grand Total (${totalRowData.grandTotal}) exceeds allowed maximum of ${totalGMax}.`);
        }
      } else {
        // Regular Subject
        (template?.headers || []).forEach((h: any) => {
          if (!isMetadataColumn(h) && !h.formula) {
            const headMax = h.maxMarks !== undefined && h.maxMarks !== null ? Number(h.maxMarks) : undefined;
            const valStr = studentVals[h.id];
            if (valStr !== undefined && valStr !== '' && headMax !== undefined) {
              const num = Number(valStr);
              if (!isNaN(num)) {
                if (num > headMax) {
                  validationErrors.push(`${student.name}: ${h.baseName || h.text} mark (${num}) exceeds maximum allowed (${headMax}).`);
                } else if (num < 0) {
                  validationErrors.push(`${student.name}: ${h.baseName || h.text} mark (${num}) cannot be negative.`);
                }
              }
            }
          }
        });
      }
    });

    if (validationErrors.length > 0) {
      alert(`Validation Warning / Error:\n\n` + validationErrors.slice(0, 5).join('\n') + (validationErrors.length > 5 ? `\n...and ${validationErrors.length - 5} more errors.` : ''));
      return;
    }
    
    const updatedEntries = markListStudents.map(student => {
      const studentVals = sheetScores[student.id] || {};
      const studentF = formativeScores[student.id] || {};
      const studentS = summativeScores[student.id] || {};
      
      if (isHindiMarathi) {
        let langRows = studentVals.languageRows || initLanguageRows();
        
        const rawHindi = langRows.hindi?.marks || {};
        const rawMarathi = langRows.marathi?.marks || {};

        const evaluated = evaluateCombinedLanguageRows(student.id, rawHindi, rawMarathi, template, evaluateFormula);
        
        // Store back so UI and downstream uses latest
        langRows.hindi = evaluated.hindi;
        langRows.marathi = evaluated.marathi;
        langRows.total = evaluated.total;
        
        const totalScores = evaluated.total.marks;
        
        return {
          id: `mark_2026-27_${examId}_${classId.replace(/\s+/g, '_')}_${division.replace(/\s+/g, '_')}_${subjectName.replace(/\s+/g, '_')}_${student.id}`,
          academicYear: '2026-27',
          examId,
          classId,
          division,
          subjectId: subjectName,
          studentId: student.id,
          studentName: student.name,
          rollNumber: String(student.rollNo),
          grNumber: student.grNumber,
          marks: { ...totalScores }, // flat marks are total row marks
          formativeMarks: {},
          summativeMarks: {},
          formativeTotal: evaluated.total.formativeTotal !== '' ? Number(evaluated.total.formativeTotal) : '',
          summativeTotal: evaluated.total.summativeTotal !== '' ? Number(evaluated.total.summativeTotal) : '',
          subjectTotal: evaluated.total.grandTotal !== '' ? Number(evaluated.total.grandTotal) : '',
          grade: evaluated.total.grade,
          remarks: studentRemarks[student.id] || '',
          languageRows: langRows,
          status: newStatus as any,
          lastSavedAt: new Date().toISOString(),
          updatedBy: user.name
        };
      }
      
      // Update legacy structures from our master sheetScores flat dictionary
      const formativeHeaders = (template?.headers || []).filter((h: any) => isFormativeHeader(h, template));
      const summativeHeaders = (template?.headers || []).filter((h: any) => isSummativeHeader(h, template));
      
      (template?.headers || []).forEach((h: any) => {
        const val = studentVals[h.id] !== undefined ? studentVals[h.id] : '';
        const fIdx = formativeHeaders.findIndex((fh: any) => fh.id === h.id);
        if (fIdx !== -1) {
          studentF[`f_${fIdx}`] = val;
          studentF[h.id] = val;
        } else {
          const sIdx = summativeHeaders.findIndex((sh: any) => sh.id === h.id);
          if (sIdx !== -1) {
            studentS[`s_${sIdx}`] = val;
            studentS[h.id] = val;
          }
        }
      });

      // Removed inline arithmetic recalculation of fTotal, sTotal, grandTotal for ResultManagement (read-only architecture).
      const existingEntry = LocalERPDatabase.getStudentMarkEntries().find(
        (e: any) => e.examId === examId && e.classId === classId && e.division === division && e.subjectId === subjectName && e.studentId === student.id
      );
      
      return {
        id: `mark_2026-27_${examId}_${classId.replace(/\s+/g, '_')}_${division.replace(/\s+/g, '_')}_${subjectName.replace(/\s+/g, '_')}_${student.id}`,
        academicYear: '2026-27',
        examId,
        classId,
        division,
        subjectId: subjectName,
        studentId: student.id,
        studentName: student.name,
        rollNumber: String(student.rollNo),
        grNumber: student.grNumber,
        marks: studentVals,
        formativeMarks: studentF,
        summativeMarks: studentS,
        formativeTotal: existingEntry?.formativeTotal ?? 0,
        summativeTotal: existingEntry?.summativeTotal ?? 0,
        subjectTotal: existingEntry?.subjectTotal ?? 0,
        grade: existingEntry?.grade ?? '',
        remarks: studentRemarks[student.id] || '',
        status: newStatus as any,
        lastSavedAt: new Date().toISOString(),
        updatedBy: user.name
      };
    });
    
    LocalERPDatabase.saveStudentMarkEntries(updatedEntries);
    
    const history = currentLock?.history || [];
    if (submitAsFinal) {
      history.push({
        version: history.length + 1,
        status: newStatus,
        by: user.name,
        at: new Date().toISOString(),
        remarks: isResubmit ? 'Resubmitted after correction' : 'Submitted to Class Review',
        marksSnapshot: JSON.parse(JSON.stringify(updatedEntries))
      });
    }

    const updatedLock: SubjectLockState = {
      ...(currentLock || {
        id: lockId,
        academicYear: '2026-27',
        examId,
        classId,
        division,
        subjectId: subjectName,
      }),
      isLocked: submitAsFinal,
      status: newStatus,
      lockedAt: submitAsFinal ? new Date().toISOString() : currentLock?.lockedAt,
      lockedBy: submitAsFinal ? user.name : currentLock?.lockedBy,
      history
    };
    LocalERPDatabase.saveSubjectLockState(updatedLock);
    
    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role,
      submitAsFinal ? (isResubmit ? "Resubmit Mark List" : "Submit Mark List") : "Save Draft Mark List",
      "Result Management",
      `${submitAsFinal ? (isResubmit ? 'Resubmitted' : 'Submitted') : 'Saved draft'} marksheet for Class: ${classId} Div: ${division} Subject: ${subjectName} Exam: ${activeEditingMarkList.examName}`
    );
    
    if (submitAsFinal) {
      setActiveEditingMarkList(prev => prev ? {
        ...prev,
        lockState: {
          ...prev.lockState,
          isLocked: true,
          status: newStatus
        }
      } : null);
      setSubmitSuccess(true);
      setTimeout(() => {
        setActiveEditingMarkList(null);
        setRefreshCounter(prev => prev + 1);
      }, 1500);
    } else {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  };

  const handleRegenerateToLanguageTemplate = () => {
    if (!activeEditingMarkList) return;
    const { alloc, exam } = activeEditingMarkList;
    if (!alloc || !exam) return;
    
    const students = getStudentsForClass(alloc.className, alloc.divisionName);
    const assignedTemplate = defaultTemplatesList.find((t: any) => t.id === 'tmpl_class_1_8_language') || defaultTemplatesList[0];
    
    const regeneratedEntries = students.map(student => {
      const allEntries = LocalERPDatabase.getStudentMarkEntries();
      const currentEntry = allEntries.find(
        e => e.examId === exam.id && 
             e.classId === alloc.className && 
             e.division === alloc.divisionName && 
             e.subjectId === alloc.subjectName && 
             e.studentId === student.id
      );

      const langRows = initLanguageRows();
      
      if (currentEntry && currentEntry.marks) {
        Object.entries(currentEntry.marks).forEach(([key, val]) => {
          if (['h4', 'h5', 'h6', 'h7', 'h8', 'h10'].includes(key)) {
            langRows.hindi.marks[key] = val;
            langRows.marathi.marks[key] = val;
          }
        });
      }

      return {
        id: `mark_2026-27_${exam.id}_${alloc.className.replace(/\s+/g, '_')}_${alloc.divisionName.replace(/\s+/g, '_')}_${alloc.subjectName.replace(/\s+/g, '_')}_${student.id}`,
        academicYear: '2026-27',
        examId: exam.id,
        classId: alloc.className,
        division: alloc.divisionName,
        subjectId: alloc.subjectName,
        studentId: student.id,
        studentName: student.name,
        rollNumber: String(student.rollNo),
        grNumber: student.grNumber,
        marks: {},
        formativeMarks: {},
        summativeMarks: {},
        formativeTotal: 0,
        summativeTotal: 0,
        subjectTotal: 0,
        remarks: currentEntry?.remarks || '',
        languageRows: langRows,
        status: currentEntry?.status || 'Draft',
        lastSavedAt: new Date().toISOString(),
        updatedBy: user.name
      };
    });

    LocalERPDatabase.saveStudentMarkEntries(regeneratedEntries as any);
    handleOpenMarkList(alloc, exam, activeEditingMarkList.readOnly);
  };

  const calculateGrade = (score: number, maxMarks: number) => {
    if (maxMarks <= 0) return 'E';
    const pct = (score / maxMarks) * 100;
    if (pct >= 91) return 'A1';
    if (pct >= 81) return 'A2';
    if (pct >= 71) return 'B1';
    if (pct >= 61) return 'B2';
    if (pct >= 51) return 'C1';
    if (pct >= 41) return 'C2';
    if (pct >= 35) return 'D';
    return 'E';
  };

  const initLanguageRows = (): any => ({
    hindi: {
      marks: { h4: '', h5: '', h6: '', h7: '', h8: '', h10: '' } as Record<string, string>,
      formativeTotal: '' as number | '' as string | number,
      summativeTotal: '' as number | '' as string | number,
      grandTotal: '' as number | '' as string | number,
      grade: ''
    },
    marathi: {
      marks: { h4: '', h5: '', h6: '', h7: '', h8: '', h10: '' } as Record<string, string>,
      formativeTotal: '' as number | '' as string | number,
      summativeTotal: '' as number | '' as string | number,
      grandTotal: '' as number | '' as string | number,
      grade: ''
    },
    total: {
      marks: { h4: '', h5: '', h6: '', h7: '', h8: '', h10: '' } as Record<string, string | number>,
      formativeTotal: '' as number | '' as string | number,
      summativeTotal: '' as number | '' as string | number,
      grandTotal: '' as number | '' as string | number,
      grade: ''
    }
  });

  const updateLanguageMark = (
    studentId: string,
    langKey: 'hindi' | 'marathi',
    headId: string,
    value: string
  ) => {
    const isLocked = activeEditingMarkList?.lockState?.isLocked || false;
    if (activeEditingMarkList?.readOnly || isLocked) return;

    const upperVal = value.toUpperCase();
    const isValidValue = value === '' || ['A', 'AB', 'ML', 'EX', 'WH', 'NA'].includes(upperVal) || (!isNaN(Number(value)) && Number(value) >= 0);
    if (!isValidValue) return;

    const template = activeEditingMarkList?.template;
    if (!template) return;

    const header = (template?.headers || []).find((h: any) => h.id === headId);
    if (header) {
      const maxVal = getHeaderMaxMarks(header);
      if (!isNaN(Number(value)) && Number(value) > maxVal) return;
    }

    setSheetScores((prev) => {
      const studentData = prev[studentId] || {};
      const langRows = JSON.parse(JSON.stringify(studentData.languageRows || initLanguageRows()));
      langRows[langKey].marks[headId] = value;

      return {
        ...prev,
        [studentId]: {
          ...studentData,
          languageRows: langRows
        }
      };
    });
  };

  const renderSubjectMarkListWorkspace = () => {
    const allocations = getTeacherAllocations();
    const lockStates = getSubjectLockStates();
    
    // Filter active examinations based on selected Term


    const activeExams = examinations.filter(exam => {
      if (selectedCTTerm === 'term_1') {
        return exam.id === 'ex_1' || exam.id === 'ex_2';
      } else {
        return exam.id === 'ex_3' || exam.id === 'ex_4';
      }
    });

    // Filter active subject mark lists that should appear here
    const activeCombinations: { alloc: any, exam: any, lockId: string, state: any, status: string }[] = [];
    allocations.forEach((alloc: any) => {
      activeExams.forEach((exam) => {
        const lockId = `lock_2026-27_${exam.id}_${alloc.className.replace(/\s+/g, '_')}_${alloc.divisionName.replace(/\s+/g, '_')}_${alloc.subjectName.replace(/\s+/g, '_')}`;
        const state = lockStates.find(s => s.id === lockId);
        const status = state ? state.status : 'Not Generated';
        
        // Subject Mark List is visible ONLY if status is Not Generated, Draft, or Returned/Returned for Correction.
        // It must NOT appear here if status is Submitted, Pending Review, Resubmitted, or Approved.
        if (status === 'Not Generated' || status === 'Draft' || status === 'Returned' || status === 'Returned for Correction') {
          activeCombinations.push({ alloc, exam, lockId, state, status });
        }
      });
    });
    
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider">
              {isUrdu ? "تفویض کردہ مضامین کا آفیشل ریکارڈ" : "Assigned Subject Evaluative Combinations"}
            </h4>
          </div>
          <span className="text-xs bg-slate-100 text-slate-500 font-bold px-2.5 py-1 rounded-md">
            {isUrdu ? "تعلیمی سال: 2026-27" : "Academic Year: 2026-27"}
          </span>
        </div>

        {activeCombinations.length === 0 ? (
          <div className="p-8 text-center bg-slate-50/50 border border-dashed border-slate-200 rounded-xl space-y-1.5 text-left">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto animate-pulse" />
            <p className="text-xs font-bold text-slate-500 text-center">
              {isUrdu ? "تمام مضمون وار مارک لسٹیں کامیابی کے ساتھ جمع ہو چکی ہیں!" : "All subject mark lists have been successfully submitted!"}
            </p>
            <p className="text-[10px] text-slate-400 font-sans text-center">
              {isUrdu ? "کوئی فعال مارک لسٹ بقایا نہیں ہے۔" : "There are no active mark lists requiring your attention."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {activeCombinations.map(({ alloc, exam, lockId, state, status }) => {
              let statusBadge = '';
              if (status === 'Not Generated') {
                statusBadge = 'bg-slate-100 text-slate-500 border-slate-200';
              } else if (status === 'Draft') {
                statusBadge = 'bg-amber-50 text-amber-700 border-amber-200';
              } else if (status === 'Submitted' || status === 'Pending Review') {
                statusBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
              } else if (status === 'Returned' || status === 'Returned for Correction') {
                statusBadge = 'bg-rose-50 text-rose-700 border-rose-200';
              } else if (status === 'Resubmitted') {
                statusBadge = 'bg-indigo-50 text-indigo-700 border-indigo-200';
              }

              return (
                <div 
                  key={lockId}
                  className="border border-slate-200 hover:border-indigo-400 hover:shadow-sm rounded-xl p-4 bg-white transition-all flex flex-col sm:flex-row justify-between sm:items-center gap-4 text-left group animate-fade-in"
                >
                  <div className="space-y-1 text-left">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="bg-slate-100 text-slate-600 text-[9px] font-black uppercase px-2 py-0.5 rounded">
                        {alloc.className}
                      </span>
                      <span className="bg-slate-100 text-slate-600 text-[9px] font-black uppercase px-2 py-0.5 rounded">
                        Div: {alloc.divisionName}
                      </span>
                      <span className="bg-indigo-50 text-indigo-700 text-[9px] font-black uppercase px-2 py-0.5 rounded border border-indigo-100">
                        {exam.name}
                      </span>
                    </div>
                    <span className="text-sm font-black text-slate-800 block">
                      {alloc.subjectName}
                    </span>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded border uppercase tracking-wide font-sans ${statusBadge}`}>
                      {status === 'Not Generated' && (isUrdu ? "غیر شروع شدہ" : "Not Generated")}
                      {status === 'Draft' && (isUrdu ? "ڈرافٹ" : "Draft")}
                      {(status === 'Submitted' || status === 'Pending Review') && (isUrdu ? "جمع شدہ" : "Submitted")}
                      {(status === 'Returned' || status === 'Returned for Correction') && (isUrdu ? "اصلاح کے لیے واپس" : "RETURNED FOR CORRECTION")}
                      {status === 'Resubmitted' && (isUrdu ? "دوبارہ جمع کرایا" : "RESUBMITTED")}
                    </span>

                    {status === 'Not Generated' ? (
                      <button
                        onClick={() => handleGenerateMarkList(alloc, exam)}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black tracking-wide uppercase rounded-lg transition-all cursor-pointer flex items-center gap-1"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{isUrdu ? "شیٹ بنائیں" : "Generate"}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenMarkList(alloc, exam)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-800 text-xs font-black tracking-wide uppercase rounded-lg border border-slate-200 hover:border-transparent transition-all cursor-pointer flex items-center gap-1"
                      >
                        <span>{isUrdu ? "کھولیں" : "Open"}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // States for Clerk Template Management
  const [clerkTab, setClerkTab] = useState<'ledgers' | 'templates' | 'masterResultBook' | 'progressCardTemplates'>('ledgers');

  useEffect(() => {
    if (!isClerk || !activeFeatureId) return;
    const featureToTab: Record<string, 'ledgers' | 'templates' | 'masterResultBook' | 'progressCardTemplates'> = {
      'cl-result-mark-list-templates': 'templates',
      'cl-result-print-center': 'ledgers',
      'cl-result-master-result-book': 'masterResultBook',
      'cl-result-progress-card-templates': 'progressCardTemplates'
    };
    const targetTab = featureToTab[activeFeatureId];
    if (!targetTab) return;
    setClerkTab(targetTab);
    setSelectedTemplate(null);
    if (targetTab === 'ledgers') {
      setActiveLedgerCategory('none');
      setLedgerSearch('');
    }
    window.requestAnimationFrame(() => {
      document.getElementById('clerk-result-focused-page')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [activeFeatureId, isClerk]);

  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [uploadingTemplateId, setUploadingTemplateId] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);

  // States for Clerk Print Center
  const [activeLedgerCategory, setActiveLedgerCategory] = useState<'none' | 'mark_lists' | 'result_books' | 'progress_cards' | 'mark_lists_search'>('none');
  const [clerkSelectedMarkList, setClerkSelectedMarkList] = useState<any | null>(null);
  const [clerkSelectedResultBook, setClerkSelectedResultBook] = useState<any | null>(null);
  const [printableMarkLists, setPrintableMarkLists] = useState<any[]>([]);
  const [printableResultBooks, setPrintableResultBooks] = useState<any[]>([]);
  const [ledgerSearch, setLedgerSearch] = useState<string>('');

  // Phase-1 Search Fields
  const [markListSearchYear, setMarkListSearchYear] = useState<string>('');
  const [markListSearchClass, setMarkListSearchClass] = useState<string>('');
  const [markListSearchDivision, setMarkListSearchDivision] = useState<string>('');
  const [markListSearchUnderDev, setMarkListSearchUnderDev] = useState<boolean>(false);

  // Phase-2 Search Results & States
  const [clerkOpenedClassMarkList, setClerkOpenedClassMarkList] = useState<{
    academicYear: string;
    className: string;
    divisionName: string;
  } | null>(null);
  const [clerkSelectedExam, setClerkSelectedExam] = useState<string>('ex_1');
  const [clerkExpandedCards, setClerkExpandedCards] = useState<Record<string, boolean>>({});
  const [clerkSearchError, setClerkSearchError] = useState<string>('');

  const handleClerkMarkListSearch = () => {
    if (!markListSearchYear || !markListSearchClass || !markListSearchDivision) {
      setClerkSearchError(isUrdu ? "براہ کرم تمام تلاش کے خانے منتخب کریں۔" : "Please select Academic Year, Class, and Division.");
      setClerkOpenedClassMarkList(null);
      return;
    }
    setClerkSearchError('');
    setMarkListSearchUnderDev(false);

    // Locate matching allocations
    const allocations = (setup?.subjectAllocations || []).filter(
      (a: any) => a.className === markListSearchClass && 
                 a.divisionName === markListSearchDivision && 
                 a.academicYear === markListSearchYear
    );

    // Fetch lock states
    const lockStates = getSubjectLockStates();

    // Find if there are any lock states with status Submitted, Pending Review, Resubmitted, or Approved for this class, division, and academic year
    const submittedLockStates = lockStates.filter((s: any) => 
      s.classId === markListSearchClass && 
      s.division === markListSearchDivision && 
      s.academicYear === markListSearchYear &&
      (s.status === 'Submitted' || s.status === 'Pending Review' || s.status === 'Resubmitted' || s.status === 'Approved')
    );

    if (allocations.length > 0 && submittedLockStates.length > 0) {
      // Record exists! Set the opened Class Mark List
      setClerkOpenedClassMarkList({
        academicYear: markListSearchYear,
        className: markListSearchClass,
        divisionName: markListSearchDivision
      });
    } else {
      // Record does not exist!
      setClerkOpenedClassMarkList(null);
      setClerkSearchError(
        isUrdu 
          ? "منتخب کردہ تعلیمی سال، کلاس اور ڈویژن کے لیے کوئی کلاس مارک لسٹ نہیں ملی۔ براہ کرم اپنے انتخاب کی تصدیق کریں یا کلاس ٹیچر کی جانب سے کلاس مارک لسٹ جمع کرانے کا انتظار کریں۔"
          : "No Class Mark List found for the selected Academic Year, Class and Division.\n\nPlease verify the selections or wait until the Class Teacher submits the Class Mark List."
      );
    }
  };

  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);

  const expandAllClerkCards = () => {
    if (!clerkOpenedClassMarkList) return;
    const lockStates = getSubjectLockStates();
    const clerkClassAllocations = (setup?.subjectAllocations || []).filter(
      (a: any) => a.className === clerkOpenedClassMarkList.className && 
                 a.divisionName === clerkOpenedClassMarkList.divisionName &&
                 a.academicYear === clerkOpenedClassMarkList.academicYear
    );

    const clerkSubmittedItems = clerkClassAllocations.map((alloc: any) => {
      const lockId = `lock_${clerkOpenedClassMarkList.academicYear}_${clerkSelectedExam}_${alloc.className.replace(/\s+/g, '_')}_${alloc.divisionName.replace(/\s+/g, '_')}_${alloc.subjectName.replace(/\s+/g, '_')}`;
      const state = lockStates.find(s => s.id === lockId);
      return {
        allocation: alloc,
        state,
        status: state ? state.status : 'Not Generated'
      };
    }).filter(item => item.status === 'Pending Review' || item.status === 'Submitted' || item.status === 'Resubmitted' || item.status === 'Approved');

    const newExpanded: Record<string, boolean> = {};
    clerkSubmittedItems.forEach((item: any) => {
      const cardId = item.state?.id || `lock_${clerkOpenedClassMarkList.academicYear}_${clerkSelectedExam}_${item.allocation.className.replace(/\s+/g, '_')}_${item.allocation.divisionName.replace(/\s+/g, '_')}_${item.allocation.subjectName.replace(/\s+/g, '_')}`;
      newExpanded[cardId] = true;
    });
    setClerkExpandedCards(newExpanded);
  };

  const handleClerkPrint = () => {
    if (!clerkOpenedClassMarkList) return;
    
    // First, expand all cards so the details are rendered in DOM
    expandAllClerkCards();
    
    // Wait for the state to settle and elements to render
    setTimeout(() => {
      const printableElements = document.querySelectorAll('.clerk-printable-marklist-document');
      if (printableElements.length === 0) {
        alert("No printable mark lists found.");
        return;
      }

      // Create a temporary container on document.body
      const printContainer = document.createElement('div');
      printContainer.id = 'clerk-temp-print-container';
      
      // Clone each printable element and append to the print container
      printableElements.forEach((el, idx) => {
        const clone = el.cloneNode(true) as HTMLElement;
        // Ensure the clone is visible
        clone.style.display = 'block';
        
        // Add a page break between multiple documents
        if (idx > 0) {
          clone.style.pageBreakBefore = 'always';
        }
        
        printContainer.appendChild(clone);
      });
      
      document.body.appendChild(printContainer);
      
      const style = document.createElement('style');
      style.id = 'print-original-class-mark-list-style';
      style.innerHTML = `
        @media print {
          /* Hide all original body elements */
          body > *:not(#clerk-temp-print-container) {
            display: none !important;
          }
          
          /* Style our temporary container */
          #clerk-temp-print-container {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          /* Styling for individual documents */
          .clerk-printable-marklist-document {
            background: white !important;
            padding: 15px !important;
            margin: 0 !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          
          /* Table print layout */
          table {
            border-collapse: collapse !important;
            width: 100% !important;
            background: white !important;
          }
          
          th, td {
            border: 1px solid #475569 !important; /* clearly defined dark slate border */
            padding: 6px 8px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          @page {
            size: A4 portrait;
            margin: 0.5in;
          }
        }
      `;
      document.head.appendChild(style);
      
      runNativeBrowserPrint();
      
      const cleanup = () => {
        const elStyle = document.getElementById('print-original-class-mark-list-style');
        if (elStyle) elStyle.remove();
        
        const elContainer = document.getElementById('clerk-temp-print-container');
        if (elContainer) elContainer.remove();
      };
      
      window.addEventListener('afterprint', cleanup, { once: true });
      setTimeout(cleanup, 1500);
    }, 400);
  };

  const handleSingleClerkPrint = (cardId: string) => {
    if (!clerkOpenedClassMarkList) return;
    
    // Remember original expansion state
    const originalExpanded = { ...clerkExpandedCards };
    
    // Set only this card to be expanded
    setClerkExpandedCards({ [cardId]: true });
    
    // Wait for the state to settle and elements to render
    setTimeout(() => {
      const printableElement = document.querySelector(`.clerk-printable-marklist-document[data-card-id="${cardId}"]`);
      if (!printableElement) {
        alert("Printable mark list not found.");
        setClerkExpandedCards(originalExpanded);
        return;
      }

      // Create a temporary container on document.body
      const printContainer = document.createElement('div');
      printContainer.id = 'clerk-temp-print-container';
      
      const clone = printableElement.cloneNode(true) as HTMLElement;
      clone.style.display = 'block';
      printContainer.appendChild(clone);
      
      document.body.appendChild(printContainer);
      
      const style = document.createElement('style');
      style.id = 'print-original-class-mark-list-style';
      style.innerHTML = `
        @media print {
          /* Hide all original body elements */
          body > *:not(#clerk-temp-print-container) {
            display: none !important;
          }
          
          /* Style our temporary container */
          #clerk-temp-print-container {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          /* Styling for individual documents */
          .clerk-printable-marklist-document {
            background: white !important;
            padding: 15px !important;
            margin: 0 !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          
          /* Table print layout */
          table {
            border-collapse: collapse !important;
            width: 100% !important;
            background: white !important;
          }
          
          th, td {
            border: 1px solid #475569 !important; /* clearly defined dark slate border */
            padding: 6px 8px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          @page {
            size: A4 portrait;
            margin: 0.5in;
          }
        }
      `;
      document.head.appendChild(style);
      
      runNativeBrowserPrint();
      
      const cleanup = () => {
        const elStyle = document.getElementById('print-original-class-mark-list-style');
        if (elStyle) elStyle.remove();
        
        const elContainer = document.getElementById('clerk-temp-print-container');
        if (elContainer) elContainer.remove();
        
        // Restore original expansion state
        setClerkExpandedCards(originalExpanded);
      };
      
      window.addEventListener('afterprint', cleanup, { once: true });
      setTimeout(cleanup, 1500);
    }, 400);
  };

  const handleSingleClerkDownloadPDF = async (cardId: string, subjectName: string) => {
    if (!clerkOpenedClassMarkList || isDownloadingPDF) return;
    
    setIsDownloadingPDF(true);
    const originalExpanded = { ...clerkExpandedCards };
    setClerkExpandedCards({ [cardId]: true });
    
    const originalWidths = new Map<HTMLElement, string>();
    
    setTimeout(async () => {
      const originalWinGetComputedStyle = window.getComputedStyle;
      try {
        const element = document.querySelector(`.clerk-printable-marklist-document[data-card-id="${cardId}"]`) as HTMLElement | null;
        if (!element) {
          setIsDownloadingPDF(false);
          setClerkExpandedCards(originalExpanded);
          return;
        }

        const win = window;
        if (win) {
          win.getComputedStyle = function(el: Element, pseudoEl?: string) {
            const style = originalWinGetComputedStyle.call(win, el, pseudoEl);
            return new Proxy(style, {
              get(target: any, prop: string | symbol) {
                const val = target[prop as any];
                if (prop === 'getPropertyValue') {
                  return function(propertyName: string) {
                    const originalVal = target.getPropertyValue(propertyName);
                    if (typeof originalVal === 'string' && (originalVal.includes('oklch') || originalVal.includes('oklab'))) {
                      return replaceOklchWithRgb(originalVal);
                    }
                    return originalVal;
                  };
                }
                if (typeof val === 'string' && (val.includes('oklch') || val.includes('oklab'))) {
                  return replaceOklchWithRgb(val);
                }
                if (typeof val === 'function') {
                  return val.bind(target);
                }
                return val;
              }
            }) as any;
          };
        }

        // Temporarily apply A4 Portrait capture styling and dynamic widths
        const styleEl = document.createElement('style');
        styleEl.id = 'pdf-portrait-style';
        styleEl.textContent = `
          .pdf-portrait-capture {
            width: 190mm !important;
            max-width: 190mm !important;
            padding: 0 !important;
            margin: 0 !important;
            box-sizing: border-box !important;
            background: white !important;
            color: black !important;
          }
          
          .pdf-portrait-capture .overflow-x-auto,
          .pdf-portrait-capture .overflow-y-auto {
            overflow: visible !important;
            max-height: none !important;
            border: none !important;
            box-shadow: none !important;
          }
          
          .pdf-portrait-capture table {
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
          }
          
          .pdf-portrait-capture th,
          .pdf-portrait-capture td {
            min-width: unset !important;
            word-wrap: break-word !important;
            word-break: break-all !important;
            font-size: 8px !important;
            padding: 4px 3px !important;
            border: 1px solid #475569 !important;
          }
          
          .pdf-portrait-capture tbody td {
            width: auto !important;
          }

          /* Show the signature area during capture */
          .pdf-portrait-capture div[class*="print:flex"] {
            display: flex !important;
            margin-top: 25px !important;
            padding-top: 15px !important;
            border-top: 1px solid #cbd5e1 !important;
          }
        `;
        document.head.appendChild(styleEl);
        element.classList.add('pdf-portrait-capture');

        // Dynamically adjust thead th columns for perfect A4 Portrait proportions
        const ths = element.querySelectorAll('thead th') as NodeListOf<HTMLElement>;
        const headerTds = element.querySelectorAll('tbody tr:nth-child(4) td') as NodeListOf<HTMLElement>;
        
        if (ths.length > 1 && headerTds.length > 1) {
          originalWidths.set(ths[0], ths[0].style.width);
          ths[0].style.setProperty('width', '35px', 'important');
          
          let rollNoIdx = -1;
          let grNoIdx = -1;
          let nameIdx = -1;
          const otherCols: number[] = [];
          
          for (let i = 1; i < headerTds.length; i++) {
            const txt = headerTds[i].textContent?.toLowerCase() || '';
            if (txt.includes('roll')) {
              rollNoIdx = i;
            } else if (txt.includes('g.r.')) {
              grNoIdx = i;
            } else if (txt.includes('name')) {
              nameIdx = i;
            } else {
              otherCols.push(i);
            }
          }
          
          for (let i = 1; i < ths.length; i++) {
            originalWidths.set(ths[i], ths[i].style.width);
            
            if (i === rollNoIdx) {
              ths[i].style.setProperty('width', '8%', 'important');
            } else if (i === grNoIdx) {
              ths[i].style.setProperty('width', '10%', 'important');
            } else if (i === nameIdx) {
              ths[i].style.setProperty('width', '26%', 'important');
            } else {
              const share = otherCols.length > 0 ? (56 / otherCols.length) : 10;
              ths[i].style.setProperty('width', `${share}%`, 'important');
            }
          }

          for (let i = 1; i < headerTds.length; i++) {
            originalWidths.set(headerTds[i], headerTds[i].style.width);
            headerTds[i].style.setProperty('width', 'auto', 'important');
          }
        }

        // @ts-ignore
        const html2pdf = (await import('html2pdf.js')).default;
        
        const safeClassName = clerkOpenedClassMarkList.className.replace(/\s+/g, '_');
        const safeDivisionName = clerkOpenedClassMarkList.divisionName.replace(/\s+/g, '_');
        const safeExamName = (examinations.find(e => e.id === clerkSelectedExam)?.name || clerkSelectedExam).replace(/\s+/g, '_');
        const safeSubjectName = subjectName.replace(/\s+/g, '_');
        
        const opt = {
          margin:       10,
          filename:     `Original_Subject_Mark_List_${safeClassName}_${safeDivisionName}_${safeSubjectName}_${safeExamName}.pdf`,
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { 
            scale: 2, 
            useCORS: true, 
            logging: false,
            onclone: (clonedDoc: Document) => {
              clonedDoc.querySelectorAll('style').forEach((styleEl) => {
                if (styleEl.textContent) {
                  styleEl.textContent = replaceOklchWithRgb(styleEl.textContent);
                }
              });
              clonedDoc.querySelectorAll('[style]').forEach((el: any) => {
                const styleAttr = el.getAttribute('style');
                if (styleAttr && (styleAttr.includes('oklch') || styleAttr.includes('oklab'))) {
                  el.setAttribute('style', replaceOklchWithRgb(styleAttr));
                }
              });
            }
          },
          jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
        } as any;
        
        // Generate and save PDF
        await html2pdf().set(opt).from(element).save();
        
      } catch (err) {
        console.error("Failed to generate PDF:", err);
      } finally {
        // Restore elements
        const element = document.querySelector(`.clerk-printable-marklist-document[data-card-id="${cardId}"]`) as HTMLElement | null;
        if (element) {
          element.classList.remove('pdf-portrait-capture');
        }
        const styleEl = document.getElementById('pdf-portrait-style');
        if (styleEl) {
          styleEl.remove();
        }
        originalWidths.forEach((val, key) => {
          if (key && key.style) {
            key.style.width = val;
          }
        });

        window.getComputedStyle = originalWinGetComputedStyle;
        setIsDownloadingPDF(false);
        setClerkExpandedCards(originalExpanded);
      }
    }, 500);
  };

  // High-fidelity OKLCH/OKLAB color translators to prevent crashes during html2canvas PDF rendering
  const oklchToRgb = (oklchStr: string): string | null => {
    const match = oklchStr.match(/oklch\(([^)]+)\)/);
    if (!match) return null;
    
    const parts = match[1].trim().split(/[\s,/]+/);
    if (parts.length < 3) return null;
    
    let l = parseFloat(parts[0]);
    if (parts[0].includes('%')) l /= 100;
    
    let c = parseFloat(parts[1]);
    if (parts[1].includes('%')) c /= 100;
    
    let h = parseFloat(parts[2]);
    if (parts[2].includes('deg')) h = parseFloat(parts[2]);
    if (parts[2].includes('rad')) h = parseFloat(parts[2]) * 180 / Math.PI;
    if (parts[2].includes('turn')) h = parseFloat(parts[2]) * 360;
    
    let a = 1;
    if (parts.length >= 4) {
      a = parseFloat(parts[3]);
      if (parts[3].includes('%')) a /= 100;
    }
    
    const hRad = (h * Math.PI) / 180;
    const L = l;
    const oklab_a = c * Math.cos(hRad);
    const oklab_b = c * Math.sin(hRad);
    
    const l_ = L + 0.3963377774 * oklab_a + 0.2158037573 * oklab_b;
    const m_ = L - 0.1055613458 * oklab_a - 0.0638541728 * oklab_b;
    const s_ = L - 0.0894841775 * oklab_a - 1.2914855480 * oklab_b;
    
    const l_cubed = l_ * l_ * l_;
    const m_cubed = m_ * m_ * m_;
    const s_cubed = s_ * s_ * s_;
    
    const r_lin = +4.0767416621 * l_cubed - 3.3077115913 * m_cubed + 0.2309699292 * s_cubed;
    const g_lin = -1.2684380046 * l_cubed + 2.6097574011 * m_cubed - 0.3413193965 * s_cubed;
    const b_lin = -0.0041960863 * l_cubed - 0.7034186147 * m_cubed + 1.7076286104 * s_cubed;
    
    const toSRGB = (val: number) => {
      if (val <= 0.0031308) return val * 12.92;
      return 1.055 * Math.pow(val, 1 / 2.4) - 0.055;
    };
    
    const r = Math.round(Math.max(0, Math.min(1, toSRGB(r_lin))) * 255);
    const g = Math.round(Math.max(0, Math.min(1, toSRGB(g_lin))) * 255);
    const b = Math.round(Math.max(0, Math.min(1, toSRGB(b_lin))) * 255);
    
    if (a === 1) {
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
  };

  const oklabToRgb = (oklabStr: string): string | null => {
    const match = oklabStr.match(/oklab\(([^)]+)\)/);
    if (!match) return null;
    
    const parts = match[1].trim().split(/[\s,/]+/);
    if (parts.length < 3) return null;
    
    let L = parseFloat(parts[0]);
    if (parts[0].includes('%')) L /= 100;
    
    let oklab_a = parseFloat(parts[1]);
    if (parts[1].includes('%')) oklab_a /= 100;
    
    let oklab_b = parseFloat(parts[2]);
    if (parts[2].includes('%')) oklab_b /= 100;
    
    let a = 1;
    if (parts.length >= 4) {
      a = parseFloat(parts[3]);
      if (parts[3].includes('%')) a /= 100;
    }
    
    const l_ = L + 0.3963377774 * oklab_a + 0.2158037573 * oklab_b;
    const m_ = L - 0.1055613458 * oklab_a - 0.0638541728 * oklab_b;
    const s_ = L - 0.0894841775 * oklab_a - 1.2914855480 * oklab_b;
    
    const l_cubed = l_ * l_ * l_;
    const m_cubed = m_ * m_ * m_;
    const s_cubed = s_ * s_ * s_;
    
    const r_lin = +4.0767416621 * l_cubed - 3.3077115913 * m_cubed + 0.2309699292 * s_cubed;
    const g_lin = -1.2684380046 * l_cubed + 2.6097574011 * m_cubed - 0.3413193965 * s_cubed;
    const b_lin = -0.0041960863 * l_cubed - 0.7034186147 * m_cubed + 1.7076286104 * s_cubed;
    
    const toSRGB = (val: number) => {
      if (val <= 0.0031308) return val * 12.92;
      return 1.055 * Math.pow(val, 1 / 2.4) - 0.055;
    };
    
    const r = Math.round(Math.max(0, Math.min(1, toSRGB(r_lin))) * 255);
    const g = Math.round(Math.max(0, Math.min(1, toSRGB(g_lin))) * 255);
    const b = Math.round(Math.max(0, Math.min(1, toSRGB(b_lin))) * 255);
    
    if (a === 1) {
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
  };

  const replaceOklchWithRgb = (str: string): string => {
    if (!str || typeof str !== 'string') return str;
    let temp = str.replace(/oklch\([^)]+\)/g, (match) => {
      try {
        const converted = oklchToRgb(match);
        return converted || match;
      } catch (e) {
        return match;
      }
    });
    return temp.replace(/oklab\([^)]+\)/g, (match) => {
      try {
        const converted = oklabToRgb(match);
        return converted || match;
      } catch (e) {
        return match;
      }
    });
  };

  const handleClerkDownloadPDF = async () => {
    if (!clerkOpenedClassMarkList || isDownloadingPDF) return;
    
    setIsDownloadingPDF(true);
    // Expand all cards so the tables are rendered in the DOM
    expandAllClerkCards();
    
    // Wait for the state to render completely
    setTimeout(async () => {
      const originalWinGetComputedStyle = window.getComputedStyle;
      try {
        const element = document.getElementById('clerk-original-class-mark-list');
        if (!element) {
          setIsDownloadingPDF(false);
          return;
        }
        
        // Temporarily hide the print/download actions inside the element during PDF creation
        const actions = element.querySelector('.clerk-print-actions') as HTMLElement;
        if (actions) actions.style.display = 'none';

        const win = window;
        if (win) {
          win.getComputedStyle = function(el: Element, pseudoEl?: string) {
            const style = originalWinGetComputedStyle.call(win, el, pseudoEl);
            return new Proxy(style, {
              get(target: any, prop: string | symbol) {
                const val = target[prop as any];
                if (prop === 'getPropertyValue') {
                  return function(propertyName: string) {
                    const originalVal = target.getPropertyValue(propertyName);
                    if (typeof originalVal === 'string' && (originalVal.includes('oklch') || originalVal.includes('oklab'))) {
                      return replaceOklchWithRgb(originalVal);
                    }
                    return originalVal;
                  };
                }
                if (typeof val === 'string' && (val.includes('oklch') || val.includes('oklab'))) {
                  return replaceOklchWithRgb(val);
                }
                if (typeof val === 'function') {
                  return val.bind(target);
                }
                return val;
              }
            }) as any;
          };
        }

        // @ts-ignore
        const html2pdf = (await import('html2pdf.js')).default;
        
        const safeClassName = clerkOpenedClassMarkList.className.replace(/\s+/g, '_');
        const safeDivisionName = clerkOpenedClassMarkList.divisionName.replace(/\s+/g, '_');
        const safeExamName = (examinations.find(e => e.id === clerkSelectedExam)?.name || clerkSelectedExam).replace(/\s+/g, '_');
        
        const opt = {
          margin:       10,
          filename:     `Original_Class_Mark_List_${safeClassName}_${safeDivisionName}_${safeExamName}.pdf`,
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { 
            scale: 2, 
            useCORS: true, 
            logging: false,
            onclone: (clonedDoc: Document) => {
              clonedDoc.querySelectorAll('style').forEach((styleEl) => {
                if (styleEl.textContent) {
                  styleEl.textContent = replaceOklchWithRgb(styleEl.textContent);
                }
              });
              clonedDoc.querySelectorAll('[style]').forEach((el: any) => {
                const styleAttr = el.getAttribute('style');
                if (styleAttr && (styleAttr.includes('oklch') || styleAttr.includes('oklab'))) {
                  el.setAttribute('style', replaceOklchWithRgb(styleAttr));
                }
              });
            }
          },
          jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' },
          pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
        } as any;
        
        // Generate and save PDF
        await html2pdf().set(opt).from(element).save();
        
        // Restore buttons display
        if (actions) actions.style.display = '';
      } catch (err) {
        console.error("Failed to generate PDF:", err);
      } finally {
        window.getComputedStyle = originalWinGetComputedStyle;
        setIsDownloadingPDF(false);
      }
    }, 500);
  };

  useEffect(() => {
    if (clerkTab === 'ledgers') {
      try {
        const ml = JSON.parse(localStorage.getItem('nhs_erp_mark_lists_ready_for_print') || '[]');
        setPrintableMarkLists(ml);
        const rb = JSON.parse(localStorage.getItem('nhs_erp_result_books_ready_for_print') || '[]');
        setPrintableResultBooks(rb);
      } catch (e) {
        console.error("Error loading Clerk Print Center:", e);
      }
    }
  }, [clerkTab, activeLedgerCategory]);

  const handleDownloadMarkList = (ml: any) => {
    try {
      const allEntries = LocalERPDatabase.getStudentMarkEntries() || [];
      const studentEntries = allEntries.filter(
        e => e.examId === ml.examId && 
             e.classId === ml.className && 
             e.division === ml.divisionName && 
             e.subjectId === ml.subjectName
      );

      const data = studentEntries.map((entry: any, idx: number) => ({
        "Roll No": entry.rollNo || idx + 1,
        "G.R. Number": entry.grNumber || '-',
        "Student Name": entry.studentName || '-',
        "Total Marks": entry.subjectTotal !== undefined ? entry.subjectTotal : '-',
        "Grade": entry.grade || '-'
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Marks");
      XLSX.writeFile(wb, `MarkList_${ml.className}_${ml.divisionName}_${ml.subjectName}_${ml.examName}.xlsx`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadResultBook = (rb: any) => {
    try {
      const data = (rb.studentResultBooks || []).map((studentBook: any) => ({
        "Roll No": studentBook.rollNo || '-',
        "G.R. Number": studentBook.grNumber || '-',
        "Student Name": studentBook.studentName || '-',
        "Status": studentBook.status || '-'
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Class Standings");
      XLSX.writeFile(wb, `ResultBook_${rb.className}_${rb.divisionName}_2026-27.xlsx`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleArchiveMarkList = (mlId: string) => {
    try {
      const listKey = 'nhs_erp_mark_lists_ready_for_print';
      const lists = JSON.parse(localStorage.getItem(listKey) || '[]');
      const updated = lists.map((l: any) => {
        if (l.id === mlId) {
          return { ...l, isArchived: !l.isArchived };
        }
        return l;
      });
      localStorage.setItem(listKey, JSON.stringify(updated));
      setPrintableMarkLists(updated);
      LocalERPDatabase.addAuditLog(
        user.id,
        user.name,
        user.role,
        'TOGGLE_ARCHIVE_MARK_LIST',
        'Clerk Dashboard',
        `Toggled archive status for printable mark list ID ${mlId}.`
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleArchiveResultBook = (rbId: string) => {
    try {
      const listKey = 'nhs_erp_result_books_ready_for_print';
      const books = JSON.parse(localStorage.getItem(listKey) || '[]');
      const updated = books.map((b: any) => {
        if (b.id === rbId) {
          return { ...b, isArchived: !b.isArchived };
        }
        return b;
      });
      localStorage.setItem(listKey, JSON.stringify(updated));
      setPrintableResultBooks(updated);
      LocalERPDatabase.addAuditLog(
        user.id,
        user.name,
        user.role,
        'TOGGLE_ARCHIVE_RESULT_BOOK',
        'Clerk Dashboard',
        `Toggled archive status for printable result book ID ${rbId}.`
      );
    } catch (e) {
      console.error(e);
    }
  };

  // Dynamic statistics calculations for dashboards
  const activeAllocations = getTeacherAllocations();
  const activeLockStates = getSubjectLockStates();
  let totalAssigned = activeAllocations.length * examinations.length;
  let pendingCount = 0;
  let draftCount = 0;
  let submittedCount = 0;
  let returnedCount = 0;

  activeAllocations.forEach((alloc: any) => {
    examinations.forEach((exam) => {
      const lockId = `lock_2026-27_${exam.id}_${alloc.className.replace(/\s+/g, '_')}_${alloc.divisionName.replace(/\s+/g, '_')}_${alloc.subjectName.replace(/\s+/g, '_')}`;
      const state = activeLockStates.find(s => s.id === lockId);
      const status = state ? state.status : 'Not Generated';
      if (status === 'Not Generated') pendingCount++;
      else if (status === 'Draft') draftCount++;
      else if (status === 'Submitted' || status === 'Pending Review' || status === 'Resubmitted' || status === 'Approved') submittedCount++;
      else if (status === 'Returned' || status === 'Returned for Correction') returnedCount++;
    });
  });

  // Class Teacher metrics calculation
  const ctTargetClass = classTeacherAssignment?.className || 'Class 9';
  const ctTargetDivision = classTeacherAssignment?.divisionName || 'A';
  const ctClassAllocations = (setup?.subjectAllocations || []).filter(
    (a: any) => a.className === ctTargetClass && a.divisionName === ctTargetDivision
  );
  
  const ctActiveExams = (selectedCTTerm === 'term_1' ? ['ex_1', 'ex_2'] : ['ex_3', 'ex_4'])
    .filter(id => examinations.some(e => e.id === id));
  const ctClassStates = activeLockStates.filter(
    (s: any) => s.classId === ctTargetClass && s.division === ctTargetDivision && ctActiveExams.includes(s.examId)
  );
  
  const ctSubmittedCount = ctClassStates.filter(s => s.status === 'Pending Review' || s.status === 'Submitted' || s.status === 'Resubmitted').length;
  const ctDraftCount = ctClassStates.filter(s => s.status === 'Draft').length;
  const ctReturnedCount = ctClassStates.filter(s => s.status === 'Returned for Correction' || s.status === 'Returned').length;
  const ctApprovedCount = ctClassStates.filter(s => s.status === 'Approved').length;
  
  const ctTotalAllocated = (ctClassAllocations.length * ctActiveExams.length) || 8;
  const ctPendingCount = Math.max(0, ctTotalAllocated - (ctSubmittedCount + ctDraftCount + ctReturnedCount + ctApprovedCount));
  const ctProgressPercent = (ctTotalAllocated > 0 && !isNaN(ctApprovedCount) && !isNaN(ctTotalAllocated))
    ? Math.round((ctApprovedCount / ctTotalAllocated) * 100) 
    : 0;

  // Automatic preparation of blank Result Book records for every student of that class
  useEffect(() => {
    try {
      if (isClassTeacher && ctTargetClass && ctTargetDivision) {
        const students = getStudentsForClass(ctTargetClass, ctTargetDivision);
        const storageKey = 'nhs_erp_student_result_books';
        let studentResultBooks: any[] = [];
        try {
          const stored = localStorage.getItem(storageKey);
          if (stored) {
            studentResultBooks = JSON.parse(stored);
          }
        } catch (e) {
          console.error("Error loading student result books:", e);
        }

        if (!Array.isArray(studentResultBooks)) {
          studentResultBooks = [];
        }

        let updated = false;

        // Clean up and optimize ALL existing entries in studentResultBooks by stripping out redundant sheetData
        // (to release several megabytes of storage and resolve QuotaExceededError)
        studentResultBooks = studentResultBooks.map((rb: any) => {
          if (rb && rb.sheetData !== null) {
            updated = true;
            return { ...rb, sheetData: null };
          }
          return rb;
        });

        students.forEach(student => {
          const hasRecord = studentResultBooks.some(
            (rb: any) => rb && rb.studentId === student.id && rb.academicYear === '2026-27'
          );
          if (!hasRecord) {
            // Prepare a blank Result Book record without reproducing the master sheet template (saves several megabytes)
            const newRecord = {
              id: `rb_2026-27_${student.id}`,
              studentId: student.id,
              studentName: student.name,
              rollNo: student.rollNo,
              grNumber: student.grNumber,
              className: ctTargetClass,
              divisionName: ctTargetDivision,
              academicYear: '2026-27',
              status: 'Blank',
              preparedAt: new Date().toISOString(),
              sheetData: null // Set to null to save localStorage quota. Default template merges beautifully on load in ContinuousResultBook.tsx.
            };
            studentResultBooks.push(newRecord);
            updated = true;
          }
        });

        if (updated) {
          try {
            localStorage.setItem(storageKey, JSON.stringify(studentResultBooks));
          } catch (storageError) {
            console.warn("Storage quota limit hit during save. Attempting emergency cleanup...", storageError);
            // Emergency cleanup: Clear old archives or ready for print books if quota is exceeded
            try {
              localStorage.removeItem('nhs_erp_result_books_ready_for_print');
              localStorage.setItem(storageKey, JSON.stringify(studentResultBooks));
              console.log("Recovered successfully after clearing printable archives.");
            } catch (retryError) {
              console.error("Failed to recover from storage quota exhaustion. Student result books could not be saved:", retryError);
            }
          }
          // Save audit log
          try {
            LocalERPDatabase.addAuditLog(
              user?.id || 'unknown',
              user?.name || 'Unknown',
              user?.role || 'teacher',
              'Auto-Prepare Result Books',
              'Result Book',
              `Automatically prepared blank Result Book records for ${students.length} students of Class: ${ctTargetClass} Div: ${ctTargetDivision} for 2026-27.`
            );
          } catch (auditError) {
            console.error("Error saving audit log for result book preparation:", auditError);
          }
        }
      }
    } catch (err) {
      console.error("Critical error in auto-preparing result books:", err);
    }
  }, [isClassTeacher, ctTargetClass, ctTargetDivision]);

  // Preconfigured official Mark List templates list
  const defaultTemplatesList = clerkDefaultMasterTemplates;

  const migrateTemplatesList = (list: any[]) => {
    if (!Array.isArray(list)) return defaultTemplatesList;
    const updatedList = list.map((tmpl: any) => {
      if (!tmpl || !tmpl.headers) return tmpl;

      let updatedTmpl = { ...tmpl };

      // Update names, Urdu names and categories for Class 9-10 templates if stored in localStorage
      if (tmpl.id === 'tmpl_class_9_10_general') {
        updatedTmpl.name = 'Class 9–10 Single Subject Template';
        updatedTmpl.nameUr = 'کلاس ۹ تا ۱۰ سنگل سبجیکٹ ٹیمپلیٹ';
        updatedTmpl.templateCategory = 'Class 9-10 Single Subject';
        updatedTmpl.description = 'Official Class 9 and 10 Master Mark List layout for Single Subjects (English, Urdu) with First Term (80 Written + 20 Internal = 100), Second Term (80 Written + 20 Internal = 100), Annual Total (200), Average (100) and Grade.';
        if (updatedTmpl.sections && updatedTmpl.sections[1]) {
          updatedTmpl.sections[1].text = 'MASTER MARK LIST - CLASS IX & X (SINGLE SUBJECT)';
        }
      } else if (tmpl.id === 'tmpl_class_9_10_math') {
        updatedTmpl.name = 'Class 9–10 Dual Paper Subject Template';
        updatedTmpl.nameUr = 'کلاس ۹ تا ۱۰ ڈوئل پیپر سبجیکٹ ٹیمپلیٹ';
        updatedTmpl.templateCategory = 'Class 9-10 Dual Paper Subject';
        updatedTmpl.description = 'Official Class 9 and 10 Master Mark List layout for Dual Paper Subjects (Mathematics: Math-1/Math-2, Science: Science-1/Science-2, Social Science: History & Politics/Geography) with First Term (Paper 1 40, Paper 2 40, Written Total 80, Internal Evaluation 20 = Total 100), Second Term (Paper 1 40, Paper 2 40, Written Total 80, Internal Evaluation 20 = Total 100), Annual Total (200), Average (100) and Grade.';
        if (updatedTmpl.sections && updatedTmpl.sections[1]) {
          updatedTmpl.sections[1].text = 'MASTER MARK LIST - CLASS IX & X (DUAL PAPER SUBJECT)';
        }
      } else if (tmpl.id === 'tmpl_class_9_10_lang') {
        updatedTmpl.name = 'Class 9–10 Dual Language Template';
        updatedTmpl.nameUr = 'کلاس ۹ تا ۱۰ ڈوئل لینگویج ٹیمپلیٹ';
        updatedTmpl.templateCategory = 'Class 9-10 Dual Language';
        updatedTmpl.description = 'Official Class 9 and 10 Master Mark List layout for Dual Language composite subjects (Hindi & Marathi) with Hindi (1st & 2nd Term Written 80, Internal 20 = 100) and Marathi (1st & 2nd Term Written 80, Internal 20 = 100), Grand Total (200), Average (100) and Grade.';
        if (updatedTmpl.sections && updatedTmpl.sections[1]) {
          updatedTmpl.sections[1].text = 'MASTER MARK LIST - CLASS IX & X (DUAL LANGUAGE)';
        }
      }

      const isLang = tmpl.id === 'tmpl_class_1_8_language';
      let modified = false;
      const newHeaders = (updatedTmpl.headers || []).map((h: any) => {
        if (isLang) {
          if (h.id === 'h9' && h.maxMarks !== 10) {
            modified = true;
            return { ...h, maxMarks: 10, baseName: 'Formative Total', text: 'Formative Total' };
          }
          if (h.id === 'h11' && h.maxMarks !== 40) {
            modified = true;
            return { ...h, maxMarks: 40, baseName: 'Summative Total', text: 'Summative Total' };
          }
          if (h.id === 'h12' && h.maxMarks !== 50) {
            modified = true;
            return { ...h, maxMarks: 50, baseName: 'Grand Total', text: 'Grand Total' };
          }
        }
        return h;
      });

      if (modified) {
        updatedTmpl.headers = newHeaders;
      }

      return rebuildTemplateFormulas(updatedTmpl);
    });

    defaultTemplatesList.forEach((defTmpl) => {
      if (!updatedList.some((t: any) => t.id === defTmpl.id)) {
        updatedList.push(defTmpl);
      }
    });

    return updatedList;
  };

  const [templatesList, setTemplatesList] = useState<any[]>(() => {
    const saved = localStorage.getItem('erp_master_templates');
    const parsed = saved ? JSON.parse(saved) : defaultTemplatesList;
    const migrated = migrateTemplatesList(parsed);
    try {
      localStorage.setItem('erp_master_templates', JSON.stringify(migrated));
    } catch (e) {
      console.warn('Failed to save migrated templates to localStorage', e);
    }
    return migrated;
  });

  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  
  // Selection states for Excel editor
  const [selectedCell, setSelectedCell] = useState<{ row: number; colId: string } | null>(null);
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState<number | null>(null);

  // Active Ribbon Tab
  const [activeRibbonTab, setActiveRibbonTab] = useState<'home' | 'layout' | 'page' | 'formulas' | 'backups'>('home');

  // Confirmation dialog state
  const [showSaveWarningModal, setShowSaveWarningModal] = useState<boolean>(false);

  // State for Column Insertion Modal
  const [showInsertColModal, setShowInsertColModal] = useState<boolean>(false);
  const [insertColConfig, setInsertColConfig] = useState({
    colType: 'assessment', // 'identity' | 'assessment'
    identityType: 'roll', // 'roll' | 'gr' | 'name' | 'subject_label' | 'custom'
    customHeaderName: '',
    assessmentHeaderName: 'New Assessment',
    maxMarks: 10,
    assessmentType: 'Formative',
    insertPosition: 'left', // 'left' | 'right'
    mergeEachStudentBlock: true
  });

  // Backups loaded from localStorage
  const [backups, setBackups] = useState<Record<string, any[]>>(() => {
    const saved = localStorage.getItem('erp_master_templates_backups');
    return saved ? JSON.parse(saved) : {};
  });

  // Excel-Style Spreadsheet helper functions
  const handleUpdateHeaderAssessment = (headerId: string, updates: { baseName?: string; maxMarks?: number | undefined; assessmentType?: string }) => {
    setEditingTemplate((prev: any) => {
      if (!prev) return prev;
      const updatedHeaders = (prev.headers || []).map((h: any) => {
        if (h.id !== headerId) return h;
        
        const nextHeader = { ...h };
        if (updates.baseName !== undefined) nextHeader.baseName = updates.baseName;
        if ('maxMarks' in updates) nextHeader.maxMarks = updates.maxMarks;
        if (updates.assessmentType !== undefined) nextHeader.assessmentType = updates.assessmentType;
        
        // Compute updated text
        const base = nextHeader.baseName !== undefined ? nextHeader.baseName : getHeaderBaseName(h);
        const max = nextHeader.maxMarks;
        
        const lowerBase = base.toLowerCase();
        const isMeta = lowerBase.includes('roll') || lowerBase.includes('g.r.') || lowerBase.includes('name') || lowerBase.includes('sign') || lowerBase.includes('remark') || lowerBase.includes('signature') || !!h.formula;
        
        if (!isMeta && nextHeader.assessmentType !== 'None' && prev.id !== 'tmpl_class_1_8_language' && max !== undefined) {
          nextHeader.text = `${base} [Max: ${max}]`;
        } else {
          nextHeader.text = base;
        }
        
        return nextHeader;
      });

      return rebuildTemplateFormulas({ ...prev, headers: updatedHeaders });
    });
  };

  const handleRenameHeader = (headerId: string, newText: string) => {
    const maxMarksMatch = newText.match(/\[Max:\s*(\d+)\]/i) || newText.match(/Max:\s*(\d+)/i);
    const maxMarks = maxMarksMatch ? parseInt(maxMarksMatch[1], 10) : undefined;
    const baseName = maxMarksMatch 
      ? newText.replace(/\[Max:\s*\d+\]/i, '').replace(/Max:\s*\d+/i, '').trim()
      : newText;

    handleUpdateHeaderAssessment(headerId, { 
      baseName, 
      ...(maxMarks !== undefined ? { maxMarks } : {}) 
    });
  };

  const handleUpdateColWidth = (headerId: string, width: string) => {
    setEditingTemplate((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        headers: (prev.headers || []).map((h: any) => 
          h.id === headerId ? { ...h, width } : h
        )
      };
    });
  };

  const handleUpdateColAlign = (headerId: string, align: 'left' | 'center' | 'right') => {
    setEditingTemplate((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        headers: (prev.headers || []).map((h: any) => 
          h.id === headerId ? { ...h, align } : h
        )
      };
    });
  };

  const handleUpdateColFont = (headerId: string, font: string) => {
    setEditingTemplate((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        headers: (prev.headers || []).map((h: any) => 
          h.id === headerId ? { ...h, font } : h
        )
      };
    });
  };

  const handleInsertColumnConfirmed = () => {
    if (!selectedColumnId || !editingTemplate) return;
    const selIdx = editingTemplate.headers.findIndex((h: any) => h.id === selectedColumnId);
    if (selIdx === -1) return;

    const isId = insertColConfig.colType === 'identity';
    const newColId = `h_new_${Date.now()}`;
    
    let newCol: any = {
      id: newColId,
      width: isId ? (insertColConfig.identityType === 'name' ? '220px' : '100px') : '110px',
      align: isId ? (insertColConfig.identityType === 'name' ? 'left' : 'center') : 'center',
      font: isId ? 'font-mono' : 'font-sans',
      border: 'border-r border-slate-300'
    };

    if (isId) {
      const headerName = insertColConfig.customHeaderName || (
        insertColConfig.identityType === 'roll' ? 'Roll No' :
        insertColConfig.identityType === 'gr' ? 'G.R. No.' :
        insertColConfig.identityType === 'name' ? 'Student Name' :
        insertColConfig.identityType === 'subject_label' ? 'Language / Row' :
        'Custom Field'
      );
      newCol.text = headerName;
      newCol.baseName = headerName;
      newCol.isIdentity = true;
      newCol.identityType = insertColConfig.identityType;
      newCol.mergeEachStudentBlock = insertColConfig.mergeEachStudentBlock;
    } else {
      const baseName = insertColConfig.assessmentHeaderName || 'New Assessment';
      const max = insertColConfig.maxMarks || 10;
      newCol.baseName = baseName;
      newCol.maxMarks = max;
      newCol.assessmentType = insertColConfig.assessmentType;
      newCol.text = editingTemplate.id === 'tmpl_class_1_8_language' ? baseName : `${baseName} [Max: ${max}]`;
    }

    const updatedHeaders = [...editingTemplate.headers];
    const spliceIdx = insertColConfig.insertPosition === 'left' ? selIdx : selIdx + 1;
    updatedHeaders.splice(spliceIdx, 0, newCol);

    // Recalculate dependent formula totals
    const finalHeaders = updatedHeaders.map((h: any) => {
      if (h.formula && h.formula.trim().toUpperCase().startsWith('SUM(')) {
        let totalMax = 0;
        updatedHeaders.forEach((other: any) => {
          if (!other.formula && !isMetadataColumn(other) && !other.isIdentity) {
            totalMax += other.maxMarks !== undefined ? other.maxMarks : getHeaderMaxMarks(other);
          }
        });
        const base = h.baseName !== undefined ? h.baseName : getHeaderBaseName(h);
        return {
          ...h,
          text: editingTemplate.id === 'tmpl_class_1_8_language' ? base : `${base} [Max: ${totalMax}]`,
          maxMarks: totalMax
        };
      }
      return h;
    });

    // Automatically adjust print area bounds
    const lastColLetter = String.fromCharCode(64 + finalHeaders.length);
    const pageSetup = {
      ...(editingTemplate.pageSetup || {}),
      printArea: `A:${lastColLetter}`
    };

    saveAndSyncEditingTemplate({
      ...editingTemplate,
      headers: finalHeaders,
      pageSetup
    });
  };

  const handleUpdateColBorder = (headerId: string, borderClass: string) => {
    setEditingTemplate((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        headers: (prev.headers || []).map((h: any) => 
          h.id === headerId ? { ...h, border: borderClass } : h
        )
      };
    });
  };

  const handleUpdateColFormula = (headerId: string, formula: string) => {
    setEditingTemplate((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        headers: (prev.headers || []).map((h: any) => 
          h.id === headerId ? { ...h, formula } : h
        )
      };
    });
  };

  const handleUpdateRowHeight = (rowNum: number, height: number) => {
    setEditingTemplate((prev: any) => {
      if (!prev) return prev;
      const updatedHeights = { ...(prev.rowHeights || {}), [String(rowNum)]: height };
      return { ...prev, rowHeights: updatedHeights };
    });
  };

  const handleUpdateSection = (index: number, text: string, className?: string) => {
    setEditingTemplate((prev: any) => {
      if (!prev) return prev;
      const updatedSections = [...prev.sections];
      updatedSections[index] = { 
        ...updatedSections[index], 
        text, 
        className: className !== undefined ? className : updatedSections[index].className 
      };
      return { ...prev, sections: updatedSections };
    });
  };

  const saveAndSyncEditingTemplate = (nextTemplate: any) => {
    const rebuilt = rebuildTemplateFormulas(nextTemplate);
    setEditingTemplate(rebuilt);
    setTemplatesList((prevList: any[]) => {
      const updatedList = prevList.map((t: any) => 
        t.id === rebuilt.id ? JSON.parse(JSON.stringify(rebuilt)) : t
      );
      localStorage.setItem('erp_master_templates', JSON.stringify(updatedList));
      return updatedList;
    });
    if (LocalERPDatabase.saveMarkListTemplate) {
      LocalERPDatabase.saveMarkListTemplate(rebuilt);
    }
  };

  const handleSaveMasterTemplateChanges = () => {
    if (!selectedTemplate || !editingTemplate) return;

    // 1. Create a backup of the PREVIOUS master template state (the one currently in templatesList)
    const originalTmpl = templatesList.find((t: any) => t.id === selectedTemplate.id);
    if (originalTmpl) {
      const timestamp = new Date().toLocaleString();
      const newBackup = {
        timestamp,
        editorName: user.name,
        templateState: JSON.parse(JSON.stringify(originalTmpl))
      };
      const updatedBackups = {
        ...backups,
        [selectedTemplate.id]: [newBackup, ...(backups[selectedTemplate.id] || [])]
      };
      setBackups(updatedBackups);
      localStorage.setItem('erp_master_templates_backups', JSON.stringify(updatedBackups));
    }

    // 2. Save the edited draft to templatesList
    const updatedList = templatesList.map((t: any) => 
      t.id === selectedTemplate.id ? JSON.parse(JSON.stringify(editingTemplate)) : t
    );
    setTemplatesList(updatedList);
    localStorage.setItem('erp_master_templates', JSON.stringify(updatedList));

    // 3. Synchronize with the main LocalERPDatabase
    if (LocalERPDatabase.saveMarkListTemplate) {
      // Legacy editor remains a local compatibility surface, but Teacher Result uses the cloud-published Master as source of truth.
      LocalERPDatabase.saveMarkListTemplate(editingTemplate);
    }
    void publishLegacyClerkMasterTemplate(editingTemplate).then((cloudResult) => {
      if (!cloudResult.ok) console.warn('[Result Master cloud publish]', cloudResult.message);
    });

    // 4. Log audit trail entry
    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role,
      "Edit Master Template",
      "Result Management",
      `Clerk saved Master Template formatting & structure changes for: ${editingTemplate.name} (${editingTemplate.id}). Backup auto-created.`
    );

    setSelectedTemplate(editingTemplate);
    setUploadSuccess(true);
    setShowSaveWarningModal(false);
  };

  // Handler for replaces
  const handleReplaceTemplate = (e: React.ChangeEvent<HTMLInputElement>, templateId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingTemplateId(templateId);
    setUploadSuccess(false);

    // Simulate upload delay
    setTimeout(() => {
      setUploadingTemplateId(null);
      setUploadSuccess(true);
      
      // Update the current draft state text to reflect file upload
      setEditingTemplate((prev: any) => {
        if (!prev) return prev;
        const updatedSections = [...prev.sections];
        if (updatedSections[1]) {
          updatedSections[1] = {
            ...updatedSections[1],
            text: `IMPORTED TEMPLATE WORKSPACE (FILE: ${file.name.toUpperCase()})`
          };
        }
        return { ...prev, sections: updatedSections };
      });

      // Log audit trail
      LocalERPDatabase.addAuditLog(
        user.id,
        user.name,
        user.role,
        "Replace Template",
        "Result Management",
        `Clerk replaced template structure for: ${templateId === 'tmpl_class_1_8_regular' ? 'Class 1–8 Regular' : 'Class 1–8 Hindi/Marathi'} (File: ${file.name})`
      );
    }, 1500);
  };

  // Handler for downloads
  const handleDownloadTemplate = (template: any) => {
    if (!template) return;
    const headers = template.headers || [];
    const sections = template.sections || [];
    const csvHeader = headers.map((h: any) => `"${h.text}"`).join(",");
    const csvTitleRow = `"${sections[0]?.text || ''}"${",".repeat(Math.max(0, headers.length - 1))}`;
    const csvSubtitleRow = `"${sections[1]?.text || ''}"${",".repeat(Math.max(0, headers.length - 1))}`;
    const csvContent = [csvTitleRow, csvSubtitleRow, csvHeader].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${template.id || 'template'}_master_layout.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Log audit trail
    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role,
      "Download Template",
      "Result Management",
      `Clerk downloaded CSV structure for: ${template.name}`
    );
  };

  // Translations
  const t = {
    en: {
      title: "Result Management",
      subtitle: "Official Academic Evaluation & Grading System",
      roleLabel: "Workspace Role",
      roles: {
        headmaster: "Headmaster Dashboard",
        clerk: "Administrative Clerk Dashboard",
        classTeacher: `Class Teacher Dashboard (${assignedClassName})`,
        subjectTeacher: "Subject Teacher Dashboard",
        unauthorized: "Access Restricted"
      },
      common: {
        underDev: "Under Development",
        notAvailable: "Not implemented in this phase",
        close: "Close Section",
        verified: "Verified",
        classLabel: "Class",
        sectionTitle: "Academic Year 2026-27 Print Center Overview"
      },
      headmaster: {
        completed: { title: "Completed", desc: "Mark lists locked & signed-off", count: "18 Lists" },
        draft: { title: "Draft", desc: "In-progress teacher grade sheets", count: "4 Lists" },
        pending: { title: "Pending", desc: "Uninitiated evaluations", count: "6 Lists" },
        returned: { title: "Returned", desc: "Sent back for revision", count: "2 Lists" },
        progress: { title: "Overall Progress", desc: "School submission matrix", count: "60%" },
        detailHeader: "Evaluation Status Details",
        sections: {
          completed: "Completed Mark Lists (Verified by Class Teachers & Headmaster)",
          draft: "Draft Mark Lists (Saved by Subject Teachers)",
          pending: "Pending Mark Lists (Awaiting initiation)",
          returned: "Returned Mark Lists (Awaiting correction by Subject Teachers)",
          progress: "Overall School Progress Analysis"
        },
        noRecords: "No corresponding records in this filter."
      },
      clerk: {
        col1: { title: "Mark Lists Ready for Print", desc: "Finalized subject-wise grade sheets signed by Subject Teachers." },
        col2: { title: "Result Books Ready for Print", desc: "Consolidated class division standings ready for registry archives." },
        col3: { title: "Progress Cards Ready for Print", desc: "A4 Report cards compiled with attendance and remarks for distribution." }
      },
      classTeacher: {
        tabs: {
          subject_mark_list: "Subject Mark List",
          mark_list: "Class Mark List"
        },
        panelTitle: `Division ${assignedClassName} Performance Status`,
        desc: "Monitor evaluation statuses, class GPA standing and verify reports prior to final print-ready submission.",
        subjectHeader: "Subject Evaluation Status",
        stats: "12 of 15 Subjects Submitted"
      },
      subjectTeacher: {
        cards: {
          pending: { title: "Pending Subjects", count: "3 Subjects", desc: "Awaiting marks entry" },
          draft: { title: "Draft Mark Lists", count: "1 Draft", desc: "Saved locally but not submitted" },
          submitted: { title: "Submitted Mark Lists", count: "6 Submissions", desc: "Locked and sent to Class Teacher" },
          returned: { title: "Returned for Correction", count: "1 List", desc: "Requires revision" }
        }
      }
    },
    hi: {
      title: "परिणाम प्रबंधन",
      subtitle: "आधिकारिक शैक्षणिक मूल्यांकन और ग्रेडिंग प्रणाली",
      roleLabel: "कार्यक्षेत्र भूमिका",
      roles: {
        headmaster: "प्रधानाध्यापक डैशबोर्ड",
        clerk: "प्रशासनिक क्लर्क डैशबोर्ड",
        classTeacher: `कक्षा शिक्षक डैशबोर्ड (${assignedClassName})`,
        subjectTeacher: "विषय शिक्षक डैशबोर्ड",
        unauthorized: "पहुंच प्रतिबंधित"
      },
      common: {
        underDev: "विकास के अधीन",
        notAvailable: "इस चरण में लागू नहीं किया गया",
        close: "अनुभाग बंद करें",
        verified: "सत्यापित",
        classLabel: "कक्षा",
        sectionTitle: "शैक्षणिक वर्ष 2026-27 प्रिंट सेंटर अवलोकन"
      },
      headmaster: {
        completed: { title: "पूरा हुआ", desc: "अंक सूचियां लॉक और हस्ताक्षरित", count: "18 सूचियां" },
        draft: { title: "ड्राफ्ट", desc: "प्रगति में शिक्षक ग्रेड शीट", count: "4 सूचियां" },
        pending: { title: "लंबित", desc: "अनरंभित मूल्यांकन", count: "6 सूचियां" },
        returned: { title: "वापस किया गया", desc: "संशोधन के लिए वापस भेजा गया", count: "2 सूचियां" },
        progress: { title: "कुल प्रगति", desc: "स्कूल सबमिशन मैट्रिक्स", count: "60%" },
        detailHeader: "मूल्यांकन स्थिति विवरण",
        sections: {
          completed: "पूर्ण अंक सूचियां (कक्षा शिक्षकों और प्रधानाध्यापक द्वारा सत्यापित)",
          draft: "ड्राफ्ट अंक सूचियां (विषय शिक्षकों द्वारा सहेजी गई)",
          pending: "लंबित अंक सूचियां (शुरुआत की प्रतीक्षा में)",
          returned: "वापस की गई अंक सूचियां (विषय शिक्षकों द्वारा सुधार की प्रतीक्षा में)",
          progress: "समग्र स्कूल प्रगति विश्लेषण"
        },
        noRecords: "इस फ़िल्टर में कोई रिकॉर्ड उपलब्ध नहीं है।"
      },
      clerk: {
        col1: { title: "प्रिंट के लिए तैयार अंक सूचियां", desc: "विषय शिक्षकों द्वारा हस्ताक्षरित अंतिम विषय-वार ग्रेड शीट।" },
        col2: { title: "प्रिंट के लिए तैयार परिणाम पुस्तिकाएं", desc: "रजिस्ट्री अभिलेखागार के लिए समेकित कक्षा प्रभाग स्थिति।" },
        col3: { title: "प्रिंट के लिए तैयार प्रगति पत्रक", desc: "वितरण के लिए उपस्थिति और टिप्पणियों के साथ संकलित ए4 रिपोर्ट कार्ड।" }
      },
      classTeacher: {
        tabs: {
          subject_mark_list: "विषय अंक सूची",
          mark_list: "कक्षा अंक सूची"
        },
        panelTitle: `प्रभाग ${assignedClassName} प्रदर्शन स्थिति`,
        desc: "मूल्यांकन स्थितियों, कक्षा जीपीए स्थिति की निगरानी करें और अंतिम प्रिंट-तैयार सबमिशन से पहले रिपोर्ट सत्यापित करें।",
        subjectHeader: "विषय मूल्यांकन स्थिति",
        stats: "15 में से 12 विषय सबमिट किए गए"
      },
      subjectTeacher: {
        cards: {
          pending: { title: "लंबित विषय", count: "3 विषय", desc: "अंक लेजर प्रविष्टि की प्रतीक्षा में" },
          draft: { title: "ड्राफ्ट अंक सूचियां", count: "1 ड्राफ्ट", desc: "स्थानीय रूप से सहेजा गया लेकिन सबमिट नहीं किया गया" },
          submitted: { title: "जमा की गई अंक सूचियां", count: "6 सबमिशन", desc: "लॉक किया गया और कक्षा शिक्षक को भेजा गया" },
          returned: { title: "सुधार के लिए वापस", count: "1 सूची", desc: "संशोधन की आवश्यकता है" }
        }
      }
    },
    ur: {
      title: "انتظامِ نتائج",
      subtitle: "سرکاری تعلیمی تشخیصی اور گریڈنگ کا نظام",
      roleLabel: "ورک اسپیس رول",
      roles: {
        headmaster: "ڈیش بورڈ ہیڈ ماسٹر",
        clerk: "ڈیش بورڈ انتظامی کلرک",
        classTeacher: `ڈیش بورڈ کلاس ٹیچر (${assignedClassName})`,
        subjectTeacher: "ڈیش بورڈ مضمون کے معلم",
        unauthorized: "رسائی ممنوع ہے"
      },
      common: {
        underDev: "زیرِ تعمیر",
        notAvailable: "اس مرحلے میں دستیاب نہیں ہے",
        close: "سیکشن بند کریں",
        verified: "تصدیق شدہ",
        classLabel: "کلاس",
        sectionTitle: "تعلیمی سال 2026-27 کا پرنٹ سینٹر کا جائزہ"
      },
      headmaster: {
        completed: { title: "کامیاب فائنل", desc: "مارک لسٹ فریز اور مقفل شدہ", count: "18 فائلیں" },
        draft: { title: "ڈرافٹ لسٹیں", desc: "زیرِ تکمیل مارک شیٹیں", count: "4 فائلیں" },
        pending: { title: "غیر شروع شدہ", desc: "جن کے نمبر درج نہیں ہوئے", count: "6 فائلیں" },
        returned: { title: "اصلاح کیلئے واپس", desc: "نظرثانی کیلئے واپس بھیجی گئیں", count: "2 فائلیں" },
        progress: { title: "مجموعی پیشرفت", desc: "اسکول کی مجموعی کارکردگی", count: "60%" },
        detailHeader: "تفصیلی امتحانی صورتحال",
        sections: {
          completed: "کامیاب اور منظور شدہ مارک لسٹیں (کلاس ٹیچر اور ہیڈ ماسٹر سے تصدیق شدہ)",
          draft: "ڈرافٹ لسٹیں (مضمون کے اساتذہ کی طرف سے محفوظ شدہ)",
          pending: "غیر شروع شدہ مارک لسٹیں (درج ہونے کا انتظار ہے)",
          returned: "اصلاح کیلئے واپس کردہ لسٹیں (اساتذہ کی طرف سے تصحیح درکار ہے)",
          progress: "پورے اسکول کی مجموعی تعلیمی کارکردگی کا جائزہ"
        },
        noRecords: "اس فلٹر کے مطابق کوئی معلومات دستیاب نہیں ہے۔"
      },
      clerk: {
        col1: { title: "پرنٹ کے لیے تیار مارک لسٹیں", desc: "مضمون کے اساتذہ کے دستخطوں کے ساتھ تصدیق شدہ مارک شیٹس۔" },
        col2: { title: "پرنٹ کے لیے تیار رزلٹ بکس", desc: "رجسٹری اور آرکائیو کے لیے کلاسز کے مجموعی نتائج کا فائنل ریکارڈ۔" },
        col3: { title: "پرنٹ کے لیے تیار پروگریس کارڈز", desc: "تقسیم کے لیے حاضری اور ریمارکس کے ساتھ تیار کردہ A4 پروگریس کارڈز۔" }
      },
      classTeacher: {
        tabs: {
          subject_mark_list: "مضمون مارک لسٹ",
          mark_list: "کلاس مارک لسٹ"
        },
        panelTitle: `ڈویژن ${assignedClassName} کی مجموعی پیش رفت`,
        desc: "امتحانی نتائج، کلاس جی پی اے کی نگرانی کریں اور پرنٹ سے قبل فائنل ریکارڈ کی تصدیق کریں۔",
        subjectHeader: "مضمون وار نتائج کی صورتحال",
        stats: "15 میں سے 12 مضامین جمع شدہ"
      },
      subjectTeacher: {
        cards: {
          pending: { title: "غیر مکمل مضامین", count: "3 مضامین", desc: "نمبرات کے اندراج کا انتظار ہے" },
          draft: { title: "ڈرافٹ مارک لسٹیں", count: "1 ڈرافٹ", desc: "محفوظ شدہ لیکن ابھی جمع نہیں کروایا گیا" },
          submitted: { title: "جمع شدہ مارک لسٹیں", count: "6 فائلیں", desc: "کلاس ٹیچر کو جمع اور لاک کر دی گئیں" },
          returned: { title: "اصلاح کے لیے واپس", count: "1 لسٹ", desc: "دوبارہ نظرثانی اور درستگی درکار ہے" }
        }
      }
    }
  }[lang] || {
    en: {
      title: "Result Management",
      subtitle: "Official Academic Evaluation & Grading System",
      roleLabel: "Workspace Role",
      roles: {
        headmaster: "Headmaster Dashboard",
        clerk: "Administrative Clerk Dashboard",
        classTeacher: `Class Teacher Dashboard (${assignedClassName})`,
        subjectTeacher: "Subject Teacher Dashboard",
        unauthorized: "Access Restricted"
      },
      common: {
        underDev: "Under Development",
        notAvailable: "Not implemented in this phase",
        close: "Close Section",
        verified: "Verified",
        classLabel: "Class",
        sectionTitle: "Academic Year 2026-27 Print Center Overview"
      },
      headmaster: {
        completed: { title: "Completed", desc: "Mark lists locked & signed-off", count: "18 Lists" },
        draft: { title: "Draft", desc: "In-progress teacher grade sheets", count: "4 Lists" },
        pending: { title: "Pending", desc: "Uninitiated evaluations", count: "6 Lists" },
        returned: { title: "Returned", desc: "Sent back for revision", count: "2 Lists" },
        progress: { title: "Overall Progress", desc: "School submission matrix", count: "60%" },
        detailHeader: "Evaluation Status Details",
        sections: {
          completed: "Completed Mark Lists (Verified by Class Teachers & Headmaster)",
          draft: "Draft Mark Lists (Saved by Subject Teachers)",
          pending: "Pending Mark Lists (Awaiting initiation)",
          returned: "Returned Mark Lists (Awaiting correction by Subject Teachers)",
          progress: "Overall School Progress Analysis"
        },
        noRecords: "No corresponding records in this filter."
      },
      clerk: {
        col1: { title: "Mark Lists Ready for Print", desc: "Finalized subject-wise grade sheets signed by Subject Teachers." },
        col2: { title: "Result Books Ready for Print", desc: "Consolidated class division standings ready for registry archives." },
        col3: { title: "Progress Cards Ready for Print", desc: "A4 Report cards compiled with attendance and remarks for distribution." }
      },
      classTeacher: {
        tabs: {
          subject_mark_list: "Subject Mark List",
          mark_list: "Class Mark List"
        },
        panelTitle: `Division ${assignedClassName} Performance Status`,
        desc: "Monitor evaluation statuses, class GPA standing and verify reports prior to final print-ready submission.",
        subjectHeader: "Subject Evaluation Status",
        stats: "12 of 15 Subjects Submitted"
      },
      subjectTeacher: {
        cards: {
          pending: { title: "Pending Subjects", count: "3 Subjects", desc: "Awaiting marks entry" },
          draft: { title: "Draft Mark Lists", count: "1 Draft", desc: "Saved locally but not submitted" },
          submitted: { title: "Submitted Mark Lists", count: "6 Submissions", desc: "Locked and sent to Class Teacher" },
          returned: { title: "Returned for Correction", count: "1 List", desc: "Requires revision" }
        }
      }
    }
  }.en;

  // Render proper view depending on role
  if (activeEditingMarkList) {
    const { classId, division, subjectName, examName, template, lockState } = activeEditingMarkList;
    const isLocked = lockState?.isLocked || false;
    const isHindiMarathi = template?.id === 'tmpl_class_1_8_language' || template?.id === 'tmpl_class_9_10_lang' || template?.templateType === 'Hindi_Marathi';
    
    // Calculate total max marks by summing max marks of all non-metadata, formula-less headers
    let maxTotal = 0;
    (template?.headers || []).forEach((h: any) => {
      const isMetadata = h.text.toLowerCase().includes('roll') || 
                         h.text.toLowerCase().includes('g.r.') || 
                         h.text.toLowerCase().includes('name') || 
                         h.text.toLowerCase().includes('total') || 
                         h.text.toLowerCase().includes('grade') || 
                         h.text.toLowerCase().includes('sign') || 
                         h.text.toLowerCase().includes('remark');
      if (!isMetadata && !h.formula) {
        maxTotal += getHeaderMaxMarks(h);
      }
    });

    return (
      <div className={`space-y-6 animate-fade-in font-sans pb-12 ${isUrdu ? 'rtl text-right' : 'ltr text-left'}`} id="editable-spreadsheet-view">
        
        {/* Custom Confirmation Modal for Spreadsheet View */}
        {confirmModal?.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-slate-200 overflow-hidden animate-scale-up">
              <div className="p-6 space-y-4 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-black text-slate-800 tracking-tight">
                    {confirmModal.title}
                  </h3>
                </div>
                <p className="text-slate-600 text-xs leading-relaxed font-sans font-medium">
                  {confirmModal.message}
                </p>
              </div>
              <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="px-4 py-2 text-slate-500 hover:text-slate-850 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  {isUrdu ? "منسوخ کریں" : "Cancel"}
                </button>
                <button
                  onClick={() => {
                    confirmModal.onConfirm();
                    setConfirmModal(null);
                  }}
                  className={`px-4 py-2 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-sm transition-all cursor-pointer ${
                    confirmModal.confirmClass || "bg-rose-600 hover:bg-rose-500"
                  }`}
                >
                  {confirmModal.confirmText || (isUrdu ? "تصدیق کریں" : "Confirm")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Spreadsheet Header / Control Panel */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 text-left">
            <button
              onClick={() => setActiveEditingMarkList(null)}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>←</span> {isUrdu ? "ڈیش بورڈ پر واپس جائیں" : "Back to Dashboard"}
            </button>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                {examName}
              </span>
              <span className="bg-slate-100 text-slate-700 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-slate-200">
                {classId} - {division}
              </span>
              <span className="bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-indigo-100">
                {subjectName}
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">
              {isUrdu ? "نمبرات کا باضابطہ اندراج اور اپڈیٹ" : "Official Mark Entry Worksheet"}
            </h2>
          </div>

          <div className="flex items-center gap-3 self-stretch sm:self-auto flex-wrap no-print">
            <button
              onClick={() => setActiveEditingMarkList(null)}
              className="px-4 py-2.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-black uppercase tracking-wide rounded-xl transition-all cursor-pointer"
            >
              {isUrdu ? "منسوخ کریں" : "Cancel"}
            </button>

            <button
              type="button"
              onClick={() => printSectionById('result-mark-list-worksheet-print', `${subjectName} · ${examName} Mark List`)}
              className="px-4 py-2.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-black uppercase tracking-wide rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              {isUrdu ? "پرنٹ کریں" : "Print Mark List"}
            </button>



            {!activeEditingMarkList.readOnly && !isLocked && (
              <>
                <button
                  onClick={() => handleSaveMarks(false)}
                  className="px-4 py-2.5 border border-slate-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-black uppercase tracking-wide rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Clock className="w-4 h-4 text-indigo-500" />
                  {isUrdu ? "ڈرافٹ محفوظ کریں" : "Save Draft"}
                </button>

                <button
                  onClick={() => {
                    const isCorrection = lockState?.status === 'Returned' || lockState?.status === 'Returned for Correction';
                    setConfirmModal({
                      isOpen: true,
                      title: isCorrection ? "Resubmit Mark List" : "Submit Mark List",
                      message: isCorrection
                        ? "Are you sure you want to resubmit this corrected mark list? It will be locked again and sent back to the Class Teacher review queue."
                        : "Are you sure you want to submit this mark list? Once submitted, it will be locked and sent to the Class Teacher for review. No further edits can be made unless unlocked by the Headmaster.",
                      onConfirm: () => handleSaveMarks(true)
                    });
                  }}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wide rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>
                    {lockState?.status === 'Returned' || lockState?.status === 'Returned for Correction'
                      ? (isUrdu ? "دوبارہ جمع کرائیں" : "Resubmit")
                      : (isUrdu ? "کلاس ریویو کے لیے جمع کرائیں" : "Submit to Class Review")}
                  </span>
                </button>
              </>
            )}

            {(isLocked || lockState?.status === 'Approved') && (!activeEditingMarkList.readOnly || !isClassTeacher) && (
              <span className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 border ${
                lockState?.status === 'Approved' 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                {lockState?.status === 'Approved' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    {isUrdu ? "منظور شدہ اور محفوظ" : "Approved & Sent to Result Book"}
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-slate-400" />
                    {isUrdu ? "مارک لسٹ فریز ہے" : "Locked / Under Review"}
                  </>
                )}
              </span>
            )}
          </div>
        </div>

        {/* TEMPLATE RUNTIME VERIFICATION LOG */}
        <div id="template-runtime-verification-log" className="bg-slate-900 text-slate-100 rounded-2xl p-5 border border-slate-800 shadow-lg space-y-3 font-mono text-xs text-left no-print">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <h4 className="text-xs font-black tracking-widest text-slate-400 uppercase">
                Template Runtime Verification Log
              </h4>
            </div>
            <span className="text-[10px] bg-slate-850 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-black uppercase">
              PASS
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2.5 gap-x-6">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Selected Subject ID</span>
              <span className="text-slate-200 font-medium">{activeEditingMarkList.subjectId || "N/A"}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Selected Subject Name</span>
              <span className="text-slate-200 font-medium">{activeEditingMarkList.subjectName}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Selected Template ID</span>
              <span className="text-slate-200 font-medium text-emerald-400 font-bold">{template.id}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Selected Template Type</span>
              <span className="text-slate-200 font-medium">{template.templateType || template.name || "Hindi/Marathi Language Template"}</span>
            </div>
            <div className="md:col-span-2">
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Template Generation Mode / Source</span>
              <span className="text-slate-200 font-medium">{activeEditingMarkList.templateSource || "Newly Generated System Default"}</span>
            </div>
          </div>
        </div>

        {/* Old Regular Hindi/Marathi Template Migration Banner */}
        {activeEditingMarkList.isOldRegularHindiMarathi && (
          <div className="p-5 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-sm font-sans flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-fade-in no-print">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 mt-0.5 sm:mt-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1 text-left">
                <span className="font-extrabold text-amber-950 block text-base">
                  {isUrdu ? "ہندی/مراٹھی زبان کا ٹیمپلیٹ دستیاب ہے" : "Hindi/Marathi Template Update Available"}
                </span>
                <p className="text-xs text-amber-800 leading-relaxed font-sans font-medium max-w-2xl">
                  {isUrdu 
                    ? "یہ مارک لسٹ فی الحال ریگولر ٹیمپلیٹ استعمال کر رہی ہے۔ آپ اپنے درج کردہ نمبرات کو محفوظ رکھتے ہوئے اسے نئے آفیشل ہندی/مراٹھی زبان کے ٹیمپلیٹ میں اپ ڈیٹ کر سکتے ہیں۔"
                    : "This mark list was previously generated using the Regular Subject Template. You can safely convert it to the Class 1–8 Hindi/Marathi Language Template (with listening, speaking, reading, writing components) without losing your entered Written or Oral marks."}
                </p>
              </div>
            </div>
            <button
              onClick={handleRegenerateToLanguageTemplate}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black uppercase tracking-wide rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <RefreshCw className="w-4 h-4 text-white" />
              <span>{isUrdu ? "ہندی/مراٹھی ٹیمپلیٹ کے ساتھ دوبارہ تیار کریں" : "Regenerate Using Assigned Hindi/Marathi Template"}</span>
            </button>
          </div>
        )}

        {/* Save/Submit Success Feedbacks */}
        {saveSuccess && (
          <div className="p-4 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-2xl text-sm font-sans flex items-start gap-2 animate-bounce">
            <CheckCircle2 className="w-4.5 h-4.5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-left">
              <span className="font-extrabold">Draft Saved Successfully!</span>
              <p className="text-xs text-indigo-700/90 leading-relaxed">
                Marks have been persisted securely. You can return and resume entry at any time before final submission.
              </p>
            </div>
          </div>
        )}

        {submitSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-sm font-sans flex items-start gap-2 animate-bounce">
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-left">
              <span className="font-extrabold">{isUrdu ? "مضمون کی مارک لسٹ کامیابی کے ساتھ جمع کرائی گئی۔" : "Subject Mark List submitted successfully."}</span>
              <p className="text-xs text-emerald-700/90 leading-relaxed">
                {isUrdu 
                  ? "مارک شیٹ لاک کر دی گئی ہے اور کلاس ٹیچر کے جائزے کے لیے بھیج دی گئی ہے۔" 
                  : "Marksheet locked and successfully cascaded to the Class Teacher review queue."}
              </p>
            </div>
          </div>
        )}

        {/* Highlighted Correction Note Panel */}
        {(lockState?.status === 'Returned' || lockState?.status === 'Returned for Correction') && (
          <div className="p-5 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl text-xs font-sans space-y-3 animate-fade-in relative overflow-hidden shadow-sm text-left">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500"></div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <span className="font-black text-sm uppercase tracking-wide text-rose-800">
                {isUrdu ? "اصلاح کا نوٹ / ہدایت نامہ" : "Returned for Correction Note"}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 pb-2 border-b border-rose-150 font-sans">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-black tracking-wider text-rose-500 block">
                  {isUrdu ? "واپس کرنے والے کلاس ٹیچر:" : "Returned By:"}
                </span>
                <span className="font-extrabold text-slate-800 text-sm">
                  {lockState?.returnedBy || "Class Teacher"}
                </span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-black tracking-wider text-rose-500 block">
                  {isUrdu ? "واپسی کی تاریخ:" : "Returned Date:"}
                </span>
                <span className="font-mono text-slate-700 text-sm font-semibold">
                  {lockState?.returnedAt 
                    ? new Date(lockState.returnedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + new Date(lockState.returnedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                    : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-black tracking-wider text-rose-500 block">
                {isUrdu ? "اصلاح کے ریمارکس:" : "Correction Remarks:"}
              </span>
              <p className="text-slate-800 font-medium leading-relaxed bg-white/60 p-3 rounded-xl border border-rose-100 font-sans italic">
                {lockState?.returnReason || "Please verify the student score entries."}
              </p>
            </div>
          </div>
        )}

        {/* EXCEL SHEET COMPONENT */}
        <div id="result-mark-list-worksheet-print" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="border border-slate-300 rounded-lg overflow-hidden bg-white shadow-sm max-h-[600px] overflow-y-auto overflow-x-auto relative">
            <table className="w-full border-collapse font-sans text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300">
                  <th className="w-10 bg-slate-200 text-slate-500 font-mono text-[10px] text-center border-r border-slate-300 py-1.5 shrink-0 select-none"></th>
                  {(template?.headers || []).map((h: any, idx: number) => {
                    const colLetter = String.fromCharCode(65 + idx);
                    return (
                      <th key={`th_${h.id}`} className="bg-slate-100 text-slate-500 font-mono text-[10px] text-center font-bold border-r border-slate-300 py-1 select-none min-w-[90px]" style={{ width: h.width }}>
                        {colLetter}
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {/* Title and subtitle merged rows */}
                <tr className="bg-white border-b border-slate-200">
                  <td className="bg-slate-100 text-slate-500 font-mono text-[9px] text-center border-r border-slate-300 font-bold">1</td>
                  <td colSpan={template?.headers?.length || 1} className="border-r border-slate-200 px-4 text-center font-sans font-black text-slate-850 text-base tracking-wider bg-slate-50/50 py-2.5">
                    NATIONAL HIGH SCHOOL, TALODA
                  </td>
                </tr>
                <tr className="bg-white border-b border-slate-200">
                  <td className="bg-slate-100 text-slate-500 font-mono text-[9px] text-center border-r border-slate-300 font-bold">2</td>
                  <td colSpan={template?.headers?.length || 1} className="border-r border-slate-200 px-4 text-center font-sans font-bold text-slate-700 text-xs tracking-normal bg-white py-1">
                    {template?.sections?.[1]?.text || `OFFICIAL SUBJECT GRADE SHEET - ${subjectName.toUpperCase()} (${examName.toUpperCase()})`}
                  </td>
                </tr>
                <tr className="bg-white border-b border-slate-200">
                  <td className="bg-slate-100 text-slate-500 font-mono text-[9px] text-center border-r border-slate-300 font-bold">3</td>
                  <td colSpan={template?.headers?.length || 1} className="border-r border-slate-200 px-4 text-center font-mono text-slate-400 text-[10px] py-1 bg-white">
                    {template?.sections?.[2]?.text || `Class Division: ${classId} - ${division} | Academic Year: 2026-27 | Teacher Signature Register`}
                  </td>
                </tr>

                {/* Headers Row */}
                <tr className="bg-slate-100 border-b-2 border-slate-400 font-extrabold text-slate-800 text-center">
                  <td className="bg-slate-100 text-slate-500 font-mono text-[9px] text-center border-r border-slate-300 font-bold">4</td>
                  {(template?.headers || []).map((h: any) => {
                    const isMetadata = h.text.toLowerCase().includes('roll') || 
                                       h.text.toLowerCase().includes('g.r.') || 
                                       h.text.toLowerCase().includes('name') || 
                                       h.text.toLowerCase().includes('total') || 
                                       h.text.toLowerCase().includes('grade') || 
                                       h.text.toLowerCase().includes('sign') || 
                                       h.text.toLowerCase().includes('remark');
                    const maxMarks = getHeaderMaxMarks(h);
                    
                    return (
                      <td key={`lbl_${h.id}`} className="border-r border-slate-300 px-2 py-3 text-center align-middle bg-slate-100/50 relative font-black text-slate-800" style={{ width: h.width }}>
                        <span className="block font-sans font-black text-xs">{h.text}</span>
                        {!isMetadata && !h.formula && activeEditingMarkList?.template?.id !== 'tmpl_class_1_8_language' && (
                          <span className="block text-[9px] text-slate-400 uppercase font-mono font-bold mt-0.5">Max: {maxMarks}</span>
                        )}
                        {h.formula && (
                          <span className="absolute bottom-0.5 right-1 text-[8px] text-emerald-600 bg-emerald-50 font-mono font-bold rounded px-0.5">fx</span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* Student Mark Entry Rows */}

                {isHindiMarathi ? (
                  <LanguageMarkListRenderer
                    template={template}
                    students={markListStudents}
                    sheetScores={sheetScores}
                    isMock={false}
                    editable={true}
                    isLocked={isLocked}
                    onUpdateLanguageMark={updateLanguageMark}
                    evaluateFormulaFn={evaluateFormula}
                    getHeaderMaxMarks={getHeaderMaxMarks}
                  />
                ) : (
                  markListStudents.map((student, rIdx) => {
                    const studentVals = sheetScores[student.id] || {};
                    
                    // Evaluate formulas to get values
                    const evaluatedScores: Record<string, string | number> = { ...studentVals };
                    (template?.headers || []).forEach((h: any) => {
                      if (h.formula) {
                        evaluatedScores[h.id] = evaluateFormula(h.formula, student.id, evaluatedScores, template);
                      }
                    });

                    return (
                      <tr key={student.id} className="hover:bg-slate-50/50 border-b border-slate-200 h-10">
                        <td className="bg-slate-100 text-slate-400 font-mono text-[9px] text-center border-r border-slate-300 font-medium select-none">
                          {rIdx + 5}
                        </td>
                        
                        {(template?.headers || []).map((h: any) => {
                          const lowerText = h.text.toLowerCase();
                          const identityType = h.identityType || '';
                          const isSrNo = identityType === 'srNo' || lowerText.includes('sr.') || lowerText.includes('sr no');
                          const isSeatNo = identityType === 'seatNo' || lowerText.includes('seat') || lowerText.includes('exam seat');
                          const isRollNo = lowerText.includes('roll');
                          const isGrNo = lowerText.includes('g.r.');
                          const isName = identityType === 'name' || lowerText.includes('name');
                          const isSign = lowerText.includes('sign');
                          const isRemarksCol = lowerText.includes('remark');
                          
                          if (isSrNo) {
                            return (
                              <td key={`cell_${student.id}_${h.id}`} className="border-r border-slate-200 text-slate-500 text-center font-mono align-middle">
                                {rIdx + 1}
                              </td>
                            );
                          }
                          if (isSeatNo) {
                            const seatVal = student.examSeatNo || student.seatNo || (student.rollNo ? `S2026-${String(student.rollNo).padStart(3, '0')}` : (student.grNumber || student.admissionNo || `SEAT-${rIdx+1}`));
                            return (
                              <td key={`cell_${student.id}_${h.id}`} className="border-r border-slate-200 font-mono text-center font-bold text-slate-700 align-middle">
                                {seatVal}
                              </td>
                            );
                          }
                          if (isRollNo) {
                            return (
                              <td key={`cell_${student.id}_${h.id}`} className="border-r border-slate-200 text-slate-500 text-center font-mono align-middle">
                                {student.rollNo}
                              </td>
                            );
                          }
                          if (isGrNo) {
                            return (
                              <td key={`cell_${student.id}_${h.id}`} className="border-r border-slate-200 text-slate-400 text-center font-mono align-middle">
                                {student.grNumber}
                              </td>
                            );
                          }
                          if (isName) {
                            return (
                              <td key={`cell_${student.id}_${h.id}`} className="border-r border-slate-200 font-extrabold text-slate-800 pl-3 text-left align-middle">
                                {student.name}
                              </td>
                            );
                          }
                          
                          // Formula columns (like Grand Total, Grade)
                          if (h.formula) {
                            const val = evaluatedScores[h.id] !== undefined ? evaluatedScores[h.id] : '';
                            const isGradeCol = h.formula.includes('GRADE');
                            
                            if (isGradeCol) {
                              const grade = String(val);
                              return (
                                <td key={`cell_${student.id}_${h.id}`} className="border-r border-slate-200 font-black text-center align-middle">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-sans ${
                                    grade === 'E' 
                                      ? 'bg-rose-100 text-rose-800' 
                                      : grade.startsWith('A') 
                                        ? 'bg-emerald-100 text-emerald-800' 
                                        : 'bg-indigo-100 text-indigo-800'
                                  }`}>
                                    {grade || '-'}
                                  </span>
                                </td>
                              );
                            }
                            
                            return (
                              <td key={`cell_${student.id}_${h.id}`} className="border-r border-slate-200 font-mono font-black text-center bg-emerald-50/20 text-emerald-700 text-xs align-middle">
                                {val}
                              </td>
                            );
                          }
                          
                          // Custom editable Remarks input
                          if (isRemarksCol) {
                            return (
                              <td key={`cell_${student.id}_${h.id}`} className="border-r border-slate-200 p-1 align-middle">
                                <input
                                  type="text"
                                  disabled={isLocked}
                                  value={studentRemarks[student.id] || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setStudentRemarks(prev => ({
                                      ...prev,
                                      [student.id]: val
                                    }));
                                  }}
                                  placeholder="e.g. Good Progress"
                                  className="w-full h-8 px-2 font-medium bg-transparent focus:bg-white focus:ring-1 focus:ring-slate-300 focus:outline-none rounded-md transition-all border border-transparent border-b-slate-200 text-left"
                                />
                              </td>
                            );
                          }
                          
                          // Regular editable inputs (scores/marks or teacher sign)
                          const scoreVal = studentVals[h.id] !== undefined ? studentVals[h.id] : '';
                          return (
                            <td key={`cell_${student.id}_${h.id}`} className="border-r border-slate-200 p-1 text-center bg-slate-50/10 align-middle">
                              <input
                                type="text"
                                disabled={isLocked}
                                value={scoreVal}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  // Allow empty, numeric, or special code markers (AB, ML, EX, etc.)
                                  if (val === '' || ['A', 'AB', 'ML', 'EX', 'WH', 'NA'].includes(val.toUpperCase()) || !isNaN(Number(val))) {
                                    const maxVal = getHeaderMaxMarks(h);
                                    if (!isNaN(Number(val)) && Number(val) > maxVal) return;
                                    
                                    setSheetScores(prev => ({
                                      ...prev,
                                      [student.id]: {
                                        ...(prev[student.id] || {}),
                                        [h.id]: val
                                      }
                                    }));
                                  }
                                }}
                                placeholder="-"
                                className="w-full h-8 text-center font-mono font-extrabold bg-transparent focus:bg-white focus:ring-1 focus:ring-amber-400 focus:outline-none rounded-md transition-all border border-transparent border-b-slate-200 focus:border-amber-300"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-400 italic">
            <span>* Entering "AB" or "A" represents Student Absence. Values recalculate totals dynamically on-key-up.</span>
            <span>Columns A through {String.fromCharCode(64 + (template?.headers?.length || 1))} mapped perfectly.</span>
          </div>
        </div>

      </div>
    );
  };

  // Render proper view depending on role
  return (
    <div className={`space-y-6 ${isUrdu ? 'rtl text-right' : 'ltr text-left'}`} id="result-management-module">
      
      {/* Custom Confirmation Modal */}
      {confirmModal?.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-slate-200 overflow-hidden animate-scale-up">
            <div className="p-6 space-y-4 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="text-base font-black text-slate-800 tracking-tight">
                  {confirmModal.title}
                </h3>
              </div>
              <p className="text-slate-600 text-xs leading-relaxed font-sans font-medium">
                {confirmModal.message}
              </p>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 text-slate-500 hover:text-slate-850 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                {isUrdu ? "منسوخ کریں" : "Cancel"}
              </button>
              <button
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className={`px-4 py-2 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-sm transition-all cursor-pointer ${
                  confirmModal.confirmClass || "bg-rose-600 hover:bg-rose-500"
                }`}
              >
                {confirmModal.confirmText || (isUrdu ? "تصدیق کریں" : "Confirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return for Correction Modal */}
      {returnModal?.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-slate-200 overflow-hidden animate-scale-up text-left">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="text-base font-black text-slate-800 tracking-tight">
                  {isUrdu ? "کیا مضمون کے نمبرات کی شیٹ واپس کریں؟" : "Return Subject Mark List?"}
                </h3>
              </div>
              <p className="text-slate-600 text-xs leading-relaxed font-sans font-medium">
                {isUrdu 
                  ? "یہ مضمون وار نمبروں کی شیٹ اصلاح کے لیے متعلقہ استاد کو واپس کر دی جائے گی۔" 
                  : "This subject mark list will be returned to the assigned teacher for correction."}
              </p>
              
              <div className="space-y-1.5 pt-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-sans block">
                  {isUrdu ? "اصلاح کے بارے میں ہدایات / ریمارکس" : "Correction Remarks"}
                </label>
                <textarea
                  value={returnRemarks}
                  onChange={(e) => setReturnRemarks(e.target.value)}
                  placeholder={isUrdu ? "یہاں اصلاح کے ریمارکس درج کریں..." : "Enter what needs to be corrected by the subject teacher..."}
                  className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans min-h-[90px]"
                  required
                />
              </div>
            </div>
            
            <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                onClick={() => setReturnModal(null)}
                className="px-4 py-2 text-slate-500 hover:text-slate-850 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                {isUrdu ? "منسوخ کریں" : "Cancel"}
              </button>
              <button
                onClick={() => handleConfirmReturn()}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-sm transition-all cursor-pointer"
              >
                {isUrdu ? "واپس کریں" : "Return"}
              </button>
            </div>
          </div>
        </div>
      )}



      {/* ================= MODULE HEADER & ACCESS ROLES ================= */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-5 transform translate-x-12 -translate-y-6 pointer-events-none">
          <Award className="w-80 h-80" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5">
            <span className="bg-emerald-500 text-slate-950 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider">
              NHS Result System v3
            </span>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight font-sans">
              {t.title}
            </h1>
            <p className="text-xs md:text-sm text-slate-300 font-medium font-sans">
              {t.subtitle}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10 space-y-1 max-w-xs">
            <span className="text-[10px] uppercase font-extrabold text-slate-300 tracking-wider block">
              {t.roleLabel}
            </span>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs font-bold font-sans">
                {isHeadmaster && t.roles.headmaster}
                {isClerk && t.roles.clerk}
                {isClassTeacher && t.roles.classTeacher}
                {isSubjectTeacher && t.roles.subjectTeacher}
                {!isHeadmaster && !isClerk && !isClassTeacher && !isSubjectTeacher && t.roles.unauthorized}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= SUBJECT TEACHER DASHBOARD ================= */}
      {isSubjectTeacher && (
        <div className="space-y-6 animate-fade-in font-sans">
          
          {/* Header of Subject Teacher Section */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2 text-left">
              <h3 className="text-lg font-black text-slate-800 font-sans">
                {isUrdu ? "مضمون وار تعلیمی ڈیسک" : "Subject Evaluation Desk"}
              </h3>
              <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                {isUrdu 
                  ? "اپنے تفویض کردہ مضامین کے امتحانی نمبرات، ڈرافٹس اور حتمی مارک لسٹوں کا نظم کریں۔" 
                  : "Enter evaluation scores, manage drafts, and submit finalized mark sheets for your assigned subjects."
                }
              </p>
            </div>

            {/* Term Filter on Subject Evaluation Desk */}
            <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/60 self-start md:self-center shrink-0">
              <button
                onClick={() => {
                  setSelectedCTTerm('term_1');
                  setRefreshCounter(prev => prev + 1);
                }}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wide transition-all cursor-pointer ${
                  selectedCTTerm === 'term_1'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {isUrdu ? "پہلا ٹرم" : "FIRST TERM"}
              </button>
              <button
                onClick={() => {
                  setSelectedCTTerm('term_2');
                  setRefreshCounter(prev => prev + 1);
                }}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wide transition-all cursor-pointer ${
                  selectedCTTerm === 'term_2'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {isUrdu ? "دوسرا ٹرم" : "SECOND TERM"}
              </button>
            </div>
          </div>

          {/* PRIMARY ACTION: Subject Mark List Workspace Module */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5" id="subject-teacher-marklist-primary">
            
            {/* The Summary Card content */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-3 text-left">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-slate-800 font-sans">
                      {isUrdu ? "مضمون وار نمبرات کی شیٹ" : "Subject Mark List"}
                    </h3>
                    <p className="text-xs text-slate-500 leading-normal max-w-xl">
                      {isUrdu 
                        ? "اپنے تفویض کردہ کلاسز اور مضامین کے لیے نمبرات کے اندراج کا نظم کریں۔" 
                        : "Access and enter academic evaluation marks for your assigned subjects and student lists."
                      }
                    </p>
                  </div>
                </div>
                
                {/* Meta details & status summary counts */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="bg-slate-100 text-slate-700 text-[10px] font-bold uppercase px-2.5 py-1 rounded-md border border-slate-200">
                    {isUrdu ? "تعلیمی سال: 2026-27" : "Academic Year: 2026-27"}
                  </span>
                  <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase px-2.5 py-1 rounded-md border border-indigo-100">
                    {isUrdu ? `کل تفویض کردہ: ${totalAssigned} مضامین` : `${totalAssigned} Subjects Assigned`}
                  </span>
                  
                  {/* Status pills inside the summary card */}
                  <span className="bg-rose-50 text-rose-700 text-[10px] font-bold uppercase px-2.5 py-1 rounded-md border border-rose-100">
                    {isUrdu ? `${pendingCount} غیر شروع شدہ` : `${pendingCount} Pending`}
                  </span>
                  <span className="bg-amber-50 text-amber-700 text-[10px] font-bold uppercase px-2.5 py-1 rounded-md border border-amber-100">
                    {isUrdu ? `${draftCount} ڈرافٹ` : `${draftCount} Draft`}
                  </span>
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase px-2.5 py-1 rounded-md border border-emerald-100">
                    {isUrdu ? `${submittedCount} جمع شدہ` : `${submittedCount} Submitted`}
                  </span>
                  <span className="bg-orange-50 text-orange-700 text-[10px] font-bold uppercase px-2.5 py-1 rounded-md border border-orange-100">
                    {isUrdu ? `${returnedCount} واپس کردہ` : `${returnedCount} Returned`}
                  </span>
                </div>
              </div>

              {/* Prominent Open / Close button */}
              <div className="shrink-0 flex items-center w-full lg:w-auto">
                <button
                  onClick={() => setShowSubjectList(!showSubjectList)}
                  className={`w-full lg:w-auto px-6 py-3 rounded-xl font-black text-xs tracking-wide uppercase shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                    showSubjectList
                      ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                      : 'bg-emerald-600 text-white border-transparent hover:bg-emerald-500'
                  }`}
                >
                  {showSubjectList ? (
                    <>
                      {isUrdu ? "فہرست بند کریں" : "Collapse Subject Mark List"}
                      <ChevronUp className="w-4 h-4 text-slate-600" />
                    </>
                  ) : (
                    <>
                      {isUrdu ? "مضمون وار لسٹ کھولیں" : "Open Subject Mark List"}
                      <ChevronDown className="w-4 h-4 text-white" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Configured subjects in this phase - shown only if showSubjectList is true */}
            {showSubjectList && (
              <div className="pt-6 border-t border-slate-100 space-y-4 animate-fade-in text-left">
                {renderSubjectMarkListWorkspace()}

                <div className="flex justify-center pt-2">
                  <button
                    onClick={() => setShowSubjectList(false)}
                    className="px-5 py-2 rounded-xl font-bold text-xs tracking-wide uppercase border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isUrdu ? "فہرست بند کریں" : "Collapse Subject List"}
                    <ChevronUp className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Premium Status Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Pending */}
            <div className="border border-slate-200 rounded-2xl p-5 bg-white hover:border-rose-300 hover:shadow-sm hover:bg-rose-50/10 transition-all flex flex-col justify-between min-h-[140px] text-left">
              <div className="flex justify-between items-start w-full">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-500 block">{t.subjectTeacher.cards.pending.title}</span>
                  <span className="text-2xl font-black text-rose-600 block">{pendingCount} {isUrdu ? "مضامین" : pendingCount === 1 ? "Subject" : "Subjects"}</span>
                </div>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center border border-rose-100 bg-rose-50 text-rose-600">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal font-sans mt-3">
                {t.subjectTeacher.cards.pending.desc}
              </p>
            </div>

            {/* Card 2: Draft */}
            <div className="border border-slate-200 rounded-2xl p-5 bg-white hover:border-amber-300 hover:shadow-sm hover:bg-amber-50/10 transition-all flex flex-col justify-between min-h-[140px] text-left">
              <div className="flex justify-between items-start w-full">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-500 block">{t.subjectTeacher.cards.draft.title}</span>
                  <span className="text-2xl font-black text-amber-500 block">{draftCount} {isUrdu ? "ڈرافٹ" : draftCount === 1 ? "Draft" : "Drafts"}</span>
                </div>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center border border-amber-100 bg-amber-50 text-amber-500">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal font-sans mt-3">
                {t.subjectTeacher.cards.draft.desc}
              </p>
            </div>

            {/* Card 3: Submitted */}
            <div className="border border-slate-200 rounded-2xl p-5 bg-white hover:border-emerald-300 hover:shadow-sm hover:bg-emerald-50/10 transition-all flex flex-col justify-between min-h-[140px] text-left">
              <div className="flex justify-between items-start w-full">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-500 block">{t.subjectTeacher.cards.submitted.title}</span>
                  <span className="text-2xl font-black text-emerald-600 block">{submittedCount} {isUrdu ? "جمع شدہ" : "Submissions"}</span>
                </div>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center border border-emerald-100 bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal font-sans mt-3">
                {t.subjectTeacher.cards.submitted.desc}
              </p>
            </div>

            {/* Card 4: Returned */}
            <div className="border border-slate-200 rounded-2xl p-5 bg-white hover:border-orange-300 hover:shadow-sm hover:bg-orange-50/10 transition-all flex flex-col justify-between min-h-[140px] text-left">
              <div className="flex justify-between items-start w-full">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-500 block">{t.subjectTeacher.cards.returned.title}</span>
                  <span className="text-2xl font-black text-orange-500 block">{returnedCount} {isUrdu ? "واپس کردہ" : returnedCount === 1 ? "List" : "Lists"}</span>
                </div>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center border border-orange-100 bg-orange-50 text-orange-500">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal font-sans mt-3">
                {t.subjectTeacher.cards.returned.desc}
              </p>
            </div>
          </div>

          {/* Activity / Notification Dashboard Section */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <History className="w-4 h-4 text-slate-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Recent Academic Activity</h3>
              </div>
              <div className="space-y-3 font-sans text-xs text-slate-600">
                <div className="p-3 bg-slate-50 rounded-lg flex justify-between items-center text-left">
                  <span>Mathematics - Class 9A (Draft Saved)</span>
                  <span className="text-[10px] text-slate-400">2h ago</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg flex justify-between items-center text-left">
                  <span>General Science - Class 10B (Submitted)</span>
                  <span className="text-[10px] text-slate-400">Yesterday</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 text-left">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Bell className="w-4 h-4 text-slate-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Notifications</h3>
              </div>
              <div className="text-center py-6">
                <p className="text-xs text-slate-400 italic">No grading notifications yet.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= CLASS TEACHER DASHBOARD ================= */}
      {isClassTeacher && (
        <div className="space-y-6 animate-fade-in" id="class-teacher-dashboard-view">
          {(() => {
            const classAllocations = (setup?.subjectAllocations || []).filter(
              (a: any) => a.className === ctTargetClass && a.divisionName === ctTargetDivision
            );
            const lockStates = getSubjectLockStates();
            const ctActiveExams = (selectedCTTerm === 'term_1' ? ['ex_1', 'ex_2'] : ['ex_3', 'ex_4'])
              .filter(id => examinations.some(e => e.id === id));
            
            const ctClassStates = lockStates.filter(
              (s: any) => s.classId === ctTargetClass && s.division === ctTargetDivision && ctActiveExams.includes(s.examId)
            );
            
            const ctSubmittedCount = ctClassStates.filter(s => s.status === 'Pending Review' || s.status === 'Submitted' || s.status === 'Resubmitted').length;
            const ctDraftCount = ctClassStates.filter(s => s.status === 'Draft').length;
            const ctReturnedCount = ctClassStates.filter(s => s.status === 'Returned for Correction' || s.status === 'Returned').length;
            const ctApprovedCount = ctClassStates.filter(s => s.status === 'Approved').length;
            
            const ctTotalAllocated = (classAllocations.length * ctActiveExams.length) || 8;
            const ctPendingCount = Math.max(0, ctTotalAllocated - (ctSubmittedCount + ctDraftCount + ctReturnedCount + ctApprovedCount));
            const ctProgressPercent = (ctTotalAllocated > 0 && !isNaN(ctApprovedCount) && !isNaN(ctTotalAllocated))
              ? Math.round((ctApprovedCount / ctTotalAllocated) * 100) 
              : 0;

            return (
              <>
                {/* Header of Class Section */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 text-left">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-lg font-black text-slate-800 font-sans">
                        {isUrdu ? `${assignedClassName} امتحانی کارکردگی` : `${assignedClassName} Evaluation Desk`}
                      </h3>
                      <p className="text-xs text-slate-500 max-w-2xl leading-relaxed font-sans">
                        {isUrdu 
                          ? "اپنی تفویض کردہ کلاس کی تعلیمی پیشرفت، سبمٹ شدہ مارک شیٹس اور حتمی پروگریس کارڈز کا معائنہ کریں۔" 
                          : "Monitor final grades, verify subject mark sheets, and compile printable progress reports exclusively for your assigned division."
                        }
                      </p>
                    </div>
                    {/* Term Filter on Dashboard */}
                    <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/60 self-start md:self-center">
                      <button
                        onClick={() => {
                          setSelectedCTTerm('term_1');
                          setSelectedCTExam('ex_1');
                          setRefreshCounter(prev => prev + 1);
                        }}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wide transition-all cursor-pointer ${
                          selectedCTTerm === 'term_1'
                            ? 'bg-white text-indigo-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {isUrdu ? "پہلا ٹرم" : "FIRST TERM"}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedCTTerm('term_2');
                          setSelectedCTExam('ex_3');
                          setRefreshCounter(prev => prev + 1);
                        }}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wide transition-all cursor-pointer ${
                          selectedCTTerm === 'term_2'
                            ? 'bg-white text-indigo-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {isUrdu ? "دوسرا ٹرم" : "SECOND TERM"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Premium Summary Cards Grid for Class Teacher */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {/* Submitted Card */}
                  <div
                    className="bg-white border border-slate-200 rounded-2xl p-5 text-left flex flex-col justify-between min-h-[140px]"
                  >
                    <div className="flex justify-between items-start w-full">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-slate-500 block">
                          {isUrdu ? "جمع شدہ" : "Pending Review"}
                        </span>
                        <span className="text-2xl font-black text-emerald-600 block">{ctSubmittedCount} {isUrdu ? "مضامین" : "Subjects"}</span>
                      </div>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center border bg-emerald-50 border-emerald-100 text-emerald-600">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal font-sans mt-3">
                      {isUrdu ? "ریویو اور منظوری کے منتظر" : "Awaiting class teacher review"}
                    </p>
                  </div>

                  {/* Draft Card */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 text-left flex flex-col justify-between min-h-[140px]">
                    <div className="flex justify-between items-start w-full">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-slate-500 block">
                          {isUrdu ? "ڈرافٹ موڈ" : "Draft"}
                        </span>
                        <span className="text-2xl font-black text-amber-500 block">{ctDraftCount} {isUrdu ? "مضامین" : "Subjects"}</span>
                      </div>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center border bg-amber-50 border-amber-100 text-amber-600">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal font-sans mt-3">
                      {isUrdu ? "اساتذہ کے زیرِ ترمیم شیٹس" : "Saved drafts being compiled"}
                    </p>
                  </div>

                  {/* Pending Card */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 text-left flex flex-col justify-between min-h-[140px]">
                    <div className="flex justify-between items-start w-full">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-slate-500 block">
                          {isUrdu ? "غیر شروع شدہ" : "Not Started"}
                        </span>
                        <span className="text-2xl font-black text-slate-500 block">{ctPendingCount} {isUrdu ? "مضامین" : "Subjects"}</span>
                      </div>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center border bg-slate-50 border-slate-100 text-slate-500">
                        <Clock className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal font-sans mt-3">
                      {isUrdu ? "اندراج ابھی شروع نہیں ہوا" : "Not yet initiated"}
                    </p>
                  </div>

                  {/* Returned Card */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 text-left flex flex-col justify-between min-h-[140px]">
                    <div className="flex justify-between items-start w-full">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-slate-500 block">
                          {isUrdu ? "واپس کردہ" : "Returned"}
                        </span>
                        <span className="text-2xl font-black text-rose-500 block">{ctReturnedCount} {isUrdu ? "مضامین" : "Subjects"}</span>
                      </div>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center border bg-rose-50 border-rose-100 text-rose-600">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal font-sans mt-3">
                      {isUrdu ? "درستگی کے لیے اساتذہ کو واپس" : "Returned for correction"}
                    </p>
                  </div>

                  {/* Overall Progress Card */}
                  <div
                    className="bg-white border border-slate-200 rounded-2xl p-5 text-left transition-all flex flex-col justify-between min-h-[140px]"
                  >
                    <div className="flex justify-between items-start w-full">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-slate-500 block">
                          {isUrdu ? "مجموعی پیشرفت" : "Overall Approved"}
                        </span>
                        <span className="text-2xl font-black text-indigo-600 block">{ctApprovedCount} / {ctTotalAllocated}</span>
                      </div>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center border bg-indigo-50 border-indigo-100 text-indigo-600">
                        <Award className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal font-sans mt-3">
                      {isUrdu ? "کلاس کے مجموعی نتائج کا تناسب" : `${ctProgressPercent}% completion rate`}
                    </p>
                  </div>
                </div>
              </>
            );
          })()}

          {/* Expandable record details for Class Teacher's own class only */}
          {activeCTCard && (() => {
            const lockStates = getSubjectLockStates();
            return (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm animate-fade-in text-left space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-600" />
                  <h4 className="text-sm font-extrabold text-slate-800 font-sans">
                    {isUrdu ? `${assignedClassName} تفصیلی حیثیت:` : `${assignedClassName} Status Breakdown:`} {
                      activeCTCard === 'submitted' && (isUrdu ? "جمع شدہ مارک لسٹیں" : "Submitted Mark Lists")
                    }
                    {
                      activeCTCard === 'draft' && (isUrdu ? "ڈرافٹ مارک لسٹیں" : "Draft Mark Lists")
                    }
                    {
                      activeCTCard === 'pending' && (isUrdu ? "غیر شروع شدہ مضامین" : "Pending Subjects")
                    }
                    {
                      activeCTCard === 'returned' && (isUrdu ? "اصلاح کے لیے واپس کردہ" : "Returned for Correction")
                    }
                    {
                      activeCTCard === 'progress' && (isUrdu ? "کلاس تعلیمی پیشرفت" : "Division Academic Progress")
                    }
                  </h4>
                </div>
                <button 
                  onClick={() => setActiveCTCard(null)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-200 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Display list of subjects strictly of assigned division only */}
              <div className="space-y-3 font-sans text-xs">
                {activeCTCard === 'submitted' && (() => {
                  const items = ctClassAllocations.flatMap((alloc: any) => 
                    ctActiveExams.map((examId) => {
                      const lockId = `lock_2026-27_${examId}_${alloc.className.replace(/\s+/g, '_')}_${alloc.divisionName.replace(/\s+/g, '_')}_${alloc.subjectName.replace(/\s+/g, '_')}`;
                      const state = lockStates.find(s => s.id === lockId);
                      const status = state ? state.status : 'Not Generated';
                      return { alloc, examId, state, status };
                    })
                  ).filter(item => item.status === 'Pending Review' || item.status === 'Submitted' || item.status === 'Resubmitted');

                  if (items.length === 0) {
                    return (
                      <p className="text-slate-500 italic p-3 text-center bg-white rounded-lg border border-slate-150">
                        {isUrdu ? "کوئی جمع شدہ مارک لسٹ نہیں ہے۔" : "No submitted mark lists pending review."}
                      </p>
                    );
                  }

                  return items.map((item, idx) => {
                    const examName = examinations.find(e => e.id === item.examId)?.name || item.examId;
                    return (
                      <div key={`ct_card_sub_${idx}`} className="p-3 bg-white rounded-lg border border-slate-200/80 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="font-extrabold text-slate-800">{item.alloc.subjectName} ({examName})</span>
                          <p className="text-[10px] text-slate-400">Class: {assignedClassName} | Teacher: {item.alloc.teacherName}</p>
                        </div>
                        <span className="bg-amber-50 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-100">
                          {isUrdu ? "زیرِ جائزہ" : "Pending Review"}
                        </span>
                      </div>
                    );
                  });
                })()}

                {activeCTCard === 'draft' && (() => {
                  const items = ctClassAllocations.flatMap((alloc: any) => 
                    ctActiveExams.map((examId) => {
                      const lockId = `lock_2026-27_${examId}_${alloc.className.replace(/\s+/g, '_')}_${alloc.divisionName.replace(/\s+/g, '_')}_${alloc.subjectName.replace(/\s+/g, '_')}`;
                      const state = lockStates.find(s => s.id === lockId);
                      const status = state ? state.status : 'Not Generated';
                      return { alloc, examId, state, status };
                    })
                  ).filter(item => item.status === 'Draft');

                  if (items.length === 0) {
                    return (
                      <p className="text-slate-500 italic p-3 text-center bg-white rounded-lg border border-slate-150">
                        {isUrdu ? "کوئی ڈرافٹ مارک لسٹ نہیں ہے۔" : "No draft mark lists found."}
                      </p>
                    );
                  }

                  return items.map((item, idx) => {
                    const examName = examinations.find(e => e.id === item.examId)?.name || item.examId;
                    return (
                      <div key={`ct_card_dr_${idx}`} className="p-3 bg-white rounded-lg border border-slate-200/80 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="font-extrabold text-slate-800">{item.alloc.subjectName} ({examName})</span>
                          <p className="text-[10px] text-slate-400">Class: {assignedClassName} | Teacher: {item.alloc.teacherName}</p>
                        </div>
                        <span className="bg-amber-50 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-100">
                          {isUrdu ? "زیرِ ترمیم" : "Draft Mode"}
                        </span>
                      </div>
                    );
                  });
                })()}

                {activeCTCard === 'pending' && (() => {
                  const items = ctClassAllocations.flatMap((alloc: any) => 
                    ctActiveExams.map((examId) => {
                      const lockId = `lock_2026-27_${examId}_${alloc.className.replace(/\s+/g, '_')}_${alloc.divisionName.replace(/\s+/g, '_')}_${alloc.subjectName.replace(/\s+/g, '_')}`;
                      const state = lockStates.find(s => s.id === lockId);
                      const status = state ? state.status : 'Not Generated';
                      return { alloc, examId, state, status };
                    })
                  ).filter(item => item.status === 'Not Generated' || item.status === 'Pending');

                  if (items.length === 0) {
                    return (
                      <p className="text-slate-500 italic p-3 text-center bg-white rounded-lg border border-slate-150">
                        {isUrdu ? "تمام مضامین کے نمبرات کا اندراج شروع ہو چکا ہے!" : "All subject marks entry have been initiated!"}
                      </p>
                    );
                  }

                  return items.map((item, idx) => {
                    const examName = examinations.find(e => e.id === item.examId)?.name || item.examId;
                    return (
                      <div key={`ct_card_pend_${idx}`} className="p-3 bg-white rounded-lg border border-slate-200/80 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="font-extrabold text-slate-800">{item.alloc.subjectName} ({examName})</span>
                          <p className="text-[10px] text-slate-400">Class: {assignedClassName} | Teacher: {item.alloc.teacherName}</p>
                        </div>
                        <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded">
                          {isUrdu ? "غیر شروع شدہ" : "Not Started"}
                        </span>
                      </div>
                    );
                  });
                })()}

                {activeCTCard === 'returned' && (() => {
                  const items = ctClassAllocations.flatMap((alloc: any) => 
                    ctActiveExams.map((examId) => {
                      const lockId = `lock_2026-27_${examId}_${alloc.className.replace(/\s+/g, '_')}_${alloc.divisionName.replace(/\s+/g, '_')}_${alloc.subjectName.replace(/\s+/g, '_')}`;
                      const state = lockStates.find(s => s.id === lockId);
                      const status = state ? state.status : 'Not Generated';
                      return { alloc, examId, state, status };
                    })
                  ).filter(item => item.status === 'Returned' || item.status === 'Returned for Correction');

                  if (items.length === 0) {
                    return (
                      <p className="text-slate-500 italic p-3 text-center bg-white rounded-lg border border-slate-150">
                        {isUrdu ? "کوئی واپس کردہ مارک لسٹ نہیں ہے۔" : "No returned mark lists."}
                      </p>
                    );
                  }

                  return items.map((item, idx) => {
                    const examName = examinations.find(e => e.id === item.examId)?.name || item.examId;
                    return (
                      <div key={`ct_card_ret_${idx}`} className="p-3 bg-white rounded-lg border border-slate-200/80 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="font-extrabold text-slate-800">{item.alloc.subjectName} ({examName})</span>
                          <p className="text-[10px] text-rose-500 font-medium">Reason: {item.state?.returnReason || 'Check oral evaluation scores discrepancy'}</p>
                        </div>
                        <span className="bg-rose-50 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded border border-rose-100">
                          {isUrdu ? "اصلاح درکار ہے" : "Revision Needed"}
                        </span>
                      </div>
                    );
                  });
                })()}

                {activeCTCard === 'progress' && (
                  <div className="p-5 bg-white rounded-lg border border-slate-200/80 space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between font-bold text-slate-700">
                        <span>{isUrdu ? "کلاس نتائج کی مہم کا مجموعی تناسب" : "Class Division Evaluation Completion Rate"}</span>
                        <span>{ctProgressPercent}% Completed ({ctApprovedCount} / {ctTotalAllocated})</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${ctProgressPercent}%` }} />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 italic">
                      {isUrdu 
                        ? "یہ تناسب تفویض کردہ کلاس ڈویژن کے تمام مضامین کی فائنل رجسٹریشن پر مبنی ہے۔" 
                        : "Based on final approvals of all subjects assigned to your division in this term."
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>
            );
          })()}

          {/* The four modules below the summary cards */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider">
                {isUrdu ? "رپورٹس اور پروگریس کارڈز" : "Print Center & Progress Reports"}
              </h4>
            </div>

            {/* FIRST MODULE: Subject Mark List Workspace (Design synced with Subject Teacher Dashboard) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5" id="class-teacher-subject-marklist-primary">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-3 text-left">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-black text-slate-800 font-sans">
                        {isUrdu ? "مضمون وار نمبرات کی شیٹ" : "Subject Mark List"}
                      </h3>
                      <p className="text-xs text-slate-500 leading-normal max-w-xl">
                        {isUrdu 
                          ? "اپنے تفویض کردہ کلاسز اور مضامین کے لیے نمبرات کے اندراج کا نظم کریں۔" 
                          : "Access and enter academic evaluation marks for your assigned subjects and student lists."
                        }
                      </p>
                    </div>
                  </div>
                  
                  {/* Meta details & status summary counts */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="bg-slate-100 text-slate-700 text-[10px] font-bold uppercase px-2.5 py-1 rounded-md border border-slate-200">
                      {isUrdu ? "تعلیمی سال: 2026-27" : "Academic Year: 2026-27"}
                    </span>
                    <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase px-2.5 py-1 rounded-md border border-indigo-100">
                      {isUrdu ? `کل تفویض کردہ: ${totalAssigned} مضامین` : `${totalAssigned} Subjects Assigned`}
                    </span>
                    
                    {/* Status pills inside the summary card */}
                    <span className="bg-rose-50 text-rose-700 text-[10px] font-bold uppercase px-2.5 py-1 rounded-md border border-rose-100">
                      {isUrdu ? `${pendingCount} غیر شروع شدہ` : `${pendingCount} Pending`}
                    </span>
                    <span className="bg-amber-50 text-amber-700 text-[10px] font-bold uppercase px-2.5 py-1 rounded-md border border-amber-100">
                      {isUrdu ? `${draftCount} ڈرافٹ` : `${draftCount} Draft`}
                    </span>
                    <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase px-2.5 py-1 rounded-md border border-emerald-100">
                      {isUrdu ? `${submittedCount} جمع شدہ` : `${submittedCount} Submitted`}
                    </span>
                    <span className="bg-orange-50 text-orange-700 text-[10px] font-bold uppercase px-2.5 py-1 rounded-md border border-orange-100">
                      {isUrdu ? `${returnedCount} واپس کردہ` : `${returnedCount} Returned`}
                    </span>
                  </div>
                </div>

                {/* Prominent Open / Close button */}
                <div className="shrink-0 flex items-center w-full lg:w-auto">
                  <button
                    onClick={() => setShowSubjectList(!showSubjectList)}
                    className={`w-full lg:w-auto px-6 py-3 rounded-xl font-black text-xs tracking-wide uppercase shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                      showSubjectList
                        ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                        : 'bg-emerald-600 text-white border-transparent hover:bg-emerald-500'
                    }`}
                  >
                    {showSubjectList ? (
                      <>
                        {isUrdu ? "فہرست بند کریں" : "Collapse Subject Mark List"}
                        <ChevronUp className="w-4 h-4 text-slate-600" />
                      </>
                    ) : (
                      <>
                        {isUrdu ? "مضمون وار لسٹ کھولیں" : "Open Subject Mark List"}
                        <ChevronDown className="w-4 h-4 text-white" />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Configured subjects in this phase - shown only if showSubjectList is true */}
              {showSubjectList && (
                <div className="pt-6 border-t border-slate-100 space-y-4 animate-fade-in text-left">
                  {renderSubjectMarkListWorkspace()}

                  <div className="flex justify-center pt-2">
                    <button
                      onClick={() => setShowSubjectList(false)}
                      className="px-5 py-2 rounded-xl font-bold text-xs tracking-wide uppercase border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isUrdu ? "فہرست بند کریں" : "Collapse Subject List"}
                      <ChevronUp className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* SECOND MODULE: Class Mark List Workspace (Design synced with Subject Mark List) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5" id="class-teacher-class-marklist-primary">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-3 text-left">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                      <ClipboardList className="w-6 h-6 text-teal-400" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-black text-slate-800 font-sans">
                        {isUrdu ? "کلاس مارک لسٹ" : "Class Mark List"}
                      </h3>
                      <p className="text-xs text-slate-500 leading-normal max-w-xl">
                        {isUrdu 
                          ? "اپنی تفویض کردہ کلاس ڈویژن کے جمع شدہ مضمون وار نمبرات کا معائنہ اور تصدیق کریں۔" 
                          : "Review and verify submitted subject mark lists for your assigned class division."
                        }
                      </p>
                    </div>
                  </div>
                  
                  {/* Meta details & status summary counts */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="bg-slate-100 text-slate-700 text-[10px] font-bold uppercase px-2.5 py-1 rounded-md border border-slate-200">
                      {isUrdu ? "تعلیمی سال: 2026-27" : "Academic Year: 2026-27"}
                    </span>
                    <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase px-2.5 py-1 rounded-md border border-indigo-100">
                      {isUrdu ? `کل مضامین: ${ctTotalAllocated}` : `Total Subjects: ${ctTotalAllocated}`}
                    </span>
                    <span className="bg-rose-50 text-rose-700 text-[10px] font-bold uppercase px-2.5 py-1 rounded-md border border-rose-100">
                      {isUrdu ? `زیرِ جائزہ: ${ctSubmittedCount}` : `Pending Review: ${ctSubmittedCount}`}
                    </span>
                    <span className="bg-orange-50 text-orange-700 text-[10px] font-bold uppercase px-2.5 py-1 rounded-md border border-orange-100">
                      {isUrdu ? `واپس کردہ: ${ctReturnedCount}` : `Returned: ${ctReturnedCount}`}
                    </span>
                    <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase px-2.5 py-1 rounded-md border border-emerald-100">
                      {isUrdu ? `مکمل: ${ctApprovedCount}` : `Completed: ${ctApprovedCount}`}
                    </span>
                  </div>
                </div>

                {/* Prominent Open / Close button */}
                <div className="shrink-0 flex items-center w-full lg:w-auto">
                  <button
                    onClick={() => setShowClassMarkList(!showClassMarkList)}
                    className={`w-full lg:w-auto px-6 py-3 rounded-xl font-black text-xs tracking-wide uppercase shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                      showClassMarkList
                        ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                        : 'bg-emerald-600 text-white border-transparent hover:bg-emerald-500'
                    }`}
                  >
                    {showClassMarkList ? (
                      <>
                        {isUrdu ? "کلاس مارک لسٹ بند کریں" : "COLLAPSE CLASS MARK LIST"}
                        <ChevronUp className="w-4 h-4 text-slate-600" />
                      </>
                    ) : (
                      <>
                        {isUrdu ? "کلاس مارک لسٹ کھولیں" : "OPEN CLASS MARK LIST"}
                        <ChevronDown className="w-4 h-4 text-white" />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Submitted lists area - shown only if showClassMarkList is true */}
              {showClassMarkList && (
                <div className="pt-6 border-t border-slate-100 space-y-4 animate-fade-in text-left">
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-indigo-600" />
                        <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider">
                          {isUrdu ? "جمع شدہ مضامین کے نمبرات کا ریکارڈ" : "Submitted Class Evaluation Records"}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs bg-indigo-50 border border-indigo-150 text-indigo-700 font-black px-2.5 py-1.5 rounded-lg">
                          {selectedCTTerm === 'term_1' ? (isUrdu ? "ٹرم: پہلا ٹرم" : "TERM: FIRST TERM") : (isUrdu ? "ٹرم: دوسرا ٹرم" : "TERM: SECOND TERM")}
                        </span>
                        
                        {/* BULK SEND ACTION BUTTON */}
                        <button
                          onClick={handleBulkSendToResultBook}
                          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-550 text-white text-[11px] font-black uppercase tracking-wider rounded-lg shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-transparent font-sans"
                        >
                          <Send className="w-3 h-3 text-white" />
                          <span>{selectedCTTerm === 'term_1' ? (isUrdu ? "پہلا ٹرم رزلٹ بک پر بھیجیں" : "Send Complete First Term") : (isUrdu ? "دوسرا ٹرم رزلٹ بک پر بھیجیں" : "Send Complete Second Term")}</span>
                        </button>
                      </div>
                    </div>

                    {/* Subject Cards list */}
                    {(() => {
                      const lockStates = getSubjectLockStates();
                      const ctActiveExams = (selectedCTTerm === 'term_1' ? ['ex_1', 'ex_2'] : ['ex_3', 'ex_4'])
                        .filter(id => examinations.some(e => e.id === id));
                      const submittedItems: any[] = [];
                      
                      ctClassAllocations.forEach((alloc: any) => {
                        ctActiveExams.forEach((examId) => {
                          const lockId = `lock_2026-27_${examId}_${alloc.className.replace(/\s+/g, '_')}_${alloc.divisionName.replace(/\s+/g, '_')}_${alloc.subjectName.replace(/\s+/g, '_')}`;
                          const state = lockStates.find(s => s.id === lockId);
                          const status = state ? state.status : 'Not Generated';
                          
                          submittedItems.push({
                            allocation: { ...alloc, examId },
                            state,
                            status
                          });
                        });
                      });

                      const filteredItems = submittedItems.filter(item => 
                        item.status === 'Pending Review' || 
                        item.status === 'Submitted' || 
                        item.status === 'Resubmitted' || 
                        item.status === 'Approved'
                      );

                      if (filteredItems.length === 0) {
                        return (
                          <div className="p-8 text-center bg-slate-50/50 border border-dashed border-slate-200 rounded-xl space-y-1.5">
                            <ClipboardList className="w-8 h-8 text-slate-300 mx-auto" />
                            <p className="text-xs font-bold text-slate-500">
                              {isUrdu ? "اس ٹرم کے لیے کوئی جمع شدہ مارک لسٹ نہیں ملی۔" : "No submitted mark lists found for this term."}
                            </p>
                            <p className="text-[10px] text-slate-400 font-sans">
                              {isUrdu ? "جب مضمون کے اساتذہ اپنے نمبرات جمع کریں گے تو وہ یہاں نظر آئیں گی۔" : "Once subject teachers submit their marks for term components, they will appear here for review."}
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-4">
                          {filteredItems.map((item: any) => {
                            const cardId = item.state?.id || `lock_2026-27_${item.allocation.examId}_${item.allocation.className.replace(/\s+/g, '_')}_${item.allocation.divisionName.replace(/\s+/g, '_')}_${item.allocation.subjectName.replace(/\s+/g, '_')}`;
                            const isOpen = !!expandedCTCards[cardId];
                            
                            let badgeStyle = 'bg-slate-100 text-slate-500 border-slate-200';
                            let statusText = item.status;

                            if (item.status === 'Pending Review' || item.status === 'Submitted') {
                              badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200';
                              statusText = isUrdu ? "زیرِ جائزہ" : "Pending Review";
                            } else if (item.status === 'Resubmitted') {
                              badgeStyle = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                              statusText = isUrdu ? "دوبارہ جمع کرایا" : "Resubmitted";
                            } else if (item.status === 'Approved') {
                              badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                              statusText = isUrdu ? "🟢 رزلٹ بک میں شامل" : "🟢 Sent to Result Book";
                            } else if (item.status === 'Returned' || item.status === 'Returned for Correction') {
                              badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200';
                              statusText = isUrdu ? "اصلاح کے لیے واپس" : "Returned";
                            }

                            // Mock formatted submit date based on selected exam or lockState.lockedAt to look extremely realistic
                            const submitDate = item.state?.lockedAt 
                              ? new Date(item.state.lockedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + new Date(item.state.lockedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                              : (item.allocation.examId === 'ex_1' ? '10-Jul-2026, 04:30 PM' : '11-Jul-2026, 11:20 AM');

                            // Determine Assessment Type based on Template Name/Type
                            const masterTemplate = getTemplateForAllocation(item.allocation);
                            const examObj = examinations.find(e => e.id === item.allocation.examId) || { id: item.allocation.examId, name: item.allocation.examId };
                            const template = getCustomizedTemplateForTeacher(masterTemplate, item.allocation, examObj);
                            
                            const assessmentType = template.name.includes('Language') 
                              ? (isUrdu ? "تشخیصی زبان کا فریم ورک" : "Language Diagnostic Framework")
                              : (isUrdu ? "مسلسل اور جامع جانچ (CCE)" : "Formative & Summative (CCE)");

                            return (
                              <div 
                                key={cardId}
                                className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-sm hover:border-slate-300 transition-all text-left animate-fade-in"
                              >
                                {/* Card Header - Clickable */}
                                <div 
                                  onClick={() => {
                                    setExpandedCTCards(prev => ({
                                      ...prev,
                                      [cardId]: !isOpen
                                    }));
                                  }}
                                  className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer hover:bg-slate-50/50 transition-all select-none"
                                >
                                  <div className="space-y-2 text-left w-full md:w-auto">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="bg-slate-100 text-slate-600 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-md border border-slate-200 font-sans">
                                        {isUrdu ? "تعلیمی سال: 2026-27" : "AY: 2026-27"}
                                      </span>
                                      <span className="bg-slate-100 text-slate-600 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-md border border-slate-200 font-sans">
                                        {item.allocation.className} - {item.allocation.divisionName}
                                      </span>
                                      <span className="bg-indigo-50 text-indigo-700 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-md border border-indigo-100 font-sans">
                                        {examObj.name}
                                      </span>
                                      <span className="bg-slate-50 text-slate-500 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-md border border-slate-150 font-sans">
                                        {assessmentType}
                                      </span>
                                    </div>
                                    
                                    <div className="flex items-baseline gap-2">
                                      <span className="text-base font-black text-slate-800 tracking-tight block">
                                        {item.allocation.subjectName}
                                      </span>
                                      <span className="text-xs text-slate-400 font-medium">
                                        {isUrdu ? `بذریعہ ${item.allocation.teacherName}` : `by ${item.allocation.teacherName}`}
                                      </span>
                                    </div>

                                    <p className="text-[10px] text-slate-400 font-mono">
                                      {isUrdu ? `جمع کرانے کی تاریخ و وقت: ${submitDate}` : `Submitted At: ${submitDate}`}
                                    </p>
                                  </div>

                                  <div className="flex items-center justify-between w-full md:w-auto md:justify-end gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                                    <span className={`text-[10px] font-black px-3 py-1 rounded-md border uppercase tracking-wider font-sans ${badgeStyle}`}>
                                      {statusText}
                                    </span>
                                    <div className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all shrink-0">
                                      {isOpen ? (
                                        <ChevronUp className="w-4 h-4 text-slate-600" />
                                      ) : (
                                        <ChevronDown className="w-4 h-4 text-slate-600" />
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Expanded Content (The submitted Subject Mark List exactly as it was submitted) */}
                                {isOpen && (() => {
                                  // Fetch records
                                  const itemStudents = getStudentsForClass(item.allocation.className, item.allocation.divisionName);
                                  const itemEntries = LocalERPDatabase.getStudentMarkEntries().filter(
                                    e => e.examId === selectedCTExam && 
                                         e.classId === item.allocation.className && 
                                         e.division === item.allocation.divisionName && 
                                         e.subjectId === item.allocation.subjectName
                                  );

                                  const itemVals: Record<string, Record<string, any>> = {};
                                  const itemRemarks: Record<string, string> = {};
                                  itemEntries.forEach(entry => {
                                    itemVals[entry.studentId] = entry.marks || {};
                                    itemRemarks[entry.studentId] = entry.remarks || '';
                                  });

                                  return (
                                    <div className="px-5 pb-6 pt-2 border-t border-slate-100 bg-slate-50/20 space-y-5 animate-fade-in text-left">
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-1.5 text-xs font-black text-slate-600 uppercase tracking-wider">
                                          <FileSpreadsheet className="w-4 h-4 text-indigo-500" />
                                          <span>{isUrdu ? "جمع شدہ مارک شیٹ (صرف پڑھنے کے لیے)" : "Submitted Mark Sheet (Read Only View)"}</span>
                                        </div>
                                        <p className="text-xs text-slate-400">
                                          {isUrdu 
                                            ? "یہ مارک شیٹ باضابطہ طور پر جمع کرائی جا چکی ہے۔ مضمون کے استاد کے ذریعے بھیجے گئے اصل نمبرات کا معائنہ کریں۔" 
                                            : "This mark sheet is locked as a verified submission. You are reviewing the official academic grades submitted by the subject teacher."
                                          }
                                        </p>
                                      </div>

                                      {/* Read-Only Table */}
                                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm max-h-[500px] overflow-y-auto overflow-x-auto relative">
                                        <table className="w-full border-collapse font-sans text-xs">
                                          <thead>
                                            <tr className="bg-slate-100 border-b border-slate-300">
                                              <th className="w-10 bg-slate-200 text-slate-500 font-mono text-[10px] text-center border-r border-slate-300 py-1.5 shrink-0 select-none"></th>
                                              {(template?.headers || []).map((h: any, idx: number) => {
                                                const colLetter = String.fromCharCode(65 + idx);
                                                return (
                                                  <th key={`ct_th_${h.id}`} className="bg-slate-100 text-slate-500 font-mono text-[10px] text-center font-bold border-r border-slate-300 py-1 select-none min-w-[90px]" style={{ width: h.width }}>
                                                    {colLetter}
                                                  </th>
                                                );
                                              })}
                                            </tr>
                                          </thead>

                                          <tbody>
                                            {/* Subtitle / Header Rows in Excel Sheet */}
                                            <tr className="bg-white border-b border-slate-200">
                                              <td className="bg-slate-100 text-slate-500 font-mono text-[9px] text-center border-r border-slate-300 font-bold">1</td>
                                              <td colSpan={template?.headers?.length || 1} className="border-r border-slate-200 px-4 text-center font-sans font-black text-slate-800 text-sm tracking-wider bg-slate-50/50 py-2">
                                                NATIONAL HIGH SCHOOL, TALODA
                                              </td>
                                            </tr>
                                            <tr className="bg-white border-b border-slate-200">
                                              <td className="bg-slate-100 text-slate-500 font-mono text-[9px] text-center border-r border-slate-300 font-bold">2</td>
                                              <td colSpan={template?.headers?.length || 1} className="border-r border-slate-200 px-4 text-center font-sans font-bold text-slate-600 text-xs tracking-normal bg-white py-1">
                                                {template?.sections?.[1]?.text || `OFFICIAL SUBJECT GRADE SHEET - ${item.allocation.subjectName.toUpperCase()} (${examObj.name.toUpperCase()})`}
                                              </td>
                                            </tr>
                                            <tr className="bg-white border-b border-slate-200">
                                              <td className="bg-slate-100 text-slate-500 font-mono text-[9px] text-center border-r border-slate-300 font-bold">3</td>
                                              <td colSpan={template?.headers?.length || 1} className="border-r border-slate-200 px-4 text-center font-mono text-slate-400 text-[10px] py-1 bg-white">
                                                {template?.sections?.[2]?.text || `Class Division: ${item.allocation.className} - ${item.allocation.divisionName} | Academic Year: 2026-27 | Teacher Signature Register`}
                                              </td>
                                            </tr>

                                            {/* Labels row */}
                                            <tr className="bg-slate-150 border-b-2 border-slate-350 font-extrabold text-slate-700 text-center">
                                              <td className="bg-slate-100 text-slate-500 font-mono text-[9px] text-center border-r border-slate-300 font-bold">4</td>
                                              {(template?.headers || []).map((h: any) => {
                                                const isMetadata = h.text.toLowerCase().includes('roll') || 
                                                                   h.text.toLowerCase().includes('g.r.') || 
                                                                   h.text.toLowerCase().includes('name') || 
                                                                   h.text.toLowerCase().includes('total') || 
                                                                   h.text.toLowerCase().includes('grade') || 
                                                                   h.text.toLowerCase().includes('sign') || 
                                                                   h.text.toLowerCase().includes('remark');
                                                const maxMarks = getHeaderMaxMarks(h);
                                                
                                                return (
                                                  <td key={`ct_lbl_${h.id}`} className="border-r border-slate-300 px-2 py-2.5 text-center align-middle bg-slate-100/70 relative font-black text-slate-700" style={{ width: h.width }}>
                                                    <span className="block font-sans font-black text-xs">{h.text}</span>
                                                    {!isMetadata && !h.formula && template?.id !== 'tmpl_class_1_8_language' && (
                                                      <span className="block text-[9px] text-slate-400 uppercase font-mono font-bold mt-0.5">Max: {maxMarks}</span>
                                                    )}
                                                    {h.formula && (
                                                      <span className="absolute bottom-0.5 right-1 text-[8px] text-emerald-600 bg-emerald-50 font-mono font-bold rounded px-0.5">fx</span>
                                                    )}
                                                  </td>
                                                );
                                              })}
                                            </tr>

                                            {/* Student records */}
                                            {itemStudents.map((student, rIdx) => {
                                              const studentVals = itemVals[student.id] || {};
                                              
                                              // Evaluate formulas to get values
                                              const evaluatedScores: Record<string, string | number> = { ...studentVals };
                                              (template?.headers || []).forEach((h: any) => {
                                                if (h.formula) {
                                                  evaluatedScores[h.id] = evaluateFormula(h.formula, student.id, evaluatedScores, template);
                                                }
                                              });

                                                                                  return (
                                                <tr key={`ct_row_${student.id}`} className="hover:bg-slate-50/50 border-b border-slate-200 h-9">
                                                  <td className="bg-slate-100 text-slate-400 font-mono text-[9px] text-center border-r border-slate-300 font-medium select-none">
                                                    {rIdx + 5}
                                                  </td>
                                                  
                                                  {(template?.headers || []).map((h: any) => {
                                                    const lowerText = h.text.toLowerCase();
                                                    const identityType = h.identityType || '';
                                                    const isSrNo = identityType === 'srNo' || lowerText.includes('sr.') || lowerText.includes('sr no');
                                                    const isSeatNo = identityType === 'seatNo' || lowerText.includes('seat') || lowerText.includes('exam seat');
                                                    const isRollNo = lowerText.includes('roll');
                                                    const isGrNo = lowerText.includes('g.r.');
                                                    const isName = identityType === 'name' || lowerText.includes('name');
                                                    const isRemarksCol = lowerText.includes('remark');
                                                    
                                                    if (isSrNo) {
                                                      return (
                                                        <td key={`ct_cell_${student.id}_${h.id}`} className="border-r border-slate-200 text-slate-500 text-center font-mono align-middle">
                                                          {rIdx + 1}
                                                        </td>
                                                      );
                                                    }
                                                    if (isSeatNo) {
                                                      const stAny = student as any;
                                                      const seatVal = stAny.examSeatNo || stAny.seatNo || (student.rollNo ? `S2026-${String(student.rollNo).padStart(3, '0')}` : (student.grNumber || stAny.admissionNo || `SEAT-${rIdx+1}`));
                                                      return (
                                                        <td key={`ct_cell_${student.id}_${h.id}`} className="border-r border-slate-200 font-mono text-center font-bold text-slate-700 align-middle">
                                                          {seatVal}
                                                        </td>
                                                      );
                                                    }
                                                    if (isRollNo) {
                                                      return (
                                                        <td key={`ct_cell_${student.id}_${h.id}`} className="border-r border-slate-200 text-slate-500 text-center font-mono align-middle">
                                                          {student.rollNo}
                                                        </td>
                                                      );
                                                    }
                                                    if (isGrNo) {
                                                      return (
                                                        <td key={`ct_cell_${student.id}_${h.id}`} className="border-r border-slate-200 text-slate-400 text-center font-mono align-middle">
                                                          {student.grNumber}
                                                        </td>
                                                      );
                                                    }
                                                    if (isName) {
                                                      return (
                                                        <td key={`ct_cell_${student.id}_${h.id}`} className="border-r border-slate-200 font-extrabold text-slate-800 pl-3 text-left align-middle">
                                                          {student.name}
                                                        </td>
                                                      );
                                                    }
                                                    
                                                    // Formula columns (like Grand Total, Grade)
                                                    if (h.formula) {
                                                      const val = evaluatedScores[h.id] !== undefined ? evaluatedScores[h.id] : '';
                                                      const isGradeCol = h.formula.includes('GRADE');
                                                      
                                                      if (isGradeCol) {
                                                        const grade = String(val);
                                                        return (
                                                          <td key={`ct_cell_${student.id}_${h.id}`} className="border-r border-slate-200 font-black text-center align-middle">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-sans ${
                                                              grade === 'E' 
                                                                ? 'bg-rose-100 text-rose-800' 
                                                                : grade.startsWith('A') 
                                                                  ? 'bg-emerald-100 text-emerald-800' 
                                                                  : 'bg-indigo-100 text-indigo-800'
                                                            }`}>
                                                              {grade || '-'}
                                                            </span>
                                                          </td>
                                                        );
                                                      }
                                                      
                                                      return (
                                                        <td key={`ct_cell_${student.id}_${h.id}`} className="border-r border-slate-200 font-mono font-black text-center bg-emerald-50/20 text-emerald-700 text-xs align-middle">
                                                          {val}
                                                        </td>
                                                      );
                                                    }
                                                    
                                                    // Custom remarks or teacher signature (shown as pure text)
                                                    if (isRemarksCol) {
                                                      return (
                                                        <td key={`ct_cell_${student.id}_${h.id}`} className="border-r border-slate-200 px-3 text-left italic text-slate-500 font-medium align-middle">
                                                          {itemRemarks[student.id] || '-'}
                                                        </td>
                                                      );
                                                    }
                                                    
                                                    // Regular scores/marks
                                                    const scoreVal = studentVals[h.id] !== undefined ? studentVals[h.id] : '';
                                                    return (
                                                      <td key={`ct_cell_${student.id}_${h.id}`} className="border-r border-slate-200 font-mono font-extrabold text-slate-800 text-center align-middle">
                                                        {scoreVal || '-'}
                                                      </td>
                                                    );
                                                  })}
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>

                                      {/* Phase 2: Workflow Actions Buttons (Return for Correction & Send to Result Book) */}
                                      <div className="flex flex-col sm:flex-row justify-end items-center gap-3 pt-4 border-t border-slate-200/60">
                                        {workflowNotification[cardId] && (
                                          <div className="mr-auto text-xs font-black text-amber-850 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg flex items-center gap-1.5 animate-bounce">
                                            <AlertCircle className="w-4 h-4 text-amber-600" />
                                            <span>{workflowNotification[cardId]}</span>
                                          </div>
                                        )}
                                        
                                        {item.status === 'Approved' ? (
                                          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                                            <div className="px-5 py-2.5 bg-emerald-50 text-emerald-700 text-xs font-black uppercase tracking-wider rounded-xl border border-emerald-200 flex items-center justify-center gap-2 select-none font-sans w-full sm:w-auto">
                                              <Check className="w-4 h-4 text-emerald-600" />
                                              <span>{isUrdu ? "✓ رزلٹ بک میں شامل" : "✓ SENT TO RESULT BOOK"}</span>
                                            </div>
                                            <div
                                              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border font-sans text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 bg-slate-100 text-slate-500 border-slate-200 shrink-0 select-none"
                                              title="Locked: this Mark List has already been sent to the Result Book."
                                            >
                                              <Lock className="w-4 h-4 text-slate-500" />
                                              <span>{isUrdu ? "لاک شدہ" : "Locked"}</span>
                                            </div>
                                          </div>
                                        ) : (
                                          <>
                                            <button type="button"
                                              onClick={() => {
                                                const lockId = item.state?.id || `lock_2026-27_${item.allocation.examId}_${item.allocation.className.replace(/\s+/g, '_')}_${item.allocation.divisionName.replace(/\s+/g, '_')}_${item.allocation.subjectName.replace(/\s+/g, '_')}`;
                                                handleSoftDeleteClassMarkList(lockId, item.allocation);
                                              }}
                                              className="w-full sm:w-auto px-5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 hover:border-rose-300 shadow-sm hover:shadow-sm rounded-xl font-sans text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                              <span>{isUrdu ? "حذف کریں" : "Delete"}</span>
                                            </button>

                                            <button
                                              onClick={() => {
                                                const lockId = item.state?.id || `lock_2026-27_${item.allocation.examId}_${item.allocation.className.replace(/\s+/g, '_')}_${item.allocation.divisionName.replace(/\s+/g, '_')}_${item.allocation.subjectName.replace(/\s+/g, '_')}`;
                                                setReturnModal({
                                                  isOpen: true,
                                                  lockId,
                                                  allocation: item.allocation,
                                                  cardId
                                                });
                                                setReturnRemarks('');
                                              }}
                                              className="w-full sm:w-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border border-transparent font-sans"
                                            >
                                              <X className="w-4 h-4 text-white" />
                                              <span>{isUrdu ? "اصلاح کے لیے واپس کریں" : "Return for Correction"}</span>
                                            </button>

                                            <button
                                              onClick={() => {
                                                const lockId = item.state?.id || `lock_2026-27_${item.allocation.examId}_${item.allocation.className.replace(/\s+/g, '_')}_${item.allocation.divisionName.replace(/\s+/g, '_')}_${item.allocation.subjectName.replace(/\s+/g, '_')}`;
                                                handleSendToResultBook(lockId, item.allocation, cardId);
                                              }}
                                              className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border border-transparent font-sans"
                                            >
                                              <CheckCircle2 className="w-4 h-4 text-white" />
                                              <span>{isUrdu ? "رزلٹ بک پر بھیجیں" : "Send to Result Book"}</span>
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="flex justify-center pt-2">
                    <button
                      onClick={() => setShowClassMarkList(false)}
                      className="px-5 py-2 rounded-xl font-bold text-xs tracking-wide uppercase border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isUrdu ? "فہرست بند کریں" : "Collapse Class Mark List"}
                      <ChevronUp className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* THIRD MODULE: Result Book Workspace (Design synced with Class Mark List) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5" id="class-teacher-result-book-primary">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-3 text-left">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                      <BookOpen className="w-6 h-6 text-teal-400" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-black text-slate-800 font-sans">
                        {isUrdu ? "📘 رزلٹ بک" : "📘 Result Book"}
                      </h3>
                      <p className="text-xs text-slate-500 leading-normal max-w-xl font-sans">
                        {isUrdu 
                          ? "اپنی تفویض کردہ کلاس کے رزلٹ بک ریکارڈز کا معائنہ اور انضمام کریں۔" 
                          : "Consolidated class division stands and individual student profiles for academic registries."
                        }
                      </p>
                    </div>
                  </div>
                  
                  {/* Meta details & status summary counts */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="bg-slate-100 text-slate-700 text-[10px] font-bold uppercase px-2.5 py-1 rounded-md border border-slate-200 font-sans">
                      {isUrdu ? "تعلیمی سال: 2026-27" : "Academic Year: 2026-27"}
                    </span>
                    <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase px-2.5 py-1 rounded-md border border-indigo-100 font-sans">
                      {isUrdu ? `کل مضامین: ${ctTotalAllocated}` : `Total Subjects: ${ctTotalAllocated}`}
                    </span>
                    <span className="bg-slate-100 text-slate-500 text-[10px] font-bold uppercase px-2.5 py-1 rounded-md border border-slate-200 font-sans">
                      {isUrdu ? `بقایا: ${ctPendingCount}` : `Pending: ${ctPendingCount}`}
                    </span>
                    <span className="bg-rose-50 text-rose-700 text-[10px] font-bold uppercase px-2.5 py-1 rounded-md border border-rose-100 font-sans">
                      {isUrdu ? `زیرِ جائزہ: ${ctSubmittedCount}` : `Under Review: ${ctSubmittedCount}`}
                    </span>
                    <span className="bg-orange-50 text-orange-700 text-[10px] font-bold uppercase px-2.5 py-1 rounded-md border border-orange-100 font-sans">
                      {isUrdu ? `واپس کردہ: ${ctReturnedCount}` : `Returned: ${ctReturnedCount}`}
                    </span>
                    <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase px-2.5 py-1 rounded-md border border-emerald-100 font-sans">
                      {isUrdu ? `رزلٹ بک میں شامل: ${ctApprovedCount}` : `Sent to Result Book: ${ctApprovedCount}`}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-md border font-sans flex items-center gap-1 ${
                      ctApprovedCount === ctTotalAllocated && ctTotalAllocated > 0
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                        : 'bg-amber-50 text-amber-700 border-amber-100'
                    }`}>
                      {ctApprovedCount === ctTotalAllocated && ctTotalAllocated > 0
                        ? (isUrdu ? "🟢 رزلٹ بک تیار ہے" : "🟢 Result Book Ready")
                        : (isUrdu ? "🟡 جاری ہے" : "🟡 In Progress")
                      }
                    </span>
                  </div>
                </div>

                {/* Prominent Open / Close button */}
                <div className="shrink-0 flex items-center w-full lg:w-auto">
                  <button
                    onClick={() => setShowResultBook(!showResultBook)}
                    className={`w-full lg:w-auto px-6 py-3 rounded-xl font-black text-xs tracking-wide uppercase shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                      showResultBook
                        ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                        : 'bg-emerald-600 text-white border-transparent hover:bg-emerald-500'
                    }`}
                  >
                    {showResultBook ? (
                      <>
                        {isUrdu ? "رزلٹ بک بند کریں" : "COLLAPSE RESULT BOOK"}
                        <ChevronUp className="w-4 h-4 text-slate-600" />
                      </>
                    ) : (
                      <>
                        {isUrdu ? "رزلٹ بک کھولیں" : "OPEN RESULT BOOK"}
                        <ChevronDown className="w-4 h-4 text-white" />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Result Book Workspace - shown only if showResultBook is true */}
              {showResultBook && (
                <div className="pt-6 border-t border-slate-100 space-y-6 animate-fade-in text-left">
                  <ContinuousResultBook
                    user={user}
                    isUrdu={isUrdu}
                    students={getStudentsForClass(ctTargetClass, ctTargetDivision)}
                    ctTargetClass={ctTargetClass}
                    ctTargetDivision={ctTargetDivision}
                    onClose={() => setShowResultBook(false)}
                  />
                </div>
              )}
            </div>

            {/* Empty Notification Area */}
            <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 flex items-center gap-3">
              <Bell className="w-4 h-4 text-slate-400 shrink-0" />
              <p className="text-[11px] text-slate-400 italic">No pending notifications for Class {assignedClassName}.</p>
            </div>
          </div>
        </div>
      )}

      {/* ================= CLERK DASHBOARD ================= */}
      {isClerk && (
        <div className="space-y-6 animate-fade-in" id="clerk-result-focused-page">
          
          {/* Clerk Role Header. In focused submenu mode, the duplicate internal tab bar is hidden. */}
          <div className="edx-dark-contrast-surface bg-[radial-gradient(circle_at_12%_10%,rgba(16,185,129,.2),transparent_34%),linear-gradient(135deg,#0f172a,#111827_62%,#052e2b)] rounded-2xl p-6 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-emerald-400/15 shadow-xl">
            <div className="space-y-1 text-left">
              <h3 className="text-xl font-black font-sans flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                {focusedMode ? focusedTitle : (isUrdu ? "انتظامی کلرک ڈیش بورڈ" : "Administrative Clerk Workspace")}
              </h3>
              <p className="text-xs text-slate-300">
                {focusedMode
                  ? (isUrdu ? "منتخب رزلٹ فیچر کا علیحدہ صفحہ" : "Focused Clerk Result Management page")
                  : (isUrdu 
                    ? "آفیشل ریکارڈز، مارک لسٹ ٹیمپلیٹس اور پرنٹ کی تیاری کا انتظام کریں۔" 
                    : "Manage official mark sheet structures, compile academic books, and monitor school-wide print templates.")}
              </p>
            </div>
            
            {!focusedMode && (
              /* Elegant Tab Switcher */
              <div className="w-full md:w-auto overflow-x-auto pb-1.5 scrollbar-visible self-stretch md:self-auto shrink-0 no-print">
                <div className="flex bg-slate-800 p-1.5 rounded-xl border border-slate-700/80 min-w-max gap-1">
                  <button
                    onClick={() => { setClerkTab('ledgers'); setSelectedTemplate(null); }}
                    className={`px-4 py-2 rounded-lg font-black text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      clerkTab === 'ledgers'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Printer className="w-4 h-4" />
                    {isUrdu ? "پرنٹ سینٹر" : "Print Center"}
                  </button>
                  <button
                    onClick={() => { setClerkTab('templates'); setSelectedTemplate(null); }}
                    className={`px-4 py-2 rounded-lg font-black text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      clerkTab === 'templates'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    {isUrdu ? "ماسٹر مارک لسٹ ٹیمپلیٹس" : "Master Mark List Templates"}
                  </button>
                  <button
                    onClick={() => { setClerkTab('masterResultBook'); setSelectedTemplate(null); }}
                    className={`px-4 py-2 rounded-lg font-black text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      clerkTab === 'masterResultBook'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    {isUrdu ? "ماسٹر رزلٹ بک" : "Master Result Book"}
                  </button>
                  <button
                    onClick={() => { setClerkTab('progressCardTemplates'); setSelectedTemplate(null); }}
                    className={`px-4 py-2 rounded-lg font-black text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      clerkTab === 'progressCardTemplates'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Award className="w-4 h-4" />
                    {isUrdu ? "ماسٹر پروگریس کارڈ" : "Master Progress Card"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Tab 1: Print Center View */}
          {clerkTab === 'ledgers' && (
            <div className="space-y-4">
              <ClerkResultCloudPrintInbox />
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6 text-left">
              
              {/* Active Sub-view Header */}
              {activeLedgerCategory !== 'none' ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => { setActiveLedgerCategory('none'); setLedgerSearch(''); }}
                      className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-all cursor-pointer shadow-sm shrink-0"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-800 font-sans">
                        {activeLedgerCategory === 'result_books' && (isUrdu ? "رزلٹ بکس پرنٹ کے لیے تیار ہیں" : "Result Books Ready for Print")}
                        {activeLedgerCategory === 'progress_cards' && (isUrdu ? "پروگریس کارڈز پرنٹ کے لیے تیار ہیں" : "Progress Cards Ready for Print")}
                        {activeLedgerCategory === 'mark_lists_search' && (isUrdu ? "مارک لسٹ پرنٹ" : "Mark List Print")}
                      </h3>
                      <p className="text-xs text-slate-500 font-sans font-sans">
                        {activeLedgerCategory === 'result_books' && "Consolidated class division standings ready for registry archives."}
                        {activeLedgerCategory === 'progress_cards' && "A4 Report cards compiled with attendance and remarks for distribution."}
                        {activeLedgerCategory === 'mark_lists_search' && (isUrdu ? "تعلیمی سال، کلاس اور ڈویژن کے مطابق تلاش کریں۔" : "Search finalized subject mark lists.")}
                      </p>
                    </div>
                  </div>

                  {/* Instant Search Bar */}
                  {activeLedgerCategory !== 'progress_cards' && activeLedgerCategory !== 'mark_lists_search' && (
                    <div className="relative w-full sm:w-64">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder={isUrdu ? "تلاش کریں..." : "Search by class or subject..."}
                        value={ledgerSearch}
                        onChange={(e) => setLedgerSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-base font-extrabold text-slate-800 font-sans">{t.common.sectionTitle}</h3>
                </div>
              )}

              {/* Category selector / original 3 boxes when none is selected */}
              {activeLedgerCategory === 'none' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Box 1: Mark List Print */}
                  <div 
                    onClick={() => {
                      setActiveLedgerCategory('mark_lists_search');
                      setMarkListSearchUnderDev(false);
                      setMarkListSearchYear('');
                      setMarkListSearchClass('');
                      setMarkListSearchDivision('');
                      setClerkOpenedClassMarkList(null);
                      setClerkSearchError('');
                    }}
                    className="border border-slate-200 hover:border-indigo-500 rounded-xl p-5 bg-slate-50/40 hover:bg-slate-50/80 transition-all text-left flex flex-col justify-between min-h-[160px] cursor-pointer group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-slate-700 group-hover:text-indigo-700 transition-all">
                        <Printer className="w-4 h-4 text-slate-500 group-hover:text-indigo-600" />
                        <h4 className="text-xs font-black uppercase tracking-wider">
                          {isUrdu ? "مارک لسٹ پرنٹ" : "Mark List Print"}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                        {isUrdu ? "تعلیمی سال، جماعت اور ڈویژن کے لحاظ سے مضمون کی مارک لسٹوں کو تلاش اور پرنٹ کریں۔" : "Search and print finalized subject-wise mark lists by academic year, class, and division."}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-full px-2.5 py-1 w-max uppercase flex items-center gap-1 mt-4 select-none font-sans">
                      🔍 {isUrdu ? "مارک لسٹ پرنٹ کریں" : "Mark List Print"}
                    </span>
                  </div>

                  {/* Box 2: Result Books */}
                  <div 
                    onClick={() => setActiveLedgerCategory('result_books')}
                    className="border border-slate-200 hover:border-indigo-500 rounded-xl p-5 bg-slate-50/40 hover:bg-slate-50/80 transition-all text-left flex flex-col justify-between min-h-[160px] cursor-pointer group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-slate-700 group-hover:text-indigo-700 transition-all">
                        <Printer className="w-4 h-4 text-slate-500 group-hover:text-indigo-600" />
                        <h4 className="text-xs font-black uppercase tracking-wider font-sans">{t.clerk.col2.title}</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                        {t.clerk.col2.desc}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1 w-max uppercase flex items-center gap-1 mt-4 select-none">
                      🟢 View & Print ({printableResultBooks.length} Books)
                    </span>
                  </div>

                                    {/* Box 3: Progress Cards */}
                  <div 
                    onClick={() => setActiveLedgerCategory('progress_cards')}
                    className="border border-slate-200 hover:border-indigo-500 rounded-xl p-5 bg-slate-50/40 hover:bg-slate-50/80 transition-all text-left flex flex-col justify-between min-h-[160px] cursor-pointer group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-slate-700 group-hover:text-indigo-700 transition-all">
                        <Printer className="w-4 h-4 text-slate-500 group-hover:text-indigo-600" />
                        <h4 className="text-xs font-black uppercase tracking-wider">{t.clerk.col3.title}</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                        {t.clerk.col3.desc}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1 w-max uppercase flex items-center gap-1 mt-4 select-none">
                      🟡 Under Integration
                    </span>
                  </div>

                </div>
              ) : null}

              {/* LIST VIEWS */}

              {activeLedgerCategory === 'mark_lists_search' && (
                <div className="space-y-6 max-w-4xl mx-auto p-4 md:p-8 border border-slate-100 rounded-2xl bg-slate-50/50">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Academic Year Selector */}
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                        {isUrdu ? "تعلیمی سال" : "Academic Year"}
                      </label>
                      <select
                        value={markListSearchYear}
                        onChange={(e) => {
                          setMarkListSearchYear(e.target.value);
                          setMarkListSearchUnderDev(false);
                          setClerkOpenedClassMarkList(null);
                          setClerkSearchError('');
                        }}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-sans font-medium shadow-sm"
                      >
                        <option value="">{isUrdu ? "-- تعلیمی سال منتخب کریں --" : "-- Select Academic Year --"}</option>
                        {setup?.academicYears?.map((y) => (
                          <option key={y.id} value={y.year}>
                            {y.year} {y.isActive ? `(${isUrdu ? "فعال" : "Active"})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Class Selector */}
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                        {isUrdu ? "کلاس / جماعت" : "Class"}
                      </label>
                      <select
                        value={markListSearchClass}
                        onChange={(e) => {
                          setMarkListSearchClass(e.target.value);
                          setMarkListSearchUnderDev(false);
                          setClerkOpenedClassMarkList(null);
                          setClerkSearchError('');
                        }}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-sans font-medium shadow-sm"
                      >
                        <option value="">{isUrdu ? "-- کلاس منتخب کریں --" : "-- Select Class --"}</option>
                        {setup?.classes?.map((c) => (
                          <option key={c.id} value={c.className}>
                            {c.className}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Division Selector */}
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                        {isUrdu ? "ڈویژن" : "Division"}
                      </label>
                      <select
                        value={markListSearchDivision}
                        onChange={(e) => {
                          setMarkListSearchDivision(e.target.value);
                          setMarkListSearchUnderDev(false);
                          setClerkOpenedClassMarkList(null);
                          setClerkSearchError('');
                        }}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-sans font-medium shadow-sm"
                      >
                        <option value="">{isUrdu ? "-- ڈویژن منتخب کریں --" : "-- Select Division --"}</option>
                        {setup?.divisions?.map((d) => (
                          <option key={d.id} value={d.divisionName}>
                            {d.divisionName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Search Button */}
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleClerkMarkListSearch}
                      className="w-full md:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black tracking-wider uppercase transition-all shadow-sm hover:shadow-md cursor-pointer flex items-center justify-center gap-2 font-sans"
                    >
                      <Search className="w-4 h-4" />
                      <span>{isUrdu ? "تلاش کریں" : "Search"}</span>
                    </button>
                  </div>

                  {/* Under Development Response Banner */}
                  {markListSearchUnderDev && (
                    <div className="mt-6 p-6 border border-amber-200 bg-amber-50 rounded-2xl flex items-start gap-3 animate-fade-in">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-amber-800 uppercase tracking-wider">
                          {isUrdu ? "سسٹم کی اطلاع" : "System Notification"}
                        </h4>
                        <p className="text-xs font-bold text-amber-700 leading-relaxed font-sans">
                          MARK LIST SEARCH SYSTEM IS UNDER DEVELOPMENT.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Search Error / Record Not Found Banner */}
                  {clerkSearchError && (
                    <div className="mt-6 p-6 border border-rose-100 bg-rose-50/50 rounded-2xl flex items-start gap-3 animate-fade-in text-left">
                      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div className="space-y-1 w-full">
                        <h4 className="text-xs font-black text-rose-800 uppercase tracking-wider font-sans">
                          {isUrdu ? "کلاس مارک لسٹ نہیں ملی" : "Class Mark List Not Found"}
                        </h4>
                        <p className="text-xs font-bold text-rose-700 leading-relaxed font-sans whitespace-pre-line">
                          {clerkSearchError}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Clerk Opened Class Mark List (READ ONLY MODE) */}
                  {clerkOpenedClassMarkList && (
                    <div id="clerk-original-class-mark-list" className="mt-8 border-t border-slate-200/80 pt-8 space-y-6 text-left">
                      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                          <div className="space-y-3 text-left">
                            <div className="flex items-start gap-3">
                              <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                                <ClipboardList className="w-6 h-6 text-teal-400" />
                              </div>
                              <div className="space-y-1">
                                <h3 className="text-lg font-black text-slate-800 font-sans flex items-center gap-2">
                                  {isUrdu ? "کلاس مارک لسٹ" : "Class Mark List"}
                                  <span className="text-[10px] bg-indigo-100 text-indigo-800 font-black px-2 py-0.5 rounded-md uppercase tracking-wider font-sans">
                                    {isUrdu ? "صرف پڑھنے کے لیے" : "Read-Only View"}
                                  </span>
                                </h3>
                                <p className="text-xs text-slate-500 leading-normal max-w-xl font-sans">
                                  {isUrdu 
                                    ? "منتخب کردہ کلاس ڈویژن کے جمع شدہ مضمون وار نمبرات کا معائنہ کریں۔ (صرف پڑھنے کے لیے)" 
                                    : "Viewing the official submitted subject mark lists for the selected class division. All modification and workflow operations are locked."
                                  }
                                </p>
                              </div>
                            </div>
                            
                            {/* Meta details & status summary counts */}
                            {(() => {
                              const clerkLockStates = getSubjectLockStates();
                              const clerkClassAllocations = (setup?.subjectAllocations || []).filter(
                                (a: any) => a.className === clerkOpenedClassMarkList.className && 
                                           a.divisionName === clerkOpenedClassMarkList.divisionName &&
                                           a.academicYear === clerkOpenedClassMarkList.academicYear
                              );
                              const clerkClassStates = clerkLockStates.filter(
                                (s: any) => s.classId === clerkOpenedClassMarkList.className && 
                                           s.division === clerkOpenedClassMarkList.divisionName && 
                                           s.examId === clerkSelectedExam &&
                                           s.academicYear === clerkOpenedClassMarkList.academicYear
                              );
                              
                              const clerkSubmittedCount = clerkClassStates.filter(s => s.status === 'Pending Review' || s.status === 'Submitted').length;
                              const clerkDraftCount = clerkClassStates.filter(s => s.status === 'Draft').length;
                              const clerkReturnedCount = clerkClassStates.filter(s => s.status === 'Returned for Correction').length;
                              const clerkApprovedCount = clerkClassStates.filter(s => s.status === 'Approved').length;
                              const clerkTotalAllocated = clerkClassAllocations.length || 4;

                              return (
                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                  <span className="bg-slate-100 text-slate-700 text-[10px] font-bold uppercase px-2.5 py-1 rounded-md border border-slate-200">
                                    {isUrdu ? `تعلیمی سال: ${clerkOpenedClassMarkList.academicYear}` : `Academic Year: ${clerkOpenedClassMarkList.academicYear}`}
                                  </span>
                                  <span className="bg-slate-100 text-slate-700 text-[10px] font-bold uppercase px-2.5 py-1 rounded-md border border-slate-200 font-sans">
                                    {isUrdu ? `کلاس: ${clerkOpenedClassMarkList.className} (${clerkOpenedClassMarkList.divisionName})` : `Class: ${clerkOpenedClassMarkList.className} - ${clerkOpenedClassMarkList.divisionName}`}
                                  </span>
                                  <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase px-2.5 py-1 rounded-md border border-indigo-100 font-sans">
                                    {isUrdu ? `کل مضامین: ${clerkTotalAllocated}` : `Total Subjects: ${clerkTotalAllocated}`}
                                  </span>
                                  <span className="bg-rose-50 text-rose-700 text-[10px] font-bold uppercase px-2.5 py-1 rounded-md border border-rose-100 font-sans">
                                    {isUrdu ? `زیرِ جائزہ: ${clerkSubmittedCount}` : `Pending Review: ${clerkSubmittedCount}`}
                                  </span>
                                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase px-2.5 py-1 rounded-md border border-emerald-100 font-sans">
                                    {isUrdu ? `مکمل: ${clerkApprovedCount}` : `Completed: ${clerkApprovedCount}`}
                                  </span>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Exam Selector and Action Buttons within Clerk's opened view */}
                          <div className="shrink-0 flex flex-wrap gap-3 items-center self-start lg:self-center">
                            {/* Exam Selector */}
                            <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200/60">
                              {examinations.map(exam => (
                                <button
                                  key={exam.id}
                                  onClick={() => {
                                    setClerkSelectedExam(exam.id);
                                    setClerkExpandedCards({}); // collapse cards on exam switch
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide transition-all cursor-pointer font-sans ${
                                    clerkSelectedExam === exam.id
                                      ? 'bg-white text-slate-800 shadow-sm'
                                      : 'text-slate-500 hover:text-slate-800'
                                  }`}
                                >
                                  {isUrdu ? exam.shortName : exam.name}
                                </button>
                              ))}
                            </div>

                            {/* Phase-3 Action Buttons */}
                            <div className="clerk-print-actions flex items-center gap-2">
                              <button
                                onClick={handleClerkPrint}
                                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-300 hover:border-slate-400 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 font-sans"
                              >
                                <Printer className="w-4 h-4 text-slate-500" />
                                {isUrdu ? "پرنٹ کریں" : "Print"}
                              </button>
                              <button
                                onClick={handleClerkDownloadPDF}
                                disabled={isDownloadingPDF}
                                className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 font-sans ${
                                  isDownloadingPDF 
                                    ? 'bg-indigo-400 text-slate-100 cursor-not-allowed opacity-75' 
                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                }`}
                              >
                                {isDownloadingPDF ? (
                                  <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    {isUrdu ? "پی ڈی ایف تیار ہو رہی ہے..." : "Generating..."}
                                  </>
                                ) : (
                                  <>
                                    <Download className="w-4 h-4" />
                                    {isUrdu ? "پی ڈی ایف ڈاؤن لوڈ" : "Download PDF"}
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Submitted evaluation records (Subject Cards) for Clerk view */}
                        <div className="pt-6 border-t border-slate-100 space-y-4">
                          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                              <ClipboardList className="w-5 h-5 text-indigo-600" />
                              <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider">
                                {isUrdu ? "جمع شدہ مضامین کے نمبرات کا ریکارڈ" : "Submitted Class Evaluation Records"}
                              </h4>
                            </div>
                            <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-md">
                              {isUrdu ? "امتحان: " : "Exam: "} {examinations.find(e => e.id === clerkSelectedExam)?.name || clerkSelectedExam}
                            </span>
                          </div>

                          {/* Render the subject cards */}
                          {(() => {
                            const clerkLockStates = getSubjectLockStates();
                            const clerkClassAllocations = (setup?.subjectAllocations || []).filter(
                              (a: any) => a.className === clerkOpenedClassMarkList.className && 
                                         a.divisionName === clerkOpenedClassMarkList.divisionName &&
                                         a.academicYear === clerkOpenedClassMarkList.academicYear
                            );

                            const clerkSubmittedItems = clerkClassAllocations.map((alloc: any) => {
                              const lockId = `lock_${clerkOpenedClassMarkList.academicYear}_${clerkSelectedExam}_${alloc.className.replace(/\s+/g, '_')}_${alloc.divisionName.replace(/\s+/g, '_')}_${alloc.subjectName.replace(/\s+/g, '_')}`;
                              const state = clerkLockStates.find(s => s.id === lockId);
                              return {
                                allocation: alloc,
                                state,
                                status: state ? state.status : 'Not Generated'
                              };
                            }).filter(item => item.status === 'Pending Review' || item.status === 'Submitted' || item.status === 'Resubmitted' || item.status === 'Approved');

                            if (clerkSubmittedItems.length === 0) {
                              return (
                                <div className="p-8 text-center bg-slate-50/50 border border-dashed border-slate-200 rounded-xl space-y-1.5">
                                  <ClipboardList className="w-8 h-8 text-slate-300 mx-auto" />
                                  <p className="text-xs font-bold text-slate-500">
                                    {isUrdu ? "اس امتحان کے لیے کوئی جمع شدہ مارک لسٹ نہیں ملی۔" : "No submitted mark lists found for this exam."}
                                  </p>
                                  <p className="text-[10px] text-slate-400 font-sans">
                                    {isUrdu ? "جب مضمون کے اساتذہ مارک لسٹ جمع کریں گے تو وہ یہاں نظر آئیں گی۔" : "Once subject teachers submit their mark lists, they will appear here for review."}
                                  </p>
                                </div>
                              );
                            }

                            return (
                              <div className="space-y-4">
                                {clerkSubmittedItems.map((item: any) => {
                                  const cardId = item.state?.id || `lock_${clerkOpenedClassMarkList.academicYear}_${clerkSelectedExam}_${item.allocation.className.replace(/\s+/g, '_')}_${item.allocation.divisionName.replace(/\s+/g, '_')}_${item.allocation.subjectName.replace(/\s+/g, '_')}`;
                                  const isOpen = !!clerkExpandedCards[cardId];
                                  
                                  let badgeStyle = 'bg-slate-100 text-slate-500 border-slate-200';
                                  let statusText = item.status;

                                  if (item.status === 'Pending Review' || item.status === 'Submitted') {
                                    badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200';
                                    statusText = isUrdu ? "زیرِ جائزہ" : "Pending Review";
                                  } else if (item.status === 'Resubmitted') {
                                    badgeStyle = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                                    statusText = isUrdu ? "دوبارہ جمع کرایا" : "Resubmitted";
                                  } else if (item.status === 'Approved') {
                                    badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                                    statusText = isUrdu ? "🟢 رزلٹ بک میں شامل" : "🟢 Sent to Result Book";
                                  } else if (item.status === 'Returned' || item.status === 'Returned for Correction') {
                                    badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200';
                                    statusText = isUrdu ? "اصلاح کے لیے واپس" : "Returned";
                                  }

                                  const submitDate = item.state?.lockedAt 
                                    ? new Date(item.state.lockedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + new Date(item.state.lockedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                                    : (clerkSelectedExam === 'ex_1' ? '10-Jul-2026, 04:30 PM' : '11-Jul-2026, 11:20 AM');

                                  const masterTemplate = getTemplateForAllocation(item.allocation);
                                  const examObj = examinations.find(e => e.id === clerkSelectedExam) || { id: clerkSelectedExam, name: clerkSelectedExam };
                                  const template = getCustomizedTemplateForTeacher(masterTemplate, item.allocation, examObj);
                                  
                                  const assessmentType = template.name.includes('Language') 
                                    ? (isUrdu ? "تشخیصی زبان کا فریم ورک" : "Language Diagnostic Framework")
                                    : (isUrdu ? "مسلسل اور جامع جانچ (CCE)" : "Formative & Summative (CCE)");

                                  return (
                                    <div 
                                      key={cardId}
                                      className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-sm hover:border-slate-300 transition-all text-left animate-fade-in"
                                    >
                                      {/* Card Header - Clickable */}
                                      <div 
                                        onClick={() => {
                                          setClerkExpandedCards(prev => ({
                                            ...prev,
                                            [cardId]: !isOpen
                                          }));
                                        }}
                                        className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer hover:bg-slate-50/50 transition-all select-none"
                                      >
                                        <div className="space-y-2 text-left w-full md:w-auto">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="bg-slate-100 text-slate-600 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-md border border-slate-200 font-sans">
                                              {isUrdu ? `تعلیمی سال: ${clerkOpenedClassMarkList.academicYear}` : `AY: ${clerkOpenedClassMarkList.academicYear}`}
                                            </span>
                                            <span className="bg-slate-100 text-slate-600 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-md border border-slate-200 font-sans">
                                              {item.allocation.className} - {item.allocation.divisionName}
                                            </span>
                                            <span className="bg-indigo-50 text-indigo-700 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-md border border-indigo-100 font-sans">
                                              {examObj.name}
                                            </span>
                                            <span className="bg-slate-50 text-slate-500 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-md border border-slate-150 font-sans">
                                              {assessmentType}
                                            </span>
                                          </div>
                                          
                                          <div className="flex items-baseline gap-2">
                                            <span className="text-base font-black text-slate-800 tracking-tight block">
                                              {item.allocation.subjectName}
                                            </span>
                                            <span className="text-xs text-slate-400 font-medium">
                                              {isUrdu ? `بذریعہ ${item.allocation.teacherName}` : `by ${item.allocation.teacherName}`}
                                            </span>
                                          </div>

                                          <p className="text-[10px] text-slate-400 font-mono">
                                            {isUrdu ? `جمع کرانے کی تاریخ و وقت: ${submitDate}` : `Submitted At: ${submitDate}`}
                                          </p>
                                        </div>

                                        <div className="flex items-center justify-between w-full md:w-auto md:justify-end gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                                           {/* Individual Subject Row Actions */}
                                           <div className="flex items-center gap-2 print:hidden" onClick={(e) => e.stopPropagation()}>
                                             <button
                                               onClick={() => handleSingleClerkPrint(cardId)}
                                               className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-300 hover:border-slate-400 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 font-sans"
                                               title={isUrdu ? "پرنٹ کریں" : "Print Subject Mark List"}
                                             >
                                               <Printer className="w-3.5 h-3.5 text-slate-500" />
                                               <span>{isUrdu ? "پرنٹ" : "Print"}</span>
                                             </button>
                                             <button
                                               onClick={() => handleSingleClerkDownloadPDF(cardId, item.allocation.subjectName)}
                                               disabled={isDownloadingPDF}
                                               className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-indigo-400 disabled:opacity-75 disabled:cursor-not-allowed text-[11px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 font-sans"
                                               title={isUrdu ? "پی ڈی ایف ڈاؤن لوڈ کریں" : "Download Subject PDF"}
                                             >
                                               {isDownloadingPDF ? (
                                                 <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                               ) : (
                                                 <FileText className="w-3.5 h-3.5" />
                                               )}
                                               <span>{isUrdu ? "پی ڈی ایف" : "PDF"}</span>
                                             </button>
                                           </div>

                                           <span className={`text-[10px] font-black px-3 py-1 rounded-md border uppercase tracking-wider font-sans ${badgeStyle}`}>
                                            {statusText}
                                          </span>
                                          <div className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all shrink-0">
                                            {isOpen ? (
                                              <ChevronUp className="w-4 h-4 text-slate-600" />
                                            ) : (
                                              <ChevronDown className="w-4 h-4 text-slate-600" />
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Expanded Content - Read Only Spreadsheet */}
                                      {isOpen && (() => {
                                        const itemStudents = getStudentsForClass(item.allocation.className, item.allocation.divisionName);
                                        const itemEntries = LocalERPDatabase.getStudentMarkEntries().filter(
                                          e => e.examId === clerkSelectedExam && 
                                               e.classId === item.allocation.className && 
                                               e.division === item.allocation.divisionName && 
                                               e.subjectId === item.allocation.subjectName
                                        );

                                        const itemVals: Record<string, Record<string, any>> = {};
                                        const itemRemarks: Record<string, string> = {};
                                        itemEntries.forEach(entry => {
                                          itemVals[entry.studentId] = entry.marks || {};
                                          itemRemarks[entry.studentId] = entry.remarks || '';
                                        });

                                        return (
                                          <div className="px-5 pb-6 pt-2 border-t border-slate-100 bg-slate-50/20 space-y-5 animate-fade-in text-left font-sans">
                                            <div className="space-y-2 print:hidden">
                                              <div className="flex items-center gap-1.5 text-xs font-black text-slate-600 uppercase tracking-wider font-sans">
                                                <FileSpreadsheet className="w-4 h-4 text-indigo-500" />
                                                <span>{isUrdu ? "جمع شدہ مارک شیٹ (صرف پڑھنے کے لیے)" : "Submitted Mark Sheet (Read Only View)"}</span>
                                              </div>
                                              <p className="text-xs text-slate-400 font-sans font-sans">
                                                {isUrdu 
                                                  ? "یہ مارک شیٹ باضابطہ طور پر جمع کرائی جا چکی ہے۔ مضمون کے استاد کے ذریعے بھیجے گئے اصل نمبرات کا معائنہ کریں۔" 
                                                  : "This mark sheet is locked as a verified submission. You are reviewing the official academic grades submitted by the subject teacher."
                                                }
                                              </p>
                                            </div>

                                            {/* Read-Only Table */}
                                            <div className="clerk-printable-marklist-document bg-white" data-card-id={cardId}>
                                              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm max-h-[500px] overflow-y-auto overflow-x-auto relative print:border-none print:shadow-none print:max-h-none print:overflow-visible">
                                                <table className="w-full border-collapse font-sans text-xs">
                                                <thead>
                                                  <tr className="bg-slate-100 border-b border-slate-300">
                                                    <th className="w-10 bg-slate-200 text-slate-500 font-mono text-[10px] text-center border-r border-slate-300 py-1.5 shrink-0 select-none"></th>
                                                    {(template?.headers || []).map((h: any, idx: number) => {
                                                      const colLetter = String.fromCharCode(65 + idx);
                                                      return (
                                                        <th key={`clerk_ct_th_${h.id}`} className="bg-slate-100 text-slate-500 font-mono text-[10px] text-center font-bold border-r border-slate-300 py-1 select-none min-w-[90px]" style={{ width: h.width }}>
                                                          {colLetter}
                                                        </th>
                                                      );
                                                    })}
                                                  </tr>
                                                </thead>

                                                <tbody>
                                                  <tr className="bg-white border-b border-slate-200">
                                                    <td className="bg-slate-100 text-slate-500 font-mono text-[9px] text-center border-r border-slate-300 font-bold">1</td>
                                                    <td colSpan={template?.headers?.length || 1} className="border-r border-slate-200 px-4 text-center font-sans font-black text-slate-800 text-sm tracking-wider bg-slate-50/50 py-2">
                                                      NATIONAL HIGH SCHOOL, TALODA
                                                    </td>
                                                  </tr>
                                                  <tr className="bg-white border-b border-slate-200">
                                                    <td className="bg-slate-100 text-slate-500 font-mono text-[9px] text-center border-r border-slate-300 font-bold">2</td>
                                                    <td colSpan={template?.headers?.length || 1} className="border-r border-slate-200 px-4 text-center font-sans font-bold text-slate-600 text-xs tracking-normal bg-white py-1">
                                                      {template.sections?.[1]?.text || `OFFICIAL SUBJECT GRADE SHEET - ${item.allocation.subjectName.toUpperCase()} (${examObj.name.toUpperCase()})`}
                                                    </td>
                                                  </tr>
                                                  <tr className="bg-white border-b border-slate-200">
                                                    <td className="bg-slate-100 text-slate-500 font-mono text-[9px] text-center border-r border-slate-300 font-bold">3</td>
                                                    <td colSpan={template?.headers?.length || 1} className="border-r border-slate-200 px-4 text-center font-mono text-slate-400 text-[10px] py-1 bg-white">
                                                      {template.sections?.[2]?.text || `Class Division: ${item.allocation.className} - ${item.allocation.divisionName} | Academic Year: ${clerkOpenedClassMarkList.academicYear} | Teacher Signature Register`}
                                                    </td>
                                                  </tr>

                                                  <tr className="bg-slate-150 border-b-2 border-slate-350 font-extrabold text-slate-700 text-center">
                                                    <td className="bg-slate-100 text-slate-500 font-mono text-[9px] text-center border-r border-slate-300 font-bold">4</td>
                                                    {(template?.headers || []).map((h: any) => {
                                                      const isMetadata = h.text.toLowerCase().includes('roll') || 
                                                                         h.text.toLowerCase().includes('g.r.') || 
                                                                         h.text.toLowerCase().includes('name') || 
                                                                         h.text.toLowerCase().includes('total') || 
                                                                         h.text.toLowerCase().includes('grade') || 
                                                                         h.text.toLowerCase().includes('sign') || 
                                                                         h.text.toLowerCase().includes('remark');
                                                      const maxMarks = getHeaderMaxMarks(h);
                                                      
                                                      return (
                                                        <td key={`clerk_ct_lbl_${h.id}`} className="border-r border-slate-300 px-2 py-2.5 text-center align-middle bg-slate-100/70 relative font-black text-slate-700 font-sans font-sans" style={{ width: h.width }}>
                                                          <span className="block font-sans font-black text-xs font-sans">{h.text}</span>
                                                          {!isMetadata && !h.formula && template?.id !== 'tmpl_class_1_8_language' && (
                                                      <span className="block text-[9px] text-slate-400 uppercase font-mono font-bold mt-0.5">Max: {maxMarks}</span>
                                                    )}
                                                          {h.formula && (
                                                            <span className="absolute bottom-0.5 right-1 text-[8px] text-emerald-600 bg-emerald-50 font-mono font-bold rounded px-0.5">fx</span>
                                                          )}
                                                        </td>
                                                      );
                                                    })}
                                                  </tr>

                                                  {itemStudents.map((student, rIdx) => {
                                                    const studentVals = itemVals[student.id] || {};
                                                    const evaluatedScores: Record<string, string | number> = { ...studentVals };
                                                    (template?.headers || []).forEach((h: any) => {
                                                      if (h.formula) {
                                                        evaluatedScores[h.id] = evaluateFormula(h.formula, student.id, evaluatedScores, template);
                                                      }
                                                    });

                                                    return (
                                                      <tr key={`clerk_ct_row_${student.id}`} className="hover:bg-slate-50/50 border-b border-slate-200 h-9">
                                                        <td className="bg-slate-100 text-slate-400 font-mono text-[9px] text-center border-r border-slate-300 font-medium select-none">
                                                          {rIdx + 5}
                                                        </td>
                                                        
                                                        {(template?.headers || []).map((h: any) => {
                                                          const lowerText = h.text.toLowerCase();
                                                          const identityType = h.identityType || '';
                                                          const isSrNo = identityType === 'srNo' || lowerText.includes('sr.') || lowerText.includes('sr no');
                                                          const isSeatNo = identityType === 'seatNo' || lowerText.includes('seat') || lowerText.includes('exam seat');
                                                          const isRollNo = lowerText.includes('roll');
                                                          const isGrNo = lowerText.includes('g.r.');
                                                          const isName = identityType === 'name' || lowerText.includes('name');
                                                          const isRemarksCol = lowerText.includes('remark');
                                                          
                                                          if (isSrNo) {
                                                            return (
                                                              <td key={`clerk_ct_cell_${student.id}_${h.id}`} className="border-r border-slate-200 text-slate-500 text-center font-mono align-middle">
                                                                {rIdx + 1}
                                                              </td>
                                                            );
                                                          }
                                                          if (isSeatNo) {
                                                            const stAny = student as any;
                                                            const seatVal = stAny.examSeatNo || stAny.seatNo || (student.rollNo ? `S2026-${String(student.rollNo).padStart(3, '0')}` : (student.grNumber || stAny.admissionNo || `SEAT-${rIdx+1}`));
                                                            return (
                                                              <td key={`clerk_ct_cell_${student.id}_${h.id}`} className="border-r border-slate-200 font-mono text-center font-bold text-slate-700 align-middle">
                                                                {seatVal}
                                                              </td>
                                                            );
                                                          }
                                                          if (isRollNo) {
                                                            return (
                                                              <td key={`clerk_ct_cell_${student.id}_${h.id}`} className="border-r border-slate-200 text-slate-500 text-center font-mono align-middle">
                                                                {student.rollNo}
                                                              </td>
                                                            );
                                                          }
                                                          if (isGrNo) {
                                                            return (
                                                              <td key={`clerk_ct_cell_${student.id}_${h.id}`} className="border-r border-slate-200 text-slate-400 text-center font-mono align-middle">
                                                                {student.grNumber}
                                                              </td>
                                                            );
                                                          }
                                                          if (isName) {
                                                            return (
                                                              <td key={`clerk_ct_cell_${student.id}_${h.id}`} className="border-r border-slate-200 font-extrabold text-slate-800 pl-3 text-left align-middle font-sans">
                                                                {student.name}
                                                              </td>
                                                            );
                                                          }
                                                          
                                                          if (h.formula) {
                                                            const val = evaluatedScores[h.id] !== undefined ? evaluatedScores[h.id] : '';
                                                            const isGradeCol = h.formula.includes('GRADE');
                                                            
                                                            if (isGradeCol) {
                                                              const grade = String(val);
                                                              return (
                                                                <td key={`clerk_ct_cell_${student.id}_${h.id}`} className="border-r border-slate-200 font-black text-center align-middle font-sans font-sans font-sans">
                                                                  <span className={`px-2 py-0.5 rounded text-[10px] font-sans ${
                                                                    grade === 'E' 
                                                                      ? 'bg-rose-100 text-rose-800' 
                                                                      : grade.startsWith('A') 
                                                                        ? 'bg-emerald-100 text-emerald-800' 
                                                                        : 'bg-indigo-100 text-indigo-800'
                                                                  }`}>
                                                                    {grade || '-'}
                                                                  </span>
                                                                </td>
                                                              );
                                                            }
                                                            
                                                            return (
                                                              <td key={`clerk_ct_cell_${student.id}_${h.id}`} className="border-r border-slate-200 font-mono font-black text-center bg-emerald-50/20 text-emerald-700 text-xs align-middle">
                                                                {val}
                                                              </td>
                                                            );
                                                          }
                                                          
                                                          if (isRemarksCol) {
                                                            return (
                                                              <td key={`clerk_ct_cell_${student.id}_${h.id}`} className="border-r border-slate-200 px-3 text-left italic text-slate-500 font-medium align-middle font-sans">
                                                                {itemRemarks[student.id] || '-'}
                                                              </td>
                                                            );
                                                          }
                                                          
                                                          const scoreVal = studentVals[h.id] !== undefined ? studentVals[h.id] : '';
                                                          return (
                                                            <td key={`clerk_ct_cell_${student.id}_${h.id}`} className="border-r border-slate-200 font-mono font-extrabold text-slate-800 text-center align-middle">
                                                              {scoreVal || '-'}
                                                            </td>
                                                          );
                                                        })}
                                                      </tr>
                                                    );
                                                  })}
                                                </tbody>
                                              </table>
                                            </div>

                                            {/* Signature Area */}
                                            <div className="hidden print:flex justify-between text-[11px] font-bold text-slate-700 font-sans pt-8 mt-4">
                                              <div className="text-center w-1/3">
                                                <div className="border-t border-slate-400 w-44 mx-auto mt-6 pt-1">
                                                  {isUrdu ? "مضمون کے استاد کے دستخط" : "Subject Teacher Signature"}
                                                </div>
                                              </div>
                                              <div className="text-center w-1/3">
                                                <div className="border-t border-slate-400 w-44 mx-auto mt-6 pt-1">
                                                  {isUrdu ? "کلاس ٹیچر کے دستخط" : "Class Teacher Signature"}
                                                </div>
                                              </div>
                                              <div className="text-center w-1/3">
                                                <div className="border-t border-slate-400 w-44 mx-auto mt-6 pt-1">
                                                  {isUrdu ? "ہیڈ ماسٹر کا مہر اور دستخط" : "Headmaster Stamp & Sign"}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                      })()}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeLedgerCategory === 'result_books' && (
                <div className="space-y-4">
                  {printableResultBooks.filter(rb => 
                    rb.className.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
                    rb.divisionName.toLowerCase().includes(ledgerSearch.toLowerCase())
                  ).length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-sans">
                      No matching locked class result books are currently available.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 font-black text-slate-700 uppercase tracking-wider">
                            <th className="px-6 py-3">Academic Year</th>
                            <th className="px-6 py-3">Class & Division</th>
                            <th className="px-6 py-3">Total Students</th>
                            <th className="px-6 py-3">Locked By</th>
                            <th className="px-6 py-3">Date Locked</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {printableResultBooks.filter(rb => 
                            rb.className.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
                            rb.divisionName.toLowerCase().includes(ledgerSearch.toLowerCase())
                          ).map((rb) => (
                            <tr key={rb.id} className="hover:bg-slate-50/50 transition-all">
                              <td className="px-6 py-3.5 font-mono text-slate-500">{rb.academicYear}</td>
                              <td className="px-6 py-3.5 font-extrabold text-slate-800">{rb.className} - {rb.divisionName}</td>
                              <td className="px-6 py-3.5 font-bold text-slate-600">{rb.students.length} Pupils</td>
                              <td className="px-6 py-3.5 text-slate-600">{rb.lockedBy}</td>
                              <td className="px-6 py-3.5 text-slate-400 font-mono text-[10px]">{new Date(rb.sentAt).toLocaleString()}</td>
                              <td className="px-6 py-3.5">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                  rb.isArchived 
                                    ? 'bg-slate-100 border border-slate-200 text-slate-500'
                                    : 'bg-rose-50 border border-rose-200 text-rose-700'
                                }`}>
                                  🔒 {rb.isArchived ? "Archived" : "Locked"}
                                </span>
                              </td>
                              <td className="px-6 py-3.5 text-right flex justify-end gap-1.5 flex-wrap">
                                <button
                                  onClick={() => setClerkSelectedResultBook(rb)}
                                  className="px-2.5 py-1.5 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg font-bold text-[10px] transition-all cursor-pointer uppercase tracking-wider flex items-center gap-1 shadow-sm"
                                >
                                  <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                                  Open Workbook
                                </button>
                                <button
                                  onClick={() => handleDownloadResultBook(rb)}
                                  className="px-2.5 py-1.5 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg font-bold text-[10px] transition-all cursor-pointer uppercase tracking-wider flex items-center gap-1 shadow-sm"
                                >
                                  <Download className="w-3.5 h-3.5 text-slate-500" />
                                  Excel
                                </button>
                                <button type="button"
                                  onClick={() => handleToggleArchiveResultBook(rb.id)}
                                  className={`px-2.5 py-1.5 border rounded-lg font-bold text-[10px] transition-all cursor-pointer uppercase tracking-wider flex items-center gap-1 shadow-sm ${
                                    rb.isArchived
                                      ? 'bg-amber-50 border-amber-200 hover:bg-amber-100 text-amber-700'
                                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-500'
                                  }`}
                                >
                                  <Archive className="w-3.5 h-3.5" />
                                  {rb.isArchived ? "Unarchive" : "Archive"}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeLedgerCategory === 'progress_cards' && (
                <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl text-slate-400 space-y-3 font-sans max-w-lg mx-auto">
                  <Info className="w-8 h-8 text-indigo-400 mx-auto" />
                  <div>
                    <h5 className="font-extrabold text-slate-700 mb-1">Progress Cards Pipeline</h5>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      This module is a placeholder. Future workflow automations will automatically compile and stream completed Progress Cards to this category upon final Academic Term sign-off.
                    </p>
                  </div>
                </div>
              )}

              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/30">
                <p className="text-[11px] text-slate-400 italic">Evaluation registry logs are locked during the active drafting phase.</p>
              </div>

              {/* VIEW / PRINT MODALS */}

              {clerkSelectedResultBook && (
                <CommonPrintEngine
                  title={`${clerkSelectedResultBook.className} - ${clerkSelectedResultBook.divisionName} Consolidated Result Book`}
                  pages={(clerkSelectedResultBook.studentResultBooks || []).map((sb: any, idx: number) => ({
                    sheet: sb.sheetData,
                    title: sb.studentName,
                    pageNumber: idx + 1
                  }))}
                  user={user}
                  lang={lang}
                  onClose={() => setClerkSelectedResultBook(null)}
                  scale={77}
                  paperSize="legal"
                  orientation="portrait"
                />
              )}



              </div>
            </div>
          )}

          {/* Tab 2: Template Management List view */}
          {clerkTab === 'templates' && !selectedTemplate && (
            <div className="space-y-6">
                            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm text-left space-y-4">
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-slate-800">
                    {isUrdu ? "آفیشل مارک لسٹ ٹیمپلیٹ انتظام" : "Official Mark List Templates"}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-2xl leading-relaxed font-sans">
                    {isUrdu
                      ? "اساتذہ کے پاس مارک لسٹ کی تیاری کے لیے آفیشل ٹیمپلیٹس کا ڈھانچہ تشکیل دیں۔ یہ ٹیمپلیٹس اساتذہ کے مارک اینٹری فارم میں خود کار طریقے سے کاپی ہو جاتے ہیں۔"
                      : "Configure the structural rules and formatting standards of official mark lists. The system automatically selects the correct master template from the Teacher academic assignment, class and subject; Clerk does not manually map a teacher or subject to a template."}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {templatesList.map((tmpl) => (
                    <div 
                      key={tmpl.id} 
                      className="border border-slate-200 hover:border-emerald-500 hover:shadow-md rounded-2xl p-5 bg-slate-50/20 hover:bg-white transition-all flex flex-col justify-between space-y-5 text-left group"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="w-10 h-10 rounded-xl bg-slate-950 text-emerald-400 flex items-center justify-center">
                            <FileSpreadsheet className="w-5 h-5" />
                          </div>
                          <span className="bg-slate-100 text-slate-600 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md border border-slate-200">
                            AY: {tmpl.academicYear}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-black text-slate-800 font-sans group-hover:text-emerald-700 transition-all">
                            {isUrdu ? tmpl.nameUr : tmpl.name}
                          </h4>
                          <p className="text-xs text-slate-500 leading-relaxed font-sans">
                            {isUrdu ? tmpl.descriptionUr : tmpl.description}
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                        <div className="text-[10px] text-slate-400 font-mono">
                          {tmpl.headers.length} Columns x {tmpl.rows} Rows format
                        </div>
                        <button
                          onClick={() => { 
                            setSelectedTemplate(tmpl); 
                            setEditingTemplate(JSON.parse(JSON.stringify(tmpl)));
                            setUploadSuccess(false); 
                            setSelectedCell(null);
                            setSelectedColumnId(null);
                            setSelectedRowIndex(null);
                            setSelectedSectionIndex(null);
                            setActiveRibbonTab('home');
                          }}
                          className="px-4 py-2 bg-slate-900 hover:bg-emerald-600 text-white text-xs font-black tracking-wide uppercase rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          {isUrdu ? "ٹیمپلیٹ کا معائنہ کریں" : "Preview & Manage"}
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Important Business Guidelines Callout Box */}
                <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 flex gap-3 text-left">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h5 className="text-xs font-extrabold text-amber-800">
                      {isUrdu ? "آفیشل پالیسی برائے ٹیمپلیٹس" : "Official Template Deployment Rules"}
                    </h5>
                    <p className="text-[11px] text-amber-700/90 leading-relaxed font-sans">
                      {isUrdu
                        ? "یہ صفحہ صرف آفیشل ڈھانچے (کالم، رو کی بلندی، الائنمنٹ، فارمیٹس) کی تصدیق اور کنٹرول کے لیے ہے۔ یہاں لائیو طلبہ کے نام یا نمبرات درج نہیں کیے جا سکتے۔"
                        : "This desk controls only the official template structure and printing standard. Live student records and marks remain inside Teacher/Class Teacher workspaces. Template selection for each Teacher is automatic from Academic Assignment + Class + Subject + Term; there is no manual Clerk routing step."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Selected Template Worksheet View */}
          {clerkTab === 'templates' && selectedTemplate && editingTemplate && (
            <div id="result-master-template-print" className="space-y-6 animate-fade-in text-left print:bg-white print:p-0 print:border-none">
              
              {/* Worksheet Command Deck */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0">
                
                {/* Back button and Meta info */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-5 print:hidden">
                  <div className="space-y-1.5">
                    <button
                      onClick={() => { setSelectedTemplate(null); setUploadSuccess(false); }}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span>←</span> {isUrdu ? "ٹیمپلیٹس کی فہرست پر واپس جائیں" : "Back to templates list"}
                    </button>
                    <h3 className="text-lg font-black text-slate-800 font-sans flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-500 shrink-0" />
                      {isUrdu ? editingTemplate.nameUr : editingTemplate.name}
                    </h3>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        // Restore original (Reset draft)
                        setEditingTemplate(JSON.parse(JSON.stringify(selectedTemplate)));
                        setUploadSuccess(false);
                      }}
                      className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-black uppercase tracking-wide rounded-xl transition-all cursor-pointer font-sans"
                    >
                      Reset Draft
                    </button>

                    <button
                      type="button"
                      onClick={() => printSectionById('result-master-template-print', `${editingTemplate.name || 'Result'} Master Template`)}
                      className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-black uppercase tracking-wide rounded-xl transition-all flex items-center gap-1.5 cursor-pointer font-sans"
                    >
                      <Printer className="w-4 h-4 text-slate-500" />
                      {isUrdu ? "پرنٹ لے آؤٹ" : "Print Sheet (A4)"}
                    </button>

                    <button
                      onClick={() => handleDownloadTemplate(editingTemplate)}
                      className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-black uppercase tracking-wide rounded-xl transition-all flex items-center gap-1.5 cursor-pointer font-sans"
                    >
                      <Download className="w-4 h-4 text-slate-500" />
                      {isUrdu ? "ڈاؤن لوڈ ٹیمپلیٹ" : "Download Template"}
                    </button>

                    <button
                      onClick={() => setShowSaveWarningModal(true)}
                      className="px-5 py-2 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-black uppercase tracking-wide rounded-xl transition-all flex items-center gap-1.5 shadow-md hover:shadow-lg cursor-pointer font-sans"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-100" />
                      Save Master Template
                    </button>
                  </div>
                </div>

                {/* EXCEL RIBBON TOOLBAR (Microsoft Excel Style) */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden print:hidden shadow-sm">
                  {/* Ribbon Tabs Selector */}
                  <div className="flex border-b border-slate-200 bg-slate-100 text-xs font-bold text-slate-600">
                    <button
                      onClick={() => setActiveRibbonTab('home')}
                      className={`px-5 py-2.5 border-r border-slate-200 transition-all font-sans ${activeRibbonTab === 'home' ? 'bg-white text-emerald-700 border-t-2 border-t-emerald-600' : 'hover:bg-slate-50'}`}
                    >
                      Home (Formatting)
                    </button>
                    <button
                      onClick={() => setActiveRibbonTab('layout')}
                      className={`px-5 py-2.5 border-r border-slate-200 transition-all font-sans ${activeRibbonTab === 'layout' ? 'bg-white text-emerald-700 border-t-2 border-t-emerald-600' : 'hover:bg-slate-50'}`}
                    >
                      Layout & Structure
                    </button>
                    <button
                      onClick={() => setActiveRibbonTab('page')}
                      className={`px-5 py-2.5 border-r border-slate-200 transition-all font-sans ${activeRibbonTab === 'page' ? 'bg-white text-emerald-700 border-t-2 border-t-emerald-600' : 'hover:bg-slate-50'}`}
                    >
                      Page Setup
                    </button>
                    <button
                      onClick={() => setActiveRibbonTab('formulas')}
                      className={`px-5 py-2.5 border-r border-slate-200 transition-all font-sans ${activeRibbonTab === 'formulas' ? 'bg-white text-emerald-700 border-t-2 border-t-emerald-600' : 'hover:bg-slate-50'}`}
                    >
                      Formulas & Math
                    </button>
                    <button
                      onClick={() => setActiveRibbonTab('backups')}
                      className={`px-5 py-2.5 border-r border-slate-200 transition-all font-sans ${activeRibbonTab === 'backups' ? 'bg-white text-emerald-700 border-t-2 border-t-emerald-600' : 'hover:bg-slate-50'} flex items-center gap-1`}
                    >
                      <History className="w-3.5 h-3.5 text-slate-400" />
                      Backups & Recovery ({(backups[selectedTemplate.id] || []).length})
                    </button>
                  </div>

                  {/* Ribbon Tab Content Panel */}
                  <div className="p-4 bg-white min-h-[85px] flex flex-wrap items-center gap-6 text-xs border-b border-slate-200">
                    
                    {/* Tab 1: HOME (Formatting) */}
                    {activeRibbonTab === 'home' && (
                      <div className="flex flex-wrap items-center gap-6">
                        {/* Font Family Selection */}
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-400 block font-mono font-bold uppercase">Font Family</span>
                          <select
                            value={
                              selectedColumnId 
                                ? (editingTemplate.headers.find((h: any) => h.id === selectedColumnId)?.font || 'font-sans')
                                : 'font-sans'
                            }
                            disabled={!selectedColumnId}
                            onChange={(e) => {
                              if (selectedColumnId) {
                                setEditingTemplate((prev: any) => ({
                                  ...prev,
                                  headers: (prev.headers || []).map((h: any) => 
                                    h.id === selectedColumnId ? { ...h, font: e.target.value } : h
                                  )
                                }));
                              }
                            }}
                            className="p-1.5 border border-slate-300 rounded bg-white text-slate-800 disabled:bg-slate-50 disabled:text-slate-400 font-medium font-sans"
                          >
                            <option value="font-sans">Inter (Modern Sans)</option>
                            <option value="font-mono">JetBrains Mono (Tech)</option>
                            <option value="font-serif">Outfit (Sans Bold)</option>
                          </select>
                        </div>

                        {/* Text Alignment */}
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-400 block font-mono font-bold uppercase">Alignment</span>
                          <div className="flex border border-slate-300 rounded overflow-hidden">
                            {(['left', 'center', 'right'] as const).map((align) => {
                              const activeCol = selectedColumnId 
                                ? editingTemplate.headers.find((h: any) => h.id === selectedColumnId)
                                : null;
                              const isActive = activeCol?.align === align;
                              return (
                                <button
                                  key={align}
                                  disabled={!selectedColumnId}
                                  onClick={() => {
                                    if (selectedColumnId) {
                                      setEditingTemplate((prev: any) => ({
                                        ...prev,
                                        headers: (prev.headers || []).map((h: any) => 
                                          h.id === selectedColumnId ? { ...h, align } : h
                                        )
                                      }));
                                    }
                                  }}
                                  className={`px-3 py-1.5 font-sans font-extrabold capitalize transition-all disabled:text-slate-300 ${isActive ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-200'}`}
                                >
                                  {align}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Borders Setting */}
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-400 block font-mono font-bold uppercase">Borders Style</span>
                          <select
                            disabled={!selectedColumnId}
                            value={
                              selectedColumnId
                                ? (editingTemplate.headers.find((h: any) => h.id === selectedColumnId)?.border || 'border-r border-slate-300')
                                : ''
                            }
                            onChange={(e) => {
                              if (selectedColumnId) {
                                setEditingTemplate((prev: any) => ({
                                  ...prev,
                                  headers: (prev.headers || []).map((h: any) => 
                                    h.id === selectedColumnId ? { ...h, border: e.target.value } : h
                                  )
                                }));
                              }
                            }}
                            className="p-1.5 border border-slate-300 rounded bg-white text-slate-800 disabled:bg-slate-50 disabled:text-slate-400 font-medium font-sans"
                          >
                            <option value="border-r border-slate-300">Thin Gray Divider</option>
                            <option value="border-r-2 border-slate-400 font-bold">Thick Border</option>
                            <option value="border-r border-double border-slate-500">Double Border</option>
                            <option value="border-none">No Border</option>
                          </select>
                        </div>

                        {/* Column Width Slider */}
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-400 block font-mono font-bold uppercase">Column Width</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min="60"
                              max="350"
                              disabled={!selectedColumnId}
                              value={
                                selectedColumnId 
                                  ? parseInt(editingTemplate.headers.find((h: any) => h.id === selectedColumnId)?.width || '100')
                                  : 100
                              }
                              onChange={(e) => {
                                if (selectedColumnId) {
                                  setEditingTemplate((prev: any) => ({
                                    ...prev,
                                    headers: (prev.headers || []).map((h: any) => 
                                      h.id === selectedColumnId ? { ...h, width: `${e.target.value}px` } : h
                                    )
                                  }));
                                }
                              }}
                              className="w-24 accent-emerald-600 disabled:opacity-40"
                            />
                            <span className="font-mono text-slate-600 font-bold w-12 text-right">
                              {selectedColumnId 
                                ? editingTemplate.headers.find((h: any) => h.id === selectedColumnId)?.width 
                                : 'Auto'}
                            </span>
                          </div>
                        </div>

                        {/* Row Heights Selection */}
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-400 block font-mono font-bold uppercase">Row Height (Selected)</span>
                          <div className="flex items-center gap-2 font-sans">
                            <input
                              type="number"
                              min="20"
                              max="120"
                              disabled={selectedRowIndex === null && selectedSectionIndex === null}
                              value={
                                selectedSectionIndex !== null
                                  ? 44
                                  : selectedRowIndex !== null
                                    ? (editingTemplate.rowHeights?.[String(selectedRowIndex)] || 32)
                                    : 32
                              }
                              onChange={(e) => {
                                const newHeight = parseInt(e.target.value) || 32;
                                if (selectedRowIndex !== null) {
                                  handleUpdateRowHeight(selectedRowIndex, newHeight);
                                }
                              }}
                              className="w-16 p-1 border border-slate-300 rounded text-center disabled:opacity-50 font-mono"
                            />
                            <span className="text-slate-400 font-sans">px</span>
                          </div>
                        </div>

                        {/* Assessment Column Config Card */}
                        {selectedColumnId && !isMetadataColumn(editingTemplate.headers.find((h: any) => h.id === selectedColumnId)) && (
                          <div className="flex items-center gap-4 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 shadow-sm animate-fade-in">
                            <div className="space-y-1">
                              <span className="text-[10px] text-emerald-800 block font-mono font-black uppercase tracking-wider">Assessment Name</span>
                              <input
                                type="text"
                                className="p-1.5 border border-emerald-200 rounded-lg bg-white text-slate-800 font-bold font-sans w-32 focus:ring-2 focus:ring-emerald-500 text-xs"
                                value={getHeaderBaseName(editingTemplate.headers.find((h: any) => h.id === selectedColumnId))}
                                onChange={(e) => handleUpdateHeaderAssessment(selectedColumnId, { baseName: e.target.value })}
                              />
                            </div>

                            {(() => {
                              const selCol = editingTemplate.headers.find((h: any) => h.id === selectedColumnId);
                              if (!selCol || isMetadataColumn(selCol)) return null;
                              const isCalc = Boolean(selCol.formula);
                              const maxVal = selCol.maxMarks !== undefined && selCol.maxMarks !== null ? selCol.maxMarks : '';
                              return (
                                <div className="space-y-1">
                                  <span className="text-[10px] text-emerald-800 block font-mono font-black uppercase tracking-wider">
                                    {isCalc ? 'Max Marks (Required)' : 'Max Marks (Optional)'}
                                  </span>
                                  <input
                                    type="number"
                                    min="1"
                                    max="200"
                                    placeholder={isCalc ? 'Req' : 'Opt'}
                                    className="p-1.5 border border-emerald-200 rounded-lg bg-white text-slate-800 font-bold font-sans w-24 text-center focus:ring-2 focus:ring-emerald-500 text-xs"
                                    value={maxVal}
                                    onChange={(e) => {
                                      const raw = e.target.value;
                                      const parsed = raw === '' ? undefined : parseInt(raw, 10);
                                      handleUpdateHeaderAssessment(selectedColumnId, { maxMarks: isNaN(parsed as any) ? undefined : parsed });
                                    }}
                                  />
                                </div>
                              );
                            })()}

                            <div className="space-y-1">
                              <span className="text-[10px] text-emerald-800 block font-mono font-black uppercase tracking-wider">Assessment Type</span>
                              <select
                                className="p-1.5 border border-emerald-200 rounded-lg bg-white text-slate-800 font-bold font-sans focus:ring-2 focus:ring-emerald-500 text-xs"
                                value={
                                  editingTemplate.headers.find((h: any) => h.id === selectedColumnId)?.assessmentType || 
                                  (isFormativeHeader(editingTemplate.headers.find((h: any) => h.id === selectedColumnId)) ? 'Formative' : 'Summative')
                                }
                                onChange={(e) => handleUpdateHeaderAssessment(selectedColumnId, { assessmentType: e.target.value })}
                              >
                                <option value="Formative">Formative</option>
                                <option value="Summative">Summative</option>
                                <option value="Internal">Internal</option>
                                <option value="Practical">Practical</option>
                                <option value="Oral">Oral</option>
                                <option value="Custom">Custom</option>
                                <option value="None">None (Metadata/Excluded)</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tab 2: LAYOUT (Columns & Section Headers) */}
                    {activeRibbonTab === 'layout' && (
                      <div className="flex flex-wrap items-center gap-6">
                        {/* Insert Column controls */}
                        <div className="space-y-1.5 font-sans">
                          <span className="text-[10px] text-slate-400 block font-mono font-bold uppercase">Insert New Column</span>
                          <div className="flex gap-1.5">
                            <button
                              disabled={!selectedColumnId}
                              onClick={() => {
                                if (!selectedColumnId) return;
                                const selIdx = editingTemplate.headers.findIndex((h: any) => h.id === selectedColumnId);
                                const selectedCol = editingTemplate.headers[selIdx];
                                const isLangTmpl = editingTemplate.id === 'tmpl_class_1_8_language';
                                setInsertColConfig({
                                  colType: 'assessment',
                                  identityType: 'roll',
                                  customHeaderName: '',
                                  assessmentHeaderName: 'New Assessment',
                                  maxMarks: 10,
                                  assessmentType: (selectedCol && selectedCol.assessmentType) || 'Formative',
                                  insertPosition: 'left',
                                  mergeEachStudentBlock: isLangTmpl
                                });
                                setShowInsertColModal(true);
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded border border-emerald-750 shadow-sm disabled:opacity-40 cursor-pointer flex items-center gap-1"
                            >
                              Insert Column... ➕
                            </button>
                          </div>
                        </div>

                        {/* Column Operations */}
                        <div className="space-y-1.5 font-sans">
                          <span className="text-[10px] text-slate-400 block font-mono font-bold uppercase">Column Actions</span>
                          <div className="flex gap-1.5">
                            <button type="button"
                              disabled={!selectedColumnId || editingTemplate.headers.length <= 3}
                              onClick={() => {
                                if (!selectedColumnId) return;
                                setConfirmModal({
                                  isOpen: true,
                                  title: "Delete Column",
                                  message: "Are you sure you want to delete the selected column? This master template structure update will apply globally.",
                                  onConfirm: () => {
                                    // Filter out deleted column
                                    const baseHeaders = editingTemplate.headers.filter((h: any) => h.id !== selectedColumnId);
                                    
                                    // Cleanup remaining formulas referencing the deleted column
                                    const updatedHeaders = baseHeaders.map((h: any) => {
                                      if (h.formula) {
                                        if (h.formula.startsWith('SUM(')) {
                                          const match = h.formula.match(/SUM\((.*)\)/i);
                                          if (match) {
                                            const colIds = match[1].split(',').map((s: string) => s.trim()).filter((id: string) => id !== selectedColumnId);
                                            return {
                                              ...h,
                                              formula: colIds.length > 0 ? `SUM(${colIds.join(',')})` : ''
                                            };
                                          }
                                        } else if (h.formula.startsWith('GRADE(')) {
                                          const match = h.formula.match(/GRADE\((.*)\)/i);
                                          if (match && match[1].trim() === selectedColumnId) {
                                            return {
                                              ...h,
                                              formula: ''
                                            };
                                          }
                                        }
                                      }
                                      return h;
                                    });

                                    // Automatically adjust print area bounds
                                    const lastColLetter = String.fromCharCode(64 + updatedHeaders.length);
                                    const pageSetup = {
                                      ...(editingTemplate.pageSetup || {}),
                                      printArea: `A:${lastColLetter}`
                                    };

                                    saveAndSyncEditingTemplate({
                                      ...editingTemplate,
                                      headers: updatedHeaders,
                                      pageSetup
                                    });
                                    setSelectedColumnId(null);
                                    setSelectedCell(null);
                                  }
                                });
                              }}
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold rounded disabled:opacity-40"
                            >
                              Delete Column 🗑
                            </button>
                            <button
                              disabled={!selectedColumnId}
                              onClick={() => {
                                if (!selectedColumnId) return;
                                const idx = editingTemplate.headers.findIndex((h: any) => h.id === selectedColumnId);
                                if (idx > 0) {
                                  const updatedHeaders = [...editingTemplate.headers];
                                  const temp = updatedHeaders[idx];
                                  updatedHeaders[idx] = updatedHeaders[idx - 1];
                                  updatedHeaders[idx - 1] = temp;
                                  saveAndSyncEditingTemplate({ ...editingTemplate, headers: updatedHeaders });
                                }
                              }}
                              className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-extrabold rounded disabled:opacity-40"
                              title="Move Left"
                            >
                              Move ⬅
                            </button>
                            <button
                              disabled={!selectedColumnId}
                              onClick={() => {
                                if (!selectedColumnId) return;
                                const idx = editingTemplate.headers.findIndex((h: any) => h.id === selectedColumnId);
                                if (idx < editingTemplate.headers.length - 1) {
                                  const updatedHeaders = [...editingTemplate.headers];
                                  const temp = updatedHeaders[idx];
                                  updatedHeaders[idx] = updatedHeaders[idx + 1];
                                  updatedHeaders[idx + 1] = temp;
                                  saveAndSyncEditingTemplate({ ...editingTemplate, headers: updatedHeaders });
                                }
                              }}
                              className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-extrabold rounded disabled:opacity-40"
                              title="Move Right"
                            >
                              Move ➡
                            </button>

                            <button
                              disabled={!selectedColumnId}
                              onClick={() => {
                                if (!selectedColumnId) return;
                                const updatedHeaders = (editingTemplate?.headers || []).map((h: any) => {
                                  if (h.id === selectedColumnId) {
                                    return {
                                      ...h,
                                      mergeEachStudentBlock: !h.mergeEachStudentBlock
                                    };
                                  }
                                  return h;
                                });
                                saveAndSyncEditingTemplate({ ...editingTemplate, headers: updatedHeaders });
                              }}
                              className={`px-2.5 py-1.5 font-extrabold rounded border transition-all disabled:opacity-40 ${
                                editingTemplate.headers.find((h: any) => h.id === selectedColumnId)?.mergeEachStudentBlock
                                  ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                              }`}
                              title="Toggle merging across rows per student"
                            >
                              Merge Each Student Block 🔗
                            </button>
                          </div>
                        </div>

                        {/* Row Operations */}
                        <div className="space-y-1.5 font-sans">
                          <span className="text-[10px] text-slate-400 block font-mono font-bold uppercase">Row Actions</span>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              disabled={selectedRowIndex === null}
                              onClick={() => {
                                if (selectedRowIndex === null) return;
                                const pos = selectedRowIndex;
                                const nextRowHeights: Record<string, number> = {};
                                Object.entries(editingTemplate.rowHeights || {}).forEach(([k, v]) => {
                                  const rowNum = parseInt(k);
                                  if (rowNum >= pos) {
                                    nextRowHeights[String(rowNum + 1)] = v as number;
                                  } else {
                                    nextRowHeights[k] = v as number;
                                  }
                                });
                                nextRowHeights[String(pos)] = 32;
                                saveAndSyncEditingTemplate({
                                  ...editingTemplate,
                                  rows: editingTemplate.rows + 1,
                                  rowHeights: nextRowHeights
                                });
                                setSelectedRowIndex(pos + 1);
                              }}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-extrabold rounded disabled:opacity-40"
                              title="Insert Row Above"
                            >
                              Insert Above ⬆
                            </button>
                            <button
                              disabled={selectedRowIndex === null}
                              onClick={() => {
                                if (selectedRowIndex === null) return;
                                const pos = selectedRowIndex + 1;
                                const nextRowHeights: Record<string, number> = {};
                                Object.entries(editingTemplate.rowHeights || {}).forEach(([k, v]) => {
                                  const rowNum = parseInt(k);
                                  if (rowNum >= pos) {
                                    nextRowHeights[String(rowNum + 1)] = v as number;
                                  } else {
                                    nextRowHeights[k] = v as number;
                                  }
                                });
                                nextRowHeights[String(pos)] = 32;
                                saveAndSyncEditingTemplate({
                                  ...editingTemplate,
                                  rows: editingTemplate.rows + 1,
                                  rowHeights: nextRowHeights
                                });
                                setSelectedRowIndex(pos);
                              }}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-extrabold rounded disabled:opacity-40"
                              title="Insert Row Below"
                            >
                              Insert Below ⬇
                            </button>
                            <button type="button"
                              disabled={selectedRowIndex === null || editingTemplate.rows <= 1}
                              onClick={() => {
                                if (selectedRowIndex === null) return;
                                setConfirmModal({
                                  isOpen: true,
                                  title: "Delete Row",
                                  message: "Are you sure you want to delete the selected row?",
                                  onConfirm: () => {
                                    const pos = selectedRowIndex;
                                    const nextRowHeights: Record<string, number> = {};
                                    Object.entries(editingTemplate.rowHeights || {}).forEach(([k, v]) => {
                                      const rowNum = parseInt(k);
                                      if (rowNum > pos) {
                                        nextRowHeights[String(rowNum - 1)] = v as number;
                                      } else if (rowNum < pos) {
                                        nextRowHeights[k] = v as number;
                                      }
                                    });
                                    saveAndSyncEditingTemplate({
                                      ...editingTemplate,
                                      rows: Math.max(1, editingTemplate.rows - 1),
                                      rowHeights: nextRowHeights
                                    });
                                    setSelectedRowIndex(null);
                                  }
                                });
                              }}
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold rounded disabled:opacity-40"
                              title="Delete Row"
                            >
                              Delete Row 🗑
                            </button>
                            <button
                              disabled={selectedRowIndex === null}
                              onClick={() => {
                                if (selectedRowIndex === null) return;
                                const pos = selectedRowIndex;
                                const currentHeight = editingTemplate.rowHeights?.[String(pos)] || 32;
                                const nextRowHeights: Record<string, number> = {};
                                Object.entries(editingTemplate.rowHeights || {}).forEach(([k, v]) => {
                                  const rowNum = parseInt(k);
                                  if (rowNum > pos) {
                                    nextRowHeights[String(rowNum + 1)] = v as number;
                                  } else {
                                    nextRowHeights[k] = v as number;
                                  }
                                });
                                nextRowHeights[String(pos + 1)] = currentHeight;
                                saveAndSyncEditingTemplate({
                                  ...editingTemplate,
                                  rows: editingTemplate.rows + 1,
                                  rowHeights: nextRowHeights
                                });
                                setSelectedRowIndex(pos + 1);
                              }}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-extrabold rounded disabled:opacity-40"
                              title="Duplicate Row"
                            >
                              Duplicate 👥
                            </button>
                            <button
                              disabled={selectedRowIndex === null || selectedRowIndex <= 5}
                              onClick={() => {
                                if (selectedRowIndex === null || selectedRowIndex <= 5) return;
                                const pos = selectedRowIndex;
                                const nextRowHeights = { ...(editingTemplate.rowHeights || {}) };
                                const hCurrent = nextRowHeights[String(pos)] || 32;
                                const hAbove = nextRowHeights[String(pos - 1)] || 32;
                                nextRowHeights[String(pos)] = hAbove;
                                nextRowHeights[String(pos - 1)] = hCurrent;
                                saveAndSyncEditingTemplate({
                                  ...editingTemplate,
                                  rowHeights: nextRowHeights
                                });
                                setSelectedRowIndex(pos - 1);
                              }}
                              className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-extrabold rounded disabled:opacity-40"
                              title="Move Row Up"
                            >
                              Move ⬆
                            </button>
                            <button
                              disabled={selectedRowIndex === null || selectedRowIndex >= editingTemplate.rows + 4}
                              onClick={() => {
                                if (selectedRowIndex === null || selectedRowIndex >= editingTemplate.rows + 4) return;
                                const pos = selectedRowIndex;
                                const nextRowHeights = { ...(editingTemplate.rowHeights || {}) };
                                const hCurrent = nextRowHeights[String(pos)] || 32;
                                const hBelow = nextRowHeights[String(pos + 1)] || 32;
                                nextRowHeights[String(pos)] = hBelow;
                                nextRowHeights[String(pos + 1)] = hCurrent;
                                saveAndSyncEditingTemplate({
                                  ...editingTemplate,
                                  rowHeights: nextRowHeights
                                });
                                setSelectedRowIndex(pos + 1);
                              }}
                              className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-extrabold rounded disabled:opacity-40"
                              title="Move Row Down"
                            >
                              Move ⬇
                            </button>
                          </div>
                        </div>

                        {/* Title Section Actions */}
                        <div className="space-y-1.5 font-sans">
                          <span className="text-[10px] text-slate-400 block font-mono font-bold uppercase">Merged Header Rows</span>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => {
                                const newSection = {
                                  text: 'NEW HEADER BANNER SECTION TEXT',
                                  className: 'font-sans font-black text-center text-slate-800 text-lg tracking-wider bg-slate-100 py-3 border-b border-slate-200'
                                };
                                setEditingTemplate((prev: any) => ({
                                  ...prev,
                                  sections: [...prev.sections, newSection]
                                }));
                              }}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-extrabold rounded"
                            >
                              + Add Banner Row
                            </button>
                            <button type="button"
                              disabled={selectedSectionIndex === null || editingTemplate.sections.length <= 1}
                              onClick={() => {
                                if (selectedSectionIndex === null) return;
                                const updatedSections = editingTemplate.sections.filter((_: any, idx: number) => idx !== selectedSectionIndex);
                                setEditingTemplate((prev: any) => ({ ...prev, sections: updatedSections }));
                                setSelectedSectionIndex(null);
                              }}
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold rounded disabled:opacity-40"
                            >
                              Delete Banner Row 🗑
                            </button>
                          </div>
                        </div>

                        {/* Assessment Column Config Card */}
                        {selectedColumnId && !isMetadataColumn(editingTemplate.headers.find((h: any) => h.id === selectedColumnId)) && (
                          <div className="flex items-center gap-4 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 shadow-sm animate-fade-in">
                            <div className="space-y-1">
                              <span className="text-[10px] text-emerald-800 block font-mono font-black uppercase tracking-wider">Assessment Name</span>
                              <input
                                type="text"
                                className="p-1.5 border border-emerald-200 rounded-lg bg-white text-slate-800 font-bold font-sans w-32 focus:ring-2 focus:ring-emerald-500 text-xs"
                                value={getHeaderBaseName(editingTemplate.headers.find((h: any) => h.id === selectedColumnId))}
                                onChange={(e) => handleUpdateHeaderAssessment(selectedColumnId, { baseName: e.target.value })}
                              />
                            </div>

                            {(() => {
                              const selCol = editingTemplate.headers.find((h: any) => h.id === selectedColumnId);
                              if (!selCol || isMetadataColumn(selCol)) return null;
                              const isCalc = Boolean(selCol.formula);
                              const maxVal = selCol.maxMarks !== undefined && selCol.maxMarks !== null ? selCol.maxMarks : '';
                              return (
                                <div className="space-y-1">
                                  <span className="text-[10px] text-emerald-800 block font-mono font-black uppercase tracking-wider">
                                    {isCalc ? 'Max Marks (Required)' : 'Max Marks (Optional)'}
                                  </span>
                                  <input
                                    type="number"
                                    min="1"
                                    max="200"
                                    placeholder={isCalc ? 'Req' : 'Opt'}
                                    className="p-1.5 border border-emerald-200 rounded-lg bg-white text-slate-800 font-bold font-sans w-24 text-center focus:ring-2 focus:ring-emerald-500 text-xs"
                                    value={maxVal}
                                    onChange={(e) => {
                                      const raw = e.target.value;
                                      const parsed = raw === '' ? undefined : parseInt(raw, 10);
                                      handleUpdateHeaderAssessment(selectedColumnId, { maxMarks: isNaN(parsed as any) ? undefined : parsed });
                                    }}
                                  />
                                </div>
                              );
                            })()}

                            <div className="space-y-1">
                              <span className="text-[10px] text-emerald-800 block font-mono font-black uppercase tracking-wider">Assessment Type</span>
                              <select
                                className="p-1.5 border border-emerald-200 rounded-lg bg-white text-slate-800 font-bold font-sans focus:ring-2 focus:ring-emerald-500 text-xs"
                                value={
                                  editingTemplate.headers.find((h: any) => h.id === selectedColumnId)?.assessmentType || 
                                  (isFormativeHeader(editingTemplate.headers.find((h: any) => h.id === selectedColumnId)) ? 'Formative' : 'Summative')
                                }
                                onChange={(e) => handleUpdateHeaderAssessment(selectedColumnId, { assessmentType: e.target.value })}
                              >
                                <option value="Formative">Formative</option>
                                <option value="Summative">Summative</option>
                                <option value="Internal">Internal</option>
                                <option value="Practical">Practical</option>
                                <option value="Oral">Oral</option>
                                <option value="Custom">Custom</option>
                                <option value="None">None (Metadata/Excluded)</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tab 3: PAGE SETUP (Paper size, printing orientation, margins) */}
                    {activeRibbonTab === 'page' && (
                      <div className="flex flex-wrap items-center gap-6">
                        {/* Orientation Toggle */}
                        <div className="space-y-1 font-sans">
                          <span className="text-[10px] text-slate-400 block font-mono font-bold uppercase">Orientation</span>
                          <div className="flex border border-slate-300 rounded overflow-hidden">
                            <button
                              onClick={() => {
                                setEditingTemplate((prev: any) => ({
                                  ...prev,
                                  pageSetup: { ...(prev.pageSetup || {}), orientation: 'Portrait' }
                                }));
                              }}
                              className={`px-4 py-1.5 font-bold transition-all ${editingTemplate.pageSetup?.orientation === 'Portrait' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-200'}`}
                            >
                              Portrait
                            </button>
                            <button
                              onClick={() => {
                                setEditingTemplate((prev: any) => ({
                                  ...prev,
                                  pageSetup: { ...(prev.pageSetup || {}), orientation: 'Landscape' }
                                }));
                              }}
                              className={`px-4 py-1.5 font-bold transition-all ${editingTemplate.pageSetup?.orientation === 'Landscape' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-200'}`}
                            >
                              Landscape
                            </button>
                          </div>
                        </div>

                        {/* Paper Size */}
                        <div className="space-y-1 font-sans">
                          <span className="text-[10px] text-slate-400 block font-mono font-bold uppercase">Paper Size</span>
                          <select
                            value={editingTemplate.pageSetup?.pageSize || 'A4'}
                            onChange={(e) => {
                              setEditingTemplate((prev: any) => ({
                                ...prev,
                                pageSetup: { ...(prev.pageSetup || {}), pageSize: e.target.value }
                              }));
                            }}
                            className="p-1.5 border border-slate-300 rounded bg-white text-slate-800 font-medium font-sans"
                          >
                            <option value="A4">A4 Standard Standard</option>
                            <option value="Letter">Letter Format</option>
                            <option value="Legal">Legal size (Tall)</option>
                          </select>
                        </div>

                        {/* Margins */}
                        <div className="space-y-1 font-sans">
                          <span className="text-[10px] text-slate-400 block font-mono font-bold uppercase">Margins</span>
                          <select
                            value={editingTemplate.pageSetup?.margins || 'Normal'}
                            onChange={(e) => {
                              setEditingTemplate((prev: any) => ({
                                ...prev,
                                pageSetup: { ...(prev.pageSetup || {}), margins: e.target.value }
                              }));
                            }}
                            className="p-1.5 border border-slate-300 rounded bg-white text-slate-800 font-medium font-sans"
                          >
                            <option value="Normal">Normal Margins (15px)</option>
                            <option value="Narrow">Narrow Margins (8px)</option>
                            <option value="Wide">Wide Margins (24px)</option>
                          </select>
                        </div>

                        {/* Print Area */}
                        <div className="space-y-1 font-sans">
                          <span className="text-[10px] text-slate-400 block font-mono font-bold uppercase">Print Area Boundaries</span>
                          <input
                            type="text"
                            placeholder="A:J"
                            value={editingTemplate.pageSetup?.printArea || ''}
                            onChange={(e) => {
                              setEditingTemplate((prev: any) => ({
                                ...prev,
                                pageSetup: { ...(prev.pageSetup || {}), printArea: e.target.value }
                              }));
                            }}
                            className="p-1.5 border border-slate-300 rounded bg-white font-mono text-slate-800 w-24 text-center font-bold"
                          />
                        </div>
                      </div>
                    )}

                    {/* Tab 4: FORMULAS (Math calculations) */}
                    {activeRibbonTab === 'formulas' && (
                      <div className="w-full space-y-1.5 font-sans">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 block font-mono font-bold uppercase">Column Formula Editor</span>
                          <span className="text-[9px] text-indigo-600 bg-indigo-50 font-bold px-1.5 rounded">Selected Column: {selectedColumnId ? editingTemplate.headers.find((h: any) => h.id === selectedColumnId)?.text : 'None'}</span>
                        </div>
                        
                        <div className="flex gap-2">
                          <input
                            type="text"
                            disabled={!selectedColumnId}
                            placeholder="e.g. SUM(h4, h5, h6, h7) or GRADE(h8)"
                            value={
                              selectedColumnId 
                                ? (editingTemplate.headers.find((h: any) => h.id === selectedColumnId)?.formula || '')
                                : ''
                            }
                            onChange={(e) => {
                              if (selectedColumnId) {
                                handleUpdateColFormula(selectedColumnId, e.target.value);
                              }
                            }}
                            className="p-2 border border-slate-300 rounded-lg bg-white text-slate-800 disabled:bg-slate-50 font-mono text-xs w-full max-w-md"
                          />
                          <div className="flex gap-1">
                            <button
                              disabled={!selectedColumnId}
                              onClick={() => {
                                if (selectedColumnId) {
                                  handleUpdateColFormula(selectedColumnId, 'SUM(h4,h5,h6,h7)');
                                }
                              }}
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded font-bold text-xs font-sans"
                            >
                              SUM
                            </button>
                            <button
                              disabled={!selectedColumnId}
                              onClick={() => {
                                if (selectedColumnId) {
                                  handleUpdateColFormula(selectedColumnId, 'GRADE(h8)');
                                }
                              }}
                              className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded font-bold text-xs font-sans"
                            >
                              GRADE
                            </button>
                            <button
                              disabled={!selectedColumnId}
                              onClick={() => {
                                if (selectedColumnId) {
                                  handleUpdateColFormula(selectedColumnId, '');
                                }
                              }}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 border border-slate-200 rounded font-medium text-xs font-sans"
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tab 5: BACKUPS (Restore previous template) */}
                    {activeRibbonTab === 'backups' && (
                      <div className="w-full space-y-2 font-sans">
                        <span className="text-[10px] text-slate-400 block font-mono font-bold uppercase">Select Previous Version to Restore</span>
                        
                        {!(backups[selectedTemplate.id] || []).length ? (
                          <div className="p-2 text-slate-400 italic font-sans text-xs bg-slate-50 rounded-lg">
                            No backup history available for this template. Backups are automatically created whenever you save master changes.
                          </div>
                        ) : (
                          <div className="max-h-[140px] overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white shadow-inner">
                            {(backups[selectedTemplate.id] || []).map((backup, bIdx) => (
                              <div key={bIdx} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50 transition-all">
                                <div className="space-y-0.5">
                                  <span className="font-extrabold text-slate-700 flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                    Version { (backups[selectedTemplate.id] || []).length - bIdx }
                                  </span>
                                  <p className="text-[10px] text-slate-500 font-mono">
                                    Saved on: {backup.timestamp} | By clerk: {backup.editorName}
                                  </p>
                                </div>
                                <button
                                  onClick={() => {
                                    const verNum = (backups[selectedTemplate.id] || []).length - bIdx;
                                    setConfirmModal({
                                      isOpen: true,
                                      title: `Restore Version ${verNum}`,
                                      message: `Are you sure you want to load Version ${verNum} into the editing workspace? Unsaved changes in your current draft will be overwritten.`,
                                      onConfirm: () => {
                                        setEditingTemplate(JSON.parse(JSON.stringify(backup.templateState)));
                                        setUploadSuccess(true);
                                        setSelectedColumnId(null);
                                        setSelectedSectionIndex(null);
                                        setSelectedCell(null);
                                      }
                                    });
                                  }}
                                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold border border-indigo-200 rounded-lg transition-all cursor-pointer font-sans"
                                >
                                  Revert & Load
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                </div>

                {/* FORMULA BAR (Just like Microsoft Excel) */}
                <div className="bg-slate-100 border border-slate-200 rounded-lg flex items-center print:hidden px-3 py-1.5 text-xs font-mono">
                  <span className="text-emerald-700 font-black tracking-tight select-none mr-2">fx</span>
                  <div className="w-px h-4 bg-slate-300 mx-2"></div>
                  
                  {/* Current Active Selection visual address */}
                  <span className="text-slate-500 font-black mr-3 bg-slate-200 px-1.5 py-0.5 rounded select-none min-w-[36px] text-center">
                    {selectedSectionIndex !== null 
                      ? `Row ${selectedSectionIndex + 1}`
                      : selectedCell
                        ? `${String.fromCharCode(65 + editingTemplate.headers.findIndex((h: any) => h.id === selectedCell.colId))}${selectedCell.row}`
                        : selectedColumnId
                          ? `${String.fromCharCode(65 + editingTemplate.headers.findIndex((h: any) => h.id === selectedColumnId))}${selectedRowIndex !== null ? selectedRowIndex : '4'}`
                          : 'Cell'}
                  </span>

                  {/* Editable Formula Input */}
                  <input
                    type="text"
                    disabled={!selectedColumnId && selectedSectionIndex === null && !selectedCell}
                    className="bg-transparent text-slate-800 focus:outline-none w-full placeholder:text-slate-400 placeholder:italic font-medium"
                    placeholder={
                      selectedSectionIndex !== null
                        ? "Edit Title Section Text..."
                        : selectedColumnId || selectedCell
                          ? "Type cell value, header text, or formula (starts with =)..."
                          : "Click on any header or cell below to edit it directly..."
                    }
                    value={
                      selectedSectionIndex !== null
                        ? (editingTemplate.sections[selectedSectionIndex]?.text || '')
                        : selectedCell
                          ? (() => {
                              const cellHeader = editingTemplate.headers.find((h: any) => h.id === selectedCell.colId);
                              if (!cellHeader) return '';
                              
                              if (editingTemplate.id === 'tmpl_class_1_8_language') {
                                const row = selectedCell.row;
                                const colIndex = editingTemplate.headers.findIndex((h: any) => h.id === selectedCell.colId);
                                const colLetter = String.fromCharCode(65 + colIndex);

                                const sIdx = Math.floor((row - 5) / 3);
                                const rNum = (row - 5) % 3; // 0 = Hindi, 1 = Marathi, 2 = Total
                                
                                const hindiRowNum = 5 + sIdx * 3;
                                const marathiRowNum = 5 + sIdx * 3 + 1;
                                const totalRowNum = 5 + sIdx * 3 + 2;

                                if (cellHeader.formula) {
                                  if (selectedCell.colId === 'h9') {
                                    if (rNum === 2) {
                                      return `=J${hindiRowNum} + J${marathiRowNum}`;
                                    } else {
                                      return `=SUM(E${row}:I${row})`;
                                    }
                                  }
                                  if (selectedCell.colId === 'h11') {
                                    if (rNum === 2) {
                                      return `=L${hindiRowNum} + L${marathiRowNum}`;
                                    } else {
                                      return `=SUM(K${row})`;
                                    }
                                  }
                                  if (selectedCell.colId === 'h12') {
                                    if (rNum === 2) {
                                      return `=M${hindiRowNum} + M${marathiRowNum}`;
                                    } else {
                                      return `=SUM(J${row}, L${row})`;
                                    }
                                  }
                                  if (selectedCell.colId === 'h13') {
                                    return `=GRADE(M${row})`;
                                  }
                                } else {
                                  if (rNum === 2 && !cellHeader.isIdentity && selectedCell.colId !== 'languageRow') {
                                    return `=${colLetter}${hindiRowNum} + ${colLetter}${marathiRowNum}`;
                                  }
                                }
                              }

                              if (cellHeader.formula) {
                                return `=${cellHeader.formula}`;
                              }
                              return cellHeader.text;
                            })()
                          : selectedColumnId
                            ? (editingTemplate.headers.find((h: any) => h.id === selectedColumnId)?.formula 
                                ? `=${editingTemplate.headers.find((h: any) => h.id === selectedColumnId).formula}`
                                : editingTemplate.headers.find((h: any) => h.id === selectedColumnId).text)
                            : ''
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (selectedSectionIndex !== null) {
                        handleUpdateSection(selectedSectionIndex, val);
                      } else if (selectedColumnId) {
                        if (val.startsWith('=')) {
                          handleUpdateColFormula(selectedColumnId, val.substring(1));
                        } else {
                          // Standard Text update
                          handleRenameHeader(selectedColumnId, val);
                        }
                      }
                    }}
                  />
                </div>

                {/* Grid controls / layout details */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left part: Quick Action Parameters */}
                  <div className="lg:col-span-1 space-y-4 print:hidden">
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4 text-xs">
                      <div className="space-y-1 border-b border-slate-200 pb-2">
                        <span className="font-extrabold text-slate-700 uppercase tracking-wider block">Template Attributes</span>
                        <p className="text-slate-500">Structural values enforcing uniform validation checks.</p>
                      </div>

                      <div className="space-y-3 font-sans">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Columns Assigned:</span>
                          <span className="font-mono font-bold text-slate-800">{editingTemplate.headers.length} columns</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Grid Depth:</span>
                          <span className="font-mono font-bold text-slate-800">{editingTemplate.rows} Rows</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Merge Cells defined:</span>
                          <span className="font-mono font-bold text-slate-800">Row 1-3 full span</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Page Layout:</span>
                          <span className="font-mono font-bold text-slate-800">{editingTemplate.pageSetup?.orientation} ({editingTemplate.pageSetup?.pageSize})</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Print Area boundaries:</span>
                          <span className="font-mono font-bold text-emerald-700 font-extrabold bg-emerald-50 px-1.5 py-0.5 rounded">Columns {editingTemplate.pageSetup?.printArea || 'All'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Replace Template drag and drop zone */}
                    <div className="p-5 rounded-xl border-2 border-dashed border-slate-300 hover:border-emerald-500 transition-all bg-white flex flex-col items-center text-center space-y-3 cursor-pointer relative overflow-hidden group">
                      
                      <input 
                        type="file" 
                        accept=".xls,.xlsx,.csv" 
                        onChange={(e) => handleReplaceTemplate(e, selectedTemplate.id)}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                      />
                      
                      {uploadingTemplateId === selectedTemplate.id ? (
                        <div className="space-y-2 py-4">
                          <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
                          <p className="text-xs font-bold text-slate-600">Uploading new Excel structure...</p>
                        </div>
                      ) : (
                        <div className="space-y-2 py-2">
                          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-all">
                            <Upload className="w-5 h-5" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-black text-slate-700">
                              {isUrdu ? "نیا ٹیمپلیٹ تبدیل کریں" : "Replace Structure"}
                            </p>
                            <p className="text-[10px] text-slate-400 max-w-[200px] leading-relaxed mx-auto font-sans">
                              Drag and drop official Excel (.xlsx) file, or click to browse local storage.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Replace Template feedback */}
                    {uploadSuccess && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-sans flex items-start gap-2 animate-bounce">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <span className="font-black">Template Updated Successfully!</span>
                          <p className="text-[10px] text-emerald-700/90 leading-relaxed">
                            Draft configuration updated. Make sure to click "Save Master Template" to apply changes permanently.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right part: Excel-Style Sheet Container */}
                  <div className="lg:col-span-2 space-y-4 print:col-span-3">
                    
                    {/* Master template visual indicator */}
                    <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-center justify-between text-xs font-sans print:hidden">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="text-indigo-800 font-extrabold">Master Structure Visual Board (Draft Editor Mode)</span>
                      </div>
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 font-mono font-bold px-2 py-0.5 rounded uppercase">
                        Interactive Grid Selection
                      </span>
                    </div>

                    {/* The spreadsheet viewport wrapper */}
                    <div className="border border-slate-300 rounded-lg overflow-hidden bg-white shadow-sm max-h-[500px] overflow-y-auto overflow-x-auto relative print:border-transparent print:max-h-none print:overflow-visible">
                      
                      <table className="w-full border-collapse font-sans text-xs select-none">
                        {/* Excel Columns Header (A, B, C...) */}
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-300 print:hidden">
                            {/* Column row index header */}
                            <th className="w-10 bg-slate-200 text-slate-500 font-mono text-[10px] text-center border-r border-slate-300 py-1.5 shrink-0 select-none">
                              
                            </th>
                            {(editingTemplate?.headers || []).map((h: any, idx: number) => {
                              const letter = String.fromCharCode(65 + idx);
                              const isColSelected = selectedColumnId === h.id;
                              return (
                                <th 
                                  key={h.id} 
                                  style={{ minWidth: h.width }}
                                  onClick={() => {
                                    setSelectedColumnId(h.id);
                                    setSelectedSectionIndex(null);
                                    setSelectedRowIndex(null);
                                    setSelectedCell(null);
                                  }}
                                  className={`font-mono text-[10px] text-center font-bold border-r border-slate-300 py-1 select-none cursor-pointer transition-all ${isColSelected ? 'bg-emerald-200 text-emerald-800 border-b border-b-emerald-400 font-black' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                >
                                  {letter}
                                </th>
                              );
                            })}
                          </tr>
                        </thead>

                        <tbody>
                          {/* Title Rows (merged cells representation) */}
                          {(editingTemplate?.sections || []).map((sect: any, rIdx: number) => {
                            const isSectSelected = selectedSectionIndex === rIdx;
                            return (
                              <tr 
                                key={rIdx} 
                                className="bg-white border-b border-slate-200"
                                onClick={() => {
                                  setSelectedSectionIndex(rIdx);
                                  setSelectedColumnId(null);
                                  setSelectedRowIndex(null);
                                  setSelectedCell(null);
                                }}
                              >
                                <td className="bg-slate-100 text-slate-500 font-mono text-[9px] text-center border-r border-slate-300 font-bold print:hidden select-none cursor-pointer hover:bg-slate-200">
                                  {rIdx + 1}
                                </td>
                                <td 
                                  colSpan={editingTemplate?.headers?.length || 1}
                                  className={`border-r border-slate-200 px-4 text-center cursor-pointer relative transition-all ${sect.className} ${isSectSelected ? 'ring-2 ring-emerald-500 bg-emerald-50/50' : 'hover:bg-slate-50/30'}`}
                                >
                                  {sect.text}
                                </td>
                              </tr>
                            );
                          })}

                          {/* Headers Row (Row 4 in spreadsheet) */}
                          <tr className="bg-slate-50 border-b-2 border-slate-400">
                            <td className="bg-slate-100 text-slate-500 font-mono text-[9px] text-center border-r border-slate-300 font-bold print:hidden select-none">
                              4
                            </td>
                            {(editingTemplate?.headers || []).map((h: any, cIdx: number) => {
                              const isColSelected = selectedColumnId === h.id;
                              return (
                                <td 
                                  key={h.id}
                                  style={{ minWidth: h.width }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedColumnId(h.id);
                                    setSelectedSectionIndex(null);
                                    setSelectedRowIndex(null);
                                    setSelectedCell(null);
                                  }}
                                  className={`border-r border-slate-300 px-2 py-3 text-slate-800 font-black text-center align-middle bg-slate-100/50 leading-tight cursor-pointer transition-all relative ${isColSelected ? 'ring-2 ring-emerald-500 bg-emerald-50' : 'hover:bg-slate-100'}`}
                                >
                                  {h.text}
                                  {h.formula && (
                                    <span className="absolute bottom-0.5 right-1 text-[8px] text-emerald-600 bg-emerald-50 font-mono font-bold rounded px-0.5">fx</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>

                          {/* Empty Spreadsheet Rows representing mock entries (with no student data/marks) */}
                          {editingTemplate.id === 'tmpl_class_1_8_language' ? (
                            // Special 3-row layout per student for Class 1–8 Hindi/Marathi Language Template

                            <LanguageMarkListRenderer
                                template={editingTemplate}
                                isMock={true}
                                evaluateFormulaFn={evaluateFormula}
                                selectedCell={selectedCell}
                                selectedColumnId={selectedColumnId}
                                selectedRowIndex={selectedRowIndex}
                                onCellClick={(row: any, colId: any) => {
                                  setSelectedCell({ row, colId });
                                  setSelectedColumnId(colId);
                                  setSelectedRowIndex(row);
                                  setSelectedSectionIndex(null);
                                }}
                                onRowClick={(row: any) => {
                                  setSelectedRowIndex(row);
                                  setSelectedColumnId(null);
                                  setSelectedSectionIndex(null);
                                  setSelectedCell(null);
                                }}
                            />
                          ) : (
                            // Standard 1-row layout (for regular and other templates)
                            Array.from({ length: editingTemplate?.rows || 0 }).map((_, rIdx) => {
                              const realRowNumber = rIdx + 5;
                              const isRowSelected = selectedRowIndex === realRowNumber;
                              const rHeight = editingTemplate.rowHeights?.[String(realRowNumber)] || 32;
                              return (
                                <tr 
                                  key={rIdx} 
                                  className={`hover:bg-slate-50/50 border-b border-slate-200 group/row ${isRowSelected ? 'bg-emerald-50/30' : ''}`}
                                  style={{ height: `${rHeight}px` }}
                                >
                                  <td 
                                    onClick={() => {
                                      setSelectedRowIndex(realRowNumber);
                                      setSelectedColumnId(null);
                                      setSelectedSectionIndex(null);
                                      setSelectedCell(null);
                                    }}
                                    className={`bg-slate-100 text-slate-400 font-mono text-[9px] text-center border-r border-slate-300 font-medium print:hidden select-none cursor-pointer hover:bg-slate-200 ${isRowSelected ? 'bg-emerald-200 text-emerald-800 font-bold' : ''}`}
                                  >
                                    {realRowNumber}
                                  </td>
                                  {(editingTemplate?.headers || []).map((h: any, cIdx: number) => {
                                    // Set template placeholders to illustrate structure
                                    let placeholderText = '';
                                    let cellBg = 'bg-white';
                                    
                                    if (h.id === 'h1') {
                                      placeholderText = String(rIdx + 1);
                                      cellBg = 'bg-slate-50 text-slate-400 font-mono font-medium text-center';
                                    } else if (h.id === 'h2') {
                                      placeholderText = `GR-${1700 + rIdx}`;
                                      cellBg = 'bg-slate-50 text-slate-300 font-mono text-center';
                                    } else if (h.id === 'h3') {
                                      placeholderText = '[ Master Record Placeholder ]';
                                      cellBg = 'text-slate-300 italic text-left pl-3';
                                    } else {
                                      placeholderText = h.formula ? `=${h.formula}` : '-';
                                      cellBg = h.formula ? 'text-emerald-600 text-center font-mono font-bold bg-emerald-50/20' : 'text-slate-300 text-center font-mono';
                                    }

                                    const isCellSelected = selectedCell?.row === realRowNumber && selectedCell?.colId === h.id;
                                    const isColSelected = selectedColumnId === h.id;

                                    return (
                                      <td 
                                        key={h.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedCell({ row: realRowNumber, colId: h.id });
                                          setSelectedColumnId(h.id);
                                          setSelectedRowIndex(realRowNumber);
                                          setSelectedSectionIndex(null);
                                        }}
                                        className={`border-r border-slate-200 px-2 text-xs truncate select-none cursor-pointer relative transition-all ${cellBg} ${isCellSelected ? 'ring-2 ring-emerald-500 font-bold' : isColSelected ? 'bg-slate-50/50' : ''}`}
                                        style={{ 
                                          textAlign: h.align === 'center' ? 'center' : h.align === 'left' ? 'left' : 'right',
                                          fontFamily: h.font === 'font-mono' ? 'monospace' : h.font === 'font-serif' ? 'Outfit, sans-serif' : 'inherit'
                                        }}
                                      >
                                        {placeholderText}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    <p className="text-[10px] text-slate-400 italic text-center print:hidden">
                      * Screen matches standard school physical records layout. Showing columns A through {String.fromCharCode(64 + editingTemplate.headers.length)}. Click on any cell, header letter, or row index to select and format it.
                    </p>
                  </div>

                </div>
              </div>

              {/* WARNING CONFIRMATION MODAL (Before saving changes to Master Template) */}
              {showSaveWarningModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in print:hidden">
                  <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-5 animate-scale-up text-left">
                    <div className="flex gap-4 items-start">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-6 h-6 text-amber-600" />
                      </div>
                      <div className="space-y-1.5">
                        <h4 className="text-base font-black text-slate-800 font-sans">
                          Save Changes to Master Template?
                        </h4>
                        <p className="text-xs text-slate-500 font-sans">
                          You are about to save changes directly to the <span className="font-extrabold text-slate-700">Official Master Mark List Template</span>.
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-amber-50/40 border border-amber-100 rounded-2xl space-y-3 text-xs text-amber-900 font-sans leading-relaxed font-sans">
                      <p className="font-black text-amber-800">Please review the implications of this action:</p>
                      <ul className="list-disc pl-5 space-y-2 text-amber-800/90 font-medium">
                        <li>This editing affects <span className="font-bold underline">only</span> the Master Template. Subject Teachers and Class Teachers will never edit the Master Template.</li>
                        <li>Subject Teachers and Class Teachers work on generated copies. All future generated Mark Lists will use this updated template.</li>
                        <li>An automatic, secure backup of your previous template will be created instantly and can be restored at any time via the <span className="font-bold">Backups & Recovery</span> tab.</li>
                      </ul>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => setShowSaveWarningModal(false)}
                        className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-black uppercase rounded-xl transition-all cursor-pointer font-sans"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveMasterTemplateChanges}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5 font-sans"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-100" />
                        Yes, Save & Backup
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* INSERT COLUMN MODAL */}
              {showInsertColModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in print:hidden">
                  <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-5 animate-scale-up text-left">
                    <div className="flex gap-4 items-start pb-2 border-b border-slate-100">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                        <PlusCircle className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div className="space-y-1.5">
                        <h4 className="text-base font-black text-slate-800 font-sans">
                          Insert New Column
                        </h4>
                        <p className="text-xs text-slate-500 font-sans">
                          Add a new column into the master visual board.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Column Type Select */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase font-mono">Column Type</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setInsertColConfig(prev => ({ ...prev, colType: 'identity' }))}
                            className={`p-3 rounded-xl border text-xs font-black transition-all cursor-pointer text-center ${
                              insertColConfig.colType === 'identity'
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 ring-2 ring-emerald-500/20'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                            }`}
                          >
                            👤 Identity Column
                          </button>
                          <button
                            type="button"
                            onClick={() => setInsertColConfig(prev => ({ ...prev, colType: 'assessment' }))}
                            className={`p-3 rounded-xl border text-xs font-black transition-all cursor-pointer text-center ${
                              insertColConfig.colType === 'assessment'
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 ring-2 ring-emerald-500/20'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                            }`}
                          >
                            📊 Assessment Column
                          </button>
                        </div>
                      </div>

                      {/* IDENTITY TYPE / CONFIGS */}
                      {insertColConfig.colType === 'identity' && (
                        <div className="space-y-3 p-4 bg-slate-50 border border-slate-150 rounded-2xl">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase font-mono">Identity Field Type</label>
                            <select
                              value={insertColConfig.identityType}
                              onChange={(e) => setInsertColConfig(prev => ({ 
                                ...prev, 
                                identityType: e.target.value as any,
                                customHeaderName: '' 
                              }))}
                              className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-xs font-bold text-slate-700 font-sans focus:ring-2 focus:ring-emerald-500"
                            >
                              <option value="roll">Roll No</option>
                              <option value="gr">G.R. No.</option>
                              <option value="name">Student Name</option>
                              <option value="subject_label">Language / Row Label (Hindi/Marathi/Total)</option>
                              <option value="custom">Custom Field</option>
                            </select>
                          </div>

                          {insertColConfig.identityType === 'custom' && (
                            <div className="space-y-1.5 animate-fade-in">
                              <label className="text-xs font-bold text-slate-600 uppercase font-mono">Header Name</label>
                              <input
                                type="text"
                                value={insertColConfig.customHeaderName}
                                onChange={(e) => setInsertColConfig(prev => ({ ...prev, customHeaderName: e.target.value }))}
                                placeholder="e.g., Remarks, Parent Sign"
                                className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-xs font-bold text-slate-800 font-sans focus:ring-2 focus:ring-emerald-500"
                              />
                            </div>
                          )}

                          {editingTemplate?.id === 'tmpl_class_1_8_language' && (
                            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                              <span className="text-xs font-bold text-slate-600 font-sans">Merge Each Student Block</span>
                              <button
                                type="button"
                                onClick={() => setInsertColConfig(prev => ({ ...prev, mergeEachStudentBlock: !prev.mergeEachStudentBlock }))}
                                className={`px-2.5 py-1 text-xs font-black rounded-lg border transition-all ${
                                  insertColConfig.mergeEachStudentBlock
                                    ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                {insertColConfig.mergeEachStudentBlock ? 'Merged (3 Rows) 🔗' : 'Individual Rows 📄'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ASSESSMENT CONFIGS */}
                      {insertColConfig.colType === 'assessment' && (
                        <div className="space-y-3 p-4 bg-slate-50 border border-slate-150 rounded-2xl">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase font-mono">Assessment Header Name</label>
                            <input
                              type="text"
                              value={insertColConfig.assessmentHeaderName}
                              onChange={(e) => setInsertColConfig(prev => ({ ...prev, assessmentHeaderName: e.target.value }))}
                              placeholder="e.g., Oral, Class Test"
                              className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-xs font-bold text-slate-800 font-sans focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
{editingTemplate?.id !== 'tmpl_class_1_8_language' && (                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-600 uppercase font-mono">Max Marks</label>
                              <input
                                type="number"
                                value={insertColConfig.maxMarks}
                                onChange={(e) => setInsertColConfig(prev => ({ ...prev, maxMarks: Math.max(1, parseInt(e.target.value, 10) || 0) }))}
                                className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-xs font-bold text-slate-800 font-sans focus:ring-2 focus:ring-emerald-500"
                              />
                            </div>)}

                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-600 uppercase font-mono">Assessment Type</label>
                              <select
                                value={insertColConfig.assessmentType}
                                onChange={(e) => setInsertColConfig(prev => ({ ...prev, assessmentType: e.target.value }))}
                                className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-xs font-bold text-slate-700 font-sans focus:ring-2 focus:ring-emerald-500"
                              >
                                <option value="Formative">Formative</option>
                                <option value="Summative">Summative</option>
                                <option value="Internal">Internal</option>
                                <option value="Practical">Practical</option>
                                <option value="Oral">Oral</option>
                                <option value="Custom">Custom</option>
                                <option value="None">None</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* INSERT POSITION */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase font-mono">Insert Position</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setInsertColConfig(prev => ({ ...prev, insertPosition: 'left' }))}
                            className={`p-2.5 rounded-xl border text-xs font-extrabold transition-all cursor-pointer text-center ${
                              insertColConfig.insertPosition === 'left'
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 ring-2 ring-emerald-500/10'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                            }`}
                          >
                            ⬅ Insert Before (Left)
                          </button>
                          <button
                            type="button"
                            onClick={() => setInsertColConfig(prev => ({ ...prev, insertPosition: 'right' }))}
                            className={`p-2.5 rounded-xl border text-xs font-extrabold transition-all cursor-pointer text-center ${
                              insertColConfig.insertPosition === 'right'
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 ring-2 ring-emerald-500/10'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                            }`}
                          >
                            ➡ Insert After (Right)
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                      <button
                        onClick={() => setShowInsertColModal(false)}
                        className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-black uppercase rounded-xl transition-all cursor-pointer font-sans"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          handleInsertColumnConfirmed();
                          setShowInsertColModal(false);
                        }}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5 font-sans"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-100" />
                        Insert Column
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Master Result Book — restored canonical Clerk workspace */}
          {clerkTab === 'masterResultBook' && (
            <MasterResultBookEditor user={user} language={lang} />
          )}

          {/* Master Progress Card Templates — Classes 1 to 8 */}
          {clerkTab === 'progressCardTemplates' && (
            <MasterProgressCardTemplateEditor user={user} language={lang} />
          )}

        </div>
      )}

      {/* ================= HEADMASTER DASHBOARD (PREMIUM FIVE-CARD MATRIX) ================= */}
      {isHeadmaster && (
        <div className="space-y-6 animate-fade-in" id="headmaster-result-print-view">
          
          {/* The Five-Card Clickable Grid: module overview only */}
          {(!activeFeatureId || activeFeatureId === 'result-overview') && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* Card 1: Completed */}
            <button
              onClick={() => setActiveHMCard(activeHMCard === 'completed' ? null : 'completed')}
              className={`border rounded-2xl p-5 text-left transition-all flex flex-col justify-between min-h-[140px] cursor-pointer focus:outline-none ${
                activeHMCard === 'completed'
                  ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400/20 shadow-md scale-[1.01]'
                  : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-sm hover:bg-emerald-50/10'
              }`}
            >
              <div className="flex justify-between items-start w-full">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-500 block">{t.headmaster.completed.title}</span>
                  <span className="text-2xl font-black text-emerald-600 block">{t.headmaster.completed.count}</span>
                </div>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${
                  activeHMCard === 'completed' ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                }`}>
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal font-sans mt-3">
                {t.headmaster.completed.desc}
              </p>
            </button>

            {/* Card 2: Draft */}
            <button
              onClick={() => setActiveHMCard(activeHMCard === 'draft' ? null : 'draft')}
              className={`border rounded-2xl p-5 text-left transition-all flex flex-col justify-between min-h-[140px] cursor-pointer focus:outline-none ${
                activeHMCard === 'draft'
                  ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/20 shadow-md scale-[1.01]'
                  : 'bg-white border-slate-200 hover:border-amber-300 hover:shadow-sm hover:bg-amber-50/10'
              }`}
            >
              <div className="flex justify-between items-start w-full">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-500 block">{t.headmaster.draft.title}</span>
                  <span className="text-2xl font-black text-amber-500 block">{t.headmaster.draft.count}</span>
                </div>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${
                  activeHMCard === 'draft' ? 'bg-amber-500 border-amber-600 text-white' : 'bg-amber-50 border-amber-100 text-amber-600'
                }`}>
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal font-sans mt-3">
                {t.headmaster.draft.desc}
              </p>
            </button>

            {/* Card 3: Pending */}
            <button
              onClick={() => setActiveHMCard(activeHMCard === 'pending' ? null : 'pending')}
              className={`border rounded-2xl p-5 text-left transition-all flex flex-col justify-between min-h-[140px] cursor-pointer focus:outline-none ${
                activeHMCard === 'pending'
                  ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-400/20 shadow-md scale-[1.01]'
                  : 'bg-white border-slate-200 hover:border-rose-300 hover:shadow-sm hover:bg-rose-50/10'
              }`}
            >
              <div className="flex justify-between items-start w-full">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-500 block">{t.headmaster.pending.title}</span>
                  <span className="text-2xl font-black text-rose-600 block">{t.headmaster.pending.count}</span>
                </div>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${
                  activeHMCard === 'pending' ? 'bg-rose-500 border-rose-600 text-white' : 'bg-rose-50 border-rose-100 text-rose-600'
                }`}>
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal font-sans mt-3">
                {t.headmaster.pending.desc}
              </p>
            </button>

            {/* Card 4: Returned */}
            <button
              onClick={() => setActiveHMCard(activeHMCard === 'returned' ? null : 'returned')}
              className={`border rounded-2xl p-5 text-left transition-all flex flex-col justify-between min-h-[140px] cursor-pointer focus:outline-none ${
                activeHMCard === 'returned'
                  ? 'bg-orange-50 border-orange-400 ring-2 ring-orange-400/20 shadow-md scale-[1.01]'
                  : 'bg-white border-slate-200 hover:border-orange-300 hover:shadow-sm hover:bg-orange-50/10'
              }`}
            >
              <div className="flex justify-between items-start w-full">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-500 block">{t.headmaster.returned.title}</span>
                  <span className="text-2xl font-black text-orange-500 block">{t.headmaster.returned.count}</span>
                </div>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${
                  activeHMCard === 'returned' ? 'bg-orange-500 border-orange-600 text-white' : 'bg-orange-50 border-orange-100 text-orange-600'
                }`}>
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal font-sans mt-3">
                {t.headmaster.returned.desc}
              </p>
            </button>

            {/* Card 5: Overall Progress */}
            <button
              onClick={() => setActiveHMCard(activeHMCard === 'progress' ? null : 'progress')}
              className={`border rounded-2xl p-5 text-left transition-all flex flex-col justify-between min-h-[140px] cursor-pointer focus:outline-none ${
                activeHMCard === 'progress'
                  ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-400/20 shadow-md scale-[1.01]'
                  : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm hover:bg-indigo-50/10'
              }`}
            >
              <div className="flex justify-between items-start w-full">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-500 block">{t.headmaster.progress.title}</span>
                  <span className="text-2xl font-black text-indigo-600 block">{t.headmaster.progress.count}</span>
                </div>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${
                  activeHMCard === 'progress' ? 'bg-indigo-500 border-indigo-600 text-white' : 'bg-indigo-50 border-indigo-100 text-indigo-600'
                }`}>
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal font-sans mt-3">
                {t.headmaster.progress.desc}
              </p>
            </button>

          </div>
          )}

          {/* EXPANDABLE CORRESPONDING RECORD PANEL FOR CLICKED CARDS */}
          {activeHMCard && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm animate-fade-in text-left space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-600" />
                  <h4 className="text-sm font-extrabold text-slate-800 font-sans">
                    {t.headmaster.detailHeader}: {activeHMCard === 'completed' && t.headmaster.sections.completed}
                    {activeHMCard === 'draft' && t.headmaster.sections.draft}
                    {activeHMCard === 'pending' && t.headmaster.sections.pending}
                    {activeHMCard === 'returned' && t.headmaster.sections.returned}
                    {activeHMCard === 'progress' && t.headmaster.sections.progress}
                  </h4>
                </div>
                {!activeFeatureId && (
                  <button 
                    onClick={() => setActiveHMCard(null)}
                    className="text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-200 transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Production: never fabricate result records for empty filters. */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 text-center text-xs font-semibold text-slate-500">
                No real cloud/result records are available for this filter yet.
              </div>
            </div>
          )}

          {/* Empty Notification / System Info Row */}
          <div className="border border-slate-200 rounded-2xl p-5 bg-white text-left space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Bell className="w-4 h-4 text-slate-500" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">System Notifications</h3>
            </div>
            <p className="text-xs text-slate-400 italic text-center py-4">No active grading messages or alerts for administrative audit.</p>
          </div>

        </div>
      )}

      {/* Unauthorized fallback */}
      {!isHeadmaster && !isClerk && !isClassTeacher && !isSubjectTeacher && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4 max-w-md mx-auto">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <div className="space-y-2">
            <h3 className="text-base font-extrabold text-slate-800 font-sans">Access Denied</h3>
            <p className="text-xs text-slate-500">
              Only authorized staff roles (Headmaster, Clerk, and assigned Teachers) have access to academic results and report compilation workspaces.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}