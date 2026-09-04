# Issue: 021 — Skylight + day/night cycle
- Type: FEAT | Status: READY | Epic: E5 | Sprint: 02 | Depends: — | Spike: SPK-3

## Spec
Sky light: vertical columns no-decay, horizontal decay 1 (1.12). Day cycle 24000 ticks at 20 TPS; daylight factor curve (full day 1, dusk ramp, night 0); ambient = max(skylight*factor, blockLight). Sky clear-color + fog tint follow the curve. Nights dark enough for torches to matter.

## Acceptance criteria
- [ ] AC1 harness: covered cave block skylight=0 at noon; open surface=15
- [ ] AC2 harness: daylight factor monotonic segments over a day; night factor 0
- [ ] AC3 shot same-spot day vs night: night darker, torch-lit circle visible
- [ ] AC4 2 in-game days no crash, fps stable in virtual time

## Test plan
Harness asserts named in ACs; shot scenario named in ACs; vision verdict into issue at close.
