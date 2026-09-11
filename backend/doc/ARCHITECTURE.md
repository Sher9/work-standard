# 后端架构

## 1. 分层

```text
HTTP 请求
   │
   ▼
middleware（cors / express.json / errorHandler）
   │
   ▼
routes/index.ts ──── requireAuth ────► 各领域 controller
   │
   ▼
controller   解析 req、做入参校验、转调 service、决定 HTTP 状态
   │
   ▼
service      业务规则、状态机、事务语义、抛 errorApp
   │
   ▼
repository   只写 SQL，返回行数据，不含业务判断
   │
   ▼
db/pool.js   pg.Pool
```

依赖方向**严格单向**：`controller → service → repository → pool`。
不允许 `repository` 调 `service`，不允许 `service` 直接摸 `req/res`。

## 2. 启动链路

`src/index.ts`：

```text
dotenv.config()
  → initSchema()        读取 db/schema.sql 并 pool.query()（幂等）
  → seedEmployees()     写入 E10001/E10002 演示账号（已存在则跳过）
  → app.listen(PORT)    默认 3000
```

任一步失败：打印 `[Bootstrap] 数据库初始化失败` → `closePool()` → `process.exit(1)`。

**`src/app.ts` 只导出 `createApp()` 与一个默认实例，绝不在此 `listen`**，否则测试会占用端口。

## 3. 模块职责

| 模块 | 文件 | 职责 |
| --- | --- | --- |
| `auth/` | controller / service / repository / types | 登录、token 签发与校验、当前用户、登出、演示账号播种 |
| `catalog/` | controller / service / repository / types | 分类树、检索、增删改、排序 |
| `document/` | controller / service / repository / types | 文档 CRUD、搜索、状态直接修改、状态流转、流转日志 |
| `doc-version/` | controller / service | 文档版本列表与维护 |
| `favorite/` | controller / service | 收藏增删查（按 `employeeNo` 归属） |
| `file/` | controller / service / repository / types | PDF 上传（multer）、落盘 `uploads/`、预览流 |
| `search/` | `search.highlight.ts` / `search.types.ts` | 搜索命中高亮相关工具 |
| `common/` | `auth.ts` / `password.ts` / `sanitize.ts` / `EmployeeConstant.ts` | 鉴权中间件、scrypt 口令、内容清洗、常量 |
| `middleware/` | `errorHandler.ts` | `errorApp()` 造错、`errorHandler` 统一响应 |
| `db/` | `pool.ts` / `init.ts` | 连接池与 `query()` 泛型封装、schema 初始化 |
| `routes/` | `index.ts` / `health.ts` | 路由聚合与健康检查 |

## 4. 鉴权数据流

```text
POST /api/auth/login {employeeNo, password}
   → auth.service.login
       → repository.findByNo(employeeNo)
       → common/password.verifyPassword(明文, scrypt哈希)
       → randomBytes(24).hex 生成 token，TTL 7 天
       → auth_token 表持久化
   → 返回 { token, employee }
```

前端存 `localStorage['kb_auth']`，后续请求带 `Authorization: Bearer <token>`。

```text
任意受保护请求
   → common/auth.requireAuth
       → 取 Bearer token；无则回退 ?token=
       → auth.service.verifyToken(token)（查 auth_token 并校验 expires_at）
       → 挂 req.user = { employeeNo, name, role } 与 req.authToken
   → requireRole('admin') 可选二次校验 → 403 FORBIDDEN
```

`src/common/auth.ts` 通过 `declare global` 扩展了 `Express.Request`，新增 `user?` 与 `authToken?`。
业务代码直接用 `req.user!.employeeNo`，**不要自己再解析 header**。

## 5. 文档状态机

定义于 `src/document/document.types.ts` 的 `TRANSITIONS`，是唯一权威：

```text
draft ──submit──► pending ──approve──► approved ──complete──► completed
  ▲                  │                    │                      │
  │               reject              publish                  publish
  │                  │                    │                      │
  └──────────── rejected            published ◄───────────────────┘
                                           │
                          archive ◄── published / completed ──► archived
```

- 每次流转写一条 `document_status_log`
- `reject` 的 `requireComment: true`，`service` 需校验 `comment` 非空
- `PATCH /:id/status` 是**旁路**，直接改状态**不写日志**；正常业务应走 `POST /:id/transition`

> 前端 `frontend/src/constants/docFlow.ts` 是这份状态机的镜像，改这里必须同步改前端。

## 6. 文件上传链路

```text
POST /api/files/upload  (admin, multipart, 字段名 file)
   → multer(pdfUpload).single('file')
       storage: diskStorage → destination = <cwd>/uploads（自动 mkdir）
                              filename   = 唯一前缀 + 安全后缀
       limits:  fileSize 20MB
       fileFilter: mimetype === application/pdf 或 .pdf 结尾
   → file.service.saveUpload(req.file)
       → 解码原始文件名（兼容中文）→ repository.create(...) → file_meta 记录
   → 201 + FileMeta
```

预览：

```text
GET /api/files/:id/preview
   → resolvePreview(id) 取 path/mime/读流
   → Content-Disposition: inline; filename="..."; filename*=UTF-8''...
   → stream.pipe(res)
```

## 7. 错误处理

统一用 `errorApp(statusCode, message, code)` 抛错，由 `errorHandler` 收口：

```ts
throw errorApp(400, '工号和密码不能为空', 'BAD_REQUEST');
```

- `statusCode >= 500` 才 `console.error`
- 响应体永远是 `{ code, message }`
- 异步路由必须 `try/catch + next(err)`，或显式传 `next`（Express 5 对未捕获的 rejected promise 会打警告）

## 8. 配置与环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `3000` | 监听端口 |
| `DATABASE_URL` | `postgres://postgres:123456@localhost:5432/knowledge` | PostgreSQL 连接串 |

详见 [SETUP.md](SETUP.md)。

## 9. 测试布局

```text
test/
├── app.smoke.test.ts       # 用 createApp() 起内存实例跑冒烟
├── globalSetup.ts
├── helpers/
└── auth/ catalog/ common/ doc-version/ document/ favorite/ file/ search/
```

测试通过 `createApp()` 而非 `listen`，配合 supertest。数据库相关测试依赖 `globalSetup.ts`。

## 10. 已知约束与改进点

- 状态流转目前没有包在数据库事务里（`UPDATE document` 与 `INSERT document_status_log` 分离），高并发下可能不一致
- 搜索走 SQL `LIKE`，未引入全文索引
- `search/` 目前只有高亮与类型文件，尚未形成独立服务层
- `PATCH /:id/status` 与 `POST /:id/transition` 并存，容易绕过日志，建议收敛为后者
