# AGENTS.md — project memory (update EVERY merge; re-read with MASTERPROMPT.md each iteration)

## What this is
Cubeforge: offline single-file (game/index.html) clean-room Minecraft Java 1.12.2 clone.
Read docs/MASTERPROMPT.md for the law. This file = current state, 1-minute grounding.

## Current state (2026-09-04, end of iteration 2)
- Sprint: 02 near close: DONE #019 leaves, #020 light, #021 day/night, #022 fluids (+#031 carve:
  water banding/lava brightness/buckets), #023 save, #024 items/crafting/smelting/torch, #025 UI,
  #026 survival+HUD, #027 F3v2. All closed. Audit #4 (sprint close) + v0.2.0 tag next.
  Sprint 03 PLANNED (docs/sprints/03.md): mobs+spawn rules, chests, beds/weather, TNT, SPK-7, gate-speed #033. Start with #033 then #035 mob core.
- Block%: 17/399 (4.3%) proof-bound functional: +glowstone #020, +torch #024. Sprint02 done: #021 day/night, #024 items/tools/crafting/smelting/cross-model torch. torch wall-attach -> #028; furnace/GUI -> #025. Tier-1 mechanics: worldgen,
  render, collision, physics, break/place+drops, F3 done-ish; lighting/UI/mobs/fluids next.
- Merged: #002 worldgen, #003 renderer, #004 registry, #005 player, #006 interact,
  #007 textures, #008 shots+baseline, #009 F3. Audit #1 fixes #010-#019.
- test.mjs: 107 asserts green. Audits #2+#3 done (scoped); #4 at sprint close. #029 drop-spec resolved (Java: sapling .05, apple .005, no sticks). 16 blocks w/ qa/blocks sheets + proof-bound flags. Sprint 02: #019 leaves, #020 light (packed sky<<4|block, region relight), #023 save/load done.
- Seed 5 = plains spawn (nice shots): 
ode tools/shot.mjs starter-world seed=5`.

## How to work (condensed law)
1. Loop priority: P0/P1 → committed sprint issues → refine backlog to DoR → plan sprint from parity gap.
2. Branch feature/NNN-slug from main; quality gate = 
ode tools/build.mjs && node tools/test.mjs && node tools/shot.mjs <name>`;
   merge `--no-ff` "feat(scope): subject (#NNN)"; close issue w/ evidence; update AGENTS.md + PARITY.md in the merge.
3. Never: npm deps, downloads, three.js, placeholder flat textures shipped, counts without evidence.
4. Textures: Blender via tools/tex scripts (abs path in ENVIRONMENT.md), atlas → build embeds base64.
5. Game exposes `window.__test` harness; harness modes via hash (#test, #shot=name);
   results written to document.title as TESTRESULT:{json}; test.mjs parses via --dump-dom.
6. Unproven subsystem → SPK first (docs/spikes), NO-GO = re-plan, never implement against it.

## Key commands
```powershell
node tools/build.mjs
node tools/test.mjs
node tools/shot.mjs <scenario>        # writes qa/YYYY-MM-DD/
node tools/parity.mjs
node tools/tex/gen.mjs                # regen atlas via Blender + manifest
```

## Architecture map (grow it)
- src/core.js: game core, registry {name→{id,meta,v:labels,texture tiles,hardness,drop,tier,functional}}
- src/world.js: chunks 16x16x? seeded noise, gen, setBlock/getBlock
- src/render.js: WebGL2 chunk mesher + shader (per-face AO + light + fog)
- src/player.js: AABB physics, break/place
- src/harness.js: __test + shot scenarios (hash-routed)
- tools/: build/test/shot/parity + tex pipeline + atlas.json manifest
- src/registry.js: strict-JSON block registry (parity source) + id tables
- src/world.js: Uint8Array chunks, biomes (plains/desert/frozen @0.0015), ores by depth,
  caves, trees; <=2 gens/tick; dirty-set w/ neighbor cross-marking
- src/render.js: greedy mesh, atlas UV (WebGL NO-FLIP: image top row = v=0!), per-block
  UV tiling, per-face orientation, face planes at voxel max-boundary (d+1!), fog, NEAREST,
  magenta fallback uv; <=2 rebuilds/tick; stats on CF.rendererStats
- src/player.js: AABB sweep, step-up .55, speed walk4.317/sprint5.6/sneak1.3, jump8.94,
  grav32; CF.freeCam=true for camera-owning scenarios
- src/interact.js: DDA raycast, breakTime=hardness*1.5 (x5 if below tool tier, no drop),
  bedrock Infinity, place w/ player-AABB reject, hotbar 1-9/wheel
- src/f3.js: F3 v2 (fps/sim-ms/xyz/chunk/facing/biome/target+light/time/daylight/save state)
- src/survival.js: hp/food/sat, fall/lava/drown/starve dmg, regen, respawn, HUD pips (F4 toggles)
- src/ui.js: hotbar/inventory/craft-grid DOM UI, icon slicing, ghost-cursor drag
- src/world.js fluids: flat[] level per cell, queue-budget flow, Java interaction rules
- src/render.js: opaque pass + cross pass + translucent liquid pass (premult blend, surf -0.12)
- src/world.js light: chunk.light Uint8 packed (sky<<4|block); relight = 5x5-chunk region BFS
  (ring seeds + sky columns + sources), queue <=2/tick; render merges greedy quads by id+light/4 bucket
- tools/blockshots.mjs: regenerates qa/blocks/<n>[-variant].png evidence sheets
- Gotcha log: greedy init budget must count UNMESHED chunks (advance-past-mapped), or
  remesh loop never progresses past first two chunks.

## Open issues / next
(see issues/ dir + docs/sprints/01.md)

## Recent merges (newest first)
- #010-#019 audit #1 fixes: wrong-tool x3.33 (stone 7.5s), gold_ingot drop, snow->snow_layer,
  grass spread + sand/gravel gravity + gravel-flint, proof-bound parity, wall assert, F3 content
- #002..#009 sprint-01 core: worldgen, renderer, registry(17 blocks), player, interact,
  textures+leaves, shot scenarios+baseline, F3 (parity 16/399)
- #001 spikes SPK-1..6 all GO / GO-WITH-ALT (SPK-4 heap-A*); texture pipeline promoted (19 tiles)
- bootstrap: scaffold + docs + tooling + spikes (v0.0.0)
