/**
 * data.js — 더미 데이터 및 상태 관리
 * 실제 API 연동 전 사용하는 샘플 데이터
 */

/* ================================================
   채용 공고 데이터
   ================================================ */
const JOBS_DATA = [
  {
    id: 'JOB-001',
    title: '프론트엔드 개발자 (React)',
    company: '(주)테크스타트업',
    department: '개발팀',
    location: '서울 강남구',
    salary: '4,000 ~ 6,000만원',
    career: '3년 이상',
    type: 'full', // full, part, contract
    status: 'active', // active, paused, ended, draft
    platforms: ['jobkorea', 'saramin', 'worknet'],
    views: 1842,
    applicants: 47,
    deadline: '2026-09-30',
    createdAt: '2026-08-01',
    deployedAt: '2026-08-02',
    tags: ['React', 'TypeScript', 'AWS'],
    aiCopy: true,
  },
  {
    id: 'JOB-002',
    title: '마케팅 매니저',
    company: '(주)테크스타트업',
    department: '마케팅팀',
    location: '서울 마포구',
    salary: '3,500 ~ 5,000만원',
    career: '5년 이상',
    type: 'full',
    status: 'active',
    platforms: ['jobkorea', 'saramin'],
    views: 974,
    applicants: 23,
    deadline: '2026-09-15',
    createdAt: '2026-08-10',
    deployedAt: '2026-08-11',
    tags: ['디지털마케팅', 'SNS', 'GA'],
    aiCopy: true,
  },
  {
    id: 'JOB-003',
    title: '회계/경리 담당자',
    company: '(주)테크스타트업',
    department: '경영지원팀',
    location: '서울 강남구',
    salary: '3,000 ~ 4,000만원',
    career: '2년 이상',
    type: 'full',
    status: 'active',
    platforms: ['worknet'],
    views: 432,
    applicants: 8,
    deadline: '2026-09-20',
    createdAt: '2026-08-15',
    deployedAt: '2026-08-15',
    tags: ['ERP', '세무', '결산'],
    aiCopy: false,
  },
  {
    id: 'JOB-004',
    title: '영업 담당자 (IT솔루션)',
    company: '(주)테크스타트업',
    department: '영업팀',
    location: '서울 전체',
    salary: '기본 3,500 + 인센티브',
    career: '신입/경력',
    type: 'full',
    status: 'paused',
    platforms: ['jobkorea', 'saramin', 'worknet'],
    views: 312,
    applicants: 5,
    deadline: '2026-10-01',
    createdAt: '2026-08-20',
    deployedAt: null,
    tags: ['B2B영업', 'SaaS', '솔루션'],
    aiCopy: true,
  },
  {
    id: 'JOB-005',
    title: 'UX/UI 디자이너',
    company: '(주)테크스타트업',
    department: '디자인팀',
    location: '서울 강남구',
    salary: '3,500 ~ 5,500만원',
    career: '3년 이상',
    type: 'full',
    status: 'draft',
    platforms: [],
    views: 0,
    applicants: 0,
    deadline: '2026-10-15',
    createdAt: '2026-08-28',
    deployedAt: null,
    tags: ['Figma', 'Prototyping', 'UX리서치'],
    aiCopy: false,
  },
  {
    id: 'JOB-006',
    title: '백엔드 개발자 (Node.js)',
    company: '(주)테크스타트업',
    department: '개발팀',
    location: '서울 강남구 (재택 병행)',
    salary: '5,000 ~ 8,000만원',
    career: '5년 이상',
    type: 'full',
    status: 'ended',
    platforms: ['jobkorea', 'saramin'],
    views: 2341,
    applicants: 68,
    deadline: '2026-08-20',
    createdAt: '2026-07-15',
    deployedAt: '2026-07-15',
    tags: ['Node.js', 'PostgreSQL', 'Docker'],
    aiCopy: true,
  },
];

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
    connected: true,
    autoDeployEnabled: true,
    activeJobs: 3,
    totalApplicants: 70,
    totalViews: 3158,
    monthlyBudget: 580000,
    usedBudget: 420000,
    lastDeployed: '2026-08-28 14:32',
    apiStatus: 'connected',
  },
  saramin: {
    id: 'saramin',
    name: '사람인',
    color: '#0066cc',
    icon: 'S',
    url: 'www.saramin.co.kr',
    connected: true,
    autoDeployEnabled: true,
    activeJobs: 2,
    totalApplicants: 52,
    totalViews: 1874,
    monthlyBudget: 450000,
    usedBudget: 310000,
    lastDeployed: '2026-08-28 14:35',
    apiStatus: 'connected',
  },
  worknet: {
    id: 'worknet',
    name: '워크넷',
    color: '#00833e',
    icon: 'W',
    url: 'www.work.go.kr',
    connected: true,
    autoDeployEnabled: false,
    activeJobs: 2,
    totalApplicants: 16,
    totalViews: 744,
    monthlyBudget: 0, // 무료
    usedBudget: 0,
    lastDeployed: '2026-08-25 09:15',
    apiStatus: 'warning',
  },
};

/* ================================================
   알림 데이터
   ================================================ */
const NOTIFICATIONS_DATA = [
  {
    id: 'N001',
    type: 'success',
    icon: '✅',
    title: '배포 완료',
    desc: '프론트엔드 개발자 공고가 잡코리아에 성공적으로 게재되었습니다.',
    time: '5분 전',
    read: false,
  },
  {
    id: 'N002',
    type: 'success',
    icon: '✅',
    title: '배포 완료',
    desc: '마케팅 매니저 공고가 사람인에 성공적으로 게재되었습니다.',
    time: '8분 전',
    read: false,
  },
  {
    id: 'N003',
    type: 'warning',
    icon: '⚠️',
    title: '워크넷 API 경고',
    desc: '워크넷 인증 토큰이 만료 예정입니다. 갱신이 필요합니다.',
    time: '1시간 전',
    read: false,
  },
  {
    id: 'N004',
    type: 'info',
    icon: '👤',
    title: '신규 지원자',
    desc: '프론트엔드 개발자 공고에 3명의 새 지원자가 있습니다.',
    time: '2시간 전',
    read: true,
  },
  {
    id: 'N005',
    type: 'warning',
    icon: '📅',
    title: '공고 만료 임박',
    desc: '마케팅 매니저 공고가 5일 후 만료됩니다.',
    time: '3시간 전',
    read: true,
  },
  {
    id: 'N006',
    type: 'danger',
    icon: '❌',
    title: '배포 실패',
    desc: '영업 담당자 공고 워크넷 배포에 실패했습니다. 재시도 필요.',
    time: '어제',
    read: true,
  },
];

/* ================================================
   배포 이력 데이터
   ================================================ */
const DEPLOY_HISTORY = [
  { id: 'D001', jobTitle: '프론트엔드 개발자', platform: 'jobkorea', status: 'success', time: '2026-08-28 14:32', message: '게재 성공' },
  { id: 'D002', jobTitle: '마케팅 매니저',     platform: 'saramin',  status: 'success', time: '2026-08-28 14:35', message: '게재 성공' },
  { id: 'D003', jobTitle: '회계/경리 담당자',  platform: 'worknet',  status: 'success', time: '2026-08-25 09:15', message: '게재 성공' },
  { id: 'D004', jobTitle: '영업 담당자',       platform: 'worknet',  status: 'danger',  time: '2026-08-24 11:00', message: 'API 인증 오류' },
  { id: 'D005', jobTitle: '프론트엔드 개발자', platform: 'saramin',  status: 'success', time: '2026-08-15 10:20', message: '게재 성공' },
  { id: 'D006', jobTitle: '마케팅 매니저',     platform: 'jobkorea', status: 'warning', time: '2026-08-10 15:00', message: '부분 성공 (이미지 미반영)' },
];

/* ================================================
   월별 성과 데이터 (차트용)
   ================================================ */
const MONTHLY_STATS = {
  labels: ['3월', '4월', '5월', '6월', '7월', '8월'],
  views: {
    jobkorea: [2100, 2800, 2400, 3100, 2900, 3158],
    saramin:  [1400, 1700, 1500, 1900, 1750, 1874],
    worknet:  [510,  620,  580,  710,  680,  744],
  },
  applicants: {
    jobkorea: [38, 52, 44, 61, 58, 70],
    saramin:  [24, 31, 28, 38, 45, 52],
    worknet:  [9,  11, 10, 14, 13, 16],
  },
};

/* ================================================
   앱 전역 상태
   ================================================ */
const AppState = {
  currentPage: 'dashboard',
  jobs: [...JOBS_DATA],
  platforms: { ...PLATFORMS_DATA },
  notifications: [...NOTIFICATIONS_DATA],
  deployHistory: [...DEPLOY_HISTORY],
  monthlyStats: MONTHLY_STATS,

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
        j.title.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q) ||
        j.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return jobs;
  },
};

/* ================================================
   로컬스토리지 영속화 (선택적)
   ================================================ */
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
