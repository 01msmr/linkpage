# Linkpages: design

One small codebase for several short redirect domains (today `l.msmr.co` and `tbx.li`), each a standalone deployment of the same repo. Each domain shows an index of links; each link opens a page that counts down and forwards. It replaces two hand-written copies of the same template.

## Intent

The owner keeps short domains that forward to other things (shortcuts, tools, stores). Today each domain is a copy of one hand-written template: an index, one folder per link, the wait hardcoded to 8 seconds in a `<meta>` tag, a countdown label that never counts down. He wants the same simple pages from one codebase, with the wait time as a setting, with brutalist design options, and editable online without an admin tool. The content stays bare: the domain, a list of names, a countdown.

## Goals

- One codebase, many standalone domains. Each domain is its own deployment of the same repo, with its own docroot, data and sign-in. Nothing is shared between domains or with a.msmr.co.
- Per site and editable online: design, light or dark mode, leading numbers on or off, regular or Versalien (all caps), font, wait time before following, and the link list.
- Eight brutalist designs, each in light and dark.
- Colors are tokens, so color variants can be added later and mixed into every design.
- One link per line on every device. The layout adapts to the device: phones differ from desktop, and desktop type is bigger.
- Reuse a.msmr.co's PHP edit and save setup (basic auth, backup, in-page edit mode).
- Folders: pills that open in place and drop their items out beneath (see Hierarchy).

## Non-goals

- No admin tool, accounts, analytics, or click counting.
- No dead-link checker, icons, sections, or themes beyond the eight designs.
- No build step and no framework: static HTML, CSS, vanilla JS and two small PHP scripts, like a.msmr.co.
- No color variants yet. The owner creates those later.
- No font list yet. The owner decides the fonts later.

## Anti-goals

- A page that looks designed or friendly. It must look raw and blunt.
- Hardcoded values: the wait, colors, and fonts live in config and tokens, never as literals in modules (the project's configuration rule).
- Any chip or highlight with a border or outline.

## The pages

**Index** (`/`): the domain as the heading, then one entry per item (folders first, see Hierarchy). A link entry opens its redirect page; a folder entry opens in place.

**Redirect page** (`/<slug>/`, so the existing URLs keep working): a back link to the index, the heading, then "Redirect in N s to:" followed by the target. A visible countdown counts down. When it reaches 0 the browser goes to the target (`location.replace`). A `<noscript>` meta refresh with the same delay is the fallback. A delay of 0 redirects immediately without showing the page. The target address is shown and is also a link.

An unknown slug shows a plain error page naming what was not found, never a blank page.

## Settings

Stored per deployment in that deployment's own server-side data file (`edit/site.json`), one site per file.

| Key | Values | Default |
|---|---|---|
| `design` | one of the eight design ids below | `giant-type` (builder's call: the first listed) |
| `mode` | `light`, `dark` | `light` |
| `numbers` | `true`, `false` | `true` |
| `caps` | `regular`, `versalien` | `regular` |
| `font` | a key into the font list (empty for now) | system Helvetica stack |
| `delay` | seconds, integer ≥ 0 | 8 |
| `items[]` | links and folders, see Hierarchy | none |

A link's own `delay` overrides the site's. A link without one uses the site's.

Versalien is an all-caps rendering (CSS `text-transform: uppercase`). The stored names are unchanged.

## Colors

Colors are CSS custom properties: background, text, chip, chip text, hover, hover text. Light and dark are two token sets. Each design reads only these tokens and contains no literal colors. The default token sets are black and white with a blue hover (`#00f`). The owner adds color variants later, which must work with all eight designs without touching them.

## Designs

All use the same bare content. Sizes come from CSS only (`clamp`, one media query for phones, around 600px): no JS measuring. Any chip or highlight keeps the 6px radius and about 4px vertical padding of the original, with smaller horizontal padding than the original's 40px, and has no border or outline. On phones a chip fills the width; on larger screens a chip is as wide as its text. One link per line everywhere.

From the owner's first picks:

1. `giant-type`: uppercase links set huge with tight line height; hover inverts the line.
2. `giant-numerals`: a huge 1, 2, 3 beside each small name.
3. `vertical-heading`: the domain runs sideways along the left edge as a black block; the links sit beside it as chips.
4. `bracket-terminal`: monospace caps, each link as `[ NAME ]`; hover shows `[ → NAME ]` inverted.

From the Awwwards-inspired picks:

5. `headline-tiny-links`: one huge tight headline, with the links tiny beneath it.
6. `raw-listing`: monospace text listing like a raw directory; the hovered row is inverted.
7. `tracked-rows`: wide letter-spaced rows that run past the edge; on hover the row's text scrolls sideways like a marquee. At rest the row is still. With `prefers-reduced-motion` it does not scroll.
8. `plain-inverted`: plain big text, one entry per line, the hovered one inverted.

Leading numbers (`numbers`): with it on, entries are prefixed `01`, `02`, … in every design; with it off no number is shown. This includes `giant-numerals`, whose numerals vanish when off (the names stay at their large size), and `bracket-terminal`, whose brackets then hold only the name (builder's call: with numbers on the brackets hold `01 NAME`).

## Hierarchy

- A site is a tree. An item is a link (`name`, `url`, `slug`, optional `delay`) or a folder (`name`, `items[]`). Folders nest to any depth. An empty folder is allowed.
- Folders open in place: there are no folder pages, no breadcrumb and no nested URLs. Every link's redirect page stays `/<slug>/`, so slugs are unique across the whole site.
- Closed folder, chip designs: a fully rounded pill (radius 50% of the item's height on all corners) with a `>` at the right edge.
- Open folder, chip designs: a click opens it. The pill keeps its top corners rounded (50% of the height) and its bottom corners go square; the chevron turns to `v`. Its items drop out directly beneath, one per line, 1px apart: links as sharp rectangles (radius 0), sub-folders as their own pills that open the same way.
- Closer: at the bottom of the open stack sits a mirror of the folder pill (the same name, bottom corners rounded 50% of the height, top corners square, a `^` at the right edge). A click on it, or on the top pill, closes the stack.
- Text-only designs (raw listing, bracket terminal, tracked rows and the like): no shapes. A closed folder reads `ARCHIVE >`; open it reads `ARCHIVE v`, its items follow, and the closer reads `ARCHIVE ^`. The top line and the closer are both clickable.
- Order: folders are listed before links; within each group the stored order applies.
- Numbers (when on): each list is numbered from 01 on its own, the root list and every open folder's items separately; folders and links form one sequence in that list.
- Open or closed state lives in the page only; a reload closes everything. Folders have no URL.
- Seed data is flat for now.

## Editing

Reused from a.msmr.co:

- A public script (`site.php`) serves the deployment's settings and links.
- `edit/` is behind basic auth. `edit/save.php` writes the data file and first copies the previous version to a backup. The data file is not in git. Seed files in the repo (`seeds/<hostname>.json`, plus a neutral default) hold the two existing sites; the first request copies the one matching the hostname, else the default. After that the deployment's own data file is the only source.
- One-time sign-in per browser by opening `/edit/` once, as on a.msmr.co.
- An edit mode in the page behind a gear: change the settings above, and add, delete, rename and reorder links and folders (drag to sort, drag into or out of a folder; deleting a folder with children asks first), with change detection before saving. It is adapted from a.msmr.co's `js/edit.js`; copy only what editing links and settings needs.

Seed content: `l.msmr.co` has two links (slugs `spiegeltextkorrektur`, `metakorrektur`, names "SPIEGEL Textkorrektur" and "Meta-Textkorrektur"); `tbx.li` has four (slugs `web`, `orderbox`, `strichliste`, `gamedev`, names "ToolBox Bodensee", "Orderbox", "strichliste", "gamedev"). Only one target is known to this document (`spiegeltextkorrektur` → an iCloud shortcut `https://www.icloud.com/shortcuts/0dc326c8fc6647bda8bee1b015681bcf`); the builder reads the others from the live pages' redirect folders.

## Constraints

- Each domain is a separate docroot (its own vhost) on PHP hosting that reads `.htaccess`; the owner deploys the same repo to each. The builder confirms the server honors rewrites. Nothing is shared with a.msmr.co.
- Cache-bust `?v=` on CSS and JS in the HTML. The server pulls the repo, so a push deploys; never push without the owner's say-so.
- Never commit secrets or `.htpasswd`; commit only `.example` variants.
- Everything in English: code, identifiers, comments, UI text, commit messages. Code comments one line.
- Logic (settings defaults and validation, delay resolution, slug lookup) gets tests first. The project has no test setup yet: ask the owner before adding one (a.msmr.co uses `node --test` with jsdom). CSS, layout and designs are checked by hand in the browser.

## Left to the builder

- Folder and repo name (assumed a new folder under `github projects/`, e.g. `linkpages/`) and the git setup.
- Exact breakpoint, type sizes, and padding values, within the rules above.
- The data file layout and the URL rewrite for `/<slug>/`.
- The hover animation timing, and how to share one stylesheet across eight designs.
- Whether designs are selected by a class on `<body>` or by separate stylesheets.

## Validation and security

- Slugs: lowercase letters, digits and hyphens only; unique across the whole site; not a reserved name (`edit`, `site`, `seeds`, `css`, `js`, `fonts`, `assets`, `favicon`). A slug is edited separately from the name; renaming a link never changes its slug.
- Target URLs must start with `http://` or `https://`. Anything else is rejected on save and never written into `location.replace` or a meta refresh.
- `save.php` writes only its own deployment's data file: no hostname in the payload and no cross-site write.
- A delay-0 redirect is done by JS (with the `<noscript>` meta refresh as fallback), not by an HTTP 301/302, so later edits are never held by a cached redirect.
- The font selector is hidden in the edit UI while the font list is empty; an unknown `font` key falls back to the system stack.
- `.htpasswd`: each deployment has its own, created fresh and not shared with a.msmr.co or another domain.
- The builder reads the five unknown targets from the live redirect pages (network is available) and also keeps the `index.html` and trailing-slash variants resolving.

## Decided by the author, not confirmed with the owner

- Default design, default delay of 8 s (matches today), default mode light.
- The bracket-terminal numbers-on form.
- Plain error page for an unknown slug.
- Folders listed before links, numbering per list, no depth limit, flat seeds, slugs unique across the site with flat redirect URLs, the closer repeating the folder name with `^`, the chevron turning `>` to `v`, open state not remembered.
- The validation and security rules above, including a fresh `.htpasswd` per deployment and JS-only redirects.
