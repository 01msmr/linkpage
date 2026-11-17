# Linkpages

A static set of brutalist link pages: eight designs, in-place folders (a `›` chevron opens a folder in place), an instant redirect page at `/<slug>/` and online editing. No build step, no framework: HTML, CSS, vanilla JS and two small PHP scripts (`site.php`, `edit/save.php`).

## Deploy a domain

Each domain gets its own copy of this repo; its document root is the `public/` folder (Apache 2.4 assumed, with PHP). Docs, tests and tools sit outside it.

1. Deploy the repo and set the domain's document root to `<repo>/public`.
2. Copy `edit/.htaccess.example` to `edit/.htaccess` and set `AuthUserFile` to the absolute path of `edit/.htpasswd`.
3. Create `edit/.htpasswd` fresh for this domain: `htpasswd -c edit/.htpasswd <user>`.
4. Open `/edit/` once and sign in, so the browser holds the credentials for saving. A 403 afterwards is expected (the folder has no index file).
   `edit/` must be writable by PHP (`site.php` and `save.php` write there).
5. The first request to `/site.php` copies `seeds/default.json` to `edit/site.json`. Edits are saved there; the previous file is kept as `edit/site.bak.json`.

`public/edit/site.json`, `public/edit/site.bak.json`, `public/edit/.htpasswd` and `public/edit/.htaccess` are never committed. Paths in steps 2 to 5 are relative to `public/`.

## The data

Everything lives in `edit/site.json`:

| Field | Values |
|-------|--------|
| `design` | `vertical-heading` (default), `giant-type`, `giant-numerals`, `bracket-terminal`, `headline-tiny-links`, `raw-listing`, `tracked-rows`, `plain-inverted` |
| `mode` | `light` or `dark` |
| `numbers` | `true` or `false` |
| `caps` | `regular` or `versalien` |
| `font` | `system` (the font list is empty for now) |
| `items` | list of links and folders |

A link is `{ "name", "url", "slug" }`. A folder is `{ "name", "items": [...] }` and may nest. The page at `/<slug>/` redirects to the link at once. The seed `seeds/default.json` holds dummy content.

Auto start (off by default, `EDIT.autoProbe` in `js/config.js`): after adding the `<Files "probe.php">` block from `edit/.htaccess.example` to the live `edit/.htaccess`, set it to `true`; a browser that already has cached credentials then starts editing by itself, everyone else gets a silent 401 (without the block visitors would see a login prompt).

Editing is inline and always on in a browser that has opened `/edit/` once (it signs you in and redirects to `/?edit=1`, which sets a flag in that browser; `/?edit=0` clears it). Visitors see no controls. Hover an entry for its small controls: a pen edits the name (and URL for a link), with a red x to delete and a check to finish; a folder also shows a plus before it (a new folder after it) and a plus after it (a new folder inside it); a plus under every list adds a link, and `+›` adds a folder. The ☰ handle drags an entry to another place or into a folder. A Save button appears top right when something changed. A new link's slug is made from its name and stays when you rename it. Small grey dots top left of the corner show their icon on hover and change the settings: design, mode, numbers, caps, layout and pill height (two values switch on click, more open a menu).

**Open an entry in the list:** `/<folder>/<link>/?open` (also `/<link>/?open` or `/<folder>/?open`; folder slugs are the folder names in lower case with `-` for other characters, e.g. `tbx.li` becomes `tbx-li`) shows the list with the tree opened down to that entry and marks it; in the split layout it also loads the link in the pane. Without `?open` the short address redirects as before. Real folders such as `/edit/` are never rewritten.

## Project layout

    public/                 the document root
      index.html, go.html   the list page and the /<slug>/ redirect page
      css/tokens.css        every shared value: colors (light and dark), type, spacing, layout, edit sizes, timings
      css/base.css          page, items, folders, hover and focus looks, text form, split layout, URL tip
      css/edit.css          settings dock, inline editing, add icons, save icon
      css/designs/          one file per design, only what differs from base (see form below)
      js/config.js          every settable value: defaults, option lists, labels, icons
      js/logic.js           pure logic, covered by tests/
      js/render.js          list, folders and their animation, split pane, URL tip
      js/edit.js            inline editing, settings dock, save
      js/go.js              redirect page
      edit/                 login, save and probe (PHP; site.json and the Apache files stay out of git)
      seeds/, icons/        dummy content, app icons (manifest.webmanifest)
    tests/  docs/  tools/   unit tests, specs and plans, the dev router
    local/                  git-ignored scratch data

A design is either the **pill** form (`vertical-heading`: shapes, filled chips) or the **text** form (all others: no shapes). `PILL_DESIGNS` in `js/config.js` lists the pill designs; `html[data-form]` is set from it, and the text form's shared rules live once in `css/base.css`. Durations are set in `css/tokens.css` (`--fade`, `--fold`) and read from there by the scripts. Change a value in one place: tokens first, then config.

## Commands

    php -S 0.0.0.0:8080 -t public tools/dev-router.php   # local server, no-store, maps /<slug>/ to go.html
    npm test                                    # node --test
    npm run check                               # same as npm test

## Cache versions

The CSS and JS links in `index.html` and `go.html` carry `?v=N`. Bump it with every change to the file, or browsers keep the old copy (the `.htaccess` lets css/js cache for one hour).

## Known limits

- `.htaccess` has not been run on Apache yet; verify it on the real host (Apache 2.4 assumed).
- The redirect page without JavaScript shows a static note; there is no meta refresh.
- Drag and drop in edit mode is mouse-only.
- `edit/save.php` refuses unauthenticated requests when the web server passes the user to PHP; some hosts do not, so check on the real host that saving still works.
- There is no input validation (owner's decision).
- The font list is empty; fonts come later.
- Color variants come later.
