# Issue: 055 — nether portal + warp + persist v2
- Type: FEAT | Status: READY | Epic: Sprint04 plan | Sprint: 04 | Depends: per body

Depends: SPK-7 GO (read docs/spikes/SPK-7.md FIRST - design + measured costs). 1.12: frame >=4w x >=5h obsidian (interior 2x3, exact, air), flint&steel any interior bottom cell -> portal block (id new) fills interior, block is non-solid, purple swirl cross/animated-2face, emits light 11, entities stepping in teleport (player instant, mobs 60s - mobs skip: document), other side: find/generate portal (056 provides nether side; if no nether yet -> feature-flag: portal exists but warp needs dims present => SHIP WITH 056 in same sprint; THIS issue owns: frame validation, portal block gen + anim texture, CF.dims registry + CF.warp(dimKey) exactly per SPK-7 (renderReset + mob/projectile wipe + player tp + lastDim for back-link pairing), PERSIST v2: {dims:{over:...,nether:...}} + v1 auto-migration + test, bed spawn follows active dim (skip cross-dim for now).
ACs:
- [ ] interact.portal-frame assert (valid builds, invalid rejects: missing corner)
- [ ] portal block + light 11 asserts
- [ ] game.warp round-trip assert (dims swap, player moves, world A untouched - reuse SPK-7 fingerprint style)
- [ ] persist v2: save in both dims, reload, states restored (assert); v1 blob migration assert
- [ ] RELOAD-past-warp shot: stand at portal in nether, save, reload, same position - vision PASS


## Acceptance criteria
