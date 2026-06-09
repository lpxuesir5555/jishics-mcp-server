import { api } from "../api/client.js";
import type { Provider } from "../api/types.js";
import { getCache, setCache } from "../utils/cache.js";
import { logger } from "../utils/logger.js";

const SCORE_EXPLANATIONS: Record<string, { label: string; desc: string }> = {
  overall: {
    label: "综合评分",
    desc: "基于行业匹配度、地域匹配度、能力评分的加权综合，反映服务商的整体竞争力"
  },
  industry: {
    label: "行业匹配度",
    desc: "服务商的服务类型与您需求的匹配程度，值越高说明该服务商越擅长您需要的服务"
  },
  region: {
    label: "地域匹配度",
    desc: "服务商所在城市与您需求城市的匹配程度，同城服务商得分更高"
  },
  capability: {
    label: "能力评分",
    desc: "基于客户评价、历史成交量、资质认证、保证金缴纳等经营数据的综合能力评估"
  },
};

export async function getMatchScore(input: { provider_id: string }) {
  const cacheKey = `match-score:${input.provider_id}`;
  const cached = getCache<unknown>(cacheKey);
  if (cached) {
    return { content: [{ type: "text" as const, text: JSON.stringify(cached, null, 2) }] };
  }

  try {
    const provider = await api.get<Provider>(`/providers/${input.provider_id}`);

    // 防御：API 返回 null / undefined / 空对象（无 id 字段）
    if (!provider || !provider.id) {
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            error: true,
            error_code: "PROVIDER_NOT_FOUND",
            message: "服务商不存在",
            provider_id: input.provider_id,
          }, null, 2),
        }],
      };
    }

    const scores = {
      overall: provider.aiMatchScoreOverall ?? null,
      industry: provider.aiMatchScoreIndustry ?? null,
      region: provider.aiMatchScoreRegion ?? null,
      capability: provider.aiMatchScoreCapability ?? null,
    };

    const dimensions = Object.entries(scores).map(([key, value]) => ({
      dimension: key,
      label: SCORE_EXPLANATIONS[key]?.label || key,
      score: value,
      max_score: 100,
      description: SCORE_EXPLANATIONS[key]?.desc || "",
    }));

    const result = {
      provider_id: String(provider.id),
      provider_name: provider.companyName || "未知",
      city: provider.city || "未知",
      scores: dimensions,
      summary: {
        has_full_scores: Object.values(scores).every((s) => s !== null),
        overall_rating: scores.overall !== null ? `${scores.overall}/100` : "暂未评分",
      },
      meta: {
        note: "所有评分由 AI 引擎基于真实经营数据实时计算，动态更新",
        data_sources: ["客户评价", "历史成交量", "资质认证", "保证金缴纳", "服务类型匹配"],
      },
    };

    setCache(cacheKey, result, 10 * 60_000);
    return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    logger.error({ err, provider_id: input.provider_id }, "Failed to get match score");
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          error: true,
          error_code: "SCORE_FETCH_FAILED",
          message: "获取 AI 评分失败，请稍后重试",
          provider_id: input.provider_id,
        }, null, 2),
      }],
    };
  }
}
