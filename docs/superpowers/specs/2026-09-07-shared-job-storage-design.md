# 채용공고 데이터 공유 저장소 설계

## 배경 및 목적

현재 채용공고(`AppState.jobs`) 데이터는 브라우저 `localStorage`에만 저장된다 (`js/data.js:217-218`, 키 `adDashboard_jobs`). 이 때문에 같은 대시보드를 여러 사용자가 인터넷을 통해 원격으로 접속해도 서로 다른 공고 목록을 보게 된다.

이 설계는 채용공고 데이터를 서버(Postgres)에 저장하고, 모든 사용자가 REST API를 통해 같은 목록을 읽고 쓰도록 바꾼다.

## 범위

- **포함**: `AppState.jobs`(채용공고) 데이터의 서버 저장 및 공유.
- **제외**:
  - 로그인/계정 구분 — 아직 도입하지 않음. 이 URL에 접속하는 누구나 목록을 보고 수정할 수 있음.
  - `AppState.platforms`(플랫폼 연동 상태), 알림, 배포 이력, 통계 — 계속 로컬(`localStorage`)에 남거나 데모 데이터로 유지. 공유 대상 아님.
  - 실시간 동기화(폴링/WebSocket) — 페이지 새로고침/탭 이동 시에만 서버에서 다시 가져온다. 다른 사용자의 변경사항은 자동으로 반영되지 않는다.
  - 네이버 카페 게시 로직 — 기존 그대로, 이번 변경과 무관.

## 배포/운영 전제

- Render 무료 웹 서비스 + Render 무료 Postgres를 사용한다 (사용자 확인, 비용 $0).
- Render 무료 Postgres는 **약 90일 후 만료**되어 재생성이 필요하다. 만료 전 수동 백업(`pg_dump`) 또는 유료 전환이 필요하며, 이는 Render 정책상 코드로 해결할 수 없는 운영상의 한계로 문서에만 남긴다.
- Render 무료 웹 서비스는 15분 미사용 시 슬립되며 첫 요청 시 재기동 지연(수십 초)이 있다.
- Render 무료 웹 서비스는 영구 디스크를 지원하지 않으므로 파일 기반 저장(JSON/SQLite 파일)은 재배포/재시작 시 소실된다 — 이 때문에 파일 저장 방식은 채택하지 않는다.

## 데이터 모델

Postgres에 테이블 하나를 추가한다. 기존 job 객체 필드(20여 개)를 컬럼으로 쪼개지 않고 JSONB 한 컬럼에 그대로 저장해, 프론트 필드가 추가/변경돼도 스키마 마이그레이션이 필요 없게 한다.

```sql
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- `id`는 현재 프론트에서 쓰는 `'JOB-' + Date.now().slice(-4)` 형식 대신, 서버가 `crypto.randomUUID()`로 생성해 부여한다 — 여러 사용자가 동시에 생성해도 충돌하지 않도록.
- `data`는 현재 `getFormDataFromModal()`/저장 로직이 만드는 job 객체 형태를 그대로 담는다 (title, category, company, location, headcount, salary, type, workTime, deadline, career, education, benefits, description, qualifications, preferred, companyIntro, status, platforms, views, applicants, createdAt, deployedAt, tags 등).

## 백엔드 API (`server/server.js`)

기존 서버는 "네이버 카페 프록시"에 충실한 얇은 구조를 유지해왔다. 이번 추가도 같은 원칙(가공/조작 없이 DB 응답을 정직하게 relay)을 따른다.

- `GET /api/jobs` → 전체 공고 목록을 배열로 반환 (`[{ id, ...data }, ...]`, `updated_at` 내림차순).
- `POST /api/jobs` → body로 받은 job 데이터로 새 row 생성, 서버가 `id` 부여 후 생성된 객체 반환.
- `PUT /api/jobs/:id` → 해당 id의 `data`를 갱신, 갱신된 객체 반환. 존재하지 않으면 404.
- `DELETE /api/jobs/:id` → 해당 row 삭제, 204 반환. 존재하지 않으면 404.
- DB 연결은 `pg` 패키지 + Render가 자동 주입하는 `DATABASE_URL` 환경변수 사용. 연결 실패/쿼리 오류는 500으로 있는 그대로 전달한다 (성공한 것처럼 꾸미지 않음 — 기존 네이버 프록시 규칙과 동일한 정신).
- 서버 시작 시 위 `CREATE TABLE IF NOT EXISTS` 를 실행해 테이블이 없으면 생성한다.

## 프론트엔드 변경

- **`js/data.js`**:
  - `saveToStorage()`/`loadFromStorage()`에서 `jobs` 관련 localStorage 읽기/쓰기 제거 (platforms는 그대로 유지).
  - `AppState.loadJobsFromServer()` 추가: `GET /api/jobs` 호출해 `AppState.jobs`를 채우고, 실패 시 토스트로 에러 표시(빈 배열로 두고 계속 진행 — 앱이 죽지 않도록).
  - 앱 최초 로드 시(`app.js`의 `DOMContentLoaded`) 및 `채용공고 관리` 탭 진입 시(`initJobs()`) `loadJobsFromServer()`를 호출한다.
- **`js/jobs.js`**:
  - `saveJobFromModal(isDraft)` → `async`로 변경. 신규는 `POST /api/jobs`, 수정은 `PUT /api/jobs/:id` 호출. 성공 시 응답으로 `AppState.jobs` 갱신 후 모달 닫고 재렌더 + 토스트. 실패 시 에러 토스트만 띄우고 모달은 열어둔 채로 입력 내용을 보존한다.
  - `deleteJob(jobId)` → `async`로 변경, 확인(`confirm()`) 후 `DELETE /api/jobs/:id` 호출, 성공 시 로컬 배열에서도 제거 후 재렌더. 실패 시 에러 토스트, 목록은 그대로 유지(낙관적 삭제 금지).
  - `toggleJobStatus(jobId, newStatus)`, `deployJob`의 배포 확정 콜백 → 동일하게 `PUT /api/jobs/:id`로 상태/플랫폼 변경 후 서버 응답 반영.
  - 위 함수들의 호출부(버튼 `onclick`)는 `async` 함수를 그대로 호출하되 결과를 기다릴 필요는 없음 (fire-and-forget처럼 보이지만 함수 내부에서 await 처리).

## 에러 처리 원칙

- 네트워크 오류/서버 다운/DB 오류 시: 기존 데이터를 함부로 지우거나 성공한 것처럼 보이지 않는다. 실패를 토스트로 명확히 알리고, 사용자가 입력한 내용(모달 폼)은 그대로 남겨 재시도할 수 있게 한다.
- 서버가 처음 슬립 상태에서 깨어나는 동안(Render 무료 슬립)의 첫 요청 지연은 별도 로딩 UX 없이 그냥 기다리게 둔다 (범위 밖 — 필요해지면 별도 논의).

## 테스트 계획

- 백엔드: `curl`로 4개 엔드포인트 각각 정상 동작 확인 (생성 → 조회에 반영 → 수정 → 삭제 → 조회에서 사라짐), DB 연결 끊었을 때 500이 오는지 확인.
- 프론트: 브라우저 두 개(또는 시크릿창 포함)로 동시에 열어서 한쪽에서 등록한 공고가 다른 쪽에서 새로고침 시 보이는지 확인. 서버 응답 실패를 흉내내(예: API URL 오타로 임시 유도) 에러 토스트와 모달 유지 여부 확인.
- 기존 네이버 카페 연동 플로우가 이번 변경으로 깨지지 않았는지 회귀 확인.
