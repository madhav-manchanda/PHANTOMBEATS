import { icons } from '../utils/helpers.js';
import player from '../services/playerEngine.js';

export function renderPhantomMode(container) {
  let phantomPanel = document.getElementById('phantom-mode-panel');
  
  if (phantomPanel) {
    phantomPanel.classList.toggle('hidden');
    return;
  }

  phantomPanel = document.createElement('div');
  phantomPanel.id = 'phantom-mode-panel';
  phantomPanel.className = 'phantom-panel hidden';
  phantomPanel.innerHTML = `
    <div class="phantom-header">
      ${icons.ghost} PHANTOM MODE
      <button id="phantom-close" class="phantom-close-btn">${icons.x}</button>
    </div>
    
    <div class="phantom-control-group">
      <div class="phantom-label">
        <span>Speed</span>
        <span id="speed-val">1.00x</span>
      </div>
      <input type="range" id="speed-slider" min="0.5" max="2.0" step="0.05" value="1.0" />
      <div class="phantom-chips">
        <button class="phantom-chip" data-speed="0.5">Ultra Slow</button>
        <button class="phantom-chip" data-speed="0.75">Slowed</button>
        <button class="phantom-chip" data-speed="1.0">Normal</button>
        <button class="phantom-chip" data-speed="1.25">Fast</button>
      </div>
    </div>



    <div class="phantom-control-group">
      <div class="phantom-label">
        <span>Pitch (Semitones)</span>
        <span id="pitch-val">Standard</span>
      </div>
      <input type="range" id="pitch-slider" min="-12" max="12" step="1" value="0" />
    </div>

    <div class="phantom-control-group">
      <div class="phantom-label">
        <span>Bass Boost</span>
        <span id="bass-val">0%</span>
      </div>
      <input type="range" id="bass-slider" min="0" max="100" step="1" value="0" />
    </div>

    <div class="phantom-presets">
      <div class="phantom-label">Presets:</div>
      <div class="preset-chips" id="preset-chips-container">
        <!-- presets loaded here -->
      </div>
      <div class="save-preset-row">
        <input type="text" id="preset-name" placeholder="Preset name..." />
        <button id="save-preset-btn">+ Save</button>
        <button id="reset-phantom-btn" style="margin-left: 8px; background: var(--bg-hover); color: var(--text-primary);">Reset</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(phantomPanel);

  setTimeout(() => {
    phantomPanel.classList.remove('hidden');
  }, 10);

  const speedSlider = phantomPanel.querySelector('#speed-slider');
  const speedVal = phantomPanel.querySelector('#speed-val');
  const pitchSlider = phantomPanel.querySelector('#pitch-slider');
  const pitchVal = phantomPanel.querySelector('#pitch-val');
  const bassSlider = phantomPanel.querySelector('#bass-slider');
  const bassVal = phantomPanel.querySelector('#bass-val');
  const chipsContainer = phantomPanel.querySelector('#preset-chips-container');
  const presetNameInput = phantomPanel.querySelector('#preset-name');
  const savePresetBtn = phantomPanel.querySelector('#save-preset-btn');
  const resetBtn = phantomPanel.querySelector('#reset-phantom-btn');
  const closeBtn = phantomPanel.querySelector('#phantom-close');

  closeBtn.addEventListener('click', () => {
    phantomPanel.classList.add('hidden');
  });

  const updateEngine = () => {
    player.setPhantomMode(parseFloat(speedSlider.value), parseFloat(bassSlider.value), parseFloat(pitchSlider.value));
  };

  speedSlider.addEventListener('input', (e) => {
    speedVal.textContent = parseFloat(e.target.value).toFixed(2) + 'x';
    updateEngine();
  });

  pitchSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    pitchVal.textContent = val === 0 ? 'Standard' : (val > 0 ? `+${val}` : `${val}`);
    updateEngine();
  });

  bassSlider.addEventListener('input', (e) => {
    bassVal.textContent = e.target.value + '%';
    updateEngine();
  });

  resetBtn.addEventListener('click', () => {
    speedSlider.value = 1.0;
    speedVal.textContent = '1.00x';
    pitchSlider.value = 0;
    pitchVal.textContent = 'Standard';
    bassSlider.value = 0;
    bassVal.textContent = '0%';
    updateEngine();
  });

  phantomPanel.querySelectorAll('.phantom-chip').forEach(btn => {
    btn.addEventListener('click', (e) => {
      speedSlider.value = e.target.dataset.speed;
      speedVal.textContent = parseFloat(speedSlider.value).toFixed(2) + 'x';
      updateEngine();
    });
  });

  const loadPresets = () => {
    const presets = JSON.parse(localStorage.getItem('phantom_presets') || '[]');
    chipsContainer.innerHTML = presets.map(p => 
      `<button class="preset-chip" data-speed="${p.speed}" data-bass="${p.bass}" data-pitch="${p.pitch || 0}">${p.name}</button>`
    ).join('');

    chipsContainer.querySelectorAll('.preset-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        speedSlider.value = e.target.dataset.speed;
        bassSlider.value = e.target.dataset.bass;
        pitchSlider.value = e.target.dataset.pitch || 0;
        
        speedVal.textContent = parseFloat(speedSlider.value).toFixed(2) + 'x';
        bassVal.textContent = bassSlider.value + '%';
        const pVal = parseInt(pitchSlider.value);
        pitchVal.textContent = pVal === 0 ? 'Standard' : (pVal > 0 ? `+${pVal}` : `${pVal}`);
        
        updateEngine();
      });
    });
  };

  savePresetBtn.addEventListener('click', () => {
    const name = presetNameInput.value.trim();
    if (!name) return;
    const presets = JSON.parse(localStorage.getItem('phantom_presets') || '[]');
    presets.push({ name, speed: speedSlider.value, bass: bassSlider.value, pitch: pitchSlider.value });
    localStorage.setItem('phantom_presets', JSON.stringify(presets));
    presetNameInput.value = '';
    loadPresets();
  });

  loadPresets();
}
