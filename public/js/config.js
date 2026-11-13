// Every settable value lives here.
(function (root) {
  var DEFAULTS = {
    design: 'giant-type',
    mode: 'light',
    numbers: true,
    caps: 'regular',
    font: 'system',
    delay: 8,
    layout: 'list',
    height: 0,
    split: 55,
    items: []
  };
  var DESIGNS = ['giant-type', 'giant-numerals', 'vertical-heading', 'bracket-terminal',
    'headline-tiny-links', 'raw-listing', 'tracked-rows', 'plain-inverted'];
  var LAYOUTS = ['list', 'split'];
  var HEIGHTS = [];
  for (var h = 48; h <= 104; h += 4) HEIGHTS.push(h);
  var FONTS = {};
  var REDIRECT = {
    tickMs: 1000,
    back: '\u2190 Back',
    countdown: 'Redirect in {n} s to:',
    unknown: 'Unknown link: {slug}'
  };
  var SPLIT = { query: '(min-width: 601px)', min: 20, max: 80, fitSlack: 0.98, newTabHosts: ['icloud.com'], open: 'Open in new tab \u2197', frameTitle: 'Preview' };
  var FOLDER = { chevron: '›', closeLabel: 'Close {name}' };
  var EDIT = {
    endpoint: '/edit/save.php',
    flagKey: 'linkpage-edit',
    save: 'Save',
    saving: 'Saving\u2026',
    closeDelay: 3000,
    unsaved: 'Unsaved changes',
    icons: { pen: '\u270E', plus: '+', remove: '\u00d7', done: '\u2713', handle: '\u2630' },
    labels: {
      pen: 'Edit {name}',
      done: 'Done',
      remove: 'Delete {name}',
      handle: 'Drag to move {name}',
      linkAfter: 'Add a link after {name}',
      folderAfter: 'Add a folder after {name}',
      folderInside: 'Add a folder inside {name}',
      addLink: 'Add a link',
      addFolder: 'Add a folder'
    },
    confirmFolder: 'Delete "{name}" and the {n} items inside it?',
    leaveWarning: 'You have unsaved changes.',
    newLink: { name: 'New link', url: 'https://' },
    newFolderName: 'New folder',
    dropZone: { before: 0.25, after: 0.75 },
    valueLabels: { true: 'on', false: 'off', 0: 'auto' },
    controls: [
      { key: 'design', icon: '\u25A7', label: 'Design', values: DESIGNS },
      { key: 'mode', icon: '\u25D0', label: 'Mode', values: ['light', 'dark'] },
      { key: 'numbers', icon: '#', label: 'Numbers', values: [true, false] },
      { key: 'caps', icon: 'Aa', label: 'Caps', values: ['regular', 'versalien'] },
      { key: 'layout', icon: '\u25EB', label: 'Layout', values: LAYOUTS },
      { key: 'height', icon: '\u2195', label: 'Pill height (px)', values: [0].concat(HEIGHTS) }
    ].concat(Object.keys(FONTS).length ? [{ key: 'font', icon: 'F', label: 'Font', values: ['system'].concat(Object.keys(FONTS)) }] : []),
    itemFields: { name: 'Name', url: 'URL' },
    errors: {
      401: 'Not signed in. Open /edit/ once, sign in, then save again.',
      400: 'The server rejected the data (400). Your edits are kept.',
      network: 'The server could not be reached. Your edits are kept.',
      other: 'Saving failed (HTTP {status}). Your edits are kept.'
    }
  };
  var api = { EDIT: EDIT, FOLDER: FOLDER, SPLIT: SPLIT, DEFAULTS: DEFAULTS, REDIRECT: REDIRECT, DESIGNS: DESIGNS, LAYOUTS: LAYOUTS, HEIGHTS: HEIGHTS, FONTS: FONTS };
  root.LinkpagesConfig = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
