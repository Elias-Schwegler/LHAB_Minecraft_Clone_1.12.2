# AGENTS.md — project STATE memory (1-minute grounding)
Law: docs/MASTERPROMPT.md · How we work: docs/PLAYBOOK.md (READ IT FULLY each session) · Spec: docs/REFERENCE.md

## Current state (2026-09-05, sprint 03 it7)
- Tags: v0.0.0 scaffold → v0.1.0 sprint01+fixes → v0.2.0 SPRINT 02 CLOSED (audit #4 READY).
- Sprint 03 ACTIVE (docs/sprints/03.md): #033 DONE (suite split, --quick 32s). NEXT: #035 mob core
  (entity system + zombie), then #036 heap-A* AI, #037 skeleton/creeper, #038 passives+breeding,
  #039 spawn rules, #040 chests, #041 beds/weather, #042 TNT, #043 fluids polish. SPK-7 (nether scale)
  before any nether work.
- Gate: TEST GREEN 107 asserts full / 96 quick, 0 errors. Parity: 17/399 proof-bound (t1 17/125):
  16 core blocks + torch; water/lava NOT counted until buckets (#031).
- Tier-1 mechanics done: worldgen/biomes/ores/caves/trees, render(greedy+AO-less shaded+light+fog),
  break/place/drops/tiers+crafting+smelting, items/inventory/UI, physics, day/night, block+sky light,
  fluids v1, survival stats+HUD, save/load, F3 v2, torch per-face. Remaining Tier-1: mobs+spawn rules,
  chests/furnace-GUI(#032), TNT, beds/sleep, combat cooldown polish, infinite-streaming verify.
- Carried FIXes: #031 (water banding rows + lava tile brightness + buckets→+2 parity), #032 (furnace UI).
- Nice dev seed: 5 = plains (all baselines use it). Play mode = open game/index.html (F4 survival, E inv,
  F3 debug; ?new=1 wipes saves, ?seed=N new world).

## Recent merges (newest first)
- be32c08 #033 suite split (--quick 32s; CF.stopGameLoop fix)
- v0.2.0 close: sprint02 review/retro + audit#4 (1 P1 escaped: false furnace-UI checkbox -> #032)
- #028 torch per-face attach+pop · #027 F3v2 · #026 survival+HUD · #025 UI · #022 fluids+obsidian/
  cobble/stone rules (banding carved #031) · #024 items/craft/smelting/cross-torch · #021 day/night ·
  #020 light engine+glowstone · #019 leaves decay/drops · #023 save/load · audits #2/#3 + #029/#030
- v0.1.x: #002-#009 sprint01 core + audit#1 (#010-#019) · #001 spikes (SPK-1..6: GO / SPK-4 ALT=heap A*)

## Architecture pointers (code comments are authoritative)
registry.js → world.js (chunks/light/flat-fluids/decay) → render.js (opaque|cross|liquid passes) →
player.js → items.js → interact.js → ui.js → survival.js → persist.js → f3.js → game.js → harness.js.
tools/: build/test/shot/parity/blockshots/tex. All zero-dependency. PowerShell quirks + WebGL rules
+ probe patterns: see PLAYBOOK §4 before touching render/fluids/harness — each gotcha cost hours once.

## Update ritual (every merge, in the merge commit)
This file's state+merges sections · docs/PARITY.md rows (evidence-annotated) · sprint tracker row +
daily · issue Evidence+vision verdicts. New hard process lesson → PLAYBOOK.md, not here.
