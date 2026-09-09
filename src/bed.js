// Bed + weather (#041). 1.12.2: bed = 2 cells (foot/head + facing stored in flat[] bits 4-6,
// no collision with torch codes (<=8) or fluid levels (<=7)). Sleep only 12542..23541, refuses with
// hostile monsters within 16, sets spawn, fades to black and skips to dawn (time 0), clearing rain.
// Weather v1: rain cycles ~10-20min, 25% thunderstorms; lightning = sky flash + strike damage (no fire,
// no charged creepers yet - #044). Procedural bed tiles in the last two FREE atlas cells -> functional:false.
window.CF = window.CF || {};
(function () {
  const CF = window.CF;
  const CH_TOP = 128;
  const meta = (window.__TEXMETA = window.__TEXMETA || {});
  if (!meta.bed_side) meta.bed_side = { x: 80, y: 160, w: 16, h: 16, src: 'generated:bed.js' };
  if (!meta.bed_top) meta.bed_top = { x: 96, y: 160, w: 16, h: 16, src: 'generated:bed.js' };
  const DIRV = [[1, 0], [-1, 0], [0, 1], [0, -1]]; // +X -X +Z -Z
  CF.dirFromYaw = (yaw) => { const s = Math.sin(yaw), c = Math.cos(yaw); return Math.abs(s) > Math.abs(c) ? (s > 0 ? 0 : 1) : (c > 0 ? 2 : 3); };

  CF.bedPlace = (x, y, z, dir) => { // foot at (x,y,z), head = foot+dir; needs 2x air + 2x solid-below
    const W = CF.world, bed = CF.IDOF['bed'];
    const [dx, dz] = DIRV[dir];
    if (!W.get(x, y - 1, z) || W.get(x, y, z) || !W.get(x + dx, y - 1, z + dz) || W.get(x + dx, y, z + dz)) return false;
    if (CF.player && Math.abs(CF.player.pos[0] - (x + 0.5)) < 0.3 + 0.5 && Math.abs(CF.player.pos[2] - (z + 0.5)) < 0.3 + 0.5 &&
      CF.player.pos[1] - 0.9 < y + 1 && CF.player.pos[1] + 0.9 > y) return false;
    W.set(x, y, z, bed); W.flatSet && W.flatSet(x, y, z, dir << 4);
    W.set(x + dx, y, z + dz, bed); W.flatSet && W.flatSet(x + dx, y, z + dz, dir << 4 | 64);
    if (!CF.creative && CF.consume) CF.consume(CF.held(), 1);
    return true;
  };
  CF.bedBreak = (x, y, z) => { // any half breaks both
    const W = CF.world, f = (W.flatAt && W.flatAt(x, y, z)) || 0;
    const dir = (f >> 4) & 3, head = !!(f & 64);
    const [dx, dz] = DIRV[dir];
    const ox = head ? x - dx : x + dx, oz = head ? z - dz : z + dz;
    if (W.get(ox, y, oz) === CF.IDOF['bed']) W.set(ox, y, oz, 0);
    W.set(x, y, z, 0);
  };

  // ---- sleep sequence: fade to black, skip to dawn, set spawn on head cell, fade back
  CF.trySleep = (x, y, z) => {
    const t = CF.timeOfDay();
    if (!(t >= 12542 && t < 23542)) { CF.lastSleepFail = 'day'; return false; } // 1.12 night window
    if (CF.player && Math.hypot(CF.player.pos[0] - (x + 0.5), CF.player.pos[2] - (z + 0.5)) > 3) { CF.lastSleepFail = 'far'; return false; }
    const f = (CF.world.flatAt && CF.world.flatAt(x, y, z)) || 0;
    const dir = (f >> 4) & 3, head = !!(f & 64), [dx, dz] = DIRV[dir];
    const hx = head ? x : x + dx, hz = head ? z : z + dz; // 1.12: respawn anchored at head cell
    const foes = (CF.mobs ? CF.mobs.list : []).filter((m) => CF.MOBS[m.type].hostile && Math.hypot(m.pos[0] - hx, m.pos[2] - hz) < 16);
    if (foes.length) { CF.lastSleepFail = 'monsters'; return false; }
    CF.sleeping = { t: 0, hx, hy: y, hz };
    if (!CF.sleepEl) { CF.sleepEl = document.createElement('div'); CF.sleepEl.style.cssText = 'position:fixed;inset:0;background:#000;opacity:0;z-index:60;pointer-events:none'; document.body.appendChild(CF.sleepEl); }
    return true;
  };
  CF.finishSleepAtPeak = (s) => { // effects land at full black; fade-out continues in bedTick
    CF.timeOffset = (24000 - (CF.ticks % 24000)) % 24000; // timeOfDay -> dawn
    if (CF.player) CF.player.spawn = [s.hx + 0.5, s.hy + 2, s.hz + 0.5];
    CF.weather.on = false; CF.weather.thunder = false; CF.weather.time = 0; // sleeping clears weather (1.12)
  };

  // ---- weather v1 (1.12 timing): rain 12k-24k t, thunderstorm 25% of rains; long dry gaps
  CF.weather = CF.weather || { on: false, thunder: false, time: 0 };
  CF.raining = () => CF.weather.on;
  CF.strikeAt = (x, y, z) => {
    CF.lightFlash = 6;
    let sy = CH_TOP - 1; while (sy > 0 && !CF.solidAt(CF.world.get(x, sy, z))) sy--;
    const hit = (pos) => Math.hypot(pos[0] - x, pos[2] - z) < 3.5 && pos[1] > sy - 5 && pos[1] < sy + 6;
    if (CF.player && CF.survival && hit(CF.player.pos)) CF.damage(5, 'lightning');
    if (CF.mobs) for (const m of CF.mobs.list.slice()) if (hit(m.pos)) CF.mobs.hurt(m, 5, 'lightning'); // charged-creeper spawn -> #044
    CF.strikes = (CF.strikes || 0) + 1;
    return sy + 1;
  };

  CF.bedTick = () => {
    if (CF.sleeping) {
      const s = CF.sleeping;
      s.t++;
      if (CF.sleepEl) CF.sleepEl.style.opacity = s.t <= 30 ? (s.t / 30).toFixed(2) : Math.max(0, 1 - (s.t - 31) / 30).toFixed(2);
      if (s.t === 31) CF.finishSleepAtPeak(s);
      if (s.t > 61) { CF.sleeping = null; if (CF.sleepEl) CF.sleepEl.style.opacity = 0; }
    }
    const wt = CF.weather;
    if (wt.time > 0 && --wt.time === 0) wt.on = false;
    else if (!wt.on && wt.time <= 0 && Math.random() < 0.0002) { wt.on = true; wt.thunder = Math.random() < 0.25; wt.time = 12000 + Math.floor(Math.random() * 12000); }
    if (wt.on && wt.thunder && CF.player && Math.random() < 1 / 2400) {
      const a = Math.random() * Math.PI * 2, r = 8 + Math.random() * 24;
      const x = Math.floor(CF.player.pos[0] + Math.cos(a) * r), z = Math.floor(CF.player.pos[2] + Math.sin(a) * r);
      CF.world.ensureAround(x, z, 0);
      CF.strikeAt(x, 0, z);
    }
    if (CF.lightFlash > 0) CF.lightFlash--;
    if (CF.shake > 0) CF.shake--;
  };

  CF.useBed = (hit) => {
    if (!hit) return false;
    const id = CF.world.get(hit.x, hit.y, hit.z);
    if (!id || !CF.BY_ID[id] || CF.BY_ID[id].name !== 'bed') return false;
    return CF.trySleep(hit.x, hit.y, hit.z);
  };

  // ---- shot scenarios
  CF.shotScenarios = CF.shotScenarios || {};
  CF.shotScenarios['bed-sleep'] = async () => {
    CF.freeCam = true;
    const W = CF.world, P = CF.player;
    W.ensureAround(8, 8, 3); for (let i = 0; i < 60 && W.stats().queue; i++) W.tick();
    const h = W.heightAt(8, 8);
    CF.survival = true; CF.stats.hp = 20; if (CF.mobs) CF.mobs.clear(); CF.mobSense = false;
    P.spawn = [8.5, h + 1, 8.5];
    CF.timeOffset = (18000 - CF.ticks % 24000 + 24000) % 24000; // midnight
    const by = W.heightAt(11, 8) + 1;
    for (let x = 9; x <= 14; x++) for (let z = 6; z <= 10; z++) { const hh2 = W.heightAt(x, z); for (let y = hh2 + 1; y <= hh2 + 6; y++) W.set(x, y, z, 0); }
    const placed = CF.bedPlace(11, W.heightAt(11, 8) + 1, 8, 0);
    const slept = placed && CF.trySleep(11, W.heightAt(11, 8) + 1, 8);
    for (let t = 0; t <= 31; t++) CF.bedTick(); // fade to black + wake at dawn
    CF.timeOffset = (1000 - CF.ticks % 24000 + 24000) % 24000; // hold at sunrise glow
    for (let i = 0; i < 40 && (W.stats().dirty || W.stats().queue); i++) { W.tick(); CF.renderTick(); }
    CF.camera = { pos: [9, W.heightAt(11, 8) + 4.2, 5.2], yaw: 0.72, pitch: -0.5 };
    CF.renderDraw(CF.camera); await new Promise((res) => setTimeout(res, 150));
    CF.shotExtra = { placed, slept, time: Math.round(CF.timeOfDay()), spawn: P.spawn.map((v) => Math.round(v * 2) / 2) };
    CF.renderDraw(CF.camera);
  };
  CF.shotScenarios['storm-sky'] = async () => {
    await CF.shotScenarios['starter-world']();
    CF.weather.on = true; CF.weather.thunder = true; CF.weather.time = 5000;
    CF.timeOffset = (6000 - CF.ticks % 24000 + 24000) % 24000; // high noon, then gloom over it
    for (let i = 0; i < 30; i++) CF.renderTick();
    CF.renderDraw(CF.camera); await new Promise((res) => setTimeout(res, 150));
    CF.shotExtra = { raining: CF.raining(), thunder: CF.weather.thunder };
    CF.renderDraw(CF.camera);
  };

  // ---- test suite
  CF.bedTests = async (r) => {
    const W = CF.world, P = CF.player, ID = CF.IDOF;
    const surv0 = CF.survival, t0 = CF.timeOffset;
    CF.survival = true; CF.mobSense = false; CF.mobs && CF.mobs.clear();
    const bx = 120, bz = 120;
    W.ensureAround(bx, bz, 2); for (let i = 0; i < 30 && W.stats().queue; i++) W.tick();
    const by = W.heightAt(bx, bz) + 1;
    for (let x = bx - 2; x <= bx + 4; x++) for (let z = bz - 2; z <= bz + 2; z++) { const hh2 = W.heightAt(x, z); for (let y = hh2 + 1; y <= hh2 + 3; y++) W.set(x, y, z, 0); }
    CF.bedPlace(bx, by, bz, 0);
    CF.assert(r, 'bed.place', W.get(bx, by, bz) === ID['bed'] && W.get(bx + 1, by, bz) === ID['bed'] && (W.flatAt(bx, by, bz) & 64) === 0 && (W.flatAt(bx + 1, by, bz) & 64) !== 0);
    CF.bedBreak(bx + 1, by, bz);
    CF.assert(r, 'bed.break-both', W.get(bx, by, bz) === 0 && W.get(bx + 1, by, bz) === 0);
    CF.timeOffset = (6000 - CF.ticks % 24000 + 24000) % 24000;
    CF.bedPlace(bx, by, bz, 0);
    P.tp(bx - 1.5, by + 1.5, bz + 0.5); // ~2 from foot centre: in trySleep range, out of the bed cells
    CF.assert(r, 'bed.no-sleep-day', CF.trySleep(bx, by, bz) === false && CF.lastSleepFail === 'day');
    CF.timeOffset = (18000 - CF.ticks % 24000 + 24000) % 24000;
    const z5 = CF.mobs.spawn('zombie', bx + 6, W.heightAt(bx + 6, bz) + 1, bz);
    CF.assert(r, 'bed.no-sleep-monsters', CF.trySleep(bx, by, bz) === false && CF.lastSleepFail === 'monsters');
    CF.mobs.remove(z5);
    P.spawn = [bx, by, bz];
    CF.assert(r, 'bed.sleep-ok', CF.trySleep(bx, by, bz) === true);
    for (let t = 0; t <= 31; t++) CF.bedTick();
    const tod = CF.timeOfDay();
    CF.assert(r, 'bed.wake-dawn(t=' + Math.round(tod) + ')', tod < 60 || tod > 23940);
    CF.assert(r, 'bed.spawn-head', Math.abs(P.spawn[0] - (bx + 1.5)) < 0.01 && P.spawn[2] === bz + 0.5);
    CF.weather.on = true; CF.weather.time = 2; CF.weather.thunder = false;
    CF.bedTick(); CF.bedTick();
    CF.assert(r, 'bed.weather-stops', CF.weather.on === false && CF.raining() === false);
    const sx = 150, sy = 100, sz = 150;
    W.ensureAround(sx, sz, 1); for (let i = 0; i < 20 && W.stats().queue; i++) W.tick();
    W.set(sx, sy, sz, ID['stone']);
    const zz = CF.mobs.spawn('zombie', sx + 0.2, sy + 1, sz + 0.2);
    const strikeTop = CF.strikeAt(sx, 0, sz);
    CF.assert(r, 'bed.strike(hp=' + zz.hp + ',flash=' + CF.lightFlash + ',top=' + strikeTop + ')', zz.hp <= 15 && CF.lightFlash > 0 && strikeTop === sy + 1);
    CF.shake = 5; CF.bedTick();
    CF.assert(r, 'bed.shake-decays', CF.shake < 5);
    W.set(sx, sy, sz, 0); CF.mobs.clear(); CF.sleeping = null; if (CF.sleepEl) CF.sleepEl.style.opacity = 0;
    CF.survival = surv0; CF.timeOffset = t0; CF.mobSense = true;
  };
})();
