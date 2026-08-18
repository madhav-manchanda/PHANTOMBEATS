import { icons } from '../utils/helpers.js';
import * as storage from '../services/storage.js';

export function renderSidebar(container, { onNavigate, onPlaylistSelect, onCreatePlaylist, activeView, theme, isGuest }) {
  // We use Sidebar.js as the IconRail for desktop navigation
  const logoContent = icons.waveform;
  const avatarPlaceholder = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;

  container.innerHTML = `
    <div class="icon-rail">
      <div class="rail-logo">
        ${logoContent}
      </div>

      <nav class="rail-nav">
        <div class="rail-item ${activeView === 'home' ? 'active' : ''}" data-view="home" title="Home">
          ${icons.home}
        </div>
        <div class="rail-item ${activeView === 'search' ? 'active' : ''}" data-view="search" title="Search">
          ${icons.search}
        </div>
        <div class="rail-item ${activeView === 'library' ? 'active' : ''}" data-view="library" title="Library">
          ${icons.library}
        </div>
        <div class="rail-item ${activeView === 'rooms' ? 'active' : ''}" data-view="rooms" title="Rooms">
          ${icons.headphones}
        </div>
      </nav>

      <div class="rail-spacer"></div>

      <div class="rail-bottom">
        <div class="rail-item ${activeView === 'settings' ? 'active' : ''}" data-view="settings" title="Settings">
          ${icons.settings}
        </div>
        <div class="rail-avatar" title="Account">
          ${avatarPlaceholder}
        </div>
      </div>
    </div>
  `;

  container.querySelectorAll('.rail-item').forEach((item) => {
    item.addEventListener('click', () => {
      const view = item.dataset.view;
      if (view) onNavigate(view);
    });
  });

  const avatar = container.querySelector('.rail-avatar');
  if (avatar) {
    avatar.addEventListener('click', () => {
      // Assuming AccountDropdown or similar logic can be attached here, or just navigate to settings/profile
      onNavigate('settings');
    });
  }
}
