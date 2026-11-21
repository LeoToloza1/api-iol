import { existsSync, readFileSync, writeFileSync, rmSync } from "node:fs";

export interface StoredTokens {
  access_token: string;
  refresh_token: string;
  /** Expiración del access_token en ISO 8601. */
  expires_at: string;
}

/** Persistencia de tokens. El refresh_token dura 30 días: guardarlo evita
 *  pedir las credenciales en cada corrida. */
export interface TokenStore {
  load(): StoredTokens | null;
  save(tokens: StoredTokens): void;
  clear(): void;
}

/** Guarda los tokens en un archivo local (debe estar en .gitignore). */
export class FileTokenStore implements TokenStore {
  constructor(private readonly path: string) {}

  load(): StoredTokens | null {
    try {
      if (!existsSync(this.path)) return null;
      const parsed = JSON.parse(readFileSync(this.path, "utf8")) as StoredTokens;
      if (!parsed.access_token || !parsed.refresh_token || !parsed.expires_at) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  save(tokens: StoredTokens): void {
    writeFileSync(this.path, JSON.stringify(tokens, null, 2), { mode: 0o600 });
  }

  clear(): void {
    if (existsSync(this.path)) rmSync(this.path);
  }
}

/** Store en memoria, útil para tests. */
export class MemoryTokenStore implements TokenStore {
  private tokens: StoredTokens | null = null;

  load(): StoredTokens | null {
    return this.tokens;
  }

  save(tokens: StoredTokens): void {
    this.tokens = tokens;
  }

  clear(): void {
    this.tokens = null;
  }
}
