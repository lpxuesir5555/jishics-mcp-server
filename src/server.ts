import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { searchServices } from "./tools/search-services.js";
import { getProvider } from "./tools/get-provider.js";
import { getReviews } from "./tools/get-reviews.js";
import { createDemand } from "./tools/create-demand.js";
import { trackOrder } from "./tools/track-order.js";
import { getMatchScore } from "./tools/match-score.js";
import { verifyLicense } from "./tools/verify-license.js";
import { getCategoriesResource } from "./resources/categories.js";
import { getMarketDataResource } from "./resources/market-data.js";
import { logger } from "./utils/logger.js";
import { SERVICE_TYPES } from "./utils/service-types.js";

const serviceTypeDesc = `服务类型，可选值：${SERVICE_TYPES.join("、")}`;

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "jishics-mcp-server",
    version: "1.2.1",
  });

  // ==================== Tools ====================

  // Tool 1: 搜索服务商
  server.tool(
    "search_services",
    "搜索即时财税平台上的企业服务商。支持按城市、服务类型筛选。返回服务商列表含名称、评分、成交量、AI评分。适用场景：用户想找代理记账、公司注册、商标注册等服务。",
    {
      city: z.string().describe("城市名称，如：福州、厦门、广州"),
      service_type: z.string().describe(serviceTypeDesc),
      sub_type: z.string().optional().describe("子类型，如：小规模纳税人、一般纳税人、零申报"),
      price_max: z.number().optional().describe("最高价格（元/月或元/次）"),
      sort_by: z.enum(["rating", "price_asc", "price_desc", "orders"]).default("rating").describe("排序方式"),
      limit: z.number().default(10).describe("返回数量"),
    },
    async (args) => {
      logger.info({ tool: "search_services", city: args.city, service_type: args.service_type }, "Tool called");
      return searchServices(args);
    }
  );

  // Tool 2: 获取服务商详情
  server.tool(
    "get_provider",
    "获取某个服务商的详细信息，包括公司介绍、资质、所有服务及价格、评分、成交量、AI评分。",
    {
      provider_id: z.string().describe("服务商ID"),
    },
    async (args) => {
      logger.info({ tool: "get_provider", provider_id: args.provider_id }, "Tool called");
      return getProvider(args);
    }
  );

  // Tool 3: 获取评价
  server.tool(
    "get_reviews",
    "获取某个服务商的客户评价列表，含评分、评价内容、服务类型。",
    {
      provider_id: z.string().describe("服务商ID"),
      limit: z.number().default(10).describe("返回数量"),
    },
    async (args) => {
      logger.info({ tool: "get_reviews", provider_id: args.provider_id }, "Tool called");
      return getReviews(args);
    }
  );

  // Tool 4: 发布需求
  server.tool(
    "create_demand",
    "在即时财税平台发布服务需求。提交后平台将为您匹配服务商，服务商将在30分钟内报价。注意：需要提供联系电话。",
    {
      service_type: z.string().describe(serviceTypeDesc),
      city: z.string().describe("所在城市，如：福州"),
      description: z.string().optional().describe("需求详细描述"),
      contact_name: z.string().optional().describe("联系人姓名"),
      contact_phone: z.string().optional().describe("联系电话"),
      budget_min: z.number().optional().describe("预算下限（元）"),
      budget_max: z.number().optional().describe("预算上限（元）"),
      callback_url: z.string().max(500).optional().describe("外部AI的webhook回调地址（最长500字符），有报价时POST通知"),
    },
    async (args) => {
      logger.info({ tool: "create_demand", service_type: args.service_type, city: args.city }, "Tool called");
      return createDemand(args);
    }
  );

  // Tool 5: 查询订单状态
  server.tool(
    "track_order",
    "查询在即时财税平台上的订单或需求状态。",
    {
      order_id: z.string().describe("订单ID或需求ID"),
    },
    async (args) => {
      logger.info({ tool: "track_order", order_id: args.order_id }, "Tool called");
      return trackOrder(args);
    }
  );

  // Tool 6: AI 4 维评分详情
  server.tool(
    "match_score",
    "获取某个服务商的 AI 4 维评分详情：综合评分、行业匹配度、地域匹配度、能力评分。每项含分数、满分、含义解释、数据来源说明。所有评分由 AI 引擎基于真实经营数据实时计算。",
    {
      provider_id: z.string().describe("服务商ID"),
    },
    async (args) => {
      logger.info({ tool: "match_score", provider_id: args.provider_id }, "Tool called");
      return getMatchScore(args);
    }
  );

  // Tool 7: 资质核验
  server.tool(
    "verify_license",
    "核验服务商的资质和信任度。返回认证状态、会员等级、保证金缴纳、证书数量、综合信任评分（0-100）及风险提示。帮助判断服务商可靠性，降低合作风险。",
    {
      provider_id: z.string().describe("服务商ID"),
    },
    async (args) => {
      logger.info({ tool: "verify_license", provider_id: args.provider_id }, "Tool called");
      return verifyLicense(args);
    }
  );

  // ==================== Resources ====================

  // Resource 1: 服务分类目录
  server.resource(
    "services-catalog",
    "jishics://services/catalog",
    { description: "即时财税平台所有服务类型、子类型及说明", mimeType: "application/json" },
    async () => getCategoriesResource()
  );

  // Resource 2: 市场价格参考
  server.resource(
    "market-pricing",
    "jishics://market/pricing",
    { description: "各城市各服务类型的市场价格区间", mimeType: "application/json" },
    async () => getMarketDataResource()
  );

  logger.info("MCP Server initialized with 7 tools and 2 resources");
  return server;
}
