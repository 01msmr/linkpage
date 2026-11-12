# Linkpages

A static set of brutalist link pages: eight designs, in-place folders (a `›` chevron opens a folder in place), a countdown redirect page at `/<slug>/` and online editing. No build step, no framework: HTML, CSS, vanilla JS and two small PHP scripts (`site.php`, `edit/save.php`).

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
| `design` | `giant-type` (default), `giant-numerals`, `vertical-heading`, `bracket-terminal`, `headline-tiny-links`, `raw-listing`, `tracked-rows`, `plain-inverted` |
| `mode` | `light` or `dark` |
| `numbers` | `true` or `false` |
| `caps` | `regular` or `versalien` |
| `font` | `system` (the font list is empty for now) |
| `delay` | default redirect delay in seconds; 0 redirects at once |
| `items` | list of links and folders |

A link is `{ "name", "url", "slug", "delay"? }`; the optional `delay` overrides the default for that link. A folder is `{ "name", "items": [...] }` and may nest. The page at `/<slug>/` shows the countdown and redirects to the link. The seed `seeds/default.json` holds dummy content.

Editing is inline and always on in a browser that has opened `/edit/` once (it signs you in and redirects to `/?edit=1`, which sets a flag in that browser; `/?edit=0` clears it). Visitors see no controls. Hover an entry for its small controls: a pen edits the name (and URL for a link), with a red x to delete and a check to finish; a folder also shows a plus before it (a new folder after it) and a plus after it (a new folder inside it); a plus under every list adds a link, and `+›` adds a folder. The ☰ handle drags an entry to another place or into a folder. A Save button appears top right when something changed. A new link's slug is made from its name and stays when you rename it; a link's own `delay` is not editable there (edit `edit/site.json`). The gear (top right) opens the settings: design, mode, caps, numbers and the default delay.

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
