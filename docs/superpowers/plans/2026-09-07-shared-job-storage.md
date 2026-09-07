# 채용공고 공유 저장소(Postgres) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 채용공고(`AppState.jobs`) 데이터를 브라우저 `localStorage`가 아닌 서버 측 Postgres에 저장해, 인터넷으로 원격 접속하는 여러 사용자가 같은 공고 목록을 보고 수정할 수 있게 한다.

**Architecture:** `server/server.js`(Express)에 `pg` 기반 Postgres 연결과 `jobs` 테이블(단일 JSONB 컬럼) 및 `/api/jobs` CRUD 라우트를 추가한다. 프론트엔드(`js/data.js`, `js/jobs.js`, `js/app.js`)는 `AppState.jobs`를 로컬에서 직접 조작하던 것을 이 API를 호출하고 응답으로 채우는 방식으로 바꾼다. 실시간 동기화는 없고, 페이지 로드/탭 이동 시에만 서버에서 다시 조회한다.

**Tech Stack:** Node.js + Express (기존), `pg`(node-postgres, 신규 추가), 순수 SQL(ORM 없음), 프론트는 기존과 동일하게 순수 JS + `fetch` (신규 npm 의존성 없음).

**Spec:** `docs/superpowers/specs/2026-09-07-shared-job-storage-design.md`

## Global Constraints

- Render 무료 Postgres는 약 90일 후 만료되어 재생성이 필요하다 — 코드로 해결 불가한 운영상 한계이며, 서버 콘솔 로그/문서에만 남긴다.
- Render 무료 웹 서비스는 영구 디스크를 지원하지 않는다 — 파일 기반(JSON/SQLite 파일) 저장은 사용하지 않는다.
- 로그인/계정 구분은 이번 범위에 포함하지 않는다 — URL에 접근하는 누구나 목록을 보고 수정할 수 있다.
- `AppState.platforms`(플랫폼 연동 상태), 알림, 배포 이력 등은 공유 대상이 아니며 계속 `localStorage`/데모 데이터로 남긴다.
- 실시간 동기화(폴링/WebSocket)는 구현하지 않는다 — 새로고침/탭 이동 시에만 서버에서 다시 가져온다.
- 서버는 DB 응답을 가공하거나 성공을 지어내지 않고 있는 그대로 relay한다 (기존 네이버 프록시 코드의 원칙과 동일).

---

### Task 1: Postgres 연결 및 `jobs` 테이블 부트스트랩

**Files:**
- Modify: `server/package.json`
- Modify: `server/.env.example`
- Modify: `server/server.js:1-38` (require 구문, 상수 선언 영역), `server/server.js:212-223` (기존 `app.listen(...)` 블록을 비동기 시작 함수로 교체)

**Interfaces:**
- Consumes: 없음 (신규 인프라).
- Produces:
  - 모듈 스코프 변수 `pool` — `Pool` 인스턴스이거나(= `DATABASE_URL` 설정됨) `null`(= 미설정).
  - `requireDb(req, res, next)` — Express 미들웨어. `pool`이 `null`이면 `500 { error: '...' }`로 응답하고 다음 미들웨어로 넘어가지 않음.
  - Postgres에 `jobs` 테이블 존재 보장 (`id TEXT PRIMARY KEY`, `data JSONB NOT NULL`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`).

- [ ] **Step 1: `pg` 의존성 추가**

`server/package.json`의 `dependencies`에 한 줄 추가:

```json
{
  "name": "ai-job-dashboard-naver-server",
  "version": "1.0.0",
  "private": true,
  "description": "AI 채용공고 대시보드 - 네이버 카페 실제 게시를 위한 백엔드 프록시 서버",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "pg": "^8.13.1"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

Run: `cd server && npm install`
Expected: `node_modules/pg`가 설치되고 `package-lock.json`이 갱신된다. 에러 없이 종료.

- [ ] **Step 2: `.env.example`에 `DATABASE_URL` 안내 추가**

`server/.env.example` 끝에 추가:

```
# 채용공고 데이터를 저장할 PostgreSQL 연결 문자열.
# Render에 배포하면 Render Postgres가 이 값을 자동으로 주입합니다.
# 로컬 개발 시에는 로컬에 설치된 Postgres 또는 무료 Postgres 인스턴스
# (Render/Neon/Supabase 등)의 연결 문자열을 직접 입력하세요.
# 설정하지 않으면 서버는 정상 실행되지만 /api/jobs 관련 기능은 비활성화됩니다.
DATABASE_URL=postgres://user:password@localhost:5432/ai_recruit_dashboard
```

- [ ] **Step 3: `server.js`에 Postgres 연결 코드 추가**

`server/server.js` 상단, `const fs = require('fs');` 바로 아래에 추가:

```js
const crypto = require('crypto');
const { Pool } = require('pg');
```

`const TOKEN_FILE = path.join(__dirname, 'naver_token.json');` 바로 아래에 추가:

```js
// ================================================
// 채용공고 데이터 저장용 Postgres 연결
// DATABASE_URL이 없으면 pool은 null이며, /api/jobs 관련 라우트는
// requireDb 미들웨어가 "설정되지 않음" 오류로 안전하게 막는다.
// ================================================
const DATABASE_URL = process.env.DATABASE_URL || '';
const pool = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      // Render Postgres는 SSL이 필요하지만, 로컬 개발용 Postgres는 보통 SSL이 없다.
      ssl: /localhost|127\.0\.0\.1/.test(DATABASE_URL) ? false : { rejectUnauthorized: false },
    })
  : null;

function requireDb(req, res, next) {
  if (!pool) {
    return res.status(500).json({
      error: 'DATABASE_URL이 설정되지 않아 채용공고 저장 기능을 사용할 수 없습니다. server/.env 파일을 확인해주세요.',
    });
  }
  next();
}

async function ensureJobsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}
```

- [ ] **Step 4: CORS 허용 메서드에 PUT/DELETE 추가**

`server/server.js`에서 기존:

```js
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
```

을 아래로 교체 (메서드 목록만 변경):

```js
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
```

- [ ] **Step 5: 서버 시작 로직을 비동기로 바꿔 테이블 준비를 기다리게 함**

파일 맨 아래 기존:

```js
app.listen(PORT, () => {
  console.log('');
  console.log(`✅ 서버가 실행되었습니다: http://localhost:${PORT}`);
  console.log('   브라우저에서 위 주소로 접속해서 대시보드를 사용하세요.');
  console.log('   (이 창을 닫으면 서버도 함께 종료됩니다)');
  console.log('');
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.log('⚠️  아직 .env에 NAVER_CLIENT_ID / NAVER_CLIENT_SECRET이 설정되지 않았습니다.');
    console.log('    네이버 개발자센터에서 발급받은 값을 server/.env 파일에 입력해주세요.');
    console.log('');
  }
});
```

를 아래로 교체:

```js
async function start() {
  if (pool) {
    try {
      await ensureJobsTable();
      console.log('✅ Postgres 연결 및 jobs 테이블 준비 완료');
    } catch (e) {
      console.log('⚠️  DATABASE_URL은 설정되어 있지만 Postgres 연결/테이블 생성에 실패했습니다:', e.message);
    }
  } else {
    console.log('⚠️  DATABASE_URL이 설정되지 않아 채용공고 저장 API(/api/jobs)가 비활성화됩니다.');
  }

  app.listen(PORT, () => {
    console.log('');
    console.log(`✅ 서버가 실행되었습니다: http://localhost:${PORT}`);
    console.log('   브라우저에서 위 주소로 접속해서 대시보드를 사용하세요.');
    console.log('   (이 창을 닫으면 서버도 함께 종료됩니다)');
    console.log('');
    if (!CLIENT_ID || !CLIENT_SECRET) {
      console.log('⚠️  아직 .env에 NAVER_CLIENT_ID / NAVER_CLIENT_SECRET이 설정되지 않았습니다.');
      console.log('    네이버 개발자센터에서 발급받은 값을 server/.env 파일에 입력해주세요.');
      console.log('');
    }
  });
}

start();
```

- [ ] **Step 6: 동작 확인**

`DATABASE_URL`을 아직 설정하지 않은 상태로 실행:

Run: `cd server && node server.js`
Expected: 콘솔에 `⚠️  DATABASE_URL이 설정되지 않아 채용공고 저장 API(/api/jobs)가 비활성화됩니다.`가 출력되고, 이어서 `✅ 서버가 실행되었습니다` 로그가 출력되며 서버가 정상 기동(크래시 없음). `Ctrl+C`로 종료.

접근 가능한 Postgres 연결 문자열을 `server/.env`의 `DATABASE_URL`에 설정 (로컬에 Postgres가 있으면 그 값을, 없으면 Render 대시보드에서 무료 Postgres 인스턴스를 하나 만들어 "External Database URL"을 복사해 사용):

Run: `cd server && node server.js`
Expected: 콘솔에 `✅ Postgres 연결 및 jobs 테이블 준비 완료`가 출력된다.

- [ ] **Step 7: Commit**

```bash
git add server/package.json server/package-lock.json server/.env.example server/server.js
git commit -m "feat: connect server to Postgres and bootstrap jobs table"
```

---

### Task 2: `/api/jobs` CRUD 엔드포인트

**Files:**
- Modify: `server/server.js` (Task 1에서 만든 `/api/naver/cafe/publish` 라우트, 즉 기존 `server.js:167-203` 블록 바로 다음에 추가)

**Interfaces:**
- Consumes: Task 1의 `pool`, `requireDb`.
- Produces: HTTP 계약 (프론트엔드 Task 3~5가 그대로 사용):
  - `GET /api/jobs` → `200`, JSON 배열 `[{ id, ...jobFields }, ...]` (최근 수정순).
  - `POST /api/jobs` (body: job 필드 객체, `id` 없이) → `201`, JSON `{ id, ...jobFields }` — `id`는 서버가 생성.
  - `PUT /api/jobs/:id` (body: job 필드 객체) → `200`, JSON `{ id, ...jobFields }`; 존재하지 않으면 `404 { error }`.
  - `DELETE /api/jobs/:id` → `204` (본문 없음); 존재하지 않으면 `404 { error }`.
  - 모든 실패는 `500 { error: string }` (DB 오류 메시지 그대로 노출, 가공/은폐 없음).

- [ ] **Step 1: 4개 라우트 추가**

`server/server.js`에서 `app.post('/api/naver/cafe/publish', ...)` 블록이 끝나는 지점(기존 줄 203, `});` 다음) 바로 뒤에 추가:

```js
// ================================================
// 6) 채용공고 CRUD (Postgres 기반, 모든 접속자가 같은 목록을 공유)
// ================================================
app.get('/api/jobs', requireDb, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, data FROM jobs ORDER BY updated_at DESC');
    res.json(result.rows.map(row => ({ id: row.id, ...row.data })));
  } catch (e) {
    res.status(500).json({ error: `채용공고 목록 조회 중 오류: ${e.message}` });
  }
});

app.post('/api/jobs', requireDb, async (req, res) => {
  try {
    const id = crypto.randomUUID();
    const data = req.body || {};
    await pool.query('INSERT INTO jobs (id, data, updated_at) VALUES ($1, $2, now())', [id, data]);
    res.status(201).json({ id, ...data });
  } catch (e) {
    res.status(500).json({ error: `채용공고 생성 중 오류: ${e.message}` });
  }
});

app.put('/api/jobs/:id', requireDb, async (req, res) => {
  try {
    const data = req.body || {};
    const result = await pool.query(
      'UPDATE jobs SET data = $2, updated_at = now() WHERE id = $1 RETURNING id, data',
      [req.params.id, data]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: '해당 id의 공고를 찾을 수 없습니다.' });
    }
    res.json({ id: result.rows[0].id, ...result.rows[0].data });
  } catch (e) {
    res.status(500).json({ error: `채용공고 수정 중 오류: ${e.message}` });
  }
});

app.delete('/api/jobs/:id', requireDb, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM jobs WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: '해당 id의 공고를 찾을 수 없습니다.' });
    }
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: `채용공고 삭제 중 오류: ${e.message}` });
  }
});
```

- [ ] **Step 2: 서버 재시작 후 curl로 전체 플로우 확인**

Run: `cd server && node server.js` (Task 1에서 설정한 `DATABASE_URL`이 유효해야 함)

다른 터미널에서:

```bash
# 1) 초기 목록은 비어있어야 함
curl -s http://localhost:3000/api/jobs

# 2) 생성
curl -s -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{"title":"테스트 공고","status":"draft","category":"물류"}'
```
Expected (2): `{"id":"<uuid>","title":"테스트 공고","status":"draft","category":"물류"}` 형태의 JSON, `id`는 UUID.

```bash
# 3) 목록 조회에 반영되는지 확인 (위에서 받은 id를 기억해둘 것)
curl -s http://localhost:3000/api/jobs
```
Expected (3): 방금 만든 공고 1건이 배열에 포함됨.

```bash
# 4) 수정 (JOB_ID를 2번에서 받은 실제 id로 치환)
curl -s -X PUT http://localhost:3000/api/jobs/JOB_ID \
  -H "Content-Type: application/json" \
  -d '{"title":"수정된 공고","status":"active","category":"물류"}'
```
Expected (4): `{"id":"JOB_ID","title":"수정된 공고","status":"active","category":"물류"}`

```bash
# 5) 삭제
curl -s -o /dev/null -w "%{http_code}\n" -X DELETE http://localhost:3000/api/jobs/JOB_ID
# 6) 삭제 후 재조회
curl -s http://localhost:3000/api/jobs
# 7) 존재하지 않는 id 삭제 시 404
curl -s -o /dev/null -w "%{http_code}\n" -X DELETE http://localhost:3000/api/jobs/JOB_ID
```
Expected (5): `204`. Expected (6): 빈 배열 `[]`. Expected (7): `404`.

- [ ] **Step 3: Commit**

```bash
git add server/server.js
git commit -m "feat: add /api/jobs CRUD endpoints backed by Postgres"
```

---

### Task 3: `AppState.loadJobsFromServer()` 및 localStorage에서 jobs 제거

**Files:**
- Modify: `js/data.js:194-233` (`getFilteredJobs()` 뒤, `saveToStorage`/`loadFromStorage`)

**Interfaces:**
- Consumes: Task 2의 `GET /api/jobs` 계약.
- Produces: `AppState.loadJobsFromServer()` — `async` 메서드, 반환값 없음(`Promise<void>`). 성공 시 `AppState.jobs`를 서버 응답 배열로 교체. 실패 시 `AppState.jobs`는 건드리지 않고 `showToast`로 경고만 띄움 (앱이 죽지 않도록).

- [ ] **Step 1: `AppState`에 `loadJobsFromServer` 추가**

`js/data.js`의 `getFilteredJobs() { ... }` 메서드 바로 뒤, `AppState` 객체 리터럴이 끝나는 `};` 앞에 추가 (즉 기존 206~209줄 사이):

```js
  getFilteredJobs() {
    let jobs = this.jobs;
    if (this.jobFilter !== 'all') {
      jobs = jobs.filter(j => j.status === this.jobFilter);
    }
    if (this.jobSearch) {
      const q = this.jobSearch.toLowerCase();
      jobs = jobs.filter(j =>
        j.title.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q) ||
        j.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return jobs;
  },

  async loadJobsFromServer() {
    try {
      const res = await fetch('/api/jobs');
      if (!res.ok) throw new Error(`서버 응답 오류 (HTTP ${res.status})`);
      this.jobs = await res.json();
    } catch (e) {
      console.warn('채용공고 목록을 서버에서 불러오지 못했습니다:', e);
      if (typeof showToast === 'function') {
        showToast('채용공고 목록을 서버에서 불러오지 못했습니다. 서버 연결을 확인해주세요.', 'warning');
      }
    }
  },
```

- [ ] **Step 2: localStorage에서 jobs 저장/로드 제거**

기존:

```js
function saveToStorage() {
  try {
    localStorage.setItem('adDashboard_jobs', JSON.stringify(AppState.jobs));
    localStorage.setItem('adDashboard_platforms', JSON.stringify(AppState.platforms));
  } catch (e) {
    console.warn('localStorage 저장 실패:', e);
  }
}

function loadFromStorage() {
  try {
    const savedJobs = localStorage.getItem('adDashboard_jobs');
    if (savedJobs) AppState.jobs = JSON.parse(savedJobs);
    const savedPlatforms = localStorage.getItem('adDashboard_platforms');
    if (savedPlatforms) AppState.platforms = JSON.parse(savedPlatforms);
  } catch (e) {
    console.warn('localStorage 로드 실패:', e);
  }
}
```

를 아래로 교체:

```js
function saveToStorage() {
  try {
    localStorage.setItem('adDashboard_platforms', JSON.stringify(AppState.platforms));
  } catch (e) {
    console.warn('localStorage 저장 실패:', e);
  }
}

function loadFromStorage() {
  try {
    const savedPlatforms = localStorage.getItem('adDashboard_platforms');
    if (savedPlatforms) AppState.platforms = JSON.parse(savedPlatforms);
  } catch (e) {
    console.warn('localStorage 로드 실패:', e);
  }
}
```

- [ ] **Step 3: 브라우저에서 직접 호출해 확인**

`cd server && node server.js`로 서버를 띄운 채 브라우저에서 `http://localhost:3000` 접속, 개발자 콘솔에서:

```js
await AppState.loadJobsFromServer();
console.log(AppState.jobs);
```

Expected: 에러 없이 실행되고, `AppState.jobs`가 배열로 출력됨 (Task 2에서 만든 테스트 데이터를 다 지웠다면 빈 배열).

- [ ] **Step 4: Commit**

```bash
git add js/data.js
git commit -m "feat: load jobs from server API instead of localStorage"
```

---

### Task 4: 앱 시작 및 채용공고 탭 진입 시 서버에서 목록 동기화

**Files:**
- Modify: `js/app.js:8-14` (`DOMContentLoaded` 핸들러)
- Modify: `js/jobs.js:10-13` (`initJobs`)

**Interfaces:**
- Consumes: Task 3의 `AppState.loadJobsFromServer()`.
- Produces: 앱이 처음 로드될 때, 그리고 "채용공고 관리" 탭에 진입할 때마다 `AppState.jobs`가 서버 최신 상태로 갱신된 뒤 화면이 렌더링됨을 보장.

- [ ] **Step 1: `app.js`의 시작 핸들러를 비동기로 변경**

기존:

```js
document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  initRouter();
  initToastSystem();
  navigateTo('dashboard');
  updateNotifBadge();
});
```

를 아래로 교체:

```js
document.addEventListener('DOMContentLoaded', async () => {
  loadFromStorage();
  initToastSystem();
  await AppState.loadJobsFromServer();
  initRouter();
  navigateTo('dashboard');
  updateNotifBadge();
});
```

(`initToastSystem()`을 `loadJobsFromServer()`보다 먼저 호출하도록 순서를 바꿨다 — 로드 실패 시 뜨는 `showToast` 경고가 토스트 컨테이너가 준비되기 전에 호출되지 않게 하기 위함.)

- [ ] **Step 2: `jobs.js`의 `initJobs`를 비동기로 변경**

기존:

```js
function initJobs() {
  renderJobsPage();
  bindJobsEvents();
}
```

를 아래로 교체:

```js
async function initJobs() {
  await AppState.loadJobsFromServer();
  renderJobsPage();
  bindJobsEvents();
}
```

- [ ] **Step 3: 두 브라우저 탭으로 동기화 확인**

서버 실행 중인 상태에서:

```bash
curl -s -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{"title":"동기화 확인용 공고","status":"draft","category":"사무","company":"(주)테크스타트업","location":"서울","tags":["사무"]}'
```

이후 브라우저에서 `http://localhost:3000` 접속(또는 이미 열려 있으면 새로고침) → "채용공고 관리" 탭 클릭.
Expected: 방금 curl로 만든 "동기화 확인용 공고"가 목록에 보인다. 대시보드 탭의 "최근 공고" 섹션에도 보인다.

방금 만든 테스트 공고 정리:

```bash
curl -s http://localhost:3000/api/jobs   # id 확인
curl -s -X DELETE http://localhost:3000/api/jobs/JOB_ID   # 위에서 확인한 id로 치환
```

- [ ] **Step 4: Commit**

```bash
git add js/app.js js/jobs.js
git commit -m "feat: sync job list from server on app start and jobs tab entry"
```

---

### Task 5: 공고 저장/삭제/상태변경/배포를 서버 API에 연결

**Files:**
- Modify: `js/jobs.js:337-429` (`saveJobFromModal`)
- Modify: `js/jobs.js:536-586` (`openDeployModal`의 `deploy-confirm-btn` 클릭 핸들러)
- Modify: `js/jobs.js:588-598` (`toggleJobStatus`)
- Modify: `js/jobs.js:600-609` (`deleteJob`)

**Interfaces:**
- Consumes: Task 2의 `POST /api/jobs`, `PUT /api/jobs/:id`, `DELETE /api/jobs/:id` 계약.
- Produces: `saveJobFromModal`, `deleteJob`, `toggleJobStatus`, `openDeployModal`의 배포 확정 로직이 모두 `async`가 되지만, 함수 이름/시그니처/`window.*` 바인딩은 기존과 동일하게 유지 — 호출부(HTML의 `onclick`)는 수정할 필요 없음.

- [ ] **Step 1: `saveJobFromModal`을 API 연동으로 교체**

기존 (`js/jobs.js:337-429`) 전체를:

```js
function saveJobFromModal(isDraft = false) {
  const data = getFormDataFromModal();

  // 필수 항목 검증
  if (!data.title) {
    showToast('공고 제목을 입력해주세요.', 'warning');
    document.getElementById('job-form-title')?.focus();
    return;
  }
  if (!data.category) {
    showToast('모집 직종을 입력하거나 추천 칩을 선택해주세요.', 'warning');
    document.getElementById('job-form-category')?.focus();
    return;
  }
  if (!data.location) {
    showToast('근무 지역을 입력해주세요.', 'warning');
    document.getElementById('job-form-location')?.focus();
    return;
  }
  if (!data.deadline) {
    showToast('모집 마감일을 선택해주세요.', 'warning');
    document.getElementById('job-form-deadline')?.focus();
    return;
  }

  const existingJob = currentEditingJobId ? AppState.jobs.find(j => j.id === currentEditingJobId) : null;

  if (existingJob) {
    // 기존 공고 수정
    existingJob.title = data.title;
    existingJob.category = data.category;
    existingJob.department = data.category;
    existingJob.company = data.company;
    existingJob.location = data.location;
    existingJob.headcount = data.headcount;
    existingJob.salary = data.salary;
    existingJob.type = data.type;
    existingJob.workTime = data.workTime;
    existingJob.deadline = data.deadline;
    existingJob.career = data.career;
    existingJob.education = data.education;
    existingJob.benefits = data.benefits;
    existingJob.description = data.description;
    existingJob.qualifications = data.qualifications;
    existingJob.preferred = data.preferred;
    existingJob.companyIntro = data.companyIntro;
    if (isDraft) existingJob.status = 'draft';
  } else {
    // 새 공고 생성 (기본 status: 'draft')
    const newJob = {
      id: 'JOB-' + String(Date.now()).slice(-4),
      title: data.title,
      category: data.category,
      department: data.category,
      company: data.company,
      location: data.location,
      headcount: data.headcount,
      salary: data.salary,
      type: data.type,
      workTime: data.workTime,
      deadline: data.deadline,
      career: data.career,
      education: data.education,
      benefits: data.benefits,
      description: data.description,
      qualifications: data.qualifications,
      preferred: data.preferred,
      companyIntro: data.companyIntro,
      status: 'draft', // 새 공고는 기본 임시저장
      platforms: [],
      views: 0,
      applicants: 0,
      createdAt: new Date().toISOString().split('T')[0],
      deployedAt: null,
      tags: [data.category, data.type, data.career].filter(Boolean),
      aiCopy: !!data.description,
    };
    AppState.jobs.unshift(newJob);
  }

  saveToStorage();
  closeModal('job-modal');
  renderJobsPage();
  if (typeof renderRecentJobs === 'function') renderRecentJobs();
  if (typeof renderKPICards === 'function') renderKPICards();

  showToast(
    isDraft
      ? '💾 공고가 임시저장되었습니다.'
      : '✅ 공고가 저장되었습니다! (임시저장 상태)',
    'success'
  );
}
```

아래 코드로 교체:

```js
async function saveJobFromModal(isDraft = false) {
  const data = getFormDataFromModal();

  // 필수 항목 검증
  if (!data.title) {
    showToast('공고 제목을 입력해주세요.', 'warning');
    document.getElementById('job-form-title')?.focus();
    return;
  }
  if (!data.category) {
    showToast('모집 직종을 입력하거나 추천 칩을 선택해주세요.', 'warning');
    document.getElementById('job-form-category')?.focus();
    return;
  }
  if (!data.location) {
    showToast('근무 지역을 입력해주세요.', 'warning');
    document.getElementById('job-form-location')?.focus();
    return;
  }
  if (!data.deadline) {
    showToast('모집 마감일을 선택해주세요.', 'warning');
    document.getElementById('job-form-deadline')?.focus();
    return;
  }

  const existingJob = currentEditingJobId ? AppState.jobs.find(j => j.id === currentEditingJobId) : null;

  const payload = existingJob
    ? {
        ...existingJob,
        title: data.title,
        category: data.category,
        department: data.category,
        company: data.company,
        location: data.location,
        headcount: data.headcount,
        salary: data.salary,
        type: data.type,
        workTime: data.workTime,
        deadline: data.deadline,
        career: data.career,
        education: data.education,
        benefits: data.benefits,
        description: data.description,
        qualifications: data.qualifications,
        preferred: data.preferred,
        companyIntro: data.companyIntro,
        status: isDraft ? 'draft' : existingJob.status,
      }
    : {
        title: data.title,
        category: data.category,
        department: data.category,
        company: data.company,
        location: data.location,
        headcount: data.headcount,
        salary: data.salary,
        type: data.type,
        workTime: data.workTime,
        deadline: data.deadline,
        career: data.career,
        education: data.education,
        benefits: data.benefits,
        description: data.description,
        qualifications: data.qualifications,
        preferred: data.preferred,
        companyIntro: data.companyIntro,
        status: 'draft', // 새 공고는 기본 임시저장
        platforms: [],
        views: 0,
        applicants: 0,
        createdAt: new Date().toISOString().split('T')[0],
        deployedAt: null,
        tags: [data.category, data.type, data.career].filter(Boolean),
        aiCopy: !!data.description,
      };

  const saveBtn = document.getElementById('job-save-btn');
  if (saveBtn) saveBtn.disabled = true;

  try {
    const url = existingJob ? `/api/jobs/${existingJob.id}` : '/api/jobs';
    const method = existingJob ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `서버 응답 오류 (HTTP ${res.status})`);
    }
    const savedJob = await res.json();

    if (existingJob) {
      Object.assign(existingJob, savedJob);
    } else {
      AppState.jobs.unshift(savedJob);
    }

    closeModal('job-modal');
    renderJobsPage();
    if (typeof renderRecentJobs === 'function') renderRecentJobs();
    if (typeof renderKPICards === 'function') renderKPICards();

    showToast(
      isDraft
        ? '💾 공고가 임시저장되었습니다.'
        : '✅ 공고가 저장되었습니다! (임시저장 상태)',
      'success'
    );
  } catch (e) {
    showToast(`❌ 저장에 실패했습니다: ${e.message}`, 'danger');
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
}
```

- [ ] **Step 2: 브라우저에서 새 공고 등록 확인**

`http://localhost:3000` → "채용공고 관리" → "새 공고 등록" → 필수 항목만 채우고 "저장" 클릭.
Expected: 성공 토스트가 뜨고 모달이 닫히며 목록에 새 공고가 나타난다.

Run: `curl -s http://localhost:3000/api/jobs`
Expected: 방금 등록한 공고가 배열에 포함되어 있다 (즉 서버 DB에 실제로 저장됨, localStorage가 아님).

- [ ] **Step 3: `deleteJob`을 API 연동으로 교체**

기존 (`js/jobs.js:600-609`):

```js
function deleteJob(jobId) {
  if (!confirm('이 공고를 정말 삭제하시겠습니까?')) return;
  AppState.jobs = AppState.jobs.filter(j => j.id !== jobId);
  saveToStorage();
  renderJobsList();
  renderJobStats();
  if (typeof renderRecentJobs === 'function') renderRecentJobs();
  if (typeof renderKPICards === 'function') renderKPICards();
  showToast('공고가 삭제되었습니다.', 'info');
}
```

를 아래로 교체:

```js
async function deleteJob(jobId) {
  if (!confirm('이 공고를 정말 삭제하시겠습니까?')) return;

  try {
    const res = await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 404) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `서버 응답 오류 (HTTP ${res.status})`);
    }
    AppState.jobs = AppState.jobs.filter(j => j.id !== jobId);
    renderJobsList();
    renderJobStats();
    if (typeof renderRecentJobs === 'function') renderRecentJobs();
    if (typeof renderKPICards === 'function') renderKPICards();
    showToast('공고가 삭제되었습니다.', 'info');
  } catch (e) {
    showToast(`❌ 삭제에 실패했습니다: ${e.message}`, 'danger');
  }
}
```

- [ ] **Step 4: `toggleJobStatus`를 API 연동으로 교체**

기존 (`js/jobs.js:588-598`):

```js
function toggleJobStatus(jobId, newStatus) {
  const job = AppState.jobs.find(j => j.id === jobId);
  if (!job) return;
  job.status = newStatus;
  saveToStorage();
  renderJobsList();
  renderJobStats();
  if (typeof renderRecentJobs === 'function') renderRecentJobs();
  if (typeof renderKPICards === 'function') renderKPICards();
  showToast(`공고 상태가 "${newStatus === 'active' ? '진행 중' : '일시정지'}"으로 변경되었습니다.`, 'info');
}
```

를 아래로 교체:

```js
async function toggleJobStatus(jobId, newStatus) {
  const job = AppState.jobs.find(j => j.id === jobId);
  if (!job) return;

  const previousStatus = job.status;
  try {
    const res = await fetch(`/api/jobs/${jobId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...job, status: newStatus }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `서버 응답 오류 (HTTP ${res.status})`);
    }
    const savedJob = await res.json();
    Object.assign(job, savedJob);
    renderJobsList();
    renderJobStats();
    if (typeof renderRecentJobs === 'function') renderRecentJobs();
    if (typeof renderKPICards === 'function') renderKPICards();
    showToast(`공고 상태가 "${newStatus === 'active' ? '진행 중' : '일시정지'}"으로 변경되었습니다.`, 'info');
  } catch (e) {
    job.status = previousStatus;
    showToast(`❌ 상태 변경에 실패했습니다: ${e.message}`, 'danger');
  }
}
```

- [ ] **Step 5: `openDeployModal`의 배포 확정 핸들러를 API 연동으로 교체**

기존 (`js/jobs.js:536-586`) 전체를:

```js
function openDeployModal(job) {
  const modal = document.getElementById('deploy-modal');
  if (!modal) return;

  document.getElementById('deploy-modal-title').textContent = `🚀 배포 플랫폼 선택: ${job.title}`;

  const platformsHtml = Object.values(AppState.platforms).map(p => `
    <label style="display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-4); background: var(--bg-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); cursor: pointer; transition: all var(--transition-fast);">
      <input type="checkbox" name="deploy-platform" value="${p.id}" ${p.connected ? 'checked' : ''} ${!p.connected ? 'disabled' : ''} style="width: 16px; height: 16px; accent-color: var(--accent-primary)">
      <div class="platform-logo-icon" style="background: ${p.color}; width: 28px; height: 28px; font-size: 12px; font-weight: 800; color: white; border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0">${p.icon}</div>
      <div>
        <div style="font-size: var(--text-sm); font-weight: 600; color: var(--text-primary)">${p.name}</div>
        <div style="font-size: var(--text-xs); color: var(--text-muted)">${p.connected ? '연결됨 (즉시 배포 가능)' : '미연결 (설정 필요)'}</div>
      </div>
    </label>
  `).join('');

  document.getElementById('deploy-modal-platforms').innerHTML = platformsHtml;

  document.getElementById('deploy-confirm-btn').onclick = () => {
    const selected = [...document.querySelectorAll('input[name="deploy-platform"]:checked')].map(el => el.value);
    if (selected.length === 0) {
      showToast('최소 1개의 배포 플랫폼을 선택하세요.', 'warning');
      return;
    }
    job.status = 'active';
    job.platforms = selected;
    job.deployedAt = new Date().toISOString().split('T')[0];
    saveToStorage();
    closeModal('deploy-modal');
    renderJobsList();
    renderJobStats();
    if (typeof renderRecentJobs === 'function') renderRecentJobs();
    if (typeof renderKPICards === 'function') renderKPICards();
    if (typeof renderPlatformCards === 'function') renderPlatformCards();
    showToast(`"${job.title}" 공고가 배포되었습니다! 🚀`, 'success');

    AppState.notifications.unshift({
      id: 'N' + Date.now(),
      type: 'success',
      icon: '✅',
      title: '배포 완료',
      desc: `${job.title} 공고가 ${selected.length}개 플랫폼에 게재되었습니다.`,
      time: '방금 전',
      read: false,
    });
    if (typeof updateNotifBadge === 'function') updateNotifBadge();
  };

  modal.classList.remove('hidden');
}
```

를 아래로 교체:

```js
function openDeployModal(job) {
  const modal = document.getElementById('deploy-modal');
  if (!modal) return;

  document.getElementById('deploy-modal-title').textContent = `🚀 배포 플랫폼 선택: ${job.title}`;

  const platformsHtml = Object.values(AppState.platforms).map(p => `
    <label style="display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-4); background: var(--bg-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); cursor: pointer; transition: all var(--transition-fast);">
      <input type="checkbox" name="deploy-platform" value="${p.id}" ${p.connected ? 'checked' : ''} ${!p.connected ? 'disabled' : ''} style="width: 16px; height: 16px; accent-color: var(--accent-primary)">
      <div class="platform-logo-icon" style="background: ${p.color}; width: 28px; height: 28px; font-size: 12px; font-weight: 800; color: white; border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0">${p.icon}</div>
      <div>
        <div style="font-size: var(--text-sm); font-weight: 600; color: var(--text-primary)">${p.name}</div>
        <div style="font-size: var(--text-xs); color: var(--text-muted)">${p.connected ? '연결됨 (즉시 배포 가능)' : '미연결 (설정 필요)'}</div>
      </div>
    </label>
  `).join('');

  document.getElementById('deploy-modal-platforms').innerHTML = platformsHtml;

  document.getElementById('deploy-confirm-btn').onclick = async () => {
    const selected = [...document.querySelectorAll('input[name="deploy-platform"]:checked')].map(el => el.value);
    if (selected.length === 0) {
      showToast('최소 1개의 배포 플랫폼을 선택하세요.', 'warning');
      return;
    }

    const payload = {
      ...job,
      status: 'active',
      platforms: selected,
      deployedAt: new Date().toISOString().split('T')[0],
    };

    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `서버 응답 오류 (HTTP ${res.status})`);
      }
      const savedJob = await res.json();
      Object.assign(job, savedJob);

      closeModal('deploy-modal');
      renderJobsList();
      renderJobStats();
      if (typeof renderRecentJobs === 'function') renderRecentJobs();
      if (typeof renderKPICards === 'function') renderKPICards();
      if (typeof renderPlatformCards === 'function') renderPlatformCards();
      showToast(`"${job.title}" 공고가 배포되었습니다! 🚀`, 'success');

      AppState.notifications.unshift({
        id: 'N' + Date.now(),
        type: 'success',
        icon: '✅',
        title: '배포 완료',
        desc: `${job.title} 공고가 ${selected.length}개 플랫폼에 게재되었습니다.`,
        time: '방금 전',
        read: false,
      });
      if (typeof updateNotifBadge === 'function') updateNotifBadge();
    } catch (e) {
      showToast(`❌ 배포 처리 중 오류: ${e.message}`, 'danger');
    }
  };

  modal.classList.remove('hidden');
}
```

- [ ] **Step 6: 삭제/상태변경/배포 브라우저 확인**

`http://localhost:3000`에서:
1. Task 5-Step 2에서 만든 테스트 공고를 "🗑️ 삭제" → 확인 토스트 뜨고 목록에서 사라짐. `curl -s http://localhost:3000/api/jobs`로 실제 DB에서도 사라졌는지 확인.
2. 새 공고를 하나 등록한 뒤 "🚀 배포" → 플랫폼 하나 선택 후 "배포 시작" → 상태가 "진행 중"으로 바뀌고 배포 완료 토스트/알림이 뜨는지 확인.
3. 진행 중인 공고에서 "⏸️ 정지" → 상태가 "일시정지"로 바뀌는지 확인.
4. 서버를 잠시 종료(`Ctrl+C`)한 상태에서 아무 저장 동작(예: 상태 변경)을 시도 → 에러 토스트("❌ ... 실패했습니다: ...")가 뜨고, 화면 상태는 실패 이전으로 되돌아가는지(낙관적 갱신이 롤백되는지) 확인. 서버를 다시 켜고 정상 동작 재확인.

- [ ] **Step 7: Commit**

```bash
git add js/jobs.js
git commit -m "feat: wire job save/delete/status/deploy actions to the jobs API"
```
