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
    flagKey: 'linkpage-edit',
    gearLabel: 'Edit mode',
    save: 'Save',
    saving: 'Saving\u2026',
    closeDelay: 5000,
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
    fields: { design: 'Design', mode: 'Mode', numbers: 'Numbers', caps: 'Caps', delay: 'Delay (s)', font: 'Font' },
    modes: ['light', 'dark'],
    capsValues: ['regular', 'versalien'],
    system: 'system',
    itemFields: { name: 'Name', url: 'URL' },
    errors: {
      401: 'Not signed in. Open /edit/ once, sign in, then save again.',
      400: 'The server rejected the data (400). Your edits are kept.',
      network: 'The server could not be reached. Your edits are kept.',
      other: 'Saving failed (HTTP {status}). Your edits are kept.'
    }
  };
  var api = { EDIT: EDIT, FOLDER: FOLDER, DEFAULTS: DEFAULTS, REDIRECT: REDIRECT, DESIGNS: DESIGNS, FONTS: FONTS };
  root.LinkpagesConfig = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
