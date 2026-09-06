// Inventory & hotbar UI (#025): DOM overlay, atlas-sliced icons, click-drag transfer, 2x2 crafting.
window.CF = window.CF || {};
(function () {
  const CF = window.CF;
  const ICON_SCALE = 3;

  CF.ui = {
    open: false,
    ghost: null,          // {name,count} carried by cursor
    craft: [null, null, null, null],
    craftSize: 2,
    container: null,      // #032: blockEntity key while a container GUI (furnace) is open
  };

  // #032: generic slot accessors across inv / craft grid / container blockEntities
  const be = () => (CF.ui.container && CF.blockEntities) ? CF.blockEntities[CF.ui.container] : null;
  function slotGet(kind, i) {
    if (kind === 'inv') return CF.inv[i];
    if (kind === 'craft') return CF.ui.craft[i];
    const f = be(); if (!f) return null;
    return kind === 'fin' ? f.input : kind === 'ffuel' ? f.fuel : kind === 'fout' ? f.out : null;
  }
  function slotSet(kind, i, s) {
    if (kind === 'inv') { CF.inv[i] = s; return; }
    if (kind === 'craft') { CF.ui.craft[i] = s; updateResult(); return; }
    const f = be(); if (!f) return;
    if (kind === 'fin') f.input = s; else if (kind === 'ffuel') f.fuel = s; else f.out = s;
  }

  const style = document.createElement('style');
  style.textContent =
    '#hud{position:fixed;bottom:6px;left:50%;transform:translateX(-50%);display:flex;gap:3px;z-index:20}' +
    '.slot{width:44px;height:44px;background:rgba(0,0,0,.45);border:2px solid #6b6b6b;position:relative;box-sizing:border-box;image-rendering:pixelated;cursor:pointer}' +
    '.slot.sel{border-color:#fff;box-shadow:0 0 0 2px rgba(255,255,255,.35)}' +
    '.slot .cnt{position:absolute;right:1px;bottom:0;color:#fff;font:bold 12px monospace;text-shadow:1px 1px 0 #000}' +
    '#inv{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(20,20,20,.85);' +
    'border:2px solid #555;padding:10px;display:none;z-index:30;color:#fff;font:12px monospace}' +
    '#inv .grid{display:grid;grid-template-columns:repeat(9,40px);gap:3px}' +
    '#inv .cgrid{display:grid;grid-template-columns:repeat(2,40px);gap:3px}' +
    '#inv .slot{width:36px;height:36px;border-width:2px}' +
    '#inv h4{margin:6px 0 3px;font-weight:normal;color:#bbb}' +
    '#ghost{position:fixed;width:32px;height:32px;pointer-events:none;z-index:40;display:none;image-rendering:pixelated}' +
    '.icon{position:absolute;inset:0;background-repeat:no-repeat}' +
    '#furn{display:none;margin:6px 0;padding:6px;border:1px solid #666}' +
    '#furn .row{display:flex;gap:8px;align-items:center;justify-content:center}' +
    '#furn .bar{width:22px;height:36px;background:#333;border:1px solid #555;position:relative;overflow:hidden}' +
    '#furn .bar>i{position:absolute;left:0;right:0;bottom:0;background:#e8a33d;display:block}';
  document.head ? document.head.appendChild(style) : document.addEventListener('DOMContentLoaded', () => document.head.appendChild(style));

  const ICON_URL = window.__ATLAS_B64 ? 'url(data:image/png;base64,' + window.__ATLAS_B64 + ')' : 'none';
  function iconCss(tile) {
    const meta = (window.__TEXMETA || {})[tile];
    if (!meta) return { backgroundImage: 'none' };
    const S = ICON_SCALE;
    return {
      backgroundImage: ICON_URL,
      backgroundSize: 128 * S + 'px ' + 128 * S + 'px',
      backgroundPosition: '-' + meta.x * S + 'px -' + meta.y * S + 'px',
    };
  }
  function itemTile(name) {
    const d = CF.itemDef && CF.itemDef(name);
    return d ? d.tile : null;
  }

  function mkSlot(kind, i) {
    const d = document.createElement('div');
    d.className = 'slot';
    d.dataset.kind = kind; d.dataset.i = i;
    d.innerHTML = '<div class="icon"></div><div class="cnt"></div>';
    d.addEventListener('mousedown', (e) => { e.preventDefault(); uiClick(kind, i, e.button === 2 || e.shiftKey); });
    d.addEventListener('mouseenter', (e) => { if (CF.ui.ghost && e.shiftKey) uiClick(kind, i, true); });
    return d;
  }

  let hud, inv, ghostEl, hudSlots = [], invSlots = [], craftSlots = [], resultSlot = null;
  let furnEl, finSlot, ffuelSlot, foutSlot, burnBar, cookArrow;

  function build() {
    hud = document.createElement('div'); hud.id = 'hud';
    for (let i = 0; i < 9; i++) { const s = mkSlot('inv', i); hudSlots.push(s); hud.appendChild(s); }
    inv = document.createElement('div'); inv.id = 'inv';
    const title = document.createElement('div'); title.textContent = 'Inventory (E to close)';
    inv.appendChild(title);
    const cgWrap = document.createElement('div'); cgWrap.innerHTML = '<h4>Crafting</h4>';
    const cg = document.createElement('div'); cg.className = 'cgrid';
    for (let i = 0; i < 4; i++) { const s = mkSlot('craft', i); craftSlots.push(s); cg.appendChild(s); }
    resultSlot = mkSlot('result', 0); resultSlot.classList.add('result');
    const resWrap = document.createElement('div'); resWrap.appendChild(cg);
    const resLbl = document.createElement('div'); resLbl.innerHTML = '<h4>→</h4>';
    resWrap.style.display = 'flex'; resWrap.style.gap = '8px'; resWrap.style.alignItems = 'center';
    resWrap.appendChild(resLbl); resWrap.appendChild(resultSlot);
    cgWrap.appendChild(resWrap); inv.appendChild(cgWrap);
    const g4 = document.createElement('div'); g4.innerHTML = '<h4>Main</h4>';
    const grid = document.createElement('div'); grid.className = 'grid';
    for (let i = 9; i < 36; i++) { const s = mkSlot('inv', i); invSlots.push(s); grid.appendChild(s); }
    g4.appendChild(grid);
    // #032 furnace section (input / fuel / flame+cook bars / output), shown when a furnace is open
    furnEl = document.createElement('div'); furnEl.id = 'furn';
    const ft = document.createElement('h4'); ft.textContent = 'Furnace'; furnEl.appendChild(ft);
    const row = document.createElement('div'); row.className = 'row';
    finSlot = mkSlot('fin', 0);
    const midCol = document.createElement('div'); midCol.style.cssText = 'display:flex;flex-direction:column;gap:3px;align-items:center';
    burnBar = document.createElement('div'); burnBar.className = 'bar'; burnBar.innerHTML = '<i></i>';
    cookArrow = document.createElement('div'); cookArrow.className = 'bar'; cookArrow.innerHTML = '<i style="background:#9fd0ff"></i>';
    midCol.appendChild(burnBar); midCol.appendChild(cookArrow);
    foutSlot = mkSlot('fout', 0);
    ffuelSlot = mkSlot('ffuel', 0);
    const row2 = document.createElement('div'); row2.className = 'row'; row2.style.marginTop = '4px'; row2.appendChild(ffuelSlot);
    row.appendChild(finSlot); row.appendChild(midCol); row.appendChild(foutSlot);
    furnEl.appendChild(row); furnEl.appendChild(row2);
    inv.appendChild(furnEl);
    inv.appendChild(g4);
    ghostEl = document.createElement('div'); ghostEl.id = 'ghost';
    const gi = document.createElement('div'); gi.className = 'icon'; ghostEl.appendChild(gi);
    document.body.appendChild(hud); document.body.appendChild(inv); document.body.appendChild(ghostEl);
    refresh();
  }
  if (document.body) build(); else document.addEventListener('DOMContentLoaded', build);

  function paint(el, stack) {
    const icon = el.querySelector('.icon'), cnt = el.querySelector('.cnt');
    if (!stack) { icon.style.cssText = 'position:absolute;inset:0;background-repeat:no-repeat'; cnt.textContent = ''; return; }
    Object.assign(icon.style, { position: 'absolute', inset: '0', backgroundRepeat: 'no-repeat' }, iconCss(itemTile(stack.name)));
    cnt.textContent = stack.count > 1 ? stack.count : '';
  }

  function refresh() {
    if (!hud) return;
    for (let i = 0; i < 9; i++) {
      paint(hudSlots[i], CF.inv[i]);
      hudSlots[i].classList.toggle('sel', i === CF.sel);
    }
    for (let i = 0; i < invSlots.length; i++) paint(invSlots[i], CF.inv[i + 9]);
    for (let i = 0; i < 4; i++) paint(craftSlots[i], CF.ui.craft[i]);
    updateResult();
    paint(resultSlot, CF.ui.result);
    if (furnEl) {
      const on = !!CF.ui.container && !!be();
      furnEl.style.display = on ? 'block' : 'none';
      CF.ui.container && !be() && (CF.ui.container = null); // BE gone (broken/loaded away): just close panel
      if (on) {
        const f = be();
        paint(finSlot, f.input); paint(ffuelSlot, f.fuel); paint(foutSlot, f.out);
        burnBar.firstChild.style.height = (f.burnMax ? 100 * f.burn / f.burnMax : 0) + '%';
        cookArrow.firstChild.style.height = Math.min(100, f.cook / 2) + '%'; // 200t cook -> 2%/tick
      }
    }
    if (CF.ui.ghost) {
      ghostEl.style.display = 'block';
      Object.assign(ghostEl.querySelector('.icon').style, { position: 'absolute', inset: '0', backgroundRepeat: 'no-repeat' }, iconCss(itemTile(CF.ui.ghost.name)));
      ghostEl.querySelector('.cnt') || 0;
    } else ghostEl.style.display = 'none';
    // recompute result from current craft grid
  }

  function updateResult() {
    const grid = CF.ui.craft.map((s) => s || null);
    CF.ui.result = null;
    const res = CF.tryCraft ? CF.tryCraft(grid, 2) : null;
    if (res) CF.ui.result = { name: res.out.name, count: res.out.n };
  }

  function place(stack, kind, i) {
    if (kind === 'inv') {
      const cur = CF.inv[i];
      if (!cur) { CF.inv[i] = stack; return null; }
      if (cur.name === stack.name) {
        const move = Math.min(64 - cur.count, stack.count);
        cur.count += move; stack.count -= move;
        return stack.count > 0 ? stack : null;
      }
      CF.inv[i] = stack; return cur;
    }
    if (kind === 'craft') {
      const cur = CF.ui.craft[i];
      CF.ui.craft[i] = stack;
      updateResult();
      return cur || null;
    }
    if (kind === 'fout') return stack; // #032: furnace output is take-only (1.12)
    if (kind === 'fin' || kind === 'ffuel') {
      const cur = slotGet(kind, i);
      if (!cur) { slotSet(kind, i, stack); return null; }
      if (cur.name === stack.name) {
        const move = Math.min(64 - cur.count, stack.count);
        cur.count += move; stack.count -= move;
        return stack.count > 0 ? stack : null;
      }
      slotSet(kind, i, stack); return cur;
    }
    return stack;
  }

  CF.uiClick = (kind, i, quick) => {
    if (kind === 'result') {
      if (!CF.ui.result) return;
      const r = CF.ui.result;
      // consume inputs: 1 from each non-empty craft slot
      for (let c = 0; c < 4; c++) if (CF.ui.craft[c]) { CF.ui.craft[c].count--; if (!CF.ui.craft[c].count) CF.ui.craft[c] = null; }
      const left = CF.give ? CF.give(r.name, r.count) : r.count;
      if (left) CF.ui.ghost = { name: r.name, count: left };
      refresh();
      return;
    }
    if (quick) {
      // shift-click: move inv <-> craft? v1: inv<->hotbar quickmove within inv array
      if (kind === 'inv' && CF.inv[i] && !CF.ui.ghost) {
        const s = CF.inv[i];
        const target = i < 9 ? 9 + CF.inv.slice(9).findIndex((x) => !x) : i % 9;
        if (target >= 0 && target < 36 && !CF.inv[target]) { CF.inv[target] = s; CF.inv[i] = null; refresh(); }
      }
      return;
    }
    const cur = slotGet(kind, i);
    if (!CF.ui.ghost) {
      if (!cur) return;
      if (kind === 'result') return;
      CF.ui.ghost = cur;
      slotSet(kind, i, null);
    } else {
      CF.ui.ghost = place(CF.ui.ghost, kind, i);
    }
    refresh();
  };

  function moveGhost(e) {
    if (!ghostEl) return;
    ghostEl.style.left = e.clientX + 8 + 'px';
    ghostEl.style.top = e.clientY + 8 + 'px';
  }
  window.addEventListener('mousemove', moveGhost);

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyE') {
      CF.ui.open = !CF.ui.open;
      if (inv) inv.style.display = CF.ui.open ? 'block' : 'none';
      if (!CF.ui.open && CF.ui.ghost) { CF.give(CF.ui.ghost.name, CF.ui.ghost.count); CF.ui.ghost = null; }
      if (!CF.ui.open) for (let i = 0; i < 4; i++) if (CF.ui.craft[i]) { CF.give(CF.ui.craft[i].name, CF.ui.craft[i].count); CF.ui.craft[i] = null; }
      if (!CF.ui.open) CF.ui.container = null; // #032: closing kills container view (contents stay in BE)
      refresh();
    }
    if (e.code === 'Escape' && CF.ui.open) window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));
  });
  window.addEventListener('mouseup', (e) => { if (CF.blockPlaceAt && e.button === 1) { /* middle: reserved */ } });

  // #032: right-click block use (furnace opens its GUI instead of placing)
  CF.useBlock = (hit) => {
    if (!hit || !CF.blockEntities) return false;
    const k = hit.x + ',' + hit.y + ',' + hit.z;
    const f = CF.blockEntities[k];
    if (f && f.type === 'furnace') { CF.uiOpenContainer(k); return true; }
    return false;
  };
  CF.uiOpenContainer = (k) => {
    CF.ui.container = k;
    if (!CF.ui.open) { CF.ui.open = true; if (inv) inv.style.display = 'block'; }
    refresh();
  };
  CF.uiCloseContainer = (k) => { if (CF.ui.container === k) { CF.ui.container = null; refresh(); } };

  CF.uiRefresh = refresh;
  setInterval(() => { if (document.getElementById('hud')) refresh(); }, 200);

  // ---- tests
  CF.uiTests = async (r) => {
    CF.assert(r, 'ui.hotbar', !!document.getElementById('hud') && document.querySelectorAll('#hud .slot').length === 9);
    CF.assert(r, 'ui.icon-live', (() => {
      const ic = document.querySelector('#hud .slot .icon');
      return ic && ic.style.backgroundImage.includes('data:image/png');
    })());
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit3' }));
    CF.assert(r, 'ui.sel', CF.sel === 2 && document.querySelectorAll('#hud .slot')[2].classList.contains('sel'));
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));
    CF.assert(r, 'ui.open', document.getElementById('inv').style.display === 'block');
    // drag: move cobblestone (inv[3]) to empty slot 20 by two clicks
    CF.inv.fill(null); CF.inv[3] = { name: 'cobblestone', count: 10 };
    CF.ui.ghost = null;
    CF.uiClick('inv', 3); CF.uiClick('inv', 20);
    CF.assert(r, 'ui.drag', CF.inv[20] && CF.inv[20].name === 'cobblestone' && !CF.inv[3]);
    // craft through UI: 1 log into craft grid -> planks x4 result -> collect
    CF.inv.fill(null); CF.inv[5] = { name: 'log', count: 2 };
    CF.ui.craft = [null, null, null, null]; CF.ui.ghost = null;
    CF.uiClick('inv', 5); CF.uiClick('craft', 0);   // pickup log, place in craft grid
    CF.assert(r, 'ui.result', CF.ui.result && CF.ui.result.name === 'planks' && CF.ui.result.count === 4);
    CF.uiClick('result', 0);
    CF.assert(r, 'ui.craft-collect', CF.countItem('planks') === 4 && CF.countItem('log') === 0 && CF.ui.craft[0] && CF.ui.craft[0].name === 'log');
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));
    CF.assert(r, 'ui.close', document.getElementById('inv').style.display === 'none');

    // ---- #032 furnace GUI
    const fx = 7, fy = Math.floor(CF.world.heightAt(70, 70)) + 2, fz = 70;
    CF.world.ensureAround(70, 70, 1);
    for (let i = 0; i < 10 && CF.world.stats().queue; i++) CF.world.tick();
    CF.world.set(fx, fy, fz, CF.IDOF['furnace']);
    CF.furnacePlace(fx, fy, fz);
    CF.assert(r, 'ui.furn-open', CF.useBlock({ x: fx, y: fy, z: fz }) === true
      && CF.ui.container === fx + ',' + fy + ',' + fz
      && document.getElementById('furn').style.display === 'block');
    CF.inv.fill(null); CF.ui.ghost = null;
    CF.inv[0] = { name: 'iron_ore', count: 2 }; CF.inv[1] = { name: 'coal', count: 3 };
    CF.uiClick('inv', 0); CF.uiClick('fin', 0);
    CF.uiClick('inv', 1); CF.uiClick('ffuel', 0);
    const f = CF.blockEntities[fx + ',' + fy + ',' + fz];
    CF.assert(r, 'ui.furn-insert(in=' + (f.input && f.input.name) + ',f=' + (f.fuel && f.fuel.name) + ')',
      f.input.name === 'iron_ore' && f.fuel.name === 'coal' && f.burn === 0);
    for (let i = 0; i < 202; i++) CF.furnaceTick();
    CF.assert(r, 'ui.furn-smelt(out=' + (f.out && f.out.name + f.out.count) + ',burn=' + f.burn + ')',
      f.out.name === 'iron_ingot' && f.out.count === 1 && f.input.name === 'iron_ore' && f.input.count === 1 && f.burn > 0);
    CF.uiClick('fout', 0);
    CF.assert(r, 'ui.furn-takeout', CF.ui.ghost && CF.ui.ghost.name === 'iron_ingot' && f.out === null);
    CF.ui.ghost = { name: 'cobblestone', count: 1 };
    CF.uiClick('fout', 0);
    CF.assert(r, 'ui.furn-noout-insert', CF.ui.ghost && CF.ui.ghost.name === 'cobblestone' && f.out === null);
    CF.ui.ghost = null;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));
    CF.assert(r, 'ui.furn-close', CF.ui.container === null && CF.blockEntities[fx + ',' + fy + ',' + fz].input.name === 'iron_ore');
    CF.inv.fill(null);
    CF.furnaceBreak(fx, fy, fz);
    CF.assert(r, 'ui.furn-break-contents', CF.countItem('iron_ore') === 1 && CF.countItem('coal') === 2 && !CF.blockEntities[fx + ',' + fy + ',' + fz]); // 3 coal minus 1 burned
  };

  // ---- shot scenarios
  CF.shotScenarios = CF.shotScenarios || {};
  CF.shotScenarios['ui-hotbar'] = async () => {
    CF.freeCam = false;
    const P = CF.player, W = CF.world;
    W.ensureAround(30, 30, 2);
    for (let i = 0; i < 30 && W.stats().queue; i++) W.tick();
    P.tp(30.5, W.heightAt(30, 30) + 3, 30.5);
    P.yaw = 0.9; P.pitch = -0.12;
    for (let i = 0; i < 30; i++) { CF.playerTick(); CF.renderTick(); await new Promise((x) => setTimeout(x, 30)); }
    CF.renderDraw(CF.camera);
    await new Promise((x) => setTimeout(x, 200));
  };
  CF.shotScenarios['ui-inventory'] = async () => {
    await CF.shotScenarios['ui-hotbar']();
    CF.inv[12] = { name: 'log', count: 3 };
    CF.uiClick ? (CF.ui.open || window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }))) : 0;
    CF.uiClick('inv', 12); CF.uiClick('craft', 0);
    CF.uiClick('inv', 14); // second log? shapeless only needs 1
    refresh();
    CF.renderDraw(CF.camera);
    await new Promise((x) => setTimeout(x, 200));
  };
  CF.shotScenarios['ui-furnace'] = async () => {
    await CF.shotScenarios['ui-hotbar']();
    const P = CF.player, W = CF.world;
    const fx = Math.floor(P.pos[0]) + 2, fz = Math.floor(P.pos[2]), fy = W.heightAt(fx, fz) + 1;
    W.set(fx, fy, fz, CF.IDOF['furnace']);
    CF.furnacePlace(fx, fy, fz);
    const f = CF.blockEntities[fx + ',' + fy + ',' + fz];
    f.input = { name: 'iron_ore', count: 3 }; f.fuel = { name: 'coal', count: 2 };
    for (let i = 0; i < 150; i++) CF.furnaceTick(); // part-smelted: flame + cook bars mid-progress, 0 output yet
    CF.useBlock({ x: fx, y: fy, z: fz });
    CF.renderDraw(CF.camera);
    await new Promise((res) => setTimeout(res, 200)); // shot is taken AFTER this fn returns - keep GUI open
  };
})();
