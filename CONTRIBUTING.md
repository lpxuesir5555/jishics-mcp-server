# 贡献指南

感谢你对 即时财税 MCP Server 的关注！欢迎任何形式的贡献。

## 如何贡献

### 报告 Bug
- 在 Issues 中创建 Bug Report，使用 Bug 模板
- 描述复现步骤、期望行为和实际行为
- 提供环境信息（操作系统、Node.js 版本等）

### 功能建议
- 先在 Issues 中讨论，确认需求合理后再开发
- 描述使用场景和期望的 API 设计

### 提交代码
1. Fork 本仓库
2. 创建功能分支：`git checkout -b feature/your-feature`
3. 编写代码，确保通过现有测试
4. 提交变更：`git commit -m 'feat: add some feature'`
5. 推送到远程：`git push origin feature/your-feature`
6. 创建 Pull Request

### Commit 规范
使用 [Conventional Commits](https://www.conventionalcommits.org/)：
- `feat:` 新功能
- `fix:` 修复 Bug
- `docs:` 文档更新
- `refactor:` 重构
- `test:` 测试相关
- `chore:` 构建/工具变动

### 开发环境
```bash
npm install
npm run dev
```

### 运行测试
```bash
node test-functional.mjs
node test-mcp-sdk.mjs
```
