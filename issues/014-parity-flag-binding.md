# Issue: 014 — Bind parity `functional` flag to per-variant evidence (tamper-resistance)
- Type: FIX | Severity: P2 (audit 2026-09-04, F5) | Status: DONE
- Epic: docs/backlog/epics.md (E5-adjacent; tooling)
- Sprint: — | Depends on: — | Spike: —
- Time-box: <= 1 iteration-day

## SMART
- [ ] Specific: parity.mjs requires an evidence sidecar per counted variant, not just flag+png+tile
- [ ] Measurable: flag-flip tamper (audit reproduction A) makes parity FAIL, not inflate
- [ ] Achievable / Relevant: §1.4 metrics honesty / Time-boxed 1d

## 1.12.2 Reference spec
§7 counting rule; §2 tooling "counts implemented blocks from the in-game registry +
verifies each has Blender-sourced texture + screenshot proof" — flag itself is
self-declared data inside the shipped artifact.

## Reproduction (auditor)
Edit BUILT game/index.html: bedrock `"functional":false`→`true`, run parity → 17/399.
No assert/behavior was verified; png+tile already existed, so the metric moved 1 word later.

## Acceptance criteria
- [ ] AC1: qa/blocks/<key>.evidence.json sidecar per counted variant {variant, asserts:[test ids], shot, verdict, date}; parity.mjs refuses count without it
- [ ] AC2: listed assert ids must exist in a fresh test.mjs TESTRESULT pass list (parity runs or parses test.mjs output)
- [ ] AC3: negative-control: parity exits non-zero (or stops counting) when a flagged variant lacks sidecar — verified by the bedrock-flip tamper returning to 16
- [ ] AC4: build/test/parity all green on honest sidecars for the current 15–16 variants

## Test plan
- Harness: extend test run parse; parity prints sidecar-missing reasons
- Shot: n/a (tooling). Vision: n/a.

## Risk / feasibility
Low. Note interaction with #010 (slow-time assert id changes name) — update sidecars in same iteration.

## Evidence (fill at close)
- Build/test output:
- Screenshots (qa/…): n/a
- Vision verdict per AC: n/a
- Parity impact: 0 on honest state; tamper now fails closed

## Evidence (close)
- AC PASS: corrected + verified this branch (see docs/audits/2026-09-04.md follow-up). Test: test.mjs GREEN.
