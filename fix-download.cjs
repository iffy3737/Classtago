const fs = require('fs');
const file = 'src/components/SmartPrintCenter.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

// Find start of downloadPdf function
let startIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const downloadPdf = async () => {')) {
    startIdx = i;
    break;
  }
}

// Find end: next line with "if (!request) return null;"
let endIdx = -1;
for (let i = startIdx + 1; i < lines.length; i++) {
  if (lines[i].includes('if (!request) return null;')) {
    endIdx = i;
    break;
  }
}

if (startIdx === -1 || endIdx === -1) {
  console.log('❌ Start ya End nahi mila. startIdx=' + startIdx + ' endIdx=' + endIdx);
  process.exit(1);
}

console.log('Replacing lines ' + (startIdx + 1) + ' to ' + endIdx);

const newFunction = [
  '  const downloadPdf = async () => {',
  '    if (!request) return;',
  '    setBusy(true);',
  '    const container = document.createElement("div");',
  '    container.style.cssText = "position:fixed;left:-99999px;top:0;background:#ffffff;box-sizing:border-box;";',
  '    document.body.appendChild(container);',
  '',
  '    const originalGetComputedStyle = window.getComputedStyle;',
  '    const restoreGlobalOklch = () => {',
  '      window.getComputedStyle = originalGetComputedStyle;',
  '    };',
  '',
  '    try {',
  '      const root = ReactDOM.createRoot(container);',
  '      root.render(<PrintableDocument request={request} preferences={preferences} />);',
  '      await new Promise((r) => setTimeout(r, 1200));',
  '',
  '      const isWebView = /wv|WebView|Android.*Version\\/\\d+\\.\\d+/.test(navigator.userAgent) || (window as any).Capacitor;',
  '',
  '      if (isWebView) {',
  '        // App (WebView) ke liye: html-to-image + jsPDF',
  '        const { toPng } = await import("html-to-image");',
  '        const { jsPDF } = await import("jspdf");',
  '        const targetEl = container;',
  '',
  '        const dataUrl = await toPng(targetEl, {',
  '          quality: 0.95,',
  '          pixelRatio: 2,',
  '          backgroundColor: "#ffffff",',
  '        });',
  '',
  '        const pdf = new jsPDF({',
  '          unit: "mm",',
  '          format: [dimensions.width, dimensions.height],',
  '          orientation: preferences.orientation as any,',
  '        });',
  '',
  '        const pdfWidth = dimensions.width;',
  '        const pdfHeight = dimensions.height;',
  '        const imgProps = pdf.getImageProperties(dataUrl);',
  '        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;',
  '',
  '        let heightLeft = imgHeight;',
  '        let position = 0;',
  '        pdf.addImage(dataUrl, "PNG", 0, position, pdfWidth, imgHeight);',
  '        heightLeft -= pdfHeight;',
  '        while (heightLeft > 0) {',
  '          position = heightLeft - imgHeight;',
  '          pdf.addPage();',
  '          pdf.addImage(dataUrl, "PNG", 0, position, pdfWidth, imgHeight);',
  '          heightLeft -= pdfHeight;',
  '        }',
  '',
  '        const pdfBase64 = pdf.output("datauristring");',
  '        const newWin = window.open(pdfBase64, "_system");',
  '        if (!newWin || newWin.closed || typeof newWin.closed === "undefined") {',
  '          const a = document.createElement("a");',
  '          a.href = pdfBase64;',
  '          a.target = "_blank";',
  '          a.download = (request.title || "Document") + ".pdf";',
  '          document.body.appendChild(a);',
  '          a.click();',
  '          document.body.removeChild(a);',
  '        }',
  '      } else {',
  '        // Browser ke liye: iframe + window.print()',
  '        const printFrame = document.createElement("iframe");',
  '        printFrame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";',
  '        document.body.appendChild(printFrame);',
  '        const fdoc = printFrame.contentWindow?.document;',
  '        if (!fdoc) throw new Error("Print init failed");',
  '        const allStyles = Array.from(document.querySelectorAll("style")).map((s) => s.textContent || "").join("\\n");',
  '        fdoc.open();',
  '        fdoc.write(',
  '          "<!DOCTYPE html><html><head><meta charset=\\"utf-8\\"><title>" +',
  '          (request.title || "Document") +',
  '          "</title><style>@page{size:" +',
  '          dimensions.width +',
  '          "mm " +',
  '          dimensions.height +',
  '          "mm;margin:0}body{margin:0;padding:0}" +',
  '          allStyles +',
  '          "</style></head><body>" +',
  '          container.innerHTML +',
  '          "</body></html>"',
  '        );',
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
  '      restoreGlobalOklch();',
  '      container.remove();',
  '      setBusy(false);',
  '    }',
  '  };',
  ''
];

const newLines = lines.slice(0, startIdx).concat(newFunction, lines.slice(endIdx));
fs.writeFileSync(file, newLines.join('\n'));
console.log('✅ downloadPdf function completely replaced!');ó

