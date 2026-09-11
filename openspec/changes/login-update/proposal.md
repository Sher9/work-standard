## Why

当前登录页（`LoginView.vue`）采用重装饰风格：深蓝渐变背景 + 三个模糊彩色 blob + 网格线、双栏布局（左侧品牌区 + 右侧卡片）、特性列表、虚线演示账号框。与全站浅色主题（`--app-bg: #f5f7fa`、Element Plus 浅色主题）明显脱节，视觉上显得花哨、拥挤。本次将登录页重构为**极简浅色风格**，收敛配色、去掉装饰，与全局主题保持一致，提升整体观感。

## What Changes

- **重构登录页视觉**（`frontend/src/views/LoginView.vue`，仅模板结构与 scoped 样式）：
  - 背景由深蓝渐变 + blob + 网格线改为纯浅色 `var(--app-bg)`，删除全部装饰元素
  - 布局由双栏改为**居中单卡片**，删除左侧品牌栏与特性列表
  - 卡片采用细边框 + 轻阴影 + `--app-radius` 圆角 + 大内边距的扁平极简风格
  - 品牌信息（logo 图标 + "金融知识库" 标题 + 灰色副标题）折叠进卡片内
  - 演示账号提示改为卡片底部一行灰色小字
  - 颜色全部收敛到 Element Plus token 与 `--app-*` 全局变量，移除 `#2f6bff`、`#7a4dff`、`#7fb0ff` 等魔法色
- **行为零改动**：登录逻辑、表单结构（2 个输入框 + 1 个登录按钮）、错误提示、跳转逻辑均不变

## Capabilities

### New Capabilities
- `ui/login-page`: 登录页的表现层要求——浅色无装饰背景、居中单卡片布局、品牌区折叠入卡、演示账号提示呈现方式

### Modified Capabilities
<!-- 无既有 spec 变更；项目 specs/ 目录当前为空，本次为新增首个 spec -->

## Impact

- **前端代码**：`frontend/src/views/LoginView.vue`（模板 + `<style scoped>`）
- **测试**：`frontend/src/views/__tests__/LoginView.spec.ts` —— 三个用例断言（`金融知识库`、`E10001`、2 输入框 + 1 按钮）在新设计中全部保留，预期**无需修改、原样通过**
- **不影响**：后端、接口、路由、全局样式（`style.css`）、依赖
- **无破坏性变更**
