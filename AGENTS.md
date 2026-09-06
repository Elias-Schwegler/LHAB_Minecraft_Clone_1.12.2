# AGENTS.md — project STATE memory (1-minute grounding)
Law: docs/MASTERPROMPT.md · How we work: docs/PLAYBOOK.md (READ IT FULLY each session) · Spec: docs/REFERENCE.md

## Current state (2026-09-06, sprint 03 it13)
- Tags: v0.0.0 scaffold → v0.1.0 sprint01+fixes → v0.2.0 SPRINT 02 CLOSED (audit #4 READY).
- Sprint 03 ACTIVE (docs/sprints/03.md): #033 #035 #032 #036 #037 #038 #042 DONE. NEXT: #039 spawn caps,
  #040 chests, #041 beds/weather, #043 fluids polish+buckets(#031), #044 mob art, #045 crafting-table 3x3 GUI.
  Then audit#6 + close 03. SPK-7 (nether scale) before any nether work.
- Gate: TEST GREEN 172 asserts full / 161 quick, 0 errors. Parity: 18/399 (TNT functional:false - procedural
  tile, not Blender; mechanic shipped + tested, not counted: honest)
  proof-bound (t1 18/125): 15 core blocks + torch + furnace; water/lava NOT counted until buckets (#031).
- Tier-1 mechanics done: worldgen/biomes/ores/caves/trees, render(greedy+AO-less shaded+light+fog),
  break/place/drops/tiers+crafting+smelting, items/inventory/UI, physics, day/night, block+sky light,
  fluids v1, survival stats+HUD, save/load, F3 v2, torch per-face, MOB CORE v1 (entity physics, light<=7
  night/cave spawning survival-gated, sun burn, player-kill loot; mobs render as palette-lit boxes),
  MOB AI v1 (heap-A* chase + 1.12 melee + player 1.9 charge-meter combat, knockback, entity-over-mining),
  MOB ROSTER v2 (skeleton ranged+arrows, creeper fuse+1.12 ray-marched crater via src/explode.js).
  Remaining Tier-1: more mobs(#038-#039), chests(#040), TNT, beds/sleep,
  infinite-streaming verify, recipe book UI.
- Carried FIXes: #031 (water banding rows + lava tile brightness + buckets→+2 parity). #032 CLOSED it9.
- Nice dev seed: 5 = plains (all baselines use it). Play mode = open game/index.html (F4 survival, E inv,
  F3 debug; ?new=1 wipes saves, ?seed=N new world).

## Recent merges (newest first)
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
