import { describe, it, expect, vi, afterEach } from 'vitest';
import { apiGet, parseBody, HttpError } from '../client';

describe('API client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parseBody 解析成功 JSON', async () => {
    const body = await parseBody({
      ok: true,
      status: 200,
      text: () => Promise.resolve('{"id":1}'),
    } as never);
    expect(body).toEqual({ id: 1 });
  });

  it('parseBody 对非 2xx 抛 HttpError 携带 {code,message}', async () => {
    try {
      await parseBody({
        ok: false,
        status: 404,
        text: () => Promise.resolve('{"code":"DOC_NOT_FOUND","message":"文档不存在"}'),
      } as never);
      throw new Error('expected to throw but did not');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      if (error instanceof HttpError) {
        expect(error.status).toBe(404);
        expect(error.code).toBe('DOC_NOT_FOUND');
        expect(error.message).toBe('文档不存在');
      }
    }
  });

  it('apiGet 对 404 响应抛错', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve('{"code":"X","message":"未找到"}'),
    } as Response);
    await expect(apiGet('/api/x')).rejects.toBeInstanceOf(HttpError);
  });
});