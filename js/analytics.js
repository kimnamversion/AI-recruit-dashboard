/**
 * analytics.js — 성과 분석 페이지 로직
 */

function initAnalytics() {
  renderAnalyticsSummary();
  renderViewsChart();
  renderPlatformCompare();
  renderTopJobsTable();
  bindAnalyticsEvents();
}

/* ================================================
   성과 요약 KPI
   ================================================ */
function renderAnalyticsSummary() {
  const stats = AppState.monthlyStats;
  const lastMonthIdx = stats.labels.length - 1;
  const prevMonthIdx = lastMonthIdx - 1;

  const totalViewsLast = Object.values(stats.views).reduce((s, arr) => s + arr[lastMonthIdx], 0);
  const totalViewsPrev = Object.values(stats.views).reduce((s, arr) => s + arr[prevMonthIdx], 0);
  const viewsChange = totalViewsPrev > 0 ? Math.round(((totalViewsLast - totalViewsPrev) / totalViewsPrev) * 100) : 0;

  const totalAppsLast = Object.values(stats.applicants).reduce((s, arr) => s + arr[lastMonthIdx], 0);
  const totalAppsPrev = Object.values(stats.applicants).reduce((s, arr) => s + arr[prevMonthIdx], 0);
  const appsChange = totalAppsPrev > 0 ? Math.round(((totalAppsLast - totalAppsPrev) / totalAppsPrev) * 100) : 0;

  const cpa = totalAppsLast > 0 ? Math.round((580000 + 450000) / totalAppsLast) : 0;

  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl('analytics-views',       totalViewsLast.toLocaleString());
  setEl('analytics-views-change', (viewsChange >= 0 ? '+' : '') + viewsChange + '%');
  setEl('analytics-apps',        totalAppsLast.toLocaleString());
  setEl('analytics-apps-change', (appsChange >= 0 ? '+' : '') + appsChange + '%');
  setEl('analytics-cpa',         cpa.toLocaleString() + '원');
  setEl('analytics-cvr',         totalViewsLast > 0 ? ((totalAppsLast / totalViewsLast) * 100).toFixed(2) + '%' : '0%');
}

/* ================================================
   노출 수 라인 차트
   ================================================ */
function renderViewsChart() {
  const canvas = document.getElementById('views-chart');
  if (!canvas || typeof Chart === 'undefined') return;

  const existing = Chart.getChart(canvas);
  if (existing) existing.destroy();

  const stats = AppState.monthlyStats;
  const makeGradient = (ctx, color) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, color + '40');
    gradient.addColorStop(1, color + '00');
    return gradient;
  };

  new Chart(canvas, {
    type: 'line',
    data: {
      labels: stats.labels,
      datasets: [
        {
          label: '잡코리아',
          data: stats.views.jobkorea,
          borderColor: '#e8421a',
          backgroundColor: ctx => makeGradient(ctx.chart.ctx, '#e8421a'),
          borderWidth: 2.5,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#e8421a',
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: '사람인',
          data: stats.views.saramin,
          borderColor: '#0066cc',
          backgroundColor: ctx => makeGradient(ctx.chart.ctx, '#0066cc'),
          borderWidth: 2.5,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#0066cc',
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: '워크넷',
          data: stats.views.worknet,
          borderColor: '#00833e',
          backgroundColor: ctx => makeGradient(ctx.chart.ctx, '#00833e'),
          borderWidth: 2.5,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#00833e',
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: {
          labels: { color: '#8b9ab8', font: { size: 12, family: 'Pretendard' }, boxWidth: 12, boxHeight: 12 },
        },
        tooltip: {
          backgroundColor: '#1a2234',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          titleColor: '#f0f4ff',
          bodyColor: '#8b9ab8',
          callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString()}회` },
        },
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8b9ab8', font: { size: 11 } } },
        y: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#8b9ab8', font: { size: 11 }, callback: val => val.toLocaleString() + '회' },
          beginAtZero: true,
        },
      },
    },
  });
}

/* ================================================
   플랫폼 비교 도넛 차트
   ================================================ */
function renderPlatformCompare() {
  const canvas = document.getElementById('platform-compare-chart');
  if (!canvas || typeof Chart === 'undefined') return;

  const existing = Chart.getChart(canvas);
  if (existing) existing.destroy();

  const stats = AppState.monthlyStats;
  const idx = stats.labels.length - 1;
  const jobkoreaTot = stats.applicants.jobkorea[idx];
  const saraminTot  = stats.applicants.saramin[idx];
  const worknetTot  = stats.applicants.worknet[idx];

  new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['잡코리아', '사람인', '워크넷'],
      datasets: [{
        data: [jobkoreaTot, saraminTot, worknetTot],
        backgroundColor: ['rgba(232,66,26,0.8)', 'rgba(0,102,204,0.8)', 'rgba(0,131,62,0.8)'],
        borderColor: ['#e8421a', '#0066cc', '#00833e'],
        borderWidth: 2,
        hoverOffset: 8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#8b9ab8', font: { size: 12 }, padding: 16, boxWidth: 12, boxHeight: 12 },
        },
        tooltip: {
          backgroundColor: '#1a2234',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          titleColor: '#f0f4ff',
          bodyColor: '#8b9ab8',
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.raw}명 (${Math.round(ctx.parsed / (jobkoreaTot + saraminTot + worknetTot) * 100)}%)`,
          },
        },
      },
    },
  });
}

/* ================================================
   공고별 성과 테이블
   ================================================ */
function renderTopJobsTable() {
  const container = document.getElementById('analytics-jobs-tbody');
  if (!container) return;

  const sorted = [...AppState.jobs]
    .filter(j => j.views > 0)
    .sort((a, b) => b.applicants - a.applicants);

  container.innerHTML = sorted.map((job, idx) => {
    const cvr = job.views > 0 ? ((job.applicants / job.views) * 100).toFixed(2) + '%' : '0%';
    const rankEmoji = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`;
    return `
      <tr>
        <td style="font-size: var(--text-base); text-align: center">${rankEmoji}</td>
        <td>
          <div style="font-weight: 600; color: var(--text-primary)">${job.title}</div>
          <div style="font-size: var(--text-xs); color: var(--text-muted)">${job.department}</div>
        </td>
        <td>
          <div class="platform-badges">
            ${job.platforms.map(p => `<span class="badge badge-${p}">${p === 'jobkorea' ? '잡코리아' : p === 'saramin' ? '사람인' : '워크넷'}</span>`).join('')}
          </div>
        </td>
        <td style="font-family: var(--font-latin); font-weight: 700; color: var(--text-primary)">${job.views.toLocaleString()}</td>
        <td style="font-family: var(--font-latin); font-weight: 700; color: var(--accent-secondary)">${job.applicants}</td>
        <td>
          <span style="font-family: var(--font-latin); font-weight: 600; color: ${parseFloat(cvr) > 2 ? 'var(--accent-success)' : 'var(--text-secondary)'}">${cvr}</span>
        </td>
        <td>
          <div class="progress-bar" style="width: 100px">
            <div class="progress-fill" style="width: ${Math.min(parseFloat(cvr) * 20, 100)}%"></div>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/* ================================================
   이벤트 바인딩
   ================================================ */
function bindAnalyticsEvents() {
  document.querySelectorAll('.date-chip[data-range]').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.date-chip[data-range]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      AppState.analyticsRange = chip.dataset.range;
      // 실제로는 범위에 따라 데이터 필터링
      showToast(`${chip.textContent} 기간으로 변경되었습니다.`, 'info');
    });
  });
}

// 전역 window 바인딩
window.initAnalytics = initAnalytics;
window.renderAnalyticsSummary = renderAnalyticsSummary;
window.renderViewsChart = renderViewsChart;
window.renderPlatformCompare = renderPlatformCompare;
window.renderTopJobsTable = renderTopJobsTable;
