import type { Provider, Review } from "../api/types.js";
import { parseServiceTypes } from "../utils/service-types.js";

// 脱敏：移除敏感信息，输出 snake_case 给 AI 使用
export function filterProvider(p: Provider): Record<string, unknown> {
  return {
    provider_id: String(p.id),
    name: p.companyName,
    city: p.city,
    description: p.description || "",
    service_types: parseServiceTypes(p.serviceTypes),
    rating: p.rating || 0,
    order_count: p.orderCount || 0,
    review_count: p.reviewCount || 0,
    success_rate: p.successRate || 0,
    is_verified: p.isVerified || false,
    membership_level: p.membershipLevel || "basic",
    has_deposit: p.hasDeposit || false,
    ai_scores: {
      overall: p.aiMatchScoreOverall ?? null,
      industry: p.aiMatchScoreIndustry ?? null,
      region: p.aiMatchScoreRegion ?? null,
      capability: p.aiMatchScoreCapability ?? null,
    },
    // 不返回：电话、微信、详细地址、银行账号
  };
}

export function filterReview(r: Review): Record<string, unknown> {
  return {
    rating: r.rating,
    content: r.content,
    service_type: r.serviceType || "",
    user_name: maskName(r.userName),
    date: r.createdAt?.substring(0, 10) || "",
  };
}

function maskName(name?: string): string {
  if (!name) return "匿名用户";
  if (name.length <= 1) return "*";
  return name[0] + "*".repeat(name.length - 1);
}
