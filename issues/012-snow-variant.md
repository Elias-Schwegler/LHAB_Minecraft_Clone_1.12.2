# Issue: 012 — "snow" is not a 1.12.2 variant: fix catalog, count, worldgen surface
- Type: FIX | Severity: P1 (audit 2026-09-04, F3) | Status: READY
- Epic: docs/backlog/epics.md (E2 worldgen / E3 textures)
- Sprint: — | Depends on: — | Spike: —
- Time-box: <= 1 iteration-day (decision + honest re-count + surface swap)

## SMART
- [x] Specific: reconcile catalog/REFERENCE/game for snow
- [x] Measurable: parity tier-2 count truthful; REFERENCE/catalog agree; no 1.13-era block counted
- [x] Achievable / Relevant: parity metric honesty (§1.4/§7) / Time-boxed 1d

## 1.12.2 Reference spec
1.12.2 registered block is `snow_layer` (id 78), metas 0–7 (1–8 layers), walkable,
drops nothing by hand (silk touch only). A full solid snow CUBE (snow_block) was
added in 1.13 — it does NOT exist in 1.12.2 and must not be counted or shipped as
one. docs/catalog.json currently has `{"n":"snow","id":80,"v":1,"tier":2,"note":
"snow block"}` which contradicts REFERENCE's own snow-layer rows.

## Reproduction (auditor)
`node tools/parity.mjs` → tier 2: 1/163 (snow). src/registry.js "snow" full cube,
hardness 0.2, bare-hand drop "snow". src/world.js frozen-biome surface places the
full snow cube. qa/blocks/snow.png shows the white cube.

## Acceptance criteria (PO decision required at top of issue)
- [ ] AC1 (default path): de-count snow now (functional:false), catalog entry corrected to snow_layer v=8 tier-2 (denominator 399→406 recomputed and re-stated in PARITY.md), OR explicit documented counter-decision with 1.12.2 registry evidence
- [ ] AC2: frozen-biome surface no longer places a full white cube that doesn't exist in 1.12.2 (use grass+dirt or stone placeholder until snow_layer mechanic lands; NO invisible terrain)
- [ ] AC3: parity re-run + PARITY.md/AGENTS.md updated with corrected count
- [ ] AC4: qa/blocks/snow.png regenerated or removed-with-rationale (evidence matches counted state)
Deferred (separate backlog, epic E6): snow_layer mechanic (8 metas, silk-only drop, light melt).

## Test plan
- Harness: parity-consistency (no functional variant whose catalog tier/name disagrees)
- Shot: frozen-biome scenario PNG for AC2 vision (no floating white cubes, terrain readable)
- Vision: frozen surface looks plausible w/o 1.13-era block

## Risk / feasibility
None code-risky; denominator change shifts every % — must be re-stated openly in PARITY.md.

## Evidence (fill at close)
- Build/test output:
- Screenshots (qa/…):
- Vision verdict per AC:
- Parity impact: expected 16/399 → 15/N (N≈406 after snow_layer v=8)
