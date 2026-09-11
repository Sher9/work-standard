# 前端接口契约（API Inventory）

> 后端全量接口见 [`../../backend/doc/API_INVENTORY.md`](../../backend/doc/API_INVENTORY.md)。
> 本文只写**前端这一侧**怎么用：唯一的 `client` 封装、已接入的接口、错误处理约定。

## 1. 唯一出口：`src/api/client.ts`

**硬性约定：任何请求都必须经过它，禁止在组件/页面里直接 `fetch` 或引入 axios。**

### 基础地址

```ts
const API_BASE = (import.meta.env.VITE_API_BASE as string) || '';
```

- 开发环境留空 → 走 Vite 代理（`/api` → `http://localhost:3000`，见 `vite.config.ts`）
- 跨域部署时在 `.env` 设置 `VITE_API_BASE=http://<后端主机>:3000`

### 导出的方法

| 方法 | 签名 | 用途 |
| --- | --- | --- |
| `apiGet` | `<T>(url) => Promise<T>` | GET |
| `apiPost` | `<T>(url, body?) => Promise<T>` | POST |
| `apiPut` | `<T>(url, body?) => Promise<T>` | PUT |
| `apiPatch` | `<T>(url, body?) => Promise<T>` | PATCH |
| `apiDelete` | `<T>(url) => Promise<T>` | DELETE |
| `apiUpload` | `<T>(url, formData) => Promise<T>` | 文件上传，**不设 Content-Type**（让浏览器补 multipart boundary） |
| `apiLogin` | `({employeeNo, password}) => Promise<LoginResult>` | 登录，内部调 `apiPost('/api/auth/login')` |
| `filePreviewUrl` | `(fileId) => string \| null` | 生成带 `?token=` 的 PDF 预览地址 |

### 自动完成的三件事

1. **注入鉴权头**：从 `localStorage['kb_auth']` 读 `token`，加 `Authorization: Bearer <token>`
2. **401 自动处理**：清除 `kb_auth`，若当前不在 `/login` 则跳转 `/login`
3. **错误归一化**：非 2xx 抛 `HttpError(status, code, message)`

```ts
export class HttpError extends Error {
  status: number;
  code: string;
}
```

## 2. 登录态存储

`localStorage` key = `kb_auth`，结构：

```json
{ "token": "...", "employeeNo": "E10001", "name": "管理员", "role": "admin" }
```

由 `stores/employee.ts` 管理：

- `login(payload)` 写入并 `persist()`
- `logout()` 清空并移除
- `main.ts` 启动时调用 `restore()` 恢复

**不要绕过 store 直接读写 `kb_auth`**。

## 3. 已接入的接口

### 认证

| 调用点 | 请求 |
| --- | --- |
| `views/LoginView.vue` | `apiLogin({ employeeNo, password })` → `POST /api/auth/login` |

### 分类

| 调用点 | 请求 |
| --- | --- |
| `stores/catalog.ts` | `apiGet('/api/categories/tree')` |
| `views/DocumentList.vue` | `apiGet('/api/categories/tree')` |
| `views/CategoryManageView.vue` | `tree` / `search?q=` / `:id` / 增改删（`apiPost` `apiPut` `apiDelete`） |
| `views/DocumentManageView.vue` | `apiGet('/api/categories/tree')` |

### 文档

| 调用点 | 请求 |
| --- | --- |
| `views/DocumentList.vue` | `apiGet('/api/documents?...')` |
| `views/SearchView.vue` | `apiGet('/api/documents/search?...')` |
| `views/DocumentRead.vue` | `apiGet('/api/documents/:id/read')` |
| `views/DocumentManageView.vue` | 列表 `?view=admin`、增改删、状态流转、流转日志 `:id/status-logs` |

### 收藏

| 调用点 | 请求 |
| --- | --- |
| `views/FavoriteList.vue` | `apiGet('/api/favorites')`、`apiDelete('/api/favorites/:documentId')` |
| `views/DocumentRead.vue` | `apiGet('/api/favorites')`、`apiPost`/`apiDelete` 收藏切换 |

### 文件

| 调用点 | 请求 |
| --- | --- |
| `components/DocumentForm.vue` | `apiUpload('/api/files/upload', fd)`，字段 `file` |
| `views/DocumentRead.vue` / `DocumentManageView.vue` / `components/DocumentForm.vue` | `filePreviewUrl(fileId)` → `/api/files/:id/preview?token=` |

### 版本

| 调用点 | 请求 |
| --- | --- |
| `components/DocumentVersions.vue` | `apiGet('/api/documents/:documentId/versions')`、新增/删除 |

## 4. 调用范式

**列表 + 加载态**

```ts
const docs = ref<Doc[]>([]);
const loading = ref(false);

async function load() {
  loading.value = true;
  try {
    docs.value = (await apiGet<Doc[]>('/api/documents')) || [];
  } catch (e) {
    ElMessage.error(e instanceof HttpError ? e.message : '加载失败');
  } finally {
    loading.value = false;
  }
}
```

**写操作**

```ts
try {
  await apiPost('/api/favorites', { documentId: id });
  ElMessage.success('收藏成功');
} catch (e) {
  if (e instanceof HttpError && e.status === 403) {
    ElMessage.warning('无权限执行该操作');
  } else {
    ElMessage.error(e instanceof HttpError ? e.message : '操作失败');
  }
}
```

**上传**

```ts
const fd = new FormData();
fd.append('file', rawFile);            // 字段名必须是 file
const uploaded = await apiUpload<UploadedFile>('/api/files/upload', fd);
```

> `apiUpload` 对 401 **不会**自动跳转（与 `request()` 不同路径），如需处理请自行 catch。

## 5. 错误码对照

后端统一返回 `{ code, message }`，前端通过 `HttpError` 拿到：

| status | code | 前端建议处理 |
| --- | --- | --- |
| 400 | `BAD_REQUEST` | 提示 `e.message`，通常是表单校验未过 |
| 401 | `UNAUTHORIZED` | client 已自动跳登录，一般无需处理 |
| 401 | `INVALID_CREDENTIALS` | 登录页提示「工号或密码错误」 |
| 403 | `FORBIDDEN` | 提示无权限，隐藏对应操作按钮 |
| 404 | `NOT_FOUND` | 提示资源不存在，返回列表 |
| 500 | `INTERNAL_ERROR` | 通用错误提示 |

## 6. 联动约定

- **改了后端响应结构** → 同步本文件与 `src/api/client.ts` 的类型
- **改了后端状态机** → 同步 `src/constants/docFlow.ts`（`DOC_STATUS_LABELS`、`DOC_TRANSITIONS`）
- **新增后端接口** → 在对应 view/component 里用 `client` 调用，并补一行到本文第 3 节
