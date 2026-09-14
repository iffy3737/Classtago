import { ROLE_MODULE_BLUEPRINT, type RoleVisibleModule } from './roleModuleBlueprint';

export type DemoRole = 'headmaster'|'clerk'|'teacher'|'student'|'parent'|'super_admin';
export type DemoTier = 'live'|'guided'|'tour';
export type DemoDomain = 'dashboard'|'attendance'|'academic'|'results'|'admissions'|'timetable'|'communication'|'website'|'student'|'fees'|'leave'|'certificate'|'library'|'operations'|'generic';

export type DemoModuleEntry = {
  id:string;
  label:string;
  description:string;
  category:string;
  tab:string;
  tier:DemoTier;
  domain:DemoDomain;
  features:Array<{id:string;label:string}>;
  additionalDuty?:boolean;
};

export type DemoRoleProfile = {
  name:string;
  title:string;
  context:string;
  avatarLabel:string;
};

export const DEMO_ROLE_PROFILES:Record<DemoRole,DemoRoleProfile> = {
  headmaster:{name:'Dr. Meera Nair',title:'Headmaster',context:'School command, approvals and final academic authority',avatarLabel:'MN'},
  clerk:{name:'Rohan Das',title:'Clerk',context:'Office operations, admissions and school records',avatarLabel:'RD'},
  teacher:{name:'Anita Joseph',title:'Teacher · Class Teacher 8A',context:'Science teacher with Class Teacher duty',avatarLabel:'AJ'},
  student:{name:'Arjun Mehta',title:'Student · Class 8A',context:'GR 2402 · Roll 2',avatarLabel:'AM'},
  parent:{name:'Kavita Mehta',title:'Parent',context:'Parent of Arjun Mehta · Class 8A',avatarLabel:'KM'},
  super_admin:{name:'Platform Admin',title:'Super Admin',context:'Platform Academic Core preview',avatarLabel:'PA'}
};

const liveWords = [
  'command center','approval inbox','admission','attendance','teaching','academic work','homework','question paper','result','progress card','exam','timetable','student master','my students','subjects & teachers','my subjects','learning'
];
const guidedWords = [
  'communication','notice','website','campaign','certificate','leave','fee','receipt','recognition','analytics','calendar','profile','request center','service request','documents'
];
const tourWords = [
  'library','inventory','asset','payroll','accounting','finance','security','audit','register','government','office','gate','vehicle','visitor','statutory','system admin','master data'
];

const textHas = (text:string, words:string[]) => words.some(word => text.includes(word));

export function inferDemoTier(role:DemoRole,module:Pick<RoleVisibleModule,'id'|'label'|'description'|'tab'>):DemoTier{
  const text=`${module.id} ${module.label} ${module.description||''} ${module.tab}`.toLowerCase();
  if(role==='student'||role==='parent'){
    if(textHas(text,['attendance','homework','result','progress card','timetable','subjects','children','family overview','parent home','my home'])) return 'live';
    if(textHas(text,['notice','message','fee','receipt','leave','certificate','admission','profile','request'])) return 'guided';
    return 'tour';
  }
  if(textHas(text,tourWords)) return 'tour';
  if(textHas(text,liveWords)) return 'live';
  if(textHas(text,guidedWords)) return 'guided';
  return role==='teacher'?'live':'guided';
}

export function inferDemoDomain(module:Pick<RoleVisibleModule,'id'|'label'|'description'|'tab'>):DemoDomain{
  const text=`${module.id} ${module.label} ${module.description||''} ${module.tab}`.toLowerCase();
  if(textHas(text,['command center','dashboard','overview','home'])) return 'dashboard';
  if(text.includes('attendance')) return 'attendance';
  if(textHas(text,['teaching','academic work','homework','study material','question paper','lesson plan','year plan','daily plan','subjects'])) return 'academic';
  if(textHas(text,['result','progress card','marks','exam'])) return 'results';
  if(text.includes('admission')) return 'admissions';
  if(text.includes('timetable')||text.includes('workload')||text.includes('substitution')) return 'timetable';
  if(textHas(text,['communication','notice','message'])) return 'communication';
  if(textHas(text,['website','campaign'])) return 'website';
  if(textHas(text,['student master','student lifecycle','my students','my children','child profile'])) return 'student';
  if(textHas(text,['fee','receipt'])) return 'fees';
  if(text.includes('leave')) return 'leave';
  if(textHas(text,['certificate','document'])) return 'certificate';
  if(text.includes('library')) return 'library';
  if(textHas(text,['inventory','payroll','accounting','finance','register','security','audit','office','vehicle','visitor','gate'])) return 'operations';
  return 'generic';
}

function flattenRole(roleKey:string,additionalDuty=false):DemoModuleEntry[]{
  const categories=ROLE_MODULE_BLUEPRINT[roleKey]||[];
  return categories.flatMap(category=>category.modules.map(module=>({
    id:module.id,
    label:module.label,
    description:module.description||`${module.label} in the production Classtago workspace.`,
    category:additionalDuty?`${category.label} · Additional Duty`:category.label,
    tab:module.tab,
    tier:inferDemoTier(roleKey==='class_teacher'?'teacher':roleKey as DemoRole,module),
    domain:inferDemoDomain(module),
    features:module.features.map(feature=>({id:feature.id,label:feature.label})),
    additionalDuty
  })));
}

export function roleDemoModules(role:DemoRole):DemoModuleEntry[]{
  if(role==='super_admin') return [
    {id:'platform-academic-core',label:'Platform Academic Core',description:'Board/State Rules Engine, template governance and feature-language policy.',category:'Platform Governance',tab:'platform',tier:'live',domain:'results',features:[{id:'board-registry',label:'Board & State Registry'},{id:'rulesets',label:'Rules & Versions'},{id:'templates',label:'Template Library'},{id:'languages',label:'Feature Languages'}]},
    {id:'platform-schools',label:'School Portfolio',description:'Multi-school onboarding and school-level platform controls.',category:'Platform Governance',tab:'platform',tier:'guided',domain:'generic',features:[{id:'schools',label:'Schools'},{id:'subscriptions',label:'Subscriptions'},{id:'modules',label:'Module Entitlements'}]}
  ];
  const base=flattenRole(role);
  if(role!=='teacher') return base;
  const duty=flattenRole('class_teacher',true);
  const seen=new Set(base.map(m=>m.id));
  return [...base,...duty.filter(m=>!seen.has(m.id))];
}

export const tierCopy:Record<DemoTier,{label:string;short:string;description:string}> = {
  live:{label:'LIVE INTERACTIVE',short:'Live',description:'A controlled version of the real workflow. Actions change temporary demo data and may appear in another demo role.'},
  guided:{label:'GUIDED DEMO',short:'Guided',description:'The production workflow is represented step-by-step with safe simulated actions; no external delivery or production write occurs.'},
  tour:{label:'FEATURE TOUR',short:'Tour',description:'A focused product tour for a supporting feature. The manual explains the full production workflow without loading unnecessary demo complexity.'}
};

const domainPurpose:Record<DemoDomain,string>={
  dashboard:'Gives the role a concise operational view of the school and links to the correct owner workflows.',
  attendance:'Records or presents attendance using the role’s permitted class/child scope and feeds registers, alerts and reporting.',
  academic:'Supports day-to-day teaching and learning work, including study material, planning, homework and academic generation tools.',
  results:'Carries examination, marks, review, publication and board-compatible document workflows without mixing another board’s rules.',
  admissions:'Moves an applicant through the permitted admission stages while preserving review, approval and Student Master ownership.',
  timetable:'Shows or manages timetable/workload/substitution information within the role’s authorized scope.',
  communication:'Creates or receives school communication through the correct approval and delivery channels.',
  website:'Manages the school’s public-facing website or admission campaign content without changing academic records.',
  student:'Maintains or presents the permanent student record, lifecycle and linked family information according to role permissions.',
  fees:'Handles fee position, receipts or approvals while preserving the canonical financial ledger and audit trail.',
  leave:'Handles leave submission, status or approval using the role-specific workflow and audit trail.',
  certificate:'Creates, requests, approves or presents official school documents using controlled templates and issue history.',
  library:'Shows library holdings, loans or requests connected to the school and student/staff identity.',
  operations:'Supports back-office governance such as finance, inventory, registers, security or audit without duplicating owner records.',
  generic:'Provides the role-specific production workflow represented by this module.'
};

const domainSteps:Record<DemoDomain,string[]>={
  dashboard:['Open the role dashboard.','Review role-scoped cards, alerts and pending work.','Use the relevant card to enter the canonical owner module.'],
  attendance:['Choose the permitted class, division or linked child.','Open the required date or attendance view.','Record or review attendance.','Save the temporary demo action; production saves to the canonical cloud attendance record.','Use monthly/history/catalogue views where the role has access.'],
  academic:['Choose the assigned class and subject.','Open the relevant academic tool or source material.','Select chapter/topic and required language where applicable.','Generate or prepare the work, review it, and edit before saving.','Publish/assign only through the role’s permitted production action.'],
  results:['Choose the permitted class/exam/subject or linked child.','Open marks, review or published-result view according to role.','Apply the active Board/State ruleset and compatible template.','Review totals/grades/status before submission or publication.','Print/download the final document only after its production workflow allows it.'],
  admissions:['Open the admission queue or intake desk.','Create/review the application using the role’s permitted fields.','Send the record to the next approval stage instead of bypassing ownership.','After final approval, the permanent Student Master is updated by the canonical workflow.'],
  timetable:['Open today/weekly timetable or the management workspace.','Review class, subject, teacher and period constraints.','Apply or simulate the permitted timetable/substitution action.','Publish/notify only from the production owner workflow.'],
  communication:['Choose the permitted audience and channel.','Prepare the notice/message using the required language.','Preview the message and approval state.','In production, send/schedule through configured channels; demo delivery is simulated only.'],
  website:['Open the school website/campaign workspace.','Edit the permitted section or campaign content.','Preview the public-facing result.','Publish only through the production approval/control path.'],
  student:['Find the required student/child record.','Open the permitted profile, placement or lifecycle view.','Review linked academic and family information.','Make only the role-authorized update/request.'],
  fees:['Choose the student/child or fee period.','Review dues, transactions or approval request.','Prepare the allowed receipt/adjustment/approval action.','Production writes remain in the canonical ledger and audit trail.'],
  leave:['Create or open the leave request.','Enter dates/reason and required supporting information.','Submit or review according to the role.','Track approval status in the same permanent workflow.'],
  certificate:['Choose the document type and student/child.','Review source data and template.','Submit/request/approve according to role.','Issue, print or download only after the official workflow permits it.'],
  library:['Open search/loan/request view.','Choose the book or linked student/staff record.','Review issue/return/due information.','Run the permitted request or transaction in production.'],
  operations:['Open the correct back-office register/workspace.','Review the role-scoped operational records.','Use the owner workflow for create/update/approval.','Preserve audit history; supporting features do not overwrite academic source-of-truth records.'],
  generic:['Open the module from the role navigation.','Choose the permitted record or feature.','Complete the role-specific workflow.','Save/submit through the production owner module.']
};

export type DemoManual={
  title:string; role:string; tier:string; purpose:string; whenToUse:string; steps:string[]; features:string[]; connections:string[]; output:string[]; productionNote:string;
};

export function buildDemoManual(role:DemoRole,module:DemoModuleEntry):DemoManual{
  const profile=DEMO_ROLE_PROFILES[role];
  const features=module.features.slice(0,12).map(f=>f.label);
  const connections=[
    `Role permissions: ${profile.title}`,
    `Academic context: selected Board/State rules and school languages where applicable`,
    `Owner workspace: ${module.label}`
  ];
  if(module.additionalDuty) connections.push('Additional-duty scope: Class Teacher permissions are layered on the Teacher account, not a separate person account.');
  return {
    title:`${module.label} — Feature Manual`,
    role:profile.title,
    tier:tierCopy[module.tier].label,
    purpose:domainPurpose[module.domain],
    whenToUse:`Use ${module.label} when the ${profile.title} needs to work with ${module.features.slice(0,3).map(f=>f.label.toLowerCase()).join(', ')||'this production workflow'}.`,
    steps:domainSteps[module.domain],
    features:features.length?features:['Open the production module and follow its role-scoped workflow.'],
    connections,
    output:[
      module.tier==='live'?'Temporary demo changes can be observed in the relevant role where the workflow is cross-role.':'The demo shows the workflow without creating a real external or production transaction.',
      'The full app preserves role scope, school scope, audit history and print/document rules.'
    ],
    productionNote:`This demo intentionally shows only the important experience of ${module.label}. The production Classtago module contains the full controls, validations, records and history represented by the real role blueprint.`
  };
}
