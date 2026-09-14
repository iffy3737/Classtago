import { useEffect, useMemo, useState } from 'react';
import type { CombinedSubjectGroup, QuestionPaperDraft, QuestionPaperExam, QuestionPaperSourceMode, QuestionPatternRow, StudyMaterial, TeacherAssignment } from '../types/domain';
import { generateQuestionPaperDraft, listStudyMaterialChapters, prepareHomeworkTextbookSource } from '../services/teacherAcademicService';

const examLabels: Record<QuestionPaperExam,string> = {
  first_unit_test:'First Unit Test', first_term_examination:'First Term Examination', second_unit_test:'Second Unit Test', second_term_examination:'Second Term Examination'
};
type Family='general'|'science'|'maths'|'language'|'social'|'art'|'computer';
const family=(a?:TeacherAssignment|null):Family=>{const v=`${a?.subjectName||''} ${a?.subjectCode||''}`.toLowerCase();if(/math|algebra|geometry|arithmetic|ganit/.test(v))return'maths';if(/drawing|art|craft/.test(v))return'art';if(/computer|ict|coding|information technology/.test(v))return'computer';if(/science|evs|environment|physics|chemistry|biology/.test(v))return'science';if(/history|geography|civics|social|political science|economics/.test(v))return'social';if(/english|urdu|hindi|marathi|sanskrit|gujarati|kannada|tamil|telugu|malayalam|bengali|punjabi|odia|assamese|kashmiri|sindhi|language/.test(v))return'language';return'general';};
const typesByFamily:Record<Family,string[]>={
  general:['MCQ','Fill in the Blanks','True / False','Match the Following','Very Short Answer','Short Answer','Long Answer'],
  science:['MCQ','Fill in the Blanks','True / False','Match the Following','Very Short Answer','Short Answer','Long Answer','Definitions / Terms','Give Reasons','Diagram / Labeling','Observation / Activity'],
  maths:['MCQ','Fill in the Blanks','Solve Problems / Sums','Word Problems','Mental Maths','Show Complete Working','Geometry / Construction','Very Short Answer','Short Answer'],
  language:['MCQ','Fill in the Blanks','Match the Following','Very Short Answer','Short Answer','Long Answer','Grammar / Language Practice','Comprehension','Vocabulary / Word Meaning','Sentence Making','Writing / Essay'],
  social:['MCQ','Fill in the Blanks','True / False','Match the Following','Very Short Answer','Short Answer','Long Answer','Map Work','Timeline / Sequence','Identify / Name','Cause & Effect'],
  art:['Drawing','Sketching','Colouring','Pattern / Design','Observation Drawing','Creative Composition','Craft / Activity'],
  computer:['MCQ','Fill in the Blanks','True / False','Match the Following','Very Short Answer','Short Answer','Long Answer','Practical Task','Lab Exercise','Shortcut Keys','Identify Parts / Components'],
};
const basePattern=(a?:TeacherAssignment|null):QuestionPatternRow[]=>{switch(family(a)){case'maths':return[{type:'MCQ',count:5,marksEach:1},{type:'Solve Problems / Sums',count:5,marksEach:3},{type:'Word Problems',count:4,marksEach:5}];case'language':return[{type:'Fill in the Blanks',count:5,marksEach:1},{type:'Grammar / Language Practice',count:5,marksEach:1},{type:'Short Answer',count:5,marksEach:2},{type:'Long Answer',count:4,marksEach:5}];case'art':return[{type:'Drawing',count:2,marksEach:10},{type:'Creative Composition',count:2,marksEach:10}];case'computer':return[{type:'MCQ',count:5,marksEach:1},{type:'Fill in the Blanks',count:5,marksEach:1},{type:'Practical Task',count:5,marksEach:2},{type:'Short Answer',count:4,marksEach:5}];default:return[{type:'MCQ',count:5,marksEach:1},{type:'Fill in the Blanks',count:5,marksEach:1},{type:'Short Answer',count:5,marksEach:2},{type:'Long Answer',count:4,marksEach:5}];}};
const patternTotal=(rows:QuestionPatternRow[])=>rows.reduce((s,r)=>s+Number(r.count||0)*Number(r.marksEach||0),0);
const assignmentFor=(assignments:TeacherAssignment[],assignmentId?:string)=>assignments.find((x:any)=>String(x.id||'')===String(assignmentId||''))||assignments.find((x:any)=>String((x as any).cloudId||'')===String(assignmentId||''));
// Combined groups are resolved from canonical school_subject_teacher_assignments.
// The Teacher UI may expose legacy_source_id as its display id, so generation must
// always send the canonical cloud assignment id back to the R33.10 server.
const canonicalAssignmentId=(assignment:TeacherAssignment)=>String((assignment as any).cloudId||assignment.id||'').trim();
const fitPattern=(assignment:TeacherAssignment|undefined,target:number):QuestionPatternRow[]=>{
  const amount=Math.max(1,Math.floor(target||1));const base=basePattern(assignment);const out:QuestionPatternRow[]=[];let left=amount;
  for(const row of base){if(left<=0)break;const each=Math.max(1,Math.floor(row.marksEach));const count=Math.min(row.count,Math.floor(left/each));if(count>0){out.push({...row,count});left-=count*each;}}
  if(left>0){const oneMark=typesByFamily[family(assignment)].find(t=>!/long|essay|drawing|creative|word problem|solve|working|practical|lab/i.test(t))||'Very Short Answer';out.push({type:oneMark,count:left,marksEach:1});}
  return out;
};
const splitMarks=(group:CombinedSubjectGroup,total:number,index:number)=>{
  const suggestions=group.members.map(m=>Number(m.suggestedMarks||0));
  if(suggestions.every(v=>v>0))return suggestions[index];
  const base=Math.floor(Math.max(1,total)/group.members.length), rem=Math.max(1,total)-base*group.members.length;
  return base+(index<rem?1:0);
};
const knownMemberMarks=(member:CombinedSubjectGroup['members'][number])=>Number(member.latestSubmission?.marks||0);

type ComponentState={marks:number;chapters:string[];chapterOptions:string[];loading:boolean;whole:boolean;exercise:boolean;pattern:QuestionPatternRow[];useSaved:boolean;};
type Props={group:CombinedSubjectGroup;currentAssignment:TeacherAssignment;assignments:TeacherAssignment[];materials:StudyMaterial[];exam:QuestionPaperExam;combinedTotalMarks:number;durationMinutes:number;busy?:boolean;onTotalMarksChange:(value:number)=>void;onGenerated:(paper:QuestionPaperDraft)=>void;onBusy:(value:boolean)=>void;onError:(message:string)=>void;};

export function CombinedQuestionPaperBuilder({group,currentAssignment,assignments,materials,exam,combinedTotalMarks,durationMinutes,busy=false,onTotalMarksChange,onGenerated,onBusy,onError}:Props){
  const editableMembers=useMemo(()=>group.currentTeacherHasAll?group.members:group.members.filter(m=>String(m.subjectId)===String(currentAssignment.subjectId)&&m.assignedToCurrentTeacher),[group,currentAssignment.subjectId]);
  const [states,setStates]=useState<Record<string,ComponentState>>({});
  const workflow: 'single_teacher_combined' | 'collaborative_component' = group.currentTeacherHasAll?'single_teacher_combined':'collaborative_component';

  useEffect(()=>{
    if(!group.currentTeacherHasAll)return;
    const suggestedSum=group.members.reduce((sum,m)=>sum+Number(m.suggestedMarks||0),0);
    if(group.members.every(m=>Number(m.suggestedMarks||0)>0)&&suggestedSum>0&&suggestedSum!==combinedTotalMarks)onTotalMarksChange(suggestedSum);
  },[group.id]);

  useEffect(()=>{
    let cancelled=false;
    const initial:Record<string,ComponentState>={};
    group.members.forEach((m,index)=>{
      const a=assignmentFor(assignments,m.assignmentId);
      const savedTotal=patternTotal(m.savedPattern||[]);
      let marks=0;
      if(group.currentTeacherHasAll) marks=splitMarks(group,combinedTotalMarks,index);
      else if(knownMemberMarks(m)>0) marks=knownMemberMarks(m);
      else if(m.assignedToCurrentTeacher&&savedTotal>0) marks=savedTotal;
      else if(m.assignedToCurrentTeacher) marks=Math.max(1,Math.floor(Math.max(1,combinedTotalMarks)/Math.max(1,group.members.length)));
      const useSaved=Boolean(m.savedPattern?.length&&savedTotal===marks&&marks>0);
      initial[m.subjectId]={marks,chapters:[],chapterOptions:[],loading:Boolean(m.assignedToCurrentTeacher),whole:true,exercise:true,pattern:useSaved?(m.savedPattern||[]):fitPattern(a,Math.max(1,marks||1)),useSaved};
    });
    setStates(initial);
    for(const member of editableMembers){const a=assignmentFor(assignments,member.assignmentId);if(!a)continue;const ids=materials.filter(m=>m.category==='textbook'&&!m.archived&&m.extractionStatus==='ready'&&String(m.className)===String(a.className)&&String(m.subjectId)===String(a.subjectId)).map(m=>m.id);if(!ids.length){setStates(cur=>({...cur,[member.subjectId]:{...cur[member.subjectId],loading:false}}));continue;}void listStudyMaterialChapters(ids).then(rows=>{if(!cancelled)setStates(cur=>({...cur,[member.subjectId]:{...cur[member.subjectId],chapterOptions:rows,loading:false}}));}).catch(()=>{if(!cancelled)setStates(cur=>({...cur,[member.subjectId]:{...cur[member.subjectId],loading:false}}));});void prepareHomeworkTextbookSource(ids).catch(()=>undefined);}
    return()=>{cancelled=true;};
  },[group.id,editableMembers.map(m=>m.assignmentId).join('|')]);

  useEffect(()=>{
    if(!group.currentTeacherHasAll)return;
    setStates(cur=>{const next={...cur};group.members.forEach((m,index)=>{const old=next[m.subjectId];if(!old||old.useSaved)return;const marks=splitMarks(group,combinedTotalMarks,index);next[m.subjectId]={...old,marks,pattern:fitPattern(assignmentFor(assignments,m.assignmentId),marks)};});return next;});
  },[combinedTotalMarks,group.currentTeacherHasAll]);

  const update=(subjectId:string,patch:Partial<ComponentState>)=>setStates(cur=>({...cur,[subjectId]:{...cur[subjectId],...patch}}));
  const expectedComponents=group.members.map((m)=>({
    subjectId:m.subjectId,
    subjectName:m.subjectName,
    assignmentId:m.assignmentId,
    teacherName:m.teacherName,
    marks:group.currentTeacherHasAll||m.assignedToCurrentTeacher?Number(states[m.subjectId]?.marks||0):knownMemberMarks(m)
  }));
  const submittedTotal=group.members.reduce((sum,m)=>sum+Number(m.latestSubmission?.marks||0),0);
  const currentTeacherSubmittedTotal=editableMembers.reduce((sum,m)=>sum+Number(m.latestSubmission?.marks||0),0);
  const currentTeacherDraftTotal=editableMembers.reduce((sum,m)=>sum+Number(states[m.subjectId]?.marks||0),0);
  const currentDraftTotal=group.currentTeacherHasAll
    ? group.members.reduce((sum,m)=>sum+Number(states[m.subjectId]?.marks||0),0)
    : submittedTotal-currentTeacherSubmittedTotal+currentTeacherDraftTotal;

  const generate=async()=>{
    onError('');onBusy(true);
    try{
      if(group.members.some(m=>!m.assigned))throw new Error('One or more Subjects in this Combined Group are not assigned for the selected Class/Division. Headmaster must assign each Subject separately before the paper can be prepared.');
      if(group.currentTeacherHasAll){const total=group.members.reduce((sum,m)=>sum+Number(states[m.subjectId]?.marks||0),0);if(total!==combinedTotalMarks)throw new Error(`Combined Subject sections total ${total} marks, but Combined Total Marks is ${combinedTotalMarks}.`);}
      const targets=group.currentTeacherHasAll?group.members:editableMembers;if(!targets.length)throw new Error('This Teacher has no editable Subject component in the selected Combined Subject Group.');
      const generatedParts:Array<{member:any;paper:QuestionPaperDraft}>=[];
      for(const member of targets){
        const a=assignmentFor(assignments,member.assignmentId);const st=states[member.subjectId];
        if(!a||!st)throw new Error(`${member.subjectName} assignment is unavailable.`);
        if(!Number.isFinite(st.marks)||st.marks<=0)throw new Error(`Enter valid marks for ${member.subjectName}.`);
        const textbooks=materials.filter(m=>m.category==='textbook'&&!m.archived&&m.extractionStatus==='ready'&&String(m.className)===String(a.className)&&String(m.subjectId)===String(a.subjectId));
        if(!textbooks.length)throw new Error(`${member.subjectName} Textbook is not AI Ready.`);
        if(!st.whole&&!st.exercise)throw new Error(`Select Whole Chapter or Mashq / Exercise for ${member.subjectName}.`);
        if(patternTotal(st.pattern)!==st.marks)throw new Error(`${member.subjectName} pattern totals ${patternTotal(st.pattern)} marks, expected ${st.marks}.`);
        const source:QuestionPaperSourceMode=st.whole&&st.exercise?'both':st.exercise?'exercise':'whole_chapter';
        const useSavedPattern=Boolean(st.useSaved&&member.savedPattern?.length&&patternTotal(member.savedPattern)===st.marks);
        const p=await generateQuestionPaperDraft({taskType:'question-paper',assignmentId:canonicalAssignmentId(a),materialIds:textbooks.map(m=>m.id),chapterScope:st.chapters,prompt:`Create the ${member.subjectName} component of the ${group.groupName} combined ${examLabels[exam]}. Use only this Subject Textbook. Component marks decided by this Subject Teacher: ${st.marks}.`,structuredInputs:{exam,totalMarks:st.marks,durationMinutes,useSchoolPattern:useSavedPattern,manualPattern:useSavedPattern?[]:st.pattern,sourcePolicy:'textbook_only_auto',questionSource:source,languagePolicy:'textbook_subject_language_auto',chapterSelectionMode:st.chapters.length?'selected_chapters':'whole_textbook'}});
        generatedParts.push({member,paper:p});
      }
      if(!group.currentTeacherHasAll){
        const {member,paper}=generatedParts[0];const componentIndex=group.members.findIndex(m=>m.subjectId===member.subjectId)+1;
        // Collaborative papers deliberately store combinedTotalMarks=0 until all
        // Subject Teachers submit. Clerk computes the final total from actual sections.
        const enriched=paper.pattern.map(row=>({...row,combinedGroupId:group.id,combinedGroupName:group.groupName,collaborationKey:group.collaborationKey,combinedWorkflow:workflow,componentSubjectId:member.subjectId,componentSubjectName:member.subjectName,componentAssignmentId:member.assignmentId,componentIndex,componentTotalMarks:paper.totalMarks,combinedTotalMarks:0,expectedComponents,componentInstructions:paper.instructions}));
        onGenerated({...paper,pattern:enriched,instructions:[],combinedMeta:{groupId:group.id,groupName:group.groupName,collaborationKey:group.collaborationKey,workflow,componentSubjectId:member.subjectId,componentSubjectName:member.subjectName,combinedTotalMarks:0},reviewStatus:'ai_draft'});return;
      }
      let sectionOffset=0,orderOffset=0;const patterns:QuestionPatternRow[]=[],questions:any[]=[],materialIds:string[]=[],chapters:string[]=[];
      for(let partIndex=0;partIndex<generatedParts.length;partIndex++){const {member,paper}=generatedParts[partIndex];for(const id of paper.materialIds)if(!materialIds.includes(id))materialIds.push(id);for(const ch of paper.chapters){const label=`${member.subjectName}: ${ch}`;if(!chapters.includes(label))chapters.push(label);}paper.pattern.forEach(row=>patterns.push({...row,combinedGroupId:group.id,combinedGroupName:group.groupName,collaborationKey:group.collaborationKey,combinedWorkflow:workflow,componentSubjectId:member.subjectId,componentSubjectName:member.subjectName,componentAssignmentId:member.assignmentId,componentIndex:partIndex+1,componentTotalMarks:paper.totalMarks,combinedTotalMarks,expectedComponents,componentInstructions:paper.instructions}));paper.questions.forEach(q=>questions.push({...q,sectionIndex:Number(q.sectionIndex||1)+sectionOffset,orderNo:Number(q.orderNo||1)+orderOffset}));sectionOffset+=paper.pattern.length;orderOffset+=paper.questions.length;}
      const first=generatedParts[0].paper;onGenerated({...first,assignmentId:canonicalAssignmentId(assignmentFor(assignments,generatedParts[0].member.assignmentId) || assignments[0]),materialIds,chapters,totalMarks:combinedTotalMarks,durationMinutes,medium:'Combined',title:`${examLabels[exam]} — ${group.groupName}`,instructions:[],pattern:patterns,questions,combinedMeta:{groupId:group.id,groupName:group.groupName,collaborationKey:group.collaborationKey,workflow,combinedTotalMarks},reviewStatus:'ai_draft'});
    }catch(e){onError(e instanceof Error?e.message:'Combined Question Paper generation failed.');}finally{onBusy(false);}
  };

  return <div className="combined-paper-builder">
    <div className="combined-paper-summary"><div><strong>{group.groupName}</strong><small>{group.currentTeacherHasAll?'All component Subjects are individually assigned to you — set each Subject marks/chapters and generate one complete combined paper.':'Each Subject remains individually assigned. You prepare only your own Subject section; Clerk combines the submitted sections.'}</small></div><span>{group.members.length} Subjects</span></div>
    {!group.currentTeacherHasAll&&<div className="combined-collab-status">{group.members.map((m,i)=><div key={m.subjectId}><b>Part {String.fromCharCode(65+i)} · {m.subjectName}</b><span>{m.assignedToCurrentTeacher?'Your assigned Subject':m.teacherName||'Teacher not assigned'}</span><em className={m.latestSubmission?.status||''}>{m.latestSubmission?.status==='returned'?`Returned${m.latestSubmission.reason?`: ${m.latestSubmission.reason}`:''}`:m.latestSubmission?.status==='approved'?`Approved${m.latestSubmission.marks?` · ${m.latestSubmission.marks} marks`:''}`:m.latestSubmission?.status==='submitted'?`Submitted${m.latestSubmission.marks?` · ${m.latestSubmission.marks} marks`:''}`:'Pending'}</em></div>)}</div>}
    <div className="combined-component-grid">{editableMembers.map((member)=>{const a=assignmentFor(assignments,member.assignmentId);const st=states[member.subjectId];if(!st)return null;const types=typesByFamily[family(a)];const savedTotal=patternTotal(member.savedPattern||[]);return <div className="combined-component-card" key={member.subjectId}>
      <div className="card-title-row"><div><h3>{member.subjectName}</h3><small>{member.teacherName||'Assigned Teacher'}{member.savedPattern?.length?' · Saved school pattern available':''}</small></div><strong>{st.marks} marks</strong></div>
      <label className="field"><span>{group.currentTeacherHasAll?'Subject Section Marks':'My Subject Section Marks'}</span><input type="number" min={1} value={st.marks||''} onChange={e=>{const marks=Math.max(1,Number(e.target.value)||1);update(member.subjectId,{marks,useSaved:false,pattern:fitPattern(a,marks)});}} /><small>Marks are decided by the assigned Subject Teacher, not by Headmaster.</small></label>
      {member.savedPattern?.length&&<div className="question-auto-note"><strong>Saved school pattern:</strong> {savedTotal} marks. {st.useSaved?'Currently selected.':'Your marks change switched this section to an editable manual pattern.'} {!st.useSaved&&<button className="link-btn" type="button" onClick={()=>update(member.subjectId,{marks:savedTotal,useSaved:true,pattern:member.savedPattern||[]})}>Use saved {savedTotal}-mark pattern</button>}</div>}
      <div className="field"><span>Chapters</span><details className="question-multi-select"><summary>{st.loading?'Reading chapters…':st.chapters.length?`${st.chapters.length} selected`:'Whole textbook'}</summary><div className="question-multi-panel"><label className="question-check-row whole"><input type="checkbox" checked={!st.chapters.length} onChange={()=>update(member.subjectId,{chapters:[]})}/><span>Whole textbook</span></label>{st.chapterOptions.map(ch=><label className="question-check-row" key={ch}><input type="checkbox" checked={st.chapters.includes(ch)} onChange={()=>{const set=new Set(st.chapters);set.has(ch)?set.delete(ch):set.add(ch);update(member.subjectId,{chapters:st.chapterOptions.filter(x=>set.has(x))});}}/><span>{ch}</span></label>)}</div></details></div>
      <div className="field"><span>Question Source</span><div className="combined-source-row"><label><input type="checkbox" checked={st.whole} onChange={e=>update(member.subjectId,{whole:e.target.checked})}/> Whole Chapter</label><label><input type="checkbox" checked={st.exercise} onChange={e=>update(member.subjectId,{exercise:e.target.checked})}/> Mashq / Exercise</label></div></div>
      {st.useSaved&&member.savedPattern?.length?<div className="question-pattern-preview"><strong>Saved Pattern</strong><div className="question-pattern-chips">{member.savedPattern.map((r,i)=><span key={`${r.type}-${i}`}>{r.type}: {r.count} × {r.marksEach}</span>)}</div></div>:<div className="pattern-box compact"><div className="card-title-row"><h3>Paper Pattern</h3><small>{patternTotal(st.pattern)}/{st.marks}</small></div>{st.pattern.map((row,i)=><div className="pattern-row" key={`${member.subjectId}-${i}`}><select value={types.includes(row.type)?row.type:types[0]} onChange={e=>update(member.subjectId,{pattern:st.pattern.map((r,x)=>x===i?{...r,type:e.target.value}:r)})}>{types.map(t=><option value={t} key={t}>{t}</option>)}</select><input type="number" min={1} value={row.count} onChange={e=>update(member.subjectId,{pattern:st.pattern.map((r,x)=>x===i?{...r,count:Number(e.target.value)}:r)})}/><span>×</span><input type="number" min={1} value={row.marksEach} onChange={e=>update(member.subjectId,{pattern:st.pattern.map((r,x)=>x===i?{...r,marksEach:Number(e.target.value)}:r)})}/><button className="icon-btn" type="button" onClick={()=>update(member.subjectId,{pattern:st.pattern.filter((_,x)=>x!==i)})}>×</button></div>)}<button className="btn ghost" type="button" onClick={()=>update(member.subjectId,{pattern:[...st.pattern,{type:types[0],count:1,marksEach:1}]})}>+ Add Type</button></div>}
    </div>;})}</div>
    {group.currentTeacherHasAll
      ? <div className="combined-total-note"><strong>Combined Total:</strong> {currentDraftTotal} / {combinedTotalMarks} marks</div>
      : <div className="combined-total-note"><strong>Teacher-owned marks:</strong> Current known total {currentDraftTotal} marks. Final Combined Total is calculated automatically from the actual sections submitted by all Subject Teachers.</div>}
    <div className="actions"><button className="btn primary" type="button" disabled={busy} onClick={()=>void generate()}>{busy?'Generating Combined Paper…':group.currentTeacherHasAll?'Generate Complete Combined Paper':'Generate My Subject Section for Clerk'}</button></div>
  </div>;
}
