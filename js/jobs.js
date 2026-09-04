/**
 * jobs.js — 채용공고 관리 페이지 및 새 공고 등록 로직
 */

let currentEditingJobId = null;

/* ================================================
   공고 관리 초기화
   ================================================ */
function initJobs() {
  renderJobsPage();
  bindJobsEvents();
}

function renderJobsPage() {
  renderJobStats();
  renderJobsList();
}

/* ================================================
   공고 통계 요약
   ================================================ */
function renderJobStats() {
  const all     = AppState.jobs.length;
  const active  = AppState.jobs.filter(j => j.status === 'active').length;
  const paused  = AppState.jobs.filter(j => j.status === 'paused').length;
  const draft   = AppState.jobs.filter(j => j.status === 'draft').length;

  const el = id => document.getElementById(id);
  if (el('job-stat-all'))    el('job-stat-all').textContent    = all;
  if (el('job-stat-active')) el('job-stat-active').textContent = active;
  if (el('job-stat-paused')) el('job-stat-paused').textContent = paused;
  if (el('job-stat-draft'))  el('job-stat-draft').textContent  = draft;
}

/* ================================================
   공고 목록 렌더링
   ================================================ */
function renderJobsList() {
  const container = document.getElementById('jobs-list');
  if (!container) return;

  const jobs = AppState.getFilteredJobs();

  if (jobs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-title">공고가 없습니다</div>
        <div class="empty-state-desc">검색 조건을 변경하거나 [+ 새 공고 등록] 버튼을 눌러 새 공고를 작성하세요.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = jobs.map(job => `
    <div class="job-card" id="job-card-${job.id}">
      <div class="job-card-header">
        <div>
          <div class="job-card-title">${escapeHtml(job.title)}</div>
          <div class="job-card-company">${escapeHtml(job.company || '(주)테크스타트업')} · ${escapeHtml(job.category || job.department || '일반')}</div>
        </div>
        <span class="badge ${
          job.status === 'active'  ? 'badge-active' :
          job.status === 'paused' ? 'badge-warning' :
          job.status === 'draft'  ? 'badge-inactive' :
          'badge-danger'
        }">
          <span class="badge-dot"></span>
          ${job.status === 'active' ? '진행 중' : job.status === 'paused' ? '일시정지' : job.status === 'draft' ? '임시저장' : '종료'}
        </span>
      </div>

      <div class="job-card-meta">
        <div class="job-card-meta-item">📍 ${escapeHtml(job.location || '위치 미지정')}</div>
        <div class="job-card-meta-item">💼 ${escapeHtml(job.career || '경력무관')} · ${escapeHtml(job.type || '정규직')}</div>
        <div class="job-card-meta-item">💰 ${escapeHtml(job.salary || '협의')}</div>
        <div class="job-card-meta-item">⏰ ${escapeHtml(job.workTime || '09:00 ~ 18:00')}</div>
        <div class="job-card-meta-item">📅 ~${escapeHtml(job.deadline || '상시채용')}</div>
      </div>

      <div class="job-card-platforms">
        ${(job.platforms || []).map(p => `
          <span class="badge badge-${p}">
            ${p === 'jobkorea' ? '잡코리아' : p === 'saramin' ? '사람인' : '워크넷'}
          </span>
        `).join('')}
        ${(!job.platforms || job.platforms.length === 0) ? '<span class="badge badge-inactive">미배포</span>' : ''}
        ${job.aiCopy ? '<span class="badge badge-info">✨ AI카피</span>' : ''}
      </div>

      <div class="job-card-footer">
        <div style="display: flex; gap: var(--space-4)">
          <div style="text-align: center">
            <div style="font-size: var(--text-lg); font-weight: 700; color: var(--text-primary); font-family: var(--font-latin)">${job.applicants || 0}</div>
            <div style="font-size: var(--text-xs); color: var(--text-muted)">지원자</div>
          </div>
          <div style="text-align: center">
            <div style="font-size: var(--text-lg); font-weight: 700; color: var(--text-primary); font-family: var(--font-latin)">${(job.views || 0).toLocaleString()}</div>
            <div style="font-size: var(--text-xs); color: var(--text-muted)">노출</div>
          </div>
        </div>
        <div class="job-card-actions">
          <button type="button" class="btn btn-sm btn-primary" onclick="goToAdCenter('${job.id}')" style="background: linear-gradient(135deg, #6c63ff 0%, #3ecfff 100%)" data-tooltip="광고/배포 센터에서 문구 생성">
            📣 광고/배포
          </button>
          <button type="button" class="btn btn-sm btn-secondary" onclick="previewSavedJob('${job.id}')" data-tooltip="공고 미리보기">
            👁️ 미리보기
          </button>
          ${job.status === 'draft' ? `
            <button type="button" class="btn btn-sm btn-secondary" onclick="deployJob('${job.id}')">
              🚀 배포
            </button>
          ` : job.status === 'active' ? `
            <button type="button" class="btn btn-sm btn-secondary" onclick="toggleJobStatus('${job.id}', 'paused')">
              ⏸️ 정지
            </button>
          ` : job.status === 'paused' ? `
            <button type="button" class="btn btn-sm btn-success" onclick="toggleJobStatus('${job.id}', 'active')">
              ▶️ 재개
            </button>
          ` : ''}
          <button type="button" class="btn btn-sm btn-secondary" onclick="openEditJobModal('${job.id}')" data-tooltip="수정">
            ✏️ 수정
          </button>
          <button type="button" class="btn btn-sm btn-danger" onclick="deleteJob('${job.id}')" data-tooltip="삭제">
            🗑️
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

/* ================================================
   이벤트 바인딩
   ================================================ */
function bindJobsEvents() {
  const searchInput = document.getElementById('jobs-search');
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      AppState.jobSearch = e.target.value;
      renderJobsList();
    });
  }

  document.querySelectorAll('.filter-chip[data-filter]').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip[data-filter]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      AppState.jobFilter = chip.dataset.filter;
      renderJobsList();
    });
  });

  // 모달 내부 input에서 Enter 키를 눌렀을 때 의도치 않게 모달이 닫히거나 제출되는 현상 방지
  const jobModal = document.getElementById('job-modal');
  if (jobModal) {
    jobModal.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
        e.preventDefault(); // 인풋에서 엔터 시 제출/닫힘 방지
      }
    });
  }
}


/* ================================================
   칩 선택 헬퍼
   ================================================ */
function selectCategoryChip(catName) {
  const input = document.getElementById('job-form-category');
  if (input) {
    input.value = catName;
    input.focus();
  }

  // 칩 하이라이트
  document.querySelectorAll('#job-category-chips .chip-btn').forEach(chip => {
    chip.classList.toggle('selected', chip.textContent.includes(catName));
  });
}

function addBenefitChip(benefitName) {
  const input = document.getElementById('job-form-benefits');
  if (!input) return;

  const current = input.value.trim();
  const list = current ? current.split(',').map(s => s.trim()).filter(Boolean) : [];

  if (list.includes(benefitName)) {
    // 이미 있으면 제거
    const filtered = list.filter(b => b !== benefitName);
    input.value = filtered.join(', ');
  } else {
    // 없으면 추가
    list.push(benefitName);
    input.value = list.join(', ');
  }
}

/* ================================================
   공고 등록 / 수정 모달 열기
   ================================================ */
function openJobModal(job = null) {
  currentEditingJobId = job ? job.id : null;
  const modal = document.getElementById('job-modal');
  if (!modal) return;

  const isEdit = !!job;
  document.getElementById('job-modal-title').textContent = isEdit ? '✏️ 공고 수정' : '➕ 새 공고 등록';

  // 필드 초기화 또는 채우기
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val !== undefined && val !== null ? val : '';
  };

  setVal('job-form-title', job?.title || '');
  setVal('job-form-category', job?.category || job?.department || '');
  setVal('job-form-company', job?.company || '(주)테크스타트업');
  setVal('job-form-location', job?.location || '서울 강남구 테헤란로');
  setVal('job-form-headcount', job?.headcount || '1명');

  // 급여 분리 파싱
  let salaryType = '월급';
  let salaryAmount = '2,800,000원';
  if (job?.salary) {
    if (job.salary.includes('시급')) { salaryType = '시급'; salaryAmount = job.salary.replace('시급', '').trim(); }
    else if (job.salary.includes('일급')) { salaryType = '일급'; salaryAmount = job.salary.replace('일급', '').trim(); }
    else if (job.salary.includes('월급')) { salaryType = '월급'; salaryAmount = job.salary.replace('월급', '').trim(); }
    else if (job.salary.includes('연봉')) { salaryType = '연봉'; salaryAmount = job.salary.replace('연봉', '').trim(); }
    else if (job.salary.includes('협의')) { salaryType = '협의'; salaryAmount = '협의'; }
    else { salaryAmount = job.salary; }
  }
  setVal('job-form-salary-type', salaryType);
  setVal('job-form-salary-amount', salaryAmount);

  setVal('job-form-type', job?.type || '정규직');

  // 근무시간 분리 파싱
  let timeStart = '09:00';
  let timeEnd = '18:00';
  if (job?.workTime && job.workTime.includes('~')) {
    const parts = job.workTime.split('~').map(s => s.trim());
    if (parts[0]) timeStart = parts[0];
    if (parts[1]) timeEnd = parts[1];
  }
  setVal('job-form-time-start', timeStart);
  setVal('job-form-time-end', timeEnd);

  // 마감일 기본값: 30일 뒤
  if (job?.deadline) {
    setVal('job-form-deadline', job.deadline);
  } else {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setVal('job-form-deadline', d.toISOString().split('T')[0]);
  }

  setVal('job-form-career', job?.career || '경력무관');
  setVal('job-form-education', job?.education || '학력무관');
  setVal('job-form-benefits', job?.benefits || '4대보험, 중식제공, 퇴직금, 연차수당');
  setVal('job-form-description', job?.description || '');
  setVal('job-form-qualifications', job?.qualifications || '');
  setVal('job-form-preferred', job?.preferred || '');
  setVal('job-form-company-intro', job?.companyIntro || '');

  // 칩 상태 초기화
  document.querySelectorAll('#job-category-chips .chip-btn').forEach(chip => {
    chip.classList.toggle('selected', chip.textContent.includes(job?.category || ''));
  });

  modal.classList.remove('hidden');
}

function openEditJobModal(jobId) {
  const job = AppState.jobs.find(j => j.id === jobId);
  if (!job) return;
  openJobModal(job);
}

/* ================================================
   모달 입력값 수집 및 검증
   ================================================ */
function getFormDataFromModal() {
  const title = document.getElementById('job-form-title')?.value.trim() || '';
  const category = document.getElementById('job-form-category')?.value.trim() || '';
  const location = document.getElementById('job-form-location')?.value.trim() || '';
  const headcount = document.getElementById('job-form-headcount')?.value.trim() || '0명';
  const salaryType = document.getElementById('job-form-salary-type')?.value || '월급';
  const salaryAmount = document.getElementById('job-form-salary-amount')?.value.trim() || '협의';
  const type = document.getElementById('job-form-type')?.value || '정규직';
  const timeStart = document.getElementById('job-form-time-start')?.value || '09:00';
  const timeEnd = document.getElementById('job-form-time-end')?.value || '18:00';
  const deadline = document.getElementById('job-form-deadline')?.value || '';

  const company = document.getElementById('job-form-company')?.value.trim() || '(주)테크스타트업';
  const career = document.getElementById('job-form-career')?.value || '경력무관';
  const education = document.getElementById('job-form-education')?.value || '학력무관';
  const benefits = document.getElementById('job-form-benefits')?.value.trim() || '';
  const description = document.getElementById('job-form-description')?.value.trim() || '';
  const qualifications = document.getElementById('job-form-qualifications')?.value.trim() || '';
  const preferred = document.getElementById('job-form-preferred')?.value.trim() || '';
  const companyIntro = document.getElementById('job-form-company-intro')?.value.trim() || '';

  const salary = salaryType === '협의' ? '협의' : `${salaryType} ${salaryAmount}`;
  const workTime = `${timeStart} ~ ${timeEnd}`;

  return {
    title,
    category,
    company,
    location,
    headcount,
    salary,
    salaryType,
    salaryAmount,
    type,
    workTime,
    timeStart,
    timeEnd,
    deadline,
    career,
    education,
    benefits,
    description,
    qualifications,
    preferred,
    companyIntro,
  };
}

/* ================================================
   저장 처리 (임시저장 및 등록)
   ================================================ */
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

/* ================================================
   실시간 공고 미리보기
   ================================================ */
function previewCurrentJobModal() {
  const data = getFormDataFromModal();
  if (!data.title) {
    showToast('공고 제목을 먼저 입력해야 미리보기가 가능합니다.', 'warning');
    document.getElementById('job-form-title')?.focus();
    return;
  }
  renderPreviewModal(data);
}

function previewSavedJob(jobId) {
  const job = AppState.jobs.find(j => j.id === jobId);
  if (!job) return;
  renderPreviewModal(job);
}

function renderPreviewModal(job) {
  const area = document.getElementById('preview-content-area');
  const modal = document.getElementById('preview-modal');
  if (!area || !modal) return;

  const desc = job.description || '상세 업무 내용이 아직 입력되지 않았습니다.';
  const qual = job.qualifications || '성실하고 책임감 있게 근무하실 분';
  const pref = job.preferred || '인근 거주자 및 유관 업무 경험자 우대';
  const intro = job.companyIntro || `${job.company || '(주)테크스타트업'}에서 함께 성장할 인재를 기다립니다.`;
  const ben = job.benefits || '4대보험, 중식제공, 퇴직금, 연차';

  area.innerHTML = `
    <div class="job-preview-header">
      <div style="display: flex; gap: var(--space-2); margin-bottom: var(--space-2)">
        <span class="badge badge-primary">${escapeHtml(job.category || job.department || '채용')}</span>
        <span class="badge badge-info">${escapeHtml(job.type || '정규직')}</span>
        <span class="badge badge-active">모집 마감: ~${escapeHtml(job.deadline || '상시')}</span>
      </div>
      <div class="job-preview-title">${escapeHtml(job.title)}</div>
      <div class="job-preview-company">
        🏢 <strong>${escapeHtml(job.company || '(주)테크스타트업')}</strong>
        <span>·</span>
        <span>📍 ${escapeHtml(job.location || '근무지 협의')}</span>
      </div>
    </div>

    <div class="job-preview-grid">
      <div class="job-preview-info-item">
        <div class="job-preview-info-label">💰 급여 조건</div>
        <div class="job-preview-info-value" style="color: var(--accent-secondary)">${escapeHtml(job.salary || '협의')}</div>
      </div>
      <div class="job-preview-info-item">
        <div class="job-preview-info-label">⏰ 근무 시간</div>
        <div class="job-preview-info-value">${escapeHtml(job.workTime || '09:00 ~ 18:00')}</div>
      </div>
      <div class="job-preview-info-item">
        <div class="job-preview-info-label">💼 지원 자격 (경력 / 학력)</div>
        <div class="job-preview-info-value">${escapeHtml(job.career || '경력무관')} / ${escapeHtml(job.education || '학력무관')}</div>
      </div>
      <div class="job-preview-info-item">
        <div class="job-preview-info-label">👥 모집 인원</div>
        <div class="job-preview-info-value">${escapeHtml(job.headcount || '0명')}</div>
      </div>
    </div>

    <div class="job-preview-body">
      <div class="job-preview-section">
        <div class="job-preview-sec-title">📋 상세 담당 업무</div>
        <div class="job-preview-sec-content">${escapeHtml(desc)}</div>
      </div>

      <div class="job-preview-section">
        <div class="job-preview-sec-title">✅ 자격 요건</div>
        <div class="job-preview-sec-content">${escapeHtml(qual)}</div>
      </div>

      <div class="job-preview-section">
        <div class="job-preview-sec-title">🌟 우대 사항</div>
        <div class="job-preview-sec-content">${escapeHtml(pref)}</div>
      </div>

      <div class="job-preview-section">
        <div class="job-preview-sec-title">🎁 복리후생 & 지원 혜택</div>
        <div class="job-preview-sec-content">${escapeHtml(ben)}</div>
      </div>

      <div class="job-preview-section">
        <div class="job-preview-sec-title">🏢 회사 소개 및 안내</div>
        <div class="job-preview-sec-content">${escapeHtml(intro)}</div>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
}

/* ================================================
   AI 스마트 카피 자동 완성 (실제 사업장 직종별 템플릿)
   ================================================ */

/** 직종/키워드별 AI 생성 뱅크 */
const AI_GENERATION_BANK = {
  생산: {
    description: `• 제품 조립 및 가공 라인 생산 작업\n• 생산 제품의 육안 검사 및 불량품 선별\n• 작업장 정리정돈 및 기본 안전 수칙 준수\n• 일일 생산 목표 달성 및 라인 서포트`,
    qualifications: `• 신체 건강하고 성실한 분 (초보자 환영 / 교육 제공)\n• 장기 근속 및 교대 근무 가능자 우대\n• 꼼꼼하고 책임감 있는 자세`,
    preferred: `• 인근 거주자 및 자차 출퇴근 가능자 우대\n• 제조업 및 생산 공장 유경험자 우대\n• 지게차 운전 등 관련 자격증 소지자 우대`,
    companyIntro: `당사는 정직과 신뢰를 바탕으로 고품질 제품을 생산하는 탄탄한 강소기업입니다. 안전하고 쾌적한 작업 환경을 보장합니다.`,
    benefits: `4대보험, 중식제공, 퇴직금, 작업복지급, 통근버스운행, 연차수당`,
  },
  물류: {
    description: `• 물류센터 입고/출고 물품 분류 및 피킹/패킹 작업\n• 바코드 스캐너를 활용한 재고 전산 확인\n• 적재 및 화물 상하차 보조 업무\n• 물류 창고 내 안전 및 청결 유지`,
    qualifications: `• 남녀노소 누구나 지원 가능 (경력 무관 / 초보 가능)\n• 기본적인 스마트폰 및 바코드 리더기 사용 가능자\n• 근태가 확실하고 시간 약속을 잘 지키는 분`,
    preferred: `• 물류센터 및 택배 상하차 경험자 우대\n• 지게차 기능사 자격증 보유자 우대\n• 즉시 출근 가능자 적극 우대`,
    companyIntro: `빠르고 정확한 물류 시스템을 구축하여 업계를 선도하고 있는 물류 전문 기업입니다. 체계적인 교육 시스템을 갖추고 있습니다.`,
    benefits: `4대보험, 중식제공, 주휴수당, 퇴직금, 연차수당, 휴게공간제공`,
  },
  건설: {
    description: `• 건설 및 공사 현장 내 기본 자재 운반 및 시공 보조\n• 현장 안전 관리 및 정리정돈(TBM 참석)\n• 작업 지시에 따른 기초 설비 및 보조 작업`,
    qualifications: `• 건설업 기초안전보건교육 이수증 필수 소지자\n• 신체 건강하고 안전 의식이 투철한 분\n• 현장 출퇴근에 결격사유가 없는 분`,
    preferred: `• 건설 현장 유경험자 및 형틀/비계/설비 보조 경험자\n• 운전면허 소지자 우대`,
    companyIntro: `안전제일을 최우선 가치로 두고 쾌적하고 투명한 현장 운영을 약속드리는 건설 전문 시공사입니다.`,
    benefits: `4대보험, 중식제공, 조식제공, 안전용품지급, 주휴수당`,
  },
  조리: {
    description: `• 식자재 전처리 및 메뉴 조리/조리 보조\n• 주방 위생 관리 및 식기 세척, 주방 마감\n• 식자재 재고 관리 및 발주 보조`,
    qualifications: `• 보건증 필수 소지자 (또는 발급 예정자)\n• 음식 조리에 열정과 성실함을 갖춘 분\n• 위생 관념이 철저한 분`,
    preferred: `• 한식/양식/중식 조리사 자격증 소지자 우대\n• 대형 식당 또는 단체급식 조리 경험자 우대`,
    companyIntro: `신선한 식재료와 정성으로 고객에게 맛있는 행복을 전하는 외식 브랜드입니다.`,
    benefits: `4대보험, 식사제공, 퇴직금, 유니폼지급, 성과인센티브`,
  },
  청소: {
    description: `• 건물 내 공용 공간, 복도, 계단, 화장실 정기 청소\n• 쓰레기 수거 및 분리수거장 정리\n• 바닥 왁스 작업 및 쾌적한 환경 유지 관리`,
    qualifications: `• 성실하고 꼼꼼한 성격의 소유자\n• 초보자 가능 (업무 방법 친절 안내)\n• 장기 근무 가능한 분`,
    preferred: `• 빌딩/오피스/아파트 미화 청소 유경험자 우대\n• 인근 거주자 우대`,
    companyIntro: `쾌적하고 청결한 환경을 책임지는 전문 건물 종합관리 기업입니다.`,
    benefits: `4대보험, 중식제공, 퇴직금, 작업복지급, 명절선물`,
  },
  경비: {
    description: `• 사업장 및 건물 내 출입자/차량 통제 및 안내\n• 정기 시설물 순찰 및 화재/도난 예방 점검\n• 민원 응대 및 주차 관리 보조`,
    qualifications: `• 일반경비신임교육 이수증 소지자\n• 단정한 용모와 친절한 서비스 마인드\n• 주야 교대 근무 가능자`,
    preferred: `• 아파트, 오피스 빌딩, 공장 경비 유경험자\n• 소방안전관리자 등 유관 자격증 보유자 우대`,
    companyIntro: `철저한 보안과 안전으로 고객의 소중한 자산을 지키는 종합 보안관리 파트너입니다.`,
    benefits: `4대보험, 퇴직금, 유니폼지급, 심야수당, 휴게실완비`,
  },
  사무: {
    description: `• 일반 사무 지원, 문서 작성 및 데이터 입력\n• 전표 처리, 영수증 관리 및 비용 정산\n• 전화 응대 및 내방객 안내, 비품 관리`,
    qualifications: `• 엑셀, 한글, 워드 등 MS Office 기본 활용 가능자\n• 꼼꼼한 업무 처리 및 원활한 커뮤니케이션 역량\n• 신입 / 경력 무관`,
    preferred: `• 컴퓨터활용능력, 전산회계 등 사무 자격증 보유자 우대\n• 유관 사무 보조 업무 경험자 우대`,
    companyIntro: `수평적이고 자유로운 분위기 속에서 스마트하게 일하는 강소기업입니다.`,
    benefits: `4대보험, 퇴직금, 자유로운연차사용, 자기계발비, 간식제공`,
  },
  영업: {
    description: `• 신규 잠재 고객 발굴 및 제안 미팅 진행\n• 기존 거래처 관리 및 정기 피드백 수렴\n• 상품/서비스 상담 및 계약 체결\n• 영업 실적 분석 및 시장 동향 조사`,
    qualifications: `• 적극적이고 밝은 대인관계 역량을 갖춘 분\n• 목표 달성 지향적 마인드\n• 운전면허 소지자`,
    preferred: `• B2B / B2C 영업 실무 경험자 우대\n• 관련 업계 인프라 및 네트워크 보유자 우대`,
    companyIntro: `업계 최고 수준의 인센티브와 확실한 성장의 기회를 제공하는 기업입니다.`,
    benefits: `4대보험, 차량유류비지원, 성과인센티브, 통신비지원, 퇴직금`,
  },
  개발: {
    description: `• 웹/앱 서비스 신규 기능 개발 및 유지보수\n• RESTful API 설계 및 데이터베이스 최적화\n• 코드 리뷰 및 버그 수정, 아키텍처 개선`,
    qualifications: `• 관련 분야 실무 개발 경험 (1년 이상 또는 이에 준하는 역량)\n• Git 등 형상관리 툴 활용 능숙\n• 원활한 협업 및 커뮤니케이션 능력`,
    preferred: `• 최신 기술 스택 도입 및 리팩토링 경험자 우대\n• 대용량 트래픽 처리 경험자 우대`,
    companyIntro: `기술로 세상을 더 편리하게 만드는 혁신적인 테크 기업입니다.`,
    benefits: `4대보험, 자율출퇴근, 최신장비지원, 도서구입비, 퇴직금`,
  },
};

function generateAICopy() {
  const title = document.getElementById('job-form-title')?.value.trim() || '';
  const category = document.getElementById('job-form-category')?.value.trim() || '';
  const company = document.getElementById('job-form-company')?.value.trim() || '(주)테크스타트업';
  const location = document.getElementById('job-form-location')?.value.trim() || '서울';
  const salaryType = document.getElementById('job-form-salary-type')?.value || '월급';
  const salaryAmount = document.getElementById('job-form-salary-amount')?.value.trim() || '협의';

  if (!title) {
    showToast('먼저 공고 제목을 입력해주세요.', 'warning');
    document.getElementById('job-form-title')?.focus();
    return;
  }

  // 직종 키워드 매칭
  const fullText = (title + ' ' + category).toLowerCase();
  let matchedKey = '생산';
  if (/물류|창고|입출고|포장|패킹|택배|상하차/.test(fullText)) matchedKey = '물류';
  else if (/건설|현장|시공|토목|전기|배관/.test(fullText)) matchedKey = '건설';
  else if (/조리|주방|홀|음식|식당|카페|바리스타/.test(fullText)) matchedKey = '조리';
  else if (/청소|미화|환경|위생/.test(fullText)) matchedKey = '청소';
  else if (/경비|보안|순찰|주차/.test(fullText)) matchedKey = '경비';
  else if (/사무|총무|인사|회계|경리|행정|관리/.test(fullText)) matchedKey = '사무';
  else if (/영업|마케팅|판매|md|세일즈/.test(fullText)) matchedKey = '영업';
  else if (/개발|엔지니어|engineer|dev|it|프로그래머/.test(fullText)) matchedKey = '개발';
  else if (/생산|제조|공장|조립|검사/.test(fullText)) matchedKey = '생산';

  const bank = AI_GENERATION_BANK[matchedKey] || AI_GENERATION_BANK['생산'];

  // 입력 필드 자동 채움
  const setWithAnimation = (id, text) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = text;
    el.style.transition = 'background-color 0.4s';
    el.style.backgroundColor = 'rgba(108, 99, 255, 0.15)';
    setTimeout(() => { el.style.backgroundColor = ''; }, 600);
  };

  setWithAnimation('job-form-description', bank.description);
  setWithAnimation('job-form-qualifications', bank.qualifications);
  setWithAnimation('job-form-preferred', bank.preferred);
  setWithAnimation('job-form-company-intro', bank.companyIntro);

  // 복리후생 필드가 비어있으면 채움
  const benInput = document.getElementById('job-form-benefits');
  if (benInput && !benInput.value.trim()) {
    setWithAnimation('job-form-benefits', bank.benefits);
  }

  // 직종 필드가 비어있으면 매칭된 직종 자동 입력
  const catInput = document.getElementById('job-form-category');
  if (catInput && !catInput.value.trim()) {
    catInput.value = matchedKey;
    selectCategoryChip(matchedKey);
  }

  showToast(`✨ [${matchedKey}] 직종 맞춤 공고 문안이 자동 작성되었습니다!`, 'success');
}

/* ================================================
   배포 모달 연동
   ================================================ */
function deployJob(jobId) {
  const job = AppState.jobs.find(j => j.id === jobId);
  if (!job) return;
  openDeployModal(job);
}

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
window.initJobs = initJobs;
window.renderJobsPage = renderJobsPage;
window.renderJobsList = renderJobsList;
window.renderJobStats = renderJobStats;
window.openJobModal = openJobModal;
window.openEditJobModal = openEditJobModal;
window.saveJobFromModal = saveJobFromModal;
window.previewCurrentJobModal = previewCurrentJobModal;
window.previewSavedJob = previewSavedJob;
window.selectCategoryChip = selectCategoryChip;
window.addBenefitChip = addBenefitChip;
window.generateAICopy = generateAICopy;
window.deployJob = deployJob;
window.openDeployModal = openDeployModal;
window.toggleJobStatus = toggleJobStatus;
window.deleteJob = deleteJob;
