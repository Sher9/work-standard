/**
 * 应用入口文件：初始化数据库并启动 HTTP 服务
 */
import dotenv from 'dotenv';
import app from './app';
import { initSchema, closePool } from './db/init';
import { seedEmployees } from './auth/auth.service';

dotenv.config();

const PORT = process.env.PORT || 3000;

async function bootstrap(): Promise<void> {
  try {
    await initSchema();
    await seedEmployees();
    app.listen(PORT, () => {
      console.log(`🚀 Server is running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[Bootstrap] 数据库初始化失败', err);
    await closePool();
    process.exit(1);
  }
}

bootstrap();