/**
 * data.js — 더미 데이터 및 상태 관리
 * 실제 API 연동 전 사용하는 샘플 데이터
 */

/* ================================================
   채용 공고 데이터
   ================================================ */
const JOBS_DATA = [];

/* ================================================
   플랫폼 데이터
   ================================================ */
const PLATFORMS_DATA = {
  jobkorea: {
    id: 'jobkorea',
    name: '잡코리아',
    color: '#e8421a',
    icon: 'J',
    url: 'www.jobkorea.co.kr',
    planNote: '자체 self-serve 게시 API가 없어 아직 연동되어 있지 않습니다. 유료 광고주 제휴 계약(비즈니스 파트너십)이 필요합니다.',
  },
  saramin: {
    id: 'saramin',
    name: '사람인',
    color: '#0066cc',
    icon: 'S',
    url: 'www.saramin.co.kr',
    planNote: '자체 self-serve 게시 API가 없어 아직 연동되어 있지 않습니다. 유료 광고주 제휴 계약(비즈니스 파트너십)이 필요합니다.',
  },
  worknet: {
    id: 'worknet',
    name: '워크넷',
    color: '#00833e',
    icon: 'W',
    url: 'www.work.go.kr',
    planNote: '공공데이터포털 Open API는 채용정보 조회 전용으로 보입니다. 게시는 고용24 사업주 계정 승인 절차가 필요해 아직 연동되어 있지 않습니다.',
  },
};

/* ================================================
   알림 데이터 — 실제 이벤트(네이버 카페 게시 등) 발생 시
   adcenter.js/jobs.js에서 채워짐. 초기값은 빈 배열.
   ================================================ */
const NOTIFICATIONS_DATA = [];

/* ================================================
   배포 이력 데이터 — 실제 네이버 카페 게시 성공 시
   adcenter.js에서 채워짐. 초기값은 빈 배열.
   ================================================ */
const DEPLOY_HISTORY = [];

/* ================================================
   앱 전역 상태
   ================================================ */
const AppState = {
  currentPage: 'dashboard',
  jobs: [...JOBS_DATA],
  platforms: { ...PLATFORMS_DATA },
  notifications: [...NOTIFICATIONS_DATA],
  deployHistory: [...DEPLOY_HISTORY],

  // 필터 상태
  jobFilter: 'all',
  jobSearch: '',

  // 분석 날짜 범위
  analyticsRange: '30d',

  // 설정 메뉴
  settingsTab: 'platform',

  /* ─── 계산 속성 ─── */
  get activeJobsCount() {
    return this.jobs.filter(j => j.status === 'active').length;
  },
  get totalApplicants() {
    return this.jobs.reduce((sum, j) => sum + j.applicants, 0);
  },
  get totalViews() {
    return this.jobs.reduce((sum, j) => sum + j.views, 0);
  },
  get deploySuccessRate() {
    const total = this.deployHistory.length;
    const success = this.deployHistory.filter(d => d.status === 'success').length;
    return total > 0 ? Math.round((success / total) * 100) : 0;
  },
  get unreadNotifCount() {
    return this.notifications.filter(n => !n.read).length;
  },

  /* ─── 헬퍼 ─── */
  getFilteredJobs() {
    let jobs = this.jobs;
    if (this.jobFilter !== 'all') {
      jobs = jobs.filter(j => j.status === this.jobFilter);
    }
    if (this.jobSearch) {
      const q = this.jobSearch.toLowerCase();
      jobs = jobs.filter(j =>
        (j.title || '').toLowerCase().includes(q) ||
        (j.company || '').toLowerCase().includes(q) ||
        (j.tags || []).some(t => (t || '').toLowerCase().includes(q))
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
};

/* ================================================
   예전 버전에서 남은 캐시 정리
   (과거 가짜 플랫폼 통계가 localStorage에 저장되어 있던
   흔적을 지운다 — 더 이상 아무것도 이 키를 쓰지 않는다)
   ================================================ */
try {
  localStorage.removeItem('adDashboard_platforms');
} catch (e) {
  /* noop */
}
