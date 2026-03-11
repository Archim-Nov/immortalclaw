# Five-Element Growth Cap Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the hard growth cap from five-element attributes while preserving current initialization and derived-value rules.

**Architecture:** This is a documentation-only change. Update the five-element spec so it distinguishes between initial reference values and long-term growth, then verify the wording does not accidentally change initialization, formulas, or other frozen boundaries.

**Tech Stack:** Markdown documentation in `docs/specs` and `docs/plans`

---

### Task 1: Update the five-element spec wording

**Files:**
- Modify: `docs/specs/oc-cultivation-foundation/five-element-and-spells.md`

**Step 1: Update the range section**

- Replace the hard cap wording around `1-100`.
- State clearly that five-element attributes currently have initial reference values but no hard growth cap.

**Step 2: Preserve initialization rules**

- Keep `新角色五行总量：250`
- Keep `默认平均线：50`
- Keep the existing registration-based initialization formula unchanged.

**Step 3: Reword the interpretation bands**

- Keep the existing low-to-high descriptions as early-stage or initial-state references.
- Avoid implying that `70+` is the terminal top end.

**Step 4: Verify consistency**

Run a targeted text review to ensure the updated section:
- no longer implies a hard cap
- does not alter derived formulas
- does not alter frozen boundaries outside the intended scope

**Step 5: Commit**

```bash
git add docs/specs/oc-cultivation-foundation/five-element-and-spells.md docs/plans/2026-03-10-five-element-growth-cap-design.md docs/plans/2026-03-10-five-element-growth-cap.md
git commit -m "docs: remove five-element growth cap"
```