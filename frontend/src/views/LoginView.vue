<template>
  <div class="login-page">
    <el-card class="login-card" shadow="never">
      <div class="card-header">
        <div class="brand-logo">
          <el-icon :size="28"><Notebook /></el-icon>
        </div>
        <h1 class="login-title">金融知识库</h1>
        <p class="login-subtitle">请使用工号登录系统</p>
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

      <p class="login-hint">
        演示账号：管理员 E10001 / admin123　普通用户 E10002 / user123
      </p>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Notebook, User, Lock } from '@element-plus/icons-vue';
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
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--app-bg);
}

.login-card {
  width: min(400px, 100%);
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  --el-card-padding: 32px;
}

.card-header {
  text-align: center;
  margin-bottom: 26px;
}
.brand-logo {
  width: 48px;
  height: 48px;
  margin: 0 auto 12px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}
.login-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--app-text);
  margin: 0 0 6px;
}
.login-subtitle {
  font-size: 13px;
  color: var(--app-text-secondary);
  margin: 0;
}

.login-form .el-form-item {
  margin-bottom: 20px;
}
.login-form :deep(.el-input__wrapper) {
  border-radius: var(--app-radius);
  padding: 2px 4px;
}
.login-form :deep(.el-input__prefix .el-icon) {
  font-size: 16px;
  color: var(--app-text-secondary);
}
.login-btn {
  width: 100%;
  height: 44px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 6px;
  border-radius: var(--app-radius);
}
.login-error {
  margin-bottom: 16px;
}
.login-hint {
  margin-top: 20px;
  font-size: 12px;
  color: var(--app-text-secondary);
  text-align: center;
  line-height: 1.8;
}
</style>
