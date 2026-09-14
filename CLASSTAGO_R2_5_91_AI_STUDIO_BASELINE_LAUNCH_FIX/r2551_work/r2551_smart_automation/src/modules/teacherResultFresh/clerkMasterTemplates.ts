import { getDualPaperNames } from '../../lib/assessmentRules';
import type { ResultTemplateKey, ResultTerm } from './types';

// Shared Clerk Master Mark List definitions.
// This file is the SAME source used by Clerk Result Management and Teacher Subject Marks List.
// Do not create a second visual template for Teacher Result.

export const clerkDefaultMasterTemplates = [
  {
    id: 'tmpl_class_1_8_regular',
    name: 'Class 1–8 Regular Subject Template',
    nameUr: 'کلاس ۱ تا ۸ ریگولر مضمون ٹیمپلیٹ',
    description: 'Official academic grading registry for primary and upper-primary classes (Grades 1 to 8) for Marathi, English, Mathematics, General Science, and Social Sciences.',
    descriptionUr: 'مراٹھی، انگریزی، ریاضی، جنرل سائنس اور سوشل سائنسز کے لیے پہلی سے آٹھویں جماعت کا سرکاری گریڈنگ فارمیٹ۔',
    academicYear: '2026-27',
    sections: [
      { text: 'NATIONAL HIGH SCHOOL, TALODA', className: 'font-sans font-black text-center text-slate-800 text-lg tracking-wider bg-slate-100 py-3 border-b border-slate-200' },
      { text: 'OFFICIAL MARK REGISTRY - GRADES 1 TO 8 (REGULAR)', className: 'font-sans font-bold text-center text-slate-700 text-xs tracking-normal bg-slate-50 py-1 border-b border-slate-200' },
      { text: 'Academic Year: 2026-27 | Assessment Type: Continuous & Comprehensive Evaluation (CCE)', className: 'font-mono text-center text-slate-500 text-[10px] py-1 bg-white border-b border-slate-200' }
    ],
    headers: [
      { id: 'h1', text: 'Roll No', width: '80px', align: 'center', font: 'font-mono', border: 'border-r border-slate-300' },
      { id: 'h2', text: 'G.R. No.', width: '90px', align: 'center', font: 'font-mono', border: 'border-r border-slate-300' },
      { id: 'h3', text: 'Student Full Name (Surname First)', width: '240px', align: 'left', font: 'font-sans', border: 'border-r border-slate-300' },
      { id: 'h4', text: 'Oral / Viva [Max: 10]', width: '110px', align: 'center', font: 'font-sans', border: 'border-r border-slate-300', baseName: 'Oral / Viva', maxMarks: 10, assessmentType: 'Formative' },
      { id: 'h5', text: 'Practical / Project [Max: 10]', width: '130px', align: 'center', font: 'font-sans', border: 'border-r border-slate-300', baseName: 'Practical / Project', maxMarks: 10, assessmentType: 'Formative' },
      { id: 'h6', text: 'Formative Total [Max: 20]', width: '130px', align: 'center', font: 'font-sans font-bold text-emerald-700 bg-emerald-50/50', border: 'border-r border-slate-300', baseName: 'Formative Total', maxMarks: 20, formula: 'FORMATIVE_TOTAL' },
      { id: 'h7', text: 'Written Exam [Max: 60]', width: '130px', align: 'center', font: 'font-sans', border: 'border-r border-slate-300', baseName: 'Written Exam', maxMarks: 60, assessmentType: 'Summative' },
      { id: 'h8', text: 'Summative Total [Max: 60]', width: '130px', align: 'center', font: 'font-sans font-bold text-sky-700 bg-sky-50/50', border: 'border-r border-slate-300', baseName: 'Summative Total', maxMarks: 60, formula: 'SUMMATIVE_TOTAL' },
      { id: 'h9', text: 'Grand Total [Max: 80]', width: '130px', align: 'center', font: 'font-sans font-black text-slate-900 bg-slate-100', border: 'border-r-2 border-slate-400', baseName: 'Grand Total', maxMarks: 80, formula: 'GRAND_TOTAL' },
      { id: 'h10', text: 'Letter Grade', width: '90px', align: 'center', font: 'font-mono font-bold text-slate-900 bg-slate-50', border: 'border-r border-slate-300', formula: 'GRADE(h9)' },
      { id: 'h11', text: 'Teacher Sign', width: '100px', align: 'center', font: 'font-sans', border: 'border-r border-slate-300' }
    ],
    rowHeights: {
      '4': 44,
    } as Record<string, number>,
    pageSetup: {
      orientation: 'Portrait',
      pageSize: 'A4',
      margins: 'Normal',
      printArea: 'A:K'
    },
    rows: 15
  },
  {
    id: 'tmpl_class_1_8_language',
    name: 'Class 1–8 Hindi/Marathi Language Template',
    nameUr: 'کلاس ۱ تا ۸ ہندی/مراٹھی زبان کا ٹیمپلیٹ',
    description: 'Specialized diagnostic language template emphasizing core auditory, speaking, reading, writing, and dictation matrices.',
    descriptionUr: 'زبان کی بنیادی مہارتوں (سننا، بولنا، پڑھنا، لکھنا) اور املا کی جانچ کے لیے پہلی سے آٹھویں جماعت کا خصوصی ٹیمپلیٹ۔',
    academicYear: '2026-27',
    templateType: 'Hindi_Marathi',
    rowsPerStudent: 3,
    rowLabels: ['Hindi', 'Marathi', 'Total'],
    hasVerticalTotals: true,
    sections: [
      { text: 'NATIONAL HIGH SCHOOL, TALODA', className: 'font-sans font-black text-center text-slate-800 text-lg tracking-wider bg-slate-100 py-3 border-b border-slate-200' },
      { text: 'OFFICIAL LANGUAGE DIAGNOSTIC SHEET - SECOND & THIRD LANGUAGE', className: 'font-sans font-bold text-center text-slate-700 text-xs tracking-normal bg-slate-50 py-1 border-b border-slate-200' },
      { text: 'Academic Year: 2026-27 | Language Core Assessment Framework', className: 'font-mono text-center text-slate-500 text-[10px] py-1 bg-white border-b border-slate-200' }
    ],
    headers: [
      { id: 'h1', text: 'Roll No', width: '70px', align: 'center', font: 'font-mono', border: 'border-r border-slate-300', identityType: 'roll', mergeEachStudentBlock: true },
      { id: 'h2', text: 'G.R. No.', width: '90px', align: 'center', font: 'font-mono', border: 'border-r border-slate-300', identityType: 'gr', mergeEachStudentBlock: true },
      { id: 'h3', text: 'Student Name', width: '220px', align: 'left', font: 'font-sans', border: 'border-r border-slate-300', identityType: 'name', mergeEachStudentBlock: true },
      { id: 'languageRow', text: 'Language', width: '90px', align: 'center', font: 'font-sans font-bold', border: 'border-r border-slate-300', columnType: 'rowLabel', identityType: 'subject_label' },
      { id: 'h4', text: 'Listening (Shrawan)', width: '120px', align: 'center', font: 'font-sans', border: 'border-r border-slate-300', baseName: 'Listening (Shrawan)', assessmentType: 'Formative' },
      { id: 'h5', text: 'Speaking (Bhashan)', width: '120px', align: 'center', font: 'font-sans', border: 'border-r border-slate-300', baseName: 'Speaking (Bhashan)', assessmentType: 'Formative' },
      { id: 'h6', text: 'Reading (Wachan)', width: '120px', align: 'center', font: 'font-sans', border: 'border-r border-slate-300', baseName: 'Reading (Wachan)', assessmentType: 'Formative' },
      { id: 'h7', text: 'Writing (Lekhan)', width: '120px', align: 'center', font: 'font-sans', border: 'border-r border-slate-300', baseName: 'Writing (Lekhan)', assessmentType: 'Formative' },
      { id: 'h8', text: 'Dictation / Oral', width: '120px', align: 'center', font: 'font-sans', border: 'border-r border-slate-300', baseName: 'Dictation / Oral', assessmentType: 'Formative' },
      { id: 'h9', text: 'Formative Total', width: '130px', align: 'center', font: 'font-sans font-bold text-emerald-700 bg-emerald-50/50', border: 'border-r border-slate-300', baseName: 'Formative Total', maxMarks: 10, formula: 'FORMATIVE_TOTAL' },
      { id: 'h10', text: 'Written Exam', width: '110px', align: 'center', font: 'font-sans', border: 'border-r border-slate-300', baseName: 'Written Exam', assessmentType: 'Summative' },
      { id: 'h11', text: 'Summative Total', width: '130px', align: 'center', font: 'font-sans font-bold text-sky-700 bg-sky-50/50', border: 'border-r border-slate-300', baseName: 'Summative Total', maxMarks: 40, formula: 'SUMMATIVE_TOTAL' },
      { id: 'h12', text: 'Grand Total', width: '100px', align: 'center', font: 'font-sans font-black text-slate-900 bg-slate-100', border: 'border-r-2 border-slate-400', baseName: 'Grand Total', maxMarks: 50, mergeEachStudentBlock: true, formula: 'GRAND_TOTAL' },
      { id: 'h13', text: 'Grade', width: '80px', align: 'center', font: 'font-mono font-bold text-slate-900 bg-slate-50', border: 'border-r border-slate-300', mergeEachStudentBlock: true, formula: 'GRADE(h12)' }
    ],
    rowHeights: {
      '4': 44
    } as Record<string, number>,
    pageSetup: {
      orientation: 'Landscape',
      pageSize: 'A4',
      margins: 'Narrow',
      printArea: 'A:M'
    },
    rows: 15
  },
  {
    id: 'tmpl_class_9_10_general',
    name: 'Class 9–10 Single Subject Template',
    nameUr: 'کلاس ۹ تا ۱۰ سنگل سبجیکٹ ٹیمپلیٹ',
    description: 'Official Class 9 and 10 Master Mark List layout for Single Subjects (English, Urdu) with First Term (80 Written + 20 Internal = 100), Second Term (80 Written + 20 Internal = 100), Annual Total (200), Average (100) and Grade.',
    descriptionUr: 'نویں اور دسویں جماعت کے عمومی مضامین کا سرکاری مارک لسٹ فارمیٹ (پہلی چھ ماہی ۸۰+۲۰=۱۰۰، دوسری چھ ماہی ۸۰+۲۰=۱۰۰، کل ۲۰۰، اوسط ۱۰۰ اور گریڈ)۔',
    academicYear: '2026-27',
    templateCategory: 'Class 9-10 Single Subject',
    sections: [
      { text: 'NATIONAL HIGH SCHOOL, TALODA', className: 'font-sans font-black text-center text-slate-800 text-lg tracking-wider bg-slate-100 py-3 border-b border-slate-200' },
      { text: 'MASTER MARK LIST - CLASS IX & X (SINGLE SUBJECT)', className: 'font-sans font-bold text-center text-slate-700 text-xs tracking-normal bg-slate-50 py-1 border-b border-slate-200' },
      { text: 'Academic Year: 2026-27 | Board Examination Pattern', className: 'font-mono text-center text-slate-500 text-[10px] py-1 bg-white border-b border-slate-200' }
    ],
    headers: [
      { id: 'h1', text: 'Sr. No.', width: '60px', align: 'center', font: 'font-mono', border: 'border-r border-slate-300', identityType: 'srNo' },
      { id: 'h2', text: 'Exam Seat No.', width: '110px', align: 'center', font: 'font-mono font-bold', border: 'border-r border-slate-300', identityType: 'seatNo' },
      { id: 'h3', text: 'Name of Students', width: '220px', align: 'left', font: 'font-sans font-medium', border: 'border-r border-slate-300', identityType: 'name' },
      
      // First Term (A)
      { id: 'h4', text: 'Written Exam', group: 'First Term (A)', width: '110px', align: 'center', font: 'font-sans', border: 'border-r border-slate-300', baseName: 'Written Exam', maxMarks: 80, term: 'First Term' },
      { id: 'h5', text: 'Internal Evaluation', group: 'First Term (A)', width: '125px', align: 'center', font: 'font-sans', border: 'border-r border-slate-300', baseName: 'Internal Evaluation', maxMarks: 20, term: 'First Term' },
      { id: 'h6', text: 'Total', group: 'First Term (A)', width: '100px', align: 'center', font: 'font-sans font-bold text-emerald-700 bg-emerald-50/50', border: 'border-r border-slate-300', baseName: 'Total', maxMarks: 100, formula: 'SUM(h4,h5)' },
      
      // Second Term (B)
      { id: 'h7', text: 'Written Exam', group: 'Second Term (B)', width: '110px', align: 'center', font: 'font-sans', border: 'border-r border-slate-300', baseName: 'Written Exam', maxMarks: 80, term: 'Second Term' },
      { id: 'h8', text: 'Internal Evaluation', group: 'Second Term (B)', width: '125px', align: 'center', font: 'font-sans', border: 'border-r border-slate-300', baseName: 'Internal Evaluation', maxMarks: 20, term: 'Second Term' },
      { id: 'h9', text: 'Total', group: 'Second Term (B)', width: '100px', align: 'center', font: 'font-sans font-bold text-sky-700 bg-sky-50/50', border: 'border-r border-slate-300', baseName: 'Total', maxMarks: 100, formula: 'SUM(h7,h8)' },
      
      // Annual Result Columns
      { id: 'h10', text: 'Total (A+B)', width: '110px', align: 'center', font: 'font-sans font-bold text-indigo-800 bg-indigo-50/50', border: 'border-r border-slate-300', baseName: 'Total (A+B)', maxMarks: 200, formula: 'SUM(h6,h9)' },
      { id: 'h11', text: 'Average', width: '90px', align: 'center', font: 'font-sans font-black text-slate-900 bg-slate-100', border: 'border-r border-slate-300', baseName: 'Average', maxMarks: 100, formula: 'AVERAGE_ROUND(h10)' },
      { id: 'h12', text: 'Grade', width: '80px', align: 'center', font: 'font-mono font-bold text-slate-900 bg-slate-50', border: 'border-r border-slate-300', baseName: 'Grade', formula: 'GRADE(h11)' }
    ],
    rowHeights: {
      '4': 44
    } as Record<string, number>,
    pageSetup: {
      orientation: 'Landscape',
      pageSize: 'A4',
      margins: 'Narrow',
      printArea: 'A:L'
    },
    rows: 15
  },
  {
    id: 'tmpl_class_9_10_math',
    name: 'Class 9–10 Dual Paper Subject Template',
    nameUr: 'کلاس ۹ تا ۱۰ ڈوئل پیپر سبجیکٹ ٹیمپلیٹ',
    description: 'Official Class 9 and 10 Master Mark List layout for Dual Paper Subjects (Mathematics: Math-1/Math-2, Science: Science-1/Science-2, Social Science: History & Politics/Geography) with First Term (Paper 1 40, Paper 2 40, Written Total 80, Internal Evaluation 20 = Total 100), Second Term (Paper 1 40, Paper 2 40, Written Total 80, Internal Evaluation 20 = Total 100), Annual Total (200), Average (100) and Grade.',
    descriptionUr: 'نویں اور دسویں جماعت کے ریاضی کے مضمون کا سرکاری مارک لسٹ فارمیٹ (ریاضی-۱ ۴۰، ریاضی-۲ ۴۰، تحریری کل ۸۰، داخلی قدر پیمائی ۲۰ = کل ۱۰۰)۔',
    academicYear: '2026-27',
    templateCategory: 'Class 9-10 Dual Paper Subject',
    sections: [
      { text: 'NATIONAL HIGH SCHOOL, TALODA', className: 'font-sans font-black text-center text-slate-800 text-lg tracking-wider bg-slate-100 py-3 border-b border-slate-200' },
      { text: 'MASTER MARK LIST - CLASS IX & X (DUAL PAPER SUBJECT)', className: 'font-sans font-bold text-center text-slate-700 text-xs tracking-normal bg-slate-50 py-1 border-b border-slate-200' },
      { text: 'Academic Year: 2026-27 | Board Examination Pattern', className: 'font-mono text-center text-slate-500 text-[10px] py-1 bg-white border-b border-slate-200' }
    ],
    headers: [
      { id: 'h1', text: 'Sr. No.', width: '60px', align: 'center', font: 'font-mono', border: 'border-r border-slate-300', identityType: 'srNo' },
      { id: 'h2', text: 'Exam Seat No.', width: '110px', align: 'center', font: 'font-mono font-bold', border: 'border-r border-slate-300', identityType: 'seatNo' },
      { id: 'h3', text: 'Name of Students', width: '220px', align: 'left', font: 'font-sans font-medium', border: 'border-r border-slate-300', identityType: 'name' },
      
      // First Term (A)
      { id: 'h4', text: 'Math-1', group: 'First Term (A)', width: '90px', align: 'center', font: 'font-sans', border: 'border-r border-slate-300', baseName: 'Math-1', maxMarks: 40, term: 'First Term' },
      { id: 'h5', text: 'Math-2', group: 'First Term (A)', width: '90px', align: 'center', font: 'font-sans', border: 'border-r border-slate-300', baseName: 'Math-2', maxMarks: 40, term: 'First Term' },
      { id: 'h6', text: 'Written Exam Total', group: 'First Term (A)', width: '120px', align: 'center', font: 'font-sans font-semibold text-slate-800 bg-slate-50/50', border: 'border-r border-slate-300', baseName: 'Written Exam Total', maxMarks: 80, formula: 'SUM(h4,h5)' },
      { id: 'h7', text: 'Internal Evaluation', group: 'First Term (A)', width: '125px', align: 'center', font: 'font-sans', border: 'border-r border-slate-300', baseName: 'Internal Evaluation', maxMarks: 20, term: 'First Term' },
      { id: 'h8', text: 'Total', group: 'First Term (A)', width: '100px', align: 'center', font: 'font-sans font-bold text-emerald-700 bg-emerald-50/50', border: 'border-r border-slate-300', baseName: 'Total', maxMarks: 100, formula: 'SUM(h6,h7)' },
      
      // Second Term (B)
      { id: 'h9', text: 'Math-1', group: 'Second Term (B)', width: '90px', align: 'center', font: 'font-sans', border: 'border-r border-slate-300', baseName: 'Math-1', maxMarks: 40, term: 'Second Term' },
      { id: 'h10', text: 'Math-2', group: 'Second Term (B)', width: '90px', align: 'center', font: 'font-sans', border: 'border-r border-slate-300', baseName: 'Math-2', maxMarks: 40, term: 'Second Term' },
      { id: 'h11', text: 'Written Exam Total', group: 'Second Term (B)', width: '120px', align: 'center', font: 'font-sans font-semibold text-slate-800 bg-slate-50/50', border: 'border-r border-slate-300', baseName: 'Written Exam Total', maxMarks: 80, formula: 'SUM(h9,h10)' },
      { id: 'h12', text: 'Internal Evaluation', group: 'Second Term (B)', width: '125px', align: 'center', font: 'font-sans', border: 'border-r border-slate-300', baseName: 'Internal Evaluation', maxMarks: 20, term: 'Second Term' },
      { id: 'h13', text: 'Total', group: 'Second Term (B)', width: '100px', align: 'center', font: 'font-sans font-bold text-sky-700 bg-sky-50/50', border: 'border-r border-slate-300', baseName: 'Total', maxMarks: 100, formula: 'SUM(h11,h12)' },
      
      // Annual Result Columns
      { id: 'h14', text: 'Total (A+B)', width: '110px', align: 'center', font: 'font-sans font-bold text-indigo-800 bg-indigo-50/50', border: 'border-r border-slate-300', baseName: 'Total (A+B)', maxMarks: 200, formula: 'SUM(h8,h13)' },
      { id: 'h15', text: 'Average', width: '90px', align: 'center', font: 'font-sans font-black text-slate-900 bg-slate-100', border: 'border-r border-slate-300', baseName: 'Average', maxMarks: 100, formula: 'AVERAGE_ROUND(h14)' },
      { id: 'h16', text: 'Grade', width: '80px', align: 'center', font: 'font-mono font-bold text-slate-900 bg-slate-50', border: 'border-r border-slate-300', baseName: 'Grade', formula: 'GRADE(h15)' }
    ],
    rowHeights: {
      '4': 44
    } as Record<string, number>,
    pageSetup: {
      orientation: 'Landscape',
      pageSize: 'A4',
      margins: 'Narrow',
      printArea: 'A:P'
    },
    rows: 15
  },
  {
    id: 'tmpl_class_9_10_lang',
    name: 'Class 9–10 Dual Language Template',
    nameUr: 'کلاس ۹ تا ۱۰ ڈوئل لینگویج ٹیمپلیٹ',
    description: 'Official Class 9 and 10 Master Mark List layout for Dual Language composite subjects (Hindi & Marathi) with Hindi (1st & 2nd Term Written 80, Internal 20 = 100) and Marathi (1st & 2nd Term Written 80, Internal 20 = 100), Grand Total (200), Average (100) and Grade.',
    descriptionUr: 'نویں اور دسویں جماعت کے ہندی اور مراٹھی کے مضامین کا سرکاری مارک لسٹ فارمیٹ (ہندی کل ۱۰۰، مراٹھی کل ۱۰۰، کل ۲۰۰، اوسط ۱۰۰ اور گریڈ)۔',
    academicYear: '2026-27',
    templateCategory: 'Class 9-10 Dual Language',
    sections: [
      { text: 'NATIONAL HIGH SCHOOL, TALODA', className: 'font-sans font-black text-center text-slate-800 text-lg tracking-wider bg-slate-100 py-3 border-b border-slate-200' },
      { text: 'MASTER MARK LIST - CLASS IX & X (DUAL LANGUAGE)', className: 'font-sans font-bold text-center text-slate-700 text-xs tracking-normal bg-slate-50 py-1 border-b border-slate-200' },
      { text: 'Academic Year: 2026-27 | Subject: Hindi / Marathi Composite | Board Examination Pattern', className: 'font-mono text-center text-slate-500 text-[10px] py-1 bg-white border-b border-slate-200' }
    ],
    headers: [
      { id: 'h1', text: 'Sr. No.', width: '60px', align: 'center', font: 'font-mono', border: 'border-r border-slate-300', identityType: 'srNo' },
      { id: 'h2', text: 'Exam Seat No.', width: '110px', align: 'center', font: 'font-mono font-bold', border: 'border-r border-slate-300', identityType: 'seatNo' },
      { id: 'h3', text: 'Name of Students', width: '220px', align: 'left', font: 'font-sans font-medium', border: 'border-r border-slate-300', identityType: 'name' },
      
      // HINDI (A)
      // Written Exam
      { id: 'h4', text: '1st Term', group: 'Hindi (A)', width: '90px', align: 'center', font: 'font-sans', border: 'border-r border-slate-300', baseName: 'Hindi 1st Term Written', maxMarks: 40, term: 'First Term' },
      { id: 'h5', text: '2nd Term', group: 'Hindi (A)', width: '90px', align: 'center', font: 'font-sans', border: 'border-r border-slate-300', baseName: 'Hindi 2nd Term Written', maxMarks: 40, term: 'Second Term' },
      { id: 'h6', text: 'Written Total', group: 'Hindi (A)', width: '110px', align: 'center', font: 'font-sans font-semibold text-slate-800 bg-slate-50/50', border: 'border-r border-slate-300', baseName: 'Hindi Written Total', maxMarks: 80, formula: 'SUM(h4,h5)' },
      // Internal Evaluation
      { id: 'h7', text: '1st Term', group: 'Hindi (A)', width: '90px', align: 'center', font: 'font-sans', border: 'border-r border-slate-300', baseName: 'Hindi 1st Term Internal', maxMarks: 10, term: 'First Term' },
      { id: 'h8', text: '2nd Term', group: 'Hindi (A)', width: '90px', align: 'center', font: 'font-sans', border: 'border-r border-slate-300', baseName: 'Hindi 2nd Term Internal', maxMarks: 10, term: 'Second Term' },
      { id: 'h9', text: 'Internal Total', group: 'Hindi (A)', width: '110px', align: 'center', font: 'font-sans font-semibold text-slate-800 bg-slate-50/50', border: 'border-r border-slate-300', baseName: 'Hindi Internal Total', maxMarks: 20, formula: 'SUM(h7,h8)' },
      // Hindi Total
      { id: 'h10', text: 'Hindi Total', group: 'Hindi (A)', width: '110px', align: 'center', font: 'font-sans font-bold text-emerald-700 bg-emerald-50/50', border: 'border-r border-slate-300', baseName: 'Hindi Total', maxMarks: 100, formula: 'SUM(h6,h9)' },

      // MARATHI (B)
      // Written Exam
      { id: 'h11', text: '1st Term', group: 'Marathi (B)', width: '90px', align: 'center', font: 'font-sans', border: 'border-r border-slate-300', baseName: 'Marathi 1st Term Written', maxMarks: 40, term: 'First Term' },
      { id: 'h12', text: '2nd Term', group: 'Marathi (B)', width: '90px', align: 'center', font: 'font-sans', border: 'border-r border-slate-300', baseName: 'Marathi 2nd Term Written', maxMarks: 40, term: 'Second Term' },
      { id: 'h13', text: 'Written Total', group: 'Marathi (B)', width: '110px', align: 'center', font: 'font-sans font-semibold text-slate-800 bg-slate-50/50', border: 'border-r border-slate-300', baseName: 'Marathi Written Total', maxMarks: 80, formula: 'SUM(h11,h12)' },
      // Internal Evaluation
      { id: 'h14', text: '1st Term', group: 'Marathi (B)', width: '90px', align: 'center', font: 'font-sans', border: 'border-r border-slate-300', baseName: 'Marathi 1st Term Internal', maxMarks: 10, term: 'First Term' },
      { id: 'h15', text: '2nd Term', group: 'Marathi (B)', width: '90px', align: 'center', font: 'font-sans', border: 'border-r border-slate-300', baseName: 'Marathi 2nd Term Internal', maxMarks: 10, term: 'Second Term' },
      { id: 'h16', text: 'Internal Total', group: 'Marathi (B)', width: '110px', align: 'center', font: 'font-sans font-semibold text-slate-800 bg-slate-50/50', border: 'border-r border-slate-300', baseName: 'Marathi Internal Total', maxMarks: 20, formula: 'SUM(h14,h15)' },
      // Marathi Total
      { id: 'h17', text: 'Marathi Total', group: 'Marathi (B)', width: '110px', align: 'center', font: 'font-sans font-bold text-sky-700 bg-sky-50/50', border: 'border-r border-slate-300', baseName: 'Marathi Total', maxMarks: 100, formula: 'SUM(h13,h16)' },

      // ANNUAL RESULT / FINAL
      { id: 'h18', text: 'Grand Total (A+B)', width: '120px', align: 'center', font: 'font-sans font-bold text-indigo-800 bg-indigo-50/50', border: 'border-r border-slate-300', baseName: 'Grand Total (A+B)', maxMarks: 200, formula: 'SUM(h10,h17)' },
      { id: 'h19', text: 'Average', width: '90px', align: 'center', font: 'font-sans font-black text-slate-900 bg-slate-100', border: 'border-r border-slate-300', baseName: 'Average', maxMarks: 100, formula: 'AVERAGE_ROUND(h18)' },
      { id: 'h20', text: 'Grade', width: '80px', align: 'center', font: 'font-mono font-bold text-slate-900 bg-slate-50', border: 'border-r border-slate-300', baseName: 'Grade', formula: 'GRADE(h19)' }
    ],
    rowHeights: {
      '4': 44
    } as Record<string, number>,
    pageSetup: {
      orientation: 'Landscape',
      pageSize: 'A4',
      margins: 'Narrow',
      printArea: 'A:T'
    },
    rows: 15
  }
];


const templateIdByKey: Record<ResultTemplateKey, string> = {
  class_1_8_regular: 'tmpl_class_1_8_regular',
  class_1_8_hindi_marathi: 'tmpl_class_1_8_language',
  class_9_10_single: 'tmpl_class_9_10_general',
  class_9_10_dual_paper: 'tmpl_class_9_10_math',
  class_9_10_dual_language: 'tmpl_class_9_10_lang',
  class_11_12_subject: 'tmpl_class_9_10_general',
  grade_subject: 'tmpl_grade_subject',
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

export function getRuntimeClerkMasterTemplate(key: ResultTemplateKey, subjectName = '', preferred?: any): any {
  if (preferred?.headers?.length) return customizeMasterForSubject(clone(preferred), key, subjectName);
  let saved: any[] = [];
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem('erp_master_templates');
      if (raw) saved = JSON.parse(raw);
    } catch { /* fall through to shared Clerk defaults */ }
  }
  const templateId = templateIdByKey[key];
  const fromRuntime = saved.find((x: any) => x?.id === templateId);
  const fromDefault = clerkDefaultMasterTemplates.find((x: any) => x?.id === templateId);
  const raw = fromRuntime || fromDefault; // Never invent a Teacher-only layout: Clerk Master must exist.
  return raw ? customizeMasterForSubject(clone(raw), key, subjectName) : null;
}

function customizeMasterForSubject(master: any, key: ResultTemplateKey, subjectName: string) {
  if (key === 'class_11_12_subject') {
    const label = String(subjectName || 'Subject').trim() || 'Subject';
    master.name = `Class 11–12 ${label} Subject Template`;
    master.description = `Automatic Class 11–12 subject-wise Mark List for ${label}.`;
    master.templateCategory = 'Class 11-12 Subject';
    if (Array.isArray(master?.sections)) {
      master.sections = master.sections.map((section:any, index:number) => index === 1
        ? { ...section, text:`MASTER MARK LIST - CLASS XI & XII (${label.toUpperCase()})` }
        : index === 2
          ? { ...section, text:'Automatic Academic Assignment Template | First Term + Second Term' }
          : section);
    }
    if (Array.isArray(master?.headers)) {
      master.headers = master.headers.map((h:any) => {
        if (h.id === 'h4' || h.id === 'h7') return { ...h, text:'Theory / Written', baseName:'Theory / Written' };
        if (h.id === 'h5' || h.id === 'h8') return { ...h, text:'Internal / Practical', baseName:'Internal / Practical' };
        return h;
      });
    }
  }
  if (key === 'class_9_10_dual_paper' && Array.isArray(master?.headers)) {
    const { paper1, paper2 } = getDualPaperNames(subjectName);
    master.headers = master.headers.map((h: any) => {
      if (h.id === 'h4' || h.id === 'h9') return { ...h, text: paper1, baseName: paper1 };
      if (h.id === 'h5' || h.id === 'h10') return { ...h, text: paper2, baseName: paper2 };
      return h;
    });
  }
  return master;
}

export function currentTermLabel(term: ResultTerm) {
  return term === 'first_term' ? 'First Term' : 'Second Term';
}

export function legacyHeaderBinding(key: ResultTemplateKey, header: any, term: ResultTerm, languageRow?: 'hindi'|'marathi'|'total'):
  { markKey?: string; calculatedKey?: string; editable: boolean; activeTerm: boolean; annual: boolean } {
  const id = String(header?.id || '');
  const selected = currentTermLabel(term);
  const headerTerm = String(header?.term || '');
  const activeTerm = !headerTerm || headerTerm === selected;
  const annual = !headerTerm && Boolean(header?.formula) && (key === 'class_9_10_single' || key === 'class_9_10_dual_paper' || key === 'class_9_10_dual_language');

  if (key === 'class_1_8_regular') {
    const map: Record<string,string> = { h4:'oral', h5:'practical', h6:'formative_total', h7:'written', h8:'summative_total', h9:'grand_total', h10:'grade' };
    const k=map[id];
    return { markKey: header?.formula ? undefined : k, calculatedKey: header?.formula ? k : undefined, editable: Boolean(k && !header?.formula), activeTerm:true, annual:false };
  }
  if (key === 'class_1_8_hindi_marathi') {
    if (!languageRow || languageRow === 'total') return { editable:false, activeTerm:true, annual:false };
    const prefix=languageRow;
    const map: Record<string,string> = {
      h4:`${prefix}_listening`, h5:`${prefix}_speaking`, h6:`${prefix}_reading`, h7:`${prefix}_writing`, h8:`${prefix}_dictation`,
      h9:`${prefix}_formative_total`, h10:`${prefix}_written`, h11:`${prefix}_written`, h12:`${prefix}_total`,
    };
    const k=map[id];
    return { markKey: header?.formula ? undefined : k, calculatedKey: header?.formula ? k : undefined, editable:Boolean(k && !header?.formula), activeTerm:true, annual:false };
  }
  if (key === 'class_9_10_single') {
    const group = term === 'first_term' ? { h4:'written', h5:'internal', h6:'total' } : { h7:'written', h8:'internal', h9:'total' };
    const k=(group as any)[id];
    return { markKey: header?.formula ? undefined : k, calculatedKey: header?.formula ? k : undefined, editable:Boolean(k && !header?.formula && activeTerm), activeTerm:Boolean(k), annual:!k };
  }
  if (key === 'class_11_12_subject') {
    const group = term === 'first_term' ? { h4:'theory', h5:'internal_practical', h6:'total' } : { h7:'theory', h8:'internal_practical', h9:'total' };
    const k=(group as any)[id];
    return { markKey: header?.formula ? undefined : k, calculatedKey: header?.formula ? k : undefined, editable:Boolean(k && !header?.formula && activeTerm), activeTerm:Boolean(k), annual:!k };
  }
  if (key === 'class_9_10_dual_paper') {
    const group = term === 'first_term'
      ? { h4:'paper_1', h5:'paper_2', h6:'written_total', h7:'internal', h8:'total' }
      : { h9:'paper_1', h10:'paper_2', h11:'written_total', h12:'internal', h13:'total' };
    const k=(group as any)[id];
    return { markKey: header?.formula ? undefined : k, calculatedKey: header?.formula ? k : undefined, editable:Boolean(k && !header?.formula && activeTerm), activeTerm:Boolean(k), annual:!k };
  }
  if (key === 'class_9_10_dual_language') {
    const first = term === 'first_term';
    const map: Record<string,string> = first
      ? { h4:'hindi_written', h7:'hindi_internal', h11:'marathi_written', h14:'marathi_internal' }
      : { h5:'hindi_written', h8:'hindi_internal', h12:'marathi_written', h15:'marathi_internal' };
    const k=map[id];
    return { markKey:k, editable:Boolean(k), activeTerm:Boolean(k), annual:!k };
  }
  if (key === 'grade_subject') {
    return id === 'h4' ? { markKey:'assessment', editable:true, activeTerm:true, annual:false }
      : id === 'h5' ? { markKey:'grade', editable:true, activeTerm:true, annual:false }
      : { editable:false, activeTerm:true, annual:false };
  }
  return { editable:false, activeTerm, annual };
}
