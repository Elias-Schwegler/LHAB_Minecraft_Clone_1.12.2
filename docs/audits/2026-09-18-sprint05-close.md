# Audit #8 — Sprint 05 close (2026-09-18) — adversarial, full
Auditor: separate sub-agent session, per MASTERPROMPT §9 / PLAYBOOK §5. Ground: main @ 4e38bf4
("AGENTS: sprint-05 code-complete header", 22 commits since v0.4.0). Method: re-ran all five gates,
independent parity recount parsed from the BUILT artifact's own registry JSON + embedded
`window.__TEXMETA` (133 tiles), collision-check vs runtime paint cells, per-merge ASSERT-NAME DIFFS
against the committed builds of every sprint-05 merge (spike/audit8-names.mjs via `git show`),
sample-verified 8 closed issues (#061 #063 #064 #065 #066 #068 #044 #048) with proof literals grepped
in game/index.html (not src), 8 video/block frames viewed, 8 engine spot-checks in the built bundle,
GitHub mirror + doc cross-checks. Audit-only: no src/game/tools/qa edits, no commits.
Helpers: spike/audit8-recount.mjs, audit8-names.mjs, audit8-flags.mjs (+ extracted
spike/audit8-0{4,5,6}.html / 067 / 068 / 070 / 044 snapshots for the name-diffs).

## VERDICT: READY-WITH-NOTES
No P0. One P1 (F1): issue #044's claimed `mob.rare` assert DOES NOT EXIST in the built artifact —
the rare-drop check is computed into a dead variable and never asserted; FIX issue #107 filed.
Everything else holds: all headline numbers (263/247 asserts, 55 blocks, 59/399 = 14.8%) reproduce
EXACTLY, the redstone chain is genuinely wired end-to-end in the shipped bundle, atlas integrity is
clean, and 7 of 8 sampled closures are fully evidence-backed. The ONE inflated claim in the whole
sprint is #044's "+5 asserts (mob.rare ...)"; PARITY.md's tier split is wrong (in the UNDER-claim
direction for t1), and the working tree at audit time was dirty with #048 leftovers (F3/F4).
Tag v0.5.0 after: F1 fix (or #107-annotated note in the close commit), tree cleanup, PARITY.md fix.

## 1. Quality gates — re-run this session, verbatim
- `node tools/build.mjs` -> `build OK -> game/index.html (529.3 KB, atlas embedded)`
- `node tools/test.mjs` (FIRST attempt, no retry) -> `TEST GREEN (spec: all)` —
  **263 pass / 0 fail**, registry blocks: 55, "total in-page sim time: 3.1s", 0 console errors.
  (Audit #7's F1 flake is gone — the one-shot reliability fix holds; only the known Edge
  elevation/fallback-task stderr noise appeared, ignorable per PLAYBOOK §2.)
- `node tools/test.mjs --quick` -> `TEST GREEN (spec: quick)` — **247 pass / 0 fail**, blocks 55, sim 2.5s.
- `node tools/test.mjs --suites=redstone` -> `TEST GREEN (spec: redstone)` — **19 pass / 0 fail**
  standalone. The "#061 decoupling promise" holds; the "17 standalone" figure quoted in the audit
  brief matches NO file in the repo (grep 'standalone' = 0 hits) — the suite GREW to 19 with
  #067/#068, i.e. an under-claim, not inflation.
- `node tools/parity.mjs` -> **59/399 (14.8%), tier 1: 44/125, t2 15/163, t3 0/111** (wrote
  qa/parity-latest.json with identical numbers). NOTE: the brief's "t2 16/163" claim and
  docs/PARITY.md's table (t1 43 / t2 16) are WRONG — see F4; the tool itself says 44/15.
- Total-match with AGENTS.md/sprint-05 claims: 263/247/55/59/14.8% all confirmed. The 242->263
  assert trajectory is internally consistent (per-merge name-diffs, §3).

## 2. Parity — independent recount (BUILT artifact only) + honesty + atlas integrity
- spike/audit8-recount.mjs parsed the registry between /*REGISTRY-START|END*/ AND the embedded
  `window.__TEXMETA` from game/index.html itself (NOT tools/tex/atlas.json, so manifest/artifact
  drift would surface): **59/399, t1 44, t2 15, t3 0 — identical to the tool**.
  functional-without-proof: none. blender-tile missing: none. qa-sheet missing: none.
- Honesty flags verified in the BUILT registry (spike/audit8-flags.mjs):
  redstone_wire/redstone_torch/repeater/redstone_lamp+lit/stone+wooden_pressure_plate/
  stone+wooden_button/piston ALL `functional=false` with proof literals present in the bundle
  (world.redstone-flood, repeater-boost/-delay, lamp-on-off, plate-press, button-press,
  piston-push, +craft asserts — all grepped FOUND). redstone_ore/netherrack/quartz_ore
  `functional=true` with blender tiles + counted sheets. Parity is honestly held at 59.
- Counted-variant sum check: 58 (v0.4.0, audit #7 recount) + 1 (redstone_ore #064) = 59 ✓ —
  #065-#068/#044/#048 added ZERO parity (all their blocks stay functional:false), as claimed.
- Atlas integrity: 133 `__TEXMETA` tiles, **0 (x,y) collisions**; runtime paint cells from
  src/redstone.js (11 on y=176 + (160,160) wire + (0,160) head-face), src/bed.js (80,96@160),
  src/items.js (48,64@160 + bucket trio 112-144@160), src/tnt.js (16,32@160) — manifest max row
  is y=144, **zero stomps** either direction; none of the 22 painted names pre-exists in the
  manifest (guard `if (!meta.x)` can't silently no-op). The #048 GRID 12->14 claim checks out:
  `window.__ATLAS_SIZE = 224` in the bundle == actual atlas.png 224x224 (IHDR bytes) == 14*16.

## 3. Per-merge assert bookkeeping (build-to-build name diffs — the honest way)
Distinct assert-name prefixes per committed build: 064=248, 065=253, 066=255, 068=258, 067=260,
070=260 (unchanged, as claimed), 044=262, 048=HEAD. Deltas vs claims: #064 "+7" ✓, #065 "+4" is
actually **+5** (world.repeater-boost, world.repeater-delay, interact.repeater-facing,
interact.redstone-invert, items.repeater-craft — UNDER-claim, safe), #066 "+2" ✓, #068 "+3" ✓,
#067 "+2" ✓, #044 claims "+5" but added **3 names, removed 1** (ADDED mob.face/surv.poison/save.mobs;
REMOVED mob.env-kill-no-loot) → net +2, which is what the runtime totals show (261→263 / 245→247).
The gap between "+5" and reality is the phantom `mob.rare` assert → F1.

## 4. Sample-verified closed issues (8)
Every named literal grepped in the BUILT game/index.html; images viewed this session (8, one batch).
| issue | claim | evidence found? | image verdict |
|---|---|---|---|
| #061 suite decoupling | prelude self-setup; "11 singles + combos GREEN" | harness prelude present; I ran `--suites=redstone` STANDALONE -> 19/0 GREEN (promise verified live) | n/a (process fix) |
| #063 leaves skylight | cellOpaque leaves=false choke + light.leaves-pass-sky + video caught it | literal FOUND; basic/f00 (2026-09-18 re-record) | PASS: green lit ground under every canopy, no black wedges — the pre-fix symptom is gone in the close-video |
| #064 dust+torch | +7 asserts, ore parity +1, live power d1=14/d5=10 | all 7 literals FOUND; recount: redstone_ore t1 counted, wire/torch honest false; redstone/f01,f03 on disk | (frames from 09-17, lamp run f01 viewed instead): dust line + red torch on platform visible, PASS |
| #065 repeater+inverter | +4 (actually +5) asserts, DIODE, 2gt due, yaw-XOR-1 | all 5 literals FOUND; code spot-checks §5(5); "12 in suite now" arithmetic off-by-one vs my count — trivial | lamp/f01 shows the repeater block mid-line (grey slab between dust), PASS |
| #066 lamp (exit criterion) | lamp-on-off assert, lit=light 15, video finale | world.lamp-on-off (side/above/light15/repeater/sideOff/torchGone probe in the name) + items.lamp-craft FOUND; registry 123/124 pair, both false | lamp/f01: amber-lit block at end of boosted line on lit platform — matches "glowing lamp" claim, PASS |
| #068 plate+button | plate-press/button-press/craft asserts, ON/OFF video frames | all 3 literals FOUND; rsTick overlap scan + bt until-map present | plate/f02 (step-ON): big warm amber lit lamp + dust right of it on the platform — matches "lamp=LIT" leg, PASS (f04 lag honestly filed as #071, still OPEN/READY locally = correct) |
| #044 mob polish | mob.face/mob.rare/surv.poison/save.mobs/+5, f08 zombie faces player, poison, save-mobs | mob.face, surv.poison, save.mobs FOUND; **mob.rare MISSING — rareOk computed then discarded (built index.html:7970-7974), dead variable, never asserted** → F1; persistence code real (§5(3)(4)) | basic/f08: night scene, zombie head+body squarely facing camera (yaw orbit works, though the frame is dark and feature-level). Claimed facing PASS; claimed rare assert FAIL |
| #048 fidelity | 17 item icons + quartz orphan, glowstone speckle, lamp bloom, fluidFreeze clean sheets, GRID14 | __TEXMETA: item_bone/arrow/gunpowder/string/feather/leather/ink_sac/egg/clay_ball/brick/rotten_flesh + the 8 meat tiles (raw_porkchop..cooked_chicken, item_steak) all present src=`blender:gen.py:icons`; item_quartz present; fluidFreeze gates ONLY fluidTick (2981); ASZ 224 == atlas 224x224 | glowstone.png: warm gold pedestal, speckle faint at distance but reads textured — PASS-ish (taste -> #072 honest); water.png: CLEAN single cube on dry pedestal — EXACTLY the claimed fix, PASS; redstone_ore.png: grey stone with red banding, PASS. BUT: issue left Status DONE with ALL 3 ACs still `[ ]` and no `## Evidence (close)` section, and the re-shot lava sheet sits UNCOMMITTED in the working tree (see F2/F3) |
#062/#067/#070 (not in the sample-8 but cross-checked): video rig + 9-phase driver in build
(`video-play` FOUND, tools/video.mjs exists, qa/videos gitignored); piston-push/piston-craft
literals + push code + honest `[~]` anim carve-out ✓; SPK-9 doc carries its 44ms/0.05ms/2.8ms
measurements + GO verdicts, src untouched (per commit stat) ✓.

## 5. Engine spot-checks (built bundle — 8/8 PASS)
1. world.set rs-hook = unified `isRsDef` incl. piston: index.html:2635-2636 ✓
2. rsRescan flag list matches set-hook (wire|rstorch|repeater|lamp|plate|button|piston): :5618 ✓ —
   the #067 "latent load-hole" fix is real on both sides
3. loadNow mob respawn: :6939 clear + :6956-6958 respawn {t,p,hp,baby} from dims entry ✓
4. saveNow includes active-dim mobs (cap 64, non-dead): :6866 ✓
5. Repeater DIODE: 'r' cells spread restricted to output dir only `outs = [[odx,0,odz]]`: :5508-5510 ✓
6. blockPowered: torch powers OPPOSITE attach :5466-5468, pressed plate powers ABOVE :5470,
   live button powers own attach :5471-5473 (with the code comments as the doc says) ✓
7. CF.fluidFreeze skips ONLY fluidTick — gen/light untouched: :2981 ✓
8. Boot atlas.decoded compares img.width to `(window.__ATLAS_SIZE || 128)` dynamically: :8837 ✓
   (the #048 GRID bump cannot make this assert stale)

## 6. Findings
| ID | Sev | Finding | Evidence |
|----|-----|---------|----------|
| F1 | P1 | **Fake test claim in #044**: no `mob.rare` assert exists anywhere in the build; the forced-roll rare-drop check computes `rareOk` (built index.html:7973) and discards it — 2.5%x4 zombie table ships with ZERO test coverage despite an [x] AC ("mob.rare asserts via forced-roll", issues/044-mob-polish-bundle.md:16,29). "+5 asserts" over-counts by exactly this phantom (real: +3 names, −1 removed). Gate totals (263/247) are unaffected and honest; per PLAYBOOK "never [x] an AC without named evidence" + audit #4 furnace-checkbox precedent → FIX issue. | spike/audit8-names.mjs 070→044 diff; grep mob.rare = 0 hits; :7970-7974 dead variable → **issues/107-mob-rare-assert-missing.md filed** |
| F2 | P2 | #048 closed "Status: DONE" with **no `## Evidence (close)` section** (PLAYBOOK §1 step 8) and all three ACs still `[ ]` (issues/048-texture-fidelity.md:26-28) — gate numbers/vision verdicts live only in AGENTS/sprint docs; AC3 ("water/LAVA clean pedestal sheets") is only half true at HEAD: water.png committed (111742→61966B in da38257), but the re-shot lava.png exists ONLY as an uncommitted working-tree change (disk 61074B vs HEAD blob 85041B, mtime 2026-09-18 03:38) — the committed lava sheet predates fluidFreeze | git status; git cat-file -s; issue file |
| F3 | P2 | Working tree NOT clean at audit ground 4e38bf4: tracked `issues/048-texture-fidelity-pass.md` DELETED unstaged + `qa/blocks/lava.png` modified unstaged + 117 untracked spike scratch. Tagging v0.5.0 from this state would silently drop or ship the wrong bytes; the close-ceremony commit MUST resolve (commit-revert-delete the stub, commit-or-discard lava) BEFORE tagging | `git status --porcelain` this session |
| F4 | P3 | docs/PARITY.md table (dated "2026-09-17 #064") says t1 43 / t2 16; parity.mjs AND my recount AND its own qa/parity-latest.json all say **t1 44 / t2 15** — redstone_ore is catalog TIER 1 (docs/catalog.json:516) but the #064 table edit incremented t2. Total 59/14.8% correct; drift is UNDER-claim for the Tier-1 gate number (43<44) — safe direction but wrong | docs/PARITY.md:17-18 vs tools/parity.mjs output |
| F5 | P3 | GitHub mirror polluted for #048: THREE issues map to it — #92 "048 — Texture fidelity pass…" (CLOSED ✓ correct) + **#120 "048-texture-fidelity.md"** (CLOSED) + **#108 "048-texture-fidelity-pass.md" (still OPEN)** — filename-fallback titles caused by (a) an orphan note-stub file `issues/048-texture-fidelity-pass.md` created at sprint-04 close (90d1d64, NO `# Issue:` H1 — mirror fell back to the filename; #066 even appended its lamp-art note to the stub in 42639e6) and (b) mojibake H1 in the real file (line 1: `048 â€” Texture fidelity…` em-dash corruption; commit 3ca0db3 admits "the earlier header edit no-op'd on an em-dash"). Sprint-04/05 state elsewhere verified consistent: 064→#112…070→#118 CLOSED, 061→#109 CLOSED, 069→#117 / 071→#119 / 072→#121 OPEN = matches local READY | gh issue view 92/108/117/119/120/121; git log --follow both 048 files |
| F6 | P3 | AGENTS.md GIT DEBT bookkeeping: the #066 line is DUPLICATED verbatim twice, and the #067 entry cites 42639e6 — which is #066's hash (#067's direct-on-main commit is 6a3ede6). Disclosed honestly (good), but the close commit should de-dup + fix the hash | AGENTS.md bottom section vs git log |
| F7 | P3 | Stale/loose numbers in docs prose: #065's "+4 asserts (12 in suite now)" vs measured +5 names / redstone suite 19 standalone today; the audit-brief's "17 standalone" appears in no repo file. All under-claims (safe), but the sprint review's "Asserts 242->263" chain only closes if phantom-free per-issue arithmetic is used (F1 is the over-count that breaks it) | §3 name-diffs; grep 'standalone' = 0 |

## 7. Process / scrum compliance
- git log v0.4.0..4e38bf4: 22 commits; #062/064/065/068/061 merge via --no-ff with (#NNN);
  #066/#067 (and #048/#044 feature+merge pairs) include disclosed direct-on-main commits —
  GIT DEBT entries exist (see F6 for their typos). Sprint-05 header claim "code-complete it1-10"
  matches the tracker's 9 daily lines.
- docs/sprints/05.md: review + retrospective + METRICS row 05 (+21 asserts 242→263 / 226→247,
  blocks 44→55, parity 58→59) — ALL reproduce against my measurements. Exit criterion ("lamp
  circuit, video-proven incl. repeater boost") verified in code paths §5 + frames §4.
- AGENTS.md: entries for #061 #062 #063 #064 #065 #066 #067 #068 #070 #044 #048 all present;
  "#048 … status header DONE" follow-up commit 3ca0db3 VERIFIED landed (single-line header edit;
  disk shows `Status: DONE` — but see F2: ACs themselves remain unchecked).
- Carried issues honest: #069 READY locally + OPEN (#117); #071/#072 READY + OPEN — nothing
  carried is claimed shipped. #062's video-law artifacts (tools/video.mjs, driver, gitignore,
  16-frame basic re-record at seed=5 with index.json budgets) all present.
- qa/videos frames present-but-temporary (2026-09-17 redstone/lamp/basic + 2026-09-18
  basic/circuit/piston/plate, index.json + pngs) — gitignored; durable verdicts are in the
  issue text per law. Compliant, not a finding (their disappearance after pruning will also be).

## Vision-batch rule compliance
Images analyzed: 8 in ONE batch (qa/videos/2026-09-18/basic f00,f08; 2026-09-17/lamp f01;
2026-09-18/plate f02; qa/blocks glowstone,water,redstone_ore; 2026-09-18/piston f01) + 4 in the
tool-result attachment pass (same 4 video frames, no new images). 0 videos watched (per constraint).
Under the ~30 cap. Note: piston/f01 confirms #067's OWN disclosure ("piston row slightly out of
the camera's frame - probe is the evidence") — dark foreground block, framing incomplete, honest.

## Auditor bottom line
Sprint 05's HEADLINE claims all survive adversarial re-measurement — gates one-shot green, parity
honest at 59 with every new mechanic-block deliberately left functional:false, the redstone engine
genuinely present in the shipped bundle (diode, inverter, plate/button/power rules, load-rescan),
atlas collision-free at the new GRID14, and the new video-QA law visibly working (the close re-record
shows the #063 fix). What the team must NOT walk past: F1 — a closed issue whose named test does not
exist (fixed via #107), and F3 — do not tag from a dirty tree whose dirt happens to be sprint-05's
own evidence files. F2/F4-F7 are close-ceremony doc edits. Nothing found inflates the release numbers;
the single inflation found is a per-issue assert claim, and it is now filed.

fixes: F1 → issues/107-mob-rare-assert-missing.md (P1). F2/F3 + F4-F6 belong in the v0.5.0 close
commit (commit-or-discard lava.png, resolve the 048 stub deletion, add the Evidence section, fix
PARITY.md 44/15, prune GH #108/#120, de-dup AGENTS GIT DEBT lines, fix the mojibake H1).
