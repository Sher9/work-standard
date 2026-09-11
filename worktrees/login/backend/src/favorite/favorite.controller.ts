import { Router, type Request, type Response } from 'express';
import * as service from '../favorite/favorite.service';

export const favoriteRouter = Router();

favoriteRouter.get('/', async (req: Request, res: Response) => {
  const list = await service.listFavorites(req.user!.employeeNo);
  res.json(list);
});

favoriteRouter.post('/', async (req: Request, res: Response) => {
  await service.addFavorite(Number(req.body.documentId), req.user!.employeeNo);
  res.status(201).json({ message: '收藏成功' });
});

favoriteRouter.delete('/:documentId', async (req: Request, res: Response) => {
  await service.removeFavorite(Number(req.params.documentId), req.user!.employeeNo);
  res.json({ message: '取消收藏成功' });
});
