import express from 'express';
import cors from 'cors';
import { router } from './routes';
import { errorHandler } from './middleware/errorHandler';

/**
 * 应用实例工厂：仅供服务器入口(index.ts)启动与测试引用，不在此处 listen。
 */
export function createApp(): express.Express {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  app.use('/api', router);

  app.use(errorHandler);
  return app;
}

export default createApp();