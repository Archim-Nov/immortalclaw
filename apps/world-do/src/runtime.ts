import { readTickSteps, type WorldDOEnv } from "./env.js";

export interface WorldDoRuntimeStorage {
  getAlarm(): Promise<number | null> | number | null;
  setAlarm(timestamp: number): Promise<void> | void;
  deleteAlarm?(): Promise<void> | void;
}

export interface WorldDoRuntimeWorld {
  advanceWorld(steps: number, trigger?: "manual" | "scheduled"): Promise<unknown>;
  resetWorldStorage?(): Promise<void>;
}

export interface WorldDoRuntimeOptions {
  env: WorldDOEnv;
  storage: WorldDoRuntimeStorage;
  world: WorldDoRuntimeWorld;
}

export function createWorldDoRuntime(options: WorldDoRuntimeOptions) {
  return {
    async initialize(): Promise<void> {
      const existingAlarm = await options.storage.getAlarm();
      if (!existingAlarm) {
        await options.storage.setAlarm(Date.now() + 60_000);
      }
    },

    async alarm(): Promise<void> {
      await options.storage.setAlarm(Date.now() + 60_000);
      await options.world.advanceWorld(readTickSteps(options.env), "scheduled");
    },

    async resetForRollout(): Promise<void> {
      if (!options.world.resetWorldStorage) {
        throw new Error("World runtime does not support reset.");
      }
      await options.world.resetWorldStorage();
      await options.storage.deleteAlarm?.();
    },
  };
}
