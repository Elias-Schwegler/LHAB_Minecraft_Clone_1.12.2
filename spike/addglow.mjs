import { readFileSync, writeFileSync } from 'node:fs';
let s = readFileSync('src/registry.js', 'utf8');
const m = s.match(/\/\*REGISTRY-START\*\/([\s\S]*?)\/\*REGISTRY-END\*\//);
const reg = JSON.parse(m[1]);
reg.glowstone = {
  id: 89, tier: 2,
  variants: { default: { functional: false, tiles: ['glowstone', 'glowstone', 'glowstone', 'glowstone', 'glowstone', 'glowstone'], hardness: 0.8, drop: 'glowstone', tool: null, minTier: 0, solid: true, light: 15 } },
};
s = s.replace(m[0], '/*REGISTRY-START*/\n' + JSON.stringify(reg, null, 1) + '/*REGISTRY-END*/');
writeFileSync('src/registry.js', s);
console.log('glowstone registered, light 15');
