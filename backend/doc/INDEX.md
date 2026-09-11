# 后端文档地图

金融知识库后端：Node.js + TypeScript + Express 5 + PostgreSQL。

## 文档索引

| 文档 | 什么时候读 |
| --- | --- |
| [API_INVENTORY.md](API_INVENTORY.md) | **最重要**。要改接口、加接口、对接前端时必读 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 新增模块、理解分层与数据流时读 |
| [CONVENTIONS.md](CONVENTIONS.md) | 写代码前读：命名、错误处理、SQL、测试约定 |
| [PLAYBOOK.md](PLAYBOOK.md) | 做具体任务时的分步处方（新模块/新接口/加字段/改状态机） |
| [SETUP.md](SETUP.md) | 首次启动、数据库连不上、环境变量问题时读 |

## 30 秒速览

- 入口：`src/index.ts`（建表 → 种演示账号 → 监听 `PORT`，默认 3000）
- 应用工厂：`src/app.ts` 的 `createApp()`，`cors` + `express.json({limit:'10mb'})` + `/api` 路由 + 错误中间件
- 路由聚合：`src/routes/index.ts`，`/health`、`/auth` 公开，其余全部 `requireAuth`
- 领域模块：`auth` `catalog` `document` `doc-version` `favorite` `file` `search`
- 模块内部结构：**`x.controller.ts` → `x.service.ts` → `x.repository.ts` → `x.types.ts`**
- 数据访问：`src/db/pool.ts` 的 `pool.query`，无 ORM
- 建表：`db/schema.sql`，启动时幂等执行
- 统一错误体：`{ code, message }`

## 关键领域规则

**文档状态机**（`src/document/document.types.ts` 的 `TRANSITIONS`）：

```text
draft ──submit──► pending ──approve──► approved ──complete──► completed
  ▲                  │                    │                      │
  └──────reject──────┘                    └──────publish─────────┤
                                                                 ▼
                                          completed/published ──► archived
```

`reject` 必须带处理意见 `comment`。每次流转写入 `document_status_log`。

**角色**：`admin` 可做写操作（分类管理、文档增删改、上传 PDF、状态流转）；`user` 只读 + 收藏。

**鉴权**：Bearer Token，存 `auth_token` 表，有效期 7 天；`?token=` 作为 PDF 预览等场景的兜底。

## 与前端的边界

前端只通过 `/api/**` 访问，唯一约定是 `frontend/src/api/client.ts`。
后端改响应结构时，必须同步前端类型与 `frontend/doc/API_INVENTORY.md`。
状态机常量在前端有一份镜像（`frontend/src/constants/docFlow.ts`），**改状态机要两边一起改**。
