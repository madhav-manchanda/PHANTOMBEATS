import { renderSidebar } from './components/Sidebar.js';
import { renderMiniPlayer } from './components/MiniPlayer.js';
import { renderBottomNav } from './components/BottomNav.js';
import { renderImmersivePlayerSheet } from './components/ImmersivePlayerSheet.js';
import { renderQueue } from './components/Queue.js';
import { renderNowPlayingDetail } from './components/NowPlayingDetail.js';
import { renderSearch, handleSearch } from './components/Search.js';
import { renderHome } from './components/NowPlaying.js';
import { renderLibrary } from './components/Library.js';
import { renderPlaylistView } from './components/PlaylistView.js';
import { renderAuthModal, hideAuthModal } from './components/AuthModal.js';
import { renderAccountDropdown } from './components/AccountDropdown.js';
import { renderImportModal } from './components/ImportModal.js';
import { initLyrics, toggleLyrics } from './components/Lyrics.js';
import { initThemeSwitcher, getCurrentTheme } from './components/ThemeSwitcher.js';
import { renderStats } from './components/Stats.js';
import { renderRoomsPage, initRoomPanel } from './components/Rooms.js';
import { renderSettings } from './components/Settings.js';
import { viewTransition, showToast } from './utils/animations.js';
import { icons, debounce, formatDuration, getPlaceholderImage } from './utils/helpers.js';
import * as storage from './services/storage.js';
import {
  getSession, getUser, getUserProfile, onAuthChange,
  isSupabaseConfigured
} from './services/supabaseClient.js';
import player from './services/playerEngine.js';
import { roomService } from './services/roomService.js';
import { registerSW } from 'virtual:pwa-register';
import gsap from 'gsap';
const state = {
  currentView: 'home',
  currentPlaylistId: null,
  rightPanelOpen: false,
  searchQuery: '',
  authState: {
    user: null,
    profile: null,
    isGuest: true,
  },
};
const sidebar = document.getElementById('sidebar');
const topBar = document.getElementById('top-bar');
const viewContainer = document.getElementById('view-container');
const rightPanel = document.getElementById('right-panel');
const nowPlayingDetail = document.getElementById('now-playing-detail');
const queuePanel = document.getElementById('queue-panel');
const playerBar = document.getElementById('player-bar');
const modalOverlay = document.getElementById('modal-overlay');
const contextMenu = document.getElementById('context-menu');
const toastContainer = document.getElementById('toast-container');
const authModal = document.getElementById('auth-modal');
const importModal = document.getElementById('import-modal');
const mobileTabBar = document.getElementById('mobile-tab-bar');
const mobilePlayerOverlay = document.getElementById('mobile-player-overlay');
const lyricsPanelContainer = document.getElementById('lyrics-panel-container');
const themeSwitcher = initThemeSwitcher((newTheme) => {
  _renderSidebar();
  _renderTopBar();
  _renderView();
  if (state.rightPanelOpen) _renderRightPanel();
});
async function _initAuth() {
  const guestPref = storage.getGuestModePreference();

  if (isSupabaseConfigured()) {
    const session = await getSession();
    if (session?.user) {
      await _handleLoginSuccess(session);
      return;
    }
  }
  if (guestPref === true) {
    _enterGuestMode();
    return;
  }
  _showAuthModal();
}

function _showAuthModal() {
  renderAuthModal(authModal, {
    onAuthSuccess: async (result) => {
      await _handleLoginSuccess(result.session || result);
    },
    onGuestMode: () => {
      _enterGuestMode();
    },
    mode: 'default'
  });
}

function _showUpdatePasswordModal() {
  renderAuthModal(authModal, {
    onAuthSuccess: async (result) => {
      await _handleLoginSuccess(result.session || result);
      showToast(toastContainer, 'Password updated successfully!');
    },
    onGuestMode: () => {
      _enterGuestMode();
    },
    mode: 'recovery'
  });
}

async function _handleLoginSuccess(session) {
  const user = session?.user || await getUser();
  if (!user) {
    _enterGuestMode();
    return;
  }
  if (state.authState?.user?.id === user.id && !state.authState?.isGuest) {
    return;
  }

  let profile = null;
  try {
    profile = await getUserProfile(user.id);
  } catch (e) {  }

  state.authState = {
    user,
    profile,
    isGuest: false,
  };

  storage.initStorage(user);
  storage.setGuestMode(false);
  try {
    await storage.loadFromCloud();
  } catch (e) {
    console.warn('[Auth] Cloud sync failed:', e.message);
  }
  _renderTopBar();
  _renderSidebar();
  _renderView();

  showToast(toastContainer, `Welcome back, ${profile?.display_name || user.email?.split('@')[0] || 'User'}!`);
}

function _enterGuestMode() {
  state.authState = {
    user: null,
    profile: null,
    isGuest: true,
  };
  storage.initStorage(null);
  storage.setGuestMode(true);
  roomService.leave();
  hideAuthModal(authModal);
  _renderTopBar();
  _renderSidebar();
  _renderView();
}

function _handleSignOut() {
  state.authState = {
    user: null,
    profile: null,
    isGuest: true,
  };
  storage.clearUserData();
  storage.initStorage(null);
  storage.setGuestMode(false); 
  roomService.leave();
  _renderTopBar();
  _renderSidebar();
  _renderView();
  showToast(toastContainer, 'Signed out successfully');
  setTimeout(() => _showAuthModal(), 500);
}
if (isSupabaseConfigured()) {
  onAuthChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      await _handleLoginSuccess(session);
    } else if (event === 'SIGNED_OUT') {
      _handleSignOut();
    } else if (event === 'PASSWORD_RECOVERY') {
      _showUpdatePasswordModal();
    }
  });
}
function _renderTopBar() {
  const theme = getCurrentTheme();


  topBar.innerHTML = `
    <div class="top-bar-nav">
      <button class="nav-btn" id="mobile-menu-toggle" title="Menu" style="display:none;"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg></button>
      <button class="nav-btn" id="nav-back" title="Back">${icons.chevronLeft}</button>
      <button class="nav-btn" id="nav-forward" title="Forward">${icons.chevronRight}</button>
    </div>
    <div class="search-bar" id="top-search-bar">
      <span class="search-bar-icon">${icons.search}</span>
      <input type="text" id="search-input" placeholder="What do you want to play?" value="${state.searchQuery}" />
    </div>
    <div class="top-bar-right">
      <div id="live-clock" title="Current Time" style="font-size: 13px; font-weight: 500; color: var(--text-secondary); margin-right: 8px; display: flex; align-items: center; gap: 6px;"></div>
      <div id="account-dropdown-container" class="account-dropdown-root"></div>
    </div>
  `;
  const clockEl = topBar.querySelector('#live-clock');
  if (clockEl) {
    const updateTime = () => {
      clockEl.innerHTML = `${icons.clock} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    };
    updateTime();
    setInterval(updateTime, 60000); // update every minute
  }
  const searchInput = topBar.querySelector('#search-input');
  const debouncedSearch = debounce((query) => {
    state.searchQuery = query;
    if (query.trim().length >= 2) {
      if (state.currentView !== 'search') {
        state.currentView = 'search';
        _renderView();
      } else {
        handleSearch(query, viewContainer, _showContextMenu);
      }
    } else if (state.currentView === 'search') {
      handleSearch('', viewContainer, _showContextMenu);
    }
  }, 400);

  searchInput.addEventListener('input', (e) => {
    debouncedSearch(e.target.value);
  });

  searchInput.addEventListener('focus', () => {
    if (state.currentView !== 'search') {
      _navigate('search');
    }
  });

  topBar.querySelector('#nav-back')?.addEventListener('click', () => {
    if (state.currentView === 'playlist') {
      _navigate('library');
    } else {
      _navigate('home');
    }
  });
  topBar.querySelector('#mobile-menu-toggle')?.addEventListener('click', () => {
    document.getElementById('app').classList.toggle('mobile-sidebar-open');
  });
  document.getElementById('mobile-sidebar-backdrop')?.addEventListener('click', () => {
    document.getElementById('app').classList.remove('mobile-sidebar-open');
  });
  const accountContainer = topBar.querySelector('#account-dropdown-container');
  renderAccountDropdown(accountContainer, {
    authState: state.authState,
    onSignIn: () => _showAuthModal(),
    onSignOut: () => _handleSignOut(),
  });

}
function _renderSidebar() {
  renderSidebar(sidebar, {
    onNavigate: _navigate,
    onPlaylistSelect: _openPlaylist,
    onCreatePlaylist: _showCreatePlaylistModal,
    activeView: state.currentView,
    theme: getCurrentTheme(),
    isGuest: state.authState.isGuest,
  });
}
function _navigate(view) {
  state.currentView = view;
  state.currentPlaylistId = null;
  const appEl = document.getElementById('app');
  if (appEl) {
    appEl.classList.remove('mobile-sidebar-open');
    appEl.setAttribute('data-view', view);
  }
  _renderSidebar();
  _renderView();
  _renderMobileTabBar();
}

function _renderView() {
  viewTransition(viewContainer, () => {
    switch (state.currentView) {
      case 'home':
        renderHome(viewContainer, {
          onContextMenu: _showContextMenu,
          theme: getCurrentTheme(),
          profile: state.authState.profile,
        });
        break;
      case 'search':
        renderSearch(viewContainer, {
          onContextMenu: _showContextMenu,
          searchQuery: state.searchQuery,
        });
        break;
      case 'library':
        renderLibrary(viewContainer, {
          onPlaylistSelect: _openPlaylist,
          onContextMenu: _showContextMenu,
          onImportPlaylist: _showImportModal,
          onCreatePlaylist: _showCreatePlaylistModal,
        });
        break;
      case 'playlist':
        renderPlaylistView(viewContainer, {
          playlistId: state.currentPlaylistId,
          onContextMenu: _showContextMenu,
          onBack: () => _navigate('library'),
        });
        break;
      case 'stats':
        renderStats(viewContainer);
        break;
      case 'rooms':
        renderRoomsPage(viewContainer, {
          isGuest: state.authState.isGuest,
          onShowAuth: () => _showAuthModal(),
        });
        break;
      case 'settings':
        renderSettings(viewContainer, {
          authState: state.authState,
          onSignIn: () => _showAuthModal(),
          onSignOut: () => _handleSignOut(),
        });
        break;
      default:
        renderHome(viewContainer, {
          onContextMenu: _showContextMenu,
          theme: getCurrentTheme(),
          profile: state.authState.profile,
        });
    }
  });
}

function _openPlaylist(playlistId) {
  state.currentView = 'playlist';
  state.currentPlaylistId = playlistId;
  _renderSidebar();
  _renderView();
  _renderMobileTabBar();
}
function _showImportModal() {
  renderImportModal(importModal, {
    onComplete: () => {
      _renderSidebar();
      if (state.currentView === 'library') _renderView();
    },
    onClose: () => {
      importModal.innerHTML = '';
    },
  });
}
function _toggleRightPanel() {
  state.rightPanelOpen = !state.rightPanelOpen;
  if (state.rightPanelOpen) {
    rightPanel.classList.remove('hidden');
    _renderRightPanel();
    gsap.from(rightPanel, {
      x: 360,
      opacity: 0,
      duration: 0.35,
      ease: 'power3.out',
    });
  } else {
    gsap.to(rightPanel, {
      x: 360,
      opacity: 0,
      duration: 0.25,
      ease: 'power2.in',
      onComplete: () => {
        rightPanel.classList.add('hidden');
        gsap.set(rightPanel, { x: 0, opacity: 1 });
      },
    });
  }
}

function _closeRightPanel() {
  if (!state.rightPanelOpen) return;
  state.rightPanelOpen = false;
  gsap.to(rightPanel, {
    x: 360,
    opacity: 0,
    duration: 0.25,
    ease: 'power2.in',
    onComplete: () => {
      rightPanel.classList.add('hidden');
      gsap.set(rightPanel, { x: 0, opacity: 1 });
      const queueToggle = playerBar.querySelector('#queue-toggle-btn');
      if (queueToggle) queueToggle.classList.remove('active');
    },
  });
}

function _renderRightPanel() {
  renderNowPlayingDetail(nowPlayingDetail, {
    onClose: _closeRightPanel,
  });
  renderQueue(queuePanel);
}
player.on('songchange', () => {
  if (!state.rightPanelOpen) {
    state.rightPanelOpen = true;
    rightPanel.classList.remove('hidden');
    _renderRightPanel();
    gsap.from(rightPanel, {
      x: 360,
      opacity: 0,
      duration: 0.35,
      ease: 'power3.out',
    });
    const queueToggle = playerBar.querySelector('#queue-toggle-btn');
    if (queueToggle) queueToggle.classList.add('active');
  }
});
player.on('error', (data) => {
  showToast(data?.error || 'Playback failed', 'error');
});
function _renderPlayerBar() {
  renderMiniPlayer(playerBar, {
    onQueueToggle: _toggleRightPanel,
    onSongClick: (song) => {
      if (!state.rightPanelOpen) _toggleRightPanel();
    },
    onAddClick: (e, song) => {
      _showContextMenu(e, song);
    },
    onLyricsToggle: () => {
      toggleLyrics();
    },
    onOpenImmersive: _openMobilePlayer
  });
}
function _initLyrics() {
  initLyrics(lyricsPanelContainer, {
    onVisibilityChange: (visible) => {
      const btn = playerBar.querySelector('#lyrics-toggle-btn');
      if (btn) btn.classList.toggle('active', visible);
    },
  });
}
function _showContextMenu(event, song) {
  const playlists = storage.getPlaylists();

  const x = Math.min(event.clientX, window.innerWidth - 220);
  const y = Math.min(event.clientY, window.innerHeight - 300);
  const openSubmenuLeft = x > window.innerWidth - 420;

  let playlistSubmenu = '';
  if (playlists.length > 0) {
    playlistSubmenu = `
      <div class="context-submenu ${openSubmenuLeft ? 'open-left' : ''}">
        <div class="context-menu-item">
          ${icons.plus} Add to Playlist ${icons.chevronRight}
        </div>
        <div class="context-submenu-list">
          ${playlists
            .map(
              (pl) =>
                `<div class="context-menu-item" data-action="add-to-playlist" data-playlist-id="${pl.id}">${pl.name}</div>`
            )
            .join('')}
        </div>
      </div>
    `;
  }

  const isLiked = storage.isLiked(song.id);

  contextMenu.innerHTML = `
    <div class="context-menu-item" data-action="play">${icons.play} Play</div>
    <div class="context-menu-item" data-action="queue">${icons.plus} Add to Queue</div>
    <div class="context-menu-divider"></div>
    <div class="context-menu-item" data-action="like">${isLiked ? icons.heartFilled : icons.heart} ${isLiked ? 'Remove from Liked' : 'Like'}</div>
    ${playlistSubmenu}
    <div class="context-menu-divider"></div>
    <div class="context-menu-item" data-action="create-playlist-add">${icons.plus} New Playlist with Song</div>
  `;
  contextMenu.style.left = `${x}px`;
  contextMenu.style.top = `${y}px`;
  contextMenu.classList.remove('hidden');
  contextMenu.querySelectorAll('[data-action]').forEach((item) => {
    item.addEventListener('click', () => {
      const action = item.dataset.action;
      switch (action) {
        case 'play':
          player.playSong(song);
          break;
        case 'queue':
          player.addToQueue(song);
          showToast(toastContainer, `Added "${song.title}" to queue`);
          break;
        case 'like':
          const liked = storage.toggleLike(song);
          showToast(toastContainer, liked ? `Liked "${song.title}"` : `Removed from Liked`);
          break;
        case 'add-to-playlist': {
          const plId = item.dataset.playlistId;
          const added = storage.addSongToPlaylist(plId, song);
          const pl = storage.getPlaylistById(plId);
          showToast(
            toastContainer,
            added ? `Added to "${pl?.name}"` : `Already in "${pl?.name}"`
          );
          _renderSidebar();
          break;
        }
        case 'create-playlist-add':
          const newPl = storage.createPlaylist(`My Playlist`);
          storage.addSongToPlaylist(newPl.id, song);
          showToast(toastContainer, `Created playlist with "${song.title}"`);
          _renderSidebar();
          break;
      }
      contextMenu.classList.add('hidden');
    });
  });
}
document.addEventListener('click', (e) => {
  if (!contextMenu.contains(e.target)) {
    contextMenu.classList.add('hidden');
  }
});
function _showCreatePlaylistModal() {
  modalOverlay.classList.remove('hidden');
  const input = document.getElementById('playlist-name-input');
  input.value = '';
  setTimeout(() => input.focus(), 100);
}

document.getElementById('modal-cancel')?.addEventListener('click', () => {
  modalOverlay.classList.add('hidden');
});

document.getElementById('modal-create')?.addEventListener('click', () => {
  const input = document.getElementById('playlist-name-input');
  const name = input.value.trim();
  if (name) {
    storage.createPlaylist(name);
    modalOverlay.classList.add('hidden');
    _renderSidebar();
    showToast(toastContainer, `Created "${name}"`);
  }
});

document.getElementById('playlist-name-input')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('modal-create')?.click();
  }
  if (e.key === 'Escape') {
    modalOverlay.classList.add('hidden');
  }
});
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  switch (e.code) {
    case 'Space':
      e.preventDefault();
      player.togglePlay();
      break;
    case 'ArrowRight':
      if (e.ctrlKey) player.next();
      break;
    case 'ArrowLeft':
      if (e.ctrlKey) player.prev();
      break;
  }
});
document.addEventListener('mousemove', (e) => {
  document.documentElement.style.setProperty('--cursor-x', `${e.clientX}px`);
  document.documentElement.style.setProperty('--cursor-y', `${e.clientY}px`);
  const isInteractive = e.composedPath().some(el => {
    if (el.tagName === 'A' || el.tagName === 'BUTTON' || el.tagName === 'INPUT' || el.getAttribute?.('role') === 'button') {
      return true;
    }
    if (el.classList && (el.classList.contains('track-row') || el.classList.contains('playlist-item') || el.classList.contains('song-card') || el.classList.contains('playlist-card'))) {
      return true;
    }
    return false;
  });
  
  if (isInteractive) {
    document.documentElement.setAttribute('data-cursor-hover', 'true');
  } else {
    document.documentElement.removeAttribute('data-cursor-hover');
  }
});
function _renderMobileTabBar() {
  if (!mobileTabBar) return;
  renderBottomNav(mobileTabBar, {
    activeView: state.currentView,
    onNavigate: _navigate
  });
}
let _mobilePlayerOpen = false;

function _isMobile() {
  return window.matchMedia('(max-width: 768px)').matches;
}

function _openMobilePlayer() {
  if (!mobilePlayerOverlay || !_isMobile()) return;
  const song = player.getCurrentSong();
  _mobilePlayerOpen = true;
  mobilePlayerOverlay.classList.remove('hidden');
  import('./components/ImmersivePlayerSheet.js').then(({ renderImmersivePlayerSheet }) => {
    renderImmersivePlayerSheet(mobilePlayerOverlay, {
      onClose: _closeMobilePlayer
    });
  });
}

function _closeMobilePlayer() {
  _mobilePlayerOpen = false;
  mobilePlayerOverlay.classList.add('hidden');
  mobilePlayerOverlay.innerHTML = '';
}


function _initMobilePlayer() {
  if (!playerBar) return;
  playerBar.addEventListener('click', (e) => {
    if (!_isMobile()) return;
    if (e.target.closest('button') || e.target.closest('.player-btn') || e.target.closest('.play-btn')) return;
    _openMobilePlayer();
  });
}
async function init() {
  const savedThemeMode = localStorage.getItem('phantom_theme_mode');
  if (savedThemeMode) {
    document.documentElement.setAttribute('data-theme', savedThemeMode);
  }
  const appEl = document.getElementById('app');
  if (appEl) {
    appEl.setAttribute('data-view', state.currentView);
  }
  _renderPlayerBar();
  _initLyrics();
  await _initAuth();
  initRoomPanel();
  _renderMobileTabBar();
  _initMobilePlayer();

  console.log(
    `%c👻 PhantomBeats initialized`,
    'color: #00f0ff; font-size: 14px; font-weight: bold;'
  );

  _initPWA();
}

function _initPWA() {
  const updateSW = registerSW({
    onNeedRefresh() {
      const toastContainer = document.getElementById('toast-container');
      if (toastContainer) {
        showToast(toastContainer, 'New update available. Click to refresh.');
        toastContainer.lastChild.addEventListener('click', () => {
          updateSW(true);
        });
      }
    },
    onOfflineReady() {
      console.log('App ready to work offline');
    },
  });

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.deferredPWAInstallPrompt = e;
    const settingsGroup = document.querySelector('#pwa-install-group');
    if (settingsGroup) settingsGroup.style.display = 'block';
  });

  window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    window.deferredPWAInstallPrompt = null;
    const settingsGroup = document.querySelector('#pwa-install-group');
    if (settingsGroup) settingsGroup.style.display = 'none';
  });

  window.addEventListener('online', () => {
    const toastContainer = document.getElementById('toast-container');
    if (toastContainer) showToast(toastContainer, 'Back online.');
  });
  window.addEventListener('offline', () => {
    const toastContainer = document.getElementById('toast-container');
    if (toastContainer) showToast(toastContainer, 'You are offline.');
  });
}

init();
