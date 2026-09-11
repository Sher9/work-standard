import * as fs from 'node:fs';
import { resolve } from 'node:path';
import multer from 'multer';
import { errorApp } from '../middleware/errorHandler';
import * as fileRepo from './file.repository';
import type { FileMeta } from './file.types';

export const UPLOAD_DIR = resolve(process.cwd(), 'uploads');
const MAX_SIZE = 20 * 1024 * 1024; // 20MB

export function ensureUploadDir(): string {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  return UPLOAD_DIR;
}

function safeExt(original: string): string {
  const ext = original.toLowerCase().match(/\.[a-z0-9]+$/);
  return ext ? ext[0] : '';
}

/** 仅允许 PDF：文档内容除富文本外只支持上传 PDF */
export const pdfUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      try {
        cb(null, ensureUploadDir());
      } catch (e: any) {
        cb(e, '');
      }
    },
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      cb(null, `${unique}${safeExt(file.originalname)}`);
    },
  }),
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    const isPdf =
      file.mimetype === 'application/pdf' || /\.pdf$/i.test(file.originalname || '');
    if (!isPdf) {
      cb(errorApp(400, '仅支持上传 PDF 文件'));
      return;
    }
    cb(null, true);
  },
});

/**
 * multer(busboy) 默认按 latin1 解析 multipart 文件名，中文名会变成乱码，
 * 这里把 latin1 字节序列还原为 UTF-8。
 */
function decodeFileName(name: string): string {
  if (!name) return name;
  if (!/[\u0080-\u00ff]/.test(name)) return name;
  const decoded = Buffer.from(name, 'latin1').toString('utf8');
  return decoded.includes('\ufffd') ? name : decoded;
}

export async function saveUpload(file: Express.Multer.File): Promise<FileMeta> {
  return fileRepo.create({
    filename: decodeFileName(file.originalname),
    path: file.path,
    mimeType: file.mimetype || 'application/pdf',
  });
}

export async function getMetaOrThrow(id: number): Promise<FileMeta> {
  const meta = await fileRepo.findById(id);
  if (!meta) throw errorApp(404, '文件不存在，预览不可用');
  return meta;
}

export async function getStreamOrThrow(path: string): Promise<fs.ReadStream> {
  try {
    await fs.promises.access(path, fs.constants.R_OK);
  } catch {
    throw errorApp(404, '文件不存在，预览不可用');
  }
  return fs.createReadStream(path);
}

export async function resolvePreview(id: number): Promise<FileMeta & { stream: fs.ReadStream }> {
  const meta = await getMetaOrThrow(id);
  const stream = await getStreamOrThrow(meta.path);
  return { ...meta, stream };
}
