# Issue: 032 â€” Furnace GUI (audit #4 P1 escape closure)
- Type: FIX-P1
- Status: DONE
- Epic: docs/backlog/epics.md (Containers)
- Sprint: 03 (carried from 02)
- Depends on: #024 (BE + smelting DONE), #025 (UI stack mechanics DONE)

## Why
Audit #4 F1 (P1): #025 closed with a false [x] â€” "furnace/GUI" was deferred from #024 but its deferral
target shipped without it. Furnace is craftable and smelts via backend, but cannot be OPENED by the
player; registry honestly kept functional:false, so parity didn't lie â€” but the mechanic was unusable.

## 1.12.2 Reference spec
docs/REFERENCE.md furnace row: right-click opens furnace GUI â€” input (top), fuel (bottom), flame burn
progress, arrow cook progress, output slot (TAKE-ONLY: cannot insert into output). Contents persist in
the block while closed; breaking returns furnace + spits contents (we give to player: no item entities
Tier-1 â€” documented deviation, #044).

## Acceptance criteria
- [x] AC1: right-click on furnace opens GUI with input/fuel/output slots (useBlock routing).
      evidence: ui.furn-open assert + ui-furnace.png vision
- [x] AC2: ghost-drag inserts ore into input and fuel into fuel slot; flame + cook bars reflect
      burn/cook progress. evidence: ui.furn-insert + ui.furn-smelt asserts, shot bars
- [x] AC3: output is take-only; smelted item moves to inventory via one click.
      evidence: ui.furn-takeout + ui.furn-noout-insert asserts
- [x] AC4: E closes the panel; contents remain in the block entity; breaking returns contents.
      evidence: ui.furn-close + ui.furn-break-contents asserts
- [x] AC5: furnace flips functional:true proof-bound -> parity 18/399; full suite GREEN no regressions.
      evidence: tools/parity.mjs + tools/test.mjs

## Test plan
- ui suite additions: ui.furn-open / furn-insert / furn-smelt / furn-takeout / furn-noout-insert /
  furn-close / furn-break-contents
- Scenario: ui-furnace (player POV, furnace placed next to them, mid-smelt 150t: flame ~9%, cook 75%)
- Vision: panel shows furnace title, ore in input, coal in fuel, orange+blue bars mid-fill, no magenta


## Evidence (closed 2026-09-06)
- Gate: full **132/132 GREEN** (125 + 7 new: ui.furn-open/insert/smelt/takeout/noout-insert/close/break-contents),
  quick 121; 0 errors. All 7 literals verified present in BUILT game/index.html (proof rule).
- Registry: furnace functional:true with proof{#032, tests:[items.smelt, ui.furn-*]} ->
  parity.mjs now **18/399, t1 18/125** (furnace joins counted set; qa/blocks/furnace.png sheet present since #024).
- Screenshot qa/2026-09-06/ui-furnace.png (seed 5, mid-smelt): VISION VERDICT PASS - "Furnace" section shows
  input=raw iron ore(2), fuel=coal, output=iron ingot; orange burn bar + light-blue cook bar both visibly
  partial-filled; Crafting + Main 36-grid + hotbar intact; world visible behind; no magenta, no GL errors.
- Implementation: ui.js generic slot accessors (inv/craft/container) + furnace DOM panel; interact RMB
  CF.useBlock routing (container BEFORE place/eat, 1.12 order); items.js furnaceBreak returns contents
  (no item entities - documented Tier-1 simplification, same as #035 loot); output take-only enforced.
- Deviations: no shift-click quickmove, no burn-bar flame flicker anim; chest UI reuses this container
  plumbing in #040 as planned.
