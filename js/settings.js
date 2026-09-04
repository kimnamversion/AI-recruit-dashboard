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
      <div class="flex-between" style="margin-bottom: var(--space-5)">
        <div style="display: flex; align-items: center; gap: var(--space-3)">
          <div class="platform-logo-icon" style="background: ${p.color}; width: 40px; height: 40px; font-size: 16px; font-weight: 800; color: white; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center">
            ${p.icon}
          </div>
          <div>
            <div style="font-size: var(--text-lg); font-weight: 700; color: var(--text-primary)">${p.name}</div>
            <a href="https://${p.url}" target="_blank" style="font-size: var(--text-xs); color: var(--accent-secondary); text-decoration: none">${p.url} ↗</a>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: var(--space-3)">
          ${p.apiStatus === 'connected'
            ? '<span class="badge badge-active"><span class="badge-dot"></span>연결됨</span>'
            : '<span class="badge badge-warning"><span class="badge-dot"></span>재연결 필요</span>'
          }
          <label class="toggle">
            <input type="checkbox" ${p.connected ? 'checked' : ''} onchange="togglePlatformConnection('${p.id}', this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <!-- API 키 입력 -->
      <div style="display: flex; flex-direction: column; gap: var(--space-4)">
        <div class="form-group">
          <label class="form-label">API Key <span class="required">*</span></label>
          <div class="api-key-input-group">
            <input type="password"
              id="api-key-${p.id}"
              class="form-input"
              value="${p.connected ? '••••••••••••••••••••••••••••••••' : ''}"
              placeholder="API 키를 입력하세요"
            >
            <span class="api-key-toggle-btn" onclick="toggleApiKeyVisibility('api-key-${p.id}', this)">보기</span>
          </div>
        </div>

        ${p.id !== 'worknet' ? `
        <div class="form-group">
          <label class="form-label">Secret Key</label>
          <div class="api-key-input-group">
            <input type="password"
              id="secret-key-${p.id}"
              class="form-input"
              value="${p.connected ? '••••••••••••••••••••••' : ''}"
              placeholder="Secret 키를 입력하세요"
            >
            <span class="api-key-toggle-btn" onclick="toggleApiKeyVisibility('secret-key-${p.id}', this)">보기</span>
          </div>
        </div>
        ` : `
        <div class="form-group">
          <label class="form-label">사업자 번호</label>
          <input type="text" class="form-input" placeholder="000-00-00000" value="${p.connected ? '123-45-67890' : ''}">
        </div>
        `}

        <div class="form-group">
          <label class="form-label">콜백 URL (선택)</label>
          <input type="text" class="form-input" value="https://mydomain.com/webhook/${p.id}" placeholder="배포 결과를 받을 웹훅 URL">
        </div>
      </div>

      <!-- 버튼 -->
      <div style="display: flex; justify-content: flex-end; gap: var(--space-3); margin-top: var(--space-5); padding-top: var(--space-4); border-top: 1px solid var(--border-subtle)">
        <button class="btn btn-secondary" onclick="testConnection('${p.id}')">
          🔍 연결 테스트
        </button>
        <button class="btn btn-primary" onclick="saveApiSettings('${p.id}')">
          💾 저장
        </button>
      </div>

      <!-- 연결 결과 영역 -->
      <div id="test-result-${p.id}"></div>
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

function toggleApiKeyVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '숨기기';
  } else {
    input.type = 'password';
    btn.textContent = '보기';
  }
}

function togglePlatformConnection(platformId, connected) {
  AppState.platforms[platformId].connected = connected;
  AppState.platforms[platformId].apiStatus = connected ? 'connected' : 'disconnected';
  saveToStorage();
  showToast(`${AppState.platforms[platformId].name} 연동이 ${connected ? '활성화' : '비활성화'}되었습니다.`, connected ? 'success' : 'info');
}

function testConnection(platformId) {
  const p = AppState.platforms[platformId];
  const resultEl = document.getElementById(`test-result-${platformId}`);

  showToast(`${p.name} 연결 테스트 중...`, 'info');

  setTimeout(() => {
    const isOk = p.apiStatus === 'connected';
    if (resultEl) {
      resultEl.innerHTML = `
        <div class="connection-test-result ${isOk ? 'success' : 'error'}">
          ${isOk ? '✅' : '❌'} ${isOk
            ? `${p.name} API 연결이 정상입니다. 응답 시간: ${Math.floor(Math.random() * 100) + 50}ms`
            : `${p.name} API 연결에 실패했습니다. API 키를 확인하세요.`
          }
        </div>
      `;
    }
    showToast(isOk ? `✅ ${p.name} 연결 성공!` : `❌ ${p.name} 연결 실패`, isOk ? 'success' : 'danger');
  }, 1500);
}

function saveApiSettings(platformId) {
  const p = AppState.platforms[platformId];
  saveToStorage();
  showToast(`${p.name} 설정이 저장되었습니다.`, 'success');
}

// 전역 window 바인딩
window.initSettings = initSettings;
window.toggleApiKeyVisibility = toggleApiKeyVisibility;
window.togglePlatformConnection = togglePlatformConnection;
window.testConnection = testConnection;
window.saveApiSettings = saveApiSettings;
