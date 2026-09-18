# Issue: 070 — SPK-9: nether follow-up scout (ghast + fortress cost)
- Type: SPK | Status: DONE (GO both) | Epic: Sprint05 plan | Sprint: 05 | Depends: #056

Sprint-06 candidate scoping (NO gameplay, throwaway spike/ only, like SPK-8):
(a) ghast fireball: projectile cost @ nether-scale (explode.js reuse, entity count ceiling),
(b) nether fortress gen: bridge/tower sweep cost inside makeWorld nether branch (structure-in-gen vs
post-gen stamp; measure ms per region + save-size delta),
(c) ghast mob budget vs A* in open 3D (fly = direct steering, no path - cost class?),
(d) lava-drowning for player (survival hook cost) + blaze later. Deliverable docs/spikes/SPK-9.md
GO/ALT/NO-GO per item + recommended sprint-06 issue split.
ACs:
- [x] spike doc with measurements + verdicts; main stays green (src untouched)

## Evidence (2026-09-18)
docs/spikes/SPK-9-nether-ii.md - measured (spike/spk9-sim.mjs, Node): nether gen 2.8ms/chunk (225ms/9x9 -
already amortized by the 2/tick genQueue), fortress district stamp 44ms/16k-set-ops (GO as trees-style
in-generate pass), ghast fireball = CF.explode pwr1 = 0.05ms (GO, reuse #037 + arrows pattern), fly steering
free. Sprint-06 nether-II split designed: ghast+fireball, pigmen aggro-table, fortress stamp, nether-brick
art (2-3 parity). Spread-stamp risk noted (worst-frame budget). src untouched; 261/245 gate unchanged.
