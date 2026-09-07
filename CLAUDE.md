# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

AI 채용광고 자동배포 대시보드 (AI job-posting auto-deploy dashboard) — a UI for creating and managing job postings across 잡코리아/사람인/워크넷/네이버 카페, with an Express backend that acts as a thin, honest proxy for Naver Cafe's real posting API (Naver OAuth login + article publish).

## Commands

```bash
# install server deps (first time / after pulling dependency changes)
cd server && npm install

# run the server (also serves the frontend as static files)
cd server && npm start        # or: node server.js
# or double-click server/시작.bat on Windows

# server runs at http://localhost:3000 (PORT in server/.env)
```

There is no build step, bundler, package.json, linter, or test suite for the frontend — `index.html`/`css/`/`js/` are plain static files loaded directly by the browser (no modules, no npm deps). The only `npm`-managed piece is `server/`.

Required config: copy `server/.env.example` to `server/.env` and fill in `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET` (from developers.naver.com). Without it, the server still starts and serves the dashboard, but Naver OAuth/publish endpoints return a "not configured" error instead of working.

Also required for job postings: set `DATABASE_URL` in `server/.env` to a Postgres connection string. Same fallback pattern as the Naver config — without it the server still starts and serves the dashboard, but every `/api/jobs` route returns a "not configured" 500 error instead of working (see `requireDb` in `server/server.js`).

## Architecture

**Two independent halves that share one process:**

1. **Frontend** — `index.html` + `css/*.css` + `js/*.js`, all loaded as plain `<script>` tags (order matters, see `index.html`). No framework, no build tool. State and behavior are split by page/domain into separate files that all mutate one shared global:
   - `js/data.js` — defines the global `AppState` object (jobs, platforms, notifications, deploy history, etc.) plus remaining demo seed data (`PLATFORMS_DATA`, `NOTIFICATIONS_DATA`, `DEPLOY_HISTORY`, `MONTHLY_STATS`). `AppState.jobs` is no longer localStorage-backed — it's populated by `AppState.loadJobsFromServer()`, which `GET`s `/api/jobs` from the Postgres-backed REST API and is the single source of truth for job postings, shared across every browser/operator hitting this server. `saveToStorage()`/`loadFromStorage()` now only persist/restore `AppState.platforms` to/from `localStorage` (key prefix `adDashboard_`) — job data is never written to `localStorage` any more.
   - `js/app.js` — bootstraps on `DOMContentLoaded`, defines the client-side router (`PAGE_CONFIG`, `navigateTo()`), and global utilities (toast notifications, date/number formatting, modal close).
   - `js/dashboard.js`, `js/jobs.js`, `js/adcenter.js`, `js/deploy.js`, `js/analytics.js`, `js/settings.js` — one file per sidebar page (`data-page` in `index.html`). Each exposes an `init<PageName>()` function that `PAGE_CONFIG` calls when that page's nav item is clicked; all read/write `AppState` directly and re-render their own DOM section.
   - `js/adcenter.js` has its own separate `localStorage` persistence (`adDashboard_adcenter`) for ad-center-specific state, on top of the shared `AppState`.

2. **Backend** — `server/server.js`, a single-file Express app. No longer scoped to only Naver Cafe publishing — it now also hosts a Postgres-backed REST API for job postings:
   - Serves the frontend's static files (`index.html`, `css/`, `js/` — explicitly, not the whole project root; see below) so frontend + backend run from one `http://localhost:PORT`.
   - `GET /api/naver/oauth/start` → redirects to Naver's OAuth authorize URL.
   - `GET /callback` → exchanges the OAuth code for a real access token and writes it to `server/naver_token.json` (gitignored). The token **never** goes to the browser.
   - `GET /api/naver/status` → tells the frontend whether a token file exists (frontend's `isConnected` flag must only ever be set from this real response, per the comment in `js/adcenter.js:143`).
   - `POST /api/naver/disconnect` → deletes the token file.
   - `POST /api/naver/cafe/publish` → the actual proxy: calls Naver's real `openapi.naver.com/v1/cafe/.../articles` endpoint with the stored token and relays Naver's real status code/body back unmodified.
   - `GET/POST/PUT/DELETE /api/jobs[/:id]` → CRUD for job postings, backed by a Postgres `jobs` table (`id TEXT PRIMARY KEY, data JSONB`). Requires `DATABASE_URL`; gated by the `requireDb` middleware when it isn't set. **This API has no authentication** — that's an intentional, existing design decision, not an oversight — so every route handling job data must treat its input as untrusted (see the XSS/CORS/missing-field hardening applied to `js/dashboard.js`, `js/jobs.js`, and the CORS middleware below).

   Hard rule baked into the file's header comment (about the Naver piece specifically): this server must never fabricate a success response or a fake article ID/URL for a Naver Cafe publish — every publish result the frontend sees must have come from Naver itself. Preserve this behavior when touching `server.js`.

   Static file serving is scoped explicitly to `/css`, `/js`, and `index.html` (`app.use('/css', ...)`, `app.use('/js', ...)`, and a `GET /` / `GET /index.html` handler) rather than `express.static(PROJECT_ROOT)` over the whole repo root — the old whole-root serving made `server/naver_token.json` (the real Naver access token) and `server/.env` downloadable over plain HTTP, which directly contradicted the "token never goes to the browser" rule above.

`js/adcenter.js` and `js/jobs.js` are the frontend files that talk to the backend — `js/adcenter.js` via `NAVER_API_BASE` + the `/api/naver/*` routes above, `js/jobs.js` (and `js/data.js`'s `loadJobsFromServer()`) via the `/api/jobs` REST API. Every other page still reads/writes only the shared in-memory `AppState` (and, for platforms, `localStorage`).

## Current implementation status: what's real vs. mocked

Only **one** integration in this app makes a real external network call end-to-end. Everything else is a local simulation. Know this before assuming a feature "works" in production:

| Feature | Status | Where |
|---|---|---|
| Naver Cafe publish | ✅ Real — real OAuth login, real `openapi.naver.com` article POST, real response relayed unmodified | `server/server.js`, `js/adcenter.js:1020-1290` |
| 잡코리아 / 사람인 / 워크넷 publish | ❌ Fake — `buildCopyForChannel()` only generates per-site-formatted *text* for the user to copy-paste manually. There is no publish API call to any of these three sites | `js/adcenter.js:660-780` |

The old fake "AI" copy generator (`AI_GENERATION_BANK` regex/template bank in `js/jobs.js` + the "AI 카피 생성" button in `index.html`) has been removed — it never called an LLM. `js/data.js`'s `JOBS_DATA` seed list has also been emptied (`[]`) so the dashboard no longer opens with fabricated sample job postings; `AppState.jobs` now starts empty and is populated only by real data entered through the UI, persisted to Postgres via the `/api/jobs` REST API (not `localStorage` — see Architecture above). Note: `PLATFORMS_DATA`, `NOTIFICATIONS_DATA`, `DEPLOY_HISTORY`, and `MONTHLY_STATS` in `js/data.js` are still sample/demo data feeding the dashboard and analytics charts.

To turn this into a real production system, each row needs different work:

- **Real AI copy**: add a server-side LLM proxy route (e.g. `POST /api/ai/generate` in `server.js`) that calls Claude/OpenAI with the job fields as input — never call an LLM API directly from the browser, that leaks the API key the same way Naver's token is deliberately kept server-side only.
- **워크넷 (고용24)**: 공공데이터포털 Open API exists but appears to be read-only (job search/listing); posting likely requires a 고용24 사업주 계정 and a separate approval — verify before assuming a simple API-key integration is possible.
- **사람인 / 잡코리아**: no public self-serve posting API. Real posting requires a paid advertiser/business partnership with each company (feed-based or dedicated integration API) — this is a business/contract prerequisite, not something solvable by writing more code.
- **Infra hardening needed regardless**: `server/naver_token.json` is a single-user flat-file token store with no refresh-token rotation logic — fine for local single-operator use, not for multi-user/deployed use (would need a real datastore + refresh-token handling before going beyond localhost).
