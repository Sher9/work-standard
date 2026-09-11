export interface CategoryRow {
  id: number;
  name: string;
  parent_id: number | null;
  sort_order: number;
  icon: string | null;
  level: number;
}

export interface CategoryTreeNode extends CategoryRow {
  children: CategoryTreeNode[];
}

export interface CategoryInput {
  name: string;
  parentId?: number | null;
  icon?: string | null;
}

export interface SortItem {
  id: number;
  sortOrder: number;
}

export interface CategoryDetail extends CategoryRow {
  children: CategoryRow[];
  documentCount: number;
}