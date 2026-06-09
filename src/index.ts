import express from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "./server.js";
import { config } from "./utils/config.js";
import { logger } from "./utils/logger.js";
import { validateApiKey, extractApiKey } from "./security/auth.js";
import { randomUUID } from "node:crypto";

// ==================== 全局错误处理 ====================
// 防止未捕获的异常导致进程退出
process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception (keeping alive)");
});

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled rejection (keeping alive)");
});
const app = express();

// 强制 Content-Type 为 UTF-8（解决中文编码问题）
app.use((req, res, next) => {
  if (req.headers["content-type"] && !req.headers["content-type"].includes("charset")) {
    req.headers["content-type"] = req.headers["content-type"] + "; charset=utf-8";
  }
  next();
});

// 请求体大小限制（1MB），防止 DoS
app.use(express.json({ limit: "1mb" }));

// CORS 限制 — 只允许同源和 MCP 客户端
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Cache-Control", "no-store");
  next();
});

// SSE 心跳间隔（30秒）
const HEARTBEAT_INTERVAL_MS = 30_000;

// ==================== 健康检查（不需要认证）====================
app.get("/health", (_req, res) => {
  res.json({ status: "ok", name: "jishics-mcp-server", version: "1.2.0" });
});

// ==================== 中间件：认证 ====================
function checkAuth(req: express.Request, res: express.Response): boolean {
  const apiKey = extractApiKey(req.headers as Record<string, string>);
  if (!validateApiKey(apiKey)) {
    res.status(401).json({ error: "Invalid API Key" });
    return false;
  }
  return true;
}

// ==================== Streamable HTTP 端点（推荐） ====================
const streamableSessions = new Map<string, { transport: StreamableHTTPServerTransport; server: ReturnType<typeof createMcpServer> }>();

app.all("/mcp/v2", async (req, res) => {
  if (!checkAuth(req, res)) return;

  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (req.method === "DELETE") {
    if (sessionId && streamableSessions.has(sessionId)) {
      const session = streamableSessions.get(sessionId)!;
      await session.transport.close();
      streamableSessions.delete(sessionId);
      logger.info({ sessionId }, "StreamableHTTP session closed");
      res.status(200).json({ ok: true });
    } else {
      res.status(404).json({ error: "Session not found" });
    }
    return;
  }

  let session: { transport: StreamableHTTPServerTransport; server: ReturnType<typeof createMcpServer> } | undefined;

  if (sessionId && streamableSessions.has(sessionId)) {
    session = streamableSessions.get(sessionId);
  } else if (req.method === "POST") {
    const body = req.body;
    const isInitialize = body && (body.method === "initialize" || (Array.isArray(body) && body.some((m: { method?: string }) => m.method === "initialize")));

    if (isInitialize || !sessionId) {
      const newSessionId = randomUUID();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => newSessionId,
      });
      const mcpServer = createMcpServer();

      await mcpServer.connect(transport);
      session = { transport, server: mcpServer };
      streamableSessions.set(newSessionId, session);

      transport.onclose = () => {
        streamableSessions.delete(newSessionId);
        logger.info({ sessionId: newSessionId }, "StreamableHTTP session closed (onclose)");
      };

      logger.info({ sessionId: newSessionId }, "New StreamableHTTP session");
    }
  }

  if (!session) {
    res.status(400).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Bad Request: No valid session" },
      id: null,
    });
    return;
  }

  try {
    await session.transport.handleRequest(req, res, req.body);
  } catch (err) {
    logger.error({ err }, "StreamableHTTP error");
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

// ==================== SSE 端点（向后兼容） ====================
const sseSessions = new Map<string, { transport: SSEServerTransport; heartbeat: ReturnType<typeof setInterval> }>();

app.get("/mcp/v1", async (req, res) => {
  if (!checkAuth(req, res)) return;

  const apiKey = extractApiKey(req.headers as Record<string, string>);
  const keyHint = apiKey ? apiKey.substring(0, 4) + "****" : "none";
  logger.info({ keyHint }, "New MCP SSE connection");

  const mcpServer = createMcpServer();
  const transport = new SSEServerTransport("/mcp/v1", res);

  const heartbeat = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, HEARTBEAT_INTERVAL_MS);

  sseSessions.set(transport.sessionId, { transport, heartbeat });

  transport.onclose = () => {
    clearInterval(heartbeat);
    sseSessions.delete(transport.sessionId);
    logger.info({ sessionId: transport.sessionId }, "SSE session closed");
  };

  await mcpServer.connect(transport);

  res.on("close", () => {
    clearInterval(heartbeat);
    sseSessions.delete(transport.sessionId);
    transport.close();
  });
});

app.post("/mcp/v1", async (req, res) => {
  if (!checkAuth(req, res)) return;

  const sessionId = req.query.sessionId as string;
  if (!sessionId || !sseSessions.has(sessionId)) {
    res.status(400).json({ error: "Invalid or missing sessionId" });
    return;
  }

  const session = sseSessions.get(sessionId)!;
  await session.transport.handlePostMessage(req, res, req.body);
});

// ==================== 启动服务器 ====================
const server = app.listen(config.port, "0.0.0.0", () => {
  logger.info(`MCP Server v1.2.0 listening on http://0.0.0.0:${config.port}`);
  logger.info(`Streamable HTTP: http://0.0.0.0:${config.port}/mcp/v2`);
  logger.info(`SSE (compat):   http://0.0.0.0:${config.port}/mcp/v1`);
  logger.info(`API backend: ${config.apiUrl}`);
  logger.info(
    config.apiKeys.length > 0
      ? `Auth: ${config.apiKeys.length} API key(s) configured`
      : "Auth: disabled (no API keys configured)"
  );
});
