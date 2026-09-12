# Issue: 056 — nether dimension gen
- Type: FEAT | Status: DONE | Epic: Sprint04 plan | Sprint: 04 | Depends: #055 (shipped)

Depends: #055 (dims plumbing) + makeWorld genOpts hook (SPK-7 flagged: generate() monolith -> {dimension:'nether'} param).
1.12 nether: 128 high (already our CH), netherrack bulk (id family), bedrock ceiling y127 + floor y0 unbreakable-exists, LAVA SEAS y~31 (level 0 pools + falling curtains later), quartz_ore veins, glowstone clusters on ceilings, no sky light (skylight = 0 without world ceiling gaps; fire never spreads? skip), NETHERRACK harvest = any pickaxe? NO: hands ok drops itself; mob rules: ghast/zombie-pigmen = NEXT (not this issue; note in evidence), bed explodes (interact guard + 1.12 damage = full-blast at player pos: use #037 explode(power? bed blast = 5 with fire? keep simple crater), portals link: same coords /8 both ways + nearest-existing-portal search radius 128 (simplified: generate-on-arrival within 1-block pad), fog RED (render dim-fog override).
ACs:
- [x] world.nether-gen asserts: netherrack majority, bedrock ceiling, lava sea levels, no sky light under ceiling
- [x] portal pairing: warp over->nether generates reachable portal back; round trip restores exact overworld spot (scaled 8:1)
- [x] bed-in-nether explodes assert (guard + crater)
- [x] nether-view shot (red fog, glowstone ceiling) vision PASS
- [x] parity: netherrack/quartz_ore counted (+2 -> 58/399); portal stays functional:false (can never break / procedural)

## Evidence (2026-09-12)
- `makeWorld(seed, {nether:true})` (world.js): netherrack floor (27..37) + ceiling (88..104) shell with noise blobs,
  static lava sea filling open cells <=31 (spread never ticks un-edited chunks -> seas don't churn, like 1.12),
  quartz_ore 1.4% in solids, glowstone 0.5% hanging UNDER ceilings/blobs (look-ahead rule: bottom-up gen loop
  cannot read arr[y+1] - first shot had glow=0 because of exactly that), bedrock plates y0+y127, NO trees.
  Skylight seeding `sky = NETHER ? 0 : 15` (no sunlight even through holes - 1.12 rule). `world.nether-gen` assert:
  nr>40k, lava>200, q>50, glow>0, plates perfect, no air under sea, no lava above, sky nibble 0, deterministic twin.
- New blocks netherrack (id 87: tool null/minTier 0 - hand-harvest drops itself ✓) + quartz_ore (id 24: pickaxe,
  drops NEW item quartz w/ painted icon) registered mid-JSON (tier2, functional:true, Blender tiles; block shots
  qa/blocks/{netherrack,quartz_ore}.png PASS) -> `registry.nether` assert; PARITY 56->58/399 (14.5%).
  IMPORTANT: mid-JSON inserts shift SEQUENTIAL ids -> caught the blockshots harness using the 1.12 `id` FIELD
  (worked only by coincidence for early blocks; my sheets rendered the WRONG block) -> now IDOF lookup. PLAYBOOK.
- Portal build GROUNDED: `base = max(heightAt+1, 5)` (was >=64 float) - nether destination portal now stands ON
  the floor (nether-warp.png shows it at 6..7,y37 with lava sea behind); game.warp scaleOk asserts the new seat.
- `bed.nether-explode` (bed.js): trySleep in nether = refuse + lastSleepFail 'nether' + CF.explode at the bed
  (power 5); crater assert at arena 260,260 (never the mob/bed turf).
- Red fog: render.js `CF.activeDim === 'nether' -> sky/fog [0.24,0.05,0.05]`, no sun-cycle influence. Natural
  mob spawns disabled while `CF.world.nether` (ghast/pigmen = deferred, documented).
- Shots: nether-view.png (portal+glowstone ceiling through carved shaft, red fog) + nether-warp.png re-shot on
  grounded portal (reload-past-warp same:true still proven via spike/nwrun.mjs). Both vision PASS.
- Tools: blockshots.mjs gained positional name filter (full-roster run was 20min); atlas 113 tiles, paint-row
  collision check 0. nether-gen noise palette calibrated ~2.2x brighter (EMIT+view-transform crush, empirical).


## Acceptance criteria
