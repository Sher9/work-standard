const ALLOWED_TAGS = new Set([
  'p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'del', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre', 'span',
  'div', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
]);

const ALLOWED_ATTRS_FOR_TAG: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target']),
  img: new Set(['src', 'alt', 'title', 'width', 'height']),
  td: new Set(['colspan', 'rowspan']),
  th: new Set(['colspan', 'rowspan']),
};

const EVENT_ATTR = /^on/i;
const DANGEROUS_HREF = /^\s*(javascript|vbscript):/i;

export function sanitizeHtml(input: string): string {
  if (!input) return '';
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g, (full, rawTag: string, rest: string) => {
      const closing = full.startsWith('</');
      const lower = rawTag.toLowerCase();
      if (!ALLOWED_TAGS.has(lower)) return '';
      const attrs = parseAttrs(lower, rest);
      const open = closing ? `</${lower}>` : attrs.length ? `<${lower}${attrs}>` : `<${lower}>`;
      return open;
    });
}

function parseAttrs(tag: string, rest: string): string {
  const allowed = ALLOWED_ATTRS_FOR_TAG[tag];
  if (!allowed) return '';
  const attrs: string[] = [];
  const re = /([a-zA-Z_-]+)\s*=\s*"([^"]*)"|([a-zA-Z_-]+)\s*=\s*'([^']*)'|([a-zA-Z_-]+)\s*=\s*([^\s"'>]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(rest)) !== null) {
    const name = (m[1] || m[3] || m[5] || '').toLowerCase();
    const value = m[2] || m[4] || m[6] || '';
    if (!allowed.has(name)) continue;
    if (EVENT_ATTR.test(name)) continue;
    if (name === 'href' || name === 'src') {
      if (DANGEROUS_HREF.test(value)) continue;
    }
    attrs.push(` ${name}="${value.replace(/"/g, '"')}"`);
  }
  return attrs.join('');
}