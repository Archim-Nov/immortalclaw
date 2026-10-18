# Spectator copy packaging

## Linked Spec

- `docs/specs/spectator-static-homepage/spec.md`

## Goal

Bring the static 观览 copy back in line with the owner’s display rules without changing the 卷册 or the layout.

## Tasks

- Replace the masthead and the 卷册 intros that tell a visitor they may only watch. Put a plain project introduction on 大千世界.
- Show 炼气 as 初期, 中期, or 后期. Keep a small display helper so a stored 层 still reads that way. Leave 圆满 on 筑基 and 金丹.
- Label the eight combat figures 物攻 and 法攻, and label attunement 仙缘. Leave the demo field names alone.
- In the Vite spectator formatter, do not fall back to a numbered 层. Keep 前期, 中期, and 后期 for that surface, since that is what the live API already returns.

## Verification

- `node --import tsx --test apps/web/src/lib/spectator-copy.test.ts`
- `node --import tsx --test --test-name-pattern "spectator homepage" apps/web/deploy-config.test.ts`
