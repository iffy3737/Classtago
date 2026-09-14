import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Eye, FileText, Printer, RotateCcw, Settings2, X } from 'lucide-react';
import { LocalERPDatabase } from '../lib/supabase';
import {
  DEFAULT_SMART_PRINT_PREFERENCES,
  getSmartPaperDimensions,
  loadSmartPrintPreferences,
  openSmartPrint,
  saveSmartPrintPreferences,
  SMART_PRINT_EVENT,
  SmartPaperSize,
  SmartPrintPreferences,
  SmartPrintRequest
} from '../lib/smartPrint';

const PAPER_OPTIONS: SmartPaperSize[] = ['A3', 'A4', 'A5', 'Letter', 'Legal', 'Folio', 'Custom'];

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char] || char));
}

function collectDocumentStyles(): string {
  return Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(node => node.outerHTML)
    .join('\n');
}

function findPrintableElement(request: SmartPrintRequest): HTMLElement | null {
  if (request.elementId) {
    const byId = document.getElementById(request.elementId);
    if (byId) return byId;
  }
  return document.querySelector<HTMLElement>('[data-smart-print-root="true"]')
    || document.querySelector<HTMLElement>('.printable-area')
    || document.querySelector<HTMLElement>('main')
    || document.getElementById('root');
}


function preparePrintableContent(target: HTMLElement | null): string {
  if (!target) return '<div>Print content is not available.</div>';
  const clone = target.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.screen-only,.no-print,[data-no-print="true"]').forEach(node => node.remove());
  clone.querySelectorAll<HTMLElement>('.print-only').forEach(node => {
    node.classList.remove('print-only');
    node.classList.add('smart-print-visible');
    node.style.display = 'block';
  });
  clone.classList.remove('screen-only','no-print');
  clone.querySelectorAll('details').forEach(node => { if (!node.querySelector('.smart-print-visible')) node.remove(); });

  // R33.12 print hygiene: No Division is a useful screen choice, but it is not
  // part of an official class name. Strip only division-placeholder text from
  // cloned print/PDF content while preserving real divisions such as A/B/C.
  const textWalker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
  let textNode = textWalker.nextNode();
  while (textNode) {
    const original = textNode.nodeValue || '';
    let cleaned = original
      .replace(/\(\s*No Division\s*\)/gi, '')
      .replace(/\s*[·\-/]\s*No Division\b/gi, '')
      .replace(/\bNo Division\s*[·\-/]\s*/gi, '')
      .replace(/^\s*No Division\s*$/gi, '');
    if (cleaned !== original) textNode.nodeValue = cleaned.replace(/\s{2,}/g, ' ');
    textNode = textWalker.nextNode();
  }

  // R33.5: Smart Print clones only the requested card, not its React ancestors.
  // Teacher Academic CSS is intentionally scoped below `.edx-teacher-ai`; without
  // this wrapper the cloned Homework loses pre-wrap, RTL/Nastaliq, metadata-grid
  // and print rules. That collapsed every newline into one flowing paragraph and
  // made Class/Subject/Chapter/Date labels run together in downloaded PDFs.
  const scopeClasses = [
    target.closest('.edx-teacher-ai') ? 'edx-teacher-ai' : '',
  ].filter(Boolean).join(' ');
  return scopeClasses ? `<div class="${scopeClasses}">${clone.outerHTML}</div>` : clone.outerHTML;
}

function buildPrintableHtml(
  request: SmartPrintRequest,
  preferences: SmartPrintPreferences,
  previewMode = false
): string {
  const dimensions = getSmartPaperDimensions(preferences);
  const target = findPrintableElement(request);
  const setup = LocalERPDatabase.getAcademicSetup();
  const profile = setup?.schoolProfile || ({} as any);
  const title = request.title || document.title || 'School Document';
  const schoolName = profile.schoolName || 'National High School, Taloda';
  const schoolLine = [profile.address, profile.villageCity, profile.district, profile.state, profile.pinCode]
    .filter(Boolean)
    .join(', ');
  const yearPlanMode = request.moduleName === 'year-plan';
  const questionPaperMode = request.moduleName === 'question-paper';
  const selfContainedDocumentMode = yearPlanMode || questionPaperMode;
  const yearPlanHeaderEnabled = !yearPlanMode && (preferences.includeSchoolHeader || preferences.includeDocumentTitle);
  const yearPlanFooterEnabled = !yearPlanMode && preferences.includeFooter;
  const scale = preferences.scaleMode === 'custom' ? preferences.scalePercent / 100 : 1;
  const fitCss = preferences.scaleMode === 'fit'
    ? 'max-width:100%;width:100%;'
    : preferences.scaleMode === 'custom'
      ? `transform:scale(${scale});transform-origin:top left;width:${100 / Math.max(scale, 0.1)}%;`
      : 'width:auto;max-width:none;';
  const header = !questionPaperMode && yearPlanHeaderEnabled
    ? `<header class="edunixo-print-header">
        ${preferences.includeSchoolHeader ? `<div class="edunixo-school-name">${escapeHtml(schoolName)}</div><div class="edunixo-school-line">${escapeHtml(schoolLine || profile.schoolCode || '')}</div>` : ''}
        ${preferences.includeDocumentTitle ? `<div class="edunixo-document-title">${escapeHtml(title)}</div>` : ''}
      </header>`
    : '';
  const footer = !questionPaperMode && yearPlanFooterEnabled
    ? `<footer class="edunixo-print-footer"><span>Generated by EDUNIXO ERP · ${new Date().toLocaleString('en-IN')}</span>${preferences.includePageNumbers ? '<span class="edunixo-page-number"></span>' : ''}</footer>`
    : '';
  const content = preparePrintableContent(target);

  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>${collectDocumentStyles()}
  <style>
    :root{--page-width:${dimensions.width}mm;--page-height:${dimensions.height}mm;--page-margin:${preferences.marginMm}mm}
    *{box-sizing:border-box}html,body{margin:0;padding:0;background:${previewMode ? '#e2e8f0' : '#fff'};color:#0f172a;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    body{font-family:var(--edunixo-interface-font,Inter,Arial,sans-serif)}
    .edunixo-preview-shell{width:var(--page-width);min-height:${previewMode ? 'var(--page-height)' : '0'};margin:${previewMode ? '14px auto' : '0 auto'};background:#fff;box-shadow:${previewMode ? '0 18px 60px rgba(15,23,42,.24)' : 'none'};padding:var(--page-margin);position:relative;overflow:${previewMode ? 'hidden' : 'visible'}}
    .edunixo-print-header{text-align:center;border-bottom:2px solid #0f172a;padding-bottom:7mm;margin-bottom:7mm;break-inside:avoid}
    .edunixo-school-name{font-size:17pt;font-weight:900;text-transform:uppercase;letter-spacing:.04em}.edunixo-school-line{margin-top:2mm;font-size:8.5pt;color:#475569}.edunixo-document-title{margin-top:4mm;font-size:12pt;font-weight:800;text-transform:uppercase;letter-spacing:.06em}
    .edunixo-print-content{${fitCss}}
    .edunixo-print-content .no-print,.edunixo-print-content .screen-only,.edunixo-print-content [data-no-print="true"]{display:none!important}
    .edunixo-print-content .smart-print-visible{display:block!important}
    .edunixo-print-content table{border-collapse:collapse;max-width:100%}.edunixo-print-content thead{display:table-header-group}.edunixo-print-content tfoot{display:table-footer-group}.edunixo-print-content tr,.edunixo-print-content img,.edunixo-print-content .avoid-print-break{break-inside:avoid;page-break-inside:avoid}
    .edunixo-print-content [class*="fixed"],.edunixo-print-content [class*="sticky"]{position:static!important}.edunixo-print-content [class*="overflow-"]{overflow:visible!important;max-height:none!important}
    .edunixo-print-content .smart-print-source{display:block!important;position:static!important;left:auto!important;top:auto!important;visibility:visible!important;opacity:1!important}
    /* R33.5 Homework print safety: these rules are deliberately unscoped so the
       PDF remains structured even if a module wrapper is changed in the future. */
    .edunixo-print-content .homework-print-document{display:block!important;width:100%;overflow:visible!important}
    .edunixo-print-content .homework-print-title{margin:0 0 5mm;text-align:center;font-size:16pt;font-weight:900;letter-spacing:.04em}
    .edunixo-print-content .homework-print-meta{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));gap:2.5mm 8mm;margin:0 0 6mm;padding:3.5mm 4mm;border:1px solid #cbd5e1;border-radius:2mm;font-size:9.5pt;line-height:1.45;direction:ltr;text-align:left;break-inside:avoid;page-break-inside:avoid}
    .edunixo-print-content .homework-print-meta span{display:block;min-width:0;overflow-wrap:anywhere}
    .edunixo-print-content .homework-print-meta span:nth-child(3){grid-column:1/-1}
    .edunixo-print-content .generated-print-content{display:block!important;width:100%;height:auto!important;max-height:none!important;overflow:visible!important;white-space:pre-wrap!important;unicode-bidi:plaintext;overflow-wrap:break-word;word-break:normal}
    .edunixo-print-content .generated-print-content[dir="rtl"]{direction:rtl;text-align:right}
    .edunixo-print-content .generated-print-content[dir="ltr"]{direction:ltr;text-align:left}
    .edunixo-print-content .homework-print-line{display:block;white-space:pre-wrap;min-height:1em;margin:0 0 1.4mm;break-inside:avoid;page-break-inside:avoid}
    .edunixo-print-content .homework-print-line.is-blank{min-height:2.6mm;margin:0}
    ${yearPlanMode ? `
    /* R33.8 Year Plan PDF parity: html2canvas renders screen media, so the old
       @media print override never removed the 1900px screen min-width. These
       unscoped rules force the full June-April table inside real A3 landscape. */
    .edunixo-preview-shell{padding:5mm!important;overflow:visible!important}
    .edunixo-print-content{width:100%!important;max-width:none!important;transform:none!important}
    .edunixo-print-content .year-plan-print-root{width:100%!important;max-width:100%!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;box-shadow:none!important;overflow:visible!important}
    .edunixo-print-content .year-plan-document-head{margin:0 0 3mm!important;padding:0 0 2.5mm!important}
    .edunixo-print-content .year-plan-school{font-size:11pt!important}
    .edunixo-print-content .year-plan-main-title{font-size:13pt!important;gap:6mm!important;margin-top:1mm!important}
    .edunixo-print-content .year-plan-meta{font-size:7.4pt!important;gap:1mm 5mm!important;margin-top:2mm!important}
    .edunixo-print-content .year-plan-table-scroll{width:100%!important;max-width:100%!important;overflow:visible!important;border:0!important;border-radius:0!important}
    .edunixo-print-content .year-plan-table-scroll .year-plan-table,.edunixo-print-content .year-plan-table{width:100%!important;min-width:0!important;max-width:100%!important;table-layout:fixed!important;font-size:7pt!important;line-height:1.22!important}
    .edunixo-print-content .year-plan-table th,.edunixo-print-content .year-plan-table td{min-width:0!important;max-width:none!important;padding:0!important;overflow:hidden!important;vertical-align:top!important}
    .edunixo-print-content .year-plan-table thead th{font-size:7.2pt!important;padding:1.2mm .45mm!important;white-space:normal!important}
    .edunixo-print-content .year-plan-table .year-plan-subject-head{width:24mm!important;min-width:24mm!important}
    .edunixo-print-content .year-plan-subject-cell{width:24mm!important;padding:1.2mm .6mm!important;font-size:7.1pt!important;vertical-align:middle!important}
    .edunixo-print-content .year-plan-cell-print{min-height:0!important;padding:1.1mm .65mm!important;font-size:7pt!important;line-height:1.24!important;white-space:pre-wrap!important;overflow-wrap:break-word!important;word-break:normal!important;unicode-bidi:plaintext!important}
    .edunixo-print-content .year-plan-signatures{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:20mm!important;margin-top:5mm!important;font-size:7pt!important;text-align:center!important}
    ` : ''}
    ${questionPaperMode ? `
    /* R33.10 Question Paper: this is a student write-on paper. Preserve answer
       spaces and let the document grow across A4 pages instead of scaling them away. */
    .edunixo-preview-shell{padding:10mm!important;overflow:visible!important}
    .edunixo-print-content{width:100%!important;max-width:none!important;transform:none!important}
    .edunixo-print-content .paper-sheet{width:100%!important;max-width:none!important;margin:0!important;padding:0!important;border:0!important;box-shadow:none!important}
    .edunixo-print-content .qp-model-answer-offscreen{position:static!important;left:auto!important;top:auto!important;width:100%!important;max-width:none!important;z-index:auto!important;pointer-events:auto!important}
    .edunixo-print-content .qp-model-answer-title{margin:2mm 0 4mm!important;text-align:center!important;font-size:14pt!important;font-weight:900!important}
    .edunixo-print-content .qp-model-answer-response{margin-top:1.5mm!important;padding:1.5mm 2mm!important;background:#fff!important;border-left:.7mm solid #64748b!important;white-space:pre-wrap!important;break-inside:avoid!important;page-break-inside:avoid!important}
    .edunixo-print-content .qp-model-answer-item,.edunixo-print-content .qp-model-answer-match-wrap{break-inside:avoid!important;page-break-inside:avoid!important}
    .edunixo-print-content .school-header{border-bottom:0!important;padding-bottom:1mm!important;margin-bottom:1.5mm!important}
    .edunixo-print-content .school-header h1{margin:0!important}
    .edunixo-print-content .school-header p{margin:1mm 0 0!important}
    .edunixo-print-content .paper-meta{border-bottom:2px solid #172033!important;padding:2mm 0 2.5mm!important;margin-bottom:2mm!important}
    .edunixo-print-content .question-row{break-inside:avoid!important;page-break-inside:avoid!important;margin:5mm 0!important}
    .edunixo-print-content .question-row-rtl{grid-template-columns:50px 1fr 44px!important}
    .edunixo-print-content .question-row-rtl .qno{grid-column:3!important;grid-row:1!important;text-align:right!important;direction:ltr!important}
    .edunixo-print-content .question-row-rtl .qbody{grid-column:2!important;grid-row:1!important}
    .edunixo-print-content .question-row-rtl .marks{grid-column:1!important;grid-row:1!important;text-align:left!important;direction:ltr!important}
    /* R33.13: pattern rows are main numbered sections; generated items are
       sub-questions under that heading instead of becoming Q1/Q2/Q3 themselves. */
    .edunixo-print-content .qp-sections{display:flex!important;flex-direction:column!important;gap:4mm!important}
    .edunixo-print-content .qp-section{margin:0 0 5mm!important;break-inside:auto!important;page-break-inside:auto!important}
    .edunixo-print-content .qp-section-head{margin:0 0 2mm!important;padding:0!important;break-after:avoid!important;page-break-after:avoid!important}
    .edunixo-print-content .qp-section-title{font-size:11.5pt!important;line-height:1.55!important}
    .edunixo-print-content .qp-section-marks{font-size:10.5pt!important}
    .edunixo-print-content .qp-section-items{display:flex!important;flex-direction:column!important;gap:3.2mm!important}
    .edunixo-print-content .qp-subquestion-row{break-inside:avoid!important;page-break-inside:avoid!important}
    .edunixo-print-content .qp-subno{font-size:10.5pt!important}
    .edunixo-print-content .qp-section-match-wrap{break-inside:avoid!important;page-break-inside:avoid!important}
    .edunixo-print-content .qp-answer-area,.edunixo-print-content .qp-match-table{break-inside:avoid!important;page-break-inside:avoid!important}
    .edunixo-print-content .qp-answer-line{height:7.2mm!important;border-bottom:1px solid #9ca3af!important}
    .edunixo-print-content .qp-working-box.small{min-height:32mm!important}.edunixo-print-content .qp-working-box.medium{min-height:48mm!important}.edunixo-print-content .qp-working-box.large{min-height:66mm!important}
    .edunixo-print-content .qp-diagram-box.medium{min-height:55mm!important}.edunixo-print-content .qp-diagram-box.large{min-height:78mm!important}
    ` : ''}
    .edunixo-print-footer{position:static!important;clear:both;display:flex;justify-content:space-between;gap:8mm;border-top:1px solid #cbd5e1;margin-top:8mm;padding-top:3mm;font-size:7.5pt;color:#64748b;break-inside:avoid;page-break-inside:avoid}
    .edunixo-page-number:after{content:"Page " counter(page)}
    @page{size:${dimensions.width}mm ${dimensions.height}mm;margin:0}
    @media print{html,body{background:#fff}.edunixo-preview-shell{width:var(--page-width);min-height:0;margin:0;box-shadow:none}.no-print,.screen-only{display:none!important}.smart-print-visible{display:block!important}}
  </style></head><body><div class="edunixo-preview-shell">${header}<section class="edunixo-print-content">${content}</section>${footer}</div></body></html>`;
}

export default function SmartPrintCenter() {
  const [request, setRequest] = useState<SmartPrintRequest | null>(null);
  const [preferences, setPreferences] = useState<SmartPrintPreferences>(() => loadSmartPrintPreferences());
  const [busy, setBusy] = useState(false);
  const previewRef = useRef<HTMLIFrameElement | null>(null);
  const nativePrintRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const handleRequest = (event: Event) => {
      const detail = (event as CustomEvent<SmartPrintRequest>).detail || {};
      setRequest(detail);
      setPreferences(previous => ({
        ...previous,
        orientation: detail.orientation || previous.orientation,
        paperSize: detail.paperSize || previous.paperSize
      }));
    };
    window.addEventListener(SMART_PRINT_EVENT, handleRequest as EventListener);

    const nativePrint = window.print.bind(window);
    nativePrintRef.current = nativePrint;
    (window as any).__edunixoNativePrint = nativePrint;
    window.print = () => openSmartPrint({ title: document.title || 'School Document' });

    return () => {
      window.removeEventListener(SMART_PRINT_EVENT, handleRequest as EventListener);
      window.print = nativePrint;
      if ((window as any).__edunixoNativePrint === nativePrint) delete (window as any).__edunixoNativePrint;
    };
  }, []);

  useEffect(() => {
    saveSmartPrintPreferences(preferences);
  }, [preferences]);

  const previewHtml = useMemo(
    () => request ? buildPrintableHtml(request, preferences, true) : '',
    [request, preferences]
  );

  const dimensions = getSmartPaperDimensions(preferences);

  const runNativePrint = () => {
    if (!request) return;
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.position = 'fixed';
    frame.style.right = '0';
    frame.style.bottom = '0';
    frame.style.width = '1px';
    frame.style.height = '1px';
    frame.style.border = '0';
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(buildPrintableHtml(request, preferences, false));
    doc.close();
    const doPrint = () => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      window.setTimeout(() => frame.remove(), 1800);
    };
    const images = Array.from(doc.images);
    if (!images.length || images.every(image => image.complete)) window.setTimeout(doPrint, 350);
    else {
      let pending = images.length;
      const done = () => { pending -= 1; if (pending <= 0) window.setTimeout(doPrint, 250); };
      images.forEach(image => {
        image.addEventListener('load', done, { once: true });
        image.addEventListener('error', done, { once: true });
      });
      window.setTimeout(doPrint, 2800);
    }
  };

  const downloadPdf = async () => {
    if (!request || busy) return;
    setBusy(true);
    let frame: HTMLIFrameElement | null = null;
    try {
      // R33.5: render a real standalone document in an off-screen iframe. The old
      // implementation assigned an entire <html><head><body> document to a DIV's
      // innerHTML, which is invalid document structure and caused html2canvas to
      // lose scoped print CSS / mis-measure long RTL Homework.
      frame = document.createElement('iframe');
      frame.setAttribute('aria-hidden', 'true');
      frame.style.position = 'fixed';
      frame.style.left = '-100000px';
      frame.style.top = '0';
      frame.style.width = `${dimensions.width}mm`;
      frame.style.height = `${dimensions.height}mm`;
      frame.style.border = '0';
      frame.style.background = '#fff';
      document.body.appendChild(frame);
      const doc = frame.contentDocument;
      if (!doc) throw new Error('Printable document could not be prepared.');
      doc.open();
      doc.write(buildPrintableHtml(request, preferences, false));
      doc.close();

      if (doc.fonts?.ready) {
        try { await doc.fonts.ready; } catch {}
      }
      const images = Array.from(doc.images);
      if (images.some(image => !image.complete)) {
        await Promise.race([
          Promise.all(images.map(image => image.complete ? Promise.resolve() : new Promise<void>(resolve => {
            image.addEventListener('load', () => resolve(), { once: true });
            image.addEventListener('error', () => resolve(), { once: true });
          }))),
          new Promise(resolve => window.setTimeout(resolve, 2400)),
        ]);
      }
      await new Promise(resolve => window.setTimeout(resolve, 180));
      const printable = doc.querySelector('.edunixo-preview-shell') as HTMLElement | null;
      if (!printable) throw new Error('Printable document could not be prepared.');

      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf().set({
        margin: 0,
        filename: `${(request.title || 'School_Document').replace(/[^a-z0-9_-]+/gi, '_')}_${preferences.paperSize}_${preferences.orientation}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2.2, useCORS: true, logging: false, backgroundColor: '#ffffff', windowWidth: Math.max(794, printable.scrollWidth) },
        jsPDF: { unit: 'mm', format: [dimensions.width, dimensions.height], orientation: preferences.orientation },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.avoid-print-break', '.homework-print-meta', '.homework-print-line', '.question-row', '.qp-answer-area', '.qp-match-table', '.qp-section-head', '.qp-subquestion-row', '.qp-section-match-wrap'] }
      }).from(printable).save();
    } catch (error) {
      console.error(error);
      window.alert('PDF could not be generated. Please use Print and choose Save as PDF in the printer dialog.');
    } finally {
      frame?.remove();
      setBusy(false);
    }
  };

  if (!request) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-md no-print">
      <div className="flex h-[95vh] w-full max-w-[96rem] flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-cyan-500 to-indigo-600 text-white"><Printer className="h-5 w-5" /></div>
            <div><p className="text-[10px] font-black uppercase tracking-[.22em] text-cyan-700">Website-wide Smart Print Setup</p><h2 className="text-lg font-black text-slate-900">{request.title || 'School Document'}</h2></div>
          </div>
          <button onClick={() => setRequest(null)} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50"><X className="h-5 w-5" /></button>
        </div>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="overflow-y-auto border-r border-slate-200 bg-white p-5">
            <div className="space-y-5">
              <section>
                <label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-slate-500">Paper size</label>
                <div className="grid grid-cols-2 gap-2">{PAPER_OPTIONS.map(size => <button key={size} onClick={() => setPreferences(p => ({ ...p, paperSize: size }))} className={`rounded-xl border px-3 py-2 text-xs font-black ${preferences.paperSize === size ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600'}`}>{size}</button>)}</div>
              </section>

              {preferences.paperSize === 'Custom' && <section className="grid grid-cols-2 gap-3"><label className="text-xs font-bold text-slate-600">Width (mm)<input type="number" min="50" max="1000" value={preferences.customWidthMm} onChange={e => setPreferences(p => ({ ...p, customWidthMm: Number(e.target.value) }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" /></label><label className="text-xs font-bold text-slate-600">Height (mm)<input type="number" min="50" max="1000" value={preferences.customHeightMm} onChange={e => setPreferences(p => ({ ...p, customHeightMm: Number(e.target.value) }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" /></label></section>}

              <section><label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-slate-500">Orientation</label><div className="grid grid-cols-2 gap-2"><button onClick={() => setPreferences(p => ({ ...p, orientation: 'portrait' }))} className={`rounded-xl border px-3 py-2 text-xs font-black ${preferences.orientation === 'portrait' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200'}`}>Portrait</button><button onClick={() => setPreferences(p => ({ ...p, orientation: 'landscape' }))} className={`rounded-xl border px-3 py-2 text-xs font-black ${preferences.orientation === 'landscape' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200'}`}>Landscape</button></div></section>

              <section><label className="mb-1 flex items-center justify-between text-xs font-bold text-slate-600"><span>Margins</span><span>{preferences.marginMm} mm</span></label><input type="range" min="0" max="30" step="1" value={preferences.marginMm} onChange={e => setPreferences(p => ({ ...p, marginMm: Number(e.target.value) }))} className="w-full" /></section>

              <section><label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-slate-500">Scaling</label><select value={preferences.scaleMode} onChange={e => setPreferences(p => ({ ...p, scaleMode: e.target.value as SmartPrintPreferences['scaleMode'] }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold"><option value="fit">Fit to page</option><option value="actual">Actual size</option><option value="custom">Custom scale</option></select>{preferences.scaleMode === 'custom' && <div className="mt-3"><label className="flex justify-between text-xs font-bold text-slate-600"><span>Scale</span><span>{preferences.scalePercent}%</span></label><input type="range" min="50" max="150" value={preferences.scalePercent} onChange={e => setPreferences(p => ({ ...p, scalePercent: Number(e.target.value) }))} className="w-full" /></div>}</section>

              <section className="space-y-2"><p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Header & footer</p>{[
                ['includeSchoolHeader','School details'],['includeDocumentTitle','Document title'],['includeFooter','Footer'],['includePageNumbers','Page numbers']
              ].map(([key,label]) => <label key={key} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"><span>{label}</span><input type="checkbox" checked={Boolean(preferences[key as keyof SmartPrintPreferences])} onChange={e => setPreferences(p => ({ ...p, [key]: e.target.checked }))} /></label>)}</section>

              <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-xs leading-5 text-cyan-900"><strong>{dimensions.width.toFixed(1)} × {dimensions.height.toFixed(1)} mm</strong><br />Generated PDF and print layout use the selected paper dimensions. In the printer dialog, select the same physical paper size.</div>

              <button onClick={() => setPreferences(DEFAULT_SMART_PRINT_PREFERENCES)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-600 hover:bg-slate-50"><RotateCcw className="h-4 w-4" />Reset defaults</button>
            </div>
          </aside>

          <section className="flex min-h-0 flex-col bg-slate-200/70">
            <div className="flex items-center justify-between border-b border-slate-300 bg-slate-50 px-4 py-3"><div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-600"><Eye className="h-4 w-4" />Live print preview</div><div className="text-xs font-bold text-slate-500">Tables repeat headings and avoid row cuts automatically</div></div>
            <div className="min-h-0 flex-1 overflow-auto p-4"><iframe ref={previewRef} title="Smart print preview" srcDoc={previewHtml} className="h-full min-h-[640px] w-full rounded-xl border border-slate-300 bg-white shadow-inner" /></div>
            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-300 bg-white px-5 py-4"><button onClick={() => setRequest(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-black text-slate-600">Cancel</button><button onClick={downloadPdf} disabled={busy} className="flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-black text-white disabled:opacity-50"><Download className="h-4 w-4" />{busy ? 'Generating PDF…' : 'Download PDF'}</button><button onClick={runNativePrint} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-black text-white"><Printer className="h-4 w-4" />Print</button></div>
          </section>
        </div>
      </div>
    </div>
  );
}
