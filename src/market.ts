import type { HttpClient } from "./http.ts";
import type {
  AssetDetail,
  AssetType,
  BarsResponse,
  Country,
  Depth,
  Market,
  Panel,
  Quote,
  ScreenerItem,
  SettlementTerm,
} from "./types.ts";

export interface QuoteOptions {
  market?: Market;
  term?: SettlementTerm;
}

export interface BarsOptions extends QuoteOptions {
  /** Fecha inicial (Date o "yyyy-MM-dd"). */
  from: Date | string;
  /** Fecha final (Date o "yyyy-MM-dd"). */
  to: Date | string;
}

export interface ScreenerOptions {
  country?: Country;
  /** Tipo de asset, p. ej. "Acciones", "Bonos", "Cedears" (ver assetTypes). */
  assetType: string;
  /** Panel, p. ej. "merval", "panel_general" (ver panels). */
  panel: string;
  term?: SettlementTerm;
}

/** Datos de mercado: cotizaciones en tiempo real, paneles e historial. */
export class MarketApi {
  constructor(private readonly http: HttpClient) {}

  /** Cotización en tiempo real de un símbolo (precio, rango del día, volumen). */
  quote(symbol: string, opts: QuoteOptions = {}): Promise<Quote> {
    return this.http.request<Quote>(`/broker/market-data/${symbol.toUpperCase()}/quote`, {
      query: { market: opts.market ?? "BCBA", term: opts.term ?? "T0" },
    });
  }

  /** Libro de órdenes (puntas compradoras y vendedoras). */
  depth(symbol: string, opts: QuoteOptions = {}): Promise<Depth> {
    return this.http.request<Depth>(`/broker/market-data/${symbol.toUpperCase()}/depth`, {
      query: { market: opts.market ?? "BCBA", term: opts.term ?? "T0" },
    });
  }

  /** Panel completo en una sola llamada (cotización + puntas de cada papel). */
  screener(opts: ScreenerOptions): Promise<ScreenerItem[]> {
    return this.http.request<ScreenerItem[]>(`/broker/market-data/screener`, {
      query: {
        country: opts.country ?? "AR",
        asset_type: opts.assetType,
        panel: opts.panel,
        term: opts.term ?? "T0",
      },
    });
  }

  /** Historial diario OHLCV entre dos fechas (una barra por día). */
  bars(symbol: string, opts: BarsOptions): Promise<BarsResponse> {
    return this.http.request<BarsResponse>(`/broker/market-data/${symbol.toUpperCase()}/bars`, {
      query: {
        market: opts.market ?? "BCBA",
        from: toApiDateTime(opts.from, false),
        to: toApiDateTime(opts.to, true),
      },
    });
  }

  /** Detalle de un asset (tipo, moneda, lote, mínimos). */
  asset(symbol: string, market: Market = "BCBA"): Promise<AssetDetail> {
    return this.http.request<AssetDetail>(`/broker/assets/${symbol.toUpperCase()}`, {
      query: { market },
    });
  }

  /** Tipos de asset disponibles para el screener. */
  assetTypes(country: Country = "AR"): Promise<AssetType[]> {
    return this.http.request<AssetType[]>(`/broker/assets/types`, { query: { country } });
  }

  /** Paneles disponibles para un tipo de asset. */
  panels(country: Country, assetType: string): Promise<Panel[]> {
    return this.http.request<Panel[]>(`/broker/assets/panels`, {
      query: { country, asset_type: assetType },
    });
  }
}

/** La API pide fechas como "yyyy-MM-dd HH:mm:ss". */
function toApiDateTime(value: Date | string, endOfDay: boolean): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return endOfDay ? `${value} 23:59:59` : `${value} 00:00:00`;
  }
  const d = value instanceof Date ? value : new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}
