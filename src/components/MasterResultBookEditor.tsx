import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
  FileSpreadsheet, Download, Upload, ClipboardList, RefreshCw, CheckCircle2,
  Trash2, Plus, ArrowLeft, ArrowRight, CornerDownRight, AlignLeft, AlignCenter,
  AlignRight, Type, Bold, Eye, Clock, ShieldCheck, HelpCircle, Save, Sliders,
  ChevronUp, ChevronDown, ZoomIn, ZoomOut, Maximize2, Minimize2, Eraser, Info,
  FileText, Printer
} from 'lucide-react';
import { Language, User } from '../types';
import { LocalERPDatabase, supabase } from '../lib/supabase';
import { getClassAssessmentWeightage, getSubComponentBreakdown } from '../lib/assessmentRules';
import CommonPrintEngine from './CommonPrintEngine';

function oklchToRgb(oklchStr: string): string | null {
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
  
  // Convert OKLCH to OKLAB
  const hRad = (h * Math.PI) / 180;
  const L = l;
  const oklab_a = c * Math.cos(hRad);
  const oklab_b = c * Math.sin(hRad);
  
  // Convert OKLAB to LMS
  const l_ = L + 0.3963377774 * oklab_a + 0.2158037573 * oklab_b;
  const m_ = L - 0.1055613458 * oklab_a - 0.0638541728 * oklab_b;
  const s_ = L - 0.0894841775 * oklab_a - 1.2914855480 * oklab_b;
  
  // LMS cubed
  const l_cubed = l_ * l_ * l_;
  const m_cubed = m_ * m_ * m_;
  const s_cubed = s_ * s_ * s_;
  
  // LMS to linear RGB
  const r_lin = +4.0767416621 * l_cubed - 3.3077115913 * m_cubed + 0.2309699292 * s_cubed;
  const g_lin = -1.2684380046 * l_cubed + 2.6097574011 * m_cubed - 0.3413193965 * s_cubed;
  const b_lin = -0.0041960863 * l_cubed - 0.7034186147 * m_cubed + 1.7076286104 * s_cubed;
  
  // Linear RGB to sRGB (gamma correction)
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
}

function oklabToRgb(oklabStr: string): string | null {
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
  
  // Convert OKLAB to LMS
  const l_ = L + 0.3963377774 * oklab_a + 0.2158037573 * oklab_b;
  const m_ = L - 0.1055613458 * oklab_a - 0.0638541728 * oklab_b;
  const s_ = L - 0.0894841775 * oklab_a - 1.2914855480 * oklab_b;
  
  // LMS cubed
  const l_cubed = l_ * l_ * l_;
  const m_cubed = m_ * m_ * m_;
  const s_cubed = s_ * s_ * s_;
  
  // LMS to linear RGB
  const r_lin = +4.0767416621 * l_cubed - 3.3077115913 * m_cubed + 0.2309699292 * s_cubed;
  const g_lin = -1.2684380046 * l_cubed + 2.6097574011 * m_cubed - 0.3413193965 * s_cubed;
  const b_lin = -0.0041960863 * l_cubed - 0.7034186147 * m_cubed + 1.7076286104 * s_cubed;
  
  // Linear RGB to sRGB (gamma correction)
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
}

function replaceOklchWithRgb(str: string): string {
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
}

function shiftFormula(formula: string, targetIdx: number): string {
  if (!formula) return formula;
  
  const colLetterToIdx = (letter: string) => {
    let idx = 0;
    for (let i = 0; i < letter.length; i++) {
      idx = idx * 26 + (letter.charCodeAt(i) - 64);
    }
    return idx - 1;
  };
  
  const colIdxToLetter = (idx: number) => {
    let letter = "";
    while (idx >= 0) {
      letter = String.fromCharCode((idx % 26) + 65) + letter;
      idx = Math.floor(idx / 26) - 1;
    }
    return letter;
  };

  const ranges: string[] = [];
  let formulaWithPlaceholders = formula.replace(/([A-Z]+)([0-9]+):([A-Z]+)([0-9]+)/g, (match) => {
    ranges.push(match);
    return `__RANGE_${ranges.length - 1}__`;
  });

  let shiftedSingle = formulaWithPlaceholders.replace(/([A-Z]+)([0-9]+)/g, (match, col, row) => {
    if (match.startsWith('__RANGE_')) return match;
    
    let c = colLetterToIdx(col);
    if (targetIdx <= c) {
      c++;
    }
    return `${colIdxToLetter(c)}${row}`;
  });

  let finalFormula = shiftedSingle.replace(/__RANGE_([0-9]+)__/g, (match, indexStr) => {
    const rangeMatch = ranges[parseInt(indexStr, 10)];
    return rangeMatch.replace(/([A-Z]+)([0-9]+):([A-Z]+)([0-9]+)/, (m, col1, row1, col2, row2) => {
      let c1 = colLetterToIdx(col1);
      let c2 = colLetterToIdx(col2);
      
      const swapped = c1 > c2;
      if (swapped) {
        const temp = c1; c1 = c2; c2 = temp;
      }
      
      if (targetIdx <= c1) {
        c1++;
        c2++;
      } else if (c1 < targetIdx && targetIdx <= c2) {
        c2++;
      } else if (targetIdx === c2 + 1) {
        c2++;
      }
      
      if (swapped) {
        return `${colIdxToLetter(c2)}${row2}:${colIdxToLetter(c1)}${row1}`;
      } else {
        return `${colIdxToLetter(c1)}${row1}:${colIdxToLetter(c2)}${row2}`;
      }
    });
  });

  return finalFormula;
}

interface MasterResultBookEditorProps {
  user: User;
  language: Language;
}

const FormulaBarInput = React.memo(({
  selectedCell,
  initialValue,
  onSave
}: {
  selectedCell: { r: number; c: number } | null;
  initialValue: string;
  onSave: (val: string) => void;
}) => {
  const [val, setVal] = useState(initialValue);

  useEffect(() => {
    setVal(initialValue);
  }, [initialValue]);

  return (
    <input
      type="text"
      disabled={!selectedCell}
      className="bg-transparent text-slate-800 focus:outline-none w-full placeholder:text-slate-400 placeholder:italic font-medium font-mono text-xs"
      placeholder={
        selectedCell 
          ? `Edit value or type formulas starting with = for cell ${XLSX.utils.encode_cell({ r: selectedCell.r, c: selectedCell.c })} (e.g. =SUM(D5:I5))...`
          : "Select any grid cell below to write value or edit original Excel formulas directly..."
      }
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && selectedCell) {
          onSave(val);
          (e.target as HTMLInputElement).blur();
        }
      }}
      onBlur={() => {
        if (selectedCell) {
          onSave(val);
        }
      }}
    />
  );
});

const InlineCellInput = React.memo(({
  initialValue,
  onSave,
  onCancel
}: {
  initialValue: string;
  onSave: (val: string) => void;
  onCancel: () => void;
}) => {
  const [val, setVal] = useState(initialValue);

  return (
    <input
      type="text"
      autoFocus
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onSave(val);
        if (e.key === 'Escape') onCancel();
      }}
      onBlur={() => onSave(val)}
      className="absolute inset-0 w-full h-full bg-white text-slate-900 border-2 border-indigo-600 px-1 font-mono focus:outline-none z-20 text-xs"
    />
  );
});

export default function MasterResultBookEditor({ user, language }: MasterResultBookEditorProps) {
  const isUrdu = language === 'ur';

  // 1. Initial State Definitions
  const [zoom, setZoom] = useState<number>(100);
  const [activeRibbonTab, setActiveRibbonTab] = useState<'home' | 'layout' | 'page' | 'formulas' | 'backups' | 'actions'>('home');
  const [showResetConfirmation, setShowResetConfirmation] = useState<boolean>(false);
  const [resetSuccess, setResetSuccess] = useState<boolean>(false);
  
  // Selection States
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [selectedColIdx, setSelectedColIdx] = useState<number | null>(null);
  const [selectedRowIdx, setSelectedRowIdx] = useState<number | null>(null);
  
  // Editing States
  const [editingCell, setEditingCell] = useState<{ r: number; c: number } | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState<string>('');
  const [formulaBarValue, setFormulaBarValue] = useState<string>('');
  
  // Progress/Status States
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [showFormulaHelper, setShowFormulaHelper] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [showPrintEngine, setShowPrintEngine] = useState<boolean>(false);
  const [cloudSchoolId, setCloudSchoolId] = useState<string>('');
  const [cloudTemplateLoaded, setCloudTemplateLoaded] = useState<boolean>(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'loading'|'saved'|'local'>('loading');

  // Default SheetJS Worksheet Generator
  const generateDefaultWorksheet = (targetClassName: string = "Class 1 - A") => {
    const s: any = {};
    const weightage = getClassAssessmentWeightage(targetClassName);
    const breakdown = getSubComponentBreakdown(targetClassName);
    
    // Fetch real scholastic subjects from local database
    const setup = LocalERPDatabase.getAcademicSetup();
    const subjects = setup?.subjects || [];
    const activeSubjects = subjects.filter((sub: any) => sub.isActive) || [];
    const subjectNames = activeSubjects.length > 0 
      ? activeSubjects.map((sub: any) => sub.subjectName)
      : ["Urdu", "Hindi", "Marathi", "English", "Mathematics", "Science", "History & Civics", "Geography"];

    const numSubjects = subjectNames.length;

    // Stylized cell setting helper
    const setCell = (r: number, c: number, val: any, type: string = 's', formula?: string, bold: boolean = false, align: string = 'center', bg?: string, size?: number) => {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      const cell: any = { t: type, v: val };
      if (formula) cell.f = formula;
      
      cell.s = {
        font: {
          bold,
          sz: size || 10,
          color: { rgb: '1e293b' }
        },
        alignment: {
          horizontal: align,
          vertical: 'center',
          wrapText: true
        },
        fill: bg ? { fgColor: { rgb: bg } } : undefined
      };
      s[cellRef] = cell;
    };

    // 1. Title Banner Rows
    setCell(0, 0, "NATIONAL HIGH SCHOOL, TALODA", 's', undefined, true, 'center', '1e293b', 13);
    if (s[XLSX.utils.encode_cell({ r: 0, c: 0 })]?.s?.font) {
      s[XLSX.utils.encode_cell({ r: 0, c: 0 })].s.font.color = { rgb: 'ffffff' };
    }

    setCell(1, 0, "OFFICIAL CONSOLIDATED MASTER RESULT BOOK - INDIVIDUAL STUDENT ASSESSMENT LEDGER", 's', undefined, true, 'center', '334155', 10);
    if (s[XLSX.utils.encode_cell({ r: 1, c: 0 })]?.s?.font) {
      s[XLSX.utils.encode_cell({ r: 1, c: 0 })].s.font.color = { rgb: 'ffffff' };
    }

    setCell(2, 0, `Academic Year: ${academicYear || ''} | Permanent Master Student Ledger Template (${targetClassName})`, 's', undefined, false, 'center', '475569', 9);
    if (s[XLSX.utils.encode_cell({ r: 2, c: 0 })]?.s?.font) {
      s[XLSX.utils.encode_cell({ r: 2, c: 0 })].s.font.color = { rgb: 'ffffff' };
    }

    // 2. Student Information Section
    setCell(4, 0, "Student Name:", 's', undefined, true, 'left', 'f1f5f9');
    setCell(4, 1, "Student Name", 's', undefined, true, 'left', 'ffffff');
    setCell(4, 5, "G.R. Number:", 's', undefined, true, 'left', 'f1f5f9');
    setCell(4, 6, "—", 's', undefined, true, 'center', 'ffffff');
    setCell(4, 8, "Roll Number:", 's', undefined, true, 'left', 'f1f5f9');
    setCell(4, 9, "1", 'n', undefined, true, 'center', 'ffffff');

    setCell(5, 0, "Class & Division:", 's', undefined, true, 'left', 'f1f5f9');
    setCell(5, 1, targetClassName, 's', undefined, true, 'left', 'ffffff');
    setCell(5, 5, "Mother's Name:", 's', undefined, true, 'left', 'f1f5f9');
    setCell(5, 6, "—", 's', undefined, true, 'left', 'ffffff');
    setCell(5, 8, "Date of Birth:", 's', undefined, true, 'left', 'f1f5f9');
    setCell(5, 9, "—", 's', undefined, true, 'center', 'ffffff');

    setCell(6, 0, "SARAL ID:", 's', undefined, true, 'left', 'f1f5f9');
    setCell(6, 1, "—", 's', undefined, true, 'left', 'ffffff');
    setCell(6, 5, "UID / Aadhaar:", 's', undefined, true, 'left', 'f1f5f9');
    setCell(6, 6, "—", 's', undefined, true, 'left', 'ffffff');

    // 3. FIRST TERM Section
    setCell(8, 0, "FIRST SEMESTER (TERM I)", 's', undefined, true, 'center', '0f766e', 11);
    if (s[XLSX.utils.encode_cell({ r: 8, c: 0 })]?.s?.font) {
      s[XLSX.utils.encode_cell({ r: 8, c: 0 })].s.font.color = { rgb: 'ffffff' };
    }

    const headers = [
      "SUBJECT / COURSE",
      `Homework [Max: ${breakdown.homeworkMax}]`,
      `Assignment [Max: ${breakdown.assignmentMax}]`,
      `Oral / Viva [Max: ${breakdown.oralMax}]`,
      `Unit Test [Max: ${breakdown.unitTestMax}]`,
      `Project [Max: ${breakdown.projectMax}]`,
      `Formative [Max: ${weightage.formativeMax}]`,
      `Written Exam [Max: ${weightage.summativeMax}]`,
      `Summative [Max: ${weightage.summativeMax}]`,
      `Grand Total [Max: ${weightage.totalMax}]`,
      "Result Grade"
    ];

    headers.forEach((h, cIdx) => {
      let bg = 'e2e8f0';
      if (cIdx === 6) bg = 'ccfbf1'; // Formative
      if (cIdx === 8) bg = 'e0f2fe'; // Summative
      if (cIdx === 9) bg = 'fef3c7'; // Grand Total
      if (cIdx === 10) bg = 'f3e8ff'; // Grade
      setCell(9, cIdx, h, 's', undefined, true, cIdx === 0 ? 'left' : 'center', bg, 9);
    });

    // Subject Rows (Term I)
    subjectNames.forEach((name, sIdx) => {
      const r = 10 + sIdx;
      const excelRow = r + 1;
      
      setCell(r, 0, name, 's', undefined, true, 'left', 'f8fafc');
      setCell(r, 1, "", 's', undefined, false, 'center'); // HW
      setCell(r, 2, "", 's', undefined, false, 'center'); // Assignment
      setCell(r, 3, "", 's', undefined, false, 'center'); // Oral
      setCell(r, 4, "", 's', undefined, false, 'center'); // UT
      setCell(r, 5, "", 's', undefined, false, 'center'); // Project
      
      // Formative = Sum(HW, Assignment, Oral, UT, Project)
      setCell(r, 6, "", 's', `SUM(B${excelRow}:F${excelRow})`, true, 'center', 'f0fdfa');
      
      // Written Exam
      setCell(r, 7, "", 's', undefined, false, 'center');
      
      // Summative = Written
      setCell(r, 8, "", 's', `SUM(H${excelRow})`, true, 'center', 'f0f9ff');
      
      // Grand Total = Formative + Summative
      setCell(r, 9, "", 's', `SUM(G${excelRow},I${excelRow})`, true, 'center', 'fffbeb');
      
      // Grade Formula
      const gradeFormula = `IF(J${excelRow}>=90,"A1",IF(J${excelRow}>=80,"A2",IF(J${excelRow}>=70,"B1",IF(J${excelRow}>=60,"B2",IF(J${excelRow}>=50,"C1",IF(J${excelRow}>=35,"C2","D"))))))`;
      setCell(r, 10, "", 's', gradeFormula, true, 'center', 'faf5ff');
    });

    // Term I Cumulative Summary
    const term1EndRow = 10 + numSubjects - 1;

    // Row A: First Term Grand Total
    const r1GrandTotalRow = term1EndRow + 1;
    setCell(r1GrandTotalRow, 0, `First Term Grand Total (Out of ${numSubjects * 100})`, 's', undefined, true, 'left', 'cbd5e1');
    setCell(r1GrandTotalRow, 9, "", 's', `SUM(J11:J${term1EndRow + 1})`, true, 'center', 'cbd5e1');
    setCell(r1GrandTotalRow, 10, "", 's', undefined, false, 'center', 'cbd5e1');

    // Row B: First Term Percentage
    const r1PercentageRow = term1EndRow + 2;
    setCell(r1PercentageRow, 0, "First Term Percentage (%)", 's', undefined, true, 'left', 'e2e8f0');
    setCell(r1PercentageRow, 9, "", 's', `ROUND(J${r1GrandTotalRow + 1}/${numSubjects},2)`, true, 'center', 'e2e8f0');
    setCell(r1PercentageRow, 10, "", 's', undefined, false, 'center', 'e2e8f0');

    // Row C: First Term Grade
    const r1GradeRow = term1EndRow + 3;
    const r1GradeFormula = `IF(J${r1PercentageRow + 1}>=90,"A1",IF(J${r1PercentageRow + 1}>=80,"A2",IF(J${r1PercentageRow + 1}>=70,"B1",IF(J${r1PercentageRow + 1}>=60,"B2",IF(J${r1PercentageRow + 1}>=50,"C1",IF(J${r1PercentageRow + 1}>=35,"C2","D"))))))`;
    setCell(r1GradeRow, 0, "First Term Grade", 's', undefined, true, 'left', 'f1f5f9');
    setCell(r1GradeRow, 9, "", 's', r1GradeFormula, true, 'center', 'f1f5f9');
    setCell(r1GradeRow, 10, "", 's', undefined, false, 'center', 'f1f5f9');

    // Spacer & Section 2
    const term2HeaderRow = term1EndRow + 5;

    // 4. SECOND TERM Section
    setCell(term2HeaderRow, 0, "SECOND SEMESTER (TERM II)", 's', undefined, true, 'center', '1d4ed8', 11);
    if (s[XLSX.utils.encode_cell({ r: term2HeaderRow, c: 0 })]?.s?.font) {
      s[XLSX.utils.encode_cell({ r: term2HeaderRow, c: 0 })].s.font.color = { rgb: 'ffffff' };
    }

    const term2TableHeaderRow = term2HeaderRow + 1;
    headers.forEach((h, cIdx) => {
      let bg = 'e2e8f0';
      if (cIdx === 6) bg = 'ccfbf1'; // Formative
      if (cIdx === 8) bg = 'e0f2fe'; // Summative
      if (cIdx === 9) bg = 'fef3c7'; // Grand Total
      if (cIdx === 10) bg = 'f3e8ff'; // Grade
      setCell(term2TableHeaderRow, cIdx, h, 's', undefined, true, cIdx === 0 ? 'left' : 'center', bg, 9);
    });

    // Subject Rows (Term II)
    const term2SubjectStartRow = term2TableHeaderRow + 1;
    subjectNames.forEach((name, sIdx) => {
      const r = term2SubjectStartRow + sIdx;
      const excelRow = r + 1;
      
      setCell(r, 0, name, 's', undefined, true, 'left', 'f8fafc');
      setCell(r, 1, "", 's', undefined, false, 'center'); // HW
      setCell(r, 2, "", 's', undefined, false, 'center'); // Assignment
      setCell(r, 3, "", 's', undefined, false, 'center'); // Oral
      setCell(r, 4, "", 's', undefined, false, 'center'); // UT
      setCell(r, 5, "", 's', undefined, false, 'center'); // Project
      
      // Formative = Sum(HW, Assignment, Oral, UT, Project)
      setCell(r, 6, "", 's', `SUM(B${excelRow}:F${excelRow})`, true, 'center', 'f0fdfa');
      
      // Written Exam
      setCell(r, 7, "", 's', undefined, false, 'center');
      
      // Summative = Written
      setCell(r, 8, "", 's', `SUM(H${excelRow})`, true, 'center', 'f0f9ff');
      
      // Grand Total = Formative + Summative
      setCell(r, 9, "", 's', `SUM(G${excelRow},I${excelRow})`, true, 'center', 'fffbeb');
      
      // Grade Formula
      const gradeFormula = `IF(J${excelRow}>=90,"A1",IF(J${excelRow}>=80,"A2",IF(J${excelRow}>=70,"B1",IF(J${excelRow}>=60,"B2",IF(J${excelRow}>=50,"C1",IF(J${excelRow}>=35,"C2","D"))))))`;
      setCell(r, 10, "", 's', gradeFormula, true, 'center', 'faf5ff');
    });

    // Term II Summary Section
    const term2EndRow = term2SubjectStartRow + numSubjects - 1;

    // Row A: Second Term Grand Total
    const r2GrandTotalRow = term2EndRow + 1;
    setCell(r2GrandTotalRow, 0, `Second Term Grand Total (Out of ${numSubjects * 100})`, 's', undefined, true, 'left', 'cbd5e1');
    setCell(r2GrandTotalRow, 9, "", 's', `SUM(J${term2SubjectStartRow + 1}:J${term2EndRow + 1})`, true, 'center', 'cbd5e1');
    setCell(r2GrandTotalRow, 10, "", 's', undefined, false, 'center', 'cbd5e1');

    // Row B: Second Term Percentage
    const r2PercentageRow = term2EndRow + 2;
    setCell(r2PercentageRow, 0, "Second Term Percentage (%)", 's', undefined, true, 'left', 'e2e8f0');
    setCell(r2PercentageRow, 9, "", 's', `ROUND(J${r2GrandTotalRow + 1}/${numSubjects},2)`, true, 'center', 'e2e8f0');
    setCell(r2PercentageRow, 10, "", 's', undefined, false, 'center', 'e2e8f0');

    // Row C: Second Term Grade
    const r2GradeRow = term2EndRow + 3;
    const r2GradeFormula = `IF(J${r2PercentageRow + 1}>=90,"A1",IF(J${r2PercentageRow + 1}>=80,"A2",IF(J${r2PercentageRow + 1}>=70,"B1",IF(J${r2PercentageRow + 1}>=60,"B2",IF(J${r2PercentageRow + 1}>=50,"C1",IF(J${r2PercentageRow + 1}>=35,"C2","D"))))))`;
    setCell(r2GradeRow, 0, "Second Term Grade", 's', undefined, true, 'left', 'f1f5f9');
    setCell(r2GradeRow, 9, "", 's', r2GradeFormula, true, 'center', 'f1f5f9');
    setCell(r2GradeRow, 10, "", 's', undefined, false, 'center', 'f1f5f9');

    // Setup Row Heights & Column Widths
    const totalRowIndex = r2GradeRow;
    s["!ref"] = `A1:K${totalRowIndex + 1}`;
    
    s["!cols"] = [
      { wpx: 150 }, // Subject Name
      { wpx: 75 },  // Homework
      { wpx: 75 },  // Assignment
      { wpx: 75 },  // Oral
      { wpx: 75 },  // Unit Test
      { wpx: 75 },  // Project
      { wpx: 90 },  // Formative Total
      { wpx: 85 },  // Written Exam
      { wpx: 90 },  // Summative Total
      { wpx: 90 },  // Grand Total
      { wpx: 80 }   // Result Grade
    ];
    
    const rowHeights: any[] = [];
    for (let r = 0; r <= totalRowIndex; r++) {
      let h = 26;
      if (r < 3) h = 32; // Title rows
      else if (r === 3 || r === 7 || r === term1EndRow + 4) h = 10; // Spacer rows
      else if (r === 8 || r === term2HeaderRow) h = 34; // Semester headers
      else if (r === 9 || r === term2TableHeaderRow) h = 30; // Table headers
      else if (r > term1EndRow && r <= r1GradeRow) h = 28; // Term 1 summary rows
      else if (r > term2EndRow && r <= r2GradeRow) h = 28; // Term 2 summary rows
      rowHeights.push({ hpx: h });
    }
    s["!rows"] = rowHeights;

    // Define precise merges
    s["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 10 } },
      
      { s: { r: 4, c: 1 }, e: { r: 4, c: 4 } },
      { s: { r: 4, c: 6 }, e: { r: 4, c: 7 } },
      { s: { r: 4, c: 9 }, e: { r: 4, c: 10 } },
      
      { s: { r: 5, c: 1 }, e: { r: 5, c: 4 } },
      { s: { r: 5, c: 6 }, e: { r: 5, c: 7 } },
      { s: { r: 5, c: 9 }, e: { r: 5, c: 10 } },
      
      { s: { r: 6, c: 1 }, e: { r: 6, c: 4 } },
      { s: { r: 6, c: 6 }, e: { r: 6, c: 10 } },
      
      { s: { r: 8, c: 0 }, e: { r: 8, c: 10 } },
      { s: { r: r1GrandTotalRow, c: 0 }, e: { r: r1GrandTotalRow, c: 8 } },
      { s: { r: r1PercentageRow, c: 0 }, e: { r: r1PercentageRow, c: 8 } },
      { s: { r: r1GradeRow, c: 0 }, e: { r: r1GradeRow, c: 8 } },
      
      { s: { r: term2HeaderRow, c: 0 }, e: { r: term2HeaderRow, c: 10 } },
      { s: { r: r2GrandTotalRow, c: 0 }, e: { r: r2GrandTotalRow, c: 8 } },
      { s: { r: r2PercentageRow, c: 0 }, e: { r: r2PercentageRow, c: 8 } },
      { s: { r: r2GradeRow, c: 0 }, e: { r: r2GradeRow, c: 8 } }
    ];

    // Page Settings
    s["!pageSetup"] = {
      orientation: "Portrait",
      pageSize: "Legal",
      margins: "Narrow",
      printArea: "A:K"
    };

    return s;
  };

  // Selected Class State for Master Mark List
  const [selectedClass, setSelectedClass] = useState<string>('Class 1 - A');

  // Primary Sheet State
  const [sheet, setSheet] = useState<any>(() => {
    const saved = localStorage.getItem('erp_master_result_book_sheet');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Force replace if old sheet structure detected
        const cellRefs = Object.keys(parsed);
        const hasAttendance = cellRefs.some(ref => parsed[ref]?.v && String(parsed[ref].v).includes("Total Attendance"));
        const hasColL = parsed["!ref"] && parsed["!ref"].includes("L");
        if (hasAttendance || hasColL) {
          console.log("Old sheet layout detected. Forcing new compact legal-size layout...");
          const fresh = generateDefaultWorksheet('Class 1 - A');
          localStorage.setItem('erp_master_result_book_sheet', JSON.stringify(fresh));
          return fresh;
        }
        return parsed;
      } catch (e) {
        console.error("Error parsing sheet from local storage", e);
      }
    }
    return generateDefaultWorksheet('Class 1 - A');
  });

  // Backup state
  const [backups, setBackups] = useState<any[]>(() => {
    const saved = localStorage.getItem('erp_master_result_book_sheet_backups');
    return saved ? JSON.parse(saved) : [];
  });

  // Production persistence: reuse the existing Result template cloud table with a
  // dedicated master_result_book key. localStorage is kept only as a compatibility
  // cache for old builds and offline preview.
  useEffect(() => {
    let cancelled = false;
    const loadCloudMaster = async () => {
      try {
        const auth = await supabase.auth.getUser();
        const uid = auth.data.user?.id;
        if (!uid) { setCloudSyncStatus('local'); setCloudTemplateLoaded(true); return; }
        const membership = await supabase.from('user_school_memberships').select('school_id').eq('user_id', uid).eq('is_active', true).maybeSingle();
        if (membership.error) throw membership.error;
        const sid = String((membership.data as any)?.school_id || '');
        if (!sid) { setCloudSyncStatus('local'); setCloudTemplateLoaded(true); return; }
        if (cancelled) return;
        setCloudSchoolId(sid);
        const row = await supabase.from('edunixo_result_templates').select('definition').eq('school_id', sid).eq('template_key', 'master_result_book').eq('active', true).maybeSingle();
        if (!row.error && (row.data as any)?.definition?.sheet) {
          const cloudSheet = (row.data as any).definition.sheet;
          setSheet(cloudSheet);
          localStorage.setItem('erp_master_result_book_sheet', JSON.stringify(cloudSheet));
        }
        if (row.error && !/does not exist|schema cache|could not find|relation .* does not exist/i.test(String(row.error.message || ''))) throw row.error;
        if (!cancelled) { setCloudTemplateLoaded(true); setCloudSyncStatus(row.error ? 'local' : 'saved'); }
      } catch (err) {
        console.warn('Master Result Book cloud load unavailable; using compatibility cache.', err);
        if (!cancelled) { setCloudTemplateLoaded(true); setCloudSyncStatus('local'); }
      }
    };
    void loadCloudMaster();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!cloudTemplateLoaded || !cloudSchoolId) return;
    const timer = window.setTimeout(async () => {
      try {
        const payload = {
          school_id: cloudSchoolId, template_key: 'master_result_book',
          name: 'Master Result Book', category: 'Master Result Book',
          description: 'One-student-per-legal-page Master Result Book with First Term and Second Term structure.',
          definition: { sheet, selectedClass, pageSize:'Legal', orientation:'Portrait', structureVersion:'r4.8' },
          active: true, updated_at: new Date().toISOString(),
        };
        const result = await supabase.from('edunixo_result_templates').upsert(payload, { onConflict:'school_id,template_key' });
        if (result.error) throw result.error;
        setCloudSyncStatus('saved');
      } catch (err) {
        console.warn('Master Result Book cloud autosave unavailable; local compatibility copy retained.', err);
        setCloudSyncStatus('local');
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [sheet, selectedClass, cloudSchoolId, cloudTemplateLoaded]);

  const handleResetToCleanSlate = () => {
    try {
      // 1. Create temporary session backup in case of any failures
      const currentSheetJson = localStorage.getItem('erp_master_result_book_sheet');
      if (currentSheetJson) {
        sessionStorage.setItem('erp_master_result_book_sheet_backup_before_reset', currentSheetJson);
      }

      // Also create a backup snapshot in standard backups list
      const now = new Date();
      const currentBackup = {
        timestamp: `${now.toLocaleDateString()} ${now.toLocaleTimeString()} (Before Clean Slate Reset)`,
        editorName: user.name + " (Auto Backup)",
        sheet: JSON.parse(JSON.stringify(sheet))
      };
      const updatedBackups = [currentBackup, ...backups].slice(0, 10);
      localStorage.setItem('erp_master_result_book_sheet_backups', JSON.stringify(updatedBackups));
      setBackups(updatedBackups);

      // 2. Perform deep copy of the sheet to modify it
      const cleanSheet = JSON.parse(JSON.stringify(sheet));

      // 3. Clear mark values and calculated scores in row indices >= 10
      // Columns to blank/empty: 
      // Input Columns: B (1), C (2), D (3), E (4), F (5), H (7)
      // Computed Columns: G (6), I (8), J (9), K (10)
      const range = XLSX.utils.decode_range(cleanSheet['!ref'] || 'A1:K35');
      
      for (let r = 10; r <= range.e.r; r++) {
        // Skip header rows by checking column 0 value
        const col0Ref = XLSX.utils.encode_cell({ r, c: 0 });
        const col0Val = cleanSheet[col0Ref]?.v;
        if (col0Val === "SUBJECT / COURSE" || (typeof col0Val === 'string' && col0Val.toUpperCase().includes("SECOND SEMESTER"))) {
          continue; // skip table header rows
        }

        for (let c = 1; c <= 10; c++) {
          const cellRef = XLSX.utils.encode_cell({ r, c });
          if (cleanSheet[cellRef]) {
            const cellObj = cleanSheet[cellRef];
            if (cellObj.f) {
              // It is a formula cell! Keep the formula, but clear the computed/evaluated value
              cellObj.v = "";
              cellObj.t = "s";
            } else {
              // It is a simple input mark value cell! Make it completely blank/empty
              cellObj.v = "";
              cellObj.t = "s";
            }
          }
        }
      }

      // 4. Update states & local storage
      setSheet(cleanSheet);
      localStorage.setItem('erp_master_result_book_sheet', JSON.stringify(cleanSheet));

      // Reset selection states to avoid stale UI references
      setSelectedCell(null);
      setSelectedColIdx(null);
      setSelectedRowIdx(null);

      // Audit Log registration
      LocalERPDatabase.addAuditLog(
        user.id,
        user.name,
        user.role,
        "RESET_MASTER_RESULT_BOOK_CLEAN_SLATE",
        "Result Management",
        `Headmaster ${user.name} successfully reset Master Result Book template to clean slate. Structure, formulas, and subjects remain 100% intact.`
      );

      return true;
    } catch (err) {
      console.error("Failed to reset master template to clean slate:", err);
      // Automatic restoration from temporary session backup
      const restoredSheetJson = sessionStorage.getItem('erp_master_result_book_sheet_backup_before_reset');
      if (restoredSheetJson) {
        localStorage.setItem('erp_master_result_book_sheet', restoredSheetJson);
        setSheet(JSON.parse(restoredSheetJson));
      }
      return false;
    }
  };

  // Calculate grid range properties
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:K35');
  const minRow = range.s.r;
  const maxRow = range.e.r;
  const minCol = range.s.c;
  const maxCol = range.e.c;

  const activeRow = selectedRowIdx !== null ? selectedRowIdx : (selectedCell !== null ? selectedCell.r : null);
  const activeCol = selectedColIdx !== null ? selectedColIdx : (selectedCell !== null ? selectedCell.c : null);

  // Sync Formula Bar when Selected Cell changes
  useEffect(() => {
    if (selectedCell) {
      const cellRef = XLSX.utils.encode_cell({ r: selectedCell.r, c: selectedCell.c });
      const cell = sheet[cellRef];
      if (cell) {
        setFormulaBarValue(cell.f ? `=${cell.f}` : (cell.v !== undefined ? String(cell.v) : ''));
      } else {
        setFormulaBarValue('');
      }
    } else {
      setFormulaBarValue('');
    }
    // Double click edit should close
    setEditingCell(null);
  }, [selectedCell, sheet]);

  // Merge Info Helper
  const getMergeInfo = (r: number, c: number) => {
    const merges = sheet['!merges'] || [];
    for (const merge of merges) {
      if (r >= merge.s.r && r <= merge.e.r && c >= merge.s.c && c <= merge.e.c) {
        const isTopLeft = (r === merge.s.r && c === merge.s.c);
        return {
          isMerged: true,
          isTopLeft,
          rowSpan: merge.e.r - merge.s.r + 1,
          colSpan: merge.e.c - merge.s.c + 1,
          range: merge
        };
      }
    }
    return { isMerged: false, isTopLeft: true, rowSpan: 1, colSpan: 1 };
  };

  // Column Width Helper
  const getColWidth = (c: number) => {
    const cols = sheet['!cols'];
    if (cols?.[c]) {
      if (cols[c].wpx) return `${cols[c].wpx}px`;
      if (cols[c].wch) return `${cols[c].wch * 8}px`;
      if (cols[c].width) return `${cols[c].width * 8}px`;
    }
    return '100px';
  };

  // Row Height Helper
  const getRowHeight = (r: number) => {
    const rows = sheet['!rows'];
    if (rows?.[r]) {
      if (rows[r].hpx) return `${rows[r].hpx}px`;
      if (rows[r].hpt) return `${rows[r].hpt * 1.33}px`;
    }
    return '28px';
  };

  // Cell Style builder
  const getCellStyle = (r: number, c: number, cell: any) => {
    const styles: React.CSSProperties = {
      width: getColWidth(c),
      height: getRowHeight(r),
    };

    // Apply native styles parsed from XLSX if present
    if (cell?.s) {
      if (cell.s.font) {
        if (cell.s.font.bold) styles.fontWeight = 'bold';
        if (cell.s.font.italic) styles.fontStyle = 'italic';
        if (cell.s.font.sz) styles.fontSize = `${cell.s.font.sz}pt`;
        if (cell.s.font.color?.rgb) styles.color = `#${cell.s.font.color.rgb}`;
      }
      if (cell.s.alignment?.horizontal) {
        styles.textAlign = cell.s.alignment.horizontal as any;
      }
      if (cell.s.fill?.fgColor?.rgb) {
        styles.backgroundColor = `#${cell.s.fill.fgColor.rgb}`;
      }
    }

    return styles;
  };

  // Save changes to state, local storage and audit log
  const saveWorksheetState = (updatedSheet: any, auditMessage: string) => {
    setSheet(updatedSheet);
    localStorage.setItem('erp_master_result_book_sheet', JSON.stringify(updatedSheet));

    // Create backup version
    const now = new Date();
    const newBackup = {
      timestamp: `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`,
      editorName: user.name,
      sheet: updatedSheet
    };
    const updatedBackups = [newBackup, ...backups].slice(0, 10);
    localStorage.setItem('erp_master_result_book_sheet_backups', JSON.stringify(updatedBackups));
    setBackups(updatedBackups);

    // Audit Trail Log
    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role,
      "UPDATE_MASTER_RESULT_BOOK_SHEET",
      "Result Management",
      auditMessage
    );
  };

  const getRowHeightPx = (r: number): number => {
    const rows = sheet['!rows'];
    if (rows?.[r]) {
      if (rows[r].hpx !== undefined) return rows[r].hpx;
      if (rows[r].hpt !== undefined) return Math.round(rows[r].hpt * 1.33);
    }
    return 28; // default
  };

  const getColWidthPx = (c: number): number => {
    const cols = sheet['!cols'];
    if (cols?.[c]) {
      if (cols[c].wpx !== undefined) return cols[c].wpx;
      if (cols[c].wch !== undefined) return Math.round(cols[c].wch * 8);
      if (cols[c].width !== undefined) return Math.round(cols[c].width * 8);
    }
    return 100; // default
  };

  const resizeRowHeight = (r: number, newHeight: number) => {
    const updated = { ...sheet };
    if (!updated['!rows']) {
      updated['!rows'] = [];
    }
    updated['!rows'] = JSON.parse(JSON.stringify(updated['!rows']));
    while (updated['!rows'].length <= r) {
      updated['!rows'].push({ hpx: 28 });
    }
    updated['!rows'][r] = { hpx: newHeight };
    saveWorksheetState(updated, `Adjusted row height of row ${r + 1} to ${newHeight}px`);
  };

  const resizeColumnWidth = (c: number, newWidth: number) => {
    const updated = { ...sheet };
    if (!updated['!cols']) {
      updated['!cols'] = [];
    }
    updated['!cols'] = JSON.parse(JSON.stringify(updated['!cols']));
    while (updated['!cols'].length <= c) {
      updated['!cols'].push({ wpx: 100 });
    }
    updated['!cols'][c] = { wpx: newWidth };
    saveWorksheetState(updated, `Adjusted column width of column ${XLSX.utils.encode_col(c)} to ${newWidth}px`);
  };

  // Cell editing submit
  const submitCellEdit = (r: number, c: number, typedVal: string) => {
    const updated = { ...sheet };
    const cellRef = XLSX.utils.encode_cell({ r, c });
    let cell = updated[cellRef];
    if (!cell) {
      cell = { t: 's', v: '' };
      updated[cellRef] = cell;
    }

    if (typedVal.startsWith('=')) {
      cell.f = typedVal.substring(1);
      cell.t = 's';
      cell.v = ''; // clear evaluated value so sheet viewer displays formula trigger
    } else {
      delete cell.f;
      const num = Number(typedVal);
      if (typedVal !== '' && !isNaN(num)) {
        cell.t = 'n';
        cell.v = num;
      } else {
        cell.t = 's';
        cell.v = typedVal;
      }
    }

    saveWorksheetState(updated, `Clerk modified cell ${cellRef} directly in Excel Grid to: "${typedVal}"`);
  };

  // Double Click / Keyboard handlers
  const handleCellDoubleClick = (r: number, c: number) => {
    const cellRef = XLSX.utils.encode_cell({ r, c });
    const cell = sheet[cellRef];
    const initialVal = cell ? (cell.f ? `=${cell.f}` : (cell.v !== undefined ? String(cell.v) : '')) : '';
    setEditingCell({ r, c });
    setInlineEditValue(initialVal);
  };

  const handleInlineEditSubmit = (r: number, c: number) => {
    submitCellEdit(r, c, inlineEditValue);
    setEditingCell(null);
  };

  // Header click selectors
  const handleColHeaderClick = (c: number) => {
    setSelectedColIdx(c);
    setSelectedRowIdx(null);
    setSelectedCell(null);
  };

  const handleRowHeaderClick = (r: number) => {
    setSelectedRowIdx(r);
    setSelectedColIdx(null);
    setSelectedCell(null);
  };

  // Structural adjustments (Insert/Delete Row)
  const handleInsertRow = () => {
    const targetIdx = selectedRowIdx !== null ? selectedRowIdx : maxRow + 1;
    const updated = { ...sheet };
    const range = XLSX.utils.decode_range(updated['!ref']);
    const endRow = range.e.r;
    const endCol = range.e.c;

    // Shift cells down
    for (let r = endRow; r >= targetIdx; r--) {
      for (let c = 0; c <= endCol; c++) {
        const fromRef = XLSX.utils.encode_cell({ r, c });
        const toRef = XLSX.utils.encode_cell({ r: r + 1, c });
        if (updated[fromRef]) {
          updated[toRef] = updated[fromRef];
          delete updated[fromRef];
        } else {
          delete updated[toRef];
        }
      }
    }

    // Adjust Merges
    if (updated['!merges']) {
      updated['!merges'] = updated['!merges'].map((merge: any) => {
        let s_r = merge.s.r;
        let e_r = merge.e.r;
        if (s_r >= targetIdx) s_r++;
        if (e_r >= targetIdx) e_r++;
        return { s: { r: s_r, c: merge.s.c }, e: { r: e_r, c: merge.e.c } };
      });
    }

    // Adjust Heights
    if (updated['!rows']) {
      updated['!rows'].splice(targetIdx, 0, { hpx: 28 });
    }

    // Update ref
    range.e.r++;
    updated['!ref'] = XLSX.utils.encode_range(range);

    saveWorksheetState(updated, `Clerk inserted a new row at index ${targetIdx + 1}`);
    setSelectedRowIdx(null);
  };

  const handleDeleteRow = () => {
    const targetIdx = selectedRowIdx !== null ? selectedRowIdx : maxRow;
    if (targetIdx < 4) {
      alert("Cannot delete protected title/header rows.");
      return;
    }
    const updated = { ...sheet };
    const range = XLSX.utils.decode_range(updated['!ref']);
    const endRow = range.e.r;
    const endCol = range.e.c;

    // Delete target row cells
    for (let c = 0; c <= endCol; c++) {
      const ref = XLSX.utils.encode_cell({ r: targetIdx, c });
      delete updated[ref];
    }

    // Shift subsequent cells up
    for (let r = targetIdx + 1; r <= endRow; r++) {
      for (let c = 0; c <= endCol; c++) {
        const fromRef = XLSX.utils.encode_cell({ r, c });
        const toRef = XLSX.utils.encode_cell({ r: r - 1, c });
        if (updated[fromRef]) {
          updated[toRef] = updated[fromRef];
          delete updated[fromRef];
        } else {
          delete updated[toRef];
        }
      }
    }

    // Adjust Merges
    if (updated['!merges']) {
      updated['!merges'] = updated['!merges']
        .map((merge: any) => {
          let s_r = merge.s.r;
          let e_r = merge.e.r;
          if (s_r > targetIdx) s_r--;
          if (e_r >= targetIdx) e_r--;
          return { s: { r: s_r, c: merge.s.c }, e: { r: e_r, c: merge.e.c } };
        })
        .filter((merge: any) => merge.e.r >= merge.s.r);
    }

    // Adjust Heights
    if (updated['!rows']) {
      updated['!rows'].splice(targetIdx, 1);
    }

    // Update range
    range.e.r--;
    updated['!ref'] = XLSX.utils.encode_range(range);

    saveWorksheetState(updated, `Clerk deleted row index ${targetIdx + 1}`);
    setSelectedRowIdx(null);
  };

  // Structural Adjustments (Insert/Delete Column)
  const handleInsertColumn = () => {
    const targetIdx = selectedColIdx !== null ? selectedColIdx : maxCol + 1;
    const updated = { ...sheet };
    const range = XLSX.utils.decode_range(updated['!ref']);
    const endRow = range.e.r;
    const endCol = range.e.c;

    // Shift columns right
    for (let c = endCol; c >= targetIdx; c--) {
      for (let r = 0; r <= endRow; r++) {
        const fromRef = XLSX.utils.encode_cell({ r, c });
        const toRef = XLSX.utils.encode_cell({ r, c: c + 1 });
        if (updated[fromRef]) {
          updated[toRef] = updated[fromRef];
          delete updated[fromRef];
        } else {
          delete updated[toRef];
        }
      }
    }

    // Determine reference column to copy style and properties from
    const sourceColIdx = targetIdx > 0 ? targetIdx - 1 : 1;

    // Shift all formulas in the sheet to account for the newly inserted column
    Object.keys(updated).forEach(ref => {
      if (ref.startsWith('!')) return;
      const cell = updated[ref];
      if (cell && cell.f) {
        cell.f = shiftFormula(cell.f, targetIdx);
      }
    });

    // Copy style, font, borders, alignment, etc., from neighbor column for all rows
    for (let r = 0; r <= endRow; r++) {
      const sourceRef = XLSX.utils.encode_cell({ r, c: sourceColIdx });
      const targetRef = XLSX.utils.encode_cell({ r, c: targetIdx });
      const sourceCell = updated[sourceRef];
      if (sourceCell) {
        updated[targetRef] = {
          t: 's',
          v: '',
          s: sourceCell.s ? JSON.parse(JSON.stringify(sourceCell.s)) : undefined
        };
        // If the source cell has a formula, copy and shift the formula pattern
        if (sourceCell.f) {
          updated[targetRef].f = shiftFormula(sourceCell.f, targetIdx);
        }
      }
    }

    // Adjust merges
    if (updated['!merges']) {
      updated['!merges'] = updated['!merges'].map((merge: any) => {
        let s_c = merge.s.c;
        let e_c = merge.e.c;
        if (s_c >= targetIdx) s_c++;
        if (e_c >= targetIdx) e_c++;
        return { s: { r: merge.s.r, c: s_c }, e: { r: merge.e.r, c: e_c } };
      });
    }

    // Adjust width list and copy width from source column
    if (updated['!cols']) {
      let sourceColDef = { wpx: 100 };
      if (updated['!cols'][sourceColIdx]) {
        sourceColDef = { ...updated['!cols'][sourceColIdx] };
      }
      updated['!cols'].splice(targetIdx, 0, sourceColDef);
    }

    // Update ref
    range.e.c++;
    updated['!ref'] = XLSX.utils.encode_range(range);

    saveWorksheetState(updated, `Clerk inserted a new column at index ${XLSX.utils.encode_col(targetIdx)}`);
    setSelectedColIdx(null);
  };

  const handleDeleteColumn = () => {
    const targetIdx = selectedColIdx !== null ? selectedColIdx : maxCol;
    if (targetIdx < 3) {
      alert("Protected identity columns (Roll, G.R., Name) cannot be deleted.");
      return;
    }
    const updated = { ...sheet };
    const range = XLSX.utils.decode_range(updated['!ref']);
    const endRow = range.e.r;
    const endCol = range.e.c;

    // Delete target column cells
    for (let r = 0; r <= endRow; r++) {
      const ref = XLSX.utils.encode_cell({ r, c: targetIdx });
      delete updated[ref];
    }

    // Shift columns left
    for (let c = targetIdx + 1; c <= endCol; c++) {
      for (let r = 0; r <= endRow; r++) {
        const fromRef = XLSX.utils.encode_cell({ r, c });
        const toRef = XLSX.utils.encode_cell({ r, c: c - 1 });
        if (updated[fromRef]) {
          updated[toRef] = updated[fromRef];
          delete updated[fromRef];
        } else {
          delete updated[toRef];
        }
      }
    }

    // Adjust merges
    if (updated['!merges']) {
      updated['!merges'] = updated['!merges']
        .map((merge: any) => {
          let s_c = merge.s.c;
          let e_c = merge.e.c;
          if (s_c > targetIdx) s_c--;
          if (e_c >= targetIdx) e_c--;
          return { s: { r: merge.s.r, c: s_c }, e: { r: merge.e.r, c: e_c } };
        })
        .filter((merge: any) => merge.e.c >= merge.s.c);
    }

    // Adjust width list
    if (updated['!cols']) {
      updated['!cols'].splice(targetIdx, 1);
    }

    // Update range
    range.e.c--;
    updated['!ref'] = XLSX.utils.encode_range(range);

    saveWorksheetState(updated, `Clerk deleted column index ${XLSX.utils.encode_col(targetIdx)}`);
    setSelectedColIdx(null);
  };

  // Cell styles styling quick presets
  const applySelectionStyle = (fontProp: string, value: any) => {
    if (!selectedCell) {
      alert("Please select a cell first to apply styles.");
      return;
    }
    const updated = { ...sheet };
    const cellRef = XLSX.utils.encode_cell({ r: selectedCell.r, c: selectedCell.c });
    let cell = updated[cellRef];
    if (!cell) {
      cell = { t: 's', v: '' };
      updated[cellRef] = cell;
    }
    if (!cell.s) cell.s = {};
    if (!cell.s.font) cell.s.font = {};
    if (!cell.s.alignment) cell.s.alignment = {};
    if (!cell.s.fill) cell.s.fill = {};

    if (fontProp === 'bold') {
      cell.s.font.bold = !cell.s.font.bold;
    } else if (fontProp === 'italic') {
      cell.s.font.italic = !cell.s.font.italic;
    } else if (fontProp === 'align') {
      cell.s.alignment.horizontal = value;
    } else if (fontProp === 'fill') {
      cell.s.fill.fgColor = { rgb: value };
    }

    saveWorksheetState(updated, `Applied direct font styling ${fontProp}=${value} to cell ${cellRef}`);
  };

  // Download official ledger file using styled ExcelJS
  const handleDownloadExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('book');

      // 1. Column Widths
      const cols = sheet['!cols'] || [];
      for (let c = 0; c < cols.length; c++) {
        const col = worksheet.getColumn(c + 1);
        if (cols[c]?.wpx) {
          col.width = cols[c].wpx / 7.2; // Convert pixel width to character width accurately
        } else {
          col.width = 12; // default
        }
      }

      // 2. Row Heights
      const rows = sheet['!rows'] || [];
      const numRows = Math.max(35, rows.length);
      for (let r = 0; r < numRows; r++) {
        const row = worksheet.getRow(r + 1);
        if (rows[r]?.hpx) {
          row.height = rows[r].hpx * 0.75; // Convert px to pt
        } else {
          row.height = 20; // default
        }
      }

      // 3. Populate Cells and Styling
      const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:K35');
      const startRow = range.s.r;
      const endRow = range.e.r;
      const startCol = range.s.c;
      const endCol = range.e.c;

      for (let r = startRow; r <= endRow; r++) {
        const row = worksheet.getRow(r + 1);
        for (let c = startCol; c <= endCol; c++) {
          const cellRef = XLSX.utils.encode_cell({ r, c });
          const cell = sheet[cellRef];
          const excelCell = row.getCell(c + 1);

          if (cell) {
            if (cell.f) {
              excelCell.value = { formula: cell.f, result: cell.v };
            } else {
              excelCell.value = cell.v;
            }
          }

          // Apply clean cell border for all cells in sheet
          excelCell.border = {
            top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
          };

          // Alignment
          excelCell.alignment = {
            vertical: 'middle',
            horizontal: 'center',
            wrapText: true
          };

          // Fonts
          excelCell.font = {
            name: 'Arial',
            size: 10,
            color: { argb: 'FF1E293B' },
            bold: false
          };

          // Style metadata mapping
          if (cell?.s) {
            if (cell.s.font) {
              excelCell.font = {
                name: 'Arial',
                size: cell.s.font.sz || 10,
                bold: !!cell.s.font.bold,
                italic: !!cell.s.font.italic,
                color: cell.s.font.color?.rgb ? { argb: 'FF' + cell.s.font.color.rgb.toUpperCase() } : { argb: 'FF1E293B' }
              };
            }

            if (cell.s.alignment?.horizontal) {
              excelCell.alignment = {
                vertical: 'middle',
                horizontal: cell.s.alignment.horizontal as any,
                wrapText: true
              };
            }

            if (cell.s.fill?.fgColor?.rgb) {
              excelCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF' + cell.s.fill.fgColor.rgb.toUpperCase() }
              };
            }
          } else {
            // Apply fallback backgrounds mapping to matches on-screen
            if (r < 3) {
              excelCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF8FAFC' }
              };
              excelCell.font.bold = true;
            } else if (r === 3 || r === 9) {
              excelCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF1F5F9' }
              };
              excelCell.font.bold = true;
            } else if (cell?.f) {
              excelCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF0FDF4' }
              };
              excelCell.font.bold = true;
            }
          }
        }
      }

      // 4. Merged Cells mapping
      const merges = sheet['!merges'] || [];
      merges.forEach((m: any) => {
        worksheet.mergeCells(m.s.r + 1, m.s.c + 1, m.e.r + 1, m.e.c + 1);
      });

      // 5. Page Layout Centering & Custom Size Setup
      worksheet.pageSetup = {
        paperSize: 5, // LEGAL
        orientation: 'portrait',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0, // automatic vertical fitting
        horizontalCentered: true,
        verticalCentered: false, // aligned at top
        margins: {
          left: 0.4,
          right: 0.4,
          top: 0.4,
          bottom: 0.4,
          header: 0.3,
          footer: 0.3
        },
        printArea: `A1:K${endRow + 1}`
      };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, "Master_Result_Book_Preserved.xlsx");

      LocalERPDatabase.addAuditLog(
        user.id,
        user.name,
        user.role,
        "DOWNLOAD_MASTER_RESULT_BOOK",
        "Result Management",
        "Clerk exported the permanent Master Result Book worksheet."
      );
    } catch (err: any) {
      console.error("Error creating styled Excel file:", err);
      alert(`Error generating styled Excel: ${err.message || err}`);
    }
  };

  // Download high-resolution Legal PDF with oklch translation proxy
  const handleDownloadPDF = async () => {
    const element = document.getElementById('master-result-book-print-area');
    if (!element) {
      alert("Print area element not found");
      return;
    }

    setIsExportingPdf(true);

    try {
      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')).default;

      setTimeout(() => {
        const originalWinGetComputedStyle = window.getComputedStyle;
        
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

        const opt = {
          margin:       [0.4, 0.4, 0.4, 0.4] as [number, number, number, number], // Narrow margins
          filename:     'Master_Result_Book_Preserved.pdf',
          image:        { type: 'jpeg' as const, quality: 0.98 },
          html2canvas:  { 
            scale: 2.5, // Ultra-sharp DPI rendering
            useCORS: true,
            onclone: (clonedDoc: Document) => {
              // Translate style sheets
              clonedDoc.querySelectorAll('style').forEach((styleEl) => {
                if (styleEl.textContent) {
                  styleEl.textContent = replaceOklchWithRgb(styleEl.textContent);
                }
              });
              
              // Translate inline attributes
              clonedDoc.querySelectorAll('[style]').forEach((el: any) => {
                const styleAttr = el.getAttribute('style');
                if (styleAttr && (styleAttr.includes('oklch') || styleAttr.includes('oklab'))) {
                  el.setAttribute('style', replaceOklchWithRgb(styleAttr));
                }
              });

              // Adjust cloned print-scroll-container
              const printScroll = clonedDoc.querySelector('.print-scroll-container');
              if (printScroll) {
                printScroll.setAttribute('style', 'overflow: visible !important; max-height: none !important; height: auto !important; border: none !important; box-shadow: none !important; margin: 0 auto !important;');
              }

              // Scale to fit exactly one Legal Page width nicely
              const printZoom = clonedDoc.querySelector('.print-zoom-container');
              if (printZoom) {
                printZoom.setAttribute('style', 'zoom: 77% !important; transform-origin: top center !important; width: 100% !important; margin: 0 auto !important;');
              }
            }
          },
          jsPDF:        { unit: 'in', format: 'legal', orientation: 'portrait' as const }
        };

        html2pdf().set(opt).from(element).save().then(() => {
          setIsExportingPdf(false);
          window.getComputedStyle = originalWinGetComputedStyle;

          LocalERPDatabase.addAuditLog(
            user.id,
            user.name,
            user.role,
            "DOWNLOAD_MASTER_RESULT_BOOK_PDF",
            "Result Management",
            "Clerk exported the permanent Master Result Book as PDF (Legal Portrait)."
          );
        }).catch((err: any) => {
          console.error("PDF Export error:", err);
          setIsExportingPdf(false);
          window.getComputedStyle = originalWinGetComputedStyle;
        });
      }, 500);
    } catch (err) {
      console.error("Failed to load html2pdf.js dynamically:", err);
      setIsExportingPdf(false);
    }
  };

  // Replace / Import official worksheet named 'book'
  const handleReplaceStructure = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset the target value to allow re-uploading the same file
    e.target.value = '';

    setUploading(true);
    setUploadSuccess(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { 
          type: 'array', 
          cellFormula: true, 
          cellStyles: true, 
          cellNF: true 
        });

        // Search for a sheet named 'book' (case-insensitive)
        const sheetName = workbook.SheetNames.find(name => name.toLowerCase() === 'book') || workbook.SheetNames[0];
        const uploadedSheet = workbook.Sheets[sheetName];

        if (!uploadedSheet || !uploadedSheet['!ref']) {
          throw new Error("Invalid or empty sheet range.");
        }

        // Clone cells and sheet setups to keep clean serializable objects
        const cleanSheet: any = {};
        for (const key of Object.keys(uploadedSheet)) {
          if (key.startsWith('!')) {
            cleanSheet[key] = JSON.parse(JSON.stringify(uploadedSheet[key]));
          } else {
            const cell = uploadedSheet[key];
            if (cell) {
              cleanSheet[key] = {
                t: cell.t,
                v: cell.v !== undefined ? cell.v : '',
                f: cell.f || undefined,
                w: cell.w || undefined,
                s: cell.s ? JSON.parse(JSON.stringify(cell.s)) : undefined
              };
            }
          }
        }

        // Apply page default setup if missing
        if (!cleanSheet["!pageSetup"]) {
          cleanSheet["!pageSetup"] = {
            orientation: "Landscape",
            pageSize: "A4",
            margins: "Narrow",
            printArea: "A:N"
          };
        }

        setSheet(cleanSheet);
        localStorage.setItem('erp_master_result_book_sheet', JSON.stringify(cleanSheet));

        // Create Backup Version
        const now = new Date();
        const newBackup = {
          timestamp: `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`,
          editorName: user.name,
          sheet: cleanSheet
        };
        const updatedBackups = [newBackup, ...backups].slice(0, 10);
        localStorage.setItem('erp_master_result_book_sheet_backups', JSON.stringify(updatedBackups));
        setBackups(updatedBackups);

        // Reset Selection States
        setSelectedCell(null);
        setSelectedColIdx(null);
        setSelectedRowIdx(null);

        LocalERPDatabase.addAuditLog(
          user.id,
          user.name,
          user.role,
          "REPLACE_MASTER_RESULT_BOOK_TEMPLATE",
          "Result Management",
          `Clerk uploaded official Result Book worksheet (${file.name}, Sheet: ${sheetName}) successfully replacing layout.`
        );

        setUploading(false);
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 5000);

      } catch (err: any) {
        console.error("Error reading spreadsheet layout:", err);
        setUploading(false);
        alert(`Error importing spreadsheet layout: ${err.message || err}`);
      }
    };

    reader.onerror = (err) => {
      console.error("File reader error:", err);
      setUploading(false);
      alert("Failed to read the file.");
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6 text-left relative">
      
      {/* 1. EDITOR HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <span className="text-[10px] bg-slate-900 text-white font-mono font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
            {isUrdu ? "سرکاری ماسٹر رزلٹ بک" : "Official Master Result Book"}
          </span>
          <span className={`ml-2 text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-wider ${cloudSyncStatus==='saved'?'bg-emerald-100 text-emerald-800':cloudSyncStatus==='local'?'bg-amber-100 text-amber-800':'bg-slate-100 text-slate-600'}`}>
            {cloudSyncStatus==='saved'?'Cloud Master':cloudSyncStatus==='local'?'Compatibility Cache':'Loading Cloud'}
          </span>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight font-sans">
            {isUrdu ? "لیجر اور ٹیمپلیٹ ایڈیٹر" : "Excel Preserved Template Editor"}
          </h1>
          <p className="text-xs text-slate-500 leading-normal font-sans">
            {isUrdu 
              ? "تفصیلی کالمز، فارمولا رولز، اور پرنٹ سیٹ اپس کے ساتھ تعلیمی نتائج کا مستند نظام۔" 
              : "Directly view, edit, and preserve original Excel structures, formula cells, borders, spacing, merges, and paper print boundaries."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Class Selector Dropdown */}
          <div className="flex items-center gap-2 bg-slate-100 border border-slate-300 rounded-xl px-3 py-1.5 font-sans">
            <span className="text-xs font-bold text-slate-700">Class:</span>
            <select
              value={selectedClass}
              onChange={(e) => {
                const newClass = e.target.value;
                setSelectedClass(newClass);
                const fresh = generateDefaultWorksheet(newClass);
                setSheet(fresh);
                localStorage.setItem('erp_master_result_book_sheet', JSON.stringify(fresh));
                LocalERPDatabase.addAuditLog(
                  user.id,
                  user.name,
                  user.role,
                  "GENERATE_MASTER_RESULT_BOOK",
                  "Result Management",
                  `Generated Master Mark List for ${newClass} with class weightage rule.`
                );
              }}
              className="bg-white border border-slate-300 text-slate-800 font-extrabold text-xs rounded-lg px-2 py-1 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
            >
              <option value="Class 1 - A">Class 1 - A (Formative 70 / Summative 30)</option>
              <option value="Class 2 - A">Class 2 - A (Formative 70 / Summative 30)</option>
              <option value="Class 3 - A">Class 3 - A (Formative 60 / Summative 40)</option>
              <option value="Class 4 - A">Class 4 - A (Formative 60 / Summative 40)</option>
              <option value="Class 5 - A">Class 5 - A (Formative 50 / Summative 50)</option>
              <option value="Class 6 - A">Class 6 - A (Formative 50 / Summative 50)</option>
              <option value="Class 7 - A">Class 7 - A (Formative 40 / Summative 60)</option>
              <option value="Class 8 - A">Class 8 - A (Formative 40 / Summative 60)</option>
            </select>
          </div>

          {/* Quick Download Excel */}
          <button
            onClick={handleDownloadExcel}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer font-sans"
            title="Download Active Excel Worksheet"
          >
            <Download className="w-4 h-4" />
            <span>{isUrdu ? "ایکسل فائل ڈاؤن لوڈ کریں" : "Export Excel (.xlsx)"}</span>
          </button>

          {/* Download PDF */}
          <button
            onClick={() => setShowPrintEngine(true)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer font-sans"
            title="Download Result Book as PDF"
          >
            <FileText className="w-4 h-4" />
            <span>{isUrdu ? "پی ڈی ایف ڈاؤن لوڈ کریں" : "Download PDF (.pdf)"}</span>
          </button>

          {/* Print Sheet */}
          <button
            onClick={() => setShowPrintEngine(true)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-extrabold text-xs rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer font-sans"
            title="Print Official Ledger (A4/Legal)"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>{isUrdu ? "پرنٹ لے آؤٹ" : "Print Ledger"}</span>
          </button>

          {/* Quick Save button to preserve changes */}
          <button
            onClick={() => {
              setSaveSuccess(true);
              setTimeout(() => setSaveSuccess(false), 3000);
              LocalERPDatabase.addAuditLog(
                user.id,
                user.name,
                user.role,
                "SAVE_MASTER_RESULT_BOOK_TEMPLATE",
                "Result Management",
                "Manually triggered save snapshot of consolidated ledger."
              );
            }}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer font-sans"
          >
            <Save className="w-4 h-4" />
            <span>{isUrdu ? "سیو ٹیمپلیٹ" : "Save Sheet"}</span>
          </button>
        </div>
      </div>

      {/* Save indicators */}
      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-sans flex items-center gap-2 animate-pulse">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-bold">Worksheet changes successfully persisted to National School ERP. Future result books will mirror this format.</span>
        </div>
      )}

      {/* 2. EXCEL OFFICE RIBBON TAB SYSTEM */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
        {/* Tab Headers */}
        <div className="flex border-b border-slate-200 gap-1 overflow-x-auto">
          {[
            { id: 'home', label: 'Home (Formatting)' },
            { id: 'layout', label: 'Layout & Structure' },
            { id: 'page', label: 'Page Print Setup' },
            { id: 'formulas', label: 'Formulas Engine' },
            { id: 'backups', label: 'Backup Restore' },
            { id: 'actions', label: 'Actions & Reset' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveRibbonTab(tab.id as any)}
              className={`px-4 py-2 font-black text-xs transition-all border-t-2 border-transparent cursor-pointer rounded-t-lg font-sans ${activeRibbonTab === tab.id ? 'bg-white border-t-indigo-600 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content panel */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-inner min-h-[70px] flex items-center">
          
          {/* TAB 1: HOME (Formatting) */}
          {activeRibbonTab === 'home' && (
            <div className="flex flex-wrap items-center gap-6">
              
              {/* Zoom Controls */}
              <div className="space-y-1 font-sans">
                <span className="text-[10px] text-slate-400 block font-mono font-bold uppercase">Worksheet Zoom</span>
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-300 rounded-lg p-1">
                  <button
                    onClick={() => setZoom(Math.max(50, zoom - 10))}
                    className="p-1 hover:bg-slate-200 text-slate-600 rounded cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-mono font-black text-slate-700 min-w-[48px] text-center">
                    {zoom}%
                  </span>
                  <button
                    onClick={() => setZoom(Math.min(150, zoom + 10))}
                    className="p-1 hover:bg-slate-200 text-slate-600 rounded cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setZoom(100)}
                    className="text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-1.5 py-0.5 rounded cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Bold / Italic Toggles */}
              <div className="space-y-1 font-sans">
                <span className="text-[10px] text-slate-400 block font-mono font-bold uppercase">Cell Typography</span>
                <div className="flex border border-slate-300 rounded overflow-hidden">
                  <button
                    disabled={!selectedCell}
                    onClick={() => applySelectionStyle('bold', null)}
                    className={`px-3 py-1.5 transition-all text-xs font-bold disabled:opacity-40 cursor-pointer bg-slate-50 hover:bg-slate-100 border-r border-slate-200 flex items-center gap-1`}
                    title="Toggle Bold"
                  >
                    <Bold className="w-3.5 h-3.5" />
                    <span>Bold</span>
                  </button>
                  <button
                    disabled={!selectedCell}
                    onClick={() => applySelectionStyle('italic', null)}
                    className={`px-3 py-1.5 transition-all text-xs font-serif italic disabled:opacity-40 cursor-pointer bg-slate-50 hover:bg-slate-100 flex items-center gap-1`}
                    title="Toggle Italic"
                  >
                    <span className="font-bold">I</span>
                    <span>Italic</span>
                  </button>
                </div>
              </div>

              {/* Alignments */}
              <div className="space-y-1 font-sans">
                <span className="text-[10px] text-slate-400 block font-mono font-bold uppercase">Text Align</span>
                <div className="flex border border-slate-300 rounded overflow-hidden">
                  <button
                    disabled={!selectedCell}
                    onClick={() => applySelectionStyle('align', 'left')}
                    className="p-1.5 hover:bg-slate-100 border-r border-slate-200 disabled:opacity-40 cursor-pointer"
                    title="Align Left"
                  >
                    <AlignLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={!selectedCell}
                    onClick={() => applySelectionStyle('align', 'center')}
                    className="p-1.5 hover:bg-slate-100 border-r border-slate-200 disabled:opacity-40 cursor-pointer"
                    title="Align Center"
                  >
                    <AlignCenter className="w-4 h-4" />
                  </button>
                  <button
                    disabled={!selectedCell}
                    onClick={() => applySelectionStyle('align', 'right')}
                    className="p-1.5 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                    title="Align Right"
                  >
                    <AlignRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Cell Fill Preset */}
              <div className="space-y-1 font-sans">
                <span className="text-[10px] text-slate-400 block font-mono font-bold uppercase">Cell Fill Background</span>
                <div className="flex items-center gap-1.5">
                  {[
                    { name: 'None', rgb: '' },
                    { name: 'Light Gray', rgb: 'f1f5f9' },
                    { name: 'Light Emerald', rgb: 'ecfdf5' },
                    { name: 'Light Sky', rgb: 'f0f9ff' },
                    { name: 'Light Amber', rgb: 'fef3c7' }
                  ].map((color) => (
                    <button type="button"
                      key={color.name}
                      disabled={!selectedCell}
                      onClick={() => applySelectionStyle('fill', color.rgb)}
                      className={`w-5 h-5 rounded-full cursor-pointer hover:scale-110 transition-all shrink-0 border border-slate-300 disabled:opacity-30 disabled:hover:scale-100`}
                      style={{ backgroundColor: color.rgb ? `#${color.rgb}` : '#ffffff' }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Quick Clear Cell */}
              <div className="space-y-1 font-sans">
                <span className="text-[10px] text-slate-400 block font-mono font-bold uppercase">Clear Cell</span>
                <button
                  disabled={!selectedCell}
                  onClick={() => {
                    if (selectedCell) {
                      const updated = { ...sheet };
                      const ref = XLSX.utils.encode_cell({ r: selectedCell.r, c: selectedCell.c });
                      delete updated[ref];
                      saveWorksheetState(updated, `Cleared content of cell ${ref}`);
                    }
                  }}
                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-150 text-rose-700 border border-rose-200 rounded-lg font-bold text-xs cursor-pointer flex items-center gap-1 disabled:opacity-40"
                  title="Wipe Cell Value & Formula"
                >
                  <Eraser className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              </div>

            </div>
          )}

          {/* TAB 2: LAYOUT & STRUCTURE */}
          {activeRibbonTab === 'layout' && (
            <div className="flex flex-wrap items-center gap-6">
              
              {/* Insert / Delete Rows */}
              <div className="space-y-1 font-sans">
                <span className="text-[10px] text-slate-400 block font-mono font-bold uppercase">Rows Modification</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={handleInsertRow}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-extrabold rounded-lg text-xs cursor-pointer flex items-center gap-1"
                    title="Insert Row at selected position"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Insert Row</span>
                  </button>
                  <button type="button"
                    onClick={handleDeleteRow}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold rounded-lg text-xs cursor-pointer flex items-center gap-1"
                    title="Delete Row at selected position"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Row</span>
                  </button>
                </div>
              </div>

              {/* Insert / Delete Columns */}
              <div className="space-y-1 font-sans">
                <span className="text-[10px] text-slate-400 block font-mono font-bold uppercase">Columns Modification</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={handleInsertColumn}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-extrabold rounded-lg text-xs cursor-pointer flex items-center gap-1"
                    title="Insert Column at selected position"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Insert Column</span>
                  </button>
                  <button type="button"
                    onClick={handleDeleteColumn}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold rounded-lg text-xs cursor-pointer flex items-center gap-1"
                    title="Delete Column at selected position"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Column</span>
                  </button>
                </div>
              </div>

              {/* Row Height Adjuster */}
              <div className="space-y-1 font-sans">
                <span className="text-[10px] text-slate-400 block font-mono font-bold uppercase">Row Height</span>
                {activeRow !== null ? (
                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-300 rounded-lg p-1.5 h-9">
                    <span className="text-xs font-bold text-slate-700 font-mono pr-1.5 border-r border-slate-200">
                      Row {activeRow + 1}: {getRowHeightPx(activeRow)}px
                    </span>
                    <button
                      onClick={() => resizeRowHeight(activeRow, Math.max(10, getRowHeightPx(activeRow) - 4))}
                      className="w-6 h-6 flex items-center justify-center hover:bg-slate-200 text-slate-700 bg-white border border-slate-200 rounded font-black cursor-pointer text-xs transition-all"
                      title="Decrease Row Height"
                    >
                      -
                    </button>
                    <button
                      onClick={() => resizeRowHeight(activeRow, getRowHeightPx(activeRow) + 4)}
                      className="w-6 h-6 flex items-center justify-center hover:bg-slate-200 text-slate-700 bg-white border border-slate-200 rounded font-black cursor-pointer text-xs transition-all"
                      title="Increase Row Height"
                    >
                      +
                    </button>
                    <button
                      onClick={() => {
                        const cur = getRowHeightPx(activeRow);
                        const val = prompt(`Enter custom height in pixels for Row ${activeRow + 1}:`, String(cur));
                        if (val !== null) {
                          const num = parseInt(val, 10);
                          if (!isNaN(num) && num >= 10) {
                            resizeRowHeight(activeRow, num);
                          } else {
                            alert("Please enter a valid height (minimum 10px).");
                          }
                        }
                      }}
                      className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 rounded text-[10px] cursor-pointer transition-all ml-1"
                      title="Set custom height"
                    >
                      Set Custom
                    </button>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400 italic bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 h-9 flex items-center">
                    Select any cell/row first
                  </div>
                )}
              </div>

              {/* Column Width Adjuster */}
              <div className="space-y-1 font-sans">
                <span className="text-[10px] text-slate-400 block font-mono font-bold uppercase">Column Width</span>
                {activeCol !== null ? (
                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-300 rounded-lg p-1.5 h-9">
                    <span className="text-xs font-bold text-slate-700 font-mono pr-1.5 border-r border-slate-200">
                      Col {XLSX.utils.encode_col(activeCol)}: {getColWidthPx(activeCol)}px
                    </span>
                    <button
                      onClick={() => resizeColumnWidth(activeCol, Math.max(20, getColWidthPx(activeCol) - 10))}
                      className="w-6 h-6 flex items-center justify-center hover:bg-slate-200 text-slate-700 bg-white border border-slate-200 rounded font-black cursor-pointer text-xs transition-all"
                      title="Decrease Column Width"
                    >
                      -
                    </button>
                    <button
                      onClick={() => resizeColumnWidth(activeCol, getColWidthPx(activeCol) + 10)}
                      className="w-6 h-6 flex items-center justify-center hover:bg-slate-200 text-slate-700 bg-white border border-slate-200 rounded font-black cursor-pointer text-xs transition-all"
                      title="Increase Column Width"
                    >
                      +
                    </button>
                    <button
                      onClick={() => {
                        const cur = getColWidthPx(activeCol);
                        const val = prompt(`Enter custom width in pixels for Column ${XLSX.utils.encode_col(activeCol)}:`, String(cur));
                        if (val !== null) {
                          const num = parseInt(val, 10);
                          if (!isNaN(num) && num >= 20) {
                            resizeColumnWidth(activeCol, num);
                          } else {
                            alert("Please enter a valid width (minimum 20px).");
                          }
                        }
                      }}
                      className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 rounded text-[10px] cursor-pointer transition-all ml-1"
                      title="Set custom width"
                    >
                      Set Custom
                    </button>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400 italic bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 h-9 flex items-center">
                    Select any cell/column first
                  </div>
                )}
              </div>

              {/* Selection Status indicator */}
              <div className="space-y-1 font-sans text-xs">
                <span className="text-[10px] text-slate-400 block font-mono font-bold uppercase">Active Selection Focus</span>
                <div className="text-slate-600 bg-slate-100 border border-slate-200 p-1.5 rounded-lg font-mono font-bold">
                  {selectedCell ? `Cell: ${XLSX.utils.encode_cell({ r: selectedCell.r, c: selectedCell.c })}` : 
                   selectedColIdx !== null ? `Column: ${XLSX.utils.encode_col(selectedColIdx)}` :
                   selectedRowIdx !== null ? `Row: ${selectedRowIdx + 1}` : "No active focus"}
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: PAGE PRINT LAYOUT */}
          {activeRibbonTab === 'page' && (
            <div className="flex flex-wrap items-center gap-6">
              
              {/* Sheet Orientation */}
              <div className="space-y-1 font-sans">
                <span className="text-[10px] text-slate-400 block font-mono font-bold uppercase">Orientation</span>
                <div className="flex border border-slate-300 rounded overflow-hidden">
                  {['Portrait', 'Landscape'].map((orient) => (
                    <button
                      key={orient}
                      onClick={() => {
                        const updated = { ...sheet };
                        if (!updated['!pageSetup']) updated['!pageSetup'] = {};
                        updated['!pageSetup'].orientation = orient;
                        saveWorksheetState(updated, `Set print orientation to ${orient}`);
                      }}
                      className={`px-3 py-1.5 font-bold text-xs cursor-pointer transition-all ${sheet['!pageSetup']?.orientation === orient ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                    >
                      {orient}
                    </button>
                  ))}
                </div>
              </div>

              {/* Margins */}
              <div className="space-y-1 font-sans">
                <span className="text-[10px] text-slate-400 block font-mono font-bold uppercase">Margins</span>
                <div className="flex border border-slate-300 rounded overflow-hidden">
                  {['Normal', 'Narrow', 'Wide'].map((margin) => (
                    <button
                      key={margin}
                      onClick={() => {
                        const updated = { ...sheet };
                        if (!updated['!pageSetup']) updated['!pageSetup'] = {};
                        updated['!pageSetup'].margins = margin;
                        saveWorksheetState(updated, `Set margin standard to ${margin}`);
                      }}
                      className={`px-3 py-1.5 font-bold text-xs cursor-pointer transition-all ${sheet['!pageSetup']?.margins === margin ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                    >
                      {margin}
                    </button>
                  ))}
                </div>
              </div>

              {/* Print Boundary bounds */}
              <div className="space-y-1 font-sans">
                <span className="text-[10px] text-slate-400 block font-mono font-bold uppercase">Print Columns range</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={sheet['!pageSetup']?.printArea || 'A:N'}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      const updated = { ...sheet };
                      if (!updated['!pageSetup']) updated['!pageSetup'] = {};
                      updated['!pageSetup'].printArea = val;
                      setSheet(updated);
                      localStorage.setItem('erp_master_result_book_sheet', JSON.stringify(updated));
                    }}
                    className="w-24 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-slate-800 text-center uppercase"
                  />
                  <span className="text-slate-400 text-[10px] italic">e.g. A:K (limits printable area)</span>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: FORMULAS ENGINE */}
          {activeRibbonTab === 'formulas' && (
            <div className="w-full space-y-2 font-sans text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 block font-mono font-bold uppercase">Official Spreadsheet Formulas Reference</span>
                <button
                  onClick={() => setShowFormulaHelper(!showFormulaHelper)}
                  className="text-[10px] text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded font-black cursor-pointer hover:bg-indigo-100 transition-all font-sans"
                >
                  {showFormulaHelper ? "Hide Guides" : "Show Formula Helper Guides"}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-slate-500 font-medium">Quick formula insertions:</span>
                <button
                  disabled={!selectedCell}
                  onClick={() => {
                    if (selectedCell) {
                      const rowRef = selectedCell.r + 1;
                      submitCellEdit(selectedCell.r, selectedCell.c, `=SUM(D${rowRef}:I${rowRef})`);
                    }
                  }}
                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold font-mono rounded cursor-pointer"
                >
                  =SUM(...)
                </button>
                <button
                  disabled={!selectedCell}
                  onClick={() => {
                    if (selectedCell) {
                      const rowRef = selectedCell.r + 1;
                      submitCellEdit(selectedCell.r, selectedCell.c, `=ROUND((J${rowRef}/600)*100,2)`);
                    }
                  }}
                  className="px-2 py-1 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 font-bold font-mono rounded cursor-pointer"
                >
                  =ROUND(...)
                </button>
                <button
                  disabled={!selectedCell}
                  onClick={() => {
                    if (selectedCell) {
                      const rowRef = selectedCell.r + 1;
                      submitCellEdit(selectedCell.r, selectedCell.c, `=IF(K${rowRef}>=35,"PASSED","FAILED")`);
                    }
                  }}
                  className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold font-mono rounded cursor-pointer"
                >
                  =IF(...)
                </button>
              </div>

              {showFormulaHelper && (
                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl space-y-1.5 text-[11px] text-indigo-800 leading-relaxed font-sans">
                  <span className="font-extrabold block">Preserved Sheet Formulas Guide:</span>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li><strong className="font-bold">=SUM(D5:I5)</strong>: Calculates sum of subject score column fields.</li>
                    <li><strong className="font-bold">=ROUND((J5/600)*100,2)</strong>: Calculates percentage with two decimal points on on-the-fly.</li>
                    <li><strong className="font-bold">=IF(K5&gt;=35,"PASSED","FAILED")</strong>: Resolves promotion statuses based on passing constraints.</li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: BACKUPS SNAPSHOTS */}
          {activeRibbonTab === 'backups' && (
            <div className="w-full space-y-2 font-sans text-xs">
              <span className="text-[10px] text-slate-400 block font-mono font-bold uppercase">Restore to historical workbook snapshots</span>
              
              {!backups.length ? (
                <div className="p-2.5 text-slate-400 italic bg-slate-50 rounded-lg text-center border">
                  No backups found yet. Every cell edit creates a restorable snapshot in history.
                </div>
              ) : (
                <div className="max-h-[140px] overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white shadow-inner">
                  {backups.map((bk, idx) => (
                    <div key={idx} className="p-2 flex items-center justify-between hover:bg-slate-50 transition-all text-xs">
                      <div className="space-y-0.5">
                        <span className="font-extrabold text-slate-700 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400 animate-pulse" />
                          Snapshot Version {backups.length - idx}
                        </span>
                        <p className="text-[10px] text-slate-500 font-mono">
                          Saved at: {bk.timestamp} | By Editor: {bk.editorName}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setSheet(bk.sheet);
                          localStorage.setItem('erp_master_result_book_sheet', JSON.stringify(bk.sheet));
                          setSelectedCell(null);
                          setSelectedColIdx(null);
                          setSelectedRowIdx(null);
                          alert("Worksheet restored successfully to version " + (backups.length - idx));
                        }}
                        className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-extrabold rounded transition-all cursor-pointer"
                      >
                        Restore Version
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* TAB 6: ACTIONS & RESET */}
          {activeRibbonTab === 'actions' && (
            <div className="w-full space-y-3 font-sans text-xs">
              <span className="text-[10px] text-slate-400 block font-mono font-bold uppercase">Administrative Operations</span>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-rose-50 border border-rose-100 rounded-xl">
                <div className="space-y-1">
                  <span className="text-xs font-black text-rose-800 uppercase tracking-wide block">Reset Master Template To Clean Slate</span>
                  <p className="text-[11px] text-rose-700 leading-relaxed">
                    Wipes out all exam mark records, formative scores, summative scores, totals, percentages, grades, and statuses from the master template to prepare a clean slate for the next term or evaluation.
                  </p>
                </div>
                <button type="button"
                  onClick={() => {
                    setShowResetConfirmation(true);
                    setResetSuccess(false);
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs tracking-wider uppercase rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Reset Template</span>
                </button>
              </div>

              {resetSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-sans flex items-center gap-2">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-extrabold block">RESET SUCCESSFUL</span>
                    <p className="text-[10px] text-emerald-700 mt-0.5">
                      All example marks have been wiped. Subjects, layout, styles, print setups, and formulas have been successfully preserved.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* 3. CONSOLIDATED EXCEL FORMULA BAR */}
      <div className="bg-slate-100 border border-slate-200 rounded-xl flex items-center px-3 py-2 text-xs font-mono shadow-sm">
        <span className="text-emerald-700 font-black tracking-tight select-none mr-2">fx</span>
        <div className="w-px h-4 bg-slate-300 mx-2"></div>
        
        {/* Cell index address bubble */}
        <span className="text-slate-500 font-black mr-3 bg-slate-200 px-2 py-0.5 rounded select-none min-w-[42px] text-center">
          {selectedCell ? XLSX.utils.encode_cell({ r: selectedCell.r, c: selectedCell.c }) : 
           selectedColIdx !== null ? `${XLSX.utils.encode_col(selectedColIdx)}:${XLSX.utils.encode_col(selectedColIdx)}` :
           selectedRowIdx !== null ? `${selectedRowIdx + 1}:${selectedRowIdx + 1}` : 'CELL'}
        </span>

        {/* Real-time cell edit input */}
        <FormulaBarInput
          selectedCell={selectedCell}
          initialValue={formulaBarValue}
          onSave={(val) => {
            if (selectedCell) {
              submitCellEdit(selectedCell.r, selectedCell.c, val);
            }
          }}
        />
      </div>

      {/* 4. WORKSPACE GRID VIEW (THREE COLUMNS - SIDEBAR + SPREADSHEET VIEWPORT) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left column: Worksheet Side Parameters */}
        <div className="lg:col-span-1 space-y-4">
          
          {/* Template Info Card */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3.5 text-xs select-none">
            <div className="border-b border-slate-200 pb-2 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600" />
              <span className="font-extrabold text-slate-700 uppercase tracking-wider block font-sans">Workbook Properties</span>
            </div>

            <div className="space-y-2.5 font-sans">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Columns Depth:</span>
                <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">{maxCol - minCol + 1} Columns</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Rows Depth:</span>
                <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">{maxRow - minRow + 1} Rows</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Print Paper Standard:</span>
                <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">{sheet['!pageSetup']?.pageSize || "A4"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Page Margins:</span>
                <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">{sheet['!pageSetup']?.margins || "Narrow"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Print Bounds Area:</span>
                <span className="font-mono font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded uppercase">{sheet['!pageSetup']?.printArea || "A:N"}</span>
              </div>
            </div>
          </div>

          {/* Excel File Import Box (Replace Master Format) */}
          <div className="p-5 rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-500 transition-all bg-white flex flex-col items-center text-center space-y-3 cursor-pointer relative overflow-hidden group">
            <input
              type="file"
              accept=".xls,.xlsx"
              onChange={handleReplaceStructure}
              className="absolute inset-0 opacity-0 cursor-pointer z-10"
            />
            
            {uploading ? (
              <div className="space-y-2 py-4 select-none">
                <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-600 font-sans">Uploading and parsing SheetJS...</p>
              </div>
            ) : (
              <div className="space-y-2 py-2 select-none">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-black text-slate-700 font-sans">Import Excel Workbook</p>
                  <p className="text-[10px] text-slate-400 max-w-[160px] leading-relaxed mx-auto font-sans">
                    Upload official ledger file containing the "book" sheet to replace template.
                  </p>
                </div>
              </div>
            )}
          </div>

          {uploadSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-sans flex items-start gap-2 animate-bounce shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-black">Workbook Imported Successfully!</span>
                <p className="text-[10px] text-emerald-700/90 leading-relaxed font-sans">
                  The original cell formulas, merges, heights, and column widths are preserved exactly.
                </p>
              </div>
            </div>
          )}

          {/* Limitations and Integrity Check box */}
          <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/20 text-xs text-indigo-800 space-y-2 font-sans select-none">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>ERP Preserved Integrity Check</span>
            </div>
            <p className="text-[10.5px] text-indigo-700/95 leading-relaxed font-sans">
              <strong>Active preservation rule</strong>: All cells are read directly from SheetJS representation. Formats, formulas, merges, and column spacing correspond 100% with your Excel workbook without AI redesign. Double-click any cell to edit in-place.
            </p>
          </div>

        </div>

        {/* Right column: The Spreadsheet Interactive Render Canvas */}
        <div className="lg:col-span-3 space-y-4">
          
          <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-center justify-between text-xs font-sans select-none">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-indigo-600" />
              <span className="text-indigo-900 font-extrabold">Active Interactive Spreadsheet Grid</span>
            </div>
            <span className="text-[9px] bg-indigo-100 text-indigo-800 font-mono font-bold px-2 py-0.5 rounded uppercase">
              WYSIWYG Viewer
            </span>
          </div>

          {/* Custom page setup stylesheet injection */}
          <style dangerouslySetInnerHTML={{ __html: `
            @page {
              size: legal portrait;
              margin: 0.4in;
            }
            @media print {
              body {
                background-color: #ffffff !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              header, footer, nav, aside, .no-print, button, .flex-wrap, .lg:col-span-1, .editor-ribbon, .ribbon-tab, .sidebar, .left-pane {
                display: none !important;
                visibility: hidden !important;
              }
              
              /* Ensure all layout containers let print element flow freely */
              #root, body, html, main, .app-container, .workspace-wrapper, .bg-slate-50, .min-h-screen, .flex, .grid, .p-6 {
                background: white !important;
                border: none !important;
                box-shadow: none !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                max-width: none !important;
                height: auto !important;
                overflow: visible !important;
              }

              #master-result-book-print-area {
                position: absolute !important;
                left: 50% !important;
                top: 0 !important;
                transform: translateX(-50%) !important;
                width: 7.7in !important; /* Perfect width for Legal Portrait with 0.4in margins */
                max-width: 7.7in !important;
                margin: 0 auto !important;
                padding: 0 !important;
                border: none !important;
                box-shadow: none !important;
                background: white !important;
                visibility: visible !important;
                overflow: visible !important;
                max-height: none !important;
                display: block !important;
              }

              #master-result-book-print-area * {
                visibility: visible !important;
              }

              .print-scroll-container {
                overflow: visible !important;
                max-height: none !important;
                height: auto !important;
                border: none !important;
                box-shadow: none !important;
                width: 100% !important;
                margin: 0 auto !important;
              }

              .print-zoom-container {
                zoom: 77% !important; /* Scale 960px table width to fit 739px legal portrait width perfectly */
                transform: none !important;
                transform-origin: top center !important;
                width: 100% !important;
                margin: 0 auto !important;
                background: white !important;
              }

              .print-table {
                width: 100% !important;
                table-layout: fixed !important;
                border-collapse: collapse !important;
                background: white !important;
              }

              /* Hide row number and column letters header elements during print for pristine legal presentation */
              .print-table thead, .print-row-num {
                display: none !important;
                width: 0 !important;
                height: 0 !important;
                visibility: hidden !important;
              }

              /* Force full color rendering on all browser printing engines */
              .print-table td, .print-table th {
                border: 1px solid #cbd5e1 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          `}} />

          {/* Scrollable grid container */}
          <div 
            id="master-result-book-print-area"
            className="border border-slate-300 rounded-xl overflow-auto bg-white shadow-sm max-h-[580px] max-w-full relative print-scroll-container"
          >
            <div 
              style={{ zoom: `${zoom}%` }} 
              className="min-w-full print-zoom-container"
            >
              <table className="w-full border-collapse font-sans text-xs select-none table-fixed print-table">
                
                {/* 1. COLUMN INDEX HEADER (A, B, C...) */}
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300">
                    {/* Top-left column label spacer (A0 equivalent) */}
                    <th className="w-11 bg-slate-200 text-slate-500 font-mono text-[9px] text-center border-r border-b border-slate-300 py-1 font-bold sticky left-0 z-20">
                      Row
                    </th>
                    {Array.from({ length: maxCol - minCol + 1 }).map((_, cIdx) => {
                      const colIdx = minCol + cIdx;
                      const colLetter = XLSX.utils.encode_col(colIdx);
                      const isColSelected = selectedColIdx === colIdx;
                      
                      return (
                        <th
                          key={colIdx}
                          style={{ width: getColWidth(colIdx) }}
                          onClick={() => handleColHeaderClick(colIdx)}
                          className={`font-mono text-[10px] text-center font-bold border-r border-slate-300 py-1 cursor-pointer transition-all ${isColSelected ? 'bg-indigo-200 text-indigo-900 font-black' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        >
                          {colLetter}
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                {/* 2. CELL GRID BODY */}
                <tbody>
                  {Array.from({ length: maxRow - minRow + 1 }).map((_, rIdx) => {
                    const rowIdx = minRow + rIdx;
                    const isRowSelected = selectedRowIdx === rowIdx;
                    const rHeight = getRowHeight(rowIdx);

                    return (
                      <tr
                        key={rowIdx}
                        style={{ height: rHeight }}
                        className={`border-b border-slate-200 group ${isRowSelected ? 'bg-indigo-50/20' : ''}`}
                      >
                        {/* Row Index Header Cell */}
                        <td
                          onClick={() => handleRowHeaderClick(rowIdx)}
                          className={`bg-slate-100 text-slate-500 font-mono text-[9.5px] text-center border-r border-slate-300 font-bold cursor-pointer select-none sticky left-0 z-10 hover:bg-slate-200 transition-all print-row-num ${isRowSelected ? 'bg-indigo-200 text-indigo-950' : ''}`}
                        >
                          {rowIdx + 1}
                        </td>

                        {/* Data Cells loop */}
                        {Array.from({ length: maxCol - minCol + 1 }).map((_, cIdx) => {
                          const colIdx = minCol + cIdx;
                          const { isMerged, isTopLeft, rowSpan, colSpan } = getMergeInfo(rowIdx, colIdx);

                          // Skip cell if merged and we are not at top-left
                          if (isMerged && !isTopLeft) return null;

                          const cellRef = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
                          const cell = sheet[cellRef];

                          // Active/Focus selection checks
                          const isCellSelected = selectedCell?.r === rowIdx && selectedCell?.c === colIdx;
                          const isColSelected = selectedColIdx === colIdx;
                          const isRowSelected = selectedRowIdx === rowIdx;
                          const isEditing = editingCell?.r === rowIdx && editingCell?.c === colIdx;

                          // Text values resolver
                          let displayVal = '';
                          if (cell) {
                            if (cell.f) {
                              // If there is formula, display evaluation value if present, else formula expression
                              displayVal = cell.v !== undefined ? String(cell.v) : `=${cell.f}`;
                            } else {
                              displayVal = cell.v !== undefined ? String(cell.v) : '';
                            }
                          }

                          // Layout classification background helper
                          let bgClass = 'bg-white';
                          let textClass = 'text-slate-800';
                          let extraClasses = '';

                          // Check if the cell has explicit formatting
                          const hasExplicitBg = !!cell?.s?.fill?.fgColor?.rgb;
                          const hasExplicitFont = !!cell?.s?.font?.bold;
                          const hasExplicitAlign = !!cell?.s?.alignment?.horizontal;

                          if (!hasExplicitBg) {
                            if (rowIdx < 3) {
                              bgClass = 'bg-slate-50';
                            } else if (rowIdx === 3 || rowIdx === 9) {
                              bgClass = 'bg-slate-100';
                            } else if (cell?.f) {
                              bgClass = 'bg-emerald-50/10';
                            }
                          }

                          if (!hasExplicitFont) {
                            if (rowIdx < 3) {
                              extraClasses += ' font-bold';
                            } else if (rowIdx === 3 || rowIdx === 9) {
                              extraClasses += ' font-black';
                            } else if (cell?.f) {
                              extraClasses += ' font-bold';
                            }
                          }

                          if (!hasExplicitAlign) {
                            if (rowIdx < 3 || rowIdx === 3 || rowIdx === 9) {
                              extraClasses += ' text-center';
                            }
                          }

                          const finalStyle = getCellStyle(rowIdx, colIdx, cell);

                          return (
                            <td
                              key={colIdx}
                              rowSpan={isMerged ? rowSpan : undefined}
                              colSpan={isMerged ? colSpan : undefined}
                              style={finalStyle}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCell({ r: rowIdx, c: colIdx });
                                setSelectedColIdx(null);
                                setSelectedRowIdx(null);
                              }}
                              onDoubleClick={() => handleCellDoubleClick(rowIdx, colIdx)}
                              className={`border-r border-b border-slate-200 px-2 py-1 text-xs truncate relative transition-all cursor-pointer select-none ${bgClass} ${textClass} ${extraClasses} ${isCellSelected ? 'ring-2 ring-indigo-600 bg-indigo-50/20 z-10 shadow-sm' : isColSelected || isRowSelected ? 'bg-slate-50/40' : ''}`}
                            >
                              {isEditing ? (
                                <InlineCellInput
                                  initialValue={inlineEditValue}
                                  onSave={(val) => {
                                    setInlineEditValue(val);
                                    handleInlineEditSubmit(rowIdx, colIdx);
                                  }}
                                  onCancel={() => setEditingCell(null)}
                                />
                              ) : (
                                <>
                                  {displayVal}
                                  {/* Formula tiny tag identifier */}
                                  {cell?.f && (
                                    <span className="absolute bottom-0.5 right-0.5 text-[7px] text-emerald-600 bg-emerald-50/60 font-mono font-bold rounded px-0.5">fx</span>
                                  )}
                                </>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick spreadsheet tips bar */}
          <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-[11px] font-sans select-none">
            <Info className="w-4 h-4 text-slate-400 shrink-0" />
            <span>💡 <strong>Office Shortcut Tips</strong>: Double-click any cell to edit value or write formula directly. Or select any cell and use the top Formula Bar (fx) to write calculations like `=SUM(D5:I5)`. Press Enter to save.</span>
          </div>

        </div>

      </div>

      {showPrintEngine && (
        <CommonPrintEngine
          title="Official Master Result Book Consolidated Ledger"
          pages={[{ sheet: sheet }]}
          user={user}
          lang={language}
          onClose={() => setShowPrintEngine(false)}
          scale={77}
          paperSize="legal"
          orientation="portrait"
        />
      )}

      {/* RESET MASTER TEMPLATE CONFIRMATION MODAL */}
      {showResetConfirmation && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-6 text-left animate-scale-up">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-50 rounded-2xl text-rose-600 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 animate-pulse">
                <h3 className="text-base font-black text-slate-800 tracking-tight font-sans">
                  Reset Master Template?
                </h3>
                <p className="text-xs text-slate-500 leading-normal font-sans">
                  You are about to reset the active master assessment template to a clean slate. Please read the terms below carefully:
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2.5">
              <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider block">THIS ACTION WILL:</span>
              <ul className="space-y-2 text-xs font-medium text-slate-600 font-sans">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                  <span>REMOVE ONLY STORED MARKS (Homework, UT, Written, etc.)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>KEEP THE COMPLETE STRUCTURE SAFE</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>KEEP ALL FORMULAS SAFE</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>KEEP ALL SUBJECTS SAFE</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>KEEP ALL PRINT STRUCTURES SAFE</span>
                </li>
              </ul>
            </div>

            <div className="flex items-center gap-3 font-sans">
              <button
                onClick={() => {
                  const success = handleResetToCleanSlate();
                  setShowResetConfirmation(false);
                  if (success) {
                    setResetSuccess(true);
                  } else {
                    alert("An error occurred during reset. Restore backup initiated.");
                  }
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer text-center"
              >
                Yes, Reset Template
              </button>
              <button
                onClick={() => setShowResetConfirmation(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
