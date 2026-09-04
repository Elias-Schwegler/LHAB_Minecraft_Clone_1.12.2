# Definition of Ready (DoR)
An issue enters a sprint only if ALL true:
1. Research done; exact 1.12.2 behavior written in the issue (no [TBC] left in its spec;
   if [TBC] remains, the issue cannot be READY — research is part of the issue, not the sprint).
2. Feasibility: a DONE-with-GO spike link, or trivial extension of a proven subsystem (cite it).
3. Acceptance criteria individually checkable; each names its evidence (assert / screenshot / vision check).
4. All dependencies DONE on `main`.
5. Size <= one iteration-day (else split into sub-issues, numbers linked).
6. Issue file exists at `issues/NNN-slug.md` from `issues/_TEMPLATE.md`, SMART box checked.
