# Issue: 061 — test suites are order-coupled (--suites= subsets crash)
- Type: FIX | Status: READY | Epic: Quality | Sprint: 05 | Depends: none

Found by audit #7 (F4, P3): `node tools/test.mjs --suites=interact,...` (surgical subset) throws a null
`hit.y` at built index.html:4229 and later suites die - the interact suite ASSUMES state a previous suite
built (boot/world land the player + arena chunks). Subsets are a dev convenience we advertise, so either
make suites self-setup (preferred: each suite ensureAround+tp + its own arena build, several already do)
or document "run order is the interface" in PLAYBOOK and guard the crash with a clear error.
ACs:
- [ ] --suites=interact alone passes; --suites=save alone passes; --suites=mobs alone passes
- [ ] full suite unchanged green (no assertion weakened); PLAYBOOK line on suite-state contract

## Evidence
- audit #7 F4: docs/audits/2026-09-12-sprint04-close.md (repro command in section 4/F4).
