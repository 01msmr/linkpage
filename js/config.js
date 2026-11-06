// Every settable value lives here; CSS tokens mirror the breakpoint.
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
  var SYSTEM_FONT_STACK = '"Helvetica Neue", Helvetica, Arial, sans-serif';
  var RESERVED_SLUGS = ['edit', 'css', 'js', 'seeds', 'tools', 'tests', 'docs', 'site', 'go', 'index'];
  var BREAKPOINT_NOTE = '600px (documented value; the media query lives in css/base.css)';
  var api = { DEFAULTS: DEFAULTS, DESIGNS: DESIGNS, FONTS: FONTS, SYSTEM_FONT_STACK: SYSTEM_FONT_STACK,
    RESERVED_SLUGS: RESERVED_SLUGS, BREAKPOINT_NOTE: BREAKPOINT_NOTE };
  root.LinkpagesConfig = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
