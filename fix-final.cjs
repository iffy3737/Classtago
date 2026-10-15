const fs = require('fs');
const file = 'src/components/SmartPrintCenter.tsx';
let c = fs.readFileSync(file, 'utf8');

const startMarker = 'let pdfBlob: Blob;';
const endMarker = '} catch (error: any) {';

const startIndex = c.indexOf(startMarker);
const endIndex = c.indexOf(endMarker, startIndex);

if (startIndex === -1 || endIndex === -1) {
  console.log('❌ Markers not found');
  process.exit(1);
}

const newBlock = `let pdfBlob: Blob;
      try {
        const isWebView = /wv|WebView|Android.*Version\\/\\d+\\.\\d+/.test(navigator.userAgent) || (window as any).Capacitor;
        
        if (isWebView) {
          // App (WebView) ke liye: html-to-image + jsPDF -> Chrome me kholo
          const { toPng } = await import('html-to-image');
          const { jsPDF } = await import('jspdf');
          const targetEl = document.querySelector('.edunixo-print-content') as HTMLElement || container;
          await new Promise(r => setTimeout(r, 500));
          
          const dataUrl = await toPng(targetEl, { quality: 0.95, pixelRatio: 2, backgroundColor: '#ffffff' });
          const pdf = new jsPDF({ unit: 'mm', format: [dimensions.width, dimensions.height], orientation: preferences.orientation as any });
          const pdfWidth = dimensions.width;
          const imgProps = pdf.getImageProperties(dataUrl);
          const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
          
          let heightLeft = imgHeight;
          let position = 0;
          pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, imgHeight);
          heightLeft -= dimensions.height;
          while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= dimensions.height;
          }
          
          const pdfBase64 = pdf.output('datauristring');
          // '_system' Chrome ya default browser ko force karega open karne ke liye
          const newWin = window.open(pdfBase64, '_system');
          if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
            // Fallback: if window.open fails, try anchor click
            const a = document.createElement('a');
            a.href = pdfBase64;
            a.target = '_blank';
            a.download = (request.title || 'Document') + '.pdf';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }
        } else {
          // Browser ke liye (jo pehle kaam kar raha tha)
          const printFrame = document.createElement('iframe');
          printFrame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
          document.body.appendChild(printFrame);
          const fdoc = printFrame.contentWindow?.document;
          if (!fdoc) throw new Error('Print init failed');
          const allStyles = Array.from(document.querySelectorAll('style')).map(s => s.textContent || '').join('\\n');
          fdoc.open();
          fdoc.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + (request.title || 'Document') + '</title><style>@page{size:' + dimensions.width + 'mm ' + dimensions.height + 'mm;margin:0}body{margin:0;padding:0}</style>' + allStyles + '</head><body>' + container.innerHTML + '</body></html>');
          fdoc.close();
          await new Promise(r => setTimeout(r, 800));
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
          setTimeout(() => printFrame.remove(), 5000);
        }
      `;

c = c.substring(0, startIndex) + newBlock + c.substring(endIndex);
c = c.replace(/} else {{/g, '} else {');
fs.writeFileSync(file, c);
console.log('✅ Final clean PDF logic applied!');
