const fs = require('fs');
const file = 'src/components/SmartPrintCenter.tsx';
fs.copyFileSync(file, file + '.bak6');
const lines = fs.readFileSync(file, 'utf8').split('\n');

let startIdx = -1, endIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('let pdfBlob: Blob;') && startIdx === -1) startIdx = i;
  if (lines[i].includes('window.alert(`PDF saved to')) endIdx = i;
}

if (startIdx === -1 || endIdx === -1) {
  console.log('Markers not found', startIdx, endIdx);
  process.exit(1);
}

console.log('Replacing lines ' + (startIdx + 1) + ' to ' + (endIdx + 1));

const linesToAdd = [
  "      // Native browser print - bypasses html2canvas completely",
  "      const printFrame = document.createElement('iframe');",
  "      printFrame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';",
  "      document.body.appendChild(printFrame);",
  "      const fdoc = printFrame.contentWindow?.document;",
  "      if (!fdoc) throw new Error('Print iframe init failed');",
  "      const allStyles = Array.from(document.querySelectorAll('style')).map(function(s){return s.textContent || '';}).join('\\n');",
  "      fdoc.open();",
  "      fdoc.write('<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>' + (request.title || 'Document') + '</title><style>@page{size:' + dimensions.width + 'mm ' + dimensions.height + 'mm;margin:0}*{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}body{margin:0;padding:0;background:#fff}' + allStyles + '</style></head><body>' + container.innerHTML + '</body></html>');",
  "      fdoc.close();",
  "      await new Promise(function(r){setTimeout(r, 800);});",
  "      printFrame.contentWindow?.focus();",
  "      printFrame.contentWindow?.print();",
  "      setTimeout(function(){ printFrame.remove(); }, 5000);"
];

lines.splice(startIdx, endIdx - startIdx + 1, linesToAdd.join('\n'));
fs.writeFileSync(file, lines.join('\n'));
console.log('✅ Switched to native browser print!');
