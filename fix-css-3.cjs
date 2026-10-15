const fs = require('fs');
const file = 'src/components/SmartPrintCenter.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Fix gap (row-gap, column-gap)
content = content.replace(/gap:\s*([^;{}]+?)(!important)?\s*;/g, (m, val, imp) => {
  const i = imp || '';
  const parts = val.trim().split(/\s+/);
  if (parts.length === 2) return `row-gap:${parts[0]}${i};column-gap:${parts[1]}${i};`;
  return `row-gap:${parts[0]}${i};column-gap:${parts[0]}${i};`;
});

// 2. Fix flex (flex-grow, flex-shrink, flex-basis)
content = content.replace(/flex:\s*([^;{}]+?)(!important)?\s*;/g, (m, val, imp) => {
  const i = imp || '';
  const parts = val.trim().split(/\s+/);
  if (parts.length === 1) return `flex-grow:${parts[0]}${i};flex-shrink:1${i};flex-basis:0%${i};`;
  if (parts.length === 2) return `flex-grow:${parts[0]}${i};flex-shrink:${parts[1]}${i};flex-basis:0%${i};`;
  if (parts.length === 3) return `flex-grow:${parts[0]}${i};flex-shrink:${parts[1]}${i};flex-basis:${parts[2]}${i};`;
  return m;
});

// 3. Remove box-shadow (kyunki wo multi-value hota hai)
content = content.replace(/box-shadow:\s*([^;{}]+?)(!important)?\s*;/g, '');

// 4. Convert display:grid to display:flex aur grid-template-columns hatao
content = content.replace(/display:\s*grid(!important)?;/g, 'display:flex$1; flex-wrap:wrap$1;');
content = content.replace(/grid-template-columns:\s*[^;{}]+;/g, '');

fs.writeFileSync(file, content);
console.log('✅ Advanced CSS fix (gap, flex, grid, box-shadow) applied!');
