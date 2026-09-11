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
  const cat = await post('/api/categories').send({ name: '收藏分类' });
  catId = cat.body.id;
  const doc = await post('/api/documents')
    .send({ categoryId: catId, title: '收藏阅读文档', contentHtml: '正文内容', status: 'published' });
  docId = doc.body.id;
});

describe('收藏模块 /api/favorites', () => {
  it('收藏文档', async () => {
    const res = await post('/api/favorites').send({ documentId: docId });
    expect(res.status).toBe(201);
  });

  it('重复收藏幂等', async () => {
    const res = await post('/api/favorites').send({ documentId: docId });
    expect([200, 201]).toContain(res.status);
    const list = await get('/api/favorites');
    const count = list.body.filter((f: any) => f.document_id === docId).length;
    expect(count).toBe(1);
  });

  it('查询本人收藏', async () => {
    const res = await get('/api/favorites');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((f: any) => f.document_id === docId)).toBe(true);
  });

  it('收藏文档需存在', async () => {
    const res = await post('/api/favorites').send({ documentId: 999999 });
    expect(res.status).toBe(404);
  });

  it('取消收藏', async () => {
    const res = await del(`/api/favorites/${docId}`);
    expect(res.status).toBe(200);
    const list = await get('/api/favorites');
    expect(list.body.some((f: any) => f.document_id === docId)).toBe(false);
  });
});

describe('阅读计数 /api/documents/:id/read', () => {
  it('读取递增 read_count 并返回正文', async () => {
    const res1 = await get(`/api/documents/${docId}/read`);
    expect(res1.status).toBe(200);
    expect(res1.body.read_count).toBe(1);
    expect(res1.body.content_html).toBeTruthy();

    const res2 = await get(`/api/documents/${docId}/read`);
    expect(res2.body.read_count).toBe(2);
  });
});