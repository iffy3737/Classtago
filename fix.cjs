const fs = require('fs');
const file = 'src/components/SmartPrintCenter.tsx';
let content = fs.readFileSync(file, 'utf8');

const replacements = [
  ["margin:${previewMode ? '14px auto' : '0 auto'};", "margin-top:${previewMode ? '14px' : '0'};margin-right:auto;margin-bottom:${previewMode ? '14px' : '0'};margin-left:auto;"],
  ["margin:0 0 6mm;padding:3.5mm 4mm;border:1px solid #cbd5e1;", "margin-top:0;margin-right:0;margin-bottom:6mm;margin-left:0;padding-top:3.5mm;padding-right:4mm;padding-bottom:3.5mm;padding-left:4mm;border-width:1px;border-style:solid;border-color:#cbd5e1;"],
  ["margin:0 0 1.4mm;", "margin-top:0;margin-right:0;margin-bottom:1.4mm;margin-left:0;"],
  ["margin:0 0 3mm!important;padding:0 0 2.5mm!important;", "margin-top:0!important;margin-right:0!important;margin-bottom:3mm!important;margin-left:0!important;padding-top:0!important;padding-right:0!important;padding-bottom:2.5mm!important;padding-left:0!important;"],
  ["padding:1.2mm .45mm!important;", "padding-top:1.2mm!important;padding-right:.45mm!important;padding-bottom:1.2mm!important;padding-left:.45mm!important;"],
  ["padding:1.2mm .6mm!important;", "padding-top:1.2mm!important;padding-right:.6mm!important;padding-bottom:1.2mm!important;padding-left:.6mm!important;"],
  ["padding:1.1mm .65mm!important;", "padding-top:1.1mm!important;padding-right:.65mm!important;padding-bottom:1.1mm!important;padding-left:.65mm!important;"],
  ["padding:1.5mm 2mm!important;border-left:.7mm solid #64748b!important;", "padding-top:1.5mm!important;padding-right:2mm!important;padding-bottom:1.5mm!important;padding-left:2mm!important;border-left-width:.7mm!important;border-left-style:solid!important;border-left-color:#64748b!important;"],
  ["border-bottom:2px solid #172033!important;padding:2mm 0 2.5mm!important;", "border-bottom-width:2px!important;border-bottom-style:solid!important;border-bottom-color:#172033!important;padding-top:2mm!important;padding-right:0!important;padding-bottom:2.5mm!important;padding-left:0!important;"]
];

let changed = false;
replacements.forEach(([from, to]) => {
  if (content.includes(from)) {
    content = content.replace(from, to);
    changed = true;
  } else {
    console.log(`Warning: Exact string not found: ${from}`);
  }
});

if (changed) {
  fs.writeFileSync(file, content);
  console.log("✅ Sab changes successfully ho gaye!");
} else {
  console.log("❌ Koi change nahi hua, check karo file sahi hai ya nahi.");
}
