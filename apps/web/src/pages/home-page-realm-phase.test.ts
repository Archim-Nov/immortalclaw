import assert from "node:assert/strict";
import test from "node:test";
import { formatRealmLabel } from "./runtime-control-page";

test("formatRealmLabel prefers the current realm phase over the raw total level", () => {
  assert.equal(
    formatRealmLabel({
      realm: "Qi Refining",
      realmLevel: 4,
      realmPhase: "前期",
    }),
    "Qi Refining 前期",
  );
});

test("formatRealmLabel falls back to realm level when no phase is available", () => {
  assert.equal(
    formatRealmLabel({
      realm: "Qi Refining",
      realmLevel: 4,
    }),
    "Qi Refining Lv.4",
  );
});