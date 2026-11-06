# CLAUDE.md — linkpages

Extends `../CLAUDE.md`. Spec: `docs/superpowers/specs/2026-11-06-linkpages-design.md`; plan: `docs/superpowers/plans/2026-11-06-linkpages.md`.

## Rules

- No build step, no framework: static HTML, CSS, vanilla JS and two small PHP scripts (`site.php`, `edit/save.php`).
- Every settable value lives in `js/config.js` or a CSS token, never as a literal in a module.
- Bump `?v=` on the CSS and JS links in the HTML with every change to them.
- Sizes by CSS only (`clamp`, one media query around 600px); no JS measuring.
- One item per line on every device.
- Logic (`js/logic.js`) gets tests first (`npm test`, `node --test`); CSS, layout and designs are checked by hand in the browser.
- No input validation (owner's decision); content is dummy for now. Delay 0 redirects by JS.
- Everything in English; code comments one line.
- No secrets in git: `edit/site.json`, `edit/.htpasswd`, `edit/.htaccess` are ignored; only `.example` variants are committed.
- Never push without the owner's say-so.

## Running

`php -S 0.0.0.0:8080 tools/dev-router.php`, then open `http://127.0.0.1:8080/`. `npm run check` runs the tests (run before any push). Deployment and data: `README.md`.
