import { getRoleModuleCatalogue } from './roleModuleBlueprint';
import type { UserRole } from '../types';

export type SmartSearchResult = {
  moduleId: string;
  featureId?: string;
  label: string;
  parentLabel?: string;
  description: string;
  tab: string;
  score: number;
};

const aliases: Record<string,string[]> = {
  attendance: ['present absent roll call hajri hazri daily attendance attendance catalogue'],
  result: ['mark marks marklist marksheet result book progress card report card grade'],
  admission: ['admission application enrol enrollment student entry दाखिला प्रवेश'],
  timetable: ['period lecture schedule workload substitute adjustment'],
  homework: ['home work assignment classwork'],
  leave: ['leave chutti holiday application absence'],
  communication: ['notice message announcement parent communication'],
  profile: ['profile phone photo personal details'],
  password: ['password security login credential'],
  website: ['website banner gallery campaign public site'],
  fee: ['fee receipt concession payment'],
  library: ['book library issue return'],
  inventory: ['asset stock inventory'],
  certificate: ['certificate lc leaving bonafide document'],
};

const normalize = (value: string) => String(value || '').toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu,' ').trim();

function expanded(value: string) {
  const base = normalize(value);
  const extra: string[] = [];
  for (const [key,words] of Object.entries(aliases)) {
    if (base.includes(key) || words.some(word => base.includes(normalize(word)))) extra.push(key, ...words);
  }
  return normalize([base,...extra].join(' '));
}

function scoreText(query: string, haystack: string) {
  const q = expanded(query);
  const h = expanded(haystack);
  if (!q || !h) return 0;
  if (h === q) return 100;
  if (h.startsWith(q)) return 85;
  if (h.includes(q)) return 70;
  const tokens = q.split(/\s+/).filter(Boolean);
  if (!tokens.length) return 0;
  let hit = 0;
  for (const token of tokens) if (h.includes(token)) hit += 1;
  return Math.round((hit / tokens.length) * 60);
}

export function searchRoleTools(role: string, query: string, limit = 8): SmartSearchResult[] {
  const catalogue = getRoleModuleCatalogue(role as UserRole, role === 'class_teacher');
  const rows: SmartSearchResult[] = [];
  for (const category of catalogue) {
    for (const module of category.modules) {
      const moduleScore = scoreText(query, `${module.label} ${module.description || ''} ${category.label} ${module.id}`);
      if (moduleScore >= 20) rows.push({ moduleId:module.id,label:module.label,description:module.description || category.label,tab:module.tab,score:moduleScore });
      for (const feature of module.features || []) {
        const featureScore = scoreText(query, `${feature.label} ${module.description || ''} ${module.label} ${category.label} ${feature.id}`);
        if (featureScore >= 20) rows.push({ moduleId:module.id,featureId:feature.id,label:feature.label,parentLabel:module.label,description:module.description || category.label,tab:feature.targetTab || module.tab,score:featureScore + 3 });
      }
    }
  }
  return rows.sort((a,b)=>b.score-a.score || a.label.localeCompare(b.label)).slice(0,limit);
}
