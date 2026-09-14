import { useEffect, useMemo, useState } from 'react';
import type {
  CombinedSubjectGroup,
  QuestionPaperDraft,
  QuestionPaperExam,
  QuestionPaperQuestion,
  QuestionPaperSourceMode,
  QuestionPatternRow,
  StudyMaterial,
  TeacherAssignment,
} from '../types/domain';
import { SmartPrintDialog } from '../components/SmartPrintDialog';
import { CombinedQuestionPaperBuilder } from '../components/CombinedQuestionPaperBuilder';
import {
  generateQuestionPaperDraft,
  getQuestionPaperPatternPreview,
  listCombinedSubjectGroups,
  listStudyMaterialChapters,
  prepareHomeworkTextbookSource,
  regenerateQuestion,
  saveQuestionPaper,
} from '../services/teacherAcademicService';
import { resolveAcademicTextPresentation } from '../utils/languagePresentation';
import { divisionPrintSuffix, divisionScreenLabel } from '../../../lib/divisionPresentation';
import { subscribeMariaDynamicCommands, takePendingMariaDynamicCommands, type MariaQuestionPaperCommand } from '../../../lib/mariaClientBridge';

type Term = 'first' | 'second';
type Step = 'term' | 'exam' | 'builder';

type Props = {
  assignments: TeacherAssignment[];
  materials: StudyMaterial[];
  initialTerm?: Term;
  initialExam?: QuestionPaperExam;
  onBackToTeacher?: () => void;
  onBackToTerm?: (term: Term) => void;
};

type PatternPreview = {
  available: boolean;
  title?: string;
  pattern: QuestionPatternRow[];
  totalMarks: number;
};

const examLabels: Record<QuestionPaperExam, string> = {
  first_unit_test: 'First Unit Test',
  first_term_examination: 'First Term Examination',
  second_unit_test: 'Second Unit Test',
  second_term_examination: 'Second Term Examination',
};

const defaultPattern: QuestionPatternRow[] = [
  { type: 'MCQ', count: 5, marksEach: 1 },
  { type: 'Very Short Answer', count: 5, marksEach: 1 },
  { type: 'Short Answer', count: 5, marksEach: 2 },
  { type: 'Long Answer', count: 4, marksEach: 5 },
];

type QuestionSubjectFamily = 'general' | 'science' | 'maths' | 'language' | 'social' | 'art' | 'computer';
const questionFamilyForSubject = (assignment?: TeacherAssignment | null): QuestionSubjectFamily => {
  const value = `${assignment?.subjectName || ''} ${assignment?.subjectCode || ''}`.toLowerCase();
  if (/math|mathematics|maths|algebra|geometry|arithmetic|ganit/.test(value)) return 'maths';
  if (/drawing|art|craft|fine art|work experience/.test(value)) return 'art';
  if (/computer|ict|information technology|coding/.test(value)) return 'computer';
  if (/science|evs|environment|physics|chemistry|biology/.test(value)) return 'science';
  if (/history|geography|civics|social|political science|economics/.test(value)) return 'social';
  if (/english|urdu|hindi|marathi|sanskrit|gujarati|kannada|tamil|telugu|malayalam|bengali|punjabi|odia|assamese|kashmiri|sindhi|language/.test(value)) return 'language';
  return 'general';
};
const QUESTION_TYPES_BY_FAMILY: Record<QuestionSubjectFamily, string[]> = {
  general: ['MCQ','Fill in the Blanks','True / False','Match the Following','Very Short Answer','Short Answer','Long Answer'],
  science: ['MCQ','Fill in the Blanks','True / False','Match the Following','Very Short Answer','Short Answer','Long Answer','Definitions / Terms','Give Reasons','Diagram / Labeling','Observation / Activity'],
  maths: ['MCQ','Fill in the Blanks','Solve Problems / Sums','Word Problems','Mental Maths','Show Complete Working','Geometry / Construction','Very Short Answer','Short Answer'],
  language: ['MCQ','Fill in the Blanks','Match the Following','Very Short Answer','Short Answer','Long Answer','Grammar / Language Practice','Paragraph Answer','Comprehension','Vocabulary / Word Meaning','Sentence Making','Writing / Essay'],
  social: ['MCQ','Fill in the Blanks','True / False','Match the Following','Very Short Answer','Short Answer','Long Answer','Map Work','Timeline / Sequence','Identify / Name','Cause & Effect'],
  art: ['Drawing','Sketching','Colouring','Pattern / Design','Observation Drawing','Creative Composition','Craft / Activity'],
  computer: ['MCQ','Fill in the Blanks','True / False','Match the Following','Very Short Answer','Short Answer','Long Answer','Practical Task','Lab Exercise','Shortcut Keys','Identify Parts / Components'],
};
const defaultQuestionPatternFor = (assignment?: TeacherAssignment | null): QuestionPatternRow[] => {
  switch (questionFamilyForSubject(assignment)) {
    case 'maths': return [{ type:'MCQ',count:5,marksEach:1 },{ type:'Solve Problems / Sums',count:5,marksEach:3 },{ type:'Word Problems',count:4,marksEach:5 }];
    case 'language': return [{ type:'Fill in the Blanks',count:5,marksEach:1 },{ type:'Grammar / Language Practice',count:5,marksEach:1 },{ type:'Short Answer',count:5,marksEach:2 },{ type:'Long Answer',count:4,marksEach:5 }];
    case 'social': return [{ type:'MCQ',count:5,marksEach:1 },{ type:'Very Short Answer',count:5,marksEach:1 },{ type:'Short Answer',count:5,marksEach:2 },{ type:'Long Answer',count:4,marksEach:5 }];
    case 'art': return [{ type:'Drawing',count:2,marksEach:10 },{ type:'Creative Composition',count:2,marksEach:10 }];
    case 'computer': return [{ type:'MCQ',count:5,marksEach:1 },{ type:'Fill in the Blanks',count:5,marksEach:1 },{ type:'Practical Task',count:5,marksEach:2 },{ type:'Short Answer',count:4,marksEach:5 }];
    case 'science': return [{ type:'MCQ',count:5,marksEach:1 },{ type:'Fill in the Blanks',count:5,marksEach:1 },{ type:'Short Answer',count:5,marksEach:2 },{ type:'Long Answer',count:4,marksEach:5 }];
    default: return defaultPattern.map((row) => ({ ...row }));
  }
};
const expandedAcademicYear = (value?: string | null) => {
  const raw = String(value || '').trim();
  const match = raw.match(/(\d{4})\D+(\d{2,4})/);
  if (!match) return raw;
  const start = Number(match[1]);
  const endRaw = match[2];
  const end = endRaw.length === 2 ? Math.floor(start / 100) * 100 + Number(endRaw) : Number(endRaw);
  return `${start}-${end}`;
};

const patternTotal = (rows: QuestionPatternRow[]) => rows.reduce((sum, row) => sum + Number(row.count || 0) * Number(row.marksEach || 0), 0);

const normalizedQuestionType = (value: string) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const resolvedAnswerLayout = (question: QuestionPaperQuestion) => {
  if (question.answerLayout) return question.answerLayout;
  const type = normalizedQuestionType(question.type);
  if (/\b(mcq|multiple choice|objective choice)\b/.test(type)) return 'mcq';
  if (/fill.*blank|blank.*fill|complete.*blank/.test(type)) return 'fill_blanks';
  if (/true.*false|false.*true/.test(type)) return 'true_false';
  if (/match|matching/.test(type)) return 'match';
  if (/diagram|draw|drawing|sketch|colour|color|pattern|design|craft|creative composition|label|map|construction/.test(type)) return 'diagram';
  if (/solve|sum|numerical|problem|working|calculate|geometry|practical task|lab exercise/.test(type)) return 'working';
  if (/very short|one word|one sentence/.test(type)) return 'very_short';
  if (/paragraph/.test(type)) return 'paragraph';
  if (/long|essay|descriptive/.test(type)) return 'long';
  if (/short/.test(type)) return 'short';
  return 'default';
};

const resolvedAnswerLines = (question: QuestionPaperQuestion) => {
  if (Number.isFinite(Number(question.answerLines)) && Number(question.answerLines) > 0) return Math.min(20, Math.max(1, Math.floor(Number(question.answerLines))));
  const marks = Math.max(1, Math.floor(Number(question.marks || 1)));
  const layout = resolvedAnswerLayout(question);
  if (layout === 'very_short') return Math.min(3, Math.max(2, marks));
  if (layout === 'short') return Math.min(8, Math.max(4, marks * 2));
  if (layout === 'paragraph') return Math.min(14, Math.max(6, marks * 2));
  if (layout === 'long') return Math.min(18, Math.max(8, marks * 2));
  if (layout === 'default') return Math.min(12, Math.max(2, marks * 2));
  return 0;
};

function QuestionAnswerArea({ question }: { question: QuestionPaperQuestion }) {
  const layout = resolvedAnswerLayout(question);
  if (layout === 'fill_blanks') return null;
  if (layout === 'mcq') {
    const options = (question.options || []).filter(Boolean).slice(0, 6);
    return <div className="qp-answer-area qp-mcq-options">{options.length ? options.map((option, index) => <div className="qp-option" key={`${question.id}-opt-${index}`}><span className="qp-choice-circle" aria-hidden="true" /> <span dir="auto">{option}</span></div>) : <div className="qp-inline-answer">○ ________ &nbsp;&nbsp; ○ ________ &nbsp;&nbsp; ○ ________ &nbsp;&nbsp; ○ ________</div>}</div>;
  }
  if (layout === 'true_false') return <div className="qp-answer-area qp-inline-answer"><span className="qp-short-blank" /></div>;
  if (layout === 'match') {
    const left = (question.matchLeft || []).filter(Boolean).slice(0, 12);
    const right = (question.matchRight || []).filter(Boolean).slice(0, 12);
    const rowCount = Math.max(left.length, right.length, 4);
    return <div className="qp-answer-area"><table className="qp-match-table"><thead><tr><th>#</th><th>A</th><th>B</th><th>↔</th></tr></thead><tbody>{Array.from({ length: rowCount }, (_, index) => <tr key={`${question.id}-match-${index}`}><td>{index + 1}</td><td><span dir="auto">{left[index] || ''}</span></td><td><span dir="auto">{right[index] ? `${String.fromCharCode(65 + index)}. ${right[index]}` : ''}</span></td><td><span className="qp-match-answer-blank" /></td></tr>)}</tbody></table></div>;
  }
  if (layout === 'working') {
    const heightClass = Number(question.marks || 1) >= 5 ? 'large' : Number(question.marks || 1) >= 3 ? 'medium' : 'small';
    return <div className={`qp-answer-area qp-working-box ${heightClass}`} />;
  }
  if (layout === 'diagram') {
    const heightClass = Number(question.marks || 1) >= 5 ? 'large' : 'medium';
    return <div className={`qp-answer-area qp-diagram-box ${heightClass}`}><span className="screen-only">Drawing / diagram answer area</span></div>;
  }
  const lines = resolvedAnswerLines(question);
  return lines > 0 ? <div className="qp-answer-area qp-ruled-answer">{Array.from({ length: lines }, (_, index) => <span className="qp-answer-line" key={`${question.id}-line-${index}`} />)}</div> : null;
}


const sectionQuestionPrefix = (presentation: ReturnType<typeof resolveAcademicTextPresentation>) => {
  if (presentation.scriptClass === 'nastaliq' || presentation.scriptClass === 'arabic') return 'سوال نمبر';
  if (presentation.scriptClass === 'devanagari') return 'प्रश्न क्र.';
  return 'Q.';
};

const formatSectionMarks = (value: number) => {
  if (!Number.isFinite(value)) return '00';
  if (Number.isInteger(value)) return String(value).padStart(2, '0');
  return String(Number(value.toFixed(2)));
};

function QuestionSectionMatchTable({ questions, answerLabel }: { questions: QuestionPaperQuestion[]; answerLabel: string }) {
  const left = questions.flatMap((question) => (question.matchLeft || []).filter(Boolean)).slice(0, 24);
  const right = questions.flatMap((question) => (question.matchRight || []).filter(Boolean)).slice(0, 24);
  // Keep the stored pairs correct internally, but rotate the visible B column so
  // the printed table does not accidentally reveal the answer row-by-row.
  const displayRight = right.length > 1 ? [...right.slice(1), right[0]] : right;
  const rowCount = Math.max(left.length, displayRight.length, questions.length, 1);
  return <div className="qp-answer-area qp-section-match-wrap"><table className="qp-match-table qp-section-match-table"><thead><tr><th>#</th><th>A</th><th>B</th><th>{answerLabel}</th></tr></thead><tbody>{Array.from({ length: rowCount }, (_, index) => <tr key={`section-match-${index}`}><td>{index + 1}</td><td><span dir="auto">{left[index] || ''}</span></td><td><span dir="auto">{displayRight[index] ? `${String.fromCharCode(65 + index)}. ${displayRight[index]}` : ''}</span></td><td><span className="qp-match-answer-blank" /></td></tr>)}</tbody></table></div>;
}


function ModelAnswerMatchTable({ questions, answerLabel }: { questions: QuestionPaperQuestion[]; answerLabel: string }) {
  const left = questions.flatMap((question) => (question.matchLeft || []).filter(Boolean)).slice(0, 24);
  const right = questions.flatMap((question) => (question.matchRight || []).filter(Boolean)).slice(0, 24);
  const rowCount = Math.max(left.length, right.length, questions.length, 1);
  return <div className="qp-model-answer-match-wrap"><table className="qp-match-table qp-model-answer-match-table"><thead><tr><th>#</th><th>A</th><th>{answerLabel}</th></tr></thead><tbody>{Array.from({ length: rowCount }, (_, index) => <tr key={`model-match-${index}`}><td>{index + 1}</td><td><span dir="auto">{left[index] || ''}</span></td><td><span dir="auto">{right[index] || ''}</span></td></tr>)}</tbody></table></div>;
}

function ModelAnswerResponse({ question, answerLabel, presentation }: { question: QuestionPaperQuestion; answerLabel: string; presentation: ReturnType<typeof resolveAcademicTextPresentation> }) {
  const answer = String(question.modelAnswer || '').trim();
  const layout = resolvedAnswerLayout(question);
  return <div className={`qp-model-answer-response ${presentation.className}`} dir={presentation.dir} lang={presentation.languageCode === 'auto' ? undefined : presentation.languageCode}>
    {layout === 'mcq' && (question.options || []).length > 0 && <div className="qp-model-mcq-options">{(question.options || []).map((option, index) => <div key={`${question.id}-model-opt-${index}`} className={normalizedQuestionType(option) === normalizedQuestionType(answer) ? 'is-correct' : ''}><span>{normalizedQuestionType(option) === normalizedQuestionType(answer) ? '✓' : '○'}</span><span dir="auto">{option}</span></div>)}</div>}
    <div className="qp-model-answer-text"><strong>{answerLabel}:</strong><span>{answer || (layout === 'match' ? (question.matchRight || [])[0] || '—' : '—')}</span></div>
  </div>;
}

export function QuestionPaperPage({ assignments, materials, initialTerm, initialExam, onBackToTeacher, onBackToTerm }: Props) {
  const initialResolvedTerm: Term | null = initialExam
    ? (initialExam.startsWith('first_') ? 'first' : 'second')
    : (initialTerm || null);
  const [step, setStep] = useState<Step>(initialExam ? 'builder' : initialResolvedTerm ? 'exam' : 'term');
  const [term, setTerm] = useState<Term | null>(initialResolvedTerm);
  const [exam, setExam] = useState<QuestionPaperExam | null>(initialExam || null);
  const [assignmentId, setAssignmentId] = useState('');
  const [classId, setClassId] = useState('');
  const [divisionId, setDivisionId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [chapters, setChapters] = useState<string[]>([]);
  const [useWholeChapterSource, setUseWholeChapterSource] = useState(true);
  const [useExerciseSource, setUseExerciseSource] = useState(true);
  const [indexedChapters, setIndexedChapters] = useState<string[]>([]);
  const [chapterLoading, setChapterLoading] = useState(false);
  const [totalMarks, setTotalMarks] = useState(40);
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [pattern, setPattern] = useState<QuestionPatternRow[]>(defaultPattern);
  const [useSchoolPattern, setUseSchoolPattern] = useState(false);
  const [schoolPattern, setSchoolPattern] = useState<PatternPreview>({ available: false, pattern: [], totalMarks: 0 });
  const [patternLoading, setPatternLoading] = useState(false);
  const [paper, setPaper] = useState<QuestionPaperDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [paperMode, setPaperMode] = useState<'single' | 'combined'>('single');
  const [combinedGroups, setCombinedGroups] = useState<CombinedSubjectGroup[]>([]);
  const [combinedGroupId, setCombinedGroupId] = useState('');
  const [combinedLoading, setCombinedLoading] = useState(false);
  const [pendingMariaQuestionPaper, setPendingMariaQuestionPaper] = useState<MariaQuestionPaperCommand | null>(null);
  const [mariaQuestionStage, setMariaQuestionStage] = useState('');
  const [mariaQuestionStatus, setMariaQuestionStatus] = useState('');
  const [mariaQuestionInstruction, setMariaQuestionInstruction] = useState('');

  useEffect(() => {
    const nextTerm: Term | null = initialExam
      ? (initialExam.startsWith('first_') ? 'first' : 'second')
      : (initialTerm || null);
    setTerm(nextTerm);
    setExam(initialExam || null);
    setStep(initialExam ? 'builder' : nextTerm ? 'exam' : 'term');
    setPaper(null);
    setError('');
    setSaveMessage('');
  }, [initialTerm, initialExam]);

  const normalizeMariaAcademicText = (value:any) => String(value || '').normalize('NFKC').toLowerCase().replace(/[^a-z0-9\u0900-\u097f\u0600-\u06ff]+/g, ' ').trim();
  useEffect(() => {
    const accept = (command:any) => { if (command?.type === 'maria_question_paper') { setPendingMariaQuestionPaper(command as MariaQuestionPaperCommand); setMariaQuestionStage('scope'); setMariaQuestionStatus('Maria is preparing this request inside the existing Question Paper builder.'); } };
    const unsubscribe = subscribeMariaDynamicCommands(accept);
    for (const command of takePendingMariaDynamicCommands('maria_question_paper')) accept(command);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!pendingMariaQuestionPaper || mariaQuestionStage !== 'scope' || !assignments.length) return;
    const requestedId=String(pendingMariaQuestionPaper.assignmentId||''); const subject=normalizeMariaAcademicText(pendingMariaQuestionPaper.subjectName); const className=normalizeMariaAcademicText(pendingMariaQuestionPaper.className); const division=normalizeMariaAcademicText(pendingMariaQuestionPaper.division);
    const matches=assignments.filter(item => requestedId ? item.id===requestedId : (!subject||normalizeMariaAcademicText(item.subjectName)===subject)&&(!className||normalizeMariaAcademicText(item.className)===className)&&(!division||normalizeMariaAcademicText(item.division)===division));
    if(matches.length!==1){setError(matches.length?'Maria found more than one matching Question Paper assignment. Please specify Class/Division.':'Maria could not find that subject in your current assigned Question Paper scope.');setMariaQuestionStatus('Maria stopped before changing any Question Paper data.');setPendingMariaQuestionPaper(null);setMariaQuestionStage('');return;}
    const match=matches[0]; const nextExam=pendingMariaQuestionPaper.exam||null; if(!nextExam){setError('Maria needs the Exam type before generating a Question Paper.');setPendingMariaQuestionPaper(null);setMariaQuestionStage('');return;}
    const nextTerm:Term=nextExam.startsWith('first_')?'first':'second';
    setPaperMode('single');setCombinedGroupId('');setTerm(nextTerm);setExam(nextExam);setStep('builder');setAssignmentId(match.id);setClassId(match.className);setDivisionId(match.division);setSubjectId(match.subjectId);setChapters([]);setPaper(null);setError('');setSaveMessage('');
    if(Number(pendingMariaQuestionPaper.totalMarks)>0)setTotalMarks(Math.max(1,Math.floor(Number(pendingMariaQuestionPaper.totalMarks))));
    if(Number(pendingMariaQuestionPaper.durationMinutes)>0)setDurationMinutes(Math.max(15,Math.floor(Number(pendingMariaQuestionPaper.durationMinutes))));
    setMariaQuestionInstruction(String(pendingMariaQuestionPaper.instruction||'').trim());
    setMariaQuestionStage('chapters');setMariaQuestionStatus(`Maria selected ${match.className} · ${divisionScreenLabel(match.division)} · ${match.subjectName} · ${examLabels[nextExam]}. Waiting for the existing Textbook chapter list.`);
  }, [pendingMariaQuestionPaper, mariaQuestionStage, assignments]);

  const assignment = assignments.find((a) => a.id === assignmentId);
  const selectedCombinedGroup = combinedGroups.find((group) => group.id === combinedGroupId) || null;
  const questionSubjectFamily = useMemo(() => questionFamilyForSubject(assignment), [assignment?.subjectName, assignment?.subjectCode]);
  const compatibleQuestionTypes = useMemo(() => QUESTION_TYPES_BY_FAMILY[questionSubjectFamily], [questionSubjectFamily]);
  const paperPresentation = useMemo(() => resolveAcademicTextPresentation({ languageHint: assignment?.medium || '', text: paper ? `${paper.title}\n${paper.instructions.join('\n')}\n${paper.pattern.map((row) => row.displayTitle || row.type).join('\n')}\n${paper.questions.map((q) => q.text).join('\n')}` : '' }), [assignment?.medium, paper]);
  const classOptions = useMemo(() => [...new Map(assignments.map(a => [a.className, a])).values()], [assignments]);
  const divisionOptions = useMemo(() => [...new Map(assignments.filter(a => !classId || a.className === classId).map(a => [a.division, a])).values()], [assignments, classId]);
  const subjectOptions = useMemo(() => assignments.filter(a => (!classId || a.className === classId) && (!divisionId || a.division === divisionId)), [assignments, classId, divisionId]);

  const scopedTextbooks = useMemo(() => materials.filter((m) => assignment && m.className === assignment.className && m.subjectId === assignment.subjectId && m.category === 'textbook'), [assignment, materials]);
  const readyTextbooks = useMemo(() => scopedTextbooks.filter((m) => m.extractionStatus === 'ready'), [scopedTextbooks]);
  const preparingTextbooks = useMemo(() => scopedTextbooks.filter((m) => m.extractionStatus === 'pending' || m.extractionStatus === 'processing'), [scopedTextbooks]);
  const failedTextbooks = useMemo(() => scopedTextbooks.filter((m) => m.extractionStatus === 'failed'), [scopedTextbooks]);
  const autoMaterialIds = useMemo(() => readyTextbooks.map((m) => m.id), [readyTextbooks]);
  const chapterOptions = indexedChapters;
  const patternMarks = patternTotal(pattern);
  const questionSourceMode: QuestionPaperSourceMode = useWholeChapterSource && useExerciseSource ? 'both' : useExerciseSource ? 'exercise' : 'whole_chapter';
  const paperSections = useMemo(() => {
    if (!paper) return [];
    const ordered = [...paper.questions].sort((a, b) => a.orderNo - b.orderNo);
    const hasExplicitSections = ordered.length > 0 && ordered.every((q) => Number(q.sectionIndex || 0) > 0);
    let cursor = 0;
    return paper.pattern.map((row, sectionIndex) => {
      const itemCount = Math.max(0, Math.floor(Number(row.count || 0)));
      const items = hasExplicitSections
        ? ordered.filter((q) => Number(q.sectionIndex) === sectionIndex + 1)
        : ordered.slice(cursor, cursor + itemCount);
      if (!hasExplicitSections) cursor += itemCount;
      return {
        row,
        sectionIndex,
        items,
        totalMarks: itemCount * Number(row.marksEach || 0),
        isMatch: /match|matching/.test(normalizedQuestionType(row.type)),
      };
    });
  }, [paper]);
  const paperParts = useMemo(() => {
    if (!paper) return [];
    const map = new Map<number, { componentIndex:number; subjectName:string; instructions:string[]; sections:typeof paperSections; presentation:ReturnType<typeof resolveAcademicTextPresentation>; totalMarks:number }>();
    for (const section of paperSections) {
      const componentIndex = Number(section.row.componentIndex || 1);
      const subjectName = String(section.row.componentSubjectName || '');
      const existing = map.get(componentIndex);
      const text = `${section.row.displayTitle || section.row.type}\n${section.items.map((q) => q.text).join('\n')}`;
      if (existing) {
        existing.sections.push(section);
        existing.totalMarks += section.totalMarks;
      } else {
        const componentAssignment = assignments.find((a) => a.id === section.row.componentAssignmentId);
        map.set(componentIndex, {
          componentIndex,
          subjectName,
          instructions: Array.isArray(section.row.componentInstructions) ? section.row.componentInstructions : [],
          sections: [section],
          presentation: resolveAcademicTextPresentation({ languageHint: componentAssignment?.medium || '', text }),
          totalMarks: section.totalMarks,
        });
      }
    }
    return [...map.values()].sort((a, b) => a.componentIndex - b.componentIndex);
  }, [paper, paperSections, assignments]);
  const isCombinedPaper = Boolean(paper?.pattern.some((row) => row.combinedGroupId));
  const paperSubjectLabel = paper?.combinedMeta?.groupName
    ? (paper.combinedMeta.workflow === 'collaborative_component' && paper.combinedMeta.componentSubjectName
      ? `${paper.combinedMeta.groupName} · ${paper.combinedMeta.componentSubjectName}`
      : paper.combinedMeta.groupName)
    : (assignment?.subjectName || '-');
  const questionPrefix = sectionQuestionPrefix(paperPresentation);
  const matchAnswerLabel = paperPresentation.scriptClass === 'nastaliq' || paperPresentation.scriptClass === 'arabic'
    ? 'جواب'
    : paperPresentation.scriptClass === 'devanagari'
      ? 'उत्तर'
      : 'Answer';
  const modelAnswerTitle = paperPresentation.scriptClass === 'nastaliq' || paperPresentation.scriptClass === 'arabic'
    ? 'نمونہ جوابی پرچہ'
    : paperPresentation.scriptClass === 'devanagari'
      ? 'आदर्श उत्तरपत्रिका'
      : 'MODEL ANSWER / ANSWER KEY';
  const correctMatchLabel = paperPresentation.scriptClass === 'nastaliq' || paperPresentation.scriptClass === 'arabic'
    ? 'درست جواب'
    : paperPresentation.scriptClass === 'devanagari'
      ? 'सही उत्तर'
      : 'Correct Answer';

  const chooseLinkedScope = (nextClass: string, nextDivision: string, nextSubjectId: string) => {
    const match = assignments.find(a => a.className === nextClass && a.division === nextDivision && a.subjectId === nextSubjectId);
    setAssignmentId(match?.id || '');
    setChapters([]);
    setIndexedChapters([]);
    setPaper(null);
    setError('');
    setSaveMessage('');
  };

  useEffect(() => {
    if (!assignments.length) { setClassId(''); setDivisionId(''); setSubjectId(''); setAssignmentId(''); return; }
    if (assignmentId && assignment) { setClassId(assignment.className); setDivisionId(assignment.division); setSubjectId(assignment.subjectId); return; }
    if (!classId) return;
    const div = divisionId || assignments.find(a => a.className === classId)?.division || '';
    const subj = subjectId || assignments.find(a => a.className === classId && a.division === div)?.subjectId || '';
    if (div !== divisionId) setDivisionId(div);
    if (subj !== subjectId) setSubjectId(subj);
    chooseLinkedScope(classId, div, subj);
  }, [assignments, assignmentId, classId, divisionId, subjectId]);

  useEffect(() => {
    let cancelled = false;
    setCombinedGroups([]);
    setCombinedGroupId('');
    setPaperMode('single');
    if (!assignmentId || !exam) return () => { cancelled = true; };
    setCombinedLoading(true);
    void listCombinedSubjectGroups({ assignmentId, exam })
      .then((groups) => { if (!cancelled) setCombinedGroups(groups); })
      .catch(() => { if (!cancelled) setCombinedGroups([]); })
      .finally(() => { if (!cancelled) setCombinedLoading(false); });
    return () => { cancelled = true; };
  }, [assignmentId, exam]);

  useEffect(() => {
    setPattern(defaultQuestionPatternFor(assignment));
  }, [assignmentId]);

  useEffect(() => {
    let cancelled = false;
    setIndexedChapters([]);
    setChapters([]);
    if (!autoMaterialIds.length) return () => { cancelled = true; };
    setChapterLoading(true);
    void listStudyMaterialChapters(autoMaterialIds)
      .then((rows) => { if (!cancelled) setIndexedChapters(rows); })
      .catch(() => { if (!cancelled) setIndexedChapters([]); })
      .finally(() => { if (!cancelled) setChapterLoading(false); });
    void prepareHomeworkTextbookSource(autoMaterialIds).catch(() => undefined);
    return () => { cancelled = true; };
  }, [assignmentId, autoMaterialIds.join('|')]);

  useEffect(() => {
    let cancelled = false;
    setSchoolPattern({ available: false, pattern: [], totalMarks: 0 });
    setUseSchoolPattern(false);
    if (!assignmentId || !exam || paperMode !== 'single') return () => { cancelled = true; };
    setPatternLoading(true);
    void getQuestionPaperPatternPreview({ assignmentId, exam })
      .then((preview) => {
        if (cancelled) return;
        setSchoolPattern(preview);
        // R33.11: a missing school pattern is not an error. Use the saved pattern
        // automatically when one exists; otherwise fall back to the editable
        // manual pattern so Question Paper generation never dead-ends here.
        if (preview.available) setUseSchoolPattern(true);
        if (preview.available && preview.totalMarks > 0) setTotalMarks(preview.totalMarks);
      })
      .catch(() => {
        if (!cancelled) {
          setSchoolPattern({ available: false, pattern: [], totalMarks: 0 });
          setUseSchoolPattern(false);
        }
      })
      .finally(() => { if (!cancelled) setPatternLoading(false); });
    return () => { cancelled = true; };
  }, [assignmentId, exam, paperMode]);

  useEffect(() => {
    if (paperMode === 'single' && useSchoolPattern && schoolPattern.available && schoolPattern.totalMarks > 0) setTotalMarks(schoolPattern.totalMarks);
  }, [paperMode, useSchoolPattern, schoolPattern.available, schoolPattern.totalMarks]);

  useEffect(() => {
    if(!pendingMariaQuestionPaper||mariaQuestionStage!=='chapters'||!assignment)return;
    if(!scopedTextbooks.length){setError('Maria cannot generate this Question Paper because the existing Question Paper module has no Textbook for this Class + Subject.');setMariaQuestionStatus('No generation was attempted.');setPendingMariaQuestionPaper(null);setMariaQuestionStage('');return;}
    if(!readyTextbooks.length&&(preparingTextbooks.length||chapterLoading))return;
    if(!readyTextbooks.length){setError('Textbook is not AI Ready in the existing Question Paper module.');setMariaQuestionStatus('No generation was attempted.');setPendingMariaQuestionPaper(null);setMariaQuestionStage('');return;}
    if(chapterLoading)return;
    const requested=(pendingMariaQuestionPaper.chapters||[]).map(String).map(value=>value.trim()).filter(Boolean);
    if(!requested.length){setChapters([]);setMariaQuestionStage('rules');setMariaQuestionStatus('Maria will use the whole authorised Textbook in the existing Question Paper generator.');return;}
    const matched:string[]=[];
    for(const requestedChapter of requested){const key=normalizeMariaAcademicText(requestedChapter);const exact=chapterOptions.filter(option=>normalizeMariaAcademicText(option)===key);const loose=exact.length?exact:chapterOptions.filter(option=>normalizeMariaAcademicText(option).includes(key)||key.includes(normalizeMariaAcademicText(option)));const unique:string[]=[...new Set<string>(loose.map(String))];if(unique.length!==1){setError(unique.length?`Maria found multiple chapter matches for “${requestedChapter}”. Please select the exact chapter.`:`Maria could not find “${requestedChapter}” in the indexed Textbook chapters. Classtago did not fall back to the whole book.`);setMariaQuestionStatus('Question Paper generation stopped safely before AI generation.');setPendingMariaQuestionPaper(null);setMariaQuestionStage('');return;}matched.push(unique[0]);}
    setChapters([...new Set(matched)]);setMariaQuestionStage('rules');setMariaQuestionStatus(`Maria matched ${matched.length} requested chapter${matched.length===1?'':'s'} to the existing Textbook index.`);
  },[pendingMariaQuestionPaper,mariaQuestionStage,assignment?.id,scopedTextbooks.length,readyTextbooks.length,preparingTextbooks.length,chapterLoading,chapterOptions.join('|')]);

  useEffect(()=>{
    if(!pendingMariaQuestionPaper||mariaQuestionStage!=='rules'||!assignment||patternLoading)return;
    const requestedMarks=Math.max(1,Math.floor(Number(pendingMariaQuestionPaper.totalMarks||totalMarks)));
    if(schoolPattern.available&&schoolPattern.totalMarks>0&&requestedMarks!==schoolPattern.totalMarks){setError(`Maria requested ${requestedMarks} marks, but the saved school Question Paper Pattern is ${schoolPattern.totalMarks} marks. Maria did not modify the school pattern. Adjust the request or pattern manually.`);setMariaQuestionStatus('Generation stopped before changing the existing paper pattern.');setPendingMariaQuestionPaper(null);setMariaQuestionStage('');return;}
    if(!schoolPattern.available&&patternMarks!==requestedMarks){setError(`Maria requested ${requestedMarks} marks, but the existing Manual Paper Pattern totals ${patternMarks}. Maria did not rewrite the pattern. Adjust the existing pattern, then ask Maria to generate again.`);setMariaQuestionStatus('Generation stopped before changing the existing paper pattern.');setPendingMariaQuestionPaper(null);setMariaQuestionStage('');return;}
    setMariaQuestionStage('generate');setMariaQuestionStatus('Maria validated the existing Question Paper rules and is ready to generate a Preview.');
  },[pendingMariaQuestionPaper,mariaQuestionStage,assignment?.id,patternLoading,schoolPattern.available,schoolPattern.totalMarks,patternMarks,totalMarks]);

  const chooseTerm = (value: Term) => { setTerm(value); setStep('exam'); setExam(null); setPaper(null); };
  const chooseExam = (value: QuestionPaperExam) => { setExam(value); setStep('builder'); setPaper(null); };

  const toggleChapter = (chapter: string) => {
    setChapters((current) => {
      const selected = new Set(current);
      if (selected.has(chapter)) selected.delete(chapter); else selected.add(chapter);
      return chapterOptions.filter((item) => selected.has(item));
    });
    setPaper(null);
  };

  const chapterSummary = chapterLoading
    ? 'Reading textbook chapters…'
    : !readyTextbooks.length
      ? 'Textbook chapter list unavailable'
      : chapters.length
        ? `${chapters.length} chapter${chapters.length === 1 ? '' : 's'} selected`
        : 'Whole textbook';

  const generateBlocker = useMemo(() => {
    if (!exam) return 'Select an examination.';
    if (!assignmentId) return 'Select Class, Division and Subject from your assigned scope.';
    if (!scopedTextbooks.length) return 'Textbook not uploaded for this Class + Subject.';
    if (!readyTextbooks.length && failedTextbooks.length) return 'Textbook chapter preparation needs attention. Open Study Material and use Check & Retry.';
    if (!readyTextbooks.length && preparingTextbooks.length) return 'Textbook chapter preparation is still running.';
    if (!readyTextbooks.length) return 'Textbook is not AI Ready yet.';
    if (!useWholeChapterSource && !useExerciseSource) return 'Select at least one Question Source: Whole Chapter or Chapter-end Mashq / Exercise.';
    if (useSchoolPattern && patternLoading) return 'Checking the saved school Question Paper Pattern…';
    if ((!useSchoolPattern || !schoolPattern.available) && patternMarks !== totalMarks) return `Manual pattern totals ${patternMarks} marks, but Total Marks is ${totalMarks}.`;
    return '';
  }, [exam, assignmentId, scopedTextbooks.length, readyTextbooks.length, failedTextbooks.length, preparingTextbooks.length, useWholeChapterSource, useExerciseSource, useSchoolPattern, patternLoading, schoolPattern.available, patternMarks, totalMarks]);

  const generate = async () => {
    setError(''); setSaveMessage(''); setBusy(true);
    try {
      if (generateBlocker) throw new Error(generateBlocker);
      if (!exam || !assignment) throw new Error('Select an examination and assigned subject scope.');
      const generated = await generateQuestionPaperDraft({
        taskType: 'question-paper',
        assignmentId,
        materialIds: autoMaterialIds,
        chapterScope: chapters,
        prompt: `Create a complete ${totalMarks}-mark ${examLabels[exam]} question paper. Use ONLY the automatically selected assigned Textbook and the selected chapter scope. Question source mode: ${questionSourceMode}. Use the Textbook/Subject language and native script automatically. Keep Fill in the Blanks visibly blank, provide clean MCQ options, structure Match the Following as two shuffled columns, and for Paragraph Answer require a coherent paragraph response rather than bullets or one-word answers. Do not include an answer key in the student paper.${mariaQuestionInstruction ? ` Additional Teacher instruction: ${mariaQuestionInstruction}` : ''}`,
        structuredInputs: {
          exam,
          totalMarks,
          durationMinutes,
          useSchoolPattern: useSchoolPattern && schoolPattern.available,
          manualPattern: useSchoolPattern && schoolPattern.available ? [] : pattern,
          sourcePolicy: 'textbook_only_auto',
          questionSource: questionSourceMode,
          languagePolicy: 'textbook_subject_language_auto',
          chapterSelectionMode: chapters.length ? 'selected_chapters' : 'whole_textbook',
        },
      });
      setPaper({ ...generated, reviewStatus: 'ai_draft' });
    } catch (e) { setError(e instanceof Error ? e.message : 'Question Paper generation failed.'); }
    finally { setBusy(false); }
  };

  useEffect(()=>{
    if(!pendingMariaQuestionPaper||mariaQuestionStage!=='generate'||busy)return;
    if(generateBlocker){setMariaQuestionStatus(`Maria is waiting on the existing Question Paper rule: ${generateBlocker}`);return;}
    setMariaQuestionStage('running');setMariaQuestionStatus('Maria started the existing Question Paper generator. It will stop at Preview; Save/Print/PDF remain under the existing Teacher workflow.');
    void generate().finally(()=>{setPendingMariaQuestionPaper(null);setMariaQuestionStage('');});
  },[pendingMariaQuestionPaper,mariaQuestionStage,busy,generateBlocker,assignment?.id,exam,totalMarks,durationMinutes,chapters.join('|'),useSchoolPattern,schoolPattern.available,patternMarks,mariaQuestionInstruction]);

  const updateQuestion = (id: string, text: string) => {
    if (!paper) return;
    setPaper({ ...paper, questions: paper.questions.map((q) => q.id === id ? { ...q, text } : q), reviewStatus: 'ai_draft' });
  };
  const updateModelAnswer = (id: string, modelAnswer: string) => {
    if (!paper) return;
    setPaper({ ...paper, questions: paper.questions.map((q) => q.id === id ? { ...q, modelAnswer } : q), reviewStatus: 'ai_draft' });
  };

  const replaceQuestion = async (questionId: string) => {
    if (!paper) return;
    setError(''); setBusy(true);
    try {
      const oldQuestion = paper.questions.find((item) => item.id === questionId);
      const row = oldQuestion?.sectionIndex ? paper.pattern[Number(oldQuestion.sectionIndex) - 1] : undefined;
      const componentAssignmentId = String(row?.componentAssignmentId || paper.assignmentId);
      const componentSubjectId = String(row?.componentSubjectId || '');
      const componentQuestions = componentSubjectId
        ? paper.questions.filter((item) => {
            const sectionRow = item.sectionIndex ? paper.pattern[Number(item.sectionIndex) - 1] : undefined;
            return String(sectionRow?.componentSubjectId || '') === componentSubjectId;
          })
        : paper.questions;
      const componentMaterialIds = [...new Set(componentQuestions.flatMap((item) => (item.internalSources || []).map((source) => source.materialId).filter(Boolean)))];
      const componentChapters = [...new Set(componentQuestions.flatMap((item) => (item.internalSources || []).map((source) => String(source.chapter || '').trim()).filter(Boolean)))];
      const replacementPaper: QuestionPaperDraft = componentAssignmentId !== paper.assignmentId ? {
        ...paper,
        assignmentId: componentAssignmentId,
        materialIds: componentMaterialIds.length ? componentMaterialIds : paper.materialIds,
        chapters: componentChapters,
        totalMarks: Number(row?.componentTotalMarks || paper.totalMarks),
        questions: componentQuestions,
      } : paper;
      const q = await regenerateQuestion({ paper: replacementPaper, questionId });
      setPaper({ ...paper, questions: paper.questions.map((old) => old.id === questionId ? { ...q, id: old.id, orderNo: old.orderNo, sectionIndex: old.sectionIndex } : old), reviewStatus: 'ai_draft' });
    } catch (e) { setError(e instanceof Error ? e.message : 'Question replacement failed.'); }
    finally { setBusy(false); }
  };

  const save = async () => {
    if (!paper) return;
    setError(''); setSaveMessage(''); setBusy(true);
    try {
      if (paper.reviewStatus === 'ai_draft') throw new Error('Mark the paper as Teacher Reviewed before final Save.');
      const id = await saveQuestionPaper(paper);
      setPaper({ ...paper, id, reviewStatus: 'final' });
      if (paper.combinedMeta?.workflow === 'collaborative_component' && exam) {
        void listCombinedSubjectGroups({ assignmentId: paper.assignmentId, exam }).then((groups) => setCombinedGroups(groups)).catch(() => undefined);
      }
      setSaveMessage(paper.combinedMeta?.workflow === 'collaborative_component' ? 'Your Subject section was submitted successfully to the Clerk Combined Paper desk.' : 'Question Paper saved successfully as a reviewed school document.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Save failed.'); }
    finally { setBusy(false); }
  };

  const answerLabelFor = (presentation: ReturnType<typeof resolveAcademicTextPresentation>) => presentation.scriptClass === 'nastaliq' || presentation.scriptClass === 'arabic'
    ? 'جواب'
    : presentation.scriptClass === 'devanagari'
      ? 'उत्तर'
      : 'Answer';
  const correctMatchLabelFor = (presentation: ReturnType<typeof resolveAcademicTextPresentation>) => presentation.scriptClass === 'nastaliq' || presentation.scriptClass === 'arabic'
    ? 'درست جواب'
    : presentation.scriptClass === 'devanagari'
      ? 'सही उत्तर'
      : 'Correct Answer';
  const renderStudentSections = (sections: typeof paperSections, presentation: ReturnType<typeof resolveAcademicTextPresentation>) => {
    const prefix = sectionQuestionPrefix(presentation);
    const answerLabel = answerLabelFor(presentation);
    return <div className="questions qp-sections">{sections.map((section) => <section className={`qp-section ${presentation.dir === 'rtl' ? 'qp-section-rtl' : 'qp-section-ltr'}`} key={`${section.row.componentIndex || 0}-${section.row.type}-${section.sectionIndex}`}>
      <div className="qp-section-head"><div className={`qp-section-title ${presentation.className}`} dir={presentation.dir} lang={presentation.languageCode === 'auto' ? undefined : presentation.languageCode}><span className="qp-section-number">{prefix}{prefix === 'Q.' ? section.sectionIndex + 1 : ` ${section.sectionIndex + 1}`}:</span><span>{section.row.displayTitle || section.row.type}</span></div><strong className="qp-section-marks">{formatSectionMarks(section.totalMarks)}</strong></div>
      {section.isMatch ? <>
        <QuestionSectionMatchTable questions={section.items} answerLabel={answerLabel} />
        <div className="screen-only qp-match-controls">{section.items.map((q, itemIndex) => <div key={q.id} className="qp-match-control-row"><span>{itemIndex + 1}.</span><span>{(q.matchLeft || [])[0] || q.text} ↔ {(q.matchRight || [])[0] || ''}</span><button className="link-btn" disabled={busy} onClick={() => replaceQuestion(q.id)}>Replace pair</button></div>)}</div>
      </> : <div className="qp-section-items">{section.items.map((q, itemIndex) => <div className={`qp-subquestion-row ${presentation.dir === 'rtl' ? 'qp-subquestion-rtl' : 'qp-subquestion-ltr'}`} key={q.id}><span className="qp-subno">{itemIndex + 1}.</span><div className={`qbody ${presentation.className}`} dir={presentation.dir} lang={presentation.languageCode === 'auto' ? undefined : presentation.languageCode}><textarea className={`question-edit screen-only ${presentation.className}`} dir={presentation.dir} lang={presentation.languageCode === 'auto' ? undefined : presentation.languageCode} value={q.text} onChange={(e) => updateQuestion(q.id, e.target.value)} /><div className={`print-only question-text ${presentation.className}`} dir={presentation.dir} lang={presentation.languageCode === 'auto' ? undefined : presentation.languageCode}>{q.text}</div><QuestionAnswerArea question={q} /><details className="screen-only qp-model-answer-editor"><summary>Model Answer</summary><textarea className={`question-edit ${presentation.className}`} dir={presentation.dir} lang={presentation.languageCode === 'auto' ? undefined : presentation.languageCode} value={q.modelAnswer || ''} onChange={(e) => updateModelAnswer(q.id, e.target.value)} /></details><div className="source-note screen-only">Internal source: {q.internalSources.map((source) => source.chapter || source.materialId).join(', ') || 'Textbook source recorded by generator'}{q.sourceKind ? ` • ${q.sourceKind === 'exercise' ? 'Mashq / Exercise' : 'Whole Chapter'}` : ''}</div><button className="link-btn screen-only" disabled={busy} onClick={() => replaceQuestion(q.id)}>Replace / Regenerate this sub-question</button></div></div>)}</div>}
    </section>)}</div>;
  };
  const renderModelSections = (sections: typeof paperSections, presentation: ReturnType<typeof resolveAcademicTextPresentation>) => {
    const prefix = sectionQuestionPrefix(presentation);
    const answerLabel = answerLabelFor(presentation);
    const correctLabel = correctMatchLabelFor(presentation);
    return <div className="questions qp-sections qp-model-answer-sections">{sections.map((section) => <section className={`qp-section ${presentation.dir === 'rtl' ? 'qp-section-rtl' : 'qp-section-ltr'}`} key={`model-${section.row.componentIndex || 0}-${section.row.type}-${section.sectionIndex}`}>
      <div className="qp-section-head"><div className={`qp-section-title ${presentation.className}`} dir={presentation.dir} lang={presentation.languageCode === 'auto' ? undefined : presentation.languageCode}><span className="qp-section-number">{prefix}{prefix === 'Q.' ? section.sectionIndex + 1 : ` ${section.sectionIndex + 1}`}:</span><span>{section.row.displayTitle || section.row.type}</span></div><strong className="qp-section-marks">{formatSectionMarks(section.totalMarks)}</strong></div>
      {section.isMatch ? <ModelAnswerMatchTable questions={section.items} answerLabel={correctLabel} /> : <div className="qp-section-items">{section.items.map((q, itemIndex) => <div className={`qp-subquestion-row ${presentation.dir === 'rtl' ? 'qp-subquestion-rtl' : 'qp-subquestion-ltr'} qp-model-answer-item`} key={`model-${q.id}`}><span className="qp-subno">{itemIndex + 1}.</span><div className={`qbody ${presentation.className}`} dir={presentation.dir} lang={presentation.languageCode === 'auto' ? undefined : presentation.languageCode}><div className={`question-text ${presentation.className}`} dir={presentation.dir} lang={presentation.languageCode === 'auto' ? undefined : presentation.languageCode}>{q.text}</div><ModelAnswerResponse question={q} answerLabel={answerLabel} presentation={presentation} /></div></div>)}</div>}
    </section>)}</div>;
  };

  if (step === 'term') {
    return <section className="workspace">
      {onBackToTeacher && <button className="back-btn screen-only" onClick={onBackToTeacher}>← Back to Teacher Dashboard</button>}
      <header className="page-head"><div><h2>Question Paper</h2><p>Select a term, then the exact examination. Every screen has a clear return path.</p></div><span className="pill">Teacher Main Menu</span></header>
      <div className="choice-grid"><button className="choice-card" onClick={() => chooseTerm('first')}><span>TERM 01</span><strong>FIRST TERM</strong><small>First Unit Test + First Term Examination</small></button><button className="choice-card" onClick={() => chooseTerm('second')}><span>TERM 02</span><strong>SECOND TERM</strong><small>Second Unit Test + Second Term Examination</small></button></div>
    </section>;
  }

  if (step === 'exam' && term) {
    const exams: QuestionPaperExam[] = term === 'first' ? ['first_unit_test','first_term_examination'] : ['second_unit_test','second_term_examination'];
    return <section className="workspace">
      <div className="screen-only flex flex-wrap gap-2"><button className="back-btn" onClick={() => { setStep('term'); setExam(null); setPaper(null); }}>← Back to Question Paper</button>{onBackToTeacher && <button className="back-btn" onClick={onBackToTeacher}>Teacher Dashboard</button>}</div>
      <header className="page-head"><div><h2>{term === 'first' ? 'First Term' : 'Second Term'}</h2><p>Select the exact examination. No Result/Marks Entry coupling is added.</p></div><span className="pill">{term === 'first' ? 'Term 01' : 'Term 02'}</span></header>
      <div className="choice-grid">{exams.map((e) => <button key={e} className="choice-card" onClick={() => chooseExam(e)}><span>EXAM</span><strong>{examLabels[e]}</strong><small>Open question-paper builder</small></button>)}</div>
    </section>;
  }

  return (
    <section className="workspace">
      <div className="screen-only flex flex-wrap gap-2"><button className="back-btn" onClick={() => { setPaper(null); if (term && onBackToTerm) onBackToTerm(term); else setStep('exam'); }}>← Back to {term === 'first' ? 'First Term' : 'Second Term'} Exams</button><button className="back-btn" onClick={() => { setStep('term'); setExam(null); setPaper(null); }}>All Terms</button>{onBackToTeacher && <button className="back-btn" onClick={onBackToTeacher}>Teacher Dashboard</button>}</div>
      <header className="page-head"><div><h2>{exam ? examLabels[exam] : 'Question Paper Builder'}</h2><p>AI automatically uses the assigned Textbook. Select one or more chapters, confirm the school paper pattern, then review every generated question.</p></div><span className="pill">Teacher Review Required</span></header>
      {!assignments.length && <div className="alert warning screen-only"><strong>No assigned subject scope is available.</strong> Question Paper generation stays locked until Headmaster/Academic Setup assigns this Teacher to a Class/Division/Subject.</div>}
      <div className="card screen-only">
        {(combinedLoading || combinedGroups.length > 0) && <div className="combined-paper-mode-box">
          <div className="card-title-row"><div><h3>Paper Type</h3><small>Single Subject stays exactly as before. Subject Groups can be combined into one paper.</small></div>{combinedLoading && <small>Checking Subject Groups…</small>}</div>
          {!combinedLoading && combinedGroups.length > 0 && <div className="combined-mode-actions">
            <button type="button" className={`btn ${paperMode === 'single' ? 'primary' : 'ghost'}`} onClick={() => { setPaperMode('single'); setCombinedGroupId(''); setPaper(null); setError(''); }}>Single Subject</button>
            <button type="button" className={`btn ${paperMode === 'combined' ? 'primary' : 'ghost'}`} onClick={() => { setPaperMode('combined'); setCombinedGroupId((current) => current || combinedGroups[0]?.id || ''); setPaper(null); setError(''); }}>Combined Subject Group</button>
          </div>}
          {paperMode === 'combined' && combinedGroups.length > 0 && <label className="field combined-group-picker"><span>Combined Subject</span><select value={combinedGroupId} onChange={(e) => { setCombinedGroupId(e.target.value); setPaper(null); setError(''); }}><option value="">Select Combined Subject</option>{combinedGroups.map((group) => <option key={group.id} value={group.id}>{group.groupName}</option>)}</select><small>{selectedCombinedGroup?.currentTeacherHasAll ? 'All component Subjects are assigned to you, so Classtago will generate one complete combined paper.' : selectedCombinedGroup ? 'Different Teachers are assigned. You will prepare only your section; Clerk will review and combine all submitted sections.' : 'Choose a Subject Group.'}</small></label>}
        </div>}

        {paperMode === 'combined' ? (selectedCombinedGroup && exam && assignment ? <>
          <div className="form-grid two combined-paper-settings">
            {selectedCombinedGroup.currentTeacherHasAll ? <label className="field"><span>Combined Total Marks</span><input type="number" min={1} value={totalMarks} onChange={(e) => { setTotalMarks(Number(e.target.value)); setPaper(null); }} /><small>You teach every Subject in this group, so set the overall total and divide it between your Subject sections below.</small></label> : <div className="field"><span>Combined Marks</span><div className="question-source-status ready">Auto from Subject Teacher sections</div><small>Each assigned Subject Teacher decides only their own section marks. Clerk receives the final total automatically after all sections are submitted.</small></div>}
            <label className="field"><span>Duration (minutes)</span><input type="number" min={15} value={durationMinutes} onChange={(e) => { setDurationMinutes(Number(e.target.value)); setPaper(null); }} /></label>
          </div>
          <CombinedQuestionPaperBuilder
            group={selectedCombinedGroup}
            currentAssignment={assignment}
            assignments={assignments}
            materials={materials}
            exam={exam}
            combinedTotalMarks={totalMarks}
            durationMinutes={durationMinutes}
            busy={busy}
            onTotalMarksChange={(value) => { setTotalMarks(value); setPaper(null); }}
            onGenerated={(generated) => { setPaper(generated); setSaveMessage(''); setError(''); }}
            onBusy={setBusy}
            onError={setError}
          />
        </> : <div className="question-auto-note"><strong>Combined Paper:</strong> Select a Combined Subject Group first.</div>) : <>
        <div className="form-grid three">
          <label className="field"><span>Class</span><select value={classId} onChange={(e) => { const c=e.target.value; const first=assignments.find(a=>a.className===c); const d=first?.division||''; const sId=first?.subjectId||''; setClassId(c);setDivisionId(d);setSubjectId(sId);chooseLinkedScope(c,d,sId); }}><option value="">Select Class</option>{classOptions.map(a=><option key={a.className} value={a.className}>{a.className}</option>)}</select></label>
          <label className="field"><span>Division</span><select value={divisionId} disabled={!classId} onChange={(e)=>{const d=e.target.value;const first=assignments.find(a=>a.className===classId&&a.division===d);const sId=first?.subjectId||'';setDivisionId(d);setSubjectId(sId);chooseLinkedScope(classId,d,sId)}}><option value="">Select Division</option>{divisionOptions.map(a=><option key={`${a.className}-${a.division}`} value={a.division}>{divisionScreenLabel(a.division)}</option>)}</select></label>
          <label className="field"><span>Subject</span><select value={subjectId} disabled={!classId||!divisionId} onChange={(e)=>{const sId=e.target.value;setSubjectId(sId);chooseLinkedScope(classId,divisionId,sId)}}><option value="">Select Subject</option>{subjectOptions.map(a=><option key={a.id} value={a.subjectId}>{a.subjectName}</option>)}</select></label>

          <div className="field question-chapter-field">
            <span>Chapter range / selection</span>
            <details className="question-multi-select">
              <summary>{chapterSummary}</summary>
              <div className="question-multi-panel">
                <label className="question-check-row whole"><input type="checkbox" checked={chapters.length === 0} onChange={() => { setChapters([]); setPaper(null); }} /><span>Whole textbook</span></label>
                {chapterLoading && <div className="question-picker-note">Reading textbook chapters…</div>}
                {!chapterLoading && readyTextbooks.length > 0 && !chapterOptions.length && <div className="question-picker-note">No chapter headings were detected. Whole textbook will be used.</div>}
                {chapterOptions.map((chapter) => <label className="question-check-row" key={chapter}><input type="checkbox" checked={chapters.includes(chapter)} onChange={() => toggleChapter(chapter)} /><span>{chapter}</span></label>)}
              </div>
            </details>
            {chapters.length > 0 && <small>{chapters.join(' • ')}</small>}
          </div>

          <div className="field question-source-field">
            <span>Question Source</span>
            <div className="question-source-options">
              <label className="question-source-option"><input type="checkbox" checked={useWholeChapterSource} onChange={(e) => { setUseWholeChapterSource(e.target.checked); setPaper(null); }} /><span><strong>Whole Chapter</strong><small>Concepts, explanations, examples and other selected-chapter content.</small></span></label>
              <label className="question-source-option"><input type="checkbox" checked={useExerciseSource} onChange={(e) => { setUseExerciseSource(e.target.checked); setPaper(null); }} /><span><strong>Chapter-end Mashq / Exercise</strong><small>Questions specifically from the final Mashq / Exercise / Practice section.</small></span></label>
            </div>
            <small>{questionSourceMode === 'both' ? 'Both sources will be represented in the generated paper.' : questionSourceMode === 'exercise' ? 'Only chapter-end Mashq / Exercise will be used.' : 'Only whole-chapter content will be used.'}</small>
          </div>

          <label className="field"><span>Total Marks</span><input type="number" min={1} value={totalMarks} disabled={useSchoolPattern && schoolPattern.available} onChange={(e) => setTotalMarks(Number(e.target.value))} />{useSchoolPattern && schoolPattern.available && <small>Auto-set from the saved school pattern.</small>}</label>
          <label className="field"><span>Duration (minutes)</span><input type="number" min={15} value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} /></label>
          <div className="field"><span>AI Source</span><div className={`question-source-status ${readyTextbooks.length ? 'ready' : 'waiting'}`}>{!assignment ? 'Select Class / Subject first.' : readyTextbooks.length ? `Textbook · ${chapterOptions.length || '—'} Chapters · Auto Fetch` : preparingTextbooks.length ? 'Textbook uploaded · preparing chapters…' : failedTextbooks.length ? 'Textbook chapter preparation needs attention.' : 'Textbook not uploaded for this subject.'}</div></div>
          <label className="field checkbox-field"><input type="checkbox" checked={useSchoolPattern} disabled={patternLoading} onChange={(e) => setUseSchoolPattern(e.target.checked)} /><span>Use saved school Question Paper Pattern</span></label>
        </div>

        {(patternLoading || schoolPattern.available) && <div className="question-pattern-preview">
          <div className="card-title-row"><h3>School Paper Pattern</h3><small>{patternLoading ? 'Checking…' : `${schoolPattern.totalMarks} marks`}</small></div>
          {schoolPattern.available && <><strong>{schoolPattern.title || 'Saved school pattern'}</strong><div className="question-pattern-chips">{schoolPattern.pattern.map((row, index) => <span key={`${row.type}-${index}`}>✓ {row.type}: {row.count} × {row.marksEach}</span>)}</div></>}
        </div>}

        {!patternLoading && !schoolPattern.available && <div className="question-auto-note"><strong>School Pattern:</strong> No saved pattern is configured for this Exam/Class/Subject. You can keep the School Pattern preference ticked, but Classtago will safely use the editable Manual Paper Pattern until a saved pattern is available.</div>}

        {(!useSchoolPattern || !schoolPattern.available) && <div className="pattern-box"><div className="card-title-row"><div><h3>Manual Paper Pattern</h3><small>{assignment?.subjectName || 'Subject'} compatible question types</small></div><small>{patternMarks}/{totalMarks} marks</small></div>{pattern.map((row, i) => <div className="pattern-row" key={`${row.type}-${i}`}><select value={compatibleQuestionTypes.includes(row.type) ? row.type : compatibleQuestionTypes[0]} onChange={(e) => setPattern(pattern.map((x, idx) => idx === i ? { ...x, type: e.target.value } : x))}>{compatibleQuestionTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select><input type="number" min={1} value={row.count} onChange={(e) => setPattern(pattern.map((x, idx) => idx === i ? { ...x, count: Number(e.target.value) } : x))} /><span>×</span><input type="number" min={1} value={row.marksEach} onChange={(e) => setPattern(pattern.map((x, idx) => idx === i ? { ...x, marksEach: Number(e.target.value) } : x))} /><span>marks each</span><button className="icon-btn" onClick={() => setPattern(pattern.filter((_, idx) => idx !== i))}>×</button></div>)}<button className="btn ghost" onClick={() => setPattern([...pattern, { type: compatibleQuestionTypes[0] || 'Short Answer', count: 1, marksEach: 1 }])}>+ Add Question Type</button></div>}

        <div className="question-auto-note"><strong>Automatic rules:</strong> AI uses only the assigned Textbook, keeps the selected chapter scope, follows Whole Chapter / Mashq source selection and the selected paper pattern exactly, and writes the paper in the Textbook/Subject language automatically. Student PDF answer space is generated according to each question type.</div>
        {mariaQuestionStatus && <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 text-xs font-semibold text-violet-900"><b>Maria:</b> {mariaQuestionStatus} <span className="opacity-75">Existing Preview/Edit/Replace/Save/Print/PDF controls are unchanged.</span></div>}
        {error && <div className="alert danger">{error}</div>}
        <div className="actions"><button className="btn primary" onClick={generate} disabled={busy || Boolean(generateBlocker)}>{busy ? 'Generating…' : paper ? 'Regenerate Complete Paper' : 'Generate Question Paper with AI'}</button></div>
        {!busy && generateBlocker && <small className="question-generate-blocker">{generateBlocker}</small>}
        </>}
      </div>

      {paper && <>
      <div id="question-paper-print" data-review-status={paper.reviewStatus} className="paper-sheet print-root print-page qp-question-paper-document">
        <div className="paper-toolbar screen-only">
          <div><strong>AI-generated draft</strong><small>Internal Textbook/chapter references stay hidden from the printed student paper.</small></div>
          <div className="actions">
            <label className="review-check"><input type="checkbox" checked={paper.reviewStatus !== 'ai_draft'} disabled={paper.reviewStatus === 'final'} onChange={(e) => setPaper({ ...paper, reviewStatus: e.target.checked ? 'teacher_reviewed' : 'ai_draft' })} /> Teacher Reviewed</label>
            <SmartPrintDialog targetId="question-paper-print" title={paper.title || 'Question Paper'} moduleName="question-paper" disabled={paper.reviewStatus === 'ai_draft'} />
            <SmartPrintDialog targetId="question-paper-model-answer" title={`${paper.title || 'Question Paper'} — Model Answer`} moduleName="question-paper" buttonLabel="Model Answer PDF" disabled={paper.reviewStatus === 'ai_draft'} />
            <button className="btn primary" onClick={save} disabled={busy || paper.reviewStatus === 'ai_draft'}>{paper.combinedMeta?.workflow === 'collaborative_component' ? 'Submit Section to Clerk' : 'Save Final'}</button>
          </div>
        </div>
        <div className="school-header"><h1>{assignment?.schoolName || 'School Name'}</h1><p>{exam ? examLabels[exam] : 'Examination'} {expandedAcademicYear(assignment?.academicYear)}</p></div>
        <div className="paper-meta qp-student-paper-meta"><div><strong>{assignment?.className || '-'}{divisionPrintSuffix(assignment?.division)} • {paperSubjectLabel}</strong></div><div><span>Marks: {paper.totalMarks}</span><span>Time: {paper.durationMinutes} minutes</span></div></div>
        <div className="qp-student-fields qp-student-fields-with-separator" aria-label="Student details"><span><b>Name:</b><i aria-hidden="true" /></span><span><b>Roll No.:</b><i aria-hidden="true" /></span><span><b>Date:</b><i aria-hidden="true" /></span></div>
        {isCombinedPaper && paperParts.length > 0 ? paperParts.map((part) => <section className="qp-combined-part" key={`student-part-${part.componentIndex}`}>
          <div className="qp-combined-part-head"><strong>PART {String.fromCharCode(64 + part.componentIndex)} — {part.subjectName || `Subject ${part.componentIndex}`}</strong><span>{formatSectionMarks(part.totalMarks)}</span></div>
          {part.instructions.length > 0 && <div className={`instructions ${part.presentation.className}`} dir={part.presentation.dir} lang={part.presentation.languageCode === 'auto' ? undefined : part.presentation.languageCode}><ol>{part.instructions.map((item, index) => <li key={index}>{item}</li>)}</ol></div>}
          {renderStudentSections(part.sections, part.presentation)}
        </section>) : <>
          {paper.instructions.length > 0 && <div className={`instructions ${paperPresentation.className}`} dir={paperPresentation.dir} lang={paperPresentation.languageCode === 'auto' ? undefined : paperPresentation.languageCode}><ol>{paper.instructions.map((item, index) => <li key={index}>{item}</li>)}</ol></div>}
          {renderStudentSections(paperSections, paperPresentation)}
        </>}
        {saveMessage && <div className="alert success screen-only">{saveMessage}</div>}
        {error && <div className="alert danger screen-only">{error}</div>}
      </div>
      <div id="question-paper-model-answer" className="paper-sheet print-root print-page qp-model-answer-offscreen qp-question-paper-document" aria-hidden="true">
        <div className="school-header"><h1>{assignment?.schoolName || 'School Name'}</h1><p>{exam ? examLabels[exam] : 'Examination'} {expandedAcademicYear(assignment?.academicYear)}</p></div>
        <div className="paper-meta"><div><strong>{assignment?.className || '-'}{divisionPrintSuffix(assignment?.division)} • {paperSubjectLabel}</strong></div><div><span>Marks: {paper.totalMarks}</span><span>Time: {paper.durationMinutes} minutes</span></div></div>
        <div className={`qp-model-answer-title ${isCombinedPaper ? '' : paperPresentation.className}`} dir={isCombinedPaper ? 'ltr' : paperPresentation.dir} lang={isCombinedPaper || paperPresentation.languageCode === 'auto' ? undefined : paperPresentation.languageCode}>{isCombinedPaper ? 'MODEL ANSWER / ANSWER KEY' : modelAnswerTitle}</div>
        {isCombinedPaper && paperParts.length > 0 ? paperParts.map((part) => <section className="qp-combined-part" key={`model-part-${part.componentIndex}`}>
          <div className="qp-combined-part-head"><strong>PART {String.fromCharCode(64 + part.componentIndex)} — {part.subjectName || `Subject ${part.componentIndex}`}</strong><span>{formatSectionMarks(part.totalMarks)}</span></div>
          {renderModelSections(part.sections, part.presentation)}
        </section>) : renderModelSections(paperSections, paperPresentation)}
      </div>
      </>}
    </section>
  );
}
