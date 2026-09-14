import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  Printer,
  Download,
  Search,
  Check,
  ShieldCheck,
  UserX,
  Sparkles,
  FileSpreadsheet,
  FileText,
  Eye,
  RefreshCw,
  X,
  Filter,
  CheckSquare,
  Square,
  AlertTriangle,
  Award,
  ChevronRight,
  Info,
} from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { User } from "../types";
import { LocalERPDatabase, supabase } from "../lib/supabase";
import { publishSubstituteAdjustment } from "../modules/teacherTimetableFresh/timetableService";
import { printSectionById } from "../utils/printSection";
import { requestActionConfirm } from '../lib/actionConfirm';

export interface V2SubstituteItem {
  id: string;
  period: number;
  className: string;
  division: string;
  subjectName: string;
  originalTeacher: string;
  substituteTeacher: string; // Teacher name or 'Unassigned'
  priorityReason?: string;
  remarks?: string;
}

export interface V2SubstituteAdjustment {
  id: string;
  date: string; // YYYY-MM-DD
  day: string; // Monday, Tuesday, etc.
  originalTeacher: string;
  reason: "Leave" | "Training" | "Official Duty" | "Meeting" | "Election Duty" | "Medical" | "Other";
  customReason?: string;
  excludedTeachers: string[];
  status: "Draft" | "Approved" | "Cancelled";
  preparedBy: string;
  createdAt: string;
  approvedAt?: string;
  items: V2SubstituteItem[];
  overallRemarks?: string;
  leaveApplicationId?: string;
}

interface SmartSubstituteManagerProps {
  lang: "en" | "hi" | "ur";
  user: User;
  timetable: any[]; // V2TimetableCell[]
  approvedTeachers: any[];
  workloadRows?: any[];
  masterSubjects?: any[];
  academicSetup?: any;
}

export default function SmartSubstituteManager({
  lang,
  user,
  timetable = [],
  approvedTeachers = [],
  workloadRows = [],
  masterSubjects = [],
  academicSetup,
}: SmartSubstituteManagerProps) {
  // Bilingual translation helper
  const t = (en: string, hi: string, ur: string) => {
    if (lang === "ur") return ur;
    if (lang === "hi") return hi;
    return en;
  };

  const isUrdu = lang === "ur";

  // Sub-tabs state: 'generate' | 'today' | 'register'
  const [activeSubTab, setActiveSubTab] = useState<"generate" | "today" | "register">("generate");

  // Mode in Generate tab: 'auto' | 'manual'
  const [genMode, setGenMode] = useState<"auto" | "manual">("auto");

  // Persistent Adjustments state
  const [adjustments, setAdjustments] = useState<V2SubstituteAdjustment[]>(() => {
    const saved = localStorage.getItem("nhs_v2_substitute_adjustments");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse substitute adjustments", e);
      }
    }
    return [];
  });

  // Save adjustments to localStorage
  const saveAdjustments = (updated: V2SubstituteAdjustment[]) => {
    setAdjustments(updated);
    localStorage.setItem("nhs_v2_substitute_adjustments", JSON.stringify(updated));
  };

  // Selected Date for forms / views (defaults to YYYY-MM-DD today)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  // Compute Day of Week from selectedDate
  const selectedDay = useMemo(() => {
    if (!selectedDate) return "Monday";
    const d = new Date(selectedDate);
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[d.getDay()] || "Monday";
  }, [selectedDate]);

  // Form states for Manual Mode
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [manualTeacherSearch, setManualTeacherSearch] = useState<string>("");
  const [applySameReason, setApplySameReason] = useState<boolean>(true);
  const [reason, setReason] = useState<
    "Leave" | "Training" | "Official Duty" | "Meeting" | "Election Duty" | "Medical" | "Other"
  >("Leave");
  const [customReason, setCustomReason] = useState<string>("");
  const [teacherReasonsMap, setTeacherReasonsMap] = useState<
    Record<
      string,
      {
        reason: "Leave" | "Training" | "Official Duty" | "Meeting" | "Election Duty" | "Medical" | "Other";
        customReason?: string;
      }
    >
  >({});
  const [excludedTeachers, setExcludedTeachers] = useState<string[]>([]);
  const [excludedSearch, setExcludedSearch] = useState<string>("");

  // Reviewing Adjustment ID (for draft or active review)
  const [reviewingAdjId, setReviewingAdjId] = useState<string | null>(null);

  // Printable Register Modal State
  const [printModalAdj, setPrintModalAdj] = useState<V2SubstituteAdjustment | null>(null);

  // History Filters
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>("All");
  const [historyReasonFilter, setHistoryReasonFilter] = useState<string>("All");
  const [historyDateFrom, setHistoryDateFrom] = useState<string>("");
  const [historyDateTo, setHistoryDateTo] = useState<string>("");

  // Production: approved Teacher leave comes from the permanent cloud workflow.
  // localStorage is retained only as an offline/legacy compatibility fallback.
  const [cloudLeaveApplications, setCloudLeaveApplications] = useState<any[] | null>(null);
  const [cloudLeaveError, setCloudLeaveError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const loadApprovedTeacherLeave = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('Secure Headmaster session unavailable.');
        const response = await fetch('/api/leave-management/applications', {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: 'no-store',
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error || 'Approved Teacher leave could not be loaded.');
        if (!cancelled) {
          setCloudLeaveApplications(Array.isArray(payload?.applications) ? payload.applications : []);
          setCloudLeaveError('');
        }
      } catch (error: any) {
        if (!cancelled) {
          setCloudLeaveApplications(null);
          setCloudLeaveError(error?.message || 'Cloud Teacher leave could not be loaded.');
        }
      }
    };
    void loadApprovedTeacherLeave();
    return () => { cancelled = true; };
  }, [user.id]);

  const approvedLeavesList = useMemo(() => {
    let list: any[] = cloudLeaveApplications || [];
    if (cloudLeaveApplications === null) {
      try {
        const stored = localStorage.getItem("nhs_erp_student_leaves");
        list = stored ? JSON.parse(stored) : [];
      } catch {
        list = [];
      }
    }

    // Only finally-approved Teacher/Class Teacher leave can trigger substitute allocation.
    // Student leave and pending staff requests must never appear as absent Teachers.
    return list.filter((l) => {
      if (String(l?.status || '').toLowerCase() !== 'approved') return false;
      if (String(l?.applicantRole || '').toLowerCase() !== 'teacher') return false;
      const start = String(l?.startDate || '');
      const end = String(l?.endDate || start);
      return !selectedDate || (!start || (start <= selectedDate && selectedDate <= (end || start)));
    });
  }, [cloudLeaveApplications, selectedDate]);

  // =========================================================
  // AUTOMATIC SUBSTITUTE ENGINE LOGIC (FAIR WORKLOAD DISTRIBUTION)
  // =========================================================
  const getWeekBoundaries = (dateStr: string) => {
    if (!dateStr) return { startStr: "", endStr: "" };
    const d = new Date(dateStr + "T00:00:00");
    const day = d.getDay(); // 0 is Sun, 1 is Mon...
    const diffToMon = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diffToMon);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const startStr = monday.toISOString().split("T")[0];
    const endStr = sunday.toISOString().split("T")[0];
    return { startStr, endStr };
  };

  const getLastAssignedTimestamp = (tName: string, allAdjustments: V2SubstituteAdjustment[]) => {
    let lastTime = 0;
    const nameLower = tName.toLowerCase().trim();
    allAdjustments.forEach((adj) => {
      if (adj.status !== "Cancelled") {
        const adjTime = new Date(adj.createdAt || adj.date).getTime();
        adj.items.forEach((item) => {
          if ((item.substituteTeacher || "").toLowerCase().trim() === nameLower) {
            if (adjTime > lastTime) {
              lastTime = adjTime;
            }
          }
        });
      }
    });
    return lastTime;
  };

  const getConsecutiveStreak = (
    tName: string,
    targetDay: string,
    periodNum: number,
    masterTimetable: any[],
    todayAdjustments: V2SubstituteAdjustment[],
    currentBatchItems: V2SubstituteItem[]
  ) => {
    const nameLower = tName.toLowerCase().trim();
    const periodsSet = new Set<number>();
    periodsSet.add(periodNum);

    masterTimetable.forEach((cell) => {
      if (
        cell.day === targetDay &&
        (cell.teacherName || "").toLowerCase().trim() === nameLower
      ) {
        periodsSet.add(cell.period);
      }
    });

    todayAdjustments.forEach((adj) => {
      adj.items.forEach((item) => {
        if ((item.substituteTeacher || "").toLowerCase().trim() === nameLower) {
          periodsSet.add(item.period);
        }
      });
    });

    currentBatchItems.forEach((item) => {
      if ((item.substituteTeacher || "").toLowerCase().trim() === nameLower) {
        periodsSet.add(item.period);
      }
    });

    const sorted = Array.from(periodsSet).sort((a, b) => a - b);
    let maxStreak = 0;
    let currStreak = 0;
    let lastP = -999;

    for (const p of sorted) {
      if (p === lastP + 1) {
        currStreak++;
      } else {
        currStreak = 1;
      }
      if (currStreak > maxStreak) {
        maxStreak = currStreak;
      }
      lastP = p;
    }

    return maxStreak;
  };

  const runAutoSubstituteEngine = (
    teacherList: {
      name: string;
      reason: "Leave" | "Training" | "Official Duty" | "Meeting" | "Election Duty" | "Medical" | "Other";
      customReason?: string;
    }[],
    targetDate: string,
    targetDay: string,
    exclTeachers: string[],
    leaveAppId?: string
  ) => {
    if (!teacherList || teacherList.length === 0) {
      alert(t("Please select at least one absent teacher.", "कृपया कम से कम एक अनुपस्थित शिक्षक चुनें।", "براہ کرم کم از کم ایک غیر حاضر استاد منتخب کریں۔"));
      return;
    }

    const absentTeacherNames = teacherList.map((t) => t.name);
    const absentTeacherNamesLower = absentTeacherNames.map((n) => n.toLowerCase().trim());

    // 1. Detect all affected periods for all absent teachers on this day of week
    const allAffectedSlots: {
      slotId: string;
      period: number;
      className: string;
      division: string;
      subjectName: string;
      originalTeacher: string;
      reason: string;
    }[] = [];

    teacherList.forEach((tObj) => {
      const teacherName = tObj.name;
      const tReasonStr = tObj.reason + (tObj.customReason ? ` (${tObj.customReason})` : "");

      let affectedSlots = timetable.filter(
        (cell) =>
          cell.day === targetDay &&
          (cell.teacherName || "").toLowerCase().trim() === teacherName.toLowerCase().trim()
      );

      // Sort affected periods ascending
      affectedSlots.sort((a, b) => a.period - b.period);

      // Fallback if master timetable grid is empty or has no slots for this teacher
      if (affectedSlots.length === 0) {
        const teacherWorkloads = workloadRows.filter(
          (w) => (w.teacherName || "").toLowerCase().trim() === teacherName.toLowerCase().trim()
        );

        if (teacherWorkloads.length > 0) {
          affectedSlots = teacherWorkloads.slice(0, 5).map((w, idx) => ({
            id: `gen_cell_${idx + 1}`,
            className: w.className || "Class 8",
            division: w.division || "A",
            day: targetDay,
            period: idx === 0 ? 1 : idx === 1 ? 3 : idx === 2 ? 4 : idx === 3 ? 6 : 7,
            subjectName: w.subjectName || "Urdu",
            teacherName: w.teacherName,
            roomNumber: "Room 12",
            isLocked: false,
          }));
        } else {
          affectedSlots = [
            {
              id: `fallback_${teacherName}_1`,
              className: "Class 10",
              division: "A",
              day: targetDay,
              period: 1,
              subjectName: "Language",
              teacherName: teacherName,
              roomNumber: "Room 101",
              isLocked: false,
            },
            {
              id: `fallback_${teacherName}_2`,
              className: "Class 7",
              division: "B",
              day: targetDay,
              period: 3,
              subjectName: "Mathematics",
              teacherName: teacherName,
              roomNumber: "Room 204",
              isLocked: false,
            },
            {
              id: `fallback_${teacherName}_3`,
              className: "Class 5",
              division: "A",
              day: targetDay,
              period: 4,
              subjectName: "Science",
              teacherName: teacherName,
              roomNumber: "Lab 1",
              isLocked: false,
            },
            {
              id: `fallback_${teacherName}_4`,
              className: "Class 8",
              division: "A",
              day: targetDay,
              period: 6,
              subjectName: "Social Science",
              teacherName: teacherName,
              roomNumber: "Room 108",
              isLocked: false,
            },
          ];
        }
      }

      affectedSlots.forEach((slot) => {
        allAffectedSlots.push({
          slotId: slot.id,
          period: slot.period,
          className: slot.className,
          division: slot.division,
          subjectName: slot.subjectName,
          originalTeacher: teacherName,
          reason: tReasonStr,
        });
      });
    });

    // Sort all combined affected slots by period ascending, then class name
    allAffectedSlots.sort((a, b) => a.period - b.period || a.className.localeCompare(b.className));

    // 2. Compute Fair Workload Substitute Assignments for each affected slot
    const generatedItems: V2SubstituteItem[] = [];

    const todayAdjustments = adjustments.filter(
      (a) => a.date === targetDate && a.status !== "Cancelled"
    );

    const { startStr: weekStart, endStr: weekEnd } = getWeekBoundaries(targetDate);
    const targetMonth = targetDate.substring(0, 7);

    allAffectedSlots.forEach((slot) => {
      const periodNum = slot.period;
      const clsName = slot.className;
      const divName = slot.division;
      const subjName = slot.subjectName;
      const origTeacher = slot.originalTeacher;

      // Filter eligible free teachers for this period
      const eligibleCandidates = approvedTeachers.filter((t) => {
        const tName = t.name;
        const nameLower = tName.toLowerCase().trim();

        // 1. Exclude ALL absent teachers in current batch
        if (absentTeacherNamesLower.includes(nameLower)) return false;

        // 2. Exclude teachers in excludedTeachers list
        if (exclTeachers.includes(tName)) return false;

        // 3. Exclude teachers on approved leave / training / official duty
        const isOnLeave = approvedLeavesList.some((l) => {
          if ((l.applicantName || "").toLowerCase().trim() !== nameLower) return false;
          if (l.status !== "Approved") return false;
          const start = l.startDate;
          const end = l.endDate || l.startDate;
          return targetDate >= start && targetDate <= end;
        });
        if (isOnLeave) return false;

        // 4. Exclude teacher if already teaching another class in master timetable at this day & period
        const isBusyInTimetable = timetable.some(
          (cell) =>
            cell.day === targetDay &&
            cell.period === periodNum &&
            (cell.teacherName || "").toLowerCase().trim() === nameLower
        );
        if (isBusyInTimetable) return false;

        // 5. Exclude teacher if ALREADY assigned substitute duty in another adjustment on same date & period
        const isBusyInExistingSubs = todayAdjustments.some((adj) =>
          adj.items.some(
            (item) =>
              item.period === periodNum &&
              (item.substituteTeacher || "").toLowerCase().trim() === nameLower
          )
        );
        if (isBusyInExistingSubs) return false;

        // 6. Exclude teacher if ALREADY assigned substitute duty in CURRENT BATCH for same period (Collision protection)
        const isBusyInCurrentBatch = generatedItems.some(
          (item) =>
            item.period === periodNum &&
            (item.substituteTeacher || "").toLowerCase().trim() === nameLower
        );
        if (isBusyInCurrentBatch) return false;

        return true;
      });

      // Calculate Workload Metrics for each eligible candidate
      const scoredCandidates = eligibleCandidates.map((candidate) => {
        const cName = candidate.name;
        const nameLower = cName.toLowerCase().trim();

        // Metric 1: Daily substitute periods assigned on targetDate
        let dailySub = 0;
        todayAdjustments.forEach((adj) => {
          adj.items.forEach((item) => {
            if ((item.substituteTeacher || "").toLowerCase().trim() === nameLower) {
              dailySub++;
            }
          });
        });
        generatedItems.forEach((item) => {
          if ((item.substituteTeacher || "").toLowerCase().trim() === nameLower) {
            dailySub++;
          }
        });

        // Metric 2: Weekly substitute periods assigned in current week
        let weeklySub = 0;
        adjustments.forEach((adj) => {
          if (adj.status !== "Cancelled" && adj.date >= weekStart && adj.date <= weekEnd) {
            adj.items.forEach((item) => {
              if ((item.substituteTeacher || "").toLowerCase().trim() === nameLower) {
                weeklySub++;
              }
            });
          }
        });
        generatedItems.forEach((item) => {
          if ((item.substituteTeacher || "").toLowerCase().trim() === nameLower) {
            weeklySub++;
          }
        });

        // Metric 3: Monthly substitute periods assigned in current month
        let monthlySub = 0;
        adjustments.forEach((adj) => {
          if (adj.status !== "Cancelled" && adj.date.startsWith(targetMonth)) {
            adj.items.forEach((item) => {
              if ((item.substituteTeacher || "").toLowerCase().trim() === nameLower) {
                monthlySub++;
              }
            });
          }
        });
        generatedItems.forEach((item) => {
          if ((item.substituteTeacher || "").toLowerCase().trim() === nameLower) {
            monthlySub++;
          }
        });

        // Metric 4: Total regular teaching workload on selected date
        const regularWorkload = timetable.filter(
          (cell) =>
            cell.day === targetDay &&
            (cell.teacherName || "").toLowerCase().trim() === nameLower
        ).length;

        // Metric 5: Consecutive periods streak after proposed assignment
        const consecutiveStreak = getConsecutiveStreak(
          cName,
          targetDay,
          periodNum,
          timetable,
          todayAdjustments,
          generatedItems
        );

        // Metric 6: Fair rotation / Last assigned timestamp
        const lastAssignedTimestamp = getLastAssignedTimestamp(cName, adjustments);

        return {
          candidate,
          dailySub,
          weeklySub,
          monthlySub,
          regularWorkload,
          consecutiveStreak,
          lastAssignedTimestamp,
        };
      });

      // Sort candidates by strictly defined Fair Workload order
      scoredCandidates.sort((a, b) => {
        if (a.dailySub !== b.dailySub) return a.dailySub - b.dailySub;
        if (a.weeklySub !== b.weeklySub) return a.weeklySub - b.weeklySub;
        if (a.monthlySub !== b.monthlySub) return a.monthlySub - b.monthlySub;
        if (a.regularWorkload !== b.regularWorkload) return a.regularWorkload - b.regularWorkload;
        if (a.consecutiveStreak !== b.consecutiveStreak) return a.consecutiveStreak - b.consecutiveStreak;
        if (a.lastAssignedTimestamp !== b.lastAssignedTimestamp) {
          return a.lastAssignedTimestamp - b.lastAssignedTimestamp;
        }
        return a.candidate.name.localeCompare(b.candidate.name);
      });

      const best = scoredCandidates[0];

      if (best) {
        generatedItems.push({
          id: `sub_item_${Date.now()}_${periodNum}_${Math.random().toString(36).substring(2, 6)}`,
          period: periodNum,
          className: clsName,
          division: divName,
          subjectName: subjName,
          originalTeacher: origTeacher,
          substituteTeacher: best.candidate.name,
          priorityReason: `Fair Workload (${best.dailySub} Sub Today / ${best.weeklySub} Wk)`,
          remarks: `Auto-allocated by AI Fair Engine (Equal workload: ${best.dailySub} daily, ${best.weeklySub} weekly subs)`,
        });
      } else {
        // REQUIREMENT: NO SUBSTITUTE AVAILABLE -> TEACHER NOT AVAILABLE
        generatedItems.push({
          id: `sub_item_${Date.now()}_${periodNum}_${Math.random().toString(36).substring(2, 6)}`,
          period: periodNum,
          className: clsName,
          division: divName,
          subjectName: subjName,
          originalTeacher: origTeacher,
          substituteTeacher: "TEACHER NOT AVAILABLE",
          priorityReason: "TEACHER NOT AVAILABLE",
          remarks: "TEACHER NOT AVAILABLE - No eligible free teacher in this period.",
        });
      }
    });

    const combinedOriginalTeachers = absentTeacherNames.join(", ");
    const primaryReason = teacherList.length === 1 ? teacherList[0].reason : ("Leave" as const);
    const combinedCustomReason = teacherList
      .map((t) => `${t.name}: ${t.reason}${t.customReason ? " (" + t.customReason + ")" : ""}`)
      .join("; ");

    // Create Draft Adjustment Object
    const newAdj: V2SubstituteAdjustment = {
      id: `adj_${Date.now()}`,
      date: targetDate,
      day: targetDay,
      originalTeacher: combinedOriginalTeachers,
      reason: primaryReason,
      customReason: combinedCustomReason,
      excludedTeachers: exclTeachers,
      status: "Draft",
      preparedBy: user.name || "Headmaster Office",
      createdAt: new Date().toISOString(),
      items: generatedItems,
      overallRemarks: `Adjustment generated for ${combinedOriginalTeachers} on ${targetDate}. Pending Headmaster review.`,
      leaveApplicationId: leaveAppId,
    };

    // Save draft and switch to Review Mode in Today's Adjustments tab
    const updatedList = [newAdj, ...adjustments];
    saveAdjustments(updatedList);
    setReviewingAdjId(newAdj.id);
    setActiveSubTab("today");
    setSelectedDate(targetDate);
  };

  // Helper to toggle Excluded Teacher
  const toggleExcludedTeacher = (tName: string) => {
    setExcludedTeachers((prev) =>
      prev.includes(tName) ? prev.filter((x) => x !== tName) : [...prev, tName]
    );
  };

  // Preset Excluded Teacher helpers
  const applyExcludedPreset = (preset: "exam" | "office" | "principal" | "none") => {
    if (preset === "none") {
      setExcludedTeachers([]);
      return;
    }
    const filtered = approvedTeachers.filter((teacher) => {
      const des = (teacher.designation || "").toLowerCase();
      const role = (teacher.role || "").toLowerCase();
      const name = (teacher.name || "").toLowerCase();
      if (preset === "principal") {
        return des.includes("principal") || des.includes("head") || role.includes("admin");
      }
      if (preset === "exam") {
        return name.includes("exam") || des.includes("exam") || name.includes("incharge");
      }
      if (preset === "office") {
        return des.includes("clerk") || des.includes("office") || des.includes("account");
      }
      return false;
    });
    setExcludedTeachers(filtered.map((f) => f.name));
  };

  // Approve Draft Adjustment
  const handleApproveAdjustment = (adjId: string) => {
    const updated = adjustments.map((adj) => {
      if (adj.id === adjId) {
        return {
          ...adj,
          status: "Approved" as const,
          approvedAt: new Date().toISOString(),
        };
      }
      return adj;
    });
    saveAdjustments(updated);
    const approved = updated.find((item) => item.id === adjId);
    if (approved) {
      void publishSubstituteAdjustment(approved).catch((error) => {
        console.warn("Substitute cloud publication pending R6 setup:", error);
      });
    }
    alert(
      t(
        "✅ Substitute Adjustment approved. Assigned teachers can see it immediately in the current app; cloud delivery activates when the R6 timetable tables are installed.",
        "✅ स्थानापन्न समायोजन स्वीकृत किया गया। वर्तमान ऐप में संबंधित शिक्षक इसे देख सकते हैं; R6 क्लाउड टेबल इंस्टॉल होने पर क्लाउड डिलीवरी सक्रिय होगी।",
        "✅ متبادل ایڈجسٹمنٹ منظور ہو گئی ہے۔ موجودہ ایپ میں متعلقہ اساتذہ اسے دیکھ سکتے ہیں؛ R6 کلاؤڈ ٹیبلز انسٹال ہونے پر کلاؤڈ ڈیلیوری فعال ہوگی۔"
      )
    );
  };

  // Delete / Cancel Adjustment (Restores original schedule completely)
  const handleDeleteAdjustment = async (adjId: string) => {
    if (
      await requestActionConfirm({
        title: t('Delete adjustment?', 'समायोजन हटाएं?', 'ایڈجسٹمنٹ حذف کریں؟'),
        message: t(
          "Are you sure you want to delete this adjustment? The original timetable schedule will remain completely unchanged.",
          "क्या आप वाकई इस समायोजन को हटाना चाहते हैं? मूल समय सारणी अनुसूची पूरी तरह से अपरिवर्तित रहेगी।",
          "کیا آپ واقعی اس ایڈجسٹمنٹ کو حذف کرنا چاہتے ہیں؟ اصل ٹائم ٹیبل کا شیڈول بالکل بلاشبہ محفوظ رہے گا۔"
        ),
        confirmLabel: t('Delete Adjustment', 'समायोजन हटाएं', 'ایڈجسٹمنٹ حذف کریں'),
        tone: 'danger'
      })
    ) {
      const updated = adjustments.filter((adj) => adj.id !== adjId);
      saveAdjustments(updated);
      if (reviewingAdjId === adjId) setReviewingAdjId(null);
    }
  };

  // Update Substitute Item inside Draft Review Mode
  const handleUpdateSubstituteItem = (
    adjId: string,
    itemId: string,
    newSubTeacher: string,
    newRemarks?: string
  ) => {
    const updated = adjustments.map((adj) => {
      if (adj.id === adjId) {
        const updatedItems = adj.items.map((item) => {
          if (item.id === itemId) {
            return {
              ...item,
              substituteTeacher: newSubTeacher,
              priorityReason: "Headmaster Manual Reassignment",
              remarks: newRemarks !== undefined ? newRemarks : item.remarks,
            };
          }
          return item;
        });
        return { ...adj, items: updatedItems };
      }
      return adj;
    });
    saveAdjustments(updated);
  };

  // =========================================================
  // EXCEL EXPORT ENGINE (.xlsx)
  // =========================================================
  const exportAdjustmentToExcel = async (adj: V2SubstituteAdjustment) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Substitute_${adj.date}`);

    // Set Column Widths
    worksheet.columns = [
      { header: "Sr No", key: "srNo", width: 8 },
      { header: "Period", key: "period", width: 10 },
      { header: "Class & Div", key: "classDiv", width: 15 },
      { header: "Subject", key: "subject", width: 22 },
      { header: "Original Teacher", key: "origTeacher", width: 25 },
      { header: "Substitute Teacher", key: "subTeacher", width: 25 },
      { header: "Teacher Signature", key: "signature", width: 22 },
    ];

    // Add Title Row
    worksheet.mergeCells("A1:G1");
    const titleCell = worksheet.getCell("A1");
    titleCell.value = "NATIONAL HIGH SCHOOL, TALODA";
    titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FF1E293B" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };

    // Add Subtitle
    worksheet.mergeCells("A2:G2");
    const subTitleCell = worksheet.getCell("A2");
    subTitleCell.value = `OFFICIAL DAILY SUBSTITUTE ADJUSTMENT REGISTER - ${adj.date} (${adj.day.toUpperCase()})`;
    subTitleCell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FF0284C7" } };
    subTitleCell.alignment = { horizontal: "center", vertical: "middle" };

    // Meta Row
    worksheet.mergeCells("A3:G3");
    const metaCell = worksheet.getCell("A3");
    metaCell.value = `Absent Teacher: ${adj.originalTeacher} | Reason: ${adj.reason}${
      adj.customReason ? ` (${adj.customReason})` : ""
    } | Status: ${adj.status.toUpperCase()} | Prepared By: ${adj.preparedBy}`;
    metaCell.font = { name: "Arial", size: 9, italic: true };
    metaCell.alignment = { horizontal: "center", vertical: "middle" };

    worksheet.addRow([]); // Empty row

    // Table Headers
    const headerRow = worksheet.addRow([
      "Sr No",
      "Period",
      "Class & Div",
      "Subject",
      "Original Teacher",
      "Substitute Teacher",
      "Teacher Signature",
    ]);

    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0F172A" },
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });

    // Populate Data Rows
    adj.items.forEach((item, index) => {
      const dataRow = worksheet.addRow([
        index + 1,
        `Period ${item.period}`,
        `${item.className} (${item.division})`,
        item.subjectName,
        item.originalTeacher,
        item.substituteTeacher,
        "", // Blank for physical signature
      ]);

      dataRow.alignment = { vertical: "middle" };
      dataRow.getCell(1).alignment = { horizontal: "center" };
      dataRow.getCell(2).alignment = { horizontal: "center" };
      dataRow.getCell(3).alignment = { horizontal: "center" };

      if (item.substituteTeacher === "TEACHER NOT AVAILABLE") {
        const subCell = dataRow.getCell(6);
        subCell.font = { bold: true, color: { argb: "FF991B1B" } };
        subCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFEE2E2" },
        };
      }
    });

    // Footer spacing & Signatures
    worksheet.addRow([]);
    worksheet.addRow([]);

    const footerRow = worksheet.addRow([
      "",
      "Prepared By:",
      adj.preparedBy,
      "",
      "",
      "Headmaster Signature:",
      "",
    ]);
    footerRow.font = { bold: true, size: 10 };

    // Generate buffer & download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, `Substitute_Register_${adj.originalTeacher.replace(/\s+/g, "_")}_${adj.date}.xlsx`);
  };

  // Filtered History
  const filteredHistory = useMemo(() => {
    return adjustments.filter((adj) => {
      // Search
      const s = historySearch.toLowerCase();
      const matchSearch =
        !s ||
        adj.originalTeacher.toLowerCase().includes(s) ||
        adj.reason.toLowerCase().includes(s) ||
        adj.date.includes(s) ||
        adj.items.some(
          (i) =>
            i.substituteTeacher.toLowerCase().includes(s) ||
            i.subjectName.toLowerCase().includes(s) ||
            i.className.toLowerCase().includes(s)
        );

      // Status
      const matchStatus = historyStatusFilter === "All" || adj.status === historyStatusFilter;

      // Reason
      const matchReason = historyReasonFilter === "All" || adj.reason === historyReasonFilter;

      // Date Range
      let matchDate = true;
      if (historyDateFrom && adj.date < historyDateFrom) matchDate = false;
      if (historyDateTo && adj.date > historyDateTo) matchDate = false;

      return matchSearch && matchStatus && matchReason && matchDate;
    });
  }, [adjustments, historySearch, historyStatusFilter, historyReasonFilter, historyDateFrom, historyDateTo]);

  return (
    <div className="space-y-6 text-left">
      {/* MODULE HEADER BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] bg-indigo-500/20 text-indigo-400 font-extrabold px-2 py-0.5 rounded border border-indigo-500/30 uppercase font-mono tracking-widest">
              Smart AI Module
            </span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded border border-emerald-500/30 font-mono">
              🛡️ Master Timetable Protected
            </span>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-indigo-400" />
            {t(
              "Substitute Management System V2",
              "स्थानापन्न प्रबंधन प्रणाली V2",
              "متبادل ایڈجسٹمنٹ مینجمنٹ سسٹم V2"
            )}
          </h2>
          <p className="text-xs text-slate-400 font-medium max-w-2xl mt-0.5">
            {t(
              "Automatically allocate substitute teachers when staff members are on leave. The original master timetable remains untouched and unchanged.",
              "जब कर्मचारी छुट्टी पर हों तो स्वचालित रूप से स्थानापन्न शिक्षकों को आवंटित करें। मूल मास्टर समय सारणी अछूती और अपरिवर्तित रहती है।",
              "جب عملہ کی چھٹی ہو تو خود بخود متبادل اساتذہ کو تفویض کریں۔ اصل ماسٹر ٹائم ٹیبل بالکل محفوظ رہتا ہے۔"
            )}
          </p>
        </div>

        {/* TOP NAVIGATION TABS */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800/80">
          <button
            onClick={() => setActiveSubTab("generate")}
            className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === "generate"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t("Generate Adjustment", "समायोजन बनाएं", "ایڈجسٹمنٹ بنائیں")}</span>
          </button>

          <button
            onClick={() => setActiveSubTab("today")}
            className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 relative ${
              activeSubTab === "today"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{t("Today's Adjustments", "आज के समायोजन", "آج کی ایڈجسٹمنٹس")}</span>
            {adjustments.filter((a) => a.date === selectedDate && a.status === "Draft").length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveSubTab("register")}
            className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === "register"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{t("Adjustment Register", "समायोजन रजिस्टर", "ایڈجسٹمنٹ رجسٹر")}</span>
          </button>
        </div>
      </div>

      {/* =========================================================
          TAB 1: GENERATE ADJUSTMENT
      ========================================================= */}
      {activeSubTab === "generate" && (
        <div className="space-y-6">
          {/* MODE SELECTOR BANNER */}
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                {t("Select Generation Workflow", "जनरेशन कार्यप्रवाह चुनें", "جنریشن کے طریقہ کار کا انتخاب کریں")}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                {t(
                  "Choose between automatic import from approved leave applications or manual Headmaster creation.",
                  "स्वीकृत अवकाश आवेदनों से स्वचालित आयात या मैनुअल प्रधानाध्यापक निर्माण के बीच चयन करें।",
                  "منظور شدہ رخصت کی درخواستوں سے خودکار درآمد یا دستی ہیڈ ماسٹر ایڈجسٹمنٹ میں سے انتخاب کریں۔"
                )}
              </p>
            </div>

            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setGenMode("auto")}
                className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  genMode === "auto"
                    ? "bg-blue-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <ZapIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>{t("Automatic Leave Mode", "स्वचालित अवकाश मोड", "خودکار رخصت موڈ")}</span>
              </button>
              <button
                onClick={() => setGenMode("manual")}
                className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  genMode === "manual"
                    ? "bg-blue-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <UserCheckIcon className="w-3.5 h-3.5" />
                <span>{t("Manual Headmaster Entry", "मैनुअल प्रविष्टि", "دستی ہیڈ ماسٹر اندراج")}</span>
              </button>
            </div>
          </div>

          {/* AUTO MODE PANEL */}
          {genMode === "auto" && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div>
                  <h4 className="text-sm font-black text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    {t(
                      "System Approved Teacher Leave Applications",
                      "सिस्टम स्वीकृत शिक्षक अवकाश आवेदन",
                      "سسٹم سے منظور شدہ ٹیچر لیو کی درخواستیں"
                    )}
                  </h4>
                  <p className="text-xs text-slate-400 font-medium">
                    {t(
                      "Click any approved leave application to automatically detect affected periods and prepare a workload-balanced substitute draft.",
                      "प्रभावित अवधियों का स्वचालित रूप से पता लगाने के लिए किसी भी स्वीकृत छुट्टी आवेदन पर क्लिक करें।",
                      "خودکار طریقے سے متاثرہ پیریڈز کا پتہ لگانے کے لیے منظور شدہ چھٹی کی درخواست پر کلک کریں۔"
                    )}
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-slate-400 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
                  {approvedLeavesList.length} {t("Approved Leaves", "स्वीकृत पत्तियां", "منظور شدہ چھٹیاں")}
                </span>
              </div>

              {approvedLeavesList.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-slate-950 rounded-xl border border-slate-850">
                  <Info className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs font-bold">No active approved teacher leaves found for today.</p>
                  <p className="text-[11px] text-slate-600 mt-1">Switch to Manual Mode to generate custom adjustments.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {approvedLeavesList.map((leave, idx) => (
                    <div
                      key={leave.id || idx}
                      className="bg-slate-950 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-4 space-y-3 transition-all"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-black">
                            👨‍🏫
                          </div>
                          <div>
                            <h5 className="text-sm font-black text-white">{leave.applicantName}</h5>
                            <span className="text-[10px] text-slate-400 font-mono font-semibold">
                              {leave.leaveType || "Leave Application"}
                            </span>
                          </div>
                        </div>

                        <span className="text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/30">
                          Approved
                        </span>
                      </div>

                      <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 text-xs text-slate-300 space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400 font-mono">Date Range:</span>
                          <span className="font-bold text-white font-mono">
                            {leave.startDate} to {leave.endDate || leave.startDate}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400 font-mono">Reason:</span>
                          <span className="font-medium text-slate-200 italic truncate max-w-[180px]">
                            "{leave.reason}"
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          runAutoSubstituteEngine(
                            [
                              {
                                name: leave.applicantName,
                                reason: (leave.category || "Leave") as any,
                                customReason: leave.reason,
                              },
                            ],
                            selectedDate || leave.startDate,
                            selectedDay,
                            excludedTeachers,
                            leave.id
                          )
                        }
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <ZapIcon className="w-3.5 h-3.5 text-amber-300" />
                        <span>
                          {t(
                            "⚡ Generate Draft Adjustment",
                            "⚡ ड्राफ्ट समायोजन उत्पन्न करें",
                            "⚡ ڈرافٹ ایڈجسٹمنٹ بنائیں"
                          )}
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MANUAL MODE PANEL */}
          {genMode === "manual" && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
              <div className="border-b border-slate-800 pb-3">
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <UserCheckIcon className="w-4 h-4 text-indigo-400" />
                  {t(
                    "Headmaster Manual Adjustment Entry",
                    "प्रधानाध्यापक मैनुअल समायोजन प्रविष्टि",
                    "ہیڈ ماسٹر دستی ایڈجسٹمنٹ اندراج"
                  )}
                </h4>
                <p className="text-xs text-slate-400 font-medium">
                  {t(
                    "Select date, absent teacher, reason and excluded teachers to run the AI substitution engine.",
                    "एआई प्रतिस्थापन इंजन को चलाने के लिए तिथि, अनुपस्थित शिक्षक, कारण और बाहर रखे गए शिक्षकों का चयन करें।",
                    "اے آئی ایڈجسٹمنٹ انجن چلانے کے لیے تاریخ، غیر حاضر استاد، وجہ اور خارج کیے گئے اساتذہ کا انتخاب کریں۔"
                  )}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {/* 1. Date Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{t("Select Date", "तिथि चुनें", "تاریخ منتخب کریں")}</span>
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  <span className="text-[10px] text-indigo-400 font-bold font-mono block">
                    Day: {selectedDay}
                  </span>
                </div>

                {/* 2. Absent Teachers Selector */}
                <div className="space-y-1.5 sm:col-span-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{t("Select Absent Teachers", "अनुपस्थित शिक्षक चुनें", "غیر حاضر اساتذہ منتخب کریں")} ({selectedTeachers.length} Selected)</span>
                    </label>
                    {selectedTeachers.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedTeachers([])}
                        className="text-[10px] text-rose-400 font-bold hover:underline cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={manualTeacherSearch}
                    onChange={(e) => setManualTeacherSearch(e.target.value)}
                    placeholder="Search teachers..."
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500 mb-2"
                  />
                  <div className="max-h-36 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-2 bg-slate-950/80 rounded-xl border border-slate-800">
                    {approvedTeachers
                      .filter((t) => t.name.toLowerCase().includes(manualTeacherSearch.toLowerCase()))
                      .map((t) => {
                        const isSel = selectedTeachers.includes(t.name);
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              if (isSel) {
                                setSelectedTeachers(selectedTeachers.filter((n) => n !== t.name));
                              } else {
                                setSelectedTeachers([...selectedTeachers, t.name]);
                              }
                            }}
                            className={`flex items-center gap-2 p-1.5 rounded-lg text-xs font-semibold text-left transition-all border cursor-pointer ${
                              isSel
                                ? "bg-indigo-600/30 border-indigo-500 text-white font-bold"
                                : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                            }`}
                          >
                            {isSel ? (
                              <CheckSquare className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                            )}
                            <span className="truncate">{t.name}</span>
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* 3. Reason Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{t("Reason for Absence", "अनुपस्थिति का कारण", "غیر حاضری کی وجہ")}</span>
                  </label>
                  <select
                    value={reason}
                    onChange={(e: any) => setReason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="Leave">Leave</option>
                    <option value="Training">Training</option>
                    <option value="Official Duty">Official Duty</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Election Duty">Election Duty</option>
                    <option value="Medical">Medical</option>
                    <option value="Other">Other (Custom Reason)</option>
                  </select>
                </div>
              </div>

              {/* Custom Reason Field */}
              {reason === "Other" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    {t("Specify Custom Reason", "कस्टम कारण निर्दिष्ट करें", "مخصوص وجہ بیان کریں")}
                  </label>
                  <input
                    type="text"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="e.g. Deputed to University Exam Evaluation"
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              {/* EXCLUDED TEACHERS SELECTION (Unavailable for Substitute Duty) */}
              <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <div>
                    <h5 className="text-xs font-extrabold text-amber-400 flex items-center gap-1.5">
                      <UserX className="w-4 h-4 shrink-0" />
                      <span>
                        {t(
                          "Excluded Teachers (Unavailable for Substitute Duty)",
                          "अपवर्जित शिक्षक (स्थानापन्न ड्यूटी के लिए अनुपलब्ध)",
                          "مستثنیٰ اساتذہ (متبادل کے لیے دستیاب نہیں)"
                        )}
                      </span>
                    </h5>
                    <p className="text-[11px] text-slate-400">
                      {t(
                        "Selected teachers will NEVER receive substitute duties for this adjustment (e.g. Office work, Exam Duty, Principal).",
                        "चयनित शिक्षकों को इस समायोजन के लिए कभी भी स्थानापन्न ड्यूटी नहीं मिलेगी।",
                        "منتخب اساتذہ کو اس ایڈجسٹمنٹ کے لیے کبھی متبادل ڈیوٹی نہیں دی جائے گی۔"
                      )}
                    </p>
                  </div>

                  {/* Preset Buttons */}
                  <div className="flex gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => applyExcludedPreset("principal")}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 text-[10px] font-bold rounded-lg border border-slate-800 cursor-pointer"
                    >
                      + Principal/Head
                    </button>
                    <button
                      type="button"
                      onClick={() => applyExcludedPreset("exam")}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 text-[10px] font-bold rounded-lg border border-slate-800 cursor-pointer"
                    >
                      + Exam Cell
                    </button>
                    <button
                      type="button"
                      onClick={() => applyExcludedPreset("none")}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-400 text-[10px] font-bold rounded-lg border border-slate-800 cursor-pointer"
                    >
                      Clear Excluded
                    </button>
                  </div>
                </div>

                {/* Excluded Filter & Multi-Select Grid */}
                <div className="space-y-2">
                  <input
                    type="text"
                    value={excludedSearch}
                    onChange={(e) => setExcludedSearch(e.target.value)}
                    placeholder="Search teachers to exclude..."
                    className="w-full bg-slate-900 border border-slate-800 text-slate-300 rounded-xl p-2 text-xs focus:outline-none"
                  />

                  <div className="max-h-40 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 p-2 bg-slate-900/50 rounded-xl border border-slate-800/60">
                    {approvedTeachers
                      .filter((t) => t.name.toLowerCase().includes(excludedSearch.toLowerCase()))
                      .map((t) => {
                        const isExcl = excludedTeachers.includes(t.name);
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => toggleExcludedTeacher(t.name)}
                            className={`flex items-center gap-2 p-2 rounded-lg text-xs font-semibold text-left transition-all border cursor-pointer ${
                              isExcl
                                ? "bg-amber-500/10 border-amber-500/40 text-amber-300 font-bold"
                                : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                            }`}
                          >
                            {isExcl ? (
                              <CheckSquare className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                            )}
                            <span className="truncate">{t.name}</span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* RUN ENGINE ACTION BUTTON */}
              <button
                onClick={() => {
                  if (selectedTeachers.length === 0) {
                    alert("Please select at least one absent teacher from the list.");
                    return;
                  }
                  const teacherList = selectedTeachers.map((tName) => {
                    if (applySameReason) {
                      return { name: tName, reason: reason, customReason: customReason };
                    }
                    const rData = teacherReasonsMap[tName] || { reason: "Leave" as const };
                    return { name: tName, reason: rData.reason, customReason: rData.customReason };
                  });
                  runAutoSubstituteEngine(teacherList, selectedDate, selectedDay, excludedTeachers);
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm py-3.5 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                <span>
                  {t(
                    `🤖 Run AI Substitute Engine for ${selectedTeachers.length || 0} Absent Teachers`,
                    `🤖 ${selectedTeachers.length || 0} अनुपस्थित शिक्षकों के लिए एआई इंजन चलाएं`,
                    `🤖 ${selectedTeachers.length || 0} غیر حاضر اساتذہ کے لیے اے آئی انجن چلائیں`
                  )}
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          TAB 2: TODAY'S ADJUSTMENTS & REVIEW MODE
      ========================================================= */}
      {activeSubTab === "today" && (
        <div className="space-y-6">
          {/* DATE SELECTOR DECK */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-indigo-400 shrink-0" />
              <div>
                <h4 className="text-sm font-black text-white">
                  {t("Active Adjustments for Date", "तिथि के लिए सक्रिय समायोजन", "تاریخ کے لیے ایڈجسٹمنٹس")}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {selectedDay}, {selectedDate}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-white rounded-xl p-2 text-xs font-bold font-mono"
              />
            </div>
          </div>

          {/* LIST OF ADJUSTMENTS FOR SELECTED DATE */}
          {adjustments.filter((a) => a.date === selectedDate).length === 0 ? (
            <div className="p-12 text-center text-slate-500 bg-slate-900 rounded-2xl border border-slate-800">
              <Clock className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <h5 className="text-sm font-extrabold text-slate-300">
                {t("No substitute adjustments found for this date.", "इस तिथि के लिए कोई समायोजन नहीं मिला।", "اس تاریخ کے لیے کوئی متبادل ایڈجسٹمنٹ نہیں ملی۔")}
              </h5>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                {t("Click 'Generate Adjustment' to create a new workload-balanced substitute allocation.", "नया समायोजन बनाने के लिए 'समायोजन बनाएं' पर क्लिक करें।", "نئی متبادل ایڈجسٹمنٹ بنانے کے لیے 'ایڈجسٹمنٹ بنائیں' پر کلک کریں۔")}
              </p>
            </div>
          ) : (
            adjustments
              .filter((a) => a.date === selectedDate)
              .map((adj) => {
                const isDraft = adj.status === "Draft";

                return (
                  <div
                    key={adj.id}
                    className={`rounded-2xl border p-6 space-y-5 transition-all ${
                      isDraft
                        ? "bg-slate-900/90 border-amber-500/50 shadow-lg shadow-amber-950/20"
                        : "bg-slate-900 border-emerald-500/40"
                    }`}
                  >
                    {/* ADJ HEADER BAR */}
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-800 pb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                            isDraft
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          }`}
                        >
                          {isDraft ? "⏳" : "✅"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-black text-white">
                              {adj.originalTeacher}
                            </h4>
                            <span
                              className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono ${
                                isDraft
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              }`}
                            >
                              {adj.status === "Draft" ? "Draft (Pending Review)" : "Approved & Active"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 font-medium">
                            Reason: <span className="text-slate-200 font-bold">{adj.reason}</span>
                            {adj.customReason ? ` (${adj.customReason})` : ""} | Prepared By: {adj.preparedBy}
                          </p>
                        </div>
                      </div>

                      {/* ACTION BUTTONS */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {isDraft ? (
                          <>
                            <button
                              onClick={() => handleApproveAdjustment(adj.id)}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{t("Approve Adjustment", "स्वीकृत करें", "منظور کریں")}</span>
                            </button>
                            <button type="button"
                              onClick={() => handleDeleteAdjustment(adj.id)}
                              className="px-3 py-2 bg-slate-800 hover:bg-rose-900/50 text-slate-300 hover:text-rose-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setPrintModalAdj(adj)}
                              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5 text-indigo-400" />
                              <span>{t("Print Register", "रजिस्टर प्रिंट करें", "رجسٹر پرنٹ کریں")}</span>
                            </button>
                            <button
                              onClick={() => exportAdjustmentToExcel(adj)}
                              className="px-3.5 py-2 bg-emerald-950 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800 font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Excel</span>
                            </button>
                            <button type="button"
                              onClick={() => handleDeleteAdjustment(adj.id)}
                              className="px-3 py-2 bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                              title="Revoke / Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* TABLE OF AFFECTED PERIODS */}
                    <div className="overflow-x-auto rounded-xl border border-slate-800">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                          <tr>
                            <th className="p-3">Period</th>
                            <th className="p-3">Class & Div</th>
                            <th className="p-3">Subject</th>
                            <th className="p-3">Original Teacher</th>
                            <th className="p-3">Assigned Substitute Teacher</th>
                            <th className="p-3">Allocation Basis / Reason</th>
                            <th className="p-3">Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80 text-slate-200">
                          {adj.items.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-950/50">
                              <td className="p-3 font-mono font-bold text-indigo-400">
                                Period {item.period}
                              </td>
                              <td className="p-3 font-bold text-white">
                                {item.className} ({item.division})
                              </td>
                              <td className="p-3 font-medium text-slate-300">{item.subjectName}</td>
                              <td className="p-3 font-medium text-slate-400">{item.originalTeacher}</td>

                              {/* Substitute Teacher Selector / Display */}
                              <td className="p-3">
                                {isDraft ? (
                                  <div className="flex items-center gap-2">
                                    <select
                                      value={item.substituteTeacher}
                                      onChange={(e) =>
                                        handleUpdateSubstituteItem(adj.id, item.id, e.target.value)
                                      }
                                      className={`bg-slate-950 border rounded-lg p-1.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 cursor-pointer max-w-[220px] ${
                                        item.substituteTeacher === "TEACHER NOT AVAILABLE"
                                          ? "border-rose-500 text-rose-300 font-black bg-rose-950/40"
                                          : "border-slate-700 text-white"
                                      }`}
                                    >
                                      <option value="TEACHER NOT AVAILABLE">⚠️ TEACHER NOT AVAILABLE</option>
                                      <option value="Unassigned">-- Unassigned (Self Study) --</option>
                                      {approvedTeachers.map((t) => {
                                        const nameLower = t.name.toLowerCase().trim();
                                        const isOriginal = (adj.originalTeacher || "").toLowerCase().includes(nameLower);
                                        const isExcluded = adj.excludedTeachers?.includes(t.name);

                                        const isOnLeave = approvedLeavesList.some((l) => {
                                          if ((l.applicantName || "").toLowerCase().trim() !== nameLower) return false;
                                          if (l.status !== "Approved") return false;
                                          const start = l.startDate;
                                          const end = l.endDate || l.startDate;
                                          return adj.date >= start && adj.date <= end;
                                        });

                                        const isBusyTimetable = timetable.some(
                                          (cell) =>
                                            cell.day === adj.day &&
                                            cell.period === item.period &&
                                            (cell.teacherName || "").toLowerCase().trim() === nameLower
                                        );

                                        const isBusySub = adjustments.some((a) =>
                                          a.status !== "Cancelled" &&
                                          a.date === adj.date &&
                                          a.items.some(
                                            (other) =>
                                              other.id !== item.id &&
                                              other.period === item.period &&
                                              (other.substituteTeacher || "").toLowerCase().trim() === nameLower
                                          )
                                        );

                                        let tag = "🟢 Free";
                                        if (isOriginal) tag = "🔴 Absent";
                                        else if (isOnLeave) tag = "🔴 On Leave";
                                        else if (isExcluded) tag = "⛔ Excluded";
                                        else if (isBusyTimetable) tag = "🟡 Busy in Class";
                                        else if (isBusySub) tag = "🟡 Busy as Sub";

                                        return (
                                          <option key={t.id} value={t.name}>
                                            {tag} - {t.name}
                                          </option>
                                        );
                                      })}
                                    </select>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updatedItems = adj.items.filter((it) => it.id !== item.id);
                                        const updated = adjustments.map((a) =>
                                          a.id === adj.id ? { ...a, items: updatedItems } : a
                                        );
                                        saveAdjustments(updated);
                                      }}
                                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
                                      title="Remove this period from adjustment draft"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : item.substituteTeacher === "TEACHER NOT AVAILABLE" ? (
                                  <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 font-black border border-rose-500/40 text-xs flex items-center gap-1.5 w-fit">
                                    ⚠️ TEACHER NOT AVAILABLE
                                  </span>
                                ) : (
                                  <span
                                    className={`font-black ${
                                      item.substituteTeacher === "Unassigned"
                                        ? "text-amber-400"
                                        : "text-emerald-400"
                                    }`}
                                  >
                                    👨‍🏫 {item.substituteTeacher}
                                  </span>
                                )}
                              </td>

                              <td className="p-3">
                                <span className="text-[10px] bg-indigo-500/10 text-indigo-300 font-bold px-2 py-0.5 rounded border border-indigo-500/20 font-mono">
                                  {item.priorityReason || "Balanced Engine"}
                                </span>
                              </td>

                              <td className="p-3">
                                {isDraft ? (
                                  <input
                                    type="text"
                                    value={item.remarks || ""}
                                    onChange={(e) =>
                                      handleUpdateSubstituteItem(
                                        adj.id,
                                        item.id,
                                        item.substituteTeacher,
                                        e.target.value
                                      )
                                    }
                                    placeholder="Add remarks..."
                                    className="bg-slate-950 border border-slate-800 text-slate-300 rounded p-1 text-[11px] w-full"
                                  />
                                ) : (
                                  <span className="text-slate-400 text-[11px]">
                                    {item.remarks || "-"}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      )}

      {/* =========================================================
          TAB 3: ADJUSTMENT REGISTER (HISTORY & REPORTS)
      ========================================================= */}
      {activeSubTab === "register" && (
        <div className="space-y-6">
          {/* SEARCH & FILTERS BAR */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Search teacher, class, reason..."
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl pl-9 pr-3 py-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Status Filter */}
              <select
                value={historyStatusFilter}
                onChange={(e) => setHistoryStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-white rounded-xl p-2 text-xs font-bold"
              >
                <option value="All">All Statuses</option>
                <option value="Approved">Approved</option>
                <option value="Draft">Draft</option>
              </select>

              {/* Date From */}
              <input
                type="date"
                value={historyDateFrom}
                onChange={(e) => setHistoryDateFrom(e.target.value)}
                placeholder="From Date"
                className="bg-slate-950 border border-slate-800 text-white rounded-xl p-2 text-xs font-bold font-mono"
              />

              {/* Date To */}
              <input
                type="date"
                value={historyDateTo}
                onChange={(e) => setHistoryDateTo(e.target.value)}
                placeholder="To Date"
                className="bg-slate-950 border border-slate-800 text-white rounded-xl p-2 text-xs font-bold font-mono"
              />
            </div>
          </div>

          {/* HISTORY DATA TABLE */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-md">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                <span>
                  {t("Permanent Substitute Adjustment History", "स्थायी स्थानापन्न समायोजन इतिहास", "مستقل متبادل ایڈجسٹمنٹ ہسٹری")}
                </span>
              </h4>

              <span className="text-xs font-mono font-bold text-slate-400">
                {filteredHistory.length} {t("Records", "अभिलेख", "ریکارڈز")}
              </span>
            </div>

            {filteredHistory.length === 0 ? (
              <div className="p-10 text-center text-slate-500">
                <Info className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-bold">No adjustment records matched your search filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Day</th>
                      <th className="p-3">Absent Teacher</th>
                      <th className="p-3">Reason</th>
                      <th className="p-3">Affected Periods</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Prepared By</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-200">
                    {filteredHistory.map((adj) => (
                      <tr key={adj.id} className="hover:bg-slate-950/50">
                        <td className="p-3 font-mono font-bold text-indigo-400">{adj.date}</td>
                        <td className="p-3 font-bold text-slate-300">{adj.day}</td>
                        <td className="p-3 font-black text-white">{adj.originalTeacher}</td>
                        <td className="p-3 font-medium text-slate-300">
                          {adj.reason}
                          {adj.customReason ? ` (${adj.customReason})` : ""}
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-400">
                          {adj.items.length} Periods
                        </td>
                        <td className="p-3">
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase font-mono ${
                              adj.status === "Approved"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            }`}
                          >
                            {adj.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400">{adj.preparedBy}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setPrintModalAdj(adj)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg transition-all cursor-pointer"
                              title="Print Official A4 Register"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => exportAdjustmentToExcel(adj)}
                              className="p-1.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 rounded-lg border border-emerald-800 transition-all cursor-pointer"
                              title="Export Excel"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button type="button"
                              onClick={() => handleDeleteAdjustment(adj.id)}
                              className="p-1.5 bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-300 rounded-lg transition-all cursor-pointer"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================
          A4 OFFICIAL PRINTABLE ADJUSTMENT REGISTER MODAL
      ========================================================= */}
      {printModalAdj && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl max-w-4xl w-full p-8 shadow-2xl space-y-6 print:p-0 print:shadow-none print:w-full">
            {/* Modal Actions (Hidden in Print) */}
            <div className="flex justify-between items-center border-b pb-4 print:hidden">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <Printer className="w-4 h-4 text-indigo-600" />
                <span>Official Printable A4 Register Preview</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => printSectionById('substitute-adjustment-register-print', 'Official Substitute / Adjustment Register')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print A4 Now</span>
                </button>
                <button
                  onClick={() => setPrintModalAdj(null)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <style>{`@media print { @page { size: A4 landscape; margin: 7mm; } .substitute-duty-one-page { break-inside: avoid; page-break-inside: avoid; font-size: 10px !important; } .substitute-duty-one-page table { break-inside: avoid; page-break-inside: avoid; } .substitute-duty-one-page th, .substitute-duty-one-page td { padding: 4px !important; } }`}</style>
            {/* PRINTABLE A4 CONTENT CONTAINER */}
            <div id="substitute-adjustment-register-print" className="substitute-duty-one-page space-y-4 print:space-y-2">
              {/* OFFICIAL LETTERHEAD */}
              <div className="text-center border-b-2 border-slate-900 pb-4">
                <h1 className="text-xl font-black text-slate-900 tracking-wider font-serif uppercase">
                  NATIONAL HIGH SCHOOL, TALODA
                </h1>
                <h2 className="text-xs font-bold text-slate-700 uppercase tracking-widest mt-0.5">
                  OFFICIAL DAILY SUBSTITUTE / ADJUSTMENT TEACHER REGISTER
                </h2>
                <div className="mt-2 text-[11px] font-mono font-bold text-slate-600 flex justify-center gap-6">
                  <span>DATE: {printModalAdj.date}</span>
                  <span>DAY: {printModalAdj.day.toUpperCase()}</span>
                  <span>STATUS: {printModalAdj.status.toUpperCase()}</span>
                </div>
              </div>

              {/* META INFORMATION GRID */}
              <div className="grid grid-cols-2 gap-4 text-xs font-sans border p-3 rounded-lg bg-slate-50">
                <div>
                  <span className="font-bold text-slate-500 block text-[10px] uppercase font-mono">
                    Absent Teacher Name:
                  </span>
                  <span className="font-black text-slate-900 text-sm">{printModalAdj.originalTeacher}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 block text-[10px] uppercase font-mono">
                    Reason for Absence:
                  </span>
                  <span className="font-bold text-slate-800">
                    {printModalAdj.reason} {printModalAdj.customReason ? `(${printModalAdj.customReason})` : ""}
                  </span>
                </div>
              </div>

              {/* REGISTER TABLE */}
              <table className="w-full text-xs text-left border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                    <th className="p-2 border border-slate-300 text-center w-10">Sr</th>
                    <th className="p-2 border border-slate-300 text-center">Period</th>
                    <th className="p-2 border border-slate-300">Class & Div</th>
                    <th className="p-2 border border-slate-300">Subject</th>
                    <th className="p-2 border border-slate-300">Absent Teacher</th>
                    <th className="p-2 border border-slate-300">Substitute Teacher</th>
                    <th className="p-2 border border-slate-300 text-center w-28">Signature</th>
                  </tr>
                </thead>
                <tbody>
                  {printModalAdj.items.map((item, idx) => (
                    <tr key={item.id} className="border-b border-slate-300">
                      <td className="p-2 border border-slate-300 text-center font-bold font-mono">
                        {idx + 1}
                      </td>
                      <td className="p-2 border border-slate-300 text-center font-bold font-mono">
                        Period {item.period}
                      </td>
                      <td className="p-2 border border-slate-300 font-bold">
                        {item.className} ({item.division})
                      </td>
                      <td className="p-2 border border-slate-300">{item.subjectName}</td>
                      <td className="p-2 border border-slate-300">{item.originalTeacher || printModalAdj.originalTeacher}</td>
                      <td className="p-2 border border-slate-300 font-black">
                        {item.substituteTeacher === "TEACHER NOT AVAILABLE" ? (
                          <span className="text-rose-700 font-black bg-rose-100 px-2 py-0.5 rounded border border-rose-300 block text-center font-mono text-[11px]">
                            ⚠️ TEACHER NOT AVAILABLE
                          </span>
                        ) : (
                          <span className="text-slate-900">{item.substituteTeacher}</span>
                        )}
                      </td>
                      <td className="p-2 border border-slate-300"></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* FOOTER SIGNATURE BLOCK */}
              <div className="pt-12 grid grid-cols-3 gap-6 text-center text-xs font-bold text-slate-800">
                <div>
                  <div className="border-t border-slate-900 pt-1">Prepared By (Desk)</div>
                  <div className="text-[10px] text-slate-500 font-normal">{printModalAdj.preparedBy}</div>
                </div>
                <div>
                  <div className="border-t border-slate-900 pt-1">Headmaster Signature</div>
                  <div className="text-[10px] text-slate-500 font-normal">National High School, Taloda</div>
                </div>
                <div>
                  <div className="border border-dashed border-slate-400 p-4 text-[10px] text-slate-400 uppercase font-mono">
                    [ School Official Seal ]
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Icon Helper Components
function ZapIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function UserCheckIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <polyline points="16 11 18 13 22 9" />
    </svg>
  );
}
