export const teachingAcademicSubmenus = [
  { id: 'study-material', label: 'Study Material' },
  { id: 'year-plan', label: 'AI Year Plan' },
  { id: 'daily-plan', label: 'AI Daily Teaching Plan' },
  { id: 'lesson-plan', label: 'AI Lesson Plan' },
  { id: 'homework', label: 'AI Homework' },
  { id: 'teaching-diary', label: 'AI Teaching Diary' },
  { id: 'classwork', label: 'AI Classwork & Assignments' },
] as const;

export type TeachingAcademicSubmenuId = (typeof teachingAcademicSubmenus)[number]['id'];
