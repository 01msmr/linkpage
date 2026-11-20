const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../public/-/js/config.js');
const L = require('../public/-/js/logic.js');

test('resolveSettings({}) equals defaults', () => {
  assert.deepEqual(L.resolveSettings({}), C.DEFAULTS);
});
test('unknown design falls back to default', () => {
  assert.equal(L.resolveSettings({ design: 'nope' }).design, C.DEFAULTS.design);
  assert.equal(C.DEFAULTS.design, 'vertical-heading');
  assert.equal(C.DESIGNS[0], 'vertical-heading');
});
test('unknown font falls back to the default (system) font', () => {
  assert.equal(L.resolveSettings({ font: 'nope' }).font, C.DEFAULTS.font);
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
  assert.deepEqual(o, ['0.1']);
  assert.deepEqual(L.toggleOpen(o, '1'), ['0.1', '1']);
  assert.equal(L.isOpen(o, '1'), false);
});
test('toggleOpen close keeps inner folders open and siblings like 10', () => {
  assert.deepEqual(L.toggleOpen(['1', '1.0', '10'], '1'), ['1.0', '10']);
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
  assert.equal('name' in L.setField(r, [0], 'name', ''), false);
});
test('hasChanged compares by content', () => {
  assert.equal(L.hasChanged({ a: [1] }, { a: [1] }), false);
  assert.equal(L.hasChanged({ a: [1] }, { a: [2] }), true);
});
test('countDescendants counts all nested items', () => {
  assert.equal(L.countDescendants(tree()[1]), 2);
  assert.equal(L.countDescendants(tree()[0]), 0);
});

test('prefixPaths lists every folder on the way to a list', () => {
  assert.deepEqual(L.prefixPaths([]), []);
  assert.deepEqual(L.prefixPaths([1]), ['1']);
  assert.deepEqual(L.prefixPaths([1, 0, 2]), ['1', '1.0', '1.0.2']);
});
test('slugFor lowercases, maps umlauts and replaces other characters', () => {
  assert.equal(L.slugFor('SPIEGEL Textkorrektur', []), '-spiegel-textkorrektur');
  assert.equal(L.slugFor('Grüße äö', []), '-gruesse-aeoe');
  assert.equal(L.slugFor('  --A!!b--  ', []), '-a-b');
});
test('slugFor falls back to "link" for an empty result', () => {
  assert.equal(L.slugFor('!!!', []), '-link');
  assert.equal(L.slugFor('', []), '-link');
});
test('slugFor needs a number only among the siblings of the same folder', () => {
  const siblings = [{ name: 'x', slug: '-docs', url: '' }, { name: 'y', slug: '-docs-2', url: '' }, { name: 'F', items: [] }];
  assert.equal(L.slugFor('Docs', siblings), '-docs-3');
  assert.equal(L.slugFor('Docs', [{ name: 'F', items: [] }]), '-docs');
});
test('a link slug never equals a folder slug: it starts with a dash', () => {
  assert.equal(L.slugFor('Mail', [{ name: 'Mail', items: [] }]), '-mail');
});
test('paths match a link slug exactly: an address without the dash no longer finds a link with one', () => {
  const t = [{ name: 'Tools', items: [{ name: 'Deep', slug: '-deep', url: 'w' }] }];
  assert.equal(L.resolveOpen(t, ['tools', '-deep']).target.name, 'Deep');
  assert.equal(L.resolveOpen(t, ['-deep']).target.name, 'Deep');
  assert.equal(L.resolveOpen(t, ['tools', 'deep']), null);
  assert.equal(L.resolveOpen(t, ['deep']), null);
});
test('normalizeSlugs puts a dash before every link slug that lacks one, in all folders, without mutating', () => {
  const t = [{ name: 'a', slug: 'a', url: 'u' }, { name: 'F', items: [{ name: 'b', slug: '-b', url: 'v' }, { name: 'c', url: 'w' }, { name: 'G', items: [{ name: 'd', slug: 'd', url: 'x' }] }] }];
  const n = L.normalizeSlugs(t);
  assert.equal(n[0].slug, '-a');
  assert.equal(n[1].items[0].slug, '-b');
  assert.equal(n[1].items[1].slug, undefined);
  assert.equal(n[1].items[2].items[0].slug, '-d');
  assert.equal(t[0].slug, 'a');
});

test('parentAfterRemoval shifts an ancestor index past the removed item', () => {
  assert.deepEqual(L.parentAfterRemoval([0], [2]), [1]);
  assert.deepEqual(L.parentAfterRemoval([1], [0]), [0]);
  assert.deepEqual(L.parentAfterRemoval([0, 1], [0, 2]), [0, 1]);
  assert.deepEqual(L.parentAfterRemoval([3], []), []);
});
test('layout defaults to list; split is kept; unknown falls back', () => {
  assert.equal(L.resolveSettings({}).layout, 'list');
  assert.equal(L.resolveSettings({ layout: 'split' }).layout, 'split');
  assert.equal(L.resolveSettings({ layout: 'nope' }).layout, 'list');
});
test('height and intensity are not site settings: saved values are ignored', () => {
  assert.equal(L.resolveSettings({ height: 34, intensity: 40 }).height, C.DEFAULTS.height);
  assert.equal(L.resolveSettings({ height: 34, intensity: 40 }).intensity, C.DEFAULTS.intensity);
});
test('localValue keeps a stored view value only if it is a listed one, typed like the list', () => {
  assert.equal(L.localValue('height', '34'), 34);
  assert.equal(L.localValue('height', '35'), undefined);
  assert.equal(L.localValue('intensity', '40'), 40);
  assert.equal(L.localValue('intensity', '45'), undefined);
  assert.equal(L.localValue('mode', 'dark'), 'dark');
  assert.equal(L.localValue('mode', 'nope'), undefined);
  assert.equal(L.localValue('design', 'x'), undefined);
  assert.equal(L.localValue('height', null), undefined);
});
test('HEIGHTS run from 30 to 70 in steps of 4 and include the default', () => {
  assert.equal(C.HEIGHTS[0], 30);
  assert.equal(C.HEIGHTS[C.HEIGHTS.length - 1], 70);
  assert.ok(C.HEIGHTS.includes(C.DEFAULTS.height));
  assert.ok(C.HEIGHTS.every((h, i) => i === 0 || h - C.HEIGHTS[i - 1] === 4));
});
test('pillFont scales the pill height with the viewport around the reference width', () => {
  assert.equal(L.pillFont(48), 'calc((clamp(calc(48px * var(--pill-min)), 3.75vw, 72px) - 2 * var(--pad-y)) / var(--leading))');
  assert.equal(L.pillFont(46), 'calc((clamp(calc(46px * var(--pill-min)), 3.594vw, 69px) - 2 * var(--pad-y)) / var(--leading))');
});
test('reindexOpen drops the removed folder and shifts later siblings down', () => {
  assert.deepEqual(L.reindexOpen(['0', '1', '1.0', '2', '2.1'], [], 1, -1), ['0', '1', '1.1']);
});
test('reindexOpen shifts only inside the changed list', () => {
  assert.deepEqual(L.reindexOpen(['0', '0.2', '1'], [0], 1, -1), ['0', '0.1', '1']);
});
test('reindexOpen shifts siblings at or after an insertion up', () => {
  assert.deepEqual(L.reindexOpen(['0', '1', '1.0'], [], 1, 1), ['0', '2', '2.0']);
});
test('intensity defaults to 100', () => {
  assert.equal(L.resolveSettings({}).intensity, 100);
});
test('slugify makes a folder slug from a name', () => {
  assert.equal(L.slugify('tbx.li'), 'tbx-li');
  assert.equal(L.slugify('Über uns!'), 'ueber-uns');
});
const openTree = () => [
  { name: 'a', slug: 'a', url: 'u' },
  { name: 'Tools', items: [{ name: 'x', slug: 'x', url: 'v' }, { name: 'Sub X', items: [{ name: 'deep', slug: 'deep', url: 'w' }] }] }
];
test('resolveOpen follows folder slugs to a link and returns the folders to open', () => {
  const r = L.resolveOpen(openTree(), ['tools', 'sub-x', 'deep']);
  assert.deepEqual(r.open, ['1', '1.1']);
  assert.equal(r.target.slug, 'deep');
  assert.equal(r.path, '1.1.0');
});
test('resolveOpen on a folder opens it and targets the folder', () => {
  const r = L.resolveOpen(openTree(), ['tools']);
  assert.deepEqual(r.open, ['1']);
  assert.equal(r.target.name, 'Tools');
});
test('resolveOpen finds a bare link slug anywhere and opens its folders', () => {
  const r = L.resolveOpen(openTree(), ['deep']);
  assert.deepEqual(r.open, ['1', '1.1']);
  assert.equal(r.target.slug, 'deep');
});
test('resolveOpen returns null for an unknown path', () => {
  assert.equal(L.resolveOpen(openTree(), ['nope']), null);
  assert.equal(L.resolveOpen(openTree(), ['tools', 'nope']), null);
  assert.equal(L.resolveOpen(openTree(), []), null);
});
test('openAfterMove keeps a moved folder and its inner folders open at the new place', () => {
  assert.deepEqual(L.openAfterMove(['1', '1.0'], [1], [], 3), ['2', '2.0']);
});
test('openAfterMove shifts other open folders after a link leaves a folder', () => {
  assert.deepEqual(L.openAfterMove(['1'], [1, 0], [], 0), ['2']);
});
test('openAfterMove opens the folder a moved open folder lands in', () => {
  assert.deepEqual(L.openAfterMove(['1'], [1], [0], 0).sort(), ['0', '0.0']);
});
test('formOf says pill for the pill design and text for every other design', () => {
  assert.equal(L.formOf('vertical-heading'), 'pill');
  assert.ok(C.DESIGNS.filter(d => d !== 'vertical-heading').every(d => L.formOf(d) === 'text'));
});

// rows in visual order: A (open folder) > [b, C (closed folder)], d
const navRows = [
  { depth: 0, folder: true, open: true },
  { depth: 1, folder: false, open: false },
  { depth: 1, folder: true, open: false },
  { depth: 0, folder: false, open: false }
];
test('navMove up/down walks the rows and wraps around at the ends', () => {
  assert.deepEqual(L.navMove(navRows, 1, 'ArrowDown'), { act: 'focus', index: 2 });
  assert.deepEqual(L.navMove(navRows, 1, 'ArrowUp'), { act: 'focus', index: 0 });
  assert.deepEqual(L.navMove(navRows, 0, 'ArrowUp'), { act: 'focus', index: 3 });
  assert.deepEqual(L.navMove(navRows, 3, 'ArrowDown'), { act: 'focus', index: 0 });
});
test('navMove right opens a closed folder, jumps from an open one to its first subfolder, ignores links', () => {
  assert.deepEqual(L.navMove(navRows, 2, 'ArrowRight'), { act: 'toggle', index: 2 });
  assert.deepEqual(L.navMove(navRows, 0, 'ArrowRight'), { act: 'focus', index: 2 });
  assert.equal(L.navMove(navRows, 1, 'ArrowRight'), null);
  assert.equal(L.navMove([{ depth: 0, folder: true, open: true }], 0, 'ArrowRight'), null);
});
test('navMove right on an open folder without subfolders, or whose subfolder lies behind it, does nothing', () => {
  const links = [{ depth: 0, folder: true, open: true }, { depth: 1, folder: false, open: false }, { depth: 0, folder: true, open: false }];
  assert.equal(L.navMove(links, 0, 'ArrowRight'), null);
});
test('navMove left closes an open folder, otherwise goes to the parent folder', () => {
  assert.deepEqual(L.navMove(navRows, 0, 'ArrowLeft'), { act: 'toggle', index: 0 });
  assert.deepEqual(L.navMove(navRows, 1, 'ArrowLeft'), { act: 'focus', index: 0 });
  assert.deepEqual(L.navMove(navRows, 2, 'ArrowLeft'), { act: 'focus', index: 0 });
  assert.equal(L.navMove(navRows, 3, 'ArrowLeft'), null);
});
test('navMove with nothing focused starts at the first (down) or last (up) row', () => {
  assert.deepEqual(L.navMove(navRows, -1, 'ArrowDown'), { act: 'focus', index: 0 });
  assert.deepEqual(L.navMove(navRows, -1, 'ArrowUp'), { act: 'focus', index: 3 });
  assert.equal(L.navMove(navRows, -1, 'ArrowLeft'), null);
});

const urlTree = [
  { name: 'Top', slug: 'top', url: 'u' },
  { name: 'Tools', items: [{ name: 'x', slug: 'x', url: 'v' }, { name: 'Sub X', items: [{ name: 'deep', slug: 'deep', url: 'w' }, { name: 'bare', url: 'z' }] }] }
];
test('urlFor names the focused link by its folder chain and slug', () => {
  assert.equal(L.urlFor(urlTree, '0', []), '/top/');
  assert.equal(L.urlFor(urlTree, '1.1.0', ['1', '1.1']), '/tools/sub-x/deep/');
});
test('urlFor names an open folder, and the parent for a closed one', () => {
  assert.equal(L.urlFor(urlTree, '1', ['1']), '/tools/');
  assert.equal(L.urlFor(urlTree, '1', []), '/');
  assert.equal(L.urlFor(urlTree, '1.1', ['1']), '/tools/');
});
test('urlFor falls back to the folder chain for a link without slug', () => {
  assert.equal(L.urlFor(urlTree, '1.1.1', ['1', '1.1']), '/tools/sub-x/');
});

// keyboard moves: items A (link), F (folder: x, y), B (link)
const moveTree = () => [
  { name: 'A', url: 'a', slug: 'a' },
  { name: 'F', items: [{ name: 'x', url: 'x', slug: 'x' }, { name: 'y', url: 'y', slug: 'y' }] },
  { name: 'B', url: 'b', slug: 'b' }
];
test('keyMove up/down move an entry among its siblings, null at the ends', () => {
  assert.deepEqual(L.keyMove(moveTree(), [2], 'ArrowUp'), { from: [2], toParent: [], toIndex: 1 });
  assert.deepEqual(L.keyMove(moveTree(), [0], 'ArrowDown'), { from: [0], toParent: [], toIndex: 2 });
  assert.equal(L.keyMove(moveTree(), [0], 'ArrowUp'), null);
  assert.equal(L.keyMove(moveTree(), [2], 'ArrowDown'), null);
});
test('keyMove right enters the folder above as its last entry, left leaves to after the parent', () => {
  assert.deepEqual(L.keyMove(moveTree(), [2], 'ArrowRight'), { from: [2], toParent: [1], toIndex: 2 });
  assert.equal(L.keyMove(moveTree(), [0], 'ArrowRight'), null);
  assert.equal(L.keyMove(moveTree(), [1, 1], 'ArrowRight'), null);
  assert.deepEqual(L.keyMove(moveTree(), [1, 0], 'ArrowLeft'), { from: [1, 0], toParent: [], toIndex: 2 });
  assert.equal(L.keyMove(moveTree(), [0], 'ArrowLeft'), null);
});
test('movedPath gives the new path of a moved entry', () => {
  assert.deepEqual(L.movedPath([2], [1], 2), [1, 2]);
  assert.deepEqual(L.movedPath([0], [], 2), [1]);
  assert.deepEqual(L.movedPath([1, 0], [], 2), [2]);
  assert.deepEqual(L.movedPath([2], [], 1), [1]);
});
test('resyncSlugs rederives link slugs from names, numbers siblings, recurses and does not mutate', () => {
  const t = [{ name: 'Web', slug: '-old', url: '' }, { name: 'Web', slug: '-x', url: '' }, { name: 'F', items: [{ name: 'Neu', slug: '-alt', url: '' }] }];
  const r = L.resyncSlugs(t);
  assert.deepEqual([r[0].slug, r[1].slug, r[2].items[0].slug], ['-web', '-web-2', '-neu']);
  assert.equal(t[0].slug, '-old');
});
