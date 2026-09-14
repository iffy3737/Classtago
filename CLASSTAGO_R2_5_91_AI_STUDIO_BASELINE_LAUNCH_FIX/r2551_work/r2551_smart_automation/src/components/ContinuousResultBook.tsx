import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Printer, Info, Settings, AlertTriangle, BookOpen, ChevronUp, ChevronDown } from 'lucide-react';
import { User } from '../types';
import { LocalERPDatabase } from '../lib/supabase';
import { printSectionById } from '../utils/printSection';

interface Student {
  id: string;
  name: string;
  rollNo: number;
  grNumber: string;
}

interface ContinuousResultBookProps {
  user: User;
  isUrdu: boolean;
  students: Student[];
  ctTargetClass: string;
  ctTargetDivision: string;
  onClose: () => void;
}

export default function ContinuousResultBook({
  user,
  isUrdu,
  students,
  ctTargetClass,
  ctTargetDivision,
  onClose,
}: ContinuousResultBookProps) {
  const isClerk = user.role === 'clerk';

  const [isRBLocked, setIsRBLocked] = useState<boolean>(false);

  useEffect(() => {
    try {
      const locks = JSON.parse(localStorage.getItem('nhs_erp_result_book_locks') || '[]');
      const match = locks.find((l: any) => l.className === ctTargetClass && l.divisionName === ctTargetDivision && l.academicYear === '2026-27');
      if (match && match.isLocked) {
        setIsRBLocked(true);
      }
    } catch (e) {
      console.error(e);
    }
  }, [ctTargetClass, ctTargetDivision]);

  const getCompletionStatus = () => {
    try {
      const setup = LocalERPDatabase.getAcademicSetup();
      const subjectAllocations = setup?.subjectAllocations || [];
      const classAllocations = subjectAllocations.filter(
        (a: any) => a.className === ctTargetClass && a.divisionName === ctTargetDivision
      );
      const activeLockStates = LocalERPDatabase.getSubjectLockStates();
      
      const total = classAllocations.length || 4;
      const approved = classAllocations.filter((alloc: any) => {
        return activeLockStates.some(
          (s: any) => s.classId === alloc.className &&
                      s.division === alloc.divisionName &&
                      s.subjectId === alloc.subjectName &&
                      s.status === 'Approved'
        );
      }).length;
      
      return { approved, total, isComplete: approved === total && total > 0 };
    } catch (e) {
      console.error(e);
      return { approved: 0, total: 4, isComplete: false };
    }
  };

  const statusInfo = getCompletionStatus();

  const handleSendCompleteResultBook = () => {
    try {
      const locks = JSON.parse(localStorage.getItem('nhs_erp_result_book_locks') || '[]');
      const existingIdx = locks.findIndex((l: any) => l.className === ctTargetClass && l.divisionName === ctTargetDivision && l.academicYear === '2026-27');
      
      const lockObj = {
        id: `lock_rb_2026-27_${ctTargetClass.replace(/\s+/g, '_')}_${ctTargetDivision.replace(/\s+/g, '_')}`,
        className: ctTargetClass,
        divisionName: ctTargetDivision,
        academicYear: '2026-27',
        isLocked: true,
        lockedAt: new Date().toISOString(),
        lockedBy: user.name
      };

      if (existingIdx !== -1) {
        locks[existingIdx] = lockObj;
      } else {
        locks.push(lockObj);
      }
      localStorage.setItem('nhs_erp_result_book_locks', JSON.stringify(locks));
      setIsRBLocked(true);

      const studentResultBooksKey = 'nhs_erp_student_result_books';
      const allStudentBooks = JSON.parse(localStorage.getItem(studentResultBooksKey) || '[]');
      
      const classStudentBooks = allStudentBooks.filter((rb: any) => 
        rb.className === ctTargetClass && 
        rb.divisionName === ctTargetDivision && 
        rb.academicYear === '2026-27'
      );

      // Generate individualized sheet snapshot for every student
      const snapshotStudentBooks = students.map((st: any) => {
        const studentSheet = getStudentSheet(st);
        return {
          studentId: st.id,
          studentName: st.name,
          rollNo: st.rollNo,
          grNumber: st.grNumber,
          sheetData: studentSheet
        };
      });

      const printableBooksKey = 'nhs_erp_result_books_ready_for_print';
      const printableBooks = JSON.parse(localStorage.getItem(printableBooksKey) || '[]');

      const newPrintableRB = {
        id: `prb_2026-27_${ctTargetClass.replace(/\s+/g, '_')}_${ctTargetDivision.replace(/\s+/g, '_')}`,
        academicYear: '2026-27',
        className: ctTargetClass,
        divisionName: ctTargetDivision,
        sentAt: new Date().toISOString(),
        lockedBy: user.name,
        students: students,
        studentResultBooks: snapshotStudentBooks,
        isArchived: false
      };

      const existingPrbIdx = printableBooks.findIndex((p: any) => p.id === newPrintableRB.id);
      if (existingPrbIdx !== -1) {
        printableBooks[existingPrbIdx] = newPrintableRB;
      } else {
        printableBooks.push(newPrintableRB);
      }
      localStorage.setItem(printableBooksKey, JSON.stringify(printableBooks));

      LocalERPDatabase.addAuditLog(
        user.id,
        user.name,
        user.role,
        'LOCK_AND_SEND_RESULT_BOOK',
        'Result Book',
        `Locked Result Book and sent printable record to Clerk Dashboard for Class ${ctTargetClass} Division ${ctTargetDivision}.`
      );

      alert(isUrdu ? "رزلٹ بک کامیابی کے ساتھ مقفل کر کے کلرک کو بھیج دی گئی ہے۔" : "Result Book has been locked and successfully sent to the Clerk Dashboard.");
    } catch (e) {
      console.error(e);
    }
  };

  // Print Settings States
  const [printMode, setPrintMode] = useState<'all' | 'range' | 'odd' | 'even'>('all');
  const [pageRangeInput, setPageRangeInput] = useState<string>('1-10');
  const [paperSize, setPaperSize] = useState<'legal' | 'letter' | 'a4'>('legal');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [scale, setScale] = useState<number>(100);

  // Master Template state
  const [masterTemplate, setMasterTemplate] = useState<any>(null);

  // Load / Generate Master Template
  useEffect(() => {
    const templateStr = localStorage.getItem('erp_master_result_book_sheet');
    if (templateStr) {
      try {
        setMasterTemplate(JSON.parse(templateStr));
      } catch (e) {
        console.error("Error parsing master template:", e);
        const fresh = generateDefaultTemplate();
        setMasterTemplate(fresh);
      }
    } else {
      const fresh = generateDefaultTemplate();
      localStorage.setItem('erp_master_result_book_sheet', JSON.stringify(fresh));
      setMasterTemplate(fresh);
    }
  }, []);

  // Helper to generate the default master sheet structure with default styles and content
  const generateDefaultTemplate = () => {
    const s: any = {};
    
    // Fetch subjects
    const setup = LocalERPDatabase.getAcademicSetup();
    const subjects = setup?.subjects || [];
    const activeSubjects = subjects.filter((sub: any) => sub.isActive) || [];
    const subjectNames = activeSubjects.length > 0 
      ? activeSubjects.map((sub: any) => sub.subjectName)
      : ["Urdu", "Hindi", "Marathi", "English", "Mathematics", "Science", "History & Civics", "Geography"];

    const numSubjects = subjectNames.length;

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

    setCell(1, 0, "OFFICIAL CONSOLIDATED MASTER RESULT BOOK - INDIVIDUAL STUDENT ASSESSMENT REGISTRY", 's', undefined, true, 'center', '334155', 10);
    if (s[XLSX.utils.encode_cell({ r: 1, c: 0 })]?.s?.font) {
      s[XLSX.utils.encode_cell({ r: 1, c: 0 })].s.font.color = { rgb: 'ffffff' };
    }

    setCell(2, 0, "Academic Year: 2026-27 | Permanent Master Student Registry Template", 's', undefined, false, 'center', '475569', 9);
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
    setCell(5, 1, "Class 9 - A", 's', undefined, true, 'left', 'ffffff');
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
      "SUBJECT / COURSE", "Homework [Max: 10]", "Assignment [Max: 10]", "Oral / Viva [Max: 10]",
      "Unit Test [Max: 20]", "Project [Max: 10]", "Formative [Max: 60]", "Written Exam [Max: 40]",
      "Summative [Max: 40]", "Grand Total [Max: 100]", "Result Grade"
    ];

    headers.forEach((h, cIdx) => {
      let bg = 'e2e8f0';
      if (cIdx === 6) bg = 'ccfbf1';
      if (cIdx === 8) bg = 'e0f2fe';
      if (cIdx === 9) bg = 'fef3c7';
      if (cIdx === 10) bg = 'f3e8ff';
      setCell(9, cIdx, h, 's', undefined, true, cIdx === 0 ? 'left' : 'center', bg, 9);
    });

    // Subject Rows (Term I)
    subjectNames.forEach((name, sIdx) => {
      const r = 10 + sIdx;
      const excelRow = r + 1;
      
      setCell(r, 0, name, 's', undefined, true, 'left', 'f8fafc');
      setCell(r, 1, "", 's', undefined, false, 'center');
      setCell(r, 2, "", 's', undefined, false, 'center');
      setCell(r, 3, "", 's', undefined, false, 'center');
      setCell(r, 4, "", 's', undefined, false, 'center');
      setCell(r, 5, "", 's', undefined, false, 'center');
      setCell(r, 6, "", 's', `SUM(B${excelRow}:F${excelRow})`, true, 'center', 'f0fdfa');
      setCell(r, 7, "", 's', undefined, false, 'center');
      setCell(r, 8, "", 's', `SUM(H${excelRow})`, true, 'center', 'f0f9ff');
      setCell(r, 9, "", 's', `SUM(G${excelRow},I${excelRow})`, true, 'center', 'fffbeb');
      
      const gradeFormula = `IF(J${excelRow}>=90,"A1",IF(J${excelRow}>=80,"A2",IF(J${excelRow}>=70,"B1",IF(J${excelRow}>=60,"B2",IF(J${excelRow}>=50,"C1",IF(J${excelRow}>=35,"C2","D"))))))`;
      setCell(r, 10, "", 's', gradeFormula, true, 'center', 'faf5ff');
    });

    const term1EndRow = 10 + numSubjects - 1;

    // Term I Cumulative Summary
    const r1GrandTotalRow = term1EndRow + 1;
    setCell(r1GrandTotalRow, 0, `First Term Grand Total (Out of ${numSubjects * 100})`, 's', undefined, true, 'left', 'cbd5e1');
    setCell(r1GrandTotalRow, 9, "", 's', `SUM(J11:J${term1EndRow + 1})`, true, 'center', 'cbd5e1');
    setCell(r1GrandTotalRow, 10, "", 's', undefined, false, 'center', 'cbd5e1');

    const r1PercentageRow = term1EndRow + 2;
    setCell(r1PercentageRow, 0, "First Term Percentage (%)", 's', undefined, true, 'left', 'e2e8f0');
    setCell(r1PercentageRow, 9, "", 's', `ROUND(J${r1GrandTotalRow + 1}/${numSubjects},2)`, true, 'center', 'e2e8f0');
    setCell(r1PercentageRow, 10, "", 's', undefined, false, 'center', 'e2e8f0');

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
      if (cIdx === 6) bg = 'ccfbf1';
      if (cIdx === 8) bg = 'e0f2fe';
      if (cIdx === 9) bg = 'fef3c7';
      if (cIdx === 10) bg = 'f3e8ff';
      setCell(term2TableHeaderRow, cIdx, h, 's', undefined, true, cIdx === 0 ? 'left' : 'center', bg, 9);
    });

    const term2SubjectStartRow = term2TableHeaderRow + 1;
    subjectNames.forEach((name, sIdx) => {
      const r = term2SubjectStartRow + sIdx;
      const excelRow = r + 1;
      
      setCell(r, 0, name, 's', undefined, true, 'left', 'f8fafc');
      setCell(r, 1, "", 's', undefined, false, 'center');
      setCell(r, 2, "", 's', undefined, false, 'center');
      setCell(r, 3, "", 's', undefined, false, 'center');
      setCell(r, 4, "", 's', undefined, false, 'center');
      setCell(r, 5, "", 's', undefined, false, 'center');
      setCell(r, 6, "", 's', `SUM(B${excelRow}:F${excelRow})`, true, 'center', 'f0fdfa');
      setCell(r, 7, "", 's', undefined, false, 'center');
      setCell(r, 8, "", 's', `SUM(H${excelRow})`, true, 'center', 'f0f9ff');
      setCell(r, 9, "", 's', `SUM(G${excelRow},I${excelRow})`, true, 'center', 'fffbeb');
      
      const gradeFormula = `IF(J${excelRow}>=90,"A1",IF(J${excelRow}>=80,"A2",IF(J${excelRow}>=70,"B1",IF(J${excelRow}>=60,"B2",IF(J${excelRow}>=50,"C1",IF(J${excelRow}>=35,"C2","D"))))))`;
      setCell(r, 10, "", 's', gradeFormula, true, 'center', 'faf5ff');
    });

    const term2EndRow = term2SubjectStartRow + numSubjects - 1;

    // Term II Summary Section
    const r2GrandTotalRow = term2EndRow + 1;
    setCell(r2GrandTotalRow, 0, `Second Term Grand Total (Out of ${numSubjects * 100})`, 's', undefined, true, 'left', 'cbd5e1');
    setCell(r2GrandTotalRow, 9, "", 's', `SUM(J${term2SubjectStartRow + 1}:J${term2EndRow + 1})`, true, 'center', 'cbd5e1');
    setCell(r2GrandTotalRow, 10, "", 's', undefined, false, 'center', 'cbd5e1');

    const r2PercentageRow = term2EndRow + 2;
    setCell(r2PercentageRow, 0, "Second Term Percentage (%)", 's', undefined, true, 'left', 'e2e8f0');
    setCell(r2PercentageRow, 9, "", 's', `ROUND(J${r2GrandTotalRow + 1}/${numSubjects},2)`, true, 'center', 'e2e8f0');
    setCell(r2PercentageRow, 10, "", 's', undefined, false, 'center', 'e2e8f0');

    const r2GradeRow = term2EndRow + 3;
    const r2GradeFormula = `IF(J${r2PercentageRow + 1}>=90,"A1",IF(J${r2PercentageRow + 1}>=80,"A2",IF(J${r2PercentageRow + 1}>=70,"B1",IF(J${r2PercentageRow + 1}>=60,"B2",IF(J${r2PercentageRow + 1}>=50,"C1",IF(J${r2PercentageRow + 1}>=35,"C2","D"))))))`;
    setCell(r2GradeRow, 0, "Second Term Grade", 's', undefined, true, 'left', 'f1f5f9');
    setCell(r2GradeRow, 9, "", 's', r2GradeFormula, true, 'center', 'f1f5f9');
    setCell(r2GradeRow, 10, "", 's', undefined, false, 'center', 'f1f5f9');

    // Dimensions
    const totalRowIndex = r2GradeRow;
    s["!ref"] = `A1:K${totalRowIndex + 1}`;
    
    s["!cols"] = [
      { wpx: 150 },
      { wpx: 75 },
      { wpx: 75 },
      { wpx: 75 },
      { wpx: 75 },
      { wpx: 75 },
      { wpx: 90 },
      { wpx: 85 },
      { wpx: 90 },
      { wpx: 90 },
      { wpx: 80 }
    ];
    
    const rowHeights: any[] = [];
    for (let r = 0; r <= totalRowIndex; r++) {
      let h = 26;
      if (r < 3) h = 32;
      else if (r === 3 || r === 7 || r === term1EndRow + 4) h = 10;
      else if (r === 8 || r === term2HeaderRow) h = 34;
      else if (r === 9 || r === term2TableHeaderRow) h = 30;
      else if (r > term1EndRow && r <= r1GradeRow) h = 28;
      else if (r > term2EndRow && r <= r2GradeRow) h = 28;
      rowHeights.push({ hpx: h });
    }
    s["!rows"] = rowHeights;

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

    s["!pageSetup"] = {
      orientation: "Portrait",
      pageSize: "Legal",
      margins: "Narrow",
      printArea: "A:K"
    };

    return s;
  };

  if (!masterTemplate) {
    return (
      <div className="p-6 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p className="font-sans text-xs">Loading Master Result Book Template...</p>
      </div>
    );
  }

  // Parse Master Range dimensions
  const range = XLSX.utils.decode_range(masterTemplate['!ref'] || 'A1:K35');
  const minRow = range.s.r;
  const maxRow = range.e.r;
  const minCol = range.s.c;
  const maxCol = range.e.c;

  // Retrieve column widths
  const getColWidth = (c: number) => {
    const cols = masterTemplate['!cols'];
    if (cols?.[c]) {
      if (cols[c].wpx) return `${cols[c].wpx}px`;
      if (cols[c].wch) return `${cols[c].wch * 8}px`;
      if (cols[c].width) return `${cols[c].width * 8}px`;
    }
    return '100px';
  };

  // Retrieve row heights
  const getRowHeight = (r: number) => {
    const rows = masterTemplate['!rows'];
    if (rows?.[r]) {
      if (rows[r].hpx) return `${rows[r].hpx}px`;
      if (rows[r].hpt) return `${rows[r].hpt * 1.33}px`;
    }
    return '26px';
  };

  // Check Merge Info
  const getMergeInfo = (r: number, c: number) => {
    const merges = masterTemplate['!merges'] || [];
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

  // Get cell styles
  const getCellStyle = (r: number, c: number, cell: any) => {
    const styles: React.CSSProperties = {
      width: getColWidth(c),
      height: getRowHeight(r),
    };

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

  // Apply student identity fields onto cloned sheet state
  const getStudentSheet = (student: Student) => {
    let sheetBase = masterTemplate;
    try {
      const storedStr = localStorage.getItem('nhs_erp_student_result_books');
      if (storedStr) {
        const studentBooks = JSON.parse(storedStr);
        const match = studentBooks.find(
          (rb: any) => rb.studentId === student.id && rb.academicYear === '2026-27'
        );
        if (match && match.sheetData) {
          sheetBase = match.sheetData;
        }
      }
    } catch (e) {
      console.error("Error loading student-specific sheet:", e);
    }

    const s = { ...sheetBase };
    
    const setCellVal = (r: number, c: number, value: any, type: string = 's') => {
      const ref = XLSX.utils.encode_cell({ r, c });
      const orig = s[ref] || {};
      s[ref] = {
        ...orig,
        t: type,
        v: value
      };
    };

    // Update Student identity parameters exactly on coordinates B5, G5, J5, B6, etc.
    setCellVal(4, 1, student.name, 's');
    setCellVal(4, 6, student.grNumber, 's');
    setCellVal(4, 9, String(student.rollNo), 'n');
    setCellVal(5, 1, `${ctTargetClass} - ${ctTargetDivision}`, 's');
    
    // Fallback static parameters
    setCellVal(5, 6, "—", 's');
    setCellVal(5, 9, "—", 's');
    setCellVal(6, 1, `SR-2026${100 + student.rollNo}`, 's');
    setCellVal(6, 6, `9876-5432-10${student.rollNo < 10 ? '0' + student.rollNo : student.rollNo}`, 's');

    return s;
  };

  // Filter students based on print configuration
  const filteredStudents = students.filter((student, index) => {
    const pageNum = index + 1;
    if (printMode === 'odd') {
      return pageNum % 2 !== 0;
    }
    if (printMode === 'even') {
      return pageNum % 2 === 0;
    }
    if (printMode === 'range') {
      if (!pageRangeInput.trim()) return true;
      try {
        const cleaned = pageRangeInput.replace(/\s+/g, '');
        const ranges = cleaned.split(',');
        for (const r of ranges) {
          if (r.includes('-')) {
            const [start, end] = r.split('-').map(Number);
            if (pageNum >= start && pageNum <= end) return true;
          } else {
            if (Number(r) === pageNum) return true;
          }
        }
        return false;
      } catch (e) {
        return true;
      }
    }
    return true; // 'all'
  });

  const getPaperDimensions = (size: string, orient: string) => {
    let w = "8.5in";
    let h = "14in";
    if (size === 'letter') {
      w = "8.5in";
      h = "11in";
    } else if (size === 'a4') {
      w = "8.27in";
      h = "11.69in";
    }
    
    if (orient === 'landscape') {
      return { width: h, height: w };
    }
    return { width: w, height: h };
  };

  const dims = getPaperDimensions(paperSize, orientation);

  const handleNativePrint = () => {
    printSectionById('continuous-result-book-print-root', 'Continuous Result Book');
  };

  const warningActive = paperSize !== 'legal';

  return (
    <div className="space-y-6 text-left font-sans">
      
      {/* Styles Injection for Native Browser Printing */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Hide parent application UI */
          body > *:not(#continuous-result-book-print-viewport) {
            display: none !important;
            height: 0 !important;
            overflow: hidden !important;
            visibility: hidden !important;
          }
          #continuous-result-book-print-viewport {
            display: block !important;
            visibility: visible !important;
            width: ${dims.width} !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            overflow: visible !important;
          }
          #continuous-result-book-print-root {
            display: block !important;
            visibility: visible !important;
            width: ${dims.width} !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          .print-page-break {
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: ${dims.width} !important;
            height: ${dims.height} !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            background: white !important;
          }
          .print-table {
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            background: white !important;
          }
          .print-table td, .print-table th {
            border: 1px solid #94a3b8 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-scale-container {
            zoom: ${scale}% !important;
            transform-origin: top center !important;
          }
          @page {
            size: ${paperSize === 'legal' ? 'legal' : paperSize === 'a4' ? 'A4' : 'letter'} ${orientation};
            margin: 0.4in;
          }
        }
      `}} />

      {/* Control Panel / Print Dashboard - Render only if Clerk */}
      {isClerk ? (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm select-none">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <Printer className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <h4 className="text-base font-black text-slate-800">
                {isUrdu ? "🖨️ پرنٹ مینیجر - مسلسل رزلٹ بک رجسٹری" : "🖨️ Print Manager - Continuous Result Book Register"}
              </h4>
              <p className="text-xs text-slate-500">
                {isUrdu 
                  ? "کلاس ڈویژن کے تمام طلباء کے لیے قانونی سائز کے صفحات پر مسلسل رجسٹری تیار کریں۔"
                  : `Generate legal-size continuous sheets for all ${students.length} students of Class: ${ctTargetClass} - ${ctTargetDivision}.`
                }
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            {isUrdu ? "واپس جائیں" : "Back to Registry"}
          </button>
        </div>

        {/* Configurations Fields Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Column A: Print Selection Filter */}
          <div className="lg:col-span-5 space-y-3.5 border-r border-slate-200/60 pr-6">
            <h5 className="text-xs font-black text-slate-700 uppercase tracking-wider font-sans">
              {isUrdu ? "صفحات کا انتخاب" : "1. Select Print Pages"}
            </h5>
            
            <div className="space-y-2 font-sans text-xs">
              
              {/* Option A: All Pages */}
              <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50/50 transition-colors">
                <input
                  type="radio"
                  name="printMode"
                  checked={printMode === 'all'}
                  onChange={() => setPrintMode('all')}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="text-left">
                  <span className="font-extrabold text-slate-800 block">
                    {isUrdu ? "تمام صفحات (ترتیب وار)" : "Serial Wise (All Pages)"}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {isUrdu ? `تمام طلباء کے صفحات (کل: ${students.length})` : `Print all student sheets sequentially (Pages 1 to ${students.length})`}
                  </span>
                </div>
              </label>

              {/* Option B: Page Range */}
              <label className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50/50 transition-colors">
                <input
                  type="radio"
                  name="printMode"
                  checked={printMode === 'range'}
                  onChange={() => setPrintMode('range')}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 mt-0.5"
                />
                <div className="text-left w-full space-y-2">
                  <div>
                    <span className="font-extrabold text-slate-800 block">
                      {isUrdu ? "مخصوص صفحات کا دائرہ" : "Serial Wise (Page Range)"}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {isUrdu ? "مخصوص رول نمبرز یا صفحات منتخب کریں۔" : "Define precise sequential page range bounds."}
                    </span>
                  </div>
                  
                  {printMode === 'range' && (
                    <div className="flex items-center gap-2 pt-1 animate-fade-in">
                      <input
                        type="text"
                        value={pageRangeInput}
                        onChange={(e) => setPageRangeInput(e.target.value)}
                        className="w-full max-w-[180px] px-3 py-1.5 border border-slate-300 rounded-lg text-slate-800 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="e.g. 1-10 or 11-20"
                      />
                      <span className="text-[10px] text-slate-400 font-mono">Pages</span>
                    </div>
                  )}
                </div>
              </label>

              {/* Option C: Odd Pages */}
              <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50/50 transition-colors">
                <input
                  type="radio"
                  name="printMode"
                  checked={printMode === 'odd'}
                  onChange={() => setPrintMode('odd')}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="text-left">
                  <span className="font-extrabold text-slate-800 block">
                    {isUrdu ? "طاق صفحات (Odd Pages)" : "Odd Pages (1, 3, 5, 7...)"}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {isUrdu ? "رجسٹری کے صرف طاق صفحات پرنٹ کریں۔" : "Print only odd pages of the continuous register."}
                  </span>
                </div>
              </label>

              {/* Option D: Even Pages */}
              <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50/50 transition-colors">
                <input
                  type="radio"
                  name="printMode"
                  checked={printMode === 'even'}
                  onChange={() => setPrintMode('even')}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="text-left">
                  <span className="font-extrabold text-slate-800 block">
                    {isUrdu ? "جفت صفحات (Even Pages)" : "Even Pages (2, 4, 6, 8...)"}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {isUrdu ? "رجسٹری کے صرف جفت صفحات پرنٹ کریں۔" : "Print only even pages of the continuous register."}
                  </span>
                </div>
              </label>

            </div>
          </div>

          {/* Column B: Page Setup and Scaling */}
          <div className="lg:col-span-4 space-y-4">
            <h5 className="text-xs font-black text-slate-700 uppercase tracking-wider font-sans">
              {isUrdu ? "صفحہ کی ترتیبات" : "2. Page Settings"}
            </h5>

            <div className="space-y-3 font-sans text-xs text-left">
              
              {/* Paper Size dropdown */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-600">
                  {isUrdu ? "کاغذ کا سائز (Paper Size)" : "Paper Size"}
                </label>
                <select
                  value={paperSize}
                  onChange={(e) => setPaperSize(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="legal">Legal (8.5" x 14") [Default]</option>
                  <option value="a4">A4 (8.27" x 11.69")</option>
                  <option value="letter">Letter (8.5" x 11")</option>
                </select>
              </div>

              {/* Orientation dropdown */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-600">
                  {isUrdu ? "صفحہ کا رخ (Orientation)" : "Orientation"}
                </label>
                <select
                  value={orientation}
                  onChange={(e) => setOrientation(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="portrait">Portrait [Default]</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>

              {/* Scale dropdown */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-600">
                  {isUrdu ? "پیمانہ (Scale)" : "Scale / Zoom"}
                </label>
                <select
                  value={scale}
                  onChange={(e) => setScale(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={100}>100% [Default]</option>
                  <option value={95}>95%</option>
                  <option value={90}>90%</option>
                  <option value={85}>85%</option>
                  <option value={80}>80%</option>
                  <option value={75}>75%</option>
                </select>
              </div>

            </div>
          </div>

          {/* Column C: Print Action Trigger */}
          <div className="lg:col-span-3 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <h5 className="text-xs font-black text-slate-700 uppercase tracking-wider font-sans">
                {isUrdu ? "کارروائی" : "3. Action"}
              </h5>
              <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-[11px] text-slate-500 space-y-1">
                <span className="font-extrabold text-slate-700 block">Print Summary:</span>
                <p>Selected mode: <strong className="text-slate-800">{printMode.toUpperCase()}</strong></p>
                <p>Matching sheets: <strong className="text-slate-800">{filteredStudents.length} / {students.length}</strong></p>
                <p>Dimensions: <strong className="text-slate-800">{dims.width} x {dims.height}</strong></p>
              </div>
            </div>

            <button
              onClick={handleNativePrint}
              disabled={filteredStudents.length === 0}
              className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                filteredStudents.length === 0
                  ? 'bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-indigo-600 border-indigo-700 hover:bg-indigo-500 text-white hover:shadow-lg'
              }`}
            >
              <Printer className="w-4 h-4 text-white" />
              {isUrdu ? "رزسٹر پرنٹ کریں" : "PRINT REGISTER"}
            </button>
          </div>

        </div>

        {/* Warning message if paper size is changed from Legal */}
        {warningActive && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 text-amber-900 text-xs leading-relaxed animate-fade-in">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold block mb-0.5">Paper Size Warning</span>
              <p>This Result Book is designed for Legal Size paper. Changing the paper size may affect page layout and printing accuracy.</p>
            </div>
          </div>
        )}

      </div>
      ) : (
        /* Simple Elegant Header for Class Teacher (Strictly No Print, No Download, No Export) */
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-5 select-none shadow-sm animate-fade-in text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="text-base font-black text-slate-800">
                {isUrdu ? "کلاس رزلٹ بک رجسٹری" : "Class Result Book Registry"}
              </h4>
              <p className="text-xs text-slate-500">
                {isUrdu 
                  ? `${ctTargetClass} - ${ctTargetDivision} کے طلباء کے مسلسل اسسمنٹ ریکارڈز دیکھیں`
                  : `Reviewing permanent academic assessment registry for Class: ${ctTargetClass} - ${ctTargetDivision}.`
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {isRBLocked ? (
              <span className="px-4 py-2 bg-slate-100 text-slate-500 border border-slate-300 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 select-none font-sans">
                🔒 {isUrdu ? "رزلٹ بک مقفل ہے" : "LOCKED & SENT TO CLERK"}
              </span>
            ) : (
              <button
                type="button"
                disabled={!statusInfo.isComplete}
                onClick={handleSendCompleteResultBook}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer border flex items-center gap-1.5 ${
                  statusInfo.isComplete
                    ? 'bg-emerald-600 border-transparent hover:bg-emerald-500 text-white hover:shadow-md'
                    : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isUrdu ? "کلرک کو رزلٹ بک بھیجیں" : "Send Complete Result Book to Clerk"}
                <span className="text-[10px] font-bold">
                  ({statusInfo.approved}/{statusInfo.total})
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              {isUrdu ? "واپس جائیں" : "Back to Registry"}
            </button>
          </div>
        </div>
      )}

      {/* Main Continuous Spreadsheet List Viewer */}
      <div className="space-y-8 select-none">
        <div className="flex justify-between items-center px-1">
          <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider">
            {isUrdu ? "پیش نظارہ رجسٹری شیٹ" : "Continuous Register Preview Sheet"}
          </h4>
          <span className="text-xs bg-slate-100 border border-slate-200 text-slate-600 px-3 py-1 rounded-full font-bold">
            Showing {filteredStudents.length} of {students.length} Student Pages
          </span>
        </div>

        {/* Fixed Workbook Viewport Container mimicking Excel Print Layout View */}
        <div 
          id="continuous-result-book-print-viewport" 
          className="h-[750px] overflow-auto bg-slate-200/75 border border-slate-300 rounded-3xl p-8 flex flex-col items-center w-full"
        >
          {/* Outer continuous container (Also used as root in print mode) */}
          <div id="continuous-result-book-print-root" className="space-y-12 w-full flex flex-col items-center">
            
            {filteredStudents.map((student, sIdx) => {
              const studentSheet = getStudentSheet(student);
              const pageNumber = students.findIndex(st => st.id === student.id) + 1;

              return (
                <div 
                  key={student.id}
                  className="print-page-break bg-white border border-slate-300 rounded-sm shadow-2xl p-10 relative overflow-auto shrink-0 select-text"
                  style={{ width: dims.width, minHeight: dims.height }}
                >
                {/* Print-Only Header Metadata Info block */}
                <div className="hidden print:flex justify-between items-center border-b border-slate-300 pb-2 mb-4 font-mono text-[9px] text-slate-400">
                  <span>NATIONAL HIGH SCHOOL, TALODA | CONTINUOUS RESULT REGISTER</span>
                  <span>STUDENT PAGE {pageNumber} OF {students.length}</span>
                </div>

                {/* On-Screen ONLY Page Spacer Header */}
                <div className="print:hidden flex justify-between items-center border-b border-slate-200 pb-3 mb-5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">
                      {pageNumber}
                    </span>
                    <h5 className="text-sm font-black text-slate-800">
                      {student.name} <span className="text-xs text-slate-400 font-medium">(G.R. {student.grNumber} | Roll {student.rollNo})</span>
                    </h5>
                  </div>
                  <span className="text-xs bg-emerald-50 text-emerald-700 font-bold border border-emerald-100 px-2.5 py-1 rounded-md">
                    Page {pageNumber}
                  </span>
                </div>

                {/* Scale Container */}
                <div className="print-scale-container w-full overflow-auto">
                  
                  {/* Styled Spreadsheet Sheet */}
                  <table className="w-full border-collapse font-sans text-xs table-fixed print-table select-text">
                    <tbody>
                      {Array.from({ length: maxRow - minRow + 1 }).map((_, rIdx) => {
                        const rowIdx = minRow + rIdx;
                        const rHeight = getRowHeight(rowIdx);

                        return (
                          <tr
                            key={rowIdx}
                            style={{ height: rHeight }}
                            className="border-b border-slate-200"
                          >
                            {Array.from({ length: maxCol - minCol + 1 }).map((_, cIdx) => {
                              const colIdx = minCol + cIdx;
                              const { isMerged, isTopLeft, rowSpan, colSpan } = getMergeInfo(rowIdx, colIdx);

                              // Skip if merged and not top-left
                              if (isMerged && !isTopLeft) return null;

                              const cellRef = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
                              const cell = studentSheet[cellRef];

                              // Resolve standard values to show on sheet
                              let displayVal = '';
                              if (cell) {
                                if (cell.f) {
                                  displayVal = cell.v !== undefined ? String(cell.v) : `=${cell.f}`;
                                } else {
                                  displayVal = cell.v !== undefined ? String(cell.v) : '';
                                }
                              }

                              // Layout formatting presets
                              let bgClass = 'bg-white';
                              let textClass = 'text-slate-800';
                              let extraClasses = '';

                              const hasExplicitBg = !!cell?.s?.fill?.fgColor?.rgb;
                              const hasExplicitFont = !!cell?.s?.font?.bold;
                              const hasExplicitAlign = !!cell?.s?.alignment?.horizontal;

                              if (!hasExplicitBg) {
                                if (rowIdx < 3) {
                                  bgClass = 'bg-slate-50';
                                } else if (rowIdx === 3 || rowIdx === 9) {
                                  bgClass = 'bg-slate-100';
                                } else if (cell?.f) {
                                  bgClass = 'bg-emerald-50/5';
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
                                  className={`border-r border-b border-slate-300 px-2 py-1 text-xs truncate relative ${bgClass} ${textClass} ${extraClasses}`}
                                >
                                  {displayVal}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                </div>

                {/* On-screen visual break indicator */}
                {sIdx < filteredStudents.length - 1 && (
                  <div className="print:hidden flex items-center justify-center gap-2 pt-6 mt-6 border-t border-dashed border-slate-200">
                    <span className="h-px bg-slate-200 grow" />
                    <span className="text-[10px] font-mono tracking-widest text-slate-400 font-bold uppercase select-none">
                      Automatic Page Break (Legal Size / Portrait)
                    </span>
                    <span className="h-px bg-slate-200 grow" />
                  </div>
                )}

              </div>
            );
          })}

        </div>
      </div>
    </div>

    </div>
  );
}
