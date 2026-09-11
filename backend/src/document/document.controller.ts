import { Router, type Request, type Response } from 'express';
import * as service from '../document/document.service';
import { requireRole } from '../common/auth';

export const documentRouter = Router();

documentRouter.get('/', async (req: Request, res: Response) => {
  const docs = await service.listDocuments(req.query as { view?: string });
  res.json(docs);
});

documentRouter.get('/search', async (req: Request, res: Response) => {
  const docs = await service.searchDocuments(req.query.q as string);
  res.json(docs);
});

documentRouter.get('/:id/read', async (req: Request, res: Response) => {
  const doc = await service.readDocument(Number(req.params.id));
  res.json(doc);
});

documentRouter.get('/:id', async (req: Request, res: Response) => {
  const doc = await service.getDocument(Number(req.params.id));
  res.json(doc);
});

documentRouter.post('/', requireRole('admin'), async (req: Request, res: Response) => {
  const doc = await service.createDocument(req.body);
  res.status(201).json(doc);
});

documentRouter.put('/:id', requireRole('admin'), async (req: Request, res: Response) => {
  const doc = await service.updateDocument(Number(req.params.id), req.body);
  res.json(doc);
});

documentRouter.patch('/:id/status', requireRole('admin'), async (req: Request, res: Response) => {
  const doc = await service.setStatus(Number(req.params.id), req.body.status);
  res.json(doc);
});

documentRouter.post(
  '/:id/transition',
  requireRole('admin'),
  async (req: Request, res: Response) => {
    const result = await service.transitionDocument(Number(req.params.id), {
      ...(req.body ?? {}),
      operatorId: req.user?.employeeNo,
    });
    res.json(result);
  },
);

documentRouter.get('/:id/status-logs', async (req: Request, res: Response) => {
  const logs = await service.listStatusLogs(Number(req.params.id));
  res.json(logs);
});

documentRouter.delete('/:id', requireRole('admin'), async (req: Request, res: Response) => {
  const result = await service.deleteDocument(Number(req.params.id));
  res.json(result);
});
