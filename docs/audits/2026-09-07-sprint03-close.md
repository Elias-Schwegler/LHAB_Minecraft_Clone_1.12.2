# Audit #6 — Sprint 03 close (2026-09-07) — adversarial, full
Auditor: separate sub-agent session, per MASTERPROMPT §9 / PLAYBOOK §5. Ground: main @ fb1617a
(#034 SPK-7 GO cluster). Method: re-ran every gate + parity myself, hand-checked proof literals in
the BUILT artifact, sample-verified 6 closed issues incl. viewing their screenshots. No src/game
edits made (audit-only).

## VERDICT: READY-WITH-NOTES
No P0/P1. Sprint 03 may close: tag v0.3.0 after ceremonies. All findings are P3 documentation
drift (details below) — none inflate a metric; several under-report, which is the safe direction.

## 1. Quality gate — re-run this session, verbatim-in-brief
- `node tools/build.mjs` -> `build OK -> game/index.html (302.3 KB, atlas embedded)`
- `node tools/test.mjs` -> `TEST GREEN (spec: all)` — **203 pass / 0 fail**, registry blocks: 25,
  suites boot..save, total in-page sim 3.3s. Edge stderr elevation noise present (known, ignorable).
- `node tools/test.mjs --quick` -> `TEST GREEN (spec: quick)` — **191 pass / 0 fail**.
- Matches AGENTS.md claim "203 full / 191 quick" exactly. 0 errors both runs.

## 2. Parity — independent recount
- `node tools/parity.mjs` -> **20/399 (5.0%), tier 1: 20/125, t2 0/163, t3 0/111**; matches AGENTS.
- Proof binding mechanism read at source (tools/parity.mjs:36-51): functional flag must carry
  `proof.tests` literals `html.includes(t)` **in the BUILT game/index.html** + blender tile in
  atlas.json manifest + qa/blocks PNG. Honest gate.
- Hand-checked 3 sampled counted blocks (registry parsed from BUILT file markers):
  | block | functional:true | proof.tests (verbatim found in built file) | sheet |
  |---|---|---|---|
  | water (#043) | yes | fluids.spread/obsidian/solidify + items.bucket-fill/place/no-flow/self-place (7/7) | water.png 76299B >2KB |
  | furnace (#032) | yes | items.smelt + ui.furn-open/smelt/takeout (4/4) | furnace.png 58867B |
  | leaves.oak (#019) | yes | interact.break-time + world.leaves-decay/persist + interact.leaves-drop (4/4) | leaves-oak.png 54335B |
  All 15 literals found as quoted strings (spike/audit-proof-check.mjs). No phantom proofs.

## 3. Sample-verified closed issues (6 of 12): #035 #038 #040 #042 #043 #046
Per issue: named asserts grepped as literals in BUILT file; named artifacts exist on disk; AGENTS +
PARITY + sprints/03.md reflect the merge; key screenshots VIEWED (verdicts below).
- **#035 mob core (FEAT, DONE)**: 14/14 mob.* asserts in build; night-mobs.png (51KB). VISION PASS
  re-confirmed: 2 blocky humanoids (green head + grey-blue body) mid-frame at night, scene-lit not
  full-bright, no magenta, hotbar/terrain intact. Spec correction (light<=7, not 1.18 light-0) is
  documented. Honest note: 96->114 quick-count fix attributed to audit #5 — verified it8 daily.
- **#038 passives (FEAT, DONE)**: all +14 asserts in build (issue uses shorthand "mob.passive-
  spawn-day/no-spawn-night/..."; real names mob.passive-no-spawn-night/-nongrass/-persist etc.
  all present). mob-farm.png VISION PASS: pink pig + smaller pink baby + brown cow + cream sheep
  w/ dark face on grass, daylight, no magenta. Duplicate-const story consistent w/ PLAYBOOK rule.
- **#040 chest (FEAT, DONE)**: 6/6 ui.chest-* asserts. ui-chest.png VISION PASS: "Chest" panel,
  cobble42/dirt17/coal5/iron3/log8 rendered w/ counts, Main apple4, furnace panel hidden, chest
  block in-world. BE-persistence latent-bug fix (furnace contents) disclosed honestly. NOTE F2 below.
- **#042 TNT (FEAT, DONE)**: 6/6 tnt.* asserts. tnt-fuse.png VISION PASS: red body + dark band +
  grey top unmistakably TNT on stone, distinct from floor, no magenta. functional:false honest
  (procedural tile) — parity tool indeed lists tnt as not counted. NOTE F3 wording.
- **#043 fluids+buckets (FEAT+FIX, DONE)**: 7 bucket + fluids.lava-slow asserts. bucket-demo.png
  VISION PASS: 3 bucket icons in hotbar, wide water spread vs contained lava pool w/ bright cobble
  reaction ring — water5/lava30 contrast visible. P1 verified independently (§4). fluid-pool.png:
  banding gone (uniform surface) — but see observation F7.
- **#046 two-sided faces (FIX, DONE)**: render.face-back + mesh-all/glErr in build; both-sign loop
  literal `for (const sgn of [1, -1])` present. faces-corner.png VISION PASS: platform edge skirt +
  log bark sides visible from -X/-Z corner (would be holes pre-fix). mob-px.png/starter-world.png
  exist (14KB/60KB). Wall-time caveat (~144s quick) disclosed in issue+AGENTS+PLAYBOOK.

## 4. #043 P1 (atlas icon stride) — independent verification
- tools/tex/atlas.json: **50 tiles, 0 (x,y) collisions** (script recount).
- tools/tex/gen.py:360: `tx, ty = (idx % GRID) * S, (idx // GRID) * S` — stride uses `* S`, the
  bug (`* GRID`) is genuinely fixed (GRID=8 @line 11, S=SIZE @line 326).
- Paint relocation: src/render.js paints now at y=96 x>=32 (6 cells) + y=112 x=0/16/32; atlas claims
  y96 only x0 (item_diamond_sword) + x16 (item_shears), and y112 row is entirely unclaimed — all
  paints land in truly-free cells. Old stomped cells (32..112,48) now hold item icons (item_iron_ingot
  @32, item_gold_ingot @48, item_diamond @64, item_apple @80) and are no longer painted.

## 5. #046/#047 claim literals in built file
`--cfatlas` FOUND · `#xh` FOUND · `for (const sgn of [1, -1])` FOUND · `render.face-back` FOUND ·
`items.bucket-fill` FOUND · `ui.crosshair` FOUND · `ui.stand-rock-still` FOUND.

## 6. Scrum compliance
- sprints/03.md: plan table 13 rows all DONE w/ issue refs; dailies it7..it19 complete incl. spec
  corrections (035 light-0 trap, 042 fuse 30t->80t both annotated). Review/Retro section exists (to be
  filled at this close — expected).
- git log --merges -20: every feature merge is --no-ff with `(#NNN)` (033..043,046,047,+034 doc merge).
  Bare-number-less commits are docs/ritual commits only (PLAYBOOK, README, audit#5) — acceptable.
- Tags: v0.0.0, v0.1.0, v0.1.1, v0.2.0 present; v0.3.0 correctly NOT yet created (audit-before-tag policy).
- FEAT rule: 8 FEAT + 1 FEAT+FIX shipped (035-042) >= 1. Backlog #044/#045/#048 honestly DRAFT, not
  claimed done. No DONE-without-evidence found in sample; 035's stale-count was fixed by audit #5 F1.
- #034 SPK-7: verdict GO recorded in docs/spikes/SPK-7.md; shipped delta = `CF.makeWorld` export only
  (present in build) — no sneaked nether code.

## 7. Honesty hunt (docs vs reality)
- AGENTS 203/191/20-of-399/25-registry-blocks — ALL reproduced exactly this session.
- qa/2026-09-06 + 07 shot files exist for every cited evidence path, all >14KB (no 1x1 stubs).
- Parity under-count direction only (chest/tnt/bed procedural -> functional:false; tool confirms).

## Findings table
| ID | Sev | Finding | Reproduction |
|----|-----|---------|--------------|
| F1 | P3 | docs/PARITY.md tier table stale internally: Tier-1 row says 18/125 while its own "all" row and the tool say 20 (18+0+0 != 20); header date says "2026-09-06" though water/lava landed 09-07 | `node tools/parity.mjs` prints "tier 1: 20/125"; compare docs/PARITY.md:17 |
| F2 | P3 | Closed-issue evidence not retro-annotated after the #043 P1: #040 cites paints in "FREE atlas cells (64,48)/(80,48)" and #042 "(32,48)/(48,48)" — atlas.json shows those exact cells are item tiles (item_diamond/item_apple/item_iron_ingot/item_gold_ingot y=48); the claims were false at close time, fixed+disclosed in #043 but the source issues still read as verified-free | atlas.json y48 rows vs issues/040-chest.md:26, issues/042-tnt.md:31 |
| F3 | P3 | issues/042-tnt.md:25 says "new suite tnt +5 asserts" then lists 6 names and its own gate delta 166->172 = +6 | count names in issues/042-tnt.md:25 |
| F4 | P3 | AGENTS.md Tier-1 parity breakdown lists "15 core + torch + furnace + water + lava" = 19 but headline says 20 (glowstone omitted from the breakdown; headline itself is tool-true). Also "25 sheets" vs 29 files in qa/blocks (incl. non-counted chest/tnt/bed/bedrock/crafting_table evidence sheets + family dupes) | AGENTS.md line 10-12 vs parity.mjs counted list; `(Get-ChildItem qa\blocks\*.png).Count` = 29 |
| F5 | P3 | PARITY.md line 57 claims "parity.mjs appends automatically" — it does not (only writes qa/parity-latest.json; tools/parity.mjs:61); doc still says "Last auto-run:" empty after 3 runs this session | run parity, re-read doc tail |
| F6 | P3 | PARITY.md mechanic row "[ ] 1.9-style player physics + combat cooldown <- cooldown needs combat" is stale since #036 shipped charge-meter combat + cooldown w/ asserts — an UNDER-claim (no inflation) but governance-doc drift; hostile-mob row legitimately stays unchecked (spider/enderman) | issues/036 asserts vs docs/PARITY.md:38 |
| F7 | P3 | fluid-pool.png (banding-recheck shot) shows one solid-black rectangular patch on the pool's left side — not banding (surface is otherwise uniform, claim holds), but plausibly a light-hole/quad artifact worth a fidelity look under #048 | view qa/2026-09-07/fluid-pool.png left region |

No P0/P1 -> no new issue files required; F1-F6 fold into the v0.3.0 doc-hygiene pass, F7 rides #048.

## Vision-batch rule compliance
Images analyzed this audit: 7 screenshots in ONE batch (limit ~30 per PLAYBOOK user rule), 0 videos.
Read-paths: night-mobs, mob-farm, ui-chest, tnt-fuse, faces-corner, bucket-demo, fluid-pool.
Console-image caps honored (image-cap plugin unaffected at this batch size).

## Auditor bottom line
Sprint 03's claims reproduce exactly under adversarial re-measurement: gate 203/191 GREEN, parity
20/399 via tool, proof bindings real in the built artifact, the #043 P1 fix is genuine and verified
3 ways, sampled issues are evidence-backed with screenshots that match their written verdicts, and
the process deviations (spec corrections, false-at-close "free cells" claims) were disclosed by the
team itself rather than hidden. READY to close; fix the seven P3 doc-drift notes in the close
ceremonies commit.
