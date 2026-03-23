import assert from "node:assert/strict";
import test from "node:test";
import {
  isAllowedCorsOrigin,
  LOCAL_VITE_DEV_ORIGIN,
  LOCAL_VITE_PREVIEW_ORIGIN,
  readFrontendOrigin,
  readTickSteps,
  resolveCorsOrigins,
} from "./env.js";

const pagesOrigin = "https://immortal-claw.pages.dev";

test("readFrontendOrigin normalizes the configured origin", () => {
  assert.equal(readFrontendOrigin({ FRONTEND_ORIGIN: `${pagesOrigin}/` }), pagesOrigin);
});

test("resolveCorsOrigins includes local preview origins", () => {
  const origins = resolveCorsOrigins({ FRONTEND_ORIGIN: pagesOrigin });
  assert.deepEqual(new Set(origins), new Set([pagesOrigin, LOCAL_VITE_DEV_ORIGIN, LOCAL_VITE_PREVIEW_ORIGIN]));
});

test("isAllowedCorsOrigin accepts pages preview deployment origins", () => {
  assert.equal(isAllowedCorsOrigin("https://main.immortal-claw.pages.dev", { FRONTEND_ORIGIN: pagesOrigin }), true);
});

test("readTickSteps clamps invalid values to a safe minimum", () => {
  assert.equal(readTickSteps({ WORLD_TICK_STEPS: "0" }), 1);
});
