import { readFileSync } from 'node:fs';
const src = readFileSync('src/mobs.js', 'utf8');
const h0 = src.indexOf('function Heap()'), a1 = src.indexOf('CF.astar = astar');
const grid = new Map();
const W = { get: (x, y, z) => grid.get(x + ',' + y + ',' + z) || 0 };
const CF = { world: W };
for (let x = 157; x <= 173; x++) for (let z = 157; z <= 163; z++) grid.set(x + ',70,' + z, 1);
let body = 'const NODE_CAP=1500,STEP_UP=1,MAX_FALL=4;' + src.slice(h0, a1);
const dec = '(ck % 8192 - 4096) + "," + (Math.floor(ck / 8192) - 4096)';
body = body.replace(
  'const path = []; let k = ck;',
  `const path = []; let k = ck; globalThis.__term = ${dec};`
);
body = body.replace(
  'k = came.get(k);',
  'k = came.get(k); globalThis.__chain = (globalThis.__chain||[]).concat(typeof k==="number" ? (k % 8192 - 4096) + "," + (Math.floor(k / 8192) - 4096) : "STOP");'
);
body += '\nreturn astar;';
const astar = new Function('CF', body)(CF);
const p = astar(160, 71, 160, 164, 71, 160);
console.log('term node:', globalThis.__term);
console.log('came chain:', globalThis.__chain.join(' -> '));
console.log('returned:', p === null ? 'NULL' : JSON.stringify(p));
