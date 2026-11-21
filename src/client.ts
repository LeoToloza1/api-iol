import { AuthManager } from "./auth.ts";
import { AccountsApi } from "./accounts.ts";
import { loadConfig, type IolConfig } from "./config.ts";
import { HttpClient } from "./http.ts";
import { MarketApi } from "./market.ts";
import { FileTokenStore, type TokenStore } from "./token-store.ts";
import type { HealthResponse } from "./types.ts";

export interface IolClientDeps {
  /** Store de tokens. Por defecto, archivo local (.iol-tokens.json). */
  tokenStore?: TokenStore;
  /** Implementación de fetch (inyectable para tests). */
  fetchFn?: typeof fetch;
}

/**
 * Cliente de SOLO LECTURA de la API de IOL Inversiones.
 *
 * A propósito NO incluye envío de órdenes: operar requiere siempre
 * la aprobación explícita del titular por cada operación.
 */
export class IolClient {
  readonly market: MarketApi;
  readonly accounts: AccountsApi;
  private readonly httpPublic: HttpClient;

  constructor(config: IolConfig, deps: IolClientDeps = {}) {
    const fetchFn = deps.fetchFn ?? fetch;
    const store = deps.tokenStore ?? new FileTokenStore(config.tokenFile);
    const auth = new AuthManager(config, store, fetchFn);
    const http = new HttpClient(config.baseUrl, auth, fetchFn);
    this.httpPublic = new HttpClient(config.baseUrl, null, fetchFn);
    this.market = new MarketApi(http);
    this.accounts = new AccountsApi(http);
  }

  /** Crea el cliente leyendo la configuración del entorno (.env). */
  static fromEnv(deps: IolClientDeps = {}): IolClient {
    return new IolClient(loadConfig(), deps);
  }

  /** Estado de la API (no requiere autenticación). */
  health(): Promise<HealthResponse> {
    return this.httpPublic.request<HealthResponse>("/health", { auth: false });
  }
}
