#!/usr/bin/env bun
/**
 * CLI de prueba del cliente de solo lectura de la API de IOL.
 *
 * Uso:
 *   bun run src/cli.ts salud
 *   bun run src/cli.ts cotizar TXAR
 *   bun run src/cli.ts tipos
 *   bun run src/cli.ts paneles Acciones
 *   bun run src/cli.ts panel Acciones merval
 *   bun run src/cli.ts saldos
 *   bun run src/cli.ts cartera [ARS|USD|MEP|CCL]
 *   bun run src/cli.ts historial TXAR 2026-05-20 2026-11-20
 */
import { IolClient } from "./client.ts";
import { IolApiError, IolConfigError } from "./errors.ts";
import type { ValuationCurrency } from "./types.ts";

const fmt = (n: number) =>
  n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function main(): Promise<void> {
  const [cmd, ...args] = process.argv.slice(2);
  const client = IolClient.fromEnv();

  switch (cmd) {
    case "salud": {
      const health = await client.health();
      console.log(`API de IOL: ${health.status} (versión ${health.version})`);
      break;
    }
    case "cotizar": {
      const symbol = required(args[0], "Falta el símbolo. Ej: cotizar TXAR");
      const q = await client.market.quote(symbol);
      console.log(
        `${q.symbol} (${q.market} ${q.settlement_term}) — $${fmt(q.prices.current)} ` +
          `(${q.change.percent >= 0 ? "+" : ""}${fmt(q.change.percent)}%)`,
      );
      console.log(
        `Apertura $${fmt(q.prices.open)} · Máx $${fmt(q.prices.high)} · Mín $${fmt(q.prices.low)} · ` +
          `Cierre anterior $${fmt(q.prices.previous_close)}`,
      );
      console.log(`Volumen: ${q.volume.shares.toLocaleString("es-AR")} papeles · ${q.last_updated}`);
      break;
    }
    case "tipos": {
      const types = await client.market.assetTypes("AR");
      for (const t of types) console.log(`- ${t.id} (${t.name})`);
      break;
    }
    case "paneles": {
      const assetType = required(args[0], "Falta el tipo. Ej: paneles Acciones");
      const panels = await client.market.panels("AR", assetType);
      for (const p of panels) console.log(`- ${p.id} (${p.name})`);
      break;
    }
    case "panel": {
      const assetType = required(args[0], "Falta el tipo. Ej: panel Acciones merval");
      const panel = required(args[1], "Falta el panel. Ej: panel Acciones merval");
      const items = await client.market.screener({ assetType, panel });
      for (const it of items) {
        console.log(
          `${it.instrument.symbol.padEnd(8)} $${fmt(it.quotes.last)} ` +
            `(${it.quotes.change_percent >= 0 ? "+" : ""}${fmt(it.quotes.change_percent)}%)`,
        );
      }
      console.log(`${items.length} papeles`);
      break;
    }
    case "saldos": {
      const balances = await client.accounts.balances("AR");
      console.log(JSON.stringify(balances, null, 2));
      break;
    }
    case "cartera": {
      const currency = (args[0] as ValuationCurrency | undefined) ?? "ARS";
      const { positions } = await client.accounts.positions("AR", currency);
      for (const p of positions) {
        console.log(
          `${p.instrument.symbol.padEnd(8)} x${p.availability.quantity_available} · ` +
            `PPC $${fmt(p.cost_basis.average_entry_price)} · Hoy $${fmt(p.market_value.current_price)} ` +
            `(${p.market_value.price_change_percent >= 0 ? "+" : ""}${fmt(p.market_value.price_change_percent)}%)`,
        );
      }
      console.log(`${positions.length} posiciones (valuación en ${currency})`);
      break;
    }
    case "historial": {
      const symbol = required(args[0], "Falta el símbolo. Ej: historial TXAR 2026-05-20 2026-11-20");
      const from = required(args[1], "Falta la fecha desde (yyyy-MM-dd).");
      const to = required(args[2], "Falta la fecha hasta (yyyy-MM-dd).");
      const { bars, total_bars } = await client.market.bars(symbol, { from, to });
      console.log(`${symbol}: ${total_bars} barras diarias`);
      for (const b of bars.slice(-5)) {
        console.log(
          `${b.datetime.slice(0, 10)} · Cierre $${fmt(b.close)} · Máx $${fmt(b.high)} · Mín $${fmt(b.low)} · Vol ${b.volume.toLocaleString("es-AR")}`,
        );
      }
      break;
    }
    default:
      console.log(
        [
          "Comandos:",
          "  salud                          Estado de la API (sin login)",
          "  cotizar <SIMBOLO>              Cotización en tiempo real",
          "  tipos                          Tipos de asset para el screener",
          "  paneles <TIPO>                 Paneles de un tipo de asset",
          "  panel <TIPO> <PANEL>           Panel completo en una llamada",
          "  saldos                         Saldos de la cuenta AR",
          "  cartera [ARS|USD|MEP|CCL]      Posiciones y valuación",
          "  historial <SIM> <DESDE> <HASTA>  Barras diarias OHLCV",
        ].join("\n"),
      );
      if (cmd) process.exitCode = 1;
  }
}

function required(value: string | undefined, message: string): string {
  if (!value) throw new IolConfigError(message);
  return value;
}

main().catch((err: unknown) => {
  if (err instanceof IolConfigError) {
    console.error(`Configuración: ${err.message}`);
  } else if (err instanceof IolApiError) {
    console.error(`Error de la API: ${err.message}${err.code ? ` (${err.code})` : ""}`);
  } else {
    console.error(err);
  }
  process.exit(1);
});
