# Audit #7 — Sprint 04 close (2026-09-12) — adversarial, full
Auditor: separate sub-agent session, per MASTERPROMPT §9 / PLAYBOOK §5. Ground: main @ 4fc1b9f
(#057 SPK-8 merge, 31 commits since v0.3.0). Method: re-ran every gate + parity + the SPK-8 spike
myself, hand-checked proof literals in the BUILT artifact, sample-verified 9 closed issues (049,
052, 105, 106, 054, 058, 055, 059, 056) incl. viewing 14 of their screenshots in 2 batches, did an
independent parity recount from the built file's own __TEXMETA, collision-checked the atlas manifest
vs runtime paint cells, and cross-checked GitHub mirror + local issue/sprint/doc consistency.
No src/game/tools/docs edits made (audit-only). Helpers: spike/audit7-gate.mjs, audit7-recount.mjs,
audit7-literals.mjs (read-only probes).

## VERDICT: READY-WITH-NOTES
No P0/P1 — every headline claim (241/225 asserts, 44 blocks, 58/399 parity, t1 43/125) reproduced
exactly, and all sampled evidence is real and image-verified. Sprint 04 may close: tag v0.4.0 after
ceremonies. One P2 (flaky gate reproducibility, F1) should get an immediate follow-up; F2–F6 are
doc-drift/fidelity notes for the close commit and #048. Nothing found inflates a metric; two
claims (F2/F3) UNDER-state, the safe direction.

## 1. Quality gate — re-run this session, verbatim
- `node tools/build.mjs` -> `build OK -> game/index.html (454.1 KB, atlas embedded)`
- `node tools/test.mjs` (3rd attempt) -> `TEST GREEN (spec: all)` — **241 pass / 0 fail**,
  registry blocks: 44, "total in-page sim time: 3.2s", 0 console errors. Edge elevation/fallback-
  task stderr noise present (known, ignorable per PLAYBOOK §2).
- `node tools/test.mjs --quick` (2nd attempt) -> `TEST GREEN (spec: quick)` — **225 pass / 0 fail**,
  registry blocks: 44, sim 2.5s.
- Matches AGENTS.md "241 full / 225 quick / 44 blocks / 0 errors" exactly — BUT see F1: the first
  5 attempts this session produced 2 early exits with title stuck at `Cubeforge` (identical
  586,741-byte DOM dump = boot suite never reported) and 1 `spawnSync msedge.exe ETIMEDOUT` when
  the full suite exceeded the tool's 240s safety kill (tools/test.mjs:15). Same commands green on
  retry, so counts are genuine; the gate's reproducibility envelope is the finding.

## 2. Parity — independent recount (BUILT artifact only)
- `node tools/parity.mjs` -> **58/399 (14.5%), tier 1: 43/125, t2 15/163, t3 0/111** — matches
  AGENTS.md + docs/PARITY.md table exactly.
- Own recount (spike/audit7-recount.mjs) parsed the registry between /*REGISTRY-START|END*/ AND the
  embedded `window.__TEXMETA` (113 tiles) from game/index.html itself, NOT tools/tex/atlas.json, so
  manifest/artifact drift would surface: **58/399, t1=43 t2=15 t3=0 — identical**. All 58 carry
  functional:true + every proof.tests literal found in the built file + all tiles with
  src `blender:` + a qa/blocks sheet. Sum check: 20 (s03 base) + 9 (#049) + 16 (#050) + 5 (#051)
  + 3 (#052) + 3 (#053) + 2 (#056) = 58 — PARITY.md's own arithmetic is honest.
- "Counted honestly" verified: tnt, chest, portal, farmland, wheat, carrot, potato, crafting_table
  ALL functional=false in the built registry (bed keyed by colours — absent under key '0', false in
  every variant). Saplings correctly land in t2 per catalog tier.
- Atlas integrity: 113 manifest tiles, **0 (x,y) collisions** in BOTH tools/tex/atlas.json and the
  built __TEXMETA. Runtime paint cells (16/32/48/64/80/96/112/128/144 @ y=160 from src/tnt.js:7-8,
  src/items.js:199-216, src/bed.js:11-12, painted at src/render.js:302-321): manifest claims **zero**
  tiles on the y=160 row — no stomps, the #043-P1 pattern is structurally held.

## 3. SPK-8 (#057) — spike re-run vs docs/spikes/SPK-8-redstone.md
`node spike/redstone-sim.mjs`: chain-30 A=0.16ms (doc 0.11), chain-200 A=0.08ms (doc 0.07),
village-2.4k A=2.33ms (doc 2.61), idle 0 (doc 0), powered cells identical (16/16/2336). The
decision-relevant column (model A, "0.07–2.6ms/event, worst case < 16ms frame") reproduces within
run-to-run noise and the doc's figure is the CONSERVATIVE one. Model-B/heap deltas are noise on an
unadopted model. Verdict GO stands. `src/` genuinely untouched by #057 (git show confirms docs+spike
only) — no sneaked redstone code.

## 4. Sample-verified closed issues (9)
Every named assert literal was grepped in the BUILT game/index.html (not src); every image below
was actually viewed this session.
| issue | claim | evidence found? | image verdict |
|---|---|---|---|
| #049 wood II | +9 variants, species asserts, GRID12 atlas | registry.species-variants, grass.sapling-grow-{oak,birch,jungle}, world.leaves-decay-all, interact.drop-birch all in build; 9 variants present in my recount; sheets exist | log-birch.png PASS (pale/white bark block, correct — not a stomped sheet); torch-check2.png PASS (flame-up stick-down torch, art chunky = disclosed) |
| #052 slabs | multi-box class, 3 variants, no face holes | registry.slab-model, physics.slab-stand, interact.slab-place-upgrade in build + ran green this session (feet=70.50 exact, got=2) | slab-scene3.png PASS: grey full block, oak plank slab, double-cobble, single-cobble step — distinct half-heights, all faces lit, no holes |
| #105 torch | 3 stacked bugs fixed, pixel arbiter | interact.torch-up + render.face-lit in build | torch-probe.png PASS: torch at correct position (no origin-draw), yellow flame quad ABOVE stick, surrounding walls lit (no near-black) |
| #106 3-black-faces | lightCell floor fix, lit world | render.face-lit in build + green this session (272,199,272,250) | faces-corner.png PASS: platform -X/-Z skirt fully lit, log bark lit — the formerly-black faces; starter-world.png: leaves genuinely green, no magenta; remaining dark = under-canopy undersides, which the issue itself pre-disclosed |
| #054 farming | +7 asserts, 1.12 harvest, honest false | items.hoe-craft/bread-craft, world.crop-grow, interact.till/harvest, physics.farmland-trample, surv.bread — all in build, all ran green | farm-scene.png PASS: tilled furrow patch, green seedlings -> gold wheat stalks, purple/white potato flowers, carrot row; blocks functional:false verified (no wheat/farmland sheet needed/claimed) |
| #058 streaming | eviction existed = 0 before; now bounded | world.stream-bounded + stream-save in build; live values THIS session: `max=141,end=141,ed=6,qhi=0,endQ=0` — cap <=225 claim holds with headroom, queues drain to 0 | far-field.png PASS: forest stretches to fog on all sides at the walk-stop point, no void edge — supports "infinite streaming" (the #058 honesty note "simMs<200ms not assertable headless" is the correct kind of carve-out) |
| #055 portal/warp | frame lenient-1.12, warp roundtrip, persist v2 | interact.portal-frame (li=11), game.warp (dim/scale/back/pair all true), save.v2 — in build + green | nether-warp.png exists in BOTH qa/2026-09-10/ (placeholder-era) and qa/2026-09-12/ (re-shot); 09-12 viewed: obsidian frame + purple swirl portal grounded ON netherrack floor with orange lava sea behind — matches #056's re-shoot claim exactly |
| #059 recipe book | 3x3 GUI + book, 2x2 hides tools | ui.book literal in build, ran green (true,true,true,true,1,3>3) | ui-book.png PASS: 3x3 grid with planks+stick pickaxe pattern click-filled, arrow to pickaxe result, "Recipes (3x3)" panel with axe/hoe/shovel/sword/pickaxe icons; ui-inventory.png PASS: 2x2 mode lists only 3 lattice-fitting recipes (tools correctly hidden, MC-like). Nit F6 |
| #056 nether gen | real terrain, +2 parity, bed boom | world.nether-gen in build; live: `nr=84597, lava=498, q=1225, glow=9, sky=0, det=true` — matches the assert's own thresholds; registry.nether + bed.nether-explode present | nether-view.png PASS: red-black netherrack cave, glowstone flecks in ceiling shaft, red atmosphere, portal on floor. Sheets: netherrack.png PASS (noise-textured red); quartz_ore.png weakest (see F5) |
#053's literals (save.flat, registry.stairs-model, physics.stairs-walkup, interact.stairs-facing,
items.stairs-craft) were also grepped-in-build as part of the #052/#055 chains — all present.

## 5. Findings
| ID | Sev | Finding | Evidence |
|----|-----|---------|----------|
| F1 | P2 | Gate reproducibility: first 5 gate launches of this session failed BEFORE any result — twice `dump-dom` returned at ~26-30s with `<title>Cubeforge</title>` and byte-identical 586,741B DOM (boot suite never reported = virtual-time budget starved inside boot's own CF.ready polling, src/harness.js:12 polls 200x50ms = 10s virtual against an 8s quick budget, with atlas image decode + worldgen also claiming virtual ms), once `spawnSync msedge.exe ETIMEDOUT` (full spec exceeded the 240s kill, tools/test.mjs:15). Retry passes green. Headline numbers are therefore real but "GREEN" is not reliably one-shot on this machine — a close-ceremony that only samples one run can get a FALSE RED (or, worse, a future auto-gate flips silently). Fix: raise --virtual-time-budget (or expose CF_BUDGET like shot.mjs does), add a 1-retry in test.mjs, and/or set the title per-suite so partial results survive a dump | spike/audit7-gate.mjs outputs above; tools/test.mjs:15-17; src/harness.js:11-12 |
| F2 | P3 | AGENTS.md "proof-bound (t1 20/125): 15 core+torch+glowstone+furnace + water+lava" is the sprint-03-era breakdown living inside the sprint-04 state line; measured t1 is 43/125 (tool + my recount + PARITY.md's own table). Under-claim (safe) but contradicts the same paragraph's 58/399 | AGENTS.md:47 vs `node tools/parity.mjs` "tier 1: 43/125" |
| F3 | P3 | "WALL ~144s" (also PLAYBOOK §2) under-states today's quick pass: ~180s wall measured (green run), and the full spec crossed 240s once (F1). Machine/load dependent, but the state doc should say "~150-200s quick, full can hit the 240s kill" | this session's timed runs; AGENTS.md:45, docs/PLAYBOOK.md:30 |
| F4 | P3 | Suites are order-coupled: `--suites=boot,interact,f3,items` -> interact.aim-hit fails AND `harness.threw: TypeError: Cannot read properties of null (reading 'y')` at game/index.html:4229 (`const h = hit.y` runs even when the preceding assert tolerated a null hit) — a failed assert crashes every later suite in surgical runs. Official order passes, so no gate impact; but the "surgical" workflow in PLAYBOOK §2 is a minefield. Guard the deref or document order-dependence | game/index.html:4226-4230 (src/interact.js); observed via spike/audit7-gate.mjs |
| F5 | P3 | qa/blocks/quartz_ore.png is the weakest of the 58 counted sheets: the pedestal block reads as a plain red-brown mass with a pale bottom band; the white quartz speckles barely register at sheet distance (netherrack-vs-quartz_ore not distinguishable by eyeball alone — the proof binding (assert+blender tile) IS real). Given #056's own caught harness bug was "sheets rendered the wrong block and looked plausible", this sheet deserves a zoomed re-shoot under #048 | view qa/blocks/quartz_ore.png vs qa/blocks/netherrack.png |
| F6 | P3 | 3x3 workbench GUI panel is titled "Inventory (E to close)" (src/ui.js:98 reused for both modes) — 1.12 reads "Crafting" on the table UI; cosmetic fidelity, visible in the very evidence shot qa/2026-09-10/ui-book.png; fold into #048 | src/ui.js:98, ui-book.png header |

No P0/P1 -> no new FIX issues opened (per audit policy).

## 6. Process/scrum compliance
- git log v0.3.0..4fc1b9f: 31 commits; every feature merge is --no-ff with `(#NNN)`; #045's
  "shipped inside #059" closure is annotated in both the issue and the tracker row.
- Tracker (docs/sprints/04.md): all 14 committed rows DONE match local issue Status: lines
  (049-060, 045, 057-SPK, 105, 106 read this session); #044 (GH #88) and #048 (GH #92) correctly
  DRAFT locally and OPEN on GitHub — nothing claimed that isn't shipped.
- GitHub mirror verified with gh: local 049->#94 ... 059->#104, 105->#105, 106->#106, 060->#107,
  ALL present and CLOSED (title-idempotent mirroring worked; the 107-for-060 numbering jump is
  cosmetic).
- Tier-1 mechanic rows I could falsify all check out: streaming row cites the exact literals F1's
  flake didn't touch; recipe-book row carries the pre-#059 "tools were uncraftable in-game"
  confession (good honesty pattern — the claim was UNDER-stated before, now corrected); redstone
  gate = SPK-8 GO with reproduced numbers.
- docs/METRICS.md sprint-04 row + sprint review/retro absent — EXPECTED at audit-before-tag, to be
  filled in the close ceremonies commit.
- qa/2026-09-11 has no directory — the sprint simply had no merge that day; no missing-evidence gap
  found (every cited path resolves).

## Vision-batch rule compliance
Images analyzed: 14 screenshots in TWO batches (8 + 6), 0 videos — under PLAYBOOK's ~30 hard cap.
Read paths: torch-probe, faces-corner, farm-scene(09-09), far-field, ui-book, nether-view(09-12),
nether-warp(09-12), slab-scene3, log-birch sheet, torch-check2, ui-inventory, netherrack sheet,
quartz_ore sheet, starter-world(09-08).

## Auditor bottom line
Sprint 04's claims survive adversarial re-measurement: 241/225/44/58/43-t1 all reproduce exactly,
the parity mechanism is real when re-derived from the built artifact alone, all nine sampled
closures have their literals in the shipped HTML and their screenshots show what the evidence text
says (the portal-on-floor-with-lava-sea and the formerly-black faces now lit are genuinely
convincing frames), the SPK-8 GO is honest engineering with conservative numbers, and the mirror
tracker is clean. The one thing the team should NOT walk away complacent about is F1: three of the
first five gate launches this audit produced zero result — the gate is green, but it is not yet a
reliable one-shot instrument, and the same signature that bit me (title stuck at 'Cubeforge') was
blamed on brace-mismatch in PLAYBOOK §4. Add the budget/retry fix in the v0.4.0 close window.

fixes: no P0/P1 — no issues opened. F1 recommended as the first item of the close-ceremony commit
(test.mjs retry + budget env); F2/F3 fold into the AGENTS/PLAYBOOK close-edit; F4-F6 ride the
#048 fidelity pass / harness cleanup.
