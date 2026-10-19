import { describe, it, expect } from 'vitest';
import { escapeHtml } from './utils';

describe('escapeHtml', () => {
  it('should return empty string for null, undefined, or empty string', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml('')).toBe('');
  });

  it('should return the same string if no HTML entities are present', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World');
    expect(escapeHtml('123')).toBe('123');
  });

  it('should convert numbers to strings', () => {
    expect(escapeHtml(123)).toBe('123');
    expect(escapeHtml(0)).toBe('0');
  });

  it('should escape & character', () => {
    expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
  });

  it('should escape < and > characters', () => {
    expect(escapeHtml('<div>')).toBe('&lt;div&gt;');
    expect(escapeHtml('1 < 2 && 2 > 1')).toBe('1 &lt; 2 &amp;&amp; 2 &gt; 1');
  });

  it('should escape " character', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
  });

  it('should escape all special characters in a complex string', () => {
    expect(escapeHtml('<script>alert("XSS & hacks")</script>')).toBe('&lt;script&gt;alert(&quot;XSS &amp; hacks&quot;)&lt;/script&gt;');
  });

  it('should handle strings with only special characters', () => {
    expect(escapeHtml('<>&"')).toBe('&lt;&gt;&amp;&quot;');
  });

  it('should handle objects with toString method', () => {
    const obj = { toString: () => '<hello>' };
    expect(escapeHtml(obj)).toBe('&lt;hello&gt;');
  });
});
