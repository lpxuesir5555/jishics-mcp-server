# MCP Server 部署指南

## 本地开发（已安装 Node.js）

```bash
cd jishics-mcp-server
npm install
npm run build
npm start
```

## 服务器部署

### 方式1：直接运行

```bash
# 上传代码
scp -r jishics-mcp-server/ user@server:/opt/jishics-mcp-server/

# 安装依赖
cd /opt/jishics-mcp-server
npm install
npm run build

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入实际值

# 启动
npm start
```

### 方式2：Docker

```bash
docker compose up -d
```

### 方式3：systemd 服务

```bash
# 创建服务文件
sudo nano /etc/systemd/system/jishics-mcp.service

# 内容：
[Unit]
Description=Jishics MCP Server
After=network.target

[Service]
Type=simple
User=node
WorkingDirectory=/opt/jishics-mcp-server
ExecStart=/usr/bin/node dist/index.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target

# 启动
sudo systemctl enable jishics-mcp
sudo systemctl start jishics-mcp
```

## Nginx 配置

```bash
# 复制配置
sudo cp deploy/nginx-mcp.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/nginx-mcp.conf /etc/nginx/sites-enabled/

# 申请 SSL 证书
sudo certbot --nginx -d mcp.jishics.com

# 重载 Nginx
sudo nginx -t
sudo systemctl reload nginx
```

## 测试

```bash
# 健康检查
curl https://mcp.jishics.com/health

# MCP 端点（需要 MCP 客户端）
# 在 Claude Desktop 中配置：
{
  "mcpServers": {
    "jishics": {
      "url": "https://mcp.jishics.com/mcp/v1"
    }
  }
}
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `JISHICS_API_URL` | 官网 API 地址 | `http://localhost:3000/api/v1` |
| `MCP_PORT` | MCP Server 端口 | `3001` |
| `MCP_API_KEYS` | API Key（逗号分隔） | 空（不认证） |
| `LOG_LEVEL` | 日志级别 | `info` |
