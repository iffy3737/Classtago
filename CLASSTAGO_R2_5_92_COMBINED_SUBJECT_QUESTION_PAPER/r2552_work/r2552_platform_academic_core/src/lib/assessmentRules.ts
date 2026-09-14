/**
 * Central Assessment Weightage Rule Resolver for National High School ERP
 *
 * Class-wise Formative & Summative weightage rules:
 * - Class 1 and 2: Formative = 70, Summative = 30, Total = 100
 * - Class 3 and 4: Formative = 60, Summative = 40, Total = 100
 * - Class 5 and 6: Formative = 50, Summative = 50, Total = 100
 * - Class 7 and 8: Formative = 40, Summative = 60, Total = 100
 */

export interface ClassAssessmentWeightage {
  stdNumber: number | null;
  formativeMax: number;
  summativeMax: number;
  totalMax: number;
}

export interface SubComponentBreakdown {
  homeworkMax: number;
  assignmentMax: number;
  oralMax: number;
  unitTestMax: number;
  projectMax: number;
  writtenExamMax: number;
}

/**
 * Safely normalizes any class representation to a standard numeric grade (1 to 12).
 * Handles formats like: 1, "1", "Class 1", "Class 1 - A", "Std 1", "Standard 1", "I", "CLASS I", etc.
 */
export function normalizeClassStandard(className: string | number | undefined | null): number | null {
  if (className === undefined || className === null) return null;
  const str = String(className).trim().toUpperCase();
  if (!str) return null;

  // Handle Roman Numerals first (safely checking word boundaries / prefixes)
  if (/\b(CLASS|STD|STANDARD)?\s*XII\b/i.test(str) || /\bXII\b/.test(str)) return 12;
  if (/\b(CLASS|STD|STANDARD)?\s*XI\b/i.test(str) || /\bXI\b/.test(str)) return 11;
  if (/\b(CLASS|STD|STANDARD)?\s*IX\b/i.test(str) || /\bIX\b/.test(str)) return 9;
  if (/\b(CLASS|STD|STANDARD)?\s*X\b/i.test(str) || /\bX\b/.test(str)) return 10;

  if (/\b(CLASS|STD|STANDARD)?\s*VIII\b/i.test(str) || /\bVIII\b/.test(str)) return 8;
  if (/\b(CLASS|STD|STANDARD)?\s*VII\b/i.test(str) || /\bVII\b/.test(str)) return 7;
  if (/\b(CLASS|STD|STANDARD)?\s*VI\b/i.test(str) || /\bVI\b/.test(str)) return 6;
  if (/\b(CLASS|STD|STANDARD)?\s*IV\b/i.test(str) || /\bIV\b/.test(str)) return 4;
  if (/\b(CLASS|STD|STANDARD)?\s*V\b/i.test(str) || /\bV\b/.test(str)) return 5;
  if (/\b(CLASS|STD|STANDARD)?\s*III\b/i.test(str) || /\bIII\b/.test(str)) return 3;
  if (/\b(CLASS|STD|STANDARD)?\s*II\b/i.test(str) || /\bII\b/.test(str)) return 2;
  if (/\b(CLASS|STD|STANDARD)?\s*I\b/i.test(str) || /\bI\b/.test(str)) return 1;

  // Numerical extraction e.g. "Class 5", "5", "Std 3-A"
  const match = str.match(/\d+/);
  if (match) {
    const val = parseInt(match[0], 10);
    if (val >= 1 && val <= 12) return val;
  }

  return null;
}

/**
 * Single Central Resolver for Class Assessment Weightage
 */
export function getClassAssessmentWeightage(className: string | number | undefined | null): ClassAssessmentWeightage {
  const stdNumber = normalizeClassStandard(className);

  if (stdNumber === 1 || stdNumber === 2) {
    return { stdNumber, formativeMax: 70, summativeMax: 30, totalMax: 100 };
  }
  if (stdNumber === 3 || stdNumber === 4) {
    return { stdNumber, formativeMax: 60, summativeMax: 40, totalMax: 100 };
  }
  if (stdNumber === 5 || stdNumber === 6) {
    return { stdNumber, formativeMax: 50, summativeMax: 50, totalMax: 100 };
  }
  if (stdNumber === 7 || stdNumber === 8) {
    return { stdNumber, formativeMax: 40, summativeMax: 60, totalMax: 100 };
  }

  // Safe fallback if class cannot be resolved or is standard 9+
  return { stdNumber, formativeMax: 50, summativeMax: 50, totalMax: 100 };
}

/**
 * Helper to get component breakdown for worksheets that display sub-formative heads
 */
export function getSubComponentBreakdown(className: string | number | undefined | null): SubComponentBreakdown {
  const weightage = getClassAssessmentWeightage(className);

  if (weightage.formativeMax === 70) {
    return {
      homeworkMax: 10,
      assignmentMax: 15,
      oralMax: 15,
      unitTestMax: 20,
      projectMax: 10,
      writtenExamMax: 30
    };
  }
  if (weightage.formativeMax === 60) {
    return {
      homeworkMax: 10,
      assignmentMax: 10,
      oralMax: 10,
      unitTestMax: 20,
      projectMax: 10,
      writtenExamMax: 40
    };
  }
  if (weightage.formativeMax === 40) {
    return {
      homeworkMax: 5,
      assignmentMax: 5,
      oralMax: 10,
      unitTestMax: 10,
      projectMax: 10,
      writtenExamMax: 60
    };
  }

  // Default / 50-50 (Class 5 & 6)
  return {
    homeworkMax: 10,
    assignmentMax: 10,
    oralMax: 10,
    unitTestMax: 10,
    projectMax: 10,
    writtenExamMax: 50
  };
}

/**
 * Returns dynamic paper names for Class 9-10 Dual Paper Subject Template based on selected subject.
 * - Mathematics -> Paper 1 = Math-1, Paper 2 = Math-2
 * - Science & Technology -> Paper 1 = Science-1, Paper 2 = Science-2
 * - Social Science -> Paper 1 = History & Politics, Paper 2 = Geography
 */
export function getDualPaperNames(subject: string): { paper1: string; paper2: string } {
  const s = String(subject || '').toLowerCase().trim();
  if (s.includes('sci') || s.includes('science') || s.includes('विज्ञान') || s.includes('سائنس')) {
    return { paper1: 'Science-1', paper2: 'Science-2' };
  }
  if (s.includes('social') || s.includes('soc') || s.includes('sst') || s.includes('history') || s.includes('geography') || s.includes('civics') || s.includes('politics') || s.includes('सामाजिक') || s.includes('سماجی')) {
    return { paper1: 'History & Politics', paper2: 'Geography' };
  }
  return { paper1: 'Math-1', paper2: 'Math-2' };
}

/**
 * Determines whether a subject allocation in Class 9 or 10 is a Dual Language Subject
 * (Hindi & Marathi composite format).
 */
export function isClass9or10DualLangSubject(alloc: any): boolean {
  if (!alloc) return false;
  const className = typeof alloc === 'string' ? alloc : (alloc.className || alloc.classId || alloc.class_name || '');
  const std = normalizeClassStandard(className);
  if (std !== 9 && std !== 10) return false;

  if (typeof alloc === 'object') {
    const templateId = alloc.templateId || alloc.assignedTemplate || alloc.template_id;
    const category = alloc.templateCategory || alloc.category || alloc.subjectCategory;

    if (templateId === 'tmpl_class_9_10_lang' || category === 'Class 9-10 Dual Language' || category === 'Class 9-10 Hindi/Marathi') {
      return true;
    }

    const subjName = String(alloc.subjectName || alloc.subjectId || alloc.subject || '').toLowerCase().trim();
    const subjId = String(alloc.subjectId || '').toLowerCase().trim();

    const isHindi = subjName.includes('hindi') || subjId.includes('hindi') || subjName.includes('हिंदी') || subjName.includes('ہندی');
    const isMarathi = subjName.includes('marathi') || subjId.includes('marathi') || subjName.includes('मराठी') || subjName.includes('مراٹھی');
    return isHindi || isMarathi;
  }

  return false;
}
export const isClass9or10LangSubject = isClass9or10DualLangSubject;

/**
 * Determines whether a subject allocation in Class 9 or 10 is a Dual Paper Subject
 * (Mathematics, Science & Technology, Social Science).
 */
export function isClass9or10DualPaperSubject(alloc: any): boolean {
  if (!alloc) return false;
  const className = typeof alloc === 'string' ? alloc : (alloc.className || alloc.classId || alloc.class_name || '');
  const std = normalizeClassStandard(className);
  if (std !== 9 && std !== 10) return false;

  if (typeof alloc === 'object') {
    const templateId = alloc.templateId || alloc.assignedTemplate || alloc.template_id;
    const category = alloc.templateCategory || alloc.category || alloc.subjectCategory;

    if (templateId === 'tmpl_class_9_10_math' || category === 'Class 9-10 Dual Paper Subject' || category === 'Class 9-10 Mathematics') {
      return true;
    }

    const subjName = String(alloc.subjectName || alloc.subjectId || alloc.subject || '').toLowerCase().trim();
    const subjId = String(alloc.subjectId || '').toLowerCase().trim();

    const isMath = subjName.includes('math') || subjId.includes('math') || subjName.includes('गणित') || subjName.includes('ریاضی');
    const isSci = subjName.includes('sci') || subjId.includes('sci') || subjName.includes('science') || subjName.includes('विज्ञान') || subjName.includes('سائنس');
    const isSoc = subjName.includes('social') || subjId.includes('social') || subjId.includes('sst') || subjName.includes('sst') || subjName.includes('history') || subjName.includes('geography') || subjName.includes('civics') || subjName.includes('politics') || subjName.includes('सामाजिक') || subjName.includes('سماجی');

    return isMath || isSci || isSoc;
  }

  return false;
}
export const isClass9or10MathSubject = isClass9or10DualPaperSubject;

/**
 * Determines whether a subject allocation in Class 9 or 10 is a Single Subject
 * (English, Urdu, or single paper subjects - Written Exam 80 + Internal Evaluation 20 format).
 */
export function isClass9or10SingleSubject(alloc: any): boolean {
  if (!alloc) return false;
  const className = typeof alloc === 'string' ? alloc : (alloc.className || alloc.classId || alloc.class_name || '');
  const std = normalizeClassStandard(className);
  if (std !== 9 && std !== 10) return false;

  if (typeof alloc === 'object') {
    const templateId = alloc.templateId || alloc.assignedTemplate || alloc.template_id;
    const category = alloc.templateCategory || alloc.category || alloc.subjectCategory;

    if (templateId === 'tmpl_class_9_10_general' || category === 'Class 9-10 Single Subject' || category === 'Class 9-10 General Subject') {
      return true;
    }

    if (isClass9or10DualPaperSubject(alloc) || isClass9or10DualLangSubject(alloc)) {
      return false;
    }
  }

  return true;
}
export const isClass9or10GeneralSubject = isClass9or10SingleSubject;


