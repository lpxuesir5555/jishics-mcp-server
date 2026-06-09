const counters = new Map<string, { count: number; resetAt: number }>();

// 最多存储 10000 个不同的 key，防止内存耗尽攻击
const MAX_ENTRIES = 10_000;

export function checkRateLimit(
  key: string,
  maxPerMinute: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const minuteMs = 60_000;

  // 防止内存耗尽：如果条目太多，清理旧条目
  if (counters.size >= MAX_ENTRIES) {
    for (const [k, entry] of counters) {
      if (now > entry.resetAt) counters.delete(k);
    }
    // 如果清理后仍然太多，拒绝新 key
    if (counters.size >= MAX_ENTRIES) {
      return { allowed: false, remaining: 0, resetAt: now + minuteMs };
    }
  }

  let entry = counters.get(key);

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + minuteMs };
    counters.set(key, entry);
  }

  entry.count++;
  const remaining = Math.max(0, maxPerMinute - entry.count);

  return {
    allowed: entry.count <= maxPerMinute,
    remaining,
    resetAt: entry.resetAt,
  };
}

// 清理过期计数器（每 30 秒）
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of counters) {
    if (now > entry.resetAt) counters.delete(key);
  }
}, 30_000).unref();
