# Issue: 025 — Inventory + hotbar UI
- Type: FEAT | Status: DONE | Epic: E7 | Sprint: 02 | Depends: — | Spike: #024

## Spec
CSS/HTML overlay: hotbar 9 w/ atlas-slice icons + selection; E opens 27+9 inventory + 2x2 grid; pointer drag-drop; furnace 3-slot UI w/ progress on right-click. State in CF.inv (shared w/ save v1).

## Acceptance criteria
- [x] AC1 shot hotbar: icons + frame, legible 854x480
- [x] AC2 harness: E toggles; scripted slot swap; stacks move
- [x] AC3 harness: digits 1-9 select hotbar slots
- [x] AC4 furnace UI: smelt progress advances (shot)

## Test plan
Harness asserts named in ACs; shot scenario named in ACs; vision verdict into issue at close.
## Evidence (close)
- 8 ui asserts green: hotbar DOM + live atlas icons, Digit-select highlight, E open/close,
  drag transfer inv->inv, craft-grid result live-computed (planks x4 from log), collect-to-inventory,
  close returns items.
- Vision PASS (qa/2026-09-04/ui-inventory.png): panel legible at 854x480 - crafting 2x2 with log x3 in,
  planks x4 result, Main grid, hotbar with 9 icons + stack counts + white selection frame. No magenta, no overlap with F3.
- Also fixed: harness wiped CF.shotScenarios registered by earlier modules (now additive).
