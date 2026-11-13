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
  var bar, saveBtn, status, closeTimer, fadeTimer;
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
    if (!saving) {
      if (changed()) status.textContent = E.unsaved;
      else status.textContent = '';
    }
    bar.hidden = !changed() && !status.textContent;
  }

  function say(text, kind) {
    status.textContent = text;
    status.dataset.kind = kind;
    bar.hidden = false;
  }

  function touched() {
    status.dataset.kind = '';
    refresh();
  }

  // Colors cross-fade while the mode changes (the class stays on for one fade).
  function fadeMode() {
    var html = document.documentElement;
    var ms = parseFloat(getComputedStyle(html).getPropertyValue('--fade')) * 1000 || 0;
    html.classList.add('mode-fade');
    void html.offsetWidth;
    clearTimeout(fadeTimer);
    fadeTimer = setTimeout(function () { html.classList.remove('mode-fade'); }, ms + 50);
  }

  function setting(key, value) {
    if (key === 'mode') fadeMode();
    draft[key] = value;
    touched();
    R.show(draft);
  }

  function labelOf(v) { return Object.prototype.hasOwnProperty.call(E.valueLabels, String(v)) ? E.valueLabels[String(v)] : String(v); }

  function valuesOf(c, cur) { return c.values.indexOf(cur) >= 0 ? c.values : c.values.concat([cur]); }

  function refreshDock() {
    var cur = L.resolveSettings(draft);
    slots.forEach(function (x) {
      var now = cur[x.c.key];
      x.btn.title = x.c.label + ': ' + labelOf(now);
      x.btn.setAttribute('aria-label', x.btn.title);
      if (x.opts) x.opts.forEach(function (o) { if (o.value === now) o.btn.setAttribute('aria-current', 'true'); else o.btn.removeAttribute('aria-current'); });
    });
  }

  function closeMenus(except) {
    slots.forEach(function (x) { if (x.menu && x.slot !== except) delete x.menu.dataset.open; });
  }

  // Two values switch on click; more values open a menu on hover.
  function dockSlot(c) {
    var cur = L.resolveSettings(draft)[c.key];
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
        var now = L.resolveSettings(draft)[c.key];
        setting(c.key, values[values[0] === now ? 1 : 0]);
        refreshDock();
      });
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
    afterChange(parent, parent.concat([index]).join('.'), openWith(parent, index));
  }

  function remove(p, item) {
    var n = L.countDescendants(item);
    if (n > 0 && !root.confirm(E.confirmFolder.replace('{name}', item.name || '').replace('{n}', n))) return;
    editPath = null;
    var open = L.reindexOpen(R.getOpen(), p.slice(0, -1), p[p.length - 1], -1);
    draft.items = L.removeAt(draft.items, p).items;
    afterChange(p.slice(0, -1), undefined, open);
  }

  function ctl(icon, label, cls, onClick) {
    var b = button(icon, 'ctl ' + cls, function (e) { e.stopPropagation(); onClick(); });
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
      draft.items = moved;
      afterChange(L.parentAfterRemoval(from, parent));
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
    var gl = el('div', 'gl');
    var gr = el('div', 'gr');
    if (editPath === path) {
      r.dataset.editing = 'true';
      gr.appendChild(ctl(I.done, E.labels.done, 'ctl-done', finish));
      gr.appendChild(ctl(I.remove, fill(E.labels.remove, item.name), 'ctl-remove', function () { remove(p, item); }));
    } else {
      var handle = ctl(I.handle, fill(E.labels.handle, item.name), 'ctl-handle', function () {});
      gl.appendChild(handle);
      if (isFolder) gl.appendChild(ctl(I.plus, fill(E.labels.folderInside, item.name), 'ctl-plus', function () { addTo(p, { name: E.newFolderName, items: [] }); }));
      else gl.appendChild(el('span', 'ctl-gap'));
      var after = isFolder ? E.labels.folderAfter : E.labels.linkAfter;
      gr.appendChild(ctl(I.plus, fill(after, item.name), 'ctl-plus', function () { addAfter(p, isFolder ? { name: E.newFolderName, items: [] } : L.clone(E.newLink)); }));
      gr.appendChild(ctl(I.pen, fill(E.labels.pen, item.name), 'ctl-pen', function () { startEdit(path); }));
      wireDrag(r, handle, p, isFolder, item);
    }
    r.appendChild(gl);
    r.appendChild(core);
    r.appendChild(gr);
    return r;
  }

  function spacer(core) {
    var r = el('div', 'ent');
    r.appendChild(el('div', 'gl'));
    r.appendChild(core);
    r.appendChild(el('div', 'gr'));
    return r;
  }

  function listEnd(path) {
    var pp = parse(path);
    var core = el('div', 'lend');
    core.appendChild(ctl(E.icons.plus, E.labels.addLink, 'ctl-plus', function () { addTo(pp, L.clone(E.newLink)); }));
    core.appendChild(ctl(E.icons.plus + C.FOLDER.chevron, E.labels.addFolder, 'ctl-plus', function () { addTo(pp, { name: E.newFolderName, items: [] }); }));
    var r = spacer(core);
    r.className += ' listend';
    return r;
  }

  var api = { wrap: wrap, spacer: spacer, editBox: editBox, listEnd: listEnd };

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
    bar = el('div', 'esavebar');
    bar.hidden = true;
    saveBtn = button(E.save, 'ebtn esave', save);
    saveBtn.disabled = true;
    bar.appendChild(saveBtn);
    status = el('span', 'estatus');
    status.setAttribute('role', 'status');
    bar.appendChild(status);
    bar0.appendChild(bar);
    bar0.appendChild(buildDock());
    document.body.appendChild(bar0);
    document.body.appendChild(buildDivider());
  }

  function start(site) {
    original = L.clone(site);
    draft = L.clone(site);
    build();
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

  if (enabled()) R.whenReady(start);
})(window);
