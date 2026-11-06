# Linkpages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Linkpages site: a static page set with eight brutalist designs, in-place folders, a countdown redirect page, and online editing, deployable once per domain from this repo.

**Architecture:** Static HTML, CSS and classic vanilla-JS scripts, plus two small PHP scripts (`site.php` serves the deployment's data, `edit/save.php` validates and writes it). One pure-logic file (`js/logic.js`) holds everything testable; the rest is DOM and CSS checked by hand. Each domain is its own docroot with its own `edit/site.json` and `.htpasswd`.

**Tech Stack:** HTML, CSS custom properties, vanilla JS, PHP, Apache `.htaccess`, `node --test` (logic tests), `php` CLI (validation test).

**Spec:** `docs/superpowers/specs/2026-11-06-linkpages-design.md`

## Global Constraints

- No build step, no framework: static HTML, CSS, vanilla JS and two small PHP scripts.
- Every settable value lives in `js/config.js` or a CSS token, never as a literal in a module.
- Chips and highlights: radius 6px, about 4px vertical padding, horizontal padding smaller than the original's 40px, no border or outline.
- Folder pill: closed = radius 50% of height on all corners; open = top corners 50% of height, bottom corners square; items drop out 1px apart; links radius 0; a mirrored, textless closer with only `^` ends the stack.
- One item per line on every device; phone breakpoint around 600px; sizes by CSS only (`clamp`, one media query), no JS measuring.
- Defaults: design `giant-type`, mode `light`, numbers `true`, caps `regular`, font system Helvetica stack, delay 8 s.
- Slugs: lowercase letters, digits, hyphens; unique across the whole site; reserved: `edit`, `site`, `seeds`, `css`, `js`, `fonts`, `assets`, `favicon`.
- Target URLs start with `http://` or `https://` only. Delay 0 redirects by JS (no HTTP 301/302).
- Cache-bust `?v=` on CSS and JS links in the HTML with every change to them.
- Everything in English; code comments one line; no secrets in git (`.htpasswd` and `edit/site.json` are ignored, only `.example` variants committed).
- Never push without the owner's say-so (the owner said "and push" for the spec and plan only).
- Logic gets tests first; CSS, layout and designs are checked by hand in the browser.

## Review Focus

- A link with `delay: 0` must redirect at once, not fall back to the site's 8 s (0 is falsy). Pinned in Task 2.
- A target such as `javascript:alert(1)` must be rejected by both the JS and the PHP validation. Pinned in Tasks 3 and 4.
- `/slug`, `/slug/` and `/slug/index.html` all resolve to the same redirect page. Pinned in Task 4.
- A missing, empty or corrupt `edit/site.json` shows a readable error page (never blank) and `save.php` writes atomically so a failed save cannot corrupt it. Pinned in Tasks 4 and 5.
- Very long names, an unknown `font` key and duplicate slugs must not break the layout or the editor. Pinned in Tasks 2, 3 and 8.

## File Structure

- `index.html`: the list page shell. `go.html`: the redirect page shell.
- `js/config.js`: `DEFAULTS`, `DESIGNS`, `FONTS`, `RESERVED_SLUGS`, `BREAKPOINT_NOTE` (documented value, used in CSS).
- `js/logic.js`: pure functions (no DOM); exported for node via a `module.exports` guard.
- `js/render.js`: builds the list and folder stacks, applies settings as data attributes on `<html>`.
- `js/go.js`: redirect page countdown. `js/edit.js`: gear, settings form, tree editor, save.
- `css/tokens.css`: light and dark token sets, radius and gap tokens. `css/base.css`: shared layout, chips, folder pills. `css/designs/<id>.css`: one per design.
- `site.php`, `edit/save.php`, `lib/validate.php`, `.htaccess`, `edit/.htaccess.example`.
- `seeds/default.json`, `seeds/l.msmr.co.json`, `seeds/tbx.li.json`.
- `tests/logic.test.js`, `tests/validate.test.php`, `tools/dev-router.php`, `README.md`, `CLAUDE.md`, `.gitignore`.

---

### Task 1: Scaffold, config, test runner

**Files:**
- Create: `js/config.js`, `.gitignore`, `package.json`, `CLAUDE.md`, `README.md`, `tools/dev-router.php`

**Interfaces:**
- Produces: global `LinkpagesConfig` with `DEFAULTS` (the table in Global Constraints plus `items: []`), `DESIGNS` (array of the eight ids: `giant-type`, `giant-numerals`, `vertical-heading`, `bracket-terminal`, `headline-tiny-links`, `raw-listing`, `tracked-rows`, `plain-inverted`), `FONTS` (empty object), `RESERVED_SLUGS`.

- [ ] **Step 1: Ask the owner before adding a test setup**, naming `node --test` (as a.msmr.co uses). Proceed only on a yes; otherwise stop and report.
- [ ] **Step 2: Create `.gitignore`** ignoring `edit/site.json`, `edit/site.bak.json`, `edit/.htpasswd`, `edit/.htaccess`, `node_modules/`.
- [ ] **Step 3: Create `package.json`** with scripts `test` (`node --test tests/`) and `check` (`npm test && php tests/validate.test.php`).
- [ ] **Step 4: Implement `js/config.js`** with the interface above, guarded `module.exports` for node.
- [ ] **Step 5: Create `tools/dev-router.php`** serving everything `no-store` and rewriting `/<slug>/` to `go.html` like the production `.htaccess`; run with `php -S 0.0.0.0:8080 tools/dev-router.php`.
- [ ] **Step 6: Create `CLAUDE.md`** (extends `../CLAUDE.md`, rules from Global Constraints) and `README.md` (what it is, how to run, how a domain is deployed: own docroot, `.htpasswd` created fresh, first request copies the seed).
- [ ] **Step 7: Commit** `chore: scaffold, config, dev router`.

### Task 2: Pure logic

**Files:**
- Create: `js/logic.js`, `tests/logic.test.js`

**Interfaces:**
- Consumes: `LinkpagesConfig`.
- Produces: `resolveSettings(raw: object): Settings`, `delayFor(link: Link, settings: Settings): number`, `findLink(items: Item[], slug: string): Link | null` (searches nested folders, ignores folders), `sortItems(items: Item[]): Item[]` (folders first, stable), `numberLabel(index: number): string` (0-based, zero-padded to 2 digits, `99` → `100`), `toggleOpen(open: string[], path: string): string[]` (paths like `0.2`; closing removes the path and every path starting with `path + "."`), `isOpen(open: string[], path: string): boolean`.

- [ ] **Step 1: Write failing tests** in `tests/logic.test.js`: `resolveSettings({})` equals the defaults; `resolveSettings({mode:'dark',delay:0}).delay === 0`; unknown `design` falls back to `giant-type`; unknown `font` becomes `''`; `delayFor({delay:0},{delay:8}) === 0`; `delayFor({},{delay:8}) === 8`; `findLink` finds a link nested two folders deep and returns `null` for a folder's name; `sortItems` puts folders first and keeps order inside each group; `numberLabel(0) === '01'`, `numberLabel(98) === '99'`, `numberLabel(99) === '100'`; `toggleOpen` opening `"0"` then `"0.1"` then closing `"0"` leaves `[]`; opening `"1"` after that leaves `["1"]`.
- [ ] **Step 2: Run** `npm test`; expect FAIL (functions not defined).
- [ ] **Step 3: Implement** the six functions in `js/logic.js` with the `module.exports` guard; use `Number.isInteger` and `??`-style checks so `0` is kept.
- [ ] **Step 4: Run** `npm test`; expect PASS.
- [ ] **Step 5: Commit** `feat: settings, delay, search, ordering, open state`.

### Task 3: Site validation (JS)

**Files:**
- Modify: `js/logic.js`, `tests/logic.test.js`

**Interfaces:**
- Produces: `validateSite(site: object): string[]` returning error codes: `slug-invalid:<slug>`, `slug-duplicate:<slug>`, `slug-reserved:<slug>`, `url-invalid:<slug>`, `delay-invalid:<where>`, `name-empty:<path>`, `setting-invalid:<key>`; `[]` when valid.

- [ ] **Step 1: Write failing tests**: valid nested site returns `[]`; duplicate slug in different folders gives `slug-duplicate`; `edit` gives `slug-reserved`; `Bad Slug` gives `slug-invalid`; url `javascript:alert(1)`, `data:text/html,x` and `ftp://x` each give `url-invalid`; `https://x` and `http://x` pass; delay `-1`, `1.5`, `"8"` give `delay-invalid`; delay `0` passes; empty folder name gives `name-empty`; `mode: 'blue'` gives `setting-invalid:mode`; an empty folder (`items: []`) is valid.
- [ ] **Step 2: Run** `npm test`; expect the new tests FAIL.
- [ ] **Step 3: Implement `validateSite`** walking the tree once, collecting slugs into a set.
- [ ] **Step 4: Run** `npm test`; expect PASS.
- [ ] **Step 5: Commit** `feat: site validation`.

### Task 4: Server side: data, save, rewrites, seeds

**Files:**
- Create: `lib/validate.php`, `site.php`, `edit/save.php`, `.htaccess`, `edit/.htaccess.example`, `seeds/default.json`, `seeds/l.msmr.co.json`, `seeds/tbx.li.json`, `tests/validate.test.php`

**Interfaces:**
- Consumes: the error-code list from Task 3 (same codes).
- Produces: `validate_site(array $site): array` in `lib/validate.php` (same rules and codes as `validateSite`); `GET /site.php` returns the site JSON (`Content-Type: application/json`, `Cache-Control: no-cache`); `POST /edit/save.php` with a JSON body returns `200 OK`, `400` with the error codes as a JSON array, `405` for other methods.

- [ ] **Step 1: Write `tests/validate.test.php`** mirroring Task 3's cases (valid site, duplicate, reserved, invalid slug, `javascript:` and `data:` URLs, delays, empty name) and printing `OK` only if all assertions hold.
- [ ] **Step 2: Run** `php tests/validate.test.php`; expect FAIL (function missing).
- [ ] **Step 3: Implement `validate_site`** in `lib/validate.php`.
- [ ] **Step 4: Run** `php tests/validate.test.php`; expect `OK`.
- [ ] **Step 5: Implement `site.php`**: if `edit/site.json` is missing, copy `seeds/<HTTP_HOST>.json` if it exists, else `seeds/default.json`; output the file; on an unreadable or invalid JSON file respond `500` with a JSON `{"error": "..."}` (the pages show it, never blank).
- [ ] **Step 6: Implement `edit/save.php`**: POST only, JSON decode, `validate_site`, copy the old file to `edit/site.bak.json`, write to a temp file in `edit/` and `rename` it over `site.json` (atomic).
- [ ] **Step 7: Write `.htaccess`**: hide `docs`, `tests`, `tools`, `seeds`, `lib`, `*.md`, `package*.json`, `.git*`; rewrite `^([a-z0-9-]+)/?$`, `^([a-z0-9-]+)/index\.html$` to `go.html` (so `/slug`, `/slug/`, `/slug/index.html` all work) unless the path is a real file or folder; caching as in a.msmr.co (`html` no-cache, css/js 1 h). Write `edit/.htaccess.example` with the basic-auth block and the `AuthUserFile` placeholder.
- [ ] **Step 8: Write the seeds**: `default.json` (defaults, empty `items`), `l.msmr.co.json` and `tbx.li.json` with the slugs and names from the spec. Fetch each link's target from the live redirect pages (`curl https://l.msmr.co/<slug>/` and the same for `tbx.li`, reading the `<meta http-equiv="refresh">` url); if a fetch fails, stop and ask the owner for that URL.
- [ ] **Step 9: Verify by hand** with the dev router: `curl -s localhost:8080/site.php` returns the default; POST a valid body returns `OK`; POST `{"items":[{"name":"x","slug":"a","url":"javascript:alert(1)"}]}` returns `400` with `url-invalid:a`.
- [ ] **Step 10: Commit** `feat: site.php, save.php, rewrites, seeds`.

### Task 5: Tokens, base layout, flat list, first design

**Files:**
- Create: `index.html`, `css/tokens.css`, `css/base.css`, `css/designs/giant-type.css`, `js/render.js`

**Interfaces:**
- Consumes: `resolveSettings`, `sortItems`, `numberLabel` from `js/logic.js`; `GET /site.php`.
- Produces: `render(site: Settings): void` in `js/render.js` which sets `data-design`, `data-mode`, `data-caps`, `data-numbers`, `data-font` on `<html>` and fills `<main id="list">`; tokens `--bg --fg --chip --chip-fg --hover --hover-fg --radius-chip --gap-item` (light and dark sets, black and white, hover `#00f`).

- [ ] **Step 1: Write `css/tokens.css`**: `:root` light set, `:root[data-mode="dark"]` dark set, `--radius-chip: 6px`, `--gap-item: 1px`; no colors outside this file.
- [ ] **Step 2: Write `css/base.css`**: body from tokens, one item per line, chips with 4px vertical padding, phone breakpoint (about 600px) where chips fill the width and larger screens where chips fit their text, `data-caps="versalien"` as `text-transform: uppercase`, `overflow-wrap: anywhere` on item text.
- [ ] **Step 3: Write `js/render.js`** (`render`) and `index.html` loading config, logic, render with `?v=1`; on a `site.php` error render the error text in the page.
- [ ] **Step 4: Write `css/designs/giant-type.css`** per the spec (huge uppercase lines, tight line height, hover inverts).
- [ ] **Step 5: Verify by hand** at 390 and 1280 px, light and dark, numbers on and off, caps both: one item per line, no horizontal scroll with a 60-character name, a corrupt `site.json` shows the error text. Report what was checked.
- [ ] **Step 6: Commit** `feat: base layout and giant-type design`.

### Task 6: Redirect page

**Files:**
- Create: `go.html`, `js/go.js`

**Interfaces:**
- Consumes: `findLink`, `delayFor`, `resolveSettings`.
- Produces: `/go.html` reads the slug from the path; shows a back link to `/`, the heading, "Redirect in N s to:" and the target as a link; counts down each second; at 0 calls `location.replace(target)`; delay 0 redirects at once without painting the page; `<noscript>` meta refresh uses the link's delay; unknown slug shows a plain error naming the slug.

- [ ] **Step 1: Implement `js/go.js`**; the countdown text updates every second.
- [ ] **Step 2: Verify by hand**: a link with delay 3 counts 3, 2, 1 then redirects; `delay: 0` redirects immediately; `/nope/` shows the error page; `/slug`, `/slug/`, `/slug/index.html` all show the page; with JS off the page still redirects after the delay.
- [ ] **Step 3: Commit** `feat: redirect page with countdown`.

### Task 7: Folders

**Files:**
- Modify: `js/render.js`, `css/base.css`

**Interfaces:**
- Consumes: `toggleOpen`, `isOpen`, `sortItems`, `numberLabel`.
- Produces: folder pills (closed: radius 50% of height all corners, `>`); open: top corners 50%, bottom square, chevron `v`, items below with `--gap-item`, links radius 0, sub-folders as nested pills, a textless mirrored closer (bottom corners 50%, top square, `^`); clicking the top pill or the closer closes that level and everything inside; numbering restarts at 01 per list; text designs get `>`, `v` and a `^` line instead of shapes; open state is kept in a JS array only.

- [ ] **Step 1: Implement the folder rendering** in `render.js` using the open-path array and the Task 2 functions; the radius is `calc(var(--item-height) / 2)` with one `--item-height` token in `tokens.css`.
- [ ] **Step 2: Verify by hand** with a seed tree of three levels: opening and closing each level, the closer closes its own level only, closing a parent collapses children and reopening shows them closed, empty folder opens to just the closer, a reload closes everything, keyboard: folder pills are buttons reachable by Tab and Enter.
- [ ] **Step 3: Commit** `feat: in-place folders with closer`.

### Task 8: Remaining seven designs

**Files:**
- Create: `css/designs/giant-numerals.css`, `vertical-heading.css`, `bracket-terminal.css`, `headline-tiny-links.css`, `raw-listing.css`, `tracked-rows.css`, `plain-inverted.css`
- Modify: `index.html` (design stylesheet chosen by `data-design`; load all, scope each by `[data-design="…"]`)

**Interfaces:**
- Consumes: tokens from Task 5 only; no literal colors.

- [ ] **Step 1: Write the four designs from the first picks** per the spec text (`giant-numerals`, `vertical-heading`, `bracket-terminal`, plus `giant-type` already done); with `numbers` off the numerals vanish and names keep their size; brackets then hold only the name.
- [ ] **Step 2: Write `headline-tiny-links`, `raw-listing`, `plain-inverted`.**
- [ ] **Step 3: Write `tracked-rows`**: wide letter-spaced rows running past the edge; on hover the row text scrolls sideways (CSS animation); still at rest; no animation under `prefers-reduced-motion`.
- [ ] **Step 4: Verify by hand** each design at 390 and 1280 px, light and dark, numbers on and off, caps both, with a closed and an open folder and a 60-character name; the text-only designs show `>`, `v` and `^` lines. Report each design's result.
- [ ] **Step 5: Commit** `feat: the other seven designs`.

### Task 9: Edit mode

**Files:**
- Create: `js/edit.js`
- Modify: `index.html`, `css/base.css`

**Interfaces:**
- Consumes: `validateSite`, `resolveSettings`, `LinkpagesConfig.DESIGNS`, `LinkpagesConfig.FONTS`; `POST /edit/save.php`.
- Produces: a gear control opening edit mode: fields for `design`, `mode`, `numbers`, `caps`, `delay`, `font` (hidden while `FONTS` is empty); a tree editor to add, delete, rename, reorder (drag) and move items into and out of folders; a link's `name`, `url`, `slug`, optional `delay`; change detection with a save button enabled only on changes; deleting a folder with children asks first; validation errors from `validateSite` shown beside the offending item; a failed save (400 or 401) shows the server's message and keeps the edits; a 401 says to open `/edit/` once and sign in.

- [ ] **Step 1: Read a.msmr.co's `js/edit.js` for drag and change-detection ideas**; copy only what editing items and settings needs.
- [ ] **Step 2: Implement `js/edit.js`** to the interface above.
- [ ] **Step 3: Verify by hand** with the dev router and a temporary basic-auth-free `edit/`: change every setting and see it apply after save; add a folder, move a link in, delete the folder (asks); enter `javascript:x` as a URL (blocked with a message); duplicate a slug (blocked); an unknown `font` key (from a hand-edited file) loads with the system font.
- [ ] **Step 4: Commit** `feat: online edit mode`.

### Task 10: Docs and deployment notes

**Files:**
- Modify: `README.md`, `CLAUDE.md`

- [ ] **Step 1: Document per deployment**: create the docroot, deploy the repo, copy `edit/.htaccess.example` to `edit/.htaccess` and create `edit/.htpasswd` (fresh), open `/edit/` once to sign in, first request copies the seed.
- [ ] **Step 2: Document commands** (`php -S …`, `npm test`, `npm run check`) and the `?v=` rule.
- [ ] **Step 3: Run** `npm run check`; expect all tests pass and `OK`.
- [ ] **Step 4: Commit** `docs: deployment and commands`.

## Self-review notes

- Spec coverage: pages (Tasks 5, 6), settings and defaults (Tasks 1, 2, 5), colors as tokens (Task 5), eight designs (Tasks 5, 8), hierarchy and closer (Task 7), editing and server (Tasks 4, 9), validation and security (Tasks 3, 4), constraints and docs (Tasks 1, 10).
- Left to the builder stays with the builder: breakpoint value near 600px, exact sizes, hover timing, one stylesheet per design scoped by `data-design`.
