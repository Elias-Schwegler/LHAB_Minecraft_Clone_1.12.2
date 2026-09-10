# AGENTS.md — project STATE memory (1-minute grounding)
Law: docs/MASTERPROMPT.md · How we work: docs/PLAYBOOK.md (READ IT FULLY each session) · Spec: docs/REFERENCE.md

## Current state (2026-09-09, SPRINT 04 ACTIVE - it25)
- Tags: v0.0.0 scaffold → v0.1.0 sprint01+fixes → v0.2.0 sprint02 closed -> v0.3.0 SPRINT 03 CLOSED (audit #6 READY-WITH-NOTES, 7 P3 fixed same-close).
- Sprint 03 CLOSED: #033 #035 #032 #036 #037 #038 #042 #039 #040 #041 #046 #047 #043 #034 ALL DONE (#043 closed
  #031 + fixed P1 atlas icon-stride bug; README+GitHub origin+issue mirror done).
  SPRINT 04 PLANNED+ACTIVE (docs/sprints/04.md, issues 049-059 mirrored): nether/dimension FEAT (SPK-7 GO design!), #044 mob polish, #045 3x3 GUI,
  #048 fidelity (+F7 black patch), spider/enderman, redstone SPK (Tier-2 gate), infinite-streaming verify, recipe book.
    #049 #050 #051 #052 DONE (wood 29/399, wool 45, storage 50, SLABS multi-box model 53/399=13.3%).
    URGENT user reports #105 (torch upside-down = 3 bugs: chunk-local cross verts, emitter overwrote packed
    sky -> black flames, +UV verify) & #106 (3 faces black = lightCell float-index undefined->NaN -faces;
    +faces-corner stale-light; ALL lit now - biggest visual win) FIXED same-day, gate now 218/202.
    #053 DONE (stairs 56/399): oak/stone(=COBBLE!)/brick via centralised CF.boxesOf/cellOpaque model resolver
    (kills the 4-file bit-re-derivation that caused #105/#106); subRect per-face culling; CAUGHT+FIXED my own
    box-pass rewrite bug (subRect V-clamped-to-U -> every box face 0 pieces = all slabs/stairs flat, found by
    RE-checking slab-scene in vision); + latent CF.place undeclared `p` (bed RMB crash) + flat-array never
    saved (slab/torch/bed meta lost on reload) - both fixed w/ asserts; walkup/facing/craft/save.flat; 224/208.
    #060 DONE (polish, no parity): Q-drop item entities (throw/magnet/0.5s-delay/despawn) as atlas-icon
    billboards + pause-on-mouse-release/inventory with controls overlay + RMB contextmenu suppressed;
    +interact.q-drop; 225/209. (self-inflicted: my #053 edit had comment-swallowed cellHitsPlayer's
    `const p` -> every place crashed; caught instantly by the new test.)
    #054 DONE (farming v1, parity unchanged 56 - crop blocks functional:false procedural): hoe x4, farmland+
    trample, wheat/carrot/potato stage-growth (randomTick+CF.growCrop), 1.12 harvest tables, bread; +7 asserts
    232/216; latent-bug haul: tryCraft width-pad hole (hoe matched PICKAXE recipe), torch-code vs crop-stage
    clobber, #060 boot-pause = shot framing drift, makeWorld-touched CF.growCrop global, arena stomps AGAIN.
    #059 DONE (recipe book UI + THE 3x3 WORKBENCH GUI it exposed missing - UI had only 2x2, tools uncraftable in-game!; book =
    materials-filtered click-to-fill list; TDZ boot-killer + len-4 craft reset found; ui.book assert; overlay gated for shots)
    #058 DONE (streaming VERIFY - found NOTHING was ever evicted! R_KEEP=7 clean-chunk eviction + GL buffer free + dirty/genQueue/lightDone prune; stream-bounded
    (1920-block replay, resident<=225, queue drains) + stream-save (far tower roundtrip) asserts; far-field.png PASS; Tier-1 worldgen row flipped [x]).
    NEXT: #055+#056 NETHER (centerpiece), #057 redstone SPK;
    backlog #044/#045/#048 (+poisonous_potato, +F7-black leftovers + torch flame tile art). Audit #7 at close. - Gate: TEST GREEN 235 full / 219 quick (WALL ~144s since two-sided mesher - sim-time lies), 0 errors. Parity: 56/399 (TNT/chest/bed functional:false -
  procedural tiles, not Blender; mechanics shipped+tested, not counted: honest)
  proof-bound (t1 20/125): 15 core+torch+glowstone+furnace + water+lava (#043 buckets).
- Tier-1 mechanics done: worldgen/biomes/ores/caves/trees, render(greedy TWO-SIDED faces+AO-less shaded+light+fog),
  break/place/drops/tiers+crafting+smelting, items/inventory/UI, physics(snap-ratchet fixed #046), day/night, block+sky light,
  fluids v1, survival stats+HUD, save/load, F3 v2, torch per-face, MOB CORE v1 (entity physics, light<=7
  night/cave spawning survival-gated, sun burn, player-kill loot; mobs render as palette-lit boxes),
  MOB AI v1 (heap-A* chase + 1.12 melee + player 1.9 charge-meter combat, knockback, entity-over-mining),
  MOB ROSTER v2 (skeleton ranged+arrows, creeper fuse+1.12 ray-marched crater via src/explode.js).
  Remaining Tier-1: infinite-streaming verify, recipe-book UI.
  (mob roster + combat + spawn rules + TNT + chests + beds/sleep + weather all DONE)
- Carried FIXes: #031 CLOSED via #046+#043 (banding 3 causes + buckets). #032 CLOSED it9.
- Nice dev seed: 5 = plains (all baselines use it). Play mode = open game/index.html (F4 survival, E inv,
  F3 debug; ?new=1 wipes saves, ?seed=N new world).

## Recent merges (newest first)
- #059 recipe book UI + THE 3x3 WORKBENCH GUI it exposed missing: right-click crafting_table -> uiOpenWorkbench (9-slot
  CF.ui.craft, 2x2 mode = lattice 0/1/3/4 hidden+guarded, close returns all); book = panel of recipes the current
  inventory can pay for AND that fit the lattice (2x2 correctly hides tool shapes - matches MC), click = bookFill
  (grid->inv return, take ingredients, place pattern). MC "discovered" persistence deferred. OUTED: pre-#059 tools
  were NOT craftable in-game (2x2-only UI; items tests hit tryCraft directly - parity row honesty note added);
  TDZ let-bookEl killed boot page-wide (module lets must precede build()); an old test reset craft to len-4; pause
  overlay now gated on CF.shotName for all shots. +1 assert ui.book, 235/219; ui-book/ui-inventory vision PASS.
- #058 streaming verify: the Tier-1 "infinite world" claim was UNVERIFIED - nothing was ever evicted (chunks/meshMap GL/
  lightDone grew unboundedly). Added R_KEEP=7 clean-chunk eviction (edited chunks stay until persistence lands them),
  VAO/VBO free on evict, dirty/genQueue/lightDone prune, renderTick guards. 1920-block diagonal replay + 600-tick real
  walk: resident chunks capped <=225, queues drain 0, far tower survives save/load (found: persist wrappers must be
  installed BEFORE edits or edits go unsaved). world.stream-bounded/save asserts, far-field.png PASS (needed
  CF_BUDGET/CF_TIMEOUT env in shot.mjs - software GL). Tier-1 worldgen row flipped [x]. 234/218 GREEN.
- #054 farming v1: hoe x4 (1.12 patterns) till->farmland (+trample revert on empty-landing, sneak/crop safe),
  wheat/carrot/potato cross crops with flat-bit stages -> stageTiles in the SAME cross pass, randomTick growth +
  CF.growCrop API (light-gated; force=bone-meal hook), 1.12 harvest tables, bread(+5). Farm item icons landed.
  Test-haul: tryCraft width-padding hole (hoe matched the PICKAXE recipe - could have shipped a wrong table!),
  torch face-code clobbering crop stage bits, #060 boot-pause = shot-framing drift (pause now only after first
  lock), makeWorld() must not touch CF globals (deterministic-test world hijacked CF.growCrop), crop-test arena
  stomped the 120,120 mob/bed turf -> moved to 200,200. +7 asserts 232/216 GREEN; farm-scene vision PASS;
  blocks functional:false honest (procedural art -> #048; poisonous_potato/hydration deferred).
- #060 Q-drop/pause/RMB polish: item entities (throw physics w/ solidSpanXZ + cellTopAt rest + 0.5s pickup
  delay + 1.6 magnet + 6000t despawn + 200 cap) rendered as atlas-icon crossed billboards (new dynamic VBO
  pass, same shader/unit0); sim freezes on pointer-unlock or inventory-open w/ controls overlay (freeCam/
  scripted/sleeping exempt so harness safe); contextmenu preventDefault. Caught my own #053 self-inflicted
  wound: an Edit had comment-swallowed cellHitsPlayer's `const p` -> EVERY CF.place threw. +1 assert 225/209.
- #053 stairs (56/399): centralised CF.boxesOf/cellOpaque model resolver (slab+stairs, mesher+physics+placement+
  relight all consume it - ends the per-file flat-bit drift behind #105/#106); 1.12-true mapping (stone_stairs=
  cobble tex, brick 108); subRect face-culling; FOUND+FIXED my own rewrite bug (subRect V-clamped-to-U zeroed all
  box faces -> slab/stairs flat, caught by RE-running slab-scene vision) + 2 latent gaps (CF.place undeclared `p`
  = bed RMB in-game crash; chunk flat-array never SAVED = slab/torch/bed meta lost on reload); box-vs-box physics
  + footprint-aware landing; +5 asserts, 224/208, 4 sheets+stair-run vision PASS.
- #105+#106 same-day user-report fix (torch triple-bug: chunk-local cross verts + emitter overwrote packed
  sky light + UV verify; black -faces: lightCell() float-index -> undefined->NaN on every plane-0.001 sample;
  faces-corner stale-light scenario bug; slab skylight passability RE-ADDED post-bisect; 6 new PLAYBOOK
  lessons incl. "never rationalize suspicious black in vision QA"); 218/202 GREEN, 4 scenes vision PASS.
- GIT DEBT: #051 direct-commit on main (90a1fe3) - rule restored from #052; see PLAYBOOK process line.
- #052 slabs: multi-box model class (v.boxes + flat bits 2/4; mesher coverFace; physics cellTopAt
  stand@+0.5; top-face upgrade->double drops 2; slabs pass skylight 1.12). Found+fixed 5 latent bugs incl.
  boxes-at-chunk-origin + abs-UV. stone_slab cobble/stone + wooden oak; 216/200; slab-scene vision PASS.
- #049 wood II: birch/jungle (log/planks/leaves) + sapling blocks w/ deterministic growSapling API + name-based
  decay + 20pct birch gen; atlas GRID12 192px + numpy icon pass (Cycles flattened icon alpha = black boxes);
  fixed 4 latent bugs: NaN liquid UVs (const A shadowed by coord A - water rendered green since #043!),
  torch flip since #024, faces culled under non-solid neighbors, water/glass alpha restore; 209/193, 29/399
- #050 wool: 16 colors (ramp tiles; catalog needs labels[] for families!) wool-wall vision PASS; 211/195, 45/399
- #051 storage: gold/iron/diamond/brick/clay + 9<->1 recipes + clay_ball smelt + dropN (clay x4) +
  storage-wall vision PASS; interact tests must NOT inv.fill before place-test; 214/198, 50/399; mossy->vines
- #043 fluids+buckets: 1.12 buckets (7 asserts, stack-1, source-only fetch, place=source, self-refuse),
  water5/lava30 spread delay + mover-resolves-contact + lava-light-seeding fix, live --cfatlas painted
  icons, P1: gen.py icon stride (items baked OVER blocks all sprint 02) -> atlas regenerated collision-
  free, paints -> y96/112 free cells, relight perf rule (covered-cell test), 203/191 GREEN, PARITY 20/399,
  #031 closed, 25 sheets + bucket-demo vision PASS; fidelity leftovers -> #048
- 1dbbc8e #034 SPK-7 GO: dual makeWorld instances measured pure (49ch/50ms gen, 5ms/100 idle ticks both
  alive, 96KB/chunk, mesh-all swap 1300ms, 195 CF.world refs all dynamic -> swap = reassign + renderReset);
  shipped only the CF.makeWorld export; nether FEAT design recorded for sprint 04+ (persist v2 dims map!)
- #043 fluids+buckets: 1.12 buckets (7 asserts, stack-1, source-only fetch, place=source, self-refuse),
  water5/lava30 spread delay + mover-resolves-contact + lava-light-seeding fix, live --cfatlas painted
  icons, P1: gen.py icon stride (items baked OVER blocks all sprint 02) -> atlas regenerated collision-
  free, paints -> y96/112 free cells, relight perf rule (covered-cell test), 203/191 GREEN, PARITY 20/399,
  #031 closed, 25 sheets + bucket-demo vision PASS; fidelity leftovers -> #048
- #047 game-feel: crosshair #xh (mix-blend difference, hidden in GUIs) + rAF camera
  interpolation (prevPos lerp) + ui.crosshair/ui.stand-rock-still asserts (195 full/184 quick); HUD append
  made synchronous; the "bounce" root fix itself shipped under #046
- 2055be6 #046 two-sided faces: mesher -axis passes (solids+liquid sides, UV-mirror, shade 0.7/0.45) +
  landing-snap RATCHET fix (penetrated-pos + push-up; player bounce was center/feet round line) +
  W.dirty-drain pixel-test rule + render.face-back + faces-corner/mob-px shots vision PASS + quick-timeout 240s;
  fluid banding shots PASS only in #043-tree state (repaint+depthMask unmerged there); #031 closes with #043
- 40ce5d7 #041 bed+weather: 2-cell bed (flat dir/head bits), sleep night-window + monster guard + spawn@head +
  dawn skip + rain clear; rain/thunder cycles + lightning strike (overcast sky, flash, blast camera shake);
  +10 asserts; bed-sleep/storm-sky vision PASS
- #040 chest: 27-slot container UI ('cs' slots on #032 plumbing), chest<->inv quickmove, break-ejects contents,
  procedural chest tiles in free atlas cells, **BE save/load added (fixes latent furnace-contents-lost bug)**;
  +7 asserts; ui-chest.png vision PASS; chest functional:false honest (not Blender-sourced)
- #039 spawn rules: per-chunk scheduler (attempt-budget), MC caps 70/10/15 via CF.spawnRules, 24..128 band,
  aged-random despawn (1/(d-31) after 600t), passives persistent; +3 asserts; mob-crowd.png vision PASS;
  break-on-visit-budget bug caught+fixed (always-scanned same near chunks -> zero spawns)
- 242c1c1 #042 TNT: src/tnt.js (prime/fuse80/chain) + power-4 via #037 explode; flint&steel RMB; procedural TNT
  atlas tile in free cell (parity untouched, functional:false honest); +6 asserts (172 full/161 quick); tnt-fuse.png
- #038 passives: pig/cow/sheep (wander RandomStroll + flee + breed feed->love->baby 6000t grow + per-species
  drop + passive spawn grass/day + never-despawn); mob-farm.png vision PASS; +14 asserts; `node --check` added
  to gate (duplicate const in shared fn scope silently kills bundle/boot-hangs)
- #037 skeleton+creeper: src/explode.js (1.12 ray-marched crater, blastRes/5, shared w/ #042) + skeleton ranged
  (arrow projectiles, ballistic aim, keep 4-15) + creeper fuse/swell/abort; palette 8->16; +8 asserts; mob-* shots
- #036 mob AI: heap-A* (SPK-4 ALT: cap1500, budget2/tick, sense35, step-up) chase + 1.12 melee (3dmg NORMAL,
  10t invuln) + player 1.9 charge meter (sword12/tool20/hand5t, entity-over-mining priority, knockback);
  +12 asserts, mob-fight.png/mob-chase.png vision PASS; stopGameLoop-in-shot = black-frame lesson -> PLAYBOOK
- #032 furnace GUI: ui.js container slots+panel (burn/cook bars), RMB useBlock routing, furnaceBreak
  returns contents; furnace functional:true proof-bound -> parity 18/399; +7 ui.furn-* asserts
- #035 mob core: src/mobs.js (CF.mobs entity store, physics sweep, light<=7 spawn, sun burn, loot) +
  render mob pass (palette tex unit1, SAME shader, atlas untouched) + night-mobs.png; +18 asserts
- be32c08 #033 suite split (--quick 32s; CF.stopGameLoop fix)
- v0.2.0 close: sprint02 review/retro + audit#4 (1 P1 escaped: false furnace-UI checkbox -> #032)
- #028 torch per-face attach+pop · #027 F3v2 · #026 survival+HUD · #025 UI · #022 fluids+obsidian/
  cobble/stone rules (banding carved #031) · #024 items/craft/smelting/cross-torch · #021 day/night ·
  #020 light engine+glowstone · #019 leaves decay/drops · #023 save/load · audits #2/#3 + #029/#030
- v0.1.x: #002-#009 sprint01 core + audit#1 (#010-#019) · #001 spikes (SPK-1..6: GO / SPK-4 ALT=heap A*)

## Architecture pointers (code comments are authoritative)
registry.js → world.js (chunks/light/flat-fluids/decay) → render.js (opaque|cross|liquid + MOB passes) →
player.js → items.js → interact.js → ui.js → survival.js → persist.js → f3.js → mobs.js (entities;
CF.mobTick in game loop, spawn survival-gated) → game.js → harness.js.
tools/: build/test/shot/parity/blockshots/tex. All zero-dependency. PowerShell quirks + WebGL rules
+ probe patterns: see PLAYBOOK §4 before touching render/fluids/harness — each gotcha cost hours once.

## Update ritual (every merge, in the merge commit)
This file's state+merges sections · docs/PARITY.md rows (evidence-annotated) · sprint tracker row +
daily · issue Evidence+vision verdicts. New hard process lesson → PLAYBOOK.md, not here.
