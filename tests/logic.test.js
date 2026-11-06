const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../js/config.js');
const L = require('../js/logic.js');

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
