import { readFileSync, writeFileSync } from 'node:fs';
let s = readFileSync('src/world.js', 'utf8');
if (!s.includes('flatSet:')) {
  s = s.replace('flatAt, fluidStat }', 'flatAt, flatSet: setFlat, fluidStat }');
  if (!s.includes('flatSet:')) s = s.replace('flatAt };', 'flatAt, flatSet: setFlat };');
}
writeFileSync('src/world.js', s);
console.log('flatSet exported:', s.includes('flatSet:'));
