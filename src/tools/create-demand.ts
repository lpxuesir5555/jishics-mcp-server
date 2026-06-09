import { api } from "../api/client.js";
import type { CreateDemandInput, CreateDemandResult } from "../api/types.js";
import { generateAccessSecret, isValidWebhookUrl } from "../utils/webhook.js";
import { checkRateLimit } from "../security/rate-limit.js";
import { logger } from "../utils/logger.js";
import { SERVICE_TYPES } from "../utils/service-types.js";

export async function createDemand(
  input: {
    service_type: string;
    city: string;
    description?: string;
    contact_name?: string;
    contact_phone?: string;
    budget_min?: number;
    budget_max?: number;
    callback_url?: string;
  }
) {
  // 校验 callback_url（SSRF 防护）
  if (input.callback_url && !isValidWebhookUrl(input.callback_url)) {
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          error: true,
          error_code: "INVALID_CALLBACK_URL",
          message: "callback_url 必须为有效的 HTTP(S) 公网地址",
        }),
      }],
    };
  }

  // 速率限制（按电话号码）
  const rateKey = `demand:${input.contact_phone || "anonymous"}`;
  const rate = checkRateLimit(rateKey, 10);
  if (!rate.allowed) {
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          error: true, error_code: "RATE_LIMITED", message: "操作过于频繁，请稍后再试",
          retry_after: Math.ceil((rate.resetAt - Date.now()) / 1000),
        }),
      }],
    };
  }

  // 生成 access_secret（外部 AI 后续查询报价的唯一凭证）
  const accessSecret = generateAccessSecret();

  const payload: CreateDemandInput = {
    title: generateTitle(input),
    city: input.city,
    source: "mcp",
    description: input.description || "",
    contact: input.contact_name || "",
    contactPhone: input.contact_phone || "",
    categoryName: input.service_type,
    accessSecret,
    callbackUrl: input.callback_url,
  };

  try {
    const result = await api.post<CreateDemandResult>("/open/demands", payload);
    logger.info({ demandId: result.id }, "Demand created via MCP");

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          demand_id: result.id,
          access_secret: accessSecret,
          status: "已发布",
          message: `您的${input.service_type}需求已发布！平台将为您匹配${input.city}地区优质服务商，预计30分钟内收到报价。`,
          website: `https://www.jishics.com/bidding/${result.id}`,
          note: "请在官网或小程序中查看服务商报价并确认签约",
        }),
      }],
    };
  } catch (err) {
    logger.error({ err }, "Failed to create demand");
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          error: true,
          error_code: "DEMAND_CREATE_FAILED",
          message: "需求发布失败，请稍后重试或直接在官网发布",
          website: "https://www.jishics.com/publish",
          supported_types: SERVICE_TYPES.join("、"),
        }),
      }],
    };
  }
}

function generateTitle(input: { city: string; service_type: string; description?: string }): string {
  const parts = [input.city, input.service_type];
  if (input.description) parts.push(input.description.substring(0, 30));
  return parts.filter(Boolean).join(" ");
}