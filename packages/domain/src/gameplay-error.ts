export class GameplayRejection extends Error {
  readonly status = 409;

  constructor(message: string) {
    super(message);
    this.name = "GameplayRejection";
  }
}

export function rejectGameplay(message: string): never {
  throw new GameplayRejection(message);
}

/**
 * Agent-facing action failures should explain themselves.
 * Unexpected infrastructure errors keep their own status, or stay unmarked so
 * the HTTP layer can still treat them as 500.
 */
export function stampActionRejection(error: unknown): unknown {
  if (error instanceof GameplayRejection) {
    return error;
  }
  if (error instanceof Error) {
    const status = (error as { status?: unknown }).status;
    if (typeof status !== "number") {
      return Object.assign(error, { status: 409 });
    }
  }
  return error;
}
