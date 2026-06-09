const store = new Map<string, { data: unknown; expires: number }>();

export function getCache<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expires) {
    store.delete(key);
    return undefined;
  }
  return entry.data as T;
}

export function setCache(key: string, data: unknown, ttlMs: number): void {
  store.set(key, { data, expires: Date.now() + ttlMs });
}

// 定期清理过期缓存
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.expires) store.delete(key);
  }
}, 60_000).unref();
