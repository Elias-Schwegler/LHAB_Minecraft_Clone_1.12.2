// Extract CF.astar + Heap from src/mobs.js and run against a synthetic world.
import { readFileSync } from 'node:fs';
const src = readFileSync('src/mobs.js', 'utf8');
const h0 = src.indexOf('function Heap()'); const h1 = src.indexOf('function standable');
const a0 = src.indexOf('function astar'); const a1 = src.indexOf('CF.astar = astar');
const heapSrc = src.slice(h0, h1), astarSrc = src.slice(a0, a1);
const grid = new Map();
const W = { get: (x, y, z) => grid.get(x + ',' + y + ',' + z) || 0 };
const CF = { world: W };
globalThis.CF = CF;
const factory = new Function('CF', 'const NODE_CAP=1500, STEP_UP=1, MAX_FALL=4;' + src.slice(h0, a1) + '\nreturn {astar, standable, Heap};');
const { astar, standable } = factory(CF);
// arena: floor y=70 solid 20x7, air 71-79; U pocket: west wall x=157 z 157..163 y71-72; rows z=157/163 x 157..163
for (let x = 157; x <= 173; x++) for (let z = 157; z <= 163; z++) grid.set(x + ',70,' + z, 1);
const wall = (x, y, z) => grid.set(x + ',' + y + ',' + z, 4);
for (let y = 71; y <= 72; y++) {
  for (let z = 157; z <= 163; z++) wall(157, y, z);
  for (let x = 157; x <= 163; x++) { wall(x, y, 157); wall(x, y, 163); }
}
const p = astar(160, 71, 160, 172, 71, 160);
console.log('pocket->east goal:', p === null ? 'NULL' : 'len ' + p.length + ' first ' + JSON.stringify(p[0]) + ' last ' + JSON.stringify(p[p.length - 1]));
const p2 = astar(160, 71, 160, 164, 71, 160);
console.log('pocket->(164):', p2 === null ? 'NULL' : 'len ' + p2.length);
const p3 = astar(160, 71, 160, 158, 71, 160);
console.log('pocket->west(158 inside? 158>157 wall x):', p3 === null ? 'NULL' : 'len ' + p3.length);
