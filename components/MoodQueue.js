import * as api from '../services/api.js';
import { icons } from '../utils/helpers.js';
import player from '../services/playerEngine.js';
import { showToast } from '../utils/animations.js';
import * as storage from '../services/storage.js';

const moods = [
  { id: 'late_night', icon: icons.moon, name: 'Late Night', desc: 'Slow & chill', keywords: 'slowed reverb songs' },
  { id: 'hype', icon: icons.zap, name: 'Hype', desc: 'High energy', keywords: 'hype songs bass boost' },
  { id: 'sad_boi', icon: icons.heartCrack, name: 'Sad Boi', desc: 'Emotional', keywords: 'sad emotional songs' },
  { id: 'party', icon: icons.partyMusic, name: 'Party', desc: 'Bangers', keywords: 'party mashup bangers' },
];

export function renderMoodQueue(container) {
  container.innerHTML = `
    <div class="section-header">
      <h2 class="section-title">Mood Queue</h2>
    </div>
    <div class="mood-grid">
      ${moods.map(m => `
        <div class="mood-tile" data-mood="${m.id}" data-keywords="${m.keywords}">
          <div class="mood-icon">${m.icon}</div>
          <div class="mood-name">${m.name}</div>
          <div class="mood-desc">${m.desc}</div>
        </div>
      `).join('')}
    </div>
  `;

  container.querySelectorAll('.mood-tile').forEach(tile => {
    tile.addEventListener('click', async () => {
      const moodId = tile.dataset.mood;
      const keywords = tile.dataset.keywords;
      const moodName = moods.find(m => m.id === moodId)?.name || 'Mood';
      
      const toastContainer = document.getElementById('toast-container');
      showToast(toastContainer, `Generating ${moodName} Queue...`);
      
      // Attempt to build from history first
      const history = JSON.parse(localStorage.getItem('phantom_stats_history') || '[]');
      let matches = [];
      
      if (moodId === 'late_night') {
        matches = history.filter(h => {
          return h.hourOfDay >= 22 || h.hourOfDay <= 4 || /slowed|lofi|chill/i.test(h.title);
        });
      } else if (moodId === 'hype') {
        matches = history.filter(h => {
          return (h.hourOfDay >= 6 && h.hourOfDay <= 10) || /remix|bass|hype/i.test(h.title);
        });
      } else if (moodId === 'sad_boi') {
        matches = history.filter(h => /sad|emotional|heartbreak/i.test(h.title));
      } else if (moodId === 'party') {
        matches = history.filter(h => /party|mashup|dj|dance/i.test(h.title));
      }

      let songsToPlay = [];
      
      // Need real full song objects from API or storage to play, history might just be basic info
      // But if we have < 5, just call search API
      if (matches.length < 5) {
        try {
          const results = await api.searchSongs(keywords);
          if (results && results.length > 0) {
            songsToPlay = results.slice(0, 20);
          }
        } catch(e) {
          console.error(e);
        }
      } else {
        // Find full song objects in history? We don't have them, we have to search anyway or use liked/recently played.
        // For simplicity and guaranteed playback, always fallback to search if we can't find full objects.
        const recent = storage.getRecentlyPlayed();
        songsToPlay = recent.filter(r => matches.some(m => m.songId === r.id));
        if (songsToPlay.length < 5) {
          const results = await api.searchSongs(keywords);
          if (results && results.length > 0) {
            songsToPlay = results.slice(0, 20);
          }
        }
      }
      
      if (songsToPlay.length > 0) {
        player.playSongList(songsToPlay, 0);
        showToast(toastContainer, `Now playing: ${moodName} Mood`);
      } else {
        showToast(toastContainer, `Could not find songs for ${moodName}`);
      }
    });
  });
}
