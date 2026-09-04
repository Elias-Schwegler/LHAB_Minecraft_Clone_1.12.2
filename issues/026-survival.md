# Issue: 026 — Survival: health/hunger/fall/respawn
- Type: FEAT | Status: READY | Epic: E8 | Sprint: 02 | Depends: — | Spike: #019 #024

## Spec
Creative default; survival toggle (F4). Fall dmg floor(dist-3); sprint/dig exhaustion -> hunger; food<=6 no sprint; 0 food -> damage to death; death -> respawn spawn 20hp (items kept v1). HUD hearts+food v1. Apple from oak leaves drops (#019).

## Acceptance criteria
- [ ] AC1 harness: 10-block fall = 7 dmg; <=3 = 0
- [ ] AC2 harness: sprint requires food>6; exhaustion accrues sprinting
- [ ] AC3 harness: starvation damage ticks; death -> respawn
- [ ] AC4 shot hud: hearts + drumsticks legible

## Test plan
Harness asserts named in ACs; shot scenario named in ACs; vision verdict into issue at close.
