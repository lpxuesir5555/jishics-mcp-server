import crypto from "node:crypto";

/**
 * 生成 access_secret：48 字符 hex（~186 bit 熵）
 * 用于外部 AI 后续查询需求报价的唯一凭证
 */
export function generateAccessSecret(): string {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomBytes(8).toString("hex");
}

/**
 * SSRF 防护：校验 webhook URL 合法性
 * 只允许公网 HTTP(S) 地址，阻止内网/本地地址
 */
export function isValidWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;

    const hostname = parsed.hostname.toLowerCase();

    // 展开 IPv4-mapped IPv6 地址（如 ::ffff:127.0.0.1 → 127.0.0.1）
    const ipv4Mapped = hostname.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
    const normalizedHostname = ipv4Mapped ? ipv4Mapped[1] : hostname;

    // 阻止本地地址
    if (["localhost", "127.0.0.1", "::1", "0.0.0.0"].includes(normalizedHostname)) return false;

    // 阻止 IPv4 私有网段
    if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.)/.test(normalizedHostname)) return false;

    // 阻止 IPv6 私有地址
    if (/^(::1|fe80:|fc00:|fd00:)/i.test(hostname)) return false;

    return true;
  } catch {
    return false;
  }
}