export class AppError extends Error {
  constructor(
    public code: string,
    options?: { cause?: unknown; status?: number; message?: string }
  ) {
    super(options?.message ?? code, { cause: options?.cause });
    this.name = "AppError";
    this.status = options?.status ?? 500;
  }
  status: number;
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
