import { icons, formatDuration, getPlaceholderImage } from '../utils/helpers.js';
import player from '../services/playerEngine.js';
import * as storage from '../services/storage.js';

export function renderImmersivePlayerSheet(container, { onClose }) {
  container.innerHTML = `
    <div class="immersive-sheet-overlay" id="immersive-sheet">
      
      <!-- Header -->
      <div class="immersive-header">
        <button class="icon-btn" id="ims-close" title="Dismiss">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>
        <div class="immersive-header-center">
          <div class="playing-from-label">Playing from Library</div>
          <div class="playing-from-context">Your Playlist</div>
        </div>
        <button class="icon-btn" id="ims-options" title="Options">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
        </button>
      </div>

      <!-- Main Content -->
      <div class="immersive-main">
        <div class="immersive-art-container">
          <img class="immersive-art" id="ims-art" src="${getPlaceholderImage()}" alt="" />
          <!-- EQ Visualizer Overlay -->
          <div class="eq-visualizer-chip" id="ims-eq">
            <div class="eq-bar"></div>
            <div class="eq-bar"></div>
            <div class="eq-bar"></div>
            <div class="eq-bar"></div>
          </div>
        </div>

        <div class="immersive-info-row">
          <div class="immersive-text-stack">
            <div class="immersive-title" id="ims-title">No song playing</div>
            <div class="immersive-artist" id="ims-artist">—</div>
          </div>
          <button class="icon-btn" id="ims-like">
            ${icons.heart}
          </button>
        </div>

        <!-- Progress Slider -->
        <div class="immersive-progress">
          <div class="progress-slider-wrapper">
            <div class="progress-slider-track"></div>
            <div class="progress-slider-fill" id="ims-progress-fill"></div>
            <div class="progress-slider-thumb" id="ims-progress-thumb"></div>
            <input type="range" class="progress-slider-input" id="ims-progress-input" min="0" max="1000" value="0" />
          </div>
          <div class="immersive-time-row">
            <span id="ims-current-time">0:00</span>
            <span id="ims-total-time">0:00</span>
          </div>
        </div>

        <!-- Transport Row -->
        <div class="immersive-transport">
          <button class="icon-btn" id="ims-shuffle" title="Shuffle">${icons.shuffle}</button>
          <button class="icon-btn" id="ims-prev" title="Previous">${icons.skipBack}</button>
          <button class="play-pause-btn" id="ims-play" title="Play">${icons.play}</button>
          <button class="icon-btn" id="ims-next" title="Next">${icons.skipForward}</button>
          <button class="icon-btn" id="ims-repeat" title="Repeat">${icons.repeat}</button>
        </div>

        <!-- Secondary Icons -->
        <div class="immersive-secondary-actions">
          <button class="icon-btn" id="ims-lyrics" title="Lyrics">${icons.fileText || icons.menu}</button>
          <button class="icon-btn" id="ims-queue" title="Queue">${icons.queue || icons.list}</button>
          <button class="icon-btn" id="ims-phantom" title="Phantom Mode">${icons.ghost}</button>
          <button class="icon-btn" id="ims-sleep" title="Sleep Timer">${icons.moon}</button>
        </div>
      </div>
    </div>
  `;

  const sheet = container.querySelector('#immersive-sheet');
  // Trigger open animation after a tiny delay
  requestAnimationFrame(() => {
    sheet.classList.add('open');
  });

  const closeBtn = container.querySelector('#ims-close');
  closeBtn.addEventListener('click', () => {
    sheet.classList.remove('open');
    setTimeout(() => {
      if (onClose) onClose();
    }, 300);
  });

  // DOM elements
  const art = container.querySelector('#ims-art');
  const title = container.querySelector('#ims-title');
  const artist = container.querySelector('#ims-artist');
  const likeBtn = container.querySelector('#ims-like');
  const eq = container.querySelector('#ims-eq');
  
  const playBtn = container.querySelector('#ims-play');
  const nextBtn = container.querySelector('#ims-next');
  const prevBtn = container.querySelector('#ims-prev');
  const shuffleBtn = container.querySelector('#ims-shuffle');
  const repeatBtn = container.querySelector('#ims-repeat');
  
  const progressInput = container.querySelector('#ims-progress-input');
  const progressFill = container.querySelector('#ims-progress-fill');
  const progressThumb = container.querySelector('#ims-progress-thumb');
  const currentTimeEl = container.querySelector('#ims-current-time');
  const totalTimeEl = container.querySelector('#ims-total-time');

  // Sync Initial State
  function syncState() {
    const song = player.getCurrentSong();
    if (song) {
      art.src = (song.image && !song.isLocal) ? song.image : getPlaceholderImage();
      title.textContent = song.title || 'Unknown';
      artist.textContent = song.artists?.primary || song.artists?.singers || 'Unknown Artist';
      
      const isLiked = storage.isLiked?.(song) || false;
      likeBtn.innerHTML = isLiked ? icons.heartFilled : icons.heart;
    }

    if (player.isPlaying) {
      playBtn.innerHTML = icons.pause;
      eq.classList.remove('paused');
    } else {
      playBtn.innerHTML = icons.play;
      eq.classList.add('paused');
    }
    
    // Sync time if available
    const duration = player.audio?.duration || 0;
    const current = player.audio?.currentTime || 0;
    if (duration) {
      const pct = current / duration;
      const pct100 = pct * 100;
      progressFill.style.width = `${pct100}%`;
      progressThumb.style.left = `${pct100}%`;
      currentTimeEl.textContent = formatDuration(current);
      totalTimeEl.textContent = formatDuration(duration);
      progressInput.value = Math.round(pct * 1000);
    }
  }

  syncState();

  // Events
  playBtn.addEventListener('click', () => player.togglePlay());
  nextBtn.addEventListener('click', () => player.next());
  prevBtn.addEventListener('click', () => player.prev());
  shuffleBtn.addEventListener('click', () => player.toggleShuffle());
  repeatBtn.addEventListener('click', () => player.toggleRepeat());

  let isDragging = false;
  progressInput.addEventListener('input', (e) => {
    isDragging = true;
    const pct = parseInt(e.target.value) / 1000;
    progressFill.style.width = `${pct * 100}%`;
    progressThumb.style.left = `${pct * 100}%`;
    const duration = player.audio?.duration || 0;
    if (duration > 0) currentTimeEl.textContent = formatDuration(pct * duration);
  });
  progressInput.addEventListener('change', (e) => {
    isDragging = false;
    player.seek(parseInt(e.target.value) / 1000);
  });

  player.on('statechange', ({ isPlaying }) => {
    playBtn.innerHTML = isPlaying ? icons.pause : icons.play;
    if (isPlaying) {
      eq.classList.remove('paused');
    } else {
      eq.classList.add('paused');
    }
  });

  player.on('songchange', ({ song }) => {
    if (song) {
      art.src = (song.image && !song.isLocal) ? song.image : getPlaceholderImage();
      title.textContent = song.title || 'Unknown';
      artist.textContent = song.artists?.primary || song.artists?.singers || 'Unknown Artist';
    }
  });

  player.on('timeupdate', ({ currentTime, duration }) => {
    if (isDragging) return;
    const pct = duration ? (currentTime / duration) : 0;
    const pct100 = pct * 100;
    progressFill.style.width = `${pct100}%`;
    progressThumb.style.left = `${pct100}%`;
    currentTimeEl.textContent = formatDuration(currentTime);
    totalTimeEl.textContent = formatDuration(duration);
    progressInput.value = Math.round(pct * 1000);
  });
}
