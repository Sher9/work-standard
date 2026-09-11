import { describe, it, expect, beforeAll, afterAll } from 'vitest';
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
import { query } from '../../src/db/pool';

describe('文件预览 /api/files', () => {
  beforeAll(async () => {
    await query('DELETE FROM file_meta WHERE id = 100');
    await query('INSERT INTO file_meta (id, filename, path, mime_type) VALUES (100, \'指南.pdf\', \'/nonexistent/指南.pdf\', \'application/pdf\')');
  });

  afterAll(async () => {
    await query('DELETE FROM file_meta WHERE id = 100');
  });

  it('缺失/不存在的文件预览返回 404 预览不可用', async () => {
    const res = await get('/api/files/99999/preview');
    expect(res.status).toBe(404);
    expect(res.body.code).toBeDefined();
    expect(res.body.message).toContain('预览不可用');
  });

  it('file_meta 存在但物理文件缺失返回预览不可用', async () => {
    const res = await get('/api/files/100/preview');
    expect(res.status).toBe(404);
    expect(res.body.message).toContain('预览不可用');
  });
});