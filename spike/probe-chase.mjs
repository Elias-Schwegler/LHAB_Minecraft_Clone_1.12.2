import { runBrowser } from '../tools/lib.mjs';
import { readFileSync } from 'node:fs';
// instrument: append stats probe to the chase scenario end by monkeypatching via hash param is messy;
// simpler: run the page normally and dump what the scenario leaves - patch a probe into the built file in temp.
let html = readFileSync('game/index.html', 'utf8');
html = html.replace(
  "CF.shotExtra = { distToPlayer: +d.toFixed(2) };",
  `CF.shotExtra = { distToPlayer: +d.toFixed(2) };
    document.title = 'PROBE:' + encodeURIComponent(JSON.stringify({
      tris: CF.rendererStats.tris, mapped: CF.rendererStats.mapped, glErr: CF.rendererStats.glErr,
      mtris: CF.rendererStats.mtris, px: CF.readCenter(), cam: CF.camera.pos.map(v => +v.toFixed(1)),
      torchL: CF.world.lightAt(12, CF.world.heightAt(12, 8) + 1, 8), missing: [...(CF.rendererStats.missingTiles || [])].slice(0, 5),
      tex: !!CF.rendererStats.ready, mobs: CF.mobs.list.length }));`
);
const out = 'spike/probe-shot.html';
import('node:fs').then(({ writeFileSync }) => {
  writeFileSync(out, html);
  const dom = runBrowser({ url: 'file:///' + out.replace(/\\/g, '/') + '?seed=5#shot=mob-chase', dumpDom: true, budget: 9000, timeout: 90000 });
  const m = dom.match(/PROBE:([^<]*)/);
  console.log(m ? JSON.stringify(JSON.parse(decodeURIComponent(m[1])), null, 1) : 'NO PROBE — title was: ' + (dom.match(/<title>([^<]*)<\/title>/) || [])[0]);
});
