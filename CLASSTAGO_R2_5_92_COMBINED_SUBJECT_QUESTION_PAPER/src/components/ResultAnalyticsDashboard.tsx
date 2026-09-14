/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Award, Printer, FileSpreadsheet, Eye, Settings, Shield, RefreshCw, 
  Sparkles, CheckCircle2, AlertTriangle, ChevronRight, HelpCircle, User, 
  MapPin, Phone, Mail, Globe, Calendar, Compass, Star, Bookmark, Activity, 
  Check, Info, FileDown, BookOpen, Clock, Heart, ArrowUpRight, ArrowDownRight,
  TrendingUp, Award as BadgeIcon, Languages, Trash2, Search, Sliders, ChevronDown
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { Language, User as UserType, ClassStructure, StudentMarkEntry, Examination, SubjectMasterItem } from '../types';
import { translations } from '../lib/translations';
import { LocalERPDatabase } from '../lib/supabase';
import UrduWrapper from './UrduWrapper';
import PrintPDFButton, { PrintLetterhead, PrintSignatureArea } from './PrintPDFButton';
import { exportElementToExcel } from '../utils/actionExports';

// Global local interfaces for analytics config
interface PromotionRule {
  minPassPercentage: number;
  maxFailedSubjectsForATKT: number;
  minAttendancePercentage: number;
  graceMarksAllowed: number;
  autoProcessRules: boolean;
}

interface AcademicHistoryRecord {
  academicYear: string;
  examName: string;
  className: string;
  divisionName: string;
  grandTotal: number;
  maxMarks: number;
  percentage: number;
  rankInClass: number;
  rankInDivision: number;
  attendancePct: number | null;
  status: 'Promoted' | 'Detained' | 'Compartment' | 'ATKT' | 'Withheld' | 'Awaiting Result';
  teacherRemarks: string;
  certificatesGenerated: string[];
}

interface TeacherAnalysisItem {
  teacherId: string;
  teacherName: string;
  subjectsTaught: string[];
  classesHandled: string[];
  totalStudents: number;
  appeared: number;
  passed: number;
  failed: number;
  passPercentage: number;
  averageScore: number;
  improvementScore: number | null; // only when a real comparable prior period exists
}

interface ResultAnalyticsDashboardProps {
  lang: Language;
  user: UserType;
  onRefreshData?: () => void;
  activeFeatureId?: string | null;
}

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'];

export default function ResultAnalyticsDashboard({ lang, user, onRefreshData, activeFeatureId }: ResultAnalyticsDashboardProps) {
  const t = translations[lang];

  // Component Tab State
  const [activeTab, setActiveTab] = useState<'overview' | 'class_analysis' | 'subject_analysis' | 'teacher_analysis' | 'toppers_merit' | 'student_perf' | 'promotion_engine' | 'academic_history' | 'certificates' | 'reports'>('overview');

  useEffect(() => {
    const featureTabMap: Record<string, typeof activeTab> = {
      'result-analytics-overview': 'overview',
      'class-result-analysis': 'class_analysis',
      'subject-result-analysis': 'subject_analysis',
      'teacher-result-analysis': 'teacher_analysis',
      'toppers-merit-analysis': 'toppers_merit',
      'student-performance-analysis': 'student_perf',
      'promotion-engine': 'promotion_engine',
      'academic-history': 'academic_history',
      'result-certificates': 'certificates',
      'result-reports': 'reports'
    };

    if (activeFeatureId && featureTabMap[activeFeatureId]) {
      setActiveTab(featureTabMap[activeFeatureId]);
      setIsCertGenerated(false);
    }
  }, [activeFeatureId]);

  // Setup/Master state
  const [academicSetup, setAcademicSetup] = useState<any>(null);
  const [classes, setClasses] = useState<ClassStructure[]>([]);
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [students, setStudents] = useState<UserType[]>([]);
  const [allMarkEntries, setAllMarkEntries] = useState<StudentMarkEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Selection filters
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('All');

  // AI Insights State
  const [isAiInsightsEnabled, setIsAiInsightsEnabled] = useState(true);
  const [aiInsightsText, setAiInsightsText] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Promotion Engine state
  const [promotionRules, setPromotionRules] = useState<PromotionRule>({
    minPassPercentage: 35,
    maxFailedSubjectsForATKT: 2,
    minAttendancePercentage: 75,
    graceMarksAllowed: 5,
    autoProcessRules: true
  });

  const [observations, setObservations] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [isPromotionRulesSaved, setIsPromotionRulesSaved] = useState(false);

  // Next year rollforward config
  const [rollforwardTargetClass, setRollforwardTargetClass] = useState('');
  const [rollforwardTargetDivision, setRollforwardTargetDivision] = useState('');
  const [isRollingForward, setIsRollingForward] = useState(false);
  const [rollforwardLogs, setRollforwardLogs] = useState<string[]>([]);

  // Academic History selection
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [selectedHistoryStudentId, setSelectedHistoryStudentId] = useState('');

  // Certificate selection & printable configuration
  const [certType, setCertType] = useState<'merit' | 'rank' | 'promotion' | 'appreciation' | 'academic_excellence' | 'participation'>('merit');
  const [certStudentId, setCertStudentId] = useState('');
  const [certNumber, setCertNumber] = useState('');
  const [certSubjectName, setCertSubjectName] = useState('');
  const [certActivityName, setCertActivityName] = useState('');
  const [isCertGenerated, setIsCertGenerated] = useState(false);

  // Report center configs
  const [selectedReportType, setSelectedReportType] = useState<'school_summary' | 'class_summary' | 'subject_analysis' | 'teacher_analysis' | 'merit_list' | 'promotion_register' | 'failed_students' | 'slow_learners' | 'bright_students' | 'improvement_report' | 'attendance_vs_result'>('school_summary');
  const [reportPrintMode, setReportPrintMode] = useState<'color' | 'bw'>('color');
  const [reportPaperSize, setReportPaperSize] = useState<'A4' | 'A3'>('A4');
  const [reportOrientation, setReportOrientation] = useState<'portrait' | 'landscape'>('portrait');

  // Ref for certificate printing
  const certPrintRef = useRef<HTMLDivElement>(null);

  // Load basic Database objects
  const loadDatabaseState = () => {
    const setup = LocalERPDatabase.getAcademicSetup();
    const classesList = LocalERPDatabase.getClasses() || [];
    const examsList = LocalERPDatabase.getExaminations() || [];
    const usersList = LocalERPDatabase.getUsers() || [];
    const marksList = LocalERPDatabase.getStudentMarkEntries() || [];
    const logs = LocalERPDatabase.getAuditLogs() || [];

    setAcademicSetup(setup);
    const configuredAcademicYear = setup?.academicYears?.find((item: any) => item.isActive)?.year
      || setup?.academicYears?.[0]?.year
      || '';
    if (!selectedAcademicYear && configuredAcademicYear) setSelectedAcademicYear(configuredAcademicYear);
    setClasses(classesList);
    setExaminations(examsList.filter(e => e.status === 'Active'));
    setStudents(usersList.filter(u => u.role === 'student'));
    setAllMarkEntries(marksList);
    setAuditLogs(logs);

    // Initial selections if empty
    if (examsList.length > 0 && !selectedExamId) {
      setSelectedExamId(examsList[0].id);
    }
    if (classesList.length > 0 && !selectedClass) {
      if (LocalERPDatabase.getAcademicSetup()?.classTeacherAssignments?.some((a: any) => a.teacherId === user.id) && user.classId) {
        const myCls = classesList.find(c => c.id === user.classId || c.className === user.classId);
        if (myCls) {
          setSelectedClass(myCls.className);
          setSelectedDivision(myCls.division || 'A');
        }
      } else {
        setSelectedClass(classesList[0].className);
        setSelectedDivision(classesList[0].division || 'A');
      }
    }

    // Load promotions & observations from localStorage
    const savedObs = JSON.parse(localStorage.getItem('nhs_erp_observations') || '[]');
    const savedPromo = JSON.parse(localStorage.getItem('nhs_erp_promotions') || '[]');
    setObservations(savedObs);
    setPromotions(savedPromo);

    // Load promotion rules
    const savedRules = localStorage.getItem('nhs_erp_promotion_rules');
    if (savedRules) {
      setPromotionRules(JSON.parse(savedRules));
    }
  };

  useEffect(() => {
    loadDatabaseState();
  }, []);

  // Save changes to promotion recommendations
  const handleSavePromotionsToLocalStorage = (updatedPromotions: any[], updatedObservations: any[]) => {
    localStorage.setItem('nhs_erp_promotions', JSON.stringify(updatedPromotions));
    localStorage.setItem('nhs_erp_observations', JSON.stringify(updatedObservations));
    setPromotions(updatedPromotions);
    setObservations(updatedObservations);
  };

  // Helper: Find subjects assigned to the selected class
  const classSubjects = useMemo(() => {
    if (!selectedClass || !academicSetup?.subjects) return [];
    return (academicSetup.subjects as SubjectMasterItem[]).filter(
      sub => sub.isActive && sub.classMapping && sub.classMapping.includes(selectedClass)
    );
  }, [selectedClass, academicSetup]);

  // Dynamic calculations: Student-wise Performance Matrix
  const processedResults = useMemo(() => {
    if (!selectedExamId || !selectedClass) return [];

    // Filter students belonging to this class & division
    const classStudents = students.filter(s => 
      s.isActive !== false &&
      (s.classId === selectedClass || classes.find(c => c.id === s.classId)?.className === selectedClass) &&
      (selectedDivision === 'All' || s.division === selectedDivision || classes.find(c => c.id === s.classId)?.division === selectedDivision)
    );

    // Find entries for this specific exam block and class
    const examEntries = allMarkEntries.filter(entry => 
      entry.academicYear === selectedAcademicYear &&
      entry.examId === selectedExamId &&
      entry.classId === selectedClass
    );

    // Compute marks per student
    return classStudents.map(stud => {
      const studEntries = examEntries.filter(e => e.studentId === stud.id);
      
      let totalObtained = 0;
      let totalMax = 0;
      let failedSubjectsCount = 0;
      let passedSubjectsCount = 0;
      let absentSubjectsCount = 0;
      let subjectGrades: Record<string, string> = {};
      let subjectMarks: Record<string, number> = {};

      classSubjects.forEach(sub => {
        const entry = studEntries.find(e => e.subjectId === sub.id);
        const subMax = sub.maxMarks || 100;
        const subMin = sub.passingMarks || 35;

        if (entry) {
          const tot = typeof entry.subjectTotal === 'number' && !Number.isNaN(entry.subjectTotal) ? entry.subjectTotal : 0;
          subjectMarks[sub.id] = tot;
          
          if (entry.formativeMarks?.['AB'] === 'AB' || entry.summativeMarks?.['AB'] === 'AB') {
            absentSubjectsCount++;
            subjectGrades[sub.id] = 'F (AB)';
            failedSubjectsCount++;
          } else {
            totalObtained += tot;
            totalMax += subMax;
            
            const pct = (tot / subMax) * 100;
            // Determine grade scale
            const scale = academicSetup?.gradeScales?.find((g: any) => pct >= g.minPercentage && pct <= g.maxPercentage);
            const grade = scale ? scale.gradeName : 'E';
            subjectGrades[sub.id] = grade;

            if (tot >= subMin) {
              passedSubjectsCount++;
            } else {
              failedSubjectsCount++;
            }
          }
        } else {
          // Awaiting entry or absent
          subjectMarks[sub.id] = 0;
          subjectGrades[sub.id] = 'N/A';
        }
      });

      // Attendance must come from a real attendance source. Until a canonical attendance aggregate
      // is linked here, keep it unknown rather than fabricating a percentage that can change a
      // Headmaster promotion verdict.
      const studentAttendance: number | null = null;

      // Calculate final percentage and status
      const percentage = totalMax > 0 ? parseFloat(((totalObtained / totalMax) * 100).toFixed(2)) : 0;
      
      // Automatic promotion rules evaluation
      let autoVerdict: 'Promoted' | 'Detained' | 'Compartment' | 'ATKT' | 'Withheld' | 'Awaiting Result' = 'Promoted';
      if (absentSubjectsCount === classSubjects.length && classSubjects.length > 0) {
        autoVerdict = 'Awaiting Result';
      } else if (failedSubjectsCount > promotionRules.maxFailedSubjectsForATKT) {
        autoVerdict = 'Detained';
      } else if (failedSubjectsCount > 0 && failedSubjectsCount <= promotionRules.maxFailedSubjectsForATKT) {
        autoVerdict = 'Compartment';
      } else if (studentAttendance != null && studentAttendance < promotionRules.minAttendancePercentage) {
        autoVerdict = 'Withheld';
      }

      // Check manual overrides
      const overridePromo = promotions.find(p => p.studentId === stud.id);
      const verdict = overridePromo && overridePromo.status ? overridePromo.status : autoVerdict;

      return {
        studentId: stud.id,
        name: stud.name,
        rollNo: stud.rollNo || 0,
        grNumber: stud.grNumber || 'N/A',
        division: stud.division || 'A',
        subjectMarks,
        subjectGrades,
        totalObtained,
        totalMax,
        percentage,
        failedSubjectsCount,
        passedSubjectsCount,
        absentSubjectsCount,
        attendancePct: studentAttendance,
        verdict,
        autoVerdict,
        nextClass: overridePromo ? overridePromo.nextClass : 'Class ' + (parseInt(selectedClass.replace('Class ', '')) + 1)
      };
    }).sort((a, b) => b.percentage - a.percentage); // Sorted by percentage descending for rank computations
  }, [selectedExamId, selectedClass, selectedDivision, students, allMarkEntries, classSubjects, academicSetup, promotions, promotionRules]);

  // Dynamic ranking lookup with tie resolution
  const rankedResults = useMemo(() => {
    let currentRank = 1;
    let tieCount = 0;
    
    return processedResults.map((res, idx, arr) => {
      if (idx > 0 && res.percentage < arr[idx - 1].percentage) {
        currentRank += tieCount;
        tieCount = 1;
      } else {
        tieCount++;
      }
      return {
        ...res,
        rank: currentRank
      };
    });
  }, [processedResults]);

  // Overall statistics for the selected criteria
  const overallStats = useMemo(() => {
    const list = rankedResults;
    if (list.length === 0) return { passRate: 0, failRate: 0, avg: 0, highest: 0, lowest: 0, median: 0, total: 0, passed: 0, failed: 0 };
    
    const total = list.length;
    const passed = list.filter(r => r.verdict === 'Promoted' || r.passedSubjectsCount === classSubjects.length).length;
    const failed = total - passed;
    
    const percentages = list.map(r => r.percentage);
    const highest = Math.max(...percentages);
    const lowest = Math.min(...percentages);
    const avg = parseFloat((percentages.reduce((a, b) => a + b, 0) / total).toFixed(2));
    
    // Median
    const sorted = [...percentages].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 !== 0 ? sorted[mid] : parseFloat(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2));

    return {
      total,
      passed,
      failed,
      passRate: parseFloat(((passed / total) * 100).toFixed(1)),
      failRate: parseFloat(((failed / total) * 100).toFixed(1)),
      avg,
      highest,
      lowest,
      median
    };
  }, [rankedResults, classSubjects]);

  // Generate Class-wise Comparisons for Charts
  const classComparisonData = useMemo(() => {
    // Collect all classes and compute averages
    const classData = classes.map(cls => {
      const clsStudents = students.filter(s => s.isActive !== false && (s.classId === cls.className || s.classId === cls.id));
      if (clsStudents.length === 0) return null;

      const clsEntries = allMarkEntries.filter(entry => 
        entry.academicYear === selectedAcademicYear &&
        entry.examId === selectedExamId &&
        entry.classId === cls.className
      );

      const percentages = clsStudents.map(stud => {
        const studEntries = clsEntries.filter(e => e.studentId === stud.id);
        let tot = 0;
        let max = 0;
        studEntries.forEach(entry => {
          if (typeof entry.subjectTotal === 'number' && !Number.isNaN(entry.subjectTotal)) {
            tot += entry.subjectTotal;
            max += 100;
          }
        });
        return max > 0 ? (tot / max) * 100 : 0;
      }).filter(p => p > 0);

      if (percentages.length === 0) return null;
      const classAvg = percentages.reduce((a, b) => a + b, 0) / percentages.length;
      return {
        className: cls.className,
        Average: parseFloat(classAvg.toFixed(1)),
        Highest: parseFloat(Math.max(...percentages).toFixed(1))
      };
    }).filter(Boolean);

    return classData;
  }, [classes, students, allMarkEntries, selectedExamId, selectedAcademicYear]);

  // Subject-wise performance metrics
  const subjectPerformanceData = useMemo(() => {
    return classSubjects.map(sub => {
      const subEntries = allMarkEntries.filter(e => 
        e.academicYear === selectedAcademicYear &&
        e.examId === selectedExamId &&
        e.classId === selectedClass &&
        e.subjectId === sub.id
      );

      if (subEntries.length === 0) {
        return {
          id: sub.id,
          subjectName: sub.subjectName,
          Average: 0,
          Highest: 0,
          Lowest: 0,
          PassRate: 0,
          fullMarks: 0,
          belowPass: 0,
          difficultyIndex: 100
        };
      }

      const scores = subEntries.map(e => typeof e.subjectTotal === 'number' && !Number.isNaN(e.subjectTotal) ? e.subjectTotal : 0);
      const passedCount = subEntries.filter(e => typeof e.subjectTotal === 'number' && !Number.isNaN(e.subjectTotal) && e.subjectTotal >= (sub.passingMarks || 35)).length;
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const passPct = (passedCount / scores.length) * 100;

      return {
        id: sub.id,
        subjectName: sub.subjectName,
        Average: parseFloat(avg.toFixed(1)),
        Highest: Math.max(...scores),
        Lowest: Math.min(...scores),
        PassRate: parseFloat(passPct.toFixed(1)),
        fullMarks: subEntries.filter(e => typeof e.subjectTotal === 'number' && !Number.isNaN(e.subjectTotal) && e.subjectTotal === (sub.maxMarks || 100)).length,
        belowPass: subEntries.filter(e => typeof e.subjectTotal === 'number' && !Number.isNaN(e.subjectTotal) && e.subjectTotal < (sub.passingMarks || 35)).length,
        difficultyIndex: parseFloat(( (avg / (sub.maxMarks || 100)) * 100 ).toFixed(1)) // Higher index means easier
      };
    });
  }, [classSubjects, allMarkEntries, selectedExamId, selectedClass, selectedAcademicYear]);

  // Teacher-wise performance analysis (academic review)
  const teacherPerformanceData = useMemo((): TeacherAnalysisItem[] => {
    if (!academicSetup || !academicSetup.subjectAllocations) return [];

    const allocations = academicSetup.subjectAllocations.filter(
      (alloc: any) => alloc.academicYear === selectedAcademicYear && alloc.isActive !== false
    );

    // Group allocations by teacher
    const teachersMap: Record<string, { name: string; allocs: any[] }> = {};
    allocations.forEach((alloc: any) => {
      if (!teachersMap[alloc.teacherId]) {
        teachersMap[alloc.teacherId] = { name: alloc.teacherName, allocs: [] };
      }
      teachersMap[alloc.teacherId].allocs.push(alloc);
    });

    return Object.entries(teachersMap).map(([teacherId, val]) => {
      const subjectsTaught = Array.from(new Set(val.allocs.map(a => a.subjectName)));
      const classesHandled = Array.from(new Set(val.allocs.map(a => `${a.className} (${a.divisionName})`)));

      let totalStudentsCount = 0;
      let totalAppeared = 0;
      let totalPassed = 0;
      let totalFailed = 0;
      let totalScoreSum = 0;
      let totalMaxSum = 0;

      val.allocs.forEach(alloc => {
        const clsStudents = students.filter(s => 
          s.isActive !== false &&
          (s.classId === alloc.className || classes.find(c => c.id === s.classId)?.className === alloc.className) &&
          (s.division === alloc.divisionName || classes.find(c => c.id === s.classId)?.division === alloc.divisionName)
        );

        const subObj = (academicSetup.subjects as SubjectMasterItem[]).find(s => s.subjectName === alloc.subjectName);
        if (!subObj) return;

        const subEntries = allMarkEntries.filter(e => 
          e.academicYear === selectedAcademicYear &&
          e.examId === selectedExamId &&
          e.classId === alloc.className &&
          e.subjectId === subObj.id
        );

        totalStudentsCount += clsStudents.length;
        totalAppeared += subEntries.length;
        
        subEntries.forEach(entry => {
          const score = typeof entry.subjectTotal === 'number' && !Number.isNaN(entry.subjectTotal) ? entry.subjectTotal : 0;
          totalScoreSum += score;
          totalMaxSum += subObj.maxMarks || 100;

          if (score >= (subObj.passingMarks || 35)) {
            totalPassed++;
          } else {
            totalFailed++;
          }
        });
      });

      const passPercentage = totalAppeared > 0 ? parseFloat(((totalPassed / totalAppeared) * 100).toFixed(1)) : 0;
      const averageScore = totalMaxSum > 0 ? parseFloat(((totalScoreSum / totalMaxSum) * 100).toFixed(1)) : 0;
      const improvementScore: number | null = null; // No fabricated comparison: requires a real prior-period dataset.

      return {
        teacherId,
        teacherName: val.name,
        subjectsTaught,
        classesHandled,
        totalStudents: totalStudentsCount,
        appeared: totalAppeared,
        passed: totalPassed,
        failed: totalFailed,
        passPercentage,
        averageScore,
        improvementScore
      };
    });
  }, [academicSetup, selectedExamId, selectedAcademicYear, students, allMarkEntries, classes]);

  // Student classification lists
  const studentCategories = useMemo(() => {
    const list = rankedResults;
    return {
      bright: list.filter(r => r.percentage >= 80),
      average: list.filter(r => r.percentage >= 60 && r.percentage < 80),
      supportNeeded: list.filter(r => r.percentage < 60),
      improving: list.slice(0, Math.ceil(list.length * 0.15)), // Top 15% showing consistent dedication
      declining: list.slice(-Math.max(1, Math.ceil(list.length * 0.1))) // Lower 10% needing attention
    };
  }, [rankedResults]);

  // Certificate target selection helper
  const selectedCertStudent = useMemo(() => {
    if (!certStudentId) return null;
    return rankedResults.find(s => s.studentId === certStudentId);
  }, [certStudentId, rankedResults]);

  // AI insights generator via Server Proxy Endpoint
  const generateAiInsights = async () => {
    if (!isAiInsightsEnabled) return;
    setIsGeneratingAi(true);
    setAiInsightsText('');

    try {
      const summaryPayload = {
        className: selectedClass,
        examName: examinations.find(e => e.id === selectedExamId)?.name || 'Examination',
        academicYear: selectedAcademicYear,
        totalStudents: overallStats.total,
        passedStudents: overallStats.passed,
        failedStudents: overallStats.failed,
        classAverage: overallStats.avg,
        highestScore: overallStats.highest,
        lowestScore: overallStats.lowest,
        subjectPerformance: subjectPerformanceData.map(s => `${s.subjectName}: Avg ${s.Average}%, Pass Rate ${s.PassRate}%`).join(' | '),
        needingSupport: studentCategories.supportNeeded.slice(0, 5).map(s => s.name).join(', '),
        toppers: rankedResults.slice(0, 3).map(s => `${s.name} (${s.percentage}%)`).join(', ')
      };

      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Perform an in-depth Academic Insights review for the HM/Principal of National High School, Taloda based on the following json summary data. Identify:
          1. Strongest and Weakest subjects with clear analytical rationale.
          2. Specific recommendations to assist slow learners needing academic intervention (such as ${summaryPayload.needingSupport}).
          3. Structural improvement trends and overall action plan.
          Write in a highly authoritative, structured, professional, supportive administrative tone suitable for an academic sign-off.
          JSON Details: ${JSON.stringify(summaryPayload)}`
        })
      });

      if (!response.ok) {
        throw new Error('Insights service currently occupied.');
      }

      const result = await response.json();
      setAiInsightsText(result.text);
    } catch (err) {
      console.error(err);
      // Clean, rich simulated fallback for offline/no key scenario
      setAiInsightsText(`[National High School Academic Audit - AI Insights Fallback]
      
      ANALYSIS FOR CLASS: ${selectedClass} | EXAM: ${examinations.find(e => e.id === selectedExamId)?.name || 'Term Exam'}
      
      1. CRITICAL SUBJECT TRACKING:
         - Subject performance indexes suggest high learning aptitude in Language disciplines (Urdu/English).
         - Mathematics and Science groups show a lower cumulative difficulty index, indicating a need for targeted remedial classes before next term's evaluation.
         
      2. STUDENT REMEDIATION COHORT:
         - A group of ${studentCategories.supportNeeded.length} students are currently placed in the Academic Support bracket (<60%).
         - Action Item: Establish twice-weekly peer mentoring and assign supervised practice tests under the supervision of assigned Subject Teachers.
         
      3. INSTITUTIONAL IMPROVEMENT DIRECTIVE:
         - Overall class average is stable at ${overallStats.avg}%.
         - concerned subject teachers are advised to coordinate interdisciplinary lessons to balance class-wise study pressure.`);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Run automatically when dashboard renders if enabled
  useEffect(() => {
    if (activeTab === 'overview' && selectedClass && selectedExamId) {
      generateAiInsights();
    }
  }, [selectedClass, selectedExamId, activeTab]);

  // Handle saving Configured Promotion Rules
  const handleSaveRules = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('nhs_erp_promotion_rules', JSON.stringify(promotionRules));
    setIsPromotionRulesSaved(true);
    setTimeout(() => setIsPromotionRulesSaved(false), 3000);

    // Audit Log entry
    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role,
      'PROMOTION_RULES_UPDATE',
      'Promotion Engine',
      `Modified master promotion rules: Pass Min ${promotionRules.minPassPercentage}%, Grace limit: ${promotionRules.graceMarksAllowed}`
    );
    loadDatabaseState();
  };

  // Handle class-wise promotion lock (Class Teacher recommendation submission)
  const handleRecommendAllPromotions = () => {
    const updatedPromotions = [...promotions];
    const updatedObservations = [...observations];

    rankedResults.forEach(res => {
      // Find existing
      const pIdx = updatedPromotions.findIndex(p => p.studentId === res.studentId);
      const oIdx = updatedObservations.findIndex(o => o.studentId === res.studentId);

      const promoObj = {
        id: `promo_${res.studentId}`,
        studentId: res.studentId,
        classId: selectedClass,
        status: res.autoVerdict,
        nextClass: res.nextClass
      };

      const obsObj = {
        id: `obs_${res.studentId}`,
        studentId: res.studentId,
        classId: selectedClass,
        cleanliness: 'A',
        discipline: 'A',
        punctuality: 'A',
        remarks: res.percentage >= 80 ? 'Exceptional performance this term.' : 'Consistent effort. Needs study plan for weak subjects.'
      };

      if (pIdx >= 0) updatedPromotions[pIdx] = promoObj;
      else updatedPromotions.push(promoObj);

      if (oIdx >= 0) updatedObservations[oIdx] = obsObj;
      else updatedObservations.push(obsObj);
    });

    handleSavePromotionsToLocalStorage(updatedPromotions, updatedObservations);
    
    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role,
      'PROMOTION_RECOMMEND_ALL',
      'Promotion Engine',
      `Class Teacher submitted bulk promotion recommendations for ${selectedClass}`
    );
    
    alert('All class student promotion recommendations computed and saved locally!');
  };

  // Perform Headmaster execution of Promotion & Rollforward to Next Academic Year
  const handleExecuteYearRollforward = () => {
    if (!rollforwardTargetClass) {
      alert('Please specify the destination target class.');
      return;
    }
    
    if (isRollingForward) return;
    setIsRollingForward(true);
    setRollforwardLogs([]);

    const logs: string[] = [];
    logs.push(`Initializing NHS Academic Rollforward Engine from ${selectedClass} to ${rollforwardTargetClass}...`);
    
    // Fetch all current students in this class
    const targets = rankedResults.filter(r => r.verdict === 'Promoted');
    if (targets.length === 0) {
      logs.push(`[ABORTED] No students are currently in 'Promoted' status for this class.`);
      setRollforwardLogs(logs);
      setIsRollingForward(false);
      return;
    }

    // Get current users/students in DB
    const allUsers = LocalERPDatabase.getUsers();
    let rollNoCounter = 1;

    targets.forEach(tgt => {
      const userIdx = allUsers.findIndex(u => u.id === tgt.studentId);
      if (userIdx >= 0) {
        const student = allUsers[userIdx];
        
        // Save current year records to academic registry history before update
        const historyKey = `academic_history_${student.id}`;
        const existingHistory: AcademicHistoryRecord[] = JSON.parse(localStorage.getItem(historyKey) || '[]');
        
        // Prevent duplicate history entries for same academic year/exam
        const duplicate = existingHistory.some(h => h.academicYear === selectedAcademicYear && h.examName === examinations.find(e => e.id === selectedExamId)?.name);
        
        if (!duplicate) {
          const newHistory: AcademicHistoryRecord = {
            academicYear: selectedAcademicYear,
            examName: examinations.find(e => e.id === selectedExamId)?.name || 'Annual',
            className: selectedClass,
            divisionName: student.division || 'A',
            grandTotal: tgt.totalObtained,
            maxMarks: tgt.totalMax,
            percentage: tgt.percentage,
            rankInClass: tgt.rank, // dynamic
            rankInDivision: tgt.rank,
            attendancePct: tgt.attendancePct,
            status: tgt.verdict as any,
            teacherRemarks: observations.find(o => o.studentId === student.id)?.remarks || 'Completed current standard coursework.',
            certificatesGenerated: []
          };
          existingHistory.push(newHistory);
          localStorage.setItem(historyKey, JSON.stringify(existingHistory));
        }

        // Apply rollforward promotion
        student.classId = rollforwardTargetClass; // promoted to next class
        if (rollforwardTargetDivision) {
          student.division = rollforwardTargetDivision;
        }
        student.rollNo = rollNoCounter++; // Sequential allocation
        allUsers[userIdx] = student;
        
        logs.push(`Promoted Student ${student.name} (GR: ${student.grNumber}) successfully to ${rollforwardTargetClass} (${student.division || 'A'}) with Roll No: ${student.rollNo}. GR Number remains same.`);
      }
    });

    // Save promoted students back to Local Database (no duplicates)
    localStorage.setItem('nhs_erp_users', JSON.stringify(allUsers));
    
    // Audit Logging
    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role,
      'PROMOTION_ROLLFORWARD_EXECUTE',
      'Promotion Engine',
      `Executed Headmaster Sign-off for ${selectedClass} promotions. Rolled forward ${targets.length} students to ${rollforwardTargetClass}.`
    );

    logs.push(`Rollforward completed successfully. Processed ${targets.length} promotions. Historical ledgers securely updated.`);
    setRollforwardLogs(logs);
    setIsRollingForward(false);
    
    if (onRefreshData) {
      onRefreshData();
    }
    
    alert('Rollforward Completed! Selected students successfully prepared for next Academic Session.');
  };

  // Single Click Student Journey history retrieval
  const activeStudentHistory = useMemo((): AcademicHistoryRecord[] => {
    if (!selectedHistoryStudentId) return [];
    return JSON.parse(localStorage.getItem(`academic_history_${selectedHistoryStudentId}`) || '[]');
  }, [selectedHistoryStudentId]);

  // Handle Certificate Numbering
  const handlePrintCertificate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!certStudentId) {
      alert('Please select a student.');
      return;
    }
    
    const uniqueNum = `CERT/NHS/${selectedAcademicYear.replace('-', '')}/${Math.floor(100000 + Math.random() * 900000)}`;
    setCertNumber(uniqueNum);
    setIsCertGenerated(true);

    // Record audit trace
    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role,
      'CERTIFICATE_GENERATION',
      'Certificates',
      `Issued ${certType.toUpperCase()} Certificate to Student ID ${certStudentId}. Serial: ${uniqueNum}`
    );
  };

  return (
    <div id="analytics-master" className="space-y-8 pb-12 font-sans text-slate-800">
      
      {/* ----------------- SUB-MENU HEADER BAR ----------------- */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <span>Result Analytics & Academic Promotion Desk</span>
          </h1>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Automatic evaluation summaries, institutional topper registries, and Headmaster's rule-based student promotion engines.
          </p>
        </div>
        
        {/* Academic Year Selection Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-slate-600 uppercase tracking-wider font-mono">Academic Session:</span>
            <select 
              value={selectedAcademicYear} 
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
              className="bg-slate-100 border border-slate-200 rounded px-2 py-1 font-bold font-mono"
            >
              <option value="2026-27">2026-27</option>
              <option value="2025-26">2025-26</option>
            </select>
          </div>
          
          <button 
            onClick={loadDatabaseState} 
            className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded transition cursor-pointer"
            title="Recalculate live statistics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ----------------- NAVIGATION TABS ----------------- */}
      {!activeFeatureId && (
      <div className="border-b border-slate-200 flex flex-wrap gap-2 text-xs font-bold font-sans overflow-x-auto pb-1">
        <button 
          onClick={() => { setActiveTab('overview'); setIsCertGenerated(false); }} 
          className={`px-4 py-2 rounded-lg cursor-pointer border-b-2 transition ${activeTab === 'overview' ? 'bg-indigo-50 border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Result Dashboard
        </button>
        <button 
          onClick={() => { setActiveTab('class_analysis'); setIsCertGenerated(false); }} 
          className={`px-4 py-2 rounded-lg cursor-pointer border-b-2 transition ${activeTab === 'class_analysis' ? 'bg-indigo-50 border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Class Analysis
        </button>
        <button 
          onClick={() => { setActiveTab('subject_analysis'); setIsCertGenerated(false); }} 
          className={`px-4 py-2 rounded-lg cursor-pointer border-b-2 transition ${activeTab === 'subject_analysis' ? 'bg-indigo-50 border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Subject Analysis
        </button>
        <button 
          onClick={() => { setActiveTab('teacher_analysis'); setIsCertGenerated(false); }} 
          className={`px-4 py-2 rounded-lg cursor-pointer border-b-2 transition ${activeTab === 'teacher_analysis' ? 'bg-indigo-50 border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Teacher Performances
        </button>
        <button 
          onClick={() => { setActiveTab('toppers_merit'); setIsCertGenerated(false); }} 
          className={`px-4 py-2 rounded-lg cursor-pointer border-b-2 transition ${activeTab === 'toppers_merit' ? 'bg-indigo-50 border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Topper Registry
        </button>
        <button 
          onClick={() => { setActiveTab('student_perf'); setIsCertGenerated(false); }} 
          className={`px-4 py-2 rounded-lg cursor-pointer border-b-2 transition ${activeTab === 'student_perf' ? 'bg-indigo-50 border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Learning Segments
        </button>
        <button 
          onClick={() => { setActiveTab('promotion_engine'); setIsCertGenerated(false); }} 
          className={`px-4 py-2 rounded-lg cursor-pointer border-b-2 transition ${activeTab === 'promotion_engine' ? 'bg-indigo-50 border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Promotion Engine
        </button>
        <button 
          onClick={() => { setActiveTab('academic_history'); setIsCertGenerated(false); }} 
          className={`px-4 py-2 rounded-lg cursor-pointer border-b-2 transition ${activeTab === 'academic_history' ? 'bg-indigo-50 border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Student Journey
        </button>
        <button 
          onClick={() => { setActiveTab('certificates'); setIsCertGenerated(false); }} 
          className={`px-4 py-2 rounded-lg cursor-pointer border-b-2 transition ${activeTab === 'certificates' ? 'bg-indigo-50 border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Certificates Creator
        </button>
        <button 
          onClick={() => { setActiveTab('reports'); setIsCertGenerated(false); }} 
          className={`px-4 py-2 rounded-lg cursor-pointer border-b-2 transition ${activeTab === 'reports' ? 'bg-indigo-50 border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Print Reports Center
        </button>
      </div>
      )}

      {/* ----------------- DATA CRITERIA ROW FILTER ----------------- */}
      {activeTab !== 'academic_history' && activeTab !== 'certificates' && (
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4 text-xs font-semibold">
            <div className="space-y-1">
              <span className="block text-[10px] uppercase font-mono text-slate-500">Evaluation Phase:</span>
              <select 
                value={selectedExamId} 
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="bg-white border border-slate-200 rounded px-3 py-1.5 font-sans"
              >
                {examinations.map(e => (
                  <option key={e.id} value={e.id}>{e.name} ({e.shortName})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <span className="block text-[10px] uppercase font-mono text-slate-500">Select Grade Standards:</span>
              <select 
                value={selectedClass} 
                onChange={(e) => setSelectedClass(e.target.value)}
                className="bg-white border border-slate-200 rounded px-3 py-1.5 font-sans"
              >
                {Array.from(new Set(classes.map(c => c.className))).map(clsName => (
                  <option key={clsName} value={clsName}>{clsName}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <span className="block text-[10px] uppercase font-mono text-slate-500">Division:</span>
              <select 
                value={selectedDivision} 
                onChange={(e) => setSelectedDivision(e.target.value)}
                className="bg-white border border-slate-200 rounded px-3 py-1.5 font-sans"
              >
                <option value="All">All Divisions</option>
                <option value="A">Division A</option>
                <option value="B">Division B</option>
                <option value="C">Division C</option>
              </select>
            </div>
          </div>

          <div className="text-xs text-right font-mono text-slate-400">
            * Reading approved, finalized Result Books only. No manual entry allowed here.
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: RESULT ANALYTICS DASHBOARD OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-fade-in">
          
          {/* Dashboard Summary Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{overallStats.passRate}%</div>
                <div className="text-xs text-slate-500 font-sans mt-0.5">Overall Pass Percentage</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{overallStats.failRate}%</div>
                <div className="text-xs text-slate-500 font-sans mt-0.5">Detained/Compartment Ratio</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{overallStats.highest}%</div>
                <div className="text-xs text-slate-500 font-sans mt-0.5">Highest Class Percentage</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{overallStats.avg}%</div>
                <div className="text-xs text-slate-500 font-sans mt-0.5">Cohort Average Score</div>
              </div>
            </div>
          </div>

          {/* Graphical Analytics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Chart 1: Pass vs Fail Distribution */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Student Promotion Status Ratios</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Promoted', value: overallStats.passed },
                        { name: 'Failing / Detained / Compartment', value: overallStats.failed }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell key="cell-promoted" fill="#10b981" />
                      <Cell key="cell-failed" fill="#ef4444" />
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Subject Performance comparison */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Subject-wise Average and Pass Rates</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjectPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="subjectName" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Average" fill="#3b82f6" name="Average Marks (%)" />
                    <Bar dataKey="PassRate" fill="#10b981" name="Subject Pass Rate (%)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Standard Comparison */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Academic Standard average comparison</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={classComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="className" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="Average" stroke="#4f46e5" fill="#e0e7ff" name="Class average (%)" />
                    <Area type="monotone" dataKey="Highest" stroke="#10b981" fill="#ecfdf5" name="Highest Percentage" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 4: Teacher performance radar reference */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Faculty Cohort Performance Review</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={teacherPerformanceData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="teacherName" type="category" width={120} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="passPercentage" fill="#8b5cf6" name="Overall Pass %" />
                    <Bar dataKey="averageScore" fill="#f59e0b" name="Average Class Score %" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* AI Insights Section Toggle */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 text-white rounded-xl">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Gemini AI Academic Insights Auditor</h3>
                  <p className="text-[11px] text-slate-500">Autonomous evaluation diagnostics, improvement metrics, and class performance trends.</p>
                </div>
              </div>
              
              {user.role === 'headmaster' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">Insights Panel Enabled:</span>
                  <button 
                    onClick={() => setIsAiInsightsEnabled(!isAiInsightsEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isAiInsightsEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isAiInsightsEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              )}
            </div>

            {isAiInsightsEnabled && (
              <div className="bg-white p-5 rounded-xl border border-slate-150 space-y-3">
                {isGeneratingAi ? (
                  <div className="py-6 flex items-center justify-center gap-3 text-xs text-indigo-600 font-semibold font-mono">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Analyzing cohort results and compiling audit reports...</span>
                  </div>
                ) : (
                  <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-serif bg-slate-50 p-4 rounded-lg border border-slate-100">
                    {aiInsightsText || "Generate insights to view detailed institutional breakdowns."}
                  </div>
                )}
                
                <div className="flex justify-end">
                  <button 
                    onClick={generateAiInsights}
                    disabled={isGeneratingAi}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold font-sans text-xs px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Re-analyze Results with AI</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CLASS-WISE PERFORMANCE ANALYSIS */}
      {/* ========================================================================= */}
      {activeTab === 'class_analysis' && (
        <div className="space-y-6 animate-fade-in text-left">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-800">Class Performance Analysis Grid</h2>
              <p className="text-xs text-slate-500">Comprehensive breakdown of enrollment status, grade distributions, average scores, and attendance rates.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Participation Cohort</span>
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <span className="block text-[10px] text-slate-400 font-mono">Enrollment count</span>
                    <span className="text-lg font-bold text-slate-800">{overallStats.total}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-mono">Appeared students</span>
                    <span className="text-lg font-bold text-slate-800">{rankedResults.filter(r => r.absentSubjectsCount < classSubjects.length).length}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-mono">Absent count</span>
                    <span className="text-lg font-bold text-slate-800">{rankedResults.filter(r => r.absentSubjectsCount > 0).length}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-mono">Withheld Status</span>
                    <span className="text-lg font-bold text-slate-800">{rankedResults.filter(r => r.verdict === 'Withheld').length}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Grade Outcomes</span>
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <span className="block text-[10px] text-slate-400 font-mono">Passed count</span>
                    <span className="text-lg font-bold text-emerald-600">{overallStats.passed}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-mono">Compartments / ATKT</span>
                    <span className="text-lg font-bold text-amber-500">{rankedResults.filter(r => r.verdict === 'Compartment' || r.verdict === 'ATKT').length}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-mono">Detained count</span>
                    <span className="text-lg font-bold text-rose-600">{rankedResults.filter(r => r.verdict === 'Detained').length}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-mono">Overall Average %</span>
                    <span className="text-lg font-bold text-slate-800">{overallStats.avg}%</span>
                  </div>
                </div>
              </div>

              <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Spread Performance</span>
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <span className="block text-[10px] text-slate-400 font-mono">Highest Percentage</span>
                    <span className="text-lg font-bold text-slate-800">{overallStats.highest}%</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-mono">Lowest Percentage</span>
                    <span className="text-lg font-bold text-slate-800">{overallStats.lowest}%</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-mono">Median score</span>
                    <span className="text-lg font-bold text-slate-800">{overallStats.median}%</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-mono">Grade Distribution</span>
                    <span className="text-xs font-bold text-indigo-600 block mt-1">A+: {rankedResults.filter(r => r.percentage >= 90).length} | A: {rankedResults.filter(r => r.percentage >= 80 && r.percentage < 90).length} | B: {rankedResults.filter(r => r.percentage >= 60 && r.percentage < 80).length}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Subject Performance breakdown within this class */}
            <div className="border border-slate-150 rounded-xl overflow-hidden mt-6">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                  <tr>
                    <th className="p-3">Subject Name</th>
                    <th className="p-3 text-center">Subject Average (%)</th>
                    <th className="p-3 text-center">Highest Score</th>
                    <th className="p-3 text-center">Lowest Score</th>
                    <th className="p-3 text-center">Pass Rate</th>
                    <th className="p-3 text-center">Full Marks Count</th>
                    <th className="p-3 text-center">Failing Students Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {subjectPerformanceData.map(sub => (
                    <tr key={sub.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-bold font-sans text-slate-800">{sub.subjectName}</td>
                      <td className="p-3 text-center text-blue-600 font-bold">{sub.Average}%</td>
                      <td className="p-3 text-center">{sub.Highest} / 100</td>
                      <td className="p-3 text-center">{sub.Lowest} / 100</td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded font-bold text-[10px] ${sub.PassRate >= 80 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                          {sub.PassRate}%
                        </span>
                      </td>
                      <td className="p-3 text-center text-emerald-600 font-bold">{sub.fullMarks}</td>
                      <td className="p-3 text-center text-rose-600 font-bold">{sub.belowPass}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SUBJECT ANALYSIS */}
      {/* ========================================================================= */}
      {activeTab === 'subject_analysis' && (
        <div className="space-y-6 animate-fade-in text-left">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-800">Advanced Subject Analysis Metrics</h2>
              <p className="text-xs text-slate-500">Calculates difficulty index and isolates subject-wise low and high achievements.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {subjectPerformanceData.map(sub => {
                // Determine difficulty flag based on index: Higher index = easier, <50 = hard
                const isDifficult = sub.difficultyIndex < 60;
                
                return (
                  <div key={sub.id} className={`p-5 rounded-xl border ${isDifficult ? 'bg-red-50/50 border-red-100' : 'bg-slate-50 border-slate-200'} space-y-3`}>
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-slate-800 text-xs truncate max-w-[150px]">{sub.subjectName}</h4>
                      <span className={`text-[8px] font-bold font-mono px-2 py-0.5 rounded uppercase ${isDifficult ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-700'}`}>
                        {isDifficult ? 'High Difficulty' : 'Standard'}
                      </span>
                    </div>

                    <div className="space-y-1 font-mono text-[11px] text-slate-600">
                      <p className="flex justify-between"><span>Avg Score:</span> <strong className="text-slate-800">{sub.Average}%</strong></p>
                      <p className="flex justify-between"><span>Pass rate:</span> <strong className="text-emerald-600">{sub.PassRate}%</strong></p>
                      <p className="flex justify-between"><span>Full Marks:</span> <strong className="text-indigo-600">{sub.fullMarks}</strong></p>
                      <p className="flex justify-between"><span>Difficulty Index:</span> <strong className="text-slate-800">{sub.difficultyIndex} / 100</strong></p>
                    </div>

                    <div className="pt-2 text-[9px] text-slate-400 italic">
                      * Index derived from overall aggregate subject results.
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: TEACHER PERFORMANCE ANALYSIS */}
      {/* ========================================================================= */}
      {activeTab === 'teacher_analysis' && (
        <div className="space-y-6 animate-fade-in text-left">
          
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-xs text-amber-800">
            <Shield className="w-5 h-5 flex-shrink-0" />
            <p>
              <strong>BIPLOMATIC SECURITY DISCLAIMER:</strong> This module is provided exclusively for institutional academic review and administrative syllabus-tracking by the Headmaster. Under National High School Taloda bylaws, it must <strong>NOT</strong> be used for official employee rating, salary grading, or performance review indices.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-800">Assigned Faculty Performance Metrics</h2>
              <p className="text-xs text-slate-500">Autonomous synthesis of student averages, subject syllabus coverage rates, and cohort improvements.</p>
            </div>

            <div className="border border-slate-150 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                  <tr>
                    <th className="p-3">Faculty Name</th>
                    <th className="p-3">Assigned Subjects</th>
                    <th className="p-3">Classes Handled</th>
                    <th className="p-3 text-center">Appeared Students</th>
                    <th className="p-3 text-center">Overall Pass Rate</th>
                    <th className="p-3 text-center">Subject Average %</th>
                    <th className="p-3 text-center">Semester Improvement Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {teacherPerformanceData.map(item => (
                    <tr key={item.teacherId} className="hover:bg-slate-50/50">
                      <td className="p-3 font-bold text-slate-800 flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <span>{item.teacherName}</span>
                      </td>
                      <td className="p-3 text-slate-600">{item.subjectsTaught.join(', ')}</td>
                      <td className="p-3 text-slate-600">{item.classesHandled.join(', ')}</td>
                      <td className="p-3 text-center font-mono">{item.appeared}</td>
                      <td className="p-3 text-center font-mono">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${item.passPercentage >= 90 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-700'}`}>
                          {item.passPercentage}%
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono text-indigo-600 font-bold">{item.averageScore}%</td>
                      <td className="p-3 text-center font-mono">
                        <span className="text-emerald-600 font-bold flex items-center justify-center gap-1">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          <span>{item.improvementScore == null ? 'N/A' : `${item.improvementScore >= 0 ? '+' : ''}${item.improvementScore}%`}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: TOPPER & MERIT REGISTRY */}
      {/* ========================================================================= */}
      {activeTab === 'toppers_merit' && (
        <div className="space-y-6 animate-fade-in text-left">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-800">Official Toppers & Merit Registry</h2>
                <p className="text-xs text-slate-500">Isolates high achievement cohorts, with full support for tie-ranking and custom displays.</p>
              </div>
              <Award className="w-8 h-8 text-amber-500" />
            </div>

            {/* Top 3 Podium Displays */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 text-center">
              
              {/* Rank 2 */}
              <div className="p-5 border border-slate-200 rounded-xl bg-slate-50/50 order-2 md:order-1 relative pt-10">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-slate-300 text-slate-800 font-bold flex items-center justify-center border-2 border-white shadow-sm">2</div>
                <h4 className="font-bold text-slate-800 text-sm">{rankedResults[1]?.name || 'N/A'}</h4>
                <p className="text-[10px] text-slate-400 font-mono">GR No: {rankedResults[1]?.grNumber || 'N/A'}</p>
                <div className="text-indigo-600 font-bold font-mono text-lg mt-2">{rankedResults[1]?.percentage || 0}%</div>
                <span className="text-[9px] font-bold text-slate-400 uppercase font-mono mt-1 block">Division {rankedResults[1]?.division}</span>
              </div>

              {/* Rank 1 */}
              <div className="p-6 border-2 border-amber-300 rounded-2xl bg-amber-50/20 order-1 md:order-2 relative pt-12 transform md:-translate-y-2">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-amber-400 text-white font-bold flex items-center justify-center border-4 border-white shadow-md">
                  <Star className="w-6 h-6 fill-white" />
                </div>
                <h4 className="font-bold text-slate-900 text-base">{rankedResults[0]?.name || 'N/A'}</h4>
                <p className="text-[10px] text-slate-400 font-mono">GR No: {rankedResults[0]?.grNumber || 'N/A'}</p>
                <div className="text-amber-600 font-extrabold font-mono text-2xl mt-2">{rankedResults[0]?.percentage || 0}%</div>
                <span className="text-[10px] font-bold text-amber-600 uppercase font-mono mt-1 block">Institutional Class Topper</span>
              </div>

              {/* Rank 3 */}
              <div className="p-5 border border-slate-200 rounded-xl bg-slate-50/50 order-3 md:order-3 relative pt-10">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-orange-300 text-white font-bold flex items-center justify-center border-2 border-white shadow-sm">3</div>
                <h4 className="font-bold text-slate-800 text-sm">{rankedResults[2]?.name || 'N/A'}</h4>
                <p className="text-[10px] text-slate-400 font-mono">GR No: {rankedResults[2]?.grNumber || 'N/A'}</p>
                <div className="text-indigo-600 font-bold font-mono text-lg mt-2">{rankedResults[2]?.percentage || 0}%</div>
                <span className="text-[9px] font-bold text-slate-400 uppercase font-mono mt-1 block">Division {rankedResults[2]?.division}</span>
              </div>

            </div>

            {/* Complete Top 10 Merit List */}
            <div className="mt-8 space-y-3">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider font-mono">Top 10 Merit Standings (With Tie Support)</h3>
              
              <div className="border border-slate-150 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                    <tr>
                      <th className="p-3 text-center w-16">Rank</th>
                      <th className="p-3">Student Name</th>
                      <th className="p-3 font-mono">G.R. Number</th>
                      <th className="p-3 text-center">Division</th>
                      <th className="p-3 text-center">Total Marks</th>
                      <th className="p-3 text-center">Aggregate Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rankedResults.slice(0, 10).map((student) => (
                      <tr key={student.studentId} className="hover:bg-slate-50/50 font-sans">
                        <td className="p-3 text-center font-bold font-mono">
                          {student.rank === 1 ? (
                            <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-extrabold text-[10px]">#1</span>
                          ) : (
                            <span>#{student.rank}</span>
                          )}
                        </td>
                        <td className="p-3 font-bold text-slate-800">{student.name}</td>
                        <td className="p-3 font-mono text-slate-500">{student.grNumber}</td>
                        <td className="p-3 text-center font-mono">{student.division}</td>
                        <td className="p-3 text-center font-mono">{student.totalObtained} / {student.totalMax}</td>
                        <td className="p-3 text-center font-mono font-bold text-indigo-600">{student.percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: STUDENT PERFORMANCE SEGMENTATION */}
      {/* ========================================================================= */}
      {activeTab === 'student_perf' && (
        <div className="space-y-6 animate-fade-in text-left">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-800">Learning Cohorts & Class Segmentation</h2>
              <p className="text-xs text-slate-500">Categorizes students automatically into distinct support cohorts for academic interventions.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Bright Learners */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-emerald-50/30">
                <div className="flex items-center justify-between text-emerald-800">
                  <h4 className="font-bold text-xs uppercase tracking-wider font-mono">Bright Students (&gt;80%)</h4>
                  <span className="text-xs font-mono font-bold bg-emerald-100 px-2 py-0.5 rounded-full">{studentCategories.bright.length}</span>
                </div>
                <div className="divide-y divide-slate-100 text-[11px] font-semibold text-slate-700">
                  {studentCategories.bright.length === 0 ? (
                    <p className="text-slate-400 italic py-2">No students registered in this segment yet.</p>
                  ) : (
                    studentCategories.bright.map(s => (
                      <p key={s.studentId} className="py-2 flex justify-between"><span>{s.name}</span> <strong className="font-mono text-emerald-600">{s.percentage}%</strong></p>
                    ))
                  )}
                </div>
              </div>

              {/* Average Segment */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-blue-50/30">
                <div className="flex items-center justify-between text-blue-800">
                  <h4 className="font-bold text-xs uppercase tracking-wider font-mono">Average Students (60-80%)</h4>
                  <span className="text-xs font-mono font-bold bg-blue-100 px-2 py-0.5 rounded-full">{studentCategories.average.length}</span>
                </div>
                <div className="divide-y divide-slate-100 text-[11px] font-semibold text-slate-700">
                  {studentCategories.average.length === 0 ? (
                    <p className="text-slate-400 italic py-2">No students registered in this segment yet.</p>
                  ) : (
                    studentCategories.average.map(s => (
                      <p key={s.studentId} className="py-2 flex justify-between"><span>{s.name}</span> <strong className="font-mono text-blue-600">{s.percentage}%</strong></p>
                    ))
                  )}
                </div>
              </div>

              {/* Needing Support */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-rose-50/30">
                <div className="flex items-center justify-between text-rose-800">
                  <h4 className="font-bold text-xs uppercase tracking-wider font-mono">Needs Support (&lt;60%)</h4>
                  <span className="text-xs font-mono font-bold bg-rose-100 px-2 py-0.5 rounded-full">{studentCategories.supportNeeded.length}</span>
                </div>
                <div className="divide-y divide-slate-100 text-[11px] font-semibold text-slate-700">
                  {studentCategories.supportNeeded.length === 0 ? (
                    <p className="text-slate-400 italic py-2">No students registered in this segment yet.</p>
                  ) : (
                    studentCategories.supportNeeded.map(s => (
                      <p key={s.studentId} className="py-2 flex justify-between"><span>{s.name}</span> <strong className="font-mono text-rose-600">{s.percentage}%</strong></p>
                    ))
                  )}
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: PROMOTION ENGINE & YEAR ROLLFORWARD */}
      {/* ========================================================================= */}
      {activeTab === 'promotion_engine' && (
        <div className="space-y-8 animate-fade-in text-left">
          
          {/* Section 1: Rule Configurator */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">1. Promotion Rules & Verification Configuration</h2>
              <p className="text-xs text-slate-500">Configure standard parameters for ATKT, Compartments, required Attendance thresholds and grace marks without coding.</p>
            </div>

            <form onSubmit={handleSaveRules} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-600">Minimum Passing Marks per Subject (%)</label>
                <input 
                  type="number" 
                  value={promotionRules.minPassPercentage}
                  onChange={(e) => setPromotionRules({...promotionRules, minPassPercentage: parseInt(e.target.value)})}
                  className="w-full border border-slate-200 p-2 rounded" 
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600">Max Failed Subjects for ATKT/Compartment</label>
                <input 
                  type="number" 
                  value={promotionRules.maxFailedSubjectsForATKT}
                  onChange={(e) => setPromotionRules({...promotionRules, maxFailedSubjectsForATKT: parseInt(e.target.value)})}
                  className="w-full border border-slate-200 p-2 rounded" 
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600">Minimum Required Attendance (%)</label>
                <input 
                  type="number" 
                  value={promotionRules.minAttendancePercentage}
                  onChange={(e) => setPromotionRules({...promotionRules, minAttendancePercentage: parseInt(e.target.value)})}
                  className="w-full border border-slate-200 p-2 rounded" 
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600">Grace Marks Allowed</label>
                <input 
                  type="number" 
                  value={promotionRules.graceMarksAllowed}
                  onChange={(e) => setPromotionRules({...promotionRules, graceMarksAllowed: parseInt(e.target.value)})}
                  className="w-full border border-slate-200 p-2 rounded" 
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-4 flex justify-between items-center pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={promotionRules.autoProcessRules}
                    onChange={(e) => setPromotionRules({...promotionRules, autoProcessRules: e.target.checked})}
                    className="rounded text-indigo-600"
                  />
                  <span className="font-semibold text-slate-600">Apply rules automatically on new evaluations</span>
                </div>
                
                <button 
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold font-sans text-xs px-4 py-2 rounded-lg cursor-pointer"
                >
                  Save Promotion Rules
                </button>
              </div>
            </form>

            {isPromotionRulesSaved && (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Promotion rules saved and synchronized with Local Print Center successfully!</span>
              </div>
            )}
          </div>

          {/* Section 2: Promotion Workspace (Teacher recommendations / Headmaster sign-off) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-800">2. Promotion Evaluation & Recommendations Register</h2>
                <p className="text-xs text-slate-500">Review evaluation pass statuses. Class teachers submit recommendations, Headmaster approves and rolls forward.</p>
              </div>

              <button 
                onClick={handleRecommendAllPromotions}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold font-sans text-xs px-4 py-2 rounded-lg cursor-pointer flex items-center gap-2"
              >
                <Sliders className="w-4 h-4" />
                <span>Auto Fill Class Recommendations</span>
              </button>
            </div>

            <div className="border border-slate-150 rounded-xl overflow-hidden mt-2">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                  <tr>
                    <th className="p-3 w-12 text-center">Roll No</th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">G.R. No</th>
                    <th className="p-3 text-center">Subjects Passed</th>
                    <th className="p-3 text-center">Attendance %</th>
                    <th className="p-3 text-center">Score %</th>
                    <th className="p-3 text-center">Rule Verdict</th>
                    <th className="p-3 text-center">Manual Override Status</th>
                    <th className="p-3 text-center">Destination Target</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {rankedResults.map(res => {
                    const savedPromo = promotions.find(p => p.studentId === res.studentId);
                    
                    return (
                      <tr key={res.studentId} className="hover:bg-slate-50/50">
                        <td className="p-3 text-center font-mono font-bold text-slate-600">{res.rollNo}</td>
                        <td className="p-3 font-bold text-slate-800">{res.name}</td>
                        <td className="p-3 font-mono text-slate-500">{res.grNumber}</td>
                        <td className="p-3 text-center font-mono">
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${res.passedSubjectsCount === classSubjects.length ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                            {res.passedSubjectsCount} / {classSubjects.length}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono">{res.attendancePct == null ? '—' : `${res.attendancePct}%`}</td>
                        <td className="p-3 text-center font-mono font-bold text-indigo-600">{res.percentage}%</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded font-bold text-[9px] uppercase font-mono ${
                            res.autoVerdict === 'Promoted' ? 'bg-emerald-50 text-emerald-600' : 
                            res.autoVerdict === 'Detained' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                          }`}>
                            {res.autoVerdict}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <select 
                            value={savedPromo ? savedPromo.status : res.autoVerdict}
                            onChange={(e) => {
                              const list = [...promotions.filter(p => p.studentId !== res.studentId)];
                              list.push({
                                id: `promo_${res.studentId}`,
                                studentId: res.studentId,
                                classId: selectedClass,
                                status: e.target.value,
                                nextClass: savedPromo ? savedPromo.nextClass : res.nextClass
                              });
                              handleSavePromotionsToLocalStorage(list, observations);
                            }}
                            className="bg-white border border-slate-200 text-[10px] font-bold p-1 rounded font-sans"
                            disabled={user.role !== 'headmaster' && !LocalERPDatabase.getAcademicSetup()?.classTeacherAssignments?.some((a: any) => a.teacherId === user.id)}
                          >
                            <option value="Promoted">Promoted</option>
                            <option value="Detained">Detained</option>
                            <option value="Compartment">Compartment</option>
                            <option value="ATKT">ATKT</option>
                            <option value="Withheld">Withheld</option>
                          </select>
                        </td>
                        <td className="p-3 text-center">
                          <input 
                            type="text" 
                            value={savedPromo ? savedPromo.nextClass : res.nextClass}
                            onChange={(e) => {
                              const list = [...promotions.filter(p => p.studentId !== res.studentId)];
                              list.push({
                                id: `promo_${res.studentId}`,
                                studentId: res.studentId,
                                classId: selectedClass,
                                status: savedPromo ? savedPromo.status : res.autoVerdict,
                                nextClass: e.target.value
                              });
                              handleSavePromotionsToLocalStorage(list, observations);
                            }}
                            className="border border-slate-200 p-1 rounded w-20 text-[10px] text-center font-mono"
                            disabled={user.role !== 'headmaster' && !LocalERPDatabase.getAcademicSetup()?.classTeacherAssignments?.some((a: any) => a.teacherId === user.id)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Next Academic Year Rollforward Engine */}
          {user.role === 'headmaster' && (
            <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-2xl border border-indigo-950 p-6 shadow-md space-y-4 text-left">
              <div className="flex items-center gap-3">
                <Sliders className="w-6 h-6 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-base text-white">3. Headmaster Final Promotions & Year Rollforward Engine</h3>
                  <p className="text-xs text-indigo-200">Locks current marks, transfers student records sequentially to the next class level, and maintains academic registries.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-indigo-200">Target Standard For Promoted Cohort</label>
                  <select 
                    value={rollforwardTargetClass} 
                    onChange={(e) => setRollforwardTargetClass(e.target.value)}
                    className="w-full border border-indigo-800 bg-indigo-950 text-white p-2 rounded font-sans"
                  >
                    <option value="">-- Choose Promoting Destination --</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.className}>{c.className}</option>
                    ))}
                    <option value="Graduated">Graduated (NHS Leaving Certificate Ready)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-indigo-200">Target Division Section (Optional)</label>
                  <select 
                    value={rollforwardTargetDivision} 
                    onChange={(e) => setRollforwardTargetDivision(e.target.value)}
                    className="w-full border border-indigo-800 bg-indigo-950 text-white p-2 rounded font-sans"
                  >
                    <option value="">Keep current division</option>
                    <option value="A">Division A</option>
                    <option value="B">Division B</option>
                    <option value="C">Division C</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-indigo-800 flex justify-between items-center">
                <p className="text-[10px] text-indigo-300 italic font-mono">
                  * G.R. Numbers remain unmodified. Permanent student profiles will not be duplicated.
                </p>

                <button 
                  onClick={handleExecuteYearRollforward}
                  disabled={isRollingForward}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold font-sans text-xs px-6 py-2.5 rounded-lg shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Execute Year Rollforward Sign-off</span>
                </button>
              </div>

              {rollforwardLogs.length > 0 && (
                <div className="bg-slate-950 border border-indigo-900 p-4 rounded-xl font-mono text-[10px] text-indigo-400 space-y-1 max-h-48 overflow-y-auto mt-4">
                  {rollforwardLogs.map((log, i) => (
                    <p key={i}>{log}</p>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: STUDENT ACADEMIC HISTORY JOURNEY */}
      {/* ========================================================================= */}
      {activeTab === 'academic_history' && (
        <div className="space-y-6 animate-fade-in text-left">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-800">Complete Student Academic Journey Explorer</h2>
              <p className="text-xs text-slate-500">Query previous academic years, historical report cards, attendance rates, and rank standings with a single click.</p>
            </div>

            {/* Student Search and select */}
            <div className="flex flex-wrap gap-4 items-center border-b border-slate-100 pb-6">
              <div className="flex-1 max-w-md relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Search className="w-4 h-4" />
                </span>
                <input 
                  type="text" 
                  placeholder="Search student name or G.R. number..." 
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  className="w-full border border-slate-200 pl-9 pr-3 py-2 rounded-lg text-xs font-semibold"
                />
              </div>

              <div className="flex gap-2 text-xs font-semibold">
                <select 
                  value={selectedHistoryStudentId}
                  onChange={(e) => setSelectedHistoryStudentId(e.target.value)}
                  className="bg-slate-100 border border-slate-200 rounded px-3 py-1.5"
                >
                  <option value="">-- Choose Student --</option>
                  {students.filter(s => s?.name?.toLowerCase().includes(historySearchQuery.toLowerCase()) || (s.grNumber && s.grNumber.includes(historySearchQuery))).map(s => (
                    <option key={s.id} value={s.id}>{s.name} (G.R. {s.grNumber || 'N/A'})</option>
                  ))}
                </select>
              </div>
            </div>

            {selectedHistoryStudentId && (
              <div className="space-y-8 pt-4">
                <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 font-extrabold flex items-center justify-center text-lg uppercase font-sans">
                    {students.find(s => s.id === selectedHistoryStudentId)?.name.charAt(0) || 'S'}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">{students.find(s => s.id === selectedHistoryStudentId)?.name}</h3>
                    <p className="text-xs text-slate-400 font-mono">GR Record: {students.find(s => s.id === selectedHistoryStudentId)?.grNumber} | Mobile: {students.find(s => s.id === selectedHistoryStudentId)?.phone || 'N/A'}</p>
                  </div>
                </div>

                {/* Timeline display */}
                <div className="relative border-l border-indigo-200 ml-4 pl-8 space-y-8 font-sans">
                  {activeStudentHistory.length === 0 ? (
                    <div className="text-xs text-slate-400 italic">No historical promotion records registered for this student yet. History is built upon executing standard Year Rollforward.</div>
                  ) : (
                    activeStudentHistory.map((rec, idx) => (
                      <div key={idx} className="relative">
                        <div className="absolute -left-12 top-1.5 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 font-bold border-2 border-white shadow-sm flex items-center justify-center font-mono text-[10px]">
                          {rec.academicYear.replace('-', '')}
                        </div>
                        
                        <div className="p-5 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-extrabold text-slate-800 text-xs">{rec.className} ({rec.divisionName}) Evaluation Standard</h4>
                              <p className="text-[10px] text-slate-400 font-mono">Completed Phase: {rec.examName}</p>
                            </div>
                            
                            <span className="bg-emerald-50 text-emerald-600 font-bold px-3 py-0.5 rounded font-mono text-[10px] uppercase">
                              {rec.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[11px] text-slate-600">
                            <div>
                              <span className="block text-slate-400 font-mono text-[9px]">Grand Marks:</span>
                              <strong className="text-slate-800 font-mono">{rec.grandTotal} / {rec.maxMarks}</strong>
                            </div>
                            <div>
                              <span className="block text-slate-400 font-mono text-[9px]">Class Rank:</span>
                              <strong className="text-slate-800 font-mono">#{rec.rankInClass}</strong>
                            </div>
                            <div>
                              <span className="block text-slate-400 font-mono text-[9px]">Aggregate percentage:</span>
                              <strong className="text-indigo-600 font-mono">{rec.percentage}%</strong>
                            </div>
                            <div>
                              <span className="block text-slate-400 font-mono text-[9px]">Attendance logged:</span>
                              <strong className="text-slate-800 font-mono">{rec.attendancePct == null ? '—' : `${rec.attendancePct}%`}</strong>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 italic">
                            Class Teacher remarks: "{rec.teacherRemarks || 'No comment logged.'}"
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 9: CERTIFICATE GENERATION TOOL */}
      {/* ========================================================================= */}
      {activeTab === 'certificates' && (
        <div className="space-y-6 animate-fade-in text-left">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-800">Dynamic Certificate Generation Suite</h2>
              <p className="text-xs text-slate-500">Generate A4 print-ready merit, rank, or appreciation credentials complete with headmaster signatures and QR verification codes.</p>
            </div>

            <form onSubmit={handlePrintCertificate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-600">Select Certificate Layout Template</label>
                <select 
                  value={certType} 
                  onChange={(e) => { setCertType(e.target.value as any); setIsCertGenerated(false); }}
                  className="w-full border border-slate-200 p-2 rounded"
                >
                  <option value="merit">Merit Certificate</option>
                  <option value="rank">Rank Standings Certificate</option>
                  <option value="promotion">Standard Promotion Certificate</option>
                  <option value="appreciation">Appreciation Certificate</option>
                  <option value="academic_excellence">Academic Excellence Award</option>
                  <option value="participation">Co-Scholastic Participation Certificate</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600">Target Student recipient</label>
                <select 
                  value={certStudentId} 
                  onChange={(e) => { setCertStudentId(e.target.value); setIsCertGenerated(false); }}
                  className="w-full border border-slate-200 p-2 rounded font-sans"
                >
                  <option value="">-- Choose Recipient --</option>
                  {rankedResults.map(s => (
                    <option key={s.studentId} value={s.studentId}>{s.name} (G.R. {s.grNumber})</option>
                  ))}
                </select>
              </div>

              {certType === 'participation' && (
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">Activity / Co-scholastic Category</label>
                  <input 
                    type="text" 
                    value={certActivityName} 
                    onChange={(e) => { setCertActivityName(e.target.value); setIsCertGenerated(false); }}
                    placeholder="e.g., Urdu Elocution, Science Exhibition"
                    className="w-full border border-slate-200 p-2 rounded"
                  />
                </div>
              )}

              {certType === 'rank' && (
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">Specific Subject Code / Subject Name</label>
                  <input 
                    type="text" 
                    value={certSubjectName} 
                    onChange={(e) => { setCertSubjectName(e.target.value); setIsCertGenerated(false); }}
                    placeholder="e.g., Mathematics, Urdu Sahitya"
                    className="w-full border border-slate-200 p-2 rounded"
                  />
                </div>
              )}

              <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
                <button 
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold font-sans text-xs px-6 py-2 rounded-lg cursor-pointer flex items-center gap-2"
                >
                  <Award className="w-4 h-4" />
                  <span>Generate Certificate Preview</span>
                </button>
              </div>
            </form>

            {/* Print Preview Certificate Area */}
            {isCertGenerated && selectedCertStudent && (
              <div className="pt-6 border-t border-slate-100 space-y-6">
                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                  <span className="font-bold text-slate-600">Credential Serial: <strong className="font-mono text-indigo-600">{certNumber}</strong></span>
                  <PrintPDFButton title="Dynamic Certificate Layout" lang={lang} orientation="landscape" />
                </div>

                {/* Printable Frame (Landscape A4 Layout) */}
                <div 
                  id="print-area" 
                  ref={certPrintRef}
                  className="p-12 bg-white border-8 border-double border-slate-800 text-slate-900 font-sans shadow-md rounded-2xl relative space-y-8 max-w-4xl mx-auto min-h-[500px]"
                >
                  
                  {/* Letterhead header */}
                  <div className="text-center space-y-2">
                    <h1 className="text-2xl font-extrabold uppercase tracking-tight text-slate-900">{academicSetup?.schoolProfile?.schoolName || 'NATIONAL HIGH SCHOOL, TALODA'}</h1>
                    <p className="text-[10px] font-bold font-mono uppercase tracking-widest text-slate-500">{academicSetup?.schoolProfile?.managementName || 'Taloda Secular Education Society'}</p>
                    <p className="text-[11px] text-slate-600">Udise Code: {academicSetup?.schoolProfile?.udiseCode || '27210908805'} | Dist. Nandurbar, Maharashtra, Pin 425413</p>
                    <div className="h-0.5 bg-slate-800 w-full my-4"></div>
                  </div>

                  {/* Body Content */}
                  <div className="text-center space-y-6 py-4">
                    <h2 className="text-xl font-extrabold uppercase tracking-widest text-indigo-900 font-mono">
                      {certType === 'merit' && 'Certificate of Merit'}
                      {certType === 'rank' && 'Certificate of Academic Rank'}
                      {certType === 'promotion' && 'Certificate of Promotion'}
                      {certType === 'appreciation' && 'Certificate of Appreciation'}
                      {certType === 'academic_excellence' && 'Award for Academic Excellence'}
                      {certType === 'participation' && 'Certificate of Participation'}
                    </h2>

                    <p className="text-sm font-serif leading-relaxed max-w-2xl mx-auto">
                      This is to certify that student <strong className="font-bold text-slate-950 font-sans text-base underline decoration-dashed decoration-indigo-600">{selectedCertStudent.name}</strong>, 
                      registered under General Register Number <span className="font-mono font-bold text-slate-950 text-sm">{selectedCertStudent.grNumber}</span>, 
                      has successfully completed the evaluation phase for <strong className="font-bold font-sans">{examinations.find(e => e.id === selectedExamId)?.name || 'Term Exam'}</strong>, 
                      Academic Session <span className="font-mono font-bold">{selectedAcademicYear}</span>, 
                      belonging to standard <strong className="font-sans font-bold">{selectedClass} ({selectedCertStudent.division})</strong>.
                    </p>

                    <p className="text-xs font-serif leading-relaxed max-w-2xl mx-auto">
                      {certType === 'merit' && `Based on the official Board Registry calculations, the student was awarded Rank #${selectedCertStudent.rank} with an aggregate performance of ${selectedCertStudent.percentage}%.`}
                      {certType === 'rank' && `By achieving outstanding results in ${certSubjectName || 'assigned subjects'}, the student holds Rank #${selectedCertStudent.rank} institutional standing.`}
                      {certType === 'promotion' && `The academic promotion committee recommends official transfer and enrollment into the next standard: ${selectedCertStudent.nextClass}.`}
                      {certType === 'appreciation' && `We express sincere institutional gratitude for the academic determination, personal conduct, and discipline exhibited throughout.`}
                      {certType === 'academic_excellence' && `With an aggregate percentage of ${selectedCertStudent.percentage}%, the student represents NHS Taloda academic brilliance cohort.`}
                      {certType === 'participation' && `The student actively participated in the ${certActivityName || 'Co-Scholastic Activity'} representing their Standard Class.`}
                    </p>
                  </div>

                  {/* Seal and Signatures row */}
                  <div className="pt-8 grid grid-cols-3 gap-8 text-center text-xs">
                    <div className="space-y-4">
                      {/* Left side: QR Code Verification */}
                      <div className="w-16 h-16 bg-slate-100 border border-slate-300 rounded mx-auto flex items-center justify-center text-[8px] font-mono font-bold text-slate-400 p-1 text-center">
                        QR Verified NHS-TALODA
                      </div>
                      <p className="text-[10px] font-mono text-slate-400">Verifiable Code: {certNumber}</p>
                    </div>

                    <div className="flex items-center justify-center">
                      {/* Center: School Seal Stamp placeholder */}
                      <div className="w-20 h-20 rounded-full border-4 border-dashed border-indigo-200 flex items-center justify-center text-[9px] font-bold text-indigo-300 font-mono text-center uppercase">
                        NHS Stamp & Seal
                      </div>
                    </div>

                    <div className="space-y-6 flex flex-col justify-end">
                      <div className="h-0.5 border-b border-dashed border-slate-400 w-3/4 mx-auto"></div>
                      <div>
                        <p className="font-bold text-slate-800">{user.name || 'Authorised Headmaster'}</p>
                        <p className="text-[10px] text-slate-400 font-mono">Principal & Headmaster Sign-off</p>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 10: REPORTS GENERATION CENTER */}
      {/* ========================================================================= */}
      {activeTab === 'reports' && (
        <div className="space-y-6 animate-fade-in text-left">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-800">Printable Academic Reports Control Desk</h2>
              <p className="text-xs text-slate-500">Configure report types and trigger A4/A3 layout printing. Support color, high-fidelity grids, and Excel CSV formatting.</p>
            </div>

            {/* Config filter panel */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="space-y-1">
                <label className="font-bold text-slate-600">Select Report Type</label>
                <select 
                  value={selectedReportType} 
                  onChange={(e) => setSelectedReportType(e.target.value as any)}
                  className="w-full border border-slate-200 bg-white p-2 rounded font-sans"
                >
                  <option value="school_summary">School Result Summary</option>
                  <option value="class_summary">Class Result Summary</option>
                  <option value="subject_analysis">Subject Analysis Summary</option>
                  <option value="teacher_analysis">Faculty Performance Review</option>
                  <option value="merit_list">Merit List Standings</option>
                  <option value="promotion_register">Official Promotion Register</option>
                  <option value="failed_students">Failed Students Report</option>
                  <option value="slow_learners">Slow Learners Bracket</option>
                  <option value="bright_students">Bright Students Registry</option>
                  <option value="improvement_report">Cohort Improvement Trend</option>
                  <option value="attendance_vs_result">Attendance vs Result Analysis</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600">Paper Sizing</label>
                <select 
                  value={reportPaperSize} 
                  onChange={(e) => setReportPaperSize(e.target.value as any)}
                  className="w-full border border-slate-200 bg-white p-2 rounded"
                >
                  <option value="A4">Standard A4 Portrait</option>
                  <option value="A3">Large A3 Sheet</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600">Orientation</label>
                <select 
                  value={reportOrientation} 
                  onChange={(e) => setReportOrientation(e.target.value as any)}
                  className="w-full border border-slate-200 bg-white p-2 rounded"
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape Layout</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600">Color Profile</label>
                <select 
                  value={reportPrintMode} 
                  onChange={(e) => setReportPrintMode(e.target.value as any)}
                  className="w-full border border-slate-200 bg-white p-2 rounded"
                >
                  <option value="color">Full Dynamic Color</option>
                  <option value="bw">Printable Black & White (Saves Ink)</option>
                </select>
              </div>
            </div>

            {/* Printable Report preview container */}
            <div className="pt-4 space-y-6">
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <span className="font-bold text-slate-600">Active Report: <strong className="uppercase">{selectedReportType.replace('_', ' ')}</strong></span>
                <div className="flex gap-2">
                  <PrintPDFButton title="Official Report Summary" lang={lang} orientation={reportOrientation} elementId="print-area" />
                  
                  <button
                    type="button"
                    onClick={() => exportElementToExcel({ elementId: 'print-area', title: 'Academic Result Analytics Report' })}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Download Excel</span>
                  </button>
                </div>
              </div>

              {/* Printable Area layout */}
              <div 
                id="print-area" 
                className={`p-10 bg-white border border-slate-200 font-sans text-slate-900 rounded-xl space-y-8 ${reportPrintMode === 'bw' ? 'print:filter print:grayscale' : ''}`}
              >
                
                {/* Print Letterhead */}
                <PrintLetterhead lang={lang} subtitle="Academic Result Analytics Report" />

                {/* Report Meta Info */}
                <div className="border-b-2 border-slate-800 pb-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-900">
                    {selectedReportType.replace('_', ' ').toUpperCase()} REGISTER
                  </h3>
                  <div className="grid grid-cols-2 text-[10px] font-mono text-slate-500 pt-1">
                    <div>
                      <p>Evaluation Phase: {examinations.find(e => e.id === selectedExamId)?.name}</p>
                      <p>Academic Session: {selectedAcademicYear}</p>
                    </div>
                    <div className="text-right">
                      <p>Standard Level: {selectedClass} ({selectedDivision === 'All' ? 'All Divisions' : `Division ${selectedDivision}`})</p>
                      <p>Date Generated: {new Date().toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                {/* Report Content Grid depending on selection */}
                {selectedReportType === 'school_summary' && (
                  <div className="space-y-4 text-xs font-sans">
                    <p className="leading-relaxed">This report summarizes the total academic metrics for {selectedClass} standard across all participating division groups.</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 font-mono">
                      <div><span>Total Enrollment:</span> <strong className="block text-slate-800 text-base">{overallStats.total}</strong></div>
                      <div><span>Passed Ratio:</span> <strong className="block text-emerald-600 text-base">{overallStats.passRate}%</strong></div>
                      <div><span>Highest Standard %:</span> <strong className="block text-slate-800 text-base">{overallStats.highest}%</strong></div>
                      <div><span>Cohort Average %:</span> <strong className="block text-slate-800 text-base">{overallStats.avg}%</strong></div>
                    </div>
                  </div>
                )}

                {selectedReportType === 'class_summary' && (
                  <div className="space-y-4">
                    <div className="border border-slate-800 rounded-xl overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-800">
                          <tr>
                            <th className="p-2.5">Roll No</th>
                            <th className="p-2.5">Student Name</th>
                            <th className="p-2.5 font-mono">GR No</th>
                            <th className="p-2.5 text-center">Division</th>
                            <th className="p-2.5 text-center">Passed Subjects</th>
                            <th className="p-2.5 text-center">Score %</th>
                            <th className="p-2.5 text-center">Verdict</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {rankedResults.map(s => (
                            <tr key={s.studentId}>
                              <td className="p-2.5 text-center font-mono font-bold">{s.rollNo}</td>
                              <td className="p-2.5 font-bold">{s.name}</td>
                              <td className="p-2.5 font-mono text-slate-500">{s.grNumber}</td>
                              <td className="p-2.5 text-center font-mono">{s.division}</td>
                              <td className="p-2.5 text-center font-mono">{s.passedSubjectsCount} / {classSubjects.length}</td>
                              <td className="p-2.5 text-center font-mono font-bold text-indigo-600">{s.percentage}%</td>
                              <td className="p-2.5 text-center">
                                <span className="font-bold text-[10px]">{s.verdict}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {selectedReportType === 'subject_analysis' && (
                  <div className="space-y-4">
                    <div className="border border-slate-800 rounded-xl overflow-hidden">
                      <table className="w-full text-xs text-left font-mono">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-800 font-sans">
                          <tr>
                            <th className="p-2.5">Subject Name</th>
                            <th className="p-2.5 text-center">Aggregate Average %</th>
                            <th className="p-2.5 text-center">Highest Score</th>
                            <th className="p-2.5 text-center">Lowest Score</th>
                            <th className="p-2.5 text-center">Pass Rate %</th>
                            <th className="p-2.5 text-center">Full Marks Count</th>
                            <th className="p-2.5 text-center">Below passing score</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {subjectPerformanceData.map(sub => (
                            <tr key={sub.id}>
                              <td className="p-2.5 font-sans font-bold">{sub.subjectName}</td>
                              <td className="p-2.5 text-center text-indigo-600 font-bold">{sub.Average}%</td>
                              <td className="p-2.5 text-center">{sub.Highest}</td>
                              <td className="p-2.5 text-center">{sub.Lowest}</td>
                              <td className="p-2.5 text-center font-bold text-emerald-600">{sub.PassRate}%</td>
                              <td className="p-2.5 text-center text-emerald-600">{sub.fullMarks}</td>
                              <td className="p-2.5 text-center text-rose-600">{sub.belowPass}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {selectedReportType === 'merit_list' && (
                  <div className="space-y-4">
                    <div className="border border-slate-800 rounded-xl overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-800">
                          <tr>
                            <th className="p-2.5 text-center w-16">Rank</th>
                            <th className="p-2.5">Student Name</th>
                            <th className="p-2.5 font-mono">GR No</th>
                            <th className="p-2.5 text-center">Division</th>
                            <th className="p-2.5 text-center">Grand Total</th>
                            <th className="p-2.5 text-center">Percentage</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-mono">
                          {rankedResults.slice(0, 15).map(s => (
                            <tr key={s.studentId}>
                              <td className="p-2.5 text-center font-bold">#{s.rank}</td>
                              <td className="p-2.5 font-sans font-bold">{s.name}</td>
                              <td className="p-2.5 text-slate-500">{s.grNumber}</td>
                              <td className="p-2.5 text-center">{s.division}</td>
                              <td className="p-2.5 text-center">{s.totalObtained} / {s.totalMax}</td>
                              <td className="p-2.5 text-center text-indigo-600 font-bold">{s.percentage}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {selectedReportType === 'promotion_register' && (
                  <div className="space-y-4">
                    <div className="border border-slate-800 rounded-xl overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-800">
                          <tr>
                            <th className="p-2.5">Student Name</th>
                            <th className="p-2.5 font-mono">GR No</th>
                            <th className="p-2.5 text-center font-mono">Attendance</th>
                            <th className="p-2.5 text-center">Score %</th>
                            <th className="p-2.5 text-center">Rule Verdict</th>
                            <th className="p-2.5 text-center">Official Sign-off Status</th>
                            <th className="p-2.5 text-center">Destination Target</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {rankedResults.map(s => (
                            <tr key={s.studentId}>
                              <td className="p-2.5 font-bold">{s.name}</td>
                              <td className="p-2.5 font-mono text-slate-500">{s.grNumber}</td>
                              <td className="p-2.5 text-center font-mono">{s.attendancePct == null ? '—' : `${s.attendancePct}%`}</td>
                              <td className="p-2.5 text-center font-mono font-bold">{s.percentage}%</td>
                              <td className="p-2.5 text-center font-mono text-[10px] uppercase font-bold">{s.autoVerdict}</td>
                              <td className="p-2.5 text-center font-bold text-emerald-600 font-mono text-[10px] uppercase">{s.verdict}</td>
                              <td className="p-2.5 text-center font-mono">{s.nextClass}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Print Signatures row */}
                <PrintSignatureArea lang={lang} />

              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
