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
/**
 * Failed acts should stay readable when a client only shows `summary`.
 * The same sentence is copied onto `error` so older readers do not go blank.
 */
export function actionFailureBody(error: unknown): { error: string; summary: string } {
  const message = error instanceof Error && error.message.trim()
    ? error.message.trim()
    : "Unexpected server error.";
  return { error: message, summary: message };
}

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
