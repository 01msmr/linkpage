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

  function chevron(ch) { return el('span', 'chev', ch); }

  function toggle(path) {
    open = L.toggleOpen(open, path);
    draw();
    var f = document.querySelector('.folder-head[data-path="' + path + '"]');
    if (f) f.focus();
  }

  function linkCore(item, index) {
    var a = el('a', 'item');
    if (item.slug) a.href = '/' + item.slug + '/';
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
    if (editor) box.appendChild(editor.listEnd(path));
  }

  function sub(items, path) {
    var box = el('div', 'items folder-body');
    fill(box, items, path);
    return box;
  }

  function draw() {
    var main = document.getElementById('list');
    main.textContent = '';
    fill(main, settings.items, '');
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
    draw();
  }

  function render(site) {
    open = [];
    show(site);
  }

  function showError(text) {
    var list = document.getElementById('list');
    list.textContent = '';
    list.appendChild(el('p', 'error', text));
  }

  root.LinkpagesRender = {
    render: render,
    show: show,
    showError: showError,
    getSite: function () { return raw; },
    setOpen: function (paths) { open = paths; },
    setEditor: function (e) { editor = e; }
  };

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
