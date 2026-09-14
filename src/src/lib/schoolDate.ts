export const EDUNIXO_DEFAULT_TIME_ZONE = 'Asia/Kolkata';

function partsFor(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: 'year' | 'month' | 'day') => parts.find(part => part.type === type)?.value || '';
  return { year: get('year'), month: get('month'), day: get('day') };
}

export function dateKeyInTimeZone(date = new Date(), timeZone = EDUNIXO_DEFAULT_TIME_ZONE) {
  const { year, month, day } = partsFor(date, timeZone);
  if (!year || !month || !day) throw new Error('School date could not be resolved.');
  return `${year}-${month}-${day}`;
}

export function schoolTodayKey() {
  return dateKeyInTimeZone(new Date());
}

export function shiftDateKey(dateKey: string, days: number) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey || ''));
  if (!match) throw new Error(`Invalid date key: ${dateKey}`);
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days, 12, 0, 0));
  return date.toISOString().slice(0, 10);
}

export function schoolRelativeDateKey(days: number) {
  return shiftDateKey(schoolTodayKey(), days);
}

export function schoolCurrentMonthKey() {
  return schoolTodayKey().slice(0, 7);
}

export function nextMonthStartKey(monthKey: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(monthKey || ''));
  if (!match) throw new Error(`Invalid month key: ${monthKey}`);
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]), 1, 12, 0, 0));
  return date.toISOString().slice(0, 10);
}

export function dateKeysInclusive(startKey: string, endKey: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startKey) || !/^\d{4}-\d{2}-\d{2}$/.test(endKey) || startKey > endKey) return [] as string[];
  const out: string[] = [];
  for (let current = startKey; current <= endKey; current = shiftDateKey(current, 1)) out.push(current);
  return out;
}
