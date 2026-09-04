# Issue: NNN — <title>
- Type: FEAT | FIX | AUDIT/FIX-P0 | SPK | CHORE
- Status: DRAFT | READY | IN_PROGRESS | REVIEW | DONE | VOID
- Epic: docs/backlog/<epic>.md
- Sprint: — | 01
- Depends on: — | #NNN (DONE on main)
- Spike: — | docs/spikes/SPK-N.md (GO)
- Time-box: <= 1 iteration-day (split if larger)

## SMART
- [ ] Specific: single capability, named below
- [ ] Measurable: every criterion has named evidence
- [ ] Achievable: proven subsystems only / GO spike
- [ ] Relevant: advances Tier-N mechanic or block% (cite §7 item)
- [ ] Time-boxed: <= 1 iteration-day

## 1.12.2 Reference spec (behavior as acceptance source — exact, no guessing; [TBC] = not DoR)
<write precise behavior; link docs/REFERENCE.md sections>

## Acceptance criteria (each individually checkable)
- [ ] AC1: <statement> — evidence: harness assert / screenshot / vision check
- [ ] AC2: …

## Test plan
- Harness asserts (window.__test): <ids/what to assert>
- Screenshot scenario (tools/shot.mjs): <scenario name + camera/action>
- Vision check looks for: <texture readability, shape, lighting, HUD legibility; magenta = P0>

## Risk / feasibility
<link to spike or "trivial extension of <proven subsystem>">

## Evidence (fill at close — DoD gate)
- Build/test output:
- Screenshots (qa/…):
- Vision verdict per AC:
- Parity impact (blocks/mechanic):
