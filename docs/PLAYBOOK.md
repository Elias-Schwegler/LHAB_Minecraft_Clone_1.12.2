# PLAYBOOK.md — how we work (read fully at session start; AGENTS.md = state only)
Operational manual for the Cubeforge loop. Update this file when a process learning hardens.

## 1. Iteration loop (exact, in order)
1. Ground: read docs/MASTERPROMPT.md (law), AGENTS.md (state), docs/sprints/NN.md, issues/ open, docs/PARITY.md.
2. Verify env quickly (ENVIRONMENT.md has abs paths; blender NOT on PATH).
3. Pick work by priority: P0/P1 auditor findings → committed sprint issue (next in tracker) → refine backlog to DoR.
4. `git checkout -q -b feature/NNN-slug` (branch BEFORE coding — never WIP on main).
5. Implement in src/. For behavior: docs/REFERENCE.md is the spec; if it says [TBC], research FIRST
   and resolve in the issue body before implementing (audit #2 P1 lesson: closing with [TBC] = violation).
6. Gate on the BRANCH (see §2 commands), capture outputs verbatim.
7. Run scenario shot(s) for the issue's visual AC; VIEW the PNG with the Read tool; write a
   vision verdict per AC (PASS/FAIL + what was seen) — this text goes into the issue Evidence.
   HARD LIMIT (user 2026-09-07): never analyze more than ~30 images in one go and NEVER more than
   ONE video - the agent loop crashes otherwise. More artifacts -> multiple batches.
8. Close issue: Status DONE + `## Evidence (close)` section with gate numbers, screenshot paths,
   vision verdicts, honest caveats/carve-outs (file a FIX issue for any broken remainder — never [x] it).
9. Update in the SAME commit: AGENTS.md (state + architecture map), docs/PARITY.md (block/mechanic rows
   with evidence ref), docs/sprints/NN.md task tracker row + daily line.
10. `git checkout main; git merge -q --no-ff feature/NNN-slug -m "feat(scope): subject (#NNN)"; git branch -d feature/NNN-slug`.
11. Audit trigger check (§5).

## 2. Tools (all zero-npm-dep; run from repo root, PowerShell)
```powershell
node tools/build.mjs                      # src/* (+atlas b64) -> game/index.html; fails on external refs
node --check src/mobs.js                  # after big edits: build is CONCAT-ONLY, a duplicate const in a
                                          # shared function scope parses per-file but kills the whole bundle
                                          # at runtime (boot hangs, no TESTRESULT). --check each edited src/*.js.
node tools/test.mjs                       # full gate: 15 suites, expect "TEST GREEN" (203 asserts as of #043)
node tools/test.mjs --quick               # dev loop (skips slow: grass/time/fluids); ~144s WALL since #046
                                          # (two-sided mesher ~2x buildMesh; in-page SIM time lies - wall is real)
node tools/test.mjs --suites=world,light  # surgical
node tools/shot.mjs <scenario> [seed=N]   # qa/YYYY-MM-DD/<scenario>.png — then VIEW it (Read tool)
node tools/parity.mjs                     # honest count: functional flag + proof.tests in BUILT file
                                          # + blender tile + qa/blocks png; writes qa/parity-latest.json
node tools/blockshots.mjs                 # (re)generate qa/blocks/*.png evidence sheets
node tools/tex/gen.mjs                    # Blender -> atlas.png(128px/8x8 grid, 49+ tiles) + atlas.json manifest
node spike/<name>.mjs                     # scratch scripts live in spike/ (gitignored-ish scratch zone)
```
- test.mjs timeouts: 240s for EVERY spec since #046 (quick hit the old 120s wall - meshing is real CPU,
  virtual-time budget only covers timer waits). Budgets all=16000/quick=8000 virtual ms.
- runBrowser quirks: `--user-data-dir` fresh temp per run (no cache); dump-dom reads
  document.title; Edge prints noisy elevation/auth junk on stderr — ignore.

## 3. Harness patterns (src/harness.js)
- Hash routing: `#test`/`#test=quick|all|a,b` and `#shot=name`; results via document.title
  `TESTRESULT:`/`SHOTERR:` (encodeURIComponent(JSON)) — ALWAYS encodeURIComponent (title truncates on some chars).
- Suites: CF.*Tests(r) functions registered in SUITES table {name, slow?}; CF.assert(r,'name(cond)',bool)
  — put live values INSIDE the assert name string: free diagnostics when they fail.
- Game loop stops after boot suite (CF.stopGameLoop) — suites drive CF.world.tick()/CF.playerTick()/
  CF.renderTick()/CF.renderDraw(cam) manually. Never assert on the live loop except in boot suite.
- Scenario debug probe pattern (saved us 3 times): inside a shot scenario, after renderDraw, write
  diagnostics to document.title (JSON incl. CF.rendererStats, world.get/lightAt values) and, if needed,
  gl.readPixels at normalized screen points; run the scenario via dump-dom once to fetch ground truth
  before theorizing about pixels.
- Scenarios register at module load: always `CF.shotScenarios = CF.shotScenarios || {}` (harness is
  additive — a plain `= {}` wiped other modules' scenarios once).
- CF.freeCam=true so player.tick doesn't steal CF.camera in camera-framed scenarios; night shots set
  CF.timeOffset=18000 and do NOT reset it (interval redraws would show day).
- Determinism: shots pass ?seed=5 (plains spawn); tests scan for clear columns/spots (trees broke
  fall tests & pool framing twice — scan, don't assume).

## 4. Gotcha log (each cost real hours — respect them)
WebGL/render:
- texImage2D(image) uploads with image TOP row at v=0 (NO flip). UV math must match.
- Matrix convention: row-major math + transpose at upload (single source: view()/mm()/tr() in render.js).
- GLSL: `#version 300 es` must be followed by NEWLINE (not `;`). gl_FragColor illegal in ES3 — `out vec4`.
- Face planes sit at voxel MAX boundary (d+1), not the voxel's own index.
- Greedy quads need per-block UV tiling (tw*du) AND per-face UV orientation AND light-bucket in the
  merge key (id | light>>2 <<12) — otherwise one giant flat-brightness quad.
- Translucent liquids: separate pass, depthMask(false), PREMULTIPLIED blend (blendFuncSeparate ONE,
  ONE_MINUS_SRC_ALPHA,...) with shader OC=vec4(c*t.a,t.a); straight-alpha blending blacked the scene.
- Cross models (torch): registry flag `cross:true`; renderer special pass (2 quads) + skipped from
  greedy mask (liquids too!). Support stored per-cell in flat[] (codes 1/2/4/6/8), popped in world.set.
- Chunk remesh budgets must count UNMESHED chunks (advance-past-mapped) or the loop stalls.
Engine/logic:
- Light: packed byte (sky<<4|block); relight = 5x5-chunk regions, ring seeds, queue ≤2/tick;
  liquids pass light (attenuated), solids stop it.
- Fluids: level in per-chunk flat[] (0=source; lv7 water/3 lava cap); interactions: water→lava
  source=OBSIDIAN, water→flowing lava=COBBLE, lava→water=STONE; lateral flow cobble-shields sources.
- Interaction order = fluid/light queue order (first-mover wins contact cell) — make tests deterministic
  by placing the intended winner first (torch obsidian test).
- set(): prev===id early-return (dirty tests must write a DIFFERENT block — hit us twice).
- `tris += 2` on the const array silently killed a whole chunk mesh — wrap shot scenarios in try and
  surface errors in title (SHOTERR does this now).
- Tools/affairs:
- PowerShell: `&&` invalid (use `;` + `if ($?)`), quoted JS via -e gets mangled (& and quotes!) —
  WRITE A spike/*.mjs SCRIPT instead of inline node -e with tricky chars; a PS line with ANY parse
  error executes NONE of its commands (silent skipped steps happened twice: addfluids/addblocks).
- PROCESS: the no-WIP-on-main rule was broken at it21 (#051 landed as direct commits 90a1fe3 after the #050 merge - late-session branch amnesia). Mitigation adopted: the gate block itself now starts with git checkout -q -b when a new issue begins - branch BEFORE the first src edit, not before the commit.
- Literal strings in tool params can get masked in transit (`cf-save-1` became `'***'` once;
  `n` backticks corrupted AGENTS) — verify critical strings by reading the file back.
- PNG byte-identity across builds that change pixels = investigate, but also: size equality ≠
  identity — hash if unsure; usually the real bug was a silent throw before the change.
- Blender: bmesh import at top; headless prints MCP addon noise; look for TEXGEN_OK line only.
- Tests: pre-set stale state (onGround true before fall test; run playerTick+onTick loops, reset flags).
  **player.tp() does NOT clear onGround** - any fall-settle loop `while(!onGround)` skips instantly after a
  tp; set P.onGround=false manually (bit the #036 chase test - symptom looked like an AI bug!).
- `hurtCd` (survival damage window) only decays inside CF.onTick: harness loops that call mobTick/worldTick
  WITHOUT onTick freeze it and silently swallow later damage -> flaky cross-suite asserts. Pre-settle duels.
- Screenshot scenarios: NEVER call CF.stopGameLoop() inside a shot - rAF feeds the compositor, canvas goes
  black. Freeze sim instead: `CF.mobTick = () => {};` (loop keeps rendering, AI/charge pin in place).
- Camera aim in scenarios: compute pitch from geometry (atan2 of dy/dist), never hardcode; verify framing
  with the readPixels grid probe (title JSON) BEFORE re-shooting - 4th time the probe pattern paid off.
- Explosion (#037 src/explode.js): MC blast resistance is stored DIVIDED BY 5 (stone 6->1.2, obsidian 1200->240).
  Forgetting the /5 makes a power-3 creeper destroy 1 block, not a crater — the mob.explode-crater assert guards it.
  Ray-march: intensity=power*rand(.7..1.3), each solid crossed subtracts (res+0.3)*0.3 then 0.22500001, step 0.3.
- Mob fight/duel TESTS must run on a SYNTHETIC sky platform built (and rebuilt after each explosion) in the test,
  not natural terrain — trees break LOS (creeper won't fuse) and holes desync the player (stale-onGround fall ->
  respawn mid-test). The mob.explode crater destroys the floor -> duel() re-fills it every call.
- `x || default` falsy trap for counters where 0 is meaningful (atkTick=0 rendered as 20). Use === undefined.
- ASSET MANIFEST LIES ARE SILENT: gen.py icon placer used `(idx//GRID)*GRID` (8px) instead of `*SIZE`
  -> item icons baked OVER block tiles for the whole of sprint 02 (furnace rendered black). parity.mjs
  checks tile EXISTS, not that PNG pixels land where the JSON says. After ANY tex/gen change: collision-
  check manifest (no two names share x,y) + VISION-CHECK the regenerated atlas.png + block sheets.
  Runtime "free cell" paints must be re-derived from the CURRENT manifest each time cells move.
- Headless repro pattern (cracked relight-perf + fluid-delay in minutes, not browser round-trips):
  spike/worldsim.cjs = load registry.js+world.js via new Function() with window/document/location stubs,
  run the EXACT failing sequence, time tick phases via an instrumented copy (spike/lightprof.cjs).
  A "browser hangs" shot on an await-y page usually = one very slow SYNC loop, not a deadlock.
- Relight re-seed rule of thumb (#043): after clearing a region, only (a) emitter blocks, (b) open sky
  columns, (c) the perimeter ring and (d) light that lived UNDER COVER need re-pushing (covered-cell
  test = one array read). The old 6x lightAt() per cell = ~600ms relights (12/tick budget -> freeze).
  Skylight seeds must run for LIQUIDS too (lava light never seeded = glowed 0 for sprints).
- PowerShell SET-CONTENT -NoNewline ON A (Get-Content) ARRAY FLATTENS THE FILE TO ONE LINE - the whole
  file becomes comment/code mush that still passes `node --check` (it parsed as one giant line...).
  Multi-line edits: use the Edit tool (or join with `r`n`). This cost a full diagnosis cycle.
- Item stack sizes are per-item in 1.12 (tools/buckets=1, eggs=16...): CF.give honors ITEMS[x].stack now -
  set it on any new non-block item or it stacks 64 (MC-wrong + bucket swap math breaks).
- Mixed dirty tree from an interrupted session: `git stash push -m tag -- path1 path2` to split into clean
  per-issue merges, `git stash pop` after the first merge. Verify each partial state builds+tests GREEN alone.
- PS unicode: -replace on content containing -> / em-dash often MISSES (encoding); use the Edit tool for
  files with non-ASCII, or verify with the grep tool after (never trust console rendering).
- Pixel asserts/shots that BUILD world then read pixels: mesh rebuild budget is only 2 chunks per renderTick
  and every set()/relight re-fills W.dirty - a FIXED `for renderTick()` RACES it (symptom: chunk renders as
  sky/nothing, delta 0). Drain: `for (i<400 && W.dirty.size) CF.renderTick();` (learned 3x during #046:
  face-back, mob.px-draw, faces-corner).
- Landing snap must use the PENETRATED pos: `ny = Math.floor(ny - h/2) + 1 + h/2` — with the pre-move `y` the
  rest point ratchets +1 block per falling tick (player "bounce" complaint, mobs floating 2 blocks up).
  Fast falls penetrate several cells at once -> also `while (boxHits(...ny...) && g++<8) ny += 1` push-up.
- pos[1] is box CENTER (feet = y - HH) for player AND mobs: `Math.round(y - HH)`-style "settle" lines that
  ASSIGN back into y turn center into feet -> half-buried entity, all horizontal sweeps collide (move=0.0).
  Diagnostic that cracked it: boxHits(x0,y0,z0)=true at REST + dy0=1.00 (should be 0.9=HH) in the assert label.
- Two-sided greedy meshing doubles buildMesh CPU (test wall time ~2x; gate numbers in §2). Never conclude
  "suite hangs" from in-page sim time - measure real wall.
- FACE-LIGHT SAMPLING (#106, the biggest visual bug of the project): pushQuad samples light at
  plane-0.001 (float). EVERY coordinate accessor used by render must Math.floor internally (lightCell did
  not -> float index -> undefined -> NaN -> exactly the 3 -faces black; "3 of 6 sides" user report).
  Diagnostic that cracked it: instrument pushQuad to dump [a, sgn, mid, packed] to a title JSON.
- RENDER POSITIONS ARE ABSOLUTE - there is NO per-chunk model matrix (VP only). coord() adds off[] for
  greedy; box pass builds wx+..; the #024 cross pass used chunk-local x/z for months -> torches drew near
  world origin (the #105 "upside down" report was partly this). Any new mesh pass: absolute coords.
- LIGHT PACKING: lightAt returns packed (sky<<4)|block. Raw nibble/255 (the torch `|| 14<<0` line) = black
  quads. Also: relight sky-column must NOT treat non-solid ids (cross blocks, single slabs) as opaque, and
  emitters must OR into the nibble, never overwrite (`c.light[i]=lv` killed torch skylight since #020).
- SHOT SCENARIOS: mesh-drain (W.dirty) is NOT light-drain. After building/carving geometry you need
  `while (W.stats().queue) W.tick()` (+ ensureLight) BEFORE renderTick, else freshly-cut cells keep stale
  0 light = black faces (faces-corner hid this bug for two sprints).
- VISION RATIONALIZATION IS A PROCESS FAILURE: the #046/#052 reviewers described the black -face skirt as
  "intentionally darker side shading" TWICE while the user saw "3 sides black". When a scene has
  suspiciously uniform black geometry, PROVE it (light probe / instrumented sampler) - never rationalize.
  A fresh user bug report outranks any past PASS verdict on the same pixels.
- node --check EVERY edited src file right before tools/build.mjs: one brace-mismatch in harness.js made
  the bundle boot-hang with title stuck at 'Cubeforge' (no SHOTERR - dispatch never ran) and looked like
  an infinite scenario; cost a full diagnosis cycle (#106 day).
- Registry edits: go through the JSON between /*REGISTRY-START|END*/ markers (strict JSON, 1-space indent);
  new blocks need id/tier/variants.default{functional:false until proof, tiles×6, hardness, drop,
  tool/minTier, solid, light, flags} + a proof:{issue,tests:[...]} naming asserts that EXIST in the build.
- Vision-QA sessions die with "At most 32 image(s) may be provided in one prompt" (llama.cpp counts ALL
  images in re-sent history). Fixed by global plugin `~/.config/opencode/plugins/image-cap.js`: prunes
  oldest screenshots from the outgoing prompt (keeps last 24, env OPENCODE_IMAGE_KEEP); no /compact needed.

## 5. Scrum/audit cadence
- Issues: issues/NNN-slug.md from _TEMPLATE; number continues globally; states DRAFT→READY→
  IN_PROGRESS→REVIEW→DONE|VOID. Carve broken parts into FIX issues (see #031/#032), close honest.
- Sprints: docs/sprints/NN.md — plan table, task tracker (update per merge!), daily lines, review,
  retro with ≥1 implemented improvement. Tags: v0.MINOR.0 at sprint close AFTER sprint-close audit
  (audit-before-tag is policy; audit #3/#4 both found things the team missed — it earns its keep).
- Audits (sub-agent, adversarial): scoped sample at 2-3 merge clusters, FULL sprint-close audit at
  close. Prompt template: re-run gate; sample-verify N closed issues (view images!); verify proof
  literals in BUILT file; independent parity recount; open FIX issues only P0/P1; write
  docs/audits/YYYY-MM-DD[-x].md; commit docs+issues only; return <200 words. Fix P1s SAME iteration.
- Honesty rules (DoD-grade): never claim counts/asserts without running them this session; never [x]
  an AC without its named evidence; vision-check every shot; parity counts ONLY via tools/parity.mjs.
- GitHub (user 2026-09-07): origin = https://github.com/Elias-Schwegler/LHAB_Minecraft_Clone_1.12.2.git.
  Issues are authored LOCALLY in issues/NNN-slug.md (source of truth), then MIRRORED to GitHub issues
  (spike/mirror-issues.mjs - IDEMPOTENT by title, re-run safe; DONE/VOID ones auto-closed); push
  main+tags at every merge cluster. Never run a non-idempotent bulk creator twice (cost a dedupe pass).

## 6. Current architecture quickmap (details in code comments)
registry.js (data+ids) → world.js (chunks/gen/light/fluids/decay) → render.js (3 passes) →
player.js (physics) → items.js (inv/craft/smelting) → interact.js (ray/mine/place/torch faces) →
ui.js (DOM hotbar/inv/craft) → survival.js (stats+HUD) → persist.js (localStorage RLE) →
f3.js (debug) → mobs.js (entities/A*/projectiles; CF.mobTick, mobSense test hook) →
explode.js (CF.explode ray-marched crater, shared creeper/TNT) → game.js (loop, CF.stopGameLoop) → harness.js.
Blocks register through the registry markers; water/lava/torch/furnace flags show the pattern for
new block kinds (liquid/cross/functional:false-until-GUI).

## 7. Where things are
- Law: docs/MASTERPROMPT.md · State: AGENTS.md · Spec: docs/REFERENCE.md (+catalog.json = parity source)
- Sprints: docs/sprints/ · Issues: issues/ · Audits: docs/audits/ · Metrics: docs/METRICS.md
- Evidence: qa/baseline/ (golden), qa/YYYY-MM-DD/ (dated shots), qa/blocks/ (per-block sheets),
  qa/parity-latest.json · Spikes: docs/spikes/ (SPK-1..6 done; SPK-7 nether pending)
- Playbook (this file): docs/PLAYBOOK.md — extend when a process lesson hardens.
