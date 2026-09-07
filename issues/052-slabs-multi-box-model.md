# Issue: 052 — slabs multi-box model
- Type: FEAT | Status: DONE | Epic: Sprint04 plan | Sprint: 04 | Depends: per body

Depends on model-class decision: register model:'slab' -> renderer multi-box emit (2 AABBs) + AABB list for collision + placement: on top face of bottom-half slab => double slab; top-click on full block => top-half slab; light/AO from owning cell.
1.12 values: half-height 0.5, collision = half box, drops 1 (silk skip: 1 normal), recipe 3 same-wood/stone horizontal row.
Scope: stone + cobblestone + planks slabs (+ brick when 051 ships), 'slab' generic model in render/player/item-placement, proof-countable single variants (stone_slab is FAMILY of 6 in catalog: count stone/cobble/brick/planks/oak = 5 rows? family rule: only implemented variants count).
ACs:
- [x] physics: stand-on-half assert (player rests at .5)
- [x] merge-to-double + split-on-break assert
- [x] parity counts implemented slab variants via tool
- [x] slab-step shot vision PASS (no face holes: works with #046 meshing)


## Acceptance criteria

## Evidence (close 2026-09-08)
- Multi-box model class: registry v.boxes + flat bits (2=top-half, 4=double); dedicated mesher pass (per-face
  neighbor culling w/ half-cover awareness coverFace() in greedy too); physics cellTopAt/solidSpanXZ in player+
  mobs (stand at +0.5), interact: top-face upgrade to double, top-half on ceiling face, double drops 2 (dropN).
- Variants counted: stone_slab cobblestone+stone, wooden_slab oak -> PARITY 50 -> 53/399 (13.3%).
- asserts: registry.slab-model, physics.slab-stand(feet==+1.5 exact), interact.slab-place-upgrade(upgrade+got2);
  recipes 3-in-row -> 6 slabs (cobble/stone/planks). Gate 216 full / 200 quick GREEN 0 errors.
- Light: 1.12 - slabs pass skylight (only doubles opaque) - fixed black under-slab faces + floor holes
  (5 latent bugs found via this issue: abs-vs-local box UVs, chunk-origin corner bug, cell-boundary face
  culling, non-flush face light sampling, slab transparency) -> all shipped + PLAYBOKED.
- Shots (vision PASS): qa/2026-09-08/slab-scene3.png (bottom/top/double step, no holes) + 3 new sheets.
- v1 simplifications -> #048/#053: slab side textures flat-ish, no split faces against half-slabs, stairs reuse next.
