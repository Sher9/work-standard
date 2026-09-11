/**
 * 全局错误处理中间件：统一捕获异常并返回标准格式 {code, message}
 */
import type { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorApp(statusCode: number, message: string, code = 'ERROR'): AppError {
  const err: AppError = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';

  if (statusCode >= 500) {
    console.error('[Error]', err.message);
  }

  res.status(statusCode).json({ code, message: err.message || 'Internal Server Error' });
}