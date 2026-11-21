import { describe, expect, test } from "bun:test";
import { IolClient } from "../src/client.ts";
import { IolApiError } from "../src/errors.ts";
import { MemoryTokenStore, type StoredTokens } from "../src/token-store.ts";
import type { ApiEnvelope } from "../src/types.ts";

/* Servidor falso de la API de IOL para probar el cliente sin red ni credenciales. */

interface FakeServer {
  fetchFn: typeof fetch;
  tokenCalls: Array<Record<string, string>>;
  authHeaders: string[];
}

function envelope<T>(data: T, status = 200): ApiEnvelope<T> {
  return {
    meta: { timestamp: "", path: "", method: "GET", status_code: status, trace_id: "trace-1" },
    data,
    error: null,
  };
}

function makeServer(opts: { failFirstQuoteWith401?: boolean } = {}): FakeServer {
  const tokenCalls: Array<Record<string, string>> = [];
  const authHeaders: string[] = [];
  let quoteAttempts = 0;

  const fetchFn = (async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/auth/token")) {
      const body = JSON.parse(String(init?.body)) as Record<string, string>;
      tokenCalls.push(body);
      const grant = body.grant_type;
      return Response.json(
        envelope({
          access_token: grant === "refresh_token" ? "access-refrescado" : "access-inicial",
          refresh_token: "refresh-1",
          expires_in: 900,
          expires_at: new Date(Date.now() + 900_000).toISOString(),
          token_type: "bearer",
        }),
      );
    }
    authHeaders.push(String((init?.headers as Record<string, string>)?.Authorization ?? ""));
    if (url.includes("/quote")) {
      quoteAttempts++;
      if (opts.failFirstQuoteWith401 && quoteAttempts === 1) {
        return Response.json(
          { meta: { trace_id: "t" }, data: null, error: { message: "Token expirado", code: "unauthorized" } },
          { status: 401 },
        );
      }
      return Response.json(
        envelope({
          symbol: "TXAR",
          market: "BCBA",
          settlement_term: "T0",
          currency: "ARS",
          prices: { current: 700, open: 690, close: 695, high: 705, low: 688, previous_close: 695 },
          change: { amount: 5, percent: 0.72 },
          volume: { shares: 1000, amount: 700000 },
          lot_size: 1,
          last_updated: "2026-11-20T17:00:00Z",
          maturity_date: null,
        }),
      );
    }
    throw new Error(`URL no esperada en el fake: ${url}`);
  }) as typeof fetch;

  return { fetchFn, tokenCalls, authHeaders };
}

function makeClient(server: FakeServer, store = new MemoryTokenStore()): IolClient {
  return new IolClient(
    { username: "usuario", password: "clave", baseUrl: "https://api.iolinversiones.com", tokenFile: "x" },
    { fetchFn: server.fetchFn, tokenStore: store },
  );
}

describe("cliente de solo lectura de IOL", () => {
  test("ingresa con usuario y contraseña y reutiliza el token en caché", async () => {
    const server = makeServer();
    const client = makeClient(server);

    const q1 = await client.market.quote("TXAR");
    const q2 = await client.market.quote("TXAR");

    expect(q1.prices.current).toBe(700);
    expect(q2.symbol).toBe("TXAR");
    expect(server.tokenCalls.length).toBe(1);
    expect(server.tokenCalls[0]?.grant_type).toBe("password");
    expect(server.authHeaders.every((h) => h === "Bearer access-inicial")).toBe(true);
  });

  test("con el access vencido renueva usando el refresh_token guardado", async () => {
    const server = makeServer();
    const store = new MemoryTokenStore();
    const expired: StoredTokens = {
      access_token: "access-viejo",
      refresh_token: "refresh-guardado",
      expires_at: new Date(Date.now() - 1000).toISOString(),
    };
    store.save(expired);
    const client = makeClient(server, store);

    const q = await client.market.quote("TXAR");

    expect(q.prices.current).toBe(700);
    expect(server.tokenCalls.length).toBe(1);
    expect(server.tokenCalls[0]?.grant_type).toBe("refresh_token");
    expect(server.authHeaders[0]).toBe("Bearer access-refrescado");
  });

  test("ante un 401 renueva el token y reintenta la consulta una vez", async () => {
    const server = makeServer({ failFirstQuoteWith401: true });
    const client = makeClient(server);

    const q = await client.market.quote("TXAR");

    expect(q.prices.current).toBe(700);
    expect(server.tokenCalls.map((c) => c.grant_type)).toEqual(["password", "refresh_token"]);
    expect(server.authHeaders).toEqual(["Bearer access-inicial", "Bearer access-refrescado"]);
  });

  test("sin credenciales configuradas, el error explica cómo cargarlas", async () => {
    const server = makeServer();
    const client = new IolClient(
      { baseUrl: "https://api.iolinversiones.com", tokenFile: "x" },
      { fetchFn: server.fetchFn, tokenStore: new MemoryTokenStore() },
    );
    await expect(client.market.quote("TXAR")).rejects.toThrow("IOL_USERNAME");
  });

  test("un error de la API se propaga como IolApiError con su código", async () => {
    const fetchFn = (async () =>
      Response.json(
        { meta: { trace_id: "t9" }, data: null, error: { message: "Símbolo inexistente", code: "not_found" } },
        { status: 404 },
      )) as unknown as typeof fetch;
    const store = new MemoryTokenStore();
    store.save({
      access_token: "a",
      refresh_token: "r",
      expires_at: new Date(Date.now() + 900_000).toISOString(),
    });
    const client = new IolClient(
      { username: "u", password: "p", baseUrl: "https://api.iolinversiones.com", tokenFile: "x" },
      { fetchFn, tokenStore: store },
    );
    const err = await client.market.quote("XXXX").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(IolApiError);
    expect((err as IolApiError).code).toBe("not_found");
    expect((err as IolApiError).status).toBe(404);
  });
});
