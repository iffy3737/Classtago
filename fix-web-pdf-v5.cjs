const fs = require('fs');
const file = 'src/components/SmartPrintCenter.tsx';
let c = fs.readFileSync(file, 'utf8');

const startMarker = `      const isWebView = /wv|WebView|Android.*Version\\/\\d+\\.\\d+/.test(navigator.userAgent) || (window as any).Capacitor;`;
const endMarker = `      } else {`;

const startIndex = c.indexOf(startMarker);
const endIndex = c.indexOf(endMarker, startIndex);

if (startIndex === -1 || endIndex === -1) {
  console.log('❌ Block nahi mila.');
  process.exit(1);
}

const newBlock = `      // Generate PDF using html-to-image (bypasses CSS parsing completely)
      const { toPng } = await import('html-to-image');
      const { jsPDF } = await import('jspdf');
      const targetEl = document.querySelector('.edunixo-print-content') as HTMLElement || container;
      await new Promise(r => setTimeout(r, 800));
      
      const dataUrl = await toPng(targetEl, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });
      
      const pdf = new jsPDF({
        unit: 'mm',
        format: [dimensions.width, dimensions.height],
        orientation: preferences.orientation as 'portrait' | 'landscape',
      });
      
      const pdfWidth = dimensions.width;
      const pdfHeight = dimensions.height;
      const imgProps = pdf.getImageProperties(dataUrl);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;
      
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
      
      const pdfBlob = pdf.output('blob');
      const filename = (request.title || 'Document').replace(/[^a-z0-9_-]+/gi, '_') + '.pdf';
      
      // Standard download link (works in Chrome, Safari)
      const downloadUrl = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
      }, 2000);
      
      printFrame.remove();
    `;

c = c.substring(0, startIndex) + newBlock + c.substring(endIndex + endMarker.length - 1);
c = c.replace(/} else {{/g, '} else {');
fs.writeFileSync(file, c);
console.log('✅ Web PDF download logic (html-to-image) applied!');
