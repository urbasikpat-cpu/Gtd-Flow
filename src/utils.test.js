import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { detectShoppingCategory } from './utils.js';

describe('detectShoppingCategory', () => {
  test('returns dry_goods when input is undefined or empty', () => {
    assert.equal(detectShoppingCategory(), 'dry_goods');
    assert.equal(detectShoppingCategory(''), 'dry_goods');
    assert.equal(detectShoppingCategory(null), 'dry_goods');
  });

  test('returns frozen for items starting with "tk-" or containing "tk " or "tiefkühl"', () => {
    assert.equal(detectShoppingCategory('tk-pizza'), 'frozen');
    assert.equal(detectShoppingCategory('tk gemüse'), 'frozen');
    assert.equal(detectShoppingCategory('tiefkühlkost'), 'frozen');
    assert.equal(detectShoppingCategory('etwas tk pizza'), 'frozen');
    assert.equal(detectShoppingCategory('TK-Pizza'), 'frozen'); // case insensitive
    assert.equal(detectShoppingCategory(' TK Pizza'), 'frozen'); // trim test
  });

  test('returns correct category for exact keywords', () => {
    assert.equal(detectShoppingCategory('Apfel'), 'fresh');
    assert.equal(detectShoppingCategory('Kuchen'), 'bakery');
    assert.equal(detectShoppingCategory('Steak'), 'meat_fish');
    assert.equal(detectShoppingCategory('Milch'), 'fridge');
    assert.equal(detectShoppingCategory('Nudel'), 'dry_goods'); // Exact keyword "nudel"
  });

  test('returns correct category for partial string matches', () => {
    assert.equal(detectShoppingCategory('Bio Äpfel'), 'fresh');
    assert.equal(detectShoppingCategory('Ein Brot kaufen'), 'bakery');
    assert.equal(detectShoppingCategory('leckeres hähnchen'), 'meat_fish');
    assert.equal(detectShoppingCategory('Spaghetti al Pomodoro'), 'dry_goods');
  });

  test('is case insensitive', () => {
    assert.equal(detectShoppingCategory('TOMATE'), 'fresh');
    assert.equal(detectShoppingCategory('ScHoKoLade'), 'snacks');
  });

  test('ignores whitespace', () => {
    assert.equal(detectShoppingCategory('   käse   '), 'fridge');
  });

  test('returns dry_goods if no keywords match', () => {
    assert.equal(detectShoppingCategory('Fahrrad'), 'dry_goods');
    assert.equal(detectShoppingCategory('Monitor'), 'dry_goods');
    assert.equal(detectShoppingCategory('RandomItem'), 'dry_goods');
  });
});
