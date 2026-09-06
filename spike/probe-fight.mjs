import { runBrowser, toFileUrl, p } from '../tools/lib.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
let html = readFileSync('game/index.html', 'utf8');
const probe = `document.title='FPROBE:'+encodeURIComponent(JSON.stringify({
      hp: CF.stats.hp, atkTick: CF.atkTick, mobHp: z.hp,
      P: P.pos.map(v => +v.toFixed(2)), Z: z.pos.map(v => +v.toFixed(2)),
      cam: CF.camera.pos.map(v => +v.toFixed(2)), yaw: +CF.camera.yaw.toFixed(3),
      mtris: CF.rendererStats.mtris, px: CF.readCenter(),
      grid: (() => { const g = []; const w = CF.canvas.width, hgt = CF.canvas.height;
        for (const [fx, fy] of [[0.3, 0.4], [0.5, 0.4], [0.7, 0.4], [0.85, 0.4], [0.5, 0.25]]) {
          const q = new Uint8Array(4); CF.gl.readPixels((w * fx) | 0, (hgt * (1 - fy)) | 0, 1, 1, CF.gl.RGBA, CF.gl.UNSIGNED_BYTE, q); g.push([fx, fy, q[0], q[1], q[2]]); }
        return g; })()
    }));\n    `;
html = html.split('CF.renderDraw(CF.camera);').join(probe + 'CF.renderDraw(CF.camera);');
writeFileSync('game/probe-tmp.html', html);
const dom = runBrowser({ url: toFileUrl(p('game', 'probe-tmp.html')) + '?seed=5#shot=mob-fight', dumpDom: true, budget: 12000, timeout: 90000 });
const m = dom.match(/FPROBE:([^<]*)/);
console.log(m ? JSON.stringify(JSON.parse(decodeURIComponent(m[1])), null, 1) : 'NONE: ' + (dom.match(/<title>([^<]*)</) || [])[1]);
