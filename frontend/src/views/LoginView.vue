<template>
  <div class="login-page">
    <el-card class="login-card" shadow="always">
      <div class="login-title">金融知识库</div>
      <div class="login-sub">请使用工号登录</div>
      <el-form @submit.prevent="onLogin">
        <el-form-item>
          <el-input v-model="employeeNo" placeholder="工号，例如 E10001" size="large" clearable>
            <template #prepend>工号</template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-input
            v-model="password"
            type="password"
            placeholder="密码"
            size="large"
            show-password
            @keyup.enter="onLogin"
          >
            <template #prepend>密码</template>
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
          登录
        </el-button>
      </el-form>
      <div class="login-hint">
        演示账号：管理员 <b>E10001 / admin123</b>　|　普通用户 <b>E10002 / user123</b>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
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
  background: linear-gradient(135deg, #eef2ff 0%, #f7faff 100%);
}
.login-card {
  width: 380px;
  padding: 12px 8px;
}
.login-title {
  font-size: 22px;
  font-weight: 700;
  text-align: center;
  color: var(--el-color-primary);
}
.login-sub {
  text-align: center;
  color: var(--el-text-color-secondary);
  margin-bottom: 18px;
}
.login-btn {
  width: 100%;
}
.login-error {
  margin-bottom: 12px;
}
.login-hint {
  margin-top: 16px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  text-align: center;
  line-height: 1.6;
}
</style>
