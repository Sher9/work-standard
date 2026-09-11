<template>
  <div class="login-page">
    <div class="bg-decor" aria-hidden="true">
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
      <div class="blob blob-3"></div>
      <div class="grid-overlay"></div>
    </div>

    <div class="login-layout">
      <div class="login-brand">
        <div class="brand-logo">
          <el-icon :size="30"><Notebook /></el-icon>
        </div>
        <h1 class="login-title">金融知识库</h1>
        <p class="login-slogan">Knowledge Base<br />Management System</p>
        <ul class="login-features">
          <li><el-icon><FolderOpened /></el-icon>分类树组织文档，一目了然</li>
          <li><el-icon><Clock /></el-icon>版本留痕，历史可追溯</li>
          <li><el-icon><Search /></el-icon>全文检索，快速定位</li>
        </ul>
      </div>

      <div class="login-card-wrap">
        <el-card class="login-card" shadow="never">
          <div class="card-header">
            <h2 class="card-title">欢迎回来</h2>
            <p class="card-desc">请使用工号登录系统</p>
          </div>

          <el-form class="login-form" @submit.prevent="onLogin">
            <el-form-item>
              <el-input
                v-model="employeeNo"
                placeholder="请输入工号"
                size="large"
                clearable
              >
                <template #prefix>
                  <el-icon><User /></el-icon>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item>
              <el-input
                v-model="password"
                type="password"
                placeholder="请输入密码"
                size="large"
                show-password
                @keyup.enter="onLogin"
              >
                <template #prefix>
                  <el-icon><Lock /></el-icon>
                </template>
              </el-input>
            </el-form-item>
            <el-alert
              v-if="error"
              :title="error"
              type="error"
              show-icon
              :closable="false"
              class="login-error"
            />
            <el-button
              type="primary"
              size="large"
              :loading="loading"
              class="login-btn"
              @click="onLogin"
            >
              登 录
            </el-button>
          </el-form>

          <div class="login-hint">
            <div class="hint-title">演示账号</div>
            <div>管理员　<b>E10001 / admin123</b></div>
            <div>普通用户　<b>E10002 / user123</b></div>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  Notebook,
  FolderOpened,
  Clock,
  Search,
  User,
  Lock,
} from '@element-plus/icons-vue';
import { apiLogin } from '../api/client';
import { useEmployeeStore } from '../stores/employee';

const employeeNo = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');
const employeeStore = useEmployeeStore();
const router = useRouter();
const route = useRoute();

async function onLogin(): Promise<void> {
  error.value = '';
  if (!employeeNo.value || !password.value) {
    error.value = '请输入工号和密码';
    return;
  }
  loading.value = true;
  try {
    const res = await apiLogin({ employeeNo: employeeNo.value, password: password.value });
    employeeStore.login({
      token: res.token,
      employeeNo: res.employee.employee_no,
      name: res.employee.name,
      role: res.employee.role,
    });
    const redirect = (route.query.redirect as string) || '/documents';
    await router.push(redirect);
    ElMessage.success(`欢迎，${res.employee.name}`);
  } catch (e: unknown) {
    const err = e as { message?: string };
    error.value = err?.message || '登录失败';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 24px;
  background: linear-gradient(135deg, #081a33 0%, #0f2f5c 52%, #0a2244 100%);
}

/* 背景装饰 */
.bg-decor {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}
.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(84px);
  opacity: 0.55;
}
.blob-1 {
  width: 480px;
  height: 480px;
  background: #2f6bff;
  top: -140px;
  left: -120px;
}
.blob-2 {
  width: 420px;
  height: 420px;
  background: #0fb6c8;
  bottom: -160px;
  right: -100px;
  opacity: 0.4;
}
.blob-3 {
  width: 300px;
  height: 300px;
  background: #7a4dff;
  top: 38%;
  right: 20%;
  opacity: 0.3;
}
.grid-overlay {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 48px 48px;
}

.login-layout {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 64px;
  max-width: 1040px;
  width: 100%;
}

/* 左侧品牌区 */
.login-brand {
  flex: 1 1 460px;
  min-width: 0;
  color: #fff;
  padding-left: 8px;
}
.brand-logo {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: linear-gradient(135deg, #4c8dff, #2f6bff);
  box-shadow: 0 10px 24px rgba(47, 107, 255, 0.4);
  margin-bottom: 20px;
}
.login-title {
  font-size: 32px;
  font-weight: 700;
  letter-spacing: 1px;
  margin: 0 0 10px;
}
.login-slogan {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.65);
  letter-spacing: 2px;
  line-height: 1.7;
  margin-bottom: 36px;
}
.login-features {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 14px;
}
.login-features li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
}
.login-features .el-icon {
  font-size: 18px;
  color: #7fb0ff;
}

/* 右侧登录卡片 */
.login-card-wrap {
  flex: 1 1 380px;
  max-width: 400px;
  width: 100%;
}
.login-card {
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 24px 60px rgba(2, 12, 30, 0.45);
  --el-card-padding: 36px;
}
.card-header {
  text-align: center;
  margin-bottom: 26px;
}
.card-title {
  font-size: 22px;
  font-weight: 700;
  color: #1f2d3d;
  margin: 0 0 6px;
}
.card-desc {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin: 0;
}
.login-form .el-form-item {
  margin-bottom: 20px;
}
.login-form :deep(.el-input__wrapper) {
  border-radius: 10px;
  padding: 2px 4px;
}
.login-form :deep(.el-input__prefix .el-icon) {
  font-size: 16px;
  color: var(--el-text-color-secondary);
}
.login-btn {
  width: 100%;
  height: 46px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 6px;
  border-radius: 10px;
}
.login-error {
  margin-bottom: 16px;
}
.login-hint {
  margin-top: 20px;
  padding: 12px 14px;
  border-radius: 10px;
  background: #f4f8ff;
  border: 1px dashed #c9dcff;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  text-align: center;
  line-height: 1.8;
}
.hint-title {
  font-weight: 600;
  color: #4a6fa5;
  margin-bottom: 2px;
}
.login-hint b {
  color: #2f6bff;
}

@media (max-width: 900px) {
  .login-layout {
    justify-content: center;
  }
  .login-brand {
    display: none;
  }
}
</style>
