/**
 * 健康检查路由：用于探测服务是否正常运行
 */
import { Router, type Request, type Response } from 'express';

export const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});