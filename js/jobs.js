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
window.deployJob = deployJob;
window.openDeployModal = openDeployModal;
window.toggleJobStatus = toggleJobStatus;
window.deleteJob = deleteJob;
