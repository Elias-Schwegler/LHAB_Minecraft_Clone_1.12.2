import { readFileSync, writeFileSync } from 'node:fs';
let s = readFileSync('AGENTS.md', 'utf8');
const before = s.length;
s = s.split('`n').join('\n');
writeFileSync('AGENTS.md', s);
console.log('backtick-n removed:', !s.includes('`n'), '| grew:', s.length !== before);
