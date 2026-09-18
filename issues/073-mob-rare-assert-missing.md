# Issue: 073 â€” mob.rare assert missing: #044's rare-zombie-drop claim is unasserted (found by audit #8 F1)
- Type: FIX | Status: READY | Epic: Quality | Sprint: 05 (close) | Depends: #044

Audit #8 (docs/audits/2026-09-18-sprint05-close.md) found that issue #044's AC/evidence claim
"mob.rare asserts via forced-roll" (+5 asserts) is not backed by an assert in the built artifact:
- No `mob.rare` literal exists in game/index.html (grep, session 2026-09-18).
- The rare-drop flow in the mobs suite (built index.html ~7969-7974) computes `rareOk` (forced
  `CF.__roll = () => 0.001` kill -> iron/gold/carrot/potato entity names) and then DISCARDS it -
  dead variable, never passed to CF.assert.
- Assert-name diff across committed builds #070 -> #044: ADDED mob.face, surv.poison, save.mobs (3);
  REMOVED mob.env-kill-no-loot (1) -> net +2, matching the runtime totals 261->263 / 245->247.
  The "+5 asserts" wording over-counts by exactly the phantom mob.rare.
Gate numbers themselves are honest (263/247 reproduced). Only the rare-table claim lacks coverage.

## ACs
- [ ] assert the already-computed `rareOk` (e.g. CF.assert(r, 'mob.rare(...)', rareOk)) so the 2.5%x4
      unenchanted table has a real test; suite count +1 (expect 264/248 after merge)
- [ ] #044 evidence corrected with a pointer note; PLAYBOOK honesty rule ("never claim an assert that
      is not named in the build") re-cited in the fix commit

## Evidence
- audit #8: spike/audit8-names.mjs build-diff outputs; built index.html:7970-7974 (dead rareOk);
  missing-literal grep list (mob.rare = only sampled claimed literal absent; 27 others FOUND).

## Status: DONE (fixed during audit#8 same-close, 2026-09-18)
- src/mobs.js now: CF.assert(r, 'mob.rare(ents=..,all4=..)', rareOk && CF.itemEnts.length === 4) right after the forced-roll kill;
  built grep finds 'mob.rare'; full 264/0 quick 248/0 (net +1 real vs 263); #044 evidence annotated; counts everywhere corrected.
