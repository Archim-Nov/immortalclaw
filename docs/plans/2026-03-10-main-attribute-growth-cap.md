# Main-Attribute Growth Cap Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the hard growth cap from main attributes while preserving the current new-character totals, initial reference values, and existing formulas.

**Architecture:** This is a documentation-only change. Update the main-attribute sections in the role system spec and the foundation summary spec so they describe uncapped long-term growth while keeping the current starting-point guidance intact.

**Tech Stack:** Markdown documentation in `docs/specs` and `docs/plans`

---

### Task 1: Update main-attribute wording in the role system docs

**Files:**
- Modify: `docs/specs/oc-cultivation-foundation/character-system.md`
- Modify: `docs/specs/oc-cultivation-foundation/spec.md`

**Step 1: Update the main-attribute range section**

- Replace `1-100` hard-cap wording with uncapped growth wording.
- Keep `400`, `30-70`, and `50` as new-character starting references.

**Step 2: Reword the interpretation label**

- Change the strength-band label so it reads as an initial reference, not a permanent ceiling model.

**Step 3: Update stale future-boundary wording**

- Replace references to `主属性上限` with growth-oriented wording such as `成长节奏与收益`.

**Step 4: Verify consistency**

Run a targeted text review to ensure the docs now:
- describe main attributes as uncapped long-term values
- preserve starting guidance for new characters
- no longer imply that later design work is about restoring hard caps

**Step 5: Commit**

```bash
git add docs/specs/oc-cultivation-foundation/character-system.md docs/specs/oc-cultivation-foundation/spec.md docs/plans/2026-03-10-main-attribute-growth-cap-design.md docs/plans/2026-03-10-main-attribute-growth-cap.md
git commit -m "docs: remove main attribute growth cap"
```