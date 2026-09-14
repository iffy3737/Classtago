import type { PrintSettings } from '../types/domain';

export function applyPrintSettings(settings: PrintSettings, targetId?: string) {
  document.getElementById('edunixo-print-settings')?.remove();
  document.body.classList.remove('edunixo-printing');
  document.querySelectorAll('.edunixo-print-target').forEach((el) => el.classList.remove('edunixo-print-target'));

  const style = document.createElement('style');
  style.id = 'edunixo-print-settings';
  let sizeRule: string;
  if (settings.paper === 'Custom') {
    const width = settings.customWidthMm ?? 210;
    const height = settings.customHeightMm ?? 297;
    const [w, h] = settings.orientation === 'landscape' ? [height, width] : [width, height];
    sizeRule = `${w}mm ${h}mm`;
  } else {
    sizeRule = `${settings.paper} ${settings.orientation}`;
  }
  const pageNumberRule = settings.showPageNumbers
    ? '@bottom-center { content: "Page " counter(page) " of " counter(pages); font-size: 9pt; color: #475569; }'
    : '';
  const headerRule = settings.showSchoolHeader ? '' : '.school-header { display: none !important; }';

  style.textContent = `
    @page { size: ${sizeRule}; margin: ${settings.marginMm}mm; ${pageNumberRule} }
    @media print {
      ${headerRule}
      .print-root { transform-origin: top left; zoom: ${settings.scalePercent / 100}; }
      .screen-only { display: none !important; }
      .print-page { break-inside: avoid; page-break-inside: avoid; }
      body { background: #fff !important; }
      body.edunixo-printing * { visibility: hidden !important; }
      body.edunixo-printing .edunixo-print-target,
      body.edunixo-printing .edunixo-print-target * { visibility: visible !important; }
      body.edunixo-printing .edunixo-print-target { position: absolute !important; left: 0; top: 0; width: 100%; }
    }
  `;
  document.head.appendChild(style);

  if (targetId) {
    const target = document.getElementById(targetId);
    if (!target) throw new Error(`Print target not found: ${targetId}`);
    document.body.classList.add('edunixo-printing');
    target.classList.add('edunixo-print-target');
  }
}

export function clearPrintTarget() {
  document.body.classList.remove('edunixo-printing');
  document.querySelectorAll('.edunixo-print-target').forEach((el) => el.classList.remove('edunixo-print-target'));
}
