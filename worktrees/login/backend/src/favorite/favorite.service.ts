import * as favRepo from '../favorite/favorite.repository';
import * as docRepo from '../document/document.repository';
import { errorApp } from '../middleware/errorHandler';
import type { FavoriteRow } from '../favorite/favorite.types';

export async function listFavorites(employeeNo: string): Promise<FavoriteRow[]> {
  return favRepo.listFavorites(employeeNo);
}

export async function addFavorite(documentId: number, employeeNo: string): Promise<void> {
  const doc = await docRepo.findById(documentId);
  if (!doc) throw errorApp(404, '文档不存在');
  await favRepo.addFavorite(documentId, employeeNo);
}

export async function removeFavorite(documentId: number, employeeNo: string): Promise<void> {
  await favRepo.removeFavorite(documentId, employeeNo);
}
