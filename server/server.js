/**
 * server.js — AI 채용공고 대시보드: 네이버 카페 실제 게시용 백엔드 프록시 서버
 *
 * 이 서버가 하는 일 (딱 이것만 합니다):
 *   1. 네이버 로그인(OAuth 2.0) 창을 띄우고, 로그인 후 받은 코드로 진짜 Access Token을 발급받는다.
 *   2. 발급받은 Access Token은 이 서버 안(naver_token.json)에만 저장한다. 브라우저(프론트엔드)로는 절대 넘기지 않는다.
 *   3. 대시보드가 "게시" 버튼을 누르면, 이 서버가 대신 네이버 공식 API를 호출하고
 *      네이버가 실제로 응답한 내용을 그대로(가감 없이) 대시보드에 돌려준다.
 *
 * 절대 하지 않는 일:
 *   - 네이버 서버 응답 없이 "성공"을 지어내는 것
 *   - 가짜 게시글 번호/URL을 만드는 것
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { Pool } = require('pg');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 어떤 방식으로 대시보드에 접속하든(파일 직접 열기 포함) API 호출이 막히지 않도록 허용
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const PORT = process.env.PORT || 3000;
const CLIENT_ID = process.env.NAVER_CLIENT_ID || '';
const CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.NAVER_REDIRECT_URI || `http://localhost:${PORT}/callback`;

const TOKEN_FILE = path.join(__dirname, 'naver_token.json');

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

// 유휴 커넥션에서 예기치 않은 오류가 발생했을 때(예: Postgres 재시작, 연결 리셋)
// 프로세스 크래시를 방지하고 로그에 기록한다.
if (pool) {
  pool.on('error', (err) => {
    console.error('⚠️  Postgres 커넥션 풀에서 예기치 않은 오류가 발생했습니다:', err.message);
  });
}

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

function loadToken() {
  try {
    if (!fs.existsSync(TOKEN_FILE)) return null;
    return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8'));
  } catch (e) {
    return null;
  }
}

function saveToken(tokenData) {
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokenData, null, 2), 'utf-8');
}

function clearToken() {
  try {
    if (fs.existsSync(TOKEN_FILE)) fs.unlinkSync(TOKEN_FILE);
  } catch (e) {
    /* noop */
  }
}

// ================================================
// 정적 파일 서빙: 프로젝트 루트(index.html, css/, js/)를
// http://localhost:3000/ 로 그대로 제공한다.
// ================================================
const PROJECT_ROOT = path.join(__dirname, '..');
app.use(express.static(PROJECT_ROOT));

// ================================================
// 1) 네이버 로그인 시작
// ================================================
app.get('/api/naver/oauth/start', (req, res) => {
  if (!CLIENT_ID) {
    return res
      .status(500)
      .send('서버에 NAVER_CLIENT_ID가 설정되어 있지 않습니다. server 폴더의 .env 파일을 확인해주세요.');
  }
  const state = Math.random().toString(36).substring(2, 15);
  const authUrl =
    `https://nid.naver.com/oauth2.0/authorize?response_type=code` +
    `&client_id=${encodeURIComponent(CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&state=${state}`;
  res.redirect(authUrl);
});

// ================================================
// 2) 네이버 로그인 콜백: 인가 코드 -> 실제 Access Token 교환
// ================================================
app.get('/callback', async (req, res) => {
  const { code, state, error, error_description: errorDescription } = req.query;

  if (error) {
    return res.send(
      `<div style="font-family:sans-serif;padding:40px">
         <h2>❌ 네이버 로그인 실패</h2>
         <p>${errorDescription || error}</p>
         <p>이 창을 닫고 다시 시도해주세요.</p>
       </div>`
    );
  }

  if (!code) {
    return res.status(400).send('인가 코드(code)가 전달되지 않았습니다.');
  }

  try {
    const tokenUrl =
      `https://nid.naver.com/oauth2.0/token?grant_type=authorization_code` +
      `&client_id=${encodeURIComponent(CLIENT_ID)}` +
      `&client_secret=${encodeURIComponent(CLIENT_SECRET)}` +
      `&code=${encodeURIComponent(code)}` +
      `&state=${encodeURIComponent(state || '')}`;

    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      return res.send(
        `<div style="font-family:sans-serif;padding:40px">
           <h2>❌ 토큰 발급 실패</h2>
           <pre>${escapeHtmlServer(JSON.stringify(tokenData, null, 2))}</pre>
           <p>Client ID/Secret 및 Callback URL 등록 값을 다시 확인해주세요.</p>
         </div>`
      );
    }

    saveToken({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || null,
      obtained_at: Date.now(),
    });

    res.send(`
      <div style="font-family:sans-serif;padding:40px;text-align:center">
        <h2>✅ 네이버 계정 연결 완료</h2>
        <p>이 창을 닫고 대시보드로 돌아가서 "연결 상태 새로고침"을 눌러주세요.</p>
        <script>setTimeout(function(){ try { window.close(); } catch(e) {} }, 3000);</script>
      </div>
    `);
  } catch (e) {
    res.status(500).send(`<pre>오류: ${escapeHtmlServer(String(e))}</pre>`);
  }
});

// ================================================
// 3) 연결 상태 확인
// ================================================
app.get('/api/naver/status', (req, res) => {
  const token = loadToken();
  res.json({ connected: Boolean(token && token.access_token) });
});

// ================================================
// 4) 연결 해제
// ================================================
app.post('/api/naver/disconnect', (req, res) => {
  clearToken();
  res.json({ ok: true });
});

// ================================================
// 5) 실제 네이버 카페 게시 (진짜 프록시)
//    - 프론트엔드는 accessToken을 절대 직접 다루지 않는다.
//    - 네이버의 실제 응답(성공이든 실패든)을 있는 그대로 프론트로 전달한다.
//    - 이 서버는 어떤 경우에도 가짜 성공 응답을 만들어내지 않는다.
// ================================================
app.post('/api/naver/cafe/publish', async (req, res) => {
  const token = loadToken();
  if (!token || !token.access_token) {
    return res.status(401).json({
      message: { error: { msg: '네이버 계정이 연결되어 있지 않습니다. 먼저 로그인해주세요.' } },
    });
  }

  const { clubId, menuId, subject, content } = req.body || {};
  if (!clubId || !menuId || !subject) {
    return res.status(400).json({
      message: { error: { msg: 'clubId, menuId, subject는 필수 값입니다.' } },
    });
  }

  try {
    const apiUrl = `https://openapi.naver.com/v1/cafe/${encodeURIComponent(clubId)}/menu/${encodeURIComponent(menuId)}/articles`;
    const body = new URLSearchParams({ subject, content: content || '' });

    const naverRes = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const data = await naverRes.json().catch(() => ({}));
    // 네이버가 실제로 보낸 상태 코드와 본문을 그대로 전달한다 (가공/조작 금지)
    res.status(naverRes.status).json(data);
  } catch (e) {
    res.status(502).json({
      message: { error: { msg: `네이버 서버 호출 중 오류가 발생했습니다: ${e.message}` } },
    });
  }
});

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

function escapeHtmlServer(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

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
