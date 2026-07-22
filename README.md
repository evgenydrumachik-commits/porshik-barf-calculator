# Поршик: дневник роста и питания

Поршик is a small bilingual (Russian/English) web diary for tracking a Pembroke Welsh Corgi's growth and daily feeding. The dashboard combines weight measurements, actual meals, and the current BARF feeding target on one timeline.

The application is public for reading. Authorized users can add and edit records, update the dog profile and feeding settings, and manage backups.

## Features

- Dashboard with latest weight, 30-day weight change, and current recommended portion.
- Combined growth and feeding chart with separate weight and meal series.
- Automatic age, daily target, per-meal target, and planned meal count calculations.
- An editable dated feeding-target timeline with smooth daily interpolation through the stable adult target.
- A compact comparison chart showing planned and actual intake as percentages of body weight; today's incomplete intake is excluded from the actual trend.
- Weight and meal entry forms with duplicate-date comparison before replacement.
- Full history page with inline editing, derived totals, deviation from target, and mobile-friendly records.
- Automatic snapshots after changes, downloadable JSON backups, and restore points.
- Google sign-in for write access and an admin page for managing allowed email addresses.
- Light/dark theme and Russian/English interface switch.

> Feeding calculations are informational guidance based on the breeder's recommendations. Adjust portions for body condition, activity, stool, and weight trends, and consult a veterinarian when needed.

## Pages and routes

| Route | Purpose |
| --- | --- |
| `/` | Dashboard with the current overview and charts |
| `/history` | Detailed chart, editable history table, and backups |
| `/admin` | Manage authorized users; requires administrator access |
| `/api/weights` | Read and write daily weight and meal records |
| `/api/profile` | Read and update the dog profile and feeding settings |
| `/api/auth/*` | Google session status, verification, and logout |

## Feeding model

The default profile is defined in `assets/domain.mjs` and can be overridden by persisted profile settings:

- Birth date: `2026-02-28`
- Time zone: `Europe/Berlin`
- Before the custom timeline: `8%` of current weight
- `2026-07-01`: `6.0%`
- `2026-07-22`: `5.4%`
- Stable adult target from `2026-10-28`: `3.0%`
- The target percentage is interpolated linearly between dated control points
- Adult meal phase: eight calendar months, beginning `2026-10-28`; meal count transitions on `2026-09-30`
- Planned meals: three before the transition, two from the transition start

Actual intake counts only meals with grams; meals marked as skipped are retained as `Не ел` / `Skipped` and do not contribute to the daily total.

## Requirements

- Node.js 20 or newer
- npm

Install dependencies with:

```bash
npm install
```

## Local development

Run the automated tests:

```bash
npm test
```

Start the local static server and API with editing enabled:

```bash
DEV_AUTH=1 node tests/dev-server.mjs
```

Open <http://127.0.0.1:4173>. The local server treats the local test account as an administrator and stores its own persistent development state in `.local-data/dev-state.json`. That ignored file survives code updates and server restarts but is never used by production, which continues to use Vercel Blob. Set `DEV_DATA_PATH=/tmp/porschik-test.json` when a disposable isolated dataset is needed for automated checks.

To serve the public read-only experience instead:

```bash
node tests/dev-server.mjs
```

The source is plain HTML, CSS, and JavaScript modules; no frontend build step is required.

## Production storage and authentication

The production API uses Vercel Blob for records, profile data, avatars, user access, snapshots, and daily backups. Without a Blob token, the API falls back to bundled seed records for reads and rejects writes.

Set these environment variables in the deployment environment:

| Variable | Required | Description |
| --- | --- | --- |
| `BLOB_READ_WRITE_TOKEN` | Yes for persistence | Vercel Blob read/write token |
| `GOOGLE_CLIENT_ID` | Yes for Google login | Google OAuth client ID used to validate ID tokens |
| `ADMIN_GOOGLE_EMAIL` | Recommended | Primary administrator email; defaults to the repository owner's configured fallback |

Google sign-in verifies the token issuer, audience when `GOOGLE_CLIENT_ID` is set, email verification status, and whether the email is allowed. The administrator email is always allowed; additional addresses are stored in Blob and managed from `/admin`. Selecting “Remember me” creates a long-lived, device-specific session in Vercel Blob; it remains valid until the user signs out, browser data is cleared, or that email loses access.

### Blob data layout

The API stores data under these prefixes:

- `porschik/state.json` for the current diary, restore-point index, and audit trail
- `porschik/weights/` for immutable record snapshots
- `porschik/backups/daily/` for daily restore points
- `porschik/expenses.json` for current expense data
- `porschik/expenses/` for immutable expense snapshots
- `porschik/profile.json` for the avatar URL and feeding overrides
- `porschik/avatar/` for uploaded profile images
- `porschik/users.json` for additional allowed email addresses

Existing snapshot-only stores are migrated automatically on the first request. After that one-time migration, normal reads use exact Blob paths and do not call Blob `list()`. Automatic snapshots, daily backups, restore points, expense history, audit events, and remembered sessions remain available without listing the store in normal application traffic.

## Deployment

### Vercel

The repository includes `vercel.json` with clean URLs enabled. Import the repository into Vercel, configure the environment variables above, attach a Vercel Blob store, and deploy. The serverless functions in `api/` are discovered automatically.

Before deploying, run:

```bash
npm test
```

Then verify `/`, `/history`, Google sign-in, a write operation, backup download, and restore in the deployed environment.

### Azure Static Web Apps

`staticwebapp.config.json` is included for an Azure Static Web Apps deployment protected by the `fo_operations_users` role. That configuration redirects unauthenticated visitors to the platform's Entra login and rewrites forbidden requests to `/403.html`. The API implementation in this repository is designed around Vercel Blob and Vercel-style serverless functions, so an Azure deployment also needs an API hosting and storage adapter compatible with that configuration.

## Project structure

```text
index.html                 Dashboard
history.html               Detailed history and backups
admin.html                 Access-management page
assets/app.mjs             UI state, charts, forms, auth, and translations
assets/domain.mjs          Feeding and date calculations
assets/app.css             Shared responsive styles
api/                       Serverless API handlers and storage helpers
tests/                     Node test suite and local development server
staticwebapp.config.json   Azure Static Web Apps routing/auth configuration
vercel.json                Vercel URL configuration
```

## Testing

The test suite is run with Node's built-in test runner:

```bash
npm test
```

It covers dated target interpolation, feeding phase boundaries, calendar-based age calculations, recommendations, actual intake percentages, skipped meals, daily intake differences, weight-only history behavior, record normalization, profile validation, and API behavior. Browser smoke coverage is available in `tests/browser-smoke.mjs` and expects the local server to be running.

## License

No license has been declared for this project.
