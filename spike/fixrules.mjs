import { readFileSync, writeFileSync } from 'node:fs';
let h = readFileSync('src/harness.js', 'utf8');
h = h.split('Math.atan2(-8, -8) + Math.PI').join('Math.atan2(-8, -8)');
writeFileSync('src/harness.js', h);

let i = readFileSync('issues/022-fluids.md', 'utf8');
i = i.replace(
  'RESOLVED for DoR: water touching lava SOURCE -> cobblestone; lava (source or flow) touching WATER -> stone.',
  'RESOLVED (corrected during impl): water INTO lava SOURCE -> obsidian; water INTO flowing lava -> cobblestone; lava INTO water (any) -> stone. (Java-verified: obsidian/cobble/stone generators.)');
writeFileSync('issues/022-fluids.md', i);

let r = readFileSync('docs/REFERENCE.md', 'utf8');
r = r.replace(
  'water source + adjacent lava source -> cobblestone; water stream onto lava source ->\nobsidian?',
  'water stream into lava SOURCE -> obsidian; water stream into flowing lava -> cobblestone;\nlava stream into water (source or flow) -> stone (all three verified 2026-09-04).');
r = r.replace(
  '**rule: water on lava source -> cobblestone; water on lava flowing -> stone;\nlava on water (source or stream) -> stone** (lava does not displace water).',
  '**Java rule (verified): water stream into lava source -> obsidian; water stream into flowing\nlava -> cobblestone; lava stream into water (any) -> stone** (lava does not displace water).');
writeFileSync('docs/REFERENCE.md', r);
console.log('rules corrected + yaw fixed:', !h.includes('+ Math.PI'));
