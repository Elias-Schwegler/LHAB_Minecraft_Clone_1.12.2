import { readFileSync, writeFileSync } from 'node:fs';
let mf = readFileSync('src/manifest.json', 'utf8');
if (!mf.includes('ui.js')) mf = mf.replace('"src/items.js",', '"src/items.js",\n    "src/ui.js",');
writeFileSync('src/manifest.json', mf);
let h = readFileSync('src/harness.js', 'utf8');
if (!h.includes('uiTests'))
  h = h.replace("      if (typeof CF.persistTests === 'function') await CF.persistTests(r);",
    "      if (typeof CF.uiTests === 'function') await CF.uiTests(r);\n      if (typeof CF.persistTests === 'function') await CF.persistTests(r);");
writeFileSync('src/harness.js', h);
console.log('manifest ui:', mf.includes('ui.js'), '| harness:', h.includes('uiTests'));
