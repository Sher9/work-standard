## Context

登录页当前是唯一深色重装饰页面（深蓝渐变 + 模糊 blob ×3 + 网格线、双栏布局、特性列表），与全站浅色主题脱节。全局主题已定义 `--app-bg: #f5f7fa`、`--app-text`、`--app-border: #e4e7ed`、`--app-radius: 8px`（`frontend/src/style.css`），Element Plus 浅色主题可用（primary `#409EFF`）。登录页行为与逻辑不变（见 proposal.md - Why / specs）。

关键约束：
- `frontend/src/views/__tests__/LoginView.spec.ts` 断言文本「金融知识库」「E10001」及「2 个输入框 + 1 个按钮」，重构后须原样通过
- 约定：组件样式用 `<style scoped>`；优先使用 Element Plus 间距/色彩体系，少写魔法数字；不引入新 UI 库

## Goals / Non-Goals

**Goals:**
- 登录页改为浅色纯背景 + 居中单卡片，视觉与全站主题一致
- 移除全部装饰（blob、网格线、品牌面板、特性列表、虚线演示框）
- 配色收敛到主题 token，去除魔法色

**Non-Goals:**
- 不改登录流程、接口、路由、后端
- 不动全局样式 `style.css`（避免影响其他页面）
- 不改 `LoginView.spec.ts` 测试（保持原样通过）

## Decisions

**决策 1：背景用 `var(--app-bg)` 纯浅色，删除 `bg-decor`**
`login-page` 背景由深蓝渐变改为 `var(--app-bg)`，整块删除 `.bg-decor`（`.blob-1/2/3`、`.grid-overlay`）及其 CSS。
- 理由：与全站 `--app-bg` 一致，最彻底的极简；删除 DOM 与样式同步移除，无残留
- 备选：保留深色系做克制极简 —— 被用户否决（与全局浅色主题不一致）

**决策 2：单列居中卡片，删除双栏结构**
删除 `.login-layout` 双栏（`.login-brand` 品牌栏 + `.login-card-wrap` 独立列），改为 `.login-page` 直接居中一个窄卡片（约 `min(400px, 100%)`）。`@media (max-width: 900px)` 中隐藏品牌栏的逻辑随之删除。
- 理由：单卡片是最纯粹的极简形态，减少维护分支
- 备选：保留双栏但弱化 —— 被用户否决

**决策 3：品牌信息折叠进卡片，作为卡片头部**
卡片头部 = logo 图标（复用 `Notebook`）+ `<h1>金融知识库</h1>` + 灰色副标题（如「请使用工号登录系统」）。不再有独立「欢迎回来」标题。
- 理由：测试要求保留「金融知识库」文本；单卡内仍保留品牌识别
- 备选：卡片外顶部放品牌 —— 额外层级，极简不需要

**决策 4：卡片扁平化，用主题 token**
卡片改为细边框 `1px solid var(--app-border)`、极轻阴影（或无阴影）、圆角 `var(--app-radius)`、大内边距（如 `32px`）。输入框保留前缀图标，登录按钮保留 `type="primary"` 与「登 录」文字。错误提示沿用 `el-alert`。
- 理由：`--app-radius: 8px` 是全站统一圆角；token 保证一致性、去魔法数

**决策 5：演示账号改为底部一行小字**
删除 `.login-hint` 虚线框样式，改为卡片内底部一行 `font-size: 12px; color: var(--app-text-secondary)` 的说明文字，保留「E10001 / admin123」「E10002 / user123」内容。
- 理由：测试要求保留「E10001」文本；低强调呈现符合极简

## Risks / Trade-offs

- **测试脆弱** → 若实施时误删「金融知识库」或「E10001」文本、或改动输入框/按钮数量，`LoginView.spec.ts` 会红。实施后跑 `cd frontend && npm test` 回归
- **视觉主观** → 极简风格细节（内边距、阴影、副标题文案）带有主观性；以 spec 中「浅色、无装饰、单卡、低强调演示提示」为验收基准，细节可后续微调
- **无后端风险** → 纯前端单文件改动，无部署/回滚负担（迁移计划不适用）
