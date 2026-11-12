// Pure logic: settings, delay, search, ordering, open state.
(function (root) {
  var C = (typeof module !== 'undefined' && module.exports) ? require('./config.js') : root.LinkpagesConfig;

  function pick(value, fallback) { return value === undefined || value === null ? fallback : value; }

  function resolveSettings(raw) {
    raw = raw || {};
    var d = C.DEFAULTS;
    var design = C.DESIGNS.indexOf(raw.design) >= 0 ? raw.design : d.design;
    var font = raw.font === undefined ? d.font : raw.font;
    if (font === 'system' || !Object.prototype.hasOwnProperty.call(C.FONTS, font)) font = d.font;
    return {
      design: design,
      mode: pick(raw.mode, d.mode),
      numbers: pick(raw.numbers, d.numbers),
      caps: pick(raw.caps, d.caps),
      font: font,
      delay: Number.isInteger(raw.delay) ? raw.delay : d.delay,
      items: Array.isArray(raw.items) ? raw.items : d.items
    };
  }

  function delayFor(link, settings) {
    return Number.isInteger(link.delay) ? link.delay : settings.delay;
  }

  function isFolder(item) { return Array.isArray(item.items); }

  function findLink(items, slug) {
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (isFolder(it)) {
        var hit = findLink(it.items, slug);
        if (hit) return hit;
      } else if (it.slug === slug) return it;
    }
    return null;
  }

  function sortItems(items) {
    return items.filter(isFolder).concat(items.filter(function (i) { return !isFolder(i); }));
  }

  // Folders first, stable; each entry keeps its index in the stored list.
  function sortedEntries(items) {
    var all = items.map(function (item, index) { return { item: item, index: index }; });
    return all.filter(function (e) { return isFolder(e.item); }).concat(all.filter(function (e) { return !isFolder(e.item); }));
  }

  // ['1', '1.0'] for path [1, 0]: the folders that must be open to show it.
  function prefixPaths(path) {
    return path.map(function (_, i) { return path.slice(0, i + 1).join('.'); });
  }

  function allSlugs(items, out) {
    items.forEach(function (it) {
      if (isFolder(it)) allSlugs(it.items, out);
      else if (it.slug) out.push(it.slug);
    });
    return out;
  }

  function slugFor(name, items) {
    var base = String(name).toLowerCase()
      .replace(/\u00e4/g, 'ae').replace(/\u00f6/g, 'oe').replace(/\u00fc/g, 'ue').replace(/\u00df/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'link';
    var taken = allSlugs(items, []);
    var slug = base;
    for (var n = 2; taken.indexOf(slug) >= 0; n++) slug = base + '-' + n;
    return slug;
  }

  function numberLabel(index) {
    var n = index + 1;
    return n < 10 ? '0' + n : String(n);
  }

  function isOpen(open, path) { return open.indexOf(path) >= 0; }

  function toggleOpen(open, path) {
    if (!isOpen(open, path)) return open.concat([path]);
    return open.filter(function (p) { return p !== path && p.indexOf(path + '.') !== 0; });
  }

  function clone(v) { return JSON.parse(JSON.stringify(v)); }

  function listAt(items, parent) {
    return parent.reduce(function (list, i) { return list[i].items; }, items);
  }

  function itemAt(items, path) { return listAt(items, path.slice(0, -1))[path[path.length - 1]]; }

  function removeAt(items, path) {
    var copy = clone(items);
    var removed = listAt(copy, path.slice(0, -1)).splice(path[path.length - 1], 1)[0];
    return { items: copy, removed: removed };
  }

  function insertAt(items, parent, index, item) {
    var copy = clone(items);
    listAt(copy, parent).splice(index, 0, item);
    return copy;
  }

  function startsWith(path, prefix) {
    return prefix.length <= path.length && prefix.every(function (v, i) { return path[i] === v; });
  }

  // The target parent's path once the item at `from` has been taken out.
  function parentAfterRemoval(from, toParent) {
    var up = from.slice(0, -1);
    var last = from[from.length - 1];
    var parent = toParent.slice();
    if (startsWith(parent, up) && parent.length > up.length && parent[up.length] > last) parent[up.length]--;
    return parent;
  }

  // toIndex counts in the target list before the removal.
  function moveItem(items, from, toParent, toIndex) {
    if (startsWith(toParent, from)) return null;
    var up = from.slice(0, -1);
    var last = from[from.length - 1];
    var parent = parentAfterRemoval(from, toParent);
    var index = toIndex;
    if (parent.length === up.length && startsWith(parent, up) && last < toIndex) index--;
    var r = removeAt(items, from);
    return insertAt(r.items, parent, index, r.removed);
  }

  function typedValue(key, value) { return key === 'delay' && /^-?\d+$/.test(value) ? Number(value) : value; }

  function setField(items, path, key, value) {
    var copy = clone(items);
    var item = itemAt(copy, path);
    if (value === '') delete item[key];
    else item[key] = typedValue(key, value);
    return copy;
  }

  function hasChanged(a, b) { return JSON.stringify(a) !== JSON.stringify(b); }

  function countDescendants(item) {
    if (!isFolder(item)) return 0;
    return item.items.reduce(function (n, i) { return n + 1 + countDescendants(i); }, 0);
  }

  var api = { resolveSettings: resolveSettings, delayFor: delayFor, findLink: findLink,
    sortItems: sortItems, sortedEntries: sortedEntries, prefixPaths: prefixPaths, slugFor: slugFor, numberLabel: numberLabel, toggleOpen: toggleOpen, isOpen: isOpen,
    clone: clone, itemAt: itemAt, removeAt: removeAt, insertAt: insertAt, moveItem: moveItem, parentAfterRemoval: parentAfterRemoval,
    setField: setField, typedValue: typedValue, hasChanged: hasChanged, countDescendants: countDescendants };
  root.LinkpagesLogic = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
