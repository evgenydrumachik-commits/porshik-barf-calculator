import {
  DOG_PROFILE,
  actualDailyGrams,
  actualMealCount,
  addDays,
  ageOn,
  feedingPlanForDate,
  formatAge,
  intakeDifferencePercent,
  latestWeightRecord,
  projectedBarfForWeight,
  recommendationFor,
  sortDailyRecords,
  todayInTimezone
} from "./domain.mjs";

const page = document.body.dataset.page || "dashboard";
const today = todayInTimezone();

const state = {
  records: [],
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
  pendingSetting: null,
  avatarUrl: "/assets/porschik.jpg",
  feedingSettings: {
    puppyRatio: DOG_PROFILE.puppyRatio,
    adultRatio: DOG_PROFILE.adultRatio,
    transitionDays: DOG_PROFILE.transitionDays,
    targetAdultWeightKg: DOG_PROFILE.targetAdultWeightKg
  },
  activeSetting: null,
  backupBusy: false,
  pendingBackupRestore: null,
  inlineEditor: null,
  inlineSaving: false,
  historyDraft: null,
  showWeight: true,
  showFood: true
};

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
    "chart.subtitle": "Синий — вес, цветные точки — сколько съедено за каждый приём.",
    "chart.historySubtitle": "Нажмите точку, чтобы отредактировать её данные.",
    "chart.weightSeries": "Вес",
    "chart.foodSeries": "Питание",
    "chart.weightLegend": "Вес, кг",
    "chart.meal1": "Приём 1",
    "chart.meal2": "Приём 2",
    "chart.meal3": "Приём 3",
    "chart.leftAxis": "Вес, кг",
    "chart.rightAxis": "За приём, г",
    "chart.recommended": "Норма за приём",
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
    "action.login": "Войти",
    "action.logout": "Выйти",
    "action.admin": "Администрирование",
    "action.changePhoto": "Изменить фотографию Поршика",
    "action.editFeedingSettings": "Изменить параметр кормления",
    "action.deleteWeight": "Удалить вес",
    "replace.title": "Запись за этот день уже есть",
    "replace.before": "Было",
    "replace.after": "Станет",
    "replace.confirm": "Заменить значение",
    "replace.introWeight": "За {date} уже сохранены данные. Проверьте изменение веса перед заменой.",
    "replace.introFeeding": "За {date} уже сохранены данные. Проверьте новые приёмы пищи перед заменой.",
    "replace.keepFeeding": "Вес будет заменён; питание за этот день останется без изменений.",
    "replace.keepWeight": "Питание будет заменено; вес за этот день останется без изменений.",
    "settings.reset": "Сбросить к рекомендации",
    "settings.puppyRatio": "Щенячья норма",
    "settings.adultRatio": "Взрослая норма",
    "settings.transitionDays": "Плавность перехода",
    "settings.targetAdultWeightKg": "Целевой взрослый вес",
    "settings.recommended": "Рекомендация заводчицы: {value}. Это значение всегда можно восстановить кнопкой сброса.",
    "settings.difference": "Отклонение от рекомендации: {absolute} ({percent}%)",
    "settings.noDifference": "Используется исходная рекомендация заводчицы.",
    "settings.saved": "Настройка сохранена.",
    "settings.error": "Не удалось сохранить настройку.",
    "backup.title": "Резервные копии данных",
    "backup.subtitle": "Точка восстановления создаётся при каждом сохранении. Здесь можно скачать данные или вернуться к предыдущей версии.",
    "backup.automatic": "Автокопирование включено",
    "backup.download": "Скачать backup",
    "backup.restorePoint": "Версия для восстановления",
    "backup.loading": "Загружаем список…",
    "backup.empty": "Резервных копий пока нет",
    "backup.select": "Выберите резервную копию",
    "backup.restore": "Восстановить",
    "backup.daily": "Копия дня",
    "backup.snapshot": "Автокопия",
    "backup.downloaded": "Backup скачан.",
    "backup.restored": "Данные восстановлены из резервной копии.",
    "backup.confirmTitle": "Восстановить резервную копию?",
    "backup.confirm": "Восстановить данные из «{name}»? Текущие записи будут заменены.",
    "backup.confirmAction": "Восстановить данные",
    "backup.loadError": "Не удалось загрузить список резервных копий.",
    "backup.downloadError": "Не удалось скачать резервную копию.",
    "backup.restoreError": "Не удалось восстановить данные.",
    "feeding.eyebrow": "BARF сегодня",
    "feeding.title": "Питание без ручных настроек",
    "feeding.subtitle": "Возраст, фаза, процент и число кормлений рассчитываются автоматически от даты рождения.",
    "feeding.daily": "В день",
    "feeding.perMeal": "За приём",
    "feeding.meals": "Приёмов",
    "barf.title": "Норма BARF по весу",
    "barf.subtitle": "Щенячья норма, плавный переход и взрослый ориентир на одном графике.",
    "barf.puppy": "Щенячья норма",
    "barf.transition": "Переход",
    "barf.adult": "Взрослая норма",
    "barf.dailyAxis": "Норма в день, г",
    "barf.weightAxis": "Вес, кг",
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
    "feeding.puppyStatus": "Щенячья фаза: {percent}% веса · 3 кормления",
    "feeding.transitionStatus": "Переход к взрослой норме: {percent}% · 2 кормления",
    "feeding.adultStatus": "Взрослая фаза: {percent}% веса · 2 кормления",
    "tooltip.weight": "Вес",
    "tooltip.change": "Изменение",
    "tooltip.actualMeals": "Фактически приёмов",
    "tooltip.total": "Всего за день",
    "tooltip.recommended": "Норма за приём",
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
    "chart.subtitle": "Blue is weight; colored points show the amount eaten at each meal.",
    "chart.historySubtitle": "Select a point to edit its data.",
    "chart.weightSeries": "Weight",
    "chart.foodSeries": "Feeding",
    "chart.weightLegend": "Weight, kg",
    "chart.meal1": "Meal 1",
    "chart.meal2": "Meal 2",
    "chart.meal3": "Meal 3",
    "chart.leftAxis": "Weight, kg",
    "chart.rightAxis": "Per meal, g",
    "chart.recommended": "Target per meal",
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
    "action.login": "Sign in",
    "action.logout": "Sign out",
    "action.admin": "Administration",
    "action.changePhoto": "Change Porschik's photo",
    "action.editFeedingSettings": "Edit feeding setting",
    "action.deleteWeight": "Delete weight",
    "replace.title": "A record already exists for this day",
    "replace.before": "Before",
    "replace.after": "After",
    "replace.confirm": "Replace value",
    "replace.introWeight": "Data is already saved for {date}. Review the weight change before replacing it.",
    "replace.introFeeding": "Data is already saved for {date}. Review the new meals before replacing them.",
    "replace.keepFeeding": "The weight will be replaced; feeding for this day will remain unchanged.",
    "replace.keepWeight": "Feeding will be replaced; the weight for this day will remain unchanged.",
    "settings.reset": "Reset to recommendation",
    "settings.puppyRatio": "Puppy target",
    "settings.adultRatio": "Adult target",
    "settings.transitionDays": "Transition duration",
    "settings.targetAdultWeightKg": "Adult target weight",
    "settings.recommended": "Breeder recommendation: {value}. You can always restore it with Reset.",
    "settings.difference": "Difference from recommendation: {absolute} ({percent}%)",
    "settings.noDifference": "The original breeder recommendation is in use.",
    "settings.saved": "Setting saved.",
    "settings.error": "The setting could not be saved.",
    "backup.title": "Data backups",
    "backup.subtitle": "A restore point is created after every save. Download the data or return to an earlier version here.",
    "backup.automatic": "Automatic backups enabled",
    "backup.download": "Download backup",
    "backup.restorePoint": "Version to restore",
    "backup.loading": "Loading backups…",
    "backup.empty": "No backups yet",
    "backup.select": "Choose a backup",
    "backup.restore": "Restore",
    "backup.daily": "Daily copy",
    "backup.snapshot": "Automatic copy",
    "backup.downloaded": "Backup downloaded.",
    "backup.restored": "Data was restored from the backup.",
    "backup.confirmTitle": "Restore backup?",
    "backup.confirm": "Restore data from “{name}”? Current records will be replaced.",
    "backup.confirmAction": "Restore data",
    "backup.loadError": "The backup list could not be loaded.",
    "backup.downloadError": "The backup could not be downloaded.",
    "backup.restoreError": "The data could not be restored.",
    "feeding.eyebrow": "BARF today",
    "feeding.title": "Feeding without manual settings",
    "feeding.subtitle": "Age, phase, percentage and meal count are calculated from the birth date.",
    "feeding.daily": "Per day",
    "feeding.perMeal": "Per meal",
    "feeding.meals": "Meals",
    "barf.title": "BARF target by weight",
    "barf.subtitle": "Puppy target, gradual transition and adult reference on one chart.",
    "barf.puppy": "Puppy target",
    "barf.transition": "Transition",
    "barf.adult": "Adult target",
    "barf.dailyAxis": "Daily target, g",
    "barf.weightAxis": "Weight, kg",
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
    "feeding.puppyStatus": "Puppy phase: {percent}% of weight · 3 meals",
    "feeding.transitionStatus": "Adult transition: {percent}% · 2 meals",
    "feeding.adultStatus": "Adult phase: {percent}% of weight · 2 meals",
    "tooltip.weight": "Weight",
    "tooltip.change": "Change",
    "tooltip.actualMeals": "Actual meals",
    "tooltip.total": "Daily total",
    "tooltip.recommended": "Target per meal",
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

function settingDescriptor(key) {
  const isRussian = state.lang === "ru";
  const descriptors = {
    puppyRatio: {
      key,
      title: t("settings.puppyRatio"),
      recommended: DOG_PROFILE.puppyRatio,
      min: 3,
      max: 12,
      step: 0.1,
      unit: "%",
      toInput: (value) => Number(value) * 100,
      fromInput: (value) => Number(value) / 100,
      display: (value) => formatRatio(value),
      differenceUnit: isRussian ? "п.п." : "pp"
    },
    adultRatio: {
      key,
      title: t("settings.adultRatio"),
      recommended: DOG_PROFILE.adultRatio,
      min: 1,
      max: 6,
      step: 0.1,
      unit: "%",
      toInput: (value) => Number(value) * 100,
      fromInput: (value) => Number(value) / 100,
      display: (value) => formatRatio(value),
      differenceUnit: isRussian ? "п.п." : "pp"
    },
    transitionDays: {
      key,
      title: t("settings.transitionDays"),
      recommended: DOG_PROFILE.transitionDays,
      min: 1,
      max: 8,
      step: 1,
      unit: isRussian ? "нед." : "wk",
      toInput: (value) => Number(value) / 7,
      fromInput: (value) => Math.round(Number(value) * 7),
      display: (value) => `${formatNumber(Number(value) / 7, 1)} ${isRussian ? "нед." : "wk"}`,
      differenceUnit: isRussian ? "нед." : "wk"
    },
    targetAdultWeightKg: {
      key,
      title: t("settings.targetAdultWeightKg"),
      recommended: DOG_PROFILE.targetAdultWeightKg,
      min: 8,
      max: 18,
      step: 0.1,
      unit: t("unit.kg"),
      toInput: Number,
      fromInput: Number,
      display: (value) => `${formatNumber(value, 1)} ${t("unit.kg")}`,
      differenceUnit: t("unit.kg")
    }
  };
  return descriptors[key];
}

function updateSettingChips() {
  for (const key of ["puppyRatio", "transitionDays", "adultRatio", "targetAdultWeightKg"]) {
    const element = document.querySelector(`[data-setting-value="${key}"]`);
    if (element) element.textContent = settingDescriptor(key).display(state.feedingSettings[key]);
  }
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
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    element.setAttribute("placeholder", t(element.dataset.i18nPlaceholder));
  });
  const languageButton = document.getElementById("languageButton");
  if (languageButton) languageButton.textContent = state.lang === "ru" ? "EN" : "RU";
  updateDerivedUI();
}

function phaseLabel(plan) {
  const percent = formatNumber(plan.ratio * 100, 1);
  if (plan.phase === "puppy") return t("stage.puppy", { percent });
  if (plan.phase === "adult") return t("stage.adult", { percent });
  return t("stage.transition", { percent });
}

function feedingStatusLabel(plan) {
  const percent = formatNumber(plan.ratio * 100, 1);
  if (plan.phase === "puppy") return t("feeding.puppyStatus", { percent });
  if (plan.phase === "adult") return t("feeding.adultStatus", { percent });
  return t("feeding.transitionStatus", { percent });
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

function updateDerivedUI() {
  const plan = feedingPlanForDate(today, activeDogProfile());
  const latest = latestWeightRecord(state.records, today);
  const recommendation = recommendationFor(latest?.weightKg || 0, today, activeDogProfile());
  const ageElement = document.getElementById("dogAge");
  if (ageElement) ageElement.textContent = formatAge(ageOn(today), state.lang);
  const stagePillText = document.getElementById("stagePillText");
  if (stagePillText) stagePillText.textContent = phaseLabel(plan);
  const stagePillEdit = document.getElementById("stagePillEdit");
  if (stagePillEdit) stagePillEdit.dataset.editSetting = plan.phase === "puppy" ? "puppyRatio" : plan.phase === "adult" ? "adultRatio" : "transitionDays";

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
  const feedingStatusEdit = document.getElementById("feedingStatusEdit");
  if (feedingStatusEdit) feedingStatusEdit.dataset.editSetting = plan.phase === "puppy" ? "puppyRatio" : plan.phase === "adult" ? "adultRatio" : "transitionDays";
  const dailyRecommendation = document.getElementById("dailyRecommendation");
  if (dailyRecommendation) dailyRecommendation.textContent = latest ? `${formatNumber(Math.round(recommendation.dailyGrams))} ${t("unit.g")}` : "—";
  const mealRecommendation = document.getElementById("mealRecommendation");
  if (mealRecommendation) mealRecommendation.textContent = latest ? `${formatNumber(Math.round(recommendation.mealGrams))} ${t("unit.g")}` : "—";
  const mealCount = document.getElementById("mealCountRecommendation");
  if (mealCount) mealCount.textContent = String(plan.mealsPerDay);

  const historyRecordCount = document.getElementById("historyRecordCount");
  if (historyRecordCount) historyRecordCount.textContent = t("records.count", { count: state.records.length });
  updateSettingChips();
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
    this.onActivate = () => {};
    this.resizeObserver = new ResizeObserver(() => this.draw());
    this.resizeObserver.observe(wrap);
    canvas.addEventListener("pointermove", (event) => this.handlePointerMove(event));
    canvas.addEventListener("pointerleave", () => this.hideTooltip());
    canvas.addEventListener("click", (event) => {
      const point = this.nearestPoint(event);
      if (point) this.onActivate(point);
    });
  }

  setData(records) {
    this.records = sortDailyRecords(records);
    this.draw();
  }

  draw() {
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

    const records = this.records || [];
    this.wrap.classList.toggle("is-empty", records.length === 0);
    this.points = [];
    this.hitLayer.replaceChildren();
    if (!records.length) return;

    const area = {
      left: width < 560 ? 58 : 82,
      right: width - (width < 560 ? 58 : 82),
      top: 24,
      bottom: height - 48
    };
    const times = records.map((record) => Date.parse(`${record.date}T00:00:00Z`));
    let minTime = Math.min(...times);
    let maxTime = Math.max(...times);
    if (minTime === maxTime) {
      minTime -= 7 * 86_400_000;
      maxTime += 7 * 86_400_000;
    }
    const xFor = (time) => area.left + ((time - minTime) / (maxTime - minTime)) * (area.right - area.left);

    const weights = records.filter((record) => Number.isFinite(record.weightKg)).map((record) => record.weightKg);
    const minWeight = weights.length ? Math.max(0, Math.floor((Math.min(...weights) - 0.5) * 2) / 2) : 0;
    const maxWeight = weights.length ? Math.max(minWeight + 1, Math.ceil((Math.max(...weights) + 0.5) * 2) / 2) : 10;
    const yWeight = (value) => area.bottom - ((value - minWeight) / (maxWeight - minWeight)) * (area.bottom - area.top);

    const mealValues = records.flatMap((record) => record.meals.filter((meal) => !meal.skipped && Number(meal.grams) > 0).map((meal) => meal.grams));
    const recommendedValues = records.map((record) => {
      const latest = latestWeightRecord(records, record.date);
      return recommendationFor(latest?.weightKg || 0, record.date, activeDogProfile()).mealGrams;
    });
    const maxFood = Math.max(100, ...mealValues, ...recommendedValues);
    const foodTop = Math.ceil(maxFood / 50) * 50;
    const yFood = (value) => area.bottom - (value / foodTop) * (area.bottom - area.top);

    ctx.save();
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.fillStyle = muted;
    ctx.font = "700 10px Inter, system-ui, sans-serif";
    for (let index = 0; index <= 4; index += 1) {
      const fraction = index / 4;
      const y = area.bottom - fraction * (area.bottom - area.top);
      ctx.beginPath();
      ctx.moveTo(area.left, y);
      ctx.lineTo(area.right, y);
      ctx.stroke();
      ctx.textBaseline = "middle";
      ctx.textAlign = "right";
      ctx.fillText(`${formatNumber(minWeight + fraction * (maxWeight - minWeight), 1)} ${t("unit.kg")}`, area.left - 7, y);
      ctx.textAlign = "left";
      ctx.fillText(`${formatNumber(fraction * foodTop)} ${t("unit.g")}`, area.right + 7, y);
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let index = 0; index <= 3; index += 1) {
      const time = minTime + (index / 3) * (maxTime - minTime);
      const x = xFor(time);
      ctx.fillText(formatDate(new Date(time).toISOString().slice(0, 10), { day: "2-digit", month: "short" }), x, area.bottom + 12);
    }
    ctx.restore();

    if (state.showFood) {
      const targetPoints = records.map((record) => {
        const latest = latestWeightRecord(records, record.date);
        return {
          x: xFor(Date.parse(`${record.date}T00:00:00Z`)),
          y: yFood(recommendationFor(latest?.weightKg || 0, record.date, activeDogProfile()).mealGrams)
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

    if (state.showWeight && weights.length) {
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

    if (state.showFood) {
      const colors = [coral, orange, yellow];
      const shapes = ["circle", "square", "diamond"];
      for (const record of records) {
        for (const meal of record.meals) {
          if (meal.skipped || !Number(meal.grams)) continue;
          const point = {
            kind: "feeding",
            slot: meal.slot,
            key: `meal-${record.date}-${meal.slot}`,
            record,
            x: xFor(Date.parse(`${record.date}T00:00:00Z`)) + (meal.slot - 2) * 5,
            y: yFood(meal.grams),
            color: colors[(meal.slot - 1) % colors.length]
          };
          this.drawMarker(ctx, point, shapes[(meal.slot - 1) % shapes.length], point.key === this.hoveredKey ? 7 : 5.5);
          this.points.push(point);
        }
      }
    }

    ctx.save();
    ctx.fillStyle = muted;
    ctx.font = "800 10px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.translate(width < 560 ? 11 : 18, (area.top + area.bottom) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(t("chart.leftAxis"), 0, 0);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = muted;
    ctx.font = "800 10px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.translate(width - (width < 560 ? 11 : 18), (area.top + area.bottom) / 2);
    ctx.rotate(Math.PI / 2);
    ctx.fillText(t("chart.rightAxis"), 0, 0);
    ctx.restore();

    this.renderHitTargets();
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
      button.addEventListener("click", () => this.onActivate(point));
      fragment.append(button);
    }
    this.hitLayer.append(fragment);
  }

  pointAriaLabel(point) {
    if (point.kind === "weight") {
      return `${formatDate(point.record.date)}: ${t("tooltip.weight")} ${formatNumber(point.record.weightKg, 2)} ${t("unit.kg")}`;
    }
    const meal = point.record.meals.find((item) => item.slot === point.slot);
    return `${formatDate(point.record.date)}: ${t("form.meal", { slot: point.slot })} ${formatNumber(meal?.grams || 0)} ${t("unit.g")}`;
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
    this.hoveredKey = point.key;
    const record = point.record;
    const previousWeight = state.records.filter((item) => item.date < record.date && Number.isFinite(item.weightKg)).at(-1);
    const change = Number.isFinite(record.weightKg) && previousWeight ? record.weightKg - previousWeight.weightKg : null;
    const changePercent = change !== null ? percentChange(previousWeight.weightKg, record.weightKg) : null;
    const latest = latestWeightRecord(state.records, record.date);
    const recommendation = recommendationFor(latest?.weightKg || 0, record.date, activeDogProfile());
    const mealRows = record.meals.map((meal) => `
      <span>${escapeHtml(t("form.meal", { slot: meal.slot }))}</span>
      <strong>${meal.skipped ? escapeHtml(t("tooltip.skipped")) : `${formatNumber(meal.grams)} ${escapeHtml(t("unit.g"))}`}</strong>
    `).join("");
    this.tooltip.innerHTML = `
      <strong class="tooltip-date">${escapeHtml(formatDate(record.date))}</strong>
      <div class="tooltip-grid">
        ${Number.isFinite(record.weightKg) ? `<span>${escapeHtml(t("tooltip.weight"))}</span><strong>${formatNumber(record.weightKg, 2)} ${escapeHtml(t("unit.kg"))}</strong>` : ""}
        ${change !== null ? `<span>${escapeHtml(t("tooltip.change"))}</span><strong>${change > 0 ? "+" : ""}${formatNumber(change, 2)} ${escapeHtml(t("unit.kg"))}<small class="replace-delta">${changePercent > 0 ? "+" : ""}${formatNumber(changePercent, 1)}%</small></strong>` : ""}
        ${mealRows}
        ${record.meals.length ? `<span>${escapeHtml(t("tooltip.actualMeals"))}</span><strong>${actualMealCount(record)}</strong><span>${escapeHtml(t("tooltip.total"))}</span><strong>${formatNumber(actualDailyGrams(record))} ${escapeHtml(t("unit.g"))}</strong>` : ""}
        <span>${escapeHtml(t("tooltip.recommended"))}</span><strong>${formatNumber(Math.round(recommendation.mealGrams))} ${escapeHtml(t("unit.g"))}</strong>
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
    this.hoveredKey = "";
    this.tooltip.hidden = true;
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
  growthChart.onActivate = (point) => openRecordDialog(point.kind === "weight" ? "weight" : "feeding", point.record.date);
}

function drawBarfChart() {
  const canvas = document.getElementById("barfChart");
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
  const area = { left: width < 560 ? 62 : 78, right: width - 24, top: 42, bottom: height - 50 };
  const xFor = (kg) => area.left + ((kg - 1) / 14) * (area.right - area.left);
  const profile = activeDogProfile();
  const projectionSamples = Array.from({ length: 141 }, (_, index) => projectedBarfForWeight(1 + index / 10, profile));
  const yMax = Math.ceil(Math.max(...projectionSamples.map((item) => item.dailyGrams)) / 100) * 100;
  const yFor = (grams) => area.bottom - (grams / yMax) * (area.bottom - area.top);
  const transitionStartWeight = profile.targetAdultWeightKg * profile.transitionStartWeightRatio;
  const targetWeight = profile.targetAdultWeightKg;
  const transitionLeft = xFor(transitionStartWeight);
  const transitionRight = xFor(targetWeight);

  ctx.fillStyle = colorWithAlpha(cssColor("--orange"), 0.09);
  ctx.fillRect(transitionLeft, area.top, transitionRight - transitionLeft, area.bottom - area.top);

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
    ctx.fillText(`${formatNumber(yMax * i / 4)} ${t("unit.g")}`, area.left - 7, y + 3);
  }

  const drawProjection = (fromWeight, toWeight, color) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    let first = true;
    for (let kg = fromWeight; kg <= toWeight + 0.001; kg += 0.03) {
      const clampedWeight = Math.min(kg, toWeight);
      const point = projectedBarfForWeight(clampedWeight, profile);
      const x = xFor(clampedWeight);
      const y = yFor(point.dailyGrams);
      if (first) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      first = false;
    }
    ctx.stroke();
    ctx.restore();
  };

  drawProjection(1, transitionStartWeight, cssColor("--coral"));
  drawProjection(transitionStartWeight, targetWeight, cssColor("--orange"));
  drawProjection(targetWeight, 15, cssColor("--mint"));

  ctx.save();
  ctx.font = "800 10px Inter, system-ui";
  ctx.textBaseline = "middle";
  const legend = [
    { color: cssColor("--coral"), label: `${t("barf.puppy")} ${formatRatio(profile.puppyRatio)}` },
    { color: cssColor("--orange"), label: `${t("barf.transition")} · ${formatNumber(profile.transitionDays / 7, 1)} ${state.lang === "ru" ? "нед." : "wk"}` },
    { color: cssColor("--mint"), label: `${t("barf.adult")} ${formatRatio(profile.adultRatio)}` }
  ];
  let legendX = area.left;
  for (const item of legend) {
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.arc(legendX + 4, 17, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = cssColor("--muted");
    ctx.textAlign = "left";
    ctx.fillText(item.label, legendX + 12, 17);
    legendX += ctx.measureText(item.label).width + 30;
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = colorWithAlpha(cssColor("--orange"), 0.6);
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(transitionLeft, area.top);
  ctx.lineTo(transitionLeft, area.bottom);
  ctx.moveTo(transitionRight, area.top);
  ctx.lineTo(transitionRight, area.bottom);
  ctx.stroke();
  ctx.restore();

  const latest = latestWeightRecord(state.records, today);
  if (latest) {
    const x = xFor(latest.weightKg);
    const current = projectedBarfForWeight(latest.weightKg, profile);
    const y = yFor(current.dailyGrams);
    ctx.save();
    ctx.strokeStyle = colorWithAlpha(cssColor("--blue"), 0.72);
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(area.left, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, area.bottom);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = cssColor("--blue");
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();

    drawCanvasPill(ctx, `${formatNumber(latest.weightKg, 2)} ${t("unit.kg")}`, x, area.bottom + 18, "center");
    drawCanvasPill(ctx, `${formatNumber(Math.round(current.dailyGrams))} ${t("unit.g")}`, area.left + 8, y - 15, "left");
    canvas.dataset.currentWeight = String(latest.weightKg);
    canvas.dataset.currentDaily = String(Math.round(current.dailyGrams));
    canvas.dataset.hasDropLines = "true";
  } else {
    delete canvas.dataset.currentWeight;
    delete canvas.dataset.currentDaily;
    canvas.dataset.hasDropLines = "false";
  }

  canvas.dataset.transitionStartWeight = String(transitionStartWeight);
  canvas.dataset.targetWeight = String(targetWeight);
  ctx.fillStyle = cssColor("--muted");
  ctx.textAlign = "center";
  for (const kg of [1, 5, 10, 15]) ctx.fillText(`${kg} ${t("unit.kg")}`, xFor(kg), area.bottom + 18);

  ctx.save();
  ctx.fillStyle = cssColor("--muted");
  ctx.font = "800 10px Inter, system-ui";
  ctx.textAlign = "center";
  ctx.translate(13, (area.top + area.bottom) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(t("barf.dailyAxis"), 0, 0);
  ctx.restore();
  ctx.fillStyle = cssColor("--muted");
  ctx.textAlign = "right";
  ctx.fillText(t("barf.weightAxis"), area.right, height - 8);
}

function renderHistoryTable() {
  const body = document.getElementById("historyTableBody");
  const mobileList = document.getElementById("mobileRecordList");
  if (!body || !mobileList) return;
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
      ${editableCell(record, "meal-1", escapeHtml(mealText(record, 1)))}
      ${editableCell(record, "meal-2", escapeHtml(mealText(record, 2)))}
      ${editableCell(record, "meal-3", escapeHtml(mealText(record, 3)))}
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

function renderAll() {
  updateDerivedUI();
  growthChart?.setData(state.records);
  drawBarfChart();
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

function updateSettingsDifference() {
  const descriptor = settingDescriptor(state.activeSetting);
  const input = document.getElementById("settingsValue");
  const output = document.getElementById("settingsDifference");
  if (!descriptor || !input || !output) return;
  const currentInput = Number(input.value);
  const recommendedInput = descriptor.toInput(descriptor.recommended);
  const difference = currentInput - recommendedInput;
  const relative = percentChange(recommendedInput, currentInput);
  if (!Number.isFinite(difference) || Math.abs(difference) < 0.0001) {
    output.textContent = t("settings.noDifference");
    return;
  }
  const absolute = `${difference > 0 ? "+" : ""}${formatNumber(difference, 1)} ${descriptor.differenceUnit}`;
  output.textContent = t("settings.difference", {
    absolute,
    percent: `${relative > 0 ? "+" : ""}${formatNumber(relative, 1)}`
  });
}

function openSettingDialog(key) {
  const descriptor = settingDescriptor(key);
  const dialog = document.getElementById("settingsDialog");
  if (!descriptor || !dialog) return;
  if (!state.authenticated) {
    state.pendingSetting = key;
    openAuthDialog();
    return;
  }
  state.activeSetting = key;
  document.getElementById("settingsDialogTitle").textContent = descriptor.title;
  document.getElementById("settingsFieldLabel").textContent = descriptor.title;
  document.getElementById("settingsUnit").textContent = descriptor.unit;
  document.getElementById("settingsRecommended").textContent = t("settings.recommended", {
    value: descriptor.display(descriptor.recommended)
  });
  const input = document.getElementById("settingsValue");
  input.min = String(descriptor.min);
  input.max = String(descriptor.max);
  input.step = String(descriptor.step);
  input.value = String(descriptor.toInput(state.feedingSettings[key]));
  document.getElementById("settingsMessage").textContent = "";
  updateSettingsDifference();
  dialog.showModal();
}

async function saveFeedingSetting() {
  const descriptor = settingDescriptor(state.activeSetting);
  const input = document.getElementById("settingsValue");
  const message = document.getElementById("settingsMessage");
  if (!descriptor || !input || !input.checkValidity()) {
    if (message) message.textContent = t("settings.error");
    return;
  }
  const nextSettings = {
    ...state.feedingSettings,
    [descriptor.key]: descriptor.fromInput(input.value)
  };
  if (message) message.textContent = "";
  try {
    const response = await fetch("/api/profile", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedingSettings: nextSettings })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || t("settings.error"));
    state.feedingSettings = { ...state.feedingSettings, ...payload.feedingSettings };
    renderAll();
    document.getElementById("settingsDialog")?.close();
    toast(t("settings.saved"));
  } catch (error) {
    if (message) message.textContent = error.message;
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
    const value = meal?.grams || Math.round(recommendationFor(latestWeightRecord(state.records, date)?.weightKg || 0, date, activeDogProfile()).mealGrams) || 100;
    return `
      <div class="meal-row" data-meal-slot="${slot}">
        <div class="meal-row-head">
          <span>${escapeHtml(t("form.meal", { slot }))}</span>
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
    const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] || `porschik-diary-backup-${today}.json`;
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
            openRecordDialog(action.type, action.date);
          }
          if (state.pendingSetting) {
            const setting = state.pendingSetting;
            state.pendingSetting = null;
            openSettingDialog(setting);
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

function wireEvents() {
  document.addEventListener("click", (event) => {
    const settingButton = event.target.closest("[data-edit-setting]");
    if (settingButton) openSettingDialog(settingButton.dataset.editSetting);
  });
  document.getElementById("languageButton")?.addEventListener("click", () => {
    state.lang = state.lang === "ru" ? "en" : "ru";
    writeCookie("porschik_lang", state.lang);
    applyTranslations();
    renderAll();
    if (page === "history" && state.authenticated) loadRestorePoints();
  });
  document.getElementById("themeButton")?.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    applyTheme();
    growthChart?.draw();
    drawBarfChart();
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
  document.getElementById("settingsValue")?.addEventListener("input", updateSettingsDifference);
  document.getElementById("settingsResetButton")?.addEventListener("click", () => {
    const descriptor = settingDescriptor(state.activeSetting);
    const input = document.getElementById("settingsValue");
    if (!descriptor || !input) return;
    input.value = String(descriptor.toInput(descriptor.recommended));
    updateSettingsDifference();
  });
  document.getElementById("settingsSaveButton")?.addEventListener("click", saveFeedingSetting);
  document.getElementById("downloadBackupButton")?.addEventListener("click", downloadBackup);
  document.getElementById("restoreBackupButton")?.addEventListener("click", restoreSelectedBackup);
  document.getElementById("confirmRestoreButton")?.addEventListener("click", confirmSelectedBackupRestore);
  document.getElementById("retryLoadButton")?.addEventListener("click", loadRecords);
  document.querySelectorAll("[data-open-record]").forEach((button) => button.addEventListener("click", () => openRecordDialog(button.dataset.openRecord, today)));
  document.querySelectorAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => document.getElementById(button.dataset.closeDialog)?.close()));
  document.querySelectorAll("[data-record-tab]").forEach((button) => button.addEventListener("click", () => setRecordTab(button.dataset.recordTab)));
  document.getElementById("showWeightSeries")?.addEventListener("change", (event) => {
    state.showWeight = event.target.checked;
    growthChart?.draw();
  });
  document.getElementById("showFoodSeries")?.addEventListener("change", (event) => {
    state.showFood = event.target.checked;
    growthChart?.draw();
  });
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
    const nextPlan = feedingPlanForDate(event.target.value, activeDogProfile());
    if (oldMeals.some((meal) => meal.slot > nextPlan.mealsPerDay) && !window.confirm(state.lang === "ru" ? "В выбранной фазе меньше плановых приёмов. Сохранить введённый дополнительный приём?" : "The selected phase has fewer planned meals. Keep the entered extra meal?")) {
      oldMeals.splice(nextPlan.mealsPerDay);
    }
    buildMealControls(event.target.value, recordForDate(event.target.value)?.meals || oldMeals);
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
  document.getElementById("barfDetails")?.addEventListener("toggle", drawBarfChart);
  addEventListener("resize", () => drawBarfChart());
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
  applyTheme();
  initGrowthChart();
  wireEvents();
  applyTranslations();
  setRecordTab("weight");
  await Promise.all([loadRecords(), loadProfile(), loadAuthConfig(), refreshAuthStatus()]);
  renderAll();
}

init();
