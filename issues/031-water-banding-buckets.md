# Issue: 031 - Water surface banding + lava brightness + buckets
- Type: FIX | Status: READY | Epic: E6 | Sprint: 02/03 | Depends: #022

## Spec
(a) WATER BANDING: flowing pool renders alternating dark rows across the surface (see qa/2026-09-04/fluid-pool.png).
Ruled out: opaque-pass leak (fixed, still bands), degenerate quads (fixed, still bands), coplanar z-fight
with banks (surface lowered 0.12, still bands). Probe data: light=240 everywhere above surface, wtris=286,
glErr=0, center pixel correct deep-blue. Suspect: per-cell side faces drawn INTO the water volume visible
through the lowered surface, or blend order without per-pixel depth sort. Needs fresh eyes.
(b) LAVA tile renders dark (OVERLAY noise); MC lava is bright orange emissive-looking.
(c) Buckets: iron bucket item; right-click water/lava source = pickup (empty->filled), filled = place;
this is the 'break' equivalent to flip water/lava functional:true (+2 blocks parity).
## Acceptance criteria
- [ ] AC1 shot: pool surface visually coherent (no alternating black rows) - vision PASS
- [ ] AC2 lava sheet + in-scene: bright orange
- [ ] AC3 harness: bucket pickup/place round-trip; water/lava become functional w/ proof
