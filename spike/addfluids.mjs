import { readFileSync, writeFileSync } from 'node:fs';
let s = readFileSync('src/registry.js', 'utf8');
const m = s.match(/\/\*REGISTRY-START\*\/([\s\S]*?)\/\*REGISTRY-END\*\//);
const reg = JSON.parse(m[1]);
const T6 = (t) => [t, t, t, t, t, t];
reg.water = {
  id: 8, tier: 1,
  variants: { default: { functional: false, tiles: T6('water'), hardness: -1, drop: null, tool: null, minTier: 9, solid: false, light: 0, liquid: 'water' } },
};
reg.lava = {
  id: 10, tier: 1,
  variants: { default: { functional: false, tiles: T6('lava'), hardness: -1, drop: null, tool: null, minTier: 9, solid: false, light: 15, liquid: 'lava' } },
};
s = s.replace(m[0], '/*REGISTRY-START*/\n' + JSON.stringify(reg, null, 1) + '/*REGISTRY-END*/');
writeFileSync('src/registry.js', s);
console.log('water/lava registered (lava light 15)');
