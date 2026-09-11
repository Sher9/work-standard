import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { errorApp } from '../middleware/errorHandler';
import { requireRole } from '../common/auth';
import { pdfUpload, resolvePreview, saveUpload } from './file.service';

export async function preview(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  const file = await resolvePreview(id);
  res.contentType(file.mime_type || 'application/octet-stream');
  const encoded = encodeURIComponent(file.filename);
  res.setHeader(
    'Content-Disposition',
    `inline; filename="${encoded}"; filename*=UTF-8''${encoded}`,
  );
  file.stream.pipe(res);
}

/** 上传 PDF：multipart/form-data，字段名 file，仅管理员可操作 */
export function upload(req: Request, res: Response, next: NextFunction): void {
  pdfUpload.single('file')(req, res, (err: unknown) => {
    const e = err as { statusCode?: number; message?: string };
    if (e) {
      next(errorApp(e.statusCode || 400, e.message || '文件上传失败'));
      return;
    }
    if (!req.file) {
      next(errorApp(400, '请选择要上传的 PDF 文件'));
      return;
    }
    saveUpload(req.file)
      .then((meta) => res.status(201).json(meta))
      .catch(next);
  });
}

export const fileRouter = Router();

fileRouter.post('/upload', requireRole('admin'), upload);
fileRouter.get('/:id/preview', preview);
