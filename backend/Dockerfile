# ---- 构建阶段：安装依赖并编译 TypeScript ----
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- 运行阶段：仅安装生产依赖，用编译产物启动 ----
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# 编译产物
COPY --from=build /app/dist ./dist
# 建表脚本（运行时按 process.cwd()/db/schema.sql 读取）
COPY db ./db

EXPOSE 3000
CMD ["node", "dist/index.js"]
