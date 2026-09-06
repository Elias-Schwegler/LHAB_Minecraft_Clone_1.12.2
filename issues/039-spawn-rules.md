# Issue: 039 — Spawn rules: category caps, per-chunk scheduler, despawn bands
- Type: FEAT | Status: DONE | Epic: docs/backlog/epics.md (Mobs) | Sprint: 03
- Depends on: #035 (spawn core), #037/#038 (roster) | Time-box: 0.5d

## 1.12.2 Reference spec (resolved)
- Category caps (global): MONSTER 70, CREATURE 10, AMBIENT 15 (CF.spawnRules.monsterCap/creatureCap/ambientCap).
- Spawn band: candidates 24..128 blocks from the nearest player (per-CANDIDATE 24 min in trySpawnAt; chunk
  shell gate 16..128 then per-column 24 rule).
- Scheduler: 1.12 spawnStructure-style per loaded CHUNK (scan loaded chunks in shell, small per-tick ATTEMPT
  budget), not a fixed random ring. Rules unchanged: hostile max(block, sky*day)<=7 on solid+2air; passive
  grass + sky>=9 + day.
- Despawn (hostiles only; animals persist): >128 INSTANT; within 32..128 an aged mob (>600t = 30s) gets a
  per-tick random chance that rises as distance grows (MC ~1/(dist-31)); never despawn within 32.
- Deviations: ambient category (bats) not implemented (no ambient mob yet); no difficulty-scaled cap
  (peaceful=0 handled by creative/survival gate: scheduler only runs in survival); regional difficulty N/A.

## Acceptance criteria
- [x] AC1 caps = MC categories (70/10/15) via CF.spawnRules; monster spawn stops at cap -> mob.cap(<=70)
- [x] AC2 per-chunk scheduler produces a night crowd across loaded chunks -> mob-crowd.png + mob.spawn-night
- [x] AC3 spawn band: none within 24 (trySpawnAt), none beyond 128 -> mob.min-dist / mob.max-dist
- [x] AC4 despawn: >128 instant; 32..128 persists until aged (stays in-band short-term) -> mob.despawn-instant / despawn-stays-in-band
- [x] AC5 passive rules intact (grass/day, persistent) - existing #038 asserts still green
- [x] AC6 zero regression: full 172 -> 175 green (+3 asserts), quick, 0 errors, parity stays 18/399

## Evidence (closed 2026-09-06)
- Gate: full **175/175 GREEN** (+3: mob.max-dist, mob.despawn-instant, mob.despawn-stays-in-band), 0 errors;
  parity unchanged 18/399; registry 23 blocks.
- mobs.js: CF.spawnRules {monsterCap70,creatureCap10,ambientCap15,min24,max128,despawnMin32,despawnAge600,
  chunkBudget6}; scheduler rewritten to scan W.chunks in the shell with a per-tick ATTEMPT budget (replaced the
  fixed 24-40 ring); per-mob despawn now = instant>128 + aged random in 32..128 (MC 1/(dist-31)); passives
  still never despawn. trySpawnAt uses CFG caps + keeps the per-candidate 24 distance rule.
- Bug fixed mid-design: first per-chunk version `break`-ed on chunk-visit budget -> always scanned the same
  first-inserted (near-player, <24) chunks -> ZERO spawns; changed to scan-all-chunks + cap ATTEMPTS. Also
  guarded ensureLight to run once per never-lit chunk (not every tick -> region-BFS storm).
- Shot qa/2026-09-06/mob-crowd.png (survival night, real scheduler, 400 ticks, frozen). VISION PASS: a cluster
  of hostile silhouettes (green zombie heads + pale skeletons) along the dark treeline + a lone zombie L/R ->
  "night is dangerous" demonstrated by the ACTUAL spawn system (not hand-placed); dim by design (no torch).
- Follow-ups: ambient bats (needs an ambient mob type); difficulty-scaled caps; persistent-mob NBT (named
  mobs never despawn) -> #044.
