import type { HttpClient } from "./http.ts";
import type {
  Balances,
  Country,
  PositionsResponse,
  ValuationCurrency,
} from "./types.ts";

/** Datos de la cuenta: saldos, posiciones, movimientos e historial. */
export class AccountsApi {
  constructor(private readonly http: HttpClient) {}

  /** Saldos por moneda y plazo de liquidación (AR devuelve ARS + USD). */
  balances(country: Country = "AR"): Promise<Balances> {
    return this.http.request<Balances>(`/broker/accounts/${country}/balances`);
  }

  /**
   * Posiciones (tenencias) con costo promedio y valuación de mercado.
   * Para cuentas AR se puede valuar en ARS, USD, MEP o CCL.
   */
  positions(
    country: Country = "AR",
    valuationCurrency: ValuationCurrency = "ARS",
  ): Promise<PositionsResponse> {
    return this.http.request<PositionsResponse>(`/broker/accounts/${country}/positions`, {
      query: { valuation_currency: valuationCurrency },
    });
  }

  /** Actividades de la cuenta (movimientos de dinero y de títulos). */
  activities(query: Record<string, string | number> = {}): Promise<unknown> {
    return this.http.request<unknown>(`/broker/accounts/activities`, { query });
  }

  /** Operaciones de la cuenta (compras, ventas, suscripciones, rescates). */
  operations(query: Record<string, string | number> = {}): Promise<unknown> {
    return this.http.request<unknown>(`/broker/accounts/activities/operations`, { query });
  }

  /** Historial de valuación de la cartera. */
  portfolioHistory(country: Country = "AR"): Promise<unknown> {
    return this.http.request<unknown>(`/broker/accounts/${country}/portfolio/history`);
  }
}
