# Issue: 032 — #025 AC4 furnace GUI: false [x] + missing feature
- Type: FIX (audit #4 F1, P1) | Status: READY | Epic: E7 | Sprint: 03 | Depends: #025 (DONE), #024 (DONE)

## SMART
- [x] Specific: issues/025 AC4 "furnace UI: smelt progress advances (shot)" is checked [x] but
      no furnace GUI exists anywhere in src/ (zero furnace references in src/ui.js; no right-click
      handler, no 3-slot panel, no progress bar, no shot PNG). Furnace smelt LOGIC exists
      (CF.furnaceTick in items.js, items.smelt assert) but the UI is absent. AGENTS.md #024 line
      deferred "furnace/GUI -> #025"; #025 closed without it while claiming AC4 done.
- [x] Measurable: AC4 of #025 unchecked immediately (integrity fix); furnace GUI shipped later
      flips it [x] with harness assert + shot.
- [x] Achievable: uncheck = 1 char now; GUI = DOM panel reusing ui.js slot infra, reads
      CF.blockEntities + f.burn/f.cook.
- [x] Relevant: false [x] on a closed sprint issue violates DoR ("[x] without evidence cannot be
      READY"); it was the sprint-close gate for the v0.2.0 tag.
- [x] Time-boxed: integrity fix <= 10 min; GUI 1 iteration-day in sprint 03.

## 1.12.2 Reference spec
GUI: 3 slots (input top, fuel bottom-left, output right) + arrow progress (burn) + flame +
cook arrow; opens on right-click of furnace block; smelt 200t/item, coal 1600t fuel (already
implemented in logic per #024).

## Acceptance criteria
- [ ] AC1 integrity: issues/025 AC4 unchecked with pointer to this issue (immediate, part of audit #4 fix batch)
- [ ] AC2 harness: place furnace, open GUI via right-click (CF harness event), insert iron_ore+coal,
      cook advances, iron_ingot collectable from output slot -> named assert green
- [ ] AC3 shot: furnace-open.png with visible progress arrow at ~50% cook (vision)
- [ ] AC4 registry furnace functional flag stays false until THIS issue ships (GUI interaction is
      the §7 'behavior/interactions' requirement); re-evaluate then.

## Test plan
Harness assert (AC2) + shot scenario (AC3); reuse ui.js slot/ghost machinery + items.js furnaceTick.

## Risk / feasibility
Low; state already lives in CF.blockEntities (furnacePlace/furnaceTick), only view layer missing.

## Evidence (fill at close)
