import { errorApp } from '../middleware/errorHandler';
import * as repo from './doc-version.repository';
import * as docRepo from '../document/document.repository';
import type { DocVersionInput, DocVersionRow } from './doc-version.types';

export async function listVersions(documentId: number): Promise<DocVersionRow[]> {
  const doc = await docRepo.findById(documentId);
  if (!doc) throw errorApp(404, '文档不存在');
  return repo.findByDocument(documentId);
}

export async function createVersion(input: DocVersionInput): Promise<DocVersionRow> {
  if (input.documentId == null) throw errorApp(400, '文档不能为空');
  const doc = await docRepo.findById(input.documentId);
  if (!doc) throw errorApp(404, '文档不存在');
  return repo.create({ ...input, documentId: input.documentId });
}

export async function updateVersion(
  id: number,
  input: { contentSnapshot?: string; changeSummary?: string },
): Promise<DocVersionRow> {
  const current = await repo.findById(id);
  if (!current) throw errorApp(404, '版本不存在');
  const updated = await repo.update(id, input);
  if (!updated) throw errorApp(404, '版本不存在');
  return updated;
}

export async function deleteVersion(id: number): Promise<{ message: string }> {
  const current = await repo.findById(id);
  if (!current) throw errorApp(404, '版本不存在');
  await repo.remove(id);
  return { message: '删除成功' };
}