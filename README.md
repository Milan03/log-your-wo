# Log Your Workout

Log Your Workout is a responsive workout logging application for strength and
cardio training. It supports quick free-form logs, Excel program imports,
workout timing and completion tracking, PDF export, email delivery, profiles,
and optional account-based cloud synchronization.

The application is designed to work in two modes:

- **Guest mode:** data is stored in the browser with `localStorage`.
- **Signed-in mode:** local data is cached per account and synchronized with
  Supabase. Existing guest data is migrated into the account during the first
  successful sync.

## Features

- Create, rename, edit, complete, and delete workout logs.
- Browse workout history with a calendar.
- Track strength exercises by weight, reps, and sets.
- Track cardio exercises by distance, duration, and intensity.
- Start, pause, resume, and complete timed workouts.
- Import multiple `.xlsx` or `.xls` training programs.
- Browse imported programs by week and day with completion progress.
- Save workout logs as formatted PDF documents.
- Email generated workout PDFs through a separate Netlify mail service.
- Register and sign in with email/password or Google through Supabase Auth.
- Maintain a profile, unit preferences, training interests, and fitness goals.
- Use metric or imperial units with automatic display conversion.
- Switch between Canadian English and Canadian French.
- Continue working from the local cache when cloud synchronization is
  temporarily unavailable.

## Technology

- Angular 21
- Angular Material and Angular CDK
- Bootstrap 5 and SCSS
- Supabase Auth and PostgreSQL
- RxJS
- SheetJS (`xlsx`) for workbook imports
- jsPDF for client-side PDF generation
- ngx-translate for localization
- Karma and Jasmine for unit tests
- Netlify for static hosting and SPA routing

## Project Layout

```text
src/
  app/
    core/                 Authentication, Supabase client, settings, themes
    layout/               Header, sidebar, footer, and application shell
    routes/
      auth/               Login, registration, and OAuth callback
      home/               Landing page
      log-entry/          Simple logs, program imports, and dialogs
      profile/            User profile and unit preferences
    shared/
      models/             Application data models
      services/           Persistence, PDF, email, and synchronization
  assets/
    i18n/                 en-ca and fr-ca translations
    fonts/                Font assets embedded into generated PDFs
  environments/           Development and production configuration
supabase/
  migrations/             Database schema and row-level security policies
```

## Requirements

- Node.js 20.19 or newer
- npm
- A modern browser

Supabase is required for account authentication and cloud sync. The separate
mail server is required only for the **Email as PDF** feature.

## Local Development

Install dependencies and start Angular:

```powershell
npm install
npm start
```

Open `http://localhost:4200`.

The development environment sends email requests to
`http://localhost:3000/sendmail`. The application itself still runs without
the mail server; only email delivery will be unavailable.

## Configuration

Frontend runtime configuration is stored in:

- `src/environments/environment.ts`
- `src/environments/environment.prod.ts`

Each environment provides:

```ts
export const environment = {
    production: false,
    apiBaseAddress: 'http://localhost:3000',
    supabase: {
        url: 'https://your-project.supabase.co',
        publishableKey: 'your-supabase-publishable-key'
    }
};
```

## Supabase Setup

1. Create a Supabase project.
2. Apply the SQL migrations in `supabase/migrations` in timestamp order.
3. Copy the project URL and publishable key into both Angular environment
   files.
4. Under **Authentication > URL Configuration**, set the production site URL.
5. Add allowed redirect URLs for each environment:

```text
http://localhost:4200/auth/callback
https://logyourworkout.app/auth/callback
```

6. Enable the Google provider in Supabase if Google sign-in is required, and
   configure its OAuth credentials and callback URL.

The migrations create:

- `workout_logs`
- `imported_programs`
- `imported_workout_states`
- `user_preferences`
- `profiles`

All application tables use row-level security. Authenticated users can access
only rows whose `user_id` matches their Supabase user ID.

## Storage And Synchronization

Guest data is stored under `logYourWo.*` browser storage keys. Signed-in data
uses user-specific keys such as `logYourWo.<user-id>.simpleLogs`.

When a user signs in, the application:

1. Loads local account data, any legacy guest data, and Supabase data.
2. Merges records using IDs and update timestamps.
3. Writes the merged result to Supabase and the local cache.
4. Removes migrated guest data after successful synchronization.

Changes are written locally first. Cloud writes are queued, failed deletions
are retained for retry, and synchronization runs again when the browser
reconnects.

## Excel Program Imports

The importer accepts `.xlsx` and `.xls` files up to 10 MB.

It recognizes:

- Rows containing labels such as `Week 1`, `Week 2`, and so on.
- Day headings named Monday through Sunday.
- Up to three day blocks across a worksheet using column pairs B/C, E/F,
  and H/I.
- Exercise names beside prescription values such as `100 x 5 x 3`.

Each imported program is stored locally and, for signed-in users, synchronized
with its workout state and completion progress in Supabase.

## PDF And Email

PDFs are generated entirely in the browser with jsPDF. They include exercise
tables, workout status, elapsed time, units, imported-program context, and
localized labels.

Email delivery uses the separate `log-your-wo-mail-server` project:

```text
Angular app
  -> POST /sendmail
  -> Netlify Function
  -> Resend SMTP
  -> recipient
```

For local email testing, run the sibling mail-server repository:

```powershell
cd C:\Dev\log-your-wo-mail-server
npm install
npm start
```

Its local `.env` requires:

```env
RESEND_API_KEY=re_your_resend_api_key
FROM_EMAIL=noreply@logyourworkout.app
```

For production, configure those variables on the Netlify site that deploys the
mail server. `RESEND_API_KEY` belongs only on the server and must never be
added to this repository.

The production frontend currently calls:

```text
https://lywms.netlify.app/.netlify/functions/sendmail
```

Change `apiBaseAddress` in `environment.prod.ts` if the mail-service URL
changes.

## Commands

```powershell
# Development server
npm start

# Production build
npm run build

# Interactive unit tests
npm test

# Headless unit tests
npm run test:ci

# High-memory production build
npm run ng-high-memory
```

Production output is written to `dist/`.

## Deployment

The frontend is configured for Netlify:

- Node.js is pinned in `netlify.toml`.
- All routes rewrite to `/index.html` so Angular client-side routing works.
- `npm run build` creates the deployable `dist` directory.

Recommended Netlify settings:

```text
Build command: npm run build
Publish directory: dist
```

The intended production domain is:

```text
https://logyourworkout.app
```

After changing domains, update all of the following:

- Netlify custom-domain configuration
- Supabase site URL and redirect allowlist
- Google OAuth authorized origins and redirect configuration, when enabled

## Testing

Unit tests cover components, services, pipes, authentication, local/cloud data
merging, program imports, PDF generation, and email request handling.

Before deploying:

```powershell
npm run test:ci
npm run build
```

The headless test command requires a compatible Chrome or Chromium
installation.

## Localization

Translations live in:

```text
src/assets/i18n/en-ca.json
src/assets/i18n/fr-ca.json
```

When adding user-facing translated content, add the same key to both files.
PDF labels use the active application language.

## Related Service

`log-your-wo-mail-server` is maintained separately and contains the Express
development server plus the production Netlify Function used for workout PDF
email delivery. Its deployment and secrets should remain independent from
this browser application.
