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
    if (kind === 'cs') return f.slots[i]; // #040 chest 0..26
    return kind === 'fin' ? f.input : kind === 'ffuel' ? f.fuel : kind === 'fout' ? f.out : null;
  }
  function slotSet(kind, i, s) {
    if (kind === 'inv') { CF.inv[i] = s; return; }
    if (kind === 'craft') { CF.ui.craft[i] = s; updateResult(); return; }
    const f = be(); if (!f) return;
    if (kind === 'cs') { f.slots[i] = s; return; }
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
    '#chest{display:none;margin:6px 0;padding:6px;border:1px solid #666}' +
    '#furn .row{display:flex;gap:8px;align-items:center;justify-content:center}' +
    '#furn .bar{width:22px;height:36px;background:#333;border:1px solid #555;position:relative;overflow:hidden}' +
    '#furn .bar>i{position:absolute;left:0;right:0;bottom:0;background:#e8a33d;display:block}' +
    '#atk{position:fixed;bottom:72px;left:50%;transform:translateX(-50%);width:120px;height:4px;background:#222;border:1px solid #555;z-index:21;display:none}' +
    '#atk>i{display:block;height:100%;background:#c03028;width:0}' +
    '#xh{position:fixed;left:50%;top:50%;width:16px;height:16px;transform:translate(-50%,-50%);z-index:15;pointer-events:none;mix-blend-mode:difference;background:' +
    'linear-gradient(#fff,#fff) center/2px 16px no-repeat,linear-gradient(#fff,#fff) center/16px 2px no-repeat}';
  document.head ? document.head.appendChild(style) : document.addEventListener('DOMContentLoaded', () => document.head.appendChild(style));

  const ICON_URL = window.__ATLAS_B64 ? 'url(data:image/png;base64,' + window.__ATLAS_B64 + ')' : 'none';
  style.textContent += ':root{--cfatlas:' + ICON_URL + '}'; // #043: live var - render.js repaints procedural tiles (bucket/TNT/chest/bed/water) then swaps it, so item icons match what GL shows
  function iconCss(tile) {
    const meta = (window.__TEXMETA || {})[tile];
    if (!meta) return { backgroundImage: 'none' };
    const S = ICON_SCALE;
    return {
      backgroundImage: 'var(--cfatlas)',
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
  let chestEl, chestSlots = [];
  let atkEl;

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
    // #040 chest 27-slot grid
    chestEl = document.createElement('div'); chestEl.id = 'chest';
    const cht = document.createElement('h4'); cht.textContent = 'Chest'; chestEl.appendChild(cht);
    const cgrid = document.createElement('div'); cgrid.className = 'grid';
    for (let i = 0; i < 27; i++) { const s = mkSlot('cs', i); chestSlots.push(s); cgrid.appendChild(s); }
    chestEl.appendChild(cgrid);
    inv.appendChild(chestEl);
    inv.appendChild(g4);
    ghostEl = document.createElement('div'); ghostEl.id = 'ghost';
    const gi = document.createElement('div'); gi.className = 'icon'; ghostEl.appendChild(gi);
    document.body.appendChild(hud); document.body.appendChild(inv); document.body.appendChild(ghostEl);
    atkEl = document.createElement('div'); atkEl.id = 'atk'; atkEl.innerHTML = '<i></i>';
    document.body.appendChild(atkEl);
    const xh = document.createElement('div'); xh.id = 'xh'; document.body.appendChild(xh); // #047 crosshair
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
    const xh = document.getElementById('xh'); if (xh) xh.style.display = CF.ui.open ? 'none' : 'block'; // #047
    for (let i = 0; i < 9; i++) {
      paint(hudSlots[i], CF.inv[i]);
      hudSlots[i].classList.toggle('sel', i === CF.sel);
    }
    for (let i = 0; i < invSlots.length; i++) paint(invSlots[i], CF.inv[i + 9]);
    for (let i = 0; i < 4; i++) paint(craftSlots[i], CF.ui.craft[i]);
    updateResult();
    paint(resultSlot, CF.ui.result);
    if (furnEl) {
      const f0 = be();
      const on = !!CF.ui.container && f0 && f0.type === 'furnace';
      furnEl.style.display = on ? 'block' : 'none';
      CF.ui.container && !be() && (CF.ui.container = null); // BE gone (broken/loaded away): just close panel
      if (on) {
        const f = f0;
        paint(finSlot, f.input); paint(ffuelSlot, f.fuel); paint(foutSlot, f.out);
        burnBar.firstChild.style.height = (f.burnMax ? 100 * f.burn / f.burnMax : 0) + '%';
        cookArrow.firstChild.style.height = Math.min(100, f.cook / 2) + '%'; // 200t cook -> 2%/tick
      }
    }
    if (chestEl) { // #040
      const c = be();
      const on = !!CF.ui.container && c && c.type === 'chest';
      chestEl.style.display = on ? 'block' : 'none';
      if (on) for (let i = 0; i < 27; i++) paint(chestSlots[i], c.slots[i]);
    }
    if (CF.ui.ghost) {
      ghostEl.style.display = 'block';
      Object.assign(ghostEl.querySelector('.icon').style, { position: 'absolute', inset: '0', backgroundRepeat: 'no-repeat' }, iconCss(itemTile(CF.ui.ghost.name)));
      ghostEl.querySelector('.cnt') || 0;
    } else ghostEl.style.display = 'none';
    if (atkEl) { // #036: 1.9-style charge meter, visible only mid-cooldown (sword 12t / tool 20t / hand 5t via CF.atkCdInfo)
      const ch = Math.min(1, (CF.atkTick === undefined ? 20 : CF.atkTick) / (CF.atkCdInfo ? CF.atkCdInfo() : 20));
      atkEl.style.display = ch < 0.999 ? 'block' : 'none';
      atkEl.firstChild.style.width = (ch * 100).toFixed(0) + '%';
    }
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
    if (kind === 'cs') { // #040 chest slots: full bidirectional merge/swap like inventory
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
      // #040 chest quickmove first (1.12: shift-click routes between container and inventory)
      const f = be();
      if (f && f.type === 'chest' && !CF.ui.ghost) {
        if (kind === 'cs' && f.slots[i]) { const s = f.slots[i]; const left = CF.give(s.name, s.count); f.slots[i] = left ? { name: s.name, count: left } : null; refresh(); return; }
        if (kind === 'inv' && CF.inv[i]) { const s = CF.inv[i]; const slot = f.slots.findIndex((x) => x && x.name === s.name && x.count < 64);
          if (slot >= 0) { const move = Math.min(64 - f.slots[slot].count, s.count); f.slots[slot].count += move; s.count -= move; if (!s.count) CF.inv[i] = null; refresh(); return; }
          const empty = f.slots.findIndex((x) => !x); if (empty >= 0) { f.slots[empty] = s; CF.inv[i] = null; refresh(); return; } }
      }
      // shift-click: move inv <-> craft? v1: inv<->hotbar quickmove within inv array
      if (kind === 'inv' && CF.inv[i] && !CF.ui.ghost) {
        const s = CF.inv[i];
        const target = i < 9 ? 9 + CF.inv.slice(9).findIndex((x) => !x) : i % 9;
        if (target >= 0 && target < 36 && !CF.inv[target]) { CF.inv[target] = s; CF.inv[i] = null; refresh(); }
        return;
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
    if (!hit) return false;
    if (CF.useBed && CF.useBed(hit)) return true; // #041 bed
    if (!CF.blockEntities) return false;
    const k = hit.x + ',' + hit.y + ',' + hit.z;
    const f = CF.blockEntities[k];
    if (f && (f.type === 'furnace' || f.type === 'chest')) { CF.uiOpenContainer(k); return true; } // #032/#040
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
      const raw = ic && ic.style.backgroundImage;
      // #043: icons use var(--cfatlas) (live-swapped after render.js repaints procedural tiles) -
      // inline style holds the var() token; the computed value must resolve to the embedded PNG.
      const resolved = ic ? getComputedStyle(ic).backgroundImage : '';
      return raw === 'var(--cfatlas)' && resolved.includes('data:image/png');
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

    // ================= #040 chest: 27-slot container + persistence =================
    const cx0 = 74, cz0 = 70, cy0 = Math.floor(CF.world.heightAt(cx0, cz0)) + 1;
    CF.world.set(cx0, cy0, cz0, CF.IDOF['chest']);
    CF.chestPlace(cx0, cy0, cz0);
    CF.assert(r, 'ui.chest-open', CF.useBlock({ x: cx0, y: cy0, z: cz0 }) === true
      && CF.ui.container === cx0 + ',' + cy0 + ',' + cz0
      && document.getElementById('chest').style.display === 'block'
      && document.getElementById('furn').style.display === 'none');
    CF.inv.fill(null); CF.ui.ghost = null;
    CF.inv[0] = { name: 'cobblestone', count: 10 }; CF.inv[1] = { name: 'cobblestone', count: 5 }; CF.inv[2] = { name: 'dirt', count: 5 };
    CF.uiClick('inv', 0); CF.uiClick('cs', 5); // ghost pickup -> store
    CF.uiClick('inv', 1); CF.uiClick('cs', 5); // second same-kind stack -> merge
    const c = CF.blockEntities[cx0 + ',' + cy0 + ',' + cz0];
    CF.assert(r, 'ui.chest-store(' + (c.slots[5] && c.slots[5].count) + ')', c.slots[5].name === 'cobblestone' && c.slots[5].count === 15);
    CF.uiClick('inv', 2, true); // shift-click dirt -> chest quickmove
    CF.assert(r, 'ui.chest-quickmove', CF.countItem('dirt') === 0 && c.slots.some((s) => s && s.name === 'dirt' && s.count === 5));
    CF.uiClick('cs', 5); CF.uiClick('inv', 0); // take back
    CF.assert(r, 'ui.chest-take', CF.countItem('cobblestone') === 15 && !c.slots[5]);
    // persistence roundtrip
    CF.give('coal', 7);
    const ck = cx0 + ',' + cy0 + ',' + cz0;
    CF.saveNow();
    CF.world.set(cx0, cy0, cz0, 0); delete CF.blockEntities[ck]; // "grief it away"
    CF.loadNow();
    const c2 = CF.blockEntities[ck];
    CF.assert(r, 'ui.chest-persist(' + (c2 && c2.slots.filter(Boolean).length) + ',bes=' + Object.keys(CF.blockEntities).join('|') + ',blk=' + CF.world.get(cx0, cy0, cz0) + '/' + CF.IDOF['chest'] + ')', !!c2 && c2.type === 'chest' && c2.slots.some((s) => s && s.name === 'dirt' && s.count === 5));
    CF.assert(r, 'ui.chest-persist-orphan', CF.world.get(cx0, cy0, cz0) === CF.IDOF['chest']); // block restored too
    // break returns contents
    CF.inv.fill(null);
    const got = CF.chestBreak(cx0, cy0, cz0);
    CF.assert(r, 'ui.chest-break', got >= 5 && CF.countItem('dirt') === 5 && !CF.blockEntities[ck]);
    CF.world.set(cx0, cy0, cz0, 0);
    // #047 crosshair present + hidden while a GUI is open; camera interpolation keeps standing y EXACT
    const xh = document.getElementById('xh');
    CF.ui.open = true; refresh(); const xhHidden = xh.style.display === 'none';
    CF.ui.open = false; refresh();
    CF.assert(r, 'ui.crosshair(' + !!xh + ',' + xhHidden + ')', !!xh && xhHidden === true && xh.style.display === 'block');
    const P = CF.player;
    P.tp(60.5, CF.world.heightAt(60, 60) + 12, 60.5); P.onGround = false; P.prevPos = P.pos.slice();
    for (let i = 0; i < 80 && !P.onGround; i++) CF.playerTick();
    let y0 = P.pos[1], still = true;
    for (let i = 0; i < 600; i++) { CF.playerTick(); if (Math.abs(P.pos[1] - y0) > 1e-9) still = false; }
    CF.assert(r, 'ui.stand-rock-still(dy=' + (P.pos[1] - y0) + ')', still === true && P.onGround === true);
    CF.ui.open = false; CF.ui.container = null; if (inv) inv.style.display = 'none';
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
  CF.shotScenarios['ui-chest'] = async () => {
    await CF.shotScenarios['ui-hotbar']();
    const P = CF.player, W = CF.world;
    const fx = Math.floor(P.pos[0]) + 2, fz = Math.floor(P.pos[2]), fy = W.heightAt(fx, fz) + 1;
    W.set(fx, fy, fz, CF.IDOF['chest']);
    CF.chestPlace(fx, fy, fz);
    const c = CF.blockEntities[fx + ',' + fy + ',' + fz];
    c.slots[0] = { name: 'cobblestone', count: 42 }; c.slots[1] = { name: 'dirt', count: 17 };
    c.slots[9] = { name: 'coal', count: 5 }; c.slots[10] = { name: 'iron_ingot', count: 3 };
    c.slots[20] = { name: 'log', count: 8 };
    CF.give('apple', 4);
    CF.useBlock({ x: fx, y: fy, z: fz });
    CF.renderDraw(CF.camera);
    await new Promise((res) => setTimeout(res, 200));
  };
})();
