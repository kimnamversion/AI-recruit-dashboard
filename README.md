# AI 채용광고 자동배포 대시보드

잡코리아·사람인·워크넷·네이버 카페에 걸치는 채용공고를 한 곳에서 등록·관리하는 대시보드입니다. 실제로 동작하는 부분과 아직 목업인 부분이 섞여 있으니, 아래 "구현 현황"을 먼저 확인하세요.

## 질문
- 웹 페이지 구조가 어떤 구조로 되어있는지 궁금합니다. 우리가 호스팅하는 웹 서버로 웹을 띄우고 클라이언트가 우리 웹서버에 들어와서 보는 구조가 맞는건가요?

## 구성

- **프론트엔드**: 순수 HTML/CSS/JS (`index.html`, `css/`, `js/`). 빌드 도구·프레임워크·npm 의존성 없음. 페이지별로 파일이 나뉘어 있고, 전역 상태(`AppState`)를 함께 조작합니다.
- **백엔드**: `server/server.js` 하나짜리 Node.js + Express 서버.
  - 네이버 로그인(OAuth 2.0)과 네이버 카페 글쓰기 API를 대신 호출해주는 프록시.
  - 채용공고 데이터를 저장하는 REST API (`/api/jobs`, CRUD).
- **데이터베이스**: PostgreSQL. `pg`(node-postgres) 패키지로 접속하고, `jobs` 테이블 하나(`id`, `data JSONB`, `updated_at`)에 공고 전체를 JSON으로 저장합니다. ORM 없이 순수 SQL만 씁니다.

## 구현 현황

- 네이버 카페 게시 기능이 구현되어있는지는 확실치 않음.

| 기능 | 상태 |
|---|---|
| 채용공고 등록/수정/삭제/배포 | ✅ 실제 — 여러 사용자가 인터넷으로 접속해도 Postgres에 저장된 같은 목록을 공유 |
| 네이버 카페 게시 | ✅ 실제 — 진짜 네이버 OAuth 로그인 + 진짜 게시 API 호출 |
| 잡코리아 / 사람인 / 워크넷 게시 | ❌ 목업 — 사이트별 포맷의 광고문구 텍스트만 생성, 사용자가 직접 복사/붙여넣기 해야 함 (각 사이트에 공개 등록 API가 없음) |
| AI 문구 생성 | 아직 없음 — 붙이려면 서버에 LLM 프록시 라우트 추가 필요 |
| 로그인/계정 구분 | 없음 — 지금은 URL에 접속하는 누구나 공고 목록을 보고 수정 가능 |

자세한 배경은 `CLAUDE.md`, 채용공고 공유 저장소 설계는 `docs/superpowers/specs/2026-09-07-shared-job-storage-design.md`와 `docs/superpowers/plans/2026-09-07-shared-job-storage.md`를 참고하세요.

## 로컬 실행

```bash
cd server
npm install
npm start        # 또는: node server.js
# 또는 Windows에서 server/시작.bat 더블클릭
```

서버가 `http://localhost:3000`에서 프론트엔드까지 함께 서빙합니다.

### 필요한 설정 (`server/.env`)

`server/.env.example`을 복사해 `server/.env`로 만들고 값을 채우세요.

- `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET` — [네이버 개발자센터](https://developers.naver.com)에서 발급. 없으면 서버는 뜨지만 네이버 로그인/게시 기능만 비활성화됩니다.
- `DATABASE_URL` — Postgres 연결 문자열. 없으면 서버는 뜨지만 채용공고 저장(`/api/jobs`) 기능만 비활성화됩니다. 로컬 개발 시에는 로컬 Postgres 또는 Docker(`docker run -e POSTGRES_PASSWORD=... -p 5432:5432 postgres:16`)로 붙일 수 있습니다.

## 배포

Render(무료 웹서비스 + 무료 Postgres)를 염두에 두고 설계했습니다. Render Free Postgres는 약 90일 후 만료되어 재생성이 필요하다는 점 참고하세요. 자세한 배포 전제는 위 설계 문서를 참고하세요.
