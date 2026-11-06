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
  var open = [];

  function chevron(ch) { return el('span', 'chev', ch); }

  function toggle(path, focusSel) {
    open = L.toggleOpen(open, path);
    draw();
    var f = document.querySelector(focusSel(path));
    if (f) f.focus();
  }

  function headSel(path) { return '.folder-head[data-path="' + path + '"]'; }

  function entry(item, index, path) {
    if (!Array.isArray(item.items)) {
      var a = el('a', 'item');
      a.href = '/' + item.slug + '/';
      a.appendChild(el('span', 'num', L.numberLabel(index)));
      a.appendChild(el('span', 'name', item.name));
      return a;
    }
    var F = C.FOLDER;
    var isOpen = L.isOpen(open, path);
    var wrap = el('div', 'folder');
    wrap.dataset.state = isOpen ? 'open' : 'closed';
    var head = el('button', 'item folder-head');
    head.type = 'button';
    head.dataset.path = path;
    head.setAttribute('aria-expanded', String(isOpen));
    head.appendChild(el('span', 'num', L.numberLabel(index)));
    head.appendChild(el('span', 'name', item.name));
    head.appendChild(chevron(isOpen ? F.open : F.closed));
    head.addEventListener('click', function () { toggle(path, headSel); });
    wrap.appendChild(head);
    if (isOpen) {
      wrap.appendChild(sub(item.items, path));
      var closer = el('button', 'item folder-closer');
      closer.type = 'button';
      closer.dataset.path = path;
      closer.setAttribute('aria-label', F.closeLabel.replace('{name}', item.name));
      closer.appendChild(chevron(F.closer));
      closer.addEventListener('click', function () { toggle(path, headSel); });
      wrap.appendChild(closer);
    }
    return wrap;
  }

  function sub(items, path) {
    var box = el('div', 'items folder-body');
    L.sortItems(items).forEach(function (item, i) { box.appendChild(entry(item, i, path + '.' + i)); });
    return box;
  }

  function draw() {
    var main = document.getElementById('list');
    main.textContent = '';
    L.sortItems(settings.items).forEach(function (item, i) { main.appendChild(entry(item, i, String(i))); });
  }

  function render(site) {
    settings = L.resolveSettings(site);
    var html = document.documentElement;
    html.dataset.design = settings.design;
    html.dataset.mode = settings.mode;
    html.dataset.caps = settings.caps;
    html.dataset.numbers = String(settings.numbers === true);
    html.dataset.font = settings.font;
    open = [];
    draw();
  }

  function showError(text) {
    var list = document.getElementById('list');
    list.textContent = '';
    list.appendChild(el('p', 'error', text));
  }

  root.LinkpagesRender = { render: render, showError: showError };

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
