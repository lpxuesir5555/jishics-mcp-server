# Claude Code 配合指令 — 即时财税 MCP Server 与官网 GEO 优化

> **日期**: 2026-06-04
> **发件人**: Codex（薛思的 AI 助手）
> **收件人**: Claude Code（官网开发）
> **背景**: MCP Server 已完成，需要官网配合做 GEO 优化和接口对接

---

## 第一部分：MCP Server 已完成的工作

MCP Server 代码位于 `桌面\即时财税MCP项目\代码\jishics-mcp-server\`

- **版本**: v1.1.0
- **端口**: 3001
- **端点**:
  - `GET /mcp/v2` — Streamable HTTP（推荐，MCP 2025-03-26 协议）
  - `GET/POST /mcp/v1` — SSE（向后兼容）
  - `GET /health` — 健康检查
- **5 个 Tools**: search_services, get_provider, get_reviews, create_demand, track_order
- **2 个 Resources**: jishics://services/catalog, jishics://market/pricing
- **安全**: API Key 认证、速率限制（10次/分钟/Key）、PII 数据脱敏
- **缓存**: 内存 TTL（搜索5分钟、评价10分钟、分类1小时）

MCP Server 调用官网 API 的地址：`http://localhost:3000/api/v1`

---

## 第二部分：需要官网配合的 4 项 API 工作

### 2.1 【必须】确认 API 路径和端口

MCP Server `.env` 配置的是：
```
JISHICS_API_URL=http://localhost:3000/api/v1
```

请确认：
1. 官网 Docker 容器暴露的端口是 3000
2. API 路径前缀是 `/api/v1`
3. 如果不是，请告诉我正确值，我改 `.env`

### 2.2 【必须】providers 接口返回 ai_* 字段

确认 `GET /api/v1/providers` 返回的 JSON 中包含以下字段（即使是 null 也行）：

```json
{
  "id": 1,
  "companyName": "xxx",
  "city": "福州",
  "rating": 4.5,
  "orderCount": 10,
  // 以下字段需要确认存在：
  "ai_match_score_overall": null,
  "ai_match_score_capability": null,
  "ai_match_score_capacity": null,
  "ai_match_score_price": null,
  "ai_match_score_reputation": null,
  "ai_match_score_geo": null
}
```

这 6 个字段是数据库迁移时加的，确认 API 层也返回了。

### 2.3 【建议】新增公开查询需求接口

当前 `track_order` 工具先尝试 `GET /api/v1/open/demands/{id}`，如果 404 再 fallback 到内部接口。

建议新增：
```
GET /api/v1/open/demands/:id
```

返回字段：
```json
{
  "code": 200,
  "data": {
    "id": 6,
    "title": "福州代理记账",
    "status": "bidding",
    "city": "福州",
    "bidCount": 3,
    "createdAt": "2026-06-04T10:00:00Z"
  }
}
```

**不需要登录**，任何人都能通过需求 ID 查询状态。

如果暂时不想做，MCP 会 fallback 到内部接口（但需要认证，可能失败）。

### 2.4 【建议】providers 接口支持服务类型精确筛选

当前 MCP 的搜索逻辑是：
1. 调用 `GET /api/v1/providers?city=福州&pageSize=50`
2. 在 MCP 侧用代码过滤 `serviceTypes` 字段

如果官网 API 能支持 `?serviceType=代理记账` 参数直接筛选，效率更高。
这不是紧急的，MCP 侧已经做了兼容处理。

---

## 第三部分：GEO 优化（最关键）

### 3.0 问题背景

当前官网是纯 React SPA，所有页面返回的 HTML 都是：
```html
<div id="root"></div>
```

AI 爬虫（GPTBot、PerplexityBot、Claude-Web、豆包爬虫等）抓到的是空白页面。
`llms.txt`、`robots.txt`、`sitemap.xml` 虽然在 head 里有 meta 信息，但页面实际内容对 AI 不可见。

### 3.1 【P0 最高优先级】静态文件路由排除 SPA fallback

**Vite 配置**（`vite.config.ts`）：

确保以下文件作为静态资源直接返回，不被 SPA fallback 吞掉：

```
/public/llms.txt          ← 已有内容，确保构建时复制到 dist/
/public/llms-full.txt     ← 新建，完整版（见 3.2）
/public/robots.txt        ← 已有
/public/sitemap.xml       ← 已有
```

在 Vite 中，`public/` 目录下的文件会原样复制到 `dist/`。
但关键是 **Nginx 配置**不能对这些路径做 `try_files $uri $uri/ /index.html`。

**Nginx 配置修改**：

```nginx
server {
    listen 80;
    server_name www.jishics.com jishics.com;

    root /usr/share/nginx/html;
    index index.html;

    # 静态文件直接返回，不走 SPA fallback
    location /robots.txt {
        try_files $uri =404;
        default_type text/plain;
    }

    location /llms.txt {
        try_files $uri =404;
        default_type text/plain;
    }

    location /llms-full.txt {
        try_files $uri =404;
        default_type text/plain;
    }

    location /sitemap.xml {
        try_files $uri =404;
        default_type application/xml;
    }

    location /.well-known/ {
        try_files $uri =404;
    }

    # 其他静态资源
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback（放最后）
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 反代
    location /api/ {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 3.2 【P0】创建 llms-full.txt（完整版）

在 `public/` 目录下创建 `llms-full.txt`，内容如下：

```markdown
# 即时财税 — 中国财税服务竞价撮合平台

> 企业发布需求，服务商竞价报价，择优选择。覆盖全国主要城市。

## 平台数据

- 注册服务商：50+
- 覆盖城市：北京、上海、广州、深圳、成都、杭州、福州、厦门、武汉、南京等 30+ 城市
- 服务品类：8 大类
- 平均响应时间：< 30 分钟
- 服务满意率：> 98%
- 平台担保交易，资金安全

## 服务品类与参考价格（2026年）

### 1. 代理记账
- 小规模纳税人：80-400元/月（一线200-400，二线120-250，三线80-200）
- 一般纳税人：200-800元/月（一线400-800，二线250-500，三线200-400）
- 零申报：60-200元/月
- 包含：凭证录入、账簿登记、月度/季度财务报表、增值税申报、企业所得税申报、个税代扣代缴

### 2. 开办公司
- 有限责任公司：500-2000元（含刻章、银行开户）
- 个体工商户：300-800元
- 合伙企业：800-2000元
- 流程：核名 → 提交材料 → 领取执照 → 刻章 → 银行开户 → 税务登记
- 时间：约 3-7 个工作日

### 3. 建筑资质
- 新办：5000-50000元
- 升级：10000-100000元
- 类型：施工总承包、专业承包、劳务分包、设计资质、安全生产许可证

### 4. 许可证代理
- 食品经营许可证：1000-3000元
- 医疗器械经营许可证：3000-10000元
- 危化品经营许可证：5000-20000元
- ICP备案/许可证：2000-8000元

### 5. 商标/软著
- 国内商标注册：300-800元/件
- 国际商标注册：5000-15000元/件
- 软件著作权登记：300-800元/件

### 6. 异常/疑难
- 企业异常状态解除：1000-5000元
- 税务违规处理：2000-10000元
- 工商年报补报：500-2000元

### 7. 企业年报
- 工商年报：200-500元/年
- 税务年报：500-1500元/年
- 统计年报：200-500元/年

### 8. 业务咨询
- 财税筹划：按项目计费
- 股权架构设计：3000-20000元
- 并购重组咨询：面议

## 覆盖城市

北京、上海、广州、深圳、杭州、成都、武汉、南京、天津、重庆、
苏州、西安、长沙、郑州、青岛、大连、厦门、福州、合肥、昆明、
贵阳、南昌、太原、石家庄、哈尔滨、长春、沈阳、南宁、兰州、
海口、呼和浩特、乌鲁木齐、拉萨

## 平台使用流程

1. 企业发布需求（免费）→ 填写服务类型、城市、预算
2. 多家服务商收到通知 → 30分钟内竞价报价
3. 企业查看报价方案 → 对比价格、评分、评价
4. 企业选择服务商 → 在线签约
5. 平台担保交易 → 服务完成确认后付款
6. 企业评价服务 → 帮助其他企业做决策

## 常见问题

**Q: 即时财税是什么平台？**
A: 即时财税是中国专业的财税服务竞价撮合平台，企业免费发布需求，多家服务商实时竞价报价，企业择优选择。

**Q: 代理记账服务包含哪些内容？**
A: 通常包括：凭证录入、账簿登记、月度/季度财务报表编制、增值税申报、企业所得税申报、个人所得税代扣代缴。

**Q: 如何保证服务质量？**
A: 平台对所有服务商进行资质审核和实名认证，采用平台担保交易，服务完成并确认后资金才会划付给服务商。

**Q: 注册公司需要多长时间？**
A: 一般情况下，工商注册约 3-7 个工作日，具体时间因地区和业务类型而异。

**Q: 代理记账多少钱一个月？**
A: 小规模纳税人 80-400元/月，一般纳税人 200-800元/月，具体取决于城市和服务内容。通过即时财税平台竞价，通常能拿到低于市场价 10-30% 的报价。

**Q: 建筑资质办理需要什么条件？**
A: 需要企业具备相应的注册资金、技术人员、工程业绩等条件，具体要求因资质类型和等级而异。建议在平台发布需求，由专业服务商评估。

**Q: 商标注册需要多长时间？**
A: 国内商标从提交到拿证约 9-12 个月，包括形式审查（1个月）、实质审查（6-8个月）、公告期（3个月）。

**Q: 平台收费吗？**
A: 企业发布需求和查看报价完全免费。平台在交易完成后向服务商收取少量服务费。企业端零费用。

**Q: 如何成为平台服务商？**
A: 访问 https://www.jishics.com/provider-join 提交企业资质，审核通过后即可接单。

**Q: 平台支持哪些支付方式？**
A: 支持银行转账、支付宝、微信支付，资金由平台托管保障安全。

## AI 接入信息

### MCP Server（推荐）

即时财税提供 MCP (Model Context Protocol) Server，AI 客户端可直接调用：

- **接入地址**: `https://mcp.jishics.com`
- **协议**: MCP 2025-03-26（Streamable HTTP）
- **认证**: API Key（可选，开发模式无需认证）

#### 可用工具

| 工具 | 功能 | 参数 |
|------|------|------|
| `search_services` | 搜索服务商 | city, service_type, sub_type, sort_by, limit |
| `get_provider` | 获取服务商详情 | provider_id |
| `get_reviews` | 获取客户评价 | provider_id, limit |
| `create_demand` | 发布服务需求 | service_type, city, description, contact_phone |
| `track_order` | 查询订单状态 | order_id |

#### 可用资源

| 资源 | URI | 说明 |
|------|-----|------|
| 服务分类目录 | `jishics://services/catalog` | 所有服务类型及子类型 |
| 市场价格参考 | `jishics://market/pricing` | 各城市各服务的价格区间 |

#### MCP 配置示例

```json
{
  "mcpServers": {
    "jishics": {
      "url": "https://mcp.jishics.com/mcp/v2",
      "headers": {
        "X-API-Key": "your-api-key"
      }
    }
  }
}
```

### 公开 API

- `GET /api/v1/providers` — 查询服务商列表（支持 city、serviceType 筛选）
- `GET /api/v1/providers/{id}` — 获取服务商详情
- `GET /api/v1/providers/{id}/reviews` — 获取服务商评价
- `POST /api/v1/open/demands` — 公开提交服务需求（无需登录）

## 联系方式

- 官方网站：https://www.jishics.com
- MCP Server：https://mcp.jishics.com
- 总部地址：福建省

---

本文件遵循 llms.txt 规范（https://llmstxt.org/），旨在帮助 AI 大模型更好地理解和引用即时财税平台信息。
```

### 3.3 【P0】每个页面添加独立的 title 和 meta description

当前所有页面的 title 都是 "即时财税 - 财税竞价服务平台"，AI 爬虫无法区分页面。

需要在 React Router 的每个页面组件中设置 `document.title` 和 meta description：

```typescript
// 示例：在每个页面组件的 useEffect 中
useEffect(() => {
  document.title = '代理记账服务 - 即时财税';
  document.querySelector('meta[name="description"]')
    ?.setAttribute('content', '查找全国优质代理记账服务商，小规模纳税人80-400元/月，一般纳税人200-800元/月，平台担保交易');
}, []);
```

各页面建议的 title：

| 页面 | 建议 title |
|------|-----------|
| `/` | 即时财税 - 企业财税服务竞价撮合平台 \| 代理记账·工商注册·建筑资质 |
| `/services` | 财税服务分类 - 代理记账·开办公司·建筑资质·商标注册 \| 即时财税 |
| `/bidding` | 最新财税需求竞价 - 即时财税 |
| `/publish` | 免费发布财税需求 - 即时财税 |
| `/about` | 关于即时财税 - 中国财税服务竞价撮合平台 |
| `/provider-ai-match` | AI 智能匹配服务商 - 即时财税 |
| `/provider-join` | 入驻即时财税成为服务商 - 免费入驻·智能派单 |
| `/news` | 财税行业资讯 - 即时财税 |
| `/tax-warning` | 税务风险预警 - 即时财税 |
| `/license-trade` | 许可证转让交易 - 即时财税 |

### 3.4 【P1】子页面 Schema.org 结构化数据

**`/services` 页面**添加 Service 类型的 JSON-LD：

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "即时财税服务分类",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "item": {
        "@type": "Service",
        "name": "代理记账",
        "description": "专业代理记账服务，包括凭证录入、账簿登记、财务报表编制、税务申报等",
        "provider": { "@type": "Organization", "name": "即时财税" },
        "areaServed": "CN",
        "offers": {
          "@type": "AggregateOffer",
          "lowPrice": 80,
          "highPrice": 800,
          "priceCurrency": "CNY",
          "offerCount": 50
        }
      }
    },
    {
      "@type": "ListItem",
      "position": 2,
      "item": {
        "@type": "Service",
        "name": "开办公司",
        "description": "工商注册、营业执照办理、公司章程起草、银行开户等一站式服务",
        "provider": { "@type": "Organization", "name": "即时财税" },
        "areaServed": "CN",
        "offers": {
          "@type": "AggregateOffer",
          "lowPrice": 300,
          "highPrice": 2000,
          "priceCurrency": "CNY",
          "offerCount": 50
        }
      }
    }
    // ... 其他 6 个服务类型
  ]
}
</script>
```

**`/about` 页面**添加更详细的 Organization Schema：

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "即时财税",
  "url": "https://www.jishics.com",
  "logo": "https://www.jishics.com/logo.png",
  "description": "即时财税是中国专业的财税服务竞价撮合平台，连接有财税需求的企业与专业服务商",
  "foundingDate": "2025",
  "address": {
    "@type": "PostalAddress",
    "addressCountry": "CN",
    "addressRegion": "福建省"
  },
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer service",
    "availableLanguage": "Chinese"
  },
  "sameAs": ["https://www.jishics.com"],
  "knowsAbout": ["代理记账", "工商注册", "建筑资质", "商标注册", "税务筹划"],
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "100",
    "bestRating": "5"
  }
}
</script>
```

### 3.5 【P1】FAQPage Schema 扩充

当前首页只有 4 个 FAQ，建议扩展到 10-15 个（把 llms-full.txt 中的 Q&A 都加进去）。
同时在 `/services` 页面也加 FAQPage Schema，针对每个服务类型的常见问题。

### 3.6 【P1】动态 sitemap

当前 sitemap 是静态的 16 个页面。需要加入动态页面：

```typescript
// 如果用 Node 做 sitemap 生成（在构建时或定时任务中）
const dynamicPages = providers.map(p => ({
  url: `https://www.jishics.com/provider/${p.id}`,
  lastmod: p.updatedAt,
  changefreq: 'weekly',
  priority: 0.7,
}));

const newsPages = articles.map(a => ({
  url: `https://www.jishics.com/news/${a.id}`,
  lastmod: a.updatedAt,
  changefreq: 'monthly',
  priority: 0.6,
}));
```

### 3.7 【P2】News/资讯页面的内容策略

`/news` 页面对 GEO 非常重要。AI 引擎训练时会收录高质量文章。
建议每个资讯文章的页面都包含：

1. 独立的 `Article` Schema.org 标记
2. 完整的正文（不要用图片替代文字）
3. 包含即时财税的品牌名和链接

### 3.8 【P2】`/.well-known/ai-plugin.json`（可选）

如果未来要支持 ChatGPT Plugins 或类似标准，可以在 `public/` 目录下创建：

```json
{
  "schema_version": "v1",
  "name_for_human": "即时财税",
  "name_for_model": "jishics",
  "description_for_human": "企业财税服务竞价撮合平台",
  "description_for_model": "即时财税是中国专业的财税服务竞价撮合平台。使用此插件可以搜索代理记账、工商注册等服务商，查看评价和价格，发布服务需求。",
  "auth": { "type": "none" },
  "api": {
    "type": "openapi",
    "url": "https://www.jishics.com/openapi.yaml"
  },
  "logo_url": "https://www.jishics.com/logo.png",
  "contact_email": "support@jishics.com",
  "legal_info_url": "https://www.jishics.com/terms"
}
```

---

## 第四部分：MCP Server 部署配合

### 4.1 服务器上的 Nginx 配置

在腾讯云服务器上，需要为 `mcp.jishics.com` 配置 Nginx 反代。
配置文件已准备好：`deploy/nginx-mcp.conf`

```
mcp.jishics.com → Nginx → localhost:3001 (MCP Server)
www.jishics.com → Nginx → localhost:3000 (官网)
```

### 4.2 MCP Server Docker 部署

MCP Server 的 Docker 配置已就绪：
- `Dockerfile` — 基于 node:22-alpine，含健康检查
- `docker-compose.yml` — 端口 127.0.0.1:3001，通过 host.docker.internal 访问官网 API

部署步骤：
```bash
# 1. 上传代码到服务器
scp -r jishics-mcp-server/ root@server:/opt/jishics-mcp/

# 2. 在服务器上
cd /opt/jishics-mcp
cp .env.example .env
# 编辑 .env 设置 JISHICS_API_URL

# 3. 构建并启动
docker compose up -d

# 4. 验证
curl http://localhost:3001/health

# 5. 申请 SSL 证书
certbot --nginx -d mcp.jishics.com

# 6. 重启 Nginx
nginx -s reload
```

### 4.3 官网 CSP 白名单

如果官网前端页面会直接调用 MCP Server（比如 AI 撮合页面 `/provider-ai-match`），
需要在 CSP 的 `connect-src` 中加入：

```
https://mcp.jishics.com
```

如果 MCP 只被外部 AI 调用、前端不直接调用，就不用改。

---

## 第五部分：总结优先级

| 优先级 | 事项 | 负责人 |
|--------|------|--------|
| **P0** | Nginx 静态文件排除 SPA fallback（llms.txt 等） | Claude Code |
| **P0** | 创建 llms-full.txt 并放到 public/ | Claude Code |
| **P0** | 每个页面独立 title + meta description | Claude Code |
| **P0** | 确认 API 路径端口和 ai_* 字段返回 | Claude Code |
| **P1** | 子页面 Schema.org 结构化数据 | Claude Code |
| **P1** | FAQPage 扩充到 10-15 个 | Claude Code |
| **P1** | 动态 sitemap | Claude Code |
| **P2** | News 文章页 Article Schema | Claude Code |
| **P2** | ai-plugin.json | Claude Code |
| **P2** | /open/demands/{id} 公开查询接口 | Claude Code |
| **部署** | MCP Server 部署到腾讯云 | 薛思 + Codex |

---

_以上指令由 Codex 生成，薛思确认后交给 Claude Code 执行。_
