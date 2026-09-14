import React, { useMemo, useState } from 'react';
import { CalendarDays, Clock3, ShieldCheck, Users } from 'lucide-react';
import type { Language, User } from '../types';
import { LocalERPDatabase } from '../lib/supabase';

interface RoleScopedTimetableProps {
  lang: Language;
  user: User;
  embedded?: boolean;
}

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function normalize(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

export default function RoleScopedTimetable({ user, embedded = false }: RoleScopedTimetableProps) {
  const users = useMemo(() => LocalERPDatabase.getUsers(), []);
  const classes = useMemo(() => LocalERPDatabase.getClasses(), []);
  const timetable = useMemo(() => LocalERPDatabase.getTimetable(), []);
  const linkedChildren = useMemo(() => {
    if (user.role !== 'parent') return [];
    const phone = normalize(user.phone);
    if (!phone) return [];
    return users.filter(candidate => candidate.role === 'student' && normalize(candidate.parentMobile) === phone);
  }, [user.role, user.phone, users]);
  const [selectedChildId, setSelectedChildId] = useState(linkedChildren[0]?.id || '');
  const selectedChild = linkedChildren.find(child => child.id === selectedChildId) || linkedChildren[0] || null;

  const scopedEntries = useMemo(() => {
    if (user.role === 'teacher' || user.role === 'class_teacher') {
      return timetable.filter(entry => normalize(entry.teacherName) === normalize(user.name));
    }
    const classId = user.role === 'student' ? user.classId : selectedChild?.classId;
    if (!classId) return [];
    return timetable.filter(entry => entry.classId === classId);
  }, [timetable, user, selectedChild]);

  const title = user.role === 'parent'
    ? 'Child Timetable'
    : user.role === 'student'
      ? 'My Timetable'
      : 'My Teaching Timetable';

  if (user.role === 'parent' && linkedChildren.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-left">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <h2 className="font-black text-amber-950">No verified child link</h2>
            <p className="mt-2 text-xs leading-6 text-amber-800">Timetable data stays hidden until this parent account is securely linked to a student record by the school.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className={`${embedded ? '' : 'rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7'} text-left`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700">Read-only role scope</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">{title}</h2>
          <p className="mt-2 text-xs text-slate-500">Only the signed-in user’s assigned timetable is visible here. Generation and editing controls are not exposed.</p>
        </div>
        {user.role === 'parent' && linkedChildren.length > 1 && (
          <label className="min-w-56 text-xs font-bold text-slate-600">
            <span className="mb-1.5 flex items-center gap-2"><Users className="h-4 w-4" />Viewing child</span>
            <select value={selectedChild?.id || ''} onChange={event => setSelectedChildId(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-900">
              {linkedChildren.map(child => <option key={child.id} value={child.id}>{child.name}</option>)}
            </select>
          </label>
        )}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {days.map(day => {
          const entries = scopedEntries.filter(entry => entry.day === day).sort((a, b) => a.period - b.period);
          return (
            <div key={day} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70">
              <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-black text-slate-900"><CalendarDays className="h-4 w-4 text-cyan-700" />{day}</div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black uppercase text-slate-500">{entries.length} periods</span>
              </div>
              <div className="divide-y divide-slate-200">
                {entries.length === 0 ? (
                  <p className="px-4 py-5 text-xs italic text-slate-400">No scheduled period.</p>
                ) : entries.map(entry => {
                  const classInfo = classes.find(item => item.id === entry.classId);
                  return (
                    <div key={entry.id} className="flex items-start gap-3 px-4 py-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-900 text-xs font-black text-white">{entry.period}</span>
                      <div className="min-w-0 flex-1">
                        <div className="font-black text-slate-900">{entry.subject}</div>
                        <div className="mt-1 text-[10px] text-slate-500">
                          {user.role === 'teacher' || user.role === 'class_teacher'
                            ? `${classInfo?.className || 'Class'} ${classInfo?.division || ''}`
                            : `Teacher: ${entry.teacherName}`}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1 text-[10px] font-bold text-slate-500"><Clock3 className="h-3.5 w-3.5" />{entry.startTime}–{entry.endTime}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
