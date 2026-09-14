import * as XLSX from 'xlsx';

function safeFileName(value: string): string {
  return (value || 'Classtago_Document')
    .trim()
    .replace(/[^a-z0-9\-_]+/gi, '_')
    .replace(/^_+|_+$/g, '') || 'Classtago_Document';
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadTextFile(content: string, filename: string, mime = 'text/plain;charset=utf-8'): void {
  downloadBlob(new Blob([content], { type: mime }), filename);
}

function uniqueSheetName(base: string, used: Set<string>): string {
  const clean = (base || 'Sheet').replace(/[\\/?*\[\]:]/g, ' ').trim().slice(0, 31) || 'Sheet';
  let name = clean;
  let counter = 2;
  while (used.has(name)) {
    const suffix = ` ${counter++}`;
    name = `${clean.slice(0, Math.max(1, 31 - suffix.length))}${suffix}`;
  }
  used.add(name);
  return name;
}

/**
 * Export the visible report/document area to a real XLSX workbook.
 * Every HTML table becomes its own worksheet. If the area contains no table,
 * its non-empty text lines are exported to a single worksheet instead of
 * pretending that an Excel file was created.
 */
export function exportElementToExcel(options: { elementId?: string; title?: string; filename?: string } = {}): void {
  const target = options.elementId
    ? document.getElementById(options.elementId)
    : document.querySelector<HTMLElement>('[data-smart-print-root="true"]')
      || document.querySelector<HTMLElement>('.printable-area')
      || document.getElementById('print-area')
      || document.querySelector<HTMLElement>('main');

  if (!target) {
    window.alert('Export content is not ready. Please open or generate the report first.');
    return;
  }

  const workbook = XLSX.utils.book_new();
  const usedNames = new Set<string>();
  const tables: HTMLTableElement[] = [];
  if (target instanceof HTMLTableElement) tables.push(target);
  tables.push(...Array.from(target.querySelectorAll('table')) as HTMLTableElement[]);

  if (tables.length) {
    tables.forEach((table, index) => {
      const heading = table.getAttribute('aria-label')
        || table.getAttribute('data-export-name')
        || table.querySelector('caption')?.textContent
        || `${options.title || 'Report'} ${index + 1}`;
      const sheet = XLSX.utils.table_to_sheet(table, { raw: true });
      XLSX.utils.book_append_sheet(workbook, sheet, uniqueSheetName(heading, usedNames));
    });
  } else {
    const lines = (target.innerText || target.textContent || '')
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => [line]);
    if (!lines.length) {
      window.alert('There is no visible data to export.');
      return;
    }
    const sheet = XLSX.utils.aoa_to_sheet(lines);
    XLSX.utils.book_append_sheet(workbook, sheet, uniqueSheetName(options.title || 'Report', usedNames));
  }

  const file = `${safeFileName(options.filename || options.title || 'Classtago_Report')}.xlsx`;
  XLSX.writeFile(workbook, file, { compression: true });
}

export function downloadCircularDocument(options: {
  title: string;
  date?: string;
  category?: string;
  publishedBy?: string;
  body: string;
  secondaryTitle?: string;
  secondaryBody?: string;
  filename?: string;
}): void {
  const escape = (value: string) => value.replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch] || ch));
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escape(options.title)}</title>
<style>body{font-family:Arial,sans-serif;max-width:820px;margin:40px auto;color:#0f172a;line-height:1.65}h1{font-size:24px;margin-bottom:4px}.meta{color:#64748b;font-size:12px;border-bottom:1px solid #cbd5e1;padding-bottom:12px;margin-bottom:20px}.secondary{margin-top:24px;padding-top:18px;border-top:1px dashed #cbd5e1}.secondary[dir=rtl]{font-family:"Noto Nastaliq Urdu","Noto Sans Arabic",serif;text-align:right}</style></head><body>
<h1>${escape(options.title)}</h1><div class="meta">${escape(options.category || 'School Circular')} · ${escape(options.date || '')}${options.publishedBy ? ` · Published by ${escape(options.publishedBy)}` : ''}</div>
<div>${escape(options.body).replace(/\n/g, '<br>')}</div>
${options.secondaryTitle || options.secondaryBody ? `<div class="secondary" dir="rtl"><h2>${escape(options.secondaryTitle || '')}</h2><div>${escape(options.secondaryBody || '').replace(/\n/g, '<br>')}</div></div>` : ''}
</body></html>`;
  downloadTextFile(html, `${safeFileName(options.filename || options.title)}.doc`, 'application/msword;charset=utf-8');
}
