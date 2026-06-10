import crypto from "node:crypto";

/**
 * 生成 access_secret：48 字符 hex（~186 bit 熵）
 * 用于外部 AI 后续查询需求报价的唯一凭证
 */
export function generateAccessSecret(): string {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomBytes(8).toString("hex");
}

/** 判断 IPv4 地址是否为私有/本地地址 */
function isPrivateIPv4(ip: string): boolean {
  if (["127.0.0.1", "0.0.0.0"].includes(ip)) return true;
  if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.)/.test(ip)) return true;
  return false;
}

/** 判断 hostname 是否为私有/本地地址 */
function isPrivateHostname(hostname: string): boolean {
  if (["localhost", "127.0.0.1", "::1", "0.0.0.0"].includes(hostname)) return true;
  if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.)/.test(hostname)) return true;
  if (/^(::1|fe80:|fc00:|fd00:)/i.test(hostname)) return true;
  return false;
}

/**
 * SSRF 防护：校验 webhook URL 合法性
 * 只允许公网 HTTP(S) 地址，阻止内网/本地地址
 *
 * 注意：Node.js URL 类会将 [::ffff:10.0.0.1] 转为 hex 格式 [::ffff:a00:1]，
 * 导致 IPv4 段丢失。因此在 URL 解析前先对原始字符串做 IPv4-mapped 预检。
 */
export function isValidWebhookUrl(url: string): boolean {
  // 预检：原始字符串中的 IPv4-mapped IPv6 模式
  // Node.js URL 会将其转 hex（如 10.0.0.1 → a00:1），所以必须提前提取 IPv4 部分
  const rawMapped = url.match(/::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/i);
  if (rawMapped && isPrivateIPv4(rawMapped[1])) return false;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;

    const hostname = parsed.hostname.toLowerCase();

    // 展开 Node.js 可能保留的 IPv4-mapped IPv6（某些版本不转 hex）
    const ipv4Mapped = hostname.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
    const normalized = ipv4Mapped ? ipv4Mapped[1] : hostname;

    return !isPrivateHostname(normalized);
  } catch {
    return false;
  }
}