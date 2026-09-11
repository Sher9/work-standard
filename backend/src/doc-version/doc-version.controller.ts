import { Router, type Request, type Response } from 'express';
import * as service from '../doc-version/doc-version.service';
import { requireRole } from '../common/auth';

export const docVersionRouter = Router({ mergeParams: true });

docVersionRouter.get('/', async (req: Request, res: Response) => {
  const versions = await service.listVersions(Number(req.params.documentId));
  res.json(versions);
});

docVersionRouter.post('/', requireRole('admin'), async (req: Request, res: Response) => {
  const created = await service.createVersion({
    ...req.body,
    documentId: req.params.documentId,
  });
  res.status(201).json(created);
});

docVersionRouter.put('/:id', requireRole('admin'), async (req: Request, res: Response) => {
  const updated = await service.updateVersion(Number(req.params.id), {
    contentSnapshot: req.body.contentSnapshot,
    changeSummary: req.body.changeSummary,
  });
  res.json(updated);
});

docVersionRouter.delete('/:id', requireRole('admin'), async (req: Request, res: Response) => {
  const result = await service.deleteVersion(Number(req.params.id));
  res.json(result);
});
