# 后端常见任务处方

按场景抄作业。每节给出要动的文件与顺序。

---

## 1. 新增一个领域模块（如 `tag`）

```bash
mkdir -p src/tag
```

1. `src/tag/tag.types.ts` —— 定义行类型 `TagRow`、输入类型 `TagInput`
2. `src/tag/tag.repository.ts` —— 只写 SQL：

   ```ts
   import { query } from '../db/pool';
   export function listTags(): Promise<TagRow[]> {
     return query<TagRow>('SELECT * FROM tag ORDER BY id');
   }
   ```

3. `src/tag/tag.service.ts` —— 业务规则，抛 `errorApp`
4. `src/tag/tag.controller.ts` —— 导出 `export const tagRouter = Router()`
5. 挂路由：`src/routes/index.ts`，**放在 `router.use(requireAuth)` 之后**

   ```ts
   import { tagRouter } from '../tag/tag.controller';
   router.use('/tags', tagRouter);
   ```

6. 建表：`db/schema.sql` 追加 `CREATE TABLE IF NOT EXISTS tag (...)`
7. 补测试 `test/tag/*.test.ts`
8. 更新 `doc/API_INVENTORY.md`

---

## 2. 给已有模块加一个接口

以「文档置顶」为例：

1. `document.repository.ts` 加 SQL（参数用 `$1`）
2. `document.service.ts` 加业务函数，非法输入抛 `errorApp(400, ...)`
3. `document.controller.ts` 加路由；需要管理员就加 `requireRole('admin')`
4. 注意路径顺序：精确路径写在 `/:id` 之前
5. `doc/API_INVENTORY.md` 补一行
6. 补测试

---

## 3. 加数据库字段

1. `db/schema.sql` 追加幂等 DDL：

   ```sql
   ALTER TABLE document ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false;
   ```

2. 同步类型：`document.types.ts` 的 `DocumentRow` 加 `pinned: boolean`
3. 如需对外读写：在 `DocumentInput` 加 camelCase 字段，并在 service 做 camelCase ↔ snake_case 映射
4. `repository` 的 `INSERT`/`UPDATE` 语句加上该列
5. 若有示例数据需求，用 `INSERT ... WHERE NOT EXISTS` 保持幂等
6. 重启服务即生效（`initSchema()` 每次启动执行）

---

## 4. 修改文档状态机

**必须前后端同步，否则前端按钮与实际状态错乱。**

1. 后端 `src/document/document.types.ts`：
   - 更新 `DocStatus` / `DOC_STATUSES`
   - 更新 `DOC_STATUS_LABELS`
   - 更新 `TRANSITIONS`（`from` / `to` / `label` / `requireComment`）
2. 后端 `db/schema.sql`：`document_status_check` 约束需包含新状态
3. 后端 `document.service.ts`：校验逻辑与日志写入
4. 前端 `frontend/src/constants/docFlow.ts`：同步 `DOC_STATUS_LABELS` 与 `DOC_TRANSITIONS`
5. 更新 `doc/API_INVENTORY.md` 的流转表
6. 补测试：合法流转、非法流转、驳回缺意见

---

## 5. 新增管理员专属接口

```ts
import { requireRole } from '../common/auth';

router.post('/', requireRole('admin'), async (req, res) => {
  const created = await service.create(req.body);
  res.status(201).json(created);
});
```

该路由必须挂在 `requireAuth` 之后（`requireRole` 依赖 `req.user`）。

---

## 6. 增加文件上传类型（当前只允许 PDF）

1. `file.service.ts` 的 `fileFilter` 放宽 mimetype / 扩展名判断
2. `MAX_SIZE` 按需调整（当前 20MB）
3. `safeExt()` 的白名单同步放行
4. 预览的 `Content-Disposition` 已处理中文名，无需改动
5. 更新 `doc/API_INVENTORY.md`

---

## 7. 排查「接口返回 401」

按顺序查：

1. 请求是否带 `Authorization: Bearer <token>`（注意 Bearer 后有空格）
2. token 是否过期（TTL 7 天）或从 `auth_token` 表被删除
3. 路由是否挂在 `requireAuth` 之前（那样 `req.user` 为空）
4. PDF 预览场景是否漏了 `?token=`
5. 前端 401 会自动清 `localStorage` 并跳 `/login`，看是否由此造成「闪退」

---

## 8. 排查「接口返回 403」

`requireRole('admin')` 未通过。确认当前账号角色：

```sql
SELECT employee_no, role FROM employee;
```

演示账号 `E10001` 是 admin，`E10002` 是 user。

---

## 9. 排查启动失败

```text
[Bootstrap] 数据库初始化失败
```

1. PostgreSQL 是否运行、端口 5432 是否通
2. `DATABASE_URL` 是否正确（默认库名 `knowledge`）
3. 库是否存在：`createdb knowledge`
4. 工作目录是否是 `backend/`——`initSchema` 用 `resolve(process.cwd(), 'db', 'schema.sql')`

---

## 10. 跑测试

```bash
npm test                      # 全量
npx vitest run test/auth      # 单目录
npx vitest run -t "关键字"     # 按用例名
npm run typecheck             # 只做类型检查
```

---

## 11. 改动影响前端时

必做清单：

1. 更新 `doc/API_INVENTORY.md`
2. 若响应结构变化 → 同步 `frontend/src/api/client.ts` 的类型与 `frontend/doc/API_INVENTORY.md`
3. 若状态机变化 → 同步 `frontend/src/constants/docFlow.ts`
4. 前端跑 `npm run build`（含 `vue-tsc` 类型检查）确认没断

---

## 12. 引入新依赖或新基础设施

属于架构变更，**先提 OpenSpec change**：

```text
/opsx:propose add-redis-cache
```

评审通过后再实施。不要直接 `npm install` 后开写。
