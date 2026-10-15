const fs = require('fs');
const file = 'src/components/SmartPrintCenter.tsx';
fs.copyFileSync(file, file + '.bak4');
let c = fs.readFileSync(file, 'utf8');

const old = `          windowWidth: container.scrollWidth,
          windowHeight: container.scrollHeight,
        } as any);`;

const neu = `          windowWidth: container.scrollWidth,
          windowHeight: container.scrollHeight,
          onclone: (clonedDoc) => {
            clonedDoc.querySelectorAll('*').forEach((el) => {
              const s = el.style; if (!s) return;
              if (s.margin && s.margin.includes(' ')) {
                const p = s.margin.replace(/!important/g,'').trim().split(/\\s+/);
                s.margin=''; s.marginTop=p[0]||'0'; s.marginRight=p[1]||p[0]||'0'; s.marginBottom=p[2]||p[0]||'0'; s.marginLeft=p[3]||p[1]||p[0]||'0';
              }
              if (s.padding && s.padding.includes(' ')) {
                const p = s.padding.replace(/!important/g,'').trim().split(/\\s+/);
                s.padding=''; s.paddingTop=p[0]||'0'; s.paddingRight=p[1]||p[0]||'0'; s.paddingBottom=p[2]||p[0]||'0'; s.paddingLeft=p[3]||p[1]||p[0]||'0';
              }
              if (s.border && s.border.includes(' ') && !s.border.includes('none')) {
                const p = s.border.replace(/!important/g,'').trim().split(/\\s+/);
                if (p.length >= 3) { s.border=''; s.borderWidth=p[0]; s.borderStyle=p[1]; s.borderColor=p.slice(2).join(' '); }
              }
              if (s.boxShadow) s.boxShadow='none';
              if (s.flex && s.flex.includes(' ')) {
                const p = s.flex.replace(/!important/g,'').trim().split(/\\s+/);
                s.flex='';
                if (p.length===1){s.flexGrow=p[0];s.flexShrink='1';s.flexBasis='0%';}
                else if (p.length===2){s.flexGrow=p[0];s.flexShrink=p[1];s.flexBasis='0%';}
                else if (p.length>=3){s.flexGrow=p[0];s.flexShrink=p[1];s.flexBasis=p[2];}
              }
              if (s.gap && s.gap.includes(' ')) {
                const p = s.gap.replace(/!important/g,'').trim().split(/\\s+/);
                s.gap=''; s.rowGap=p[0]; s.columnGap=p[1]||p[0];
              }
            });
          },
        } as any);`;

if (c.includes(old)) {
  c = c.replace(old, neu);
  fs.writeFileSync(file, c);
  console.log('✅ onclone handler added successfully!');
} else {
  console.log('❌ Pattern not found. Please share lines 425-440 exactly.');
}
