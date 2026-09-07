# Issue: 052 — slabs multi-box model
- Type: FEAT | Status: READY | Epic: Sprint04 plan | Sprint: 04 | Depends: per body

Depends on model-class decision: register model:'slab' -> renderer multi-box emit (2 AABBs) + AABB list for collision + placement: on top face of bottom-half slab => double slab; top-click on full block => top-half slab; light/AO from owning cell.
1.12 values: half-height 0.5, collision = half box, drops 1 (silk skip: 1 normal), recipe 3 same-wood/stone horizontal row.
Scope: stone + cobblestone + planks slabs (+ brick when 051 ships), 'slab' generic model in render/player/item-placement, proof-countable single variants (stone_slab is FAMILY of 6 in catalog: count stone/cobble/brick/planks/oak = 5 rows? family rule: only implemented variants count).
ACs:
- [ ] physics: stand-on-half assert (player rests at .5)
- [ ] merge-to-double + split-on-break assert
- [ ] parity counts implemented slab variants via tool
- [ ] slab-step shot vision PASS (no face holes: works with #046 meshing)


## Acceptance criteria
