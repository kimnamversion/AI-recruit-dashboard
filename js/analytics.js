/**
 * analytics.js — 성과 분석 페이지 로직
 */

function initAnalytics() {
  renderTopJobsTable();
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

// 전역 window 바인딩
window.initAnalytics = initAnalytics;
window.renderTopJobsTable = renderTopJobsTable;
