import {
  DEFAULT_FEEDING_NORMS,
  DOG_PROFILE,
  actualDailyGrams,
  actualMealCount,
  addDays,
  ageOn,
  feedingPlanForDate,
  formatAge,
  intakeDifferencePercent,
  intakeRatioFor,
  isDailyIntakeComplete,
  latestWeightRecord,
  recommendationFor,
  sortDailyRecords,
  todayInTimezone
} from "./domain.mjs";
import { mountGrowthChartPanel } from "./growth-chart-panel.mjs";
import { calculateExpenseMetrics } from "./expense-metrics.mjs";

const page = document.body.dataset.page || "dashboard";
const today = todayInTimezone();
const CHART_DATE_RANGES_STORAGE_KEY = "porschik_chart_date_ranges";
const PAGE_SCROLL_STORAGE_KEY = `porschik_page_scroll:${location.pathname}`;
const DAY_MS = 86_400_000;
const chartRangeEndResetPending = new Set(["growth", "norm", "expense"]);
let chartRangeSaveTimer = null;
let chartRangeDrag = null;
let pendingScrollRestore = null;

function savePageScrollPosition() {
  try {
    sessionStorage.setItem(PAGE_SCROLL_STORAGE_KEY, JSON.stringify({ x: scrollX, y: scrollY }));
  } catch {
    // Scroll restoration is a convenience and must not affect the diary.
  }
}

function pageWasReloaded() {
  return performance.getEntriesByType("navigation")[0]?.type === "reload";
}

function restorePageScrollPosition() {
  if (!pageWasReloaded() || pendingScrollRestore) return;
  try {
    const saved = JSON.parse(sessionStorage.getItem(PAGE_SCROLL_STORAGE_KEY) || "null");
    if (!Number.isFinite(saved?.x) || !Number.isFinite(saved?.y)) return;
    pendingScrollRestore = saved;
    const restore = () => scrollTo({ left: saved.x, top: saved.y, behavior: "instant" });
    requestAnimationFrame(() => requestAnimationFrame(restore));
    setTimeout(restore, 160);
  } catch {
    // A blocked storage policy should keep the browser's normal scroll behavior.
  }
}

if ("scrollRestoration" in history) history.scrollRestoration = "manual";
addEventListener("pagehide", savePageScrollPosition);
addEventListener("beforeunload", savePageScrollPosition);

const state = {
  records: [],
  expenses: [],
  storageReady: false,
  loading: true,
  lang: readCookie("porschik_lang") === "en" ? "en" : "ru",
  theme: readCookie("porschik_theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
  authenticated: false,
  isAdmin: false,
  userEmail: "",
  googleClientId: "",
  loginReady: false,
  activeRecordTab: "weight",
  editingOriginalDate: "",
  pendingRecordAction: null,
  growthQuickAddOpen: false,
  pendingSetting: null,
  avatarUrl: "/assets/porschik.jpg",
  feedingSettings: {
    feedingNorms: DEFAULT_FEEDING_NORMS.map((item) => ({ ...item })),
    mealCountChanges: []
  },
  backupBusy: false,
  pendingBackupRestore: null,
  inlineEditor: null,
  inlineSaving: false,
  historyDraft: null,
  normEditor: null,
  normSaving: false,
  expenseEditor: null,
  expenseSaving: false,
  showGrowthWeight: true,
  showGrowthActual: true,
  showGrowthTarget: true,
  showNormTarget: true,
  showNormActual: true,
  showExpenseFood: true,
  showExpenseDelivery: true,
  showExpensePriceKg: true,
  expenseProjectionInfoOpen: false,
  chartDateRanges: readChartDateRanges()
};

function readChartDateRanges() {
  try {
    const saved = JSON.parse(localStorage.getItem(CHART_DATE_RANGES_STORAGE_KEY) || "{}");
    return saved && typeof saved === "object" ? saved : {};
  } catch {
    return {};
  }
}

function persistChartDateRanges() {
  try {
    localStorage.setItem(CHART_DATE_RANGES_STORAGE_KEY, JSON.stringify(state.chartDateRanges));
  } catch {
    // A private-browser policy must not prevent chart interaction.
  }
}

function chartDateAtOffset(minDate, offset) {
  return new Date(Date.parse(`${minDate}T00:00:00Z`) + offset * DAY_MS).toISOString().slice(0, 10);
}

function dateSixMonthsLater(isoDate) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 6;
  const targetYear = year + Math.floor(month / 12);
  const targetMonth = month % 12;
  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(targetYear, targetMonth, Math.min(date.getUTCDate(), lastDayOfTargetMonth)));
}

function formatChartDateRange(startDate, endDate) {
  const endTime = Date.parse(`${endDate}T00:00:00Z`);
  const showYear = endTime > dateSixMonthsLater(startDate).getTime();
  const options = showYear
    ? { day: "2-digit", month: "short", year: "numeric" }
    : { day: "2-digit", month: "short" };
  return `${formatDate(startDate, options)} — ${formatDate(endDate, options)}`;
}

function chartDateRange(key, minDate, maxDate, { ensureEndDate = "" } = {}) {
  if (!document.querySelector(`[data-chart-range="${key}"]`)) return { startDate: minDate, endDate: maxDate };
  const saved = state.chartDateRanges[key] || {};
  const startDate = saved.startDate >= minDate && saved.startDate <= maxDate ? saved.startDate : minDate;
  const savedEndDate = saved.endDate >= minDate && saved.endDate <= maxDate ? saved.endDate : maxDate;
  // Reset the right edge exactly once after a full page load. Subsequent redraws
  // must respect the user's thumb position until the next reload.
  const resetEndDate = ensureEndDate >= minDate && ensureEndDate <= maxDate ? ensureEndDate : "";
  const shouldResetEnd = Boolean(resetEndDate) && chartRangeEndResetPending.has(key);
  const endDate = shouldResetEnd ? resetEndDate : savedEndDate;
  const adjustedStartDate = shouldResetEnd && startDate > endDate ? minDate : startDate;
  const range = adjustedStartDate <= endDate ? { startDate: adjustedStartDate, endDate } : { startDate: minDate, endDate: maxDate };
  if (shouldResetEnd) chartRangeEndResetPending.delete(key);
  state.chartDateRanges[key] = range;
  syncChartDateRangeControl(key, minDate, maxDate, range);
  return range;
}

function snapChartRangeEndToActualData(key, endDate) {
  if (!endDate) return;
  const saved = state.chartDateRanges[key] || {};
  state.chartDateRanges[key] = {
    startDate: saved.startDate && saved.startDate <= endDate ? saved.startDate : endDate,
    endDate
  };
}

function snapDailyChartRangesToActualData() {
  const latestActualDate = state.records
    .filter((record) => Number.isFinite(record.weightKg) || record.meals.some((meal) => Number.isFinite(meal.grams)))
    .at(-1)?.date || "";
  snapChartRangeEndToActualData("growth", latestActualDate);
  snapChartRangeEndToActualData("norm", latestActualDate);
  persistChartDateRanges();
}

function snapExpenseChartRangeToActualData() {
  snapChartRangeEndToActualData("expense", state.expenses.at(-1)?.date || "");
  persistChartDateRanges();
}

function syncChartDateRangeControl(key, minDate, maxDate, range) {
  const control = document.querySelector(`[data-chart-range="${key}"]`);
  if (!control) return;
  const start = control.querySelector(`[data-chart-range-start="${key}"]`);
  const end = control.querySelector(`[data-chart-range-end="${key}"]`);
  const label = control.querySelector(`[data-chart-range-label="${key}"]`);
  const days = Math.max(0, Math.round((Date.parse(`${maxDate}T00:00:00Z`) - Date.parse(`${minDate}T00:00:00Z`)) / DAY_MS));
  const startOffset = Math.round((Date.parse(`${range.startDate}T00:00:00Z`) - Date.parse(`${minDate}T00:00:00Z`)) / DAY_MS);
  const endOffset = Math.round((Date.parse(`${range.endDate}T00:00:00Z`) - Date.parse(`${minDate}T00:00:00Z`)) / DAY_MS);
  control.dataset.minDate = minDate;
  control.dataset.maxDate = maxDate;
  [start, end].forEach((input) => {
    input.min = "0";
    input.max = String(days);
    input.step = "1";
    input.disabled = days === 0;
  });
  start.value = String(startOffset);
  end.value = String(endOffset);
  control.style.setProperty("--range-start", `${days ? startOffset / days * 100 : 0}%`);
  control.style.setProperty("--range-end", `${days ? endOffset / days * 100 : 100}%`);
  control.classList.toggle("is-range-movable", days > 0 && endOffset - startOffset < days);
  if (label) label.textContent = formatChartDateRange(range.startDate, range.endDate);
}

function setChartDateRangeUnavailable(key) {
  const control = document.querySelector(`[data-chart-range="${key}"]`);
  if (!control) return;
  control.removeAttribute("data-min-date");
  control.removeAttribute("data-max-date");
  control.classList.remove("is-range-movable", "is-range-dragging");
  control.querySelectorAll("input").forEach((input) => {
    input.min = "0";
    input.max = "0";
    input.value = "0";
    input.disabled = true;
  });
  const label = control.querySelector(`[data-chart-range-label="${key}"]`);
  if (label) label.textContent = state.lang === "ru" ? "Нет дат для отображения" : "No dates to display";
}

function updateChartRangeFromInputs(key, persist = false) {
  const control = document.querySelector(`[data-chart-range="${key}"]`);
  const minDate = control?.dataset.minDate;
  const maxDate = control?.dataset.maxDate;
  if (!control || !minDate || !maxDate) return;
  const startInput = control.querySelector(`[data-chart-range-start="${key}"]`);
  const endInput = control.querySelector(`[data-chart-range-end="${key}"]`);
  let startOffset = Number(startInput.value);
  let endOffset = Number(endInput.value);
  if (startOffset > endOffset) {
    if (document.activeElement === startInput) endOffset = startOffset;
    else startOffset = endOffset;
  }
  state.chartDateRanges[key] = {
    startDate: chartDateAtOffset(minDate, startOffset),
    endDate: chartDateAtOffset(minDate, endOffset)
  };
  const redraw = { growth: () => growthChart?.draw(), norm: drawNormChart, expense: drawExpenseChart }[key];
  redraw?.();
  if (persist) persistChartDateRanges();
  else {
    clearTimeout(chartRangeSaveTimer);
    chartRangeSaveTimer = setTimeout(persistChartDateRanges, 350);
  }
}

function wireChartRangeWindow(rangeWindow) {
  const key = rangeWindow.dataset.chartRangeWindow;
  const control = rangeWindow.closest(`[data-chart-range="${key}"]`);
  const track = rangeWindow.closest(".chart-date-range-track");
  const startInput = control?.querySelector(`[data-chart-range-start="${key}"]`);
  const endInput = control?.querySelector(`[data-chart-range-end="${key}"]`);
  if (!control || !track || !startInput || !endInput) return;

  rangeWindow.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || !control.classList.contains("is-range-movable")) return;
    const days = Number(startInput.max);
    const startOffset = Number(startInput.value);
    const endOffset = Number(endInput.value);
    const trackWidth = track.getBoundingClientRect().width;
    if (!days || !trackWidth || endOffset <= startOffset) return;
    chartRangeDrag = {
      key,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startOffset,
      endOffset,
      days,
      trackWidth
    };
    control.classList.add("is-range-dragging");
    try { rangeWindow.setPointerCapture?.(event.pointerId); } catch {}
    event.preventDefault();
  });

  rangeWindow.addEventListener("pointermove", (event) => {
    if (!chartRangeDrag || chartRangeDrag.key !== key || chartRangeDrag.pointerId !== event.pointerId) return;
    const desiredDelta = Math.round((event.clientX - chartRangeDrag.startClientX) / chartRangeDrag.trackWidth * chartRangeDrag.days);
    const delta = Math.max(-chartRangeDrag.startOffset, Math.min(chartRangeDrag.days - chartRangeDrag.endOffset, desiredDelta));
    startInput.value = String(chartRangeDrag.startOffset + delta);
    endInput.value = String(chartRangeDrag.endOffset + delta);
    updateChartRangeFromInputs(key);
    event.preventDefault();
  });

  const finishDrag = (event) => {
    if (!chartRangeDrag || chartRangeDrag.key !== key || chartRangeDrag.pointerId !== event.pointerId) return;
    try { rangeWindow.releasePointerCapture?.(event.pointerId); } catch {}
    control.classList.remove("is-range-dragging");
    chartRangeDrag = null;
    updateChartRangeFromInputs(key, true);
  };
  rangeWindow.addEventListener("pointerup", finishDrag);
  rangeWindow.addEventListener("pointercancel", finishDrag);
}

const translations = {
  ru: {
    "brand.kicker": "Дневник роста",
    "brand.title": "Поршик",
    "brand.breed": "Вельш-корги пемброк",
    "dashboard.eyebrow": "Главное сегодня",
    "dashboard.title": "Как растёт и ест Поршик",
    "dashboard.subtitle": "Вес, фактические порции и актуальная BARF-норма — на одной временной шкале.",
    "stats.weight": "Последний вес",
    "stats.change": "Динамика за 30 дней",
    "stats.changeNote": "по сохранённым измерениям",
    "stats.meal": "Порция сейчас",
    "chart.title": "Рост и питание Поршика",
    "chart.subtitle": "Синий — вес, составные столбики — съеденное за день по приёмам.",
    "chart.historySubtitle": "Нажмите точку, чтобы отредактировать её данные.",
    "chart.weightSeries": "Вес",
    "chart.foodSeries": "Питание",
    "chart.weightLegend": "Вес, кг",
    "chart.weightLevel": "Вес",
    "chart.foodLevel": "Питание и дневная норма",
    "chart.actualDaily": "Съедено за день",
    "chart.targetDaily": "Дневная норма",
    "chart.meal1": "Приём 1",
    "chart.meal2": "Приём 2",
    "chart.meal3": "Приём 3",
    "chart.leftAxis": "Вес, кг",
    "chart.rightAxis": "За день, г",
    "chart.recommended": "Норма за день",
    "action.addWeight": "Добавить вес",
    "action.addFeeding": "Добавить питание",
    "action.addRecord": "Новая запись",
    "action.discardDraft": "Убрать черновик",
    "action.addWeightShort": "+ Вес",
    "action.addFeedingShort": "+ Питание",
    "action.history": "История и таблица",
    "action.retry": "Повторить",
    "action.back": "На главную",
    "action.editWeight": "Вес",
    "action.editFeeding": "Питание",
    "action.delete": "Удалить",
    "action.save": "Сохранить",
    "action.cancel": "Отмена",
    "action.theme": "Переключить тему",
    "action.refresh": "Обновить страницу",
    "action.login": "Войти",
    "action.logout": "Выйти",
    "action.admin": "Администрирование",
    "action.changePhoto": "Изменить фотографию Поршика",
    "action.editFeedingSettings": "Изменить историю норм",
    "action.edit": "Изменить",
    "action.deleteWeight": "Удалить вес",
    "replace.title": "Запись за этот день уже есть",
    "replace.before": "Было",
    "replace.after": "Станет",
    "replace.confirm": "Заменить значение",
    "replace.introWeight": "За {date} уже сохранены данные. Проверьте изменение веса перед заменой.",
    "replace.introFeeding": "За {date} уже сохранены данные. Проверьте новые приёмы пищи перед заменой.",
    "replace.keepFeeding": "Вес будет заменён; питание за этот день останется без изменений.",
    "replace.keepWeight": "Питание будет заменено; вес за этот день останется без изменений.",
    "settings.reset": "Вернуть план до взросления",
    "settings.saved": "История норм сохранена.",
    "settings.error": "Не удалось сохранить историю норм.",
    "settings.normTitle": "История норм",
    "settings.normIntro": "Задайте даты и проценты. Между точками норма меняется плавно каждый день.",
    "settings.normDate": "Дата",
    "settings.normPercent": "% веса",
    "settings.addNorm": "Добавить норму",
    "settings.removeNorm": "Удалить норму",
    "settings.deleteConfirm": "Удалить норму {date} ({percent})? Это изменит расчёт питания для связанных дат.",
    "settings.oneRequired": "Должна остаться хотя бы одна норма.",
    "settings.duplicateDate": "На эту дату уже задана норма.",
    "backup.title": "Резервные копии данных",
    "backup.subtitle": "Скачиваемый файл содержит дневник, нормы, режимы кормления, фотографию и расходы. Точки восстановления позволяют вернуться к предыдущей версии дневника.",
    "backup.automatic": "Автокопирование включено",
    "backup.download": "Скачать полный backup",
    "backup.restorePoint": "Версия для восстановления",
    "backup.loading": "Загружаем список…",
    "backup.empty": "Резервных копий пока нет",
    "backup.select": "Выберите резервную копию",
    "backup.restore": "Восстановить",
    "backup.daily": "Копия дня",
    "backup.snapshot": "Автокопия",
    "backup.downloaded": "Полный backup скачан.",
    "backup.restored": "Данные восстановлены из резервной копии.",
    "backup.confirmTitle": "Восстановить резервную копию?",
    "backup.confirm": "Восстановить данные из «{name}»? Текущие записи будут заменены.",
    "backup.confirmAction": "Восстановить данные",
    "backup.loadError": "Не удалось загрузить список резервных копий.",
    "backup.downloadError": "Не удалось скачать резервную копию.",
    "backup.restoreError": "Не удалось восстановить данные.",
    "feeding.eyebrow": "BARF сегодня",
    "feeding.title": "Актуальная норма питания",
    "feeding.subtitle": "Дневная норма и число приёмов меняются по сохранённому плану.",
    "feeding.daily": "В день",
    "feeding.perMeal": "За приём",
    "feeding.meals": "Приёмов в день",
    "mealCount.edit": "Изменить режим кормления",
    "mealCount.title": "Режим кормления",
    "mealCount.effectiveDate": "Действует с начала дня",
    "mealCount.choose": "Выберите количество приёмов",
    "mealCount.two": "приёма в день",
    "mealCount.three": "приёма в день",
    "mealCount.sourceAutomatic": "По возрастному плану",
    "mealCount.sourceManual": "Вручную с {date}",
    "mealCount.previewDaily": "Дневная норма",
    "mealCount.previewMode": "Приёмов в день",
    "mealCount.previewPerMeal": "Рекомендуемо за приём",
    "mealCount.unchanged": "без изменений",
    "mealCount.preserved": "Сохранённые приёмы пищи не удаляются. Если третий приём уже записан, он останется дополнительным.",
    "mealCount.history": "История изменений",
    "mealCount.historyEmpty": "Ручных изменений пока нет — действует возрастной план.",
    "mealCount.automatic": "По возрастному плану",
    "mealCount.automaticEntry": "По возрастному плану",
    "mealCount.manualEntry": "{count} приёма в день",
    "mealCount.extra": "дополнительный",
    "mealCount.saved": "Режим кормления сохранён.",
    "mealCount.error": "Не удалось сохранить режим кормления.",
    "mealCount.duplicateDate": "Запись на эту дату будет заменена.",
    "mealCount.deleteConfirm": "Удалить изменение режима от {date}? Расчёты связанных дней будут обновлены.",
    "mealCount.delete": "Удалить изменение",
    "mealCount.retroactive": "Будут пересчитаны завершённые дни начиная с этой даты.",
    "barf.title": "Норма и фактическое питание",
    "barf.subtitle": "План до взросления и сколько Поршик фактически съедает в % от веса.",
    "barf.norm": "Норма",
    "barf.actual": "Фактически съедено",
    "barf.future": "Будущий план",
    "barf.current": "Сейчас",
    "barf.adultStable": "Стабильная взрослая норма",
    "barf.completeDays": "Фактическая линия показывает полностью отмеченные дни, включая сегодняшний.",
    "barf.percentAxis": "% от веса",
    "expense.eyebrow": "Расходы на питание",
    "expense.title": "Сколько стоит питание Поршика",
    "expense.subtitle": "Заказы еды, доставка и динамика цены за килограмм в одной истории.",
    "expense.add": "Добавить заказ",
    "expense.total": "За всё время",
    "expense.year": "В этом году",
    "expense.annualPace": "Прогноз на следующие 12 месяцев",
    "expense.annualPaceValue": "{total} · {kilograms} кг",
    "expense.annualPaceNote": "{start} — {end}",
    "expense.annualPaceBreakdown": "Корм {food} + доставка {delivery}",
    "expense.projectionInfo": "Показать формулу прогноза",
    "expense.averageKg": "Последняя цена/кг",
    "expense.projectionTitle": "Формула прогноза на 12 месяцев",
    "expense.projectionFormula": "Kфакт = Σ фактически съедено ÷ Σ нормы за завершённые дни последних 30 дней. Прогноз = Σ365 [(вес дня × норма дня × Kфакт) ÷ 1000 × цена дня] + (прогнозные кг ÷ кг в последнем заказе × доставка последнего заказа).",
    "expense.projectionInputs": "Расчёт: {plannedKg} кг по нормам × {actualFactor}% фактического потребления ({actualDays} заверш. дней из последних 30) = {projectedKg} кг; мясо {foodCost}, доставка {deliveryCost} ({deliveries} эквивалентных заказов по {orderKg} кг × {deliveryPerOrder}). Вес {startWeight} → {endWeight} кг; цена {priceKg}/кг до {inflationDate}, затем {inflatedPriceKg}/кг (+{inflation}%).",
    "expense.foodCost": "Стоимость еды",
    "expense.delivery": "Доставка",
    "expense.priceTrend": "Цена за кг",
    "expense.leftAxis": "Стоимость заказа, €",
    "expense.rightAxis": "Цена за кг, €",
    "expense.orders": "Заказы",
    "expense.dialogTitle": "Заказ еды",
    "expense.type": "Тип еды",
    "expense.typeTreats": "Лакомства",
    "expense.typeDry": "Сухой корм",
    "expense.typeSupplements": "Добавки",
    "expense.typeOther": "Другое",
    "expense.description": "Описание / поставщик",
    "expense.kilograms": "Количество, кг",
    "expense.priceKg": "Цена за кг, €",
    "expense.deliveryCost": "Доставка, €",
    "expense.orderTotal": "Итого заказ",
    "expense.empty": "Пока нет заказов. Добавьте первый, чтобы увидеть расходы во времени.",
    "expense.orderCountOne": "{count} заказ",
    "expense.orderCountFew": "{count} заказа",
    "expense.orderCountMany": "{count} заказов",
    "expense.saved": "Заказ сохранён.",
    "expense.deleted": "Заказ удалён.",
    "expense.loadError": "Не удалось загрузить расходы.",
    "expense.deleteConfirm": "Удалить этот заказ из истории расходов?",
    "expense.chartAria": "График расходов на питание Поршика",
    "expense.perOrderAxis": "Заказ, €",
    "expense.totalAxis": "Накопительно, €",
    "disclaimer": "Расчёт — ориентир по рекомендации заводчицы. Фактическую порцию корректируйте по талии, рёбрам, активности, стулу и динамике веса Поршика; при сомнениях консультируйтесь с ветеринаром.",
    "history.eyebrow": "Полная история",
    "history.title": "График и записи по дням",
    "history.subtitle": "Здесь можно подробно рассмотреть, добавить или отредактировать вес и каждый приём пищи.",
    "history.tableTitle": "Данные по дням",
    "history.tableHint": " · нажмите значение, чтобы изменить его прямо в таблице",
    "history.draft": "Новая запись — заполните нужные значения",
    "history.draftLabel": "Новая",
    "tabs.weight": "Вес",
    "tabs.feeding": "Питание",
    "form.date": "Дата",
    "form.weight": "Вес, кг",
    "form.comment": "Комментарий",
    "form.weightPlaceholder": "Например: утром, до еды",
    "form.feedingPlaceholder": "Например: хороший аппетит",
    "form.eaten": "Съедено за день",
    "form.deviation": "Отклонение от нормы",
    "form.meal": "Приём {slot}",
    "form.skipped": "Не ел",
    "form.plannedMeals": "{count} плановых приёма",
    "form.plannedMeals2": "2 плановых приёма",
    "table.date": "Дата",
    "table.weight": "Вес",
    "table.meal1": "Приём 1",
    "table.meal2": "Приём 2",
    "table.meal3": "Приём 3",
    "table.actualMeals": "Приёмов",
    "table.total": "Всего",
    "table.target": "Норма",
    "table.difference": "Расхождение",
    "table.underTarget": "Недоел на {percent}%",
    "table.overTarget": "Переел на {percent}%",
    "table.onTarget": "В пределах нормы",
    "inline.edit": "Нажмите, чтобы изменить",
    "inline.save": "Сохранить изменение",
    "inline.cancel": "Отменить изменение",
    "inline.skipped": "Не ел",
    "inline.derived": "Рассчитывается автоматически по приёмам пищи",
    "inline.notPlannedMeal": "Этот приём не предусмотрен режимом на выбранную дату",
    "inline.dateExists": "За эту дату уже существует другая запись.",
    "inline.invalidWeight": "Введите вес от 1 до 20 кг или оставьте поле пустым.",
    "inline.invalidMeal": "Введите от 1 до 1000 г, оставьте пустым или отметьте «Не ел».",
    "inline.invalidDate": "Выберите корректную дату.",
    "inline.saved": "Значение обновлено.",
    "auth.title": "Вход для записи",
    "auth.copy": "Дневник виден всем, а добавлять и редактировать данные могут только разрешённые Google-аккаунты.",
    "auth.remember": "Запомнить меня на этом устройстве",
    "auth.checking": "Проверяем авторизацию…",
    "auth.ready": "Выберите разрешённый Google-аккаунт.",
    "auth.unavailable": "Google-вход не настроен.",
    "auth.failed": "Не удалось войти этим аккаунтом.",
    "error.load": "Не удалось загрузить дневник.",
    "error.save": "Не удалось сохранить запись.",
    "error.weight": "Введите вес от 1 до 20 кг.",
    "error.meals": "Введите хотя бы один приём или отметьте его как пропущенный.",
    "status.saved": "Запись сохранена.",
    "status.deleted": "Запись удалена.",
    "status.deleteConfirm": "Удалить всю запись за {date}?",
    "status.deleteWeightConfirm": "Удалить только значение веса за {date}? Питание и комментарий сохранятся.",
    "status.weightDeleted": "Значение веса удалено.",
    "status.photoSaved": "Фотография обновлена.",
    "error.photo": "Не удалось обновить фотографию.",
    "error.photoSize": "Выберите изображение размером до 8 МБ.",
    "stage.puppy": "Щенячья фаза · {percent}%",
    "stage.transition": "Переход · {percent}%",
    "stage.adult": "Взрослая фаза · {percent}%",
    "feeding.puppyStatus": "Щенячья фаза: {percent}% веса · {count} приёма",
    "feeding.transitionStatus": "Переход к взрослой норме: {percent}% · {count} приёма",
    "feeding.adultStatus": "Взрослая фаза: {percent}% веса · {count} приёма",
    "tooltip.weight": "Вес",
    "tooltip.change": "Изменение",
    "tooltip.actualMeals": "Фактически приёмов",
    "tooltip.total": "Всего за день",
    "tooltip.recommended": "Норма за приём",
    "tooltip.dailyRecommended": "Дневная норма",
    "tooltip.skipped": "не ел",
    "records.count": "{count} записей",
    "records.empty": "Записей пока нет",
    "unit.kg": "кг",
    "unit.g": "г"
  },
  en: {
    "brand.kicker": "Growth diary",
    "brand.title": "Porschik",
    "brand.breed": "Pembroke Welsh Corgi",
    "dashboard.eyebrow": "Today at a glance",
    "dashboard.title": "How Porschik grows and eats",
    "dashboard.subtitle": "Weight, actual portions and the current BARF target on one timeline.",
    "stats.weight": "Latest weight",
    "stats.change": "30-day change",
    "stats.changeNote": "based on saved measurements",
    "stats.meal": "Current portion",
    "chart.title": "Porschik's growth and feeding",
    "chart.subtitle": "Blue shows weight; stacked bars show daily intake by meal.",
    "chart.historySubtitle": "Select a point to edit its data.",
    "chart.weightSeries": "Weight",
    "chart.foodSeries": "Feeding",
    "chart.weightLegend": "Weight, kg",
    "chart.weightLevel": "Weight",
    "chart.foodLevel": "Feeding and daily target",
    "chart.actualDaily": "Eaten per day",
    "chart.targetDaily": "Daily target",
    "chart.meal1": "Meal 1",
    "chart.meal2": "Meal 2",
    "chart.meal3": "Meal 3",
    "chart.leftAxis": "Weight, kg",
    "chart.rightAxis": "Per day, g",
    "chart.recommended": "Daily target",
    "action.addWeight": "Add weight",
    "action.addFeeding": "Add feeding",
    "action.addRecord": "New record",
    "action.discardDraft": "Discard draft",
    "action.addWeightShort": "+ Weight",
    "action.addFeedingShort": "+ Feeding",
    "action.history": "History and table",
    "action.retry": "Try again",
    "action.back": "Back home",
    "action.editWeight": "Weight",
    "action.editFeeding": "Feeding",
    "action.delete": "Delete",
    "action.save": "Save",
    "action.cancel": "Cancel",
    "action.theme": "Toggle theme",
    "action.refresh": "Refresh page",
    "action.login": "Sign in",
    "action.logout": "Sign out",
    "action.admin": "Administration",
    "action.changePhoto": "Change Porschik's photo",
    "action.editFeedingSettings": "Edit target history",
    "action.edit": "Edit",
    "action.deleteWeight": "Delete weight",
    "replace.title": "A record already exists for this day",
    "replace.before": "Before",
    "replace.after": "After",
    "replace.confirm": "Replace value",
    "replace.introWeight": "Data is already saved for {date}. Review the weight change before replacing it.",
    "replace.introFeeding": "Data is already saved for {date}. Review the new meals before replacing them.",
    "replace.keepFeeding": "The weight will be replaced; feeding for this day will remain unchanged.",
    "replace.keepWeight": "Feeding will be replaced; the weight for this day will remain unchanged.",
    "settings.reset": "Restore plan to adulthood",
    "settings.saved": "Target history saved.",
    "settings.error": "The target history could not be saved.",
    "settings.normTitle": "Target history",
    "settings.normIntro": "Set dates and percentages. The target changes smoothly each day between control points.",
    "settings.normDate": "Date",
    "settings.normPercent": "% of weight",
    "settings.addNorm": "Add target",
    "settings.removeNorm": "Delete target",
    "settings.deleteConfirm": "Delete the {date} target ({percent})? This changes feeding calculations for related dates.",
    "settings.oneRequired": "At least one target must remain.",
    "settings.duplicateDate": "A target already exists for this date.",
    "backup.title": "Data backups",
    "backup.subtitle": "The download contains the diary, feeding targets, meal schedules, photo and expenses. Restore points return the diary to an earlier version.",
    "backup.automatic": "Automatic backups enabled",
    "backup.download": "Download full backup",
    "backup.restorePoint": "Version to restore",
    "backup.loading": "Loading backups…",
    "backup.empty": "No backups yet",
    "backup.select": "Choose a backup",
    "backup.restore": "Restore",
    "backup.daily": "Daily copy",
    "backup.snapshot": "Automatic copy",
    "backup.downloaded": "Full backup downloaded.",
    "backup.restored": "Data was restored from the backup.",
    "backup.confirmTitle": "Restore backup?",
    "backup.confirm": "Restore data from “{name}”? Current records will be replaced.",
    "backup.confirmAction": "Restore data",
    "backup.loadError": "The backup list could not be loaded.",
    "backup.downloadError": "The backup could not be downloaded.",
    "backup.restoreError": "The data could not be restored.",
    "feeding.eyebrow": "BARF today",
    "feeding.title": "Current feeding target",
    "feeding.subtitle": "The daily target and meal count follow the saved plan.",
    "feeding.daily": "Per day",
    "feeding.perMeal": "Per meal",
    "feeding.meals": "Meals a day",
    "mealCount.edit": "Change feeding schedule",
    "mealCount.title": "Feeding schedule",
    "mealCount.effectiveDate": "Effective from the start of the day",
    "mealCount.choose": "Choose the number of meals",
    "mealCount.two": "meals a day",
    "mealCount.three": "meals a day",
    "mealCount.sourceAutomatic": "Age-based plan",
    "mealCount.sourceManual": "Manual from {date}",
    "mealCount.previewDaily": "Daily target",
    "mealCount.previewMode": "Meals a day",
    "mealCount.previewPerMeal": "Recommended per meal",
    "mealCount.unchanged": "unchanged",
    "mealCount.preserved": "Saved meals are never deleted. If a third meal is already recorded, it remains as an extra meal.",
    "mealCount.history": "Change history",
    "mealCount.historyEmpty": "No manual changes yet — the age-based plan applies.",
    "mealCount.automatic": "Use age-based plan",
    "mealCount.automaticEntry": "Age-based plan",
    "mealCount.manualEntry": "{count} meals a day",
    "mealCount.extra": "extra",
    "mealCount.saved": "Feeding schedule saved.",
    "mealCount.error": "The feeding schedule could not be saved.",
    "mealCount.duplicateDate": "The entry on this date will be replaced.",
    "mealCount.deleteConfirm": "Delete the schedule change from {date}? Calculations for related days will be updated.",
    "mealCount.delete": "Delete change",
    "mealCount.retroactive": "Complete days from this date will be recalculated.",
    "barf.title": "Target and actual feeding",
    "barf.subtitle": "The plan to adulthood and how much Porschik actually eats as a percentage of body weight.",
    "barf.norm": "Target",
    "barf.actual": "Actually eaten",
    "barf.future": "Future plan",
    "barf.current": "Current",
    "barf.adultStable": "Stable adult target",
    "barf.completeDays": "The actual line shows fully logged days, including today.",
    "barf.percentAxis": "% of body weight",
    "expense.eyebrow": "Food expenses",
    "expense.title": "What Porschik's food costs",
    "expense.subtitle": "Food orders, delivery and price-per-kilogram trends in one history.",
    "expense.add": "Add order",
    "expense.total": "All time",
    "expense.year": "This year",
    "expense.annualPace": "Projected next 12 months",
    "expense.annualPaceValue": "{total} · {kilograms} kg",
    "expense.annualPaceNote": "{start} — {end}",
    "expense.annualPaceBreakdown": "Food {food} + delivery {delivery}",
    "expense.projectionInfo": "Show forecast formula",
    "expense.averageKg": "Latest price/kg",
    "expense.projectionTitle": "12-month forecast formula",
    "expense.projectionFormula": "Kactual = Σ actual intake ÷ Σ target intake for complete days in the last 30 days. Forecast = Σ365 [(daily weight × daily target × Kactual) ÷ 1000 × daily price] + (forecast kg ÷ kg in the latest order × latest delivery charge).",
    "expense.projectionInputs": "Calculation: {plannedKg} kg by target × {actualFactor}% actual intake ({actualDays} complete days in the last 30) = {projectedKg} kg; food {foodCost}, delivery {deliveryCost} ({deliveries} equivalent {orderKg} kg orders × {deliveryPerOrder}). Weight {startWeight} → {endWeight} kg; price {priceKg}/kg until {inflationDate}, then {inflatedPriceKg}/kg (+{inflation}%).",
    "expense.foodCost": "Food cost",
    "expense.delivery": "Delivery",
    "expense.priceTrend": "Price per kg",
    "expense.leftAxis": "Order cost, €",
    "expense.rightAxis": "Price per kg, €",
    "expense.orders": "Orders",
    "expense.dialogTitle": "Food order",
    "expense.type": "Food type",
    "expense.typeTreats": "Treats",
    "expense.typeDry": "Dry food",
    "expense.typeSupplements": "Supplements",
    "expense.typeOther": "Other",
    "expense.description": "Description / supplier",
    "expense.kilograms": "Quantity, kg",
    "expense.priceKg": "Price per kg, €",
    "expense.deliveryCost": "Delivery, €",
    "expense.orderTotal": "Order total",
    "expense.empty": "No orders yet. Add the first one to see spending over time.",
    "expense.orderCountOne": "{count} order",
    "expense.orderCountFew": "{count} orders",
    "expense.orderCountMany": "{count} orders",
    "expense.saved": "Order saved.",
    "expense.deleted": "Order deleted.",
    "expense.loadError": "Expenses could not be loaded.",
    "expense.deleteConfirm": "Delete this order from the expense history?",
    "expense.chartAria": "Porschik food expense chart",
    "expense.perOrderAxis": "Order, €",
    "expense.totalAxis": "Cumulative, €",
    "disclaimer": "This calculation is a breeder-based guide. Adjust portions for body shape, ribs, activity, stool and weight trend; consult a veterinarian when unsure.",
    "history.eyebrow": "Full history",
    "history.title": "Chart and daily records",
    "history.subtitle": "Review, add or edit weight and every meal here.",
    "history.tableTitle": "Daily data",
    "history.tableHint": " · select a value to edit it directly in the table",
    "history.draft": "New record — fill in the values you need",
    "history.draftLabel": "New",
    "tabs.weight": "Weight",
    "tabs.feeding": "Feeding",
    "form.date": "Date",
    "form.weight": "Weight, kg",
    "form.comment": "Comment",
    "form.weightPlaceholder": "For example: morning, before food",
    "form.feedingPlaceholder": "For example: good appetite",
    "form.eaten": "Eaten today",
    "form.deviation": "Difference from target",
    "form.meal": "Meal {slot}",
    "form.skipped": "Did not eat",
    "form.plannedMeals": "{count} planned meals",
    "form.plannedMeals2": "2 planned meals",
    "table.date": "Date",
    "table.weight": "Weight",
    "table.meal1": "Meal 1",
    "table.meal2": "Meal 2",
    "table.meal3": "Meal 3",
    "table.actualMeals": "Meals",
    "table.total": "Total",
    "table.target": "Target",
    "table.difference": "Difference",
    "table.underTarget": "Under target by {percent}%",
    "table.overTarget": "Over target by {percent}%",
    "table.onTarget": "Within target",
    "inline.edit": "Select to edit",
    "inline.save": "Save change",
    "inline.cancel": "Cancel change",
    "inline.skipped": "Skipped",
    "inline.derived": "Calculated automatically from individual meals",
    "inline.notPlannedMeal": "This meal is not planned for the selected date",
    "inline.dateExists": "Another record already exists for this date.",
    "inline.invalidWeight": "Enter a weight from 1 to 20 kg or leave it blank.",
    "inline.invalidMeal": "Enter 1 to 1000 g, leave it blank or mark it as skipped.",
    "inline.invalidDate": "Choose a valid date.",
    "inline.saved": "Value updated.",
    "auth.title": "Sign in to record",
    "auth.copy": "The diary is public; only approved Google accounts can add or edit data.",
    "auth.remember": "Keep me signed in on this device",
    "auth.checking": "Checking sign-in…",
    "auth.ready": "Choose an approved Google account.",
    "auth.unavailable": "Google sign-in is not configured.",
    "auth.failed": "This account could not sign in.",
    "error.load": "The diary could not be loaded.",
    "error.save": "The record could not be saved.",
    "error.weight": "Enter a weight between 1 and 20 kg.",
    "error.meals": "Enter at least one meal or mark it as skipped.",
    "status.saved": "Record saved.",
    "status.deleted": "Record deleted.",
    "status.deleteConfirm": "Delete the complete record for {date}?",
    "status.deleteWeightConfirm": "Delete only the weight for {date}? Feeding and comment will stay.",
    "status.weightDeleted": "Weight value deleted.",
    "status.photoSaved": "Photo updated.",
    "error.photo": "The photo could not be updated.",
    "error.photoSize": "Choose an image up to 8 MB.",
    "stage.puppy": "Puppy phase · {percent}%",
    "stage.transition": "Transition · {percent}%",
    "stage.adult": "Adult phase · {percent}%",
    "feeding.puppyStatus": "Puppy phase: {percent}% of weight · {count} meals",
    "feeding.transitionStatus": "Adult transition: {percent}% · {count} meals",
    "feeding.adultStatus": "Adult phase: {percent}% of weight · {count} meals",
    "tooltip.weight": "Weight",
    "tooltip.change": "Change",
    "tooltip.actualMeals": "Actual meals",
    "tooltip.total": "Daily total",
    "tooltip.recommended": "Target per meal",
    "tooltip.dailyRecommended": "Daily target",
    "tooltip.skipped": "did not eat",
    "records.count": "{count} records",
    "records.empty": "No records yet",
    "unit.kg": "kg",
    "unit.g": "g"
  }
};

function t(key, values = {}) {
  let text = translations[state.lang]?.[key] || translations.ru[key] || key;
  for (const [name, value] of Object.entries(values)) {
    text = text.replaceAll(`{${name}}`, String(value));
  }
  return text;
}

function readCookie(name) {
  const item = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : "";
}

function writeCookie(name, value) {
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

function formatNumber(value, maximumFractionDigits = 0, minimumFractionDigits = 0) {
  return new Intl.NumberFormat(state.lang === "en" ? "en-GB" : "ru-RU", {
    maximumFractionDigits,
    minimumFractionDigits
  }).format(value);
}

function formatCurrency(value, maximumFractionDigits = 2) {
  return new Intl.NumberFormat(state.lang === "en" ? "en-GB" : "ru-RU", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits,
    minimumFractionDigits: Number(value) % 1 === 0 ? 0 : Math.min(2, maximumFractionDigits)
  }).format(Number(value) || 0);
}

function normalizeClientExpense(order) {
  const kilograms = Number(order.kilograms);
  const pricePerKg = Number(order.pricePerKg);
  const deliveryCost = Number(order.deliveryCost || 0);
  return {
    id: String(order.id || ""),
    date: String(order.date || "").slice(0, 10),
    type: String(order.type || "BARF"),
    description: String(order.description || ""),
    kilograms,
    pricePerKg,
    deliveryCost,
    totalCost: Number.isFinite(Number(order.totalCost))
      ? Number(order.totalCost)
      : kilograms * pricePerKg + deliveryCost
  };
}

function activeDogProfile() {
  return { ...DOG_PROFILE, ...state.feedingSettings };
}

function formatRatio(ratio) {
  return `${formatNumber(Number(ratio) * 100, 1)}%`;
}

function percentChange(previous, next) {
  const before = Number(previous);
  const after = Number(next);
  if (!Number.isFinite(before) || before === 0 || !Number.isFinite(after)) return null;
  return ((after - before) / Math.abs(before)) * 100;
}

function activeFeedingNorms() {
  return (state.feedingSettings.feedingNorms || DEFAULT_FEEDING_NORMS)
    .map((item) => ({
      date: item.date,
      ratio: Number(item.ratio),
      ...(item.interpolation === "step" ? { interpolation: "step" } : {})
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function activeMealCountChanges() {
  return (Array.isArray(state.feedingSettings.mealCountChanges)
    ? state.feedingSettings.mealCountChanges
    : [])
    .map((item) => item.mode === "automatic"
      ? { date: String(item.date || "").slice(0, 10), mode: "automatic" }
      : { date: String(item.date || "").slice(0, 10), mealsPerDay: Number(item.mealsPerDay) })
    .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.date)
      && (item.mode === "automatic" || [2, 3].includes(item.mealsPerDay)))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function formatDate(isoDate, options = { day: "2-digit", month: "short", year: "numeric" }) {
  return new Intl.DateTimeFormat(state.lang === "en" ? "en-GB" : "ru-RU", {
    timeZone: "UTC",
    ...options
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;"
  })[character]);
}

function normalizeClientRecord(record) {
  return {
    id: String(record.id || record.date),
    date: String(record.date || "").slice(0, 10),
    weightKg: record.weightKg === null || record.weightKg === undefined ? null : Number(record.weightKg),
    meals: Array.isArray(record.meals) ? record.meals.map((meal) => ({
      slot: Number(meal.slot),
      grams: meal.grams === null || meal.grams === undefined ? null : Number(meal.grams),
      skipped: Boolean(meal.skipped)
    })).sort((a, b) => a.slot - b.slot) : [],
    comment: String(record.comment ?? record.note ?? "")
  };
}

function cssColor(variable) {
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
}

function colorWithAlpha(color, alpha) {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(color);
  if (!match) return color;
  return `rgba(${Number.parseInt(match[1], 16)}, ${Number.parseInt(match[2], 16)}, ${Number.parseInt(match[3], 16)}, ${alpha})`;
}

function drawCanvasPill(ctx, text, x, y, align = "center") {
  ctx.save();
  ctx.font = "800 10px Inter, system-ui";
  const paddingX = 7;
  const width = ctx.measureText(text).width + paddingX * 2;
  const height = 22;
  const left = align === "left" ? x : x - width / 2;
  const top = y - height / 2;
  ctx.fillStyle = cssColor("--surface-solid");
  ctx.strokeStyle = colorWithAlpha(cssColor("--blue"), 0.45);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(left, top, width, height, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = cssColor("--text");
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, left + paddingX, y);
  ctx.restore();
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  writeCookie("porschik_theme", state.theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", state.theme === "dark" ? "#1f1a17" : "#fff8ee");
}

function applyTranslations() {
  document.documentElement.lang = state.lang;
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((element) => {
    element.setAttribute("aria-label", t(element.dataset.i18nAria));
    if (element.id === "addExpenseButton") element.title = t(element.dataset.i18nAria);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    element.setAttribute("placeholder", t(element.dataset.i18nPlaceholder));
  });
  const languageButton = document.getElementById("languageButton");
  if (languageButton) languageButton.textContent = state.lang === "ru" ? "EN" : "RU";
  updateDerivedUI();
  if (document.getElementById("mealCountDialog")?.open) {
    renderMealCountHistory();
    updateMealCountPreview();
  }
}

function phaseLabel(plan) {
  const percent = formatNumber(plan.ratio * 100, 1);
  if (plan.phase === "puppy") return t("stage.puppy", { percent });
  if (plan.phase === "adult") return t("stage.adult", { percent });
  return t("stage.transition", { percent });
}

function feedingStatusLabel(plan) {
  const percent = formatNumber(plan.ratio * 100, 1);
  const count = plan.mealsPerDay;
  if (plan.phase === "puppy") return t("feeding.puppyStatus", { percent, count });
  if (plan.phase === "adult") return t("feeding.adultStatus", { percent, count });
  return t("feeding.transitionStatus", { percent, count });
}

function nearestThirtyDayChange() {
  const weighted = state.records.filter((record) => Number.isFinite(record.weightKg));
  if (weighted.length < 2) return null;
  const latest = weighted.at(-1);
  const cutoff = addDays(latest.date, -30);
  const baseline = [...weighted].reverse().find((record) => record.date <= cutoff) || weighted[0];
  if (baseline.id === latest.id) return null;
  const absolute = latest.weightKg - baseline.weightKg;
  return {
    absolute,
    percent: percentChange(baseline.weightKg, latest.weightKg),
    baseline,
    latest
  };
}

function normAgeLabel(norm, index, norms) {
  const isFuture = norm.date > today;
  const isAdult = index === norms.length - 1;
  const suffix = isAdult ? t("barf.adultStable") : isFuture ? t("barf.future") : "";
  const age = ageOn(norm.date);
  const ageLabel = state.lang === "en"
    ? `${age.years ? `${age.years}y ` : ""}${age.months}mo ${age.days}d`
    : `${age.years ? `${age.years}г ` : ""}${age.months}мес ${age.days}дн`;
  return `<small><b>${escapeHtml(ageLabel)}</b>${suffix ? ` · ${escapeHtml(suffix)}` : ""}</small>`;
}

function normInlineEditorMarkup(norm, mode) {
  return `<li class="norm-timeline-editor${mode === "add" ? " is-new" : ""}" data-norm-editor-row>
    <div class="norm-inline-fields">
      <label><span>${escapeHtml(t("settings.normDate"))}</span><input class="date-input" data-inline-norm-date type="date" value="${escapeHtml(norm.date)}" required></label>
      <label><span>${escapeHtml(t("settings.normPercent"))}</span><span class="norm-inline-percent"><input class="number-input" data-inline-norm-percent type="number" min="1" max="12" step="0.1" inputmode="decimal" value="${escapeHtml(Number(norm.ratio * 100).toFixed(1))}" required><strong>%</strong></span></label>
    </div>
    <div class="norm-inline-form-actions">
      <button class="norm-inline-action is-save" type="button" data-save-inline-norm><span aria-hidden="true">✓</span>${escapeHtml(t("action.save"))}</button>
      <button class="norm-inline-action" type="button" data-cancel-inline-norm><span aria-hidden="true">×</span>${escapeHtml(t("action.cancel"))}</button>
    </div>
  </li>`;
}

function renderNormTimeline(plan, recommendation) {
  const currentRatio = document.getElementById("normCurrentRatio");
  if (currentRatio) currentRatio.textContent = formatRatio(plan.ratio);
  const currentDaily = document.getElementById("normCurrentDaily");
  if (currentDaily) currentDaily.textContent = recommendation.dailyGrams
    ? `${formatNumber(Math.round(recommendation.dailyGrams))} ${t("unit.g")}`
    : "—";
  const currentMeal = document.getElementById("normCurrentMeal");
  if (currentMeal) currentMeal.textContent = recommendation.mealGrams
    ? `${formatNumber(Math.round(recommendation.mealGrams))} ${t("unit.g")}`
    : "—";
  const timeline = document.getElementById("normTimelineList");
  if (!timeline) return;
  const norms = activeFeedingNorms();
  const editor = state.normEditor;
  const rows = norms.map((norm, index) => {
    if (editor?.mode === "edit" && editor.originalDate === norm.date) {
      return normInlineEditorMarkup(editor.draft, "edit");
    }
    const actions = state.authenticated ? `<div class="norm-row-actions">
      <button class="edit-icon-button" type="button" data-edit-inline-norm="${escapeHtml(norm.date)}" data-tooltip="${escapeHtml(t("action.edit"))}" aria-label="${escapeHtml(t("action.edit"))}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg></button>
      <button class="norm-row-action is-delete" type="button" data-delete-inline-norm="${escapeHtml(norm.date)}" data-tooltip="${escapeHtml(t("action.delete"))}" aria-label="${escapeHtml(t("settings.removeNorm"))}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5"/></svg></button>
    </div>` : "";
    return `<li data-norm-timeline-date="${escapeHtml(norm.date)}"${norm.date === plan.normStartDate ? ` class="is-active"` : ""}>
      <div class="norm-timeline-summary">
        <span>${escapeHtml(formatDate(norm.date, { day: "2-digit", month: "short" }))}</span>
        <strong>${escapeHtml(formatRatio(norm.ratio))}</strong>
        ${normAgeLabel(norm, index, norms)}
      </div>
      ${actions}
    </li>`;
  }).reverse();
  if (editor?.mode === "add") rows.unshift(normInlineEditorMarkup(editor.draft, "add"));
  timeline.innerHTML = rows.join("");
  const addButton = document.getElementById("normInlineAddButton");
  if (addButton) {
    addButton.hidden = !state.authenticated;
    addButton.disabled = state.normSaving || Boolean(editor);
  }
}

function updateDerivedUI() {
  const plan = feedingPlanForDate(today, activeDogProfile());
  const latest = latestWeightRecord(state.records, today);
  const recommendation = recommendationFor(latest?.weightKg || 0, today, activeDogProfile());
  const ageElement = document.getElementById("dogAge");
  if (ageElement) ageElement.textContent = formatAge(ageOn(today), state.lang);
  const stagePillText = document.getElementById("stagePillText");
  if (stagePillText) stagePillText.textContent = phaseLabel(plan);

  const latestWeight = document.getElementById("latestWeight");
  if (latestWeight) latestWeight.textContent = latest ? `${formatNumber(latest.weightKg, 2)} ${t("unit.kg")}` : "—";
  const latestWeightDate = document.getElementById("latestWeightDate");
  if (latestWeightDate) latestWeightDate.textContent = latest ? formatDate(latest.date) : t("records.empty");
  const change = nearestThirtyDayChange();
  const weightChange = document.getElementById("weightChange");
  if (weightChange) weightChange.textContent = change === null ? "—" : `${change.absolute > 0 ? "+" : ""}${formatNumber(change.absolute, 2)} ${t("unit.kg")}`;
  const weightChangePercent = document.getElementById("weightChangePercent");
  if (weightChangePercent) weightChangePercent.textContent = change?.percent === null || change === null ? "—" : `${change.percent > 0 ? "+" : ""}${formatNumber(change.percent, 1)}%`;
  const recommendedMeal = document.getElementById("recommendedMeal");
  if (recommendedMeal) recommendedMeal.textContent = latest ? `${formatNumber(Math.round(recommendation.mealGrams))} ${t("unit.g")}` : "—";
  const recommendedMealNote = document.getElementById("recommendedMealNote");
  if (recommendedMealNote) recommendedMealNote.textContent = latest ? feedingStatusLabel(plan) : t("records.empty");

  const feedingStatusText = document.getElementById("feedingStatusText");
  if (feedingStatusText) feedingStatusText.textContent = feedingStatusLabel(plan);
  const dailyRecommendation = document.getElementById("dailyRecommendation");
  if (dailyRecommendation) dailyRecommendation.textContent = latest ? `${formatNumber(Math.round(recommendation.dailyGrams))} ${t("unit.g")}` : "—";
  const dailyRecommendationRatio = document.getElementById("dailyRecommendationRatio");
  if (dailyRecommendationRatio) dailyRecommendationRatio.textContent = latest
    ? `${formatRatio(recommendation.ratio)} ${state.lang === "ru" ? "от веса" : "of body weight"}`
    : "—";
  const mealRecommendation = document.getElementById("mealRecommendation");
  if (mealRecommendation) mealRecommendation.textContent = latest ? `${formatNumber(Math.round(recommendation.mealGrams))} ${t("unit.g")}` : "—";
  const mealCount = document.getElementById("mealCountRecommendation");
  if (mealCount) mealCount.textContent = String(plan.mealsPerDay);
  const mealCountSource = document.getElementById("mealCountSource");
  if (mealCountSource) mealCountSource.textContent = plan.mealCountSource === "manual"
    ? t("mealCount.sourceManual", {
      date: formatDate(plan.mealCountStartDate, { day: "2-digit", month: "short", year: "numeric" })
    })
    : t("mealCount.sourceAutomatic");
  const mealCountEditButton = document.getElementById("mealCountEditButton");
  if (mealCountEditButton) mealCountEditButton.hidden = !state.authenticated;
  renderNormTimeline(plan, recommendation);

  const historyRecordCount = document.getElementById("historyRecordCount");
  if (historyRecordCount) historyRecordCount.textContent = t("records.count", { count: state.records.length });
}

function toast(message, type = "success") {
  const region = document.getElementById("toastRegion");
  if (!region) return;
  const item = document.createElement("div");
  item.className = `toast ${type === "error" ? "error" : ""}`;
  item.textContent = message;
  region.append(item);
  setTimeout(() => item.remove(), 3600);
}

function recordForDate(date) {
  return state.records.find((record) => record.date === date) || null;
}

function comparisonDelta(before, after, unit) {
  if (!Number.isFinite(Number(before)) || !Number.isFinite(Number(after)) || Number(before) === Number(after)) return "";
  const absolute = Number(after) - Number(before);
  const relative = percentChange(before, after);
  return `<small class="replace-delta">Δ ${absolute > 0 ? "+" : ""}${formatNumber(absolute, 2)} ${escapeHtml(unit)}${relative === null ? "" : ` (${relative > 0 ? "+" : ""}${formatNumber(relative, 1)}%)`}</small>`;
}

function replacementValueList(type, record, previous = null) {
  const rows = [];
  if (type === "weight") {
    const value = Number.isFinite(record?.weightKg) ? `${formatNumber(record.weightKg, 2)} ${t("unit.kg")}` : "—";
    rows.push([t("table.weight"), `${value}${previous ? comparisonDelta(previous.weightKg, record.weightKg, t("unit.kg")) : ""}`]);
  } else {
    const maxSlot = Math.max(3, ...(record?.meals || []).map((meal) => meal.slot));
    for (let slot = 1; slot <= maxSlot; slot += 1) {
      const meal = record?.meals?.find((item) => item.slot === slot);
      const oldMeal = previous?.meals?.find((item) => item.slot === slot);
      const value = !meal ? "—" : meal.skipped ? t("tooltip.skipped") : `${formatNumber(meal.grams)} ${t("unit.g")}`;
      rows.push([
        t("form.meal", { slot }),
        `${value}${previous && !meal?.skipped ? comparisonDelta(oldMeal?.grams, meal?.grams, t("unit.g")) : ""}`
      ]);
    }
    const total = actualDailyGrams(record);
    rows.push([
      t("table.total"),
      `${formatNumber(total)} ${t("unit.g")}${previous ? comparisonDelta(actualDailyGrams(previous), total, t("unit.g")) : ""}`
    ]);
  }
  return `<div class="replace-value-list">${rows.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${value}</strong></div>`).join("")}</div>`;
}

function confirmRecordReplacement(type, date, previous, next) {
  if (!previous) return Promise.resolve(true);
  const dialog = document.getElementById("replaceDialog");
  if (!dialog) return Promise.resolve(window.confirm(t(type === "weight" ? "replace.introWeight" : "replace.introFeeding", { date: formatDate(date) })));
  document.getElementById("replaceIntro").textContent = t(type === "weight" ? "replace.introWeight" : "replace.introFeeding", { date: formatDate(date) });
  document.getElementById("replaceBefore").innerHTML = replacementValueList(type, previous);
  document.getElementById("replaceAfter").innerHTML = replacementValueList(type, next, previous);
  const preserved = document.getElementById("replacePreserved");
  if (type === "weight") {
    const mealSummary = previous.meals.length
      ? `${actualMealCount(previous)} · ${formatNumber(actualDailyGrams(previous))} ${t("unit.g")}`
      : "—";
    preserved.textContent = `${t("replace.keepFeeding")} ${t("table.total")}: ${mealSummary}`;
  } else {
    const weightSummary = Number.isFinite(previous.weightKg) ? `${formatNumber(previous.weightKg, 2)} ${t("unit.kg")}` : "—";
    preserved.textContent = `${t("replace.keepWeight")} ${t("table.weight")}: ${weightSummary}`;
  }
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      dialog.close();
      resolve(value);
    };
    document.getElementById("replaceConfirmButton").onclick = () => finish(true);
    document.getElementById("replaceCancelButton").onclick = () => finish(false);
    document.getElementById("replaceCloseButton").onclick = () => finish(false);
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      finish(false);
    }, { once: true });
    dialog.addEventListener("close", () => {
      if (!settled) {
        settled = true;
        resolve(false);
      }
    }, { once: true });
    dialog.showModal();
  });
}

class GrowthChart {
  constructor(canvas, wrap, hitLayer, tooltip) {
    this.canvas = canvas;
    this.wrap = wrap;
    this.hitLayer = hitLayer;
    this.tooltip = tooltip;
    this.points = [];
    this.hoveredKey = "";
    this.resizeObserver = new ResizeObserver(() => this.draw());
    this.resizeObserver.observe(wrap);
    canvas.addEventListener("pointermove", (event) => this.handlePointerMove(event));
    canvas.addEventListener("pointerleave", () => this.hideTooltip());
    canvas.addEventListener("click", (event) => {
      const point = this.nearestPoint(event);
      if (point) this.showTooltip(point);
    });
  }

  setData(records) {
    this.records = sortDailyRecords(records);
    this.draw();
  }

  draw(renderHits = true) {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(300, rect.width);
    const height = Math.max(300, rect.height);
    if (!Number.isFinite(width) || width <= 0) return;
    const ratio = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(width * ratio);
    this.canvas.height = Math.round(height * ratio);
    const ctx = this.canvas.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const surface = cssColor("--surface-solid");
    const text = cssColor("--text");
    const muted = cssColor("--muted");
    const border = cssColor("--border");
    const blue = cssColor("--blue");
    const coral = cssColor("--coral");
    const orange = cssColor("--orange");
    const yellow = cssColor("--yellow");
    ctx.fillStyle = surface;
    ctx.fillRect(0, 0, width, height);

    const allRecords = this.records || [];
    const availableStart = allRecords[0]?.date;
    const availableEnd = [allRecords.at(-1)?.date || today, today].sort().at(-1);
    const latestActualDate = allRecords.filter((record) => record.meals.length).at(-1)?.date || "";
    if (!availableStart || !availableEnd) setChartDateRangeUnavailable("growth");
    const range = availableStart && availableEnd
      ? chartDateRange("growth", availableStart, availableEnd, { ensureEndDate: latestActualDate })
      : null;
    const records = range ? allRecords.filter((record) => record.date >= range.startDate && record.date <= range.endDate) : allRecords;
    this.wrap.classList.toggle("is-empty", records.length === 0);
    this.points = [];
    if (renderHits) this.hitLayer.replaceChildren();
    if (!records.length) return;

    const plot = {
      left: width < 560 ? 58 : 82,
      right: width - (width < 560 ? 58 : 82),
      top: 32,
      bottom: height - 48
    };
    const levelGap = width < 560 ? 34 : 42;
    const levelHeight = (plot.bottom - plot.top - levelGap) / 2;
    const weightArea = { ...plot, bottom: plot.top + levelHeight };
    const foodArea = { ...plot, top: plot.top + levelHeight + levelGap };
    this.canvas.dataset.weightTop = String(Math.round(weightArea.top));
    this.canvas.dataset.weightBottom = String(Math.round(weightArea.bottom));
    this.canvas.dataset.foodTop = String(Math.round(foodArea.top));
    this.canvas.dataset.foodBottom = String(Math.round(foodArea.bottom));
    let minTime = Date.parse(`${range?.startDate || records[0].date}T00:00:00Z`);
    let maxTime = Date.parse(`${range?.endDate || records.at(-1).date}T00:00:00Z`);
    if (minTime === maxTime) {
      minTime -= 7 * 86_400_000;
      maxTime += 7 * 86_400_000;
    }
    const xFor = (time) => plot.left + ((time - minTime) / (maxTime - minTime)) * (plot.right - plot.left);

    const weights = records.filter((record) => Number.isFinite(record.weightKg)).map((record) => record.weightKg);
    const minWeight = weights.length ? Math.max(0, Math.floor((Math.min(...weights) - 0.5) * 2) / 2) : 0;
    const maxWeight = weights.length ? Math.max(minWeight + 1, Math.ceil((Math.max(...weights) + 0.5) * 2) / 2) : 10;
    const yWeight = (value) => weightArea.bottom - ((value - minWeight) / (maxWeight - minWeight)) * (weightArea.bottom - weightArea.top);

    const dailyFoodValues = records.filter((record) => record.meals.length).map((record) => actualDailyGrams(record));
    const recommendedValues = records.map((record) => {
      const latest = latestWeightRecord(records, record.date);
      return recommendationFor(latest?.weightKg || 0, record.date, activeDogProfile()).dailyGrams;
    });
    const maxFood = Math.max(300, ...dailyFoodValues, ...recommendedValues);
    const foodTop = Math.ceil(maxFood / 100) * 100;
    const yFood = (value) => foodArea.bottom - (value / foodTop) * (foodArea.bottom - foodArea.top);

    ctx.save();
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.fillStyle = muted;
    ctx.font = "700 10px Inter, system-ui, sans-serif";
    for (let index = 0; index <= 4; index += 1) {
      const fraction = index / 4;
      const weightY = weightArea.bottom - fraction * (weightArea.bottom - weightArea.top);
      ctx.beginPath();
      ctx.moveTo(plot.left, weightY);
      ctx.lineTo(plot.right, weightY);
      ctx.stroke();
      ctx.textBaseline = "middle";
      ctx.textAlign = "right";
      ctx.fillText(`${formatNumber(minWeight + fraction * (maxWeight - minWeight), 1)} ${t("unit.kg")}`, plot.left - 7, weightY);
      const foodY = foodArea.bottom - fraction * (foodArea.bottom - foodArea.top);
      ctx.beginPath();
      ctx.moveTo(plot.left, foodY);
      ctx.lineTo(plot.right, foodY);
      ctx.stroke();
      ctx.textAlign = "right";
      ctx.fillText(`${formatNumber(fraction * foodTop)} ${t("unit.g")}`, plot.left - 7, foodY);
    }

    ctx.fillStyle = text;
    ctx.font = "850 11px Inter, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(t("chart.weightLevel"), plot.left, weightArea.top + 7);
    ctx.fillText(t("chart.foodLevel"), plot.left, foodArea.top + 7);

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let index = 0; index <= 3; index += 1) {
      const time = minTime + (index / 3) * (maxTime - minTime);
      const x = xFor(time);
      ctx.fillText(formatDate(new Date(time).toISOString().slice(0, 10), { day: "2-digit", month: "short" }), x, foodArea.bottom + 12);
    }
    ctx.restore();

    if (state.showGrowthTarget) {
      const targetPoints = records.map((record) => {
        const latest = latestWeightRecord(records, record.date);
        return {
          x: xFor(Date.parse(`${record.date}T00:00:00Z`)),
          y: yFood(recommendationFor(latest?.weightKg || 0, record.date, activeDogProfile()).dailyGrams)
        };
      }).filter((point) => Number.isFinite(point.y));
      if (targetPoints.length > 1) {
        ctx.save();
        ctx.strokeStyle = coral;
        ctx.globalAlpha = 0.45;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        targetPoints.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
        ctx.stroke();
        ctx.restore();
      }
    }

    if (state.showGrowthWeight && weights.length) {
      const weightPoints = records.filter((record) => Number.isFinite(record.weightKg)).map((record) => ({
        kind: "weight",
        key: `weight-${record.date}`,
        record,
        x: xFor(Date.parse(`${record.date}T00:00:00Z`)),
        y: yWeight(record.weightKg),
        color: blue
      }));
      ctx.save();
      ctx.strokeStyle = blue;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      weightPoints.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
      ctx.stroke();
      ctx.restore();
      for (const point of weightPoints) {
        this.drawMarker(ctx, point, "circle", point.key === this.hoveredKey ? 7 : 5);
        this.points.push(point);
      }
    }

    if (state.showGrowthActual) {
      const mealColors = [coral, orange, yellow];
      for (const record of records) {
        const meals = record.meals.filter((meal) => !meal.skipped && Number(meal.grams) > 0);
        if (!meals.length) continue;
        const totalGrams = actualDailyGrams(record);
        if (!Number.isFinite(totalGrams) || totalGrams <= 0) continue;
        const x = xFor(Date.parse(`${record.date}T00:00:00Z`));
        let accumulatedGrams = 0;
        const segments = meals.map((meal) => {
          const bottom = yFood(accumulatedGrams);
          accumulatedGrams += Number(meal.grams);
          const top = yFood(accumulatedGrams);
          return {
            kind: "feeding",
            slot: meal.slot,
            key: `meal-${record.date}-${meal.slot}`,
            record,
            totalGrams,
            grams: Number(meal.grams),
            x,
            y: (top + bottom) / 2,
            top,
            bottom,
            color: mealColors[(meal.slot - 1) % mealColors.length]
          };
        });
        const bar = {
          record,
          totalGrams,
          x,
          y: yFood(totalGrams),
          baseY: foodArea.bottom,
          segments
        };
        this.drawFoodBar(ctx, bar);
        this.points.push(...segments);
      }
    }

    ctx.save();
    ctx.fillStyle = muted;
    ctx.font = "800 10px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.translate(width < 560 ? 11 : 18, (weightArea.top + weightArea.bottom) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(t("chart.leftAxis"), 0, 0);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = muted;
    ctx.font = "800 10px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.translate(width < 560 ? 11 : 18, (foodArea.top + foodArea.bottom) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(t("chart.rightAxis"), 0, 0);
    ctx.restore();
    this.canvas.dataset.foodAxisSide = "left";

    this.canvas.dataset.showWeight = String(state.showGrowthWeight);
    this.canvas.dataset.showActual = String(state.showGrowthActual);
    this.canvas.dataset.showTarget = String(state.showGrowthTarget);
    this.canvas.dataset.minDate = range?.startDate || "";
    this.canvas.dataset.maxDate = range?.endDate || "";
    if (renderHits) this.renderHitTargets();
  }

  drawMarker(ctx, point, shape, radius) {
    ctx.save();
    ctx.fillStyle = point.color;
    ctx.strokeStyle = cssColor("--surface-solid");
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    if (shape === "square") {
      ctx.rect(point.x - radius, point.y - radius, radius * 2, radius * 2);
    } else if (shape === "diamond") {
      ctx.moveTo(point.x, point.y - radius - 1);
      ctx.lineTo(point.x + radius + 1, point.y);
      ctx.lineTo(point.x, point.y + radius + 1);
      ctx.lineTo(point.x - radius - 1, point.y);
      ctx.closePath();
    } else {
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  drawFoodBar(ctx, bar) {
    const highlighted = bar.segments.some((segment) => segment.key === this.hoveredKey);
    const width = highlighted ? 10 : 8;
    ctx.save();
    if (highlighted) {
      ctx.strokeStyle = colorWithAlpha(cssColor("--coral"), 0.12);
      ctx.lineWidth = width + 7;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(bar.x, bar.baseY - 2);
      ctx.lineTo(bar.x, bar.y + 2);
      ctx.stroke();
    }
    for (const segment of bar.segments) {
      const isSelected = segment.key === this.hoveredKey;
      const top = Math.min(segment.top, segment.bottom) + 0.75;
      const height = Math.max(2, Math.abs(segment.bottom - segment.top) - 1.5);
      ctx.fillStyle = colorWithAlpha(segment.color, isSelected ? 0.86 : 0.48);
      ctx.beginPath();
      ctx.roundRect(bar.x - width / 2, top, width, height, Math.min(3, width / 2, height / 2));
      ctx.fill();
      if (isSelected) {
        ctx.strokeStyle = colorWithAlpha(segment.color, 0.95);
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
    ctx.translate(bar.x + 1, bar.y - 5);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = cssColor("--muted");
    ctx.font = "750 8px Inter, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`${formatNumber(bar.totalGrams)} ${t("unit.g")}`, 0, 0);
    ctx.restore();
  }

  renderHitTargets() {
    const fragment = document.createDocumentFragment();
    for (const point of this.points) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "chart-point-button";
      button.style.left = `${point.x}px`;
      button.style.top = `${point.y}px`;
      button.setAttribute("aria-label", this.pointAriaLabel(point));
      button.addEventListener("pointerenter", () => this.showTooltip(point));
      button.addEventListener("pointerleave", () => this.hideTooltip());
      button.addEventListener("focus", () => this.showTooltip(point));
      button.addEventListener("blur", () => this.hideTooltip());
      button.addEventListener("click", () => this.showTooltip(point));
      fragment.append(button);
    }
    this.hitLayer.append(fragment);
  }

  pointAriaLabel(point) {
    if (point.kind === "weight") {
      return `${formatDate(point.record.date)}: ${t("tooltip.weight")} ${formatNumber(point.record.weightKg, 2)} ${t("unit.kg")}`;
    }
    return `${formatDate(point.record.date)}: ${t("form.meal", { slot: point.slot })} ${formatNumber(point.grams)} ${t("unit.g")}; ${t("tooltip.total")} ${formatNumber(point.totalGrams)} ${t("unit.g")}`;
  }

  nearestPoint(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    let nearest = null;
    let distance = Infinity;
    for (const point of this.points) {
      const candidate = Math.hypot(point.x - x, point.y - y);
      if (candidate < distance) {
        nearest = point;
        distance = candidate;
      }
    }
    return distance <= 16 ? nearest : null;
  }

  handlePointerMove(event) {
    const point = this.nearestPoint(event);
    if (!point) {
      this.hideTooltip();
      return;
    }
    this.showTooltip(point);
  }

  showTooltip(point) {
    const changed = this.hoveredKey !== point.key;
    this.hoveredKey = point.key;
    if (changed) this.draw(false);
    const record = point.record;
    const previousWeight = state.records.filter((item) => item.date < record.date && Number.isFinite(item.weightKg)).at(-1);
    const change = Number.isFinite(record.weightKg) && previousWeight ? record.weightKg - previousWeight.weightKg : null;
    const changePercent = change !== null ? percentChange(previousWeight.weightKg, record.weightKg) : null;
    const latest = latestWeightRecord(state.records, record.date);
    const recommendation = recommendationFor(latest?.weightKg || 0, record.date, activeDogProfile());
    const mealRows = record.meals.map((meal) => `
      <span${point.slot === meal.slot ? ` class="is-selected"` : ""}>${point.slot === meal.slot ? "● " : ""}${escapeHtml(t("form.meal", { slot: meal.slot }))}</span>
      <strong${point.slot === meal.slot ? ` class="is-selected"` : ""}>${meal.skipped ? escapeHtml(t("tooltip.skipped")) : `${formatNumber(meal.grams)} ${escapeHtml(t("unit.g"))}`}</strong>
    `).join("");
    this.tooltip.innerHTML = `
      <strong class="tooltip-date">${escapeHtml(formatDate(record.date))}</strong>
      <div class="tooltip-grid">
        ${Number.isFinite(record.weightKg) ? `<span>${escapeHtml(t("tooltip.weight"))}</span><strong>${formatNumber(record.weightKg, 2)} ${escapeHtml(t("unit.kg"))}</strong>` : ""}
        ${change !== null ? `<span>${escapeHtml(t("tooltip.change"))}</span><strong>${change > 0 ? "+" : ""}${formatNumber(change, 2)} ${escapeHtml(t("unit.kg"))}<small class="replace-delta">${changePercent > 0 ? "+" : ""}${formatNumber(changePercent, 1)}%</small></strong>` : ""}
        ${mealRows}
        ${record.meals.length ? `<span>${escapeHtml(t("tooltip.actualMeals"))}</span><strong>${actualMealCount(record)}</strong><span>${escapeHtml(t("tooltip.total"))}</span><strong>${formatNumber(actualDailyGrams(record))} ${escapeHtml(t("unit.g"))}</strong>` : ""}
        <span>${escapeHtml(t("tooltip.dailyRecommended"))}</span><strong>${formatNumber(Math.round(recommendation.dailyGrams))} ${escapeHtml(t("unit.g"))}</strong>
      </div>
      ${record.comment ? `<p class="tooltip-comment">${escapeHtml(record.comment)}</p>` : ""}
    `;
    this.tooltip.hidden = false;
    const tooltipWidth = Math.min(300, this.wrap.clientWidth - 24);
    let left = point.x + 14;
    let top = point.y - 30;
    if (left + tooltipWidth > this.wrap.clientWidth - 10) left = point.x - tooltipWidth - 14;
    if (left < 10) left = 10;
    if (top < 10) top = point.y + 16;
    if (top + this.tooltip.offsetHeight > this.wrap.clientHeight - 10) top = this.wrap.clientHeight - this.tooltip.offsetHeight - 10;
    this.tooltip.style.left = `${left}px`;
    this.tooltip.style.top = `${Math.max(10, top)}px`;
  }

  hideTooltip() {
    const hadHover = Boolean(this.hoveredKey);
    this.hoveredKey = "";
    this.tooltip.hidden = true;
    if (hadHover) this.draw(false);
  }
}

let growthChart = null;

function initGrowthChart() {
  const canvas = document.getElementById("growthChart");
  if (!canvas) return;
  growthChart = new GrowthChart(
    canvas,
    document.getElementById("growthChartWrap"),
    document.getElementById("growthChartHitLayer"),
    document.getElementById("growthChartTooltip")
  );
}

let normHoveredKey = "";
let normInteractivePoints = [];

function hideNormTooltip() {
  const tooltip = document.getElementById("normChartTooltip");
  if (tooltip) tooltip.hidden = true;
  if (!normHoveredKey) return;
  normHoveredKey = "";
  drawNormChart();
}

function handleNormChartPointer(event) {
  const canvas = document.getElementById("normChart");
  const tooltip = document.getElementById("normChartTooltip");
  const wrap = document.getElementById("normChartWrap");
  if (!canvas || !tooltip || !wrap || !normInteractivePoints.length) return;
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  let nearest = null;
  let distance = Infinity;
  for (const point of normInteractivePoints) {
    const candidate = Math.hypot(point.x - x, point.y - y);
    if (candidate < distance) {
      nearest = point;
      distance = candidate;
    }
  }
  if (!nearest || distance > 18) {
    hideNormTooltip();
    return;
  }
  if (normHoveredKey !== nearest.key) {
    normHoveredKey = nearest.key;
    drawNormChart();
  }
  tooltip.innerHTML = `<strong class="tooltip-date">${escapeHtml(formatDate(nearest.date))}</strong>
    <div class="tooltip-grid"><span>${escapeHtml(nearest.kind === "actual" ? t("barf.actual") : t("barf.norm"))}</span><strong>${escapeHtml(formatRatio(nearest.ratio))}</strong></div>`;
  tooltip.hidden = false;
  const tooltipWidth = Math.min(220, wrap.clientWidth - 20);
  let left = nearest.x + 12;
  let top = nearest.y - 24;
  if (left + tooltipWidth > wrap.clientWidth - 8) left = nearest.x - tooltipWidth - 12;
  if (top < 8) top = nearest.y + 12;
  tooltip.style.left = `${Math.max(8, left)}px`;
  tooltip.style.top = `${Math.max(8, top)}px`;
}

function initNormChartInteraction() {
  const canvas = document.getElementById("normChart");
  if (!canvas) return;
  canvas.addEventListener("pointermove", handleNormChartPointer);
  canvas.addEventListener("click", handleNormChartPointer);
  canvas.addEventListener("pointerleave", hideNormTooltip);
}

function drawNormChart() {
  const canvas = document.getElementById("normChart");
  if (!canvas || canvas.getBoundingClientRect().width < 10) return;
  const rect = canvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.fillStyle = cssColor("--surface-solid");
  ctx.fillRect(0, 0, width, height);
  const rightGutter = width < 560 ? 70 : 82;
  const area = { left: width < 560 ? 48 : 58, right: width - rightGutter, top: 18, bottom: height - 38 };
  const profile = activeDogProfile();
  const norms = activeFeedingNorms();
  if (!norms.length) return;
  const startDate = norms[0].date;
  const adultDate = norms.at(-1).date;
  const defaultEndDate = addDays(today, 3);
  const latestRecordDate = state.records.at(-1)?.date || today;
  const endDate = [adultDate, defaultEndDate, latestRecordDate].sort().at(-1);
  const range = chartDateRange("norm", startDate, endDate, { ensureEndDate: defaultEndDate });
  const minTime = Date.parse(`${range.startDate}T00:00:00Z`);
  const maxTime = Math.max(minTime + DAY_MS, Date.parse(`${range.endDate}T00:00:00Z`));
  const xFor = (date) => area.left + ((Date.parse(`${date}T00:00:00Z`) - minTime) / (maxTime - minTime)) * (area.right - area.left);
  const normPoints = [];
  for (let date = range.startDate; date <= range.endDate; date = addDays(date, 1)) {
    normPoints.push({ date, ratio: feedingPlanForDate(date, profile).ratio });
  }
  const actualPoints = state.records
    .filter((record) => record.date >= range.startDate && record.date <= range.endDate && isDailyIntakeComplete(record, profile))
    .map((record) => {
      const weight = latestWeightRecord(state.records, record.date)?.weightKg;
      const ratioValue = intakeRatioFor(actualDailyGrams(record), weight);
      return { date: record.date, ratio: ratioValue };
    })
    .filter((point) => Number.isFinite(point.ratio));
  const visibleRatios = [
    ...(state.showNormTarget ? normPoints : []),
    ...(state.showNormActual ? actualPoints : [])
  ].map((point) => point.ratio);
  const yMax = Math.max(0.08, Math.ceil(Math.max(0, ...visibleRatios) * 100) / 100);
  const yFor = (value) => area.bottom - (value / yMax) * (area.bottom - area.top);
  const visibleNorms = norms.filter((point) => point.date >= range.startDate && point.date <= range.endDate);
  normInteractivePoints = [
    ...(state.showNormTarget ? visibleNorms : []).map((point) => ({
      kind: "norm",
      key: `norm-${point.date}`,
      date: point.date,
      ratio: point.ratio,
      x: xFor(point.date),
      y: yFor(point.ratio)
    })),
    ...(state.showNormActual ? actualPoints : []).map((point) => ({
      kind: "actual",
      key: `actual-${point.date}`,
      date: point.date,
      ratio: point.ratio,
      x: xFor(point.date),
      y: yFor(point.ratio)
    }))
  ];

  ctx.strokeStyle = cssColor("--border");
  ctx.fillStyle = cssColor("--muted");
  ctx.font = "700 10px Inter, system-ui";
  for (let i = 0; i <= 4; i += 1) {
    const y = area.bottom - (i / 4) * (area.bottom - area.top);
    ctx.beginPath();
    ctx.moveTo(area.left, y);
    ctx.lineTo(area.right, y);
    ctx.stroke();
    ctx.textAlign = "right";
    ctx.fillText(`${formatNumber(yMax * 100 * i / 4, 1)}%`, area.left - 7, y + 3);
  }

  const drawLine = (points, color, dashed = false, lineWidth = 3) => {
    if (points.length < 2) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (dashed) ctx.setLineDash([6, 5]);
    ctx.beginPath();
    points.forEach((point, index) => index
      ? ctx.lineTo(xFor(point.date), yFor(point.ratio))
      : ctx.moveTo(xFor(point.date), yFor(point.ratio)));
    ctx.stroke();
    ctx.restore();
  };

  const pastNorm = normPoints.filter((point) => point.date <= today);
  const futureNorm = normPoints.filter((point) => point.date >= today);
  if (state.showNormTarget) {
    drawLine(pastNorm, cssColor("--coral"));
    drawLine(futureNorm, cssColor("--coral"), true);
  }
  if (state.showNormActual) drawLine(actualPoints, cssColor("--blue"), false, 2.5);

  for (const point of state.showNormActual ? actualPoints : []) {
    ctx.fillStyle = cssColor("--blue");
    ctx.beginPath();
    ctx.arc(xFor(point.date), yFor(point.ratio), normHoveredKey === `actual-${point.date}` ? 6 : 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const norm of state.showNormTarget ? visibleNorms : []) {
    ctx.fillStyle = cssColor("--coral");
    ctx.beginPath();
    ctx.arc(xFor(norm.date), yFor(norm.ratio), normHoveredKey === `norm-${norm.date}` ? 7 : 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  const hoveredPoint = normInteractivePoints.find((point) => point.key === normHoveredKey);
  if (hoveredPoint) {
    ctx.save();
    ctx.strokeStyle = colorWithAlpha(hoveredPoint.kind === "actual" ? cssColor("--blue") : cssColor("--coral"), 0.3);
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(hoveredPoint.x, hoveredPoint.y, 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (today >= range.startDate && today <= range.endDate) {
    const todayX = xFor(today);
    const todayLabel = `${state.lang === "ru" ? "Сегодня" : "Today"}: ${formatDate(today, { day: "numeric", month: "long" })}`;
    ctx.save();
    ctx.strokeStyle = colorWithAlpha(cssColor("--muted"), 0.65);
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(todayX, area.top);
    ctx.lineTo(todayX, area.bottom);
    ctx.stroke();
    ctx.restore();
    canvas.dataset.todayLabel = todayLabel;
  }

  ctx.fillStyle = cssColor("--muted");
  ctx.textAlign = "center";
  for (let index = 0; index <= 3; index += 1) {
    const time = minTime + (index / 3) * (maxTime - minTime);
    const date = new Date(time).toISOString().slice(0, 10);
    ctx.fillText(formatDate(date, { day: "2-digit", month: "short" }), xFor(date), area.bottom + 13);
  }
  if (today >= range.startDate && today <= range.endDate) {
    ctx.save();
    ctx.fillStyle = cssColor("--muted");
    ctx.font = "850 9px Inter, system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(canvas.dataset.todayLabel, xFor(today), area.bottom - 5);
    ctx.restore();
  }

  ctx.save();
  ctx.fillStyle = cssColor("--muted");
  ctx.font = "800 10px Inter, system-ui";
  ctx.textAlign = "center";
  ctx.translate(13, (area.top + area.bottom) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(t("barf.percentAxis"), 0, 0);
  ctx.restore();

  const average = actualPoints.length
    ? actualPoints.reduce((sum, point) => sum + point.ratio, 0) / actualPoints.length
    : null;
  const summary = document.getElementById("normTrendSummary");
  if (summary) summary.textContent = average === null
    ? t("barf.completeDays")
    : `${t("barf.completeDays")} ${state.lang === "ru" ? "Среднее" : "Average"}: ${formatRatio(average)}.`;
  canvas.dataset.normPoints = String(normPoints.length);
  canvas.dataset.actualPoints = String(actualPoints.length);
  canvas.dataset.currentRatio = String(feedingPlanForDate(today, profile).ratio);
  canvas.dataset.adultDate = adultDate;
  canvas.dataset.adultRatio = String(norms.at(-1).ratio);
  canvas.dataset.showTarget = String(state.showNormTarget);
  canvas.dataset.showActual = String(state.showNormActual);
  canvas.dataset.minDate = range.startDate;
  canvas.dataset.maxDate = range.endDate;
  canvas.dataset.rightGutter = String(rightGutter);
  const hoverProbe = [...normInteractivePoints].reverse().find((point) => point.kind === "actual");
  canvas.dataset.hoverX = hoverProbe ? String(hoverProbe.x) : "";
  canvas.dataset.hoverY = hoverProbe ? String(hoverProbe.y) : "";
}

function renderHistoryTable() {
  const body = document.getElementById("historyTableBody");
  const mobileList = document.getElementById("mobileRecordList");
  if (!body || !mobileList) {
    renderGrowthQuickRow();
    return;
  }
  state.inlineEditor = null;
  const addRowButton = document.getElementById("addHistoryRowButton");
  if (addRowButton) addRowButton.hidden = !state.authenticated;
  const records = [...state.records].reverse();
  const tableRecords = state.historyDraft ? [{ ...state.historyDraft, isDraft: true }, ...records] : records;
  if (!tableRecords.length) {
    body.innerHTML = `<tr><td class="empty-table" colspan="9">${escapeHtml(t("records.empty"))}</td></tr>`;
    mobileList.innerHTML = `<p class="empty-table">${escapeHtml(t("records.empty"))}</p>`;
    return;
  }
  const mealText = (record, slot) => {
    const meal = record.meals.find((item) => item.slot === slot);
    if (!meal) return "—";
    return meal.skipped ? t("tooltip.skipped") : `${formatNumber(meal.grams)} ${t("unit.g")}`;
  };
  const editableCell = (record, field, content, className = "") => {
    const classes = [className, state.authenticated ? "editable-cell" : ""].filter(Boolean).join(" ");
    const key = record.isDraft ? "draft" : record.date;
    const editAttributes = state.authenticated
      ? ` data-inline-key="${key}" data-inline-record="${record.date}"${record.isDraft ? " data-inline-draft=\"true\"" : ""} data-inline-field="${field}" tabindex="0" role="button" title="${escapeHtml(t("inline.edit"))}"`
      : "";
    return `<td${classes ? ` class="${classes}"` : ""}${editAttributes}><span class="editable-cell-value">${content}</span></td>`;
  };
  const derivedCell = (content, className = "") => `<td class="derived-cell${className ? ` ${className}` : ""}" title="${escapeHtml(t("inline.derived"))}">${content}</td>`;
  const mealCell = (record, slot) => {
    const plannedMeals = feedingPlanForDate(record.date, activeDogProfile()).mealsPerDay;
    const hasSavedMeal = record.meals.some((meal) => meal.slot === slot);
    if (slot > plannedMeals && !hasSavedMeal) {
      return `<td class="derived-cell meal-not-planned" title="${escapeHtml(t("inline.notPlannedMeal"))}">—</td>`;
    }
    return editableCell(record, `meal-${slot}`, escapeHtml(mealText(record, slot)), slot > plannedMeals ? "meal-extra-cell" : "");
  };
  const deleteButton = (record) => {
    if (!state.authenticated) return "";
    const attributes = record.isDraft
      ? `data-discard-history-draft="true" aria-label="${escapeHtml(t("action.discardDraft"))}" title="${escapeHtml(t("action.discardDraft"))}"`
      : `data-delete-record="${record.date}" aria-label="${escapeHtml(t("action.delete"))}" title="${escapeHtml(t("action.delete"))}"`;
    return `<button class="row-delete-button" type="button" ${attributes}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5"/></svg></button>`;
  };
  const metricsFor = (record) => {
    const weight = Number.isFinite(record.weightKg)
      ? record.weightKg
      : latestWeightRecord(state.records, record.date)?.weightKg;
    const target = recommendationFor(weight || 0, record.date, activeDogProfile()).dailyGrams;
    const actual = actualDailyGrams(record);
    const difference = record.meals.length ? intakeDifferencePercent(actual, target) : null;
    return { target, difference };
  };
  const differenceBadge = (difference) => {
    if (!Number.isFinite(difference)) return "—";
    const absolute = formatNumber(Math.abs(difference), 1);
    const status = difference > 0.5 ? "over" : difference < -0.5 ? "under" : "on-target";
    const label = status === "over"
      ? t("table.overTarget", { percent: absolute })
      : status === "under"
        ? t("table.underTarget", { percent: absolute })
        : t("table.onTarget");
    const value = `${difference > 0.05 ? "+" : ""}${formatNumber(difference, 1)}%`;
    return `<span class="intake-difference is-${status}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">${escapeHtml(value)}</span>`;
  };
  body.innerHTML = tableRecords.map((record) => {
    const metrics = metricsFor(record);
    return `
    <tr${record.isDraft ? ` class="history-draft-row" data-draft-label="${escapeHtml(t("history.draftLabel"))}" aria-label="${escapeHtml(t("history.draft"))}"` : ""}>
      ${editableCell(record, "date", `<span class="date-cell-content"><strong>${escapeHtml(formatDate(record.date))}</strong>${deleteButton(record)}</span>`)}
      ${editableCell(record, "weight", Number.isFinite(record.weightKg) ? `${formatNumber(record.weightKg, 2)} ${escapeHtml(t("unit.kg"))}` : "—")}
      ${mealCell(record, 1)}
      ${mealCell(record, 2)}
      ${mealCell(record, 3)}
      ${derivedCell(actualMealCount(record) || "—")}
      ${derivedCell(record.meals.length ? `${formatNumber(actualDailyGrams(record))} ${escapeHtml(t("unit.g"))}` : "—")}
      ${derivedCell(metrics.target ? `${formatNumber(Math.round(metrics.target))} ${escapeHtml(t("unit.g"))}` : "—", "target-cell")}
      ${derivedCell(differenceBadge(metrics.difference), "difference-cell")}
    </tr>
  `;
  }).join("");
  mobileList.innerHTML = records.map((record) => {
    const metrics = metricsFor(record);
    return `
    <article class="mobile-record-card">
      <div class="record-card-top"><strong>${escapeHtml(formatDate(record.date))}</strong><span class="record-card-weight">${Number.isFinite(record.weightKg) ? `${formatNumber(record.weightKg, 2)} ${escapeHtml(t("unit.kg"))}` : "—"}</span>${deleteButton(record)}</div>
      <div class="record-card-grid">
        <div><span>${escapeHtml(t("table.actualMeals"))}</span><strong>${actualMealCount(record) || "—"}</strong></div>
        <div><span>${escapeHtml(t("table.total"))}</span><strong>${record.meals.length ? `${formatNumber(actualDailyGrams(record))} ${escapeHtml(t("unit.g"))}` : "—"}</strong></div>
        <div><span>${escapeHtml(t("table.target"))}</span><strong>${metrics.target ? `${formatNumber(Math.round(metrics.target))} ${escapeHtml(t("unit.g"))}` : "—"}</strong></div>
        <div><span>${escapeHtml(t("table.difference"))}</span><strong>${differenceBadge(metrics.difference)}</strong></div>
      </div>
    </article>
  `;
  }).join("");
  renderGrowthQuickRow();
}

function renderGrowthQuickRow() {
  const body = document.getElementById("growthQuickAddRow");
  if (!body || !state.growthQuickAddOpen) return;
  const record = recordForDate(today) || state.historyDraft;
  if (!record) return;
  const isDraft = record === state.historyDraft;
  const mealText = (slot) => {
    const meal = record.meals.find((item) => item.slot === slot);
    if (!meal) return "—";
    return meal.skipped ? t("tooltip.skipped") : `${formatNumber(meal.grams)} ${t("unit.g")}`;
  };
  const key = isDraft ? "draft" : record.date;
  const editableCell = (field, content) => {
    const attributes = ` data-inline-key="${key}" data-inline-record="${record.date}"${isDraft ? " data-inline-draft=\"true\"" : ""} data-inline-field="${field}" tabindex="0" role="button" title="${escapeHtml(t("inline.edit"))}"`;
    return `<td class="editable-cell"${attributes}><span class="editable-cell-value">${content}</span></td>`;
  };
  const plannedMeals = feedingPlanForDate(record.date, activeDogProfile()).mealsPerDay;
  const quickMealCell = (slot) => {
    const hasSavedMeal = record.meals.some((meal) => meal.slot === slot);
    if (slot > plannedMeals && !hasSavedMeal) {
      return `<td class="derived-cell meal-not-planned" title="${escapeHtml(t("inline.notPlannedMeal"))}">—</td>`;
    }
    const cell = editableCell(`meal-${slot}`, escapeHtml(mealText(slot)));
    return slot > plannedMeals ? cell.replace('class="editable-cell"', 'class="editable-cell meal-extra-cell"') : cell;
  };
  const weight = Number.isFinite(record.weightKg) ? record.weightKg : latestWeightRecord(state.records, record.date)?.weightKg;
  const target = recommendationFor(weight || 0, record.date, activeDogProfile()).dailyGrams;
  const actual = actualDailyGrams(record);
  const difference = record.meals.length ? intakeDifferencePercent(actual, target) : null;
  const differenceContent = !Number.isFinite(difference)
    ? "—"
    : `<span class="intake-difference is-${difference > 0.5 ? "over" : difference < -0.5 ? "under" : "on-target"}">${difference > 0.05 ? "+" : ""}${formatNumber(difference, 1)}%</span>`;
  const deleteAttributes = isDraft
    ? `data-discard-history-draft="true" aria-label="${escapeHtml(t("action.discardDraft"))}"`
    : `data-delete-record="${record.date}" aria-label="${escapeHtml(t("action.delete"))}"`;
  const deleteButton = `<button class="row-delete-button" type="button" ${deleteAttributes}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5"/></svg></button>`;
  body.innerHTML = `<tr${isDraft ? ` class="history-draft-row" data-draft-label="${escapeHtml(t("history.draftLabel"))}" aria-label="${escapeHtml(t("history.draft"))}"` : ""}>
    ${editableCell("date", `<span class="date-cell-content"><strong>${escapeHtml(formatDate(record.date))}</strong>${deleteButton}</span>`)}
    ${editableCell("weight", Number.isFinite(record.weightKg) ? `${formatNumber(record.weightKg, 2)} ${escapeHtml(t("unit.kg"))}` : "—")}
    ${quickMealCell(1)}
    ${quickMealCell(2)}
    ${quickMealCell(3)}
    <td class="derived-cell">${actualMealCount(record) || "—"}</td>
    <td class="derived-cell">${record.meals.length ? `${formatNumber(actual)} ${escapeHtml(t("unit.g"))}` : "—"}</td>
    <td class="derived-cell target-cell">${target ? `${formatNumber(Math.round(target))} ${escapeHtml(t("unit.g"))}` : "—"}</td>
    <td class="derived-cell difference-cell">${differenceContent}</td>
  </tr>`;
}

function addHistoryDraft() {
  if (!state.authenticated || state.inlineSaving) return;
  if (!state.historyDraft) {
    state.historyDraft = {
      date: todayInTimezone(),
      weightKg: null,
      meals: [],
      comment: ""
    };
  }
  renderHistoryTable();
  const firstCell = document.querySelector('[data-inline-key="draft"][data-inline-field="weight"]');
  firstCell?.focus();
}

function discardHistoryDraft() {
  if (state.inlineSaving) return;
  state.historyDraft = null;
  state.inlineEditor = null;
  renderHistoryTable();
}

function inlineEditorError(message = "") {
  const error = state.inlineEditor?.cell?.querySelector("[data-inline-error]");
  if (error) error.textContent = message;
}

function cancelInlineEditor() {
  if (!state.inlineEditor || state.inlineSaving) return;
  state.inlineEditor = null;
  renderHistoryTable();
}

function openInlineEditor(cell) {
  if (!state.authenticated || !cell || state.inlineSaving) return;
  const date = cell.dataset.inlineRecord;
  const field = cell.dataset.inlineField;
  const isDraft = cell.dataset.inlineDraft === "true";
  const key = cell.dataset.inlineKey || date;
  if (state.inlineEditor?.key === key && state.inlineEditor?.field === field) return;
  if (state.inlineEditor) {
    state.inlineEditor = null;
    renderHistoryTable();
    cell = document.querySelector(`[data-inline-key="${key}"][data-inline-field="${field}"]`);
    if (!cell) return;
  }
  const record = isDraft ? state.historyDraft : recordForDate(date);
  if (!record) return;

  const editor = document.createElement("div");
  editor.className = "cell-editor";
  let input;
  if (field === "date") {
    input = document.createElement("input");
    input.type = "date";
    input.value = record.date;
  } else if (field === "weight") {
    input = document.createElement("input");
    input.type = "number";
    input.min = "1";
    input.max = "20";
    input.step = "0.01";
    input.inputMode = "decimal";
    input.value = Number.isFinite(record.weightKg) ? String(record.weightKg) : "";
    input.placeholder = "—";
  } else if (field.startsWith("meal-")) {
    const slot = Number(field.slice(5));
    const meal = record.meals.find((item) => item.slot === slot);
    input = document.createElement("input");
    input.type = "number";
    input.min = "1";
    input.max = "1000";
    input.step = "1";
    input.inputMode = "numeric";
    input.value = meal && !meal.skipped ? String(meal.grams) : "";
    input.placeholder = meal?.skipped ? t("inline.skipped") : "—";
    const skipLabel = document.createElement("label");
    skipLabel.className = "cell-editor-skip";
    const skipInput = document.createElement("input");
    skipInput.type = "checkbox";
    skipInput.checked = Boolean(meal?.skipped);
    skipInput.dataset.inlineSkip = "true";
    const skipText = document.createElement("span");
    skipText.textContent = t("inline.skipped");
    skipLabel.append(skipInput, skipText);
    editor.append(skipLabel);
    skipInput.addEventListener("change", () => {
      input.disabled = skipInput.checked;
      if (skipInput.checked) input.value = "";
      else input.focus();
    });
    input.disabled = skipInput.checked;
  } else return;
  input.className = "cell-editor-input";
  input.dataset.inlineInput = "true";
  input.setAttribute("aria-label", cell.closest("table")?.querySelector(`thead th:nth-child(${cell.cellIndex + 1})`)?.textContent || t("inline.edit"));

  const actions = document.createElement("span");
  actions.className = "cell-editor-actions";
  const saveButton = document.createElement("button");
  saveButton.type = "button";
  saveButton.dataset.inlineSave = "true";
  saveButton.setAttribute("aria-label", t("inline.save"));
  saveButton.textContent = "✓";
  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.dataset.inlineCancel = "true";
  cancelButton.setAttribute("aria-label", t("inline.cancel"));
  cancelButton.textContent = "×";
  actions.append(saveButton, cancelButton);

  const error = document.createElement("small");
  error.className = "cell-editor-error";
  error.dataset.inlineError = "true";
  editor.prepend(input);
  editor.append(actions, error);
  cell.replaceChildren(editor);
  cell.classList.add("is-editing");
  state.inlineEditor = { cell, date, field, key, isDraft };
  if (!input.disabled) {
    input.focus();
    input.select?.();
  }
}

async function saveInlineEditor() {
  const active = state.inlineEditor;
  if (!active || state.inlineSaving) return;
  const record = active.isDraft ? state.historyDraft : recordForDate(active.date);
  const input = active.cell.querySelector("[data-inline-input]");
  if (!record || !input) return;
  const next = {
    date: record.date,
    replaceId: active.isDraft ? "" : record.date,
    recordType: "inline",
    weightKg: record.weightKg,
    meals: record.meals.map((meal) => ({ ...meal })),
    comment: record.comment || ""
  };

  if (active.field === "date") {
    const nextDate = input.value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDate)) {
      inlineEditorError(t("inline.invalidDate"));
      return;
    }
    next.date = nextDate;
  } else if (active.field === "weight") {
    const raw = input.value.trim();
    const weight = raw === "" ? null : Number(raw);
    if (weight !== null && (!Number.isFinite(weight) || weight < 1 || weight > 20)) {
      inlineEditorError(t("inline.invalidWeight"));
      return;
    }
    next.weightKg = weight;
  } else if (active.field.startsWith("meal-")) {
    const slot = Number(active.field.slice(5));
    const skipped = Boolean(active.cell.querySelector("[data-inline-skip]")?.checked);
    const raw = input.value.trim();
    const grams = raw === "" ? null : Number(raw);
    if (!skipped && grams !== null && (!Number.isFinite(grams) || grams < 1 || grams > 1000)) {
      inlineEditorError(t("inline.invalidMeal"));
      return;
    }
    next.meals = next.meals.filter((meal) => meal.slot !== slot);
    if (skipped) next.meals.push({ slot, grams: null, skipped: true });
    else if (grams !== null) next.meals.push({ slot, grams, skipped: false });
    next.meals.sort((a, b) => a.slot - b.slot);
  }

  if (active.isDraft && active.field === "date") {
    state.historyDraft = { ...state.historyDraft, date: next.date };
    state.inlineEditor = null;
    renderHistoryTable();
    return;
  }

  const hasValues = Number.isFinite(next.weightKg) || next.meals.length > 0 || Boolean(next.comment);
  if (active.isDraft && !hasValues) {
    state.historyDraft = { ...state.historyDraft, ...next, meals: next.meals.map((meal) => ({ ...meal })) };
    state.inlineEditor = null;
    renderHistoryTable();
    return;
  }

  const existing = active.isDraft ? recordForDate(next.date) : null;
  if (existing) {
    if (active.field === "weight") next.weightKg = next.weightKg;
    else next.weightKg = existing.weightKg;
    if (!active.field.startsWith("meal-")) next.meals = existing.meals.map((meal) => ({ ...meal }));
    else {
      const slot = Number(active.field.slice(5));
      const replacement = next.meals.find((meal) => meal.slot === slot);
      next.meals = existing.meals.filter((meal) => meal.slot !== slot);
      if (replacement) next.meals.push(replacement);
      next.meals.sort((a, b) => a.slot - b.slot);
    }
    next.comment = existing.comment || "";
    next.replaceId = existing.id || existing.date;
    const replacementType = active.field === "weight" ? "weight" : "feeding";
    if (!await confirmRecordReplacement(replacementType, next.date, existing, next)) return;
  }

  state.inlineSaving = true;
  active.cell.classList.add("is-saving");
  active.cell.querySelectorAll("input, button").forEach((element) => { element.disabled = true; });
  state.inlineEditor = null;
  try {
    await saveDailyRecord(next, { discardDraft: active.isDraft });
    toast(t("inline.saved"));
  } catch (error) {
    state.inlineEditor = active;
    active.cell.classList.remove("is-saving");
    active.cell.querySelectorAll("input, button").forEach((element) => { element.disabled = false; });
    inlineEditorError(error.message || t("error.save"));
  } finally {
    state.inlineSaving = false;
  }
}

let expenseChartPoints = [];
let expenseHoveredId = "";
const EXPENSE_EDITOR_ANIMATION_MS = 560;

function expenseEditorValues(form) {
  const kilograms = Number(form?.querySelector("[data-expense-kilograms]")?.value || 0);
  const pricePerKg = Number(form?.querySelector("[data-expense-price-kg]")?.value || 0);
  const deliveryCost = Number(form?.querySelector("[data-expense-delivery]")?.value || 0);
  return { kilograms, pricePerKg, deliveryCost, totalCost: kilograms * pricePerKg + deliveryCost };
}

function expenseTypeOptions(selected) {
  const types = ["BARF", t("expense.typeTreats"), t("expense.typeDry"), t("expense.typeSupplements"), t("expense.typeOther")];
  if (selected && !types.includes(selected)) types.unshift(selected);
  return types.map((type) => `<option value="${escapeHtml(type)}"${type === selected ? " selected" : ""}>${escapeHtml(type)}</option>`).join("");
}

function orderForId(id) {
  return state.expenses.find((order) => order.id === id) || null;
}

function expenseInlineEditorMarkup(editor) {
  const draft = editor.draft;
  const total = Number(draft.kilograms || 0) * Number(draft.pricePerKg || 0) + Number(draft.deliveryCost || 0);
  return `<form class="expense-order-editor${editor.mode === "add" ? " is-new" : ""}" data-expense-editor-row>
    <div class="expense-inline-fields">
      <label><span>${escapeHtml(t("form.date"))}</span><input class="date-input" data-expense-date type="date" value="${escapeHtml(draft.date)}" required></label>
      <label><span>${escapeHtml(t("expense.type"))}</span><select class="select-input" data-expense-type required>${expenseTypeOptions(draft.type)}</select></label>
      <label><span>${escapeHtml(t("expense.description"))}</span><input class="text-input" data-expense-description maxlength="120" value="${escapeHtml(draft.description)}"></label>
      <label><span>${escapeHtml(t("expense.kilograms"))}</span><input class="number-input" data-expense-kilograms type="number" min="0.01" max="500" step="0.01" inputmode="decimal" value="${escapeHtml(draft.kilograms ?? "")}" required></label>
      <label><span>${escapeHtml(t("expense.priceKg"))}</span><input class="number-input" data-expense-price-kg type="number" min="0" max="1000" step="0.01" inputmode="decimal" value="${escapeHtml(draft.pricePerKg ?? "")}" required></label>
      <label><span>${escapeHtml(t("expense.deliveryCost"))}</span><input class="number-input" data-expense-delivery type="number" min="0" max="5000" step="0.01" inputmode="decimal" value="${escapeHtml(draft.deliveryCost ?? 0)}" required></label>
    </div>
    <div class="expense-inline-footer">
      <div class="expense-inline-total"><span>${escapeHtml(t("expense.orderTotal"))}</span><strong data-expense-inline-total>${formatCurrency(total)}</strong></div>
      <p class="form-message expense-inline-message" data-expense-inline-message aria-live="polite"></p>
      <div class="expense-inline-actions">
        ${editor.mode === "edit" ? `<button class="expense-inline-action is-delete" type="button" data-delete-inline-expense>${escapeHtml(t("action.delete"))}</button>` : ""}
        <button class="expense-inline-action" type="button" data-cancel-inline-expense>${escapeHtml(t("action.cancel"))}</button>
        <button class="expense-inline-action is-save" type="submit">${escapeHtml(t("action.save"))}</button>
      </div>
    </div>
  </form>`;
}

function expenseOrderRowPositions() {
  return new Map([...document.querySelectorAll("#expenseOrderList [data-expense-order-id]")].map((row) => [
    row.dataset.expenseOrderId,
    row.getBoundingClientRect().top
  ]));
}

function animateExpenseOrderShift(previousPositions) {
  if (!previousPositions.size || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  requestAnimationFrame(() => {
    document.querySelectorAll("#expenseOrderList [data-expense-order-id]").forEach((row) => {
      const previousTop = previousPositions.get(row.dataset.expenseOrderId);
      if (!Number.isFinite(previousTop)) return;
      const deltaY = previousTop - row.getBoundingClientRect().top;
      if (Math.abs(deltaY) < 1) return;
      row.animate([
        { transform: `translateY(${deltaY}px)` },
        { transform: "translateY(0)" }
      ], {
        duration: EXPENSE_EDITOR_ANIMATION_MS,
        easing: "cubic-bezier(0.22, 0.72, 0.2, 1)",
        fill: "both"
      });
    });
  });
}

function focusExpenseInlineEditor(delay = 0) {
  const reveal = () => requestAnimationFrame(() => {
    const row = document.querySelector("[data-expense-editor-row]");
    row?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
    row?.querySelector("[data-expense-date]")?.focus({ preventScroll: true });
  });
  if (delay > 0 && !matchMedia("(prefers-reduced-motion: reduce)").matches) setTimeout(reveal, delay);
  else reveal();
}

function beginExpenseEditor(order = null) {
  if (!state.authenticated) {
    state.pendingSetting = order ? `expense:${order.id}` : "expense:new";
    openAuthDialog();
    return;
  }
  if (state.expenseSaving) return;
  const previousPositions = expenseOrderRowPositions();
  state.expenseEditor = {
    mode: order ? "edit" : "add",
    originalId: order?.id || "",
    draft: order
      ? { ...order }
      : { date: today, type: "BARF", description: "", kilograms: "", pricePerKg: "", deliveryCost: 0 }
  };
  renderExpenseList();
  animateExpenseOrderShift(previousPositions);
  focusExpenseInlineEditor(EXPENSE_EDITOR_ANIMATION_MS);
}

function cancelExpenseInlineEditor() {
  if (state.expenseSaving) return;
  state.expenseEditor = null;
  renderExpenseList();
}

function updateExpenseInlineTotal(form) {
  const total = form?.querySelector("[data-expense-inline-total]");
  if (total) total.textContent = formatCurrency(expenseEditorValues(form).totalCost);
}

async function loadExpenses(retry = true) {
  try {
    const response = await fetch("/api/expenses", { credentials: "same-origin", cache: "no-store" });
    if (!response.ok) throw new Error(t("expense.loadError"));
    const payload = await response.json();
    state.expenses = (payload.orders || []).map(normalizeClientExpense)
      .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    renderExpenses();
  } catch {
    // A local server may still be accepting connections just after a manual refresh.
    // Retry once before showing an empty spending history to the user.
    if (retry) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      return loadExpenses(false);
    }
    state.expenses = [];
    renderExpenses();
    toast(t("expense.loadError"), "error");
  }
}

function expenseMetrics() {
  return calculateExpenseMetrics(state.expenses, today, {
    records: state.records,
    profile: activeDogProfile()
  });
}

function renderExpenseList() {
  const list = document.getElementById("expenseOrderList");
  const count = document.getElementById("expenseOrderCount");
  if (!list || !count) return;
  const countCategory = new Intl.PluralRules(state.lang === "en" ? "en" : "ru").select(state.expenses.length);
  const countKey = countCategory === "one" ? "expense.orderCountOne" : countCategory === "few" ? "expense.orderCountFew" : "expense.orderCountMany";
  count.textContent = t(countKey, { count: state.expenses.length });
  const editor = state.expenseEditor;
  const rows = [...state.expenses].reverse().map((order) => {
    if (editor?.mode === "edit" && editor.originalId === order.id) return expenseInlineEditorMarkup(editor);
    return `
    <article class="expense-order-row" data-expense-order-id="${escapeHtml(order.id)}">
      <span>${escapeHtml(formatDate(order.date))}</span>
      <strong>${escapeHtml(order.type)}${order.description ? `<small>${escapeHtml(order.description)}</small>` : ""}</strong>
      <span class="expense-order-kg">${formatNumber(order.kilograms, 2)} ${escapeHtml(t("unit.kg"))}</span>
      <span class="expense-order-unit">${formatCurrency(order.pricePerKg)}/${escapeHtml(t("unit.kg"))}</span>
      <strong>${formatCurrency(order.totalCost)}</strong>
      <button class="edit-icon-button" type="button" data-edit-expense="${escapeHtml(order.id)}" aria-label="${escapeHtml(t("action.edit"))}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg></button>
    </article>
  `;
  });
  if (editor?.mode === "add") rows.unshift(expenseInlineEditorMarkup(editor));
  list.innerHTML = rows.length ? rows.join("") : `<p class="expense-empty">${escapeHtml(t("expense.empty"))}</p>`;
  const addButton = document.getElementById("addExpenseButton");
  if (addButton) addButton.disabled = state.expenseSaving || Boolean(editor);
}

function drawExpenseChart() {
  const canvas = document.getElementById("expenseChart");
  const wrap = document.getElementById("expenseChartWrap");
  if (!canvas || !wrap) return;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(300, rect.width);
  const height = Math.max(230, rect.height);
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = cssColor("--surface-solid");
  ctx.fillRect(0, 0, width, height);
  expenseChartPoints = [];
  const allOrders = state.expenses;
  const availableStart = allOrders[0]?.date;
  const latestOrderDate = allOrders.at(-1)?.date || "";
  const availableEnd = [latestOrderDate || today, today].sort().at(-1);
  if (!availableStart) setChartDateRangeUnavailable("expense");
  const range = availableStart ? chartDateRange("expense", availableStart, availableEnd, { ensureEndDate: latestOrderDate }) : null;
  const orders = range ? allOrders.filter((order) => order.date >= range.startDate && order.date <= range.endDate) : allOrders;
  if (!orders.length) {
    ctx.fillStyle = cssColor("--muted");
    ctx.font = "700 12px Inter, system-ui";
    ctx.textAlign = "center";
    ctx.fillText(t("expense.empty"), width / 2, height / 2);
    canvas.dataset.points = "0";
    canvas.dataset.showFood = String(state.showExpenseFood);
    canvas.dataset.showDelivery = String(state.showExpenseDelivery);
    canvas.dataset.showPriceKg = String(state.showExpensePriceKg);
    return;
  }
  const plot = { left: width < 560 ? 58 : 78, right: width - (width < 560 ? 58 : 78), top: 24, bottom: height - 42 };
  let minTime = Date.parse(`${range?.startDate || orders[0].date}T00:00:00Z`);
  let maxTime = Date.parse(`${range?.endDate || orders.at(-1).date}T00:00:00Z`);
  if (minTime === maxTime) { minTime -= 15 * 86_400_000; maxTime += 15 * 86_400_000; }
  const xFor = (time) => plot.left + (time - minTime) / (maxTime - minTime) * (plot.right - plot.left);
  const visibleOrderTotals = orders.map((order) =>
    (state.showExpenseFood ? order.kilograms * order.pricePerKg : 0)
    + (state.showExpenseDelivery ? order.deliveryCost : 0));
  const maxOrder = Math.max(...visibleOrderTotals, 10);
  const maxPriceKg = Math.max(...orders.map((order) => order.pricePerKg), 1);
  const yOrder = (value) => plot.bottom - value / maxOrder * (plot.bottom - plot.top) * 0.88;
  const yPriceKg = (value) => plot.bottom - value / maxPriceKg * (plot.bottom - plot.top) * 0.88;
  const border = cssColor("--border");
  const muted = cssColor("--muted");
  ctx.font = "700 9px Inter, system-ui";
  for (let index = 0; index <= 4; index += 1) {
    const fraction = index / 4;
    const y = plot.bottom - fraction * (plot.bottom - plot.top);
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plot.left, y); ctx.lineTo(plot.right, y); ctx.stroke();
    ctx.fillStyle = muted;
    ctx.textBaseline = "middle";
    ctx.textAlign = "right";
    ctx.fillText(formatCurrency(fraction * maxOrder, 0), plot.left - 7, y);
    if (state.showExpensePriceKg) {
      ctx.textAlign = "left";
      ctx.fillText(formatCurrency(fraction * maxPriceKg, maxPriceKg < 10 ? 2 : 0), plot.right + 7, y);
    }
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (let index = 0; index <= 3; index += 1) {
    const time = minTime + index / 3 * (maxTime - minTime);
    ctx.fillText(formatDate(new Date(time).toISOString().slice(0, 10), { day: "2-digit", month: "short" }), xFor(time), plot.bottom + 11);
  }
  ctx.save();
  ctx.fillStyle = muted;
  ctx.font = "800 10px Inter, system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.translate(width < 560 ? 11 : 15, (plot.top + plot.bottom) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(t("expense.leftAxis"), 0, 0);
  ctx.restore();
  ctx.save();
  ctx.fillStyle = muted;
  ctx.font = "800 10px Inter, system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.translate(width - (width < 560 ? 11 : 15), (plot.top + plot.bottom) / 2);
  ctx.rotate(Math.PI / 2);
  ctx.fillText(t("expense.rightAxis"), 0, 0);
  ctx.restore();
  const barWidth = Math.max(10, Math.min(28, (plot.right - plot.left) / Math.max(orders.length * 2.4, 8)));
  orders.forEach((order) => {
    const x = xFor(Date.parse(`${order.date}T00:00:00Z`));
    const foodCost = order.kilograms * order.pricePerKg;
    const visibleFood = state.showExpenseFood ? foodCost : 0;
    const visibleDelivery = state.showExpenseDelivery ? order.deliveryCost : 0;
    const visibleTotal = visibleFood + visibleDelivery;
    const foodTop = yOrder(visibleFood);
    const totalTop = yOrder(visibleTotal);
    const highlighted = order.id === expenseHoveredId;
    if (state.showExpenseFood && foodCost > 0) {
      ctx.fillStyle = colorWithAlpha(cssColor("--coral"), highlighted ? 0.72 : 0.42);
      ctx.beginPath(); ctx.roundRect(x - barWidth / 2, foodTop, barWidth, plot.bottom - foodTop, 4); ctx.fill();
    }
    if (state.showExpenseDelivery && order.deliveryCost > 0) {
      ctx.fillStyle = colorWithAlpha(cssColor("--yellow"), highlighted ? 0.9 : 0.64);
      ctx.beginPath(); ctx.roundRect(x - barWidth / 2, totalTop, barWidth, Math.max(2, foodTop - totalTop), 4); ctx.fill();
    }
    if (visibleTotal > 0 || state.showExpensePriceKg) {
      const lineY = yPriceKg(order.pricePerKg);
      expenseChartPoints.push({
        order,
        x,
        y: visibleTotal > 0 ? totalTop : lineY,
        bottom: plot.bottom,
        lineY,
        barWidth,
        hasBars: visibleTotal > 0,
        hasPriceKg: state.showExpensePriceKg
      });
    }
  });
  if (state.showExpensePriceKg) {
    ctx.strokeStyle = cssColor("--blue");
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    expenseChartPoints.forEach((point, index) => index ? ctx.lineTo(point.x, point.lineY) : ctx.moveTo(point.x, point.lineY));
    ctx.stroke();
    expenseChartPoints.forEach((point) => {
      ctx.fillStyle = cssColor("--blue");
      ctx.strokeStyle = cssColor("--surface-solid");
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(point.x, point.lineY, point.order.id === expenseHoveredId ? 6 : 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });
  }
  canvas.dataset.points = String(expenseChartPoints.length);
  canvas.dataset.minDate = range?.startDate || new Date(minTime).toISOString().slice(0, 10);
  canvas.dataset.maxDate = range?.endDate || new Date(maxTime).toISOString().slice(0, 10);
  canvas.dataset.showFood = String(state.showExpenseFood);
  canvas.dataset.showDelivery = String(state.showExpenseDelivery);
  canvas.dataset.showPriceKg = String(state.showExpensePriceKg);
  canvas.dataset.leftAxis = t("expense.leftAxis");
  canvas.dataset.rightAxis = t("expense.rightAxis");
  const hoverProbe = expenseChartPoints.at(-1);
  canvas.dataset.hoverX = hoverProbe ? String(hoverProbe.x) : "";
  canvas.dataset.hoverY = hoverProbe ? String(hoverProbe.y) : "";
}

function renderExpenses() {
  const metrics = expenseMetrics();
  const values = {
    expenseTotal: formatCurrency(metrics.total),
    expenseYear: formatCurrency(metrics.year),
    expenseAnnualPace: metrics.rollingTwelveMonthProjection === null ? "—" : t("expense.annualPaceValue", {
      total: formatCurrency(metrics.rollingTwelveMonthProjection, 0),
      kilograms: formatNumber(metrics.projectedKilograms, 1)
    }),
    expenseAverageKg: metrics.latestPriceKg === null ? "—" : `${formatCurrency(metrics.latestPriceKg)}/${t("unit.kg")}`
  };
  Object.entries(values).forEach(([id, value]) => { const element = document.getElementById(id); if (element) element.textContent = value; });
  const totalBreakdown = document.getElementById("expenseTotalBreakdown");
  if (totalBreakdown) totalBreakdown.textContent = t("expense.annualPaceBreakdown", {
    food: formatCurrency(metrics.totalFoodCost),
    delivery: formatCurrency(metrics.totalDeliveryCost)
  });
  const yearBreakdown = document.getElementById("expenseYearBreakdown");
  if (yearBreakdown) yearBreakdown.textContent = t("expense.annualPaceBreakdown", {
    food: formatCurrency(metrics.yearFoodCost),
    delivery: formatCurrency(metrics.yearDeliveryCost)
  });
  const paceNote = document.getElementById("expenseAnnualPaceNote");
  if (paceNote) paceNote.textContent = metrics.rollingTwelveMonthProjection !== null
    ? t("expense.annualPaceNote", {
      start: formatDate(metrics.projectionStartDate, { day: "2-digit", month: "short", year: "numeric" }),
      end: formatDate(metrics.projectionEndDate, { day: "2-digit", month: "short", year: "numeric" })
    })
    : "—";
  const paceBreakdown = document.getElementById("expenseAnnualPaceBreakdown");
  if (paceBreakdown) paceBreakdown.textContent = metrics.rollingTwelveMonthProjection !== null
    ? t("expense.annualPaceBreakdown", {
      food: formatCurrency(metrics.projectedFoodCost),
      delivery: formatCurrency(metrics.projectedDeliveryCost)
    })
    : "—";
  const projectionReport = document.getElementById("expenseProjectionReport");
  const projectionInfoButton = document.getElementById("expenseProjectionInfoButton");
  const projectionFormula = document.getElementById("expenseProjectionFormula");
  const projectionInputs = document.getElementById("expenseProjectionInputs");
  const hasProjection = metrics.rollingTwelveMonthProjection !== null;
  if (!hasProjection) state.expenseProjectionInfoOpen = false;
  if (projectionInfoButton) {
    projectionInfoButton.hidden = !hasProjection;
    projectionInfoButton.setAttribute("aria-expanded", String(hasProjection && state.expenseProjectionInfoOpen));
  }
  if (projectionReport) {
    const reportOpen = hasProjection && state.expenseProjectionInfoOpen;
    projectionReport.classList.toggle("is-open", reportOpen);
    projectionReport.setAttribute("aria-hidden", String(!reportOpen));
  }
  if (projectionFormula) projectionFormula.textContent = hasProjection ? t("expense.projectionFormula") : "";
  if (projectionInputs) projectionInputs.textContent = hasProjection
    ? t("expense.projectionInputs", {
      plannedKg: formatNumber(metrics.plannedKilograms, 1),
      actualFactor: formatNumber(metrics.actualConsumptionFactor * 100, 1),
      actualDays: metrics.actualConsumptionDays,
      projectedKg: formatNumber(metrics.projectedKilograms, 1),
      foodCost: formatCurrency(metrics.projectedFoodCost),
      deliveryCost: formatCurrency(metrics.projectedDeliveryCost),
      deliveries: formatNumber(metrics.projectedDeliveries, 1),
      orderKg: formatNumber(metrics.latestOrderKg, 1),
      deliveryPerOrder: formatCurrency(metrics.latestDeliveryCost),
      startWeight: formatNumber(metrics.projectedStartWeightKg, 1),
      endWeight: formatNumber(metrics.projectedEndWeightKg, 1),
      priceKg: formatCurrency(metrics.latestPriceKg),
      inflatedPriceKg: formatCurrency(metrics.latestPriceKg * (1 + metrics.inflationRate)),
      inflation: formatNumber(metrics.inflationRate * 100),
      inflationDate: formatDate(metrics.inflationDate, { day: "2-digit", month: "short", year: "numeric" })
    })
    : "";
  document.getElementById("expenseChart")?.setAttribute("aria-label", t("expense.chartAria"));
  renderExpenseList();
  drawExpenseChart();
}

function nearestExpensePoint(event) {
  const canvas = document.getElementById("expenseChart");
  if (!canvas || !expenseChartPoints.length) return null;
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const bar = expenseChartPoints.find((point) => point.hasBars && Math.abs(point.x - x) <= Math.max(12, point.barWidth) && y >= point.y - 12 && y <= point.bottom + 8);
  if (bar) return bar;
  const linePoints = expenseChartPoints.filter((point) => point.hasPriceKg);
  if (!linePoints.length) return null;
  const nearest = linePoints.reduce((candidate, point) => Math.hypot(point.x - x, point.lineY - y) < Math.hypot(candidate.x - x, candidate.lineY - y) ? point : candidate, linePoints[0]);
  return Math.hypot(nearest.x - x, nearest.lineY - y) <= 20 ? nearest : null;
}

function showExpenseTooltip(point) {
  if (!point) return hideExpenseTooltip();
  const tooltip = document.getElementById("expenseChartTooltip");
  const wrap = document.getElementById("expenseChartWrap");
  if (!tooltip || !wrap) return;
  if (expenseHoveredId !== point.order.id) { expenseHoveredId = point.order.id; drawExpenseChart(); }
  const order = point.order;
  const foodCost = order.kilograms * order.pricePerKg;
  tooltip.innerHTML = `<strong class="tooltip-date">${escapeHtml(formatDate(order.date))} · ${escapeHtml(order.type)}</strong><div class="tooltip-grid">
    <span>${escapeHtml(t("expense.kilograms"))}</span><strong>${formatNumber(order.kilograms, 2)} ${escapeHtml(t("unit.kg"))}</strong>
    <span>${escapeHtml(t("expense.priceKg"))}</span><strong>${formatCurrency(order.pricePerKg)}</strong>
    <span>${escapeHtml(t("expense.foodCost"))}</span><strong>${formatCurrency(foodCost)}</strong>
    <span>${escapeHtml(t("expense.delivery"))}</span><strong>${formatCurrency(order.deliveryCost)}</strong>
    <span>${escapeHtml(t("expense.orderTotal"))}</span><strong>${formatCurrency(order.totalCost)}</strong></div>${order.description ? `<p class="tooltip-comment">${escapeHtml(order.description)}</p>` : ""}`;
  tooltip.hidden = false;
  const tooltipWidth = Math.min(290, wrap.clientWidth - 24);
  let left = point.x + 14;
  if (left + tooltipWidth > wrap.clientWidth - 10) left = point.x - tooltipWidth - 14;
  tooltip.style.left = `${Math.max(10, left)}px`;
  tooltip.style.top = `${Math.max(10, Math.min(point.y - 15, wrap.clientHeight - tooltip.offsetHeight - 10))}px`;
}

function hideExpenseTooltip() {
  const tooltip = document.getElementById("expenseChartTooltip");
  if (tooltip) tooltip.hidden = true;
  if (expenseHoveredId) { expenseHoveredId = ""; drawExpenseChart(); }
}

async function saveExpenseInlineEditor(event) {
  event.preventDefault();
  const form = event.target.closest("[data-expense-editor-row]");
  const editor = state.expenseEditor;
  const message = form?.querySelector("[data-expense-inline-message]");
  if (!form || !editor || !form.checkValidity()) {
    form?.reportValidity();
    return;
  }
  const formValues = expenseEditorValues(form);
  const payload = {
    ...(editor.originalId ? { id: editor.originalId, replaceId: editor.originalId } : {}),
    date: form.querySelector("[data-expense-date]").value,
    type: form.querySelector("[data-expense-type]").value,
    description: form.querySelector("[data-expense-description]").value,
    kilograms: formValues.kilograms,
    pricePerKg: formValues.pricePerKg,
    deliveryCost: formValues.deliveryCost
  };
  state.expenseSaving = true;
  form.classList.add("is-saving");
  form.querySelectorAll("input, select, button").forEach((element) => { element.disabled = true; });
  if (message) message.textContent = "";
  try {
    const response = await fetch("/api/expenses", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || t("error.save"));
    state.expenses = (result.orders || []).map(normalizeClientExpense)
      .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    state.expenseEditor = null;
    snapExpenseChartRangeToActualData();
    renderExpenses();
    toast(t("expense.saved"));
  } catch (error) {
    form.classList.remove("is-saving");
    form.querySelectorAll("input, select, button").forEach((element) => { element.disabled = false; });
    if (message) message.textContent = error.message;
  } finally {
    state.expenseSaving = false;
  }
}

async function deleteExpenseInlineEditor() {
  const id = state.expenseEditor?.originalId;
  if (!id || !window.confirm(t("expense.deleteConfirm"))) return;
  const form = document.querySelector("[data-expense-editor-row]");
  const message = form?.querySelector("[data-expense-inline-message]");
  state.expenseSaving = true;
  form?.classList.add("is-saving");
  form?.querySelectorAll("input, select, button").forEach((element) => { element.disabled = true; });
  try {
    const response = await fetch(`/api/expenses?id=${encodeURIComponent(id)}`, { method: "DELETE", credentials: "same-origin" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || t("error.save"));
    state.expenses = (result.orders || []).map(normalizeClientExpense)
      .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    state.expenseEditor = null;
    renderExpenses();
    toast(t("expense.deleted"));
  } catch (error) {
    form?.classList.remove("is-saving");
    form?.querySelectorAll("input, select, button").forEach((element) => { element.disabled = false; });
    if (message) message.textContent = error.message;
  } finally {
    state.expenseSaving = false;
  }
}

function renderAll() {
  updateDerivedUI();
  growthChart?.setData(state.records);
  drawNormChart();
  renderExpenses();
  renderHistoryTable();
}

async function loadRecords() {
  state.loading = true;
  document.getElementById("chartLoading")?.removeAttribute("hidden");
  document.getElementById("loadError")?.setAttribute("hidden", "");
  try {
    const response = await fetch("/api/weights", { credentials: "same-origin", cache: "no-store" });
    if (!response.ok) throw new Error("load failed");
    const payload = await response.json();
    state.records = sortDailyRecords((payload.records || []).map(normalizeClientRecord));
    state.storageReady = Boolean(payload.storageReady);
    renderAll();
  } catch (error) {
    document.getElementById("loadError")?.removeAttribute("hidden");
  } finally {
    state.loading = false;
    document.getElementById("chartLoading")?.setAttribute("hidden", "");
  }
}

function applyAvatar(url) {
  if (!url) return;
  state.avatarUrl = url;
  document.querySelectorAll(".brand-avatar").forEach((image) => {
    image.src = url;
  });
  const favicon = document.querySelector('link[rel="icon"]');
  if (favicon) favicon.href = url;
}

async function loadProfile() {
  try {
    const response = await fetch("/api/profile", { cache: "no-store" });
    if (!response.ok) throw new Error("profile unavailable");
    const profile = await response.json();
    applyAvatar(profile.avatarUrl || "/assets/porschik.jpg");
    state.feedingSettings = {
      ...state.feedingSettings,
      ...(profile.feedingSettings || {})
    };
  } catch {
    applyAvatar("/assets/porschik.jpg");
  }
}

async function avatarDataUrlFromFile(file) {
  if (!file?.type?.startsWith("image/") || file.size > 8 * 1024 * 1024) {
    throw new Error(t("error.photoSize"));
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = objectUrl;
    await image.decode();
    const maxSide = 640;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.86);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function uploadAvatar(file) {
  const button = document.getElementById("avatarButton");
  button?.classList.add("is-uploading");
  if (button) button.disabled = true;
  try {
    const avatarDataUrl = await avatarDataUrlFromFile(file);
    const response = await fetch("/api/profile", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarDataUrl })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || t("error.photo"));
    applyAvatar(payload.avatarUrl);
    toast(t("status.photoSaved"));
  } catch (error) {
    toast(error.message || t("error.photo"), "error");
  } finally {
    button?.classList.remove("is-uploading");
    if (button) button.disabled = false;
    const input = document.getElementById("avatarInput");
    if (input) input.value = "";
  }
}

function setNormInlineMessage(message = "", type = "") {
  const element = document.getElementById("normInlineMessage");
  if (!element) return;
  element.textContent = message;
  element.classList.toggle("is-error", type === "error");
}

const NORM_TIMELINE_ANIMATION_MS = 560;

function normTimelineRowPositions() {
  return new Map([...document.querySelectorAll("#normTimelineList [data-norm-timeline-date]")].map((row) => [
    row.dataset.normTimelineDate,
    row.getBoundingClientRect().top
  ]));
}

function animateNormTimelineShift(previousPositions) {
  if (!previousPositions.size || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  requestAnimationFrame(() => {
    document.querySelectorAll("#normTimelineList [data-norm-timeline-date]").forEach((row) => {
      const previousTop = previousPositions.get(row.dataset.normTimelineDate);
      if (!Number.isFinite(previousTop)) return;
      const deltaY = previousTop - row.getBoundingClientRect().top;
      if (Math.abs(deltaY) < 1) return;
      row.animate([
        { transform: `translateY(${deltaY}px)` },
        { transform: "translateY(0)" }
      ], {
        duration: NORM_TIMELINE_ANIMATION_MS,
        easing: "cubic-bezier(0.22, 0.72, 0.2, 1)",
        fill: "both"
      });
    });
  });
}

function focusNormInlineEditor(delay = 0) {
  const reveal = () => requestAnimationFrame(() => {
    const row = document.querySelector("[data-norm-editor-row]");
    row?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
    row?.querySelector("[data-inline-norm-date]")?.focus({ preventScroll: true });
  });
  if (delay > 0 && !matchMedia("(prefers-reduced-motion: reduce)").matches) setTimeout(reveal, delay);
  else reveal();
}

function beginNormEdit(date) {
  if (!state.authenticated || state.normSaving) return;
  const norm = activeFeedingNorms().find((item) => item.date === date);
  if (!norm) return;
  state.normEditor = { mode: "edit", originalDate: date, draft: { ...norm } };
  setNormInlineMessage();
  updateDerivedUI();
  focusNormInlineEditor();
}

function beginNormAdd() {
  if (!state.authenticated || state.normSaving || state.normEditor) return;
  const previousPositions = normTimelineRowPositions();
  const norms = activeFeedingNorms();
  let date = today;
  while (norms.some((norm) => norm.date === date)) date = addDays(date, 7);
  state.normEditor = {
    mode: "add",
    originalDate: "",
    draft: { date, ratio: feedingPlanForDate(date, activeDogProfile()).ratio }
  };
  setNormInlineMessage();
  updateDerivedUI();
  animateNormTimelineShift(previousPositions);
  focusNormInlineEditor(NORM_TIMELINE_ANIMATION_MS);
}

function cancelNormInlineEditor() {
  if (state.normSaving) return;
  state.normEditor = null;
  setNormInlineMessage();
  updateDerivedUI();
}

async function persistFeedingSettings(patch, errorKey = "settings.error") {
  const feedingSettings = {
    ...state.feedingSettings,
    ...patch
  };
  const response = await fetch("/api/profile", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ feedingSettings })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || t(errorKey));
  state.feedingSettings = payload.feedingSettings;
}

async function persistFeedingNorms(norms) {
  return persistFeedingSettings({ feedingNorms: norms });
}

async function saveNormInlineEditor() {
  const editor = state.normEditor;
  const row = document.querySelector("[data-norm-editor-row]");
  const dateInput = row?.querySelector("[data-inline-norm-date]");
  const percentInput = row?.querySelector("[data-inline-norm-percent]");
  if (!editor || !dateInput || !percentInput || !dateInput.checkValidity() || !percentInput.checkValidity()) {
    setNormInlineMessage(t("settings.error"), "error");
    return;
  }
  const date = dateInput.value;
  const ratio = Number(percentInput.value) / 100;
  const existing = activeFeedingNorms();
  if (existing.some((norm) => norm.date === date && norm.date !== editor.originalDate)) {
    setNormInlineMessage(t("settings.duplicateDate"), "error");
    dateInput.focus();
    return;
  }
  const replacement = {
    date,
    ratio,
    ...(editor.draft.interpolation === "step" ? { interpolation: "step" } : {})
  };
  const norms = editor.mode === "add"
    ? [...existing, replacement]
    : existing.map((norm) => norm.date === editor.originalDate ? replacement : norm);
  state.normSaving = true;
  row.classList.add("is-saving");
  row.querySelectorAll("input, button").forEach((element) => { element.disabled = true; });
  setNormInlineMessage();
  try {
    await persistFeedingNorms(norms);
    state.normEditor = null;
    state.normSaving = false;
    renderAll();
    toast(t("settings.saved"));
  } catch (error) {
    row.classList.remove("is-saving");
    row.querySelectorAll("input, button").forEach((element) => { element.disabled = false; });
    setNormInlineMessage(error.message || t("settings.error"), "error");
  } finally {
    state.normSaving = false;
  }
}

async function deleteNormInline(date) {
  if (!state.authenticated || state.normSaving) return;
  const norms = activeFeedingNorms();
  if (norms.length <= 1) {
    setNormInlineMessage(t("settings.oneRequired"), "error");
    return;
  }
  const norm = norms.find((item) => item.date === date);
  if (!norm || !window.confirm(t("settings.deleteConfirm", { date: formatDate(date), percent: formatRatio(norm.ratio) }))) return;
  state.normSaving = true;
  setNormInlineMessage();
  try {
    await persistFeedingNorms(norms.filter((item) => item.date !== date));
    state.normEditor = null;
    renderAll();
    toast(t("settings.saved"));
  } catch (error) {
    setNormInlineMessage(error.message || t("settings.error"), "error");
  } finally {
    state.normSaving = false;
  }
}

function setMealCountMessage(message = "", type = "") {
  const element = document.getElementById("mealCountMessage");
  if (!element) return;
  element.textContent = message;
  element.classList.toggle("is-error", type === "error");
}

function mealCountChangesWith(change) {
  return [
    ...activeMealCountChanges().filter((item) => item.date !== change.date),
    change
  ].sort((a, b) => a.date.localeCompare(b.date));
}

function renderMealCountHistory() {
  const list = document.getElementById("mealCountHistory");
  if (!list) return;
  const changes = [...activeMealCountChanges()].reverse();
  if (!changes.length) {
    list.innerHTML = `<li class="meal-count-history-empty">${escapeHtml(t("mealCount.historyEmpty"))}</li>`;
    return;
  }
  list.innerHTML = changes.map((change) => {
    const label = change.mode === "automatic"
      ? t("mealCount.automaticEntry")
      : t("mealCount.manualEntry", { count: change.mealsPerDay });
    return `<li>
      <time datetime="${escapeHtml(change.date)}">${escapeHtml(formatDate(change.date, { day: "2-digit", month: "short", year: "numeric" }))}</time>
      <strong>${escapeHtml(label)}</strong>
      <button type="button" data-delete-meal-count="${escapeHtml(change.date)}" aria-label="${escapeHtml(t("mealCount.delete"))}" title="${escapeHtml(t("mealCount.delete"))}">×</button>
    </li>`;
  }).join("");
}

function selectedMealCount() {
  return Number(document.querySelector('input[name="mealsPerDay"]:checked')?.value);
}

function updateMealCountPreview() {
  const preview = document.getElementById("mealCountPreview");
  const date = document.getElementById("mealCountDate")?.value;
  const mealsPerDay = selectedMealCount();
  if (!preview || !/^\d{4}-\d{2}-\d{2}$/.test(String(date || "")) || ![2, 3].includes(mealsPerDay)) return;
  const profile = activeDogProfile();
  const currentPlan = feedingPlanForDate(date, profile);
  const nextProfile = {
    ...profile,
    mealCountChanges: mealCountChangesWith({ date, mealsPerDay })
  };
  const nextPlan = feedingPlanForDate(date, nextProfile);
  const weight = latestWeightRecord(state.records, date)?.weightKg || 0;
  const currentRecommendation = recommendationFor(weight, date, profile);
  const nextRecommendation = recommendationFor(weight, date, nextProfile);
  const daily = currentRecommendation.dailyGrams
    ? `${formatNumber(Math.round(currentRecommendation.dailyGrams))} ${t("unit.g")} · ${t("mealCount.unchanged")}`
    : "—";
  const currentMeal = currentRecommendation.mealGrams
    ? `${formatNumber(Math.round(currentRecommendation.mealGrams))} ${t("unit.g")}`
    : "—";
  const nextMeal = nextRecommendation.mealGrams
    ? `${formatNumber(Math.round(nextRecommendation.mealGrams))} ${t("unit.g")}`
    : "—";
  const notices = [
    activeMealCountChanges().some((item) => item.date === date) ? t("mealCount.duplicateDate") : "",
    date < today ? t("mealCount.retroactive") : ""
  ].filter(Boolean);
  preview.innerHTML = `
    <div><span>${escapeHtml(t("mealCount.previewDaily"))}</span><strong>${escapeHtml(daily)}</strong></div>
    <div><span>${escapeHtml(t("mealCount.previewMode"))}</span><strong>${currentPlan.mealsPerDay} → ${nextPlan.mealsPerDay}</strong></div>
    <div><span>${escapeHtml(t("mealCount.previewPerMeal"))}</span><strong>${escapeHtml(currentMeal)} → ${escapeHtml(nextMeal)}</strong></div>
    ${notices.length ? `<small>${escapeHtml(notices.join(" "))}</small>` : ""}
  `;
}

function openMealCountDialog() {
  if (!state.authenticated) return openAuthDialog();
  const dialog = document.getElementById("mealCountDialog");
  const dateInput = document.getElementById("mealCountDate");
  if (!dialog || !dateInput) return;
  dateInput.value = today;
  const plan = feedingPlanForDate(today, activeDogProfile());
  const radio = document.querySelector(`input[name="mealsPerDay"][value="${plan.mealsPerDay}"]`);
  if (radio) radio.checked = true;
  setMealCountMessage();
  renderMealCountHistory();
  updateMealCountPreview();
  dialog.showModal();
}

function setMealCountBusy(busy) {
  document.querySelectorAll("#mealCountForm input, #mealCountForm button").forEach((element) => {
    element.disabled = busy;
  });
}

async function saveMealCountChange(change, { close = true } = {}) {
  setMealCountBusy(true);
  setMealCountMessage();
  try {
    await persistFeedingSettings({
      mealCountChanges: mealCountChangesWith(change)
    }, "mealCount.error");
    renderAll();
    renderMealCountHistory();
    updateMealCountPreview();
    toast(t("mealCount.saved"));
    if (close) document.getElementById("mealCountDialog")?.close();
  } catch (error) {
    setMealCountMessage(error.message || t("mealCount.error"), "error");
  } finally {
    setMealCountBusy(false);
  }
}

async function submitMealCount(event) {
  event.preventDefault();
  const dateInput = document.getElementById("mealCountDate");
  const mealsPerDay = selectedMealCount();
  if (!dateInput?.checkValidity() || ![2, 3].includes(mealsPerDay)) {
    setMealCountMessage(t("mealCount.error"), "error");
    return;
  }
  await saveMealCountChange({ date: dateInput.value, mealsPerDay });
}

async function resetMealCountToAutomatic() {
  const dateInput = document.getElementById("mealCountDate");
  if (!dateInput?.checkValidity()) {
    setMealCountMessage(t("mealCount.error"), "error");
    return;
  }
  await saveMealCountChange({ date: dateInput.value, mode: "automatic" });
}

async function deleteMealCountChange(date) {
  if (!state.authenticated || !window.confirm(t("mealCount.deleteConfirm", { date: formatDate(date) }))) return;
  setMealCountBusy(true);
  setMealCountMessage();
  try {
    await persistFeedingSettings({
      mealCountChanges: activeMealCountChanges().filter((item) => item.date !== date)
    }, "mealCount.error");
    renderAll();
    renderMealCountHistory();
    updateMealCountPreview();
    toast(t("mealCount.saved"));
  } catch (error) {
    setMealCountMessage(error.message || t("mealCount.error"), "error");
  } finally {
    setMealCountBusy(false);
  }
}

function setRecordTab(type) {
  state.activeRecordTab = type;
  document.querySelectorAll("[data-record-tab]").forEach((button) => button.setAttribute("aria-selected", String(button.dataset.recordTab === type)));
  document.getElementById("weightForm")?.toggleAttribute("hidden", type !== "weight");
  document.getElementById("feedingForm")?.toggleAttribute("hidden", type !== "feeding");
  const title = document.getElementById("recordDialogTitle");
  if (title) title.textContent = type === "weight" ? t("action.addWeight") : t("action.addFeeding");
}

function openRecordDialog(type, date = today) {
  if (!state.authenticated) {
    state.pendingRecordAction = { type, date };
    openAuthDialog();
    return;
  }
  state.editingOriginalDate = recordForDate(date)?.date || "";
  setRecordTab(type);
  populateWeightForm(date);
  populateFeedingForm(date);
  document.getElementById("recordDialog")?.showModal();
}

function populateWeightForm(date) {
  const record = recordForDate(date);
  const latest = latestWeightRecord(state.records, date);
  const value = record?.weightKg || latest?.weightKg || 1;
  const dateInput = document.getElementById("weightDate");
  const valueInput = document.getElementById("weightValue");
  const rangeInput = document.getElementById("weightRange");
  if (dateInput) dateInput.value = date;
  if (valueInput) valueInput.value = Number(value).toFixed(2);
  if (rangeInput) rangeInput.value = String(value);
  const message = document.getElementById("weightFormMessage");
  if (message) message.textContent = "";
  const deleteButton = document.getElementById("deleteWeightButton");
  if (deleteButton) deleteButton.hidden = !Number.isFinite(record?.weightKg);
}

function populateFeedingForm(date) {
  const record = recordForDate(date);
  const dateInput = document.getElementById("feedingDate");
  if (dateInput) dateInput.value = date;
  buildMealControls(date, record?.meals || []);
  const message = document.getElementById("feedingFormMessage");
  if (message) message.textContent = "";
}

function buildMealControls(date, meals = []) {
  const container = document.getElementById("mealsContainer");
  if (!container) return;
  const plan = feedingPlanForDate(date, activeDogProfile());
  const existingMax = meals.reduce((max, meal) => Math.max(max, meal.slot), 0);
  const count = Math.max(plan.mealsPerDay, existingMax);
  const phase = document.getElementById("feedingFormPhase");
  if (phase) phase.textContent = plan.mealsPerDay === 2 ? t("form.plannedMeals2") : t("form.plannedMeals", { count: plan.mealsPerDay });
  container.innerHTML = Array.from({ length: count }, (_, index) => {
    const slot = index + 1;
    const meal = meals.find((item) => item.slot === slot);
    const isExtra = slot > plan.mealsPerDay;
    const value = meal?.grams || Math.round(recommendationFor(latestWeightRecord(state.records, date)?.weightKg || 0, date, activeDogProfile()).mealGrams) || 100;
    return `
      <div class="meal-row${isExtra ? " is-extra" : ""}" data-meal-slot="${slot}">
        <div class="meal-row-head">
          <span>${escapeHtml(t("form.meal", { slot }))}${isExtra ? `<small class="meal-extra-label">${escapeHtml(t("mealCount.extra"))}</small>` : ""}</span>
          <label class="skip-toggle"><input type="checkbox" data-meal-skip="${slot}" ${meal?.skipped ? "checked" : ""}><span>${escapeHtml(t("form.skipped"))}</span></label>
        </div>
        <div class="dual-control">
          <input class="number-input" data-meal-value="${slot}" type="number" min="1" max="1000" step="1" inputmode="numeric" value="${meal?.skipped ? "" : value}" ${meal?.skipped ? "disabled" : ""}>
          <input class="range-input food-range" data-meal-range="${slot}" type="range" min="1" max="500" step="1" value="${Math.min(500, value)}" ${meal?.skipped ? "disabled" : ""}>
        </div>
      </div>
    `;
  }).join("");
  updateFeedingSummary();
}

function mealFormValues() {
  return [...document.querySelectorAll("[data-meal-slot]")].map((row) => {
    const slot = Number(row.dataset.mealSlot);
    const skipped = row.querySelector(`[data-meal-skip="${slot}"]`).checked;
    const raw = row.querySelector(`[data-meal-value="${slot}"]`).value;
    if (skipped) return { slot, grams: null, skipped: true };
    if (!raw) return null;
    return { slot, grams: Math.round(Number(raw)), skipped: false };
  }).filter(Boolean);
}

function updateFeedingSummary() {
  const meals = mealFormValues();
  const total = actualDailyGrams({ meals });
  const date = document.getElementById("feedingDate")?.value || today;
  const latest = latestWeightRecord(state.records, date);
  const target = recommendationFor(latest?.weightKg || 0, date, activeDogProfile()).dailyGrams;
  const difference = total - target;
  const totalElement = document.getElementById("feedingTotal");
  if (totalElement) totalElement.textContent = `${formatNumber(total)} ${t("unit.g")}`;
  const deviation = document.getElementById("feedingDeviation");
  if (deviation) deviation.textContent = target ? `${difference > 0 ? "+" : ""}${formatNumber(Math.round(difference))} ${t("unit.g")}` : "—";
}

async function saveDailyRecord(body, { discardDraft = false } = {}) {
  const response = await fetch("/api/weights", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || t("error.save"));
  state.records = sortDailyRecords((payload.records || []).map(normalizeClientRecord));
  if (discardDraft) state.historyDraft = null;
  snapDailyChartRangesToActualData();
  renderAll();
  if (page === "history" && state.authenticated) loadRestorePoints();
}

async function submitWeight(event) {
  event.preventDefault();
  const date = document.getElementById("weightDate").value;
  const weightKg = Number(document.getElementById("weightValue").value);
  const message = document.getElementById("weightFormMessage");
  if (!Number.isFinite(weightKg) || weightKg < 1 || weightKg > 20) {
    message.textContent = t("error.weight");
    return;
  }
  const record = recordForDate(date);
  message.textContent = "";
  try {
    const body = {
      date,
      replaceId: state.editingOriginalDate || date,
      recordType: "weight",
      weightKg,
      meals: record?.meals || [],
      comment: record?.comment || ""
    };
    if (!await confirmRecordReplacement("weight", date, record, body)) return;
    await saveDailyRecord(body);
    document.getElementById("recordDialog").close();
    toast(t("status.saved"));
  } catch (error) {
    message.textContent = error.message;
  }
}

async function submitFeeding(event) {
  event.preventDefault();
  const date = document.getElementById("feedingDate").value;
  const meals = mealFormValues();
  const message = document.getElementById("feedingFormMessage");
  if (!meals.length) {
    message.textContent = t("error.meals");
    return;
  }
  const record = recordForDate(date);
  message.textContent = "";
  try {
    const body = {
      date,
      replaceId: state.editingOriginalDate || date,
      recordType: "feeding",
      weightKg: record?.weightKg ?? null,
      meals,
      comment: record?.comment || ""
    };
    if (!await confirmRecordReplacement("feeding", date, record, body)) return;
    await saveDailyRecord(body);
    document.getElementById("recordDialog").close();
    toast(t("status.saved"));
  } catch (error) {
    message.textContent = error.message;
  }
}

function openGrowthQuickAdd(date = today) {
  if (!state.authenticated) {
    state.pendingRecordAction = { type: "quick-add", date };
    openAuthDialog();
    return;
  }
  const form = document.getElementById("growthQuickAddForm");
  const button = document.getElementById("growthQuickAddButton");
  if (!form) return;
  if (!recordForDate(date) && !state.historyDraft) {
    state.historyDraft = { date, weightKg: null, meals: [], comment: "" };
  }
  state.growthQuickAddOpen = true;
  form.hidden = false;
  renderGrowthQuickRow();
  button?.setAttribute("aria-expanded", "true");
  requestAnimationFrame(() => {
    form.classList.add("is-open");
  });
}

function closeGrowthQuickAdd() {
  const form = document.getElementById("growthQuickAddForm");
  const button = document.getElementById("growthQuickAddButton");
  if (!form) return;
  state.growthQuickAddOpen = false;
  if (state.historyDraft?.date === today) state.historyDraft = null;
  state.inlineEditor = null;
  button?.setAttribute("aria-expanded", "false");
  form.classList.remove("is-open");
  const hide = () => { if (!state.growthQuickAddOpen) form.hidden = true; };
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) hide();
  else setTimeout(hide, 360);
}

async function deleteWeightValue() {
  const date = document.getElementById("weightDate")?.value;
  const record = recordForDate(date);
  if (!record || !Number.isFinite(record.weightKg)) return;
  if (!window.confirm(t("status.deleteWeightConfirm", { date: formatDate(date) }))) return;

  try {
    if (record.meals.length || record.comment) {
      await saveDailyRecord({
        date,
        replaceId: record.id || date,
        recordType: "weight_delete",
        weightKg: null,
        meals: record.meals,
        comment: record.comment
      });
    } else {
      const response = await fetch(`/api/weights?id=${encodeURIComponent(record.id || date)}`, {
        method: "DELETE",
        credentials: "same-origin"
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || t("error.save"));
      state.records = sortDailyRecords((payload.records || []).map(normalizeClientRecord));
      renderAll();
      if (page === "history" && state.authenticated) loadRestorePoints();
    }
    document.getElementById("recordDialog")?.close();
    toast(t("status.weightDeleted"));
  } catch (error) {
    const message = document.getElementById("weightFormMessage");
    if (message) message.textContent = error.message;
  }
}

async function deleteRecord(date) {
  if (!state.authenticated) {
    openAuthDialog();
    return;
  }
  if (!window.confirm(t("status.deleteConfirm", { date: formatDate(date) }))) return;
  try {
    const response = await fetch(`/api/weights?id=${encodeURIComponent(date)}`, { method: "DELETE", credentials: "same-origin" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || t("error.save"));
    state.records = sortDailyRecords((payload.records || []).map(normalizeClientRecord));
    renderAll();
    if (page === "history" && state.authenticated) loadRestorePoints();
    toast(t("status.deleted"));
  } catch (error) {
    toast(error.message, "error");
  }
}

function setBackupStatus(message = "", type = "") {
  const status = document.getElementById("backupStatusMessage");
  if (!status) return;
  status.textContent = message;
  status.classList.toggle("is-error", type === "error");
}

function setBackupBusy(busy) {
  state.backupBusy = busy;
  ["downloadBackupButton", "restorePointSelect", "restoreBackupButton"].forEach((id) => {
    const element = document.getElementById(id);
    if (element) element.disabled = busy;
  });
}

async function loadRestorePoints() {
  const select = document.getElementById("restorePointSelect");
  if (!select || !state.authenticated || page !== "history") return;
  select.innerHTML = `<option value="">${escapeHtml(t("backup.loading"))}</option>`;
  try {
    const response = await fetch("/api/weights?backups=1", { credentials: "same-origin", cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || t("backup.loadError"));
    const points = payload.restorePoints || [];
    select.innerHTML = `<option value="">${escapeHtml(t(points.length ? "backup.select" : "backup.empty"))}</option>`;
    points.forEach((point) => {
      const option = document.createElement("option");
      option.value = point.pathname;
      const typeLabel = t(point.type === "backup" ? "backup.daily" : "backup.snapshot");
      option.textContent = `${typeLabel} · ${new Date(point.uploadedAt).toLocaleString(state.lang === "en" ? "en-GB" : "ru-RU")}`;
      select.append(option);
    });
  } catch (error) {
    select.innerHTML = `<option value="">${escapeHtml(t("backup.loadError"))}</option>`;
    setBackupStatus(error.message || t("backup.loadError"), "error");
  }
}

async function downloadBackup() {
  if (!state.authenticated) return openAuthDialog();
  setBackupBusy(true);
  setBackupStatus("");
  try {
    const response = await fetch("/api/weights?export=1", { credentials: "same-origin", cache: "no-store" });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || t("backup.downloadError"));
    }
    const blob = await response.blob();
    const disposition = response.headers.get("Content-Disposition") || "";
    const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] || `porschik-full-backup-${today}.json`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setBackupStatus(t("backup.downloaded"));
    toast(t("backup.downloaded"));
  } catch (error) {
    setBackupStatus(error.message || t("backup.downloadError"), "error");
  } finally {
    setBackupBusy(false);
  }
}

function restoreSelectedBackup() {
  if (!state.authenticated) return openAuthDialog();
  const select = document.getElementById("restorePointSelect");
  const pathname = select?.value || "";
  if (!pathname) {
    setBackupStatus(t("backup.select"), "error");
    return;
  }
  const selectedName = select.options[select.selectedIndex]?.textContent || pathname;
  state.pendingBackupRestore = { pathname, selectedName };
  const copy = document.getElementById("restoreDialogCopy");
  if (copy) copy.textContent = t("backup.confirm", { name: selectedName });
  document.getElementById("restoreDialog")?.showModal();
}

async function confirmSelectedBackupRestore() {
  const pending = state.pendingBackupRestore;
  if (!pending) return;
  state.pendingBackupRestore = null;
  document.getElementById("restoreDialog")?.close();
  setBackupBusy(true);
  setBackupStatus(t("backup.loading"));
  try {
    const response = await fetch("/api/weights", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "restore", pathname: pending.pathname })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || t("backup.restoreError"));
    state.records = sortDailyRecords((payload.records || []).map(normalizeClientRecord));
    renderAll();
    setBackupStatus(t("backup.restored"));
    toast(t("backup.restored"));
    await loadRestorePoints();
  } catch (error) {
    setBackupStatus(error.message || t("backup.restoreError"), "error");
  } finally {
    setBackupBusy(false);
  }
}

function updateAuthUI() {
  if (!state.authenticated) {
    state.normEditor = null;
    state.expenseEditor = null;
  }
  const loginButton = document.getElementById("loginButton");
  const userChip = document.getElementById("userChip");
  const userLabel = document.getElementById("userLabel");
  if (loginButton) loginButton.hidden = state.authenticated;
  if (userChip) userChip.hidden = !state.authenticated;
  if (userLabel) userLabel.textContent = state.userEmail || "Admin";
  const adminLink = document.getElementById("adminLink");
  if (adminLink) adminLink.hidden = !(state.authenticated && state.isAdmin);
  const backupPanel = document.getElementById("historyBackupPanel");
  if (backupPanel) {
    backupPanel.hidden = !state.authenticated;
    if (state.authenticated) loadRestorePoints();
  }
  if (page === "dashboard") updateDerivedUI();
  renderHistoryTable();
}

async function refreshAuthStatus() {
  try {
    const response = await fetch("/api/auth/status", { credentials: "same-origin", cache: "no-store" });
    if (!response.ok) throw new Error("not signed in");
    const payload = await response.json();
    state.authenticated = Boolean(payload.authenticated);
    state.isAdmin = Boolean(payload.isAdmin);
    state.userEmail = payload.email || "";
  } catch {
    state.authenticated = false;
    state.isAdmin = false;
    state.userEmail = "";
  }
  updateAuthUI();
}

async function loadAuthConfig() {
  try {
    const response = await fetch("/api/config", { cache: "no-store" });
    const payload = await response.json();
    state.googleClientId = payload.googleClientId || "";
    state.loginReady = Boolean(payload.loginReady && state.googleClientId);
  } catch {
    state.loginReady = false;
  }
}

async function loadGoogleScript() {
  if (window.google?.accounts?.id) return;
  await new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-google-gsi="true"]');
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleGsi = "true";
    script.addEventListener("load", resolve, { once: true });
    script.addEventListener("error", reject, { once: true });
    document.head.append(script);
  });
}

async function verifyGoogleCredential(credential) {
  const remember = Boolean(document.getElementById("rememberMe")?.checked);
  const response = await fetch("/api/auth/verify", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential, remember })
  });
  if (!response.ok) throw new Error(t("auth.failed"));
  await refreshAuthStatus();
}

async function renderGoogleButton() {
  const authState = document.getElementById("authState");
  const shell = document.getElementById("googleButtonShell");
  if (!authState || !shell) return;
  shell.replaceChildren();
  if (!state.loginReady) {
    authState.textContent = t("auth.unavailable");
    return;
  }
  try {
    await loadGoogleScript();
    authState.textContent = t("auth.ready");
    window.google.accounts.id.initialize({
      client_id: state.googleClientId,
      callback: async ({ credential }) => {
        try {
          authState.textContent = t("auth.checking");
          await verifyGoogleCredential(credential);
          document.getElementById("authDialog")?.close();
          if (state.pendingRecordAction) {
            const action = state.pendingRecordAction;
            state.pendingRecordAction = null;
            if (action.type === "quick-add") openGrowthQuickAdd(action.date);
            else openRecordDialog(action.type, action.date);
          }
          if (state.pendingSetting) {
            const pendingSetting = state.pendingSetting;
            state.pendingSetting = null;
            if (pendingSetting.startsWith("expense:")) {
              const id = pendingSetting.slice("expense:".length);
              beginExpenseEditor(id === "new" ? null : orderForId(id));
            }
          }
        } catch (error) {
          authState.textContent = error.message;
        }
      }
    });
    window.google.accounts.id.renderButton(shell, { theme: state.theme === "dark" ? "filled_black" : "outline", size: "large", width: 300 });
  } catch {
    authState.textContent = t("auth.failed");
  }
}

function openAuthDialog() {
  const dialog = document.getElementById("authDialog");
  if (!dialog) return;
  document.getElementById("authState").textContent = t("auth.checking");
  dialog.showModal();
  renderGoogleButton();
}

function wireChartToggle(id, stateKey, redraw) {
  document.getElementById(id)?.addEventListener("change", (event) => {
    state[stateKey] = event.target.checked;
    redraw();
  });
}

function wireEvents() {
  document.getElementById("refreshButton")?.addEventListener("click", () => {
    savePageScrollPosition();
    location.reload();
  });

  document.getElementById("languageButton")?.addEventListener("click", () => {
    state.lang = state.lang === "ru" ? "en" : "ru";
    writeCookie("porschik_lang", state.lang);
    applyTranslations();
    renderAll();
    if (page === "history" && state.authenticated) loadRestorePoints();
  });
  document.getElementById("expenseProjectionInfoButton")?.addEventListener("click", () => {
    state.expenseProjectionInfoOpen = !state.expenseProjectionInfoOpen;
    renderExpenses();
  });
  document.getElementById("themeButton")?.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    applyTheme();
    growthChart?.draw();
    drawNormChart();
    drawExpenseChart();
  });
  document.getElementById("loginButton")?.addEventListener("click", openAuthDialog);
  document.getElementById("logoutButton")?.addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).catch(() => {});
    await refreshAuthStatus();
  });
  document.getElementById("avatarButton")?.addEventListener("click", () => {
    if (!state.authenticated) return openAuthDialog();
    document.getElementById("avatarInput")?.click();
  });
  document.getElementById("avatarInput")?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (file) uploadAvatar(file);
  });
  document.getElementById("mealCountEditButton")?.addEventListener("click", openMealCountDialog);
  document.getElementById("mealCountForm")?.addEventListener("submit", submitMealCount);
  document.getElementById("mealCountDate")?.addEventListener("change", () => {
    const date = document.getElementById("mealCountDate")?.value;
    if (!date) return;
    const plan = feedingPlanForDate(date, activeDogProfile());
    const radio = document.querySelector(`input[name="mealsPerDay"][value="${plan.mealsPerDay}"]`);
    if (radio) radio.checked = true;
    updateMealCountPreview();
  });
  document.querySelectorAll('input[name="mealsPerDay"]').forEach((input) => input.addEventListener("change", updateMealCountPreview));
  document.getElementById("mealCountAutoButton")?.addEventListener("click", resetMealCountToAutomatic);
  document.getElementById("mealCountHistory")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-meal-count]");
    if (button) deleteMealCountChange(button.dataset.deleteMealCount);
  });
  document.getElementById("normInlineAddButton")?.addEventListener("click", beginNormAdd);
  document.getElementById("normTimelineList")?.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-edit-inline-norm]");
    if (editButton) return beginNormEdit(editButton.dataset.editInlineNorm);
    const deleteButton = event.target.closest("[data-delete-inline-norm]");
    if (deleteButton) return deleteNormInline(deleteButton.dataset.deleteInlineNorm);
    if (event.target.closest("[data-save-inline-norm]")) return saveNormInlineEditor();
    if (event.target.closest("[data-cancel-inline-norm]")) cancelNormInlineEditor();
  });
  document.getElementById("normTimelineList")?.addEventListener("keydown", (event) => {
    if (!state.normEditor) return;
    if (event.key === "Escape") {
      event.preventDefault();
      cancelNormInlineEditor();
    } else if (event.key === "Enter" && !event.target.closest("button")) {
      event.preventDefault();
      saveNormInlineEditor();
    }
  });
  document.getElementById("downloadBackupButton")?.addEventListener("click", downloadBackup);
  document.getElementById("restoreBackupButton")?.addEventListener("click", restoreSelectedBackup);
  document.getElementById("confirmRestoreButton")?.addEventListener("click", confirmSelectedBackupRestore);
  document.getElementById("retryLoadButton")?.addEventListener("click", loadRecords);
  document.getElementById("growthQuickAddButton")?.addEventListener("click", () => {
    if (state.growthQuickAddOpen) closeGrowthQuickAdd();
    else openGrowthQuickAdd();
  });
  document.getElementById("growthQuickAddRow")?.addEventListener("click", handleHistoryAction);
  document.getElementById("growthQuickAddRow")?.addEventListener("keydown", handleHistoryKeydown);
  document.querySelectorAll("[data-open-record]").forEach((button) => button.addEventListener("click", () => openRecordDialog(button.dataset.openRecord, today)));
  document.querySelectorAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => document.getElementById(button.dataset.closeDialog)?.close()));
  document.querySelectorAll("[data-record-tab]").forEach((button) => button.addEventListener("click", () => setRecordTab(button.dataset.recordTab)));
  wireChartToggle("showGrowthWeight", "showGrowthWeight", () => growthChart?.draw());
  wireChartToggle("showGrowthActual", "showGrowthActual", () => growthChart?.draw());
  wireChartToggle("showGrowthTarget", "showGrowthTarget", () => growthChart?.draw());
  wireChartToggle("showNormTarget", "showNormTarget", drawNormChart);
  wireChartToggle("showNormActual", "showNormActual", drawNormChart);
  wireChartToggle("showExpenseFood", "showExpenseFood", drawExpenseChart);
  wireChartToggle("showExpenseDelivery", "showExpenseDelivery", drawExpenseChart);
  wireChartToggle("showExpensePriceKg", "showExpensePriceKg", drawExpenseChart);
  document.querySelectorAll("[data-chart-range-start], [data-chart-range-end]").forEach((input) => {
    const key = input.dataset.chartRangeStart || input.dataset.chartRangeEnd;
    input.addEventListener("input", () => updateChartRangeFromInputs(key));
    input.addEventListener("change", () => updateChartRangeFromInputs(key, true));
  });
  document.querySelectorAll("[data-chart-range-window]").forEach(wireChartRangeWindow);
  document.getElementById("weightValue")?.addEventListener("input", (event) => {
    document.getElementById("weightRange").value = event.target.value;
  });
  document.getElementById("weightRange")?.addEventListener("input", (event) => {
    document.getElementById("weightValue").value = Number(event.target.value).toFixed(2);
  });
  document.getElementById("weightForm")?.addEventListener("submit", submitWeight);
  document.getElementById("deleteWeightButton")?.addEventListener("click", deleteWeightValue);
  document.getElementById("weightDate")?.addEventListener("change", (event) => populateWeightForm(event.target.value));
  document.getElementById("feedingForm")?.addEventListener("submit", submitFeeding);
  document.getElementById("feedingDate")?.addEventListener("change", (event) => {
    const oldMeals = mealFormValues();
    const savedMeals = recordForDate(event.target.value)?.meals;
    const nextPlan = feedingPlanForDate(event.target.value, activeDogProfile());
    const meals = savedMeals || oldMeals.filter((meal) => meal.slot <= nextPlan.mealsPerDay);
    buildMealControls(event.target.value, meals);
  });
  document.getElementById("mealsContainer")?.addEventListener("input", (event) => {
    const slot = event.target.dataset.mealValue || event.target.dataset.mealRange;
    if (event.target.dataset.mealValue) {
      document.querySelector(`[data-meal-range="${slot}"]`).value = Math.min(500, Number(event.target.value) || 1);
    } else if (event.target.dataset.mealRange) {
      document.querySelector(`[data-meal-value="${slot}"]`).value = event.target.value;
    }
    updateFeedingSummary();
  });
  document.getElementById("mealsContainer")?.addEventListener("change", (event) => {
    if (!event.target.dataset.mealSkip) return;
    const slot = event.target.dataset.mealSkip;
    const value = document.querySelector(`[data-meal-value="${slot}"]`);
    const range = document.querySelector(`[data-meal-range="${slot}"]`);
    value.disabled = event.target.checked;
    range.disabled = event.target.checked;
    if (event.target.checked) value.value = "";
    else if (!value.value) value.value = range.value || "100";
    updateFeedingSummary();
  });
  document.getElementById("historyTableBody")?.addEventListener("click", handleHistoryAction);
  document.getElementById("historyTableBody")?.addEventListener("keydown", handleHistoryKeydown);
  document.getElementById("mobileRecordList")?.addEventListener("click", handleHistoryAction);
  document.getElementById("addHistoryRowButton")?.addEventListener("click", addHistoryDraft);
  document.getElementById("addExpenseButton")?.addEventListener("click", () => beginExpenseEditor());
  document.getElementById("expenseOrderList")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-edit-expense]");
    if (button) return beginExpenseEditor(orderForId(button.dataset.editExpense));
    if (event.target.closest("[data-cancel-inline-expense]")) return cancelExpenseInlineEditor();
    if (event.target.closest("[data-delete-inline-expense]")) deleteExpenseInlineEditor();
  });
  document.getElementById("expenseOrderList")?.addEventListener("submit", saveExpenseInlineEditor);
  document.getElementById("expenseOrderList")?.addEventListener("input", (event) => {
    const form = event.target.closest("[data-expense-editor-row]");
    if (form) updateExpenseInlineTotal(form);
  });
  document.getElementById("expenseOrderList")?.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.expenseEditor) {
      event.preventDefault();
      cancelExpenseInlineEditor();
    }
  });
  document.getElementById("expenseChart")?.addEventListener("pointermove", (event) => {
    const point = nearestExpensePoint(event);
    if (!point) return hideExpenseTooltip();
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (Math.min(Math.abs(point.x - x), Math.hypot(point.x - x, point.lineY - y)) > 32) return hideExpenseTooltip();
    showExpenseTooltip(point);
  });
  document.getElementById("expenseChart")?.addEventListener("pointerleave", hideExpenseTooltip);
  document.getElementById("expenseChart")?.addEventListener("click", (event) => {
    const point = nearestExpensePoint(event);
    if (point) showExpenseTooltip(point);
  });
  addEventListener("resize", () => { drawNormChart(); drawExpenseChart(); });
  document.querySelectorAll("dialog").forEach((dialog) => dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  }));
}

function handleHistoryAction(event) {
  const inlineSave = event.target.closest("[data-inline-save]");
  if (inlineSave) return saveInlineEditor();
  const inlineCancel = event.target.closest("[data-inline-cancel]");
  if (inlineCancel) return cancelInlineEditor();
  const discardDraft = event.target.closest("[data-discard-history-draft]");
  if (discardDraft) return discardHistoryDraft();
  const deleteButton = event.target.closest("[data-delete-record]");
  if (deleteButton) return deleteRecord(deleteButton.dataset.deleteRecord);
  const editableCell = event.target.closest("[data-inline-field]");
  if (editableCell && !event.target.closest("input, button, label")) openInlineEditor(editableCell);
}

function handleHistoryKeydown(event) {
  const editableCell = event.target.closest("[data-inline-field]");
  if (!editableCell) return;
  if (event.key === "Escape" && state.inlineEditor) {
    event.preventDefault();
    cancelInlineEditor();
    return;
  }
  if (state.inlineEditor && event.key === "Enter" && !event.target.closest("button, [type=checkbox]")) {
    event.preventDefault();
    saveInlineEditor();
    return;
  }
  if (!state.inlineEditor && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    openInlineEditor(editableCell);
  }
}

async function init() {
  mountGrowthChartPanel();
  applyTheme();
  initGrowthChart();
  initNormChartInteraction();
  wireEvents();
  applyTranslations();
  setRecordTab("weight");
  await Promise.all([loadRecords(), loadExpenses(), loadProfile(), loadAuthConfig(), refreshAuthStatus()]);
  renderAll();
  restorePageScrollPosition();
}

init();
