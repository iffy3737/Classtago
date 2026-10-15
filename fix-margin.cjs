const fs = require('fs');
const file = 'src/components/SmartPrintCenter.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

let startIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const downloadPdf = async () => {')) { startIdx = i; break; }
}

let endIdx = -1;
for (let i = startIdx + 1; i < lines.length; i++) {
  if (lines[i].includes('if (!request) return null;')) { endIdx = i; break; }
}

if (startIdx === -1 || endIdx === -1) { console.log('Markers not found'); process.exit(1); }

const fn = [
'  const downloadPdf = async () => {',
'    if (!request) return;',
'    setBusy(true);',
'    try {',
'      const isWebView = /wv|WebView|Android.*Version\\/\\d+\\.\\d+/.test(navigator.userAgent) || (window as any).Capacitor;',
'      const marginPx = preferences.marginMm;',
'      if (isWebView) {',
'        const { toPng } = await import("html-to-image");',
'        const { jsPDF } = await import("jspdf");',
'        const targetEl = document.querySelector(".edunixo-preview-shell") as HTMLElement || document.querySelector(".edunixo-print-content") as HTMLElement;',
'        if (!targetEl) throw new Error("Print content not found. Please ensure the preview is loaded.");',
'        const dataUrl = await toPng(targetEl, { quality: 0.95, pixelRatio: 2, backgroundColor: "#ffffff" });',
'        const pdf = new jsPDF({ unit: "mm", format: [dimensions.width, dimensions.height], orientation: preferences.orientation as any });',
'        const pdfWidth = dimensions.width;',
'        const pdfHeight = dimensions.height;',
'        const imgProps = pdf.getImageProperties(dataUrl);',
'        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;',
'        let heightLeft = imgHeight; let position = 0;',
'        pdf.addImage(dataUrl, "PNG", 0, position, pdfWidth, imgHeight);',
'        heightLeft -= pdfHeight;',
'        while (heightLeft > 0) { position = heightLeft - imgHeight; pdf.addPage(); pdf.addImage(dataUrl, "PNG", 0, position, pdfWidth, imgHeight); heightLeft -= pdfHeight; }',
'        const pdfBase64 = pdf.output("datauristring");',
'        const newWin = window.open(pdfBase64, "_system");',
'        if (!newWin || newWin.closed) {',
'          const a = document.createElement("a");',
'          a.href = pdfBase64; a.target = "_blank"; a.download = (request.title || "Document") + ".pdf";',
'          document.body.appendChild(a); a.click(); document.body.removeChild(a);',
'        }',
'      } else {',
'        const printFrame = document.createElement("iframe");',
'        printFrame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";',
'        document.body.appendChild(printFrame);',
'        const fdoc = printFrame.contentWindow?.document;',
'        if (!fdoc) throw new Error("Print init failed");',
'        const contentEl = document.querySelector(".edunixo-preview-shell") as HTMLElement || document.querySelector(".edunixo-print-content") as HTMLElement;',
'        const allStyles = Array.from(document.querySelectorAll("style")).map((s) => s.textContent || "").join("\\n");',
'        const marginMm = preferences.marginMm;',
'        fdoc.open();',
'        fdoc.write("<!DOCTYPE html><html><head><meta charset=\\"utf-8\\"><title>" + (request.title || "Document") + "</title><style>@page{size:" + dimensions.width + "mm " + dimensions.height + "mm;margin:" + marginMm + "mm}body{margin:0;padding:0}" + allStyles + "</style></head><body>" + (contentEl ? contentEl.innerHTML : "") + "</body></html>");',
'        fdoc.close();',
'        await new Promise((r) => setTimeout(r, 800));',
'        printFrame.contentWindow?.focus();',
'        printFrame.contentWindow?.print();',
'        setTimeout(() => printFrame.remove(), 5000);',
'      }',
'    } catch (error: any) {',
'      console.error(error);',
'      alert("PDF failed: " + (error?.message || error));',
'    } finally {',
'      setBusy(false);',
'    }',
'  };',
''
];

const newLines = lines.slice(0, startIdx).concat(fn, lines.slice(endIdx));
fs.writeFileSync(file, newLines.join('\n'));
console.log('done');
