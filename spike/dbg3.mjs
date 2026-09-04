import { readFileSync, writeFileSync } from 'node:fs';
import { runBrowser, toFileUrl, p } from '../tools/lib.mjs';
let s = readFileSync(p('spike', 'texdbg2.html'), 'utf8');
s = s.replace('const p = new Uint8Array(4);\n      gl.readPixels(427, 240, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, p);',
  `const grid=[];for(let gy=60;gy<480;gy+=90){const row=[];for(let gx=60;gx<854;gx+=90){const q=new Uint8Array(4);gl.readPixels(gx,gy,1,1,gl.RGBA,gl.UNSIGNED_BYTE,q);if(!(q[0]>140&&q[1]>180&&q[2]>240))row.push(gx+','+gy+':'+q[0]+','+q[1]+','+q[2]);}grid.push(row.join(' | '));}grid.push('SUMMARY:'+grid.map(r=>r.length).join(','));`);
s = s.replace('px: [p[0], p[1], p[2]],', 'grid: grid.filter(x=>x).slice(0,6),');
writeFileSync(p('spike', 'texdbg3.html'), s);
const o = runBrowser({ url: toFileUrl(p('spike', 'texdbg3.html')), dumpDom: true, budget: 8000, timeout: 60000 });
const m = o.match(/<title>DBG2:([^<]*)</);
console.log(m ? decodeURIComponent(m[1]) : 'NO-TITLE');
