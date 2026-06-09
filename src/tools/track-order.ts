import { api } from "../api/client.js";
import { logger } from "../utils/logger.js";

export async function trackOrder(
  input: { order_id: string }
) {
  // 优先尝试公开接口，如果失败再用内部接口
  try {
    // 尝试公开需求接口（无需认证）
    const demand = await api.get<Record<string, unknown>>(`/open/demands/${input.order_id}`);
    if (demand) {
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            id: demand.id,
            title: demand.title,
            status: demand.status,
            city: demand.city,
            bid_count: demand.bidCount || 0,
            created_at: demand.createdAt,
            website: `https://www.jishics.com/bidding/${demand.id}`,
            note: "查看详细报价请访问官网",
          }),
        }],
      };
    }
  } catch {
    // 公开接口不可用，尝试内部接口
    logger.debug({ order_id: input.order_id }, "Open demand API not available, trying internal");
  }

  try {
    const demand = await api.get<Record<string, unknown>>(`/demands/${input.order_id}`);
    if (demand) {
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            id: demand.id,
            title: demand.title,
            status: demand.status,
            city: demand.city,
            bid_count: demand.bidCount || 0,
            created_at: demand.createdAt,
            website: `https://www.jishics.com/bidding/${demand.id}`,
            note: "查看详细报价请访问官网",
          }),
        }],
      };
    }
  } catch {
    logger.debug({ order_id: input.order_id }, "Internal demand API also failed");
  }

  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({
        error: true, error_code: "ORDER_NOT_FOUND", message: "未找到该订单/需求",
        suggestion: "请确认订单ID是否正确，或在官网查看：https://www.jishics.com/dashboard",
        website: "https://www.jishics.com/dashboard",
      }),
    }],
  };
}
