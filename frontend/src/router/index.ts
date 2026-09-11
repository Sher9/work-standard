import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { useEmployeeStore } from '../stores/employee';
import LoginView from '../views/LoginView.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { public: true },
  },
  { path: '/', redirect: '/documents' },
  {
    path: '/documents',
    name: 'documents',
    component: () => import('../views/DocumentList.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'user'], title: '文档列表' },
  },
  {
    path: '/search',
    name: 'search',
    component: () => import('../views/SearchView.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'user'], title: '搜索' },
  },
  {
    path: '/read/:id',
    name: 'read',
    component: () => import('../views/DocumentRead.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'user'], title: '文档阅读' },
    props: true,
  },
  {
    path: '/favorites',
    name: 'favorites',
    component: () => import('../views/FavoriteList.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'user'], title: '我的收藏' },
  },
  {
    path: '/admin/documents',
    name: 'document-manage',
    component: () => import('../views/DocumentManageView.vue'),
    meta: { requiresAuth: true, roles: ['admin'], title: '文档维护' },
  },
  {
    path: '/admin/categories',
    name: 'category-manage',
    component: () => import('../views/CategoryManageView.vue'),
    meta: { requiresAuth: true, roles: ['admin'], title: '分类管理' },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const employeeStore = useEmployeeStore();
  if (to.meta.public) {
    if (employeeStore.isLoggedIn && to.name === 'login') return { name: 'documents' };
    return true;
  }
  if (!employeeStore.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
  const roles = (to.meta.roles as string[] | undefined) || [];
  if (roles.length && !roles.includes(employeeStore.role)) {
    return { name: 'documents' };
  }
  return true;
});

export default router;
