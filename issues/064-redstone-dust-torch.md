# Issue: 064 — redstone dust + torch: power propagation core
- Type: FEAT | Status: DONE | Epic: Redstone | Sprint: 05 | Depends: SPK-8 GO (read FIRST)

SPK-8 design: power = derived per-cell nibble (Map "x,y,z"->0..15 or parallel light-array), re-flood on
world.set() beside queueRelight (same 5x5 region discipline, same budget), NO persistence (re-derive on
load/first-look). 1.12 rules: dust decays 15->1 per hop (incl. diagonal turns), source (torch) = 15
non-decaying OUT, dust attaches to solid under, powering neighbor BLOCKS = read max(dust adj, torch adj)
- keep v1 to dust+torch+consumer-reads-API (CF.powerAt(x,y,z,face?)). Registry: redstone_torch (id 76)
+ redstone_wire (id 55), procedural tiles functional:false, recipes (torch: stick+redstone; dust: 1->3?
1.12: 1 dust+stick = 4 torches; dust from block? redstone_block 9<->1 later). redstone item: mining drop
source = NO natural gen this issue (nether quartz is our Tier-2 ore; redstone_ore WORLDGEN = separate slice
in this issue: 1.12 deepslate-less y<16 vein ~2.5% - DO IT: gen hook exists). Smelting redstone_ore->redstone
item (furnace).
ACs:
- [x] world.redstone-flood assert (torch->15 line decay, gap-breaks-signal, re-flood on remove)
- [x] region budget: flood ONLY on RS-block changes (world.redstone-flood idle= leg: 50 non-RS edits + 20 rsTicks -> CF.rsFloods unchanged)
- [x] items.redstone-craft + smelt asserts; registry.redstone (tiles/proof)
- [x] interact.redstone-place (dust refuses air-floor, accepts stone; torch places; support-pop drops 'redstone' via drop table)
- [x] save roundtrip: power re-derived (no bytes stored) - save.redstone-derive assert (14->14 across swap, blob has no "power")
- [x] video: dedicated scenario video-redstone + `video.mjs redstone scenario=video-redstone` - frames PASS

## Evidence (2026-09-17)
- src/redstone.js (NEW module, manifest after items.js): SPK-8 model A - per-world {cells:Set,power:Map},
  full clear+BFS re-flood on dirty (O(wire cells) only -> idle 0ms), world.set hook fires rsOnSet ONLY when an
  RS block changes, game-loop rsTick drains <=2 worlds/tick, CF.rsPowerAt API for #065/#066 consumers.
  rsRescan after load (persist applyDim hook) - power NEVER persisted (save.redstone-derive proves).
- Blocks: redstone_wire (thin-quad boxes model, non-solid, wire:true floor rule + pop, drop redstone,
  procedural painted tile @ (160,160) functional:false honest), redstone_torch (cross billboard, rstorch source
  15, NO light 1.12-correct, painted (0,176)), redstone_ore (BLENDER tile (144,16) functional:TRUE, y<16 r<0.006
  vein, iron+ pickaxe, smelts->redstone; qa/blocks/redstone_ore.png vision PASS) -> PARITY 58->59/399 (14.8%).
- Item redstone (painted (16,176)); recipe dust+stick->torch x1 (1.12); SMELT += redstone_ore->redstone.
- Asserts +7: world.redstone-flood (t15 d1=14 d10=5 cut/gap/restore + idle + torch-off-dead),
  world.redstone-ore (vein count + pop-drop), interact.redstone-place, items.redstone-craft,
  items.redstone-smelt, registry.redstone, save.redstone-derive. Gate 249 full / 233 quick GREEN, 47 blocks.
- LANDMINE RE-DUG (#056 lesson, third sighting): interact.hotId resolved via JSON `id` FIELD -> new mid-JSON
  blocks got WRONG ids on place (dust place 'succeeded' writing another block). Now IDOF everywhere (PLANTABLE/
  variant/plain paths). Test-haul: redstone suite must restore inv (items suite ui.icon-live downstream bit me)
  + W re-capture after loadNow swap (same traps the old suites learned the hard way).
- Video: qa/videos/2026-09-17/redstone f01/f03 - dust line on stone platform, unlit torch sprite, painted
  hotbar icon, live in-loop power verified via title probe (d1=14 d5=10 through the REAL game loop).
- Deviations documented: torch inverter behavior deferred to #065 (AC note); dust connect-visual (powder
  line direction) v1 static; side-attach torch uses billboard face-code already saved by #105 plumbing.
