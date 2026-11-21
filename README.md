# api-iol

Cliente **TypeScript (Bun)** de **solo lectura** para la API oficial de **IOL Inversiones**
(InvertirOnline), pensado para alimentar monitoreo de cartera, cierres diarios y análisis
sin entrar a la web ni scrapear precios.

- Cotizaciones en tiempo real y paneles completos en una sola llamada
- Historial diario OHLCV directo de IOL (sin depender de Yahoo)
- Saldos y posiciones con valuación en ARS, USD, MEP o CCL
- Autenticación OAuth 2.0 con renovación automática de tokens

> **Alcance deliberado:** este cliente **no envía órdenes**. La API lo permite, pero operar
> requiere siempre la aprobación explícita del titular por cada operación. La estimación de
> costos y el envío de órdenes quedan para una etapa posterior, con esa regla incorporada.

## Requisitos

- [Bun](https://bun.sh) 1.x
- Una cuenta comitente activa en IOL (la API es gratuita y ya viene habilitada:
  se ingresa con el mismo usuario y contraseña de la plataforma)

## Instalación

```bash
git clone https://github.com/LeoToloza1/api-iol.git
cd api-iol
bun install
cp .env.example .env   # completar IOL_USERNAME e IOL_PASSWORD
```

El archivo `.env` y el de tokens (`.iol-tokens.json`) están en `.gitignore`:
las credenciales **nunca** se suben al repo.

## Seguridad

Este repositorio es **público**: jamás debe contener credenciales ni datos de la cuenta.

- Las credenciales viven solo en tu `.env` local (está en `.gitignore`), y los tokens en
  `.iol-tokens.json` (también ignorado). El repo solo trae `.env.example`, sin valores.
- No commitees salidas reales de `saldos`, `cartera` o `actividades`: son datos de tu cuenta.
- Si alguna vez se filtra una credencial, cambiá la contraseña de la plataforma de IOL
  de inmediato y borrá tu `.iol-tokens.json` local.

## Uso rápido (CLI de prueba)

```bash
bun run src/cli.ts salud                              # estado de la API (sin login)
bun run src/cli.ts cotizar TXAR                       # cotización en tiempo real
bun run src/cli.ts tipos                              # tipos de asset del screener
bun run src/cli.ts paneles Acciones                   # paneles disponibles
bun run src/cli.ts panel Acciones merval              # panel completo, una llamada
bun run src/cli.ts saldos                             # saldos de la cuenta AR
bun run src/cli.ts cartera MEP                        # posiciones valuadas en MEP
bun run src/cli.ts historial TXAR 2026-05-20 2026-11-20
```

La primera vez ingresa con usuario y contraseña y guarda el `refresh_token`
(dura 30 días) en `.iol-tokens.json`; las corridas siguientes renuevan solas.

## Uso como librería

```ts
import { IolClient } from "./src/index.ts";

const client = IolClient.fromEnv(); // lee .env

const quote = await client.market.quote("GGAL");            // tiempo real
const panel = await client.market.screener({ assetType: "Acciones", panel: "merval" });
const bars  = await client.market.bars("TXAR", { from: "2026-05-20", to: "2026-11-20" });

const balances  = await client.accounts.balances("AR");     // ARS + USD por plazo
const portfolio = await client.accounts.positions("AR", "MEP");
```

## Arquitectura

```
src/
  config.ts       Configuración desde variables de entorno
  errors.ts       IolApiError / IolConfigError
  token-store.ts  Persistencia de tokens (archivo o memoria)
  auth.ts         OAuth 2.0: login, caché y refresh del access_token (15 min)
  http.ts         Fetch con Bearer, reintento tras 401 y desenvoltura del sobre {meta, data, error}
  market.ts       Cotización, profundidad, screener, barras, assets
  accounts.ts     Saldos, posiciones, actividades, historial de cartera
  client.ts       Fachada IolClient (market + accounts + health)
  cli.ts          CLI de prueba
tests/
  iol.test.ts     Tests con un servidor falso (sin red ni credenciales)
```

## Verificación

```bash
bun test            # 5 tests: login y caché, refresh, reintento tras 401, errores
bun run typecheck   # tsc --noEmit
```

## Referencias

- Portal de la API: https://api.invertironline.com
- Documentación: https://developers.iolinversiones.com
- Base REST: `https://api.iolinversiones.com` — respuestas `{ meta, data, error }`,
  `access_token` de 15 minutos y `refresh_token` de 30 días.

## Próximos pasos

1. Enchufar el cliente al monitoreo intradiario y al cierre diario (reemplaza navegador y Yahoo).
2. Etapa de órdenes (con aprobación por operación): estimación de costos para armar tickets
   y, recién con el «sí» del titular, envío de la orden con clave de idempotencia.
