// Fills <main id="list"> and sets the data-* attributes that select design, mode, caps, numbers, font.
(function (root) {
  var L = root.LinkpagesLogic;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function entry(item, index) {
    var isLink = !Array.isArray(item.items);
    var node = isLink ? el('a', 'item') : el('div', 'item folder');
    if (isLink) node.href = '/' + item.slug + '/';
    node.appendChild(el('span', 'num', L.numberLabel(index)));
    node.appendChild(el('span', 'name', item.name));
    return node;
  }

  function render(site) {
    var s = L.resolveSettings(site);
    var html = document.documentElement;
    html.dataset.design = s.design;
    html.dataset.mode = s.mode;
    html.dataset.caps = s.caps;
    html.dataset.numbers = String(s.numbers === true);
    html.dataset.font = s.font;
    var list = document.getElementById('list');
    list.textContent = '';
    L.sortItems(s.items).forEach(function (item, i) { list.appendChild(entry(item, i)); });
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
