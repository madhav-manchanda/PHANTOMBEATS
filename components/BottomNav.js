import { icons } from '../utils/helpers.js';

export function renderBottomNav(container, { activeView, onNavigate }) {
  const isLibraryActive = activeView === 'library' || activeView === 'playlist';
  
  container.innerHTML = `
    <button class="mobile-tab ${activeView === 'home' ? 'active' : ''}" data-view="home">
      ${icons.home}
      <span>Home</span>
    </button>
    <button class="mobile-tab ${activeView === 'search' ? 'active' : ''}" data-view="search">
      ${icons.search}
      <span>Search</span>
    </button>
    <button class="mobile-tab ${isLibraryActive ? 'active' : ''}" data-view="library">
      ${icons.library}
      <span>Library</span>
    </button>
    <button class="mobile-tab ${activeView === 'rooms' ? 'active' : ''}" data-view="rooms">
      ${icons.headphones}
      <span>Rooms</span>
    </button>
    <button class="mobile-tab ${activeView === 'settings' ? 'active' : ''}" data-view="settings">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-more-horizontal"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
      <span>More</span>
    </button>
  `;

  container.querySelectorAll('.mobile-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      onNavigate(tab.dataset.view);
    });
  });
}
