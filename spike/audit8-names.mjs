import { readFileSync } from 'node:fs';
const file = process.argv[2];
const html = readFileSync(file, 'utf8');
const names = new Set();
for (const m of html.matchAll(/CF\.assert\(r,\s*'([^']*)'/g)) names.add(m[1].split('(')[0].trim());
console.log('DISTINCT-ASSERT-NAME-PREFIXES: ' + names.size + '  file=' + file);
console.log([...names].sort().join('\n'));
