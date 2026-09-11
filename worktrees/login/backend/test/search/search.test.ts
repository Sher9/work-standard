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
import { buildHighlight } from '../../src/search/search.highlight';

let catId: number;

beforeAll(async () => {
  await pool.query('DELETE FROM favorite');
  await pool.query('DELETE FROM doc_version');
  await pool.query('DELETE FROM document');
  await pool.query('DELETE FROM category');
  const cat = await post('/api/categories').send({ name: '搜索分类' });
  catId = cat.body.id;
  await post('/api/documents').send({
    categoryId: catId, title: '结算业务手册', contentHtml: '本手册介绍结算流程与操作要点。', status: 'published',
  });
  await post('/api/documents').send({
    categoryId: catId, title: '产品介绍', contentHtml: '该产品支持多币种结算与自动对账。', status: 'published',
  });
  await post('/api/documents').send({
    categoryId: catId, title: '政策法规', contentHtml: '不相关内容。', status: 'published',
  });
});

describe('全文搜索', () => {
  it('命中标题与内容，按相关度排序（标题命中优先）', async () => {
    const res = await get('/api/documents/search?q=结算');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    // 标题直接命中 '结算业务手册' 应排在最前
    expect(res.body[0].title).toBe('结算业务手册');
  });

  it('命中结果包含高亮片段', async () => {
    const res = await get('/api/documents/search?q=对账');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].highlight).toBeTruthy();
  });

  it('无匹配返回空数组', async () => {
    const res = await get('/api/documents/search?q=不存在的关键词xyz');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('高亮片段生成', () => {
  it('将命中关键词包裹高亮标记', () => {
    const snippet = buildHighlight('本手册介绍结算流程', '结算');
    expect(snippet).toContain('<em>结算</em>');
  });

  it('无命中时返回原内容前缀', () => {
    const snippet = buildHighlight('本手册介绍结算流程', '不存在');
    expect(snippet).not.toContain('<em>');
  });
});