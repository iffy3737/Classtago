import React, { useMemo } from 'react';
import {
  BookOpen,
  CalendarCheck2,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  ShieldCheck,
  Users,
} from 'lucide-react';
import type { TeacherCloudContext, TeacherScopeAssignment } from './types';

interface Props {
  context: TeacherCloudContext | null;
  loading: boolean;
  error?: string;
  onNavigate?: (moduleId: string) => void;
}

function scopeKey(a: TeacherScopeAssignment) {
  return `${a.classId}:${a.divisionId || ''}`;
}

function uniqueClassTeacherScopes(assignments: TeacherScopeAssignment[]) {
  const map = new Map<string, TeacherScopeAssignment>();
  assignments
    .filter(a => a.isClassTeacher || a.scopeType === 'class_teacher')
    .forEach(a => {
      const key = scopeKey(a);
      if (!map.has(key) || a.scopeType === 'class_teacher') map.set(key, a);
    });
  return [...map.values()];
}

export default function TeacherAssignmentsFresh({ context, loading, error, onNavigate }: Props) {
  const subjectAssignments = useMemo(
    () => (context?.assignments || []).filter(a => a.scopeType === 'subject' && Boolean(a.subjectId)),
    [context]
  );
  const classTeacherScopes = useMemo(
    () => uniqueClassTeacherScopes(context?.assignments || []),
    [context]
  );
  const teachingClassCount = useMemo(
    () => new Set(subjectAssignments.map(scopeKey)).size,
    [subjectAssignments]
  );

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm font-semibold text-slate-500">Loading Headmaster-assigned academic duties from cloud…</div>;
  }

  if (error || !context) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        <b>Academic assignment could not be loaded.</b>
        <p className="mt-2 text-xs leading-5">{error || 'Teacher cloud context is unavailable.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="teacher-my-academic-assignment">
      <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-6 text-slate-950 shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-cyan-700">
              <ShieldCheck className="h-4 w-4" />
              <p className="text-[10px] font-black uppercase tracking-[.2em]">Headmaster Assigned · Read-only</p>
            </div>
            <h1 className="mt-2 text-2xl font-black">My Academic Assignment</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              This page shows exactly which Class Teacher duty and Subject Teaching duties the Headmaster has assigned to your account for {context.academicYear}. You cannot change these assignments yourself.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-200">
            <b>{context.schoolName}</b><br />Cloud source: Academic Assignments
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Class Teacher Duty</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{classTeacherScopes.length}</p>
          <p className="mt-1 text-xs text-slate-500">Class / Division assigned by Headmaster</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Teaching Classes</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{teachingClassCount}</p>
          <p className="mt-1 text-xs text-slate-500">Distinct Class / Division scopes</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Subject Allocations</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{subjectAssignments.length}</p>
          <p className="mt-1 text-xs text-slate-500">Headmaster-assigned subject rows</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 font-black text-slate-950"><GraduationCap className="h-5 w-5 text-cyan-700" /> Class Teacher Duty</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">Attendance, complete class timetable and Class Teacher result-review responsibilities apply only to the Class / Division listed here.</p>
          </div>
          <span className="rounded-full bg-cyan-50 px-3 py-1 text-[10px] font-black uppercase text-cyan-800">Headmaster controlled</span>
        </div>

        {!classTeacherScopes.length ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
            <b>No Class Teacher duty is currently assigned.</b>
            <p className="mt-1 text-xs">You may still have Subject Teacher allocations below.</p>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {classTeacherScopes.map(scope => {
              const subjectsInClass = subjectAssignments.filter(a => scopeKey(a) === scopeKey(scope));
              return (
                <article key={scopeKey(scope)} className="rounded-2xl border border-cyan-200 bg-cyan-50/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-cyan-700">Your Class Teacher Class</p>
                      <h3 className="mt-1 text-xl font-black text-slate-950">{scope.className} · {scope.division}</h3>
                      <p className="mt-1 text-xs text-slate-600">{scope.studentCount ?? 'Student count unavailable'} students · {scope.medium || 'School medium'}</p>
                    </div>
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                  </div>
                  <div className="mt-3 rounded-xl border border-cyan-100 bg-white p-3">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Subjects you personally teach in this class</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {subjectsInClass.length
                        ? subjectsInClass.map(a => <span key={a.id} className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-700">{a.subjectName}</span>)
                        : <span className="text-xs text-slate-500">No separate subject allocation for this class.</span>}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => onNavigate?.('tr-attendance-daily')} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white">Class Attendance</button>
                    <button onClick={() => onNavigate?.('tr-class-timetable')} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black">Class Timetable</button>
                    <button onClick={() => onNavigate?.('tr-my-students-list')} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black">Student List</button>
                    <button onClick={() => onNavigate?.('tr-result-class-mark-list')} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black">Result Review</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 font-black text-slate-950"><BookOpen className="h-5 w-5 text-violet-700" /> Subject Teaching Assignments</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">Every row below is a Class / Division / Subject combination assigned by the Headmaster. These rows control Marks, Homework, Study Material and other subject work.</p>
          </div>
          <span className="rounded-full bg-violet-50 px-3 py-1 text-[10px] font-black uppercase text-violet-800">Subject scope</span>
        </div>

        {!subjectAssignments.length ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-600"><b>No Subject Teacher allocation is currently assigned.</b></div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[760px] text-xs">
              <thead className="bg-slate-50 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">
                <tr><th className="p-3">Class / Division</th><th className="p-3">Subject</th><th className="p-3">Medium</th><th className="p-3">Students</th><th className="p-3">Role in class</th></tr>
              </thead>
              <tbody>
                {subjectAssignments.map(a => (
                  <tr key={a.id} className="border-t border-slate-100">
                    <td className="p-3 font-black text-slate-900">{a.className} · {a.division}</td>
                    <td className="p-3"><b>{a.subjectName}</b>{a.subjectCode ? <span className="ml-2 font-mono text-[10px] text-slate-400">{a.subjectCode}</span> : null}</td>
                    <td className="p-3">{a.medium || 'School medium'}</td>
                    <td className="p-3">{a.studentCount ?? '—'}</td>
                    <td className="p-3"><span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${a.isClassTeacher ? 'bg-cyan-50 text-cyan-800' : 'bg-slate-100 text-slate-600'}`}>{a.isClassTeacher ? 'Class + Subject Teacher' : 'Subject Teacher'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => onNavigate?.('tr-study-material')} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white">Study Material</button>
          <button onClick={() => onNavigate?.('tr-result-subject-marks')} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black">Subject Marks List</button>
          <button onClick={() => onNavigate?.('tr-ai-homework')} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black">Homework</button>
          <button onClick={() => onNavigate?.('tr-my-timetable')} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black">My Timetable</button>
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs leading-5 text-emerald-900">
        <div className="flex items-start gap-3"><ClipboardList className="mt-0.5 h-4 w-4 shrink-0" /><div><b>Assignment rule:</b> this screen is display-only. Any Class Teacher or Subject Teacher change must be made by the Headmaster in Teacher & Academic Assignments. Teacher-side access updates from that cloud assignment.</div></div>
      </section>
    </div>
  );
}
