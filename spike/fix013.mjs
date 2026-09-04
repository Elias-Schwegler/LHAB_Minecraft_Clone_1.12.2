import { readFileSync, writeFileSync } from 'node:fs';
let s = readFileSync('src/registry.js', 'utf8');
const before = s.length;
s = s.replace(/\s*"snow": \{"id":80[^}]*\}\}\},/, '');
s = s.replace('"leaves": {"id":18,"tier":1,"variants":{"oak":{"functional":true', '"leaves": {"id":18,"tier":1,"variants":{"oak":{"functional":false');
writeFileSync('src/registry.js', s);
console.log('snow removed:', s.length < before, '| leaves:', s.includes('leaves": {"id":18,"tier":1,"variants":{"oak":{"functional":false'));
