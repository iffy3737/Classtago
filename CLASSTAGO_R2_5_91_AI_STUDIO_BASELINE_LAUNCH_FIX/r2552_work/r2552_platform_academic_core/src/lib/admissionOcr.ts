export type AdmissionOcrSuggestions = {
  studentName?: string;
  dateOfBirth?: string;
  gender?: 'Male' | 'Female' | 'Other';
  birthPlace?: string;
  guardianName?: string;
  addressLine?: string;
};

const clean = (value: string) => value.replace(/^[\s:;,.\-–—]+|[\s:;,.\-–—]+$/g, '').replace(/\s{2,}/g, ' ').trim();

function afterLabel(lines: string[], labels: RegExp[]) {
  for (const line of lines) {
    for (const label of labels) {
      const match = line.match(label);
      if (!match) continue;
      const value = clean(match[1] || '');
      if (value.length >= 2) return value;
    }
  }
  return '';
}

function normaliseDate(value: string) {
  const raw = clean(value).replace(/[.]/g, '/');
  let m = raw.match(/\b(\d{1,2})[\-/](\d{1,2})[\-/](\d{4})\b/);
  if (m) {
    const [,d,mo,y] = m;
    const date = new Date(Number(y), Number(mo)-1, Number(d));
    if (date.getFullYear() === Number(y) && date.getMonth() === Number(mo)-1 && date.getDate() === Number(d)) return `${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }
  m = raw.match(/\b(\d{4})[\-/](\d{1,2})[\-/](\d{1,2})\b/);
  if (m) {
    const [,y,mo,d] = m;
    const date = new Date(Number(y), Number(mo)-1, Number(d));
    if (date.getFullYear() === Number(y) && date.getMonth() === Number(mo)-1 && date.getDate() === Number(d)) return `${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }
  return '';
}

export function parseAdmissionOcrText(text: string): AdmissionOcrSuggestions {
  const lines = String(text || '').split(/\r?\n/).map(clean).filter(Boolean);
  const joined = lines.join(' | ');
  const suggestions: AdmissionOcrSuggestions = {};

  const studentName = afterLabel(lines, [
    /(?:name\s+of\s+(?:child|student)|student\s*name|child(?:'s)?\s*name|full\s*name)\s*[:\-]?\s*(.+)$/i,
    /(?:विद्यार्थी(?:चे|चे नाव| का नाम)?|छात्र(?: का नाम)?|बालक(?:ाचे नाव)?|नाव)\s*[:\-]?\s*(.+)$/i,
  ]);
  if (studentName && !/father|mother|guardian|पिता|माता|वडील|आई/i.test(studentName)) suggestions.studentName = studentName;

  const guardianName = afterLabel(lines, [
    /(?:father(?:'s)?\s*name|mother(?:'s)?\s*name|parent(?:'s)?\s*name|guardian(?:'s)?\s*name)\s*[:\-]?\s*(.+)$/i,
    /(?:पिता(?: का नाम)?|माता(?: का नाम)?|अभिभावक|वडिलांचे नाव|आईचे नाव|पालक(?:ाचे नाव)?)\s*[:\-]?\s*(.+)$/i,
  ]);
  if (guardianName) suggestions.guardianName = guardianName;

  const dobLabel = afterLabel(lines, [
    /(?:date\s*of\s*birth|dob|birth\s*date)\s*[:\-]?\s*(.+)$/i,
    /(?:जन्म\s*तिथि|जन्मतिथि|जन्म\s*दिनांक|जन्मदिनांक)\s*[:\-]?\s*(.+)$/i,
  ]);
  const dob = normaliseDate(dobLabel || joined);
  if (dob) suggestions.dateOfBirth = dob;

  const place = afterLabel(lines, [
    /(?:place\s*of\s*birth|birth\s*place)\s*[:\-]?\s*(.+)$/i,
    /(?:जन्म\s*स्थान|जन्मस्थळ|जन्म\s*ठिकाण)\s*[:\-]?\s*(.+)$/i,
  ]);
  if (place) suggestions.birthPlace = place;

  const genderLine = lines.find(line => /\b(?:sex|gender|लिंग)\b/i.test(line)) || joined;
  if (/\b(?:female|girl|स्त्री|महिला|मुलगी)\b/i.test(genderLine)) suggestions.gender = 'Female';
  else if (/\b(?:male|boy|पुरुष|मुलगा)\b/i.test(genderLine)) suggestions.gender = 'Male';

  const address = afterLabel(lines, [
    /(?:residential\s*address|permanent\s*address|address)\s*[:\-]?\s*(.+)$/i,
    /(?:पत्ता|पता|निवासी\s*पता|स्थायी\s*पता)\s*[:\-]?\s*(.+)$/i,
  ]);
  if (address) suggestions.addressLine = address;

  return suggestions;
}
