export function mountGrowthChartPanel() {
  const mount = document.getElementById("growthChartPanelMount");
  if (!mount || mount.childElementCount) return;
  mount.innerHTML = `
    <section class="panel chart-panel" aria-labelledby="growthChartTitle">
      <div class="panel-topline">
        <div class="panel-heading">
          <h2 id="growthChartTitle" data-i18n="chart.title">Рост и питание Поршика</h2>
          <p data-i18n="chart.subtitle">Синий — вес, составные столбики — съеденное за день по приёмам.</p>
        </div>
        <div class="chart-actions">
          <button class="button button-blue" type="button" data-open-record="weight"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span data-i18n="action.addWeight">Добавить вес</span></button>
          <button class="button button-primary" type="button" data-open-record="feeding"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span data-i18n="action.addFeeding">Добавить питание</span></button>
          <a class="button button-secondary" href="/history"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 19V9M10 19V5M16 19v-7M22 19V3"/></svg><span data-i18n="action.history">История и таблица</span></a>
        </div>
      </div>
      <div class="chart-toolbar chart-toolbar-legend">
        <div class="chart-legend chart-toggle-legend" aria-label="Серии графика">
          <label class="legend-toggle"><input id="showGrowthWeight" type="checkbox" checked><i class="legend-mark" style="--mark: var(--blue)"></i><span data-i18n="chart.weightLegend">Вес, кг</span></label>
          <label class="legend-toggle"><input id="showGrowthActual" type="checkbox" checked><i class="legend-mark bar" style="--mark: var(--coral)"></i><span data-i18n="chart.actualDaily">Съедено за день</span></label>
          <label class="legend-toggle"><input id="showGrowthTarget" type="checkbox" checked><i class="legend-mark target" style="--mark: var(--coral)"></i><span data-i18n="chart.targetDaily">Дневная норма</span></label>
        </div>
        <div class="chart-date-range" data-chart-range="growth" aria-label="Диапазон дат графика">
          <span class="chart-date-range-label" data-chart-range-label="growth"></span>
          <div class="chart-date-range-track"><span class="chart-date-range-window" data-chart-range-window="growth" aria-hidden="true"></span><input type="range" data-chart-range-start="growth" aria-label="Начало периода"><input type="range" data-chart-range-end="growth" aria-label="Конец периода"></div>
        </div>
      </div>
      <div class="chart-wrap" id="growthChartWrap" data-empty-label="Добавьте первую запись, чтобы увидеть историю.">
        <canvas class="chart-canvas" id="growthChart" role="img" aria-label="График веса и фактического питания Поршика"></canvas>
        <div class="chart-hit-layer" id="growthChartHitLayer"></div>
        <div class="chart-tooltip" id="growthChartTooltip" role="tooltip" hidden></div>
        <div class="loading-overlay" id="chartLoading"><span class="loader" aria-label="Загрузка"></span></div>
      </div>
      <div class="error-banner" id="loadError" hidden><span data-i18n="error.load">Не удалось загрузить дневник.</span><button class="button button-small button-secondary" id="retryLoadButton" type="button" data-i18n="action.retry">Повторить</button></div>
    </section>`;
}
