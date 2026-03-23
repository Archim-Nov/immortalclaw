/// <reference types="@cloudflare/workers-types" />
import { DurableObject } from "cloudflare:workers";
import { Hono } from "hono";
import {
  createSchema,
  createSqliteWorldRepository,
  createSupabaseAuthClient,
  type SqlStorage,
  type SqlStorageCursor,
} from "../../../packages/persistence/src/index.js";
import { registerMiddleware } from "./middleware.js";
import { registerRoutes } from "./routes.js";
import { createWorldDoRuntime } from "./runtime.js";
import type { WorldDOEnv, WorldDOHonoEnv } from "./env.js";

interface DurableObjectSqlCursor<T> {
  toArray(): T[];
  readonly rowsRead: number;
  readonly rowsWritten: number;
}

interface DurableObjectSqlStorage {
  exec<T = Record<string, unknown>>(query: string, ...bindings: unknown[]): DurableObjectSqlCursor<T>;
}

function createDurableObjectSqlStorage(sql: DurableObjectSqlStorage): SqlStorage {
  return {
    exec<T>(query: string, ...bindings: unknown[]): SqlStorageCursor<T> {
      const cursor = sql.exec<T>(query, ...bindings);
      const rows = cursor.toArray();

      return {
        toArray() {
          return rows;
        },
        one() {
          return rows[0];
        },
        rowsRead: cursor.rowsRead,
        rowsWritten: cursor.rowsWritten,
      };
    },
  };
}

export class WorldDurableObject extends DurableObject<WorldDOEnv> {
  private readonly app: Hono<WorldDOHonoEnv>;
  private readonly runtime: ReturnType<typeof createWorldDoRuntime>;
  private readonly bindings: WorldDOEnv;

  constructor(ctx: DurableObjectState, env: WorldDOEnv) {
    super(ctx, env);
    this.bindings = env;

    const sql = createDurableObjectSqlStorage(ctx.storage.sql as DurableObjectSqlStorage);
    const world = createSqliteWorldRepository({ sql });
    const auth = createSupabaseAuthClient({
      url: env.SUPABASE_URL,
      secretKey: env.SUPABASE_SECRET_KEY,
    });

    this.app = new Hono<WorldDOHonoEnv>();
    this.runtime = createWorldDoRuntime({
      env,
      storage: ctx.storage,
      world,
    });

    this.app.use("*", async (context, next) => {
      context.set("world", world);
      context.set("auth", auth);
      await next();
    });

    registerMiddleware(this.app, env);
    registerRoutes(this.app);

    ctx.blockConcurrencyWhile(async () => {
      createSchema(sql);
      await this.runtime.initialize();
    });
  }

  async fetch(request: Request): Promise<Response> {
    return await this.app.fetch(request, this.bindings);
  }

  async alarm(): Promise<void> {
    await this.runtime.alarm();
  }
}
