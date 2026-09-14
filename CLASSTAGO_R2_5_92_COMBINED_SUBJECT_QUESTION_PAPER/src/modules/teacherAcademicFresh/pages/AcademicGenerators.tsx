import { Component, useState, type ErrorInfo, type ReactNode } from 'react';
import type { AcademicRecordListItem, StudyMaterial, TeacherAssignment } from '../types/domain';
import { GenerationWorkspace } from '../components/GenerationWorkspace';
import { AcademicHistory } from '../components/AcademicHistory';
import { SubmissionReviewPanel } from '../components/SubmissionReviewPanel';
import { HomeworkBuilder } from '../components/HomeworkBuilder';
import { YearPlanBuilder } from '../components/YearPlanBuilder';
import type { TeachingAcademicSubmenuId } from '../config/navigation';

const configs = {
  'year-plan': {
    title: 'AI Year Plan', description: 'Generate annual/month-wise chapter distribution, expected periods, revision slots and exam preparation from selected syllabus/study material.', taskType: 'year-plan',
    fields: [
      { key: 'teachingDays', label: 'Available Teaching Days', type: 'number', placeholder: 'e.g. 190' },
      { key: 'weeklyPeriods', label: 'Weekly Periods', type: 'number', placeholder: 'e.g. 6' },
      { key: 'revisionSlots', label: 'Revision / Examination Preparation', type: 'textarea', placeholder: 'Optional school-specific revision constraints' },
    ],
  },
  'daily-plan': {
    title: 'AI Daily Teaching Plan', description: 'Create a practical period-wise teaching plan from the assigned Subject Textbook. The prepared Textbook source is reused automatically.', taskType: 'daily-teaching-plan',
    fields: [
      { key: 'topic', label: 'Topic', placeholder: 'Exact topic to teach' },
      { key: 'date', label: 'Teaching Date', type: 'date' },
      { key: 'numberOfPeriods', label: 'Number of Periods', type: 'number', defaultValue: 1 },
      { key: 'resourceNotes', label: 'Required Teaching Resources', type: 'textarea', placeholder: 'Board, worksheet, map, lab material…' },
    ],
    historyTitle: 'Daily Teaching Plan History',
  },
  'lesson-plan': {
    title: 'AI Lesson Plan', description: 'Create a formal editable lesson plan from the assigned Textbook with objectives, teaching-learning process, assessment and completion workflow.', taskType: 'lesson-plan',
    fields: [
      { key: 'topic', label: 'Topic', placeholder: 'Lesson topic' },
      { key: 'plannedDate', label: 'Planned Date', type: 'date' },
      { key: 'learningObjectives', label: 'Learning Objectives', type: 'textarea', placeholder: 'Teacher objectives or leave blank for AI draft' },
      { key: 'teachingMethod', label: 'Teaching Method / Activity', type: 'textarea', placeholder: 'Discussion, demonstration, group activity…' },
      { key: 'resources', label: 'Resources', type: 'textarea', placeholder: 'Study material / teaching aids' },
      { key: 'expectedPeriods', label: 'Expected Periods', type: 'number', defaultValue: 1 },
      { key: 'status', label: 'Status', type: 'select', options: ['Planned', 'In Progress', 'Completed'], defaultValue: 'Planned' },
    ],
    historyTitle: 'Lesson Plan History',
  },
  'homework': {
    title: 'AI Homework', description: 'Generate homework only from selected chapters/material, then edit, save and publish when appropriate.', taskType: 'homework',
    fields: [
      { key: 'date', label: 'Homework Date', type: 'date' },
      { key: 'dueDate', label: 'Due Date', type: 'date' },
      { key: 'difficulty', label: 'Difficulty', type: 'select', options: ['Easy', 'Balanced', 'Challenging'] },
      { key: 'length', label: 'Length / Quantity', placeholder: 'e.g. 10 questions / 30 minutes' },
    ],
    allowPublish: true,
    allowAttachment: true,
    allowDivisionCopy: true,
    historyTitle: 'Previous Homework History',
  },
  'teaching-diary': {
    title: 'AI Teaching Diary', description: 'Prepare the official daily record from what was actually taught. AI formats factual teacher inputs and never invents completed teaching.', taskType: 'teaching-diary-assist',
    fields: [
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'period', label: 'Period', type: 'number' },
      { key: 'chapterUnitTaught', label: 'Chapter / Unit Actually Taught', placeholder: 'Actual chapter / unit, if applicable' },
      { key: 'topicTaught', label: 'Topic Taught', placeholder: 'Actual topic taught today' },
      { key: 'homeworkGiven', label: 'Homework Given', type: 'textarea' },
      { key: 'classRemarks', label: 'Student / Class Remarks', type: 'textarea' },
      { key: 'status', label: 'Status', type: 'select', options: ['Completed', 'Partially Completed', 'Not Taken'] },
      { key: 'substituteOrFreeReason', label: 'Substitute / Free Period Reason', type: 'textarea' },
    ],
    historyTitle: 'Teaching Diary History',
  },
  'classwork': {
    title: 'AI Classwork & Assignments', description: 'Create Textbook-grounded Classwork or Assignments with deadline, attachments, submission tracking and optional marks/grade.', taskType: 'classwork-assignment',
    fields: [
      { key: 'workType', label: 'Work Type', type: 'select', options: ['Classwork', 'Assignment'], defaultValue: 'Classwork' },
      { key: 'topic', label: 'Topic / Focus', placeholder: 'Optional specific topic within the selected chapter' },
      { key: 'deadline', label: 'Submission Deadline', type: 'date' },
      { key: 'submissionTracking', label: 'Submission Tracking', type: 'select', options: ['Required', 'Not Required'], defaultValue: 'Required' },
      { key: 'marksOrGrade', label: 'Optional Marks / Grade', placeholder: 'e.g. 20 marks / Grade A-E' },
      { key: 'difficulty', label: 'Difficulty', type: 'select', options: ['Easy', 'Balanced', 'Challenging'], defaultValue: 'Balanced' },
      { key: 'remarks', label: 'Teacher Remarks', type: 'textarea' },
    ],
    allowPublish: true,
    allowAttachment: true,
    allowDivisionCopy: true,
    historyTitle: 'Classwork & Assignment History',
    submissions: true,
  },
} as const;


class HomeworkSafeBoundary extends Component<{ children: ReactNode; resetKey: number; onReset: () => void }, { failed: boolean; detail: string }> {
  state = { failed: false, detail: '' };
  static getDerivedStateFromError(error: unknown) { return { failed: true, detail: error instanceof Error ? error.message : 'Unexpected Homework display error.' }; }
  componentDidCatch(error: unknown, info: ErrorInfo) { console.error('R33.1 Homework UI recovered from an unexpected render error:', error, info.componentStack); }
  componentDidUpdate(prev: Readonly<{ children: ReactNode; resetKey: number; onReset: () => void }>) { if (prev.resetKey !== this.props.resetKey && this.state.failed) this.setState({ failed: false, detail: '' }); }
  render() {
    if (!this.state.failed) return this.props.children;
    return <div className="card border border-rose-200 bg-rose-50"><h3 className="text-base font-black text-rose-900">Homework page recovered safely</h3><p className="mt-2 text-xs leading-5 text-rose-800">An unexpected display error was stopped before it could blank the whole Teacher page. Saved Homework and uploaded files are safe.</p>{this.state.detail&&<p className="mt-2 rounded-lg bg-white/70 p-2 text-[10px] text-rose-700">{this.state.detail}</p>}<button type="button" className="btn primary mt-3" onClick={this.props.onReset}>Reset Homework Form</button></div>;
  }
}

type Props = { page: Exclude<TeachingAcademicSubmenuId, 'study-material'>; assignments: TeacherAssignment[]; materials: StudyMaterial[]; onNavigate?: (moduleId: string, featureId?: string) => void };

export function AcademicGeneratorPage({ page, assignments, materials, onNavigate }: Props) {
  const config = configs[page];
  const [refreshKey, setRefreshKey] = useState(0);
  const [submissionRecord, setSubmissionRecord] = useState<AcademicRecordListItem | null>(null);
  const [editingHomework, setEditingHomework] = useState<AcademicRecordListItem | null>(null);
  const [homeworkBoundaryKey, setHomeworkBoundaryKey] = useState(0);
  const allowPublish = 'allowPublish' in config ? Boolean(config.allowPublish) : false;
  const allowAttachment = 'allowAttachment' in config ? Boolean(config.allowAttachment) : false;
  const allowDivisionCopy = 'allowDivisionCopy' in config ? Boolean(config.allowDivisionCopy) : false;
  const historyTitle = 'historyTitle' in config ? String(config.historyTitle) : '';
  const submissions = 'submissions' in config ? Boolean(config.submissions) : false;

  if (page === 'year-plan') return <YearPlanBuilder assignments={assignments} materials={materials} />;

  if (page === 'homework') {
    const editHomework = (record: AcademicRecordListItem) => {
      setEditingHomework(record);
      requestAnimationFrame(() => document.getElementById('homework-builder-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    };
    const resetHomework = () => { setEditingHomework(null); setHomeworkBoundaryKey(n=>n+1); };
    return <>
      <HomeworkSafeBoundary resetKey={homeworkBoundaryKey} onReset={resetHomework}>
        <HomeworkBuilder assignments={assignments} materials={materials} editingRecord={editingHomework} onEditingCleared={()=>setEditingHomework(null)} onSaved={() => setRefreshKey((n) => n + 1)} onNavigate={onNavigate} />
      </HomeworkSafeBoundary>
      <AcademicHistory kind="homework" title="Previous Homework History" refreshKey={refreshKey} onEdit={editHomework} onResend={()=>onNavigate?.('tr-homework-notifications')} onChanged={()=>setRefreshKey(n=>n+1)} />
    </>;
  }

  return <>
    <GenerationWorkspace
      title={config.title}
      description={config.description}
      taskType={config.taskType}
      assignments={assignments}
      materials={materials}
      fields={[...config.fields]}
      allowPublish={allowPublish}
      allowAttachment={allowAttachment}
      allowDivisionCopy={allowDivisionCopy}
      onSaved={() => setRefreshKey((n) => n + 1)}
    />
    {historyTitle && <AcademicHistory kind={config.taskType} title={historyTitle} refreshKey={refreshKey} onSelect={submissions ? setSubmissionRecord : undefined} />}
    {submissionRecord && <SubmissionReviewPanel recordId={submissionRecord.id} onClose={() => setSubmissionRecord(null)} />}
  </>;
}
