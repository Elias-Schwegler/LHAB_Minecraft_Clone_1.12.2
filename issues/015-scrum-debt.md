# Issue: 015 — Scrum debt: Sprint-01 review/retro + METRICS + doc hygiene
- Type: AUDIT | Severity: P2 (audit 2026-09-04, F6) | Status: READY
- Epic: n/a (process) | Sprint: — | Depends on: — | Spike: — | Time-box: <= 1 iteration-day

## SMART
- [ ] Specific: close the process gaps the audit found, no code
- [ ] Measurable: each item has a diff
- [ ] Achievable / Relevant: §6/§8 adherence is audited / Time-boxed 0.5d

## Findings to remediate
1. docs/sprints/01.md Sprint Review + Retro still "(fill)" placeholders — hold them now:
   review = demo existing qa/baseline shots vs acceptance + parity recompute (16/399,
   or corrected per #012/#013); retro = >=1 improvement COMMITTED (suggested: "quality
   gate output must be pasted into the issue Evidence verbatim" — adopted as DoD line).
2. docs/METRICS.md has no sprint-01 row — add velocity + escaped defects (this audit's
   P1s = escaped defects).
3. AGENTS.md says "Tag v0.1.0 at sprint close pending" but v0.1.0 exists (b58d4ae) —
   fix line; AGENTS.md is the memory (§2.3).
4. spike/bootstrap-01 branch still exists (§8: experimental branches die).
5. #006/#008/#009 landed in one merge b58d4ae (per-issue merge rule). Record lesson +
   commit to per-issue merges going forward; do NOT rewrite history.
6. issue #008 "Epic: E5 (QA)" but epics.md E5 = Lighting & time; add a QA/verification
   epic (E11) in epics.md and fix #008's header (append correction, don't rewrite evidence).
7. docs/PARITY.md line "day/night ... (#013 lighting)" forward-references an issue that
   never existed; #013 is now the audit's count-behavior issue. Renumber the lighting
   forward-reference to "#019 (reserved)" in PARITY.md.

## Acceptance criteria
- [ ] AC1: sprints/01.md review+retro filled w/ real content + committed improvement
- [ ] AC2: METRICS.md sprint-01 row present
- [ ] AC3: AGENTS.md tag line corrected
- [ ] AC4: spike branch deleted (`git branch -D spike/bootstrap-01`)
- [ ] AC5: epics.md gains QA epic; #008 corrected by appended note
All in one docs/process commit "chore(process): sprint-01 review/retro + audit P2 hygiene (#015)".

## Test plan
- No gate needed (docs-only) — run parity once to confirm untouched counts.
Evidence: file diffs + parity unchanged output.
