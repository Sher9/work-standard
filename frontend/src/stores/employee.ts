import { defineStore } from 'pinia';

export const DEFAULT_EMPLOYEE_ID = 'E10001';
const STORAGE_KEY = 'kb_auth';

export type Role = 'admin' | 'user';

export interface LoginPayload {
  token: string;
  employeeNo: string;
  name: string;
  role: Role;
}

export const useEmployeeStore = defineStore('employee', {
  state: () => ({
    employeeId: DEFAULT_EMPLOYEE_ID as string,
    token: '' as string,
    employeeNo: '' as string,
    name: '' as string,
    role: '' as Role | '',
  }),
  getters: {
    getEmployeeId: (state) => () => state.employeeId,
    isLoggedIn: (state) => !!state.token,
  },
  actions: {
    setEmployeeId(id: string) {
      this.employeeId = id;
    },
    login(payload: LoginPayload) {
      this.token = payload.token;
      this.employeeNo = payload.employeeNo;
      this.name = payload.name;
      this.role = payload.role;
      this.employeeId = payload.employeeNo;
      this.persist();
    },
    logout() {
      this.token = '';
      this.employeeNo = '';
      this.name = '';
      this.role = '';
      this.employeeId = DEFAULT_EMPLOYEE_ID;
      if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEY);
    },
    persist() {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          token: this.token,
          employeeNo: this.employeeNo,
          name: this.name,
          role: this.role,
        }),
      );
    },
    restore() {
      if (typeof window === 'undefined') return;
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      try {
        const d = JSON.parse(raw);
        this.token = d.token || '';
        this.employeeNo = d.employeeNo || '';
        this.name = d.name || '';
        this.role = d.role || '';
        this.employeeId = d.employeeNo || DEFAULT_EMPLOYEE_ID;
      } catch {
        /* 忽略损坏的本地数据 */
      }
    },
  },
});
