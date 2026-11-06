# Linkpages

A static set of brutalist link pages: eight designs, in-place folders, a countdown redirect page and online editing. No build step.

## Run locally

    php -S 0.0.0.0:8080 tools/dev-router.php

The router serves everything `no-store` and maps `/<slug>/` to `go.html`, like the production `.htaccess`.

## Tests

    npm test

## Deploy a domain

Each domain gets its own docroot with a copy of this repo. Create `edit/.htpasswd` fresh for that domain. The first request copies the seed (`seeds/default.json`) to `edit/site.json`; edits are saved there. `edit/site.json` and `edit/.htpasswd` are never committed.
