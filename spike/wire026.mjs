import { readFileSync, writeFileSync } from 'node:fs';
let s = readFileSync('src/survival.js', 'utf8');
s = s.replace('(i.f || i.b || i.l || i.r)', '(i.f || i.s || i.l || i.r)');
s = s.replace('const P = CF.player, W = CF.world;\n    if (!P || !W) return;', 'const P = CF.player, W = CF.world;\n    if (!P || !W) return;\n    if (!P.spawn) P.spawn = P.pos.slice();');
writeFileSync('src/survival.js', s);

let mf = readFileSync('src/manifest.json', 'utf8');
if (!mf.includes('survival.js')) mf = mf.replace('"src/ui.js",', '"src/ui.js",\n    "src/survival.js",');
writeFileSync('src/manifest.json', mf);

let h = readFileSync('src/harness.js', 'utf8');
if (!h.includes('survivalTests'))
  h = h.replace("      if (typeof CF.persistTests === 'function') await CF.persistTests(r);",
    "      if (typeof CF.survivalTests === 'function') await CF.survivalTests(r);\n      if (typeof CF.persistTests === 'function') await CF.persistTests(r);");
writeFileSync('src/harness.js', h);

let p = readFileSync('src/player.js', 'utf8');
p = p.replace('const speed = i.sprint ? SPRINT : i.sneak ? SNEAK : WALK;',
  'const speed = (i.sprint && (!CF.canSprint || CF.canSprint())) ? SPRINT : i.sneak ? SNEAK : WALK;');
writeFileSync('src/player.js', p);

let it = readFileSync('src/interact.js', 'utf8');
it = it.replace("if (e.button === 2) CF.place(CF.aim());",
  "if (e.button === 2) { if (!(CF.useHeld && CF.useHeld())) CF.place(CF.aim()); }");
writeFileSync('src/interact.js', it);
console.log('survival wired:', mf.includes('survival.js'), h.includes('survivalTests'), p.includes('canSprint'), it.includes('useHeld'));
