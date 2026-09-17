# Issue: 062 — gameplay VIDEO-QA rig (user law: verify + sprint-close re-evaluation)
- Type: FEAT (tooling) | Status: DONE | Epic: Quality | Sprint: 05 | Depends: none

User law (2026-09-17): the verify step must record a video of basic playing behaviour (placing blocks, physics,
orientation/textures, items/decor, mobs, inventory, stability-over-time navigation) and RE-RUN it as a final
re-evaluation after ALL sprint implementation, before audit+tag. Rides DoD 4b + PLAYBOOK 7b.

## Scope built
- tools/video.mjs: deterministic frame extraction - each frame = fresh headless boot of the scripted
  'video-play' scenario cut off at virtual-time budget k*step (Edge captures the COMPOSITED page, DOM UI
  included). Output qa/videos/<date>/<run>/fNN.png + index.json. Retry-once per frame.
- harness.js 'video-play': scripted gameplay driver on CF.onTick - P1 walk+look, P2 place row
  (cobble/torch/slab/stairs/glass), P3 mine-back, P4 step-jump + 8-block pit fall, P5 inventory+workbench+book,
  P6 equip+Q-drop+magnet, P7 night zombie (real mousedown charge-clicks), P8 5s-cadence surface walk with
  ahead-mining (stream/re-mesh/relight stress), P9 hold. All through PUBLIC gameplay APIs (place/mine/mobs/
  ui) = same code paths a player triggers.

## Acceptance
- [x] rig records + survives: 16 frames, every phase reached, no ERR in title log
- [x] frames reviewed per DoD 4b in <=8-image batches, verdicts in this Evidence
- [x] law written into DoD 4b + PLAYBOOK 7b + AGENTS ritual

## Evidence (2026-09-17)
Recording #1 (qa/videos/2026-09-17/basic/, 16 frames, 13 min wall):
- f00/f01 PASS terrain/sky/wood textures, hotbar+HUD alive; FOUND: giant black regions = PITCH-BLACK tree
  canopies -> root-caused (leaves opaque to skylight; 1.12 opacity=0) -> #063 FIXED same session.
- f02/f03 PASS: placed row renders with correct models/orientation (torch flame-up, half-slab, ascending
  stairs, tinted glass); mining returned items to hotbar (2->5 cobble count visible).
- f05/f06/f08/f09: canopy black again (=#063) + legit dark cave after the pit; fall damage on hearts after
  the 8-block pit (physics PASS).
- f07 PASS dawn sky; f10 PASS surface; f11-f15: walk phase buried against walls = driver flaw (fixed:
  5s surface re-seat + tunnel-ahead stress) not a game bug.
Recording #2 (qa/videos/2026-09-17/basic, re-shot post #063 + driver fixes; frames TEMPORARY per law):
- f00/f01 PASS: noon ground under canopies fully lit (black shade GONE); gray wall = spawn rock close-up (legit).
- f02/f03 PASS: place row correct models/orientations; torch flame lit; pink specks = WILD PIGS spawning in
  daylight (spawn rules healthy again under the now-lit canopy).
- f04-f07 PASS: physics reset, GUI phase (planks x12 + stick x4 hotbar at f06 = book/give flow), dawn sky.
- f08/f09 PASS: night; zombie rendered upright (head/torso art gap = known #044), melee engaged, player took
  damage (hearts 10->7) = real 2-way combat.
- f10-f15 PASS: dawn->morning, SURFACE stability walk (re-seat driver fix): wide streaming vista, birch trunks,
  sheep+pigs herd, terrain layering, no black geometry, no burial. One 1px black speck on f15 tree (unresolved,
  sub-pixel, not reproducible from frame - watching future recordings).
VERDICT: rig works end-to-end; 1 real bug surfaced on its FIRST run (#063). Storage law: qa/videos gitignored,
auto-pruned >5d, `--clean`; frames deleted after verdicts recorded.
Gate: 242/226 full/quick GREEN incl. light.leaves-pass-sky.
