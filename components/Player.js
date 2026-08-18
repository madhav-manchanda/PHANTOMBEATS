import { icons, formatDuration, getPlaceholderImage, escapeHtml } from '../utils/helpers.js';
import { slideInBottom, buttonPress } from '../utils/animations.js';
import player from '../services/playerEngine.js';
import * as storage from '../services/storage.js';
import { renderPhantomMode } from './PhantomMode.js';
import { renderSleepTimer } from './SleepTimer.js';

function _getVolumeIcon(vol) {
  if (vol === 0) return icons.volumeMute;
  if (vol < 0.35) return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;
  return icons.volumeHigh;
}

export function renderPlayer(container, { onQueueToggle, onSongClick, onAddClick, onLyricsToggle }) {
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

  queueToggle.addEventListener('click', () => {
    queueToggle.classList.toggle('active');
    onQueueToggle();
  });
  
  phantomToggleBtn.addEventListener('click', () => {
    renderPhantomMode(container);
  });
  
  sleepToggleBtn.addEventListener('click', () => {
    renderSleepTimer(container, sleepToggleBtn);
  });

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
      songArtist.textContent = (song.artists?.primary || song.artists?.singers || '') || 'Unknown';
      const isLiked = storage.isLiked(song.id);
      likeBtn.innerHTML = isLiked ? icons.heartFilled : icons.heart;
      likeBtn.classList.toggle('liked', isLiked);
    }
  });

  player.on('statechange', ({ isPlaying }) => {
    playBtn.innerHTML = isPlaying ? icons.pause : icons.play;
    if (isPlaying) {
      albumArt.classList.add('vinyl-spin');
      albumArt.style.animationPlayState = 'running';
    } else {
      albumArt.style.animationPlayState = 'paused';
    }
  });

  player.on('phantomchange', ({ speed }) => {
    // 5s is normal speed duration. Faster speed = shorter duration.
    const duration = 5 / speed; 
    albumArt.style.animationDuration = `${duration}s`;
  });

  player.on('shufflechange', ({ shuffle }) => {
    shuffleBtn.classList.toggle('active', shuffle);
  });

  player.on('repeatchange', ({ repeat }) => {
    repeatBtn.classList.toggle('active', repeat !== 'off');
    if (repeat === 'one') {
      repeatBtn.style.position = 'relative';
      repeatBtn.innerHTML = icons.repeat + '<span style="position:absolute;font-size:8px;font-weight:700;bottom:2px;right:2px;">1</span>';
    } else {
      repeatBtn.innerHTML = icons.repeat;
    }
  });

  player.on('volumechange', ({ volume }) => {
    volumeSlider.value = Math.round(volume * 100);
    volumeSlider.style.setProperty('--volume-pct', `${Math.round(volume * 100)}%`);
    volumeBtn.innerHTML = _getVolumeIcon(volume);
  });

  const currentSong = player.getCurrentSong();
  if (currentSong) {
    if (currentSong.isLocal) {
      albumArt.src = getPlaceholderImage();
    } else {
      albumArt.src = currentSong.image || getPlaceholderImage();
    }
    songTitle.textContent = currentSong.title || 'Unknown';
    songArtist.textContent = (currentSong.artists?.primary || currentSong.artists?.singers || '') || 'Unknown';
    const isLiked = storage.isLiked(currentSong.id);
    likeBtn.innerHTML = isLiked ? icons.heartFilled : icons.heart;
    likeBtn.classList.toggle('liked', isLiked);
    
    // reset vinyl duration
    const speed = player.audio.playbackRate || 1;
    albumArt.style.animationDuration = `${5 / speed}s`;
  }
  if (player.isPlaying) {
    playBtn.innerHTML = icons.pause;
    albumArt.classList.add('vinyl-spin');
    albumArt.style.animationPlayState = 'running';
  } else {
    albumArt.classList.add('vinyl-spin');
    albumArt.style.animationPlayState = 'paused';
  }

  // Visualizer setup
  const visualizerCanvas = container.querySelector('#visualizer-canvas');
  const visualizerToggle = container.querySelector('#visualizer-toggle-btn');
  let visualizerActive = localStorage.getItem('phantom_visualizer') === 'true';
  let animFrameId = null;

  function updateVisualizerState() {
    if (visualizerActive) {
      progressBar.style.display = 'none';
      progressContainer.classList.add('visualizer-active');
      visualizerCanvas.style.display = 'block';
      visualizerToggle.classList.add('active');
      startVisualizer();
    } else {
      progressBar.style.display = '';
      progressContainer.classList.remove('visualizer-active');
      visualizerCanvas.style.display = 'none';
      visualizerToggle.classList.remove('active');
      stopVisualizer();
    }
  }

  function startVisualizer() {
    const analyser = player.getAnalyser();
    if (!analyser) {
      if (visualizerActive) setTimeout(startVisualizer, 1000);
      return;
    }
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const desktopCanvas = container.querySelector('#visualizer-canvas');
    const mobileCanvas = document.getElementById('mp-visualizer-canvas');
    
    function resizeCanvas() {
      [desktopCanvas, mobileCanvas].forEach(c => {
        if (!c) return;
        const parent = c.parentElement;
        if (!parent) return;
        const rect = parent.getBoundingClientRect();
        if (rect.width > 0) {
          c.width = rect.width * window.devicePixelRatio;
          c.height = 32 * window.devicePixelRatio;
          const ctx = c.getContext('2d');
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        }
      });
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    function draw() {
      if (!visualizerActive) return;
      animFrameId = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      
      const canvases = [desktopCanvas, document.getElementById('mp-visualizer-canvas')].filter(c => c && c.offsetParent !== null);
      
      canvases.forEach(canvas => {
        const ctx = canvas.getContext('2d');
        const width = canvas.width / window.devicePixelRatio;
        const height = canvas.height / window.devicePixelRatio;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const pct = player.audio?.duration ? (player.audio.currentTime / player.audio.duration) : 0;
        
        const barCount = 96;
        const barWidth = width / barCount;
        const gap = 3.5;
        const usefulBins = Math.min(80, bufferLength);
        
        const rootStyles = getComputedStyle(document.documentElement);
        const activeColor = rootStyles.getPropertyValue('--accent-primary').trim() || '#ffffff';
        const inactiveColor = rootStyles.getPropertyValue('--text-muted').trim() || '#585858';
        
        for (let i = 0; i < barCount; i++) {
          const binIndex = Math.floor((i / barCount) * usefulBins);
          const bin0 = dataArray[binIndex] || 0;
          const bin1 = dataArray[Math.min(binIndex + 1, bufferLength - 1)] || 0;
          let val = ((bin0 + bin1) / 2) / 255;
          val = Math.pow(val, 0.85);
          
          const minHeight = Math.max(2, barWidth - gap);
          const barHeight = Math.max(minHeight, val * (height - 2));
          const x = i * barWidth;
          const y = (height - barHeight) / 2;
          
          const barPct = i / barCount;
          ctx.fillStyle = (barPct <= pct) ? activeColor : inactiveColor;
          
          ctx.beginPath();
          const radius = (barWidth - gap) / 2;
          ctx.roundRect(x + gap / 2, y, Math.max(1, barWidth - gap), barHeight, radius);
          ctx.fill();
        }
      });
    }
    draw();
  }

  function stopVisualizer() {
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
  }

  if (visualizerToggle) {
    visualizerToggle.addEventListener('click', () => {
      visualizerActive = !visualizerActive;
      localStorage.setItem('phantom_visualizer', visualizerActive);
      updateVisualizerState();
    });
  }

  updateVisualizerState();

  slideInBottom(container);
}
