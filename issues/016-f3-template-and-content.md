# Issue: 016 — Re-issue #009 (F3) to template + content asserts; then keep [x]
- Type: FIX | Severity: P2 (audit 2026-09-04, F7) | Status: READY
- Epic: docs/backlog/epics.md (E11 QA / E7 UI) | Sprint: — | Depends on: — | Time-box: <= 1 iteration-day

## SMART
- [ ] Specific: (a) retro-fill issues/009 with the §3 sections it lacks (SMART, spec,
      ACs, test plan, parent epic); (b) strengthen f3Tests to assert CONTENT, not just toggle
- [ ] Measurable: overlay text contains correct XYZ/fps/target when aimed at a known block
- [ ] Achievable / Relevant: §3 issue law + Tier-1 "F3 debug" claim needs real backing / Time-boxed 0.5d

## 1.12.2 Reference spec
REFERENCE §F3: FPS, XYZ, block, chunk coords + local, facing, light (block/sky),
targeted block (name+meta+coords), biome, memory, entity counts. Shipped overlay has:
fps, ticks, XYZ, chunk, facing, target, chunks, tris, seed, hotbar, drops. MISSING:
light block/sky, biome, memory, entity counts, chunk-local. PARITY.md "[x] F3 debug"
is therefore premature as a Tier-1 gate line.

## Reproduction (auditor)
issues/009-f3.md = 6 lines, no AC/SMART/spec; src/f3.js:32 asserts only
overlay-exists + display toggle.

## Acceptance criteria
- [ ] AC1: issues/009 gains missing sections (appended correction; evidence preserved)
- [ ] AC2: f3.assert content: after scripted target, overlay text includes target name + coords and XYZ matches player pos (parse div.textContent in harness)
- [ ] AC3: add light/biome/entity-count lines once light (#019 reserved, see #015.7) exists OR open explicit follow-up issue; until then PARITY.md F3 line annotated "v1" honestly
- [ ] AC4: test.mjs still green (41+N asserts)

## Test plan
- Harness: f3.content-* asserts parsing overlay text
- Shot: F3-on overlay shot for vision legibility check
- Vision: overlay readable, numbers plausible

## Evidence (fill at close)
- outputs:
