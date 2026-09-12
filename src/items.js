// Items, inventory, crafting (1.12 recipes), tools (speeds/tiers), furnace smelting (#024).
window.CF = window.CF || {};
(function () {
  const CF = window.CF;
  const STACK = 64;

  const TOOLS = { wood: { tier: 1, speed: 2 }, stone: { tier: 2, speed: 4 }, iron: { tier: 3, speed: 6 }, diamond: { tier: 4, speed: 8 } };
  const MAT_ITEM = { wood: 'planks', stone: 'cobblestone', iron: 'iron_ingot', diamond: 'diamond' };
  CF.ITEMS = {
    stick: { tile: 'item_stick' },
    coal: { tile: 'item_coal' },
    iron_ingot: { tile: 'item_iron_ingot' },
    gold_ingot: { tile: 'item_gold_ingot' },
    diamond: { tile: 'item_diamond' },
    apple: { tile: 'item_apple', food: 4 },
    rotten_flesh: { food: 4, poison: true }, // 1.12: +4 food, 80% poison II 4s (poison effect lands with #036 combat)
    sapling: { tile: 'item_sapling' },
    flint: { tile: 'item_flint' },
    shears: { tile: 'item_shears', tool: { type: 'shears', tier: 0, speed: 1 }, stack: 1 },
    flint_and_steel: { stack: 1 }, // #042 igniter (durability ignored in Tier-1)
    // #043 buckets (1.12: stack 1; fetch liquid SOURCES only; placing creates a new source)
    bucket: { tile: 'item_bucket', stack: 1 },
    water_bucket: { tile: 'item_water_bucket', stack: 1 },
    lava_bucket: { tile: 'item_lava_bucket', stack: 1 },
    // mob drops + passive products (#037/#038). No atlas tiles yet -> blank icons (tracked #044); counts/logic tested.
    bone: {}, arrow: {}, gunpowder: {}, string: {}, feather: {}, leather: {}, ink_sac: {},
    egg: {}, wheat: { tile: 'item_wheat' }, carrot: { tile: 'item_carrot', food: 3 }, potato: { tile: 'item_potato', food: 1 }, wheat_seeds: { tile: 'item_wheat_seeds' }, bread: { tile: 'item_bread', food: 5 }, // #054 farm icons landed (blank-icons era over)
    raw_porkchop: { food: 3 }, cooked_porkchop: { food: 8 },
    raw_beef: { food: 3 }, steak: { food: 8 },
    mutton: { food: 2 }, cooked_mutton: { food: 6 },
    raw_chicken: { food: 2, poison: 0.3 }, cooked_chicken: { food: 6 },
    wool: {}, // superseded by the wool BLOCK family (#050) - bare item kept for sheep drop compat
    clay_ball: {}, brick: {}, // #051 chain items (icons -> #048)
    quartz: { tile: 'item_quartz' }, // #056 nether quartz (quartz_ore drop; smelting->quartz_block = #048/later)
  };
  for (const [mat, info] of Object.entries(TOOLS))
    for (const shape of ['pickaxe', 'axe', 'shovel', 'sword', 'hoe'])
      CF.ITEMS[mat + '_' + shape] = { tile: 'item_' + mat + '_' + shape, tool: { type: shape, tier: info.tier, speed: info.speed }, stack: 1 };

  CF.itemDef = (name) => {
    if (CF.ITEMS[name]) return CF.ITEMS[name];
    let reg = CF.REGISTRY[name], vk = null;
    if (name.indexOf(':') > 0) { const p = name.split(':'); reg = CF.REGISTRY[p[0]]; vk = p[1]; } // #049: variant items ('log:birch')
    if (reg) { const k = vk || Object.keys(reg.variants)[0]; return { tile: reg.variants[k].tiles[0], block: true }; }
    return null;
  };

  // ---- inventory (36 slots: 0-8 hotbar)
  CF.inv = new Array(36).fill(null);
  CF.give = (name, n = 1) => {
    const max = (CF.itemDef(name) || {}).stack || STACK; // 1.12: tools/buckets = 1 (others 64)
    let left = n;
    for (let i = 0; i < 36 && left > 0; i++) {
      const s = CF.inv[i];
      if (s && s.name === name && s.count < max) { const add = Math.min(max - s.count, left); s.count += add; left -= add; }
    }
    for (let i = 0; i < 36 && left > 0; i++) if (!CF.inv[i]) { const add = Math.min(max, left); CF.inv[i] = { name, count: add }; left -= add; }
    return left; // leftover (inv full)
  };
  CF.countItem = (name) => CF.inv.reduce((s, it) => s + (it && it.name === name ? it.count : 0), 0);
  CF.consume = (name, n = 1) => {
    if (CF.countItem(name) < n) return false;
    let left = n;
    for (let i = 0; i < 36 && left > 0; i++) {
      const s = CF.inv[i];
      if (s && s.name === name) { const t = Math.min(s.count, left); s.count -= t; left -= t; if (!s.count) CF.inv[i] = null; }
    }
    return true;
  };
  CF.held = () => CF.inv[CF.sel] && CF.inv[CF.sel].name;
  CF.heldDef = () => { const h = CF.held(); return h ? CF.itemDef(h) : null; };

  // ---- break-time with held tool (model documented in REFERENCE §tool tiers)
  CF.canHarvest = (blockV, heldName) => {
    if (!blockV.tool) return true;
    const d = heldName && CF.ITEMS[heldName];
    if (!d || !d.tool) return false;
    return d.tool.type === blockV.tool && d.tool.tier >= (blockV.minTier || 0);
  };
  CF.breakTimeFor = (blockV, heldName) => {
    if (blockV.hardness < 0) return Infinity;
    const d = heldName && CF.ITEMS[heldName];
    if (CF.canHarvest(blockV, heldName)) {
      const speed = d && d.tool ? d.tool.speed : 1;
      return blockV.hardness * 1.5 / speed;
    }
    return blockV.hardness * 5;
  };

  // ---- crafting: shaped (1.12 patterns) + shapeless; grid = array of size*size {name}|null
  const P = (rows, key, out, n) => ({ rows, key, out: { name: out, n } });
  CF.RECIPES = [
    { shapeless: { log: 1 }, out: { name: 'planks', n: 4 } },
    P(['p', 'p'], { p: 'planks' }, 'stick', 4),
    P(['pp', 'pp'], { p: 'planks' }, 'crafting_table', 1),
    P(['ccc', 'c c', 'ccc'], { c: 'cobblestone' }, 'furnace', 1),
    P(['ccc', 'c c', 'ccc'], { c: 'planks' }, 'chest', 1),
    P(['c', 's'], { c: 'coal', s: 'stick' }, 'torch', 4),
    P(['mmm', ' s ', ' s '], null, 'pickaxe', 4), // materials expanded below
    P(['mm', 'ms', ' s'], null, 'axe', 4),
    P(['m', 's', 's'], null, 'shovel', 4),
    P(['m', 'm', 's'], null, 'sword', 4),
    P([' i', 'i '], { i: 'iron_ingot' }, 'shears', 1),
    P(['www', 'ppp'], { w: 'wool', p: 'planks' }, 'bed', 1), // #041 (1.12: any colours; single white simplification)
    // #042 TNT (1.12: 5 gunpowder + 4 sand) + flint & steel (1.12: iron ingot + flint)
    P(['gsg', 'sgs', 'gsg'], { g: 'gunpowder', s: 'sand' }, 'tnt', 1),
    P(['i', 'f'], { i: 'iron_ingot', f: 'flint' }, 'flint_and_steel', 1),
    P(['i i', ' i '], { i: 'iron_ingot' }, 'bucket', 1), // #043 (1.12 V pattern, 3 ingots)
    P(['mm ', ' s ', ' s '], null, 'hoe', 4), // #054 (1.12 hoe; materials expanded below)
    P(['www'], { w: 'wheat' }, 'bread', 1), // #054 (3 wheat -> 1 bread)
    // #051 storage compression/uncraft + brick
    P(['iii', 'iii', 'iii'], { i: 'iron_ingot' }, 'iron_block', 1),
    P(['ggg', 'ggg', 'ggg'], { i: 'gold_ingot', g: 'gold_ingot' }, 'gold_block', 1),
    P(['ddd', 'ddd', 'ddd'], { i: 'diamond', d: 'diamond' }, 'diamond_block', 1),
    P(['bb', 'bb'], { b: 'brick' }, 'brick_block', 1),
    // #052 slabs: 3 same material in a row -> 6
    P(['ccc'], { c: 'cobblestone' }, 'stone_slab:cobblestone', 6),
    P(['sss'], { s: 'stone' }, 'stone_slab:stone', 6),
    P(['ppp'], { p: 'planks' }, 'wooden_slab:oak', 6),
    // #053 stairs: 1+2+3 staircase pattern -> 6 (1.12: oak 53, stone_stairs=COBBLE 67, brick 108)
    P(['p  ', 'pp ', 'ppp'], { p: 'planks' }, 'oak_stairs', 6),
    P(['c  ', 'cc ', 'ccc'], { c: 'cobblestone' }, 'stone_stairs', 6),
    P(['b  ', 'bb ', 'bbb'], { b: 'brick_block' }, 'brick_stairs', 6),
    { shapeless: { iron_block: 1 }, out: { name: 'iron_ingot', n: 9 } },
    { shapeless: { gold_block: 1 }, out: { name: 'gold_ingot', n: 9 } },
    { shapeless: { diamond_block: 1 }, out: { name: 'diamond', n: 9 } },
  ];
  const baseTools = CF.RECIPES.filter((x) => x.rows && !x.key);
  for (const mat of ['wood', 'stone', 'iron', 'diamond'])
    for (const b of baseTools)
      CF.RECIPES.push({ rows: b.rows, key: { m: MAT_ITEM[mat], s: 'stick' }, out: { name: mat + '_' + b.out.name, n: 1 } });
  CF.RECIPES = CF.RECIPES.filter((x) => (x.key || x.shapeless) && baseTools.indexOf(x) < 0);

  function normalize(grid, size) {
    let r0 = size, r1 = -1, c0 = size, c1 = -1;
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++)
      if (grid[r * size + c]) { r0 = Math.min(r0, r); r1 = Math.max(r1, r); c0 = Math.min(c0, c); c1 = Math.max(c1, c); }
    if (r1 < 0) return null;
    const rows = [];
    for (let r = r0; r <= r1; r++) rows.push(grid.slice(r * size + c0, r * size + c1 + 1).map((s) => s && s.name));
    return rows;
  }
  CF.tryCraft = (grid, size) => {
    const names = grid.filter(Boolean).map((s) => s.name);
    const filled = grid.reduce((s, x) => s + (x ? x.count : 0), 0);
    for (const rec of CF.RECIPES) {
      if (rec.shapeless) {
        const need = Object.entries(rec.shapeless);
        if (names.length !== need.length) continue;
        const pool = names.slice();
        let ok = true;
        for (const [matName, cnt] of need) {
          const want = MAT_ITEM[matName] || matName;
          const i = pool.indexOf(want);
          if (i < 0) { ok = false; break; }
          pool.splice(i, 1);
        }
        if (ok) return { out: rec.out, count: 1 };
        continue;
      }
      const rows = normalize(grid, size);
      if (!rows || rows.length !== rec.rows.length) continue;
      let ok = true;
      const consumed = {};
      for (let r = 0; r < rows.length && ok; r++) {
        const wlen = Math.max(rows[r].length, rec.rows[r].length); // #054: compare full pattern width (a 2-wide hoe grid must NOT match the 3-wide pickaxe whose col-2 went unchecked)
        for (let c = 0; c < wlen && ok; c++) {
          const rc = c < rec.rows[r].length ? rec.rows[r][c] : ' ';
          const want = rc === ' ' ? null : (rec.key[rc] || '?');
          const got = c < rows[r].length ? rows[r][c] : null;
          if (want !== got) ok = false;
          if (got) consumed[got] = (consumed[got] || 0) + 1;
        }
      }
      if (ok) return { out: rec.out, count: Math.floor(filled ? 1 : 1) };
    }
    return null;
  };
  CF.craftOnce = (slots) => {
    // slots: array (4 or 9) of inventory indices forming the crafting grid
    const size = slots.length === 9 ? 3 : 2;
    const grid = slots.map((i) => CF.inv[i] || null);
    const res = CF.tryCraft(grid, size);
    if (!res) return null;
    for (const i of slots) {
      if (CF.inv[i]) { CF.inv[i].count--; if (!CF.inv[i].count) CF.inv[i] = null; }
    }
    CF.give(res.out.name, res.out.n);
    return res.out;
  };

  // ---- furnace block entities + smelting (200t/item, coal fuel 1600t)
  CF.blockEntities = {};
  const SMELT = { iron_ore: 'iron_ingot', gold_ore: 'gold_ingot', sand: 'glass', clay_ball: 'brick' }; // #051
  CF.FUEL = { coal: 1600, planks: 300, log: 300, stick: 100 };
  CF.furnacePlace = (x, y, z) => { CF.blockEntities[x + ',' + y + ',' + z] = { type: 'furnace', input: null, fuel: null, out: null, burn: 0, cook: 0 }; };
  // #040 chest: 27-slot container block entity (+ tiles drawn procedurally by render at load)
  const meta = (window.__TEXMETA = window.__TEXMETA || {});
  if (!meta.chest_side) meta.chest_side = { x: 48, y: 160, w: 16, h: 16, src: 'generated:items.js' };
  if (!meta.chest_top) meta.chest_top = { x: 64, y: 160, w: 16, h: 16, src: 'generated:items.js' };
  CF.chestPlace = (x, y, z) => { CF.blockEntities[x + ',' + y + ',' + z] = { type: 'chest', slots: new Array(27).fill(null) }; };
  CF.chestBreak = (x, y, z) => {
    const k = x + ',' + y + ',' + z, c = CF.blockEntities[k];
    if (!c || c.type !== 'chest') return 0;
    let n = 0;
    for (const s of c.slots) if (s && CF.give) { CF.give(s.name, s.count); n += s.count; }
    delete CF.blockEntities[k];
    CF.uiCloseContainer && CF.uiCloseContainer(k);
    return n;
  };
  CF.containerBreak = (name, x, y, z) => { if (name === 'furnace' && CF.furnaceBreak) CF.furnaceBreak(x, y, z); if (name === 'chest' && CF.chestBreak) CF.chestBreak(x, y, z); };
  // #043 bucket tiles (procedural, painted by render.js in free atlas row y=64)
  if (!meta.item_bucket) {
    meta.item_bucket = { x: 112, y: 160, w: 16, h: 16, src: 'generated:items.js' };
    meta.item_water_bucket = { x: 128, y: 160, w: 16, h: 16, src: 'generated:items.js' };
    meta.item_lava_bucket = { x: 144, y: 160, w: 16, h: 16, src: 'generated:items.js' };
  }
  CF.useBucket = (hit) => { // RMB: empty bucket + liquid source -> fill (source removed, MC-accurate); filled + air face-adjacent -> place new source
    if (!hit || !CF.world) return false;
    const W = CF.world, held = CF.held && CF.held();
    if (!held) return false;
    const swapHeld = (to) => { // stack-1 items: consume the held unit, give 'to' (same slot frees up first)
      const s = CF.inv[CF.sel];
      if (!s || s.name !== held) return false;
      s.count--; if (!s.count) CF.inv[CF.sel] = null;
      CF.give(to, 1);
      return true;
    };
    if (held === 'bucket') {
      const id = W.get(hit.x, hit.y, hit.z), v = id && CF.BY_ID[id];
      if (!v || !v.liquid || W.flatAt(hit.x, hit.y, hit.z) !== 0) return false; // 1.12: source blocks only (flow is immovable by bucket)
      W.set(hit.x, hit.y, hit.z, 0);
      return swapHeld(v.name === 'lava' ? 'lava_bucket' : 'water_bucket');
    }
    if (held === 'water_bucket' || held === 'lava_bucket') {
      const t = [hit.x + hit.face[0], hit.y + hit.face[1], hit.z + hit.face[2]];
      if (W.get(t[0], t[1], t[2])) return false; // air only (MC replaceable-block placement -> Tier-1 simplification)
      if (CF.cellHitsPlayer && CF.cellHitsPlayer(t[0], t[1], t[2])) return false; // never place fluid into yourself
      W.set(t[0], t[1], t[2], CF.IDOF[held === 'water_bucket' ? 'water' : 'lava']);
      if (W.flatSet) W.flatSet(t[0], t[1], t[2], 0); // level 0 = source
      return swapHeld('bucket');
    }
    return false;
  };
  // #032: breaking a furnace returns its contents to the player (no item entities in Tier-1)
  CF.furnaceBreak = (x, y, z) => {
    const k = x + ',' + y + ',' + z, f = CF.blockEntities[k];
    if (!f) return;
    for (const s of [f.input, f.fuel, f.out]) if (s && CF.give) CF.give(s.name, s.count);
    delete CF.blockEntities[k];
    CF.uiCloseContainer && CF.uiCloseContainer(k);
  };
  CF.furnaceTick = () => {
    for (const k in CF.blockEntities) {
      const f = CF.blockEntities[k];
      if (f.type !== 'furnace') continue;
      const canSmelt = f.input && SMELT[f.input.name] && (f.out === null || (f.out.name === SMELT[f.input.name] && f.out.count < STACK));
      if (f.burn === 0 && canSmelt && f.fuel && CF.FUEL[f.fuel.name]) {
        f.burn = CF.FUEL[f.fuel.name]; f.burnMax = CF.FUEL[f.fuel.name];
        f.fuel.count--; if (!f.fuel.count) f.fuel = null;
      }
      if (f.burn > 0 && canSmelt) {
        f.burn--; f.cook++;
        if (f.cook >= 200) {
          f.cook = 0;
          const prod = SMELT[f.input.name];
          f.input.count--; if (!f.input.count) f.input = null;
          f.out = f.out ? { name: prod, count: f.out.count + 1 } : { name: prod, count: 1 };
        }
      } else if (f.burn > 0) f.burn--;
      else f.cook = 0;
    }
  };

  const origOnTick = CF.onTick;
  CF.onTick = () => { if (origOnTick) origOnTick(); CF.furnaceTick(); };

  // creative starter kit (survival switch comes in #026)
  if (CF.creative === undefined) {
    CF.creative = true;
    ['grass', 'dirt', 'stone', 'cobblestone', 'planks', 'log', 'leaves', 'glowstone', 'crafting_table'].forEach((n, i) => { CF.inv[i] = { name: n, count: 64 }; });
    CF.inv[8] = { name: 'torch', count: 16 };
  }

  // ---- tests
  CF.itemTests = async (r) => {
    const put = (i, name, n = 1) => { CF.inv[i] = { name, count: n }; };
    // log -> 4 planks (shapeless)
    CF.inv.fill(null);
    put(0, 'log', 1);
    let res = CF.craftOnce([0, 1, 2, 3]);
    CF.assert(r, 'items.planks(' + JSON.stringify(res) + ')', res && res.name === 'planks' && CF.countItem('planks') === 4 && CF.countItem('log') === 0);
    // sticks: 2 planks vertical -> 4 (slot grid is row-major: vertical = slots 0 & 2)
    CF.inv.fill(null); put(0, 'planks', 1); put(2, 'planks', 1);
    CF.craftOnce([0, 1, 2, 3]);
    CF.assert(r, 'items.stick', CF.countItem('stick') === 4 && CF.countItem('planks') === 0);
    // torch: coal over stick -> 4
    CF.inv.fill(null); put(0, 'coal', 1); put(2, 'stick', 1);
    CF.craftOnce([0, 1, 2, 3]);
    CF.assert(r, 'items.torch(t=' + CF.countItem('torch') + ',c=' + CF.countItem('coal') + ')', CF.countItem('torch') === 4 && CF.countItem('coal') === 0 && CF.countItem('stick') === 0);
    // crafting table 2x2 planks
    CF.inv.fill(null); for (let i = 0; i < 4; i++) put(i, 'planks', 1);
    CF.craftOnce([0, 1, 2, 3]);
    CF.assert(r, 'items.table(' + CF.countItem('crafting_table') + ')', CF.countItem('crafting_table') === 1);
    // iron pickaxe 3x3 pattern
    CF.inv.fill(null); put(20, 'iron_ingot', 1); put(21, 'iron_ingot', 1); put(22, 'iron_ingot', 1); put(24, 'stick', 1); put(27, 'stick', 1);
    res = CF.craftOnce([20, 21, 22, 23, 24, 25, 26, 27, 28]);
    CF.assert(r, 'items.iron-pickaxe(' + CF.countItem('iron_pickaxe') + ',' + (res && res.name) + ')', CF.countItem('iron_pickaxe') === 1 && res && res.name === 'iron_pickaxe');
    // #053 stairs: 1+2+3 staircase pattern -> 6 oak stairs
    CF.inv.fill(null); for (const s of [20, 23, 24, 26, 27, 28]) put(s, 'planks', 1);
    res = CF.craftOnce([20, 21, 22, 23, 24, 25, 26, 27, 28]);
    CF.assert(r, 'items.stairs-craft(' + CF.countItem('oak_stairs') + ',' + (res && res.name) + ')', CF.countItem('oak_stairs') === 6 && res && res.name === 'oak_stairs' && CF.countItem('planks') === 0);
    // #054: hoe (2 mats + 2 sticks diagonal) + bread (3 wheat)
    CF.inv.fill(null); put(20, 'planks', 1); put(21, 'planks', 1); put(24, 'stick', 1); put(27, 'stick', 1);
    res = CF.craftOnce([20, 21, 22, 23, 24, 25, 26, 27, 28]);
    CF.assert(r, 'items.hoe-craft(' + CF.countItem('wood_hoe') + ',' + (res && res.name) + ')', CF.countItem('wood_hoe') === 1 && res && res.name === 'wood_hoe');
    CF.inv.fill(null); for (const s of [20, 21, 22]) put(s, 'wheat', 1);
    res = CF.craftOnce([20, 21, 22, 23, 24, 25, 26, 27, 28]);
    CF.assert(r, 'items.bread-craft(' + CF.countItem('bread') + ')', CF.countItem('bread') === 1 && CF.countItem('wheat') === 0);
    // tool speeds per model: stone w/ wood pick = 1.125s, w/ hand = 7.5s, iron ore w/ stone pick harvests
    const stoneV = CF.REGISTRY.stone.variants.default;
    CF.assert(r, 'items.speed-stone-wood(' + CF.breakTimeFor(stoneV, 'wood_pickaxe') + ')',
      Math.abs(CF.breakTimeFor(stoneV, 'wood_pickaxe') - 1.125) < 0.01 && Math.abs(CF.breakTimeFor(stoneV, null) - 7.5) < 0.01);
    const goldV = CF.REGISTRY.gold_ore.variants.default;
    CF.assert(r, 'items.gate-gold', CF.canHarvest(goldV, 'wood_pickaxe') === false && CF.canHarvest(goldV, 'iron_pickaxe') === true);
    // furnace smelt: iron_ore + coal -> iron_ingot after 200 ticks
    CF.furnacePlace(1, 1, 1);
    const f = CF.blockEntities['1,1,1'];
    f.input = { name: 'iron_ore', count: 1 }; f.fuel = { name: 'coal', count: 1 };
    for (let i = 0; i < 202; i++) CF.furnaceTick();
    CF.assert(r, 'items.smelt(' + (f.out && f.out.name + f.out.count) + ')', f.out && f.out.name === 'iron_ingot' && f.out.count === 1 && f.input === null);
    delete CF.blockEntities['1,1,1'];
    // torch: light 14 propagates (uses the #020 light engine)
    CF.world.ensureAround(60, 60, 2);
    for (let i = 0; i < 20 && CF.world.stats().queue; i++) CF.world.tick();
    let th2 = 0;
    for (let dx = -2; dx <= 6; dx++) th2 = Math.max(th2, CF.world.heightAt(60 + dx, 60));
    const ty2 = th2 + 2;
    CF.world.set(60, ty2, 60, CF.IDOF['torch']);
    CF.world.ensureLight(3, 3);
    const tl = CF.world.lightAt(60, ty2, 61) & 15;
    const tl2 = CF.world.lightAt(60, ty2, 64) & 15;
    const tl0 = CF.world.lightAt(60, ty2, 60) & 15;
    const tidHere = CF.world.get(60, ty2, 60);
    CF.assert(r, 'items.torch-light(src=' + tl0 + ',id=' + tidHere + ',lid=' + (CF.IDOF['torch']) + ',l=' + (CF.BY_ID[tidHere] && CF.BY_ID[tidHere].light) + ',adj=' + tl + ',' + tl2 + ')', tl === 13 && tl2 === 10);
    // give/stack/consume
    CF.inv.fill(null);
    CF.give('dirt', 70);
    CF.assert(r, 'items.stack', CF.countItem('dirt') === 70 && CF.inv[0].count === 64 && CF.inv[1].count === 6);
    CF.assert(r, 'items.consume', CF.consume('dirt', 65) && CF.countItem('dirt') === 5 && !CF.consume('dirt', 6));
    CF.inv.fill(null);
    for (let i = 0; i < 9; i++) CF.inv[i] = { name: 'iron_ingot', count: 1 };
    CF.craftOnce([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    const packed = CF.countItem('iron_block');
    CF.inv.fill(null); CF.inv[0] = { name: 'iron_block', count: 1 };
    CF.craftOnce([0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (i === 0 ? 0 : 30)));
    const unpacked = CF.countItem('iron_ingot');
    CF.assert(r, 'items.storage-9x1(' + packed + ',' + unpacked + ')', packed === 1 && unpacked === 9);
    // ---- #043 buckets (1.12 semantics: source-only pickup, source placement, stack 1)
    {
      const W = CF.world, bx = 220, bz = 220;
      CF.inv.fill(null);
      for (let i = 0; i < 3; i++) CF.inv[i] = { name: 'iron_ingot', count: 1 }; // V needs 3 SEPARATE ingots in 3x3 cells
      CF.craftOnce([0, 30, 1, 30, 2, 30, 30, 30, 30]); // row-major grid: irons at cells 0,2,4
      CF.assert(r, 'items.bucket-craft(' + CF.countItem('bucket') + ',' + CF.countItem('iron_ingot') + ')', CF.countItem('bucket') === 1 && CF.countItem('iron_ingot') === 0);
      W.ensureAround(bx, bz, 1);
      for (let i = 0; i < 40 && W.stats().queue; i++) W.tick();
      const bh = Math.max(W.heightAt(bx, bz), 8);
      for (let x = bx - 3; x <= bx + 3; x++) for (let z = bz - 3; z <= bz + 3; z++) {
        for (let y = bh + 1; y <= bh + 4; y++) W.set(x, y, z, 0);
        W.set(x, bh, z, CF.IDOF['stone']);
      }
      W.set(bx, bh + 1, bz, CF.IDOF['water']); // fresh liquid = level 0 = source
      CF.inv.fill(null); CF.inv[0] = { name: 'bucket', count: 1 }; CF.sel = 0;
      const got = CF.useBucket({ x: bx, y: bh + 1, z: bz, face: [0, 1, 0] });
      CF.assert(r, 'items.bucket-fill(' + got + ',w=' + W.get(bx, bh + 1, bz) + ',b=' + CF.countItem('bucket') + ',wb=' + CF.countItem('water_bucket') + ')',
        got && W.get(bx, bh + 1, bz) === 0 && CF.countItem('water_bucket') === 1 && CF.countItem('bucket') === 0);
      // flowing water (level>0) is NOT bucketable in 1.12
      W.set(bx, bh + 1, bz, CF.IDOF['water']); W.flatSet(bx, bh + 1, bz, 4);
      CF.inv[0] = { name: 'bucket', count: 1 };
      const noFlow = CF.useBucket({ x: bx, y: bh + 1, z: bz, face: [0, 1, 0] });
      CF.assert(r, 'items.bucket-no-flow(' + noFlow + ',w=' + W.get(bx, bh + 1, bz) + ')', noFlow === false && W.get(bx, bh + 1, bz) === CF.IDOF['water']);
      W.set(bx, bh + 1, bz, 0);
      // place stored water as a fresh source
      CF.inv.fill(null); CF.inv[0] = { name: 'water_bucket', count: 1 };
      const placed = CF.useBucket({ x: bx + 2, y: bh, z: bz, face: [0, 1, 0] });
      CF.assert(r, 'items.bucket-place(' + placed + ',w=' + W.get(bx + 2, bh + 1, bz) + ',lv=' + W.flatAt(bx + 2, bh + 1, bz) + ',b=' + CF.countItem('bucket') + ')',
        placed && W.get(bx + 2, bh + 1, bz) === CF.IDOF['water'] && W.flatAt(bx + 2, bh + 1, bz) === 0 && CF.countItem('bucket') === 1 && CF.countItem('water_bucket') === 0);
      // lava: source bucket + placed lava glows (block light 15) - dry column (z-3): the water from the
      // place test crested flow along row bz and would obsidian-ify the lava (which would be MC-correct!)
      W.set(bx, bh + 1, bz - 3, CF.IDOF['lava']);
      CF.inv.fill(null); CF.inv[0] = { name: 'bucket', count: 1 };
      const lavaGot = CF.useBucket({ x: bx, y: bh + 1, z: bz - 3, face: [0, 1, 0] });
      CF.inv[0] = { name: 'lava_bucket', count: 1 };
      const lavaPlaced = CF.useBucket({ x: bx, y: bh, z: bz - 3, face: [0, 1, 0] });
      W.ensureLight(bx >> 4, bz >> 4);
      for (let i = 0; i < 20; i++) W.tick();
      const lglow = W.lightAt(bx, bh + 1, bz - 2) & 15;
      const lself = W.lightAt(bx, bh + 1, bz - 3) & 15;
      CF.assert(r, 'items.bucket-lava(' + lavaGot + ',' + lavaPlaced + ',glow=' + lglow + '/' + lself + ',l=' + W.get(bx, bh + 1, bz - 3) + ')',
        lavaGot && lavaPlaced && W.get(bx, bh + 1, bz - 3) === CF.IDOF['lava'] && lglow >= 14);
      // stack 1: three water buckets never merge
      CF.inv.fill(null); CF.give('water_bucket', 3);
      const maxStack = CF.inv.reduce((m, s) => Math.max(m, s && s.name === 'water_bucket' ? s.count : 0), 0);
      CF.assert(r, 'items.bucket-stack1(mx=' + maxStack + ',n=' + CF.inv.filter((s) => s).length + ')', maxStack === 1 && CF.inv.filter((s) => s).length === 3);
      // placement into the player's own cell is refused (MC) - run in a CLEAN column (z+3): the placed
      // water source above already crested lv3 flow toward bx while these ticks ran
      CF.inv.fill(null); CF.inv[0] = { name: 'water_bucket', count: 1 }; CF.sel = 0;
      CF.player.tp(bx + 0.5, bh + 1, bz + 3.5); CF.player.onGround = false; // tp keeps stale onGround (PLAYBOOK trap)
      const refused = CF.useBucket({ x: bx, y: bh, z: bz + 3, face: [0, 1, 0] }); // target cell = feet cell
      CF.assert(r, 'items.bucket-self-place(' + refused + ',w=' + W.get(bx, bh + 1, bz + 3) + ')', refused === false && W.get(bx, bh + 1, bz + 3) === 0);
      CF.player.tp(8.5, CF.world.heightAt(8, 8) + 2, 8.5);
      CF.inv.fill(null);
      for (let x = bx - 4; x <= bx + 5; x++) for (const zz of [bz, bz + 3]) W.set(x, bh + 1, zz, 0); // wipe test fluid + any spread
    }
  };
})();
