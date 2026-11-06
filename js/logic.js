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

  // toIndex counts in the target list before the removal.
  function moveItem(items, from, toParent, toIndex) {
    if (startsWith(toParent, from)) return null;
    var up = from.slice(0, -1);
    var last = from[from.length - 1];
    var parent = toParent.slice();
    if (startsWith(parent, up) && parent.length > up.length && parent[up.length] > last) parent[up.length]--;
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
    sortItems: sortItems, numberLabel: numberLabel, toggleOpen: toggleOpen, isOpen: isOpen,
    clone: clone, itemAt: itemAt, removeAt: removeAt, insertAt: insertAt, moveItem: moveItem,
    setField: setField, typedValue: typedValue, hasChanged: hasChanged, countDescendants: countDescendants };
  root.LinkpagesLogic = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
