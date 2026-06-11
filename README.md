# 即时财税 MCP Server — 企业财税服务 AI 智能体

> 🏆 已收录：mcp.so · Glama.ai · awesome-mcp-servers · Smithery.ai
>
> 🔗 MCP Endpoint: ``https://mcp.jishics.com/mcp/v2`` | 8 Tools + 2 Resources | MIT

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-green.svg)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-1.0-blue.svg)](https://modelcontextprotocol.io/)
[![Version](https://img.shields.io/badge/version-1.2.1-blue)](https://github.com/lpxuesir5555/jishics-mcp-server/releases)
[![Glama Score](https://glama.ai/mcp/servers/lpxuesir5555/jishics-mcp-server/badges/score.svg)](https://glama.ai/mcp/servers/lpxuesir5555/jishics-mcp-server)
[![CI](https://github.com/lpxuesir5555/jishics-mcp-server/actions/workflows/ci.yml/badge.svg)](https://github.com/lpxuesir5555/jishics-mcp-server/actions/workflows/ci.yml)
## 🔌 Server Config

```json
{
  "mcpServers": {
    "jishics": {
      "url": "https://mcp.jishics.com/mcp/v2"
    }
  }
}
```

## 📖 目录

- [什么是 MCP？](#什么是-mcp)
- [功能](#功能)
- [快速开始](#快速开始)
- [本地开发](#本地开发)
- [部署](#部署)
- [数据安全](#数据安全)
- [MCP 生态](#mcp-生态)
- [关于即时财税](#关于即时财税)
- [贡献](#贡献)
- [License](#license)

## 什么是 MCP？

[MCP (Model Context Protocol)](https://modelcontextprotocol.io/) 是让 AI 助手能访问外部数据和服务的开放协议。通过 MCP，用户可以在 ChatGPT、Kimi、Claude 等 AI 助手中直接找到即时财税的服务商信息。

> **一句话：** 把你的企业服务数据变成 AI 能"看懂"的工具，用户用自然语言就能搜索、比价、下单。

## 功能

| Tool | 说明 | 示例 |
|------|------|------|
| `search_services` | 搜索服务商（按城市、服务类型） | "帮我找福州代理记账，小规模，200以内" |
| `get_provider` | 获取服务商详情（资质、评分、成交量） | "这家有没有代理记账许可证？" |
| `get_reviews` | 获取客户评价 | "看看这家评价怎么样" |
| `create_demand` | 发布服务需求，支持 webhook 回调获取报价通知 | "选第一个，帮我发布需求" |
| `track_order` | 查询订单/需求状态 | "我的需求有人接了吗？" |
| `match_score` | 匹配度评分 | "对比这三家的综合评分" |
| `verify_license` | 验证服务商资质 | "确认下资质是否在有效期内" |

## 快速开始

### 1. 在 AI 助手中配置 MCP

**Claude Desktop / Cursor / Cherry Studio：**

````json
{
  "mcpServers": {
    "jishics": {
      "url": "https://mcp.jishics.com/mcp/v2"
    }
  }
}
````

### 2. 对 AI 说

```
帮我找个福州的代理记账服务商，小规模纳税人，预算200以内
```

AI 会自动调用 `search_services`，返回匹配的服务商列表。

### 3. 继续对话

```
选第一个，帮我发布需求
```

AI 会调用 `create_demand`，在即时财税平台创建需求。

## 本地开发

```bash
npm install     # 安装依赖
npm run dev     # 开发模式（热重载）
npm run build   # 构建
npm start       # 启动生产模式
````

### 环境变量

复制 `.env.example` 为 `.env` 并编辑：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `JISHICS_API_URL` | 官网 API 地址 | `http://localhost:3000/api/v1` |
| `MCP_PORT` | MCP Server 端口 | `3001` |
| `MCP_API_KEYS` | API Key（逗号分隔） | 空（不认证） |
| `LOG_LEVEL` | 日志级别 | `info` |
| `INTERNAL_API_KEY` | 内部 API 密钥 | 空 |
| `WEBHOOK_SECRET` | Webhook HMAC 签名密钥（与主服务共用） | 空 |

### 运行测试

```bash
node test-functional.mjs   # 功能测试
node test-mcp-sdk.mjs      # MCP SDK 测试
````

## 部署

```bash
# Docker（推荐）
docker compose up -d

# 直接运行
npm start

# systemd 服务
# 详见 DEPLOY.md
```

详细部署说明见 [DEPLOY.md](./DEPLOY.md)

## 数据安全

| 数据类型 | MCP 可访问 | 说明 |
|---------|-----------|------|
| 服务商名称 | ✅ | 公开信息 |
| 服务价格 | ✅ | 公开信息 |
| 评分/评价 | ✅ | 公开信息 |
| 客户联系方式 | ❌ | PII，永不返回 |
| 财务数据 | ❌ | 内部数据 |

## 🌍 MCP 生态

本项目已发布到以下 MCP 目录和平台：

| 平台 | 类型 | 链接 |
|------|------|------|
| Glama.ai | 50K+ MCP 注册中心 | [查看](https://glama.ai/mcp/servers/lpxuesir5555/jishics-mcp-server) |
| mcp.so | 22K+ MCP 搜索引擎 | [查看](https://mcp.so) |
| awesome-mcp-servers | GitHub 精选列表 | [PR #7733](https://github.com/punkpeye/awesome-mcp-servers/pull/7733) |
| Smithery.ai | MCP 托管 + 部署 | [查看](https://smithery.ai/servers/jishics/jishicsmcp) |
| PulseMCP | MCP 社区 | [查看](https://pulsemcp.com) |
| **腾讯云 MCP 广场** | 500+ MCP 市场 | 🔄 收录中 |


## 截图

| AI 撮合页 | 服务商搜索 |
|-----------|-----------|
| ![AI 撮合](./docs/screenshot-ai-match.png) | ![搜索](./docs/screenshot-search.png) |

> 截图位置：./docs/ 目录，尺寸 1440x900

## 关于即时财税

[即时财税（jishics.com）](https://www.jishics.com) 是企业财税服务竞价撮合平台，连接有财税需求的企业与专业服务商。

## 贡献

欢迎贡献！请参阅 [CONTRIBUTING.md](./CONTRIBUTING.md)

安全漏洞请私密报告至 security@jishics.com，详见 [SECURITY.md](./SECURITY.md)

## License

MIT © [即时财税](https://www.jishics.com)