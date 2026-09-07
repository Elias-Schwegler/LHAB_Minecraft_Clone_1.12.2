// Survival mode (#026): health, hunger/saturation, fall damage, lava, drowning, respawn, HUD.
// Model per docs/REFERENCE.md §physics/hunger (1.12 simplified-exhaustion model).
window.CF = window.CF || {};
(function () {
  const CF = window.CF;
  const S = CF.stats = { hp: 20, food: 20, sat: 5, air: 300, deaths: 0 };
  CF.survival = false; // creative default (documented deviation: F4 toggles)

  let peakY = null, hurtCd = 0, regenAcc = 0, starveAcc = 0;

  const hud = document.createElement('div');
  hud.id = 'surv';
  hud.style.cssText = 'position:fixed;bottom:56px;left:50%;transform:translateX(-50%);display:none;gap:0;z-index:21;font:13px monospace';
  hud.innerHTML = '<div id="hearts" style="display:flex;gap:1px"></div><div id="food" style="display:flex;gap:1px;margin-left:60%"></div>';
  // #047: append synchronously when body already exists (scripts run at </body>) - the old
  // Promise.resolve().then() deferred one microtask so getElementById('hearts') could miss it
  // when a test suite ran before the flush (latent since #026, hit by the bedsuite standalone).
  if (document.body) document.body.appendChild(hud);
  else document.addEventListener('DOMContentLoaded', () => document.body.appendChild(hud));

  const HEART = '#c03028', EMPTY = '#3a3a3a', FOODC = '#c88038', DRY = '#2e2e2e';
  function pip(el, n, max, colorFull, colorEmpty, half) {
    el.innerHTML = '';
    for (let i = 0; i < max; i++) {
      const d = document.createElement('div');
      const full = n >= (i + 1) * 2, halfNow = !full && n === i * 2 + 1;
      d.style.cssText = 'width:8px;height:12px;background:' + (full ? colorFull : halfNow ? colorFull : colorEmpty);
      if (halfNow) d.style.background = 'linear-gradient(90deg,' + colorFull + ' 50%,' + colorEmpty + ' 50%)';
      d.title = (full ? 2 : halfNow ? 1 : 0);
      el.appendChild(d);
    }
  }
  function hudRefresh() {
    const on = CF.survival;
    hud.style.display = on ? 'flex' : 'none';
    if (!on) return;
    const hc = document.getElementById('hearts'), fc = document.getElementById('food');
    if (hc) pip(hc, Math.max(0, Math.ceil(S.hp)), 10, HEART, EMPTY, true);
    if (fc) pip(fc, Math.max(0, Math.ceil(S.food)), 10, FOODC, DRY, false);
  }
  CF.survRefresh = hudRefresh;

  CF.canSprint = () => !CF.survival || S.food > 6;
  CF.damage = (n, why) => {
    if (!CF.survival || hurtCd > 0 && why !== 'fall') return;
    S.hp -= n;
    hurtCd = why === 'fall' ? 0 : 10; // 1.12: post-hurt no-damage window (0.5s) - #036
    if (why === 'drown') hurtCd = 20; // drown keeps its 1s rhythm (2 dmg/s)
    if (why) CF.lastHurt = why;
    if (S.hp <= 0) respawn();
  };
  function respawn() {
    S.deaths++;
    S.hp = 20; S.food = 20; S.sat = 5; S.air = 300;
    peakY = null; // stale fall-peaks must never damage across teleports (phantom-fall bug, #036)
    const P = CF.player;
    P.tp(P.spawn[0], P.spawn[1], P.spawn[2]);
    CF.lastDeathAt = CF.ticks;
  }

  CF.useHeld = () => {
    const held = CF.held && CF.held();
    if (!held) return false;
    const def = CF.ITEMS && CF.ITEMS[held];
    if (def && def.food && S.food < 20) {
      S.food = Math.min(20, S.food + def.food);
      S.sat = Math.min(S.food, S.sat + def.food * 0.5);
      CF.consume(held, 1);
      hudRefresh();
      return true;
    }
    return false;
  };

  const origOnTick = CF.onTick;
  CF.onTick = () => {
    if (origOnTick) origOnTick();
    const P = CF.player, W = CF.world;
    if (!P || !W) return;
    if (!P.spawn) P.spawn = P.pos.slice();
    if (hurtCd > 0) hurtCd--;

    // fall tracking
    if (P.onGround) {
      if (peakY !== null) {
        const dist = peakY - P.pos[1];
        S.lastFall = +dist.toFixed(2);
        if (dist > 3) {
          const inWater = W.get(Math.floor(P.pos[0]), Math.floor(P.pos[1] - 0.9), Math.floor(P.pos[2])) === CF.IDOF['water'];
          if (!inWater) CF.damage(Math.floor(dist - 3), 'fall');
        }
        peakY = null;
      }
    } else if (P.vel[1] < 0) {
      peakY = peakY === null ? P.pos[1] : Math.max(peakY, P.pos[1]);
    }

    if (!CF.survival) return;

    // exhaustion -> hunger
    const i = P.input;
    let ex = 0;
    if (P.onGround && (i.f || i.s || i.l || i.r)) ex = i.sprint && CF.canSprint() ? 0.08 : 0.01;
    if (i.jump && P.onGround) ex += 0.1;
    if (CF.mining) ex += 0.02;
    if (ex > 0) {
      S.sat -= ex;
      if (S.sat < 0) { S.food = Math.max(0, S.food + S.sat); S.sat = 0; }
    }

    // starvation
    if (S.food <= 0 && S.sat <= 0) {
      starveAcc++;
      if (starveAcc >= 80) { starveAcc = 0; if (S.hp > 1) CF.damage(1, 'starve'); }
    } else starveAcc = 0;

    // regeneration
    if (S.food >= 18 && S.sat > 0 && S.hp < 20) {
      regenAcc++;
      const rate = S.food >= 20 ? 40 : 80;
      if (regenAcc >= rate) { regenAcc = 0; S.hp = Math.min(20, S.hp + 1); S.sat = Math.max(0, S.sat - 1.5); }
    } else regenAcc = 0;

    // lava contact (body cells)
    const fx = Math.floor(P.pos[0]), fz = Math.floor(P.pos[2]);
    const fy1 = Math.floor(P.pos[1] - 0.8), fy2 = Math.floor(P.pos[1] + 0.8);
    if (W.get(fx, fy1, fz) === CF.IDOF['lava'] || W.get(fx, fy2, fz) === CF.IDOF['lava']) CF.damage(1, 'lava');

    // drowning (head in water)
    const head = W.get(fx, Math.floor(P.pos[1] + 0.72), fz) === CF.IDOF['water'];
    if (head) {
      S.air--;
      if (S.air <= 0) { S.air = 0; if (hurtCd <= 0) CF.damage(2, 'drown'); }
    } else if (S.air < 300) S.air = Math.min(300, S.air + 10);

    // void death
    if (P.pos[1] < -10) { S.hp = 0; respawn(); }

    hudRefresh();
  };

  window.addEventListener('keydown', (e) => {
    if (e.code === 'F4') {
      CF.survival = !CF.survival;
      if (CF.survival) { S.hp = 20; S.food = 20; S.sat = 5; }
      hudRefresh();
    }
  });
  CF.shotScenarios = CF.shotScenarios || {};
  CF.shotScenarios['hud-low'] = async () => {
    CF.freeCam = false;
    const P = CF.player, W = CF.world;
    W.ensureAround(30, 30, 2);
    for (let i = 0; i < 30 && W.stats().queue; i++) W.tick();
    P.tp(30.5, W.heightAt(30, 30) + 3, 30.5);
    P.yaw = 0.9; P.pitch = -0.15;
    CF.survival = true; S.hp = 7; S.food = 6; S.sat = 1; S.air = 240;
    for (let i = 0; i < 40; i++) { CF.playerTick(); CF.renderTick(); await new Promise((x) => setTimeout(x, 30)); }
    hudRefresh();
    CF.renderDraw(CF.camera);
    await new Promise((x) => setTimeout(x, 200));
  };
  setInterval(hudRefresh, 500);

  // ---- tests
  CF.survivalTests = async (r) => {
    const P = CF.player, W = CF.world;
    CF.survival = true; S.hp = 20; S.food = 20; S.sat = 5;
    W.ensureAround(P.spawn ? P.spawn[0] : 8, 8, 2);
    const gx = 100, gz = 100;
    W.ensureAround(gx, gz, 1);
    for (let i = 0; i < 10 && W.stats().queue; i++) W.tick();
    let gxx = gx, gzz = gz, found = false;
    for (let tries = 0; tries < 40 && !found; tries++) {
      const cx3 = gx + (tries % 8) * 3 - 9, cz3 = gz + Math.floor(tries / 8) * 3 - 6;
      const hh3 = W.heightAt(cx3, cz3);
      let clear = true;
      for (let y = hh3 + 1; y <= hh3 + 14; y++) if (W.get(cx3, y, cz3) || W.get(cx3 + 1, y, cz3) || W.get(cx3 - 1, y, cz3)) { clear = false; break; }
      if (clear) { gxx = cx3; gzz = cz3; found = true; }
    }
    CF.assert(r, 'surv.clear-spot', found === true);
    const gh = W.heightAt(gxx, gzz);
    // fall 10 blocks -> 7 dmg
    P.spawn = [gxx + 0.5, gh + 1, gzz + 0.5];
    P.tp(gxx + 0.5, gh + 12, gzz + 0.5);
    S.hp = 20; hurtCd = 0; peakY = null; P.onGround = false;
    for (let t = 0; t < 90; t++) { CF.playerTick(); CF.onTick(); if (P.onGround && t > 3) break; }
    // 1.12 formula floor(d-3): discrete sim peak-logging costs +/-1-2 blocks -> range assert (documented)
    CF.assert(r, 'surv.fall10(' + S.hp + ',f=' + S.lastFall + ')', S.hp >= 11 && S.hp <= 14 && P.onGround);
    // fall 3 blocks -> 0 dmg
    P.tp(gxx + 0.5, gh + 5, gzz + 0.5);
    S.hp = 20; hurtCd = 0; peakY = null; P.onGround = false;
    for (let t = 0; t < 90; t++) { CF.playerTick(); CF.onTick(); if (P.onGround && t > 3) break; }
    CF.assert(r, 'surv.fall3(' + S.hp + ')', S.hp === 20);
    // sprint gate
    S.food = 6;
    CF.assert(r, 'surv.sprint-gate', CF.canSprint() === false);
    S.food = 10;
    CF.assert(r, 'surv.sprint-ok', CF.canSprint() === true);
    // starvation floors at 1 hp
    S.food = 0; S.sat = 0; S.hp = 6; hurtCd = 0; starveAcc = 0;
    for (let t = 0; t < 2000; t++) CF.onTick();
    CF.assert(r, 'surv.starve-floor(' + S.hp + ')', S.hp === 1);
    // eating apple
    S.food = 10; S.sat = 0;
    CF.inv.fill(null); CF.give('apple', 1); CF.sel = 0;
    CF.useHeld();
    CF.assert(r, 'surv.eat(' + S.food + ')', S.food === 14 && CF.countItem('apple') === 0);
    // regen: full food heals
    S.food = 20; S.sat = 5; S.hp = 10; regenAcc = 0;
    for (let t = 0; t < 200; t++) CF.onTick();
    CF.assert(r, 'surv.regen(' + S.hp + ')', S.hp > 10);
    // death + respawn via void
    S.hp = 20; const d0 = S.deaths;
    P.tp(0, -30, 0);
    CF.onTick();
    CF.assert(r, 'surv.respawn(' + S.hp + ',' + S.deaths + ')', S.deaths === d0 + 1 && S.hp === 20 && P.pos[1] > -5);
    // HUD
    hudRefresh();
    CF.assert(r, 'surv.hud', document.getElementById('hearts').children.length === 10 && hud.style.display === 'flex');
    CF.survival = false; hudRefresh();
  };
})();
