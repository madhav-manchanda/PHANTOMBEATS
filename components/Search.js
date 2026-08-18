import { icons, getPlaceholderImage, formatDuration, debounce, escapeHtml } from '../utils/helpers.js';
import { staggerCards, staggerTracks, fadeIn } from '../utils/animations.js';
import * as api from '../services/api.js';
import player from '../services/playerEngine.js';

export function renderSearch(container, { onContextMenu, searchQuery }) {
  container.innerHTML = `
    <div class="search-view">
      <div class="search-empty" id="search-placeholder">
        <h2>Search for songs</h2>
        <p>Find your favorite tracks, artists, and albums</p>
      </div>
      <div id="search-results" style="display:none;">
        <div class="section-header">
          <h2 class="section-title" id="search-results-title">Results</h2>
        </div>
        <div id="search-results-grid" class="song-grid"></div>
        <div id="search-results-list" style="margin-top:16px;"></div>
      </div>
    </div>
  `;
  if (searchQuery) {
    _doSearch(searchQuery, container, onContextMenu);
  }
}

export async function handleSearch(query, container, onContextMenu) {
  if (!query || query.trim().length < 2) {
    const placeholder = container.querySelector('#search-placeholder');
    const results = container.querySelector('#search-results');
    if (placeholder) placeholder.style.display = '';
    if (results) results.style.display = 'none';
    return;
  }
  await _doSearch(query, container, onContextMenu);
}

async function _doSearch(query, container, onContextMenu) {
  const placeholder = container.querySelector('#search-placeholder');
  const resultsSection = container.querySelector('#search-results');
  const resultsGrid = container.querySelector('#search-results-grid');
  const resultsList = container.querySelector('#search-results-list');
  const title = container.querySelector('#search-results-title');

  if (!resultsGrid) return;
  if (placeholder) placeholder.style.display = 'none';
  resultsSection.style.display = '';
  title.textContent = `Searching for "${query}"...`;
  resultsGrid.innerHTML = '';
  resultsList.innerHTML = '';

  try {
    const songs = await api.searchSongs(query);

    title.textContent = `Results for "${query}"`;

    if (songs.length === 0) {
      resultsGrid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${icons.frown}</div><h3>No results found</h3><p>Try a different search term</p></div>`;
      return;
    }
    resultsGrid.innerHTML = songs
      .slice(0, 5)
      .map(
        (song) => `
      <div class="song-card" data-song-id="${song.id}" data-song='${JSON.stringify(song).replace(/'/g, '&#39;')}'>
        <div class="song-card-img-wrapper">
          <img class="song-card-img" src="${song.image || getPlaceholderImage()}" alt="${song.title}" onerror="this.src='${getPlaceholderImage()}'" />
          <button class="song-card-play" data-play-id="${song.id}">${icons.play}</button>
        </div>
        <div class="song-card-title" title="${escapeHtml(song.title)}">${escapeHtml(song.title)}</div>
        <div class="song-card-artist">${escapeHtml(song.artists?.primary || song.artists?.singers || 'Unknown')}</div>
      </div>
    `
      )
      .join('');
    resultsList.innerHTML = songs
      .map(
        (song, i) => `
      <div class="track-row" data-song-id="${song.id}" data-song='${JSON.stringify(song).replace(/'/g, '&#39;')}'>
        <span class="track-row-number">${i + 1}</span>
        <img class="track-row-img" src="${song.image || getPlaceholderImage()}" alt="" onerror="this.src='${getPlaceholderImage()}'" />
        <div class="track-row-info">
          <div class="track-row-title">${escapeHtml(song.title)}</div>
          <div class="track-row-artist">${escapeHtml(song.artists?.primary || song.artists?.singers || 'Unknown')}</div>
        </div>
        <span class="track-row-album">${escapeHtml(song.album || '')}</span>
        <span class="track-row-duration">${formatDuration(song.duration)}</span>
        <div class="track-row-actions">
          <button class="track-more-btn" data-song='${JSON.stringify(song).replace(/'/g, '&#39;')}'>${icons.moreVertical}</button>
        </div>
      </div>
    `
      )
      .join('');
    resultsGrid.querySelectorAll('.song-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.song-card-play')) return;
        const song = JSON.parse(card.dataset.song);
        player.playSong(song);
      });
    });

    resultsGrid.querySelectorAll('.song-card-play').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const songId = btn.dataset.playId;
        const card = btn.closest('.song-card');
        const song = JSON.parse(card.dataset.song);
        player.playSong(song);
      });
    });

    resultsList.querySelectorAll('.track-row').forEach((row) => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.track-more-btn')) return;
        const song = JSON.parse(row.dataset.song);
        player.playSong(song);
      });
    });

    resultsList.querySelectorAll('.track-more-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const song = JSON.parse(btn.dataset.song);
        if (onContextMenu) onContextMenu(e, song);
      });
    });

    staggerCards('.song-card');
    staggerTracks('.track-row');
  } catch (error) {
    title.textContent = 'Search Failed';
    resultsGrid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${icons.alertTriangle}</div><h3>Error</h3><p>${error.message}</p></div>`;
  }
}
