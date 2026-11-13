// Redirect page: looks the slug up in site.php and replaces the location at once.
(function (root) {
  var L = root.LinkpagesLogic;
  var R = root.LinkpagesConfig.REDIRECT;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function slugFromPath(path) {
    return path.replace(/^\/+/, '').split('/')[0];
  }

  function applyLook(s) {
    var html = document.documentElement;
    html.dataset.design = s.design;
    html.dataset.mode = s.mode;
    html.dataset.caps = s.caps;
    html.dataset.numbers = String(s.numbers === true);
    html.dataset.font = s.font;
    html.style.setProperty('--pill-font', L.pillFont(s.height));
  }

  function show(node) {
    var list = document.getElementById('list');
    list.textContent = '';
    list.appendChild(node);
    document.body.hidden = false;
  }

  function showError(text) { show(el('p', 'error', text)); }

  function run(site) {
    var s = L.resolveSettings(site);
    applyLook(s);
    var slug = slugFromPath(location.pathname);
    var link = L.findLink(s.items, slug);
    if (!link) return showError(R.unknown.replace('{slug}', slug));
    location.replace(link.url);
  }

  document.getElementById('back').textContent = R.back;

  fetch('/site.php', { cache: 'no-store' })
    .then(function (r) {
      return r.json().then(function (body) {
        if (!r.ok) throw new Error(body && body.error ? body.error : 'HTTP ' + r.status);
        return body;
      });
    })
    .then(run)
    .catch(function (e) { showError('Error: ' + e.message); });
})(window);
