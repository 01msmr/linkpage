// Redirect page for ?open: a link path goes to the link at once, a folder path to its opened list.
(function (root) {
  var L = root.LinkpagesLogic;
  var R = root.LinkpagesConfig.REDIRECT;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function applyLook(s) {
    var html = document.documentElement;
    html.dataset.design = s.design;
    html.dataset.mode = s.mode;
    html.dataset.caps = s.caps;
    html.dataset.numbers = String(s.numbers === true);
    html.dataset.font = s.font;
    html.dataset.form = L.formOf(s.design);
    html.style.setProperty('--pill-font', L.pillFont(s.height));
    html.style.setProperty('--intensity', s.intensity + '%');
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
    var segs = location.pathname.split('/').filter(Boolean);
    var res = L.resolveOpen(s.items, segs);
    if (!res) return showError(R.unknown.replace('{slug}', segs.join('/')));
    if (res.target.url) location.replace(res.target.url);
    else location.replace(location.pathname);
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
