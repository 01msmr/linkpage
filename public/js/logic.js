// Pure logic: settings, search, ordering, open state.
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
      intensity: C.INTENSITIES.indexOf(raw.intensity) >= 0 ? raw.intensity : d.intensity,
      height: C.HEIGHTS.indexOf(raw.height) >= 0 ? raw.height : d.height,
      layout: C.LAYOUTS.indexOf(raw.layout) >= 0 ? raw.layout : d.layout,
      items: Array.isArray(raw.items) ? raw.items : d.items
    };
  }

  // The font size that gives a pill of `height` px.
  function pillFont(height) {
    return 'calc((' + height + 'px - 2 * var(--pad-y)) / var(--leading))';
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

  // Entries in display order: folders first on request, else as stored (inside folders entries sit where they were put).
  function entriesFor(items, foldersFirst) {
    return foldersFirst ? sortedEntries(items) : items.map(function (item, index) { return { item: item, index: index }; });
  }

  // ['1', '1.0'] for path [1, 0]: the folders that must be open to show it.
  function prefixPaths(path) {
    return path.map(function (_, i) { return path.slice(0, i + 1).join('.'); });
  }

  // Open-folder paths after an item was removed (delta -1) or inserted (delta +1) at parent[index].
  function reindexOpen(open, parent, index, delta) {
    var depth = parent.length;
    var out = [];
    open.forEach(function (p) {
      var parts = p.split('.').map(Number);
      var inList = parts.length > depth && parent.every(function (v, i) { return parts[i] === v; });
      if (inList) {
        var at = parts[depth];
        if (delta < 0 && at === index) return;
        if (delta < 0 ? at > index : at >= index) parts[depth] = at + delta;
      }
      out.push(parts.join('.'));
    });
    return out;
  }

  // Open-folder paths after moveItem(from -> toParent/toIndex): the moved subtree keeps its state, others follow their indices.
  function openAfterMove(open, from, toParent, toIndex) {
    var key = from.join('.');
    var suffixes = [];
    var rest = [];
    open.forEach(function (p) {
      if (p === key) suffixes.push('');
      else if (p.indexOf(key + '.') === 0) suffixes.push(p.slice(key.length));
      else rest.push(p);
    });
    var up = from.slice(0, -1);
    var last = from[from.length - 1];
    rest = reindexOpen(rest, up, last, -1);
    var parent = parentAfterRemoval(from, toParent);
    var index = toIndex;
    if (parent.length === up.length && startsWith(parent, up) && last < toIndex) index--;
    rest = reindexOpen(rest, parent, index, 1);
    var base = parent.concat([index]).join('.');
    suffixes.forEach(function (s) { rest.push(base + s); });
    prefixPaths(parent).forEach(function (p) { if (rest.indexOf(p) < 0) rest.push(p); });
    return rest;
  }

  function allSlugs(items, out) {
    items.forEach(function (it) {
      if (isFolder(it)) allSlugs(it.items, out);
      else if (it.slug) out.push(it.slug);
    });
    return out;
  }

  function slugify(name) {
    return String(name).toLowerCase()
      .replace(/\u00e4/g, 'ae').replace(/\u00f6/g, 'oe').replace(/\u00fc/g, 'ue').replace(/\u00df/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function slugFor(name, items) {
    var base = slugify(name) || 'link';
    var taken = allSlugs(items, []);
    var slug = base;
    for (var n = 2; taken.indexOf(slug) >= 0; n++) slug = base + '-' + n;
    return slug;
  }

  // The link with this slug anywhere in the tree: { open: [folder paths], target, path }.
  function locate(items, slug, prefix, open) {
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var path = prefix.concat(i);
      if (isFolder(it)) {
        var hit = locate(it.items, slug, path, open.concat(path.join('.')));
        if (hit) return hit;
      } else if (it.slug === slug) return { open: open, target: it, path: path.join('.') };
    }
    return null;
  }

  // ?open on /folder/folder/link/: the folders to open and the entry to mark (null if the path matches nothing).
  function resolveOpen(items, segs) {
    if (!segs.length) return null;
    var list = items;
    var prefix = [];
    var open = [];
    var found = null;
    for (var s = 0; s < segs.length; s++) {
      var last = s === segs.length - 1;
      var next = null;
      for (var i = 0; i < list.length && !next; i++) {
        var it = list[i];
        if (isFolder(it) && slugify(it.name) === segs[s]) next = { item: it, index: i, folder: true };
        else if (last && !isFolder(it) && it.slug === segs[s]) next = { item: it, index: i, folder: false };
      }
      if (!next) return s === 0 && segs.length === 1 ? locate(items, segs[0], [], []) : null;
      var path = prefix.concat(next.index);
      found = { item: next.item, path: path.join('.') };
      if (!next.folder) return { open: open, target: next.item, path: found.path };
      open.push(found.path);
      prefix = path;
      list = next.item.items;
    }
    return { open: open, target: found.item, path: found.path };
  }

  function numberLabel(index) {
    var n = index + 1;
    return n < 10 ? '0' + n : String(n);
  }

  function isOpen(open, path) { return open.indexOf(path) >= 0; }

  function toggleOpen(open, path) {
    if (!isOpen(open, path)) return open.concat([path]);
    return open.filter(function (p) { return p !== path; });
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


  function setField(items, path, key, value) {
    var copy = clone(items);
    var item = itemAt(copy, path);
    if (value === '') delete item[key];
    else item[key] = value;
    return copy;
  }

  function hasChanged(a, b) { return JSON.stringify(a) !== JSON.stringify(b); }

  function countDescendants(item) {
    if (!isFolder(item)) return 0;
    return item.items.reduce(function (n, i) { return n + 1 + countDescendants(i); }, 0);
  }

  var api = { resolveSettings: resolveSettings, pillFont: pillFont, slugify: slugify, resolveOpen: resolveOpen, findLink: findLink,
    sortItems: sortItems, sortedEntries: sortedEntries, entriesFor: entriesFor, prefixPaths: prefixPaths, reindexOpen: reindexOpen, openAfterMove: openAfterMove, slugFor: slugFor, numberLabel: numberLabel, toggleOpen: toggleOpen, isOpen: isOpen,
    clone: clone, itemAt: itemAt, removeAt: removeAt, insertAt: insertAt, moveItem: moveItem, parentAfterRemoval: parentAfterRemoval,
    setField: setField, hasChanged: hasChanged, countDescendants: countDescendants };
  root.LinkpagesLogic = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
