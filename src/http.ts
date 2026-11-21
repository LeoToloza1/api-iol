import type { AuthManager } from "./auth.ts";
import { IolApiError } from "./errors.ts";
import type { ApiEnvelope } from "./types.ts";

type FetchFn = typeof fetch;

export interface RequestOptions {
  method?: "GET" | "POST";
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  /** Si es false, no se envía Authorization (p. ej. /health). */
  auth?: boolean;
}

/**
 * Cliente HTTP mínimo sobre fetch:
 * - agrega el token Bearer y reintenta una vez tras renovarlo si hay un 401,
 * - desenvuelve el sobre estándar { meta, data, error } de la API,
 * - convierte los errores en IolApiError con código y trace_id.
 */
export class HttpClient {
  constructor(
    private readonly baseUrl: string,
    private readonly auth: AuthManager | null,
    private readonly fetchFn: FetchFn = fetch,
  ) {}

  async request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const useAuth = opts.auth !== false;
    if (useAuth && !this.auth) {
      throw new IolApiError("Este endpoint requiere autenticación y el cliente no tiene AuthManager.");
    }

    let token = useAuth ? await this.auth!.getAccessToken() : null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await this.fetchFn(this.buildUrl(path, opts.query), {
        method: opts.method ?? "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      });

      if (res.status === 401 && useAuth && attempt === 0) {
        // Token vencido o revocado: renovar y reintentar una sola vez.
        token = await this.auth!.forceRefresh();
        continue;
      }

      const envelope = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;
      if (!envelope) {
        throw new IolApiError(`Respuesta inválida de la API (HTTP ${res.status})`, {
          status: res.status,
        });
      }
      if (!res.ok || envelope.error || envelope.data === null) {
        throw new IolApiError(
          envelope.error?.message ?? `Error de la API (HTTP ${res.status})`,
          {
            code: envelope.error?.code,
            status: res.status,
            traceId: envelope.meta?.trace_id,
            details: envelope.error?.details,
          },
        );
      }
      return envelope.data;
    }
    // Inalcanzable: el loop siempre retorna o lanza.
    throw new IolApiError("No se pudo completar la solicitud.");
  }

  private buildUrl(path: string, query?: RequestOptions["query"]): string {
    const url = new URL(path, this.baseUrl);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }
}
