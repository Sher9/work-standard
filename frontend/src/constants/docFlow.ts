export type DocStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'published'
  | 'archived';

export type DocAction = 'submit' | 'approve' | 'reject' | 'complete' | 'publish' | 'archive';

export interface DocTransitionRule {
  from: DocStatus[];
  to: DocStatus;
  label: string;
  requireComment?: boolean;
  /** 按钮语义色 */
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'default';
}

export const DOC_STATUS_LABELS: Record<DocStatus, string> = {
  draft: '草稿',
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
  completed: '已完成',
  published: '已发布',
  archived: '已归档',
};

/** 与后端 document.types.ts 中的 TRANSITIONS 保持一致 */
export const DOC_TRANSITIONS: Record<DocAction, DocTransitionRule> = {
  submit: { from: ['draft', 'rejected'], to: 'pending', label: '提交审核', type: 'primary' },
  approve: { from: ['pending'], to: 'approved', label: '通过', type: 'success' },
  reject: { from: ['pending'], to: 'rejected', label: '驳回', type: 'danger', requireComment: true },
  complete: { from: ['approved'], to: 'completed', label: '完成', type: 'primary' },
  publish: { from: ['approved', 'completed'], to: 'published', label: '发布', type: 'success' },
  archive: { from: ['published', 'completed'], to: 'archived', label: '归档', type: 'warning' },
};

export interface AvailableAction {
  action: DocAction;
  label: string;
  to: DocStatus;
  requireComment: boolean;
  type: NonNullable<DocTransitionRule['type']>;
}

export function availableActions(status: string): AvailableAction[] {
  return (Object.keys(DOC_TRANSITIONS) as DocAction[])
    .filter((a) => DOC_TRANSITIONS[a].from.includes(status as DocStatus))
    .map((a) => ({
      action: a,
      label: DOC_TRANSITIONS[a].label,
      to: DOC_TRANSITIONS[a].to,
      requireComment: !!DOC_TRANSITIONS[a].requireComment,
      type: DOC_TRANSITIONS[a].type ?? 'default',
    }));
}

export function statusText(status: string): string {
  return DOC_STATUS_LABELS[status as DocStatus] ?? status;
}

export function statusTagType(status: string): 'success' | 'info' | 'warning' | 'danger' {
  switch (status) {
    case 'published':
    case 'completed':
      return 'success';
    case 'pending':
    case 'draft':
      return 'warning';
    case 'rejected':
      return 'danger';
    default:
      return 'info';
  }
}
