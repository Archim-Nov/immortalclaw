import test from "node:test";
import assert from "node:assert/strict";
import * as application from "./index.js";

test("application package exports an object", () => {
  assert.equal(typeof application, "object");
});
