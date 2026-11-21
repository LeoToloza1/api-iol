/** Error de la API de IOL: trae el código, el status HTTP y el trace_id. */
export class IolApiError extends Error {
  readonly code?: string;
  readonly status?: number;
  readonly traceId?: string;
  readonly details?: unknown;

  constructor(
    message: string,
    opts: { code?: string; status?: number; traceId?: string; details?: unknown } = {},
  ) {
    super(message);
    this.name = "IolApiError";
    this.code = opts.code;
    this.status = opts.status;
    this.traceId = opts.traceId;
    this.details = opts.details;
  }
}

/** Error de configuración local (faltan credenciales, etc.). */
export class IolConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IolConfigError";
  }
}
