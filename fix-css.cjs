const fs = require('fs');
const file = 'src/components/SmartPrintCenter.tsx';
let content = fs.readFileSync(file, 'utf8');

// Function to expand margin/padding shorthand
function expandBox(prop, value) {
  const clean = value.replace(/!important/g, '').trim();
  const imp = value.includes('!important') ? '!important' : '';
  const parts = clean.split(/\s+/);
  let out = '';
  if (parts.length === 1) out = `${prop}-top:${parts[0]}${imp};${prop}-right:${parts[0]}${imp};${prop}-bottom:${parts[0]}${imp};${prop}-left:${parts[0]}${imp};`;
  else if (parts.length === 2) out = `${prop}-top:${parts[0]}${imp};${prop}-right:${parts[1]}${imp};${prop}-bottom:${parts[0]}${imp};${prop}-left:${parts[1]}${imp};`;
  else if (parts.length === 3) out = `${prop}-top:${parts[0]}${imp};${prop}-right:${parts[1]}${imp};${prop}-bottom:${parts[2]}${imp};${prop}-left:${parts[1]}${imp};`;
  else if (parts.length === 4) out = `${prop}-top:${parts[0]}${imp};${prop}-right:${parts[1]}${imp};${prop}-bottom:${parts[2]}${imp};${prop}-left:${parts[3]}${imp};`;
  else out = `${prop}:${value};`;
  return out;
}

// Margin aur Padding fix karo
content = content.replace(/(margin|padding):\s*([^;{}]+?)(!important)?\s*;/g, (m, prop, val, imp) => {
  return expandBox(prop, val + (imp || ''));
});

// Border fix karo
content = content.replace(/border:\s*([^;{}]+?)(!important)?\s*;/g, (m, val, imp) => {
  const clean = val.trim(); const i = imp || '';
  const parts = clean.split(/\s+/);
  if (parts.length >= 3) return `border-width:${parts[0]}${i};border-style:${parts[1]}${i};border-color:${parts[2]}${i};`;
  return m;
});

// Border-left, right, top, bottom fix karo
content = content.replace(/border-(left|right|top|bottom):\s*([^;{}]+?)(!important)?\s*;/g, (m, side, val, imp) => {
  const clean = val.trim(); const i = imp || '';
  const parts = clean.split(/\s+/);
  if (parts.length >= 3) return `border-${side}-width:${parts[0]}${i};border-${side}-style:${parts[1]}${i};border-${side}-color:${parts[2]}${i};`;
  return m;
});

fs.writeFileSync(file, content);
console.log('✅ Saare multi-value CSS fix ho gaye!');
