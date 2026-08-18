/* PhantomBeats — mobile drawer interaction polish v2 */
(() => {
  const QUERY = '(max-width: 768px)';

  const mobile = () => window.matchMedia(QUERY).matches;

  function setDrawer(open) {
    if (!mobile()) open = false;

    const app = document.getElementById('app');
    const backdrop = document.getElementById('mobile-sidebar-backdrop');
    const sidebar = document.getElementById('sidebar');

    app?.classList.toggle('mobile-sidebar-open', open);
    document.body.classList.toggle('mobile-drawer-open', open);

    if (backdrop) {
      backdrop.setAttribute('aria-hidden', String(!open));
    }

    if (sidebar) {
      sidebar.setAttribute('aria-hidden', String(!open));
    }
  }

  function toggleDrawer() {
    const app = document.getElementById('app');
    setDrawer(!app?.classList.contains('mobile-sidebar-open'));
  }

  function closeDrawer() {
    setDrawer(false);
  }

  function bind() {
    const menu = document.getElementById('mobile-menu-toggle');
    const sidebarToggle = document.getElementById('sidebar-toggle-btn');
    const backdrop = document.getElementById('mobile-sidebar-backdrop');

    menu?.addEventListener('click', (event) => {
      if (!mobile()) return;
      event.preventDefault();
      event.stopPropagation();
      toggleDrawer();
    });

    sidebarToggle?.addEventListener('click', (event) => {
      if (!mobile()) return;
      event.preventDefault();
      event.stopPropagation();
      closeDrawer();
    });

    backdrop?.addEventListener('click', closeDrawer);

    document.getElementById('sidebar')?.addEventListener('click', (event) => {
      if (event.target.closest('.nav-item, .playlist-item, #create-playlist-btn')) {
        window.setTimeout(closeDrawer, 40);
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeDrawer();
    });

    let startX = 0;
    let startY = 0;

    document.addEventListener('touchstart', (event) => {
      if (!mobile()) return;
      const touch = event.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
    }, { passive: true });

    document.addEventListener('touchend', (event) => {
      if (!mobile()) return;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - startX;
      const dy = Math.abs(touch.clientY - startY);
      const open = document.getElementById('app')?.classList.contains('mobile-sidebar-open');

      if (open && dx < -70 && dy < 80) {
        closeDrawer();
      }
    }, { passive: true });

    const media = window.matchMedia(QUERY);
    media.addEventListener?.('change', () => setDrawer(false));
  }

  function init() {
    bind();
    if (!mobile()) setDrawer(false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
