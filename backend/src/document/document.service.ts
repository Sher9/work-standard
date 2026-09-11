import { errorApp } from '../middleware/errorHandler';
import * as repo from './document.repository';
import * as catRepo from '../catalog/category.repository';
import * as fileRepo from '../file/file.repository';
import { buildHighlight } from '../search/search.highlight';
import { sanitizeHtml } from '../common/sanitize';
import type {
  DocumentInput,
  DocumentRow,
  DocAction,
  DocStatus,
  StatusLogRow,
  TransitionInput,
} from './document.types';
import { DOC_STATUSES, DOC_STATUS_LABELS, TRANSITIONS } from './document.types';

const VALID_STATUS: DocStatus[] = DOC_STATUSES;

/** 校验 PDF 文件存在性，undefined 表示不变更，null 表示移除 */
async function resolveFileId(fileId?: number | null): Promise<number | null | undefined> {
  if (fileId === undefined) return undefined;
  if (fileId == null) return null;
  const meta = await fileRepo.findById(Number(fileId));
  if (!meta) throw errorApp(400, '关联的 PDF 文件不存在');
  return meta.id;
}

export async function listDocuments(reqQuery: { view?: string }): Promise<DocumentRow[]> {
  if (reqQuery.view === 'admin') return repo.findAllForAdmin();
  return repo.findAllPublished();
}

export async function getDocument(id: number): Promise<DocumentRow> {
  const doc = await repo.findById(id);
  if (!doc) throw errorApp(404, '文档不存在');
  return doc;
}

export async function readDocument(id: number): Promise<DocumentRow> {
  const current = await repo.findById(id);
  if (!current) throw errorApp(404, '文档不存在');
  const doc = await repo.incrementReadCount(id);
  if (!doc) throw errorApp(404, '文档不存在');
  return doc;
}

export async function createDocument(input: DocumentInput): Promise<DocumentRow> {
  const title = (input.title || '').trim();
  if (!title) throw errorApp(400, '文档标题不能为空');
  if (input.categoryId == null) throw errorApp(400, '所属分类不能为空');
  const cat = await catRepo.findById(Number(input.categoryId));
  if (!cat) throw errorApp(400, '所属分类不存在');
  const status = input.status ?? 'draft';
  if (!VALID_STATUS.includes(status)) throw errorApp(400, '非法的文档状态');
  const fileId = await resolveFileId(input.fileId);
  // 内容二选一：以 PDF 作为正文时清空富文本，反之亦然
  const contentHtml =
    fileId != null ? '' : sanitizeHtml(input.contentHtml || '');
  return repo.create({
    title,
    categoryId: Number(input.categoryId),
    contentHtml,
    fileId,
    tags: (input.tags || '').trim(),
    authorId: input.authorId ?? null,
    status,
  });
}

export async function updateDocument(id: number, input: DocumentInput): Promise<DocumentRow> {
  const current = await repo.findById(id);
  if (!current) throw errorApp(404, '文档不存在');
  if (input.title != null && !(input.title || '').trim()) {
    throw errorApp(400, '文档标题不能为空');
  }
  if (input.categoryId != null) {
    const cat = await catRepo.findById(Number(input.categoryId));
    if (!cat) throw errorApp(400, '所属分类不存在');
  }
  // 传入 fileId（含 null）表示切换内容方式；未传则保持原样
  const fileId = input.fileId !== undefined ? await resolveFileId(input.fileId) : undefined;
  let contentHtml: string | undefined;
  if (fileId != null) contentHtml = '';
  else if (input.contentHtml != null) contentHtml = sanitizeHtml(input.contentHtml);

  const updated = await repo.update(id, {
    title: input.title != null ? input.title.trim() : undefined,
    contentHtml,
    fileId,
    tags: input.tags != null ? input.tags.trim() : undefined,
    categoryId: input.categoryId != null ? Number(input.categoryId) : undefined,
  });
  if (!updated) throw errorApp(404, '文档不存在');
  return updated;
}

export async function setStatus(id: number, status: string): Promise<DocumentRow> {
  if (!VALID_STATUS.includes(status as DocStatus)) throw errorApp(400, '非法的文档状态');
  const current = await repo.findById(id);
  if (!current) throw errorApp(404, '文档不存在');
  const next = status as DocStatus;
  const updated = await repo.updateStatus(id, next);
  if (!updated) throw errorApp(404, '文档不存在');
  if (current.status !== next) {
    await repo.insertStatusLog({
      documentId: id,
      fromStatus: current.status,
      toStatus: next,
      action: 'set',
      comment: '',
      operatorId: null,
    });
  }
  return updated;
}

/**
 * 状态流转：按状态机校验动作合法性，更新状态并写入处理意见记录
 */
export async function transitionDocument(
  id: number,
  input: TransitionInput,
): Promise<{ document: DocumentRow; log: StatusLogRow }> {
  const action = input.action as DocAction;
  const rule = TRANSITIONS[action];
  if (!rule) throw errorApp(400, '非法的状态流转动作');

  const current = await repo.findById(id);
  if (!current) throw errorApp(404, '文档不存在');
  if (!rule.from.includes(current.status)) {
    const from = DOC_STATUS_LABELS[current.status] ?? current.status;
    throw errorApp(409, `当前状态「${from}」不能执行「${rule.label}」`);
  }

  const comment = (input.comment || '').trim();
  if (rule.requireComment && !comment) {
    throw errorApp(400, `「${rule.label}」必须填写处理意见`);
  }

  const updated = await repo.updateStatus(id, rule.to);
  if (!updated) throw errorApp(404, '文档不存在');

  const log = await repo.insertStatusLog({
    documentId: id,
    fromStatus: current.status,
    toStatus: rule.to,
    action,
    comment,
    operatorId: input.operatorId ?? null,
  });

  return { document: updated, log };
}

export async function listStatusLogs(id: number): Promise<StatusLogRow[]> {
  const current = await repo.findById(id);
  if (!current) throw errorApp(404, '文档不存在');
  return repo.findStatusLogs(id);
}

/** 供前端渲染可用动作 */
export function availableActions(status: DocStatus): Array<{
  action: DocAction;
  label: string;
  to: DocStatus;
  requireComment: boolean;
}> {
  return (Object.keys(TRANSITIONS) as DocAction[])
    .filter((a) => TRANSITIONS[a].from.includes(status))
    .map((a) => ({
      action: a,
      label: TRANSITIONS[a].label,
      to: TRANSITIONS[a].to,
      requireComment: !!TRANSITIONS[a].requireComment,
    }));
}

export async function searchDocuments(
  keyword: string,
): Promise<Array<DocumentRow & { highlight?: string }>> {
  const q = (keyword || '').trim();
  if (!q) throw errorApp(400, '搜索关键词不能为空');
  const docs = await repo.searchByKeyword(q);
  return docs.map((d) => ({
    ...d,
    highlight: buildHighlight(d.content_html, q),
  }));
}

export async function deleteDocument(id: number): Promise<{ message: string }> {
  const current = await repo.findById(id);
  if (!current) throw errorApp(404, '文档不存在');
  await repo.remove(id);
  return { message: '删除成功' };
}