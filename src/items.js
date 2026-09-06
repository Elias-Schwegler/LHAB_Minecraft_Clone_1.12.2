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
    shears: { tile: 'item_shears', tool: { type: 'shears', tier: 0, speed: 1 } },
  };
  for (const [mat, info] of Object.entries(TOOLS))
    for (const shape of ['pickaxe', 'axe', 'shovel', 'sword'])
      CF.ITEMS[mat + '_' + shape] = { tile: 'item_' + mat + '_' + shape, tool: { type: shape, tier: info.tier, speed: info.speed } };

  CF.itemDef = (name) => {
    if (CF.ITEMS[name]) return CF.ITEMS[name];
    const reg = CF.REGISTRY[name];
    if (reg) { const k = Object.keys(reg.variants)[0]; return { tile: reg.variants[k].tiles[0], block: true }; }
    return null;
  };

  // ---- inventory (36 slots: 0-8 hotbar)
  CF.inv = new Array(36).fill(null);
  CF.give = (name, n = 1) => {
    let left = n;
    for (let i = 0; i < 36 && left > 0; i++) {
      const s = CF.inv[i];
      if (s && s.name === name && s.count < STACK) { const add = Math.min(STACK - s.count, left); s.count += add; left -= add; }
    }
    for (let i = 0; i < 36 && left > 0; i++) if (!CF.inv[i]) { const add = Math.min(STACK, left); CF.inv[i] = { name, count: add }; left -= add; }
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
      for (let r = 0; r < rows.length && ok; r++)
        for (let c = 0; c < rows[r].length && ok; c++) {
          const want = rec.key[rec.rows[r][c]] || (rec.rows[r][c] === ' ' ? null : '?');
          const got = rows[r][c];
          const wantN = rec.rows[r][c] === ' ' ? null : want;
          if (wantN !== got) ok = false;
          if (got) consumed[got] = (consumed[got] || 0) + 1;
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
  const SMELT = { iron_ore: 'iron_ingot', gold_ore: 'gold_ingot', sand: 'glass' };
  CF.FUEL = { coal: 1600, planks: 300, log: 300, stick: 100 };
  CF.furnacePlace = (x, y, z) => { CF.blockEntities[x + ',' + y + ',' + z] = { type: 'furnace', input: null, fuel: null, out: null, burn: 0, cook: 0 }; };
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
  };
})();
