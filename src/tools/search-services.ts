import { api } from "../api/client.js";
import type { Provider } from "../api/types.js";
import { filterProvider } from "../security/data-filter.js";
import { getCache, setCache } from "../utils/cache.js";
import { logger } from "../utils/logger.js";
import { matchServiceType, parseServiceTypes, SERVICE_TYPES } from "../utils/service-types.js";

export async function searchServices(
  input: { city: string; service_type: string; sub_type?: string; price_max?: number; sort_by: string; limit: number }
) {
  const cacheKey = `search:${input.city}:${input.service_type}:${input.sub_type || ""}:${input.sort_by}`;
  const cached = getCache<unknown>(cacheKey);
  if (cached) {
    logger.debug("cache hit for search");
    return { content: [{ type: "text" as const, text: JSON.stringify(cached) }] };
  }

  let path = `/providers?city=${encodeURIComponent(input.city)}&pageSize=50`;
  let providers: Provider[];

  try {
    providers = await api.get<Provider[]>(path);
  } catch (err) {
    logger.error({ err }, "Failed to fetch providers");
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          error: true, error_code: "SEARCH_FAILED", message: "查询服务商失败，请稍后重试",
          website: "https://www.jishics.com/providers",
        }),
      }],
    };
  }

  // 用精确匹配过滤服务类型
  let filtered = providers.filter((p) => {
    const types = parseServiceTypes(p.serviceTypes);
    return matchServiceType(types, input.service_type);
  });

  // 子类型过滤
  if (input.sub_type) {
    filtered = filtered.filter((p) => {
      const types = parseServiceTypes(p.serviceTypes);
      return types.some((t) => t.includes(input.sub_type!));
    });
  }

  // 排序
  switch (input.sort_by) {
    case "rating":
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      break;
    case "orders":
      filtered.sort((a, b) => (b.orderCount || 0) - (a.orderCount || 0));
      break;
    case "price_asc":
    case "price_desc":
      // 暂无价格字段，按评分排序并标注
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      break;
  }

  const result = filtered.slice(0, input.limit).map(filterProvider);

  const output: Record<string, unknown> = {
    total: filtered.length,
    providers: result,
    search_params: {
      city: input.city,
      service_type: input.service_type,
      sub_type: input.sub_type || null,
      sort_by: input.sort_by,
    },
  };

  if ((input.sort_by === "price_asc" || input.sort_by === "price_desc") && result.length > 0) {
    output.sort_note = "当前按评分排序（价格数据暂未上线，可联系服务商获取报价）";
  }

  if (result.length === 0) {
    output.note = "未找到匹配的服务商，建议：1) 尝试其他城市 2) 放宽筛选条件 3) 直接在官网发布需求";
    output.suggestion = "支持的服务类型：" + SERVICE_TYPES.join("、");
    output.website = "https://www.jishics.com/publish";
  }

  setCache(cacheKey, output, 5 * 60_000);
  return { content: [{ type: "text" as const, text: JSON.stringify(output, null, 2) }] };
}
