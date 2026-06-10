# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

Log Your Workout (`log-your-wo`) — a responsive Angular 21 PWA for logging
strength and cardio workouts. Free-form logs, Excel program imports, workout
timing, PDF export, email delivery, profiles, and optional Supabase-backed
cloud sync. See `README.md` for full feature and setup detail.

## Commands

```powershell
npm start          # dev server at http://localhost:4200
npm run build      # production build -> dist/
npm test           # interactive Karma/Jasmine unit tests
npm run test:ci    # headless tests (needs Chrome/Chromium); use this in CI
npm run ng-high-memory   # production build with raised Node heap
```

There is no lint script. Tests run on Karma + Jasmine; each component/service
has a colocated `*.spec.ts`. Run `npm run test:ci` before considering a change
done.

## Architecture

Angular with **NgModules** (not standalone components) and lazy-loaded routes.

- `src/app/core/` — singletons: `auth/` (AuthService, AuthGuard),
  `supabase/supabase-client.service.ts` (single shared SupabaseClient),
  settings, themes, translator, menu.
- `src/app/layout/` — app shell (header, sidebar, offsidebar, footer).
- `src/app/routes/` — feature modules, each lazy-loaded via `routes.ts`:
  `auth/`, `home/`, `log-entry/` (simple-log, program-import, dialogs),
  `profile/`.
- `src/app/shared/` — `models/`, `services/` (persistence, sync, PDF, email,
  imports), `pipes/`, `directives/`, `data-sources/`, SCSS in `styles/`.
- `src/environments/` — `environment.ts` (dev) and `environment.prod.ts`
  (prod), swapped at build time via `angular.json` fileReplacements. Holds
  `apiBaseAddress` (mail service) and `supabase.{url,publishableKey}`.

### Local-first data + sync (the core pattern)

The app works fully offline/guest, then syncs when signed in. When touching
any data service, preserve this model:

- **Writes go to `localStorage` first**, then cloud writes are queued
  (`cloudWriteQueue` Promise chain) and retried on reconnect. Failed deletes
  are retained (`deletedLogIds`) for retry.
- **Guest keys**: `logYourWo.*`. **Signed-in keys**: `logYourWo.<user-id>.*`.
- On sign-in, services merge remote + cached + legacy-guest records by id and
  update timestamp, write the merged result to Supabase and cache, then remove
  migrated guest data. See `simple-log.service.ts` and
  `user-data-sync.service.ts` as the reference implementations.
- All Supabase tables use row-level security keyed on `user_id`. Schema lives
  in `supabase/migrations/` (apply in timestamp order).

## Conventions

- **Indentation: TypeScript/HTML source uses 4 spaces** (despite
  `.editorconfig` declaring 2 — match the surrounding 4-space code in `.ts`).
- Mark members `public`/`private` explicitly; expose observables as
  `readonly foo$` backed by a private `BehaviorSubject`/`Subject` source.
- Services are `@Injectable({ providedIn: 'root' })`.
- Components are module-declared with separate `.ts`/`.html`/`.scss`/`.spec.ts`
  files; component prefix is `app`, styles are SCSS.
- `moment` is imported as `import * as moment from 'moment'`.

## Localization

User-facing strings live in `src/assets/i18n/en-ca.json` and `fr-ca.json` via
ngx-translate. **Add every new key to both files.** PDF labels also use the
active language.

## External services

- **Supabase** — auth (email/password + Google PKCE) and Postgres sync.
- **Mail server** — email-as-PDF posts to `apiBaseAddress` (`/sendmail`); it is
  a *separate* repo (`log-your-wo-mail-server`). The app runs without it; only
  email delivery is unavailable. Never put `RESEND_API_KEY` or other server
  secrets in this repo.
- Deployment is Netlify (`netlify.toml`), SPA routes rewrite to `/index.html`.
