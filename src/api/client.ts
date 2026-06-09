import fetch, { HeadersInit } from "node-fetch";
import { config } from "../utils/config.js";
import { logger } from "../utils/logger.js";

interface ApiResponse<T> {
  code?: number;
  data?: T;
  list?: T[];
  message?: string;
  error?: string;
}

const REQUEST_TIMEOUT_MS = 10_000;

async function request<T>(
  path: string,
  options: { method?: string; body?: string; headers?: Record<string, string> } = {}
): Promise<T> {
  const url = `${config.apiUrl}${path}`;
  logger.debug({ url, method: options.method || "GET" }, "API request");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (config.internalApiKey) {
    headers["X-Internal-Key"] = config.internalApiKey;
  }
  if (options.headers) {
    for (const key of Object.keys(options.headers)) {
      headers[key] = options.headers[key];
    }
  }

  try {
    const resp = await fetch(url, {
      method: options.method || "GET",
      body: options.body,
      signal: controller.signal,
      headers: headers as HeadersInit,
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      logger.error({ status: resp.status, url }, "API HTTP error");
      throw new Error(`API ${resp.status}: ${text.substring(0, 200)}`);
    }

    const json = (await resp.json()) as ApiResponse<T>;

    if (json.code !== undefined && json.code !== 200) {
      logger.error({ code: json.code, message: json.message, url }, "API business error");
      throw new Error(`API error ${json.code}: ${json.message || json.error || "unknown"}`);
    }

    if (json.list !== undefined) return json.list as unknown as T;
    if (json.data !== undefined) return json.data as T;
    return json as unknown as T;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      logger.error({ url, timeout: REQUEST_TIMEOUT_MS }, "API request timeout");
      throw new Error(`API timeout after ${REQUEST_TIMEOUT_MS}ms: ${path}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
};
