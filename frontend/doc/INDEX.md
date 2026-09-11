# 前端文档地图

金融知识库前端：Vue 3 + TypeScript + Vite + Element Plus + Pinia。

## 文档索引

| 文档 | 什么时候读 |
| --- | --- |
| [API_INVENTORY.md](API_INVENTORY.md) | **最重要**。调后端接口、处理错误、加请求时必读 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 新增页面/组件、理解路由守卫与状态管理时读 |
| [CONVENTIONS.md](CONVENTIONS.md) | 写代码前读：组件、命名、样式、测试约定 |
| [PLAYBOOK.md](PLAYBOOK.md) | 做具体任务时的分步处方（新页面/新接口/新状态/表单） |
| [SETUP.md](SETUP.md) | 首次启动、代理不通、环境变量问题时读 |

## 30 秒速览

- 入口：`src/main.ts`（Pinia + Router + Element Plus，并 `restore()` 登录态）
- **HTTP 唯一出口：`src/api/client.ts`**，禁止组件里直接 `fetch`
- 页面：`src/views/`（7 个路由级页面）
- 组件：`src/components/`（9 个）
- 状态：`src/stores/employee.ts`（登录态）、`src/stores/catalog.ts`（分类树）
- 路由：`src/router/index.ts`，全局 `beforeEach` 做登录与角色守卫
- 常量：`src/constants/docFlow.ts`（文档状态机，与后端镜像）、`categoryIcons.ts`
- 测试：Vitest + jsdom，测试放同目录 `__tests__/`

## 路由一览

| 路径 | 页面 | 权限 |
| --- | --- | --- |
| `/login` | LoginView | 公开 |
| `/documents` | DocumentList | 登录 |
| `/search` | SearchView | 登录 |
| `/read/:id` | DocumentRead | 登录 |
| `/favorites` | FavoriteList | 登录 |
| `/admin/documents` | DocumentManageView | **admin** |
| `/admin/categories` | CategoryManageView | **admin** |

## 关键约定

1. **所有请求走 `api/client.ts`**，它会统一处理鉴权头、401 跳转、错误解析
2. **Token 存 `localStorage['kb_auth']`**，由 `stores/employee.ts` 的 `persist()` / `restore()` 管理
3. **`constants/docFlow.ts` 是后端状态机的镜像**，改后端 `TRANSITIONS` 必须同步改这里
4. 组件统一用 `<script setup lang="ts">`
5. 路径别名 `@` → `src`
