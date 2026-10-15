const fs = require('fs');
const file = 'src/components/SmartPrintCenter.tsx';
let c = fs.readFileSync(file, 'utf8');

// Purana webview block dhoondo
const startMarker = `      const isWebView = /wv|WebView|Android.*Version\\/\\d+\\.\\d+/.test(navigator.userAgent) || (window as any).Capacitor;`;
const endMarker = `      } else {`;

const startIndex = c.indexOf(startMarker);
const endIndex = c.indexOf(endMarker, startIndex);

if (startIndex === -1 || endIndex === -1) {
  console.log('❌ WebView block nahi mila.');
  process.exit(1);
}

const newWebViewBlock = `      const isWebView = /wv|WebView|Android.*Version\\/\\d+\\.\\d+/.test(navigator.userAgent) || (window as any).Capacitor;
      if (isWebView) {
        // App ke liye html-to-image + jspdf (bypasses CSS parsing entirely)
        const { toPng } = await import('html-to-image');
        const { jsPDF } = await import('jspdf');
        
        const targetEl = document.querySelector('.edunixo-print-content') as HTMLElement || container;
        
        // Thoda wait karo taaki CSS load ho jaye
        await new Promise(r => setTimeout(r, 500));
        
        const dataUrl = await toPng(targetEl, {
          quality: 0.98,
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          skipFonts: true,
          style: { margin: '0', padding: '0' }
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
        
        // File save karne ke liye download link banao
        const downloadUrl = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(downloadUrl);
        }, 1000);
        
        printFrame.remove();
      } else {`;

c = c.substring(0, startIndex) + newWebViewBlock + c.substring(endIndex + endMarker.length - 1);
fs.writeFileSync(file, c);
console.log('✅ App PDF v3 (html-to-image) successfully applied!');
