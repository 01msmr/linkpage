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

  var api = { resolveSettings: resolveSettings, delayFor: delayFor, findLink: findLink,
    sortItems: sortItems, numberLabel: numberLabel, toggleOpen: toggleOpen, isOpen: isOpen };
  root.LinkpagesLogic = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
