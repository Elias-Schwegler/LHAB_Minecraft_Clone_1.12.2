import { readFileSync, writeFileSync } from 'node:fs';
let s = readFileSync('src/registry.js', 'utf8');
const m = s.match(/\/\*REGISTRY-START\*\/([\s\S]*?)\/\*REGISTRY-END\*\//);
const reg = JSON.parse(m[1]);
const T6 = (t) => [t, t, t, t, t, t];
reg.torch = {
  id: 50, tier: 1,
  variants: { default: { functional: false, tiles: T6('tile_torch'), hardness: 0, drop: 'torch', tool: null, minTier: 0, solid: false, light: 14, cross: true } },
};
reg.furnace = {
  id: 61, tier: 1,
  variants: { default: { functional: false, tiles: T6('furnace'), hardness: 3.5, drop: 'furnace', tool: 'pickaxe', minTier: 1, solid: true, light: 0 } },
};
reg.crafting_table = {
  id: 58, tier: 1,
  variants: { default: { functional: false, tiles: T6('crafting_table'), hardness: 2.5, drop: 'crafting_table', tool: null, minTier: 0, solid: true, light: 0 } },
};
s = s.replace(m[0], '/*REGISTRY-START*/\n' + JSON.stringify(reg, null, 1) + '/*REGISTRY-END*/');
writeFileSync('src/registry.js', s);
console.log('blocks added:', Object.keys(reg).length);
