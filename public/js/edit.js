// Edit mode: settings fields, tree editor with drag, change detection, save.
(function (root) {
  var L = root.LinkpagesLogic;
  var C = root.LinkpagesConfig;
  var E = C.EDIT;
  var R = root.LinkpagesRender;

  var original = null;
  var draft = null;
  var dragFrom = null;
  var editing = false;
  var gear, panel, tree, saveBtn, status;

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

  function changed() { return L.hasChanged(draft, original); }

  var saving = false;

  function refresh() {
    saveBtn.disabled = saving || !changed();
    if (saving) return;
    if (!saveBtn.disabled) status.textContent = E.unsaved;
    else if (status.dataset.kind !== 'saved') status.textContent = '';
  }

  function say(text, kind) {
    status.textContent = text;
    status.dataset.kind = kind;
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

  function inputFor(path, key, item) {
    var i = el('input', 'in-' + key);
    i.type = 'text';
    i.value = item[key] === undefined ? '' : String(item[key]);
    i.placeholder = E.itemFields[key];
    i.setAttribute('aria-label', E.itemFields[key]);
    i.addEventListener('input', function () {
      draft.items = L.setField(draft.items, path, key, i.value);
      touched();
    });
    return i;
  }

  function parsePath(s) { return s === '' ? [] : s.split('.').map(Number); }

  function row(item, path) {
    var isFolder = Array.isArray(item.items);
    var wrap = el('div', 'erow-wrap');
    var r = el('div', 'erow ' + (isFolder ? 'efolder' : 'elink'));
    r.dataset.path = path.join('.');
    var handle = el('span', 'handle', E.handle);
    handle.setAttribute('aria-label', E.handleLabel);
    handle.addEventListener('mousedown', function () { r.draggable = true; });
    r.addEventListener('dragstart', function (e) {
      dragFrom = path;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', r.dataset.path);
    });
    r.addEventListener('dragend', function () { r.draggable = false; dragFrom = null; clearDrop(); });
    r.addEventListener('dragover', function (e) {
      if (!dragFrom) return;
      e.preventDefault();
      mark(r, zoneOf(r, e, isFolder));
    });
    r.addEventListener('drop', function (e) {
      if (!dragFrom) return;
      e.preventDefault();
      drop(path, zoneOf(r, e, isFolder), item);
    });
    r.appendChild(handle);
    r.appendChild(inputFor(path, 'name', item));
    r.appendChild(button(E.remove, 'del', function () { remove(path, item); }));
    r.lastChild.setAttribute('aria-label', E.removeLabel.replace('{name}', item.name));
    if (!isFolder) {
      var more = el('div', 'link-fields');
      more.appendChild(inputFor(path, 'url', item));
      more.appendChild(inputFor(path, 'slug', item));
      more.appendChild(inputFor(path, 'delay', item));
      r.appendChild(more);
    }
    wrap.appendChild(r);
    if (isFolder) wrap.appendChild(list(item.items, path));
    return wrap;
  }

  function list(items, parent) {
    var box = el('div', 'elist');
    items.forEach(function (it, i) { box.appendChild(row(it, parent.concat([i]))); });
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
    var m = tree.querySelectorAll('[data-drop]');
    for (var i = 0; i < m.length; i++) delete m[i].dataset.drop;
  }

  function mark(r, zone) {
    clearDrop();
    r.dataset.drop = zone;
  }

  function drop(path, zone, item) {
    var parent = zone === 'into' ? path : path.slice(0, -1);
    var index = zone === 'into' ? item.items.length : path[path.length - 1] + (zone === 'after' ? 1 : 0);
    var moved = L.moveItem(draft.items, dragFrom, parent, index);
    dragFrom = null;
    clearDrop();
    if (moved) { draft.items = moved; redrawTree(); touched(); }
  }

  function remove(path, item) {
    var n = L.countDescendants(item);
    if (n > 0 && !root.confirm(E.confirmFolder.replace('{name}', item.name).replace('{n}', n))) return;
    draft.items = L.removeAt(draft.items, path).items;
    redrawTree();
    touched();
  }

  function add(item) {
    draft.items = L.insertAt(draft.items, [], draft.items.length, item);
    redrawTree();
    touched();
  }

  function redrawTree() {
    tree.textContent = '';
    tree.appendChild(list(draft.items, []));
  }

  function failure(res) {
    if (res === 'network') return E.errors.network;
    return E.errors[res] || E.errors.other.replace('{status}', res);
  }

  function save() {
    saving = true;
    saveBtn.disabled = true;
    say(E.saving, 'busy');
    var sent = L.clone(draft);
    fetch(E.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sent) })
      .then(function (r) {
        if (!r.ok) throw r.status;
        saving = false;
        original = sent;
        R.render(L.clone(sent));
        say(E.saved, 'saved');
        refresh();
      })
      .catch(function (e) {
        saving = false;
        say(failure(typeof e === 'number' ? e : 'network'), 'error');
        saveBtn.disabled = !changed();
      });
  }

  function build() {
    panel.textContent = '';
    panel.appendChild(settingsFields());
    tree = el('div', 'etree');
    redrawTree();
    panel.appendChild(tree);
    var bar = el('div', 'ebar');
    bar.appendChild(button(E.addLink, 'ebtn', function () { add(L.clone(E.newLink)); }));
    bar.appendChild(button(E.addFolder, 'ebtn', function () { add({ name: E.newFolderName, items: [] }); }));
    saveBtn = button(E.save, 'ebtn esave', save);
    saveBtn.disabled = true;
    bar.appendChild(saveBtn);
    status = el('span', 'estatus');
    status.setAttribute('role', 'status');
    bar.appendChild(status);
    panel.appendChild(bar);
  }

  function toggle() {
    if (!editing) {
      var site = R.getSite();
      if (!site) return;
      original = L.clone(site);
      draft = L.clone(site);
      build();
    } else if (changed() && !root.confirm(E.confirmDiscard)) return;
    editing = !editing;
    document.documentElement.dataset.editing = String(editing);
    gear.setAttribute('aria-pressed', String(editing));
    panel.hidden = !editing;
  }

  gear = button(E.gear, 'gear', toggle);
  gear.setAttribute('aria-label', E.gearLabel);
  gear.setAttribute('aria-pressed', 'false');
  panel = el('section', 'editor');
  panel.hidden = true;
  document.body.appendChild(gear);
  document.getElementById('list').after(panel);
})(window);
