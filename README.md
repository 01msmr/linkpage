# Linkpages

A static set of brutalist link pages: eight designs, in-place folders (a `›` chevron opens a folder in place), a countdown redirect page at `/<slug>/` and online editing. No build step, no framework: HTML, CSS, vanilla JS and two small PHP scripts (`site.php`, `edit/save.php`).

## Deploy a domain

Each domain gets its own docroot with its own copy of this repo (Apache 2.4 assumed, with PHP).

1. Create the docroot and deploy the repo into it.
2. Copy `edit/.htaccess.example` to `edit/.htaccess` and set `AuthUserFile` to the absolute path of `edit/.htpasswd`.
3. Create `edit/.htpasswd` fresh for this domain: `htpasswd -c edit/.htpasswd <user>`.
4. Open `/edit/` once and sign in, so the browser holds the credentials for saving. A 403 afterwards is expected (the folder has no index file).
   `edit/` must be writable by PHP (`site.php` and `save.php` write there).
5. The first request to `/site.php` copies `seeds/default.json` to `edit/site.json`. Edits are saved there; the previous file is kept as `edit/site.bak.json`.

`edit/site.json`, `edit/site.bak.json`, `edit/.htpasswd` and `edit/.htaccess` are never committed.

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

To switch design, mode, caps or numbers: open the page, click the gear to enter edit mode, change the field and press Save. Or edit `edit/site.json` by hand. Defaults are in `js/config.js`; colors are tokens in `css/tokens.css`.

## Commands

    php -S 0.0.0.0:8080 tools/dev-router.php   # local server, no-store, maps /<slug>/ to go.html
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
