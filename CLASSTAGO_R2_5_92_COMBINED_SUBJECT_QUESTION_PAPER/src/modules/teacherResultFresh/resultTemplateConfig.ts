import { getDualPaperNames, normalizeClassStandard } from '../../lib/assessmentRules';
import type { ResultHead, ResultTemplateDefinition, ResultTemplateKey } from './types';
import { getRuntimeClerkMasterTemplate } from './clerkMasterTemplates';

const resultGrade = (score: number, max = 100) => {
  const pct = max > 0 ? (score / max) * 100 : 0;
  if (pct >= 75) return 'A';
  if (pct >= 60) return 'B';
  if (pct >= 45) return 'C';
  if (pct >= 35) return 'D';
  return 'E';
};

const totalHead = (key: string, label: string, maxMarks: number, sources: string[], group?: string, ownerSection?: ResultHead['ownerSection']): ResultHead => ({
  key, label, maxMarks, kind: 'calculated', formula: 'sum', sources, group, ownerSection,
});

export function calculateComputed(template: ResultTemplateDefinition, marks: Record<string, string | number>) {
  const computed: Record<string, string | number> = {};
  const values = { ...marks } as Record<string, string | number>;
  for (const head of template.heads) {
    if (head.kind !== 'calculated') continue;
    const nums = (head.sources || []).map(key => Number(values[key] ?? computed[key] ?? 0)).filter(n => Number.isFinite(n));
    if (head.formula === 'sum') computed[head.key] = nums.reduce((a,b) => a+b, 0);
    if (head.formula === 'average') computed[head.key] = nums.length ? Math.round(nums.reduce((a,b) => a+b, 0) / nums.length) : 0;
    if (head.formula === 'grade') {
      const source = (head.sources || [])[0];
      const score = Number(values[source] ?? computed[source] ?? 0);
      const sourceHead = template.heads.find(h => h.key === source);
      computed[head.key] = resultGrade(score, sourceHead?.maxMarks || 100);
    }
    values[head.key] = computed[head.key];
  }
  return computed;
}

function regular18(): ResultTemplateDefinition {
  const heads: ResultHead[] = [
    { key:'oral', label:'Oral / Viva', maxMarks:10, kind:'mark', ownerSection:'subject' },
    { key:'practical', label:'Practical / Project', maxMarks:10, kind:'mark', ownerSection:'subject' },
    totalHead('formative_total','Formative Total',20,['oral','practical']),
    { key:'written', label:'Written Exam', maxMarks:60, kind:'mark', ownerSection:'subject' },
    totalHead('summative_total','Summative Total',60,['written']),
    totalHead('grand_total','Grand Total',80,['formative_total','summative_total']),
    { key:'grade', label:'Grade', kind:'calculated', formula:'grade', sources:['grand_total'] },
  ];
  return { key:'class_1_8_regular', name:'Class 1–8 Regular Subject Template', description:'Clerk Master Mark List reference for regular Classes 1–8 subjects.', category:'Class 1-8 Regular', heads, totalHeadKey:'grand_total', gradeHeadKey:'grade', source:'built_in_reference' };
}

function language18(): ResultTemplateDefinition {
  const skillHeads = (prefix:string, section:'hindi'|'marathi'): ResultHead[] => [
    { key:`${prefix}_listening`, label:'Listening', maxMarks:2, kind:'mark', group: section === 'hindi' ? 'Hindi' : 'Marathi', ownerSection:section },
    { key:`${prefix}_speaking`, label:'Speaking', maxMarks:2, kind:'mark', group: section === 'hindi' ? 'Hindi' : 'Marathi', ownerSection:section },
    { key:`${prefix}_reading`, label:'Reading', maxMarks:2, kind:'mark', group: section === 'hindi' ? 'Hindi' : 'Marathi', ownerSection:section },
    { key:`${prefix}_writing`, label:'Writing', maxMarks:2, kind:'mark', group: section === 'hindi' ? 'Hindi' : 'Marathi', ownerSection:section },
    { key:`${prefix}_dictation`, label:'Dictation / Oral', maxMarks:2, kind:'mark', group: section === 'hindi' ? 'Hindi' : 'Marathi', ownerSection:section },
    totalHead(`${prefix}_formative_total`,'Formative Total',10,[`${prefix}_listening`,`${prefix}_speaking`,`${prefix}_reading`,`${prefix}_writing`,`${prefix}_dictation`],section === 'hindi' ? 'Hindi' : 'Marathi',section),
    { key:`${prefix}_written`, label:'Written Exam', maxMarks:40, kind:'mark', group: section === 'hindi' ? 'Hindi' : 'Marathi', ownerSection:section },
    totalHead(`${prefix}_total`,'Language Total',50,[`${prefix}_formative_total`,`${prefix}_written`],section === 'hindi' ? 'Hindi' : 'Marathi',section),
  ];
  const heads = [...skillHeads('hindi','hindi'), ...skillHeads('marathi','marathi')];
  return { key:'class_1_8_hindi_marathi', name:'Class 1–8 Hindi/Marathi Language Template', description:'Combined Clerk Master; editing ownership follows the actual Hindi/Marathi teacher assignment.', category:'Class 1-8 Dual Language', heads, source:'built_in_reference' };
}

function single910(): ResultTemplateDefinition {
  const heads: ResultHead[] = [
    { key:'written', label:'Written Exam', maxMarks:80, kind:'mark', ownerSection:'subject' },
    { key:'internal', label:'Internal Evaluation', maxMarks:20, kind:'mark', ownerSection:'subject' },
    totalHead('total','Total',100,['written','internal']),
    { key:'grade', label:'Grade', kind:'calculated', formula:'grade', sources:['total'] },
  ];
  return { key:'class_9_10_single', name:'Class 9–10 Single Subject Template', description:'Urdu / English and other Clerk-mapped single subjects: Written 80 + Internal 20.', category:'Class 9-10 Single Subject', heads, totalHeadKey:'total', gradeHeadKey:'grade', source:'built_in_reference' };
}

function dualPaper910(subjectName:string): ResultTemplateDefinition {
  const names = getDualPaperNames(subjectName);
  const heads: ResultHead[] = [
    { key:'paper_1', label:names.paper1, maxMarks:40, kind:'mark', ownerSection:'subject' },
    { key:'paper_2', label:names.paper2, maxMarks:40, kind:'mark', ownerSection:'subject' },
    totalHead('written_total','Written Total',80,['paper_1','paper_2']),
    { key:'internal', label:'Internal Evaluation', maxMarks:20, kind:'mark', ownerSection:'subject' },
    totalHead('total','Total',100,['written_total','internal']),
    { key:'grade', label:'Grade', kind:'calculated', formula:'grade', sources:['total'] },
  ];
  return { key:'class_9_10_dual_paper', name:'Class 9–10 Dual Paper Subject Template', description:`${names.paper1} + ${names.paper2} + Internal Evaluation.`, category:'Class 9-10 Dual Paper Subject', heads, totalHeadKey:'total', gradeHeadKey:'grade', source:'built_in_reference' };
}

function dualLang910(): ResultTemplateDefinition {
  const section = (prefix:string, label:string, owner:'hindi'|'marathi'): ResultHead[] => [
    { key:`${prefix}_written`, label:'Written Exam', maxMarks:40, kind:'mark', group:label, ownerSection:owner },
    { key:`${prefix}_internal`, label:'Internal / Oral', maxMarks:10, kind:'mark', group:label, ownerSection:owner },
    totalHead(`${prefix}_total`,`${label} Total`,50,[`${prefix}_written`,`${prefix}_internal`],label,owner),
  ];
  const heads = [...section('hindi','Hindi','hindi'), ...section('marathi','Marathi','marathi')];
  return { key:'class_9_10_dual_language', name:'Class 9–10 Dual Language Template', description:'Term-wise Hindi + Marathi Clerk Master. Each language is 40 Written + 10 Internal/Oral = 50 for the selected term; editing ownership follows assignment.', category:'Class 9-10 Dual Language', heads, source:'built_in_reference' };
}

function subject1112(subjectName:string): ResultTemplateDefinition {
  const label = String(subjectName || 'Subject').trim() || 'Subject';
  const heads: ResultHead[] = [
    { key:'theory', label:'Theory / Written', maxMarks:80, kind:'mark', ownerSection:'subject' },
    { key:'internal_practical', label:'Internal / Practical', maxMarks:20, kind:'mark', ownerSection:'subject' },
    totalHead('total','Total',100,['theory','internal_practical']),
    { key:'grade', label:'Grade', kind:'calculated', formula:'grade', sources:['total'] },
  ];
  return { key:'class_11_12_subject', name:`Class 11–12 ${label} Subject Template`, description:'Automatic subject-wise senior-secondary template. The system routes it from the Teacher academic assignment; teachers and clerks do not choose a template.', category:'Class 11-12 Subject', heads, totalHeadKey:'total', gradeHeadKey:'grade', source:'built_in_reference' };
}

function gradeSubject(): ResultTemplateDefinition {
  const heads: ResultHead[] = [
    { key:'assessment', label:'Assessment', maxMarks:100, kind:'mark', ownerSection:'subject' },
    { key:'grade', label:'Grade', kind:'grade', ownerSection:'subject' },
  ];
  return { key:'grade_subject', name:'Grade Subject Template', description:'For grade subjects such as H.P.E., SDAA and Guide. The system routes this template automatically from the assigned subject; grade-subject values remain outside the main scholastic Grand Total.', category:'Grade Subject', heads, gradeHeadKey:'grade', source:'built_in_reference' };
}

export function builtInTemplate(key: ResultTemplateKey, subjectName=''): ResultTemplateDefinition {
  let base: ResultTemplateDefinition;
  if (key === 'class_1_8_regular') base = regular18();
  else if (key === 'class_1_8_hindi_marathi') base = language18();
  else if (key === 'class_9_10_single') base = single910();
  else if (key === 'class_9_10_dual_paper') base = dualPaper910(subjectName);
  else if (key === 'class_9_10_dual_language') base = dualLang910();
  else if (key === 'class_11_12_subject') base = subject1112(subjectName);
  else base = gradeSubject();
  return { ...base, legacyMaster: getRuntimeClerkMasterTemplate(key, subjectName) };
}


export function normalizeMappedTemplateKey(value?: string | null): ResultTemplateKey | null {
  const v=String(value||'').toLowerCase().trim();
  if(!v)return null;
  if(v==='class_1_8_regular'||v==='tmpl_class_1_8_regular')return 'class_1_8_regular';
  if(v==='class_1_8_hindi_marathi'||v==='tmpl_class_1_8_language'||v.includes('1-8 hindi')||v.includes('1–8 hindi'))return 'class_1_8_hindi_marathi';
  if(v==='class_9_10_single'||v==='tmpl_class_9_10_general'||v.includes('9-10 single')||v.includes('9–10 single'))return 'class_9_10_single';
  if(v==='class_9_10_dual_paper'||v==='tmpl_class_9_10_math'||v.includes('dual paper'))return 'class_9_10_dual_paper';
  if(v==='class_9_10_dual_language'||v==='tmpl_class_9_10_lang'||v.includes('dual language'))return 'class_9_10_dual_language';
  if(v==='class_11_12_subject'||v.includes('11-12 subject')||v.includes('11–12 subject'))return 'class_11_12_subject';
  if(v==='grade_subject'||v.includes('grade subject'))return 'grade_subject';
  return null;
}

export function fallbackTemplateKey(className:string, subjectName:string): ResultTemplateKey {
  const std = normalizeClassStandard(className);
  const subject = String(subjectName || '').toLowerCase().replace(/\s+/g,' ').trim();
  const grade = /(^|\b)(h\.?p\.?e\.?|sdaa|guide)(\b|$)|physical education|health.*physical|school.*activity/.test(subject);
  if (grade) return 'grade_subject';
  const isHindi = subject.includes('hindi') || subject.includes('हिंदी') || subject.includes('ہندی');
  const isMarathi = subject.includes('marathi') || subject.includes('मराठी') || subject.includes('مراٹھی');
  const combinedHindiMarathi = (isHindi && isMarathi) || /hindi\s*[\/&+,-]\s*marathi|marathi\s*[\/&+,-]\s*hindi/.test(subject);

  // Classes 1–8: Hindi or Marathi taught as an individual subject uses the same
  // regular subject structure. Only an explicitly combined Hindi/Marathi subject
  // gets the combined three-row language structure.
  if (std && std <= 8) return combinedHindiMarathi ? 'class_1_8_hindi_marathi' : 'class_1_8_regular';

  // Classes 9–10: the approved subject families route automatically. Hindi/Marathi
  // keep the dual-language structure so split Teacher ownership remains supported.
  if (std === 9 || std === 10) {
    if (isHindi || isMarathi) return 'class_9_10_dual_language';
    if (/math|science|social|history|geograph|civics|politic|गणित|विज्ञान|सामाजिक|ریاضی|سائنس|سماجی/.test(subject)) return 'class_9_10_dual_paper';
    return 'class_9_10_single';
  }

  // Classes 11–12 are always routed from the assigned subject. There is no Clerk
  // mapping step and no Teacher template picker.
  if (std === 11 || std === 12) return 'class_11_12_subject';

  return 'class_1_8_regular';
}
