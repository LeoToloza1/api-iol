import { requireCredentials, type IolConfig } from "./config.ts";
import { IolApiError } from "./errors.ts";
import type { TokenStore, StoredTokens } from "./token-store.ts";
import type { ApiEnvelope, TokenResponse } from "./types.ts";

type FetchFn = typeof fetch;

/** Margen de seguridad: renovar el token si vence en menos de 60 segundos. */
const EXPIRY_MARGIN_MS = 60_000;

/**
 * Maneja la autenticación OAuth 2.0 de la API:
 * - access_token JWT de 15 minutos (se cachea y se renueva solo),
 * - refresh_token de 30 días (se persiste en el TokenStore),
 * - si no hay tokens guardados, entra con usuario y contraseña.
 */
export class AuthManager {
  private tokens: StoredTokens | null;

  constructor(
    private readonly config: IolConfig,
    private readonly store: TokenStore,
    private readonly fetchFn: FetchFn = fetch,
  ) {
    this.tokens = store.load();
  }

  /** Devuelve un access_token válido, renovando o ingresando si hace falta. */
  async getAccessToken(): Promise<string> {
    if (this.tokens && !this.isExpiring(this.tokens)) {
      return this.tokens.access_token;
    }
    if (this.tokens?.refresh_token) {
      try {
        return await this.refresh();
      } catch {
        // Refresh vencido o revocado: se cae al ingreso con credenciales.
        this.tokens = null;
        this.store.clear();
      }
    }
    return this.login();
  }

  /** Fuerza una renovación con el refresh_token (p. ej. tras un 401). */
  async forceRefresh(): Promise<string> {
    if (this.tokens?.refresh_token) {
      try {
        return await this.refresh();
      } catch {
        this.tokens = null;
        this.store.clear();
      }
    }
    return this.login();
  }

  /** Ingreso inicial con usuario y contraseña de la plataforma. */
  async login(): Promise<string> {
    const { username, password } = requireCredentials(this.config);
    const data = await this.requestToken({ grant_type: "password", username, password });
    return data.access_token;
  }

  /** Renueva el access_token usando el refresh_token guardado. */
  async refresh(): Promise<string> {
    if (!this.tokens?.refresh_token) return this.login();
    const data = await this.requestToken({
      grant_type: "refresh_token",
      refresh_token: this.tokens.refresh_token,
    });
    return data.access_token;
  }

  private isExpiring(tokens: StoredTokens): boolean {
    const expiresAt = Date.parse(tokens.expires_at);
    if (Number.isNaN(expiresAt)) return true;
    return expiresAt - Date.now() < EXPIRY_MARGIN_MS;
  }

  private async requestToken(body: Record<string, string>): Promise<TokenResponse> {
    const res = await this.fetchFn(`${this.config.baseUrl}/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const envelope = (await res.json()) as ApiEnvelope<TokenResponse>;
    if (!res.ok || envelope.error || !envelope.data) {
      throw new IolApiError(
        envelope.error?.message ?? `Error de autenticación (HTTP ${res.status})`,
        { code: envelope.error?.code, status: res.status, traceId: envelope.meta?.trace_id },
      );
    }
    const stored: StoredTokens = {
      access_token: envelope.data.access_token,
      refresh_token: envelope.data.refresh_token,
      expires_at:
        envelope.data.expires_at ??
        new Date(Date.now() + envelope.data.expires_in * 1000).toISOString(),
    };
    this.tokens = stored;
    this.store.save(stored);
    return envelope.data;
  }
}
