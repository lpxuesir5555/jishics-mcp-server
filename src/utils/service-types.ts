/**
 * 服务类型常量与工具函数
 * 统一管理，避免硬编码分散在各处
 */

// 平台支持的所有一级服务类型
export const SERVICE_TYPES = [
  "代理记账",
  "开办公司",
  "建筑资质",
  "许可证代理",
  "商标/软著",
  "异常/疑难",
  "业务咨询",
  "企业年报",
] as const;

export type ServiceType = (typeof SERVICE_TYPES)[number];

// 常见子类型
export const SUB_TYPES: Record<string, string[]> = {
  "代理记账": ["小规模纳税人", "一般纳税人", "零申报"],
  "开办公司": ["有限责任公司", "个体工商户", "合伙企业", "股份有限公司"],
  "商标/软著": ["国内商标", "国际商标", "软件著作权"],
  "建筑资质": ["新办", "升级", "延期", "增项"],
};

/**
 * 解析服务商的服务类型字段（可能是 JSON 字符串或普通字符串）
 */
export function parseServiceTypes(json?: string): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) return parsed;
    return [String(parsed)];
  } catch {
    return [json];
  }
}

/**
 * 精确匹配服务类型
 * 优先精确匹配，再用关键词权重匹配
 */
export function matchServiceType(
  providerTypes: string[],
  queryType: string
): boolean {
  // 1. 精确包含匹配（双向）
  for (const t of providerTypes) {
    if (t === queryType || queryType === t) return true;
  }

  // 2. 关键词匹配 —— 将 "代理记账·小规模" 拆分为 ["代理记账", "小规模"]
  for (const t of providerTypes) {
    const parts = t.split(/[·/、\s]+/).filter(Boolean);
    if (parts.includes(queryType)) return true;
    if (parts.some((p) => p === queryType)) return true;
  }

  // 3. 宽松匹配 —— queryType 是 providerTypes 中某个元素的前缀
  // 例如 queryType="代理记账" 匹配 "代理记账·小规模"
  for (const t of providerTypes) {
    if (t.startsWith(queryType) || queryType.startsWith(t)) return true;
  }

  return false;
}
