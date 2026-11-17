// Every settable value lives here.
(function (root) {
  var DEFAULTS = {
    design: 'vertical-heading',
    mode: 'light',
    numbers: false,
    caps: 'regular',
    font: 'system',
    layout: 'list',
    height: 46,
    intensity: 100,
    items: []
  };
  var DESIGNS = ['vertical-heading', 'giant-type', 'giant-numerals', 'bracket-terminal',
    'headline-tiny-links', 'raw-listing', 'tracked-rows', 'plain-inverted'];
  var LAYOUTS = ['list', 'split'];
  var INTENSITIES = [];
  for (var i = 10; i <= 100; i += 10) INTENSITIES.push(i);
  var HEIGHTS = [];
  for (var h = 30; h <= 70; h += 4) HEIGHTS.push(h);
  var FONTS = {};
  var REDIRECT = {
    back: '\u2190 Back',
    unknown: 'Unknown link: {slug}'
  };
  var SPLIT = { query: '(min-width: 601px)', queryEmbedded: '(min-width: 450px)', min: 20, max: 80, fitSlack: 0.98, newTabHosts: ['icloud.com'], open: 'Open in new tab \u2197', frameTitle: 'Preview' };
  var TIP = { showMs: 2000, hideMs: 3000, gap: 8 };
  var FOLDER = { foldMs: 200, shape: 'M3 1.6L9.2 5L3 8.4', chevron: '›', closeLabel: 'Close {name}' };
  var EDIT = {
    endpoint: '/edit/save.php',
    probe: '/edit/probe.php',
    autoProbe: false,
    flagKey: 'linkpage-edit',
    modeKey: 'linkpage-mode',
    modes: ['light', 'dark'],
    save: 'Save',
    saveIcon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3h13l3 3v15H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M8 3v6h8V3M7 21v-7h10v7" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    saving: 'Saving\u2026',
    closeDelay: 2000,
    icons: { linkPlus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5v17M3.5 12h17" style="stroke:currentColor" stroke-width="3.6" fill="none"/></svg>', folderPlus: '<svg viewBox="0 0 60 24" aria-hidden="true"><rect x="1.2" y="1.2" width="57.6" height="21.6" rx="10.8" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M30 4v16M22 12h16" stroke="currentColor" stroke-width="3.6" fill="none"/></svg>', pen: '\u270E', plus: '+', remove: '\u00d7', done: '\u2713', handle: '\u2630' },
    labels: {
      pen: 'Edit {name}',
      done: 'Done',
      remove: 'Delete {name}',
      handle: 'Drag to move {name}',
      linkAfter: 'Add a link after {name}',
      folderAfter: 'Add a folder after {name}',
      addLink: 'Add a link',
      addFolder: 'Add a folder'
    },
    confirmFolder: 'Delete "{name}" and the {n} items inside it?',
    leaveWarning: 'You have unsaved changes.',
    newLink: { name: 'New link', url: 'https://' },
    newFolderName: 'New folder',
    dropZone: { before: 0.25, after: 0.75 },
    valueLabels: { true: 'on', false: 'off' },
    controls: [
      { key: 'design', icon: '\u25A7', label: 'Design', values: DESIGNS },
      { key: 'mode', icon: '\u25D0', label: 'Mode', values: ['light', 'dark'] },
      { key: 'numbers', icon: '#', label: 'Numbers', values: [true, false] },
      { key: 'caps', icon: 'Aa', label: 'Caps', values: ['regular', 'versalien'] },
      { key: 'layout', icon: '\u25EB', label: 'Layout', values: LAYOUTS },
      { key: 'intensity', icon: '%', label: 'Intensity (%)', values: INTENSITIES },
      { key: 'height', icon: '\u2195', label: 'Pill height (px)', values: HEIGHTS }
    ].concat(Object.keys(FONTS).length ? [{ key: 'font', icon: 'F', label: 'Font', values: ['system'].concat(Object.keys(FONTS)) }] : []),
    itemFields: { name: 'Name', url: 'URL' },
    errors: {
      401: 'Not signed in. Open /edit/ once, sign in, then save again.',
      400: 'The server rejected the data (400). Your edits are kept.',
      network: 'The server could not be reached. Your edits are kept.',
      other: 'Saving failed (HTTP {status}). Your edits are kept.'
    }
  };
  var api = { EDIT: EDIT, FOLDER: FOLDER, SPLIT: SPLIT, TIP: TIP, DEFAULTS: DEFAULTS, REDIRECT: REDIRECT, DESIGNS: DESIGNS, LAYOUTS: LAYOUTS, HEIGHTS: HEIGHTS, INTENSITIES: INTENSITIES, FONTS: FONTS };
  root.LinkpagesConfig = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
