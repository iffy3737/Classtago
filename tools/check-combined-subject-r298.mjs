import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const server=fs.readFileSync(path.join(root,'server.ts'),'utf8');
const builder=fs.readFileSync(path.join(root,'src/modules/teacherAcademicFresh/components/CombinedQuestionPaperBuilder.tsx'),'utf8');
const migration=fs.readFileSync(path.join(root,'supabase/migrations/20260912090000_combined_question_paper_canonical_storage.sql'),'utf8');
const checks=[
  ['CQP group namespace', server.includes("group_code||'').toUpperCase().startsWith('CQP_')") || server.includes("group_code || '').toUpperCase().startsWith('CQP_')")],
  ['minimum 2 subjects', server.includes("subjectIds.length < 2") && server.includes("groupMemberIds.length<2")],
  ['same-teacher workflow', builder.includes("single_teacher_combined")],
  ['different-teacher workflow', builder.includes("collaborative_component")],
  ['canonical combined save', server.includes('const canonicalAssignmentId=String(scope.assignmentId||assignmentId).trim()') && server.includes('assignment_id:canonicalAssignmentId')],
  ['canonical clerk queue', server.includes("from('school_subject_teacher_assignments').select('id,teacher_id,school_id,academic_year_id,class_id,division_id,subject_id')")],
  ['question paper tables migration', migration.includes('create table if not exists public.edunixo_question_papers') && migration.includes('create table if not exists public.edunixo_question_paper_questions')],
  ['optional pattern table does not crash CQP discovery', server.includes("if(/does not exist|schema cache|could not find|relation .* does not exist/i.test(message))return null;")],
];
const failed=checks.filter(([,ok])=>!ok);
for(const [name,ok] of checks) console.log(`${ok?'PASS':'FAIL'}  ${name}`);
if(failed.length) process.exit(1);
