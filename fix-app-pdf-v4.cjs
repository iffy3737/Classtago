const fs = require('fs');
const file = 'src/components/SmartPrintCenter.tsx';
let c = fs.readFileSync(file, 'utf8');

const startMarker = `      if (isWebView) {`;
const endMarker = `      } else {`;

const startIndex = c.indexOf(startMarker);
const endIndex = c.indexOf(endMarker, startIndex);

if (startIndex === -1 || endIndex === -1) {
  console.log('❌ WebView block nahi mila.');
  process.exit(1);
}

const newWebViewBlock = `      if (isWebView) {
        // App (WebView) ke liye: HTML ko Base64 mein convert karke Chrome mein kholo
        const headLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(function(el){ return el.outerHTML; }).join('\\n');
        const headStyles = Array.from(document.querySelectorAll('style')).map(function(el){ return el.outerHTML; }).join('\\n');
        
        const contentHTML = document.querySelector('.edunixo-print-content')?.outerHTML || container.innerHTML;
        
        // Auto print script jo Chrome mein khulte hi print dialog khol dega
        const autoPrint = '<script>window.onload=function(){setTimeout(function(){window.print();},1200);}<\\/script>';
        
        const fullHTML = '<!DOCTYPE html><html lang="ur" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' + (request.title || 'Document') + '</title>' +
          headLinks + '\\n' + headStyles +
          '<style>@page{size:' + dimensions.width + 'mm ' + dimensions.height + 'mm;margin:0}body{margin:0;padding:0;background:#fff;direction:rtl}*{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}</style>' +
          '</head><body>' + contentHTML + autoPrint + '</body></html>';

        // HTML ko Base64 mein encode karo (Urdu text ke liye safe hai)
        const base64HTML = btoa(unescape(encodeURIComponent(fullHTML)));
        const dataUrl = 'data:text/html;base64,' + base64HTML;
        
        // Pehle window.open try karo, agar fail ho toh location.href use karo
        const newWin = window.open(dataUrl, '_blank');
        if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
          window.location.href = dataUrl;
        }
        
        printFrame.remove();
      } else {`;

c = c.substring(0, startIndex) + newWebViewBlock + c.substring(endIndex + endMarker.length - 1);
fs.writeFileSync(file, c);
console.log('✅ App PDF v4 (Base64 Data URL) successfully applied!');
