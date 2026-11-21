/**
 * Tipos de la API de IOL Inversiones (REST v1, https://api.iolinversiones.com).
 * Basados en la documentación oficial: https://developers.iolinversiones.com
 */

/** Sobre estándar de todas las respuestas de la API. */
export interface ApiEnvelope<T> {
  meta: {
    timestamp: string;
    path: string;
    method: string;
    status_code: number;
    trace_id: string;
    total_count?: number;
  };
  data: T | null;
  error: {
    message: string;
    code: string;
    details?: unknown;
  } | null;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  /** Segundos hasta que expire el access_token (15 min). */
  expires_in: number;
  /** Expiración del access_token en ISO 8601 (UTC). */
  expires_at: string;
  token_type: string;
}

export type Market = "BCBA" | "NYSE" | "NASDAQ";
export type SettlementTerm = "T0" | "T1";
export type Country = "AR" | "US";
export type ValuationCurrency = "ARS" | "USD" | "MEP" | "CCL";

/* ------------------------------ Mercado ------------------------------ */

export interface Quote {
  symbol: string;
  market: string;
  settlement_term: string;
  currency: string;
  prices: {
    current: number;
    open: number;
    close: number;
    high: number;
    low: number;
    previous_close: number;
  };
  change: {
    amount: number;
    percent: number;
  };
  volume: {
    shares: number;
    amount: number;
  };
  lot_size: number;
  last_updated: string;
  maturity_date: string | null;
}

export interface BookLevel {
  price: number;
  size: number;
  position: number;
}

export interface Depth {
  symbol: string;
  market: string;
  settlement_term: string;
  bids: BookLevel[];
  asks: BookLevel[];
  lot_size: number;
  last_updated: string;
}

export interface ScreenerItem {
  instrument: {
    symbol: string;
    name: string;
    market: string;
    currency: string;
  };
  quotes: {
    last: number;
    open: number;
    high: number;
    low: number;
    close: number;
    change_percent: number;
    volume: number;
  };
  book: {
    bid: { price: number; size: number };
    ask: { price: number; size: number };
  };
}

export interface Bar {
  timestamp: number;
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BarsResponse {
  symbol: string;
  market: string;
  bars: Bar[];
  total_bars: number;
}

export interface AssetDetail {
  symbol: string;
  name: string;
  asset_type: string;
  country: string;
  market: string;
  currency: string;
  default_settlement_term: string;
  trading_info: {
    lot_size: number;
    minimum_investment: number;
    minimum_quantity: number;
  };
}

export interface AssetType {
  id: string;
  name: string;
}

export interface Panel {
  id: string;
  name: string;
}

/* ------------------------------ Cuentas ------------------------------ */

export interface SettlementBuckets {
  t0: number;
  t1: number;
  t2: number;
  t3: number;
}

export interface CurrencyBalance {
  currency: string;
  totals: SettlementBuckets;
  available: SettlementBuckets;
  committed: SettlementBuckets;
  available_for_withdrawal: number;
}

/** AR devuelve ars + usd; US devuelve solo usd. */
export interface Balances {
  ars?: CurrencyBalance;
  usd?: CurrencyBalance;
}

export interface Position {
  instrument: {
    symbol: string;
    name: string;
    asset_class: string;
    country: string | null;
    currency: string;
    exchange: string;
    lot_size: number;
    minimum_quantity: number;
    tradable: boolean;
    type: string;
  };
  availability: {
    quantity_available: number;
    quantity_held: number;
    quantity_pending: number;
  };
  cost_basis: {
    average_entry_price: number;
    total_cost: number;
    entry_date: string | null;
    days_held: number;
  };
  market_value: {
    current_price: number;
    price_change: number;
    price_change_percent: number;
    [key: string]: unknown;
  };
  is_accredited: boolean;
  [key: string]: unknown;
}

export interface PositionsResponse {
  account: string;
  currency: string;
  positions: Position[];
  [key: string]: unknown;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  uptime: number;
  version: string;
}
