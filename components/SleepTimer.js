import { icons } from '../utils/helpers.js';
import player from '../services/playerEngine.js';

export function renderSleepTimer(container, buttonElement) {
  let timerPopup = document.getElementById('sleep-timer-popup');
  
  if (timerPopup) {
    timerPopup.classList.toggle('hidden');
    return;
  }

  timerPopup = document.createElement('div');
  timerPopup.id = 'sleep-timer-popup';
  timerPopup.className = 'popup-menu hidden';
  timerPopup.innerHTML = `
    <div class="popup-header">${icons.timerIcon} Sleep Timer</div>
    <div class="popup-options">
      <button class="popup-option" data-mins="5">5 min</button>
      <button class="popup-option" data-mins="10">10 min</button>
      <button class="popup-option" data-mins="15">15 min</button>
      <button class="popup-option" data-mins="30">30 min</button>
      <button class="popup-option" data-mins="45">45 min</button>
      <button class="popup-option" data-mins="60">60 min</button>
      <button class="popup-option" data-mins="end">End of song</button>
    </div>
    <button class="popup-cancel hidden" id="sleep-cancel-btn">Cancel Timer</button>
  `;
  
  document.body.appendChild(timerPopup);

  // Position popup above button
  const rect = buttonElement.getBoundingClientRect();
  timerPopup.style.position = 'fixed';
  timerPopup.style.left = `${rect.left - 75}px`;
  timerPopup.style.bottom = `${window.innerHeight - rect.top + 10}px`;

  timerPopup.classList.remove('hidden');

  timerPopup.querySelectorAll('.popup-option').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const mins = e.target.dataset.mins;
      if (mins === 'end') {
        const song = player.getCurrentSong();
        if (song) {
          const remaining = player.audio.duration - player.audio.currentTime;
          player.startSleepTimer(remaining / 60);
        }
      } else {
        player.startSleepTimer(parseInt(mins, 10));
      }
      timerPopup.classList.add('hidden');
    });
  });

  const cancelBtn = timerPopup.querySelector('#sleep-cancel-btn');
  cancelBtn.addEventListener('click', () => {
    player.cancelSleepTimer();
    timerPopup.classList.add('hidden');
  });

  player.on('sleeptimer', ({ active, remaining }) => {
    if (active) {
      cancelBtn.classList.remove('hidden');
      buttonElement.classList.add('active');
    } else {
      cancelBtn.classList.add('hidden');
      buttonElement.classList.remove('active');
      buttonElement.title = 'Sleep Timer';
    }
  });

  player.on('sleepupdate', ({ remaining }) => {
    if (remaining > 0) {
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      buttonElement.title = `Sleeping in ${mins}:${secs.toString().padStart(2, '0')}`;
    }
  });

  document.addEventListener('click', (e) => {
    if (!timerPopup.contains(e.target) && !buttonElement.contains(e.target)) {
      timerPopup.classList.add('hidden');
    }
  });
}
