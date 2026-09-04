# Issue: 025 — Inventory + hotbar UI
- Type: FEAT | Status: READY | Epic: E7 | Sprint: 02 | Depends: — | Spike: #024

## Spec
CSS/HTML overlay: hotbar 9 w/ atlas-slice icons + selection; E opens 27+9 inventory + 2x2 grid; pointer drag-drop; furnace 3-slot UI w/ progress on right-click. State in CF.inv (shared w/ save v1).

## Acceptance criteria
- [ ] AC1 shot hotbar: icons + frame, legible 854x480
- [ ] AC2 harness: E toggles; scripted slot swap; stacks move
- [ ] AC3 harness: digits 1-9 select hotbar slots
- [ ] AC4 furnace UI: smelt progress advances (shot)

## Test plan
Harness asserts named in ACs; shot scenario named in ACs; vision verdict into issue at close.
