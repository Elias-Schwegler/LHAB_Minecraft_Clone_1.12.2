# SPK-9 — nether follow-up scout: ghast + fortress cost (issue #070)
Date: 2026-09-18 · Verdict: **GO both (post-gen stamp + projectile via existing explode)** · Method: pure-Node proxies
of the real loops (spike/spk9-sim.mjs), nether branch copied from world.js. NO game behavior touched.

## Measurements
| item | cost | verdict |
|---|---|---|
| nether chunk generate() (current engine) | **2.8ms/chunk** (vs overworld ~1ms) = 225ms for a 9x9 first-look | OK - budgeted genQueue (2/tick) already amortizes to ~6ms/frame; watch first-look hitch |
| fortress district stamp (6 bridges + towers, ~16k block writes) | **44ms/district** post-gen pass | GO - same order as one chunk's relight; run inside generate-window like trees |
| ghast fireball impact = CF.explode(power~1, 1.12 raymarch ~5.5k probes) | **0.05ms** each; 20/sec still 1ms | GO - reuse #037 explode (already powers TNT + creeper); add ghast fireball as its projectile type (arrows pattern exists) |
| ghast flight steering (no A*, direct vector, altitude bob) | 0.00005ms/tick | GO - free |

## Design decision for sprint 06 (nether-II)
- Ghast: flying mob = M list + `fly:true` (skip ground physics + A*, pos += dir*speed, wall-avoid = probe
  ahead like piston refuse); fireball = projectile array entry {pos, vel, dmg, expl:true} -> CF.explode on
  terrain hit (power 1) + direct hit 5dmg; block damage on netherrack only if blastRes logic keeps it (it will).
- Zombie pigmen: aggro-on-attack table (player hit -> neutral->hostile set) - cheap state, same AI.
- Fortress: post-gen stamp pass keyed by (seed, district coords) - deterministic like trees; do NOT expand
  world.set surface area: write directly into chunk arrays during generate() (trees precedent) + one
  ensureLight after. Nether brick family = 2-3 blender tiles (+2-3 parity honest count).
- Glowstone-mining drop (glowstone dust->item already exists?) + magma/quartz blocks = #048-adjacent art tickets.
- Total sprint-06 nether-II estimate: 4 FEATs + 1 roster, comfortably one sprint.

## Risk
First-look into fortress district = gen 2.8ms + stamp ~44ms/tick-burst - spread stamp over the existing
2-chunk/tick budget (stamp at most one district per N ticks) -> worst frame stays < 16ms. Measure in the
real engine when the FEAT lands (this doc's numbers are proxies).
