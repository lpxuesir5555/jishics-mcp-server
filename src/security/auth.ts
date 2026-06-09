import { config } from "../utils/config.js";

/**
 * 常量时间比较，防止 timing attack
 */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function validateApiKey(apiKey: string | undefined): boolean {
  // 如果没有配置任何 Key，则不需要认证（开发模式）
  if (config.apiKeys.length === 0) return true;
  if (!apiKey) return false;

  // 防止 CRLF 注入：Key 中不应包含换行符
  if (/[\r\n]/.test(apiKey)) return false;

  // 常量时间比较，防止 timing attack
  return config.apiKeys.some((key) => safeCompare(apiKey, key));
}

export function extractApiKey(headers: Record<string, string | undefined>): string | undefined {
  const fromHeader = headers["x-api-key"];
  if (fromHeader) return fromHeader;

  const auth = headers["authorization"];
  if (auth && auth.startsWith("Bearer ")) {
    return auth.slice(7); // "Bearer ".length = 7
  }

  return undefined;
}
