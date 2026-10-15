const fs = require('fs');
const file = 'src/components/SmartPrintCenter.tsx';
let c = fs.readFileSync(file, 'utf8');

const oldBlock = `      const isWebView = /wv|WebView|Android.*Version\\/\\d+\\.\\d+/.test(navigator.userAgent) || (window as any).Capacitor;
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
      } else {`;

const newBlock = `      const isWebView = /wv|WebView|Android.*Version\\/\\d+\\.\\d+/.test(navigator.userAgent) || (window as any).Capacitor;
      if (isWebView) {
        // Saari CSS aur Links copy karo
        const headLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(function(el){ return el.outerHTML; }).join('\\n');
        const headStyles = Array.from(document.querySelectorAll('style')).map(function(el){ return el.outerHTML; }).join('\\n');
        const fullCss = headLinks + '\\n' + headStyles;
        
        // Automatic print trigger script
        const autoPrintScript = '<script>window.onload=function(){setTimeout(function(){window.print();},800);}<\\/script>';
        
        // RTL aur proper viewport ke saath HTML banao
        const htmlContent = '<!DOCTYPE html><html lang="ur" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' + (request.title || 'Document') + '</title>' +
          '<style>@page{size:' + dimensions.width + 'mm ' + dimensions.height + 'mm;margin:0}*{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}body{margin:0;padding:0;background:#fff}' + '</style>' +
          fullCss +
          '</head><body>' + (document.querySelector('.edunixo-print-content')?.outerHTML || container.innerHTML) + autoPrintScript + '</body></html>';

        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        // Anchor tag trick (WebView mein window.open se zyada reliable hai)
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
        
        printFrame.remove();
      } else {`;

if (c.includes(oldBlock)) {
  c = c.replace(oldBlock, newBlock);
  fs.writeFileSync(file, c);
  console.log('✅ App print v2 (layout + auto print) fixed!');
} else {
  console.log('❌ Block not found. Code manually check karna padega.');
}
