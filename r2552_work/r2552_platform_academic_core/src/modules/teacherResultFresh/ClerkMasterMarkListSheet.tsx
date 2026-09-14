import React from 'react';
import type { ResultMarkRow, ResultScope, ResultStudent, ResultTemplateDefinition, ResultTerm } from './types';
import { calculateComputed } from './resultTemplateConfig';
import { currentTermLabel, getRuntimeClerkMasterTemplate, legacyHeaderBinding } from './clerkMasterTemplates';

type Props = {
  schoolName: string;
  teacherName: string;
  scope: ResultScope;
  term: ResultTerm;
  template: ResultTemplateDefinition;
  roster: ResultStudent[];
  rows: Record<string, ResultMarkRow>;
  locked: boolean;
  onChange: (studentId: string, key: string, value: string, max?: number, kind?: string) => void;
};

const gradeFor = (score:number,max=100) => {
  const pct=max>0?(score/max)*100:0;
  if(pct>=75)return 'A'; if(pct>=60)return 'B'; if(pct>=45)return 'C'; if(pct>=35)return 'D'; return 'E';
};

const text = (v:any) => String(v ?? '');
const isIdentity = (h:any) => {
  const lower=text(h.text).toLowerCase();
  return Boolean(h.identityType || h.columnType==='rowLabel' || lower.includes('roll') || lower.includes('g.r.') || lower.includes('name') || lower.includes('seat') || lower.includes('sr.'));
};
const isSignature = (h:any) => /sign|signature/i.test(text(h.text));

function identityValue(h:any, student:ResultStudent, index:number) {
  const lower=text(h.text).toLowerCase();
  const id=text(h.identityType);
  if(id==='srNo'||lower.includes('sr.')) return index+1;
  if(id==='seatNo'||lower.includes('seat')) return student.examSeatNo || '—';
  if(id==='roll'||lower.includes('roll')) return student.rollNumber || index+1;
  if(id==='gr'||lower.includes('g.r.')) return student.grNumber || '—';
  if(id==='name'||lower.includes('name')) return student.name;
  return '';
}


function SimpleRows({master,...props}:{master:any}&Props) {
  const owned=new Set(props.scope.ownedSections||['subject']);
  return <>
    {props.roster.map((student,index)=>{
      const row=props.rows[student.id]||{studentId:student.id,marks:{},computed:{}};
      const computed={...row.computed,...calculateComputed(props.template,row.marks)};
      return <tr key={student.id} className="border-b border-slate-200 hover:bg-slate-50/40">
        <td className="bg-slate-100 px-2 py-2 text-center font-mono text-[9px] font-bold text-slate-400">{index+5}</td>
        {(master.headers||[]).map((h:any)=>{
          if(isIdentity(h)) return <td key={h.id} className={`border-r border-slate-200 px-2 py-2 text-xs ${/name/i.test(text(h.text))?'min-w-[220px] text-left font-bold text-slate-800':'text-center font-mono text-slate-600'}`} style={{minWidth:h.width,textAlign:h.align==='right'?'right':h.align==='left'?'left':'center'}}>{identityValue(h,student,index)}</td>;
          if(isSignature(h)) return <td key={h.id} className="border-r border-slate-200 px-2 py-2 text-center text-slate-300">________</td>;
          const binding=legacyHeaderBinding(props.template.key,h,props.term);
          const key=binding.markKey||binding.calculatedKey;
          const owner=key?.startsWith('hindi_')?'hindi':key?.startsWith('marathi_')?'marathi':'subject';
          const ownerAllowed=owner==='subject'||owned.has(owner as any);
          const editable=binding.editable&&ownerAllowed&&!props.locked;
          const value=binding.calculatedKey ? (computed[binding.calculatedKey]??row.marks[binding.calculatedKey]??'') : binding.markKey ? (row.marks[binding.markKey]??'') : '';
          const inactive=!binding.activeTerm || binding.annual || !ownerAllowed;
          return <td key={h.id} className={`${h.border||'border-r border-slate-200'} p-1 text-center ${h.font||''} ${inactive?'bg-slate-100/80':''}`} style={{minWidth:h.width,textAlign:h.align==='right'?'right':h.align==='left'?'left':'center'}}>
            {binding.calculatedKey
              ? <div className="px-2 py-2 font-mono text-xs font-black text-emerald-700">{text(value)||'—'}</div>
              : binding.markKey
                ? <input disabled={!editable} value={value} onChange={e=>props.onChange(student.id,binding.markKey!,e.target.value,h.maxMarks,props.template.heads.find(x=>x.key===binding.markKey)?.kind)} placeholder={inactive?'—':'-'} className="h-9 w-full rounded-md border border-transparent border-b-slate-200 bg-transparent px-1 text-center font-mono text-xs font-extrabold focus:border-amber-300 focus:bg-amber-50 focus:outline-none disabled:text-slate-400"/>
                : <div className="px-2 py-2 font-mono text-[10px] text-slate-300">—</div>}
          </td>;
        })}
      </tr>;
    })}
  </>;
}

function Language18Rows({master,...props}:{master:any}&Props) {
  const owned=new Set(props.scope.ownedSections||[]);
  const mergeIds=new Set((master.headers||[]).filter((h:any)=>h.mergeEachStudentBlock).map((h:any)=>h.id));
  const rowsDef:[('hindi'|'marathi'|'total'),string][]=[['hindi','Hindi'],['marathi','Marathi'],['total','Total']];
  return <>
    {props.roster.flatMap((student,index)=>{
      const row=props.rows[student.id]||{studentId:student.id,marks:{},computed:{}};
      const computed={...row.computed,...calculateComputed(props.template,row.marks)};
      const both=owned.has('hindi')&&owned.has('marathi');
      const hTotal=Number(computed.hindi_total||0), mTotal=Number(computed.marathi_total||0);
      const combined=both ? hTotal+mTotal : null;
      return rowsDef.map(([lang,label],subIndex)=><tr key={`${student.id}:${lang}`} className={`border-b border-slate-200 ${lang==='total'?'bg-emerald-50/40':''}`}>
        <td className="bg-slate-100 px-2 py-2 text-center font-mono text-[9px] font-bold text-slate-400">{index*3+5+subIndex}</td>
        {(master.headers||[]).map((h:any)=>{
          const merged=mergeIds.has(h.id);
          if(merged&&subIndex>0)return null;
          if(isIdentity(h)&&h.id!=='languageRow') return <td key={h.id} rowSpan={merged?3:1} className={`border-r border-slate-200 px-2 py-2 text-xs ${/name/i.test(text(h.text))?'min-w-[220px] text-left font-bold text-slate-800':'text-center font-mono text-slate-600'}`} style={{minWidth:h.width,textAlign:h.align==='right'?'right':h.align==='left'?'left':'center'}}>{identityValue(h,student,index)}</td>;
          if(h.id==='languageRow'||h.columnType==='rowLabel') return <td key={h.id} className={`border-r border-slate-200 px-2 py-2 text-center text-[11px] font-black ${lang==='hindi'?'bg-orange-50 text-orange-800':lang==='marathi'?'bg-sky-50 text-sky-800':'bg-emerald-50 text-emerald-900'}`}>{label}</td>;
          if(merged&&(h.id==='h12'||/grand total/i.test(text(h.baseName||h.text)))) return <td key={h.id} rowSpan={3} className="border-r border-slate-200 bg-slate-100 px-2 py-2 text-center font-mono font-black text-slate-900">{combined==null?'—':combined}</td>;
          if(merged&&(h.id==='h13'||/grade/i.test(text(h.baseName||h.text)))) return <td key={h.id} rowSpan={3} className="border-r border-slate-200 bg-slate-100 px-2 py-2 text-center font-black text-slate-900">{combined==null?'—':gradeFor(combined,100)}</td>;
          if(lang==='total') {
            const bh=legacyHeaderBinding(props.template.key,h,props.term,'hindi');
            const bm=legacyHeaderBinding(props.template.key,h,props.term,'marathi');
            const kh=bh.markKey||bh.calculatedKey, km=bm.markKey||bm.calculatedKey;
            const vh=kh?(bh.calculatedKey?(computed[kh]??row.marks[kh]):row.marks[kh]):'';
            const vm=km?(bm.calculatedKey?(computed[km]??row.marks[km]):row.marks[km]):'';
            const nh=Number(vh), nm=Number(vm); const total=both&&Number.isFinite(nh)&&Number.isFinite(nm)?nh+nm:'';
            return <td key={h.id} className="border-r border-slate-200 bg-emerald-50/40 px-2 py-2 text-center font-mono text-xs font-black text-emerald-800">{total===''?'—':total}</td>;
          }
          const binding=legacyHeaderBinding(props.template.key,h,props.term,lang);
          const key=binding.markKey||binding.calculatedKey;
          const ownerAllowed=owned.has(lang);
          const editable=binding.editable&&ownerAllowed&&!props.locked;
          const value=binding.calculatedKey ? (computed[binding.calculatedKey]??row.marks[binding.calculatedKey]??'') : binding.markKey ? (row.marks[binding.markKey]??'') : '';
          return <td key={h.id} className={`${h.border||'border-r border-slate-200'} p-1 text-center ${h.font||''} ${ownerAllowed?'bg-white':'bg-slate-100/80'}`} style={{minWidth:h.width,textAlign:h.align==='right'?'right':h.align==='left'?'left':'center'}}>
            {binding.calculatedKey ? <div className="px-2 py-2 font-mono text-xs font-black text-emerald-700">{text(value)||'—'}</div>
              : binding.markKey ? <input disabled={!editable} value={value} onChange={e=>props.onChange(student.id,binding.markKey!,e.target.value,h.maxMarks,'mark')} placeholder={ownerAllowed?'-':'Other teacher'} className="h-9 w-full rounded-md border border-transparent border-b-slate-200 bg-transparent px-1 text-center font-mono text-xs font-extrabold focus:border-amber-300 focus:bg-amber-50 focus:outline-none disabled:text-slate-400"/>
              : <div className="px-2 py-2 text-slate-300">—</div>}
          </td>;
        })}
      </tr>);
    })}
  </>;
}

export default function ClerkMasterMarkListSheet(props:Props) {
  const master=getRuntimeClerkMasterTemplate(props.template.key,props.scope.subjectName,props.template.legacyMaster);
  if(!master)return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-800">Clerk Master Mark List is not configured for this subject.</div>;
  const headers=master.headers||[];
  const isLanguage18=props.template.key==='class_1_8_hindi_marathi';
  const term=currentTermLabel(props.term);
  const sections=Array.isArray(master.sections)?master.sections:[];
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-cyan-700">Clerk Master Mark List · exact shared template</p><p className="text-xs text-slate-500">{master.name} · {term}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-600">{master.pageSetup?.pageSize||'A4'} · {master.pageSetup?.orientation||'Portrait'}</span></div>
    <div className="max-h-[650px] overflow-auto rounded-lg border border-slate-300">
      <table className="w-full min-w-max border-collapse font-sans text-xs">
        <thead><tr className="bg-slate-100 border-b border-slate-300"><th className="w-10 bg-slate-200"></th>{headers.map((h:any,idx:number)=><th key={h.id} className="min-w-[80px] border-r border-slate-300 py-1 text-center font-mono text-[10px] font-bold text-slate-500" style={{width:h.width}}>{String.fromCharCode(65+idx)}</th>)}</tr></thead>
        <tbody>
          {sections.map((sect:any,rIdx:number)=><tr key={`section:${rIdx}`} className="bg-white border-b border-slate-200"><td className="bg-slate-100 text-slate-500 font-mono text-[9px] text-center border-r border-slate-300 font-bold">{rIdx+1}</td><td colSpan={headers.length} className={`border-r border-slate-200 px-4 text-center ${sect.className||''}`}>{sect.text}</td></tr>)}
          <tr className="bg-slate-50 border-b-2 border-slate-400" style={{height:`${master.rowHeights?.['4']||44}px`}}><td className="bg-slate-100 text-slate-500 font-mono text-[9px] text-center border-r border-slate-300 font-bold">4</td>{headers.map((h:any)=><td key={h.id} className={`relative ${h.border||'border-r border-slate-300'} px-2 py-3 text-slate-800 font-black text-center align-middle bg-slate-100/50 leading-tight ${h.font||''}`} style={{minWidth:h.width,textAlign:h.align==='right'?'right':h.align==='left'?'left':'center'}}>{h.text}{h.formula&&<span className="absolute bottom-0.5 right-1 text-[8px] text-emerald-600 bg-emerald-50 font-mono font-bold rounded px-0.5">fx</span>}</td>)}</tr>
          {isLanguage18?<Language18Rows master={master} {...props}/>:<SimpleRows master={master} {...props}/>} 
          {!props.roster.length&&<tr><td colSpan={headers.length+1} className="p-8 text-center text-sm text-slate-500">No active students were found for this assigned Class / Division.</td></tr>}
        </tbody>
      </table>
    </div>
    <p className="mt-3 text-[10px] text-slate-500">Only the selected term and the Teacher-owned subject/language section is editable. Other-term / other-teacher / annual cells remain locked so the Clerk Master layout stays unchanged.</p>
  </div>;
}
