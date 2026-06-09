import { api } from "../api/client.js";
import type { Review } from "../api/types.js";
import { filterReview } from "../security/data-filter.js";
import { getCache, setCache } from "../utils/cache.js";
import { logger } from "../utils/logger.js";

export async function getReviews(
  input: { provider_id: string; limit: number }
) {
  const cacheKey = `reviews:${input.provider_id}:${input.limit}`;
  const cached = getCache<unknown>(cacheKey);
  if (cached) {
    return { content: [{ type: "text" as const, text: JSON.stringify(cached) }] };
  }

  try {
    const reviews = await api.get<Review[]>(`/providers/${input.provider_id}/reviews`);
    const list = (Array.isArray(reviews) ? reviews : []).slice(0, input.limit).map(filterReview);

    const avgRating = list.length > 0
      ? +(list.reduce((s, r) => s + ((r.rating as number) || 0), 0) / list.length).toFixed(1)
      : 0;

    const result = { total: list.length, average_rating: avgRating, reviews: list };
    setCache(cacheKey, result, 10 * 60_000);
    return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    logger.error({ err, provider_id: input.provider_id }, "Failed to get reviews");
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          error: true, error_code: "REVIEWS_FETCH_FAILED", message: "获取评价失败，请稍后重试",
          provider_id: input.provider_id,
        }),
      }],
    };
  }
}
