import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { login, bearer } from '../helpers/auth';

describe('认证模块 /api/auth', () => {
  it('登录缺少参数返回 400', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });

  it('错误密码返回 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ employeeNo: 'E10001', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('管理员登录成功返回 token 与角色', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ employeeNo: 'E10001', password: 'admin123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.employee.role).toBe('admin');
    expect(res.body.employee.employee_no).toBe('E10001');
  });

  it('普通用户登录成功角色为 user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ employeeNo: 'E10002', password: 'user123' });
    expect(res.status).toBe(200);
    expect(res.body.employee.role).toBe('user');
  });

  it('未登录访问受保护接口返回 401', async () => {
    const res = await request(app).get('/api/documents');
    expect(res.status).toBe(401);
  });

  it('/api/auth/me 返回当前用户信息', async () => {
    const token = await login('admin');
    const res = await request(app).get('/api/auth/me').set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.employee.employee_no).toBe('E10001');
    expect(res.body.employee.role).toBe('admin');
  });
});

describe('角色权限', () => {
  let adminToken = '';
  let userToken = '';
  beforeAll(async () => {
    adminToken = await login('admin');
    userToken = await login('user');
  });

  it('管理员可创建分类', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set(bearer(adminToken))
      .send({ name: '权限测试分类' });
    expect(res.status).toBe(201);
  });

  it('普通用户创建分类被 403', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set(bearer(userToken))
      .send({ name: '越权分类' });
    expect(res.status).toBe(403);
  });

  it('普通用户可查看文档列表', async () => {
    const res = await request(app).get('/api/documents').set(bearer(userToken));
    expect(res.status).toBe(200);
  });

  it('普通用户可收藏文档', async () => {
    const cat = await request(app).post('/api/categories').set(bearer(adminToken)).send({ name: '收藏测试分类' });
    const created = await request(app)
      .post('/api/documents')
      .set(bearer(adminToken))
      .send({ categoryId: cat.body.id, title: '收藏测试', contentHtml: 'x', status: 'published' });
    expect(created.status).toBe(201);
    const fav = await request(app).post('/api/favorites').set(bearer(userToken)).send({ documentId: created.body.id });
    expect(fav.status).toBe(201);
  });
});
