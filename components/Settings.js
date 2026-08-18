import { showToast } from '../utils/animations.js';
import { icons } from '../utils/helpers.js';

export function renderSettings(container, { authState, onSignIn, onSignOut } = {}) {
  const crossfadeDuration = localStorage.getItem('crossfadeDuration') || '0';
  const isLoggedIn = authState?.user;
  const displayName = authState?.profile?.display_name || authState?.user?.email?.split('@')[0] || '';
  const email = authState?.user?.email || '';
  const initial = displayName ? displayName.charAt(0).toUpperCase() : '?';
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'melodyflow';
  const isLight = currentTheme === 'light';

  container.innerHTML = `
    <div class="settings-view" style="padding: 24px; max-width: 600px; margin: 0 auto; color: var(--text-primary);">
      <div class="section-header">
        <h2 class="section-title">Settings</h2>
      </div>

      <div class="settings-group" style="background: var(--bg-card); padding: 20px; border-radius: 12px; margin-top: 24px;">
        <h3 style="margin-bottom: 16px; color: var(--accent-primary);">Appearance</h3>
        <div class="settings-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div>
            <div style="font-weight: 600; font-size: 15px;">Theme</div>
            <div style="font-size: 13px; color: #888; margin-top: 4px;">Switch between dark and light mode</div>
          </div>
          <button id="settings-theme-toggle" class="nav-btn" style="width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
            ${isLight ? icons.moon : icons.sun}
          </button>
        </div>
      </div>

      <div class="settings-group" style="background: var(--bg-card); padding: 20px; border-radius: 12px; margin-top: 24px;">
        <h3 style="margin-bottom: 16px; color: var(--accent-primary);">Account</h3>
        ${isLoggedIn ? `
          <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 16px;">
            <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--accent-gradient); display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700; color: var(--accent-text); flex-shrink: 0;">${initial}</div>
            <div>
              <div style="font-weight: 600; font-size: 15px;">${displayName}</div>
              <div style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">${email}</div>
            </div>
          </div>
          <button id="settings-signout-btn" class="btn btn-secondary" style="padding: 8px 16px; font-size: 14px; width: 100%;">Sign Out</button>
        ` : `
          <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 16px;">Sign in to sync your playlists, likes, and preferences across devices.</div>
          <button id="settings-signin-btn" class="auth-signin-btn" style="width: 100%; justify-content: center; padding: 10px 16px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
              <polyline points="10 17 15 12 10 7"/>
              <line x1="15" y1="12" x2="3" y2="12"/>
            </svg>
            <span>Sign In</span>
          </button>
        `}
      </div>

      <div class="settings-group" id="pwa-install-group" style="background: var(--bg-card); padding: 20px; border-radius: 12px; margin-top: 24px; display: none;">
        <h3 style="margin-bottom: 16px; color: var(--accent-primary);">App Installation</h3>
        <div class="settings-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div>
            <div style="font-weight: 600; font-size: 15px;">Install PhantomBeats</div>
            <div style="font-size: 13px; color: #888; margin-top: 4px;">Get the full app experience on your device</div>
          </div>
          <button id="pwa-install-btn" class="btn btn-primary" style="padding: 8px 16px; font-size: 14px;">Install</button>
        </div>
      </div>

      <div class="settings-group" style="background: var(--bg-card); padding: 20px; border-radius: 12px; margin-top: 24px;">
        <h3 style="margin-bottom: 16px; color: var(--accent-primary);">Audio playback</h3>
        
        <div class="settings-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div>
            <div style="font-weight: 600; font-size: 15px;">Crossfade</div>
            <div style="font-size: 13px; color: #888; margin-top: 4px;">Allows you to crossfade between songs</div>
          </div>
          <label class="switch">
            <input type="checkbox" id="crossfade-toggle" ${crossfadeDuration > 0 ? 'checked' : ''}>
            <span class="slider round"></span>
          </label>
        </div>
        
        <div class="crossfade-slider-container" style="display: ${crossfadeDuration > 0 ? 'block' : 'none'};">
          <input type="range" id="crossfade-slider" min="0" max="10" step="1" value="${crossfadeDuration}" style="width: 100%; accent-color: var(--accent-primary);">
          <div style="display: flex; justify-content: space-between; font-size: 12px; color: #888; margin-top: 8px;">
            <span>0s</span>
            <span id="crossfade-val">${crossfadeDuration}s</span>
            <span>10s</span>
          </div>
        </div>
      </div>
    </div>
  `;

  const toggle = container.querySelector('#crossfade-toggle');
  const slider = container.querySelector('#crossfade-slider');
  const val = container.querySelector('#crossfade-val');
  const sliderContainer = container.querySelector('.crossfade-slider-container');
  const toastContainer = document.getElementById('toast-container');

  toggle.addEventListener('change', (e) => {
    if (e.target.checked) {
      sliderContainer.style.display = 'block';
      if (slider.value == 0) slider.value = 2; // default 2s
      localStorage.setItem('crossfadeDuration', slider.value);
      val.textContent = slider.value + 's';
      showToast(toastContainer, 'Crossfade enabled');
    } else {
      sliderContainer.style.display = 'none';
      localStorage.setItem('crossfadeDuration', '0');
      showToast(toastContainer, 'Crossfade disabled');
    }
  });

  slider.addEventListener('input', (e) => {
    val.textContent = e.target.value + 's';
    localStorage.setItem('crossfadeDuration', e.target.value);
    if (e.target.value == 0) {
      toggle.checked = false;
      sliderContainer.style.display = 'none';
    }
  });

  const installGroup = container.querySelector('#pwa-install-group');
  const installBtn = container.querySelector('#pwa-install-btn');
  
  if (window.deferredPWAInstallPrompt) {
    installGroup.style.display = 'block';
  } else {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isStandalone) {
      installGroup.style.display = 'block';
      installGroup.innerHTML = `<h3 style="margin-bottom: 16px; color: var(--accent-primary);">App Installation</h3><div style="font-size:14px;color:#888;">PhantomBeats is currently running as an installed application.</div>`;
    }
  }

  installBtn?.addEventListener('click', async () => {
    if (window.deferredPWAInstallPrompt) {
      window.deferredPWAInstallPrompt.prompt();
      const { outcome } = await window.deferredPWAInstallPrompt.userChoice;
      console.log(`User ${outcome} the install prompt`);
      window.deferredPWAInstallPrompt = null;
      installGroup.style.display = 'none';
    }
  });

  container.querySelector('#settings-signin-btn')?.addEventListener('click', () => {
    if (onSignIn) onSignIn();
  });

  container.querySelector('#settings-signout-btn')?.addEventListener('click', () => {
    if (onSignOut) onSignOut();
  });

  container.querySelector('#settings-theme-toggle')?.addEventListener('click', () => {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const newTheme = current === 'light' ? 'melodyflow' : 'light';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('phantom_theme_mode', newTheme);
    const btn = container.querySelector('#settings-theme-toggle');
    if (btn) btn.innerHTML = newTheme === 'light' ? icons.moon : icons.sun;
    showToast(toastContainer, `Switched to ${newTheme === 'light' ? 'light' : 'dark'} mode`);
  });
}
