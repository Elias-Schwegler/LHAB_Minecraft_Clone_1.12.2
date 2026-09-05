# Issue: 033 - Test-suite split per module (gate speed)
- Type: CHORE | Status: DONE | Epic: QA | Sprint: 03 | Depends: —

## Spec
Full gate drifted to ~180s wall. Split harness into named suites (per module), tag slow ones
(grass 24k ticks, time 48k ticks, fluids basin storms), add `--quick` and `--suites=` modes,
print per-suite timings. Dev loop must reach <60s; full run stays mandatory for merges/audits.

## Acceptance criteria
- [x] suites exist + runnable individually; quick skips slow; full preserves every assert (count check)
- [x] quick wall < 60s measured; DoD gate command documented in AGENTS.md

## Evidence (close)
- Suite split: boot/world/light/grass*/time*/fluids*/render/player/interact/f3/items/ui/survival/save
  (* = slow-tagged). worldTests mega-function cut into 5 self-contained suites (raw-segment splice, verified).
- Wall times measured (this box): --quick 32s (was ~180s full; goal <60s MET), full --all 96s, single suite ~17s.
- Assert parity: 107 pass both before and after split (verified same count + 0 fails/errors).
- Key fix: game loop stops at boot-suite end (CF.stopGameLoop) - SwiftShader redraw storm was eating the
  virtual-time budget; suites drive sim manually.
- test.mjs: --quick / --suites=a,b flags + per-suite timing table printed.
