import { icons, formatDuration, getPlaceholderImage } from '../utils/helpers.js';

export function getTrackRowHTML(song, index = null) {
  const imgSrc = (song.image && !song.isLocal) ? song.image : getPlaceholderImage();
  const artist = song.artists?.primary || song.artists?.singers || 'Unknown Artist';
  const duration = song.duration ? formatDuration(song.duration) : '--:--';
  
  return `
    <div class="track-row" data-song-id="${song.id}">
      ${index !== null ? `<div class="track-row-index">${index}</div>` : ''}
      <img class="track-row-img" src="${imgSrc}" alt="" loading="lazy" />
      <div class="track-row-info">
        <div class="track-row-title">${song.title}</div>
        <div class="track-row-artist">${artist}</div>
      </div>
      <div class="track-row-duration">${duration}</div>
    </div>
  `;
}

export function getTrackCardHTML(song) {
  const imgSrc = (song.image && !song.isLocal) ? song.image : getPlaceholderImage();
  const artist = song.artists?.primary || song.artists?.singers || 'Unknown Artist';
  
  return `
    <div class="track-card" data-song-id="${song.id}">
      <img class="track-card-img" src="${imgSrc}" alt="" loading="lazy" />
      <div class="track-card-title">${song.title}</div>
      <div class="track-card-artist">${artist}</div>
    </div>
  `;
}

export function getPlaylistCardHTML(playlist) {
  const imgSrc = playlist.image || getPlaceholderImage();
  return `
    <div class="playlist-card" data-playlist-id="${playlist.id}">
      <img class="playlist-card-img" src="${imgSrc}" alt="" loading="lazy" />
      <div class="playlist-card-title">${playlist.name || playlist.title}</div>
      <div class="playlist-card-subtitle">${playlist.subtitle || 'Playlist'}</div>
    </div>
  `;
}

export function getGenreTileHTML(genre) {
  const gradient = genre.gradient || 'linear-gradient(135deg, #121212 0%, #1a1a1a 100%)';
  return `
    <div class="genre-tile" style="background: ${gradient};" data-genre-id="${genre.id}">
      <div class="genre-tile-label">${genre.name}</div>
    </div>
  `;
}

export function getSearchBarHTML() {
  return `
    <div class="search-bar-container">
      ${icons.search}
      <input type="text" class="search-bar-input" id="global-search-input" placeholder="What do you want to listen to? (Press '/' to focus)" />
      <button class="search-bar-explore" id="global-search-explore">Explore</button>
    </div>
  `;
}
