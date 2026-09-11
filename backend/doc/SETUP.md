# 后端安装与启动

## 1. 前置条件

| 依赖 | 版本要求 | 说明 |
| --- | --- | --- |
| Node.js | ≥ 18（建议 20 LTS） | 使用了 `tsx`、`node:crypto` |
| npm | 随 Node | |
| PostgreSQL | ≥ 12 | 需要能创建库与表 |

## 2. 安装

```bash
cd work-standard/backend
npm install
```

## 3. 准备数据库

创建数据库（默认名 `knowledge`）：

```bash
createdb knowledge
# 或
psql -U postgres -c "CREATE DATABASE knowledge;"
```

**无需手动建表**：服务启动时 `src/db/init.ts` 会自动读取 `db/schema.sql` 并执行，脚本全部幂等，重复启动安全。

## 4. 环境变量

项目根目录创建 `.env`（`dotenv` 在 `src/index.ts` 第一行加载）：

```env
PORT=3000
DATABASE_URL=postgres://postgres:123456@localhost:5432/knowledge
```

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `3000` | HTTP 监听端口 |
| `DATABASE_URL` | `postgres://postgres:123456@localhost:5432/knowledge` | PostgreSQL 连接串（`src/db/pool.ts`） |

> 两个变量都有默认值，**不配 `.env` 也能在默认环境下直接启动**。
> `.env` 含真实凭据，**不要提交进仓库**。

连接串格式：

```text
postgres://<用户>:<密码>@<主机>:<端口>/<库名>
```

## 5. 启动

```bash
npm run dev        # 开发：tsx watch，改文件自动重启
npm run build      # 编译到 dist/
npm start          # 生产：node dist/index.js
npm run typecheck  # tsc --noEmit
npm test           # vitest run
```

成功启动会看到：

```text
🚀 Server is running at http://localhost:3000
```

> `npm run build` 只做 `tsc`，**不会拷贝 `db/schema.sql`**。
> 生产环境运行 `npm start` 时工作目录必须仍能访问到 `db/schema.sql`，否则 `initSchema()` 会报错。

## 6. 验证

```bash
curl http://localhost:3000/api/health
# {"status":"ok","timestamp":"..."}

curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"employeeNo":"E10001","password":"admin123"}'
# {"token":"...","employee":{"employee_no":"E10001","name":"管理员","role":"admin"}}
```

## 7. 演示账号

首次启动由 `auth.service.seedEmployees()` 自动写入（已存在则跳过）：

| 工号 | 密码 | 角色 |
| --- | --- | --- |
| `E10001` | `admin123` | admin |
| `E10002` | `user123` | user |

示例业务数据（分类、文档、版本、收藏）由 `db/schema.sql` 的幂等 `INSERT` 写入。

## 8. 目录与产物

| 路径 | 说明 |
| --- | --- |
| `uploads/` | PDF 上传落盘目录（`process.cwd()/uploads`），自动创建，**不要提交** |
| `dist/` | 编译产物 |
| `db/schema.sql` | 建表 + 示例数据 |

## 9. 与前端联调

前端已配置代理（`frontend/vite.config.ts`）：`/api` → `http://localhost:3000`。
因此**先启动后端（3000），再启动前端（5173）**，前端直接请求 `/api/...` 即可，无需前端配置 `VITE_API_BASE`。

若前后端不同机部署，前端需设置：

```env
VITE_API_BASE=http://<后端主机>:3000
```

## 10. 常见启动问题

| 现象 | 排查 |
| --- | --- |
| `[Bootstrap] 数据库初始化失败` | PostgreSQL 未启动 / `DATABASE_URL` 错误 / 库不存在 |
| `ECONNREFUSED 5432` | 数据库端口不通，确认服务与防火墙 |
| `relation "xxx" does not exist` | 工作目录不对，没读到 `db/schema.sql`；确认在 `backend/` 下启动 |
| `password authentication failed` | 连接串用户名或密码错误 |
| 端口占用 | 改 `.env` 的 `PORT`，或 `lsof -i :3000` 查占用 |
| 上传报 400 | 非 PDF 或超过 20MB |

## 11. 重置数据

```bash
# 删库重建（会清空全部数据）
dropdb knowledge && createdb knowledge
npm run dev       # 自动重建表与示例数据
```
