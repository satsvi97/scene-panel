import {
    chat_metadata,
    setExtensionPrompt,
    extension_prompt_types,
    extension_prompt_roles,
    updateMessageBlock,
    eventSource,
    event_types,
} from '../../../../script.js';

import { getContext } from '../../../st-context.js';

import {
    extension_settings,
    renderExtensionTemplateAsync,
    saveMetadataDebounced,
} from '../../../extensions.js';

const MODULE = 'scene_panel';
const EXT_NAME = 'third-party/scene-panel';
const PROMPT_KEY = 'SCENE_PANEL';
const TAG_RE = /\[\[\s*scene\s*:\s*([\s\S]*?)\]\]/i;
const MIN_MONTH = 5;
const MAX_MONTH = 60;

const KEY_ALIASES = {
    'день': 'day', 'day': 'day', 'dag': 'day',
    'дата': 'date', 'date': 'date', 'datum': 'date',
    'место': 'place', 'place': 'place', 'где': 'place', 'місце': 'place', 'де': 'place', 'plats': 'place',
    'время': 'timeOfDay', 'time': 'timeOfDay', 'timeofday': 'timeOfDay', 'час': 'timeOfDay', 'tid': 'timeOfDay',
    'погода': 'weather', 'weather': 'weather', 'väder': 'weather', 'vader': 'weather',
    'рядом': 'present', 'present': 'present', 'кто': 'present', 'поруч': 'present', 'хто': 'present',
    'närvarande': 'present', 'narvarande': 'present',
    'висит': 'open', 'open': 'open', 'нити': 'open', 'threads': 'open', 'нитки': 'open',
    'trådar': 'open', 'tradar': 'open',
    'тон': 'mood', 'mood': 'mood', 'ton': 'mood',
};

// Значения, которые понимает Weather Background (setWeatherEffect).
const WEATHER_STATES = {
    'дождь': 'rain', 'ливень': 'rain', 'rain': 'rain', 'shower': 'rain',
    'гроза': 'thunderstorm', 'thunderstorm': 'thunderstorm', 'storm': 'thunderstorm',
    'снег': 'snow', 'snow': 'snow',
    'метель': 'blizzard', 'blizzard': 'blizzard',
    'облачно': 'cloudy', 'пасмурно': 'cloudy', 'cloudy': 'cloudy', 'overcast': 'cloudy',
    'солнечно': 'sunny', 'sunny': 'sunny',
    'град': 'hail', 'hail': 'hail',
    'ясно': 'clear', 'clear': 'clear',
    'нет': 'none', 'none': 'none',
};

// Ленивая загрузка рендерера Weather Background (чтобы не падать, если расширения нет).
let weatherRendererPromise = null;

// Версия расширения (дублирует manifest.json для отображения в UI)
const PANEL_VERSION = '0.10.2';

// Встроенная разметка панели. Не зависит от внешнего panel.html и его кэша.
const PANEL_HTML = `<div class="scene-panel-slider" id="scene_panel_slider">
  <div class="scene-panel-track" id="scene_panel_track">
    <div class="scene-panel-slide">
      <div class="scene-panel-settings" id="scene_panel_settings">
    <div class="scene-panel-hint" data-sp-i18n="tagHint"></div>

    <div class="scene-cal" id="scene_panel_cal">
        <div class="scene-cal-head">
            <span class="scene-cal-btn scene-cal-prev" data-sp-title="prevMonth">‹</span>
            <span class="scene-cal-title">месяц 1</span>
            <span class="scene-cal-btn scene-cal-next" data-sp-title="nextMonth">›</span>
        </div>
        <div class="scene-cal-grid"></div>
        <div class="scene-cal-actions">
            <div class="menu_button" id="scene_panel_day_minus" data-sp-i18n="dayMinus">− день</div>
            <div class="menu_button" id="scene_panel_day_plus" data-sp-i18n="dayPlus">+ день</div>
        </div>
    </div>

    <div class="scene-panel-row">
        <label class="scene-panel-field">
            <span data-sp-i18n="monthName">Название месяца</span>
            <input type="text" id="scene_panel_month_label" data-sp-ph="monthNamePh" placeholder="Сиреневый">
        </label>
        <label class="scene-panel-field scene-panel-narrow">
            <span data-sp-i18n="daysInMonth">Дней в месяце</span>
            <input type="number" id="scene_panel_month_len" min="5" max="60" step="1" value="30">
        </label>
    </div>

    <label class="scene-panel-field">
        <span data-sp-i18n="date">📅 Дата словами</span>
        <input type="text" data-scene-field="date" data-sp-ph="datePh" placeholder="12-е, месяц Сиреневой Луны">
    </label>
    <label class="scene-panel-field">
        <span data-sp-i18n="place">📍 Место</span>
        <input type="text" data-scene-field="place" data-sp-ph="placePh" placeholder="Дворец Ночи, покои Ризанда">
    </label>
    <div class="scene-panel-row">
        <label class="scene-panel-field">
            <span data-sp-i18n="time">🕐 Время</span>
            <input type="text" data-scene-field="timeOfDay" data-sp-ph="timePh" placeholder="утро">
            <div class="scene-panel-chips" id="scene_panel_time_hints"></div>
        </label>
        <label class="scene-panel-field">
            <span data-sp-i18n="weather">🌦 Погода</span>
            <input type="text" data-scene-field="weather" data-sp-ph="weatherPh" placeholder="ясно, прохладно">
        </label>
    </div>
    <label class="scene-panel-field">
        <span data-sp-i18n="present">👥 Рядом (через запятую)</span>
        <input type="text" data-scene-field="present" data-sp-ph="presentPh" placeholder="Ризанд, Никс">
        <div class="scene-panel-chips" id="scene_panel_char_hints"></div>
    </label>
    <label class="scene-panel-field">
        <span data-sp-i18n="open">⚡ Висит (каждое с новой строки)</span>
        <textarea data-scene-field="open" rows="3" data-sp-ph="openPh" placeholder="Никс ждёт ответа&#10;Фейра назначила разговор"></textarea>
    </label>
    <label class="scene-panel-field">
        <span data-sp-i18n="mood">🌫 Тон</span>
        <input type="text" data-scene-field="mood" data-sp-ph="moodPh" placeholder="хрупкое перемирие">
    </label>

    <div class="scene-panel-field">
        <span><span data-sp-i18n="session">⏱ Сессия:</span> <b id="scene_panel_elapsed_display">день 1, 00:00</b></span>
        <div class="scene-panel-actions">
            <div class="menu_button" id="scene_panel_session_minus_hour" data-sp-i18n="minusHour" data-sp-title="minusHour">− час</div>
            <div class="menu_button" id="scene_panel_session_plus_hour" data-sp-i18n="plusHour" data-sp-title="plusHour">+ час</div>
            <div class="menu_button" id="scene_panel_session_minus_day" data-sp-i18n="minusDay" data-sp-title="minusDay">− день</div>
            <div class="menu_button" id="scene_panel_session_plus_day" data-sp-i18n="plusDay" data-sp-title="plusDay">+ день</div>
        </div>
    </div>

    <label class="scene-panel-field">
        <span data-sp-i18n="custom">🏷 Доп. поля (ключ=значение, каждое с новой строки)</span>
        <textarea id="scene_panel_custom" rows="2" data-sp-ph="customPh" placeholder="сюжет=погоня&#10;напряжение=высокое"></textarea>
    </label>

    <div class="scene-panel-field">
        <span data-sp-i18n="diag">🩺 Диагностика</span>
        <div class="scene-panel-actions scene-panel-actions-row">
            <div class="menu_button" id="scene_panel_diag" data-sp-i18n="diagBtn">проверить и восстановить</div>
            <div class="menu_button" id="scene_panel_reset" data-sp-i18n="reset">сбросить</div>
        </div>
        <div id="scene_panel_diag_result" class="scene-panel-hint"></div>
    </div>
    <label class="checkbox_label scene-panel-check">
        <input type="checkbox" id="scene_panel_inject">
        <span data-sp-i18n="inject">вставлять сцену в промпт</span>
    </label>
    <label class="scene-panel-field scene-panel-inline">
        <span data-sp-i18n="role">роль инжекта</span>
        <select id="scene_panel_role">
            <option value="system">system</option>
            <option value="user">user</option>
            <option value="assistant">assistant</option>
        </select>
    </label>
    <label class="scene-panel-field scene-panel-inline">
        <span data-sp-i18n="theme">🎨 тема панели</span>
        <select id="scene_panel_theme">
            <option value="auto" data-sp-i18n="themeAuto">авто</option>
            <option value="dark" data-sp-i18n="themeDark">тёмная</option>
            <option value="light" data-sp-i18n="themeLight">светлая</option>
        </select>
    </label>
    <label class="checkbox_label scene-panel-check">
        <input type="checkbox" id="scene_panel_floating">
        <span data-sp-i18n="floating">плавающая панель в чате</span>
    </label>
    <label class="checkbox_label scene-panel-check">
        <input type="checkbox" id="scene_panel_weather_integration">
        <span data-sp-i18n="wb">🌦 фон погоды (Weather Background)</span>
    </label>

    <div class="scene-panel-credit">by ✦ Selena's Tavern ✦</div>
    <div class="scene-panel-version">v${PANEL_VERSION}</div>
      </div>
    </div>

    <div class="scene-panel-slide scene-panel-slide-stats">
      <div class="scene-panel-settings">
        <div class="scene-panel-hint" data-sp-i18n="statsHint"></div>
        <div id="scene_panel_stats_body" class="scene-panel-stats"></div>
        <div class="scene-panel-actions scene-panel-actions-row">
          <div class="menu_button" id="scene_panel_stats_refresh" data-sp-i18n="statsRefresh">обновить</div>
          <div class="menu_button" id="scene_panel_stats_reset" data-sp-i18n="statsClear">очистить</div>
        </div>
        <div class="scene-panel-credit">by ✦ Selena's Tavern ✦</div>
        <div class="scene-panel-version">v${PANEL_VERSION}</div>
      </div>
    </div>
  </div>

  <div class="scene-panel-pager" id="scene_panel_pager">
    <span class="scene-panel-dot is-active" data-slide="0" data-sp-title="slideScene"></span>
    <span class="scene-panel-dot" data-slide="1" data-sp-title="slideStats"></span>
  </div>
</div>`;

// ---- Локализация интерфейса панели ----

const LANGS = ['ru', 'en', 'uk', 'sv'];

const I18N = {
    ru: {
        tagHint: 'ИИ обновляет состояние тегом в конце сообщения: <code>[[scene: день=+1; место=Дворец Ночи; время=утро; рядом=Ризанд; висит=разговор с Фейрой]]</code> — тег из текста вырезается.',
        month: 'месяц', prevMonth: 'предыдущий месяц', nextMonth: 'следующий месяц',
        dayMinus: '− день', dayPlus: '+ день',
        monthName: 'Название месяца', monthNamePh: 'Сиреневый', daysInMonth: 'Дней в месяце',
        date: '📅 Дата словами', datePh: '12-е, месяц Сиреневой Луны',
        place: '📍 Место', placePh: 'Дворец Ночи, покои Ризанда',
        time: '🕐 Время', timePh: 'утро',
        weather: '🌦 Погода', weatherPh: 'ясно, прохладно',
        present: '👥 Рядом (через запятую)', presentPh: 'Ризанд, Никс',
        open: '⚡ Висит (каждое с новой строки)', openPh: 'Никс ждёт ответа\nФейра назначила разговор',
        mood: '🌫 Тон', moodPh: 'хрупкое перемирие',
        session: '⏱ Сессия:',
        minusHour: '− час', plusHour: '+ час', minusDay: '− день', plusDay: '+ день',
        custom: '🏷 Доп. поля (ключ=значение, каждое с новой строки)', customPh: 'сюжет=погоня\nнапряжение=высокое',
        diag: '🩺 Диагностика', diagBtn: 'проверить и восстановить', reset: 'сбросить',
        inject: 'вставлять сцену в промпт', role: 'роль инжекта',
        theme: '🎨 тема панели', themeAuto: 'авто', themeDark: 'тёмная', themeLight: 'светлая',
        floating: 'плавающая панель в чате', wb: '🌦 фон погоды (Weather Background)',
        statsHint: '📊 Статистика этого чата. Свайп вправо или кнопка «✕» — вернуться к сцене.',
        statsRefresh: 'обновить', statsClear: 'очистить',
        day: 'день', noThreads: 'нет открытых нитей', addToPresent: 'добавить в «рядом»',
        statsEmpty: 'пока пусто — появится по мере обновления сцены',
        statsUpdates: 'обновлений', statsMaxDay: 'макс. день', statsChars: 'чаще рядом',
        statsPlaces: 'чаще место', statsTimes: 'время', statsWeather: 'погода',
        diagTags: 'Тегов в последних {n} сообщениях: {count}.', diagSnaps: 'Снимков в истории: {count}.',
        diagFromTag: '✅ Восстановлено из тега сообщения #{n}.',
        diagFromSnap: '✅ Восстановлено из снимка ({time}).',
        diagNothing: '⚠️ Нечего восстанавливать: тегов и снимков нет.',
        slideScene: 'сцена', slideStats: 'статистика',
        enabled: 'расширение включено', openPanel: 'открыть панель сцены',
        drawerHint: 'Календарь, место, состав сцены и открытые нити. ИИ обновляет их тегом <code>[[scene: …]]</code> в конце ответа.<br>Свайп влево — статистика. Alt+Shift+S — открыть панель.',
        timePresets: ['рассвет', 'утро', 'день', 'вечер', 'закат', 'ночь'],
    },
    en: {
        tagHint: 'The AI updates the scene with a tag at the end of a message: <code>[[scene: day=+1; place=Night Palace; time=morning; present=Rhysand; open=talk with Feyre]]</code> — the tag is stripped from the text.',
        month: 'month', prevMonth: 'previous month', nextMonth: 'next month',
        dayMinus: '− day', dayPlus: '+ day',
        monthName: 'Month name', monthNamePh: 'Lilac', daysInMonth: 'Days in month',
        date: '📅 Date in words', datePh: '12th, month of the Lilac Moon',
        place: '📍 Place', placePh: "Night Palace, Rhysand's chambers",
        time: '🕐 Time', timePh: 'morning',
        weather: '🌦 Weather', weatherPh: 'clear, cool',
        present: '👥 Present (comma separated)', presentPh: 'Rhysand, Nyx',
        open: '⚡ Open threads (one per line)', openPh: 'Nyx awaits an answer\nFeyre called a meeting',
        mood: '🌫 Mood', moodPh: 'fragile truce',
        session: '⏱ Session:',
        minusHour: '− hour', plusHour: '+ hour', minusDay: '− day', plusDay: '+ day',
        custom: '🏷 Custom fields (key=value, one per line)', customPh: 'plot=chase\ntension=high',
        diag: '🩺 Diagnostics', diagBtn: 'check & restore', reset: 'reset',
        inject: 'inject scene into prompt', role: 'injection role',
        theme: '🎨 panel theme', themeAuto: 'auto', themeDark: 'dark', themeLight: 'light',
        floating: 'floating panel in chat', wb: '🌦 weather background (Weather Background)',
        statsHint: '📊 Statistics for this chat. Swipe right or press «✕» to return to the scene.',
        statsRefresh: 'refresh', statsClear: 'clear',
        day: 'day', noThreads: 'no open threads', addToPresent: 'add to present',
        statsEmpty: 'empty so far — will fill as the scene updates',
        statsUpdates: 'updates', statsMaxDay: 'max day', statsChars: 'most present',
        statsPlaces: 'top place', statsTimes: 'time', statsWeather: 'weather',
        diagTags: 'Tags in the last {n} messages: {count}.', diagSnaps: 'Snapshots in history: {count}.',
        diagFromTag: '✅ Restored from tag in message #{n}.',
        diagFromSnap: '✅ Restored from snapshot ({time}).',
        diagNothing: '⚠️ Nothing to restore: no tags and no snapshots.',
        slideScene: 'scene', slideStats: 'statistics',
        enabled: 'extension enabled', openPanel: 'open scene panel',
        drawerHint: 'Calendar, place, scene cast and open threads. The AI updates them with a <code>[[scene: …]]</code> tag at the end of a reply.<br>Swipe left for statistics. Alt+Shift+S opens the panel.',
        timePresets: ['dawn', 'morning', 'day', 'evening', 'sunset', 'night'],
    },
    uk: {
        tagHint: 'ШІ оновлює стан тегом наприкінці повідомлення: <code>[[scene: день=+1; місце=Палац Ночі; час=ранок; поруч=Ризанд; висить=розмова з Фейрою]]</code> — тег вирізається з тексту.',
        month: 'місяць', prevMonth: 'попередній місяць', nextMonth: 'наступний місяць',
        dayMinus: '− день', dayPlus: '+ день',
        monthName: 'Назва місяця', monthNamePh: 'Бузковий', daysInMonth: 'Днів у місяці',
        date: '📅 Дата словами', datePh: '12-е, місяць Бузкового Місяця',
        place: '📍 Місце', placePh: 'Палац Ночі, покої Ризанду',
        time: '🕐 Час', timePh: 'ранок',
        weather: '🌦 Погода', weatherPh: 'ясно, прохолодно',
        present: '👥 Поруч (через кому)', presentPh: 'Ризанд, Нікс',
        open: '⚡ Висить (кожне з нового рядка)', openPh: 'Нікс чекає відповіді\nФейра призначила розмову',
        mood: '🌫 Тон', moodPh: 'крихке перемир\'я',
        session: '⏱ Сесія:',
        minusHour: '− година', plusHour: '+ година', minusDay: '− день', plusDay: '+ день',
        custom: '🏷 Дод. поля (ключ=значення, кожне з нового рядка)', customPh: 'сюжет=погоня\nнапруга=висока',
        diag: '🩺 Діагностика', diagBtn: 'перевірити й відновити', reset: 'скинути',
        inject: 'вставляти сцену в промпт', role: 'роль інжекту',
        theme: '🎨 тема панелі', themeAuto: 'авто', themeDark: 'темна', themeLight: 'світла',
        floating: 'плаваюча панель у чаті', wb: '🌦 фон погоди (Weather Background)',
        statsHint: '📊 Статистика цього чату. Свайп вправо або кнопка «✕» — повернутися до сцени.',
        statsRefresh: 'оновити', statsClear: 'очистити',
        day: 'день', noThreads: 'немає відкритих ниток', addToPresent: 'додати до «поруч»',
        statsEmpty: 'поки порожньо — з\'явиться в міру оновлення сцени',
        statsUpdates: 'оновлень', statsMaxDay: 'макс. день', statsChars: 'найчастіше поруч',
        statsPlaces: 'часте місце', statsTimes: 'час', statsWeather: 'погода',
        diagTags: 'Тегів в останніх {n} повідомленнях: {count}.', diagSnaps: 'Знімків в історії: {count}.',
        diagFromTag: '✅ Відновлено з тегу повідомлення #{n}.',
        diagFromSnap: '✅ Відновлено зі знімка ({time}).',
        diagNothing: '⚠️ Немає чого відновлювати: тегів і знімків немає.',
        slideScene: 'сцена', slideStats: 'статистика',
        enabled: 'розширення увімкнено', openPanel: 'відкрити панель сцени',
        drawerHint: 'Календар, місце, склад сцени та відкриті нитки. ШІ оновлює їх тегом <code>[[scene: …]]</code> наприкінці відповіді.<br>Свайп вліво — статистика. Alt+Shift+S — відкрити панель.',
        timePresets: ['світанок', 'ранок', 'день', 'вечір', 'захід', 'ніч'],
    },
    sv: {
        tagHint: 'AI:n uppdaterar scenen med en tagg i slutet av ett meddelande: <code>[[scene: dag=+1; plats=Nattpalatset; tid=morgon; närvarande=Rhysand; trådar=samtal med Feyre]]</code> — taggen klipps bort från texten.',
        month: 'månad', prevMonth: 'föregående månad', nextMonth: 'nästa månad',
        dayMinus: '− dag', dayPlus: '+ dag',
        monthName: 'Månadsnamn', monthNamePh: 'Lila', daysInMonth: 'Dagar per månad',
        date: '📅 Datum i ord', datePh: '12:e, Liljemånens månad',
        place: '📍 Plats', placePh: 'Nattpalatset, Rhysands gemak',
        time: '🕐 Tid', timePh: 'morgon',
        weather: '🌦 Väder', weatherPh: 'klart, svalt',
        present: '👥 Närvarande (kommaseparerat)', presentPh: 'Rhysand, Nyx',
        open: '⚡ Öppna trådar (en per rad)', openPh: 'Nyx väntar på svar\nFeyre bokade ett samtal',
        mood: '🌫 Ton', moodPh: 'skör vapenvila',
        session: '⏱ Session:',
        minusHour: '− timme', plusHour: '+ timme', minusDay: '− dag', plusDay: '+ dag',
        custom: '🏷 Egna fält (nyckel=värde, en per rad)', customPh: 'handling=jakt\nspänning=hög',
        diag: '🩺 Diagnostik', diagBtn: 'kontrollera & återställ', reset: 'nollställ',
        inject: 'injicera scenen i prompten', role: 'injektionsroll',
        theme: '🎨 panelens tema', themeAuto: 'auto', themeDark: 'mörkt', themeLight: 'ljust',
        floating: 'flytande panel i chatten', wb: '🌦 vederbakgrund (Weather Background)',
        statsHint: '📊 Statistik för denna chatt. Svep åt höger eller tryck «✕» för att gå tillbaka.',
        statsRefresh: 'uppdatera', statsClear: 'rensa',
        day: 'dag', noThreads: 'inga öppna trådar', addToPresent: 'lägg till i närvarande',
        statsEmpty: 'tomt än så länge — fylls på när scenen uppdateras',
        statsUpdates: 'uppdateringar', statsMaxDay: 'högsta dag', statsChars: 'vanligast närvarande',
        statsPlaces: 'vanligaste plats', statsTimes: 'tid', statsWeather: 'väder',
        diagTags: 'Taggar i de senaste {n} meddelandena: {count}.', diagSnaps: 'Ögonblicksbilder i historiken: {count}.',
        diagFromTag: '✅ Återställt från tagg i meddelande #{n}.',
        diagFromSnap: '✅ Återställt från ögonblicksbild ({time}).',
        diagNothing: '⚠️ Inget att återställa: inga taggar och inga ögonblicksbilder.',
        slideScene: 'scen', slideStats: 'statistik',
        enabled: 'tillägget aktiverat', openPanel: 'öppna scenpanelen',
        drawerHint: 'Kalender, plats, scenens sällskap och öppna trådar. AI:n uppdaterar dem med en <code>[[scene: …]]</code>-tagg i slutet av svaret.<br>Svep vänster för statistik. Alt+Shift+S öppnar panelen.',
        timePresets: ['gryning', 'morgon', 'dag', 'kväll', 'solnedgång', 'natt'],
    },
};

function getLang() {
    const lang = getSettings().lang;
    return LANGS.includes(lang) ? lang : 'ru';
}

function t(key) {
    const dict = I18N[getLang()] || I18N.ru;
    if (dict[key] !== undefined) return dict[key];
    if (I18N.ru[key] !== undefined) return I18N.ru[key];
    return key;
}

function tf(key, vars) {
    let out = String(t(key));
    Object.entries(vars || {}).forEach(([k, v]) => {
        out = out.split('{' + k + '}').join(String(v));
    });
    return out;
}

// Безопасная обёртка: ошибка локализации не должна ломать таверну
function applyLanguage() {
    try {
        applyLanguageInner();
    } catch (e) {
        console.warn('[scene-panel] language apply skipped', e);
    }
}

function applyLanguageInner() {
    const dict = I18N[getLang()] || I18N.ru;
    const has = (key) => Object.prototype.hasOwnProperty.call(dict, key);
    const roots = document.querySelectorAll('#scene_panel_modal, #scene_panel_settings_compact, #scene_panel_float');

    roots.forEach((root) => {
        root.querySelectorAll('[data-sp-i18n]').forEach((el) => {
            const key = el.getAttribute('data-sp-i18n');
            if (has(key)) el.innerHTML = dict[key];
        });
        root.querySelectorAll('[data-sp-ph]').forEach((el) => {
            const key = el.getAttribute('data-sp-ph');
            if (has(key)) el.setAttribute('placeholder', dict[key]);
        });
        root.querySelectorAll('[data-sp-title]').forEach((el) => {
            const key = el.getAttribute('data-sp-title');
            if (has(key)) el.setAttribute('title', dict[key]);
        });
    });

    const lang = getLang();
    document.querySelectorAll('#scene_panel_langs .scene-panel-lang').forEach((el) => {
        el.classList.toggle('is-active', el.getAttribute('data-lang') === lang);
    });

    const state = getState();
    $('#scene_panel_day_label').text(t('day') + ' ' + state.day);
    $('#scene_panel_day_compact').text(t('day') + ' ' + state.day);

    renderCalendar('scene_panel_cal');
    renderCalendar('scene_panel_float_cal');
    renderTimeHints();
    renderCharHints();
    renderStats();
    renderFloating();
}

let saveSettings = () => {};

function emptyState() {
    return {
        day: 1,
        daysInMonth: 30,
        monthLabel: '',
        date: '',
        place: '',
        timeOfDay: '',
        weather: '',
        present: [],
        open: [],
        mood: '',
        sessionDay: 1,
        sessionHour: 0,
        sessionMinute: 0,
        custom: {},
    };
}

function getSettings() {
    if (!extension_settings[MODULE] || typeof extension_settings[MODULE] !== 'object') {
        extension_settings[MODULE] = { enabled: true, inject: true, role: 'system', floating: true, floatPos: null, weatherIntegration: true, theme: 'auto', lang: 'ru' };
    }
    const s = extension_settings[MODULE];
    if (typeof s.enabled !== 'boolean') s.enabled = true;
    if (typeof s.inject !== 'boolean') s.inject = true;
    if (typeof s.floating !== 'boolean') s.floating = true;
    if (typeof s.role !== 'string') s.role = 'system';
    if (typeof s.weatherIntegration !== 'boolean') s.weatherIntegration = true;
    if (typeof s.theme !== 'string') s.theme = 'auto';
    if (!LANGS.includes(s.lang)) s.lang = 'ru';
    return s;
}

function isEnabled() {
    return getSettings().enabled !== false;
}

function getState() {
    if (!chat_metadata[MODULE] || typeof chat_metadata[MODULE] !== 'object') {
        chat_metadata[MODULE] = emptyState();
    }
    const s = chat_metadata[MODULE];
    const day = Number(s.day);
    s.day = Number.isFinite(day) && day > 0 ? Math.round(day) : 1;
    const dim = Number(s.daysInMonth);
    s.daysInMonth = Number.isFinite(dim) && dim >= MIN_MONTH && dim <= MAX_MONTH ? Math.round(dim) : 30;
    if (typeof s.monthLabel !== 'string') s.monthLabel = '';
    for (const k of ['date', 'place', 'timeOfDay', 'weather', 'mood']) {
        if (typeof s[k] !== 'string') s[k] = '';
    }
    if (!Array.isArray(s.present)) s.present = [];
    if (!Array.isArray(s.open)) s.open = [];
    s.present = s.present.filter((x) => typeof x === 'string' && x.trim().length > 0);
    s.open = s.open.filter((x) => typeof x === 'string' && x.trim().length > 0);
    const sd = Number(s.sessionDay);
    s.sessionDay = Number.isFinite(sd) && sd > 0 ? Math.round(sd) : 1;
    const sh = Number(s.sessionHour);
    s.sessionHour = Number.isFinite(sh) && sh >= 0 && sh <= 23 ? Math.round(sh) : 0;
    const sm = Number(s.sessionMinute);
    s.sessionMinute = Number.isFinite(sm) && sm >= 0 && sm <= 59 ? Math.round(sm) : 0;
    if (!s.custom || typeof s.custom !== 'object' || Array.isArray(s.custom)) s.custom = {};
    return s;
}

function monthIndex(state) {
    return Math.floor((state.day - 1) / state.daysInMonth) + 1;
}

function dayOfMonth(state) {
    return ((state.day - 1) % state.daysInMonth) + 1;
}

function absoluteDay(state, month, dom) {
    return (month - 1) * state.daysInMonth + dom;
}

function monthTitle(state) {
    const idx = monthIndex(state);
    const label = state.monthLabel.trim();
    return label ? label + ' · ' + idx : t('month') + ' ' + idx;
}

// Часы:минуты с ведущими нулями
function pad2(n) {
    return String(n).padStart(2, '0');
}

// Счётчик времени сессии: день + часы:минуты
function elapsedTimeString(state) {
    return t('day') + ' ' + state.sessionDay + ', ' + pad2(state.sessionHour) + ':' + pad2(state.sessionMinute);
}

// Сдвиг часов сессии (с переносом через сутки, не ниже day 1 / 00:00)
function shiftSessionHour(delta) {
    const state = getState();
    let total = state.sessionDay * 1440 + state.sessionHour * 60 + state.sessionMinute + delta * 60;
    const minTotal = 1440; // day 1, 00:00
    if (total < minTotal) total = minTotal;
    state.sessionDay = Math.floor(total / 1440);
    const rest = total % 1440;
    state.sessionHour = Math.floor(rest / 60);
    state.sessionMinute = rest % 60;
    commit();
    recordSnapshot();
    syncPrompt();
    refresh();
}

// Сдвиг дней сессии (не ниже 1)
function shiftSessionDay(delta) {
    const state = getState();
    state.sessionDay = Math.max(1, state.sessionDay + delta);
    commit();
    recordSnapshot();
    syncPrompt();
    refresh();
}

function commit() {
    try {
        saveMetadataDebounced();
    } catch (e) {
        console.warn('[scene-panel] metadata save failed', e);
    }
    renderFloating();
}

function sceneText(state) {
    const parts = [];
    const dom = dayOfMonth(state);
    parts.push('Сцена: день ' + state.day + ' (месяц ' + monthIndex(state) + ', ' + dom + '-е)');
    if (state.monthLabel.trim()) parts.push('месяц: ' + state.monthLabel.trim());
    if (state.date) parts.push('дата: ' + state.date);
    if (state.place) parts.push('место: ' + state.place);
    const when = [state.timeOfDay, state.weather].filter(Boolean).join(', ');
    if (when) parts.push('обстановка: ' + when);
    if (state.present.length > 0) parts.push('рядом: ' + state.present.join(', '));
    if (state.open.length > 0) parts.push('не закрыто: ' + state.open.join('; '));
    if (state.mood) parts.push('тон: ' + state.mood);
    const customKeys = Object.keys(state.custom || {});
    if (customKeys.length > 0) {
        parts.push('доп: ' + customKeys.map((k) => k + '=' + state.custom[k]).join('; '));
    }
    parts.push('время сессии: ' + elapsedTimeString(state));
    return parts.join('. ') + '. ' +
        'Это текущее состояние сцены. Если в твоём ответе меняются место, время, состав сцены, ' +
        'закрываются или появляются нити — добавь в самом конце ответа ровно одну строку ' +
        '[[scene: место=…; время=…; рядом=…; висит=…; тон=…; погода=…]] и не упоминай её в тексте.';
}

function injectionRole() {
    const role = getSettings().role;
    if (role === 'user') return extension_prompt_roles.USER;
    if (role === 'assistant') return extension_prompt_roles.ASSISTANT;
    return extension_prompt_roles.SYSTEM;
}

function syncPrompt() {
    const settings = getSettings();
    if (!settings.inject || !isEnabled()) {
        setExtensionPrompt(PROMPT_KEY, '', extension_prompt_types.NONE, 0, false, extension_prompt_roles.SYSTEM);
        return;
    }
    setExtensionPrompt(PROMPT_KEY, sceneText(getState()), extension_prompt_types.IN_PROMPT, 0, false, injectionRole());
}

function renderCalendar(targetId) {
    const $root = $('#' + targetId);
    if ($root.length === 0) return;
    const state = getState();
    const dom = dayOfMonth(state);

    $root.find('.scene-cal-title').text(monthTitle(state));
    const $grid = $root.find('.scene-cal-grid').empty();
    for (let d = 1; d <= state.daysInMonth; d++) {
        const classes = ['scene-cal-day'];
        if (d === dom) classes.push('is-today');
        if (d > dom) classes.push('is-future');
        $grid.append(
            $('<div>')
                .addClass(classes.join(' '))
                .attr('data-cal-day', String(d))
                .text(String(d)),
        );
    }
}

function renderFloating() {
    const $float = $('#scene_panel_float');
    if ($float.length === 0) return;
    if (!isEnabled() || !getSettings().floating) {
        $float.hide();
        return;
    }
    $float.show();
    applyFloatPos();
    const state = getState();
    $float.find('#scene_panel_float_day').text(t('day') + ' ' + state.day);
    $float.find('#scene_panel_float_place').text(state.place || '—');
    $float.find('#scene_panel_float_when').text([state.timeOfDay, state.weather].filter(Boolean).join(' · '));
    $float.find('#scene_panel_float_present').text(state.present.length > 0 ? state.present.join(' · ') : '—');
    $float.find('#scene_panel_float_mood').text(state.mood || '');
    const $open = $float.find('#scene_panel_float_open').empty();
    if (state.open.length === 0) {
        $open.append($('<div>').addClass('scene-panel-float-empty').text(t('noThreads')));
    } else {
        state.open.forEach((line) => $open.append($('<div>').addClass('scene-panel-float-thread').text('✦ ' + line)));
    }
}

function refresh() {
    const state = getState();
    const $panel = $('#scene_panel_settings');
    if ($panel.length > 0) {
        $panel.find('[data-scene-field]').each(function () {
            const field = $(this).attr('data-scene-field');
            const value = state[field];
            if ($(this).is('textarea') || $(this).is('input')) {
                const text = Array.isArray(value) ? value.join(field === 'open' ? '\n' : ', ') : String(value ?? '');
                if ($(this).val() !== text) $(this).val(text);
            }
        });
        $('#scene_panel_day_label').text(t('day') + ' ' + state.day);
        $('#scene_panel_day_compact').text(t('day') + ' ' + state.day);
        $('#scene_panel_enabled').prop('checked', isEnabled());
        $('#scene_panel_topbtn').toggle(isEnabled());
        $panel.find('#scene_panel_month_label').val(state.monthLabel);
        $panel.find('#scene_panel_month_len').val(String(state.daysInMonth));
        $panel.find('#scene_panel_inject').prop('checked', getSettings().inject);
        $panel.find('#scene_panel_floating').prop('checked', getSettings().floating);
        $panel.find('#scene_panel_role').val(getSettings().role);
        $panel.find('#scene_panel_weather_integration').prop('checked', getSettings().weatherIntegration);
        $panel.find('#scene_panel_theme').val(getSettings().theme);
        $panel.find('#scene_panel_elapsed_display').text(elapsedTimeString(state));
        const customText = Object.entries(state.custom || {}).map(([k, v]) => k + '=' + v).join('\n');
        $panel.find('#scene_panel_custom').val(customText);
        renderCalendar('scene_panel_cal');
        renderStats();
        renderCharHints();
        renderTimeHints();
    }
    applyTheme();
    renderFloating();
    renderCalendar('scene_panel_float_cal');
}

function readForm() {
    const state = getState();
    const read = (field) => {
        const $el = $('#scene_panel_settings [data-scene-field="' + field + '"]');
        return $el.length > 0 ? String($el.val() ?? '') : '';
    };
    const split = (raw, re) => raw.split(re).map((x) => x.trim()).filter(Boolean);
    state.date = read('date');
    state.place = read('place');
    state.timeOfDay = read('timeOfDay');
    state.weather = read('weather');
    state.mood = read('mood');
    state.present = split(read('present'), /[,\n]/);
    state.open = split(read('open'), /\n/);
    // Произвольные поля: строки "ключ=значение"
    const customRaw = $('#scene_panel_settings #scene_panel_custom').val();
    if (typeof customRaw === 'string') {
        const custom = {};
        customRaw.split('\n').forEach((line) => {
            const s = line.trim();
            if (!s) return;
            const i = s.indexOf('=');
            if (i <= 0) return;
            custom[s.slice(0, i).trim()] = s.slice(i + 1).trim();
        });
        state.custom = custom;
    }
    commit();
    recordSnapshot();
    scheduleStats();
    syncPrompt();
    refresh();
    applyWeatherEffect();
}

function shiftDay(delta) {
    const state = getState();
    state.day = Math.max(1, state.day + delta);
    commit();
    recordSnapshot();
    syncPrompt();
    refresh();
}

function setDayOfMonth(dom) {
    const state = getState();
    state.day = absoluteDay(state, monthIndex(state), dom);
    commit();
    recordSnapshot();
    syncPrompt();
    refresh();
}

function shiftMonth(delta) {
    const state = getState();
    const target = Math.max(1, monthIndex(state) + delta);
    state.day = absoluteDay(state, target, Math.min(dayOfMonth(state), state.daysInMonth));
    commit();
    recordSnapshot();
    syncPrompt();
    refresh();
}

function parseTag(body) {
    const out = {};
    const state = getState();
    for (const rawChunk of body.split(';')) {
        const chunk = rawChunk.trim();
        if (!chunk) continue;
        const eq = chunk.indexOf('=');
        const colon = chunk.indexOf(':');
        let sep = -1;
        if (eq >= 0 && (colon < 0 || eq < colon)) sep = eq;
        else sep = colon;
        if (sep < 0) continue;
        const keyRaw = chunk.slice(0, sep).trim();
        const key = keyRaw.toLowerCase();
        const value = chunk.slice(sep + 1).trim();
        const field = KEY_ALIASES[key];
        if (!field) {
            // Произвольные поля: сохраняем как есть (кроме служебного времени сессии)
            if (key === 'время_сессии' || key === 'time_session') continue;
            if (!out.custom) out.custom = {};
            out.custom[keyRaw] = value;
            continue;
        }
        if (field === 'day') {
            if (value === '+1' || value === 'следующий' || value === 'наступний' || value === 'nästa' || value === 'nasta') {
                out.day = state.day + 1;
            } else {
                const n = parseInt(value, 10);
                if (Number.isFinite(n) && n > 0) out.day = n;
            }
            continue;
        }
        if (field === 'present') {
            out.present = value.split(',').map((x) => x.trim()).filter(Boolean);
            continue;
        }
        if (field === 'open') {
            out.open = value.split(/[;|]/).map((x) => x.trim()).filter(Boolean);
            continue;
        }
        out[field] = value;
    }
    return out;
}

function handleMessage(messageId) {
    try {
        if (!isEnabled()) return;
        const message = getContext().chat?.[messageId];
        if (!message || typeof message.mes !== 'string') return;
        const match = message.mes.match(TAG_RE);
        if (!match) return;
        const patch = parseTag(match[1]);
        if (patch && patch.custom) {
            Object.assign(getState().custom, patch.custom);
            delete patch.custom;
        }
        if (Object.keys(patch).length > 0) {
            Object.assign(getState(), patch);
        }
        message.mes = message.mes.replace(TAG_RE, '').replace(/\s+$/, '');
        updateMessageBlock(messageId, message, { rerenderMessage: true });
        commit();
        recordSnapshot();
        trackStats(getState());
        syncPrompt();
        refresh();
        applyWeatherEffect();
    } catch (e) {
        console.error('[scene-panel] tag handling failed', e);
    }
}

// ---- Подсказки из контекста чата ----

// Имена персонажей, известные таверне (плюс имя пользователя-персоны)
function collectCharacterNames() {
    const ctx = getContext();
    const names = [];
    try {
        (ctx.characters || []).forEach((c) => {
            if (c && typeof c.name === 'string') names.push(c.name);
        });
    } catch (e) {
        /* ignore */
    }
    if (typeof ctx.name1 === 'string') names.push(ctx.name1);
    if (typeof ctx.name2 === 'string') names.push(ctx.name2);
    const seen = new Set();
    return names
        .map((n) => n.trim())
        .filter((n) => n && !seen.has(n.toLowerCase()) && seen.add(n.toLowerCase()));
}

// Чипы «＋ Имя» для поля «Рядом» — только те, кто реально упомянут недавно
function renderCharHints() {
    const $box = $('#scene_panel_char_hints');
    if ($box.length === 0) return;
    const state = getState();
    const chat = getContext().chat ?? [];
    const recent = chat
        .slice(Math.max(0, chat.length - 10))
        .map((m) => (typeof m?.mes === 'string' ? m.mes : ''))
        .join('\n');
    const present = new Set((state.present || []).map((p) => p.toLowerCase()));
    const candidates = collectCharacterNames()
        .filter((n) => !present.has(n.toLowerCase()) && recent.includes(n))
        .slice(0, 8);

    $box.empty();
    candidates.forEach((name) => {
        $box.append(
            $('<span>')
                .addClass('scene-panel-chip')
                .attr('title', t('addToPresent'))
                .text('＋ ' + name)
                .on('click', () => {
                    const st = getState();
                    if (!st.present.some((p) => p.toLowerCase() === name.toLowerCase())) {
                        st.present.push(name);
                        commit();
                        recordSnapshot();
                        syncPrompt();
                        refresh();
                    }
                }),
        );
    });
    $box.toggle(candidates.length > 0);
}

// Быстрые чипы времени суток
function renderTimeHints() {
    const $box = $('#scene_panel_time_hints');
    if ($box.length === 0) return;
    const presets = Array.isArray(t('timePresets')) ? t('timePresets') : I18N.ru.timePresets;
    const current = (getState().timeOfDay || '').trim().toLowerCase();
    $box.empty();
    presets.forEach((label) => {
        $box.append(
            $('<span>')
                .addClass('scene-panel-chip')
                .toggleClass('is-active', current === label)
                .text(label)
                .on('click', () => {
                    const st = getState();
                    st.timeOfDay = current === label ? '' : label;
                    commit();
                    recordSnapshot();
                    syncPrompt();
                    refresh();
                }),
        );
    });
}

// ---- История снимков сцены и диагностика ----

const HISTORY_KEY = MODULE + '_history';
const MAX_SNAPSHOTS = 20;
const DIAG_SCAN = 12;
const STATS_KEY = MODULE + '_stats';

// ---- Статистика сессии ----

function getStats() {
    if (!chat_metadata[STATS_KEY] || typeof chat_metadata[STATS_KEY] !== 'object') {
        chat_metadata[STATS_KEY] = {
            updates: 0,
            firstTs: 0,
            lastTs: 0,
            maxDay: 1,
            places: {},
            times: {},
            weather: {},
            chars: {},
        };
    }
    const st = chat_metadata[STATS_KEY];
    for (const k of ['places', 'times', 'weather', 'chars']) {
        if (!st[k] || typeof st[k] !== 'object' || Array.isArray(st[k])) st[k] = {};
    }
    if (!Number.isFinite(Number(st.updates))) st.updates = 0;
    if (!Number.isFinite(Number(st.maxDay))) st.maxDay = 1;
    return st;
}

function bump(obj, key) {
    if (typeof key !== 'string') return;
    const k = key.trim();
    if (!k) return;
    obj[k] = (obj[k] || 0) + 1;
}

// Считает статистику по текущему состоянию сцены
function trackStats(state) {
    try {
        const st = getStats();
        st.updates += 1;
        st.lastTs = Date.now();
        if (!st.firstTs) st.firstTs = st.lastTs;
        st.maxDay = Math.max(st.maxDay || 1, Number(state.day) || 1);
        bump(st.places, state.place);
        bump(st.times, state.timeOfDay);
        bump(st.weather, state.weather);
        (state.present || []).forEach((c) => bump(st.chars, c));
    } catch (e) {
        console.warn('[scene-panel] stats failed', e);
    }
}

// Дебаунс: при наборе текста считаем один раз
let statsTimer = null;
function scheduleStats() {
    if (statsTimer) clearTimeout(statsTimer);
    statsTimer = setTimeout(() => {
        statsTimer = null;
        trackStats(getState());
        renderStats();
    }, 900);
}

function topList(obj, limit = 3) {
    return Object.entries(obj || {})
        .filter(([, v]) => Number(v) > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit);
}

function renderStats() {
    const $body = $('#scene_panel_stats_body');
    if ($body.length === 0) return;
    const st = getStats();
    $body.empty();
    if (!st.updates) {
        $body.append($('<div>').addClass('scene-panel-hint').text(t('statsEmpty')));
        return;
    }
    const fmt = (list) => list.map(([k, v]) => k + ' (' + v + ')').join(', ');
    const rows = [];
    rows.push(t('statsUpdates') + ': ' + st.updates + ' · ' + t('statsMaxDay') + ': ' + st.maxDay);
    const chars = topList(st.chars);
    if (chars.length) rows.push(t('statsChars') + ': ' + fmt(chars));
    const places = topList(st.places);
    if (places.length) rows.push(t('statsPlaces') + ': ' + fmt(places));
    const times = topList(st.times);
    if (times.length) rows.push(t('statsTimes') + ': ' + fmt(times));
    const weather = topList(st.weather);
    if (weather.length) rows.push(t('statsWeather') + ': ' + fmt(weather));
    rows.forEach((r) => $body.append($('<div>').text(r)));
}

// ---- Тема панели ----

function resolveTheme() {
    const mode = getSettings().theme;
    if (mode === 'dark' || mode === 'light') return mode;
    try {
        const bg = getComputedStyle(document.body).backgroundColor || '';
        const nums = bg.match(/\d+/g);
        if (nums && nums.length >= 3) {
            const [r, g, b] = nums.slice(0, 3).map(Number);
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            return lum > 140 ? 'light' : 'dark';
        }
    } catch (e) {
        /* fallback below */
    }
    return 'dark';
}

function applyTheme() {
    const theme = resolveTheme();
    $('#scene_panel_modal').attr('data-sp-theme', theme);
    $('#scene_panel_float').attr('data-sp-theme', theme);
}

// ---- Страницы панели: сцена ⇄ статистика ----

let panelPage = 0;

function setPanelPage(idx) {
    panelPage = Math.max(0, Math.min(1, idx));
    const $track = $('#scene_panel_track');
    if ($track.length === 0) return;
    $track.toggleClass('is-stats', panelPage === 1);
    $('#scene_panel_pager .scene-panel-dot').each(function () {
        $(this).toggleClass('is-active', Number($(this).attr('data-slide')) === panelPage);
    });
    if (panelPage === 1) renderStats();
}

function initPanelSlider() {
    const el = document.getElementById('scene_panel_slider');
    const track = document.getElementById('scene_panel_track');
    if (!el || !track) return;

    let startX = 0;
    let startY = 0;
    let dx = 0;
    let active = false;
    let locked = null;

    el.addEventListener('pointerdown', (e) => {
        if (typeof e.button === 'number' && e.button !== 0) return;
        if (e.target.closest('input, textarea, select, button, .menu_button, .scene-cal-day, .scene-cal-btn, .scene-panel-dot')) return;
        startX = e.clientX;
        startY = e.clientY;
        dx = 0;
        locked = null;
        active = true;
        track.classList.add('is-dragging');
        try {
            el.setPointerCapture(e.pointerId);
        } catch (err) {
            /* pointer capture may be unavailable */
        }
    });

    el.addEventListener('pointermove', (e) => {
        if (!active) return;
        const mx = e.clientX - startX;
        const my = e.clientY - startY;
        if (locked === null) {
            if (Math.abs(mx) > 8 || Math.abs(my) > 8) {
                locked = Math.abs(mx) > Math.abs(my) ? 'x' : 'y';
            }
        }
        if (locked !== 'x') return;
        dx = mx;
        const base = panelPage === 1 ? -50 : 0;
        const shift = (dx / Math.max(1, el.clientWidth)) * 50;
        const pos = Math.max(-50, Math.min(0, base + shift));
        track.style.transform = 'translateX(' + pos + '%)';
        e.preventDefault();
    });

    const end = () => {
        if (!active) return;
        active = false;
        track.classList.remove('is-dragging');
        track.style.transform = '';
        if (locked === 'x') {
            if (dx < -40) setPanelPage(1);
            else if (dx > 40) setPanelPage(0);
            else setPanelPage(panelPage);
        }
        dx = 0;
        locked = null;
    };

    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
}

function snapshotKey(state) {
    return JSON.stringify({
        day: state.day,
        date: state.date,
        place: state.place,
        timeOfDay: state.timeOfDay,
        weather: state.weather,
        present: state.present,
        open: state.open,
        mood: state.mood,
        custom: state.custom,
        sessionDay: state.sessionDay,
        sessionHour: state.sessionHour,
        sessionMinute: state.sessionMinute,
    });
}

// Сохраняет снимок текущего состояния (не чаще, чем меняется состояние)
function recordSnapshot() {
    try {
        const state = getState();
        const key = snapshotKey(state);
        if (!Array.isArray(chat_metadata[HISTORY_KEY])) chat_metadata[HISTORY_KEY] = [];
        const hist = chat_metadata[HISTORY_KEY];
        const last = hist[hist.length - 1];
        if (last && last.key === key) return;
        hist.push({ ts: Date.now(), key, state: JSON.parse(JSON.stringify(state)) });
        while (hist.length > MAX_SNAPSHOTS) hist.shift();
    } catch (e) {
        console.warn('[scene-panel] snapshot failed', e);
    }
}

// Собирает scene-теги из последних N сообщений (от новых к старым)
function collectTagsFromRecent(limit) {
    const chat = getContext().chat ?? [];
    const found = [];
    const start = Math.max(0, chat.length - limit);
    for (let i = chat.length - 1; i >= start; i -= 1) {
        const mes = chat[i]?.mes;
        if (typeof mes !== 'string') continue;
        const m = mes.match(TAG_RE);
        if (!m) continue;
        const patch = parseTag(m[1]);
        if (patch && Object.keys(patch).length > 0) found.push({ index: i, patch });
    }
    return found;
}

// Восстановление состояния из снимка
function restoreStateFrom(obj) {
    const st = getState();
    for (const k of ['day', 'daysInMonth', 'monthLabel', 'date', 'place', 'timeOfDay', 'weather', 'mood']) {
        if (obj[k] !== undefined) st[k] = obj[k];
    }
    if (Array.isArray(obj.present)) st.present = obj.present.slice();
    if (Array.isArray(obj.open)) st.open = obj.open.slice();
    if (obj.custom && typeof obj.custom === 'object') st.custom = JSON.parse(JSON.stringify(obj.custom));
    if (Number.isFinite(Number(obj.sessionDay))) st.sessionDay = Math.max(1, Math.round(Number(obj.sessionDay)));
    if (Number.isFinite(Number(obj.sessionHour))) st.sessionHour = Math.min(23, Math.max(0, Math.round(Number(obj.sessionHour))));
    if (Number.isFinite(Number(obj.sessionMinute))) st.sessionMinute = Math.min(59, Math.max(0, Math.round(Number(obj.sessionMinute))));
    commit();
    syncPrompt();
    refresh();
    applyWeatherEffect();
}

// Диагностика: ищет последний тег в истории, иначе — последний снимок
function runDiagnostics() {
    const $out = $('#scene_panel_diag_result');
    const tags = collectTagsFromRecent(DIAG_SCAN);
    const hist = Array.isArray(chat_metadata[HISTORY_KEY]) ? chat_metadata[HISTORY_KEY] : [];
    const lines = [];
    lines.push(tf('diagTags', { n: DIAG_SCAN, count: tags.length }));
    lines.push(tf('diagSnaps', { count: hist.length }));

    if (tags.length > 0) {
        const latest = tags[0];
        const patch = { ...latest.patch };
        if (patch.custom) {
            Object.assign(getState().custom, patch.custom);
            delete patch.custom;
        }
        Object.assign(getState(), patch);
        commit();
        syncPrompt();
        refresh();
        applyWeatherEffect();
        lines.push(tf('diagFromTag', { n: latest.index + 1 }));
    } else if (hist.length > 0) {
        const snap = hist[hist.length - 1];
        restoreStateFrom(snap.state);
        lines.push(tf('diagFromSnap', { time: new Date(snap.ts).toLocaleTimeString() }));
    } else {
        lines.push(t('diagNothing'));
    }

    $out.text(lines.join(' '));
}

// Переводит свободный текст погоды в состояние Weather Background.
function mapWeatherToState(value) {
    if (typeof value !== 'string') return null;
    const raw = value.trim().toLowerCase();
    if (!raw) return null;
    if (WEATHER_STATES[raw]) return WEATHER_STATES[raw];
    for (const [key, state] of Object.entries(WEATHER_STATES)) {
        if (key.length > 2 && raw.includes(key)) return state;
    }
    return null;
}

// Применяет погоду сцены к фону Weather Background (если расширение установлено).
// force=true — принудительно очищает эффект (например, при сбросе сцены).
async function applyWeatherEffect(force = false) {
    const settings = getSettings();
    if (!isEnabled() || !settings.weatherIntegration) return;

    const state = force ? 'clear' : mapWeatherToState(getState().weather);
    if (!state) return;

    const wb = extension_settings?.['weather_background'];
    if (wb && wb.enabled === false) return;
    const mobileMode = Boolean(wb?.mobileMode);

    try {
        if (!weatherRendererPromise) {
            weatherRendererPromise = import('../sillytavern-weather-background/src/background-renderer.js');
        }
        const mod = await weatherRendererPromise;
        if (mod && typeof mod.setWeatherEffect === 'function') {
            mod.setWeatherEffect(state, { mobileMode });
        }
    } catch (e) {
        weatherRendererPromise = null;
        console.warn('[scene-panel] Weather Background недоступен, эффект пропущен', e);
    }
}

function applyFloatPos() {
    const $f = $('#scene_panel_float');
    if ($f.length === 0) return;
    const pos = getSettings().floatPos;
    if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
        $f.css({ left: pos.x + 'px', top: pos.y + 'px', right: 'auto', bottom: 'auto' });
    }
}

function enableDrag() {
    const el = document.getElementById('scene_panel_float');
    if (!el) return;
    const head = el.querySelector('.scene-panel-float-head');
    if (!head) return;
    let startX = 0;
    let startY = 0;
    let origX = 0;
    let origY = 0;
    let dragging = false;

    head.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.scene-panel-float-btn')) return;
        const rect = el.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        origX = rect.left;
        origY = rect.top;
        dragging = true;
        try {
            head.setPointerCapture(e.pointerId);
        } catch (err) {
            /* pointer capture may be unavailable */
        }
    });

    head.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const w = el.offsetWidth;
        const x = Math.max(0, Math.min(window.innerWidth - w - 4, origX + (e.clientX - startX)));
        const y = Math.max(0, Math.min(window.innerHeight - 44, origY + (e.clientY - startY)));
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        el.style.right = 'auto';
        el.style.bottom = 'auto';
        e.preventDefault();
    });

    const stop = (e) => {
        if (!dragging) return;
        dragging = false;
        const rect = el.getBoundingClientRect();
        getSettings().floatPos = { x: Math.round(rect.left), y: Math.round(rect.top) };
        try {
            saveSettings();
        } catch (err) {
            /* settings save is best-effort */
        }
        try {
            head.releasePointerCapture(e.pointerId);
        } catch (err) {
            /* already released */
        }
    };

    head.addEventListener('pointerup', stop);
    head.addEventListener('pointercancel', stop);
}

function mountModal(panelHtml) {
    const modal = [
        '<div id="scene_panel_modal" class="scene-panel-modal" aria-hidden="true">',
        '  <div class="scene-panel-modal-card" role="dialog" aria-label="Scene Panel">',
        '    <div class="scene-panel-modal-head">',
        '      <span class="scene-panel-modal-title">✦ SCENE PANEL ✦</span>',
        '      <span class="scene-panel-modal-page" id="scene_panel_page_btn" title="сцена / статистика">📊</span>',
        '      <span class="scene-panel-modal-day" id="scene_panel_day_label">день 1</span>',
        '      <span class="scene-panel-langs" id="scene_panel_langs">',
        '        <span class="scene-panel-lang" data-lang="ru" title="Русский">RU</span>',
        '        <span class="scene-panel-lang" data-lang="en" title="English">EN</span>',
        '        <span class="scene-panel-lang" data-lang="uk" title="Українська">UK</span>',
        '        <span class="scene-panel-lang" data-lang="sv" title="Svenska">SV</span>',
        '      </span>',
        '      <span class="scene-panel-modal-x" id="scene_panel_modal_close" title="закрыть">×</span>',
        '    </div>',
        '    <div class="scene-panel-modal-body" id="scene_panel_modal_body"></div>',
        '  </div>',
        '</div>',
    ].join('');
    $('body').append(modal);
    $('#scene_panel_modal_body').append(panelHtml);
}

function mountTopButton() {
    if ($('#scene_panel_topbtn').length > 0) return;
    const $holder = $('#top-settings-holder');
    const $btn = $('<div>')
        .attr('id', 'scene_panel_topbtn')
        .addClass('scene-panel-topbtn')
        .attr('title', 'Scene Panel — календарь и сцена')
        .text('☾');
    if ($holder.length > 0) {
        const $drawer = $('<div>').addClass('drawer scene-panel-drawer');
        const $toggle = $('<div>').addClass('drawer-toggle');
        $toggle.append($btn);
        $drawer.append($toggle);
        $holder.append($drawer);
    } else {
        $('body').append($btn.addClass('is-floating'));
    }
    $btn.on('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openModal();
    });
}

function openModal() {
    const $modal = $('#scene_panel_modal');
    if ($modal.length === 0) return;
    $modal.addClass('is-open').attr('aria-hidden', 'false');
    setPanelPage(0);
    refresh();
}

function closeModal() {
    const $modal = $('#scene_panel_modal');
    if ($modal.length === 0) return;
    $modal.removeClass('is-open').attr('aria-hidden', 'true');
    setPanelPage(0);
}

function bindEvents() {
    $('#scene_panel_open_modal').on('click', () => openModal());
    $('#scene_panel_topbtn').on('click', () => openModal());
    $('#scene_panel_modal_close').on('click', () => closeModal());
    $('#scene_panel_modal').on('click', (e) => {
        if (e.target && e.target.id === 'scene_panel_modal') closeModal();
    });
    $(document).on('keydown.scenePanel', (e) => {
        if (e.key === 'Escape') closeModal();
    });
    // Alt+Shift+S — открыть панель сцены
    $(document).on('keydown.scenePanelHotkey', (e) => {
        const isS = e.key === 's' || e.key === 'S' || e.code === 'KeyS';
        if (e.altKey && e.shiftKey && isS) {
            e.preventDefault();
            openModal();
        }
    });
    $('#scene_panel_enabled').on('change', (e) => {
        getSettings().enabled = !!e.target.checked;
        try {
            saveSettings();
        } catch (err) {
            /* ignore */
        }
        if (!isEnabled()) {
            $('#scene_panel_float').hide();
            $('#scene_panel_modal').removeClass('is-open');
            setExtensionPrompt(PROMPT_KEY, '', extension_prompt_types.NONE, 0, false, extension_prompt_roles.SYSTEM);
        } else {
            renderFloating();
            syncPrompt();
        }
        refresh();
    });

    const $panel = $('#scene_panel_settings');
    $panel.on('input change', '[data-scene-field]', () => readForm());
    $panel.on('input change', '#scene_panel_custom', () => readForm());
    $panel.on('click', '#scene_panel_day_plus', () => shiftDay(1));
    $panel.on('click', '#scene_panel_day_minus', () => shiftDay(-1));
    $panel.on('input', '#scene_panel_month_label', (e) => {
        getState().monthLabel = String(e.target.value || '');
        commit();
        syncPrompt();
        renderCalendar('scene_panel_cal');
        renderCalendar('scene_panel_float_cal');
    });
    $panel.on('change', '#scene_panel_month_len', (e) => {
        const n = Math.max(MIN_MONTH, Math.min(MAX_MONTH, parseInt(String(e.target.value), 10) || 30));
        getState().daysInMonth = n;
        commit();
        syncPrompt();
        refresh();
    });
    $panel.on('click', '.scene-cal-day', (e) => {
        const dom = parseInt(String($(e.currentTarget).attr('data-cal-day')), 10);
        if (Number.isFinite(dom)) setDayOfMonth(dom);
    });
    $panel.on('click', '.scene-cal-prev', () => shiftMonth(-1));
    $panel.on('click', '.scene-cal-next', () => shiftMonth(1));
    $panel.on('click', '#scene_panel_reset', () => {
        recordSnapshot(); // сохраняем состояние ДО сброса, чтобы можно было восстановить
        chat_metadata[MODULE] = emptyState();
        commit();
        syncPrompt();
        refresh();
        applyWeatherEffect(true);
    });
    $panel.on('click', '#scene_panel_diag', () => runDiagnostics());
    $panel.on('change', '#scene_panel_inject', (e) => {
        getSettings().inject = !!e.target.checked;
        syncPrompt();
        try {
            saveSettings();
        } catch (err) {
            /* ignore */
        }
    });
    $panel.on('change', '#scene_panel_role', (e) => {
        getSettings().role = String(e.target.value || 'system');
        syncPrompt();
        try {
            saveSettings();
        } catch (err) {
            /* ignore */
        }
    });
    $panel.on('change', '#scene_panel_floating', (e) => {
        getSettings().floating = !!e.target.checked;
        try {
            saveSettings();
        } catch (err) {
            /* ignore */
        }
        renderFloating();
    });
    $panel.on('change', '#scene_panel_weather_integration', (e) => {
        getSettings().weatherIntegration = !!e.target.checked;
        try {
            saveSettings();
        } catch (err) {
            /* ignore */
        }
        applyWeatherEffect();
        refresh();
    });

    $panel.on('change', '#scene_panel_theme', (e) => {
        getSettings().theme = String(e.target.value || 'auto');
        try {
            saveSettings();
        } catch (err) {
            /* ignore */
        }
        applyTheme();
    });

    $('#scene_panel_modal').on('click', '#scene_panel_stats_refresh', () => renderStats());
    $('#scene_panel_modal').on('click', '#scene_panel_stats_reset', () => {
        chat_metadata[STATS_KEY] = null;
        renderStats();
        commit();
    });

    // Переключение страниц: точки-индикаторы и кнопка в шапке
    $('#scene_panel_pager').on('click', '.scene-panel-dot', function () {
        setPanelPage(Number($(this).attr('data-slide')) || 0);
    });
    $('#scene_panel_page_btn').on('click', () => setPanelPage(panelPage === 0 ? 1 : 0));

    // Переключатель языков панели
    $('#scene_panel_langs').on('click', '.scene-panel-lang', function () {
        const lang = String($(this).attr('data-lang') || 'ru');
        if (!LANGS.includes(lang)) return;
        getSettings().lang = lang;
        try {
            saveSettings();
        } catch (err) {
            /* ignore */
        }
        applyLanguage();
        refresh();
    });

    // Кнопки счётчика времени сессии
    $panel.on('click', '#scene_panel_session_minus_hour', () => shiftSessionHour(-1));
    $panel.on('click', '#scene_panel_session_plus_hour', () => shiftSessionHour(1));
    $panel.on('click', '#scene_panel_session_minus_day', () => shiftSessionDay(-1));
    $panel.on('click', '#scene_panel_session_plus_day', () => shiftSessionDay(1));

    const $float = $('#scene_panel_float');
    $float.on('click', '#scene_panel_float_day_plus', () => shiftDay(1));
    $float.on('click', '#scene_panel_float_day_minus', () => shiftDay(-1));
    $float.on('click', '.scene-cal-day', (e) => {
        const dom = parseInt(String($(e.currentTarget).attr('data-cal-day')), 10);
        if (Number.isFinite(dom)) setDayOfMonth(dom);
    });
    $float.on('click', '.scene-cal-prev', () => shiftMonth(-1));
    $float.on('click', '.scene-cal-next', () => shiftMonth(1));
    $float.on('click', '#scene_panel_float_collapse', () => {
        $float.toggleClass('is-collapsed');
    });
    $float.on('click', '#scene_panel_float_hide', () => {
        getSettings().floating = false;
        try {
            saveSettings();
        } catch (err) {
            /* ignore */
        }
        renderFloating();
        refresh();
    });
}

jQuery(async () => {
    try {
        const compactHtml = await renderExtensionTemplateAsync(EXT_NAME, 'settings');
        $('#extensions_settings2').append(compactHtml);

        // Панель берём из встроенной разметки — не зависит от кэша panel.html
        const panelHtml = PANEL_HTML;
        mountModal(panelHtml);
        mountTopButton();

        const floatHtml = await renderExtensionTemplateAsync(EXT_NAME, 'floating');
        $('body').append(floatHtml);
        // Маленькая версия в углу плавающей карточки
        const $floatEl = $('#scene_panel_float');
        if ($floatEl.length && !$floatEl.find('.scene-panel-float-version').length) {
            $floatEl.find('.scene-panel-float-body').append('<div class="scene-panel-float-version">v' + PANEL_VERSION + '</div>');
        }

        try {
            const mod = await import('../../../../script.js');
            if (typeof mod.saveSettingsDebounced === 'function') {
                saveSettings = mod.saveSettingsDebounced;
            }
        } catch (e) {
            console.warn('[scene-panel] settings save unavailable', e);
        }

        getSettings();
        getState();
        bindEvents();
        enableDrag();
        initPanelSlider();
        applyLanguage();
        refresh();
        syncPrompt();
        applyWeatherEffect();

        eventSource.on(event_types.MESSAGE_RECEIVED, handleMessage);
        eventSource.on(event_types.CHAT_CHANGED, () => {
            getState();
            refresh();
            syncPrompt();
            setTimeout(() => applyWeatherEffect(), 250);
        });
        eventSource.on(event_types.GENERATION_STARTED, () => syncPrompt());
        eventSource.on(event_types.MESSAGE_SENT, () => refresh());

        window.addEventListener('focus', () => refresh());
        window.addEventListener('resize', () => {
            const pos = getSettings().floatPos;
            if (pos) {
                getSettings().floatPos = {
                    x: Math.max(0, Math.min(window.innerWidth - 80, pos.x)),
                    y: Math.max(0, Math.min(window.innerHeight - 44, pos.y)),
                };
                applyFloatPos();
            }
        });
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) refresh();
        });

        console.log('[scene-panel] ready');
    } catch (e) {
        console.error('[scene-panel] init failed', e);
    }
});
