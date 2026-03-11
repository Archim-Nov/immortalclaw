import assert from "node:assert/strict";
import test from "node:test";
import { SupabaseWorldRepository } from "../../../packages/persistence/src/index.js";
import { resolveRepository } from "./env.js";

test("resolveRepository uses Supabase when secret key bindings are present", () => {
  const repository = resolveRepository({
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SECRET_KEY: "sb_secret_example",
  });

  assert.ok(repository instanceof SupabaseWorldRepository);
});
