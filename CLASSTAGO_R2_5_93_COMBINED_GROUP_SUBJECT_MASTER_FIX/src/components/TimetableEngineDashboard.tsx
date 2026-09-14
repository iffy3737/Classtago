import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, Check, X, Plus, Trash2, Edit2, Lock, Unlock, 
  AlertCircle, RefreshCw, Save, Info, Sliders, Sparkles, Settings, 
  Shield, HelpCircle, Search, RotateCcw, Shuffle, Activity
} from 'lucide-react';
import { LocalERPDatabase } from '../lib/supabase';
import { 
  MasterAcademicSetup, TimetableEntry, SubjectWeeklyRequirement, 
  ClassStructure, Language, User, WeeklyPeriodSettings,
  ReservedPeriod, TimetableVersion
} from '../types';
import { generateAutomaticTimetable, auditTimetable, getPeriodsForDay, DAYS_OF_WEEK } from '../utils/timetableEngine';
import UrduWrapper from './UrduWrapper';
import TimetableDisplayManager from './TimetableDisplayManager';
import { requestActionConfirm } from '../lib/actionConfirm';

interface TimetableEngineDashboardProps {
  lang: Language;
  user: User;
  onTimetableChange: () => void;
}

export default function TimetableEngineDashboard({ lang, user, onTimetableChange }: TimetableEngineDashboardProps) {
  const isHeadmaster = user.role === 'headmaster';
  const isClerk = user.role === 'clerk';
  
  // Database states
  const [setup, setSetup] = useState<MasterAcademicSetup | null>(null);
  const [classes, setClasses] = useState<ClassStructure[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);

  // Generation status and reports
  const [conflictReport, setConflictReport] = useState<string[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Configuration forms
  const [weeklyPeriods, setWeeklyPeriods] = useState<WeeklyPeriodSettings>({
    Monday: 9, Tuesday: 9, Wednesday: 9, Thursday: 9, Friday: 7, Saturday: 5
  });
  
  // Selection/Filtering states for view and selective regeneration
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [viewFilterClass, setViewFilterClass] = useState<string>('');
  const [viewFilterDay, setViewFilterDay] = useState<string>('');
  const [viewSearchTerm, setViewSearchTerm] = useState<string>('');

  // Manual entry modal / editing states
  const [showManualModal, setShowManualModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [manualForm, setManualForm] = useState({
    classId: '',
    day: 'Monday' as any,
    period: 1,
    subject: '',
    teacherName: '',
    isLocked: false
  });

  // Swap state
  const [swappingEntryId, setSwappingEntryId] = useState<string | null>(null);

  // Subject Weekly Requirement manager states
  const [showReqForm, setShowReqForm] = useState(false);
  const [editingReqId, setEditingReqId] = useState<string | null>(null);
  const [reqForm, setReqForm] = useState<Omit<SubjectWeeklyRequirement, 'id'>>({
    academicYear: '2026-27',
    className: 'Class 9',
    divisionName: 'A',
    subjectName: '',
    requiredWeeklyPeriods: 5,
    priority: 'Medium',
    doublePeriodAllowed: true,
    lastPeriodAllowed: true,
    maxPeriodsPerDay: 2
  });

  const [activeSubTab, setActiveSubTab] = useState<'audit' | 'requirements' | 'schedule' | 'settings' | 'reserved_periods' | 'version_history'>('audit');

  const [reservedPeriods, setReservedPeriods] = useState<ReservedPeriod[]>([]);
  const [timetableVersions, setTimetableVersions] = useState<TimetableVersion[]>([]);

  // Reserved periods configuration forms
  const [showReservedForm, setShowReservedForm] = useState(false);
  const [editingReservedId, setEditingReservedId] = useState<string | null>(null);
  const [reservedForm, setReservedForm] = useState<Omit<ReservedPeriod, 'id'>>({
    day: 'Monday',
    period: 1,
    label: 'Assembly',
    classId: 'All'
  });

  // State for comparing versions
  const [compareVersionId1, setCompareVersionId1] = useState<string>('');
  const [compareVersionId2, setCompareVersionId2] = useState<string>('live');

  // Load baseline data on mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = () => {
    const rawSetup = LocalERPDatabase.getAcademicSetup();
    const rawClasses = LocalERPDatabase.getClasses();
    const rawTimetable = LocalERPDatabase.getTimetable();
    const rawUsers = LocalERPDatabase.getUsers();
    const rawReserved = LocalERPDatabase.getReservedPeriods();
    const rawVersions = LocalERPDatabase.getTimetableVersions();

    setSetup(rawSetup);
    setClasses(rawClasses);
    setTimetable(rawTimetable);
    setReservedPeriods(rawReserved);
    setTimetableVersions(rawVersions);
    
    const matchedTeachers = rawUsers.filter(u => u.role === 'teacher' && u.isActive && u.status === 'Active');
    setTeachers(matchedTeachers);

    if (rawSetup.weeklyPeriodSettings) {
      setWeeklyPeriods(rawSetup.weeklyPeriodSettings);
    }

    // Run auditing to show stats
    const audit = auditTimetable(rawSetup, rawTimetable, rawClasses, rawReserved);
    setConflictReport(audit.conflictReport);
    setStats(audit.stats);
  };

  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    if (type === 'success') {
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(null), 4000);
    } else {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  // ==========================================
  // SAVE WEEKLY PERIOD CONFIGS
  // ==========================================
  const saveWeeklyPeriodConfigs = () => {
    if (!isHeadmaster) return;
    if (!setup) return;

    const updated = {
      ...setup,
      weeklyPeriodSettings: weeklyPeriods
    };

    LocalERPDatabase.saveAcademicSetup(updated);
    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role as any,
      'UPDATE_WEEKLY_PERIOD_CONFIG',
      'Timetable Engine',
      `Configured school weekly period settings: Mon-Thu=${weeklyPeriods.Monday}, Fri=${weeklyPeriods.Friday}, Sat=${weeklyPeriods.Saturday}`
    );

    loadAllData();
    triggerToast('Weekly period settings saved successfully!');
  };

  // ==========================================
  // SUBJECT REQUIREMENTS ACTIONS
  // ==========================================
  const saveSubjectRequirement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isHeadmaster) return;
    if (!setup) return;

    const currentReqs = setup.subjectWeeklyRequirements || [];
    let updatedReqs = [...currentReqs];

    if (editingReqId) {
      updatedReqs = updatedReqs.map(r => r.id === editingReqId ? { ...r, ...reqForm } : r);
    } else {
      updatedReqs.push({
        id: `req_${Date.now()}`,
        ...reqForm
      });
    }

    const updated = {
      ...setup,
      subjectWeeklyRequirements: updatedReqs
    };

    LocalERPDatabase.saveAcademicSetup(updated);
    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role as any,
      editingReqId ? 'EDIT_SUBJECT_REQUIREMENT' : 'ADD_SUBJECT_REQUIREMENT',
      'Timetable Engine',
      `${editingReqId ? 'Updated' : 'Added'} timetable rule requirement for ${reqForm.className} (${reqForm.divisionName}) - ${reqForm.subjectName}`
    );

    loadAllData();
    setShowReqForm(false);
    setEditingReqId(null);
    setReqForm({
      academicYear: '2026-27',
      className: 'Class 9',
      divisionName: 'A',
      subjectName: '',
      requiredWeeklyPeriods: 5,
      priority: 'Medium',
      doublePeriodAllowed: true,
      lastPeriodAllowed: true,
      maxPeriodsPerDay: 2
    });
    triggerToast('Subject weekly requirements saved successfully!');
  };

  const deleteSubjectRequirement = async (id: string) => {
    if (!isHeadmaster) return;
    if (!setup) return;
    if (!(await requestActionConfirm({ title: 'Delete subject requirement?', message: 'Delete this weekly subject timetable requirement?', confirmLabel: 'Delete Requirement', tone: 'danger' }))) return;

    const currentReqs = setup.subjectWeeklyRequirements || [];
    const updatedReqs = currentReqs.filter(r => r.id !== id);

    const updated = {
      ...setup,
      subjectWeeklyRequirements: updatedReqs
    };

    LocalERPDatabase.saveAcademicSetup(updated);
    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role as any,
      'DELETE_SUBJECT_REQUIREMENT',
      'Timetable Engine',
      `Deleted subject weekly timetable requirement (ID: ${id})`
    );

    loadAllData();
    triggerToast('Subject requirement deleted.');
  };

  // ==========================================
  // AUTOMATIC TIMETABLE GENERATION
  // ==========================================
  const triggerAutoGeneration = (scope: 'entire' | 'class' | 'teacher') => {
    if (!isHeadmaster) return;
    if (!setup) return;

    setIsGenerating(true);
    setTimeout(() => {
      let result;
      let logDetail = '';

      if (scope === 'entire') {
        result = generateAutomaticTimetable(setup, timetable, classes, undefined, undefined, reservedPeriods);
        logDetail = 'Triggered complete school-wide automatic timetable generation';
      } else if (scope === 'class') {
        if (!selectedClassId) {
          triggerToast('Please select a class division first!', 'error');
          setIsGenerating(false);
          return;
        }
        result = generateAutomaticTimetable(setup, timetable, classes, selectedClassId, undefined, reservedPeriods);
        const cl = classes.find(c => c.id === selectedClassId);
        logDetail = `Triggered selective automatic regeneration for ${cl?.className} ${cl?.division || ''}`;
      } else {
        if (!selectedTeacherId) {
          triggerToast('Please select a teacher first!', 'error');
          setIsGenerating(false);
          return;
        }
        result = generateAutomaticTimetable(setup, timetable, classes, undefined, selectedTeacherId, reservedPeriods);
        const t = teachers.find(u => u.id === selectedTeacherId);
        logDetail = `Triggered selective automatic regeneration for teacher: ${t?.name}`;
      }

      // Save generated timetable to database
      localStorage.setItem(`nhs_erp_timetable`, JSON.stringify(result.timetable));
      
      // Automatically create a new version
      try {
        const existingVersions = LocalERPDatabase.getTimetableVersions();
        const nextVerNum = existingVersions.length > 0 ? Math.max(...existingVersions.map(v => v.versionNumber)) + 1 : 1;
        const newVersion: TimetableVersion = {
          id: `ver_${Date.now()}`,
          versionNumber: nextVerNum,
          generatedAt: new Date().toISOString(),
          generatedBy: user.name,
          changeSummary: `${scope === 'entire' ? 'Complete school-wide automatic generation' : scope === 'class' ? `Selective class regeneration` : 'Selective teacher regeneration'}. Quality Score: ${result.stats.qualityScore}%. conflicts: ${result.conflictReport.length}`,
          timetable: result.timetable
        };
        LocalERPDatabase.saveTimetableVersion(newVersion);
      } catch (err) {
        console.error('Error saving timetable version:', err);
      }

      // Save audit log
      LocalERPDatabase.addAuditLog(
        user.id,
        user.name,
        user.role as any,
        'AUTO_GENERATE_TIMETABLE',
        'Timetable Engine',
        `${logDetail}. Quality Score: ${result.stats.qualityScore}%`
      );

      // Reload
      loadAllData();
      onTimetableChange();
      setIsGenerating(false);

      if (result.success) {
        triggerToast(`Timetable successfully generated with ${result.stats.qualityScore}% Quality Score!`);
      } else {
        triggerToast(`Generated with some constraints unfulfilled. Please review the Conflict Report.`, 'error');
      }
    }, 1500);
  };

  // ==========================================
  // RESERVED PERIODS ACTIONS
  // ==========================================
  const saveReservedPeriod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isHeadmaster) return;
    
    const newReserved: ReservedPeriod = {
      id: editingReservedId || `res_${Date.now()}`,
      day: reservedForm.day,
      period: Number(reservedForm.period),
      label: reservedForm.label,
      classId: reservedForm.classId
    };

    LocalERPDatabase.saveReservedPeriod(newReserved);
    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role as any,
      editingReservedId ? 'EDIT_RESERVED_PERIOD' : 'ADD_RESERVED_PERIOD',
      'Timetable Engine',
      `${editingReservedId ? 'Edited' : 'Added'} reserved slot: ${reservedForm.label} on ${reservedForm.day}, Period ${reservedForm.period}`
    );

    loadAllData();
    setShowReservedForm(false);
    setEditingReservedId(null);
    setReservedForm({
      day: 'Monday',
      period: 1,
      label: 'Assembly',
      classId: 'All'
    });
    triggerToast('Reserved period saved successfully!');
  };

  const deleteReservedPeriod = async (id: string) => {
    if (!isHeadmaster) return;
    if (!(await requestActionConfirm({ title: 'Delete reserved period?', message: 'Delete this reserved timetable rule?', confirmLabel: 'Delete Reserved Rule', tone: 'danger' }))) return;
    LocalERPDatabase.deleteReservedPeriod(id);
    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role as any,
      'DELETE_RESERVED_PERIOD',
      'Timetable Engine',
      `Deleted reserved slot (ID: ${id})`
    );

    loadAllData();
    triggerToast('Reserved period deleted.');
  };

  // ==========================================
  // TIMETABLE VERSION ACTIONS
  // ==========================================
  const restoreVersion = (version: TimetableVersion) => {
    if (!isHeadmaster) return;
    
    // Save version's timetable to live
    localStorage.setItem(`nhs_erp_timetable`, JSON.stringify(version.timetable));
    
    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role as any,
      'RESTORE_TIMETABLE_VERSION',
      'Timetable Engine',
      `Restored timetable to Version ${version.versionNumber} (Generated on ${new Date(version.generatedAt).toLocaleString()})`
    );

    loadAllData();
    onTimetableChange();
    triggerToast(`Successfully restored Timetable to Version ${version.versionNumber}!`);
  };

  const deleteVersion = async (id: string) => {
    if (!isHeadmaster) return;
    if (!(await requestActionConfirm({ title: 'Delete timetable version?', message: 'Delete this saved timetable version from history?', confirmLabel: 'Delete Version', tone: 'danger' }))) return;
    LocalERPDatabase.deleteTimetableVersion(id);
    loadAllData();
    triggerToast('Timetable version removed from history.');
  };

  // Compare function
  const renderVersionComparison = () => {
    const v1 = timetableVersions.find(v => v.id === compareVersionId1);
    const v2 = compareVersionId2 === 'live' ? null : timetableVersions.find(v => v.id === compareVersionId2);
    
    if (!v1) return null;
    
    const table1 = v1.timetable;
    const table2 = v2 ? v2.timetable : timetable; // live timetable is the fallback
    const title2 = v2 ? `Version ${v2.versionNumber}` : 'Current Live Timetable';

    // Let's find differences!
    // We can group them by class, day, and period
    const diffs: { class: string; slot: string; from: string; to: string }[] = [];
    
    classes.forEach(c => {
      DAYS_OF_WEEK.forEach(day => {
        for (let p = 1; p <= 9; p++) {
          const entry1 = table1.find(t => t.classId === c.id && t.day === day && t.period === p);
          const entry2 = table2.find(t => t.classId === c.id && t.day === day && t.period === p);
          
          const val1 = entry1 ? `${entry1.subject} (${entry1.teacherName})` : 'Unassigned';
          const val2 = entry2 ? `${entry2.subject} (${entry2.teacherName})` : 'Unassigned';
          
          if (val1 !== val2) {
            diffs.push({
              class: `${c.className} ${c.division || ''}`,
              slot: `${day}, Period ${p}`,
              from: val1,
              to: val2
            });
          }
        }
      });
    });

    return (
      <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
            <Shuffle className="w-4 h-4 text-indigo-500" />
            <span>Comparison Matrix: Version {v1.versionNumber} vs {title2}</span>
          </h4>
          <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
            {diffs.length} differences detected
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs mb-2">
          <label className="font-semibold text-slate-600">Compare with:</label>
          <select
            value={compareVersionId2}
            onChange={(e) => setCompareVersionId2(e.target.value)}
            className="bg-white border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none"
          >
            <option value="live">Current Live Timetable</option>
            {timetableVersions
              .filter(v => v.id !== compareVersionId1)
              .map(v => (
                <option key={v.id} value={v.id}>Version {v.versionNumber}</option>
              ))
            }
          </select>
        </div>
        
        {diffs.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs font-semibold bg-white border border-slate-200 rounded-lg">
            The timetables are 100% identical. No differences detected!
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-lg bg-white">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                  <th className="p-3">Class Division</th>
                  <th className="p-3">Time Slot</th>
                  <th className="p-3 text-slate-500">Version {v1.versionNumber}</th>
                  <th className="p-3 text-blue-600 font-extrabold">{title2}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {diffs.map((d, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-semibold text-slate-800">{d.class}</td>
                    <td className="p-3 font-mono text-[10px] text-slate-500">{d.slot}</td>
                    <td className="p-3 text-slate-500">{d.from}</td>
                    <td className="p-3 font-semibold text-blue-600">{d.to}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // ==========================================
  // MANUAL EDITING ACTIONS
  // ==========================================
  const toggleLockEntry = (entry: TimetableEntry) => {
    if (!isHeadmaster) return;
    const isLockedNow = !(entry as any).isLocked;
    const updatedEntry = {
      ...entry,
      isLocked: isLockedNow
    };
    LocalERPDatabase.saveTimetableEntry(updatedEntry);
    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role as any,
      isLockedNow ? 'LOCK_TIMETABLE_SLOT' : 'UNLOCK_TIMETABLE_SLOT',
      'Timetable Engine',
      `${isLockedNow ? 'Locked' : 'Unlocked'} timetable slot for class ${entry.classId} on ${entry.day} Period ${entry.period}`
    );
    loadAllData();
    onTimetableChange();
    triggerToast(isLockedNow ? 'Period locked and protected from AI regeneration.' : 'Period unlocked.');
  };

  const handleManualFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isHeadmaster) return;

    const entryToSave: TimetableEntry = {
      id: editingEntry ? editingEntry.id : `manual_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      classId: manualForm.classId,
      day: manualForm.day,
      period: Number(manualForm.period),
      subject: manualForm.subject,
      teacherName: manualForm.teacherName || 'Unassigned',
      startTime: '',
      endTime: '',
      isLocked: manualForm.isLocked
    } as any;

    // Check manual override clashes before final write
    const isClashingClass = timetable.some(t => 
      t.id !== entryToSave.id && 
      t.classId === entryToSave.classId && 
      t.day === entryToSave.day && 
      t.period === entryToSave.period
    );

    const isClashingTeacher = entryToSave.teacherName !== 'Unassigned' && timetable.some(t => 
      t.id !== entryToSave.id && 
      (t.teacherName || '').toLowerCase() === (entryToSave.teacherName || '').toLowerCase() && 
      t.day === entryToSave.day && 
      t.period === entryToSave.period
    );

    if (isClashingClass) {
      triggerToast('Conflict Warning: This class is already scheduled with another subject in this slot!', 'error');
    }
    if (isClashingTeacher) {
      triggerToast('Conflict Warning: This teacher is already teaching another class in this slot!', 'error');
    }

    LocalERPDatabase.saveTimetableEntry(entryToSave);
    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role as any,
      editingEntry ? 'MANUAL_EDIT_TIMETABLE' : 'MANUAL_ADD_TIMETABLE',
      'Timetable Engine',
      `Manually ${editingEntry ? 'updated' : 'inserted'} lecture slot for class ${entryToSave.classId}: ${entryToSave.subject} by ${entryToSave.teacherName} on ${entryToSave.day} Period ${entryToSave.period}`
    );

    loadAllData();
    onTimetableChange();
    setShowManualModal(false);
    setEditingEntry(null);
    triggerToast('Timetable entry saved successfully!');
  };

  const deleteEntry = async (id: string) => {
    if (!isHeadmaster) return;
    const target = timetable.find(t => t.id === id);
    if (!target) return;
    if (!(await requestActionConfirm({ title: 'Clear timetable slot?', message: `Clear ${target.subject || 'this lecture'} from ${target.classId} · ${target.day} · Period ${target.period}?`, confirmLabel: 'Clear Slot', tone: 'danger' }))) return;

    LocalERPDatabase.deleteTimetableEntry(id);
    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role as any,
      'CLEAR_TIMETABLE_SLOT',
      'Timetable Engine',
      `Cleared timetable lecture slot for class ${target.classId}: ${target.subject} on ${target.day} Period ${target.period}`
    );

    loadAllData();
    onTimetableChange();
    triggerToast('Lecture period cleared successfully.');
  };

  // Swapping Period logic
  const initiateSwap = (id: string) => {
    if (!isHeadmaster) return;
    if (swappingEntryId === id) {
      setSwappingEntryId(null);
      return;
    }

    if (!swappingEntryId) {
      setSwappingEntryId(id);
      triggerToast('Select another lecture period to swap slots.');
    } else {
      // Execute Swap
      const first = timetable.find(t => t.id === swappingEntryId);
      const second = timetable.find(t => t.id === id);

      if (first && second) {
        const firstDay = first.day;
        const firstPeriod = first.period;

        const updatedFirst = { ...first, day: second.day, period: second.period };
        const updatedSecond = { ...second, day: firstDay, period: firstPeriod };

        LocalERPDatabase.saveTimetableEntry(updatedFirst);
        LocalERPDatabase.saveTimetableEntry(updatedSecond);

        LocalERPDatabase.addAuditLog(
          user.id,
          user.name,
          user.role as any,
          'SWAP_TIMETABLE_SLOTS',
          'Timetable Engine',
          `Swapped schedule slots: [${first.subject} (${first.day} P${first.period})] with [${second.subject} (${second.day} P${second.period})]`
        );

        triggerToast('Schedules swapped successfully!');
      }

      setSwappingEntryId(null);
      loadAllData();
      onTimetableChange();
    }
  };

  const handleOpenManualEdit = (entry: TimetableEntry) => {
    setEditingEntry(entry);
    setManualForm({
      classId: entry.classId,
      day: entry.day,
      period: entry.period,
      subject: entry.subject,
      teacherName: entry.teacherName,
      isLocked: !!(entry as any).isLocked
    });
    setShowManualModal(true);
  };

  // Filter current timetable log
  const filteredTimetable = timetable.filter(entry => {
    if (viewFilterClass && entry.classId !== viewFilterClass) return false;
    if (viewFilterDay && entry.day !== viewFilterDay) return false;
    if (viewSearchTerm) {
      const term = viewSearchTerm.toLowerCase();
      const matchSub = (entry.subject || '').toLowerCase().includes(term);
      const matchTeach = (entry.teacherName || '').toLowerCase().includes(term);
      if (!matchSub && !matchTeach) return false;
    }
    return true;
  });

  return (
    <div className="space-y-8 font-sans">
      
      {/* HEADER BANNER */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-md">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-0 bottom-0 -ml-16 -mb-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 text-blue-300 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Optimizing Core</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Intelligent Timetable Engine & Staff Allocator
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Design automated, conflict-free academic schedules instantly. This module connects dynamically with 
              Teacher registers, student timetables, class allocations, and exam workflows.
            </p>
          </div>

          {isHeadmaster && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setEditingEntry(null);
                  setManualForm({
                    classId: classes[0]?.id || '',
                    day: 'Monday',
                    period: 1,
                    subject: '',
                    teacherName: '',
                    isLocked: false
                  });
                  setShowManualModal(true);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Manual Entry</span>
              </button>

              <button
                disabled={isGenerating}
                onClick={() => triggerAutoGeneration('entire')}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800/40 text-white text-xs font-bold rounded-xl transition-all shadow-lg active:scale-98 cursor-pointer flex items-center gap-1.5"
              >
                {isGenerating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>Run AI Timetable Builder</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* QUICK STATS & OVERVIEW GRID */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {/* Quality Score card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Quality Score</span>
              <Activity className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">{stats.qualityScore}%</span>
            </div>
            <div className="mt-2 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div 
                style={{ width: `${stats.qualityScore}%` }} 
                className={`h-full transition-all duration-500 ${
                  stats.qualityScore > 85 ? 'bg-emerald-500' : stats.qualityScore > 60 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
              />
            </div>
            <p className="text-[9px] text-slate-400 mt-2">Deductions based on clashing staff or empty periods.</p>
          </div>

          {/* Teacher clashes card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Teacher Clashes</span>
              <Shield className="w-4 h-4 text-rose-500" />
            </div>
            <div className="mt-4">
              <span className={`text-3xl font-extrabold ${stats.teacherConflicts > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {stats.teacherConflicts}
              </span>
            </div>
            <p className="text-[9px] text-slate-400 mt-2">Zero clashes required for conflict-free auditing.</p>
          </div>

          {/* Class clashes card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Class Clashes</span>
              <AlertCircle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-4">
              <span className={`text-3xl font-extrabold ${stats.classConflicts > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {stats.classConflicts}
              </span>
            </div>
            <p className="text-[9px] text-slate-400 mt-2">No class should have double allocation on same period.</p>
          </div>

          {/* Completion card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Rule Fulfillment</span>
              <Check className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-slate-900">{stats.completionPercentage}%</span>
            </div>
            <p className="text-[9px] text-slate-400 mt-2">Subject required weekly periods scheduled successfully.</p>
          </div>

          {/* Empty periods card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Empty Periods</span>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-slate-900">{stats.emptyPeriodCount}</span>
            </div>
            <p className="text-[9px] text-slate-400 mt-2">Slots left unassigned across all division tables.</p>
          </div>
        </div>
      )}

      {/* SUCCESS / ERROR TOAST MESSAGES */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-150 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2.5 shadow-sm animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-150 text-rose-800 text-xs font-semibold rounded-xl flex items-center gap-2.5 shadow-sm animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* TIMETABLE ENGINE TABS NAVIGATION */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/50 flex flex-wrap gap-1 px-4 pt-4">
          <button
            onClick={() => setActiveSubTab('audit')}
            className={`px-5 py-3 text-xs font-extrabold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'audit'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl border-t border-x border-slate-200 -mb-[1px]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>AI Audit & Conflict Analyzer</span>
          </button>

          <button
            onClick={() => setActiveSubTab('requirements')}
            className={`px-5 py-3 text-xs font-extrabold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'requirements'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl border-t border-x border-slate-200 -mb-[1px]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Subject Timetable Rules</span>
          </button>

          <button
            onClick={() => setActiveSubTab('schedule')}
            className={`px-5 py-3 text-xs font-extrabold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'schedule'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl border-t border-x border-slate-200 -mb-[1px]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Master Schedule Registry</span>
          </button>

          <button
            onClick={() => setActiveSubTab('reserved_periods')}
            className={`px-5 py-3 text-xs font-extrabold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'reserved_periods'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl border-t border-x border-slate-200 -mb-[1px]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Lock className="w-4 h-4 text-amber-500" />
            <span>Reserved Period Rules</span>
          </button>

          <button
            onClick={() => setActiveSubTab('version_history')}
            className={`px-5 py-3 text-xs font-extrabold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'version_history'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl border-t border-x border-slate-200 -mb-[1px]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <RotateCcw className="w-4 h-4 text-indigo-500" />
            <span>Version History</span>
          </button>

          <button
            onClick={() => setActiveSubTab('settings')}
            className={`px-5 py-3 text-xs font-extrabold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'settings'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl border-t border-x border-slate-200 -mb-[1px]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Engine Configuration Settings</span>
          </button>
        </div>

        <div className="p-6">
          
          {/* SUB-TAB 1: AUDIT & CONFLICT ANALYSIS REPORT */}
          {activeSubTab === 'audit' && (
            <div className="space-y-6">
              
              {/* SELECTIVE REGENERATION ACTIONS FOR HEADMASTER */}
              {isHeadmaster && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-slate-50 border border-slate-200 rounded-xl">
                  {/* Regeneration by Class */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <Shuffle className="w-4 h-4 text-indigo-500" />
                      <span>Regenerate Selected Class-Division</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Re-run AI timetable logic ONLY for the selected class. Other class slots are locked and used as barriers.
                    </p>
                    <div className="flex gap-2">
                      <select
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded-lg text-xs p-2 focus:outline-none"
                      >
                        <option value="">-- Choose Class division --</option>
                        {classes.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.className} - {c.division || 'No Division'}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => triggerAutoGeneration('class')}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        Run
                      </button>
                    </div>
                  </div>

                  {/* Regeneration by Teacher */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <RotateCcw className="w-4 h-4 text-blue-500" />
                      <span>Regenerate Selected Staff Timetable</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Re-run AI logic ONLY for a specific teacher's allocations to balance workload or satisfy restrictions.
                    </p>
                    <div className="flex gap-2">
                      <select
                        value={selectedTeacherId}
                        onChange={(e) => setSelectedTeacherId(e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded-lg text-xs p-2 focus:outline-none"
                      >
                        <option value="">-- Choose Teacher --</option>
                        {teachers.map(t => (
                          <option key={t.id} value={t.id}>{t.name} ({t.username || t.shalarthId} - {t.designation || 'Teacher'})</option>
                        ))}
                      </select>
                      <button
                        onClick={() => triggerAutoGeneration('teacher')}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        Run
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* CONFLICT REPORT DETAILS */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-indigo-600" />
                    <span>Real-Time Timetable Conflict Report</span>
                  </h3>
                  <button
                    onClick={loadAllData}
                    className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                    title="Re-Audit Timetable"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {conflictReport.length === 0 ? (
                  <div className="p-8 border border-dashed border-emerald-200 bg-emerald-50/20 text-center rounded-xl space-y-2">
                    <Check className="w-8 h-8 text-emerald-500 mx-auto" />
                    <h4 className="font-bold text-emerald-800 text-xs">Pristine School Timetable Audit Passed!</h4>
                    <p className="text-[10px] text-emerald-600 max-w-lg mx-auto leading-normal">
                      Excellent! The current academic schedule contains zero strict teacher clashing, zero class clashing, 
                      and is fully conflict-free. All connected student and staff screens are synchronized.
                    </p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-150">
                    <div className="bg-slate-50 px-4 py-2 flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Identified Warnings ({conflictReport.length})</span>
                      <span className="text-[9px] font-mono text-rose-600 bg-rose-50 px-2 py-0.5 rounded font-bold uppercase">Auditor Alert</span>
                    </div>
                    <div className="max-h-[350px] overflow-y-auto divide-y divide-slate-100">
                      {conflictReport.map((conflict, idx) => (
                        <div 
                          key={idx} 
                          className={`p-3 text-[11px] font-sans flex items-start gap-2.5 transition-colors ${
                            conflict.startsWith('Conflict:') 
                              ? 'bg-rose-50/40 text-rose-700 hover:bg-rose-50/60' 
                              : 'bg-amber-50/20 text-amber-700 hover:bg-amber-50/40'
                          }`}
                        >
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <div className="leading-relaxed">
                            <span className="font-bold mr-1">{conflict.split(':')[0]}:</span>
                            <span>{conflict.split(':').slice(1).join(':')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SUB-TAB 2: SUBJECT WEEKLY REQUIREMENTS CONFIGURATION */}
          {activeSubTab === 'requirements' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Class–Subject Allocation Rules</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Define weekly requirements per class-subject to drive the intelligent timetable scheduler.
                  </p>
                </div>
                {isHeadmaster && (
                  <button
                    onClick={() => {
                      setEditingReqId(null);
                      setReqForm({
                        academicYear: '2026-27',
                        className: 'Class 9',
                        divisionName: 'A',
                        subjectName: '',
                        requiredWeeklyPeriods: 5,
                        priority: 'Medium',
                        doublePeriodAllowed: true,
                        lastPeriodAllowed: true,
                        maxPeriodsPerDay: 2
                      });
                      setShowReqForm(true);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Timetable Rule</span>
                  </button>
                )}
              </div>

              {/* ADD/EDIT RULE DIALOG */}
              {showReqForm && (
                <form onSubmit={saveSubjectRequirement} className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4 text-xs">
                  <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
                    <h4 className="font-bold text-slate-900">
                      {editingReqId ? 'Edit Timetable Rule' : 'New Timetable Subject Rule'}
                    </h4>
                    <button 
                      type="button"
                      onClick={() => setShowReqForm(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Class Master Name</label>
                      <select
                        value={reqForm.className}
                        onChange={(e) => setReqForm({ ...reqForm, className: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none"
                      >
                        <option value="Class 1">Class 1</option>
                        <option value="Class 2">Class 2</option>
                        <option value="Class 3">Class 3</option>
                        <option value="Class 4">Class 4</option>
                        <option value="Class 5">Class 5</option>
                        <option value="Class 6">Class 6</option>
                        <option value="Class 7">Class 7</option>
                        <option value="Class 8">Class 8</option>
                        <option value="Class 9">Class 9</option>
                        <option value="Class 10">Class 10</option>
                        <option value="Class 11">Class 11</option>
                        <option value="Class 12">Class 12</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Division Name</label>
                      <select
                        value={reqForm.divisionName}
                        onChange={(e) => setReqForm({ ...reqForm, divisionName: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none"
                      >
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="No Division">No Division</option>
                        <option value="All">All Divisions</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Subject Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Mathematics, Urdu, History"
                        value={reqForm.subjectName}
                        onChange={(e) => setReqForm({ ...reqForm, subjectName: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Required Weekly Periods</label>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={reqForm.requiredWeeklyPeriods}
                        onChange={(e) => setReqForm({ ...reqForm, requiredWeeklyPeriods: Number(e.target.value) })}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Scheduling Priority</label>
                      <select
                        value={reqForm.priority}
                        onChange={(e) => setReqForm({ ...reqForm, priority: e.target.value as any })}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none"
                      >
                        <option value="High">High (Schedule first)</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Max Periods Per Day</label>
                      <input
                        type="number"
                        min={1}
                        max={4}
                        value={reqForm.maxPeriodsPerDay}
                        onChange={(e) => setReqForm({ ...reqForm, maxPeriodsPerDay: Number(e.target.value) })}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-3 bg-white border border-slate-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-700 block">Allow Double Period</span>
                        <span className="text-[10px] text-slate-400">Can be scheduled for back-to-back consecutive periods.</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={reqForm.doublePeriodAllowed}
                        onChange={(e) => setReqForm({ ...reqForm, doublePeriodAllowed: e.target.checked })}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 rounded cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-700 block">Allow Last Period</span>
                        <span className="text-[10px] text-slate-400">Can be scheduled in the last hour of the day.</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={reqForm.lastPeriodAllowed}
                        onChange={(e) => setReqForm({ ...reqForm, lastPeriodAllowed: e.target.checked })}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 rounded cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowReqForm(false)}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer"
                    >
                      Save Rule Requirement
                    </button>
                  </div>
                </form>
              )}

              {/* LIST OF CURRENT WEEKLY SUBJECT TIMETABLE REQUIREMENTS */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold text-[10px] uppercase tracking-wider">
                      <th className="p-4">Academic Year</th>
                      <th className="p-4">Class Division</th>
                      <th className="p-4">Subject</th>
                      <th className="p-4 text-center">Weekly Periods</th>
                      <th className="p-4">Scheduling Rules</th>
                      <th className="p-4">Priority</th>
                      {isHeadmaster && <th className="p-4 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {(setup.subjectWeeklyRequirements || []).map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/50 bg-white">
                        <td className="p-4 font-mono font-bold text-slate-500">{req.academicYear}</td>
                        <td className="p-4 font-bold text-slate-800">
                          {req.className} - {req.divisionName}
                        </td>
                        <td className="p-4">
                          <span className="font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                            {req.subjectName}
                          </span>
                        </td>
                        <td className="p-4 font-extrabold text-slate-900 text-center">
                          {req.requiredWeeklyPeriods}
                        </td>
                        <td className="p-4 text-slate-500 space-y-0.5 text-[10px]">
                          <div>• Max daily: {req.maxPeriodsPerDay || 2}</div>
                          <div>• Double period: {req.doublePeriodAllowed ? 'Yes' : 'No'}</div>
                          <div>• Last period: {req.lastPeriodAllowed ? 'Yes' : 'No'}</div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            req.priority === 'High' 
                              ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                              : req.priority === 'Medium' 
                                ? 'bg-amber-50 text-amber-600 border border-amber-100' 
                                : 'bg-slate-100 text-slate-600 border border-slate-150'
                          }`}>
                            {req.priority}
                          </span>
                        </td>
                        {isHeadmaster && (
                          <td className="p-4 text-right space-x-2 whitespace-nowrap">
                            <button
                              onClick={() => {
                                setEditingReqId(req.id);
                                setReqForm({
                                  academicYear: req.academicYear,
                                  className: req.className,
                                  divisionName: req.divisionName,
                                  subjectName: req.subjectName,
                                  requiredWeeklyPeriods: req.requiredWeeklyPeriods,
                                  priority: req.priority,
                                  doublePeriodAllowed: req.doublePeriodAllowed,
                                  lastPeriodAllowed: req.lastPeriodAllowed,
                                  maxPeriodsPerDay: req.maxPeriodsPerDay
                                });
                                setShowReqForm(true);
                              }}
                              className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button type="button"
                              onClick={() => deleteSubjectRequirement(req.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                    {(setup.subjectWeeklyRequirements || []).length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                          No subject weekly requirements set. Click 'Add Timetable Rule' to start.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUB-TAB 3: COMPREHENSIVE TIMETABLE DISPLAY, PRINTING, AND OVERRIDES */}
          {activeSubTab === 'schedule' && (
            <div className="space-y-6">
              {/* RENDERING HIGHER LEVEL TIMETABLE DISPLAY AND MANAGEMENT */}
              <TimetableDisplayManager 
                lang={lang} 
                user={user} 
                onTimetableChange={() => {
                  loadAllData();
                  onTimetableChange();
                }} 
              />

              {/* RAW BACKEND LIST VIEWER EXPANDER */}
              <details className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden text-xs">
                <summary className="p-4 font-bold text-slate-700 hover:text-slate-900 cursor-pointer flex items-center justify-between select-none">
                  <span>View Raw Timetable Log Registry (Database Flat List)</span>
                  <span className="text-[10px] text-blue-600 hover:underline">Toggle List view</span>
                </summary>
                
                <div className="p-4 border-t border-slate-250 space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-slate-900">School-Wide Raw Flat Database</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        View lock status, unique ID hashes, and raw day parameters for every period.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <input
                        type="text"
                        placeholder="Filter subject/teacher..."
                        value={viewSearchTerm}
                        onChange={(e) => setViewSearchTerm(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg p-2 focus:outline-none text-[11px]"
                      />
                      <select
                        value={viewFilterClass}
                        onChange={(e) => setViewFilterClass(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg p-2 focus:outline-none text-[11px]"
                      >
                        <option value="">All Classes</option>
                        {classes.map(c => (
                          <option key={c.id} value={c.id}>{c.className} - {c.division || 'No Division'}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-xs border-collapse bg-white">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold text-[10px] uppercase tracking-wider">
                          <th className="p-3">Status</th>
                          <th className="p-3">Class</th>
                          <th className="p-3">Schedule Slot</th>
                          <th className="p-3">Subject</th>
                          <th className="p-3">Allocated Teacher</th>
                          {isHeadmaster && <th className="p-3 text-right">Operations</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {filteredTimetable.map((entry) => {
                          const cl = classes.find(c => c.id === entry.classId);
                          const isLocked = (entry as any).isLocked;
                          return (
                            <tr 
                              key={entry.id} 
                              className={`hover:bg-slate-50/50 bg-white ${
                                swappingEntryId === entry.id ? 'bg-indigo-50/50' : ''
                              }`}
                            >
                              <td className="p-3">
                                <div className="flex items-center gap-1.5">
                                  {isLocked ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-800 text-white rounded text-[8px] font-extrabold uppercase font-mono">
                                      <Lock className="w-3 h-3 text-emerald-400" />
                                      <span>LOCKED</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-400 rounded text-[8px] font-bold uppercase font-mono border border-slate-200">
                                      <Unlock className="w-3 h-3" />
                                      <span>Unlocked</span>
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 font-bold text-slate-800">
                                {cl ? `${cl.className} - ${cl.division || 'No Division'}` : entry.classId}
                              </td>
                              <td className="p-3 font-mono font-bold text-slate-600">
                                <span className="bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-[9px] mr-1.5 font-bold uppercase text-slate-700">
                                  {entry.day}
                                </span>
                                <span className="text-blue-600">Period {entry.period}</span>
                              </td>
                              <td className="p-3 font-extrabold text-slate-900">{entry.subject}</td>
                              <td className="p-3">
                                <span className={`font-semibold ${entry.teacherName === 'Unassigned' ? 'text-amber-600 italic' : 'text-slate-700'}`}>
                                  {entry.teacherName}
                                </span>
                              </td>
                              {isHeadmaster && (
                                <td className="p-3 text-right space-x-1 whitespace-nowrap">
                                  {/* Lock Toggle */}
                                  <button
                                    onClick={() => toggleLockEntry(entry)}
                                    className={`p-1 rounded transition-all cursor-pointer ${
                                      isLocked 
                                        ? 'text-slate-300 hover:text-slate-100 bg-slate-800 hover:bg-slate-900' 
                                        : 'text-slate-400 hover:text-slate-800 bg-slate-100 hover:bg-slate-200'
                                    }`}
                                    title={isLocked ? "Unlock slot" : "Lock slot (Protect from AI)"}
                                  >
                                    {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                  </button>

                                  {/* Swap */}
                                  <button
                                    onClick={() => initiateSwap(entry.id)}
                                    className={`p-1 rounded transition-all cursor-pointer ${
                                      swappingEntryId === entry.id
                                        ? 'text-white bg-indigo-600'
                                        : 'text-slate-400 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50'
                                    }`}
                                    title="Swap Period with another slot"
                                  >
                                    <Shuffle className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Manual edit */}
                                  <button
                                    onClick={() => handleOpenManualEdit(entry)}
                                    className="p-1 text-slate-400 hover:text-blue-600 bg-slate-100 hover:bg-slate-200 rounded transition-all cursor-pointer"
                                    title="Move / Swap / Reassign Teacher or Subject"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Delete / Clear */}
                                  <button type="button"
                                    onClick={() => deleteEntry(entry.id)}
                                    className="p-1 text-slate-400 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 rounded transition-all cursor-pointer"
                                    title="Clear lecture slot"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                        {filteredTimetable.length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                              No timetable slots match your filtering conditions.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </details>
            </div>
          )}

          {/* SUB-TAB 4: WEEK STRUCTURE AND ENGINE TIMING PARAMETERS */}
          {activeSubTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Week Period Structures</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Configure how many maximum lecture slots exist on each day. These values limit AI automatic generation.
                </p>
              </div>

              <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl space-y-4 max-w-2xl text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Monday (max periods)</label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      disabled={!isHeadmaster}
                      value={weeklyPeriods.Monday}
                      onChange={(e) => setWeeklyPeriods({ ...weeklyPeriods, Monday: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tuesday (max periods)</label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      disabled={!isHeadmaster}
                      value={weeklyPeriods.Tuesday}
                      onChange={(e) => setWeeklyPeriods({ ...weeklyPeriods, Tuesday: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Wednesday (max periods)</label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      disabled={!isHeadmaster}
                      value={weeklyPeriods.Wednesday}
                      onChange={(e) => setWeeklyPeriods({ ...weeklyPeriods, Wednesday: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Thursday (max periods)</label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      disabled={!isHeadmaster}
                      value={weeklyPeriods.Thursday}
                      onChange={(e) => setWeeklyPeriods({ ...weeklyPeriods, Thursday: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Friday (max periods)</label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      disabled={!isHeadmaster}
                      value={weeklyPeriods.Friday}
                      onChange={(e) => setWeeklyPeriods({ ...weeklyPeriods, Friday: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Saturday (max periods)</label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      disabled={!isHeadmaster}
                      value={weeklyPeriods.Saturday}
                      onChange={(e) => setWeeklyPeriods({ ...weeklyPeriods, Saturday: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="p-3.5 bg-amber-50 border border-amber-150 rounded-lg text-amber-800 text-[10px] leading-relaxed flex gap-2">
                  <Info className="w-4 h-4 shrink-0" />
                  <div>
                    <strong>Constraint Note:</strong> Setting a higher or lower value changes the daily ceiling for 
                    timetable generation. Total default school weekly periods should sum up to <strong>48 periods/week</strong>. 
                    (Mon-Thu=9, Fri=7, Sat=5).
                  </div>
                </div>

                {isHeadmaster && (
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={saveWeeklyPeriodConfigs}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save Settings</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SUB-TAB: RESERVED PERIODS */}
          {activeSubTab === 'reserved_periods' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Reserved Period Rules</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Define slots locked for special use (Assembly, Functions, Club time). AI will never schedule regular classes here.
                  </p>
                </div>
                {isHeadmaster && (
                  <button
                    onClick={() => {
                      setEditingReservedId(null);
                      setReservedForm({ day: 'Monday', period: 1, label: 'Assembly', classId: 'All' });
                      setShowReservedForm(!showReservedForm);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    {showReservedForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>{showReservedForm ? 'Close Rule Form' : 'Add Reserved Rule'}</span>
                  </button>
                )}
              </div>

              {/* RESERVED FORM */}
              {showReservedForm && isHeadmaster && (
                <form onSubmit={saveReservedPeriod} className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4 max-w-2xl text-xs">
                  <h4 className="font-bold text-slate-800 mb-2">{editingReservedId ? 'Edit Reserved Rule' : 'New Reserved Slot Rule'}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Day of Week</label>
                      <select
                        value={reservedForm.day}
                        onChange={(e) => setReservedForm({ ...reservedForm, day: e.target.value as any })}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none"
                      >
                        {DAYS_OF_WEEK.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Period Slot (1 - 9)</label>
                      <select
                        value={reservedForm.period}
                        onChange={(e) => setReservedForm({ ...reservedForm, period: Number(e.target.value) })}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none"
                      >
                        {[1,2,3,4,5,6,7,8,9].map(num => (
                          <option key={num} value={num}>Period {num}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Purpose / Label</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Assembly, Examination, Events, Custom"
                        value={reservedForm.label}
                        onChange={(e) => setReservedForm({ ...reservedForm, label: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Scope / Target Class</label>
                      <select
                        value={reservedForm.classId}
                        onChange={(e) => setReservedForm({ ...reservedForm, classId: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none"
                      >
                        <option value="All">All School Classes (School-wide)</option>
                        {classes.map(c => (
                          <option key={c.id} value={c.id}>{c.className} - {c.division || 'No Division'}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowReservedForm(false)}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Apply Reserved Rule</span>
                    </button>
                  </div>
                </form>
              )}

              {/* LIST OF RESERVED PERIODS */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold">
                      <th className="p-3">Day</th>
                      <th className="p-3">Period Slot</th>
                      <th className="p-3">Scope / Target</th>
                      <th className="p-3">Purpose / Label</th>
                      {isHeadmaster && <th className="p-3 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {reservedPeriods.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                          No reserved period rules configured yet.
                        </td>
                      </tr>
                    ) : (
                      reservedPeriods.map(p => {
                        const targetClass = p.classId === 'All' ? 'All Classes (School-wide)' : classes.find(c => c.id === p.classId);
                        const scopeText = typeof targetClass === 'string' ? targetClass : targetClass ? `${targetClass.className} ${targetClass.division || ''}` : p.classId;
                        return (
                          <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-3 font-semibold text-slate-800">{p.day}</td>
                            <td className="p-3 font-mono text-[10px]">Slot {p.period}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${p.classId === 'All' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                                {scopeText}
                              </span>
                            </td>
                            <td className="p-3 font-medium text-slate-700">{p.label}</td>
                            {isHeadmaster && (
                              <td className="p-3 text-right space-x-1.5">
                                <button
                                  onClick={() => {
                                    setEditingReservedId(p.id);
                                    setReservedForm({
                                      day: p.day,
                                      period: p.period,
                                      label: p.label,
                                      classId: p.classId
                                    });
                                    setShowReservedForm(true);
                                  }}
                                  className="text-slate-500 hover:text-slate-800 p-1.5 hover:bg-slate-100 rounded transition-colors inline-flex cursor-pointer"
                                  title="Edit Reserved Rule"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button type="button"
                                  onClick={() => deleteReservedPeriod(p.id)}
                                  className="text-rose-500 hover:text-rose-700 p-1.5 hover:bg-rose-50 rounded transition-colors inline-flex cursor-pointer"
                                  title="Delete Reserved Rule"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUB-TAB: TIMETABLE VERSION HISTORY */}
          {activeSubTab === 'version_history' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Timetable Version History Log</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  View historically saved timetable snapshots, compare differences with the current live schedule, and restore any previous generation instantly.
                </p>
              </div>

              {/* VERSION LIST */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold">
                      <th className="p-3">Version</th>
                      <th className="p-3">Generation Time</th>
                      <th className="p-3">Generated By</th>
                      <th className="p-3">Change Summary</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {timetableVersions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                          No timetable versions saved in history yet. They are created automatically on successful auto-generations.
                        </td>
                      </tr>
                    ) : (
                      timetableVersions.map(v => (
                        <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 font-extrabold text-slate-900">v{v.versionNumber}</td>
                          <td className="p-3 text-slate-500">{new Date(v.generatedAt).toLocaleString()}</td>
                          <td className="p-3 font-semibold text-slate-700">{v.generatedBy}</td>
                          <td className="p-3 text-slate-500 italic max-w-sm truncate">{v.changeSummary}</td>
                          <td className="p-3 text-right space-x-1.5">
                            <button
                              onClick={() => {
                                setCompareVersionId1(v.id);
                                setCompareVersionId2('live');
                              }}
                              className={`px-2 py-1 border text-[10px] font-bold rounded-md cursor-pointer transition-colors ${compareVersionId1 === v.id ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200 hover:bg-slate-100 text-slate-700'}`}
                            >
                              Compare
                            </button>
                            {isHeadmaster && (
                              <>
                                <button
                                  onClick={() => restoreVersion(v)}
                                  className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-[10px] font-bold rounded-md cursor-pointer transition-colors"
                                  title="Restore This Version"
                                >
                                  Restore
                                </button>
                                <button type="button"
                                  onClick={() => deleteVersion(v.id)}
                                  className="text-rose-500 hover:text-rose-700 p-1.5 hover:bg-rose-50 rounded transition-colors inline-flex cursor-pointer"
                                  title="Delete Version from History"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* DYNAMIC COMPARE MATRIX PANEL */}
              {compareVersionId1 && renderVersionComparison()}
            </div>
          )}

        </div>
      </div>

      {/* MANUAL ENTRY / MOVE / REASSIGN DIALOG MODAL */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden text-left font-sans text-xs">
            <div className="border-b border-slate-150 bg-slate-50 px-5 py-4 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-blue-600" />
                <span>{editingEntry ? 'Manual Move & Reassign Lecture' : 'Insert Timetable Entry'}</span>
              </h3>
              <button 
                onClick={() => setShowManualModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleManualFormSubmit} className="p-6 space-y-4">
              
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Class Division</label>
                <select
                  required
                  disabled={!!editingEntry}
                  value={manualForm.classId}
                  onChange={(e) => setManualForm({ ...manualForm, classId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none"
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.className} - {c.division || 'No Division'}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Day</label>
                  <select
                    value={manualForm.day}
                    onChange={(e) => setManualForm({ ...manualForm, day: e.target.value as any })}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 focus:outline-none font-semibold"
                  >
                    {DAYS_OF_WEEK.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Period</label>
                  <select
                    value={manualForm.period}
                    onChange={(e) => setManualForm({ ...manualForm, period: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 focus:outline-none font-semibold"
                  >
                    {Array.from({ length: getPeriodsForDay(manualForm.day, weeklyPeriods) }, (_, i) => i + 1).map(p => (
                      <option key={p} value={p}>Period {p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Subject Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mathematics, Urdu, etc."
                  value={manualForm.subject}
                  onChange={(e) => setManualForm({ ...manualForm, subject: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 focus:outline-none font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Assigned Teacher</label>
                <select
                  value={manualForm.teacherName}
                  onChange={(e) => setManualForm({ ...manualForm, teacherName: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 focus:outline-none font-semibold"
                >
                  <option value="Unassigned">-- Unassigned --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.name}>{t.name} ({t.username || t.shalarthId} - {t.designation || 'Teacher'})</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-lg mt-2">
                <div>
                  <span className="font-bold text-slate-700 block">Protect from AI / Lock Slot</span>
                  <span className="text-[10px] text-slate-400">Locked slots remain completely untouched during automatic regeneration.</span>
                </div>
                <input
                  type="checkbox"
                  checked={manualForm.isLocked}
                  onChange={(e) => setManualForm({ ...manualForm, isLocked: e.target.checked })}
                  className="w-4.5 h-4.5 text-blue-600 focus:ring-blue-500 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer"
                >
                  {editingEntry ? 'Move & Reassign' : 'Insert Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
