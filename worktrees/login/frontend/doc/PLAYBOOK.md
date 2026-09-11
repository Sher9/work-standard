# 前端常见任务处方

按场景抄作业。

---

## 1. 新增一个页面（如「回收站」）

1. 建 `src/views/RecycleBinView.vue`：

   ```vue
   <script setup lang="ts">
   import { ref, onMounted } from 'vue';
   import { apiGet } from '../api/client';
   </script>

   <template>…</template>

   <style scoped>…</style>
   ```

2. 在 `src/router/index.ts` 注册（**懒加载 + 必填 meta**）：

   ```ts
   {
     path: '/recycle',
     name: 'recycle',
     component: () => import('../views/RecycleBinView.vue'),
     meta: { requiresAuth: true, roles: ['admin', 'user'], title: '回收站' },
   }
   ```

3. admin 专有页面：路径加 `/admin/` 前缀，`roles: ['admin']`
4. 需要入口就在 `App.vue` 的 `allMenus` 加一项 `{ index, label, roles }`（菜单按角色自动过滤）
5. 补测试 `views/__tests__/RecycleBinView.spec.ts`

---

## 2. 调用一个新后端接口

以「文档置顶」为例：

1. 确认后端已上线并列在 [`../../backend/doc/API_INVENTORY.md`](../../backend/doc/API_INVENTORY.md)
2. 在 view 里用既有方法调用，**不要新建 axios 实例**：

   ```ts
   import { apiPatch } from '../api/client';

   async function pin(id: number, pinned: boolean) {
     try {
       await apiPatch(`/api/documents/${id}/pinned`, { pinned });
       ElMessage.success('已更新');
       await load();
     } catch (e) {
       ElMessage.error(e instanceof HttpError ? e.message : '操作失败');
     }
   }
   ```

3. 若返回结构是新类型，在调用处或 `api/client.ts` 补 interface
4. 在 `doc/API_INVENTORY.md` 第 3 节补一行调用点

---

## 3. 新增/修改文档状态

**必须与后端同步，否则按钮与可流转状态不一致。**

1. 后端先改 `backend/src/document/document.types.ts`（见后端 PLAYBOOK 第 4 节）
2. 前端同步 `src/constants/docFlow.ts`：
   - `DocStatus` 联合类型加新状态
   - `DOC_STATUS_LABELS` 加中文名
   - `DOC_TRANSITIONS` 加/改 `from` `to` `label` `requireComment` `type`
3. `statusTagType()` 补配色分支（新状态会落进 `default` 的 `info`，可接受但建议显式声明）
4. `DocumentManageView.vue` 通过 `availableActions(status)` 自动渲染按钮，通常无需改模板
5. 补 `docFlow` 单元测试：合法流转、非法流转、驳回需意见

---

## 4. 新增一个可复用组件

1. 建 `src/components/XxxYyy.vue`（PascalCase），`<script setup lang="ts">`
2. 用 `defineProps<{ ... }>()` / `defineEmits<{ ... }>()` 声明契约
3. 需要双向绑定用 `defineModel()` 或 `update:modelValue`
4. 样式放 `<style scoped>`
5. 补测试 `components/__tests__/XxxYyy.spec.ts`
6. 页面里 `@/components/XxxYyy.vue` 引入（别名 `@` → `src`）

---

## 5. 表单 + 校验（Element Plus）

```vue
<el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
  <el-form-item label="标题" prop="title">
    <el-input v-model="form.title" />
  </el-form-item>
</el-form>
```

```ts
const formRef = ref<FormInstance>();
const rules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
};

async function submit() {
  await formRef.value?.validate();
  await apiPost('/api/documents', form);
}
```

危险操作先确认：

```ts
await ElMessageBox.confirm('确定删除？', '提示', { type: 'warning' });
await apiDelete(`/api/documents/${id}`);
```

---

## 6. 上传 PDF

```ts
import { apiUpload } from '../api/client';

const fd = new FormData();
fd.append('file', rawFile);           // 字段名必须是 file
const uploaded = await apiUpload<UploadedFile>('/api/files/upload', fd);
form.fileId = uploaded.id;
```

限制：仅 PDF，≤ 20MB（后端 `file.service.ts`）。
预览用 `filePreviewUrl(fileId)`，它会拼 `?token=`，供 `<iframe>` / `<a>` 使用。

---

## 7. 加全局状态

1. 判断必要性：只跨页面共享才进 Pinia
2. 建 `src/stores/xxx.ts`：

   ```ts
   export const useXxxStore = defineStore('xxx', {
     state: () => ({ ... }),
     getters: { ... },
     actions: { async load() { ... } },
   });
   ```

3. 异步 action 内管 `loading`，`finally` 复位
4. 需要持久化的只有登录态，且走 `stores/employee.ts`
5. 补 `stores/__tests__/xxx.spec.ts`

---

## 8. 排查「一进页面就跳登录」

1. `localStorage['kb_auth']` 是否有值且含 `token`
2. 主入口是否调用了 `useEmployeeStore(pinia).restore()`（在 `mount` 之前）
3. 是不是后端返回 401 → `client` 主动清了 `kb_auth`
4. token 是否超过 7 天有效期
5. 路由 meta 是否漏配导致被守卫拦截

---

## 9. 排查「接口 403」

说明当前账号角色不够。确认：

```ts
const store = useEmployeeStore();
console.log(store.role);   // 应为 'admin'
```

演示账号 `E10001/admin123` 是 admin，`E10002/user123` 是 user。
/admin 路径下页面需要 `role === 'admin'`。

---

## 10. 排查「接口请求 404 / 走不到后端」

1. dev 环境确认后端已启动在 `3000`
2. 确认 `vite.config.ts` 的代理 `/api` → `http://localhost:3000` 未被改动
3. 若设了 `VITE_API_BASE`，确认值正确且不以 `/` 结尾
4. 打开 Network 看实际请求 URL

---

## 11. 跑测试与构建

```bash
npm test                 # vitest run
npx vitest run src/views # 单目录
npx vitest run -t "关键字"
npm run build            # vue-tsc -b && vite build（含类型检查）
npm run preview          # 预览构建产物
```

---

## 12. 改动影响后端时

1. 先确认后端接口已就绪，核对 `backend/doc/API_INVENTORY.md`
2. 同步 `doc/API_INVENTORY.md` 与 `api/client.ts` 类型
3. 状态机变化同步 `constants/docFlow.ts`
4. `npm run build` 确认类型无断点
