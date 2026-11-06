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
  var FOLDER = { closed: '>', open: 'v', closer: '^', closeLabel: 'Close {name}' };
  var api = { FOLDER: FOLDER, DEFAULTS: DEFAULTS, REDIRECT: REDIRECT, DESIGNS: DESIGNS, FONTS: FONTS,
    RESERVED_SLUGS: RESERVED_SLUGS };
  root.LinkpagesConfig = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
