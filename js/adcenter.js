/**
 * adcenter.js — 광고/배포 센터 및 네이버 카페 공식 API 연동 로직
 */

/* ================================================
   채널 데이터 정의
   ================================================ */
const AD_CHANNELS = [
  // 🟢 무료/저비용 우선 (무료)
  {
    id: 'naver_blog',
    name: '네이버 블로그',
    desc: '검색 노출 최적화 상세 포스팅형',
    category: 'free',
    costLabel: '무료',
    costClass: 'cost-badge-free',
    icon: '🟩',
    iconBg: '#03C75A22',
    iconColor: '#03C75A',
    format: '상세형 (검색 최적화)',
    planStatus: 'blocked',
    planNote: '2020년 5월 네이버가 블로그 글쓰기 오픈 API를 완전히 폐지해 자동 게시가 불가능합니다.',
  },
  {
    id: 'naver_cafe',
    name: '네이버 카페',
    desc: '지역 맘카페 / 구인 커뮤니티 자동게시 지원',
    category: 'free',
    costLabel: '무료',
    costClass: 'cost-badge-free',
    icon: '☕',
    iconBg: '#03C75A22',
    iconColor: '#03C75A',
    format: '지역/구인정보형 (공식 API 지원)',
    isSpecial: true,
  },
  {
    id: 'naver_band',
    name: '네이버 밴드',
    desc: '동네 소모임 / 현장직 모바일 소통형',
    category: 'free',
    costLabel: '무료',
    costClass: 'cost-badge-free',
    icon: '🅱️',
    iconBg: '#00D56522',
    iconColor: '#00D565',
    format: '커뮤니티/모바일형',
    planStatus: 'possible',
    planNote: '밴드 Open API(write_post)로 자동 게시가 가능합니다. 아직 미구현 상태이며 추후 연동 예정입니다.',
  },
  {
    id: 'instagram',
    name: '인스타그램',
    desc: '카드뉴스 캡션 및 해시태그 홍보형',
    category: 'free',
    costLabel: '무료',
    costClass: 'cost-badge-free',
    icon: '📸',
    iconBg: '#E1306C22',
    iconColor: '#E1306C',
    format: '짧은 홍보형 + 해시태그',
    planStatus: 'possible',
    planNote: 'Meta Instagram Graph API(콘텐츠 게시)로 연동 가능합니다. 비즈니스 계정 전환과 앱 심사가 필요하며 아직 미구현입니다.',
  },
  {
    id: 'facebook',
    name: '페이스북',
    desc: '피드 공유 및 타임라인 스토리형',
    category: 'free',
    costLabel: '무료',
    costClass: 'cost-badge-free',
    icon: '📘',
    iconBg: '#1877F222',
    iconColor: '#1877F2',
    format: '공유/피드형',
    planStatus: 'possible',
    planNote: 'Meta Facebook Graph API(페이지 게시)로 연동 가능합니다. 페이지 소유 및 앱 권한 승인이 필요하며 아직 미구현입니다.',
  },
  {
    id: 'youtube_shorts',
    name: '유튜브 쇼츠',
    desc: '30초 숏폼 채용 영상 낭독/자막 대본형',
    category: 'free',
    costLabel: '무료',
    costClass: 'cost-badge-free',
    icon: '▶️',
    iconBg: '#FF000022',
    iconColor: '#FF0000',
    format: '30초 영상 대본형',
    planStatus: 'possible',
    planNote: 'YouTube Data API(videos.insert)로 업로드가 가능하지만, 텍스트 카피가 아니라 실제 영상 파일 제작이 먼저 필요합니다. 아직 미구현입니다.',
  },
  // 🟢 무료/저비용 (저비용)
  {
    id: 'kakaotalk',
    name: '카카오톡 채널',
    desc: '친구 알림톡 및 1:1 채팅 콤팩트 안내형',
    category: 'low',
    costLabel: '저비용',
    costClass: 'cost-badge-low',
    icon: '💬',
    iconBg: '#FEE50022',
    iconColor: '#FEE500',
    format: '짧은 안내/알림톡형',
    planStatus: 'unclear',
    planNote: "카카오톡 채널 '소식' 자동 게시용 공개 API 여부가 명확하지 않습니다. 카카오비즈니스 메시지(알림톡/친구톡) API는 별도 채널 심사가 필요합니다.",
  },
  // 🟡 채용 플랫폼
  {
    id: 'worknet',
    name: '고용24 (워크넷)',
    desc: '정부 공공 채용 포털 표준 공고형',
    category: 'free',
    costLabel: '무료',
    costClass: 'cost-badge-free',
    icon: '🏢',
    iconBg: '#00833E22',
    iconColor: '#00833E',
    format: '공공 표준 공고형',
    planStatus: 'blocked',
    planNote: '공공데이터포털 Open API는 채용정보 조회 전용으로 보입니다. 게시는 고용24 사업주 계정 승인 절차가 필요해 확인이 더 필요합니다.',
  },
  {
    id: 'saramin',
    name: '사람인',
    desc: '국내 대표 채용 플랫폼 인재 유입형',
    category: 'paid',
    costLabel: '유료/확인 필요',
    costClass: 'cost-badge-paid',
    icon: '🔵',
    iconBg: '#0066CC22',
    iconColor: '#0066CC',
    format: '플랫폼 지원자 유입형',
    planStatus: 'blocked',
    planNote: '자체 self-serve 게시 API가 없습니다. 유료 광고주 제휴 계약(비즈니스 파트너십)이 필요합니다.',
  },
  {
    id: 'jobkorea',
    name: '잡코리아',
    desc: '전문 구인구직 헤드헌팅 공고형',
    category: 'paid',
    costLabel: '유료/확인 필요',
    costClass: 'cost-badge-paid',
    icon: '🔴',
    iconBg: '#E8421A22',
    iconColor: '#E8421A',
    format: '플랫폼 공고형',
    planStatus: 'blocked',
    planNote: '자체 self-serve 게시 API가 없습니다. 유료 광고주 제휴 계약(비즈니스 파트너십)이 필요합니다.',
  },
];

/* ================================================
   네이버 OAuth 2.0 & API 전용 설정 상태
   ================================================ */
const NaverAuthConfig = {
  clientId: '',
  clientSecret: '',
  redirectUri: 'http://localhost:3000/callback',
  accessToken: '',
  isConnected: false,   // ⚠️ 오직 백엔드 서버(/api/naver/status)의 실제 응답으로만 true가 된다.
  connectedAt: null,
  accountName: '',
};

/* ================================================
   실제 게시를 대신 처리해주는 백엔드 프록시 서버 주소
   (server 폴더의 시작.bat 으로 실행하는 그 서버)
   - index.html을 http://localhost:3000 으로 접속했다면 상대경로로도 동작하지만,
     파일을 더블클릭해서 열었을 때(file://)도 동작하도록 절대주소를 기본값으로 둔다.
   ================================================ */
const NAVER_API_BASE = 'http://localhost:3000';

/* ================================================
   광고/배포 센터 전역 상태
   ================================================ */
const AdCenterState = {
  selectedJobId: null,
  costFilter: 'all',
  channelSelections: {},
  channelCopies: {},
  channelStatuses: {}, // '대기', '문구 생성완료', '복사완료', '게시 준비', '게시 완료', '게시 실패'
  naverCafeResults: {}, // { [jobId]: { publishedAt, clubName, menuName, articleUrl, articleId } }

  getSelectedJob() {
    if (!this.selectedJobId && AppState.jobs.length > 0) {
      this.selectedJobId = AppState.jobs[0].id;
    }
    return AppState.jobs.find(j => j.id === this.selectedJobId) || AppState.jobs[0] || null;
  },

  getJobCopy(channelId) {
    const job = this.getSelectedJob();
    if (!job) return '';
    return this.channelCopies[job.id]?.[channelId] || '';
  },

  setJobCopy(channelId, text) {
    const job = this.getSelectedJob();
    if (!job) return;
    if (!this.channelCopies[job.id]) this.channelCopies[job.id] = {};
    this.channelCopies[job.id][channelId] = text;
    saveAdCenterStorage();
  },

  getJobStatus(channelId) {
    const job = this.getSelectedJob();
    if (!job) return '대기';
    return this.channelStatuses[job.id]?.[channelId] || '대기';
  },

  setJobStatus(channelId, status) {
    const job = this.getSelectedJob();
    if (!job) return;
    if (!this.channelStatuses[job.id]) this.channelStatuses[job.id] = {};
    this.channelStatuses[job.id][channelId] = status;
    saveAdCenterStorage();
  },

  getNaverCafeResult(jobId) {
    const jId = jobId || this.getSelectedJob()?.id;
    if (!jId) return null;
    return this.naverCafeResults[jId] || null;
  },

  setNaverCafeResult(jobId, result) {
    const jId = jobId || this.getSelectedJob()?.id;
    if (!jId) return;
    this.naverCafeResults[jId] = result;
    saveAdCenterStorage();
  },
};

/* ================================================
   초기화 및 렌더링
   ================================================ */
function initAdCenter() {
  loadAdCenterStorage();
  
  AD_CHANNELS.forEach(ch => {
    if (AdCenterState.channelSelections[ch.id] === undefined) {
      AdCenterState.channelSelections[ch.id] = (ch.category === 'free');
    }
  });

  renderAdCenterHeader();
  renderAdCenterGrid();
  bindAdCenterEvents();

  // 페이지 진입 시 백엔드 서버의 실제 네이버 연결 상태를 확인한다.
  // (서버가 꺼져있으면 자동으로 "미연결"로 처리되며, 화면이 멈추지 않는다)
  refreshNaverConnectionStatus();
}

/* ================================================
   상단 공고 선택 및 요약 카드 렌더링
   ================================================ */
function renderAdCenterHeader() {
  const container = document.getElementById('adcenter-header-area');
  if (!container) return;

  const jobs = AppState.jobs;
  const currentJob = AdCenterState.getSelectedJob();

  if (!currentJob || jobs.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: var(--space-8)">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-title">등록된 채용공고가 없습니다</div>
        <div class="empty-state-desc">먼저 [채용공고 관리]에서 새 공고를 등록해주세요.</div>
        <button class="btn btn-primary btn-sm" style="margin-top: var(--space-4)" onclick="navigateTo('jobs'); setTimeout(() => openJobModal(), 200)">
          ➕ 새 공고 등록하러 가기
        </button>
      </div>
    `;
    return;
  }

  const jobOptionsHtml = jobs.map(j => `
    <option value="${j.id}" ${j.id === currentJob.id ? 'selected' : ''}>
      [${j.status === 'active' ? '진행중' : j.status === 'paused' ? '일시정지' : '임시저장'}] ${escapeHtml(j.title)} (${j.company || '당사'})
    </option>
  `).join('');

  container.innerHTML = `
    <div class="adcenter-header-card">
      <div class="flex-between" style="flex-wrap: wrap; gap: var(--space-3); margin-bottom: var(--space-3)">
        <div style="display: flex; align-items: center; gap: var(--space-2)">
          <span style="font-size: 22px">📣</span>
          <div>
            <div style="font-size: var(--text-lg); font-weight: 700; color: var(--text-primary)">배포 대상 채용공고 선택</div>
            <div style="font-size: var(--text-xs); color: var(--text-muted)">광고 문구를 생성하고 배포를 관리할 공고를 선택하세요</div>
          </div>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="navigateTo('jobs')">
          📋 공고 목록 관리
        </button>
      </div>

      <div class="adcenter-job-select-row">
        <select id="adcenter-job-dropdown" class="form-select" style="flex: 1; min-width: 280px; font-weight: 600; font-size: var(--text-sm)" onchange="onAdCenterJobChanged(this.value)">
          ${jobOptionsHtml}
        </select>
      </div>

      <!-- 선택된 공고 핵심 정보 요약 칩 그리드 -->
      <div class="adcenter-job-summary-box">
        <div class="adcenter-summary-item">
          <div class="adcenter-summary-label">📌 공고 제목</div>
          <div class="adcenter-summary-val" title="${escapeHtml(currentJob.title)}">${escapeHtml(currentJob.title)}</div>
        </div>
        <div class="adcenter-summary-item">
          <div class="adcenter-summary-label">💼 모집 직종</div>
          <div class="adcenter-summary-val">${escapeHtml(currentJob.category || currentJob.department || '일반')}</div>
        </div>
        <div class="adcenter-summary-item">
          <div class="adcenter-summary-label">📍 근무 지역</div>
          <div class="adcenter-summary-val">${escapeHtml(currentJob.location || '지역 협의')}</div>
        </div>
        <div class="adcenter-summary-item">
          <div class="adcenter-summary-label">💰 급여 조건</div>
          <div class="adcenter-summary-val" style="color: var(--accent-secondary)">${escapeHtml(currentJob.salary || '협의')}</div>
        </div>
        <div class="adcenter-summary-item">
          <div class="adcenter-summary-label">📅 모집 마감일</div>
          <div class="adcenter-summary-val" style="color: var(--accent-warning)">~${escapeHtml(currentJob.deadline || '상시채용')}</div>
        </div>
      </div>
    </div>
  `;
}

/* ================================================
   채널 카드 그리드 렌더링
   ================================================ */
function renderAdCenterGrid() {
  const container = document.getElementById('adcenter-channels-grid');
  if (!container) return;

  const currentJob = AdCenterState.getSelectedJob();
  if (!currentJob) {
    container.innerHTML = '';
    return;
  }

  // 비용 필터 적용
  let channels = AD_CHANNELS;
  if (AdCenterState.costFilter !== 'all') {
    channels = channels.filter(c => c.category === AdCenterState.costFilter);
  }

  const statusBadgeMap = {
    'API 연결 필요': { class: 'badge-inactive', dot: '#8b9ab8' },
    '연결 준비':     { class: 'badge-warning',  dot: '#f59e0b' },
    '연결 완료':     { class: 'badge-active',   dot: '#22d3a0' },
    '대기':          { class: 'badge-inactive', dot: '#8b9ab8' },
    '문구 생성완료': { class: 'badge-info',     dot: '#38bdf8' },
    '복사완료':      { class: 'badge-primary',  dot: '#6c63ff' },
    '게시 준비':     { class: 'badge-warning',  dot: '#f59e0b' },
    '게시 완료':     { class: 'badge-active',   dot: '#22d3a0' },
    '배포완료':      { class: 'badge-active',   dot: '#22d3a0' },
    '게시 불가':     { class: 'badge-danger',   dot: '#f43f5e' },
    '게시 실패':     { class: 'badge-danger',   dot: '#f43f5e' },
    '실패':          { class: 'badge-danger',   dot: '#f43f5e' },
  };

  container.innerHTML = channels.map(ch => {
    const isSelected = !!AdCenterState.channelSelections[ch.id];
    const copyText = AdCenterState.getJobCopy(ch.id);
    let status = AdCenterState.getJobStatus(ch.id);

    // 네이버 카페 특화 상태 처리
    if (ch.id === 'naver_cafe') {
      if (!NaverAuthConfig.isConnected && (status === '대기' || status === '문구 생성완료')) {
        status = 'API 연결 필요';
      }
    }

    const badgeInfo = statusBadgeMap[status] || statusBadgeMap['대기'];

    // 네이버 카페 전용 카드 렌더링
    if (ch.id === 'naver_cafe') {
      const cafeResult = AdCenterState.getNaverCafeResult();
      return `
        <div class="channel-card channel-naver-cafe ${isSelected ? 'selected' : ''}" id="channel-card-naver_cafe">
          <!-- 카드 헤더 -->
          <div class="channel-card-header">
            <div class="channel-card-title-group">
              <input type="checkbox" 
                id="chk-channel-naver_cafe" 
                ${isSelected ? 'checked' : ''} 
                onchange="onChannelSelectionChanged('naver_cafe', this.checked)"
                style="width: 18px; height: 18px; accent-color: #03C75A; cursor: pointer"
              >
              <div class="channel-icon-box" style="background: rgba(3, 199, 90, 0.15); color: #03C75A; font-weight: 800">
                ☕ N
              </div>
              <div>
                <div class="channel-name" style="display: flex; align-items: center; gap: 6px">
                  네이버 카페 <span class="naver-brand-badge">API 자동게시</span>
                </div>
                <div class="channel-desc">${ch.desc}</div>
              </div>
            </div>

            <div class="channel-badges-group">
              <span class="cost-badge-free">무료</span>
              <span class="badge ${badgeInfo.class}" id="status-badge-naver_cafe">
                <span class="badge-dot" style="background: ${badgeInfo.dot}"></span>
                ${status}
              </span>
            </div>
          </div>

          <!-- 네이버 카페 연동 정보 바 -->
          <div class="naver-cafe-api-box">
            <div class="naver-cafe-api-title">
              <span>🔗 네이버 계정 연동: <strong>${NaverAuthConfig.isConnected ? '✅ ' + (NaverAuthConfig.accountName || '연결됨') : '❌ 미연결 (설정 필요)'}</strong></span>
              <button type="button" class="btn btn-xs btn-secondary" onclick="openNaverAuthModal()" style="font-size: 11px; padding: 2px 8px">
                ⚙️ 계정 설정
              </button>
            </div>
            <div style="display: flex; gap: 12px; font-size: 11px; color: var(--text-muted)">
              <span>대상 카페: <strong style="color: var(--text-primary)">수도권 알바/구인구직 모임</strong></span>
              <span>게시판: <strong style="color: var(--text-primary)">[직원/알바 채용]</strong></span>
            </div>
            ${cafeResult ? `
              <div class="naver-cafe-history-item" style="margin-top: 4px">
                <div>
                  <span style="color: #03C75A; font-weight: 700">✓ 최근 게시 완료</span>: ${cafeResult.publishedAt}
                </div>
                <a href="${cafeResult.articleUrl}" target="_blank" style="color: #03C75A; text-decoration: underline; font-weight: 600">
                  게시글 보기 ↗
                </a>
              </div>
            ` : ''}
          </div>

          <!-- 문구 텍스트 영역 -->
          <div>
            <textarea 
              id="copy-text-naver_cafe" 
              class="channel-textarea" 
              placeholder="[네이버 카페] 맞춤 광고문구가 여기에 생성됩니다. 직접 수정하거나 '게시' 버튼을 눌러 미리보기할 수 있습니다."
              oninput="onChannelTextManualInput('naver_cafe', this.value)"
            >${escapeHtml(copyText)}</textarea>
          </div>

          <!-- 푸터 액션 버튼들 -->
          <div class="channel-card-footer">
            <div style="display: flex; gap: var(--space-2)">
              <button type="button" class="btn btn-sm btn-secondary" onclick="generateSingleCopy('naver_cafe')" title="문구 다시 생성">
                ✨ 문구 생성
              </button>
              <button type="button" class="btn btn-sm btn-secondary" onclick="copyChannelToClipboard('naver_cafe')" title="문구 복사">
                📋 복사
              </button>
              <button type="button" class="btn btn-sm btn-primary" style="background: #03C75A; border-color: #03C75A; color: #fff; font-weight: 700" onclick="openNaverCafePublishModal()" title="네이버 카페 게시 전 미리보기 및 전송">
                🚀 네이버 카페 게시
              </button>
            </div>
          </div>

        </div>
      `;
    }

    // 미구현 채널: 실제 게시 기능 없이 연동 계획/현황 안내만 표시
    const planLabelMap = {
      possible: { label: '연동 예정', icon: '🔧' },
      unclear: { label: '확인 필요', icon: '❓' },
      blocked: { label: '연동 불가', icon: '🚫' },
    };
    const planInfo = planLabelMap[ch.planStatus] || planLabelMap.blocked;

    return `
      <div class="channel-card" id="channel-card-${ch.id}">

        <!-- 카드 헤더 -->
        <div class="channel-card-header">
          <div class="channel-card-title-group">
            <div class="channel-icon-box" style="background: ${ch.iconBg}; color: ${ch.iconColor}">
              ${ch.icon}
            </div>
            <div>
              <div class="channel-name">${ch.name}</div>
              <div class="channel-desc">${ch.desc}</div>
            </div>
          </div>

          <div class="channel-badges-group">
            <span class="${ch.costClass}">${ch.costLabel}</span>
            <span class="badge badge-inactive">
              <span class="badge-dot" style="background: #8b9ab8"></span>
              ${planInfo.icon} ${planInfo.label}
            </span>
          </div>
        </div>

        <!-- 연동 계획 안내 -->
        <div class="channel-plan-box">
          ${escapeHtml(ch.planNote)}
        </div>

      </div>
    `;
  }).join('');
}

/* ================================================
   이벤트 및 필터 처리
   ================================================ */
function bindAdCenterEvents() {
  document.querySelectorAll('.adcenter-filter-chip[data-cost]').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.adcenter-filter-chip[data-cost]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      AdCenterState.costFilter = chip.dataset.cost;
      renderAdCenterGrid();
    });
  });
}

function onAdCenterJobChanged(jobId) {
  AdCenterState.selectedJobId = jobId;
  renderAdCenterHeader();
  renderAdCenterGrid();
  showToast('배포 대상 공고가 변경되었습니다.', 'info');
}

function onChannelSelectionChanged(channelId, checked) {
  AdCenterState.channelSelections[channelId] = checked;
  const card = document.getElementById(`channel-card-${channelId}`);
  if (card) card.classList.toggle('selected', checked);
  saveAdCenterStorage();
}

function onChannelTextManualInput(channelId, text) {
  AdCenterState.setJobCopy(channelId, text);
}

function toggleSelectAllChannels(checked) {
  AD_CHANNELS.forEach(ch => {
    AdCenterState.channelSelections[ch.id] = checked;
    const chk = document.getElementById(`chk-channel-${ch.id}`);
    if (chk) chk.checked = checked;
    const card = document.getElementById(`channel-card-${ch.id}`);
    if (card) card.classList.toggle('selected', checked);
  });
  saveAdCenterStorage();
  showToast(checked ? '모든 광고 채널이 선택되었습니다.' : '모든 채널 선택이 해제되었습니다.', 'info');
}

/* ================================================
   채널별 맞춤 광고문구 생성 엔진
   ================================================ */
function buildCopyForChannel(channelId, job) {
  const title = job.title || '채용 공고';
  const comp = job.company || '(주)테크스타트업';
  const cat = job.category || job.department || '구인';
  const loc = job.location || '서울';
  const sal = job.salary || '협의';
  const time = job.workTime || '09:00 ~ 18:00';
  const dline = job.deadline || '채용 시까지';
  const car = job.career || '경력무관';
  const edu = job.education || '학력무관';
  const type = job.type || '정규직';
  const ben = job.benefits || '4대보험, 중식제공, 퇴직금';
  const desc = job.description || `${cat} 관련 주요 실무 및 담당 업무 수행`;
  const qual = job.qualifications || '성실하고 책임감 있게 함께하실 분';

  switch (channelId) {
    case 'naver_cafe':
      return `[${loc} / ${cat}] ${title} (${sal} / ${type})

${loc} 인근 거주자 및 구직자 분들께 채용 소식 공유드립니다!

📍 근무지: ${loc}
💰 급여: ${sal}
⏰ 근무시간: ${time}
💼 고용형태: ${type} (${car})
📅 마감일: ~${dline}

[담당 업무]
${desc}

[지원 요건]
${qual}

[제공 혜택]
${ben}

가족 같은 분위기에서 성실하게 오래 함께하실 분들의 많은 지원 바랍니다.
댓글 또는 쪽지로 문의주시면 빠르게 안내해 드리겠습니다. 감사합니다!`;

    case 'naver_blog':
      return `[${comp}] ${title} | ${loc} ${cat} 구인 안내 (${sal})

안녕하세요! ${comp}입니다.
저희와 함께 열정을 나누며 성장할 ${cat} 담당 직원을 채용합니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 [채용 요약 안내]
• 모집 직종: ${cat} (${type})
• 근무 장소: ${loc}
• 급여 조건: ${sal}
• 근무 시간: ${time}
• 모집 마감: ~${dline}
• 지원 자격: ${car} / ${edu}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 [주요 담당 업무]
${desc}

✅ [자격 요건 및 우대사항]
${qual}

🎁 [복리후생]
${ben}

📮 [지원 방법]
온라인 접수 또는 유선 문의 후 면접 진행
문의처: ${comp} 채용담당자 (admin@techstartup.co.kr)

#${cat}채용 #${loc}구인구직 #${comp} #${sal} #채용공고`;

    case 'naver_band':
      return `📢 [구인 알림] ${title}

🏢 회사명: ${comp}
📍 위치: ${loc}
💰 급여: ${sal}
⏰ 시간: ${time}
🗓️ 마감: ~${dline}

✨ 핵심 업무:
${desc.split('\n')[0] || desc}

🎁 혜택: ${ben}
🙋 ${car} / 초보 가능 / 즉시 출근 환영!

궁금하신 점은 밴드 채팅이나 1:1 대화로 언제든 편하게 연락주세요!`;

    case 'kakaotalk':
      return `[${comp} 채용 안내]
✨ ${title}

• 직종: ${cat} (${type})
• 근무지: ${loc}
• 급여: ${sal}
• 근무시간: ${time}
• 마감: ~${dline}

✔ 주요업무: ${desc.split('\n')[0] || desc}
✔ 혜택: ${ben}

간편 지원 및 문의는 채팅창에 '지원'을 입력해주세요!`;

    case 'instagram':
      return `🔥 [채용] ${title} (${comp})

${loc}에서 함께할 ${cat} 인재를 모십니다! 🚀

📌 근무조건 한눈에 보기
• 장소 : ${loc}
• 급여 : ${sal}
• 시간 : ${time}
• 형태 : ${type} (${car})
• 마감 : ~${dline}

🎁 혜택 : ${ben}

👉 프로필 링크에서 지금 바로 지원하세요!
궁금한 점은 DM으로 편하게 문의주세요 💌

#구인구직 #채용공고 #${cat} #${loc}알바 #${loc}취업 #일자리 #알바스타그램 #취업준비 #${comp}`;

    case 'facebook':
      return `📣 [${comp}] 새로운 팀원을 찾고 있습니다!
"${title}"

성실하고 열정 넘치는 분이라면 누구나 환영합니다. 주변에 알맞은 지인이 있다면 태그와 공유 부탁드려요! 🙏

📍 근무지: ${loc}
💰 급여: ${sal}
⏰ 근무시간: ${time}
📅 접수마감: ~${dline}

📋 담당업무:
${desc}

상세 내용 확인 및 지원은 링크를 클릭해 주세요!`;

    case 'youtube_shorts':
      return `[🎬 30초 숏폼 채용 대본]

(0~5초 / 훅 인트로)
"아직도 조건 좋은 ${loc} ${cat} 일자리 못 찾으셨나요?"

(5~15초 / 핵심 급여 및 조건)
"${comp}에서 ${title}를 모집합니다!
급여는 ${sal}, 근무 시간은 ${time} 깔끔하게 주 5일 보장!"

(15~25초 / 담당업무 및 복지)
"${desc.split('\n')[0] || desc}
${ben}까지 든든하게 챙겨드립니다."

(25~30초 / 클로징 CTA)
"마감은 ${dline}까지! 고정 댓글 링크 누르고 지금 바로 지원하세요!"`;

    case 'worknet':
      return `[고용24 표준 공고] ${title}

1. 구인 기본정보
- 구인신청업체: ${comp}
- 모집직종: ${cat}
- 고용형태: ${type}
- 모집인원: ${job.headcount || '0명'}
- 임금조건: ${sal}

2. 근무조건
- 근무예정지: ${loc}
- 근무시간: ${time}
- 복리후생: ${ben}

3. 직무내용
${desc}

4. 자격면허 및 요건
${qual}`;

    case 'saramin':
      return `[사람인 채용공고] ${title} (${comp})

[모집부문]
- 담당직무: ${cat}
- 근무형태: ${type}
- 경력사항: ${car} / 학력: ${edu}

[근무조건]
- 근무지역: ${loc}
- 급여수준: ${sal}
- 근무시간: ${time}
- 복리후생: ${ben}

[상세 직무기술서]
${desc}

[지원자격 및 우대요건]
${qual}`;

    case 'jobkorea':
      return `[잡코리아 채용정보] ${title}

[기업정보] ${comp}
[포지션] ${cat} (${type})
[근무지역] ${loc}
[급여] ${sal}
[마감일] ~${dline}

■ 담당 업무
${desc}

■ 자격 요건
${qual}

■ 근무 환경 및 복지
${ben}`;

    default:
      return `[${comp}] ${title}\n위치: ${loc} | 급여: ${sal} | 시간: ${time}\n${desc}`;
  }
}

/* ================================================
   단독 생성 및 일괄 생성 액션
   ================================================ */
function generateSingleCopy(channelId) {
  const job = AdCenterState.getSelectedJob();
  if (!job) {
    showToast('먼저 배포할 공고를 선택해주세요.', 'warning');
    return;
  }

  const copy = buildCopyForChannel(channelId, job);
  AdCenterState.setJobCopy(channelId, copy);

  let newStatus = '문구 생성완료';
  if (channelId === 'naver_cafe') {
    newStatus = NaverAuthConfig.isConnected ? '게시 준비' : '문구 생성완료';
  }
  AdCenterState.setJobStatus(channelId, newStatus);

  const textarea = document.getElementById(`copy-text-${channelId}`);
  if (textarea) {
    textarea.value = copy;
    textarea.style.transition = 'background-color 0.4s';
    textarea.style.backgroundColor = 'rgba(108, 99, 255, 0.15)';
    setTimeout(() => { textarea.style.backgroundColor = ''; }, 600);
  }

  const badge = document.getElementById(`status-badge-${channelId}`);
  if (badge) {
    badge.className = 'badge badge-info';
    badge.innerHTML = `<span class="badge-dot" style="background: #38bdf8"></span>${newStatus}`;
  }

  const channelObj = AD_CHANNELS.find(c => c.id === channelId);
  showToast(`✨ [${channelObj?.name || channelId}] 맞춤 문구가 생성되었습니다!`, 'success');
}

function generateAllSelectedCopies() {
  const job = AdCenterState.getSelectedJob();
  if (!job) {
    showToast('먼저 배포할 채용공고를 선택해주세요.', 'warning');
    return;
  }

  const selectedChannels = AD_CHANNELS.filter(c => AdCenterState.channelSelections[c.id]);

  if (selectedChannels.length === 0) {
    showToast('광고문구를 생성할 채널을 1개 이상 체크해주세요.', 'warning');
    return;
  }

  selectedChannels.forEach(ch => {
    const copy = buildCopyForChannel(ch.id, job);
    AdCenterState.setJobCopy(ch.id, copy);

    let newStatus = '문구 생성완료';
    if (ch.id === 'naver_cafe') {
      newStatus = NaverAuthConfig.isConnected ? '게시 준비' : '문구 생성완료';
    }
    AdCenterState.setJobStatus(ch.id, newStatus);

    const textarea = document.getElementById(`copy-text-${ch.id}`);
    if (textarea) {
      textarea.value = copy;
      textarea.style.transition = 'background-color 0.4s';
      textarea.style.backgroundColor = 'rgba(108, 99, 255, 0.15)';
      setTimeout(() => { textarea.style.backgroundColor = ''; }, 600);
    }

    const badge = document.getElementById(`status-badge-${ch.id}`);
    if (badge) {
      badge.className = 'badge badge-info';
      badge.innerHTML = `<span class="badge-dot" style="background: #38bdf8"></span>${newStatus}`;
    }
  });

  showToast(`📋 선택한 ${selectedChannels.length}개 채널의 맞춤 광고문구가 한꺼번에 생성되었습니다!`, 'success');
}

/* ================================================
   클립보드 복사
   ================================================ */
function copyChannelToClipboard(channelId) {
  const textarea = document.getElementById(`copy-text-${channelId}`);
  const text = textarea ? textarea.value.trim() : AdCenterState.getJobCopy(channelId);

  if (!text) {
    showToast('복사할 문구가 없습니다. 먼저 문구를 생성해주세요.', 'warning');
    return;
  }

  const channelObj = AD_CHANNELS.find(c => c.id === channelId);

  const onSuccess = () => {
    AdCenterState.setJobStatus(channelId, '복사완료');
    const badge = document.getElementById(`status-badge-${channelId}`);
    if (badge) {
      badge.className = 'badge badge-primary';
      badge.innerHTML = `<span class="badge-dot" style="background: #6c63ff"></span>복사완료`;
    }
    showToast(`📋 [${channelObj?.name || channelId}] 광고문구가 클립보드에 복사되었습니다!`, 'success');
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(onSuccess).catch(() => {
      fallbackCopy(text, onSuccess);
    });
  } else {
    fallbackCopy(text, onSuccess);
  }
}

function fallbackCopy(text, callback) {
  const temp = document.createElement('textarea');
  temp.value = text;
  temp.style.position = 'fixed';
  temp.style.left = '-9999px';
  document.body.appendChild(temp);
  temp.select();
  try {
    document.execCommand('copy');
    if (callback) callback();
  } catch (e) {
    showToast('복사 기능이 지원되지 않는 브라우저입니다.', 'danger');
  }
  document.body.removeChild(temp);
}

/* ================================================
   네이버 OAuth 2.0 및 계정 연동 모달 로직
   ================================================ */
function openNaverAuthModal() {
  const modal = document.getElementById('naver-auth-modal');
  if (!modal) return;

  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  setVal('naver-client-id', NaverAuthConfig.clientId);
  setVal('naver-client-secret', NaverAuthConfig.clientSecret);
  setVal('naver-redirect-uri', NaverAuthConfig.redirectUri || 'http://localhost:3000/callback');
  setVal('naver-access-token', NaverAuthConfig.accessToken);

  const resultEl = document.getElementById('naver-auth-test-result');
  if (resultEl) resultEl.innerHTML = '';

  modal.classList.remove('hidden');
  refreshNaverConnectionStatus();
}

function loadSampleNaverAuth() {
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  setVal('naver-client-id', 'NV_OAUTH_' + Math.random().toString(36).substring(2, 10).toUpperCase());
  setVal('naver-client-secret', 'sec_' + Math.random().toString(36).substring(2, 12));
  setVal('naver-redirect-uri', 'http://localhost:3000/callback');
  setVal('naver-access-token', 'AAAAOnav_mock_token_' + Date.now());
  showToast('🧪 모의 테스트용 네이버 OAuth 정보가 입력되었습니다.', 'info');
}

function testNaverConnection() {
  const clientId = document.getElementById('naver-client-id')?.value.trim();
  const secret = document.getElementById('naver-client-secret')?.value.trim();
  const token = document.getElementById('naver-access-token')?.value.trim();
  const resultEl = document.getElementById('naver-auth-test-result');

  if (!clientId || !secret) {
    showToast('Client ID와 Client Secret을 모두 입력해주세요.', 'warning');
    return;
  }

  showToast('입력하신 정보의 형식을 확인하는 중...', 'info');

  setTimeout(() => {
    const isFilled = Boolean(token && token.length > 5);
    if (resultEl) {
      resultEl.innerHTML = `
        <div class="connection-test-result ${isFilled ? 'success' : 'error'}" style="margin-top: 10px">
          ${isFilled
            ? `✅ 입력값 형식은 유효합니다. (계정: ${NaverAuthConfig.accountName || '연결됨'})<br>
               <span style="font-size: 11px; color: var(--text-muted)">⚠️ 이는 형식 검증일 뿐이며, 실제 네이버 서버와의 연동 여부는 게시 시도 시 API 응답으로만 확인됩니다.</span>`
            : `⚠️ Access Token이 없거나 형식이 올바르지 않습니다. 유효한 토큰을 입력해주세요.`}
        </div>
      `;
    }
    showToast(isFilled ? '입력값 형식 확인 완료 (실제 연동은 게시 시 확인됩니다)' : 'Access Token을 확인해주세요.', isFilled ? 'info' : 'warning');
  }, 1000);
}

function saveNaverAuthConfig() {
  const clientId = document.getElementById('naver-client-id')?.value.trim() || '';
  const clientSecret = document.getElementById('naver-client-secret')?.value.trim() || '';
  const redirectUri = document.getElementById('naver-redirect-uri')?.value.trim() || 'http://localhost:3000/callback';
  const accessToken = document.getElementById('naver-access-token')?.value.trim() || '';

  if (!clientId) {
    showToast('Client ID를 입력해주세요.', 'warning');
    document.getElementById('naver-client-id')?.focus();
    return;
  }

  NaverAuthConfig.clientId = clientId;
  NaverAuthConfig.clientSecret = clientSecret;
  NaverAuthConfig.redirectUri = redirectUri;
  NaverAuthConfig.accessToken = accessToken;
  NaverAuthConfig.isConnected = Boolean(clientId && accessToken);
  NaverAuthConfig.connectedAt = new Date().toLocaleString('ko-KR');

  saveAdCenterStorage();
  closeModal('naver-auth-modal');
  renderAdCenterGrid();

  showToast(
    '💾 입력값이 저장되었습니다. (참고용 — 실제 연결 여부는 아래 "실제 로그인" 상태로만 결정됩니다)',
    'success'
  );
}

/* ================================================
   실제 네이버 로그인 (백엔드 서버 경유, OAuth 2.0)
   ================================================ */
function startNaverLogin() {
  window.open(`${NAVER_API_BASE}/api/naver/oauth/start`, '_blank', 'width=480,height=640');
  showToast('네이버 로그인 창이 열렸습니다. 로그인 후 이 창으로 돌아와 "연결 상태 새로고침"을 눌러주세요.', 'info');
}

async function refreshNaverConnectionStatus() {
  const statusEl = document.getElementById('naver-real-connection-status');
  if (statusEl) statusEl.textContent = '연결 상태 확인 중...';

  try {
    const res = await fetch(`${NAVER_API_BASE}/api/naver/status`);
    if (!res.ok) throw new Error(`서버 응답 오류 (HTTP ${res.status})`);
    const data = await res.json();

    NaverAuthConfig.isConnected = Boolean(data.connected);
    NaverAuthConfig.connectedAt = NaverAuthConfig.isConnected ? new Date().toLocaleString('ko-KR') : null;
    NaverAuthConfig.accountName = data.nickname || '';

    if (statusEl) {
      statusEl.innerHTML = NaverAuthConfig.isConnected
        ? '✅ 백엔드 서버에 실제 네이버 로그인이 연결되어 있습니다.'
        : '❌ 아직 연결되어 있지 않습니다. 위 "네이버 계정으로 로그인" 버튼을 눌러주세요.';
    }
  } catch (e) {
    // 백엔드 서버 자체가 꺼져 있거나 응답하지 않는 경우 — 절대 "연결됨"으로 처리하지 않는다.
    NaverAuthConfig.isConnected = false;
    if (statusEl) {
      statusEl.innerHTML = `⚠️ 백엔드 서버(${NAVER_API_BASE})에 연결할 수 없습니다. server 폴더의 시작.bat을 먼저 실행해주세요.`;
    }
  }

  renderAdCenterGrid();
}

async function disconnectNaverAccount() {
  try {
    await fetch(`${NAVER_API_BASE}/api/naver/disconnect`, { method: 'POST' });
    showToast('네이버 계정 연결이 해제되었습니다.', 'info');
  } catch (e) {
    showToast('백엔드 서버에 연결할 수 없어 해제 요청을 보내지 못했습니다.', 'warning');
  }
  refreshNaverConnectionStatus();
}

/* ================================================
   네이버 카페 게시 전 미리보기 및 게시 실행 모달
   ================================================ */
function openNaverCafePublishModal() {
  const job = AdCenterState.getSelectedJob();
  if (!job) {
    showToast('먼저 게시할 공고를 선택해주세요.', 'warning');
    return;
  }

  // 문구가 없으면 먼저 자동 생성
  let copy = AdCenterState.getJobCopy('naver_cafe');
  if (!copy) {
    copy = buildCopyForChannel('naver_cafe', job);
    AdCenterState.setJobCopy('naver_cafe', copy);
    const ta = document.getElementById('copy-text-naver_cafe');
    if (ta) ta.value = copy;
  }

  const modal = document.getElementById('naver-cafe-publish-modal');
  if (!modal) return;

  // 제목 기본값: "[지역/직종] 공고제목 (급여)"
  const defaultSubject = `[${job.location || '서울'} / ${job.category || '구인'}] ${job.title} (${job.salary || '급여협의'})`;
  const subjectInput = document.getElementById('naver-publish-subject');
  if (subjectInput) subjectInput.value = defaultSubject;

  // 결과창 초기화
  const resultBox = document.getElementById('naver-publish-result-box');
  if (resultBox) resultBox.innerHTML = '';

  updateNaverCafePreviewLive();
  modal.classList.remove('hidden');
}

function onPublishClubChanged(val) {
  const customInput = document.getElementById('naver-custom-club-id');
  if (customInput) {
    customInput.classList.toggle('hidden', val !== 'custom');
    if (val === 'custom') customInput.focus();
  }
  updateNaverCafePreviewLive();
}

function onPublishMenuChanged(val) {
  const customInput = document.getElementById('naver-custom-menu-id');
  if (customInput) {
    customInput.classList.toggle('hidden', val !== 'custom');
    if (val === 'custom') customInput.focus();
  }
  updateNaverCafePreviewLive();
}

function updateNaverCafePreviewLive() {
  const clubSelect = document.getElementById('naver-publish-club');
  const menuSelect = document.getElementById('naver-publish-menu');
  const customClub = document.getElementById('naver-custom-club-id')?.value.trim();
  const customMenu = document.getElementById('naver-custom-menu-id')?.value.trim();
  const subject = document.getElementById('naver-publish-subject')?.value || '채용 공고 제목';
  const copy = AdCenterState.getJobCopy('naver_cafe') || '게시글 본문이 여기에 표시됩니다.';

  const clubName = clubSelect?.value === 'custom' 
    ? `커스텀 카페 (ID: ${customClub || '미입력'})` 
    : clubSelect?.options[clubSelect.selectedIndex]?.text.split('(')[0].trim() || '네이버 카페';

  const menuName = menuSelect?.value === 'custom'
    ? `커스텀 게시판 (ID: ${customMenu || '미입력'})`
    : menuSelect?.options[menuSelect.selectedIndex]?.text.split('(')[0].trim() || '구인게시판';

  const previewClubnameEl = document.getElementById('preview-cafe-clubname');
  if (previewClubnameEl) previewClubnameEl.textContent = `${clubName} ＞ ${menuName}`;

  const previewSubEl = document.getElementById('preview-cafe-subject');
  if (previewSubEl) previewSubEl.textContent = subject;

  const previewTimeEl = document.getElementById('preview-cafe-time');
  if (previewTimeEl) previewTimeEl.textContent = new Date().toLocaleString('ko-KR', { hour12: false });

  const previewContentEl = document.getElementById('preview-cafe-content');
  if (previewContentEl) previewContentEl.textContent = copy;
}

/* ================================================
   실제 네이버 카페 게시 전송 (공식 API 규격 호출)
   ================================================ */
async function executeNaverCafePublish() {
  const job = AdCenterState.getSelectedJob();
  if (!job) return;

  // 1. 네이버 계정 연동 상태를 백엔드 서버에 다시 한번 실제로 확인한다.
  //    (여기서 확인하는 것은 "저장된 값이 있는지"가 아니라, 서버가 지금 이 순간
  //    진짜 로그인된 토큰을 들고 있는지 여부다.)
  await refreshNaverConnectionStatus();

  if (!NaverAuthConfig.isConnected) {
    showToast('⚠️ 네이버 계정 연결이 필요합니다. 먼저 [계정 설정]에서 실제 로그인을 진행해주세요.', 'warning');
    const resultBox = document.getElementById('naver-publish-result-box');
    if (resultBox) {
      resultBox.innerHTML = `
        <div class="connection-test-result error" style="margin-top: var(--space-3)">
          ❌ <strong>API 연결 필요</strong>: 실제 게시를 하려면 네이버 계정 로그인과, 게시를 대신 처리해줄
          백엔드 서버(server 폴더의 시작.bat)가 함께 실행되어 있어야 합니다. <br>
          현재 실제 네이버 카페에는 게시되지 않았습니다.<br>
          <button type="button" class="btn btn-sm btn-secondary" style="margin-top: 6px" onclick="openNaverAuthModal()">
            🔗 네이버 계정 연결 모달 열기
          </button>
        </div>
      `;
    }
    AdCenterState.setJobStatus('naver_cafe', 'API 연결 필요');
    renderAdCenterGrid();
    return;
  }

  // 2. 카페/게시판 ID 및 파라미터 수집
  const clubSelect = document.getElementById('naver-publish-club');
  const menuSelect = document.getElementById('naver-publish-menu');
  let clubId = clubSelect?.value;
  let menuId = menuSelect?.value;

  if (clubId === 'custom') clubId = document.getElementById('naver-custom-club-id')?.value.trim();
  if (menuId === 'custom') menuId = document.getElementById('naver-custom-menu-id')?.value.trim();

  if (!clubId || !menuId) {
    showToast('대상 카페 Club ID와 게시판 Menu ID를 입력해주세요.', 'warning');
    return;
  }

  const subject = document.getElementById('naver-publish-subject')?.value.trim();
  const content = AdCenterState.getJobCopy('naver_cafe');

  if (!subject) {
    showToast('게시글 제목을 입력해주세요.', 'warning');
    document.getElementById('naver-publish-subject')?.focus();
    return;
  }

  const clubName = clubSelect?.options[clubSelect.selectedIndex]?.text.split('(')[0].trim() || `카페 (${clubId})`;
  const menuName = menuSelect?.options[menuSelect.selectedIndex]?.text.split('(')[0].trim() || `게시판 (${menuId})`;

  const actionBtn = document.getElementById('btn-naver-cafe-publish-action');
  if (actionBtn) {
    actionBtn.disabled = true;
    actionBtn.textContent = '📡 네이버 API 전송 중...';
  }

  showToast(`📡 [${clubName}] 공식 API(POST /v1/cafe/${clubId}/menu/${menuId}/articles) 호출 중...`, 'info');

  // 3. 실제 네이버 카페 공식 글쓰기 API 호출 (백엔드 프록시 서버 경유)
  //    ⚠️ 절대 가짜 성공을 만들지 않는다: 백엔드가 실제 200 응답과 함께
  //    진짜 게시글 번호(articleId)를 돌려준 경우에만 "게시 완료"로 처리한다.
  //    (accessToken은 프론트엔드가 아니라 백엔드 서버만 가지고 있으며,
  //    브라우저에서 openapi.naver.com을 직접 호출하지 않는다 — 그래야 CORS 문제 없이
  //    실제로 게시 요청을 보낼 수 있다.)
  const apiUrl = `${NAVER_API_BASE}/api/naver/cafe/publish`;

  fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ clubId, menuId, subject, content: (content || '').replace(/\n/g, '<br>') }),
  })
    .then(async (res) => {
      let data = null;
      try { data = await res.json(); } catch (e) { /* 응답이 JSON이 아닐 수 있음 */ }

      // 네이버 카페 글쓰기 API 정상 응답 규격: { message: { result: { articleId, ... } } }
      const realArticleId = data?.message?.result?.articleId;

      // ✅ 실제 API가 200 OK와 함께 "진짜" 게시글 번호를 돌려준 경우에만 성공 처리
      if (!res.ok || !realArticleId) {
        const errMsg = data?.message?.error?.msg || `네이버 API 응답 오류 (HTTP ${res.status})`;
        throw new Error(errMsg);
      }

      const realArticleUrl = `https://cafe.naver.com/ca-fe/cafes/${clubId}/articles/${realArticleId}`;
      const nowTime = new Date().toLocaleString('ko-KR', { hour12: false });

      const publishResult = {
        jobId: job.id,
        publishedAt: nowTime,
        clubId,
        menuId,
        clubName,
        menuName,
        subject,
        articleId: realArticleId,
        articleUrl: realArticleUrl,
        status: 'success',
      };

      // 상태 및 결과 저장 (실제 API 응답 기반)
      AdCenterState.setJobStatus('naver_cafe', '게시 완료');
      AdCenterState.setNaverCafeResult(job.id, publishResult);

      // 대시보드 알림 및 배포 이력에 추가
      AppState.deployHistory.unshift({
        id: 'D' + Date.now(),
        jobTitle: `${job.title} → 네이버 카페(${clubName})`,
        platform: 'naver_cafe',
        status: 'success',
        time: nowTime,
        message: `[${menuName}] 글번호 #${realArticleId} 게시 완료 (실제 API 응답)`,
      });

      AppState.notifications.unshift({
        id: 'N' + Date.now(),
        type: 'success',
        icon: '☕',
        title: '네이버 카페 게시 완료',
        desc: `[${clubName}] ${menuName}에 공고가 실제로 등록되었습니다.`,
        time: '방금 전',
        read: false,
      });
      if (typeof updateNotifBadge === 'function') updateNotifBadge();

      // 모달 내 결과 안내 표시
      const resultBox = document.getElementById('naver-publish-result-box');
      if (resultBox) {
        resultBox.innerHTML = `
          <div class="connection-test-result success" style="margin-top: var(--space-3); line-height: 1.6">
            🎉 <strong>네이버 카페 게시 성공!</strong> (API 응답코드: ${res.status})<br>
            • 게시일시: <strong>${nowTime}</strong><br>
            • 카페/게시판: <strong>${clubName} ＞ ${menuName}</strong><br>
            • 게시글 번호: <strong>#${realArticleId}</strong><br>
            • 게시글 URL: <a href="${realArticleUrl}" target="_blank" style="color: #03C75A; font-weight: 700; text-decoration: underline">${realArticleUrl} ↗</a>
          </div>
        `;
      }

      renderAdCenterGrid();
      showToast(`🎉 [${clubName}]에 공고가 실제로 게시되었습니다!`, 'success');
    })
    .catch((err) => {
      // ❌ 실제 게시가 이루어지지 않은 모든 경우: 절대 성공으로 표시하지 않는다.
      const nowTime = new Date().toLocaleString('ko-KR', { hour12: false });

      AdCenterState.setJobStatus('naver_cafe', '게시 불가');

      AppState.deployHistory.unshift({
        id: 'D' + Date.now(),
        jobTitle: `${job.title} → 네이버 카페(${clubName})`,
        platform: 'naver_cafe',
        status: 'danger',
        time: nowTime,
        message: `게시 실패: ${err.message}`,
      });

      const resultBox = document.getElementById('naver-publish-result-box');
      if (resultBox) {
        resultBox.innerHTML = `
          <div class="connection-test-result error" style="margin-top: var(--space-3); line-height: 1.6">
            ❌ <strong>현재 실제 네이버 카페에는 게시되지 않았습니다.</strong><br>
            사유: ${escapeHtml(err.message)}<br>
            <span style="font-size: 11px; color: var(--text-muted)">
              ※ server 폴더의 백엔드 서버(시작.bat)가 켜져 있는지, 네이버 로그인이 되어 있는지,
              그리고 대상 카페에 실제로 글쓰기 권한이 있는지 확인해주세요.
            </span>
          </div>
        `;
      }

      renderAdCenterGrid();
      showToast('❌ 네이버 카페 게시에 실패했습니다. 실제로 게시되지 않았습니다.', 'danger');
    })
    .finally(() => {
      if (actionBtn) {
        actionBtn.disabled = false;
        actionBtn.textContent = '🚀 네이버 카페에 게시';
      }
    });
}

/* ================================================
   공고 관리 페이지에서 특정 공고로 바로가기 연동
   ================================================ */
function goToAdCenter(jobId) {
  AdCenterState.selectedJobId = jobId;
  if (typeof navigateTo === 'function') {
    navigateTo('adcenter');
  }
}

/* ================================================
   localStorage 저장 및 로드
   ================================================ */
function saveAdCenterStorage() {
  try {
    const data = {
      selectedJobId: AdCenterState.selectedJobId,
      channelSelections: AdCenterState.channelSelections,
      channelCopies: AdCenterState.channelCopies,
      channelStatuses: AdCenterState.channelStatuses,
      naverCafeResults: AdCenterState.naverCafeResults,
      naverAuth: NaverAuthConfig,
    };
    localStorage.setItem('adDashboard_adcenter', JSON.stringify(data));
  } catch (e) {
    console.warn('AdCenter localStorage 저장 실패:', e);
  }
}

function loadAdCenterStorage() {
  try {
    const saved = localStorage.getItem('adDashboard_adcenter');
    if (saved) {
      const data = JSON.parse(saved);
      if (data.selectedJobId) AdCenterState.selectedJobId = data.selectedJobId;
      if (data.channelSelections) AdCenterState.channelSelections = data.channelSelections;
      if (data.channelCopies) AdCenterState.channelCopies = data.channelCopies;
      if (data.channelStatuses) AdCenterState.channelStatuses = data.channelStatuses;
      if (data.naverCafeResults) AdCenterState.naverCafeResults = data.naverCafeResults;
      if (data.naverAuth) {
        Object.assign(NaverAuthConfig, data.naverAuth);
      }
    }
  } catch (e) {
    console.warn('AdCenter localStorage 로드 실패:', e);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ================================================
   전역 window 바인딩
   ================================================ */
window.initAdCenter = initAdCenter;
window.renderAdCenterHeader = renderAdCenterHeader;
window.renderAdCenterGrid = renderAdCenterGrid;
window.onAdCenterJobChanged = onAdCenterJobChanged;
window.onChannelSelectionChanged = onChannelSelectionChanged;
window.onChannelTextManualInput = onChannelTextManualInput;
window.toggleSelectAllChannels = toggleSelectAllChannels;
window.generateSingleCopy = generateSingleCopy;
window.generateAllSelectedCopies = generateAllSelectedCopies;
window.copyChannelToClipboard = copyChannelToClipboard;
window.goToAdCenter = goToAdCenter;
window.openNaverAuthModal = openNaverAuthModal;
window.saveNaverAuthConfig = saveNaverAuthConfig;
window.loadSampleNaverAuth = loadSampleNaverAuth;
window.testNaverConnection = testNaverConnection;
window.startNaverLogin = startNaverLogin;
window.refreshNaverConnectionStatus = refreshNaverConnectionStatus;
window.disconnectNaverAccount = disconnectNaverAccount;
window.openNaverCafePublishModal = openNaverCafePublishModal;
window.onPublishClubChanged = onPublishClubChanged;
window.onPublishMenuChanged = onPublishMenuChanged;
window.updateNaverCafePreviewLive = updateNaverCafePreviewLive;
window.executeNaverCafePublish = executeNaverCafePublish;
