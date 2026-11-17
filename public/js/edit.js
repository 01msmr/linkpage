// Edit mode: inline editing in the list, settings dots with menus, change detection, save.
(function (root) {
  var L = root.LinkpagesLogic;
  var C = root.LinkpagesConfig;
  var E = C.EDIT;
  var R = root.LinkpagesRender;

  var original = null;
  var draft = null;
  var dragFrom = null;
  var editPath = null;
  var saving = false;
  var saveBtn, status, closeTimer, fadeTimer;
  var slots = [];

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function button(label, cls, onClick) {
    var b = el('button', cls, label);
    b.type = 'button';
    b.addEventListener('click', onClick);
    return b;
  }

  function fill(template, name) { return template.replace('{name}', name || ''); }
  function parse(path) { return path === '' ? [] : path.split('.').map(Number); }
  function listAt(pp) { return pp.length ? L.itemAt(draft.items, pp).items : draft.items; }

  function changed() { return L.hasChanged(draft, original); }

  function refresh() {
    saveBtn.disabled = saving || !changed();
    if (!saving && !changed()) status.textContent = '';
    saveBtn.hidden = !changed() && !saving;
    status.hidden = !status.textContent;
  }

  function say(text, kind) {
    status.textContent = text;
    status.dataset.kind = kind;
    status.hidden = false;
    saveBtn.hidden = false;
  }

  function touched() {
    status.dataset.kind = '';
    refresh();
  }

  // Colors cross-fade while the mode changes (the class stays on for one fade).
  function fadeMode() {
    var html = document.documentElement;
    var ms = R.cssMs('--fade');
    html.classList.add('mode-fade');
    void html.offsetWidth;
    clearTimeout(fadeTimer);
    fadeTimer = setTimeout(function () { html.classList.remove('mode-fade'); }, ms + 50);
  }

  // The look-and-feel mode is a per-browser view choice: it is never saved and never opens the save bar.
  function setMode(value) {
    fadeMode();
    R.setMode(value);
    try { root.localStorage.setItem(E.modeKey, value); } catch (e) { /* view only */ }
    R.show(draft);
  }

  function setting(key, value) {
    if (key === 'mode') return setMode(value);
    draft[key] = value;
    touched();
    R.show(draft);
  }

  function currentOf(key) {
    return key === 'mode' ? R.getMode() : L.resolveSettings(draft)[key];
  }

  function labelOf(v) { return Object.prototype.hasOwnProperty.call(E.valueLabels, String(v)) ? E.valueLabels[String(v)] : String(v); }

  function valuesOf(c, cur) { return c.values.indexOf(cur) >= 0 ? c.values : c.values.concat([cur]); }

  function refreshDock() {
    slots.forEach(function (x) {
      var now = currentOf(x.c.key);
      x.btn.title = x.c.label + ': ' + labelOf(now);
      x.btn.setAttribute('aria-label', x.btn.title);
      if (x.opts) x.opts.forEach(function (o) { if (o.value === now) o.btn.setAttribute('aria-current', 'true'); else o.btn.removeAttribute('aria-current'); });
    });
  }

  function closeMenus(except) {
    slots.forEach(function (x) { if (x.menu && x.slot !== except) delete x.menu.dataset.open; });
  }

  // Hovering an icon two or more places away from an open menu closes it.
  function closeFar(index) {
    slots.forEach(function (x, i) { if (x.menu && Math.abs(i - index) >= 2) delete x.menu.dataset.open; });
  }

  // Two values switch on click; more values open a menu on hover.
  function dockSlot(c) {
    var cur = currentOf(c.key);
    var values = valuesOf(c, cur);
    var slot = el('div', 'slot');
    var btn = el('button', 'dot');
    btn.type = 'button';
    btn.appendChild(el('span', 'pt'));
    btn.appendChild(el('span', 'ico', c.icon));
    slot.appendChild(btn);
    var x = { c: c, slot: slot, btn: btn };
    if (values.length === 2) {
      btn.addEventListener('click', function () {
        var now = currentOf(c.key);
        setting(c.key, values[values[0] === now ? 1 : 0]);
        refreshDock();
      });
      slot.addEventListener('mouseenter', function () { closeFar(slots.indexOf(x)); });
    } else {
      x.menu = el('div', 'menu');
      x.opts = values.map(function (v) {
        var o = button(labelOf(v), 'opt', function () {
          setting(c.key, v);
          refreshDock();
          closeMenus();
        });
        x.menu.appendChild(o);
        return { value: v, btn: o };
      });
      slot.appendChild(x.menu);
      btn.addEventListener('click', function () {
        var was = 'open' in x.menu.dataset;
        closeMenus();
        if (!was) { x.menu.dataset.open = ''; armClose(); }
      });
      slot.addEventListener('mouseenter', function () { closeMenus(slot); x.menu.dataset.open = ''; clearTimeout(closeTimer); });
    }
    slot.addEventListener('mouseleave', armClose);
    slots.push(x);
    return slot;
  }

  function buildDock() {
    var dock = el('div', 'dock');
    E.controls.forEach(function (c) { dock.appendChild(dockSlot(c)); });
    refreshDock();
    return dock;
  }

  // A new link without a slug gets one from its name when editing ends.
  function settle() {
    if (editPath === null) return;
    var p = parse(editPath);
    var it = L.itemAt(draft.items, p);
    if (it && !Array.isArray(it.items) && !it.slug) {
      draft.items = L.setField(draft.items, p, 'slug', L.slugFor(it.name || '', draft.items));
    }
    editPath = null;
  }

  function focusEdit() {
    var f = document.querySelector('.ebox input');
    if (f) { f.focus(); f.select(); }
  }

  // Structure changed: apply the new open folders (default: only the way to `parent`), then redraw.
  function afterChange(parent, newPath, open) {
    R.setOpen(open || L.prefixPaths(parent));
    editPath = newPath === undefined ? null : newPath;
    touched();
    R.show(draft);
    if (editPath !== null) focusEdit();
  }

  function finish() {
    settle();
    touched();
    R.show(draft);
  }

  function startEdit(path) {
    settle();
    editPath = path;
    R.show(draft);
    focusEdit();
  }

  // Open folders after an insert at parent[index]: the others stay as they were, the way to the new item opens.
  function openWith(parent, index) {
    var open = L.reindexOpen(R.getOpen(), parent, index, 1);
    L.prefixPaths(parent).forEach(function (p) { if (open.indexOf(p) < 0) open.push(p); });
    return open;
  }

  function newFolder() { return { name: E.newFolderName, items: [] }; }

  // Inside a folder, at the top.
  function addInside(p, item) {
    settle();
    draft.items = L.insertAt(draft.items, p, 0, item);
    afterChange(p, p.concat([0]).join('.'), openWith(p, 0));
  }

  function addTo(pp, item) {
    settle();
    var index = listAt(pp).length;
    draft.items = L.insertAt(draft.items, pp, index, item);
    afterChange(pp, pp.concat([index]).join('.'), openWith(pp, index));
  }

  function addAfter(p, item) {
    settle();
    var parent = p.slice(0, -1);
    var index = p[p.length - 1] + 1;
    draft.items = L.insertAt(draft.items, parent, index, item);
    var path = parent.concat([index]).join('.');
    var open = openWith(parent, index);
    if (Array.isArray(item.items)) open.push(path);
    afterChange(parent, path, open);
  }

  function remove(p, item) {
    var n = L.countDescendants(item);
    if (n > 0 && !root.confirm(E.confirmFolder.replace('{name}', item.name || '').replace('{n}', n))) return;
    editPath = null;
    var parent = p.slice(0, -1);
    var open = L.reindexOpen(R.getOpen(), parent, p[p.length - 1], -1);
    draft.items = L.removeAt(draft.items, p).items;
    afterChange(parent, undefined, open);
  }

  function ctl(icon, label, cls, onClick) {
    var b = button(icon.charAt(0) === '<' ? '' : icon, 'ctl ' + cls, function (e) { e.stopPropagation(); onClick(); });
    if (icon.charAt(0) === '<') b.innerHTML = icon;
    b.setAttribute('aria-label', label);
    b.title = label;
    return b;
  }

  function input(path, key, item) {
    var i = el('input', 'in-' + key);
    i.type = 'text';
    i.value = item[key] === undefined ? '' : String(item[key]);
    i.placeholder = E.itemFields[key];
    i.setAttribute('aria-label', E.itemFields[key]);
    i.addEventListener('input', function () {
      draft.items = L.setField(draft.items, parse(path), key, i.value);
      touched();
    });
    i.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); finish(); }
    });
    return i;
  }

  function editBox(item, path) {
    if (editPath !== path) return null;
    var isFolder = Array.isArray(item.items);
    var box = el('div', 'ebox' + (isFolder ? ' efolder' : ''));
    box.appendChild(input(path, 'name', item));
    if (!isFolder) box.appendChild(input(path, 'url', item));
    return box;
  }

  function zoneOf(r, e, isFolder) {
    var b = r.getBoundingClientRect();
    var y = (e.clientY - b.top) / b.height;
    if (y < E.dropZone.before) return 'before';
    if (y > E.dropZone.after) return 'after';
    return isFolder ? 'into' : (y < 0.5 ? 'before' : 'after');
  }

  function clearDrop() {
    var m = document.querySelectorAll('[data-drop]');
    for (var i = 0; i < m.length; i++) delete m[i].dataset.drop;
  }

  function drop(p, zone, item) {
    settle();
    var parent = zone === 'into' ? p : p.slice(0, -1);
    var index = zone === 'into' ? item.items.length : p[p.length - 1] + (zone === 'after' ? 1 : 0);
    var from = dragFrom;
    dragFrom = null;
    clearDrop();
    var moved = L.moveItem(draft.items, from, parent, index);
    if (moved) {
      var open = L.openAfterMove(R.getOpen(), from, parent, index);
      draft.items = moved;
      afterChange(L.parentAfterRemoval(from, parent), undefined, open);
    }
  }

  function wireDrag(r, handle, p, isFolder, item) {
    handle.addEventListener('mousedown', function () { r.draggable = true; });
    r.addEventListener('dragstart', function (e) {
      dragFrom = p;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', r.dataset.path);
    });
    r.addEventListener('dragend', function () { r.draggable = false; dragFrom = null; clearDrop(); });
    r.addEventListener('dragover', function (e) {
      if (!dragFrom) return;
      e.preventDefault();
      clearDrop();
      r.dataset.drop = zoneOf(r, e, isFolder);
    });
    r.addEventListener('drop', function (e) {
      if (!dragFrom) return;
      e.preventDefault();
      drop(p, zoneOf(r, e, isFolder), item);
    });
  }

  // The row around an entry: controls in the gutters, the entry itself in the middle.
  function wrap(core, item, path) {
    var p = parse(path);
    var isFolder = Array.isArray(item.items);
    var I = E.icons;
    var r = el('div', 'ent');
    r.dataset.path = path;
    r.style.setProperty('--depth', String(Math.max(0, isFolder ? p.length - 1 : p.length - 2)));
    var gl = el('div', 'gl');
    var gr = el('div', 'gr');
    if (editPath === path) {
      r.dataset.editing = 'true';
      gr.appendChild(ctl(I.done, E.labels.done, 'ctl-done', finish));
      gr.appendChild(ctl(I.remove, fill(E.labels.remove, item.name), 'ctl-remove', function () { remove(p, item); }));
    } else {
      var handle = ctl(I.handle, fill(E.labels.handle, item.name), 'ctl-handle', function () {});
      gl.appendChild(handle);
      gl.appendChild(ctl(I.pen, fill(E.labels.pen, item.name), 'ctl-pen', function () { startEdit(path); }));
      gr.appendChild(belowDuo(item, p, isFolder && L.isOpen(R.getOpen(), path)));
      wireDrag(r, handle, p, isFolder, item);
    }
    r.appendChild(gl);
    r.appendChild(core);
    r.appendChild(el('div', 'gap'));
    r.appendChild(gr);
    return r;
  }

  // The add icons behind a row: a link or a folder after it.
  // The add icons behind a row: after it, or (the head of an open folder) as its first item.
  function belowDuo(item, p, inside) {
    var I = E.icons;
    var add = inside ? addInside : addAfter;
    var below = el('span', 'ctl-below');
    below.appendChild(ctl(I.linkPlus, fill(inside ? E.labels.linkInside : E.labels.linkAfter, item.name), 'ctl-plus ctl-link', function () { add(p, L.clone(E.newLink)); }));
    below.appendChild(ctl(I.folderPlus, fill(inside ? E.labels.folderInside : E.labels.folderAfter, item.name), 'ctl-plus ctl-folder', function () { add(p, newFolder()); }));
    return below;
  }

  // The closing line of an open folder carries the add icons for "after this folder".
  function spacer(core, item, path) {
    var r = el('div', 'ent ent-closer');
    r.appendChild(el('div', 'gl'));
    r.appendChild(core);
    r.appendChild(el('div', 'gap'));
    var gr = el('div', 'gr');
    if (item) gr.appendChild(belowDuo(item, parse(path)));
    r.appendChild(gr);
    return r;
  }

  function listEnd(path) {
    var pp = parse(path);
    var core = el('div', 'lend');
    core.appendChild(ctl(E.icons.plus, E.labels.addLink, 'ctl-plus', function () { addTo(pp, L.clone(E.newLink)); }));
    core.appendChild(ctl(E.icons.plus + C.FOLDER.chevron, E.labels.addFolder, 'ctl-plus', function () { addTo(pp, newFolder()); }));
    var r = spacer(core);
    r.className += ' listend';
    return r;
  }

  // All add icons stand at one x, right of the longest entry, each in its own line; the empty stretch up to them (.gap) also shows them.
  function alignIcons() {
    var rows = [].slice.call(document.querySelectorAll('#list .ent'));
    var live = rows.filter(function (r) { return !r.closest('.folder[data-state="closed"] > .folder-body'); });
    var right = 0;
    live.forEach(function (r) {
      var core = r.querySelector(':scope > .item, :scope > .ebox, :scope > .lend');
      if (core) right = Math.max(right, core.getBoundingClientRect().right);
    });
    rows.forEach(function (r) {
      var gr = r.querySelector(':scope > .gr');
      var box = r.getBoundingClientRect();
      if (gr) gr.style.left = Math.round(right - box.left) + 'px';
      r.style.setProperty('--gap-w', Math.max(0, Math.round(right - box.right)) + 'px');
    });
  }

  var api = { wrap: wrap, spacer: spacer, editBox: editBox, listEnd: listEnd, afterDraw: alignIcons };

  function failure(res) {
    if (res === 'network') return E.errors.network;
    return E.errors[res] || E.errors.other.replace('{status}', res);
  }

  function save() {
    settle();
    R.show(draft);
    saving = true;
    saveBtn.disabled = true;
    say(E.saving, 'busy');
    var sent = L.clone(draft);
    fetch(E.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sent) })
      .then(function (r) {
        if (!r.ok) throw r.status;
        saving = false;
        original = sent;
        status.textContent = '';
        status.dataset.kind = '';
        refresh();
      })
      .catch(function (e) {
        saving = false;
        say(failure(typeof e === 'number' ? e : 'network'), 'error');
        saveBtn.disabled = !changed();
      });
  }

  // Closes open menus once the pointer has been away for E.closeDelay.
  function armClose() {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(function () {
      if (document.querySelector('.dock:hover')) armClose();
      else closeMenus();
    }, E.closeDelay);
  }

  // Dragging the divider sets the pane width in whole percent for this page view only; it is not saved.
  function buildDivider() {
    var d = el('div', 'divider');
    d.id = 'divider';
    d.addEventListener('pointerdown', function (e) {
      d.setPointerCapture(e.pointerId);
      d.dataset.drag = '';
    });
    d.addEventListener('pointermove', function (e) {
      if (!('drag' in d.dataset)) return;
      var pct = Math.round((root.innerWidth - e.clientX) / root.innerWidth * 100);
      pct = Math.max(C.SPLIT.min, Math.min(C.SPLIT.max, pct));
      root.document.documentElement.style.setProperty('--pane', pct + '%');
      R.fit();
    });
    function end() { delete d.dataset.drag; }
    d.addEventListener('pointerup', end);
    d.addEventListener('pointercancel', end);
    return d;
  }

  function build() {
    var bar0 = el('div', 'toolbar');
    var dock = buildDock();
    saveBtn = button('', 'ebtn esave', save);
    saveBtn.innerHTML = E.saveIcon;
    saveBtn.title = E.save;
    saveBtn.setAttribute('aria-label', E.save);
    saveBtn.disabled = true;
    saveBtn.hidden = true;
    dock.appendChild(saveBtn);
    status = el('span', 'estatus');
    status.setAttribute('role', 'status');
    status.hidden = true;
    bar0.appendChild(dock);
    bar0.appendChild(status);
    document.body.appendChild(bar0);
    document.body.appendChild(buildDivider());
  }

  function start(site) {
    original = L.clone(site);
    draft = L.clone(site);
    root.document.documentElement.dataset.editing = '';
    build();
    try {
      var m = root.localStorage.getItem(E.modeKey);
      if (m && E.modes.indexOf(m) >= 0) R.setMode(m);
    } catch (e) { /* default mode */ }
    R.setEditor(api);
    R.show(draft);
    root.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (changed() && !saving) save();
      }
    });
    root.addEventListener('beforeunload', function (e) {
      if (!changed()) return;
      e.preventDefault();
      e.returnValue = E.leaveWarning;
    });
  }

  // Editing is on only in a browser that opened /edit/ (which redirects to /?edit=1).
  function enabled() {
    try {
      var q = new URLSearchParams(root.location.search).get('edit');
      if (q === '1') root.localStorage.setItem(E.flagKey, '1');
      if (q === '0') root.localStorage.removeItem(E.flagKey);
      if (q !== null) root.history.replaceState(null, '', root.location.pathname);
      return root.localStorage.getItem(E.flagKey) === '1';
    } catch (e) {
      return false;
    }
  }

  // A browser with cached credentials starts editing by itself; visitors get a silent 401.
  function probe() {
    return fetch(E.probe, { credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) { return r.ok; })
      .catch(function () { return false; });
  }

  function boot() {
    if (enabled()) return R.whenReady(start);
    if (!E.autoProbe || new URLSearchParams(root.location.search).get('edit') === '0') return;
    probe().then(function (ok) {
      if (!ok) return;
      try { root.localStorage.setItem(E.flagKey, '1'); } catch (e) { /* flag only helps next time */ }
      R.whenReady(start);
    });
  }

  boot();
})(window);
