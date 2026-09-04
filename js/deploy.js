/**
 * deploy.js — 자동배포 설정 페이지 로직
 */

function initDeploy() {
  renderDeployPlatforms();
  renderDeployTimeline();
}

/* ================================================
   플랫폼별 배포 설정
   ================================================ */
function renderDeployPlatforms() {
  const container = document.getElementById('deploy-platforms-list');
  if (!container) return;

  const platforms = Object.values(AppState.platforms);

  container.innerHTML = platforms.map(p => `
    <div class="deploy-platform-item" id="deploy-item-${p.id}">
      <div class="deploy-platform-header">
        <div class="platform-logo-icon" style="background: ${p.color}; width: 40px; height: 40px; font-size: 16px; font-weight: 800; color: white; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; flex-shrink: 0">${p.icon}</div>
        <div class="deploy-platform-info">
          <div class="deploy-platform-name">${p.name}</div>
          <div class="deploy-platform-url">${p.url}</div>
        </div>
        <div style="display: flex; align-items: center; gap: var(--space-3)">
          <span style="font-size: var(--text-sm); color: var(--text-secondary)">자동배포</span>
          <label class="toggle">
            <input type="checkbox" ${p.autoDeployEnabled ? 'checked' : ''} onchange="toggleAutoDeploy('${p.id}', this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); padding-top: var(--space-4); border-top: 1px solid var(--border-subtle)">
        <div class="form-group">
          <label class="form-label">배포 시작일</label>
          <input type="date" class="form-input" value="2026-09-01" onchange="updateSchedule('${p.id}', 'startDate', this.value)">
        </div>
        <div class="form-group">
          <label class="form-label">종료일</label>
          <input type="date" class="form-input" value="2026-09-30" onchange="updateSchedule('${p.id}', 'endDate', this.value)">
        </div>
        <div class="form-group">
          <label class="form-label">배포 시각</label>
          <input type="time" class="form-input" value="09:00" onchange="updateSchedule('${p.id}', 'deployTime', this.value)">
        </div>
        <div class="form-group">
          <label class="form-label">반복 주기</label>
          <select class="form-select" onchange="updateSchedule('${p.id}', 'repeat', this.value)">
            <option value="daily">매일</option>
            <option value="weekly" selected>매주</option>
            <option value="biweekly">격주</option>
            <option value="monthly">매월</option>
            <option value="once">1회</option>
          </select>
        </div>
      </div>

      <div style="display: flex; gap: var(--space-3); margin-top: var(--space-4); padding-top: var(--space-4); border-top: 1px solid var(--border-subtle); justify-content: flex-end">
        <button class="btn btn-secondary btn-sm" onclick="testDeployNow('${p.id}')">
          🔧 연결 테스트
        </button>
        <button class="btn btn-primary btn-sm" onclick="deployNow('${p.id}')">
          🚀 지금 배포
        </button>
      </div>
    </div>
  `).join('');
}

/* ================================================
   배포 이력 타임라인
   ================================================ */
function renderDeployTimeline() {
  const container = document.getElementById('deploy-timeline');
  if (!container) return;

  const statusMap = {
    success: { dot: 'success', label: '성공' },
    danger:  { dot: 'danger',  label: '실패' },
    warning: { dot: 'warning', label: '경고' },
    info:    { dot: 'info',    label: '정보' },
  };

  const platformName = id =>
    id === 'jobkorea' ? '잡코리아' : id === 'saramin' ? '사람인' : '워크넷';

  container.innerHTML = AppState.deployHistory.map(d => {
    const s = statusMap[d.status] || statusMap.info;
    return `
      <div class="timeline-item">
        <div class="timeline-dot ${s.dot}"></div>
        <div class="timeline-content">
          <div class="timeline-title">${d.jobTitle} → ${platformName(d.platform)}</div>
          <div class="timeline-desc">${d.message}</div>
        </div>
        <div class="timeline-time">${d.time}</div>
      </div>
    `;
  }).join('');
}

/* ================================================
   액션 핸들러
   ================================================ */
function toggleAutoDeploy(platformId, enabled) {
  AppState.platforms[platformId].autoDeployEnabled = enabled;
  saveToStorage();
  showToast(`${AppState.platforms[platformId].name} 자동배포가 ${enabled ? '활성화' : '비활성화'}되었습니다.`, enabled ? 'success' : 'info');
}

function updateSchedule(platformId, field, value) {
  // 실제로는 스케줄 데이터를 저장
  console.log(`${platformId} 스케줄 업데이트:`, field, value);
}

function testDeployNow(platformId) {
  const p = AppState.platforms[platformId];
  showToast(`${p.name} 연결 테스트 중...`, 'info');
  setTimeout(() => {
    if (p.apiStatus === 'connected') {
      showToast(`✅ ${p.name} 연결 상태 정상입니다.`, 'success');
    } else {
      showToast(`⚠️ ${p.name} API 토큰을 확인하세요.`, 'warning');
    }
  }, 1500);
}

function deployNow(platformId) {
  const p = AppState.platforms[platformId];
  const activeJobs = AppState.jobs.filter(j => j.status === 'active' && j.platforms.includes(platformId));

  if (activeJobs.length === 0) {
    showToast(`${p.name}에 배포할 활성 공고가 없습니다.`, 'warning');
    return;
  }

  showToast(`🚀 ${p.name}에 ${activeJobs.length}건 배포 시작...`, 'info');

  setTimeout(() => {
    const newHistory = {
      id: 'D' + Date.now(),
      jobTitle: activeJobs[0].title + (activeJobs.length > 1 ? ` 외 ${activeJobs.length - 1}건` : ''),
      platform: platformId,
      status: 'success',
      time: new Date().toLocaleString('ko-KR', { hour12: false }).replace(/\. /g, '-').replace('.', ''),
      message: `${activeJobs.length}건 게재 성공`,
    };
    AppState.deployHistory.unshift(newHistory);
    renderDeployTimeline();
    showToast(`✅ ${p.name} 배포 완료!`, 'success');
  }, 2000);
}

// 전역 window 바인딩
window.initDeploy = initDeploy;
window.toggleAutoDeploy = toggleAutoDeploy;
window.updateSchedule = updateSchedule;
window.testDeployNow = testDeployNow;
window.deployNow = deployNow;
