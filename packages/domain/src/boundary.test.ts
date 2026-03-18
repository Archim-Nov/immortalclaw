import assert from "node:assert/strict";
import test from "node:test";
import * as domainIndex from "./index.js";
import * as domainRuntime from "./runtime.js";

test("runtime surface stays focused on world-rule helpers instead of questionnaire and stat-page helpers", () => {
  assert.equal("performAction" in domainRuntime, true);
  assert.equal("advanceWorld" in domainRuntime, true);
  assert.equal("deriveRegistrationRecordFromAnswers" in domainRuntime, false);
  assert.equal("getRegistrationQuestionnaire" in domainRuntime, false);
  assert.equal("buildRegistrationProfile" in domainRuntime, false);
  assert.equal("extractFiveElementScores" in domainRuntime, false);
});

test("domain index no longer re-exports constants topology or quest internals", () => {
  assert.equal("createSqliteWorldStore" in domainIndex, true);
  assert.equal("DEFAULT_ACTION_DURATIONS" in domainIndex, false);
  assert.equal("buildFullTopology" in domainIndex, false);
  assert.equal("acceptQuest" in domainIndex, false);
});
