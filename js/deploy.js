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
        <span class="badge badge-inactive"><span class="badge-dot"></span>미연동</span>
      </div>

      <div class="channel-plan-box" style="margin-top: var(--space-3)">
        ${escapeHtml(p.planNote)}
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
    AppState.platforms[id]?.name || (id === 'naver_cafe' ? '네이버 카페' : id);

  if (AppState.deployHistory.length === 0) {
    container.innerHTML = `<div style="text-align: center; padding: var(--space-6) 0; color: var(--text-muted); font-size: var(--text-sm)">배포 이력이 없습니다</div>`;
    return;
  }

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

// 전역 window 바인딩
window.initDeploy = initDeploy;
