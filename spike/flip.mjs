import { readFileSync, writeFileSync } from 'node:fs';
let s = readFileSync('src/registry.js', 'utf8');
s = s.split('"functional":false').join('"functional":true');
s = s.replace('"bedrock": {"id":7,"tier":1,"variants":{"default":{"functional":true', '"bedrock": {"id":7,"tier":1,"variants":{"default":{"functional":false');
writeFileSync('src/registry.js', s);
console.log('flipped functional flags');
