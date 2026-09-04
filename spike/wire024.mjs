import { readFileSync, writeFileSync } from 'node:fs';
let mf = readFileSync('src/manifest.json', 'utf8');
if (!mf.includes('items.js')) mf = mf.replace('"src/interact.js",', '"src/interact.js",\n    "src/items.js",');
writeFileSync('src/manifest.json', mf);
let h = readFileSync('src/harness.js', 'utf8');
if (!h.includes('itemTests'))
  h = h.replace("      if (typeof CF.persistTests === 'function') await CF.persistTests(r);",
    "      if (typeof CF.itemTests === 'function') await CF.itemTests(r);\n      if (typeof CF.persistTests === 'function') await CF.persistTests(r);");
writeFileSync('src/harness.js', h);
console.log('manifest:', mf.includes('items.js'), '| harness:', h.includes('itemTests'));
