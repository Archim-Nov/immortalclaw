export interface ApplicationStatusError extends Error {
  status: number;
}

export function createApplicationError(status: number, message: string): ApplicationStatusError {
  return Object.assign(new Error(message), { status });
}
