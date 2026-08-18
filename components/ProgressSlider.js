export function getProgressSliderHTML(idPrefix) {
  return `
    <div class="progress-slider-wrapper">
      <div class="progress-slider-track"></div>
      <div class="progress-slider-fill" id="${idPrefix}-progress-fill"></div>
      <div class="progress-slider-thumb" id="${idPrefix}-progress-thumb"></div>
      <input type="range" class="progress-slider-input" id="${idPrefix}-progress-input" min="0" max="1000" value="0" />
    </div>
  `;
}
