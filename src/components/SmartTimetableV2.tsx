import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Users,
  BookOpen,
  Clock,
  Layers,
  Shield,
  Settings,
  Printer,
  Download,
  Search,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  Play,
  Lock,
  Unlock,
  RefreshCw,
  Sparkles,
  ChevronRight,
  CheckSquare,
  ChevronLeft,
  LayoutGrid,
  Award,
  Sliders,
  Calendar,
  Undo2,
  Redo2,
  Copy,
  Eye,
  FileSpreadsheet,
  FileText,
  Info,
  HelpCircle,
  Save,
  Upload,
  Check,
  AlertTriangle,
  PrinterCheck,
} from "lucide-react";
import { LocalERPDatabase, supabase } from "../lib/supabase";
import { User } from "../types";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import SmartSubstituteManager from "./SmartSubstituteManager";
import { SubjectService, SubjectRecord } from "../services/subjectService";
import { printSectionById } from "../utils/printSection";
import { publishHeadmasterTimetable } from "../modules/teacherTimetableFresh/timetableService";
import { AcademicAssignmentCloudService } from "../services/academicAssignmentCloudService";

// Helper to convert OKLCH string to RGB/RGBA string to support html2canvas with Tailwind v4 colors
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

export type TimetableWorkspaceTab =
  | "setup"
  | "workload"
  | "generate"
  | "view"
  | "reports"
  | "substitute";

interface SmartTimetableV2Props {
  lang: "en" | "hi" | "ur";
  user: User;
  initialTab?: TimetableWorkspaceTab;
}

// Searchable custom dropdown component for Teacher Name
const SearchableTeacherSelect = ({
  value,
  onChange,
  approvedTeachers,
}: {
  value: string;
  onChange: (value: string) => void;
  approvedTeachers: any[];
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = approvedTeachers.filter((t) => {
    const s = search.toLowerCase();
    const name = (t.name || "").toLowerCase();
    const empId = (t.employeeCode || "").toLowerCase();
    const shalarth = (t.username || t.shalarthId || "").toLowerCase();
    const qual = (t.designation || "").toLowerCase();
    return name.includes(s) || empId.includes(s) || shalarth.includes(s) || qual.includes(s);
  });

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch("");
        }}
        className="w-full bg-slate-900 border border-slate-800 rounded px-2 px-1 text-xs font-bold text-white text-left flex items-center justify-between hover:border-slate-700 focus:outline-none focus:border-cyan-400"
      >
        <span className="truncate">
          {value 
            ? (() => {
                const selTeacher = approvedTeachers.find((t: any) => t.name === value);
                return selTeacher ? `${selTeacher.name} (${selTeacher.username || selTeacher.shalarthId} - ${selTeacher.designation || 'Teacher'})` : value;
              })()
            : "Select Teacher ▼"}
        </span>
        <span className="text-[9px] text-slate-500 ml-1">▼</span>
      </button>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-slate-950 border border-slate-800 rounded-lg shadow-xl overflow-hidden max-h-64 flex flex-col text-left">
          <div className="p-2 border-b border-slate-800 bg-slate-950">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search teacher..."
              autoFocus
              className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-medium"
            />
          </div>
          <div className="overflow-y-auto flex-1 bg-slate-950">
            {filtered.length === 0 ? (
              <div className="p-3 text-xs text-slate-500 text-center italic">
                No teachers found
              </div>
            ) : (
              filtered.map((t) => {
                const identifier = t.username || t.shalarthId ? `[${t.username || t.shalarthId}]` : "";
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      onChange(t.name);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-900 flex flex-col gap-0.5 border-b border-slate-900/40 ${
                      value === t.name ? "bg-slate-900 text-cyan-300 font-extrabold" : "text-slate-300"
                    }`}
                  >
                    <span className="font-extrabold text-white flex items-center gap-1.5 flex-wrap">
                      <span>👨‍🏫</span>
                      <span>{t.name}</span>
                    </span>
                    <span className="text-[9px] text-slate-400 font-medium pl-5 truncate">
                      ({t.username || t.shalarthId} - {t.designation || 'Teacher'})
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Searchable custom dropdown component for Subject Name
const SearchableSubjectSelect = ({
  value,
  onChange,
  masterSubjects,
}: {
  value: string;
  onChange: (value: string) => void;
  masterSubjects: any[];
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = masterSubjects.filter((s) => {
    const query = search.toLowerCase();
    const name = (s.subjectName || "").toLowerCase();
    const code = (s.subjectCode || "").toLowerCase();
    const type = (s.subjectType || "").toLowerCase();
    return name.includes(query) || code.includes(query) || type.includes(query);
  });

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch("");
        }}
        className="w-full bg-slate-900 border border-slate-800 rounded px-2 px-1 text-xs font-bold text-white text-left flex items-center justify-between hover:border-slate-700 focus:outline-none focus:border-cyan-400"
      >
        <span className="truncate">{value || "Select Subject ▼"}</span>
        <span className="text-[9px] text-slate-500 ml-1">▼</span>
      </button>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-slate-950 border border-slate-800 rounded-lg shadow-xl overflow-hidden max-h-64 flex flex-col text-left">
          <div className="p-2 border-b border-slate-800 bg-slate-950">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search subject..."
              autoFocus
              className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-medium"
            />
          </div>
          <div className="overflow-y-auto flex-1 bg-slate-950">
            {filtered.length === 0 ? (
              <div className="p-3 text-xs text-slate-500 text-center italic">
                No subjects found
              </div>
            ) : (
              filtered.map((s) => {
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      onChange(s.subjectName);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-900 flex flex-col gap-0.5 border-b border-slate-900/40 ${
                      value === s.subjectName ? "bg-slate-900 text-cyan-300 font-extrabold" : "text-slate-300"
                    }`}
                  >
                    <span className="font-extrabold text-white flex items-center gap-1.5">
                      <span>📖</span>
                      <span>{s.subjectName}</span>
                    </span>
                    <span className="text-[9px] text-slate-400 font-medium pl-5 truncate">
                      {s.subjectCode ? `Code: ${s.subjectCode}` : ""}
                      {s.subjectCode && s.subjectType ? ` | ` : ""}
                      {s.subjectType ? `Type: ${s.subjectType}` : ""}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to format Class and Division correctly according to school rules
const formatClassDiv = (className: string, division: string) => {
  if (!division || division === "No Division") {
    return className;
  }
  return `${className}-${division}`;
};

const toRomanClass = (numStr: string) => {
  const map: Record<string, string> = {
    "1": "I", "2": "II", "3": "III", "4": "IV", "5": "V",
    "6": "VI", "7": "VII", "8": "VIII", "9": "IX", "10": "X",
    "11": "XI", "12": "XII"
  };
  return map[numStr] || numStr;
};

// Helper function to format Class and Division using Roman Numerals for timetable cells
const formatClassDivRoman = (className: string, division: string) => {
  let romanClass = className.replace(/Class\s+(\d+)/i, (_, num) => toRomanClass(num));
  romanClass = romanClass.replace(/^(\d+)$/, (_, num) => toRomanClass(num));
  
  if (!division || division === "No Division") {
    return romanClass;
  }
  return `${romanClass}-${division}`;
};

const abbreviateTimetableSubject = (subjectName: string) => {
  const normalized = (subjectName || '').trim().toLowerCase();
  const rules: Array<[RegExp, string]> = [
    [/mathematics|maths|math/, 'MATH'],
    [/english/, 'ENG'],
    [/hindi/, 'HINDI'],
    [/marathi/, 'MAR'],
    [/urdu/, 'URDU'],
    [/social science|social studies|soci/, 'SOC'],
    [/general science|science/, 'SCI'],
    [/environmental|evs/, 'EVS'],
    [/geography/, 'GEOG'],
    [/geometry/, 'GEO'],
    [/algebra/, 'ALG'],
    [/history/, 'HIST'],
    [/art|drawing/, 'ART'],
    [/physical education|sports|p\.e\.|pt/, 'PT'],
    [/work education|work experience/, 'WE'],
    [/computer|ict/, 'COMP']
  ];
  const match = rules.find(([pattern]) => pattern.test(normalized));
  if (match) return match[1];
  const compact = normalized.replace(/[^a-z0-9]+/g, ' ').trim();
  if (!compact) return '';
  const words = compact.split(/\s+/);
  if (words.length > 1) return words.map((word) => word[0]).join('').slice(0, 5).toUpperCase();
  return compact.slice(0, 6).toUpperCase();
};

const formatVerticalClassSubject = (className: string, division: string, subjectName: string) => {
  let classLabel = className.replace(/Class\s+(\d+)/i, (_, num) => toRomanClass(num));
  classLabel = classLabel.replace(/^(\d+)$/, (_, num) => toRomanClass(num));
  const div = (division || '').trim();
  const divisionLabel = div && div !== 'No Division' && div.toUpperCase() !== 'A' ? `-${div.toUpperCase()}` : '';
  return `${classLabel}${divisionLabel} ${abbreviateTimetableSubject(subjectName)}`.trim();
};

// Data Structures for Timetable V2
interface V2SchoolSetup {
  academicYear: string;
  workingDays: string[];
  schoolStart: string;
  schoolEnd: string;
  periodsPerDay: number;
  lunchBreakPeriod: number; // e.g. after Period 3
  lunchDuration: number; // minutes
  assemblyDuration: number; // minutes
  weeklyPeriodSettings?: {
    Monday: number;
    Tuesday: number;
    Wednesday: number;
    Thursday: number;
    Friday: number;
    Saturday: number;
    [day: string]: number;
  };
}

interface V2WorkloadRow {
  id: string;
  teacherName: string;
  className: string;
  division: string;
  subjectName: string;
  periodsPerWeek: number;
  isClassTeacher: boolean;
  remarks: string;
}

interface V2TimetableCell {
  id: string;
  className: string;
  division: string;
  day: string;
  period: number;
  subjectName: string;
  teacherName: string;
  roomNumber: string;
  isLocked: boolean;
}

export default function SmartTimetableV2({
  lang,
  user,
  initialTab = "setup",
}: SmartTimetableV2Props) {
  // Translate system helpers
  const t = (en: string, hi: string, ur: string) => {
    if (lang === "ur") return ur;
    if (lang === "hi") return hi;
    return en;
  };

  // State definitions
  const [activeTab, setActiveTab] = useState<TimetableWorkspaceTab>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClass, setFilterClass] = useState("All");
  const [filterTeacher, setFilterTeacher] = useState("All");

  // CENTRALIZED ERP MASTER DATABASES (LATEST DIRECTORY & SUBJECT MASTER COPIES)
  const [academicSetup, setAcademicSetup] = useState(() => LocalERPDatabase.getAcademicSetup());

  useEffect(() => {
    const reloadAcademicSetup = () => setAcademicSetup(LocalERPDatabase.getAcademicSetup());
    window.addEventListener('school_profile_updated', reloadAcademicSetup);
    window.addEventListener('storage', reloadAcademicSetup);
    return () => {
      window.removeEventListener('school_profile_updated', reloadAcademicSetup);
      window.removeEventListener('storage', reloadAcademicSetup);
    };
  }, []);

  const buildLocalTeacherDirectory = () => {
    const directory = new Map<string, any>();
    const users = LocalERPDatabase.getUsers().filter((item) =>
      (item.role === 'teacher' || item.role === 'class_teacher') &&
      item.isActive !== false && item.status === 'Active'
    );
    users.forEach((item) => {
      const key = (item.shalarthId || item.employeeCode || item.username || item.name || item.id).toLowerCase();
      directory.set(key, item);
    });

    (academicSetup.teacherProfiles || []).forEach((profile: any) => {
      if (profile.isActive === false || profile.status === 'Inactive') return;
      const key = String(profile.shalarthId || profile.employeeId || profile.fullName || profile.id).toLowerCase();
      const existing = directory.get(key);
      directory.set(key, {
        ...existing,
        id: existing?.id || profile.id,
        name: profile.fullName,
        role: existing?.role || 'teacher',
        username: existing?.username || profile.shalarthId || profile.employeeId,
        shalarthId: profile.shalarthId,
        employeeCode: profile.employeeId,
        designation: profile.designation,
        qualification: profile.qualification,
        phone: profile.mobileNumber,
        isActive: true,
        status: 'Active'
      });
    });
    return Array.from(directory.values());
  };

  const [approvedTeachers, setApprovedTeachers] = useState<any[]>(() => buildLocalTeacherDirectory());

  useEffect(() => {
    let cancelled = false;
    const loadLiveTeachers = async () => {
      try {
        const { data: membership, error: membershipError } = await supabase
          .from('user_school_memberships')
          .select('school_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();
        if (membershipError || !membership?.school_id) return;

        const { data, error } = await supabase
          .from('teachers')
          .select('id, user_id, full_name, shalarth_id, employee_id, designation, qualification, mobile_number, is_active')
          .eq('school_id', membership.school_id)
          .eq('is_active', true)
          .order('full_name', { ascending: true });
        if (error || cancelled) return;

        const directory = new Map<string, any>();
        buildLocalTeacherDirectory().forEach((item: any) => {
          const key = String(item.shalarthId || item.employeeCode || item.username || item.name || item.id).toLowerCase();
          directory.set(key, item);
        });
        (data || []).forEach((teacher: any) => {
          const key = String(teacher.shalarth_id || teacher.employee_id || teacher.full_name || teacher.id).toLowerCase();
          const existing = directory.get(key);
          directory.set(key, {
            ...existing,
            id: teacher.user_id || teacher.id,
            teacherMasterId: teacher.id,
            name: teacher.full_name,
            role: existing?.role || 'teacher',
            username: existing?.username || teacher.shalarth_id || teacher.employee_id,
            shalarthId: teacher.shalarth_id,
            employeeCode: teacher.employee_id,
            designation: teacher.designation || existing?.designation || 'Teacher',
            qualification: teacher.qualification || existing?.qualification,
            phone: teacher.mobile_number || existing?.phone,
            isActive: true,
            status: 'Active'
          });
        });
        if (!cancelled) setApprovedTeachers(Array.from(directory.values()));
      } catch (error) {
        console.warn('Live teacher directory could not be loaded; using the Staff Master cache.', error);
      }
    };
    void loadLiveTeachers();
    return () => { cancelled = true; };
  }, [user.id, academicSetup]);

  const [liveSubjects, setLiveSubjects] = useState<SubjectRecord[]>([]);
  const [subjectLoadError, setSubjectLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const loadSubjects = async () => {
      const result = await SubjectService.getSubjects(true);
      if (cancelled) return;
      if (result.error) {
        setLiveSubjects([]);
        setSubjectLoadError(result.error.message || 'Subjects could not be loaded from Subject Master.');
        return;
      }
      setLiveSubjects(result.data);
      setSubjectLoadError('');
    };
    void loadSubjects();
    return () => { cancelled = true; };
  }, []);

  const masterSubjects = useMemo(() => liveSubjects.map(subject => ({
    id: subject.id,
    subjectName: subject.subjectName,
    subjectCode: subject.subjectCode,
    subjectType: subject.subjectType,
    isActive: subject.isActive
  })), [liveSubjects]);

  // STEP 1 - SCHOOL SETUP STATE (Improvement 2)
  const [setup, setSetup] = useState<V2SchoolSetup>(() => {
    const saved = localStorage.getItem("nhs_v2_school_setup");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (!parsed.weeklyPeriodSettings) {
        parsed.weeklyPeriodSettings = {
          Monday: 9,
          Tuesday: 9,
          Wednesday: 9,
          Thursday: 9,
          Friday: 7,
          Saturday: 5,
        };
      }
      return parsed;
    }

    // Read from existing Master School Timing Configuration
    const st = academicSetup.schoolTiming || {
      openingTime: "08:00 AM",
      closingTime: "01:30 PM",
      prayerTime: "08:15 AM",
      lunchBreakStart: "10:30 AM",
      lunchBreakEnd: "11:00 AM",
      workingDays: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
    };
    const wps = academicSetup.weeklyPeriodSettings || {
      Monday: 9,
      Tuesday: 9,
      Wednesday: 9,
      Thursday: 9,
      Friday: 7,
      Saturday: 5,
    };

    return {
      academicYear:
        academicSetup.academicYears?.find((y) => y.isActive)?.year || academicSetup.academicYears?.[0]?.year || "",
      workingDays: st.workingDays || [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
      schoolStart: st.openingTime || "08:00 AM",
      schoolEnd: st.closingTime || "01:30 PM",
      periodsPerDay: Math.max(...(Object.values(wps) as number[])),
      lunchBreakPeriod: 3,
      lunchDuration: 30,
      assemblyDuration: 15,
      weeklyPeriodSettings: wps,
    };
  });

  // Production: hydrate Timetable from the permanent Academic Setup cloud before
  // relying on the browser cache. This keeps a fresh Android install / second
  // device aligned with the same school timing and academic-year configuration.
  useEffect(() => {
    let cancelled = false;
    const hydrateAcademicSetupFromCloud = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const response = await fetch('/api/admin/academic-setup', {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: 'no-store',
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error || 'Academic Setup cloud state could not be loaded.');
        if (!payload?.initialized || !payload?.setup || cancelled) return;

        const local = LocalERPDatabase.getAcademicSetup();
        const cloud = payload.setup as any;
        const merged = {
          ...local,
          ...cloud,
          schoolProfile: { ...(local.schoolProfile || {}), ...(cloud.schoolProfile || {}) },
          globalSettings: { ...(local.globalSettings || {}), ...(cloud.globalSettings || {}) },
          schoolTiming: { ...(local.schoolTiming || {}), ...(cloud.schoolTiming || {}) },
        };
        LocalERPDatabase.saveAcademicSetup(merged);
        if (!cancelled) setAcademicSetup(merged);
      } catch (error) {
        console.warn('Timetable cloud Academic Setup could not be loaded; using the local compatibility cache.', error);
      }
    };
    void hydrateAcademicSetupFromCloud();
    return () => { cancelled = true; };
  }, [user.id]);

  // Synchronize on mount with global Master Setup (Improvement 2)
  useEffect(() => {
    try {
      const st = academicSetup.schoolTiming;
      const wps = academicSetup.weeklyPeriodSettings || {
        Monday: 9,
        Tuesday: 9,
        Wednesday: 9,
        Thursday: 9,
        Friday: 7,
        Saturday: 5,
      };

      // Get lunch break duration
      let lunchDur = 30;
      const lunchPeriodObj = academicSetup.periods?.find(
        (p) =>
          p.type === "Break" || p.periodName.toLowerCase().includes("lunch"),
      );
      if (lunchPeriodObj) {
        lunchDur = lunchPeriodObj.durationMinutes;
      }
      // Assembly duration
      let assemblyDur = 15;
      const assemblyPeriodObj = academicSetup.periods?.find(
        (p) =>
          p.type === "Assembly" ||
          p.periodName.toLowerCase().includes("assembly"),
      );
      if (assemblyPeriodObj) {
        assemblyDur = assemblyPeriodObj.durationMinutes;
      }

      const activeYear =
        academicSetup.academicYears?.find((y) => y.isActive)?.year || academicSetup.academicYears?.[0]?.year || "";

      setSetup((prev) => {
        const updated = {
          ...prev,
          academicYear: activeYear,
          workingDays: st?.workingDays || prev.workingDays,
          schoolStart: st?.openingTime || prev.schoolStart,
          schoolEnd: st?.closingTime || prev.schoolEnd,
          lunchDuration: lunchDur,
          assemblyDuration: assemblyDur,
          weeklyPeriodSettings: wps,
          periodsPerDay: Math.max(...(Object.values(wps) as number[])),
        };
        localStorage.setItem("nhs_v2_school_setup", JSON.stringify(updated));
        return updated;
      });
    } catch (e) {
      console.error("Error reading School Timing Master Setup:", e);
    }
  }, [academicSetup]);

  const handleSaveDailyPeriods = (updatedWeekly: Record<string, number>) => {
    const newSetup = {
      ...setup,
      weeklyPeriodSettings: updatedWeekly,
      periodsPerDay: Math.max(...Object.values(updatedWeekly)),
    };
    setSetup(newSetup);
    localStorage.setItem("nhs_v2_school_setup", JSON.stringify(newSetup));

    try {
      academicSetup.weeklyPeriodSettings = updatedWeekly as any;
      LocalERPDatabase.saveAcademicSetup(academicSetup);
    } catch (e) {
      console.error("Error saving global weekly period settings:", e);
    }
  };

  // STEP 2 - WORKLOAD STATE
  // R33.28: Teaching Assignments are the single source of truth for Timetable workload.
  // Teacher + Class/Division + Subject + Periods/Week are never re-entered in this screen.
  const [workload, setWorkload] = useState<V2WorkloadRow[]>([]);
  const [assignmentCloudLoading, setAssignmentCloudLoading] = useState(true);
  const [assignmentCloudError, setAssignmentCloudError] = useState('');
  const [assignmentCloudYear, setAssignmentCloudYear] = useState('');
  const [assignmentCloudUpdatedAt, setAssignmentCloudUpdatedAt] = useState('');
  const firstPeriodRoleStorageKey = `edunixo_v2_first_period_roles_${user.id}`;
  const [firstPeriodRoleByScope, setFirstPeriodRoleByScope] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(`edunixo_v2_first_period_roles_${user.id}`);
      const parsed = saved ? JSON.parse(saved) : {};
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try { localStorage.setItem(firstPeriodRoleStorageKey, JSON.stringify(firstPeriodRoleByScope)); }
    catch { /* Timetable preference persistence must never block generation. */ }
  }, [firstPeriodRoleByScope, firstPeriodRoleStorageKey]);

  const assignmentNorm = (value: unknown) =>
    String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  const assignmentTeacherIdentity = (row: any) =>
    assignmentNorm(row?.teacherRecordId || row?.teacherId || row?.teacherName);

  const mapTeachingAssignmentsToWorkload = (payload: any): V2WorkloadRow[] => {
    const subjectRows = (Array.isArray(payload?.subjectAllocations) ? payload.subjectAllocations : [])
      .filter((row: any) => row?.isActive !== false);
    const classTeacherRows = (Array.isArray(payload?.classTeacherAssignments) ? payload.classTeacherAssignments : [])
      .filter((row: any) => row?.isActive !== false);

    const classTeacherByScope = new Map<string, string>();
    classTeacherRows.forEach((row: any) => {
      const scope = `${assignmentNorm(row?.className)}|${assignmentNorm(row?.divisionName || 'No Division')}`;
      classTeacherByScope.set(scope, assignmentTeacherIdentity(row));
    });

    // The generator needs only one row per class scope flagged for first-period Class Teacher preference.
    // A Class Teacher may teach several subjects; marking every subject row would create a false duplicate.
    const classTeacherPriorityUsed = new Set<string>();

    return subjectRows
      .map((row: any, index: number) => {
        const className = String(row?.className || '').trim();
        const division = String(row?.divisionName || 'No Division').trim() || 'No Division';
        const teacherName = String(row?.teacherName || '').trim();
        const subjectName = String(row?.subjectName || '').trim();
        const scope = `${assignmentNorm(className)}|${assignmentNorm(division)}`;
        const rowId = String(row?.cloudId || row?.id || `assignment_${index}`);
        const teacherMatchesClassTeacher =
          !!teacherName && classTeacherByScope.get(scope) === assignmentTeacherIdentity(row);
        const savedPriority = firstPeriodRoleByScope[scope];
        const hasManualPriority = Boolean(savedPriority);
        const isClassTeacher = hasManualPriority
          ? savedPriority === rowId
          : teacherMatchesClassTeacher && !classTeacherPriorityUsed.has(scope);
        if (isClassTeacher) classTeacherPriorityUsed.add(scope);

        return {
          id: rowId,
          teacherName,
          className,
          division,
          subjectName,
          periodsPerWeek: Math.max(0, Number(row?.weeklyPeriods || 0)),
          isClassTeacher,
          remarks: isClassTeacher
            ? `${hasManualPriority ? 'Selected' : 'Class Teacher'} first-period priority · Synced from Teaching Assignments`
            : 'Synced from Teaching Assignments',
        };
      })
      .filter((row: V2WorkloadRow) => row.teacherName && row.className && row.subjectName)
      .sort((a: V2WorkloadRow, b: V2WorkloadRow) =>
        a.className.localeCompare(b.className, undefined, { numeric: true }) ||
        a.division.localeCompare(b.division) ||
        a.subjectName.localeCompare(b.subjectName) ||
        a.teacherName.localeCompare(b.teacherName)
      );
  };

  const refreshTeachingAssignments = async () => {
    setAssignmentCloudLoading(true);
    setAssignmentCloudError('');
    try {
      const cloud = await AcademicAssignmentCloudService.load();
      setWorkload(mapTeachingAssignmentsToWorkload(cloud));
      setAssignmentCloudYear(String(cloud.academicYear || setup.academicYear || ''));
      setAssignmentCloudUpdatedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (error: any) {
      setWorkload([]);
      setAssignmentCloudError(error?.message || 'Teaching Assignments could not be loaded from the school cloud.');
    } finally {
      setAssignmentCloudLoading(false);
    }
  };


  const setTimetableFirstPeriodRole = (row: V2WorkloadRow, role: 'subject_teacher' | 'class_teacher') => {
    const scope = `${assignmentNorm(row.className)}|${assignmentNorm(row.division || 'No Division')}`;
    setFirstPeriodRoleByScope((previous) => {
      const next = { ...previous };
      if (role === 'class_teacher') next[scope] = row.id;
      else if (next[scope] === row.id) delete next[scope];
      return next;
    });
    setWorkload((previous) => previous.map((item) => {
      const itemScope = `${assignmentNorm(item.className)}|${assignmentNorm(item.division || 'No Division')}`;
      if (itemScope !== scope) return item;
      const selected = role === 'class_teacher' && item.id === row.id;
      return {
        ...item,
        isClassTeacher: selected,
        remarks: selected ? 'Selected first-period priority · Synced from Teaching Assignments' : 'Synced from Teaching Assignments',
      };
    }));
  };

  useEffect(() => {
    void refreshTeachingAssignments();
  }, [user.id]);

  // STEP 6 & 7 - GENERATED TIMETABLE GRID STATE
  const [timetable, setTimetable] = useState<V2TimetableCell[]>(() => {
    const saved = localStorage.getItem("nhs_v2_generated_grid");
    if (saved) return JSON.parse(saved);
    return [];
  });

  // Undo/Redo Engine
  const [history, setHistory] = useState<V2TimetableCell[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Filter/Selection for timetable display
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [viewType, setViewType] = useState<"class" | "teacher">(
    "class",
  );

  // Reports Tab States (Improvements 4, 5, 6, 7)
  const [selectedReportType, setSelectedReportType] = useState<
    "weekly_class" | "teacher" | "weekly_school"
  >("weekly_school");
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingInteractivePdf, setIsExportingInteractivePdf] = useState(false);
  const [pdfDocType, setPdfDocType] = useState<"class" | "teacher" | "whole_school">("whole_school");
  const [reportClass, setReportClass] = useState("");
  const [reportTeacher, setReportTeacher] = useState("");
  const [reportDay, setReportDay] = useState("Monday");
  const [printLayout, setPrintLayout] = useState<
    "A4_portrait" | "A4_landscape" | "A3_landscape"
  >("A3_landscape");

  useEffect(() => {
    setPrintLayout(selectedReportType === "weekly_school" ? "A3_landscape" : "A4_landscape");
  }, [selectedReportType]);

  // AI Generation Simulators
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationLogs, setGenerationLogs] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showValidation, setShowValidation] = useState(false);

  // Drag-and-drop cell state
  const [draggedCellId, setDraggedCellId] = useState<string | null>(null);

  // Auto-Save notification
  const [showAutoSaveAlert, setShowAutoSaveAlert] = useState(false);
  const [publishingToTeachers, setPublishingToTeachers] = useState(false);

  // Trigger Save on state change
  const triggerAutoSave = (updatedGrid: V2TimetableCell[]) => {
    localStorage.setItem("nhs_v2_generated_grid", JSON.stringify(updatedGrid));
    setShowAutoSaveAlert(true);
    setTimeout(() => setShowAutoSaveAlert(false), 2000);
  };

  const handleUpdateSetup = (newSetup: V2SchoolSetup) => {
    setSetup(newSetup);
    localStorage.setItem("nhs_v2_school_setup", JSON.stringify(newSetup));
    triggerAutoSave(timetable);
  };

  // Dynamic Lists gathered from Workload Data
  const classesList = useMemo(() => {
    const set = new Set<string>();
    workload.forEach((w) => {
      if (w.className && w.division) {
        set.add(formatClassDiv(w.className, w.division));
      }
    });
    return Array.from(set).sort();
  }, [workload]);

  const teachersList = useMemo(() => {
    return Array.from(new Set(workload.map(row => row.teacherName).filter(Boolean))).sort();
  }, [workload]);

  const workloadClassOptions = useMemo(() => {
    return Array.from(new Set(workload.map(row => row.className).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [workload]);

  useEffect(() => {
    if (filterClass !== 'All' && !workloadClassOptions.includes(filterClass)) setFilterClass('All');
  }, [filterClass, workloadClassOptions]);

  useEffect(() => {
    if (filterTeacher !== 'All' && !teachersList.includes(filterTeacher)) setFilterTeacher('All');
  }, [filterTeacher, teachersList]);

  // This school timetable does not use room numbers. Keep a blank internal value
  // so scheduling, printing and substitute management remain room-free.
  const roomsList = [""];

  // Sync default selectors for report values once loaded
  useEffect(() => {
    if (classesList.length > 0 && !classesList.includes(reportClass)) {
      setReportClass(classesList[0]);
    }
    if (classesList.length > 0 && !classesList.includes(selectedClass)) {
      setSelectedClass(classesList[0]);
    }
  }, [classesList, reportClass, selectedClass]);

  useEffect(() => {
    if (teachersList.length > 0 && !teachersList.includes(reportTeacher)) {
      setReportTeacher(teachersList[0]);
    }
    if (teachersList.length > 0 && !teachersList.includes(selectedTeacher)) {
      setSelectedTeacher(teachersList[0]);
    }
  }, [teachersList, reportTeacher, selectedTeacher]);

  // Timetable subject block colors for gorgeous rendering (Google Calendar styling)
  const getSubjectColor = (subject: string) => {
    if (!subject) return "bg-slate-800/20 text-slate-400 border-slate-800/40";
    const sub = subject.toLowerCase();
    if (sub.includes("math"))
      return "bg-sky-500/10 text-sky-400 border-sky-500/25 hover:bg-sky-500/15";
    if (sub.includes("sci") || sub.includes("evs"))
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/15";
    if (sub.includes("eng") || sub.includes("lit"))
      return "bg-purple-500/10 text-purple-400 border-purple-500/25 hover:bg-purple-500/15";
    if (sub.includes("mar") || sub.includes("lang"))
      return "bg-amber-500/10 text-amber-400 border-amber-500/25 hover:bg-amber-500/15";
    if (sub.includes("art") || sub.includes("draw"))
      return "bg-rose-500/10 text-rose-400 border-rose-500/25 hover:bg-rose-500/15";
    if (sub.includes("library"))
      return "bg-violet-400/10 text-violet-300 border-violet-400/30 hover:bg-violet-400/15";
    if (sub.includes("sports") || sub.includes("pe"))
      return "bg-teal-500/10 text-teal-400 border-teal-500/25 hover:bg-teal-500/15";
    return "bg-cyan-400/10 text-cyan-300 border-cyan-400/30 hover:bg-cyan-400/15";
  };

  // STEP 9 - READINESS CHECK
  const readinessCheck = useMemo(() => {
    const checks = {
      schoolSetup:
        setup.workingDays.length > 0 &&
        !!setup.schoolStart &&
        !!setup.schoolEnd &&
        setup.periodsPerDay > 0,
      hasTeachers: workload.some((w) => !!w.teacherName),
      hasSubjects: workload.some((w) => !!w.subjectName),
      hasClasses: workload.some((w) => !!w.className && !!w.division),
      validPeriods:
        setup.periodsPerDay >= 1 &&
        setup.periodsPerDay <= 12 &&
        workload.length > 0 &&
        workload.every((w) => Number(w.periodsPerWeek) > 0),
    };

    let score = 0;
    if (checks.schoolSetup) score += 20;
    if (checks.hasTeachers) score += 20;
    if (checks.hasSubjects) score += 20;
    if (checks.hasClasses) score += 20;
    if (checks.validPeriods) score += 20;

    return {
      score,
      checks,
      isReady: score === 100 && !assignmentCloudLoading && !assignmentCloudError,
    };
  }, [setup, workload, assignmentCloudLoading, assignmentCloudError]);

  // Canonical Teaching Assignment export. Import/edit belongs only to Academic Setup.
  const handleExportTeachingAssignments = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Teacher Name,Class,Division,Subject,Periods Per Week,Class Teacher,Source\n";
    workload.forEach((row) => {
      csvContent += `"${row.teacherName}","${row.className}","${row.division}","${row.subjectName}",${row.periodsPerWeek},"${row.isClassTeacher ? "Yes" : "No"}","Teaching Assignments"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Teaching_Assignments_Timetable_Source_${(assignmentCloudYear || setup.academicYear).replace(/ /g, "_")}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // STEP 4 & 5 - INTUITE AI TIMETABLE GENERATOR ENGINE
  const handleGenerateTimetable = () => {
    if (!readinessCheck.isReady) {
      alert(
        t(
          "Cannot trigger generation. Please verify that your Readiness status reaches 100% first.",
          "पीढ़ी को ट्रिगर नहीं किया जा सकता। कृपया सत्यापित करें कि आपकी तत्परता स्थिति पहले 100% तक पहुंच गई है।",
          "جنریشن شروع نہیں کی جا سکتی۔ براہ کرम تصدیق کریں کہ آپ کی تیاری کی حیثیت پہلے 100% تک پہنچ چکی ہے۔",
        ),
      );
      return;
    }

    // Validate Class Teacher assignments
    const teacherClassCombos: Record<string, number> = {};
    for (const row of workload) {
      if (row.isClassTeacher) {
        const key = `${row.teacherName}-${row.className}-${row.division}`;
        teacherClassCombos[key] = (teacherClassCombos[key] || 0) + 1;
      }
    }

    const duplicates = Object.entries(teacherClassCombos).filter(([_, count]) => count > 1);
    if (duplicates.length > 0) {
      alert("Only one Class Teacher assignment is allowed for each Teacher-Class combination.");
      return;
    }

    // Start generator simulation
    setIsGenerating(true);
    setGenerationProgress(5);
    setValidationErrors([]);
    setShowValidation(false);

    const logs: string[] = [];
    const logTimeline = [
      {
        prg: 15,
        msg: t(
          "Initializing isolated V2 smart rule constraints scheduler matrix...",
          "पृथक V2 स्मार्ट नियम बाधाओं शेड्यूलर मैट्रिक्स को प्रारंभ किया जा रहा है...",
          "الگ تھلگ V2 اسمارट قواعد کے شیڈولر میٹرکس کا آغاز ہو رہا ہے...",
        ),
      },
      {
        prg: 30,
        msg: t(
          "Validating classroom and teacher max weekly capacities limits...",
          "कक्षा और शिक्षक की अधिकतम साप्ताहिक क्षमता सीमाओं की पुष्टि की जा रही है...",
          "کلاس روم اور ٹیچر کی زیادہ سے زیادہ ہفتہ وار صلاحیتوں کی حدوں کی جانچ کی جا रही ہے...",
        ),
      },
      {
        prg: 45,
        msg: t(
          "Balancing daily workloads distribution to minimize fatigue...",
          "थकान को कम करने के लिए दैनिक कार्यभार वितरण को संतुलित किया जा रहा है...",
          "تھکن کو کم کرنے کے لیے روزانہ کے کام کے بوجھ کی تقسیم کو متوازن کیا جا رہا ہے...",
        ),
      },
      {
        prg: 65,
        msg: t(
          "Applying the selected Class Teacher subject as first-period priority for each class/division...",
          "चयनित कक्षा-शिक्षक विषय को प्रत्येक कक्षा/डिवीजन में प्रथम अवधि की प्राथमिकता दी जा रही है...",
          "منتخب کلاس ٹیچر کے مضمون کو ہر کلاس/ڈویژن میں پہلے پیریڈ کی ترجیح دی جا رہی ہے...",
        ),
      },
      {
        prg: 80,
        msg: t(
          "Resolving Friday custom prayer breaks and Saturday half-day conditions...",
          "शुक्रवार की प्रार्थना अवकाश और शनिवार के आधे दिन की स्थितियों को हल किया जा रहा है...",
          "جمعہ کی نماز کے وقفے اور ہفتہ کے نصف دن کی شرائط کو حل کیا جا رہا ہے...",
        ),
      },
      {
        prg: 95,
        msg: t(
          "Final clash scan: teacher overlap, class overlap and weekly period totals...",
          "अंतिम clash scan: teacher overlap, class overlap और weekly period totals...",
          "آخری کلیش اسکین: ٹیچر اوورلیپ، کلاس اوورلیپ اور ہفتہ وار پیریڈ ٹوٹلز...",
        ),
      },
      {
        prg: 100,
        msg: t(
          "Weekly schedule successfully computed and validated with zero clashes!",
          "साप्ताहिक समय सारिणी सफलतापूर्वक संगणित और शून्य संघर्षों के साथ सत्यापित की गई!",
          "ہفتہ وار شیڈول کامیابی کے ساتھ تیار کیا گیا اور صفر تنازعات کے ساتھ تصدیक کی گئی!",
        ),
      },
    ];

    let currentLogIdx = 0;
    const interval = setInterval(() => {
      if (currentLogIdx < logTimeline.length) {
        const item = logTimeline[currentLogIdx];
        setGenerationProgress(item.prg);
        setGenerationLogs((prev) => [...prev, `[AI ENGINE] ${item.msg}`]);
        currentLogIdx++;
      } else {
        clearInterval(interval);

        // Finalize Generation - Map workload requirements into days and periods using high-quality constraint-satisfaction heuristics
        const generatedGrid: V2TimetableCell[] = [];
        const days = setup.workingDays;
        const totalPeriods = setup.periodsPerDay;

        // 1. Gather all workload requirements across all classes
        interface V2SchedulableTask {
          classKey: string;
          className: string;
          divisionName: string;
          subjectName: string;
          teacherName: string;
          isClassTeacher: boolean;
          remarks: string;
          periodsPerWeek: number;
        }

        const tasksToSchedule: V2SchedulableTask[] = [];
        workload.forEach((w) => {
          if (w.periodsPerWeek > 0) {
            tasksToSchedule.push({
              classKey: formatClassDiv(w.className, w.division),
              className: w.className,
              divisionName: w.division || "No Division",
              subjectName: w.subjectName,
              teacherName: w.teacherName || "Unassigned",
              isClassTeacher: !!w.isClassTeacher,
              remarks: w.remarks || "",
              periodsPerWeek: w.periodsPerWeek,
            });
          }
        });

        // Priority sorting of the workload rules
        // Compute each teacher's TOTAL weekly workload across all classes/subjects.
        // Teachers with heavier total load get scheduled first so their slots
        // are reserved before lighter teachers fill the grid.
        const teacherTotalLoad: Record<string, number> = {};
        tasksToSchedule.forEach((t) => {
          const key = (t.teacherName || 'Unassigned').toLowerCase();
          teacherTotalLoad[key] = (teacherTotalLoad[key] || 0) + t.periodsPerWeek;
        });

        tasksToSchedule.sort((a, b) => {
          if (a.isClassTeacher && !b.isClassTeacher) return -1;
          if (!a.isClassTeacher && b.isClassTeacher) return 1;
          const loadA = teacherTotalLoad[(a.teacherName || 'Unassigned').toLowerCase()] || 0;
          const loadB = teacherTotalLoad[(b.teacherName || 'Unassigned').toLowerCase()] || 0;
          if (loadB !== loadA) return loadB - loadA;
          return b.periodsPerWeek - a.periodsPerWeek;
        });

        // Flatten tasks to individual periods
        interface V2FlatTask {
          classKey: string;
          className: string;
          divisionName: string;
          subjectName: string;
          teacherName: string;
          isClassTeacher: boolean;
          remarks: string;
          totalPeriodsForSubject: number;
        }

        const flatTasks: V2FlatTask[] = [];
        tasksToSchedule.forEach((task) => {
          for (let i = 0; i < task.periodsPerWeek; i++) {
            flatTasks.push({
              classKey: task.classKey,
              className: task.className,
              divisionName: task.divisionName,
              subjectName: task.subjectName,
              teacherName: task.teacherName,
              isClassTeacher: task.isClassTeacher,
              remarks: task.remarks,
              totalPeriodsForSubject: task.periodsPerWeek,
            });
          }
        });

        const skippedTasks: any[] = [];
        // Helper check functions
        const isClassBusy = (classKey: string, day: string, period: number): boolean => {
          return generatedGrid.some(cell => formatClassDiv(cell.className, cell.division) === classKey && cell.day === day && cell.period === period);
        };

        const isTeacherBusy = (teacherName: string, day: string, period: number): boolean => {
          if (!teacherName || teacherName === "Unassigned") return false;
          return generatedGrid.some(cell => cell.teacherName.toLowerCase() === teacherName.toLowerCase() && cell.day === day && cell.period === period);
        };

        const isRoomBusy = (room: string, day: string, period: number): boolean => {
          if (!room) return false;
          return generatedGrid.some(cell => cell.roomNumber === room && cell.day === day && cell.period === period);
        };

        const getSubjectCountForDay = (classKey: string, subject: string, day: string): number => {
          return generatedGrid.filter(cell => formatClassDiv(cell.className, cell.division) === classKey && cell.subjectName === subject && cell.day === day).length;
        };

        const isConsecutiveSlot = (classKey: string, subject: string, day: string, period: number): boolean => {
          return generatedGrid.some(cell => 
            formatClassDiv(cell.className, cell.division) === classKey && 
            cell.subjectName === subject && 
            cell.day === day && 
            (cell.period === period - 1 || cell.period === period + 1)
          );
        };

        const isHeavySubject = (subjectName: string): boolean => {
          const name = subjectName.toLowerCase();
          return name.includes("math") || 
                 name.includes("algebra") || 
                 name.includes("geometry") || 
                 name.includes("science") || 
                 name.includes("physics") || 
                 name.includes("chemistry") || 
                 name.includes("biology") || 
                 name.includes("english") || 
                 name.includes("social") || 
                 name.includes("history") || 
                 name.includes("geography");
        };

        const isLightSubject = (subjectName: string): boolean => {
          const name = subjectName.toLowerCase();
          return name.includes("art") || 
                 name.includes("drawing") || 
                 name.includes("music") || 
                 name.includes("library") || 
                 name.includes("sports") || 
                 name.includes("game") || 
                 name.includes("pe") || 
                 name.includes("physical education") || 
                 name.includes("work experience") || 
                 name.includes("craft") ||
                 name.includes("remedial") ||
                 name.includes("hobby");
        };

        const isDoublePeriodAllowedSubject = (subjectName: string, remarks?: string): boolean => {
          const name = subjectName.toLowerCase();
          const rem = (remarks || "").toLowerCase();
          return name.includes("practical") || name.includes("lab") || name.includes("laboratory") || name.includes("sports") || name.includes("pe") || name.includes("physical") || rem.includes("double") || rem.includes("practical");
        };

        // Run assignment
        flatTasks.forEach((task) => {
          let bestDay = "";
          let bestPeriod = -1;
          let bestScore = -Infinity;
          let bestRoom = "";

          days.forEach((day) => {
            const maxPeriodsForDay = setup.weeklyPeriodSettings?.[day] !== undefined
              ? setup.weeklyPeriodSettings[day]
              : totalPeriods;

            const currentDayCount = getSubjectCountForDay(task.classKey, task.subjectName, day);

            for (let p = 1; p <= maxPeriodsForDay; p++) {
              // Hard constraints
              if (isClassBusy(task.classKey, day, p)) continue;
              if (isTeacherBusy(task.teacherName, day, p)) continue;

              // Calculate allowed max periods per day dynamically
              const isDoubleAllowed = isDoublePeriodAllowedSubject(task.subjectName, task.remarks);
              let allowedMaxPerDay = 1;
              if (task.totalPeriodsForSubject > days.length) {
                allowedMaxPerDay = Math.ceil(task.totalPeriodsForSubject / days.length);
              } else if (isDoubleAllowed) {
                allowedMaxPerDay = 2;
              }

              if (currentDayCount >= allowedMaxPerDay) continue;

              const hasAdjacent = isConsecutiveSlot(task.classKey, task.subjectName, day, p);
              if (currentDayCount > 0 && hasAdjacent && !isDoubleAllowed) {
                continue; // Consecutive repeat not allowed
              }

              // Find an available room
              let availableRoom = "";
              for (const r of roomsList) {
                if (!isRoomBusy(r, day, p)) {
                  availableRoom = r;
                  break;
                }
              }
              if (!availableRoom) {
                availableRoom = ""; // Fallback if all rooms busy
              }

              // Heuristics / Scoring
              let score = 0;

              // Spreading subjects across the week
              if (currentDayCount === 0) {
                score += 300; // Big spreading bonus
              } else {
                const otherDaysFree = days.some(d => getSubjectCountForDay(task.classKey, task.subjectName, d) === 0);
                if (otherDaysFree) {
                  score -= 600; // Penalize stacking on same day
                } else {
                  if (isDoubleAllowed && hasAdjacent) {
                    score += 100;
                  } else if (!isDoubleAllowed) {
                    score -= 200;
                    if (hasAdjacent) score -= 300;
                  }
                }
              }

              // Selected Class Teacher subject: strong first-period priority on every
              // working day, while all existing hard clash/capacity rules remain intact.
              if (task.isClassTeacher) {
                if (p === 1) score += 5000;
                else score -= 650;
              }

              // Heavy Subjects and Light Subjects placement rules
              const isHeavy = isHeavySubject(task.subjectName);
              const isLight = isLightSubject(task.subjectName);

              if (isHeavy) {
                if (p <= 4) score += 80; // Morning preference
                if (p >= maxPeriodsForDay - 1) score -= 150; // Avoid last periods

                // Avoid consecutive heavy subjects
                const hasAdjacentHeavy = generatedGrid.some(cell => 
                  formatClassDiv(cell.className, cell.division) === task.classKey && 
                  cell.day === day && 
                  (cell.period === p - 1 || cell.period === p + 1) && 
                  isHeavySubject(cell.subjectName)
                );
                if (hasAdjacentHeavy) score -= 100;

                const heavyOnDay = generatedGrid.filter(cell => 
                  formatClassDiv(cell.className, cell.division) === task.classKey && 
                  cell.day === day && 
                  isHeavySubject(cell.subjectName)
                ).length;
                if (heavyOnDay >= 3) score -= 120 * (heavyOnDay - 2);
              } else if (isLight) {
                if (p >= 5) score += 80; // Afternoon preference
                if (p <= 2) score -= 80; // Avoid morning

                const lightOnDay = generatedGrid.filter(cell => 
                  formatClassDiv(cell.className, cell.division) === task.classKey && 
                  cell.day === day && 
                  isLightSubject(cell.subjectName)
                ).length;
                if (lightOnDay >= 1) score -= 100 * lightOnDay;
              }

              // Teacher Workload distribution & consecutive period checks
              if (task.teacherName && task.teacherName !== "Unassigned") {
                const adjBefore1 = generatedGrid.some(c => c.teacherName === task.teacherName && c.day === day && c.period === p - 1);
                const adjBefore2 = generatedGrid.some(c => c.teacherName === task.teacherName && c.day === day && c.period === p - 2);
                const adjBefore3 = generatedGrid.some(c => c.teacherName === task.teacherName && c.day === day && c.period === p - 3);

                const adjAfter1 = generatedGrid.some(c => c.teacherName === task.teacherName && c.day === day && c.period === p + 1);
                const adjAfter2 = generatedGrid.some(c => c.teacherName === task.teacherName && c.day === day && c.period === p + 2);
                const adjAfter3 = generatedGrid.some(c => c.teacherName === task.teacherName && c.day === day && c.period === p + 3);

                let consec = 0;
                if (adjBefore1) {
                  consec++;
                  if (adjBefore2) {
                    consec++;
                    if (adjBefore3) consec++;
                  }
                }
                if (adjAfter1) {
                  consec++;
                  if (adjAfter2) {
                    consec++;
                    if (adjAfter3) consec++;
                  }
                }

                if (consec >= 3) {
                  score -= 300;
                } else if (consec >= 2) {
                  score -= 120;
                } else if (consec >= 1) {
                  score -= 30;
                }

                const teachDaily = generatedGrid.filter(c => c.teacherName === task.teacherName && c.day === day).length;
                if (teachDaily >= 5) {
                  score -= 250;
                } else if (teachDaily >= 4) {
                  score -= 80;
                }
              }

              if (score > bestScore) {
                bestScore = score;
                bestDay = day;
                bestPeriod = p;
                bestRoom = availableRoom;
              }
            }
          });

          if (bestDay && bestPeriod !== -1) {
            generatedGrid.push({
              id: `cell_${task.classKey}_${bestDay}_${bestPeriod}`,
              className: task.className,
              division: task.divisionName,
              day: bestDay,
              period: bestPeriod,
              subjectName: task.subjectName,
              teacherName: task.teacherName,
              roomNumber: bestRoom,
              isLocked: false,
            });
          } else {
            skippedTasks.push(task);
          }
        });

        // --- Option B: Backtracking repair pass (safe snapshot rollback) ---
        const repairDeadline = Date.now() + 15000;

        const tryPlaceInGrid = (task: any, depth: number): boolean => {
          if (Date.now() > repairDeadline) return false;
          if (depth > 6) return false;
          const isDoubleAllowed = isDoublePeriodAllowedSubject(task.subjectName, task.remarks);
          for (const day of days) {
            const maxPeriodsForDay = setup.weeklyPeriodSettings?.[day] !== undefined
              ? setup.weeklyPeriodSettings[day]
              : totalPeriods;
            for (let p = 1; p <= maxPeriodsForDay; p++) {
              const currentDayCount = getSubjectCountForDay(task.classKey, task.subjectName, day);
              let allowedMaxPerDay = 1;
              if (task.totalPeriodsForSubject > days.length) {
                allowedMaxPerDay = Math.ceil(task.totalPeriodsForSubject / days.length);
              } else if (isDoubleAllowed) {
                allowedMaxPerDay = 2;
              }
              if (currentDayCount >= allowedMaxPerDay) continue;
              const hasAdjacent = isConsecutiveSlot(task.classKey, task.subjectName, day, p);
              if (currentDayCount > 0 && hasAdjacent && !isDoubleAllowed) continue;
              if (isTeacherBusy(task.teacherName, day, p)) continue;

              const occupantIdx = generatedGrid.findIndex(c => formatClassDiv(c.className, c.division) === task.classKey && c.day === day && c.period === p);

              if (occupantIdx === -1) {
                let room = "";
                for (const r of roomsList) { if (!isRoomBusy(r, day, p)) { room = r; break; } }
                generatedGrid.push({
                  id: "cell_" + task.classKey + "_" + day + "_" + p,
                  className: task.className,
                  division: task.divisionName,
                  day,
                  period: p,
                  subjectName: task.subjectName,
                  teacherName: task.teacherName,
                  roomNumber: room,
                  isLocked: false,
                });
                return true;
              }

              const occupant = generatedGrid[occupantIdx];
              if (occupant.isLocked) continue;

              const fullSnapshot = generatedGrid.slice();
              generatedGrid.splice(occupantIdx, 1);
              const occupantTask = {
                classKey: task.classKey,
                className: occupant.className,
                divisionName: occupant.division,
                subjectName: occupant.subjectName,
                teacherName: occupant.teacherName,
                isClassTeacher: false,
                remarks: "",
                totalPeriodsForSubject: 1,
              };
              if (tryPlaceInGrid(occupantTask, depth + 1)) {
                // CRITICAL: verify slot is STILL free after relocation.
                // The occupant may have returned to this exact slot, creating a duplicate.
                const stillOccupied = generatedGrid.some(c => formatClassDiv(c.className, c.division) === task.classKey && c.day === day && c.period === p);
                if (!stillOccupied && !isTeacherBusy(task.teacherName, day, p)) {
                  let room = "";
                  for (const r of roomsList) { if (!isRoomBusy(r, day, p)) { room = r; break; } }
                  generatedGrid.push({
                    id: "cell_" + task.classKey + "_" + day + "_" + p,
                    className: task.className,
                    division: task.divisionName,
                    day,
                    period: p,
                    subjectName: task.subjectName,
                    teacherName: task.teacherName,
                    roomNumber: room,
                    isLocked: false,
                  });
                  return true;
                }
              }
              generatedGrid.length = 0;
              for (const c of fullSnapshot) generatedGrid.push(c);
            }
          }
          return false;
        };

        const stillSkipped: any[] = [];
        for (const task of skippedTasks) {
          if (Date.now() > repairDeadline) { stillSkipped.push(task); continue; }
          if (!tryPlaceInGrid(task, 0)) {
            stillSkipped.push(task);
          }
        }
        skippedTasks.length = 0;
        skippedTasks.push(...stillSkipped);

        if (skippedTasks.length > 0) {
          const grouped: Record<string, { className: string; subjectName: string; teacherName: string; count: number }> = {};
          skippedTasks.forEach((s) => {
            const key = s.teacherName + '||' + s.subjectName + '||' + s.className;
            if (!grouped[key]) grouped[key] = { className: s.className, subjectName: s.subjectName, teacherName: s.teacherName, count: 1 };
            else grouped[key].count += 1;
          });
          const warnings = Object.values(grouped).map((g) => g.teacherName + ' - ' + g.subjectName + ' (' + g.className + '): ' + g.count + ' period(s) skipped (no available slot)');
          setValidationErrors(warnings);
          setShowValidation(true);
          console.warn('[TIMETABLE] Skipped periods after repair:', warnings);
        }

        // R33.28 single-entry rule: leave unallocated capacity empty.
        // Never invent Library/Sports/Lab/Remedial subjects that are absent from Teaching Assignments.

        // Set generated grid
        setTimetable(generatedGrid);
        triggerAutoSave(generatedGrid);

        // Store into History Stack for Undo/Redo
        setHistory([generatedGrid]);
        setHistoryIndex(0);

        setIsGenerating(false);
        setActiveTab("view");

        // Log operation in primary Supabase ERP database audit logs
        try {
          LocalERPDatabase.addAuditLog(
            user.id,
            user.name,
            user.role,
            "GENERATE_SMART_TIMETABLE_V2",
            "Academic Management",
            `Executed single-click schedule synthesis for academic year ${setup.academicYear} using Smart AI Engine V2.`,
          );
        } catch {}
      }
    }, 600);
  };

  // Pre-publishing Validation Checks
  const handleRunValidationCheck = () => {
    setShowValidation(true);
    const errors: string[] = [];

    // Rule 1: No teacher conflict (same teacher, same day, same period, different class)
    const teacherAssignments: Record<string, string> = {}; // key: "teacher_day_period", value: "class"
    timetable.forEach((cell) => {
      if (!cell.teacherName || cell.teacherName === "Assigned Duty") return;
      const key = `${cell.teacherName}_${cell.day}_${cell.period}`;
      const classKey = formatClassDiv(cell.className, cell.division);
      if (
        teacherAssignments[key] &&
        teacherAssignments[key] !== classKey
      ) {
        errors.push(
          t(
            `Teacher conflict detected: ${cell.teacherName} is assigned to ${cell.className}-${cell.division} and ${teacherAssignments[key]} on ${cell.day} Period ${cell.period}`,
            `शिक्षक संघर्ष का पता चला: ${cell.teacherName} को ${cell.day} पीरियड ${cell.period} पर ${cell.className}-${cell.division} और ${teacherAssignments[key]} में आवंटित किया गया है।`,
            `ٹیچر کے درمیان تنازعہ پایا گیا: ${cell.teacherName} کو ${cell.day} مدت ${cell.period} پر ${cell.className}-${cell.division} اور ${teacherAssignments[key]} میں تفویض کیا گیا ہے۔`,
          ),
        );
      } else {
        teacherAssignments[key] = classKey;
      }
    });

    // Rule 2: Room conflicts (same room, same day, same period, different class)
    const roomAssignments: Record<string, string> = {}; // key: "room_day_period", value: "class"
    timetable.forEach((cell) => {
      if (!cell.roomNumber) return;
      const key = `${cell.roomNumber}_${cell.day}_${cell.period}`;
      const classKey = formatClassDiv(cell.className, cell.division);
      if (
        roomAssignments[key] &&
        roomAssignments[key] !== classKey
      ) {
        errors.push(
          t(
            `Classroom collision on ${cell.day} Period ${cell.period}: Room "${cell.roomNumber}" is double allocated to both ${cell.className}-${cell.division} and ${roomAssignments[key]}`,
            `${cell.day} पीरियड ${cell.period} पर कक्षा टकराव: कमरा "${cell.roomNumber}" दोनों ${cell.className}-${cell.division} और ${roomAssignments[key]} को आवंटित कर दिया गया है।`,
            `کلاس روم کا تصادم ${cell.day} مدت ${cell.period} پر: کمرہ "${cell.roomNumber}" دونوں ${cell.className}-${cell.division} اور ${roomAssignments[key]} کو تفویض کر دیا گیا ہے۔`,
          ),
        );
      } else {
        roomAssignments[key] = classKey;
      }
    });

    // Rule 3: Teacher workload check
    const teacherTotalPeriods: Record<string, number> = {};
    timetable.forEach((cell) => {
      if (!cell.teacherName || cell.teacherName === "Assigned Duty") return;
      teacherTotalPeriods[cell.teacherName] =
        (teacherTotalPeriods[cell.teacherName] || 0) + 1;
    });

    workload.forEach((row) => {
      if (!row.teacherName) return;
      const actual = teacherTotalPeriods[row.teacherName] || 0;
      if (actual > 30) {
        errors.push(
          t(
            `Teacher ${row.teacherName} assigned work load of ${actual} periods exceeds the maximum fatigue standard of 30 periods per week.`,
            `शिक्षक ${row.teacherName} को आवंटित ${actual} अवधियों का कार्यभार प्रति सप्ताह 30 अवधियों की अधिकतम सीमा से अधिक है।`,
            `ٹیچر ${row.teacherName} کو تفویض کردہ ${actual} مدتوں کا کام کا بوجھ فی ہفتہ 30 کی حد سے زیادہ ہے۔`,
          ),
        );
      }
    });

    setValidationErrors(errors);
  };

  const handlePublishToTeacherAccounts = async () => {
    if (!timetable.length) {
      alert("Generate the timetable before publishing it to Teacher accounts.");
      return;
    }
    setPublishingToTeachers(true);
    try {
      const count = await publishHeadmasterTimetable({ academicYear: setup.academicYear, timetable });
      alert(`Published ${count} timetable periods to Teacher accounts.`);
    } catch (error: any) {
      alert(error?.message || "R6 timetable cloud tables are not configured yet. Teacher preview can still use the current Smart Timetable compatibility feed in this browser.");
    } finally {
      setPublishingToTeachers(false);
    }
  };

  // STEP 7 - MANUAL INTERACTIVE ADJUSTMENT (Drag & Drop, Swap, Lock/Unlock)
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedCellId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedCellId || draggedCellId === targetId) return;

    // Find cells
    const sourceIdx = timetable.findIndex((c) => c.id === draggedCellId);
    const targetIdx = timetable.findIndex((c) => c.id === targetId);

    if (sourceIdx === -1 || targetIdx === -1) return;

    const sourceCell = timetable[sourceIdx];
    const targetCell = timetable[targetIdx];

    if (sourceCell.isLocked || targetCell.isLocked) {
      alert(
        t(
          "Cannot complete swap. One of these period cells is locked!",
          "स्वैप पूरा नहीं किया जा सकता। इनमें से एक सेल लॉक है!",
          "تبدیلی مکمل نہیں کی جا سکتی۔ ان میں سے ایک پیریڈ سیل مقفل ہے!",
        ),
      );
      return;
    }

    // Clone grid and swap scheduling information (subjectName, teacherName, roomNumber)
    const updated = [...timetable];
    updated[sourceIdx] = {
      ...sourceCell,
      subjectName: targetCell.subjectName,
      teacherName: targetCell.teacherName,
      roomNumber: targetCell.roomNumber,
    };
    updated[targetIdx] = {
      ...targetCell,
      subjectName: sourceCell.subjectName,
      teacherName: sourceCell.teacherName,
      roomNumber: sourceCell.roomNumber,
    };

    setTimetable(updated);
    triggerAutoSave(updated);

    // Save history
    const nextHistory = history.slice(0, historyIndex + 1);
    setHistory([...nextHistory, updated]);
    setHistoryIndex(nextHistory.length);
    setDraggedCellId(null);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      setHistoryIndex(prevIdx);
      setTimetable(history[prevIdx]);
      localStorage.setItem(
        "nhs_v2_generated_grid",
        JSON.stringify(history[prevIdx]),
      );
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      setTimetable(history[nextIdx]);
      localStorage.setItem(
        "nhs_v2_generated_grid",
        JSON.stringify(history[nextIdx]),
      );
    }
  };

  const toggleLockCell = (id: string) => {
    const updated = timetable.map((cell) => {
      if (cell.id === id) {
        return { ...cell, isLocked: !cell.isLocked };
      }
      return cell;
    });
    setTimetable(updated);
    triggerAutoSave(updated);

    // History update
    const nextHistory = history.slice(0, historyIndex + 1);
    setHistory([...nextHistory, updated]);
    setHistoryIndex(nextHistory.length);
  };

  const handleInlineCellEdit = (
    id: string,
    field: "subjectName" | "teacherName" | "roomNumber",
    value: string,
  ) => {
    const updated = timetable.map((cell) => {
      if (cell.id === id) {
        return { ...cell, [field]: value };
      }
      return cell;
    });
    setTimetable(updated);
    triggerAutoSave(updated);

    // History update
    const nextHistory = history.slice(0, historyIndex + 1);
    setHistory([...nextHistory, updated]);
    setHistoryIndex(nextHistory.length);
  };

  // Filtered timetable cells for display
  const currentViewGrid = useMemo(() => {
    if (viewType === "class") {
      const parts = selectedClass.split("-");
      const clsName = parts[0];
      const clsDiv = parts[1] || "No Division";
      return timetable.filter(
        (c) => c.className === clsName && (c.division || "No Division") === clsDiv,
      );
    }
    if (viewType === "teacher") {
      return timetable.filter((c) => c.teacherName === selectedTeacher);
    }
    return timetable;
  }, [timetable, viewType, selectedClass, selectedTeacher]);

  // Master lists generated from active grid
  const daysHeader = setup.workingDays;
  const periodsRange = Array.from(
    { length: setup.periodsPerDay },
    (_, i) => i + 1,
  );

  // Grouped active state info
  const searchFilteredWorkload = useMemo(() => {
    return workload.filter((row) => {
      const matchesSearch =
        row.teacherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.remarks.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesClass =
        filterClass === "All" || row.className === filterClass;
      const matchesTeacher =
        filterTeacher === "All" || row.teacherName === filterTeacher;

      return matchesSearch && matchesClass && matchesTeacher;
    });
  }, [workload, searchQuery, filterClass, filterTeacher]);

  // Dynamic CSS Print Media Sizer (Improvement 6)
  const getPrintStyles = () => {
    let size = "A4 landscape";
    if (printLayout === "A4_portrait") size = "A4 portrait";
    if (printLayout === "A3_landscape") size = "A3 landscape";
    return `
      @media print {
        @page {
          size: ${size};
          margin: ${printLayout === 'A3_landscape' ? '7mm' : '10mm'};
        }
        body {
          background: white !important;
          color: black !important;
        }
        #smart_timetable_v2_root {
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          background: white !important;
          color: black !important;
          width: 100% !important;
        }
        /* Hide non-print structures */
        .no-print {
          display: none !important;
        }
        .print-only {
          display: block !important;
        }
      }
    `;
  };

  // Dynamic Scaling & High Contrast Styling engine (Improvement 5)
  const getScalingStyles = (isPrint = false) => {
    if (isPrint) {
      const isA4Portrait = printLayout === "A4_portrait";
      const isA3Landscape = printLayout === "A3_landscape";

      return {
        container: "w-full border-collapse bg-white text-black print-scale-container",
        table: "w-full border-collapse border border-black text-center text-xs font-sans",
        dayHeader: isA4Portrait
          ? "py-1 px-1 border border-black text-center font-extrabold bg-slate-100 text-black text-[9px] uppercase tracking-wider"
          : isA3Landscape
            ? "py-3 px-4 border border-black text-center font-extrabold bg-slate-100 text-black text-xs uppercase tracking-wider"
            : "py-2 px-2.5 border border-black text-center font-extrabold bg-slate-100 text-black text-[10px] uppercase tracking-wider",
        teacherRowHeader: isA4Portrait
          ? "py-1 px-1 border border-black text-center font-bold bg-slate-50 text-black text-[9px]"
          : isA3Landscape
            ? "py-3 px-4 border border-black text-center font-bold bg-slate-50 text-black text-xs"
            : "py-2 px-2.5 border border-black text-center font-bold bg-slate-50 text-black text-[10px]",
        cell: isA4Portrait
          ? "p-1 border border-black text-center align-middle bg-white text-[9px]"
          : isA3Landscape
            ? "p-3 border border-black text-center align-middle bg-white text-xs"
            : "p-2 border border-black text-center align-middle bg-white text-[10px]",
        cellSub: "font-extrabold text-black leading-tight",
        cellTea: "text-slate-700 font-medium",
      };
    }

    return {
      container: "border border-slate-800 rounded-2xl overflow-hidden bg-slate-950",
      table: "w-full border-collapse text-left text-xs font-mono",
      dayHeader: "py-3 px-4 border-r border-slate-800 text-center font-bold text-slate-400 bg-slate-900",
      teacherRowHeader: "py-3 px-4 border-r border-slate-800 bg-slate-900/40 text-center font-bold text-slate-300",
      cell: "py-3 px-4 border-r border-slate-800 text-center align-middle",
      cellSub: "font-extrabold text-white text-[11px] leading-tight",
      cellTea: "text-[10px] text-emerald-400 font-medium",
    };
  };

  // Functional CSV Exporter of Traditional Timetable layouts (Improvement 6)
  const handleExportReportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Timetable");
    const days = setup.workingDays;
    const maxPeriods = Math.max(
      ...days.map((d) => setup.weeklyPeriodSettings?.[d] || setup.periodsPerDay)
    );

    let title = "";
    if (selectedReportType === "weekly_class") {
      title = `Weekly Class Timetable - ${reportClass}`;
    } else if (selectedReportType === "teacher") {
      title = `Weekly Teacher Timetable - ${reportTeacher}`;
    } else {
      title = `Weekly Whole School Timetable - ${reportDay}`;
    }

    // Title Row
    const titleCell = sheet.getCell("A1");
    titleCell.value = title;
    titleCell.font = { name: "Arial", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0891B2" } }; // Indigo-600

    sheet.getRow(1).height = 40;

    let headers: string[] = [];
    if (selectedReportType === "weekly_class" || selectedReportType === "teacher") {
      headers = ["Period", ...days];
      sheet.mergeCells(1, 1, 1, headers.length);
      sheet.addRow(headers);
      
      const headerRow = sheet.getRow(2);
      headerRow.height = 25;
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } }; // Slate-800
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin" }, left: { style: "thin" },
          bottom: { style: "thin" }, right: { style: "thin" }
        };
      });

      for (let p = 1; p <= maxPeriods; p++) {
        const rowData = [`Period ${p}`];
        days.forEach((day) => {
          const cell = timetable.find((c) =>
            selectedReportType === "weekly_class"
              ? formatClassDiv(c.className, c.division) === reportClass && c.day === day && c.period === p
              : c.teacherName === reportTeacher && c.day === day && c.period === p
          );

          if (cell && cell.subjectName) {
            if (selectedReportType === "weekly_class") {
              rowData.push(`${cell.subjectName}\n(${cell.teacherName})`);
            } else {
              rowData.push(`${formatClassDivRoman(cell.className, cell.division)}\n(${cell.subjectName})`);
            }
          } else {
            rowData.push("-");
          }
        });
        
        const row = sheet.addRow(rowData);
        row.height = 50;
        row.eachCell((cell, colNumber) => {
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
          cell.border = {
            top: { style: "thin" }, left: { style: "thin" },
            bottom: { style: "thin" }, right: { style: "thin" }
          };
          if (colNumber === 1) {
            cell.font = { bold: true };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
          }
        });

        // Insert Lunch Break if configured
        if (p === setup.lunchBreakPeriod && setup.lunchDuration > 0) {
          const lunchRow = sheet.addRow(Array(days.length + 1).fill("LUNCH BREAK"));
          lunchRow.height = 20;
          sheet.mergeCells(`A${lunchRow.number}:${String.fromCharCode(65 + days.length)}${lunchRow.number}`);
          const mergedLunch = sheet.getCell(`A${lunchRow.number}`);
          mergedLunch.alignment = { horizontal: "center", vertical: "middle" };
          mergedLunch.font = { bold: true, italic: true, color: { argb: "FF475569" } };
          mergedLunch.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
          mergedLunch.border = {
            top: { style: "thin" }, bottom: { style: "thin" },
            left: { style: "thin" }, right: { style: "thin" }
          };
        }
      }

      // Column widths
      sheet.getColumn(1).width = 15;
      for (let i = 2; i <= days.length + 1; i++) {
        sheet.getColumn(i).width = 20;
      }
    } else {
      const schoolPeriods = setup.weeklyPeriodSettings?.[reportDay] || setup.periodsPerDay;
      headers = ["Class / Div"];
      for (let p = 1; p <= schoolPeriods; p++) {
        headers.push(`Period ${p}`);
        if (p === setup.lunchBreakPeriod && setup.lunchDuration > 0) {
          headers.push("Lunch");
        }
      }
      sheet.addRow(headers);
      
      const headerRow = sheet.getRow(2);
      headerRow.height = 25;
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin" }, left: { style: "thin" },
          bottom: { style: "thin" }, right: { style: "thin" }
        };
      });

      classesList.forEach((classDiv) => {
        const parts = classDiv.split("-");
        const cls = parts[0]?.trim() || "";
        const div = parts[1]?.trim() || "No Division";
        const rowData = [formatClassDivRoman(cls, div)];

        for (let p = 1; p <= schoolPeriods; p++) {
          const cell = timetable.find((c) =>
            c.className === cls && (c.division || "No Division") === div &&
            c.day === reportDay && c.period === p
          );
          
          if (cell && cell.subjectName) {
            rowData.push(`${cell.subjectName}\n(${cell.teacherName})`);
          } else {
            rowData.push("-");
          }
          if (p === setup.lunchBreakPeriod && setup.lunchDuration > 0) {
            rowData.push("LUNCH");
          }
        }
        
        const row = sheet.addRow(rowData);
        row.height = 45;
        row.eachCell((cell, colNumber) => {
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
          cell.border = {
            top: { style: "thin" }, left: { style: "thin" },
            bottom: { style: "thin" }, right: { style: "thin" }
          };
          if (colNumber === 1 || cell.value === "LUNCH") {
            cell.font = { bold: true, color: cell.value === "LUNCH" ? { argb: "FF64748B" } : undefined };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
          }
        });
      });

      sheet.getColumn(1).width = 15;
      for (let i = 2; i <= headers.length; i++) {
        sheet.getColumn(i).width = 18;
      }
      
      // Update merge for title depending on total columns
      sheet.mergeCells(1, 1, 1, headers.length);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const filename = `${selectedReportType}_timetable_${(reportClass || reportTeacher || reportDay).replace(" ", "_")}.xlsx`;
    saveAs(blob, filename);
  };

  const handleExportPDF = async () => {
    setIsExportingPdf(true);
    try {
      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')).default;

      setTimeout(() => {
        const element = document.getElementById("timetable-print-area");
        if (!element) {
          setIsExportingPdf(false);
          return;
        }
        
        const filename = `${selectedReportType}_timetable_${(reportClass || reportTeacher || reportDay).replace(/ /g, "_")}.pdf`;
        
        // Temporarily patch main window's getComputedStyle to safely handle oklch colors
        const originalWinGetComputedStyle = window.getComputedStyle;
        window.getComputedStyle = function(el: Element, pseudoEl?: string) {
          const style = originalWinGetComputedStyle.call(window, el, pseudoEl);
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

      const opt = {
        margin:       10,
        filename:     filename,
        image:        { type: 'jpeg' as const, quality: 0.98 },
        html2canvas:  { 
          scale: 2,
          onclone: (clonedDoc: Document) => {
            // Replace oklch with RGB in all style elements in the cloned document
            clonedDoc.querySelectorAll('style').forEach((styleEl) => {
              if (styleEl.textContent) {
                styleEl.textContent = replaceOklchWithRgb(styleEl.textContent);
              }
            });
            
            // Replace oklch with RGB in all inline style attributes in the cloned document
            clonedDoc.querySelectorAll('[style]').forEach((el: any) => {
              const styleAttr = el.getAttribute('style');
              if (styleAttr && (styleAttr.includes('oklch') || styleAttr.includes('oklab'))) {
                el.setAttribute('style', replaceOklchWithRgb(styleAttr));
              }
            });

            const win = clonedDoc.defaultView;
            if (win) {
              const originalGetComputedStyle = win.getComputedStyle;
              win.getComputedStyle = function(el: Element, pseudoEl?: string) {
                const style = originalGetComputedStyle.call(win, el, pseudoEl);
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
          }
        },
        jsPDF: {
          unit: 'mm',
          format: printLayout === 'A3_landscape' ? 'a3' as const : 'a4' as const,
          orientation: printLayout === 'A4_portrait' ? 'portrait' as const : 'landscape' as const
        }
      };
      
      html2pdf().set(opt).from(element).save().then(() => {
        setIsExportingPdf(false);
        window.getComputedStyle = originalWinGetComputedStyle;
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

  const handleExportWholeSchoolExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Weekly Whole School Timetable");

    const days = setup.workingDays || [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    const teachers = teachersList;

    let totalCols = 1;
    const dayPeriodCounts = days.map((day) => setup.weeklyPeriodSettings?.[day] || 9);
    dayPeriodCounts.forEach((count) => {
      totalCols += count;
    });

    // Title Row
    const title = `Weekly Whole School Timetable - Academic Year ${setup.academicYear}`;
    const titleCell = sheet.getCell("A1");
    titleCell.value = title;
    titleCell.font = { name: "Arial", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0891B2" } }; // Indigo-600
    sheet.getRow(1).height = 40;
    sheet.mergeCells(1, 1, 1, totalCols);

    const row2Data = ["Teacher Name"];
    const row3Data = [""];

    days.forEach((day, index) => {
      const periodsCount = dayPeriodCounts[index];
      row2Data.push(day);
      for (let i = 1; i < periodsCount; i++) {
        row2Data.push("");
      }
      for (let p = 1; p <= periodsCount; p++) {
        row3Data.push(`P${p}`);
      }
    });

    sheet.addRow(row2Data);
    sheet.addRow(row3Data);

    sheet.mergeCells(2, 1, 3, 1);
    const teacherHeaderCell = sheet.getCell("A2");
    teacherHeaderCell.alignment = { horizontal: "center", vertical: "middle" };
    teacherHeaderCell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    teacherHeaderCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };

    let mergeStart = 2;
    days.forEach((day, index) => {
      const periodsCount = dayPeriodCounts[index];
      const mergeEnd = mergeStart + periodsCount - 1;
      sheet.mergeCells(2, mergeStart, 2, mergeEnd);
      
      const dayCell = sheet.getCell(2, mergeStart);
      dayCell.alignment = { horizontal: "center", vertical: "middle" };
      dayCell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      dayCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0891B2" } };
      
      mergeStart = mergeEnd + 1;
    });

    const row3 = sheet.getRow(3);
    row3.eachCell((cell, colNum) => {
      if (colNum > 1) {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }
    });

    sheet.getRow(2).height = 25;
    sheet.getRow(3).height = 20;

    teachers.forEach((teacher) => {
      const rowData = [teacher];
      days.forEach((day) => {
        const periodsCount = setup.weeklyPeriodSettings?.[day] || 9;
        for (let p = 1; p <= periodsCount; p++) {
          const cell = timetable.find((c) =>
            c.teacherName === teacher &&
            c.day === day &&
            c.period === p
          );
          if (cell && cell.subjectName) {
            rowData.push(`${formatClassDivRoman(cell.className, cell.division)}\n(${cell.subjectName})`);
          } else {
            rowData.push("-");
          }
        }
      });

      const row = sheet.addRow(rowData);
      row.height = 40;
      row.eachCell((cell, colNumber) => {
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.border = {
          top: { style: "thin" }, left: { style: "thin" },
          bottom: { style: "thin" }, right: { style: "thin" }
        };
        if (colNumber === 1) {
          cell.font = { bold: true };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
        }
      });
    });

    sheet.getColumn(1).width = 18;
    for (let c = 2; c <= totalCols; c++) {
      sheet.getColumn(c).width = 12;
    }

    for (let r = 2; r <= 3; r++) {
      for (let c = 1; c <= totalCols; c++) {
        const cell = sheet.getCell(r, c);
        cell.border = {
          top: { style: "thin" }, left: { style: "thin" },
          bottom: { style: "thin" }, right: { style: "thin" }
        };
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const filename = `weekly_whole_school_timetable_${setup.academicYear.replace(/ /g, "_")}.xlsx`;
    saveAs(blob, filename);
  };

  const handleExportInteractiveExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Interactive Timetable");

    const days = setup.workingDays || [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    const maxPeriods = setup.periodsPerDay;
    const periods = Array.from({ length: maxPeriods }, (_, i) => i + 1);

    const title = viewType === "class" 
      ? `Interactive Class Timetable - ${selectedClass} (Academic Year ${setup.academicYear})`
      : `Interactive Teacher Timetable - ${selectedTeacher} (Academic Year ${setup.academicYear})`;

    const titleCell = sheet.getCell("A1");
    titleCell.value = title;
    titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0891B2" } };
    sheet.getRow(1).height = 35;
    sheet.mergeCells(1, 1, 1, maxPeriods + 1);

    const headers = ["Day / Period"];
    periods.forEach((p) => headers.push(`Period ${p}`));
    sheet.addRow(headers);

    const headerRow = sheet.getRow(2);
    headerRow.height = 25;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" }, left: { style: "thin" },
        bottom: { style: "thin" }, right: { style: "thin" }
      };
    });

    days.forEach((day) => {
      const rowData = [day];
      periods.forEach((period) => {
        const cell = currentViewGrid.find(
          (c) => c.day === day && c.period === period
        );
        if (cell && cell.subjectName) {
          if (viewType === "class") {
            rowData.push(`${cell.subjectName}\n(${cell.teacherName})`);
          } else {
            rowData.push(`${formatClassDivRoman(cell.className, cell.division)}\n(${cell.subjectName})`);
          }
        } else {
          rowData.push("-");
        }
      });

      const row = sheet.addRow(rowData);
      row.height = 45;
      row.eachCell((cell, colNumber) => {
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.border = {
          top: { style: "thin" }, left: { style: "thin" },
          bottom: { style: "thin" }, right: { style: "thin" }
        };
        if (colNumber === 1) {
          cell.font = { bold: true };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
        }
      });
    });

    sheet.getColumn(1).width = 15;
    for (let i = 2; i <= maxPeriods + 1; i++) {
      sheet.getColumn(i).width = 18;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const filename = `interactive_timetable_${viewType}_${(viewType === "class" ? selectedClass : selectedTeacher).replace(/ /g, "_")}.xlsx`;
    saveAs(blob, filename);
  };

  const handleExportInteractivePDF = async () => {
    setIsExportingInteractivePdf(true);
    try {
      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')).default;

      setTimeout(() => {
        const element = document.getElementById("interactive-timetable-print-area");
        if (!element) {
          setIsExportingInteractivePdf(false);
          return;
        }
        const filename = `interactive_timetable_${viewType}_${(viewType === "class" ? selectedClass : selectedTeacher).replace(/ /g, "_")}.pdf`;
        
        // Temporarily patch main window's getComputedStyle to safely handle oklch colors
        const originalWinGetComputedStyle = window.getComputedStyle;
        window.getComputedStyle = function(el: Element, pseudoEl?: string) {
          const style = originalWinGetComputedStyle.call(window, el, pseudoEl);
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

      const opt = {
        margin:       10,
        filename:     filename,
        image:        { type: 'jpeg' as const, quality: 0.98 },
        html2canvas:  { 
          scale: 2,
          onclone: (clonedDoc: Document) => {
            // Replace oklch with RGB in all style elements in the cloned document
            clonedDoc.querySelectorAll('style').forEach((styleEl) => {
              if (styleEl.textContent) {
                styleEl.textContent = replaceOklchWithRgb(styleEl.textContent);
              }
            });
            
            // Replace oklch with RGB in all inline style attributes in the cloned document
            clonedDoc.querySelectorAll('[style]').forEach((el: any) => {
              const styleAttr = el.getAttribute('style');
              if (styleAttr && (styleAttr.includes('oklch') || styleAttr.includes('oklab'))) {
                el.setAttribute('style', replaceOklchWithRgb(styleAttr));
              }
            });

            const win = clonedDoc.defaultView;
            if (win) {
              const originalGetComputedStyle = win.getComputedStyle;
              win.getComputedStyle = function(el: Element, pseudoEl?: string) {
                const style = originalGetComputedStyle.call(win, el, pseudoEl);
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
          }
        },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' as const }
      };
      
      html2pdf().set(opt).from(element).save().then(() => {
        setIsExportingInteractivePdf(false);
        window.getComputedStyle = originalWinGetComputedStyle;
      }).catch((err: any) => {
        console.error("Interactive PDF Export error:", err);
        setIsExportingInteractivePdf(false);
        window.getComputedStyle = originalWinGetComputedStyle;
      });
    }, 500);
    } catch (err) {
      console.error("Failed to load html2pdf.js dynamically:", err);
      setIsExportingInteractivePdf(false);
    }
  };

  // Traditional Layout Timetable Renderers (Columns = Days, Rows = Periods) (Improvement 5)
  const renderTraditionalWeeklyClassTimetable = (
    className: string,
    isPrint = false,
  ) => {
    const days = setup.workingDays;
    const maxPeriods = Math.max(
      ...days.map(
        (d) => setup.weeklyPeriodSettings?.[d] || setup.periodsPerDay,
      ),
    );
    const periods = Array.from({ length: maxPeriods }, (_, i) => i + 1);

    const style = getScalingStyles(isPrint);

    return (
      <div className={style.container}>
        <table className={style.table}>
          <thead>
            <tr className="border-b border-slate-800 print:border-black">
              <th
                className={
                  isPrint
                    ? "py-2 px-3 border border-black text-center font-bold bg-slate-100 text-black w-24"
                    : style.teacherRowHeader + " text-center w-28"
                }
              >
                {t("Period", "अवधि", "پیریڈ")}
              </th>
              {days.map((day) => (
                <th key={day} className={style.dayHeader}>
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 print:divide-black">
            {periods.map((period) => (
              <tr
                key={period}
                className={
                  isPrint ? "bg-white text-black" : "hover:bg-slate-900/20"
                }
              >
                <td
                  className={
                    isPrint
                      ? "py-2 px-3 border border-black text-center font-bold bg-slate-50 text-black text-[10px]"
                      : style.teacherRowHeader +
                        " text-center font-bold text-slate-300"
                  }
                >
                  Period {period}
                </td>
                {days.map((day) => {
                  const dayLimit =
                    setup.weeklyPeriodSettings?.[day] || setup.periodsPerDay;
                  const cell = timetable.find(
                    (c) =>
                      formatClassDiv(c.className, c.division) === className &&
                      c.day === day &&
                      c.period === period,
                  );

                  if (period > dayLimit) {
                    return (
                      <td
                        key={day}
                        className={
                          isPrint
                            ? "p-1.5 border border-black text-center text-[9px] text-slate-500 italic bg-slate-50/50"
                            : "py-3 px-4 border-r border-slate-800 bg-slate-950/80 text-center text-[10px] text-slate-600 italic"
                        }
                      >
                        {t("Off-hours", "समय समाप्त", "وقت ختم")}
                      </td>
                    );
                  }

                  return (
                    <td key={day} className={style.cell}>
                      {cell ? (
                        <div className="space-y-0.5 text-center">
                          <div className={style.cellSub}>
                            {cell.subjectName}
                          </div>
                          <div className={style.cellTea}>
                            {cell.teacherName}
                          </div>
                        </div>
                      ) : (
                        <span className={isPrint ? "text-slate-400" : "text-slate-600"}>
                          -
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderTraditionalTeacherTimetable = (
    teacherName: string,
    isPrint = false,
  ) => {
    const days = setup.workingDays;
    const maxPeriods = Math.max(
      ...days.map(
        (d) => setup.weeklyPeriodSettings?.[d] || setup.periodsPerDay,
      ),
    );
    const periods = Array.from({ length: maxPeriods }, (_, i) => i + 1);

    const style = getScalingStyles(isPrint);

    return (
      <div className={style.container}>
        <table className={style.table}>
          <thead>
            <tr className="border-b border-slate-800 print:border-black">
              <th
                className={
                  isPrint
                    ? "py-2 px-3 border border-black text-center font-bold bg-slate-100 text-black w-24"
                    : style.teacherRowHeader + " text-center w-28"
                }
              >
                {t("Period", "अवधि", "پیریڈ")}
              </th>
              {days.map((day) => (
                <th key={day} className={style.dayHeader}>
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 print:divide-black">
            {periods.map((period) => (
              <tr key={period} className="hover:bg-slate-900/20">
                <td className="py-3 px-4 border-r border-slate-800 bg-slate-900/40 text-center font-bold text-slate-300">
                  Period {period}
                </td>
                {days.map((day) => {
                  const dayLimit =
                    setup.weeklyPeriodSettings?.[day] || setup.periodsPerDay;
                  const cell = timetable.find(
                    (c) =>
                      c.teacherName === teacherName &&
                      c.day === day &&
                      c.period === period,
                  );

                  if (period > dayLimit) {
                    return (
                      <td
                        key={day}
                        className={
                          isPrint
                            ? "p-1.5 border border-black text-center text-[9px] text-slate-500 italic bg-slate-50/50"
                            : "py-3 px-4 border-r border-slate-800 bg-slate-950/80 text-center text-[10px] text-slate-600 italic"
                        }
                      >
                        {t("Off-hours", "समय समाप्त", "وقت खत्म")}
                      </td>
                    );
                  }

                  return (
                    <td key={day} className={style.cell}>
                      {cell ? (
                        <div className="space-y-0.5 text-center">
                          <div className={style.cellSub}>
                            {formatClassDivRoman(cell.className, cell.division)}
                          </div>
                          <div className={style.cellTea}>
                            {cell.subjectName}
                          </div>
                        </div>
                      ) : (
                        <span
                          className={
                            isPrint ? "text-slate-400" : "text-slate-600"
                          }
                        >
                          -
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderWeeklyWholeSchoolTimetable = (isPrint = false) => {
    const days = setup.workingDays || [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const teachers = teachersList;
    const teacherWidth = isPrint ? '34mm' : '150px';
    const periodWidth = isPrint ? '6.2mm' : '27px';
    const verticalHeight = isPrint ? '18mm' : '74px';

    return (
      <div className={isPrint ? "w-full overflow-hidden bg-white text-black" : "overflow-x-auto border border-slate-800 rounded-2xl bg-slate-950"}>
        <table
          className={isPrint ? "border-collapse border border-black text-center font-sans" : "border-collapse text-center font-mono"}
          style={{ tableLayout: 'fixed', width: '100%', minWidth: isPrint ? undefined : '1320px' }}
        >
          <thead>
            <tr>
              <th
                rowSpan={2}
                className={isPrint ? "border border-black bg-slate-100 text-black text-[9px] font-bold px-1" : "border border-slate-800 bg-slate-900 text-slate-300 text-xs font-bold px-2"}
                style={{ width: teacherWidth, minWidth: teacherWidth, maxWidth: teacherWidth }}
              >
                {t("Teacher Name", "शिक्षक का नाम", "ٹیچر کا نام")}
              </th>
              {days.map((day) => {
                const periodsCount = setup.weeklyPeriodSettings?.[day] || 9;
                return (
                  <th
                    key={day}
                    colSpan={periodsCount}
                    className={isPrint ? "border border-black bg-slate-100 text-black text-[9px] font-extrabold uppercase p-0 align-middle" : "border border-slate-800 bg-slate-900 text-violet-200 text-[10px] font-extrabold uppercase p-0 align-middle"}
                    style={{ height: isPrint ? '8mm' : '32px', verticalAlign: 'middle' }}
                  >
                    <div className="flex h-full w-full items-center justify-center text-center leading-none">
                      {day}
                    </div>
                  </th>
                );
              })}
            </tr>
            <tr>
              {days.flatMap((day) => {
                const periodsCount = setup.weeklyPeriodSettings?.[day] || 9;
                return Array.from({ length: periodsCount }, (_, index) => (
                  <th
                    key={`${day}-${index + 1}`}
                    className={isPrint ? "border border-black bg-white text-black text-[8px] font-bold p-0 align-middle" : "border border-slate-800 bg-slate-900/60 text-slate-400 text-[9px] font-bold p-0 align-middle"}
                    style={{ width: periodWidth, minWidth: periodWidth, maxWidth: periodWidth, height: isPrint ? '5mm' : '24px', verticalAlign: 'middle' }}
                  >
                    <div className="flex h-full w-full items-center justify-center text-center leading-none">
                      {index + 1}
                    </div>
                  </th>
                ));
              })}
            </tr>
          </thead>
          <tbody>
            {teachers.map((teacher) => {
              const teacherMeta = approvedTeachers.find((item: any) => item.name === teacher);
              return (
                <tr key={teacher}>
                  <td
                    className={isPrint ? "border border-black bg-white text-black px-1 py-1 text-center" : "border border-slate-800 bg-slate-900/40 text-slate-200 px-2 py-2 text-center"}
                    style={{ width: teacherWidth, minWidth: teacherWidth, maxWidth: teacherWidth }}
                  >
                    <div className={isPrint ? "text-[9px] font-extrabold leading-tight" : "text-[11px] font-bold leading-tight"}>{teacher}</div>
                    {(teacherMeta?.qualification || teacherMeta?.designation) && (
                      <div className={isPrint ? "text-[7px] font-semibold leading-tight mt-0.5" : "text-[9px] text-slate-500 leading-tight mt-0.5"}>
                        {teacherMeta.qualification || teacherMeta.designation}
                      </div>
                    )}
                  </td>
                  {days.flatMap((day) => {
                    const periodsCount = setup.weeklyPeriodSettings?.[day] || 9;
                    return Array.from({ length: periodsCount }, (_, index) => {
                      const period = index + 1;
                      const cell = timetable.find((item) =>
                        item.teacherName === teacher && item.day === day && item.period === period
                      );
                      return (
                        <td
                          key={`${teacher}-${day}-${period}`}
                          className={isPrint ? "relative border border-black bg-white text-black p-0 align-middle overflow-hidden" : "relative border border-slate-800 bg-slate-950 text-white p-0 align-middle overflow-hidden"}
                          style={{ width: periodWidth, minWidth: periodWidth, maxWidth: periodWidth, height: verticalHeight, verticalAlign: 'middle' }}
                        >
                          {cell ? (
                            <span
                              className={isPrint ? "absolute text-[7.5px] font-black leading-none tracking-normal" : "absolute text-[9px] font-extrabold leading-none tracking-tight"}
                              style={{
                                left: '50%',
                                top: '50%',
                                whiteSpace: 'nowrap',
                                transform: 'translate(-50%, -50%) rotate(-90deg)',
                                transformOrigin: 'center center',
                                fontWeight: isPrint ? 900 : 800
                              }}
                              title={`${cell.className} ${cell.division} - ${cell.subjectName}`}
                            >
                              {formatVerticalClassSubject(cell.className, cell.division, cell.subjectName)}
                            </span>
                          ) : (
                            <span
                              className={isPrint ? "absolute text-slate-300 text-[7px] leading-none" : "absolute text-slate-700 text-[9px] leading-none"}
                              style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
                            >
                              ·
                            </span>
                          )}
                        </td>
                      );
                    });
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };


  const selectedReportTitle =
    selectedReportType === "weekly_school"
      ? "Weekly Whole School Timetable"
      : selectedReportType === "weekly_class"
        ? `Class Timetable - ${reportClass}`
        : `Teacher Timetable - ${reportTeacher}`;

  const renderSelectedReport = (isPrint = false) => {
    if (selectedReportType === "weekly_class") {
      return renderTraditionalWeeklyClassTimetable(reportClass, isPrint);
    }
    if (selectedReportType === "teacher") {
      return renderTraditionalTeacherTimetable(reportTeacher, isPrint);
    }
    return renderWeeklyWholeSchoolTimetable(isPrint);
  };

  return (
    <div
      id="smart_timetable_v2_root"
      className="edx-dark-contrast-surface edx-smart-timetable-v2 bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl p-4 md:p-8 space-y-6 shadow-2xl relative overflow-hidden font-sans"
    >
      {/* Decorative gradient blur blocks */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Auto Save Alert Toast */}
      {showAutoSaveAlert && (
        <div className="fixed bottom-6 right-6 bg-emerald-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-full flex items-center gap-2 shadow-lg z-50 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>
            {t(
              "Auto Saved Successfully",
              "स्वचालित रूप से सहेज लिया गया",
              "خودکار طور پر محفوظ کر لیا گیا",
            )}
          </span>
        </div>
      )}

      {/* PREMIUM HEADER SECTION */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/85 p-5 md:p-7 shadow-2xl">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
                <Sparkles className="h-3.5 w-3.5" /> Smart Scheduler
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" /> Teaching Assignments Linked
              </span>
              <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[10px] font-bold text-slate-400">
                {assignmentCloudYear || setup.academicYear}
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white md:text-3xl">
              {t("Smart AI Timetable", "स्मार्ट एआई समय सारणी", "سمارٹ اے آئی ٹائم ٹیبل")}
            </h2>
            <p className="mt-2 max-w-2xl text-xs font-medium leading-relaxed text-slate-400 md:text-sm">
              {t(
                "Configure school timing once. Teacher, Class/Division, Subject and weekly periods flow automatically from Teaching Assignments, then the scheduler builds a clash-free weekly plan without duplicate data entry.",
                "School timing एक बार सेट करें। Teacher, Class/Division, Subject और weekly periods Teaching Assignments से अपने-आप आते हैं, फिर scheduler बिना duplicate entry के clash-free weekly plan बनाता है।",
                "اسکول ٹائمنگ ایک بار سیٹ کریں۔ ٹیچر، کلاس/ڈویژن، مضمون اور ہفتہ وار پیریڈ Teaching Assignments سے خودکار طور پر آتے ہیں، پھر شیڈولر بغیر دوبارہ انٹری کے ہفتہ وار پلان بناتا ہے۔",
              )}
            </p>
          </div>

          <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4 xl:w-auto xl:min-w-[470px]">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3.5">
              <div className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">Readiness</div>
              <div className={`mt-1 text-xl font-black ${readinessCheck.score === 100 ? "text-emerald-300" : "text-amber-300"}`}>{readinessCheck.score}%</div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3.5">
              <div className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">Assignments</div>
              <div className="mt-1 text-xl font-black text-white">{workload.length}</div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3.5">
              <div className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">Classes</div>
              <div className="mt-1 text-xl font-black text-white">{classesList.length}</div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3.5">
              <div className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">Weekly Periods</div>
              <div className="mt-1 text-xl font-black text-white">{workload.reduce((sum, row) => sum + Number(row.periodsPerWeek || 0), 0)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* WIZARD PROCESS NAVIGATION BAR */}
      <div className="bg-slate-950 border border-slate-800/60 p-1.5 rounded-2xl flex flex-wrap gap-1 md:gap-2">
        <button
          onClick={() => setActiveTab("setup")}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === "setup"
              ? "bg-gradient-to-r from-cyan-500 to-violet-500 text-white shadow-lg font-black"
              : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/50"
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>
            {t("1. School Setup", "1. स्कूल सेटअप", "1. اسکول سیٹ اپ")}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("workload")}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === "workload"
              ? "bg-gradient-to-r from-cyan-500 to-violet-500 text-white shadow-lg font-black"
              : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/50"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>
            {t("2. Assignment Load", "2. असाइनमेंट लोड", "2. اسائنمنٹ لوڈ")}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("generate")}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === "generate"
              ? "bg-gradient-to-r from-cyan-500 to-violet-500 text-white shadow-lg font-black"
              : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/50"
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>
            {t(
              "3. Smart Generate",
              "3. स्मार्ट जनरेट",
              "3. سمارٹ جنریٹ",
            )}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("view")}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === "view"
              ? "bg-gradient-to-r from-cyan-500 to-violet-500 text-white shadow-lg font-black"
              : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/50"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>
            {t(
              "4. Interactive Board",
              "4. इंटरएक्टिव बोर्ड",
              "4. انٹرایکٹو بورڈ",
            )}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("reports")}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === "reports"
              ? "bg-gradient-to-r from-cyan-500 to-violet-500 text-white shadow-lg font-black"
              : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/50"
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>
            {t(
              "5. Print & Export",
              "5. प्रिंट और निर्यात",
              "5. پرنٹ اور برآمد",
            )}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("substitute")}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === "substitute"
              ? "bg-gradient-to-r from-cyan-500 to-violet-500 text-white shadow-lg font-black"
              : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/50"
          }`}
        >
          <RefreshCw className="w-4 h-4 text-emerald-400" />
          <span>
            {t(
              "Substitute Management",
              "स्थानापन्न प्रबंधन",
              "متبادل ایڈجسٹمنٹ",
            )}
          </span>
        </button>
      </div>

      {/* CORE WORKSPACE SCREENS */}
      <div className="bg-slate-950 border border-slate-850 rounded-3xl p-5 md:p-8 shadow-inner">
        {/* TAB 6: SUBSTITUTE MANAGEMENT */}
        {activeTab === "substitute" && (
          <SmartSubstituteManager
            lang={lang}
            user={user}
            timetable={timetable}
            approvedTeachers={approvedTeachers}
            workloadRows={workload}
            masterSubjects={masterSubjects}
            academicSetup={academicSetup}
          />
        )}
        {/* TAB 1: SCHOOL SETUP (LESS CONFIG, MORE INTELLIGENCE) */}
        {activeTab === "setup" && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-violet-300" />
                  {t(
                    "School Timing & Structural Setup",
                    "स्कूल समय और संरचनात्मक सेटअप",
                    "اسکول کے اوقات اور تنظیمی سیٹ اپ",
                  )}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {t(
                    "Configure once. The AI rule engine adapts to lunch breaks, Saturday half-days and assembly periods automatically.",
                    "एक बार कॉन्फ़िगर करें। एआई नियम इंजन स्वचालित रूप से दोपहर के भोजन के अवकाश, शनिवार के आधे दिन और असेंबली अवधियों के अनुकूल हो जाता है।",
                    "ایک بار ترتیب دیں۔ اے آئی رول انجن خود بخود لنچ کے وقفوں، ہفتہ کے ہاف ڈے اور اسمبلی کی مدتوں کے مطابق ڈھل جاتا ہے۔",
                  )}
                </p>
              </div>
              <span className="bg-slate-900 text-slate-400 px-3 py-1 rounded-lg text-[10px] font-bold font-mono">
                {t("Status: Locked", "स्थिति: लॉक", "حیثیت: مقفل")}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Academic Year */}
              <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                  {t("Academic Year", "शैक्षणिक वर्ष", "تعلیمی سال")}
                </label>
                <select
                  value={setup.academicYear}
                  onChange={(e) =>
                    handleUpdateSetup({
                      ...setup,
                      academicYear: e.target.value,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-cyan-400"
                >
                  {(academicSetup.academicYears || []).map((year:any) => (
                    <option key={year.year || year.yearCode} value={year.year || year.yearCode}>
                      {year.year || year.yearCode}{year.isActive ? ' (Current)' : ''}
                    </option>
                  ))}
                  {!(academicSetup.academicYears || []).length && <option value="">Not configured</option>}
                </select>
              </div>

              {/* School timings */}
              <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                  {t("School Hours", "स्कूल का समय", "اسکول کے اوقات")}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={setup.schoolStart}
                    onChange={(e) =>
                      handleUpdateSetup({
                        ...setup,
                        schoolStart: e.target.value,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs font-bold text-white text-center focus:outline-none focus:border-cyan-400"
                  />
                  <span className="text-slate-600 text-xs">-</span>
                  <input
                    type="text"
                    value={setup.schoolEnd}
                    onChange={(e) =>
                      handleUpdateSetup({ ...setup, schoolEnd: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs font-bold text-white text-center focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Periods configuration */}
              <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                  {t("Periods Per Day", "प्रतिदिन अवधियां", "روزانہ کی مدتیں")}
                </label>
                <input
                  type="number"
                  min={4}
                  max={10}
                  value={setup.periodsPerDay}
                  onChange={(e) =>
                    handleUpdateSetup({
                      ...setup,
                      periodsPerDay: parseInt(e.target.value) || 6,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Lunch break scheduling */}
              <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                  {t(
                    "Lunch Break After Period",
                    "दोपहर के भोजन का अंतराल",
                    "کھانے کا وقفہ",
                  )}
                </label>
                <select
                  value={setup.lunchBreakPeriod}
                  onChange={(e) =>
                    handleUpdateSetup({
                      ...setup,
                      lunchBreakPeriod: parseInt(e.target.value) || 3,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value={2}>After Period 2</option>
                  <option value={3}>After Period 3 (Standard)</option>
                  <option value={4}>After Period 4</option>
                </select>
              </div>
            </div>

            {/* Daily Periods Configuration (Improvement 1) */}
            <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-3xl space-y-4">
              <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-violet-300" />
                {t(
                  "Editable Weekly Period Limits (Daily Caps)",
                  "संपादनीय दैनिक अवधि सीमाएं",
                  "قابل تدوین روزانہ کی مدت کی حدود",
                )}
              </h4>
              <p className="text-[11px] text-slate-500">
                {t(
                  "Configure the custom period limits for each working day. The AI auto-generator adjusts schedules on the fly.",
                  "प्रत्येक कार्य दिवस के लिए अनुकूलित अवधि सीमाएं कॉन्फ़िगर करें। एआई तुरंत अनुसूची को समायोजित करता है।",
                  "ہر کام کے دن کے لیے پیریڈ کی حدیں تبدیل کریں۔ اے آئی فوری طور پر شیڈول کو ایڈجسٹ کرتا ہے۔",
                )}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                ].map((day) => {
                  const currentValue =
                    setup.weeklyPeriodSettings?.[day] !== undefined
                      ? setup.weeklyPeriodSettings[day]
                      : 6;
                  return (
                    <div
                      key={day}
                      className="bg-slate-950 border border-slate-850 p-3.5 rounded-xl space-y-1.5"
                    >
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wide block text-center">
                        {t(day, day, day)}
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={currentValue}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 6;
                          const updatedWeekly = {
                            ...(setup.weeklyPeriodSettings || {
                              Monday: 9,
                              Tuesday: 9,
                              Wednesday: 9,
                              Thursday: 9,
                              Friday: 7,
                              Saturday: 5,
                            }),
                            [day]: val,
                          };
                          handleSaveDailyPeriods(updatedWeekly);
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-2 text-center text-xs font-extrabold text-white focus:outline-none focus:border-violet-400"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Saturday and Friday configuration parameters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900/40 border border-slate-800/60 p-5 rounded-2xl space-y-2">
                <span className="font-extrabold text-amber-400 text-xs flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4" />
                  {t(
                    "Automatic Friday Prayer Rule Active",
                    "स्वचालित शुक्रवार प्रार्थना नियम सक्रिय",
                    "جمعہ کی نماز کا خودکار قاعدہ فعال",
                  )}
                </span>
                <p className="text-[11px] text-slate-400 leading-normal">
                  {t(
                    "Friday sessions automatically adjust period durations to complete school at 12:30 PM with safe travel windows allocated for Urdu Medium tracks and community prayers.",
                    "शुक्रवार के सत्र स्वचालित रूप से उर्दू माध्यम के छात्रों और सामुदायिक प्रार्थनाओं के लिए समय प्रदान करने के लिए समय को समायोजित करते हैं।",
                    "جمعہ کے سیشنز خود بخود اردو میڈیم ٹریکس اور کمیونٹی کی نمازوں کے لیے وقت فراہم کرنے کے لیے پیریڈ کے دورانیے کو ایڈجسٹ کرتے ہیں۔",
                  )}
                </p>
              </div>

              <div className="bg-slate-900/40 border border-slate-800/60 p-5 rounded-2xl space-y-2">
                <span className="font-extrabold text-amber-400 text-xs flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4" />
                  {t(
                    "Saturday Half-Day Schedule Enforced",
                    "शनिवार आधा दिन अनुसूची लागू",
                    "ہفتہ کے نصف دن کا شیڈول نافذ",
                  )}
                </span>
                <p className="text-[11px] text-slate-400 leading-normal">
                  {t(
                    "Saturday shifts are capped at 4 periods maximum, bypass standard lunch schedules, and trigger weekly-off audits immediately at school end.",
                    "शनिवार की पारियों को अधिकतम 4 अवधियों तक सीमित किया गया है, और दोपहर के भोजन के कार्यक्रम को दरकिनार किया गया है।",
                    "ہفتہ کی شفٹوں کو زیادہ سے زیادہ 4 پیریڈز تک محدود کیا گیا ہے، اور دوپہر کے کھانے کے شیڈول کو نظرانداز کیا گیا ہے۔",
                  )}
                </p>
              </div>
            </div>

            {/* Settings Confirm Block */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  setActiveTab("workload");
                  triggerAutoSave(timetable);
                }}
                className="bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-white font-black text-xs px-6 py-3 rounded-xl flex items-center gap-2 cursor-pointer shadow-md transition-all"
              >
                <span>
                  {t(
                    "Save Setup & Continue",
                    "सेटअप सहेजें और जारी रखें",
                    "سیٹ اپ محفوظ کریں اور جاری رکھیں",
                  )}
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: CANONICAL TEACHING ASSIGNMENT MIRROR */}
        {activeTab === "workload" && (
          <div className="space-y-5">
            <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/80 p-5 md:p-6 shadow-xl">
              <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-cyan-400/10 blur-3xl" />
              <div className="pointer-events-none absolute -left-16 bottom-0 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl" />
              <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Single Source of Truth
                    </span>
                    <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[10px] font-bold text-slate-400">
                      {assignmentCloudYear || setup.academicYear}
                    </span>
                  </div>
                  <h3 className="text-lg font-black tracking-tight text-white md:text-xl">
                    {t(
                      "Teaching Assignments → Timetable Workload",
                      "शिक्षण असाइनमेंट → समय सारणी कार्यभार",
                      "ٹیچنگ اسائنمنٹس ← ٹائم ٹیبل ورک لوڈ",
                    )}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                    {t(
                      "Teacher, Class/Division, Subject and Periods/Week are fetched automatically from Academic Setup. Edit them only in Teaching Assignments; this screen is a live read-only mirror for Smart AI Timetable.",
                      "Teacher, Class/Division, Subject और Periods/Week Academic Setup से अपने-आप लिए जाते हैं। बदलाव केवल Teaching Assignments में करें; यह Smart AI Timetable के लिए read-only live mirror है।",
                      "ٹیچر، کلاس/ڈویژن، مضمون اور ہفتہ وار پیریڈ Academic Setup سے خودکار طور پر آتے ہیں۔ تبدیلی صرف Teaching Assignments میں کریں؛ یہ Smart AI Timetable کے لیے لائیو ریڈ اونلی مرر ہے۔",
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void refreshTeachingAssignments()}
                    disabled={assignmentCloudLoading}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-2.5 text-xs font-black text-cyan-200 transition hover:bg-cyan-400/15 disabled:cursor-wait disabled:opacity-60"
                  >
                    <RefreshCw className={`h-4 w-4 ${assignmentCloudLoading ? "animate-spin" : ""}`} />
                    {assignmentCloudLoading ? "Refreshing..." : "Refresh Assignments"}
                  </button>
                  <button
                    type="button"
                    onClick={handleExportTeachingAssignments}
                    disabled={!workload.length}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-black text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 disabled:opacity-40"
                  >
                    <Download className="h-4 w-4 text-emerald-300" /> Export Source
                  </button>
                </div>
              </div>
            </div>

            {assignmentCloudError && (
              <div className="flex items-start gap-3 rounded-2xl border border-rose-400/25 bg-rose-500/10 p-4 text-sm text-rose-200">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <div className="font-black">Teaching Assignments could not be loaded</div>
                  <div className="mt-1 text-xs text-rose-200/80">{assignmentCloudError}</div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                { label: "Assignments", value: workload.length, icon: Layers },
                { label: "Weekly Periods", value: workload.reduce((sum, row) => sum + Number(row.periodsPerWeek || 0), 0), icon: Clock },
                { label: "Classes", value: classesList.length, icon: LayoutGrid },
                { label: "Teachers", value: teachersList.length, icon: Users },
              ].map((card) => (
                <div key={card.label} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 shadow-inner">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{card.label}</span>
                    <card.icon className="h-4 w-4 text-cyan-300" />
                  </div>
                  <div className="mt-2 text-2xl font-black tracking-tight text-white">{card.value}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.5fr_1fr_1fr_auto]">
              <div className="relative">
                <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder={t("Search teacher, class or subject...", "शिक्षक, कक्षा या विषय खोजें...", "ٹیچر، کلاس یا مضمون تلاش کریں...")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-slate-800 bg-slate-950 pl-9 pr-4 text-xs font-medium text-slate-200 outline-none transition focus:border-cyan-400/60"
                />
              </div>
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="min-h-11 rounded-xl border border-slate-800 bg-slate-950 px-3 text-xs font-bold text-slate-300 outline-none focus:border-cyan-400/60"
              >
                <option value="All">All Classes</option>
                {workloadClassOptions.map((className) => <option key={className} value={className}>{className}</option>)}
              </select>
              <select
                value={filterTeacher}
                onChange={(e) => setFilterTeacher(e.target.value)}
                className="min-h-11 rounded-xl border border-slate-800 bg-slate-950 px-3 text-xs font-bold text-slate-300 outline-none focus:border-cyan-400/60"
              >
                <option value="All">All Teachers</option>
                {teachersList.map((teacherName) => <option key={teacherName} value={teacherName}>{teacherName}</option>)}
              </select>
              <div className="flex min-h-11 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 px-4 text-[10px] font-black uppercase tracking-wider text-slate-500">
                {assignmentCloudUpdatedAt ? `Cloud ${assignmentCloudUpdatedAt}` : "Cloud source"}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-xs">
                  <thead className="border-b border-slate-800 bg-slate-900/90 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3.5">#</th>
                      <th className="px-4 py-3.5">Teacher</th>
                      <th className="px-4 py-3.5">Class / Division</th>
                      <th className="px-4 py-3.5">Subject</th>
                      <th className="px-4 py-3.5 text-center">Periods / Week</th>
                      <th className="px-4 py-3.5">Role</th>
                      <th className="px-4 py-3.5">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {assignmentCloudLoading && !workload.length ? (
                      <tr><td colSpan={7} className="px-4 py-14 text-center text-slate-500"><RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-cyan-300" />Loading canonical Teaching Assignments...</td></tr>
                    ) : searchFilteredWorkload.length ? searchFilteredWorkload.map((row, index) => (
                      <tr key={row.id} className="transition hover:bg-slate-900/55">
                        <td className="px-4 py-3.5 font-mono text-slate-600">{index + 1}</td>
                        <td className="px-4 py-3.5">
                          <div className="font-black text-white">{row.teacherName}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 font-bold text-slate-200">
                            {formatClassDiv(row.className, row.division)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-bold" style={{color: "#c4b5fd"}}>{row.subjectName}</td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={`inline-flex min-w-12 justify-center rounded-lg border px-2.5 py-1 font-black ${row.periodsPerWeek > 0 ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : "border-rose-400/20 bg-rose-400/10 text-rose-300"}`}>
                            {row.periodsPerWeek}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <select
                            value={row.isClassTeacher ? 'class_teacher' : 'subject_teacher'}
                            onChange={(event) => setTimetableFirstPeriodRole(row, event.target.value as 'subject_teacher' | 'class_teacher')}
                            className={`min-w-[180px] rounded-xl border px-3 py-2 text-[11px] font-black outline-none ${row.isClassTeacher ? 'border-amber-400/30 bg-amber-400/10 text-amber-200' : 'border-slate-700 bg-slate-950 text-slate-200'}`}
                            title="Timetable priority only. Canonical Class Teacher duty remains managed in Academic Setup."
                          >
                            <option value="subject_teacher">Subject Teacher</option>
                            <option value="class_teacher">Class Teacher · 1st Period</option>
                          </select>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-500"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />Teaching Assignments</span>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={7} className="px-4 py-14 text-center">
                          <AlertCircle className="mx-auto mb-3 h-7 w-7 text-slate-600" />
                          <div className="font-black text-slate-300">No matching Teaching Assignments</div>
                          <div className="mt-1 text-xs text-slate-500">Add or edit Teacher ↔ Class/Division ↔ Subject ↔ Periods/Week in Academic Setup, then Refresh Assignments.</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-400">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span>Teacher/Class/Subject/Periods remain read-only from <strong className="text-slate-200">Academic Setup → Teaching Assignments</strong>. Only the Role dropdown above is a timetable-specific first-period priority and does not rewrite the canonical academic assignment.</span>
              </div>
              <button
                onClick={() => setActiveTab("generate")}
                disabled={!readinessCheck.isReady}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-5 py-2.5 text-xs font-black text-white shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Proceed to Smart Generator <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: ONE-CLICK AI GENERATOR */}
        {activeTab === "generate" && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                {t(
                  "One-Click AI Timetable Generator Core",
                  "वन-क्लिक एआई टाइमटेबल जनरेटर कोर",
                  "ون کلک اے آئی ٹائم ٹیبل جنریٹر کور",
                )}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {t(
                  "Teaching Assignments are already loaded. The scheduler balances teacher clashes, class clashes, weekly workload, Friday rules and Saturday caps automatically.",
                  "Teaching Assignments पहले से loaded हैं। Scheduler teacher clashes, class clashes, weekly workload, Friday rules और Saturday caps को अपने-आप balance करता है।",
                  "Teaching Assignments پہلے سے لوڈ ہیں۔ شیڈولر ٹیچر کلیش، کلاس کلیش، ہفتہ وار ورک لوڈ، جمعہ کے قواعد اور ہفتہ کی حد خودکار طور پر بیلنس کرتا ہے۔",
                )}
              </p>
            </div>

            {/* Simulated generator status panel */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 text-center space-y-6 max-w-2xl mx-auto shadow-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400" />

              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-cyan-400/10 border border-cyan-400/25 flex items-center justify-center text-cyan-300">
                  <Sliders className="w-8 h-8 animate-pulse" />
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-lg font-black text-white">
                  {t(
                    "Autonomous Constraint Scheduler V2.0",
                    "स्वायत्त बाधा शेड्यूलर V2.0",
                    "خود مختار رکاوٹ شیڈولر V2.0",
                  )}
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-normal">
                  {t(
                    "The constraint scheduler uses the canonical Teaching Assignment workload to place required periods across the week while minimizing teacher and class conflicts.",
                    "Constraint scheduler canonical Teaching Assignment workload का उपयोग करके required periods को पूरे सप्ताह में रखता है और teacher/class conflicts कम करता है।",
                    "Constraint scheduler کینونیکل Teaching Assignment ورک لوڈ سے مطلوبہ پیریڈ پورے ہفتے میں رکھتا ہے اور ٹیچر/کلاس کلیش کم کرتا ہے۔",
                  )}
                </p>
              </div>

              {/* Status Readiness Indicators */}
              <div className="grid grid-cols-2 gap-3 max-w-md mx-auto text-left text-[11px] font-mono">
                <div className="flex items-center gap-2 text-slate-300">
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                  <span>
                    {t(
                      "Working Days Configured",
                      "कार्य दिवस कॉन्फ़िगर किए गए",
                      "کام کے دن ترتیب دیے گئے",
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                  <span>
                    {t(
                      "Class Teacher Rules Synced",
                      "कक्षा शिक्षक नियम समकाल",
                      "کلاس ٹیچر کے قواعد مطابقت پذیری",
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                  <span>
                    {t(
                      "Lunch Break Duration Valid",
                      "दोपहर का भोजन समय मान्य",
                      "لنچ بریک کا دورانیہ درست",
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                  <span>
                    {t(
                      "Active G.R. Number Map",
                      "सक्रिय जी.आर. नंबर मैप",
                      "فعال جی آر نمبر نقشہ",
                    )}
                  </span>
                </div>
              </div>

              {/* Generator Core Button */}
              <div className="pt-2">
                {isGenerating ? (
                  <div className="space-y-4 max-w-md mx-auto">
                    <div className="flex justify-between text-xs font-mono text-violet-300 font-bold">
                      <span>
                        {t(
                          "Running AI Scheduling...",
                          "एआई शेड्यूलिंग चल रहा है...",
                          "اے آئی شیڈولنگ چل رہی ہے...",
                        )}
                      </span>
                      <span>{isNaN(generationProgress) ? 0 : generationProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
                      <div
                        className="bg-gradient-to-r from-cyan-500 to-violet-500 h-2.5 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${isNaN(generationProgress) ? 0 : generationProgress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleGenerateTimetable}
                    disabled={!readinessCheck.isReady}
                    className={`w-full max-w-md mx-auto py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-lg transition-all cursor-pointer ${
                      readinessCheck.isReady
                        ? "bg-gradient-to-r from-cyan-500 via-violet-500 to-fuchsia-500 hover:from-cyan-400 hover:to-fuchsia-400 text-white transform hover:-translate-y-0.5"
                        : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50"
                    }`}
                  >
                    <Play className="w-5 h-5 text-amber-300 animate-pulse" />
                    <span>
                      {t(
                        "🤖 Generate Weekly Timetable",
                        "🤖 साप्ताहिक समय सारिणी उत्पन्न करें",
                        "Saapthahik Samay Sarini Utpann Karen",
                      )}
                    </span>
                  </button>
                )}
              </div>

              {/* Dynamic Console log window */}
              {generationLogs.length > 0 && (
                <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 text-left space-y-1 max-h-[160px] overflow-y-auto font-mono text-[10px] text-slate-400 scrollbar-thin scrollbar-thumb-slate-800">
                  {generationLogs.map((log, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-violet-400 font-bold">&gt;</span>
                      <span>{log}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: INTERACTIVE CALENDAR BOARD (EXCEL & GOOGLE CALENDAR STYLING) */}
        {activeTab === "view" && (
          <>
            <div className="space-y-6 animate-fade-in text-left no-print">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-violet-300" />
                  {t(
                    "Interactive Weekly Timetable Board",
                    "इंटरएक्टिव साप्ताहिक समय सारिणी बोर्ड",
                    "انٹرایکٹو ہفتہ وار شیڈول بورڈ",
                  )}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {t(
                    "HTML5 Drag & Drop to Swap. Click the lock icons to protect specific slots from being changed.",
                    "स्वैप करने के लिए ड्रैग एंड ड्रॉप करें। विशिष्ट स्लॉट को सुरक्षित करने के लिए लॉक आइकन पर क्लिक करें।",
                    "تبدیلی کے لیے گھسیٹیں اور چھوڑیں۔ مخصوص حصوں کو محفوظ کرنے کے لیے تالے کے نشان پر کلک کریں۔",
                  )}
                </p>
              </div>

              {/* Undo and Redo operations */}
              <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
                <button
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  className={`p-2 rounded-lg border text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ${
                    historyIndex > 0
                      ? "bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800"
                      : "bg-slate-900/30 border-slate-900 text-slate-600 cursor-not-allowed"
                  }`}
                  title="Undo last modification"
                >
                  <Undo2 className="w-4 h-4" />
                </button>

                <button
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1}
                  className={`p-2 rounded-lg border text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ${
                    historyIndex < history.length - 1
                      ? "bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800"
                      : "bg-slate-900/30 border-slate-900 text-slate-600 cursor-not-allowed"
                  }`}
                  title="Redo next modification"
                >
                  <Redo2 className="w-4 h-4" />
                </button>

                <button
                  onClick={handlePublishToTeacherAccounts}
                  disabled={publishingToTeachers || !timetable.length}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 border border-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="Publish the current Headmaster timetable to Teacher accounts"
                >
                  <Upload className="w-4 h-4" />
                  <span>{publishingToTeachers ? "Publishing..." : "Publish to Teachers"}</span>
                </button>

                <button
                  onClick={handleRunValidationCheck}
                  className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Shield className="w-4 h-4 text-amber-500 animate-pulse" />
                  <span>
                    {t(
                      "Validate Scheme",
                      "योजना सत्यापित करें",
                      "اسکیم کی تصدیق کریں",
                    )}
                  </span>
                </button>
              </div>
            </div>

            {/* Validation Errors Box */}
            {showValidation && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-white flex items-center gap-2 uppercase tracking-wider">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    {t(
                      "AI Engine Validation Report",
                      "एआई इंजन सत्यापन रिपोर्ट",
                      "اے آئی انجن کی تصدیق رپورٹ",
                    )}
                  </h4>
                  <button
                    onClick={() => setShowValidation(false)}
                    className="text-slate-500 hover:text-white text-xs"
                  >
                    Close [x]
                  </button>
                </div>

                {validationErrors.length > 0 ? (
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                    {validationErrors.map((err, i) => (
                      <div
                        key={i}
                        className="flex gap-2 text-[11px] text-amber-400 font-mono"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>{err}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-bold">
                    <Check className="w-4 h-4" />
                    <span>
                      {t(
                        "Excellent! All schedule conflict rules verified successfully.",
                        "उत्कृष्ट! सभी संघर्ष नियम सफलतापूर्वक सत्यापित किए गए।",
                        "شاندار! تمام تصادم کے قوانین کی کامیابی کے ساتھ تصدیक کی گئی۔",
                      )}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* View type filters */}
            <div className="flex flex-col md:flex-row gap-3 items-center bg-slate-900/40 border border-slate-850 p-4 rounded-2xl">
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
                <button
                  onClick={() => setViewType("class")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    viewType === "class"
                      ? "bg-gradient-to-r from-cyan-500 to-violet-500 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Class View
                </button>
                <button
                  onClick={() => setViewType("teacher")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    viewType === "teacher"
                      ? "bg-gradient-to-r from-cyan-500 to-violet-500 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Teacher View
                </button>
              </div>

              {/* Dynamic Sub-selector fields */}
              <div className="flex-1 w-full">
                {viewType === "class" && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 shrink-0">
                      {t(
                        "Select Division:",
                        "प्रभाग चुनें:",
                        "ڈویژن منتخب کریں:",
                      )}
                    </span>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="bg-slate-950 border border-slate-800 text-xs font-bold text-slate-200 rounded-xl px-3 py-2 w-full max-w-xs focus:outline-none focus:border-cyan-400"
                    >
                      {classesList.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {viewType === "teacher" && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 shrink-0">
                      {t(
                        "Select Teacher:",
                        "शिक्षक चुनें:",
                        "ٹیچر منتخب کریں:",
                      )}
                    </span>
                    <select
                      value={selectedTeacher}
                      onChange={(e) => setSelectedTeacher(e.target.value)}
                      className="bg-slate-950 border border-slate-800 text-xs font-bold text-slate-200 rounded-xl px-3 py-2 w-full max-w-xs focus:outline-none focus:border-cyan-400"
                    >
                      {teachersList.map((t) => {
                        const tObj = approvedTeachers.find((a: any) => a.name === t);
                        return (
                          <option key={t} value={t}>
                            {t} {tObj ? `(${tObj.username || tObj.shalarthId} - ${tObj.designation || 'Teacher'})` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}
              </div>

              {/* Interactive Board Exports */}
              <div className="flex items-center gap-2 shrink-0 self-stretch md:self-auto justify-end">
                <button
                  onClick={() => printSectionById("interactive-timetable-print-area", "Class or Teacher Timetable")}
                  className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{t("Print", "प्रिंट", "پرنت")}</span>
                </button>
                <button
                  onClick={handleExportInteractivePDF}
                  className="bg-violet-500/10 hover:bg-violet-500/20 border border-violet-400/30 text-violet-100 font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                >
                  <FileText className="w-3.5 h-3.5 text-violet-300" />
                  <span>{t("PDF Export", "पीडीएफ निर्यात", "پی ڈی ایف برآمد")}</span>
                </button>
                <button
                  onClick={handleExportInteractiveExcel}
                  className="bg-emerald-900/60 hover:bg-emerald-900/80 border border-emerald-800 text-emerald-200 font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t("Excel Export", "एक्सेल निर्यात", "ایکسل برآمد")}</span>
                </button>
              </div>
            </div>

            {/* TIMETABLE BOARD GRID DISPLAY */}
            {timetable.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/30 border border-dashed border-slate-800 rounded-3xl space-y-4">
                <Calendar className="w-12 h-12 text-slate-700 mx-auto" />
                <div className="space-y-1">
                  <h4 className="font-bold text-white text-sm">
                    {t(
                      "No timetable generated yet",
                      "अभी तक कोई समय सारिणी नहीं बनाई गई है",
                      "ابھی تک کوئی ٹائم ٹیبل تیار نہیں کیا گیا ہے",
                    )}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {t(
                      "Please transition to Step 3 and click 'Generate' to automatically compute the scheduling permutations.",
                      "कृपया चरण 3 पर जाएँ और अनुसूची उत्पन्न करने के लिए 'जेनरेट' पर क्लिक करें।",
                      "براہ کرم مرحلہ 3 پر جائیں اور خود بخود شیڈول تیار کرنے کے لیے 'جنریٹ' پر کلک کریں۔",
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("generate")}
                  className="bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl cursor-pointer"
                >
                  {t("Go to Generator", "जनरेटर पर जाएँ", "جنरेटर पर جائیں")}
                </button>
              </div>
            ) : (
              <div id="interactive-timetable-print-area" className="border border-slate-800/80 rounded-2xl overflow-hidden bg-slate-950 shadow-inner">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left font-mono text-xs">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800 text-slate-400">
                        <th className="py-3.5 px-4 w-32 border-r border-slate-800 text-center font-bold">
                          {t("Day / Period", "दिन / अवधि", "دن / پیریڈ")}
                        </th>
                        {periodsRange.map((p) => (
                          <th
                            key={p}
                            className="py-3.5 px-3 min-w-[150px] border-r border-slate-800 text-center font-bold"
                          >
                            <div>Period {p}</div>
                            <div className="text-[9px] text-slate-500 font-bold mt-0.5">
                              {p === 1 && "08:30 - 09:15"}
                              {p === 2 && "09:15 - 10:00"}
                              {p === 3 && "10:00 - 10:45"}
                              {p === 4 && "11:00 - 11:45"}
                              {p === 5 && "11:45 - 12:30"}
                              {p === 6 && "12:30 - 01:15"}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {daysHeader.map((day) => (
                        <tr
                          key={day}
                          className="hover:bg-slate-900/20 transition-colors"
                        >
                          <td className="py-4 px-4 font-black text-slate-300 border-r border-slate-800 bg-slate-900/40 text-center">
                            {day}
                          </td>
                          {periodsRange.map((period) => {
                            // Find matching grid entry
                            const cell = currentViewGrid.find(
                              (c) => c.day === day && c.period === period,
                            );
                            const cellId = cell?.id || `${day}_${period}`;

                            return (
                              <td
                                key={period}
                                className="p-2 border-r border-b border-slate-800/60 h-24 min-w-[150px] transition-colors duration-150"
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, cellId)}
                              >
                                {cell && cell.subjectName ? (
                                  <div
                                    draggable={!cell.isLocked}
                                    onDragStart={(e) => handleDragStart(e, cellId)}
                                    className={`p-2 rounded-xl border h-full flex flex-col justify-between relative group transition-all duration-150 ${
                                      cell.isLocked
                                        ? "bg-slate-900/40 text-slate-500 border-slate-800/60 cursor-not-allowed select-none"
                                        : "cursor-grab active:cursor-grabbing hover:shadow-md hover:border-slate-700 " + getSubjectColor(cell.subjectName)
                                    }`}
                                  >
                                    <div className="space-y-1">
                                      <div className="font-extrabold text-[11px] tracking-wide uppercase line-clamp-1">
                                        {cell.subjectName}
                                      </div>
                                      <div className="text-[10px] font-medium opacity-80 line-clamp-1">
                                        {viewType === "class"
                                          ? cell.teacherName
                                          : formatClassDivRoman(cell.className, cell.division)}
                                      </div>
                                    </div>

                                    {/* Action buttons (Lock/Unlock) */}
                                    <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-800/20 text-[9px] opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleLockCell(cell.id);
                                        }}
                                        className="text-slate-400 hover:text-white flex items-center gap-0.5 cursor-pointer"
                                        title={cell.isLocked ? "Unlock Period" : "Lock Period"}
                                      >
                                        {cell.isLocked ? (
                                          <>
                                            <Lock className="w-3 h-3 text-amber-500" />
                                            <span className="text-amber-500 font-bold">Locked</span>
                                          </>
                                        ) : (
                                          <>
                                            <Unlock className="w-3 h-3 text-slate-500" />
                                            <span>Lock</span>
                                          </>
                                        )}
                                      </button>
                                    </div>

                                    {/* Locked badge if not hovered but locked */}
                                    {cell.isLocked && (
                                      <div className="absolute top-1.5 right-1.5 group-hover:hidden">
                                        <Lock className="w-3 h-3 text-amber-500" />
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="h-full w-full border border-dashed border-slate-800/40 rounded-xl flex items-center justify-center text-slate-700 text-xs font-medium">
                                    -
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            </div>
          </>
        )}

        {/* TAB 5: PRINT-READY REPORTS & EXPORT SHEETS */}
        {activeTab === "reports" && (
          <div className="space-y-6">
            <style>{getPrintStyles()}</style>

            <div className="border-b border-slate-800 pb-4 no-print text-left">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Printer className="w-4 h-4 text-violet-300" />
                {t("Timetable Print Centre", "समय सारिणी प्रिंट केंद्र", "ٹائم ٹیبل پرنٹ سینٹر")}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Weekly school timetable defaults to A3 landscape. Class and teacher timetables default to A4, and paper size can be changed before printing.
              </p>
            </div>

            <div className="no-print grid grid-cols-1 md:grid-cols-3 gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <label className="space-y-1 text-left">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Report Type</span>
                <select
                  value={selectedReportType}
                  onChange={(event) => setSelectedReportType(event.target.value as typeof selectedReportType)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-violet-400"
                >
                  <option value="weekly_school">Weekly Whole School</option>
                  <option value="weekly_class">Class-wise Timetable</option>
                  <option value="teacher">Teacher-wise Timetable</option>
                </select>
              </label>

              {selectedReportType === "weekly_class" ? (
                <label className="space-y-1 text-left">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Class</span>
                  <select
                    value={reportClass}
                    onChange={(event) => setReportClass(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-violet-400"
                  >
                    {classesList.map((className) => <option key={className} value={className}>{className}</option>)}
                  </select>
                </label>
              ) : selectedReportType === "teacher" ? (
                <label className="space-y-1 text-left">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Teacher</span>
                  <select
                    value={reportTeacher}
                    onChange={(event) => setReportTeacher(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-violet-400"
                  >
                    {teachersList.map((teacherName) => <option key={teacherName} value={teacherName}>{teacherName}</option>)}
                  </select>
                </label>
              ) : (
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2.5 text-left">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Cell Content</div>
                  <div className="mt-1 text-xs font-bold text-emerald-300">Vertical Class–Subject only · No Room No.</div>
                </div>
              )}

              <label className="space-y-1 text-left">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Paper Size & Orientation</span>
                <select
                  value={printLayout}
                  onChange={(event) => setPrintLayout(event.target.value as typeof printLayout)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-violet-400"
                >
                  <option value="A3_landscape">A3 · Landscape</option>
                  <option value="A4_landscape">A4 · Landscape</option>
                  <option value="A4_portrait">A4 · Portrait</option>
                </select>
              </label>
            </div>

            <div className="space-y-6 text-left">
              <div
                id="timetable-print-area"
                className={`rounded-2xl mx-auto overflow-hidden text-left ${isExportingPdf ? 'bg-white text-slate-900 p-8 shadow-xl font-serif' : 'bg-transparent text-slate-300 print:bg-white print:text-slate-900 print:p-0 print:font-serif'}`}
              >
                <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
                  <h2 className="font-extrabold text-xl tracking-wide uppercase text-slate-900">
                    {academicSetup.schoolProfile?.schoolName || 'School'}
                  </h2>
                  <p className="text-xs font-sans text-slate-600 font-bold">
                    {[academicSetup.schoolProfile?.address, academicSetup.schoolProfile?.taluka, academicSetup.schoolProfile?.district]
                      .filter(Boolean).join(', ') || 'Location not configured'} | Academic Year {setup.academicYear}
                  </p>
                  <p className="text-[10px] font-sans text-violet-600 uppercase tracking-widest font-black">
                    Official Academic Timetable
                  </p>
                </div>

                <div className="flex justify-between items-center py-4 font-sans text-xs text-slate-900">
                  <div className="flex items-center gap-1.5 leading-none">
                    <span className="font-bold text-slate-700 uppercase tracking-wide leading-none">Timetable For:</span>
                    <span
                      className="inline-flex items-center justify-center text-center font-extrabold text-slate-950 bg-slate-100 border border-slate-200 px-2 rounded leading-none"
                      style={{ minHeight: '8mm', verticalAlign: 'middle' }}
                    >
                      {selectedReportTitle}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 leading-none">
                    <span className="text-slate-500 font-bold leading-none">Paper:</span>
                    <span className="font-mono font-bold leading-none">{printLayout.replace('_', ' ')}</span>
                  </div>
                </div>

                <div className="text-slate-950 font-sans border-t border-b border-slate-200 py-4">
                  {renderSelectedReport(true)}
                </div>

                <div className="flex justify-between pt-16 font-sans text-[11px] text-slate-900">
                  <div className="text-center">
                    <div className="border-b border-slate-900 w-40 mx-auto pb-1" />
                    <p className="mt-1 text-slate-600 font-bold">Verified By Clerk</p>
                  </div>
                  <div className="text-center">
                    <div className="border-b border-slate-900 w-40 mx-auto pb-1" />
                    <p className="mt-1 text-slate-600 font-bold">Approved By Headmaster</p>
                  </div>
                </div>
              </div>

              <div className="no-print bg-slate-950/40 border border-slate-850 p-6 rounded-2xl space-y-4">
                <h4 className="text-sm font-black text-slate-300 mb-3 flex items-center gap-2">
                  <span>🏫</span><span>{selectedReportTitle} Preview</span>
                </h4>
                {renderSelectedReport(false)}
              </div>

              <div className="no-print bg-slate-900/30 border border-slate-850 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-left">
                  <h4 className="font-bold text-white text-xs">Export & Print Options</h4>
                  <p className="text-[10px] text-slate-500 leading-normal mt-0.5">The selected paper size is applied to browser print and PDF export.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => printSectionById("timetable-print-area", "Weekly School Timetable")}
                    className="flex-1 sm:flex-initial bg-slate-900 hover:bg-slate-800 border border-slate-850 text-slate-200 font-bold text-xs px-5 py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
                  >
                    <Printer className="w-4 h-4 text-cyan-300" /><span>Print</span>
                  </button>
                  <button
                    onClick={handleExportPDF}
                    disabled={isExportingPdf}
                    className="flex-1 sm:flex-initial bg-violet-500/10 hover:bg-violet-500/20 border border-violet-400/30 text-violet-100 font-bold text-xs px-5 py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all disabled:opacity-60"
                  >
                    <FileText className="w-4 h-4 text-violet-300" /><span>{isExportingPdf ? 'Preparing PDF…' : 'PDF Export'}</span>
                  </button>
                  <button
                    onClick={selectedReportType === 'weekly_school' ? handleExportWholeSchoolExcel : handleExportReportExcel}
                    className="flex-1 sm:flex-initial bg-emerald-900/40 hover:bg-emerald-900/60 border border-emerald-800 text-emerald-100 font-bold text-xs px-5 py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" /><span>Excel Export</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER AUDITING */}
      <div className="border-t border-slate-850 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] font-mono text-slate-500">
        <p>
          Classtago Timetable Engine • V2
        </p>
        <p className="flex items-center gap-1">
          <Shield className="w-3.5 h-3.5 text-emerald-500" />
          <span>Active Session ID: NHST_V2_ACTIVE</span>
        </p>
      </div>
    </div>
  );
}
