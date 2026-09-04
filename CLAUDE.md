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

## Architecture

**Two independent halves that share one process:**

1. **Frontend** — `index.html` + `css/*.css` + `js/*.js`, all loaded as plain `<script>` tags (order matters, see `index.html`). No framework, no build tool. State and behavior are split by page/domain into separate files that all mutate one shared global:
   - `js/data.js` — defines the global `AppState` object (jobs, platforms, notifications, deploy history, etc.) plus dummy seed data (`JOBS_DATA`), and `saveToStorage()`/`loadFromStorage()` which persist `AppState.jobs`/`AppState.platforms` to `localStorage` (key prefix `adDashboard_`). This is the single source of truth for the whole app — there is no backend data store for job data.
   - `js/app.js` — bootstraps on `DOMContentLoaded`, defines the client-side router (`PAGE_CONFIG`, `navigateTo()`), and global utilities (toast notifications, date/number formatting, modal close).
   - `js/dashboard.js`, `js/jobs.js`, `js/adcenter.js`, `js/deploy.js`, `js/analytics.js`, `js/settings.js` — one file per sidebar page (`data-page` in `index.html`). Each exposes an `init<PageName>()` function that `PAGE_CONFIG` calls when that page's nav item is clicked; all read/write `AppState` directly and re-render their own DOM section.
   - `js/adcenter.js` has its own separate `localStorage` persistence (`adDashboard_adcenter`) for ad-center-specific state, on top of the shared `AppState`.

2. **Backend** — `server/server.js`, a single-file Express app. Deliberately minimal and scoped to *only* Naver Cafe publishing:
   - Serves the project root as static files (so frontend + backend run from one `http://localhost:PORT`).
   - `GET /api/naver/oauth/start` → redirects to Naver's OAuth authorize URL.
   - `GET /callback` → exchanges the OAuth code for a real access token and writes it to `server/naver_token.json` (gitignored). The token **never** goes to the browser.
   - `GET /api/naver/status` → tells the frontend whether a token file exists (frontend's `isConnected` flag must only ever be set from this real response, per the comment in `js/adcenter.js:143`).
   - `POST /api/naver/disconnect` → deletes the token file.
   - `POST /api/naver/cafe/publish` → the actual proxy: calls Naver's real `openapi.naver.com/v1/cafe/.../articles` endpoint with the stored token and relays Naver's real status code/body back unmodified.

   Hard rule baked into the file's header comment: this server must never fabricate a success response or a fake article ID/URL — every publish result the frontend sees must have come from Naver itself. Preserve this behavior when touching `server.js`.

`js/adcenter.js` is the only frontend file that talks to the backend (`NAVER_API_BASE` + the `/api/naver/*` routes above); every other page is purely local/`localStorage`-driven.

## Current implementation status: what's real vs. mocked

Only **one** integration in this app makes a real external network call end-to-end. Everything else is a local simulation. Know this before assuming a feature "works" in production:

| Feature | Status | Where |
|---|---|---|
| Naver Cafe publish | ✅ Real — real OAuth login, real `openapi.naver.com` article POST, real response relayed unmodified | `server/server.js`, `js/adcenter.js:1020-1290` |
| 잡코리아 / 사람인 / 워크넷 publish | ❌ Fake — `buildCopyForChannel()` only generates per-site-formatted *text* for the user to copy-paste manually. There is no publish API call to any of these three sites | `js/adcenter.js:660-780` |

The old fake "AI" copy generator (`AI_GENERATION_BANK` regex/template bank in `js/jobs.js` + the "AI 카피 생성" button in `index.html`) has been removed — it never called an LLM. `js/data.js`'s `JOBS_DATA` seed list has also been emptied (`[]`) so the dashboard no longer opens with fabricated sample job postings; `AppState.jobs` now starts empty and is populated only by real data entered through the UI (persisted to `localStorage`). Note: `PLATFORMS_DATA`, `NOTIFICATIONS_DATA`, `DEPLOY_HISTORY`, and `MONTHLY_STATS` in `js/data.js` are still sample/demo data feeding the dashboard and analytics charts.

To turn this into a real production system, each row needs different work:

- **Real AI copy**: add a server-side LLM proxy route (e.g. `POST /api/ai/generate` in `server.js`) that calls Claude/OpenAI with the job fields as input — never call an LLM API directly from the browser, that leaks the API key the same way Naver's token is deliberately kept server-side only.
- **워크넷 (고용24)**: 공공데이터포털 Open API exists but appears to be read-only (job search/listing); posting likely requires a 고용24 사업주 계정 and a separate approval — verify before assuming a simple API-key integration is possible.
- **사람인 / 잡코리아**: no public self-serve posting API. Real posting requires a paid advertiser/business partnership with each company (feed-based or dedicated integration API) — this is a business/contract prerequisite, not something solvable by writing more code.
- **Infra hardening needed regardless**: `server/naver_token.json` is a single-user flat-file token store with no refresh-token rotation logic — fine for local single-operator use, not for multi-user/deployed use (would need a real datastore + refresh-token handling before going beyond localhost).
