import { MasterAcademicSetup, TimetableEntry, SubjectWeeklyRequirement, ClassStructure, ReservedPeriod } from '../types';
import { LocalERPDatabase } from '../lib/supabase';

export interface TimetableStats {
  teacherConflicts: number;
  classConflicts: number;
  completionPercentage: number;
  teacherWorkloadBalance: string;
  emptyPeriodCount: number;
  qualityScore: number;
}

export interface TimetableGenerationResult {
  success: boolean;
  timetable: TimetableEntry[];
  conflictReport: string[];
  stats: TimetableStats;
}

// Fixed days list
export const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
export type DayType = typeof DAYS_OF_WEEK[number];

/**
 * Resolves standard periods limit per day based on settings
 */
export function getPeriodsForDay(day: string, settings?: any): number {
  if (settings) {
    if (day === 'Monday') return settings.Monday ?? 9;
    if (day === 'Tuesday') return settings.Tuesday ?? 9;
    if (day === 'Wednesday') return settings.Wednesday ?? 9;
    if (day === 'Thursday') return settings.Thursday ?? 9;
    if (day === 'Friday') return settings.Friday ?? 7;
    if (day === 'Saturday') return settings.Saturday ?? 5;
  }
  
  // Default values
  switch (day) {
    case 'Monday':
    case 'Tuesday':
    case 'Wednesday':
    case 'Thursday':
      return 9;
    case 'Friday':
      return 7;
    case 'Saturday':
      return 5;
    default:
      return 9;
  }
}

/**
 * Validates and checks current timetable for any direct clashes, requirements fulfillment, and other conflicts
 */
export function auditTimetable(
  setup: MasterAcademicSetup,
  timetable: TimetableEntry[],
  classes: ClassStructure[],
  reservedPeriods: ReservedPeriod[] = []
): { conflictReport: string[]; stats: TimetableStats } {
  const conflictReport: string[] = [];
  const divisions = setup.divisions || [];
  const requirements = setup.subjectWeeklyRequirements || [];
  const allocations = setup.subjectAllocations || [];
  const classTeachers = setup.classTeacherAssignments || [];
  const periodSettings = setup.weeklyPeriodSettings || {
    Monday: 9, Tuesday: 9, Wednesday: 9, Thursday: 9, Friday: 7, Saturday: 5
  };

  let teacherConflicts = 0;
  let classConflicts = 0;
  let emptyPeriodCount = 0;
  let reservedViolationsCount = 0;

  // Track allocations: Day -> Period -> Teacher -> string[] (class names)
  const teacherSchedule: { [key: string]: { [key: number]: { [teacher: string]: string[] } } } = {};
  // Track class schedule: Day -> Period -> ClassId -> string[] (subjects)
  const classSchedule: { [key: string]: { [key: number]: { [classId: string]: string[] } } } = {};

  // Initialize tracking structures
  DAYS_OF_WEEK.forEach(day => {
    teacherSchedule[day] = {};
    classSchedule[day] = {};
    const maxPeriods = getPeriodsForDay(day, periodSettings);
    for (let p = 1; p <= maxPeriods; p++) {
      teacherSchedule[day][p] = {};
      classSchedule[day][p] = {};
    }
  });

  // Populate schedules and detect direct conflicts
  timetable.forEach(entry => {
    const { day, period, teacherName, classId, subject, id } = entry;
    if (!DAYS_OF_WEEK.includes(day as any)) return;
    const maxPeriods = getPeriodsForDay(day, periodSettings);
    if (period < 1 || period > maxPeriods) return;

    // Check reserved period violation
    const matchedReserve = reservedPeriods.find(r => 
      r.day === day && 
      r.period === period && 
      (r.classId === 'All' || r.classId === classId)
    );
    if (matchedReserve) {
      reservedViolationsCount++;
      const classNameStr = classes.find(c => c.id === classId)?.className || classId;
      conflictReport.push(
        `Reserved Period Violation: Subject '${subject}' in ${classNameStr} is scheduled during a reserved slot (${matchedReserve.label}) on ${day}, Period ${period}.`
      );
    }

    // Check teacher clash
    if (teacherName && teacherName !== 'Unassigned') {
      if (!teacherSchedule[day][period][teacherName]) {
        teacherSchedule[day][period][teacherName] = [];
      }
      teacherSchedule[day][period][teacherName].push(classId);
      if (teacherSchedule[day][period][teacherName].length > 1) {
        teacherConflicts++;
        conflictReport.push(
          `Teacher Conflict: ${teacherName} is scheduled to teach multiple classes in ${day}, Period ${period} (${teacherSchedule[day][period][teacherName].join(', ')})`
        );
      }
    }

    // Check class clash
    if (classId) {
      if (!classSchedule[day][period][classId]) {
        classSchedule[day][period][classId] = [];
      }
      classSchedule[day][period][classId].push(subject);
      if (classSchedule[day][period][classId].length > 1) {
        classConflicts++;
        conflictReport.push(
          `Class Conflict: Class (ID: ${classId}) has multiple subjects assigned in ${day}, Period ${period} (${classSchedule[day][period][classId].join(', ')})`
        );
      }
    }
  });

  // Calculate subject requirements completion percentage
  let totalRequiredPeriods = 0;
  let successfullyScheduledPeriods = 0;

  requirements.forEach(req => {
    const matchingClasses = classes.filter(c => c.className === req.className);
    
    matchingClasses.forEach(c => {
      // Handle division filter
      const hasDivision = req.divisionName && req.divisionName !== 'No Division';
      if (hasDivision && c.id !== req.divisionName && req.divisionName !== 'All') {
        // If it's a specific division and doesn't match, skip
      }

      // Check current timetable for count of this class-subject combo
      const scheduledCount = timetable.filter(t => 
        t.classId === c.id && 
        (t.subject || '').toLowerCase() === (req.subjectName || '').toLowerCase()
      ).length;

      totalRequiredPeriods += req.requiredWeeklyPeriods;
      successfullyScheduledPeriods += Math.min(scheduledCount, req.requiredWeeklyPeriods);

      if (scheduledCount < req.requiredWeeklyPeriods) {
        conflictReport.push(
          `Fulfillment Warning: ${req.className} ${req.divisionName} - ${req.subjectName} has only ${scheduledCount}/${req.requiredWeeklyPeriods} periods scheduled.`
        );
      } else if (scheduledCount > req.requiredWeeklyPeriods) {
        conflictReport.push(
          `Allocation Overload: ${req.className} ${req.divisionName} - ${req.subjectName} has exceeded requirement (${scheduledCount}/${req.requiredWeeklyPeriods} periods).`
        );
      }
    });
  });

  // Empty periods count
  classes.forEach(c => {
    DAYS_OF_WEEK.forEach(day => {
      const maxPeriods = getPeriodsForDay(day, periodSettings);
      for (let p = 1; p <= maxPeriods; p++) {
        const isScheduled = timetable.some(t => t.classId === c.id && t.day === day && t.period === p);
        if (!isScheduled) {
          emptyPeriodCount++;
        }
      }
    });
  });

  // Calculate Teacher Workload Balance
  const teacherLoad: { [teacher: string]: number } = {};
  timetable.forEach(t => {
    if (t.teacherName && t.teacherName !== 'Unassigned') {
      teacherLoad[t.teacherName] = (teacherLoad[t.teacherName] || 0) + 1;
    }
  });

  const loads = Object.values(teacherLoad);
  let workloadBalance = 'N/A';
  if (loads.length > 0) {
    const minLoad = Math.min(...loads);
    const maxLoad = Math.max(...loads);
    workloadBalance = `Min ${minLoad} to Max ${maxLoad} periods/week`;
  }

  // Calculate Quality Score
  const completionRate = totalRequiredPeriods > 0 ? (successfullyScheduledPeriods / totalRequiredPeriods) : 1;
  const completionPercentage = Math.round(completionRate * 100);
  
  // Scoring formula: start at 100, deduct for clashes, missing subjects, and excessive empty periods
  let qualityScore = 100;
  qualityScore -= teacherConflicts * 15;
  qualityScore -= classConflicts * 15;
  qualityScore -= reservedViolationsCount * 20; // Heavy penalty for scheduled periods in reserved slots
  
  // missing required periods penalty
  const missingPeriods = totalRequiredPeriods - successfullyScheduledPeriods;
  if (missingPeriods > 0) {
    qualityScore -= Math.min(missingPeriods * 2.5, 40);
  }
  
  // Empty periods ratio penalty (out of total capacity)
  const totalSlots = classes.length * 48; // roughly
  if (totalSlots > 0) {
    const emptyRatio = emptyPeriodCount / totalSlots;
    qualityScore -= Math.min(Math.round(emptyRatio * 15), 10);
  }

  qualityScore = Math.max(0, Math.min(100, Math.round(qualityScore)));

  return {
    conflictReport,
    stats: {
      teacherConflicts,
      classConflicts,
      completionPercentage,
      teacherWorkloadBalance: workloadBalance,
      emptyPeriodCount,
      qualityScore
    }
  };
}

/**
 * Core automatic timetable generation algorithm using constraint satisfaction heuristic
 */
export function generateAutomaticTimetable(
  setup: MasterAcademicSetup,
  existingTimetable: TimetableEntry[],
  classes: ClassStructure[],
  targetClassId?: string,
  targetTeacherId?: string,
  reservedPeriods: ReservedPeriod[] = []
): TimetableGenerationResult {
  const requirements = setup.subjectWeeklyRequirements || [];
  const allocations = setup.subjectAllocations || [];
  const classTeachers = setup.classTeacherAssignments || [];
  const periodSettings = setup.weeklyPeriodSettings || {
    Monday: 9, Tuesday: 9, Wednesday: 9, Thursday: 9, Friday: 7, Saturday: 5
  };

  // Determine active reserved periods
  const activeReservedPeriods = (reservedPeriods && reservedPeriods.length > 0)
    ? reservedPeriods
    : (typeof window !== 'undefined' ? LocalERPDatabase.getReservedPeriods() : []);

  const isSlotReserved = (classId: string, day: string, period: number): boolean => {
    return activeReservedPeriods.some(r => 
      r.day === day && 
      r.period === period && 
      (r.classId === 'All' || r.classId === classId)
    );
  };

  // Determine locked timetable slots
  const lockedEntries = existingTimetable.filter(t => (t as any).isLocked);
  
  // We keep all locked entries intact
  let newTimetable: TimetableEntry[] = [...lockedEntries];

  // If selective regeneration, keep other classes/teachers intact as barriers
  if (targetClassId) {
    const otherClassEntries = existingTimetable.filter(t => t.classId !== targetClassId);
    newTimetable = [...newTimetable, ...otherClassEntries];
  } else if (targetTeacherId) {
    const activeTeacher = setup.teacherProfiles?.find(t => t.id === targetTeacherId);
    const teacherName = activeTeacher?.fullName || '';
    const otherTeacherEntries = existingTimetable.filter(t => (t.teacherName || '').toLowerCase() !== teacherName.toLowerCase());
    newTimetable = [...newTimetable, ...otherTeacherEntries];
  }

  // Remove duplicate entries from base to start clean for our target slots
  const baseMap = new Set(newTimetable.map(t => `${t.classId}_${t.day}_${t.period}`));

  // Construct a list of tasks to be scheduled
  interface SchedulableTask {
    classId: string;
    className: string;
    divisionName: string;
    subjectName: string;
    requiredPeriods: number;
    priority: 'High' | 'Medium' | 'Low';
    doublePeriodAllowed: boolean;
    lastPeriodAllowed: boolean;
    maxPeriodsPerDay: number;
    teacherName: string;
    isClassTeacher: boolean;
  }

  const tasksToSchedule: SchedulableTask[] = [];

  // Determine which classes we need to schedule
  const targetClasses = targetClassId ? classes.filter(c => c.id === targetClassId) : classes;

  targetClasses.forEach(c => {
    // If regenerating for a specific teacher, we only want requirements allocated to that teacher
    let teacherFilterName: string | null = null;
    if (targetTeacherId) {
      const activeTeacher = setup.teacherProfiles?.find(t => t.id === targetTeacherId);
      teacherFilterName = activeTeacher?.fullName || null;
    }

    // Find the class teacher for priority checks
    const classCT = classTeachers.find(ct => ct.className === c.className && ct.divisionName === c.division && ct.isActive !== false);

    // Filter requirements matching this class
    const matchedReqs = requirements.filter(req => {
      if (req.className !== c.className) return false;
      const isNoDiv = !req.divisionName || req.divisionName === 'No Division';
      const classNoDiv = !c.division || c.division === 'No Division' || c.division === '';
      if (isNoDiv && classNoDiv) return true;
      return req.divisionName === c.division || req.divisionName === 'All';
    });

    matchedReqs.forEach(req => {
      // Find teacher allocated
      const alloc = allocations.find(a => 
        a.className === c.className && 
        a.divisionName === (c.division || 'No Division') && 
        a.subjectName === req.subjectName && 
        a.isActive !== false
      );

      const assignedTeacherName = alloc ? alloc.teacherName : 'Unassigned';

      // Skip if teacher filter is active and doesn't match
      if (teacherFilterName && assignedTeacherName.toLowerCase() !== teacherFilterName.toLowerCase()) {
        return;
      }

      // Check if this teacher is the Class Teacher of this class
      const isCT = classCT ? classCT.teacherName.toLowerCase() === assignedTeacherName.toLowerCase() : false;

      // Deduct already scheduled locked periods from weekly required periods
      const alreadyScheduledLockedCount = lockedEntries.filter(t => 
        t.classId === c.id && 
        t.subject === req.subjectName
      ).length;

      const remainingPeriods = Math.max(0, req.requiredWeeklyPeriods - alreadyScheduledLockedCount);

      if (remainingPeriods > 0) {
        tasksToSchedule.push({
          classId: c.id,
          className: c.className,
          divisionName: c.division || 'No Division',
          subjectName: req.subjectName,
          requiredPeriods: remainingPeriods,
          priority: req.priority,
          doublePeriodAllowed: req.doublePeriodAllowed,
          lastPeriodAllowed: req.lastPeriodAllowed,
          maxPeriodsPerDay: req.maxPeriodsPerDay || 2,
          teacherName: assignedTeacherName,
          isClassTeacher: isCT
        });
      }
    });
  });

  // Priority sorting:
  // 1. Class Teacher Priority: Give highest priority to assigning Class Teacher's subject slots to their own class.
  // 2. High priority requirement priority level.
  // 3. Higher required weekly periods first to ensure they fit in the schedule.
  tasksToSchedule.sort((a, b) => {
    if (a.isClassTeacher && !b.isClassTeacher) return -1;
    if (!a.isClassTeacher && b.isClassTeacher) return 1;

    const prioScore = { High: 3, Medium: 2, Low: 1 };
    const aPrio = prioScore[a.priority] || 1;
    const bPrio = prioScore[b.priority] || 1;
    if (aPrio !== bPrio) return bPrio - aPrio;

    return b.requiredPeriods - a.requiredPeriods;
  });

  // Flatten tasks to individual period-by-period assignments
  interface IndividualPeriodTask {
    classId: string;
    subjectName: string;
    teacherName: string;
    doublePeriodAllowed: boolean;
    lastPeriodAllowed: boolean;
    maxPeriodsPerDay: number;
    isClassTeacher: boolean;
    priority: string;
  }

  const flatTasks: IndividualPeriodTask[] = [];
  tasksToSchedule.forEach(task => {
    for (let i = 0; i < task.requiredPeriods; i++) {
      flatTasks.push({
        classId: task.classId,
        subjectName: task.subjectName,
        teacherName: task.teacherName,
        doublePeriodAllowed: task.doublePeriodAllowed,
        lastPeriodAllowed: task.lastPeriodAllowed,
        maxPeriodsPerDay: task.maxPeriodsPerDay,
        isClassTeacher: task.isClassTeacher,
        priority: task.priority
      });
    }
  });

  const conflictReport: string[] = [];

  // Helper function to check if a teacher is busy
  const isTeacherBusy = (teacherName: string, day: DayType, period: number, currentGrid: TimetableEntry[]): boolean => {
    if (!teacherName || teacherName === 'Unassigned') return false;
    return currentGrid.some(t => 
      (t.teacherName || '').toLowerCase() === teacherName.toLowerCase() && 
      t.day === day && 
      t.period === period
    );
  };

  // Helper function to check if a class is busy
  const isClassBusy = (classId: string, day: DayType, period: number, currentGrid: TimetableEntry[]): boolean => {
    return currentGrid.some(t => t.classId === classId && t.day === day && t.period === period);
  };

  // Helper function to get count of a subject in a day
  const getSubjectCountForDay = (classId: string, subject: string, day: DayType, currentGrid: TimetableEntry[]): number => {
    return currentGrid.filter(t => t.classId === classId && t.subject === subject && t.day === day).length;
  };

  // Helper function to check if a double period exists or is next to it
  const isConsecutiveSlot = (classId: string, subject: string, day: DayType, period: number, currentGrid: TimetableEntry[]): boolean => {
    return currentGrid.some(t => 
      t.classId === classId && 
      t.subject === subject && 
      t.day === day && 
      (t.period === period - 1 || t.period === period + 1)
    );
  };

  // Run greedy assignment for flat tasks
  flatTasks.forEach((task, index) => {
    let bestDay: DayType | null = null;
    let bestPeriod = -1;
    let bestScore = -Infinity;

    // Scan all days and periods to find the highest scoring free slot
    DAYS_OF_WEEK.forEach(day => {
      const maxPeriods = getPeriodsForDay(day, periodSettings);
      
      // Calculate current subject occurrences on this day
      const currentDayCount = getSubjectCountForDay(task.classId, task.subjectName, day, newTimetable);

      for (let p = 1; p <= maxPeriods; p++) {
        // Skip if already occupied (locked or already assigned)
        if (isClassBusy(task.classId, day, p, newTimetable)) continue;
        if (isTeacherBusy(task.teacherName, day, p, newTimetable)) continue;

        // Skip if reserved period
        if (isSlotReserved(task.classId, day, p)) continue;

        // Skip if last period constraint violated
        const isLast = (p === maxPeriods);
        if (isLast && !task.lastPeriodAllowed) continue;

        // Skip if daily limit exceeded
        if (currentDayCount >= task.maxPeriodsPerDay) continue;

        // Check double period allowance constraints
        const hasAdjacent = isConsecutiveSlot(task.classId, task.subjectName, day, p, newTimetable);
        if (currentDayCount > 0 && hasAdjacent && !task.doublePeriodAllowed) {
          continue; // Consecutive not allowed
        }

        // Calculate candidate score
        let score = 0;

        // 1. Spreading of Subjects across the Week (Rule: Subject Distribution)
        const isDoublePeriodAllowedSubject = (subjectName: string): boolean => {
          const name = subjectName.toLowerCase();
          return name.includes("practical") || name.includes("lab") || name.includes("laboratory") || name.includes("sports") || name.includes("pe") || name.includes("physical");
        };
        const isDoubleAllowed = task.doublePeriodAllowed || isDoublePeriodAllowedSubject(task.subjectName);

        if (currentDayCount === 0) {
          score += 300; // High bonus for spreading onto a new day
        } else {
          // Subject is already scheduled on this day.
          // Check if there are other days of the week where this subject has 0 count
          const otherDaysFree = DAYS_OF_WEEK.some(d => getSubjectCountForDay(task.classId, task.subjectName, d, newTimetable) === 0);

          if (otherDaysFree) {
            // If there are other empty days, we should severely penalize repeating on this day.
            score -= 600; // Heavy penalty to prevent clustering
          } else {
            // All days have at least one period of this subject. We must duplicate.
            if (isDoubleAllowed && hasAdjacent) {
              score += 100; // Double periods preferred if repeating is necessary
            } else if (!isDoubleAllowed) {
              score -= 200; // Penalize duplicate non-double periods if repeating on same day
              if (hasAdjacent) {
                score -= 300; // Severe penalty for adjacent periods of same subject if not allowed
              }
            }
          }
        }

        // 2. Class Teacher First Period Rule
        // Give bonus for scheduling the class teacher's subject in the 1st period of Monday, Wednesday, Friday
        if (p === 1 && (day === 'Monday' || day === 'Wednesday' || day === 'Friday') && task.isClassTeacher) {
          score += 150;
        }

        // 3. Heavy Subjects vs. Light Subjects Rules
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

        const isHeavy = isHeavySubject(task.subjectName);
        const isLight = isLightSubject(task.subjectName);

        if (isHeavy) {
          // Morning preference: heavy subjects should appear in morning periods (1-4)
          if (p <= 4) {
            score += 80;
          }
          // Avoid late periods (last 2 periods of the day)
          if (p >= maxPeriods - 1) {
            score -= 150;
          }
          // Avoid consecutive heavy subjects for the class (e.g. Maths followed by Science)
          const hasAdjacentHeavy = newTimetable.some(t => 
            t.classId === task.classId && 
            t.day === day && 
            (t.period === p - 1 || t.period === p + 1) && 
            isHeavySubject(t.subject || '')
          );
          if (hasAdjacentHeavy) {
            score -= 100; // Penalize consecutive heavy subjects
          }

          // Count of heavy subjects on this day for this class
          const heavyCountOnDay = newTimetable.filter(t => 
            t.classId === task.classId && 
            t.day === day && 
            isHeavySubject(t.subject || '')
          ).length;
          if (heavyCountOnDay >= 3) {
            score -= 120 * (heavyCountOnDay - 2); // Penalize heavily if day is already full of heavy subjects
          }
        } else if (isLight) {
          // Afternoon preference: light subjects should appear in later periods (period >= 5)
          if (p >= 5) {
            score += 80;
          }
          // Avoid early morning periods (1-2)
          if (p <= 2) {
            score -= 80;
          }

          // Spread light subjects: avoid placing multiple light subjects together on the same day for a class
          const lightCountOnDay = newTimetable.filter(t => 
            t.classId === task.classId && 
            t.day === day && 
            isLightSubject(t.subject || '')
          ).length;
          if (lightCountOnDay >= 1) {
            score -= 100 * lightCountOnDay; // Penalize clustering light subjects on the same day
          }
        }

        // 4. Teacher Workload Rules
        if (task.teacherName && task.teacherName !== 'Unassigned') {
          // Check consecutive teaching periods for the teacher on this day
          const adjacentTeachBefore1 = newTimetable.some(t => t.teacherName === task.teacherName && t.day === day && t.period === p - 1);
          const adjacentTeachBefore2 = newTimetable.some(t => t.teacherName === task.teacherName && t.day === day && t.period === p - 2);
          const adjacentTeachBefore3 = newTimetable.some(t => t.teacherName === task.teacherName && t.day === day && t.period === p - 3);
          
          const adjacentTeachAfter1 = newTimetable.some(t => t.teacherName === task.teacherName && t.day === day && t.period === p + 1);
          const adjacentTeachAfter2 = newTimetable.some(t => t.teacherName === task.teacherName && t.day === day && t.period === p + 2);
          const adjacentTeachAfter3 = newTimetable.some(t => t.teacherName === task.teacherName && t.day === day && t.period === p + 3);

          let consecutiveCount = 0;
          if (adjacentTeachBefore1) {
            consecutiveCount++;
            if (adjacentTeachBefore2) {
              consecutiveCount++;
              if (adjacentTeachBefore3) {
                consecutiveCount++;
              }
            }
          }
          if (adjacentTeachAfter1) {
            consecutiveCount++;
            if (adjacentTeachAfter2) {
              consecutiveCount++;
              if (adjacentTeachAfter3) {
                consecutiveCount++;
              }
            }
          }

          if (consecutiveCount >= 3) {
            score -= 300; // Severely penalize 4 or more consecutive periods for a teacher
          } else if (consecutiveCount >= 2) {
            score -= 120; // Penalize 3 consecutive periods
          } else if (consecutiveCount >= 1) {
            score -= 30; // Mild penalty for 2 consecutive periods
          }

          // Balance daily teacher workload (max periods per day)
          const teacherDailyPeriods = newTimetable.filter(t => t.teacherName === task.teacherName && t.day === day).length;
          if (teacherDailyPeriods >= 5) {
            score -= 250; // High penalty for exceeding 5 periods of teaching in a day
          } else if (teacherDailyPeriods >= 4) {
            score -= 80; // Moderate penalty for 4 periods
          }
        }

        // 5. Priority Weighting
        if (task.priority === 'High') {
          score += 50;
        } else if (task.priority === 'Medium') {
          score += 20;
        }

        // Record the best candidate
        if (score > bestScore) {
          bestScore = score;
          bestDay = day;
          bestPeriod = p;
        }
      }
    });

    if (bestDay && bestPeriod !== -1) {
      // Allocate the slot!
      newTimetable.push({
        id: `auto_${task.classId}_${bestDay}_${bestPeriod}_${index}_${Math.random().toString(36).substr(2, 5)}`,
        classId: task.classId,
        day: bestDay,
        period: bestPeriod,
        subject: task.subjectName,
        teacherName: task.teacherName,
        startTime: '', // No timing displayed or stored
        endTime: ''   // No timing displayed or stored
      });
    } else {
      // Record conflict!
      const classObj = classes.find(c => c.id === task.classId);
      const className = classObj ? `${classObj.className} ${classObj.division || ''}` : task.classId;
      
      let reason = 'No available slots without clashing';
      if (task.teacherName && task.teacherName !== 'Unassigned') {
        const busyCount = DAYS_OF_WEEK.reduce((acc, day) => {
          const maxP = getPeriodsForDay(day, periodSettings);
          for (let p = 1; p <= maxP; p++) {
            if (isTeacherBusy(task.teacherName, day, p, newTimetable)) acc++;
          }
          return acc;
        }, 0);
        
        if (busyCount > 15) {
          reason = `Teacher ${task.teacherName} is overloaded (busy in ${busyCount} other slots)`;
        } else {
          reason = `Teacher shortage or scheduling constraint clash with ${task.teacherName}`;
        }
      }

      conflictReport.push(
        `Conflict: Could not schedule ${task.subjectName} in ${className} (${reason})`
      );
    }
  });

  // Run final audit to calculate score and statistics
  const audit = auditTimetable(setup, newTimetable, classes);
  const combinedReport = [...conflictReport, ...audit.conflictReport];

  return {
    success: combinedReport.filter(r => r.startsWith('Conflict:')).length === 0,
    timetable: newTimetable,
    conflictReport: combinedReport,
    stats: audit.stats
  };
}
