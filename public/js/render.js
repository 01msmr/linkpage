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
  var modeOverride = null;

  // The chevron is a text glyph; one design draws it as an SVG whose ink ends exactly at the box edge. Both turn by rotation.
  function chevron(ch) {
    var s = el('span', 'chev', ch);
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'chev-ink');
    svg.setAttribute('viewBox', '0 0 10 10');
    svg.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS(ns, 'path');
    p.setAttribute('d', C.FOLDER.shape);
    svg.appendChild(p);
    s.appendChild(svg);
    return s;
  }

  var folding = false;

  function bodyOf(path) {
    var head = document.querySelector('.folder-head[data-path="' + path + '"]');
    var wrap = head && head.closest('.folder');
    return wrap && wrap.querySelector(':scope > .folder-body');
  }

  // The closing line of a folder (the line itself, or its row in edit mode), if the folder is open.
  function closerOf(path) {
    var head = document.querySelector('.folder-head[data-path="' + path + '"]');
    var wrap = head && head.closest('.folder');
    var last = wrap && wrap.lastElementChild;
    return last && (last.classList.contains('folder-closer') || last.querySelector('.folder-closer')) ? last : null;
  }

  // Moves parts together, then calls done. A part is { el, prop: 'height' | 'margin-top', from, to (px), fade?: { el, from, to } }.
  function slide(parts, done, lifted) {
    folding = true;
    var finished = false;
    var ms = C.FOLDER.foldMs;
    function end() {
      if (finished) return;
      finished = true;
      parts.forEach(function (p) {
        p.el.style.cssText = '';
        if (p.fade) p.fade.el.style.opacity = '';
      });
      if (lifted) lifted.style.cssText = '';
      folding = false;
      if (done) done();
    }
    parts.forEach(function (p) {
      if (p.prop === 'height') {
        p.el.style.overflow = 'hidden';
        p.el.style.minHeight = '0';
        p.el.style.height = p.from + 'px';
      } else {
        p.el.style.marginTop = p.from + 'px';
      }
      if (p.fade) p.fade.el.style.opacity = String(p.fade.from);
    });
    void document.body.offsetHeight;
    parts.forEach(function (p) {
      p.el.style.transition = (p.prop === 'height' ? 'height ' : 'margin-top ') + ms + 'ms ease';
      if (p.prop === 'height') p.el.style.height = p.to + 'px';
      else p.el.style.marginTop = p.to + 'px';
      if (p.fade) {
        p.fade.el.style.transition = 'opacity ' + ms + 'ms ease';
        p.fade.el.style.opacity = String(p.fade.to);
      }
    });
    parts[0].el.addEventListener('transitionend', function (e) { if (e.target === parts[0].el && e.propertyName === 'height') end(); });
    setTimeout(end, ms + 60);
  }

  function flip(path) {
    open = L.toggleOpen(open, path);
    draw();
    var f = document.querySelector('.folder-head[data-path="' + path + '"]');
    if (f) f.focus();
  }

  function chevOf(path) {
    var head = document.querySelector('.folder-head[data-path="' + path + '"]');
    return head && head.querySelector('.chev');
  }

  // Turns a folder chevron to its open (down) or closed (right) angle.
  function turnChevron(chev, isOpen, instant) {
    if (!chev) return;
    var svg = chev.querySelector('.chev-ink');
    var el = svg && getComputedStyle(svg).display !== 'none' ? svg : chev;
    chev.style.position = 'relative';
    chev.style.zIndex = '2';
    el.style.transition = instant ? 'none' : 'transform ' + C.FOLDER.foldMs + 'ms ease';
    el.style.transform = isOpen ? 'rotate(90deg)' : 'rotate(0deg)';
  }

  // While the closing line overlaps a filled head, only the head's upper half keeps its fill so the text stays on top of the line.
  function liftHead(path) {
    var head = document.querySelector('.folder-head[data-path="' + path + '"]');
    if (!head) return null;
    var fill = getComputedStyle(head).backgroundColor;
    if (fill === 'rgba(0, 0, 0, 0)' || fill === 'transparent') return null;
    head.style.position = 'relative';
    head.style.zIndex = '2';
    head.style.backgroundColor = 'transparent';
    head.style.backgroundImage = 'linear-gradient(' + fill + ' 50%, transparent 50%)';
    return head;
  }

  // The closing line travels over the head's lower half (and back) so it forms the closed folder's bottom corners itself.
  function closerParts(wrap, closer, fromOpen) {
    var gap = parseFloat(getComputedStyle(wrap).rowGap) || 0;
    var reach = -(closer.offsetHeight + 2 * gap);
    var chev = closer.querySelector('.chev') || closer;
    return { el: closer, prop: 'margin-top', from: fromOpen ? 0 : reach, to: fromOpen ? reach : 0, fade: { el: chev, from: fromOpen ? 1 : 0, to: fromOpen ? 0 : 1 } };
  }

  // Opening and closing a folder slides its contents and its closing line (skipped for reduced motion).
  function toggle(path) {
    if (folding) return;
    var body = bodyOf(path);
    if (!body || root.matchMedia('(prefers-reduced-motion: reduce)').matches) return flip(path);
    if (L.isOpen(open, path)) {
      var closer = closerOf(path);
      turnChevron(chevOf(path), false);
      var parts = [{ el: body, prop: 'height', from: body.offsetHeight, to: 0 }];
      if (closer) parts.push(closerParts(body.parentElement, closer, true));
      return slide(parts, function () { flip(path); }, liftHead(path));
    }
    flip(path);
    var fresh = bodyOf(path);
    var fresher = closerOf(path);
    if (!fresh) return;
    turnChevron(chevOf(path), false, true);
    void document.body.offsetHeight;
    turnChevron(chevOf(path), true);
    var opening = [{ el: fresh, prop: 'height', from: 0, to: fresh.scrollHeight }];
    if (fresher) opening.push(closerParts(fresh.parentElement, fresher, false));
    slide(opening, null, liftHead(path));
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
    if (item.url) a.dataset.url = item.url;
    if (item.url && item.url === activeUrl) a.setAttribute('aria-current', 'true');
    var split = splitOn();
    if (item.url && split && embeddable(item.url)) {
      a.href = item.url;
      a.addEventListener('click', function (e) { e.preventDefault(); openInPane(item.url); });
    } else if (item.url) {
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
    wrap.appendChild(sub(item.items, path));
    if (isOpen) {
      var closer = closerCore(item, path);
      wrap.appendChild(editor ? editor.spacer(closer, item, path) : closer);
    }
    return wrap;
  }

  function fill(box, items, path) {
    var prefix = path === '' ? '' : path + '.';
    L.entriesFor(items, path === '').forEach(function (e, i) { box.appendChild(entry(e.item, i, prefix + e.index)); });
    if (editor && items.length === 0 && path === '') box.appendChild(editor.listEnd(path));
  }

  function sub(items, path) {
    var box = el('div', 'items folder-body');
    fill(box, items, path);
    return box;
  }

  // Hover a link for TIP.showMs to see its URL beside it; then other items show theirs at once until TIP.hideMs after leaving.
  var tip = null;
  var tipOn = false;
  var tipTimer = 0;
  var tipHideTimer = 0;

  function hideTip() {
    clearTimeout(tipTimer);
    if (tip) delete tip.dataset.show;
  }

  function showTip(a) {
    if (!tip) {
      tip = el('div', 'urltip');
      document.body.appendChild(tip);
    }
    var b = a.getBoundingClientRect();
    tip.textContent = a.dataset.url;
    tip.style.left = (b.right + C.TIP.gap) + 'px';
    tip.style.top = (b.top + b.height / 2) + 'px';
    tip.dataset.show = '';
  }

  function tipOver(e) {
    var it = e.target.closest ? e.target.closest('.item') : null;
    if (!it) return;
    clearTimeout(tipHideTimer);
    clearTimeout(tipTimer);
    if (!it.dataset.url) { hideTip(); return; }
    if (tipOn) showTip(it);
    else tipTimer = setTimeout(function () { tipOn = true; showTip(it); }, C.TIP.showMs);
  }

  function tipOut(e) {
    var to = e.relatedTarget;
    if (to && to.closest && to.closest('#list .item')) return;
    clearTimeout(tipTimer);
    clearTimeout(tipHideTimer);
    tipHideTimer = setTimeout(function () { tipOn = false; hideTip(); }, C.TIP.hideMs);
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
    hideTip();
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
    html.dataset.mode = modeOverride || settings.mode;
    html.dataset.caps = settings.caps;
    html.dataset.numbers = String(settings.numbers === true);
    html.dataset.font = settings.font;
    html.dataset.layout = settings.layout;
    syncSplit();
    html.style.setProperty('--pill-font', L.pillFont(settings.height));
    html.style.setProperty('--intensity', settings.intensity + '%');
    draw();
  }

  // ?open on /folder/link/ opens the tree down to that entry, marks it and, in the split layout, loads it.
  function applyOpen() {
    if (!new URLSearchParams(root.location.search).has('open')) return;
    var res = L.resolveOpen(raw.items, root.location.pathname.split('/').filter(Boolean));
    if (!res) return;
    res.open.forEach(function (p) { if (open.indexOf(p) < 0) open.push(p); });
    var url = res.target.url;
    if (url && splitOn() && embeddable(url)) openInPane(url);
    else {
      activeUrl = url || null;
      draw();
    }
    var mark = document.querySelector('a.item[aria-current]');
    if (mark && mark.scrollIntoView) mark.scrollIntoView({ block: 'center' });
  }

  function render(site) {
    open = [];
    show(site);
    applyOpen();
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
    getMode: function () { return modeOverride || (settings && settings.mode); },
    setMode: function (m) { modeOverride = m; },
    setOpen: function (paths) { open = paths; },
    setEditor: function (e) { editor = e; }
  };

  var listBox = document.getElementById('list');
  listBox.addEventListener('mouseover', tipOver);
  listBox.addEventListener('mouseout', tipOut);

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
