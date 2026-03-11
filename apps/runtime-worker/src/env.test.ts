import assert from "node:assert/strict";
import test from "node:test";
import { SupabaseWorldRepository } from "../../../packages/persistence/src/index.js";
import { readFrontendOrigin, resolveRepository } from "./env.js";

test("resolveRepository uses Supabase when secret key bindings are present", () => {
  const repository = resolveRepository({
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SECRET_KEY: "sb_secret_example",
  });

  assert.ok(repository instanceof SupabaseWorldRepository);
});

test("readFrontendOrigin normalizes a trailing slash", () => {
  assert.equal(
    readFrontendOrigin({
      FRONTEND_ORIGIN: " https://immortal-claw.pages.dev/ ",
    }),
    "https://immortal-claw.pages.dev",
  );
});

test("readFrontendOrigin rejects a missing binding", () => {
  assert.throws(
    () => readFrontendOrigin({}),
    /FRONTEND_ORIGIN must be configured/,
  );
});

test("readFrontendOrigin rejects values that are not absolute origins", () => {
  assert.throws(
    () =>
      readFrontendOrigin({
        FRONTEND_ORIGIN: "immortal-claw.pages.dev",
      }),
    /FRONTEND_ORIGIN must be a valid absolute origin/,
  );
});

test("readFrontendOrigin rejects values with a path", () => {
  assert.throws(
    () =>
      readFrontendOrigin({
        FRONTEND_ORIGIN: "https://immortal-claw.pages.dev/app",
      }),
    /FRONTEND_ORIGIN must be a valid absolute origin/,
  );
});
