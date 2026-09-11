import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('App 骨架 smoke', () => {
  it('GET /api/health 返回 {status:ok}', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});