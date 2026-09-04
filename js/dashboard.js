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
  renderDeployChart();
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
      trend: '+2',
      trendDir: 'up',
      sub: '이번 달 신규 2건',
      color: 'var(--accent-primary)',
    },
    {
      id: 'kpi-applicants',
      icon: '👥',
      label: '총 지원자',
      value: AppState.totalApplicants.toLocaleString(),
      unit: '명',
      trend: '+18',
      trendDir: 'up',
      sub: '지난주 대비 +18명',
      color: 'var(--accent-secondary)',
    },
    {
      id: 'kpi-views',
      icon: '👁️',
      label: '이번 달 노출',
      value: AppState.totalViews.toLocaleString(),
      unit: '회',
      trend: '+12%',
      trendDir: 'up',
      sub: '전달 대비 12% 증가',
      color: 'var(--accent-tertiary)',
    },
    {
      id: 'kpi-success-rate',
      icon: '🚀',
      label: '배포 성공률',
      value: AppState.deploySuccessRate,
      unit: '%',
      trend: '-5%',
      trendDir: 'down',
      sub: '워크넷 오류 영향',
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
        <div class="kpi-trend ${kpi.trendDir}">
          ${kpi.trendDir === 'up' ? '↑' : '↓'} ${kpi.trend}
        </div>
      </div>
      <div class="kpi-value">${kpi.value}<span style="font-size: var(--text-xl); font-weight: 600; margin-left: 4px; color: var(--text-secondary)">${kpi.unit}</span></div>
      <div class="kpi-label">${kpi.label}</div>
      <div class="kpi-sub">${kpi.sub}</div>
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
  container.innerHTML = platforms.map(p => {
    const budgetPct = p.monthlyBudget > 0
      ? Math.round((p.usedBudget / p.monthlyBudget) * 100)
      : 0;

    return `
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
            ${p.apiStatus === 'connected'
              ? '<span class="badge badge-active"><span class="badge-dot"></span>연결됨</span>'
              : '<span class="badge badge-warning"><span class="badge-dot"></span>주의</span>'
            }
          </div>
        </div>
        <div class="platform-stats">
          <div class="platform-stat">
            <div class="platform-stat-value">${p.activeJobs}</div>
            <div class="platform-stat-label">활성 공고</div>
          </div>
          <div class="platform-stat">
            <div class="platform-stat-value">${p.totalApplicants}</div>
            <div class="platform-stat-label">지원자</div>
          </div>
          <div class="platform-stat">
            <div class="platform-stat-value">${p.totalViews.toLocaleString()}</div>
            <div class="platform-stat-label">노출 수</div>
          </div>
        </div>
        ${p.monthlyBudget > 0 ? `
          <div style="margin-top: var(--space-4)">
            <div class="flex-between" style="margin-bottom: var(--space-2)">
              <span style="font-size: var(--text-xs); color: var(--text-muted)">월 예산 사용</span>
              <span style="font-size: var(--text-xs); font-weight: 600; color: var(--text-secondary)">
                ${p.usedBudget.toLocaleString()}원 / ${p.monthlyBudget.toLocaleString()}원
              </span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${budgetPct}%; background: linear-gradient(90deg, ${p.color}aa, ${p.color})"></div>
            </div>
            <div style="text-align: right; margin-top: 4px; font-size: var(--text-xs); color: var(--text-muted)">${budgetPct}% 사용</div>
          </div>
        ` : `
          <div style="margin-top: var(--space-4); text-align: center; font-size: var(--text-xs); color: var(--accent-success)">
            ✓ 무료 플랫폼
          </div>
        `}
        <div style="margin-top: var(--space-3); padding-top: var(--space-3); border-top: 1px solid var(--border-subtle)">
          <div style="font-size: var(--text-xs); color: var(--text-muted)">
            마지막 배포: ${p.lastDeployed || '없음'}
          </div>
        </div>
      </div>
    `;
  }).join('');
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

  container.innerHTML = recentJobs.map(job => `
    <tr>
      <td>
        <div class="job-title-cell">
          <div class="job-title-text">${job.title}</div>
          <div class="job-company-text">${job.department} · ${job.location}</div>
        </div>
      </td>
      <td>
        <div class="platform-badges">
          ${job.platforms.map(p => `
            <span class="badge badge-${p}">
              ${p === 'jobkorea' ? '잡코리아' : p === 'saramin' ? '사람인' : '워크넷'}
            </span>
          `).join('')}
          ${job.platforms.length === 0 ? '<span class="badge badge-inactive">미배포</span>' : ''}
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
        ${job.applicants.toLocaleString()}명
      </td>
      <td style="font-family: var(--font-latin); color: var(--text-secondary)">
        ${job.views.toLocaleString()}
      </td>
      <td style="font-size: var(--text-xs); color: var(--text-muted)">
        ~${job.deadline}
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
  `).join('');
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

/* ================================================
   배포 현황 차트 (Chart.js)
   ================================================ */
function renderDeployChart() {
  const canvas = document.getElementById('deploy-chart');
  if (!canvas || typeof Chart === 'undefined') return;

  // 기존 차트 삭제
  const existing = Chart.getChart(canvas);
  if (existing) existing.destroy();

  const stats = AppState.monthlyStats;

  new Chart(canvas, {
    type: 'bar',
    data: {
      labels: stats.labels,
      datasets: [
        {
          label: '잡코리아',
          data: stats.applicants.jobkorea,
          backgroundColor: 'rgba(232,66,26,0.7)',
          borderColor: 'rgba(232,66,26,1)',
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: '사람인',
          data: stats.applicants.saramin,
          backgroundColor: 'rgba(0,102,204,0.7)',
          borderColor: 'rgba(0,102,204,1)',
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: '워크넷',
          data: stats.applicants.worknet,
          backgroundColor: 'rgba(0,131,62,0.7)',
          borderColor: 'rgba(0,131,62,1)',
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#8b9ab8',
            font: { size: 12, family: 'Pretendard' },
            boxWidth: 12,
            boxHeight: 12,
          },
        },
        tooltip: {
          backgroundColor: '#1a2234',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          titleColor: '#f0f4ff',
          bodyColor: '#8b9ab8',
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y}명`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#8b9ab8', font: { size: 11 } },
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: {
            color: '#8b9ab8',
            font: { size: 11 },
            callback: val => val + '명',
          },
          beginAtZero: true,
        },
      },
    },
  });
}

// 전역 window 바인딩
window.initDashboard = initDashboard;
window.renderKPICards = renderKPICards;
window.renderPlatformCards = renderPlatformCards;
window.renderRecentJobs = renderRecentJobs;
window.renderNotifFeed = renderNotifFeed;
window.renderDeployChart = renderDeployChart;
