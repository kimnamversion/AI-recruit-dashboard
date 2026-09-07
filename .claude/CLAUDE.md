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

Required config: copy `server/.env.example` to `server/.env` and fill in `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET` (from developers.naver.com) and `DATABASE_URL` (a Postgres connection string). Without either, the server still starts and serves the dashboard, but the corresponding routes (`/api/naver/*` or `/api/jobs`) return a "not configured" error instead of working — see `requireDb` in `server/server.js` for the DB case.

See `README.md` for a project overview and `docs/superpowers/specs/2026-09-07-shared-job-storage-design.md` + `docs/superpowers/plans/2026-09-07-shared-job-storage.md` for the full design rationale and implementation plan behind the Postgres-backed job storage (why JSONB, why no auth yet, Render deployment constraints, testing approach, etc.) — this file only covers what a session needs to safely keep working in the code, not the history of why it's shaped this way.

## Architecture

**Two independent halves that share one process:**

1. **Frontend** — `index.html` + `css/*.css` + `js/*.js`, all loaded as plain `<script>` tags (order matters, see `index.html`). No framework, no build tool. State and behavior are split by page/domain into separate files that all mutate one shared global:
   - `js/data.js` — defines the global `AppState` object (jobs, platforms, notifications, deploy history, etc.) plus remaining demo seed data (`PLATFORMS_DATA`, `NOTIFICATIONS_DATA`, `DEPLOY_HISTORY`, `MONTHLY_STATS`). `AppState.jobs` is populated by `AppState.loadJobsFromServer()` (`GET /api/jobs`) — it is **not** `localStorage`-backed. `saveToStorage()`/`loadFromStorage()` only persist/restore `AppState.platforms` (key prefix `adDashboard_`); job data is never written to `localStorage`.
   - `js/app.js` — bootstraps on `DOMContentLoaded`, defines the client-side router (`PAGE_CONFIG`, `navigateTo()`), and global utilities (toast notifications, date/number formatting, modal close).
   - `js/dashboard.js`, `js/jobs.js`, `js/adcenter.js`, `js/deploy.js`, `js/analytics.js`, `js/settings.js` — one file per sidebar page (`data-page` in `index.html`). Each exposes an `init<PageName>()` function that `PAGE_CONFIG` calls when that page's nav item is clicked; all read/write `AppState` directly and re-render their own DOM section.
   - `js/adcenter.js` has its own separate `localStorage` persistence (`adDashboard_adcenter`) for ad-center-specific state, on top of the shared `AppState`.

2. **Backend** — `server/server.js`, a single-file Express app with two responsibilities: Naver Cafe publishing (original scope) and a Postgres-backed job-postings API (added later, see spec/plan links above):
   - Serves the frontend's static files — scoped explicitly to `/css`, `/js`, and `index.html`, **not** the whole project root. Do not change this back to `express.static(PROJECT_ROOT)` — that previously made `server/naver_token.json` (a real OAuth token) downloadable over plain HTTP.
   - `GET /api/naver/oauth/start`, `GET /callback`, `GET /api/naver/status`, `POST /api/naver/disconnect`, `POST /api/naver/cafe/publish` — real Naver OAuth + Cafe posting. Hard rule from the file's own header comment: never fabricate a success response or a fake article ID/URL here — every publish result the frontend sees must have come from Naver itself.
   - `GET/POST/PUT/DELETE /api/jobs[/:id]` — CRUD for job postings, backed by a Postgres `jobs` table (`id TEXT PRIMARY KEY, data JSONB`), gated by `requireDb` when `DATABASE_URL` isn't set. **No authentication** (intentional, not an oversight) — every route handling job data must keep treating its input as untrusted: job fields get rendered as HTML in `js/dashboard.js`/`js/jobs.js` (always via `escapeHtml()`/a platform-id whitelist, never raw interpolation) and a job object's fields are never assumed to exist (defensive `|| ''`/`|| []`/`|| 0` defaults throughout, since any caller can `POST` a minimally-fielded row).

`js/adcenter.js` and `js/jobs.js` are the frontend files that talk to the backend — `js/adcenter.js` via `NAVER_API_BASE` + the `/api/naver/*` routes, `js/jobs.js` (and `js/data.js`'s `loadJobsFromServer()`) via the `/api/jobs` REST API. Every other page still reads/writes only the shared in-memory `AppState` (and, for platforms, `localStorage`).

Known limitations not yet addressed beyond the no-auth point above (see the plan's ledger for the full reasoning): a `PUT` sends the full job object, so two users editing the same job around the same time can silently overwrite each other's fields, and a returning user's old `localStorage`-only postings (from before this change) aren't migrated or surfaced.

## Current implementation status: what's real vs. mocked

Only **one** integration in this app makes a real external network call end-to-end. Everything else is a local simulation. Know this before assuming a feature "works" in production:

| Feature | Status | Where |
|---|---|---|
| Naver Cafe publish | ✅ Real — real OAuth login, real `openapi.naver.com` article POST, real response relayed unmodified | `server/server.js`, `js/adcenter.js:1020-1290` |
| 잡코리아 / 사람인 / 워크넷 publish | ❌ Fake — `buildCopyForChannel()` only generates per-site-formatted *text* for the user to copy-paste manually. There is no publish API call to any of these three sites | `js/adcenter.js:660-780` |

The old fake "AI" copy generator (`AI_GENERATION_BANK` regex/template bank in `js/jobs.js` + the "AI 카피 생성" button in `index.html`) has been removed — it never called an LLM. `js/data.js`'s `JOBS_DATA` seed list has also been emptied so the dashboard no longer opens with fabricated sample postings; `AppState.jobs` is populated only by real data, persisted to Postgres (see Architecture above). `PLATFORMS_DATA`, `NOTIFICATIONS_DATA`, `DEPLOY_HISTORY`, and `MONTHLY_STATS` in `js/data.js` are still sample/demo data feeding the dashboard and analytics charts.

To turn this into a real production system, each row needs different work:

- **Real AI copy**: add a server-side LLM proxy route (e.g. `POST /api/ai/generate` in `server.js`) that calls Claude/OpenAI with the job fields as input — never call an LLM API directly from the browser, that leaks the API key the same way Naver's token is deliberately kept server-side only.
- **워크넷 (고용24)**: 공공데이터포털 Open API exists but appears to be read-only (job search/listing); posting likely requires a 고용24 사업주 계정 and a separate approval — verify before assuming a simple API-key integration is possible.
- **사람인 / 잡코리아**: no public self-serve posting API. Real posting requires a paid advertiser/business partnership with each company (feed-based or dedicated integration API) — this is a business/contract prerequisite, not something solvable by writing more code.
- **Infra hardening needed regardless**: `server/naver_token.json` is a single-user flat-file token store with no refresh-token rotation logic — fine for local single-operator use, not for multi-user/deployed use (would need a real datastore + refresh-token handling before going beyond localhost).

---

## Behavioral Guidelines

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 5. 한국어를 사용할것

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
