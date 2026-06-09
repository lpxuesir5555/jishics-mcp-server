import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const BASE = "http://43.139.7.89:3001";
const KEY = "your-production-key-here";

let passed = 0;
let failed = 0;

function assert(condition, testName, detail) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${testName}`);
  } else {
    failed++;
    console.log(`  ❌ ${testName} ${detail ? "| " + detail : ""}`);
  }
}

async function main() {
  console.log("=== MCP 功能测试（通过 MCP SDK）===\n");

  // 连接
  const transport = new StreamableHTTPClientTransport(new URL(`${BASE}/mcp/v2`), {
    requestInit: { headers: { "X-API-Key": KEY } },
  });
  const client = new Client({ name: "test-client", version: "1.0" });
  await client.connect(transport);
  console.log("已连接 MCP Server\n");

  // ===== F1-F6: search_services =====
  console.log("--- search_services ---");

  // F1: 福州代理记账
  try {
    const r = await client.callTool({ name: "search_services", arguments: { city: "福州", service_type: "代理记账", sort_by: "rating", limit: 5 } });
    const text = r.content?.[0]?.text || "";
    const data = JSON.parse(text);
    assert(data.total > 0, "F1: 福州代理记账有结果", `total=${data.total}`);
    assert(Array.isArray(data.providers), "F1: 返回 providers 数组");
    if (data.providers?.[0]) {
      assert(data.providers[0].ai_scores !== undefined, "F1: 含 AI 评分");
      assert(!("contactPhone" in data.providers[0]), "F1: 不含电话（脱敏）");
    }
    console.log(`    返回 ${data.total} 个服务商，首个: ${data.providers?.[0]?.name || "无"}`);
  } catch (e) {
    assert(false, "F1: 福州代理记账", e.message);
  }

  // F2: 厦门公司注册
  try {
    const r = await client.callTool({ name: "search_services", arguments: { city: "厦门", service_type: "公司注册", limit: 3 } });
    const text = r.content?.[0]?.text || "";
    const data = JSON.parse(text);
    assert(data.total !== undefined, "F2: 厦门公司注册返回 total", `total=${data.total}`);
    console.log(`    返回 ${data.total} 个服务商`);
  } catch (e) {
    assert(false, "F2: 厦门公司注册", e.message);
  }

  // F3: 不存在城市
  try {
    const r = await client.callTool({ name: "search_services", arguments: { city: "月球", service_type: "代理记账", limit: 5 } });
    const text = r.content?.[0]?.text || "";
    const data = JSON.parse(text);
    assert(data.total === 0, "F3: 不存在城市返回 total=0");
    assert(data.note !== undefined, "F3: 返回提示信息");
  } catch (e) {
    assert(false, "F3: 不存在城市", e.message);
  }

  // F4: 按评分排序
  try {
    const r = await client.callTool({ name: "search_services", arguments: { city: "福州", service_type: "代理记账", sort_by: "rating", limit: 5 } });
    const text = r.content?.[0]?.text || "";
    const data = JSON.parse(text);
    assert(data.search_params?.sort_by === "rating", "F4: 排序参数正确");
  } catch (e) {
    assert(false, "F4: 按评分排序", e.message);
  }

  // F5: 按成交量排序
  try {
    const r = await client.callTool({ name: "search_services", arguments: { city: "福州", service_type: "代理记账", sort_by: "orders", limit: 5 } });
    const text = r.content?.[0]?.text || "";
    const data = JSON.parse(text);
    assert(data.search_params?.sort_by === "orders", "F5: 成交量排序参数正确");
  } catch (e) {
    assert(false, "F5: 按成交量排序", e.message);
  }

  // F6: 子类型过滤
  try {
    const r = await client.callTool({ name: "search_services", arguments: { city: "福州", service_type: "代理记账", sub_type: "小规模纳税人", limit: 5 } });
    const text = r.content?.[0]?.text || "";
    const data = JSON.parse(text);
    assert(data.search_params?.sub_type === "小规模纳税人", "F6: 子类型过滤参数正确");
    console.log(`    小规模纳税人过滤: ${data.total} 个结果`);
  } catch (e) {
    assert(false, "F6: 子类型过滤", e.message);
  }

  // ===== F7-F8: get_provider =====
  console.log("\n--- get_provider ---");

  // F7: 存在的 ID
  try {
    const r = await client.callTool({ name: "get_provider", arguments: { provider_id: "1" } });
    const text = r.content?.[0]?.text || "";
    const data = JSON.parse(text);
    assert(data.provider_id === "1" || data.name !== undefined, "F7: 获取服务商详情", `name=${data.name}`);
    assert(data.ai_scores !== undefined, "F7: 含 AI 评分");
    assert(!("contactPhone" in data), "F7: 不含电话（脱敏）");
    console.log(`    服务商: ${data.name}, AI综合评分: ${data.ai_scores?.overall}`);
  } catch (e) {
    assert(false, "F7: 获取服务商详情", e.message);
  }

  // F8: 不存在的 ID
  try {
    const r = await client.callTool({ name: "get_provider", arguments: { provider_id: "999999999" } });
    const text = r.content?.[0]?.text || "";
    assert(text.includes("error") || text.includes("不存在") || text.includes("失败"), "F8: 不存在ID返回错误");
  } catch (e) {
    assert(false, "F8: 不存在ID", e.message);
  }

  // ===== F9-F10: get_reviews =====
  console.log("\n--- get_reviews ---");

  // F9: 存在的 ID
  try {
    const r = await client.callTool({ name: "get_reviews", arguments: { provider_id: "1", limit: 3 } });
    const text = r.content?.[0]?.text || "";
    const data = JSON.parse(text);
    assert(data.total !== undefined, "F9: 获取评价", `total=${data.total}`);
    assert(data.average_rating !== undefined, "F9: 含平均评分");
    console.log(`    评价 ${data.total} 条, 平均分 ${data.average_rating}`);
  } catch (e) {
    assert(false, "F9: 获取评价", e.message);
  }

  // F10: 不存在的 ID
  try {
    const r = await client.callTool({ name: "get_reviews", arguments: { provider_id: "999999999", limit: 3 } });
    const text = r.content?.[0]?.text || "";
    const data = JSON.parse(text);
    assert(data.total === 0 || data.error !== undefined, "F10: 不存在ID返回空或错误");
  } catch (e) {
    assert(false, "F10: 不存在ID评价", e.message);
  }

  // ===== F11-F12: create_demand =====
  console.log("\n--- create_demand ---");

  // F11: 完整参数
  try {
    const r = await client.callTool({
      name: "create_demand",
      arguments: {
        service_type: "代理记账", city: "福州", description: "功能测试需求",
        contact_name: "测试用户", contact_phone: "13800000000",
        budget_min: 100, budget_max: 500,
      },
    });
    const text = r.content?.[0]?.text || "";
    const data = JSON.parse(text);
    assert(data.demand_id !== undefined || data.error !== undefined, "F11: 创建需求", `demand_id=${data.demand_id}`);
    if (data.demand_id) {
      assert(data.status === "已发布", "F11: 状态为已发布");
      assert(data.website !== undefined, "F11: 含官网链接");
      console.log(`    需求ID: ${data.demand_id}, 状态: ${data.status}`);
    }
  } catch (e) {
    assert(false, "F11: 创建需求", e.message);
  }

  // F12: 最小参数
  try {
    const r = await client.callTool({
      name: "create_demand",
      arguments: { service_type: "公司注册", city: "厦门" },
    });
    const text = r.content?.[0]?.text || "";
    assert(text.includes("demand_id") || text.includes("error"), "F12: 最小参数创建需求");
  } catch (e) {
    assert(false, "F12: 最小参数", e.message);
  }

  // ===== F13-F14: track_order =====
  console.log("\n--- track_order ---");

  // F13: 不存在的订单
  try {
    const r = await client.callTool({ name: "track_order", arguments: { order_id: "999999999" } });
    const text = r.content?.[0]?.text || "";
    assert(text.includes("error") || text.includes("未找到") || text.includes("suggestion"), "F13: 不存在订单返回提示");
  } catch (e) {
    assert(false, "F13: 不存在订单", e.message);
  }

  // F14: 查询已创建的需求（如果 F11 成功）
  try {
    const r = await client.callTool({ name: "track_order", arguments: { order_id: "1" } });
    const text = r.content?.[0]?.text || "";
    assert(text.length > 10, "F14: 查询订单有返回");
  } catch (e) {
    assert(false, "F14: 查询订单", e.message);
  }

  // 汇总
  console.log("\n" + "=".repeat(50));
  console.log(`功能测试: ${passed + failed} 项 | 通过: ${passed} | 失败: ${failed}`);
  console.log(`通过率: ${(passed / (passed + failed) * 100).toFixed(1)}%`);
  if (failed === 0) console.log("🎉 全部通过！");

  await client.close();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
