## 1. 重构 LoginView.vue 模板结构

- [x] 1.1 删除模板中的 `.bg-decor` 装饰块（3 个 `.blob` + `.grid-overlay`），并移除 `.login-layout` 双栏结构，改为 `.login-page` 下直接居中单张卡片；验证模板中不再存在 blob/grid 元素（grep `bg-decor` 无命中）
- [x] 1.2 将品牌信息折叠进卡片头部：保留 `Notebook` logo 图标、`<h1>` 标题「金融知识库」、灰色副标题（如「请使用工号登录系统」）；验证卡片内文本包含「金融知识库」
- [x] 1.3 保留 2 个 `el-input`（工号/密码，含前缀图标 User/Lock）与 1 个 `el-button type="primary"`（登 录）及 `el-alert` 错误提示；验证模板输入框数量仍为 2、按钮数量仍为 1
- [x] 1.4 将演示账号区块 `.login-hint` 改为卡片底部一行灰色小字，保留「E10001 / admin123」「E10002 / user123」内容；验证文本包含「E10001」

## 2. 重构 scoped 样式

- [x] 2.1 背景改为 `var(--app-bg)` 浅色纯色，删除 `.blob-*`、`.grid-overlay` 等全部装饰样式及魔法色（`#2f6bff`、`#7a4dff`、`#7fb0ff` 等）；验证 `style.css` 中 `--app-bg` 被引用且 LoginView 中无 blob/网格样式
- [x] 2.2 卡片扁平化：细边框 `1px solid var(--app-border)`、轻阴影或无阴影、圆角 `var(--app-radius)`、大内边距（如 `32px`），删除 18px 圆角与重阴影；验证卡片样式使用主题 token
- [x] 2.3 删除双栏布局相关样式（`.login-brand`、`.login-layout` gap、`@media (max-width: 900px)` 隐藏品牌栏分支），卡片通过 `.login-page` flex 水平垂直居中；验证 `npm run build` 通过（含 `vue-tsc` 类型检查）

## 3. 验证与回归

- [x] 3.1 运行前端测试 `cd frontend && npm test -- LoginView`，验证 `LoginView.spec.ts` 三个用例全部通过（未改测试文件）
- [ ] 3.2 浏览器手验：启动 `npm run dev` 打开 `/login`，确认浅色背景、居中单卡、品牌折叠入卡、演示账号为灰色小字；验证登录成功跳转与登录失败错误提示仍正常
