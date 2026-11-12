const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../public/js/config.js');
const L = require('../public/js/logic.js');

test('resolveSettings({}) equals defaults', () => {
  assert.deepEqual(L.resolveSettings({}), C.DEFAULTS);
});
test('resolveSettings keeps delay 0', () => {
  assert.equal(L.resolveSettings({ mode: 'dark', delay: 0 }).delay, 0);
});
test('unknown design falls back to default', () => {
  assert.equal(L.resolveSettings({ design: 'nope' }).design, 'giant-type');
});
test('unknown font falls back to the default (system) font', () => {
  assert.equal(L.resolveSettings({ font: 'nope' }).font, C.DEFAULTS.font);
});
test('delayFor keeps 0 and falls back to settings', () => {
  assert.equal(L.delayFor({ delay: 0 }, { delay: 8 }), 0);
  assert.equal(L.delayFor({}, { delay: 8 }), 8);
});
test('findLink searches nested folders, ignores folders', () => {
  const items = [{ name: 'a', slug: 'a', url: 'u' },
    { name: 'f1', items: [{ name: 'f2', items: [{ name: 'deep', slug: 'deep', url: 'x' }] }] }];
  assert.equal(L.findLink(items, 'deep').url, 'x');
  assert.equal(L.findLink(items, 'f1'), null);
  assert.equal(L.findLink(items, 'f2'), null);
});
test('sortItems puts folders first, stable', () => {
  const items = [{ n: 1, slug: 's' }, { n: 2, items: [] }, { n: 3, slug: 's' }, { n: 4, items: [] }];
  assert.deepEqual(L.sortItems(items).map(i => i.n), [2, 4, 1, 3]);
});
test('numberLabel pads and overflows', () => {
  assert.equal(L.numberLabel(0), '01');
  assert.equal(L.numberLabel(98), '99');
  assert.equal(L.numberLabel(99), '100');
});
test('toggleOpen / isOpen', () => {
  let o = L.toggleOpen([], '0');
  o = L.toggleOpen(o, '0.1');
  assert.ok(L.isOpen(o, '0.1'));
  o = L.toggleOpen(o, '0');
  assert.deepEqual(o, []);
  assert.deepEqual(L.toggleOpen(o, '1'), ['1']);
  assert.equal(L.isOpen(o, '1'), false);
});
test('toggleOpen close keeps siblings like 10 when closing 1', () => {
  assert.deepEqual(L.toggleOpen(['1', '1.0', '10'], '1'), ['10']);
});

const tree = () => [
  { name: 'a', slug: 'a', url: 'u' },
  { name: 'F', items: [{ name: 'b', slug: 'b', url: 'v' }, { name: 'G', items: [] }] },
  { name: 'c', slug: 'c', url: 'w' }
];
test('itemAt reads by index path', () => {
  assert.equal(L.itemAt(tree(), [1, 0]).name, 'b');
  assert.equal(L.itemAt(tree(), [2]).name, 'c');
});
test('removeAt returns a new tree without the item', () => {
  const t = tree();
  const r = L.removeAt(t, [1, 0]);
  assert.equal(r.items[1].items.length, 1);
  assert.equal(r.removed.name, 'b');
  assert.equal(t[1].items.length, 2);
});
test('insertAt puts an item into a folder at an index', () => {
  const r = L.insertAt(tree(), [1], 1, { name: 'n' });
  assert.deepEqual(r[1].items.map(i => i.name), ['b', 'n', 'G']);
  assert.equal(L.insertAt(tree(), [], 0, { name: 'n' })[0].name, 'n');
});
test('moveItem moves into a folder', () => {
  const r = L.moveItem(tree(), [0], [1], 0);
  assert.deepEqual(r.map(i => i.name), ['F', 'c']);
  assert.deepEqual(r[0].items.map(i => i.name), ['a', 'b', 'G']);
});
test('moveItem out of a folder', () => {
  const r = L.moveItem(tree(), [1, 0], [], 0);
  assert.deepEqual(r.map(i => i.name), ['b', 'a', 'F', 'c']);
});
test('moveItem reorders in the same list with the index in the list before removal', () => {
  const r = L.moveItem(tree(), [0], [], 3);
  assert.deepEqual(r.map(i => i.name), ['F', 'c', 'a']);
  const s = L.moveItem(tree(), [2], [], 0);
  assert.deepEqual(s.map(i => i.name), ['c', 'a', 'F']);
});
test('moveItem refuses a folder into itself or its own subtree', () => {
  assert.equal(L.moveItem(tree(), [1], [1], 0), null);
  assert.equal(L.moveItem(tree(), [1], [1, 1], 0), null);
});
test('moveItem adjusts the target parent path when the removal shifts it', () => {
  const r = L.moveItem(tree(), [0], [1, 1], 0);
  assert.deepEqual(r[0].items[1].items.map(i => i.name), ['a']);
});
test('setField sets a value and drops it when empty', () => {
  const r = L.setField(tree(), [0], 'name', 'x');
  assert.equal(r[0].name, 'x');
  assert.equal(L.setField(r, [0], 'delay', '3')[0].delay, 3);
  assert.equal('delay' in L.setField(L.setField(r, [0], 'delay', '3'), [0], 'delay', ''), false);
  assert.equal(L.setField(r, [0], 'delay', 'abc')[0].delay, 'abc');
});
test('hasChanged compares by content', () => {
  assert.equal(L.hasChanged({ a: [1] }, { a: [1] }), false);
  assert.equal(L.hasChanged({ a: [1] }, { a: [2] }), true);
});
test('countDescendants counts all nested items', () => {
  assert.equal(L.countDescendants(tree()[1]), 2);
  assert.equal(L.countDescendants(tree()[0]), 0);
});
test('typedValue turns a typed delay into a number, leaves the rest', () => {
  assert.equal(L.typedValue('delay', '5'), 5);
  assert.equal(L.typedValue('delay', 'x'), 'x');
  assert.equal(L.typedValue('name', '5'), '5');
});

test('sortedEntries puts folders first and keeps the stored index', () => {
  const items = [{ n: 1, slug: 's' }, { n: 2, items: [] }, { n: 3, slug: 's' }, { n: 4, items: [] }];
  assert.deepEqual(L.sortedEntries(items).map(e => [e.item.n, e.index]), [[2, 1], [4, 3], [1, 0], [3, 2]]);
});
test('prefixPaths lists every folder on the way to a list', () => {
  assert.deepEqual(L.prefixPaths([]), []);
  assert.deepEqual(L.prefixPaths([1]), ['1']);
  assert.deepEqual(L.prefixPaths([1, 0, 2]), ['1', '1.0', '1.0.2']);
});
test('slugFor lowercases, maps umlauts and replaces other characters', () => {
  assert.equal(L.slugFor('SPIEGEL Textkorrektur', []), 'spiegel-textkorrektur');
  assert.equal(L.slugFor('Grüße äö', []), 'gruesse-aeoe');
  assert.equal(L.slugFor('  --A!!b--  ', []), 'a-b');
});
test('slugFor falls back to "link" for an empty result', () => {
  assert.equal(L.slugFor('!!!', []), 'link');
  assert.equal(L.slugFor('', []), 'link');
});
test('slugFor stays unique across the whole tree', () => {
  const items = [{ name: 'x', slug: 'new-link', url: '' }, { name: 'F', items: [{ name: 'y', slug: 'new-link-2', url: '' }] }];
  assert.equal(L.slugFor('New link', items), 'new-link-3');
});

test('parentAfterRemoval shifts an ancestor index past the removed item', () => {
  assert.deepEqual(L.parentAfterRemoval([0], [2]), [1]);
  assert.deepEqual(L.parentAfterRemoval([1], [0]), [0]);
  assert.deepEqual(L.parentAfterRemoval([0, 1], [0, 2]), [0, 1]);
  assert.deepEqual(L.parentAfterRemoval([3], []), []);
});
