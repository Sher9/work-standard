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

beforeAll(async () => {
  await pool.query('DELETE FROM favorite');
  await pool.query('DELETE FROM document');
  await pool.query('DELETE FROM category');
});

describe('分类模块 /api/categories', () => {
  it('新增一级分类', async () => {
    const res = await post('/api/categories').send({ name: '产品手册' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    expect(res.body.name).toBe('产品手册');
    expect(res.body.parent_id).toBe(null);
  });

  it('新增二级分类挂父级', async () => {
    const parent = await post('/api/categories').send({ name: '一级' });
    const child = await post('/api/categories')
      .send({ name: '二级', parentId: parent.body.id });
    expect(child.status).toBe(201);
    expect(child.body.parent_id).toBe(parent.body.id);
  });

  it('树形查询按层级返回', async () => {
    const res = await get('/api/categories/tree');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const root = res.body.find((c: any) => c.name === '一级');
    expect(root).toBeTruthy();
    expect(Array.isArray(root.children)).toBe(true);
    expect(root.children.length).toBeGreaterThan(0);
  });

  it('支持无限级子分类', async () => {
    const l1 = await post('/api/categories').send({ name: '无限级一级' });
    const l2 = await post('/api/categories')
      .send({ name: '无限级二级', parentId: l1.body.id });
    const l3 = await post('/api/categories')
      .send({ name: '无限级三级', parentId: l2.body.id });
    expect(l2.body.level).toBe(1);
    expect(l3.status).toBe(201);
    expect(l3.body.parent_id).toBe(l2.body.id);
    expect(l3.body.level).toBe(2);

    const tree = await get('/api/categories/tree');
    const root = tree.body.find((c: any) => c.name === '无限级一级');
    expect(root.children[0].name).toBe('无限级二级');
    expect(root.children[0].children[0].name).toBe('无限级三级');
  });

  it('不同父级下允许同名分类', async () => {
    const a = await post('/api/categories').send({ name: '同名分支A' });
    const b = await post('/api/categories').send({ name: '同名分支B' });
    const childA = await post('/api/categories')
      .send({ name: '通用', parentId: a.body.id });
    const childB = await post('/api/categories')
      .send({ name: '通用', parentId: b.body.id });
    expect(childA.status).toBe(201);
    expect(childB.status).toBe(201);

    const dup = await post('/api/categories')
      .send({ name: '通用', parentId: a.body.id });
    expect([400, 409]).toContain(dup.status);
  });

  it('重名分类被拒绝', async () => {
    await post('/api/categories').send({ name: '唯一名' });
    const dup = await post('/api/categories').send({ name: '唯一名' });
    expect([400, 409]).toContain(dup.status);
  });

  it('更新分类名称', async () => {
    const created = await post('/api/categories').send({ name: '待改名' });
    const res = await put(`/api/categories/${created.body.id}`)
      .send({ name: '已改名' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('已改名');
  });

  it('同父级批量排序持久化', async () => {
    const a = await post('/api/categories').send({ name: '排序A' });
    const b = await post('/api/categories').send({ name: '排序B' });
    const res = await put('/api/categories/sort').send({
      items: [
        { id: b.body.id, sortOrder: 0 },
        { id: a.body.id, sortOrder: 1 },
      ],
    });
    expect(res.status).toBe(200);
    const tree = await get('/api/categories/tree');
    const names = tree.body
      .filter((c: any) => c.parent_id === null)
      .map((c: any) => c.name);
    expect(names.indexOf('排序B')).toBeLessThan(names.indexOf('排序A'));
  });

  it('删除含子级的分类被拒绝', async () => {
    const parent = await post('/api/categories').send({ name: '删除父级' });
    await post('/api/categories').send({ name: '子级', parentId: parent.body.id });
    const res = await del(`/api/categories/${parent.body.id}`);
    expect([400, 409]).toContain(res.status);
    expect(res.body.message).toBeTruthy();
  });

  it('删除空分类成功', async () => {
    const c = await post('/api/categories').send({ name: '可删除' });
    const res = await del(`/api/categories/${c.body.id}`);
    expect(res.status).toBe(200);
  });

  it('新增分类支持 icon 并返回 level', async () => {
    const root = await post('/api/categories')
      .send({ name: '带图标分类', icon: 'folder' });
    expect(root.status).toBe(201);
    expect(root.body.icon).toBe('folder');
    expect(root.body.level).toBe(0);
    const child = await post('/api/categories')
      .send({ name: '带图标子级', parentId: root.body.id });
    expect(child.body.level).toBe(1);
  });

  it('更新分类 icon', async () => {
    const c = await post('/api/categories').send({ name: '改图标' });
    const res = await put(`/api/categories/${c.body.id}`).send({ icon: 'star' });
    expect(res.status).toBe(200);
    expect(res.body.icon).toBe('star');
  });

  it('按关键字搜索分类', async () => {
    await post('/api/categories').send({ name: '金融法规' });
    const res = await get('/api/categories/search?q=金融');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((c: any) => c.name === '金融法规')).toBe(true);
  });
  it('查询分类详情返回子级与文档数量', async () => {
    const parent = await post('/api/categories').send({ name: '详情一级' });
    await post('/api/categories').send({ name: '详情子级', parentId: parent.body.id });
    const res = await get(`/api/categories/${parent.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(parent.body.id);
    expect(res.body.name).toBe('详情一级');
    expect(res.body.documentCount).toBe(0);
    const children = res.body.children as any[];
    expect(children.length).toBe(1);
    expect(children[0].name).toBe('详情子级');
  });

  it('查询不存在的分类详情返回 404', async () => {
    const res = await get('/api/categories/999999');
    expect(res.status).toBe(404);
  });
});
