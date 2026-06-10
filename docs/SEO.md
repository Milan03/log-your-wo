# SEO & Discoverability

This document covers how SEO works in Log Your Workout and how to get the site
indexed by Google.

## What is in place

| Area | Where |
| --- | --- |
| Default title, description, keywords, OG, Twitter, canonical | `src/index.html` |
| Site-wide JSON-LD (Organization, WebApplication, SoftwareApplication) | `src/index.html` |
| Per-page title/description/canonical/OG/Twitter/JSON-LD | `src/app/core/seo/seo.service.ts`, applied from `AppComponent` on every `NavigationEnd` |
| Per-route metadata | `data.seo` on each route (`*.module.ts`) |
| Feature page content + metadata | `src/app/routes/features/feature-content.ts` |
| Landing content | `src/app/routes/home/home/home.component.html` (i18n keys in `assets/i18n/*.json`) |
| Footer internal links | `src/app/layout/layout.component.html` |
| Crawl directives | `public/robots.txt` |
| Sitemap | `public/sitemap.xml` |

`robots.txt` and `sitemap.xml` live in `public/` and are copied to the site
root at build time (`angular.json` → assets), so they are served at
`https://logyourworkout.app/robots.txt` and `/sitemap.xml`.

## Adding a new public page

1. Add an entry to `FEATURE_CONTENT` in `feature-content.ts` (for a feature
   page) **or** add `data: { seo: { ... } }` to the route (for other pages).
2. Add the route to the relevant `*.module.ts`.
3. Add a `<url>` entry to `public/sitemap.xml`.
4. Add a footer link in `layout.component.html` if it should be globally linked.

## Submitting to Google Search Console

1. Go to <https://search.google.com/search-console> and add the property
   `https://logyourworkout.app` (Domain property is preferred; verify via the
   DNS TXT record on your registrar, or use the URL-prefix property and verify
   with the provided HTML tag / file).
2. In **Sitemaps**, submit `sitemap.xml` (enter `sitemap.xml`, the tool prefixes
   the domain). Confirm it reports "Success".
3. To index a specific page now, use **URL Inspection**, paste the full URL
   (e.g. `https://logyourworkout.app/features/workout-tracker`), then
   **Request indexing**. Do this for the home page and each feature page.
4. Check **Pages** after a few days to confirm pages are indexed and watch for
   "Crawled – currently not indexed" or "Discovered – not indexed" states.

> Note: the app is a client-side Angular SPA. Googlebot renders JavaScript, so
> content is indexable, but rendering is deferred. If indexing coverage is weak,
> the highest-impact next step is adding SSR/prerendering (`@angular/ssr`) for
> the public routes — deferred here to avoid risk to the existing jQuery /
> CodeMirror / xlsx runtime. Use URL Inspection's "View crawled page" to confirm
> Google sees the rendered content.

## Recommended target keywords

Primary:

- workout tracker
- workout log
- gym workout tracker
- strength training log
- workout journal

Secondary / long-tail:

- workout program tracker
- excel workout importer / import workout program from excel
- workout pdf export / export workout to pdf
- free workout tracker no account
- workout history and progress tracking

Each keyword group maps to a page:

| Keyword group | Page |
| --- | --- |
| workout tracker, gym workout tracker | `/features/workout-tracker` |
| excel workout importer, program tracker | `/features/excel-workout-import` |
| workout pdf export | `/features/workout-pdf-export` |
| strength training log, workout journal | `/features/strength-training-log` |
| workout history, progress tracking | `/features/workout-history-progress` |
| brand / overview | `/` (home) |

## Verification checklist after deploy

- [ ] `https://logyourworkout.app/robots.txt` loads and references the sitemap.
- [ ] `https://logyourworkout.app/sitemap.xml` loads and lists all public URLs.
- [ ] View source of a feature page after JS runs: unique `<title>`,
      `<meta name="description">`, `<link rel="canonical">`, OG/Twitter tags.
- [ ] `https://logyourworkout.app/auth` returns `noindex` in its robots meta.
- [ ] Rich Results Test (<https://search.google.com/test/rich-results>) finds
      the Organization / SoftwareApplication structured data on the home page.
