import { Hono } from "hono";
import { createInMemoryWorldRepository } from "@immortal-claw/persistence";
import { registerMiddleware } from "./middleware.js";
import { registerRoutes } from "./routes.js";
import type { WorldDOEnv, WorldDOHonoEnv } from "./env.js";

export const TEST_PAGES_ORIGIN = "https://immortal-claw.pages.dev";

export const TEST_ENV: WorldDOEnv = {
  FRONTEND_ORIGIN: TEST_PAGES_ORIGIN,
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SECRET_KEY: "secret",
  WORLD_TICK_STEPS: "1",
};

type TestDependencies = {
  world?: Partial<WorldDOHonoEnv["Variables"]["world"]>;
  auth?: Partial<WorldDOHonoEnv["Variables"]["auth"]>;
};

export function createTestApp(dependencies: TestDependencies = {}) {
  const app = new Hono<WorldDOHonoEnv>();
  const repository = createInMemoryWorldRepository();
  const world = Object.assign(repository as unknown as Record<string, unknown>, dependencies.world ?? {});
  const auth = Object.assign(repository as unknown as Record<string, unknown>, dependencies.auth ?? {});

  app.use("*", async (context, next) => {
    context.set("world", world as never);
    context.set("auth", auth as never);
    await next();
  });

  registerMiddleware(app, TEST_ENV);
  registerRoutes(app);
  return app;
}

export function createQuestionnaireRegistrationBody(overrides: Record<string, unknown> = {}) {
  return {
    name: "Su Mingyue",
    answers: {
      Q1: "C",
      Q2: "C",
      Q3: "C",
      Q4: "C",
      Q5: "C",
      Q6: "C",
      Q7: "C",
      Q8: "A",
      Q9: "C",
      Q10: "C",
      Q11: "C",
      Q12: "C",
      Q13: "B",
      Q14: "B",
      Q15: "B",
      Q16: "B",
      Q17: "C",
      Q18: "B",
    },
    ...overrides,
  };
}
