// Redirect page: looks the slug up in site.php, counts down, then replaces the location.
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
    var pill = L.pillFont(s.height);
    if (pill) html.style.setProperty('--pill-font', pill);
  }

  function show(node) {
    var list = document.getElementById('list');
    list.textContent = '';
    list.appendChild(node);
    document.body.hidden = false;
  }

  function showError(text) { show(el('p', 'error', text)); }

  function countdown(link, delay) {
    var line = el('p', 'redirect');
    var target = el('a', 'item', link.url);
    target.href = link.url;
    var box = el('div');
    box.appendChild(line);
    box.appendChild(target);
    var n = delay;
    function paint() { line.textContent = R.countdown.replace('{n}', String(n)); }
    paint();
    show(box);
    var timer = setInterval(function () {
      n -= 1;
      if (n <= 0) { clearInterval(timer); location.replace(link.url); return; }
      paint();
    }, R.tickMs);
  }

  function run(site) {
    var s = L.resolveSettings(site);
    applyLook(s);
    var slug = slugFromPath(location.pathname);
    var link = L.findLink(s.items, slug);
    if (!link) return showError(R.unknown.replace('{slug}', slug));
    var delay = L.delayFor(link, s);
    if (delay <= 0) return location.replace(link.url);
    countdown(link, delay);
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
