const fs = require('fs');
const file = 'src/components/SmartPrintCenter.tsx';
fs.copyFileSync(file, file + '.bak7');
let c = fs.readFileSync(file, 'utf8');

const oldCode = `      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();
      setTimeout(function(){ printFrame.remove(); }, 5000);`;

const newCode = `      // Check if running inside a WebView (Android App)
      const isWebView = /wv|WebView|Android.*Version\\/\\d+\\.\\d+/.test(navigator.userAgent) || (window as any).Capacitor;
      if (isWebView) {
        // WebView mein window.print() kaam nahi karta, isliye HTML ko system browser mein open karenge
        const htmlContent = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + (request.title || 'Document') + '</title><style>@page{size:' + dimensions.width + 'mm ' + dimensions.height + 'mm;margin:0}*{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}body{margin:0;padding:0;background:#fff}' + allStyles + '</style></head><body>' + container.innerHTML + '</body></html>';
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        // Fallback: Agar App mein window.open kaam na kare toh direct print try karein
        const w = window.open(url, '_blank');
        if (!w) {
          alert('Print karne ke liye Chrome browser mein kholein ya PDF download karein.');
        }
        printFrame.remove();
      } else {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
        setTimeout(function(){ printFrame.remove(); }, 5000);
      }`;

if (c.includes(oldCode)) {
  c = c.replace(oldCode, newCode);
  fs.writeFileSync(file, c);
  console.log('✅ App print fix added!');
} else {
  console.log('❌ Pattern not found.');
}
