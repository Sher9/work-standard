# work-standard

面向金融机构内部使用的**知识库管理系统**：按分类树组织文档，支持富文本内容与 PDF 附件、文档状态审核流转、版本留痕、收藏与检索。

## 功能概览

| 模块 | 说明 |
| --- | --- |
| 分类管理 | 树形分类，支持拖拽排序与自定义图标 |
| 文档管理 | 富文本内容 + PDF 附件上传，支持版本留痕 |
| 状态流转 | 草稿 → 待审 → 通过/驳回等审核流程 |
| 检索 | 按标题/内容/分类检索文档 |
| 收藏 | 普通用户收藏常用文档 |

两种角色：

- `admin`（管理员）：分类管理、文档维护、上传 PDF、驱动状态流转
- `user`（普通用户）：浏览 / 搜索 / 阅读文档、收藏

## 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | Vue 3（`<script setup>` + TS）· Vite 5 · Pinia · Vue Router 4 · Element Plus · Vitest |
| 后端 | Node.js · TypeScript（CommonJS）· Express 5 · pg（原生 SQL）· Vitest |
| 数据库 | PostgreSQL 16 |
| 规范流程 | OpenSpec |

无 ORM、无查询构造器，所有数据访问都是 `pool.query` 手写 SQL。

## 目录结构

```text
work-standard/
├── AGENTS.md              # AI 编码助手必读的全局约定
├── git-worktree.md        # Git Worktree 使用指南
├── docker-compose.yml     # 一键起 db / backend / frontend
├── openspec/              # OpenSpec 规范与变更
├── backend/
│   ├── db/schema.sql      # 建表 + 幂等示例数据
│   ├── src/               # 按领域模块划分的源码
│   ├── test/              # Vitest 测试
│   ├── uploads/           # PDF 上传落盘目录
│   └── doc/               # 后端文档
└── frontend/
    ├── src/               # views / components / stores / api
    └── doc/               # 前端文档
```

## 快速开始

### 方式一：Docker Compose（推荐）

```bash
docker compose up -d
```

启动后：前端 <http://localhost:5173>，后端 <http://localhost:3000>。

### 方式二：本地开发

需要本地已有 PostgreSQL（或先用 compose 只起 db：`docker compose up -d db`）。

```bash
# 1. 后端
cd backend
npm install
npm run dev            # tsx watch src/index.ts :3000

# 2. 前端（另开终端）
cd frontend
npm install
npm run dev            # vite :5173
```

前端已配置 `/api` → `3000` 代理，后端启动时会自动建表并写入演示账号。

### 演示账号

| 工号 | 密码 | 角色 |
| --- | --- | --- |
| `E10001` | `admin123` | admin |
| `E10002` | `user123` | user |

## 常用命令

```bash
# 后端（backend/）
npm run dev        # 开发热重载
npm run build      # tsc 编译到 dist/
npm start          # 运行编译产物
npm run typecheck  # tsc --noEmit
npm test           # vitest run

# 前端（frontend/）
npm run dev        # 开发服务器
npm run build      # vue-tsc -b && vite build
npm run preview    # 预览构建产物
npm test           # vitest run
```

## 开发约定

- **改任何功能前先确认是否有对应的 OpenSpec change**，流程见 `AGENTS.md` 第 5 节
- 前端常量 `frontend/src/constants/docFlow.ts` 的 `DOC_TRANSITIONS` 必须与后端 `backend/src/document/document.types.ts` 的 `TRANSITIONS` 保持一致
- 数据库变更只改 `backend/db/schema.sql`，且必须幂等
- 不引入 ORM / 查询构造器，延续 `pool.query` 手写 SQL
- 新增接口默认需要 `requireAuth`，写操作按需加 `requireRole('admin')`
- 前端唯一 HTTP 出口是 `frontend/src/api/client.ts`，禁止在组件里直接 `fetch` / axios
- 新功能必须有 Vitest 测试；注释与文档使用**简体中文**

## 分支与协作

本项目采用 **OpenSpec + Git Worktree** 开发：所有代码修改都在 `worktrees/` 目录下的 worktree 中进行，主仓库（`main`）只负责合并与发布。

```bash
# 不新建分支，以 detached HEAD 创建（本项目采用）
git worktree add --detach worktrees/login main

# 或新建功能分支
git worktree add -b login worktrees/login main
```

`worktrees/` 已在 `.gitignore` 中忽略。完整用法、合并与清理流程见 [git-worktree.md](git-worktree.md)。

## 文档地图

| 文档 | 用途 |
| --- | --- |
| [AGENTS.md](AGENTS.md) | AI 编码助手必读的全局约定与 OpenSpec 流程 |
| [git-worktree.md](git-worktree.md) | Git Worktree 完整使用指南 |
| [backend/doc/INDEX.md](backend/doc/INDEX.md) | 后端文档总入口 |
| [frontend/doc/INDEX.md](frontend/doc/INDEX.md) | 前端文档总入口 |
| [backend/doc/API_INVENTORY.md](backend/doc/API_INVENTORY.md) | 全量接口清单 |
| [backend/doc/ARCHITECTURE.md](backend/doc/ARCHITECTURE.md) | 后端分层、模块职责、数据流 |
| [backend/doc/CONVENTIONS.md](backend/doc/CONVENTIONS.md) | 后端命名、错误处理、SQL、测试规范 |
| [backend/doc/PLAYBOOK.md](backend/doc/PLAYBOOK.md) | 后端常见开发任务处方 |
| [backend/doc/SETUP.md](backend/doc/SETUP.md) | 后端安装、启动、环境变量 |
| [frontend/doc/API_INVENTORY.md](frontend/doc/API_INVENTORY.md) | 前端调用契约与错误码处理 |
| [frontend/doc/ARCHITECTURE.md](frontend/doc/ARCHITECTURE.md) | 前端目录分层、路由守卫、状态管理 |
| [frontend/doc/CONVENTIONS.md](frontend/doc/CONVENTIONS.md) | 前端组件、命名、样式、测试规范 |
| [frontend/doc/PLAYBOOK.md](frontend/doc/PLAYBOOK.md) | 前端常见开发任务处方 |
| [frontend/doc/SETUP.md](frontend/doc/SETUP.md) | 前端安装、启动、环境变量、代理 |

## 环境变量

后端支持 `.env` 配置（参考 `backend/.env.example`）：

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `PORT` | 后端监听端口 | `3000` |
| `DATABASE_URL` | PostgreSQL 连接串 | 见 `backend/.env.example`（默认注释，按需取消注释） |
| `JWT_SECRET` | JWT 签名密钥 | 见 `backend/.env.example`（默认注释，按需配置） |

> `.env` 与 `uploads/` 含真实凭据与用户文件，禁止提交。
