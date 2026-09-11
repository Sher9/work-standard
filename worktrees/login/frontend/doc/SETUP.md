# 前端安装与启动

## 1. 前置条件

| 依赖 | 版本要求 | 说明 |
| --- | --- | --- |
| Node.js | ≥ 18（建议 20 LTS） | Vite 5 要求 |
| npm | 随 Node | |
| 后端服务 | 已启动在 `3000` | 不启动则所有 `/api` 请求失败 |

## 2. 安装

```bash
cd work-standard/frontend
npm install
```

## 3. 环境变量

在项目根目录创建 `.env`（可选）：

```env
VITE_API_BASE=
```

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `VITE_API_BASE` | 空 | API 基址。**开发环境留空**，走 Vite 代理 |

取值规则（`src/api/client.ts` 第一行）：

```ts
const API_BASE = (import.meta.env.VITE_API_BASE as string) || '';
```

- **留空**：请求相对路径 `/api/...`，由 Vite 代理转发到 `http://localhost:3000`（推荐）
- **填值**：如 `VITE_API_BASE=http://192.168.1.10:3000`，用于前后端不同机部署

> Vite 只暴露 `VITE_` 前缀的变量给客户端。
> 改 `.env` 需重启 dev server 才生效。

## 4. 启动

```bash
npm run dev        # 开发服务器 http://localhost:5173
npm run build      # vue-tsc -b && vite build（含类型检查）
npm run preview    # 预览构建产物
npm test           # vitest run
```

**启动顺序：先后端（3000），再前端（5173）。**

## 5. 代理配置

`vite.config.ts`：

```ts
server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
  },
}
```

因此前端代码里一律写 `/api/xxx`，**不要写死 `http://localhost:3000`**。

## 6. 路径别名

```ts
resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } }
```

`@` → `src`，例如 `@/api/client`、`@/components/DocumentForm.vue`。

## 7. 登录验证

1. 打开 `http://localhost:5173`，应自动跳 `/login`
2. 使用演示账号登录：

   | 工号 | 密码 | 角色 |
   | --- | --- | --- |
   | `E10001` | `admin123` | admin（可见「文档维护」「分类管理」） |
   | `E10002` | `user123` | user |

3. 登录态存在 `localStorage['kb_auth']`，刷新保持

## 8. 测试配置

`vite.config.ts` 的 `test` 段：

```ts
test: {
  environment: 'jsdom',
  globals: true,
  setupFiles: ['./src/test/setup.ts'],
}
```

测试文件放同目录 `__tests__/`。

## 9. 常见问题

| 现象 | 排查 |
| --- | --- |
| 页面一直跳 `/login` | 后端未启动 / 账号密码错 / `kb_auth` 被 401 清空 |
| `/api` 请求 404 | 后端没起，或代理配置被改 |
| CORS 报错 | 说明没走代理：检查 `VITE_API_BASE` 是否被设成了空以外的值 |
| 上传失败 | 非 PDF 或超过 20MB；字段名为 `file` |
| PDF 预览空白 | 用 `filePreviewUrl()` 拼 `?token=`，直接写路径会因无鉴权失败 |
| 改 `.env` 不生效 | 重启 dev server |
| 构建报类型错误 | `npm run build` 含 `vue-tsc`，先修类型再构建 |

## 10. 建议清理

仓库内存在以下开发残留，建议删除并加入 `.gitignore`：

- `vitest-out.txt`、`vitest-err.txt`
- `src/components/HelloWorld.vue`（脚手架示例，已无引用）
