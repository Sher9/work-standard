<template>
  <el-container v-if="!isLoginPage" class="app-layout">
    <el-header class="app-header" height="56px">
      <div class="brand">金融知识库</div>
      <el-menu
        mode="horizontal"
        :default-active="activeRoute"
        router
        :ellipsis="false"
        class="app-menu"
      >
        <el-menu-item v-for="m in visibleMenus" :key="m.index" :index="m.index">
          {{ m.label }}
        </el-menu-item>
      </el-menu>
      <div class="user-area" v-if="employeeStore.isLoggedIn">
        <span class="user-name">{{ employeeStore.name }}</span>
        <el-tag :type="employeeStore.role === 'admin' ? 'danger' : 'info'" size="small">
          {{ employeeStore.role === 'admin' ? '管理员' : '用户' }}
        </el-tag>
        <el-button text size="small" @click="onLogout">退出</el-button>
      </div>
    </el-header>
    <el-main class="app-main">
      <router-view />
    </el-main>
  </el-container>
  <router-view v-else />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useEmployeeStore } from './stores/employee';

const route = useRoute();
const router = useRouter();
const employeeStore = useEmployeeStore();
const activeRoute = computed(() => route.path);
const isLoginPage = computed(() => route.name === 'login');

const allMenus = [
  { index: '/documents', label: '文档列表', roles: ['admin', 'user'] },
  { index: '/admin/categories', label: '分类管理', roles: ['admin'] },
  { index: '/admin/documents', label: '文档维护', roles: ['admin'] },
  { index: '/search', label: '搜索', roles: ['admin', 'user'] },
  { index: '/favorites', label: '我的收藏', roles: ['admin', 'user'] },
];

const visibleMenus = computed(() =>
  allMenus.filter((m) => m.roles.includes(employeeStore.role || 'user')),
);

function onLogout(): void {
  employeeStore.logout();
  router.push('/login');
}
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
}
.app-header {
  display: flex;
  align-items: center;
  gap: 32px;
  padding: 0 24px;
  background: #fff;
  border-bottom: 1px solid var(--app-border);
}
.brand {
  font-size: 18px;
  font-weight: 700;
  color: var(--el-color-primary);
  letter-spacing: 0.5px;
  white-space: nowrap;
}
.app-menu {
  flex: 1;
  border-bottom: none;
  --el-menu-border-color: transparent;
}
.user-area {
  display: flex;
  align-items: center;
  gap: 10px;
  white-space: nowrap;
}
.user-name {
  font-size: 14px;
  color: var(--el-text-color-regular);
}
.app-main {
  padding: 24px;
  max-width: 1120px;
  width: 100%;
  margin: 0 auto;
}
</style>
