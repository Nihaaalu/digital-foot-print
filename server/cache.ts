/**
 * In-memory TTL Cache for OSINT Lookups
 * Minimizes redundant external requests and respects API rate limits.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class OSINTCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 15 * 60 * 1000; // 15 minutes default

  get<T>(key: string): { data: T; timestamp: number; cached: boolean } | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return {
      data: entry.data as T,
      timestamp: entry.timestamp,
      cached: true,
    };
  }

  set<T>(key: string, data: T, ttlMs?: number): void {
    const ttl = ttlMs ?? this.defaultTTL;
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl,
    });

    // Simple cache cleanup if size grows large
    if (this.cache.size > 2000) {
      const nowTime = Date.now();
      for (const [k, v] of this.cache.entries()) {
        if (v.expiresAt < nowTime) {
          this.cache.delete(k);
        }
      }
    }
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

export const osintCache = new OSINTCache();
