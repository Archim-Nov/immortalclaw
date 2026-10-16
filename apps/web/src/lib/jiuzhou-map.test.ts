import assert from "node:assert/strict";
import test from "node:test";
import { JIUZHOU_REGIONS, anchorForLocation, layoutAgentPins } from "./jiuzhou-map";

test("eastern towns sit east of that state's main city", () => {
  const city = anchorForLocation("qingzhou:main-city", "qingzhou");
  const east = anchorForLocation("qingzhou:sub-town-east", "qingzhou");

  assert.ok(city);
  assert.ok(east);
  assert.equal(city.regionId, "qingzhou");
  assert.ok(east.x > city.x);
  assert.ok(Math.abs(east.y - city.y) < 16);
});

test("a sect outpost stays on its state and off the capital dot", () => {
  const city = anchorForLocation("qingzhou:main-city", "qingzhou");
  const outpost = anchorForLocation("qingzhou:sect-outpost:cang-mu-gu", "qingzhou");

  assert.ok(city);
  assert.ok(outpost);
  assert.equal(outpost.regionId, "qingzhou");
  assert.ok(Math.hypot(outpost.x - city.x, outpost.y - city.y) > 1);
});

test("two agents in one place fan out, and the layout does not drift", () => {
  const agents = [
    { agentId: "b", locationId: "yangzhou:main-city", stateId: "yangzhou" },
    { agentId: "a", locationId: "yangzhou:main-city", stateId: "yangzhou" },
  ];
  const first = layoutAgentPins(agents);
  const second = layoutAgentPins([...agents].reverse());

  assert.equal(first.length, 2);
  assert.deepEqual(first, second);
  assert.ok(first[0] && first[1]);
  assert.ok(Math.hypot(first[0].x - first[1].x, first[0].y - first[1].y) > 4);
  assert.ok(Math.hypot(first[0].x - first[1].x, first[0].y - first[1].y) < 48);
});

test("region anchors follow the ink-wash painting", () => {
  const at = (id: string) => JIUZHOU_REGIONS.find((region) => region.id === id);
  const youzhou = at("youzhou");
  const qingzhou = at("qingzhou");
  const zhongzhou = at("zhongzhou");
  const yangzhou = at("yangzhou");
  const cangzhou = at("cangzhou");
  assert.ok(youzhou && qingzhou && zhongzhou && yangzhou && cangzhou);
  assert.ok(qingzhou.x > youzhou.x);
  assert.ok(yangzhou.y > zhongzhou.y + 80);
  assert.ok(cangzhou.x > zhongzhou.x + 80);
});

test("an unknown state does not invent a pin", () => {
  assert.equal(anchorForLocation("atlantis:main-city", "atlantis"), null);
  assert.deepEqual(layoutAgentPins([
    { agentId: "lost", locationId: "atlantis:main-city", stateId: "atlantis" },
  ]), []);
});
