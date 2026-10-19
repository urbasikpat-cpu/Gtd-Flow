import { describe, it, expect } from 'vitest';
import { detectShoppingCategory } from './utils.js';

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
