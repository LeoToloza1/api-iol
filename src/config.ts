import { IolConfigError } from "./errors.ts";

export interface IolConfig {
  /** Usuario de la plataforma de IOL (el mismo de la web/app). */
  username?: string;
  /** Contraseña de la plataforma de IOL. */
  password?: string;
  /** Base de la API. Por defecto: https://api.iolinversiones.com */
  baseUrl: string;
  /** Archivo donde se guardan los tokens (refresh dura 30 días). */
  tokenFile: string;
}

export const DEFAULT_BASE_URL = "https://api.iolinversiones.com";

/**
 * Carga la configuración desde variables de entorno.
 * Con Bun, el archivo `.env` del proyecto se carga solo.
 */
export function loadConfig(env: Record<string, string | undefined> = process.env): IolConfig {
  return {
    username: env.IOL_USERNAME || undefined,
    password: env.IOL_PASSWORD || undefined,
    baseUrl: (env.IOL_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, ""),
    tokenFile: env.IOL_TOKEN_FILE || ".iol-tokens.json",
  };
}

/** Devuelve las credenciales o lanza un error con instrucciones claras. */
export function requireCredentials(config: IolConfig): { username: string; password: string } {
  if (!config.username || !config.password) {
    throw new IolConfigError(
      "Faltan las credenciales de IOL. Copiá .env.example a .env y completá " +
        "IOL_USERNAME e IOL_PASSWORD con tu usuario y contraseña de la plataforma.",
    );
  }
  return { username: config.username, password: config.password };
}
