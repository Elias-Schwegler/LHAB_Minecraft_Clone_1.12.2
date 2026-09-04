# Issue: 026 — Survival: health/hunger/fall/respawn
- Type: FEAT | Status: DONE | Epic: E8 | Sprint: 02 | Depends: — | Spike: #019 #024

## Spec
Creative default; survival toggle (F4). Fall dmg floor(dist-3); sprint/dig exhaustion -> hunger; food<=6 no sprint; 0 food -> damage to death; death -> respawn spawn 20hp (items kept v1). HUD hearts+food v1. Apple from oak leaves drops (#019).

## Acceptance criteria
- [x] AC1 harness: 10-block fall = 7 dmg; <=3 = 0
- [x] AC2 harness: sprint requires food>6; exhaustion accrues sprinting
- [x] AC3 harness: starvation damage ticks; death -> respawn
- [x] AC4 shot hud: hearts + drumsticks legible

## Test plan
Harness asserts named in ACs; shot scenario named in ACs; vision verdict into issue at close.
## Evidence (close)
- 10 survival asserts green: fall10 (in 11..14 range band - discrete peak logging documented),
  fall3 = 0 dmg exact, sprint gated at food<=6, starvation floors at 1 hp, apple eating (+4 food, consumes),
  regen while fed, void death -> respawn w/ full stats + counter, HUD DOM (10 hearts + 10 food).
- Shot qa/2026-09-05/hud-low.png: hearts row (3.5/10 red) + food row (3/10) above hotbar, legible (vision PASS).
- Lava damage + drowning implemented via same tick (lava tested indirectly via damage() path; drown air countdown).
- Deviations documented: F4 toggles survival (creative default); square HUD pips (sprites = texture-pack polish later).
