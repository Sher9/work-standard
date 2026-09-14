# AGENTS.md

AI 编码助手必读。本文件是 `work-standard`（金融知识库管理系统）的全局约定入口。

> 深入细节请先读子项目文档：
> - 后端：[`backend/doc/INDEX.md`](backend/doc/INDEX.md)
> - 前端：[`frontend/doc/INDEX.md`](frontend/doc/INDEX.md)

---

## 1. 项目是什么

面向金融机构内部使用的**知识库管理系统**：按分类树组织文档，支持富文本内容与 PDF 附件、文档状态审核流转、版本留痕、收藏与检索。

两种角色：

- `admin`（管理员）：分类管理、文档维护、上传 PDF、驱动状态流转
- `user`（普通用户）：浏览/搜索/阅读文档、收藏

## 2. 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | Vue 3（`<script setup>` + TS）· Vite 5 · Pinia · Vue Router 4 · Element Plus · Vitest |
| 后端 | Node.js · TypeScript（CommonJS）· Express 5 · pg（原生 SQL）· Vitest |
| 数据库 | PostgreSQL |
| 规范流程 | OpenSpec（已初始化，见第 5 节） |

无 ORM、无查询构造器：**所有数据访问都是 `pool.query` 手写 SQL**。

## 3. 目录结构

```text
work-standard/
├── AGENTS.md              # 本文件
├── openspec/              # OpenSpec 规范与变更
│   ├── specs/             # 当前系统规范（事实来源）
│   ├── changes/           # 进行中的变更
│   └── config.yaml        # 项目上下文与制品规则
├── backend/
│   ├── db/schema.sql      # 建表 + 幂等示例数据
│   ├── src/               # 源码，按领域模块划分
│   │   ├── auth/ catalog/ document/ doc-version/
│   │   ├── favorite/ file/ search/
│   │   ├── common/        # 鉴权中间件、密码工具、清洗
│   │   ├── middleware/    # 错误处理
│   │   ├── db/            # 连接池、schema 初始化
│   │   ├── routes/        # 路由聚合
│   │   ├── app.ts         # createApp() 工厂（不 listen）
│   │   └── index.ts       # 入口：建表 → 种账号 → listen
│   ├── test/              # 测试
│   ├── uploads/           # PDF 上传落盘目录
│   └── doc/               # 后端文档
└── frontend/
    ├── src/
    │   ├── api/client.ts  # 唯一 HTTP 出口
    │   ├── views/         # 路由级页面
    │   ├── components/    # 可复用组件
    │   ├── stores/        # Pinia（employee / catalog）
    │   ├── composables/   # useCategoryDrag
    │   ├── constants/     # docFlow 状态机、categoryIcons
    │   └── router/        # 路由 + 全局守卫
    └── doc/               # 前端文档
```

## 4. 常用命令

```bash
# 后端
cd backend
npm install
npm run dev        # tsx watch src/index.ts :3000
npm run build      # tsc
npm run typecheck  # tsc --noEmit
npm test           # vitest run

# 前端
cd frontend
npm install
npm run dev        # vite :5173
npm run build      # vue-tsc -b && vite build
npm run preview
npm test           # vitest run
```

后端默认 `http://localhost:3000`，前端 `http://localhost:5173`，前端已配置 `/api` → `3000` 代理。

演示账号（首次启动自动写入）：

| 工号 | 密码 | 角色 |
| --- | --- | --- |
| `E10001` | `admin123` | admin |
| `E10002` | `user123` | user |

## 5. OpenSpec 工作流（重要）

本项目采用 **OpenSpec + Git Worktree** 规范驱动开发。已初始化（CLI v1.12.0，profile `core`）。

**改任何功能前，请先确认是否有对应的 change。** 流程：

```text
/opsx:explore            # 需求不清时先探索（AI 聊天框）
/opsx:propose <name>     # 生成 proposal/specs/design/tasks
   ↓ 人工评审
/opsx:apply              # 实施
/opsx:archive            # 归档，合并进 openspec/specs/
```

终端辅助命令：

```bash
openspec list                       # 进行中的变更
openspec status --change <name>     # 制品进度
openspec validate --all             # 校验
openspec archive <name> --yes       # 归档
```

关键约束：

- **`/opsx:propose` 只产出规划文档，不允许改业务代码**；实施必须等用户显式发起 `/opsx:apply`
- 规范文件（`openspec/specs/`）是事实来源，代码与规范冲突时以规范为准并上报冲突
- 不要手改 `.codebuddy/skills/`、`.codebuddy/commands/` 等 OpenSpec 生成物

## 6. 跨端契约

- 后端统一挂在 `/api` 前缀，统一返回 JSON；错误体固定为 `{ code, message }`
- 鉴权：`Authorization: Bearer <token>`；PDF 预览因 `<a>`/`<iframe>` 无法带 header，额外支持 `?token=`
- 前端唯一出口是 `frontend/src/api/client.ts`，**禁止在组件里直接 `fetch`/axios**
- Token 存 `localStorage['kb_auth']`；`api/client.ts` 收到 401 会清缓存并跳转 `/login`

完整接口清单见 [`backend/doc/API_INVENTORY.md`](backend/doc/API_INVENTORY.md)。

## 7. 不可违反的约定

1. **前端常量必须与后端状态机保持一致**：`frontend/src/constants/docFlow.ts` 的 `DOC_TRANSITIONS` 是后端 `backend/src/document/document.types.ts` 中 `TRANSITIONS` 的镜像。改一处必须同步另一处。
2. **数据库变更只改 `backend/db/schema.sql`**，且必须幂等（`CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... DROP CONSTRAINT IF EXISTS`），启动时自动执行。
3. **不引入 ORM / 查询构造器**，延续 `pool.query` 手写 SQL。
4. **所有新增接口默认需要 `requireAuth`**；写操作按需加 `requireRole('admin')`。
5. **不要提交 `uploads/` 与 `.env` 中的真实凭据**。
6. 新功能必须有 Vitest 测试；后端放 `backend/test/<module>/`，前端放同目录 `__tests__/`。
7. 注释与文档使用**简体中文**。
8. **worktree 清理纪律**:删除 worktree 前先停掉其目录内运行的 dev server / 进程,并关闭停在其中的终端、IDE(如 CodeBuddy);禁止 `git add` 含 `.git` 的嵌套目录(会被误记为 gitlink 160000)。详见 [`git-worktree.md`](git-worktree.md)。

## 8. 文档地图

| 文档 | 用途 |
| --- | --- |
| [`git-worktree.md`](git-worktree.md) | Git Worktree 使用指南（布局、创建、清理、Windows 踩坑） |
| [`backend/doc/API_INVENTORY.md`](backend/doc/API_INVENTORY.md) | 全量接口清单（改接口先看这里） |
| [`backend/doc/ARCHITECTURE.md`](backend/doc/ARCHITECTURE.md) | 分层、模块职责、数据流 |
| [`backend/doc/CONVENTIONS.md`](backend/doc/CONVENTIONS.md) | 命名、错误处理、SQL、测试规范 |
| [`backend/doc/PLAYBOOK.md`](backend/doc/PLAYBOOK.md) | 常见开发任务处方 |
| [`backend/doc/SETUP.md`](backend/doc/SETUP.md) | 安装、启动、环境变量 |
| [`frontend/doc/API_INVENTORY.md`](frontend/doc/API_INVENTORY.md) | 前端调用契约与错误码处理 |
| [`frontend/doc/ARCHITECTURE.md`](frontend/doc/ARCHITECTURE.md) | 目录分层、路由守卫、状态管理 |
| [`frontend/doc/CONVENTIONS.md`](frontend/doc/CONVENTIONS.md) | 组件、命名、样式、测试规范 |
| [`frontend/doc/PLAYBOOK.md`](frontend/doc/PLAYBOOK.md) | 常见开发任务处方 |
| [`frontend/doc/SETUP.md`](frontend/doc/SETUP.md) | 安装、启动、环境变量、代理 |
