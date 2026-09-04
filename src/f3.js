// F3 debug overlay (Tier-1): fps, xyz, chunk, faced direction, aimed block, light-ish stats.
window.CF = window.CF || {};
(function () {
  const CF = window.CF;
  const div = document.createElement('div');
  div.id = 'f3';
  div.style.cssText = 'position:fixed;top:4px;left:4px;color:#fff;font:12px monospace;' +
    'text-shadow:1px 1px 0 #000;background:rgba(0,0,0,.35);padding:4px;display:none;z-index:10;pointer-events:none';
  if (document.body) document.body.appendChild(div);
  let on = false, frames = 0, fps = 0, last = performance.now();
  window.addEventListener('keydown', (e) => { if (e.code === 'F3') { on = !on; div.style.display = on ? 'block' : 'none'; } });
  setInterval(() => {
    frames++;
    const now = performance.now();
    if (now - last > 500) { fps = Math.round(frames * 1000 / (now - last)); frames = 0; last = now; }
    if (!on) return;
    const p = CF.player, t = CF.aim && CF.aim();
    const b = t ? CF.BY_ID[CF.world.get(t.x, t.y, t.z)] : null;
    div.textContent = 'Cubeforge F3\n' +
      `${fps} fps  ticks ${CF.ticks}\n` +
      (p ? `XYZ: ${p.pos.map((v) => v.toFixed(2)).join(' / ')}\n` +
        `Chunk: ${Math.floor(p.pos[0] / 16)}, ${Math.floor(p.pos[2] / 16)}  facing ${yawFace(p.yaw)}\n` : '') +
      `Target: ${b ? b.name + (b.variant !== 'default' ? ':' + b.variant : '') + ` [${t.x} ${t.y} ${t.z}]` : 'none'}\n` +
      `Chunks: ${CF.world ? CF.world.stats().chunks : 0}  Tris: ${CF.rendererStats ? CF.rendererStats.tris : 0}\n` +
      `Time: ${CF.timeOfDay ? CF.timeOfDay() : 0}  Daylight: ${CF.dayFactor ? Math.round(CF.dayFactor() * 100) : 100}%\n` +
      `Seed: ${CF.world ? CF.world.seed : '-'}  Hotbar: ${CF.hotbar ? CF.hotbar[CF.sel] : '-'}\n` +
      `Drops: ${CF.drops ? CF.drops.length : 0}`;
  }, 250);
  function yawFace(y) {
    const w = ((Math.round(((y % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 2)) % 4 + 4) % 4;
    return ['south', 'west', 'north', 'east'][w];
  }
  CF.f3Tests = async (r) => {
    CF.assert(r, 'f3.overlay-exists', !!document.getElementById('f3'));
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F3' }));
    CF.assert(r, 'f3.toggle', div.style.display === 'block');
    await new Promise((res) => setTimeout(res, 400));
    const txt = div.textContent;
    CF.assert(r, 'f3.content', txt.includes('fps') && txt.includes('XYZ') && txt.includes('Chunk') && txt.includes('Target') && txt.includes('Seed'));
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F3' }));
  };
})();
