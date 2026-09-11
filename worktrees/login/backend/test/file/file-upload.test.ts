import * as fs from 'node:fs';
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
import { query } from '../../src/db/pool';

const PDF = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n%%EOF\n');

describe('PDF 上传 /api/files', () => {
  it('上传 PDF 返回文件元信息并可预览', async () => {
    const res = await post('/api/files/upload')
      .attach('file', PDF, { filename: '指南.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    expect(res.body.filename).toBe('指南.pdf');
    expect(res.body.mime_type).toBe('application/pdf');

    const preview = await get(`/api/files/${res.body.id}/preview`);
    expect(preview.status).toBe(200);

    await query('DELETE FROM file_meta WHERE id = $1', [res.body.id]);
    fs.rmSync(res.body.path, { force: true });
  });

  it('非 PDF 文件被拒绝', async () => {
    const res = await post('/api/files/upload')
      .attach('file', Buffer.from('hello'), { filename: '说明.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('PDF');
  });

  it('未选择文件时返回 400', async () => {
    const res = await post('/api/files/upload');
    expect(res.status).toBe(400);
    expect(res.body.message).toBeTruthy();
  });
});
