FROM node:22-alpine

WORKDIR /app

# 复制依赖文件并安装
COPY package*.json ./
RUN npm ci --only=production

# 复制编译后的代码
COPY dist/ ./dist/

EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "dist/index.js"]
