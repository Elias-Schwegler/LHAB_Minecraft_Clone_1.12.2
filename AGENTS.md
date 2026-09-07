# AGENTS.md — project STATE memory (1-minute grounding)
Law: docs/MASTERPROMPT.md · How we work: docs/PLAYBOOK.md (READ IT FULLY each session) · Spec: docs/REFERENCE.md

## Current state (2026-09-07, sprint 03 it18)
- Tags: v0.0.0 scaffold → v0.1.0 sprint01+fixes → v0.2.0 SPRINT 02 CLOSED (audit #4 READY).
- Sprint 03 ACTIVE: #033 #035 #032 #036 #037 #038 #042 #039 #040 #041 #046 #047 #043 #034 DONE (#043 closed
  #031 + fixed P1 atlas icon-stride bug; README+GitHub origin+issue mirror done).
  NEXT: #034 SPK-7 GO. Sprint issues COMPLETE -> #044/#045/#048 backlog,
  CEREMONIES: audit#6 (sub-agent full), review/retro/METRICS, tag v0.3.0, then sprint 04 planning.
- Gate: TEST GREEN 203 full / 191 quick (WALL ~144s since two-sided mesher - sim-time lies), 0 errors. Parity: 20/399 (TNT/chest/bed functional:false -
  procedural tiles, not Blender; mechanics shipped+tested, not counted: honest)
  proof-bound (t1 20/125): 15 core blocks + torch + furnace + water + lava (#043 buckets).
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
