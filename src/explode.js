// Explosion (#037 creeper / #042 TNT): 1.12.2 ray-marched block destruction + entity damage.
// Algorithm per docs/REFERENCE + wiki: 16^3 rays from centre, intensity = power*rand(0.7..1.3),
// march 0.3/step, subtract (blastRes+0.3)*0.3 per solid crossed and 0.22500001 after; destroy if >0.
// Entity: impact=(1-dist/(2*power))*exposure; damage=((impact^2+impact)/2)*(7*2*power)+1 (NORMAL, no scaling).
// Block-drop-as-item (prob 1/power) deferred to item-entities (#044); we do destruction (mobGriefing on).
window.CF = window.CF || {};
(function () {
  const CF = window.CF;
  // 1.12.2 blast resistance by name (default 2.0). obsidian/bedrock effectively indestructible.
  const BLAST = {
    bedrock: 3600, obsidian: 1200, enchanting_table: 1200, anvil: 1200, mob_spawner: 1200,
    stone: 6, cobblestone: 6, mossy_cobblestone: 6, brick_block: 6, stonebrick: 6, planks: 3,
    log: 4, crafting_table: 2.5, furnace: 3.5, coal_ore: 3, iron_ore: 3, gold_ore: 3, diamond_ore: 3,
    emerald_ore: 3, lapis_ore: 3, redstone_ore: 3, quartz_ore: 3,
    dirt: 0.5, grass: 0.6, sand: 0.5, gravel: 0.6, clay: 0.6, sandstone: 0.8, snow: 0.2, snow_layer: 0.2,
    glass: 0.3, glowstone: 0.3, leaves: 0.2, torch: 0, bookshelf: 1.5, tnt: 0,
  };
  CF.blastRes = (id) => { const b = CF.BY_ID[id]; const raw = b ? (BLAST[b.name] != null ? BLAST[b.name] : 2.0) : 0; return raw / 5; }; // MC divides explosionResistance by 5 (stone 6->1.2, obsidian 1200->240)

  function exposure(x, y, z, ex, ey, ez) { // fraction of sampled path points that are non-solid
    let clear = 0, n = 6;
    for (let i = 1; i <= n; i++) {
      const t = i / (n + 1);
      const id = CF.world.get(Math.floor(x + (ex - x) * t), Math.floor(y + (ey - y) * t), Math.floor(z + (ez - z) * t));
      if (!CF.solidAt(id)) clear++;
    }
    return clear / n;
  }

  CF.explode = (x, y, z, power) => {
    const W = CF.world, destroyed = new Set();
    for (let rx = 0; rx < 16; rx++) for (let ry = 0; ry < 16; ry++) for (let rz = 0; rz < 16; rz++) {
      let dx = rx / 15 * 2 - 1, dy = ry / 15 * 2 - 1, dz = rz / 15 * 2 - 1;
      const len = Math.hypot(dx, dy, dz) || 1; dx /= len; dy /= len; dz /= len;
      let intensity = power * (0.7 + Math.random() * 0.6);
      for (let d = 0; d < power * 2 && intensity > 0; d += 0.3) {
        const bx = Math.floor(x + dx * d), by = Math.floor(y + dy * d), bz = Math.floor(z + dz * d);
        const id = W.get(bx, by, bz);
        if (id) {
          const res = CF.blastRes(id);
          intensity -= (res + 0.3) * 0.3;
          if (intensity > 0) destroyed.add(bx + ',' + by + ',' + bz);
          intensity -= 0.22500001;
        }
      }
    }
    for (const k of destroyed) { const [bx, by, bz] = k.split(',').map(Number); if (W.get(bx, by, bz)) W.set(bx, by, bz, 0); }
    // entity damage: players + mobs
    const hurt = (pos, isPlayer) => {
      const dist = Math.hypot(pos[0] - x, pos[1] - y, pos[2] - z);
      if (dist > power * 2) return 0;
      const impact = (1 - dist / (2 * power)) * exposure(x, y, z, pos[0], pos[1], pos[2]);
      if (impact <= 0) return 0;
      const dmg = ((impact * impact + impact) / 2) * (7 * 2 * power) + 1;
      return Math.round(dmg * 10) / 10;
    };
    const result = { destroyed: destroyed.size, playerDmg: 0 };
    if (CF.player && CF.survival !== undefined) {
      const pd = hurt(CF.player.pos, true);
      if (pd > 0) { result.playerDmg = pd; CF.damage(pd, 'explosion'); }
    }
    if (CF.mobs) for (const m of CF.mobs.list.slice()) {
      const md = hurt(m.pos, false);
      if (md > 0 && CF.mobs.hurt) CF.mobs.hurt(m, md, 'explosion');
    }
    CF.shake = 18; // render/camera shake counter (#037+ polish)
    return result;
  };
})();
