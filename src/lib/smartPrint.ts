export type SmartPaperSize = 'A3' | 'A4' | 'A5' | 'Letter' | 'Legal' | 'Folio' | 'Custom';
export type SmartPrintOrientation = 'portrait' | 'landscape';
export type SmartPrintScaleMode = 'fit' | 'actual' | 'custom';

export interface SmartPrintRequest {
  title?: string;
  elementId?: string;
  orientation?: SmartPrintOrientation;
  paperSize?: SmartPaperSize;
  moduleName?: string;
}

export interface SmartPrintPreferences {
  paperSize: SmartPaperSize;
  orientation: SmartPrintOrientation;
  marginMm: number;
  scaleMode: SmartPrintScaleMode;
  scalePercent: number;
  includeSchoolHeader: boolean;
  includeDocumentTitle: boolean;
  includeFooter: boolean;
  includePageNumbers: boolean;
  customWidthMm: number;
  customHeightMm: number;
}

export const SMART_PRINT_EVENT = 'edunixo:smart-print';
export const SMART_PRINT_STORAGE_KEY = 'edunixo.smart_print.preferences.v1';

export const DEFAULT_SMART_PRINT_PREFERENCES: SmartPrintPreferences = {
  paperSize: 'A4',
  orientation: 'portrait',
  marginMm: 12,
  scaleMode: 'fit',
  scalePercent: 100,
  includeSchoolHeader: true,
  includeDocumentTitle: true,
  includeFooter: true,
  includePageNumbers: true,
  customWidthMm: 210,
  customHeightMm: 297
};

export const PAPER_DIMENSIONS_MM: Record<Exclude<SmartPaperSize, 'Custom'>, { width: number; height: number }> = {
  A3: { width: 297, height: 420 },
  A4: { width: 210, height: 297 },
  A5: { width: 148, height: 210 },
  Letter: { width: 215.9, height: 279.4 },
  Legal: { width: 215.9, height: 355.6 },
  Folio: { width: 210, height: 330 }
};

export function getSmartPaperDimensions(preferences: SmartPrintPreferences): { width: number; height: number } {
  const base = preferences.paperSize === 'Custom'
    ? { width: Math.max(50, preferences.customWidthMm), height: Math.max(50, preferences.customHeightMm) }
    : PAPER_DIMENSIONS_MM[preferences.paperSize];
  return preferences.orientation === 'landscape'
    ? { width: base.height, height: base.width }
    : base;
}

export function loadSmartPrintPreferences(): SmartPrintPreferences {
  if (typeof window === 'undefined') return DEFAULT_SMART_PRINT_PREFERENCES;
  try {
    const stored = JSON.parse(localStorage.getItem(SMART_PRINT_STORAGE_KEY) || '{}');
    return {
      ...DEFAULT_SMART_PRINT_PREFERENCES,
      ...stored,
      marginMm: Number.isFinite(Number(stored.marginMm)) ? Number(stored.marginMm) : DEFAULT_SMART_PRINT_PREFERENCES.marginMm,
      scalePercent: Number.isFinite(Number(stored.scalePercent)) ? Number(stored.scalePercent) : DEFAULT_SMART_PRINT_PREFERENCES.scalePercent,
      customWidthMm: Number.isFinite(Number(stored.customWidthMm)) ? Number(stored.customWidthMm) : DEFAULT_SMART_PRINT_PREFERENCES.customWidthMm,
      customHeightMm: Number.isFinite(Number(stored.customHeightMm)) ? Number(stored.customHeightMm) : DEFAULT_SMART_PRINT_PREFERENCES.customHeightMm
    };
  } catch {
    return DEFAULT_SMART_PRINT_PREFERENCES;
  }
}

export function saveSmartPrintPreferences(preferences: SmartPrintPreferences): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SMART_PRINT_STORAGE_KEY, JSON.stringify(preferences));
}

export function openSmartPrint(request: SmartPrintRequest = {}): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<SmartPrintRequest>(SMART_PRINT_EVENT, { detail: request }));
}

export function runNativeBrowserPrint(): void {
  if (typeof window === 'undefined') return;
  const nativePrint = (window as any).__edunixoNativePrint as (() => void) | undefined;
  if (nativePrint) nativePrint();
  else window.print();
}


/**
 * Save a base64-encoded PDF to the device's Downloads folder using the
 * Android native bridge (AndroidDownloader). Falls back to browser download
 * when the bridge is not available.
 */
export async function saveNativePdf(base64Data: string, filename: string): Promise<{ savedTo: string }> {
  const bridge = (window as any).AndroidDownloader;
  if (bridge && typeof bridge.saveBase64 === 'function') {
    bridge.saveBase64(base64Data, filename, 'application/pdf');
    return { savedTo: 'Downloads/' + filename };
  }

  // Browser fallback: convert base64 to blob and trigger download
  const byteChars = atob(base64Data);
  const byteArray = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteArray[i] = byteChars.charCodeAt(i);
  const blob = new Blob([byteArray], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return { savedTo: 'Downloads/' + filename };
}
