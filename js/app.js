/**
 * app.js — 앱 초기화, 라우팅, 전역 유틸
 */

/* ================================================
   앱 초기화
   ================================================ */
document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  initRouter();
  initToastSystem();
  navigateTo('dashboard');
  updateNotifBadge();
});

/* ================================================
   라우터 (탭 전환)
   ================================================ */
const PAGE_CONFIG = {
  dashboard: { label: '대시보드',        icon: '🏠', init: () => { if (typeof initDashboard === 'function') initDashboard(); } },
  jobs:      { label: '채용공고 관리',     icon: '📋', init: () => { if (typeof initJobs === 'function') initJobs(); } },
  adcenter:  { label: '광고/배포 센터',    icon: '📣', init: () => { if (typeof initAdCenter === 'function') initAdCenter(); } },
  deploy:    { label: '자동배포 설정',     icon: '🚀', init: () => { if (typeof initDeploy === 'function') initDeploy(); } },
  analytics: { label: '성과 분석',        icon: '📊', init: () => { if (typeof initAnalytics === 'function') initAnalytics(); } },
  settings:  { label: '플랫폼 설정',      icon: '⚙️',  init: () => { if (typeof initSettings === 'function') initSettings(); } },
};

function initRouter() {
  // 사이드바 네비 이벤트 바인딩
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(item.dataset.page);
    });
  });
}

function navigateTo(page) {
  if (!PAGE_CONFIG[page]) return;
  AppState.currentPage = page;

  // 페이지 뷰 전환
  document.querySelectorAll('.page-view').forEach(v => v.classList.remove('active'));
  const targetView = document.getElementById('page-' + page);
  if (targetView) targetView.classList.add('active');

  // 사이드바 활성 상태
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });

  // 헤더 타이틀 업데이트
  const cfg = PAGE_CONFIG[page];
  const titleEl = document.getElementById('header-page-title');
  if (titleEl) titleEl.textContent = cfg.label;

  // 페이지 초기화 함수 실행
  if (typeof cfg.init === 'function') {
    cfg.init();
  }
}

// 전역에서 어디서든 navigateTo 호출 가능하도록 등록
window.navigateTo = navigateTo;
window.closeModal = closeModal;


/* ================================================
   모달 유틸
   ================================================ */
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('hidden');
}

// 명시적인 [취소] 또는 [✕] 버튼을 눌렀을 때만 모달이 닫히도록 보장
// (사용자가 텍스트 입력, 드래그, 배경 클릭 등으로 인한 실수 닫힘 방지)


/* ================================================
   알림 배지 업데이트
   ================================================ */
function updateNotifBadge() {
  const badge = document.getElementById('notif-count-badge');
  const count = AppState.unreadNotifCount;
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? '' : 'none';
  }
}

/* ================================================
   토스트 알림 시스템
   ================================================ */
function initToastSystem() {
  if (!document.getElementById('toast-container')) {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    `;
    document.body.appendChild(container);
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const colors = {
    success: { bg: 'rgba(34,211,160,0.12)', border: 'rgba(34,211,160,0.3)', text: '#22d3a0', icon: '✅' },
    warning: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', text: '#f59e0b', icon: '⚠️' },
    danger:  { bg: 'rgba(244,63,94,0.12)',  border: 'rgba(244,63,94,0.3)',  text: '#f43f5e', icon: '❌' },
    info:    { bg: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.3)', text: '#38bdf8', icon: 'ℹ️' },
  };
  const c = colors[type] || colors.info;

  const toast = document.createElement('div');
  toast.style.cssText = `
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 18px;
    background: #1a2234;
    border: 1px solid ${c.border};
    border-left: 3px solid ${c.text};
    border-radius: 10px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    font-family: 'Pretendard', sans-serif;
    font-size: 14px;
    color: #f0f4ff;
    pointer-events: all;
    cursor: pointer;
    animation: toastIn 0.3s cubic-bezier(0.34,1.56,0.64,1);
    max-width: 380px;
    backdrop-filter: blur(12px);
  `;

  toast.innerHTML = `
    <span style="font-size: 16px; flex-shrink: 0">${c.icon}</span>
    <span style="flex: 1">${message}</span>
    <span style="color: #4a5568; font-size: 18px; line-height: 1; flex-shrink: 0">×</span>
  `;

  // 스타일 추가 (한번만)
  if (!document.getElementById('toast-style')) {
    const style = document.createElement('style');
    style.id = 'toast-style';
    style.textContent = `
      @keyframes toastIn {
        from { opacity: 0; transform: translateX(100%) scale(0.9); }
        to   { opacity: 1; transform: translateX(0) scale(1); }
      }
      @keyframes toastOut {
        from { opacity: 1; transform: translateX(0) scale(1); max-height: 80px; margin-bottom: 0; }
        to   { opacity: 0; transform: translateX(100%) scale(0.9); max-height: 0; margin-bottom: -10px; }
      }
    `;
    document.head.appendChild(style);
  }

  container.appendChild(toast);

  const dismiss = () => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  };

  toast.addEventListener('click', dismiss);
  setTimeout(dismiss, 4000);
}

/* ================================================
   날짜 유틸
   ================================================ */
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/* ================================================
   숫자 포맷 유틸
   ================================================ */
function formatNumber(num) {
  if (num >= 10000) return (num / 10000).toFixed(1) + '만';
  return num.toLocaleString();
}
