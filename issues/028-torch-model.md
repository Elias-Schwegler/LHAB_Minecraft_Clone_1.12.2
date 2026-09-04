# Issue: 028 - Torch: cross model + item + light 14
- Type: FEAT | Status: DONE | Epic: E5 | Sprint: 02 | Depends: #020, #024

## Spec
Non-cube block rendering (cross/quadrant model for torch, MC torch=two quads crossed; post via item-model later). Placed on surface w/ face attachment. Light 14. Craftable (coal+stick->4). Item icon.

## Acceptance criteria
- [x] AC1 render: torch draws as 2 quads, visible at night w/ 14-light halo (shot)
- [x] AC2 harness: place torch on wall face; light 14 at source
- [x] AC3 craft recipe works via #024 crafting API

## Evidence (close)
- 3 asserts green: torch attaches to solid face only (on-wall PASS, no-float PASS);
  pop test: g=0, c=21/21 - pops exactly when its ATTACHED face's support block is removed, returns to inventory.
- Fidelity win found BY the test: initial impl used "any adjacent solid" (wrong: torch next to ground on
  any side never popped); now per-face attachment stored in cell flat[] (codes 1/2/4/6/8) checked per removal.
- Torch render/light already proven in #024 (torch-craft.png halo, torch-light assert 14->13/10).
