import { defineStore } from 'pinia';
import { apiGet } from '../api/client';

export interface CategoryNode {
  id: number;
  name: string;
  parent_id: number | null;
  sort_order: number;
  icon?: string | null;
  level?: number;
  children?: CategoryNode[];
}

export const useCatalogStore = defineStore('catalog', {
  state: () => ({
    tree: [] as CategoryNode[],
    loading: false,
    expandedIds: new Set<number>(),
    activeCategoryId: null as number | null,
  }),
  getters: {
    activeCategory: (state) =>
      state.tree.find((c) => c.id === state.activeCategoryId) || null,
  },
  actions: {
    async loadTree() {
      this.loading = true;
      try {
        this.tree = (await apiGet<CategoryNode[]>('/api/categories/tree')) || [];
      } finally {
        this.loading = false;
      }
    },
    toggle(id: number) {
      if (this.expandedIds.has(id)) this.expandedIds.delete(id);
      else this.expandedIds.add(id);
    },
    expand(id: number) {
      this.expandedIds.add(id);
    },
    setActive(id: number | null) {
      this.activeCategoryId = id;
    },
  },
});