import * as assert from 'assert';

import { buildEnumItems } from '../models';

suite('buildEnumItems', () => {
  test('filters out empty string entries', () => {
    const items = buildEnumItems(
      ['', 'claude-opus-4-5', 'claude-sonnet-4-5'],
      [],
    );
    assert.strictEqual(items.length, 2);
    assert.ok(items.every((it) => it.description !== ''));
  });

  test('uses enumItemLabels[i+1] as label (offset by 1)', () => {
    const enums = ['', 'claude-opus-4-5', 'claude-sonnet-4-5'];
    const labels = ['(default)', 'Claude Opus 4.5', 'Claude Sonnet 4.5'];
    const items = buildEnumItems(enums, labels);
    assert.strictEqual(items[0].label, 'Claude Opus 4.5');
    assert.strictEqual(items[1].label, 'Claude Sonnet 4.5');
  });

  test('falls back to enum value as label when no label at index', () => {
    const items = buildEnumItems(['claude-opus-4-5', 'claude-sonnet-4-5'], []);
    assert.strictEqual(items[0].label, 'claude-opus-4-5');
    assert.strictEqual(items[1].label, 'claude-sonnet-4-5');
  });

  test('sets description to the enum value', () => {
    const items = buildEnumItems(['claude-opus-4-5'], ['My Label', 'Opus']);
    assert.strictEqual(items[0].description, 'claude-opus-4-5');
  });

  test('returns empty array when all entries are empty strings', () => {
    const items = buildEnumItems(['', ''], ['a', 'b']);
    assert.strictEqual(items.length, 0);
  });
});
