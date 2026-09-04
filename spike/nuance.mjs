import { readFileSync, writeFileSync } from 'node:fs';
let r = readFileSync('docs/REFERENCE.md', 'utf8');
r = r.replace(
  '**Java rule (verified): water stream into lava source -> obsidian; water stream into flowing\nlava -> cobblestone; lava stream into water (any) -> stone** (lava does not displace water).',
  '**Java rule (verified): water stream into lava source -> obsidian; water stream into flowing\nlava -> cobblestone; lava stream into water (any) -> stone** (lava does not displace water).\nNUANCE (impl-verified): lateral flows cobble-shield a source before water can reach it -\nobsidian forms only when water directly touches an untouched source (basis of cobble generators).\nInteraction resolution order = flow queue order (first-mover wins the contact cell).');
writeFileSync('docs/REFERENCE.md', r);
console.log('nuance:', r.includes('cobble-shield'));
