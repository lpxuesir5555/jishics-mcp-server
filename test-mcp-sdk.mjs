import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const BASE = "http://43.139.7.89:3001";
const KEY = "your-production-key-here";

async function main() {
  console.log("=== MCP SDK Client Test ===\n");

  console.log("Step 1: Connecting via SSE...");
  const url = new URL(`${BASE}/mcp/v1`);
  const transport = new SSEClientTransport(url, {
    requestInit: {
      headers: { "X-API-Key": KEY },
    },
    eventSourceInit: {
      fetch: (url, init) => {
        return fetch(url, {
          ...init,
          headers: { ...init?.headers, "X-API-Key": KEY },
        });
      },
    },
  });

  const client = new Client({ name: "test-client", version: "1.0" });
  
  try {
    await client.connect(transport);
    console.log("Connected!\n");
  } catch (e) {
    console.error("Connect failed:", e.message);
    // 尝试用 StreamableHTTP
    console.log("\nTrying StreamableHTTP...");
    const { StreamableHTTPClientTransport } = await import("@modelcontextprotocol/sdk/client/streamableHttp.js");
    const transport2 = new StreamableHTTPClientTransport(new URL(`${BASE}/mcp/v2`), {
      requestInit: { headers: { "X-API-Key": KEY } },
    });
    const client2 = new Client({ name: "test-client", version: "1.0" });
    await client2.connect(transport2);
    console.log("Connected via StreamableHTTP!\n");
    
    const tools = await client2.listTools();
    console.log("Tools:", JSON.stringify(tools, null, 2).substring(0, 2000));
    
    const searchResult = await client2.callTool({
      name: "search_services",
      arguments: { city: "福州", service_type: "代理记账", sort_by: "rating", limit: 3 },
    });
    console.log("\nSearch result:", JSON.stringify(searchResult, null, 2).substring(0, 1000));
    
    await client2.close();
    process.exit(0);
  }

  // Step 2: List tools
  console.log("Step 2: tools/list");
  const tools = await client.listTools();
  console.log("Tools:", JSON.stringify(tools, null, 2).substring(0, 2000));

  // Step 3: search_services
  console.log("\nStep 3: search_services");
  const searchResult = await client.callTool({
    name: "search_services",
    arguments: { city: "福州", service_type: "代理记账", sort_by: "rating", limit: 3 },
  });
  console.log("Result:", JSON.stringify(searchResult, null, 2).substring(0, 1000));

  // Step 4: get_provider
  console.log("\nStep 4: get_provider (id=1)");
  const providerResult = await client.callTool({
    name: "get_provider",
    arguments: { provider_id: "1" },
  });
  console.log("Result:", JSON.stringify(providerResult, null, 2).substring(0, 800));

  console.log("\n=== ALL TESTS PASSED ===");
  await client.close();
  process.exit(0);
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
