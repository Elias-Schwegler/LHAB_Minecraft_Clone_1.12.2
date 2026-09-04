import { readFileSync, writeFileSync } from 'node:fs';
let s = readFileSync('src/persist.js', 'utf8');
const key = ['cf', 'save', '1'].join('-');
s = s.replace(/const KEY = '[^']*';/, "const KEY = '" + key + "';");
writeFileSync('src/persist.js', s);
const m = s.match(/const KEY = '([^']*)'/);
console.log('KEY bytes:', [...m[1]].map((c) => c.charCodeAt(0)).join(','));
