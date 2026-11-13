// Fills <main id="list"> and sets the data-* attributes that select design, mode, caps, numbers, font.
(function (root) {
  var L = root.LinkpagesLogic;
  var C = root.LinkpagesConfig;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  var settings = null;
  var raw = null;
  var open = [];
  var editor = null;
  var readyFns = [];
  var activeUrl = null;

  function chevron(ch) { return el('span', 'chev', ch); }

  function toggle(path) {
    open = L.toggleOpen(open, path);
    draw();
    var f = document.querySelector('.folder-head[data-path="' + path + '"]');
    if (f) f.focus();
  }

  // Split needs room; a page inside a frame gets a lower threshold so frames can nest.
  function splitOn() {
    var q = root.self !== root.top ? C.SPLIT.queryEmbedded : C.SPLIT.query;
    return settings.layout === 'split' && root.matchMedia(q).matches;
  }

  function syncSplit() {
    var on = splitOn();
    var changed = on !== document.documentElement.hasAttribute('data-split');
    document.documentElement.toggleAttribute('data-split', on);
    return changed;
  }

  // Plain http (blocked inside https pages) and listed hosts (refuse framing) open in a new tab.
  function embeddable(url) {
    try {
      var u = new URL(url);
      return u.protocol === 'https:' && !C.SPLIT.newTabHosts.some(function (h) { return u.hostname === h || u.hostname.slice(-h.length - 1) === '.' + h; });
    } catch (e) {
      return false;
    }
  }

  function openInPane(url) {
    activeUrl = url;
    var frame = document.getElementById('pane-frame');
    var open = document.getElementById('pane-open');
    frame.title = C.SPLIT.frameTitle;
    frame.src = url;
    frame.hidden = false;
    open.href = url;
    open.textContent = C.SPLIT.open;
    open.hidden = false;
    draw();
  }

  function linkCore(item, index) {
    var a = el('a', 'item');
    if (item.slug) a.href = '/' + item.slug + '/';
    var split = splitOn();
    if (item.url && split && embeddable(item.url)) {
      a.href = item.url;
      if (item.url === activeUrl) a.setAttribute('aria-current', 'true');
      a.addEventListener('click', function (e) { e.preventDefault(); openInPane(item.url); });
    } else if (item.url && (split || L.delayFor(item, settings) <= 0)) {
      a.href = item.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
    a.appendChild(el('span', 'num', L.numberLabel(index)));
    a.appendChild(el('span', 'name', item.name));
    return a;
  }

  function headCore(item, index, path, isOpen) {
    var head = el('button', 'item folder-head');
    head.type = 'button';
    head.dataset.path = path;
    head.setAttribute('aria-expanded', String(isOpen));
    head.appendChild(el('span', 'num', L.numberLabel(index)));
    head.appendChild(el('span', 'name', item.name));
    head.appendChild(chevron(C.FOLDER.chevron));
    head.addEventListener('click', function () { toggle(path); });
    return head;
  }

  function closerCore(item, path) {
    var closer = el('button', 'item folder-closer');
    closer.type = 'button';
    closer.dataset.path = path;
    closer.setAttribute('aria-label', C.FOLDER.closeLabel.replace('{name}', item.name));
    closer.appendChild(chevron(C.FOLDER.chevron));
    closer.addEventListener('click', function () { toggle(path); });
    return closer;
  }

  function entry(item, index, path) {
    var box = editor && editor.editBox(item, path);
    if (!Array.isArray(item.items)) {
      var core = box || linkCore(item, index);
      return editor ? editor.wrap(core, item, path) : core;
    }
    var isOpen = L.isOpen(open, path);
    var wrap = el('div', 'folder');
    wrap.dataset.state = isOpen ? 'open' : 'closed';
    var head = box || headCore(item, index, path, isOpen);
    wrap.appendChild(editor ? editor.wrap(head, item, path) : head);
    if (isOpen) {
      wrap.appendChild(sub(item.items, path));
      var closer = closerCore(item, path);
      wrap.appendChild(editor ? editor.spacer(closer) : closer);
    }
    return wrap;
  }

  function fill(box, items, path) {
    var prefix = path === '' ? '' : path + '.';
    L.sortedEntries(items).forEach(function (e, i) { box.appendChild(entry(e.item, i, prefix + e.index)); });
    if (editor && items.length === 0) box.appendChild(editor.listEnd(path));
  }

  function sub(items, path) {
    var box = el('div', 'items folder-body');
    fill(box, items, path);
    return box;
  }

  // Split pane: scale every item by the same factor so the widest one fits without wrapping.
  function fit() {
    var html = document.documentElement;
    html.style.setProperty('--fit', '1');
    if (!splitOn()) return;
    var f = 1;
    html.classList.add('measure');
    Array.prototype.forEach.call(document.querySelectorAll('#list .item'), function (it) {
      var cs = getComputedStyle(it);
      var pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      var need = it.scrollWidth - pad;
      var room = it.clientWidth - pad;
      if (need > room && room > 0) f = Math.min(f, room / need * C.SPLIT.fitSlack);
    });
    html.classList.remove('measure');
    html.style.setProperty('--fit', String(f));
  }

  function draw() {
    var main = document.getElementById('list');
    main.textContent = '';
    fill(main, settings.items, '');
    fit();
  }

  // Shows a site and keeps the open folders (edit mode redraws through this).
  function show(site) {
    raw = site;
    settings = L.resolveSettings(site);
    var html = document.documentElement;
    html.dataset.design = settings.design;
    html.dataset.mode = settings.mode;
    html.dataset.caps = settings.caps;
    html.dataset.numbers = String(settings.numbers === true);
    html.dataset.font = settings.font;
    html.dataset.layout = settings.layout;
    syncSplit();
    html.style.setProperty('--pill-font', L.pillFont(settings.height));
    draw();
  }

  function render(site) {
    open = [];
    show(site);
    readyFns.splice(0).forEach(function (fn) { fn(site); });
  }

  function showError(text) {
    var list = document.getElementById('list');
    list.textContent = '';
    list.appendChild(el('p', 'error', text));
  }

  root.LinkpagesRender = {
    render: render,
    show: show,
    fit: fit,
    showError: showError,
    getSite: function () { return raw; },
    whenReady: function (fn) { if (raw) fn(raw); else readyFns.push(fn); },
    getOpen: function () { return open; },
    setOpen: function (paths) { open = paths; },
    setEditor: function (e) { editor = e; }
  };

  root.addEventListener('resize', function () {
    if (!settings) return;
    if (syncSplit()) draw(); else fit();
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (settings) fit(); });

  fetch('/site.php', { cache: 'no-store' })
    .then(function (r) {
      return r.json().then(function (body) {
        if (!r.ok) throw new Error(body && body.error ? body.error : 'HTTP ' + r.status);
        return body;
      });
    })
    .then(render)
    .catch(function (e) { showError('Error: ' + e.message); });
})(window);
