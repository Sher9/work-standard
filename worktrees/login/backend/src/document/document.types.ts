export type DocStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'published'
  | 'archived';

export type DocAction = 'submit' | 'approve' | 'reject' | 'complete' | 'publish' | 'archive';

export interface TransitionRule {
  /** 允许执行该动作的当前状态 */
  from: DocStatus[];
  /** 流转后的目标状态 */
  to: DocStatus;
  /** 动作名称 */
  label: string;
  /** 是否必须填写处理意见（如驳回） */
  requireComment?: boolean;
}

export const DOC_STATUSES: DocStatus[] = [
  'draft',
  'pending',
  'approved',
  'rejected',
  'completed',
  'published',
  'archived',
];

export const DOC_STATUS_LABELS: Record<DocStatus, string> = {
  draft: '草稿',
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
  completed: '已完成',
  published: '已发布',
  archived: '已归档',
};

/** 简单状态机：每个动作限定可流转的当前状态与目标状态 */
export const TRANSITIONS: Record<DocAction, TransitionRule> = {
  submit: { from: ['draft', 'rejected'], to: 'pending', label: '提交审核' },
  approve: { from: ['pending'], to: 'approved', label: '通过' },
  reject: { from: ['pending'], to: 'rejected', label: '驳回', requireComment: true },
  complete: { from: ['approved'], to: 'completed', label: '完成' },
  publish: { from: ['approved', 'completed'], to: 'published', label: '发布' },
  archive: { from: ['published', 'completed'], to: 'archived', label: '归档' },
};

export const DOC_ACTIONS = Object.keys(TRANSITIONS) as DocAction[];

export interface DocumentRow {
  id: number;
  category_id: number;
  title: string;
  content_html: string;
  tags: string;
  author_id: string | null;
  file_id: number | null;
  status: DocStatus;
  read_count: number;
}

export interface DocumentInput {
  categoryId?: number | null;
  title?: string;
  contentHtml?: string;
  /** 内容方式二：上传 PDF 后的文件 id，传 null 表示移除已关联的 PDF */
  fileId?: number | null;
  tags?: string;
  authorId?: string | null;
  status?: DocStatus;
}

/** 状态流转入参：action + 处理意见（意见可选，驳回时必填） */
export interface TransitionInput {
  action?: string;
  comment?: string;
  operatorId?: string | null;
}

export interface StatusLogRow {
  id: number;
  document_id: number;
  from_status: DocStatus | null;
  to_status: DocStatus;
  action: string;
  comment: string;
  operator_id: string | null;
  created_at: string;
}

export interface StatusLogInput {
  documentId: number;
  fromStatus: DocStatus | null;
  toStatus: DocStatus;
  action: string;
  comment: string;
  operatorId: string | null;
}
