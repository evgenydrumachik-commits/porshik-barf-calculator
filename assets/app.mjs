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
  latestWeightRecord,
  recommendationFor,
  sortDailyRecords,
  todayInTimezone
} from "./domain.mjs";

const page = document.body.dataset.page || "dashboard";
const today = todayInTimezone();

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
  pendingSetting: null,
  avatarUrl: "/assets/porschik.jpg",
  feedingSettings: {
    feedingNorms: DEFAULT_FEEDING_NORMS.map((item) => ({ ...item }))
  },
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
    "action.login": "Войти",
    "action.logout": "Выйти",
    "action.admin": "Администрирование",
    "action.changePhoto": "Изменить фотографию Поршика",
    "action.editFeedingSettings": "Изменить историю норм",
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
    "settings.addNorm": "Добавить точку",
    "settings.removeNorm": "Удалить точку",
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
    "feeding.title": "Актуальная норма питания",
    "feeding.subtitle": "Процент меняется по заданному плану, а число кормлений — по возрасту.",
    "feeding.daily": "В день",
    "feeding.perMeal": "За приём",
    "feeding.meals": "Приёмов",
    "barf.title": "Норма и фактическое питание",
    "barf.subtitle": "План до взросления и сколько Поршик фактически съедает в % от веса.",
    "barf.norm": "Норма",
    "barf.actual": "Фактически съедено",
    "barf.future": "Будущий план",
    "barf.current": "Сейчас",
    "barf.adultStable": "Стабильная взрослая норма",
    "barf.completeDays": "Фактическая линия не включает сегодняшний незавершённый день.",
    "barf.percentAxis": "% от веса",
    "expense.eyebrow": "Расходы на питание",
    "expense.title": "Сколько стоит питание Поршика",
    "expense.subtitle": "Заказы еды, доставка и накопительные расходы в одной истории.",
    "expense.add": "Добавить заказ",
    "expense.total": "За всё время",
    "expense.year": "В этом году",
    "expense.annualPace": "Годовой темп",
    "expense.averageKg": "Средняя цена/кг",
    "expense.foodCost": "Стоимость еды",
    "expense.delivery": "Доставка",
    "expense.cumulative": "Накопительно",
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
    "action.login": "Sign in",
    "action.logout": "Sign out",
    "action.admin": "Administration",
    "action.changePhoto": "Change Porschik's photo",
    "action.editFeedingSettings": "Edit target history",
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
    "settings.addNorm": "Add point",
    "settings.removeNorm": "Remove point",
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
    "feeding.title": "Current feeding target",
    "feeding.subtitle": "The percentage follows the saved plan while meal count remains age-based.",
    "feeding.daily": "Per day",
    "feeding.perMeal": "Per meal",
    "feeding.meals": "Meals",
    "barf.title": "Target and actual feeding",
    "barf.subtitle": "The plan to adulthood and how much Porschik actually eats as a percentage of body weight.",
    "barf.norm": "Target",
    "barf.actual": "Actually eaten",
    "barf.future": "Future plan",
    "barf.current": "Current",
    "barf.adultStable": "Stable adult target",
    "barf.completeDays": "The actual line excludes today's incomplete day.",
    "barf.percentAxis": "% of body weight",
    "expense.eyebrow": "Food expenses",
    "expense.title": "What Porschik's food costs",
    "expense.subtitle": "Food orders, delivery and cumulative spend in one history.",
    "expense.add": "Add order",
    "expense.total": "All time",
    "expense.year": "This year",
    "expense.annualPace": "Annual pace",
    "expense.averageKg": "Average price/kg",
    "expense.foodCost": "Food cost",
    "expense.delivery": "Delivery",
    "expense.cumulative": "Cumulative",
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
  timeline.innerHTML = activeFeedingNorms().map((norm, index, norms) => {
    const isFuture = norm.date > today;
    const isAdult = index === norms.length - 1;
    const suffix = isAdult ? t("barf.adultStable") : isFuture ? t("barf.future") : "";
    const age = ageOn(norm.date);
    const ageLabel = state.lang === "en"
      ? `${age.years ? `${age.years}y ` : ""}${age.months}mo ${age.days}d`
      : `${age.years ? `${age.years}г ` : ""}${age.months}мес ${age.days}дн`;
    return `<li${norm.date === plan.normStartDate ? ` class="is-active"` : ""}>
      <span>${escapeHtml(formatDate(norm.date, { day: "2-digit", month: "short" }))}</span>
      <strong>${escapeHtml(formatRatio(norm.ratio))}</strong>
      <small><b>${escapeHtml(ageLabel)}</b>${suffix ? ` · ${escapeHtml(suffix)}` : ""}</small>
    </li>`;
  }).join("");
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

    const records = this.records || [];
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
    const times = records.map((record) => Date.parse(`${record.date}T00:00:00Z`));
    let minTime = Math.min(...times);
    let maxTime = Math.max(...times);
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
      ctx.textAlign = "left";
      ctx.fillText(`${formatNumber(fraction * foodTop)} ${t("unit.g")}`, plot.right + 7, foodY);
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

    if (state.showFood) {
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
    ctx.translate(width - (width < 560 ? 11 : 18), (foodArea.top + foodArea.bottom) / 2);
    ctx.rotate(Math.PI / 2);
    ctx.fillText(t("chart.rightAxis"), 0, 0);
    ctx.restore();

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
      button.addEventListener("click", () => this.onActivate(point));
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
  growthChart.onActivate = (point) => openRecordDialog(point.kind === "weight" ? "weight" : "feeding", point.record.date);
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
  const area = { left: width < 560 ? 48 : 58, right: width - 18, top: 18, bottom: height - 38 };
  const profile = activeDogProfile();
  const norms = activeFeedingNorms();
  if (!norms.length) return;
  const startDate = norms[0].date;
  const adultDate = norms.at(-1).date;
  const latestRecordDate = state.records.at(-1)?.date || today;
  const endDate = [adultDate, today, latestRecordDate].sort().at(-1);
  const minTime = Date.parse(`${startDate}T00:00:00Z`);
  const maxTime = Math.max(minTime + 86_400_000, Date.parse(`${endDate}T00:00:00Z`));
  const xFor = (date) => area.left + ((Date.parse(`${date}T00:00:00Z`) - minTime) / (maxTime - minTime)) * (area.right - area.left);
  const normPoints = [];
  for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
    normPoints.push({ date, ratio: feedingPlanForDate(date, profile).ratio });
  }
  const actualPoints = state.records
    .filter((record) => record.date >= startDate && record.date < today && record.meals.length)
    .map((record) => {
      const weight = latestWeightRecord(state.records, record.date)?.weightKg;
      const ratioValue = intakeRatioFor(actualDailyGrams(record), weight);
      return { date: record.date, ratio: ratioValue };
    })
    .filter((point) => Number.isFinite(point.ratio));
  const yMax = Math.max(0.08, Math.ceil(Math.max(...normPoints.map((point) => point.ratio), ...actualPoints.map((point) => point.ratio)) * 100) / 100);
  const yFor = (value) => area.bottom - (value / yMax) * (area.bottom - area.top);
  normInteractivePoints = [
    ...norms.map((point) => ({
      kind: "norm",
      key: `norm-${point.date}`,
      date: point.date,
      ratio: point.ratio,
      x: xFor(point.date),
      y: yFor(point.ratio)
    })),
    ...actualPoints.map((point) => ({
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
  drawLine(pastNorm, cssColor("--coral"));
  drawLine(futureNorm, cssColor("--coral"), true);
  drawLine(actualPoints, cssColor("--blue"), false, 2.5);

  for (const point of actualPoints) {
    ctx.fillStyle = cssColor("--blue");
    ctx.beginPath();
    ctx.arc(xFor(point.date), yFor(point.ratio), normHoveredKey === `actual-${point.date}` ? 6 : 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const norm of norms) {
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

  if (today >= startDate && today <= endDate) {
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
  if (today >= startDate && today <= endDate) {
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
  const hoverProbe = [...normInteractivePoints].reverse().find((point) => point.kind === "actual");
  canvas.dataset.hoverX = hoverProbe ? String(hoverProbe.x) : "";
  canvas.dataset.hoverY = hoverProbe ? String(hoverProbe.y) : "";
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

let expenseChartPoints = [];
let expenseHoveredId = "";

function expenseFormValues() {
  const kilograms = Number(document.getElementById("expenseKilograms")?.value || 0);
  const pricePerKg = Number(document.getElementById("expensePriceKg")?.value || 0);
  const deliveryCost = Number(document.getElementById("expenseDelivery")?.value || 0);
  return { kilograms, pricePerKg, deliveryCost, totalCost: kilograms * pricePerKg + deliveryCost };
}

function updateExpenseFormTotal() {
  const total = document.getElementById("expenseFormTotal");
  if (total) total.textContent = formatCurrency(expenseFormValues().totalCost);
}

function orderForId(id) {
  return state.expenses.find((order) => order.id === id) || null;
}

function openExpenseDialog(order = null) {
  if (!state.authenticated) {
    state.pendingSetting = order ? `expense:${order.id}` : "expense:new";
    openAuthDialog();
    return;
  }
  const dialog = document.getElementById("expenseDialog");
  if (!dialog) return;
  document.getElementById("expenseId").value = order?.id || "";
  document.getElementById("expenseDate").value = order?.date || today;
  document.getElementById("expenseType").value = order?.type || "BARF";
  document.getElementById("expenseDescription").value = order?.description || "";
  document.getElementById("expenseKilograms").value = order?.kilograms ?? "";
  document.getElementById("expensePriceKg").value = order?.pricePerKg ?? "";
  document.getElementById("expenseDelivery").value = order?.deliveryCost ?? 0;
  document.getElementById("deleteExpenseButton").hidden = !order;
  document.getElementById("expenseFormMessage").textContent = "";
  updateExpenseFormTotal();
  dialog.showModal();
}

async function loadExpenses() {
  try {
    const response = await fetch("/api/expenses", { credentials: "same-origin", cache: "no-store" });
    if (!response.ok) throw new Error(t("expense.loadError"));
    const payload = await response.json();
    state.expenses = (payload.orders || []).map(normalizeClientExpense)
      .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    renderExpenses();
  } catch {
    state.expenses = [];
    renderExpenses();
    toast(t("expense.loadError"), "error");
  }
}

function expenseMetrics() {
  const orders = state.expenses;
  const total = orders.reduce((sum, order) => sum + order.totalCost, 0);
  const currentYear = Number(today.slice(0, 4));
  const completedThisYear = orders.filter((order) => order.date <= today && Number(order.date.slice(0, 4)) === currentYear);
  const year = completedThisYear.reduce((sum, order) => sum + order.totalCost, 0);
  const startOfYear = Date.parse(`${currentYear}-01-01T00:00:00Z`);
  const todayTime = Date.parse(`${today}T00:00:00Z`);
  const elapsedDays = Math.max(1, Math.floor((todayTime - startOfYear) / 86_400_000) + 1);
  const daysInYear = Date.parse(`${currentYear + 1}-01-01T00:00:00Z`) - startOfYear;
  const annualPace = completedThisYear.length ? year / elapsedDays * (daysInYear / 86_400_000) : null;
  const kilograms = orders.reduce((sum, order) => sum + order.kilograms, 0);
  const foodCost = orders.reduce((sum, order) => sum + order.kilograms * order.pricePerKg, 0);
  return { total, year, annualPace, averageKg: kilograms ? foodCost / kilograms : null };
}

function renderExpenseList() {
  const list = document.getElementById("expenseOrderList");
  const count = document.getElementById("expenseOrderCount");
  if (!list || !count) return;
  const countCategory = new Intl.PluralRules(state.lang === "en" ? "en" : "ru").select(state.expenses.length);
  const countKey = countCategory === "one" ? "expense.orderCountOne" : countCategory === "few" ? "expense.orderCountFew" : "expense.orderCountMany";
  count.textContent = t(countKey, { count: state.expenses.length });
  if (!state.expenses.length) {
    list.innerHTML = `<p class="expense-empty">${escapeHtml(t("expense.empty"))}</p>`;
    return;
  }
  list.innerHTML = [...state.expenses].reverse().map((order) => `
    <article class="expense-order-row">
      <span>${escapeHtml(formatDate(order.date))}</span>
      <strong>${escapeHtml(order.type)}${order.description ? `<small>${escapeHtml(order.description)}</small>` : ""}</strong>
      <span class="expense-order-kg">${formatNumber(order.kilograms, 2)} ${escapeHtml(t("unit.kg"))}</span>
      <span class="expense-order-unit">${formatCurrency(order.pricePerKg)}/${escapeHtml(t("unit.kg"))}</span>
      <strong>${formatCurrency(order.totalCost)}</strong>
      <button class="icon-button" type="button" data-edit-expense="${escapeHtml(order.id)}" aria-label="${escapeHtml(t("action.save"))}">✎</button>
    </article>
  `).join("");
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
  const orders = state.expenses;
  if (!orders.length) {
    ctx.fillStyle = cssColor("--muted");
    ctx.font = "700 12px Inter, system-ui";
    ctx.textAlign = "center";
    ctx.fillText(t("expense.empty"), width / 2, height / 2);
    canvas.dataset.points = "0";
    return;
  }
  const plot = { left: width < 560 ? 48 : 66, right: width - (width < 560 ? 48 : 66), top: 24, bottom: height - 42 };
  const times = orders.map((order) => Date.parse(`${order.date}T00:00:00Z`));
  let minTime = Math.min(...times);
  let maxTime = Math.max(...times, Date.parse(`${today}T00:00:00Z`));
  if (minTime === maxTime) { minTime -= 15 * 86_400_000; maxTime += 15 * 86_400_000; }
  const xFor = (time) => plot.left + (time - minTime) / (maxTime - minTime) * (plot.right - plot.left);
  const cumulative = [];
  let running = 0;
  for (const order of orders) { running += order.totalCost; cumulative.push(running); }
  const maxOrder = Math.max(...orders.map((order) => order.totalCost), 10);
  const maxCumulative = Math.max(...cumulative, 10);
  const yOrder = (value) => plot.bottom - value / maxOrder * (plot.bottom - plot.top) * 0.88;
  const yCumulative = (value) => plot.bottom - value / maxCumulative * (plot.bottom - plot.top) * 0.88;
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
    ctx.textAlign = "left";
    ctx.fillText(formatCurrency(fraction * maxCumulative, 0), plot.right + 7, y);
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (let index = 0; index <= 3; index += 1) {
    const time = minTime + index / 3 * (maxTime - minTime);
    ctx.fillText(formatDate(new Date(time).toISOString().slice(0, 10), { day: "2-digit", month: "short" }), xFor(time), plot.bottom + 11);
  }
  const barWidth = Math.max(10, Math.min(28, (plot.right - plot.left) / Math.max(orders.length * 2.4, 8)));
  orders.forEach((order, index) => {
    const x = xFor(times[index]);
    const foodCost = order.kilograms * order.pricePerKg;
    const foodTop = yOrder(foodCost);
    const totalTop = yOrder(order.totalCost);
    const highlighted = order.id === expenseHoveredId;
    ctx.fillStyle = colorWithAlpha(cssColor("--coral"), highlighted ? 0.72 : 0.42);
    ctx.beginPath(); ctx.roundRect(x - barWidth / 2, foodTop, barWidth, plot.bottom - foodTop, 4); ctx.fill();
    if (order.deliveryCost > 0) {
      ctx.fillStyle = colorWithAlpha(cssColor("--yellow"), highlighted ? 0.9 : 0.64);
      ctx.beginPath(); ctx.roundRect(x - barWidth / 2, totalTop, barWidth, Math.max(2, foodTop - totalTop), 4); ctx.fill();
    }
    expenseChartPoints.push({ order, x, y: totalTop, bottom: plot.bottom, cumulative: cumulative[index], lineY: yCumulative(cumulative[index]), barWidth });
  });
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
  canvas.dataset.points = String(expenseChartPoints.length);
  canvas.dataset.minDate = new Date(minTime).toISOString().slice(0, 10);
  canvas.dataset.maxDate = new Date(maxTime).toISOString().slice(0, 10);
}

function renderExpenses() {
  const metrics = expenseMetrics();
  const values = {
    expenseTotal: formatCurrency(metrics.total),
    expenseYear: formatCurrency(metrics.year),
    expenseAnnualPace: metrics.annualPace === null ? "—" : formatCurrency(metrics.annualPace, 0),
    expenseAverageKg: metrics.averageKg === null ? "—" : `${formatCurrency(metrics.averageKg)}/${t("unit.kg")}`
  };
  Object.entries(values).forEach(([id, value]) => { const element = document.getElementById(id); if (element) element.textContent = value; });
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
  const bar = expenseChartPoints.find((point) => Math.abs(point.x - x) <= Math.max(12, point.barWidth) && y >= Math.min(point.y, point.lineY) - 12 && y <= point.bottom + 8);
  if (bar) return bar;
  const nearest = expenseChartPoints.reduce((candidate, point) => Math.hypot(point.x - x, point.lineY - y) < Math.hypot(candidate.x - x, candidate.lineY - y) ? point : candidate, expenseChartPoints[0]);
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
    <span>${escapeHtml(t("expense.orderTotal"))}</span><strong>${formatCurrency(order.totalCost)}</strong>
    <span>${escapeHtml(t("expense.cumulative"))}</span><strong>${formatCurrency(point.cumulative)}</strong></div>${order.description ? `<p class="tooltip-comment">${escapeHtml(order.description)}</p>` : ""}`;
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

async function submitExpense(event) {
  event.preventDefault();
  const message = document.getElementById("expenseFormMessage");
  const id = document.getElementById("expenseId").value;
  const formValues = expenseFormValues();
  const payload = {
    ...(id ? { id, replaceId: id } : {}),
    date: document.getElementById("expenseDate").value,
    type: document.getElementById("expenseType").value,
    description: document.getElementById("expenseDescription").value,
    kilograms: formValues.kilograms,
    pricePerKg: formValues.pricePerKg,
    deliveryCost: formValues.deliveryCost
  };
  try {
    const response = await fetch("/api/expenses", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || t("error.save"));
    state.expenses = (result.orders || []).map(normalizeClientExpense);
    document.getElementById("expenseDialog").close();
    renderExpenses();
    toast(t("expense.saved"));
  } catch (error) { message.textContent = error.message; }
}

async function deleteExpense() {
  const id = document.getElementById("expenseId").value;
  if (!id || !window.confirm(t("expense.deleteConfirm"))) return;
  const message = document.getElementById("expenseFormMessage");
  try {
    const response = await fetch(`/api/expenses?id=${encodeURIComponent(id)}`, { method: "DELETE", credentials: "same-origin" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || t("error.save"));
    state.expenses = (result.orders || []).map(normalizeClientExpense);
    document.getElementById("expenseDialog").close();
    renderExpenses();
    toast(t("expense.deleted"));
  } catch (error) { message.textContent = error.message; }
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

function normEditorRow(norm) {
  return `<div class="norm-editor-row" data-interpolation="${norm.interpolation === "step" ? "step" : "linear"}">
    <label><span>${escapeHtml(t("settings.normDate"))}</span><input class="date-input" data-norm-date type="date" value="${escapeHtml(norm.date)}" required></label>
    <label><span>${escapeHtml(t("settings.normPercent"))}</span><span class="setting-value-control"><input class="number-input" data-norm-percent type="number" min="1" max="12" step="0.1" value="${escapeHtml(Number(norm.ratio * 100).toFixed(1))}" required><strong>%</strong></span></label>
    <button class="norm-remove-button" type="button" data-remove-norm aria-label="${escapeHtml(t("settings.removeNorm"))}" title="${escapeHtml(t("settings.removeNorm"))}">×</button>
  </div>`;
}

function renderNormEditor(norms = activeFeedingNorms()) {
  const editor = document.getElementById("normTimelineEditor");
  if (editor) editor.innerHTML = norms.map(normEditorRow).join("");
}

function openNormDialog() {
  const dialog = document.getElementById("normDialog");
  if (!dialog) return;
  if (!state.authenticated) {
    state.pendingSetting = "feedingNorms";
    openAuthDialog();
    return;
  }
  renderNormEditor();
  document.getElementById("normMessage").textContent = "";
  dialog.showModal();
}

function readNormEditor() {
  return [...document.querySelectorAll("#normTimelineEditor .norm-editor-row")].map((row) => ({
    date: row.querySelector("[data-norm-date]").value,
    ratio: Number(row.querySelector("[data-norm-percent]").value) / 100,
    ...(row.dataset.interpolation === "step" ? { interpolation: "step" } : {})
  }));
}

function addNormEditorPoint() {
  const norms = readNormEditor();
  let date = today;
  while (norms.some((norm) => norm.date === date)) date = addDays(date, 7);
  norms.push({ date, ratio: feedingPlanForDate(date, activeDogProfile()).ratio });
  renderNormEditor(norms.sort((a, b) => a.date.localeCompare(b.date)));
}

async function saveFeedingNorms() {
  const message = document.getElementById("normMessage");
  const inputs = [...document.querySelectorAll("#normTimelineEditor input")];
  if (!inputs.length || inputs.some((input) => !input.checkValidity())) {
    if (message) message.textContent = t("settings.error");
    return;
  }
  const nextSettings = { feedingNorms: readNormEditor() };
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
    state.feedingSettings = payload.feedingSettings;
    renderAll();
    document.getElementById("normDialog")?.close();
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
            const pendingSetting = state.pendingSetting;
            state.pendingSetting = null;
            if (pendingSetting.startsWith("expense:")) {
              const id = pendingSetting.slice("expense:".length);
              openExpenseDialog(id === "new" ? null : orderForId(id));
            } else {
              openNormDialog();
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

function wireEvents() {
  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-edit-norms]")) openNormDialog();
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
  document.getElementById("normAddButton")?.addEventListener("click", addNormEditorPoint);
  document.getElementById("normResetButton")?.addEventListener("click", () => renderNormEditor(DEFAULT_FEEDING_NORMS));
  document.getElementById("normSaveButton")?.addEventListener("click", saveFeedingNorms);
  document.getElementById("normTimelineEditor")?.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-norm]");
    if (!removeButton) return;
    const rows = [...document.querySelectorAll("#normTimelineEditor .norm-editor-row")];
    if (rows.length <= 1) return;
    removeButton.closest(".norm-editor-row")?.remove();
  });
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
  document.getElementById("addExpenseButton")?.addEventListener("click", () => openExpenseDialog());
  document.getElementById("expenseOrderList")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-edit-expense]");
    if (button) openExpenseDialog(orderForId(button.dataset.editExpense));
  });
  document.getElementById("expenseForm")?.addEventListener("submit", submitExpense);
  document.getElementById("deleteExpenseButton")?.addEventListener("click", deleteExpense);
  ["expenseKilograms", "expensePriceKg", "expenseDelivery"].forEach((id) => document.getElementById(id)?.addEventListener("input", updateExpenseFormTotal));
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
    if (point) openExpenseDialog(point.order);
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
  applyTheme();
  initGrowthChart();
  initNormChartInteraction();
  wireEvents();
  applyTranslations();
  setRecordTab("weight");
  await Promise.all([loadRecords(), loadExpenses(), loadProfile(), loadAuthConfig(), refreshAuthStatus()]);
  renderAll();
}

init();
