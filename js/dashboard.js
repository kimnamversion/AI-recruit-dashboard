/**
 * dashboard.js — 메인 대시보드 화면 로직
 */

/* ================================================
   대시보드 초기화
   ================================================ */
function initDashboard() {
  renderKPICards();
  renderPlatformCards();
  renderRecentJobs();
  renderNotifFeed();
}

/* ================================================
   KPI 카드 렌더링
   ================================================ */
function renderKPICards() {
  const kpis = [
    {
      id: 'kpi-active-jobs',
      icon: '📋',
      label: '활성 공고',
      value: AppState.activeJobsCount,
      unit: '건',
      color: 'var(--accent-primary)',
    },
    {
      id: 'kpi-applicants',
      icon: '👥',
      label: '총 지원자',
      value: AppState.totalApplicants.toLocaleString(),
      unit: '명',
      color: 'var(--accent-secondary)',
    },
    {
      id: 'kpi-views',
      icon: '👁️',
      label: '이번 달 노출',
      value: AppState.totalViews.toLocaleString(),
      unit: '회',
      color: 'var(--accent-tertiary)',
    },
    {
      id: 'kpi-success-rate',
      icon: '🚀',
      label: '배포 성공률',
      value: AppState.deploySuccessRate,
      unit: '%',
      color: 'var(--accent-warning)',
    },
  ];

  const container = document.getElementById('kpi-grid');
  if (!container) return;

  container.innerHTML = kpis.map(kpi => `
    <div class="kpi-card" id="${kpi.id}" style="--kpi-color: ${kpi.color}">
      <div class="kpi-header">
        <div class="kpi-icon" style="background: ${kpi.color}18; color: ${kpi.color}">
          ${kpi.icon}
        </div>
      </div>
      <div class="kpi-value">${kpi.value}<span style="font-size: var(--text-xl); font-weight: 600; margin-left: 4px; color: var(--text-secondary)">${kpi.unit}</span></div>
      <div class="kpi-label">${kpi.label}</div>
    </div>
  `).join('');
}

/* ================================================
   플랫폼 현황 카드
   ================================================ */
function renderPlatformCards() {
  const container = document.getElementById('platform-grid');
  if (!container) return;

  const platforms = Object.values(AppState.platforms);
  container.innerHTML = platforms.map(p => `
    <div class="platform-card">
      <div class="platform-stripe" style="background: ${p.color}"></div>
      <div class="platform-header">
        <div class="platform-logo">
          <div class="platform-logo-icon" style="background: ${p.color}">
            ${p.icon}
          </div>
          <div>
            <div class="platform-logo-name">${p.name}</div>
            <div style="font-size: var(--text-xs); color: var(--text-muted)">${p.url}</div>
          </div>
        </div>
        <div>
          <span class="badge badge-inactive"><span class="badge-dot"></span>미연동</span>
        </div>
      </div>
      <div class="channel-plan-box" style="margin-top: var(--space-3)">
        ${escapeHtml(p.planNote)}
      </div>
    </div>
  `).join('');
}

/* ================================================
   최근 공고 테이블
   ================================================ */
function renderRecentJobs() {
  const container = document.getElementById('recent-jobs-tbody');
  if (!container) return;

  const recentJobs = AppState.jobs
    .filter(j => j.status !== 'ended')
    .slice(0, 5);

  container.innerHTML = recentJobs.map(job => {
    const platforms = Array.isArray(job.platforms) ? job.platforms : [];
    const knownPlatforms = ['jobkorea', 'saramin', 'worknet'];
    return `
    <tr>
      <td>
        <div class="job-title-cell">
          <div class="job-title-text">${escapeHtml(job.title || '')}</div>
          <div class="job-company-text">${escapeHtml(job.department || '')} · ${escapeHtml(job.location || '')}</div>
        </div>
      </td>
      <td>
        <div class="platform-badges">
          ${platforms.map(p => {
            const safeP = knownPlatforms.includes(p) ? p : 'inactive';
            return `
            <span class="badge badge-${safeP}">
              ${p === 'jobkorea' ? '잡코리아' : p === 'saramin' ? '사람인' : p === 'worknet' ? '워크넷' : '알 수 없음'}
            </span>
          `;
          }).join('')}
          ${platforms.length === 0 ? '<span class="badge badge-inactive">미배포</span>' : ''}
        </div>
      </td>
      <td>
        <span class="badge ${
          job.status === 'active'   ? 'badge-active' :
          job.status === 'paused'  ? 'badge-warning' :
          job.status === 'draft'   ? 'badge-inactive' :
          'badge-danger'
        }">
          <span class="badge-dot"></span>
          ${job.status === 'active' ? '진행 중' : job.status === 'paused' ? '일시정지' : job.status === 'draft' ? '임시저장' : '종료'}
        </span>
      </td>
      <td style="font-family: var(--font-latin); font-weight: 600; color: var(--text-primary)">
        ${(job.applicants || 0).toLocaleString()}명
      </td>
      <td style="font-family: var(--font-latin); color: var(--text-secondary)">
        ${(job.views || 0).toLocaleString()}
      </td>
      <td style="font-size: var(--text-xs); color: var(--text-muted)">
        ~${escapeHtml(job.deadline || '상시채용')}
      </td>
      <td>
        <div style="display: flex; gap: 4px">
          <button type="button" class="btn btn-sm btn-primary" onclick="goToAdCenter('${job.id}')" data-tooltip="광고/배포 센터" style="background: linear-gradient(135deg, #6c63ff, #3ecfff)">📣</button>
          <button type="button" class="btn btn-sm btn-secondary" onclick="navigateTo('jobs')" data-tooltip="상세 보기">✏️</button>
          ${job.status === 'active'
            ? `<button type="button" class="btn btn-sm btn-secondary" onclick="toggleJobStatus('${job.id}', 'paused')" data-tooltip="일시정지">⏸️</button>`
            : job.status === 'draft'
            ? `<button type="button" class="btn btn-sm btn-primary" onclick="deployJob('${job.id}')" data-tooltip="배포">🚀</button>`
            : ''
          }
        </div>
      </td>
    </tr>
  `;
  }).join('');
}

/* ================================================
   알림 피드
   ================================================ */
function renderNotifFeed() {
  const container = document.getElementById('notif-feed');
  if (!container) return;

  const iconBg = {
    success: 'rgba(34,211,160,0.12)',
    warning: 'rgba(245,158,11,0.12)',
    danger:  'rgba(244,63,94,0.12)',
    info:    'rgba(56,189,248,0.12)',
  };

  if (AppState.notifications.length === 0) {
    container.innerHTML = `<div style="text-align: center; padding: var(--space-6) 0; color: var(--text-muted); font-size: var(--text-sm)">알림이 없습니다</div>`;
    return;
  }

  container.innerHTML = AppState.notifications.map(n => `
    <div class="notif-item ${n.read ? 'read' : 'unread'}">
      <div class="notif-icon" style="background: ${iconBg[n.type] || iconBg.info}">
        ${n.icon}
      </div>
      <div class="notif-content">
        <div class="notif-title" style="${!n.read ? 'color: var(--text-primary)' : ''}">
          ${!n.read ? `<span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--accent-primary); margin-right: 4px; vertical-align: middle;"></span>` : ''}
          ${n.title}
        </div>
        <div class="notif-desc">${n.desc}</div>
      </div>
      <div class="notif-time">${n.time}</div>
    </div>
  `).join('');
}

// 전역 window 바인딩
window.initDashboard = initDashboard;
window.renderKPICards = renderKPICards;
window.renderPlatformCards = renderPlatformCards;
window.renderRecentJobs = renderRecentJobs;
window.renderNotifFeed = renderNotifFeed;
