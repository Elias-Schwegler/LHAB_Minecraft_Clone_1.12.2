# Issue: 059 — recipe book UI
- Type: FEAT | Status: DONE | Epic: Sprint04 plan | Sprint: 04 | Depends: per body

1.12-ish lite: button in inventory opens RECIPE BOOK panel listing craftable recipes (inputs present in inv), click = auto-fill 2x2/3x3 grid (+ craft button), greyed if missing materials. Full vanilla paging/tabs NOT needed (document). Tier-1 'recipe book' tail.
ACs:
- [x] ui.recipes-list assert (filter by inventory contents, live)
- [x] ui.recipes-fill -> craft collects result assert
- [x] book shot vision PASS (legible grid, 1.12-ish layout)


## Acceptance criteria


## Evidence (close 2026-09-10)
- 3x3 WORKBENCH GUI (pre-existing gap found by this ticket: UI had only 2x2 - tools were uncraftable IN-GAME; items.iron-pickaxe test called
  CF.tryCraft directly and never caught it). Right-click crafting_table -> CF.uiOpenWorkbench() (1.12 GUI); CF.ui.craft is now
  9 slots (2x2 mode uses 0,1,3,4, off-lattice indices hidden + click-guarded); close returns all 9 + leaves wb mode; updateResult
  compacts per mode; result-consume loop widened to 9. Old test resetting craft to len-4 array found (was truncating the grid).
- RECIPE BOOK: right panel in inventory: every recipe the CURRENT inventory can pay for AND that fits the current lattice
  (2x2 correctly hides 3-wide/3-tall recipes - matches MC), icons from itemDef tiles, click -> CF.bookFill: returns grid to inv,
  pulls ingredients, places pattern slots, updates result. MC discovered-recipe persistence deferred (craftable-filter is v1-usable).
- TDZ boot-killer found+fixed: renderBook referenced let-bookEl declared AFTER build() call site -> refresh-at-boot threw before
  harness dispatch (whole page dead, no TESTRESULT). Module lets must precede build().
- +1 assert (ui.book: open+pick-found+fill+grid-shape+result+collect(1)+materials-consumed+2x2-list-filtered). 235/219 GREEN.
- ui-book.png + ui-inventory.png vision PASS (pause-overlay now suppressed whenever CF.shotName set - runShot also hides it).
