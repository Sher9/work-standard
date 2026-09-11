import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from '../../src/common/sanitize';

describe('富文本 XSS 清洗', () => {
  it('移除 script 标签', () => {
    expect(sanitizeHtml('<p>你好<script>alert(1)</script></p>')).toBe('<p>你好</p>');
  });

  it('移除事件属性 onerror', () => {
    expect(sanitizeHtml('<img src="x" onerror="alert(1)">')).not.toContain('onerror');
  });

  it('移除 javascript: 链接', () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">点我</a>')).not.toContain('javascript:');
  });

  it('保留安全标签与内容', () => {
    const out = sanitizeHtml('<p><strong>正常</strong>文本</p>');
    expect(out).toContain('<strong>正常</strong>');
    expect(out).toContain('文本');
  });

  it('iframe 被移除', () => {
    expect(sanitizeHtml('<iframe src="http://evil.com"></iframe>x')).toBe('x');
  });
});