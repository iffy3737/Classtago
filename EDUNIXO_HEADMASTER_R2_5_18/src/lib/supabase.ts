/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  User, ClassStructure, Notice, TimetableEntry, 
  HomeworkEntry, FeeRecord, AuditLogEntry, SupabaseConfig, MasterAcademicSetup,
  MasterDataItem, MasterLocationItem, TeacherProfile, SubjectAllocation, ClassTeacherAssignment,
  ReservedPeriod, TimetableVersion,
  Examination, ExamTermItem, ExamTypeItem, ClassExamMapping, GradeSystemConfig, ExamScheduleEntry,
  QuestionBankItem, QuestionPaperQuestion, QuestionPaper, QuestionType,
  FormativeHead, SummativeHead, AssessmentPattern, MarkListTemplate, StudentMarkEntry, SubjectLockState,
  SystemNotification, VisitorRecord, StudentGatePass, StaffGatePass, VehicleRecord,
  StaffMasterRecord
} from '../types';

// Structural offline compatibility defaults. Operational records are never seeded.

const initialStaffMaster: StaffMasterRecord[] = [];

const initialClasses: ClassStructure[] = [];

const initialUsers: User[] = [];

const initialNotices: Notice[] = [];

const initialTimetable: TimetableEntry[] = [];

const initialHomework: HomeworkEntry[] = [];

const initialFees: FeeRecord[] = [];

const initialAuditLogs: AuditLogEntry[] = [];

// In-memory cache for ultra-fast zero-latency client state access
const dbCache = new Map<string, any>();

export const clearLocalERPCache = () => {
  dbCache.clear();
};

// Helper to load or initialize standard client state storage
const getLocalStorageItem = <T>(key: string, defaultValue: T): T => {
  if (dbCache.has(key)) {
    return dbCache.get(key) as T;
  }
  try {
    const stored = localStorage.getItem(`nhs_erp_${key}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      dbCache.set(key, parsed);
      return parsed;
    }
    localStorage.setItem(`nhs_erp_${key}`, JSON.stringify(defaultValue));
    dbCache.set(key, defaultValue);
    return defaultValue;
  } catch (error) {
    console.error(`Error loading local state ${key}:`, error);
    return defaultValue;
  }
};

const setLocalStorageItem = <T>(key: string, value: T) => {
  dbCache.set(key, value);
  try {
    localStorage.setItem(`nhs_erp_${key}`, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving local state ${key}:`, error);
  }
};

// Production mobile package: no hard-coded legacy user/name cleanup table.
function runR84SafeLegacyTeacherCleanupOnce(): void { /* intentionally empty */ }

const initialAcademicSetup: MasterAcademicSetup = {
  schoolProfile: {
    schoolName: "National High School, Taloda",
    managementName: "",
    udiseCode: "",
    schoolCode: "",
    address: "",
    villageCity: "Taloda",
    taluka: "Taloda",
    district: "Nandurbar",
    state: "Maharashtra",
    pinCode: "",
    phoneNumbers: "",
    whatsAppNumber: "",
    email: "",
    website: "",
    principalName: "",
    schoolLogo: "",
    schoolSeal: "",
    principalSignature: "",
    headmasterSignature: "",
    clerkSignature: "",
    primaryMedium: "Marathi / Semi-English Medium",
    secondaryMedium: "Urdu Medium / English Medium",
    regNumber: ""
  },
  academicYears: [
    { id: 'ay1', year: "2024-25", isActive: false, isLocked: true },
    { id: 'ay2', year: "2025-26", isActive: false, isLocked: true },
    { id: 'ay3', year: "2026-27", isActive: true, isLocked: false }
  ],
  classes: [
    { id: 'cl1', className: "Class 1", isEnabled: true },
    { id: 'cl2', className: "Class 2", isEnabled: true },
    { id: 'cl3', className: "Class 3", isEnabled: true },
    { id: 'cl4', className: "Class 4", isEnabled: true },
    { id: 'cl5', className: "Class 5", isEnabled: true },
    { id: 'cl6', className: "Class 6", isEnabled: true },
    { id: 'cl7', className: "Class 7", isEnabled: true },
    { id: 'cl8', className: "Class 8", isEnabled: true },
    { id: 'cl9', className: "Class 9", isEnabled: true },
    { id: 'cl10', className: "Class 10", isEnabled: true },
    { id: 'cl11', className: "Class 11", isEnabled: true },
    { id: 'cl12', className: "Class 12", isEnabled: true }
  ],
  divisions: [
    { id: 'div1', divisionName: "No Division", isEnabled: true },
    { id: 'div2', divisionName: "A", isEnabled: true },
    { id: 'div3', divisionName: "B", isEnabled: true },
    { id: 'div4', divisionName: "C", isEnabled: true },
    { id: 'div5', divisionName: "D", isEnabled: true },
    { id: 'div6', divisionName: "E", isEnabled: true },
    { id: 'div7', divisionName: "Urdu Medium", isEnabled: true },
    { id: 'div8', divisionName: "Science", isEnabled: true },
    { id: 'div9', divisionName: "Commerce", isEnabled: true }
  ],
  mediums: [
    { id: 'med1', mediumName: "Urdu", isEnabled: true },
    { id: 'med2', mediumName: "Marathi", isEnabled: true },
    { id: 'med3', mediumName: "English", isEnabled: true },
    { id: 'med4', mediumName: "Hindi", isEnabled: true }
  ],
  subjects: [
    { id: 'sub1', subjectCode: "URD-01", subjectName: "Urdu", subjectType: "Language", language: "Urdu", isScholastic: true, boardMapping: ["board1"], classMapping: ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10"], maxMarks: 100, passingMarks: 35, printOrder: 1, isActive: true },
    { id: 'sub2', subjectCode: "HIN-02", subjectName: "Hindi", subjectType: "Language", language: "Hindi", isScholastic: true, boardMapping: ["board1"], classMapping: ["Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10"], maxMarks: 100, passingMarks: 35, printOrder: 2, isActive: true },
    { id: 'sub3', subjectCode: "MAR-03", subjectName: "Marathi", subjectType: "Language", language: "Marathi", isScholastic: true, boardMapping: ["board1"], classMapping: ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10"], maxMarks: 100, passingMarks: 35, printOrder: 3, isActive: true },
    { id: 'sub4', subjectCode: "ENG-04", subjectName: "English", subjectType: "Language", language: "English", isScholastic: true, boardMapping: ["board1", "board2"], classMapping: ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"], maxMarks: 100, passingMarks: 35, printOrder: 4, isActive: true },
    { id: 'sub5', subjectCode: "MAT-05", subjectName: "Mathematics", subjectType: "Core", language: "None", isScholastic: true, boardMapping: ["board1", "board2"], classMapping: ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10"], maxMarks: 100, passingMarks: 35, printOrder: 5, isActive: true },
    { id: 'sub6', subjectCode: "SCI-06", subjectName: "Science", subjectType: "Core", language: "None", isScholastic: true, boardMapping: ["board1", "board2"], classMapping: ["Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10"], maxMarks: 100, passingMarks: 35, printOrder: 6, isActive: true },
    { id: 'sub7', subjectCode: "EVS-07", subjectName: "EVS", subjectType: "Core", language: "None", isScholastic: true, boardMapping: ["board1"], classMapping: ["Class 1", "Class 2", "Class 3", "Class 4"], maxMarks: 50, passingMarks: 18, printOrder: 7, isActive: true },
    { id: 'sub8', subjectCode: "HIS-08", subjectName: "History", subjectType: "Core", language: "None", isScholastic: true, boardMapping: ["board1"], classMapping: ["Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10"], maxMarks: 50, passingMarks: 18, printOrder: 8, isActive: true },
    { id: 'sub9', subjectCode: "GEO-09", subjectName: "Geography", subjectType: "Core", language: "None", isScholastic: true, boardMapping: ["board1"], classMapping: ["Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10"], maxMarks: 50, passingMarks: 18, printOrder: 9, isActive: true },
    { id: 'sub10', subjectCode: "PHY-10", subjectName: "Physics", subjectType: "Core", language: "None", isScholastic: true, boardMapping: ["board1", "board2"], classMapping: ["Class 11", "Class 12"], maxMarks: 100, passingMarks: 35, printOrder: 10, isActive: true },
    { id: 'sub11', subjectCode: "CHE-11", subjectName: "Chemistry", subjectType: "Core", language: "None", isScholastic: true, boardMapping: ["board1", "board2"], classMapping: ["Class 11", "Class 12"], maxMarks: 100, passingMarks: 35, printOrder: 11, isActive: true },
    { id: 'sub12', subjectCode: "BIO-12", subjectName: "Biology", subjectType: "Core", language: "None", isScholastic: true, boardMapping: ["board1", "board2"], classMapping: ["Class 11", "Class 12"], maxMarks: 100, passingMarks: 35, printOrder: 12, isActive: true },
    { id: 'sub13', subjectCode: "COM-13", subjectName: "Commerce", subjectType: "Vocational", language: "None", isScholastic: true, boardMapping: ["board1"], classMapping: ["Class 11", "Class 12"], maxMarks: 100, passingMarks: 35, printOrder: 13, isActive: true },
    { id: 'sub14', subjectCode: "ECO-14", subjectName: "Economics", subjectType: "Core", language: "None", isScholastic: true, boardMapping: ["board1"], classMapping: ["Class 11", "Class 12"], maxMarks: 100, passingMarks: 35, printOrder: 14, isActive: true },
    { id: 'sub15', subjectCode: "DIN-15", subjectName: "Diniyat", subjectType: "Elective", language: "Urdu", isScholastic: false, boardMapping: ["board4"], classMapping: ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10"], maxMarks: 50, passingMarks: 18, printOrder: 15, isActive: true },
    { id: 'sub16', subjectCode: "ARA-16", subjectName: "Arabic", subjectType: "Elective", language: "None", isScholastic: true, boardMapping: ["board1"], classMapping: ["Class 8", "Class 9", "Class 10"], maxMarks: 100, passingMarks: 35, printOrder: 16, isActive: true },
    { id: 'sub17', subjectCode: "COMP-17", subjectName: "Computer", subjectType: "Elective", language: "English", isScholastic: false, boardMapping: ["board1", "board2"], classMapping: ["Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10"], maxMarks: 50, passingMarks: 18, printOrder: 17, isActive: true },
    { id: 'sub18', subjectCode: "HPE-18", subjectName: "Health & Physical Education", subjectType: "Elective", language: "None", isScholastic: false, boardMapping: ["board1", "board2"], classMapping: ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"], maxMarks: 50, passingMarks: 18, printOrder: 18, isActive: true }
  ],
  subjectGroups: [
    { id: 'grp1', groupName: "Languages", subjectIds: ["sub1", "sub2", "sub3", "sub4"] },
    { id: 'grp2', groupName: "Science", subjectIds: ["sub6", "sub10", "sub11", "sub12"] },
    { id: 'grp3', groupName: "Social Science", subjectIds: ["sub8", "sub9"] },
    { id: 'grp4', groupName: "Commerce", subjectIds: ["sub13", "sub14"] },
    { id: 'grp5', groupName: "Co-Scholastic", subjectIds: ["sub15", "sub17", "sub18"] }
  ],
  boards: [
    { id: 'board1', boardName: "Maharashtra State Board", isDefault: true, isEnabled: true },
    { id: 'board2', boardName: "CBSE", isDefault: false, isEnabled: true },
    { id: 'board3', boardName: "ICSE", isDefault: false, isEnabled: true },
    { id: 'board4', boardName: "Custom Board", isDefault: false, isEnabled: true }
  ],
  examTerms: [
    { id: 'first_term', termName: "FIRST TERM", maxMarksWeightage: 100, isActive: true },
    { id: 'second_term', termName: "SECOND TERM", maxMarksWeightage: 100, isActive: true },
    { id: 'ex_1', termName: "Unit Test-I", maxMarksWeightage: 10, isActive: false },
    { id: 'ex_2', termName: "First Semester Examination", maxMarksWeightage: 50, isActive: false },
    { id: 'ex_3', termName: "Unit Test-II", maxMarksWeightage: 10, isActive: false },
    { id: 'ex_4', termName: "Annual Examination", maxMarksWeightage: 100, isActive: false },
    { id: 'term1', termName: "Formative-1", maxMarksWeightage: 10, isActive: false },
    { id: 'term2', termName: "Formative-2", maxMarksWeightage: 10, isActive: false },
    { id: 'term3', termName: "SA-1", maxMarksWeightage: 30, isActive: false },
    { id: 'term4', termName: "Summative-1", maxMarksWeightage: 10, isActive: false },
    { id: 'term5', termName: "Summative-2", maxMarksWeightage: 10, isActive: false },
    { id: 'term6', termName: "SA-2", maxMarksWeightage: 30, isActive: false }
  ],
  gradeScales: [
    { id: 'gr1', gradeName: "A1", minPercentage: 91, maxPercentage: 100, gradePoints: 10, remarks: "Outstanding" },
    { id: 'gr2', gradeName: "A2", minPercentage: 81, maxPercentage: 90, gradePoints: 9, remarks: "Excellent" },
    { id: 'gr3', gradeName: "B1", minPercentage: 71, maxPercentage: 80, gradePoints: 8, remarks: "Very Good" },
    { id: 'gr4', gradeName: "B2", minPercentage: 61, maxPercentage: 70, gradePoints: 7, remarks: "Good" },
    { id: 'gr5', gradeName: "C1", minPercentage: 51, maxPercentage: 60, gradePoints: 6, remarks: "Above Average" },
    { id: 'gr6', gradeName: "C2", minPercentage: 41, maxPercentage: 50, gradePoints: 5, remarks: "Average" },
    { id: 'gr7', gradeName: "D", minPercentage: 35, maxPercentage: 40, gradePoints: 4, remarks: "Pass" },
    { id: 'gr8', gradeName: "E", minPercentage: 0, maxPercentage: 34, gradePoints: 0, remarks: "Needs Improvement" }
  ],
  schoolTiming: {
    openingTime: "08:00 AM",
    closingTime: "01:30 PM",
    prayerTime: "08:15 AM",
    lunchBreakStart: "10:30 AM",
    lunchBreakEnd: "11:00 AM",
    shortBreakStart: "12:15 PM",
    shortBreakEnd: "12:25 PM",
    workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    holidayRules: "Standard government & local community holidays observed."
  },
  periods: [
    { id: 'p0', periodName: "Assembly", periodNumber: 0, startTime: "08:00 AM", endTime: "08:15 AM", durationMinutes: 15, type: 'Assembly' },
    { id: 'p1', periodName: "Period 1", periodNumber: 1, startTime: "08:15 AM", endTime: "09:00 AM", durationMinutes: 45, type: 'Lecture' },
    { id: 'p2', periodName: "Period 2", periodNumber: 2, startTime: "09:00 AM", endTime: "09:45 AM", durationMinutes: 45, type: 'Lecture' },
    { id: 'p3', periodName: "Period 3", periodNumber: 3, startTime: "09:45 AM", endTime: "10:30 AM", durationMinutes: 45, type: 'Lecture' },
    { id: 'p_lunch', periodName: "Lunch Break", periodNumber: 0, startTime: "10:30 AM", endTime: "11:00 AM", durationMinutes: 30, type: 'Break' },
    { id: 'p4', periodName: "Period 4", periodNumber: 4, startTime: "11:00 AM", endTime: "11:45 AM", durationMinutes: 45, type: 'Lecture' },
    { id: 'p5', periodName: "Period 5", periodNumber: 5, startTime: "11:45 AM", endTime: "12:30 PM", durationMinutes: 45, type: 'Lecture' },
    { id: 'p6', periodName: "Period 6", periodNumber: 6, startTime: "12:30 PM", endTime: "01:15 PM", durationMinutes: 45, type: 'Lecture' },
    { id: 'p_sports', periodName: "Sports / Library", periodNumber: 7, startTime: "01:15 PM", endTime: "01:30 PM", durationMinutes: 15, type: 'Sports' }
  ],
  holidays: [],
  documents: [
    { id: 'doc1', documentName: "Birth Certificate", isRequired: true, description: "Official municipal birth certificate copy" },
    { id: 'doc2', documentName: "Aadhaar Card", isRequired: true, description: "12-digit Unique Identification Authority of India Card copy" },
    { id: 'doc3', documentName: "Transfer Certificate (TC) / School Leaving Certificate", isRequired: true, description: "Original leaving certificate from prior school" },
    { id: 'doc4', documentName: "Caste Certificate", isRequired: false, description: "Required only for category benefit validations" },
    { id: 'doc5', documentName: "Income Certificate", isRequired: false, description: "Required for state scholarship claims" },
    { id: 'doc6', documentName: "Passport Size Photograph", isRequired: true, description: "Recent photo with white background (3 copies)" }
  ],
  printSettings: {
    paperSize: "A4",
    orientation: "Portrait",
    marginTop: 15,
    marginBottom: 15,
    marginLeft: 15,
    marginRight: 15,
    showHeader: true,
    showFooter: true,
    logoPosition: "Left",
    watermarkText: "NATIONAL HIGH SCHOOL TALODA",
    enableQRCode: true
  },
  globalSettings: {
    defaultLanguage: "en",
    defaultAcademicYearId: "ay3",
    defaultBoardId: "board1",
    defaultMediumId: "med1",
    defaultClassId: "cl9",
    defaultTimeZone: "IST",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "12h",
    currency: "INR",
    registrationMode: "self_approval",
    parentApprovalRequired: true
  }
};

// Default Sub-Masters for central Master Data Management
export const defaultReligions: MasterDataItem[] = [
  { id: 'rel1', name: 'Islam', isActive: true, isSystem: true },
  { id: 'rel2', name: 'Hinduism', isActive: true, isSystem: true },
  { id: 'rel3', name: 'Buddhism', isActive: true, isSystem: true },
  { id: 'rel4', name: 'Sikhism', isActive: true, isSystem: true },
  { id: 'rel5', name: 'Christianity', isActive: true, isSystem: true },
  { id: 'rel6', name: 'Jainism', isActive: true, isSystem: true },
  { id: 'rel7', name: 'Other', isActive: true, isSystem: true }
];

export const defaultCategories: MasterDataItem[] = [
  { id: 'cat1', name: 'OBC', isActive: true, isSystem: true },
  { id: 'cat2', name: 'General', isActive: true, isSystem: true },
  { id: 'cat3', name: 'SC', isActive: true, isSystem: true },
  { id: 'cat4', name: 'ST', isActive: true, isSystem: true },
  { id: 'cat5', name: 'NT', isActive: true, isSystem: true },
  { id: 'cat6', name: 'SBC', isActive: true, isSystem: true },
  { id: 'cat7', name: 'Minority', isActive: true, isSystem: true }
];

export const defaultCastes: MasterDataItem[] = [
  { id: 'cst1', name: 'Muslim-Sheikh', isActive: true },
  { id: 'cst2', name: 'Muslim-Sayyid', isActive: true },
  { id: 'cst3', name: 'Muslim-Pathan', isActive: true },
  { id: 'cst4', name: 'Maratha', isActive: true },
  { id: 'cst5', name: 'Kunbi', isActive: true },
  { id: 'cst6', name: 'Brahmin', isActive: true },
  { id: 'cst7', name: 'Chamar', isActive: true },
  { id: 'cst8', name: 'Bhil', isActive: true }
];

export const defaultNationalities: MasterDataItem[] = [
  { id: 'nat1', name: 'Indian', isActive: true, isSystem: true },
  { id: 'nat2', name: 'Other', isActive: true }
];

export const defaultMotherTongues: MasterDataItem[] = [
  { id: 'mt1', name: 'Urdu', isActive: true },
  { id: 'mt2', name: 'Marathi', isActive: true },
  { id: 'mt3', name: 'Hindi', isActive: true },
  { id: 'mt4', name: 'English', isActive: true },
  { id: 'mt5', name: 'Gujarati', isActive: true }
];

export const defaultBloodGroups: MasterDataItem[] = [
  { id: 'bg1', name: 'O+', isActive: true, isSystem: true },
  { id: 'bg2', name: 'O-', isActive: true, isSystem: true },
  { id: 'bg3', name: 'A+', isActive: true, isSystem: true },
  { id: 'bg4', name: 'A-', isActive: true, isSystem: true },
  { id: 'bg5', name: 'B+', isActive: true, isSystem: true },
  { id: 'bg6', name: 'B-', isActive: true, isSystem: true },
  { id: 'bg7', name: 'AB+', isActive: true, isSystem: true },
  { id: 'bg8', name: 'AB-', isActive: true, isSystem: true }
];

export const defaultAdmissionTypes: MasterDataItem[] = [
  { id: 'at1', name: 'Regular Admission', isActive: true, isSystem: true },
  { id: 'at2', name: 'Transfer / RTE Admission', isActive: true, isSystem: true },
  { id: 'at3', name: 'Management Quota', isActive: true, isSystem: true }
];

export const defaultHouses: MasterDataItem[] = [
  { id: 'hs1', name: 'Red House (Razi)', isActive: true },
  { id: 'hs2', name: 'Green House (Iqbal)', isActive: true },
  { id: 'hs3', name: 'Blue House (Galib)', isActive: true },
  { id: 'hs4', name: 'Yellow House (Sir Syed)', isActive: true }
];

export const defaultGenders: MasterDataItem[] = [
  { id: 'g1', name: 'Male', isActive: true, isSystem: true },
  { id: 'g2', name: 'Female', isActive: true, isSystem: true },
  { id: 'g3', name: 'Other', isActive: true, isSystem: true }
];

export const defaultMediumList: MasterDataItem[] = [
  { id: 'ml1', name: 'Urdu Medium', isActive: true },
  { id: 'ml2', name: 'English Medium', isActive: true },
  { id: 'ml3', name: 'Marathi Medium', isActive: true }
];

export const defaultDesignations: MasterDataItem[] = [
  { id: 'des1', name: 'Headmaster & Principal', isActive: true },
  { id: 'des2', name: 'Senior Assistant Teacher', isActive: true },
  { id: 'des3', name: 'Primary Teacher (PRT)', isActive: true },
  { id: 'des4', name: 'Trained Graduate Teacher (TGT)', isActive: true },
  { id: 'des5', name: 'Post Graduate Teacher (PGT)', isActive: true },
  { id: 'des6', name: 'Administrative Clerk', isActive: true },
  { id: 'des7', name: 'Peon / Support Staff', isActive: true }
];

export const defaultQualifications: MasterDataItem[] = [
  { id: 'qual1', name: 'B.A., B.Ed.', isActive: true },
  { id: 'qual2', name: 'M.A., M.Ed.', isActive: true },
  { id: 'qual3', name: 'B.Sc., B.Ed.', isActive: true },
  { id: 'qual4', name: 'M.Sc., B.Ed.', isActive: true },
  { id: 'qual5', name: 'H.S.C., D.Ed.', isActive: true },
  { id: 'qual6', name: 'B.Com., G.D.C.&A.', isActive: true },
  { id: 'qual7', name: 'M.Phil / Ph.D.', isActive: true }
];

export const defaultDepartments: MasterDataItem[] = [
  { id: 'dept1', name: 'Urdu & Islamic Studies', isActive: true },
  { id: 'dept2', name: 'Science & Mathematics', isActive: true },
  { id: 'dept3', name: 'Social Sciences', isActive: true },
  { id: 'dept4', name: 'Languages (English/Hindi/Marathi)', isActive: true },
  { id: 'dept5', name: 'Physical Education & Sports', isActive: true },
  { id: 'dept6', name: 'Administration Office', isActive: true }
];

export const defaultEmploymentTypes: MasterDataItem[] = [
  { id: 'et1', name: 'Permanent / Aided', isActive: true },
  { id: 'et2', name: 'Temporary / Shikshan Sevak', isActive: true },
  { id: 'et3', name: 'Part-time / Clock Hour Basis (CHB)', isActive: true }
];

export const defaultStaffCategories: MasterDataItem[] = [
  { id: 'sc1', name: 'Teaching Staff', isActive: true },
  { id: 'sc2', name: 'Non-Teaching / Office Staff', isActive: true },
  { id: 'sc3', name: 'Support Staff / Class IV', isActive: true }
];

export const defaultLocations: MasterLocationItem[] = [
  { id: 'loc1', state: 'Maharashtra', district: 'Nandurbar', taluka: 'Taloda', village: 'Taloda', isActive: true },
  { id: 'loc2', state: 'Maharashtra', district: 'Nandurbar', taluka: 'Taloda', village: 'Borad', isActive: true },
  { id: 'loc3', state: 'Maharashtra', district: 'Nandurbar', taluka: 'Taloda', village: 'Pratappur', isActive: true },
  { id: 'loc4', state: 'Maharashtra', district: 'Nandurbar', taluka: 'Shahada', village: 'Shahada', isActive: true },
  { id: 'loc5', state: 'Maharashtra', district: 'Dhule', taluka: 'Shirpur', village: 'Shirpur', isActive: true }
];

export const defaultCertificates: MasterDataItem[] = [
  { id: 'cert1', name: 'Bonafide Certificate Template', isActive: true },
  { id: 'cert2', name: 'School Leaving Certificate Template', isActive: true },
  { id: 'cert3', name: 'Character Certificate Template', isActive: true },
  { id: 'cert4', name: 'Study Certificate Template', isActive: true }
];

export const defaultObservationCategories: MasterDataItem[] = [
  { id: 'obs1', name: 'Punctuality & Discipline', isActive: true },
  { id: 'obs2', name: 'Neatness & Personal Hygiene', isActive: true },
  { id: 'obs3', name: 'Sports & Teamwork Attitude', isActive: true },
  { id: 'obs4', name: 'Art & Cultural Participation', isActive: true },
  { id: 'obs5', name: 'Behavior with Peers & Teachers', isActive: true }
];

export const defaultUrduRemarks: MasterDataItem[] = [
  { id: 'rem1', name: 'شاندار کارکردگی (Outstanding Performance)', isActive: true },
  { id: 'rem2', name: 'بہت خوب، محنت جاری رکھیں (Very Good, Keep Working Hard)', isActive: true },
  { id: 'rem3', name: 'توجہ کی ضرورت ہے (Needs Attention)', isActive: true },
  { id: 'rem4', name: 'کامیاب اور اگلی جماعت کے لیے ترقی یافتہ (Passed and Promoted)', isActive: true }
];

export const defaultProgressCardTemplates: MasterDataItem[] = [
  { id: 'pct1', name: 'Standard Urdu-English Bilingual Progress Card', isActive: true },
  { id: 'pct2', name: 'CBSE Secondary Report Card Template', isActive: true }
];

export const defaultMarkListTemplates: MasterDataItem[] = [
  { id: 'mlt1', name: 'Official Subject List-A Print Sheet', isActive: true }
];

export const defaultSpecialPeriods: MasterDataItem[] = [
  { id: 'sp1', name: 'Moral Science / Deeniyat Lecture', isActive: true },
  { id: 'sp2', name: 'Computer Practical Lab Session', isActive: true },
  { id: 'sp3', name: 'Remedial Batch Coaching Class', isActive: true }
];

// Stateful database operations targeting client-side reactive models
export class LocalERPDatabase {

  static getStaffMasterRecords(): StaffMasterRecord[] {
    runR84SafeLegacyTeacherCleanupOnce();
    return getLocalStorageItem<StaffMasterRecord[]>('staff_master', []);
  }

  static saveStaffMasterRecord(record: StaffMasterRecord): StaffMasterRecord[] {
    const list = this.getStaffMasterRecords();
    const idx = list.findIndex(r => r.id === record.id);
    if (idx >= 0) {
      list[idx] = record;
    } else {
      list.push(record);
    }
    setLocalStorageItem('staff_master', list);
    return list;
  }

  static deleteStaffMasterRecord(id: string): StaffMasterRecord[] {
    const list = this.getStaffMasterRecords().filter(r => r.id !== id);
    setLocalStorageItem('staff_master', list);
    return list;
  }

  static saveStaffMasterRecords(records: StaffMasterRecord[]): StaffMasterRecord[] {
    setLocalStorageItem('staff_master', records);
    return records;
  }

  static getAcademicSetup(): MasterAcademicSetup {
    runR84SafeLegacyTeacherCleanupOnce();
    const raw = getLocalStorageItem<MasterAcademicSetup>('academic_setup', initialAcademicSetup);
    
    // Auto-migrate or fill in missing sub-master lists if they are absent
    let migrated = false;
    
    // Ensure all merged exam terms exist in setup
    if (!raw.examTerms || raw.examTerms.length < 12) {
      const existingMap = new Map((raw.examTerms || []).map(t => [t.id, t]));
      raw.examTerms = [
        { id: 'first_term', termName: "FIRST TERM", maxMarksWeightage: 100, isActive: existingMap.has('first_term') ? existingMap.get('first_term')!.isActive : true },
        { id: 'second_term', termName: "SECOND TERM", maxMarksWeightage: 100, isActive: existingMap.has('second_term') ? existingMap.get('second_term')!.isActive : true },
        { id: 'ex_1', termName: "Unit Test-I", maxMarksWeightage: 10, isActive: existingMap.has('ex_1') ? existingMap.get('ex_1')!.isActive : false },
        { id: 'ex_2', termName: "First Semester Examination", maxMarksWeightage: 50, isActive: existingMap.has('ex_2') ? existingMap.get('ex_2')!.isActive : false },
        { id: 'ex_3', termName: "Unit Test-II", maxMarksWeightage: 10, isActive: existingMap.has('ex_3') ? existingMap.get('ex_3')!.isActive : false },
        { id: 'ex_4', termName: "Annual Examination", maxMarksWeightage: 100, isActive: existingMap.has('ex_4') ? existingMap.get('ex_4')!.isActive : false },
        { id: 'term1', termName: "Formative-1", maxMarksWeightage: 10, isActive: existingMap.has('term1') ? existingMap.get('term1')!.isActive : false },
        { id: 'term2', termName: "Formative-2", maxMarksWeightage: 10, isActive: existingMap.has('term2') ? existingMap.get('term2')!.isActive : false },
        { id: 'term3', termName: "SA-1", maxMarksWeightage: 30, isActive: existingMap.has('term3') ? existingMap.get('term3')!.isActive : false },
        { id: 'term4', termName: "Summative-1", maxMarksWeightage: 10, isActive: existingMap.has('term4') ? existingMap.get('term4')!.isActive : false },
        { id: 'term5', termName: "Summative-2", maxMarksWeightage: 10, isActive: existingMap.has('term5') ? existingMap.get('term5')!.isActive : false },
        { id: 'term6', termName: "SA-2", maxMarksWeightage: 30, isActive: existingMap.has('term6') ? existingMap.get('term6')!.isActive : false }
      ];
      migrated = true;
    }

    if (!raw.schoolProfile) {
      raw.schoolProfile = { ...initialAcademicSetup.schoolProfile };
      migrated = true;
    } else {
      if (!raw.schoolProfile.primaryMedium) {
        raw.schoolProfile.primaryMedium = "Marathi / Semi-English Medium";
        migrated = true;
      }
      if (!raw.schoolProfile.secondaryMedium) {
        raw.schoolProfile.secondaryMedium = "Urdu Medium / English Medium";
        migrated = true;
      }
      if (!raw.schoolProfile.regNumber) {
        raw.schoolProfile.regNumber = "NS/TLD-9034/1984";
        migrated = true;
      }
    }
    
    if (!raw.religions) { raw.religions = defaultReligions; migrated = true; }
    if (!raw.categories) { raw.categories = defaultCategories; migrated = true; }
    if (!raw.castes) { raw.castes = defaultCastes; migrated = true; }
    if (!raw.nationalities) { raw.nationalities = defaultNationalities; migrated = true; }
    if (!raw.motherTongues) { raw.motherTongues = defaultMotherTongues; migrated = true; }
    if (!raw.bloodGroups) { raw.bloodGroups = defaultBloodGroups; migrated = true; }
    if (!raw.admissionTypes) { raw.admissionTypes = defaultAdmissionTypes; migrated = true; }
    if (!raw.houses) { raw.houses = defaultHouses; migrated = true; }
    if (!raw.genders) { raw.genders = defaultGenders; migrated = true; }
    if (!raw.mediumList) { raw.mediumList = defaultMediumList; migrated = true; }
    if (!raw.designations) { raw.designations = defaultDesignations; migrated = true; }
    if (!raw.qualifications) { raw.qualifications = defaultQualifications; migrated = true; }
    if (!raw.departments) { raw.departments = defaultDepartments; migrated = true; }
    if (!raw.employmentTypes) { raw.employmentTypes = defaultEmploymentTypes; migrated = true; }
    if (!raw.staffCategories) { raw.staffCategories = defaultStaffCategories; migrated = true; }
    if (!raw.locations) { raw.locations = defaultLocations; migrated = true; }
    if (!raw.certificates) { raw.certificates = defaultCertificates; migrated = true; }
    if (!raw.observationCategories) { raw.observationCategories = defaultObservationCategories; migrated = true; }
    if (!raw.urduRemarks) { raw.urduRemarks = defaultUrduRemarks; migrated = true; }
    if (!raw.progressCardTemplates) { raw.progressCardTemplates = defaultProgressCardTemplates; migrated = true; }
    if (!raw.markListTemplates) { raw.markListTemplates = defaultMarkListTemplates; migrated = true; }
    if (!raw.specialPeriods) { raw.specialPeriods = defaultSpecialPeriods; migrated = true; }
    if (!raw.teacherProfiles) { raw.teacherProfiles = []; migrated = true; }
    if (!raw.subjectAllocations) { raw.subjectAllocations = []; migrated = true; }
    if (!raw.classTeacherAssignments) { raw.classTeacherAssignments = []; migrated = true; }

    if (!raw.weeklyPeriodSettings) {
      raw.weeklyPeriodSettings = {
        Monday: 9,
        Tuesday: 9,
        Wednesday: 9,
        Thursday: 9,
        Friday: 7,
        Saturday: 5
      };
      migrated = true;
    }

    if (!raw.subjectWeeklyRequirements) {
      raw.subjectWeeklyRequirements = [
        {
          id: 'req_1',
          academicYear: '2026-27',
          className: 'Class 9',
          divisionName: 'A',
          subjectName: 'Urdu',
          requiredWeeklyPeriods: 6,
          priority: 'High',
          doublePeriodAllowed: true,
          lastPeriodAllowed: false,
          maxPeriodsPerDay: 2
        },
        {
          id: 'req_2',
          academicYear: '2026-27',
          className: 'Class 9',
          divisionName: 'A',
          subjectName: 'History',
          requiredWeeklyPeriods: 4,
          priority: 'Medium',
          doublePeriodAllowed: false,
          lastPeriodAllowed: true,
          maxPeriodsPerDay: 1
        },
        {
          id: 'req_3',
          academicYear: '2026-27',
          className: 'Class 9',
          divisionName: 'A',
          subjectName: 'Mathematics',
          requiredWeeklyPeriods: 6,
          priority: 'High',
          doublePeriodAllowed: true,
          lastPeriodAllowed: false,
          maxPeriodsPerDay: 2
        },
        {
          id: 'req_4',
          academicYear: '2026-27',
          className: 'Class 9',
          divisionName: 'A',
          subjectName: 'Science',
          requiredWeeklyPeriods: 6,
          priority: 'High',
          doublePeriodAllowed: true,
          lastPeriodAllowed: false,
          maxPeriodsPerDay: 2
        },
        {
          id: 'req_5',
          academicYear: '2026-27',
          className: 'Class 9',
          divisionName: 'A',
          subjectName: 'English',
          requiredWeeklyPeriods: 5,
          priority: 'Medium',
          doublePeriodAllowed: false,
          lastPeriodAllowed: true,
          maxPeriodsPerDay: 1
        }
      ];
      migrated = true;
    }
    
    if (migrated) {
      this.saveAcademicSetup(raw);
    }
    
    return raw;
  }

  static saveAcademicSetup(setup: MasterAcademicSetup): MasterAcademicSetup {
    setLocalStorageItem('academic_setup', setup);
    return setup;
  }

  static getClasses(): ClassStructure[] {
    const rawList = getLocalStorageItem<ClassStructure[]>('classes', []);
    const setup = this.getAcademicSetup();
    if (!setup || !setup.classes || !setup.divisions) return rawList;
    
    let updated = false;
    const newList = [...rawList];
    
    // Add missing combinations
    setup.classes.filter(c => c.isEnabled).forEach(cls => {
      setup.divisions.filter(d => d.isEnabled).forEach(div => {
        const divName = div.divisionName === 'No Division' ? undefined : div.divisionName;
        const exists = newList.find(c => c.className === cls.className && c.division === divName);
        if (!exists) {
          newList.push({
            id: `c_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            className: cls.className,
            division: divName
          });
          updated = true;
        }
      });
    });
    
    if (updated) {
      setLocalStorageItem('classes', newList);
    }
    
    // Filter to only return active combinations
    const activeList = newList.filter(c => {
      const isClassActive = setup.classes.some(sc => sc.isEnabled && sc.className === c.className);
      const isDivActive = c.division 
        ? setup.divisions.some(sd => sd.isEnabled && sd.divisionName === c.division)
        : setup.divisions.some(sd => sd.isEnabled && sd.divisionName === 'No Division');
      return isClassActive && isDivActive;
    });
    
    // Return sorted automatically by their original position if possible, but actually let's just return activeList
    return activeList;
  }
  static saveClass(classItem: ClassStructure): ClassStructure[] {
    const list = this.getClasses();
    const idx = list.findIndex(c => c.id === classItem.id);
    if (idx >= 0) {
      list[idx] = classItem;
    } else {
      list.push(classItem);
    }
    setLocalStorageItem('classes', list);
    return list;
  }
  static deleteClass(id: string): ClassStructure[] {
    const list = this.getClasses().filter(c => c.id !== id);
    setLocalStorageItem('classes', list);
    return list;
  }

  static getUsers(): User[] {
    runR84SafeLegacyTeacherCleanupOnce();
    return getLocalStorageItem<User[]>('users', []);
  }

  static saveUsers(users: User[]): User[] {
    setLocalStorageItem('users', users);
    return users;
  }

  static saveUser(user: User): User[] {
    const list = this.getUsers();
    const username = (user.username || '').toLowerCase();
    const idx = list.findIndex((item) =>
      item.id === user.id || (username && (item.username || '').toLowerCase() === username)
    );
    if (idx >= 0) {
      const merged = { ...list[idx], ...user };
      if (merged.cloudProvisioned) delete merged.password;
      list[idx] = merged;
    } else {
      const saved = { ...user };
      if (saved.cloudProvisioned) delete saved.password;
      list.push(saved);
    }
    setLocalStorageItem('users', list);
    return list;
  }

  static deleteUser(id: string): User[] {
    const updated = this.getUsers().filter((user) => user.id !== id);
    setLocalStorageItem('users', updated);
    return updated;
  }

  static saveTimetable(list: TimetableEntry[]): TimetableEntry[] {
    setLocalStorageItem('timetable', list);
    return list;
  }
  
  static saveHomework(list: HomeworkEntry[]): HomeworkEntry[] {
    setLocalStorageItem('homework', list);
    return list;
  }
  
  static saveNotifications(list: SystemNotification[]): SystemNotification[] {
    setLocalStorageItem('notifications', list);
    return list;
  }
  

  static getNotices(): Notice[] {
    return getLocalStorageItem<Notice[]>('notices', []);
  }
  static saveNotice(notice: Notice, actor?: Pick<User, 'id' | 'name' | 'role'>): Notice[] {
    const list = this.getNotices();
    const idx = list.findIndex(n => n.id === notice.id);
    if (idx >= 0) {
      list[idx] = notice;
    } else {
      list.unshift(notice); // Unshift so newer notices show up on top
    }
    setLocalStorageItem('notices', list);
    if (actor) {
      this.addAuditLog(actor.id, actor.name, actor.role, 'PUBLISH_NOTICE', 'Notice Board', `Created/Modified notice: ${notice.title}`);
    }
    return list;
  }
  static deleteNotice(id: string): Notice[] {
    const list = this.getNotices().filter(n => n.id !== id);
    setLocalStorageItem('notices', list);
    return list;
  }

  static getTimetable(): TimetableEntry[] {
    runR84SafeLegacyTeacherCleanupOnce();
    return getLocalStorageItem<TimetableEntry[]>('timetable', initialTimetable);
  }
  static saveTimetableEntry(entry: TimetableEntry): TimetableEntry[] {
    const list = this.getTimetable();
    const idx = list.findIndex(t => t.id === entry.id);
    if (idx >= 0) {
      list[idx] = entry;
    } else {
      list.push(entry);
    }
    setLocalStorageItem('timetable', list);
    return list;
  }
  static deleteTimetableEntry(id: string): TimetableEntry[] {
    const list = this.getTimetable().filter(t => t.id !== id);
    setLocalStorageItem('timetable', list);
    return list;
  }

  static getReservedPeriods(): ReservedPeriod[] {
    return getLocalStorageItem<ReservedPeriod[]>('reserved_periods', []);
  }
  static saveReservedPeriod(period: ReservedPeriod): ReservedPeriod[] {
    const list = this.getReservedPeriods();
    const idx = list.findIndex(p => p.id === period.id);
    if (idx >= 0) {
      list[idx] = period;
    } else {
      list.push(period);
    }
    setLocalStorageItem('reserved_periods', list);
    return list;
  }
  static deleteReservedPeriod(id: string): ReservedPeriod[] {
    const list = this.getReservedPeriods().filter(p => p.id !== id);
    setLocalStorageItem('reserved_periods', list);
    return list;
  }

  static getTimetableVersions(): TimetableVersion[] {
    return getLocalStorageItem<TimetableVersion[]>('timetable_versions', []);
  }
  static saveTimetableVersion(version: TimetableVersion): TimetableVersion[] {
    const list = this.getTimetableVersions();
    const idx = list.findIndex(v => v.id === version.id);
    if (idx >= 0) {
      list[idx] = version;
    } else {
      list.unshift(version); // latest first
    }
    setLocalStorageItem('timetable_versions', list);
    return list;
  }
  static deleteTimetableVersion(id: string): TimetableVersion[] {
    const list = this.getTimetableVersions().filter(v => v.id !== id);
    setLocalStorageItem('timetable_versions', list);
    return list;
  }

  static getHomework(): HomeworkEntry[] {
    runR84SafeLegacyTeacherCleanupOnce();
    return getLocalStorageItem<HomeworkEntry[]>('homework', initialHomework);
  }
  static saveHomeworkEntry(entry: HomeworkEntry): HomeworkEntry[] {
    const list = this.getHomework();
    const idx = list.findIndex(h => h.id === entry.id);
    if (idx >= 0) {
      list[idx] = entry;
    } else {
      list.unshift(entry);
    }
    setLocalStorageItem('homework', list);
    return list;
  }
  static deleteHomeworkEntry(id: string): HomeworkEntry[] {
    const list = this.getHomework().filter(h => h.id !== id);
    setLocalStorageItem('homework', list);
    return list;
  }

  static getFees(): FeeRecord[] {
    return getLocalStorageItem<FeeRecord[]>('fees', []);
  }
  static saveFeeRecord(record: FeeRecord): FeeRecord[] {
    const list = this.getFees();
    const idx = list.findIndex(f => f.id === record.id);
    if (idx >= 0) {
      list[idx] = record;
    } else {
      list.push(record);
    }
    setLocalStorageItem('fees', list);
    return list;
  }

  static getAuditLogs(): AuditLogEntry[] {
    return getLocalStorageItem<AuditLogEntry[]>('audit_logs', []);
  }
  static addAuditLog(userId: string, userName: string, role: any, action: string, module: string, details: string) {
    const list = this.getAuditLogs();
    const newLog: AuditLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      userId,
      userName,
      role,
      action,
      module,
      details
    };
    list.unshift(newLog);
    if (list.length > 500) {
      list.length = 500;
    }
    setLocalStorageItem('audit_logs', list);
  }

  // --- NOTIFICATION SYSTEM ACCESSORS ---
  static getNotifications(): SystemNotification[] {
    return getLocalStorageItem<SystemNotification[]>('notifications', []);
  }
  static saveNotification(notif: SystemNotification): SystemNotification[] {
    const list = this.getNotifications();
    list.unshift(notif);
    setLocalStorageItem('notifications', list);
    return list;
  }
  static addSystemNotification(recipientId: string, title: string, content: string) {
    const notif: SystemNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      recipientId,
      title,
      content,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      isRead: false
    };
    this.saveNotification(notif);
  }
  static markNotificationAsRead(id: string): SystemNotification[] {
    const list = this.getNotifications();
    const matched = list.find(n => n.id === id);
    if (matched) {
      matched.isRead = true;
    }
    setLocalStorageItem('notifications', list);
    return list;
  }

  // --- EXAMINATION SYSTEM ACCESSORS ---
  static getExamTerms(): ExamTermItem[] {
    return getLocalStorageItem<ExamTermItem[]>('exam_terms_master', initialExamTerms);
  }
  static saveExamTerm(term: ExamTermItem): ExamTermItem[] {
    const list = this.getExamTerms();
    const idx = list.findIndex(t => t.id === term.id);
    if (idx >= 0) {
      list[idx] = term;
    } else {
      list.push(term);
    }
    setLocalStorageItem('exam_terms_master', list);
    return list;
  }
  static deleteExamTerm(id: string): ExamTermItem[] {
    const list = this.getExamTerms().filter(t => t.id !== id);
    setLocalStorageItem('exam_terms_master', list);
    return list;
  }

  static getExamTypes(): ExamTypeItem[] {
    return getLocalStorageItem<ExamTypeItem[]>('exam_types_master', initialExamTypes);
  }
  static saveExamType(type: ExamTypeItem): ExamTypeItem[] {
    const list = this.getExamTypes();
    const idx = list.findIndex(t => t.id === type.id);
    if (idx >= 0) {
      list[idx] = type;
    } else {
      list.push(type);
    }
    setLocalStorageItem('exam_types_master', list);
    return list;
  }
  static deleteExamType(id: string): ExamTypeItem[] {
    const list = this.getExamTypes().filter(t => t.id !== id);
    setLocalStorageItem('exam_types_master', list);
    return list;
  }

  static getExaminations(): Examination[] {
    const coreList = getLocalStorageItem<Examination[]>('examinations_master', initialExaminations);
    const setup = this.getAcademicSetup();
    if (setup && setup.examTerms) {
      const firstActive = setup.examTerms.find(t => t.id === 'first_term')?.isActive;
      const secondActive = setup.examTerms.find(t => t.id === 'second_term')?.isActive;

      return coreList.map(ex => {
        let name = ex.name;
        let shortName = ex.shortName;
        let status: 'Active' | 'Inactive' = 'Inactive';

        if (ex.id === 'ex_1') {
          if (firstActive) {
            name = 'FIRST TERM';
            shortName = 'FIRST_TERM';
            status = 'Active';
          } else {
            const match = setup.examTerms.find(t => t.id === 'ex_1');
            status = match && match.isActive ? 'Active' : 'Inactive';
          }
        } else if (ex.id === 'ex_2') {
          const match = setup.examTerms.find(t => t.id === 'ex_2');
          status = match && match.isActive ? 'Active' : 'Inactive';
        } else if (ex.id === 'ex_3') {
          if (secondActive) {
            name = 'SECOND TERM';
            shortName = 'SECOND_TERM';
            status = 'Active';
          } else {
            const match = setup.examTerms.find(t => t.id === 'ex_3');
            status = match && match.isActive ? 'Active' : 'Inactive';
          }
        } else if (ex.id === 'ex_4') {
          const match = setup.examTerms.find(t => t.id === 'ex_4');
          status = match && match.isActive ? 'Active' : 'Inactive';
        }

        return {
          ...ex,
          name,
          shortName,
          status
        };
      });
    }
    return coreList;
  }
  static saveExamination(exam: Examination): Examination[] {
    const list = getLocalStorageItem<Examination[]>('examinations_master', initialExaminations);
    const idx = list.findIndex(e => e.id === exam.id);
    if (idx >= 0) {
      list[idx] = exam;
    } else {
      list.push(exam);
    }
    setLocalStorageItem('examinations_master', list);
    return this.getExaminations();
  }
  static deleteExamination(id: string): Examination[] {
    const list = getLocalStorageItem<Examination[]>('examinations_master', initialExaminations).filter(e => e.id !== id);
    setLocalStorageItem('examinations_master', list);
    return this.getExaminations();
  }

  static getClassExamMappings(): ClassExamMapping[] {
    return getLocalStorageItem<ClassExamMapping[]>('class_exam_mappings', initialClassExamMappings);
  }
  static saveClassExamMapping(mapping: ClassExamMapping): ClassExamMapping[] {
    const list = this.getClassExamMappings();
    const idx = list.findIndex(m => m.id === mapping.id);
    if (idx >= 0) {
      list[idx] = mapping;
    } else {
      list.push(mapping);
    }
    setLocalStorageItem('class_exam_mappings', list);
    return list;
  }
  static deleteClassExamMapping(id: string): ClassExamMapping[] {
    const list = this.getClassExamMappings().filter(m => m.id !== id);
    setLocalStorageItem('class_exam_mappings', list);
    return list;
  }

  static getGradeSystemConfigs(): GradeSystemConfig[] {
    return getLocalStorageItem<GradeSystemConfig[]>('grade_system_configs', initialGradeSystemConfigs);
  }
  static saveGradeSystemConfig(config: GradeSystemConfig): GradeSystemConfig[] {
    const list = this.getGradeSystemConfigs();
    const idx = list.findIndex(c => c.id === config.id);
    if (idx >= 0) {
      list[idx] = config;
    } else {
      list.push(config);
    }
    setLocalStorageItem('grade_system_configs', list);
    return list;
  }
  static deleteGradeSystemConfig(id: string): GradeSystemConfig[] {
    const list = this.getGradeSystemConfigs().filter(c => c.id !== id);
    setLocalStorageItem('grade_system_configs', list);
    return list;
  }

  static getExamSchedules(): ExamScheduleEntry[] {
    return getLocalStorageItem<ExamScheduleEntry[]>('exam_schedules', initialExamSchedules);
  }
  static saveExamSchedule(schedule: ExamScheduleEntry): ExamScheduleEntry[] {
    const list = this.getExamSchedules();
    const idx = list.findIndex(s => s.id === schedule.id);
    if (idx >= 0) {
      list[idx] = schedule;
    } else {
      list.push(schedule);
    }
    setLocalStorageItem('exam_schedules', list);
    return list;
  }
  static deleteExamSchedule(id: string): ExamScheduleEntry[] {
    const list = this.getExamSchedules().filter(s => s.id !== id);
    setLocalStorageItem('exam_schedules', list);
    return list;
  }

  // --- QUESTION BANK & QUESTION PAPER ACCESSORS ---
  static getQuestionBank(): QuestionBankItem[] {
    return getLocalStorageItem<QuestionBankItem[]>('question_bank', initialQuestionBank);
  }
  static saveQuestionBankItem(item: QuestionBankItem): QuestionBankItem[] {
    const list = this.getQuestionBank();
    const idx = list.findIndex(q => q.id === item.id);
    if (idx >= 0) {
      list[idx] = item;
    } else {
      list.push(item);
    }
    setLocalStorageItem('question_bank', list);
    return list;
  }
  static deleteQuestionBankItem(id: string): QuestionBankItem[] {
    const list = this.getQuestionBank().filter(q => q.id !== id);
    setLocalStorageItem('question_bank', list);
    return list;
  }

  static getQuestionPapers(): QuestionPaper[] {
    runR84SafeLegacyTeacherCleanupOnce();
    return getLocalStorageItem<QuestionPaper[]>('question_papers', initialQuestionPapers);
  }
  static saveQuestionPaper(paper: QuestionPaper): QuestionPaper[] {
    const list = this.getQuestionPapers();
    const idx = list.findIndex(p => p.id === paper.id);
    if (idx >= 0) {
      list[idx] = paper;
    } else {
      list.push(paper);
    }
    setLocalStorageItem('question_papers', list);
    return list;
  }
  static deleteQuestionPaper(id: string): QuestionPaper[] {
    const list = this.getQuestionPapers().filter(p => p.id !== id);
    setLocalStorageItem('question_papers', list);
    return list;
  }

  // --- MARK LIST TEMPLATES & ASSESSMENT PATTERNS ---
  static getMarkListTemplates(): MarkListTemplate[] {
    return getLocalStorageItem<MarkListTemplate[]>('mark_list_templates', initialMarkListTemplates);
  }
  static saveMarkListTemplate(template: MarkListTemplate): MarkListTemplate[] {
    const list = this.getMarkListTemplates();
    const idx = list.findIndex(t => t.id === template.id);
    if (idx >= 0) {
      list[idx] = template;
    } else {
      list.push(template);
    }
    setLocalStorageItem('mark_list_templates', list);
    return list;
  }
  static deleteMarkListTemplate(id: string): MarkListTemplate[] {
    const list = this.getMarkListTemplates().filter(t => t.id !== id);
    setLocalStorageItem('mark_list_templates', list);
    return list;
  }

  static getAssessmentPatterns(): AssessmentPattern[] {
    return getLocalStorageItem<AssessmentPattern[]>('assessment_patterns', initialAssessmentPatterns);
  }
  static saveAssessmentPattern(pattern: AssessmentPattern): AssessmentPattern[] {
    const list = this.getAssessmentPatterns();
    const idx = list.findIndex(p => p.id === pattern.id);
    if (idx >= 0) {
      list[idx] = pattern;
    } else {
      list.push(pattern);
    }
    setLocalStorageItem('assessment_patterns', list);
    return list;
  }
  static deleteAssessmentPattern(id: string): AssessmentPattern[] {
    const list = this.getAssessmentPatterns().filter(p => p.id !== id);
    setLocalStorageItem('assessment_patterns', list);
    return list;
  }

  // --- STUDENT MARK ENTRIES ---
  static getStudentMarkEntriesRaw(): StudentMarkEntry[] {
    return getLocalStorageItem<StudentMarkEntry[]>('student_mark_entries', []);
  }
  static getStudentMarkEntries(): StudentMarkEntry[] {
    return this.getStudentMarkEntriesRaw().filter(e => e.status !== 'Deleted');
  }

  private static pendingMarkEntriesToSyncMap = new Map<string, StudentMarkEntry>();
  private static markSyncTimer: any = null;

  static saveStudentMarkEntries(entries: StudentMarkEntry[]): StudentMarkEntry[] {
    const list = this.getStudentMarkEntriesRaw();
    entries.forEach(entry => {
      const idx = list.findIndex(e => e.id === entry.id);
      if (idx >= 0) {
        list[idx] = entry;
      } else {
        list.push(entry);
      }
      this.pendingMarkEntriesToSyncMap.set(entry.id, entry);
    });
    setLocalStorageItem('student_mark_entries', list);

    // Schedule background debounced async upsert to Supabase (0ms UI lag)
    if (this.markSyncTimer) {
      clearTimeout(this.markSyncTimer);
    }
    this.markSyncTimer = setTimeout(() => {
      this.flushPendingStudentMarkEntriesToSupabase();
    }, 300);

    return list.filter(e => e.status !== 'Deleted');
  }

  static async flushPendingStudentMarkEntriesToSupabase(): Promise<void> {
    if (this.pendingMarkEntriesToSyncMap.size === 0) return;

    const entriesToSync = Array.from(this.pendingMarkEntriesToSyncMap.values());
    this.pendingMarkEntriesToSyncMap.clear();

    await this.syncStudentMarkEntriesToSupabase(entriesToSync);
  }

  static async syncStudentMarkEntriesToSupabase(entries: StudentMarkEntry[]): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase || !entries || entries.length === 0) return;

    try {
      // 1. Prepare snake_case row format
      const snakeRows = entries.map(e => ({
        id: e.id,
        academic_year: e.academicYear,
        exam_id: e.examId,
        class_id: e.classId,
        division: e.division,
        subject_id: e.subjectId,
        student_id: e.studentId,
        student_name: e.studentName,
        roll_number: e.rollNumber || '',
        gr_number: e.grNumber || '',
        marks: e.marks || {},
        formative_marks: e.formativeMarks || {},
        summative_marks: e.summativeMarks || {},
        formative_total: e.formativeTotal ?? 0,
        summative_total: e.summativeTotal ?? 0,
        subject_total: e.subjectTotal ?? 0,
        remarks: e.remarks || '',
        status: e.status || 'Draft',
        last_saved_at: e.lastSavedAt || new Date().toISOString(),
        updated_by: e.updatedBy || '',
        grade: e.grade || '',
        approved_by: e.approvedBy || null,
        approval_date: e.approvalDate || null,
        approval_time: e.approvalTime || null,
        language_rows: e.languageRows || null,
        multi_rows: e.multiRows || null,
        mark_rows: e.markRows || null
      }));

      const { error: snakeErr } = await supabase
        .from('student_mark_entries')
        .upsert(snakeRows, { onConflict: 'id' });

      if (snakeErr) {
        console.warn('Snake case upsert notice, trying camelCase layout:', snakeErr.message);
        // 2. Try camelCase row format if snake_case schema was used in table
        const camelRows = entries.map(e => ({
          id: e.id,
          academicYear: e.academicYear,
          examId: e.examId,
          classId: e.classId,
          division: e.division,
          subjectId: e.subjectId,
          studentId: e.studentId,
          studentName: e.studentName,
          rollNumber: e.rollNumber || '',
          grNumber: e.grNumber || '',
          marks: e.marks || {},
          formativeMarks: e.formativeMarks || {},
          summativeMarks: e.summativeMarks || {},
          formativeTotal: e.formativeTotal ?? 0,
          summativeTotal: e.summativeTotal ?? 0,
          subjectTotal: e.subjectTotal ?? 0,
          remarks: e.remarks || '',
          status: e.status || 'Draft',
          lastSavedAt: e.lastSavedAt || new Date().toISOString(),
          updatedBy: e.updatedBy || '',
          grade: e.grade || '',
          approvedBy: e.approvedBy || null,
          approvalDate: e.approvalDate || null,
          approvalTime: e.approvalTime || null,
          languageRows: e.languageRows || null,
          multiRows: e.multiRows || null,
          markRows: e.markRows || null
        }));

        const { error: camelErr } = await supabase
          .from('student_mark_entries')
          .upsert(camelRows, { onConflict: 'id' });

        if (camelErr) {
          console.warn('CamelCase upsert error:', camelErr.message);
        }
      }
    } catch (err) {
      console.warn('Background Supabase mark entries upsert failed (retaining in local storage):', err);
    }
  }

  static async fetchStudentMarkEntriesFromSupabase(): Promise<StudentMarkEntry[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return this.getStudentMarkEntries();

    try {
      const { data, error } = await supabase
        .from('student_mark_entries')
        .select('*');

      if (error || !data || !Array.isArray(data)) {
        if (error) console.warn('Supabase fetch error, using local storage fallback:', error.message);
        return this.getStudentMarkEntries();
      }

      // Convert DB rows to StudentMarkEntry objects
      const fetchedEntries: StudentMarkEntry[] = data.map((row: any) => ({
        id: row.id,
        academicYear: row.academic_year || row.academicYear || '',
        examId: row.exam_id || row.examId || '',
        classId: row.class_id || row.classId || '',
        division: row.division || '',
        subjectId: row.subject_id || row.subjectId || '',
        studentId: row.student_id || row.studentId || '',
        studentName: row.student_name || row.studentName || '',
        rollNumber: row.roll_number || row.rollNumber || '',
        grNumber: row.gr_number || row.grNumber || '',
        marks: row.marks || {},
        formativeMarks: row.formative_marks || row.formativeMarks || {},
        summativeMarks: row.summative_marks || row.summativeMarks || {},
        formativeTotal: row.formative_total ?? row.formativeTotal ?? 0,
        summativeTotal: row.summative_total ?? row.summativeTotal ?? 0,
        subjectTotal: row.subject_total ?? row.subjectTotal ?? 0,
        remarks: row.remarks || '',
        status: row.status || 'Draft',
        lastSavedAt: row.last_saved_at || row.lastSavedAt || new Date().toISOString(),
        updatedBy: row.updated_by || row.updatedBy || '',
        grade: row.grade || '',
        approvedBy: row.approved_by || row.approvedBy || undefined,
        approvalDate: row.approval_date || row.approvalDate || undefined,
        approvalTime: row.approval_time || row.approvalTime || undefined,
        languageRows: row.language_rows || row.languageRows || undefined,
        multiRows: row.multi_rows || row.multiRows || undefined,
        markRows: row.mark_rows || row.markRows || undefined,
      }));

      if (fetchedEntries.length > 0) {
        const existingRaw = this.getStudentMarkEntriesRaw();
        const mergedMap = new Map<string, StudentMarkEntry>();
        
        existingRaw.forEach(e => mergedMap.set(e.id, e));
        fetchedEntries.forEach(e => mergedMap.set(e.id, e));

        const mergedArray = Array.from(mergedMap.values());
        setLocalStorageItem('student_mark_entries', mergedArray);
        return mergedArray.filter(e => e.status !== 'Deleted');
      }

      return this.getStudentMarkEntries();
    } catch (err) {
      console.warn('Failed to fetch from Supabase, falling back to local storage:', err);
      return this.getStudentMarkEntries();
    }
  }

  static deleteStudentMarkEntry(id: string): StudentMarkEntry[] {
    const list = this.getStudentMarkEntriesRaw().filter(e => e.id !== id);
    setLocalStorageItem('student_mark_entries', list);

    // Also delete from Supabase in background
    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('student_mark_entries').delete().eq('id', id).then(({ error }) => {
        if (error) console.warn('Supabase delete error:', error.message);
      });
    }

    return list.filter(e => e.status !== 'Deleted');
  }

  // --- SUBJECT LOCK STATES ---
  static getSubjectLockStatesRaw(): SubjectLockState[] {
    return getLocalStorageItem<SubjectLockState[]>('subject_lock_states', []);
  }
  static getSubjectLockStates(): SubjectLockState[] {
    return this.getSubjectLockStatesRaw().filter(s => s.status !== 'Deleted');
  }
  static saveSubjectLockState(state: SubjectLockState): SubjectLockState[] {
    const list = this.getSubjectLockStatesRaw();
    const idx = list.findIndex(s => s.id === state.id);
    if (idx >= 0) {
       list[idx] = state;
    } else {
       list.push(state);
    }
    setLocalStorageItem('subject_lock_states', list);
    return list.filter(s => s.status !== 'Deleted');
  }

  // --- VISITOR & GATEKEEPER SYSTEM ACCESSORS ---
  static getVisitors(): VisitorRecord[] {
    return getLocalStorageItem<VisitorRecord[]>('visitors_log', []);
  }
  static saveVisitorRecord(record: VisitorRecord): VisitorRecord[] {
    const list = this.getVisitors();
    const idx = list.findIndex(r => r.id === record.id);
    if (idx >= 0) {
      list[idx] = record;
    } else {
      list.unshift(record);
    }
    setLocalStorageItem('visitors_log', list);
    return list;
  }

  static getStudentGatePasses(): StudentGatePass[] {
    return getLocalStorageItem<StudentGatePass[]>('student_gate_passes', []);
  }
  static saveStudentGatePass(pass: StudentGatePass): StudentGatePass[] {
    const list = this.getStudentGatePasses();
    const idx = list.findIndex(p => p.id === pass.id);
    if (idx >= 0) {
      list[idx] = pass;
    } else {
      list.unshift(pass);
    }
    setLocalStorageItem('student_gate_passes', list);
    return list;
  }

  static getStaffGatePasses(): StaffGatePass[] {
    runR84SafeLegacyTeacherCleanupOnce();
    return getLocalStorageItem<StaffGatePass[]>('staff_gate_passes', initialStaffGatePasses);
  }
  static saveStaffGatePass(pass: StaffGatePass): StaffGatePass[] {
    const list = this.getStaffGatePasses();
    const idx = list.findIndex(p => p.id === pass.id);
    if (idx >= 0) {
      list[idx] = pass;
    } else {
      list.unshift(pass);
    }
    setLocalStorageItem('staff_gate_passes', list);
    return list;
  }

  static getVehicles(): VehicleRecord[] {
    return getLocalStorageItem<VehicleRecord[]>('vehicles_log', []);
  }
  static saveVehicleRecord(record: VehicleRecord): VehicleRecord[] {
    const list = this.getVehicles();
    const idx = list.findIndex(v => v.id === record.id);
    if (idx >= 0) {
      list[idx] = record;
    } else {
      list.unshift(record);
    }
    setLocalStorageItem('vehicles_log', list);
    return list;
  }

  static resetDatabase() {
    clearLocalERPCache();
    localStorage.removeItem('nhs_erp_classes');
    localStorage.removeItem('nhs_erp_users');
    localStorage.removeItem('nhs_erp_notices');
    localStorage.removeItem('nhs_erp_timetable');
    localStorage.removeItem('nhs_erp_homework');
    localStorage.removeItem('nhs_erp_fees');
    localStorage.removeItem('nhs_erp_audit_logs');
    localStorage.removeItem('nhs_erp_exam_terms_master');
    localStorage.removeItem('nhs_erp_exam_types_master');
    localStorage.removeItem('nhs_erp_examinations_master');
    localStorage.removeItem('nhs_erp_class_exam_mappings');
    localStorage.removeItem('nhs_erp_grade_system_configs');
    localStorage.removeItem('nhs_erp_exam_schedules');
    localStorage.removeItem('nhs_erp_question_bank');
    localStorage.removeItem('nhs_erp_question_papers');
    localStorage.removeItem('nhs_erp_mark_list_templates');
    localStorage.removeItem('nhs_erp_assessment_patterns');
    localStorage.removeItem('nhs_erp_student_mark_entries');
    localStorage.removeItem('nhs_erp_subject_lock_states');
    localStorage.removeItem('nhs_erp_visitors_log');
    localStorage.removeItem('nhs_erp_student_gate_passes');
    localStorage.removeItem('nhs_erp_staff_gate_passes');
    localStorage.removeItem('nhs_erp_vehicles_log');
    
    // Force refresh initial load in local storage
    this.getClasses();
    this.getUsers();
    this.getNotices();
    this.getTimetable();
    this.getHomework();
    this.getFees();
    this.getAuditLogs();
    this.getExamTerms();
    this.getExamTypes();
    this.getExaminations();
    this.getClassExamMappings();
    this.getGradeSystemConfigs();
    this.getExamSchedules();
    this.getQuestionBank();
    this.getQuestionPapers();
    this.getMarkListTemplates();
    this.getAssessmentPatterns();
    this.getStudentMarkEntries();
    this.getSubjectLockStates();
    this.getVisitors();
    this.getStudentGatePasses();
    this.getStaffGatePasses();
    this.getVehicles();
  }
}

// Initial mock data structures declared for exam management
const initialExamTerms: ExamTermItem[] = [
  { id: 'et_1', name: 'Term 1', academicYear: '2026-27', isActive: true },
  { id: 'et_2', name: 'Term 2', academicYear: '2026-27', isActive: true },
  { id: 'et_3', name: 'Semester 1', academicYear: '2026-27', isActive: true },
  { id: 'et_4', name: 'Semester 2', academicYear: '2026-27', isActive: true },
  { id: 'et_5', name: 'Annual', academicYear: '2026-27', isActive: true }
];

const initialExamTypes: ExamTypeItem[] = [
  { id: 'ext_1', name: 'Unit Test', isActive: true },
  { id: 'ext_2', name: 'Class Test', isActive: true },
  { id: 'ext_3', name: 'Slip Test', isActive: true },
  { id: 'ext_4', name: 'Oral Test', isActive: true },
  { id: 'ext_5', name: 'Practical', isActive: true },
  { id: 'ext_6', name: 'Written', isActive: true },
  { id: 'ext_7', name: 'Project', isActive: true },
  { id: 'ext_8', name: 'Assignment', isActive: true },
  { id: 'ext_9', name: 'Internal', isActive: true },
  { id: 'ext_10', name: 'External', isActive: true },
  { id: 'ext_11', name: 'Annual Examination', isActive: true }
];

const initialExaminations: Examination[] = [];

export const initialMarkListTemplates: MarkListTemplate[] = [
  {
    id: 'tmpl_urdu',
    templateType: 'Urdu',
    templateName: 'Template A - Urdu Subjects',
    description: 'Specialized template for Urdu medium and Urdu language subjects, supporting RTL layouts and Nastaleeq aesthetic typography.',
    language: 'ur',
    isRTL: true,
    defaultFormativeHeads: [
      { displayName: 'قرأت (Oral Reading)', maxMarks: 15, weightage: 15, displayOrder: 1, isEnabled: true, isMandatory: true },
      { displayName: 'املا (Dictation)', maxMarks: 10, weightage: 10, displayOrder: 2, isEnabled: true, isMandatory: true },
      { displayName: 'تفہیم (Comprehension)', maxMarks: 10, weightage: 10, displayOrder: 3, isEnabled: true, isMandatory: true },
      { displayName: 'بیاض (Notebook Maintenance)', maxMarks: 5, weightage: 5, displayOrder: 4, isEnabled: true, isMandatory: false },
      { displayName: 'گھر کا کام (Homework)', maxMarks: 10, weightage: 10, displayOrder: 5, isEnabled: true, isMandatory: true }
    ],
    defaultSummativeHeads: [
      { displayName: 'تحریری امتحان (Theory Written)', maxMarks: 40, weightage: 40, displayOrder: 1, isMandatory: true },
      { displayName: 'زبانی امتحان (Oral Exam)', maxMarks: 10, weightage: 10, displayOrder: 2, isMandatory: false }
    ]
  },
  {
    id: 'tmpl_english',
    templateType: 'English',
    templateName: 'Template B - English Subjects',
    description: 'Standard template for English subject, focusing on LSRW (Listening, Speaking, Reading, Writing) guidelines.',
    language: 'en',
    isRTL: false,
    defaultFormativeHeads: [
      { displayName: 'Reading Skills', maxMarks: 10, weightage: 10, displayOrder: 1, isEnabled: true, isMandatory: true },
      { displayName: 'Writing & Composition', maxMarks: 10, weightage: 10, displayOrder: 2, isEnabled: true, isMandatory: true },
      { displayName: 'Speaking & Conversation', maxMarks: 10, weightage: 10, displayOrder: 3, isEnabled: true, isMandatory: true },
      { displayName: 'Listening Comprehension', maxMarks: 10, weightage: 10, displayOrder: 4, isEnabled: true, isMandatory: true },
      { displayName: 'Homework Portfolio', maxMarks: 10, weightage: 10, displayOrder: 5, isEnabled: true, isMandatory: false }
    ],
    defaultSummativeHeads: [
      { displayName: 'Theory Written Exam', maxMarks: 40, weightage: 40, displayOrder: 1, isMandatory: true },
      { displayName: 'Internal Viva-Voce', maxMarks: 10, weightage: 10, displayOrder: 2, isMandatory: true }
    ]
  },
  {
    id: 'tmpl_hindi_marathi',
    templateType: 'Hindi_Marathi',
    templateName: 'Template C - Hindi / Marathi Subjects',
    description: 'Optimized layout for Devnagari script languages (Hindi and Marathi), ensuring standard language assessment markers.',
    language: 'hi',
    isRTL: false,
    defaultFormativeHeads: [
      { displayName: 'मौखिक अभिव्यक्ति (Oral)', maxMarks: 15, weightage: 15, displayOrder: 1, isEnabled: true, isMandatory: true },
      { displayName: 'लेखन कौशल (Writing Skills)', maxMarks: 15, weightage: 15, displayOrder: 2, isEnabled: true, isMandatory: true },
      { displayName: 'स्वाध्याय (Self-Study)', maxMarks: 10, weightage: 10, displayOrder: 3, isEnabled: true, isMandatory: false },
      { displayName: 'गृहकार्य (Homework)', maxMarks: 10, weightage: 10, displayOrder: 4, isEnabled: true, isMandatory: true }
    ],
    defaultSummativeHeads: [
      { displayName: 'लिखित परीक्षा (Theory Written)', maxMarks: 40, weightage: 40, displayOrder: 1, isMandatory: true },
      { displayName: 'मौखिक परीक्षा (Oral Viva)', maxMarks: 10, weightage: 10, displayOrder: 2, isMandatory: true }
    ],
    rowsPerStudent: 3,
    rowLabels: ['Hindi', 'Marathi', 'Total'],
    hasVerticalTotals: true,
    rowDefinitions: [
      { key: 'hindi', label: 'Hindi', type: 'editable' },
      { key: 'marathi', label: 'Marathi', type: 'editable' },
      { key: 'total', label: 'Total', type: 'calculated', calculationType: 'vertical_sum' }
    ],
    calculationRules: [
      { targetRowKey: 'total', sourceRowKeys: ['hindi', 'marathi'], operation: 'sum' }
    ],
    mergeRules: ['rollNumber', 'grNumber', 'studentName', 'remarks', 'grandTotal', 'grade']
  },
  {
    id: 'tmpl_maths',
    templateType: 'Mathematics',
    templateName: 'Template D - Mathematics',
    description: 'Formulaic layout optimized for mathematical problem evaluation, logical observation, and objective accuracy tests.',
    language: 'en',
    isRTL: false,
    defaultFormativeHeads: [
      { displayName: 'Mental Mathematics', maxMarks: 10, weightage: 10, displayOrder: 1, isEnabled: true, isMandatory: true },
      { displayName: 'Formula Journal & Definitions', maxMarks: 10, weightage: 10, displayOrder: 2, isEnabled: true, isMandatory: false },
      { displayName: 'Assignments & Worksheets', maxMarks: 15, weightage: 15, displayOrder: 3, isEnabled: true, isMandatory: true },
      { displayName: 'Practical Exercise / Graph', maxMarks: 15, weightage: 15, displayOrder: 4, isEnabled: true, isMandatory: true }
    ],
    defaultSummativeHeads: [
      { displayName: 'Theory Written Paper', maxMarks: 40, weightage: 40, displayOrder: 1, isMandatory: true },
      { displayName: 'Practical / Viva Test', maxMarks: 10, weightage: 10, displayOrder: 2, isMandatory: true }
    ]
  },
  {
    id: 'tmpl_science',
    templateType: 'Science',
    templateName: 'Template E - Science',
    description: 'Template with lab experiment journal, practical demonstration observation, and scientific drawings weightage.',
    language: 'en',
    isRTL: false,
    defaultFormativeHeads: [
      { displayName: 'Practical Lab Journal', maxMarks: 15, weightage: 15, displayOrder: 1, isEnabled: true, isMandatory: true },
      { displayName: 'Scientific Diagram Work', maxMarks: 10, weightage: 10, displayOrder: 2, isEnabled: true, isMandatory: true },
      { displayName: 'Science Project / Model', maxMarks: 15, weightage: 15, displayOrder: 3, isEnabled: true, isMandatory: false },
      { displayName: 'Active Observation Rubric', maxMarks: 10, weightage: 10, displayOrder: 4, isEnabled: true, isMandatory: true }
    ],
    defaultSummativeHeads: [
      { displayName: 'Theory Written Examination', maxMarks: 40, weightage: 40, displayOrder: 1, isMandatory: true },
      { displayName: 'Practical Laboratory Exam', maxMarks: 10, weightage: 10, displayOrder: 2, isMandatory: true }
    ]
  },
  {
    id: 'tmpl_social_science',
    templateType: 'SocialScience',
    templateName: 'Template F - Social Science',
    description: 'Ideal template for History, Geography, and Civics, focusing on Map sketching, historical timeline tracking, and projects.',
    language: 'en',
    isRTL: false,
    defaultFormativeHeads: [
      { displayName: 'Map Sketching / Geography Work', maxMarks: 15, weightage: 15, displayOrder: 1, isEnabled: true, isMandatory: true },
      { displayName: 'Historical Timelines & Charts', maxMarks: 10, weightage: 10, displayOrder: 2, isEnabled: true, isMandatory: false },
      { displayName: 'Written Assignments', maxMarks: 15, weightage: 15, displayOrder: 3, isEnabled: true, isMandatory: true },
      { displayName: 'Classroom Seminars', maxMarks: 10, weightage: 10, displayOrder: 4, isEnabled: true, isMandatory: true }
    ],
    defaultSummativeHeads: [
      { displayName: 'Written Theory Exam', maxMarks: 40, weightage: 40, displayOrder: 1, isMandatory: true },
      { displayName: 'Oral Presentation / Viva', maxMarks: 10, weightage: 10, displayOrder: 2, isMandatory: true }
    ]
  },
  {
    id: 'tmpl_art_pe',
    templateType: 'Art_PE_WorkExp',
    templateName: 'Template G - Art / Physical Ed. / Work Experience',
    description: 'Activity and demonstration-centric assessment module, utilizing highly customized rubrics with zero or low written exam percentage.',
    language: 'en',
    isRTL: false,
    defaultFormativeHeads: [
      { displayName: 'Physical Fitness / Athleticism', maxMarks: 25, weightage: 25, displayOrder: 1, isEnabled: true, isMandatory: true },
      { displayName: 'Art & Craft Demonstrations', maxMarks: 25, weightage: 25, displayOrder: 2, isEnabled: true, isMandatory: true },
      { displayName: 'Work Experience Activities', maxMarks: 25, weightage: 25, displayOrder: 3, isEnabled: true, isMandatory: true },
      { displayName: 'Discipline & Active Co-operation', maxMarks: 25, weightage: 25, displayOrder: 4, isEnabled: true, isMandatory: false }
    ],
    defaultSummativeHeads: [
      { displayName: 'Practical Demonstration Exam', maxMarks: 50, weightage: 50, displayOrder: 1, isMandatory: true },
      { displayName: 'Artistic Work Portfolio', maxMarks: 50, weightage: 50, displayOrder: 2, isMandatory: true }
    ]
  }
];

export const initialAssessmentPatterns: AssessmentPattern[] = [
  {
    id: 'pat_1',
    name: 'Class 9 - English FA & SA Pattern',
    academicYear: '2026-27',
    classId: 'Class 9',
    division: 'All',
    subjectType: 'English',
    subjectId: 'All',
    examId: 'ex_2',
    formativeHeads: [
      { id: 'f_eng_1', displayName: 'Reading Skills', maxMarks: 10, weightage: 10, displayOrder: 1, isEnabled: true, isMandatory: true },
      { id: 'f_eng_2', displayName: 'Writing & Composition', maxMarks: 10, weightage: 10, displayOrder: 2, isEnabled: true, isMandatory: true },
      { id: 'f_eng_3', displayName: 'Speaking & Conversation', maxMarks: 10, weightage: 10, displayOrder: 3, isEnabled: true, isMandatory: true },
      { id: 'f_eng_4', displayName: 'Listening Comprehension', maxMarks: 10, weightage: 10, displayOrder: 4, isEnabled: true, isMandatory: true },
      { id: 'f_eng_5', displayName: 'Homework Portfolio', maxMarks: 10, weightage: 10, displayOrder: 5, isEnabled: true, isMandatory: false }
    ],
    summativeHeads: [
      { id: 's_eng_1', displayName: 'Theory Written Exam', maxMarks: 40, weightage: 40, displayOrder: 1, isMandatory: true },
      { id: 's_eng_2', displayName: 'Internal Viva-Voce', maxMarks: 10, weightage: 10, displayOrder: 2, isMandatory: true }
    ],
    totalFormula: 'sum',
    passingMarks: 35,
    isActive: true
  },
  {
    id: 'pat_2',
    name: 'Class 10 - Urdu Nastaleeq Standard Pattern',
    academicYear: '2026-27',
    classId: 'Class 10',
    division: 'Urdu Medium',
    subjectType: 'Urdu',
    subjectId: 'All',
    examId: 'ex_2',
    formativeHeads: [
      { id: 'f_ur_1', displayName: 'قرأت (Oral Reading)', maxMarks: 15, weightage: 15, displayOrder: 1, isEnabled: true, isMandatory: true },
      { id: 'f_ur_2', displayName: 'املا (Dictation)', maxMarks: 10, weightage: 10, displayOrder: 2, isEnabled: true, isMandatory: true },
      { id: 'f_ur_3', displayName: 'تفہیم (Comprehension)', maxMarks: 10, weightage: 10, displayOrder: 3, isEnabled: true, isMandatory: true },
      { id: 'f_ur_4', displayName: 'بیاض (Notebook Maintenance)', maxMarks: 5, weightage: 5, displayOrder: 4, isEnabled: true, isMandatory: false },
      { id: 'f_ur_5', displayName: 'گھر کا کام (Homework)', maxMarks: 10, weightage: 10, displayOrder: 5, isEnabled: true, isMandatory: true }
    ],
    summativeHeads: [
      { id: 's_ur_1', displayName: 'تحریری امتحان (Theory Written)', maxMarks: 40, weightage: 40, displayOrder: 1, isMandatory: true },
      { id: 's_ur_2', displayName: 'زبانی امتحان (Oral Exam)', maxMarks: 10, weightage: 10, displayOrder: 2, isMandatory: false }
    ],
    totalFormula: 'sum',
    passingMarks: 35,
    isActive: true
  }
];

const initialClassExamMappings: ClassExamMapping[] = [];

const initialGradeSystemConfigs: GradeSystemConfig[] = [
  { id: 'gsc_1', classId: 'All', gradingType: 'Mixed', scaleId: 'gr1' },
  { id: 'gsc_2', classId: 'Class 5', gradingType: 'Marks', scaleId: 'gr1' },
  { id: 'gsc_3', classId: 'Class 6', gradingType: 'Marks', scaleId: 'gr1' },
  { id: 'gsc_4', classId: 'Class 9', gradingType: 'Mixed', scaleId: 'gr1' },
  { id: 'gsc_5', classId: 'Class 10', gradingType: 'Mixed', scaleId: 'gr1' },
  { id: 'gsc_6', classId: 'Class 11', gradingType: 'Mixed', scaleId: 'gr1' },
  { id: 'gsc_7', classId: 'Class 12', gradingType: 'Mixed', scaleId: 'gr1' }
];

const initialExamSchedules: ExamScheduleEntry[] = [];

const initialQuestionBank: QuestionBankItem[] = [];

const initialQuestionPapers: QuestionPaper[] = [];

// Supabase browser client configuration. Production always uses build-time VITE variables.
export function validateClientSupabaseUrl(rawUrl?: string): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const cleaned = rawUrl.trim().replace(/^["']|["']$/g, '');
  if (!cleaned || cleaned === 'undefined' || cleaned === 'null' || cleaned === 'MY_SUPABASE_URL') return null;
  try {
    const url = new URL(cleaned.startsWith('http') ? cleaned : `https://${cleaned}`);
    return url.protocol === 'https:' ? url.toString().replace(/\/$/, '') : null;
  } catch {
    return null;
  }
}

const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
const envAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
const validatedUrl = validateClientSupabaseUrl(envUrl);
const validatedAnonKey = typeof envAnonKey === 'string' && envAnonKey.trim().length > 20
  ? envAnonKey.trim().replace(/^["']|["']$/g, '')
  : null;

export const isSupabaseClientConfigured = Boolean(validatedUrl && validatedAnonKey);

// Valid placeholders keep the module importable during an unconfigured local build.
// AuthService blocks login before any request is made when configuration is absent.
export const HARDCODED_SUPABASE_URL = validatedUrl || 'https://unconfigured-project.supabase.co';
export const HARDCODED_SUPABASE_ANON_KEY = validatedAnonKey || 'unconfigured-anon-key';

export function ensureValidSupabaseUrl(rawUrl?: string): string {
  return validateClientSupabaseUrl(rawUrl) || HARDCODED_SUPABASE_URL;
}

export const supabase = createClient(HARDCODED_SUPABASE_URL, HARDCODED_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

export async function validateSupabaseConnection(): Promise<{ success: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  if (!isSupabaseClientConfigured) {
    return { success: false, latencyMs: 0, error: 'Supabase browser environment variables are not configured.' };
  }
  try {
    const { error } = await supabase.from('roles').select('id', { count: 'exact', head: true });
    const latencyMs = Date.now() - start;
    return error
      ? { success: false, latencyMs, error: error.message }
      : { success: true, latencyMs };
  } catch (error: any) {
    return { success: false, latencyMs: Date.now() - start, error: error.message || 'Connection failed' };
  }
}

export function getSupabaseConfig(): SupabaseConfig {
  return {
    url: validatedUrl || '',
    anonKey: validatedAnonKey || '',
    isConnected: isSupabaseClientConfigured
  };
}

export function saveSupabaseConfig(_config: Omit<SupabaseConfig, 'isConnected'>): SupabaseConfig {
  // Runtime project switching is intentionally disabled. VITE variables must be
  // changed in the deployment configuration and the application rebuilt.
  return getSupabaseConfig();
}

export function getSupabaseClient(): SupabaseClient {
  return supabase;
}

// Default initial records for the Security & Gate Pass Management system
const initialVisitorsLog: VisitorRecord[] = [];

const initialStudentGatePasses: StudentGatePass[] = [];

const initialStaffGatePasses: StaffGatePass[] = [];

const initialVehiclesLog: VehicleRecord[] = [];

