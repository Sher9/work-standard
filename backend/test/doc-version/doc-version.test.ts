import { beforeAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { login, bearer } from '../helpers/auth';

let token = '';
beforeAll(async () => {
  token = await login('admin');
});
const get = (p: string) => request(app).get(p).set(bearer(token));
const post = (p: string) => request(app).post(p).set(bearer(token));
const put = (p: string) => request(app).put(p).set(bearer(token));
const patch = (p: string) => request(app).patch(p).set(bearer(token));
const del = (p: string) => request(app).delete(p).set(bearer(token));
import { pool } from '../../src/db/pool';

let catId: number;
let docId: number;

beforeAll(async () => {
  await pool.query('DELETE FROM favorite');
  await pool.query('DELETE FROM doc_version');
  await pool.query('DELETE FROM document');
  await pool.query('DELETE FROM category');
  const cat = await post('/api/categories').send({ name: '版本分类' });
  catId = cat.body.id;
  const doc = await post('/api/documents').send({
    categoryId: catId,
    title: '版本文档',
    contentHtml: 'v1 内容',
    status: 'published',
  });
  docId = doc.body.id;
});

describe('文档版本 /api/documents/:documentId/versions', () => {
  it('文档不存在返回 404', async () => {
    const res = await get('/api/documents/999999/versions');
    expect(res.status).toBe(404);
  });

  it('新增版本自动编号 version_no 递增', async () => {
    const v1 = await post(`/api/documents/${docId}/versions`).send({
      contentSnapshot: '版本1快照',
      changeSummary: '首次创建',
    });
    expect(v1.status).toBe(201);
    expect(v1.body.version_no).toBe(1);
    expect(v1.body.content_snapshot).toBe('版本1快照');

    const v2 = await post(`/api/documents/${docId}/versions`).send({
      contentSnapshot: '版本2快照',
      changeSummary: '第二次修改',
    });
    expect(v2.body.version_no).toBe(2);
  });

  it('列表按 version_no 升序返回', async () => {
    const res = await get(`/api/documents/${docId}/versions`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    expect(res.body[0].version_no).toBe(1);
    expect(res.body[1].version_no).toBe(2);
  });

  it('更新版本说明', async () => {
    const list = await get(`/api/documents/${docId}/versions`);
    const target = list.body[0];
    const res = await put(`/api/documents/${docId}/versions/${target.id}`)
      .send({ changeSummary: '已更新的说明' });
    expect(res.status).toBe(200);
    expect(res.body.change_summary).toBe('已更新的说明');
  });

  it('删除版本', async () => {
    const list = await get(`/api/documents/${docId}/versions`);
    const target = list.body[0];
    const res = await del(`/api/documents/${docId}/versions/${target.id}`);
    expect(res.status).toBe(200);
    const after = await get(`/api/documents/${docId}/versions`);
    expect(after.body.some((v: any) => v.id === target.id)).toBe(false);
  });

  it('删除文档级联删除其版本', async () => {
    const extra = await post('/api/documents').send({
      categoryId: catId,
      title: '级联文档',
      contentHtml: 'x',
    });
    await post(`/api/documents/${extra.body.id}/versions`).send({ changeSummary: 's' });
    await del(`/api/documents/${extra.body.id}`);
    const cnt = await pool.query(
      'SELECT COUNT(*)::int AS c FROM doc_version WHERE document_id = $1',
      [extra.body.id],
    );
    expect(cnt.rows[0].c).toBe(0);
  });
});