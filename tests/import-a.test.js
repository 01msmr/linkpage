// tools/import-a.js: a.msmr.co sections become top folders with link items.
const test = require('node:test');
const assert = require('node:assert/strict');
const { convert, buildSite } = require('../tools/import-a.js');

const sections = [
  { id: 'srv', title: 'srv', icon: 'x', color: '#f00', links: [{ name: 'Docs', url: 'https://a.example/docs' }, { name: 'Mail', url: 'https://a.example/mail' }] },
  { id: 'tec', title: 'tec stuff', links: [{ name: 'Docs', url: 'https://b.example/docs' }] }
];

test('each section becomes a folder named by its title, each link a link with a slug', () => {
  const items = convert(sections);
  assert.equal(items.length, 2);
  assert.equal(items[0].name, 'srv');
  assert.deepEqual(items[0].items[0], { name: 'Docs', url: 'https://a.example/docs', slug: 'docs' });
  assert.equal(items[1].name, 'tec stuff');
});
test('slugs are unique over all links and never equal a folder slug', () => {
  const items = convert(sections);
  assert.equal(items[1].items[0].slug, 'docs-2');
  const clash = convert([{ title: 'Mail', links: [{ name: 'mail', url: 'u' }] }]);
  assert.equal(clash[0].items[0].slug, 'mail-2');
});
test('links without a name or url are skipped, empty sections too, a missing title falls back to the id', () => {
  const items = convert([{ id: 'x', links: [{ name: 'ok', url: 'u' }, { name: '', url: 'u' }, { name: 'n', url: '' }] }, { id: 'y', title: 'empty', links: [] }]);
  assert.equal(items.length, 1);
  assert.equal(items[0].name, 'x');
  assert.deepEqual(items[0].items.map(i => i.name), ['ok']);
});
test('buildSite keeps the base settings and swaps the items', () => {
  const site = buildSite({ design: 'vertical-heading', mode: 'light', items: [{ name: 'dummy' }] }, sections);
  assert.equal(site.design, 'vertical-heading');
  assert.equal(site.items.length, 2);
});
