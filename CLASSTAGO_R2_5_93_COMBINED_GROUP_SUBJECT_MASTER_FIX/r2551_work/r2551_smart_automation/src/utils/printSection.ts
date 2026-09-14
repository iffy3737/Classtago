import { openSmartPrint } from '../lib/smartPrint';

export function printSectionById(elementId: string, title = 'Print Document'): void {
  const source = document.getElementById(elementId);
  if (!source) {
    window.alert('Print content is not ready. Please generate or open the document first.');
    return;
  }
  openSmartPrint({ elementId, title });
}
