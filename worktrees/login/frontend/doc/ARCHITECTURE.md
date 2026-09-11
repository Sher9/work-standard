# 前端架构

## 1. 分层

```text
main.ts
  └─ createApp(App)
       ├─ Pinia        （useEmployeeStore(pinia).restore() 恢复登录态）
       ├─ Router       （全局 beforeEach 守卫）
       └─ Element Plus （全量注册 @element-plus/icons-vue）

App.vue（布局壳：顶栏 + 导航 + 用户区）
  └─ RouterView（/login 时直接渲染，不带壳）
       └─ views/            路由级页面，负责取数与编排
            ├─ components/  可复用展示/表单组件
            ├─ stores/      Pinia 全局状态
            ├─ composables/ 可复用逻辑（useCategoryDrag）
            └─ api/client.ts  唯一 HTTP 出口
```

依赖方向：`views → components / stores / composables / constants → api/client`
**反向依赖禁止**：`api/client.ts` 不 import 任何 store 或组件。

## 2. 启动链路

```text
main.ts
  1. createApp(App) + createPinia()
  2. 全量注册 Element Plus 图标
  3. app.use(pinia).use(router).use(ElementPlus)
  4. useEmployeeStore(pinia).restore()   ← 从 localStorage['kb_auth'] 恢复登录
  5. app.mount('#app')
```

> `restore()` **必须在挂载前**执行，否则路由守卫首次判定会误判为未登录。

## 3. 路由与权限

`src/router/index.ts`，`createWebHistory`。

路由 meta：

| meta | 含义 |
| --- | --- |
| `public: true` | 无需登录（仅 `/login`） |
| `requiresAuth: true` | 需要登录 |
| `roles: ['admin']` | 角色白名单，不满足重定向 `/documents` |
| `title` | 页面标题 |

全局守卫逻辑：

```text
beforeEach(to)
  ├─ to.meta.public
  │    └─ 已登录且目标是 /login → 重定向 /documents
  ├─ 未登录 → /login?redirect=<原路径>
  └─ roles 不匹配 → /documents
```

页面全部**懒加载**（`() => import('../views/X.vue')`），仅 `LoginView` 同步引入。

**导航菜单**在 `App.vue` 的 `allMenus` 中维护，按 `roles` 过滤出 `visibleMenus`；`/login` 页面通过 `route.name === 'login'` 判断，不走布局壳。新增入口菜单要同时改这里和路由表。

## 4. 状态管理（Pinia）

| Store | 文件 | 职责 |
| --- | --- | --- |
| `employee` | `stores/employee.ts` | 登录态：`token` `employeeNo` `name` `role` `employeeId`；`isLoggedIn` getter；`login` / `logout` / `persist` / `restore` |
| `catalog` | `stores/catalog.ts` | 分类树 `tree`、`loading`、展开集合 `expandedIds`、`activeCategoryId`；`loadTree()` 调 `/api/categories/tree` |

- 持久化只做**登录态**（localStorage），分类树每次重新拉取
- `DEFAULT_EMPLOYEE_ID = 'E10001'`，未登录时的兜底值
- 其他页面级数据用组件内 `ref` 即可，**不要滥用 Pinia**

## 5. 视图与组件

**views（路由级）**

| 页面 | 职责 |
| --- | --- |
| `LoginView.vue` | 工号+密码登录，成功后按 `redirect` 跳回 |
| `DocumentList.vue` | 左侧分类树 + 右侧文档列表 |
| `SearchView.vue` | 关键词搜索，配合 `SearchHighlight.vue` 高亮 |
| `DocumentRead.vue` | 文档阅读，累加阅读数、PDF 预览、收藏切换 |
| `FavoriteList.vue` | 我的收藏 |
| `DocumentManageView.vue` | **admin**：文档 CRUD、状态流转、流转日志、版本 |
| `CategoryManageView.vue` | **admin**：分类树维护、拖拽排序、图标选择 |

**components（可复用）**

| 组件 | 职责 |
| --- | --- |
| `CategoryTree.vue` / `CategoryTreeNode.vue` | 递归分类树 |
| `CategoryIcon.vue` | 图标渲染（配合 `constants/categoryIcons.ts`） |
| `DocumentForm.vue` | 文档新增/编辑表单，含 PDF 上传 |
| `DocumentVersions.vue` | 版本列表与增删 |
| `PdfPreview.vue` | PDF 预览容器 |
| `SearchHighlight.vue` | 搜索关键词高亮 |
| `HelloWorld.vue` | 脚手架残留，可删 |

## 6. 关键数据流

**登录**

```text
LoginView → apiLogin() → store.login(payload)
                          ├─ 写入 token/name/role
                          └─ persist() → localStorage['kb_auth']
         → router.replace(redirect || '/documents')
```

**任意请求**

```text
component → apiGet('/api/...')
              → client 读 localStorage 加 Bearer
              → fetch(API_BASE + url)
              ├─ 401 → 清 kb_auth + 跳 /login
              ├─ 其他错误 → 抛 HttpError
              └─ 成功 → 解析 JSON 返回
```

**文档状态流转**（admin）

```text
DocumentManageView
  → 读 constants/docFlow.ts 的 availableActions(当前状态)
  → 渲染按钮（label / type / requireComment）
  → apiPost(`/api/documents/:id/transition`, { action, comment })
  → 后端校验并写 document_status_log
  → 刷新列表 + status-logs
```

## 7. 常量与状态机

`src/constants/docFlow.ts` 是**后端 `backend/src/document/document.types.ts` 中 `TRANSITIONS` 的镜像**：

```ts
DOC_STATUS_LABELS   // 状态 → 中文名
DOC_TRANSITIONS     // action → { from, to, label, requireComment, type }
availableActions(status)  // 算出当前状态可用按钮
statusText(status)        // 中文名
statusTagType(status)     // Element Plus Tag 语义色
```

`src/constants/categoryIcons.ts` 提供可选图标列表。

> **改后端状态机必须同步改这里**，否则按钮与实际可流转状态不一致。

## 8. 配置

| 项 | 位置 | 说明 |
| --- | --- | --- |
| 路径别名 `@` | `vite.config.ts` | 指向 `src` |
| dev 端口 | `vite.config.ts` | `5173` |
| API 代理 | `vite.config.ts` | `/api` → `http://localhost:3000`，`changeOrigin: true` |
| 测试环境 | `vite.config.ts` | jsdom，`globals: true`，`setupFiles: ./src/test/setup.ts` |
| API 基址 | `.env` | `VITE_API_BASE`，开发环境留空走代理 |

详见 [SETUP.md](SETUP.md)。

## 9. 测试布局

```text
src/
├── api/__tests__/
├── components/__tests__/
├── views/__tests__/
├── router/__tests__/
├── stores/__tests__/
└── test/setup.ts
```

Vitest + jsdom + `@vue/test-utils`。命令 `npm test`。

## 10. 已知问题

- `HelloWorld.vue` 是脚手架残留，建议删除
- `stores/catalog.ts` 与 `views/DocumentList.vue` / `CategoryManageView.vue` 各自拉分类树，存在重复请求，可收敛到 store
- `apiUpload` 未处理 401 跳转（与 `request()` 行为不一致）
- 目录内存在 `vitest-out.txt` / `vitest-err.txt` 调试产物，建议删除并加入 `.gitignore`
