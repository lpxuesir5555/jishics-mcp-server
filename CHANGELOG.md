# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] - 2025-06-09

### Added
- MCP Server 核心功能：服务搜索、服务商详情、客户评价
- 需求发布与撮合流程对接
- 订单/需求状态追踪
- 服务商资质验证
- 匹配度评分算法
- REST API 客户端封装
- 安全模块：API Key 认证、数据过滤、频率限制
- 缓存层、日志系统、Webhook 支持
- Docker / docker-compose 部署支持
- Nginx 反向代理配置
- 完整测试套件（功能测试 + MCP SDK 测试）

### Security
- PII 数据永不返回（客户联系方式、财务数据等）
- 仅公开信息通过 MCP 暴露
- 接口级频率限制
