import * as storage from '../services/storage.js';

export function initThemeSwitcher(onThemeChange) {
  _applyTheme('melodyflow');
  return { toggle: () => {} };
}

function _applyTheme(theme) {
  const html = document.documentElement;
  html.setAttribute('data-theme', 'melodyflow');
  document.title = 'PhantomBeats — Music Streaming';
  storage.setTheme('melodyflow');
}

export function getCurrentTheme() {
  return 'melodyflow';
}
