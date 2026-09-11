export interface FileMeta {
  id: number;
  filename: string;
  path: string;
  mime_type: string | null;
  created_at?: string;
}

export interface FileRecord extends FileMeta {}