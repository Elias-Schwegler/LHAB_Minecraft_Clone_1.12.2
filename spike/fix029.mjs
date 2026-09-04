import { readFileSync, writeFileSync } from 'node:fs';
let a = readFileSync('issues/019-leaves-behavior.md', 'utf8');
a = a.replace(/\*\*\[verify[^\]]*\]\*\*/, 'RESOLVED (audit #2 -> #029): Java 1.12.2 oak leaves drop = sapling 5% (0.05) + apple 0.5% (0.005); sticks are Bedrock-edition only (Java has none) — implementation matches Java.');
a = a.replace(/apple drop \([^)]*\)/, 'apple drop (sapling 0.05, apple 0.005, Java loot tables)');
writeFileSync('issues/019-leaves-behavior.md', a);

let r = readFileSync('docs/REFERENCE.md', 'utf8');
r = r.replace(/drops flint 10% \*\*\[TBC %\]\*\*/, 'drops flint 10% exactly (Java)');
r = r.replace(/oak\/birch drop apple\/sapling chance/, 'oak leaves drop sapling 5% + apple 0.5% (Java loot tables; implemented+asserted #019)');
writeFileSync('docs/REFERENCE.md', r);

let w = readFileSync('src/world.js', 'utf8');
w = w.replace("CF.assert(r, 'light.queue(stale ok)', true);", "CF.assert(r, 'light.queue-stale(pending relight)', (w.lightAt(lx, lh, lz) & 15) > 0);");
writeFileSync('src/world.js', w);
console.log('029 fixes applied');
