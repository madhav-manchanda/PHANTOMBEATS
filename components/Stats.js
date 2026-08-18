import { formatDuration, icons, escapeHtml } from '../utils/helpers.js';

export function renderStats(container) {
  const history = JSON.parse(localStorage.getItem('phantom_stats_history') || '[]');
  
  // Section 1 - This Week
  let totalTime = 0;
  const artistCounts = {};
  const songCounts = {};
  
  history.forEach(h => {
    totalTime += (h.duration || 0);
    artistCounts[h.artist] = (artistCounts[h.artist] || 0) + 1;
    songCounts[h.title] = (songCounts[h.title] || 0) + 1;
  });

  const totalSongs = history.length;
  const topArtist = Object.entries(artistCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';
  const topSong = Object.entries(songCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';

  const mins = Math.floor(totalTime / 60);
  const hours = Math.floor(mins / 60);
  const timeStr = hours > 0 ? `${hours}h ${mins % 60}m` : `${mins}m`;

  // Section 2 - Pattern
  const hourCounts = new Array(24).fill(0);
  history.forEach(h => {
    if (h.hourOfDay >= 0 && h.hourOfDay <= 23) {
      hourCounts[h.hourOfDay]++;
    }
  });
  
  let peakHour = 0;
  let maxCount = 0;
  hourCounts.forEach((count, i) => {
    if (count > maxCount) {
      maxCount = count;
      peakHour = i;
    }
  });
  
  const peakAmPm = peakHour >= 12 ? (peakHour === 12 ? '12PM' : (peakHour-12) + 'PM') : (peakHour === 0 ? '12AM' : peakHour + 'AM');
  const maxBar = Math.max(...hourCounts, 1);
  
  // Section 3 - Personality Tag
  let personality = "Vibe Shifter";
  const lateNightCount = history.filter(h => h.hourOfDay >= 22 || h.hourOfDay <= 4).length;
  const slowedCount = history.filter(h => /slowed|lofi/i.test(h.title)).length;
  const shortCount = history.filter(h => h.duration < 120).length;
  
  if (slowedCount > history.length * 0.5) personality = "Night Owl";
  else if (lateNightCount > history.length * 0.5) personality = "Midnight Listener";
  else if (topArtist !== 'Unknown' && artistCounts[topArtist] > history.length * 0.6) personality = `Stan Mode: ${topArtist}`;
  else if (shortCount > history.length * 0.5) personality = "Snippet King";

  container.innerHTML = `
    <div class="stats-view">
      <div class="section-header">
        <h2 class="section-title">Phantom Stats</h2>
        <button id="save-stats-btn" class="btn btn-primary">Save as Image</button>
      </div>

      <div id="stats-card-capture" class="stats-card-capture">
        <div class="stats-header">${icons.ghost} PHANTOM BEATS</div>
        <hr/>
        <div class="stats-row">${icons.music} ${totalSongs} songs this week</div>
        <div class="stats-row">${icons.clock} ${timeStr} listened</div>
        <div class="stats-row">${icons.headphones} Top: ${topArtist}</div>
        <div class="stats-row">${icons.crown} ${personality}</div>
        <hr/>
        <div class="stats-footer">phantombeats.app</div>
      </div>

      <div class="stats-grid">
        <div class="stats-box">
          <h3>This Week</h3>
          <p>Total Time: <strong>${timeStr}</strong></p>
          <p>Total Songs: <strong>${totalSongs}</strong></p>
          <p>Top Artist: <strong>${escapeHtml(topArtist)}</strong></p>
          <p>Most Played: <strong>${escapeHtml(topSong)}</strong></p>
        </div>

        <div class="stats-box">
          <h3>Listening Pattern</h3>
          <p>You listen most at <strong>${peakAmPm}</strong> ${icons.moon}</p>
          <div class="stats-chart">
            ${hourCounts.map(count => `
              <div class="chart-bar" style="height: ${(count / maxBar) * 100}%" title="${count} songs"></div>
            `).join('')}
          </div>
        </div>

        <div class="stats-box personality-box">
          <h3>Your Music Personality</h3>
          <div class="personality-badge">${escapeHtml(personality)}</div>
        </div>
      </div>
    </div>
  `;

  container.querySelector('#save-stats-btn').addEventListener('click', async () => {
    // dynamically load html2canvas
    if (!window.html2canvas) {
      const script = document.createElement('script');
      script.src = 'https://html2canvas.hertzen.com/dist/html2canvas.min.js';
      document.head.appendChild(script);
      await new Promise(r => script.onload = r);
    }
    
    const card = container.querySelector('#stats-card-capture');
    card.classList.add('capturing'); // for styling during capture
    try {
      const canvas = await html2canvas(card, { backgroundColor: null });
      const imgData = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = imgData;
      a.download = 'PhantomStats.png';
      a.click();
    } catch(e) {
      console.error(e);
    }
    card.classList.remove('capturing');
  });
}
