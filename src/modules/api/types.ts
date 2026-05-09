/** Generic API error envelope — align with your gateway contract. */
export interface ApiErrorBody {
  readonly code?: string;
  readonly message?: string;
  readonly details?: unknown;
}

export class ApiHttpError extends Error {
  readonly status: number;
  readonly body?: ApiErrorBody;

  constructor(status: number, message: string, body?: ApiErrorBody) {
    super(message);
    this.name = 'ApiHttpError';
    this.status = status;
    this.body = body;
  }
}
