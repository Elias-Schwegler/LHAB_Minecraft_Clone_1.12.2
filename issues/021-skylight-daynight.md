# Issue: 021 — Skylight + day/night cycle
- Type: FEAT | Status: DONE | Epic: E5 | Sprint: 02 | Depends: — | Spike: SPK-3

## Spec
Sky light: vertical columns no-decay, horizontal decay 1 (1.12). Day cycle 24000 ticks at 20 TPS; daylight factor curve (full day 1, dusk ramp, night 0); ambient = max(skylight*factor, blockLight). Sky clear-color + fog tint follow the curve. Nights dark enough for torches to matter.

## Acceptance criteria
- [x] AC1 harness: covered cave block skylight=0 at noon; open surface=15
- [x] AC2 harness: daylight factor monotonic segments over a day; night factor 0
- [x] AC3 shot same-spot day vs night: night darker, torch-lit circle visible
- [x] AC4 2 in-game days no crash, fps stable in virtual time

## Test plan
Harness asserts named in ACs; shot scenario named in ACs; vision verdict into issue at close.
## Evidence (close)
- 6 time asserts: day=1/night=0, dusk+dawn cosine-monotonic, 2 days (48k ticks) no-crash, pixel night/diff (69 vs 157 @ same cam).
- Shots: night-world.png + night-glow.png vs day baselines: same frame visibly night; glowstone halo w/ radial falloff at night (vision PASS).
- Moonlight = sky level 4 equivalent (1.12 moon level, documented in render.js uniform floor).
- F3 now shows Time + Daylight%.
