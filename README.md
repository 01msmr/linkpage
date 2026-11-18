# linktree

Brutalist link pages with folders, eight designs and online editing. Static HTML, CSS and vanilla JS plus three small PHP scripts (`site.php`, `edit/save.php`, `edit/probe.php`). No build step, no framework.

| Closed | Opened (`/projects/archive/old-notes/?open`) |
|---|---|
| ![closed folders](docs/screenshots/closed.jpg) | ![opened folders](docs/screenshots/opened.jpg) |

## Deploy a domain

Apache 2.4 with PHP; the document root is `<repo>/public`.

1. Set the document root to `<repo>/public`.
2. Copy `public/edit/.htaccess.example` to `public/edit/.htaccess` and set `AuthUserFile` to the absolute path of `public/edit/.htpasswd`.
3. Create the password file: `htpasswd -c public/edit/.htpasswd <user>`.
4. Open `/edit/` once and sign in. `public/edit/` must be writable by PHP.
5. The first request to `/site.php` copies `seeds/default.json` to `edit/site.json`; edits are saved there (previous file: `site.bak.json`).

`site.json`, `site.bak.json`, `.htpasswd` and `.htaccess` in `public/edit/` are never committed.

## Data

`edit/site.json`: `design`, `mode` (`light`/`dark`), `numbers`, `caps` (`regular`/`versalien`), `font`, `layout` (`list`/`split`), `height` (pill height, 30 to 70 px), `intensity` (10 to 100 %) and `items`. A link is `{ name, url, slug }`, a folder `{ name, items: [...] }`, folders nest. Designs: `vertical-heading` (default), `giant-type`, `giant-numerals`, `bracket-terminal`, `headline-tiny-links`, `raw-listing`, `tracked-rows`, `plain-inverted`.

`/<folder>/<folder>/` shows the list with those folders opened; `/<folder>/<link>/` also opens the tree down to the link and marks it (in the split layout it loads the link in the pane). With `?open` (or `?o`) a link path (`/<link>/?open` from anywhere in the tree, or `/<folder>/<link>/?open`) redirects to the link at once; a folder path with `?open` shows the opened list. Real paths such as `/edit/` are left alone. Folder slugs are the names in lower case with `-`, e.g. `tbx.li` becomes `tbx-li`.

## Keyboard

Arrow keys work in the list and in edit mode (not while a field, menu or edit button has focus):

- up / down: move through the visible entries and wrap around at the ends; the first key after using the mouse continues from the entry under the pointer
- right: open a closed folder, or step into an open one; left: close an open folder, or go to the parent folder
- Enter: a link opens in a new tab, a folder opens or closes
- the focused entry shows a 2 px line in the item colour, centred in front of it, 4 px clear of the left rail and of the item (`--focus-*` in `tokens.css`); an open folder shows a light `>` instead, at one x left of the outermost items
- the last input method wins: after an arrow key or Tab the row icons and the mouse-over highlight are hidden and the focus mark shows; moving or pressing the mouse brings the icons and the highlight back and hides the mark; a page starts in mouse mode, so the mark appears only after the first key press
- the address bar follows the focus (`/folder/link/`; a closed folder shows its parent), also on mouse clicks; the history is not touched

## Editing

Open `/edit/` once; the browser then edits inline (`/?edit=0` switches it off). Visitors see no controls. Hover an entry:

- left: drag handle and pen (name and URL); right: `+` adds a link, the pill adds a folder after it; on an open folder's head they add as its first item
- the icons show when the pointer is anywhere on the entry's line except the item itself (left gutter, the stretch after the item, the icon column); they appear after `--icon-delay` (0.2 s) at `--icon-opacity` (0.5), fade in 0.09 s, take no clicks and show no hand cursor until visible; touch devices always show them
- all add icons stand in one column, right of the longest open item, each centred in its own line; items and folders light up on hover at once
- grey dots in the corner change settings (design, mode, numbers, caps, layout, intensity, pill height); a floppy icon appears when something is unsaved and disappears once everything is saved, Cmd/Ctrl+S saves
- in the split layout the divider between list and pane can be dragged (this view only)
- arrow keys navigate here too (see Keyboard)
- the light/dark switch is a view choice of this browser and is not saved

Auto start (`EDIT.autoProbe` in `js/config.js`, off): add the `<Files "probe.php">` block from `.htaccess.example` to the live `.htaccess`, then set it to `true`; browsers that already hold credentials start editing by themselves, everyone else gets a silent 401.

## Project layout

    public/                 document root: index.html (list), go.html (redirect)
      css/tokens.css        every shared value: colors, type, spacing, layout, edit sizes, timings
      css/base.css          page, items, folders, hover/focus (incl. the keyboard focus line), text form, split layout, URL tip
      css/edit.css          settings dots, inline editing, add icons, save icon
      css/designs/          one file per design, only what differs from base
      js/config.js          every settable value: defaults, lists, labels, icons
      js/logic.js           pure logic: settings, open state, paths, keyboard moves, addresses (covered by tests/)
      js/render.js          list, folders and their animation, split pane, URL tip
      js/edit.js            inline editing, settings, save
      js/go.js              redirect page
      edit/, seeds/, icons/ login/save/probe (PHP), dummy content, app icons
    tests/  docs/  tools/   unit tests, specs and plans, dev router
    local/                  git-ignored scratch data

A design is either the pill form (`vertical-heading`, listed in `PILL_DESIGNS`) or the text form (all others); `html[data-form]` selects it and the shared text-form rules live once in `base.css`. Change a value in one place: `tokens.css` first, then `config.js`.

## Commands

    php -S 0.0.0.0:8080 -t public tools/dev-router.php   # local server
    npm test                                              # unit tests (node --test)

Bump the `?v=N` on the CSS and JS links in `index.html` and `go.html` with every change to the file (browsers cache them for an hour).

## Status

Working and checked in the browser: all eight designs, folders with open/close animation, folder and `?open` paths, inline editing (add, rename, move, remove, settings dock, save), icon hover behaviour above, arrow-key navigation with the focus line and the address bar, 50 unit tests. Content is dummy. Pushed to `main` (deploys to l.msmr.co via Plesk Git); the live host was not re-checked after the latest pushes.

Not yet checked: the focus line in the text-form designs and the split layout (its items clip it), the `>` in display mode (only about 4 px beside the rail); edit mode in the split layout, in narrow windows and in the text-form designs; very long (wrapped) entries with the icon column.

## Known limits

- `.htaccess` is verified only locally; check rewrites and saving on the real host.
- No input validation (owner's decision); drag and drop is mouse-only.
- The font list and color variants are still empty.
