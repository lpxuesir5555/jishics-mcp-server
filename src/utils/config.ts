import "dotenv/config";

export const config = {
  apiUrl: process.env.JISHICS_API_URL || "http://localhost:3000/api/v1",
  internalApiKey: process.env.INTERNAL_API_KEY || "",
  port: parseInt(process.env.MCP_PORT || "3001"),
  apiKeys: process.env.MCP_API_KEYS?.split(",").filter(Boolean) || [],
  redisUrl: process.env.REDIS_URL || "",
  webhookSecret: process.env.WEBHOOK_SECRET || "",
  logLevel: process.env.LOG_LEVEL || "info",
};
