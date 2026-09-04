# Issue: 001 — Bootstrap spikes SPK-1..6
- Type: SPK — Status: DONE — Sprint: 00 — Epic: n/a (gates all later epics)

## Acceptance criteria
- [x] All 6 mandatory spikes run with throwaway code on spike/ branch (spike/bootstrap-01)
- [x] Verdict docs in docs/spikes/ with evidence numbers + design consequences
- [x] Verdicts: SPK-1 GO, SPK-2 GO, SPK-3 GO, SPK-4 GO-WITH-ALT(heap A*), SPK-5 GO, SPK-6 GO
- [x] Proven infrastructure promoted (texture pipeline tools/tex/gen.py+atlas, harness); throwaways stay unmerged

## Evidence (close)
- SPK-1: meshMs 50.5ms/16 chunks, greedy 53% tri reduction, glErr 0, vision-checked terrain PNG.
- SPK-2: TEXGEN_OK 19 tiles; sheet vision-checked; atlas decoded in-browser (test pass atlas.decoded).
- SPK-3: gen 0.23ms/chunk; set/get 100k=7ms; BFS budgets fit 50ms tick.
- SPK-4: naive 57ms/agent -> ALT mandated; documented.
- SPK-5: RLE 0.063 ratio; ~1900 chunks/5MB; eviction policy designed.
- SPK-6: test.mjs GREEN + shot PNG vision-inspected; rAF-vs-timers learning documented.
