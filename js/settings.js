/**
 * settings.js — 플랫폼 연동 설정 페이지 로직
 */

function initSettings() {
  renderSettingsPlatforms();
  bindSettingsEvents();
}

/* ================================================
   플랫폼 연동 설정 렌더링
   ================================================ */
function renderSettingsPlatforms() {
  const container = document.getElementById('settings-platform-content');
  if (!container) return;

  const platforms = Object.values(AppState.platforms);

  container.innerHTML = platforms.map(p => `
    <div class="card" style="margin-bottom: var(--space-5)">
      <!-- 플랫폼 헤더 -->
      <div class="flex-between" style="margin-bottom: var(--space-4)">
        <div style="display: flex; align-items: center; gap: var(--space-3)">
          <div class="platform-logo-icon" style="background: ${p.color}; width: 40px; height: 40px; font-size: 16px; font-weight: 800; color: white; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center">
            ${p.icon}
          </div>
          <div>
            <div style="font-size: var(--text-lg); font-weight: 700; color: var(--text-primary)">${p.name}</div>
            <a href="https://${p.url}" target="_blank" style="font-size: var(--text-xs); color: var(--accent-secondary); text-decoration: none">${p.url} ↗</a>
          </div>
        </div>
        <span class="badge badge-inactive"><span class="badge-dot"></span>미연동</span>
      </div>

      <div class="channel-plan-box">
        ${escapeHtml(p.planNote)}
      </div>
    </div>
  `).join('');
}

/* ================================================
   이벤트 및 액션
   ================================================ */
function bindSettingsEvents() {
  document.querySelectorAll('.settings-menu-item[data-tab]').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.settings-menu-item[data-tab]').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      AppState.settingsTab = item.dataset.tab;

      document.querySelectorAll('.settings-tab-content').forEach(c => c.classList.add('hidden'));
      const target = document.getElementById('settings-tab-' + item.dataset.tab);
      if (target) target.classList.remove('hidden');
    });
  });
}

// 전역 window 바인딩
window.initSettings = initSettings;
