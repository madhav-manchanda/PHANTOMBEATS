import { icons, formatDuration, getPlaceholderImage } from '../utils/helpers.js';
import player from '../services/playerEngine.js';
import * as storage from '../services/storage.js';
import { buttonPress } from '../utils/animations.js';

function _getVolumeIcon(vol) {
  if (vol === 0) return icons.volumeMute;
  if (vol < 0.35) return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;
  return icons.volumeHigh;
}

export function renderMiniPlayer(container, { onQueueToggle, onSongClick, onAddClick, onLyricsToggle, onOpenImmersive }) {
  const currentVol = player.getVolume();

  container.innerHTML = `
    <div class="player-song-info" id="player-song-info">
      <img class="player-album-art" id="player-album-art" src="${getPlaceholderImage()}" alt="" />
      <div class="player-song-details">
        <div class="player-song-title" id="player-song-title">No song playing</div>
        <div class="player-song-artist" id="player-song-artist">—</div>
      </div>
      <div class="player-song-actions">
        <button class="player-action-btn" id="player-like-btn" title="Like">${icons.heart}</button>
        <button class="player-action-btn" id="player-add-btn" title="Add to Playlist">${icons.plus}</button>
      </div>
    </div>

    <div class="player-controls">
      <div class="player-buttons">
        <button class="player-btn" id="shuffle-btn" title="Shuffle">${icons.shuffle}</button>
        <button class="player-btn" id="prev-btn" title="Previous">${icons.skipBack}</button>
        <button class="player-btn play-btn" id="play-btn" title="Play">${icons.play}</button>
        <button class="player-btn" id="next-btn" title="Next">${icons.skipForward}</button>
        <button class="player-btn" id="repeat-btn" title="Repeat">${icons.repeat}</button>
      </div>
      <div class="player-progress">
        <span class="player-time" id="current-time">0:00</span>
        <div class="progress-bar-container" id="progress-bar-container" style="position:relative;">
          <div class="progress-bar" id="progress-bar" style="width: 0%"></div>
          <canvas class="visualizer-canvas" id="visualizer-canvas"></canvas>
          <input type="range" class="invisible-seeker" id="desktop-progress-slider" min="0" max="1000" value="0" />
        </div>
        <span class="player-time" id="total-time">0:00</span>
      </div>
    </div>

    <div class="player-extra">
      <div class="volume-control">
        <button class="volume-btn" id="volume-btn" title="Volume">${_getVolumeIcon(currentVol)}</button>
        <input type="range" class="volume-range-slider" id="volume-range-slider"
          min="0" max="100" value="${Math.round(currentVol * 100)}"
          title="Volume: ${Math.round(currentVol * 100)}%" />
      </div>
      <button class="visualizer-toggle-btn" id="visualizer-toggle-btn" title="Toggle Visualizer">${icons.visualizer}</button>
      <button class="lyrics-toggle-btn" id="lyrics-toggle-btn" title="Lyrics">${icons.lyrics}</button>
      <button class="pip-toggle-btn" id="pip-toggle-btn" title="Picture in Picture">${icons.pip}</button>
      <button class="queue-toggle-btn" id="queue-toggle-btn" title="Queue">${icons.queue}</button>
      <button class="phantom-toggle-btn" id="phantom-toggle-btn" title="Phantom Mode">${icons.ghost}</button>
      <button class="sleep-toggle-btn" id="sleep-toggle-btn" title="Sleep Timer">${icons.moon}</button>
    </div>
  `;

  const playBtn = container.querySelector('#play-btn');
  const nextBtn = container.querySelector('#next-btn');
  const prevBtn = container.querySelector('#prev-btn');
  const shuffleBtn = container.querySelector('#shuffle-btn');
  const repeatBtn = container.querySelector('#repeat-btn');
  const likeBtn = container.querySelector('#player-like-btn');
  const progressContainer = container.querySelector('#progress-bar-container');
  const progressBar = container.querySelector('#progress-bar');
  const currentTimeEl = container.querySelector('#current-time');
  const totalTimeEl = container.querySelector('#total-time');
  const volumeSlider = container.querySelector('#volume-range-slider');
  const volumeBtn = container.querySelector('#volume-btn');
  const albumArt = container.querySelector('#player-album-art');
  const songTitle = container.querySelector('#player-song-title');
  const songArtist = container.querySelector('#player-song-artist');
  const queueToggle = container.querySelector('#queue-toggle-btn');
  const addBtn = container.querySelector('#player-add-btn');
  const phantomToggleBtn = container.querySelector('#phantom-toggle-btn');
  const sleepToggleBtn = container.querySelector('#sleep-toggle-btn');
  const songInfo = container.querySelector('#player-song-info');

  playBtn.addEventListener('click', () => {
    buttonPress(playBtn);
    player.togglePlay();
  });
  nextBtn.addEventListener('click', () => { buttonPress(nextBtn); player.next(); });
  prevBtn.addEventListener('click', () => { buttonPress(prevBtn); player.prev(); });
  shuffleBtn.addEventListener('click', () => { player.toggleShuffle(); });
  repeatBtn.addEventListener('click', () => { player.toggleRepeat(); });

  const progressSlider = container.querySelector('#desktop-progress-slider');
  progressSlider.addEventListener('input', (e) => {
    const pct = parseInt(e.target.value) / 1000;
    progressBar.style.width = `${pct * 100}%`;
    const duration = player.audio?.duration || 0;
    if (duration > 0) currentTimeEl.textContent = formatDuration(pct * duration);
  });
  progressSlider.addEventListener('change', (e) => {
    player.seek(parseInt(e.target.value) / 1000);
  });

  volumeSlider.addEventListener('input', (e) => {
    const pct = parseInt(e.target.value) / 100;
    player.setVolume(pct);
    volumeBtn.innerHTML = _getVolumeIcon(pct);
    volumeSlider.title = `Volume: ${e.target.value}%`;
    volumeSlider.style.setProperty('--volume-pct', `${e.target.value}%`);
  });
  volumeSlider.style.setProperty('--volume-pct', `${Math.round(currentVol * 100)}%`);

  let muted = false;
  let prevVolume = player.getVolume();
  volumeBtn.addEventListener('click', () => {
    if (muted) {
      player.setVolume(prevVolume);
      volumeSlider.value = Math.round(prevVolume * 100);
      volumeSlider.style.setProperty('--volume-pct', `${Math.round(prevVolume * 100)}%`);
      volumeBtn.innerHTML = _getVolumeIcon(prevVolume);
    } else {
      prevVolume = player.getVolume();
      player.setVolume(0);
      volumeSlider.value = 0;
      volumeSlider.style.setProperty('--volume-pct', '0%');
      volumeBtn.innerHTML = icons.volumeMute;
    }
    muted = !muted;
  });

  likeBtn.addEventListener('click', () => {
    const song = player.getCurrentSong();
    if (!song) return;
    const liked = storage.toggleLike(song);
    likeBtn.innerHTML = liked ? icons.heartFilled : icons.heart;
    likeBtn.classList.toggle('liked', liked);
    buttonPress(likeBtn);
  });

  if (addBtn) {
    addBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const song = player.getCurrentSong();
      if (!song) return;
      buttonPress(addBtn);
      if (onAddClick) onAddClick(e, song);
    });
  }

  if (queueToggle && onQueueToggle) {
    queueToggle.addEventListener('click', () => {
      queueToggle.classList.toggle('active');
      onQueueToggle();
    });
  }

  if (phantomToggleBtn) {
    phantomToggleBtn.addEventListener('click', () => {
      import('./PhantomMode.js').then(({ renderPhantomMode }) => {
        renderPhantomMode(container);
      });
    });
  }

  if (sleepToggleBtn) {
    sleepToggleBtn.addEventListener('click', () => {
      import('./SleepTimer.js').then(({ renderSleepTimer }) => {
        renderSleepTimer(container, sleepToggleBtn);
      });
    });
  }

  const lyricsToggle = container.querySelector('#lyrics-toggle-btn');
  if (lyricsToggle && onLyricsToggle) {
    lyricsToggle.addEventListener('click', () => {
      lyricsToggle.classList.toggle('active');
      onLyricsToggle();
    });
  }

  const pipToggle = container.querySelector('#pip-toggle-btn');
  if (pipToggle) {
    pipToggle.addEventListener('click', () => {
      player.togglePictureInPicture();
    });
  }

  songTitle.addEventListener('click', () => {
    const song = player.getCurrentSong();
    if (song && onSongClick) onSongClick(song);
  });

  // Mobile tap to open immersive
  if (songInfo && onOpenImmersive) {
    songInfo.addEventListener('click', (e) => {
      if (window.innerWidth > 768) return;
      if (e.target.closest('button') || e.target.closest('.player-btn') || e.target.closest('.play-btn')) return;
      onOpenImmersive();
    });
  }

  player.on('timeupdate', ({ currentTime, duration }) => {
    if (progressSlider && progressSlider.matches(':active')) return;
    const pct = duration ? (currentTime / duration) : 0;
    progressBar.style.width = `${pct * 100}%`;
    currentTimeEl.textContent = formatDuration(currentTime);
    totalTimeEl.textContent = formatDuration(duration);
    if (progressSlider) progressSlider.value = Math.round(pct * 1000);
  });

  player.on('songchange', ({ song }) => {
    if (song) {
      if (song.isLocal) {
        albumArt.src = getPlaceholderImage();
      } else {
        albumArt.src = song.image || getPlaceholderImage();
        albumArt.onerror = () => { albumArt.src = getPlaceholderImage(); };
      }
      songTitle.textContent = song.title || 'Unknown';
      songArtist.textContent = song.artists?.primary || song.artists?.singers || 'Unknown Artist';
      const isLiked = storage.isLiked(song.id);
      likeBtn.innerHTML = isLiked ? icons.heartFilled : icons.heart;
      likeBtn.classList.toggle('liked', isLiked);
    } else {
      albumArt.src = getPlaceholderImage();
      songTitle.textContent = 'No song playing';
      songArtist.textContent = '—';
    }
  });

  player.on('statechange', ({ isPlaying }) => {
    playBtn.innerHTML = isPlaying ? icons.pause : icons.play;
  });

  player.on('shufflechange', ({ shuffle }) => {
    shuffleBtn.classList.toggle('active', shuffle);
  });

  player.on('repeatchange', ({ repeat }) => {
    repeatBtn.classList.toggle('active', repeat !== 'off');
    repeatBtn.innerHTML = repeat === 'one' ? (icons.repeat1 || icons.repeat) : icons.repeat;
  });
}
