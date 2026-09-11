export interface SearchResult {
  id: number;
  title: string;
  content_html: string;
  category_id: number;
  read_count: number;
  highlight?: string;
}