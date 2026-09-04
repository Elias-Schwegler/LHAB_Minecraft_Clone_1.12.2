import { readFileSync } from 'node:fs';
const s = readFileSync('game/index.html', 'utf8');
const m = s.match(/\/\*REGISTRY-START\*\/([\s\S]*?)\/\*REGISTRY-END\*\//);
const j = JSON.parse(m[1]);
console.log('blocks:', Object.keys(j).join(','));
console.log('torch?', !!j.torch, 'furnace?', !!j.furnace, 'ct?', !!j.crafting_table);
