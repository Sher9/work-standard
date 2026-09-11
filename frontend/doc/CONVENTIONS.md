# 前端开发规范

## 1. 组件与文件

| 对象 | 规则 | 例 |
| --- | --- | --- |
| 单文件组件 | PascalCase | `DocumentForm.vue` |
| 目录 | camelCase | `api/` `stores/` `composables/` `constants/` |
| 工具/模块 | camelCase | `client.ts` `docFlow.ts` |
| 组合式函数 | `use` 前缀 | `useCategoryDrag.ts` |
| Store | camelCase，`use` + 名 + `Store` | `useEmployeeStore` |
| 测试 | 同目录 `__tests__/` | `views/__tests__/DocumentList.spec.ts` |

**组件一律 `<script setup lang="ts">`**，不用 Options API。

模板顺序固定：

```vue
<script setup lang="ts">…</script>

<template>…</template>

<style scoped>…</style>
```

## 2. 命名

- 变量 / 函数：camelCase；`ref` 语义命名（`docs`、`loading`、`activeCategoryId`）
- 类型 / 接口：PascalCase（`CategoryNode`、`Doc`）
- 常量：UPPER_SNAKE（`DEFAULT_EMPLOYEE_ID`、`STORAGE_KEY`）
- 布尔值用 `is/has/can` 前缀（`isLoggedIn`）
- 事件名 kebab-case；自定义事件用 `emit('update:modelValue')` 这类语义名

## 3. 请求

- **只允许 `src/api/client.ts` 发请求**，组件内禁止 `fetch` / axios
- 返回数据在调用处显式声明类型：`apiGet<Doc[]>('/api/documents')` 
- 接口返回可能为 `null`，统一 `|| []` 兜底
- 错误用 `HttpError` 判定：

  ```ts
  catch (e) {
    ElMessage.error(e instanceof HttpError ? e.message : '操作失败');
  }
  ```

- 上传字段名固定 `file`，用 `apiUpload`，不要手动设 `Content-Type`

## 4. 状态管理

- 全局共享才进 Pinia；页面内数据用组件 `ref`
- 登录态**只能**通过 `stores/employee.ts` 读写，不直接碰 `localStorage['kb_auth']`
- 异步 action 内自己管 `loading`，并在 `finally` 复位
- getter 保持纯函数，不放副作用

## 5. 路由

- 新增页面用懒加载 `() => import('../views/X.vue')`
- 必须声明 meta：`{ requiresAuth: true, roles: [...], title }`
- admin 专有页面 `roles: ['admin']` 且路径放 `/admin/` 前缀
- 需要登录态的页面不要自己做跳转，交给全局守卫

## 6. 常量同步（重要）

`src/constants/docFlow.ts` 镜像后端状态机。

**改后端 `TRANSITIONS` 后必须同步** `DOC_STATUS_LABELS` 与 `DOC_TRANSITIONS`，包括 `requireComment` 与 `type`。

新增状态时同步 `DocStatus` 类型与 `statusTagType()` 的配色分支。

## 7. Element Plus

- 已在 `main.ts` 全量注册组件与图标，模板里直接用 `<el-xxx>` / `<Edit />`
- 提示用 `ElMessage`，不要用 `alert`
- 危险操作（删除、驳回）用 `ElMessageBox.confirm`
- 表格/分页沿用现有写法，保持交互一致

## 8. TypeScript

- 禁止 `any`；第三方不确定类型用 `unknown` 再收窄
- 接口响应必须有明确 interface，不要 `as any`
- 提交前跑 `npm run build`（含 `vue-tsc` 类型检查）

## 9. 样式

- 组件样式用 `<style scoped>`，避免全局污染
- 全局样式只放 `src/style.css`
- 优先用 Element Plus 的间距/色彩体系，少写魔法数字
- 不引入新的 UI 库或 CSS 框架

## 10. 测试

- Vitest + jsdom + `@vue/test-utils`，命令 `npm test`
- 位置：与被测文件同级的 `__tests__/`
- 覆盖重点：状态机 `docFlow`、路由守卫、`api/client` 的错误解析、关键表单校验
- mock 网络请求时打桩 `api/client`，不要真的起后端

## 11. 注释与提交

- 注释使用**简体中文**，只解释「为什么」，不重复代码
- 提交信息建议 Conventional Commits：`feat:` `fix:` `refactor:` `style:` `test:` `chore:`
- 改接口同步 `doc/API_INVENTORY.md`
- 不要把 `vitest-out.txt` 之类的调试产物提交进来

## 12. 禁止事项

- 禁止在组件里直接 `fetch` / 引入 axios
- 禁止绕过 `stores/employee.ts` 读写 `kb_auth`
- 禁止在模板里写复杂表达式，抽成 `computed`
- 禁止提交 `HelloWorld.vue` 这类脚手架残留（新代码不要引用它）
- 禁止未经评审引入新的依赖
