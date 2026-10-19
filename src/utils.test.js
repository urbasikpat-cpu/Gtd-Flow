import { describe, it, expect } from 'vitest';
import { escapeHtml, detectShoppingCategory } from './utils';

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

describe('detectShoppingCategory', () => {
  it('returns dry_goods when input is undefined or empty', () => {
    expect(detectShoppingCategory()).toBe('dry_goods');
    expect(detectShoppingCategory('')).toBe('dry_goods');
    expect(detectShoppingCategory(null)).toBe('dry_goods');
  });

  it('returns frozen for items starting with "tk-" or containing "tk " or "tiefkühl"', () => {
    expect(detectShoppingCategory('tk-pizza')).toBe('frozen');
    expect(detectShoppingCategory('tk gemüse')).toBe('frozen');
    expect(detectShoppingCategory('tiefkühlkost')).toBe('frozen');
    expect(detectShoppingCategory('etwas tk pizza')).toBe('frozen');
    expect(detectShoppingCategory('TK-Pizza')).toBe('frozen'); // case insensitive
    expect(detectShoppingCategory(' TK Pizza')).toBe('frozen'); // trim test
  });

  it('returns correct category for exact keywords', () => {
    expect(detectShoppingCategory('Apfel')).toBe('fresh');
    expect(detectShoppingCategory('Kuchen')).toBe('bakery');
    expect(detectShoppingCategory('Steak')).toBe('meat_fish');
    expect(detectShoppingCategory('Milch')).toBe('fridge');
    expect(detectShoppingCategory('Nudel')).toBe('dry_goods'); // Exact keyword "nudel"
  });

  it('returns correct category for partial string matches', () => {
    expect(detectShoppingCategory('Bio Äpfel')).toBe('fresh');
    expect(detectShoppingCategory('Ein Brot kaufen')).toBe('bakery');
    expect(detectShoppingCategory('leckeres hähnchen')).toBe('meat_fish');
    expect(detectShoppingCategory('Spaghetti al Pomodoro')).toBe('dry_goods');
  });

  it('is case insensitive', () => {
    expect(detectShoppingCategory('TOMATE')).toBe('fresh');
    expect(detectShoppingCategory('ScHoKoLade')).toBe('snacks');
  });

  it('ignores whitespace', () => {
    expect(detectShoppingCategory('   käse   ')).toBe('fridge');
  });

  it('returns dry_goods if no keywords match', () => {
    expect(detectShoppingCategory('Fahrrad')).toBe('dry_goods');
    expect(detectShoppingCategory('Monitor')).toBe('dry_goods');
    expect(detectShoppingCategory('RandomItem')).toBe('dry_goods');
  });
});
