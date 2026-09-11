import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../auth/auth.service';
import { errorApp } from '../middleware/errorHandler';
import type { AuthUser, Role } from '../auth/auth.types';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** 当前登录用户，由 requireAuth 注入 */
      user?: AuthUser;
      /** 原始 Bearer Token，供退出登录时使用 */
      authToken?: string;
    }
  }
}

/**
 * 登录鉴权中间件：校验 Authorization: Bearer <token>，
 * 解析成功后将当前用户挂到 req.user，失败返回 401。
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  // 兼容 PDF 预览等 <a>/<iframe> 直接导航场景：header 无 token 时允许通过 ?token= 传递
  const authToken = scheme === 'Bearer' && token ? token : String(req.query.token || '');
  if (!authToken) {
    next(errorApp(401, '未登录或登录已过期', 'UNAUTHORIZED'));
    return;
  }
  try {
    const user = await verifyToken(authToken);
    if (!user) {
      next(errorApp(401, '未登录或登录已过期', 'UNAUTHORIZED'));
      return;
    }
    req.user = user;
    req.authToken = authToken;
    next();
  } catch (err) {
    next(err);
  }
}

/** 角色校验中间件工厂：不满足角色返回 403 */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      next(errorApp(403, '无权限执行该操作', 'FORBIDDEN'));
      return;
    }
    next();
  };
}
