import type { WorldDoRuntimeStorage } from "@immortal-claw/world-do/runtime";

// A setTimeout-driven implementation of WorldDoRuntimeStorage that plays the role
// the Durable Object platform plays for alarms: it persists the next alarm time
// and fires the registered callback (runtime.alarm()) when due. runtime.alarm()
// reschedules itself via setAlarm and then advances the world.
//
// A serial guard reproduces the Durable Object's blockConcurrencyWhile guarantee:
// a fire that arrives while the previous one is still running is coalesced into a
// single follow-up run instead of overlapping (and instead of being silently
// dropped, which would stall the loop if an advance ever outran the interval).

export interface TickScheduler extends WorldDoRuntimeStorage {
  // WorldDoRuntimeStorage.deleteAlarm is optional; this implementation always provides it.
  deleteAlarm(): void;
  start(onFire: () => Promise<void>): void;
  stop(): void;
}

export function createTickScheduler(): TickScheduler {
  let alarmAt: number | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let onFire: (() => Promise<void>) | null = null;
  let firing = false;
  let pending = false;

  function clearTimer(): void {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function arm(): void {
    clearTimer();
    if (alarmAt === null || onFire === null) {
      return;
    }
    const delay = Math.max(0, alarmAt - Date.now());
    timer = setTimeout(() => {
      void fire();
    }, delay);
  }

  async function fire(): Promise<void> {
    if (onFire === null) {
      return;
    }
    if (firing) {
      pending = true;
      return;
    }
    firing = true;
    try {
      await onFire();
    } finally {
      firing = false;
      if (pending) {
        pending = false;
        void fire();
      }
    }
  }

  return {
    getAlarm(): number | null {
      return alarmAt;
    },
    setAlarm(timestamp: number): void {
      alarmAt = timestamp;
      arm();
    },
    deleteAlarm(): void {
      alarmAt = null;
      pending = false;
      clearTimer();
    },
    start(fn: () => Promise<void>): void {
      onFire = fn;
      arm();
    },
    stop(): void {
      onFire = null;
      pending = false;
      clearTimer();
    },
  };
}
