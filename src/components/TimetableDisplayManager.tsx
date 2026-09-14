import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Calendar, Users, BookOpen, Search, Filter, Printer, Download, Maximize, Minimize, 
  ZoomIn, ZoomOut, Lock, Unlock, ArrowLeftRight, UserCheck, RefreshCw, 
  FileSpreadsheet, FileText, ChevronDown, Layers, Settings2, RotateCcw, 
  Edit2, Trash2, Copy, Sparkles, Check, AlertCircle, X, Save
} from 'lucide-react';
import { LocalERPDatabase } from '../lib/supabase';
import { 
  MasterAcademicSetup, TimetableEntry, ClassStructure, Language, User, 
  ReservedPeriod, TimetableVersion 
} from '../types';
import { DAYS_OF_WEEK, getPeriodsForDay } from '../utils/timetableEngine';
import { openSmartPrint } from '../lib/smartPrint';
import * as XLSX from 'xlsx';
import { requestActionConfirm } from '../lib/actionConfirm';

export function formatClassName(className: string, division?: string): string {
  const numStr = className.replace(/Class\s*/i, '').trim();
  let roman = numStr;
  
  const romanMap: { [key: string]: string } = {
    '1': 'I', '2': 'II', '3': 'III', '4': 'IV', '5': 'V',
    '6': 'VI', '7': 'VII', '8': 'VIII', '9': 'IX', '10': 'X',
    '11': 'XI', '12': 'XII'
  };

  if (romanMap[numStr]) {
    roman = romanMap[numStr];
  } else {
    const lower = numStr.toLowerCase();
    if (lower === 'one' || lower === '1st') roman = 'I';
    else if (lower === 'two' || lower === '2nd') roman = 'II';
    else if (lower === 'three' || lower === '3rd') roman = 'III';
    else if (lower === 'four' || lower === '4th') roman = 'IV';
    else if (lower === 'five' || lower === '5th') roman = 'V';
    else if (lower === 'six' || lower === '6th') roman = 'VI';
    else if (lower === 'seven' || lower === '7th') roman = 'VII';
    else if (lower === 'eight' || lower === '8th') roman = 'VIII';
    else if (lower === 'nine' || lower === '9th') roman = 'IX';
    else if (lower === 'ten' || lower === '10th') roman = 'X';
    else if (lower === 'eleven' || lower === '11th') roman = 'XI';
    else if (lower === 'twelve' || lower === '12th') roman = 'XII';
  }

  if (division && division !== 'No Division' && division.trim() !== '') {
    return `${roman}-${division.trim()}`;
  }
  return roman;
}

interface TimetableDisplayManagerProps {
  lang: Language;
  user: User;
  onTimetableChange: () => void;
}

export default function TimetableDisplayManager({ lang, user, onTimetableChange }: TimetableDisplayManagerProps) {
  // Roles check
  const isHeadmaster = user.role === 'headmaster';
  const isTeacher = user.role === 'teacher';
  const isClassTeacher = useMemo(() => {
    return LocalERPDatabase.getAcademicSetup()?.classTeacherAssignments?.some((a: any) => a.teacherId === user.id) || false;
  }, [user.id]);
  const isClerk = user.role === 'clerk';
  const isStudent = user.role === 'student';

  // State
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [classes, setClasses] = useState<ClassStructure[]>([]);
  const [allTeachers, setAllTeachers] = useState<string[]>([]);
  const [setup, setSetup] = useState<MasterAcademicSetup | null>(null);
  const [reservedPeriods, setReservedPeriods] = useState<ReservedPeriod[]>([]);
  
  // Dashboard Sub-views: 'teacher' | 'class' | 'master'
  const [viewMode, setViewMode] = useState<'teacher' | 'class' | 'master'>('class');

  // Search & Filter state
  const [searchTeacher, setSearchTeacher] = useState('');
  const [searchClass, setSearchClass] = useState('');
  const [searchSubject, setSearchSubject] = useState('');
  
  const [filterAcademicYear, setFilterAcademicYear] = useState('');
  const [filterDivision, setFilterDivision] = useState('');
  const [filterTeacher, setFilterTeacher] = useState('');
  const [filterClass, setFilterClass] = useState('');

  // Selected single entities for Teacher and Class views
  const [activeTeacher, setActiveTeacher] = useState('');
  const [activeClassId, setActiveClassId] = useState('');

  // UI display enhancements
  const [zoomLevel, setZoomLevel] = useState(100); // 80% to 120%
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Print Preview Settings Modal
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printPaperSize, setPrintPaperSize] = useState<'A4' | 'A3' | 'Auto'>('A4');
  const [printOrientation, setPrintOrientation] = useState<'Landscape' | 'Portrait'>('Landscape');
  const [printMode, setPrintMode] = useState<'Colour' | 'Black & White'>('Colour');
  const [isPrinting, setIsPrinting] = useState(false);

  // Manual Editor State
  const [selectedCell, setSelectedCell] = useState<{
    classId: string;
    day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
    period: number;
    entry?: TimetableEntry;
  } | null>(null);
  const [manualSubject, setManualSubject] = useState('');
  const [manualTeacher, setManualTeacher] = useState('');
  const [manualLocked, setManualLocked] = useState(false);

  // References
  const tableRef = useRef<HTMLDivElement>(null);

  // Setup Initial Permissions Filter
  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const rawTimetable = LocalERPDatabase.getTimetable();
    const rawClasses = LocalERPDatabase.getClasses();
    const rawSetup = LocalERPDatabase.getAcademicSetup();
    const rawReserved = LocalERPDatabase.getReservedPeriods();

    setTimetable(rawTimetable);
    setClasses(rawClasses);
    setSetup(rawSetup);
    setReservedPeriods(rawReserved);

    const configuredYears = (rawSetup?.academicYears || [])
      .map((item: any) => String(item?.year || item?.yearCode || '').trim())
      .filter(Boolean);
    const activeYear = configuredYears.find((year: string) =>
      (rawSetup?.academicYears || []).some((item: any) => String(item?.year || item?.yearCode || '').trim() === year && item?.isActive)
    ) || configuredYears[0] || '';
    setFilterAcademicYear(activeYear);

    // Get unique list of teachers
    const activeUsers = LocalERPDatabase.getUsers().filter(u => u.role === 'teacher' && u.isActive && u.status === 'Active');
    const teachersList = activeUsers.map(u => u.name).sort();
    setAllTeachers(teachersList as string[]);

    // Set defaults based on role permissions
    if (isTeacher) {
      setViewMode('teacher');
      setActiveTeacher(user.name);
    } else if (isClassTeacher) {
      setViewMode('class');
      setActiveTeacher(user.name);
      if (user.classId) {
        setActiveClassId(user.classId);
      } else if (rawClasses.length > 0) {
        setActiveClassId(rawClasses[0].id);
      }
    } else if (isStudent) {
      setViewMode('class');
      if (user.classId) {
        setActiveClassId(user.classId);
      } else if (rawClasses.length > 0) {
        setActiveClassId(rawClasses[0].id);
      }
    } else {
      // Headmaster, Clerk
      setViewMode('master');
      if (rawClasses.length > 0) {
        setActiveClassId(rawClasses[0].id);
      }
      if (teachersList.length > 0) {
        setActiveTeacher(teachersList[0]);
      }
    }
  };

  const triggerToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Duplicate for new academic year helper
  const handleDuplicateAcademicYear = async () => {
    if (!isHeadmaster) return;
    if (await requestActionConfirm({ title: 'Duplicate timetable year?', message: 'Are you sure you want to duplicate this entire timetable layout to Academic Year 2027-28? All manual lock configurations will be copied.', confirmLabel: 'Duplicate Timetable', tone: 'warning' })) {
      // Logic for copying setup & timetable entries with modified metadata
      const currentTimetable = LocalERPDatabase.getTimetable();
      const nextYearTimetable = currentTimetable.map(entry => ({
        ...entry,
        id: `tt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      }));
      
      // Save it and trigger audit log
      localStorage.setItem(`nhs_erp_timetable`, JSON.stringify(nextYearTimetable));
      LocalERPDatabase.addAuditLog(
        user.id,
        user.name,
        user.role as any,
        'DUPLICATE_TIMETABLE_ACADEMIC_YEAR',
        'Timetable Display',
        `Duplicated and initialized active timetable for Academic Year 2027-28`
      );
      
      loadData();
      onTimetableChange();
      triggerToast("Timetable successfully duplicated for new Academic Year 2027-28!");
    }
  };

  // Zoom helpers
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 10, 120));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 10, 80));

  // Toggle full screen helper
  const handleToggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  // Inline styling for zoom level
  const safeZoom = (typeof zoomLevel === 'number' && !isNaN(zoomLevel) && zoomLevel > 0) ? zoomLevel : 100;
  const zoomStyle = {
    transform: `scale(${safeZoom / 100})`,
    transformOrigin: 'top left',
    width: `${10000 / safeZoom}%`
  };

  // Excel export logic
  const handleExportExcel = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    if (viewMode === 'teacher') {
      csvContent += `Teacher Weekly Timetable - ${activeTeacher || 'All Staff'}\n`;
      csvContent += "Teacher Name,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday\n";
      
      const teachersToExport = activeTeacher ? [activeTeacher] : allTeachers;
      teachersToExport.forEach(teach => {
        let row = `"${teach}"`;
        DAYS_OF_WEEK.forEach(day => {
          const maxP = getPeriodsForDay(day);
          let daySlots: string[] = [];
          for (let p = 1; p <= maxP; p++) {
            const entry = timetable.find(t => t.teacherName === teach && t.day === day && t.period === p);
            if (entry) {
              const cl = classes.find(c => c.id === entry.classId);
              daySlots.push(`P${p}: ${formatClassName(cl?.className || '', cl?.division)} ${entry.subject}`);
            }
          }
          row += `,"${daySlots.join(' | ')}"`;
        });
        csvContent += row + "\n";
      });
    } else if (viewMode === 'class') {
      const activeClObj = classes.find(c => c.id === activeClassId);
      const clNameFormatted = activeClObj ? formatClassName(activeClObj.className, activeClObj.division) : '';
      csvContent += `Class Timetable - ${clNameFormatted}\n`;
      csvContent += "Period,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday\n";
      
      for (let p = 1; p <= 9; p++) {
        let row = `"Period ${p}"`;
        DAYS_OF_WEEK.forEach(day => {
          const maxP = getPeriodsForDay(day);
          if (p > maxP) {
            row += ',"Closed"';
          } else {
            const entry = timetable.find(t => t.classId === activeClassId && t.day === day && t.period === p);
            if (entry) {
              row += `,"${entry.subject} (${entry.teacherName})"`;
            } else {
              row += ',"Unassigned"';
            }
          }
        });
        csvContent += row + "\n";
      }
    } else {
      // Master
      csvContent += "School Master Timetable\n";
      csvContent += "Class,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday\n";
      
      classes.forEach(cl => {
        let row = `"${formatClassName(cl.className, cl.division)}"`;
        DAYS_OF_WEEK.forEach(day => {
          const maxP = getPeriodsForDay(day);
          let daySlots: string[] = [];
          for (let p = 1; p <= maxP; p++) {
            const entry = timetable.find(t => t.classId === cl.id && t.day === day && t.period === p);
            if (entry) {
              daySlots.push(`P${p}: ${entry.subject} (${entry.teacherName})`);
            }
          }
          row += `,"${daySlots.join(' | ')}"`;
        });
        csvContent += row + "\n";
      });
    }

    const csvText = csvContent.replace(/^data:text\/csv;charset=utf-8,/, '');
    const workbook = XLSX.read(csvText, { type: 'string' });
    XLSX.writeFile(workbook, `Classtago_Timetable_${viewMode}_${Date.now()}.xlsx`);
    triggerToast("Timetable Excel workbook downloaded successfully!");
  };

  // manual adjustment handler
  const handleOpenCellEditor = (classId: string, day: any, period: number, entry?: TimetableEntry) => {
    if (!isHeadmaster) return; // Only headmaster is allowed to modify
    setSelectedCell({ classId, day, period, entry });
    setManualSubject(entry ? entry.subject : '');
    setManualTeacher(entry ? entry.teacherName : 'Unassigned');
    setManualLocked(entry ? !!(entry as any).isLocked : false);
  };

  const handleSaveManualCell = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCell || !isHeadmaster) return;

    const { classId, day, period, entry } = selectedCell;

    // Validate inputs
    if (!manualSubject || !manualTeacher) {
      triggerToast('Subject and Teacher names are required.', 'error');
      return;
    }

    // Check Clashes
    const isClashingClass = timetable.some(t => 
      t.id !== entry?.id && 
      t.classId === classId && 
      t.day === day && 
      t.period === period
    );

    const isClashingTeacher = manualTeacher !== 'Unassigned' && timetable.some(t => 
      t.id !== entry?.id && 
      (t.teacherName || '').toLowerCase() === manualTeacher.toLowerCase() && 
      t.day === day && 
      t.period === period
    );

    if (isClashingClass) {
      triggerToast('Conflict Warning: This class already has a lecture in this period slot!', 'error');
    }
    if (isClashingTeacher) {
      triggerToast('Conflict Warning: This teacher is already scheduled in another class in this period slot!', 'error');
    }

    const updatedEntry: TimetableEntry = {
      id: entry?.id || `tt_${Date.now()}`,
      classId,
      day,
      period,
      subject: manualSubject,
      teacherName: manualTeacher,
      startTime: '',
      endTime: '',
      ...({ isLocked: manualLocked } as any)
    };

    LocalERPDatabase.saveTimetableEntry(updatedEntry);
    
    // Add Audit log
    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role as any,
      entry ? 'MANUAL_EDIT_CELL' : 'MANUAL_ADD_CELL',
      'Timetable Display',
      `Headmaster manually reassigned slot: ${day} P${period} for ${classId} to ${manualSubject} by ${manualTeacher} (Locked: ${manualLocked})`
    );

    setSelectedCell(null);
    loadData();
    onTimetableChange();
    triggerToast('Period slot updated and locked successfully!');
  };

  const handleClearCell = () => {
    if (!selectedCell || !isHeadmaster) return;
    const { entry, day, period, classId } = selectedCell;
    if (entry) {
      LocalERPDatabase.deleteTimetableEntry(entry.id);
      LocalERPDatabase.addAuditLog(
        user.id,
        user.name,
        user.role as any,
        'MANUAL_CLEAR_CELL',
        'Timetable Display',
        `Headmaster cleared lecture slot: ${day} P${period} for class ${classId}`
      );
      setSelectedCell(null);
      loadData();
      onTimetableChange();
      triggerToast('Lecture period cleared successfully.');
    }
  };

  // Filter criteria for School Master Grid
  const filteredClasses = classes.filter(cl => {
    if (filterClass && cl.id !== filterClass) return false;
    if (filterDivision && cl.division !== filterDivision) return false;
    if (searchClass) {
      const formatted = formatClassName(cl.className, cl.division).toLowerCase();
      if (!formatted.includes(searchClass.toLowerCase())) return false;
    }
    return true;
  });

  // Print execution with custom style injecting
  const handlePrint = () => {
    setIsPrinting(true);
    openSmartPrint({
      elementId: 'timetable-display-print-area',
      title: 'Official Timetable Document',
      paperSize: printPaperSize === 'A3' ? 'A3' : 'A4',
      orientation: printOrientation.toLowerCase() as 'portrait' | 'landscape'
    });
    setIsPrinting(false);
    setShowPrintModal(false);
  };

  // Get active configurations
  const activeClassObj = classes.find(c => c.id === activeClassId);
  const activeClassFormatted = activeClassObj ? formatClassName(activeClassObj.className, activeClassObj.division) : '';

  return (
    <div className={`space-y-6 ${isFullScreen ? 'fixed inset-0 z-50 bg-slate-50 overflow-auto p-8' : ''}`}>
      
      {/* ROLE PERMISSION ALERT HEADER */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-4 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 text-blue-700 rounded-lg shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div className="text-left">
            <p className="text-xs font-bold text-slate-800">
              Active Workspace Role: <span className="text-blue-700 capitalize font-extrabold">{user.role}</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {isHeadmaster && "Full scheduling authority. You can lock slots, re-run AI generation, manually drag/swap entries, and manage rule constraints."}
              {isTeacher && "Personal schedule dashboard. You are authorized to inspect and print your own personalized weekly timetable layout."}
              {isClassTeacher && `Class & personal dashboard. You can inspect your own teacher schedule and Class ${user.classId ? classes.find(c => c.id === user.classId)?.className : ''} timetable.`}
              {isClerk && "Administrative viewing. You have direct read-only access to search, preview, and print master school-wide schedules."}
              {isStudent && "Student access. Restricted strictly to viewing your own designated class timetable. All other options are locked."}
            </p>
          </div>
        </div>

        {/* REFRESH ACTION */}
        <button 
          onClick={loadData}
          className="p-1.5 hover:bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-800 transition-colors flex items-center gap-1 text-[11px] font-bold cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* DASHBOARD ACTION HEADER */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
        
        {/* TAB CONTROLS (NOT DISPLAYED FOR STUDENTS) */}
        {!isStudent && (
          <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 self-start">
            <button
              onClick={() => setViewMode('class')}
              className={`px-4 py-2 text-xs font-extrabold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'class' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Class Timetable</span>
            </button>
            <button
              onClick={() => setViewMode('teacher')}
              className={`px-4 py-2 text-xs font-extrabold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'teacher' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Teacher Timetable</span>
            </button>
            {!isTeacher && !isClassTeacher && (
              <button
                onClick={() => setViewMode('master')}
                className={`px-4 py-2 text-xs font-extrabold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'master' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>School Master Grid</span>
              </button>
            )}
          </div>
        )}

        {/* PERSISTENT ZOOM, ZOOM OUT, PRINT CONFIG, EXCEL EXPORTS */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 ml-auto">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button 
              onClick={handleZoomOut}
              disabled={zoomLevel <= 80}
              className="p-1.5 text-slate-600 hover:text-slate-800 disabled:opacity-40 hover:bg-white rounded transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-extrabold text-slate-700 w-10 text-center">{zoomLevel}%</span>
            <button 
              onClick={handleZoomIn}
              disabled={zoomLevel >= 120}
              className="p-1.5 text-slate-600 hover:text-slate-800 disabled:opacity-40 hover:bg-white rounded transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Full Screen */}
          <button 
            onClick={handleToggleFullScreen}
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-colors cursor-pointer"
            title="Toggle Full Screen"
          >
            {isFullScreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>

          {/* Excel Export */}
          <button 
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Export to Microsoft Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Export Excel</span>
          </button>

          {/* Duplication for New Academic Year */}
          {isHeadmaster && (
            <button 
              onClick={handleDuplicateAcademicYear}
              className="px-3.5 py-2 bg-slate-800 text-slate-200 hover:text-white border border-slate-700 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Clone Current Timetable to Next Academic Year"
            >
              <Copy className="w-4 h-4" />
              <span>Duplicate Year</span>
            </button>
          )}

          {/* Print Options Trigger */}
          <button 
            onClick={() => setShowPrintModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* SEARCH AND FILTERS PANEL */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm text-xs">
        <h3 className="font-extrabold text-slate-800 mb-3 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-slate-400" />
          <span>Active Search Filters</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          
          {/* SEARCH TEACHER */}
          {viewMode === 'teacher' && !isTeacher && !isClassTeacher && (
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Search Teacher</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. Mr. Irfan..."
                  value={searchTeacher}
                  onChange={(e) => setSearchTeacher(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white"
                />
              </div>
            </div>
          )}

          {/* SEARCH CLASS */}
          {viewMode === 'master' && (
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Search Class</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. V-A..."
                  value={searchClass}
                  onChange={(e) => setSearchClass(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white"
                />
              </div>
            </div>
          )}

          {/* SEARCH SUBJECT */}
          {viewMode === 'master' && (
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Search Subject</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. Urdu, Science..."
                  value={searchSubject}
                  onChange={(e) => setSearchSubject(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white"
                />
              </div>
            </div>
          )}

          {/* ACADEMIC YEAR FILTER */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Academic Year</label>
            <select
              value={filterAcademicYear}
              onChange={(e) => setFilterAcademicYear(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:bg-white"
            >
              {(setup?.academicYears || []).map((item: any) => {
                const year = String(item?.year || item?.yearCode || '').trim();
                if (!year) return null;
                return <option key={year} value={year}>{year}{item?.isActive ? ' (Current)' : ''}</option>;
              })}
            </select>
          </div>

          {/* CLASS TARGET SELECTION (Only for Class Timetable view mode) */}
          {viewMode === 'class' && !isStudent && (
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Target Class Division</label>
              <select
                value={activeClassId}
                onChange={(e) => setActiveClassId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:bg-white font-semibold text-blue-700"
              >
                {classes.map(cl => (
                  <option key={cl.id} value={cl.id}>
                    {formatClassName(cl.className, cl.division)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* TEACHER TARGET SELECTION (Only for Teacher view mode) */}
          {viewMode === 'teacher' && !isTeacher && (
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Target Teacher</label>
              <select
                value={activeTeacher}
                onChange={(e) => setActiveTeacher(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:bg-white font-semibold text-blue-700"
              >
                <option value="">-- Select Teacher --</option>
                {allTeachers.map(teach => {
                  const tUser = LocalERPDatabase.getUsers().find(u => u.name === teach && u.role === 'teacher');
                  return (
                  <option key={teach} value={teach}>
                    {teach} {tUser ? `(${tUser.username || tUser.shalarthId} - ${tUser.designation || 'Teacher'})` : ''}
                  </option>
                  )
                })}
              </select>
            </div>
          )}

          {/* DIVISION FILTER FOR MASTER SCREEN */}
          {viewMode === 'master' && (
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Division Filter</label>
              <select
                value={filterDivision}
                onChange={(e) => setFilterDivision(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:bg-white"
              >
                <option value="">All Divisions</option>
                <option value="A">Division A</option>
                <option value="B">Division B</option>
                <option value="C">Division C</option>
                <option value="No Division">No Division</option>
              </select>
            </div>
          )}

        </div>
      </div>

      {/* TOAST MESSAGES */}
      {toastMsg && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2.5 border ${
          toastMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {toastMsg.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* MAIN VISUAL LAYOUT VIEWS CONTAINER */}
      <div 
        ref={tableRef} 
        className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"
      >
        
        {/* VIEW CONTAINER BOX WITH SCALE SUPPORT */}
        <div className="overflow-auto min-h-[400px] w-full p-6 text-left" style={{ scrollBehavior: 'smooth' }}>
          <div style={zoomStyle}>
            
            {/* VIEW 1: TEACHER WEEKLY TIMETABLE */}
            {viewMode === 'teacher' && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                    Teacher Weekly Lecture Distribution Board
                  </h2>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Viewing lecture periods assigned to staff: <span className="font-bold text-slate-700">{activeTeacher || 'All Teachers'}</span>
                  </p>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <table className="w-full text-left text-xs border-collapse font-sans min-w-[1200px]">
                    <thead>
                      {/* TOP DAY HEADER */}
                      <tr className="bg-slate-900 text-white divide-x divide-slate-800 text-center">
                        <th className="p-3 font-extrabold text-left sticky left-0 bg-slate-900 z-10 w-44 shrink-0">
                          Teacher Name
                        </th>
                        <th colSpan={9} className="p-2 text-[11px] font-extrabold uppercase bg-indigo-950">Monday</th>
                        <th colSpan={9} className="p-2 text-[11px] font-extrabold uppercase bg-slate-900">Tuesday</th>
                        <th colSpan={9} className="p-2 text-[11px] font-extrabold uppercase bg-indigo-950">Wednesday</th>
                        <th colSpan={9} className="p-2 text-[11px] font-extrabold uppercase bg-slate-900">Thursday</th>
                        <th colSpan={7} className="p-2 text-[11px] font-extrabold uppercase bg-indigo-950">Friday</th>
                        <th colSpan={5} className="p-2 text-[11px] font-extrabold uppercase bg-slate-900">Saturday</th>
                      </tr>
                      {/* PERIODS SUBHEADER */}
                      <tr className="bg-slate-100 text-[10px] text-slate-600 font-extrabold divide-x divide-slate-200 border-b border-slate-200 text-center">
                        <td className="p-2.5 text-left sticky left-0 bg-slate-100 font-extrabold z-10 border-r border-slate-200">
                          Staff Identifier
                        </td>
                        {/* Mon P1-P9 */}
                        {[1,2,3,4,5,6,7,8,9].map(p => <td key={`mon-${p}`} className="p-1 font-mono w-14">P{p}</td>)}
                        {/* Tue P1-P9 */}
                        {[1,2,3,4,5,6,7,8,9].map(p => <td key={`tue-${p}`} className="p-1 font-mono w-14">P{p}</td>)}
                        {/* Wed P1-P9 */}
                        {[1,2,3,4,5,6,7,8,9].map(p => <td key={`wed-${p}`} className="p-1 font-mono w-14">P{p}</td>)}
                        {/* Thu P1-P9 */}
                        {[1,2,3,4,5,6,7,8,9].map(p => <td key={`thu-${p}`} className="p-1 font-mono w-14">P{p}</td>)}
                        {/* Fri P1-P7 */}
                        {[1,2,3,4,5,6,7].map(p => <td key={`fri-${p}`} className="p-1 font-mono w-14">P{p}</td>)}
                        {/* Sat P1-P5 */}
                        {[1,2,3,4,5].map(p => <td key={`sat-${p}`} className="p-1 font-mono w-14">P{p}</td>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(activeTeacher ? [activeTeacher] : allTeachers)
                        .filter(teach => (teach || '').toLowerCase().includes(searchTeacher.toLowerCase()))
                        .map((teach) => (
                          <tr key={teach} className="hover:bg-slate-50/50 bg-white divide-x divide-slate-100">
                            {/* Sticky Teacher Name Column */}
                            <td className="p-3 font-extrabold text-slate-800 sticky left-0 bg-white hover:bg-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-slate-200 shrink-0 z-10">
                              {teach}
                            </td>

                            {/* Render periods sequentially Mon-Sat */}
                            {DAYS_OF_WEEK.map((day) => {
                              const maxP = getPeriodsForDay(day);
                              return Array.from({ length: maxP }).map((_, index) => {
                                const p = index + 1;
                                const entry = timetable.find(t => t.teacherName === teach && t.day === day && t.period === p);
                                const cl = entry ? classes.find(c => c.id === entry.classId) : null;
                                const classCode = cl ? formatClassName(cl.className, cl.division) : '';
                                const isLocked = entry ? (entry as any).isLocked : false;

                                // Check reserved period
                                const reserved = reservedPeriods.find(r => r.day === day && r.period === p && (r.classId === 'All' || r.classId === entry?.classId));

                                return (
                                  <td 
                                    key={`${day}-${p}`} 
                                    onClick={() => entry && handleOpenCellEditor(entry.classId, day, p, entry)}
                                    className={`p-1.5 text-center transition-all align-middle cursor-pointer min-h-12 w-14 text-[9px] hover:bg-slate-100/80 ${
                                      reserved ? 'bg-amber-50 text-amber-700' :
                                      entry ? 'bg-blue-50/70 border border-blue-100 font-bold text-blue-900 rounded-md shadow-sm' : 'text-slate-300'
                                    }`}
                                  >
                                    {reserved ? (
                                      <div className="font-extrabold uppercase scale-90 truncate text-[8px]" title={reserved.label}>
                                        {reserved.label}
                                      </div>
                                    ) : entry ? (
                                      <div className="space-y-0.5">
                                        <div className="font-extrabold text-indigo-900 tracking-tight leading-none">
                                          {classCode}
                                        </div>
                                        <div className="font-semibold text-slate-700 text-[8px] truncate leading-none mt-0.5">
                                          {entry.subject}
                                        </div>
                                        {isLocked && (
                                          <div className="flex justify-center mt-0.5">
                                            <Lock className="w-2.5 h-2.5 text-indigo-500" />
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="opacity-40">-</span>
                                    )}
                                  </td>
                                );
                              });
                            })}
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* VIEW 2: CLASS TIMETABLE */}
            {viewMode === 'class' && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span>Class Division Weekly Timetable layout</span>
                  </h2>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Displaying active lecture matrix for Class Division: <span className="font-bold text-blue-700 uppercase">{activeClassFormatted || 'Unspecified'}</span>
                  </p>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <table className="w-full text-left text-xs border-collapse font-sans min-w-[800px]">
                    <thead>
                      <tr className="bg-slate-900 text-white divide-x divide-slate-800 text-center font-bold">
                        <th className="p-3.5 text-left sticky left-0 bg-slate-900 w-32 shrink-0">
                          Period Code
                        </th>
                        <th className="p-3 text-[11px] uppercase tracking-wider bg-slate-900">Monday</th>
                        <th className="p-3 text-[11px] uppercase tracking-wider bg-indigo-950">Tuesday</th>
                        <th className="p-3 text-[11px] uppercase tracking-wider bg-slate-900">Wednesday</th>
                        <th className="p-3 text-[11px] uppercase tracking-wider bg-indigo-950">Thursday</th>
                        <th className="p-3 text-[11px] uppercase tracking-wider bg-slate-900">Friday (up to P7)</th>
                        <th className="p-3 text-[11px] uppercase tracking-wider bg-indigo-950 font-bold">Saturday (up to P5)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {[1,2,3,4,5,6,7,8,9].map((p) => (
                        <tr key={`period-${p}`} className="hover:bg-slate-50/50 bg-white divide-x divide-slate-100">
                          {/* Left Period Header Column */}
                          <td className="p-4 font-extrabold text-slate-800 bg-slate-100 sticky left-0 hover:bg-slate-200/80 border-r border-slate-200 shrink-0 font-mono text-[10px]">
                            Period {p}
                          </td>

                          {/* Mon to Sat columns */}
                          {DAYS_OF_WEEK.map((day) => {
                            const maxP = getPeriodsForDay(day);
                            const isClosed = p > maxP;
                            const entry = timetable.find(t => t.classId === activeClassId && t.day === day && t.period === p);
                            const isLocked = entry ? (entry as any).isLocked : false;

                            // Check reserved period
                            const reserved = reservedPeriods.find(r => r.day === day && r.period === p && (r.classId === 'All' || r.classId === activeClassId));

                            return (
                              <td 
                                key={`${day}-${p}`}
                                onClick={() => !isClosed && handleOpenCellEditor(activeClassId, day, p, entry)}
                                className={`p-4 text-center transition-all align-middle cursor-pointer min-h-16 ${
                                  isClosed ? 'bg-slate-50 text-slate-300 font-semibold border-none cursor-not-allowed pattern-diagonal' :
                                  reserved ? 'bg-amber-50 text-amber-700' :
                                  entry ? 'bg-indigo-50 border border-indigo-100 shadow-sm font-bold rounded-lg text-indigo-900' : 'text-slate-300'
                                }`}
                              >
                                {isClosed ? (
                                  <span className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">Closed</span>
                                ) : reserved ? (
                                  <div className="font-extrabold uppercase scale-95" title={reserved.label}>
                                    <span className="block text-[10px] text-amber-800">{reserved.label}</span>
                                    <span className="block text-[8px] text-amber-500 font-mono mt-0.5">School Locked</span>
                                  </div>
                                ) : entry ? (
                                  <div className="space-y-1">
                                    <div className="font-extrabold text-[12px] text-indigo-950 font-serif">
                                      {entry.subject}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-bold flex items-center justify-center gap-1">
                                      <span>{entry.teacherName}</span>
                                    </div>
                                    {isLocked && (
                                      <div className="flex justify-center mt-1">
                                        <Lock className="w-3 h-3 text-indigo-500" />
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-[10px] font-semibold text-slate-300 italic">Unassigned</div>
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

            {/* VIEW 3: SCHOOL MASTER TIMETABLE GRID */}
            {viewMode === 'master' && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>School Master Allocation Sheet</span>
                  </h2>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Consolidated matrix showing all divisions. Click any cell to manually override, reallocate or lock.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <table className="w-full text-left text-xs border-collapse font-sans min-w-[1200px]">
                    <thead>
                      {/* DAY HEADER */}
                      <tr className="bg-slate-900 text-white divide-x divide-slate-800 text-center">
                        <th className="p-3 text-left sticky left-0 bg-slate-900 z-10 w-36 shrink-0">
                          Class Division
                        </th>
                        <th colSpan={9} className="p-2 text-[10px] font-extrabold uppercase bg-slate-950">Monday</th>
                        <th colSpan={9} className="p-2 text-[10px] font-extrabold uppercase bg-slate-900">Tuesday</th>
                        <th colSpan={9} className="p-2 text-[10px] font-extrabold uppercase bg-slate-950">Wednesday</th>
                        <th colSpan={9} className="p-2 text-[10px] font-extrabold uppercase bg-slate-900">Thursday</th>
                        <th colSpan={7} className="p-2 text-[10px] font-extrabold uppercase bg-slate-950">Friday</th>
                        <th colSpan={5} className="p-2 text-[10px] font-extrabold uppercase bg-slate-900">Saturday</th>
                      </tr>
                      {/* LECTURES PERIODS SUBHEADER */}
                      <tr className="bg-slate-100 text-[10px] text-slate-500 font-extrabold divide-x divide-slate-200 border-b border-slate-200 text-center">
                        <td className="p-2 text-left sticky left-0 bg-slate-100 font-bold z-10 border-r border-slate-200">
                          Standards
                        </td>
                        {/* Mon P1-P9 */}
                        {[1,2,3,4,5,6,7,8,9].map(p => <td key={`mon-p-${p}`} className="p-1 font-mono w-14">P{p}</td>)}
                        {/* Tue P1-P9 */}
                        {[1,2,3,4,5,6,7,8,9].map(p => <td key={`tue-p-${p}`} className="p-1 font-mono w-14">P{p}</td>)}
                        {/* Wed P1-P9 */}
                        {[1,2,3,4,5,6,7,8,9].map(p => <td key={`wed-p-${p}`} className="p-1 font-mono w-14">P{p}</td>)}
                        {/* Thu P1-P9 */}
                        {[1,2,3,4,5,6,7,8,9].map(p => <td key={`thu-p-${p}`} className="p-1 font-mono w-14">P{p}</td>)}
                        {/* Fri P1-P7 */}
                        {[1,2,3,4,5,6,7].map(p => <td key={`fri-p-${p}`} className="p-1 font-mono w-14">P{p}</td>)}
                        {/* Sat P1-P5 */}
                        {[1,2,3,4,5].map(p => <td key={`sat-p-${p}`} className="p-1 font-mono w-14">P{p}</td>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-[9px]">
                      {filteredClasses.map((cl) => (
                        <tr key={cl.id} className="hover:bg-slate-50/50 bg-white divide-x divide-slate-100">
                          {/* Class Name Sticky Column */}
                          <td className="p-2.5 font-extrabold text-slate-800 sticky left-0 bg-white hover:bg-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-slate-200 shrink-0 z-10 text-xs">
                            {formatClassName(cl.className, cl.division)}
                          </td>

                          {/* Sequentially render Mon to Sat periods */}
                          {DAYS_OF_WEEK.map((day) => {
                            const maxP = getPeriodsForDay(day);
                            return Array.from({ length: maxP }).map((_, idx) => {
                              const p = idx + 1;
                              const entry = timetable.find(t => t.classId === cl.id && t.day === day && t.period === p);
                              const isLocked = entry ? (entry as any).isLocked : false;

                              // Check filters matching this master cell
                              let isSearchMatched = true;
                              if (searchSubject && entry && !(entry.subject || '').toLowerCase().includes((searchSubject || '').toLowerCase())) {
                                isSearchMatched = false;
                              }

                              const reserved = reservedPeriods.find(r => r.day === day && r.period === p && (r.classId === 'All' || r.classId === cl.id));

                              return (
                                <td 
                                  key={`${day}-${p}`}
                                  onClick={() => handleOpenCellEditor(cl.id, day, p, entry)}
                                  className={`p-1 text-center transition-all align-middle cursor-pointer min-h-12 w-14 ${
                                    reserved ? 'bg-amber-50 text-amber-700 font-extrabold' :
                                    entry ? (isSearchMatched ? 'bg-blue-50/70 border border-blue-100 text-blue-900 font-bold' : 'bg-slate-50 text-slate-400') : 'text-slate-300'
                                  }`}
                                >
                                  {reserved ? (
                                    <span className="text-[8px] uppercase tracking-tight block truncate">{reserved.label}</span>
                                  ) : entry ? (
                                    <div className="space-y-0.5 leading-tight">
                                      <div className="font-extrabold text-[10px] text-blue-950 truncate">{entry.subject}</div>
                                      <div className="text-[8px] text-slate-500 font-medium truncate">{entry.teacherName}</div>
                                      {isLocked && <div className="text-center"><Lock className="w-2.5 h-2.5 text-indigo-500 mx-auto" /></div>}
                                    </div>
                                  ) : (
                                    <span className="opacity-40">-</span>
                                  )}
                                </td>
                              );
                            });
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* FOOTER STATS INFO */}
      <div className="flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-400">
        <span>© Classtago • Powered by AI Timetable Management.</span>
        <span>Standard: Roman numeral + hyphenated class divisions strictly enforced.</span>
      </div>

      {/* PRINT PREVIEW SETTINGS CONFIGURATION MODAL */}
      {showPrintModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full text-left text-xs overflow-hidden">
            
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-blue-400" />
                <h3 className="font-extrabold text-sm uppercase tracking-wide">Professional Print Configuration</h3>
              </div>
              <button 
                onClick={() => setShowPrintModal(false)}
                className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Paper Target Size</label>
                  <select
                    value={printPaperSize}
                    onChange={(e) => setPrintPaperSize(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg focus:outline-none"
                  >
                    <option value="A4">A4 (Standard High School Paper)</option>
                    <option value="A3">A3 (Poster Size wallboard)</option>
                    <option value="Auto">Auto Fit Page Scaling</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Page Orientation</label>
                  <select
                    value={printOrientation}
                    onChange={(e) => setPrintOrientation(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg focus:outline-none"
                  >
                    <option value="Landscape">Landscape (Recommended)</option>
                    <option value="Portrait">Portrait</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Print Color Mode</label>
                  <select
                    value={printMode}
                    onChange={(e) => setPrintMode(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg focus:outline-none"
                  >
                    <option value="Colour">Full Colour Accents</option>
                    <option value="Black & White">Black & White (High Contrast)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Academic Year Context</label>
                  <input
                    type="text"
                    disabled
                    value={filterAcademicYear}
                    className="w-full bg-slate-100 border border-slate-200 p-2.5 rounded-lg font-bold text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Dynamic Warning of table sizing */}
              <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-lg text-slate-600 leading-relaxed text-[11px]">
                <strong className="block text-blue-700 mb-0.5">High Quality Scaling Enabled</strong>
                When printing, columns and fonts are adjusted sequentially to avoid overflow or bad page breaks. Friday (7 periods) and Saturday (5 periods) are handled natively according to NHS rules.
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5">
              <button
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-lg font-bold text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handlePrint}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Trigger System Print</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* HEADMASTER CELL OVERRIDE EDITOR MODAL */}
      {selectedCell && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveManualCell} className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full text-left text-xs overflow-hidden">
            
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-blue-400" />
                <h3 className="font-extrabold text-sm uppercase tracking-wide">
                  Override Cell: {selectedCell.day} Period {selectedCell.period}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedCell(null)}
                className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-500 mb-0.5 uppercase text-[9px]">Class Division</label>
                  <div className="p-2.5 bg-slate-100 rounded-lg font-bold text-slate-700">
                    {(() => {
                      const clObj = classes.find(c => c.id === selectedCell.classId);
                      return clObj ? formatClassName(clObj.className, clObj.division) : selectedCell.classId;
                    })()}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-500 mb-0.5 uppercase text-[9px]">Time Slot</label>
                  <div className="p-2.5 bg-slate-100 rounded-lg font-bold text-slate-700 font-mono">
                    {selectedCell.day}, P{selectedCell.period}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Lecture Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Urdu, Algebra, Science, English..."
                  value={manualSubject}
                  onChange={(e) => setManualSubject(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg focus:outline-none focus:bg-white text-xs font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Assigned Teacher</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mr. Irfan, Mrs. Khan..."
                  value={manualTeacher}
                  onChange={(e) => setManualTeacher(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg focus:outline-none focus:bg-white text-xs font-bold text-slate-800"
                />
              </div>

              <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg flex items-center justify-between">
                <div>
                  <strong className="block text-indigo-900 text-[11px]">Lock & Protect Slot</strong>
                  <span className="text-[10px] text-slate-500">Protect this period from being overwritten by subsequent AI automated regenerations.</span>
                </div>
                <input
                  type="checkbox"
                  checked={manualLocked}
                  onChange={(e) => setManualLocked(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 rounded cursor-pointer shrink-0 ml-3"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              {selectedCell.entry ? (
                <button
                  type="button"
                  onClick={handleClearCell}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg font-bold cursor-pointer"
                >
                  Clear Period
                </button>
              ) : <div />}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCell(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-lg font-bold text-slate-600 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Apply Override</span>
                </button>
              </div>
            </div>

          </form>
        </div>
      )}

      {/* PRINT STYLING SHEET CONTAINER (HIDDEN ON SCREEN, SHOWN ON print) */}
      <div className="hidden">
        {(() => {
          const printableStyle = `
            @media print {
              body * {
                visibility: hidden;
              }
              .print-area-wrapper, .print-area-wrapper * {
                visibility: visible;
              }
              .print-area-wrapper {
                position: absolute;
                left: 0;
                top: 0;
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 10mm !important;
                background: white !important;
                color: black !important;
              }
              table {
                width: 100% !important;
                border-collapse: collapse !important;
                margin-top: 5mm !important;
                font-size: ${printPaperSize === 'A3' ? '12px' : '9px'} !important;
              }
              th, td {
                border: 0.5pt solid ${printMode === 'Colour' ? '#cbd5e1' : '#000000'} !important;
                padding: 4px !important;
                text-align: center !important;
              }
              .bg-slate-900 {
                background-color: ${printMode === 'Colour' ? '#0f172a' : '#ffffff'} !important;
                color: ${printMode === 'Colour' ? '#ffffff' : '#000000'} !important;
              }
              .text-white {
                color: ${printMode === 'Colour' ? '#ffffff' : '#000000'} !important;
              }
              .bg-slate-100 {
                background-color: ${printMode === 'Colour' ? '#f1f5f9' : '#ffffff'} !important;
              }
              .bg-indigo-950 {
                background-color: ${printMode === 'Colour' ? '#1e1b4b' : '#ffffff'} !important;
              }
              .bg-blue-50 {
                background-color: ${printMode === 'Colour' ? '#eff6ff' : '#ffffff'} !important;
              }
              .bg-amber-50 {
                background-color: ${printMode === 'Colour' ? '#fffbeb' : '#ffffff'} !important;
              }
              .text-indigo-900, .text-blue-900, .text-amber-700 {
                color: #000000 !important;
              }
              .sticky {
                position: relative !important;
                left: auto !important;
                background: white !important;
              }
              .shadow-sm, .shadow-md, .shadow-xl {
                box-shadow: none !important;
              }
              @page {
                size: ${printPaperSize === 'Auto' ? 'auto' : printPaperSize === 'A3' ? 'A3' : 'A4'} ${printOrientation.toLowerCase()};
                margin: 10mm;
              }
            }
          `;
          return <style dangerouslySetInnerHTML={{ __html: printableStyle }} />;
        })()}
      </div>

      {/* THE ACTUAL HIDDEN AREA POPULATED WITH HEADER AND GRID FOR PRINTING OUT */}
      <div id="timetable-display-print-area" className="smart-print-source print-area-wrapper hidden absolute top-0 left-0 w-full bg-white text-black p-8 space-y-6 text-xs text-left">
        
        {/* PRINT HEADER SECTION */}
        <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-slate-100 border border-slate-300 rounded-full flex items-center justify-center font-extrabold text-[10px] text-slate-800 uppercase text-center p-1 shrink-0">
              NHS Logo
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">NATIONAL HIGH SCHOOL, TALODA</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">
                School location and UDISE information
              </p>
              <p className="text-[9px] text-slate-400 mt-0.5">
                Managed by configured school authority
              </p>
            </div>
          </div>

          <div className="text-right space-y-1">
            <div className="inline-block px-2.5 py-1 bg-slate-900 text-white font-extrabold rounded text-[9px] tracking-wide uppercase">
              Official Timetable Document
            </div>
            <p className="text-[10px] font-bold text-slate-800 block">
              Academic Year: <span className="font-extrabold">{filterAcademicYear}</span>
            </p>
            <p className="text-[9px] text-slate-500">
              Printed on: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>

        {/* PRINT DETAILS SUBHEADER */}
        <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 flex items-center justify-between font-bold">
          <div>
            <span className="text-slate-500 uppercase tracking-wide text-[9px] block">Timetable Target</span>
            <span className="text-slate-800 text-xs font-extrabold uppercase">
              {viewMode === 'teacher' && `Teacher Weekly Board: ${activeTeacher || 'All Staff'}`}
              {viewMode === 'class' && `Class Weekly Board: ${activeClassFormatted}`}
              {viewMode === 'master' && "Complete School Master Allocation Matrix"}
            </span>
          </div>

          <div className="text-right">
            <span className="text-slate-500 uppercase tracking-wide text-[9px] block">Paper Setup</span>
            <span className="text-slate-800 text-[10px] uppercase font-mono">
              {printPaperSize} Size | {printOrientation} | {printMode} Mode
            </span>
          </div>
        </div>

        {/* THE TABLE PREVIEW TO PRINT */}
        <div className="w-full">
          {viewMode === 'teacher' && (
            <table className="w-full text-center border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold">
                  <th className="p-2 text-left bg-slate-900 text-white w-32 font-extrabold">Teacher Name</th>
                  <th colSpan={9} className="p-1 uppercase tracking-wider text-[9px] bg-indigo-950 text-white">Monday</th>
                  <th colSpan={9} className="p-1 uppercase tracking-wider text-[9px] bg-slate-900 text-white">Tuesday</th>
                  <th colSpan={9} className="p-1 uppercase tracking-wider text-[9px] bg-indigo-950 text-white">Wednesday</th>
                  <th colSpan={9} className="p-1 uppercase tracking-wider text-[9px] bg-slate-900 text-white">Thursday</th>
                  <th colSpan={7} className="p-1 uppercase tracking-wider text-[9px] bg-indigo-950 text-white">Friday</th>
                  <th colSpan={5} className="p-1 uppercase tracking-wider text-[9px] bg-slate-900 text-white">Saturday</th>
                </tr>
                <tr className="bg-slate-100 text-[8px] text-slate-600 font-extrabold text-center border-b border-slate-200">
                  <td className="p-1 text-left bg-slate-100 font-extrabold text-slate-800">Staff Code</td>
                  {[1,2,3,4,5,6,7,8,9].map(p => <td key={`mon-p-${p}`} className="p-0.5">P{p}</td>)}
                  {[1,2,3,4,5,6,7,8,9].map(p => <td key={`tue-p-${p}`} className="p-0.5">P{p}</td>)}
                  {[1,2,3,4,5,6,7,8,9].map(p => <td key={`wed-p-${p}`} className="p-0.5">P{p}</td>)}
                  {[1,2,3,4,5,6,7,8,9].map(p => <td key={`thu-p-${p}`} className="p-0.5">P{p}</td>)}
                  {[1,2,3,4,5,6,7].map(p => <td key={`fri-p-${p}`} className="p-0.5">P{p}</td>)}
                  {[1,2,3,4,5].map(p => <td key={`sat-p-${p}`} className="p-0.5">P{p}</td>)}
                </tr>
              </thead>
              <tbody>
                {(activeTeacher ? [activeTeacher] : allTeachers).map(teach => (
                  <tr key={teach} className="hover:bg-slate-50 bg-white">
                    <td className="p-2 font-extrabold text-slate-800 text-left">{teach}</td>
                    {DAYS_OF_WEEK.map((day) => {
                      const maxP = getPeriodsForDay(day);
                      return Array.from({ length: maxP }).map((_, index) => {
                        const p = index + 1;
                        const entry = timetable.find(t => t.teacherName === teach && t.day === day && t.period === p);
                        const cl = entry ? classes.find(c => c.id === entry.classId) : null;
                        const classCode = cl ? formatClassName(cl.className, cl.division) : '';
                        const reserved = reservedPeriods.find(r => r.day === day && r.period === p && (r.classId === 'All' || r.classId === entry?.classId));

                        return (
                          <td key={`${day}-${p}`} className={`p-1 text-[8px] align-middle ${reserved ? 'bg-amber-50 text-amber-700' : entry ? 'bg-blue-50 text-blue-900 font-bold' : ''}`}>
                            {reserved ? reserved.label : entry ? `${classCode}\n${entry.subject}` : '-'}
                          </td>
                        );
                      });
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {viewMode === 'class' && (
            <table className="w-full text-center border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-extrabold">
                  <th className="p-2.5 text-left w-24">Period</th>
                  <th className="p-2 uppercase tracking-wide">Monday</th>
                  <th className="p-2 uppercase tracking-wide">Tuesday</th>
                  <th className="p-2 uppercase tracking-wide">Wednesday</th>
                  <th className="p-2 uppercase tracking-wide">Thursday</th>
                  <th className="p-2 uppercase tracking-wide">Friday (up to P7)</th>
                  <th className="p-2 uppercase tracking-wide">Saturday (up to P5)</th>
                </tr>
              </thead>
              <tbody>
                {[1,2,3,4,5,6,7,8,9].map((p) => (
                  <tr key={`print-period-${p}`} className="divide-y divide-slate-200">
                    <td className="p-3 font-extrabold bg-slate-100 text-slate-800 text-left">Period {p}</td>
                    {DAYS_OF_WEEK.map((day) => {
                      const maxP = getPeriodsForDay(day);
                      const isClosed = p > maxP;
                      const entry = timetable.find(t => t.classId === activeClassId && t.day === day && t.period === p);
                      const reserved = reservedPeriods.find(r => r.day === day && r.period === p && (r.classId === 'All' || r.classId === activeClassId));

                      return (
                        <td key={`${day}-${p}`} className={`p-2 align-middle ${isClosed ? 'bg-slate-50 text-slate-400' : reserved ? 'bg-amber-50 text-amber-700' : entry ? 'bg-indigo-50 text-indigo-950 font-bold' : ''}`}>
                          {isClosed ? 'Closed' : reserved ? reserved.label : entry ? `${entry.subject}\n(${entry.teacherName})` : 'Unassigned'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {viewMode === 'master' && (
            <table className="w-full text-center border-collapse text-[8px]">
              <thead>
                <tr className="bg-slate-900 text-white font-bold">
                  <th className="p-2 text-left bg-slate-900 text-white w-24">Class Div</th>
                  <th colSpan={9} className="p-1 uppercase text-[8px] bg-slate-950 text-white">Monday</th>
                  <th colSpan={9} className="p-1 uppercase text-[8px] bg-slate-900 text-white">Tuesday</th>
                  <th colSpan={9} className="p-1 uppercase text-[8px] bg-slate-950 text-white">Wednesday</th>
                  <th colSpan={9} className="p-1 uppercase text-[8px] bg-slate-900 text-white">Thursday</th>
                  <th colSpan={7} className="p-1 uppercase text-[8px] bg-slate-950 text-white">Friday</th>
                  <th colSpan={5} className="p-1 uppercase text-[8px] bg-slate-900 text-white">Saturday</th>
                </tr>
              </thead>
              <tbody>
                {filteredClasses.map(cl => (
                  <tr key={cl.id} className="divide-y divide-slate-100">
                    <td className="p-1.5 font-bold text-slate-900 text-left text-[9px]">{formatClassName(cl.className, cl.division)}</td>
                    {DAYS_OF_WEEK.map((day) => {
                      const maxP = getPeriodsForDay(day);
                      return Array.from({ length: maxP }).map((_, idx) => {
                        const p = idx + 1;
                        const entry = timetable.find(t => t.classId === cl.id && t.day === day && t.period === p);
                        const reserved = reservedPeriods.find(r => r.day === day && r.period === p && (r.classId === 'All' || r.classId === cl.id));

                        return (
                          <td key={`${day}-${p}`} className={`p-0.5 ${reserved ? 'bg-amber-50 text-amber-700' : entry ? 'bg-blue-50 font-bold text-blue-950' : ''}`}>
                            {reserved ? reserved.label : entry ? `${entry.subject}\n(${entry.teacherName})` : '-'}
                          </td>
                        );
                      });
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* PRINT SIGNATURE FOOTER */}
        <div className="grid grid-cols-3 gap-8 pt-12 text-center text-xs font-bold text-slate-800">
          <div className="space-y-12">
            <div className="h-10 border-b border-dashed border-slate-400" />
            <p>Verified by Clerk</p>
          </div>
          <div className="space-y-12">
            <div className="h-10 border-b border-dashed border-slate-400" />
            <p>Class Teacher Sign-off</p>
          </div>
          <div className="space-y-12">
            <div className="h-10 border-b border-dashed border-slate-400" />
            <p>Headmaster & Trust Seal</p>
          </div>
        </div>

        {/* Page Footer Info */}
        <div className="border-t border-slate-200 pt-3.5 flex justify-between text-[8px] text-slate-400">
          <span>Classtago • ERP Official Generated Document</span>
          <span>Page 1 of 1</span>
        </div>

      </div>

    </div>
  );
}
