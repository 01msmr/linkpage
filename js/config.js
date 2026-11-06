// Every settable value lives here.
(function (root) {
  var DEFAULTS = {
    design: 'giant-type',
    mode: 'light',
    numbers: true,
    caps: 'regular',
    font: 'system',
    delay: 8,
    items: []
  };
  var DESIGNS = ['giant-type', 'giant-numerals', 'vertical-heading', 'bracket-terminal',
    'headline-tiny-links', 'raw-listing', 'tracked-rows', 'plain-inverted'];
  var FONTS = {};
  var RESERVED_SLUGS = ['edit', 'css', 'js', 'seeds', 'tools', 'tests', 'docs', 'site', 'go', 'index'];
  var REDIRECT = {
    tickMs: 1000,
    back: '\u2190 Back',
    countdown: 'Redirect in {n} s to:',
    unknown: 'Unknown link: {slug}'
  };
  var FOLDER = { chevron: '›', closeLabel: 'Close {name}' };
  var EDIT = {
    endpoint: '/edit/save.php',
    gear: '\u2699',
    gearLabel: 'Edit mode',
    handle: '\u2630',
    handleLabel: 'Drag to move',
    save: 'Save',
    saving: 'Saving\u2026',
    saved: 'Saved',
    unsaved: 'Unsaved changes',
    addLink: 'Add link',
    addFolder: 'Add folder',
    remove: 'Delete',
    removeLabel: 'Delete {name}',
    confirmFolder: 'Delete "{name}" and the {n} items inside it?',
    confirmDiscard: 'Discard the unsaved changes?',
    newLink: { name: 'New link', url: '', slug: '' },
    newFolderName: 'New folder',
    dropZone: { before: 0.25, after: 0.75 },
    fields: { design: 'Design', mode: 'Mode', numbers: 'Numbers', caps: 'Caps', delay: 'Delay (s)', font: 'Font' },
    modes: ['light', 'dark'],
    capsValues: ['regular', 'versalien'],
    system: 'system',
    itemFields: { name: 'Name', url: 'URL', slug: 'Slug', delay: 'Delay (s)' },
    errors: {
      401: 'Not signed in. Open /edit/ once, sign in, then save again.',
      400: 'The server rejected the data (400). Your edits are kept.',
      network: 'The server could not be reached. Your edits are kept.',
      other: 'Saving failed (HTTP {status}). Your edits are kept.'
    }
  };
  var api = { EDIT: EDIT, FOLDER: FOLDER, DEFAULTS: DEFAULTS, REDIRECT: REDIRECT, DESIGNS: DESIGNS, FONTS: FONTS,
    RESERVED_SLUGS: RESERVED_SLUGS };
  root.LinkpagesConfig = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
