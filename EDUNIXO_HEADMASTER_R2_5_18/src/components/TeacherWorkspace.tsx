import React, { useEffect, useMemo, useState } from 'react';
import type { User } from '../types';
import { supabase } from '../lib/supabase';
import TeacherDashboardFresh from '../modules/teacherFresh/TeacherDashboardFresh';
import TeacherAssignmentsFresh from '../modules/teacherFresh/TeacherAssignmentsFresh';
import TeacherAttendanceFresh, { type AttendanceView } from '../modules/teacherFresh/TeacherAttendanceFresh';
import { loadTeacherCloudContext } from '../modules/teacherFresh/teacherFreshService';
import type { TeacherCloudContext } from '../modules/teacherFresh/types';
import { StudyMaterialPage } from '../modules/teacherAcademicFresh/pages/StudyMaterialPage';
import { AcademicGeneratorPage } from '../modules/teacherAcademicFresh/pages/AcademicGenerators';
import { QuestionPaperPage } from '../modules/teacherAcademicFresh/pages/QuestionPaperPage';
import { listCanonicalAcademicAssignments, listStudyMaterials } from '../modules/teacherAcademicFresh/services/teacherAcademicService';
import type { StudyMaterial, TeacherAssignment } from '../modules/teacherAcademicFresh/types/domain';
import type { TeachingAcademicSubmenuId } from '../modules/teacherAcademicFresh/config/navigation';
import TeacherResultManagement, { type TeacherResultView } from '../modules/teacherResultFresh/TeacherResultManagement';
import TeacherMyStudents, { type TeacherStudentsView } from '../modules/teacherStudentsFresh/TeacherMyStudents';
import TeacherStudentSignupApprovals from '../modules/teacherStudentsFresh/TeacherStudentSignupApprovals';
import TeacherTimetableWorkload from '../modules/teacherTimetableFresh/TeacherTimetableWorkload';
import type { TeacherTimetableView } from '../modules/teacherTimetableFresh/types';
import TeacherCommunication from '../modules/teacherCommunicationFresh/TeacherCommunication';
import type { TeacherCommunicationView } from '../modules/teacherCommunicationFresh/types';
import '../modules/teacherAcademicFresh/styles.scoped.css';

interface TeacherWorkspaceProps {
  lang: string;
  user: User;
  onUpdateUser?: (user: User) => void;
  initialModule?: string;
  initialFeature?: string | null;
  focusedMode?: boolean;
  focusedTitle?: string;
  onNavigate?: (moduleId: string, featureId?: string) => void;
}

const attendanceMap: Record<string, AttendanceView> = {
  'tr-attendance-daily': 'daily',
  'tr-attendance-catalogue': 'catalogue',
  'tr-attendance-history': 'history',
  'tr-attendance-correction': 'correction',
  'tr-swiftchat-sync': 'sync',
};


const timetableMap: Record<string, TeacherTimetableView> = {
  'tr-my-timetable': 'my_timetable',
  'tr-class-timetable': 'class_timetable',
  'tr-my-workload': 'workload',
  'tr-substitute-duties': 'substitute',
};

const studentMap: Record<string, TeacherStudentsView> = {
  'tr-my-students-list': 'student_list',
  'tr-my-students-performance': 'performance',
};

const communicationMap: Record<string, TeacherCommunicationView> = {
  'tr-school-notices': 'school_notices',
  'tr-class-subject-announcements': 'announcements',
  'tr-homework-notifications': 'homework_notifications',
  'tr-parent-student-communication': 'parent_student',
};

const resultMap: Record<string, TeacherResultView> = {
  'tr-result-subject-marks': 'subject_marks',
  'tr-result-class-mark-list': 'class_mark_list',
  'tr-result-book': 'result_book',
  'tr-result-progress-card': 'progress_card',
};

const academicMap: Record<string, TeachingAcademicSubmenuId> = {
  'tr-study-material': 'study-material',
  'tr-ai-year-plan': 'year-plan',
  'tr-ai-daily-plan': 'daily-plan',
  'tr-ai-lesson-plan': 'lesson-plan',
  'tr-ai-homework': 'homework',
  'tr-ai-teaching-diary': 'teaching-diary',
  'tr-ai-classwork': 'classwork',
};

export default function TeacherWorkspace({ user, initialModule = 'dashboard', initialFeature = null, onNavigate }: TeacherWorkspaceProps) {
  const [context, setContext] = useState<TeacherCloudContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [contextError, setContextError] = useState('');
  const [academicAssignments, setAcademicAssignments] = useState<TeacherAssignment[]>([]);
  const [academicScopeError, setAcademicScopeError] = useState('');
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [materialsError, setMaterialsError] = useState('');

  const reloadMaterials = async () => {
    try {
      const rows = await listStudyMaterials();
      setMaterials(rows);
      setMaterialsError('');
    } catch (error: any) {
      setMaterials([]);
      setMaterialsError(error?.message || 'Teacher Academic Core is not configured yet.');
    }
  };

  const reloadAcademicAssignments = async () => {
    try {
      const rows = await listCanonicalAcademicAssignments();
      setAcademicAssignments(rows);
      setAcademicScopeError('');
    } catch (error: any) {
      setAcademicAssignments([]);
      setAcademicScopeError(error?.message || 'Unable to load canonical Teacher Academic assignments.');
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setContextError('');
      try {
        const resolvedUserId = user.authUserId || user.id;
        if (user.role === 'headmaster') {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData.session?.access_token;
          if (!token) throw new Error('Headmaster cloud session expired. Sign in again.');
          const response = await fetch('/api/admin/headmaster-teaching-profile', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(payload.error || 'Headmaster teaching identity could not be prepared.');
        }
        const ctx = await loadTeacherCloudContext({ userId: resolvedUserId, appUserId: user.id, employeeCode: user.employeeCode, shalarthId: user.shalarthId, name: user.name });
        if (!cancelled) setContext(ctx);
        await Promise.all([reloadAcademicAssignments(), reloadMaterials()]);
      } catch (error: any) {
        if (!cancelled) { setContext(null); setContextError(error?.message || 'Unable to load assigned teaching cloud scope.'); }
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [user.id, user.authUserId, user.employeeCode, user.shalarthId, user.name, user.role]);

  const aiAssignments: TeacherAssignment[] = useMemo(() => academicAssignments, [academicAssignments]);

  if (initialModule === 'dashboard' || initialModule === 'tr-dashboard' || initialModule === 'tr-home') {
    return <TeacherDashboardFresh context={context} loading={loading} error={contextError} onNavigate={onNavigate} />;
  }

  if (initialModule === 'tr-my-assignments') {
    return <TeacherAssignmentsFresh context={context} loading={loading} error={contextError} onNavigate={onNavigate} />;
  }

  if (attendanceMap[initialModule]) {
    return <div className="edx-teacher-ai"><TeacherAttendanceFresh context={context} loading={loading} error={contextError} view={attendanceMap[initialModule]} /></div>;
  }

  const resultPage = resultMap[initialModule];
  if (resultPage) {
    return <div className="edx-teacher-ai"><TeacherResultManagement context={context} loading={loading} error={contextError} view={resultPage} onNavigate={onNavigate} /></div>;
  }

  const timetablePage = timetableMap[initialModule];
  if (timetablePage) {
    return <div className="edx-teacher-ai"><TeacherTimetableWorkload context={context} loading={loading} error={contextError} view={timetablePage} /></div>;
  }

  if (initialModule === 'tr-student-signup-approvals') {
    return <div className="edx-teacher-ai"><TeacherStudentSignupApprovals context={context} loading={loading} error={contextError} onNavigate={onNavigate} /></div>;
  }

  const studentPage = studentMap[initialModule];
  if (studentPage) {
    return <div className="edx-teacher-ai"><TeacherMyStudents context={context} loading={loading} error={contextError} view={studentPage} /></div>;
  }

  const communicationPage = communicationMap[initialModule];
  if (communicationPage) {
    return <div className="edx-teacher-ai"><TeacherCommunication context={context} loading={loading} error={contextError} view={communicationPage} onNavigate={onNavigate} /></div>;
  }

  const academicPage = academicMap[initialModule];
  if (academicPage) {
    return <div className="edx-teacher-ai">
      {contextError && <div className="alert danger screen-only">{contextError}</div>}
      {academicScopeError && <div className="alert warning screen-only"><strong>Academic assignment scope:</strong> {academicScopeError}</div>}
      {materialsError && <div className="alert warning screen-only"><strong>Academic backend setup:</strong> {materialsError}</div>}
      {academicPage === 'study-material'
        ? <StudyMaterialPage assignments={aiAssignments} materials={materials} reload={reloadMaterials} />
        : <AcademicGeneratorPage page={academicPage} assignments={aiAssignments} materials={materials} onNavigate={onNavigate} />}
    </div>;
  }

  if (initialModule === 'tr-question-paper-first-term' || initialModule === 'tr-question-paper-second-term') {
    const initialTerm = initialModule === 'tr-question-paper-first-term' ? 'first' : 'second';
    const examByFeature: Record<string, import('../modules/teacherAcademicFresh/types/domain').QuestionPaperExam> = {
      'tr-question-first-unit-test': 'first_unit_test',
      'tr-question-first-term-examination': 'first_term_examination',
      'tr-question-second-unit-test': 'second_unit_test',
      'tr-question-second-term-examination': 'second_term_examination',
    };
    return <div className="edx-teacher-ai">
      {contextError && <div className="alert danger screen-only">{contextError}</div>}
      {academicScopeError && <div className="alert warning screen-only"><strong>Academic assignment scope:</strong> {academicScopeError}</div>}
      {materialsError && <div className="alert warning screen-only"><strong>Academic backend setup:</strong> {materialsError}</div>}
      <QuestionPaperPage
        assignments={aiAssignments}
        materials={materials}
        initialTerm={initialTerm}
        initialExam={initialFeature ? examByFeature[initialFeature] : undefined}
        onBackToTeacher={() => onNavigate?.('tr-dashboard')}
        onBackToTerm={(term) => onNavigate?.(term === 'first' ? 'tr-question-paper-first-term' : 'tr-question-paper-second-term')}
      />
    </div>;
  }

  return <TeacherDashboardFresh context={context} loading={loading} error={contextError} onNavigate={onNavigate} />;
}
