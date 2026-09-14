import type { HeadmasterRecognitionRow, RecognitionRating, RecognitionScores } from './types';

export const clampStar = (value: unknown) => Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
export const round1 = (value: number) => Math.round(value * 10) / 10;

export function scoreTotal(scores: RecognitionScores) {
  return clampStar(scores.academicPerformance)
    + clampStar(scores.improvement)
    + clampStar(scores.consistency)
    + clampStar(scores.participation)
    + clampStar(scores.homework);
}

export function aggregateRecognitionRatings(ratings: RecognitionRating[]): HeadmasterRecognitionRow[] {
  const grouped = new Map<string, RecognitionRating[]>();
  for (const rating of ratings) {
    const key = [rating.classId, rating.divisionId || '', rating.studentId].join('|');
    const list = grouped.get(key) || [];
    list.push(rating);
    grouped.set(key, list);
  }

  const rows: HeadmasterRecognitionRow[] = [...grouped.values()].map(list => {
    // Every SUBJECT contributes one equal-weight rating. If a subject teacher changes during
    // the same month/year, keep only the latest rating for that subject so staff changes cannot
    // accidentally double-weight one subject in the consolidated ranking.
    const latestBySubject = new Map<string, RecognitionRating>();
    for (const item of list) {
      const current = latestBySubject.get(item.subjectId);
      if (!current || String(item.updatedAt || '') >= String(current.updatedAt || '')) latestBySubject.set(item.subjectId, item);
    }
    const subjectRatings = [...latestBySubject.values()];
    const averagePoints = subjectRatings.length ? subjectRatings.reduce((sum, item) => sum + item.totalPoints, 0) / subjectRatings.length : 0;
    const first = subjectRatings[0] || list[0];
    return {
      studentId: first.studentId,
      studentName: first.studentName,
      grNumber: first.grNumber,
      classId: first.classId,
      className: first.className,
      divisionId: first.divisionId,
      division: first.division,
      averagePoints: round1(averagePoints),
      normalizedScore: round1((averagePoints / 25) * 100),
      ratedSubjects: subjectRatings.length,
      ratings: subjectRatings.sort((a, b) => a.subjectName.localeCompare(b.subjectName)),
    };
  });

  rows.sort((a, b) => b.ratedSubjects - a.ratedSubjects || b.normalizedScore - a.normalizedScore || a.studentName.localeCompare(b.studentName));
  return rows;
}
