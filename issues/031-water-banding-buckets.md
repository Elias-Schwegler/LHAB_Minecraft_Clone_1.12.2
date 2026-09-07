# Issue: 031 - Water surface banding + lava brightness + buckets
- Type: FIX | Status: DONE (closed via #046+#043) | Epic: E6 | Sprint: 02/03 | Depends: #022

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

## Evidence (close 2026-09-07, via #046 + #043)
(a) Banding had THREE stacked causes, all now fixed and shot-verified: missing -axis faces (#046),
    half-stride atlas making the Blender water tile look half-empty (#043 P1 - real tile regenerated),
    and liquid-pass depth write (#043 depthMask(true)); plus sky-15 no-decay (#046/#031 canopy rows).
    qa/2026-09-07/fluid-pool.png: uniform surface - vision PASS.
(b) Lava: real Blender tile now + emissive render rule (level-lava full bright) + block light 15 actually
    SEEDS (#043 relight liquid fix). qa/2026-09-07/fluid-lava.png + bucket-demo cobble ring - vision PASS.
(c) Buckets: #043 items.bucket-* asserts x7; water/lava functional:true proof-bound; parity 18 -> 20/399.
