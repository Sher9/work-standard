import { Router, type Request, type Response } from 'express';
import * as service from '../catalog/category.service';
import { requireRole } from '../common/auth';

export const categoryRouter = Router();

categoryRouter.get('/tree', async (_req: Request, res: Response) => {
  const tree = await service.getTree();
  res.json(tree);
});

categoryRouter.get('/search', async (req: Request, res: Response) => {
  const rows = await service.searchCategories(req.query.q as string);
  res.json(rows);
});

categoryRouter.get('/:id', async (req: Request, res: Response) => {
  const detail = await service.getCategoryDetail(Number(req.params.id));
  res.json(detail);
});

categoryRouter.post('/', requireRole('admin'), async (req: Request, res: Response) => {
  const created = await service.createCategory(req.body);
  res.status(201).json(created);
});

categoryRouter.put('/sort', requireRole('admin'), async (req: Request, res: Response) => {
  await service.sortCategories(req.body.items);
  res.json({ message: '排序已保存' });
});

categoryRouter.put('/:id', requireRole('admin'), async (req: Request, res: Response) => {
  const updated = await service.updateCategory(Number(req.params.id), {
    name: req.body.name,
    icon: req.body.icon,
  });
  res.json(updated);
});

categoryRouter.delete('/:id', requireRole('admin'), async (req: Request, res: Response) => {
  const result = await service.deleteCategory(Number(req.params.id));
  res.json(result);
});
