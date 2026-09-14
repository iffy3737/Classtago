export function isNoDivisionValue(value?: string | null): boolean {
  const normalized = String(value || '').trim().toLowerCase();
  return !normalized || normalized === 'all' || normalized === 'no division' || normalized === 'none' || normalized === 'default';
}

export function divisionScreenLabel(value?: string | null): string {
  return isNoDivisionValue(value) ? 'No Division' : String(value || '').trim();
}

export function divisionPrintSuffix(value?: string | null, separator = ' - '): string {
  return isNoDivisionValue(value) ? '' : `${separator}${String(value || '').trim()}`;
}

export function classDivisionScreenLabel(className?: string | null, division?: string | null, separator = ' · '): string {
  const classLabel = String(className || '').trim();
  return `${classLabel}${separator}${divisionScreenLabel(division)}`.trim();
}
