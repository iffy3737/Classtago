import { useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, CheckCircle2, Copy, FileText, Image as ImageIcon, Languages, MessageCircleMore, Paperclip, PenLine, RefreshCw, Send, Sparkles, Trash2, Video, X } from 'lucide-react';
import { FALLBACK_LANGUAGE_CATALOGUE, getLanguageOption, languageDisplayName } from '../../../lib/languageCatalog';
import type { AcademicRecordListItem, GenerationResult, HomeworkAttachment, StudyMaterial, TeacherAssignment } from '../types/domain';
import { deleteHomeworkAttachment, generateAcademicContent, listHomeworkAttachments, listStudyMaterialChapters, prepareHomeworkTextbookSource, saveHomeworkAcademicRecord, uploadAcademicAttachment } from '../services/teacherAcademicService';
import { ScopeSelector } from './ScopeSelector';
import { SmartPrintDialog } from './SmartPrintDialog';
import { resolveAcademicTextPresentation } from '../utils/languagePresentation';
import { divisionScreenLabel } from '../../../lib/divisionPresentation';
import { schoolRelativeDateKey, schoolTodayKey } from '../../../lib/schoolDate';

const HOMEWORK_TYPES = [
  { key:'question_answer', label:'Question Answer', defaultCount:5 }, { key:'fill_blanks', label:'Fill in the Blanks', defaultCount:5 }, { key:'mcq', label:'MCQ', defaultCount:5 }, { key:'true_false', label:'True / False', defaultCount:5 }, { key:'match_following', label:'Match the Following', defaultCount:5 }, { key:'short_answer', label:'Short Answer', defaultCount:4 }, { key:'long_answer', label:'Long Answer', defaultCount:2 }, { key:'notes', label:'Notes / Key Points', defaultCount:1 }, { key:'grammar_language', label:'Grammar / Language Practice', defaultCount:5 }, { key:'revision', label:'Revision Questions', defaultCount:5 }, { key:'activity_project', label:'Activity / Project', defaultCount:1 },
  { key:'solve_problems', label:'Solve Problems / Sums', defaultCount:8 }, { key:'word_problems', label:'Word Problems', defaultCount:4 }, { key:'mental_math', label:'Mental Maths', defaultCount:8 }, { key:'tables_practice', label:'Tables / Number Practice', defaultCount:5 }, { key:'missing_numbers', label:'Fill Missing Numbers', defaultCount:6 }, { key:'show_working', label:'Show Complete Working', defaultCount:5 }, { key:'geometry_construction', label:'Geometry / Construction', defaultCount:3 },
  { key:'reading', label:'Reading Practice', defaultCount:1 }, { key:'dictation_spelling', label:'Dictation / Spelling', defaultCount:10 }, { key:'vocabulary', label:'Vocabulary / Word Meaning', defaultCount:8 }, { key:'sentence_making', label:'Sentence Making', defaultCount:5 }, { key:'comprehension', label:'Comprehension', defaultCount:1 }, { key:'writing_practice', label:'Writing Practice', defaultCount:1 }, { key:'essay_paragraph', label:'Essay / Paragraph', defaultCount:1 }, { key:'translation', label:'Translation', defaultCount:5 },
  { key:'definitions', label:'Definitions / Terms', defaultCount:5 }, { key:'give_reasons', label:'Give Reasons', defaultCount:4 }, { key:'diagram_label', label:'Diagram / Labeling', defaultCount:2 }, { key:'observation_activity', label:'Observation / Activity', defaultCount:1 },
  { key:'map_work', label:'Map Work', defaultCount:2 }, { key:'timeline', label:'Timeline / Sequence', defaultCount:4 }, { key:'identify_name', label:'Identify / Name', defaultCount:5 }, { key:'cause_effect', label:'Cause & Effect', defaultCount:4 },
  { key:'drawing', label:'Drawing', defaultCount:1 }, { key:'colouring', label:'Colouring', defaultCount:1 }, { key:'sketching', label:'Sketching', defaultCount:1 }, { key:'pattern_design', label:'Pattern / Design', defaultCount:1 }, { key:'craft_activity', label:'Craft Activity', defaultCount:1 }, { key:'creative_composition', label:'Creative Composition', defaultCount:1 },
  { key:'practical_task', label:'Practical Task', defaultCount:2 }, { key:'lab_exercise', label:'Lab Exercise', defaultCount:2 }, { key:'shortcut_keys', label:'Shortcut Keys', defaultCount:6 }, { key:'identify_parts', label:'Identify Parts / Components', defaultCount:5 },
] as const;
type HomeworkTypeKey=typeof HOMEWORK_TYPES[number]['key'];
type HomeworkPatternKey='standard'|'practice'|'revision'|'notes_qa'|'custom';
type HomeworkPattern={key:HomeworkPatternKey;label:string;types:Partial<Record<HomeworkTypeKey,number>>};
type HomeworkSubjectFamily='general'|'science'|'maths'|'language'|'social'|'art'|'computer';
const keys=(...values:HomeworkTypeKey[])=>values;
const familyForSubject=(assignment:TeacherAssignment|null):HomeworkSubjectFamily=>{const value=`${assignment?.subjectName||''} ${assignment?.subjectCode||''}`.toLowerCase();if(/math|mathematics|maths|algebra|geometry|arithmetic|ganit/.test(value))return'maths';if(/drawing|art|craft|fine art|work experience/.test(value))return'art';if(/computer|ict|information technology|coding/.test(value))return'computer';if(/science|evs|environment|physics|chemistry|biology/.test(value))return'science';if(/history|geography|civics|social|political science|economics/.test(value))return'social';if(/english|urdu|hindi|marathi|sanskrit|gujarati|kannada|tamil|telugu|malayalam|bengali|punjabi|odia|assamese|kashmiri|sindhi|language/.test(value))return'language';return'general';};
const homeworkConfigFor=(assignment:TeacherAssignment|null):{family:HomeworkSubjectFamily;typeKeys:HomeworkTypeKey[];patterns:HomeworkPattern[]}=>{const family=familyForSubject(assignment);const custom=(label:string):HomeworkPattern=>({key:'custom',label,types:{}});const configs:Record<HomeworkSubjectFamily,{typeKeys:HomeworkTypeKey[];patterns:HomeworkPattern[]}>= {
 general:{typeKeys:keys('question_answer','fill_blanks','mcq','true_false','match_following','short_answer','long_answer','notes','revision','activity_project'),patterns:[{key:'standard',label:'Quick Standard — Question Answer + Fill in the Blanks',types:{question_answer:5,fill_blanks:5}},{key:'practice',label:'Quick Practice — MCQ + True/False + Fill + Short Answer',types:{mcq:5,true_false:5,fill_blanks:5,short_answer:3}},{key:'revision',label:'Quick Revision — Revision + Short + Long Answer',types:{revision:8,short_answer:4,long_answer:2}},{key:'notes_qa',label:'Notes + Q&A — Notes + Question Answer',types:{notes:1,question_answer:5}},custom('Custom — Choose Homework types yourself')]},
 science:{typeKeys:keys('question_answer','fill_blanks','mcq','true_false','match_following','short_answer','long_answer','definitions','give_reasons','diagram_label','observation_activity','revision','activity_project'),patterns:[{key:'standard',label:'Quick Standard — Q&A + Fill + Definitions',types:{question_answer:5,fill_blanks:5,definitions:3}},{key:'practice',label:'Quick Practice — MCQ + True/False + Give Reasons',types:{mcq:5,true_false:5,give_reasons:3}},{key:'revision',label:'Quick Revision — Revision + Short + Diagram',types:{revision:6,short_answer:4,diagram_label:2}},{key:'notes_qa',label:'Notes + Q&A — Key Points + Question Answer',types:{notes:1,question_answer:5}},custom('Custom — Choose Science Homework types')]},
 maths:{typeKeys:keys('solve_problems','word_problems','mental_math','tables_practice','missing_numbers','show_working','geometry_construction','mcq','revision'),patterns:[{key:'standard',label:'Quick Standard — Solve Problems + Show Working',types:{solve_problems:8,show_working:4}},{key:'practice',label:'Quick Practice — Problems + Word Problems + Mental Maths',types:{solve_problems:8,word_problems:3,mental_math:5}},{key:'revision',label:'Quick Revision — Mixed Problems + Revision',types:{solve_problems:10,revision:5}},{key:'notes_qa',label:'Worked Practice — Problems + Key Rules',types:{notes:1,solve_problems:6}},custom('Custom — Choose Maths Homework types')]},
 language:{typeKeys:keys('question_answer','reading','dictation_spelling','vocabulary','sentence_making','grammar_language','comprehension','writing_practice','essay_paragraph','translation','revision'),patterns:[{key:'standard',label:'Quick Standard — Q&A + Vocabulary + Sentence Making',types:{question_answer:5,vocabulary:5,sentence_making:4}},{key:'practice',label:'Quick Practice — Reading + Grammar + Writing',types:{reading:1,grammar_language:5,writing_practice:1}},{key:'revision',label:'Quick Revision — Grammar + Comprehension + Q&A',types:{grammar_language:5,comprehension:1,question_answer:4}},{key:'notes_qa',label:'Reading + Q&A — Reading + Question Answer',types:{reading:1,question_answer:5}},custom('Custom — Choose Language Homework types')]},
 social:{typeKeys:keys('question_answer','fill_blanks','mcq','true_false','short_answer','long_answer','map_work','timeline','identify_name','cause_effect','revision'),patterns:[{key:'standard',label:'Quick Standard — Q&A + Identify / Name',types:{question_answer:5,identify_name:5}},{key:'practice',label:'Quick Practice — Short Answer + Map / Timeline',types:{short_answer:5,map_work:2,timeline:3}},{key:'revision',label:'Quick Revision — Revision + Cause & Effect + Long Answer',types:{revision:6,cause_effect:3,long_answer:2}},{key:'notes_qa',label:'Notes + Q&A — Key Points + Question Answer',types:{notes:1,question_answer:5}},custom('Custom — Choose Social Science Homework types')]},
 art:{typeKeys:keys('drawing','colouring','sketching','pattern_design','craft_activity','creative_composition','observation_activity'),patterns:[{key:'standard',label:'Quick Standard — Drawing / Sketching',types:{drawing:1,sketching:1}},{key:'practice',label:'Quick Practice — Colouring + Pattern / Design',types:{colouring:1,pattern_design:1}},{key:'revision',label:'Creative Practice — Observation + Composition',types:{observation_activity:1,creative_composition:1}},{key:'notes_qa',label:'Craft / Activity — Practical Art Work',types:{craft_activity:1}},custom('Custom — Choose Art Homework types')]},
 computer:{typeKeys:keys('question_answer','fill_blanks','mcq','true_false','practical_task','lab_exercise','shortcut_keys','identify_parts','revision'),patterns:[{key:'standard',label:'Quick Standard — Q&A + Identify Parts',types:{question_answer:5,identify_parts:5}},{key:'practice',label:'Quick Practice — Practical Task + Lab Exercise',types:{practical_task:2,lab_exercise:2}},{key:'revision',label:'Quick Revision — MCQ + Shortcut Keys + Revision',types:{mcq:5,shortcut_keys:5,revision:5}},{key:'notes_qa',label:'Notes + Practical — Key Points + Practical Task',types:{notes:1,practical_task:2}},custom('Custom — Choose Computer Homework types')]}
};return{family,...configs[family]};};

type HomeworkMode = 'ai' | 'manual';

const MAX_ATTACHMENTS = 6;
const MAX_ATTACHMENT_BYTES = 45 * 1024 * 1024;
const allowedAttachment = (file: File) => file.type === 'application/pdf' || file.type.startsWith('image/') || file.type.startsWith('video/') || /\.pdf$/i.test(file.name);
const formatBytes = (value?: number) => {
  const bytes = Number(value || 0);
  if (!bytes) return '';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
};
const attachmentIcon = (mime = '') => mime.startsWith('image/') ? ImageIcon : mime.startsWith('video/') ? Video : FileText;

type Props = {
  assignments: TeacherAssignment[];
  materials: StudyMaterial[];
  editingRecord?: AcademicRecordListItem | null;
  onEditingCleared?: () => void;
  onSaved?: () => void;
  onNavigate?: (moduleId: string, featureId?: string) => void;
};

const todayIso = () => schoolTodayKey();
const plusDaysIso = (days: number) => schoolRelativeDateKey(days);
const safeText = (value: unknown) => value == null ? '' : String(value);

async function copyText(text: string) {
  try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; } } catch {}
  return false;
}

export function HomeworkBuilder({ assignments, materials, editingRecord, onEditingCleared, onSaved, onNavigate }: Props) {
  const [mode, setMode] = useState<HomeworkMode>('ai');
  const [assignmentId, setAssignmentId] = useState('');
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [chapters, setChapters] = useState<string[]>([]);
  const [indexedChapters, setIndexedChapters] = useState<string[]>([]);
  const [chapterLoading, setChapterLoading] = useState(false);
  const [homeworkPattern, setHomeworkPattern] = useState<HomeworkPatternKey>('standard');
  const [homeworkTypes, setHomeworkTypes] = useState<Record<string, number>>({ question_answer: 5, fill_blanks: 5 });
  const [date, setDate] = useState(todayIso());
  const [dueDate, setDueDate] = useState(plusDaysIso(1));
  const [difficulty, setDifficulty] = useState('Balanced');
  const [targetMinutes, setTargetMinutes] = useState(30);
  const [languageCode, setLanguageCode] = useState('auto');
  const [customLanguage, setCustomLanguage] = useState('');
  const [teacherInstruction, setTeacherInstruction] = useState('');
  const [homeworkTitle, setHomeworkTitle] = useState('');
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [editableContent, setEditableContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [publishedRecordId, setPublishedRecordId] = useState('');
  const [savedRecordId, setSavedRecordId] = useState('');
  const [newAttachments, setNewAttachments] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<HomeworkAttachment[]>([]);
  const [attachmentBusyId, setAttachmentBusyId] = useState('');
  const [copyTargetAssignmentId, setCopyTargetAssignmentId] = useState('');
  const [whatsAppStatus, setWhatsAppStatus] = useState('');

  const assignment = useMemo(() => assignments.find(a => a.id === assignmentId) || null, [assignments, assignmentId]);
  const subjectHomeworkConfig = useMemo(() => homeworkConfigFor(assignment), [assignment?.subjectName, assignment?.subjectCode]);
  const visibleHomeworkTypes = useMemo(() => HOMEWORK_TYPES.filter(type => subjectHomeworkConfig.typeKeys.includes(type.key)), [subjectHomeworkConfig]);
  const homeworkPatterns = subjectHomeworkConfig.patterns;
  const scopedTextbooks = useMemo(() => materials.filter(m => assignment && m.className === assignment.className && m.subjectId === assignment.subjectId && (!m.division || m.division === assignment.division) && m.category === 'textbook'), [assignment, materials]);
  const readyTextbooks = useMemo(() => scopedTextbooks.filter(m => m.extractionStatus === 'ready'), [scopedTextbooks]);
  const failedTextbooks = useMemo(() => scopedTextbooks.filter(m => m.extractionStatus === 'failed'), [scopedTextbooks]);
  const preparingTextbooks = useMemo(() => scopedTextbooks.filter(m => m.extractionStatus === 'pending' || m.extractionStatus === 'processing'), [scopedTextbooks]);
  const selectedMaterialRows = useMemo(() => readyTextbooks.filter(m => selectedMaterials.includes(m.id)), [readyTextbooks, selectedMaterials]);
  const chapterOptions = useMemo(() => [...new Set([...indexedChapters, ...selectedMaterialRows.flatMap(m => [m.chapter, m.unit].filter(Boolean) as string[])])], [indexedChapters, selectedMaterialRows]);
  const copyTargets = useMemo(() => assignment ? assignments.filter(a => a.id !== assignment.id && a.className === assignment.className && a.subjectId === assignment.subjectId && a.academicYear === assignment.academicYear) : [], [assignments, assignment]);
  const selectedTypes = useMemo(() => HOMEWORK_TYPES.filter(t => Number(homeworkTypes[t.key] || 0) > 0).map(t => ({ key: t.key, label: t.label, count: Number(homeworkTypes[t.key]) })), [homeworkTypes]);
  const outputLanguage = languageCode === 'auto' ? (assignment?.medium || 'Subject / School Medium') : languageCode === 'other' ? safeText(customLanguage).trim() : getLanguageOption(languageCode).englishName;
  const safeEditableContent = safeText(editableContent);
  const safeHomeworkTitle = safeText(homeworkTitle);
  // R33.5: print each AI line as its own block so section/question boundaries
  // survive PDF cloning even if a browser normalizes raw text whitespace.
  const homeworkPrintLines = useMemo(() => safeEditableContent.replace(/\r\n?/g, '\n').split('\n'), [safeEditableContent]);
  const outputPresentation = useMemo(() => resolveAcademicTextPresentation({ languageCode, languageHint: outputLanguage, text: safeEditableContent }), [languageCode, outputLanguage, safeEditableContent]);
  const generateBlocker = useMemo(() => {
    if (mode !== 'ai') return '';
    if (!assignment) return 'Select your assigned Class / Division / Subject.';
    if (!scopedTextbooks.length) return 'Textbook not uploaded for this subject.';
    if (!readyTextbooks.length && failedTextbooks.length) return 'Textbook is uploaded, but chapter preparation needs attention. Open Study Material and use Check & Retry.';
    if (!readyTextbooks.length && preparingTextbooks.length) return 'Textbook chapter names are being prepared. This fast step must finish before choosing a chapter.';
    if (!readyTextbooks.length) return 'Textbook is uploaded, but its chapter list is not ready yet.';
    if (!selectedTypes.length) return 'Select at least one Homework section type.';
    if (!dueDate) return 'Choose a Due Date.';
    if (languageCode === 'other' && !customLanguage.trim()) return 'Enter the custom Homework language.';
    return '';
  }, [mode, assignment, scopedTextbooks.length, readyTextbooks.length, failedTextbooks.length, preparingTextbooks.length, selectedTypes.length, dueDate, languageCode, customLanguage]);
  const canGenerate = mode === 'ai' && !generateBlocker && !busy;
  const hasHomeworkPreview = Boolean(assignment && safeEditableContent.trim());
  const whatsAppBlocker = !hasHomeworkPreview ? 'Create Homework first.' : !publishedRecordId ? 'Save & Publish the Homework before sending it to students.' : '';
  const canOpenWhatsApp = !whatsAppBlocker;

  useEffect(() => {
    if (!editingRecord) return;
    const meta: any = editingRecord.metadata || {};
    const structured: any = meta.structuredInputs || {};
    const inferredMode: HomeworkMode = meta.generatedBy === 'manual' || meta.sourcePolicy === 'manual_teacher' || structured.homeworkMode === 'manual' ? 'manual' : 'ai';
    setMode(inferredMode);
    setAssignmentId(editingRecord.assignmentId);
    setHomeworkTitle(editingRecord.title || '');
    setEditableContent(editingRecord.content || '');
    setDate(String(structured.date || todayIso()));
    setDueDate(String(structured.dueDate || plusDaysIso(1)));
    setDifficulty(String(structured.difficulty || 'Balanced'));
    setTargetMinutes(Number(structured.targetMinutes || 30));
    setChapters(Array.isArray(meta.chapters) ? meta.chapters.map(String) : []);
    setSelectedMaterials(Array.isArray(meta.materialIds) ? meta.materialIds.map(String) : []);
    setSavedRecordId(editingRecord.id);
    setPublishedRecordId(editingRecord.status === 'published' ? editingRecord.id : '');
    setResult(null);
    setError(''); setSaveMessage(''); setWhatsAppStatus(''); setNewAttachments([]);
    void listHomeworkAttachments(editingRecord.id).then(setExistingAttachments).catch(() => setExistingAttachments([]));
  }, [editingRecord?.id]);

  useEffect(() => {
    if (!assignmentId || mode !== 'ai') return;
    if (editingRecord?.id && editingRecord.id === savedRecordId && selectedMaterials.length) return;
    setSelectedMaterials(readyTextbooks.map(row => row.id));
  }, [assignmentId, mode, readyTextbooks.map(row => row.id).join('|')]);

  useEffect(() => {
    let cancelled = false;
    setIndexedChapters([]);
    if (mode !== 'ai' || !selectedMaterials.length) return () => { cancelled = true; };
    setChapterLoading(true);
    void listStudyMaterialChapters(selectedMaterials)
      .then(rows => { if (!cancelled) setIndexedChapters(rows); })
      .catch(() => { if (!cancelled) setIndexedChapters([]); })
      .finally(() => { if (!cancelled) setChapterLoading(false); });
    return () => { cancelled = true; };
  }, [mode, selectedMaterials.join('|')]);

  useEffect(() => {
    if (!assignment || mode !== 'ai' || editingRecord) return;
    const preset = homeworkConfigFor(assignment).patterns.find(item => item.key === 'standard');
    if (preset) { setHomeworkPattern('standard'); setHomeworkTypes({ ...preset.types }); }
  }, [assignment?.subjectId, mode]);

  useEffect(() => {
    if (mode !== 'ai' || !selectedMaterials.length) return;
    // R33.2: silently prepare the selected Textbook's persistent search cache as
    // soon as the Teacher opens this subject. Generation never waits on this call.
    void prepareHomeworkTextbookSource(selectedMaterials).catch(() => undefined);
  }, [mode, selectedMaterials.join('|')]);

  const clearSavedIdentity = () => { setSavedRecordId(''); setPublishedRecordId(''); setExistingAttachments([]); onEditingCleared?.(); };
  const changeScope = (id: string) => {
    setAssignmentId(id); setChapters([]); setResult(null); setEditableContent(''); setHomeworkTitle(''); setError(''); setSaveMessage(''); setNewAttachments([]); clearSavedIdentity();
  };
  const startMode = (next: HomeworkMode) => {
    if (next === mode) return;
    setMode(next); setResult(null); setEditableContent(''); setHomeworkTitle(''); setChapters([]); setError(''); setSaveMessage(''); setNewAttachments([]); clearSavedIdentity();
  };

  const toggleType = (key: HomeworkTypeKey, defaultCount: number) => setHomeworkTypes(current => { const next = { ...current }; if (Number(next[key] || 0) > 0) delete next[key]; else next[key] = defaultCount; return next; });
  const applyPattern = (pattern: HomeworkPatternKey) => { setHomeworkPattern(pattern); const preset = homeworkPatterns.find(item => item.key === pattern); if (preset && pattern !== 'custom') setHomeworkTypes({ ...preset.types }); };

  const generate = async () => {
    setError(''); setSaveMessage(''); setPublishedRecordId(''); setSavedRecordId(''); setBusy(true);
    try {
      if (generateBlocker) throw new Error(generateBlocker);
      if (!assignment) throw new Error('Select your assigned Class / Division / Subject.');
      const response = await generateAcademicContent({
        taskType: 'homework', assignmentId: assignment.id, materialIds: selectedMaterials, chapterScope: chapters, prompt: teacherInstruction,
        structuredInputs: { date, dueDate, difficulty, targetMinutes, outputLanguage, homeworkSections: selectedTypes, sourcePolicy: 'textbook_only_auto', chapterSelectionMode: chapters.length ? 'selected_chapters' : 'whole_textbook' },
      });
      const generatedContent = safeText(response?.content).trim();
      if (!generatedContent) throw new Error('The Homework AI service returned no usable text. EDUNIXO kept your selections ready; restart Preview once if this build was just uploaded.');
      const normalizedResponse: GenerationResult = { ...response, content: generatedContent };
      setResult(normalizedResponse); setEditableContent(generatedContent);
      if (!safeHomeworkTitle.trim()) setHomeworkTitle(`${assignment.subjectName} Homework`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Homework generation failed.');
    } finally { setBusy(false); }
  };

  const addAttachments = (files: FileList | null) => {
    if (!files?.length) return;
    const incoming = Array.from(files);
    const invalidType = incoming.find(file => !allowedAttachment(file));
    if (invalidType) { setError(`${invalidType.name}: only Image, PDF or Video attachments are allowed.`); return; }
    const tooLarge = incoming.find(file => file.size > MAX_ATTACHMENT_BYTES);
    if (tooLarge) { setError(`${tooLarge.name} is larger than 45 MB. Keep each Homework attachment under 45 MB in the current free storage setup.`); return; }
    const merged = [...newAttachments, ...incoming].filter((file, index, all) => all.findIndex(x => x.name === file.name && x.size === file.size && x.lastModified === file.lastModified) === index);
    if (existingAttachments.length + merged.length > MAX_ATTACHMENTS) { setError(`Up to ${MAX_ATTACHMENTS} Homework attachments are allowed.`); return; }
    setError(''); setNewAttachments(merged);
  };

  const removeExistingAttachment = async (row: HomeworkAttachment) => {
    if (!savedRecordId) return;
    if (!window.confirm(`Remove ${row.fileName} from this Homework?`)) return;
    setAttachmentBusyId(row.id); setError('');
    try { await deleteHomeworkAttachment(savedRecordId, row.id); setExistingAttachments(current => current.filter(a => a.id !== row.id)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Attachment could not be removed.'); }
    finally { setAttachmentBusyId(''); }
  };

  const save = async (publish: boolean) => {
    setError(''); setSaveMessage(''); setBusy(true);
    try {
      if (!assignment || !safeEditableContent.trim()) throw new Error(mode === 'manual' ? 'Write the Homework before saving.' : 'Generate or enter Homework before saving.');
      const title = safeHomeworkTitle.trim() || `${assignment.subjectName} Homework`;
      if (!dueDate) throw new Error('Choose a Due Date.');
      if (languageCode === 'other' && !customLanguage.trim()) throw new Error('Enter the custom Homework language.');
      if (title !== homeworkTitle) setHomeworkTitle(title);
      const previousGeneratedBy = String((editingRecord?.metadata as any)?.generatedBy || '');
      const generatedBy = mode === 'manual' ? 'manual' : result ? 'ai' : (previousGeneratedBy || 'teacher_edit');
      const saved = await saveHomeworkAcademicRecord({
        id: savedRecordId || undefined, assignmentId: assignment.id, title, status: publish ? 'published' : 'draft', content: safeEditableContent,
        metadata: {
          materialIds: mode === 'ai' ? selectedMaterials : [], chapters: mode === 'ai' ? chapters : [],
          structuredInputs: { date, dueDate, difficulty, targetMinutes, outputLanguage, homeworkSections: mode === 'ai' ? selectedTypes : [], homeworkMode: mode },
          generationJobId: result?.jobId ?? (editingRecord?.metadata as any)?.generationJobId ?? null,
          generatedBy, sourcePolicy: mode === 'ai' ? 'textbook_only_auto' : 'manual_teacher',
        }, copyTargetAssignmentId: copyTargetAssignmentId || undefined,
      });
      const recordId = saved.id; setSavedRecordId(recordId);
      const failed: string[] = [];
      for (const file of newAttachments) {
        try { await uploadAcademicAttachment(recordId, file); if (saved.copyId) await uploadAcademicAttachment(saved.copyId, file); }
        catch { failed.push(file.name); }
      }
      setNewAttachments([]);
      try { setExistingAttachments(await listHomeworkAttachments(recordId)); } catch {}
      if (publish) setPublishedRecordId(recordId); else setPublishedRecordId('');
      setSaveMessage(`${publish ? 'Homework published.' : 'Homework saved as Draft.'}${failed.length ? ` ${failed.length} attachment(s) could not upload: ${failed.join(', ')}.` : publish ? ' It is now ready for Website/App notification and My WhatsApp Free.' : ''}`);
      onSaved?.();
    } catch (e) { setError(e instanceof Error ? e.message : 'Homework save failed.'); }
    finally { setBusy(false); }
  };

  const attachmentShareLines = useMemo(() => existingAttachments.filter(a => a.url).map(a => `${a.fileName}: ${a.url}`).join('\n'), [existingAttachments]);
  const baseShareText = useMemo(() => { if (!assignment || !safeEditableContent.trim()) return ''; return [`*${assignment.schoolName || 'School'}*`,`*${homeworkTitle || `${assignment.subjectName} Homework`}*`,`${assignment.className}${assignment.division && assignment.division !== 'All' ? ` · ${assignment.division}` : ''} · ${assignment.subjectName}`,dueDate ? `Due: ${dueDate}` : '','',safeEditableContent.trim(),'','Sent via EDUNIXO'].filter(Boolean).join('\n'); }, [assignment,safeEditableContent,homeworkTitle,dueDate]);
  const shareText = useMemo(() => [baseShareText, attachmentShareLines ? `Attachments\n${attachmentShareLines}` : ''].filter(Boolean).join('\n\n'), [baseShareText, attachmentShareLines]);

  const openWhatsApp = async () => {
    if (!shareText) { setWhatsAppStatus('Create Homework first.'); return; }
    if (!publishedRecordId) { setWhatsAppStatus('Save & Publish the Homework before sending it to students.'); return; }
    const shareable=existingAttachments.filter(a=>a.url);
    if(shareable.length&&typeof navigator.share==='function'){try{setWhatsAppStatus('Preparing actual Homework files for sharing…');const files:File[]=[];for(const attachment of shareable){const response=await fetch(String(attachment.url),{cache:'no-store'});if(!response.ok)throw new Error(`${attachment.fileName} could not be opened for sharing.`);const blob=await response.blob();files.push(new File([blob],attachment.fileName,{type:attachment.mimeType||blob.type||'application/octet-stream'}));}const canShareFiles=typeof navigator.canShare!=='function'||navigator.canShare({files});if(canShareFiles){await navigator.share({title:homeworkTitle||`${assignment?.subjectName||''} Homework`,text:baseShareText,files});setWhatsAppStatus('Actual Homework Image / Video / PDF files are ready in your phone share sheet. Choose WhatsApp and send.');return;}}catch(e:any){if(String(e?.name||'')==='AbortError'){setWhatsAppStatus('File sharing was cancelled.');return;}console.warn('R33.7 actual Homework file share fallback:',e);}}
    const url=`https://wa.me/?text=${encodeURIComponent(shareText)}`;const opened=window.open(url,'_blank');if(opened){try{opened.opener=null;}catch{}}else window.location.assign(url);setWhatsAppStatus(shareable.length?'This browser could not hand actual files to WhatsApp, so EDUNIXO opened the safe link fallback.':'WhatsApp opened with the Homework pre-filled. Select your Broadcast List / contacts and tap Send.');
  };

  const reviewLabel = mode === 'manual' ? 'Manual Homework — Teacher Review' : 'AI Homework — Teacher Review';

  return <section id="homework-builder-top" className="workspace">
    <header className="page-head"><div><h2>Homework</h2><p>Create Homework with AI from the assigned Textbook, or write it manually. Publish the same Homework with optional Image, PDF or Video support files.</p></div><span className="pill">{mode === 'ai' ? <Sparkles className="h-3.5 w-3.5"/> : <PenLine className="h-3.5 w-3.5"/>}{mode === 'ai' ? ' AI Homework' : ' Manual Homework'}</span></header>
    {!assignments.length && <div className="alert warning"><strong>No assigned Subject scope is available.</strong> Headmaster Academic Mapping must assign this Teacher a Class/Division/Subject before Homework can be created.</div>}

    <div className="card">
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={()=>startMode('ai')} className={`rounded-2xl border p-4 text-left transition ${mode==='ai'?'border-cyan-400 bg-cyan-50 shadow-sm':'border-slate-200 bg-white'}`}><div className="flex items-center gap-2 text-sm font-black text-slate-900"><Sparkles className="h-5 w-5 text-cyan-700"/>AI Homework</div><p className="mt-1 text-[11px] leading-5 text-slate-600">Generate from the assigned Textbook only.</p></button>
        <button type="button" onClick={()=>startMode('manual')} className={`rounded-2xl border p-4 text-left transition ${mode==='manual'?'border-violet-400 bg-violet-50 shadow-sm':'border-slate-200 bg-white'}`}><div className="flex items-center gap-2 text-sm font-black text-slate-900"><PenLine className="h-5 w-5 text-violet-700"/>Manual Homework</div><p className="mt-1 text-[11px] leading-5 text-slate-600">Type or paste Homework yourself; AI is not required.</p></button>
      </div>
    </div>

    <div className="card border border-cyan-100 bg-cyan-50/60">
      <div className="grid gap-2 text-xs font-bold text-slate-700 sm:grid-cols-3"><div><b className="text-cyan-800">1.</b> Class / Subject</div><div><b className="text-cyan-800">2.</b> {mode==='ai'?'Chapter + Pattern':'Write Homework'}</div><div><b className="text-cyan-800">3.</b> Review + Attach + Publish</div></div>
      <div className="mt-2 text-[11px] text-slate-600">After publishing: <b>Website/App</b> can reuse the same Homework, and <b>My WhatsApp · Free</b> shares actual Image / Video / PDF files on supported mobile browsers.</div>
    </div>

    <div className="card">
      <div className="form-grid two">
        <ScopeSelector assignments={assignments} value={assignmentId} onChange={changeScope} />
        {mode==='ai' ? <div className="field"><span>Homework Source</span><div className={`rounded-xl border p-3 text-xs ${readyTextbooks.length ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : failedTextbooks.length ? 'border-amber-200 bg-amber-50 text-amber-900' : preparingTextbooks.length ? 'border-cyan-200 bg-cyan-50 text-cyan-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>{!assignment ? 'Select Class / Subject first.' : readyTextbooks.length ? `Textbook · ${readyTextbooks.length} Chapters Ready · Auto Fetch` : failedTextbooks.length ? <>Textbook uploaded · chapter preparation needs attention.{onNavigate&&<button type="button" className="link-btn ml-2" onClick={()=>onNavigate('tr-study-material')}>Open Study Material</button>}</> : preparingTextbooks.length ? 'Textbook uploaded · preparing chapter list…' : <>Textbook not uploaded for this subject.{onNavigate&&<button type="button" className="link-btn ml-2" onClick={()=>onNavigate('tr-study-material')}>Open Study Material</button>}</>}</div></div>
        : <div className="field"><span>Homework Source</span><div className="rounded-xl border border-violet-200 bg-violet-50 p-3 text-xs font-bold text-violet-900">Teacher-entered Manual Homework · No AI/Textbook wait required</div></div>}
      </div>

      {mode==='ai' && <>
        <div className="form-grid two">
          <label className="field"><span>Chapter / Unit</span><select value={chapters[0] || ''} onChange={e=>setChapters(e.target.value?[e.target.value]:[])} disabled={!readyTextbooks.length || chapterLoading}><option value="">{!assignment ? 'Select Class / Subject first' : !scopedTextbooks.length ? 'Upload textbook first' : !readyTextbooks.length && failedTextbooks.length ? 'Chapter preparation needs attention' : !readyTextbooks.length ? 'Preparing chapter list…' : chapterLoading ? 'Reading textbook chapters…' : 'Whole textbook'}</option>{chapterOptions.map(ch=><option key={ch} value={ch}>{ch}</option>)}</select>{!readyTextbooks.length && failedTextbooks.length > 0 && <small className="text-amber-700">The textbook is already uploaded. Complete AI setup or retry chapter preparation from Study Material.</small>}{!readyTextbooks.length && !failedTextbooks.length && preparingTextbooks.length > 0 && <small className="text-cyan-700">EDUNIXO is preparing the chapter list from your uploaded textbook.</small>}{readyTextbooks.length>0 && !chapterLoading && !chapterOptions.length && <small className="text-amber-700">No chapter headings were detected. Homework will use the whole Textbook.</small>}</label>
          <label className="field"><span>Homework Pattern</span><select value={homeworkPattern} onChange={e=>applyPattern(e.target.value as HomeworkPatternKey)}>{homeworkPatterns.map(pattern=><option key={pattern.key} value={pattern.key}>{pattern.label}</option>)}</select>{homeworkPattern!=='custom' && <small className="text-slate-500">{selectedTypes.map(t=>`${t.label} × ${t.count}`).join(' • ')}</small>}</label>
        </div>
        {homeworkPattern==='custom' && <details className="rounded-xl border border-slate-200 bg-slate-50 p-3" open><summary className="cursor-pointer text-xs font-black text-slate-800">Choose Custom Homework Types ({selectedTypes.length} selected)</summary><div className="mt-3 grid gap-2 sm:grid-cols-2">{visibleHomeworkTypes.map(type => { const active=Number(homeworkTypes[type.key]||0)>0; return <div key={type.key} className={`rounded-lg border p-2 ${active?'border-cyan-300 bg-cyan-50':'border-slate-200 bg-white'}`}><label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={active} onChange={()=>toggleType(type.key,type.defaultCount)}/>{type.label}</label>{active && <label className="mt-2 flex items-center justify-between gap-2 text-[10px] font-bold text-slate-500">Quantity<select value={homeworkTypes[type.key]} onChange={e=>setHomeworkTypes(v=>({...v,[type.key]:Number(e.target.value)}))} className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-xs">{Array.from({length:15},(_,i)=>i+1).map(n=><option key={n} value={n}>{n}</option>)}</select></label>}</div>; })}</div></details>}
      </>}

      <div className="mt-4 form-grid two">
        <label className="field"><span>Homework Title</span><input value={homeworkTitle} onChange={e=>{setHomeworkTitle(e.target.value);setPublishedRecordId('');}} placeholder={mode==='manual'?'e.g. EVS Homework — Solar System':'Auto-filled after generation; editable'}/></label>
        <label className="field"><span>Homework Date</span><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
        <label className="field"><span>Due Date</span><input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}/></label>
        <label className="field"><span>Homework Language</span><select value={languageCode} onChange={e=>setLanguageCode(e.target.value)}><option value="auto">Use Subject / School Medium ({assignment?.medium || 'automatic'})</option>{FALLBACK_LANGUAGE_CATALOGUE.map(option=><option key={String(option.code)} value={String(option.code)}>{languageDisplayName(option)}</option>)}<option value="other">Other / Custom</option></select></label>
        {languageCode==='other' && <label className="field"><span>Custom Language</span><input value={customLanguage} onChange={e=>setCustomLanguage(e.target.value)} placeholder="Language name"/></label>}
        <label className="field"><span>Optional Copy to Another Assigned Division</span><select value={copyTargetAssignmentId} onChange={e=>setCopyTargetAssignmentId(e.target.value)}><option value="">Do not copy</option>{copyTargets.map(a=><option key={a.id} value={a.id}>{a.className}-{divisionScreenLabel(a.division)} • {a.subjectName}</option>)}</select></label>
      </div>

      {mode==='ai' ? <details className="mt-4 rounded-xl border border-slate-200 bg-white p-3"><summary className="cursor-pointer text-xs font-black text-slate-800">More AI Options (optional)</summary><div className="mt-4 form-grid two"><label className="field"><span>Difficulty</span><select value={difficulty} onChange={e=>setDifficulty(e.target.value)}><option>Easy</option><option>Balanced</option><option>Challenging</option></select></label><label className="field"><span>Target Completion Time</span><select value={targetMinutes} onChange={e=>setTargetMinutes(Number(e.target.value))}><option value={15}>15 minutes</option><option value={20}>20 minutes</option><option value={30}>30 minutes</option><option value={45}>45 minutes</option><option value={60}>60 minutes</option></select></label></div><label className="field"><span>Optional Teacher Instruction</span><textarea rows={3} value={teacherInstruction} onChange={e=>setTeacherInstruction(e.target.value)} placeholder="Leave blank for fully automatic generation. Add only a special instruction if needed."/></label><div className="alert mt-3"><Languages className="mr-2 inline h-4 w-4"/>English + all 22 Scheduled Indian languages are available.</div></details>
      : <label className="field mt-4"><span>Homework Content</span><textarea className={`editor min-h-[240px] ${outputPresentation.className}`} dir={outputPresentation.dir} lang={outputPresentation.languageCode === 'auto' ? undefined : outputPresentation.languageCode} rows={10} value={editableContent} onChange={e=>{setEditableContent(e.target.value);setPublishedRecordId('');}} placeholder="Type or paste the Homework exactly as students should receive it…"/></label>}

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-start gap-3"><Paperclip className="mt-0.5 h-5 w-5 text-slate-700"/><div><div className="text-sm font-black text-slate-900">Add supporting files (optional)</div><div className="mt-1 text-[11px] leading-5 text-slate-600">Attach Image, PDF or Video with the Homework. Up to {MAX_ATTACHMENTS} files; each file up to 45 MB in the current free storage setup.</div></div></div>
        <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-cyan-300 bg-white px-4 py-3 text-xs font-black text-cyan-800"><Paperclip className="h-4 w-4"/>Choose Image / PDF / Video<input className="hidden" type="file" multiple accept="image/*,video/*,application/pdf,.pdf" onChange={e=>{addAttachments(e.target.files);e.currentTarget.value='';}}/></label>
        {(existingAttachments.length>0 || newAttachments.length>0) && <div className="mt-3 space-y-2">
          {existingAttachments.map(row=>{const Icon=attachmentIcon(row.mimeType);return <div key={row.id} className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-white p-3"><Icon className="h-5 w-5 shrink-0 text-emerald-700"/><div className="min-w-0 flex-1"><div className="truncate text-xs font-black text-slate-800">{row.fileName}</div><div className="text-[10px] text-slate-500">Saved attachment {row.sizeBytes?`· ${formatBytes(row.sizeBytes)}`:''}</div></div>{row.url&&<a href={row.url} target="_blank" rel="noreferrer" className="link-btn">Open</a>}<button type="button" title="Remove attachment" disabled={attachmentBusyId===row.id} onClick={()=>void removeExistingAttachment(row)} className="rounded-lg p-2 text-rose-700 hover:bg-rose-50 disabled:opacity-40">{attachmentBusyId===row.id?<RefreshCw className="h-4 w-4 animate-spin"/>:<Trash2 className="h-4 w-4"/>}</button></div>;})}
          {newAttachments.map((file,index)=>{const Icon=attachmentIcon(file.type);return <div key={`${file.name}-${file.lastModified}`} className="flex items-center gap-3 rounded-xl border border-cyan-200 bg-cyan-50/60 p-3"><Icon className="h-5 w-5 shrink-0 text-cyan-700"/><div className="min-w-0 flex-1"><div className="truncate text-xs font-black text-slate-800">{file.name}</div><div className="text-[10px] text-slate-500">New · uploads when Homework is saved · {formatBytes(file.size)}</div></div><button type="button" title="Remove selected file" onClick={()=>setNewAttachments(current=>current.filter((_,i)=>i!==index))} className="rounded-lg p-2 text-slate-600 hover:bg-white"><X className="h-4 w-4"/></button></div>;})}
        </div>}
      </div>

      {mode==='ai' && <div className="mt-4 rounded-xl border border-cyan-100 bg-cyan-50 p-3 text-[11px] leading-5 text-cyan-950"><b>AI source rule:</b> AI Homework always uses only the Textbook tab for the selected Class + Subject. The Image/PDF/Video files attached above are sent to students as supporting files; they are <b>not</b> used as AI source material.</div>}
      {error && <div className="alert danger">{error}{mode==='ai' && <button type="button" className="link-btn ml-2" onClick={()=>startMode('manual')}>Use Manual Homework instead</button>}</div>}
      {mode==='ai' && generateBlocker && <div className={`mt-3 rounded-xl border p-3 text-xs font-bold ${failedTextbooks.length && !readyTextbooks.length ? 'border-amber-200 bg-amber-50 text-amber-800' : preparingTextbooks.length && !readyTextbooks.length ? 'border-cyan-200 bg-cyan-50 text-cyan-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>{failedTextbooks.length && !readyTextbooks.length ? 'Action needed: ' : preparingTextbooks.length && !readyTextbooks.length ? 'Please wait: ' : ''}{generateBlocker}{failedTextbooks.length && !readyTextbooks.length && onNavigate && <button type="button" className="link-btn ml-2" onClick={()=>onNavigate('tr-study-material')}>Open Study Material</button>}</div>}
      {mode==='ai' && <><div className="actions mt-4"><button type="button" className="btn primary min-h-12" style={{display:'inline-flex',minHeight:48,alignItems:'center',justifyContent:'center'}} onClick={()=>void generate()} disabled={!canGenerate}>{busy?<><RefreshCw className="h-4 w-4 animate-spin"/>Generating… fast textbook search</>:<><Sparkles className="h-4 w-4"/>Generate Homework with AI</>}</button>{editableContent&&<button type="button" className="btn ghost" onClick={()=>void generate()} disabled={busy || !!generateBlocker}><RefreshCw className="h-4 w-4"/>Regenerate</button>}</div><p className="mt-2 text-[10px] font-semibold text-slate-500">One tap is enough. EDUNIXO uses the prepared textbook search first, so the full PDF is not re-processed on every Homework request. Safe free-model and PDF fallbacks stay automatic.</p></>}
    </div>

    {hasHomeworkPreview && <div id="academic-output-homework" className="card output-card print-root">
      <div className="screen-only">
        <div className="card-title-row"><div><h3>{reviewLabel}</h3><small>{mode==='ai' ? (result?.scopeValidated===false?'Review textbook source warning':'Textbook-only source') : 'Teacher-entered content'}</small></div><div className="actions"><SmartPrintDialog targetId="academic-output-homework" title="Homework"/><button className="btn ghost" onClick={()=>void save(false)} disabled={busy}>Save Draft</button><button className="btn primary" onClick={()=>void save(true)} disabled={busy}><BookOpenCheck className="h-4 w-4"/>Save &amp; Publish</button></div></div>
        {saveMessage&&<div className="alert success"><CheckCircle2 className="mr-2 inline h-4 w-4"/>{saveMessage}</div>}
        {result?.warnings?.length>0&&<div className="alert warning">{result.warnings.join(' • ')}</div>}
        <textarea className={`editor ${outputPresentation.className}`} dir={outputPresentation.dir} lang={outputPresentation.languageCode === 'auto' ? undefined : outputPresentation.languageCode} value={editableContent} onChange={e=>{setEditableContent(e.target.value);setPublishedRecordId('');}}/>
        {mode==='ai' && result?.citations?.length ? <details><summary>Internal source references</summary><ul>{result.citations.map((c,i)=><li key={`${c.materialId}-${i}`}>{c.materialTitle}{c.chapter?` — ${c.chapter}`:''}</li>)}</ul></details> : null}
      </div>
      <section className="print-only homework-print-document">
        <div className="homework-print-title">{safeHomeworkTitle.trim() || 'HOMEWORK'}</div>
        <div className="homework-print-meta" dir="ltr"><span><b>Class:</b> {assignment?.className || '-'}{assignment?.division && assignment.division !== 'All' ? ` - ${assignment.division}` : ''}</span><span><b>Subject:</b> {assignment?.subjectName || '-'}</span><span><b>Chapter/Unit:</b> {mode==='ai' ? (chapters.length ? chapters.join(', ') : 'Whole Textbook') : 'Manual Homework'}</span><span><b>Date:</b> {date || '-'}</span><span><b>Due Date:</b> {dueDate || '-'}</span></div>
        <div className={`generated-print-content ${outputPresentation.className}`} dir={outputPresentation.dir} lang={outputPresentation.languageCode === 'auto' ? undefined : outputPresentation.languageCode}>{homeworkPrintLines.map((line,index)=><div key={`${index}-${line.slice(0,16)}`} className={`homework-print-line${line.trim() ? '' : ' is-blank'}`}>{line || '\u00a0'}</div>)}</div>
        {existingAttachments.length>0 && <div className="homework-print-attachments"><b>Supporting files:</b> {existingAttachments.map(a=>a.fileName).join(' · ')}</div>}
      </section>
    </div>}

    {hasHomeworkPreview && <div className="card"><div className="card-title-row"><div><h3>Publish &amp; Send</h3><small>Publish once, then send the same Homework. On supported mobile browsers, My WhatsApp · Free shares the actual Image / Video / PDF files.</small></div></div><div className="actions"><button type="button" className="btn ghost" disabled={!publishedRecordId} onClick={async()=>setWhatsAppStatus(await copyText(shareText)?'Homework copied.':'Copy blocked by browser.')}><Copy className="h-4 w-4"/>Copy Homework</button>{onNavigate&&<button type="button" className="btn ghost" disabled={!publishedRecordId} onClick={()=>onNavigate('tr-homework-notifications')}><Send className="h-4 w-4"/>Website/App Notifications</button>}<button type="button" className="btn primary" disabled={!canOpenWhatsApp} onClick={openWhatsApp}><MessageCircleMore className="h-4 w-4"/>Open My WhatsApp · Free</button></div>{!publishedRecordId && <div className="mt-3 text-xs font-bold text-amber-700">Save &amp; Publish first to enable Website/App and My WhatsApp · Free.</div>}{whatsAppStatus&&<div className="mt-3 text-xs font-bold text-emerald-800">{whatsAppStatus}</div>}</div>}
  </section>;
}
