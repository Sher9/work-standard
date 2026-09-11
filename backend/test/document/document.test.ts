import * as fs from 'node:fs';
import { beforeAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { pool, query } from '../../src/db/pool';
import { login, bearer } from '../helpers/auth';

let catId: number;
let token = '';
beforeAll(async () => {
  token = await login('admin');
});
const get = (p: string) => request(app).get(p).set(bearer(token));
const post = (p: string) => request(app).post(p).set(bearer(token));
const put = (p: string) => request(app).put(p).set(bearer(token));
const patch = (p: string) => request(app).patch(p).set(bearer(token));
const del = (p: string) => request(app).delete(p).set(bearer(token));

beforeAll(async () => {
  await pool.query('DELETE FROM favorite');
  await pool.query('DELETE FROM doc_version');
  await pool.query('DELETE FROM document');
  await pool.query('DELETE FROM category');
  const cat = await post('/api/categories').send({ name: '文档分类' });
  catId = cat.body.id;
});

function payload(over: Record<string, unknown> = {}) {
  return { categoryId: catId, title: '文档', contentHtml: '内容', status: 'published', ...over };
}

describe('文档模块 /api/documents', () => {
  it('空标题被拒绝', async () => {
    const res = await post('/api/documents').send(payload({ title: '' }));
    expect([400, 422]).toContain(res.status);
    expect(res.body.message).toBeTruthy();
  });

  it('新增文档', async () => {
    const res = await post('/api/documents').send(payload({ title: '产品手册v1', contentHtml: '内容A', tags: '手册,金融', authorId: 'E10001' }));
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    expect(res.body.content_html).toBe('内容A');
    expect(res.body.tags).toBe('手册,金融');
    expect(res.body.author_id).toBe('E10001');
    expect(res.body.status).toBe('published');
  });

  it('查询文档列表', async () => {
    const res = await get('/api/documents');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('更新文档', async () => {
    const created = await post('/api/documents').send(payload({ title: '待更新' }));
    const res = await put(`/api/documents/${created.body.id}`).send({ title: '已更新标题', tags: '新标签' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('已更新标题');
    expect(res.body.tags).toBe('新标签');
  });

  it('获取单个文档', async () => {
    const created = await post('/api/documents').send(payload({ title: '单文档' }));
    const res = await get(`/api/documents/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('单文档');
  });

  it('删除文档级联清理收藏', async () => {
    const created = await post('/api/documents').send(payload({ title: '待删除' }));
    const docId = created.body.id;
    await post('/api/favorites').send({ documentId: docId });
    const res = await del(`/api/documents/${docId}`);
    expect(res.status).toBe(200);
    const fav = await pool.query('SELECT COUNT(*)::int AS c FROM favorite WHERE document_id = $1', [docId]);
    expect(fav.rows[0].c).toBe(0);
  });

  it('归档文档从浏览隐藏', async () => {
    const created = await post('/api/documents').send(payload({ title: '归档浏览' }));
    const docId = created.body.id;
    await patch(`/api/documents/${docId}/status`).send({ status: 'archived' });
    const list = await get('/api/documents');
    const found = list.body.find((d: any) => d.id === docId);
    expect(found).toBeUndefined();
  });

  it('归档文档从搜索隐藏，重新发布后可见', async () => {
    const created = await post('/api/documents').send(payload({ title: '搜索可见性关键词', contentHtml: 'h' }));
    const docId = created.body.id;
    let search = await get('/api/documents/search?q=关键词');
    expect(search.body.some((d: any) => d.id === docId)).toBe(true);
    await patch(`/api/documents/${docId}/status`).send({ status: 'archived' });
    search = await get('/api/documents/search?q=关键词');
    expect(search.body.some((d: any) => d.id === docId)).toBe(false);
    await patch(`/api/documents/${docId}/status`).send({ status: 'published' });
    search = await get('/api/documents/search?q=关键词');
    expect(search.body.some((d: any) => d.id === docId)).toBe(true);
  });

  it('非法状态被拒绝', async () => {
    const created = await post('/api/documents').send(payload({ title: '状态' }));
    const res = await patch(`/api/documents/${created.body.id}/status`).send({ status: 'whatever' });
    expect(res.status).toBe(400);
  });

  it('状态流转：提交审核 → 通过 → 完成，并记录处理意见', async () => {
    const created = await post('/api/documents').send(payload({ title: '流转文档', status: 'draft' }));
    const docId = created.body.id;
    const submitted = await post(`/api/documents/${docId}/transition`).send({ action: 'submit', comment: '请审核', operatorId: 'E10001' });
    expect(submitted.status).toBe(200);
    expect(submitted.body.document.status).toBe('pending');
    expect(submitted.body.log.from_status).toBe('draft');
    expect(submitted.body.log.to_status).toBe('pending');
    expect(submitted.body.log.comment).toBe('请审核');
    const approved = await post(`/api/documents/${docId}/transition`).send({ action: 'approve', comment: '同意发布' });
    expect(approved.body.document.status).toBe('approved');
    const completed = await post(`/api/documents/${docId}/transition`).send({ action: 'complete', comment: '整理完毕' });
    expect(completed.body.document.status).toBe('completed');
    const logs = await get(`/api/documents/${docId}/status-logs`);
    expect(logs.status).toBe(200);
    expect(logs.body.length).toBe(3);
    expect(logs.body[0].to_status).toBe('completed');
    expect(logs.body.some((l: any) => l.comment === '同意发布')).toBe(true);
  });

  it('驳回必须填写处理意见', async () => {
    const created = await post('/api/documents').send(payload({ title: '驳回文档', status: 'draft' }));
    const docId = created.body.id;
    await post(`/api/documents/${docId}/transition`).send({ action: 'submit' });
    const empty = await post(`/api/documents/${docId}/transition`).send({ action: 'reject', comment: '  ' });
    expect(empty.status).toBe(400);
    expect(empty.body.message).toContain('处理意见');
    const rejected = await post(`/api/documents/${docId}/transition`).send({ action: 'reject', comment: '内容需补充数据来源' });
    expect(rejected.status).toBe(200);
    expect(rejected.body.document.status).toBe('rejected');
  });

  it('非法流转被拒绝', async () => {
    const created = await post('/api/documents').send(payload({ title: '非法流转', status: 'draft' }));
    const docId = created.body.id;
    const badAction = await post(`/api/documents/${docId}/transition`).send({ action: 'unknown' });
    expect(badAction.status).toBe(400);
    const badState = await post(`/api/documents/${docId}/transition`).send({ action: 'approve' });
    expect([400, 409]).toContain(badState.status);
  });

  it('文档内容支持两种方式：富文本与上传 PDF', async () => {
    const up = await post('/api/files/upload').attach('file', Buffer.from('%PDF-1.4'), { filename: '文档.pdf', contentType: 'application/pdf' });
    const fileId = up.body.id;
    const created = await post('/api/documents').send(payload({ title: 'PDF文档', contentHtml: '<p>富文本内容</p>', fileId }));
    expect(created.status).toBe(201);
    expect(created.body.file_id).toBe(fileId);
    expect(created.body.content_html).toBe('');
    const toHtml = await put(`/api/documents/${created.body.id}`).send({ contentHtml: '<p>正文内容</p>', fileId: null });
    expect(toHtml.status).toBe(200);
    expect(toHtml.body.file_id).toBe(null);
    expect(toHtml.body.content_html).toBe('<p>正文内容</p>');
    const toPdf = await put(`/api/documents/${created.body.id}`).send({ fileId });
    expect(toPdf.body.file_id).toBe(fileId);
    expect(toPdf.body.content_html).toBe('');
    await query('DELETE FROM file_meta WHERE id = $1', [fileId]);
    fs.rmSync(up.body.path, { force: true });
  });

  it('关联不存在的 PDF 被拒绝', async () => {
    const res = await post('/api/documents').send(payload({ title: '无效文件', fileId: 999999 }));
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('PDF');
  });

  it('同时删除空分类', async () => {
    const emptyCat = await post('/api/categories').send({ name: '空分类验证' });
    const res = await del(`/api/categories/${emptyCat.body.id}`);
    expect(res.status).toBe(200);
  });
});
