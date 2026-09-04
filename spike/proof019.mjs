import { readFileSync, writeFileSync } from 'node:fs';
let s = readFileSync('src/registry.js', 'utf8');
const m = s.match(/\/\*REGISTRY-START\*\/([\s\S]*?)\/\*REGISTRY-END\*\//);
const reg = JSON.parse(m[1]);
reg.leaves.variants.oak.functional = true;
reg.leaves.variants.oak.proof = {
  issue: '#019',
  tests: ['interact.break-time', 'world.leaves-decay', 'world.leaves-persist', 'interact.leaves-drop'],
};
s = s.replace(m[0], '/*REGISTRY-START*/\n' + JSON.stringify(reg, null, 1) + '/*REGISTRY-END*/');
writeFileSync('src/registry.js', s);
console.log('leaves functional + proof set');
