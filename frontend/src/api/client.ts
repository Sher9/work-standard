const API_BASE = (import.meta.env.VITE_API_BASE as string) || '';

export interface ApiErrorBody {
  code: string;
  message: string;
}

export class HttpError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function parseBody(res: {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
}): Promise<unknown> {
  const raw = await res.text();
  let body: unknown = null;
  if (raw) {
    try {
      body = JSON.parse(raw);
    } catch {
      body = raw;
    }
  }
  if (!res.ok) {
    const err = (body || {}) as Partial<ApiErrorBody>;
    throw new HttpError(res.status, err.code || 'ERROR', err.message || '请求失败');
  }
  return body;
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    const raw = window.localStorage.getItem('kb_auth');
    if (raw) {
      try {
        const d = JSON.parse(raw);
        if (d.token) headers['Authorization'] = `Bearer ${d.token}`;
      } catch {
        /* ignore */
      }
    }
  }
  return headers;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: authHeaders(),
    ...init,
  });
  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('kb_auth');
      if (window.location.pathname !== '/login') window.location.assign('/login');
    }
    throw (await parseBody(res)) as HttpError;
  }
  return (await parseBody(res)) as T;
}

export function apiGet<T>(url: string): Promise<T> {
  return request<T>(url);
}

export function apiPost<T>(url: string, body?: unknown): Promise<T> {
  return request<T>(url, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
}

export function apiPut<T>(url: string, body?: unknown): Promise<T> {
  return request<T>(url, { method: 'PUT', body: body ? JSON.stringify(body) : undefined });
}

export function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  return request<T>(url, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined });
}

export function apiDelete<T>(url: string): Promise<T> {
  return request<T>(url, { method: 'DELETE' });
}

/** 文件上传：不设置 Content-Type，由浏览器自动补齐 multipart boundary */
export async function apiUpload<T>(url: string, formData: FormData): Promise<T> {
  const headers: Record<string, string> = {};
  if (typeof window !== 'undefined') {
    const raw = window.localStorage.getItem('kb_auth');
    if (raw) {
      try {
        const d = JSON.parse(raw);
        if (d.token) headers['Authorization'] = `Bearer ${d.token}`;
      } catch {
        /* ignore */
      }
    }
  }
  const res = await fetch(`${API_BASE}${url}`, { method: 'POST', body: formData, headers });
  return (await parseBody(res)) as T;
}

export interface LoginResult {
  token: string;
  employee: { employee_no: string; name: string; role: 'admin' | 'user' };
}

export async function apiLogin(input: { employeeNo: string; password: string }): Promise<LoginResult> {
  return apiPost<LoginResult>('/api/auth/login', input);
}

/** 生成带鉴权 token 的 PDF 预览地址（<a> / <iframe> 无法携带 header，需通过 query 传 token） */
export function filePreviewUrl(fileId: number | null | undefined): string | null {
  if (fileId == null) return null;
  let token = '';
  if (typeof window !== 'undefined') {
    const raw = window.localStorage.getItem('kb_auth');
    if (raw) {
      try {
        const d = JSON.parse(raw);
        if (d.token) token = d.token;
      } catch {
        /* ignore */
      }
    }
  }
  const q = token ? `?token=${encodeURIComponent(token)}` : '';
  return `/api/files/${fileId}/preview${q}`;
}
