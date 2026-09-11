export interface DocVersionRow {
  id: number;
  document_id: number;
  version_no: number;
  content_snapshot: string;
  change_summary: string;
  editor_id: string | null;
  created_at: string;
}

export interface DocVersionInput {
  documentId: number;
  contentSnapshot?: string;
  changeSummary?: string;
  editorId?: string | null;
}