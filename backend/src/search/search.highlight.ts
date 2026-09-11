/**
 * 生成搜索高亮片段：截取关键词首次命中附近的内容，并包裹 <em> 标记。
 */
export function buildHighlight(content: string, keyword: string, maxLen = 120): string {
  const text = content || '';
  if (!text || !keyword) return '';

  const lower = text.toLowerCase();
  const idx = lower.indexOf(keyword.toLowerCase());
  if (idx === -1) {
    return text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
  }

  const ctx = Math.floor((maxLen - keyword.length) / 2);
  const start = Math.max(0, idx - ctx);
  let snippet = text.slice(start, Math.min(text.length, start + maxLen));
  if (start > 0) snippet = '…' + snippet;
  if (start + maxLen < text.length) snippet += '…';

  const re = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  return snippet.replace(re, (m) => `<em>${m}</em>`);
}