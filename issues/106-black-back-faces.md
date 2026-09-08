# Issue: 106 — 3 of 6 faces of every block render pitch black (user report, F7)
- Type: FIX | Status: DONE | Epic: user report | Sprint: 04 | Depends: #046 (two-sided faces)

User (playing build @ #052): placed blocks show 3 black faces. #046 added -axis faces; they rendered
black in nearly every scene (starter-world skirt, tree canopy = "black trees", platform undersides).
Worse: THIS sprint's own vision reviews RATIONALIZED the black as "intentionally darker side shading"
(the #046 faces-corner verdict) - process failure logged in PLAYBOOK.

## Root cause
`src/render.js` pushQuad: for -faces the plane sits on the cell's MIN boundary, so the mid-point light
sample uses plane-0.001 (float). `src/world.js` lightCell() computed (y*CZ + z%16)*16 + x%16 WITHOUT
flooring -> float array index -> `light[...] === undefined` -> packed NaN -> shader floor(NaN*255+0.5)=
NaN -> mix/step -> eff 0 -> black. +faces sampled integer coords and stayed lit: hence "exactly 3 of 6".
(The earlier -0.001 offset fix was correct in intent; lightCell was the victim.)

## Fix + verification
- lightCell: Math.floor(x/y/z) first. Instrumented pushQuad dump proved all -face samples 240 (open sky)
  after fix; before: undefined/null at every -face.
- faces-corner scenario ALSO had a latent stale-light bug (carved, never drained the relight queue:
  renderTick meshes but only W.tick() runs the light queue) -> ensureLight + queue-drain added.
- Regression arbiter: render.face-lit assert (pixel samples of a -X face under full sky).

## Evidence (close 2026-09-08)
- Gate 218 full / 202 quick GREEN. qa/2026-09-08/{faces-corner,starter-world,slab-scene,place-black}.png
  vision PASS: leaves green, bark lit, slopes lit; remaining black = platform UNDERSIDES & under-canopy
  cells = physically correct (leaves/slabs cover sky; matches 1.12 non-smooth lighting).
- place-black scenario keeps the "one stone on natural terrain" repro for future regressions.
