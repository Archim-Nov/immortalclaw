import assert from "node:assert/strict";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { createTickScheduler } from "./tick-scheduler.js";

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

test("getAlarm reflects setAlarm/deleteAlarm", () => {
  const scheduler = createTickScheduler();
  assert.equal(scheduler.getAlarm(), null);
  scheduler.setAlarm(123_456);
  assert.equal(scheduler.getAlarm(), 123_456);
  scheduler.deleteAlarm();
  assert.equal(scheduler.getAlarm(), null);
});

test("does not fire until start() registers a callback", async () => {
  const scheduler = createTickScheduler();
  let fired = 0;
  scheduler.setAlarm(Date.now()); // due, but no callback yet → must not fire
  await delay(25);
  assert.equal(fired, 0);

  scheduler.start(async () => {
    fired += 1;
  });
  await delay(25); // start arms the already-due alarm
  assert.ok(fired >= 1);
  scheduler.stop();
});

test("fires the callback when the alarm is due", async () => {
  const scheduler = createTickScheduler();
  let fired = 0;
  scheduler.start(async () => {
    fired += 1;
  });
  scheduler.setAlarm(Date.now());
  await delay(25);
  assert.equal(fired, 1);
  scheduler.stop();
});

test("serial guard never overlaps and coalesces concurrent fires", async () => {
  const scheduler = createTickScheduler();
  let runs = 0;
  let active = 0;
  let maxActive = 0;
  let gate = deferred();

  scheduler.start(async () => {
    runs += 1;
    active += 1;
    maxActive = Math.max(maxActive, active);
    await gate.promise;
    active -= 1;
  });

  scheduler.setAlarm(Date.now());
  await delay(20);
  assert.equal(runs, 1); // first fire in flight, awaiting the gate

  // additional due alarms while the first is running must not overlap
  scheduler.setAlarm(Date.now());
  scheduler.setAlarm(Date.now());
  await delay(20);
  assert.equal(runs, 1);
  assert.equal(maxActive, 1);

  const firstGate = gate;
  gate = deferred(); // the coalesced follow-up awaits a fresh gate
  firstGate.resolve(); // finish the first run → exactly one coalesced follow-up starts
  await delay(20);
  assert.equal(runs, 2);

  gate.resolve(); // finish the follow-up
  await delay(20);
  assert.equal(runs, 2);
  assert.equal(maxActive, 1);
  scheduler.stop();
});

test("deleteAlarm cancels a pending fire", async () => {
  const scheduler = createTickScheduler();
  let fired = 0;
  scheduler.start(async () => {
    fired += 1;
  });
  scheduler.setAlarm(Date.now() + 5);
  scheduler.deleteAlarm();
  await delay(25);
  assert.equal(fired, 0);
  assert.equal(scheduler.getAlarm(), null);
  scheduler.stop();
});

test("stop() halts all future fires", async () => {
  const scheduler = createTickScheduler();
  let fired = 0;
  scheduler.start(async () => {
    fired += 1;
  });
  scheduler.stop();
  scheduler.setAlarm(Date.now());
  await delay(25);
  assert.equal(fired, 0);
});

test("reproduces the runtime initialize→alarm reschedule loop", async () => {
  const scheduler = createTickScheduler();
  let advances = 0;

  // emulate runtime.alarm(): reschedule first, then advance
  const onAlarm = async () => {
    scheduler.setAlarm(Date.now() + 10_000); // far out — won't refire in the test window
    advances += 1;
  };

  // emulate runtime.initialize(): set the first alarm if none exists
  if (!scheduler.getAlarm()) {
    scheduler.setAlarm(Date.now());
  }
  scheduler.start(onAlarm);

  await delay(25);
  assert.equal(advances, 1); // fired once and rescheduled far out
  await delay(25);
  assert.equal(advances, 1);
  scheduler.stop();
});
