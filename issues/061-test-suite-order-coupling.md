# Issue: 061 — test suites are order-coupled (--suites= subsets crash)
- Type: FIX | Status: DONE | Epic: Quality | Sprint: 05 | Depends: none

Found by audit #7 (F4, P3): `node tools/test.mjs --suites=interact,...` (surgical subset) throws a null
`hit.y` at built index.html:4229 and later suites die - the interact suite ASSUMES state a previous suite
built (boot/world land the player + arena chunks). Subsets are a dev convenience we advertise, so either
make suites self-setup (preferred: each suite ensureAround+tp + its own arena build, several already do)
or document "run order is the interface" in PLAYBOOK and guard the crash with a clear error.
ACs:
- [x] --suites=interact alone passes; --suites=save alone passes; --suites=mobs alone passes
- [x] full suite unchanged green (no assertion weakened); PLAYBOOK line on suite-state contract

## Evidence (2026-09-17)
- ROOT CAUSE: suites relied on boot (GL wait + stopGameLoop) and world (arena terrain + grounded player)
  side effects; `--suites=player` threw createVertexArray-on-null-gl, interact aimed into unloaded void (null
  hit), save.v2 had no nether dim, mobs/interact found bare terrain.
- FIX: harness.runTests PRELUDE (any selection): wait CF.ready + CF.gl, ensureAround(player,4) + drain +
  ground player, stopGameLoop when boot not selected (boot still asserts live ticking BEFORE stopping).
  persist save.v2 self-provisions the nether instance (mirrors CF.warp's lazy create, trackWorld included).
- Matrix verified: boot-less singles GREEN: interact, save, mobs, player, render, f3, light, ui, bed,
  survival, items; combos GREEN: interact,save / world,light,grass (the grass-spread rng-shift that bit #062
  dev work also gone - prelude fixed alignment order-dependence).
- Full 242/0, quick 226/0 unchanged (no weakened asserts). Audit F4 repro commands from
  docs/audits/2026-09-12-sprint04-close.md all green.
