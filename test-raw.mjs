import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const BASE = "http://43.139.7.89:3001";
const KEY = "your-production-key-here";

async function main() {
  const transport = new StreamableHTTPClientTransport(new URL(`${BASE}/mcp/v2`), {
    requestInit: { headers: { "X-API-Key": KEY } },
  });
  const client = new Client({ name: "test", version: "1.0" });
  await client.connect(transport);

  console.log("=== search_services 原始返回 ===");
  const r1 = await client.callTool({ name: "search_services", arguments: { city: "福州", service_type: "代理记账", limit: 2 } });
  console.log(JSON.stringify(r1, null, 2).substring(0, 2000));

  console.log("\n=== get_provider 原始返回 ===");
  const r2 = await client.callTool({ name: "get_provider", arguments: { provider_id: "1" } });
  console.log(JSON.stringify(r2, null, 2).substring(0, 2000));

  console.log("\n=== get_reviews 原始返回 ===");
  const r3 = await client.callTool({ name: "get_reviews", arguments: { provider_id: "1", limit: 2 } });
  console.log(JSON.stringify(r3, null, 2).substring(0, 1000));

  console.log("\n=== create_demand 原始返回 ===");
  const r4 = await client.callTool({ name: "create_demand", arguments: { service_type: "代理记账", city: "福州", contact_phone: "13800000000" } });
  console.log(JSON.stringify(r4, null, 2).substring(0, 1000));

  console.log("\n=== track_order 原始返回 ===");
  const r5 = await client.callTool({ name: "track_order", arguments: { order_id: "1" } });
  console.log(JSON.stringify(r5, null, 2).substring(0, 1000));

  await client.close();
  process.exit(0);
}
main().catch(e => { console.error(e.message); process.exit(1); });
