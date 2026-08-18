import { getStreamUrl } from './api.js';
import * as storage from './storage.js';
import { getPlaceholderImage } from '../utils/helpers.js';

class PlayerEngine {
  constructor() {
    this.audio = new Audio();
    this.audio.crossOrigin = "anonymous";
    this.audio.preload = 'auto';
    this.audio.volume = storage.getVolume();

    // Crossfade setup
    this.inactiveAudio = new Audio();
    this.inactiveAudio.crossOrigin = "anonymous";
    this.inactiveAudio.preload = 'auto';
    
    this.isCrossfading = false;
    this.crossfadeInterval = null;

    this.queue = [];
    this.currentIndex = -1;
    this.isPlaying = false;
    this.shuffle = false;
    this.repeat = 'off'; 
    this.listeners = {};
    this._localObjectUrls = new Map(); 
    this._pipWindow = null; 
    
    // Audio Context for Bass Boost
    this.audioContext = null;
    this.bassFilter = null;
    this.analyser = null;
    this.mediaSourceActive = null;
    this.mediaSourceInactive = null;

    // Sleep Timer
    this.sleepTimerId = null;
    this.sleepCountdownInterval = null;
    this.sleepTimeRemaining = 0;

    this._setupAudioEvents(this.audio, true);
    this._setupAudioEvents(this.inactiveAudio, false);
    this._setupMediaSession();
  }

  _initAudioContext() {
    if (this.audioContext) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      this.audioContext = new AudioContext();
      this.bassFilter = this.audioContext.createBiquadFilter();
      this.bassFilter.type = 'lowshelf';
      this.bassFilter.frequency.value = 200;
      this.bassFilter.gain.value = 0; // default 0
      
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;
      
      this.mediaSourceActive = this.audioContext.createMediaElementSource(this.audio);
      this.mediaSourceInactive = this.audioContext.createMediaElementSource(this.inactiveAudio);
      
      this.mediaSourceActive.connect(this.bassFilter);
      this.mediaSourceInactive.connect(this.bassFilter);
      this.bassFilter.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
    }
  }

  getAnalyser() {
    return this.analyser;
  }

  setPhantomMode(speed, bass, pitch = 0) {
    const pitchRatio = Math.pow(2, pitch / 12);
    const finalRate = speed * pitchRatio;
    
    this.audio.playbackRate = finalRate;
    this.inactiveAudio.playbackRate = finalRate;
    
    if ('preservesPitch' in this.audio) {
      this.audio.preservesPitch = (pitch === 0);
      this.inactiveAudio.preservesPitch = (pitch === 0);
    }
    
    if (this.bassFilter) {
      this.bassFilter.gain.value = (bass / 100) * 15;
    }
    
    this.emit('phantomchange', { speed, bass, pitch });
  }

  startSleepTimer(minutes) {
    this.cancelSleepTimer();
    const durationMs = minutes * 60 * 1000;
    this.sleepTimeRemaining = durationMs;
    
    this.sleepCountdownInterval = setInterval(() => {
      this.sleepTimeRemaining -= 1000;
      this.emit('sleepupdate', { remaining: this.sleepTimeRemaining });
      if (this.sleepTimeRemaining <= 0) {
        this._startFadeOut();
      }
    }, 1000);
    this.emit('sleeptimer', { active: true, remaining: this.sleepTimeRemaining });
  }
  
  cancelSleepTimer() {
    if (this.sleepTimerId) clearInterval(this.sleepTimerId);
    if (this.sleepCountdownInterval) clearInterval(this.sleepCountdownInterval);
    this.sleepTimerId = null;
    this.sleepCountdownInterval = null;
    this.sleepTimeRemaining = 0;
    this.emit('sleeptimer', { active: false, remaining: 0 });
  }
  
  _startFadeOut() {
    this.cancelSleepTimer();
    const originalVolume = this.audio.volume;
    const steps = 60;
    const volumeStep = originalVolume / steps;
    
    this.sleepTimerId = setInterval(() => {
      if (this.audio.volume > volumeStep) {
        this.audio.volume -= volumeStep;
      } else {
        this.audio.volume = 0;
        this.audio.pause();
        this.audio.volume = originalVolume; // restore for next session
        clearInterval(this.sleepTimerId);
      }
    }, 500);
  }

  _setupAudioEvents(audioElement, isActiveElement) {
    audioElement.addEventListener('timeupdate', () => {
      if (!isActiveElement && !this.isCrossfading) return;
      
      this.emit('timeupdate', {
        currentTime: this.audio.currentTime,
        duration: this.audio.duration || 0,
      });
      this._updatePositionState();

      // Track stats (>80% played)
      const currentSong = this.getCurrentSong();
      if (currentSong && audioElement.duration > 0 && !currentSong._statsRecorded) {
        if (audioElement.currentTime / audioElement.duration > 0.8) {
          currentSong._statsRecorded = true;
          const history = JSON.parse(localStorage.getItem('phantom_stats_history') || '[]');
          history.push({
            songId: currentSong.id,
            title: currentSong.title,
            artist: currentSong.artists?.primary || currentSong.artists?.singers || 'Unknown',
            timestamp: Date.now(),
            duration: audioElement.duration,
            completed: true,
            hourOfDay: new Date().getHours()
          });
          localStorage.setItem('phantom_stats_history', JSON.stringify(history));
        }
      }

      // Check for crossfade
      const crossfadeDuration = parseInt(localStorage.getItem('crossfadeDuration')) || 0;
      if (crossfadeDuration > 0 && isActiveElement && !this.isCrossfading) {
        const timeLeft = audioElement.duration - audioElement.currentTime;
        if (timeLeft <= crossfadeDuration && timeLeft > 0) {
           this._startCrossfade(crossfadeDuration);
        }
      }
    });

    audioElement.addEventListener('ended', () => {
      if (isActiveElement && !this.isCrossfading) {
        this._handleTrackEnd();
      }
    });

    audioElement.addEventListener('play', () => {
      if (!isActiveElement) return;
      this.isPlaying = true;
      this._initAudioContext();
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      this.emit('statechange', { isPlaying: true });
      this._updateMediaSessionPlaybackState('playing');
      this._updatePipPlayBtn();
    });

    audioElement.addEventListener('pause', () => {
      if (!isActiveElement && !this.isCrossfading) return;
      if (isActiveElement) {
        this.isPlaying = false;
        this.emit('statechange', { isPlaying: false });
        this._updateMediaSessionPlaybackState('paused');
        this._updatePipPlayBtn();
      }
    });

    audioElement.addEventListener('loadedmetadata', () => {
      if (!isActiveElement) return;
      this.emit('loaded', {
        duration: this.audio.duration,
      });
      this._updatePositionState();
    });

    audioElement.addEventListener('error', (e) => {
      if (isActiveElement) {
        console.error('[PlayerEngine] Audio error:', e);
        this.emit('error', { error: 'Failed to load audio' });
      }
    });
  }

  _setupMediaSession() {
    if (!('mediaSession' in navigator)) return;

    const ms = navigator.mediaSession;

    ms.setActionHandler('play', () => this.togglePlay());
    ms.setActionHandler('pause', () => this.togglePlay());
    ms.setActionHandler('previoustrack', () => this.prev());
    ms.setActionHandler('nexttrack', () => this.next());

    ms.setActionHandler('seekbackward', (details) => {
      const skipTime = details.seekOffset || 10;
      this.audio.currentTime = Math.max(this.audio.currentTime - skipTime, 0);
    });

    ms.setActionHandler('seekforward', (details) => {
      const skipTime = details.seekOffset || 10;
      this.audio.currentTime = Math.min(
        this.audio.currentTime + skipTime,
        this.audio.duration || 0
      );
    });

    try {
      ms.setActionHandler('seekto', (details) => {
        if (details.fastSeek && 'fastSeek' in this.audio) {
          this.audio.fastSeek(details.seekTime);
        } else {
          this.audio.currentTime = details.seekTime;
        }
        this._updatePositionState();
      });
    } catch (e) { }

    try {
      ms.setActionHandler('stop', () => {
        this.audio.pause();
        this.audio.currentTime = 0;
      });
    } catch (e) { }

    try {
      ms.setActionHandler('togglerepeat', () => this.toggleRepeat());
    } catch (e) { }

    try {
      ms.setActionHandler('toggleshuffle', () => this.toggleShuffle());
    } catch (e) { }

    try {
      ms.setActionHandler('enterpictureinpicture', () => this.togglePictureInPicture());
    } catch (e) { }
  }

  _updateMediaSessionMetadata(song) {
    if (!('mediaSession' in navigator) || !song) return;

    const artwork = [];
    if (song.image && !song.isLocal) {
      artwork.push(
        { src: song.image, sizes: '96x96', type: 'image/jpeg' },
        { src: song.image, sizes: '128x128', type: 'image/jpeg' },
        { src: song.image, sizes: '192x192', type: 'image/jpeg' },
        { src: song.image, sizes: '256x256', type: 'image/jpeg' },
        { src: song.image, sizes: '384x384', type: 'image/jpeg' },
        { src: song.image, sizes: '512x512', type: 'image/jpeg' }
      );
    } else {
      const placeholderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="#1a1a2e"/><text x="256" y="280" text-anchor="middle" font-family="sans-serif" font-size="120" fill="#6c63ff">♪</text></svg>`;
      const blob = new Blob([placeholderSvg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      artwork.push({ src: url, sizes: '512x512', type: 'image/svg+xml' });
    }

    const artist = song.artists?.primary || song.artists?.singers || 'Unknown Artist';

    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title || 'Unknown',
      artist: artist,
      album: song.album || '',
      artwork: artwork,
    });

    this._updatePipUI();
  }

  _updateMediaSessionPlaybackState(state) {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = state;
  }

  _updatePositionState() {
    if (!('mediaSession' in navigator)) return;
    if (!this.audio.duration || isNaN(this.audio.duration)) return;

    try {
      navigator.mediaSession.setPositionState({
        duration: this.audio.duration,
        playbackRate: this.audio.playbackRate,
        position: Math.min(this.audio.currentTime, this.audio.duration),
      });
    } catch (e) { }
  }

  async togglePictureInPicture() {
    if (this._pipWindow) {
      this._pipWindow.close();
      this._pipWindow = null;
      return;
    }

    if (!('documentPictureInPicture' in window)) {
      console.warn('[PlayerEngine] Document Picture-in-Picture API not supported');
      return;
    }

    try {
      const pipWindow = await window.documentPictureInPicture.requestWindow({
        width: 360,
        height: 200,
      });
      this._pipWindow = pipWindow;

      const styles = [...document.styleSheets];
      styles.forEach((sheet) => {
        try {
          if (sheet.href) {
            const link = pipWindow.document.createElement('link');
            link.rel = 'stylesheet';
            link.href = sheet.href;
            pipWindow.document.head.appendChild(link);
          } else if (sheet.cssRules) {
            const style = pipWindow.document.createElement('style');
            Array.from(sheet.cssRules).forEach((rule) => {
              style.textContent += rule.cssText + '\n';
            });
            pipWindow.document.head.appendChild(style);
          }
        } catch (e) { }
      });

      const pipStyle = pipWindow.document.createElement('style');
      pipStyle.textContent = `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Inter', 'Segoe UI', sans-serif;
          background: linear-gradient(135deg, #0d0d1a 0%, #1a1a2e 50%, #16213e 100%);
          color: #e0e0e0; 
          overflow: hidden;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pip-container { display: flex; align-items: center; gap: 14px; padding: 16px 20px; width: 100%; max-width: 360px; }
        .pip-art { width: 80px; height: 80px; border-radius: 10px; object-fit: cover; flex-shrink: 0; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
        .pip-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
        .pip-title { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #fff; }
        .pip-artist { font-size: 12px; color: #999; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pip-controls { display: flex; align-items: center; gap: 6px; }
        .pip-btn { background: none; border: none; color: #ccc; cursor: pointer; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all 0.15s ease; padding: 0; }
        .pip-btn:hover { color: #fff; background: rgba(255,255,255,0.1); }
        .pip-btn.active { color: #6c63ff; }
        .pip-btn svg { width: 18px; height: 18px; }
        .pip-btn.pip-play-btn { width: 38px; height: 38px; background: #6c63ff; color: #fff; }
        .pip-btn.pip-play-btn:hover { background: #7c73ff; }
        .pip-btn.pip-play-btn svg { width: 20px; height: 20px; }
      `;
      pipWindow.document.head.appendChild(pipStyle);

      const song = this.getCurrentSong();
      const imgSrc = (song && !song.isLocal && song.image) ? song.image : getPlaceholderImage();
      const artist = song?.artists?.primary || song?.artists?.singers || 'Unknown Artist';

      const container = pipWindow.document.createElement('div');
      container.className = 'pip-container';
      container.innerHTML = `
        <img class="pip-art" id="pip-art" src="${imgSrc}" alt="" />
        <div class="pip-info">
          <div class="pip-title" id="pip-title">${song?.title || 'No song playing'}</div>
          <div class="pip-artist" id="pip-artist">${artist}</div>
          <div class="pip-controls">
            <button class="pip-btn" id="pip-repeat" title="Repeat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
            </button>
            <button class="pip-btn" id="pip-prev" title="Previous">
              <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" stroke-width="2"/></svg>
            </button>
            <button class="pip-btn pip-play-btn" id="pip-play" title="Play">
              ${this.isPlaying 
                ? '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
                : '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>'
              }
            </button>
            <button class="pip-btn" id="pip-next" title="Next">
              <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" stroke-width="2"/></svg>
            </button>
          </div>
        </div>
      `;
      pipWindow.document.body.appendChild(container);

      this._updatePipRepeatBtn();

      pipWindow.document.getElementById('pip-play').addEventListener('click', () => this.togglePlay());
      pipWindow.document.getElementById('pip-prev').addEventListener('click', () => this.prev());
      pipWindow.document.getElementById('pip-next').addEventListener('click', () => this.next());
      pipWindow.document.getElementById('pip-repeat').addEventListener('click', () => this.toggleRepeat());

      pipWindow.addEventListener('pagehide', () => {
        this._pipWindow = null;
      });
    } catch (e) {
      console.error('[PlayerEngine] PiP error:', e);
    }
  }

  _updatePipUI() {
    if (!this._pipWindow) return;
    const song = this.getCurrentSong();
    if (!song) return;
    try {
      const art = this._pipWindow.document.getElementById('pip-art');
      const title = this._pipWindow.document.getElementById('pip-title');
      const artist = this._pipWindow.document.getElementById('pip-artist');
      if (art) art.src = (song.image && !song.isLocal) ? song.image : getPlaceholderImage();
      if (title) title.textContent = song.title || 'Unknown';
      if (artist) artist.textContent = song.artists?.primary || song.artists?.singers || 'Unknown Artist';
    } catch (e) { }
  }

  _updatePipPlayBtn() {
    if (!this._pipWindow) return;
    try {
      const btn = this._pipWindow.document.getElementById('pip-play');
      if (btn) {
        btn.innerHTML = this.isPlaying
          ? '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
          : '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
      }
    } catch (e) { }
  }

  _updatePipRepeatBtn() {
    if (!this._pipWindow) return;
    try {
      const btn = this._pipWindow.document.getElementById('pip-repeat');
      if (!btn) return;
      btn.classList.toggle('active', this.repeat !== 'off');
      if (this.repeat === 'one') {
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/><text x="12" y="15" font-size="8" font-weight="bold" fill="currentColor" stroke="none" text-anchor="middle">1</text></svg>';
      } else {
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>';
      }
    } catch (e) { }
  }

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
  }

  emit(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach((cb) => cb(data));
  }

  getCurrentSong() {
    return this.queue[this.currentIndex] || null;
  }

  playSong(song, clearQueue = false) {
    if (clearQueue) {
      this.queue = [song];
      this.currentIndex = 0;
    } else {
      const existingIndex = this.queue.findIndex((s) => s.id === song.id);
      if (existingIndex >= 0) {
        this.currentIndex = existingIndex;
      } else {
        this.currentIndex = this.queue.length;
        this.queue.push(song);
      }
    }

    this._loadAndPlay();
    storage.addToRecentlyPlayed(song);
    this.emit('songchange', { song, queue: this.queue, index: this.currentIndex });
  }

  playSongList(songs, startIndex = 0) {
    this.queue = [...songs];
    this.currentIndex = startIndex;
    this._loadAndPlay();
    const song = this.queue[this.currentIndex];
    if (song) storage.addToRecentlyPlayed(song);
    this.emit('songchange', { song, queue: this.queue, index: this.currentIndex });
  }

  _loadAndPlay() {
    const song = this.queue[this.currentIndex];
    if (!song) return;

    let src = '';
    if (song.isLocal && song.localUrl) {
      src = song.localUrl;
    } else if (song.isLocal && song.file) {
      src = URL.createObjectURL(song.file);
      this._localObjectUrls.set(song.id, src);
    } else {
      src = getStreamUrl(song.id);
    }
    
    this.audio.src = src;
    this.audio.currentTime = 0;
    this._updateMediaSessionMetadata(song);

    this.audio.play().catch((err) => {
      console.error('[PlayerEngine] Play failed:', err.message);
      this.emit('error', { error: 'Failed to play audio', detail: err.message });
    });
  }
  
  _startCrossfade(duration) {
    if (this.isCrossfading || this.queue.length <= 1) return;
    
    let nextIndex = this.currentIndex + 1;
    if (nextIndex >= this.queue.length) {
      if (this.repeat === 'all') nextIndex = 0;
      else return; // Don't crossfade if it's the last song and no repeat
    }
    
    this.isCrossfading = true;
    const nextSong = this.queue[nextIndex];
    
    let nextSrc = '';
    if (nextSong.isLocal && nextSong.localUrl) {
      nextSrc = nextSong.localUrl;
    } else if (nextSong.isLocal && nextSong.file) {
      nextSrc = URL.createObjectURL(nextSong.file);
      this._localObjectUrls.set(nextSong.id, nextSrc);
    } else {
      nextSrc = getStreamUrl(nextSong.id);
    }
    
    this.inactiveAudio.src = nextSrc;
    this.inactiveAudio.volume = 0;
    this.inactiveAudio.play().catch((err) => {
      console.error('[PlayerEngine] Crossfade play failed:', err.message);
      this.emit('error', { error: 'Crossfade failed', detail: err.message });
    });
    
    const steps = duration * 10;
    let step = 0;
    const maxVolume = storage.getVolume();
    
    if (this.crossfadeInterval) clearInterval(this.crossfadeInterval);
    
    this.crossfadeInterval = setInterval(() => {
      step++;
      const fadeRatio = step / steps;
      this.audio.volume = Math.max(0, maxVolume * (1 - fadeRatio));
      this.inactiveAudio.volume = Math.min(maxVolume, maxVolume * fadeRatio);
      
      if (step >= steps) {
        this.audio.pause();
        this.audio.volume = maxVolume;
        
        // Swap active and inactive
        const temp = this.audio;
        this.audio = this.inactiveAudio;
        this.inactiveAudio = temp;
        
        this.currentIndex = nextIndex;
        this.isCrossfading = false;
        clearInterval(this.crossfadeInterval);
        
        this._updateMediaSessionMetadata(nextSong);
        const song = this.queue[this.currentIndex];
        if (song) storage.addToRecentlyPlayed(song);
        this.emit('songchange', { song, queue: this.queue, index: this.currentIndex });
      }
    }, 100);
  }

  playLocalFile(file) {
    const url = URL.createObjectURL(file);
    const song = {
      id: `local_${file.name}_${file.size}`,
      title: file.name.replace(/\.[^/.]+$/, ''), 
      artists: { primary: 'Local File' },
      image: null,
      duration: 0,
      album: 'Local Files',
      isLocal: true,
      localUrl: url,
      file: file,
    };

    this._localObjectUrls.set(song.id, url);
    this.playSong(song);
    this.audio.addEventListener('loadedmetadata', () => {
      song.duration = this.audio.duration;
    }, { once: true });
  }

  playLocalFiles(files) {
    const songs = Array.from(files).map(file => {
      const url = URL.createObjectURL(file);
      const song = {
        id: `local_${file.name}_${file.size}`,
        title: file.name.replace(/\.[^/.]+$/, ''),
        artists: { primary: 'Local File' },
        image: null,
        duration: 0,
        album: 'Local Files',
        isLocal: true,
        localUrl: url,
        file: file,
      };
      this._localObjectUrls.set(song.id, url);
      return song;
    });

    if (songs.length > 0) {
      this.playSongList(songs, 0);
    }
  }

  togglePlay() {
    if (this.audio.paused) {
      this.audio.play().catch((err) => {
        console.error('[PlayerEngine] Play failed:', err.message);
        this.emit('error', { error: 'Failed to play audio', detail: err.message });
      });
    } else {
      this.audio.pause();
    }
  }

  next() {
    if (this.repeat === 'one') {
      this.audio.currentTime = 0;
      this.audio.play().catch((err) => {
        console.error('[PlayerEngine] Play failed:', err.message);
        this.emit('error', { error: 'Failed to play audio', detail: err.message });
      });
      return;
    }

    if (this.shuffle) {
      this.currentIndex = Math.floor(Math.random() * this.queue.length);
    } else {
      this.currentIndex++;
      if (this.currentIndex >= this.queue.length) {
        if (this.repeat === 'all') {
          this.currentIndex = 0;
        } else {
          this.currentIndex = this.queue.length - 1;
          this.audio.pause();
          this.emit('statechange', { isPlaying: false });
          return;
        }
      }
    }

    this._loadAndPlay();
    const song = this.queue[this.currentIndex];
    if (song) storage.addToRecentlyPlayed(song);
    this.emit('songchange', { song, queue: this.queue, index: this.currentIndex });
  }

  prev() {
    if (this.audio.currentTime > 3) {
      this.audio.currentTime = 0;
      return;
    }

    this.currentIndex--;
    if (this.currentIndex < 0) {
      this.currentIndex = this.repeat === 'all' ? this.queue.length - 1 : 0;
    }

    this._loadAndPlay();
    const song = this.queue[this.currentIndex];
    if (song) storage.addToRecentlyPlayed(song);
    this.emit('songchange', { song, queue: this.queue, index: this.currentIndex });
  }

  _handleTrackEnd() {
    if (this.repeat === 'one') {
      this.audio.currentTime = 0;
      this.audio.play().catch((err) => {
        console.error('[PlayerEngine] Play failed:', err.message);
        this.emit('error', { error: 'Failed to play audio', detail: err.message });
      });
      return;
    }
    this.next();
  }

  toggleRepeat() {
    const modes = ['off', 'all', 'one'];
    const idx = modes.indexOf(this.repeat);
    this.repeat = modes[(idx + 1) % modes.length];
    this.emit('repeatchange', { repeat: this.repeat });
    this._updatePipRepeatBtn();
  }

  seek(percentage) {
    if (this.audio.duration) {
      this.audio.currentTime = percentage * this.audio.duration;
    }
  }

  setVolume(vol) {
    vol = Math.max(0, Math.min(1, vol));
    this.audio.volume = vol;
    storage.setVolume(vol);
    this.emit('volumechange', { volume: vol });
  }

  getVolume() {
    return this.audio.volume;
  }

  toggleShuffle() {
    this.shuffle = !this.shuffle;
    this.emit('shufflechange', { shuffle: this.shuffle });
  }

  addToQueue(song) {
    if (!this.queue.some((s) => s.id === song.id)) {
      this.queue.push(song);
      this.emit('queuechange', { queue: this.queue });
    }
  }

  removeFromQueue(index) {
    if (index === this.currentIndex) return; 
    const song = this.queue[index];
    if (song?.isLocal && this._localObjectUrls.has(song.id)) {
      URL.revokeObjectURL(this._localObjectUrls.get(song.id));
      this._localObjectUrls.delete(song.id);
    }
    this.queue.splice(index, 1);
    if (index < this.currentIndex) {
      this.currentIndex--;
    }
    this.emit('queuechange', { queue: this.queue });
  }

  getQueue() {
    return this.queue;
  }

  getUpNext() {
    return this.queue.slice(this.currentIndex + 1);
  }

  clearQueue() {
    this.queue.forEach((song, i) => {
      if (i !== this.currentIndex && song.isLocal && this._localObjectUrls.has(song.id)) {
        URL.revokeObjectURL(this._localObjectUrls.get(song.id));
        this._localObjectUrls.delete(song.id);
      }
    });

    const currentSong = this.getCurrentSong();
    this.queue = currentSong ? [currentSong] : [];
    this.currentIndex = currentSong ? 0 : -1;
    this.emit('queuechange', { queue: this.queue });
  }
}
const player = new PlayerEngine();
export default player;
