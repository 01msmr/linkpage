// Edit mode: inline editing in the list, a settings panel, change detection, save.
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
  var gear, panel, bar, saveBtn, status, closeTimer;

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

  function labeled(text, input) {
    var l = el('label', 'field');
    l.appendChild(el('span', 'field-label', text));
    l.appendChild(input);
    return l;
  }

  function select(values, current, onChange) {
    var s = el('select');
    values.forEach(function (v) {
      var o = el('option', '', v);
      o.value = v;
      s.appendChild(o);
    });
    s.value = current;
    s.addEventListener('change', function () { onChange(s.value); });
    return s;
  }

  function setting(key, value) {
    draft[key] = value;
    touched();
    R.show(draft);
  }

  function settingsFields() {
    var cur = L.resolveSettings(draft);
    var box = el('div', 'settings');
    box.appendChild(labeled(E.fields.design, select(C.DESIGNS, cur.design, function (v) { setting('design', v); })));
    box.appendChild(labeled(E.fields.mode, select(E.modes, cur.mode, function (v) { setting('mode', v); })));
    var num = el('input');
    num.type = 'checkbox';
    num.checked = cur.numbers === true;
    num.addEventListener('change', function () { setting('numbers', num.checked); });
    box.appendChild(labeled(E.fields.numbers, num));
    box.appendChild(labeled(E.fields.caps, select(E.capsValues, cur.caps, function (v) { setting('caps', v); })));
    var delay = el('input');
    delay.type = 'text';
    delay.inputMode = 'numeric';
    delay.value = String(cur.delay);
    delay.addEventListener('input', function () {
      if (delay.value === '') delete draft.delay;
      else draft.delay = L.typedValue('delay', delay.value);
      touched();
    });
    box.appendChild(labeled(E.fields.delay, delay));
    var fonts = Object.keys(C.FONTS);
    if (fonts.length) {
      box.appendChild(labeled(E.fields.font, select([E.system].concat(fonts), cur.font, function (v) { setting('font', v); })));
    }
    return box;
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

  // Structure changed: show only the folders on the way to `parent`, then redraw.
  function afterChange(parent, newPath) {
    R.setOpen(L.prefixPaths(parent));
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

  function addTo(pp, item) {
    settle();
    var index = listAt(pp).length;
    draft.items = L.insertAt(draft.items, pp, index, item);
    afterChange(pp, pp.concat([index]).join('.'));
  }

  function addAfter(p, item) {
    settle();
    var parent = p.slice(0, -1);
    var index = p[p.length - 1] + 1;
    draft.items = L.insertAt(draft.items, parent, index, item);
    afterChange(parent, parent.concat([index]).join('.'));
  }

  function remove(p, item) {
    var n = L.countDescendants(item);
    if (n > 0 && !root.confirm(E.confirmFolder.replace('{name}', item.name || '').replace('{n}', n))) return;
    editPath = null;
    draft.items = L.removeAt(draft.items, p).items;
    afterChange(p.slice(0, -1));
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

  function setPanel(on) {
    clearTimeout(closeTimer);
    if (on) panel.dataset.open = ''; else delete panel.dataset.open;
    gear.setAttribute('aria-pressed', String(on));
    if (on) armClose();
  }

  // Closes after the pointer has been away for E.closeDelay; waits while a field has focus.
  function armClose() {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(function () {
      if (panel.contains(document.activeElement) || panel.matches(':hover') || gear.matches(':hover')) armClose();
      else setPanel(false);
    }, E.closeDelay);
  }

  function build() {
    panel = el('section', 'editor');
    panel.appendChild(settingsFields());
    bar = el('div', 'esavebar');
    bar.hidden = true;
    saveBtn = button(E.save, 'ebtn esave', save);
    saveBtn.disabled = true;
    bar.appendChild(saveBtn);
    status = el('span', 'estatus');
    status.setAttribute('role', 'status');
    bar.appendChild(status);
    gear = button(E.gear, 'gear', function () { setPanel(!('open' in panel.dataset)); });
    [gear, panel].forEach(function (n) {
      n.addEventListener('mouseenter', function () { setPanel(true); });
      n.addEventListener('mouseleave', armClose);
    });
    gear.setAttribute('aria-label', E.gearLabel);
    gear.setAttribute('aria-pressed', 'false');
    document.body.appendChild(bar);
    document.body.appendChild(gear);
    document.body.appendChild(panel);
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
