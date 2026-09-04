# Issue: 022 — Water/lava flow + interactions
- Type: FEAT | Status: READY | Epic: E6 | Sprint: 02 | Depends: #020 | Spike: SPK-3 GO

## Spec
Water/lava with level meta 0-7 (source=0, flow distance). Water: spreads 7, level+1 per step, falls reset; lava: distance 3 overworld, flows slower (every 4 ticks, random-ish). Dirty-region queue (SPK-3). RESOLVED for DoR: water touching lava SOURCE -> cobblestone; lava (source or flow) touching WATER -> stone. Water rendered translucent (separate blend pass, later z-sort note in AGENTS).

## Acceptance criteria
- [ ] AC1 harness: source on flat ground -> exactly distance-7 spread, then stops
- [ ] AC2 harness: water into lava source -> cobblestone assert
- [ ] AC3 harness: 16^3 flood region tick cost < 30ms
- [ ] AC4 shot pool: water surface translucent, no z-fight (vision)

## Test plan
Harness asserts named in ACs; shot scenario named in ACs; vision verdict into issue at close.
