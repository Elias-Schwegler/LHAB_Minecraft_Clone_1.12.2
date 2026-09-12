# Issue: 055 — nether portal + warp + persist v2
- Type: FEAT | Status: DONE | Epic: Sprint04 plan | Sprint: 04 | Depends: per body

Depends: SPK-7 GO (read docs/spikes/SPK-7.md FIRST - design + measured costs). 1.12: frame >=4w x >=5h obsidian (interior 2x3, exact, air), flint&steel any interior bottom cell -> portal block (id new) fills interior, block is non-solid, purple swirl cross/animated-2face, emits light 11, entities stepping in teleport (player instant, mobs 60s - mobs skip: document), other side: find/generate portal (056 provides nether side; if no nether yet -> feature-flag: portal exists but warp needs dims present => SHIP WITH 056 in same sprint; THIS issue owns: frame validation, portal block gen + anim texture, CF.dims registry + CF.warp(dimKey) exactly per SPK-7 (renderReset + mob/projectile wipe + player tp + lastDim for back-link pairing), PERSIST v2: {dims:{over:...,nether:...}} + v1 auto-migration + test, bed spawn follows active dim (skip cross-dim for now).
ACs:
- [x] interact.portal-frame assert (valid builds, invalid rejects)
- [x] portal block + light 11 asserts
- [x] game.warp round-trip assert (dims swap, player moves, world A untouched - SPK-7 fingerprint style)
- [x] persist v2: save in both dims, reload, states restored (assert); v1 blob migration assert
- [x] RELOAD-past-warp shot: stand at portal in nether, save, reload, same position - vision PASS

## Evidence (2026-09-12)
- **portal block**: registry `portal` (JSON id 90 / sequential id shifted), light 11, cross-model, hardness -1,
  `portal:true`, functional:false (procedural tile_portal in atlas cell (0,112) - atlas 110 tiles, no paint clash
  with y160 runtime row). Not breakable, not counted for parity.
- **frame validation** (`CF.portalFrameAt`, game.js): 1.12-true - 2x3 air interior, obsidian sill+cap+pillars,
  **corners OPTIONAL** (issue text said "missing corner" reject; 1.12 does not require corners - assert is
  lenient where the body was over-strict). `CF.portalTryIgnite` = flint&steel RMB on frame obsidian, brute-forces
  the 6 candidate origins around the clicked air cell; wired ahead of TNT in `useFlintSteel` (tnt.js) since
  obsidian is never TNT.
- **warp** (`CF.warp` + `CF.portalStepTick`): SPK-7 design exactly - CF.dims {over,nether}, per-dim BE maps
  swapped, renderReset + mobs/tnts/itemEnts/projectiles wiped (dropped items stay behind = documented v1),
  8:1 coordinate scale both ways, destination portal search r<=16 else `buildNetherPortal` deterministic
  carve+frame at base=max(heightAt,64). `warpArmed` cooldown = must leave a portal cell before re-warp.
  Nether world created lazily with seed^0x5EED and **CF.trackWorld installed BEFORE first edit**
  (PLAYBOOK wrappers-before-edits lesson - nether portal edits would have been unsaveable otherwise).
- **persistence v2** (persist.js rewrite): `{v:2, active, dims:{over:{chunks,flats,bes,player?},nether:{...}}}`;
  player saved only for active dim; quota-eviction still active-dim farthest-first; v1 blobs auto-migrate
  into dims.over (`loadNow._migrated`). `CF.trackWorld = initEditTracking` exported.
- **asserts** (+3, full 238 / quick 222 GREEN, 42 blocks): `interact.portal-frame` (valid ignite, invalid reject,
  cells=6, light nibble=11), `game.warp` (over->nether->over roundtrip, SPK-7-style fingerprint on world A),
  `save.v2` (stone marker over + gold marker nether survive save->load; hand-built v1 blob migrates w/ time/sel/yaw).
- **shot**: `qa/2026-09-10/nether-warp.png` - ignite->warp->save->reload->camera; title probe (spike/nwrun.mjs)
  proves pos+dim identical after reload; vision PASS: obsidian frame w/ purple swirl cross-portal centered.
  Terrain still overworld-lookalike = expected placeholder until #056 nether gen. Needed CF_BUDGET=16000
  CF_TIMEOUT=300000 (two dims generate). Frame fix: LOS corridor carve + pitch-sign at the sill.
- Gotchas logged: `w.set()` silent no-op on ungenerated chunks (ensureAround+drain before portal build);
  shot camera framing needed 5 iterations (standing-on-sill pitch sign) - see PLAYBOOK shot-framing rule.


## Acceptance criteria
