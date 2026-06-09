import { api } from "../api/client.js";
import type { Provider } from "../api/types.js";
import { filterProvider } from "../security/data-filter.js";
import { getCache, setCache } from "../utils/cache.js";
import { logger } from "../utils/logger.js";

export async function getProvider(
  input: { provider_id: string }
) {
  const cacheKey = `provider:${input.provider_id}`;
  const cached = getCache<unknown>(cacheKey);
  if (cached) {
    return { content: [{ type: "text" as const, text: JSON.stringify(cached) }] };
  }

  try {
    const provider = await api.get<Provider>(`/providers/${input.provider_id}`);

    if (!provider) {
      return { content: [{ type: "text" as const, text: JSON.stringify({ error: true, error_code: "PROVIDER_NOT_FOUND", message: "服务商不存在" }) }] };
    }

    const result = filterProvider(provider);
    setCache(cacheKey, result, 5 * 60_000);
    return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    logger.error({ err, provider_id: input.provider_id }, "Failed to get provider");
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          error: true, error_code: "PROVIDER_FETCH_FAILED", message: "获取服务商详情失败，请稍后重试",
          provider_id: input.provider_id,
          website: `https://www.jishics.com/provider/${input.provider_id}`,
        }),
      }],
    };
  }
}
