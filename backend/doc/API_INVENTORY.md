# 后端接口清单（API Inventory）

> 唯一权威来源是代码。本文与代码冲突时，**以代码为准并回来修正本文**。
> 所有接口前缀均为 `/api`。除标注「公开」外，全部需要 `Authorization: Bearer <token>`。

## 通用约定

**请求**

- JSON 接口：`Content-Type: application/json`，body 上限 `10mb`
- 文件上传：`multipart/form-data`，字段名 `file`，限 PDF，≤ 20MB

**鉴权**

```http
Authorization: Bearer <token>
```

`src/common/auth.ts` 的 `requireAuth` 也接受 `?token=<token>`，用于 `<a>` / `<iframe>` 无法带 header 的场景（如 PDF 预览）。

**成功响应**：直接返回业务对象或数组（无包裹层）。

**错误响应**（`src/middleware/errorHandler.ts` 统一产出）：

```json
{ "code": "UNAUTHORIZED", "message": "未登录或登录已过期" }
```

| HTTP | code | 触发场景 |
| --- | --- | --- |
| 400 | `BAD_REQUEST` | 参数缺失、文件格式不符 |
| 401 | `UNAUTHORIZED` | 未登录 / token 失效 |
| 401 | `INVALID_CREDENTIALS` | 工号或密码错误 |
| 403 | `FORBIDDEN` | 角色不足（非 admin 调写接口） |
| 404 | `NOT_FOUND` | 资源不存在 |
| 500 | `INTERNAL_ERROR` | 未捕获异常 |

---

## 健康检查

| 方法 | 路径 | 权限 | 响应 |
| --- | --- | --- | --- |
| GET | `/api/health` | 公开 | `{ status: 'ok', timestamp: ISO8601 }` |

## 认证 `/api/auth`

| 方法 | 路径 | 权限 | 请求体 | 响应 |
| --- | --- | --- | --- | --- |
| POST | `/api/auth/login` | 公开 | `{ employeeNo, password }` | `{ token, employee: { employee_no, name, role } }` |
| GET | `/api/auth/me` | 登录 | — | `{ employee: { employee_no, name, role } }` |
| POST | `/api/auth/logout` | 登录 | — | `{ message: '已退出登录' }` |

- `employeeNo` 或 `password` 为空 → 400 `BAD_REQUEST`
- 凭据错误 → 401 `INVALID_CREDENTIALS`
- token 有效期 **7 天**（`auth.service.ts` 的 `TOKEN_TTL_DAYS`），存 `auth_token` 表，登出即从库删除

## 分类 `/api/categories`

| 方法 | 路径 | 权限 | 请求 | 响应 |
| --- | --- | --- | --- | --- |
| GET | `/api/categories/tree` | 登录 | — | 分类树 `CategoryNode[]`（含 `children`） |
| GET | `/api/categories/search` | 登录 | `?q=关键词` | 命中的分类数组 |
| GET | `/api/categories/:id` | 登录 | — | 分类详情 |
| POST | `/api/categories` | **admin** | 分类对象 | 201 + 新建分类 |
| PUT | `/api/categories/sort` | **admin** | `{ items: [...] }` | `{ message: '排序已保存' }` |
| PUT | `/api/categories/:id` | **admin** | `{ name, icon }` | 更新后的分类 |
| DELETE | `/api/categories/:id` | **admin** | — | 删除结果 |

> `PUT /sort` 必须定义在 `PUT /:id` **之前**，否则 `sort` 会被当作 `:id` 匹配。

## 文档 `/api/documents`

| 方法 | 路径 | 权限 | 请求 | 响应 |
| --- | --- | --- | --- | --- |
| GET | `/api/documents` | 登录 | `?view=`（视图筛选） | 文档列表 |
| GET | `/api/documents/search` | 登录 | `?q=关键词` | 命中的文档数组 |
| GET | `/api/documents/:id/read` | 登录 | — | 文档详情（阅读态，累加 `read_count`） |
| GET | `/api/documents/:id` | 登录 | — | 文档详情 |
| POST | `/api/documents` | **admin** | `DocumentInput` | 201 + 新建文档 |
| PUT | `/api/documents/:id` | **admin** | `DocumentInput` | 更新后的文档 |
| PATCH | `/api/documents/:id/status` | **admin** | `{ status }` | 更新后的文档（直接改状态，不走流转记录） |
| POST | `/api/documents/:id/transition` | **admin** | `{ action, comment?, operatorId? }` | 流转结果 |
| GET | `/api/documents/:id/status-logs` | 登录 | — | `StatusLogRow[]` |
| DELETE | `/api/documents/:id` | **admin** | — | 删除结果 |

> `/search`、`/:id/read` 必须定义在 `/:id` 之前，否则会被 `:id` 抢先匹配。

**`DocumentInput`**（`src/document/document.types.ts`）：

```ts
{
  categoryId?: number | null;
  title?: string;
  contentHtml?: string;      // 富文本内容
  fileId?: number | null;    // PDF 附件 id，传 null 解除关联
  tags?: string;             // 逗号分隔
  authorId?: string | null;
  status?: DocStatus;
}
```

**状态流转 `POST /:id/transition`**

`action` 取值与允许的当前状态：

| action | from | to | 说明 |
| --- | --- | --- | --- |
| `submit` | `draft`, `rejected` | `pending` | 提交审核 |
| `approve` | `pending` | `approved` | 通过 |
| `reject` | `pending` | `rejected` | 驳回，**必须带 `comment`** |
| `complete` | `approved` | `completed` | 完成 |
| `publish` | `approved`, `completed` | `published` | 发布 |
| `archive` | `published`, `completed` | `archived` | 归档 |

每次流转写入 `document_status_log`（`from_status`、`to_status`、`action`、`comment`、`operator_id`）。
`operatorId` 由 controller 从 `req.user.employeeNo` 注入。

**状态枚举**：`draft` `pending` `approved` `rejected` `completed` `published` `archived`

## 文档版本 `/api/documents/:documentId/versions`

| 方法 | 路径 | 权限 | 请求 | 响应 |
| --- | --- | --- | --- | --- |
| GET | `/api/documents/:documentId/versions` | 登录 | — | 版本列表 |
| POST | `/api/documents/:documentId/versions` | **admin** | `{ versionNo, contentSnapshot, changeSummary }` | 201 + 新版本 |
| PUT | `/api/documents/:documentId/versions/:id` | **admin** | `{ contentSnapshot, changeSummary }` | 更新后的版本 |
| DELETE | `/api/documents/:documentId/versions/:id` | **admin** | — | 删除结果 |

`doc_version` 有 `UNIQUE (document_id, version_no)`，同文档下版本号不可重复。

## 收藏 `/api/favorites`

| 方法 | 路径 | 权限 | 请求 | 响应 |
| --- | --- | --- | --- | --- |
| GET | `/api/favorites` | 登录 | — | 当前用户收藏列表 |
| POST | `/api/favorites` | 登录 | `{ documentId }` | 201 `{ message: '收藏成功' }` |
| DELETE | `/api/favorites/:documentId` | 登录 | — | `{ message: '取消收藏成功' }` |

归属用户取 `req.user.employeeNo`，不接受前端传用户标识。`favorite` 表有 `UNIQUE (employee_no, document_id)`。

## 文件 `/api/files`

| 方法 | 路径 | 权限 | 请求 | 响应 |
| --- | --- | --- | --- | --- |
| POST | `/api/files/upload` | **admin** | `multipart/form-data`，字段 `file`，限 PDF ≤20MB | 201 + `FileMeta` |
| GET | `/api/files/:id/preview` | 登录 | — | 文件流，`Content-Disposition: inline` |

- 落盘目录：`process.cwd()/uploads`（`file.service.ts` 的 `UPLOAD_DIR`）
- 响应头做了中文文件名兼容：`filename="<encoded>"; filename*=UTF-8''<encoded>`
- 非 PDF 或超限 → 400

---

## 路由挂载顺序（`src/routes/index.ts`）

```text
/api
├── /health                              公开
├── /auth                                公开（/me、/logout 自带 requireAuth）
├── requireAuth  ← 以下全部需要登录
├── /categories
├── /documents
├── /favorites
├── /files
└── /documents/:documentId/versions      ← 必须在 /documents 之后，且子路由 mergeParams: true
```

新增业务路由请挂到 `requireAuth` 之后，不要放在 `src/routes/index.ts` 的上半部分。

## 数据模型速查（`db/schema.sql`）

| 表 | 关键字段 |
| --- | --- |
| `employee` | `employee_no`(PK) `name` `password`(scrypt) `role(admin\|user)` |
| `auth_token` | `token`(PK) `employee_no` `role` `expires_at` |
| `category` | `id` `name` `parent_id`(自引用) `sort_order` `icon` `level` |
| `file_meta` | `id` `filename` `path` `mime_type` |
| `document` | `id` `category_id` `title` `content_html` `tags` `author_id` `file_id` `status` `read_count` |
| `doc_version` | `id` `document_id` `version_no` `content_snapshot` `change_summary` `editor_id` |
| `document_status_log` | `id` `document_id` `from_status` `to_status` `action` `comment` `operator_id` |
| `favorite` | `id` `employee_no` `document_id`（联合唯一） |
