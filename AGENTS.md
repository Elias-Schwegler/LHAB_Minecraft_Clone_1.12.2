# AGENTS.md — project memory (update EVERY merge; re-read with MASTERPROMPT.md each iteration)

## What this is
Cubeforge: offline single-file (game/index.html) clean-room Minecraft Java 1.12.2 clone.
Read docs/MASTERPROMPT.md for the law. This file = current state, 1-minute grounding.

## Current state (2026-09-04)
- Phase 0 bootstrap: env verified (docs/ENVIRONMENT.md), governance docs DONE,
  tooling DONE (tools/build|test|shot|parity.mjs, zero npm deps), catalog = 399 variants
  (docs/catalog.json), spikes SPK-1..6 verdicts: see docs/spikes/.
- Sprint: 01 — goal: walk on Blender-textured grass in a lit, meshed, collideable chunk world.
- Block%: 0/399 (parity.mjs). Tier-1 mechanics: 0/18.
- Baseline tag: v0.0.0.

## How to work (condensed law)
1. Loop priority: P0/P1 → committed sprint issues → refine backlog to DoR → plan sprint from parity gap.
2. Branch feature/NNN-slug from main; quality gate = `node tools/build.mjs && node tools/test.mjs && node tools/shot.mjs <name>`;
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

## Open issues / next
(see issues/ dir + docs/sprints/01.md)

## Recent merges (newest first)
- bootstrap: scaffold + docs + tooling + spikes (v0.0.0)
