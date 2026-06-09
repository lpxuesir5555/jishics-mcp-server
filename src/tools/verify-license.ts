import { api } from "../api/client.js";
import type { Provider } from "../api/types.js";
import { getCache, setCache } from "../utils/cache.js";
import { logger } from "../utils/logger.js";

const TRUST_LEVELS: Record<string, { label: string; min_score: number; desc: string }> = {
  diamond: { label: "钻石认证", min_score: 90, desc: "最高信任等级：已认证 + 钻石会员 + 已缴保证金 + 高评分" },
  gold:    { label: "金牌认证", min_score: 70, desc: "高信任等级：已认证 + 金/银会员 + 已缴保证金" },
  silver:  { label: "银牌认证", min_score: 50, desc: "中等信任等级：已认证 + 银/铜会员" },
  bronze:  { label: "铜牌认证", min_score: 30, desc: "基础信任等级：已认证" },
  basic:   { label: "未认证", min_score: 0,  desc: "该服务商尚未完成平台认证，建议谨慎选择" },
};

const MEMBERSHIP_LABELS: Record<string, string> = {
  diamond: "钻石", gold: "金牌", silver: "银牌", bronze: "铜牌", basic: "基础",
};

function calcTrustScore(p: Provider): number {
  // 未认证服务商信任分上限 29（低于 bronze 的 30 门槛）
  if (!p.isVerified) {
    return 0;
  }

  let score = 30; // 基础认证分
  const level = (p.membershipLevel || "").toLowerCase();
  if (level === "diamond") score += 30;
  else if (level === "gold") score += 20;
  else if (level === "silver") score += 15;
  else if (level === "bronze") score += 10;
  if (p.hasDeposit) score += 25;
  if ((p.rating || 0) >= 4) score += 15;
  else if ((p.rating || 0) >= 3) score += 10;
  return Math.min(score, 100);
}

function getTrustLevel(score: number): string {
  for (const key of ["diamond", "gold", "silver", "bronze", "basic"] as const) {
    if (score >= TRUST_LEVELS[key].min_score) return key;
  }
  return "basic";
}

export async function verifyLicense(input: { provider_id: string }) {
  const cacheKey = `verify-license:${input.provider_id}`;
  const cached = getCache<unknown>(cacheKey);
  if (cached) {
    return { content: [{ type: "text" as const, text: JSON.stringify(cached, null, 2) }] };
  }

  try {
    const provider = await api.get<Provider>(`/providers/${input.provider_id}`);

    // 防御：API 返回 null / undefined / 空对象
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

    const trustScore = calcTrustScore(provider);
    const trustLevel = getTrustLevel(trustScore);
    const level = (provider.membershipLevel || "basic").toLowerCase();

    const result = {
      provider_id: String(provider.id),
      provider_name: provider.companyName,
      verification: {
        is_verified: provider.isVerified || false,
        membership_level: level,
        membership_label: MEMBERSHIP_LABELS[level] || "基础",
        has_deposit: provider.hasDeposit || false,
        deposit_amount: provider.depositAmount || null,
        cert_count: provider.certImages?.length || 0,
        has_license: !!(provider.licenseImage),
        founded_year: provider.foundedYear || null,
        employee_count: provider.employeeCount || null,
      },
      trust: {
        score: trustScore,
        max_score: 100,
        level: trustLevel,
        label: TRUST_LEVELS[trustLevel]?.label || "未认证",
        description: TRUST_LEVELS[trustLevel]?.desc || "",
      },
      risk_flags: [] as string[],
      recommendation: "",
    };

    if (!provider.isVerified) {
      result.risk_flags.push("未完成平台实名认证");
      result.recommendation = "该服务商尚未完成认证，建议要求对方提供营业执照后再合作";
    } else {
      if (!provider.hasDeposit) {
        result.risk_flags.push("未缴纳服务保证金");
      }
      if ((provider.rating || 0) < 3 && provider.reviewCount && provider.reviewCount > 0) {
        result.risk_flags.push("客户评分较低");
      }

      if (trustScore >= 70) {
        result.recommendation = "该服务商信任等级较高，建议优先考虑";
      } else if (trustScore >= 50) {
        result.recommendation = "该服务商具备基础认证，可放心咨询";
      } else {
        result.recommendation = "该服务商已完成认证，建议核实具体服务内容";
      }
    }

    setCache(cacheKey, result, 10 * 60_000);
    return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    logger.error({ err, provider_id: input.provider_id }, "Failed to verify license");
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          error: true,
          error_code: "VERIFY_FAILED",
          message: "资质核验失败，请稍后重试",
          provider_id: input.provider_id,
        }, null, 2),
      }],
    };
  }
}
