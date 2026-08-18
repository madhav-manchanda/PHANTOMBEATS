import { getGreeting, escapeHtml, getPlaceholderImage } from '../utils/helpers.js';
import * as storage from '../services/storage.js';
import { getTrending, getTopArtists } from '../services/api.js';
import player from '../services/playerEngine.js';

export function renderHome(container, { onContextMenu, theme, profile }) {
  let greeting = getGreeting();
  const user = storage.getCurrentUser();
  if (user) {
    let rawName = profile?.display_name || user.user_metadata?.display_name || user.user_metadata?.full_name || '';
    if (!rawName && user.email) {
      rawName = user.email.split('@')[0];
    }
    if (rawName) {
      const capitalizedName = escapeHtml(rawName.charAt(0).toUpperCase() + rawName.slice(1));
      greeting = `Welcome back, ${capitalizedName}`;
    }
  }

  const recentlyPlayed = storage.getRecentlyPlayed().slice(0, 6);

  container.innerHTML = `
    <div class="home-view-container">
      <div class="home-hero">
        <p class="home-brand-label">FIND YOUR FREQUENCY.</p>
        <h1 class="home-greeting">${greeting}</h1>
      </div>

      <!-- DESKTOP LAYOUT -->
      <div class="desktop-only" style="flex-direction: column; gap: var(--space-xl);">
        ${recentlyPlayed.length > 0 ? `
          <div class="home-section">
            <h2 class="home-section-title">RECENTLY PLAYED</h2>
            <div class="home-carousel" id="home-recent-carousel"></div>
          </div>
        ` : ''}

        <div class="home-section">
          <h2 class="home-section-title">TRENDING NOW</h2>
          <div class="home-carousel" id="home-trending-carousel">
            <div class="made-for-moment-card" style="opacity: 0.5; pointer-events: none;">
              <div style="width:48px;height:48px;border-radius:var(--rounded-xs);background:var(--elevation-2);"></div>
              <div class="made-for-moment-info">
                <span class="made-for-moment-title">Loading...</span>
                <span class="made-for-moment-subtitle">Fetching trending songs</span>
              </div>
            </div>
          </div>
        </div>

        <div class="home-section">
          <h2 class="home-section-title">TOP ARTISTS</h2>
          <div class="home-carousel" id="home-artists-carousel">
            <div class="rotation-card" style="opacity: 0.5; pointer-events: none;">
              <div class="rotation-img-wrapper" style="background:var(--elevation-2);"></div>
              <div class="rotation-info">
                <span class="rotation-title">Loading...</span>
                <span class="rotation-subtitle">Fetching artists</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- MOBILE LAYOUT -->
      <div class="mobile-only">
        ${recentlyPlayed.length > 0 ? `
          <div class="home-section">
            <h2 class="mobile-section-title">Recently Played</h2>
            <div id="home-recent-mobile"></div>
          </div>
        ` : ''}

        <div class="home-section">
          <h2 class="mobile-section-title">Trending Now</h2>
          <div class="mobile-card-grid" id="home-trending-mobile">
            <div class="mobile-square-card" style="opacity: 0.5; pointer-events: none;">
              <div style="width:140px;height:140px;border-radius:var(--rounded);background:var(--elevation-2);"></div>
              <div class="mobile-square-title">Loading...</div>
            </div>
          </div>
        </div>

        <div class="home-section">
          <h2 class="mobile-section-title">Top Artists</h2>
          <div class="mobile-card-grid" id="home-artists-mobile"></div>
        </div>
      </div>
    </div>
  `;

  if (recentlyPlayed.length > 0) {
    _renderRecentlyPlayedDesktop(recentlyPlayed);
    _renderRecentlyPlayedMobile(recentlyPlayed);
  }

  _loadTrending();
  _loadTopArtists();
}

function _renderRecentlyPlayedDesktop(songs) {
  const carousel = document.getElementById('home-recent-carousel');
  if (!carousel) return;
  carousel.innerHTML = songs.map((song, idx) => {
    const artist = song.artists?.primary || song.artists?.singers || 'Unknown';
    const imgSrc = song.image || getPlaceholderImage();
    return `
      <div class="made-for-moment-card" data-recent-idx="${idx}">
        <img class="made-for-moment-img" src="${imgSrc}" alt="${escapeHtml(song.title || '')}" onerror="this.src='${getPlaceholderImage()}'" />
        <div class="made-for-moment-info">
          <span class="made-for-moment-title">${escapeHtml(song.title || 'Unknown')}</span>
          <span class="made-for-moment-subtitle">${escapeHtml(artist)}</span>
        </div>
      </div>
    `;
  }).join('');

  carousel.querySelectorAll('[data-recent-idx]').forEach(card => {
    card.addEventListener('click', () => {
      const idx = parseInt(card.dataset.recentIdx);
      const song = songs[idx];
      if (song) player.playSong(song, true);
    });
  });
}

function _renderRecentlyPlayedMobile(songs) {
  const list = document.getElementById('home-recent-mobile');
  if (!list) return;
  list.innerHTML = songs.map((song, idx) => {
    const artist = song.artists?.primary || song.artists?.singers || 'Unknown';
    const imgSrc = song.image || getPlaceholderImage();
    return `
      <div class="mobile-list-item" data-recent-m-idx="${idx}">
        <img class="mobile-list-img" src="${imgSrc}" alt="" onerror="this.src='${getPlaceholderImage()}'" />
        <div class="mobile-list-info">
          <span class="mobile-list-title">${escapeHtml(song.title || 'Unknown')}</span>
          <span class="mobile-list-subtitle">${escapeHtml(artist)}</span>
        </div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('[data-recent-m-idx]').forEach(item => {
    item.addEventListener('click', () => {
      const idx = parseInt(item.dataset.recentMIdx);
      const song = songs[idx];
      if (song) player.playSong(song, true);
    });
  });
}

async function _loadTrending() {
  try {
    const trending = await getTrending();
    const allSongs = trending.flatMap(cat => cat.songs || []);
    if (allSongs.length === 0) return;

    _renderTrendingDesktop(allSongs.slice(0, 10));
    _renderTrendingMobile(allSongs.slice(0, 6));
  } catch (err) {
    console.error('[Home] Failed to load trending:', err);
  }
}

function _renderTrendingDesktop(songs) {
  const carousel = document.getElementById('home-trending-carousel');
  if (!carousel) return;
  carousel.innerHTML = songs.map((song, idx) => {
    const artist = song.artists?.primary || song.artists?.singers || 'Unknown';
    const imgSrc = song.image || getPlaceholderImage();
    return `
      <div class="made-for-moment-card" data-trend-idx="${idx}">
        <img class="made-for-moment-img" src="${imgSrc}" alt="${escapeHtml(song.title || '')}" onerror="this.src='${getPlaceholderImage()}'" />
        <div class="made-for-moment-info">
          <span class="made-for-moment-title">${escapeHtml(song.title || 'Unknown')}</span>
          <span class="made-for-moment-subtitle">${escapeHtml(artist)}</span>
        </div>
      </div>
    `;
  }).join('');

  carousel.querySelectorAll('[data-trend-idx]').forEach(card => {
    card.addEventListener('click', () => {
      const idx = parseInt(card.dataset.trendIdx);
      player.playSongList(songs, idx);
    });
  });
}

function _renderTrendingMobile(songs) {
  const grid = document.getElementById('home-trending-mobile');
  if (!grid) return;
  grid.innerHTML = songs.map((song, idx) => {
    const artist = song.artists?.primary || song.artists?.singers || 'Unknown';
    const imgSrc = song.image || getPlaceholderImage();
    return `
      <div class="mobile-square-card" data-trend-m-idx="${idx}">
        <img class="mobile-square-img" src="${imgSrc}" alt="" onerror="this.src='${getPlaceholderImage()}'" />
        <div class="mobile-square-title">${escapeHtml(song.title || 'Unknown')}</div>
        <div class="mobile-square-subtitle">${escapeHtml(artist)}</div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('[data-trend-m-idx]').forEach(card => {
    card.addEventListener('click', () => {
      const idx = parseInt(card.dataset.trendMIdx);
      player.playSongList(songs, idx);
    });
  });
}

async function _loadTopArtists() {
  try {
    const artists = await getTopArtists();
    if (artists.length === 0) return;

    _renderArtistsDesktop(artists);
    _renderArtistsMobile(artists);
  } catch (err) {
    console.error('[Home] Failed to load top artists:', err);
  }
}

function _renderArtistsDesktop(artists) {
  const carousel = document.getElementById('home-artists-carousel');
  if (!carousel) return;
  carousel.innerHTML = artists.map((artist, idx) => {
    const imgSrc = artist.image || getPlaceholderImage();
    return `
      <div class="rotation-card artist" data-artist-idx="${idx}">
        <div class="rotation-img-wrapper">
          <img class="rotation-img" src="${imgSrc}" alt="${escapeHtml(artist.name || '')}" onerror="this.src='${getPlaceholderImage()}'" />
        </div>
        <div class="rotation-info">
          <span class="rotation-title">${escapeHtml(artist.name || 'Unknown')}</span>
          <span class="rotation-subtitle">Artist</span>
        </div>
      </div>
    `;
  }).join('');

  carousel.querySelectorAll('[data-artist-idx]').forEach(card => {
    card.addEventListener('click', async () => {
      const idx = parseInt(card.dataset.artistIdx);
      const artist = artists[idx];
      if (!artist) return;
      try {
        const { searchSongs } = await import('../services/api.js');
        const songs = await searchSongs(artist.name, 10);
        if (songs.length > 0) {
          player.playSongList(songs, 0);
        }
      } catch (err) {
        console.error('[Home] Failed to load artist songs:', err);
      }
    });
  });
}

function _renderArtistsMobile(artists) {
  const grid = document.getElementById('home-artists-mobile');
  if (!grid) return;
  grid.innerHTML = artists.slice(0, 6).map((artist, idx) => {
    const imgSrc = artist.image || getPlaceholderImage();
    return `
      <div class="rotation-card artist" data-artist-m-idx="${idx}" style="min-width:140px;max-width:140px;">
        <div class="rotation-img-wrapper">
          <img class="rotation-img" src="${imgSrc}" alt="${escapeHtml(artist.name || '')}" onerror="this.src='${getPlaceholderImage()}'" />
        </div>
        <div class="rotation-info">
          <span class="rotation-title">${escapeHtml(artist.name || 'Unknown')}</span>
          <span class="rotation-subtitle">Artist</span>
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('[data-artist-m-idx]').forEach(card => {
    card.addEventListener('click', async () => {
      const idx = parseInt(card.dataset.artistMIdx);
      const artist = artists[idx];
      if (!artist) return;
      try {
        const { searchSongs } = await import('../services/api.js');
        const songs = await searchSongs(artist.name, 10);
        if (songs.length > 0) {
          player.playSongList(songs, 0);
        }
      } catch (err) {
        console.error('[Home] Failed to load artist songs:', err);
      }
    });
  });
}
