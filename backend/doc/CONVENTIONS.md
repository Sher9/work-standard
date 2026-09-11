# 后端开发规范

## 1. 文件与命名

**领域模块结构**（新建模块照抄）：

```text
src/<module>/
├── <module>.controller.ts   # 路由与 HTTP 语义
├── <module>.service.ts      # 业务规则
├── <module>.repository.ts   # SQL
└── <module>.types.ts        # 类型与常量
```

| 对象 | 规则 | 例 |
| --- | --- | --- |
| 目录 / 文件 | kebab-case | `doc-version/doc-version.service.ts` |
| 路由导出 | `<name>Router` | `export const documentRouter = Router()` |
| 函数 | camelCase | `listDocuments`、`requireRole` |
| 类型 / 接口 | PascalCase | `DocumentRow`、`TransitionInput` |
| 常量 | UPPER_SNAKE | `TOKEN_TTL_DAYS`、`MAX_SIZE` |
| 数据库表 / 字段 | **snake_case** | `document_status_log`、`read_count` |
| TS 侧字段 | camelCase（在 repository 边界转换） | `contentHtml`、`changeSummary` |

**数据库行类型保持 snake_case 与表一致**（如 `DocumentRow.category_id`），对外输入/输出用 camelCase（如 `DocumentInput.categoryId`）。转换发生在 service 层。

## 2. 分层纪律

- `controller` 只做：读 `req`、基础校验、调 `service`、写响应状态码。**不写 SQL、不写业务判断**
- `service` 只做：业务规则、状态机、权限语义，抛 `errorApp`。**不碰 `req`/`res`**
- `repository` 只做：拼 SQL、调 `pool.query`、返回行。**不做 if 业务判断、不抛 HTTP 错误**
- 跨模块调用只依赖对方的 `service`，不要直接 import 别人的 `repository`

## 3. 路由

- 精确路径必须定义在参数路径之前：

  ```ts
  documentRouter.get('/search', ...);   // ✅ 先
  documentRouter.get('/:id/read', ...); // ✅ 先
  documentRouter.get('/:id', ...);      // ✅ 后
  ```

- 写操作按最小权限加 `requireRole('admin')`
- 新增业务路由一律挂到 `src/routes/index.ts` 中 `router.use(requireAuth)` **之后**
- 子路由需要父级参数时：`Router({ mergeParams: true })`（参考 `doc-version`）

## 4. 错误处理

- 只通过 `errorApp(statusCode, message, code)` 抛错
- 异步 handler 必须 `try { } catch (err) { next(err) }`
- 状态码语义：400 参数 / 401 未登录 / 403 无权限 / 404 不存在 / 409 冲突 / 500 未知
- 自定义 `code` 用大写下划线：`BAD_REQUEST` `INVALID_CREDENTIALS` `FORBIDDEN` `NOT_FOUND`
- **不要**在 service 里直接 `res.status(...)` 或 `res.json(...)`

## 5. 数据库

- **只用 `pool.query` 手写 SQL**，不引入 ORM / 查询构造器
- 参数一律占位符 `$1, $2`，**禁止字符串拼接**（防注入）
- 建表/改表只改 `db/schema.sql`，且必须幂等：

  ```sql
  CREATE TABLE IF NOT EXISTS ...
  ALTER TABLE ... DROP CONSTRAINT IF EXISTS ...
  INSERT ... SELECT ... WHERE NOT EXISTS (...)
  ```

- 有外键依赖时注意 `ON DELETE`：`document.category_id` 是 `RESTRICT`，`doc_version`/`favorite`/`document_status_log` 是 `CASCADE`
- 时间字段用 `TIMESTAMPTZ`
- 需要唯一性就加约束（如 `UNIQUE (document_id, version_no)`），不要只在应用层判断

## 6. 认证与权限

- 受保护接口不要重复解析 header，直接用 `req.user!.employeeNo`
- 数据归属取服务端身份，不信任前端传的用户标识
- 新增需要登录的路由，挂到 `requireAuth` 之后即可，无需逐个加中间件

## 7. 密码

- 只用 `src/common/password.ts` 的 scrypt 相关函数，**禁止明文存密码、禁止 MD5/SHA**
- 演示账号由 `auth.service.seedEmployees()` 写入，不写死在 `schema.sql` 里

## 8. 内容与文件名安全

- 富文本内容入库前过 `src/common/sanitize.ts`
- 上传文件名只保留安全后缀，中文名需做 UTF-8 解码兼容（见 `file.service.ts`）

## 9. TypeScript

- `strict` 生效，避免 `any`；第三方回调确需时用 `unknown` 再收窄
- 对外暴露行类型（如 `DocumentRow`），不要用 `Record<string, unknown>` 糊过去
- 提交前跑 `npm run typecheck`

## 10. 测试

- 框架 Vitest，命令 `npm test`
- 位置：`test/<module>/<目标>.test.ts`
- 应用级测试用 `createApp()` + supertest，**不要 `listen`**
- 涉及 DB 的测试依赖 `test/globalSetup.ts`
- 每个 bug 修复补一条回归用例

## 11. 注释与提交

- 注释用**简体中文**；给模块/文件头写一段职责说明
- 非显而易见的规则要写原因（如路由顺序、幂等要求）
- 提交信息建议 Conventional Commits：`feat:` `fix:` `refactor:` `docs:` `test:` `chore:`
- 改接口同步更新 `doc/API_INVENTORY.md`；改状态机同步前端 `constants/docFlow.ts`

## 12. 禁止事项

- 禁止在 `app.ts` 里 `listen`
- 禁止引入 ORM、Redis、消息队列等未在本文件登记的新基础设施（需先提 OpenSpec change）
- 禁止把 `uploads/` 与真实凭据提交进仓库
- 禁止用 `console.log` 输出敏感信息（token、密码、完整连接串）
