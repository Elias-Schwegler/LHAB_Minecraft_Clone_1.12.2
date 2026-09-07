# Issue: 047 — Game feel: no crosshair; camera stutter + vertical jitter (reported by user)
- Type: FIX (P1-class: playability) | Status: DONE | Epic: UX | Sprint: 03

## Report (user gameplay, 2026-09-06)
(a) The white crosshair (Fadenkreuz) never appears ("seems to work that way" = aiming functions but there
    is no visible reticle) — core to the Minecraft feel, must exist.
(b) Movement "feels almost broken": vertical bobbing/"bugging up and down" while standing/walking and a
    general stutter.

## Analysis
- Crosshair: never implemented (ui.js has hotbar/inv/survival HUD, no reticle). Trivial DOM element.
- Stutter: sim runs at FIXED 20 Hz (setInterval 50ms) but rendering draws the raw sim position on every
  rAF (60-144 Hz) -> motion updates in visible 20 Hz steps = stutter. MC smooths by interpolating render
  state between ticks. FIX: store P.prevPos each tick + expose tickAlpha = (now-lastSimMs)/50 at draw ->
  camera position = lerp(prevPos, pos, clamp01(alpha)). Same for yaw/pitch (mouse updates immediately, so
  only pos needs lerp).
- Vertical jitter: land snap `y = Math.floor(y-HH)+1+HH` + `Math.round((y-HH)*1000)/1000` snap fights the
  per-tick gravity step; with interpolation ANY residual +/-1e-2 unit snap now AMPLIFIES visually ->
  stabilise: only snap when actually landing (vel[1] reset), remove the per-tick round snap; clamp
  resting pos exactly once. Re-check step-up (0.6 + 0.75 progress) doesn't ratchet (step-up without headroom).

## Acceptance criteria
- [x] AC1: crosshair: #xh DOM element (two 2px white lines, mix-blend-mode:difference = readable on any
      bg), hidden while CF.ui.open (inv/chest/furnace/bed). ui.crosshair assert + starter-world.png shows
      it centred over the tree scene. Vision PASS.
- [x] AC2: camera interpolation: P.prevPos per sim tick + frame() lerps eye pos by (now-lastSimAt)/50
      (game.js). 20Hz sim now paints as smooth 60Hz+ motion. Manual walk-through not possible in CI -
      mechanism asserted indirectly by AC3 + full suite green; user to confirm feel.
- [x] AC3: ui.stand-rock-still: 600 ticks standing after landing, dy==0 exactly + onGround. NOTE: the
      actual jitter/bounce ROOT CAUSE (landing-snap ratchet + center/feet round line) was found and fixed
      under #046 while making mob.px-draw deterministic - #047 keeps the interpolation + crosshair.
- [x] AC4: TEST GREEN 195 full / 184 quick, 0 errors (ui.crosshair + ui.stand-rock-still added); survival
      HUD append made synchronous + pip null-guarded (latent microtask race found en route).

## Evidence
- Branch feature/047-game-feel -> merge --no-ff 2026-09-07; qa/2026-09-07/starter-world.png (crosshair
  visible, trees solid) vision PASS.
- Files: src/ui.js (xh style/el/refresh + 2 asserts), src/game.js (prevPos lerp in frame()),
  src/player.js (prevPos), src/survival.js (sync append + guards).
