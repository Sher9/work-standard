/**
 * 路由聚合文件：统一导出所有子路由
 */
import { Router } from 'express';
import { requireAuth } from '../common/auth';
import { healthRouter } from './health';
import { authRouter } from '../auth/auth.controller';
import { categoryRouter } from '../catalog/category.controller';
import { documentRouter } from '../document/document.controller';
import { favoriteRouter } from '../favorite/favorite.controller';
import { fileRouter } from '../file/file.controller';
import { docVersionRouter } from '../doc-version/doc-version.controller';

export const router = Router();

// 公开接口
router.use('/health', healthRouter);
router.use('/auth', authRouter);

// 以下业务接口均需登录
router.use(requireAuth);
router.use('/categories', categoryRouter);
router.use('/documents', documentRouter);
router.use('/favorites', favoriteRouter);
router.use('/files', fileRouter);
router.use('/documents/:documentId/versions', docVersionRouter);
