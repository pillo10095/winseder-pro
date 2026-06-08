/**
 * Mock for @builderbot/provider-baileys.
 *
 * The real package bundles ESM-only baileys in its CJS bundle,
 * which Jest cannot parse. This mock provides the exports needed
 * by our application in a Jest-compatible way.
 */

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class MemoryLidCache {
  private readonly store = new Map<string, string>();

  constructor(private readonly ttlSeconds = 86400 * 30) {}

  async get(lid: string): Promise<string | null> {
    return this.store.get(this.normalize(lid)) ?? null;
  }

  async set(lid: string, pn: string): Promise<void> {
    this.store.set(this.normalize(lid), this.normalizePn(pn));
  }

  async has(lid: string): Promise<boolean> {
    return this.store.has(this.normalize(lid));
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  close(): void {
    this.store.clear();
  }

  private normalize(lid: string): string {
    return lid.replace(/:\d+@lid$/, '@lid');
  }

  private normalizePn(pn: string): string {
    const digits = pn.replace(/\D/g, '');
    return `${digits}@s.whatsapp.net`;
  }
}

export interface LidCache {
  get(lid: string): Promise<string | null>;
  set(lid: string, pn: string): Promise<void>;
  has(lid: string): Promise<boolean>;
  clear(): Promise<void>;
  close?(): void;
}

export function createLidCache(): MemoryLidCache {
  return new MemoryLidCache();
}

export async function extractAndCacheLidFromMessage(
  cache: LidCache,
  _messageCtx: unknown,
): Promise<void> {
  // No-op mock — in tests we don't process real WhatsApp messages
  void cache;
}

export function normalizeLid(lid: string): string {
  return lid.replace(/:\d+@lid$/, '@lid');
}
